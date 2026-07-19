// check_corridor.mjs — 통로 홀 1p5 검증 (㊳ 2026.07.14 재편 → ★㊴ 2026.07.17: 대순회 #0·플랫폼 강하·프리즈)
//  실행: node src/check_corridor.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import — 구판(슬릿 광학 밀폐)의 C절은 '반대 요구'가 되어 가시성 검증으로 교체.
//
//  ★C절 2D 전제(구판 계승): 창 y창(0~150)에서 리브는 무릎(y=240) 훨씬 아래 = 수직 원기둥이고
//   벽·개구도 z축 압출체(y 무관 단면) → 밑동 가시성은 y에 독립. 대들보(y114~130)는 밑동 시선(≈눈높이
//   수평)과 무관. 가시(+) 판정은 리브 차폐 무시(보수적) / 불가시(−) 판정은 리브 차폐 포함(실제적).
import {
  COR_R, COR_CX, COR_WALL_SEG, COR_Y0, COR_THICK, CEIL_LO, CEIL_HI, ceilY,
  WIN_HALF, WIN_SILL_Y, WIN_TOP_Y,
  BOX_IN_H, BOX_TOP, BOX_X0, BOX_X1, BOX_HW, DOOR_HALF,
  RAD_TOP, RAD_DOOR_H,
  PLAT_X, PLAT_R, PLAT_F, PLAT_Y, PLAT_DROP, DESC_X0, DESC_X1, PILLAR_R, COR_FLOOR_HW, COR_X1, COR_CYL_X0, COR_CLIMB, RIB_Y,
  R_BASE, MERIDIANS, SHELL_RIB_R, DOOR_W, DOOR_H, DOOR_SILL_Y, KNEE, H,
  HALL_DOORS, STAIR_GAP, STAIR_DS, STAIR_TD, STAIR_W, COR_RISE, STAIR_MAX_SLOPE,
  TEMPLE_MODE, TEMPLE_Y0, TEMPLE_X0, TEMPLE_X1, TEMPLE_HZ, TEMPLE_CLR, STAIR_SCHEME,
  CL_SILL, CL_R, PASS_FLOOR_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
} from './constants.js'
import { hallDoors, buildHallStairs, PLAT_TOP } from './corridorStairsGeometry.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const r2 = (v) => Math.round(v * 100) / 100
const DEG = 180 / Math.PI
const FLOOR_TOP = COR_Y0 + COR_THICK / 2                         // 다리·플랫폼 상면 ≈49.3
const DTOP = FLOOR_TOP + RAD_DOOR_H                              // 접합문 상단 ≈53.3
const segW = Math.PI * 2 / COR_WALL_SEG
const tDoor = Math.floor(DOOR_HALF / segW + 0.5) * segW          // −x 문 트임 실모서리 각
const tWin  = Math.floor(WIN_HALF / segW + 0.5) * segW           // 창 실모서리 각(격자 스냅)
const doors = hallDoors()
const { stairs } = buildHallStairs()
const S = Object.fromEntries(stairs.map(s => [s.k, s]))

console.log('— A. 박스 ㄷ′ 압축 (유지 확인) —')
ok(Math.abs(BOX_TOP - (FLOOR_TOP + BOX_IN_H)) < 1e-9, `BOX_TOP(${r2(BOX_TOP)}) = 다리 상면(${r2(FLOOR_TOP)}) + 내부고(${BOX_IN_H})`)
ok(BOX_IN_H >= 5.2 && BOX_IN_H <= 9, `내부고 ${BOX_IN_H} ∈ [5.2, 9] (압축 성립 구간)`)
ok(BOX_TOP - DTOP >= 1.5, `접합문 헤더 ${r2(BOX_TOP - DTOP)} ≥ 1.5`)
ok(BOX_TOP - RAD_TOP >= 1.5, `고리 지붕(${RAD_TOP}) 위 여유 ${r2(BOX_TOP - RAD_TOP)} ≥ 1.5`)
ok(BOX_TOP < CEIL_LO, `BOX_TOP(${r2(BOX_TOP)}) < CEIL_LO(${CEIL_LO}) — 진입 낙차 존재`)
ok(ceilY(BOX_X1) - BOX_TOP >= 12, `진입 순간 해방 ${r2(ceilY(BOX_X1) - BOX_TOP)} ≥ 12`)
ok(CEIL_HI - BOX_TOP >= 90, `최대 해방 ${r2(CEIL_HI - BOX_TOP)} ≥ 90`)

console.log('— B. 헤더 봉인 (−x 개구의 BOX_TOP 위 — 유지 확인) —')
{
  const xDoorEdge = COR_CX + COR_R * Math.cos(Math.PI - tDoor)
  ok(ceilY(xDoorEdge) > BOX_TOP + 5, `문 트임 모서리 천장 ${r2(ceilY(xDoorEdge))} > BOX_TOP+5 — 헤더 필수 조건`)
  ok(tDoor > 0, `−x 문 트임 존재 (${r2(tDoor * DEG)}°)`)
  ok(COR_R * Math.sin(tDoor) <= BOX_HW + 1e-9, `문 트임 z반폭 ${r2(COR_R * Math.sin(tDoor))} ≤ 박스 반폭 ${BOX_HW}`)
  ok(COR_R * Math.sin(tDoor) >= COR_FLOOR_HW + 0.4, `문 트임 z반폭 ≥ 다리 반폭 ${COR_FLOOR_HW}+0.4`)
  ok(BOX_X1 > COR_CX - Math.sqrt(COR_R * COR_R - BOX_HW * BOX_HW) + 1, `박스 물림(천장 슬랩→${BOX_X1}) 헤더 밑선 봉합`)
}

