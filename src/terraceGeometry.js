// ════════════════════════════════════════════════════════════════════════════
//  terraceGeometry.js — 테라스(1p12~15의 집)의 기하 정본
//   ★85 (2026.07.29) 환형 부채꼴 슬래브  →  ★89 (2026.07.30) **계단화**(현도 지시)
// ════════════════════════════════════════════════════════════════════════════
//  좌표계 = **상부 여정 그룹 로컬**(App `<group rotation-y={-RIB_DEST_PHI}>` 안). 월드 = 로컬 +10°.
//
//  형태(★89) = 리브 #0(월드 0°)을 최저점으로 하는 **대칭 골짜기**. 다섯 구간:
//   ① 아가리 접합부(수평 유지) → ② 하강 계단 → ③ 참(최저점) → ④⑤ ②①의 거울
//   · 각 단은 **환형 부채꼴 한 장**(반경 폭 전체) — 호 방향으로만 내려가고 반경 방향 단차는 없다
//     (현도: "계단들은 전부 기존 테라스의 곡선을 유지하며 내려간다")
//   · 밑면 = `TR_SOFFIT` 두 어법 — **'saw'** 톱니(두께 균일) ↔ **'ramp'** 경사 매스(현행 · 현도 2026.07.30)
//     'ramp' 기준선 = **노징선 − T**(두께 위계를 지키는 유일한 선 — 근거는 constants ★89 블록)
//   · `TR_STEP_ON=false`면 ★85 평판 부채꼴로 되돌아온다(구세계 전량 보존)
//  수치·근거·유도는 전부 constants.js ★85·★89 블록에 있다. 여기는 그리기만 한다.
//
//  ⚠법선은 **명시**한다(computeVertexNormals 금지 — ★57 '각진 연필' 전례).
//   윗·밑면 = ±y · 두 림 = 반경 · 챌판/톱니·끝캡 = 그 방위의 접선.
//   즉 **모서리에서 각지고, 스윕 방향으로만 매끄럽다**(exitFlareGeometry와 같은 규칙).
//
//  ⚠**톱니 밑면의 watertight 조건**(★89에서 실제로 걸린 것): 두께가 챌판보다 크므로(1.5 > 0.417)
//   챌판 방위에서 이웃 두 단의 림 y범위가 **겹친다**. 림을 한 장 사각형으로 내면 그 방위에
//   T-접합(변이 반쪽만 공유)이 생긴다 → 림 띠를 이웃이 정하는 y에서 **쪼갠다**(`rimBands`).
//   전례 = 폭 사슬(값이 정확히 같으면 코플레이너)과 같은 종류의 규율이다.
import * as THREE from 'three'
import {
  TR_RIN, TR_ROUT, TR_AZ0, TR_AZ1, TR_AZW, TR_Y, TERRACE_T, TR_SEG,
  TR_STEP_ON, TR_SOFFIT, RIB_DEST_PHI, terraceMouth, terraceStepSpec,
  TR_LINK_ON, TR_LINK_HW, TR_LINK_BITE, GAT_CX, GAT_CROWN_R, gatCap,
} from './constants.js'
import { gatSeal } from './corridorStairsGeometry.js'   // 처마(수치해) — 리드 반경의 정본

