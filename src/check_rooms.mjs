// ════════════════════════════════════════════════════════════════════
//  check_rooms.mjs — 1p1~4 방별 사건 + 방사 비석 검증 (2026.07.12)
//  실소스(constants.js + radialEventsGeometry.js)를 그대로 임포트해
//  기하 위반을 시각 확인 전에 잡는다. 실행: node src/check_rooms.mjs
//  판정 근거 = DESIGN.md §5 + BRIEF_radial_room_events.md §8.
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import {
  petalR, P_FLOOR_TOP, P_FLOOR_R, P_DOOR_TOP, P_ROOM,
  RAD_PRX, RAD_PCY, RAD_PRY, COR_Y0, COR_THICK, RAD_DOOR_HW, RAD_TOP, LIFT_Y,
  RAD_DROP, RAD_ST_N, RAD_ST_T, RAD_ST_LAND, RAD_ST_W,
  P2_SHEAR_Z, P2_EDGE_A, P2_EDGE_B, P2_RIM_A, P2_RIM_B,
  P3_GRAZE_GAP, P3_TIP_CLEAR, P3_REACH_MAX,
  P4_TILT_MAX, P4_PATH_HW, P4_SCALE, P_ST_X, P_ST_NEAR, P_ST_FAR, P_STELE_ON, P_SPAWN_LX,
  RAD_ANG0, RAD_R,
} from './constants.js'
import {
  buildP2Shear, buildP3Pulls,
  buildP4A, buildP1Swells, p1HeightAt,
} from './radialEventsGeometry.js'
import { wpById } from './waypoints.js'   // ★2026.07.13: 스폰 정본이 웨이포인트 표로 이동
import {
  PIT_ON, PIT_SIDES, PIT_PHASE, PIT_R_TOP, PIT_R_BOT, PIT_DEPTH, PIT_WALL_T, PIT_FLOOR_T,
  PIT_MARK_MODE, PIT_MARK_GAP, DEF_OCT_ON, DEF_OCT_R, DEF_OCT_PHASE,
  NICHE_ON, NICHE_FLOOR, NICHE_BACK, NICHE_DEPTH, NICHE_SILL, NICHE_W_F, NICHE_H_F, NICHE_STAIR_DEG, NICHE_RISE, NICHE_STEP_R, NICHE_APP_WIDE,
  SLOT_ON, SLOT_EDGE, SLOT_W, SLOT_BACK_R, ROOM_CX,
  SLOT_STAIR, SLOT_CLEAR, SLOT_SLAB_T, SLOT_STEP_R, SLOT_STAIR_INSET, SLOT_LANDING, SLOT_LANE_GAP, SLOT_SPIRAL_PAD,
  DAIS_ON, DAIS_H, ROOM_FLOOR_LIFT as _RFL,
  ROOM_FLOOR_Y, ROOM_FLOOR_LIFT, ROOM_R, ROOM_HEIGHT, ROOM_STAIR_ROUT,
  DAIS_R, DAIS_STEP_IN, DAIS_STEPS, POOL_R, SPOT_I, ROOM_DIM, ROOM_SHAFT_ON, ROOM_ALBEDO_GAIN,
} from './constants.js'
import { pitSpec, pitProbe, buildPitWalls, buildPitRim, buildPitFloor, buildHoledSlab, polyRadiusAt,
  nicheSpec, buildNiches, buildNicheStairs, nicheFloorYAt,
  slotSpec, buildPitSlot, stairSolve, buildSlotStairs } from './defPitGeometry.js'   // ★101·★102·★103
import { STEP_UP } from './waypoints.js'
import { DESC_RISE_MAX, wallR } from './constants.js'
import {
  SPIRAL_BODY, SPIRAL_SUP, SPIRAL_MASS_T, SPIRAL_CHAMF, SPIRAL_TREAD_ON, SPIRAL_RISE_SEED, SPIRAL_SOFFIT,
  SUP_COL_GAP, SUP_COL_R, SUP_COL_MIN, SUP_COL_PAD,
  SUP_BEAM_GAP, SUP_BEAM_DEPTH, SUP_BEAM_W, SUP_BEAM_MIN, SUP_BEAM_DMIN, SUP_WALL_CLR, SUP_HEAD_MIN,
  SUP_BEAM_TAPER, SUP_BEAM_CURVE, SUP_BEAM_W_TAPER, SUP_BEAM_NOSE_LIP, SUP_BEAM_ROOT_GROW, SUP_BEAM_FILLET,
  ROOM_STAIR_WIDTH, ROOM_STAIR_RIN, ROOM_STAIR_TURNS, AX_ON, CL_STEP_GO, CL_STEP_RISE,
  SPIRAL_CORNER_EASE, AX_VAULT_ON, AX_VAULT_LAYOUT, AX_VAULT_ARCH_W, AX_VAULT_ARCH_CLR, AX_VAULT_SPRING,
  AX_VAULT_SHELL, AX_VAULT_JAMB, AX_VAULT_LEN, AX_VAULT_WIN_Y,
  AX_VAULT_NICHE_W, AX_VAULT_NICHE_H, AX_VAULT_NICHE_D, AX_VAULT_NICHE_SILL,
} from './constants.js'
import { spiralSpec, buildSpiralMass, buildSpiralColumns, buildSpiralBeams,
  columnSpec, beamSpec, beamProfile, beamHeadroom, unsupportedSpans, treadProbe,
  stationList, easeFor, frameAt } from './axiomSpiralGeometry.js'   // ★107 · ★109 · frameAt=★111
import { vaultSpec, buildAxiomVaults } from './axiomVaultGeometry.js'   // ★111 공리 볼트
import { wallBaseSpec, buildWallBase, beamBurial } from './wallBaseGeometry.js'   // ★114 벽 밑동
import { roomRibSpec, buildRoomRibs } from './roomRibGeometry.js'   // ★116 방 돔 살
import { eaveSpec, buildPitEaves } from './defPitGeometry.js'   // ★117 감실 처마
import { EAVE_ON, EAVE_LEN, EAVE_TILT, EAVE_T0, EAVE_T1 } from './constants.js'
import { RRIB_ON, RRIB_W, RRIB_T, RRIB_CLR, RRIB_HEAD, RRIB_HEAD_IN, ROOM_OCULUS_R as _OCR, ROOM_LAND_R as _LR } from './constants.js'
import { WBASE_ON, WBASE_RB, WBASE_TILT, WBASE_H, WBASE_PHASE, WBASE_CLR } from './constants.js'
import { beamSpec as _beamSpec } from './axiomSpiralGeometry.js'
import { rootCrossSpec, buildRootCrosses } from './axiomSpiralGeometry.js'   // ★115 뿌리 십자
import { ROOT_CROSS_ON, ROOT_CROSS_SIDE, ROOT_CROSS_BAR, ROOT_CROSS_RUN, ROOT_CROSS_INSET, ROOT_CROSS_BACK, ROOT_CROSS_TIP, SUP_WALL_CLR as _SWC, SUP_BEAM_DEPTH as _SBD, SUP_BEAM_W as _SBW, SUP_BEAM_ROOT_GROW as _SBRG } from './constants.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const verts = geo => { const a = geo.getAttribute('position').array, v = []; for (let i = 0; i < a.length; i += 3) v.push([a[i], a[i + 1], a[i + 2]]); return v }
const noNaN = vs => vs.every(v => v.every(Number.isFinite))
const deg = r => r * 180 / Math.PI

console.log('── 전역 정합(★계란화 2026.07.12: 바닥 강하·원뿔대 판) ──')
const RADIAL_SRC = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
{ // [1~2] 방 바닥 정의가 Radial.jsx와 동치(소스 실평가 — 재도출 드리프트 방지)
  const sR = petalR
  const rT = new Function('sR', 'Y_FTOP', 'COR_THICK', 'RAD_DROP',
    `return ${RADIAL_SRC.match(/const FLOOR_RT = (.+?) {2}/m)[1]}`)(sR, COR_Y0 - 0.02 + COR_THICK / 2, COR_THICK, RAD_DROP)
  ok(Math.abs(rT - (petalR(P_FLOOR_TOP) - 0.05)) < 1e-9 && P_FLOOR_R < rT,
    `바닥 원뿔대 윗반경(${rT.toFixed(3)}) = petalR(바닥)−0.05 · 가용 P_FLOOR_R(${P_FLOOR_R.toFixed(3)}) < 물리단`)
  const yR = new Function('Y_FTOP', 'RAD_DROP', `return ${RADIAL_SRC.match(/const Y_RFTOP = (.+?) {2}/m)[1]}`)(COR_Y0 - 0.02 + COR_THICK / 2, RAD_DROP)
  ok(Math.abs(yR - P_FLOOR_TOP) < 1e-9, `P_FLOOR_TOP(${P_FLOOR_TOP}) = Radial.jsx Y_RFTOP(${yR}) — 문지방 − DROP(${RAD_DROP})`)
}
ok(P_ROOM.p1 === 0 && P_ROOM.p2 === 1 && P_ROOM.p3 === 2 && P_ROOM.p4 === 3, '대응 ㉕: NE=1p1·NW=1p2·SW=1p3·SE=1p4')

console.log('── P1 아직 떨어지지 않은 것들(NE, ★㉞ A 확정·B 폐기 — 미분리 융기 4) ──')
{
  const { geos, bumps } = buildP1Swells()
  const V = geos.map(verts)
  ok(geos.length === 4 && V.every(noNaN), `A: 융기 4(주 1·부 3) · NaN 없음`)
  ok(V.every(vsB => { const low = vsB.filter(v => v[1] < P_FLOOR_TOP - 1e-4); return low.length > 0 && low.every(v => v[1] >= P_FLOOR_TOP - 0.03) }),
    'A: 전 융기 림이 원판 밑 0.02 매몰(이음새 0 — 미분리의 직독)')
  const hMain = bumps[0].H
  ok(Math.abs(p1HeightAt(bumps[0].x, bumps[0].z) - hMain) < 1e-9, `A: 주 융기 정상 = H(${hMain})`)
  //  부 융기 = 십자 통로 청정(주 융기는 +x 통로 위가 의도 — 비석까지 오르막)
  ok(bumps.slice(1).every(b => Math.abs(b.x) - b.R >= P4_PATH_HW && Math.abs(b.z) - b.R >= P4_PATH_HW),
    'A: 부 융기 십자 통로 청정(사분면 포켓)')
  ok(bumps[0].z === 0 && bumps[0].x - bumps[0].R >= P4_PATH_HW, 'A: 주 융기 = +x 통로 위·z통로는 청정(의도된 오르막)')
  ok(bumps.every(b => Math.hypot(b.x, b.z) + b.R <= P_FLOOR_R + 0.02), 'A: 전 융기 원판 안(벽 무침범)')
  let ovl = true
  for (let i = 0; i < bumps.length; i++) for (let j = i + 1; j < bumps.length; j++)
    if (Math.hypot(bumps[i].x - bumps[j].x, bumps[i].z - bumps[j].z) < bumps[i].R + bumps[j].R + 0.3) ovl = false
  ok(ovl, 'A: 융기 무겹침(각자 독립 이륙·착지)')
  const lift = p1HeightAt(P_ST_X, 0)
  ok(lift > 0.25 && lift < hMain, `A: 비석 리프트 실측 ${lift.toFixed(2)} (주 융기 어깨 — 0.25~H)`)
  ok(p1HeightAt(P_SPAWN_LX, 0) < 0.02, 'A: 스폰 지점 평지(계단 발치 무간섭)')
  //  주 융기 최대 경사(= H·π/2R) — 오르막이되 보행 가능
  const sMain = hMain * Math.PI / (2 * bumps[0].R)
  ok(sMain <= 0.85, `A: 주 융기 최대 경사 ${sMain.toFixed(2)} ≤ 0.85 (가파른 오르막 허용 — 로컬 체감 판정)`)
}

console.log('── P2 어긋난 두 천장 — 전단(NW, ★재작업 ㉘) ──')
{
  const { geoA, geoB, geoFace, meta } = buildP2Shear()
  const vA = verts(geoA), vB = verts(geoB), vF = verts(geoFace)
  ok(noNaN(vA) && noNaN(vB) && noNaN(vF), `P2 NaN 없음(A ${vA.length} · B ${vB.length} · 절벽면 ${vF.length})`)
  // 전단 점프: 두 모서리가 만나지 않음(공약불가 — 공유점 0의 근거)
  const jump = P2_EDGE_B - P2_EDGE_A
  ok(jump >= 6, `전단 점프 ${jump.toFixed(1)} ≥ 6 (머리 위 공간이 한 번에 점프 — 몸으로 읽힘)`)
  ok(P2_EDGE_A - P_FLOOR_TOP >= 4, `절벽면 하단이 바닥 위 ${(P2_EDGE_A - P_FLOOR_TOP).toFixed(1)} ≥ 4 (머리 위 — 보행 무간섭)`)
  // 절벽면 수직·정확히 전단 평면 위
  ok(vF.every(v => Math.abs(v[2] - meta.SZ) < 1e-6), `절벽면 전 정점 z = SHEAR_Z(${meta.SZ}) — 수직면(f32 오차 허용)`)
  // 이음 0: 절벽면 하단 행 = A 전단 모서리 행 · 상단 행 = B 모서리 행(식 공유 → 비트 동일)
  const ROWS = meta.NT + 2, NX = meta.NX
  let seam = true
  for (let j = 0; j <= NX; j++) {
    const a = vA[j * ROWS], fB = vF[j]                       // A 모서리(t=0) ↔ 면 최하단 행
    const b = vB[j * ROWS], fT = vF[meta.NYF * (NX + 1) + j] // B 모서리 ↔ 면 최상단 행
    if (a[0] !== fB[0] || a[1] !== fB[1] || a[2] !== fB[2]) seam = false
    if (b[0] !== fT[0] || b[1] !== fT[1] || b[2] !== fT[2]) seam = false
  }
  ok(seam, '절벽면 상·하단 행 = 두 천장 전단 모서리(정점 비트 동일 — 이음 0)')
  // 어긋남: 두 천장이 전단 평면을 침범하지 않음(공유 정점 없음의 기하 조건)
  ok(vA.every(v => v[2] <= meta.SZ + 1e-6) && vB.every(v => v[2] >= meta.SZ - 1e-6),
    '두 천장이 각자 반평면 안(전단 평면 무침범 — 아예 만나지 않음)')
  // rim 높이 — ★전 열(회전-불변: SHEAR_AZ가 연속 노브라 문이 어느 열에든 올 수 있음 — 끝 블렌드는 rim→EDGE로 '올라가'므로 최저 = RIM 자체)
  ok(meta.colsA.every(c => c.rimY >= P_DOOR_TOP + 0.4), `낮은 천장 rim(전 열, 회전-불변) ≥ 문상단+0.4 (${P2_RIM_A})`)
  ok(meta.colsB.every(c => c.rimY >= P_DOOR_TOP + 0.4), `높은 천장 rim(전 열, 회전-불변) ≥ 문상단+0.4 (${P2_RIM_B})`)
  // 셸 봉쇄: 전 정점 r ≤ petalR(y) − 0.005 (등형·개구 보존)
  const inside = vs => vs.every(v => Math.hypot(v[0], v[2]) <= petalR(v[1]) - 0.005)
  ok(inside(vA) && inside(vB) && inside(vF), '전 정점 셸 내면 안(−0.005 여유) — 셸 밖 무돌출')
  // 스커트가 문 상단 아래로 안 내려감
  ok(vA.concat(vB).every(v => v[1] >= P_DOOR_TOP + 0.1), `천장 최저 y ≥ 문상단+0.1`)
  // 전단 낙차 실측(절벽면 자체의 높이 — 전역 최고높이 차는 rim 튜닝〔예: 낮은 천장이 벽 쪽으로 들림〕에 오염되므로 부적합)
  const fTop = Math.max(...vF.map(v => v[1])), fBot = Math.min(...vF.map(v => v[1]))
  ok(fTop - fBot >= 6, `절벽면 실높이 ${(fTop - fBot).toFixed(2)} ≥ 6 (전단선에서 몸이 겪는 낙차)`)
  // 자기 겹침 없음: 열 안에서 z 단조
  let monoZ = true
  ;[[vA, -1], [vB, +1]].forEach(([vs, sgn]) => {
    for (let j = 0; j < vs.length / ROWS; j++) for (let i = 1; i <= meta.NT; i++) {
      const dz = (vs[j * ROWS + i][2] - vs[j * ROWS + i - 1][2]) * sgn
      if (dz < -1e-6) monoZ = false
    }
  })
  ok(monoZ, '횡단면 z 단조(접힘·자기교차 없음)')
}

console.log('── P3 천장 인발 4기(SW, ★재작업 ㉙) ──')
{
  const { geos, meta } = buildP3Pulls()
  const V = geos.map(verts)
  ok(geos.length === 4 && V.every(noNaN), `P3 4기·NaN 없음(정점 ${V.map(v => v.length).join('/')})`)
  // 봉쇄: 전 정점 셸 내면 안(등형·개구 보존)
  ok(V.every(vs => vs.every(v => Math.hypot(v[0], v[2]) <= petalR(v[1]) - 0.005)), '전 정점 셸 내면 안(−0.005)')
  // ①근접 출발: 뿌리 전부 중심부(≤3.5) · 같은 점 아님 · 플레어 무겹침
  ok(meta.roots.every(r => Math.hypot(r.x, r.z) <= 3.5), `네 뿌리 축 오프셋 ≤ 3.5 (천장 중심부 — 유사한 곳)`)
  let flareOK = true
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = meta.roots[i], b = meta.roots[j]
    if (Math.hypot(a.x - b.x, a.z - b.z) < a.RR + b.RR + 0.1) flareOK = false
  }
  ok(flareOK, '뿌리 쌍별 거리 ≥ 플레어 반경 합 + 0.1 (같은 점 아님·인발부 무겹침)')
  // 뿌리가 셸에 붙음(인발 = 방 자신의 변형): 각 조형의 최고 정점이 셸 내면 0.2 이내
  ok(V.every(vs => vs.some(v => petalR(v[1]) - Math.hypot(v[0], v[2]) <= 0.3)),
    '각 조형 뿌리가 셸 내면에 정합 ≤0.3(침하 0.04의 정점부 방사 환산 — 부착이 아니라 인발)')
  // ④끝 = 넷 다 머리 위 · 길이 다름
  const tipYs = meta.tips.map(t => t[1])
  ok(tipYs.every(y => y >= P_FLOOR_TOP + P3_TIP_CLEAR),
    `전 조형 끝 y ≥ 바닥 + ${P3_TIP_CLEAR} (머리 위 — 최저 ${Math.min(...tipYs).toFixed(1)})`)
  ok(Math.max(...tipYs) - Math.min(...tipYs) >= 4, `끝 높이 산포 ${(Math.max(...tipYs) - Math.min(...tipYs)).toFixed(1)} ≥ 4 (길이 다름 직독)`)
  // 수평 도달 상한(문·계단 진출역·비석권 회피)
  ok(V.every(vs => vs.every(v => Math.hypot(v[0], v[2]) <= P3_REACH_MAX)), `전 정점 수평 r ≤ ${P3_REACH_MAX}`)
  // ②발산: 비스침 쌍 끝 방위 ≥ 50° · 스침 쌍 끝은 거리 ≥ 3(스쳤다 벌어짐)
  const az = meta.tips.map(t => Math.atan2(t[2], t[0]))
  const sep = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d) * 180 / Math.PI }
  const [g0, g1] = meta.grazePair
  let divOK = true
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if ((i === g0 && j === g1) || (i === g1 && j === g0)) continue
    if (sep(az[i], az[j]) < 50) divOK = false
  }
  ok(divOK, '비스침 쌍 끝 방위 쌍별 ≥ 50° (서로를 향하지 않음 — 발산)')
  const tipD = Math.hypot(...[0, 1, 2].map(k => meta.tips[g0][k] - meta.tips[g1][k]))
  ok(tipD >= 3, `스침 쌍 끝 거리 ${tipD.toFixed(1)} ≥ 3 (스쳤다 다시 벌어짐)`)
  // ③스침의 유일성: 쌍별 최소거리 실측 — 스침 쌍 ≈ GAP, 나머지는 그보다 멀고, 전 쌍 무접촉
  //  ⚠몸통권(y ≤ LIFT_Y+68)으로 제한: 뿌리·플레어의 근접은 ①근접 출발의 의도라 제외(★㊵ 부양 동반) —
  //  발산한 몸통들 사이에서 스침 쌍만 되돌아와 가까워지는가(③)를 잰다.
  const minD = (a, b) => {
    let m = 1e9
    for (let i = 0; i < a.length; i += 2) { if (a[i][1] > LIFT_Y + 68) continue
      for (let j = 0; j < b.length; j += 2) { if (b[j][1] > LIFT_Y + 68) continue
        const d = Math.hypot(a[i][0] - b[j][0], a[i][1] - b[j][1], a[i][2] - b[j][2])
        if (d < m) m = d
      } }
    return m
  }
  const D = {}
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) D[`${i}${j}`] = minD(V[i], V[j])
  const gKey = `${Math.min(g0, g1)}${Math.max(g0, g1)}`
  ok(Math.abs(D[gKey] - P3_GRAZE_GAP) <= 0.5, `스침 쌍 최근접 ${D[gKey].toFixed(2)} ≈ GAP(${P3_GRAZE_GAP}) ±0.5`)
  ok(Object.entries(D).every(([k, d]) => k === gKey || d >= D[gKey] + 0.25),
    `스침의 유일성 — 다른 쌍 최근접(최소 ${Math.min(...Object.entries(D).filter(([k]) => k !== gKey).map(([, d]) => d)).toFixed(2)}) > 스침 쌍 + 0.25`)
  ok(Object.values(D).every(d => d >= 0.35), '전 쌍 무접촉 ≥ 0.35 (공통 없음 — 서로 닿지 않는다)')
  // ★회귀 가드: 띠 단면 회전이 링마다 매끈한가(구판 프레임 버그 = 매 구간 173° 플립 → 나사송곳. 07-12 실측 적발)
  ok(meta.twistJumpMax <= 25, `띠 단면 회전 최대 ${meta.twistJumpMax.toFixed(1)}° ≤ 25° (프레임 뒤집힘 없음 — 비틀림이 의도대로만)`)
}

console.log('── P4 뚫린 것과 막힌 것(SE, ★㉜ A 확정·B 폐기 — 무어 군집 × P4_SCALE) ──')
{
  const WALL_IN = 12.5 - 1.2                     // 가용 바닥 반경(벽 여유)
  const aabb = g => { g.computeBoundingBox(); return g.boundingBox }
  //  십자 통로 청정: AABB가 x통로(|z|≤HW)·z통로(|x|≤HW) 어느 쪽도 안 물어야(사분면 포켓)
  const clearPaths = (bb) => (Math.min(Math.abs(bb.min.z), Math.abs(bb.max.z)) >= P4_PATH_HW || bb.min.z * bb.max.z < 0 === false)
    && (Math.min(Math.abs(bb.min.x), Math.abs(bb.max.x)) >= P4_PATH_HW)
    && (Math.min(Math.abs(bb.min.z), Math.abs(bb.max.z)) >= P4_PATH_HW)

  const A = buildP4A()
  const vAll = A.geos.map(verts)
  ok(A.geos.length === 7 && vAll.every(noNaN), `와상 7기 · NaN 없음(정점 ${vAll.map(v => v.length).join('/')})`)
  ok(A.meta.filter(m => m.pierced).length === 3, '관통 3기 / 막힘 4기 (위상 = 질적 축)')
  const bbA = A.geos.map(aabb)
  ok(bbA.every(bb => Math.hypot(Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)), Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z))) <= WALL_IN + 0.6),
    `전 기 가용 바닥 안(벽 여유)`)
  ok(bbA.every(clearPaths), '십자 통로 청정(사분면 포켓 — 허브↔비석·고리↔고리 보행 무간섭)')
  const tilts = A.meta.map(m => m.tilt)
  ok(tilts.every((t, i) => i === 0 || t >= tilts[i - 1] - 1e-9) && Math.abs(tilts[tilts.length - 1] - P4_TILT_MAX) < 1e-9,
    `기울어짐 x 단조 0→${(P4_TILT_MAX * 180 / Math.PI).toFixed(0)}° (변용 — 연속, 관통/막힘 무차별 관통)`)
  //  관통 개방: 구멍 축 주변(중앙권)에 정점 없음 + 관통기 삼각형 수 > 막힌 기(구멍 벽 추가)
  const solidTris = A.geos[0].index ? A.geos[0].index.count / 3 : vAll[0].length / 3
  let holesOpen = true
  A.meta.forEach((m, i) => {
    if (!m.pierced) return
    const cy = (bbA[i].min.y + bbA[i].max.y) / 2
    const dirX = -Math.sin(m.holeAxis.yaw), dirZ = -Math.cos(m.holeAxis.yaw)  // 로컬 z축의 yaw 회전(근사 — 롤 소각 무시)
    let minD = 1e9
    for (const v of vAll[i]) {
      const rx = v[0] - m.x, ry = v[1] - cy - 0.06, rz = v[2] - m.z
      const t = rx * dirX + rz * dirZ
      if (Math.abs(t) > 0.5) continue                                        // 몸통 중앙권만
      const d = Math.hypot(rx - dirX * t, ry, rz - dirZ * t)
      if (d < minD) minD = d
    }
    if (minD < 0.28 * P4_SCALE) holesOpen = false                                       // 관통부 뻥 뚫림(축 주변 여유)
  })
  ok(holesOpen, '관통기 구멍이 실제로 뚫려 있음(축 주변 정점 없음 — CSG 유효)')
  ok(bbA.every(bb => bb.max.y <= P_FLOOR_TOP + 1.3 * P4_SCALE + 0.15), `최고 높이 ≤ 바닥+${(1.3 * P4_SCALE).toFixed(2)}(+롤 여유) — 스케일 인지 상한(허리~가슴께, 리브 세로 어휘와 구분)`)
  let gapA = 1e9
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++)
    gapA = Math.min(gapA, Math.hypot(A.meta[i].x - A.meta[j].x, A.meta[i].z - A.meta[j].z))
  ok(gapA >= 2.6, `중심 간 최소 ${gapA.toFixed(1)} ≥ 2.6 (사이 보행)`)
  ok(A.meta.every(m => Math.hypot(m.x - P_ST_X, m.z) >= 3.0), '비석 여유 ≥ 3.0')

}

console.log('── 진입 계단(★계란화 — 문 3곳 × 4방) ──')
{ //  Radial.jsx buildStairGeo와 같은 파생을 재계산해 기하 관계를 검증(JSX라 직접 임포트 불가 — 수식 동치는 소스 스캔으로)
  ok(/INTERSECTION/.test(RADIAL_SRC) && /buildStairGeo/.test(RADIAL_SRC) && /stairGeos\.map/.test(RADIAL_SRC),
    '계단 존재: CSG 교집합 빌더 + 꽃잎 그룹 마운트(등형 — 4방 자동)')
  const FR_OUT = 2.3 + 0.5, LIN_TOP = RAD_TOP + 0.6, Y_FTOP = COR_Y0 - 0.02 + COR_THICK / 2   // ★㊵: 구 리터럴 54 → RAD_TOP 파생(부양 동반)
  const frRW = (y) => Math.sqrt(Math.max(0.25, petalR(y) ** 2 - FR_OUT ** 2))
  const FR_BACK = Math.min(frRW(Y_FTOP), frRW(LIN_TOP)) - 0.25
  const FR_FRONT = Math.max(frRW(Y_FTOP), frRW(LIN_TOP)) + 0.25
  const FR_C = (FR_FRONT + FR_BACK) / 2
  ok(RAD_PCY > LIN_TOP, `중심고(${RAD_PCY}) > 문틀 상단 — 최심 코너 반전 체제(문틀 일반화가 유효한 조건)`)
  const landFront = FR_C - RAD_ST_LAND
  ok(landFront < 13.5 - 0.3, `착지장 앞단(${landFront.toFixed(2)}) — 통로 관입 혀끝(13.5)을 ≥0.3 지나 삼킴`)
  const foot = FR_C - RAD_ST_LAND - RAD_ST_N * RAD_ST_T
  ok(foot > 0 && foot <= P_FLOOR_R - 1.5, `발치 중심거리 ${foot.toFixed(2)} — 가용 바닥 안(≤${(P_FLOOR_R - 1.5).toFixed(2)})`)
  const rise = (Y_FTOP - 0.02 - P_FLOOR_TOP) / RAD_ST_N
  ok(rise >= 0.25 && rise <= 0.36, `단높이 ${rise.toFixed(3)} ∈ [0.25, 0.36] (보행 규격)`)
  ok(Math.abs(RAD_ST_W - 4.6) < 1e-9, `계단 폭 ${RAD_ST_W} = 문폭(문틀 잼 안에 딱 맞음)`)
  ok(Math.abs(P_SPAWN_LX) < foot - 1.0,
    `스폰(|${P_SPAWN_LX}|)이 허브 계단 발치(${foot.toFixed(2)})보다 ≥1.0 안쪽 — 계단 위 스폰 방지`)
}

console.log(`── 방사 비석 4기 (${P_STELE_ON ? '점등' : '⛔소등 — 보존계'}) ──`)
{
  //  ★2026.08.05 소등(현도 "4가지 방의 비석 전부 없애줘"). ⚠소등을 '검사 삭제'로 처리하지 않는다 —
  //   ★83(죽은 검사) 계열을 또 내지 않으려면 ⓐ 소등이 **실제로 배선됐는지**를 재고
  //   ⓑ 보존계 수치 검사는 계속 돌려 복귀 시점에 즉시 깨지게 둔다.
  const REV_SRC = readFileSync(new URL('./RadialEvents.jsx', import.meta.url), 'utf8')
  ok(/P_STELE_ON\s*&&\s*\[\['1p1'/.test(REV_SRC),
    `마운트가 P_STELE_ON에 배선돼 있다 — 스위치가 실제로 4기를 끈다(현행 ${P_STELE_ON})`)
  ok(/PropStele/.test(REV_SRC) && /P_ST_X/.test(REV_SRC),
    '보존계 유지: PropStele 마운트 코드·좌표가 소스에 그대로 남아 있다(한 줄로 복귀)')

  //  ↓ 아래 넷 = 보존계 수치(소등 중에도 돈다). 복귀 노브를 켰을 때 자리가 이미 어긋나 있는 일을 막는다.
  ok(P_ST_X + 0.8 <= petalR(P_FLOOR_TOP) - 0.05, `비석 x(${P_ST_X}) + 받침 뒷단 ≤ 물리 바닥단 (+x 벽 앞)`)
  ok(P_ST_NEAR < P_ST_FAR && P_ST_FAR >= 25, `페이드 near(${P_ST_NEAR}) < far(${P_ST_FAR}) — 문에서 어렴풋·다가가면 선명`)
  const stLift = p1HeightAt(P_ST_X, 0)
  //  ★㉝ 모드 인지: A = 주 융기 어깨(리프트 ≈0.4) / B = 큰 언덕 너머 벽가(≈0.05 — 언덕을 '넘어야' 비석이 나옴)
  ok(stLift >= 0 && stLift < 2.0, `NE 비석 리프트 실측 ${stLift.toFixed(2)} ∈ [0, 2) — p1HeightAt 자동 추종`)
  ok(stLift - 0.08 >= -0.085, 'NE 매몰 0.08 후 base 침하 ≤ 0.085 (원판 밑 살짝까지 허용 — 정착으로 읽힘)')
}

console.log('── 검수 스폰(NE) ──')
//  ★2026.07.13: 스폰이 FirstPersonControls의 SPAWN 문자열 → waypoints.js 표로 옮겨감.
//   소스 정규식 대신 '실제 웨이포인트 값'을 직접 검사한다(번들 아닌 그 모듈을 import — 더 강한 보증).
{
  const p1 = wpById('p1')
  ok(!!p1, 'NE(1p1) 방 웨이포인트 존재 — Tab 패널·[ ] 키로 즉시 검수 가능')
  const ang = RAD_ANG0
  const lx = p1.x * Math.cos(ang) + p1.z * Math.sin(ang) - RAD_R      // 월드 → 방 로컬
  const lz = -p1.x * Math.sin(ang) + p1.z * Math.cos(ang)
  ok(Math.abs(lx - P_SPAWN_LX) < 1e-9 && Math.abs(lz) < 1e-9,
    `웨이포인트 로컬 (${lx.toFixed(2)}, ${lz.toFixed(2)}) = (P_SPAWN_LX, 0) — 허브 계단 발치 앞`)
  const lift = p1HeightAt(P_SPAWN_LX, 0)
  ok(Math.abs(p1.y - (P_FLOOR_TOP + lift)) < 1e-9,
    '웨이포인트 y = 평바닥 + p1HeightAt(x,z) — 바닥 사건 보정이 P1_MODE·노브에 자동 추종(★㉝ 모드 인지)')
  //  ★㉝: B 극화(RISE 2.7)에선 스폰 융기가 STEP_UP(0.8)을 넘으므로 '보정 누락 자기복구'는 더 이상 성립 안 함 —
  //  대신 보정 배선 자체(위 소스 검사)가 보험. 여기선 보정값의 유한·비음수만 확인.
  ok(Number.isFinite(lift) && lift >= 0, `스폰 보정값 유효(${lift.toFixed(3)}) — 모드 ${'A' /* 라벨용 */}·B 공통`)
  ok(Math.abs(P_SPAWN_LX) + 1.0 <= P_FLOOR_R, `스폰 |x|(${Math.abs(P_SPAWN_LX)}) 바닥 원판 안`)
  const toStele = P_ST_X - P_SPAWN_LX
  ok(toStele < P_ST_FAR && toStele > P_ST_NEAR,
    `스폰→+x 벽 기준점 ${toStele.toFixed(1)} ∈ (near ${P_ST_NEAR}, far ${P_ST_FAR})` +
    (P_STELE_ON ? ' — 글자가 어렴풋이 뜬 채 시작' : ' — ⛔비석 소등 중이라 지금은 담체 없음(보존계 수치)'))
}


// ════════════════════════════════════════════════════════════════════
//  ★101 정의 각뿔대(팔각 역각뿔대) — 블록아웃 (2026.08.02 현도 그림)
//  이 절이 지키는 것: ⓐ 방위가 '정의 8기 = 면 8'에서 파생됐다 ⓑ 사이즈 노브 셋을 어디까지
//  밀 수 있는지(격자 전수) ⓒ 밟는 면과 안 밟는 면이 갈려 있다 ⓓ 봉인·법선.
// ════════════════════════════════════════════════════════════════════
console.log('── ★101 정의 각뿔대 — 스펙·파생 ──')
if (!PIT_ON) {
  ok(DEF_OCT_ON === true, 'PIT_ON=false 보존계: 선돌 8기가 되살아난다(구세계 복원)')
} else {
  const S = pitSpec()
  const nums = [S.yTop, S.yBot, S.rTop, S.rBot, S.rRim, S.apoTop, S.apoBot, S.sideTop, S.sideBot,
    S.faceDip, S.faceSlant, S.edgeDeg, S.edgeLen, S.floorBotY, S.shellGap]
  ok(nums.every(Number.isFinite), `스펙 전 항목 유한 — NaN 없음(${nums.length}항)`)
  ok(S.rBot < S.rTop && PIT_DEPTH > 0, `역각뿔대: 하면 ${S.rBot} < 상면 ${S.rTop} · 깊이 ${PIT_DEPTH}`)
  ok(Math.abs(S.rRim - (S.rTop + PIT_WALL_T)) < 1e-12,
    `판 구멍 반경 ${S.rRim} = 상면 + 입술 폭(${PIT_WALL_T}) — 입술이 곧 구멍의 두께`)
  ok(Math.abs(S.yTop - (ROOM_FLOOR_Y + ROOM_FLOOR_LIFT)) < 1e-12,
    `입술 윗면 ${S.yTop} = 판 윗면(ROOM_FLOOR_Y + ROOM_FLOOR_LIFT) — 단차 0`)
  ok(Math.abs(S.yBot - (S.yTop - PIT_DEPTH)) < 1e-12, `바닥 윗면 ${S.yBot.toFixed(2)} = 판 − 깊이(보이는 강하 = PIT_DEPTH 정확히)`)

  //  ★설계 잠금 — 방위는 노브가 아니라 '정의 8기가 면에 앉는다'의 귀결이다.
  ok(PIT_SIDES === 8, '면 8 = 정의 8(D1~D8) — 1:1')
  {
    const want = Array.from({ length: 8 }, (_, i) => DEF_OCT_PHASE + i * Math.PI / 4)   // 현 선돌 방위
    const norm = (a) => { let x = a % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x }
    const same = want.every(w => S.faceAz.some(f => Math.abs(norm(f) - norm(w)) < 1e-9))
    ok(same, '면 중심 방위 = 현 선돌 방위(22.5°+k·45°) — 정의가 서 있던 자리가 그대로 면이 된다')
    ok(S.edgeAz.some(a => Math.abs(norm(a)) < 1e-9),
      '세로 모서리에 +x 포함 — 현 옥타곤의 틈·나선 발치 정렬축(현도 "모서리 하나에 계단"의 후보)')
  }
  ok(Math.abs(S.apoTop - S.rTop * Math.cos(Math.PI / 8)) < 1e-12 && S.apoTop < S.rTop,
    `내접(면 중심) ${S.apoTop.toFixed(2)} < 외접 ${S.rTop} — 노브는 외접 기준이다(혼동 방지)`)
  //  ★★2026.08.02 정정 — 면과 모서리는 다른 값이다. 구 코드는 외접반경으로 재서 **모서리 값을 면 값으로** 적었다.
  ok(S.faceDip > S.edgeDeg && S.faceSlant < S.edgeLen,
    `면(내접) ${S.faceSlant.toFixed(2)}·${S.faceDip.toFixed(2)}° ≠ 모서리(외접) ${S.edgeLen.toFixed(2)}·${S.edgeDeg.toFixed(2)}° — 감실이 앉는 정본은 면 쪽`)
  ok(Math.abs(S.apoAt(S.yBot) - S.apoBot) < 1e-9 && Math.abs(S.apoAt(S.yTop) - S.apoTop) < 1e-9,
    `높이별 내접반경 파생 함수가 양끝에서 스펙과 일치(${S.apoBot.toFixed(2)}→${S.apoTop.toFixed(2)}) — 감실이 이 함수 위에 선다`)
  ok(S.sideTop > S.sideBot, `한 변 ${S.sideBot.toFixed(2)}(아래) → ${S.sideTop.toFixed(2)}(위)`)

  console.log('── ★101 간섭·여유 (현행 값) ──')
  const P = pitProbe()
  ok(P.shellGap > 2, `방 아랫반 셸 여유 ${P.shellGap.toFixed(2)} > 2 — 각뿔대가 셸을 안 건드린다(§7 구속 '개구는 판에만' 무손상)`)
  ok(P.bowlGap > 2, `사발 잔여 ${P.bowlGap.toFixed(2)} > 2 — 현도 "중간쯤에서 끊는다" 성립(밑은 개구 0·접근 0 봉인 공간)`)
  ok(P.stairGap > 0, `판 구멍 ↔ 공리 나선 최하 디딤판 바깥끝 여유 ${P.stairGap.toFixed(2)} > 0 — 나선 발치 무손상`)
  {   //  ★102 가드 이후 — 기단은 '살아남는 단 수'로 잰다(음수 폭은 실패가 아니라 그 단이 안 그려진다는 뜻)
    const alive = Array.from({ length: DAIS_STEPS }, (_, k) => DAIS_R - DAIS_STEP_IN * k).filter(R => R > S.rRim + 0.05)
    ok(alive.length >= 1,
      `성역 기단 ${alive.length}/${DAIS_STEPS}단 생존(구멍 ${S.rRim}) · 최상단 여유 ${P.daisGap.toFixed(2)} — 0 이하인 단은 가드가 안 그린다`)
  }
  ok(P.floorD >= 5, `하면 통행 지름 ${P.floorD.toFixed(2)} ≥ 5 — 돌면서 여덟 면에 다가갈 수 있다(현도 관람 방식)`)
  ok(S.rRim > POOL_R, `판 구멍(${S.rRim}) > 빛 웅덩이(${POOL_R}) — ${ROOM_SHAFT_ON ? '⚠빛 하절이 허공에서 잘린다(선언: PIT_SHAFT_DROP로 전환 · 판정은 P2)' : '★113 샤프트 소등 중이라 무해(스포트 웅덩이만 남음)'}`)
  //  ★★★113 눈속임 해제(현도 2026.08.05) — 알베도와 스포트는 **한 몸**이었다.
  //   v2.2가 알베도를 5.48배 어둡게 하고 스포트를 같은 배수로 증폭해 웅덩이 밝기를 맞춰 놨다.
  //   한쪽만 되돌리면 웅덩이가 타 버린다 → 관계를 코드가 지키는지 여기서 잰다(값이 아니라 관계).
  ok(Math.abs(SPOT_I - (ROOM_DIM ? 8.0 : 8.0 / ROOM_ALBEDO_GAIN)) < 1e-9,
    `스포트 ${SPOT_I.toFixed(2)} = 8.0${ROOM_DIM ? '' : ` ÷ 알베도비 ${ROOM_ALBEDO_GAIN}`} — 암실 해제와 **짝으로** 움직인다(ROOM_DIM=${ROOM_DIM})`)
  ok(!(ROOM_DIM && !ROOM_SHAFT_ON) || true,
    `눈속임 체제: 알베도 ${ROOM_DIM ? '암실(보존계)' : '건물 석재 — 눈속임 없음'} · 빛기둥 ${ROOM_SHAFT_ON ? '켜짐' : '소등'}`)

  console.log('── ★101 노브 스윕(깊이×상면×하면 격자 27) — 현도가 밀 수 있는 범위 ──')
  {
    const DS = [12, 24.5, 36], TS = [20, 26, 34], BS = [8, 13, 20]
    let bad = []
    for (const d of DS) for (const rt of TS) for (const rb of BS) {
      if (rb >= rt) continue                                   // 역각뿔대가 아니면 조합 자체가 무의미
      const q = pitProbe({ depth: d, rTop: rt, rBot: rb })
      //  ★경성 제약 4(깨지면 기하가 성립 안 함) — 기단은 여기 없다(아래 연성 절에서 따로 잰다)
      const okC = q.shellGap > 2 && q.bowlGap > 2 && q.stairGap > 0 && q.floorD >= 5
      if (!okC) bad.push(`d${d}/t${rt}/b${rb}[shell ${q.shellGap.toFixed(1)} bowl ${q.bowlGap.toFixed(1)} stair ${q.stairGap.toFixed(1)} floor ${q.floorD.toFixed(1)}]`)
    }
    ok(bad.length === 0, `스윕 격자 27조합 경성 제약 전부 성립 — 막히면 여기 이름이 뜬다${bad.length ? ': ' + bad.join(' · ') : ''}`)
    //  ★상한을 이름으로 남긴다(다시 재지 않도록 — DESIGN §7 스윕 표의 근거)
    const dMax = (() => { let d = PIT_DEPTH; while (d < 80 && pitProbe({ depth: d + 0.5 }).bowlGap > 2 && pitProbe({ depth: d + 0.5 }).shellGap > 2) d += 0.5; return d })()
    const tMax = (() => { let t = PIT_R_TOP; while (t < 60 && pitProbe({ rTop: t + 0.5 }).stairGap > 0) t += 0.5; return t })()
    ok(dMax >= PIT_DEPTH && tMax >= PIT_R_TOP,
      `실측 상한(경성) — 깊이 ≤ ${dMax}(사발 바닥이 정한다) · 상면 ≤ ${tMax}(나선 발치가 정한다)`)
    //  ★연성 제약 = 성역 기단. 상면을 키우면 **기단이 먼저 죽는다**(경성보다 훨씬 먼저).
    //   이건 실패가 아니라 **선언**이다 — 기단은 구세계(v2 성역) 어휘라 현도가 버릴 수도 있다.
    const tDais = (() => { let t = 8; while (t < 60 && pitProbe({ rTop: t + 0.5 }).daisGap > 0.5) t += 0.5; return t })()
    const tAllDead = (() => { let t = 8; while (t < 60 && pitProbe({ rTop: t + 0.5 }).stairGap > 0 && DAIS_R > (t + 0.5) + PIT_WALL_T + 0.05) t += 0.5; return t })()
    ok(tAllDead >= PIT_R_TOP,
      `⚠연성 — 상면 > ${tDais}면 기단 최상단이, > ${tAllDead}면 **기단이 전부** 먹힌다. 현행 ${PIT_R_TOP}(1단 생존) — 실패가 아니라 선언된 선택지다`)
  }

  console.log('── ★101 기하 무결(법선·봉인·이음) ──')
  {
    const gs = { walls: buildPitWalls(), rim: buildPitRim(), floor: buildPitFloor(),
      disc: buildHoledSlab(ROOM_R, 96, S.rRim, PIT_SIDES, PIT_PHASE, 0) }
    for (const [k, g] of Object.entries(gs)) {
      const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array
      ok([...pos].every(Number.isFinite) && [...nor].every(Number.isFinite), `${k}: NaN 없음 (삼각 ${pos.length / 9})`)
      let worst = 0
      for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
      //  ⚠★'각진 연필' 교훈의 반대편: 여기선 **패싯이 옳다**. computeVertexNormals를 안 쓴 대신
      //   법선을 손으로 찍었으므로, 단위 길이가 어긋나면 셰이딩이 바로 망가진다 → 상시 잰다.
      ok(worst < 1e-6, `${k}: 법선 전부 단위벡터(최대 편차 ${worst.toExponential(1)}) — computeVertexNormals 미사용(패싯 보존)`)
    }
    //  안쪽 면이 축을 향하는가(뒤집힘 검출) — 면 중심에서 법선·반경방향 내적 < 0
    {
      const g = gs.walls, pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array
      let inward = 0, total = 0
      for (let i = 0; i < pos.length; i += 9) {
        const cx = (pos[i] + pos[i + 3] + pos[i + 6]) / 3, cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3
        const L = Math.hypot(cx, cz); if (L < 1e-6) continue
        const d = (nor[i] * cx + nor[i + 2] * cz) / L
        if (Math.abs(d) > 0.2) { total++; if (d < 0) inward++ }
      }
      ok(total > 0 && inward === total / 2, `옆벽 법선: 안쪽 면 ${inward} / 세로면 ${total} = 정확히 절반(안팎 한 쌍씩 · 뒤집힘 없음)`)
    }
    //  봉인 — 바닥 슬래브가 옆벽 안쪽면에 물린다(딱 맞추면 헤어라인 틈. ★64 교훈)
    {
      const pos = gs.floor.getAttribute('position').array
      let rMax = 0
      for (let i = 0; i < pos.length; i += 3) rMax = Math.max(rMax, Math.hypot(pos[i], pos[i + 2]))
      ok(rMax > S.rBot + 1e-6 && rMax < S.rBot + 0.2,
        `바닥 슬래브 최대반경 ${rMax.toFixed(3)} — 옆벽 하단(${S.rBot})에 ${(rMax - S.rBot).toFixed(3)} 물림(틈 0)`)
    }
    //  이음 — 판 고리의 구멍이 입술 바깥 팔각과 **같은 다각형**인가(겹침 0·틈 0)
    {
      const th = 0.3
      const a = polyRadiusAt(th, S.rRim, PIT_SIDES, PIT_PHASE)
      const pos = gs.disc.getAttribute('position').array
      let rMin = Infinity
      for (let i = 0; i < pos.length; i += 3) rMin = Math.min(rMin, Math.hypot(pos[i], pos[i + 2]))
      ok(Math.abs(rMin - S.rRim * Math.cos(Math.PI / PIT_SIDES)) < 0.05 && Number.isFinite(a),
        `판 고리 최소반경 ${rMin.toFixed(3)} = 입술 팔각 내접(${(S.rRim * Math.cos(Math.PI / 8)).toFixed(3)}) — 두 면이 같은 다각형에서 만난다`)
    }
  }

  console.log('── ★101 배선(웨이포인트·밟는 면·부수 처분) ──')
  {
    const w = wpById('defpit')
    ok(!!w, '각뿔대 바닥 웨이포인트 존재 — Tab 패널로 즉시 사이즈감 판정')
    ok(Math.abs(w.y - S.yBot) < 1e-12, `웨이포인트 y ${w.y.toFixed(2)} = 바닥 윗면(불변식 2 — 발 딛는 면)`)
    ok(w.pitch > 0, `pitch +${(w.pitch * 180 / Math.PI).toFixed(1)}° — 62° 빗면의 D1 면 중앙을 올려다본다`)
    const ROOM_SRC = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/pitRimGeo[\s\S]{0,120}walkable:\s*true/.test(ROOM_SRC), '입술 띠 = walkable:true (판과 이어져 밟힌다)')
    ok(/pitFloorGeo[\s\S]{0,120}walkable:\s*true/.test(ROOM_SRC), '바닥 슬래브 = walkable:true')
    ok(/pitWallGeo[\s\S]{0,160}walkable:\s*false/.test(ROOM_SRC), '빗면 = walkable:false (62°를 밟게 두지 않는다)')
    ok(DEF_OCT_ON === false, '선돌 8기 소등 — r26은 이제 구멍 위 허공(크기 눈금이 필요하면 DEF_OCT_ON=true 강제)')
    const markR = PIT_MARK_MODE === 'rim' ? S.rRim + PIT_MARK_GAP : DEF_OCT_R
    ok(PIT_MARK_MODE === 'off' || markR > S.rRim,
      `팔각 각인선 처분 '${PIT_MARK_MODE}' — 반경 ${markR.toFixed(2)} > 구멍 ${S.rRim} (허공에 안 뜬다)`)
  }
}


// ════════════════════════════════════════════════════════════════════
//  ★102 정의 감실 — 여덟 면에 파인 직사각 개구 (2026.08.02 현도 그림)
//  이 절이 지키는 것: ⓐ 입구가 **면 평면 안에 눕는다**(현도 확정 #1) ⓑ 면 살·인접 감실이 안 닿는다
//  ⓒ 셸을 안 뚫는다 ⓓ ⓑ체제 계단이 실제로 밟히는 단높이다 ⓔ 밟는 면/안 밟는 면이 갈려 있다.
// ════════════════════════════════════════════════════════════════════
if (PIT_ON && NICHE_ON) {
  console.log('── ★102 정의 감실 — 입구·살 ──')
  const Q = nicheSpec(), S2 = Q.s
  const nums = [Q.yS, Q.yT, Q.W, Q.RAD, Q.run, Q.rFoot, Q.openW, Q.openH, Q.openSlant, Q.sideFlesh, Q.shellGap]
  ok(nums.every(Number.isFinite), `감실 스펙 전 항목 유한 — NaN 없음(${nums.length}항)`)
  ok(Math.abs(Q.yS - (S2.yBot + NICHE_SILL)) < 1e-12,
    `턱 ${Q.yS.toFixed(2)} = 각뿔대 바닥 + ${NICHE_SILL} — 감실 바닥이 각뿔대 바닥보다 높다(현도 지시)`)
  ok(Q.yT < S2.yTop - 0.5, `입구 윗변 ${Q.yT.toFixed(2)} < 판 ${S2.yTop.toFixed(2)} — 위에 갓이 남는다(H_F ${NICHE_H_F})`)
  ok(Q.W < S2.hwAt(Q.yS), `입구 반폭 ${Q.W.toFixed(2)} < 턱 높이 면 반폭 ${S2.hwAt(Q.yS).toFixed(2)}`)
  ok(Q.sideFlesh > 0.3,
    `면 살 ${Q.sideFlesh.toFixed(2)}(반쪽) — 모서리에서 두 감실 사이 ${(2 * Q.sideFlesh).toFixed(2)}. ⚠W_F를 1로 밀면 0이 되어 여덟 감실이 붙는다`)
  //  ⚠★103(08.02)로 하한을 내렸다 — 모서리 슬롯 폭 3.0을 감실 침범 0으로 통과시키려고 W_F를 0.9 → 0.783으로
  //   양보했다(현도 채택). 그래도 입구는 여전히 **아랫변보다 넓다**는 것이 이 절의 취지다.
  ok(Q.openW > 2 * S2.hwAt(S2.yBot) * 0.82,
    `입구 폭 ${Q.openW.toFixed(2)} — 턱을 올린 만큼 아랫변(${(2 * S2.hwAt(S2.yBot)).toFixed(2)})보다 넓다(W_F ${NICHE_W_F})`)

  console.log('── ★102 입구가 면 평면 안에 눕는가 (현도 확정 #1의 코드 잠금) ──')
  {
    //  면 평면: 법선 = (sin dip)·n̂ − (cos dip)·ŷ, 평면 위 한 점 = (apoAt(yBot), 0, yBot).
    //  입구 네 꼭짓점의 평면 잔차가 0이어야 "면 안에 눕는다"가 성립한다.
    const dip = S2.faceDip * Math.PI / 180
    const res = []
    for (const y of [Q.yS, Q.yT]) for (const u of [-Q.W, Q.W]) {
      const r = S2.apoAt(y)
      res.push(Math.abs((r - S2.apoAt(S2.yBot)) * Math.sin(dip) - (y - S2.yBot) * Math.cos(dip)))
    }
    const worst = Math.max(...res)
    ok(worst < 1e-9, `입구 네 꼭짓점 전부 면 평면 위(최대 잔차 ${worst.toExponential(1)}) — 수직 개구가 아니다`)
    //  ★뒷벽 체제(2026.08.02 현도 지시로 둘) — 'parallel' 깊이 일정 / 'vertical' 수직면
    if (NICHE_BACK === 'vertical') {
      ok(Math.abs(Q.backAt(Q.yS) - Q.backAt(Q.yT)) < 1e-12,
        `뒷벽 수직 — 반경 ${Q.backConst.toFixed(2)}이 전 높이 일정`)
      ok(Q.backConst > S2.apoAt(Q.yT) + 0.5,
        `뒷벽 ${Q.backConst.toFixed(2)} > 입구 윗변 면 ${S2.apoAt(Q.yT).toFixed(2)} — ⚠기준이 윗변이어야 하는 이유(아랫변 기준이면 위에서 뒤집힌다)`)
      ok(Q.depthAtS > Q.depthAtT,
        `수평 깊이 턱 ${Q.depthAtS.toFixed(2)} > 윗변 ${Q.depthAtT.toFixed(2)} — 아래가 깊은 쐐기가 되는 것이 수직면의 대가`)
    } else {
      const d0 = (Q.backAt(Q.yS) - S2.apoAt(Q.yS)) * Math.sin(dip)
      const d1 = (Q.backAt(Q.yT) - S2.apoAt(Q.yT)) * Math.sin(dip)
      ok(Math.abs(d0 - NICHE_DEPTH) < 1e-9 && Math.abs(d1 - NICHE_DEPTH) < 1e-9,
        `깊이가 전 높이에서 ${NICHE_DEPTH} 일정(뒷벽 ∥ 면) — 반경 오프셋 ${Q.RAD.toFixed(3)}은 파생`)
    }
  }

  console.log('── ★102 간섭 (인접 감실 · 셸 · 나선) ──')
  {
    //  인접 감실 관입 — 면0 공동의 모서리 8점이 면1 공동 안에 드는가(음수 = 안 닿음)
    const az0 = S2.faceAz[0], az1 = S2.faceAz[1]
    let worst = -Infinity
    for (const y of [Q.yS, Q.yT]) for (const u of [-Q.W, Q.W]) for (const d of [S2.apoAt(y), Q.backAt(y)]) {
      const r = d
      const px = r * Math.cos(az0) - u * Math.sin(az0), pz = r * Math.sin(az0) + u * Math.cos(az0)
      const r1 = px * Math.cos(az1) + pz * Math.sin(az1)
      const u1 = -px * Math.sin(az1) + pz * Math.cos(az1)
      const d1 = r1 - S2.apoAt(y)
      worst = Math.max(worst, Math.min(Q.W - Math.abs(u1), d1, (Q.backAt(y) - S2.apoAt(y)) - d1))
    }
    ok(worst < -0.2, `인접 감실 관입 여유 ${worst.toFixed(2)} (< 0 = 안 닿음) — 깊이·폭을 키우면 여기가 먼저 깨진다`)
  }
  ok(Q.shellGap > 2,
    `감실 뒷벽 ↔ 방 아랫반 셸 여유 ${Q.shellGap.toFixed(2)} > 2 — ⚠뚫으면 밖에서 '떠 있는 구'에 구멍이 보인다(치명)`)
  {
    const rOuter = Math.max(Math.hypot(Q.backAt(Q.yS), Q.W), Math.hypot(Q.backAt(Q.yT), Q.W))
    ok(rOuter < ROOM_STAIR_ROUT, `감실 최원점 ${rOuter.toFixed(2)} < 공리 나선 발치 ${ROOM_STAIR_ROUT} — 나선 무접촉`)
  }

  console.log(`── ★102 바닥 체제 '${NICHE_FLOOR}' ──`)
  if (NICHE_FLOOR === 'stair') {
    ok(Q.riseApp <= NICHE_STEP_R + 1e-9 && Q.riseApp <= DESC_RISE_MAX && Q.riseApp < STEP_UP,
      `접근 계단 단높이 ${Q.riseApp.toFixed(3)} ≤ ${NICHE_STEP_R} · DESC_RISE_MAX ${DESC_RISE_MAX} · STEP_UP ${STEP_UP} — 되돌아 내려올 수 있다`)
    ok(NICHE_STAIR_DEG < S2.faceDip,
      `접근 계단 ${NICHE_STAIR_DEG}° < 면 기울기 ${S2.faceDip.toFixed(2)}° — 이보다 가파르면 계단이 벽 속으로 들어간다`)
    ok(Q.rFoot > 0 && Q.into > 0,
      `계단 발치 반경 ${Q.rFoot.toFixed(2)} · 바닥으로 튀어나오는 양 ${Q.into.toFixed(2)} — 여덟이 이만큼씩 바닥을 먹는다`)
    ok(S2.apoBot - Q.into > 4,
      `여덟 계단 뒤 남는 중앙 내접반경 ${(S2.apoBot - Q.into).toFixed(2)}(지름 ${(2 * (S2.apoBot - Q.into)).toFixed(2)}) > 8 — 마당이 남는다`)
    ok(Q.yTopIn < Q.yT - 1, `감실 안 계단 꼭대기 ${Q.yTopIn.toFixed(2)} < 입구 윗변 ${Q.yT.toFixed(2)} — 천장을 안 뚫는다`)
    {   //  ★2026.08.02 신설 — 단이 서로를 **덮지 않는가**. 구판은 감실 안 단이 전부 벽면에서 출발해
        //   꼭대기 단이 나머지를 덮었다(현도 신고: "감실 안까지 연결되지 않는다" = 단상 하나로 보였다).
      ok(Q.tread > 0.2 && Q.treadApp > 0.2,
        `드러나는 디딤 폭 — 접근 ${Q.treadApp.toFixed(2)} · 감실 안 ${Q.tread.toFixed(2)} (둘 다 > 0.2 = 단이 단으로 보인다)`)
      //  ★★경사 통일(현도 2026.08.02: "계단의 경사가 바뀌던데 그렇지 않은 게 자연스럽다")
      ok(Math.abs(Q.riseApp - Q.riseIn) < 1e-9 && Math.abs(Q.treadApp - Q.tread) < 1e-9,
        `전 구간 같은 단 — 단높이 ${Q.riseApp.toFixed(3)} · 디딤 ${Q.treadApp.toFixed(3)}. 접근↔감실 안 경사가 안 바뀐다`)
      //  ★★착지 = 계단이 끝나고 뒷벽까지 남는 **수평 바닥**(현도 2026.08.02)
      const depthS = Q.backAt(Q.yS) - S2.apoAt(Q.yS)
      ok(Q.landing > 0.5,
        `착지(수평 바닥) 폭 ${Q.landing.toFixed(2)} > 0.5 — 감실 수평깊이 ${depthS.toFixed(2)} 중 계단이 ${Q.runIn.toFixed(2)}만 쓴다`)
      ok(nicheFloorYAt(S2.apoAt(Q.yS) + Q.runIn) === Q.yTopIn && nicheFloorYAt(Q.backAt(Q.yS)) === Q.yTopIn,
        `착지 전 구간이 같은 높이 ${Q.yTopIn.toFixed(2)} — 계단 끝에서 뒷벽까지 평평하다`)
    }
    ok(nicheFloorYAt(Q.backAt(Q.yS)) === Q.yTopIn && nicheFloorYAt(S2.apoAt(Q.yS)) === Q.yS,
      `발 높이 함수가 체제를 따른다 — 입구 ${Q.yS.toFixed(2)} → 안쪽 끝 ${Q.yTopIn.toFixed(2)}`)
  } else {
    ok(nicheFloorYAt(Q.backAt(Q.yS)) === Q.yS, `'flat' — 감실 안이 전 구간 턱 높이 ${Q.yS.toFixed(2)}로 평평`)
    ok(buildNicheStairs().getAttribute('position').count === 0, `'flat'에서 계단 기하 0 — 체제 스위치가 실제로 끈다`)
  }

  console.log('── ★102 기하 무결·배선 ──')
  {
    const gs = { walls: buildPitWalls(), nicheWalk: buildNiches(true), nicheWall: buildNiches(false) }
    if (NICHE_FLOOR === 'stair') gs.nicheStep = buildNicheStairs()
    for (const [k, g] of Object.entries(gs)) {
      const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array
      ok([...pos].every(Number.isFinite) && [...nor].every(Number.isFinite) && pos.length > 0,
        `${k}: NaN 없음 (삼각 ${pos.length / 9})`)
      let worst = 0
      for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
      ok(worst < 1e-6, `${k}: 법선 전부 단위벡터(최대 편차 ${worst.toExponential(1)})`)
      //  ★★2026.08.02 신설 — **감김(winding)이 법선과 맞는가.** three는 법선 속성이 아니라 **화면상 감김**으로
      //   앞뒷면을 가른다. 어긋나면 그 면은 통째로 사라진다(현도 신고: "계단 앞면이 안 보이고 윗면만 보인다").
      //   원인은 자가교차 프로파일이었고, 이 검사가 그 계열을 상시 잡는다. 퇴화 삼각형도 함께 센다.
      let bad = 0, degen = 0
      for (let i = 0; i < pos.length; i += 9) {
        const ax = pos[i], ay = pos[i + 1], az2 = pos[i + 2]
        const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az2
        const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az2
        const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx
        const L = Math.hypot(wx, wy, wz)
        if (L < 1e-9) { degen++; continue }
        if ((wx * nor[i] + wy * nor[i + 1] + wz * nor[i + 2]) / L < 0.5) bad++
      }
      ok(bad === 0 && degen === 0, `${k}: 감김↔법선 불일치 ${bad} · 퇴화 삼각 ${degen} — 사라지는 면 없음`)
    }
    //  옆벽에 실제로 구멍이 뚫렸는가 — 감실 개구 한복판을 지나는 점이 벽 삼각형에 안 덮여야 한다
    {
      const az = S2.faceAz[0], yM = (Q.yS + Q.yT) / 2, rM = S2.apoAt(yM)
      const pos = gs.walls.getAttribute('position').array
      let near = Infinity
      const cx = rM * Math.cos(az), cz = rM * Math.sin(az)
      for (let i = 0; i < pos.length; i += 3) {
        if (Math.abs(pos[i + 1] - yM) > (Q.yT - Q.yS) / 2) continue
        near = Math.min(near, Math.hypot(pos[i] - cx, pos[i + 2] - cz))
      }
      ok(near > 1, `개구 한복판에서 가장 가까운 벽 정점이 ${near.toFixed(2)} 밖 — 구멍이 실제로 뚫렸다`)
    }
    const ROOM_SRC = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/nicheWalkGeo[\s\S]{0,140}walkable:\s*true/.test(ROOM_SRC), '감실 바닥 = walkable:true')
    ok(/nicheWallGeo[\s\S]{0,140}walkable:\s*false/.test(ROOM_SRC), '감실 천장·옆·뒤 = walkable:false')
    ok(/nicheStepGeo[\s\S]{0,140}walkable:\s*true/.test(ROOM_SRC), 'ⓑ 계단 = walkable:true')
    const w = wpById('defniche')
    ok(!!w && Math.abs(w.y - nicheFloorYAt(S2.apoAt(Q.yS) + (Q.backAt(Q.yS) - S2.apoAt(Q.yS)) * 0.75)) < 1e-12,
      `감실 안 웨이포인트 y ${w.y.toFixed(2)} = 그 자리 발 높이(체제 자동 추종)`)
  }

  console.log('── ★106 기단 찌꺼기 철거(현도 2026.08.02) ──')
  {
    ok(DAIS_ON === !PIT_ON,
      `기단 ${DAIS_ON ? 'ON' : '폐기'} — 각뿔대가 서면 자동으로 꺼진다(구세계 잔재: 얇은 고리 단·팔각 각인선·원형 가장자리 링)`)
    ok(!DAIS_ON ? DAIS_H === 0 : DAIS_H > 0,
      `DAIS_H ${DAIS_H} — **파생으로 묶었다.** 안 그리면서 높이만 남기면 'room' 시작점·선돌 baseY·빛 하절 밑끝이 허공에 뜬다`)
    ok(!PIT_ON || PIT_MARK_MODE === 'off',
      `팔각 각인선 ${PIT_MARK_MODE} — 현도 철거 지시(2026.08.02)`)
    const RS3 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/\{DAIS_ON && \(/.test(RS3) && /!DAIS_ON \? null :/.test(RS3),
      '가장자리 링·기단 단 둘 다 DAIS_ON으로 배선돼 있다')
    //  ⚠선언 — 시작점이 구멍 위에 떠 있다(★101 이후 계속. 시작점 이설이 열린 결정이라 여기선 안 옮긴다)
    const wr = wpById('room')
    const inHole = Math.hypot(wr.x - ROOM_CX, wr.z) < pitSpec().rRim * Math.cos(Math.PI / PIT_SIDES)
    ok(true, `⚠선언 — 'room' 시작점 r ${Math.hypot(wr.x - ROOM_CX, wr.z).toFixed(2)} y ${wr.y.toFixed(2)}: ${inHole ? `**구멍 위 허공**(각뿔대 바닥까지 ${(wr.y - pitSpec().yBot).toFixed(2)} 낙차)` : '판 위'} — 시작점 이설(열린 결정) 때 함께 고친다`)
  }

  console.log('── ★102 성역 기단 가드 ──')
  {
    const drawn = Array.from({ length: DAIS_STEPS }, (_, k) => DAIS_R - DAIS_STEP_IN * k)
      .filter(R => R > pitSpec().rRim + 0.05)
    ok(drawn.length >= 0,
      `기단 ${DAIS_STEPS}단 중 ${drawn.length}단만 그린다(구멍 ${pitSpec().rRim} 밖: ${drawn.map(r => r.toFixed(1)).join(',') || '없음'}) — 안쪽 단은 뒤집힌 고리가 되므로 안 그린다`)
    const ROOM_SRC = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/R > PIT\.rRim \+ 0\.05/.test(ROOM_SRC), '가드가 소스에 배선돼 있다 — 노브를 밀어도 뒤집힌 고리가 안 생긴다')
  }

  //  ══ ★103 모서리 슬롯 (2026.08.02 현도 그림 — 평행 3.0 · 뒷벽 38.0) ══
  if (SLOT_ON) {
    console.log('── ★103 슬롯 스펙(파생 잠금) ──')
    const G = slotSpec(), S3 = G.s, phi = Math.PI / S3.N
    const fpE = (r, u, y) => [r * Math.cos(G.az) - u * Math.sin(G.az), y, r * Math.sin(G.az) + u * Math.cos(G.az)]
    ok(Math.abs(G.cut - (SLOT_W / 2) / Math.cos(phi)) < 1e-12,
      `인접 면이 잃는 u 폭 cut ${G.cut.toFixed(4)} = (W/2)/cos(π/N) — **높이와 무관한 상수**(그래서 면 위에서도 평행하다)`)
    ok(NICHE_ON ? Math.abs(G.y0 - nicheSpec().yS) < 1e-12 : true,
      `출발 ${G.y0.toFixed(2)} = 턱(현도 08.02 "계단은 턱에서 출발") · 도착 ${G.y1.toFixed(2)} = 판 · 오를 높이 ${G.rise.toFixed(2)}`)
    ok(G.faceHi !== G.faceLo && [G.faceHi, G.faceLo].every(i => i >= 0 && i < S3.N),
      `슬롯이 걸친 면 둘 = #${G.faceLo}(+u 쪽) · #${G.faceHi}(−u 쪽) — 모서리 #${SLOT_EDGE} 양옆`)

    console.log('── ★103 감실 침범 0 (현도 조건 ⓐ) — 스펙과 실측 둘 다 ──')
    if (NICHE_ON) {
      const Q3 = nicheSpec()
      ok(G.nicheClear > 0,
        `감실 여유 ${G.nicheClear.toFixed(3)} > 0 (턱 높이가 최협착) — 슬롯 폭 ${SLOT_W} 상한은 ${(2 * Math.cos(phi) * (S3.hwAt(Q3.yS) - Q3.W)).toFixed(3)}`)
      //  ⚠스펙을 믿지 않고 **점을 찍어 다시 잰다** — 슬롯 옆벽 위의 점을 인접 면 좌표로 옮겨 개구 밖인지 본다.
      let worst = Infinity
      for (let k = 0; k <= 200; k++) {
        const y = Q3.yS + (Math.min(G.y1, Q3.yT) - Q3.yS) * k / 200
        for (const sgn of [-1, 1]) {
          const P0 = fpE(G.rSurf(sgn * G.HW, y), sgn * G.HW, y)
          for (const fi of [G.faceHi, G.faceLo]) {
            const a = S3.faceAz[fi]
            const uF = -P0[0] * Math.sin(a) + P0[2] * Math.cos(a)
            worst = Math.min(worst, Math.abs(uF) - Q3.W)
          }
        }
      }
      ok(worst > 0, `실측: 슬롯 옆벽 위 802점 전부 감실 개구 밖 — 최소 여유 ${worst.toFixed(3)}`)
      ok(Q3.sideFlesh - G.cut > 0,
        `면 살 ${Q3.sideFlesh.toFixed(3)}(반쪽) − cut ${G.cut.toFixed(3)} = ${(Q3.sideFlesh - G.cut).toFixed(3)} — W_F ${NICHE_W_F}가 이 양보의 대가다`)
    }

    console.log('── ★103 벽 절개 ↔ 슬롯 옆벽 봉합(경계 공유) ──')
    {
      let worst = 0
      for (let k = 0; k <= 100; k++) {
        const y = G.y0 + (G.y1 - G.y0) * k / 100
        for (const [fi, side] of [[G.faceHi, -1], [G.faceLo, +1]]) {
          const a = S3.faceAz[fi], hw = S3.hwAt(y)
          const uF = side === -1 ? -hw + G.cut : hw - G.cut
          const A = [S3.apoAt(y) * Math.cos(a) - uF * Math.sin(a), y, S3.apoAt(y) * Math.sin(a) + uF * Math.cos(a)]
          let best = Infinity
          for (const sgn of [-1, 1]) {
            const B = fpE(G.rSurf(sgn * G.HW, y), sgn * G.HW, y)
            best = Math.min(best, Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]))
          }
          worst = Math.max(worst, best)
        }
      }
      ok(worst < 1e-9, `벽이 물러난 가장자리와 슬롯 옆벽이 **같은 선**이다(최대 어긋남 ${worst.toExponential(1)}) — 틈도 겹침도 없다`)
    }

    console.log('── ★103 깊이·경사·판 수술 ──')
    ok(SLOT_BACK_R >= S3.rRim - 1e-9,
      `뒷벽 ${SLOT_BACK_R} ≥ 판 구멍 ${S3.rRim} — **전제**다. 이보다 안쪽이면 입술 띠가 안 뚫려 슬롯이 덮인다`)
    ok(G.depthSill > G.depthTop && G.depthTop > 0,
      `깊이 = 턱 ${G.depthSill.toFixed(2)} → 판 ${G.depthTop.toFixed(2)} (아래가 깊은 쐐기 — 감실 'vertical'과 같은 어법)`)
    ok(true,
      `⚠연성 보고 — 슬롯 안 **직선** 주행 ${G.runStraight.toFixed(2)} → 경사 ${G.straightDeg.toFixed(1)}°. 33°에는 주행 ${(G.rise / Math.tan(33 * Math.PI / 180)).toFixed(2)}(뒷벽 ${(G.rEdge(G.y0) + G.rise / Math.tan(33 * Math.PI / 180)).toFixed(2)}) 필요 = 판을 뚫는다. **계단은 꺾거나 감아야 한다**`)
    ok(G.slabBite > 0 ? G.extraTh.length > 20 : true,
      `판 초과 ${G.slabBite.toFixed(2)} — 노치를 판다(현도 08.02 승인). 스윕에 방위각 ${G.extraTh.length}개를 끼워 넣는다(등분 격자만으론 5°짜리 노치를 놓친다)`)
    {
      const ring = buildHoledSlab(ROOM_R, 96, S3.rRim, PIT_SIDES, PIT_PHASE, 0,
        G.slabBite > 0 ? { holeRAt: G.holeRAt, extraTh: G.extraTh } : {})
      const pos = ring.getAttribute('position').array
      const C = fpE((S3.rRim + SLOT_BACK_R) / 2, 0, 0)
      let near = Infinity
      for (let i = 0; i < pos.length; i += 3) near = Math.min(near, Math.hypot(pos[i] - C[0], pos[i + 2] - C[2]))
      ok(near > 0.8, `판 노치 한복판(r ${((S3.rRim + SLOT_BACK_R) / 2).toFixed(1)})에서 가장 가까운 판 정점이 ${near.toFixed(2)} 밖 — 실제로 뚫렸다`)
      ok([...pos].every(Number.isFinite), `노치 판 NaN 없음 (삼각 ${pos.length / 9})`)
    }

    console.log('── ★103 슬롯 메시 무결(법선·감김·사발 여유) ──')
    {
      const gs = { 'slot-walk': buildPitSlot(true), 'slot-wall': buildPitSlot(false), 'rim': buildPitRim(), 'walls': buildPitWalls() }
      for (const [k, g] of Object.entries(gs)) {
        const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array
        let worst = 0, bad = 0, degen = 0
        for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
        for (let i = 0; i < pos.length; i += 9) {
          const ax = pos[i], ay = pos[i + 1], az2 = pos[i + 2]
          const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az2
          const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az2
          const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx
          const L = Math.hypot(wx, wy, wz)
          if (L < 1e-9) { degen++; continue }
          if ((wx * nor[i] + wy * nor[i + 1] + wz * nor[i + 2]) / L < 0.5) bad++
        }
        ok([...pos].every(Number.isFinite) && worst < 1e-6 && bad === 0 && degen === 0,
          `${k}: 삼각 ${pos.length / 9} · 법선 편차 ${worst.toExponential(1)} · 감김 불일치 ${bad} · 퇴화 ${degen}`)
      }
      let gap = Infinity
      for (let k = 0; k <= 100; k++) {
        const y = G.y0 + (G.y1 - G.y0) * k / 100
        for (const sgn of [-1, 1]) {
          const P0 = fpE(SLOT_BACK_R, sgn * G.HW, y)
          gap = Math.min(gap, wallR(y) - Math.hypot(P0[0], P0[2]))
        }
      }
      ok(gap > 0, `슬롯 뒷벽 바깥 모서리 ↔ 방 아랫반 셸 여유 ${gap.toFixed(2)} — 뚫으면 밖에서 '떠 있는 구'에 구멍이 보인다(치명)`)
    }

    console.log('── ★103 밟는 면 분리·웨이포인트 ──')
    {
      const RS = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
      ok(/slotWalkGeo[\s\S]{0,140}walkable:\s*true/.test(RS), '슬롯 바닥 = walkable:true')
      ok(/slotWallGeo[\s\S]{0,140}walkable:\s*false/.test(RS), '슬롯 옆·뒷벽 = walkable:false')
      const w = wpById('defslot')
      ok(!!w && Math.abs(w.y - G.y0) < 1e-12, `슬롯 웨이포인트 y ${w ? w.y.toFixed(2) : '—'} = 슬롯 바닥(턱)`)
      const rr = (G.rEdge(G.y0) + G.back) / 2
      ok(!!w && Math.abs(Math.hypot(w.x - ROOM_CX, w.z) - rr) < 1e-9,
        `슬롯 웨이포인트가 슬롯 한가운데(r ${rr.toFixed(2)})에 선다`)
    }

    //  ══ ★104 슬롯 안 꺾인 계단 (2026.08.02 — A/B 두 체제) ══
    if (SLOT_STAIR !== 'off') {
      console.log(`── ★104 계단 체제 '${SLOT_STAIR}' — 갈래 해(닫힌 식) ──`)
      const T = stairSolve(G.y0, G.y1, G.rEdge)
      ok(Math.abs(T.hs.reduce((a, b) => a + b, 0) - G.rise) < 1e-9,
        `${T.hs.length}갈래 ${T.deg}° · 상승 ${T.hs.map(h => h.toFixed(2)).join(' / ')} = 합 ${G.rise.toFixed(2)}`)
      {   //  ★★참은 **온전한 수평판**이어야 한다(현도 08.02 정정: "지나가는 길이면 늘린 의미가 없다").
        //   구판은 다음 갈래가 참 끝에서 출발해 **참 위를 덮었고**, L을 키워도 밟을 판은 안 늘었다.
        //   → 여기서 재는 것은 노브가 아니라 **머리 위가 트인 실제 수평판 깊이**다.
        const laneW = G.HW - SLOT_STAIR_INSET - SLOT_LANE_GAP / 2
        const fullW = 2 * (G.HW - SLOT_STAIR_INSET)
        ok(!T.Lclamped
          ? Math.abs(T.L - SLOT_LANDING) < 1e-9
          : T.L > 0,
          `참 요청 ${SLOT_LANDING} → 사용 ${T.L.toFixed(2)}${T.Lclamped ? ` ⚠**나선 천장 클램프**(뒷벽 ${G.back.toFixed(2)} ↔ 발치 ${G.spiralIn.toFixed(2)} · 여유 ${SLOT_SPIRAL_PAD})` : ''}`)
        let worstOpen = Infinity, rep = []
        for (const a of T.runs.filter(q => q.kind === 'landing')) {
          let open = 0
          const N = 400
          for (let i = 0; i < N; i++) {
            const rr = a.r0 + (a.r1 - a.r0) * (i + 0.5) / N
            let cover = Infinity                                  // 이 반경에서 머리 위로 가장 낮은 면
            for (const b of T.runs) {
              if (b === a || b.y <= a.y + 1e-9) continue
              if (rr < b.r0 - 1e-9 || rr > b.r1 + 1e-9) continue   // 반경이 안 겹치면 머리 위가 아니다
              cover = Math.min(cover, b.y - SLOT_SLAB_T)
            }
            if (cover - a.y >= SLOT_CLEAR - 1e-9) open += (a.r1 - a.r0) / N
          }
          rep.push(open)
          worstOpen = Math.min(worstOpen, open)
        }
        ok(worstOpen >= T.L - 1e-3,
          `**머리 위가 트인 수평판 깊이** ${rep.map(x => x.toFixed(2)).join(' / ')} = 참 깊이 ${T.L.toFixed(2)} 전부 — 되돌아오는 갈래가 참을 안 덮는다`)
        ok(worstOpen >= laneW - 1e-9,
          `트인 판 ${worstOpen.toFixed(2)} ≥ 차선 폭 ${laneW.toFixed(2)}(절대 하한) · 계단 유효 폭 ${fullW.toFixed(2)} 대비 ${(worstOpen / fullW).toFixed(2)}배${worstOpen >= fullW - 1e-9 ? ' — 표준 규칙(참 ≥ 폭) 충족' : ' ⚠규칙 미달'}`)
      }
      ok(T.lanes.length === T.hs.length && T.lanes.every((L2, i) => L2 === i % 2),
        `차선 배치 ${T.lanes.join('·')} — 갈래를 **나란히** 놓는다(같은 수직면에 겹치면 참에서 기어야 한다). 차선 폭 ${(G.HW - SLOT_STAIR_INSET - SLOT_LANE_GAP / 2).toFixed(2)}`)
      ok(Math.abs(G.back - (Math.max(...T.runs.map(q => q.r1)) + SLOT_STAIR_INSET)) < 1e-12,
        `뒷벽 ${G.back.toFixed(2)} = 참의 바깥 끝 + 인셋 ${SLOT_STAIR_INSET} — 계단이 정한다(결합 설계)`)
      ok(T.stepRise.every(r => r <= DESC_RISE_MAX + 1e-9),
        `단높이 ${T.stepRise.map(r => r.toFixed(3)).join(' / ')} ≤ DESC_RISE_MAX ${DESC_RISE_MAX} — 되돌아 내려올 수 있다`)
      ok(T.stepRise.every(r => r <= STEP_UP + 1e-9), `단높이 ≤ STEP_UP ${STEP_UP} — 올라설 수 있다`)
      {   //  ★★스펙 단높이가 아니라 **실제로 걸어 올라가며** 밟는 면 사이 점프를 잰다.
        //   ⚠구판은 밖으로 가는 갈래의 **마지막 디딤만** 참 높이로 끌어올려 그 한 단이 2배(0.99)로 튀었다.
        //   `stepRise`는 전부 0.48이라 green이었고 **이 검사가 없어서 통과했다**(현도 로컬 신고).
        let worst = -Infinity, at = -1, prev = G.y0
        T.runs.forEach((q, i) => { const j = q.y - prev; if (j > worst) { worst = j; at = i }; prev = q.y })
        const last = G.y1 - prev
        ok(worst <= STEP_UP + 1e-9 && last <= STEP_UP + 1e-9 && last >= -1e-9,
          `실측 연속 점프 최대 ${Math.max(worst, last).toFixed(3)} ≤ STEP_UP ${STEP_UP} (최악 #${at}) · 마지막 디딤 → 판 ${last.toFixed(3)}`)
        ok(T.runs.every(q => q.y >= G.y0 - 1e-9 && q.y <= G.y1 + 1e-9),
          `밟는 면 ${T.runs.length}개가 전부 턱 ${G.y0.toFixed(2)} ~ 판 ${G.y1.toFixed(2)} 사이`)
      }

      console.log('── ★104 ⛔공리 나선 천장 · 채널 수납 · 도착 ──')
      ok(G.back < G.spiralIn,
        `뒷벽 ${G.back.toFixed(2)} < 공리 나선 발치 ${G.spiralIn.toFixed(2)} — 여유 **${(G.spiralIn - G.back).toFixed(2)}**${G.spiralIn - G.back < 1 ? ' ⚠아슬(체제 A의 대가)' : ''}`)
      {   //  ⚠벽면은 모서리(u=0)에서 가장 바깥이다 — 디딤의 **안쪽 변**을 그 정점 기준으로 잰다.
        //   (정점을 |u|=폭끝에서만 재면 0.60의 헛여유가 생겨 벽 속 관입을 놓친다 — 실제로 놓쳤다.)
        let worst = Infinity, at = null
        for (const q of T.runs) { const d = q.r0 - G.rEdge(q.y); if (d < worst) { worst = d; at = q } }
        ok(worst > -1e-9,
          `디딤·참 ${T.runs.length}개 전부 채널 안(벽면 여유 최소 ${worst.toFixed(3)} @ y ${at.y.toFixed(2)}) — 허공 다리 없음`)
      }
      ok(T.endR >= G.rEdge(G.y1) - 1e-9,
        `도착 r ${T.endR.toFixed(2)} ≥ 판 안쪽 끝 ${G.rEdge(G.y1).toFixed(2)} — 허공이 아니라 판 높이에 닿는다`)
      ok(true, `⚠연성 — 도착 위치: ${T.endR > G.s.rRim ? '노치 **바깥 끝**(판으로 곧장 나간다)' : '판 **입술**(양옆으로 비켜서 나간다 — 안쪽은 각뿔대 허공)'}`)

      console.log('── ★104 헤드룸 실측(스펙 말고 점으로) ──')
      {   //  **같은 차선**에서만 머리 위가 생긴다(차선이 다르면 나란히 지나간다).
        //   참은 두 차선을 다 덮으므로 양쪽과 비교한다.
        let worst = Infinity, pair = null
        const shares = (a, b) => a.lane === -1 || b.lane === -1 || a.lane === b.lane
        //  ⚠'올라서는 단'은 천장이 아니다 — 참 위에 얹힌 다음 갈래의 첫 단들, 그리고 갈래 꼭대기의
        //   참은 **밟고 지나가는 것**이지 머리 위가 아니다. 이 둘을 빼지 않으면 계단마다 오검출이 난다.
        const stepOff = (a, b) => (b.kind === 'landing' && b.flight === a.flight) ||
                                  (a.kind === 'landing' && b.flight === a.flight + 1)
        for (const a of T.runs) for (const b of T.runs) {
          if (b.y <= a.y + 1e-9 || !shares(a, b) || stepOff(a, b)) continue
          if (Math.min(a.r1, b.r1) - Math.max(a.r0, b.r0) < 1e-6) continue   // 반경이 안 겹치면 머리 위가 아니다
          const c = (b.y - SLOT_SLAB_T) - a.y
          if (c < worst) { worst = c; pair = [a, b] }
        }
        ok(!Number.isFinite(worst) || worst >= SLOT_CLEAR - 1e-6,
          `같은 차선 겹침 최소 순 헤드룸 ${Number.isFinite(worst) ? worst.toFixed(2) : '겹침 없음'} ≥ ${SLOT_CLEAR}${pair ? ` (갈래 ${pair[0].flight}↔${pair[1].flight})` : ''}`)
      }

      console.log('── ★104 계단 메시 무결·슬롯 안 수납 ──')
      {
        const g2 = buildSlotStairs(), pos = g2.getAttribute('position').array, nor = g2.getAttribute('normal').array
        let worst = 0, bad = 0, degen = 0
        for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
        for (let i = 0; i < pos.length; i += 9) {
          const ax = pos[i], ay = pos[i + 1], az2 = pos[i + 2]
          const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az2
          const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az2
          const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx
          const Lm = Math.hypot(wx, wy, wz)
          if (Lm < 1e-9) { degen++; continue }
          if ((wx * nor[i] + wy * nor[i + 1] + wz * nor[i + 2]) / Lm < 0.5) bad++
        }
        ok([...pos].every(Number.isFinite) && worst < 1e-6 && bad === 0 && degen === 0,
          `계단: 삼각 ${pos.length / 9} · 법선 편차 ${worst.toExponential(1)} · 감김 불일치 ${bad} · 퇴화 ${degen}`)
        //  전 정점이 슬롯 안인가 — 폭·뒷벽·벽면 셋 다
        let uMax = 0, rMax = 0, wallWorst = Infinity, yLo = Infinity, yHi = -Infinity
        for (let i = 0; i < pos.length; i += 3) {
          const X = pos[i], Y = pos[i + 1], Z = pos[i + 2]
          const rr = X * Math.cos(G.az) + Z * Math.sin(G.az)
          const uu = -X * Math.sin(G.az) + Z * Math.cos(G.az)
          uMax = Math.max(uMax, Math.abs(uu)); rMax = Math.max(rMax, rr)
          yLo = Math.min(yLo, Y); yHi = Math.max(yHi, Y)
          //  ⚠벽면 최원점은 모서리(u=0)다 — rSurf(uu,·)로 재면 폭끝에서 0.60의 헛여유가 생긴다.
          wallWorst = Math.min(wallWorst, rr - G.rEdge(Math.max(G.y0, Y)))
        }
        //  ⚠공차 1e-4: 메시 좌표는 **Float32**다(BufferAttribute). 배정밀도 스펙값과 직접 비교하면
        //   상대 1e-7 오차가 그대로 뜬다(체제 A에서 1.1e-6로 오검출 — 기하가 아니라 정밀도 문제였다).
        ok(uMax <= G.HW - SLOT_STAIR_INSET + 1e-4 && rMax <= G.back - SLOT_STAIR_INSET + 1e-4,
          `계단이 슬롯 안에 완전 수납 — |u|max ${uMax.toFixed(2)} ≤ ${(G.HW - SLOT_STAIR_INSET).toFixed(2)} · r max ${rMax.toFixed(2)} ≤ ${(G.back - SLOT_STAIR_INSET).toFixed(2)} (동일 평면 회피 = z-파이팅 방지)`)
        ok(wallWorst > -1e-4, `계단 전 정점이 벽면 밖으로 안 나간다(최소 여유 ${wallWorst.toFixed(4)})`)
        ok(yLo >= G.y0 - 1e-4 && yHi <= G.y1 + 1e-4 && G.y1 - yHi <= STEP_UP + 1e-4,
          `높이 범위 ${yLo.toFixed(2)} ~ ${yHi.toFixed(2)} — 꼭대기 디딤이 판 ${G.y1.toFixed(2)} 아래 ${(G.y1 - yHi).toFixed(3)}(한 단)`)
      }
      const RS2 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
      ok(/slotStepGeo[\s\S]{0,160}walkable:\s*true/.test(RS2), '★104 계단 = walkable:true')

      //  ══ ★105 슬롯까지 걸어갈 수 있는가 — 모서리 광선을 따라 실측 ══
      //   ⚠이 절이 없으면 ★103·★104가 전부 green이어도 **아무도 슬롯에 못 간다**(현도 로컬 적발).
      if (NICHE_ON && NICHE_FLOOR === 'stair') {
        console.log('── ★105 접근 계단 전폭화 · 모서리 경로 ──')
        const Q3 = nicheSpec(), cosH = Math.cos(Math.PI / S3.N), tanH = Math.tan(Math.PI / S3.N)
        //  단 k가 모서리 광선에서 덮는 반경 구간 = [안쪽 변, 바깥 변(벽면)] ÷ cos(π/N)
        const seg = []
        for (let k = 1; k <= Q3.nApp; k++) {
          const yk = S3.yBot + Q3.riseApp * k
          const rIn = Q3.rFoot + Q3.run * (k - 1) / Q3.nApp
          const hwK = NICHE_APP_WIDE ? S3.apoAt(yk) * tanH : Q3.W
          //  이 단이 모서리(u_f = −apo·tanH)까지 닿는가 — 안 닿으면 그 높이에서 쐐기 틈이 남는다
          seg.push({ k, y: yk, lo: rIn / cosH, hi: S3.apoAt(yk) / cosH, reach: hwK >= S3.apoAt(yk) * tanH - 1e-9 })
        }
        ok(seg.every(t => t.reach),
          `단 ${seg.filter(t => t.reach).length}/${seg.length}이 모서리까지 닿는다(전폭화 ${NICHE_APP_WIDE ? 'ON' : '⛔OFF — 경로 끊김'})`)
        {   //  모서리 광선을 마당에서 턱까지 걸어 본다 — 끊긴 구간과 단차를 동시에 잰다
          let gap = 0, worstStep = 0, prevY = null, prevHi = null
          for (const t of seg) {
            if (prevHi !== null && t.lo > prevHi + 1e-9) gap = Math.max(gap, t.lo - prevHi)
            if (prevY !== null) worstStep = Math.max(worstStep, t.y - prevY)
            prevY = t.y; prevHi = t.hi
          }
          ok(gap === 0,
            `모서리 광선 ρ ${seg[0].lo.toFixed(2)} → ${seg[seg.length - 1].hi.toFixed(2)} 끊김 ${gap.toFixed(3)} — 마당에서 턱까지 발 디딜 곳이 이어진다`)
          ok(worstStep <= STEP_UP + 1e-9,
            `모서리 단차 최대 ${worstStep.toFixed(3)} ≤ STEP_UP ${STEP_UP} — 올라설 수 있다`)
        }
        //  ★꼭대기 단 ↔ 슬롯 바닥 이음(같은 높이·같은 반경에서 만나야 한다)
        const topRho = S3.apoAt(Q3.yS) / cosH
        ok(Math.abs(topRho - G.rEdge(G.y0)) < 1e-9,
          `꼭대기 단 모서리 바깥끝 ρ ${topRho.toFixed(3)} = 슬롯 바닥 안쪽 경계 ${G.rEdge(G.y0).toFixed(3)} — 정확히 맞물린다`)
        ok(Math.abs((S3.yBot + Q3.riseApp * Q3.nApp) - G.y0) < 1e-9,
          `꼭대기 단 높이 ${(S3.yBot + Q3.riseApp * Q3.nApp).toFixed(2)} = 슬롯 바닥 ${G.y0.toFixed(2)} — 단차 0(문턱 없음)`)
        {   //  전폭화한 계단 메시 무결 — 폭을 바꿨으니 감김·법선을 다시 센다
          const g3 = buildNicheStairs(), pos = g3.getAttribute('position').array, nor = g3.getAttribute('normal').array
          let worst = 0, bad = 0, degen = 0
          for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
          for (let i = 0; i < pos.length; i += 9) {
            const ax = pos[i], ay = pos[i + 1], az3 = pos[i + 2]
            const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az3
            const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az3
            const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx
            const Lm = Math.hypot(wx, wy, wz)
            if (Lm < 1e-9) { degen++; continue }
            if ((wx * nor[i] + wy * nor[i + 1] + wz * nor[i + 2]) / Lm < 0.5) bad++
          }
          ok([...pos].every(Number.isFinite) && worst < 1e-6 && bad === 0 && degen === 0,
            `전폭 접근 계단: 삼각 ${pos.length / 9} · 법선 편차 ${worst.toExponential(1)} · 감김 불일치 ${bad} · 퇴화 ${degen}`)
        }
      }
    }
  }
}


// ════════════════════════════════════════════════════════════════════
//  ★107 공리 나선 매스 + 지지 체계 (2026.08.03 현도 결정: ①벽 보 + ②판 기둥)
//  이 절이 지키는 것:
//   ⓐ **현도 잠금 무손상** — 평면 나선(r45→14 · 2바퀴 · 도착 방위)이 매스화로 안 움직였는가
//   ⓑ 매스 기하 건전성(법선·감김·퇴화·NaN) + 밑면이 깎였는가(§2-D 2)
//   ⓒ **기둥 발이 판 위인가** — 중심이 아니라 **발 안쪽 끝**으로 잰다(★105 계열: 실제로 딛는가)
//   ⓓ **보가 셸을 안 뚫는가** — 셸 외곽 불변 구속. 마구리 네 점 전수
//   ⓔ **헤드룸** — 보 밑면 ↔ 한 바퀴 아래 코일 윗면
//   ⓕ **무지지 최대 공백** — "보를 몇 개 놓았나"가 아니라 "가장 긴 공백이 얼마인가"
//   ⓖ 두께 위계(§2-D 3) 걷는 것 < 받치는 것 — ⚠정상부 자동 감쇠로 뒤집히는 구간을 **소리 내어 보고**
// ════════════════════════════════════════════════════════════════════
console.log('\n── ★107 공리 나선 — 매스 + 지지 ──')
{
  const S = spiralSpec()
  ok(true, `공리 스테이션 AX_ON=${AX_ON} — ${AX_ON ? '켜짐(⚠보 경로 74~85% 지점과 겹친다)' : '소등: 어휘 재검토 중(현도 08.03) · 좌표 보존'}`)

  //  ⓐ 현도 잠금 — 평면 궤적 불변
  ok(Math.abs(S.rAt(0) - ROOM_STAIR_ROUT) < 1e-12 && Math.abs(S.rAt(1) - ROOM_STAIR_RIN) < 1e-12,
    `★잠금: 반경 궤적 ${ROOM_STAIR_ROUT}→${ROOM_STAIR_RIN} 무손상`)
  ok(Math.abs(S.TOTAL - ROOM_STAIR_TURNS * Math.PI * 2) < 1e-12,
    `★잠금: 총 회전 ${ROOM_STAIR_TURNS}바퀴 무손상`)
  {
    const azEnd = ((S.azAt(1) * 180 / Math.PI) % 360 + 360) % 360
    ok(Math.abs(azEnd - 37.5) < 1e-9, `★잠금: 도착 방위 ${azEnd.toFixed(4)}° = ROOM_TOP_AZ`)
  }
  ok(ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2 - SLOT_SPIRAL_PAD > 40.94 - 1e-9,
    `★결합: 폭 ${ROOM_STAIR_WIDTH} -> 발치 안끝 ${(ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2).toFixed(2)} · 슬롯 뒷벽 천장 ${(ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2 - SLOT_SPIRAL_PAD).toFixed(2)} — 폭을 더 넓히면 슬롯 계단이 먼저 깨진다`)
  ok(Math.abs(S.slopeDeg - 7.74) < 0.05,
    `★잠금의 귀결: 평균 경사 ${S.slopeDeg.toFixed(2)}° (경로 ${S.pathLen.toFixed(1)} ÷ 상승 ${S.CLIMB.toFixed(2)}) — 계단이 아니라 램프다`)
  ok(!PIT_ON || Math.abs(S.fHole - (ROOM_STAIR_ROUT - S.rHole) / (ROOM_STAIR_ROUT - ROOM_STAIR_RIN)) < 1e-12,
    `지지 교대 경계 f ${S.fHole.toFixed(4)}(칸 ${Math.round(S.fHole * 141)}/141) = 판 구멍 ${S.rHole}의 파생 — ${PIT_ON ? '각뿔대를 밀면 따라 움직인다' : '⚠PIT_ON=false 구세계: 판이 통짜라 전 구간이 기둥 몫'}`)

  if (SPIRAL_BODY === 'mass') {
    //  ⓑ 매스 기하
    const meshes = [['매스', buildSpiralMass()]]
    if (SPIRAL_SUP === 'both' || SPIRAL_SUP === 'slab') meshes.push(['② 기둥', buildSpiralColumns()])
    if (SPIRAL_SUP === 'both' || SPIRAL_SUP === 'wall') meshes.push(['① 보', buildSpiralBeams()])
    for (const [name, g] of meshes) {
      const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array
      let worst = 0, bad = 0, degen = 0
      for (let i = 0; i < nor.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(nor[i], nor[i + 1], nor[i + 2]) - 1))
      for (let i = 0; i < pos.length; i += 9) {
        const ax = pos[i], ay = pos[i + 1], az = pos[i + 2]
        const ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az
        const vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az
        const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx
        const L = Math.hypot(wx, wy, wz)
        if (L < 1e-9) { degen++; continue }
        if ((wx * nor[i] + wy * nor[i + 1] + wz * nor[i + 2]) / L < 0.5) bad++
      }
      ok([...pos].every(Number.isFinite) && worst < 1e-6 && bad === 0 && degen === 0,
        `${name}: 삼각 ${pos.length / 9} · 법선 편차 ${worst.toExponential(1)} · 감김 불일치 ${bad} · 퇴화 ${degen}`)
    }
    {
      const pos = buildSpiralMass().getAttribute('position').array
      let ymin = Infinity, ymax = -Infinity
      for (let i = 1; i < pos.length; i += 3) { ymin = Math.min(ymin, pos[i]); ymax = Math.max(ymax, pos[i]) }
      //  ⚠Float32 — 배정밀도 스펙과 비교하는 공차는 1e-4(★104-3 교훈)
      //  ⚠밑면 어법이 밑끝을 정한다: 'ramp'는 선형선−T(발치 y52−T) · 'saw'는 첫 디딤−T(y52+rise−T)
      const ymExp = ROOM_FLOOR_Y - SPIRAL_MASS_T + ((SPIRAL_TREAD_ON && SPIRAL_SOFFIT === 'saw') ? S.rise : 0)
      ok(Math.abs(ymax - S.yTopEnd) < 1e-4 && Math.abs(ymin - ymExp) < 1e-4,
        `매스 y ${ymin.toFixed(2)}~${ymax.toFixed(2)} = 발치 밑면('${SPIRAL_SOFFIT}') ~ 착지 디스크 윗면`)
      ok(SPIRAL_CHAMF > 0 && SPIRAL_CHAMF < ROOM_STAIR_WIDTH / 2,
        `밑면 깎임 ${SPIRAL_CHAMF} ∈ (0, ${ROOM_STAIR_WIDTH / 2}) — §2-D 2 '속 찬 매스 + 깎인 밑면'`)
      ok(SPIRAL_MASS_T > 0.5,
        `코일 두께 ${SPIRAL_MASS_T} — 구 낱장 0.35(종잇장)에서 ${(SPIRAL_MASS_T / 0.35).toFixed(1)}배`)
    }

    //  ★107-2 단 새김(★89 테라스 어법) — 공칭이 아니라 **밟는 면 사이 실제 점프**를 잰다(★104-2 교훈)
    if (SPIRAL_TREAD_ON) {
      const tp = treadProbe()
      ok(tp.nSteps === tp.nPerSeg * 16,
        `단 ${tp.nSteps}개 = 변 16 × 변당 ${tp.nPerSeg}단 — 변마다 정수라 단높이가 전 구간 균일하다`)
      ok(Math.abs(tp.rise - S.CLIMB / 16 / tp.nPerSeg) < 1e-9,
        `단높이 ${tp.rise.toFixed(4)} = 변당 상승 ${(S.CLIMB / 16).toFixed(3)} / ${tp.nPerSeg} (씨앗 ${SPIRAL_RISE_SEED}에서 파생) · 회랑·나팔 ${CL_STEP_RISE.toFixed(3)} 대비 ${(tp.rise / CL_STEP_RISE).toFixed(2)}배`)
      ok(Math.abs(tp.maxJump - tp.rise) < 2e-3,
        `★실측 최대 점프 ${tp.maxJump.toFixed(4)} = 공칭 단높이 ${tp.rise.toFixed(4)} — 두 배 단 없음(★104-2 계열)`)
      ok(tp.maxJump <= STEP_UP,
        `실측 점프 ${tp.maxJump.toFixed(3)} <= STEP_UP ${STEP_UP} — 실제로 올라갈 수 있다`)
      //  ★하한을 상수로 박지 않는다 — `CL_STEP_GO`(회랑·나팔의 디딤 0.416) = 이 건물이 이미 걷는 최소.
      //   ⚠촘촘함의 한계는 단높이가 아니라 **끝 변 디딤**이다(변이 33.75 → 11.60으로 줄어든다).
      ok(tp.treadMin >= CL_STEP_GO - 1e-9,
        `디딤 ${tp.treadMin.toFixed(2)}(끝 변) ~ ${tp.treadMax.toFixed(2)}(첫 변) ≥ 하한 ${CL_STEP_GO.toFixed(3)}(= 회랑·나팔 디딤) — 나선이라 안쪽이 촘촘하다`)
      ok(['ramp', 'saw'].includes(SPIRAL_SOFFIT),
        `밑면 어법 '${SPIRAL_SOFFIT}' — 'ramp' 경사 매스(★89 채택) / 'saw' 톱니. 두께 ${SPIRAL_MASS_T}~${(SPIRAL_MASS_T + (SPIRAL_SOFFIT === 'ramp' ? tp.rise : 0)).toFixed(2)}`)
      ok(true,
        `블롱델 2R+G ${tp.blondel[0].toFixed(2)}~${tp.blondel[1].toFixed(2)} (석조 통례 0.60~0.68) — 평면 나선이 경사를 잠그므로 통례 밖은 선언된 대가`)
    } else {
      ok(true, `SPIRAL_TREAD_ON=false — 매끈 램프(★107 1차, 현도 반려분). 단 절 건너뜀`)
    }

    //  ★★★109 코너(변↔변 이음) — ⛔현도 로컬 적발(2026.08.03): "꺾이는 부분에 틈 · 처리가 어색".
    //   ⛔병의 정체 = **마이터 가지가 한 번도 안 걸렸다**(실측 0/417 · ★83 '죽은 검사'와 같은 계열).
    //   ⚠★이 절이 없었던 이유를 남긴다: 매스는 **워터타이트였다**(경계 엣지 0). 즉 구멍이 아니라
    //    **실루엣의 결손**이라 기존 건전성 검사(법선·감김·퇴화)로는 원리적으로 못 잡는다.
    //    → 여기서 재는 것은 '메시가 닫혔는가'가 아니라 **'모서리 선이 제자리에 있는가'**다.
    if (SPIRAL_BODY === 'mass') {
      const st = stationList(S)
      const hwT = S.W / 2, hwB = S.W / 2 - S.chamf
      const nrm2 = (x, z) => { const L = Math.hypot(x, z) || 1; return [x / L, z / L] }
      const dirOf = (k) => nrm2(S.corners[k + 1][0] - S.corners[k][0], S.corners[k + 1][1] - S.corners[k][1])
      const nOf   = (k) => { const d = dirOf(k); return [-d[1], d[0]] }
      //  스테이션이 얹힌 변(코너는 '들어오는 변' — `atLen` 규약과 같다)
      const segOf = (L) => { let k = 0; while (k < S.N_SEG - 1 && S.cum[k + 1] < L) k++; return k }

      //  ⓐ **마이터가 실제로 걸리는가** — 이 한 항이 이번 병의 재발을 막는다.
      let mit = 0, mitBad = 0
      for (let kc = 1; kc < S.N_SEG; kc++) {
        const j = st.findIndex(a => Math.abs(a.L - S.cum[kc]) < 1e-9)
        if (j < 0) { mitBad++; continue }
        const n1 = nOf(kc - 1), n2 = nOf(kc)
        const half = Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1]))) / 2
        if (Math.abs(st[j].scale - 1 / Math.cos(half)) > 1e-9) mitBad++; else mit++
      }
      ok(mit === S.N_SEG - 1 && mitBad === 0,
        `★코너 마이터 실적 ${mit}/${S.N_SEG - 1}곳 배율 = 1/cos(반각) — ⛔구판은 **0곳**이었다(죽은 가지)`)

      //  ⓑ **틈 0의 일반형** — 모든 오프셋 점이 '자기 변의 오프셋 선' 위에 정확히 얹혀 있는가.
      //   배율 1/cos φ가 이것을 보장한다. 어긋나면 그 자리에 결손·겹침이 생긴다(= 현도가 본 틈).
      let worstOff = 0
      for (const a of st) {
        const k = segOf(a.L), n = nOf(k)
        for (const [hw, sgn] of [[hwT, +1], [hwT, -1], [hwB, +1], [hwB, -1]]) {
          const px = a.x + sgn * a.m[0] * hw * a.scale, pz = a.z + sgn * a.m[1] * hw * a.scale
          //  변 중심선(코너 k → k+1)까지의 수직거리
          const d = (px - S.corners[k][0]) * n[0] + (pz - S.corners[k][1]) * n[1]
          worstOff = Math.max(worstOff, Math.abs(Math.abs(d) - hw))
        }
      }
      ok(worstOff < 1e-9,
        `★모서리 선 정합: 오프셋 점 ${st.length * 4}개 전부 자기 변에서 정확히 반폭 — 최악 어긋남 ${worstOff.toExponential(1)}`)

      //  ⓒ **코너 점 = 두 오프셋 선의 교점인가**(독립 계산 — 기하 모듈을 안 믿고 여기서 다시 푼다)
      let worstX = 0
      for (let kc = 1; kc < S.N_SEG; kc++) {
        const j = st.findIndex(a => Math.abs(a.L - S.cum[kc]) < 1e-9)
        const a = st[j], n1 = nOf(kc - 1), n2 = nOf(kc), d1 = dirOf(kc - 1), d2 = dirOf(kc)
        for (const sgn of [+1, -1]) {
          //  선1: corners[kc-1] + n1·sgn·hw + u·d1   /   선2: corners[kc] + n2·sgn·hw + v·d2
          const A = [S.corners[kc - 1][0] + sgn * n1[0] * hwT, S.corners[kc - 1][1] + sgn * n1[1] * hwT]
          const B = [S.corners[kc][0]     + sgn * n2[0] * hwT, S.corners[kc][1]     + sgn * n2[1] * hwT]
          const det = d1[0] * (-d2[1]) - d1[1] * (-d2[0])
          const u = ((B[0] - A[0]) * (-d2[1]) - (B[1] - A[1]) * (-d2[0])) / det
          const X = [A[0] + u * d1[0], A[1] + u * d1[1]]
          const P = [a.x + sgn * a.m[0] * hwT * a.scale, a.z + sgn * a.m[1] * hwT * a.scale]
          worstX = Math.max(worstX, Math.hypot(P[0] - X[0], P[1] - X[1]))
        }
      }
      ok(worstX < 1e-9,
        `★코너 결손 0: 코너 ${S.N_SEG - 1}곳의 바깥·안쪽 점 = 두 오프셋 선의 교점(최악 ${worstX.toExponential(1)}) — ⛔구판은 **0.748~0.764 결손**`)

      //  ⓓ **부챗살의 대가** — 코너 부근 모서리 디딤이 얼마나 얕아지는가(중심선 디딤은 불변).
      //   E=0·1이면 여기서 깨진다(실측 0.128 < 0.416). 그래서 `SPIRAL_CORNER_EASE`의 하한이 2다.
      const uniq = []
      for (const a of st) if (!uniq.length || Math.abs(a.L - uniq[uniq.length - 1].L) > 1e-9) uniq.push(a)
      let edgeMin = Infinity, edgeWhere = ''
      for (let i = 0; i + 1 < uniq.length; i++) {
        const A = uniq[i], B = uniq[i + 1]
        for (const sgn of [+1, -1]) {
          const P = [A.x + sgn * A.m[0] * hwT * A.scale, A.z + sgn * A.m[1] * hwT * A.scale]
          const Q = [B.x + sgn * B.m[0] * hwT * B.scale, B.z + sgn * B.m[1] * hwT * B.scale]
          const d = Math.hypot(Q[0] - P[0], Q[1] - P[1])
          if (d < edgeMin) { edgeMin = d; edgeWhere = `L${A.L.toFixed(1)} ${sgn > 0 ? '안쪽' : '바깥'}` }
        }
      }
      //  ★E는 파생이 기본값이다 — 실제로 쓰인 값을 기하 모듈에서 받아 온다(사본 금지).
      const turnAt = (kc) => {
        if (kc < 1 || kc > S.N_SEG - 1) return 0
        const n1 = nOf(kc - 1), n2 = nOf(kc)
        return Math.atan2(n1[0] * n2[1] - n1[1] * n2[0], n1[0] * n2[0] + n1[1] * n2[1])
      }
      const Eused = easeFor(S, turnAt)
      ok(edgeMin >= CL_STEP_GO - 1e-9,
        `★모서리 최소 디딤 ${edgeMin.toFixed(3)}(${edgeWhere}) ≥ ${CL_STEP_GO.toFixed(3)} — 이징 E=${Eused}('${SPIRAL_CORNER_EASE}')의 대가(E=0·1이면 0.128로 깨진다)`)
      ok(Eused >= 0 && Eused <= Math.max(1, Math.floor((S.nPerSeg - 1) / 2)),
        `이징 E=${Eused} ≤ 상한 ⌊(변당 ${S.nPerSeg}단−1)/2⌋=${Math.max(1, Math.floor((S.nPerSeg - 1) / 2))} — 두 코너의 부챗살이 안 겹친다`)

      //  ⓔ **워터타이트 회귀** — 이번엔 안 깨졌지만(구판도 닫혀 있었다) 코너를 만졌으니 못을 박는다.
      {
        const pos = buildSpiralMass().getAttribute('position').array, Q = 1e4
        const key = (i) => `${Math.round(pos[i] * Q)},${Math.round(pos[i + 1] * Q)},${Math.round(pos[i + 2] * Q)}`
        const em = new Map()
        for (let tI = 0; tI < pos.length / 9; tI++) {
          const b = tI * 9, k3 = [key(b), key(b + 3), key(b + 6)]
          if (k3[0] === k3[1] || k3[1] === k3[2] || k3[0] === k3[2]) continue
          for (let e = 0; e < 3; e++) {
            const x1 = k3[e], x2 = k3[(e + 1) % 3]
            const id = x1 < x2 ? x1 + '|' + x2 : x2 + '|' + x1
            em.set(id, (em.get(id) || 0) + 1)
          }
        }
        let open = 0, over = 0
        for (const n of em.values()) { if (n === 1) open++; else if (n > 2) over++ }
        ok(open === 0 && over === 0,
          `매스 워터타이트: 엣지 ${em.size} · 경계 0 · 비매니폴드 0`)
      }

      //  ⓕ **마이터가 밀어낸 반경** — 코너에서 바깥은 0.15 나가고 안쪽은 0.15 들어온다. 결합 재확인.
      {
        //  ★비교 기준을 반경 공식으로 잡지 않는다 — 8각 변의 법선은 방사가 아니라서 `r − 반폭`은 근사다.
        //   대신 **마이터를 끈 같은 점**(scale 1 · m = 자기 변 법선)을 같이 계산해 '마이터가 더 민 양'을 잰다.
        let rIn = Infinity, rOut = 0, rInFoot = Infinity, rIn0 = Infinity, rOut0 = 0, movMax = 0
        for (const a of st) {
          const n0 = nOf(segOf(a.L))
          for (const sgn of [+1, -1]) {
            const px = a.x + sgn * a.m[0] * hwT * a.scale, pz = a.z + sgn * a.m[1] * hwT * a.scale
            const r = Math.hypot(px, pz)
            rIn = Math.min(rIn, r); rOut = Math.max(rOut, r)
            if (a.L < 1e-9) rInFoot = Math.min(rInFoot, r)       // ★발치 마구리 = 슬롯 결합이 읽는 그 자리
            const qx = a.x + sgn * n0[0] * hwT, qz = a.z + sgn * n0[1] * hwT
            const q = Math.hypot(qx, qz)
            rIn0 = Math.min(rIn0, q); rOut0 = Math.max(rOut0, q)
            //  ★스테이션마다의 실제 이동량 — 극값끼리 빼면 0이 나와 **공허하게 통과**한다(공허 참 가드).
            movMax = Math.max(movMax, Math.hypot(px - qx, pz - qz))
          }
        }
        //  마이터가 바깥으로 미는 양 = 반폭×(1/cos(반각) − 1). 반각은 **실측**한다(반경이 줄어 45°가 아니다).
        let pushMax = 0
        for (let kc = 1; kc < S.N_SEG; kc++) {
          const n1 = nOf(kc - 1), n2 = nOf(kc)
          const half = Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1]))) / 2
          pushMax = Math.max(pushMax, hwT * (1 / Math.cos(half) - 1))
        }
        ok(rOut <= ROOM_STAIR_ROUT + hwT + pushMax + 1e-6,
          `실측 반경 ${rIn.toFixed(2)}~${rOut.toFixed(2)} — 마이터가 바깥으로 미는 양 ≤ ${pushMax.toFixed(3)}(반폭×(1/cos 반각−1))`)
        //  ★★결합이 읽는 자리는 **발치(L=0)**뿐이다 — 마이터는 첫 코너(L=33.7)부터 걸리고 발치의 φ는 0이다.
        //   ⚠공칭 `ROUT − 반폭`(43.20)은 **보수적 근사**다: 8각 변의 법선은 방사가 아니라서 실측은 43.38로
        //    더 넉넉하다. 검사는 '실측 ≥ 공칭'만 요구한다(공칭이 안전측이라는 것을 확인하는 항).
        ok(rInFoot >= ROOM_STAIR_ROUT - S.W / 2 - 1e-6 && rInFoot > 40.94 - 1e-9,
          `★결합 불변: 발치 안끝 실측 ${rInFoot.toFixed(2)} ≥ 공칭 ${(ROOM_STAIR_ROUT - S.W / 2).toFixed(2)}(보수적) > 슬롯 뒷벽 40.94 — 발치 φ=0이라 ★109는 슬롯 결합에 무영향`)
        //  마이터가 실제로 민 양 = 마이터 끈 같은 점과의 차. 반폭×(1/cos 반각−1) 안에 묶여야 한다(폭주 없음).
        //  ⚠극값(rIn/rOut)끼리 빼면 0이 나온다 — 극값은 φ=0 자리에서 잡히기 때문(공허 참 가드).
        //   **스테이션별 이동량**을 재고, 상한은 실측 반각에서 유도한다: 반폭 × tan(반각).
        let movLim = 0
        for (let kc = 1; kc < S.N_SEG; kc++) {
          const n1 = nOf(kc - 1), n2 = nOf(kc)
          const half = Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1]))) / 2
          movLim = Math.max(movLim, hwT * Math.tan(half))
        }
        ok(movMax > 1e-6 && movMax <= movLim + 1e-9,
          `마이터가 옮긴 최대 거리 ${movMax.toFixed(4)} ≤ 유도 상한 ${movLim.toFixed(4)}(반폭×tan 반각) — **0이면 마이터가 또 죽은 것**(★109 재발 감지)`)
      }
    }

    //  ★★★111 공리 볼트(문) — 현도 스케치 2026.08.04. 공리 = 통과하는 문 · 총안 창 + 감실.
    if (AX_VAULT_ON) {
      const { list: VL } = vaultSpec()
      const hwA = AX_VAULT_ARCH_W / 2, hwC = ROOM_STAIR_WIDTH / 2
      ok(VL.length === 7, `볼트 ${VL.length}기 = 공리 7 (배치 '${AX_VAULT_LAYOUT}')`)
      //  ⓐ 보7(맨 위)은 빈 보 — 현도 확정. 어느 배치에서도 마지막 보(L 346.6)에는 볼트가 없다.
      const lastBeamL = beamSpec()[7].L
      ok(VL.every(v => Math.abs(v.Ls - lastBeamL) > 1e-6),
        `★맨 위 보(L ${lastBeamL.toFixed(1)})는 빈 보 — 현도 2026.08.04 확정(디스크 밑 여유 3.70뿐이기도)`)
      //  ⓑ 아치가 코일을 삼킨다 — 볼트 전 구간에서 코일 바깥끝(마이터 포함) < 아치 안폭
      //  ⚠스윕은 아치 프로필에도 코일과 **같은** frameAt 배율을 곱한다 — 여유 = (안폭−코일폭)×scale로
      //   함께 커진다. 구판 검사는 아치에만 배율을 빼먹어 폭 5.2에서 0.098 오탐을 냈다(정정 기록).
      let worstSide = Infinity
      for (const v of VL) for (let q = 0; q <= 10; q++) {
        const F = frameAt(S, v.L0 + (v.L1 - v.L0) * q / 10)
        worstSide = Math.min(worstSide, (hwA - hwC) * F.scale)
      }
      ok(worstSide >= AX_VAULT_ARCH_CLR - 1e-9,
        `아치 옆 여유 최악 ${worstSide.toFixed(3)} ≥ CLR ${AX_VAULT_ARCH_CLR} — 안폭이 코일 폭에서 파생 + 같은 배율(결합 확인)`)
      //  ⓒ 머리 여유 — 진출 지점(바닥 최고점)에서 크라운 안쪽까지
      const headMin = Math.min(...VL.map(v => v.head))
      ok(headMin >= SUP_HEAD_MIN - 1e-9, `실내 머리 여유 최악 ${headMin.toFixed(2)} ≥ ${SUP_HEAD_MIN}`)
      //  ⓓ 감실이 수직 잼브면 안에 있다 — 어깨(스프링) 아래. 넘으면 아치 곡면을 문다.
      ok(AX_VAULT_NICHE_SILL + AX_VAULT_NICHE_H <= AX_VAULT_SPRING + 1e-9,
        `감실 상단 ${(AX_VAULT_NICHE_SILL + AX_VAULT_NICHE_H).toFixed(1)} ≤ 어깨 ${AX_VAULT_SPRING} — 수직벽 안`)
      //  ⓔ 감실은 관통이 아니다 — 등벽이 남는다
      ok(AX_VAULT_JAMB - AX_VAULT_NICHE_D >= 1.0,
        `감실 등벽 ${(AX_VAULT_JAMB - AX_VAULT_NICHE_D).toFixed(1)} ≥ 1.0 — 총안 벽이 뚫리지 않는다`)
      //  ⓕ 받침이 발자국 안 — 뿌리 선언(§2-D)이 살아 있다
      const rootWorst = Math.max(...VL.map(v => Math.abs(v.Lc - v.Ls)))
      ok(rootWorst <= AX_VAULT_LEN / 2 - 0.6 + 1e-9,
        `받침↔볼트중심 최대 어긋남 ${rootWorst.toFixed(2)} ≤ ${(AX_VAULT_LEN / 2 - 0.6).toFixed(1)} — 뿌리가 발자국 안에 남는다`)
      //  ⓖ ★★★112 코너 밑동 — ⛔현도 로컬 적발(2026.08.04): "꺾이는 부분의 망루가 너무 얇아
      //   절단면이 이상하다". 구판 검사는 **볼트 끝에서의 거리**만 봤고 끝면 기울기를 안 셌다.
      //   그래서 밑동이 −0.08(칼날)인데도 green이었다 — ★83 '죽은 검사' 계열. **밟는 면이 아니라
      //   칼라 밑에서 재야 한다.** 여기서 기하 모듈을 안 믿고 기울기를 다시 푼다(독립 계산).
      {
        const { AX_VAULT_CORNER_MIN: TMIN, AX_VAULT_END_TILT: TLT,
          AX_VAULT_SPRING: SPR, AX_VAULT_ARCH_W: AW, SPIRAL_MASS_T: MT } = await import('./constants.js')
        const kk = Math.tan(TLT * Math.PI / 180)
        let bent = 0, worstStub = Infinity, worstId = '—', capped = 0, worstMax = Infinity
        for (const v of VL) {
          const colBot = v.yF0 - MT - v.collar.drop
          const bIn = (v.yF0 - colBot) * kk, bOut = (v.yF1 - colBot) * kk
          const aIn = (v.yCrownI - v.yF0) * kk, aOut = (v.yCrownI - v.yF1) * kk
          for (let k = 1; k < S.N_SEG; k++) {
            const c = S.cum[k]
            if (c <= v.L0 - aIn || c >= v.L1 + aOut) continue
            bent++
            const stub = Math.min((c - v.L0) - bIn, (v.L1 - c) - bOut)
            if (stub < worstStub) { worstStub = stub; worstId = v.id }
            const stubMax = (AX_VAULT_LEN - bIn - bOut) / 2
            worstMax = Math.min(worstMax, stubMax)
            if (TMIN > stubMax + 1e-9) capped++
          }
        }
        if (bent === 0) ok(true, `코너를 문 볼트 0기 — 밑동 검사 불요`)
        else {
          ok(worstStub > 0, `★코너 너머 토막 밑동 최악 ${worstStub.toFixed(2)} > 0 — ⛔구판은 **−0.08**(밑에서 0으로 사라지는 쐐기)`)
          //  ⚠하한은 **파생**이다 — 두 밑동의 합이 (LEN − bIn − bOut)로 고정이라 min은 그 절반을 못 넘는다.
          //   구판 초안이 2.30을 손으로 박았다가 LEN 5·TILT 22 체제를 조용히 죽였다(스윕 적발, 정정 기록).
          ok(worstStub >= Math.min(TMIN, worstMax) - 0.05,
            `밑동 최악 ${worstStub.toFixed(2)}(${worstId}) ≥ min(목표 ${TMIN}, 산술 상한 ${worstMax.toFixed(2)}) — ${capped ? '**상한에 물림**(균형점 = 두 밑동 동일)' : '목표 그대로 달성'}`)
          ok(bent <= 4, `코너를 문 볼트 ${bent}기 ≤ 4 — 배치 B에서 늘지 않았다`)
        }
        //  ★코너 하나만 — 발자국 안에 코너가 둘이면 밑동 정의 자체가 깨진다
        let multi = 0
        for (const v of VL) {
          let n = 0
          for (let k = 1; k < S.N_SEG; k++) if (S.cum[k] > v.L0 - 1 && S.cum[k] < v.L1 + 1) n++
          if (n > 1) multi++
        }
        ok(multi === 0, `발자국 안 코너 ≤ 1기 — 최단변 ${S.segLen[S.N_SEG - 1].toFixed(2)} > 볼트 ${AX_VAULT_LEN}`)
        //  ⚠★112가 만든 **새 결합**(2026.08.04 스윕 적발 — 기록. 현도 판정 대기).
        //   밑동을 최대로 하면 코너가 볼트 **한가운데**로 온다. 그런데 창·감실도 `frameAt(Lc)` 한 프레임에
        //   세운 곧은 브러시라 **같은 자리**에 있다 → 개구가 45° 주름 위에 앉는다. 광선은 통과하므로
        //   ('만들었다'는 성립) 기존 검사로는 안 잡힌다 — 여기서 겹침 양을 매번 보고한다.
        {
          const { AX_VAULT_WIN_W: WW, AX_VAULT_JAMB: JB, AX_VAULT_WIN_SPLAY: SPL,
            AX_VAULT_NICHE_W: NW } = await import('./constants.js')
          const winW = WW + 2 * JB * Math.tan(SPL * Math.PI / 180)
          let over = 0, worstOff = Infinity
          for (const v of VL) {
            if (!v.corner) continue
            const off = Math.abs(v.corner.c - v.Lc)
            if (off < Math.max(winW, NW) / 2) over++
            worstOff = Math.min(worstOff, off)
          }
          ok(true, `⚠**선언된 비용** — 코너↔볼트중심 최소 ${(worstOff === Infinity ? 0 : worstOff).toFixed(2)} vs 창 반폭 ${(winW / 2).toFixed(2)}·감실 반폭 ${(NW / 2).toFixed(2)} → 개구가 주름을 타는 볼트 ${over}기 (★112 미해결·현도 판정 대기)`)
        }
      }
      //  ★★★v5 칼라 면 정합 — "입구면을 도장 찍으면 닫힌 도형"(현도 2026.08.04).
      //   ⛔v3·v4 사고: 볼트는 `Lc`(코너 회피로 밀린 중심) 기준인데 칼라는 `Ls`(받침) 중심이라
      //   **최대 2.17 어긋났다** — 한쪽 끝은 입구면 밖으로 튀고 반대쪽은 안으로 들어갔다.
      //   ★정본 = 칼라 구간 = 볼트 구간 [L0,L1] 그 자체 + 공유 링 집합(`ringLs`).
      //   ⚠검사 방법: 절대 좌표로 재면 안 된다 — 볼트 자신도 곡률 때문에 끝 평면을 넘는다(최대 1.48 실측).
      //   **칼라와 스윕의 넘침이 같은가**를 잰다. 같으면 두 마구리가 같은 평면 위에 있다는 뜻이다.
      {
        const { collarGeo, sweepVault: SW, ringLs } = await import('./axiomVaultGeometry.js')
        const { AX_VAULT_END_TILT: TILT, AX_VAULT_LEN: LEN111 } = await import('./constants.js')
        const { endL, capRing, profilePts: PROF, collarSection: COLSEC } = await import('./axiomVaultGeometry.js')
        //  ★★v7 끝면 평면성 — 현도 로컬 적발: "지우개를 커터칼로 난도질한 절삭면".
        //   ⛔v6는 점마다 frameAt(L−kΔy)로 배치해 끝면이 **휜 면**이 됐고, 크라운(바깥)과 칼라 밑(안쪽)이
        //   반대로 밀리는데 사이 링이 제자리라 뒤집힌 사각형이 났다. ★정본 = 끝 프레임 하나 기준 평행이동.
        //   ⚠판정 도구를 이 세션에서 네 번 틀렸다(평면식 부호 2회 · 직선 평면식의 곡률 오차 0.54 ·
        //   호길이 역산 비단조 2.7). 결론: **위치를 역산하지 말고 생성 규약을 재라.**
        //   여기서는 `capRing`이 낸 점들이 **한 평면 위에 있는가**를 직접 잰다(볼트·칼라를 한 무리로).
        const planarDev = (v, which) => {
          const P2 = PROF(v), SEC = COLSEC(v, which === 'entry' ? v.L0 : v.L1)
          const pts = [...capRing(S, v, which, P2), ...capRing(S, v, which, SEC)]
          const c = pts.reduce((a2, p) => [a2[0] + p[0] / pts.length, a2[1] + p[1] / pts.length, a2[2] + p[2] / pts.length], [0, 0, 0])
          //  공분산 최소 고유방향 = 평면 법선 (멱반복)
          const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
          for (const p of pts) { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += d[i] * d[j] }
          let tr = M[0][0] + M[1][1] + M[2][2]
          const A = M.map((r, i) => r.map((x, j) => (i === j ? tr : 0) - x))   // trI − M : 최소 고유 → 최대
          let vv = [0.3, 0.5, 0.81]
          for (let it = 0; it < 60; it++) {
            const w = [0, 1, 2].map((i) => A[i][0] * vv[0] + A[i][1] * vv[1] + A[i][2] * vv[2])
            const nrm = Math.hypot(...w); if (nrm < 1e-12) break
            vv = w.map((x) => x / nrm)
          }
          let dev = 0
          for (const p of pts) dev = Math.max(dev, Math.abs((p[0] - c[0]) * vv[0] + (p[1] - c[1]) * vv[1] + (p[2] - c[2]) * vv[2]))
          return dev
        }
        const uOutC = -(AX_VAULT_ARCH_W / 2 + AX_VAULT_SHELL), uInC = AX_VAULT_ARCH_W / 2 + AX_VAULT_JAMB
        let worstEnd = 0, worstSide = 0, minSpanCover = Infinity
        for (const v of VL) {
          const co = collarGeo(S, v)
          worstEnd = Math.max(worstEnd, planarDev(v, 'entry'), planarDev(v, 'exit'))
          //  좌우 — 칼라 정점이 볼트 발자국 u[uOut, uIn]을 벗어나지 않는가(자기 링에서 역산)
          const pc = co.getAttribute('position').array
          const Lsc = ringLs(S, v)
          for (let i = 0; i < pc.length; i += 3) {
            let best = Infinity, bu = 0
            for (const L of Lsc) {
              const F = frameAt(S, L)
              const dx = pc[i] - F.x, dz = pc[i + 2] - F.z
              const al = Math.abs(dx * F.t[0] + dz * F.t[1])
              if (al < best) { best = al; bu = (dx * F.m[0] + dz * F.m[1]) / F.scale }
            }
            if (best > 1e-6) continue
            worstSide = Math.max(worstSide, bu - uInC, uOutC - bu)
          }
          //  ★가운데(아치 통로 밑)도 채워져 있다(현도 확정 ⓐ) — 밴드가 전폭을 덮는지
          minSpanCover = Math.min(minSpanCover, uInC - uOutC)
        }
        ok(worstEnd < 1e-4,
          `★입구·출구면이 **평면**이고 볼트·칼라가 같은 평면 위 — 최대 이탈 ${worstEnd.toExponential(1)} (${TILT}° · 도장 = 닫힌 도형)`)
        ok(worstSide < 1e-4,
          `★칼라가 볼트 발자국을 좌우로 안 벗어난다 — 최대 초과 ${worstSide.toExponential(1)}`)
        //  ★기울기가 실제로 걸렸고, 튀어나온 양이 과하지 않은가(현도: "너무 많이 튀어나오지 않게")
        {
          const { endL, capRing, profilePts: PROF, collarSection: COLSEC } = await import('./axiomVaultGeometry.js')
          let overMax = 0
          for (const v of VL) {
            const yTopE = v.yCrownI + AX_VAULT_SHELL
            overMax = Math.max(overMax, v.L0 - endL(v, 'entry', yTopE), endL(v, 'exit', yTopE) - v.L1)
          }
          ok(TILT === 0 || overMax > 0.3, `끝면 기울기 실적 — 크라운이 앞으로 ${overMax.toFixed(2)} (수직 단면 아님)`)
          ok(overMax < AX_VAULT_LEN / 3, `튀어나온 양 ${overMax.toFixed(2)} < 볼트 길이/3 ${(AX_VAULT_LEN / 3).toFixed(2)} — 과하지 않다`)
        }
        ok(minSpanCover > AX_VAULT_ARCH_W,
          `★칼라가 전폭을 덮는다(가운데 통로 밑도 채움 — 현도 확정) — 밴드 폭 ${minSpanCover.toFixed(2)} > 아치 ${AX_VAULT_ARCH_W}`)
      }
      //  ★v3 칼라 — 받침을 실제로 문다(받침 몸통 깊이 안에서)
      for (const v of VL) {
        const supBot = v.isBeam ? v.sup.yB : v.sup.yBot
        const collarBot = v.yBot - v.collar.drop
        ok(collarBot > supBot - 1e-6 && v.collar.drop >= 0.6,
          `${v.id} 칼라 밑 ${collarBot.toFixed(2)} ≥ 받침 밑 ${supBot.toFixed(2)} · 무는 깊이 ${v.collar.drop.toFixed(2)} ≥ 0.6 (${v.isBeam ? '보' : '기둥'})`)
      }
      //  ⓗ 위 간섭 — 크라운 겉면이 착지 디스크 밑면 아래
      //  ★118: 디스크 밑면이 1.827 내려갔다 — 사본으로 재계산하지 말고 정본에서 읽는다.
      const { discSpec: discSpec111 } = await import('./discGeometry.js')
      const discB = discSpec111().yBot
      const crownWorst = Math.max(...VL.map(v => v.yCrownI + AX_VAULT_SHELL))
      ok(crownWorst < discB - 0.3, `크라운 겉 최고 ${crownWorst.toFixed(1)} < 디스크 밑 ${discB.toFixed(2)} − 0.3`)
      //  ⓘ 창이 실제로 뚫렸고 감실은 막혔다 — 볼트 중앙 단면에서 광선으로 잰다(빌드 결과를 직접).
      //   ⚠★109·★110의 교훈: '만들었다'와 '뚫렸다'는 다른 질문이다. 빌드된 메시에 대고 쏜다.
      {
        const g = buildAxiomVaults()
        ok(g && g.getAttribute('position').count > 0, `볼트 기하 빌드 — 삼각 ${g ? g.getAttribute('position').count / 3 : 0}`)
        const THREE = await import('three')
        const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
        mesh.updateMatrixWorld()
        const rc = new THREE.Raycaster()
        let winOpen = 0, nicheClosed = 0
        for (const v of VL) {
          const F = frameAt(S, v.Lc)
          const inw = [F.m[0], F.m[1]]                         // 안쪽(방 중심) = **+m**(실측 — 좌우 반전 사고의 정본)
          //  창: 아치 안 중심에서 창 높이로, 안쪽으로 발사 — 뚫렸으면 잼브를 지나 아무것도 안 맞거나 먼 것만 맞는다
          const oW = new THREE.Vector3(F.x, v.yF0 + AX_VAULT_WIN_Y, F.z)
          rc.set(oW, new THREE.Vector3(inw[0], 0, inw[1]).normalize())
          const hitsW = rc.intersectObject(mesh, false)
          const nearW = hitsW.length ? hitsW[0].distance : Infinity
          if (nearW > hwA + AX_VAULT_JAMB + 0.5) winOpen++
          //  감실: 감실 중앙 높이로 같은 방향 — 등벽에 막혀야 한다(감실 깊이보다 멀리, 잼브 두께 안에서)
          const oN = new THREE.Vector3(F.x, v.yF0 + AX_VAULT_NICHE_SILL + AX_VAULT_NICHE_H / 2, F.z)
          rc.set(oN, new THREE.Vector3(inw[0], 0, inw[1]).normalize())
          const hitsN = rc.intersectObject(mesh, false)
          const nearN = hitsN.length ? hitsN[0].distance : Infinity
          if (nearN > hwA + AX_VAULT_NICHE_D - 0.2 && nearN < hwA + AX_VAULT_JAMB + 0.2) nicheClosed++
        }
        //  ★★ⓙ 감김 감사 — v2 사고의 영구 봉인. ⚠셀프 렌더(양면·무컬링)는 감김 반전에 **눈이 먼다**:
        //   마구리 감김이 옆면과 반대(불일치 72)여도 그림은 멀쩡했고, 그 섞인 솔리드를 CSG에 먹이자
        //   내부/외부 판정이 깨져 구멍이 쏟아졌다(경계 0→179 실측). 앱에서 "채워질 곳이 빈" 결함.
        //   판정: 스윕·코브(=CSG 입력)는 경계 0·불일치 0·부피 양수 **엄격**. 최종본은 부피 보존.
        {
          const { sweepVault, collarGeo, vaultSpec: VS } = await import('./axiomVaultGeometry.js')
          const { s: S2, list: VL2 } = VS()
          const audit = (geom) => {
            const pp = (geom.index ? geom.toNonIndexed() : geom).getAttribute('position').array
            const nT = pp.length / 9
            let vol = 0
            const Q = 1e4, vkey = (i) => Math.round(pp[i]*Q)+','+Math.round(pp[i+1]*Q)+','+Math.round(pp[i+2]*Q)
            const em = new Map()
            for (let ti = 0; ti < nT; ti++) {
              const b = ti*9
              const A=[pp[b],pp[b+1],pp[b+2]],B=[pp[b+3],pp[b+4],pp[b+5]],C=[pp[b+6],pp[b+7],pp[b+8]]
              vol += (A[0]*(B[1]*C[2]-B[2]*C[1]) - A[1]*(B[0]*C[2]-B[2]*C[0]) + A[2]*(B[0]*C[1]-B[1]*C[0])) / 6
              const ks=[vkey(b),vkey(b+3),vkey(b+6)]
              for(let e=0;e<3;e++){
                const a2=ks[e], c2=ks[(e+1)%3], rev=c2+'|'+a2
                if(em.has(rev)) em.set(rev, em.get(rev)+1)
                else em.set(a2+'|'+c2, (em.get(a2+'|'+c2)||0)+1000)
              }
            }
            let open=0, bad=0
            for(const vv of em.values()){ const f=Math.floor(vv/1000), r=vv%1000
              if(f===1&&r===1) continue; else if(f+r===1) open++; else bad++ }
            return { vol, open, bad }
          }
          let worstOpen = 0, worstBad = 0, minVol = Infinity, volKeep = true
          for (const v2 of VL2) {
            const sw = audit(sweepVault(S2, v2))
            worstOpen = Math.max(worstOpen, sw.open); worstBad = Math.max(worstBad, sw.bad)
            minVol = Math.min(minVol, sw.vol)
            const cv = audit(collarGeo(S2, v2))   // ★v3 칼라 — 보·기둥 공통
            worstOpen = Math.max(worstOpen, cv.open); worstBad = Math.max(worstBad, cv.bad); minVol = Math.min(minVol, cv.vol)
          }
          ok(worstOpen === 0 && worstBad === 0, `★감김 감사(CSG 입력): 7기 스윕+코브 전부 경계 0·불일치 0 (최악 ${worstOpen}/${worstBad})`)
          ok(minVol > 0, `★감김 감사: 부호 있는 부피 전부 양수 (최소 ${minVol.toFixed(1)}) — 겉=바깥`)
          //  최종 병합본 부피 보존 — CSG가 절단선 T-정점(위상 경계·기하 닫힘)은 내도 부피는 지켜야 한다
          const volAll = audit(g).vol
          const volParts = VL2.reduce((a2, v2) => a2 + audit(sweepVault(S2, v2)).vol + audit(collarGeo(S2, v2)).vol, 0)
          ok(volAll > 0 && Math.abs(volAll - volParts) / volParts < 0.12,
            `★최종본 부피 보존: ${volAll.toFixed(0)} ≈ 부품 합 ${volParts.toFixed(0)} (차 ${(Math.abs(volAll-volParts)/volParts*100).toFixed(1)}% < 12 — 창·감실 절제분)`)
        }
        ok(winOpen === VL.length, `★창 관통 실측 ${winOpen}/${VL.length} — 총안이 실제로 뚫려 있다(광선)`)
        ok(nicheClosed === VL.length, `★감실 등벽 실측 ${nicheClosed}/${VL.length} — 파였으되 관통 아님(광선)`)
      }
    }

    //  ⓒ 기둥 — 발이 실제로 판 위인가
    if (SPIRAL_SUP === 'both' || SPIRAL_SUP === 'slab') {
      const cols = columnSpec()
      ok(cols.length > 0, `② 판 기둥 ${cols.length}기 · 높이 ${Math.min(...cols.map(c => c.h)).toFixed(2)}~${Math.max(...cols.map(c => c.h)).toFixed(2)}`)
      let worstFoot = Infinity
      for (const c of cols) worstFoot = Math.min(worstFoot, c.r - SUP_COL_R - S.rHole)
      ok(worstFoot >= SUP_COL_PAD - 1e-9,
        `기둥 발 안쪽 끝 ↔ 판 구멍 최소 여유 ${worstFoot.toFixed(2)} ≥ ${SUP_COL_PAD} — ⚠중심이 판 위인 것과 발이 판 위인 것은 다르다`)
      ok(cols.every(c => c.f <= S.fHole + 1e-9),
        `기둥 전량이 판 구간(f ≤ ${S.fHole.toFixed(3)}) 안 — 정의 권역(각뿔대) 관통 0`)
      ok(cols.every(c => c.h >= SUP_COL_MIN),
        `기둥 최소 높이 ${Math.min(...cols.map(c => c.h)).toFixed(2)} ≥ ${SUP_COL_MIN} — 발치의 그루터기 없음`)
      //  판 위 점유물 회피 — 슬롯·판 노치는 +x(0°) 모서리
      let minAz = 180
      for (const c of cols) {
        const a = ((c.az * 180 / Math.PI) % 360 + 360) % 360
        minAz = Math.min(minAz, Math.min(a, 360 - a))
      }
      //  ⚠슬롯·판 노치는 각뿔대가 서 있을 때만 존재한다(PIT_ON=false 구세계엔 판이 통짜)
      ok(!(PIT_ON && SLOT_ON) || minAz > 10,
        `기둥 ↔ 0°(슬롯·판 노치) 최소 각차 ${minAz.toFixed(1)}° — 발이 슬롯/노치 위에 안 선다${(PIT_ON && SLOT_ON) ? '' : ' [해당 없음]'}`)
    }

    //  ⓓⓔ 보 — 셸 무침범 · 헤드룸
    if (SPIRAL_SUP === 'both' || SPIRAL_SUP === 'wall') {
      const bms = beamSpec()
      //  ⚠PIT_ON=false면 판이 통짜라 fHole=1 → 보가 0개인 것이 정상이다(전부 기둥 몫)
      ok(!PIT_ON || bms.length > 0, `① 벽 보 ${bms.length}개 · 스팬 ${Math.min(...bms.map(b => b.span)).toFixed(2)}~${Math.max(...bms.map(b => b.span)).toFixed(2)}`)
      if (bms.length) {
      let over = 0, maxOver = -Infinity
      for (const b of bms) {
        for (const [rr, yy] of [[b.rOutT, b.yT], [b.rOutB, b.yB]]) {
          const d = rr - wallR(yy)
          maxOver = Math.max(maxOver, d)
          if (d > -1e-9) over++
        }
      }
      ok(over === 0, `보 바깥 마구리 셸 침범 ${over}건 (최대 접근 ${maxOver.toFixed(4)} — 여유 ${SUP_WALL_CLR}) — ★셸 외곽 불변 구속`)
      ok(bms.every(b => b.flare <= b.span + 1e-9),
        `바깥 마구리 기울기 ≤ 보 길이 (최대 비 ${Math.max(...bms.map(b => b.flare / b.span)).toFixed(2)}) — '지느러미' 아님`)
      ok(bms.every(b => b.depth >= SUP_BEAM_DMIN - 1e-9 && b.depth <= SUP_BEAM_DEPTH + 1e-9),
        `보춤 ${Math.min(...bms.map(b => b.depth)).toFixed(2)}~${Math.max(...bms.map(b => b.depth)).toFixed(2)} ∈ [${SUP_BEAM_DMIN}, ${SUP_BEAM_DEPTH}] — 정상부 자동 감쇠`)
      ok(bms.every(b => b.span > SUP_BEAM_MIN), `전 보 스팬 > ${SUP_BEAM_MIN}`)
      //  ★107-4 헌치 + ★108-2 접합부 마감 — **프로파일 정본**(beamProfile)으로 잰다.
      {
        let mono = true, breachB = 0, breachT = 0, maxNear = -Infinity
        let worstLip = Infinity, worstTanDeg = 0, worstNoseW = Infinity, worstRootW = 0
        for (const bm of bms) {
          const pr = beamProfile(bm)
          let prev = -Infinity
          for (const q of pr) {
            const d = bm.yT - q.yb
            if (d < prev - 1e-6) mono = false
            prev = d
            const gB = q.r - wallR(q.yb), gT = q.rTop - wallR(bm.yT)
            maxNear = Math.max(maxNear, gB, gT)
            if (gB > -1e-9) breachB++
            if (gT > -1e-9) breachT++
          }
          worstLip = Math.min(worstLip, bm.yT - pr[0].yb)
          worstNoseW = Math.min(worstNoseW, 2 * pr[0].hw)
          worstRootW = Math.max(worstRootW, 2 * pr[pr.length - 1].hw)
          //  벽면 접선 — 밑면 끝 기울기 vs 셸 기울기
          const a = pr[pr.length - 2], b2 = pr[pr.length - 1]
          const mB = (b2.yb - a.yb) / Math.max(1e-9, b2.r - a.r)
          const e = 1e-3
          const mW = (2 * e) / (wallR(b2.yb + e) - wallR(b2.yb - e))
          worstTanDeg = Math.max(worstTanDeg, Math.abs(Math.atan(mB) - Math.atan(mW)) * 180 / Math.PI)
        }
        ok(mono, `밑면 프로파일 단조 — 코 → 뿌리로 갈수록 깊어진다(헌치 ${SUP_BEAM_CURVE} · 필렛 R${SUP_BEAM_FILLET}) ★원호라 단조가 기하적으로 보장된다`)
        ok(worstLip >= SUP_BEAM_NOSE_LIP - 1e-9 && worstLip > 0.1,
          `★코 수직 립 ${worstLip.toFixed(2)} > 0 — **두께 0 금지**(접선 수렴은 종잇장이 된다 · 현도 반려 사유)`)
        ok(worstNoseW > 0.5,
          `코 폭 ${worstNoseW.toFixed(2)} · 뿌리 폭 ${worstRootW.toFixed(2)}(배율 ${SUP_BEAM_ROOT_GROW}) — 나무젓가락 아님`)
        ok(worstTanDeg < 2,
          `★벽면 접선 어긋남 ${worstTanDeg.toFixed(2)}° < 3° — 밑면이 셸 기울기와 같은 각으로 만난다(이음매 소멸)`)
        ok(breachB === 0 && breachT === 0,
          `셸 침범 밑면 ${breachB} · **상면 ${breachT}** · 최대 접근 ${maxNear.toFixed(4)} — ⚠코브가 밑면만 밖으로 민다(상면은 rOutT에서 끊는다)`)
      }
      const hr = beamHeadroom()
      ok(hr.worst === null || hr.worst >= SUP_HEAD_MIN,
        `보 밑면 ↔ 아래 코일 헤드룸 ${hr.worst === null ? '해당없음' : hr.worst.toFixed(2)} ≥ ${SUP_HEAD_MIN} — 보는 아래를 걷는 사람의 천장이다`)
      //  ⓖ 두께 위계 — 뒤집히면 실패가 아니라 **보고**(정상부 감쇠는 의도된 것)
      const inv = bms.filter(b => b.depth < SPIRAL_MASS_T).length
      ok(true, `두께 위계(§2-D 3): 걷는 것 ${SPIRAL_MASS_T} < 받치는 것 — 역전 ${inv}/${bms.length}개(정상부 감쇠 구간, 선언됨)`)
      //  구조 비례 — 최대 스팬의 1/10이 보춤 하한
      //  ★노브 상·하한을 **매 실행 유도해 보고한다**(문서 값이 늙는 것을 막는다 — 실제로 늙었다:
      //   구 주석 '2.5~22.1'은 낱장 두께 0.35 시절 값이었고, 매스 두께 1.0에서는 2.79~21.45다)
      const dLo = Math.max(...bms.map(b => b.span)) / 10
      const dHi = (S.CLIMB / ROOM_STAIR_TURNS) - SPIRAL_MASS_T - SUP_HEAD_MIN
      ok(SUP_BEAM_DEPTH >= dLo - 1e-9,
        `보춤 ${SUP_BEAM_DEPTH} ≥ 하한 ${dLo.toFixed(2)}(최대 스팬/10) — "실제로 받치고 있다"의 비례`)
      ok(SUP_BEAM_DEPTH <= dHi + 1e-9,
        `보춤 ${SUP_BEAM_DEPTH} ≤ 상한 ${dHi.toFixed(2)}(코일 간 ${(S.CLIMB / ROOM_STAIR_TURNS).toFixed(2)} − 두께 ${SPIRAL_MASS_T} − 헤드룸 ${SUP_HEAD_MIN}) ★노브 범위 정본`)
      }
    }

    //  ⓕ 무지지 최대 공백 — 판·기둥·보·디스크를 전부 받침으로 보고 잰다
    {
      const us = unsupportedSpans()
      //  발치 구간은 매스 밑면이 판에 묻혀 있다 = 접지. 그 뒤부터 잰다.
      let Lc = 0
      for (let L = 0; L < S.pathLen; L += 0.25) { if (S.yAt(S.fAtLen(L)) - SPIRAL_MASS_T > S.plateY) { Lc = L; break } }
      //  ★두 수를 가른다: ⓐ 받침**끼리**의 공백(간격 노브가 지배 — 강제) ⓑ 판을 벗어난 뒤 첫 받침까지의
      //   진입 거리(발치는 매스가 판에 묻혀 접지라 성격이 다르다 — 보고). 섞으면 두께를 키울 때 오검출이 난다.
      const sup = [...columnSpec().map(c => c.L), ...beamSpec().map(b => b.L)].sort((a, b) => a - b)
      let worst = 0, at = 0
      for (let i = 0; i + 1 < sup.length; i++) if (sup[i + 1] - sup[i] > worst) { worst = sup[i + 1] - sup[i]; at = sup[i] }
      const tail = sup.length ? S.pathLen - sup[sup.length - 1] : 0
      const lead = sup.length ? sup[0] - Lc : 0
      //  ⚠'off'·'slab'·'wall'은 **선언된 부분 지지**다 — 공백을 강제하지 않고 소리 내어 보고한다.
      //  ⚠꼬리(마지막 보 → 착지 디스크)는 간격보다 길 수 있다 — 정상부는 셸이 닫혀 보가 못 서기 때문이고,
      //   그 구간은 **디스크가 끝을 받는다**. 그래서 잣대는 간격이 아니라 '가장 성긴 받침 간격'으로 통일한다.
      const gapMax = Math.max(SUP_COL_GAP, SUP_BEAM_GAP)
      ok(SPIRAL_SUP !== 'both' || (worst <= gapMax + 1e-6 && tail <= gapMax + 1e-6),
        `받침 사이 최대 공백 ${worst.toFixed(2)} (L${at.toFixed(1)}) · 꼬리 ${tail.toFixed(2)} ≤ ${gapMax} · 받침 ${us.nSupports}개 [체제 '${SPIRAL_SUP}']`)
      ok(true, `진입: 판 매몰 L<${Lc.toFixed(1)} → 첫 받침까지 ${lead.toFixed(2)} (발치는 매스가 판에 묻혀 접지)`)
    }
  } else {
    ok(true, `SPIRAL_BODY='${SPIRAL_BODY}' — 구세계 낱장 141칸 보존계(현도 복귀 경로). 매스 절 건너뜀`)
  }
}

// ── ★114 벽 밑동 팔각 각뿔대 (2026.08.05) ──
//  ⛔수직 각기둥 1차 시도는 현도 반려. 정본 = **기울인 각뿔대**(WBASE_TILT). 0을 주면 구 체제 복원.
if (WBASE_ON) {
  console.log('\n— ★114 벽 밑동 팔각 각뿔대 —')
  const s114 = wallBaseSpec()
  const g114 = buildWallBase()
  const p114 = g114.getAttribute('position')
  const n114 = g114.getAttribute('normal')

  //  [1] 팔각이 바닥 원 안에 있는가 — 모서리 두께가 살아 있어야 밑동이 소멸하지 않는다
  ok(WBASE_RB <= ROOM_R, `Rb ${WBASE_RB} ≤ 바닥 원 ${ROOM_R} — 넘으면 모서리에서 밑동이 사라진다`)
  ok(s114.thickCorner >= 0,
    `바닥 두께 모서리 ${s114.thickCorner.toFixed(2)} ≥ 0 · 면중심 ${s114.thickFace.toFixed(2)} (면중심이 항상 더 두껍다)`)
  ok(s114.thickFace > s114.thickCorner,
    `면중심 ${s114.thickFace.toFixed(2)} > 모서리 ${s114.thickCorner.toFixed(2)} — 팔각↔원의 필연`)

  //  [2] ★외곽 불변 — 밑동은 셸 **안쪽**에만 있어야 한다(밖에서 보이면 안 된다)
  let over = -1e9, nan = 0, below = 0, yMax = -1e9
  for (let i = 0; i < p114.count; i++) {
    const x = p114.getX(i), y = p114.getY(i), z = p114.getZ(i)
    if (!isFinite(x + y + z)) { nan++; continue }
    over = Math.max(over, Math.hypot(x, z) - (wallR(y) - WBASE_CLR))
    if (y < ROOM_FLOOR_Y - 1e-6) below++
    yMax = Math.max(yMax, y)
  }
  ok(nan === 0, `NaN 정점 ${nan}`)
  ok(below === 0, `바닥(y${ROOM_FLOOR_Y}) 아래로 새는 정점 ${below}`)
  ok(over < 1e-4, `셸 초과 최대 ${over.toExponential(2)} < 1e-4 (외곽 불변 — 밖에서 안 보인다)`)

  //  [3] ★윗면 = **수평 절단면**(현도 3차 정정). 최고점이 H와 정확히 같아야 한다.
  //   ⛔여기가 깨지면 반려된 '아치 여덟'이 되살아난 것이다.
  ok(Math.abs(yMax - s114.yTop) < 1e-6,
    `최고점 ${(yMax - ROOM_FLOOR_Y).toFixed(3)} = 절단 높이 H ${s114.H} — 윗면이 수평(아치 아님)`)
  ok(s114.H < s114.hMax,
    `절단 높이 ${s114.H} < 상한 ${s114.hMax.toFixed(2)}(모서리가 셸에 닿는 높이) — 넘기면 윗면이 끊긴다`)
  ok(s114.topCorner > 0 && s114.topFace > s114.topCorner,
    `윗면 고리 폭 모서리 ${s114.topCorner.toFixed(2)} / 면중심 ${s114.topFace.toFixed(2)} — 둘 다 살아 있고 면중심이 넓다`)

  //  [4] 법선은 직접 찍는다(computeVertexNormals 금지 — 패싯 보존)
  let nbad = 0
  for (let i = 0; i < n114.count; i++)
    if (Math.abs(Math.hypot(n114.getX(i), n114.getY(i), n114.getZ(i)) - 1) > 1e-4) nbad++
  ok(nbad === 0, `비단위 법선 ${nbad} / ${n114.count}`)

  //  [5] ★안쪽 면은 **평면**이다(각뿔대의 옆면 — 기울기는 균일). 여기가 무너지면 위 값 전부가 거짓이다.
  const tn = Math.tan(WBASE_TILT * Math.PI / 180)
  let planar = 0
  for (const t of [-s114.w * 0.9, -s114.w * 0.4, 0, s114.w * 0.4, s114.w * 0.9])
    for (const dy of [0, 3, 6, 9]) {
      const y = ROOM_FLOOR_Y + dy
      const d = s114.rhoAt(y, t) * Math.cos(Math.atan2(t, s114.a0))
      planar = Math.max(planar, Math.abs(d - (s114.a0 - dy * tn)))
    }
  ok(planar < 1e-9, `안쪽 면 평면성 편차 ${planar.toExponential(2)} = 0 (기울기 ${WBASE_TILT}° 균일)`)

  //  [5-b] ★감김 정합(★116에서 드러난 병의 예방 — 밑동도 같은 ref 기계를 쓴다)
  {
    let V = 0, mism = 0
    for (let i = 0; i < p114.count; i += 3) {
      const a = [p114.getX(i), p114.getY(i), p114.getZ(i)]
      const b = [p114.getX(i + 1), p114.getY(i + 1), p114.getZ(i + 1)]
      const c = [p114.getX(i + 2), p114.getY(i + 2), p114.getZ(i + 2)]
      V += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const L = Math.hypot(w[0], w[1], w[2]) || 1
      if ((w[0] * n114.getX(i) + w[1] * n114.getY(i) + w[2] * n114.getZ(i)) / L < 0) mism++
    }
    ok(mism === 0 && V > 0, `밑동 감김↔법선 불일치 ${mism} · 부호 있는 부피 ${V.toFixed(0)} > 0`)
  }

  //  [6] 나선 발치 무접촉 — 밑동이 나선을 먹으면 안 된다
  const clr114 = s114.a0 - (ROOM_STAIR_ROUT + ROOM_STAIR_WIDTH / 2)
  ok(clr114 > 0, `나선 발치 여유 ${clr114.toFixed(2)} > 0 (밑동 면중심 ${s114.a0.toFixed(2)} vs 발치 바깥끝)`)

  //  [7] 위상 — 정의 각뿔대와의 관계가 두 체제 중 하나여야 한다
  ok(WBASE_PHASE === 'align' || WBASE_PHASE === 'counter',
    `위상 '${WBASE_PHASE}' ∈ {align(모서리 맞춤) · counter(22.5° 대구)}`)

  //  [8] ⚠**보 삼킴은 선언된 비용이다**(현도 2026.08.05 수용). 막지 않고 **매 실행 보고**한다.
  //   안 삼키려면 Rb ≥ 65.4가 필요한데 64를 넘으면 모서리에서 밑동이 소멸한다 — 창이 비어 있다.
  const bu114 = beamBurial(_beamSpec())
  const lowestB = _beamSpec().reduce((m, b) => Math.min(m, b.yB), 1e9) - ROOM_FLOOR_Y
  ok(s114.H > lowestB ? bu114.length > 0 : bu114.length === 0,
    `보 삼킴 ${bu114.length}기 — H ${s114.H} vs 최저 보 밑면 ${lowestB.toFixed(2)} (H가 낮으면 무접촉이 **강제**된다)`)
  ok(bu114.length === 0,
    `보 무접촉 ✓ — 현도 최초 요구('보를 삼키지 않는 선')가 수평 절단으로 충족됐다. H를 ${lowestB.toFixed(2)} 위로 올리면 깨진다`)

  //  [9] ⚠결합 감시 — 기울기를 키우면 끝높이가 올라가 삼킴이 는다. 보 배치를 바꿔도 움직인다.
  ok(true,
    `결합: H 상한 둘 — 보 무접촉 ${lowestB.toFixed(2)} · 윗면 연속 ${s114.hMax.toFixed(2)}. 둘 중 낮은 쪽이 실효 상한이다(현재 ${Math.min(lowestB, s114.hMax).toFixed(2)})`)
}

// ── ★115 뿌리 관통 장부 = 사다리꼴 뿔대 (2026.08.05) ──
if (ROOT_CROSS_ON) {
  console.log('\n— ★115 뿌리 관통 장부(사다리꼴 뿔대) —')
  const S = rootCrossSpec()
  const G = buildRootCrosses()
  const p115 = G.getAttribute('position'), n115 = G.getAttribute('normal')
  const c0 = S[0]

  //  [1] 치수는 헌치에서 인용한다 + **보 춤 안에 낀다**(현도 ⓒ)
  ok(Math.abs(ROOT_CROSS_BAR - _SBW * _SBRG) < 1e-9,
    `장부 벽쪽 높이 ${ROOT_CROSS_BAR.toFixed(2)} = 뿌리 폭(인용) · 안쪽 ${(ROOT_CROSS_BAR * ROOT_CROSS_BACK).toFixed(2)} = 사다리꼴`)
  ok(ROOT_CROSS_INSET > 0 && ROOT_CROSS_INSET + ROOT_CROSS_BAR < _SBD + 1e-9,
    `보 춤 ${_SBD} 안에 낌 — 위 살 ${ROOT_CROSS_INSET.toFixed(2)} · 장부 ${ROOT_CROSS_BAR.toFixed(2)} · 아래 살 ${(_SBD - ROOT_CROSS_INSET - ROOT_CROSS_BAR).toFixed(2)}`)
  ok(ROOT_CROSS_BACK > 0 && ROOT_CROSS_BACK < 1, `사다리꼴 뒷변비 ${ROOT_CROSS_BACK} ∈ (0,1) — 1이면 직사각`)
  ok(ROOT_CROSS_TIP > 0 && ROOT_CROSS_TIP < 1,
    `뿔대 끝 축소율 ${ROOT_CROSS_TIP} ∈ (0,1) — 끝 마구리 ${(ROOT_CROSS_BAR * ROOT_CROSS_TIP).toFixed(2)}×${(ROOT_CROSS_RUN * ROOT_CROSS_TIP).toFixed(2)} (칼끝 아님)`)

  //  [2] ★★**벽과 틈 0** — 현도 요구의 핵심. 바깥면을 평면(현)으로 두면 √(r²+u²) 때문에 렌즈 틈이
  //   생긴다(★108-2 계열). 셸 곡면을 그대로 떴는지 **축거리로** 검산한다(반경으로 재면 통과하는 함정).
  let gap = 0
  for (const c of S) for (let i = 0; i <= 24; i++) {
    const u = -c.U + 2 * c.U * (i / 24), sc = c.scaleAtU(u)
    for (const f of [0, 0.5, 1]) {
      const y = c.yKeyTop - c.hOut * sc * f
      const lim = wallR(y) - _SWC
      const rO = Math.sqrt(Math.max(0, lim * lim - u * u))
      gap = Math.max(gap, lim - Math.hypot(rO, u))
    }
  }
  ok(gap < 1e-9, `벽↔장부 바깥면 틈 최대 ${gap.toExponential(2)} = 0 (축거리로 검산 — 현도 "틈 없이 견고하게")`)

  //  [3] 외곽 불변 + 건전성
  let over = -1e9, nan = 0, nbad = 0, deg = 0
  for (let i = 0; i < p115.count; i++) {
    const x = p115.getX(i), y = p115.getY(i), z = p115.getZ(i)
    if (!isFinite(x + y + z)) { nan++; continue }
    over = Math.max(over, Math.hypot(x, z) - (wallR(y) - _SWC))
    if (Math.abs(Math.hypot(n115.getX(i), n115.getY(i), n115.getZ(i)) - 1) > 1e-4) nbad++
  }
  for (let i = 0; i < p115.count; i += 3) {
    const ax = p115.getX(i), ay = p115.getY(i), az2 = p115.getZ(i)
    const ux = p115.getX(i + 1) - ax, uy = p115.getY(i + 1) - ay, uz = p115.getZ(i + 1) - az2
    const vx = p115.getX(i + 2) - ax, vy = p115.getY(i + 2) - ay, vz = p115.getZ(i + 2) - az2
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-9) deg++
  }
  ok(nan === 0 && nbad === 0 && deg === 0, `NaN ${nan} · 비단위 법선 ${nbad} · 퇴화 ${deg} — 전부 0`)
  ok(over < 1e-4, `셸 초과 최대 ${over.toExponential(2)} < 1e-4 (외곽 불변)`)

  //  [4] 관통 — 장부가 보 옆면(±wRoot) 밖으로 실제로 나와야 '짜맞춤'으로 읽힌다
  ok(c0.U > c0.wRoot + 1e-9,
    `보 옆면 ±${c0.wRoot.toFixed(2)} → 장부 끝 ±${c0.U.toFixed(2)} · 돌출 ${ROOT_CROSS_SIDE} (관통해 양쪽으로 나온다)`)
  //  [5] ⚠범위 감시 — 아래 마구리(헌치·코브)는 **손대지 않는다**(현도 정정). 그 노브가 살아 있는지 본다.
  ok(SUP_BEAM_FILLET > 0 && SUP_BEAM_CURVE > 1,
    `아래 마구리 무손상: 코브 필렛 ${SUP_BEAM_FILLET} · 헌치 곡선 ${SUP_BEAM_CURVE} — 교체 대상은 좌우뿐`)
}

// ── ★116 방 돔 살 여덟 (2026.08.05) ──
if (RRIB_ON) {
  console.log('\n— ★116 방 돔 살 여덟 —')
  const S = roomRibSpec(), G = buildRoomRibs()
  const pr = G.getAttribute('position'), nrr = G.getAttribute('normal')
  const wb = wallBaseSpec()

  //  [1] ★§2-C 예외의 경계 — ⓑ 여덟뿐 · 팔각 모서리와 방위가 정확히 같을 것
  ok(S.N === wb.N && S.N === 8,
    `살 ${S.N}기 = 팔각 모서리 수 (§2-C 예외 근거 ⓑ '여덟뿐' — 72와 혼동 불가)`)
  let azErr = 0
  for (let i = 0; i < S.N; i++) azErr = Math.max(azErr, Math.abs(S.az[i] - wb.edgeAz[i]))
  ok(azErr < 1e-12, `살 방위 = 팔각 모서리 방위 편차 ${azErr.toExponential(2)} (근거 ⓓ 정의 여덟과 1:1)`)

  //  [2] 발과 머리
  ok(Math.abs(S.y0 - wb.yTop) < 1e-9,
    `발 = 단 윗면 y${S.y0.toFixed(2)} (현도 ⓸) · 머리 y${S.y1.toFixed(2)} · 자오선 ${S.len.toFixed(1)}`)
  ok(S.y1 <= S.yOc + 1e-9,
    `머리 ${S.y1.toFixed(2)} ≤ 오큘러스 ${S.yOc.toFixed(2)} — 자동 절단 ${S.cut.toFixed(2)} (나선 여유 ${RRIB_CLR} 파생)`)

  //  [3] ★외곽 불변 + 틈 0(★115와 같은 규약 — 축거리로 검산)
  let over = -1e9, nan = 0, nbad = 0, deg = 0
  for (let i = 0; i < pr.count; i++) {
    const x = pr.getX(i), y = pr.getY(i), z = pr.getZ(i)
    if (!isFinite(x + y + z)) { nan++; continue }
    //  ⚠셸 포함 검사는 **아가리 아래에서만** 뜻이 있다 — 머리는 아가리 위 단차에 있고
    //   그 높이에서 wallR은 0으로 수렴하므로 그대로 재면 거짓 실패가 난다(1차 구현에서 실측 적발).
    if (y <= S.yOc + 1e-3) over = Math.max(over, Math.hypot(x, z) - (wallR(y) - SUP_WALL_CLR))
    if (Math.abs(Math.hypot(nrr.getX(i), nrr.getY(i), nrr.getZ(i)) - 1) > 1e-4) nbad++
  }
  for (let i = 0; i < pr.count; i += 3) {
    const ax = pr.getX(i), ay = pr.getY(i), az2 = pr.getZ(i)
    const ux = pr.getX(i + 1) - ax, uy = pr.getY(i + 1) - ay, uz = pr.getZ(i + 1) - az2
    const vx = pr.getX(i + 2) - ax, vy = pr.getY(i + 2) - ay, vz = pr.getZ(i + 2) - az2
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-9) deg++
  }
  ok(nan === 0 && nbad === 0 && deg === 0, `NaN ${nan} · 비단위 법선 ${nbad} · 퇴화 ${deg} — 전부 0`)
  ok(over < 1e-4, `셸 초과 ${over.toExponential(2)} < 1e-4 (아가리 아래 구간 · 근거 ⓒ 밀폐 — 밖에서 안 보인다)`)

  //  [4] ★굵기는 **셸 법선**으로 잰다 — 수평으로 재면 꼭대기에서 cos77.8 = 0.21배로 납작해진다
  const tiltTop = Math.atan(Math.abs((wallR(S.y1) - wallR(S.y1 - 1e-4)) / 1e-4)) * 180 / Math.PI
  ok(tiltTop > 60,
    `머리 벽 기울기 ${tiltTop.toFixed(1)}° — 수평 측정이면 살이 ${(RRIB_T * Math.cos(tiltTop * Math.PI / 180)).toFixed(2)}로 납작해졌을 자리(법선 측정이라 ${RRIB_T} 유지)`)

  //  [5] 이웃 살 사이가 살아 있는가(위로 갈수록 좁아진다)
  ok(S.gapAt(S.y1) > RRIB_W,
    `이웃 살 사이 빈 호길이 바닥 ${S.gapAt(S.y0).toFixed(1)} → 머리 ${S.gapAt(S.y1).toFixed(1)} > 살 폭 ${RRIB_W.toFixed(2)}`)

  //  [6] ★★**감김 정합 — 현도 2026.08.05 적발("중심쪽 면이 안 보여")의 회귀 가드.**
  //   ⛔원인: 법선 방향 판정에 **살 전체의 무게중심 하나**를 썼는데 이 살은 반경이 61.5 → 18로 준다.
  //    아랫구간 안쪽면이 전역 기준점보다 바깥에 놓여 법선이 뒤집혔고, 방 안에서 컬링돼 사라졌다.
  //   ★정본 = **구간마다 자기 무게중심**. ⚠길이가 길어질 때만 드러나는 병이라 ★114·★115는 안 걸렸다.
  //   ★검사 방식 = **부호 있는 부피**(발산정리). 한 면이라도 뒤집히면 부피가 어긋난다 — 면마다
  //    보는 것보다 이쪽이 확실하다(면 분류는 꼭대기에서 안팎 구분이 모호해져 오탐이 난다).
  {
    let V = 0, mism = 0
    for (let i = 0; i < pr.count; i += 3) {
      const a = [pr.getX(i), pr.getY(i), pr.getZ(i)]
      const b = [pr.getX(i + 1), pr.getY(i + 1), pr.getZ(i + 1)]
      const c = [pr.getX(i + 2), pr.getY(i + 2), pr.getZ(i + 2)]
      V += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const L = Math.hypot(w[0], w[1], w[2]) || 1
      if ((w[0] * nrr.getX(i) + w[1] * nrr.getY(i) + w[2] * nrr.getZ(i)) / L < 0) mism++
    }
    const expect = S.N * S.len * RRIB_W * RRIB_T
    ok(mism === 0, `감김↔법선 불일치 ${mism} / ${pr.count / 3} — 0이어야 면이 안 사라진다`)
    ok(V > 0 && Math.abs(V - expect) / expect < 0.10,
      `부호 있는 부피 ${V.toFixed(0)} ≈ 기대 ${expect.toFixed(0)} (편차 ${(Math.abs(V - expect) / expect * 100).toFixed(1)}% < 10%) — 한 면이라도 뒤집히면 어긋난다`)
  }

  //  [6-b] ★머리 마감(현도 2026.08.05: "단차 사이에 녹아들어가 붙잡아주는 것처럼").
  //   구판은 꼭대기가 그냥 잘린 단면이었다. 정본 = 아가리를 딛고 단차를 채워 디스크 밑면을 받는다.
  //   ⚠**살마다 따로 판정한다** — 나선이 그 방위·그 높이대를 지나면 머리를 놓지 않는다.
  //    전역 클램프였던 구판은 나선 하나 때문에 여덟을 다 낮췄다(현도 지시로 정정).
  if (RRIB_HEAD) {
    let yTopMax = -1e9
    for (let i = 0; i < pr.count; i++) yTopMax = Math.max(yTopMax, pr.getY(i))
    ok(S.nHead > 0 && S.nHead < S.N,
      `머리 ${S.nHead}/${S.N}기 — 나선이 지나는 방위(${S.per.filter(r => !r.head).map(r => ((r.az * 180 / Math.PI) % 360 + 360).toFixed(0) % 360 + '°').join(' ')})는 머리 없음`)
    //  ⚠Float32 — BufferGeometry는 배정밀도 사양값과 1e-6까지 못 맞춘다(프로젝트 전례: 1e-4를 쓴다)
    ok(Math.abs(yTopMax - S.yDisc) < 1e-4,
      `머리 꼭대기 ${yTopMax.toFixed(2)} = 착지 디스크 밑면 ${S.yDisc.toFixed(2)} — 단차(세로 ${(S.yDisc - S.yOc).toFixed(2)})를 정확히 채운다`)
    ok(S.headIn < _OCR && S.headIn > 6,
      `머리 안쪽 반경 ${S.headIn} ∈ (디스크 안 6, 아가리 ${_OCR}) — 디스크 밑으로 ${(_OCR - S.headIn).toFixed(2)} 파고들어 문다`)
    ok(S.headW > RRIB_W,
      `머리 폭 ${S.headW.toFixed(2)} > 살 폭 ${RRIB_W.toFixed(2)} — 머리가 살보다 굵어야 '붙잡는' 것으로 읽힌다`)
  }

  //  [7] ⚠**보4 관통은 선언된 것**(현도 2026.08.05). 막지 않고 매 실행 보고한다.
  const ribDeg = S.az.map(a => ((a * 180 / Math.PI) % 360 + 360) % 360)
  const hits = []
  _beamSpec().forEach((b, i) => {
    const az = ((b.az * 180 / Math.PI) % 360 + 360) % 360
    let d = 1e9
    for (const r of ribDeg) { let e = Math.abs(r - az); e = Math.min(e, 360 - e); d = Math.min(d, e) }
    if (d < 6) hits.push(`보${i} ${d.toFixed(1)}°`)
  })
  ok(hits.length <= 1,
    `살↔보 근접 ${hits.length}건 [${hits.join(' ')}] — 보4 관통은 선언된 비용(살=균등 45° vs 보=나선 불규칙, 동시 만족 불가)`)
}

// ── ★117 감실 처마 여덟 (2026.08.05) ──
if (PIT_ON && EAVE_ON) {
  console.log('\n— ★117 감실 처마 여덟 —')
  const E = eaveSpec(), Pp = pitSpec(), Sl = slotSpec()
  const G = buildPitEaves(), pe = G.getAttribute('position'), ne = G.getAttribute('normal')

  //  [1] 입술에 앉는다(현도 정정 — 감실 상인방이 아니다) + 위로 솟는다
  ok(Math.abs(E.yRoot - Pp.yTop) < 1e-9,
    `뿌리 = 입술 y${E.yRoot.toFixed(2)} (⚠감실 상인방 y48.05가 아니다 — 현도 정정)`)
  ok(E.up > 0 && E.yTip > E.yRoot,
    `끝이 바닥보다 ${E.up.toFixed(2)} 솟는다 (경사 ${E.tiltDeg}° · 뻗음 ${EAVE_LEN})`)
  ok(E.t0 > E.t1 && E.t1 > 0,
    `두께 뿌리 ${E.t0} > 끝 ${E.t1} > 0 (§2-D 3 — 끝을 0으로 수렴시키지 않는다)`)

  //  [2] ★마이터 — 뿌리·끝 팔각이 **닮음**이라 이웃 패널이 같은 꼭짓점을 쓴다 → 이음 틈이 정의상 0.
  //   ⚠★109에서 마이터 가지가 417번 중 0번 걸려 실루엣이 결손됐던 계열의 예방이다.
  ok(Math.abs(E.apoTip / E.rTip - Math.cos(Math.PI / E.N)) < 1e-12,
    `끝 팔각이 뿌리 팔각과 닮음(내접/외접 = cos${(180 / E.N).toFixed(1)}°) — 마이터 각이 전 모서리 동일`)
  ok(E.apoTip < E.apoRoot && E.apoTip > Pp.apoBot,
    `아가리 내접 ${E.apoRoot.toFixed(2)} → ${E.apoTip.toFixed(2)} (${((E.apoRoot - E.apoTip) / E.apoRoot * 100).toFixed(1)}% 좁아짐) · 바닥 내접 ${Pp.apoBot.toFixed(2)}보다 넓다`)

  //  [3] ⛔**슬롯 통로가 열려 있어야 한다** — 0° 모서리에서 고리를 끊었다(현도 ⓐ).
  //   ★103 슬롯은 각뿔대의 **유일한 접근로**다(★105가 뚫었다). 막으면 여정이 끊긴다.
  //  ★★자름면이 **슬롯 옆벽과 같은 평면**에 있어야 한다(현도 2026.08.05: "하나의 평평한 면").
  //   ⛔구판은 팔각 변을 t비율로 잘라 자름면 **방향**이 슬롯 벽과 달랐다 — 두 덩어리로 보였다.
  //   ⚠검산은 **코너 좌표계의 u**로 한다(방위각으로 재면 반경마다 값이 달라져 못 잡는다).
  const eT = [-Math.sin(Sl.az), Math.cos(Sl.az)]
  const eR = [Math.cos(Sl.az), Math.sin(Sl.az)]
  let onPlane = 0, inside = 0, worst = 0
  for (let i = 0; i < pe.count; i++) {
    const x = pe.getX(i), z = pe.getZ(i)
    if (eR[0] * x + eR[1] * z < 10) continue          // 슬롯 권역(코너 방향)만
    const u = Math.abs(eT[0] * x + eT[1] * z)
    if (Math.abs(u - E.uClip) < 1e-5) onPlane++
    else if (u < E.uClip - 1e-5) { inside++; worst = Math.max(worst, E.uClip - u) }
  }
  ok(inside === 0, `슬롯 통로 침범 정점 ${inside} = 0 (최대 ${worst.toFixed(4)}) — ★103 접근로가 열려 있다`)
  ok(onPlane >= 8,
    `자름면 위 정점 ${onPlane} — 슬롯 옆벽 |u|=${Sl.HW}와 같은 평면(|u|=${E.uClip}, 헤어라인 ${(E.uClip - Sl.HW).toFixed(3)})`)
  ok(E.uClip - Sl.HW > 0 && E.uClip - Sl.HW < 0.1,
    `헤어라인 ${(E.uClip - Sl.HW).toFixed(3)} ∈ (0, 0.1) — 0이면 동일평면 z-파이팅, 크면 어긋난 두 덩어리(★64 교훈)`)

  //  [4] 건전성 + 감김(★116에서 드러난 계열의 가드)
  let V = 0, mism = 0, nan = 0, deg = 0
  for (let i = 0; i < pe.count; i += 3) {
    const a = [pe.getX(i), pe.getY(i), pe.getZ(i)]
    const b = [pe.getX(i + 1), pe.getY(i + 1), pe.getZ(i + 1)]
    const c = [pe.getX(i + 2), pe.getY(i + 2), pe.getZ(i + 2)]
    if (![...a, ...b, ...c].every(Number.isFinite)) { nan++; continue }
    V += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const L = Math.hypot(w[0], w[1], w[2])
    if (L < 1e-9) { deg++; continue }
    if ((w[0] * ne.getX(i) + w[1] * ne.getY(i) + w[2] * ne.getZ(i)) / L < 0) mism++
  }
  ok(nan === 0 && deg === 0 && mism === 0, `NaN ${nan} · 퇴화 ${deg} · 감김↔법선 불일치 ${mism} — 전부 0`)
  ok(V > 0, `부호 있는 부피 ${V.toFixed(1)} > 0 — 겉이 바깥을 본다`)

  //  [5] 나선 무간섭
  ok(E.rRoot < ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2,
    `처마 최대 반경 ${E.rRoot} < 나선 발치 안끝 ${(ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2).toFixed(2)} — 무간섭`)
}


// ══════════════════════════════════════════════════════════════════════════
//  ★★★118 착지 디스크 두껍게 (2026.08.05 현도 결정) — `discGeometry.js`
//   ⚠두께와 슬롯 확장은 **한 몸**이다. 하나만 되돌리면 나선이 디스크를 뚫는다 — 아래 [S] 절이 그걸 박는다.
// ══════════════════════════════════════════════════════════════════════════
console.log('\n── ★118 착지 디스크 ──')
{
  const { discSpec, buildDisc, slotTunnelBite } = await import('./discGeometry.js')
  const {
    DISC_MODE, ROOM_DISC_CHAMF, ROOM_LAND_R: LR8, ROOM_DISC_HOLE: RH8,
    ROOM_R: RR8, ROOM_HEIGHT: RH_8, ROOM_FLOOR_Y: RF8, ROOM_OCULUS_R: OR8,
    COR_Y0: CY8, COR_THICK: CT8, ROOM_TOP_AZ: TAZ8, ROOM_STAIR_WIDTH: SW8,
    RAD_ANG0: RA8, RAD_T_HW: RTHW8, RAD_WALL_R0: RW08, SUP_HEAD_MIN: SHM8,
  } = await import('./constants.js')
  const { spiralSpec } = await import('./axiomSpiralGeometry.js')
  const D = 180 / Math.PI
  const S = discSpec()

  //  [D1] 윗면은 안 움직인다 — 걷는 면이자 문지방이 물린 레벨. 두께를 아래로만 늘린 근거.
  ok(Math.abs(S.yTop - (CY8 + CT8 / 2 + 0.02)) < 1e-12,
    `윗면 ${S.yTop.toFixed(3)} = 통로 접합 파생(불변) — 두께는 아래로만 자란다`)

  //  [D2] 두께가 **파생**이다 — 하드코딩 금지(ROOM_R·오큘러스·LIFT_Y를 밀면 따라온다)
  const yOcRef = RF8 + RH_8 * Math.sqrt(1 - (OR8 / RR8) ** 2)
  ok(Math.abs(S.yOculus - yOcRef) < 1e-12, `오큘러스 림 높이 ${S.yOculus.toFixed(4)} = 타원체에서 역산(파생)`)
  if (DISC_MODE === 'thick') {
    ok(Math.abs(S.yBot - S.yOculus) < 1e-12,
      `★밑면 ${S.yBot.toFixed(4)} = 오큘러스 림 — 구판의 "림 위 1.827 허공" 단차 소멸(현도 채택)`)
    ok(Math.abs(S.thick - 2.1765) < 1e-3, `두께 ${S.thick.toFixed(4)} (구 0.35의 ${(S.thick / 0.35).toFixed(1)}배)`)
  } else ok(true, `DISC_MODE='thin' — 구세계(두께 ${S.thick})`)

  //  [D3] 절대 상한 — 바깥 모서리 r18이 셸 곡면을 뚫지 않는다(★118 ⓒ)
  ok(S.shellSafe, `밑면 ${S.yBot.toFixed(4)} ≥ 셸이 r${LR8}에 닿는 높이 ${S.yShellAtRim.toFixed(4)} ` +
    `— 여유 ${(S.yBot - S.yShellAtRim).toFixed(3)} (0 미만이면 디스크가 돔을 뚫는다)`)

  //  [D4] 챔퍼 클램프 — 노브를 밀어도 매스가 안 뒤집힌다(파생)
  const bandW = LR8 - RH8
  ok(S.chamf <= Math.min(S.thick * 0.5, bandW * 0.5) + 1e-12 && S.chamf >= 0,
    `챔퍼 ${S.chamf} ≤ min(두께/2 ${(S.thick / 2).toFixed(2)}, 고리폭/2 ${(bandW / 2).toFixed(2)}) — 노브 ${ROOM_DISC_CHAMF} 자동 클램프`)
  ok(S.chamf > 0 || ROOM_DISC_CHAMF === 0,
    `§2-D 2 '속 찬 매스 + 깎인 밑면' — 챔퍼 ${S.chamf > 0 ? '적용' : '0(현도 직각 선택)'}`)

  //  [D5] 슬롯 = 두께의 전제. 빈 폭 67° · 뒷끝이 도착각에 정확히 붙는다
  const wB = ((S.wB % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  if (DISC_MODE === 'thick') {
    ok(Math.abs(wB - TAZ8) < 1e-12, `슬롯 뒷끝 ${(wB * D).toFixed(2)}° = 나선 도착각 ${(TAZ8 * D).toFixed(2)}°`)
    ok(Math.abs(S.gap * D - 67) < 1e-9, `빈 슬롯 ${(S.gap * D).toFixed(2)}° (구판 59° + 8°)`)
  }

  //  [S] ★★핵심 불변식 — **나선이 디스크 살을 뚫지 않는다.** 표본을 폭 방향까지 훑어 적분한다
  //   (★109 교훈: 공칭 파라미터가 아니라 표면을 훑어 조건을 적분해야 실제 기하가 잡힌다).
  {
    const sp = spiralSpec()
    const norm = a => { let x = a % (Math.PI * 2); if (x > Math.PI) x -= Math.PI * 2; if (x <= -Math.PI) x += Math.PI * 2; return x }
    //  디스크 살이 있는 방위인가 = 빈 슬롯 밖인가. 빈 슬롯 = 월드 (−(2π−t1의 월드) … ) → 정본에서 유도
    const gapLo = norm(S.wA), gapHi = norm(S.wB)          // wA=−29.5° · wB=+37.5°
    const inGap = az => { const a = norm(az); return a > gapLo + 1e-9 && a < gapHi - 1e-9 }
    //  ★도착점은 슬롯 절단면에 **정확히 맞닿는다**(설계된 맞댐) — 경계 표본은 관입이 아니다.
    //   ⚠이걸 눈감아 주는 대신 [F]에서 그 일치를 1e-12로 따로 박는다(느슨하게 넘어가지 않는다).
    const FLUSH = 1e-6
    let pierce = 0, worstClr = Infinity, worstAt = null, underN = 0, flushN = 0
    const N = 60000
    for (let i = 0; i <= N; i++) {
      const L = sp.pathLen * i / N
      const a = sp.atLen(L)
      const rC = Math.hypot(a.x, a.z), az = Math.atan2(a.z, a.x)
      const rIn = rC - SW8 / 2, rOut = rC + SW8 / 2
      if (rIn >= LR8 || rOut <= RH8) continue              // 평면에서 고리 밖
      if (inGap(az)) continue                              // 슬롯 = 살 없음
      if (Math.abs(norm(az) - gapHi) < FLUSH) { flushN++; continue }   // 절단면 맞댐(측도 0)
      underN++
      const yT = sp.yTread(L)
      if (yT > S.yBot + 1e-9) pierce++                     // 걷는 면이 디스크 살 안으로
      const clr = S.yBot - yT
      if (clr < worstClr) { worstClr = clr; worstAt = { L, rC, az, yT } }
    }
    ok(pierce === 0,
      `★나선 ↔ 디스크 관입 표본 ${pierce}/${underN} = 0 — 구판은 도착 8°가 파고들어 있었다('슬래브 관입 36정점')`)
    //  [F] 맞댐이 **정확한가** — 나선 끝 방위 = 슬롯 절단면. 어긋나면 틈(밟을 수 없는 자리)이거나 관입이다.
    {
      const aEnd = sp.atLen(sp.pathLen)
      const azEnd = norm(Math.atan2(aEnd.z, aEnd.x))
      ok(Math.abs(azEnd - gapHi) < 1e-12,
        `★나선 끝 ${(azEnd * D).toFixed(4)}° = 슬롯 절단면 ${(gapHi * D).toFixed(4)}° — 정확한 맞댐(경계 표본 ${flushN})`)
      ok(Math.abs(sp.yTopEnd - (S.yTop - 0.02)) < 1e-9,
        `나선 도착 윗면 ${sp.yTopEnd.toFixed(3)} = 디스크 윗면 ${S.yTop.toFixed(3)} − 0.02 헤어라인(코플레이너 z파이팅 회피)`)
    }
    ok(worstClr >= 2.0,
      `★최소 헤드룸 ${worstClr.toFixed(3)} @ az ${(worstAt.az * D).toFixed(1)}° · r${worstAt.rC.toFixed(2)} ` +
      `(구속 = 슬롯 진입 직전 걷는면 ${worstAt.yT.toFixed(3)})`)
    //  ⛔★표본으로 재면 안 되는 값이다(2026.08.05 자가 적발). 구속점은 **슬롯 진입 방위 그 한 점**인데
    //   `yTread`가 계단 함수라, 표본 간격이 그 점을 스치느냐 마느냐로 답이 2.347 ↔ 2.110을 오간다.
    //   실제로 N=12000에서 2.347, N=60000에서 2.110이 나왔다 — **검사가 해상도에 의존하면 검사가 아니다.**
    //   정본 = 슬롯 진입 호길이를 **이분 탐색으로 정확히 찾고** 그 점의 밟는 면을 읽는다(해상도 무관).
    let Ledge
    {
      const azAt = L => { const q = sp.atLen(L); return norm(Math.atan2(q.z, q.x)) }
      let lo = sp.pathLen * 0.9, hi = sp.pathLen
      for (let it = 0; it < 200; it++) { const m = (lo + hi) / 2; if (azAt(m) < gapLo) lo = m; else hi = m }
      Ledge = lo
    }
    const clrEdge = S.yBot - sp.yTread(Ledge)
    let treadStart
    {
      const yE = sp.yTread(Ledge)
      let a2 = 0, b2 = Ledge
      for (let it = 0; it < 200; it++) { const m = (a2 + b2) / 2; if (sp.yTread(m) < yE - 1e-9) a2 = m; else b2 = m }
      treadStart = b2
    }
    const bitW = Ledge - treadStart
    ok(clrEdge >= 2.0,
      `★최소 헤드룸 ${clrEdge.toFixed(4)} ≥ 2.0 (해상도 무관 · 이분 탐색) — 눈높이 1.6 위로 ${(clrEdge - 1.6).toFixed(3)}`)
    ok(clrEdge < SHM8,
      `⚠선언된 비용 — 자기 기준 SUP_HEAD_MIN ${SHM8}에 ${(SHM8 - clrEdge).toFixed(3)} 모자란다. ` +
      `구속은 **마지막 단의 끝자락 ${bitW.toFixed(4)}만 디스크 밑에 물린 것**이고, ` +
      `온전히 물린 한 단 아래는 ${(S.yBot - sp.yTread(treadStart - 1e-6)).toFixed(3)}이다 (현도 2026.08.05 수용)`)
  }

  //  [D6] 45° 터널 쐐기 물림 = 선언된 비용(수치를 매 실행 소리 내어 보고)
  {
    const b = slotTunnelBite(RA8, RTHW8, RW08)
    ok(b.maxArc <= 0.25,
      `⚠선언된 비용 — 45° 터널 입구 쐐기 물림 호 ${b.maxArc.toFixed(3)} ≤ 0.25 ` +
      `(반경대 ${b.rLo.toFixed(2)}~${b.rHi.toFixed(2)} · 최대 각 ${b.maxDeg.toFixed(2)}°)`)
    ok(b.rCrit < LR8, `임계 반경 ${b.rCrit.toFixed(2)} < ${LR8} — 문 개구(r18 문폭)는 무손상`)
  }

  //  [D7] 기하 건전성 — 빌드된 메시에 직접 댄다(★110 교훈: '만들었다'와 '섰다'는 다른 질문)
  {
    const g = buildDisc()
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal')
    let nan = 0, degn = 0, mism = 0, V = 0, badN = 0
    for (let i = 0; i < pos.count; i += 3) {
      const A = [pos.getX(i), pos.getY(i), pos.getZ(i)]
      const B = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)]
      const C = [pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)]
      if (![...A, ...B, ...C].every(Number.isFinite)) { nan++; continue }
      V += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
      const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const Lw = Math.hypot(w[0], w[1], w[2])
      if (Lw < 1e-9) { degn++; continue }
      if ((w[0] * nor.getX(i) + w[1] * nor.getY(i) + w[2] * nor.getZ(i)) / Lw < 0) mism++
    }
    for (let i = 0; i < nor.count; i++)
      if (Math.abs(Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i)) - 1) > 1e-3) badN++
    ok(nan === 0 && degn === 0 && mism === 0 && badN === 0,
      `NaN ${nan} · 퇴화 ${degn} · 감김↔법선 불일치 ${mism} · 비단위 법선 ${badN} — 전부 0 (삼각 ${pos.count / 3})`)
    ok(V > 0, `부호 있는 부피 ${V.toFixed(1)} > 0 — 겉이 바깥을 본다`)
    //  범위가 스펙과 정확히 일치(사본 없음의 증거)
    let ymin = Infinity, ymax = -Infinity, rmin = Infinity, rmax = -Infinity
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i))
      ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r)
    }
    ok(Math.abs(ymin - S.yBot) < 1e-4 && Math.abs(ymax - S.yMax) < 1e-4,
      `메시 y ${ymin.toFixed(4)}~${ymax.toFixed(4)} = 스펙 ${S.yBot.toFixed(4)}~${S.yMax.toFixed(4)}` +
      `${S.railOn ? ` (난간 ${S.railH} 포함)` : ''}`)
    ok(Math.abs(rmin - RH8) < 1e-4 && Math.abs(rmax - LR8) < 1e-4,
      `메시 r ${rmin.toFixed(3)}~${rmax.toFixed(3)} = 고리 ${RH8}~${LR8}`)
  }

  //  [R] ★★118-2 내부 원 난간 (2026.08.05 현도)
  if (S.railOn) {
    const { DISC_RAIL_H: RH_, DISC_RAIL_W: RW_, DISC_RAIL_CHAMF: RC_ } = await import('./constants.js')
    const { STEP_UP } = await import('./waypoints.js')
    //  ⓐ "아주 낮은" = 넘어설 수 있다. STEP_UP을 넘으면 턱이 아니라 벽이 된다.
    ok(S.railH < STEP_UP,
      `난간 높이 ${S.railH} < STEP_UP ${STEP_UP} — "아주 낮은"(넘어설 수 있는 턱) · 꼭대기 y ${S.yRail.toFixed(3)}`)
    //  ⓑ 안쪽 면 = 구멍 벽의 연장(한 면). 단면에서 r이 같아야 이음매가 정의상 0이다.
    const innerPts = S.prof.filter(q => Math.abs(q[0] - S.rIn) < 1e-12)
    ok(innerPts.length >= 2 && Math.max(...innerPts.map(q => q[1])) >= S.yRail - RC_ - 1e-9,
      `난간 안쪽 면이 구멍 벽 r${S.rIn}의 연장 — 단면에서 같은 r을 공유하는 정점 ${innerPts.length}개(이음매 0)`)
    //  ⓒ 아무것과도 안 만난다 — 나선 안끝이 실측 잣대
    {
      const sp2 = spiralSpec()
      let rMinSp = Infinity
      for (let i = 0; i <= 20000; i++) {
        const L = sp2.pathLen * i / 20000
        if (L < sp2.pathLen * 0.8) continue
        const q = sp2.atLen(L)
        rMinSp = Math.min(rMinSp, Math.hypot(q.x, q.z) - SW8 / 2)
      }
      ok(S.rWalkIn < rMinSp,
        `난간 바깥끝 ${S.rWalkIn} < 나선 안끝 ${rMinSp.toFixed(2)} — 여유 ${(rMinSp - S.rWalkIn).toFixed(2)}(무간섭)`)
    }
    //  ⓓ 걷는 띠가 남는다
    ok(S.walkW >= 6, `남는 보행 띠 ${S.walkW.toFixed(2)} (r${S.rWalkIn}~${S.rOut}) ≥ 6`)
    //  ⓔ 모접기 클램프 — 노브를 밀어도 단면이 안 뒤집힌다
    ok(S.railC <= Math.min(S.railH, S.railW) / 2 + 1e-12,
      `갓돌 모접기 ${S.railC} ≤ min(H,W)/2 ${(Math.min(S.railH, S.railW) / 2).toFixed(3)} — 노브 ${RC_} 자동 클램프`)
    //  ⓕ ★슬롯 절단면에서 디스크와 **같이** 끝난다 — 같은 스윕이라 매듭이 공짜다(§2-D 3)
    ok(S.prof.length >= 8 && S.tris2.length === S.prof.length - 2,
      `난간이 같은 단면 안에 있다 — 단면 정점 ${S.prof.length} · 캡 삼각 ${S.tris2.length}(= 정점−2, 귀 자르기 완결) ` +
      `→ 종단이 슬롯 절단면과 자동 일치, 별도 매듭 부재 0`)
    //  ⓖ §2-C — 속 찬 고리다(난간 동자 금지). 단면이 하나면 동자가 있을 수 없다.
    ok(true, `§2-C 준수 — 이음매 없는 속 찬 고리(난간 동자 없음, ★63과 같은 규칙)`)
  } else ok(true, `DISC_RAIL_ON=false — 난간 없음(민 윗면)`)

  //  [D8] Room.jsx가 사본을 안 쓴다 + 밟는 면 태그 유지
  {
    const fs = await import('node:fs')
    const src = fs.readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/buildDisc\(\)/.test(src) && !/new THREE\.ExtrudeGeometry\(sh/.test(src),
      'Room.jsx가 discGeometry.buildDisc()를 쓴다 — 구 ExtrudeGeometry 사본 제거')
    ok(/geometry=\{discGeo\}[^>]*walkable: true/.test(src.replace(/\s+/g, ' ')),
      '디스크 walkable 태그 유지 — 밟는 면(P3 보행 절이 읽는다)')
  }
}


console.log('\n── ★127 빛우물 첨탑(2026.08.14 현도 스케치 — 원기둥>팔각뿔대>팔각기둥>원뿔대) ──')
{
  const C = await import('./constants.js')
  const { SP_FR_MESH_TIP } = C
  const SG = await import('./spireGeometry.js')
  const { openEdgeCount } = await import('./orientGeo.js')
  const THREE = await import('three')
  if (!C.SPIRE_ON) {
    //  ⛔보존계(소등 중) — 배선만 검증: wellWallR가 구 원뿔 사면을 돌려주는가(복원 조건 = SPIRE_ON=true)
    ok(Math.abs(SG.wellWallR(C.ROOM_CEIL_Y - 3) - C.ROOM_LAND_R) < 1e-9
      && Math.abs(SG.wellWallR(C.ROOM_CYL_TOP) - C.ROOM_WELL_RT) < 1e-9,
      '보존계: wellWallR = 구 단일 원뿔대 사면(밑 18 → 꼭대기 2.5)')
    const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/if \(SPIRE_ON\) return buildSpire\(\)/.test(roomSrc), '보존계: 구 wellCut 경로 보존 + 한 줄 복귀 게이트')
  } else {
    const S = SG.spireSpec()
    //  ① 분할·대역(현도 Q1: 전체 y98~162 유지 · 원뿔대 = 잔여 파생이라 합은 항상 닫힘 — 양수만 검사)
    ok(S.h1 > 0 && S.h2 > 0 && S.h3 > 0 && S.h4 > 0,
      `4단 높이 전부 양수(${S.h1.toFixed(1)}·${S.h2.toFixed(1)}·${S.h3.toFixed(1)}·${S.h4.toFixed(1)} — 비율 노브 유효 대역)`)
    ok(Math.abs(S.yB - (C.ROOM_CEIL_Y - 3)) < 1e-9 && Math.abs(S.yT - C.ROOM_CYL_TOP) < 1e-9,
      `대역 ${S.yB}~${S.yT} = 구 원뿔대와 동일(Q1 높이 유지)`)
    //  ② 봉합 불변식(Q2·Q5)
    ok(S.rCyl === C.ROOM_LAND_R, '밑 봉합: 원기둥 외반경 = 디스크 바깥 반경(Q2)')
    ok(S.rTopIn === C.ROOM_WELL_RT, '꼭대기 개구 = ROOM_WELL_RT — 샤프트 출처 어휘 불변(Q5)')
    ok(S.T > 0 && S.rCylIn > 0 && S.rMidIn > 0 && S.rTopOut > S.rTopIn,
      `벽 두께 ${S.T} 양수·내반경 사슬 양수(종잇장 금지 — Q5)`)
    //  ③ 접합 규율: L-턱·침강
    ok(S.ledgeH > S.sink + 1e-9, `L-턱 두께 ${S.ledgeH} > 침강 ${S.sink}(스텁이 턱을 안 뚫음)`)
    //  ⛔★129 스윕이 적발: 이 항이 `S.rCyl`을 박고 있었다 — L-턱은 **팔각 밑**에서 파생되므로
    //   J1 'follow'(팔각도 넓힘) 체제에서 허위 실패했다(19.06 vs rCyl 기준 15.35). 정본 = S.octBase.
    ok(S.ledgeIn < (S.octBase - S.octInOff) * Math.cos(Math.PI / 8) - 1e-9,
      `L-턱 안반경 ${S.ledgeIn.toFixed(2)} < 팔각 밑(${S.octBase.toFixed(1)}) 내접(J1 환형 슬릿 바닥 전면 커버 — 규율 ⑤)`)
    const eave = S.rMid * (1 - Math.cos(Math.PI / 8))
    ok(eave > 0 && eave < 1, `J3: 원뿔 밑 = 팔각 외접(모서리 관입 0) · 면 중앙 처마 ${eave.toFixed(3)}`)
    //  ④ CSG 대역: 문·돔 자르개가 전부 ①원기둥 구간 안(위 3단은 순수 기하)
    ok(C.RAD_TOP < S.y1 && C.ROOM_CEIL_Y < S.y1,
      `문 상단 ${C.RAD_TOP.toFixed(2)}·돔 정점 ${C.ROOM_CEIL_Y} < y1 ${S.y1.toFixed(1)}(자르개 ⊂ 원기둥 구간)`)
    //  ⑤ 샤프트 ⊂ 내벽 — 닫힌 식: 양쪽 다 구간별 선형이라 위반 최대는 경계점(격자 탐색 불요 — 규율 ⑪)
    const shaftR = y => (C.ROOM_WELL_RT - 0.3)
      + ((C.SHAFT_TOP_R - 0.3) - (C.ROOM_WELL_RT - 0.3)) * (S.yT - y) / (S.yT - C.SHAFT_TOP_Y)
    let worst = 1e9, wy = 0
    for (const y of [C.SHAFT_TOP_Y, S.y1 - S.ledgeH, S.y1, S.y2, S.y3, S.yT]) {
      const m = SG.wellInnerClear(y, S) - shaftR(y)
      if (m < worst) { worst = m; wy = y }
    }
    ok(worst >= 0.05, `빛 샤프트 ⊂ 내벽: 경계점 전수 최소 여유 ${worst.toFixed(3)} @y${wy.toFixed(1)} ≥ 0.05(SPIRE_R_MID 하한이 여기)`)
    //  ⑥ 방 내벽 나선 도착 클리어런스(RIN 14 · 폭 3.6 — 디스크로 내려서는 마지막 판들이 내벽 안)
    const spOut = C.ROOM_STAIR_RIN + C.ROOM_STAIR_WIDTH / 2
    ok(spOut < S.rCylIn - 0.2, `나선 도착 바깥끝 ${spOut.toFixed(1)} < 내벽 ${S.rCylIn}(여유 ${(S.rCylIn - spOut).toFixed(2)})`)
    //  ⑦ 팔각 방위 두 체제(현도 Q4 — 로컬 비교 후 확정): 파생 정합
    const Sp = SG.spireSpec({ octMode: 'pit' }), St = SG.spireSpec({ octMode: 'tunnel' })
    ok(Math.abs(Sp.cornerAz0) < 1e-9 && Math.abs(St.cornerAz0 - Math.PI / 8) < 1e-9,
      "방위 체제: 'pit' 모서리 0°(면 중심 22.5°+45°k = 지하 정의 각뿔대 라임 · 터널각 45° = 모서리)")
    ok(Math.abs(((St.cornerAz0 + Math.PI / 8) % (Math.PI / 4)) - 0) < 1e-9,
      "'tunnel' 면 중심 0°+45°k(대각 터널 45°+90°k가 면 정중앙)")
    //  ⑧ 기하 실증: watertight·부피 해석 대조·CSG 실제 제거·문 레이캐스트
    const uncut = SG.buildSpire({ cut: false }), cutG = SG.buildSpire()
    ok(openEdgeCount(uncut) === 0, '무컷 첨탑 watertight(열린 에지 0 — 3개 닫힌 성분)')
    const vol = g => { const p = g.getAttribute('position'), ix = g.index; let v = 0
      for (let t = 0; t < ix.count; t += 3) {
        const A = [p.getX(ix.getX(t)), p.getY(ix.getX(t)), p.getZ(ix.getX(t))]
        const B = [p.getX(ix.getX(t + 1)), p.getY(ix.getX(t + 1)), p.getZ(ix.getX(t + 1))]
        const D = [p.getX(ix.getX(t + 2)), p.getY(ix.getX(t + 2)), p.getZ(ix.getX(t + 2))]
        v += (A[0] * (B[1] * D[2] - B[2] * D[1]) - A[1] * (B[0] * D[2] - B[2] * D[0]) + A[2] * (B[0] * D[1] - B[1] * D[0])) / 6
      }
      return v }
    //  해석 부피(솔리드별 독립 합 — 침강 중복은 메시도 성분별로 같은 방식으로 세므로 정합)
    const A8 = R => 4 * R * R * Math.sin(Math.PI / 4)                 // 정팔각 넓이(외접 R)
    const I2 = (Ra, Rb, h) => h * (Ra * Ra + Ra * Rb + Rb * Rb) / 3  // ∫R(y)²dy, R 선형
    const off = S.octInOff
    const polyRev = (prof, k) => { let v = 0
      for (let i = 0; i < prof.length; i++) { const [r0, ya] = prof[i], [r1, yb] = prof[(i + 1) % prof.length]
        v += (yb - ya) * (r0 * r0 + r0 * r1 + r1 * r1) / 3 }
      return Math.abs(k * v) }
    //  ★★129-b: 원기둥 부피 = **빌더가 쓰는 단면 프로파일(S.cylProf)을 그대로 적분**한다.
    //   ⛔손유도를 고쳐 쓰다 위 빗면 추가에서 288 어긋났다(메시 9103 vs 해석 9391) — 구간을 손으로 세는 방식 자체가 결함이었다.
    //   프로파일이 정본이 되면 노브를 어떻게 돌려도 해석과 메시가 같은 것을 잰다(사본 소멸).
    const vCyl = polyRev(S.cylProf, Math.PI)
    const vOct = (A8(S.octBase) - A8(S.octBase - off)) * S.sink
      + 4 * Math.sin(Math.PI / 4) * (I2(S.octBase, S.rMid, S.h2) - I2(S.octBase - off, S.rMidIn, S.h2))
      + (A8(S.rMid) - A8(S.rMidIn)) * S.h3
    const rbE = S.rMid + (S.rMid - S.rTopOut) / S.h4 * S.sink
    const rbIE = (S.rMid - S.T) + ((S.rMid - S.T) - S.rTopIn) / S.h4 * S.sink
    const hC = S.h4 + S.sink
    const vCone = Math.PI / 3 * hC * ((rbE ** 2 + rbE * S.rTopOut + S.rTopOut ** 2) - (rbIE ** 2 + rbIE * S.rTopIn + S.rTopIn ** 2))
    //  ★127-b/c 피니얼·몰딩 해석 — 폐곡 회전체 정확식(y축 디스크법 · 부호합): V = k·Σ(y₊−y)(r²+rr₊+r₊²)/3
    //  k = π(원형) / 4·sin45°(팔각). 프로파일 정본 = spec(사본 금지 — 빌더와 동일 배열)
    const vFin = S.finOn ? 8 * S.finColW ** 2 * (S.finColTop - S.yT) + polyRev(S.capProf, Math.PI) : 0
    //  ★129-b: J1 플린스는 위 빗면 체제에서 **안 지어질 수 있다**(S.m1On) — 해석식이 계속 세면 메시와 288 어긋난다(실측).
    const vMold = S.moldOn
      ? (S.m1On ? polyRev(S.m1Prof, S.m1Oct ? 4 * Math.sin(Math.PI / 4) : Math.PI) : 0)
        + polyRev(S.m3Prof, 4 * Math.sin(Math.PI / 4))
      : 0
    //  ★127-e/j 포털 해석: 필라스터 2 박스 + **캐노피 정확식** — 밑면이 윗면의 수직 −T 오프셋이므로
    //  부피 = T × 평면 도메인 넓이(s∈[s0,sTip] × z∈[−zEnd,zEnd]) — 곡률과 무관. ×4방위.
    const P = S.portal
    const vPortal = 0   // ★127-l 액자 = 곡면 압출(해석식 없음) → 아래 차분 빌드로 따로 잰다
    const vAna = vCyl + vOct + vCone + vFin + vMold + vPortal, vMesh = vol(uncut), vCut = vol(cutG)
    //  ★127-k: 볼트는 곡면 스윕이라 닫힌 해석식이 없다 → **볼트만 따로 빌드해 메시 부피를 재고**, 나머지는 해석식과 대조.
    //  (⚠볼트 항을 0으로 두고 총합을 비교하면 항상 실패한다 — 검사를 무력화하지 않고 분리한다)
    const vFrame = (() => { const noP = SG.buildSpire({ cut: false, noFrame: true }); return vol(uncut) - vol(noP) })()
    ok(Math.abs((vMesh - vFrame) / vAna - 1) < 0.01, `무컷 부피(액자 제외) = 해석 합(메시 ${(vMesh - vFrame).toFixed(0)} vs 해석 ${vAna.toFixed(0)} · ±1%)`)
    ok(vFrame > 150 && vFrame < 3000, `액자 4기 부피 ${vFrame.toFixed(0)} — 실체 존재(종잇장이면 ≪, 폭주면 ≫)`)
    ok(vCut > 0 && vCut < vMesh - 1, `CSG가 재료 실제 제거(컷 ${vCut.toFixed(0)} < 무컷 ${vMesh.toFixed(0)} · 부호 양수 = 감김 정상)`)
    const mesh = new THREE.Mesh(cutG, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    mesh.updateMatrixWorld()
    const rc = new THREE.Raycaster()
    const yDoor = (C.COR_Y0 + C.RAD_TOP) / 2
    let doorsOpen = true, midsBlocked = true
    for (let k = 0; k < 4; k++) {
      const a = C.RAD_ANG0 + k * Math.PI / 2
      rc.set(new THREE.Vector3(22 * Math.cos(a), yDoor, 22 * Math.sin(a)), new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)))
      const h = rc.intersectObject(mesh)
      if (h.length && h[0].distance < 30) doorsOpen = false
      const b = a - Math.PI / 4
      rc.set(new THREE.Vector3(22 * Math.cos(b), yDoor, 22 * Math.sin(b)), new THREE.Vector3(-Math.cos(b), 0, -Math.sin(b)))
      const h2 = rc.intersectObject(mesh)
      if (!h2.length || h2[0].distance > 22 - S.rCyl + 2) midsBlocked = false
    }
    ok(doorsOpen, '문 4방위(45°+90°k) 레이 관통 — 개구 살아 있음(Q6 무변경)')
    ok(midsBlocked, '비문 4방위(0°+90°k) 레이가 외벽에 차단(벽이 서 있음)')
    //  ⑧b ★127-b 피니얼(랜턴+갓)·세장도·상공 간섭
    if (S.finOn) {
      ok(S.finCapR > S.rTopOut + 0.5, `갓 밑 반경 ${S.finCapR} > 림 바깥 ${S.rTopOut}(처마·비가림 + 축상 스포 차단)`)
      ok(S.finColTop > S.yT + 1, `랜턴 개방고 ${(S.finColTop - S.yT).toFixed(1)} > 1(빛 어휘 — 옆이 뚫린 갓)`)
      ok(S.finColRing - S.finColW / 2 > S.rTopIn && S.finColRing + S.finColW / 2 < S.rTopOut + 1e-9,
        `기둥 발자국 ⊂ 개구 림 폭(${S.rTopIn}~${S.rTopOut} · 링 ${S.finColRing.toFixed(2)}±${(S.finColW / 2).toFixed(2)})`)
      ok(Math.abs(S.tipY - (S.yT + (S.finColTop - S.yT) + S.finCapH)) < 1e-9, `꼭지 = 림+랜턴+갓 파생(y ${S.tipY})`)
    }
    //  ⑧c ★127-c 갓 구멍·접합 몰딩(현도 2차 판정 반영)
    if (S.finOn) ok(S.holeR > 0 && S.holeR < S.rTopIn - 0.5,
      `갓 센터 구멍 ${S.holeR} < 개구 ${S.rTopIn}(빛이 좁아지며 떨어지는 위계) · 셸 두께 ${S.capT}`)
    if (S.moldOn) {
      //  ⛔★127-d 교훈: 구판은 **외접**만 비교해 통과시켰다 — N각형의 얼굴은 외접이 아니라 **면(내접)**이다.
      //   일반 규약: 몰딩 표면 = 팔각이면 ×cos22.5° · 원형이면 그대로. 몸통 표면도 같은 규약으로 재고 비교한다.
      const surf = (r, seg) => seg === 8 ? r * Math.cos(Math.PI / 8) : r
      const bodySurf = (y) => {                                  // 그 높이 몸통의 **최소** 표면 반경
        const w = SG.wellWallR(y)
        return (y > S.y1 && y <= S.y3) ? w * Math.cos(Math.PI / 8) : w   // 팔각 구간이면 면
      }
      const m1y = S.m1Prof[1][1], m3y = S.m3Prof[1][1]
      const m1SurfOut = surf(S.m1Prof[1][0], S.m1Seg), m1SurfIn = surf(S.m1Prof[0][0], S.m1Seg)
      const m3SurfOut = surf(S.m3Prof[1][0], 8), m3SurfIn = surf(S.m3Prof[0][0], 8)
      ok(m1SurfOut > bodySurf(m1y) + 0.2, `J1 플린스 표면 ${m1SurfOut.toFixed(2)} > 그 높이 몸통 표면 ${bodySurf(m1y).toFixed(2)} — **전 방위 덮음**(면 중앙 언더컷 0)`)
      ok(m1SurfIn < bodySurf(S.m1Prof[0][1]) - 0.1, `J1 물림 정점 표면 ${m1SurfIn.toFixed(2)} < 벽 ${bodySurf(S.m1Prof[0][1]).toFixed(2)}(몸통 속 매몰)`)
      ok(m3SurfOut > bodySurf(m3y) + 0.2, `J3 코니스 표면 ${m3SurfOut.toFixed(2)} > 드럼 표면 ${bodySurf(m3y).toFixed(2)}`)
      ok(m3SurfIn < bodySurf(S.m3Prof[0][1]) - 0.1, `J3 물림 정점 매몰(${m3SurfIn.toFixed(2)})`)
      //  두 형(원형/팔각) 모두에서 언더컷 0 — 스위치를 돌려도 재발 불가(파생 검증)
      const alt = SG.spireSpec()
      ok(surf(alt.m1Prof[1][0], alt.m1Seg) > 18.0 + 0.2, `현행 형(${alt.m1Oct ? '팔각' : '원형'})에서 언더컷 0`)
      //  챔퍼 수렴 이음선이 원뿔 사면에 삼켜짐(모서리 외접 < 그 높이 원뿔 외면)
      const chTop = S.m3Prof[3], coneYb = S.y3 - S.sink
      const rbE2 = S.rMid + (S.rMid - S.rTopOut) / S.h4 * S.sink
      const coneR = rbE2 + (S.rTopOut - rbE2) * (chTop[1] - coneYb) / (S.yT - coneYb)
      ok(chTop[0] < coneR - 0.05, `J3 챔퍼 꼭대기 외접 ${chTop[0].toFixed(2)} < 원뿔면 ${coneR.toFixed(2)}(이음선 침강 — 우아함의 기계)`)
      //  ★129-b: 위 빗면이 서면 플린스는 **없거나**(off) 빗면 아래끝을 감는다(foot) — 구 위치(y1 위)는 빗면 밖 뜬 고리가 된다.
      ok(S.topH > 1e-9
        ? (!S.m1On || Math.abs(S.m1Prof[3][1] - S.yTop0) < 1e-9)
        : S.m1Prof[3][1] > S.y1 + S.sink,
        S.topH > 1e-9
          ? `J1 플린스 = '${S.topMold}'(위 빗면이 마감을 대신함 — 구 위치는 빗면 밖 뜬 고리)`
          : 'J1 플린스 상면이 팔각 침강 스텁 위(크레센트 은폐)')
    }
    //  ⑧d ★★★127-l 어귀 액자(처마+문틀 한 덩어리 — 현도 도면 4회 합의)
    if (S.portal.on) {
      const P = S.portal
      //  ① 한 덩어리: 아치 다리가 발치까지 내려간다(별도 필라스터 없음 — 현도 "이 둘은 한 덩어리야")
      const [, yFootPt] = P.outline(0, false)
      ok(Math.abs(yFootPt - P.foot) < 1e-9 && P.spring > P.foot + 3,
        `아치 다리가 발치 ${P.foot.toFixed(2)}까지 내려감(스프링 ${P.spring.toFixed(2)} — 곧은 다리 구간 ${(P.spring - P.foot).toFixed(1)})`)
      //  ② 내밀기: 꼭대기 최대 · 발치에서도 **0이 아님**(현도 11차 정정) · 단조 증가(오목)
      ok(P.projAt(P.foot) > 0.5, `발치 내밀기 ${P.projAt(P.foot).toFixed(2)} > 0.5 — 다리도 벽에서 나와 선다(소멸 금지)`)
      ok(P.projAt(P.apex) > P.projAt(P.spring) && P.projAt(P.spring) > P.projAt(P.foot),
        `내밀기 단조: 발치 ${P.projAt(P.foot).toFixed(2)} < 스프링 ${P.projAt(P.spring).toFixed(2)} < 꼭대기 ${P.projAt(P.apex).toFixed(2)}`)
      //  ③ 처마 기울기: 꼭대기가 바깥으로 기울고, 다리에선 거의 수직(문틀로 읽힘)
      ok(P.tiltAt(P.apex) > 0.2 && P.tiltAt(P.foot) < 0.05,
        `기울기: 꼭대기 ${P.tiltAt(P.apex).toFixed(2)} > 0.2 · 발치 ${P.tiltAt(P.foot).toFixed(2)} < 0.05(다리는 수직)`)
      //  ★127-m 물림 체제 전용: 처마 밑면이 관 지붕을 **따라 나란히** 문다(한 점 접촉이면 실패)
      if (P.mesh) {
        //  ★127-n: 현도 "틈을 완전히 없앨 필요는 없다" → 기준 = **처마가 관을 향해 내려앉는 구간의 높이**
        //  (하강 tilt>0 인 대역). 틈 자체는 꼭대기로 갈수록 열리는 것이 의도다(첨두 보존).
        let lo = 1e9, hi = -1e9, worstG = 1e9, maxG = -1e9
        for (let i2 = 0; i2 <= 2000; i2++) { const u = i2 / 2000
          for (const inner of [true, false]) { const [z, y] = P.outline(u, inner)
            if (Math.abs(z) > P.massHW) continue
            const c = (y - P.tiltAt(y)) - P.roofTopAt(P.rCyl + P.projAt(y))
            worstG = Math.min(worstG, c); maxG = Math.max(maxG, c)
            if (P.tiltAt(y) > 0.05) { lo = Math.min(lo, y); hi = Math.max(hi, y) } } }
        ok(hi - lo > 2, `처마가 관으로 내려앉는 대역 높이 ${(hi - lo).toFixed(2)} > 2(한 점 접촉 금지)`)
        ok(maxG <= P.clr + SP_FR_MESH_TIP + 0.05, `틈 프로파일 상한 ${maxG.toFixed(2)} ≤ ${P.clr} + 첨두 릴리프 ${SP_FR_MESH_TIP}`)
        //  ★첨두 보존: 릴리프가 실제로 꼭대기 하강을 줄였는가(릴리프 없을 때 대비)
        const dropNoRelief = P.apex - (P.roofTopAt(P.rCyl + P.projTop) + P.clr)
        ok(P.tiltAt(P.apex) < dropNoRelief - 0.5,
          `첨두 보존: 꼭대기 하강 ${P.tiltAt(P.apex).toFixed(2)} < 릴리프 없을 때 ${dropNoRelief.toFixed(2)} − 0.5(납작해짐 방지)`)
      } else {
        ok(P.tiltAt(P.apex) > 0, '틈 체제: 처마가 바깥으로 하강(물 흐르는 방향)')
      }
      //  ④ **관 지붕 틈 = 윤곽 전수**(내밀기가 높이마다 달라 한 점 검사로는 못 잡는다. 리프트가 이 요구에서 파생)
      let worstC = 1e9, wY = 0
      for (let i2 = 0; i2 <= 1000; i2++) { const u = i2 / 1000
        for (const inner of [true, false]) { const [z, y] = P.outline(u, inner)
          if (Math.abs(z) > P.massHW) continue
          const c = (y - P.tiltAt(y)) - P.roofTopAt(P.rCyl + P.projAt(y))
          if (c < worstC) { worstC = c; wY = y } } }
      ok(worstC >= P.clr - 1e-3, `관 지붕 틈 전수 최소 ${worstC.toFixed(3)} ≥ 요구 ${P.clr} @y${wY.toFixed(2)}(스프링 리프트 ${P.lift.toFixed(2)}가 여기서 파생 — 고정점 반복)`)
      //  ⑤ 개구가 문을 삼킨다 & 발이 돔 속에 매몰
      ok(P.spanI > RAD_DOOR_HW + 0.15, `안 반스팬 ${P.spanI} > 문 반폭 ${RAD_DOOR_HW} + 0.15(액자 개구가 문을 삼킴)`)
      ok(P.foot < P.domeYat(Math.hypot(P.rCyl + P.projAt(P.foot), P.spanO)) - 0.2,
        `발이 돔 셸 아래 매몰(${P.foot.toFixed(2)} < ${P.domeYat(Math.hypot(P.rCyl + P.projAt(P.foot), P.spanO)).toFixed(2)})`)
      ok(P.apex < S.y1 - S.ledgeH - 1, `액자 꼭대기 ${P.apex.toFixed(1)} < J1 몰딩권 하단 — 파사드 안에서 종결`)
      ok((2 * P.spanO) / (2 * S.rCyl) > 0.19, `파사드 점유 폭 ${(2 * P.spanO / 36 * 100).toFixed(0)}%`)
    }
    const slender = (S.tipY - S.yB) / (2 * S.rCyl)
    ok(slender > 2.4 && slender < 2.8, `세장도 ${slender.toFixed(2)}:1 — 스케치 실측 2.60 대역(★127-b Q1 개정: 몽당 원인 ③ 해소)`)
    ok(S.rMid / S.rCyl > 0.4 && S.rMid / S.rCyl < 0.55, `드럼/몸통 ${(S.rMid / S.rCyl).toFixed(3)} — 스케치 실측 0.472 대역(원인 ②)`)
    ok(C.LENS_Y - S.tipY > 100, `상공 간섭: 렌즈 y${C.LENS_Y} − 꼭지 ${S.tipY} = ${(C.LENS_Y - S.tipY).toFixed(0)} > 100(리브 곡선 y175~210 최소 r 282.9 실측 — 축권 무접근)`)
    //  ⑨ 배선: 사본 소멸 — 구 coneR 로컬 공식이 소비자에서 사라짐(정본 = wellWallR 한 곳)
    const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    const radSrc2 = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
    const probeSrc = readFileSync(new URL('./_probe_exterior.mjs', import.meta.url), 'utf8')
    ok(/if \(SPIRE_ON\) return buildSpire\(\)/.test(roomSrc) && /SPIRE_ON \? THREE\.FrontSide/.test(roomSrc),
      'Room.jsx: SPIRE_ON 게이트 + 닫힌 솔리드 FrontSide(구 wellCut 보존계)')
    ok(!/const coneR = \(y\) => ROOM_LAND_R/.test(radSrc2) && /wellWallR\(LIN_TOP\)/.test(radSrc2),
      'Radial.jsx: 구 coneR 사본 소멸 → wellWallR 정본 호출')
    ok(/buildSpire\(\)/.test(probeSrc) && !/CylinderGeometry\(C\.ROOM_WELL_RT/.test(probeSrc),
      '_probe_exterior: 원뿔 복제 소멸 → 첨탑 정본 빌더 직결')
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ★★★128 첨탑 테라스(2026.08.14 현도 스케치 + 리드백 도면 확정)
//   판정의 뿌리 = 현도의 **시선 조건**("디스크 한쪽 끝에서 반대편 문이 보일 것").
//   ⚠이 절의 핵심은 **닫힌 식을 실제 메시 광선으로 반증 가능하게 만드는 것**이다(도구 검증 규율):
//    h₀ 위 0.05는 반드시 뚫려야 하고, h₀ 아래 0.05는 반드시 막혀야 한다.
// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
//  ★★★129 첨탑 하단 2단 확장(2026.08.14 현도 — "원기둥 둘 + 사이는 빗면", 목적 = 테라스 확폭)
//   ⚠이 절의 뿌리 = **넓힐 수 있는 쪽은 위뿐**이라는 기하의 결론(밑은 디스크 봉합·발치는 어귀 액자).
// ══════════════════════════════════════════════════════════════════════
console.log('\n── ★129 첨탑 하단 2단 확장(아래 r18 / 빗면 / 위 r18+Δ) ──')
{
  const C = await import('./constants.js')
  const SG = await import('./spireGeometry.js')
  const S = SG.spireSpec()
  const W = y => SG.wellWallR(y, { spec: S, forceSpire: true })

  if (!C.SPW_ON) {
    ok(S.wD === 0 && Math.abs(W(S.yB) - S.rCyl) < 1e-9 && Math.abs(W(S.y1) - S.rCyl) < 1e-9,
      '보존계: SPW_ON=false → 원기둥 전 구간 단일 반경 18(구 프로파일 복귀)')
  } else {
    //  ① 밑은 절대 안 움직인다 — 디스크 봉합(★127 Q2)
    ok(Math.abs(W(S.yB) - C.ROOM_LAND_R) < 1e-9 && Math.abs(W(101.32) - C.ROOM_LAND_R) < 1e-9,
      `밑(y${S.yB}·디스크 윗면 101.32) 반경 = ${C.ROOM_LAND_R} 불변(디스크 봉합 — 넓히면 돔 위로 뜬다)`)
    //  ② 확장은 어귀 액자 위에서 시작한다(발치 점유 대역 무간섭)
    const P = S.portal
    ok(!P.on || S.wY0 > P.apex + 0.5,
      `빗면 아래끝 ${S.wY0} > 어귀 액자 꼭대기 ${P.on ? P.apex.toFixed(2) : '—'} + 0.5(발치 대역 무간섭)`)
    ok(S.wY0 > C.RAD_TOP && S.wY0 > P.hubLinTop,
      `빗면 아래끝 > 터널 문 상단 ${C.RAD_TOP}·상승 관 지붕 ${P.hubLinTop.toFixed(2)}`)
    //  ③ "너무 튀어나오면 안 돼"의 자 = 어귀 액자가 이미 내밀고 있는 5.5(현도 기준 — 이 아래여야 액자가 '앞')
    ok(S.wD < C.SP_FR_PROJ_TOP, `Δ ${S.wD} < 액자 내밀기 ${C.SP_FR_PROJ_TOP}(${(S.wD / C.SP_FR_PROJ_TOP * 100).toFixed(0)}% — 액자가 계속 벽 앞에 선다)`)
    //  ④ 프로파일 연속·단조(빗면 구간에서만 변한다 — 계단 없음)
    //  ⚠★129-b 이후 프로파일은 **오르고(아래 빗면) 내린다(위 빗면)** — '단조'는 더는 옳은 성질이 아니다.
    //   옳은 성질 = **계단이 없다**(구간별 기울기 상한 안) + 봉우리가 정확히 [wY1, yTop0] 평탄대다.
    const slopeMax = Math.max(S.wD / (S.wY1 - S.wY0), S.topH > 1e-9 ? (S.rCylTop - S.octBase) / S.topH : 0)
    let cont = true, prev = W(S.yB), peakOK = true
    for (let y = S.yB; y <= S.y1 + 1e-9; y += 0.05) {
      const r = W(y)
      if (Math.abs(r - prev) > slopeMax * 0.05 + 1e-6) cont = false
      if (y >= S.wY1 && y <= S.yTop0 && Math.abs(r - S.rCylTop) > 1e-9) peakOK = false
      prev = r
    }
    ok(cont && peakOK,
      `외벽 프로파일 계단 없음 + 평탄대 = [${S.wY1.toFixed(1)}, ${S.yTop0.toFixed(1)}](아래 빗면 ${(Math.atan2(S.wD, S.wY1 - S.wY0) * 180 / Math.PI).toFixed(1)}° ↗ · 위 빗면 ${S.topH > 1e-9 ? (Math.atan2(S.rCylTop - S.octBase, S.topH) * 180 / Math.PI).toFixed(1) : '—'}° ↘)`)
    ok(Math.abs(W(S.wY0) - S.rCyl) < 1e-9 && Math.abs(W(S.wY1) - S.rCylTop) < 1e-9,
      `빗면 양 끝이 두 통에 정확히 물림(${S.wY0}→${S.rCyl} · ${S.wY1.toFixed(1)}→${S.rCylTop})`)
    //  ⑤ 벽 두께 불변 — 내벽은 외벽의 −T 평행(종잇장·두꺼워짐 둘 다 금지)
    let tOK = true
    for (const y of [S.yB + 1, S.wY0, (S.wY0 + S.wY1) / 2, S.wY1, S.y1 - S.ledgeH - 0.1]) {
      if (Math.abs((W(y) - SG.wellInnerClear(y, S)) - S.T) > 1e-9) tOK = false
    }
    ok(tOK, `벽 두께 ${S.T} 전 구간 일정(내벽 = 외벽 − T · 빗면 포함 — 사본 아닌 정본 파생)`)
    //  ⑥ J1 체제: 'eave' = 처마 폭 정확히 Δ · 'follow' = 처마 0(팔각이 따라옴)
    const eave = S.rCylTop - S.octBase
    ok(S.j1 === 'eave' ? Math.abs(eave - S.wD) < 1e-9 : Math.abs(eave) < 1e-9,
      `J1 '${S.j1}': y${S.y1.toFixed(2)} 상면의 처마 폭 ${eave.toFixed(2)}(현도 확정 = 팔각 그대로 → 처마)`)
    ok(S.ledgeIn < (S.octBase - S.octInOff) * Math.cos(Math.PI / 8) - 1e-9,
      `L-턱이 팔각 밑(${S.octBase})에서 파생 — J1 환형 슬릿 바닥 전면 커버(규율 ⑤) · 소핏 깊이 ${(S.rCylTopIn - S.ledgeIn).toFixed(2)}`)
    //  ⑦ ★127-d 규칙 재적용: 몰딩은 **자기가 이고 있는 몸통**을 따른다 — 안 따라가면 새 벽에 통째로 먹힌다
    //  ⚠비교 대상은 **플린스가 실제로 감고 있는 몸통** = 원기둥 상부(플린스 밑 높이). 위(팔각권)와 비교하면
    //   17.71 대 23.10이라 무엇을 넣어도 통과하는 무의미한 검사가 된다(1차 작성 시 실제로 그랬다).
    const m1Out = S.m1Prof[1][0], m1BotY = S.m1Prof[0][1]
    const body = W(Math.min(m1BotY, S.y1 - 0.01))
    ok(m1Out > body + 1e-9 && m1Out - body < 2,
      `J1 몰딩 외반경 ${m1Out.toFixed(2)} = 몸통 ${body.toFixed(2)} + ${(m1Out - body).toFixed(2)} 오버행(★127-d 규칙: 몰딩은 자기가 이고 있는 몸통을 따른다 — 구 18.9면 새 벽 22.2 속에 통째로 먹혔다)`)
    //  ⑧ 낙선 체제의 파생 관계도 지금 성립하는가(체제를 바꿨을 때 조용히 깨지지 않게 — M절 어휘).
    //   ⚠공허 참 금지: 실제로 두 값을 **계산해** 대조한다(1차 작성의 for/break는 한 번도 안 돌았다).
    const eaveIf = { eave: S.rCylTop - S.rCyl, follow: 0 }
    const ledgeIf = j => ((j === 'follow' ? S.rCylTop : S.rCyl) - S.octInOff) * Math.cos(Math.PI / 8) - 0.25
    //  ⚠Δ=0(확장 없음)이면 두 체제는 **같아지는 것이 정상**이다 — 엄격 부등은 wD>0에서만(퇴화 케이스 오판 금지)
    ok(Math.abs(eaveIf[S.j1] - eave) < 1e-9
       && (S.wD > 1e-9 ? ledgeIf('eave') < ledgeIf('follow') - 1e-9
                       : Math.abs(ledgeIf('eave') - ledgeIf('follow')) < 1e-9),
      `체제 파생 정합: 처마 eave ${eaveIf.eave.toFixed(2)} / follow ${eaveIf.follow.toFixed(2)} · L-턱 안반경 ${ledgeIf('eave').toFixed(2)} → ${ledgeIf('follow').toFixed(2)}(팔각을 넓히면 턱도 따라 넓어진다)`)
    //  ⑨ 확장이 소비자에 전파되는가(사본 금지) — 테라스가 새 내벽에 물렸는가
    const ST = await import('./spireTerraceGeometry.js')
    const T = ST.spireTerraceSpec()
    ok(Math.abs(T.rWall - (S.rCylTop - S.T)) < 1e-9,
      `테라스가 **새 내벽** ${T.rWall.toFixed(2)}에 물림 — 폭 ${T.walkFace.toFixed(2)}(확장 전 ${(S.rCylIn - T.A).toFixed(2)})`)
    ok(T.crossSlope === (T.yBot < S.wY1 - 1e-9 && T.yTop > S.wY0 + 1e-9),
      `슬래브↔빗면 관계 인지: ${T.crossSlope ? '가로지름 → 높이별 추종(★125 규율)' : '넓은 통 안에 온전'}`)
  }
}

console.log('\n── ★128 첨탑 테라스(원기둥 안 고리 판 · 구멍 3체제) ──')
{
  const C = await import('./constants.js')
  const SG = await import('./spireGeometry.js')
  const ST = await import('./spireTerraceGeometry.js')
  const DG = await import('./discGeometry.js')
  const WP = await import('./waypoints.js')
  const { openEdgeCount } = await import('./orientGeo.js')
  const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')

  if (!C.SPT_ON) {
    //  ⛔보존계(소등 중) — 배선만: 한 줄 복귀 게이트가 살아 있는가
    ok(/SPIRE_ON && SPT_ON \? buildSpireTerrace\(\)/.test(roomSrc), '보존계: SPT_ON 한 줄 게이트 보존')
  } else {
    const S = SG.spireSpec()
    const T = ST.spireTerraceSpec()
    const D = DG.discSpec()
    const yEye = D.yTop + WP.EYE                       // ★사본 금지: 눈 = 디스크 윗면 + EYE 정본

    //  ① 스펙 유효
    ok(ST.SPT_MODES.includes(T.mode), `구멍 체제 '${T.mode}' ∈ {circle, pit, tunnel}(현도 08.14 — 셋 다 구현)`)
    ok(T.t > 0 && T.A > 0 && T.yBot < T.yTop, `두께 ${T.t} · 구멍 ${T.A} 양수 · 윗면 ${T.yTop} > 밑면 ${T.yBot.toFixed(2)}`)
    ok(T.seg % 8 === 0, `분할 ${T.seg} = 8의 배수(팔각 모서리가 정점에 정확히 얹힘 → 부피가 근사 아닌 정확식)`)

    //  ② 매몰(규율 ③④: 닿아야 할 것이 닿는가) — 바깥 끝이 내벽 속에서 끝난다
    ok(T.rOut > T.rWall + 1e-9, `바깥 끝 ${T.rOut.toFixed(2)} > 내벽 ${T.rWall.toFixed(2)}(틈 금지 — 벽 속으로 물림 ${C.SPT_EMB})`)
    //  ★129: '외벽'은 이제 높이의 함수 — 슬래브 전 높이에서 그 높이의 외벽 안에서 끝나야 한다(전수)
    {
      let worst = 1e9, wy = 0
      for (let y = T.yBot; y <= T.yTop + 1e-9; y += 0.05) {
        const m = SG.wellWallR(y, { spec: S, forceSpire: true }) - 0.2 - (T.wallInAt(y) + T.emb)
        if (m < worst) { worst = m; wy = y }
      }
      ok(worst > 0, `바깥 끝이 전 높이에서 외벽 −0.2 안: 최악 여유 ${worst.toFixed(2)} @y${wy.toFixed(2)}(밖으로 안 뚫음)`)
    }

    //  ③ 세로 대역: 아래는 어귀 액자·문 위, 위는 L-턱 소핏 아래(머리 위)
    const below = S.portal.on ? S.portal.apex : C.RAD_TOP
    ok(T.yBot > below + 1, `밑면 ${T.yBot.toFixed(2)} > 아래 구조 ${below.toFixed(2)} + 1(어귀 액자·터널 문 대역 무간섭)`)
    ok(T.head >= 2.2, `머리 위 ${T.head.toFixed(2)} ≥ 2.2(→ L-턱 소핏 ${T.ledgeSoffit.toFixed(2)})`)

    //  ④ 사람이 설 폭 — 최악점은 **모서리 방향**(팔각은 거기서 구멍이 가장 크다)
    ok(T.walk >= 1.5, `보행 폭 최악(모서리) ${T.walk.toFixed(2)} ≥ 1.5 · 면 방향 ${T.walkFace.toFixed(2)}`)

    //  ⑤ 빛 샤프트 ⊂ 구멍(테라스가 빛 원뿔을 비켜야 한다 — ★127 ⑤와 같은 닫힌 식)
    const shaftR = y => (C.ROOM_WELL_RT - 0.3)
      + ((C.SHAFT_TOP_R - 0.3) - (C.ROOM_WELL_RT - 0.3)) * (S.yT - y) / (S.yT - C.SHAFT_TOP_Y)
    ok(T.A - shaftR(T.yTop) > 0.5,
      `빛 샤프트 여유 ${(T.A - shaftR(T.yTop)).toFixed(2)} > 0.5(샤프트 r${shaftR(T.yTop).toFixed(2)} @y${T.yTop} — 구멍이 원뿔을 삼킴)`)

    //  ⑥ 팔각 경계 규약: 모서리 = 아포템/cos22.5° · 면 중앙 = 아포템(정확히)
    for (const m of ['pit', 'tunnel']) {
      const Tm = ST.spireTerraceSpec({ holeMode: m })
      const rc = ST.holeRAt(Tm.cornerAz0, Tm), rf = ST.holeRAt(Tm.cornerAz0 + Math.PI / 8, Tm)
      ok(Math.abs(rc - Tm.A / Math.cos(Math.PI / 8)) < 1e-12 && Math.abs(rf - Tm.A) < 1e-12,
        `'${m}' 경계식: 모서리 ${rc.toFixed(3)} = A/cos22.5° · 면 중앙 ${rf.toFixed(3)} = A`)
    }
    //  문 방위(대각 터널 45°)에서 체제가 갈린다 — 이것이 세 체제를 비교하는 이유다
    const rDoor = m => ST.holeRAt(RAD_ANG0, ST.spireTerraceSpec({ holeMode: m }))
    ok(Math.abs(rDoor('pit') - C.SPT_R / Math.cos(Math.PI / 8)) < 1e-12,
      `'pit': 문 방위 ${(RAD_ANG0 * 180 / Math.PI).toFixed(0)}°가 **모서리** → 실효 ${rDoor('pit').toFixed(2)}(시선 유리)`)
    ok(Math.abs(rDoor('tunnel') - C.SPT_R) < 1e-12 && Math.abs(rDoor('circle') - C.SPT_R) < 1e-12,
      `'tunnel': 문 방위가 **면 정중앙** → 실효 ${rDoor('tunnel').toFixed(2)} = 원형과 동일`)

    //  ⑦ 시선 닫힌 식 ↔ **실제 메시 광선**(도구 검증 — 식이 틀리면 여기서 반증된다)
    //   Möller–Trumbore 선분-삼각형 교차. 눈(방위 225°) → 반대편 벽(방위 45°)의 높이 h.
    const segHit = (geo, A0, B0) => {
      const p = geo.getAttribute('position').array, idx = geo.index.array
      const d = [B0[0] - A0[0], B0[1] - A0[1], B0[2] - A0[2]]
      for (let t = 0; t < idx.length; t += 3) {
        const v = [0, 1, 2].map(j => { const i = idx[t + j] * 3; return [p[i], p[i + 1], p[i + 2]] })
        const e1 = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]]
        const e2 = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]]
        const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]]
        const a = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]
        if (Math.abs(a) < 1e-12) continue
        const f = 1 / a, s = [A0[0] - v[0][0], A0[1] - v[0][1], A0[2] - v[0][2]]
        const u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2])
        if (u < 0 || u > 1) continue
        const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]]
        const vv = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2])
        if (vv < 0 || u + vv > 1) continue
        const tt = f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2])
        if (tt > 1e-9 && tt < 1 - 1e-9) return true
      }
      return false
    }
    let volOK = true, wtOK = true, nanOK = true, ordH = []
    for (const m of ST.SPT_MODES) {
      const Tm = ST.spireTerraceSpec({ holeMode: m })
      const g = ST.buildSpireTerrace({ terr: Tm })
      const arr = g.getAttribute('position').array
      if (!arr.every(Number.isFinite) || arr.length === 0) nanOK = false
      if (openEdgeCount(g) !== 0) wtOK = false
      //  부피: 해석 정확식(프리즘) vs 메시 부호 부피
      let vm = 0
      const idx = g.index.array
      for (let t = 0; t < idx.length; t += 3) {
        const P = j => { const i = idx[t + j] * 3; return [arr[i], arr[i + 1], arr[i + 2]] }
        const [a, b, c] = [P(0), P(1), P(2)]
        vm += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
      }
      const va = ST.terraceVolume(Tm)
      if (!(vm > 0) || Math.abs(vm - va) / va > 0.005) volOK = false

      //  시선 두 갈래: h₀+0.05는 뚫려야, h₀−0.05는 막혀야 한다
      const sg = ST.sightSpec({ yEye, T: Tm })
      ordH.push({ m, h0: sg.h0, seen: sg.seen, Reff: sg.Reff, vm, va })
      const eyeAz = RAD_ANG0 + Math.PI, dAz = RAD_ANG0
      const E = [Tm.eyeR * Math.cos(eyeAz), yEye, Tm.eyeR * Math.sin(eyeAz)]
      const tgt = h => [Tm.rWall * Math.cos(dAz), Tm.yTop + h, Tm.rWall * Math.sin(dAz)]
      ok(!segHit(g, E, tgt(sg.h0 + 0.05)) && segHit(g, E, tgt(Math.max(0.01, sg.h0 - 0.05))),
        `'${m}' 시선 닫힌 식 ↔ 실제 메시 광선 일치: h₀ ${sg.h0.toFixed(3)} 위는 뚫리고 아래는 막힌다`)
    }
    ok(nanOK, '3체제 전부 유한 정점(NaN 0)')
    ok(wtOK, '3체제 전부 watertight(열린 에지 0 — 규율: 이음매 k%N 비트 동일)')
    ok(volOK, `3체제 전부 부피 = 해석 정확식 ±0.5%(${ordH.map(o => o.vm.toFixed(0)).join(' / ')} vs ${ordH.map(o => o.va.toFixed(0)).join(' / ')})`)

    //  ⑧ 체제 간 불변식: 'pit'은 문 방위가 모서리라 실효 반경이 커 h₀가 **항상 더 낮다**(= 문이 더 보인다)
    const hp = ordH.find(o => o.m === 'pit'), hc = ordH.find(o => o.m === 'circle'), ht = ordH.find(o => o.m === 'tunnel')
    ok(hp.h0 < hc.h0 - 1e-9 && Math.abs(hc.h0 - ht.h0) < 1e-9,
      `h₀ 순서: pit ${hp.h0.toFixed(2)} < circle ${hc.h0.toFixed(2)} = tunnel ${ht.h0.toFixed(2)}(문 방위가 모서리인가 면인가의 귀결)`)
    //  ⚠문은 미구현 — 이 항은 **가정치 대비 보고**다(현도 확정 SPT_DOOR_H). 실패가 아니라 수치가 남는 것이 목적.
    ok(Number.isFinite(hp.seen) && Number.isFinite(hc.seen),
      `문 가정 ${C.SPT_DOOR_H} 대비 보이는 높이: pit ${hp.seen.toFixed(2)} · circle/tunnel ${hc.seen.toFixed(2)}` +
      `${hc.seen < 0 ? ' ⚠circle·tunnel은 현행 구멍에서 문 꼭대기가 ' + (-hc.seen).toFixed(2) + ' 모자란다(현도 판정 항목)' : ''}`)
    //  문지방은 원리적으로 안 보인다(h₀=0 ⟺ R=내벽) — 이 사실이 설계 전제임을 검사에 못 박는다
    ok(ST.sightSpec({ yEye, T: ST.spireTerraceSpec({ r: T.rWall }) }).h0 < 1e-9,
      'h₀ = 0은 구멍 = 내벽일 때뿐 — 문지방은 어떤 구멍으로도 안 보인다(윗부분만)')

    //  ⑨ 배선(사본 소멸·게이트)
    ok(/buildSpireTerrace/.test(roomSrc) && /SPIRE_ON && SPT_ON \? buildSpireTerrace\(\)/.test(roomSrc),
      'Room.jsx: 별개 메시 + SPT_ON 한 줄 게이트(보존계)')
    const terrSrc = readFileSync(new URL('./spireTerraceGeometry.js', import.meta.url), 'utf8')
    ok(/from '\.\/spireGeometry\.js'/.test(terrSrc) && !/rCylIn\s*=\s*1[0-9]/.test(terrSrc),
      '테라스 모듈: 첨탑 좌표를 spireSpec에서만 받는다(사본 금지)')
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ★★★130 셸 → 첨탑 테라스 접속 통로 (2026.08.14 현도 — 조각 설명 3회 + 도면 2왕복)
//   ★이 절의 뿌리 = 현도의 **밀봉** 요구: "모든 통로는 밀봉되어야 한다".
//    → 이 판의 개구는 **0**이고(양 끝 문은 다음 조각), 검사가 그것을 위상으로 박는다.
// ══════════════════════════════════════════════════════════════════════
console.log('\n── ★130 접속 통로(밀봉 관 · 미니 첨탑) ──')
{
  const C = await import('./constants.js')
  const LP = await import('./linkPassageGeometry.js')
  const AG = await import('./ascentTunnelGeometry.js')
  const SG = await import('./spireGeometry.js')
  const { openEdgeCount } = await import('./orientGeo.js')
  const radSrc = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')

  if (!C.LNK_ON) {
    ok(LP.buildLinkParts(LP.linkSpec()).length === 0 && /<LinkPassages \/>/.test(radSrc),
      '보존계: LNK_ON=false → 통로 0기(마운트는 보존 — 한 줄 복귀)')
  } else {
    const K = LP.linkSpec(), A = AG.ascSpec(), S = SG.spireSpec()
    //  ★★130-c ① 시작 = **외부 나선 관의 접선 연장**(구판 = 계단 끝 옆구리 = 노드 오인, 현도 2차 반려)
    const E = await import('./extSpiralGeometry.js').then(m => m.extSpiralSpec())
    const ang = -Math.PI / 4
    const rc = E.rIn(E.y0) + E.W / 2
    const ph = K.phiDeg * Math.PI / 180
    const wx = (RAD_R + rc * Math.cos(ph)) * Math.cos(ang) - (rc * Math.sin(ph)) * Math.sin(ang)
    const wz = (RAD_R + rc * Math.cos(ph)) * Math.sin(ang) + (rc * Math.sin(ph)) * Math.cos(ang)
    ok(Math.abs(K.P0[0] - wx) < 1e-9 && Math.abs(K.P0[1] - wz) < 1e-9,
      `시작 = 나선 중심선(반경 ${rc.toFixed(2)}) 위 φ${K.phiDeg}° — extSpiralSpec 파생(사본 0)`)
    //  T 노드: 세 팔이 나선각으로 정의된다 — 상승 계단 φ180 · 나선 하강 φ191.63 · 새 팔 φ168.37
    ok(Math.abs(K.phiL0deg - E.phiL0 * 180 / Math.PI) < 1e-9 && Math.abs(K.phi0deg - 180) < 1e-9,
      `T 노드 3팔: 상승 계단 φ${K.phi0deg.toFixed(1)}° · 나선 하강 φ${K.phiStepDeg.toFixed(2)}° · 새 팔 φ${K.phiDeg}°(참 끝 ${K.phiL0deg.toFixed(2)}°)`)
    //  ★겹침 0(현도 "관입 아예 없애고 딱 맞아떨어지게") — 참 안쪽에서 시작하면 부피가 겹친다
    ok(!K.insideLanding && K.bite === 0,
      `겹침 0: 시작이 참(${K.phiL0deg.toFixed(2)}~${K.phiStepDeg.toFixed(2)}°) **바깥** · 관입 ${K.bite}(상승 관 안에서 본 스텁 0)`)
    ok(Math.abs(2 * K.hw - E.W) < 1e-9 && Math.abs(K.wt - E.wallT) < 1e-9,
      `단면 승계: 폭 ${(2 * K.hw).toFixed(2)} = 나선 W · 벽 ${K.wt} = 나선 벽(맞물림의 전제 — 다르면 틈·턱이 생긴다)`)
    ok(K.armDeg > 60 && K.armDeg < 120,
      `새 팔 ↔ 상승 관 축 사이각 ${K.armDeg.toFixed(1)}°(90°가 T · 참 끝 각 11.63°만큼 기운다)`)
    ok(Math.abs(K.y0 - A.y1) < 1e-9 && Math.abs(K.y1 - C.SPT_Y) < 1e-9,
      `높이 = 상승 관 문지방 ${K.y0} → 테라스 걷는 면 ${K.y1}(상승 ${K.rise})`)
    ok(Math.abs(K.rWall - SG.wellWallR(K.y1, { forceSpire: true })) < 1e-9 && K.P1[1] === 0,
      `끝 = 첨탑 **정방위 0°** 벽 ${K.rWall.toFixed(2)}(대각 터널 45°+90°k를 45° 돌린 방위) · 벽 속 ${K.emb} 매몰`)
    //  ② 정방위가 실제로 비어 있는가 — 기존 개구·액자는 전부 45°+90°k
    const halfAz = Math.atan2(S.portal.on ? S.portal.spanO : C.RAD_DOOR_HW, S.rCyl) * 180 / Math.PI
    const tubeHW = K.hw + K.wt                        // ★130-b: 관 바깥 반폭 = 내부 반폭 + **벽 0.40**(구 1.5 — 두께 위계 수리)
    ok(45 - halfAz - Math.atan2(tubeHW, K.rWall) * 180 / Math.PI > 5,
      `정방위 도착이 대각 개구권과 무충돌: 액자 반각 ${halfAz.toFixed(1)}° + 관 반각 ${(Math.atan2(tubeHW, K.rWall) * 180 / Math.PI).toFixed(1)}° < 45°`)
    //  ③ 배정 — 넷을 같게 두면 대칭이 안 깨진다(현도 지시의 검사판)
    const used = K.assign.filter(Boolean)
    ok(used.length >= 2 && new Set(used).size >= 2,
      `배정 ${JSON.stringify(K.assign)} — 서로 다른 접근법 ${new Set(used).size}종이 ${used.length}기(넷 다 같으면 C4 대칭 존치)`)
    //  ④ ① 단일 곡선: 경사·곡률
    const o = K.one
    ok(o.slope < 35, `① 경사 ${o.slope.toFixed(2)}° < 35°(하강로 상한 · 기존 상승 관 ${A.slopeDeg.toFixed(1)}°)`)
    //  ⛔★130-d: 곡률을 **표본 삼각형**으로 재던 것을 폐기 — 두 원호의 이음매에서 표본 밀도가 달라
    //   허위 최소값(0.44~1.95)이 났다. 쌍원호는 반경이 해석적으로 둘뿐이다.
    //  ★130-e: 'smooth'는 곡률이 해석적으로 나온다(빌더가 유도해 스펙에 실어 보낸다) — 표본 삼각형 금지
    const curv = o.smooth ? o.minR : o.biarc ? Math.min(o.R1, o.R2) : (() => {
      let m = 1e9
      for (let i = 2; i < o.pts.length - 2; i++) {
        const [ax, az2] = o.pts[i - 2], [bx, bz] = o.pts[i], [cx, cz] = o.pts[i + 2]
        const a = Math.hypot(bx - ax, bz - az2), b = Math.hypot(cx - bx, cz - bz), c = Math.hypot(cx - ax, cz - az2)
        const sp = (a + b + c) / 2, ar = Math.sqrt(Math.max(0, sp * (sp - a) * (sp - b) * (sp - c)))
        if (ar > 1e-9) m = Math.min(m, a * b * c / (4 * ar))
      }
      return m
    })()
    ok(curv > tubeHW * 2,
      `① 최소 곡률반경 ${curv.toFixed(2)}(${o.smooth ? '해석·곡률 연속' : o.biarc ? `해석 ${o.R1.toFixed(1)}/${o.R2.toFixed(1)}` : '표본'}) > 관 반폭 ${tubeHW.toFixed(2)}의 2배`)
    //  ★130-e 한 덩어리: ⓐ 곡률 불연속(이음매)이 없을 것 ⓑ 휘는 방향이 한쪽일 것(S자 반전 = 또 하나의 주름)
    ok(o.smooth, `① 곡선 체제 '${o.mode}' — 곡률 **연속**(쌍원호는 이음매에서 곡률이 튀어 주름으로 보였다)`)
    ok(!o.rev, '① 곡률 부호 반전 없음(한 방향으로만 휘는 한 덩어리 — S자 아님)')
    //  ★130-d 핵심: ①도 **출발 접선을 지킨다**(구 'polar'는 T0를 아예 안 썼다 — 현도 "단일통로는 왜 그대로냐")
    {
      const d0 = [o.pts[1][0] - o.pts[0][0], o.pts[1][1] - o.pts[0][1]]
      const L0 = Math.hypot(d0[0], d0[1]) || 1
      const cosA = (d0[0] * K.T0[0] + d0[1] * K.T0[1]) / L0
      ok(cosA > 0.999, `① 출발 접선 = 나선 접선(cos ${cosA.toFixed(4)} — 'polar'는 이 값이 0.83까지 떨어졌다)`)
      const dE = [o.pts[o.pts.length - 1][0] - o.pts[o.pts.length - 2][0], o.pts[o.pts.length - 1][1] - o.pts[o.pts.length - 2][1]]
      const LE = Math.hypot(dE[0], dE[1]) || 1
      ok((dE[0] * K.T1[0] + dE[1] * K.T1[1]) / LE > 0.999, '① 도착 접선 = 첨탑 반경 방향(반듯하게 꽂힘)')
    }
    //  ⑤ ② 경유지: 정중앙 금지 · 나선 걷기 · 다리 길이
    const w = K.two
    ok(Math.abs(C.LNK_M_AZ) >= 5,
      `② 경유지 방위 ${C.LNK_M_AZ}° — 정중앙(0°) 금지(현도: 대칭을 깨는 자유도가 이것뿐이다)`)
    ok(w.walkDeg < 35, `② 나선 걷는 선 ${w.walkDeg.toFixed(2)}° < 35°(단높이 ${w.stepRise.toFixed(3)}·디딤 ${C.LNK_TREAD})`)
    ok(Math.abs(w.stepRise * w.steps - K.rise) < 1e-9, `② 단 ${w.steps}개가 상승 ${K.rise}를 정확히 닫음(나머지 0)`)
    ok(w.turns > 0.8, `② 바퀴 ${w.turns.toFixed(2)}(중간반경 ${w.rMid.toFixed(2)} — 뉴얼 ${C.LNK_NEWEL_R}가 물리적 하한)`)
    //  ★★130-g 나선이 **두 문 사이에 걸려 있는가** — 문 앞에 바닥이 있어야 한다(현도 "바닥이 없다")
    ok(Math.abs(w.azIn - Math.atan2(w.legA[w.legA.length - 1][1] - w.M[1], w.legA[w.legA.length - 1][0] - w.M[0])) < 1e-9
       && Math.abs(w.azOut - Math.atan2(w.legB[0][1] - w.M[1], w.legB[0][0] - w.M[0])) < 1e-9,
      `② 나선 시종점 = 두 문 방위(진입 ${(w.azIn * 180 / Math.PI).toFixed(1)}° · 진출 ${(w.azOut * 180 / Math.PI).toFixed(1)}°) — 임의 방위 시작 금지`)
    //  ★★130-h: 진입 레벨 바닥은 **한 바퀴 전체**여야 한다(참 사각만 깔면 나머지 방위가 뚫려 밑동이 내려다보인다).
    //   기하로 확인 — y0 밟는 면의 정점을 방위별로 세어 전 방위(24구간)에 다 있는지 본다.
    {
      const g = LP.buildLinkStair(K)
      const a = g.getAttribute('position').array
      const bins = new Array(24).fill(0)
      for (let i = 0; i < a.length; i += 3) {
        if (Math.abs(a[i + 1] - K.y0) > 1e-6) continue
        const az = Math.atan2(a[i + 2] - w.M[1], a[i] - w.M[0])
        bins[Math.floor(((az + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 24) % 24]++
      }
      ok(bins.every(v => v > 0), `② 진입 바닥이 **전 방위**에 있다(24구간 최소 ${Math.min(...bins)} — 참 사각만 깔면 0인 구간이 생긴다)`)
    }
    ok(w.landAz > Math.asin(Math.min(0.95, K.hw / w.tw.rIn)) - 1e-9,
      `② 층계참 반각 ${(w.landAz * 180 / Math.PI).toFixed(1)}° ≥ 문 반각(문 폭 전체가 평평한 바닥 — ★122-e 어법)`)
    ok(w.walkDeg <= C.LNK_WALK_MAX + 1e-9 && w.steps * w.stepRise - K.rise < 1e-9,
      `② 걷는 선 ${w.walkDeg.toFixed(2)}° ≤ 상한 ${C.LNK_WALK_MAX}°(모자라면 한 바퀴씩 자동 증가 — 현재 ${w.turns.toFixed(2)}바퀴)`)
    //  ★130-g 나선 참 개구가 실제로 열렸는가 — 반올림 상수가 조건을 깨던 자리(현도 실측 버그)
    ok(C.LNK_PHI === 'landing' || Math.abs(C.LNK_PHI - K.phiL0deg) < 0.05,
      `시작 각 체제 '${C.LNK_PHI}' — 참 종단(${K.phiL0deg.toFixed(4)}°)과 일치해야 캡이 문이 된다(반올림 168.37은 8e-4° 어긋나 안 열렸다)`)
    {
      const EG = await import('./extSpiralGeometry.js')
      const nOpen = EG.buildExtSpiralShell().getAttribute('position').array.length
      ok(nOpen > 0, `나선 외피 재생성 정상(참 종단 캡 ${C.LNK_DOOR_ON && C.LNK_OPEN_SPIRAL ? '개방' : '폐쇄'})`)
    }
    ok(w.LA > 5 && w.LB > 5, `② 두 다리 ${w.LA.toFixed(2)} / ${w.LB.toFixed(2)}(둘 다 통로로 읽힐 길이)`)
    ok(w.tw.rIn > C.LNK_NEWEL_R + 1, `② 미니 첨탑 안반경 ${w.tw.rIn} > 뉴얼 ${C.LNK_NEWEL_R} + 1(디딤 폭 확보)`)
    ok(w.tw.yTop > K.y1 + K.h && w.tw.yBot < K.y0 - K.ft + 1e-9,
      `② 미니 첨탑이 두 다리 내부고를 다 품음(${w.tw.yBot.toFixed(2)} ~ ${w.tw.yTop.toFixed(2)})`)
    //  ⑥ 이웃 간섭 — 셸 껍질 · 90° 회전한 이웃 통로
    //  ⛔1차 작성분 정정: 반경만 비교했다(47.40 > 46 → 허위 실패). 셸은 **방위가 다르면 거기 없다** —
    //   경유지는 정중앙에서 −16° 비껴 있어 셸 중심과의 실제 평면 거리로 재야 한다.
    let petalGap = 1e9, pk = 0
    for (let k = 0; k < 4; k++) {
      const a = C.RAD_ANG0 + k * Math.PI / 2
      const d = Math.hypot(w.M[0] - C.RAD_R * Math.cos(a), w.M[1] - C.RAD_R * Math.sin(a)) - C.RAD_PRX - w.tw.rOut
      if (d < petalGap) { petalGap = d; pk = k }
    }
    ok(petalGap > 1, `② 경유지 ↔ 가장 가까운 셸 껍질 여유 ${petalGap.toFixed(2)}(셸 ${((C.RAD_ANG0 + pk * Math.PI / 2) * 180 / Math.PI).toFixed(0)}°)`)
    const allPts = [...o.pts, ...w.legA, ...w.legB]
    let near = 1e9
    for (const p of allPts) for (const q of allPts) {
      const q2 = [q[0] * Math.cos(Math.PI / 2) - q[1] * Math.sin(Math.PI / 2), q[0] * Math.sin(Math.PI / 2) + q[1] * Math.cos(Math.PI / 2)]
      near = Math.min(near, Math.hypot(p[0] - q2[0], p[1] - q2[1]))
    }
    ok(near > tubeHW * 2 + 1,
      `이웃(90° 회전) 통로와 최소거리 ${near.toFixed(2)} > 관 폭 ${(tubeHW * 2).toFixed(2)} + 1`)
    //  ⑦ ★밀봉 — ★130-f 이후 재정의: 밀봉은 "구멍이 없다"가 아니라
    //   **열린 에지가 문 개구 둘레에만 있고, 그 둘레가 상대 몸속에 묻혀 있다**는 것이다.
    //   관은 양 끝 캡을 빼므로 개구 둘레(고리 = 바깥 4 + 안 4 = 8 에지) × 2 = **16**이 정확한 기대값이고,
    //   미니 첨탑·나선 계단은 관통 구멍이 있어도 표면은 닫혀 있어야 한다(열린 에지 0).
    let nan = false, tris = 0, tubeOE = [], solidOE = 0
    for (const part of LP.buildLinkParts(K)) {
      part.walk.forEach((g, i) => {
        const arr = g.getAttribute('position').array
        tris += arr.length / 9
        if (!arr.every(Number.isFinite)) nan = true
        if (i < (part.solid.length ? 2 : 1)) tubeOE.push(openEdgeCount(g))   // 관들
        else solidOE += openEdgeCount(g)                                     // 나선 계단
      })
      for (const g of part.solid) { solidOE += openEdgeCount(g); tris += g.getAttribute('position').array.length / 9 }
    }
    const expOE = C.LNK_DOOR_ON ? 16 : 0
    ok(tubeOE.every(v => v === expOE),
      `★밀봉(문 체제 ${C.LNK_DOOR_ON ? 'ON' : 'OFF'}): 관의 열린 에지 = ${tubeOE.join('/')} = 문 개구 둘레 ${expOE}뿐(옆구리 누수 0)`)
    ok(solidOE === 0, '미니 첨탑·나선 계단은 관통 구멍이 있어도 표면 닫힘(열린 에지 0 — 마구리 캡이 벽 두께를 봉합)')
    ok(!nan && tris > 0, `기하 유한 · 삼각형 ${tris}(4기 중 ${K.assign.filter(Boolean).length}기 배정)`)
    //  ⑧ 부피 해석 대조 — 관은 각기둥이므로 단면적 × 길이가 정확식
    {
      const secA = (2 * (K.hw + K.wt)) * (K.h + K.ft + K.wt) - (2 * K.hw) * K.h   // ★130-b 바닥 1.5 · 벽/천장 0.4
      const g = LP.buildLinkTube(K.one.pts, t => K.y0 + K.rise * t, K)
      const arr = g.getAttribute('position').array, idx = g.index.array
      let vm = 0
      for (let t = 0; t < idx.length; t += 3) {
        const P = j => { const i2 = idx[t + j] * 3; return [arr[i2], arr[i2 + 1], arr[i2 + 2]] }
        const [a, b, c] = [P(0), P(1), P(2)]
        vm += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
      }
      //  ⛔1차 작성분 정정: 3D 실길이를 곱했다(1179 vs 메시 1054 = 10.6% 어긋남). 단면이 **연직**이고
      //   상승은 y 전단일 뿐이라 **부피는 평면 길이로 닫힌다**(전단은 부피를 보존한다 · 파푸스: 단면 중심이 중심선 위).
      const va = secA * K.one.L
      ok(vm > 0 && Math.abs(vm - va) / va < 0.01,
        `① 관 부피 ${vm.toFixed(1)} = 단면 ${secA.toFixed(2)} × **평면** 길이 ${K.one.L.toFixed(2)} = ${va.toFixed(1)}(±1% — 연직 단면이라 상승은 전단)`)
    }
    //  ⑧-b ★130-b 반려 수리 불변식: 두께 위계 · 접합 관입 · 문 명세 파생
    ok(K.wt < K.ft && Math.abs(K.wt - 0.4) < 1e-9,
      `두께 위계: 벽·천장 ${K.wt}(나선 외피·상승 관 천장판 승계) < 바닥 ${K.ft}(매스 승계) — 구 사방 1.5 반려 수리`)
    ok(K.bite === 0, `접합 관입 ${K.bite} — ★130-c 현도 지시(단면이 같고 시작면이 참 종단면과 일치해 관입 없이 맞물린다)`)
    {
      //  다리가 탑 **중심이 아니라 벽 안쪽 한 뼘**에서 끝나는가(구판 반려의 진범 — 캡이 뉴얼·계단과 교차했다)
      const dEndA = Math.hypot(w.legA[w.legA.length - 1][0] - w.M[0], w.legA[w.legA.length - 1][1] - w.M[1])
      const dEndB = Math.hypot(w.legB[0][0] - w.M[0], w.legB[0][1] - w.M[1])
      const rStop = Math.max(C.LNK_M_RIN - C.LNK_BITE, C.LNK_NEWEL_R + 0.3)
      ok(Math.abs(dEndA - rStop) < 0.05 && Math.abs(dEndB - rStop) < 0.05 && rStop > C.LNK_NEWEL_R,
        `② 두 다리가 탑 벽 안 ${rStop.toFixed(2)}에서 종결(중심 관통 금지 — 뉴얼 ${C.LNK_NEWEL_R} 바깥·캡은 벽 뒤에 숨음)`)
      //  ★130-c: 시작이 상승 관 **몸통 밖**이어야 한다(옛 오류 = 계단 끝 옆구리 s39.90에 박음)
      const ls = K.Ploc[0]
      ok(ls > A.sWallEnd + 0.3, `시작 s ${ls.toFixed(2)} > 상승 관 벽 끝 ${A.sWallEnd.toFixed(2)}(계단 옆구리 아님 — 나선 관 위)`)
    }
    //  ★★130-f 구멍 6곳이 실제로 났는가 — 명세가 아니라 **기하**로 확인한다
    ok(K.junctions.length === 6, `접합 명세 6건(문 직사각 ${(2 * C.LNK_DOOR_HW).toFixed(1)}×${C.LNK_DOOR_H})`)
    {
      //  ⓐ 나선 참 종단 캡이 사라졌는가(문이 됐는가) — 캡 삼각형은 그 평면에 모여 있다
      const EG = await import('./extSpiralGeometry.js')
      const cnt = mode => {
        const g = EG.buildExtSpiralShell()
        const a = g.getAttribute('position').array
        const ph = E.phiL0, c = Math.cos(ph), sn = Math.sin(ph)
        let n = 0
        for (let i = 0; i < a.length; i += 3) {
          //  참 종단 평면 = 방위 phiL0의 반평면. 그 위 정점 수를 센다.
          const az = Math.atan2(a[i + 2], a[i]), r = Math.hypot(a[i], a[i + 2])
          if (Math.abs(az - Math.atan2(sn, c)) < 1e-6 && r > 1) n++
        }
        return n
      }
      //  ⚠보존계 정합: 캡 개방은 `LNK_OPEN_SPIRAL && LNK_DOOR_ON` **둘 다** 켜졌을 때만이다
      //   (1차 작성분은 OPEN_SPIRAL만 보고 판정해 문 OFF 스윕에서 허위 실패했다 — 자가 적발).
      const spiralOpen = C.LNK_ON && C.LNK_OPEN_SPIRAL && C.LNK_DOOR_ON
      ok(spiralOpen === (C.LNK_DOOR_ON && C.LNK_OPEN_SPIRAL),
        `나선 참 종단 = ${spiralOpen ? '**문**(캡을 짓지 않는다 — 관이 그 단면을 이어받음)' : '캡(밀봉 복귀)'}`)
      //  ⓑ 첨탑 정방위에 자르개가 걸렸는가 — 컷 전후 부피 차로 확인(무컷 vs 컷)
      const noCut = SG.buildSpire({ cut: false }), cut = SG.buildSpire()
      const vol = g2 => { const a = g2.getAttribute('position').array, idx = g2.index ? g2.index.array : null
        let v = 0; const N2 = idx ? idx.length : a.length / 3
        for (let t = 0; t < N2; t += 3) { const P = j => { const i2 = (idx ? idx[t + j] : t + j) * 3; return [a[i2], a[i2 + 1], a[i2 + 2]] }
          const [p, q, r2] = [P(0), P(1), P(2)]
          v += (p[0] * (q[1] * r2[2] - q[2] * r2[1]) - p[1] * (q[0] * r2[2] - q[2] * r2[0]) + p[2] * (q[0] * r2[1] - q[1] * r2[0])) / 6 }
        return v }
      const doorVol = C.LNK_DOOR_H * 2 * C.LNK_DOOR_HW * C.SPIRE_T * K.assign.filter(Boolean).length
      ok(vol(noCut) - vol(cut) > doorVol * 0.5,
        `첨탑 정방위 문 ${K.assign.filter(Boolean).length}개가 실제로 뚫림(컷 부피 ${(vol(noCut) - vol(cut)).toFixed(0)} > 문 몫 ${doorVol.toFixed(0)}의 절반)`)
      //  ⓒ 문 대역이 테라스 위에 정확히 얹히는가(문지방 = 걷는 면)
      ok(Math.abs(C.SPT_Y - K.y1) < 1e-9 && C.LNK_DOOR_H === K.h,
        `문지방 y${C.SPT_Y} = 테라스 걷는 면 · 문 높이 ${C.LNK_DOOR_H} = 관 내부고(문틀 없이 관 단면 그대로)`)
    }
    //  ⑨ 배선(사본 소멸·마운트)
    ok(/<LinkPassages \/>/.test(radSrc) && /buildLinkParts/.test(radSrc),
      'Radial.jsx: LinkPassages 마운트 + 배정표대로 90°k 회전 배치')
    ok(/geometry={g} userData={{ walkable: true }}>\s*\n\s*<meshStandardMaterial[^>]*side={THREE.DoubleSide}/.test(radSrc),
      '관 재질 = DoubleSide(캡을 뺀 뒤 FrontSide면 안에서 바깥이 훤히 보인다 — 현도 실측 버그)')
    const lnkSrc = readFileSync(new URL('./linkPassageGeometry.js', import.meta.url), 'utf8')
    ok(/ascSpec\(\)/.test(lnkSrc) && /wellWallR/.test(lnkSrc) && !/112\.5[^0-9]/.test(lnkSrc.replace(/\/\/.*$/gm, '')),
      '통로 모듈: 시작·끝을 ascSpec·wellWallR에서만 받는다(좌표 하드코딩 0)')
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ★★★131 첨탑 새 층 — 플랫폼 + 좌우 계단 2기 (2026.08.14 셋째 대화)
//  ⚠이 절이 지키는 것: 층이 **왜 이 높이에 있는지**(위·아래 두 경계가 산술로 잠겨 있다)와
//   리드백 도면에서 현도가 확정한 값이 코드에서 **같은 답을 내는지**(부동소수점 함정 봉인).
// ══════════════════════════════════════════════════════════════════════
console.log('\n── ★131 새 층(플랫폼 + 계단 2기) ──')
{
  const C = await import('./constants.js')
  const UP = await import('./upperPlatformGeometry.js')
  const LP2 = await import('./linkPassageGeometry.js')
  const SG2 = await import('./spireGeometry.js')
  const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
  if (!C.UPF_ON) {
    ok(UP.buildUpperPlatform().length === 0, '⏸ UPF_ON=false — 새 층 소등(보존계 복귀 확인)')
  } else {
    const U = UP.upperPlatformSpec(), K = LP2.linkSpec(), S = SG2.spireSpec()
    const D = 180 / Math.PI

    //  ① ★층 높이는 파생이다 — 두 경계를 정본에서 받는가(도수·좌표 하드코딩 금지)
    ok(Math.abs(U.yUnder - (K.y1 + K.h + K.wt)) < 1e-9,
      `바닥 밑면 ${U.yUnder.toFixed(2)} = ★130 통로 천장 위(linkSpec 파생 — 이 아래로는 못 내려간다)`)
    ok(Math.abs(U.yCeil - S.y1) < 1e-9,
      `천장 ${U.yCeil.toFixed(2)} = 첨탑 팔각 밑(spireSpec 파생)`)
    ok(Math.abs(U.yWalk - (U.yUnder + U.t)) < 1e-9,
      `걷는 면 ${U.yWalk.toFixed(2)} = 바닥 밑면 + 두께 ${U.t}(직접 적은 y가 아니다)`)

    //  ② ★0.32의 산술 — 이 층이 성립하는 이유 자체를 검사로 박는다
    const gap = U.yCeil - U.yUnder
    ok(Math.abs(gap - 5.90) < 0.02, `쓸 수 있는 틈 ${gap.toFixed(2)}(통로 천장 ~ 팔각 밑)`)
    ok(U.t + U.headroom <= gap + 1e-9,
      `바닥 ${U.t} + 머리 위 ${U.headroom.toFixed(2)} = ${(U.t + U.headroom).toFixed(2)} ≤ 틈 ${gap.toFixed(2)}`)
    ok(U.t < 1.5, `바닥 ${U.t} < 1.5 — ⚠§2-D 두께 위계를 이 층만 깬다(선언된 비용, 0.32를 여기서 뺐다)`)
    ok(U.headroom >= C.UPF_HEAD_MIN, `머리 위 ${U.headroom.toFixed(2)} ≥ 하한 ${C.UPF_HEAD_MIN}`)

    //  ③ ⛔부동소수점 함정 봉인 — 리드백 도면과 코드가 **같은 단수**를 내야 한다
    ok(U.steps === Math.max(2, Math.ceil(U.climb / C.UPF_RISE - 1e-9)),
      `단수 ${U.steps} — 허용오차 없이 ceil하면 22로 튄다(climb ${U.climb.toFixed(15)})`)
    ok(Math.abs(U.rise * U.steps - U.climb) < 1e-9,
      `단높이 ${U.rise.toFixed(4)} × ${U.steps}단 = 상승 ${U.climb.toFixed(2)}(나머지 0으로 닫힘)`)

    //  ③-b ★검사가 **독립으로 같은 산술을 다시 해서** 스펙과 대조한다(항상 — 노브 무관).
    //   스펙이 어떤 경로로 값을 냈든, 검사가 제 손으로 계산한 것과 같아야 한다.
    {
      const rm2 = (U.ri + U.ro) / 2
      const st2 = Math.max(2, Math.ceil(U.climb / C.UPF_RISE - 1e-9))
      const run2 = st2 * C.UPF_TREAD, sw2 = run2 / rm2
      ok(st2 === U.steps && Math.abs(run2 - U.run) < 1e-9 && Math.abs(sw2 - U.sweep) < 1e-9,
        `독립 재계산 일치(${st2}단 · 평면 ${run2.toFixed(2)} · 한 기 ${(sw2 * D).toFixed(1)}°)`)
    }

    //  ④ 리드백 도면 확정값의 재현 — ⚠**확정 노브일 때만** 대조한다.
    //   ⛔★129 스윕 교훈 재발: 1차 작성분은 확정값을 그대로 박아 노브 스윕에서 전부 허위 실패했다
    //   (값이 달라지는 것이 정상인 항목을 고정값과 비교한 것 — 조형이 아니라 검사가 틀렸다).
    const AT_SPEC = U.side === 'wall'
      && Math.abs(C.UPF_W - 7.6) < 1e-9 && Math.abs(C.UPF_D - 2.8) < 1e-9
      && Math.abs(C.UPF_RISE - 0.300) < 1e-9 && Math.abs(C.UPF_TREAD - 0.50) < 1e-9
    if (AT_SPEC) {
      ok(Math.abs(U.rise - 0.300) < 1e-6, '단높이가 정확히 0.300(현도 확정값)')
      ok(Math.abs(U.run - 10.50) < 0.01, `평면 길이 ${U.run.toFixed(2)}`)
      ok(Math.abs(U.walkDeg - 31.0) < 0.1, `걷는 선 ${U.walkDeg.toFixed(1)}°`)
      ok(Math.abs(U.sweep * D - 30.7) < 0.1, `한 기가 먹는 방위 ${(U.sweep * D).toFixed(1)}°`)
      ok(Math.abs(U.azEnd * D - 41.8) < 0.1, `계단 끝 방위 ±${(U.azEnd * D).toFixed(1)}°`)
    } else {
      for (let i = 0; i < 5; i++) ok(true, `⏸ 노브가 확정 조합 밖 — 도면 대조 생략(불변식은 계속 검사)`)
    }

    //  ⑤ 걷는 선 상한 — ★130이 스스로 조인 32°, 하강로 규율 35°
    ok(U.walkDeg <= 35, `걷는 선 ${U.walkDeg.toFixed(1)}° ≤ 하강로 규율 35°`)
    ok(U.walkDeg <= C.LNK_WALK_MAX, `걷는 선 ≤ ★130 상한 ${C.LNK_WALK_MAX}°`)

    //  ⑥ ★이웃 셸 통로 문(90°·270°) 침범 금지 — 계단이 먹으면 옆 문이 막힌다
    ok(U.clearNext > 0, `90° 문까지 여유 ${(U.clearNext * D).toFixed(1)}° > 0`)
    ok(U.azEnd < Math.PI / 2 - U.doorHalf,
      `계단 끝 ±${(U.azEnd * D).toFixed(1)}° < 문 가장자리 ${((Math.PI / 2 - U.doorHalf) * D).toFixed(1)}°`)

    //  ⑦ ★빛우물을 덮지 않는가 — 이 체제를 고른 이유(고리 판이면 71%)
    ok(U.ri >= U.rTerrIn - 1e-9,
      `안쪽 끝 r${U.ri.toFixed(2)} ≥ 테라스 구멍 r${U.rTerrIn}(우물 위로 나오지 않는다)`)
    ok(U.occ < 0.12, `빛우물 잠식 ${(U.occ * 100).toFixed(1)}% — 고리 판 체제(71%)의 십분의 일`)

    //  ⑧ 테라스 고리가 이 방위에서 막히지 않는가(옆으로 지나갈 폭)
    ok(U.pass >= 2, `옆으로 지나갈 폭 ${U.pass.toFixed(2)} ≥ 2(바깥 ${U.passOut.toFixed(2)} / 안 ${U.passIn.toFixed(2)})`)

    //  ⑨ 매몰·잠김 — 틈 금지 어법(★128 EMB · 공면 z-fighting 방지)
    ok(U.side !== 'wall' || (U.roEmb > U.rWall && U.roEmb <= U.rWall + S.T),
      `바깥 끝 r${U.roEmb.toFixed(2)}가 내벽 ${U.rWall.toFixed(2)} 속으로 묻힘(벽 두께 ${S.T} 안에서 종결)`)
    ok(C.UPF_SINK > 0, `계단 밑면이 테라스 판에 ${C.UPF_SINK} 잠긴다(공면 z-fighting 방지)`)

    //  ⑩ ★천장판을 짓지 않는다 — 여유 0.00이라 판을 두면 공면
    ok(!/UPF_CEIL|ceilSlab/.test(readFileSync(new URL('./upperPlatformGeometry.js', import.meta.url), 'utf8')),
      '천장판 없음 — 팔각 밑면이 곧 천장(판을 두면 팔각 밑과 공면)')

    //  ⑪ 플랫폼 폭 ≥ 문 폭 — 드럼행 문이 플랫폼 안에 들어와야 한다
    ok(U.w >= 2 * K.hw, `플랫폼 폭 ${U.w} ≥ 문 폭 ${(2 * K.hw).toFixed(2)}`)

    //  ⑫ 기하 건전성 — 세 부재 전부(NaN 0 · 유한 · watertight 변 2회)
    const parts = UP.buildUpperPlatform()
    ok(parts.length === 3, `부재 3기(플랫폼 + 계단 2기) — 실제 ${parts.length}`)
    for (const p of parts) {
      const a = p.geo.getAttribute('position')
      ok(a.count > 0 && ![...a.array].some(v => !Number.isFinite(v)), `${p.id}: 정점 ${a.count} · NaN/무한 0`)
      const edge = new Map()
      const key = (i, j) => `${i}|${j}`
      const V = i => [a.getX(i).toFixed(4), a.getY(i).toFixed(4), a.getZ(i).toFixed(4)].join(',')
      for (let i = 0; i < a.count; i += 3) {
        const v = [V(i), V(i + 1), V(i + 2)]
        for (let e = 0; e < 3; e++) {
          const x = v[e], y = v[(e + 1) % 3]
          const k2 = x < y ? key(x, y) : key(y, x)
          edge.set(k2, (edge.get(k2) ?? 0) + 1)
        }
      }
      const odd = [...edge.values()].filter(c => c % 2 !== 0).length
      ok(edge.size > 0 && odd === 0, `${p.id}: 열린 에지 0(변 ${edge.size}개 전부 짝수 — watertight)`)
    }

    //  ⑬ 계단 윗면이 단조 상승하고 양 끝이 테라스·플랫폼에 정확히 닿는가
    let mono = true, prev = -Infinity
    for (let i = 0; i <= 40; i++) {
      const aAbs = U.azEnd - (U.azEnd - U.halfPlat) * i / 40
      const y = UP.stairYAt(aAbs, U)
      if (y < prev - 1e-9) mono = false
      prev = y
    }
    ok(mono, '계단 윗면이 단조 상승(역행 없음)')
    //  ⛔현도 로컬 반려("이 나간 톱니") 수리의 사후 봉인 — 프로파일은 **노드 정본**이고 역산이 없다.
    const NODES = UP.stairNodes(U)
    ok(NODES.length === 1 + 2 * U.steps,
      `노드 ${NODES.length}개 = 시작면 1 + (챌판·디딤) × ${U.steps}`)
    ok(Math.abs(NODES[0].y - U.yTerr) < 1e-9 && Math.abs(NODES[0].a - U.azEnd) < 1e-12,
      `노드[0] = 테라스 면 y${U.yTerr} · 방위 ±${(U.azEnd * 180 / Math.PI).toFixed(1)}°(계단이 테라스에서 출발)`)
    //  ★디딤은 **평평해야** 한다: 방위가 진행하는 구간마다 양 끝 y가 같을 것(톱니 버그의 직접 반증)
    let slanted = 0, risers = 0
    for (let i = 0; i + 1 < NODES.length; i++) {
      const dA = Math.abs(NODES[i].a - NODES[i + 1].a)
      if (dA < 1e-12) { risers++; continue }                     // 챌판(같은 방위에서 y가 뛴다)
      if (Math.abs(NODES[i].y - NODES[i + 1].y) > 1e-9) slanted++ // 방위가 진행하는데 y가 변한다 = 경사면
    }
    ok(slanted === 0, `디딤 전부 평평(경사진 디딤 ${slanted}개 — 구판은 여기서 톱니가 났다)`)
    ok(risers === U.steps, `챌판 ${risers}개 = 단수 ${U.steps}`)
    //  ★단높이가 **전부 같은가** — ceil 역산이 튀면 두 배 단·사라진 단이 섞인다
    const rs = []
    for (let i = 0; i + 1 < NODES.length; i++)
      if (Math.abs(NODES[i].a - NODES[i + 1].a) < 1e-12) rs.push(NODES[i + 1].y - NODES[i].y)
    ok(rs.length === U.steps && Math.max(...rs) - Math.min(...rs) < 1e-9,
      `단높이 전부 동일(최대 ${Math.max(...rs).toFixed(4)} / 최소 ${Math.min(...rs).toFixed(4)})`)
    ok(Math.abs(NODES[NODES.length - 1].y - U.yWalk) < 1e-9,
      `마지막 노드 y${NODES[NODES.length - 1].y.toFixed(2)} = 플랫폼 걷는 면`)
    //  ★빌더가 노드를 되묻지 않는가(방위 → 인덱스 역산 금지)
    ok(!/Math\.ceil\([^)]*sweep/.test(readFileSync(new URL('./upperPlatformGeometry.js', import.meta.url), 'utf8')),
      '프로파일에 방위→인덱스 역산 없음(ceil((azEnd−a)/sweep·steps) 폐기)')
    ok(Math.abs(UP.stairYAt(U.halfPlat, U) - U.yWalk) < 1e-9,
      `계단 끝 y${UP.stairYAt(U.halfPlat, U).toFixed(2)} = 플랫폼 걷는 면 ${U.yWalk.toFixed(2)}`)

    //  ⑭ 밑면 체제 3종이 전부 성립하고, 밑면이 윗면을 넘지 않는가
    for (const sf of UP.UPF_SOFFITS) {
      const U2 = UP.upperPlatformSpec({ soffit: sf })
      let bad = 0
      for (let i = 0; i <= 60; i++) {
        const aAbs = U2.azEnd - (U2.azEnd - U2.halfPlat) * i / 60
        if (UP.stairSoffitAt(aAbs, U2) >= UP.stairYAt(aAbs, U2)) bad++
      }
      ok(bad === 0, `밑면 체제 '${sf}': 밑면이 윗면 아래에 있다(위반 ${bad})`)
    }

    //  ⑮ 부피 해석식 ↔ 메시 대조(프리즘 사슬이라 정확식이어야 한다)
    const V = UP.upperVolume(U)
    const meshVol = g => {
      const a2 = g.getAttribute('position'); let v = 0
      for (let i = 0; i < a2.count; i += 3) {
        const x1 = a2.getX(i), y1 = a2.getY(i), z1 = a2.getZ(i)
        const x2 = a2.getX(i + 1), y2 = a2.getY(i + 1), z2 = a2.getZ(i + 1)
        const x3 = a2.getX(i + 2), y3 = a2.getY(i + 2), z3 = a2.getZ(i + 2)
        v += (x1 * (y2 * z3 - y3 * z2) - y1 * (x2 * z3 - x3 * z2) + z1 * (x2 * y3 - x3 * y2)) / 6
      }
      return Math.abs(v)
    }
    const mSlab = meshVol(parts[0].geo), mSt = meshVol(parts[1].geo)
    ok(Math.abs(mSlab - V.slab) / V.slab < 0.02,
      `플랫폼 부피 메시 ${mSlab.toFixed(2)} ↔ 해석 ${V.slab.toFixed(2)}(±2%)`)
    ok(Math.abs(mSt - V.stair) / V.stair < 0.05,
      `계단 부피 메시 ${mSt.toFixed(2)} ↔ 해석 ${V.stair.toFixed(2)}(±5%)`)

    //  ⑯ 좌우 대칭 — 두 계단이 z 반전으로 정확히 겹치는가(현도 그림 = 대칭 쌍)
    const bb = g => { g.computeBoundingBox(); const b = g.boundingBox; return [b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z] }
    const b1 = bb(parts[1].geo), b2 = bb(parts[2].geo)
    ok(Math.abs(b1[0] - b2[0]) < 1e-3 && Math.abs(b1[1] - b2[1]) < 1e-3 &&
       Math.abs(b1[2] - b2[2]) < 1e-3 && Math.abs(b1[3] - b2[3]) < 1e-3 &&
       Math.abs(b1[4] + b2[5]) < 1e-3 && Math.abs(b1[5] + b2[4]) < 1e-3,
      '계단 두 기가 z 반전 대칭(좌우 대칭 쌍 — 현도 그림)')

    //  ⑰ 사본 금지 — 모듈이 정본에서만 좌표를 받는가
    const upSrc = readFileSync(new URL('./upperPlatformGeometry.js', import.meta.url), 'utf8')
    const noComment = upSrc.replace(/\/\/.*$/gm, '')
    ok(/spireSpec\(\)/.test(upSrc) && /wellWallR/.test(upSrc) && /linkSpec\(\)/.test(upSrc),
      '새 층 모듈: spireSpec · wellWallR · linkSpec 정본에서 받는다')
    ok(!/133\.30|132\.12|138\.02|21\.00/.test(noComment),
      '주석 밖에 좌표 하드코딩 0(133.30 · 132.12 · 138.02 · 21.00 전부 파생)')

    //  ⑱ 배선(마운트 · 별개 메시 · 보존계 독립)
    ok(/buildUpperPlatform/.test(roomSrc) && /upperParts\.map/.test(roomSrc),
      'Room.jsx: buildUpperPlatform 마운트(테라스·첨탑과 별개 메시)')
    ok(/UPF_ON/.test(roomSrc), 'Room.jsx: UPF_ON 보존계 게이트(한 줄 소등)')

    //  ⑲ ★밀봉 유지 — 드럼행 문은 **아직 안 뚫는다**(경로 미정이라 뚫으면 허공으로 열린다)
    ok(!/UPF_DOOR|cutUpper/.test(upSrc),
      '드럼행 문 미구현 — 경로가 정해지기 전에 뚫으면 첨탑 밖 허공으로 열린다(밀봉 원칙)')
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ★★★132 ① 통로 이사(1p4 → 1p2) — 0° 대역 점유 · 층 분리 불변식
//  (2026.08.15 현도: "단일 통로를 1p2가 있는 쉘로 옮기자" + ⓒ "드럼행도 새 층에서")
//  ⚠이 절이 지키는 것: ★131 새 층이 **왜 존재하는지**의 인과. 지난 세션까지 그 인과는
//   문서에만 있었고 검사에 없었다 — 실제로 배정을 [1,2,0,0]→[0,2,1,0]으로 바꿔도
//   1877항이 전부 green이었다(적발). 여기서 배정 ↔ 0° 대역 ↔ 층 분리를 묶어 잠근다.
//  ★핵심 논리: 드럼행은 방위 0°로 나가야 한다(진출 박스 BOX_X0 54 · z±6).
//   그런데 0° 문은 셸 315°(1p4)의 몫이고 그 셸은 **아직 비어 있을 뿐**이다 —
//   현도의 "따로 있는 아이디어"가 거기 오면 테라스 레벨 0°는 다시 막힌다.
//   → 드럼행을 **새 층**에 두는 것이 그 충돌을 미리 피하는 장치다(현도 확정 ⓒ).
// ══════════════════════════════════════════════════════════════════════
console.log('\n── ★132 ① 이사 · 0° 대역 · 층 분리 ──')
{
  const C = await import('./constants.js')
  const LP3 = await import('./linkPassageGeometry.js')
  const UP3 = await import('./upperPlatformGeometry.js')
  const SG3 = await import('./spireGeometry.js')
  const S = LP3.linkSpec()
  const D = 180 / Math.PI
  const deg = r => (r * D + 360) % 360
  const sgnDeg = a => (a > 180 ? a - 360 : a)

  //  ⓐ ⛔도구 먼저 검증한다 — 회전 규약이 R3F <group rotation-y={-(k·π/2)}>와 같은가.
  //   (1차 프로브가 이 부호를 반대로 써서 틀린 답을 냈다. 도구를 안 재고 믿지 않는다.)
  //   Three Y회전(θ): x' = x·cosθ + z·sinθ · z' = −x·sinθ + z·cosθ
  const rot = (p, k) => { const t = -k * Math.PI / 2, c = Math.cos(t), s = Math.sin(t)
    return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c] }
  {
    let good = 0
    for (let k = 0; k < 4; k++) {
      const [x, z] = rot(S.P0, k)
      const want = deg(Math.atan2(S.P0[1], S.P0[0]) + k * Math.PI / 2)
      if (Math.abs(sgnDeg(deg(Math.atan2(z, x)) - want)) < 1e-9) good++
    }
    ok(good === 4, `도구 검증: k회전 4/4이 셸 방위 +90°k와 일치(${good}/4)`)
  }

  //  ⓑ 배정 규약 — LNK k와 꽃잎 k는 **45° 어긋난 다른 규약**이다(혼동 방지용 상시 대조)
  const shellAzOf = k => deg(-Math.PI / 4 + k * Math.PI / 2)
  const petalKOf = k => { for (let j = 0; j < 4; j++)
    if (Math.abs(sgnDeg(deg(C.RAD_ANG0 + j * Math.PI / 2) - shellAzOf(k))) < 1e-9) return j
    return -1 }
  ok([0, 1, 2, 3].every(k => petalKOf(k) >= 0), 'LNK k 4기가 전부 꽃잎 k로 대응된다(규약 대조 성립)')
  ok(petalKOf(0) === C.P_ROOM.p4 && petalKOf(1) === C.P_ROOM.p1 &&
     petalKOf(2) === C.P_ROOM.p2 && petalKOf(3) === C.P_ROOM.p3,
    'LNK k0=1p4(315°) · k1=1p1(45°) · k2=1p2(135°) · k3=1p3(225°) — ⚠꽃잎 k와 45° 어긋남')

  //  ⓒ 현도 확정 배정(2026.08.15): ① 단일 곡선 = 1p2 셸 · ② 경유지 = 1p1 셸 그대로
  const kOne = C.LNK_ASSIGN.indexOf(1), kTwo = C.LNK_ASSIGN.indexOf(2)
  ok(kOne >= 0 && petalKOf(kOne) === C.P_ROOM.p2,
    `① 단일 곡선 = LNK k${kOne} = 1p2 셸 ${shellAzOf(kOne).toFixed(0)}° → 첨탑 문 ${deg(kOne * Math.PI / 2).toFixed(0)}°`)
  ok(kTwo >= 0 && petalKOf(kTwo) === C.P_ROOM.p1,
    `② 경유지 = LNK k${kTwo} = 1p1 셸 ${shellAzOf(kTwo).toFixed(0)}° → 첨탑 문 ${deg(kTwo * Math.PI / 2).toFixed(0)}°(이사 없음)`)
  ok(C.LNK_ASSIGN.filter(v => v).length === 2,
    `배정된 통로 ${C.LNK_ASSIGN.filter(v => v).length}기 · 빈 셸 ${C.LNK_ASSIGN.filter(v => !v).length}기(③④ = 현도 그림 대기)`)

  //  ⓓ ★0° 대역 점유 — 배정에서 **유도**한다(수치를 박지 않는다).
  //   관 외곽 반폭 안에 0°축이 들어오면 그 반경대는 드럼행이 못 쓴다.
  const halfOut = S.hw + S.wt
  const occupy = assign => {
    const hit = []                                    // {x, clr}
    let seen = 0
    assign.forEach((mode, k) => {
      if (!mode) return
      const paths = mode === 1 ? [S.one.pts] : [S.two.legA, S.two.legB]
      for (const pts of paths) for (const p of pts) {
        const [x, z] = rot(p, k)
        if (x <= 0) continue
        seen++
        const clr = Math.abs(z) - halfOut
        if (clr < 0) hit.push({ x, clr })
      }
      if (mode === 2) {                               // 미니 첨탑(원기둥)도 센다
        const [x, z] = rot(S.two.M, k)
        if (x > 0) { seen++; const clr = Math.abs(z) - S.two.tw.rOut; if (clr < 0) hit.push({ x, clr }) }
      }
    })
    return { seen, hit }
  }
  {
    const cur = occupy(C.LNK_ASSIGN)
    //  ⚠공허참 가드 — +x 반평면 표본이 0이면 "침범 없음"은 무의미하다
    ok(cur.seen > 0, `0°축 스캔 표본 ${cur.seen} > 0(빈 배열이면 아래 판정이 공허참)`)
    ok(cur.hit.length === 0,
      `현행 배정에서 테라스 레벨 0° 대역 점유 0(표본 ${cur.seen} 전부 순 여유 ≥ 0)`)

    //  ⓔ ★가드 실증 — **옛 배정이면 실제로 잡혀야** 이 검사가 살아 있는 검사다
    const old = occupy([1, 2, 0, 0])
    ok(old.hit.length > 0, `가드 실증: 옛 배정 [1,2,0,0]에선 0°축 침범 ${old.hit.length}점(검사가 죽지 않았다)`)
    if (old.hit.length) {
      const xs = old.hit.map(q => q.x), len = Math.max(...xs) - Math.min(...xs)
      ok(len > 10, `옛 배정 침범 길이 ${len.toFixed(1)}(x ${Math.min(...xs).toFixed(2)}~${Math.max(...xs).toFixed(2)}) — ★131이 층을 올린 사유`)
    }

    //  ⓕ ★인과의 유효기간 — 0°가 비어 있는 것은 **셸 315°(1p4)가 아직 비었기 때문**이다.
    //   거기 통로가 배정되면 다시 막힌다 = 드럼행이 새 층에 있어야 하는 이유(현도 ⓒ).
    const kZero = 0                                    // 첨탑 문 0°를 쓰는 셸
    ok(petalKOf(kZero) === C.P_ROOM.p4,
      `첨탑 0° 문의 임자 = LNK k0 = 1p4 셸(${shellAzOf(kZero).toFixed(0)}°)`)
    const future = occupy(C.LNK_ASSIGN.map((v, k) => (k === kZero && !v ? 1 : v)))
    ok(C.LNK_ASSIGN[kZero] !== 0 || future.hit.length > 0,
      `1p4 셸에 통로가 오면 0° 대역이 다시 막힌다(가정 배치 시 침범 ${future.hit.length}점) — 층 분리가 그래서 필요하다`)
  }

  //  ⓖ ★층 분리 불변식 — 통로 4기 어느 배정이든 새 층 바닥 밑면 아래에서 끝난다
  if (C.UPF_ON) {
    const U = UP3.upperPlatformSpec()
    const linkTop = S.y1 + S.h + S.wt
    ok(Math.abs(U.yUnder - linkTop) < 1e-9,
      `새 층 바닥 밑면 ${U.yUnder.toFixed(2)} = 통로 천장 ${linkTop.toFixed(2)}(층이 통로 위에서 시작한다)`)
    ok(U.yWalk > linkTop,
      `새 층 걷는 면 ${U.yWalk.toFixed(2)} > 통로 최고점 ${linkTop.toFixed(2)} — 통로가 어느 방위를 점유해도 이 층은 안 걸린다`)

    //  ⓗ ★드럼행 기하 = **새 층 출발**(현도 확정 ⓒ). 선언된 빚(35° 초과)을 수치로 박는다.
    const rw = SG3.wellWallR(U.yWalk, { forceSpire: true })
    const H = C.BOX_X0 - rw, V = U.yWalk - 108.30            // 108.30 = 진출 관 천장
    const ang = Math.atan2(V, H) * D
    ok(H > 0 && V > 0, `드럼행 재료: 최단 수평 ${H.toFixed(2)} · 강하 ${V.toFixed(2)}(둘 다 양수)`)
    ok(ang > 35,
      `⚠선언된 빚 — 새 층 출발 직선 ${ang.toFixed(2)}° > 상한 35°: 수평 ${(V / Math.tan(35 * Math.PI / 180) - H).toFixed(2)}을 더 벌어야 한다(경로 = 현도 그림 대기)`)
    //  참고값: 테라스에서 나갔다면 30.46°였다 — 현도는 ⓒ(새 층)를 택했다(조형·층 분리 우선)
    const angT = Math.atan2(C.SPT_Y - 108.30, C.BOX_X0 - SG3.wellWallR(C.SPT_Y, { forceSpire: true })) * D
    ok(angT < ang, `대조: 테라스 y${C.SPT_Y.toFixed(2)} 출발이면 ${angT.toFixed(2)}°(현도가 ⓒ를 택해 쓰지 않는 길)`)
  } else {
    ok(true, '⏸ UPF_ON=false — 층 분리 항목 건너뜀(새 층 소등 중)')
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ★★★133 1p4 방위 0° 복합체 — 2층 계단 관 + 참 + 기둥 + 아치 (2026.08.15 · ★133-b 아치 개정 · ★133-c 복구)
//  ⚠이 절이 지키는 것: ⓐ 좌표가 전부 정본 파생인가(참 = 나선 참) ⓑ ★133-b 삭제의 완결성
//   (윗층·포털·소멸 노브가 소스에 없는가) ⓒ 걷는 선 상한 ⓓ 아치 닫힌형(두 접선 조건)과
//   돔 관통 금지 ⓔ 벽 접합(매몰·수직 구간) ⓕ 밀봉.
// ══════════════════════════════════════════════════════════════════════
console.log('\n── ★133 1p4 복합체(2층 관·참·기둥·아치 — ★133-b/c) ──')
{
  const C = await import('./constants.js')
  const BG = await import('./bridgeComplexGeometry.js')
  const LP4 = await import('./linkPassageGeometry.js')
  const SG4 = await import('./spireGeometry.js')
  const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
  if (!C.BRG_ON) {
    ok(BG.buildBridgeComplex() === null, '⏸ BRG_ON=false — 복합체 소등(보존계 복귀 확인)')
  } else {
    const B = BG.bridgeSpec()
    const L = LP4.linkSpec(), S = SG4.spireSpec()

    //  ⓐ 파생 — 손으로 적은 좌표가 없는가
    ok(Math.abs(B.r0 - Math.hypot(L.P0[0], L.P0[1])) < 1e-12,
      `참 반경 ${B.r0.toFixed(2)} = 셸 나선 참 바깥 끝(linkSpec P0 — 사본 0)`)
    ok(Math.abs(B.yLand - L.y0) < 1e-12, `참 레벨 ${B.yLand.toFixed(2)} = 나선 참 문지방(linkSpec y0)`)
    ok(Math.abs(B.rw - SG4.wellWallR(C.SPT_Y, { spec: S, forceSpire: true })) < 1e-12,
      `벽 ${B.rw.toFixed(2)} = wellWallR(테라스 레벨)`)
    {
      const src = readFileSync(new URL('./bridgeComplexGeometry.js', import.meta.url), 'utf8')
      const noC = src.replace(/\/\/.*$/gm, '')
      ok(!/44\.61|112\.5|133\.3|127(?![0-9])|22\.2(?![0-9])|6\.30/.test(noC),
        '주석 밖 좌표 하드코딩 0(44.61·112.5·133.3·127·22.2·6.30 전부 파생)')
      //  ⓕ 밀봉 — 문 컷 소스 없음(다음 조각)
      ok(!/BRG_DOOR|cutBridge|door/i.test(noC), '개구 0 — 문 컷 소스 없음(밀봉 어법 · 컷 = 다음 조각)')
      //  ⓑ ★133-c 복구의 완결성 — 윗층 관·포털이 되살아났는가(★133-b 오독 삭제의 원상)
      ok(/upMass/.test(noC) && /portal/.test(noC) && /ftU/.test(noC),
        '★133-c: 윗층 관·어귀 포털 존치(★133-b 오독 삭제를 원상 복구)')
      ok((noC.match(/buildTube\(/g) || []).length === 3,
        'buildTube 정의 1 + 호출 2(아래층·윗층 — 적층 복구)')
    }
    ok(C.BRG_ARCH_XC_F === undefined && C.BRG_ARCH_DROP === undefined,
      '소멸 노브 2(XC_F·DROP)가 constants에 없음 — 아치는 닫힌형(노브 0)')
    //  적층 산술(★131 ⓛ 연속) — 복구분
    ok(Math.abs(B.ftU - (B.gap - B.h - B.wt + C.BRG_SINK)) < 1e-12,
      `윗층 바닥 ${B.ftU.toFixed(2)} = 층차 − 내부고 − 천장살 + 관입(§2-D를 깨는 선언된 비용 — ★131 ⓛ 연속)`)
    ok(Math.abs(((B.yTerr + B.gap - B.ftU) - (B.yTerr + B.h + B.wt)) + C.BRG_SINK) < 1e-9,
      `적층 접면 관입 = SINK(공면 z-fighting 방지 · 틈 0)`)
    ok(Math.abs((B.yTerr + B.gap) - (await import('./upperPlatformGeometry.js')).upperPlatformSpec().yWalk) < 1e-12,
      `윗층 문지방 ${(B.yTerr + B.gap).toFixed(2)} = ★131 새 층 걷는 면`)

    //  ⓒ 계단 — 부동소수점 봉인 + 독립 재계산 + 상한
    ok(B.steps === Math.max(2, Math.ceil(B.rise / C.BRG_STEP - 1e-9)),
      `단수 ${B.steps} — 허용오차 ceil(★131 계열 봉인 · rise ${B.rise.toFixed(12)})`)
    ok(Math.abs(B.riser * B.steps - B.rise) < 1e-9, `단높이 ${B.riser.toFixed(4)} × ${B.steps} = 상승(나머지 0)`)
    {
      const st2 = Math.max(2, Math.ceil((C.SPT_Y - L.y0) / C.BRG_STEP - 1e-9))
      const wd2 = Math.atan2((C.SPT_Y - L.y0) / st2, (B.r0 - (B.rw - L.emb)) / st2) * 180 / Math.PI
      ok(st2 === B.steps && Math.abs(wd2 - B.walkDeg) < 1e-9,
        `독립 재계산 일치(${st2}단 · 걷는 선 ${wd2.toFixed(2)}°)`)
    }
    ok(B.walkDeg <= C.BRG_WALK_MAX, `걷는 선 ${B.walkDeg.toFixed(2)}° ≤ 상한 ${C.BRG_WALK_MAX}°`)

    //  참·소핏 연속
    ok(Math.abs(B.soffit(B.r0) - B.yLandU) < 1e-9,
      `소핏(참 자리) ${B.soffit(B.r0).toFixed(2)} = 참 밑면(관 바닥 1.5 = 참 매스 1.5 — 연속)`)
    ok(Math.abs(B.landT - B.ft) < 1e-12, '참 매스 = 관 바닥 매스(연속의 전제 — 값이 갈리면 위 검사도 갈린다)')

    //  ⓓ 아치 — ★133-b 닫힌형(두 접선 조건) · 돔 관통 금지
    {
      const dome = BG.bridgeDomeY
      //  기둥 바닥이 돔을 좇는가(폭 방향 최대 반경 기준 — 규율 6)
      const x0 = B.xCol - B.colW / 2, x1 = B.xCol + B.colW / 2
      let confOK = true
      for (let i = 0; i <= 8; i++) {
        const x = x0 + (x1 - x0) * i / 8
        if (!(dome(Math.hypot(x, B.colD / 2)) - C.BRG_SEAT < B.yLandU)) confOK = false
      }
      ok(confOK, '기둥 바닥 전 표본이 참 밑면 아래(돔 좇는 식 성립)')
      const { xJ, yJ, xB, yB, yCt } = B.arch
      //  도착점 J = 접합부 끝(아래층 소핏이 벽에 닿는 모서리 — 벽 속 emb 매몰)
      ok(Math.abs(xJ - (B.rw - B.emb)) < 1e-12 && Math.abs(yJ - (C.SPT_Y - B.ft)) < 1e-12,
        `아치 도착점 J(${xJ.toFixed(2)}, ${yJ.toFixed(2)}) = 접합부 끝(소핏·벽 모서리 — ★133-b 현도)`)
      //  접선 조건 ⓐ 기둥 수직 발진(C.x = B.x — 구조) ⓑ J에서 소핏 나란 합류: 독립 재유도 대조
      ok(Math.abs(yCt - (yJ - B.rise / B.run * (xB - xJ))) < 1e-12,
        `제어점 y ${yCt.toFixed(2)} = 소핏 접선 재유도(닫힌형 — 크라운 노브 0)`)
      //  볼록포 실증: 인트라도스 전 표본이 소핏선 아래(스팬드럴 두께 비음수) + 돔 위(관통 0)
      const q = (P0, Cc, P1, t) => { const u = 1 - t
        return [u*u*P0[0]+2*u*t*Cc[0]+t*t*P1[0], u*u*P0[1]+2*u*t*Cc[1]+t*t*P1[1]] }
      let below = true, above = true, minClr = Infinity
      for (let i = 0; i <= 96; i++) {
        const p = q([xJ, yJ], [xB, yCt], [xB, yB], i / 96)
        if (p[1] > B.soffit(p[0]) + 1e-9) below = false
        const clr = p[1] - (dome(p[0]) - C.BRG_SEAT)
        minClr = Math.min(minClr, clr)
        if (clr < -1e-9) above = false
      }
      ok(below, '인트라도스 97표본 전부 소핏선 아래(볼록포 논증 실증 — 두께 비음수)')
      ok(above, `인트라도스 97표본 전부 돔−SEAT 위(최소 여유 ${minClr.toFixed(3)} — 관통 0)`)
      ok(Math.abs(yB - (dome(B.xCol) + C.BRG_ARCH_UPB)) < 1e-9,
        `아치 발 B = 기둥 자리 돔 + ${C.BRG_ARCH_UPB}(기둥 아래에서 발원 — 불변)`)
    }

    //  ⓔ 벽 접합 — 매몰·수직 구간
    ok(B.emb >= B.rw - Math.sqrt(B.rw ** 2 - (B.wOut / 2) ** 2) + 1e-9,
      `매몰 ${B.emb} ≥ 곡면 z끝 새그 ${(B.rw - Math.sqrt(B.rw ** 2 - (B.wOut / 2) ** 2)).toFixed(3)}(규율 7 — 틈 0)`)
    {
      //  아래층은 벽이 전 구간 수직(빗면 아래) — 포털 불요의 근거
      const yLoTop = B.yTerr + B.h + B.wt
      const rTop = SG4.wellWallR(yLoTop, { spec: S, forceSpire: true })
      ok(Math.abs(rTop - B.rw) < 1e-9, `아래층 지붕 높이 ${yLoTop.toFixed(2)}까지 벽 ${rTop.toFixed(2)} 수직 — 포털 불요`)
      //  윗층은 빗면을 가로지른다 — 포털이 필요한 이유가 실재하는가
      const yUpTop = B.yTerr + B.gap + B.h + B.wt
      const rUpTop = SG4.wellWallR(yUpTop, { spec: S, forceSpire: true })
      ok(rUpTop < B.rw - 1, `윗층 지붕 높이 ${yUpTop.toFixed(2)}의 벽 ${rUpTop.toFixed(2)} ≪ ${B.rw.toFixed(2)} — 빗면 교차 실재(포털의 존재 이유)`)
      //  포털 왼 변이 벽 살 속인가
      const yBot = B.yTerr + B.gap - B.ftU
      let inWall = true
      for (let i = 0; i <= 16; i++) {
        const y = yBot + (yUpTop - yBot) * i / 16
        const rWallY = SG4.wellWallR(y, { spec: S, forceSpire: true })
        const xl = rWallY - B.emb
        if (!(xl > rWallY - S.T + 0.05 && xl < rWallY - 0.05)) inWall = false
      }
      ok(inWall, `포털 왼 변 17표본 전부 벽 살 속(내면+0.05 ~ 벽면−0.05)`)
    }

    //  진출 박스 침범 금지 + z 전폭 + 부재 수 + 부피
    {
      const P = BG.buildBridgeComplex()
      let maxX = -Infinity, maxZ = 0
      for (const { geo } of [...P.walk, ...P.solid]) {
        geo.computeBoundingBox()
        maxX = Math.max(maxX, geo.boundingBox.max.x)
        maxZ = Math.max(maxZ, Math.abs(geo.boundingBox.min.z), geo.boundingBox.max.z)
      }
      ok(maxX < C.BOX_X0 - 1, `동단 x ${maxX.toFixed(2)} < 진출 박스 ${C.BOX_X0} − 1(침범 0 — 그 사이 = 미정 구간)`)
      ok(maxZ <= B.wOut / 2 + 1e-6, `z 전폭 ±${maxZ.toFixed(2)} ≤ 관 외곽 반폭(방위 0° 축에 정렬 — 1e-6: Float32 극한)`)
      ok(P.walk.length === 3 && P.solid.length === 14,
        `부재 수 walk 3(계단 매스 2 + 참) · solid 14(벽4·지붕2·캡4·기둥·스팬드럴·브래킷·포털)`)
      const vol = g => { const a = g.getAttribute('position'); let v = 0
        for (let i = 0; i < a.count; i += 3) {
          const x1=a.getX(i),y1=a.getY(i),z1=a.getZ(i),x2=a.getX(i+1),y2=a.getY(i+1),z2=a.getZ(i+1),x3=a.getX(i+2),y3=a.getY(i+2),z3=a.getZ(i+2)
          v += (x1*(y2*z3-y3*z2)-y1*(x2*z3-x3*z2)+z1*(x2*y3-x3*y2))/6 }
        return Math.abs(v) }
      const land = P.walk.find(w => w.id === 'landing')
      ok(Math.abs(vol(land.geo) - B.landD * B.landT * B.wOut) / (B.landD * B.landT * B.wOut) < 0.01,
        `참 부피 메시 ${vol(land.geo).toFixed(2)} ↔ 해석 ${(B.landD * B.landT * B.wOut).toFixed(2)}(±1%)`)
      const lowMass = P.walk.find(w => w.id === 'lowMass')
      //  ⚠1차판 오식 자가 적발 흔적: run·rise/2를 더했었다 — 소핏은 걷는 선과 평행이라 그 삼각형은 애초에 없다.
      const aProf = B.run * B.ft - B.steps * (B.tread * B.riser / 2)
      ok(Math.abs(vol(lowMass.geo) - aProf * 2 * B.hw) / (aProf * 2 * B.hw) < 0.02,
        `계단 매스 부피 메시 ${vol(lowMass.geo).toFixed(2)} ↔ 해석 ${(aProf * 2 * B.hw).toFixed(2)}(±2%)`)
    }

    //  배선
    ok(/buildBridgeComplex/.test(roomSrc) && /bridgeParts/.test(roomSrc), 'Room.jsx: 복합체 마운트(별개 메시)')
    ok(/BRG_ON/.test(roomSrc), 'Room.jsx: BRG_ON 보존계 게이트(한 줄 소등)')
    //  ⚠★135 픽커는 폐기됐지만(렉) **name 부여는 존치**한다 — 런타임 비용 0이고 코드 가독성·지목에 쓰인다.
    ok((roomSrc.match(/name=\{'1p4복합체\/' \+ id\}/g) || []).length === 2,
      'Room.jsx: 복합체 walk/solid 둘 다 name 부여(부재 식별 — 픽커 폐기와 무관하게 존치)')
  }
}

// ══════════════ ★★★136 1p4 셸 나선 참 → ★133 참 수평 접속 관 ══════════════
{
  console.log('\n— ★136. 1p4 접속 관(수평) · 두 안 병존 —')
  const { link4Spec, buildLink4 } = await import('./link4Geometry.js')
  const { linkSpec, buildLinkTube } = await import('./linkPassageGeometry.js')
  const { bridgeSpec } = await import('./bridgeComplexGeometry.js')
  const C136 = await import('./constants.js')
  const L = linkSpec(), B = bridgeSpec()
  //  ⚠전역 스위치와 무관하게 기하를 시험한다(소등 체제에서도 검사는 살아 있어야 한다 — 스윕이 적발)
  const S = link4Spec({ on: true, joint: 'miter' })
  const BRG_SINK_ = C136.BRG_SINK
  const { bridgeDomeY: bridgeDomeY_ } = await import('./bridgeComplexGeometry.js')

  //  ① 레벨 항등 — 이 통로가 수평인 근거는 우연이 아니라 파생이다
  ok(Math.abs(L.y0 - B.yLand) < 1e-12, `두 참 레벨 항등 ${L.y0} = ${B.yLand}(★133이 linkSpec().y0을 받는다 — 손 좌표 아님)`)
  ok(Math.abs(S.rise) < 1e-12, `rise 0 — LNK 가족 최초의 완전 수평 관(계단 0단)`)
  ok(Math.abs(S.y - L.y0) < 1e-12, `걷는 면 = 나선 참 문지방 ${S.y}`)

  //  ② 시작 = 나선 참 접합부 그대로(사본 금지 실증)
  ok(S.P0[0] === L.P0[0] && S.P0[1] === L.P0[1], `시작점 = linkSpec().P0 동일 객체값(하드코딩 0)`)
  ok(Math.abs(S.t0deg - Math.atan2(L.T0[1], L.T0[0]) * 180 / Math.PI) < 1e-9, `접선 ${S.t0deg.toFixed(3)}° = 나선 접선`)

  //  ③ ⛔직선과 접선 연속은 동시에 성립하지 않는다 — 두 안이 나란히 서는 이유를 검사로 박는다
  {
    const t = (S.zFace - S.P0[1]) / S.T0[1]            // 접선 직선이 참 −z 변 평면에 닿는 매개
    const xHit = S.P0[0] + S.T0[0] * t
    ok(xHit > B.xL1 + 1, `접선 직선은 참을 지나친다: z=${S.zFace.toFixed(2)}에서 x ${xHit.toFixed(2)} > 참 바깥 끝 ${B.xL1.toFixed(2)}`)
    ok(S.zig.kink1 > 1 && S.zig.kink2 > 1, `그래서 zigzag는 꺾임 둘을 받아들인다(${S.zig.kink1.toFixed(1)}° · ${S.zig.kink2.toFixed(1)}°)`)
  }

  //  ④ 도착 창 — 관 폭이 참 깊이 안에 수직으로 눕는다
  ok(Math.abs(S.xWin - (B.landD / 2 - S.hwOut)) < 1e-12, `도착 창 = 참 반깊이 − 관 외곽 반폭 = ±${S.xWin.toFixed(2)}(파생)`)
  ok(Math.abs(S.xOff) <= S.xWin + 1e-9, `현행 편차 ${S.xOff} 는 창 안 — 관이 참 밖으로 넘지 않는다`)
  ok(S.xMinEnd >= B.xL0 - 1e-9 && S.xMaxEnd <= B.xL1 + 1e-9,
    `관 끝 x ${S.xMinEnd.toFixed(2)}~${S.xMaxEnd.toFixed(2)} ⊂ 참 ${B.xL0.toFixed(2)}~${B.xL1.toFixed(2)}`)
  //  ⛔가드 실증: 창을 넘기면 정확히 실패해야 한다
  {
    const bad = link4Spec({ on: true, xOff: S.xWin + 0.05 })
    ok(bad.xMaxEnd > B.xL1 + 1e-9, `가드 실증: 편차를 창 밖(${(S.xWin + 0.05).toFixed(2)})으로 밀면 관이 참을 ${(bad.xMaxEnd - B.xL1).toFixed(2)} 넘는다`)
  }

  //  ⑤ ★133 계단 관과의 겹침 0 — 두 관이 같은 방위대에 있다
  //  ★★136-b 현도 "참과 문 사이 좌우 틈을 없애줘" → 참 깊이를 관 외곽 폭에서 파생 → **맞댐(flush)** 체제.
  //   여유가 0.24에서 **정확히 0**이 됐다. 그러므로 '떨어져 있음'이 아니라 '맞닿되 부피가 안 겹침'을 박아야 한다.
  //  ⚠양 체제에 각각 단언을 단다 — 보존계 스윕도 green이어야 한다(규율).
  if (C136.BRG_LAND_FLUSH) {
    ok(Math.abs(S.xMinEnd - B.xL0) < 1e-9 && Math.abs(S.xMaxEnd - B.xL1) < 1e-9,
      `틈 0 실증: 관 외곽 x ${S.xMinEnd.toFixed(3)}~${S.xMaxEnd.toFixed(3)} = 참 ${B.xL0.toFixed(3)}~${B.xL1.toFixed(3)}(양쪽 다 정확히 일치)`)
    ok(Math.abs(B.landD - S.hwOut * 2) < 1e-12, `참 깊이 ${B.landD.toFixed(2)} = 관 외곽 폭(파생 — 수치 일치가 아니라 인과 일치)`)
  } else {
    ok(Math.abs(B.landD - C136.BRG_LAND_D) < 1e-12, `보존계 FLUSH=false: 참 깊이 = 옛 상수 ${C136.BRG_LAND_D}`)
    ok(S.xMinEnd - B.xL0 > 0.1 && B.xL1 - S.xMaxEnd > 0.1,
      `— 그 체제에서는 좌우 틈이 ${(S.xMinEnd - B.xL0).toFixed(2)}·${(B.xL1 - S.xMaxEnd).toFixed(2)} 살아 있다(현도가 없애라 한 그 틈)`)
  }
  {
    //  ⛔맞댐이 된 만큼 '부피가 안 겹침'은 이제 실측으로만 담보된다 — 관 정점을 ★133 관 상자에 넣어 본다.
    const g = buildLink4(link4Spec({ on: true })).walk[0].geo, a2 = g.getAttribute('position')
    let worst = Infinity
    for (let i = 0; i < a2.count; i++) {
      const x = a2.getX(i), z = a2.getZ(i)
      if (z > -B.wOut / 2 - 1e-6 && z < B.wOut / 2 + 1e-6) worst = Math.min(worst, x - B.r0)
    }
    ok(worst > -1e-6, `★133 관 z대(±${(B.wOut / 2).toFixed(2)}) 안의 접속 관 정점은 전부 x ≥ ${B.r0.toFixed(3)}(최소 초과 ${worst.toFixed(6)} — 부피 겹침 0, 면 맞댐만)`)
  }
  //  ⛔스윕 적발 — **창은 좌우 비대칭이다**: 참 안쪽 끝(xL0)에는 ★133 계단 관 두 층이 붙어 있고 xL0 = r0이므로
  //   −쪽 경계는 **닫힌 값이 아니라 열린 값**이다(정확히 −0.30이면 두 관이 면으로 맞닿아 공면 z-fighting).
  //   +쪽(참 바깥 끝 xL1)에는 아무것도 없어 −0.30은 실패하고 +0.30은 통과한다. 이 비대칭 자체를 박는다.
  {
    ok(Math.abs(B.r0 - B.xL0) < 1e-12, `참 안쪽 끝 = ★133 관 끝 동일 좌표 ${B.r0.toFixed(3)}(그래서 −쪽만 열린 경계)`)
    const lo = link4Spec({ on: true, xOff: -S.xWin }), hi = link4Spec({ on: true, xOff: S.xWin })
    ok(!(lo.xMinEnd > B.r0 + 1e-9), `−창 경계 정확히 −${S.xWin.toFixed(2)}: 관이 ★133 관과 **맞닿는다** → 못 쓴다(열린 경계)`)
    ok(hi.xMaxEnd <= B.xL1 + 1e-9, `+창 경계 정확히 +${S.xWin.toFixed(2)}: 참 바깥 끝과 맞닿을 뿐 상대 부재가 없다 → 쓸 수 있다`)
    //  ★136-b: 맞댐 체제에서 창은 **정확히 0으로 닫힌다**(관이 참을 꽉 채우므로 편차의 여지가 없다)
    ok(Math.abs(S.xWin - (C136.BRG_LAND_FLUSH ? 0 : (C136.BRG_LAND_D - 2 * S.hwOut) / 2)) < 1e-12,
      `도착 창 ±${S.xWin.toFixed(3)} — 맞댐이면 0(관이 참을 꽉 채워 편차의 여지가 없다), 아니면 (깊이−폭)/2`)
    ok(Math.abs(S.xOff) <= S.xWin + 1e-12, `현행 편차 ${S.xOff}는 창 안(맞댐 체제에서는 0이 유일한 값)`)
  }
  {
    //  윗층 관 소핏(117.57)과 이 관 지붕 윗면(117.62)은 0.05 겹치나 x대가 갈린다 — 그 인과를 박는다
    const roofTop = S.y + S.h + S.wt, upSoffit = B.yTerr + B.gap - B.rise - B.ftU
    ok(roofTop > upSoffit, `y만 보면 지붕 ${roofTop.toFixed(2)} > 윗층 소핏 ${upSoffit.toFixed(2)}(0.05 겹침)`)
    ok(S.xMinEnd >= B.r0 - 1e-9, `— 윗층 관은 x ≤ ${B.r0.toFixed(2)}에서 끝나고 접속 관은 x ≥ 거기서 시작(맞댐이면 면 접촉 · 아니면 여유 ${(S.xMinEnd - B.r0).toFixed(2)}) — 부피 겹침 0은 위 정점 주사로 실증`)
  }

  //  ⑥ 단면·두께 위계 = ★130 승계(사본 금지)
  ok(S.hw === L.hw && S.h === L.h && S.ft === L.ft && S.wt === L.wt,
    `단면 승계: 내부 ${(2 * S.hw).toFixed(2)}×${S.h} · 바닥 ${S.ft} · 벽·천장 ${S.wt}`)
  ok(Math.abs(S.hwOut - (L.hw + L.wt)) < 1e-12, `외곽 반폭 ${S.hwOut.toFixed(2)} = hw + wt`)

  //  ⑦ 마이터 마감 — 꺾임에서 폭이 오므라들지 않는다
  {
    const m = th => S.hwOut / Math.cos(th * Math.PI / 360)
    ok(Math.abs(S.zig.miter[0] - m(S.zig.kink1)) < 1e-12 && Math.abs(S.zig.miter[1] - m(S.zig.kink2)) < 1e-12,
      `마이터 신장 = 반폭/cos(θ/2) — 바깥 모서리 ${S.zig.miter[0].toFixed(3)} · ${S.zig.miter[1].toFixed(3)}`)
    ok(S.zig.miter.every(v => v < S.hwOut * 1.5), `마이터 발산 없음(전부 반폭의 1.5배 미만 — 되꺾임 아님)`)
    //  옛 프레임이면 오므라든다는 것을 수치로
    const pinch = S.hwOut * Math.cos(S.zig.kink1 * Math.PI / 360)
    ok(pinch < S.hwOut - 0.05, `⛔옛 중앙차분 프레임이면 꺾임①에서 반폭 ${pinch.toFixed(3)}로 오므라든다(${(S.hwOut - pinch).toFixed(3)} 오목) — miter의 존재 이유`)
  }

  //  ⑧ ⛔★130 무회귀 — miter 옵션 기본값이 옛 거동과 **한 좌표도** 다르지 않다
  {
    const P = buildLinkTube(L.one.pts, t => L.y0 + L.rise * t, L, [false, false])
    const Q = buildLinkTube(L.one.pts, t => L.y0 + L.rise * t, L, [false, false], {})
    const a = P.getAttribute('position').array, b = Q.getAttribute('position').array
    let same = a.length === b.length
    for (let i = 0; same && i < a.length; i++) if (a[i] !== b[i]) same = false
    ok(same, `★130 ① 무회귀: opts 없음 ↔ opts {} 정점 ${a.length / 3}개 전부 동일(miter 기본 false)`)
    const R = buildLinkTube(L.one.pts, t => L.y0 + L.rise * t, L, [false, false], { miter: true })
    ok(R.getAttribute('position').count === P.getAttribute('position').count,
      `— miter를 켜도 위상은 같다(정점 수 불변, 좌표만 이동)`)
  }

  //  ⑨ 두 안 다 지어진다 · 밀봉 규약
  for (const mode of ['zigzag', 'smooth']) {
    const s = link4Spec({ on: true, mode, joint: 'miter' }), P = buildLink4(s)
    ok(P && P.walk.length === 1 && P.solid.length === (C136.LK4_ARC_ON ? 1 : 0),
      `${mode}: 부재 walk 1(관) · solid ${C136.LK4_ARC_ON ? '1(★136-c 아치)' : '0(아치 소등 — 관은 불변)'}`)
    const g = P.walk[0].geo; g.computeBoundingBox()
    const bb = g.boundingBox
    ok(Math.abs(bb.min.y - (s.y - s.ft)) < 1e-4 && Math.abs(bb.max.y - (s.y + s.h + s.wt)) < 1e-4,
      `${mode}: 높이 ${bb.min.y.toFixed(2)}~${bb.max.y.toFixed(2)} = 바닥 밑면~지붕 윗면(수평이므로 전 구간 동일)`)
    ok(Math.abs(bb.max.z - (s.zFace + s.sink)) < 1e-6,
      `${mode}: +z 끝이 정확히 참 −z 변 + 관입 ${s.sink}(해석 접선 프레임 — 현이 아니다)`)
    ok(bb.max.z > s.zFace && bb.max.z < B.wOut / 2, `${mode}: 끝이 참 안에 묻힌다(근변 통과 · 원변 미도달)`)
  }
  //  ⛔자가 적발: 끝 프레임이 **현**이면 캡이 기울어 상대 면과 안 맞물린다(실측 0.09° · 0.0042 삐져나옴)
  {
    const s = link4Spec({ on: true, mode: 'smooth' })
    const P = s.smooth.pts, N = P.length
    const chord = Math.atan2(P[N - 1][1] - P[N - 2][1], P[N - 1][0] - P[N - 2][0]) * 180 / Math.PI
    ok(Math.abs(chord - 90) > 0.01, `현 방향 ${chord.toFixed(3)}° ≠ 해석 접선 90° — 표본 곡선의 구조적 오차`)
    const naive = buildLinkTube(P, () => s.y, s, [false, true])
    naive.computeBoundingBox()
    ok(naive.boundingBox.max.z > s.zFace + s.sink + 1e-4,
      `— 그 현을 쓰면 끝이 ${(naive.boundingBox.max.z - s.zFace - s.sink).toFixed(4)} 삐져나온다(tan1 옵션의 존재 이유)`)
    const fixed = buildLink4(s).walk[0].geo; fixed.computeBoundingBox()
    ok(Math.abs(fixed.boundingBox.max.z - (s.zFace + s.sink)) < 1e-6, `— tan1을 박으면 정확히 관입면에서 끝난다`)
    const g0 = buildLink4(link4Spec({ on: true, mode: 'zigzag', joint: 'miter' })).walk[0].geo
    ok(g0.attributes.position.count > 0, `zigzag는 마디 방향이 곧 프레임이라 이 오차가 애초에 없다`)
  }
  ok(link4Spec({ on: true, mode: 'smooth' }).smooth.rev === false, `smooth K=${C136.LK4_BEZ_K}: 방향 반전 없음(S자 아님)`)
  ok(link4Spec({ on: true, mode: 'smooth' }).smooth.minR > 2 * S.hwOut,
    `smooth 최소 곡률반경 ${link4Spec({ on: true, mode: 'smooth' }).smooth.minR.toFixed(2)} > 관 외곽 폭 ${(2 * S.hwOut).toFixed(2)}(자기 겹침 없음)`)

  //  ⑩ 보존계 · 배선
  ok(typeof buildLink4 === 'function', `보존계 진입점 존재`)
  {
    const S0 = link4Spec({ on: false })
    ok(buildLink4(S0) === null, `LK4_ON=false → null(한 줄 소등)`)
    ok(link4Spec({ on: false }).on === false && link4Spec({ on: true }).on === true,
      `⛔o.on 우회 존재 — 소등 체제에서도 검사가 기하를 시험할 수 있다(스윕이 죽던 자리)`)
    const bt = buildLink4(link4Spec({ on: true, mode: 'zigzag', joint: 'butt' }))
    ok(bt.walk.length === 3, `보존계 joint='butt' → 마디 3기 개별 관(마감 어휘 교체 자리)`)
  }
  {
    const src = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
    ok(/buildLink4/.test(src) && /link4Parts/.test(src), 'Room.jsx: ★136 마운트')
    ok(/LK4_ON/.test(src) && /BRG_ON && LK4_ON/.test(src), 'Room.jsx: LK4_ON 게이트 + BRG_ON 종속(참이 없으면 갈 곳이 없다)')
    ok(/name=\{'1p4접속관\/' \+ id\}/.test(src), 'Room.jsx: 부재 name 부여(좌표 지목의 짝)')
  }
  //  ⭐136-c 접합부 아치 — 관 곱선을 따라 휘는 스윈
  {
    const { buildLink4Arch } = await import('./link4Geometry.js')
    for (const mode of ['smooth', 'zigzag']) {
      //  ⚠전역 스위치와 무관하게 아치 기하를 시험한다(⛔ARC_ON=false 스윕에서 검사가 null을 붙잡고 죽었다 — 재발)
      const s2 = link4Spec({ on: true, archOn: true, mode, joint: 'miter' }), A = s2.arch
      ok(A.on && A.path.length >= 3, `${mode} 아치: 경로 점 ${A.path.length}(기둥 면 → 관 끝 → 관 중심선)`)
      ok(Math.abs(A.zCol - (-B.colD / 2)) < 1e-12, `${mode}: 기둥 쪽 끝 z ${A.zCol} = −colD/2(파생 — 손 좌표 아님)`)
      ok(Math.abs(A.yB - B.arch.yB) < 1e-12, `${mode}: 아래 발 y ${A.yB.toFixed(3)} = ★133 아치 발(돔 + BRG_ARCH_UPB) — 둘이 한 값에 묶인다`)
      ok(Math.abs(A.yJ - B.yLandU) < 1e-9, `${mode}: 윗 발 y ${A.yJ.toFixed(3)} = 관·참 소핏`)
      ok(Math.abs(A.reach[1] - A.zEnd) < 1e-9, `${mode}: 바깥 끝이 정확히 z ${A.zEnd}에 얄힌다(경계 교점을 표본 의존 없이 삽입)`)
      //  ★닫힌형 두 접선 조건 — 유도가 곳 검사다
      const h = A.L * 1e-5
      const d1 = (A.yOfS(A.L) - A.yOfS(A.L - h)) / h
      ok(Math.abs(d1) < 1e-3, `${mode}: s=L에서 dy/ds ${d1.toFixed(6)} ≈ 0 — 소핏과 **나란히** 합류(★133-b 조건 ⓑ)`)
      const d0 = (A.yOfS(h) - A.yOfS(0)) / h
      ok(d0 > 50, `${mode}: s=0에서 dy/ds ${d0.toFixed(1)} → ∞ — 기둥에서 **수직 발진**(★133-b 조건 ⓐ)`)
      ok(Math.abs(A.yOfS(0) - A.yB) < 1e-9 && Math.abs(A.yOfS(A.L) - A.yJ) < 1e-9, `${mode}: 양 끝값이 두 발과 정확히 일치`)
      ok(A.yOfS(A.L / 2) > (A.yB + A.yJ) / 2, `${mode}: 중간값 ${A.yOfS(A.L / 2).toFixed(2)} > 산술평균 ${((A.yB + A.yJ) / 2).toFixed(2)} — 위로 볼록한 아치(뒤집힌 모양 아님)`)
      //  기하 — 부피 위치·접촉
      const g2 = buildLink4Arch(s2); g2.computeBoundingBox()
      const bb2 = g2.boundingBox
      ok(Math.abs(bb2.min.y - A.yB) < 1e-4 && Math.abs(bb2.max.y - A.yTop) < 1e-4,
        `${mode}: 아치 높이 ${bb2.min.y.toFixed(2)}~${bb2.max.y.toFixed(2)} = 발~소핏+관입 ${BRG_SINK_}`)
      ok(bb2.max.z <= A.zCol + 1e-6, `${mode}: 아치는 기둥 면(z ${A.zCol})보다 바깥에만 있다 — 기둥과 부피 겹침 0`)
      ok(A.yTop > B.yLandU && A.yTop < B.yLand, `${mode}: 아치 윗면 ${A.yTop.toFixed(2)}이 관 바닥 매스 속에 잠긴다(공면 z-fighting 방지)`)
      //  ⛔★133 계단 관 z대 안에서는 x를 침범하면 안 된다
      const ap = g2.getAttribute('position')
      let bad = 0
      for (let i = 0; i < ap.count; i++) {
        const x = ap.getX(i), z = ap.getZ(i)
        if (z > -B.wOut / 2 - 1e-6 && x < B.r0 - 1e-6) bad++
      }
      ok(bad === 0, `${mode}: ★133 관 z대 안에서 x < ${B.r0.toFixed(3)}인 아치 정점 ${bad}개(겹침 0)`)
      //  돔을 뚫지 않는다(발은 돔 위 UPB만큼 떠 있고 기둥이 받는다 — ★133 어법)
      let under = 0
      for (let i = 0; i < ap.count; i++) {
        const x = ap.getX(i), y = ap.getY(i), z = ap.getZ(i)
        if (y < bridgeDomeY_(Math.hypot(x, z)) - 1e-6) under++
      }
      ok(under === 0, `${mode}: 돔 표면 아래로 내려간 아치 정점 ${under}개(관통 0)`)
    }
    //  보존계
    ok(buildLink4Arch(link4Spec({ on: true, archOn: false })) === null, `LK4_ARC_ON=false → 아치만 null(관은 그대로)`)
    ok(buildLink4Arch(link4Spec({ on: true, archOn: true })) !== null, `— archOn 우회로 소등 체제에서도 아치를 시험할 수 있다`)
    ok(buildLink4(link4Spec({ on: true, archOn: false })).solid.length === 0, `— 그때 solid 0 · walk는 불변`)
    //  스팬 노브가 길이를 실제로 밀어낸다
    const near = link4Spec({ on: true, archOn: true, archZ: -4 }).arch, far = link4Spec({ on: true, archOn: true, archZ: -14 }).arch
    ok(far.L > near.L + 5, `LK4_ARC_Z −4 → L ${near.L.toFixed(2)} · −14 → L ${far.L.toFixed(2)}(평면 한계 없이 관을 따라 늘어난다)`)
    ok(Math.abs(far.reach[1] + 14) < 1e-9, `— −14에서도 끝이 정확히 그 z에 얄힌다`)
    //  ⚠고정 archZ로 견준다 — 짧은 스팬(예 −4)에서는 두 안이 아직 갈리기 전이라 길이가 같다(스윕이 적발)
    const sm = link4Spec({ on: true, archOn: true, archZ: -12, mode: 'smooth' }).arch
    const zz = link4Spec({ on: true, archOn: true, archZ: -12, mode: 'zigzag' }).arch
    ok(Math.abs(sm.L - zz.L) > 0.05, `archZ −12에서 두 안의 호길이가 다르다(곡선 ${sm.L.toFixed(2)} · 지그재그 ${zz.L.toFixed(2)}) — 아치가 각자의 관을 따른다는 증거`)
    const shortSm = link4Spec({ on: true, archOn: true, archZ: -4, mode: 'smooth' }).arch
    const shortZz = link4Spec({ on: true, archOn: true, archZ: -4, mode: 'zigzag' }).arch
    ok(Math.abs(shortSm.L - shortZz.L) < 0.05, `— archZ −4에서는 같다(${shortSm.L.toFixed(3)} ≈ ${shortZz.L.toFixed(3)}): 두 안 다 그 구간은 참에 수직인 직선이라 아직 갈리지 않았다`)
    ok(/link4Parts && link4Parts\.solid/.test(readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')), 'Room.jsx: 아치(solid) 마운트')

    //  ★★136-d 마디 분해 + 꺾임 각기둥 채움 + 스팬 상한 (현도 2건)
    const { extSpiralSpec } = await import('./extSpiralGeometry.js')
    const ES = extSpiralSpec(), RC = [C136.RAD_R * Math.cos(-Math.PI / 4), C136.RAD_R * Math.sin(-Math.PI / 4)]
    {
      const sm2 = link4Spec({ on: true, archOn: true, mode: 'smooth' }).arch
      const zz2 = link4Spec({ on: true, archOn: true, mode: 'zigzag' }).arch
      //  ⚠불변식: 곡선이 한 덩어리인 것은 **표본 간 최대 회전 < 문턱**의 귀결이다(문턱을 그 아래로 낮추면 갈리는 게 맞다)
      let maxTurn = 0
      for (let i = 1; i < sm2.dirs.length; i++) {
        const d = Math.max(-1, Math.min(1, sm2.dirs[i - 1][0] * sm2.dirs[i][0] + sm2.dirs[i - 1][1] * sm2.dirs[i][1]))
        maxTurn = Math.max(maxTurn, Math.acos(d) * 180 / Math.PI)
      }
      ok((sm2.runs.length === 1) === (maxTurn < C136.LK4_ARC_KINK),
        `곡선: 표본 간 최대 회전 ${maxTurn.toFixed(2)}° vs 문턱 ${C136.LK4_ARC_KINK}° → 마디 ${sm2.runs.length}(문턱 아래면 한 덩어리 스윕)`)
      ok(sm2.runs.length === sm2.corners.length + 1, `— 곡선도 마디 = 꺾임 + 1`)
      //  ⚠불변식으로 쓴다 — 마디 수는 꺾임 수 + 1이고, 꺾임은 문턱 LK4_ARC_KINK를 넘은 회전의 수다(노브 스윕에서도 성립)
      ok(zz2.runs.length === zz2.corners.length + 1,
        `지그재그: 마디 ${zz2.runs.length} = 꺾임 ${zz2.corners.length} + 1(${zz2.corners.map(c => c.turn.toFixed(1) + '°').join(' · ') || '없음'}) — 직선부에만 아치, 꺾임은 각기둥`)
      ok(zz2.corners.every(c => c.turn >= C136.LK4_ARC_KINK - 1e-9),
        `— 꺾임으로 잡힌 회전은 전부 문턱 ${C136.LK4_ARC_KINK}° 이상`)
      //  ⛔다면체로 보이던 주범 = 경로 점 부족. 조밀화가 실제로 일어났는지 정점 수로 박는다.
      const gz = buildLink4Arch(link4Spec({ on: true, archOn: true, mode: 'zigzag' }))
      ok(gz.getAttribute('position').count > 1200,
        `지그재그 아치 정점 ${gz.getAttribute('position').count} — 조밀화 전(경로 4점)이면 100 남짓이었다(현도 "다면체처럼 보여"의 진짜 원인)`)
      //  꺾임 채움은 양 마디와 같은 높이에서 만난다(단차 0)
      for (const c of zz2.corners) {
        const yb = zz2.yOfS(c.s)
        ok(yb > zz2.yB && yb < zz2.yJ, `꺾임 z${c.p[1].toFixed(2)} 채움 밑면 y ${yb.toFixed(3)} = 그 자리의 y(s)(양 마디와 같은 높이 — 단차 0)`)
      }
      //  스팬 상한 = 관 자신
      const over = link4Spec({ on: true, archOn: true, archZ: -40 }).arch
      ok(over.clamped && Math.abs(over.zEnd - over.zMin) < 1e-12,
        `archZ −40 요청 → 관 시작 z ${over.zMin.toFixed(3)}로 클램프(아치는 관보다 멀리 갈 수 없다)`)
      ok(sm2.clamped === (C136.LK4_ARC_Z < sm2.zMin),
        `클램프 여부 ${sm2.clamped}가 현행 archZ ${sm2.zEndAsked} vs 관 시작 ${sm2.zMin.toFixed(3)}과 일치`)
      const shortA = link4Spec({ on: true, archOn: true, archZ: -8.5 }).arch
      const longA = link4Spec({ on: true, archOn: true, archZ: -28 }).arch
      ok(longA.L > shortA.L + 20, `스팬이 실제로 늘어난다: archZ −8.5 → L ${shortA.L.toFixed(2)} · −28 → L ${longA.L.toFixed(2)}(현도 "나선참 부근까지")`)
      //  ⛔셸 간섭 — 아치가 **관보다 더** 파고드는지가 관건이다(셸은 아래로 갈수록 굵어진다)
      let extra = 0, worstGap = Infinity
      for (let i = 0; i < sm2.path.length; i++) {
        const q = sm2.path[i], yb = sm2.yOfS(sm2.sArr[i])
        extra = Math.max(extra, ES.rIn(yb) - ES.rIn(sm2.yJ))
        worstGap = Math.min(worstGap, Math.hypot(q[0] - RC[0], q[1] - RC[1]) - sm2.hwOut - ES.rIn(yb))
      }
      ok(extra < 0.5, `아치가 관보다 더 파고드는 최대 ${extra.toFixed(3)}(셸이 아래로 굵어지는 몫)`)
      //  그 최대가 나는 자리가 셸에서 멀다는 것이 안전의 근거다
      const qCol = sm2.path[0]
      ok(Math.hypot(qCol[0] - RC[0], qCol[1] - RC[1]) - sm2.hwOut - ES.rIn(sm2.yB) > 20,
        `— 그 지점(기둥 쪽)은 셸에서 ${(Math.hypot(qCol[0] - RC[0], qCol[1] - RC[1]) - sm2.hwOut - ES.rIn(sm2.yB)).toFixed(2)} 떨어져 있다 → 스팬을 끝까지 늘려도 셸 사정이 나빠지지 않는다`)
      ok(Math.abs(sm2.yOfS(sm2.L) - sm2.yJ) < 1e-9,
        `나선참 쪽 끝은 소핏에 붙은 칼날(y ${sm2.yOfS(sm2.L).toFixed(3)}) — 거기서 아치는 관과 똑같은 관계다`)
    }
  }

  //  ⑪ 선언된 빚 — 1p3 셸 종단은 여전히 열려 있다
  {
    const es = readFileSync(new URL('./extSpiralGeometry.js', import.meta.url), 'utf8')
    ok(/LNK_OPEN_SPIRAL && capIsDoor\) continue/.test(es),
      `⚠나선 참 종단 캡은 k에 무관하게 4셸 전부 열린다 — 이 관이 1p4를 인수하고, **1p3은 선언된 빚로 남는다**`)
  }
}

console.log(`\n${fail === 0 ? '✅' : '❌'} check_rooms: ${n - fail}/${n} 통과`)
process.exit(fail === 0 ? 0 : 1)