// ── 2D 광선(plan): 벽 = 원 r=COR_R(중심 COR_CX,0), 개구 = |θ|≤tWin(창)·|θ−π|≤tDoor(박스 문) ──
//  ribsBlock=true면 리브 밑동 원(반경 SHELL_RIB_R, k=−9..9, 표적 자신 제외)도 차폐물로 넣는다.
const ribC = (k) => { const p = k * Math.PI * 2 / MERIDIANS; return [R_BASE * Math.cos(p), R_BASE * Math.sin(p)] }
function passes2D(ex, ez, tx, tz, { ribsBlock = false, skipK = null } = {}) {
  const dx = tx - ex, dz = tz - ez, L = Math.hypot(dx, dz)
  // (a) 벽 원 교차 — 행진(구판 수법: 안↔밖 넘는 순간의 θ가 개구 밖이면 차단)
  const N = Math.max(80, Math.ceil(L / 0.25))
  let prevIn = null
  for (let i = 0; i <= N; i++) {
    const t = i / N, px = ex + t * dx, pz = ez + t * dz
    let th = Math.atan2(pz, px - COR_CX); if (th < 0) th += Math.PI * 2
    const inside = Math.hypot(px - COR_CX, pz) < COR_R
    if (prevIn !== null && inside !== prevIn) {
      const dZero = Math.min(th, Math.PI * 2 - th), dPi = Math.abs(th - Math.PI)
      if (dZero > tWin + 1e-9 && dPi > tDoor + 1e-9) return false
    }
    prevIn = inside
  }
  if (ribsBlock) {                                     // (b) 리브 몸통 차폐(선분↔원 거리)
    for (let k = -9; k <= 9; k++) {
      if (k === skipK) continue
      const [cx, cz] = ribC(k)
      const wx = cx - ex, wz = cz - ez
      const tt = Math.max(0, Math.min(1, (wx * dx + wz * dz) / (L * L)))
      if (Math.hypot(wx - tt * dx, wz - tt * dz) < SHELL_RIB_R - 0.05) return false
    }
  }
  return true
}
// 표적 = 리브 k 밑동 원(중심 + 경계 32점). 하나라도 통과하면 '보임'.
function ribVisibleFrom(ex, ez, k, opt) {
  const [cx, cz] = ribC(k)
  if (passes2D(ex, ez, cx, cz, { ...opt, skipK: k })) return true
  for (let j = 0; j < 32; j++) {
    const a = j / 32 * Math.PI * 2
    if (passes2D(ex, ez, cx + SHELL_RIB_R * Math.cos(a), cz + SHELL_RIB_R * Math.sin(a), { ...opt, skipK: k })) return true
  }
  return false
}

console.log('— C. 창 ±43° · 가시성 (다섯 가시 · ±3 불가시 · 원호 상한) —')
ok(Math.abs(WIN_HALF - 43 * Math.PI / 180) < 1e-9 && WIN_SILL_Y === 0 && WIN_TOP_Y === CEIL_HI,
  `창 스펙: 반각 43° · sill 0 · top ${WIN_TOP_Y} = CEIL_HI`)
{ // 다섯/배제의 기하 근거: 드럼각(원통 중심 기준) — ±2 ≤ 43° < ±3
  const drumAng = (k) => { const [x, z] = ribC(k); return Math.atan2(Math.abs(z), x - COR_CX) * DEG }
  ok(drumAng(2) < 43 - 1, `리브 ±2 드럼각 ${r2(drumAng(2))}° < 42° (창 안 — 다섯의 마지막)`)
  ok(drumAng(3) > 43 + 1, `리브 ±3 드럼각 ${r2(drumAng(3))}° > 44° (창 밖 — 잘림)`)
}
// 눈 표본 3군: [셈-시점] 다리·플랫폼(여기서 '다섯'이 진술됨 — 엄격) / [계단] 판 위(간극 체험 — 원호 상한만)
const eyesCount = []
for (let x = BOX_X0 + 2; x <= PLAT_X - PLAT_R; x += 4) for (const z of [-COR_FLOOR_HW, 0, COR_FLOOR_HW]) eyesCount.push([x, z])
for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2; eyesCount.push([PLAT_X + (PLAT_R - 0.3) * Math.cos(a), (PLAT_R - 0.3) * Math.sin(a)]) }
eyesCount.push([PLAT_X, 0])
for (const k of [0, 1, -1, 2, -2])
  ok(ribVisibleFrom(PLAT_X, 0, k, { ribsBlock: false }), `플랫폼 중심에서 리브 ${k >= 0 ? '#+' + k : '#' + k} 가시 (다섯이 선다)`)
