// check_waypoints.mjs — 텔레포트 웨이포인트 기하 검증 (2026.07.13)
//  실행: node src/check_waypoints.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import(waypoints.js = 앱이 실제로 쓰는 그 표) — check_lamps.mjs와 동일.
//
//  ★무엇을 잡는가: 웨이포인트가 '벽 속 / 허공 / 다른 구간'에 있는 것.
//    좌표는 constants 파생이라 산술 오류는 안 나지만, 메시 구성 규약을 잘못 읽으면
//    (박스 중심을 윗면으로 착각 · ring 평면 오프셋 누락 · 반원판의 재질 반쪽 방향 등)
//    조용히 바닥 아래나 벽 안에 선다. 그 '규약 오독'을 잡는 것이 이 스크립트의 일이다.
//  ★못 잡는 것: 그 (x,z)에 진짜 walkable 메시가 깔려 있는가(씬이 필요).
//    → 런타임 스냅(FirstPersonControls) + 로컬 워크스루가 담당.
import {
  HALL_ENTRY, ORB_CX, ORB_FLOOR_R, ORB_FLOOR_Y,
  H, R_BASE, SHELL_RIB_R, STAIR_R, RIB_Y,
  rOf, U_SPIRAL_END, U_KNEE_END, U_LOOKOUT_END,
  X_LAND_LO, X_LAND_HI, LK_PLAT_R, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_LIFT,
  CL_R, CL_HW, CL_PHI0, CL_PHI1, ST_PHI, PASS_FLOOR_Y, PASS_X_END, RM_X0, RM_X1,
  TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
  COR_Y0, COR_THICK, PLAT_X, PLAT_R, PLAT_Y, BOX_HW, RAD_FLOOR_Y,
  ROOM_DISC_HOLE, ROOM_LAND_R, ROOM_DISC_SLOT_LEN,
  RAD_ANG0, RAD_R, RAD_JX,
  P_FLOOR_TOP, P_FLOOR_R, P_ST_X, petalR,
  DESC_HW, DESC_R, DESC_SWEEP, DESC_SWEEP_MIN, DESC_SWEEP_MAX, BOX_X1, COR_CX, COR_R, ceilY,   // ★㊾ 하강로
  DESC_GIRDER, DESC_GIRDER_TOP, DESC_GIRDER_BWF, DESC_TAIL,   // ★㊿ 몸 · ★51 꼬리
  DESC_PORT_ON, DESC_PORT_H, DESC_PORT_TOP, DESC_PORT_CLR, PIER_DEPTH, PIER_HW, PIER_OUT,   // ★53 관문
  WOLDAE_ON, WOLDAE_OUT, WOLDAE_HW, WOLDAE_TIP_T, WOLDAE_ROOT_D, WOLDAE_RIM, WOLDAE_EMBED, COR_RISE,   // ★54 월대
  WOLDAE_NOTCH, WOLDAE_NOTCH_R,   // ★54-2 노치
  WOLDAE_RISE, WOLDAE_RISE_H, BOX_TOP,   // ★54-3 상승단
} from './constants.js'
import { p1HeightAt } from './radialEventsGeometry.js'
const r2 = (v) => Math.round(v * 100) / 100   // ★㊾ (check_corridor와 같은 보조자)
import { descentSpec, woldaeSpec, gatSeal, incaStairSpec, incaBladesSpec, descentPortSpec, portPrismTris, drumPierAzimuths, outwardTris, signedVolume, windingConsistent } from './corridorStairsGeometry.js'   // ★㊾·53·54
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { WAYPOINTS, WP_GROUPS, SPAWN_ID, EYE, wpById } from './waypoints.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const W = (id) => wpById(id)
const DEG = 180 / Math.PI

// 리브 중심선(φ=0 평면의 곡선 x=rOf(u), y=H·u)까지의 최단거리 — check_lamps.mjs와 동일 수법
function distToCenterline(px, py) {
  let best = 1e9
  for (let i = 0; i <= 8000; i++) {
    const u = (i / 8000) * 0.6
    const d = Math.hypot(rOf(u) - px, H * u - py)
    if (d < best) best = d
  }
  return best
}
const fwd  = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)]   // FirstPersonControls 전진 벡터 규약
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1]

console.log('— A. 표 무결성 —')
ok(WAYPOINTS.length >= 15, `웨이포인트 ${WAYPOINTS.length}개`)
ok(new Set(WAYPOINTS.map(w => w.id)).size === WAYPOINTS.length, 'id 중복 없음')
ok(!!W(SPAWN_ID), `SPAWN_ID('${SPAWN_ID}')가 표 안에 있음`)
ok(WAYPOINTS.every(w => [w.x, w.y, w.z, w.yaw, w.pitch].every(Number.isFinite)), '전 좌표·시선 유한(NaN 없음)')
ok(WAYPOINTS.every(w => Math.abs(w.pitch) <= 1.3),
  `pitch 전부 |1.3| 이내(드래그 클램프와 동일) — 최대 ${Math.max(...WAYPOINTS.map(w => Math.abs(w.pitch))).toFixed(2)}`)
ok(EYE === 1.6, `EYE=${EYE} — FirstPersonControls가 이 값을 import(중복 정의 없음)`)

// §5 정리 배치표 대조 — 1부 15개 정리가 전부 어느 웨이포인트엔가 걸려 있어야 한다
const covered = new Set()
for (const w of WAYPOINTS) {
  const range = w.prop.match(/1p(\d+)~(\d+)/)
  if (range) { for (let i = +range[1]; i <= +range[2]; i++) covered.add(i); continue }
  for (const m of w.prop.matchAll(/1p(\d+)/g)) covered.add(+m[1])
}
const missing = []
for (let i = 1; i <= 15; i++) if (!covered.has(i)) missing.push(i)
ok(missing.length === 0, `1p1~15 전부 웨이포인트 있음${missing.length ? ` — 누락 ${missing.join(',')}` : ''}`)

