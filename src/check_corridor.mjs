// check_corridor.mjs — 통로 1p5 재설계(슬릿 '하나의 프레임' + 박스 ㄷ′ 압축) 검증 (2026.07.13 신설)
//  실행: node src/check_corridor.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import — check_radial.mjs와 동일.
//
//  ★C절 광학이 2D 평면(plan)으로 정확한 이유: 슬릿 y창(0~150)에서 이웃 리브는 무릎(u=KNEE → y=H·0.25=240)
//  훨씬 아래 = 수직 원기둥이고, 원기둥 벽·리빌 잼도 전부 z축 압출체(y 무관 단면) → 가시성은 y에 독립.
//  또한 리브 #0 자신의 차폐는 무시(시선이 #0 몸통을 관통한다고 가정) = 보수적(실제보다 엄격).
import {
  COR_R, COR_CX, COR_WALL_SEG, COR_Y0, COR_THICK, CEIL_LO, CEIL_HI, ceilY,
  SLIT_ZHW, SLIT_HALF, SLIT_JAMB_D, SLIT_SILL_Y, SLIT_TOP_Y,
  BOX_IN_H, BOX_TOP, BOX_X0, BOX_X1, BOX_HW, DOOR_HALF,
  RAD_TOP, RAD_DOOR_H,
  PLAT_X, PLAT_R, PLAT_F, COR_FLOOR_HW, COR_X1, COR_CYL_X0, COR_CLIMB, COR_STEPS, RIB_Y,
  R_BASE, MERIDIANS, SHELL_RIB_R, DOOR_W, KNEE, H,
  corWallR, PIER_B, PIER_T0, PIER_T1, PIER_CLEAR,
} from './constants.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const r2 = (v) => Math.round(v * 100) / 100

// 공유 파생값 — Corridor.jsx wallGeo와 '같은 식'(격자 스냅)
const segW = Math.PI * 2 / COR_WALL_SEG
const tEdge = Math.floor(SLIT_HALF / segW + 0.5) * segW          // 슬릿 실모서리 각
const zE = COR_R * Math.sin(tEdge)                               // 실개구 z반폭 ≈10.96
const xE = COR_CX + COR_R * Math.cos(tEdge)                      // 잼 시작 x ≈287.28
const tDoor = Math.floor(DOOR_HALF / segW + 0.5) * segW          // −x 문 트임 실모서리 각
const FLOOR_TOP = COR_Y0 + COR_THICK / 2                         // 다리 상면 ≈49.3
const DTOP = FLOOR_TOP + RAD_DOOR_H                              // 접합문 상단 ≈53.3
const GAP = 2 * Math.PI * R_BASE / MERIDIANS                     // 리브 밑동 간격 ≈25.1

console.log('— A. 박스 ㄷ′ 압축 (내부고·헤더·해방) —')
ok(Math.abs(BOX_TOP - (FLOOR_TOP + BOX_IN_H)) < 1e-9, `BOX_TOP(${r2(BOX_TOP)}) = 다리 상면(${r2(FLOOR_TOP)}) + 내부고(${BOX_IN_H})`)
ok(BOX_IN_H >= 5.2 && BOX_IN_H <= 9, `내부고 ${BOX_IN_H} ∈ [5.2, 9] (압축 성립 구간)`)
ok(BOX_TOP - DTOP >= 1.5, `접합문 헤더 ${r2(BOX_TOP - DTOP)} ≥ 1.5 (문 상단 ${r2(DTOP)} 위 여유)`)
ok(BOX_TOP - RAD_TOP >= 1.5, `고리 지붕(${RAD_TOP}) 위 여유 ${r2(BOX_TOP - RAD_TOP)} ≥ 1.5 (check_radial 불변식 강화판)`)
ok(BOX_TOP < CEIL_LO, `BOX_TOP(${r2(BOX_TOP)}) < CEIL_LO(${CEIL_LO}) — 진입 낙차 존재`)
ok(ceilY(BOX_X1) - BOX_TOP >= 12, `진입 순간 해방 ${r2(ceilY(BOX_X1) - BOX_TOP)} ≥ 12 (박스 끝 x=${BOX_X1}의 천장 ${r2(ceilY(BOX_X1))})`)
ok(CEIL_HI - BOX_TOP >= 90, `최대 해방 ${r2(CEIL_HI - BOX_TOP)} ≥ 90 (압축 ${BOX_IN_H} → 정점 ${CEIL_HI - FLOOR_TOP < 1e9 ? r2(CEIL_HI - FLOOR_TOP) : ''})`)

