// lightingModel.js — ★175 조도·화면밝기 모델(three 0.184 공식 이식)
//
//  ⚠존재 이유: ★174는 "검사가 소스 문자열만 봤기 때문에" 무반응을 네 번 오진했다.
//  화면은 자체 렌더러로 볼 수 없다(§2-D ⑤ — 자체 셰이딩이라 three 광원을 모른다).
//  그래서 검증 대상을 화면이 아니라 **조도**로 옮긴다. 조도는 순수 함수라 계산·반증이 가능하다.
//
//  ⚠도구 검증(전제): three uniform 변환에 π 계수 없음 — build/three.module.js 8631·8663·8725 실측.
//   ambient / hemisphere / directional / point / spot 전부 color×intensity 동일 단위 → 직접 비교 가능.
import { BAKE_MEMO_ON } from './constants.js'   // ★217-b 조도 메모 노브
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
  SHAFT_CLEAR_ON, SHAFT_CLEAR_GAP, SPT_ON,   // ★209 빛기둥 ⊂ 내벽·테라스(허리 마디)
  BAKE_WELL, BAKE_WELL_BANDS, BAKE_WELL_SEG,   // ★192 우물 안벽 3차 광원
  BAKE_SEG_BLEND,   // ★193 절 이음 블렌드
  BAKE_WALL_FACE_ON,   // ★195 벽 살 부재(문틀·테두리) 안쪽 향 면
  BAKE_BOUNCE_UP,   // ★196 상절 전용 반사 세기(방 고정)
  BAKE_GAMMA_UP,   // ★197 상절 전용 톤 감마(방 고정)
  gatCap, ceilY, COR_CX, COR_R, CUP_R, GAT_CROWN_R, GAT_POSTS, GAT_POST_R, GAT_CONE_H, GAT_FACETS,   // ★188 D구획 = 드럼 홀 + 갓
  SHAFT_HALO_LO_CLIP_ON, ROOM_SHELL_SEG_U, wallR,   // ★209-d 하절 헤일로 절단
  BAKE_C_GAMMA, BRD_X0, BRD_EAST_X, BRD_HW, BRD_T, BRD_YW, BRD_DECK_BOT, BRD_COL_W,
  BRD_TRP_C0Y, BRD_TRP_CAPY,
  BRD_ROOF_BOT, BRD_LIGHT_Z1, BRD_LIGHT_GAP, BRD_DIM_LO, BRD_DIM_HI, BRD_DIM_SLIT, brdEndX,
  SPD_HW, SPD_H, SPD_Y0, BRD_WCUT, BRD_TRP_ON, BRD_DIM_WEST_L, BRD_DIM_WEST_SEG, BRD_DIM_WEST_G, BRD_DIM_WEST_K,
  BRD_DOOR_LIGHT_ON, BRD_DOOR_L, BRD_DOOR_SPREAD, BRD_DOOR_DX,
  SFT_DIM, SFT_GAMMA, SFT_K, SFT_LIGHT_GAP, SFT_LIGHT_SL_DX, SFT_SAMP, SFT_LIGHT_ON, SFT_LIGHT_SIDES_ON } from './constants.js'   // ★213 월대샤프트 빛
import { shaftSpec, shaftStepFoot } from './bridgeDeckGeometry.js'   // ★213 샤프트 실기하 정본(사본 0)
import { woldaeSpec, ribCutSpec } from './corridorStairsGeometry.js'   // ★210 C구획 + ★211 빛 커튼
import { trapColumnSpec, slitLinkSpec, bridgeTrapSpec, spireCutX } from './bridgeTrapGeometry.js'   // ★210 슬릿 실기하(빌더와 같은 spec — 사본 금지)
import { spireSpec, wellWallR, wellInnerClear } from './spireGeometry.js'
import { spireTerraceSpec } from './spireTerraceGeometry.js'   // ★209 테라스 구멍 = y127의 통과 구속(사본 금지)
import { discSpec } from './discGeometry.js'   // ★180 하절 공급지에 디스크 트인 틈 합류
import { pitSpec } from './defPitGeometry.js'
import { kneeSurfaceY, KNEE_XA, KNEE_XB } from './kneeStair.js'   // ★219-p 무릎길 보행면(눈 경로 대표점 — 사본 금지)
import { EYE } from './waypoints.js'   // ★219-p 눈높이 정본

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
/** ★209 사슬을 구속에 맞춰 접는다 — 순수 함수(제자리 수정 · 검사가 합성 사례로 직접 문다).
 *  chain = [[y, r], …] y 내림차순 · r 비감소. cons = [[y, 통과반경], …](순서 무관 — 여기서 정렬한다).
 *  각 구속 높이에서 현재 사슬 반경이 (통과반경 − gap)을 넘으면 그 높이에 마디를 접어 넣는다.
 *  ⚠**위→아래 순서**는 정확성이 아니라 **최소성**을 위한 것이다(2026.08.28 합성 사례로 실측 — 첫 주석은
 *   "아래부터 접으면 관통이 남는다"고 적었는데 **틀렸다**: 어느 순서든 모든 구속은 만족된다.
 *   접기는 그 높이의 반경을 한계로 **낮추기만** 하고, 이미 마디가 된 구속은 이후 접기로 안 올라간다).
 *   실제 차이 = 아래부터 접으면 위 마디가 나중에 들어와 아래 마디를 **잉여**로 만든다(합성 사례 3마디 vs 4마디).
 *   check_lux S-9이 그 최소성을 문다 — 관통이 아니라 마디 수로.
 *  새 좌표는 전부 인자에서 파생 — 손 수치 0. */
export function foldChainToClearance(chain, cons, gap) {
  const rOn = (nd, y) => {
    for (let i = 0; i < nd.length - 1; i++) {
      const [yA, rA] = nd[i], [yB, rB] = nd[i + 1]
      if (y <= yA && y >= yB) return rA + (rB - rA) * ((yA - y) / (yA - yB))
    }
    return null
  }
  let added = 0
  for (const [yk, clr] of [...cons].sort((a, b) => b[0] - a[0])) {
    if (!(yk < chain[0][0] && yk > chain[chain.length - 1][0])) continue
    const lim = clr - gap
    const r = rOn(chain, yk)
    if (r === null || r <= lim) continue
    //  ⚠구속 높이가 **이미 마디인** 경우 삽입하면 같은 y가 둘이 되어 사슬이 수직으로 점프한다
    //   (★209-b에서 헤일로를 접다 적발 — 기둥 사슬에서는 우연히 안 겹쳐 잠복해 있었다).
    //   그럴 땐 그 마디를 **끌어내린다**.
    const dup = chain.findIndex((n) => Math.abs(n[0] - yk) < 1e-9)
    if (dup >= 0) { chain[dup][1] = lim; added++; continue }
    let at = chain.length - 1
    for (let i = 0; i < chain.length - 1; i++) if (yk <= chain[i][0] && yk >= chain[i + 1][0]) { at = i + 1; break }
    chain.splice(at, 0, [yk, lim])
    added++
  }
  return added
}

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
  //  ★★★209 상절 허리 마디 — 곧은 원뿔은 팔각 허리를 뚫는다(상수 주석의 실측 참조).
  //   벽 클리어런스 정본 `wellInnerClear`의 꺾임점(y3·y2·y1)을 **위에서 아래로** 훑으며,
  //   그 높이에서 현재 사슬이 한계(clear − 여유)를 넘으면 거기에 마디를 접어 넣는다.
  //   ⚠위→아래 순서가 본질이다: 위 마디를 접으면 그 아래 기울기가 바뀌므로 다음 꺾임점은 갱신된 사슬로 재야 한다.
  //   ⚠새 좌표는 전부 파생(꺾임점 y = spireSpec · 반경 = wellInnerClear − SHAFT_CLEAR_GAP) — 손 수치 0.
  const upperRaw = upper.map((n) => [n[0], n[1]])   // ★209-b 접기 전 사슬(헤일로가 이걸 따른다)
  if (SHAFT_CLEAR_ON) {
    //  구속 목록 = [높이, 그 높이의 통과 반경].
    //   ⓐ 벽 클리어런스 꺾임점(팔각 허리가 여기서 잡힌다) ⓑ 테라스 고리 판의 구멍(y125.5에서 벽보다 좁다).
    //   ⚠ⓑ가 없으면 빛기둥이 테라스 판을 뚫는다(★209 실측 0.49 — 옛 사본이 가리고 있던 둘째 관통).
    //   ⚠슬래브(두께가 있는 구속)는 **밑면 하나만** 넣는다: 반경은 아래로 갈수록 커지므로 밑면이 곧 최악점이고,
    //    윗면까지 넣으면 기울기 0인 원기둥 절이 생겨 ★189 절 성질(전 구간 원뿔대)을 깬다.
    const cons = [[SP.y3, wellInnerClear(SP.y3, SP)], [SP.y2, wellInnerClear(SP.y2, SP)], [SP.y1, wellInnerClear(SP.y1, SP)]]
    if (SPT_ON) { const T = spireTerraceSpec({ spec: SP }); cons.push([T.yBot, T.A]) }
    foldChainToClearance(upper, cons, SHAFT_CLEAR_GAP)
  }
  //  ★★209-b 헤일로는 **접기 전** 사슬을 따른다 (2026.08.28 현도 실증 `free:-14.06,128.6,-0.58,-268,-2.1`).
  //   ⛔★209로 기둥이 가늘어지자 그 2배인 헤일로도 같이 가늘어져, **여태 전 구간 벽 밖이라 한 번도 안 그려지던**
  //    상절 헤일로가 y127.6~136.9에서 벽 안으로 들어왔다. 벽(N각 근사)과 헤일로(40세그 원뿔)가 거의 나란히
  //    스치며 교차해 테라스 걷는 면 0.55m 위에 **톱니 가로선**이 섰다.
  //   ⚠"헤일로도 접으면 되지 않나"는 실측으로 기각됐다(현도 (나) 선택 → 재고 나서 반려): 2배 번짐은
  //    상절 334표본 중 **297곳(89%)에서 벽 밖**이라, 접으면 배수가 2.0 → 1.0~1.6으로 무너져 번짐이 기둥에
  //    들러붙는다. 허리(y157.16)는 벽 여유 6.653 − 기둥 6.153 = **0.5m**뿐이다. 사슬도 두 번 잘록해진다.
  //   ⇒ 상절 헤일로는 원래대로 **우물 밖에 둔다**(화면 기여 0 — ★209 이전과 항등). check_lux S-9이 박는다.
  const upperHalo = upperRaw
  //  헤일로 배수는 위아래가 다르다 — 스케치 실측: 어깨 21/10.6 ≈ 2.0 · 방 바닥 50/9.5 ≈ 5.2.
  const haloUp = upperHalo.map(([y, r]) => [y, r * SHAFT_HALO_K_UP])
  const haloLo = lower.filter((n) => n[0] >= ROOM_FLOOR_Y).map(([y, r]) => [y, r * SHAFT_HALO_K_LO])
  //  ★★209-d 하절 헤일로 상단 절단 — 상수 주석의 실측 참조. 방 돔(타원면)을 뚫고 나가는 높이에서 자른다.
  //   기준 = 다각형 **내접** 반경(면 중앙 — 셸 함몰만큼 자동으로 여유를 먹는다). 손 수치 0.
  //   ⚠`haloLoSpan`으로 **원래 사슬 높이**를 함께 돌려준다: 페이드(uv 리맵)를 자른 사슬로 다시 재면
  //    방 안 밝기가 바뀐다. Room.jsx가 이 span으로 uv를 쓴다.
  const haloLoSpan = [haloLo[0][0], haloLo[haloLo.length - 1][0]]
  if (SHAFT_HALO_LO_CLIP_ON && haloLo.length >= 2) {
    const rOnLo = (y) => {
      for (let i = 0; i < haloLo.length - 1; i++) {
        const [yA, rA] = haloLo[i], [yB, rB] = haloLo[i + 1]
        if (y <= yA && y >= yB) return rA + (rB - rA) * ((yA - y) / (yA - yB))
      }
      return null
    }
    const kIn = Math.cos(Math.PI / ROOM_SHELL_SEG_U)          // 다각형 내접 계수(파생)
    const out = (y) => rOnLo(y) > wallR(y) * kIn
    const yTopLo = haloLo[0][0], yBotLo = haloLo[haloLo.length - 1][0]
    if (out(yTopLo) && !out(yBotLo)) {
      let lo = yBotLo, hi = yTopLo
      for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (out(m)) hi = m; else lo = m }
      const yCut = (lo + hi) / 2
      const rCut = rOnLo(yCut)                                 // ⚠자르기 **전** 사슬에서 읽는다
      const keep = haloLo.filter((n) => n[0] < yCut)
      haloLo.length = 0
      haloLo.push([yCut, rCut], ...keep)
    }
  }
  return { tanW, tanD, apY, spotY, upper, lower, haloUp, haloLo, haloLoSpan }
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
/** ★192 가중 다각형 합 — 조각마다 세기 w(층별 발광)를 곱해 더한다. w 전부 1이면 polysIrradiance와 항등 */
export function polysIrradianceWtd(p, n, polys) {
  let E = 0
  for (const q of polys) E += (q.w ?? 1) * polyIrradiance(p, n, q.v, q.n)
  return E
}
/** ★192 우물 안벽 3차 광원 — 층별 세기 분포(2026.08.28 · 현도 ㉡: 균일 근사 기각).
 *   안벽을 높이 층으로 쪼개고, **각 층이 받는 조사량에서 그 층의 발광 세기를 유도**한다(자기무결 — 손 수치 0).
 *   ⚠받는 조사량 = 상절과 **같은 합성**(직사 + BOUNCE·반사) — 직사만 세면 프로파일이 뒤집힌다:
 *    안벽 하부의 지배 광원은 꼭지 직사(1.7e-4)가 아니라 바로 밑 디스크 상면 살의 반사(0.25×O(1))다(실측 ~10³배).
 *   정규화 = 같은 합성의 상절 기준점 값(무차원 — 기하가 변해도 스케일이 안 뜬다).
 *   ⚠층 반경 = wellInnerClear(층 중심 y) — 팔각 구간은 내접원 근사(검사가 층·조각 수렴으로 오차를 문다).
 *   ⚠발광 법선 = 안쪽 수평(cylinderBandPolys가 그렇게 만든다 — D 링 슬릿과 같은 규약).
 *   ⚠층 발광은 방위 균일 근사다(반사 수신은 살 위에서만 강한데 층 전체가 그 평균으로 빛난다) —
 *    비대칭 정밀화는 차폐 도입(A급) 때. 공급지·기준은 **호출자(상절)가 준다** — 여기서 다시 만들면 사본이다. */
export function wellWallBandPolys({ directPolys, bouncePolys, refP, refN, bands = BAKE_WELL_BANDS, seg = BAKE_WELL_SEG, bounceK = BAKE_BOUNCE_UP }) {
  const S = spireSpec(), D = discSpec()
  const y0 = D.yTop, y1 = S.yT                              // 디스크 상면 → 벽 꼭대기(전부 파생 — 그 아래 벽은 디스크가 관입 봉합)
  const recv = (p, n) => polysIrradiance(p, n, directPolys) + bounceK * polysIrradiance(p, n, bouncePolys)   // ★196 상절 계수(호출자와 같은 값 — 자기일관)
  const fullArc = [{ a0: 0, da: Math.PI * 2 }]
  const out = []
  for (let k = 0; k < bands; k++) {
    const b0 = y0 + (k / bands) * (y1 - y0), b1 = y0 + ((k + 1) / bands) * (y1 - y0)
    const yc = (b0 + b1) / 2, r = wellInnerClear(yc, S)
    //  층이 받는 조사량 — 방위 평균(반사 공급지 = C자 살이라 방위 의존): 살 한가운데·틈 한가운데 두 방위의 평균.
    //  ⚠w = **원시 조사량**(스케일 자유) — 절대 스케일은 조립처(zoneABakeSpec)가 기준점 몫으로 정규화한다.
    const azs = [D.wB + D.sweep / 2, D.wA + D.gap / 2]
    const w = azs.reduce((t, a) => t + recv([r * Math.cos(a), yc, r * Math.sin(a)], [-Math.cos(a), 0, -Math.sin(a)]), 0) / azs.length
    for (const q of cylinderBandPolys({ cx: 0, R: r, y0: b0, y1: b1, arcs: fullArc, seg })) out.push({ ...q, w })
  }
  return out
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
//  ★192 opts.wellK: 우물 안벽 3차 광원 세기(기본 = BAKE_WELL 노브). 0이면 층 다각형 자체를 안 만든다
//   — eAt의 `+ 0`은 부동소수 항등이라 ★191 체제와 **비트 동일**(검사가 문다).
export function zoneABakeSpec({ wellK = BAKE_WELL, blendK = BAKE_SEG_BLEND, bounceUpK = BAKE_BOUNCE_UP, gammaUpK = BAKE_GAMMA_UP } = {}) {
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
  //  ★192 우물 안벽 3차 광원 — **상절 전용**(하절 = 방은 디스크가 가리는데 차폐 없는 1차 베이크라 넣으면 들뜬다).
  //   wrap·amb 무적용(3차 = 이미 튄 빛 — ★191 ⑶과 같은 이유) · 해석 경로 전용(점 표본 경로 = ★176 보존계라 무접촉).
  //   층 세기 유도의 공급지·기준점 = 상절의 것 그대로(합성 자기일관 — 여기가 유일한 조립처).
  //  ★비율 정규화(2026.08.28 실측 규명): 우물 항의 원시 스케일은 직사의 ~10⁵배라 그냥 더하면 노브가 소거된다
  //   (K 0.1~0.8 전 구간 동일 결과 실측 — 죽은 노브). 스케일 s를 **기준점에서 우물 몫 = wellK·(직사+반사)**로 놓으면
  //   t = (t직반 + wellK·비율(p)) / (1+wellK): 기준점 t=1이 모든 K에서 **구조적으로** 보존되고(불변식 무손상),
  //   K=0 항등 · K→∞에서 비율 지도(우물이 전부)로 수렴 — 노브 전 구간이 유효하다.
  const refP = [0, DISC_Y_HI, 0], refN = [0, 1, 0]
  const wellPolysRaw = wellK > 0
    ? wellWallBandPolys({ directPolys: upperP, bouncePolys: bounceUpP, refP, refN, bounceK: bounceUpK })
    : []
  const wallRef = wellPolysRaw.length ? polysIrradianceWtd(refP, refN, wellPolysRaw) : 0
  const eRefDB = polysIrradianceW(refP, refN, upperP) + bounceUpK * polysIrradiance(refP, refN, bounceUpP)   // ★196 상절 계수(자기일관)
  const wellS = wallRef > 0 ? wellK * eRefDB / wallRef : 0
  //  ★196 반사 세기는 **절마다 다르다**(seg.bounceK) — 하절(방) = BAKE_BOUNCE 고정 · 상절(첨탑) = BAKE_BOUNCE_UP.
  //   방에서 보이는 면은 전부 하절이므로, 상절 노브를 어떻게 밀어도 방은 비트 동일로 남는다([검사가 강제]).
  const eAt = (p, n, seg) => BAKE_POLY_ON
    ? polysIrradianceW(p, n, seg.polys) + seg.bounceK * polysIrradiance(p, n, seg.bouncePolys)
      + (seg.wellPolys && seg.wellPolys.length ? wellS * polysIrradianceWtd(p, n, seg.wellPolys) : 0)
    : bakeIrradianceAt(p, n, seg.samples) + seg.bounceK * bakeIrradianceAt(p, n, seg.bounce)
  const lowSeg = { samples: lower, bounce: bounceLo, polys: lowerP, bouncePolys: bounceLoP, bounceK: BAKE_BOUNCE, gamma: BAKE_GAMMA }
  const upSeg = { samples: upper, bounce: bounceUp, polys: upperP, bouncePolys: bounceUpP, wellPolys: wellPolysRaw, bounceK: bounceUpK, gamma: gammaUpK }
  lowSeg.eRef = eAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], lowSeg)
  upSeg.eRef = eAt([0, DISC_Y_HI, 0], [0, 1, 0], upSeg)
  //  ★193 이음 블렌드 대역 높이 = 디스크 두께 × blendK(파생 — 손 수치 0). 0이면 하드 경계(★192 체제 항등)
  const blendH = blendK * (DISC_Y_HI - DISC_Y_LO)
  return { spire: S, splitY: (DISC_Y_LO + DISC_Y_HI) / 2, lower: lowSeg, upper: upSeg, eAt, blendH }
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
/** ★193 디스크 개구(중앙 구멍·트인 틈) 판정 — 절 배정(★185)과 이음 블렌드가 **같은 함수**를 쓴다(같은 데이터 규율).
 *  ⚠r < rIn **+1e-6**: 구멍 벽 정점은 (rIn·cosθ, rIn·sinθ)로 생성돼 hypot이 rIn±수ULP로 흔들린다 —
 *   정확 비교는 정점 열마다 절이 교대해 **바코드 줄무늬**가 된다(2026.08.28 현도 실증 · 실측 60열 중 전환 22회).
 *   허용오차가 경계 위 정점을 전부 구멍(상절) 쪽으로 일관 배정한다(구멍 벽 = ★192의 표적 면 — 상절이 옳다). */