console.log('\n— B. 지상·방사 —')
{
  const hub = W('hub'), r = Math.hypot(hub.x, hub.z), phi = Math.atan2(hub.z, hub.x)
  ok(r > ROOM_DISC_HOLE + 1 && r < ROOM_LAND_R - 1,
    `허브 r=${r.toFixed(1)} ∈ 고리 ${ROOM_DISC_HOLE}~${ROOM_LAND_R}(여유 1)`)
  const slotHalf = (2 * Math.PI - ROOM_DISC_SLOT_LEN) / 2      // 디스크 슬롯 = +x 중심(Shape θ = −월드 φ)
  ok(Math.abs(phi) > slotHalf + 0.1,
    `허브 φ=${(phi * DEG).toFixed(0)}° ∉ 슬롯(±${(slotHalf * DEG).toFixed(1)}°) — 발밑 구멍 아님`)
  ok(Math.abs(hub.y - (COR_Y0 + COR_THICK / 2 + 0.02)) < 1e-9, `허브 y=${hub.y.toFixed(2)} = 디스크 윗면`)
}
for (const [id, k] of [['p1', 0], ['p2', 1], ['p3', 2], ['p4', 3]]) {
  const w = W(id), ang = RAD_ANG0 + k * Math.PI / 2
  const lx = w.x * Math.cos(ang) + w.z * Math.sin(ang) - RAD_R    // 월드 → 방 로컬(+x = 방사 바깥)
  const lz = -w.x * Math.sin(ang) + w.z * Math.cos(ang)
  ok(Math.hypot(lx, lz) < P_FLOOR_R - 1,
    `${id} 로컬(${lx.toFixed(1)}, ${lz.toFixed(1)}) — 바닥 반경 ${P_FLOOR_R.toFixed(2)} 안(여유 1)`)
  ok(lx < 0, `${id} 발판이 허브 문 쪽(−x) — 비석(x=${P_ST_X})을 마주보고 선다`)
  ok(w.y >= P_FLOOR_TOP - 1e-9, `${id} y=${w.y.toFixed(2)} ≥ 평바닥 ${P_FLOOR_TOP.toFixed(2)}`)
  ok(dot2(fwd(w.yaw), [Math.cos(ang), Math.sin(ang)]) > 0.99, `${id} 시선 = 로컬 +x(비석 벽) 정면`)
  ok(Math.hypot(lx, lz) < petalR(w.y + EYE) - 0.3,
    `${id} 눈높이 ${(w.y + EYE).toFixed(1)}에서 셸 내면 반경 ${petalR(w.y + EYE).toFixed(2)} 안`)
}
// ★1p1 볼록 바닥 보정: 융기(㉞ 미분리)는 '비석 벽 쪽'(로컬 x≈+9, 최대 1.5)에 있고 스폰(x=−7.5)엔 0이다.
//  즉 현재 노브에선 보정이 no-op. 그래도 식을 유지하는 이유 = P_SPAWN_LX를 비석 쪽으로 옮기면 즉시 발동해야 하므로.
//  (걸어서 융기에 오를 땐 프레임 probe가 경사를 정상 추종 — 기울기 ≈0.48 < STEP_UP.)
ok(Math.abs(W('p1').y - (P_FLOOR_TOP + p1HeightAt(-7.5, 0))) < 1e-9,
  `p1 y = 평바닥 + 스폰 지점 융기(${p1HeightAt(-7.5, 0).toFixed(2)}) — 보정식이 살아 있음`)
ok(p1HeightAt(P_ST_X - 2, 0) > 0.5,
  `융기는 비석 벽 쪽(x≈${(P_ST_X - 2).toFixed(1)}에서 ${p1HeightAt(P_ST_X - 2, 0).toFixed(2)}) — 스폰을 그쪽으로 옮기면 보정이 자동 발동`)
ok(Math.abs(W('p2').y - W('p3').y) < 1e-9 && Math.abs(W('p3').y - W('p4').y) < 1e-9,
  'p2·p3·p4는 평바닥(등형 — 바닥 사건 없음)')

console.log('\n— C. 통로(1p5) —')
{
  const j = W('joint'), c = W('corridor')
  ok(Math.abs(j.x - RAD_JX) < 1e-9 && Math.abs(j.z) <= BOX_HW, `접합 패드 x=${j.x.toFixed(1)} · |z|=0 ≤ 박스 반폭 ${BOX_HW}`)
  ok(Math.abs(j.y - (RAD_FLOOR_Y + COR_THICK / 2)) < 1e-9, `접합 패드 y=${j.y.toFixed(2)} = 패드 윗면`)
  // ★㊵-5 스위치 분기: 'corridor' wp의 표적이 진입 체제를 따라간다
  if (HALL_ENTRY === 'asc-sphere') {
    ok(Math.hypot(c.x - ORB_CX, c.z) < ORB_FLOOR_R - 1, `소구 중심에서 ${Math.hypot(c.x - ORB_CX, c.z).toFixed(1)} < 바닥 원반 ${ORB_FLOOR_R.toFixed(1)}`)
    ok(Math.abs(c.y - ORB_FLOOR_Y) < 1e-9, `소구 바닥 y=${c.y.toFixed(2)} = 문턱=착지 등고(㊵-5)`)
  } else if (HALL_ENTRY === 'descent') {
    ok(Math.hypot(c.x - PLAT_X, c.z) < PLAT_R - 1, `플랫폼 중심에서 ${Math.hypot(c.x - PLAT_X, c.z).toFixed(1)} < 반경 ${PLAT_R}`)
    ok(Math.abs(c.y - (PLAT_Y + COR_THICK / 2)) < 1e-9, `플랫폼 y=${c.y.toFixed(2)} = 낮은 플랫폼 판 윗면(★㊴ PLAT_DROP)`)
  } else {
    // ★㊾ 새 하강로: 'corridor' = 경로 72% 지점(도착 직전). 시선은 +x 고정이 아니라 **진행 방향**이다
    //  (측면 체제는 대각으로 들어오므로 +x 고정 검사가 성립하지 않는다 — 구 검사를 체제별로 분기).
    const d = descentSpec(HALL_ENTRY)
    let near = 1e9
    for (const q of d.samples) near = Math.min(near, Math.hypot(q.x - c.x, q.z - c.z, q.y - c.y))
    ok(near < 0.6, `하강로 위 지점(경로 최근접 ${r2(near)} < 0.6) — 허공 스폰 아님`)
    ok(c.y > d.yE && c.y < d.yS, `y=${r2(c.y)} ∈ (도착 ${r2(d.yE)}, 출발 ${r2(d.yS)}) — 하강 도중`)
  }
  if (HALL_ENTRY === 'asc-sphere' || HALL_ENTRY === 'descent') {
    ok(dot2(fwd(c.yaw), [1, 0]) > 0.99, '시선 = +x(리브 문 쪽)')
  } else {
    //  진행 방향 응시(하강로는 굽으므로 표적이 아니라 접선)
    const d = descentSpec(HALL_ENTRY)
    let best = d.samples[0], bd = 1e9
    for (const q of d.samples) { const e = Math.hypot(q.x - c.x, q.z - c.z); if (e < bd) { bd = e; best = q } }
    ok(dot2(fwd(c.yaw), [best.tx, best.tz]) > 0.97, `시선 = 진행 방향(접선 내적 ${r2(dot2(fwd(c.yaw), [best.tx, best.tz]))} > 0.97)`)
  }
}