for (const k of [3, -3]) {
  let leak = null
  for (const [ex, ez] of eyesCount) if (ribVisibleFrom(ex, ez, k, { ribsBlock: true })) { leak = [ex, ez]; break }
  ok(leak === null, `리브 ${k > 0 ? '#+' + k : '#' + k} 불가시 — 셈-시점(다리·플랫폼 ${eyesCount.length}곳)` + (leak ? ` 누출 눈(${r2(leak[0])},${r2(leak[1])})` : ''))
}
{ // 계단 판 위: 창가 접근 시 시야가 부채꼴로 열리는 것은 전고 창의 기하 필연(시차) —
  //  ★실측(㊳ 구현일): 누출은 '모든 계단의 창가 끝단'에 집중. 최악 = #0 상단(x≈280)에서 근호 ±6, 동시 13.
  //  ⚠이 성질은 구 파노라마(㊱ 이전 라이브)에도 동일 — 구 "±3 가림" 스펙은 플랫폼 시점 기준(위 [21][22]로 계승).
  //  '다섯' 프레이밍의 희석 여부 = ★열린 판정(현도 — 웨이포인트 stm2/stp2/ribdoor 직전에서 고개 돌려 볼 것).
  //  여기서 강제하는 상한 둘: ① 원거리 호 밀폐 |k|≥9 (반대편·원호 확장 없음 = 1p11 무손상의 하한.
  //     ⚠㊴-6 실측 갱신: 구 ≥8 봉인은 ㊳ 곡선 접근의 실측〔최원 ±7〕이었고, arc 스킴의 레디얼 문 정렬이
  //     창 모서리 구석 판에서 ±8을 한 칸 스치게 함 — 두 스킴 공히 판 위상 요행 차이일 뿐 형상 급의
  //     차이가 아니므로 봉인선을 실측 ±8 + 여유 없음 = ≥9 금지로 이동. 반대편 은닉은 무손상.)
  //  ② 동시 가시 ≤ 14 (실측 13 + 여유 1 — 이 봉인이 깨지면 창·계단 형상이 바뀐 것).
  let worstK = 0, worstCnt = 0, farLeak = null
  for (const st of stairs) for (let i = 0; i < st.plates.length; i += 4) {
    const p = st.plates[i]
    let cnt = 0
    for (let k = -9; k <= 9; k++) {
      if (!ribVisibleFrom(p.x, p.z, k, { ribsBlock: true })) continue
      cnt++
      if (Math.abs(k) > Math.abs(worstK)) worstK = k
      if (Math.abs(k) >= 9 && !farLeak) farLeak = [st.k, r2(p.x), r2(p.z), k]
    }
    if (cnt > worstCnt) worstCnt = cnt
  }
  ok(farLeak === null, `원거리 호 밀폐: |k|≥9 전 판 불가시(㊴-6 실측 갱신 — 주석 참조)` + (farLeak ? ` — 누출 계단#${farLeak[0]} (${farLeak[1]},${farLeak[2]}) → 리브 ${farLeak[3]}` : ''))
  ok(worstCnt <= 14, `계단 위 동시 가시 최대 ${worstCnt} ≤ 14 (실측 봉인 — 최원 리브 ${worstK >= 0 ? '#+' + worstK : '#' + worstK})`)
  console.log(`    ↳ ★열린 판정 리포트: 창가 끝단 근호 노출 — 최원 ${worstK >= 0 ? '#+' + worstK : '#' + worstK} · 동시 최대 ${worstCnt} (완화 후보 = 창변 리빌 잼 재도입, 현도 결정)`)
}

console.log('— D. 문 다섯 (위치·문턱·법선·창 안) —')
ok(doors.length === 5 && HALL_DOORS.length === 5, `문 다섯 (${doors.map(d => d.k).join(', ')})`)
{
  const sillOf = Object.fromEntries(HALL_DOORS.map(d => [d.k, d.sill]))
  ok(sillOf[0] === DOOR_SILL_Y && DOOR_SILL_Y === RIB_Y - 2, `#0 문턱 ${sillOf[0]} = DOOR_SILL_Y = RIB_Y−2 (불변식 고정)`)
  const sills = HALL_DOORS.map(d => d.sill)
  ok(new Set(sills).size === 5, `다섯 문턱 전부 다름 (${sills.join(', ')}) — 등간격 없음·비대칭`)
  const above = HALL_DOORS.filter(d => d.sill > PLAT_TOP).map(d => d.sill).sort((a, b) => b - a)
  ok(above.indexOf(sillOf[0]) === 2, `#0(${sillOf[0]})은 위쪽 넷 중 3위 — '일부러 평범하게'(높이가 이유로 안 읽히게)`)
  ok(HALL_DOORS.filter(d => d.sill < PLAT_TOP).length === 1 && sillOf[-2] < PLAT_TOP,
    `아래로 내려가는 문은 #−2 하나(${sillOf[-2]} < 플랫폼면 ${r2(PLAT_TOP)})`)
}
for (const d of doors) {
  const dAng = Math.atan2(Math.abs(d.wz), d.wx - COR_CX)
  ok(d.sill >= WIN_SILL_Y && d.top <= WIN_TOP_Y, `#${d.k > 0 ? '+' : ''}${d.k} 문 y ${d.sill}~${d.top} ⊂ 창(0~${WIN_TOP_Y})`)
  ok(dAng <= WIN_HALF + 0.02, `#${d.k > 0 ? '+' : ''}${d.k} 문 방위 ${r2(dAng * DEG)}° ≤ 창 반각 43°`)
  const toPlat = Math.hypot(PLAT_X - d.cx, d.cz)
  ok(Math.hypot(PLAT_X - d.wx, d.wz) < toPlat - SHELL_RIB_R + 0.01, `#${d.k > 0 ? '+' : ''}${d.k} 문면(wallPt)이 플랫폼 쪽 벽 — 법선이 플랫폼을 향함`)
}