export function discGapAt(pos) {                                    // 트인 틈(C자 gap)만 — ★193 블렌드가 쓴다
  //  ★207 **방위 허용오차**(2026.08.28 현도 실증: 디스크 단면의 줄무늬 얼룩).
  //   ★193은 **반경** 경계에만 허용오차를 줬다(`r >= rIn + 1e-6`). 방위 경계는 정확 비교로 남아 있었고,
  //   틈 끝면 2장의 정점은 `atan2`가 wA를 ±ULP로 되돌려 **rel ≈ 0 ↔ rel ≈ 2π** 로 갈렸다
  //   ⇒ 같은 평면 위에서 절이 교대(실측: 끝면A 20정점 중 상 11/하 9 · 끝면B 20 중 상 15/하 5)하고
  //   상절 0.31 ↔ 하절 0.030(10배)이 이웃해 **★193 바코드의 방위판**이 된다. 병도 수리도 ★193과 같은 계열이다.
  //  ⚠경계 위 정점의 정답은 **상절**이다 — 틈 끝면·바깥 테두리면은 ★192 우물광의 표적 면이다(★194 주석의 선언).
  const D = discSpec()
  const r = Math.hypot(pos[0], pos[2])
  if (r >= D.rIn + 1e-6 && r <= D.rOut + 1e-6) {                    // ★207 바깥 테두리도 같은 허용오차(모서리 정점)
    const TAU = Math.PI * 2
    let rel = (((Math.atan2(pos[2], pos[0]) - D.wA) % TAU) + TAU) % TAU
    if (rel > TAU - 1e-6) rel = 0                                   // 시작 경계(wA) 위 정점이 한 바퀴 돌아온 것
    if (rel <= D.gap + 1e-6) return true                            // 끝 경계(wA+gap) 위 정점 포함
  }
  return false
}
export function discOpenAt(pos) {
  const D = discSpec()
  return Math.hypot(pos[0], pos[2]) < D.rIn + 1e-6 || discGapAt(pos)   // 중앙 구멍(허용오차) + 틈
}
/** ★194 틈의 **빈 공간 내부**(경계면 4장 제외) — ★193 블렌드 전용.
 *  ⚠discGapAt(절 배정용)은 경계를 **포함**해야 한다: 틈 끝면·바깥 테두리면은 상절이 정답이다(★192의 표적 면).
 *   그러나 블렌드까지 걸리면 그 **솔리드 면들이 허구 평면 취급**을 받아 아래 1.000 → 위 0.17 램프로 칠해진다
 *   (2026.08.28 현도 실증: 끝면 높이 2.58 = 블렌드 대역 2.58 → 면 전체가 램프). 그 면들은 평면을 가로지르지
 *   않고 평면 안에 서 있으므로 이음 연속이 애초에 불요 — ★193 ⑶의 구멍 기둥 제외와 같은 어법이다.
 *   여유(1e-6)는 경계 **위** 정점만 걷어낸다: 틈 안 계단(rel~0.5rad)은 그대로 블렌드된다. */
