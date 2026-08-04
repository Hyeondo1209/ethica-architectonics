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
  CL_FLOOR_END, clFloorY, CL_SEG_DROP, CL_STEP_RISE, CL_STAIR_MID, CL_STEP_N, CL_DROP_TOTAL, CL_ROOF_Y, clSillY, CL_SILL,   // ★78-2
  ST_ON, RM10_ON, RM10_PHI, RM10_AX_R, RM10_RHO, RM10_FLOOR_Y, RM10_FLOOR_OPEN_R, RM10_DROP,   // ★79 등불 방
  RM10_EXIT_RIN, RM10_EXIT_ROUT, RM10_EXIT_FLOOR_Y, RM10_STR_END,   // ★79-5/6 출구 통로
  WSTAIR_X1, X_DESC0, DESC_TREAD_D, PASS_X_CHEEK, JCT_DN_Z, PASS_HW, PASS_T, DESC_SLOPE,   // ★84 W5
  INCA_W0, INCA_CENTER_MODE,   // ★2026.07.29 W5 잉카 폭 · ★94-b 체제
} from './constants.js'
import { RM10_FLARE_ON, RM10_FLARE_MX, RM10_FLARE_MZ, RM10_FLARE_SWEEP, RM10_FLARE_R, RM10_ARC_TH1, TERRACE_ON } from './constants.js'   // ★80
import { RM10_FLARE_RISE, RM10_FLARE_MY, RM10_FLARE_W1, TR_RIN, TR_ROUT, TR_AZ0, TR_AZ1, TR_Y, TERRACE_T, TR_W_F, terraceMouth } from './constants.js'   // ★85 테라스
import { TR_STEP_ON, TR_STEP_MODE, TR_SOFFIT, TR_LAND_F, gatCap, GAT_CX, LK_DISC_T } from './constants.js'   // ★89 테라스 계단화
import { SURVEY_START } from './constants.js'   // ★108 조형 검토 모드(개발 도구 — 배포 전 'off')
import { TR_LINK_ON, TR_LINK_HW, TR_LINK_BITE, GAT_CROWN_R } from './constants.js'   // ★90 리드 연결 계단
import { terraceSpec, terracePoint, terraceProfileY, terraceSoffitY, buildTerrace, terraceLinkSpec, buildTerraceLink } from './terraceGeometry.js'
import { flareSpec } from './exitFlareGeometry.js'
import { p1HeightAt } from './radialEventsGeometry.js'
const r2 = (v) => Math.round(v * 100) / 100   // ★㊾ (check_corridor와 같은 보조자)
import { descentSpec, woldaeSpec, gatSeal, incaStairSpec, incaBladesSpec, descentPortSpec, portPrismTris, drumPierAzimuths, outwardTris, signedVolume, windingConsistent, incaNexusWestX} from './corridorStairsGeometry.js'   // ★㊾·53·54
import { formatFree, formatWaypoint, parseFree, formatHuman } from './poseFormat.js'   // ★99 좌표 교환 포맷
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { WAYPOINTS, WP_GROUPS, SPAWN_ID, EYE, wpById } from './waypoints.js'
import { RIB_XFER_ON, RIB_DEST_PHI, RIB_DEST_K, FR_FLOOR_Y, FREE_MOUTH_CLR, TEMPLE_HZ, RIB_FREE_MODE, BAL_STEP } from './constants.js'   // ★61·62-2·63
import { openRimSpec, isOpenRib } from './ribGeometry.js'
import { ribCutSpec } from './corridorStairsGeometry.js'
import { freeSplitRange, freeNewelSpec, destCut } from './ribGeometry.js'

// ── ★W절(보행, 2026.07.29) 전용 import — 리그 정본 + 계단계 정본 ──
import fs from 'fs'
import { STEP_UP, STEP_DOWN, FREE_WALK } from './waypoints.js'   // ⚠사본 금지(EYE 전례) — 런타임과 같은 수
import { TREAD_THICK, STAIR_STEPS, spiralPoint, ROOM_STAIR_RISE, DAIS_STEP_H,
         DESC_STEP_R, DESC_STEPS, clFloorSegments, rm10Steps, RM10_LAND_Y } from './constants.js'
import { floorKnotSpec, viceSplitIndex } from './ribGeometry.js'
import { junctionKnotSpec } from './junctionGeometry.js'   // ★84 W5 수평 틈
import { kneeTreads, kneeStairSpec } from './kneeStair.js'
import { wideStairTreads } from './junctionGeometry.js'
import { stairProfile } from './exitFlareGeometry.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const W = (id) => wpById(id)
const DEG = 180 / Math.PI

