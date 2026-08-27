// lightingModel.js — ★175 조도·화면밝기 모델(three 0.184 공식 이식)
//
//  ⚠존재 이유: ★174는 "검사가 소스 문자열만 봤기 때문에" 무반응을 네 번 오진했다.
//  화면은 자체 렌더러로 볼 수 없다(§2-D ⑤ — 자체 셰이딩이라 three 광원을 모른다).
//  그래서 검증 대상을 화면이 아니라 **조도**로 옮긴다. 조도는 순수 함수라 계산·반증이 가능하다.
//
//  ⚠도구 검증(전제): three uniform 변환에 π 계수 없음 — build/three.module.js 8631·8663·8725 실측.
//   ambient / hemisphere / directional / point / spot 전부 color×intensity 동일 단위 → 직접 비교 가능.
import {
  LGT_AMB_I, LGT_HEMI_I, LGT_DIR_I, LGT_DIR2_I, LGT_DIR3_I,
  LGT_DIR_POS, LGT_DIR2_POS, LGT_DIR3_POS, LGT_DIR23_SHADOW,
  RND_SHADOWS, RND_EXPOSURE, RND_SHDW_RANGE, RND_SHDW_MAP, RND_SHDW_DIST, RND_SHDW_BIAS,
  ROOM_DARK_ON, ROOM_DARK_AO,
  ROOM_FLOOR_Y, ROOM_CYL_TOP, ROOM_HEIGHT, ROOM_R, DAIS_H, ROOM_CEIL_Y, ROOM_OCULUS_R, RM_SPOT_SHADOW,
  RM_SPOT_I, RM_SPOT_SPREAD_R, RM_SPOT_PEN, RM_SPOT_DECAY,
  RM_LGT_CORE_I, RM_LGT_DAIS_I, RM_LGT_WELL_I,
  SHAFT_DROP_ON, SHAFT_HALO_K_UP, SHAFT_HALO_K_LO, DISC_HOLE_R, DISC_Y_LO, DISC_Y_HI, ROOM_WELL_RT,
  BAKE_N, BAKE_FLOOR, BAKE_GAMMA, BAKE_TIP_CAP_ON, BAKE_DISC_GAP_ON, BAKE_WRAP, BAKE_AMB, BAKE_BOUNCE, BAKE_TONE, BAKE_DISC_OPEN_SEG, BAKE_POLY_ON,
  BAKE_D_SEG, BAKE_D_GAMMA, SHAFT_EDGE_AXIAL, SHAFT_TOP_FADE,
  gatCap, ceilY, COR_CX, COR_R, CUP_R, GAT_CROWN_R, GAT_POSTS, GAT_POST_R, GAT_CONE_H, GAT_FACETS,   // ★188 D구획 = 드럼 홀 + 갓
} from './constants.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
import { discSpec } from './discGeometry.js'   // ★180 하절 공급지에 디스크 트인 틈 합류
import { pitSpec } from './defPitGeometry.js'