// ── ★㊾ 하강로 전용 절: 두 체제 공통 불변식 + 측면 체제의 구도점 ──
if (HALL_ENTRY === 'axial' || HALL_ENTRY === 'lateral') {
  console.log('\n— C2. ★㊾ 하강로 (소구 폐기 · 두 체제) —')
  const d = descentSpec(HALL_ENTRY)
  const st = incaStairSpec()
  ok(Math.abs(d.yS - (COR_Y0 + COR_THICK / 2)) < 1e-9 && Math.abs(d.S[0] - BOX_X1) < 1e-9,
    `출발 = 박스 출구 (x${d.S[0]}, y${r2(d.yS)}) — 다리 상면과 등고`)
  ok(Math.abs(d.yE - st.panel.yTop) < 1e-9 && Math.abs(d.E[0] - st.panel.x0) < 1e-9,
    `도착 = 잉카 판 서단 (x${r2(d.E[0])}, y${r2(d.yE)}) — 판이 경첩`)
  ok(d.slopeDeg <= 38.5, `경사 ${r2(d.slopeDeg)}° ≤ 38.5 (축 체제 37.4°가 상한 근처 — 측면은 여유)`)
  //  ★보행 천장: 단높이가 STEP_UP(0.8)을 넘으면 되돌아 올라올 수 없다. 디딤 역산이 이걸 지킨다.
  ok(d.rise <= 0.8 - 0.2, `단높이 ${r2(d.rise)} ≤ STEP_UP(0.8)−0.2 — 되돌아 오를 수 있다`)
  //  ⚠판만 이어 재면 안 된다 — 참 둘레의 판은 건너뛰므로(참 판이 덮음) 실제로 없는 단차를 잰다.
  //   회전량 40°에서 0.81(허위 실패)로 드러났다(㊾). 판 + 참을 s로 정렬한 **실제 보행 순서**로 잰다.
  const walk = [...d.plates, ...d.landings].sort((a, b) => a.s - b.s)
  let maxJump = 0
  for (let i = 1; i < walk.length; i++) maxJump = Math.max(maxJump, Math.abs(walk[i].yTop - walk[i - 1].yTop))
  ok(maxJump <= 0.8, `보행 순서 최대 단차 ${r2(maxJump)} ≤ STEP_UP(판+참 정렬)`)
  //  전 구간이 드럼 안이고 벽에 안 닿는가
  //  ⚠중심선 반경 + 반폭은 과대계산이다 — 반폭은 **진행 방향의 법선** 쪽이라, 호에서만 반경 방향과
  //   일치하고 직선 구간(진출·대각)에서는 아니다. 실제 판 모서리 두 점으로 재야 한다(㊾ 최초 검사 오류).
  let farMost = 0, lowMost = 1e9
  for (const q of d.samples) {
    for (const sgn of [-1, 1]) {
      const ex = q.x + sgn * DESC_HW * (-q.tz), ez = q.z + sgn * DESC_HW * q.tx
      farMost = Math.max(farMost, Math.hypot(ex - COR_CX, ez))
    }
    lowMost = Math.min(lowMost, q.y)
  }
  ok(farMost < COR_R - 1, `판 모서리 최원단 ${r2(farMost)} < 드럼 ${COR_R}−1 — 벽 무접촉`)
  ok(lowMost > 0, `최저 y ${r2(lowMost)} > 0 — 드럼 바닥에 안 닿는다(바닥 = 걷지 않는 지형)`)
  //  머리 위(갓 절단면)
  let headMin = 1e9
  for (const q of d.samples) headMin = Math.min(headMin, ceilY(q.x) - q.y - 1.8)
  ok(headMin > 6, `머리 위 최소 ${r2(headMin)} > 6 — 천장 여유`)
  //  ★다섯 날과의 간섭(회전량 상한의 근거)
  const bs = incaBladesSpec()
  let bladeClr = 1e9
  for (const b of bs.blades.filter(b => !b.reach)) {
    const rx = b.tip.x - bs.ncx, rz = b.tip.z
    for (const q of d.samples) for (let j = 0; j <= 20; j++) {
      const u = j / 20
      bladeClr = Math.min(bladeClr, Math.hypot(q.x - (bs.ncx + rx * u), q.z - rz * u))
    }
  }
  ok(bladeClr > 5, `다섯 날 최소 수평거리 ${r2(bladeClr)} > 5 — 하강로가 부채를 파고들지 않는다`)
  // ── ★㊿ 몸 규칙(§2-D 문법의 검증 대응물) ──
  ok(DESC_GIRDER_TOP > 0 && DESC_GIRDER_TOP < 0.43,
    `보 상면 오프셋 ${DESC_GIRDER_TOP} ∈ (0, 판두께 0.43) — 판이 보에 융착(틈 없음·완전 매몰도 없음)`)
  ok(DESC_GIRDER >= 4 * 0.43, `보 깊이 ${DESC_GIRDER} ≥ 판의 4배 — '몸'으로 읽히는 하한(§2-D ②)`)
  ok(DESC_GIRDER_BWF >= 0.4 && DESC_GIRDER_BWF < 1, `하면 폭 비 ${DESC_GIRDER_BWF} ∈ [0.4, 1) — 각재도 용골도 아님`)
  ok(lowMost - DESC_GIRDER > 0, `보 밑면 최저 ${r2(lowMost - DESC_GIRDER)} > 0 — 바닥 무접촉 유지(몸을 입혀도)`)
  //  ★회전량 노브 가드(현도가 로컬에서 돌리는 값 — 범위를 벗어나면 여기서 잡는다)
  ok(DESC_SWEEP >= DESC_SWEEP_MIN && DESC_SWEEP <= DESC_SWEEP_MAX,
    `회전량 ${DESC_SWEEP}° ∈ [${DESC_SWEEP_MIN}, ${DESC_SWEEP_MAX}] — 상한 초과 시 대각선이 날 밑을 파고든다`)
  //  ⚠상한은 [판 모서리 최원단] 검사가 진짜 정본. 여기는 노브 범위 가드이므로 그것과 어긋나면 안 된다
  //   (구 'COR_R−4'는 문서 범위 56~78과 불일치해 R=78이 허위 실패했다 — ㊾).
  ok(DESC_R + DESC_HW <= COR_R - 2 && DESC_R > 50,
    `반경 ${DESC_R} + 반폭 ${DESC_HW} ≤ ${COR_R}−2 · > 50 — 문서 범위 56~78과 정합`)
  if (d.scheme === 'lateral') {
    //  ★51 참 폐지(현도: "블록 투박·기하와 안 맞물림") — 매듭을 다듬는 대신 꺾임을 없앴다.
    //   매듭 없음이 정당하려면 **꺾임 자체가 없어야 한다** → 접선 연속을 표본 단위로 강제.
    ok(d.landings.length === 0, `참 0 — 블록 대신 접선 연속(진입·꼬리 쌍원호)`)
    let maxTurn = 0, turns10 = 0
    for (let i = 1; i < d.samples.length; i++) {
      const a = d.samples[i - 1], b = d.samples[i]
      const ang = Math.acos(Math.max(-1, Math.min(1, a.tx * b.tx + a.tz * b.tz))) * 180 / Math.PI
      maxTurn = Math.max(maxTurn, ang); if (ang > 10) turns10++
    }
    if (DESC_TAIL === 'chord') {
      ok(turns10 <= 1, `10° 초과 꺾임 ${turns10}곳 ≤ 1 — chord 꼬리의 단일 코너만 허용(비교 보존계)`)
    } else {
      ok(maxTurn < 8, `표본 간 최대 방향 변화 ${r2(maxTurn)}° < 8 — 전 구간 접선 연속(꺾임 0)`)
      const le = d.samples[d.samples.length - 1]
      ok(le.tx > 0.99 && Math.abs(le.tz) < 0.12, `도착 접선 (${r2(le.tx)}, ${r2(le.tz)}) ≈ +x — 판 축 정렬 진입`)
    }
    const v = W('view')
    let bd = 1e9
    for (const q of d.samples) bd = Math.min(bd, Math.hypot(q.x - v.x, q.z - v.z, q.y - v.y))
    ok(bd < 0.6, `구도점이 하강로 위(최근접 ${r2(bd)} < 0.6)`)
    const dx = bs.ncx - v.x, dz = -v.z, L = Math.hypot(dx, dz)
    ok(dot2(fwd(v.yaw), [dx / L, dz / L]) > 0.99, `구도점 시선 = 넥서스 정조준`)
    ok(L > 40 && L < 110, `구도점→넥서스 수평 ${r2(L)} ∈ (40, 110) — 부채가 한 화면에 들어오는 거리`)
  } else {
    ok(d.landings.length === 0, `축 체제 = 참 없는 곧은 한 줄(성격의 대비)`)
  }

  // ── ★54 월대(月臺) — 박스 목의 전경 단(현도 제안·명명 2026.07.24) ──
  console.log('\n— C4. ★54 월대 —')
  if (!WOLDAE_ON) {
    ok(true, '월대 꺼짐(WOLDAE_ON=false) — 검사 생략')
  } else {
    const w = woldaeSpec()
    //  ① 레벨: 박스 바닥·하강로 출발면과 등고(무단차 한 레벨 — 문지방이지 계단이 아니다)
    ok(Math.abs(w.yTop - (COR_Y0 + COR_THICK / 2)) < 1e-9 && Math.abs(w.yTop - d.yS) < 1e-9,
      `상면 y${r2(w.yTop)} = 박스 바닥 = 하강로 출발면 — 무단차`)
    //  ② 뿌리(§2-D ① 코벨): 벽 안쪽으로 물려 절단면이 안 보이고, 뿌리 반폭 = 박스 입
    ok(w.x0 < COR_CX - COR_R, `뿌리 x${r2(w.x0)} < 드럼 내벽 ${r2(COR_CX - COR_R)} — 벽에 파고든다(절단면 은닉)`)
    ok(Math.abs(w.hwRoot - BOX_HW) < 1e-9,
      `뿌리 반폭 ±${w.hwRoot} = 박스 반폭 ±${BOX_HW} — 뿌리 전체가 박스 몸통 안(드럼 밖 노출 0)`)
    //  ★사다리꼴의 존재 이유: 반폭 균일이면 뿌리 모서리가 벽 밖으로 나간다(벽 = 두께 0 셸)
    let worstOut = -1e9
    for (const s of w.stations) if (s.hw > BOX_HW) {
      const wallX = COR_CX - Math.sqrt(Math.max(0, COR_R * COR_R - s.hw * s.hw))
      worstOut = Math.max(worstOut, wallX - s.x)
    }
    ok(worstOut <= 0, `박스가 안 덮는 구간의 벽 관통 ${r2(worstOut)} ≤ 0 — 드럼 밖 노출 없음`)
    //  ③ 밑면 = 위로 볼록(잉카 S2 어휘 — 현-위 검사). 순수 sin의 자가 교차를 두께 프로파일이 막는다
    const A = w.stations[0], B = w.stations[w.stations.length - 1]
    let chordMin = 1e9
    for (const s of w.stations.slice(1, -1)) {
      const ch = A.y + (B.y - A.y) * (s.x - A.x) / (B.x - A.x)
      chordMin = Math.min(chordMin, s.y - ch)
    }
    ok(chordMin > 0, `밑면 위로 볼록 — 전 다면점이 현 위(최소 여유 ${r2(chordMin)} > 0)`)
    let monot = true, tMin = 1e9
    for (let i = 1; i < w.stations.length; i++) if (w.stations[i].t > w.stations[i - 1].t + 1e-9) monot = false
    for (const s of w.stations) tMin = Math.min(tMin, s.t)
    ok(monot, `두께 단조 감소(뿌리 ${r2(w.rootD)} → 팁 ${r2(w.tipT)}) — 캔틸레버는 뿌리에서 깊다`)
    ok(Math.abs(tMin - w.tipT) < 1e-9, `최소 두께 ${r2(tMin)} = 팁 두께 — 두께 프로파일 항등(㊷ 전례)`)
    //  ④ 두께 위계(§2-D ③): 걷는 것 < 받치는 것 < 매듭
    ok(COR_RISE < w.tipT && w.tipT < w.rootD,
      `위계 판 ${COR_RISE} < 팁 ${w.tipT} < 뿌리 ${w.rootD} — 걷는 것 < 받치는 것`)
    //  ⑤ 위상 '길 위'(현도 ⓒ): 하강로 출발점이 발자국 안 = 반드시 밟고 지나간다
    ok(w.inside(d.S[0], 0), `하강로 출발 (x${d.S[0]}, z0)이 월대 발자국 안 — 길 위(비켜 가는 만이 아님)`)
    ok(d.sFlat > 1, `평탄 구간 ${r2(d.sFlat)} > 1 — 월대 위에서 실제로 평평하게 걷는다`)
    //  ★평탄은 오직 s=0 구간에만(C2 '참 0'과의 정합 — 경로 중간엔 평탄이 없다)
    let midFlat = 0
    for (let i = 1; i < d.plates.length; i++)
      if (d.plates[i].s > d.sFlat + 2 && Math.abs(d.plates[i].yTop - d.plates[i - 1].yTop) < 1e-6) midFlat++
    ok(midFlat === 0, `경로 중간 평탄 판 ${midFlat}장 = 0 — 평탄은 출발 문지방(월대)에만`)
    //  ⑥ 이탈점이 발자국 경계 위(빌더가 실제로 경계를 찾았는가)
    const ex = d.samples.find(q => q.s >= d.sFlat) || d.samples[d.samples.length - 1]
    ok(Math.abs(Math.abs(ex.z) - w.hwAt(ex.x)) < 0.6 || Math.abs(ex.x - w.x1) < 0.6,
      `이탈점 (x${r2(ex.x)}, z${r2(ex.z)})이 발자국 경계 위 — 북변 ±${r2(w.hwAt(ex.x))}`)
    //  ⑦ 판 생략: 월대 위 판은 안 그린다(코플레이너 회피) + 그 바깥은 전부 그린다
    ok(d.plates.filter(p => p.onWoldae).length > 0 && d.plates.every(p => p.onWoldae === w.inside(p.x, p.z)),
      `월대 위 판 ${d.plates.filter(p => p.onWoldae).length}장 생략 — 발자국 판정과 일치`)
    //  ⑧ 립(매듭) — 조망을 안 가린다: 눈높이의 절반 아래
    ok(w.rim > 0 && w.rim < EYE / 2, `립 ${w.rim} ∈ (0, 눈높이 ${EYE}/2) — 매듭이되 조망 무차단`)
    ok(w.x1 - w.rim * 2 > d.S[0], `립이 동단에만(x${r2(w.x1 - w.rim * 2)}~${r2(w.x1)}) — 북쪽 어깨는 열림(하강로 출발)`)
    //  ⑨ 드럼 안 · 무간섭
    //  ⚠뿌리 정거장은 제외한다 — 뿌리는 **의도적으로** 벽을 지나 박스 안에 묻히는 물림이다(위 ②·[63]이 담당).
    //   여기서 재는 것은 '드럼 안에 있는 부분이 벽을 안 스치는가'.
    let farMost = 0
    for (const s of w.stations) if (s.x >= COR_CX - COR_R) farMost = Math.max(farMost, Math.hypot(s.x - COR_CX, s.hw))
    ok(farMost < COR_R - 1, `드럼 안 구간 최원단 ${r2(farMost)} < 드럼 ${COR_R}−1 — 벽 무접촉`)
    const bs2 = incaBladesSpec()
    let bladeGap = 1e9
    for (const b of bs2.blades.filter(b => b.tip)) for (let j = 0; j <= 20; j++) {
      const u = j / 20, bx = bs2.ncx + (b.tip.x - bs2.ncx) * u, bz = b.tip.z * u
      for (const s of w.stations) bladeGap = Math.min(bladeGap, Math.hypot(bx - s.x, bz - s.hw), Math.hypot(bx - s.x, bz + s.hw))
    }
    ok(bladeGap > 10, `다섯 날 최소 수평거리 ${r2(bladeGap)} > 10 — 월대는 부채 위 허공에 없다`)
    //  ⑩ 머리 위(천장 빗면) — 월대가 가장 높은 보행면이므로 여기서 제일 빡빡하다
    ok(ceilY(w.x1) - w.yTop - 1.8 > 6, `동단 머리 위 ${r2(ceilY(w.x1) - w.yTop - 1.8)} > 6`)
    //  ⑪ 갓 봉인 — ★54에서 gatSeal 표본에 하강로·월대를 편입했다(구멍 봉합). 여유가 남아야 한다
    const gs = gatSeal()
    ok(gs.eave - gs.needRaw > 0, `갓 처마 ${r2(gs.eave)} > 요구 ${r2(gs.needRaw)}(월대·하강로 포함) — 봉인 유지`)

    // ── ★54-2 노치 — 세 형상 로컬 비교(현도 "셋 다 구현") ──
    ok(['semi', 'deca', 'wedge', 'off'].includes(WOLDAE_NOTCH), `노치 형상 '${WOLDAE_NOTCH}' 유효`)
    //  ★목적 검사(이 검사가 노치의 존재 이유다): 내려다보려고 판 것이니 **실제로 열리는가**를 잰다.
    //   한계각 = 눈에서 가장자리를 스치는 광선의 부각. 이보다 가파른 것은 내 발판이 가린다.
    const bs3 = incaBladesSpec(), st3 = incaStairSpec()
    const wp = W('woldae')
    //  ⚠버그 1건 자가 적발(전수 스윕): 눈높이를 월대 상면 고정으로 쓰고 있었다 —
    //   상승단 위에 서면 눈이 그만큼 올라가므로 **웨이포인트의 실제 y**를 써야 한다('back'이 허위 실패했다).
    const eyeY = wp.y + EYE
    const depTo = (tx, ty) => Math.atan2(eyeY - ty, Math.abs(tx - wp.x)) * 180 / Math.PI
    const depNexus = depTo(bs3.ncx, bs3.cutY), depPanel = depTo((st3.panel.x0 + st3.panel.x1) / 2, st3.panel.yTop)
    //  눈 앞에서 가장 먼저 끊기는 가장자리 = 내가 선 면의 동단(상승단이면 그 단의 동단, 아니면 노치 바닥)
    const edgeX = w.rise && wp.y > w.yTop + 1e-9 ? Math.min(w.rise.podEast, w.notch ? w.notchBotX : w.x1)
                : w.notch ? w.notchBotX : w.x1
    const edgeY = (w.rise && wp.y > w.yTop + 1e-9 && w.rise.form !== 'back') ? wp.y : w.yTop + w.rim
    const limit = Math.atan2(eyeY - edgeY, Math.max(0.05, edgeX - wp.x)) * 180 / Math.PI
    if (WOLDAE_NOTCH === 'off') {
      //  ★기준선은 목표를 **못 지키는 것이 정상**이다 — 그게 노치를 판 이유다.
      //   현도 로컬 판정("하단 뷰가 가려서 별로")을 수치로 고정해 둔다: 노치를 끄면 넥서스가 잘린다.
      ok(limit < depNexus, `[기준선] 한계각 ${r2(limit)}° < 넥서스 ${r2(depNexus)}° — 노치 없으면 하단이 잘린다(★54-2의 근거)`)
      ok(w.notch === null, '노치 off — 구 54 상태(비교 기준선)')
    } else {
      ok(limit > depNexus + 4 && limit > depPanel + 4,
        `한계각 ${r2(limit)}° > 넥서스 ${r2(depNexus)}° · 잉카 판 ${r2(depPanel)}° (+4 여유) — 하단 뷰가 실제로 열린다`)
      ok(w.notch !== null && w.notch.length >= 3, `노치 ${w.notchForm} 꼭짓점 ${w.notch.length}개`)
      ok(w.notch.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)), '노치 좌표 유한(NaN 0)')
      //  ★살 = 노치 옆에 남는 매스. 2 미만이면 뿔처럼 보인다 → 빌더가 클램프하고 여기서 확인
      ok(w.hwTip - w.notchR >= 2, `노치 옆 살 ±${r2(w.hwTip - w.notchR)} ≥ 2 — 뿔로 안 보임(반경 클램프 작동)`)
      ok(w.notchDeep > 0 && w.notchDeep < WOLDAE_OUT - 2,
        `노치 깊이 ${r2(w.notchDeep)} ∈ (0, 돌출 ${WOLDAE_OUT}−2) — 박스 입까지 안 파고든다`)
      //  ★하강로 무간섭: 노치가 경로·이탈점을 삼키면 안 된다(발자국이 곧 보행면이므로 구멍이 된다)
      //  ⚠검사 자체의 버그 1건 자가 적발(구현 중): 여유 `+2`를 두면 **이탈점 이후** 표본(북변 밖)까지
      //   재서 허위 실패한다(s 12.0·12.6·13.2 실측). 평탄 구간은 s < sFlat로 닫혀 있으므로 그것만 잰다.
      let onPath = 0, worst = null
      for (const q of d.samples) if (q.s < d.sFlat && !w.inside(q.x, q.z)) { onPath++; worst = q }
      ok(onPath === 0, `평탄 구간 표본 전부 발자국 안(${onPath}곳 이탈) — 걷는 줄과 구멍이 안 겹침`
        + (worst ? ` 최악 s${r2(worst.s)} x${r2(worst.x)} z${r2(worst.z)}` : ''))
      //  노치 자체가 경로에서 충분히 떨어져 있는가(형상·반경을 키워도 안 닿게)
      let notchGap = 1e9
      for (const q of d.samples) for (const p of w.notch) notchGap = Math.min(notchGap, Math.hypot(q.x - p.x, q.z - p.z))
      ok(notchGap > 2, `노치 ↔ 하강로 최소거리 ${r2(notchGap)} > 2 — 반경을 키워도 경로를 안 삼킨다`)
      //  ★발자국 = 윤곽 정본: 노치 안은 발자국이 아니다(판 생략 판정도 이걸 쓴다)
      ok(!w.inside(w.x1 - w.notchDeep / 2, 0) && w.inside(w.x1 - w.notchDeep / 2, w.hwTip - 1),
        `노치 안 = 발자국 밖 · 노치 옆 살 = 발자국 안 — 점-다각형 판정 정합`)
      //  ★립이 노치를 따라 돈다(동단 직선이 아니라 곡선을 감는다)
      ok(w.eastTo - w.eastFrom === w.notch.length + 1,
        `립 폴리라인 ${w.eastTo - w.eastFrom}구간 = 노치 ${w.notch.length}점 + 동단 양끝 — 립이 노치를 감는다`)
    }
    //  ★웨이포인트가 좋은 자리에 서 있는가 + y는 보행면 정본(surfY)과 일치하는가
    ok(Math.abs(wp.y - w.surfY(wp.x, wp.z)) < 1e-9 && w.inside(wp.x, wp.z),
      `월대 웨이포인트 (x${r2(wp.x)}, z${wp.z}, y${r2(wp.y)})가 발자국 안 · 보행면 정본과 일치`)

    // ── ★54-3 상승단 ──
    ok(['off', 'front', 'back', 'all'].includes(WOLDAE_RISE), `상승 체제 '${WOLDAE_RISE}' 유효`)
    if (!w.rise) {
      ok(Math.abs(d.ySurf - w.yTop) < 1e-9, `상승 off — 하강 출발면 ${r2(d.ySurf)} = 월대 상면(기준선)`)
    } else {
      const r = w.rise
      ok(r.n >= 2 && Math.abs(r.stepH * r.n - r.H) < 1e-9,
        `계단 ${r.n}단 × 단높이 ${r2(r.stepH)} = 상승 ${r.H} — 균등 배분`)
      ok(r.stepH <= 0.75, `단높이 ${r2(r.stepH)} ≤ 0.75 — 오를 수 있는 단`)
      //  ★계단이 박스 입 밖에서 시작하는가 — 안이면 관 천장(내부고 7)에 머리가 닿는다
      ok(r.fits, `계단 시작 x${r2(r.stairW)} ≥ 박스 입 ${BOX_X1} — 관 안에서 안 올라간다`
        + (r.fits ? '' : ` ⚠'${r.form}' H${r.H}는 돌출 ${WOLDAE_OUT}에 안 들어감 — WOLDAE_OUT을 키우거나 H를 낮출 것`))
      ok(r.podEast <= w.x1 + 1e-9 && r.stairW > w.x0, `상승단 x${r2(r.stairW)}~${r2(r.podEast)} ∈ 월대 안`)
      //  ★천장(월대가 건물에서 가장 높은 보행면이 된다)
      ok(ceilY(r.podEast) - r.top - 1.8 > 6, `전망단 머리 위 ${r2(ceilY(r.podEast) - r.top - 1.8)} > 6`)
      //  ★갓 봉인 — 상승단은 최고 보행면이므로 처마 요구가 자랄 수 있다(gatSeal이 월대를 표본에 포함)
      ok(gatSeal().eave - gatSeal().needRaw > 0, `상승 후에도 갓 여유 ${r2(gatSeal().eave - gatSeal().needRaw)} > 0`)
      //  ★ⓒ'길 위' — 'all'만 하강로를 오른 레벨에서 출발시킨다(나머지는 전망이 곁길)
      const onPath = Math.abs(d.ySurf - r.top) < 1e-9
      ok(r.form === 'all' ? onPath : !onPath,
        r.form === 'all' ? `'all' = 하강 출발면 ${r2(d.ySurf)} = 상승단 상면 — ⓒ'길 위' 유지`
                         : `'${r.form}' = 하강 출발면 ${r2(d.ySurf)} = 하단 — 전망은 곁길(ⓒ 부분 해제, 현도 승인)`)
      ok(d.slopeDeg <= 38.5 && d.rise <= 0.6,
        `상승분 반영 후 경사 ${r2(d.slopeDeg)}° ≤ 38.5 · 단높이 ${r2(d.rise)} ≤ 0.6`)
      //  ★유효폭 — ★제 착오를 검사로 박아 둔다: front·all은 가장자리가 함께 올라 안 넓어진다
      const eyeY2 = r.top + EYE
      const blkY = (r.form === 'back') ? w.yTop + w.rim : r.top
      const blkX = (r.form === 'back') ? w.notchBotX : r.podEast
      const wide = (eyeY2 - blkY) / Math.tan(38.92 * Math.PI / 180)
      ok(wide > 1.5, `유효폭 ${r2(wide)}m (넥서스가 열리는 후퇴 거리) — ${r.form === 'back' ? '후퇴형이라 H에 비례' : 'H와 무관(가장자리 동반 상승)'}`)
      //  ★관 위로 솟는가(H > 5.40) — 진술이지 요구는 아니므로 정보로 남긴다
      ok(true, `눈 y${r2(eyeY2)} vs 박스 천장 ${BOX_TOP} — ${eyeY2 > BOX_TOP ? '관 위로 솟음 ✔' : `아직 관 안(솟으려면 H > ${r2(BOX_TOP - w.yTop - EYE)})`}`)
    }
  }

  // ── ★53 피어 관문(현도 07.23: "겹침을 지지로") ──
  console.log('\n— C3. ★53 피어 관문 —')
  const ports = descentPortSpec(HALL_ENTRY)
  if (!DESC_PORT_ON) {
    ok(true, '관문 꺼짐(DESC_PORT_ON=false) — 검사 생략')
  } else if (d.scheme === 'axial') {
    ok(ports.length === 0, `축 체제 관문 ${ports.length} = 0 — 축 경로는 피어 대역을 안 지난다(실측)`)
  } else {
    //  ⚠검출은 노브 파생 — 현행 기본(북·60°·R76)에서 2곳이지만 회전량을 줄이면 1곳일 수 있다.
    ok(ports.length >= 1, `관문 ${ports.length}곳 검출(≥1 — 하강로가 피어 대역을 지나는 한 반드시 있다)`)
    ok(DESC_PORT_H >= 4, `입구 높이 ${DESC_PORT_H} ≥ 4 — 머리(1.8) 두 배 이상 = '높은 입구'`)
    ok(DESC_PORT_CLR >= 1, `어깨 여유 ${DESC_PORT_CLR} ≥ 1`)
    for (const p of ports) {
      //  경로 위 지점인가 + 관문끼리 안 겹치는가
      ok(p.s > 0 && p.s < d.L, `관문 az${r2(p.az * 180 / Math.PI)}° s${r2(p.s)} ∈ 경로 안`)
      //  받침의 물림: 컷 밑(보행선−0.35)이 보 밑(−2.6)보다 위 = 피어가 보를 2.25 파묻는다
      ok(0.35 < DESC_GIRDER - 0.3, `컷 밑 0.35 < 보 깊이 ${DESC_GIRDER}−0.3 — 받침 물림 ${r2(DESC_GIRDER - 0.35)} 확보`)
      //  잔여 기둥: 입구 바깥 모서리 반경 < 피어 바깥면 − 3 = 문 옆·뒤로 기둥이 남는다(문이지 절단이 아님)
      const rPort = Math.hypot(p.x - COR_CX, p.z) + DESC_HW + DESC_PORT_CLR
      ok(rPort < COR_R + PIER_OUT - 3, `입구 바깥 반경 ${r2(rPort)} < 피어 바깥 ${COR_R + PIER_OUT}−3 — 잔여 기둥 확보`)
      //  머리 위: 입구 정점이 컷 대역 안에서 실제로 열리는가(아치 스프링 포함)
      ok(DESC_PORT_H > DESC_HW + DESC_PORT_CLR || DESC_PORT_TOP === 'flat',
        `아치 반경(${r2(DESC_HW + DESC_PORT_CLR)}) < 높이 ${DESC_PORT_H} — 스프링 라인이 보행선 위`)
    }
    if (ports.length >= 2) for (let i = 1; i < ports.length; i++)
      ok(ports[i].s - ports[i - 1].s > 2 * (PIER_HW + 3.5), `관문 ${i}↔${i + 1} 간격 ${r2(ports[i].s - ports[i - 1].s)} — 프리즘 무겹침`)
    //  ★CSG 스모크: 관문 1곳을 실제로 뚫어본다(감김·NaN — 부호 부피 가드의 실증)
    if (ports.length) {
      const tris = portPrismTris(ports[0])
      const minTri = DESC_PORT_TOP === 'flat' ? 12 : 40      // 사각 = 단면 4점 = 12tri / 아치 = 13점 = 48tri
      ok(tris.length >= 9 * minTri && tris.every(v => isFinite(v)), `프리즘 ${tris.length / 9}tri(≥${minTri}) · NaN 0`)
      //  ★★53-3 감김 일관성: 옆면/캡이 반대로 감기면 부호 부피는 통과해도 CSG가 자재를 남긴다
      //   (현도 스크린샷 2차의 '얇은 판' — 26 vs 22 혼재). 전역 반전으로 못 잡히는 계열이라 위상으로 잡는다.
      ok(windingConsistent(tris), '프리즘 감김 일관(같은 방향 변 중복 0) — 면마다 겉면 정렬됨')
      //  ★부피 = 단면적 × 스윕길이 검산: 혼재 감김이면 여기서 3배 어긋난다(514 vs 1543 실측 사례)
      const nI = -(DESC_HW + 2.0), nO = DESC_HW + DESC_PORT_CLR
      const aR2 = (nO - nI) / 2, spr = Math.max(0.5, DESC_PORT_H - aR2)
      const areaEst = DESC_PORT_TOP === 'flat'
        ? (nO - nI) * (DESC_PORT_H + 0.35)
        : (nO - nI) * (spr + 0.35) + Math.PI * aR2 * aR2 / 2
      const volExp = areaEst * 2 * (PIER_HW + 3.5)
      const volAct = signedVolume(tris)
      ok(volAct > volExp * 0.9 && volAct < volExp * 1.1,
        `프리즘 부피 ${r2(volAct)} ≈ 단면 ${r2(areaEst)} × 길이 ${r2(2 * (PIER_HW + 3.5))} = ${r2(volExp)} (±10%)`)
      const az = ports[0].az, c = Math.cos(az), sn = Math.sin(az)
      const corner = (r, w) => [COR_CX + r * c - w * sn, r * sn + w * c]
      const V = [corner(COR_R + PIER_OUT, -PIER_HW), corner(COR_R + PIER_OUT, PIER_HW),
                 corner(COR_R - PIER_DEPTH, PIER_HW), corner(COR_R - PIER_DEPTH, -PIER_HW)]
      const pos = []
      for (const q of V) pos.push(q[0], -0.5, q[1])
      for (const q of V) pos.push(q[0], ceilY(q[0]) + 4, q[1])
      const idx = [4,5,6,4,6,7, 0,1,5,0,5,4, 1,2,6,1,6,5, 2,3,7,2,7,6, 3,0,4,3,4,7, 1,0,3,1,3,2]
      //  ★53-2: 겉면 감김 강제 — 원본 인덱스 감김이 안쪽이라 CSG가 껍데기·조각으로 파탄났었다(현도 스크린샷).
      const flat = []
      for (const i of idx) flat.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      const out = outwardTris(flat)
      const volA = signedVolume(out)
      ok(volA > 0 && windingConsistent(out), `피어 몸 부피 ${r2(volA)} > 0 · 감김 일관 — 겉면 확정`)
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3))
      const cut = new THREE.BufferGeometry()
      cut.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3))
      const ev = new Evaluator(); ev.attributes = ['position']   // 커스텀 지오메트리 = uv·normal 없음(㊶ 전례)
      const bA = new Brush(g); bA.updateMatrixWorld()
      const bB = new Brush(cut); bB.updateMatrixWorld()
      const res = ev.evaluate(bA, bB, SUBTRACTION).geometry
      const rp = res.attributes.position
      ok(rp.count > 24 && ![...rp.array].some(v => !isFinite(v)),
        `CSG 관통 실행 — 결과 ${rp.count}정점 · NaN 0`)
      //  ★뚫림의 실증 = **부피가 준다**(이번 감김 버그를 잡았을 검사 — 파탄 결과는 부피가 늘거나 음수).
      const volR = signedVolume([...res.attributes.position.array])
      ok(volR > 0 && volR < volA - 50,
        `CSG 결과 부피 ${r2(volR)} ∈ (0, 피어 ${r2(volA)}−50) — 구멍만큼 정확히 줄었다(감김 회귀 보험)`)
      //  ★★53-3 점유 검사 = 이 버그의 진짜 정본. 부피·감김이 다 통과해도 '실제로 걸어 지나갈 수
      //   있는가'는 별개다 → 통로 격자에 광선 패리티로 점유를 재고, 아치 곡면 안은 전부 비어야 한다.
      const rr = Math.hypot(ports[0].x - COR_CX, ports[0].z)
      const rdv = [(ports[0].x - COR_CX) / rr, ports[0].z / rr]
      const N0v = [-ports[0].tz, ports[0].tx]
      const ogv = Math.sign(N0v[0] * rdv[0] + N0v[1] * rdv[1]) || 1
      const Nv = [N0v[0] * ogv, N0v[1] * ogv]
      const aRv = (nO - nI) / 2, ncv = (nI + nO) / 2, sprv = Math.max(0.5, DESC_PORT_H - aRv)
      const archTop = (n) => Math.abs(n - ncv) >= aRv ? sprv : sprv + Math.sqrt(aRv * aRv - (n - ncv) ** 2)
      const RT = [...res.attributes.position.array], DIR = [0.3714, 0.5571, 0.7428]
      const insideRes = (P) => {
        let cnt = 0
        for (let i = 0; i < RT.length; i += 9) {
          const a = RT.slice(i, i + 3), b = RT.slice(i + 3, i + 6), cc = RT.slice(i + 6, i + 9)
          const e1 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], e2 = [cc[0]-a[0], cc[1]-a[1], cc[2]-a[2]]
          const h = [DIR[1]*e2[2]-DIR[2]*e2[1], DIR[2]*e2[0]-DIR[0]*e2[2], DIR[0]*e2[1]-DIR[1]*e2[0]]
          const det = e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2]
          if (Math.abs(det) < 1e-12) continue
          const f = 1/det, sv = [P[0]-a[0], P[1]-a[1], P[2]-a[2]]
          const u2 = f*(sv[0]*h[0]+sv[1]*h[1]+sv[2]*h[2]); if (u2 < 0 || u2 > 1) continue
          const q = [sv[1]*e1[2]-sv[2]*e1[1], sv[2]*e1[0]-sv[0]*e1[2], sv[0]*e1[1]-sv[1]*e1[0]]
          const v2 = f*(DIR[0]*q[0]+DIR[1]*q[1]+DIR[2]*q[2]); if (v2 < 0 || u2+v2 > 1) continue
          if (f*(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2]) > 1e-9) cnt++
        }
        return cnt % 2 === 1
      }
      let blocked = 0, sampled = 0
      for (const u2 of [-6, -3, 0, 3, 6]) for (const hh of [0.3, 2, 4, 6]) for (const nn of [-2, 0, 2]) {
        if (hh > archTop(nn) - 0.2) continue
        sampled++
        if (insideRes([ports[0].x + u2*ports[0].tx + nn*Nv[0], ports[0].yWalk + u2*ports[0].dyds + hh,
                       ports[0].z + u2*ports[0].tz + nn*Nv[1]])) blocked++
      }
      ok(blocked === 0, `통로 점유 ${sampled}점 중 막힘 ${blocked} — 실제로 걸어 지나갈 수 있다(관통 실증)`)
      ok(true, `컷 밑 = 보행선−0.35(판 0.43 융착 통과) · 위 = +${DESC_PORT_H}(${DESC_PORT_TOP})`)
    }
  }
}