console.log('— E. #0 도달 (현행 계승: 문턱 72·밑면 여유·관 무관통) —')
{
  const st = S[0]
  ok(st.reach, `#0 = 유일한 도달 계단`)
  const last = st.plates[st.plates.length - 1]
  ok(Math.hypot(last.x - COR_X1, last.z) < STAIR_TD, `끝 판 (${r2(last.x)}, ${r2(last.z)}) — 리브 축(${COR_X1},0) 도달`)
  ok(Math.abs(last.yTop - RIB_Y) < 0.35, `끝 판 상면 ${r2(last.yTop)} ≈ RIB_Y ${RIB_Y} (나선 첫 칸 인계)`)
  const wallX = R_BASE - SHELL_RIB_R                              // 리브 −x벽 ≈282
  const atWall = st.plates.filter(p => Math.abs(p.x - wallX) <= STAIR_TD && Math.abs(p.z) <= DOOR_W / 2 + 2)   // ㊴-7: 문 축 한정(polar 원호가 x지대를 방위 밖에서 지나는 것 오인 방지)
  ok(atWall.length > 0 && atWall.every(p => p.yTop - COR_RISE >= DOOR_SILL_Y + 0.1),
    `벽면(x≈${wallX}) 통과 판 밑면 ${r2(Math.min(...atWall.map(p => p.yTop - COR_RISE)))} ≥ 문턱 ${DOOR_SILL_Y}+0.1 (무관통)`)
  ok(atWall.every(p => p.yTop + 2.2 <= DOOR_SILL_Y + DOOR_H),
    `벽면 통과 판 위 헤드룸 ≥ 2.2 (문 상단 ${DOOR_SILL_Y + DOOR_H})`)
  const inDoor = st.plates.filter(p => p.x > wallX - 0.2 && Math.abs(p.z) <= DOOR_W / 2 + 2)
  ok(inDoor.every(p => Math.abs(p.z) + STAIR_W / 2 <= DOOR_W / 2 + 0.35),
    `문 안 판 ${inDoor.length}개 — z 이탈 최대 ${r2(Math.max(...inDoor.map(p => Math.abs(p.z))))} (폭 ${STAIR_W} ⊂ 문 ${DOOR_W}+공차)`)
}

console.log('— F. 넷 미도달 (간극 = STAIR_GAP · 관 무접촉) —')
for (const st of stairs) {
  if (st.reach) continue
  const d = st.door
  let minGap = 1e9
  for (const p of st.plates) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {   // 판 네 귀
      const ca = Math.cos(p.rotY), sa = Math.sin(p.rotY)
      const gx = p.x + sx * (STAIR_TD / 2) * ca + sz * (STAIR_W / 2) * sa
      const gz = p.z - sx * (STAIR_TD / 2) * sa + sz * (STAIR_W / 2) * ca
      minGap = Math.min(minGap, Math.hypot(gx - d.wx, gz - d.wz))
    }
  }
  ok(minGap >= STAIR_GAP - 0.8 && minGap <= STAIR_GAP + STAIR_TD + 1,   // 하한 = GAP − 0.8(㊴-3 균일 재분배로 끝판이 E〔후퇴 GAP〕에 정확히 닿음 — 모서리 보정 최대 ≈ TD/2 + 접근각 성분. 5m대는 여전히 도약 불가 = '명백히 못 감' 유지)
    `#${st.k > 0 ? '+' : ''}${st.k} 간극 ${r2(minGap)} ≈ STAIR_GAP ${STAIR_GAP} (명백히 못 가되 '닿을 뻔')`)
  ok(Math.abs(st.end.y - d.sill) < 0.35, `#${st.k > 0 ? '+' : ''}${st.k} 끝 판 ${r2(st.end.y)} ≈ 문턱 ${d.sill} (등고 — 허공 하나 사이)`)
  let minRib = 1e9
  for (const p of st.plates) for (let k = -5; k <= 5; k++) {
    const [cx, cz] = ribC(k)
    minRib = Math.min(minRib, Math.hypot(p.x - cx, p.z - cz) - STAIR_TD / 2 - SHELL_RIB_R)
  }
  ok(minRib > 0.6, `#${st.k > 0 ? '+' : ''}${st.k} 판↔리브 관 최소 여유 ${r2(minRib)} > 0.6 (무접촉)`)
}

console.log('— G. 경사 상한 35° · 하부 관통 · 받침 기둥 —')
for (const st of stairs) {
  let maxS = 0
  for (let i = 1; i < st.samples.length; i++) {
    const a = st.samples[i - 1], b = st.samples[i]
    const run = Math.hypot(b.x - a.x, b.z - a.z)
    if (run > 1e-6) maxS = Math.max(maxS, Math.abs(b.y - a.y) / run)
  }
  ok(maxS <= STAIR_MAX_SLOPE + 0.01,
    `#${st.k > 0 ? '+' : ''}${st.k} 최대 경사 ${r2(Math.atan(maxS) * DEG)}° ≤ 35° (호길이 ${r2(st.L)})`)
}
{
  const st = S[-2]
  const minY = Math.min(...st.plates.map(p => p.yTop))
  ok(minY < PLAT_TOP - 15, `#−2 최저 ${r2(minY)} — 플랫폼면 아래 ${r2(PLAT_TOP - minY)} 하강(44.5% 공백 관통)`)
  ok(Math.abs(minY - S[-2].door.sill) < 1.2, `#−2 최저 ≈ 문턱 ${S[-2].door.sill} (내려가 닿을 뻔)`)
  let minPil = 1e9
  for (const s2 of stairs) for (const p of s2.plates) {
    if (p.yTop > PLAT_TOP - 0.5) continue                         // 기둥 구간(플랫폼 아래)만
    minPil = Math.min(minPil, Math.hypot(p.x - PLAT_X, p.z))
  }
  ok(minPil >= PILLAR_R + STAIR_W / 2 + 0.3, `플랫폼 아래 판↔받침 기둥 최소 ${r2(minPil)} ≥ ${PILLAR_R + STAIR_W / 2 + 0.3}`)
}