// ── 벡터 ──────────────────────────────────────────────────────
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len = (a) => Math.hypot(a[0], a[1], a[2])
export const nrm = (a) => { const l = len(a); return [a[0] / l, a[1] / l, a[2] / l] }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// ── three 조명 공식 ───────────────────────────────────────────
// getDistanceAttenuation( lightDistance, cutoffDistance, decayExponent )
export function distAtt(d, cutoff, decay) {
  let f = 1 / Math.max(Math.pow(d, decay), 0.01)
  if (cutoff > 0) { const t = Math.max(0, Math.min(1, 1 - Math.pow(d / cutoff, 4))); f *= t * t }
  return f
}
// getSpotAttenuation = smoothstep( coneCos, penumbraCos, angleCos )
export function spotAtt(angleCos, coneCos, penumbraCos) {
  if (penumbraCos <= coneCos) return angleCos > coneCos ? 1 : 0
  let t = (angleCos - coneCos) / (penumbraCos - coneCos)
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

// ── three 톤매핑 + sRGB (화면 밝기) ───────────────────────────
//  ⚠three의 ACESFilmicToneMapping은 `color *= toneMappingExposure / 0.6`으로 시작한다.
//   이 1/0.6(=1.667) 배율을 빼면 밝기를 과소평가한다(★175 세션 중 자책·정정).
//  무채색 입력은 ACESInput/OutputMat의 각 행 합이 1이라 회색으로 보존된다 → 스칼라로 계산 가능.
function rrtAndOdtFit(v) {
  const a = v * (v + 0.0245786) - 0.000090537
  const b = v * (0.983729 * v + 0.4329510) + 0.238081
  return a / b
}
export function acesToneMap(lux, exposure = RND_EXPOSURE) {
  const v = lux * exposure / 0.6
  return Math.max(0, Math.min(1, rrtAndOdtFit(v)))
}
export function linearToSRGB(v) {
  return v <= 0.0031308 ? v * 12.92 : Math.pow(v, 0.41666) * 1.055 - 0.055
}
/** 조도 → 화면에 실제로 나타나는 밝기(0~1). 대비 판단은 반드시 이 값으로 한다. */
export function displayLum(lux) { return linearToSRGB(acesToneMap(lux)) }

// ── 장면 광원 ─────────────────────────────────────────────────
export const HEMI_SKY_LUM = 1.0     // '#ffffff'
export const HEMI_GND_LUM = 0.553   // '#8d8f94'
export const DIRS = [
  { i: LGT_DIR_I, p: LGT_DIR_POS, shadow: () => RND_SHADOWS },
  { i: LGT_DIR2_I, p: LGT_DIR2_POS, shadow: () => RND_SHADOWS && LGT_DIR23_SHADOW },
  { i: LGT_DIR3_I, p: LGT_DIR3_POS, shadow: () => RND_SHADOWS && LGT_DIR23_SHADOW },
]
export function roomLights(o = {}) {
  const spotY = ROOM_CYL_TOP - 6
  return {
    spot: {
      p: [0, spotY, 0], dir: [0, -1, 0],
      i: o.spotI ?? RM_SPOT_I, dist: 170, decay: o.spotDecay ?? RM_SPOT_DECAY,
      angle: Math.atan((o.spreadR ?? RM_SPOT_SPREAD_R) / (spotY - ROOM_FLOOR_Y)), penumbra: RM_SPOT_PEN,
    },
    points: [
      { name: 'core', p: [0, ROOM_FLOOR_Y + ROOM_HEIGHT * 0.45, 0], i: RM_LGT_CORE_I, dist: ROOM_R * 4, decay: 1.4 },
      { name: 'dais', p: [0, ROOM_FLOOR_Y + DAIS_H + 2.5, 0], i: RM_LGT_DAIS_I, dist: 42, decay: 1.7 },
      { name: 'well', p: [0, ROOM_CYL_TOP - 8, 0], i: RM_LGT_WELL_I, dist: ROOM_CYL_TOP * 1.6, decay: 1.1 },
    ],
  }
}

/**
 * 한 점의 조도 분해.
 * @param pos 월드 좌표(방 로컬 — 방 그룹은 x=ROOM_CX 평행이동이라 상대기하 동일)
 * @param n   표면 법선(단위)
 * @param o.indoor  방 안인가(그림자로 dir이 막히고, ROOM_DARK면 amb/hemi도 끊긴다)
 * @param o.roomDark ROOM_DARK 적용 재질인가(기본 = ROOM_DARK_ON && indoor)
 */
export function luxAt(pos, n, o = {}) {
  const indoor = o.indoor ?? false
  const shadows = o.shadowsOn ?? RND_SHADOWS
  const darkOn = o.roomDark ?? (ROOM_DARK_ON && indoor)
  const ao = darkOn ? (1 - (o.ao ?? ROOM_DARK_AO)) : 1   // aoMap: indirectDiffuse *= (r-1)*intensity+1, r=0 → 1-intensity

  const out = {}
  out.amb = LGT_AMB_I * ao
  const w = 0.5 * n[1] + 0.5
  out.hemi = LGT_HEMI_I * (HEMI_GND_LUM + (HEMI_SKY_LUM - HEMI_GND_LUM) * w) * ao
  out.dir = 0
  for (const d of DIRS) {
    if (indoor && shadows && d.shadow()) continue        // 껍질이 막는다
    out.dir += d.i * Math.max(0, dot(nrm(d.p), n))
  }
  const L = roomLights(o)
  const sv = sub(L.spot.p, pos), sd = len(sv), sl = nrm(sv)
  const sa = spotAtt(dot(sl.map((x) => -x), L.spot.dir),
    Math.cos(L.spot.angle), Math.cos(L.spot.angle * (1 - L.spot.penumbra)))
  //  ★175-c 개구 차폐: 스포트에 castShadow가 걸리면 천장(y=ROOM_CEIL_Y)이 빛을 막고
  //  개구(반경 ROOM_OCULUS_R) 안을 지난 광선만 남는다 — '빛이 구멍 모양으로 잘린다'의 계산판.
  //  ⚠렌더러 게이트(RND_SHADOWS)가 꺼지면 Canvas가 그림자를 그리지 않으므로 스포트 castShadow도 무효다.
  const spotShadow = o.spotShadow ?? (RND_SHADOWS && RM_SPOT_SHADOW)
  let occl = 1
  if (spotShadow && pos[1] < ROOM_CEIL_Y && L.spot.p[1] > ROOM_CEIL_Y) {
    const t = (L.spot.p[1] - ROOM_CEIL_Y) / (L.spot.p[1] - pos[1])
    const rAtCeil = t * Math.hypot(pos[0], pos[2])       // 스포트가 축 위(x=z=0)에 있으므로 닮음비
    if (rAtCeil > ROOM_OCULUS_R) occl = 0
  }
  out.spot = L.spot.i * sa * occl * distAtt(sd, L.spot.dist, L.spot.decay) * Math.max(0, dot(sl, n))
  out.point = 0; out.pointBy = {}
  for (const p of L.points) {
    const v = sub(p.p, pos), d = len(v), l = nrm(v)
    const c = p.i * distAtt(d, p.dist, p.decay) * Math.max(0, dot(l, n))
    out.pointBy[p.name] = c; out.point += c
  }
  out.indirect = out.amb + out.hemi          // 차폐를 무시하는 성분(aoMap의 표적)
  out.global = out.indirect + out.dir
  out.room = out.spot + out.point
  out.total = out.global + out.room
  out.display = displayLum(out.total)        // 화면 밝기
  return out
}

// ── ★175-e 빛기둥·헤일로 마디(현도 스케치 2026.08.25) ────────
//  ⚠전부 유도값이다 — 손으로 고른 반경 없음. 현도가 준 것은 **개형**이고, 치수는 기하가 정한다.
//   ① 갓 꼭지(갓 구멍 r) → ② 우물 꼭대기(WELL_RT) → ③ 조리개(우물 내벽 최소각) → ④ 방 바닥 → ⑤ 각뿔대 바닥
//   ③④는 실제 스포트 원뿔 위의 두 점이므로 **기둥과 실제 빛 자국이 일치**한다(★175-c에서 어긋났던 지점).
//   ⑤는 각뿔대 하면 반경 — 빛이 각뿔대 벽에 잘리며 좁아지는 꼴(현도 스케치).
//  헤일로 = 같은 형상의 SHAFT_HALO_K배(스케치 실측: 어깨 21/10.7 · 바닥 50/26 — 둘 다 약 2.0).
//   ⚠각뿔대 구간에는 넣지 않는다(r40이 각뿔대 하면 20을 뚫는다 · 스케치에도 노란색이 안 들어감).
export function shaftNodes() {
  const SP = spireSpec(), P = pitSpec()
  const spotY = ROOM_CYL_TOP - 6
  //  ── 우물 구간 조리개(첨탑 내벽) ──
  let tanW = Infinity, apY = 0
  for (let y = SP.yB; y < spotY; y += 0.25) {
    const rin = wellWallR(y, { spec: SP, forceSpire: true }) - SP.T
    const t = rin / (spotY - y)
    if (t < tanW) { tanW = t; apY = y }
  }
  //  ── ★175-f 진짜 조리개 = 착지 디스크 중앙 구멍(현도 지적) ──
  //  ⚠★175-e까지 이것을 놓쳤다. 디스크는 우물 통(16.8)·천장 개구(17.45)보다 **훨씬 좁은 r6**으로
  //   빛을 조인다. 스포트에 castShadow가 걸려 있으므로 **화면의 빛은 이미 여기서 잘리고 있었다** —
  //   틀린 것은 화면이 아니라 모델이었다(구 계산 tan 0.20741 = 2.8배 과대).
  const tanD = DISC_HOLE_R / (spotY - DISC_Y_LO)
  const rAtD = (y) => tanD * (spotY - y)
  //  기둥은 **두 절로 나뉜다**(현도: "빛기둥이 2개로 나뉘어야 하고, 아래 빛기둥은 디스크 중앙 구멍에서 뻗어나간다").
  //  상절 = 갓 꼭지 → 디스크 상면(우물을 채우는 빛). 하절 = 디스크 구멍 → 각뿔대 바닥.
  const upper = [
    [SP.tipY, SP.holeR],
    [ROOM_CYL_TOP, ROOM_WELL_RT],
    [DISC_Y_HI, tanW * (spotY - DISC_Y_HI)],
  ]
  const lower = [
    [DISC_Y_LO, DISC_HOLE_R],
    [ROOM_FLOOR_Y, rAtD(ROOM_FLOOR_Y)],
  ]
  if (SHAFT_DROP_ON) lower.push([P.yBot, rAtD(P.yBot)])
  //  헤일로 배수는 위아래가 다르다 — 스케치 실측: 어깨 21/10.6 ≈ 2.0 · 방 바닥 50/9.5 ≈ 5.2.
  const haloUp = upper.map(([y, r]) => [y, r * SHAFT_HALO_K_UP])
  const haloLo = lower.filter((n) => n[0] >= ROOM_FLOOR_Y).map(([y, r]) => [y, r * SHAFT_HALO_K_LO])
  return { tanW, tanD, apY, spotY, upper, lower, haloUp, haloLo }
}

// ── ★176 베이크 1차 — 공급지 = 표본점들의 집합 (조명 헌장 Ⅱ) ──────────
//  ⚠일반화가 설계 조건이다(현도 지시 2026.08.25): A구획 공급지 = 착지 디스크 구멍 r6(좁은 원판),
//   D구획 공급지 = 갓 링 슬릿 반경 26의 고리(★175-j). 공급지를 점으로 하드코딩하면 D에서 재작업이다.
//   → 베이커 본체(bakeIrradianceAt)는 **표본 배열만** 받는다. 구획별 차이는 표본 생성기에만 있다.
//  1차 모델(★176 ①): 차폐 없음 — 각 표본에 대해 수신 코사인 × 발광 코사인 / 거리²의 평균.
//   (원판·고리 다 램버시안 개구 근사 — 개구 아래 반구로만 발광한다. 개구 뒤·표면 등 뒤는 0.)

const GOLDEN_A = Math.PI * (3 - Math.sqrt(5))    // 황금각 — 결정론적 원판 표본(Vogel 나선)

/** 원판 공급지 표본(중심 c · 반지름 r · 발광 법선 sn 기본 아래) — A구획(디스크 구멍·첨탑 꼭지 구멍) */
export function supplyDiskSamples({ c, r, n = BAKE_N, sn = [0, -1, 0] }) {
  const out = []
  for (let i = 0; i < n; i++) {
    const rho = r * Math.sqrt((i + 0.5) / n), a = i * GOLDEN_A
    out.push({ p: [c[0] + rho * Math.cos(a), c[1], c[2] + rho * Math.sin(a)], n: sn })
  }
  return out
}
/** 고리 공급지 표본(중심 c · 반지름 R) — D구획(갓 링 슬릿)이 그대로 쓴다. 베이커는 안 바뀐다 */
export function supplyRingSamples({ c, R, n = BAKE_N, sn = [0, -1, 0] }) {
  const out = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push({ p: [c[0] + R * Math.cos(a), c[1], c[2] + R * Math.sin(a)], n: sn })
  }
  return out
}
/** 고리-부채꼴 공급지 표본(중심 c · 반경 r0~r1 · 방위 a0에서 폭 da) — ★180 착지 디스크의 **트인 틈**.
 *  ⚠면적 균일 표집이다: 반경은 √보간(r = √(r0²+u(r1²−r0²)))이라야 바깥쪽이 과소표집되지 않는다.
 *  ⚠표본당 면적을 다른 공급지와 **같게** 맞춰 넘겨야 한다 — bakeIrradianceAt이 단순 평균이므로,
 *   표본 밀도가 곧 가중치다(개수를 면적비로 주면 평균이 참 조사량에 비례한다). zoneABakeSpec이 그렇게 배분한다. */
