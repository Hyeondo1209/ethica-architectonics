// kneeStair.js — ★66 무릎길 계단 규격·참 (2026.07.25)
// ============================================================================
//  ★왜 갈아엎나(실측 진단 2026.07.25 — 현도 "계단으로 지나가기만 한다"):
//   ① **이건 계단이 아니었다.** 단높이 0.105 · 디딤 0.22 → 2R+G = **0.429**(석조 통례 0.60~0.66).
//      눈높이 1.6이 사람 키이므로 1단위 ≈ 1m — 즉 10cm 턱이 435개다. 발이 안 얹힌다 = 골판(corrugation).
//      ⚠원인은 코드 주석에 이미 있었다: `KW_GO=0.22`는 **나선끝 62°일 때** 단높이 0.41을 내려고 정한 값인데,
//       ③F·③G가 35°로 낮추면서 단높이가 0.14로 떨어졌는데도 KW_GO를 아무도 다시 유도하지 않았다.
//       = 폐기된 기하의 유산.
//   ② **참(landing)이 0개.** 435단 연속. ㊴에서 홀 계단을 곡선 리본 → `flight`(직선 + 참)로 갈아엎은 근거가
//      "거장 전례는 전부 직선 flight + 참"이었는데, 그 결정이 이 구간에는 적용된 적이 없다(구간이 더 오래됐다).
//   ③ **이미 극적인 단면이 안 읽힌다.** 관은 균일하지만 보행선이 계곡을 그려 **층고가 3배 변한다**
//      (나선끝 5.50 → 배 11.25 → 정션끝 3.85). 사건은 이미 있고, 몸이 등록할 눈금이 없을 뿐이다.
//   ⛔현도 판정(07.25): "④ 정리 배당·신규 사건은 필요 없다" — §5 "이미 표현된 것을 또 표현하지 않는다" 유지.
//      즉 이 구간은 **연결 조직으로 남되, 제대로 된 계단이 된다.** 더하지 않고 드러낸다.
//
//  ★★핵심 규칙 — **참 길이는 내가 정하지 않는다. 리브 곡선이 정한다.**
//   flight는 스파인(기존 KW_FLATTEN 블렌드)보다 가파르다. 그래서 flight를 오르면 보행면이 스파인 위로 뜨고,
//   **참은 "스파인이 따라잡는 데 걸리는 거리"**다.  L = x − spine⁻¹(현재 높이).
//   결과가 곧 건축이다: 스파인이 가파른 초입에서는 참이 짧고(혹은 없고), **완만한 배에서 참이 가장 길어진다.**
//   그런데 배는 층고가 11.25로 가장 높은 곳이다 → **가장 큰 참이 가장 넓은 곳에 저절로 놓인다.**
//   내가 배치한 게 아니라 리브의 기하가 배치한 것이다(§3 "걷기가 형태를 정한다"의 실질).
//
//  ★부수 효과 두 가지(둘 다 이득):
//   · 보행면이 스파인 **위로만** 뜬다 → 관 바닥 여유가 늘어난다(구 0.16 → 아래 실측). 관 이탈 위험 감소.
//   · 참 = 멈춰 서는 자리 = 나중에 비석(DoD-4 1p5~15)이 들어갈 자리.
//
//  ⚠40° 안팎의 가파른 flight + 넉넉한 참은 **잉카·월대 어휘와 같은 어법**이다(§2-D 4번 계승 규칙 충족).
//   완만한 계단 + 짧은 참이 아니라 그 반대가 이 프로젝트의 합격작 계보다.
// ============================================================================
import {
  rOf, uOfX, H, U_SPIRAL_END, U_KNEE_END, X_LAND_HI, KW_FLATTEN,
  KW_RISE, KW_SLOPE_DEG, KW_FLIGHT_N, KW_LAND_MIN, KW_TREAD_W,
  KW_ENTRY_ON, KW_ENTRY_L, KW_ENTRY_OUT, KW_ENTRY_Z0, KW_ENTRY_Z1, KW_ENTRY_W,   // ★67 도입 참
  SHELL_RIB_R, RIB_RADIAL_SEG, RIB_WALL_ON, RIB_WALL_T, KW_MIN_HALFW, KW_MIN_MARGIN, TREAD_THICK, KW_BODY_TOP,   // kneeHeadroom(층고)이 쓴다
} from './constants.js'