console.log('— B. 헤더 봉인 (−x 개구의 BOX_TOP 위) —')
// 문 트임 구간의 천장이 BOX_TOP보다 높다 = 봉인 안 하면 구멍(따라서 wallGeo가 헤더 쿼드를 그려야 하는 조건).
//  Corridor.jsx가 같은 조건 분기에서 quad(…BOX_TOP…yb)를 방출 — 여기서는 '구멍의 존재 조건'과 높이를 못박는다.
{
  const xDoorEdge = COR_CX + COR_R * Math.cos(Math.PI - tDoor)
  ok(ceilY(xDoorEdge) > BOX_TOP + 5, `문 트임 모서리 천장 ${r2(ceilY(xDoorEdge))} > BOX_TOP+5 — 헤더 없으면 스포 구멍(봉인 필수 확인)`)
  ok(tDoor > 0, `−x 문 트임 존재 (${r2(tDoor * 180 / Math.PI)}° — 0이면 박스↔원기둥 단절)`)
  // ⚠구판은 '+0.6' 허용 오차였으나 방향이 틀렸음: 트임이 박스보다 넓으면 그 초과분이 곧 박스 옆벽 바깥으로
  //  뚫린 슬롯(스포 누출)이다. 트임은 벽 격자(COR_WALL_SEG)에 양자화되므로 BOX_HW 튜닝 시 이 검사가 하한을 정한다.
  ok(COR_R * Math.sin(tDoor) <= BOX_HW + 1e-9, `문 트임 z반폭 ${r2(COR_R * Math.sin(tDoor))} ≤ 박스 반폭 ${BOX_HW} — 박스 옆벽이 트임을 덮음(초과 시 슬롯 누출)`)
  ok(COR_R * Math.sin(tDoor) >= COR_FLOOR_HW + 0.4, `문 트임 z반폭 ${r2(COR_R * Math.sin(tDoor))} ≥ 다리 반폭 ${COR_FLOOR_HW}+0.4 — 다리가 문을 통과`)
  ok(BOX_X1 > COR_CX - Math.sqrt(COR_R * COR_R - BOX_HW * BOX_HW) + 1, `박스 물림 확인: 천장 슬랩(→${BOX_X1})이 벽 교선을 1+ 관통 = 헤더 밑선 봉합`)
}