export function supplyAnnulusSectorSamples({ c, r0, r1, a0, da, n = BAKE_N, sn = [0, -1, 0] }) {
  const out = []
  for (let i = 0; i < n; i++) {
    //  2D 저불일치(R2 격자) — 결정론적이고 부채꼴에서 뭉치지 않는다
    const u = (i + 0.5) / n, v = (i * 0.7548776662466927) % 1
    const r = Math.sqrt(r0 * r0 + u * (r1 * r1 - r0 * r0)), a = a0 + v * da
    out.push({ p: [c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)], n: sn })
  }
  return out
}
/** 표본 집합이 점 (pos, 법선 n)에 주는 조사량 — 순수 함수. 공급지 좌표는 인자(samples)에만 있다 */
//  ★181 상호반사 근사(2026.08.27 현도 ⓐ) — 1차 모델엔 튄 빛이 없어 **수직·아래 보는 면이 전부 칠흑**이었다
//   (실측: 계단 옆면 0.036 · 밑면 0.030 = BAKE_FLOOR에 붙음. 윗면만 0.99). 실제 통 안이라면 벽에 부딪힌 빛이
//   튀어 챌면을 물들인다. 두 항으로 근사한다 — 물리 정확성은 목적이 아니라 수단이다(규율 41).
//    wrap: 수신 코사인 감싸기 (cr+w)/(1+w) — 스치는 면을 부드럽게 든다(반-람베르트).
//    amb : 수신 코사인 **없는** 개구 가시량 몫 — 아래 보는 면(cr<0)까지 닿는 유일한 항.
//   ⚠wrap=0·amb=0이면 식이 ★176 원형과 항등이다(보존계 — 검사가 문다).
//   ⚠eRef도 같은 함수로 계산되므로 기준점이 함께 움직인다(노브를 밀어도 축상 착지점 shade는 1 유지).
export function bakeIrradianceAt(pos, n, samples, { wrap = BAKE_WRAP, amb = BAKE_AMB } = {}) {
  let Ed = 0, Ea = 0
  for (const s of samples) {
    const v = sub(s.p, pos), d = len(v)
    if (d < 1e-6) continue                              // 표본과 정점 일치 — 특이점 제외
    const l = [v[0] / d, v[1] / d, v[2] / d]
    const cs = -dot(s.n, l); if (cs <= 0) continue      // 개구 뒤(발광 반구 밖)
    const g = cs / (d * d)
    Ea += g
    const cr0 = dot(n, l)
    const cr = wrap > 0 ? Math.max(0, (cr0 + wrap) / (1 + wrap)) : Math.max(0, cr0)   // 표면 등 뒤
    if (cr > 0) Ed += cr * g
  }
  return (Ed + amb * Ea) / samples.length
}

// ── ★186 해석적 개구 조사량(2026.08.27 현도 실증: 개구에 가까울수록 어두워짐) ─────
//  ⛔점 표본 근사는 **근거리에서 붕괴**한다: 표본 간격보다 가까이 가면 바로 위에 표본이 없어 E→0.
//   실측(틈 가장자리 r15.4): y97 0.143 → y98.6 0.036 → y99.0 0.030(칠흑). 개구 바로 밑이 가장 밝아야 하는데 정반대.
//  → 면적분을 **해석적으로** 푼다(램버트 폴리곤 공식): 균일 복사휘도 평면 다각형이 점 P에 주는 조사량
//     E = ½ Σ_i β_i (Γ_i · n)   (β_i = 변의 두 끝이 P에서 이루는 각 · Γ_i = 그 삼각형 법선)
//   거리에 무관하게 정확하다 — 개구에 붙어도 π로 수렴한다. 표본 수·간격이라는 개념 자체가 사라진다.
//  ⚠반환 스케일이 점표본판(면적으로 나눈 평균)과 다르다 — eRef도 같은 경로로 계산되므로 비는 보존된다.
const EPSA = 1e-9
export function polyIrradiance(p, n, poly, sn) {
  //  발광 반구 밖(개구 뒤)이면 0 — 개구는 sn 방향으로만 발광한다
  const d0 = sn[0] * (p[0] - poly[0][0]) + sn[1] * (p[1] - poly[0][1]) + sn[2] * (p[2] - poly[0][2])
  if (d0 <= EPSA) return 0                                        // p가 발광 방향(sn) 쪽에 있어야 받는다
  //  감김 방향 정규화 — 공식의 부호는 P에서 본 감김에 달렸다. 다각형 법선을 sn에 맞춰 보정한다
  //  (⚠구현 중 부호를 두 번 틀렸다: 발광면 판정 한 번, 감김 한 번. 폐형해 대조가 둘 다 즉시 적발 — 규율 32의 연장)
  const e1 = [poly[1][0] - poly[0][0], poly[1][1] - poly[0][1], poly[1][2] - poly[0][2]]
  const e2 = [poly[2][0] - poly[0][0], poly[2][1] - poly[0][1], poly[2][2] - poly[0][2]]
  const npx = e1[1] * e2[2] - e1[2] * e2[1], npy = e1[2] * e2[0] - e1[0] * e2[2], npz = e1[0] * e2[1] - e1[1] * e2[0]
  const orient = (npx * sn[0] + npy * sn[1] + npz * sn[2]) > 0 ? -1 : 1
  let E = 0
  const m = poly.length
  for (let i = 0; i < m; i++) {
    const a = poly[i], b = poly[(i + 1) % m]
    let ax = a[0] - p[0], ay = a[1] - p[1], az = a[2] - p[2]
    let bx = b[0] - p[0], by = b[1] - p[1], bz = b[2] - p[2]
    const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz)
    if (la < EPSA || lb < EPSA) continue
    ax /= la; ay /= la; az /= la; bx /= lb; by /= lb; bz /= lb
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx
    const lc = Math.hypot(cx, cy, cz)
    if (lc < EPSA) continue
    const beta = Math.atan2(lc, ax * bx + ay * by + az * bz)     // 안정적인 각(acos보다 낫다)
    E += beta * ((cx * n[0] + cy * n[1] + cz * n[2]) / lc)
  }
  E *= 0.5 * orient
  return E > 0 ? E : 0                                            // 표면 등 뒤 몫은 버린다
}
// ── ★191 해석적 입체각 — 죽어 있던 wrap·amb를 되살린다(2026.08.27 현도 실증) ────
//  ⛔**규명: `BAKE_WRAP`·`BAKE_AMB`는 ★186 이후 아무 효과가 없었다.** 해석 경로(BAKE_POLY_ON=true)로
//   갈아탈 때 `polysIrradiance`에 두 인자를 안 넘겼다 — 기제는 점 표본 경로에만 살아 있었고 그 경로는 안 쓰인다.
//   DESIGN.md의 "기제는 보존계로 존치"는 사실과 달랐고, 검사 [152]는 노브 위생만 물어 못 잡았다(공허참).
//   현도 실증(수직면이 전부 shade 0.030 = FLOOR 바닥)이 그 결과다.
//  ★열쇠 = **amb의 정의가 곧 입체각이다.** ★181의 amb는 "수신 코사인 **없는** 개구 가시량"인데,
//   ∫ cosθ_s/r² dA = dΩ 이므로 그 적분은 정확히 점 P에서 본 개구의 **입체각 Ω**다.
//   ⇒ 표본 없이 닫힌 식으로 풀 수 있다(★186이 조사량에 한 일을 가시량에 그대로 한다).
//  ⚠wrap은 클램프 max(0,·) 때문에 엄밀한 닫힌 형태가 없다 — (E + w·Ω)/(1+w)로 근사한다.
//   등 뒤 깊은 영역을 안 버리는 근사이고, w=0이면 **원식과 항등**이다(보존계가 정확히 열린다).
const EPS_SA = 1e-12
/** 평면 다각형이 점 p에 이루는 입체각(부호 없음) — Van Oosterom & Strackee 삼각형 팬.
 *  ⚠발광 반구 판정은 polyIrradiance와 **같은 규약**을 쓴다(개구 뒤면 0). */