//  ── ★90 연결 계단 스펙(검사·웨이포인트·셀프 렌더 공용 — 사본 금지) ─────────
//  근거·수치 유도는 constants ★90 블록에 있다. 여기는 파생만 한다.
export function terraceLinkSpec () {
  const st = terraceStepSpec(), g = gatCap()
  const y0 = st.landY, yEnd = g.lidTop            // 출발 = 참 윗면 · 도착 = 리드 윗면
  const drop = y0 - yEnd
  const rise = st.rise                            // 테라스와 같은 단높이(현도 확정)
  const risers = Math.round(drop / rise)          // = 33 — 정확히 맞는다(참이 중간이므로)
  const N = risers - 1                            // 디딤 32(마지막 챌판이 리드로 내려선다)
  const hw = TR_LINK_HW
  const lidR = GAT_CROWN_R + gatSeal().eave       // 리드 반경(처마 포함) — gatSeal이 정본
  const xEnd = GAT_CX - Math.sqrt(lidR * lidR - hw * hw)   // 현(chord) 위치
  const x0 = TR_ROUT - TR_LINK_BITE
  const run = xEnd - x0, go = run / N
  return {
    on: TR_LINK_ON, y0, yEnd, drop, rise, risers, N, hw, x0, xEnd, run, go, lidR,
    bite: xEnd - (GAT_CX - lidR),                 // 리드 중앙 물림 ≈0.105
    slope: Math.atan2(drop, run),
    t: TERRACE_T,
    lastTop: y0 - N * rise,                       // 리드 윗면보다 rise 위 = 코플레이너 회피
    lidTop: g.lidTop, lidBot: g.lidY,
  }
}

const EPS = 1e-12
//  ★기하 허용오차. ⚠1e-12로는 안 된다 — 레벨 집합과 구간 경계가 부동소수 유도 경로가 달라
//   ~1e-10 어긋나고, 그 차가 그대로 **폭 5e-10 슬리버 밴드 1120장**이 됐다(★89 실측·자가 적발).
//   실제 레벨 간 최소 간격은 0.17이므로 1e-7은 안전하다.
const TOL = 1e-7
//  ★사다리 레벨 **병합** 허용오차. TOL과 왜 달라야 하는가(★89 실측):
//   경사 밑면은 연속인데 이웃 값을 `±TOL` 떨어진 곳에서 표본하므로, 기울기(R/dAz ≈ 33.6/rad) 때문에
//   **6.7e-6**이 벌어진다. 그 값이 TOL 필터를 통과해 **폭 6.7e-6 슬리버 144장**이 됐다(자가 적발).
//   정당한 레벨 간격의 하한은 **단높이**(0.417 / 'lid' 0.241)이므로 1e-3은 안전하고 충분히 크다.
const MRG = 1e-3

//  ── 구간 목록(runs) = 이 형태의 유일한 정본 ─────────────────────────────────
//  월드 방위로 만들고 **로컬로 돌려서** 반환한다(그리기·검사·웨이포인트 전부 이걸 쓴다).
//  순서 = TR_AZ0 → TR_AZ1(거울 끝 → 아가리 끝). 인접 두 구간의 y 차 = 챌판 높이.
//  ⚠**밑면 끝값(b0·b1)을 구간이 직접 들고 온다** — ★89에서 이것이 watertight의 마지막 관문이었다.
//   구판은 조각함수 `terraceSoffitY`를 경계에서 `±TOL` 떨어뜨려 표본했는데, 경사 밑면은 연속인데도
//   기울기(≈33.6/rad) 때문에 이웃과 **6.7e-6** 어긋나 림 밑변이 짝을 못 이뤘다(비2회변 168·자가 적발).
//   → 표본을 버리고 **구간 색인 산술**로 끝값을 정한다: 이웃한 두 구간이 공유 방위에서 같은 식을
//   계산하므로 **비트 단위로 일치**하고, 진짜 불연속(①↔첫 디딤의 립)만 남는다.
//   'ramp' 규칙: 디딤의 높은-방위 끝(노징) = `y − T` · 낮은-방위 끝(뒤 코너) = `y − R − T`
//   ⇒ 두께가 노징에서 T, 뒤에서 T+R (constants ★89 '노징선 − T'의 구간 표현).
export function terraceRuns () {
  const out = []
  const ramp = TR_STEP_ON && TR_SOFFIT === 'ramp'
  const push = (w0, w1, y, tag, b0, b1) => {
    if (w1 - w0 > EPS) out.push({ az0: w0 - RIB_DEST_PHI, az1: w1 - RIB_DEST_PHI, y, tag, b0, b1 })
  }
  if (!TR_STEP_ON) { push(-TR_AZW, TR_AZW, TR_Y, 'flat', TR_Y - TERRACE_T, TR_Y - TERRACE_T); return out }
  const s = terraceStepSpec(), R = s.rise, T = TERRACE_T
  const flat = (y) => [y - T, y - T]
  push(-TR_AZW, -s.hiW, TR_Y, 'mouth-mirror', ...flat(TR_Y))                     // ⑤
  for (let i = 0; i < s.N; i++) {                                                // ④ (거울 계단)
    const y = TR_Y - (i + 1) * R
    //  거울 쪽은 az0이 높은-방위(노징) 쪽이다
    push(-(s.hiW - i * s.dAz), -(s.hiW - (i + 1) * s.dAz), y, `tread-m${i}`,
      ...(ramp ? [y - T, y - R - T] : flat(y)))
  }
  push(-s.landH, s.landH, TR_Y - s.drop, 'landing', ...flat(TR_Y - s.drop))       // ③
  for (let i = s.N - 1; i >= 0; i--) {                                           // ②
    const y = TR_Y - (i + 1) * R
    push(s.hiW - (i + 1) * s.dAz, s.hiW - i * s.dAz, y, `tread-${i}`,
      ...(ramp ? [y - R - T, y - T] : flat(y)))
  }
  push(s.hiW, TR_AZW, TR_Y, 'mouth', ...flat(TR_Y))                              // ①
  return out
}