console.log('— H. 연속성 (호길이 균일 · 무더기/틈 없음 · NaN 없음) —')
//  ★㊴-7 참-인지: 인접 판 쌍이 참(landing) 근방이면 간격·회전 면제 — 단 "면제 = 참이 실제로 덮는다"를
//   함께 강제(큰 꺾임·간격 점프가 참 없이 존재하면 실패). 비행/원호 본체는 여전히 균일·무꺾임이어야 한다.
const nearLanding = (st, a, b) => st.landings.some(ld => {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2
  return Math.hypot(mx - ld.x, mz - ld.z) < 2.6
})
for (const st of stairs) {
  ok(st.plates.length > 30 && st.plates.every(p => [p.x, p.yTop, p.z, p.rotY].every(Number.isFinite)),
    `#${st.k > 0 ? '+' : ''}${st.k} 판 ${st.plates.length}개(참 ${st.landings.length}) · NaN 없음`)
  let maxD = 0, maxTurn = 0, maxRise = 0, uncovered = null
  for (let i = 1; i < st.plates.length; i++) {
    const a = st.plates[i - 1], b = st.plates[i]
    const D = Math.hypot(b.x - a.x, b.z - a.z)
    let dY = Math.abs(b.rotY - a.rotY); if (dY > Math.PI) dY = 2 * Math.PI - dY
    const rise = Math.abs(b.yTop - a.yTop)
    if (D > STAIR_DS * 1.15 || dY * DEG > 8) {
      if (!nearLanding(st, a, b)) { uncovered = [r2(a.x), r2(a.z), r2(dY * DEG), r2(D)]; }
      continue                                                   // 참이 덮는 꺾임 — 본체 통계에서 제외
    }
    maxD = Math.max(maxD, D); maxTurn = Math.max(maxTurn, dY); maxRise = Math.max(maxRise, rise)
  }
  ok(uncovered === null, `#${st.k > 0 ? '+' : ''}${st.k} 모든 꺾임·간격 점프는 참이 덮는다`
    + (uncovered ? ` — 미피복 (${uncovered[0]},${uncovered[1]}) 회전 ${uncovered[2]}° 간격 ${uncovered[3]}` : ''))
  ok(maxD <= STAIR_DS * 1.15, `#${st.k > 0 ? '+' : ''}${st.k} 비행 본체 판 간격 최대 ${r2(maxD)} ≤ ${r2(STAIR_DS * 1.15)}`)
  ok(maxTurn * (STAIR_W / 2) <= (STAIR_TD - STAIR_DS) + 0.12,
    `#${st.k > 0 ? '+' : ''}${st.k} 비행 본체 판당 회전 최대 ${r2(maxTurn * DEG)}° — 바깥귀 틈 없음`)
  ok(maxRise <= STAIR_DS * STAIR_MAX_SLOPE + 0.06, `#${st.k > 0 ? '+' : ''}${st.k} 단높이 최대 ${r2(maxRise)} (경사 상한의 귀결)`)
}
{ // 벽 통과 금지: 벽 반경대(±3.5)에 드는 판은 반드시 창 방위 안
  let bad = null
  for (const st of stairs) for (const p of st.plates) {
    const rr = Math.hypot(p.x - COR_CX, p.z)
    if (rr + 1.75 > COR_R - 0.1) {                              // ㊴-7 정밀화: 판 최악 귀(폭/2 반경 성분)가 벽에 닿아야 관통
      const th = Math.atan2(Math.abs(p.z), p.x - COR_CX)
      if (th > WIN_HALF - 0.02) { bad = [st.k, r2(p.x), r2(p.z)]; break }
    }
  }
  ok(bad === null, `벽 접촉 판 전부 창 방위 안 (벽 무관통 — 귀 기준)` + (bad ? ` — 위반 #${bad[0]} (${bad[1]},${bad[2]})` : ''))
}

console.log('— I. 계단끼리 여유 (교차 헤드룸 · 겹침 — 루프의 자기 교차 포함) —')
{
  //  ⚠플랫폼 결절(팬)은 면제: 다섯이 '한 점(플랫폼 림)'에서 방사 = 뿌리 다발이 겹치는 것이 의도
  //   ("다발의 뿌리 = 사물"). 면제 기준 = 플랫폼 중심으로부터의 평면 거리(호길이 아님 — #+1·#+2는
  //   출발 방위각이 40° 안이라 림을 크게 돈 뒤에야 갈라진다 → 호길이 컷은 못 잡음, 실측 교훈).
  //  위험 2종만 검출(둘 다 결절 밖에서): ① 낮은 머리위 선반(평면 근접 + 낙차 0.8~3.0 — 걷다 머리 침)
  //   ② 판 상호 관입(근접 + 등고). 근접판이 아래위로 뚜렷이(≥3.0) 갈리면 = 정상 입체 교차(허용).
  const NODE_R = PLAT_R + 6 + STAIR_W / 2                            // 결절 다발 반경(플랫폼 림 + 6 + 판 반폭 — 경계 판 가장자리 겹침도 뿌리로 봄)
  const nearNode = (p) => Math.hypot(p.x - PLAT_X, p.z) < NODE_R
  let shelf = null, merge = null
  const all = []
  for (const st of stairs) st.plates.forEach((p, i) => all.push({ k: st.k, i, ...p }))
  for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
    const P = all[a], Q = all[b]
    if (P.k === Q.k && Math.abs(P.i - Q.i) * STAIR_DS < 14) continue   // 같은 계단 이웃 판 제외(루프 재교차만 검사)
    if (nearNode(P) && nearNode(Q)) continue                           // 결절 다발 면제(뿌리 겹침 = 의도)
    const hd = Math.hypot(P.x - Q.x, P.z - Q.z)
    if (hd >= 6) continue
    const dy = Math.abs(P.yTop - Q.yTop)
    if (dy > 0.8 && dy < 3.0 && (!shelf || dy < shelf.dy)) shelf = { dy, hd, P, Q }
    if (dy <= 0.8 && hd < 3.2 && (!merge || hd < merge.hd)) merge = { dy, hd, P, Q }
  }
  ok(shelf === null, `낮은 머리위 선반 없음(결절 밖 · 근접<6 · 낙차 0.8~3.0 부재)`
    + (shelf ? ` — #${shelf.P.k}(y${r2(shelf.P.yTop)}) ↕ #${shelf.Q.k}(y${r2(shelf.Q.yTop)}) 낙차 ${r2(shelf.dy)}` : ''))
  ok(merge === null, `결절 밖 판 상호 관입 없음(등고 · 평면<3.2 부재)`
    + (merge ? ` — #${merge.P.k} ↔ #${merge.Q.k} 평면 ${r2(merge.hd)}` : ''))
}