export function polySolidAngle(p, poly, sn) {
  const d0 = sn[0] * (p[0] - poly[0][0]) + sn[1] * (p[1] - poly[0][1]) + sn[2] * (p[2] - poly[0][2])
  if (d0 <= EPSA) return 0
  const u = (q) => { const v = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], l = Math.hypot(v[0], v[1], v[2])
    return l < EPS_SA ? null : [v[0] / l, v[1] / l, v[2] / l] }
  const a = u(poly[0]); if (!a) return 0
  let O = 0
  for (let i = 1; i < poly.length - 1; i++) {
    const b = u(poly[i]), c = u(poly[i + 1]); if (!b || !c) continue
    const tri = a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])
    const den = 1 + (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) + (a[0] * c[0] + a[1] * c[1] + a[2] * c[2])
      + (b[0] * c[0] + b[1] * c[1] + b[2] * c[2])
    O += 2 * Math.atan2(tri, den)
  }
  return Math.abs(O)
}
export function polysSolidAngle(p, polys) {
  let O = 0
  for (const q of polys) O += polySolidAngle(p, q.v, q.n)
  return O
}
/** ★191 조사량 = 직사(코사인 가중) + wrap·amb(입체각 몫). wrap=amb=0이면 polysIrradiance와 항등. */
export function polysIrradianceW(p, n, polys, { wrap = BAKE_WRAP, amb = BAKE_AMB } = {}) {
  const E = polysIrradiance(p, n, polys)
  if (wrap <= 0 && amb <= 0) return E                      // 보존계 — 한 글자도 안 달라진다
  const O = polysSolidAngle(p, polys)
  return (E + wrap * O) / (1 + wrap) + amb * O
}

/** 다각형 여러 장의 합 — 개구가 '중앙 원판 + 부채꼴'처럼 나뉘어도 그냥 더한다(서로 겹치지 않으므로 정확) */
export function polysIrradiance(p, n, polys) {
  let E = 0
  for (const q of polys) E += polyIrradiance(p, n, q.v, q.n)
  return E
}
/** 원판 개구 → **다각형 한 장**(램버트 공식은 단순 다각형이면 성립 — 쪼갤 이유가 없다. 변 수 = 비용) */
export function diskPolys({ c, r, sn = [0, -1, 0], seg = 24 }) {
  const v = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    v.push([c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)])
  }
  return [{ n: sn, v }]
}
/** 고리-부채꼴 개구 → **다각형 한 장**(바깥 호 정방향 + 안쪽 호 역방향으로 폐합) */
export function annulusSectorPolys({ c, r0, r1, a0, da, sn = [0, -1, 0], seg = 16 }) {
  const v = []
  for (let i = 0; i <= seg; i++) { const t = a0 + (i / seg) * da
    v.push([c[0] + r1 * Math.cos(t), c[1], c[2] + r1 * Math.sin(t)]) }
  for (let i = seg; i >= 0; i--) { const t = a0 + (i / seg) * da
    v.push([c[0] + r0 * Math.cos(t), c[1], c[2] + r0 * Math.sin(t)]) }
  return [{ n: sn, v }]
}

/** A구획 베이크 명세 — 두 절(★175-f의 빛기둥 2절과 같은 구조):
 *   하절 = 착지 디스크 구멍(r6, y=DISC_Y_LO)이 방을 공급 / 상절 = 첨탑 꼭지 구멍(holeR)이 우물을 공급.
 *   eRef = 각 절의 축상 착지점(하절 = 방 바닥 중앙 · 상절 = 디스크 상면 중앙)의 조사량 → 거기서 shade 1.
 *   전부 파생 — 손 반경·손 y 0. */
