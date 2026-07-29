// ════════════════════════════════════════════════════════════════════════════
//  viewProbe.js — 원근 시야 광선의 기하 정본 (★83 승격, 2026.07.29)
// ════════════════════════════════════════════════════════════════════════════
//  ★왜 모듈인가: 이 광선 캐스터는 `_probe_view.mjs` 안에 있던 **일회용 도구**였다.
//   ★75 리브 찌꺼기를 잡아낸 것이 이 도구이고, 그 전 진단 세 벌은 전부 틀렸다:
//    ① 축평행 광선만 씀 → 0점(원근 시야는 각도가 있다)
//    ② 볼벽·디딤판·슬랩 미포함 → 가려진 살까지 셈
//    ③ 방 +x벽 미포함 → 벽 뒤 살까지 셈
//   ⇒ **가림막 대장이 비면 시야 진단은 전부 거짓말이다.**
//   도구가 repo 안에 손으로 돌리는 프로브로만 있으면 회귀를 못 막는다. 그래서 정본을 여기로
//   옮기고 프로브·검사가 **같은 함수**를 소비한다(㊸ `drumPierAzimuths()` 이관과 같은 형식).
//
//  ⚠이 모듈은 **판정하지 않는다** — 무엇에 먼저 맞는지 이름표만 찍는다.
//   판정(살이 보이면 실패)은 `check_corridor` U절이 한다.
//
//  이름표: R=리브 살 · S=계단 매스 · t=계단 디딤판 · d=하강 디딤판 · C=볼벽 · p=정션 판 · W=방 +x벽 · _=슬랩

import * as C from './constants.js'
import {
  axisDistAt, inRibArchCut, roomMouthArch, cheekTopPzAt, pzCheekProfile, tubeInnerBottomAt, descFloorAt,
  wideStairSpec, wideStairOutline, wstairTopAt, archCutProfile,
  junctionPlateOutline, JCT_PLATE_TOP, wideStairTreads,
} from './junctionGeometry.js'
import { EYE } from './waypoints.js'

const {
  SHELL_RIB_R, RIB_WALL_T, RIB_WALL_ON, RM_X0, RM_X1, RM_ROOF, PASS_FLOOR_Y, PASS_T, PASS_HW, PASS_FUSE,
  JCT_DN_Z, CHEEK_TOP_NZ, PASS_X_CHEEK, DESC_STEPS, DESC_STEP_R, DESC_TREAD_D, X_DESC0, DESC_SLOPE,
  U_KNEE_END, H, TREAD_THICK, LAND_T, CLEAR_HW, WARCH_HW, WARCH_FUSE, RM_MOUTH_REVEAL,
} = C

const iR = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
const oR = SHELL_RIB_R
const zw = PASS_HW + PASS_T / 2

//  ── 빠른 축거리 ────────────────────────────────────────────────────────────
//  ⚠`axisDistAt`은 호출마다 u를 1250번 훑는다. 광선 20만 발이면 5억 회라 검사에 못 넣는다
//   (실측 120초). 여기서는 **같은 표본점 집합**을 한 번만 만들어 두고 성긴→촘촘 2단으로 찾는다.
//   표본 집합이 같으므로 참값이 같아야 하고, `axisDistMatches()`가 그걸 실제로 대조한다.
//   ★도구를 먼저 검증하고 쓴다 — 이 프로젝트에서 진단 도구가 틀린 전례가 반복됐다.
const AXN = Math.floor((0.40 - 0.15) / 0.0002)
const AXR = new Float64Array(AXN), AXY = new Float64Array(AXN)
for (let i = 0; i < AXN; i++) { const u = 0.15 + i * 0.0002; AXR[i] = C.rOf(u); AXY[i] = u * H }
const COARSE = 25