export const KNEE_XA = rOf(U_SPIRAL_END)      // 나선끝(출발 · x 큼 · 낮음)
export const KNEE_XB = X_LAND_HI              // 정션 판 +x변(도착 · x 작음 · 높음)
export const KNEE_YA = H * U_SPIRAL_END
export const KNEE_YB = H * U_KNEE_END
export const KNEE_RUN = KNEE_XA - KNEE_XB
export const KNEE_CLIMB = KNEE_YB - KNEE_YA

//  ── 계단이 실제로 시작하는 곳 = 도입 참을 지난 뒤 ──
//  주행을 실제로 먹는 것은 **안쪽 부분만**이다(바깥 KW_ENTRY_OUT는 나선 쪽 여분 공간을 쓴다)
export const KNEE_ENTRY_IN = KW_ENTRY_ON ? Math.max(0, KW_ENTRY_L - KW_ENTRY_OUT) : 0
export const KNEE_SX = KNEE_XA - KNEE_ENTRY_IN                    // 계단 출발 x(도입 참 안쪽 끝)

//  ── 스파인 = 보행선의 기준선(1-③F·③G에서 닫힌 블렌드 — **수식·양끝 모두 불변**) ──
//   0 = 리브 중심선 hug(가파름) · 1 = 곧은 현. KW_FLATTEN 0.84가 관 안에 남는 상한이다.
//  ⚠★67 시행착오 기록: 도입 참이 주행을 앞에서 잘라먹으니 **현의 양끝도 다시 잡으면 되겠다**고 보고
//   현을 (KNEE_SX, YA)→(XB, YB)로 바꿨더니, 같은 끝점을 더 짧은 수평으로 가느라 현이 중간에서 1.5 더
//   처졌고 **참 넷이 관 밖으로 나갔다**(축거리 5.97~6.45 > 내벽 5.50). 현은 관 안에 남기 위한 선이지
//   주행 구간의 함수가 아니다 → 원래대로 (KNEE_XA, YA)→(XB, YB)를 유지한다.
//  ★69 클램프 — 보행면이 관 바닥으로 내려가 폭을 잃는 것을 막는다(현도 제안 2026.07.25).
//   필요 반폭 W에서 허용 최대 축거리 d = √(R²−W²)가 나온다. 축은 기울어 있으므로 수직 환산에 secθ를 쓴다.
//   ⚠블렌드 식은 **그대로** 두고 하한만 건다 — ③F·③G에서 닫힌 결정을 최소로 건드리기 위해서다.
const _RIN = (RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R) * Math.cos(Math.PI / RIB_RADIAL_SEG)
const _DMAX = Math.sqrt(Math.max(0, _RIN * _RIN - KW_MIN_HALFW * KW_MIN_HALFW))
export function kneeSpineY(x) {
  const blend = (1 - KW_FLATTEN) * (H * uOfX(x))
              + KW_FLATTEN * (KNEE_YA + (KNEE_YB - KNEE_YA) * (KNEE_XA - x) / (KNEE_XA - KNEE_XB))
  const d = 0.05
  const th = Math.atan2(H * uOfX(x - d) - H * uOfX(x + d), 2 * d)      // 리브 축의 경사
  //  ⚠재는 면은 스파인이 아니라 **몸 상면**(디딤 밑면 + KW_BODY_TOP = 스파인보다 0.04 아래)이고,
  //   secθ 환산에도 오차가 있다. 그만큼 미리 들어 두지 않으면 실제 폭이 목표보다 0.11 모자란다(실측).
  const lowest = H * uOfX(x) - _DMAX / Math.cos(th) + (TREAD_THICK / 2 - KW_BODY_TOP) + KW_MIN_MARGIN
  return Math.max(blend, lowest)
}
//  스파인의 역함수 — "높이 y를 스파인이 달성하는 x". 단조(감소 x ↔ 증가 y)라 이분법이 안전하다.
export function kneeSpineX(y) {
  let lo = KNEE_XB, hi = KNEE_XA
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2
    if (kneeSpineY(m) < y) hi = m; else lo = m
  }
  return (lo + hi) / 2
}