//  ★183 2차 베이크 — 반사 공급지(2026.08.27 현도 ⓑ '정공법'):
//   1차(★176)는 개구 → 표면의 직사뿐이라 개구를 못 보는 면(챌면·밑면)이 칠흑이었다(★181 wrap/amb는 임시방편 — 되돌림).
//   2차 = **빛이 착지한 웅덩이를 위로 발광하는 2차 광원으로 삼는다**(단일 반사). 전부 파생:
//    하절 웅덩이 = 축상 원판(반경 = 빛기둥 프로파일의 바닥 반경) + 틈 그림자 부채꼴(틈과 같은 각·반경, 바닥에 투영)
//    상절 웅덩이 = 디스크 상면의 살(C자 그대로 — 빛이 앉는 곳이 곧 발광면)
//   세기 = BAKE_BOUNCE 한 노브(알베도·복사휘도 비를 흡수 — 규율 41: 물리 정확성은 수단).
export function zoneABakeSpec() {
  const S = spireSpec()
  //  ★180 하절 공급지 = 디스크 구멍 **+ 트인 틈**(2026.08.27 현도 지적: "완전한 도넛이 아니라 안쪽이 베어물린 도넛").
  //   디스크는 C자다(살 sweep · 틈 gap, 반경 rIn~rOut 전폭) — 그 틈으로도 빛이 쏟아지는데 ★176은 구멍만 셌다.
  //   ⚠표본당 면적을 원판과 같게 맞춰 개수를 배분한다(평균 집계에서 밀도 = 가중치 — 안 맞추면 좁은 구멍이 과대평가된다).
  const D = discSpec()
  //  ⚠방위 규약(규율 32): **틈 = wA→+gap** · **살 = wB→+sweep**. ★180 초판은 둘 다 거꾸로 넣어
  //   공급지를 살 위에 얹고 반사면을 틈 위에 얹었다(현도 실증으로 ★186에서 발각).
  const aPer = Math.PI * DISC_HOLE_R * DISC_HOLE_R / BAKE_N          // 원판의 표본당 면적
  const aGap = (D.gap / 2) * (D.rOut * D.rOut - D.rIn * D.rIn)       // 틈 부채꼴 면적
  const nGap = Math.max(1, Math.round(aGap / aPer))
  //  ★186 해석 경로용 다각형(점 표본은 검사·보존계용으로 존치)
  const lowerP = [
    ...diskPolys({ c: [0, DISC_Y_LO, 0], r: DISC_HOLE_R }),
    ...(BAKE_DISC_GAP_ON ? annulusSectorPolys({ c: [0, DISC_Y_LO, 0], r0: D.rIn, r1: D.rOut, a0: D.wA, da: D.gap }) : []),
  ]
  const upperP = diskPolys({ c: [0, S.tipY, 0], r: S.holeR })
  const lower = [
    ...supplyDiskSamples({ c: [0, DISC_Y_LO, 0], r: DISC_HOLE_R }),
    ...(BAKE_DISC_GAP_ON
      ? supplyAnnulusSectorSamples({ c: [0, DISC_Y_LO, 0], r0: D.rIn, r1: D.rOut, a0: D.wA, da: D.gap, n: nGap })
      : []),
  ]
  const upper = supplyDiskSamples({ c: [0, S.tipY, 0], r: S.holeR })
  //  ── ★183 반사 공급지(위로 발광 sn=[0,1,0] — cs 검사가 자기 평면 아래는 자동으로 0으로 만든다) ──
  const EPS_Y = 1e-3
  const nodes = shaftNodes()
  const poolR = nodes.lower[1][1]                                    // 빛기둥 바닥 반경(파생)
  const nPool = BAKE_N
  const aPerB = Math.PI * poolR * poolR / nPool                      // 반사 표본당 면적 기준
  const aGapFl = (D.gap / 2) * (D.rOut * D.rOut - D.rIn * D.rIn)
  const nGapFl = Math.max(1, Math.round(aGapFl / aPerB))
  const aDiscTop = (D.sweep / 2) * (D.rOut * D.rOut - D.rIn * D.rIn)
  const nDiscTop = Math.max(1, Math.round(aDiscTop / aPerB))
  const bounceLo = [
    ...supplyDiskSamples({ c: [0, ROOM_FLOOR_Y + EPS_Y, 0], r: poolR, sn: [0, 1, 0] }),
    ...supplyAnnulusSectorSamples({ c: [0, ROOM_FLOOR_Y + EPS_Y, 0], r0: D.rIn, r1: D.rOut, a0: D.wA, da: D.gap, n: nGapFl, sn: [0, 1, 0] }),
  ]
  const bounceUp = supplyAnnulusSectorSamples({ c: [0, D.yTop + EPS_Y, 0], r0: D.rIn, r1: D.rOut, a0: D.wB, da: D.sweep, n: nDiscTop, sn: [0, 1, 0] })
  const bounceLoP = [
    ...diskPolys({ c: [0, ROOM_FLOOR_Y + EPS_Y, 0], r: poolR, sn: [0, 1, 0] }),
    ...annulusSectorPolys({ c: [0, ROOM_FLOOR_Y + EPS_Y, 0], r0: D.rIn, r1: D.rOut, a0: D.wA, da: D.gap, sn: [0, 1, 0] }),
  ]
  const bounceUpP = annulusSectorPolys({ c: [0, D.yTop + EPS_Y, 0], r0: D.rIn, r1: D.rOut, a0: D.wB, da: D.sweep, sn: [0, 1, 0], seg: 20 })
  //  eRef도 같은 합성(직사 + BOUNCE·반사)으로 — 기준점 항등 유지(노브를 밀어도 축상 착지점 shade 1)
  //  ★191: 해석 경로도 wrap·amb를 받는다(죽어 있던 노브 복원 — 둘 다 0이면 이전과 항등).
  //  ⚠**wrap·amb는 직사에만 건다.** 반사에도 걸었더니 옆면이 0.030 → 0.952로 폭주했다. 이유 둘:
  //   ⑴반사는 이미 '튄 빛'이다 — 거기 또 wrap을 얹으면 이중 계산이다(★181의 wrap은 직사 개구용 근사였다).
  //   ⑵상절 기준점은 반사면(디스크 상면)과 **같은 평면**에 앉아 반사 Ω를 못 받는다(실측 E·Ω 둘 다 0).
  //    기준점만 못 받는 큰 Ω가 다른 점에 더해지니 비(t)가 통째로 터진다.
  const eAt = (p, n, seg) => BAKE_POLY_ON
    ? polysIrradianceW(p, n, seg.polys) + BAKE_BOUNCE * polysIrradiance(p, n, seg.bouncePolys)
    : bakeIrradianceAt(p, n, seg.samples) + BAKE_BOUNCE * bakeIrradianceAt(p, n, seg.bounce)
  const lowSeg = { samples: lower, bounce: bounceLo, polys: lowerP, bouncePolys: bounceLoP }
  const upSeg = { samples: upper, bounce: bounceUp, polys: upperP, bouncePolys: bounceUpP }
  lowSeg.eRef = eAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], lowSeg)
  upSeg.eRef = eAt([0, DISC_Y_HI, 0], [0, 1, 0], upSeg)
  return { spire: S, splitY: (DISC_Y_LO + DISC_Y_HI) / 2, lower: lowSeg, upper: upSeg, eAt }
}
/** 정점 하나의 베이크 밝기 배율 ∈ [BAKE_FLOOR, 1] */
//  ★183 톤 곡선 — 구 곡선 min(1, t)는 **잘라내기**라 개구 근처(조사량이 기준점의 수 배)가 전부 순백으로 눌리고
//   ('이상한 곳이 밝아졌어' — 실측 t=3.7 클립), 먼 곳은 γ가 뭉갰다. 'soft' = 1−exp(−t): 잘리지 않고 수렴한다
//   (t=1 → 0.632 · t=3.7 → 0.975 — 계조가 남는다). ⛔'clip' = ★176 곡선(보존계 · BAKE_BOUNCE=0과 짝지으면 ★179 체제).
export function toneCurve(t, mode = BAKE_TONE, g = BAKE_GAMMA) {
  const x = mode === 'soft' ? 1 - Math.exp(-t) : Math.min(1, t)
  return g === 1 ? x : Math.pow(x, g)
}
//  ★185 절 배정 — 구 규칙은 높이 하나(splitY)였다. 그런데 **디스크 개구(중앙 구멍·트인 틈) 안**에는 디스크가 없다:
//   거기 선 점은 우물이 그대로 열려 있어 상절에 속한다. 구 규칙은 y∈[DISC_Y_LO, splitY]인 개구 안의 점을 하절로 몰아
//   **아래로 발광하는 하절 개구를 등지게** 만들어 조사량 0 → 칠흑이었다(현도 실증: 틈으로 올라온 계단 free:14.49,100.06,-1.65).
export function zoneASegOf(pos, Z) {
  if (pos[1] >= Z.splitY) return Z.upper
  if (BAKE_DISC_OPEN_SEG && pos[1] >= DISC_Y_LO) {
    const D = discSpec()
    const r = Math.hypot(pos[0], pos[2])
    if (r < D.rIn) return Z.upper                                   // 중앙 구멍
    if (r <= D.rOut) {                                              // 고리 대역 — 트인 틈인가
      const TAU = Math.PI * 2
      const rel = (((Math.atan2(pos[2], pos[0]) - D.wA) % TAU) + TAU) % TAU
      if (rel <= D.gap) return Z.upper
    }
  }
  return Z.lower
}
export function zoneAShadeAt(pos, n, Z = zoneABakeSpec()) {
  const seg = zoneASegOf(pos, Z)
  const E = Z.eAt ? Z.eAt(pos, n, seg)
    : bakeIrradianceAt(pos, n, seg.samples) + BAKE_BOUNCE * bakeIrradianceAt(pos, n, seg.bounce)
  return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(E / seg.eRef)
}
/** A구획 '내부' 판정(방 로컬 좌표 — 그룹 x=ROOM_CX 평행이동 이전) —
 *   ① 방 타원구 중립면 안(ρ≤1: 안면은 ρ<1·바깥면은 ρ>1 — 안팎이 여기서 갈린다)
 *   ② 첨탑 대역(yB~tipY)의 벽 중립면 안(rxz ≤ 바깥반경 − T/2). yT 위(피니얼)는 rTopOut로 클램프 */