export function discGapInteriorAt(pos) {
  const D = discSpec()
  const r = Math.hypot(pos[0], pos[2])
  if (r <= D.rIn + 1e-6 || r >= D.rOut - 1e-6) return false           // 구멍 벽·바깥 테두리면 제외
  const TAU = Math.PI * 2
  const rel = (((Math.atan2(pos[2], pos[0]) - D.wA) % TAU) + TAU) % TAU
  return rel > 1e-6 && rel < D.gap - 1e-6                             // 틈 끝면 2장 제외
}
export function zoneASegOf(pos, Z) {
  if (pos[1] >= Z.splitY) return Z.upper
  if (BAKE_DISC_OPEN_SEG && pos[1] >= DISC_Y_LO && discOpenAt(pos)) return Z.upper
  return Z.lower
}
//  ★217-b 메모 — 베이크는 같은 정점을 여러 번 묻는다(비인덱스 수프 ≈ 이웃 삼각형 수만큼 · 구배 분할의 변 중점은 이웃과 2회 ·
//   분할 뒤 정점 루프가 한 번 더). 입력(점 3·법선 3 double)이 같으면 결과도 같은 double — 문자열 키(double→문자열은 왕복 정확).
//   ⚠키에 Z 정체성(WeakMap) — 절·표본이 다른 명세는 섞이지 않는다. BAKE_MEMO_ON=false = 메모 없음(값 동일).
const _zoneAMemo = new WeakMap()
export function zoneAShadeAt(pos, n, Z = zoneABakeSpec()) {
  if (BAKE_MEMO_ON) {
    let M = _zoneAMemo.get(Z); if (!M) { M = new Map(); _zoneAMemo.set(Z, M) }
    const key = pos[0] + ',' + pos[1] + ',' + pos[2] + ',' + n[0] + ',' + n[1] + ',' + n[2]
    const hit = M.get(key); if (hit !== undefined) return hit
    const v = zoneAShadeAtRaw(pos, n, Z); M.set(key, v); return v
  }
  return zoneAShadeAtRaw(pos, n, Z)
}
function zoneAShadeAtRaw(pos, n, Z) {
  const shadeOf = (p, seg) => {
    const E = Z.eAt ? Z.eAt(p, n, seg)
      : bakeIrradianceAt(p, n, seg.samples) + seg.bounceK * bakeIrradianceAt(p, n, seg.bounce)
    //  ★197 톤 감마도 절마다 다르다(seg.gamma) — 하절(방) = BAKE_GAMMA 고정 · 상절(첨탑) = BAKE_GAMMA_UP.
    return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(E / seg.eRef, BAKE_TONE, seg.gamma)
  }
  const seg = zoneASegOf(pos, Z)
  const sUp = shadeOf(pos, seg)
  //  ★193 절 이음 블렌드 — 개구 안 DISC_Y_LO는 **허구의 평면**이다(트인 틈·구멍엔 디스크가 없어 빛을 막는 것이 없다).
  //   하드 컷(하절 1.000 ↔ 상절 0.37)에 반그늘을 준다: 대역 [DISC_Y_LO, +blendH]에서 '평면 바로 밑의 하절 밝기'와
  //   상절 밝기를 smoothstep으로 혼합. ⚠하절 몫은 **평면 밑으로 클램프한 점**에서 잰다 — 하절 개구는 아래로만
  //   발광하므로 평면 위에서 그대로 재면 0이 되어(등 뒤) 블렌드가 오히려 어둠을 섞는다(구현 중 실측).
  //   ⚠혼합은 **shade(톤) 공간** — t 공간은 하절이 평면 근방 포화(t~30)라 대역 끝까지 1.0로 눌리다 무너진다.
  //  ⚠블렌드는 **틈의 빈 공간 내부 전용**이다(discGapInteriorAt — 구멍 기둥 + ★194 경계면 4장 제외). 이유 둘:
  //   ⑴그 면들(구멍 벽·틈 끝면·바깥 테두리면)은 평면을 **가로지르지 않고** 평면 안에 서 있는 솔리드다 —
  //    이음 연속이 애초에 불요이고, 걸면 면 전체가 램프로 칠해진다(★194 현도 실증) ⑵r=rIn은 하절 개구
  //    다각형(내접 24각형)의 림이라 sLo가 병리적이다(꼭짓점 위 E≈2.0 ↔ 현 바깥 0.03, 방위 12주기 가짜 밝은 열).
  //   틈 안 점(계단 r~15 · rel~0.5rad)은 부채꼴 내부 깊숙이라 그대로 블렌드된다.
  const H = Z.blendH ?? 0
  if (H > 0 && seg === Z.upper && BAKE_DISC_OPEN_SEG && pos[1] >= DISC_Y_LO && pos[1] < DISC_Y_LO + H && discGapInteriorAt(pos)) {
    const u = (pos[1] - DISC_Y_LO) / H
    const f = u * u * (3 - 2 * u)
    const sLo = shadeOf([pos[0], DISC_Y_LO - 1e-3, pos[2]], Z.lower)
    return (1 - f) * sLo + f * sUp
  }
  return sUp
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
/** ★195 벽 살 대역의 '안쪽 향 면'인가 — 벽을 관통하는 부재(문틀 옆면·상인방·디스크 바깥 테두리)를 구제한다.
 *  판정선(바깥반경 − T/2)은 벽 **살 한가운데**를 지난다. 그 밖의 정점은 베이크가 아예 안 만져 순백(1.000)으로
 *  남는데(2026.08.28 현도 실증), 벽을 뚫는 부재의 면은 우물 안에서 보이므로 조명을 받아야 옳다.
 *  ⇒ 살 대역 [rOut − T/2, rOut] 안에서 법선이 **바깥 반경을 향하지 않는** 면만 안으로 친다(현도 ㉡).
 *  ⚠외벽면(법선 = +반경)은 그대로 제외 — 밖에서 본 인상 불변(★177 원칙). 법선이 없으면(인스턴스·분할 경로)
 *   보수적으로 밖(구 거동). 대역 상한 여유 1e-6 = 경계 위 정점의 부동소수 흔들림(★193 어법). */
function wallFaceInward(p, rxz, rOut, S, n) {
  if (!BAKE_WALL_FACE_ON || !n) return false
  if (rxz > rOut + 1e-6 || rxz < 1e-9) return false            // 벽 바깥면 너머 = 진짜 바깥
  return (n[0] * p[0] + n[2] * p[2]) / rxz <= 1e-6             // 법선의 반경 성분이 바깥을 향하지 않는다
}
export function zoneAInterior(p, S = spireSpec(), n = null) {
  const rxz = Math.hypot(p[0], p[2])
  const rho = Math.hypot(rxz / ROOM_R, (p[1] - ROOM_FLOOR_Y) / ROOM_HEIGHT)
  if (rho <= 1) return true
  if (p[1] >= S.yB && p[1] <= S.tipY + 1e-6) {
    const rOut = p[1] <= S.yT ? wellWallR(p[1], { spec: S, forceSpire: true }) : S.rTopOut
    if (rxz > rOut - S.T / 2 && !wallFaceInward(p, rxz, rOut, S, n)) return false
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

/** ★208 빛기둥·헤일로가 **화면에 더하는 알파** — 축에서 x 떨어진 수평 시선 기준의 닫힌 식(표본 없음).
 *  가산 혼합(AdditiveBlending) + DoubleSide라 시선이 껍질을 **앞뒤 두 번** 지난다. 법선이 축 기준
 *  반경방향(★189)이므로 두 교점의 facing이 같다 ⇒ 합 = 2 · op · len · facing^1.6.
 *   facing = √(1 − (x/r)²)  ·  지수 1.6 = 셰이더 `pow(facing, 1.6)`  ·  len = shaftLenCurve(사슬 전체 비율 vY)
 *  ⚠사슬 비율은 ★175-g uv 리맵 규약(세그먼트가 아니라 **사슬 전체**에서의 높이 비율)을 그대로 쓴다.
 *  ⚠GLSL은 노드에서 못 돌린다 — 이 함수는 성질 검증용이고, 셰이더가 같은 식인지는 배선 항이 문다. */
export function shaftAddAlpha({ nodes, op, y, x = 0, topFade = SHAFT_TOP_FADE }) {
  if (!nodes || nodes.length < 2) return 0
  const yTop = nodes[0][0], yBot = nodes[nodes.length - 1][0]
  if (!(y <= yTop + 1e-12 && y >= yBot - 1e-12) || yTop <= yBot) return 0
  let r = null
  for (let i = 0; i < nodes.length - 1; i++) {
    const [yA, rA] = nodes[i], [yB, rB] = nodes[i + 1]
    if (y <= yA + 1e-12 && y >= yB - 1e-12) { r = rA + (rB - rA) * ((yA - y) / (yA - yB)); break }
  }
  if (r === null || r <= 0 || Math.abs(x) >= r) return 0
  const facing = Math.sqrt(Math.max(0, 1 - (x / r) * (x / r)))
  return 2 * op * shaftLenCurve((y - yBot) / (yTop - yBot), topFade) * Math.pow(facing, 1.6)
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

// ── ★210 C구획(관 = 테라스→드럼 접속 통로) 베이크 — 공급지 = 갓 밑 레터박스 슬릿 ─────
//  ⚠공급지 근거 = **광선 전수 실측**(2026.08.30 _probe_brd_aperture — 표본 15점 × 2520발 미스 0 +
//   조밀 스캔 0.2°×0.4° 미스 0): 관 내부에서 하늘이 보이는 방향은 없다. 유일한 하늘 개구 =
//   토막아래/토막위 사이 **수평 레터박스 슬릿**(y ∈ [AY+STUB, +SLIT] · 깊이 = 벽 두께 · 양측 미러).
//   기둥 위치(슬릿마개 — 폭 BRD_COL_W)와 동단(슬릿잇기 x ≥ L.x0)만 막혀 있다.
//  ★발광면 = 슬릿 **안쪽 입**(z = ±zIn 수직 사각형 · 법선 안쪽 수평) — D의 원통 띠와 같은 문법(측면 유입)
//   이되 **평면이라 현 근사가 없다**(폴리곤 램버트가 정확식 — seg 노브 불요).
//  ⚠1차 근사 선언 = 채널 각도 제한 무시(constants ★210 주석이 정본).
//  ⚠열린 구간 파생 = 빌더와 **같은 spec**(trapColumnSpec·slitLinkSpec — 사본 금지·손 수치 0).

/** 슬릿 열린 구간 — 기둥 마개(xc ± W/2)와 동단 잇기(x ≥ L.x0)를 제외한 x 구간들. 전부 파생 */
export function slitOpenSpec(K = trapColumnSpec(), L = slitLinkSpec(K)) {
  const opens = []
  let cur = BRD_X0
  for (const xc of K.xs) {
    const a = xc - BRD_COL_W / 2, b = xc + BRD_COL_W / 2
    if (a > cur + 1e-9) opens.push([cur, Math.min(a, L.x0)])
    cur = Math.max(cur, b)
    if (cur >= L.x0) break
  }
  if (cur < L.x0) opens.push([cur, L.x0])
  return { opens, slit: K.slit, innerWallZ: K.innerWallZ, K, A: K.A || bridgeTrapSpec(),
           total: opens.reduce((t, [a, b]) => t + (b - a), 0) }
}
/** 슬릿 안쪽 입 → 평면 사각형(구간 × 양측). 법선 = 안쪽 수평(빛은 관 안으로 들어온다) */
export function slitOpenPolys(S = slitOpenSpec()) {
  const out = []
  const { y0, y1, zIn } = S.slit
  for (const side of [1, -1]) for (const [a, b] of S.opens) {
    const z = side * zIn
    out.push({ n: [0, 0, -side],
               v: side > 0 ? [[a, y0, z], [b, y0, z], [b, y1, z], [a, y1, z]]
                           : [[a, y0, z], [a, y1, z], [b, y1, z], [b, y0, z]] })
  }
  return out
}
/** 슬릿 점 표본(보존계 BAKE_POLY_ON=false 경로) — 구간별 표본 수 ∝ 길이(밀도 = 가중치, D와 같은 규율) */
export function supplySlitSamples(S = slitOpenSpec(), n = BAKE_N) {
  const out = []
  const { y0, y1, zIn } = S.slit
  for (const side of [1, -1]) for (const [a, b] of S.opens) {
    const k = Math.max(1, Math.round((n * (b - a)) / (2 * S.total)))
    for (let i = 0; i < k; i++) {
      const u = (i + 0.5) / k, v = (i * 0.7548776662466927) % 1     // R2 저불일치(D 생성기와 같은 상수)
      out.push({ p: [a + u * (b - a), y0 + v * (y1 - y0), side * zIn], n: [0, 0, -side] })
    }
  }
  return out
}
/** C구획 베이크 명세 — 단일 절(개구 가족이 슬릿 하나뿐 — D와 같은 사유).
 *  기준점 = 갓 밑 공동(가장 긴 열린 구간 중점 · 슬릿 상단과 토막위 상단의 중간 · 아래보기) —
 *   빛이 관에 들어서서 처음 씻는 자리(D의 '문턱' 어법). 실측상 내부 최대역이라 포화가 없다. */
export function zoneCBakeSpec() {
  const S = slitOpenSpec()
  const polys = slitOpenPolys(S)
  const samples = supplySlitSamples(S)
  //  반사 공급지 = 데크 전폭 사각형(1차 근사 선언 — constants ★210) · 세기 BAKE_BOUNCE(A·D와 공유)
  const EPS_Y = 1e-3
  const bouncePolys = [{ n: [0, 1, 0],
    v: [[BRD_X0, BRD_YW + EPS_Y, -BRD_HW], [BRD_EAST_X, BRD_YW + EPS_Y, -BRD_HW],
        [BRD_EAST_X, BRD_YW + EPS_Y, BRD_HW], [BRD_X0, BRD_YW + EPS_Y, BRD_HW]] }]
  const bounce = []
  { const NB = Math.max(4, BAKE_N), L = BRD_EAST_X - BRD_X0
    for (let i = 0; i < NB; i++) {
      const u = (i + 0.5) / NB, v = (i * 0.7548776662466927) % 1
      bounce.push({ p: [BRD_X0 + u * L, BRD_YW + EPS_Y, (v * 2 - 1) * BRD_HW], n: [0, 1, 0] })
    } }
  const eAt = (p, n, seg) => BAKE_POLY_ON
    ? polysIrradianceW(p, n, seg.polys) + BAKE_BOUNCE * polysIrradiance(p, n, seg.bouncePolys)
    : bakeIrradianceAt(p, n, seg.samples) + BAKE_BOUNCE * bakeIrradianceAt(p, n, seg.bounce)
  const seg = { samples, bounce, polys, bouncePolys }
  const longest = S.opens.reduce((m, o) => (o[1] - o[0] > m[1] - m[0] ? o : m))
  const refP = [(longest[0] + longest[1]) / 2, (S.slit.y1 + BRD_TRP_C0Y) / 2, 0]
  seg.eRef = eAt(refP, [0, -1, 0], seg)
  return { open: S, seg, eAt, refP }
}
/** C구획 '내부' 판정(월드 좌표 — 관은 원점계) — A의 규약 계승: 경계 = 안면 포함 · 벽 살 대역은 법선 구제.
 *   ① 몸통(데크 상면 ~ 슬릿 상단): |z| ≤ 안쪽 면(슬릿 대역은 zIn) ② 슬릿 채널(살 대역): 법선이 바깥(±z)을
 *   향하지 않는 면만 — 채널 천장·바닥·마개 정면·잇기 서면 구제(★195 wallFaceInward와 같은 형식)
 *   ③ 갓 공동(슬릿 상단~마루 중심선): |z| ≤ zOut + 법선이 위를 향하지 않는 면만 — 갓 윗면(밖) 제외 */
export function zoneCInterior(p, B = zoneCBakeSpec(), n = null) {
  if (p[0] > BRD_EAST_X + 1e-4) return false
  if (p[1] < BRD_YW - 1e-4) return false
  const { y0, y1, zIn, zOut } = B.open.slit
  const az = Math.abs(p[2])
  if (p[1] <= y1 + 1e-4) {
    //  ★211-h: 구판 min(innerWallZ, zOut+T)는 ∞ 대비 상한이 데크·스커트 대역(안면 4.44~6.3)을 4.025로
    //   좁게 잘라 데크 가장자리 띠·스커트 안면을 '밖'으로 만들었다(실기하 재현으로 적발). ∞일 때만 폴백.
    const w = B.open.innerWallZ(p[1])
    const iw = p[1] >= y0 - 1e-4 ? zIn : (w === Infinity ? zOut + BRD_T : w)
    if (az <= iw + 1e-4) return true
    //  ② 슬릿 채널 구제 — 살 대역 [zIn, zOut] · 슬릿 y대역 안 · 법선의 z성분이 바깥을 향하지 않는다
    if (n && p[1] >= y0 - 1e-3 && az <= zOut + 1e-3 && n[2] * Math.sign(p[2] || 1) <= 1e-6) return true
    //  ②′ ★211-k 안면 구제(전 y대역) — 벽 안면은 innerWallZ의 **정의면 자체**라 삼각형 중심이 정확히 경계 위에
    //   놓여 수치 오차로 안/밖이 교대했다(실측: 빗면 안쪽향 삼각형 1612 중 1240 '밖' → 흰 톱니 = V자 선의
    //   진짜 원인). 살 대역(안면~바깥면 BRD_T) 안이고 법선이 **확실히 안쪽**(수평 성분 < −0.3)이면 안.
    //   스커트 상면(법선 위, z성분 0)·바깥면(z성분 +)은 걸리지 않는다 — 외피 불변.
    if (n && az <= iw + BRD_T + 1e-3 && n[2] * Math.sign(p[2] || 1) < -0.3) return true
    //  ②″ ★211-l 관 안을 향한 x면 — 서단 조각의 x+ 단면(관이 첨탑 벽에서 끝나는 마감면 · 관 안에서 서쪽을 보면
    //   프로파일 형상 그대로 보인다)과 동단마개 안면. 살 대역 안이고 법선의 x성분이 관 중앙 쪽이면 안.
    //   (실증: 서단스커트 안쪽향 삼각형 중 550이 '밖' — 법선 (−0.97,0,−0.23)·(+x 단면) 계열.)
    if (n && az <= iw + BRD_T + 1e-3 && n[0] * Math.sign((BRD_X0 + BRD_EAST_X) / 2 - p[0]) > 0.3) return true
    return false
  }
  //  ★211-n 갓 공동: '위 향 면 제외'의 문턱을 1e-6 → 0.6으로 — 갓 윗면(n[1]≈0.94)·마루 윗면(1.0)은 여전히 밖이고,
  //   첨탑 경사(스킨 법선 y성분 0.42)는 안. 구판 문턱은 스킨 갓 대역 260 삼각형을 흰 톱니로 만들었다.
  if (p[1] <= BRD_TRP_CAPY + 1e-4) {
    //  ★212-c 갓 공동 — 구판 'az ≤ zOut && n[1] ≤ 0.6'은 살 대역 전체를 삼켜 갓빗판 **바깥 경사면**(n=(0,.35,.94))·
    //   갓마루 옆면·토막위 바깥면을 '안'으로 감광시켰다(현도 사진: 외부 갓의 삼각형 무늬 = quad 두 삼각형 중
    //   중심 z가 zOut 안쪽인 것만 걸린 교대). ⇒ ①공동 공기·안면 = |z| ≤ trapCavityZ(y)(토막위 zIn·갓빗판 안변)
    //   ②살 대역(≤ zOut)은 **천장(아래 향) 또는 안쪽 벽(안 향) 면만** 구제 — 위·바깥 향 면은 밖(외피 불변).
    const cz = trapCavityZ(p[1], B.open.A, B.open.K)
    if (cz !== null && az <= cz + 1e-4) return true
    if (n && az <= zOut + 1e-3 && (n[1] < -0.3 || n[2] * Math.sign(p[2] || 1) < -0.3)) return true
    //  관 안을 향한 x면(서단 스킨·동단마개의 공동 부분) — 첫 대역 규칙 ②″와 같은 사유
    if (n && az <= zOut + 1e-3 && n[0] * Math.sign((BRD_X0 + BRD_EAST_X) / 2 - p[0]) > 0.3) return true
    return false
  }
  return false
}
/** C구획 정점 셰이드 ∈ [BAKE_FLOOR, 1] — 톤·바닥·반사는 A·D와 같은 노브, 감마만 전용(BAKE_C_GAMMA) */
export function zoneCShadeAt(pos, n, B = zoneCBakeSpec()) {
  const E = B.eAt(pos, n, B.seg)
  return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(E / B.seg.eRef, BAKE_TONE, BAKE_C_GAMMA)
}
/** 드럼 홀 승계 대역(월대샤프트·월대나선·관의 드럼 안 밑면 — 드럼 벽 안 · 데크 상면 이하) —
 *  게이트는 Room이 BAKE_C_DHALL로 건다. ⚠상한 = BRD_YW(데크 **상면**): 샤프트 벽의 데크 두께 대역
 *  (y 125.5~127, 하강 구멍 안쪽 면)이 무구획 백색 띠로 남지 않게. 데크 상면 정점은 판정 순서상
 *  B가 먼저 가져가므로(내부 판정 → 승계 순) 충돌 없음 — 경계선 = 구멍 테두리(자연 주름). */
export function drumHallCarry(p) {
  const r = Math.hypot(p[0] - COR_CX, p[2])
  return r <= COR_R && p[1] <= BRD_YW + 1e-4 && p[1] >= -CUP_R
}

/** ── ★211 관 빛 커튼 기하 정본(전부 파생 · 손 수치 0) ──
 *  ★211-r 개정(현도 둘째 스케치 — 초록 경계 픽셀 실측): 첫 구현은 슬릿 절점을 zOut으로 잡아 빗면 살을
 *  뚫었다(최대 +1.36 — ★209의 병 4번째 반복). 스케치 확정 형상:
 *   프로파일(z(y) 절점 — 아래→위): (Z1=2.8, 데크) → (zIn, 슬릿 하단) → (zIn, 토막위 상단 C0Y)
 *   → (갓빗판 안변@마루밑=1.116, 마루 밑면). 슬릿 하단까지 직선 확산(실측 오차 ±0.05) · 갓 공동에서 수렴.
 *  ★껍질 준수 = foldChainToClearance **재사용**(★209 어법 — 사본 0): 구속 = 벽 안면 실측
 *   (스커트·빗면 대역 innerWallZ + 갓 공동 갓빗판 안변) · 여유 = BRD_LIGHT_GAP(0 — 접촉 허용).
 *   슬릿 대역(y0~y1)은 채널 개구라 구속 없음. 검사 [★커튼⊂안면]이 상주로 문다.
 *  커튼 x구간 = slitOpenSpec 재사용(마개 리듬 = 빛의 리듬). 동단판 yCap은 ★211 그대로. */
/** ★212-c 갓 공동 안면 z(y) — 토막위 대역(슬릿 상단~C0Y)은 zIn, 그 위는 갓빗판 안변(빌더 spec 파생).
 *  zoneCInterior와 brdLightSpec.wall이 **같이** 쓴다(사본 0). y ≤ 슬릿 상단이면 null(다른 규칙 담당). */
export function trapCavityZ(y, A = bridgeTrapSpec(), K = trapColumnSpec(A)) {
  const { y1, zIn } = K.slit
  if (y <= y1 + 1e-9) return null
  if (y <= BRD_TRP_C0Y + 1e-9) return zIn
  const gq = A.secs.find((s2) => s2.id === '갓빗판').quad
  return gq[0][0] + ((gq[1][0] - gq[0][0]) * (y - gq[0][1])) / (gq[1][1] - gq[0][1])
}
export function brdLightSpec() {
  const S = slitOpenSpec()
  const { y0, y1, zIn } = S.slit
  const A = bridgeTrapSpec()
  //  갓빗판 안변(관 안쪽 변 — quad[0]→quad[1]) : 갓 공동의 벽 안면. 전부 빌더 spec에서 파생.
  const gq = A.secs.find((s2) => s2.id === '갓빗판').quad
  const gableInnerZ = (y) => gq[0][0] + ((gq[1][0] - gq[0][0]) * (y - gq[0][1])) / (gq[1][1] - gq[0][1])
  const top = BRD_ROOF_BOT
  //  ★211-e: 꼭대기 절점 자체를 안변 − GAP으로 — fold 구속은 격자·꼭짓점 y에만 걸려 top 절점(원값)이
  //   접점보다 넓게 잔존하는 사각이 있었다(실증: 147.32에서 +0.054 역전). 절점 정의가 이격을 품는다.
  const zTop = gableInnerZ(top) - BRD_LIGHT_GAP
  const K = trapColumnSpec(A)
  const prof0 = [[BRD_YW, BRD_LIGHT_Z1], [y0, zIn], [BRD_TRP_C0Y, zIn], [top, zTop]]   // [y, z]
  //  fold: [y,z]는 [y,r] 사슬과 동형 — ★209 함수를 그대로 쓴다. 사슬은 내림차순 요구라 뒤집어 넣는다.
  const wall = (y) => {
    if (y >= y0 - 1e-9 && y <= y1 + 1e-9) return Infinity            // 슬릿 채널(개구)
    const cz = trapCavityZ(y, A, K); if (cz !== null) return cz       // 토막위 안면·갓 공동(★212-c 공용 정본)
    const w = K.innerWallZ(y)                                         // 스커트·빗면
    return w === Infinity ? Infinity : w
  }
  const cons = []
  for (let y = BRD_YW + 0.1; y <= top - 1e-6; y += 0.2) { const w = wall(y); if (w !== Infinity) cons.push([y, w]) }
  //  ⚠격자(0.2)만으로는 안면의 **실절점**(예: 빗면 안변 위끝 z1.389@y142.249)을 놓친다 — 첫 검증에서
  //   +0.114 잔존 침범으로 실증. 벽 단면 quad 꼭짓점 y를 전부 구속에 추가한다(파생 — 손 수치 0).
  for (const s2 of A.secs) for (const [, qy] of s2.quad) {
    if (qy > BRD_YW + 1e-6 && qy < top - 1e-6) { const w = wall(qy); if (w !== Infinity) cons.push([qy, w]) }
  }
  const chain = [...prof0].reverse().map(([y, z]) => [y, z])
  foldChainToClearance(chain, cons, BRD_LIGHT_GAP)
  const prof = [...chain].reverse()
  const zAt = (y) => {
    const yc = Math.min(Math.max(y, prof[0][0]), prof[prof.length - 1][0])
    for (let i = 0; i < prof.length - 1; i++) {
      const [ya, za] = prof[i], [yb, zb] = prof[i + 1]
      if (yc >= ya - 1e-9 && yc <= yb + 1e-9) { const t = (yc - ya) / (yb - ya || 1); return za + t * (zb - za) }
    }
    return prof[prof.length - 1][1]
  }
  const xKnee = brdEndX(y0)
  const east = {
    x0: slitLinkSpec().x0, x1: BRD_EAST_X, xKnee,
    yCap: (x) => (x <= xKnee
      ? y1 + ((x - slitLinkSpec().x0) / (xKnee - slitLinkSpec().x0)) * (y0 - y1)
      : y0 + ((x - xKnee) / (BRD_EAST_X - xKnee)) * (BRD_YW - y0)),
  }
  return { curtains: S.opens, prof, zAt, top, yBase: BRD_YW, east, wall, slitBand: [y0, y1] }
}

/** ★211-f 관 내부 감광 램프 — y 선형: 데크 BRD_DIM_LO → 슬릿 하단 BRD_DIM_HI(그 위 = HI 유지).
 *  파생: 램프 구간 = [BRD_YW, 슬릿 하단 y0](slitOpenSpec 재사용 — 사본 0). */
export function brdDimAt(y, S = slitOpenSpec()) {
  const { y0, y1 } = S.slit
  const top = BRD_ROOF_BOT
  const lerp = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u))
  if (y < y0) return lerp(BRD_DIM_LO, BRD_DIM_HI, (y - BRD_YW) / (y0 - BRD_YW))     // 데크 → 슬릿 하단
  if (y < y1) return lerp(BRD_DIM_HI, BRD_DIM_SLIT, (y - y0) / (y1 - y0))         // 슬릿 채널: 상단이 정점
  return lerp(BRD_DIM_SLIT, BRD_DIM_HI, (y - y1) / (top - y1))                    // 갓 공동: 위로 갈수록 HI로
}

/** ★211-m 관 서단 스킨 정점 소프(비인덱스 삼각형 · [x,y,z]×3 평면 배열) — 관은 첨탑 벽에 박혀 있어 관 안에서
 *  서쪽을 보면 첨탑 외벽이 관 단면 형상으로 관 끝을 막는다(문만 뚫림). 첨탑은 A 소유라 관 톤과 어긋났고 정점색
 *  덧칠은 실패(★211-l — 첨탑 삼각형이 단면보다 크다). ⇒ 노출 영역(관 내부 공기 단면 − 문 개구)에 첨탑 곡면을
 *  spireCutX(★151 면추종 정본)로 그대로 따르는 판을 EPS 앞에. 살 대역으로 OVER 겹침(틈 방지 — 서단 조각이 가림).
 *  Room이 BufferGeometry로 감싸고 check가 같은 소프로 재현한다(사본 0). */
/** ★212-g 문 개구 광원 — 관 서단(x=BRD_X0)의 첨탑 문 개구 사각형(SPD 파생) · 법선 +x(관 안 향) */
export function brdDoorPoly() {
  const y0 = SPD_Y0, y1 = SPD_Y0 + SPD_H, hw = SPD_HW, x = BRD_X0
  return [{ n: [1, 0, 0], v: [[x, y0, -hw], [x, y0, hw], [x, y1, hw], [x, y1, -hw]] }]
}
let _doorERef = null
/** 문 빛 gain(p, n) ∈ [0, K] — 개구 램버트 조도 E를 데크 문턱 eRef로 정규화, 지수 WEST_G. 개구와 같은 평면·뒤쪽 = 0 */
export function brdWestGain(p, n) {
  const door = brdDoorPoly()
  if (_doorERef === null) _doorERef = polysIrradiance([BRD_X0 + 0.5, BRD_YW + 1e-3, 0], [0, 1, 0], door)
  const e = polysIrradiance(p, n, door)
  return BRD_DIM_WEST_K * Math.pow(Math.min(1, Math.max(0, e / _doorERef)), BRD_DIM_WEST_G)
}
/** 감광 합성: base(y 램프 또는 스킨 상수) → 문 빛으로 풀린다. s = base + (1 − base)·gain(p, n) */
export function brdDimP(p, n, base = brdDimAt(p[1])) { return base + (1 - base) * brdWestGain(p, n) }
/** 전이 구간 x 스테이션(분할 평면) — BRD_X0 + k·SEG, k = 1..L/SEG */
export function brdWestStations() {
  const out = []; for (let x = BRD_X0 + BRD_DIM_WEST_SEG; x < BRD_X0 + BRD_DIM_WEST_L - 1e-9; x += BRD_DIM_WEST_SEG) out.push(x)
  out.push(BRD_X0 + BRD_DIM_WEST_L); return out
}

/** ★212-h 문 빛 장치 소프 — 개구 사각형(x=X0 · z±hw · y0~y1)에서 관 안쪽 DOOR_L까지: 하단 y0(데크) 고정, 상단 y1 → y0
 *  (빛이 바닥에 내려앉는다), 반폭 hw → hw·SPREAD. x=const 판(DX 간격 · 팬 · uv.x = 중심 1 → 둘레 0 = 둘레 페이드)
 *  + 옆면 두 장·윗면(옆 시점). uv.y = 개구에서의 거리 비율(1 = 개구, 0 = 끝) — 셰이더 세로 페이드가 끝단을 녹인다.
 *  반환 { pos, uv } (Room이 BufferGeometry로 감싼다 · check가 같은 소프 재현). */
export function brdDoorLightTris() {
  if (!BRD_DOOR_LIGHT_ON) return null
  const x0 = BRD_X0, L = BRD_DOOR_L, y0 = SPD_Y0, y1 = SPD_Y0 + SPD_H, hw0 = SPD_HW, hw1 = SPD_HW * BRD_DOOR_SPREAD
  const at = (t) => ({ x: x0 + L * t, hw: hw0 + (hw1 - hw0) * t, yt: y1 + (y0 + 0.02 - y1) * t })   // t ∈ [0,1]
  const pos = [], uv = []
  const push = (p, u, v) => { pos.push(p[0], p[1], p[2]); uv.push(u, v) }
  const n = Math.max(1, Math.round(L / BRD_DOOR_DX))
  //  ⑴ x=const 판(팬) — 사각 단면 4변, 중심 (x, (y0+yt)/2, 0)
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = at(t), v = 1 - t, c = [s.x, (y0 + s.yt) / 2, 0]
    const ring = [[s.x, y0, -s.hw], [s.x, y0, s.hw], [s.x, s.yt, s.hw], [s.x, s.yt, -s.hw]]
    for (let k = 0; k < 4; k++) { push(c, 1, v); push(ring[k], 0, v); push(ring[(k + 1) % 4], 0, v) }
  }
  //  ⑵ 옆면(±z)·윗면 — 세그마다 quad, uv.x = 1(둘레 페이드 없음 — 세로 페이드만)
  for (let i = 0; i < n; i++) {
    const a = at(i / n), b = at((i + 1) / n), va = 1 - i / n, vb = 1 - (i + 1) / n
    for (const sg of [1, -1]) {
      const q = [[a.x, y0, sg * a.hw], [b.x, y0, sg * b.hw], [b.x, b.yt, sg * b.hw], [a.x, a.yt, sg * a.hw]]
      push(q[0], 1, va); push(q[1], 1, vb); push(q[2], 1, vb); push(q[0], 1, va); push(q[2], 1, vb); push(q[3], 1, va)
    }
    const qt = [[a.x, a.yt, -a.hw], [b.x, b.yt, -b.hw], [b.x, b.yt, b.hw], [a.x, a.yt, a.hw]]
    push(qt[0], 1, va); push(qt[1], 1, vb); push(qt[2], 1, vb); push(qt[0], 1, va); push(qt[2], 1, vb); push(qt[3], 1, va)
  }
  return { pos, uv }
}

export function brdWestSkinTris() {
  if (!BRD_WCUT || !BRD_TRP_ON) return null
  const L = brdLightSpec(); const S = spireSpec()
  const EPS = 0.03, OVER = 0.1, dy = 0.25, NZ = 10   //  ★211-n OVER 0.3→0.1(살 대역 외곽 최소화)
  const wAt = (y) => { const w = L.wall(y); return (w === Infinity ? L.zAt(y) : w) + OVER }
  const doorHW = SPD_HW, doorTop = BRD_YW + SPD_H
  const pos = []
  //  ⚠★211-n 감기 방향: (a,b,c)=(ya,z0)(ya,z1)(yb,z1)은 법선 −x(첨탑 쪽)였다 — 관 안을 향한 x면 구제(n[0]>0.3)에
  //   안 걸려 살 대역 외곽 111 삼각형이 '밖'=흰 톱니(현도 사진). 반대로 감아 법선을 +x(관 안)로.
  const quad = (a, b, c, d) => { pos.push(...a, ...c, ...b, ...a, ...d, ...c) }
  const pt = (y, z) => [spireCutX(y, z, S) + EPS, y, z]
  const strip = (ya, yb, z0a, z1a, z0b, z1b) => {
    for (let k = 0; k < NZ; k++) {
      const ta = k / NZ, tb = (k + 1) / NZ
      quad(pt(ya, z0a + (z1a - z0a) * ta), pt(ya, z0a + (z1a - z0a) * tb), pt(yb, z0b + (z1b - z0b) * tb), pt(yb, z0b + (z1b - z0b) * ta))
    }
  }
  const ys = []; for (let y = BRD_YW; y < L.top - 1e-6; y += dy) ys.push(y); ys.push(L.top)
  if (!ys.some((y) => Math.abs(y - doorTop) < 1e-9)) { ys.push(doorTop); ys.sort((a, b) => a - b) }
  for (let i = 0; i < ys.length - 1; i++) {
    const ya = ys[i], yb = ys[i + 1], wa = wAt(ya), wb = wAt(yb)
    if (yb <= doorTop + 1e-9) { strip(ya, yb, -wa, -doorHW, -wb, -doorHW); strip(ya, yb, doorHW, wa, doorHW, wb) }
    else strip(ya, yb, -wa, wa, -wb, wb)
  }
  return pos
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
  //  ★217-c 컨테이너만 손봄(값·순서 불변): 형식화 배열의 제네릭 slice → 원소 직접 읽기, 스프레드 push → 원소 push.
  //   실측(_probe_bake --cpu): corner·emit이 분할 시간의 대부분(BAKE_C 서단 스테이션 분할 ≈ 10 s). Float32→double 읽기는 같은 값.
  const corner = (tri, k) => { const c = {}
    for (const nm of names) { const it = attrs[nm].itemSize, arr = attrs[nm].array, b = (tri * 3 + k) * it, v = new Array(it)
      for (let i = 0; i < it; i++) v[i] = arr[b + i]
      c[nm] = v }
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
    for (const nm of names) { const o = out[nm], a = A[nm], b = B[nm], c = C[nm]
      for (let i = 0; i < a.length; i++) o.push(a[i]); for (let i = 0; i < b.length; i++) o.push(b[i]); for (let i = 0; i < c.length; i++) o.push(c[i]) } }
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

// ── ★198 조도 구배 분할(2026.08.28 현도 ㉠ — "그릇이 없으면 무엇을 부어도 안 담긴다") ──
//  ⚠증상: 첨탑 벽면이 **삼각형 단위로 뚝뚝 끊겨** 일부만 흰 페인트를 칠한 듯 보인다(현도 실증 4회).
//  ⚠규명(2026.08.28): 벽면 조도는 y101→y103 **2m에서 0.08 → 0.68로 8배 급등**하는데(우물 안벽 광원이
//   디스크 상면 높이에서 시작), 벽 메시 정점은 y99·y106·y123 **세 줄뿐**이다. 담을 그릇이 없으니 급변이
//   삼각형 단위로 잘린다 — 어떤 삼각형은 y99(0.04)를 물고 어떤 것은 y106(0.65)만 물어 16배 차이가 인접한다.
//   ⇒ ★195~★197이 값(반사·톤)만 만져 인상이 안 바뀐 이유가 이것이다. **구조 문제였다.**
//  해법 = ★178과 같은 4분할이되 기준이 불리언이 아니라 **연속값**: 세 정점의 shade 차가 tol을 넘으면 쪼갠다.
//   새 정점은 전부 부모 변의 중점이라 위치 이동 0 = 실루엣·면 불변(색 해상도만 는다 — ★178과 같은 근거).
//  attrs: 비인덱스 수프 · shadeOf(corner)→number(호출자가 월드 변환·법선까지 책임) · tol · minEdge(변 하한).
export function splitSoupByGradient(attrs, shadeOf, tol, minEdge, normalizeNames = ['normal']) {
  const names = Object.keys(attrs)
  const nTri = (attrs.position.array.length / 9) | 0
  const out = {}; for (const nm of names) out[nm] = []
  let rough0 = 0, emitted = 0
  //  ★217-c 컨테이너만 손봄(값·순서 불변): 형식화 배열의 제네릭 slice → 원소 직접 읽기, 스프레드 push → 원소 push.
  //   실측(_probe_bake --cpu): corner·emit이 분할 시간의 대부분(BAKE_C 서단 스테이션 분할 ≈ 10 s). Float32→double 읽기는 같은 값.
  const corner = (tri, k) => { const c = {}
    for (const nm of names) { const it = attrs[nm].itemSize, arr = attrs[nm].array, b = (tri * 3 + k) * it, v = new Array(it)
      for (let i = 0; i < it; i++) v[i] = arr[b + i]
      c[nm] = v }
    return c }
  const d2 = (a, b) => { const p = a.position, q = b.position
    const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]; return dx * dx + dy * dy + dz * dz }
  const mid = (a, b) => { const c = {}
    for (const nm of names) { const A = a[nm], B = b[nm], M = new Array(A.length)
      for (let i = 0; i < A.length; i++) M[i] = (A[i] + B[i]) / 2
      if (normalizeNames.includes(nm)) { let L = 0; for (const x of M) L += x * x; L = Math.sqrt(L) || 1
        for (let i = 0; i < M.length; i++) M[i] /= L }
      //  ⚠저장은 Float32 — 판정을 저장 정밀도에 맞춘다(★178과 같은 근거: 규율 30).
      for (let i = 0; i < M.length; i++) M[i] = Math.fround(M[i])
      c[nm] = M }
    return c }
  const emit = (A, B, C) => { emitted++
    for (const nm of names) { const o = out[nm], a = A[nm], b = B[nm], c = C[nm]
      for (let i = 0; i < a.length; i++) o.push(a[i]); for (let i = 0; i < b.length; i++) o.push(b[i]); for (let i = 0; i < c.length; i++) o.push(c[i]) } }
  const min2 = minEdge * minEdge, stack = []
  for (let t = 0; t < nTri; t++) {
    const A = corner(t, 0), B = corner(t, 1), C = corner(t, 2)
    const sa = shadeOf(A), sb = shadeOf(B), sc = shadeOf(C)
    const spread = Math.max(sa, sb, sc) - Math.min(sa, sb, sc)
    const m2 = Math.max(d2(A, B), d2(B, C), d2(C, A))
    if (spread <= tol || m2 <= min2) { emit(A, B, C); continue }
    rough0++
    //  깊이 예산: 4분할은 매 단계 모든 변을 정확히 반감하므로 ⌈log₂(최장변/minEdge)⌉면 종료가 보장된다(★178과 동일).
    const depth = Math.max(0, Math.ceil(Math.log2(Math.sqrt(m2) / minEdge))) + 1
    stack.push([A, B, C, sa, sb, sc, depth])
  }
  while (stack.length) {
    const [A, B, C, sa, sb, sc, depth] = stack.pop()
    const spread = Math.max(sa, sb, sc) - Math.min(sa, sb, sc)
    const m2 = Math.max(d2(A, B), d2(B, C), d2(C, A))
    if (spread <= tol || m2 <= min2 || depth <= 0) { emit(A, B, C); continue }
    const Mab = mid(A, B), Mbc = mid(B, C), Mca = mid(C, A)
    const sab = shadeOf(Mab), sbc = shadeOf(Mbc), sca = shadeOf(Mca)
    stack.push([A, Mab, Mca, sa, sab, sca, depth - 1])
    stack.push([Mab, B, Mbc, sab, sb, sbc, depth - 1])
    stack.push([Mca, Mbc, C, sca, sbc, sc, depth - 1])
    stack.push([Mab, Mbc, Mca, sab, sbc, sca, depth - 1])
  }
  const res = {}
  for (const nm of names) res[nm] = new Float32Array(out[nm])
  return { attrs: res, rough: rough0, tris: emitted, added: emitted - nTri }
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

// ── ★★★213 월대샤프트 빛 — 관에서 흘러내린 빛 (2026.09.04 현도 그림 · constants ★213 절이 정본 서술) ─────
//  ★공급지 = 데크 구멍의 열린 부분(ㄴ판 여집합) · 공동 = 나선 중심선 사각 − 답면 폭/2(디딤 안쪽 변) · 전부 shaftSpec 파생.
//  ★조도 = 구멍 사각형 램버트 **표본 합**(축당 SFT_SAMP) + **가림**(디딤 AABB·ㄴ판 — 실기하 발자국 shaftStepFoot 공용).
//   ⚠해석식(polysIrradiance)은 가림을 모른다 — 우물은 위 디딤이 아래 디딤의 구멍을 절반 이상 가리므로(선실측
//    k36 가림비 0.53 · k70 0.14) 해석식만 쓰면 하부가 3~7배 과대. 검사 [S-14]가 해석식 대비 가림 실효를 문다.
//  ★기준점 eRef = 디딤 상단면 중심 조도의 **최대**(선실측 k8 — 구멍 바로 아래 동변) → shade 1. 손 수치 0.
export function sftLightSpec() {
  const S = shaftSpec(), W = woldaeSpec()
  if (!S.on || !S.land) return { on: false, S }
  const L = S.land, zs = L.zSign
  //  구멍(열린 부분) = 우물 사각 − ㄴ판(세로획이 x0~xLeg 전폭 · 가로획이 zLeg~zFar 전장) → 남는 사각 하나
  const hole = { x0: L.xLeg, x1: S.inX1, z0: zs > 0 ? -S.inZ : -L.zLeg, z1: zs > 0 ? L.zLeg : S.inZ, y: S.y1 }
  const holePoly = [{ n: [0, -1, 0], v: [[hole.x0, hole.y, hole.z0], [hole.x1, hole.y, hole.z0], [hole.x1, hole.y, hole.z1], [hole.x0, hole.y, hole.z1]] }]
  const cav = { x0: S.mx0 + S.w / 2, x1: S.mx1 - S.w / 2, hz: S.mz - S.w / 2 }
  const boxes = S.steps.map((st) => { const [x0, x1, z0, z1] = shaftStepFoot(S, st); return { k: st.k, x0, x1, z0, z1, y0: st.yTop - S.slab, y1: st.yTop } })
  const landBox = { k: 0, x0: L.x0, x1: L.x1, z0: zs > 0 ? L.zLeg : -L.zFar, z1: zs > 0 ? L.zFar : -L.zLeg, y0: L.yBot, y1: L.yTop }
  const legBox = { k: -1, x0: L.x0, x1: L.xLeg, z0: zs > 0 ? 0 : -L.zFar, z1: zs > 0 ? L.zFar : 0, y0: L.yBot, y1: L.yTop }
  const yNeck = S.steps[0].yTop          // 구멍 → 공동으로 좁아지는 끝 = 첫 단 상면(그 위엔 공동을 침범하는 디딤이 없다)
  const yBot = W.yTop                    // ⓐㄱ 바닥 = 월대 상면
  //  볼륨 반폭 프로파일(y → 사각) — 구멍−GAP(y1) ↔ 공동−GAP(yNeck 이하). 두 사각 모두 실면과 GAP 이격(공면 금지).
  const g = SFT_LIGHT_GAP
  const rectAt = (y) => {
    const t = y <= yNeck ? 1 : Math.min(1, Math.max(0, (S.y1 - y) / (S.y1 - yNeck)))
    const lerp = (a, b) => a + (b - a) * t
    return { x0: lerp(hole.x0 + g, cav.x0 + g), x1: lerp(hole.x1 - g, cav.x1 - g), z0: lerp(hole.z0 + g, -cav.hz + g), z1: lerp(hole.z1 - g, cav.hz - g) }
  }
  return { on: true, S, hole, holePoly, cav, boxes, occl: [...boxes, landBox, legBox], yNeck, yBot, yTop: S.y1, rectAt, gap: g }
}
/** 샤프트 '내부' 판정 — 우물 사각(안면 포함 · 허용 1e-3) × (월대 상면 − 디딤 두께)~데크 보행면. 틀 바깥면·문틀은 밖(D 승계 유지).
 *  ⚠하한이 월대 상면이 아니라 그보다 디딤 두께 아래인 이유(실기하 실증): 끝 단 k=n의 상면이 월대 상면과 같아(y1 − rise·n = y0)
 *   그 판(밑면·옆면 10 삼각형)이 월대 살 속에 묻힌다 — 안 보이는 면이지만 같은 부재의 삼각형을 두 구획으로 가르지 않는다. */
export function sftInterior(p, F = sftLightSpec(), n = null) {
  if (!F.on) return false
  const S = F.S, e = 1e-3
  const yIn = p[1] >= S.y0 - S.slab - e && p[1] <= S.y1 + e
  if (!yIn) return false
  if (p[0] >= S.inX0 - e && p[0] <= S.inX1 + e && Math.abs(p[2]) <= S.inZ + e) return true
  //  ★213-c 우물 경계 평면 위의 면은 삼각형 중심이 우물 밖(문설주 안면 z3.5~5.15 · 중심 4.3)이어도 안면이다 —
  //   동벽 = 문설주 둘+인방이라 문설주 안면이 z3.5~3.9 0.4m 띠로 우물에 노출된다(현도 09.05 "좌우 세로 줄 · 반대면엔 없음").
  return sftWellFace(p, F, n)
}
function segHitsBox(a, b, B) {   // 선분 a→b가 AABB를 지나나(슬랩 클리핑)
  let t0 = 0, t1 = 1
  for (let i = 0; i < 3; i++) {
    const lo = [B.x0, B.y0, B.z0][i], hi = [B.x1, B.y1, B.z1][i], d = b[i] - a[i]
    if (Math.abs(d) < 1e-12) { if (a[i] < lo || a[i] > hi) return false; continue }
    let ta = (lo - a[i]) / d, tb = (hi - a[i]) / d; if (ta > tb) [ta, tb] = [tb, ta]
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false
  }
  return true
}
/** 구멍 램버트 조도(표본 합 · 가림 포함). selfK = 자기 디딤 번호(자기 상자는 가림에서 제외). occlude=false면 해석식과 같은 값(검사용). */
export function sftIrradiance(p, n, F = sftLightSpec(), { selfK = null, occlude = true } = {}) {
  if (!F.on) return 0
  const H = F.hole, NS = SFT_SAMP, dA = (H.x1 - H.x0) * (H.z1 - H.z0) / (NS * NS)
  let E = 0
  for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) {
    const s = [H.x0 + ((i + 0.5) / NS) * (H.x1 - H.x0), H.y - 1e-3, H.z0 + ((j + 0.5) / NS) * (H.z1 - H.z0)]
    const d = [s[0] - p[0], s[1] - p[1], s[2] - p[2]], L2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], L = Math.sqrt(L2)
    const cp = (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / L, cs = d[1] / L
    if (cp <= 0 || cs <= 0) continue
    if (occlude) { let blocked = false; for (const B of F.occl) { if (B.k === selfK) continue; if (segHitsBox(p, s, B)) { blocked = true; break } } if (blocked) continue }
    E += (cp * cs) / L2 * dA
  }
  return E
}
let _sftERef = null
/** 기준 조도 = 디딤 상단면 중심의 최대(가림 포함). 파생 — 손 수치 0. */
export function sftERef(F = sftLightSpec()) {
  if (_sftERef !== null) return _sftERef
  let m = 0
  for (const B of F.boxes) m = Math.max(m, sftIrradiance([(B.x0 + B.x1) / 2, B.y1 + 1e-3, (B.z0 + B.z1) / 2], [0, 1, 0], F, { selfK: B.k }))
  _sftERef = m
  return m
}
/** ★213-a 우물 경계 평면(x=inX0/inX1 · |z|=inZ) 위의 면인가 — 틀 안면·데크 구멍벽(공면 1m 대역)·판 옆면이 여기 든다. */
export function sftWellFace(p, F = sftLightSpec(), n = null) {
  const S = F.S, e = 1e-3
  //  ★213-c 법선 조건: 평면 위에 있어도 **그 평면을 향하는 면**만(|n·평면법선| > 0.5) — 디딤 상면(법선 y)의 벽쪽 정점이 벽 값으로
  //   떨어지지 않게(실측: k8 상면 z=−3.90 정점이 DIM으로 잡혀 벽쪽 모서리가 검게 갈렸다). n 없으면 위치만 본다(검사 호환).
  //  x 평면은 틀 폭(|z| ≤ hw) 전체 — 문설주·남북벽 안면이 같은 평면에 있다 · z 평면은 틀 길이(x0~x1) 전체
  const nx = !n || Math.abs(n[0]) > 0.5, nz = !n || Math.abs(n[2]) > 0.5
  if (nx && (Math.abs(p[0] - S.inX0) < e || Math.abs(p[0] - S.inX1) < e) && Math.abs(p[2]) <= S.hw + e) return true
  return nz && Math.abs(Math.abs(p[2]) - S.inZ) < e && p[0] >= S.x0 - e && p[0] <= S.x1 + e
}
/** 우물 안 면의 셰이드 ∈ [SFT_DIM, SFT_DIM + (1−SFT_DIM)·SFT_K] — 관 문 빛과 같은 식(brdWestGain 형): 바닥 + (1−바닥)·K·(E/eRef)^G.
 *  ★213-a: 우물 경계 평면 위의 면 = 어둠의 바닥 정확히(공면 두 부재 동일값 → 파이팅 불가시 · 데크와 톤 연속). 삼각형 중심에서 한 번. */
export function sftShadeAt(p, n, F = sftLightSpec(), selfK = null) {
  if (sftWellFace(p, F, n)) return SFT_DIM
  const e = sftIrradiance(p, n, F, { selfK }) / sftERef(F)
  return SFT_DIM + (1 - SFT_DIM) * SFT_K * Math.pow(Math.min(1, Math.max(0, e)), SFT_GAMMA)
}
/** 삼각형 중심이 어느 디딤 상자에 속하나(옆면·밑면 정점이 자기 상자에 가려지지 않게 자기 번호를 돌려준다) */
export function sftOwnerK(c, F = sftLightSpec()) {
  const e = 1e-4
  for (const B of F.boxes) if (c[0] >= B.x0 - e && c[0] <= B.x1 + e && c[2] >= B.z0 - e && c[2] <= B.z1 + e && c[1] >= B.y0 - e && c[1] <= B.y1 + e) return B.k
  return null
}
/** 볼륨 세로 좌표 uv.y(y) = 공동 축상 조도(해석식 · 가림 없음)의 톤 응답, 첫 단 높이에서 1로 정규화. 단조 증가(위로). */
export function sftAxisT(y, F = sftLightSpec()) {
  const c = [(F.cav.x0 + F.cav.x1) / 2, Math.min(y, F.yTop - 1e-3), 0]
  const eN = polysIrradiance([c[0], F.yNeck, 0], [0, 1, 0], F.holePoly)
  const e = polysIrradiance(c, [0, 1, 0], F.holePoly) / eN
  return Math.pow(Math.min(1, Math.max(0, e)), SFT_GAMMA)
}
/** 볼륨 메시(옆면 4장 + 횡단 슬라이스) — pos·uv 평면 배열. uv.x = 둘레 페이드용(변에서의 거리 비율 · 중심 1), uv.y = sftAxisT. */
export function sftLightTris(F = sftLightSpec(), { part = 'all' } = {}) {   //  ★213-b part: 'sides' | 'slices' | 'all'(검사용)
  if (!F.on || !SFT_LIGHT_ON) return null
  const pos = [], uv = []
  const doSides = part !== 'slices' && SFT_LIGHT_SIDES_ON, doSlices = part !== 'sides'
  const ys = [F.yTop, F.yNeck]                                   // 좁아지는 구간(사다리꼴) 경계
  for (let y = F.yNeck - SFT_LIGHT_SL_DX; y > F.yBot + 1e-6; y -= SFT_LIGHT_SL_DX) ys.push(y)
  ys.push(F.yBot)
  const push = (x, y, z, ux) => { pos.push(x, y, z); uv.push(ux, sftAxisT(y, F)) }
  //  옆면: 인접한 두 높이의 사각을 잇는 4개 쿼드. ux = 그 변 위 위치의 양끝 최소거리 비율(0 끝 · 1 중앙)
  for (let i = 0; doSides && i + 1 < ys.length; i++) {
    const A = F.rectAt(ys[i]), B = F.rectAt(ys[i + 1]), ya = ys[i], yb = ys[i + 1]
    const sides = [
      [[A.x0, A.z0], [A.x1, A.z0], [B.x1, B.z0], [B.x0, B.z0]],   // 남
      [[A.x1, A.z0], [A.x1, A.z1], [B.x1, B.z1], [B.x1, B.z0]],   // 동
      [[A.x1, A.z1], [A.x0, A.z1], [B.x0, B.z1], [B.x1, B.z1]],   // 북
      [[A.x0, A.z1], [A.x0, A.z0], [B.x0, B.z0], [B.x0, B.z1]],   // 서
    ]
    for (const [a, b, c, d] of sides) {
      //  변 중앙에 정점을 두어 uv.x가 끝 0 → 중앙 1 → 끝 0(★211-l 교훈: 양끝 0만 있으면 보간이 통째로 0)
      const m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m1 = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2]
      push(a[0], ya, a[1], 0); push(m0[0], ya, m0[1], 1); push(m1[0], yb, m1[1], 1)
      push(a[0], ya, a[1], 0); push(m1[0], yb, m1[1], 1); push(d[0], yb, d[1], 0)
      push(m0[0], ya, m0[1], 1); push(b[0], ya, b[1], 0); push(c[0], yb, c[1], 0)
      push(m0[0], ya, m0[1], 1); push(c[0], yb, c[1], 0); push(m1[0], yb, m1[1], 1)
    }
  }
  //  횡단 슬라이스: 각 높이의 사각을 중심 팬(중심 ux=1 · 둘레 0). 구멍 평면(yTop) 자체는 제외(데크 구멍과 공면).
  for (const y of (doSlices ? ys.slice(1) : [])) {
    const R = F.rectAt(y), cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2
    const ring = [[R.x0, R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1]]
    for (let k = 0; k < 4; k++) { const a = ring[k], b = ring[(k + 1) % 4]; push(cx, y, cz, 1); push(a[0], y, a[1], 0); push(b[0], y, b[1], 0) }
  }
  return { pos, uv, ys }
}