export function axisDistFast (x, y, z) {
  let bi = 0, bd = Infinity
  for (let i = 0; i < AXN; i += COARSE) {
    const dx = AXR[i] - x, dy = AXY[i] - y, d = dx * dx + dy * dy
    if (d < bd) { bd = d; bi = i }
  }
  const lo = Math.max(0, bi - COARSE - 1), hi = Math.min(AXN - 1, bi + COARSE + 1)
  let best = Infinity
  for (let i = lo; i <= hi; i++) {
    const dx = AXR[i] - x, dy = AXY[i] - y, d = dx * dx + dy * dy
    if (d < best) best = d
  }
  return Math.sqrt(best + z * z)
}

//  성긴→촘촘이 지역 최소에 빠지지 않는지 전수 대조(검사가 매 실행 부른다)
export function axisDistMatches (samples = 400, seed = 7) {
  let s = seed, worst = 0
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  for (let k = 0; k < samples; k++) {
    const x = 160 + rnd() * 45, y = 230 + rnd() * 60, z = -12 + rnd() * 24
    worst = Math.max(worst, Math.abs(axisDistFast(x, y, z) - axisDistAt(x, y, z)))
  }
  return worst
}

//  ── 관 내벽 밑면 · 아치 크라운 — **이분법을 직접 해로 교체** ────────────────
//  ⚠원본 `tubeInnerBottomAt`은 이분법 40회 × `axisDistAt`(1250회 스캔) = 호출당 5만 회 hypot이고,
//   `ribArchCrownAt`이 그걸 z마다(19회) 부른다 = **호출당 17.5 ms**(실측). 광선 검사가 이걸 부르면
//   1회 캐스트가 75초다. 그래서 못 쓰고 프로브로만 남아 있었다.
//  ★직접 해: 축 표본 i마다 반경 rr 원이므로, 안에 드는 최저 y = min(AXY[i] − √(rr²−Δx²)). 한 번 훑으면 끝.
//   같은 표본 집합을 쓰므로 참값이 같아야 하고, `tubeBottomMatches()`가 실제로 대조한다.
const {
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Z0, ARCH_Z1, ARCH_HEAD,
} = C

export function tubeInnerBottomFast (x, z = 0) {
  const R0 = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
  const rr2 = Math.max(0, R0 * R0 - z * z), rr = Math.sqrt(rr2)
  const yc = H * C.uOfX(x)
  let best = Infinity
  for (let i = 0; i < AXN; i++) {
    const dx = AXR[i] - x
    if (dx > rr || dx < -rr) continue
    const y = AXY[i] - Math.sqrt(rr2 - dx * dx)
    if (y < best) best = y
  }
  return Math.min(yc, Math.max(best, yc - 9))
}

export function tubeBottomMatches (samples = 120, seed = 11) {
  let s = seed, worst = 0
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  for (let k = 0; k < samples; k++) {
    const x = ARCH_X0 + rnd() * (ARCH_X1 - ARCH_X0), z = rnd() * PASS_HW
    worst = Math.max(worst, Math.abs(tubeInnerBottomFast(x, z) - tubeInnerBottomAt(x, z)))
  }
  return worst
}

const _crown = new Map()
export function ribArchCrownFast (x) {
  const k = Math.round(x * 10000)
  const hit = _crown.get(k)
  if (hit !== undefined) return hit
  const hw = (ARCH_Z1 - ARCH_Z0) / 2 + 0.25
  let need = descFloorAt(x) + ARCH_HEAD
  for (let z = 0; z <= PASS_HW + 0.1; z += 0.1) {
    const sq = Math.sqrt(Math.max(0, 1 - (z / hw) * (z / hw)))
    need = Math.max(need, tubeInnerBottomFast(x, z) + 0.1 + hw * (1 - sq))
  }
  _crown.set(k, need)
  return need
}