// ── ★61: 상부 지점(판넬~테라스·자립·아가리)은 목적지 리브(+RIB_DEST_PHI)로 회전 배치돼 있다.
//  검사식은 전부 φ=0 평면에서 유도됐으므로, 회전 지점은 **역회전해서** 같은 식으로 잰다
//  (10° = 리브 간격 2배라 리브 격자·회랑 상대기하는 불변 — 라벨만 이동, DESIGN §7 ★61).
const XPHI = RIB_XFER_ON ? RIB_DEST_PHI : 0
const unrot = (w) => {
  const c = Math.cos(-XPHI), sn = Math.sin(-XPHI)
  return { ...w, x: w.x * c - w.z * sn, z: w.x * sn + w.z * c, yaw: w.yaw + XPHI }
}
const WU = (id) => unrot(W(id))   // 회전 지점 전용 접근자(비회전 지점에 쓰면 틀린다 — 주의)

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
//  ★55(2026.07.24): 현도가 구 1p6·1p7(폴 절단)을 폐기하고 1p7만 프리즈 방으로 옮겼다.
//   1p6은 "프리즈 방 아래 나선 부근"으로 예고만 된 상태 = **의도된 결번**.
//   숨기면 잊는다 → 결번을 **명시 선언**하고, 선언과 실제가 어긋날 때만 실패시킨다.
//   ⚠DoD-1(15개 전부 집)은 이 배열이 빌 때까지 미충족이다. 1p6 배치 세션에서 비울 것.
//  ⛔★79-2(2026.07.28): **1p11 결번 추가.** 구 회랑→테라스 출구(스텁+문)를 껐다 — 등불 방이 회랑의 종점이
//   됐고, 새 출구는 방에서 낸다(설계 대기). 1p11 = '공개' 순간이라 문이 곧 그 집이다.
//   ⚠이건 '괜찮다'가 아니라 **선언된 빚**이다. 새 출구가 서면 여기서 11을 지운다 — 안 지우면 이 검사가 통과해
//   결번을 영영 못 본다. DoD-1·DoD-2·DoD-3이 지금 전부 이 한 줄에 걸려 있다.
//  ✅★79-5(2026.07.28): **1p11 결번 해소.** 등불 방 출구 통로의 테라스 쪽 문이 '공개'의 집이 됐다
//   (`reveal` 웨이포인트). ★79-2에서 진 빚을 같은 세션 안에서 갚았다 — DoD-2(완주)·DoD-3(공개) 복구.
//  ★80: 테라스 임시 소등 중엔 1p12~15도 집이 없다 — **선언된 빚**(재설계 대기).
//   ⚠이 확장은 TERRACE_ON에 묶여 있다. 새 테라스가 서면 스위치 하나로 자동 복귀한다.
const UNASSIGNED = TERRACE_ON ? [6] : [6, 12, 13, 14, 15]   // 정리 번호(숫자) — missing과 같은 형식이어야 한다
const miss = missing.join(','), decl = UNASSIGNED.join(',')
ok(miss === decl,
  missing.length === 0 ? '1p1~15 전부 웨이포인트 있음'
    : `미배정 = ${missing.map(n => '1p' + n).join(',')} — ⚠DoD-1 미충족(선언된 결번): 1p6 재배치${TERRACE_ON ? '' : ' + ★80 테라스 임시 소등(1p12~15)'} 대기`)

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
  //  ★★94 도착 = **그 높이에서 서쪽으로 먼저 나오는 단단한 면**(판 서단 또는 넥서스 서변 — min 파생).
  //   'fan'에선 부채가 판보다 서쪽까지 뻗어 도착이 부채 서변으로 당겨진다.
  { const westSolid = Math.min(st.panel.x0, incaNexusWestX())
    ok(Math.abs(d.yE - st.panel.yTop) < 1e-9 && Math.abs(d.E[0] - westSolid) < 1e-9,
      `도착 = ${westSolid < st.panel.x0 - 1e-9 ? '**넥서스 서변**' : '잉카 판 서단'} (x${r2(d.E[0])}, y${r2(d.yE)}) — 경첩`) }
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
  //  ⚠★★94 도구 정정 — 구 코드는 **넥서스 중심(u=0)부터** 잤다. 그 구간(중심 ~ 날 뿌리 s0)은
  //   날이 아니라 **넥서스 발자국 안**이다. 'fan'에서 하강로가 부채 서변에 도착하자 그 허깨비 구간과의
  //   거리가 0으로 나와 검사가 울었지만, 실제 날까지는 22.01이었다(별도 실측으로 확인).
  //   → **뿌리(s0)부터 팁까지**만 잰다. 부채 자체와의 관계는 아래 W5(수평 틈)가 담당한다.
  for (const b of bs.blades.filter(b => !b.reach)) {
    const ca = Math.cos(b.az), sa = Math.sin(b.az)
    for (const q of d.samples) for (let j = 0; j <= 20; j++) {
      const sPos = b.s0 + (b.sTip - b.s0) * (j / 20)
      bladeClr = Math.min(bladeClr, Math.hypot(q.x - (bs.ncx + sPos * ca), q.z - sPos * sa))
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
    if (WOLDAE_NOTCH === 'off' && !w.rise) {
      //  ★맨 기준선(노치도 상승도 없음)은 목표를 **못 지키는 것이 정상**이다 — 그게 54-2를 판 이유다.
      ok(limit < depNexus, `[기준선] 한계각 ${r2(limit)}° < 넥서스 ${r2(depNexus)}° — 둘 다 없으면 하단이 잘린다`)
    } else {
      //  ⚠★현도 채택 조합(노치 off + 상승 front H4)이 이 검사로 드러낸 사실:
      //   **상승단이 노치의 일을 대신한다.** 단 위 끝에 서면 가장자리가 발밑 0.7이라 한계각이 66°까지 열린다
      //   → 노치를 파지 않고도 넥서스가 보인다. 노치 폐기가 미적 취향이 아니라 기하적으로 정당했다는 뜻.
      ok(limit > depNexus + 4,
        `한계각 ${r2(limit)}° > 넥서스 ${r2(depNexus)}° — ${w.notch ? '노치' : '상승단'}이 하단 뷰를 연다`)
    }
    if (WOLDAE_NOTCH === 'off') {
      ok(w.notch === null, '노치 off — 구 54 상태(현도 채택)')
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
  //  ★61: 판넬 이후는 목적지 리브 소속 — 역회전 후 φ=0 곡선에 잰다(ribdoor·pole은 #0 그대로)
  const w = ['ribdoor', 'pole'].includes(id) ? W(id) : WU(id)
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
  const k = WU('kneewalk'), jn = WU('junction')
  ok(k.x > X_LAND_HI && k.x < rOf(U_SPIRAL_END),
    `무릎길 중간 x=${k.x.toFixed(1)} ∈ (판 +x변 ${X_LAND_HI.toFixed(1)}, 나선끝 ${rOf(U_SPIRAL_END).toFixed(1)})`)
  ok(k.y > H * U_SPIRAL_END && k.y < H * U_KNEE_END,
    `무릎길 중간 y=${k.y.toFixed(1)} ∈ (나선끝 ${(H * U_SPIRAL_END).toFixed(0)}, 정션 ${(H * U_KNEE_END).toFixed(0)}) — 오르는 중`)
  ok(jn.x > X_LAND_LO && jn.x < X_LAND_HI, `갈림 x=${jn.x.toFixed(1)} ∈ 판(${X_LAND_LO.toFixed(1)}~${X_LAND_HI.toFixed(1)})`)
  ok(Math.abs(jn.y - (U_KNEE_END * H + 0.1)) < 1e-9, `갈림 y=${jn.y.toFixed(2)} = 착지판 윗면`)
}
{
  const lk = WU('lookout')
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
  const a = WU('ante')
  ok(a.x > RM_X0 && a.x < RM_X1, `전실 x=${a.x.toFixed(1)} ∈ 방(${RM_X0.toFixed(1)}~${RM_X1.toFixed(1)})`)
  ok(Math.abs(a.y - PASS_FLOOR_Y) < 1e-9, `전실 y=${a.y.toFixed(2)} = 방 바닥`)
  ok(dot2(fwd(a.yaw), [0, 1]) > 0.99, '전실 시선 = +z(회랑 입)')
}
for (const id of ['cloister', 'lamp']) {
  const w = WU(id), r = Math.hypot(w.x, w.z), phi = Math.atan2(w.z, w.x)
  ok(Math.abs(r - CL_R) < CL_HW - 0.3, `${id} 반경 ${r.toFixed(1)} — 회랑 중심선 ±${(CL_HW - 0.3).toFixed(1)} 안`)
  ok(phi > CL_PHI0 && phi < CL_PHI1,
    `${id} φ=${(phi * DEG).toFixed(1)}° ∈ 회랑 호(${(CL_PHI0 * DEG).toFixed(1)}~${(CL_PHI1 * DEG).toFixed(1)}°)`)
  //  ★78-2: 회랑 바닥은 φ의 함수(계단)다 — 상수 대조에서 **그 지점의 층계참** 대조로 바꾼다.
  ok(Math.abs(w.y - (clFloorY(phi) - 0.02)) < 1e-9, `${id} y=${w.y.toFixed(2)} = 그 φ의 회랑 바닥 ${(clFloorY(phi) - 0.02).toFixed(2)}(ring 평면)`)
}
ok(W('lamp').pitch > 1.0, `등불 pitch=${W('lamp').pitch.toFixed(2)} — 관→리브 시선 안내선을 올려다봄`)
if (ST_ON) {
  const d = WU('door'), r = Math.hypot(d.x, d.z), phi = Math.atan2(d.z, d.x)
  ok(Math.abs(phi - ST_PHI) < 1e-9, `문 φ=${(phi * DEG).toFixed(2)}° = 스텁 축 ${(ST_PHI * DEG).toFixed(2)}°`)
  ok(r > PASS_X_END && r < CL_R - CL_HW,
    `문 r=${r.toFixed(1)} ∈ 스텁(끝벽 ${PASS_X_END.toFixed(1)} ~ 회랑 안벽 ${(CL_R - CL_HW).toFixed(1)})`)
  ok(Math.abs(d.y - (CL_FLOOR_END - 0.05)) < 1e-9, `문 y=${d.y.toFixed(2)} = 스텁 바닥 ${(CL_FLOOR_END - 0.05).toFixed(2)}(★78-2로 9.6 강하)`)
  ok(dot2(fwd(d.yaw), [-Math.cos(ST_PHI), -Math.sin(ST_PHI)]) > 0.99, '문 시선 = 스텁 축 −방향(문 → 테라스)')
}

console.log('\n— E2. ★79 등불 방(1p10) —')
if (RM10_ON) {
  const p2 = WU('lamproom')
  const AX = RM10_AX_R * Math.cos(RM10_PHI), AZ = RM10_AX_R * Math.sin(RM10_PHI)
  const d = Math.hypot(p2.x - AX, p2.z - AZ)
  ok(d < RM10_FLOOR_OPEN_R, `등불 방 웨이포인트가 가운데 빈 바닥 안 (축에서 ${d.toFixed(2)} < ${RM10_FLOOR_OPEN_R.toFixed(2)})`)
  ok(Math.abs(p2.y - RM10_FLOOR_Y) < 1e-9, `y=${p2.y.toFixed(2)} = 방 바닥 ${RM10_FLOOR_Y.toFixed(2)}(계단 50단이 정확히 닿는 높이)`)
  ok(dot2(fwd(p2.yaw), [(AX - p2.x) / d, (AZ - p2.z) / d]) > 0.99, '시선 = 방 중앙(등불) 향')
  ok(p2.pitch > 1.0, `pitch=${p2.pitch.toFixed(2)} — 관이 속성에 꽂히는 자리를 올려다봄`)
  //  ★봉인(현도 의도): 회랑을 걸으며 방 안이 안 보여야 한다 — 눈높이·문턱·하강으로 유도한 가시 개시 거리
  const far = RM10_RHO + CL_R * (RM10_PHI - CL_PHI1)
  ok(1.6 * far / RM10_DROP < 3.0,
    `방 바닥 가시 개시 ${(1.6 * far / RM10_DROP).toFixed(2)} < 3.0 — 문턱 코앞까지 와야 안이 보인다`)
}

console.log('\n— E3. ★79-5 출구 통로(1p11) —')
if (RM10_ON) {
  const AX = RM10_AX_R * Math.cos(RM10_PHI), AZ = RM10_AX_R * Math.sin(RM10_PHI)
  const g = WU('reveal'), x2 = WU('exitpass')
  const dg = Math.hypot(g.x - AX, g.z - AZ), dx = Math.hypot(x2.x - AX, x2.z - AZ)
  ok(dx > RM10_EXIT_RIN && dx < RM10_EXIT_ROUT, `exitpass 방 축에서 ${dx.toFixed(2)} ∈ 원호 띠(${RM10_EXIT_RIN.toFixed(2)}~${RM10_EXIT_ROUT.toFixed(2)})`)
  //  ★80 공개 지점 = **나팔 입**(구 직선 끝을 대체). 방 축에서 훨씬 멀고, 돔 중심에는 훨씬 가깝다.
  if (RM10_FLARE_ON) {
    const mouthAx = Math.hypot(RM10_FLARE_MX, RM10_FLARE_MZ)
    ok(Math.abs(dg - mouthAx) < 1e-6, `reveal = 나팔 입 — 방 축에서 ${dg.toFixed(2)}(파생 ${mouthAx.toFixed(2)})`)
    //  ★조준의 주체는 R 다이얼이 정한다 — R↓이면 진행 방향이, R↑이면 벽 법선이 돔 중심을 문다.
    //   현행 R=70은 그 사이. 특정 값을 박지 않고 **범위와 실측치**를 보고한다(노브 추종).
    const hx = -Math.sin(RM10_FLARE_SWEEP), hz = -Math.cos(RM10_FLARE_SWEEP)
    const dx = -RM10_AX_R - RM10_FLARE_MX, dz = -RM10_FLARE_MZ, dn = Math.hypot(dx, dz)
    const off = Math.acos(Math.max(-1, Math.min(1, (hx * dx + hz * dz) / dn))) * 180 / Math.PI
    ok(off > 0 && off < 90, `입에서 진행 방향 ↔ 돔 중심 = ${off.toFixed(0)}° (0=정조준 · 90=회랑 평행)`)
    ok(dn > TERRACE_RIN && dn < TERRACE_ROUT,
       `입의 돔 중심 반경 ${dn.toFixed(1)} ∈ 옛 테라스 링(${TERRACE_RIN}~${TERRACE_ROUT.toFixed(0)}) — 새 테라스가 받을 자리`)
  } else {
    ok(dg > RM10_EXIT_ROUT && dg <= RM10_STR_END, `reveal 방 축에서 ${dg.toFixed(2)} ∈ 직선 구간(${RM10_EXIT_ROUT.toFixed(2)}~${RM10_STR_END.toFixed(2)})`)
  }
  //  ⚠★85 정정: 이 항은 ★80(나팔) 이전에 쓰였다 — 그때는 통로가 평평해서 두 지점 y가 같았다.
  //   ★80이 12.00을 **올려** 아가리를 회랑 레벨에 놓으므로, 공개 지점 y는 아가리 바닥이어야 한다.
  //   구판은 reveal을 226.43에 묶어 두었고(12 어긋남), 그래서 스냅 레이가 아가리 바닥을 못 찾았다.
  ok(Math.abs(x2.y - RM10_EXIT_FLOOR_Y) < 1e-9,
    `출구 통로 시작 y = ${r2(RM10_EXIT_FLOOR_Y)} = 방 바깥 겹 윗면(무단차 출발)`)
  ok(RM10_FLARE_ON
      ? (Math.abs(g.y - RM10_FLARE_MY) < 1e-9 && Math.abs(g.y - x2.y - RM10_FLARE_RISE) < 1e-9)
      : Math.abs(g.y - RM10_EXIT_FLOOR_Y) < 1e-9,
    RM10_FLARE_ON
      ? `공개 지점 y = ${r2(RM10_FLARE_MY)} = 아가리 바닥 — 통로가 ${r2(RM10_FLARE_RISE)} 올라온 끝(★85 테라스와 무단차)`
      : `공개 지점 y = ${r2(RM10_EXIT_FLOOR_Y)} = 통로 바닥(구 체제)`)
  //  ★현도 요구: "나왔을 때 방향은 돔 중심부, 클라이막스를 목격하는 방향"
  const rr = Math.hypot(g.x, g.z)
  ok(dot2(fwd(g.yaw), [-g.x / rr, -g.z / rr]) > 0.99, '공개 지점 시선 = **돔 중심 향**(클라이막스 방향)')
  ok(g.pitch > 0, `공개 pitch=${g.pitch.toFixed(2)} — 정점 렌즈를 올려본다`)
  //  통로가 방 축을 반 바퀴 안쪽으로 돈다 = 나가는 길이 들어온 길과 겹치지 않는다
  const thG = Math.atan2(g.z - AZ, g.x - AX), thI = Math.atan2(x2.z - AZ, x2.x - AX)
  //  ⚠각도차는 **감싸서** 잰다 — 안 감싸면 90°가 270°로 보고된다(값 판정은 통과하므로 조용히 거짓말한다)
  const dth = Math.abs(((thG - thI) * 180 / Math.PI % 360 + 540) % 360 - 180)
  ok(dth > 30, `통로 회전 ${dth.toFixed(0)}° — 방 쪽 문과 테라스 쪽 문이 겹치지 않는다`)
}

console.log('\n— F. ★85 테라스 = 아가리를 받는 부채꼴 —')
{
  //  ★85(2026.07.29 현도 지시): 나팔 아가리 끝에 **딱 맞게** 붙는 환형 부채꼴, 리브 #0 반지름선까지.
  //   ★80이 만든 '선언된 빚'(1p12~15 집 상실 · DoD-2 미충족)의 상환. 근거·유도 = constants ★85 블록.
  if (!TERRACE_ON) {
    ok(WAYPOINTS.every((w) => w.id !== 'terrace'), '테라스 소등 중 — 웨이포인트도 함께 내려갔다(유령 좌표 금지)')
    ok(true, '⚠선언된 빚: 1p12~15는 새 테라스가 설 때까지 집이 없다(DoD-2·3 일시 미충족)')
  } else {
    const D = 180 / Math.PI
    const sp = terraceSpec(), m = sp.mouth

    // ── ① 도구 대조 — 상수 사슬(RM10_FLARE_M*)이 빌더(flareSpec)의 마지막 정거장과 같은 점인가 ──
    //  ⚠★83 `axisDistMatches` 전례와 같은 형식. 이걸 안 재면 terraceMouth()가 조용한 **사본**이 된다.
    {
      const st = flareSpec().stations.at(-1)
      const dP = Math.hypot(st.x - RM10_FLARE_MX, st.z - RM10_FLARE_MZ)
      ok(dP < 1e-9, `아가리 중심 대조: constants ↔ flareSpec 편차 ${dP.toExponential(2)} — 사본 아님`)
      ok(Math.abs(st.w - RM10_FLARE_W1) < 1e-9 && Math.abs(st.y - RM10_FLARE_MY) < 1e-9,
        `아가리 폭 ${r2(st.w)} · 바닥 ${r2(st.y)} 대조 일치`)
    }

    // ── ② "딱 맞게"가 성립하는 근거 — 두 모서리가 **같은 반경**에 선다 ──
    //  아가리가 돔 중심 정조준이라 문턱이 반경에 수직인 직선 현이고, 그래서 호 하나가 둘을 꿴다.
    //  ⚠이게 깨지면(노브가 정조준을 깨면) '딱 맞게'는 그 순간 거짓이 된다 — 여기가 그 경보다.
    const dR = Math.abs(m.cornerR[0] - m.cornerR[1])
    ok(dR < 1e-6, `아가리 두 모서리 반경 ${r2(m.cornerR[0])} ↔ ${r2(m.cornerR[1])} 편차 ${dR.toExponential(2)} < 1e-6 — 호 하나가 둘을 꿴다`)
    ok(Math.abs(TR_ROUT - m.rOut) < 1e-9, `바깥 림 ${r2(TR_ROUT)} = 모서리 반경 — 물림 TR_BITE 반영`)
    ok(sp.crescent > 0 && sp.crescent < 2.5,
      `초승달(문턱 현 ↔ 바깥 호) 가운데 깊이 ${r2(sp.crescent)} ∈ (0, 2.5) — 문턱 앞이 메워진다`)

    // ── ③ 부채꼴의 두 끝 ──
    //  ★85-2(현도): 리브 #0 선에서 끝내지 않고 **그 선을 축으로 대칭**이 될 때까지 연장.
    const wLo = TR_AZ0 + RIB_DEST_PHI, wHi = TR_AZ1 + RIB_DEST_PHI     // 월드 방위
    ok(Math.abs(wLo + wHi) < 1e-12,
      `★대칭: 월드 ${r2(wLo * D)}° ~ ${r2(wHi * D)}° — **리브 #0 반지름선(0°)이 부채꼴 정중앙**(편차 ${Math.abs(wLo + wHi).toExponential(1)})`)
    ok(Math.abs(TR_AZ1 - m.azHi) < 1e-12 && TR_AZ1 > m.azLo,
      `아가리 쪽 끝 = **먼** 모서리 로컬 ${r2(TR_AZ1 * D)}°(현도 판정 ㄱ) — 아가리 폭 40을 통째로 받는다`)
    ok(m.azLo > TR_AZ0 && m.azHi <= TR_AZ1 + 1e-12,
      `아가리 문턱 ${r2(m.azLo * D)}~${r2(m.azHi * D)}° ⊂ 부채꼴 ${r2(TR_AZ0 * D)}~${r2(TR_AZ1 * D)}°(거울 반쪽엔 개구 0)`)

    // ── ④ 레벨·두께 ──
    ok(Math.abs(TR_Y - RM10_FLARE_MY) < 1e-9 && Math.abs(TR_Y - CL_FLOOR_END) < 1e-9,
      `테라스 윗면 ${r2(TR_Y)} = 아가리 바닥 = 회랑 바닥 — **무단차 도착**(구 링 대비 +12.00)`)
    ok(TERRACE_T > 2 * PASS_T,
      `두께 ${r2(TERRACE_T)} > 바닥판 ${r2(PASS_T)}×2 — '통로 바닥의 연장'이 아니라 다른 덩어리(구 링은 두께 0)`)
    //  ⚠★85-2: 구 기준 '폭 > 8'은 폐기 — 현도가 폭을 **줄이러** 노브를 만들었다(2/3·1/2 비교 중).
    //   진짜 구속은 폭이 아니라 **아가리 앞 깊이**다: 안쪽 림이 문턱 중앙을 넘으면 문 앞이 허공이 된다.
    const depth = m.ctrR - TR_RIN
    ok(depth > 2,
      `아가리 앞 깊이 ${r2(depth)} = 문턱 중앙 ${r2(m.ctrR)} − 안쪽 림 ${r2(TR_RIN)} > 2(한 걸음) — 폭 배율 ${r2(TR_W_F)}(폭 ${r2(sp.width)})`)
    ok(TR_RIN < m.ctrR - sp.crescent,
      `안쪽 림 ${r2(TR_RIN)} < 문턱 최근접 ${r2(m.ctrR - sp.crescent)} — 폭 하한(${r2(sp.crescent)}) 위반 없음`)

    // ── ⑤ 부채꼴 안이 비어 있는가(전수 — 같은 높이에 사는 것들) ──
    ok(CL_R - CL_HW > TR_ROUT,
      `회랑 안벽 ${r2(CL_R - CL_HW)} > 테라스 외림 ${r2(TR_ROUT)} — 여유 ${r2(CL_R - CL_HW - TR_ROUT)}(같은 레벨이라 이 값이 곧 빈 폭)`)
    ok(RM10_AX_R - RM10_EXIT_ROUT > TR_ROUT,
      `등불 방·출구 통로 최근접 ${r2(RM10_AX_R - RM10_EXIT_ROUT)} > 외림 ${r2(TR_ROUT)} — 방이 테라스를 안 뚫는다`)
    {   // 나팔 통로 발자국이 부채꼴 안으로 들어오지 않는가(아가리 앞은 비어야 한다)
      let rmin = Infinity
      for (const st of flareSpec().stations) rmin = Math.min(rmin, st.axDist)
      const rminW = Math.hypot(...(() => {
        const st = flareSpec().stations.reduce((a, b) => (b.axDist < a.axDist ? b : a))
        const c = Math.cos(-RM10_PHI), sn = Math.sin(-RM10_PHI)
        return [st.x * c + st.z * sn + RM10_AX_R * Math.cos(RM10_PHI), -st.x * sn + st.z * c + RM10_AX_R * Math.sin(RM10_PHI)]
      })())
      ok(rminW >= TR_ROUT - 1e-6,
        `나팔 중심선 최소 반경 ${r2(rminW)} ≥ 외림 ${r2(TR_ROUT)} — 통로가 부채꼴 위로 안 넘어온다`)
    }

    // ── ⑥ 웨이포인트 ──
    const t = WU('terrace'), r = Math.hypot(t.x, t.z)
    const azW = Math.atan2(t.z, t.x)                     // ⚠WU()가 이미 그룹 로컬로 되돌린다(여기서 또 빼면 −10° 이중)
    ok(r > TR_RIN && r < TR_ROUT, `테라스 웨이포인트 r=${r2(r)} ∈ 띠(${r2(TR_RIN)}~${r2(TR_ROUT)})`)
    ok(azW > TR_AZ0 && azW < TR_AZ1, `방위 ${r2(azW * D)}° ∈ 부채꼴 — 아가리 정면`)
    ok(Math.abs(t.y - TR_Y) < 1e-9, `y=${r2(t.y)} = 판 윗면`)
    ok(t.pitch > 0, `pitch=${r2(t.pitch)} — 리브·렌즈를 올려봄`)

    // ── ⑦ 밑이 비어 있다 = **선언**(결정이 아니라 미룸이다 — UNASSIGNED·WALK_DEBT와 같은 형식) ──
    ok(true, `⚠뿌리 미결(§2-D ①): 이 판은 **완전 부양**이다 — 받칠 것이 없다(그 높이 껍질까지 수평 85.76 · 회랑은 동일 레벨). 현 답 = "의도된 부양 — 잠정"`)

    console.log(`     └ ★85 실측: 부채꼴 ${r2(TR_AZ0 * D)}~${r2(TR_AZ1 * D)}°(${r2(sp.span * D)}°) · r ${r2(TR_RIN)}~${r2(TR_ROUT)}(폭 ${r2(sp.width)}) · 두께 ${r2(TERRACE_T)} · 바깥호 ${r2(sp.arcOut)} · 안호 ${r2(sp.arcIn)}`)

    // ════════════════════════════════════════════════════════════════════════
    //  ★F2. ★89 테라스 계단화 (2026.07.30 현도 지시)
    // ════════════════════════════════════════════════════════════════════════
    //  ★왜: 이 형태의 값은 **하나도 자유롭지 않다**(경사조차 파생). 그래서 검사가 할 일은
    //   "예쁜가"가 아니라 **파생 사슬이 안 끊겼는가**다 — 아가리가 계단 시작을 정하고, 갓이 강하를
    //   정하고, 챌판 수가 ①·③ 각폭을 안 먹는가.
    if (!TR_STEP_ON) {
      ok(sp.stepped === false && sp.runs.length === 1,
        `★89 계단 꺼짐(TR_STEP_ON=false) — ★85 평판 부채꼴 복원(구간 1개·최저 y ${r2(sp.yLand)})`)
    } else {
      const st = sp.step, runs = sp.runs
      const M = sp.mouth

      // ── ① 구간 배분: 셋이 각각 무엇이 정한 값인가 ──
      const mouthRun = runs.find((x) => x.tag === 'mouth')
      const land = runs.find((x) => x.tag === 'landing')
      ok(Math.abs((mouthRun.az1 - mouthRun.az0) - st.azMouth) < 1e-12,
        `① 접합부 각폭 ${r2((mouthRun.az1 - mouthRun.az0) * D)}° = **아가리 각폭**(현도 "아가리 폭 그대로") — 우리가 고른 값이 아니다`)
      ok(Math.abs(mouthRun.az0 - (M.azLo)) < 1e-12,
        `계단 시작 방위 = 아가리 **낮은 모서리** 로컬 ${r2(M.azLo * D)}°(월드 ${r2((M.azLo + RIB_DEST_PHI) * D)}°) — 아가리가 정한다`)
      ok(Math.abs((land.az1 - land.az0) - st.azMouth * TR_LAND_F) < 1e-12,
        `③ 참 각폭 ${r2((land.az1 - land.az0) * D)}° = 아가리 × ${r2(TR_LAND_F)}(현도 확정 1/3) · 호 ${r2(st.rMid * (land.az1 - land.az0))}`)
      ok(Math.abs((land.az0 + land.az1) / 2 + RIB_DEST_PHI) < 1e-12,
        `참 중앙 = 월드 0° = **리브 #0 축**(★85-2 대칭축과 같은 선) — 골짜기의 최저점이 그 축에 있다`)
      ok(Math.abs((runs[runs.length - 1].az1 - runs[0].az0) - sp.span) < 1e-12,
        `구간 합 ${r2((runs[runs.length - 1].az1 - runs[0].az0) * D)}° = span ${r2(sp.span * D)}° — 빈틈·초과 0`)
      ok(runs.length === 2 * st.N + 3,
        `구간 ${runs.length}개 = 2N+3(N=${st.N} 디딤 ×2 + ①③⑤) — 챌판 ${st.N + 1}개가 ①·③ 각폭을 안 먹었다`)

      // ── ② 대칭(현도 "0도 기준 거울상") ──
      let asym = 0
      for (const a of runs) {
        const mir = runs.find((b) => Math.abs((b.az0 + RIB_DEST_PHI) + (a.az1 + RIB_DEST_PHI)) < 1e-9
                                  && Math.abs((b.az1 + RIB_DEST_PHI) + (a.az0 + RIB_DEST_PHI)) < 1e-9)
        if (!mir || Math.abs(mir.y - a.y) > 1e-9) asym++
      }
      ok(asym === 0, `전 ${runs.length}구간이 월드 0°에 대해 **거울 대칭**(방위·높이 둘 다) — 어긋난 구간 ${asym}`)

      // ── ③ 강하 = 갓 파생(사본 아님) ──
      const g = gatCap()
      const want = TR_STEP_MODE === 'lid' ? g.lidY : (TR_Y + g.lidTop) / 2
      ok(Math.abs(st.landY - want) < 1e-12 && Math.abs(sp.yLand - st.landY) < 1e-9,
        `참 y ${r2(st.landY)} = 갓 ${TR_STEP_MODE === 'lid' ? `리드 밑면 ${r2(g.lidY)}` : `리드 윗면 ${r2(g.lidTop)}과 테라스의 중간`} — gatCap() 파생(갓 노브를 돌리면 따라온다)`)
      ok(Math.abs(st.drop - (TR_Y - st.landY)) < 1e-12 && st.drop > 0,
        `강하 ${r2(st.drop)} = 테라스 ${r2(TR_Y)} − 참 ${r2(st.landY)}`)
      ok(Math.abs(st.rise * (st.N + 1) - st.drop) < 1e-9,
        `단높이 ${st.rise.toFixed(4)} × 챌판 ${st.N + 1} = 강하 ${r2(st.drop)}`)

      // ── ④ 보행: 왕복이 필연이다 ──
      //  최저점 ③에서 나가는 유일한 출입구가 ①(아가리)이므로 관람자는 **반드시 되올라온다**.
      //  ㊾ 실측: 단높이가 STEP_UP(0.8)과 같아지면 내려는 가는데 올라올 수 없다.
      ok(st.rise <= STEP_UP - 0.1,
        `단높이 ${st.rise.toFixed(4)} ≤ STEP_UP ${STEP_UP} − 0.1 (여유 ${r2(STEP_UP - st.rise)}) — **왕복 가능**(③이 막다름이므로 필수 조건)`)
      let jmax = 0
      for (let i = 1; i < runs.length; i++) jmax = Math.max(jmax, Math.abs(runs[i].y - runs[i - 1].y))
      ok(Math.abs(jmax - st.rise) < 1e-9,
        `인접 구간 단차 최대 ${jmax.toFixed(4)} = 단높이 — 이중 단차(밟을 수 없는 턱) 0`)
      ok(st.tread > 0.24, `디딤 ${r2(st.tread)}(중간 반경 호) > 0.24(무릎길 규격 하한)`)

      // ── ⑤ 밑면 어법 (현도 2026.07.30: 'saw' → 'ramp' 교체) ──
      //  ★두께는 **구간 내부에서** 잰다 — 경계에서는 걷는 면과 밑면이 서로 다른 구간을 골라 거짓값이 난다.
      let tMin = Infinity, tMax = -Infinity
      for (const rr of runs) for (const f of [0.05, 0.3, 0.5, 0.7, 0.95]) {
        const a = rr.az0 + (rr.az1 - rr.az0) * f
        const th = terraceProfileY(a) - terraceSoffitY(a)
        tMin = Math.min(tMin, th); tMax = Math.max(tMax, th)
      }
      if (sp.soffit === 'saw') {
        ok(Math.abs(tMin - TERRACE_T) < 1e-6 && Math.abs(tMax - TERRACE_T) < 1e-6,
          `밑면 = **톱니** — 두께 균일 ${r2(TERRACE_T)}(이빨 깊이 ${st.rise.toFixed(4)} = 단높이 · 판 겹침 ${r2(TERRACE_T - st.rise)})`)
      } else {
        //  ★기준선 = 노징선 − T. 세 후보 중 이것만 두께 위계를 지킨다(constants ★89):
        //   최소 = T(노징) · 최대 = T + 단높이(디딤 뒤 코너).
        ok(Math.abs(tMin - TERRACE_T) < 1e-6,
          `밑면 = **경사 매스** — 최소 두께 ${r2(tMin)} = ${r2(TERRACE_T)}(노징에서) · 기준선 = 노징선 − T`)
        //  ⚠최대는 **표본으로 재면 안 된다** — 코너는 구간의 끝점이라 내부 표본(f≤0.95)이 못 닿는다
        //   (첫 구현이 그래서 1.8966 vs 1.9174로 실패했다 · 자가 적발). 구간 끝값에서 정확히 잰다.
        const tCorner = Math.max(...runs.filter((x) => x.tag.startsWith('tread'))
          .map((x) => Math.max(x.y - x.b0, x.y - x.b1)))
        ok(Math.abs(tCorner - (TERRACE_T + st.rise)) < 1e-9 && tMax <= tCorner + 1e-9,
          `최대 두께 ${r2(tCorner)} = T + 단높이 ${r2(TERRACE_T + st.rise)}(디딤 뒤 코너 — 구간 끝값) · 내부 표본 최대 ${r2(tMax)} ≤ 그 값`)
        //  ★위계(§2-D ③): 걷는 것 < 받치는 것 < 매듭. 최소 두께가 전망 반원판보다 얇아지면 역전이다.
        //   대안 두 기준선(안쪽코너선·두 밑면을 잇는 현)은 최소 1.083으로 떨어져 이 검사에 걸린다.
        ok(tMin > LK_DISC_T,
          `최소 두께 ${r2(tMin)} > 전망 반원판 ${r2(LK_DISC_T)} — §2-D ③ 두께 위계 보존(이 부등식이 기준선을 결정했다)`)
        //  ★립 = ①(수평)과 램프가 만나는 곳의 밑면 턱. 참 쪽은 정확히 연속이어야 한다.
        const mo = runs.find((x) => x.tag === 'mouth'), t0 = runs.find((x) => x.tag === 'tread-0')
        ok(Math.abs((mo.b0 - t0.b1) - st.rise) < 1e-9,
          `아가리 쪽 **립** ${r2(mo.b0 - t0.b1)} = 단높이 — 램프 매스가 접합부 슬래브 밑으로 내려간다(기하의 귀결)`)
        const lnd = runs.find((x) => x.tag === 'landing'), tL = runs.find((x) => x.tag === `tread-${st.N - 1}`)
        ok(Math.abs(lnd.b1 - tL.b0) < 1e-9,
          `참 쪽 밑면 **연속**(Δ ${(lnd.b1 - tL.b0).toExponential(1)}) — 노징선이 참 윗면에서 끝나기 때문`)
      }

      // ── ⑥ 프로파일 ↔ 구간 목록 대조(둘 중 하나가 사본이 되는 것을 막는다) ──
      let pmis = 0
      for (const rr of runs) {
        for (const f of [0.02, 0.5, 0.98]) {
          const a = rr.az0 + (rr.az1 - rr.az0) * f
          if (Math.abs(terraceProfileY(a) - rr.y) > 1e-9) pmis++
        }
      }
      ok(pmis === 0, `terraceProfileY() ↔ terraceRuns() ${runs.length * 3}점 전수 일치 — 높이 정본이 하나다`)
      const tl = WU('terrace-land')
      ok(Math.abs(tl.y - st.landY) < 1e-9,
        `참 웨이포인트 y ${r2(tl.y)} = 참 높이 — 계단 판정용 스폰(빌더 파생)`)
      ok(Math.abs(Math.atan2(tl.z, tl.x) + RIB_DEST_PHI) < 1e-9,
        `참 웨이포인트 방위 = 월드 0°(리브 #0 축) — 골짜기 정중앙`)

      // ── ⑦ 하강이 안전한가(무엇에도 안 부딪히는가) ──
      ok(GAT_CX - (gatSeal().lidR) > TR_ROUT,
        `갓 리드 최근접 x ${r2(GAT_CX - gatSeal().lidR)} > 테라스 외림 ${r2(TR_ROUT)} — x 간극 ${r2(GAT_CX - gatSeal().lidR - TR_ROUT)}(계단이 갓 위로 안 내려앉는다)`)
      ok(CL_R - CL_HW > TR_ROUT && st.landY < CL_FLOOR_END,
        `회랑 안벽 ${r2(CL_R - CL_HW)} > 외림 ${r2(TR_ROUT)} · 참 ${r2(st.landY)} < 회랑 바닥 ${r2(CL_FLOOR_END)} — 하강은 이미 빈 공간으로 내려간다`)

      // ── ⑧ ★면 방향(2026.07.30 신설 — 현도 적발 "계단 앞쪽면이 비어있어") ──
      //  ★왜 이 절이 필요했나: watertight 검사는 **변만 센다**. 법선이 뒤집힌 면은 변 짝이 멀쩡하므로
      //   통과하는데, 렌더에서는 back-face culling으로 **통째로 사라진다**. 실제로 챌판 66장(132삼각)이
      //   그렇게 사라졌고 검사 1074항이 전부 green이었다. → 방향을 재는 검사를 사후 봉인으로 신설.
      //  ★방법: 솔리드가 닫힌 식으로 있으므로(r 대역 × 방위 대역 × [밑면, 윗면]) 삼각형 무게중심에서
      //   법선 방향으로 0.03 나간 점이 **밖**, 반대로 간 점이 **안**이어야 한다. 도구 검증 = 평판 모드
      //   (챌판이 없는 형태)에서 0이 나오는 것으로 했다.
      {
        const g = buildTerrace()
        const pos = g.attributes.position.array, nrm = g.attributes.normal.array
        const AZ0 = runs[0].az0, AZ1 = runs[runs.length - 1].az1, DD = 0.03
        const insideT = (q) => {
          const rr = Math.hypot(q[0], q[2]), az = Math.atan2(q[2], q[0])
          if (rr <= TR_RIN || rr >= TR_ROUT || az <= AZ0 || az >= AZ1) return false
          return q[1] > terraceSoffitY(az) && q[1] < terraceProfileY(az)
        }
        const ntr = pos.length / 9
        let flip = 0, amb = 0
        for (let t = 0; t < ntr; t++) {
          const V = [0, 1, 2].map((j) => [pos[(t * 3 + j) * 3], pos[(t * 3 + j) * 3 + 1], pos[(t * 3 + j) * 3 + 2]])
          const c = [0, 1, 2].map((k) => (V[0][k] + V[1][k] + V[2][k]) / 3)
          const nm = [nrm[t * 9], nrm[t * 9 + 1], nrm[t * 9 + 2]]
          const o = insideT([0, 1, 2].map((k) => c[k] + nm[k] * DD))
          const i2 = insideT([0, 1, 2].map((k) => c[k] - nm[k] * DD))
          if (o && !i2) flip++
          else if (o === i2) amb++
        }
        ok(flip === 0 && amb === 0,
          `면 방향 — 삼각형 ${ntr} 전수: 뒤집힘 ${flip} · 모호 ${amb}(0이어야 — 뒤집히면 back-face culling으로 사라진다)`)
      }

      // ════════════════════════════════════════════════════════════════════
      //  ★F3. ★90 참 → 갓 리드 연결 계단 (2026.07.30 현도 지시)
      // ════════════════════════════════════════════════════════════════════
      //  ★이 형태도 값이 거의 자유롭지 않다 — 강하는 갓·테라스가, 단높이는 테라스가, 현 위치는
      //   폭과 리드 반경이 정한다. 검사가 할 일은 그 사슬과 **도착 처리 셋**(빈틈 0 · 코플레이너 0 · 왕복)이다.
      if (!TR_LINK_ON) {
        ok(TR_STEP_MODE !== 'half' || TR_SOFFIT !== 'ramp' || !TR_STEP_ON,
          `★90 연결 꺼짐 — 'half' + 'ramp' 조합에서만 성립한다(현재 ${TR_STEP_MODE}/${TR_SOFFIT}). 참이 막다름으로 복귀`)
      } else {
        const K = terraceLinkSpec()
        // ── ① 강하 사슬: 테라스 편과 정확히 같아야 한다(참이 중간이므로) ──
        ok(Math.abs(K.drop - st.drop) < 1e-9,
          `연결 강하 ${r2(K.drop)} = 테라스 편 강하 ${r2(st.drop)} — 참이 정확히 중간이라는 사실의 귀결`)
        ok(Math.abs(K.rise - st.rise) < 1e-12,
          `단높이 ${K.rise.toFixed(4)} = 테라스와 동일(현도 확정 "테라스와 같게")`)
        ok(Math.abs(K.drop / K.rise - K.risers) < 1e-9 && K.risers === 33,
          `챌판 ${K.risers}개가 **정확히** 맞는다(${(K.drop / K.rise).toFixed(6)}) — 보정값 0 · 갓 리드가 33번째 레벨`)
        ok(K.N === K.risers - 1,
          `디딤 ${K.N} = 챌판 − 1(마지막 챌판이 리드로 내려선다 — 리드가 도착 참)`)
        // ── ② 도착 처리 셋(현도 "원판 끝에 현 형태로 빈틈 없이") ──
        const lidNear = GAT_CX - K.lidR
        ok(Math.abs(K.xEnd - (GAT_CX - Math.sqrt(K.lidR ** 2 - K.hw ** 2))) < 1e-9,
          `원단 = 리드 원의 **현** x ${r2(K.xEnd)}(양 끝 z=±${r2(K.hw)}이 원 위 접점)`)
        ok(K.xEnd > lidNear + 1e-9 && Math.abs(K.bite - (K.xEnd - lidNear)) < 1e-9,
          `**빈틈 0** — 현이 리드 최근단 ${r2(lidNear)}보다 안쪽 · 중앙 물림 ${r2(K.bite)}`)
        ok(Math.abs(K.lastTop - K.lidTop - K.rise) < 1e-9,
          `**코플레이너 0** — 마지막 디딤 ${r2(K.lastTop)} = 리드 윗면 ${r2(K.lidTop)} + 단높이. 같은 높이 면이 없다`)
        ok(K.bite <= K.lidR - Math.sqrt(K.lidR ** 2 - K.hw ** 2) + 1e-9,
          `물림 ${r2(K.bite)}이 현-호 초승달 깊이와 일치 — 리드를 넘어 들어가지 않는다`)
        // ── ③ 근단: 참 바깥 림과 같은 x에 면이 겹치지 않는다(폭 사슬 교훈) ──
        ok(Math.abs((TR_ROUT - K.x0) - TR_LINK_BITE) < 1e-9 && TR_LINK_BITE > 0,
          `근단 물림 ${r2(TR_ROUT - K.x0)} > 0 — 참 바깥 림 ${r2(TR_ROUT)}과 **코플레이너 회피**(물린 구간은 슬래브 안)`)
        // ── ④ 보행: 왕복이 필연(리드가 막다름) ──
        ok(K.rise <= STEP_UP - 0.1,
          `단높이 ${K.rise.toFixed(4)} ≤ STEP_UP ${STEP_UP} − 0.1 — 리드에서 참으로 **되올라올 수 있다**`)
        ok(K.go > 0.24, `디딤 ${r2(K.go)} > 0.24(무릎길 하한) · 경사 ${r2(K.slope * D)}°`)
        // ── ⑤ 폭 노브의 성질: 돌려도 단높이·단수는 불변 ──
        ok(K.hw > 0 && 2 * K.hw < sp.arcOut * (TR_LAND_F * st.azMouth) / sp.span + 1e-9 + 2 * K.hw,
          `폭 ${r2(2 * K.hw)} = 2×CL_HW(회랑 통행 폭 계승) · 상한 = 참 바깥 림 호 ${r2(TR_ROUT * st.azMouth * TR_LAND_F)}`)
        // ── ⑥ 통과 공간: 무엇에도 안 부딪히는가 ──
        ok(Math.atan2(K.hw, K.xEnd) < CL_PHI0,
          `원단 모서리 방위 ${r2(Math.atan2(K.hw, K.xEnd) * D)}° < 회랑 시작 ${r2(CL_PHI0 * D)}° · 높이 여유 ${r2(CL_FLOOR_END - PASS_T - K.lastTop)}`)
        ok(K.yEnd > gatCap().cutY,
          `연결 최저 ${r2(K.yEnd)} > 갓 절단면 ${r2(gatCap().cutY)} — 크라운·슬릿·양태 전부 아래를 지난다`)
        // ── ⑦ 기하 무결 + 면 방향(★89에서 놓친 축) ──
        {
          const gl = buildTerraceLink()
          const pp = gl.attributes.position.array, nn = gl.attributes.normal.array
          const ntl = pp.length / 9
          let nanC = 0
          for (const v of pp) if (!Number.isFinite(v)) nanC++
          for (const v of nn) if (!Number.isFinite(v)) nanC++
          const Qz = (v) => Math.round(v * 1e6)
          const kk = (i) => Qz(pp[i * 3]) + ',' + Qz(pp[i * 3 + 1]) + ',' + Qz(pp[i * 3 + 2])
          const em = new Map(); let dgn = 0
          for (let t = 0; t < ntl; t++) {
            const v = [t * 3, t * 3 + 1, t * 3 + 2].map(kk)
            if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) { dgn++; continue }
            for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
              const key2 = v[a] < v[b] ? v[a] + '|' + v[b] : v[b] + '|' + v[a]
              em.set(key2, (em.get(key2) || 0) + 1)
            }
          }
          const badE = [...em.values()].filter((c) => c !== 2).length
          let nUnit = 0
          for (let i = 0; i < nn.length; i += 3) if (Math.abs(Math.hypot(nn[i], nn[i + 1], nn[i + 2]) - 1) > 1e-6) nUnit++
          ok(nanC === 0 && dgn === 0 && badE === 0 && nUnit === 0,
            `연결 기하 — 삼각형 ${ntl} · NaN ${nanC} · 퇴화 ${dgn} · 2회 아닌 변 ${badE} · 비단위 법선 ${nUnit}`)
          //  면 방향(계단 축계로 되돌려 닫힌 식으로 판정)
          const ca = Math.cos(RIB_DEST_PHI), sa2 = Math.sin(RIB_DEST_PHI)
          const insideK = (q) => {
            const x = q[0] * ca - q[2] * sa2, y = q[1], z = q[0] * sa2 + q[2] * ca
            if (Math.abs(z) >= K.hw || x <= K.x0 || x >= K.xEnd) return false
            const k2 = Math.min(K.N, Math.max(1, Math.ceil((x - K.x0) / K.go)))
            const top = K.y0 - K.rise * k2
            const f2 = (x - (K.x0 + K.go * (k2 - 1))) / K.go
            return y > (top - K.t) - f2 * K.rise && y < top
          }
          let fl = 0, ab = 0
          for (let t = 0; t < ntl; t++) {
            const V = [0, 1, 2].map((j) => [pp[(t * 3 + j) * 3], pp[(t * 3 + j) * 3 + 1], pp[(t * 3 + j) * 3 + 2]])
            const c2 = [0, 1, 2].map((k3) => (V[0][k3] + V[1][k3] + V[2][k3]) / 3)
            const nm2 = [nn[t * 9], nn[t * 9 + 1], nn[t * 9 + 2]]
            const o2 = insideK([0, 1, 2].map((k3) => c2[k3] + nm2[k3] * 0.02))
            const i3 = insideK([0, 1, 2].map((k3) => c2[k3] - nm2[k3] * 0.02))
            if (o2 && !i3) fl++
            else if (o2 === i3) ab++
          }
          ok(fl === 0 && ab === 0, `연결 면 방향 — 뒤집힘 ${fl} · 모호 ${ab}(★89 챌판 사고의 사후 봉인)`)
        }
        // ── ⑧ 웨이포인트 ──
        const wl = WU('terrace-link'), wg = WU('gat-lid')
        //  ⚠WU()는 이미 그룹 로컬로 되돌린다 — 월드 0°는 로컬 −RIB_DEST_PHI다(테라스 ⑥과 같은 함정).
        const azWl = Math.atan2(wl.z, wl.x) + RIB_DEST_PHI, azWg = Math.atan2(wg.z, wg.x) + RIB_DEST_PHI
        ok(Math.abs(azWl) < 1e-9 && Math.abs(azWg) < 1e-9,
          `연결·리드 웨이포인트가 **월드 방위 0°**(리브 #0 축 = 드럼 축) 위에 있다 — 실측 ${azWl.toExponential(1)} / ${azWg.toExponential(1)}`)
        ok(Math.abs(wg.y - K.lidTop) < 1e-9 && Math.abs(Math.hypot(wg.x, wg.z) - GAT_CX) < 1e-6,
          `리드 웨이포인트 = (x ${r2(GAT_CX)}, y ${r2(K.lidTop)}) — 원판 중앙 윗면`)
        console.log(`     └ ★90 실측: 디딤 ${K.N}(챌판 ${K.risers}) · 단높이 ${K.rise.toFixed(4)} · 디딤 ${r2(K.go)} · 경사 ${r2(K.slope * D)}° · 주행 ${r2(K.run)} · 폭 ${r2(2 * K.hw)} · x ${r2(K.x0)}→${r2(K.xEnd)}`)
        console.log(`       ⚠★89가 깬 봉인: 참에서 갓 슬릿으로 홀이 보인다(창 1.2°) — 처마 6.141→10이면 막힘. §7 ★90 (c) 현도 판정.`)
      }

      console.log(`     └ ★89 실측[${st.mode}]: 경사 ${r2(st.slope * D)}° · 단높이 ${st.rise.toFixed(4)} · 디딤 ${r2(st.tread)} · N ${st.N}(챌판 ${st.N + 1}) · 강하 ${r2(st.drop)} · 참 y ${r2(st.landY)} · 주행 ${r2(st.run)} · 구간 ${runs.length}`)
      console.log(`       ⚠경사는 노브가 아니다 — 강하(갓 파생)와 주행(아가리 파생)이 둘 다 파생이라 과결정된다. 'half' 14.09° / 'lid' 29.50°(≈회랑 30°).`)
      console.log(`       ⚠뿌리는 계단화로 **더 커졌다** — 노출 밑면이 늘어난다(§7 (e)ⓐ · 톱니 어법도 현도 판정 대기).`)
    }
  }
}