// ══════ ★214 D구획(드럼 통로·홀) 빛 — 갓 치마 커튼 (2026.09.06 현도 스케치 ⓑ · 동쪽 18° 기움) ══════
//  ⚠구조: 명세(dskirtSpec) → 가림 해결(dskirtResolve — 광선 함수 주입: 브라우저는 Raycaster, 검사는 해석 광선) →
//   점광 표본(dskirtSamples) → 정점색(dskirtShadeAt) / 리본 메시(dskirtTris). 수학 정본은 여기 하나(사본 금지).
//  ⚠1차 근사 선언: ⓐ정점색 조도에는 가림이 없다(가닥 자체는 가림에서 끝나지만, 끝나기 전 구간이 부재 뒤를 비출 수 있다)
//   ⓑ가림은 가닥 중심선 한 발로 판정한다(리본 폭은 무시) ⓒ리본은 뿌리 접선 방향 고정 폭(연속 치마 — 아래로 벌어지며 틈이 생긴다 = 주름).
import { DSK_CROWN_ON, DSK_TUBE_SEG, DSK_ON, DSK_LEAN_DEG, DSK_SPREAD_IN, DSK_SPREAD_OUT, DSK_PER_ARC, DSK_JITTER, DSK_HEM_Y, DSK_FADE_POW, DSK_DIM, DSK_GAMMA, DSK_K, DSK_LOBE, INCA_CUT_Y,
  DSK_SAMP, DSK_DY, DSK_ROOT_INSET, DSK_RAY_NEAR, DSK_CELLA_IN, DSK_OVERLAP, DSK_TEMPLE_IN, CELLA_XW, CELLA_X1, CELLA_ZHW, CELLA_T, CELLA_ROOF_Y0, FR_FLOOR_Y, FR_SILL_LIFT, TEMPLE_X0,
  DSK_FR_IN, TEMPLE_X1, FR_ANNEX, FR_BACK_T, TEMPLE_HZ, FR_WALL_T, FR_CEIL_T, CEIL_LO, CEIL_SLOPE, COR_CYL_X0, FRIEZE_ROOM_ON,
  FRL_ON, FRL_MOUTH_ON, FRL_BODY_ON, FRL_R, FRL_LOBE, FRL_SAMP, FRL_BODY_PM, FRL_DIM, FRL_GAMMA, FRL_K, FRL_STUB_MG, RIB_CUT_CAP_T, rOf, H } from './constants.js'   // ★214-r 프리즈 방 상자 · ★215 프리즈 방 빛