console.log('— C. 슬릿 광학 밀폐 (평면 스캔: 이웃 ±1·±2·±3 불가시 + #0 가시) —')
// 시선 판정: eye→표적 선분을 잘게 행진하며 (a) 실제 벽면(corWallR 프로파일 — 피어 포함)을 개구
//  (슬릿|문 트임) 밖에서 넘으면 차단, (b) 리빌 잼 평면(z=±zE, x∈[xE, xE+D])을 넘어도 차단.
//  ⚠원 교차 해석해 대신 행진을 쓰는 이유: 피어 대역에서 벽이 r<COR_R라 원 검사는 '벽 뒤 포켓' 표적을 놓침.
function passes(ex, ez, tx, tz) {
  const dx = tx - ex, dz = tz - ez
  const L = Math.hypot(dx, dz), N = Math.max(60, Math.ceil(L / 0.25))
  let prevIn = null
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const px = ex + t * dx, pz = ez + t * dz
    let th = Math.atan2(pz, px - COR_CX); if (th < 0) th += Math.PI * 2
    const rp = Math.hypot(px - COR_CX, pz)
    const inside = rp < corWallR(th)                                 // 벽면 안쪽?
    if (prevIn !== null && inside !== prevIn) {                      // 벽면을 넘는 순간
      const dZero = Math.min(th, Math.PI * 2 - th), dPi = Math.abs(th - Math.PI)
      if (dZero > tEdge + 1e-9 && dPi > tDoor + 1e-9) return false   // 개구 밖 = 벽 몸통에 막힘
    }
    prevIn = inside
  }
  // (b) 리빌 잼
  for (const s of [1, -1]) {
    if (Math.abs(dz) < 1e-12) continue
    const t = (s * zE - ez) / dz
    if (t > 1e-9 && t < 1 - 1e-9) {
      const px = ex + t * dx
      if (px >= xE - 1e-9 && px <= xE + SLIT_JAMB_D + 1e-9) return false
    }
  }
  return true
}
// 눈 표본: 다리(박스 안 포함) + 플랫폼(림 전체 — 걷기 가능 최대 z=±PLAT_R) + 계단(문 앞까지)
const eyes = []
for (let x = BOX_X0 + 2; x <= PLAT_X - PLAT_R; x += 4) for (const z of [-COR_FLOOR_HW, 0, COR_FLOOR_HW]) eyes.push([x, z])
for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; eyes.push([PLAT_X + (PLAT_R - 0.3) * Math.cos(a), (PLAT_R - 0.3) * Math.sin(a)]) }
eyes.push([PLAT_X, 0])
for (let x = PLAT_X + PLAT_R; x <= COR_X1 - 0.5; x += 2) for (const z of [-COR_FLOOR_HW, 0, COR_FLOOR_HW]) eyes.push([x, z])
// 표적: 이웃 리브 k의 밑동 원(경계 48점 + 중심) — 하나라도 보이면 실패
function ribVisible(k) {
  const phi = k * Math.PI * 2 / MERIDIANS
  const cx = R_BASE * Math.cos(phi), cz = R_BASE * Math.sin(phi)
  for (const [ex, ez] of eyes) {
    if (passes(ex, ez, cx, cz)) return [ex, ez, 'center']
    for (let j = 0; j < 48; j++) {
      const a = j / 48 * Math.PI * 2
      if (passes(ex, ez, cx + SHELL_RIB_R * Math.cos(a), cz + SHELL_RIB_R * Math.sin(a))) return [ex, ez, j]
    }
  }
  return null
}
for (const k of [1, -1, 2, -2, 3, -3]) {
  const leak = ribVisible(k)
  ok(leak === null, `이웃 리브 ${k > 0 ? '+' : ''}${k} 밀폐 (눈 ${eyes.length}곳 × 표적 49점)` + (leak ? ` — 누출: 눈(${r2(leak[0])},${r2(leak[1])})` : ''))
}
ok(passes(PLAT_X, 0, R_BASE, 0), `#0 가시(플랫폼 중심 → 리브 #0 축)`)
ok(passes(BOX_X0 + 2, 0, R_BASE, 0), `#0 가시(박스 깊숙이 → 리브 #0 축 — 압축관 끝의 텔로스)`)
ok(passes((PLAT_X + PLAT_R + COR_X1) / 2, 0, R_BASE, 0), `#0 가시(계단 중간 → 리브 #0 축)`)

console.log('— D. 슬릿 프레이밍·통행 —')
ok(zE >= SLIT_ZHW, `실개구 z반폭 ${r2(zE)} ≥ 노브 ${SLIT_ZHW} (격자 스냅은 넓히는 방향만)`)
ok(zE - SHELL_RIB_R >= 3, `하늘 띠 ${r2(zE - SHELL_RIB_R)} ≥ 3 (리브 실루엣 양옆 여백 = '프레임'이 읽힘)`)
ok(zE <= R_BASE * Math.sin(Math.PI * 2 / MERIDIANS) - SHELL_RIB_R - 2, `실개구 ${r2(zE)} ≤ 이웃 안모서리−2(${r2(GAP - SHELL_RIB_R - 2)}) — 정면각에서 '하나'`)
ok(COR_FLOOR_HW + 1 <= zE, `계단 반폭 ${COR_FLOOR_HW}+1 ≤ 개구 ${r2(zE)} (계단이 슬릿을 관통해 문에 닿음)`)
ok(DOOR_W / 2 + 1 <= zE, `문 반폭 ${DOOR_W / 2}+1 ≤ 개구 ${r2(zE)} (문이 개구 안)`)
ok(SLIT_JAMB_D >= 4, `잼 깊이 ${SLIT_JAMB_D} ≥ 4 (스침각 분석 하한 ≈4.2 — C절 스캔이 실증)`)
ok(SLIT_SILL_Y === 0 && SLIT_TOP_Y === CEIL_HI, `sill 0 · top ${SLIT_TOP_Y} = CEIL_HI (리브 전고 프레임)`)
ok(SLIT_ZHW >= COR_R * Math.sin(segW / 2) + 0.5, `노브 하한: SLIT_ZHW ${SLIT_ZHW} ≥ 반세그(${r2(COR_R * Math.sin(segW / 2))})+0.5 — 개구 소멸 방지`)