console.log('\n— H. ★61 리브 갈아타기 — 횡단·자립 나선·아가리 —')
if (!RIB_XFER_ON) {
  ok(true, '★61 꺼짐 — 검사 생략(구 단일 리브 여정)')
} else {
  const dc = destCut(), fr = freeSplitRange(), ns = freeNewelSpec()
  ok(dc && dc.k === RIB_DEST_K, `목적지 절단 스펙 존재 — #+${RIB_DEST_K} yTop ${r2(dc.yTop)}`)
  {   // 횡단 — 지점이 현(#0 발치 → 목적지 발치) 위에 정확히 있는가 · 방 안인가
    const c = W('cross')
    ok(Math.abs(c.y - FR_FLOOR_Y) < 1e-9, `횡단 y=${r2(c.y)} = 방 바닥 — 걸어서 읽는 자리`)
    ok(Math.abs(c.z) < TEMPLE_HZ - 2, `횡단 z=${r2(c.z)} — 방 옆벽(±${TEMPLE_HZ}) 안`)
    //  현 위 판정: P0 = #0 발치(방 바닥 높이 축, φ=0) · P2 = 그 점의 +XPHI 회전. 선분 이탈 < 1e-6.
    let P0 = null                               // 곡선 위 y=FR_FLOOR_Y 점 탐색(rOf 파생)
    for (let i = 0; i <= 4000; i++) { const u = i / 4000 * 0.3; if (Math.abs(u * H - FR_FLOOR_Y) < 0.15) { P0 = [rOf(u), 0]; break } }
    if (P0) {
      const cph = Math.cos(XPHI), sph = Math.sin(XPHI)
      const P2 = [P0[0] * cph, P0[0] * sph]
      const dx = P2[0] - P0[0], dz = P2[1] - P0[1], L2 = dx * dx + dz * dz
      const t = ((c.x - P0[0]) * dx + (c.z - P0[1]) * dz) / L2
      const dev = Math.hypot(c.x - (P0[0] + dx * t), c.z - (P0[1] + dz * t))
      ok(t > -0.01 && t < 1.01 && dev < 0.05,
        `횡단 지점이 현 위 — t=${r2(t)}(노브 STELE7_F 추종) · 이탈 ${r2(dev)} < 0.05`)
    } else ok(false, '현 유도 실패(곡선에서 방 바닥 높이 점을 못 찾음)')
    ok(c.pitch >= 0, `횡단 pitch=${c.pitch} ≥ 0 — 비석(선 자리)을 본다`)
  }
  {   // 자립 구간 — 역회전하면 φ=0 리브 축 위. 어휘(★62-2)에 따라 상한이 갈린다.
    const f = WU('freevice')
    const yTopFree = ns ? ns.y1 : dc.yTop - FREE_MOUTH_CLR
    ok(f.y > FR_FLOOR_Y + 2 && f.y < yTopFree, `자립 중간 y=${r2(f.y)} ∈ (바닥+2, 아가리 여유 ${r2(yTopFree)})`)
    const d3 = Math.hypot(distToCenterline(f.x, f.y), f.z)
    ok(d3 < 6.5, `자립 중간 축거리 ${r2(d3)} < 6.5 — ${RIB_FREE_MODE === 'plate' ? '부양 판(헬릭스 위)' : '쐐기(축중심 부채)'}`)
  }
  {   // 아가리 — 관 안 첫 판들 · 절단면 바로 위
    const m = WU('mouth')
    const d3 = Math.hypot(distToCenterline(m.x, m.y), m.z)
    ok(d3 < SHELL_RIB_R, `아가리 지점 축거리 ${r2(d3)} < 관 반경 ${SHELL_RIB_R} — 보어 안`)
    ok(m.y > dc.yTop - 1e-9 && m.y < dc.yTop + 3, `아가리 y=${r2(m.y)} ∈ [절단면 ${r2(dc.yTop)}, +3) — 꿰고 들어간 직후`)
    ok(m.pitch > 0.5, `아가리 pitch=${m.pitch} — 보어를 올려다봄(1p8 예감)`)
  }
  {   // ★63 발코니 — 발코니 판 위에 서고, 난간 안(우물)에 안 서 있는가
    const b = WAYPOINTS.find(w => w.id === 'balcony')
    if (b) {
      const rs = openRimSpec(), c = ribCutSpec().find(v => isOpenRib(v.k) && v.k === (b.label.includes('+') ? 1 : -1))
      const rr = c ? Math.hypot(b.x - c.bx, b.z - c.bz) : 0
      ok(rs && rr > rs.rimOut && rr < rs.balOut, `발코니 지점 축거리 ${r2(rr)} ∈ (난간 ${r2(rs.rimOut)}, 판 바깥 ${r2(rs.balOut)}) — 판 위이지 우물 안이 아니다`)
      ok(Math.abs(b.y - rs.balY1) < 1e-9, `발코니 지점 y=${r2(b.y)} = 판 상면(바닥 +${BAL_STEP}) — 한 단 올라섰다`)
      ok(b.pitch < 0, `시선 pitch ${b.pitch} < 0 — 내려다본다(우물)`)
    } else ok(true, '★63 꺼짐 — 발코니 지점 없음')
  }
  {   // 순서 — 도착(frieze) → 횡단 → 자립 → 아가리 → 판넬
    const at = (id) => WAYPOINTS.findIndex(w => w.id === id)
    ok(at('frieze') < at('cross') && at('cross') < at('freevice')
      && at('freevice') < at('mouth') && at('mouth') < at('panel'),
      '★61 순서 = 방 도착 → 횡단(1p7) → 자립 나선 → 아가리 → 관내 여정 재개')
  }
}