const R2A = 0.7548776662466927, R2B = 0.5698402909980532        // R2 저불일치 상수(부채꼴 생성기·★188과 같은 상수)
/** 커튼 명세 — 뿌리 링·기울기·48가닥(방위 φ · 퍼짐 · 출발점 o · 단위 방향 d). 전부 파생. */
export function dskirtSpec() {
  const S = gatSlitSpec(), g = gatCap()
  const lean = Math.tan((DSK_LEAN_DEG * Math.PI) / 180)
  const rootR = S.R - DSK_ROOT_INSET, rootY = S.baseY
  const lmax = rootY - DSK_HEM_Y                                  // 무가림 최대 수직 낙차
  const strands = []
  let k = 0
  for (const arc of S.arcs) {
    for (let i = 0; i < DSK_PER_ARC; i++) {
      const j1 = ((k * R2A) % 1) - 0.5, j2 = (k * R2B) % 1        // 위치 흔들림(−0.5~0.5) · 퍼짐 배분(0~1)
      const u = (0.5 + i + DSK_JITTER * j1) / DSK_PER_ARC          // 구간 안 위치(균등 중심 ± 흔들림) — 구간 밖으로 안 나감(|j1|≤0.5·JITTER<1)
      const spreadDeg = DSK_SPREAD_IN + (DSK_SPREAD_OUT - DSK_SPREAD_IN) * (DSK_JITTER > 0 ? j2 : i / Math.max(1, DSK_PER_ARC - 1))
      const phi = arc.a0 + u * arc.da, c = Math.cos(phi), sn = Math.sin(phi)
      const sp = Math.tan((spreadDeg * Math.PI) / 180)
      const dx = sp * c + lean, dy = -1, dz = sp * sn, L = Math.hypot(dx, dy, dz)
      strands.push({ k, phi, spreadDeg, w: (DSK_OVERLAP * S.R * arc.da) / DSK_PER_ARC,   // 리본 폭 = 구간 호길이/가닥 수 × 겹침 배율(★214-a: 2 = 이웃과 절반씩 겹쳐 낱가닥 완화)
        o: [S.cx + rootR * c, rootY, rootR * sn], d: [dx / L, dy / L, dz / L], tMax: lmax / (-dy / L), tau: [-sn, 0, c] })
      k++
    }
  }
  return { on: DSK_ON, slit: S, gat: g, lean, rootR, rootY, lmax, strands }
}
/** 가림 해결 — raycast(o, d, near) → 첫 충돌 거리 | null. 가닥 끝 = min(충돌, tMax). 광선 함수는 호출자가 준다(사본 0). */
export function dskirtResolve(spec, raycast) {
  return spec.strands.map((s) => {
    const h = raycast ? raycast(s.o, s.d, DSK_RAY_NEAR) : null
    const hit = h != null && h < s.tMax
    return { ...s, tEnd: hit ? h : s.tMax, hit }
  })
}
/** 길이 방향 세기 = (1 − t/tMax)^POW — 리본 셰이더·정점색·검사가 같은 식을 쓴다 */
export const dskirtFade = (t, tMax) => Math.pow(Math.max(0, 1 - t / tMax), DSK_FADE_POW)
/** 점광 표본 — 가닥마다 DSK_SAMP개, 가중 = fade(t)·(tEnd/n). 가림이 짧게 끊은 가닥은 표본도 짧다. */
export function dskirtSamples(strands, n = DSK_SAMP) {
  const out = []
  for (const s of strands) {
    const dt = s.tEnd / n
    for (let i = 0; i < n; i++) { const t = (i + 0.5) * dt
      out.push({ p: [s.o[0] + s.d[0] * t, s.o[1] + s.d[1] * t, s.o[2] + s.d[2] * t], w: dskirtFade(t, s.tMax) * dt, d: s.d }) }   // ★214-k d: 빔 방향
  }
  return out
}
/** 정점 조도(가림 없음 — 1차 근사 ⓐ): Σ w · max(0, cosθ) · beam / d²
 *  ★214-k beam = max(0, d̂·(p−s)/|p−s|)^DSK_LOBE — 표본은 **가닥 진행 방향**(아래·동쪽)으로만 빛을 낸다. 전방위(초판)면 커튼 바로 위 천장이
 *  가장 밝아 빛이 '떠 있게' 읽혔다(현도: "떨어지는 느낌이 아니라 희미"). 실측: 천장 0.23→0.04 · 제단 0.18→1.0(기준점) · 서벽 0.11→0.04. */
//  ★217-b 표본 평탄화 + 메모 — 표본 배열의 정체성(WeakMap)마다 Float64 평탄 배열(p·d·w·d유무)을 한 번 만들고, (점,법선) 키로 결과를 저장.
//   식·연산 순서는 원문 그대로(s.p → P[3i…], s.d → D[3i…] · HAS[i]) — 값 비트 동일. BAKE_MEMO_ON=false = 원문 루프.
const _dskMemo = new WeakMap()
function dskFlat(samples) {
  const n = samples.length, P = new Float64Array(n * 3), D = new Float64Array(n * 3), W = new Float64Array(n), HAS = new Uint8Array(n)
  for (let i = 0; i < n; i++) { const s = samples[i]
    P[i * 3] = s.p[0]; P[i * 3 + 1] = s.p[1]; P[i * 3 + 2] = s.p[2]; W[i] = s.w
    if (s.d) { HAS[i] = 1; D[i * 3] = s.d[0]; D[i * 3 + 1] = s.d[1]; D[i * 3 + 2] = s.d[2] } }
  return { n, P, D, W, HAS, map: new Map() }
}
export function dskirtIrradianceAt(p, nrm, samples) {
  if (!BAKE_MEMO_ON) return dskirtIrradianceAtRaw(p, nrm, samples)
  let F = _dskMemo.get(samples); if (!F) { F = dskFlat(samples); _dskMemo.set(samples, F) }
  const key = p[0] + ',' + p[1] + ',' + p[2] + ',' + nrm[0] + ',' + nrm[1] + ',' + nrm[2]
  const hit = F.map.get(key); if (hit !== undefined) return hit
  const { n, P, D, W, HAS } = F, p0 = p[0], p1 = p[1], p2 = p[2], n0 = nrm[0], n1 = nrm[1], n2 = nrm[2]
  let e = 0
  for (let i = 0; i < n; i++) {
    const dx = P[i * 3] - p0, dy = P[i * 3 + 1] - p1, dz = P[i * 3 + 2] - p2, d2 = dx * dx + dy * dy + dz * dz
    if (d2 < 1e-6) continue
    const dl = Math.sqrt(d2), cos = (n0 * dx + n1 * dy + n2 * dz) / dl
    if (cos <= 0) continue
    let beam = 1
    if (DSK_LOBE > 0 && HAS[i]) { const a = -(D[i * 3] * dx + D[i * 3 + 1] * dy + D[i * 3 + 2] * dz) / dl; if (a <= 0) continue; beam = Math.pow(a, DSK_LOBE) }
    e += (W[i] * cos * beam) / d2
  }
  F.map.set(key, e)
  return e
}
function dskirtIrradianceAtRaw(p, nrm, samples) {
  let e = 0
  for (const s of samples) {
    const dx = s.p[0] - p[0], dy = s.p[1] - p[1], dz = s.p[2] - p[2], d2 = dx * dx + dy * dy + dz * dz
    if (d2 < 1e-6) continue
    const dl = Math.sqrt(d2), cos = (nrm[0] * dx + nrm[1] * dy + nrm[2] * dz) / dl
    if (cos <= 0) continue
    let beam = 1
    if (DSK_LOBE > 0 && s.d) { const a = -(s.d[0] * dx + s.d[1] * dy + s.d[2] * dz) / dl; if (a <= 0) continue; beam = Math.pow(a, DSK_LOBE) }
    e += (s.w * cos * beam) / d2
  }
  return e
}
/** 기준점(정규화 1의 자리) — ★214 초판: 치마가 축을 가로지르는 y≈114(허공) → ★214-k: 잉카 넥서스 판. ⚠★188의 '문턱' 어법은 여기서 틀린다(문턱 조도 0). */
export function dskirtRefPoint(spec) { return [COR_CX, INCA_CUT_Y, 0] }   // ★214-k 기준점 = **잉카 넥서스 판(축상 · INCA_CUT_Y 38)** · 위 향 — "커튼이 잉카 제단을 밝힌다"(현도)를 정규화에 박는다: 제단 = 1(백색). 초판(축 가로지름 y≈114)은 허공이라 제단이 늘 어중간했다
export function dskirtERef(spec, samples) { return dskirtIrradianceAt(dskirtRefPoint(spec), [0, 1, 0], samples) }
/** 정점색 ∈ [DSK_DIM, DSK_DIM + (1−DSK_DIM)·DSK_K] — S ★213과 같은 응답식(어둠 바닥 + 상한 있는 거듭제곱) */
export function dskirtShadeAt(p, nrm, samples, eRef) {
  const e = dskirtIrradianceAt(p, nrm, samples) / eRef
  return DSK_DIM + (1 - DSK_DIM) * DSK_K * Math.pow(Math.min(1, Math.max(0, e)), DSK_GAMMA)
}
// ═══ ★215 프리즈 방(1p7) 빛 — 끊긴 관 다섯(그루터기)이 아가리·몸통에서 비춘다 · 조도 모델 = D 승계 · 정본 기하 = ribCutSpec(사본 0) ═══
/** 리브 k의 축점(높이 y) — ribCutSpec의 tx/tz·bx/bz와 같은 식(rOf·phi). */
export const ribAxisAt = (phi, y) => [rOf(y / H) * Math.cos(phi), y, rOf(y / H) * Math.sin(phi)]
/** 그루터기 다섯의 명세: 아가리(mouth: 축점·아래 방향 단위벡터·바닥 캡 상면까지 길이) · 몸통(stub: 아가리→방 천장 밑 축 구간) */
export function friezeLightSpec() {
  if (!FRL_ON || !DSK_FR_IN || !FRIEZE_ROOM_ON) return null
  const B = friezeRoomBox()
  const ribs = ribCutSpec().map((c) => {
    const m = ribAxisAt(c.phi, c.yTop), f = ribAxisAt(c.phi, c.yBot + 0.02 + RIB_CUT_CAP_T / 2)   // 바닥 캡 상면(아랫캡 = yBot+0.02 중심 · 두께 CAP_T)
    const d = [f[0] - m[0], f[1] - m[1], f[2] - m[2]], L = Math.hypot(...d)
    let top = m; for (let i = 0; i < 12; i++) top = ribAxisAt(c.phi, friezeRoomCeil(top[0], B) - 0.02)   // 그루터기 위끝 = 방 천장 밑 — 축 x가 y에 따라 움직이므로 고정점 반복(12회 · 1e-6 수렴 · 검사가 문다)
    return { k: c.k, phi: c.phi, yTop: c.yTop, capT: c.capT, mouth: m, floor: f, d: [d[0] / L, d[1] / L, d[2] / L], gap: L, top, stubLen: top[1] - m[1] }
  })
  const ref = ribs.reduce((a, b) => (a.gap <= b.gap ? a : b))                                     // 기준 = 아가리가 가장 낮은 리브(바닥 캡 = 1.0)
  return { ribs, refK: ref.k, refPoint: ref.floor, R: FRL_R }
}
/** 표본 — ⓐ 아가리: 관 안지름 원판(반경 R)에 N점(선플라워 배치 · 총 출력 1 · 빔 d · 로브 FRL_LOBE) ⓑ 몸통: 축 구간 N점(전방위 · 출력 BODY_PM·길이) */
export function friezeLightSamples(spec = friezeLightSpec(), n = FRL_SAMP) {
  const out = []
  if (!spec) return out
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (const r of spec.ribs) {
    const d = r.d, ax = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
    let u = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]]; const ul = Math.hypot(...u); u = [u[0] / ul, u[1] / ul, u[2] / ul]
    const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]
    if (FRL_MOUTH_ON) for (let i = 0; i < n; i++) {
      const rr = spec.R * Math.sqrt((i + 0.5) / n), th = i * ga, c = Math.cos(th) * rr, s2 = Math.sin(th) * rr
      out.push({ p: [r.mouth[0] + u[0] * c + v[0] * s2, r.mouth[1] + u[1] * c + v[1] * s2, r.mouth[2] + u[2] * c + v[2] * s2], w: 1 / n, d, lobe: FRL_LOBE, k: r.k, kind: 'mouth' })
    }
    if (FRL_BODY_ON && FRL_BODY_PM > 0 && r.stubLen > 0) { const dl = r.stubLen / n
      for (let i = 0; i < n; i++) { const y = r.yTop + (i + 0.5) * dl; out.push({ p: ribAxisAt(r.phi, y), w: FRL_BODY_PM * dl, d: null, lobe: 0, k: r.k, kind: 'body' }) } }
  }
  return out
}
/** 조도 = Σ w · max(0,cosθ) · beam / d²  (D dskirtIrradianceAt과 같은 식 — 로브만 표본별) */
export function friezeLightIrradianceAt(p, nrm, samples) {
  let e = 0
  for (const s of samples) {
    const dx = s.p[0] - p[0], dy = s.p[1] - p[1], dz = s.p[2] - p[2], d2 = dx * dx + dy * dy + dz * dz
    if (d2 < 1e-6) continue
    const dl = Math.sqrt(d2), cos = (nrm[0] * dx + nrm[1] * dy + nrm[2] * dz) / dl
    if (cos <= 0) continue
    let beam = 1
    if (s.lobe > 0 && s.d) { const a = -(s.d[0] * dx + s.d[1] * dy + s.d[2] * dz) / dl; if (a <= 0) continue; beam = Math.pow(a, s.lobe) }
    e += (s.w * cos * beam) / d2
  }
  return e
}
export function friezeLightERef(spec, samples) { return friezeLightIrradianceAt(spec.refPoint, [0, 1, 0], samples) }
/** 그루터기 자신의 정점인가(축 거리 ≤ capT+MG · y ≥ yTop−MG) — 발광체 = 1(K 상한과 같은 뜻: 빛이 나는 곳은 하얗다) */
export function friezeLightOnStub(p, spec) {
  if (!spec || !FRL_BODY_ON) return false
  return spec.ribs.some((r) => p[1] >= r.yTop - FRL_STUB_MG && (() => { const a = ribAxisAt(r.phi, p[1]); return Math.hypot(p[0] - a[0], p[2] - a[2]) <= r.capT + FRL_STUB_MG })())
}
/** ★215-f 관 속(보어)인가 — 축 거리 ≤ FRL_R(안지름 5.78) · y ≥ yTop−MG. 광원 **안쪽**의 물체(자립 나선 판 · 기둥)는 포화 = 1. 위치 규칙(모든 메시) — 관 살(6.0)·천장 구멍 테두리(6.08)는 밖 */
export function friezeLightInBore(p, spec) {
  if (!spec || !FRL_MOUTH_ON) return false
  //  ★219 천장 상한(★218 Ⅵ): **색 소속** 규칙은 방 천장(그 x의 빗면)까지 — 그 위 관 속은 구역 I 소관(zoneI*가 덧쓴다). 구판은 상한이 없어 관 속 무한히 위까지 1.0이었다.
  if (p[1] > friezeRoomCeil(p[0])) return false
  return friezeLightInBoreRaw(p, spec)
}
/** ★219-f 상한 **없는** 관 속 규칙(구판 그대로) — ★215-g 검은 쐐기 방지 전용.
 *  ⚠왜 둘이 필요한가: 천장 상한은 "천장 위 관 속 색을 누가 칠하나"(E→I)의 선이지, "지붕 위 리브 정점을 DIM으로 굽지 마라"(★215-g)의 선이 아니다.
 *   ★219에서 하나로 묶었더니 **목적지 아닌 네 리브**가 천장 위에서 보호를 잃고 DIM(0.04)으로 구워져 화면에 검은 판으로 나왔다(현도 09.09 x169.9 y254 · 실측 면적 10~12㎡ 다수). */
