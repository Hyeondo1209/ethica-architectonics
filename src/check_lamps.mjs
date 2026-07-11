// check_lamps.mjs — 1p10 등불(CloisterLamps) 기하 의미 검증 (2026.07.11)
//  실행: node src/check_lamps.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import(번들 아님) — check_radial.mjs와 동일.
import {
  rOf, H, KNEE, WIDTH, SHELL_RIB_R, MERIDIANS, R_TOP,
  CL_R, CL_HW, CL_ROOF, CL_PHI0, CL_PHI1, ST_PHI, ST_HW, PASS_FLOOR_Y,
  LAMP_RIBS, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LAMP_TOP_Y,
  LAMP_MOUTH_Y, LAMP_FUNNEL_H, LAMP_MOUTH_R, LAMP_POOL_R,
} from './constants.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }

const floor = PASS_FLOOR_Y, roofTop = floor + CL_ROOF

// 리브 중심선(로컬 평면: 반경 r, 높이 y)까지 최단거리 — 프로파일 하반부 조밀 샘플
function distToCenterline(pr, py) {
  let best = 1e9
  for (let i = 0; i <= 6000; i++) {
    const u = (i / 6000) * 0.5
    const d = Math.hypot(rOf(u) - pr, H * u - py)
    if (d < best) best = d
  }
  return best
}

console.log('— A. 관↔리브 관계 (모든 리브 동형 → 리브 로컬 1회 검증) —')
// [1] 진입고 재도출: 수직선 r=LAMP_R이 리브 표면(거리=SHELL_RIB_R)을 처음 만나는 y
let yEntry = null
for (let y = roofTop; y < 400; y += 0.005) {
  if (distToCenterline(LAMP_R, y) <= SHELL_RIB_R) { yEntry = y; break }
}
ok(yEntry !== null && Math.abs(yEntry - LAMP_ENTRY_Y) < 0.15,
  `진입고 스캔 ${yEntry?.toFixed(2)} ≈ LAMP_ENTRY_Y(${LAMP_ENTRY_Y}) (오차<0.15)`)
// [2] 지붕 위 노출 구간 존재(테라스에서 보이는 '꽂힌 관')
ok(yEntry - roofTop > 3, `지붕(${roofTop.toFixed(2)}) 위 노출 ${(yEntry - roofTop).toFixed(2)} > 3`)
// [3] 진입 후 영구 잔류(보어 안) — 상단 캡까지 + 여유 30
let stays = true
for (let y = yEntry + 0.25; y < LAMP_TOP_Y + 30; y += 0.25)
  if (distToCenterline(LAMP_R, y) > SHELL_RIB_R) { stays = false; break }
ok(stays, `진입(${yEntry.toFixed(1)}) 후 관은 보어 내 잔류 (캡 ${LAMP_TOP_Y}+30까지)`)
// [4] 상단 캡이 진입고보다 위(= 캡 불가시 보장은 [3]과 함께 성립)
ok(LAMP_TOP_Y > yEntry + 1.0, `캡(${LAMP_TOP_Y}) > 진입고+1.0 — 표면 언저리 아님(관통이 분명히 읽힘)`)
// [5] 상부 수직부에서 관↔중심선 이격 = |LAMP_R − R_TOP| < 보어 반경 → 관이 보어를 벗어나지 않음의 해석적 근거
ok(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R < SHELL_RIB_R,
  `|LAMP_R−R_TOP|+관굵기 = ${(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R).toFixed(2)} < 보어 반경 ${SHELL_RIB_R}`)

console.log('— B. 대상 리브 선정 —')
// [6] LAMP_RIBS 각 φ가 회랑 호 안(= 지붕이 실제로 아래 있음)
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi > CL_PHI0 && phi < CL_PHI1,
    `#${k}(φ=${(phi * 180 / Math.PI).toFixed(1)}°)가 회랑 호(${(CL_PHI0 * 180 / Math.PI).toFixed(1)}~${(CL_PHI1 * 180 / Math.PI).toFixed(1)}°) 안`)
}
// [7] #0(탐험 리브) 제외 확인 — 1p8 보어 시야 보호
ok(!LAMP_RIBS.includes(0), '#0(탐험 리브) 제외 — 관이 보어 내 잔류하므로 1p8 전망 시야 오염 방지')
// [8] 관의 반경 위치가 회랑 폭 안(갓이 통로 위에 매달림)
ok(LAMP_R > CL_R - CL_HW && LAMP_R < CL_R + CL_HW, `LAMP_R(${LAMP_R})이 회랑 폭(${CL_R - CL_HW}~${CL_R + CL_HW}) 안`)

console.log('— C. 회랑 내부 치수 —')
const mouthBot = LAMP_MOUTH_Y                       // 바닥 기준
// [9] 보행 헤드룸: 갓 입 아래끝 ≥ 2.4 (눈 1.6 + 여유)
ok(mouthBot >= 2.4, `갓 입 높이 ${mouthBot} ≥ 2.4 (보행 헤드룸)`)
// [10] 갓 전체(입~목)가 천장(CL_ROOF) 아래
ok(mouthBot + LAMP_FUNNEL_H < CL_ROOF - 0.5, `갓 목(${(mouthBot + LAMP_FUNNEL_H).toFixed(1)}) < 천장 ${CL_ROOF}−0.5`)
// [11] 갓 입 지름이 통로 폭보다 훨씬 작음(사람 스케일 기구)
ok(2 * LAMP_MOUTH_R < 2 * CL_HW * 0.5, `갓 지름 ${(2 * LAMP_MOUTH_R).toFixed(2)} < 통로 폭 절반 ${(CL_HW).toFixed(1)}`)
// [12] 웅덩이가 통로 폭 안(벽에 안 걸침)
ok(LAMP_POOL_R < CL_HW, `웅덩이 반지름 ${LAMP_POOL_R} < 반폭 ${CL_HW}`)

console.log('— D. 스텁(1p11 진입) 무간섭 —')
// [13] 어떤 램프 φ도 스텁 입 각범위(ST_PHI ± ST_HW/rIn)와 겹치지 않음
const mPhi = ST_HW / (CL_R - CL_HW)
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi < ST_PHI - mPhi || phi > ST_PHI + mPhi,
    `#${k}(${(phi * 180 / Math.PI).toFixed(1)}°) ∉ 스텁 입(${((ST_PHI - mPhi) * 180 / Math.PI).toFixed(2)}~${((ST_PHI + mPhi) * 180 / Math.PI).toFixed(2)}°)`)
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