//  ★179 갓 중립면 = 우물의 천장(2026.08.27 현도 실증 — 꼭지 바깥이 검어짐).
//   yT 위는 관이 끝나고 **핀 기둥(링 rTopOut−T/2) + 갓 셸**이 선다. 갓은 원뿔(구멍 holeR@tipY → finCapR@finColTop)이라
//   반경만 보는 판정은 갓의 *윗면*(하늘 보는 면)까지 삼킨다 — 실측: 꼭지 바깥벽 288정점이 전부 '안'으로 먹혔다.
//   → 상절의 천장을 갓 중립면으로 준다. 수직 오프셋 = 수직두께 = capT·√(1+기울기²) (평행 오프셋의 정의 — 손 수치 0).
export function capMidY(rxz, S = spireSpec()) {
  const slope = S.finCapH / (S.finCapR - S.holeR)          // dy/dr (구멍에서 처마로 내려간다)
  //  구멍 안(r<holeR)은 갓이 없다 → 반경을 림에 클램프해 중립면을 **수평으로 연장**한다(분기 없는 한 식).
  //  ⚠특례로 tipY를 주면 구멍 림의 윗면(y=tipY)이 도로 '안'이 된다 — 표본 판정이 적발.
  return S.tipY - (Math.max(rxz, S.holeR) - S.holeR) * slope - S.capT * Math.hypot(1, slope) / 2
}
export function zoneAInterior(p, S = spireSpec()) {
  const rxz = Math.hypot(p[0], p[2])
  const rho = Math.hypot(rxz / ROOM_R, (p[1] - ROOM_FLOOR_Y) / ROOM_HEIGHT)
  if (rho <= 1) return true
  if (p[1] >= S.yB && p[1] <= S.tipY + 1e-6) {
    const rOut = p[1] <= S.yT ? wellWallR(p[1], { spec: S, forceSpire: true }) : S.rTopOut
    if (rxz > rOut - S.T / 2) return false
    //  ★179: 상절은 천장(갓 중립면)도 넘지 않아야 안이다. 하절(관 안)은 위가 열려 있으므로 무조건.
    if (BAKE_TIP_CAP_ON && p[1] > S.yT && p[1] > capMidY(rxz, S) + 1e-9) return false
    return true
  }
  return false
}

// ── ★189 빛기둥 실루엣 facing — 경계선의 닫힌 식(2026.08.27 현도 실증) ──────
//  빛기둥은 원뿔대 껍질에 프레넬형 알파를 입힌 눈속임이다. 실루엣에서 알파가 0으로 떨어져야 윤곽이 안 보이는데,
//  **원뿔대는 그렇지 않다**: 실루엣 접점에서 법선의 수평 성분은 시선과 정확히 수직이라 사라지지만,
//  옆면이 기울어 있으면 **축방향 성분이 남는다**. 그 남는 몫이 곧 현도가 본 선이다.
//   ⇒ 아래 식은 그 몫의 닫힌 형태다(표본 없음). axial 체제는 법선에 축방향 성분 자체가 없으므로 항등적으로 0.
//   ⚠셰이더(GLSL)는 노드에서 못 돌린다 — 이 함수는 **주장의 검증용**이고, 셰이더가 같은 식을 쓰는지는 배선 항이 문다.
export function shaftSilhouetteFacing({ slope, dh, dy, axial = SHAFT_EDGE_AXIAL }) {
  if (axial) return 0                                   // 축 기준 반경방향 = 실루엣에서 시선과 정확히 수직
  const v = Math.hypot(dh, dy)
  if (v < 1e-12) return 0
  return (Math.abs(dy) / v) * (Math.abs(slope) / Math.hypot(1, slope))
}
/** ★190 빛기둥 세로 감쇠 곡선 — 셰이더 `len`과 같은 식(검증용 순수 사본).
 *  하단 깃털 · 위로 갈수록 진해짐 · **상단 깃털**(★190). topFade=0이면 구 체제와 항등.
 *  ⚠GLSL은 노드에서 못 돌린다 — 이 함수는 곡선의 성질을 무는 용도이고, 셰이더가 같은 식인지는 배선 항이 문다. */
export function shaftLenCurve(vY, topFade = SHAFT_TOP_FADE) {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const top = topFade > 0 ? 1 - ss(1 - topFade, 1, vY) : 1
  return ss(0, 0.18, vY) * (0.30 + 0.70 * vY) * top
}

/** 빛기둥 사슬의 세그먼트별 기울기(dr/dy) — 실기하에서 유도(손 수치 0) */
export function shaftSlopes(S = shaftNodes()) {
  const out = []
  for (const key of ['upper', 'lower']) {
    const n = S[key]; if (!n || n.length < 2) continue
    for (let i = 0; i < n.length - 1; i++) {
      const [yA, rA] = n[i], [yB, rB] = n[i + 1]
      out.push({ key, i, slope: (rA - rB) / (yA - yB), yA, yB, rA, rB })
    }
  }
  return out
}

// ── ★188 D구획(드럼 홀) 베이크 — 공급지 = 갓 링 슬릿 ─────────────────
//  ⛔**★176-b 예측 정정(실측이 문서를 이겼다)**: DESIGN.md ⓪¹은 "`supplyRingSamples`(이미 있음)에
//   갓 링 슬릿 실기하를 물리면 된다"고 적었으나, 실기하를 재 보니 슬릿은 **수평 고리가 아니라 수직 원통 띠**다
//   (반경 26 · y = cutY 202.381 ~ lidY 207.381 · 높이 GAT_SLIT 5 · 기둥 16기가 둘레 23.5% 잠식).
//   supplyRingSamples는 두께가 0이고 발광 법선 `sn`이 **전 표본 공통**이라 이 기하를 표현할 수 없다 —
//   원통 띠는 표본마다 법선이 다르다(각자 안쪽 수평).
//  ★그럼에도 ★176 ⑴의 일반화 약속은 지켜졌다: **베이커 본체는 한 글자도 안 바뀐다.**
//   `bakeIrradianceAt`은 표본별 `s.n`을 읽고 `polyIrradiance`는 폴리곤별 `sn`을 받는다 — 갈아 끼운 것은 생성기뿐이다.
//  ⚠A와 기제가 반대(★175-j ⑵): A = 위에서 떨어지는 수직 낙하광 / D = 옆에서 들어오는 **측면 유입**.

/** 갓 링 슬릿 실기하 — 기둥 GAT_POSTS기가 잠식하고 남은 트인 방위 구간들. 전부 파생(손 수치 0) */
//  ⚠방위 규약(규율 32 — ★185에서 살 구간을 틈이라 부른 전례): 기둥 중심 = i·step (Corridor.jsx가 그리는 위상
//   `t=(i/GAT_POSTS)*2π`와 **같은 식**). 트인 구간 = 기둥 i와 i+1 **사이** = [i·step+half, (i+1)·step−half].
export function gatSlitSpec() {
  const g = gatCap()
  const half = Math.asin(GAT_POST_R / GAT_CROWN_R)          // 기둥 하나가 링에서 가리는 반각
  const step = (Math.PI * 2) / GAT_POSTS
  const arcs = []
  for (let i = 0; i < GAT_POSTS; i++) {
    const da = step - 2 * half
    if (da > 0) arcs.push({ a0: i * step + half, da })
  }
  return { cx: COR_CX, R: GAT_CROWN_R, y0: g.cutY, y1: g.lidY, baseY: g.baseY, half, step, arcs }
}
/** 원통 띠 공급지 표본(점 경로 — 보존계·검사용). 발광 법선 = 안쪽 수평이라 **표본마다 다르다** */
//  ⚠구간별 표본 수를 각폭에 비례 배분한다(평균 집계에서 밀도 = 가중치 — supplyAnnulusSector와 같은 규율).
export function supplyCylinderBandSamples({ cx, R, y0, y1, arcs, n = BAKE_N }) {
  const out = []
  const total = arcs.reduce((t, a) => t + a.da, 0)
  for (const a of arcs) {
    const k = Math.max(1, Math.round((n * a.da) / total))
    for (let i = 0; i < k; i++) {
      const u = (i + 0.5) / k, v = (i * 0.7548776662466927) % 1     // R2 저불일치(부채꼴 생성기와 같은 상수)
      const t = a.a0 + u * a.da, c = Math.cos(t), sn = Math.sin(t)
      out.push({ p: [cx + R * c, y0 + v * (y1 - y0), R * sn], n: [-c, 0, -sn] })
    }
  }
  return out
}
/** 원통 띠 개구 → 평면 사각형 여러 장(구간마다 seg 조각 — 곡면을 현으로 근사).
 *  ⚠각 조각은 **정확히 평면이다**(현을 품는 수직 평면) — 램버트 폴리곤 공식의 전제를 만족한다.
 *   근사가 있는 곳은 곡면→현 대체뿐이고, 검사가 seg 수렴으로 그 오차를 문다. */