//  ── 걷는 면의 높이(로컬 방위 → y) ──────────────────────────────────────────
//  웨이포인트·검사가 쓰는 유일한 높이 생성기. runs와 같은 답을 내야 한다(검사가 대조).
export function terraceProfileY (azLocal) {
  if (!TR_STEP_ON) return TR_Y
  const s = terraceStepSpec()
  const w = Math.abs(azLocal + RIB_DEST_PHI)
  if (w >= s.hiW - EPS) return TR_Y
  if (w <= s.landH + EPS) return TR_Y - s.drop
  const i = Math.min(s.N - 1, Math.floor((s.hiW - w) / s.dAz))
  return TR_Y - (i + 1) * s.rise
}

//  ── 밑면의 높이(로컬 방위 → y) ─────────────────────────────────────────────
//  'saw'  = 걷는 면 − T (톱니)
//  'ramp' = **노징선 − T**. 노징선 = 디딤의 높은-방위 쪽 모서리들을 꿴 직선이고,
//           계단 구간에서 u = (hiW − |w|)/dAz 로 잡으면 y = TR_Y − R − u·R 이다.
//           u=N(참 경계)에서 정확히 TR_Y − (N+1)R = 참 윗면이므로 **참 쪽은 연속**,
//           u=0(아가리 경계)에서는 TR_Y − R 이라 ①의 밑면보다 R 낮다 = **립**(constants ★89 ⚠).
//  ⚠**runs의 b0·b1에서 보간한다**(사본 금지 — 위 ⚠ 참조). 조각함수를 따로 두면 그것이 곧 사본이다.
export function terraceSoffitY (azLocal) {
  const runs = terraceRuns()
  let r = runs.find((x) => azLocal >= x.az0 - EPS && azLocal <= x.az1 + EPS)
  if (!r) r = azLocal < runs[0].az0 ? runs[0] : runs[runs.length - 1]
  const f = (azLocal - r.az0) / ((r.az1 - r.az0) || 1)
  return r.b0 + (r.b1 - r.b0) * Math.min(1, Math.max(0, f))
}

//  ── 스펙(검사·웨이포인트 공용 — 사본 금지) ────────────────────────────────
export function terraceSpec () {
  const m = terraceMouth()
  const span = TR_AZ1 - TR_AZ0
  const runs = terraceRuns()
  const step = TR_STEP_ON ? terraceStepSpec() : null
  const yLo = runs.reduce((a, r) => Math.min(a, r.y), Infinity)
  return {
    rIn: TR_RIN, rOut: TR_ROUT, az0: TR_AZ0, az1: TR_AZ1, span,
    yTop: TR_Y, yBot: TR_Y - TERRACE_T, t: TERRACE_T,
    width: TR_ROUT - TR_RIN,                       // ★TR_W_F 파생(2/3 → 8.63). 구 주석의 12.94는 배율 1 시절 값이었다
    arcOut: TR_ROUT * span, arcIn: TR_RIN * span,   // ★85-2 대칭 연장 후 = 206.8 / 194.3(구 주석 103.4/94.0은 한쪽 부채꼴 시절)
    seg: TR_SEG,
    mouth: m,
    crescent: m.rOut - m.ctrR,                     // 1.410 — 문턱 현과 바깥 호 사이(가운데 최대)
    stepped: TR_STEP_ON, step, runs, yLand: yLo,   // ★89
    soffit: TR_SOFFIT,
  }
}