console.log('\n— D. 리브 계단 구역(전부 관 안인가) —')
for (const id of ['ribdoor', 'pole', 'panel', 'kneewalk', 'junction', 'lookout']) {
  const w = W(id)
  const d3 = Math.hypot(distToCenterline(w.x, w.y), w.z)     // 3D 관거리(평면거리 ⊕ z)
  ok(d3 < SHELL_RIB_R, `${id} 관거리 ${d3.toFixed(2)} < 리브 반경 ${SHELL_RIB_R}`)
  ok(w.y > RIB_Y - 1 && w.y < U_LOOKOUT_END * H + 6,
    `${id} y=${w.y.toFixed(1)} ∈ 계단 구역(문 ${RIB_Y} ~ 전망 ${(U_LOOKOUT_END * H).toFixed(0)})`)
}
{
  const p = W('pole'), hd = Math.hypot(R_BASE - p.x, p.z)
  ok(Math.abs(hd - STAIR_R) < 0.3, `폴 절단: 폴 축(x=${R_BASE})까지 수평 ${hd.toFixed(2)} ≈ 나선 반경 ${STAIR_R.toFixed(2)}`)
  ok(p.pitch < 0, `폴 절단 pitch=${p.pitch.toFixed(2)} — 발밑 절단 캡을 내려봄`)
  ok(dot2(fwd(p.yaw), [(R_BASE - p.x) / hd, -p.z / hd]) > 0.99, '폴 절단 시선이 폴 축 정면')
}
{
  const k = W('kneewalk'), jn = W('junction')
  ok(k.x > X_LAND_HI && k.x < rOf(U_SPIRAL_END),
    `무릎길 중간 x=${k.x.toFixed(1)} ∈ (판 +x변 ${X_LAND_HI.toFixed(1)}, 나선끝 ${rOf(U_SPIRAL_END).toFixed(1)})`)
  ok(k.y > H * U_SPIRAL_END && k.y < H * U_KNEE_END,
    `무릎길 중간 y=${k.y.toFixed(1)} ∈ (나선끝 ${(H * U_SPIRAL_END).toFixed(0)}, 정션 ${(H * U_KNEE_END).toFixed(0)}) — 오르는 중`)
  ok(jn.x > X_LAND_LO && jn.x < X_LAND_HI, `갈림 x=${jn.x.toFixed(1)} ∈ 판(${X_LAND_LO.toFixed(1)}~${X_LAND_HI.toFixed(1)})`)
  ok(Math.abs(jn.y - (U_KNEE_END * H + 0.1)) < 1e-9, `갈림 y=${jn.y.toFixed(2)} = 착지판 윗면`)
}
{
  const lk = W('lookout')
  const cx = rOf(U_LOOKOUT_END) + LK_DISC_DX, cz = LK_DISC_DZ                 // 반원판 중심(노브 파생)
  const cy = U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY
  ok(lk.pitch > 0.6, `전망 pitch=${lk.pitch.toFixed(2)} — 보어를 올려다봄`)
  ok(Math.hypot(lk.x - cx, lk.z - cz) < LK_PLAT_R - 0.5,
    `전망 발판이 반원판(r=${LK_PLAT_R}) 안 — 중심에서 ${Math.hypot(lk.x - cx, lk.z - cz).toFixed(2)}`)
  ok(lk.x <= cx + 1e-9, `전망 x=${lk.x.toFixed(2)} ≤ 지름변 ${cx.toFixed(2)} — 재질 있는 −x 반쪽 위(빈 반쪽 아님)`)
  ok(Math.abs(lk.y - cy) < 1e-9, `전망 y=${lk.y.toFixed(2)} = 디스크 윗면`)
  ok(lk.y > W('junction').y, `전망 y=${lk.y.toFixed(1)} > 갈림 ${W('junction').y.toFixed(1)} — 위 갈래`)
}