export function cylinderBandPolys({ cx, R, y0, y1, arcs, seg = BAKE_D_SEG }) {
  const out = []
  for (const a of arcs) {
    for (let j = 0; j < seg; j++) {
      const t0 = a.a0 + (j / seg) * a.da, t1 = a.a0 + ((j + 1) / seg) * a.da, tm = (t0 + t1) / 2
      const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1)
      out.push({
        n: [-Math.cos(tm), 0, -Math.sin(tm)],                        // 안쪽 수평(빛은 통 안으로 들어온다)
        v: [[cx + R * c0, y0, R * s0], [cx + R * c1, y0, R * s1],
            [cx + R * c1, y1, R * s1], [cx + R * c0, y1, R * s0]],
      })
    }
  }
  return out
}
/** D구획 베이크 명세 — **단일 절**이다(A의 두 절과 갈리는 지점).
 *  A가 절을 나눈 것은 공급지가 둘이었기 때문(디스크 구멍·꼭지 구멍)이고, D는 개구가 링 슬릿 하나뿐이다.
 *  eRef = 홀 바닥 중앙(축상 착지점) → 거기서 shade 1. 링 광원이라 축상이 최대인 것은 ★175-j ⑷의 귀결이다. */
//  ★반사 공급지(★183과 같은 어법) = 홀 바닥이 위로 발광하는 2차 광원. 세기 = BAKE_BOUNCE(A와 공유).
//   ⚠1차 근사 선언: 바닥 원판을 **드럼 전폭(r ≤ COR_R)**으로 둔다. 실제로는 중앙 r<63이 사발로 파여 있으나,
//    사발도 빛을 받아 되쏘므로 전폭 근사가 구멍을 비우는 것보다 참에 가깝다. 정밀화는 차폐 도입(A급) 때.
export function zoneDBakeSpec() {
  const S = gatSlitSpec()
  const rOut = COR_R / Math.cos(Math.PI / GAT_FACETS)              // 갓 양태 바깥 다각형(드럼 벽 외접 — Corridor와 같은 식)
  const coneR = (y) => S.R + ((S.baseY - y) * (rOut - S.R)) / GAT_CONE_H   // 양태 깔때기 반경(밑동에서 R, 아래로 벌어진다)
  const EPS_Y = 1e-3
  const FLOOR_Y = 0                                                // 홀 바닥 = 드럼 벽 기립선(wallGeo가 y0에서 세운다) = 고리판 상면
  const polys = cylinderBandPolys(S)
  const samples = supplyCylinderBandSamples(S)
  const bouncePolys = diskPolys({ c: [COR_CX, FLOOR_Y + EPS_Y, 0], r: COR_R, sn: [0, 1, 0] })
  const bounce = supplyDiskSamples({ c: [COR_CX, FLOOR_Y + EPS_Y, 0], r: COR_R, sn: [0, 1, 0] })
  //  ★191: 해석 경로도 wrap·amb를 받는다(죽어 있던 노브 복원 — 둘 다 0이면 이전과 항등).
  //  ⚠**wrap·amb는 직사에만 건다.** 반사에도 걸었더니 옆면이 0.030 → 0.952로 폭주했다. 이유 둘:
  //   ⑴반사는 이미 '튄 빛'이다 — 거기 또 wrap을 얹으면 이중 계산이다(★181의 wrap은 직사 개구용 근사였다).
  //   ⑵상절 기준점은 반사면(디스크 상면)과 **같은 평면**에 앉아 반사 Ω를 못 받는다(실측 E·Ω 둘 다 0).
  //    기준점만 못 받는 큰 Ω가 다른 점에 더해지니 비(t)가 통째로 터진다.
  const eAt = (p, n, seg) => BAKE_POLY_ON
    ? polysIrradianceW(p, n, seg.polys) + BAKE_BOUNCE * polysIrradiance(p, n, seg.bouncePolys)
    : bakeIrradianceAt(p, n, seg.samples) + BAKE_BOUNCE * bakeIrradianceAt(p, n, seg.bounce)
  const seg = { samples, bounce, polys, bouncePolys }
  //  ★기준점 = **크라운 통 밑동 축상**(빛이 홀로 들어서는 문턱) — A의 '착지점'과 갈리는 지점이다.
  //   ⛔A의 어법(바닥 중앙)을 그대로 옮기면 안 된다: 실측 결과 D의 바닥 중앙은 축상 **최소**다
  //    (직사 조도 y0 1.83e-3 ↔ y190 2.98e-1 = **163배**). 바닥을 1로 잡으면 홀 상부 전체가 포화한다(실측 0.97~1.00).
  //   기준을 문턱에 두면 홀은 그보다 어둡고, 그 어둠을 눈에 보이게 펴는 일은 톤 노브가 맡는다(관심사 분리).
  seg.eRef = eAt([COR_CX, S.baseY, 0], [0, 1, 0], seg)
  return { slit: S, coneR, rOut, floorY: FLOOR_Y, seg, eAt }
}
/** D구획 '내부' 판정 — 월드 좌표(A와 달리 평행이동 없음: 드럼은 원점계에 서 있다).
 *   ① 크라운 통(baseY~cutY): 반경 GAT_CROWN_R 안 ② 갓 양태 깔때기(천장~baseY): coneR(y) 안
 *   ③ 드럼 홀(사발 바닥~빗면 천장): 반경 COR_R 안
 *  ⚠슬릿(cutY) 위는 밖이다 — 거기부터는 기둥·리드의 자리이고, 개구 자체는 '안'에 안 넣는다. */
export function zoneDInterior(p, D = zoneDBakeSpec()) {
  const S = D.slit
  const r = Math.hypot(p[0] - S.cx, p[2])
  if (p[1] > S.y0 + 1e-6) return false
  if (p[1] >= S.baseY) return r <= S.R
  if (p[1] > ceilY(p[0])) return r <= D.coneR(p[1])
  return p[1] >= -CUP_R && r <= COR_R
}
/** D구획 정점 하나의 베이크 밝기 배율 ∈ [BAKE_FLOOR, 1] — 톤 곡선·바닥·감마는 A와 **같은 노브** */
export function zoneDShadeAt(pos, n, D = zoneDBakeSpec()) {
  const E = D.eAt(pos, n, D.seg)
  //  ⚠**D 전용 감마**(BAKE_D_GAMMA) — 주석에 "D 전용 톤 노브는 안 만든다"고 적었다가 실측이 뒤집었다.
  //   사유는 취향이 아니라 기하다: A의 개구는 여정 공간 **안**(방 천장의 디스크 구멍)이라 조도 범위가 좁지만,
  //   D의 개구는 홀 바닥에서 202 위에 있어 역제곱만으로 163배가 벌어진다. 한 감마로 둘을 덮을 수 없다.
  //   FLOOR·TONE·BOUNCE·POLY_ON은 여전히 공유한다 — 갈라야 했던 것은 **압축률 하나뿐**이다.
  return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(E / D.seg.eRef, BAKE_TONE, BAKE_D_GAMMA)
}

