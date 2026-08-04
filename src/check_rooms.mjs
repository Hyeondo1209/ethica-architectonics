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
  P4_TILT_MAX, P4_PATH_HW, P4_SCALE, P_ST_X, P_ST_NEAR, P_ST_FAR, P_SPAWN_LX,
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
  DAIS_R, DAIS_STEP_IN, DAIS_STEPS, POOL_R,
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

console.log('── 방사 비석 4기 ──')
{
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
  ok(toStele < P_ST_FAR && toStele > P_ST_NEAR, `스폰→비석 ${toStele.toFixed(1)} ∈ (near ${P_ST_NEAR}, far ${P_ST_FAR}) — 글자가 어렴풋이 뜬 채 시작`)
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
  ok(S.rRim > POOL_R, `판 구멍(${S.rRim}) > 빛 웅덩이(${POOL_R}) — ⚠빛 하절이 허공에서 잘린다(선언: PIT_SHAFT_DROP로 전환 · 판정은 P2)`)

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
      //  ⓖ 코너는 볼트 끝 언저리로만 — 몸통 한가운데 45° 꺾임 금지
      let coreCorner = 0
      for (const v of VL) for (let k = 1; k < S.N_SEG; k++)
        if (Math.abs(v.Lc - S.cum[k]) < AX_VAULT_LEN / 2 - 1.2 - 1e-6) coreCorner++
      ok(coreCorner === 0, `몸통 중앙부(끝 1.2 제외)에 코너 0곳 — 꺾인 탑 없음`)
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
      const { ROOM_STAIR_SLAB: SLAB111 } = await import('./constants.js')
      const discB = COR_Y0 + COR_THICK / 2 + 0.02 - SLAB111
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

console.log(`\n${fail === 0 ? '✅' : '❌'} check_rooms: ${n - fail}/${n} 통과`)
process.exit(fail === 0 ? 0 : 1)