//  원본 `inRibArchCut`과 같은 식, 크라운만 빠른 경로
export function inRibArchCutFast (x, y, z) {
  if (x < ARCH_X0 || x > ARCH_X1) return false
  const hw = (ARCH_Z1 - ARCH_Z0) / 2 + 0.25
  const crown = ribArchCrownFast(x)
  const spring = Math.max(ARCH_Y0 + 0.05, crown - hw)
  const zz = (z - JCT_DN_Z) / hw
  if (Math.abs(zz) > 1) return false
  if (y < ARCH_Y0) return false
  if (y <= spring) return true
  const yy = (y - spring) / (crown - spring)
  return yy <= 1 && zz * zz + yy * yy <= 1
}

export function archCutMatches (samples = 600, seed = 13) {
  let s = seed, bad = 0
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
  for (let k = 0; k < samples; k++) {
    const x = ARCH_X0 - 0.3 + rnd() * (ARCH_X1 - ARCH_X0 + 0.6)
    const y = ARCH_Y0 - 0.5 + rnd() * 9, z = JCT_DN_Z - 3 + rnd() * 6
    if (inRibArchCutFast(x, y, z) !== inRibArchCut(x, y, z)) bad++
  }
  return bad
}

//  ── 지연 캐시(모듈 로드 시 기하를 다 세우지 않는다 — 검사 시작이 느려진다) ──
let T = null
function tables () {
  if (T) return T
  const P2 = pzCheekProfile()
  const A = roomMouthArch()
  const sp = Math.max(A.floor + 0.05, A.crown - A.hw)
  const DT = []
  const yT = U_KNEE_END * H
  for (let i = 0; i < DESC_STEPS; i++) {
    const y = yT - (i + 0.5) * DESC_STEP_R
    DT.push([X_DESC0 - (yT - y) / DESC_SLOPE, y])
  }
  const S = wideStairSpec(), WO = wideStairOutline(), WT = wideStairTreads()
  const AP = archCutProfile().filter((q) => q.open)
  const OL = junctionPlateOutline()
  T = { P2, A, sp, DT, S, WO, WT, AP, OL }
  return T
}

const near = (list, x, key) => {
  let b = null, bd = Infinity
  for (const q of list) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; b = q } }
  return { v: b ? b[key] : null, d: bd, q: b }
}

//  ── 문 아치의 개구 판정 — 그 (y,z)가 문 구멍 안인가 ──
export function inDoorAperture (y, z) {
  const { A, sp } = tables()
  const zz = Math.abs(z - JCT_DN_Z) / A.hw
  if (zz > 1) return false
  if (y >= A.floor - 0.4 && y <= sp) return true
  if (y > sp && y <= A.crown) { const yy = (y - sp) / (A.crown - sp); return zz * zz + yy * yy <= 1 }
  return false
}

export function doorArch () { const { A, sp } = tables(); return { ...A, spring: sp } }