//  ── 계단 뼈대 ──
//  R(단높이)은 **전 구간 고정**이다 — 다리가 배우는 것은 단높이이고, 이것만은 변하면 안 된다.
//  G(디딤 나비)는 **한 벌로 고정하되 전체가 정확히 닫히도록 이분법으로 푼다**(1-파라미터 해).
//  참은 위 규칙대로 파생. 참이 KW_LAND_MIN보다 짧으면 **참이 아니다** → 그 flight를 이어 붙인다
//  (초입 급구간에서 자동으로 "긴 첫 flight"가 나온다 — 신전 앞 긴 계단의 어법).
function buildRaw(G) {
  const N = Math.max(1, Math.round(KNEE_CLIMB / KW_RISE))
  const R = KNEE_CLIMB / N
  const flights = [], landings = []
  let x = KNEE_XA, y = KNEE_YA, used = 0
  //  ★67 도입 참 — 계단의 **첫 요소**다(구 착지 판넬의 자리). 나선에서 내려서는 곳이 곧 무릎길의 첫 참이고,
  //   회전이 여기서 일어난다. 스파인 추종 규칙의 예외 = 이 참만 길이가 **주어진다**(나선 도착을 받아야 하므로).
  //   ⚠이 참은 평평하므로 지나고 나면 보행면이 스파인보다 **아래**로 내려간다(초입 스파인이 32.6°로 급하다).
  //    거기는 관 여유가 5.43으로 전 구간 최대라 안전하고, 이어지는 38° flight가 곧 따라잡는다(T절이 잰다).
  if (KW_ENTRY_ON) { landings.push({ raw: KNEE_ENTRY_IN, entry: true }); x -= KNEE_ENTRY_IN }
  while (used < N) {
    const fx0 = x, fy0 = y
    let n = 0
    for (;;) {
      x -= G; y += R; n++; used++
      if (used >= N) break
      if (n % KW_FLIGHT_N !== 0) continue                 // flight 기본 단수를 아직 못 채움
      const L = x - kneeSpineX(y)                         // ★참 = 스파인이 따라잡는 거리
      if (L >= KW_LAND_MIN) { landings.push({ raw: L }); x -= L; break }   // ⚠참을 지난 만큼 x를 전진(빠뜨리면 다음 flight가 어긋난 자리에서 출발해 드리프트가 쌓인다)
      //  참이 못 서면(초입 급구간) 이 flight를 KW_FLIGHT_N만큼 더 올린다 → 자동으로 '긴 첫 flight'
    }
    flights.push({ x0: fx0, y0: fy0, n, R, G })

  }
  return { N, R, G, flights, landings }
}

//  ★해를 '푸는' 게 아니라 **경사를 고르고 참으로 닫는다**.
//   ⚠G에 대한 이분법은 못 쓴다 — G를 키우면 디딤이 x를 더 쓰지만 참은 짧아져 두 효과가 상쇄되고,
//    닫힘 방정식의 해가 **둘**이다(가파른 계단+긴 참 / 완만한 계단+짧은 참). 실제로 초기 구현이
//    완만한 쪽(28.9°·2R+G 0.723·flight 85단)으로 수렴했다. 경사는 건축적 결정이므로 노브로 정한다.
//   닫힘은 참 길이에 **공통 배율 k**를 걸어 맞춘다. 참의 '비율'(배에서 가장 길다)은 리브 곡선이 정한 그대로 남고,
//   k는 전체 크기만 정규화한다. ★k ≤ 1이어야 안전하다 — k>1이면 보행면이 스파인 **아래**로 내려가 관을 뚫는다.
let _spec = null
export function kneeStairSpec() {
  if (_spec) return _spec
  const G = KW_RISE / Math.tan(KW_SLOPE_DEG * Math.PI / 180)
  const raw = buildRaw(G)
  //  ★길이가 **주어진** 참은 배율 대상이 아니다 — 도입 참(나선 도착을 받아야 한다)과 강제 분할 참
  //   (KW_LAND_MIN 밑으로 내려가면 '참'이 아니게 된다). 따라잡기로 나온 참들만 k로 정규화한다.
  //   ⚠초판은 강제 참까지 k를 걸어 1.25가 나왔다(최소 1.40 미달 = 참이 아님). T절이 잡았을 자리다.
  const forced = raw.landings.filter(l => l.forced).length * KW_LAND_MIN
  const fixed = KNEE_ENTRY_IN + forced
  const needLand = KNEE_RUN - raw.N * G - fixed            // 따라잡기 참이 채워야 할 수평
  const rawLand = raw.landings.filter(l => !l.entry && !l.forced).reduce((a, b) => a + b.raw, 0)
  const k = rawLand > 0 ? needLand / rawLand : 1
  //  좌표를 다시 깐다 — flight는 (n·G, n·R), 참은 k·raw
  let x = KNEE_XA, y = KNEE_YA
  const flights = [], landings = []
  const entry = raw.landings[0]?.entry ? raw.landings.shift() : null
  if (entry) { landings.push({ x0: KNEE_SX, x1: KNEE_XA + KW_ENTRY_OUT, y, L: KW_ENTRY_L, entry: true,
                               z0: KW_ENTRY_Z0, z1: KW_ENTRY_Z1 }); x -= KNEE_ENTRY_IN }
  raw.flights.forEach((f, i) => {
    const x1 = x - f.n * G, y1 = y + f.n * f.R
    flights.push({ x0: x, y0: y, x1, y1, n: f.n, R: f.R, G })
    x = x1; y = y1
    const L = raw.landings[i]
    if (L) { const len = L.forced ? KW_LAND_MIN : L.raw * k
             landings.push({ x0: x - len, x1: x, y, L: len, forced: !!L.forced }); x -= len }
  })
  const s = { ...raw, flights, landings, k, endX: x, endY: y }
  s.blondel = 2 * s.R + G
  s.slopeDeg = Math.atan2(s.R, G) * 180 / Math.PI
  s.landTotal = landings.reduce((a, b) => a + b.L, 0)
  s.maxRisersPerFlight = Math.max(...flights.map(f => f.n))
  _spec = s
  return s
}