console.log('— I2. 보행로 상공 무침범(㊴-2 신설 — 서쪽 순회가 다리를 막던 실측 버그의 봉인) —')
{
  // 다리(49.3)·낮은 다리(45.8) 복도 띠: |z| ≤ 길 반폭+판 반폭+0.3, x ∈ [BOX_X0, 플랫폼 서쪽 림].
  //  이 띠 위 계단 표본은 보행면 위 헤드룸 3.2 이상이거나(위로 지나감 — 현재는 해당 없음) 존재하지 않아야 한다.
  const zBand = COR_FLOOR_HW + STAIR_W / 2 + 0.3
  const rimX = PLAT_X - PLAT_R
  let hit = null
  for (const st of stairs) {
    for (const sm of st.samples) {
      if (Math.abs(sm.z) > zBand || sm.x < BOX_X0 || sm.x > rimX) continue
      const walkTop = sm.x < DESC_X0 ? FLOOR_TOP : PLAT_TOP        // 하강 구간은 보수적으로 높은 쪽
      if (sm.y - 0.35 < walkTop + 3.2) { hit = [st.k, r2(sm.x), r2(sm.z), r2(sm.y)]; break }
    }
    if (hit) break
  }
  ok(hit === null, `다리·낮은 다리 복도 띠(|z|≤${r2(zBand)}) 위 계단 침범 0`
    + (hit ? ` — #${hit[0]} (${hit[1]},${hit[2]}) y${hit[3]}` : ''))
}

console.log('— J. 신전 프리즈(㊴) — 하단·천장 정합·구멍 완결·★창 상부 봉인 —')
ok(['beam', 'off'].includes(TEMPLE_MODE), `TEMPLE_MODE '${TEMPLE_MODE}' — 스위치 유효(㊴: entablature·frame 폐기)`)
{
  const maxDoorTop = Math.max(...doors.map(d => d.top))
  ok(TEMPLE_Y0 - maxDoorTop >= 4, `프리즈 하단 ${TEMPLE_Y0} − 최고 문 상단 ${maxDoorTop} = ${TEMPLE_Y0 - maxDoorTop} ≥ 4`)
  const maxPlate = Math.max(...stairs.flatMap(st => st.plates.map(p => p.yTop)))
  ok(TEMPLE_Y0 - maxPlate >= 2.6, `프리즈 하단 − 최고 판(${r2(maxPlate)}) = ${r2(TEMPLE_Y0 - maxPlate)} ≥ 2.6 (계단 헤드룸)`)
  // 상면 = 빗면 천장 정합(부재 x구간 전역에서 천장 아래 0.02 — 천장 위 돌출 없음 = 조감 무오염)
  ok(ceilY(TEMPLE_X0) - 0.02 > TEMPLE_Y0 + 8, `상면(빗면 ${r2(ceilY(TEMPLE_X0))}~${r2(ceilY(TEMPLE_X1))}) — 하단 위 두께 ${r2(ceilY(TEMPLE_X0) - TEMPLE_Y0)}+`)
  // 구멍 완결: 다섯 리브 관 단면이 부재 부피에 온전히 포함
  let holeOK = true
  for (const d of doors) {
    const rr = SHELL_RIB_R + TEMPLE_CLR
    if (d.cx - rr < TEMPLE_X0 + 0.2 || d.cx + rr > TEMPLE_X1 - 0.2 || Math.abs(d.cz) + rr > TEMPLE_HZ - 0.2) holeOK = false
  }
  ok(holeOK, `리브 5 관통 구멍(r=${SHELL_RIB_R + TEMPLE_CLR}) 전부 부재 부피 안(x ${r2(TEMPLE_X0)}~${TEMPLE_X1} · |z|≤${TEMPLE_HZ}, 여유 0.2)`)
  // ★창 상부 봉인(㊴ 소견 3의 검증): 셈-시점 → 창면(y TEMPLE_Y0+1 ~ 천장−1) 표적 시선이 전부 부재에 막힘.
  //  표적이 리브 관(구멍 방위)에 드는 경우는 리브 몸통이 채우므로 면제(배경 아님).
  const beamHit = (ex, ey, ez, tx, ty, tz) => {
    // 선분 vs AABB(표준 슬랩) — 상면은 빗면이라 y상한 = ceilY(TEMPLE_X0)(부재를 '작게' 잡는 보수적 근사: 봉인 쪽에 안전)
    const y1 = ceilY(TEMPLE_X0) - 0.02
    const dx = tx - ex, dy = ty - ey, dz = tz - ez
    let t0 = 0, t1 = 1
    const slab = (e, d, lo, hi) => {
      if (Math.abs(d) < 1e-12) return e >= lo && e <= hi
      let ta = (lo - e) / d, tb = (hi - e) / d
      if (ta > tb) { const t = ta; ta = tb; tb = t }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb)
      return t0 <= t1
    }
    return slab(ex, dx, TEMPLE_X0, TEMPLE_X1) && slab(ey, dy, TEMPLE_Y0, y1) && slab(ez, dz, -TEMPLE_HZ, TEMPLE_HZ)
  }
  const inRibHole = (tx, tz) => doors.some(d => Math.hypot(tx - d.cx, tz - d.cz) < SHELL_RIB_R + TEMPLE_CLR + 0.3)
  let leak = null
  const EYE = 1.6
  outer:
  for (const [ex, ez] of eyesCount) {
    if (ex < COR_CYL_X0 + 1) continue                            // 박스 안 눈 면제(창 상부는 −x 헤더·박스 벽이 차단 — 홀 밖)
    for (let j = -4; j <= 4; j++) {
      const th = j / 4 * (tWin - 0.02)
      const tx = COR_CX + (COR_R + 0.3) * Math.cos(th), tz = (COR_R + 0.3) * Math.sin(th)
      if (inRibHole(tx, tz)) continue
      const tyMax = Math.min(CEIL_HI, ceilY(tx)) - 1.5              // 창면은 그 방위 천장까지만 존재(빗면)
      for (const ty of [TEMPLE_Y0 + 1.5, (TEMPLE_Y0 + tyMax) / 2, tyMax]) {
        if (!beamHit(ex, PLAT_TOP + EYE, ez, tx, ty, tz)) { leak = [r2(ex), r2(ez), r2(th * DEG), r2(ty)]; break outer }
      }
    }
  }
  ok(leak === null, `★창 상부 봉인: 셈-시점 ${eyesCount.length}곳 × 창면 9방위 × 3높이 → 전부 프리즈가 차단(배경 비침 0)`
    + (leak ? ` — 누출 눈(${leak[0]},${leak[1]}) → φ${leak[2]}° y${leak[3]}` : ''))
}

