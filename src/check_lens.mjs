// ── 정점 렌즈 검증(실모듈 import) — node src/check_lens.mjs ──
//  두 체제 자동 판정: LENS_Y ≤ H(샤프트 내 부양 — 보어 자동 안전) / LENS_Y > H(개구 위 — 시야콘 검사).
import fs from 'node:fs'
import {
  MERIDIANS, R_TOP, SHELL_RIB_R, H, SCALE, KNEE,
  TERRACE_Y, TERRACE_RIN, TERRACE_ROUT,
  LENS_R, LENS_Y, LENS_T, LENS_FACETS, LENS_IRREG, LENS_SEED,
  RIB_TINT_Y0, RIB_TINT_Y1, RIB_TINT_AMT, RIB_TINT_EMIS,
  LAMP_TOP_Y,
} from './constants.js'
import { buildLensGeometry } from './lensGeometry.js'

let n = 0
const ok = (cond, msg) => { n++; if (!cond) { console.error(`✗ [${n}] ${msg}`); process.exit(1) } console.log(`✓ [${n}] ${msg}`) }
const EPS = 1e-4

// ── 배치·정렬 ──
ok(LENS_FACETS === MERIDIANS, `패싯 1:1 — LENS_FACETS(${LENS_FACETS}) = MERIDIANS(${MERIDIANS})`)
const CLEAR_R = R_TOP - SHELL_RIB_R                       // 개구 내경(리브 안쪽면) = 162
const maxJitterR = LENS_R * (1 + LENS_IRREG * 0.10)
ok(maxJitterR + 2 < CLEAR_R, `물리 비침투(지터 상한 포함) — maxR ${maxJitterR.toFixed(1)}+2 < 개구 내경 ${CLEAR_R}`)
ok(TERRACE_ROUT < CLEAR_R, `테라스 완전 노출 — 외연 ${TERRACE_ROUT} < 개구 내경 ${CLEAR_R} (시선이 관벽 반경에 안 듦)`)

// ── 보어(1p8) 체제 판정 ──
if (LENS_Y <= H) {
  console.log(`  체제 = 샤프트 내 부양(LENS_Y ${LENS_Y} ≤ H ${H}) — 불투명 관벽이 가림, 보어 자동 안전`)
  ok(true, '보어(1p8) 불가시 — 샤프트 내 체제 자동 성립')
} else {
  const boreLen = H - 270                                  // 전망 눈높이(≈270) → 관 상단
  const coneHalf = Math.atan((2 * SHELL_RIB_R) / boreLen)  // 관 시야콘 반각(보수적)
  const edgeAng = Math.atan((R_TOP - maxJitterR) / (LENS_Y - 270))
  ok(edgeAng > coneHalf, `보어 불가시(개구 위 체제) — 렌즈연 ${( edgeAng*180/Math.PI).toFixed(2)}° > 콘 ${(coneHalf*180/Math.PI).toFixed(2)}°`)
}

// ── fog·간격 ──
const FOG_FAR = 150 * SCALE                                // App.jsx fog args와 동기(변경 시 여기도)
const eyeY = TERRACE_Y + 1.6
const dist = Math.hypot(LENS_Y - eyeY, TERRACE_RIN)
ok(dist < FOG_FAR, `fog 가시 — 테라스→렌즈 거리 ${dist.toFixed(0)} < far ${FOG_FAR} (y960이면 ≈710로 전소멸이던 것)`)
ok(LENS_Y - LENS_T * (1 + LENS_IRREG * 0.2) > TERRACE_Y + 30, `테라스 상공 간극 — 렌즈 하단 > 테라스 +30`)
ok(LENS_Y - LENS_T > LAMP_TOP_Y + 20, `등불 무간섭 — 렌즈 하단 ${(LENS_Y-LENS_T)} > 등불 관 상단 ${LAMP_TOP_Y}+20`)

// ── 기하 ──
const g1 = buildLensGeometry()
const p1 = g1.getAttribute('position').array
ok(p1.length === LENS_FACETS * 6 * 9, `삼각형 수 — ${LENS_FACETS}×6 = ${p1.length / 9} tri`)
ok([...p1].every(Number.isFinite), 'NaN·Inf 없음(전 정점)')
let maxR = 0
for (let i = 0; i < p1.length; i += 3) maxR = Math.max(maxR, Math.hypot(p1[i], p1[i + 2]))
ok(maxR + 2 < CLEAR_R, `실기하 최대반경 ${maxR.toFixed(1)}+2 < 개구 내경 ${CLEAR_R}`)
const nrm = g1.getAttribute('normal')
ok(nrm && [...nrm.array].every(Number.isFinite), '플랫 노멀 존재·유한')