console.log('\n— G. 여정 순서([ ] 키가 이 순서로 돈다) —')
console.log('  ' + WP_GROUPS.map(g => `${g.name}(${g.items.length})`).join('  →  '))
{
  const at = (id) => WAYPOINTS.findIndex(w => w.id === id)
  ok(at('room') < at('hub') && at('hub') < at('p1') && at('p4') < at('joint')
    && at('joint') < at('corridor') && at('corridor') < at('ribdoor') && at('ribdoor') < at('pole')
    && at('pole') < at('panel') && at('panel') < at('kneewalk') && at('kneewalk') < at('junction')
    && at('junction') < at('lookout') && at('lookout') < at('ante') && at('ante') < at('cloister')
    && at('cloister') < at('lamp')
    //  ⛔★79-2: 구 출구(door)가 꺼졌다 → 회랑 다음은 **등불 방**이고 거기서 여정이 끝난다.
    //   테라스는 아직 판 위에 있지만 걸어서 닿을 길이 없다(선언된 빚 — UNASSIGNED 1p11).
    && (ST_ON ? at('lamp') < at('door') && at('door') < at('terrace')
              : at('lamp') < at('lamproom') && at('lamproom') < at('exitpass')
                && at('exitpass') < at('reveal') && (!TERRACE_ON || at('reveal') < at('terrace'))),
    `순서 = 관람 동선(지상 → 허브 → 꽃잎4 → 통로 → 리브 → 갈림·전망 → 전실 → 회랑 → 등불 → ${ST_ON ? '문' : '등불 방 → 출구 통로 → 공개'} → 테라스)`)
}


