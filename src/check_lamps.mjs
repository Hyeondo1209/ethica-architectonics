// check_lamps.mjs — 1p10 등불(CloisterLamps) 기하 의미 검증 (2026.07.11, v2: 두 체제 + 하강 램프)
//  실행: node src/check_lamps.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import(번들 아님) — check_radial.mjs와 동일.
//  v2: CL_ROOF 상향(관입 체제) 대응 — 지붕 위 노출 검사를 두 체제로, 리브 관입의 보행 무침범 신설,
//      하강 램프(Y0→Y1)·갓/관 비례(≥2.1) 검사 신설.
import {
  rOf, H, SHELL_RIB_R, MERIDIANS, R_TOP,
  CL_R, CL_HW, CL_ROOF, CL_SILL, CL_HEAD, CL_PHI0, CL_PHI1, ST_PHI, ST_HW, PASS_FLOOR_Y,
  LAMP_RIBS, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LAMP_TOP_Y,
  LAMP_MOUTH_Y0, LAMP_MOUTH_Y1, LAMP_FUNNEL_H, LAMP_MOUTH_R, LAMP_POOL_R,
} from './constants.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }

const floor = PASS_FLOOR_Y, roofTop = floor + CL_ROOF
const rIn = CL_R - CL_HW, rOut = CL_R + CL_HW

// 리브 중심선까지 최단거리 — 리브 로컬 평면(반경 r, 높이 y). 모든 리브 동형(LOCKED).
function distToCenterline(pr, py) {
  let best = 1e9
  for (let i = 0; i <= 6000; i++) {
    const u = (i / 6000) * 0.5
    const d = Math.hypot(rOf(u) - pr, H * u - py)
    if (d < best) best = d
  }
  return best
}
// 3D: 점(월드) → 리브 k 중심선 최단거리 (이웃 리브 검사용)
function dist3(px, py, pz, phiK) {
  let b = 1e9
  for (let i = 0; i <= 3000; i++) {
    const u = i / 3000 * 0.45
    const r = rOf(u), y = H * u
    const d = Math.hypot(px - r * Math.cos(phiK), py - y, pz - r * Math.sin(phiK))
    if (d < b) b = d
  }
  return b
}

console.log('— A. 관↔리브 관계 (리브 로컬 1회 검증) —')
// [1] 진입고 재도출
let yEntry = null
for (let y = Math.min(roofTop, LAMP_ENTRY_Y - 6); y < 400; y += 0.005) {
  if (distToCenterline(LAMP_R, y) <= SHELL_RIB_R) { yEntry = y; break }
}
ok(yEntry !== null && Math.abs(yEntry - LAMP_ENTRY_Y) < 0.15,
  `진입고 스캔 ${yEntry?.toFixed(2)} ≈ LAMP_ENTRY_Y(${LAMP_ENTRY_Y}) (오차<0.15)`)
// [2] ★두 체제: (a) 지붕 위 노출 체제(노출>3, 테라스 뷰) 또는 (b) 실내 진입 체제(지붕이 진입고보다 1.5+ 위)
const expo = LAMP_ENTRY_Y - roofTop
const regime = expo > 3 ? 'a(지붕 위 노출)' : (roofTop - LAMP_ENTRY_Y > 1.5 ? 'b(실내 진입)' : null)
ok(regime !== null, `체제 판정 = ${regime ?? '모호(노출 ' + expo.toFixed(1) + ' — 지붕고 재조정 필요)'} — 지붕 상면 ${roofTop.toFixed(2)}, 진입고 ${LAMP_ENTRY_Y}`)
// [3] 진입 후 영구 잔류(보어 안)
let stays = true
for (let y = yEntry + 0.25; y < LAMP_TOP_Y + 30; y += 0.25)
  if (distToCenterline(LAMP_R, y) > SHELL_RIB_R) { stays = false; break }
ok(stays, `진입(${yEntry.toFixed(1)}) 후 관은 보어 내 잔류 (캡 ${LAMP_TOP_Y}+30까지)`)
// [4] 캡이 진입고보다 충분히 위(관통이 분명히 읽힘 + 캡 불가시)
ok(LAMP_TOP_Y > yEntry + 1.0, `캡(${LAMP_TOP_Y}) > 진입고+1.0`)
// [5] 관이 보어를 벗어나지 않음(해석적 근거)
ok(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R < SHELL_RIB_R,
  `|LAMP_R−R_TOP|+관굵기 = ${(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R).toFixed(2)} < 보어 반경 ${SHELL_RIB_R}`)

