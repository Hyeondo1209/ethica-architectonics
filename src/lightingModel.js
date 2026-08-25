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
} from './constants.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
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