// ════════════════════════════════════════════════════════════════════════════
//  ★W. 보행 (2026.07.29 신설 — 운용계획 v5 §8 운용규칙 2)
// ════════════════════════════════════════════════════════════════════════════
//  ★왜 이 절이 있는가: 지금까지 검증된 것은 **형태**뿐이다. 로컬 순회는 `FREE_WALK=true`
//   상태이며 이 모드는 `probe()`를 아예 부르지 않는다 — 벽을 통과하고 바닥이 없어도 안 떨어진다.
//   즉 **보행 가능성은 한 번도 시험된 적이 없다.** 전례 셋(★60 환형 허공 0.85 / ★62 링 슬롯 0.40 /
//   ★63 우물로 인한 횡단 무효)이 전부 "보기엔 멀쩡한데 밟을 수 없는" 종류였고, 그때마다 현도의
//   로컬 왕복이 비용을 냈다. P3 완주 5일 예산은 '이미 걸어봤다'를 전제로 선 값이다 — 그 전제를
//   여기서 코드가 지킨다(현도 시간 소모 0).
//
//  ★무엇을 재는가(운용규칙 2가 지정한 둘):
//    ⓐ `walkable` 태그 — W4(정적 대조)
//    ⓑ 접합부 단차 > `STEP_UP` — W2(계단계 단높이) · W3(이음매)
//
//  ★리그 모델(FirstPersonControls.probe와 동일): 발+`STEP_UP`에서 아래로 `STEP_UP+STEP_DOWN`
//   길이의 광선. 맞으면 그 y로 올라서고 안 맞으면 **이동 자체가 거부된다**(막힘). 그러므로
//     · 다음 면이 발보다 `STEP_UP`(0.8)보다 높으면 → 못 올라간다
//     · 다음 면이 발보다 `STEP_DOWN`(2.2)보다 낮으면 → 광선이 못 닿아 **막힌다**(떨어지지도 않는다)
//   두 값 전부 waypoints.js 정본을 import한다(사본 금지 — EYE 전례).
//
//  ⚠이 절이 못 잡는 것(정직하게 적어 둔다):
//   ① **수평 틈**(발 앞에 면이 아예 없는 구간). 두 면의 평면 겹침까지 재려면 씬이 필요하다.
//   ② 헤드룸·벽 충돌. ③ 조건부 태그가 런타임에 실제로 켜지는가.
//   → ①은 다음 세션 후보, ②③은 로컬 순회 몫.
console.log('\n— W. 보행 (FREE_WALK를 끄면 걸어서 완주할 수 있는가) —')
{
  const ST_UP = STEP_UP, ST_DN = STEP_DOWN
  ok(ST_UP === 0.8 && ST_DN === 2.2 && typeof FREE_WALK === 'boolean',
    `리그 정본 = waypoints.js — STEP_UP ${ST_UP} · STEP_DOWN ${ST_DN} · FREE_WALK ${FREE_WALK}` +
    `${FREE_WALK ? ' ⚠현재 켜짐: 이 절은 "끄면 걸을 수 있는가"를 재는 것이다' : ''}`)

  // ── W2. 계단계 단높이 — 전부 실제 모듈에서 유도한다(상수 재기입 금지) ──
  console.log('  · W2. 계단계 단높이 (≤ STEP_UP)')
  const TT = TREAD_THICK
  const spTop = (i) => spiralPoint((i + 0.5) / STAIR_STEPS).pos.y + TT / 2   // ★58/61 나선 한 칸 상면
  const maxGap = (ys) => {
    const s = ys.filter(Number.isFinite).slice().sort((a, b) => a - b)
    let mx = 0
    for (let i = 1; i < s.length; i++) mx = Math.max(mx, s[i] - s[i - 1])
    return mx
  }
  const wd = woldaeSpec(), dsp = descentSpec(HALL_ENTRY), inca = incaStairSpec()
  const fr = freeSplitRange()
  const rises = [
    ['방 나선(정의·공리 방)',      ROOM_STAIR_RISE],
    ['성역 단(DAIS)',              DAIS_STEP_H],
    ['월대 상승단(★54-3)',         wd.rise ? wd.rise.stepH : 0],
    ['하강로(★㊾)',                dsp.rise],
    ['잉카 계단(★㊶)',             inca.rise],
    ['리브 나선 쐐기(★58)',        maxGap(Array.from({ length: viceSplitIndex() }, (_, i) => spTop(i)))],
    ['자립 판 나선(★61·62-2)',     maxGap(Array.from({ length: fr.end - fr.start + 1 }, (_, i) => spTop(fr.start + i)))],
    ['무릎길 계단(★66)',           maxGap(kneeTreads().map(t => t.y))],
    ['★75 넓은 상승 계단',         maxGap(wideStairTreads().map(t => t.y))],
    ['갈림 하강 계단',             DESC_STEP_R],
    ['회랑 계단(★78-2)',           CL_STEP_RISE],
    ['등불 방 계단(★79)',          maxGap(rm10Steps().map(s => s.top))],
    ['★80 나팔 계단',              maxGap(stairProfile().samples.map(s => s.y))],
    ['★63 우물 발코니 한 단',      BAL_STEP],
  ]
  for (const [name, r] of rises)
    ok(r <= ST_UP + 1e-9, `${name} 단높이 ${r2(r)} ≤ ${ST_UP}`)
  //  ★계단은 위험하지 않다는 것을 수치로 남긴다 — 위험은 이음매(W3)와 태그(W4)뿐이다.
  const worst = rises.reduce((a, b) => (b[1] > a[1] ? b : a))
  ok(worst[1] <= ST_UP * 0.9,
    `최대 단높이 = ${worst[0]} ${r2(worst[1])} — 상한 ${ST_UP}의 ${Math.round(worst[1] / ST_UP * 100)}% (여유 ${r2(ST_UP / worst[1])}배)`)

  // ── W3. 이음매 단차 — 계단계가 서로 만나는 자리. 양쪽 다 실제 모듈에서 딴다 ──
  //  ⚠부호 규약: Δ = (다음 면) − (지금 면). Δ > 0 = 올라섬(≤ STEP_UP) · Δ < 0 = 내려섬(≥ −STEP_DOWN).
  console.log('  · W3. 이음매 단차 (−STEP_DOWN ≤ Δ ≤ STEP_UP)')
  const kn = floorKnotSpec(), kl0 = kneeStairSpec().landings[0], kt = kneeTreads(), wst = wideStairTreads()
  const clSeg = clFloorSegments().segs, rm10 = rm10Steps()
  const jctTop = U_KNEE_END * H + 0.1                                   // JunctionLanding 상면(JCT_PLATE_TOP과 같은 식)
  const jctDescTop = U_KNEE_END * H                                     // 하강 첫 디딤 상면 = yTop − R/2 + TT/2
  const descTreadTop = (i) => U_KNEE_END * H - (i + 0.5) * DESC_STEP_R + TT / 2
  const seams = [
    ['허브 디스크 → 방사 접합 패드',   COR_Y0 + COR_THICK / 2 + 0.02, RAD_FLOOR_Y + COR_THICK / 2],
    ['방사 접합 패드 → 월대 상면',     RAD_FLOOR_Y + COR_THICK / 2, wd.yTop],
    ['월대 상면 → 하강로 첫 판',       wd.yTop, dsp.plates[0].yTop],
    ['하강로 끝 → 잉카 진입 판',       dsp.plates[dsp.plates.length - 1].yTop, inca.panel.yTop],
    ['잉카 진입 판 → 잉카 첫 단',      inca.panel.yTop, inca.steps[0].yTop],
    ['★잉카 정상 → 리브 문 첫 디딤판', inca.top, spTop(0)],
    ['나선 마지막 쐐기 → ★62 착지판',  spTop(viceSplitIndex() - 1), kn.yTop],
    ['★62 착지판 → 프리즈 방 바닥',    kn.yTop, FR_FLOOR_Y],
    ['프리즈 방 바닥 → ★63 발코니',    FR_FLOOR_Y, FR_FLOOR_Y + BAL_STEP],
    ['프리즈 방 바닥 → 자립 판 첫 칸', FR_FLOOR_Y, spTop(fr.start)],
    ['자립 판 끝 → 아가리 위 첫 판',   spTop(fr.end), spTop(fr.end + 1)],
    ['나선 마지막 칸 → 무릎길 첫 참',  spTop(STAIR_STEPS - 1), kl0.y + TT / 2],
    ['무릎길 첫 참 → 첫 디딤',         kl0.y + TT / 2, kt[0].y + TT / 2],
    ['무릎길 마지막 디딤 → 갈림 판',   kt[kt.length - 1].y + TT / 2, jctTop],
    ['갈림 판 → ★75 첫 디딤',          jctTop, wst[0].y],
    ['★75 마지막 디딤 → 전망 반원판',  wst[wst.length - 1].y, U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY],
    ['갈림 판 → 하강 첫 디딤',         jctTop, descTreadTop(0)],
    ['하강 마지막 디딤 → 전실 바닥',   descTreadTop(DESC_STEPS - 1), PASS_FLOOR_Y],
    ['전실 바닥 → 회랑 첫 조각',       PASS_FLOOR_Y, clSeg[0].y],
    ['회랑 끝 → 등불 방 착지 링',      clSeg[clSeg.length - 1].y, RM10_LAND_Y],
    ['등불 방 착지 링 → 계단 첫 단',   RM10_LAND_Y, rm10[0].top],
    ['등불 방 계단 끝 → 방 바닥',      rm10[rm10.length - 1].top, RM10_FLOOR_Y],
    ['등불 방 바닥 → 출구 통로 바닥',  RM10_FLOOR_Y, RM10_EXIT_FLOOR_Y],
    ['★80 나팔 계단 끝 → 도착 레벨',   stairProfile().samples[stairProfile().samples.length - 1].y, CL_FLOOR_END],
  ]
  //  ★선언된 보행 빚(UNASSIGNED와 같은 형식) — **고치는 것은 조형 결정이라 현도 몫이다.**
  //   숨기면 잊는다: 여기 적힌 이음매는 빨강으로 안 만들되, 선언과 실제가 어긋나면 즉시 실패한다.
  //   ⚠비면 DoD-2(걸어서 완주)가 이 절에 관한 한 충족이다. 채워져 있으면 그만큼 못 걷는다.
  //  ── 현재 1건 (2026.07.29 W절 신설이 처음 잰 것) ──
  //   잉카 계단 정상 `INCA_TOP_Y` 77 ↔ 리브 문 안 첫 쐐기 상면 74.28 = **−2.72**(STEP_DOWN 2.2 초과).
  //   ★㊶-6에서 정상을 110→77로 내리면서 "우연히 구 RIB_Y 74 근방 복귀"라고 적혔지만(constants 주석),
  //   문 안쪽 첫 디딤판과의 차는 아무도 잰 적이 없다. 결과: 문 앞에서 광선이 못 닿아 **이동이 거부된다**
  //   (떨어지지도 않는다 — 그냥 못 들어간다). 노브 하나(INCA_TOP_Y)로 오가지만, 정상 높이는
  //   아치 웨브·프리즈 여유·실루엣이 걸린 조형 값이라 Claude가 정하지 않는다.
  const WALK_DEBT = ['★잉카 정상 → 리브 문 첫 디딤판']
  let worstSeam = null
  const broken = []
  for (const [name, a, b] of seams) {
    const d = b - a
    if (!worstSeam || Math.abs(d) > Math.abs(worstSeam[1])) worstSeam = [name, d]
    const bad = !(d <= ST_UP + 1e-6 && d >= -ST_DN - 1e-6)
    if (bad) broken.push(name)
    const why = d > ST_UP ? ` ⛔ 올라설 수 없다(STEP_UP ${ST_UP})`
      : d < -ST_DN ? ` ⛔ 광선이 못 닿는다(STEP_DOWN ${ST_DN}) = 이동 거부` : ''
    ok(bad ? WALK_DEBT.includes(name) : true,
      `${name}: ${r2(a)} → ${r2(b)} Δ ${d >= 0 ? '+' : ''}${r2(d)}${why}${bad ? ' — ⚠선언된 보행 빚(현도 결정 대기)' : ''}`)
  }
  ok(broken.join('|') === WALK_DEBT.join('|'),
    broken.length === 0 ? `이음매 ${seams.length}곳 전부 통행 가능 — DoD-2 이 절에 관한 한 충족`
      : `막힌 이음매 ${broken.length}곳 = 선언과 일치(${broken.join(' · ')}) — ⚠DoD-2 미충족`)
  ok(true, `이음매 ${seams.length}곳 검사 · 최대 |Δ| = ${worstSeam[0]} ${r2(worstSeam[1])}`)

  // ── W4. walkable 태그 — 선언 대장 ──
  //  ⚠이 절만 기하가 아니라 **소스 텍스트**를 읽는다. 이유: `walkable`은 JSX의 `userData`에만 있고
  //   Node에서 씬을 세우지 않는 한 기하로는 못 잰다. 그래서 '무엇이 밟는 면인가'를 판정하지 않고,
  //   **부재 수와 태그 수를 동결**한다 — 새 메시가 생기면 여기서 깨지고, 그때 '밟는 면인가'를
  //   한 번 결정하게 만든다. (구 상태: "태그 누락 59곳 미확인" = 아무도 세어 본 적이 없었다.)
  console.log('  · W4. walkable 태그 선언 대장 (JSX 정적 대조)')
  {
    const dir = new URL('.', import.meta.url).pathname
    const scanTags = (src) => {
      const out = []
      const re = /<(mesh|instancedMesh)\b/g
      let m
      while ((m = re.exec(src))) {
        let i = m.index + m[0].length, depth = 0, end = -1
        while (i < src.length) {                       // 여는 태그의 끝 '>' — 중괄호 깊이 0에서만(=> 화살표 오인 방지)
          const c = src[i]
          if (c === '{') depth++
          else if (c === '}') depth--
          else if (c === '>' && depth === 0) { end = i; break }
          i++
        }
        if (end < 0) break
        const tag = src.slice(m.index, end + 1)
        const cls = !/walkable/.test(tag) ? 'none'
          : /\?/.test(tag) ? 'cond'
          : /walkable\s*:\s*true/.test(tag) ? 'true' : 'false'
        out.push({ line: src.slice(0, m.index).split('\n').length, cls })
        re.lastIndex = end
      }
      return out
    }
    //  ★선언 대장 — [파일, 총 메시, walkable:true, 조건부, walkable:false]
    //   ⚠깨지면 "새 메시가 생겼다"는 뜻이다. 밟는 면이면 태그를 달고, 아니면 여기 수를 고친다.
    //   조건부 4(Dome: ring 헬퍼 walk 인자) · false 6(기둥·난간·격자 등 명시 비-바닥)은 의도된 것.
    const LEDGER = [
      ['Corridor.jsx',      36, 17, 0, 4],   // ★94-c 중앙 기둥 · ★95 반십각 기둥 · ★96 헌치 · ★98 서쪽 빗면(전부 walkable:false)
      ['Dome.jsx',          72, 21, 4, 6],   // ★87 +1 = MirrorPads · ★90 +1 = 리드 연결 계단 · ★93 +1 = 하판 고리판(전부 walkable)
      ['GraphScaffold.jsx',  1,  0, 0, 0],
      ['Lens.jsx',           1,  0, 0, 0],
      ['Radial.jsx',        12,  5, 0, 0],   // ★91 +1 = 원기둥 받침(밟는 면 아님 — 매달린 관벽)
      ['RadialEvents.jsx',   6,  1, 0, 0],
      ['Room.jsx',          28, 12, 0, 8],   // ★111(08.04) +1 = 공리 볼트(문) 7기(false — 아치 안 밟는 면은 코일이 담당) · ★107(08.03) +3 = 나선 매스(walkable) + ②기둥·①보(false) · ★101(08.02) +5 = 판 고리·각뿔대 입술·바닥 슬래브·기단 고리 분기 + 빗면(false) · ★102 +3 = 감실 바닥·ⓑ계단(walkable) + 감실 천장/옆/뒤(false) · ★103 +2 = 슬롯 바닥(walkable) + 슬롯 옆·뒷벽(false) · ★104 +1 = 꺾인 상승 계단(walkable)
      ['Steles.jsx',         5,  0, 0, 0],
    ]
    let sumAll = 0, sumWalk = 0
    for (const [f, nAll, nT, nC, nF] of LEDGER) {
      const r = scanTags(fs.readFileSync(dir + f, 'utf8'))
      const c = { true: 0, false: 0, cond: 0, none: 0 }
      for (const x of r) c[x.cls]++
      sumAll += r.length; sumWalk += c.true + c.cond
      ok(r.length === nAll && c.true === nT && c.cond === nC && c.false === nF,
        `${f.padEnd(18)} 메시 ${r.length}/${nAll} · walkable true ${c.true}/${nT} 조건부 ${c.cond}/${nC} false ${c.false}/${nF} · 무선언 ${c.none}`)
    }
    //  ⚠합계는 대장의 **합**에서 유도한다 — 손으로 박으면 파일별 수와 어긋나도 안 걸린다(실제로 한 번 어긋났다).
    const WANT_ALL = LEDGER.reduce((a, r) => a + r[1], 0)
    const WANT_WALK = LEDGER.reduce((a, r) => a + r[2] + r[3], 0)
    const WANT_FALSE = LEDGER.reduce((a, r) => a + r[4], 0)
    ok(sumAll === WANT_ALL && sumWalk === WANT_WALK,
      `합계 메시 ${sumAll}/${WANT_ALL} 중 밟는 면 ${sumWalk}/${WANT_WALK} · 무선언 ${sumAll - sumWalk - WANT_FALSE} = 벽·지붕·챌판·기둥`)   // ★87 +1 임시 판 · ★90 +1 리드 연결 계단 · ★91 +1 원기둥 받침 · ★92 +2 드럼 하판 · ★93 +1 고리판 · ★101 +5 정의 각뿔대 · ★102 +3 감실 · ★103 +2 모서리 슬롯 · ★104 +1 슬롯 계단
    //  ★챌판(riser)은 밟는 면이 아니다 — 회랑·등불 방 계단의 '밟는 면'은 ring 헬퍼(조건부 태그)가 낸다.
    //   이 한 줄이 W4가 "무선언 = 버그"로 읽히는 것을 막는다(무선언 대부분은 정상이다).
  }

  // ── W5. 수평 틈 — 발 앞에 '면이 아예 없는' 구간 (★84 신설 2026.07.29) ──
  //  ⚠W3은 **높이만** 잰다. ★82가 정직하게 적어둔 '못 잡는 것 ①'이 이것이다:
  //   두 면이 높이로는 이어지는데 평면에서 어긋나면, 아래로 쏘는 광선이 아무것도 못 맞고
  //   **이동이 거부된다**(떨어지지도 않는다). ★60 환형 허공 0.85 · ★62 링 슬롯 0.40 ·
  //   ★63 우물 전례가 전부 이 계열 = "보기엔 멀쩡한데 밟을 수 없다".
  //  ★부호 규약: 진행 = −x. gap = (A의 가장 작은 x) − (B의 가장 큰 x).
  //   **gap > 0 이면 그 사이에 밟을 면이 없다.** 음수 = 겹침(정상).
  //  ⚠구현 중 이 도구가 한 번 틀렸다(2026.07.29): 전실 바닥이 `RM_X1`에서 시작한다고 봤으나
  //   채널 슬랩이 `PASS_X_CHEEK`까지 나가 있어 허위 틈 +0.081이 나왔다. 발자국은 **렌더가 실제로
  //   그리는 범위**로 잰다 — 벽 좌표가 아니라. (진단 도구를 먼저 검증하라는 규율의 실사례.)
  console.log('  · W5. 수평 틈 (진행 −x · gap > 0 = 발 앞에 면 없음)')
  {
    const KJ = junctionKnotSpec(), WT5 = wideStairTreads(), KT5 = kneeTreads(), KS5 = kneeStairSpec()
    const seams5 = []
    //  B가 여러 조각(쪼개진 디딤판)이면, 진입이 가장 이른 조각들 중 A와 측면이 가장 많이 겹치는 것을 쓴다
    //  — 걸을 수 있는 띠가 하나라도 있으면 통행은 성립한다.
    //  ★2026.07.29 dir: 진행 방향. -1 = −x(도착 서쪽 · 기존 7곳) · +1 = +x(하부 여정 도착).
    //   -1: A끝 = A최소x, B시작 = B최대x, gap = A끝 − B시작.  +1: A끝 = A최대x, B시작 = B최소x, gap = B시작 − A끝.
    //   gap > 0 = 진행 방향으로 발 앞에 면 없음(부호는 dir로 이미 정규화 — 아래 검증 루프는 dir 무관).
    const addAx = (name, aEndX, aZ0, aZ1, pieces, dir = -1) => {
      let bx = dir < 0 ? -Infinity : Infinity, bo = -Infinity
      for (const p of pieces) {
        const nearer = dir < 0 ? (p.x > bx + 1e-9) : (p.x < bx - 1e-9)
        if (nearer) { bx = p.x; bo = Math.min(aZ1, p.z1) - Math.max(aZ0, p.z0) }
        else if (Math.abs(p.x - bx) <= 1e-9) bo = Math.max(bo, Math.min(aZ1, p.z1) - Math.max(aZ0, p.z0))
      }
      seams5.push({ name, gap: dir < 0 ? aEndX - bx : bx - aEndX, ov: bo, aEndX, bStartX: bx, dir })
    }

    const tL5 = KT5[KT5.length - 1]
    addAx('무릎길 마지막 디딤 → 갈림 판', tL5.x - tL5.d / 2, -tL5.w / 2, tL5.w / 2,
      [{ x: KJ.x1, z0: KJ.z0, z1: KJ.z1 }])

    const L5 = KS5.landings[0], t05 = KT5[0]
    addAx('무릎길 첫 참 → 첫 디딤', L5.x0, L5.z0, L5.z1,
      [{ x: t05.x + t05.d / 2, z0: -t05.w / 2, z1: t05.w / 2 }])

    const wMaxX = Math.max(...WT5.map((t) => t.x + t.d / 2))
    addAx('갈림 판 → ★75 첫 디딤', KJ.x0, KJ.z0, KJ.z1,
      WT5.filter((t) => t.x + t.d / 2 > wMaxX - 0.3)
         .map((t) => ({ x: t.x + t.d / 2, z0: (t.z ?? 0) - t.w / 2, z1: (t.z ?? 0) + t.w / 2 })))

    const wL5 = WT5[WT5.length - 1]
    addAx('★75 마지막 디딤 → 전망 반원판', wL5.x - wL5.d / 2, (wL5.z ?? 0) - wL5.w / 2, (wL5.z ?? 0) + wL5.w / 2,
      [{ x: WSTAIR_X1, z0: -LK_PLAT_R, z1: LK_PLAT_R }])

    addAx('갈림 판 → 하강 첫 디딤', KJ.x0, KJ.z0, KJ.z1,
      [{ x: X_DESC0 + DESC_TREAD_D / 2, z0: JCT_DN_Z - PASS_HW, z1: JCT_DN_Z + PASS_HW }])

    //  ★도착 면 = 방 바닥 + 채널 슬랩이 이어진 한 면(슬랩이 PASS_X_CHEEK까지 나간다)
    const yT5 = U_KNEE_END * H
    const yL5 = yT5 - (DESC_STEPS - 1 + 0.5) * DESC_STEP_R
    const xL5 = X_DESC0 - (yT5 - yL5) / DESC_SLOPE
    addAx('하강 마지막 디딤 → 전실 슬랩', xL5 - DESC_TREAD_D / 2, JCT_DN_Z - PASS_HW, JCT_DN_Z + PASS_HW,
      [{ x: PASS_X_CHEEK, z0: JCT_DN_Z - PASS_HW - PASS_T, z1: JCT_DN_Z + PASS_HW + PASS_T }])

    //  ── ★2026.07.29 하부 여정(도착 = **+x** 진행) — 기존 7곳과 부호가 반대다(dir=+1) ──
    //   실측(2026.07.29): 월대 x≤137 · 하강로 x124→206.61(하강) · 잉카 판 206.61→226.81 · 첫 단 x0 226.61.
    //   진행이 +x라 addAx(dir=+1)로 잰다. W3가 같은 이음매의 **높이**를 이미 재므로 여기선 **평면 틈**만 본다.
    const WD5 = woldaeSpec(), DSP5 = descentSpec(HALL_ENTRY), INCA5 = incaStairSpec()
    const wdMaxX = Math.max(...WD5.contour.map((p) => p.x)), wdZ = Math.max(...WD5.contour.map((p) => Math.abs(p.z)))
    const dscMinX = Math.min(...DSP5.samples.map((s) => s.x)), dscMaxX = Math.max(...DSP5.samples.map((s) => s.x))
    //  월대 → 하강로: 하강로 첫 판이 월대 위에서 출발(onWoldae)이라 크게 겹친다 — 큰 음수 gap이 정상
    addAx('월대 → 하강로', wdMaxX, -wdZ, wdZ,
      [{ x: dscMinX, z0: -DESC_HW, z1: DESC_HW }], +1)
    //  하강로 → 다음 면: 하강로 서단(최대 x) → **판 서단 또는 넥서스 서변**(★94 min 파생과 같은 값).
    //   ⚠'fan'에선 부채가 판보다 서쪽까지 뻗어 하강로가 부채 위에 착지한다 — 밟는 면이 판이 아니라 부채다.
    { const nWest = incaNexusWestX()
      const onFan = nWest < INCA5.panel.x0 - 1e-9
      const zHalf = onFan ? Math.max(...incaBladesSpec().nexus.map((q) => Math.abs(q.z))) : INCA5.panel.w / 2
      addAx(onFan ? '하강로 → 넥서스 부채' : '하강로 → 잉카 판', dscMaxX, -DESC_HW, DESC_HW,
        [{ x: onFan ? nWest : INCA5.panel.x0, z0: -zHalf, z1: zHalf }], +1) }
    //  ★★94-b 'plate'에선 판이 **넥서스 서변**에서 끝나고 그다음 밟는 면이 **부채**다(판 → 부채 → 첫 단).
    //   구 체제에선 판이 절단면까지 가므로 판 → 첫 단이 맞다. 사슬이 체제로 갈린다.
    { const nx = incaBladesSpec()
      const nexHalf = Math.max(...nx.nexus.map((q) => Math.abs(q.z)))
      if (INCA_CENTER_MODE === 'plate') {
        addAx('잉카 판 → 넥서스 부채', INCA5.panel.x1, -INCA5.panel.w1 / 2, INCA5.panel.w1 / 2,
          [{ x: nx.ncx, z0: -nexHalf, z1: nexHalf }], +1)
        //  ★부채 동단 = 가운데 변의 현(z=0에서 밟는 면이 끝나는 x) — 절단면보다 물림만큼 동쪽이다.
        const eastX = nx.ncx + nx.rimR * Math.cos((nx.bnd[3] - nx.bnd[2]) / 2)
        addAx('넥서스 부채 → 잉카 첫 단', eastX, -nexHalf, nexHalf,
          [{ x: INCA5.steps[0].x0, z0: -INCA_W0 / 2, z1: INCA_W0 / 2 }], +1)
      } else {
        addAx('잉카 판 → 잉카 첫 단', INCA5.panel.x1, -INCA5.panel.w / 2, INCA5.panel.w / 2,
          [{ x: INCA5.steps[0].x0, z0: -INCA_W0 / 2, z1: INCA_W0 / 2 }], +1)
      } }

    for (const s5 of seams5)
      ok(s5.gap <= 1e-6 && s5.ov > 0,
        `${s5.name}: A끝 x${r2(s5.aEndX)} · B시작 x${r2(s5.bStartX)} → 겹침 ${r2(-s5.gap)} · 측면 ${r2(s5.ov)}` +
        (s5.gap > 1e-6 ? ` ⛔ 발 앞에 면 없음(틈 ${r2(s5.gap)})` : ''))

    //  ★가장 얇은 겹침을 소리 내어 남긴다 — 노브 하나면 음수로 뒤집혀 허공이 된다.
    //  ⚠상부(dir<0)만 본다: 디딤판은 독립 배치라 겹침 여유가 안전의 척도다. 하부(+x)의 하강로↔잉카 판은
    //   panel.x0가 하강로 끝 x와 **같은 값으로 접합 설계**돼 겹침 0(경계 일치)이 정상 — 여유가 아니라 커플링.
    const thin5 = seams5.filter((s) => s.dir < 0).reduce((a, b) => (b.gap > a.gap ? b : a))
    ok(thin5.gap <= -0.01,
      `가장 얇은 겹침(상부) = ${thin5.name} ${r2(-thin5.gap)} — 0 이하면 허공이 생긴다`)

    //  ── 포함형: 나선 마지막 칸이 무릎길 첫 참의 평면 안에 드는가 ──
    {
      const p5 = spiralPoint((STAIR_STEPS - 1 + 0.5) / STAIR_STEPS).pos
      const mx5 = Math.min(p5.x - L5.x0, L5.x1 - p5.x), mz5 = Math.min(p5.z - L5.z0, L5.z1 - p5.z)
      ok(mx5 > 0 && mz5 > 0,
        `나선 마지막 칸 (x${r2(p5.x)} z${r2(p5.z)}) ⊂ 무릎길 첫 참 — 여유 x ${r2(mx5)} · z ${r2(mz5)}`)
    }

    //  ── 도착 '면'의 존재 — ★80 아가리 → ★85 테라스 ──
    //  ⚠W3의 마지막 항은 나팔 계단 끝을 **레벨**(CL_FLOOR_END)과 비교한다. 레벨은 면이 아니다.
    //   ★84가 이 자리에 '면이 없다'를 선언으로 박아 두었고, ★85가 그 선언을 **실측으로 교체**한다.
    //  ★재는 법: 문턱은 반경에 수직인 직선 현이므로 현 위 표본 u에서 r = √(rc² + u²)이고,
    //   테라스 윗면은 r ≤ TR_ROUT를 덮는다 ⇒ **겹침 = TR_ROUT − r**. 방위는 부채꼴 안이어야 한다.
    if (!TERRACE_ON) {
      ok(false, '⛔아가리 앞에 면이 없다 — 테라스 소등(선언된 빚 · DoD-2 미충족)')
    } else {
      const sp5 = terraceSpec(), m5 = sp5.mouth, hw5 = m5.w / 2
      let minAll = Infinity, minMid = Infinity, azBad = 0
      for (let i = 0; i <= 40; i++) {
        const u = -hw5 + 2 * hw5 * i / 40
        const rr = Math.hypot(m5.ctrR, u)              // 현 위 표본의 반경
        const ov = TR_ROUT - rr
        minAll = Math.min(minAll, ov)
        if (Math.abs(u) <= hw5 - 4) minMid = Math.min(minMid, ov)
        //  방위: 현 위 표본을 극좌표로 — 중심 방위에서 ±atan(u/rc)
        const az = m5.ctrAz + Math.atan2(u, m5.ctrR)
        if (!(az > TR_AZ0 - 1e-9 && az < TR_AZ1 + 1e-9)) azBad++
      }
      ok(minAll >= -1e-9 && azBad === 0,
        `아가리 문턱 41점 → 테라스 윗면: 겹침 최소 ${r2(minAll)}(양 끝 = 기하 필연 0) · 중앙 ±16에서 ${r2(minMid)} · 방위 이탈 ${azBad}점`)
      ok(minMid > 0.3,
        `걷는 선(중앙 32 폭)의 최소 겹침 ${r2(minMid)} > 0.3 — 발 앞에 면이 있다`)
      ok(Math.abs(TR_Y - m5.y) < 1e-9,
        `문턱 y ${r2(m5.y)} = 테라스 윗면 ${r2(TR_Y)} — 단차 0(W3의 '레벨' 비교가 이제 '면' 비교로 닫힌다)`)
    }

    //  ── 아직 못 잰 이음매 = 선언한다(UNASSIGNED·WALK_DEBT와 같은 형식) ──
    //  ⚠극좌표/수직 구간은 진행이 방위각·연직이라 이 절의 축평행(±x) 발자국으로 못 딴다. 규약 일반화가
    //   필요하고(B급·중 초과), 숨기면 "다 쟀다"로 읽힌다. ★2026.07.29 하부 여정 3곳(월대→하강로·하강로→
    //   잉카 판·잉카 판→첫 단)은 +x dir로 실측해 여기서 뺐다 — 상부 7 + 하부 3 = 10곳을 W5가 실제로 잰다.
    const GAP_UNMEASURED = [
      '허브 디스크 → 방사 패드', '방사 패드 → 월대',   // 방사 부품(Radial) 좌표계 — render_views 근사 밖과 같은 뿌리
      '잉카 정상 → 리브 문',                            // **연직 단차**(−2.72) — W3 보행 빚으로 이미 선언(평면 틈 아님)
      '나선 → ★62 착지판', '★62 착지판 → 프리즈 바닥',  // 극좌표(방위각 진행)
      '프리즈 바닥 → ★63 발코니', '프리즈 바닥 → 자립 판', '자립 판 → 아가리', '전실 → 회랑',
      '회랑 → 등불 방', '등불 방 계단 → 바닥', '등불 방 → 출구 통로', '나선 끝 → 무릎길(포함형으로 대체)',
      '★80 나팔 내부 참',
    ]
    ok(GAP_UNMEASURED.length === 14,
      `수평 틈 **미측정** 이음매 ${GAP_UNMEASURED.length}곳 선언 — W5가 실제로 잰 것은 상부 7 + 하부 3 = 10곳(W3 이음매 24곳 중)`)
  }
}