console.log('— B. 관입 체제(현행 CL_ROOF=' + CL_ROOF + ') 보행·개구 안전 —')
// [6] 리브 밑면의 실내 최저 진입 y — 보행 헤드룸(바닥 위 ≥4.5) 확보
let yLow = 1e9
if (roofTop > 259) {  // 관입 체제에서만 의미
  for (const k of LAMP_RIBS) {
    const phiK = (k / MERIDIANS) * Math.PI * 2
    for (let y = 250; y < roofTop; y += 0.1) {
      let hit = false
      for (let r = rIn; r <= rOut + 0.01; r += 0.65)
        if (dist3(r * Math.cos(phiK), y, r * Math.sin(phiK), phiK) <= SHELL_RIB_R) { hit = true; break }
      if (hit) { if (y < yLow) yLow = y; break }
    }
  }
  ok(yLow - floor >= 4.5, `리브 실내 최저 진입 = 바닥 위 ${(yLow - floor).toFixed(1)} ≥ 4.5 (보행 무침범)`)
} else ok(true, '비관입 체제(지붕 ≤ 259) — 실내 진입 없음')
// [7] 개구 띠(SILL~HEAD) 리브 무접촉 — 1p9 누적 문법 보존
let openClean = true
for (const k of LAMP_RIBS) {
  const phiK = (k / MERIDIANS) * Math.PI * 2
  for (let y = floor + CL_SILL; y <= floor + CL_HEAD; y += 0.3)
    if (dist3(rOut * Math.cos(phiK), y, rOut * Math.sin(phiK), phiK) <= SHELL_RIB_R) { openClean = false; break }
}
ok(openClean, `개구 띠(${CL_SILL}~${CL_HEAD}) 리브 무접촉`)

console.log('— C. 대상 리브 선정 —')
// [8] LAMP_RIBS 각 φ가 회랑 호 안
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi > CL_PHI0 && phi < CL_PHI1,
    `#${k}(φ=${(phi * 180 / Math.PI).toFixed(1)}°)가 회랑 호(${(CL_PHI0 * 180 / Math.PI).toFixed(1)}~${(CL_PHI1 * 180 / Math.PI).toFixed(1)}°) 안`)
}
// [9] #0(탐험 리브) 제외 — 1p8 보어 시야 보호
ok(!LAMP_RIBS.includes(0), '#0(탐험 리브) 제외 — 보어 내 잔류 관이 1p8 전망 시야를 오염시키므로')
// [10] 관의 반경 위치가 회랑 폭 안
ok(LAMP_R > rIn && LAMP_R < rOut, `LAMP_R(${LAMP_R})이 회랑 폭(${rIn}~${rOut}) 안`)

console.log('— D. 하강 램프·갓 비례·회랑 내부 치수 —')
// [11] 하강 방향(걷는 방향으로 내려옴) + 마지막 등불 보행 헤드룸
ok(LAMP_MOUTH_Y0 >= LAMP_MOUTH_Y1, `하강 램프 Y0(${LAMP_MOUTH_Y0}) ≥ Y1(${LAMP_MOUTH_Y1})`)
ok(LAMP_MOUTH_Y1 >= 2.1, `마지막 갓 입 ${LAMP_MOUTH_Y1} ≥ 2.1 (머리 위 통과) — 몸 높이 하강은 별도 결정`)
// [13] 첫 등불(가장 높음)의 갓 목이 천장 아래 + 관 구간이 남아 있음(목 < 진입고)
ok(floor + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H < roofTop - 0.5, `첫 갓 목(${(LAMP_MOUTH_Y0 + LAMP_FUNNEL_H).toFixed(1)}) < 천장 ${CL_ROOF}−0.5`)
ok(floor + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H < LAMP_ENTRY_Y - 2, `첫 갓 목 < 진입고−2 (관이 잘려 보이지 않게)`)
// [15] 갓/관 비례: 깔때기로 읽히는 최소 비례
ok(LAMP_MOUTH_R >= 2.1 * LAMP_TUBE_R, `갓/관 비례 ${(LAMP_MOUTH_R / LAMP_TUBE_R).toFixed(2)} ≥ 2.1 (깔때기 성립)`)
// [16] 갓 지름이 통로에서 통행 시각 여유(≥0.8) 확보
ok(2 * LAMP_MOUTH_R <= 2 * CL_HW - 0.8, `갓 지름 ${(2 * LAMP_MOUTH_R).toFixed(2)} ≤ 통로 폭−0.8 (${(2 * CL_HW - 0.8).toFixed(1)})`)
// [17] 웅덩이가 통로 폭 안
ok(LAMP_POOL_R < CL_HW, `웅덩이 반지름 ${LAMP_POOL_R} < 반폭 ${CL_HW}`)

console.log('— E. 스텁(1p11 진입) 무간섭 —')
const mPhi = ST_HW / rIn
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi < ST_PHI - mPhi || phi > ST_PHI + mPhi,
    `#${k}(${(phi * 180 / Math.PI).toFixed(1)}°) ∉ 스텁 입(${((ST_PHI - mPhi) * 180 / Math.PI).toFixed(2)}~${((ST_PHI + mPhi) * 180 / Math.PI).toFixed(2)}°)`)
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