// ── ★178 경계 분할(2026.08.27 현도 ⓒ) ────────────────────────
//  베이크는 정점색이라, 한 삼각형이 구획 경계를 걸치면 GPU 보간이 어둠을 바깥면으로 번지게 한다
//  (★176 "구획 밖 정점 = 화면 불변"은 정점 단위로만 참 — 픽셀 단위로는 거짓. 실측: 바깥 오염 7,020).
//  해법 = 걸친 삼각형만 최장변 재귀 이분: 경계선이 정점 해상도로 근사되고, 새 정점은 전부 부모 변의
//  중점이라 위치 이동 0 = 실루엣·면 불변(색 해상도만 는다). 순수 배열·three 무의존 — check_lux가 같은 함수를 문다.
//  attrs: { name: {array, itemSize} } 비인덱스 수프(position 필수) · classify(x,y,z)→bool(월드 판정 콜백) ·
//  eps = 걸친 삼각형에 허용하는 최장변 상한(파생 = BAKE_SPLIT_EPS).
export function splitSoupAtBoundary(attrs, classify, eps, normalizeNames = ['normal']) {
  const names = Object.keys(attrs)
  const nTri = (attrs.position.array.length / 9) | 0
  const out = {}; for (const nm of names) out[nm] = []
  let straddle0 = 0, emitted = 0
  const corner = (tri, k) => { const c = {}
    for (const nm of names) { const it = attrs[nm].itemSize, b = (tri * 3 + k) * it
      c[nm] = Array.prototype.slice.call(attrs[nm].array, b, b + it) }
    return c }
  const flagOf = (c) => !!classify(c.position[0], c.position[1], c.position[2])
  const d2 = (a, b) => { const p = a.position, q = b.position
    const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; return dx * dx + dy * dy + dz * dz }
  const mid = (a, b) => { const c = {}
    for (const nm of names) { const A = a[nm], B = b[nm], M = new Array(A.length)
      for (let i = 0; i < A.length; i++) M[i] = (A[i] + B[i]) / 2
      if (normalizeNames.includes(nm)) { let L = 0; for (const x of M) L += x * x; L = Math.sqrt(L) || 1
        for (let i = 0; i < M.length; i++) M[i] /= L }
      //  ⚠저장은 Float32다 — 판정을 저장 정밀도에 맞춘다(fround). 안 맞추면 경계 위 정점이 반올림으로
      //  판정이 뒤집혀, '균일'로 emit한 큰 삼각형이 런타임에서 걸친 삼각형이 된다(검사 [108]이 적발).
      for (let i = 0; i < M.length; i++) M[i] = Math.fround(M[i])
      c[nm] = M }
    return c }
  const emit = (A, B, C) => { emitted++
    for (const nm of names) out[nm].push(...A[nm], ...B[nm], ...C[nm]) }
  const eps2 = eps * eps, stack = []
  for (let t = 0; t < nTri; t++) {
    const A = corner(t, 0), B = corner(t, 1), C = corner(t, 2)
    const fa = flagOf(A), fb = flagOf(B), fc = flagOf(C)
    const su = (fa ? 1 : 0) + (fb ? 1 : 0) + (fc ? 1 : 0)
    if (su === 0 || su === 3) { emit(A, B, C); continue }
    straddle0++
    //  깊이 예산: 4분할은 매 단계 '모든' 변을 정확히 반감하므로 ⌈log₂(최장변/eps)⌉면 종료가 보장된다(+1 여유).
    //  ⚠초판(최장변 이분)은 가는 삼각형에서 자식이 부모의 긴 변을 물려받아 예산 안에 수렴하지 못했다 — 검사 [102]가 적발.
    const m2 = Math.max(d2(A, B), d2(B, C), d2(C, A))
    const depth = Math.max(0, Math.ceil(Math.log2(Math.sqrt(m2) / eps))) + 1
    stack.push([A, B, C, fa, fb, fc, depth])
  }
  while (stack.length) {
    const [A, B, C, fa, fb, fc, depth] = stack.pop()
    const su = (fa ? 1 : 0) + (fb ? 1 : 0) + (fc ? 1 : 0)
    const m2 = Math.max(d2(A, B), d2(B, C), d2(C, A))
    if (su === 0 || su === 3 || m2 <= eps2 || depth <= 0) { emit(A, B, C); continue }
    //  4분할(세 변 중점 — 감김 보존은 Loop 연결과 동일): 균일해진 자식은 다음 pop에서 즉시 emit되므로 과분할 없음
    const Mab = mid(A, B), Mbc = mid(B, C), Mca = mid(C, A)
    const fab = flagOf(Mab), fbc = flagOf(Mbc), fca = flagOf(Mca)
    stack.push([A, Mab, Mca, fa, fab, fca, depth - 1])
    stack.push([Mab, B, Mbc, fab, fb, fbc, depth - 1])
    stack.push([Mca, Mbc, C, fca, fbc, fc, depth - 1])
    stack.push([Mab, Mbc, Mca, fab, fbc, fca, depth - 1])
  }
  const res = {}
  for (const nm of names) res[nm] = new Float32Array(out[nm])
  return { attrs: res, straddle: straddle0, tris: emitted, added: emitted - nTri }
}

// ── 그림자 리그 유도량(acne / 빛샘의 척도) ────────────────────
export const SHDW_TEXEL = 2 * RND_SHDW_RANGE / RND_SHDW_MAP        // 텍셀 한 변의 월드 크기
export const SHDW_BIAS_WORLD = Math.abs(RND_SHDW_BIAS) * (RND_SHDW_DIST * 2 - 1)  // bias는 깊이 NDC 단위

// ── 도구 자기검증 ─────────────────────────────────────────────
export function selfTest() {
  const ok = []
  const push = (name, cond) => ok.push([name, !!cond])
  const f = luxAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: false, shadowsOn: false, roomDark: false })
  push('ambient = LGT_AMB_I', Math.abs(f.amb - LGT_AMB_I) < 1e-12)
  push('위 향한 면 hemi = LGT_HEMI_I×sky', Math.abs(f.hemi - LGT_HEMI_I) < 1e-9)
  const d = luxAt([0, ROOM_FLOOR_Y + 40, 0], [0, -1, 0], { indoor: false, shadowsOn: false, roomDark: false })
  push('아래 향한 면 hemi = LGT_HEMI_I×gnd', Math.abs(d.hemi - LGT_HEMI_I * HEMI_GND_LUM) < 1e-9)
  push('스포트 축 위 → 감쇠 1', spotAtt(1, Math.cos(0.3), Math.cos(0.15)) === 1)
  push('원뿔 밖 → 0', spotAtt(Math.cos(0.5), Math.cos(0.3), Math.cos(0.15)) === 0)
  push('distAtt decay 0·cutoff 무한 → 1', Math.abs(distAtt(50, 0, 0) - 1) < 1e-12)
  push('distAtt 역제곱 d=10 decay 2 → 0.01', Math.abs(distAtt(10, 0, 2) - 0.01) < 1e-12)
  push('cutoff 도달 → 0', Math.abs(distAtt(170, 170, 1.1)) < 1e-12)
  // 톤매핑: 알려진 성질(단조 증가 · 0→0 · 큰 값에서 포화 · exposure/0.6 배율 반영)
  push('displayLum(0) = 0', Math.abs(displayLum(0)) < 1e-12)
  push('displayLum 단조 증가', displayLum(0.1) < displayLum(0.5) && displayLum(0.5) < displayLum(2))
  push('displayLum(2.197) > 0.94 (현행 실외 = 거의 흰색)', displayLum(2.197) > 0.94)
  push('displayLum(0.18) ≈ 0.50 (중간 회색 — 누수 판정 기준)', Math.abs(displayLum(0.18) - 0.50) < 0.03)
  return ok
}