//  ── 부채꼴 위의 한 점(걷는 면) — 웨이포인트·검사가 쓰는 유일한 좌표 생성기 ──
//  fr = 반경 보간(0 = 안쪽 림 · 1 = 바깥 림) · fa = 방위 보간(0 = TR_AZ0 · 1 = TR_AZ1)
//  ⚠y는 ★89부터 **방위의 함수**다(구판은 TR_Y 고정).
export function terracePoint (fr, fa) {
  const r = TR_RIN + (TR_ROUT - TR_RIN) * fr
  const a = TR_AZ0 + (TR_AZ1 - TR_AZ0) * fa
  return { x: r * Math.cos(a), z: r * Math.sin(a), y: terraceProfileY(a), r, az: a }
}

//  ── 슬래브(계단) ──────────────────────────────────────────────────────────
//  ★★림의 위상 = **경계마다 상대의 경계값으로만 쪼개고, 서로 다른 두 사다리를 봉합한다.**
//   ★89에서 세 번 고쳐 얻은 결론이다(전부 자가 적발):
//    ⛔1차 — 구간별 '이웃이 정하는 y'로 쪼갬 → 한 경계의 양쪽이 다른 y에서 쪼개져 T-접합 532개.
//            원인 = **먼 이웃**이 만든 쪼갬이 가까운 경계로 새어 든다(우리 y−R vs 이웃 y+2R−T).
//    ⛔2차 — **전역 레벨 집합**으로 교체(톱니는 해결). 그러나 경사 밑면에선 못 쓴다 — 밑면이 구간 안에서
//            기울어 필터 창이 방위마다 달라지고 인접 세그먼트의 밴드가 어긋난다(램프에서 다시 532개).
//    ✅3차 — **국소 규칙**: 각 경계에서 *상대의* [밑면, 윗면] 값 중 내 구간 안에 드는 것만 쪼갬으로 삼는다.
//            그러면 먼 이웃이 원리적으로 배제되고, 남는 차집합이 정확히 챌판·톱니(립)가 된다.
//            두 끝의 사다리가 달라지므로 림은 **봉합**으로 잇는다. **두 어법이 같은 코드로 성립한다.**
export function buildTerrace () {
  const P = [], N = []
  //  삼각형 하나 — 감김은 법선에 맞춰 자동 교정(quad와 같은 규율).
  const tri = (A, B, C, n) => {
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const seq = (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2]) < 0 ? [A, C, B] : [A, B, C]
    for (const p of seq) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]) }
  }
  const quad = (A, B, C, D, n) => { tri(A, B, C, n); tri(A, C, D, n) }

  const T = TERRACE_T
  const at  = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)]
  const rad = (a) => [Math.cos(a), 0, Math.sin(a)]
  const tan = (a, sg) => [-Math.sin(a) * sg, 0, Math.cos(a) * sg]
  const unit = (v) => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L] }
  //  기운 밑면의 법선: y=f(a)이고 r에 무관한 면이면 N ∝ (−sin a·f′, −r, cos a·f′).
  const dnAt = (a, fp) => (Math.abs(fp) < EPS ? [0, -1, 0]
    : unit([-Math.sin(a) * fp, -(TR_RIN + TR_ROUT) / 2, Math.cos(a) * fp]))

  const runs = terraceRuns()
  //  구간 안의 밑면 = b0→b1 선형 보간(구간이 들고 온 끝값 — 이웃과 비트 일치)
  const botIn = (r, a) => r.b0 + (r.b1 - r.b0) * Math.min(1, Math.max(0, (a - r.az0) / ((r.az1 - r.az0) || 1)))

  //  ── 사다리: 이 구간의 한쪽 끝에서 림이 가질 y 목록 ──────────────────────
  //  own = 내 [밑면, 윗면] · oth = 상대의 [밑면, 윗면]. 상대 값 중 내 구간 **안**에 드는 것만 넣는다.
  const ladder = (i, side) => {
    const r = runs[i]
    const lo = side < 0 ? r.b0 : r.b1, hi = r.y
    const nb = runs[side < 0 ? i - 1 : i + 1]
    const out = [lo, hi]
    //  상대의 [밑면, 윗면] 중 **내 구간 안**에 드는 것만 쪼갬으로 삼는다(먼 이웃 원리적 배제).
    if (nb) for (const v of [side < 0 ? nb.b1 : nb.b0, nb.y]) if (v > lo + MRG && v < hi - MRG) out.push(v)
    const srt = out.sort((x, y2) => x - y2), mg = [srt[0]]
    for (const v of srt.slice(1)) if (v - mg[mg.length - 1] > MRG) mg.push(v)
    return mg
  }

  //  ── 봉합: 두 사다리 사이를 삼각형으로 잇는다(길이가 달라도 T-접합 0) ──────
  const stitch = (r, a0, L0, a1, L1, nrm) => {
    const f = (L) => (k) => (L[k] - L[0]) / ((L[L.length - 1] - L[0]) || 1)
    const t0 = f(L0), t1 = f(L1)
    let i = 0, j = 0
    while (i < L0.length - 1 || j < L1.length - 1) {
      const go0 = (j >= L1.length - 1) || (i < L0.length - 1 && t0(i + 1) <= t1(j + 1))
      if (go0) { tri(at(r, a0, L0[i]), at(r, a0, L0[i + 1]), at(r, a1, L1[j]), nrm); i++ }
      else     { tri(at(r, a0, L0[i]), at(r, a1, L1[j + 1]), at(r, a1, L1[j]), nrm); j++ }
    }
  }

  for (let i = 0; i < runs.length; i++) {
    const { az0, az1, y } = runs[i]
    const n = Math.max(1, Math.ceil(TR_ROUT * (az1 - az0) / 1.1))
    const Llo = ladder(i, -1), Lhi = ladder(i, +1)
    const azAt = (k) => az0 + (az1 - az0) * k / n
    const lad = (k) => (k === 0 ? Llo : k === n ? Lhi : [botIn(runs[i], azAt(k)), y])

    for (let k = 0; k < n; k++) {
      const a0 = azAt(k), a1 = azAt(k + 1)
      const b0 = botIn(runs[i], a0), b1 = botIn(runs[i], a1)
      const fp = (b1 - b0) / (a1 - a0)
      // 윗면(밟는 면) · 밑면('ramp'면 기운다 — 법선 명시)
      quad(at(TR_RIN, a0, y), at(TR_ROUT, a0, y), at(TR_ROUT, a1, y), at(TR_RIN, a1, y), [0, 1, 0])
      const dn = dnAt((a0 + a1) / 2, fp)
      quad(at(TR_RIN, a0, b0), at(TR_ROUT, a0, b0), at(TR_ROUT, a1, b1), at(TR_RIN, a1, b1), dn)
      // 두 림 — 사다리 봉합
      const ro = rad((a0 + a1) / 2), ri = [-ro[0], 0, -ro[2]]
      stitch(TR_ROUT, a0, lad(k), a1, lad(k + 1), ro)
      stitch(TR_RIN,  a0, lad(k), a1, lad(k + 1), ri)
    }
  }

  //  ── 경계면: 양쪽 [밑면, 윗면]의 **차집합**만 면으로 낸다 ────────────────
  //   'saw' → 챌판 + 톱니 두 장 · 'ramp' → 챌판 한 장(밑면 연속) + ①/첫 디딤에서만 립 한 장.
  //   어법을 몰라도 기하가 알아서 갈린다.
  for (let i = 0; i + 1 < runs.length; i++) {
    const A = runs[i], B = runs[i + 1], a = A.az1
    const aI = [A.b1, A.y], bI = [B.b0, B.y]      // 양쪽의 [밑면, 윗면] — 구간이 들고 온 끝값(표본 금지)
    //  ★법선 부호 규칙(★89에서 실제로 틀렸던 곳 — 현도 적발 "계단 앞쪽면이 비어있어"):
    //   경계면은 **차집합의 주인 쪽에서 바깥으로** 향한다. A(방위 작은 쪽)에만 있는 부분은 B쪽,
    //   즉 **방위 증가 방향(+1)**을 향한다. 반대면 −1. 챌판·톱니 둘 다 이 한 규칙으로 정해진다.
    //   ⚠뒤집으면 back-face culling으로 **면이 통째로 사라진다**(watertight 검사는 변만 세므로 못 잡는다
    //   — 그래서 F2에 방향 검사를 신설했다: 삼각형 법선 방향으로 살짝 나간 점이 솔리드 밖인가).
    const owner = (loA, hiA, loB, hiB) => (loA < loB ? +1 : -1)   // 더 멀리 뻗은 쪽이 주인
    const faces = [
      [Math.min(aI[1], bI[1]), Math.max(aI[1], bI[1]), A.y > B.y ? +1 : -1],     // 챌판: 높은 쪽이 주인
      [Math.min(aI[0], bI[0]), Math.max(aI[0], bI[0]), aI[0] < bI[0] ? +1 : -1], // 톱니·립: 낮은 쪽이 주인
    ]
    void owner
    for (const [y0, y1, sg] of faces) {
      if (y1 - y0 < MRG) continue      // ⚠MRG여야 한다 — 램프에서 밑면 차집합이 표본 오차만큼 남는다
      const nv = tan(a, sg)
      quad(at(TR_RIN, a, y0), at(TR_ROUT, a, y0), at(TR_ROUT, a, y1), at(TR_RIN, a, y1), nv)
    }
  }

  //  끝캡 둘 — 방위 평면. 법선 = 그 방위의 접선(부채꼴 바깥 향).
  for (const [a, sg, y] of [[TR_AZ0, -1, runs[0].y], [TR_AZ1, 1, runs[runs.length - 1].y]]) {
    const t = tan(a, sg), b = sg < 0 ? runs[0].b0 : runs[runs.length - 1].b1
    quad(at(TR_RIN, a, b), at(TR_ROUT, a, b), at(TR_ROUT, a, y), at(TR_RIN, a, y), t)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  g.computeBoundingSphere()
  return g
}