//  ── 보행면 높이(계단 = 참 수평 + flight 직선). 몸(★65)의 상면·검증·웨이포인트가 전부 이걸 소비한다 ──
export function kneeSurfaceY(x) {
  const s = kneeStairSpec()
  if (x >= KNEE_XA) return KNEE_YA
  if (x <= KNEE_XB) return KNEE_YB
  for (const L of s.landings) if (x <= L.x1 && x >= L.x0) return L.y
  for (const f of s.flights) if (x <= f.x0 && x >= f.x1)
    return f.y0 + (f.y1 - f.y0) * (f.x0 - x) / (f.x0 - f.x1)
  return kneeSpineY(x)
}

//  ── 디딤판 정본 — 렌더·검증·웨이포인트가 같은 배열을 쓴다(사본 금지) ──
//   디딤 깊이는 G보다 조금 크게(코) → 겹쳐서 틈이 안 생긴다. 구 어휘(1.2배) 계승하되 과하지 않게.
//  ⚠1.12 → 1.17(★68): 현도가 경사를 40°로 올리며 G가 0.226으로 줄어 디딤 실폭이 0.253 < 기준 0.26이 됐다.
//   경사·리듬은 현도 결정이므로 건드리지 않고 **코만 더 내밀어** 발 얹을 면을 회복한다(0.264).
//   실제 계단도 이렇게 한다 — 코의 돌출은 디딤 나비를 안 늘리고 발가락 자리를 준다.
export const KNEE_NOSE = 1.17
//  ★67-3 계단 폭 — 도입부에서 KW_ENTRY_W로 시작해 **첫 flight에 걸쳐** 제 폭(KW_TREAD_W)으로 수렴한다.
//   근거: 도입 참 반폭 4.0은 나선 도착(z 3.29)이 요구하는 최소치라 못 줄인다. 그러면 8폭 판과 2.0 계단을
//   잇는 방법은 계단 쪽을 넓히는 것뿐이다. 급전이(4배)가 현도 "투박하다"의 실체였다.
export function kneeTreadW(x) {
  const s = kneeStairSpec()
  const f0 = s.flights[0]
  if (!f0 || KW_ENTRY_W <= KW_TREAD_W) return KW_TREAD_W
  const t = Math.max(0, Math.min(1, (f0.x0 - x) / (f0.x0 - f0.x1)))
  const e = t * t * (3 - 2 * t)                      // smoothstep — 시작·끝에서 접선이 매끄럽다
  return KW_ENTRY_W + (KW_TREAD_W - KW_ENTRY_W) * e
}
export function kneeTreads() {
  const s = kneeStairSpec()
  const out = []
  for (const f of s.flights)
    for (let i = 1; i <= f.n; i++) {
      const x = f.x0 - (i - 0.5) * f.G
      out.push({ x, y: f.y0 + i * f.R, d: f.G * KNEE_NOSE, w: kneeTreadW(x) })
    }
  return out
}

//  ── 층고(관 마루까지) — "이미 있는 단면 사건"의 정본. 참을 어디에 놓을지의 근거이자 검증 대상 ──
export function kneeHeadroom(x) {
  const rIn = (RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R) * Math.cos(Math.PI / RIB_RADIAL_SEG)
  return rIn + (H * uOfX(x) - kneeSurfaceY(x))   // 중심선보다 아래로 뜬 만큼 층고가 늘어난다
}