// 결정론 + 시드 유효
const g2 = buildLensGeometry()
const p2 = g2.getAttribute('position').array
ok(p1.length === p2.length && p1.every((v, i) => v === p2[i]), '결정론 — 같은 시드 = 동일 원석(바이트 일치)')
const g3 = buildLensGeometry({ seed: LENS_SEED + 1 })
const p3 = g3.getAttribute('position').array
ok(p3.some((v, i) => Math.abs(v - p1[i]) > EPS), '시드 유효 — 다른 시드 = 다른 원석')

// IRREG=0 → 완전 대칭(정규 세공 모드 무결)
const g0 = buildLensGeometry({ irreg: 0 })
const p0 = g0.getAttribute('position').array
let sym = true
for (let i = 0; i < p0.length; i += 3) {
  const r = Math.hypot(p0[i], p0[i + 2]), y = p0[i + 1]
  const isRim = Math.abs(r - LENS_R) < EPS, isMid = Math.abs(r - LENS_R * 0.55) < EPS, isApex = r < EPS
  if (!(isRim || isMid || isApex)) { sym = false; break }
  if (isRim && Math.abs(y) > EPS) { sym = false; break }
}
ok(sym, 'IRREG=0 대칭 — 림 y=0·반경 3계층 정확(정규 모드 복원 보장)')

// 패싯↔리브 방위각 1:1 — 경계각 = (k−0.5)·Δ 정확(지터는 r·y만, θ 불변이 정렬의 증명)
const d = 2 * Math.PI / LENS_FACETS
let alignOK = true
for (let i = 0; i < p1.length; i += 3) {
  const r = Math.hypot(p1[i], p1[i + 2])
  if (r < 1) continue                                      // 정점(apex) 제외
  const a = Math.atan2(p1[i + 2], p1[i])
  const rel = ((a + 0.5 * d) % d + d) % d                  // 경계각 격자로부터의 편차
  if (Math.min(rel, d - rel) > 1e-5) { alignOK = false; break }
}
ok(alignOK, `방위각 정렬 — 전 경계정점이 (k−0.5)·${(d*180/Math.PI).toFixed(1)}° 격자 위(패싯 k 중심 = 리브 k)`)

// watertight — 고유 정점 수 = 3F+2(림 F + 상중 F + 하중 F + 정점 2), 경계 공유 증명
const uniq = new Set()
for (let i = 0; i < p1.length; i += 3) uniq.add(`${p1[i]},${p1[i + 1]},${p1[i + 2]}`)
ok(uniq.size === 3 * LENS_FACETS + 2, `watertight — 고유 정점 ${uniq.size} = 3F+2(경계 공유)`)

// ── 리브 그라데이션 결합 ──
ok(RIB_TINT_Y0 < RIB_TINT_Y1, `그라데이션 방향 — Y0 ${RIB_TINT_Y0} < Y1 ${RIB_TINT_Y1}`)
ok(Math.abs(RIB_TINT_Y1 - LENS_Y) < EPS, `LENS_Y 연동 — Y1 = LENS_Y(렌즈 옮기면 만개점 자동 추종)`)
ok(RIB_TINT_Y0 > H * KNEE + 40, `무릎 아래 순수 석재 — Y0 ${RIB_TINT_Y0} > 무릎 ${H * KNEE}+40 (여정 하부·회랑 하부 불침범)`)
ok(RIB_TINT_AMT >= 0 && RIB_TINT_AMT <= 1 && RIB_TINT_EMIS >= 0 && RIB_TINT_EMIS <= 1, 'AMT·EMIS ∈ [0,1]')

// ── 재질 모드(투명도) ──
const { LENS_MODE, LENS_TRANSMIT, LENS_IOR, LENS_OPACITY } = await import('./constants.js')
ok(['glass', 'alpha', 'solid'].includes(LENS_MODE), `재질 모드 유효 — '${LENS_MODE}'`)
ok(LENS_TRANSMIT >= 0 && LENS_TRANSMIT <= 1 && LENS_OPACITY > 0 && LENS_OPACITY <= 1 && LENS_IOR >= 1 && LENS_IOR <= 2.5, '투과·불투명·IOR 범위 유효')

// ── 배선(파일) ──
const app = fs.readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
ok(app.includes('<ApexLens />') && !app.includes('<Apex />'), 'App 마운트 — ApexLens 교체(Apex 마운트 제거)')
const dome = fs.readFileSync(new URL('./Dome.jsx', import.meta.url), 'utf8')
ok((dome.match(/ribTintOBC/g) || []).length >= 3, 'Dome 패치 — ribTintOBC 정의 + 두 리브 재질 연결')
ok(dome.includes('export function Apex'), 'Apex 컴포넌트 보존(복원 = 마운트 한 줄)')

console.log(`\n전체 ${n}항 통과 ✅  (체제: ${LENS_Y <= H ? '샤프트 내 부양' : '개구 위'} · IRREG ${LENS_IRREG} · 시드 ${LENS_SEED})`)