export function friezeLightInBoreRaw(p, spec) {
  if (!spec || !FRL_MOUTH_ON) return false
  return spec.ribs.some((r) => p[1] >= r.yTop - FRL_STUB_MG && (() => { const a = ribAxisAt(r.phi, p[1]); return Math.hypot(p[0] - a[0], p[2] - a[2]) <= spec.R })())
}
/** ★215-g 베이크 관문 앞 우선 규칙 — 리브 메시(onRib) 정점이 그루터기·관 속이면 안 판정과 무관하게 1. 지붕 위 리브 정점이 '밖 → DIM'으로 굽혀지고(★215-d 규칙은 관문 뒤라 무력), 조각은 높이맵 미스(=리드 207)로 '안'이 되어 검은 쐐기(현도 09.07 15:52 · r<84인 #0·#±1만) */
export function friezeLightVertexOverride(p, onRib) {
  if (!FRL_ON) return null
  const b = friezeLightBake(); if (!b) return null
  //  ★219-f 리브 정점은 **상한 없는** 관 속 규칙으로 보호한다(검은 쐐기 방지 = ★215-g). 리브가 아닌 점(판·계단 등)은 상한 있는 규칙 그대로 — 천장 위는 구역 I가 칠한다.
  if (onRib && (friezeLightOnStub(p, b.spec) || friezeLightInBoreRaw(p, b.spec))) return 1
  if (friezeLightInBore(p, b.spec)) return 1
  return null
}
/** ★215-i 드럼 천장 높이맵의 **미스 대체값** — 크라운 안(r ≤ GAT_CROWN_R)은 리드 밑(y1: 흡기 구멍 위 크라운 통 = 안), 그 밖(신전 발자국 위 · 리브 구멍 위)은 해석 천장면 ceilY(x)(신전 상판 = ceilY−0.02 · 리브 구멍 둘레 천장면). 구 '미스 = 리드'는 지붕 위 y ≤ 207을 안으로 삼아 리브(★215-g)·피어(★215-i) 검은 쐐기의 뿌리 */
export function dskRoofFallback(rad, x, spec = dskirtSpec()) { return rad <= GAT_CROWN_R ? spec.slit.y1 : ceilY(x) }
let _frlBake = undefined
/** 한 번 계산해 재사용(결정적) — {spec, samples, eRef} 또는 null(FRL 꺼짐) */
export function friezeLightBake() {
  if (_frlBake !== undefined) return _frlBake
  const spec = friezeLightSpec()
  if (!spec) return (_frlBake = null)
  const samples = friezeLightSamples(spec)
  return (_frlBake = { spec, samples, eRef: friezeLightERef(spec, samples) })
}
export function friezeLightShadeAt(p, nrm, bake = friezeLightBake(), onRib = false) {   // ★215-e onRib: 그루터기 = 1 규칙은 리브 메시 정점에만(★215-e 오판 — 천장 구멍 테두리 6.08 < 6.24가 1.0으로 굽혀 흰 별 조각)
  if (!bake) return FRL_DIM
  if (onRib && friezeLightOnStub(p, bake.spec)) return 1
  if (friezeLightInBore(p, bake.spec)) return 1                                       // ★215-f 관 속 = 광원 안 = 1
  const e = friezeLightIrradianceAt(p, nrm, bake.samples) / bake.eRef
  return FRL_DIM + (1 - FRL_DIM) * FRL_K * Math.pow(Math.min(1, Math.max(0, e)), FRL_GAMMA)
}
/** ★215-c 튜브 삼각형을 방 천장 밑에 맞춰 자른다 — 몸통 후광 통의 윗고리는 평평하지만 천장은 빗면(cB 0.476): 반지름 12.3 안에서 ±5.8m 차 → 낮은 쪽에 고리가 삐져나와 삼각 무늬(현도 09.07 x295 y197 z7.4).
 *  정점마다 y ≤ friezeRoomCeil(x)−0.02−ε 로 눌러 넣는다(x·z 불변 · uv 불변 — 위쪽 페이드는 그대로 고리에서 시작). 반환 = 눌린 정점 수. */
export function clampTrisToRoomCeil(T, B = friezeRoomBox(), eps = 1e-3) {
  let n = 0
  for (let i = 0; i < T.pos.length; i += 3) { const lim = friezeRoomCeil(T.pos[i], B) - 0.02 - eps; if (T.pos[i + 1] > lim) { T.pos[i + 1] = lim; n++ } }
  return n
}
/** ★214-n 두 모델의 이음 — 크라운 통 안 = ★188 슬릿 모델(zoneDShadeAt) · 밑동 아래 GAT_CONE_H 대역 = max(커튼, 슬릿×t) · 그 밖 = 커튼.
 *  근거(실측): 커튼 표본은 밑동에서 아래로만 발광(빔)하므로 통 안은 DIM(새까맣고) 기둥은 제외(새하얗다) — 통 안의 실제 광원은 슬릿이다.
 *  ★188 모델은 통 안에서 리드 밑 0.87~0.97 · 통 안벽 0.73~0.80 · 기둥 안면 0.95(실측). */
export function dskirtShadeMix(p, nrm, samples, eRef, spec, D188, onRib = false) {   // ★215-e onRib = 이 정점이 리브 몸통 메시의 것(발광체 규칙 대상)
  const sk = dskirtShadeAt(p, nrm, samples, eRef)
  if (!DSK_CROWN_ON || !D188) return sk
  if (FRL_ON && ((onRib && friezeLightOnStub(p, friezeLightBake()?.spec)) || friezeLightInBore(p, friezeLightBake()?.spec))) return 1   // ★215-f 관 속도 1(천장 위 관 속 판 연속) · ★215-e 리브 메시 정점만 · ★215-d 발광체(그루터기)는 천장 살 속·위에서도 1 — 방 안 정점 1과 살 위 정점(DIM/슬릿값) 사이 보간 쐐기 방지(GLSL은 방 밖 조각에 정점색을 안 곱하므로 외부는 무해)
  if (friezeRoomIn(p)) return FRL_ON ? Math.max(sk, friezeLightShadeAt(p, nrm, friezeLightBake(), onRib)) : sk   // ★215 방 안 = 관 다섯의 빛(어둠 바탕 위 max) · ★214-r 프리즈 방은 밀폐 공동 — 슬릿(하늘) 블렌드 대역(y≥baseY−CONE_H 174.4)이 방 상부(천장 189~209)와 겹치나 하늘빛은 못 들어온다(실측: 천장 밑 0.59 → 0.04)
  const S = spec.slit, r = Math.hypot(p[0] - S.cx, p[2])
  if (r <= S.R + 1e-3 && p[1] >= S.baseY - 1e-3) return zoneDShadeAt(p, nrm, D188)
  const t = (p[1] - (S.baseY - GAT_CONE_H)) / GAT_CONE_H
  return t > 0 ? Math.max(sk, zoneDShadeAt(p, nrm, D188) * Math.min(1, t)) : sk
}
/** ★214-q 정점색용 재분할 — 비색인 삼각형 배열(pos, nrm)에서 변이 maxEdge보다 긴 삼각형을 가운데점으로 4분할(재귀). 면 형상 무변 · 법선은 그대로 복제.
 *  큰 CSG 면(신전 서면 50×34m = 삼각형 2장)에 정점색을 얹으면 세 귀 값의 선형 보간이라 대각선 띠가 생긴다(현도 09.06 사진 — 양태 패싯이 아니라 신전 서면). */
export function tessellateTris(pos, nrm, maxEdge) {
  const outP = [], outN = []
  const emit = (a, b, c, na, nb, nc, depth) => {
    const L = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
    if (depth < 8 && Math.max(L(a, b), L(b, c), L(c, a)) > maxEdge) {
      const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]
      const ab = m(a, b), bc = m(b, c), ca = m(c, a), nab = m(na, nb), nbc = m(nb, nc), nca = m(nc, na)
      emit(a, ab, ca, na, nab, nca, depth + 1); emit(ab, b, bc, nab, nb, nbc, depth + 1); emit(ca, bc, c, nca, nbc, nc, depth + 1); emit(ab, bc, ca, nab, nbc, nca, depth + 1)
    } else { for (const p of [a, b, c]) outP.push(p[0], p[1], p[2]); for (const n of [na, nb, nc]) outN.push(n[0], n[1], n[2]) }
  }
  for (let i = 0; i < pos.length; i += 9) {
    const g = (k) => [pos[i + k * 3], pos[i + k * 3 + 1], pos[i + k * 3 + 2]], h = (k) => [nrm[i + k * 3], nrm[i + k * 3 + 1], nrm[i + k * 3 + 2]]
    emit(g(0), g(1), g(2), h(0), h(1), h(2), 0)
  }
  return { pos: outP, nrm: outN }
}
/** 홀 '안' 판정(정점색 대상) — zoneDInterior와 다른 점 셋(전부 실측에서 나온 정정):
 *   ⓐ천장 = 빗면 평면 ceilY(x) **와** 갓 양태 곡면(외곽 다각형 ceilY(x_out) ↔ 크라운 밑동 baseY 반경 보간) 중 **높은 쪽** 아래.
 *     ★188의 '양태 = 림에서 위로 18' 어법은 기운 천장에서 틀린다(동쪽 림 202 > baseY 192.4 — 양태가 **내려간다**).
 *   ⓑ동쪽 상부 쐐기·양태 분기의 무한 반경 결함 소멸(원통 r≤COR_R로 닫힌다) ⓒ동창 너머 셀라 안 포함(DSK_CELLA_IN).
 *  ⚠zoneDInterior는 ★188 검사가 물고 있어 손대지 않는다(보존계). ⚠E=1e-3: 정점은 Float32(r=84.000004 같은 값 — 1e-6이면 벽 전체가 밖). */
/** ★214-r 프리즈 방(1p7) 공동 상자 — **정본 = Corridor TempleBeam의 ★55 파냄 브러시**와 같은 파생값(사본 0 · 규율 33: JS 정점 판정과 GLSL 조각 판정이 이 하나를 나눠 쓴다).
 *  x0 = TEMPLE_X0(앞벽 바깥면 — 벽 두께 안의 슬릿 문설주·창살까지 밀폐부) · x1 = 뒷벽 안면 · zh = 옆벽 안면 · y0 = 바닥 상면 · 천장 = ceilY(x) − 0.02 − FR_CEIL_T(빗면 추종 · x의 1차식) */
export function friezeRoomBox() {
  return { on: DSK_FR_IN && FRIEZE_ROOM_ON, x0: TEMPLE_X0, x1: TEMPLE_X1 + FR_ANNEX - FR_BACK_T, zh: TEMPLE_HZ - FR_WALL_T, y0: FR_FLOOR_Y,
    cA: CEIL_LO - 0.02 - FR_CEIL_T, cB: CEIL_SLOPE, cX: COR_CYL_X0 }   // 천장 밑 y = cA + cB·(x − cX)
}
export const friezeRoomCeil = (x, B = friezeRoomBox()) => B.cA + B.cB * (x - B.cX)
export function friezeRoomIn(p, B = friezeRoomBox(), E = 1e-3) {
  return !!B.on && p[0] >= B.x0 - E && p[0] <= B.x1 + E && Math.abs(p[2]) <= B.zh + E && p[1] >= B.y0 - E && p[1] <= friezeRoomCeil(p[0], B) + E
}
/** 셸 정점 법선의 목표점 — 홀에서는 드럼 축점(cx,0,0), 프리즈 방 안에서는 **방 중심**(바닥 +y·천장 −y·옆벽 안쪽이 '안면'이 되게). */
export function dskirtNormalTarget(p, spec = dskirtSpec(), B = friezeRoomBox()) {
  if (friezeRoomIn(p, B)) return [(B.x0 + B.x1) / 2, (B.y0 + friezeRoomCeil(p[0], B)) / 2, 0]
  return [spec.slit.cx, 0, 0]
}
export function dskirtInterior(p, spec = dskirtSpec(), facet = false) {   // facet=true(천장 셸)만 외접 다각형 반경(88.3)까지 — 그 외는 벽 반경(84) · ★214-d
  const S = spec.slit, E = 1e-3, r = Math.hypot(p[0] - S.cx, p[2])
  if (DSK_CELLA_IN && p[0] >= CELLA_XW - E && p[0] <= CELLA_X1 + CELLA_T + E && Math.abs(p[2]) <= CELLA_ZHW + CELLA_T + E && p[1] >= -1) {   // ★214-c 셀라 **솔리드 전체**(벽 두께 포함 — 뒷벽 바깥면 정점이 백색으로 남아 옆면이 그라데이션 되던 것)
    if (p[1] <= (DSK_TEMPLE_IN ? FR_FLOOR_Y + FR_SILL_LIFT : CELLA_ROOF_Y0) + E) return true   // 셀라 주머니(★214-b: 프리즈 방 바닥까지 — 신전 하단 띠·아치·리브 다섯) · ★214-c 리브 절단 캡 상면 = 바닥 +LIFT(0.02)
    //  ⛔★215-i 구 서면 절(x ≤ TEMPLE_X0 ∧ y ≤ 리드 [∧ r ≤ 84 ★215-h]) 폐기 — r ≤ 84 안은 아래 원통 규칙(천장면)이 이미 덮어 중복이고, 남는 효과는 **천장 위 지붕 공간(y 187~207)을 안으로 삼는 것뿐**(현도 09.07 16:15 피어 측면 (257,189.7,63.5) r 82.7: ★215-h의 r 조건을 통과하고 y ≤ 207로 '안' → 검은 얼룩 잔존). ★215-h는 반쪽 처방이었음
  }
  if (friezeRoomIn(p, friezeRoomBox(), E)) return true                            // ★214-r 프리즈 방 공동 — 1p7 방 안도 홀과 한 어둠(현도 A 09.06)
  if (p[1] < -CUP_R - E) return false
  if (p[1] < -E) return Math.hypot(r, p[1]) <= CUP_R + E                       // ★214-e 바닥(y0) 아래는 **사발 반구 안**만 — 스트랩·피어 하단(반구 밖)은 외부(현도 사진: 드럼 아래가 검게)
  if (r <= S.R + E) return p[1] <= S.y1 + E                                   // 크라운 통 안 — 리드 밑면(y1=lidY)까지(★214-a: 리드 밑면이 백색 원판으로 보이던 것 — 발광 디스크 소등만으론 부족)
  const rOut = COR_R / Math.cos(Math.PI / GAT_FACETS), sIn = (r - S.R) / (rOut - S.R)
  if (r > (facet ? rOut : COR_R) + E) return false                               // ⚠천장 패싯만 양태 외접 다각형(88.3)까지(★214-d: 부재에 88.3을 쓰면 드럼 밖 4m 띠의 리브가 얼룩진다) — 천장 패싯 모서리 정점(r 84~88)이 밖으로 떨어지면 서쪽 천장에 밝은 조각이 남는다(셀프 렌더 적발)
  const yOut = ceilY(S.cx + (rOut * (p[0] - S.cx)) / r)                       // 같은 방위의 외곽 다각형 높이(ceilY는 x만의 함수)
  const ySurf = S.baseY + sIn * (yOut - S.baseY)                                // 양태 곡면(반경 선형 보간)
  //  패싯(평면 다각형) ↔ 반경 보간(원뿔)의 최대 편차 = 외접 여분(rOut−COR_R)/(rOut−R) × 림·밑동 최대 낙차 — 그만큼 여유(파생 · 손 수치 0)
  const eSurf = ((rOut - COR_R) / (rOut - S.R)) * Math.max(Math.abs(ceilY(S.cx + rOut) - S.baseY), Math.abs(ceilY(S.cx - rOut) - S.baseY))
  return p[1] <= Math.max(ceilY(p[0]), ySurf) + eSurf + E
}
/** ★214-l 가닥 메시 = **관(튜브)** — 방 빛기둥(★A shaftMat: 원통 + 실루엣 facing + 후광 통)의 어법 승계. 초판 리본(평면 띠)은 옆에서 보면 사라지고 정면에선
 *  판이라 '만져질 듯한' 몸이 없었다(현도 09.06). 튜브 반지름 = w/2(리본 폭 승계) × radiusK(후광은 SHAFT_HALO_K_UP 배).
 *  uv.x = 둘레(0~1) · uv.y = t/tMax(길이 소멸 — 가닥이 끊겨도 소멸 곡선은 전 길이 기준) · 법선 = 방사(실루엣 판정용 · 방 빛기둥의 uAxial 어법). */
export function dskirtTris(strands, { radiusK = 1, sides = DSK_TUBE_SEG } = {}) {
  const pos = [], uv = [], nrm = []
  for (const s of strands) {
    const n = Math.max(1, Math.ceil(s.tEnd / DSK_DY)), rad = (s.w / 2) * radiusK
    const dt0 = s.tau[0] * s.d[0] + s.tau[1] * s.d[1] + s.tau[2] * s.d[2]                                   // 링 접선은 d에 정확히 수직이 아니다(기울기·퍼짐) → 직교화
    let t1 = [s.tau[0] - dt0 * s.d[0], s.tau[1] - dt0 * s.d[1], s.tau[2] - dt0 * s.d[2]]; const tl = Math.hypot(...t1); t1 = [t1[0] / tl, t1[1] / tl, t1[2] / tl]
    const b1 = [s.d[1] * t1[2] - s.d[2] * t1[1], s.d[2] * t1[0] - s.d[0] * t1[2], s.d[0] * t1[1] - s.d[1] * t1[0]]   // 종법선 = d × t1(둘 다 단위·d에 수직 → 정원 단면)
    const ring = (t, k) => { const a = (k / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a)
      const nn = [t1[0] * ca + b1[0] * sa, t1[1] * ca + b1[1] * sa, t1[2] * ca + b1[2] * sa]
      return { p: [s.o[0] + s.d[0] * t + nn[0] * rad, s.o[1] + s.d[1] * t + nn[1] * rad, s.o[2] + s.d[2] * t + nn[2] * rad], n: nn } }
    const push = (q, ux, t) => { pos.push(q.p[0], q.p[1], q.p[2]); uv.push(ux, t / s.tMax); nrm.push(q.n[0], q.n[1], q.n[2]) }
    for (let i = 0; i < n; i++) {
      const ta = (i * s.tEnd) / n, tb = ((i + 1) * s.tEnd) / n
      for (let k = 0; k < sides; k++) {
        const a0 = ring(ta, k), a1 = ring(ta, k + 1), b0 = ring(tb, k), b3 = ring(tb, k + 1), u0 = k / sides, u1 = (k + 1) / sides
        push(a0, u0, ta); push(a1, u1, ta); push(b3, u1, tb)
        push(a0, u0, ta); push(b3, u1, tb); push(b0, u0, tb)
      }
    }
  }
  return { pos, uv, nrm }
}


