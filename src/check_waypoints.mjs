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
  H, R_BASE, SHELL_RIB_R, STAIR_R, RIB_Y,
  rOf, U_SPIRAL_END, U_KNEE_END, U_LOOKOUT_END,
  X_LAND_LO, X_LAND_HI, LK_PLAT_R, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_LIFT,
  CL_R, CL_HW, CL_PHI0, CL_PHI1, ST_PHI, PASS_FLOOR_Y, PASS_X_END, RM_X0, RM_X1,
  TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
  COR_Y0, COR_THICK, PLAT_X, PLAT_R, BOX_HW, RAD_FLOOR_Y,
  ROOM_DISC_HOLE, ROOM_LAND_R, ROOM_DISC_SLOT_LEN,
  RAD_ANG0, RAD_R, RAD_JX,
  P_FLOOR_TOP, P_FLOOR_R, P_ST_X, petalR,
} from './constants.js'
import { p1HeightAt } from './radialEventsGeometry.js'
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
  ok(Math.hypot(c.x - PLAT_X, c.z) < PLAT_R - 1, `플랫폼 중심에서 ${Math.hypot(c.x - PLAT_X, c.z).toFixed(1)} < 반경 ${PLAT_R}`)
  ok(Math.abs(c.y - (COR_Y0 + COR_THICK / 2)) < 1e-9, `플랫폼 y=${c.y.toFixed(2)} = 판 윗면`)
  ok(dot2(fwd(c.yaw), [1, 0]) > 0.99, '플랫폼 시선 = +x(리브 문 쪽)')
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