console.log('\n— E. 통로판(1p9~11) —')
{
  const a = W('ante')
  ok(a.x > RM_X0 && a.x < RM_X1, `전실 x=${a.x.toFixed(1)} ∈ 방(${RM_X0.toFixed(1)}~${RM_X1.toFixed(1)})`)
  ok(Math.abs(a.y - PASS_FLOOR_Y) < 1e-9, `전실 y=${a.y.toFixed(2)} = 방 바닥`)
  ok(dot2(fwd(a.yaw), [0, 1]) > 0.99, '전실 시선 = +z(회랑 입)')
}
for (const id of ['cloister', 'lamp']) {
  const w = W(id), r = Math.hypot(w.x, w.z), phi = Math.atan2(w.z, w.x)
  ok(Math.abs(r - CL_R) < CL_HW - 0.3, `${id} 반경 ${r.toFixed(1)} — 회랑 중심선 ±${(CL_HW - 0.3).toFixed(1)} 안`)
  ok(phi > CL_PHI0 && phi < CL_PHI1,
    `${id} φ=${(phi * DEG).toFixed(1)}° ∈ 회랑 호(${(CL_PHI0 * DEG).toFixed(1)}~${(CL_PHI1 * DEG).toFixed(1)}°)`)
  ok(Math.abs(w.y - (PASS_FLOOR_Y - 0.02)) < 1e-9, `${id} y=${w.y.toFixed(2)} = 회랑 바닥(ring 평면)`)
}
ok(W('lamp').pitch > 1.0, `등불 pitch=${W('lamp').pitch.toFixed(2)} — 관→리브 시선 안내선을 올려다봄`)
{
  const d = W('door'), r = Math.hypot(d.x, d.z), phi = Math.atan2(d.z, d.x)
  ok(Math.abs(phi - ST_PHI) < 1e-9, `문 φ=${(phi * DEG).toFixed(2)}° = 스텁 축 ${(ST_PHI * DEG).toFixed(2)}°`)
  ok(r > PASS_X_END && r < CL_R - CL_HW,
    `문 r=${r.toFixed(1)} ∈ 스텁(끝벽 ${PASS_X_END.toFixed(1)} ~ 회랑 안벽 ${(CL_R - CL_HW).toFixed(1)})`)
  ok(Math.abs(d.y - (PASS_FLOOR_Y - 0.05)) < 1e-9, `문 y=${d.y.toFixed(2)} = 스텁 바닥`)
  ok(dot2(fwd(d.yaw), [-Math.cos(ST_PHI), -Math.sin(ST_PHI)]) > 0.99, '문 시선 = 스텁 축 −방향(문 → 테라스)')
}