//  ── ★90 연결 계단(참 → 갓 리드) ──────────────────────────────────────────
//  곧은 방사 계단(월드 z=0 축 위, +x 진행). 좌표계는 테라스와 같은 **상부 여정 그룹 로컬**이므로
//  월드 0° 방위 = 로컬 −RIB_DEST_PHI 이고, 여기서는 **로컬 축을 그 방위로 회전**해 만든다.
//  ⚠법선 규칙·밑면 규칙은 테라스와 **같다**: 밑면 = 안쪽 코너선 − T(디딤 뒤 코너에서 두께 T),
//   경계면은 차집합의 주인 쪽에서 바깥으로.
export function buildTerraceLink () {
  const L = terraceLinkSpec()
  const P = [], N = []
  const tri = (A, B, C, n) => {
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const seq = (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2]) < 0 ? [A, C, B] : [A, B, C]
    for (const q of seq) { P.push(q[0], q[1], q[2]); N.push(n[0], n[1], n[2]) }
  }
  const quad = (A, B, C, D, n) => { tri(A, B, C, n); tri(A, C, D, n) }
  const unit = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m] }
  //  월드 0° 방위로 회전 — 로컬 좌표로 되돌린다(테라스와 같은 그룹 안에 산다)
  const ca = Math.cos(-RIB_DEST_PHI), sa = Math.sin(-RIB_DEST_PHI)
  const pt = (x, y, z) => [x * ca - z * sa, y, x * sa + z * ca]
  const vec = (vx, vy, vz) => unit([vx * ca - vz * sa, vy, vx * sa + vz * ca])

  const T = L.t, hw = L.hw
  const UP = vec(0, 1, 0), PZ = vec(0, 0, 1), MZ = vec(0, 0, -1)
  const PX = vec(1, 0, 0), MX = vec(-1, 0, 0)

  //  디딤 k = 1..N : x ∈ [x_{k−1}, x_k] · 윗면 y_k = y0 − k·rise
  //   밑면(경사 매스) = 안쪽 코너선 − T ⇒ 근단(뒤 코너) y_k − T · 원단(노징) y_k − rise − T
  const xa = (k) => L.x0 + L.go * k
  const yt = (k) => L.y0 - L.rise * k
  const bn = (k) => yt(k) - T              // 근단 밑면
  const bf = (k) => yt(k) - L.rise - T     // 원단 밑면

  for (let k = 1; k <= L.N; k++) {
    const x0 = xa(k - 1), x1 = xa(k), y = yt(k), b0 = bn(k), b1 = bf(k)
    // 윗면 · 밑면(기울어짐 — 법선 명시)
    quad(pt(x0, y, -hw), pt(x1, y, -hw), pt(x1, y, hw), pt(x0, y, hw), UP)
    const fp = (b1 - b0) / (x1 - x0)
    const DN = vec(fp, -1, 0)
    quad(pt(x0, b0, -hw), pt(x1, b1, -hw), pt(x1, b1, hw), pt(x0, b0, hw), DN)
    // 옆면 둘 — 원단에서 다음 디딤의 윗면 높이로 쪼갠다(테라스 사다리 규칙과 같다)
    for (const [z, nz] of [[hw, PZ], [-hw, MZ]]) {
      const yNext = (k < L.N) ? yt(k + 1) : L.lidTop         // 마지막은 리드 윗면이 다음 레벨
      const lad1 = [b1, yNext, y].filter((v, i, a) => i === 0 || v - a[i - 1] > 1e-6)
      // 근단 사다리는 2단(위 이웃의 밑면이 우리 밑면과 같으므로 쪼갬 없음)
      const lad0 = [b0, y]
      // 봉합
      let i = 0, j = 0
      const f0 = (t) => (lad0[t] - lad0[0]) / ((lad0[lad0.length - 1] - lad0[0]) || 1)
      const f1 = (t) => (lad1[t] - lad1[0]) / ((lad1[lad1.length - 1] - lad1[0]) || 1)
      while (i < lad0.length - 1 || j < lad1.length - 1) {
        const go0 = (j >= lad1.length - 1) || (i < lad0.length - 1 && f0(i + 1) <= f1(j + 1))
        if (go0) { tri(pt(x0, lad0[i], z), pt(x0, lad0[i + 1], z), pt(x1, lad1[j], z), nz); i++ }
        else     { tri(pt(x0, lad0[i], z), pt(x1, lad1[j + 1], z), pt(x1, lad1[j], z), nz); j++ }
      }
    }
    // 챌판 — 이 디딤과 다음 레벨 사이. 차집합의 주인은 **높은 쪽(이 디딤)** → +x를 향한다.
    const yNext = (k < L.N) ? yt(k + 1) : L.lidTop
    quad(pt(x1, yNext, -hw), pt(x1, y, -hw), pt(x1, y, hw), pt(x1, yNext, hw), PX)
  }
  //  근단 캡(테라스 슬래브 안에 묻힘) · 원단 캡(리드 두께 안에 묻힘)
  quad(pt(L.x0, bn(1), -hw), pt(L.x0, yt(1), -hw), pt(L.x0, yt(1), hw), pt(L.x0, bn(1), hw), MX)
  quad(pt(L.xEnd, bf(L.N), -hw), pt(L.xEnd, L.lidTop, -hw), pt(L.xEnd, L.lidTop, hw), pt(L.xEnd, bf(L.N), hw), PX)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  g.computeBoundingSphere()
  return g
}