console.log('— F. 슬릿 양옆 피어(벽 스웰) —')
ok(PIER_T0 > tEdge + 0.5 * Math.PI / 180, `피어 대역 시작 ${r2(PIER_T0 * 180 / Math.PI)}° > 슬릿 모서리 ${r2(tEdge * 180 / Math.PI)}°+0.5° (개구 무침범)`)
ok(PIER_B > 0 && PIER_B < 10, `피어 깊이 ${r2(PIER_B)} ∈ (0, 10) — 관통 3.4 + 여유 ${PIER_CLEAR}`)
{ // 벽면↔이웃 리브 표면 최소 거리(±1: 피어가 감춤 / ±2: 맨벽으로 충분) — 관입 재발 방지
  const clr = (k) => {
    const phi = k * Math.PI * 2 / MERIDIANS
    const cx = R_BASE * Math.cos(phi), cz = R_BASE * Math.sin(phi)
    let m = 1e9
    for (let i = 0; i <= 2000; i++) {
      const t = i / 2000 * Math.PI * 2
      const r = corWallR(t)
      m = Math.min(m, Math.hypot(COR_CX + r * Math.cos(t) - cx, r * Math.sin(t) - cz) - SHELL_RIB_R)
    }
    return m
  }
  ok(clr(1) >= 1 && clr(-1) >= 1, `벽면↔리브 ±1 표면 여유 ${r2(Math.min(clr(1), clr(-1)))} ≥ 1 (구 −3.4 관입의 해소)`)
  ok(clr(2) >= 0.5 && clr(-2) >= 0.5, `벽면↔리브 ±2 표면 여유 ${r2(Math.min(clr(2), clr(-2)))} ≥ 0.5 (맨벽 무관입)`)
}
{ // 피어 안쪽 돌출이 보행로에 안 닿음
  let minZ = 1e9
  for (let i = 0; i <= 400; i++) {
    const t = PIER_T0 + (PIER_T1 - PIER_T0) * i / 400
    minZ = Math.min(minZ, corWallR(t) * Math.sin(t))
  }
  ok(minZ > COR_FLOOR_HW + 3, `피어 안면 최소 z ${r2(minZ)} > 계단 반폭 ${COR_FLOOR_HW}+3 (보행 무침범)`)
}

console.log('— G. 플랫폼 위치(PLAT_F 노브) —')
{
  const run = COR_X1 - (PLAT_X + PLAT_R)              // 계단 수평길이
  const slope = COR_CLIMB / run                        // 총상승 25는 RIB_Y 불변식으로 동결 → 경사는 오직 이 길이가 결정
  const bridge = (PLAT_X - PLAT_R) - BOX_X0            // 다리 길이(박스 안 구간 포함)
  ok(PLAT_F > 0 && PLAT_F < 1, `PLAT_F ${PLAT_F} ∈ (0,1) — 홀 안(진입 ${COR_CYL_X0} ~ 리브 ${COR_X1})`)
  ok(PLAT_X - PLAT_R > BOX_X1 + 2, `플랫폼 서쪽 끝 ${r2(PLAT_X - PLAT_R)} > 박스 끝 ${BOX_X1}+2 — 원판이 박스 옆벽을 안 뚫음`)
  ok(slope <= 0.7, `계단 경사 ${r2(slope)} = ${r2(Math.atan(slope) * 180 / Math.PI)}° ≤ 35° (상한 — 수평길이 ${r2(run)}, 칸 ${COR_STEPS})`)
  ok(bridge >= 40, `다리 길이 ${r2(bridge)} ≥ 40 (진입 접근 확보)`)
  let worst = 1e9                                      // 플랫폼 림 ↔ 실벽(피어 포함) 여유
  for (let i = 0; i < 360; i++) {
    const a = i * Math.PI / 180
    const px = PLAT_X + PLAT_R * Math.cos(a), pz = PLAT_R * Math.sin(a)
    worst = Math.min(worst, corWallR(Math.atan2(pz, px - COR_CX)) - Math.hypot(px - COR_CX, pz))
  }
  ok(worst >= 3, `플랫폼 림 ↔ 실벽 최소 여유 ${r2(worst)} ≥ 3 (피어 대역 포함)`)
}

console.log('— E. 단면 동결·불변식 보존 —')
ok(COR_R === 84 && CEIL_LO === 70 && CEIL_HI === 150, `원기둥 단면 동결 무접촉 (R ${COR_R} · 천장 ${CEIL_LO}→${CEIL_HI})`)
ok(RIB_Y === 74, `RIB_Y 74 불변(문 높이 불변식)`)
ok(Math.abs(H * KNEE - 240) < 1e-9 && SLIT_TOP_Y < H * KNEE, `이웃 리브 수직 구간(y<${H * KNEE}) ⊃ 슬릿 y창(≤${SLIT_TOP_Y}) — C절 2D 전제 성립`)

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