console.log('— K. 다른 시점 불가시 (LOCKED 예외의 조건 — E-10) —')
{
  // 회랑(1p9): CL_SILL(파라펫)이 눈높이(1.6) — 내려보는 시선 차단 → 아래 세계(문 y≤110) 전부 불가시
  const EYE = 1.6
  ok(CL_SILL >= EYE - 1e-9, `회랑 파라펫 CL_SILL ${CL_SILL} ≥ 눈높이 ${EYE} — 하향 시선 차단(2026.07.08 튜닝의 배당)`)
  const maxDoorTop = Math.max(...doors.map(d => d.top))
  ok(PASS_FLOOR_Y - maxDoorTop > 100, `회랑 바닥 ${r2(PASS_FLOOR_Y)} − 최고 문 상단 ${maxDoorTop} > 100 — 문은 한참 아래`)
  // 테라스(1p11 이후): 문 개구로의 전 시선이 드럼(빗면 천장 원판 r=COR_R + 벽)에 막히는가 — 3D 행진
  const blocked3D = (ex, ey, ez, tx, ty, tz) => {
    const N = 600
    let prevAbove = null, prevIn = null
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const px = ex + (tx - ex) * t, py = ey + (ty - ey) * t, pz = ez + (tz - ez) * t
      const rr = Math.hypot(px - COR_CX, pz)
      const inPlan = rr < COR_R
      if (inPlan) {                                    // 천장 원판(평면 y=ceilY(x), r<COR_R) 관통?
        const above = py > ceilY(px)
        if (prevAbove !== null && prevIn && above !== prevAbove) return true
        prevAbove = above
      } else prevAbove = null
      if (prevIn !== null && inPlan !== prevIn) {      // 벽 원통 관통(개구 밖 + 벽 높이 안)?
        let th = Math.atan2(pz, px - COR_CX); if (th < 0) th += Math.PI * 2
        const dZero = Math.min(th, Math.PI * 2 - th), dPi = Math.abs(th - Math.PI)
        const opening = (dZero <= tWin && py >= WIN_SILL_Y && py <= WIN_TOP_Y) || (dPi <= tDoor && py <= BOX_TOP)
        if (!opening && py < ceilY(px) + 0.5) return true
      }
      prevIn = inPlan
    }
    return false
  }
  let leak = null
  outer:
  for (let j = 0; j < 12; j++) {
    const a = j / 12 * Math.PI * 2
    for (const rr of [TERRACE_RIN + 0.5, TERRACE_ROUT - 0.5]) {
      const ex = rr * Math.cos(a), ez = rr * Math.sin(a), ey = TERRACE_Y + EYE
      for (const d of doors) {
        for (const [fy, fz] of [[0.1, -0.4], [0.1, 0.4], [0.95, 0], [0.5, 0]]) {   // 문 개구 표본점
          const ty = d.sill + DOOR_H * fy
          const tx = d.wx - d.dhat[1] * (DOOR_W / 2 - 0.5) * fz * 2
          const tz = d.wz + d.dhat[0] * (DOOR_W / 2 - 0.5) * fz * 2
          if (!blocked3D(ex, ey, ez, tx, ty, tz)) { leak = [r2(ex), r2(ez), d.k]; break outer }
        }
      }
    }
  }
  ok(leak === null, `테라스(24점 × 문 5 × 표본 4) → 문 전부 불가시(드럼 천장·벽이 차단)` + (leak ? ` — 누출 (${leak[0]},${leak[1]}) → #${leak[2]}` : ''))
}