console.log('\n— F. 테라스 —')
{
  const t = W('terrace'), r = Math.hypot(t.x, t.z)
  ok(r > TERRACE_RIN && r < TERRACE_ROUT, `테라스 r=${r.toFixed(1)} ∈ 고리(${TERRACE_RIN}~${TERRACE_ROUT})`)
  ok(Math.abs(t.y - TERRACE_Y) < 1e-9, `테라스 y=${t.y.toFixed(2)} = 테라스 판`)
  ok(t.pitch > 0, `테라스 pitch=${t.pitch.toFixed(2)} — 리브·렌즈를 약간 올려봄`)
}

console.log('\n— G. 여정 순서([ ] 키가 이 순서로 돈다) —')
console.log('  ' + WP_GROUPS.map(g => `${g.name}(${g.items.length})`).join('  →  '))
{
  const at = (id) => WAYPOINTS.findIndex(w => w.id === id)
  ok(at('room') < at('hub') && at('hub') < at('p1') && at('p4') < at('joint')
    && at('joint') < at('corridor') && at('corridor') < at('ribdoor') && at('ribdoor') < at('pole')
    && at('pole') < at('panel') && at('panel') < at('kneewalk') && at('kneewalk') < at('junction')
    && at('junction') < at('lookout') && at('lookout') < at('ante') && at('ante') < at('cloister')
    && at('cloister') < at('lamp') && at('lamp') < at('door') && at('door') < at('terrace'),
    '순서 = 관람 동선(지상 → 허브 → 꽃잎4 → 통로 → 리브 → 갈림·전망 → 전실 → 회랑 → 등불 → 문 → 테라스)')
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