//  ── 한 점이 무엇인가 ──
export function hitLabel (x, y, z) {
  const { P2, A, sp, DT, S, WO, WT, AP, OL } = tables()
  //  ★방 +x벽(아치 감산 패널) — 이게 빠져 있어 '벽 뒤 살'까지 보인다고 셌다(프로브 3차 결함)
  if (x >= RM_X1 - RM_MOUTH_REVEAL && x <= RM_X1 + PASS_T &&
      y >= PASS_FLOOR_Y - PASS_T && y <= PASS_FLOOR_Y + RM_ROOF + PASS_T &&
      Math.abs(z - JCT_DN_Z) <= PASS_HW + PASS_T) {
    if (!inDoorAperture(y, z)) return 'W'
  }
  if (y >= PASS_FLOOR_Y - PASS_T && y <= PASS_FLOOR_Y && x >= RM_X1 && x <= PASS_X_CHEEK) return '_'
  if (x >= RM_X1 && x <= PASS_X_CHEEK && y >= PASS_FLOOR_Y && y <= CHEEK_TOP_NZ &&
      Math.abs(z - (JCT_DN_Z - zw)) <= PASS_T / 2) return 'C'
  if (x >= P2.x0 && x <= P2.x1 && y >= P2.yBot && y <= cheekTopPzAt(x) && Math.abs(z - P2.z) <= P2.t / 2) return 'C'
  for (const c of DT)
    if (Math.abs(x - c[0]) <= DESC_TREAD_D / 2 && Math.abs(y - c[1]) <= TREAD_THICK / 2 &&
        Math.abs(z - JCT_DN_Z) <= PASS_HW + PASS_FUSE) return 'd'
  for (const t of WT)
    if (Math.abs(x - t.x) <= t.d / 2 && Math.abs(y - t.y) <= TREAD_THICK / 2 &&
        Math.abs(z - (t.z ?? 0)) <= t.w / 2) return 't'
  {
    const h = (x < OL[0].x || x > OL[OL.length - 1].x) ? -1 : near(OL, x, 'h').v
    if (h > 0 && Math.abs(z) <= h && Math.abs(z - JCT_DN_Z) > CLEAR_HW &&
        y >= JCT_PLATE_TOP - LAND_T && y <= JCT_PLATE_TOP) return 'p'
  }
  if (x >= S.x1 && x <= S.x0) {
    const top = wstairTopAt(x)
    if (y <= top && Math.abs(z) <= near(WO, x, "h").v && axisDistFast(x, y, z) <= iR) {
      const g = near(AP, x, 'x')
      const V = g.d < 0.2 ? g.q : null
      let inV = false
      const vhw = WARCH_HW + WARCH_FUSE
      if (V && Math.abs(z - JCT_DN_Z) <= vhw) {
        const s2 = Math.max(V.floor + 0.05, V.crown - vhw), zz = (z - JCT_DN_Z) / vhw
        inV = (y >= V.floor && y <= s2) ||
              (y > s2 && y <= V.crown && zz * zz + Math.pow((y - s2) / (V.crown - s2), 2) <= 1)
      }
      if (!inV) return 'S'
    }
  }
  { const d = axisDistFast(x, y, z); if (d >= iR && d <= oR && !inRibArchCutFast(x, y, z)) return "R" }
  return null
}

//  ── 방 안 눈에서 문을 향해 부채꼴로 쏜다 ──
//  ⚠표적면은 방 +x벽(x = RM_X1)이다. 눈에서 그 면의 격자점을 향해 쏘고, 처음 맞는 것을 적는다.
export const probeEye = () => [RM_X0 + 4, PASS_FLOOR_Y + EYE, 0]

export function castDoorFan (opt = {}) {
  const { A } = tables()
  const eye = opt.eye ?? probeEye()
  const dy = opt.dy ?? 0.28, dz = opt.dz ?? 0.12
  const yPad = opt.yPad ?? 0.4, zPad = opt.zPad ?? 0.3
  const sMax = opt.sMax ?? 14, ds = opt.ds ?? 0.05
  const rows = [], ribHits = []
  let samples = 0, aperture = 0
  for (let ey = A.crown + yPad; ey >= A.floor; ey -= dy) {
    const cells = []
    for (let ez = -A.hw - zPad; ez <= A.hw + zPad; ez += dz) {
      const dir = [1, (ey - eye[1]) / (RM_X1 - eye[0]), (ez - eye[2]) / (RM_X1 - eye[0])]
      const n = Math.hypot(...dir), D = dir.map((v) => v / n)
      let lab = '·', hp = null
      for (let s = 0.2; s <= sMax; s += ds) {
        const p = [eye[0] + D[0] * s, eye[1] + D[1] * s, eye[2] + D[2] * s]
        const L = hitLabel(p[0], p[1], p[2])
        if (L) { lab = L; hp = p; break }
      }
      samples++
      const inAp = inDoorAperture(ey, ez)
      if (inAp) aperture++
      cells.push(lab)
      if (lab === 'R' && inAp) ribHits.push(hp)
    }
    rows.push({ ey, cells })
  }
  return { eye, rows, ribHits, samples, aperture }
}