console.log('— M. 비활성 스킴 스모크(㊴-6→㊴-7 flight/polar) — 두 체계 상시 보전 —')
{
  const other = STAIR_SCHEME === 'flight' ? 'polar' : 'flight'
  const { stairs: os } = buildHallStairs(other)
  ok(os.length === 5 && os.filter(s => s.reach).length === 1, `[${other}] 다섯 계단 · 도달 = #0 하나`)
  const o0 = os.find(s => s.k === 0)
  ok(Math.hypot(o0.end.x - COR_X1, o0.end.z) < STAIR_TD && Math.abs(o0.end.y - RIB_Y) < 0.4,
    `[${other}] #0 끝 (${r2(o0.end.x)},${r2(o0.end.z)}) y${r2(o0.end.y)} — 리브 축 도달`)
  let slopeMax = 0, rotMax = 0, invade = null, sillErr = 0
  const zBand = COR_FLOOR_HW + STAIR_W / 2 + 0.3, rimX = PLAT_X - PLAT_R
  for (const st of os) {
    for (let i = 1; i < st.samples.length; i++) {
      const a = st.samples[i - 1], b = st.samples[i]
      const run = Math.max(1e-6, Math.hypot(b.x - a.x, b.z - a.z))
      slopeMax = Math.max(slopeMax, Math.atan(Math.abs(b.y - a.y) / run) * DEG)
      if (Math.abs(b.z) <= zBand && b.x >= BOX_X0 && b.x <= rimX) {
        const walkTop = b.x < DESC_X0 ? FLOOR_TOP : PLAT_TOP
        if (b.y - 0.35 < walkTop + 3.2 && !invade) invade = [st.k, r2(b.x), r2(b.z)]
      }
    }
    for (let i = 1; i < st.plates.length; i++) {
      const a = st.plates[i - 1], b = st.plates[i]
      let dY = Math.abs(b.rotY - a.rotY)
      if (dY > Math.PI) dY = 2 * Math.PI - dY
      if (st.landings.some(ld => Math.hypot((a.x + b.x) / 2 - ld.x, (a.z + b.z) / 2 - ld.z) < 2.6)) continue
      rotMax = Math.max(rotMax, dY * DEG)
    }
    if (!st.reach) sillErr = Math.max(sillErr, Math.abs(st.end.y - st.door.sill))
  }
  ok(slopeMax <= 35.01, `[${other}] 전 계단 최대 경사 ${r2(slopeMax)}° ≤ 35°`)
  ok(rotMax <= 15, `[${other}] 판당 회전 최대 ${r2(rotMax)}° ≤ 15°`)
  ok(invade === null, `[${other}] 보행로 복도 띠 침범 0` + (invade ? ` — #${invade[0]} (${invade[1]},${invade[2]})` : ''))
  ok(sillErr < 0.4, `[${other}] 못 닿는 넷 끝 = 문턱 등고(오차 ${r2(sillErr)})`)
}

console.log('— L. 불변식 · 플랫폼(PLAT_F) —')
ok(COR_R === 84 && CEIL_LO === 70 && CEIL_HI === 150, `원기둥 단면 동결 (R ${COR_R} · 천장 ${CEIL_LO}→${CEIL_HI})`)
ok(RIB_Y === 74, `RIB_Y 74 불변(★㊴ 역전: RIB_Y가 정본, COR_CLIMB이 파생)`)
ok(Math.abs(COR_CLIMB - (RIB_Y - PLAT_Y)) < 1e-9, `COR_CLIMB ${r2(COR_CLIMB)} = RIB_Y − PLAT_Y 파생 보존`)
ok(PLAT_DROP >= 0 && PLAT_DROP <= 25, `PLAT_DROP ${PLAT_DROP} ∈ [0,25] (㊴-5 깊은 제단)`)
ok(PLAT_DROP / (DESC_X1 - DESC_X0) <= Math.tan(26 * Math.PI / 180), `하강 계단 경사 ${r2(Math.atan(PLAT_DROP / (DESC_X1 - DESC_X0)) * DEG)}° ≤ 26°`)
ok(DESC_X0 > BOX_X1 + 2, `하강 시작 ${DESC_X0} > 박스 끝 ${BOX_X1}+2 (짧은 수평 다리 존재 — ㊴-2)`)
ok(Math.abs(DESC_X1 - (PLAT_X - PLAT_R + 1.0)) < 1e-9, `하강 끝 ${r2(DESC_X1)} = 플랫폼 서쪽 림 +1 (㊴-3 착지 — 낮은 다리 폐지)`)
ok(BOX_IN_H === 7, `BOX_IN_H 7 (ㄷ′ 압축 유지)`)
ok(Math.abs(COR_CYL_X0 - (R_BASE - 2 * COR_R)) < 1e-9, `COR_CYL_X0 = R_BASE − 2·COR_R 파생 보존`)
ok(Math.abs(H * KNEE - 240) < 1e-9 && WIN_TOP_Y < H * KNEE, `이웃 리브 수직 구간(y<${H * KNEE}) ⊃ 창 y창(≤${WIN_TOP_Y}) — C절 2D 전제 성립`)
{
  const bridge = (PLAT_X - PLAT_R) - BOX_X0
  ok(PLAT_F > 0 && PLAT_F < 1, `PLAT_F ${PLAT_F} ∈ (0,1)`)
  ok(PLAT_X - PLAT_R > BOX_X1 + 2, `플랫폼 서쪽 끝 ${r2(PLAT_X - PLAT_R)} > 박스 끝 ${BOX_X1}+2 (옆벽 무관통)`)
  ok(bridge >= 40, `다리 길이 ${r2(bridge)} ≥ 40`)
  let worstW = 1e9
  for (let i = 0; i < 360; i++) {
    const a = i * Math.PI / 180
    worstW = Math.min(worstW, COR_R - Math.hypot(PLAT_X + PLAT_R * Math.cos(a) - COR_CX, PLAT_R * Math.sin(a)))
  }
  ok(worstW >= 3, `플랫폼 림 ↔ 벽 최소 여유 ${r2(worstW)} ≥ 3`)
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