// ════════ Y절 ★99 좌표 교환 포맷 — HUD가 뱉는 것을 렌더 도구가 그대로 먹는가 (2026.08.01) ════════
//  왜 검사가 필요한가: 이 포맷의 존재 이유가 **단위 사고 봉인**이다(free:는 도, waypoints는 라디안).
//  2026.08.01 Claude가 라디안을 free:에 넣어 정면만 찍힌 렌더를 보고 "도구 고장"으로 오진했다.
//  형식이 조용히 어긋나면 그 사고가 그대로 재발하므로, 왕복을 상시 검증한다.
{
  console.log('\n— Y. 좌표 교환 포맷(★99) —')

  //  ① 왕복 항등: 임의 포즈를 format → parse 하면 원값이 돌아온다(반올림 오차 안).
  const POSES = [
    { x: 124.53, y: 102.9, z: 0, yaw: Math.PI, pitch: -0.4363 },
    { x: -87.2, y: 38.22, z: 60.31, yaw: -2.1, pitch: 0.9 },
    { x: 204, y: 640, z: 0, yaw: 0, pitch: -1.3 },
    { x: 331.7, y: 248.5, z: -12.04, yaw: 1.5708, pitch: 0 },
  ]
  let worstP = 0, worstA = 0
  for (const p of POSES) {
    const back = parseFree(formatFree(p))
    if (!back) { ok(false, `왕복 파싱 실패: ${formatFree(p)}`); continue }
    worstP = Math.max(worstP, Math.abs(back.x - p.x), Math.abs(back.y - p.y), Math.abs(back.z - p.z))
    worstA = Math.max(worstA, Math.abs(back.yaw - p.yaw), Math.abs(back.pitch - p.pitch))
  }
  ok(worstP <= 0.005, `왕복 위치 오차 최대 ${r2(worstP)} ≤ 0.005 (소수 2자리 = 5mm — 84m 드럼에서 무의미)`)
  ok(worstA <= 0.001, `왕복 각도 오차 최대 ${r2(worstA)} rad ≤ 0.001 (소수 1자리 도 = 0.05° 반올림)`)

  //  ② ★단위 봉인: parseFree는 **도**를 받아 **라디안**을 낸다. 이게 뒤집히면 렌더가 정면만 찍는다.
  const q = parseFree('free:0,0,0,180,-45')
  ok(q && Math.abs(q.yaw - Math.PI) < 1e-9, `parseFree: yaw 180(도) → ${q ? r2(q.yaw) : 'null'} rad (= π)`)
  ok(q && Math.abs(q.pitch + Math.PI / 4) < 1e-9, `parseFree: pitch −45(도) → ${q ? r2(q.pitch) : 'null'} rad (= −π/4)`)
  ok(formatFree({ x: 0, y: 0, z: 0, yaw: Math.PI, pitch: 0 }).includes('180'),
    'formatFree: yaw π(라디안) → 문자열에 180(도)이 찍힌다 — 경계가 뒤집히면 여기서 운다')

  //  ③ ribs 꼬리(원거리 조감용)가 살아 있는가 — 붙여도 숫자 파싱이 안 밀린다.
  const rb = parseFree('free:10,20,30,90,-10,ribs')
  ok(rb && rb.ribs === true && rb.x === 10 && rb.z === 30, 'ribs 꼬리 인식 + 숫자 자리 안 밀림')
  ok(parseFree('free:10,20,30')?.ribs === false, 'yaw·pitch 생략 시 0 기본 · ribs false')

  //  ④ 쓰레기 입력은 null(호출부가 사용법을 찍고 멈춘다 — 조용한 NaN 렌더 방지).
  for (const bad of ['free:', 'free:1,2', 'free:a,b,c', 'wp:1,2,3', 'free:1,2,3,4,5,6'])
    ok(parseFree(bad) === null, `쓰레기 입력 거부: '${bad}'`)

  //  ⑤ render_views가 **정말로** 이 파서를 쓰는가(사본 부활 방지 — 소스 문자열 검사).
  const rv = fs.readFileSync(new URL('./render_views.mjs', import.meta.url), 'utf8')
  ok(rv.includes("from './poseFormat.js'"), 'render_views.mjs가 poseFormat을 임포트한다')
  ok(rv.includes('parseFree(id)'), 'render_views.mjs가 parseFree를 호출한다(인라인 파싱 복귀 아님)')
  ok(!/const \[fx, fy, fz, fyaw, fpit\]/.test(rv), '구 인라인 파싱 잔재 없음')

  //  ⑥ HUD 배선 — 프로브(Canvas 안)와 패널(Canvas 밖)이 둘 다 마운트돼 있는가.
  const app = fs.readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  ok(app.includes('<PoseProbe />'), 'App.jsx에 <PoseProbe /> 마운트(Canvas 안 — 카메라 실값 공급원)')
  ok(app.includes('<CoordHud />'), 'App.jsx에 <CoordHud /> 마운트(Canvas 밖 — DOM 패널)')
  const hud = fs.readFileSync(new URL('./CoordHud.jsx', import.meta.url), 'utf8')
  ok(/PoseProbe[\s\S]*useFrame/.test(hud), 'PoseProbe가 useFrame으로 매 프레임 갱신')
  ok(!/useState/.test(hud), '⚠HUD에 useState 없음 — 60fps 리렌더가 씬을 느리게 만들면 도구가 작품을 해친다')
  ok(hud.includes('DEV_TELEPORT'), '배포 스위치 DEV_TELEPORT로 통째 차단(텔레포트 패널과 같은 한 줄)')

  //  ★108 조형 검토 모드 — ⚠**개발 도구다.** P3 출구 전에 'off'로 되돌려야 한다
  //   (`DEV_TELEPORT`·`SPAWN='room'`과 같은 묶음). 여기서 **매 실행 소리를 낸다** — 조용히 배포되면
  //   심사자가 점토 렌더를 보게 된다. ⛔실패로 박지 않는 이유: 지금(P1′)은 켜져 있어야 정상이다.
  const surv = fs.readFileSync(new URL('./Survey.jsx', import.meta.url), 'utf8')
  ok(surv.includes('scene.overrideMaterial = null'),
    'Survey.jsx가 해제 시 overrideMaterial·fog·background를 원상 복귀 — 조명 정본 무손상')
  ok(!surv.includes('castShadow={true}') && !surv.includes('castShadow ') ,
    '검토 조명에 그림자 없음 — 그림자는 조형이 아니라 조명의 산물(P2 몫)')
  ok(app.includes('<SurveyRig mode={survey} />') && app.includes("survey === 'off' &&"),
    'App.jsx: 검토 모드가 켜지면 실제 대기·조명이 물러난다(정본 값은 그 자리에 남는다)')
  ok(true, SURVEY_START === 'off'
    ? "★108 SURVEY_START='off' — 배포 상태(정본 조명)"
    : `⚠★108 SURVEY_START='${SURVEY_START}' — **조형 검토 모드가 켜져 있다.** P1′ 조형 판정용. P3 출구 전 'off' 필수`)

  //  ⑦ 웨이포인트 줄이 실제 WAYPOINTS 항목 모양과 같은 필드를 낸다(붙여 넣으면 바로 동작).
  const wline = formatWaypoint({ x: 1.5, y: 2.5, z: 3.5, yaw: 1.2345, pitch: -0.5 }, 'probe', '테스트')
  for (const k of ['id:', 'group:', 'label:', 'x:', 'y:', 'z:', 'yaw:', 'pitch:'])
    ok(wline.includes(k), `웨이포인트 줄에 '${k}' 필드 존재`)
  ok(/yaw: 1\.2345/.test(wline), '웨이포인트 줄은 **라디안 원값** 보존(free:와 반대 — 저장 형식이 다름)')

  //  ⑧ 사람이 읽는 줄 — 발밑 y가 눈높이와 구분돼 찍힌다(두 값을 혼동한 전례가 많다).
  const hline = formatHuman({ x: 124.5, y: 102.9, z: 0, yaw: 0, pitch: 0 }, 101.3)
  ok(hline.includes('102.9') && hline.includes('101.3'), `HUD 줄에 눈높이·발밑이 둘 다: "${hline}"`)
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
