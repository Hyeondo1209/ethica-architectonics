// ════════════════════════════════════════════════════════════════════
//  check_rooms.mjs — 1p1~4 방별 사건 + 방사 비석 검증 (2026.07.12)
//  실소스(constants.js + radialEventsGeometry.js)를 그대로 임포트해
//  기하 위반을 시각 확인 전에 잡는다. 실행: node src/check_rooms.mjs
//  판정 근거 = DESIGN.md §5 + BRIEF_radial_room_events.md §8.
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import {
  petalR, P_FLOOR_TOP, P_FLOOR_R, P_DOOR_TOP, P_ROOM,
  RAD_PRX, RAD_PCY, RAD_PRY, COR_Y0, COR_THICK, RAD_DOOR_HW,
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
  //  ⚠몸통권(y ≤ 68)으로 제한: 뿌리·플레어의 근접은 ①근접 출발의 의도라 제외 —
  //  발산한 몸통들 사이에서 스침 쌍만 되돌아와 가까워지는가(③)를 잰다.
  const minD = (a, b) => {
    let m = 1e9
    for (let i = 0; i < a.length; i += 2) { if (a[i][1] > 68) continue
      for (let j = 0; j < b.length; j += 2) { if (b[j][1] > 68) continue
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
  const FR_OUT = 2.3 + 0.5, LIN_TOP = 54 + 0.6, Y_FTOP = COR_Y0 - 0.02 + COR_THICK / 2
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

console.log(`\n${fail === 0 ? '✅' : '❌'} check_rooms: ${n - fail}/${n} 통과`)
process.exit(fail === 0 ? 0 : 1)