// ══════ ★★★219 구역 I(리브 여정 = 자립 나선 ~ 전실) 빛 — 2026.09.08 현도 공급지 설명 (상수 주석 ZI_* 참조) ══════
//  ⚠구조: 명세(zoneISpec) → 표본·방향(zoneIHemiDirs·zoneIBeamSamples·zoneIHoleSamples) → 광선 함수 주입(브라우저 = three-mesh-bvh 소프 · 검사 = 합성 광선)
//   → 정점 값(zoneIShadeAt) / 볼륨(zoneITubeTris). 좌표 = **상부 여정 그룹 로컬**(App.jsx rotation-y=−RIB_DEST_PHI) — 관 축이 φ=0 리브 (rOf(u), uH, 0)가 되어 식이 단순하다.
//   세계좌표 정점은 ziToLocal로 넘겨 재고, 결과는 좌표계 무관 스칼라. 소속 판정(관 안면 삼각형 · 방 천장 위)만 세계좌표(friezeRoomCeil)를 같이 본다.
//  ⚠1차 근사 선언: ⓐ②의 가림은 광선 한 발 = 명중/미명중(부분 가림 없음) ⓑ관 안면은 아가리(yTop)부터 위로 전부 발광(그루터기 연속 · 관 끝은 무한) ⓒ①의 관 벽은 가림에서 제외(통로) ⓓ2차 반사는 전실 바닥 한 원판만.
import { ZI_ON, ZI_GLOW_ON, ZI_BEAM_ON, ZI_HOLE_ON, ZI_R, ZI_DIM, ZI_GAMMA, ZI_K, ZI_WALL_SELF, ZI_STUB_FADE, ZI_AO_N, ZI_BEAM_N, ZI_HOLE_N, ZI_GLOW_K, ZI_BEAM_K, ZI_HOLE_K, ZI_HOLE_LOBE, ZI_BOUNCE,
  ZI_SRC_DIST, ZI_VOL_R, ZI_VOL_LEN, ZI_VOL_DY, ZI_VOL_SEG, ZI_DISC_R, ZI_VOL_K, RM_SHAFT_OP, FRL_NORM_ON, ZI_WALL_DIP, ZI_WALL_DIP_RAMP, ZI_RAY_EPS, ZI_TREAD_REFL, ZI_ROOM_FILL, ZI_KW_PTS_ON, ZI_KW_STEP, ZI_KW_ZOFF, RIB_DEST_PHI, RIB_DEST_K, SHELL_RIB_R, RIB_WALL_T, RIB_RADIAL_SEG, PASS_FLOOR_Y, RM_ROOF, RM_X0, RM_X1, RM_Z0, RM_Z1,
  PASS_HW, PASS_T, JCT_DN_Z, PASS_X_CHEEK, CHEEK_TOP_NZ } from './constants.js'   // FRL_STUB_MG는 ★214 절 import에 이미 있다
import { lightShaftSpec } from './junctionGeometry.js'   // ★71 빛 기둥 실기하 정본(판 윗면·관 안지름·오큘러스 — 사본 0)

/** 세계 → 상부 여정 그룹 로컬(Ry(+φ)) · 로컬 → 세계(Ry(−φ)) — RibStair toDest와 같은 식의 역·정변환 */
export const ziToLocal = (p, phi = RIB_DEST_PHI) => { const c = Math.cos(phi), s = Math.sin(phi); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c] }
export const ziToWorld = (p, phi = RIB_DEST_PHI) => { const c = Math.cos(phi), s = Math.sin(phi); return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c] }
/** 관 축(로컬 φ=0 리브) 점 · 단위 접선(위 향 · 중앙차분) */
export const ziAxis = (u) => [rOf(u), u * H, 0]
export function ziTangent(u, h = 1e-5) { const a = ziAxis(u - h), b = ziAxis(u + h), d = [b[0] - a[0], b[1] - a[1], 0], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l, 0] }
/** 로컬 점에서 관 축 곡선까지의 **수직** 거리(같은 높이 축점이 아니다 — 기운 관에서는 다르다 · ★218 Ⅵ의 kneewalk 오판 원인) · 황금분할 40회 */
export function ziNearest(pl) {
  const f = (u) => { const a = ziAxis(u); return (pl[0] - a[0]) ** 2 + (pl[1] - a[1]) ** 2 + pl[2] * pl[2] }
  const du = (2 * SHELL_RIB_R) / H; let lo = pl[1] / H - du, hi = pl[1] / H + du
  const g = (Math.sqrt(5) - 1) / 2; let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = f(x1), f2 = f(x2)
  for (let i = 0; i < 40; i++) { if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = f(x1) } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = f(x2) } }
  const u = (lo + hi) / 2, a = ziAxis(u)
  return { u, d: Math.sqrt(f(u)), foot: a }
}
/** 명세 — 아가리 y · 관 안지름 · 전망 판(관 축과 만나는 점 · 위 접선) · 가상 원판(축 위 SRC_DIST) · 판 구멍(SHAFT 위 아가리)·오큘러스·전실 바닥점 · 전실·하강 채널 상자(로컬) */
export function zoneISpec() {
  if (!ZI_ON) return null
  const rd = ribCutSpec().find((c) => c.k === RIB_DEST_K); if (!rd) return null
  const S = lightShaftSpec(); if (!S.on) return null
  const uDisc = S.discTop / H, top = ziAxis(uDisc), dUp = ziTangent(uDisc)
  const src = [top[0] + dUp[0] * ZI_SRC_DIST, top[1] + dUp[1] * ZI_SRC_DIST, top[2] + dUp[2] * ZI_SRC_DIST]
  const holeR = Math.max(0.2, S.rTop - S.wallT)                            // 격자가 덮는 관 **안쪽** 보어(buildShaftGrate와 같은 식)
  const hole = { c: [S.x, S.yTop, S.z], r: holeR }, oculus = { c: [S.x, S.yBot, S.z], r: Math.max(0.2, S.rBot - S.wallT) }
  const spot = [S.x, PASS_FLOOR_Y, S.z]
  const zc = JCT_DN_Z, zw = PASS_HW + PASS_T / 2
  const room = { x0: RM_X0, x1: RM_X1, z0: RM_Z0, z1: RM_Z1, y0: PASS_FLOOR_Y, y1: PASS_FLOOR_Y + RM_ROOF }
  const chan = { x0: RM_X1, x1: PASS_X_CHEEK, z0: zc - zw, z1: zc + zw, y0: PASS_FLOOR_Y, y1: CHEEK_TOP_NZ }
  return { yMouth: rd.yTop, R: ZI_R, rIn: SHELL_RIB_R - RIB_WALL_T, wallT: RIB_WALL_T, uDisc, top, dUp, src, srcR: ZI_R, hole, oculus, spot, room, chan, shaft: S }
}
const inBox = (p, B, e = 1e-3) => p[0] >= B.x0 - e && p[0] <= B.x1 + e && p[2] >= B.z0 - e && p[2] <= B.z1 + e && p[1] >= B.y0 - e && p[1] <= B.y1 + e
/** 관 안면인가(로컬 점 · 수직 거리 ≤ 안면 + 살 3/4 — 안면 5.78 안 · 절단면(5.89) 안 · 바깥면(6.0) 밖) */
export function ziOnInnerWall(pl, Z = zoneISpec()) { if (!Z) return false; const n = ziNearest(pl); return n.d <= Z.rIn + 0.75 * Z.wallT }
/** 관 속인가(로컬 점 · 수직 거리 < 안면) */
export function ziInBore(pl, Z = zoneISpec()) { if (!Z) return false; return ziNearest(pl).d < Z.rIn }
/** 구역 I **소속** 판정(세계좌표 점 — 리브 삼각형 중심·판 인스턴스 중심): 관 속·관 안면 ∧ y > 방 천장(그 x) — 그 아래 관 속은 E 소관(그루터기 관 속 = 1) · 전실·하강 채널 상자 안도 I */
export function zoneIOwns(pw, Z = zoneISpec()) {
  if (!Z) return false
  const pl = ziToLocal(pw)
  if (inBox(pl, Z.room, PASS_T) || inBox(pl, Z.chan, PASS_T)) return true
  return pw[1] > friezeRoomCeil(pw[0]) && ziNearest(pl).d <= Z.rIn + 0.75 * Z.wallT
}
/** ② 발광 벽 삼각형인가 — 세계좌표 중심 cw · **기하 법선** nw · y ≥ 아가리 − MG.
 *  ⚠두 정정(2026.09.08 실측):
 *   ⓐ 소유 메시로 가르면 안 된다 — `buildKneeBody = prism ∩ innerTubeSolid`라 **무릎길 몸의 옆·천장면이 곧 관 안면**이다(전망 몸도 같은 어법).
 *     리브 메시에만 발광을 붙였더니 무릎길 전 구간이 DIM(0.04)이었다. 벽은 '누구의 삼각형인가'가 아니라 **어디를 향해 어디에 있는가**로 정한다.
 *   ⓑ 반경만으로는 안벽(5.78)과 바깥벽(6.0)을 못 가른다 — 10분할 패싯이라 삼각형 **중심**이 반경보다 안쪽(×cos18° = 0.951)에 떨어져 두 대역이 겹친다(실측 중심 5.51~6.0).
 *     ⇒ 위치는 넉넉한 띠로 두고, **법선이 축을 향하는가**로 가른다(안벽 = 축 향 · 바깥벽 = 반대). */
/** ★219-o 관 벽의 어느 면인가 — 로컬 점 cl(축 최근접 n)의 둘레각 θ(면 중앙 0°·꼭짓점 18° 실측)로 안면·바깥면 반지름을 세우고 가까운 쪽. 'in' | 'out'
 *  r_in(θ) = rIn·cos(π/10)/cos δ · r_out(θ) = (rIn+wallT)·cos(π/10)/cos δ(δ = 가장 가까운 면 중앙에서의 각). 두 값 간격 ≥ wallT·cos18° = 0.21 > 처짐 0.06. */
export function ziBoreSide(cl, n = ziNearest(cl), Z = zoneISpec()) {
  const t = ziTangent(n.u), rx = cl[0] - n.foot[0], ry = cl[1] - n.foot[1], rz = cl[2]
  const inPlane = Math.hypot(rx, ry) * Math.sign(rx * t[1] - ry * t[0] || 1), th = Math.atan2(rz, inPlane)
  const step = 2 * Math.PI / RIB_RADIAL_SEG, delta = th - step * Math.round(th / step), apo = Math.cos(Math.PI / RIB_RADIAL_SEG) / Math.cos(delta)
  return Math.abs(n.d - Z.rIn * apo) <= Math.abs(n.d - (Z.rIn + Z.wallT) * apo) ? 'in' : 'out'
}
export function zoneIWallTri(cw, nw, Z = zoneISpec()) {
  if (!Z) return false
  //  ★219 **소속** 경계 = 방 천장(zoneIOwns와 같은 선): 아가리~천장 구간의 관 안면 색은 E 소관(★215-f가 1.0으로 칠한다).
  //   ⚠구판은 하한이 아가리(yMouth)라 E의 방 안 구간까지 I가 덧썼다 — 봉인 차분에서 적발.
  //   ⚠⚠★219-c(2026.09.09 현도 "나선 계단 색이 이상하게 분포"): **소속과 광원은 다른 선이다.** 천장 아래 관 벽도 E가 백색으로 칠하므로 **광원이다** —
  //    가림 분류(zoneIEmitTri)는 천장을 안 본다. 이 선을 겹쳐 놓았더니 나선 판이 "밝은 벽을 캄캄한 몸으로" 보고 glow 0이 됐다(실측 판 300~340 = 0.00~0.19).
  if (cw[1] <= friezeRoomCeil(cw[0])) return false
  const cl = ziToLocal(cw), n = ziNearest(cl)
  //  ★219-m(2026.09.11 현도 "비대칭 무늬 계속 그대로" · 실측): 안면 하한을 r·cos(π/10)−1e-3(직선 원통 면 중앙)에 붙여 두니 **축이 곡선**이라 긴 면 삼각형(~10㎡)의 중심이 5.43~5.49로 처져
//   27장(273㎡)이 분류에서 빠졌고, 그 정점 일부가 D 어둠값 0.04로 남아 왼쪽 쐐기 무늬가 됐다. 여유 = 벽 두께(이 대역엔 안면뿐 · 마구리는 접선 검사가 거른다).
  if (n.d < Z.rIn * Math.cos(Math.PI / RIB_RADIAL_SEG) - Z.wallT || n.d > SHELL_RIB_R + 1e-3) return false
  //  ★219-o(2026.09.11 현도 "외부에서 하나만 각진 리브" · 실측): 이 축거리 대역은 **안면과 바깥면이 겹친다**(안면 꼭짓점 5.78 > 바깥면 면중앙 6.0·cos18° = 5.71) — 구판은 양 부호 법선 검사라 바깥면까지 안면으로 잡아
//   바깥면이 aZi=1·톤·정점 분리를 받았다(⛔외면 불변 LOCKED 위반 · 09.10 "외부 색 변화"의 진짜 원인). 10각형 위상 실측: 꼭짓점 = 18°(mod 36) → 면 중앙 0°. ⇒ ziBoreSide로 가까운 면이 안면일 때만.
  if (ziBoreSide(cl, n, Z) !== 'in') return false
  const nl = ziToLocal(nw), t = ziTangent(n.u)
  const rx = cl[0] - n.foot[0], ry = cl[1] - n.foot[1], rz = cl[2]                       // 축에서 밖으로 나가는 방향(접선 성분 없음 — 최근접점이라 이미 ⟂)
  const rl = Math.hypot(rx, ry, rz); if (rl < 1e-6) return false
  return (nl[0] * rx + nl[1] * ry + nl[2] * rz) / rl < 0 && Math.abs(nl[0] * t[0] + nl[1] * t[1] + nl[2] * t[2]) < 0.9   // 축 향(안면) · 마구리(접선 향)는 제외
}
/** ★219-e 구역 I의 **실내 공극**인가(로컬 점) — 전실 방·하강 채널 상자 안이거나 관 속. 빛이 도는 공간의 정의.
 *  ⚠상자는 **비어 있는 속**을 뜻한다(벽·바닥 살은 그 밖) — 그래서 벽면의 안쪽 면만 이 판정을 통과한다. */
export function zoneIInterior(pl, Z = zoneISpec()) {
  if (!Z) return false
  return inBox(pl, Z.room, 0) || inBox(pl, Z.chan, 0) || ziNearest(pl).d < Z.rIn
}
/** ★219-g 실내 대표점 — 구역 I가 빛을 도는 **공간의 뼈대**: 관 축(아가리~전망 판, 관 지름 간격) + 전실 방·하강 채널 상자 중심 격자.
 *  가시성 판정(zoneIVisibleFromInside)의 표적이다. 좌표 상자 판정이 아니라 **실제 기하로 광선을 쏴서** 안팎을 가르기 위한 것. */
export function zoneIInteriorPoints(Z = zoneISpec()) {
  if (!Z) return []
  const out = []
  for (let y = Z.yMouth; y <= Z.top[1]; y += 2 * Z.R) { const a = ziAxis(y / H); out.push([a[0], y, 0]) }   // 관 축
  out.push([...Z.top])
  const g = (B, nx, ny, nz) => { for (let i = 1; i <= nx; i++) for (let j = 1; j <= ny; j++) for (let k = 1; k <= nz; k++)
    out.push([B.x0 + (B.x1 - B.x0) * i / (nx + 1), B.y0 + (B.y1 - B.y0) * j / (ny + 1), B.z0 + (B.z1 - B.z0) * k / (nz + 1)]) }
  g(Z.room, 3, 2, 3); g(Z.chan, 2, 2, 1)
  //  ★219-p 보행자 눈 경로(무릎길 전 구간) — 무릎길 복도에 대표점이 없어 벽이 흰색↔음영으로 갈리던 얼룩(실측 438㎡)의 수리. 좌표 = 무릎길 설계 프레임 = 구역 I 로컬(스파인 z=0).
  if (ZI_KW_PTS_ON) for (let x = KNEE_XB; x <= KNEE_XA + 1e-9; x += ZI_KW_STEP) { const y = kneeSurfaceY(x) + EYE; for (const z of [0, -ZI_KW_ZOFF, ZI_KW_ZOFF]) out.push([x, y, z]) }
  return out
}
/** ★219-g **가시성으로** 안팎을 가른다(정본) — 면 중심에서 실내 대표점(zoneIInteriorPoints)으로 광선을 쏴, **막힘 없이 닿는 점이 하나라도 있으면 안면**.
 *  ⚠왜 좌표 상자를 안 쓰나(실측 09.09): 벽·바닥 정점은 상자 **경계면 위**에 놓이고(z −4.38 vs 경계 −4.35), CSG 감김·정점 법선이 어긋난 면도 있어
 *   상자·법선 판정은 70㎡ 벽 하나를 통째로 놓쳤다. 실제 기하로 재면 그 면이 방 안에서 보이는지가 곧 답이다.
 *  ray(o, d, maxDist) → 명중이면 {dist, kind}. 자기 면을 맞히지 않게 양쪽으로 살짝 띄워 두 번 쏜다(감김을 안 믿는다).
 *  반환 {inward, side}: side = +1이면 법선 쪽이 실내 · −1이면 반대쪽 · 0이면 바깥면. */
export function zoneIVisibleFromInside(cw, nw, ray, pts, Z = zoneISpec(), d = ZI_RAY_EPS) {
  if (!Z || !ray || !pts || !pts.length) return { inward: false, side: 0 }
  const cl = ziToLocal(cw), nl = ziToLocal(nw)
  for (const sgn of [1, -1]) {
    const o = [cl[0] + nl[0] * d * sgn, cl[1] + nl[1] * d * sgn, cl[2] + nl[2] * d * sgn]
    for (const q of pts) {
      const dx = q[0] - o[0], dy = q[1] - o[1], dz = q[2] - o[2], L = Math.hypot(dx, dy, dz)
      if (L < 1e-6) return { inward: true, side: sgn }
      if ((nl[0] * dx + nl[1] * dy + nl[2] * dz) * sgn <= 0) continue          // 그 면이 등지고 있는 점은 셈에서 뺀다
      const h = ray(o, [dx / L, dy / L, dz / L], L - d)
      if (!h) return { inward: true, side: sgn }
    }
  }
  return { inward: false, side: 0 }
}
/** ★219-c **광원** 삼각형인가 — 색을 누가 칠하느냐(소속)와 무관하게 "이 면이 빛나는가". 관 안면 ∧ y ≥ 아가리 − MG.
 *  천장 아래 관 벽은 E가 1.0으로 칠하므로 광원이고(그루터기 규칙), 천장 위는 I가 칠하는 광원이다 — 광선에게는 둘이 같은 벽이다. */
export function zoneIEmitTri(cw, nw, Z = zoneISpec()) {
  if (!Z || cw[1] < Z.yMouth - FRL_STUB_MG) return false
  const cl = ziToLocal(cw), n = ziNearest(cl)
  if (n.d < Z.rIn * Math.cos(Math.PI / RIB_RADIAL_SEG) - Z.wallT || n.d > SHELL_RIB_R + 1e-3) return false   // ★219-m 처짐 여유(안면 하한) — 광원 분류도 같은 안면
  if (ziBoreSide(cl, n, Z) !== 'in') return false   // ★219-o 바깥면은 광원이 아니다
  const nl = ziToLocal(nw), t = ziTangent(n.u)
  const rx = cl[0] - n.foot[0], ry = cl[1] - n.foot[1], rz = cl[2], rl = Math.hypot(rx, ry, rz)
  if (rl < 1e-6) return false
  return (nl[0] * rx + nl[1] * ry + nl[2] * rz) / rl < 0 && Math.abs(nl[0] * t[0] + nl[1] * t[1] + nl[2] * t[2]) < 0.9
}
/** 코사인 가중 반구 방향(접선 공간 [t,b,n] 계수 · R2 저불일치 · 결정적) — 각 광선의 무게가 같다(가중 표본) */
export function zoneIHemiDirs(n = ZI_AO_N) {
  const R2A = 0.7548776662466927, R2B = 0.5698402909980532, out = []
  for (let i = 0; i < n; i++) { const a = ((i + 0.5) * R2A) % 1, b = ((i + 0.5) * R2B) % 1, r = Math.sqrt(a), th = 2 * Math.PI * b
    out.push([r * Math.cos(th), r * Math.sin(th), Math.sqrt(Math.max(0, 1 - a))]) }
  return out
}
const frameOf = (n) => { const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]
  let t = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]]; const l = Math.hypot(...t); t = [t[0] / l, t[1] / l, t[2] / l]
  return { t, b: [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]] } }
/** ② 벽 가시율 — 정점 p(법선 n) 반구 광선 → 'glow' 명중 비율. ray(o, d, maxDist) → {dist, kind} | null */
export function zoneIGlowAt(p, n, ray, dirs = zoneIHemiDirs()) {
  const { t, b } = frameOf(n), o = [p[0] + n[0] * ZI_RAY_EPS, p[1] + n[1] * ZI_RAY_EPS, p[2] + n[2] * ZI_RAY_EPS]
  let hit = 0
  for (const w of dirs) { const d = [t[0] * w[0] + b[0] * w[1] + n[0] * w[2], t[1] * w[0] + b[1] * w[1] + n[1] * w[2], t[2] * w[0] + b[2] * w[1] + n[2] * w[2]]
    const h = ray(o, d, Infinity); if (!h) continue
    //  ★219-d 걷는 판('tread')은 **준광원**(상호반사 — 상수 ZI_TREAD_REFL 주석). 벽('glow')은 1, 그 외 몸은 0.
    if (h.kind === 'glow') hit += 1; else if (h.kind === 'tread') hit += ZI_TREAD_REFL }
  return hit / dirs.length
}
/** ① 가상 원판 표본(로컬 · 원판 ⟂ dUp · 선플라워) */
export function zoneIBeamSamples(Z = zoneISpec(), n = ZI_BEAM_N) {
  if (!Z) return []
  const { t, b } = frameOf(Z.dUp), ga = Math.PI * (3 - Math.sqrt(5)), out = []
  for (let i = 0; i < n; i++) { const rr = Z.srcR * Math.sqrt((i + 0.5) / n), th = i * ga, c = Math.cos(th) * rr, s = Math.sin(th) * rr
    out.push([Z.src[0] + t[0] * c + b[0] * s, Z.src[1] + t[1] * c + b[1] * s, Z.src[2] + t[2] * c + b[2] * s]) }
  return out
}
/** ① 하강광 — 로컬 p·n: 원판 표본을 향한 그림자 광선(관 벽 'glow' 명중은 통과 · 'body'만 가림) → 가시율 × cos(축 방향) */
export function zoneIBeamAt(pl, n, ray, samps, Z = zoneISpec()) {
  if (!Z || !samps.length) return 0
  const cosA = -(n[0] * -Z.dUp[0] + n[1] * -Z.dUp[1] + n[2] * -Z.dUp[2])   // n·(빛 오는 방향 = dUp)
  if (cosA <= 0) return 0
  const o = [pl[0] + n[0] * ZI_RAY_EPS, pl[1] + n[1] * ZI_RAY_EPS, pl[2] + n[2] * ZI_RAY_EPS]
  let vis = 0
  for (const s of samps) { const d = [s[0] - o[0], s[1] - o[1], s[2] - o[2]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L, d[2] / L]
    const h = ray(o, u, L); if (!h || h.kind === 'glow') vis++ }   // ★219-d 하강광은 판을 통과하지 않는다(직사광의 그림자는 남는다 — 준광원은 ②의 확산광에만)
  return (vis / samps.length) * cosA
}
/** ①′ 판 구멍 원판 표본(로컬 · 아래 향 빔 · 총 출력 1 · 로브) + 전실 바닥 반사 원판(위 향 · 출력 = BOUNCE × 바닥 정규화 조도 — 바닥점은 1이므로 BOUNCE) */
export function zoneIHoleSamples(Z = zoneISpec(), n = ZI_HOLE_N) {
  if (!Z) return []
  const ga = Math.PI * (3 - Math.sqrt(5)), out = []
  for (let i = 0; i < n; i++) { const rr = Z.hole.r * Math.sqrt((i + 0.5) / n), th = i * ga
    out.push({ p: [Z.hole.c[0] + Math.cos(th) * rr, Z.hole.c[1] - 1e-3, Z.hole.c[2] + Math.sin(th) * rr], w: 1 / n, d: [0, -1, 0], lobe: ZI_HOLE_LOBE, kind: 'hole' }) }
  if (ZI_BOUNCE > 0) for (let i = 0; i < n; i++) { const rr = Z.oculus.r * Math.sqrt((i + 0.5) / n), th = i * ga
    out.push({ p: [Z.spot[0] + Math.cos(th) * rr, Z.spot[1] + 1e-3, Z.spot[2] + Math.sin(th) * rr], w: ZI_BOUNCE / n, d: [0, 1, 0], lobe: 1, kind: 'bounce' }) }
  return out
}
/** ①′ 조도 = Σ w·cos·beam/d² (E friezeLightIrradianceAt과 같은 식) + 그림자 광선(ray 있으면 표본까지 무엇이든 명중 = 가림 · 없으면 무가림 해석값 — eRef·검사용) */
export function zoneIHoleIrradianceAt(pl, n, samples, ray = null) {
  let e = 0
  for (const s of samples) {
    const dx = s.p[0] - pl[0], dy = s.p[1] - pl[1], dz = s.p[2] - pl[2], d2 = dx * dx + dy * dy + dz * dz
    if (d2 < 1e-6) continue
    const dl = Math.sqrt(d2), cos = (n[0] * dx + n[1] * dy + n[2] * dz) / dl
    if (cos <= 0) continue
    let beam = 1
    if (s.lobe > 0 && s.d) { const a = -(s.d[0] * dx + s.d[1] * dy + s.d[2] * dz) / dl; if (a <= 0) continue; beam = Math.pow(a, s.lobe) }
    if (ray) { const o = [pl[0] + n[0] * ZI_RAY_EPS, pl[1] + n[1] * ZI_RAY_EPS, pl[2] + n[2] * ZI_RAY_EPS]; const h = ray(o, [dx / dl, dy / dl, dz / dl], dl - 2 * ZI_RAY_EPS); if (h) continue }
    e += (s.w * cos * beam) / d2
  }
  return e
}
/** 기준 조도 = 관 바로 밑 전실 바닥점(위 향) · 구멍 표본만 · 무가림 */
export function zoneIHoleERef(Z = zoneISpec(), samples = zoneIHoleSamples(Z)) { if (!Z) return 1; return zoneIHoleIrradianceAt(Z.spot, [0, 1, 0], samples.filter((s) => s.kind === 'hole')) }
/** 베이크 문맥(한 번) — 명세·방향·표본·기준 */
export function zoneIBake() {
  const Z = zoneISpec(); if (!Z) return null
  const dirs = zoneIHemiDirs(), beam = zoneIBeamSamples(Z), hole = zoneIHoleSamples(Z)
  return { spec: Z, dirs, beam, hole, eRefHole: zoneIHoleERef(Z, hole) }
}
/** 정점 값 — 세계좌표 p·n(단위) · ray는 **로컬 좌표**로 받는 광선 함수 · emitter=true면 발광체(관 안면) = ZI_WALL_SELF */
/** ★219-h 채움을 받는 **면**인가(세계 중심 cw · 안쪽 향 법선 nw) — 중심에서 법선 쪽 한 발짝이 공극 상자(방·채널) 안이면 그 면은 공극에 면한다.
 *  왜 면 단위인가(전수 대조 실측 09.10): 전실 벽 상자면은 이음 겹침으로 공극보다 판 두께만큼 크고 정점 4개가 43㎡를 덮는다 — 귀퉁이 정점은 전부 공극 밖(0.6)이라
 *  점 규칙만으로는 채움을 못 받아 벽 전체가 0.04로 보간됐다(중심 재계산 1.0 · 5면 125㎡). 면이 공극에 면하면 그 정점도 받는다(zoneIWallTri와 같은 어법 = 면이 정한다).
 *  ⛔여유 띠(상자 밖 0.66 · 법선 조건)는 두 판 다 기각 — 전망 램프 밑동 784정점이 채널 상단 위 띠에 걸려 HEAD 값이 움직였다(봉인 차분이 잡음). 여유는 0이다. */
export function zoneIFillFace(cw, nw, Z = zoneISpec(), d = ZI_RAY_EPS) {
  if (!Z || !(ZI_ROOM_FILL > 0)) return false
  const c = ziToLocal(cw), n = ziToLocal(nw), q = [c[0] + n[0] * d, c[1] + n[1] * d, c[2] + n[2] * d]
  return inBox(q, Z.room, 0) || inBox(q, Z.chan, 0)
}
/** ★219-j 관 안면 발광 톤(세계 점) = ZI_WALL_SELF · (1 − (1 − DIP)·smoothstep(0, RAMP, h)) — h = 전망 판(축 위 uDisc 점) 위 **높이**(세계 y 차).
 *  ⛔첫 판(09.10)은 축에 수직 투영한 호길이 s를 썼다 — 관이 30° 기울어 같은 높이의 좌우 벽 s가 ~5.8m 달라 톤이 ~0.2 어긋나 "비대칭"으로 읽혔다(현도 화면). 눈은 수직을 기준으로 보므로 높이로 잰다.
 *  h ≤ 0(판 이하)·관 밖 점은 ZI_WALL_SELF 그대로(연속). ⚠정점마다 제 위치로 부른다(삼각형 중심 하나로 덮어쓰면 ~9㎡ 삼각형 계단 — 첫 판의 둘째 병). */
export function zoneIWallTone(pw, Z = zoneISpec()) {
  if (!Z || !(ZI_WALL_DIP < 1) || !(ZI_WALL_DIP_RAMP > 0)) return ZI_WALL_SELF
  const pl = ziToLocal(pw); if (ziNearest(pl).d > Z.rIn + 0.75 * Z.wallT) return ZI_WALL_SELF
  const h = pw[1] - Z.top[1]; if (h <= 0) return ZI_WALL_SELF
  const t = Math.min(1, h / ZI_WALL_DIP_RAMP), w = t * t * (3 - 2 * t)
  return ZI_WALL_SELF * (1 - (1 - ZI_WALL_DIP) * w)
}
/** ★219-l 관 안면 해석 법선(세계 점 → 세계 단위 벡터 · 축을 향함) — 관은 축 곡선 둘레의 원통이라 안면 법선 = (수직 발 − 점) 방향.
 *  왜: 목적지 리브 관 안면 8,039삼각형은 CSG 산출물이라 감김이 안/밖 반반(실측 3,962/4,077)이고 정점 법선이 절반은 면 법선(플랫)·절반은 평균(스무스)이라 삼각형마다 음영이 갈렸다(현도 "비대칭 무늬").
 *  ZoneI가 관 안면 정점마다 이 벡터를 감김 부호에 맞춰 씌운다(양면 재질의 faceDirection 뒤집기와 정합). 색·조명·기하 위치는 무접촉. */
export function zoneIWallNormal(pw, Z = zoneISpec()) {
  const pl = ziToLocal(pw), n = ziNearest(pl), rl = [n.foot[0] - pl[0], n.foot[1] - pl[1], -pl[2]], rw = ziToWorld(rl), L = Math.hypot(rw[0], rw[1], rw[2])
  return L < 1e-9 ? [0, 1, 0] : [rw[0] / L, rw[1] / L, rw[2] / L]
}
export function zoneIShadeAt(pw, nw, ray, B = zoneIBake(), emitter = false, faceFill = false) {
  if (!B) return 1
  if (emitter) return zoneIWallTone(pw, B.spec)
  const pl = ziToLocal(pw), nl = ziToLocal(nw)
  let E = 0
  if (ZI_GLOW_ON) E += ZI_GLOW_K * zoneIGlowAt(pl, nl, ray, B.dirs)
  if (ZI_BEAM_ON) E += ZI_BEAM_K * zoneIBeamAt(pl, nl, ray, B.beam, B.spec)
  if (ZI_HOLE_ON && B.eRefHole > 0) E += ZI_HOLE_K * zoneIHoleIrradianceAt(pl, nl, B.hole, ray) / B.eRefHole
  //  ★219-f 전실·하강 채널 = 흰 벽으로 닫힌 방 → 상호반사 채움(적분 공동). 관 속은 발광 벽이 이미 채우므로 제외.
  //   ⚠판정은 점 자신이 아니라 **법선 쪽 한 발짝**(★219-e 어법): 벽·바닥 정점은 방 상자의 **경계면 위**라 점 자신으로 물으면 아슬하게 밖으로 떨어진다
  //    (실측: 벽면 z −4.4 vs 경계 −4.35 → 채움 누락 → 70㎡ 벽이 그대로 0.04. 현도 "아직 검정색이야"의 잔여분).
  {
    const q = [pl[0] + nl[0] * ZI_RAY_EPS, pl[1] + nl[1] * ZI_RAY_EPS, pl[2] + nl[2] * ZI_RAY_EPS]
    //   ★219-h faceFill: 이 정점이 속한 **면**이 공극에 면하면(zoneIFillFace — 베이크가 삼각형 중심으로 정한다) 점이 상자 밖 귀퉁이라도 채움을 받는다(벽 상자면 43㎡가 0.04로 보간되던 병).
    if (ZI_ROOM_FILL > 0 && (faceFill || inBox(q, B.spec.room, 0) || inBox(q, B.spec.chan, 0))) E += ZI_ROOM_FILL
  }
  const sh = ZI_DIM + (1 - ZI_DIM) * ZI_K * Math.pow(Math.min(1, Math.max(0, E)), ZI_GAMMA)
  return zoneIStubBlend(pw, sh, B.spec)
}
/** ★219-b 그루터기 이음 — 관 속 점만: 방 천장 위 ZI_STUB_FADE 동안 E의 "관 속 = 1"(★215-f)에서 I 값으로 스무스스텝. 관 밖(전실·채널)은 무관(그대로). */
export function zoneIStubBlend(pw, sh, Z = zoneISpec()) {
  if (!Z || !(ZI_STUB_FADE > 0)) return sh
  const pl = ziToLocal(pw); if (ziNearest(pl).d >= Z.rIn) return sh
  const t = Math.min(1, Math.max(0, (pw[1] - friezeRoomCeil(pw[0])) / ZI_STUB_FADE)), w = t * t * (3 - 2 * t)
  return 1 * (1 - w) + sh * w
}
/** ★219-i 관 속 빛기둥 축 폴리라인(로컬) — 전망 판(uDisc)에서 축을 따라 VOL_LEN까지 dy 걸음 · {p 축점, t 접선(위 향), s 호길이}. tube·discs가 같은 점열을 쓴다(사본 금지) */
export function zoneIBoreAxis(Z = zoneISpec(), dy = ZI_VOL_DY) {
  if (!Z) return []
  const pts = []; let s = 0, u = Z.uDisc; pts.push({ p: ziAxis(u), t: ziTangent(u), s, u })
  while (s < ZI_VOL_LEN) { const step = Math.min(dy, ZI_VOL_LEN - s); const tg = ziTangent(u); u += step * tg[1] / H; s += step; pts.push({ p: ziAxis(u), t: ziTangent(u), s, u }) }
  return pts
}
/** ★219-i 관 속 빛기둥 = 축 단면 **원판 적층**(축 방향 시선용 — 옆면 튜브는 facing이 죽는다 · 실측 constants ZI_VOL_BORE 주석).
 *  원판마다 부채꼴 sides장: 중심 uv.x = 0.5 · 림 uv.x = 0 ⇒ 셰이더 xf = smoothstep(0, uXF, min(uv.x, 1−uv.x)·2) = smoothstep(0, uXF, 1 − r/rad) — 림에서 0, 안쪽 uXF 구간이 깃털(★189 경계 없음).
 *  법선 = 축 접선(전부 같은 값 · 올려다보면 facing=1, 옆에서는 0) · uv.y = s/L(길이 소멸 · 근원 불가시). 반지름 = ZI_DISC_R. */
export function zoneIDiscTris(Z = zoneISpec(), { sides = ZI_VOL_SEG, dy = ZI_VOL_DY, rad = ZI_DISC_R } = {}) {
  if (!Z) return null
  const pts = zoneIBoreAxis(Z, dy), L = pts[pts.length - 1].s, pos = [], uv = [], nrm = []
  const push = (p, ux, n, s) => { pos.push(p[0], p[1], p[2]); uv.push(ux, s / L); nrm.push(n[0], n[1], n[2]) }
  for (const q of pts) { const { t, b } = frameOf(q.t)
    const rim = (k) => { const a = (k / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); const nn = [t[0] * ca + b[0] * sa, t[1] * ca + b[1] * sa, t[2] * ca + b[2] * sa]; return [q.p[0] + nn[0] * rad, q.p[1] + nn[1] * rad, q.p[2] + nn[2] * rad] }
    for (let k = 0; k < sides; k++) { push(q.p, 0.5, q.t, q.s); push(rim(k), 0, q.t, q.s); push(rim(k + 1), 0, q.t, q.s) } }
  return { pos, uv, nrm, len: L, rings: pts.length, discs: pts.length }
}
/** ★219-i 원판 한 장의 세기 = ★215-b 겹 정규화 승계: 축 시선은 원판 n장을 전부 지나므로 총량 RM_SHAFT_OP(×ZI_VOL_K 판정 배율)를 n으로 나눈다. FRL_NORM_ON=false면 정규화 없음(E 규칙 그대로) */
export function zoneIDiscOpacity(n) { return (FRL_NORM_ON ? RM_SHAFT_OP / Math.max(1, n) : RM_SHAFT_OP) * ZI_VOL_K }
/** 볼륨 — 관 축을 따르는 폴리라인 튜브(uv.y = 호길이/전체 → 셰이더 len 소멸) · part 'bore' = 전망 판 → 위로 VOL_LEN(끝 알파 0 = 근원 불가시) · 'shaft' = 판 구멍 → 오큘러스 → 전실 바닥(수직) */
export function zoneITubeTris(Z = zoneISpec(), part = 'bore', { sides = ZI_VOL_SEG, dy = ZI_VOL_DY } = {}) {
  if (!Z) return null
  const pos = [], uv = [], nrm = []
  let pts = [], rad
  if (part === 'bore') { rad = ZI_VOL_R; pts = zoneIBoreAxis(Z, dy) }
  else { rad = Math.max(0.05, Z.oculus.r - ZI_RAY_EPS); const y0 = Z.hole.c[1], y1 = Z.spot[1], L = y0 - y1
    for (let s = 0; s < L - 1e-9; s += dy) pts.push({ p: [Z.hole.c[0], y0 - s, Z.hole.c[2]], t: [0, -1, 0], s }); pts.push({ p: [Z.hole.c[0], y1, Z.hole.c[2]], t: [0, -1, 0], s: L }) }
  const L = pts[pts.length - 1].s
  const ring = (q, k) => { const { t, b } = frameOf(q.t), a = (k / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a)
    const nn = [t[0] * ca + b[0] * sa, t[1] * ca + b[1] * sa, t[2] * ca + b[2] * sa]; return { p: [q.p[0] + nn[0] * rad, q.p[1] + nn[1] * rad, q.p[2] + nn[2] * rad], n: nn } }
  const push = (r, ux, s) => { pos.push(r.p[0], r.p[1], r.p[2]); uv.push(ux, s / L); nrm.push(r.n[0], r.n[1], r.n[2]) }
  for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < sides; k++) {
    const a0 = ring(pts[i], k), a1 = ring(pts[i], k + 1), b0 = ring(pts[i + 1], k), b1 = ring(pts[i + 1], k + 1), u0 = k / sides, u1 = (k + 1) / sides
    push(a0, u0, pts[i].s); push(a1, u1, pts[i].s); push(b1, u1, pts[i + 1].s)
    push(a0, u0, pts[i].s); push(b1, u1, pts[i + 1].s); push(b0, u0, pts[i + 1].s)
  }
  return { pos, uv, nrm, len: L, rings: pts.length }
}
