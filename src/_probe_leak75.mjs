// ════════════════════════════════════════════════════════════════════════════
//  _probe_leak75.mjs — ★75 착수 전 **누출 차분 검사** (2026.07.26)
// ════════════════════════════════════════════════════════════════════════════
//  왜 이게 첫 작업인가:
//   `JCT_DN_Z` 1.75 → 0 은 상수 한 줄이고 파생(채널·볼벽 둘·아치 컷·방 입구)이 전부 따라온다.
//   그래서 **전 스위트가 green으로 통과한다** — 그러나 ★74가 신설한 봉인 검사는 볼벽 상단을
//   *판 기준 높이*로 잠글 뿐 **시선 자체를 안 잰다.** 누출 실측은 z=1.75 기하에서 한 것이므로
//   z=0에서는 전부 다시 재야 한다.
//
//  ★모델 규율(2026.07.25 실패 3회에서 얻음 — 브리프 §3-①):
//   ① **포함 판정**을 쓴다(교차 판정은 살 안쪽 경계 5.78 대신 바깥 6.0을 봐 관통을 놓쳤다)
//   ② **표본 간격 < 살 두께(0.22)** — 여기서는 0.08
//   ③ 절댓값이 아니라 **차분**만 본다(값을 바꿨을 때 늘어나는가)
//   ④ 모델 두 벌이 같은 답을 내도 정확성의 증거가 아니다 — 그래서 이 파일은 절댓값을
//      "누출률"이라 부르지 않고 **표본 수**로만 보고한다.
//
//  누출의 정의: 하강 보행선(눈높이 1.6) + 정션 판 위에서 쏜 광선이, 봉인 부재 어디에도
//   막히지 않고 MARCH_MAX(30)까지 나아가는 것. = 관 밖 돔 내부로 시선이 빠짐 = 1p11 스포.
//
//  사용법:  node src/_probe_leak75.mjs            (현행 상수로 1회 측정)
//   차분은 `JCT_DN_Z` 한 줄을 바꿔 두 번 돌려 비교한다(스크립트가 그 값을 머리에 찍는다).

import {
  H, rOf, U_KNEE_END, X_LAND_LO, X_LAND_HI, LAND_T,
  SHELL_RIB_R, RIB_WALL_ON, RIB_WALL_T,
  JCT_DN_Z, PASS_HW, PASS_T, PASS_FLOOR_Y, PASS_X_DEEP, PASS_X_CHEEK,
  CHEEK_TOP_NZ, DESC_STEPS, STEP_RISE, DESC_SLOPE, X_DESC0,
  RM_X0, RM_X1, RM_Z0, RM_Z1, RM_ROOF, RM_MOUTH_H, RM_ROOF_OV_PX,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1,
  CL_R, CL_HW, TREAD_THICK, DESC_STEP_R as C_DESC_STEP_R, DESC_TREAD_D as C_DESC_TREAD_D, WARCH_HW as WARCH_HW_L,
  U_LOOKOUT_END, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_LIFT, LK_DISC_T, LK_PLAT_R,
  JCT_KNOT_ON, JCT_KNOT_D, JCT_KNOT_TOP, JCT_KNOT_INSET,
} from './constants.js'
import { junctionPlateOutline, plateMaxHalf, cheekTopPzAt, pzCheekProfile, JCT_PLATE_TOP,
  wideStairSpec, wideStairOutline, wstairTopAt, archCutProfile } from './junctionGeometry.js'

const DEG = 180 / Math.PI
const EYE = 1.6
const STEP = 0.08          // < 살 두께 0.22 (규율 ②)
const MARCH_MAX = 30
const N_AZ = 120           // 방위 표본
const N_EL = 13            // 고도 표본
const EL0 = -25, EL1 = 75  // 고도 범위(도)

// ── 리브 중심선까지의 거리 ──────────────────────────────────────────────
//  ★가속 2단: (a) y = u·H 라 u가 y에 단조 → 질의 y 근방 대역만 훑는다.
//   (b) 그래도 광선 표본이 1e7 규모라, (r,y) 평면 거리를 **한 번만** 격자에 구워 두고
//       이중선형으로 읽는다. 축거리는 z와 직교하므로 hypot으로 합친다.
//  ⚠격자 간격 0.03 < 살 두께 0.22 — 규율 ②를 격자에서도 지킨다.
const GX0 = 158, GX1 = 214, GY0 = 232, GY1 = 296, GS = 0.03
const GNX = Math.round((GX1 - GX0) / GS) + 1, GNY = Math.round((GY1 - GY0) / GS) + 1
const FIELD = new Float32Array(GNX * GNY)
{
  //  중심선 폴리라인(y 오름차순 — u가 y에 단조라 그대로 정렬돼 있다)
  const RU = [], YU = []
  for (let u = 0.14; u < 0.42; u += 0.0002) { RU.push(rOf(u)); YU.push(u * H) }
  const M = RU.length
  for (let j = 0; j < GNY; j++) {
    const y = GY0 + j * GS
    //  y ± 9 대역만 후보(그 밖은 이미 9보다 멀다)
    let a = 0, b = M - 1
    while (a < M && YU[a] < y - 9) a++
    while (b >= 0 && YU[b] > y + 9) b--
    for (let i = 0; i < GNX; i++) {
      const x = GX0 + i * GS
      let best = 1e18
      for (let k = a; k <= b; k++) {
        const dr = RU[k] - x, dy = YU[k] - y
        const d2 = dr * dr + dy * dy
        if (d2 < best) best = d2
      }
      FIELD[j * GNX + i] = Math.sqrt(best)
    }
  }
}
function d2D(x, y) {
  if (x < GX0 || x > GX1 - GS || y < GY0 || y > GY1 - GS) return 99
  const fi = (x - GX0) / GS, fj = (y - GY0) / GS
  const i = fi | 0, j = fj | 0, tx = fi - i, ty = fj - j
  const a = FIELD[j * GNX + i], b = FIELD[j * GNX + i + 1]
  const c = FIELD[(j + 1) * GNX + i], d = FIELD[(j + 1) * GNX + i + 1]
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
}
function axisDist(x, y, z) { const p = d2D(x, y); return Math.sqrt(p * p + z * z) }

const R_OUT = SHELL_RIB_R
const R_IN = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R

// ── 봉인 부재 대장(포함 판정용 순수 술어) ──────────────────────────────
const t = PASS_T, floor = PASS_FLOOR_Y, zc = JCT_DN_Z, zw = PASS_HW + t / 2

const inBox = (p, x0, x1, y0, y1, z0, z1) =>
  p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 && p[2] >= z0 && p[2] <= z1

//  ① 리브 살 — 단, 아치 컷이 뚫은 대역은 제외(감산이므로 거기엔 살이 없다)
function inRibWall(p) {
  if (p[0] < 160 || p[0] > 210 || p[1] < 235 || p[1] > 290) return false
  const d = axisDist(p[0], p[1], p[2])
  if (d < R_IN || d > R_OUT) return false
  if (inBox(p, ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1)) return false  // 아치 개구
  return true
}

//  ② 하강 채널 봉인 슬랩(바닥)
const inSlab = (p) => inBox(p, RM_X1, PASS_X_DEEP, floor - t, floor, zc - zw - t / 2, zc + zw + t / 2)

//  ③ −z 볼벽(상단 = 상수 높이)
const inCheekNz = (p) => inBox(p, RM_X1, PASS_X_CHEEK, floor, CHEEK_TOP_NZ, zc - zw - t / 2, zc - zw + t / 2)

//  ④ +z 볼벽(★74 레이크 — 상단이 x의 함수)
function inCheekPz(p) {
  const P = PZ
  if (p[0] < P.x0 || p[0] > P.x1) return false
  if (p[2] < P.z - P.t / 2 || p[2] > P.z + P.t / 2) return false
  return p[1] >= P.yBot && p[1] <= cheekTopPzAt(p[0])
}

//  ⑤ 정션 판(★72 관 단면 추종 윤곽)
const OUTLINE = junctionPlateOutline()
const PLATE_MAXH = plateMaxHalf()      // ⚠호출마다 재계산하면 95ms — 반드시 한 번만(실측 사고)
const PZ = pzCheekProfile()
function plateHalfAt(x) {
  if (x < OUTLINE[0].x || x > OUTLINE[OUTLINE.length - 1].x) return -1
  const f = (x - OUTLINE[0].x) / (OUTLINE[OUTLINE.length - 1].x - OUTLINE[0].x) * (OUTLINE.length - 1)
  const i = Math.max(0, Math.min(OUTLINE.length - 2, Math.floor(f)))
  return OUTLINE[i].h + (OUTLINE[i + 1].h - OUTLINE[i].h) * (f - i)
}
function inPlate(p) {
  if (p[1] < JCT_PLATE_TOP - LAND_T || p[1] > JCT_PLATE_TOP) return false
  const h = plateHalfAt(p[0])
  return h > 0 && Math.abs(p[2]) <= h
}

//  ⑥ ★70 매듭(각기둥 ∩ 관 안쪽)
function inKnot(p) {
  if (!JCT_KNOT_ON) return false
  const i = JCT_KNOT_INSET
  const yTop = JCT_PLATE_TOP - LAND_T + JCT_KNOT_TOP, yBot = JCT_PLATE_TOP - JCT_KNOT_D
  if (!inBox(p, X_LAND_LO + i, X_LAND_HI - i, yBot, yTop, -PLATE_MAXH, PLATE_MAXH)) return false
  return axisDist(p[0], p[1], p[2]) <= R_IN
}

//  ⑦ 방(바닥·4벽·지붕) — 하강 입과 회랑 입만 뚫려 있다
function inRoom(p) {
  if (inBox(p, RM_X0, RM_X1, floor - t, floor, RM_Z0, RM_Z1 + 0.6)) return true            // 바닥
  if (inBox(p, RM_X0 - t, RM_X0, floor - t, floor + RM_ROOF + t, RM_Z0 - t, RM_Z1 + t)) return true  // −x벽
  if (inBox(p, RM_X0 - t, RM_X1 + t, floor - t, floor + RM_ROOF + t, RM_Z0 - t, RM_Z0)) return true  // −z벽
  //  +x벽 = 하강 입(2zw × RM_MOUTH_H)만 비우고 나머지
  if (p[0] >= RM_X1 && p[0] <= RM_X1 + t && p[1] >= floor - t && p[1] <= floor + RM_ROOF + t) {
    const inMouth = p[2] >= zc - zw && p[2] <= zc + zw && p[1] <= floor + RM_MOUTH_H
    if (!inMouth) return true
  }
  //  +z벽 = 회랑 입(mX0~mX1)만 비우고 나머지
  const mX0 = CL_R - CL_HW + 0.3, mX1 = CL_R + CL_HW - 0.3
  if (p[0] >= RM_X0 - t && p[0] <= RM_X1 + t && p[2] >= RM_Z1 && p[2] <= RM_Z1 + t
      && p[1] >= floor - t && p[1] <= floor + RM_ROOF + t) {
    if (!(p[0] >= mX0 && p[0] <= mX1)) return true
  }
  //  지붕(★73 +x 오버행 절삭 반영)
  if (inBox(p, RM_X0 - t, RM_X1 + RM_ROOF_OV_PX, floor + RM_ROOF, floor + RM_ROOF + t, RM_Z0 - t, RM_Z1 + t)) return true
  return false
}

//  ⑧ 회랑(1p9) 외피 — ★1차 측정이 이게 없어 결과를 못 믿게 만들었다.
//   z를 0으로 옮기면 하강 채널이 **+z 회랑 쪽으로 다가간다**. 회랑 외피를 안 넣으면
//   대각(150°) 광선이 회랑 자리를 그냥 통과해 '누출'로 잡히는데, 그건 봉인 결함이 아니라
//   모델의 구멍이다. ⚠회랑 개구(창)는 1p9의 **의도된 노출**이고 별도로 검증되므로 여기선 막는다.
function inCloister(p) {
  const r = Math.hypot(p[0], p[2])
  if (r < CL_R - CL_HW - t || r > CL_R + CL_HW + t) return false
  const phi = Math.atan2(p[2], p[0])
  if (phi < 0 || phi > 24.5 * Math.PI / 180) return false
  return p[1] >= floor - t && p[1] <= floor + 20 + t
}

//  ⑨ 계단 판 — 하강 23칸 + 전망 램프. ★공정하게 재려면 넣어야 한다:
//   현재 위쪽을 막고 있는 건 이 **얇은 허공 판들**뿐이고, ★75가 하려는 건 그걸
//   **매스**로 바꾸는 것이다. 판을 빼고 재면 현행이 부당하게 나쁘게 나온다.
const TREADS = (() => {
  const T = [], yTop = U_KNEE_END * H
  for (let i = 0; i < DESC_STEPS; i++) {
    const y = yTop - (i + 0.5) * C_DESC_STEP_R
    T.push([X_DESC0 - (yTop - y) / DESC_SLOPE, y, zc])
  }
  return T
})()
const inTread = (p) => {
  for (const c of TREADS)
    if (Math.abs(p[0] - c[0]) <= C_DESC_TREAD_D / 2 && Math.abs(p[1] - c[1]) <= TREAD_THICK / 2
        && Math.abs(p[2] - c[2]) <= PASS_HW) return true
  return false
}
//  ⑨' ★75 넓은 상승 계단 매스 — 구 램프(허공 판 35장)를 대신한다.
//   ★이게 이번 조형의 봉인 기여다: 관 폭을 채운 매스가 하강 위를 덮는다.
const WS = wideStairSpec()
const WSO = wideStairOutline()
const wsHalf = (x) => { let b = WSO[0].h, bd = 1e9
  for (const q of WSO) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; b = q.h } } return b }
const ARCHP = archCutProfile().filter(q => q.open)
const archAt = (x) => { let b = null, bd = 1e9
  for (const q of ARCHP) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; b = q } }
  return (b && bd < 0.2) ? b : null }
function inWideStair(p) {
  if (p[0] < WS.x1 || p[0] > WS.x0) return false
  const top = wstairTopAt(p[0])
  if (p[1] > top || p[1] < top - WS.depth - 0.2) return false
  if (Math.abs(p[2]) > wsHalf(p[0])) return false
  const A = archAt(p[0])                       // 아치가 뚫린 곳은 비어 있다
  if (A && Math.abs(p[2]) <= WARCH_HW_L && p[1] >= A.floor && p[1] <= A.crown) return false
  return true
}

//  ⑩ 전망 반원 판(★71-2 두께 1.2 · 지름변 +x · 곡면 −x)
function inLkDisc(p) {
  const cx = rOf(U_LOOKOUT_END) + LK_DISC_DX, cz = LK_DISC_DZ
  const top = U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY
  if (p[1] < top - LK_DISC_T || p[1] > top) return false
  if (p[0] > cx) return false                       // 반원은 중심에서 −x 절반만
  return Math.hypot(p[0] - cx, p[2] - cz) <= LK_PLAT_R
}

const OCCLUDERS = [
  ['살', inRibWall], ['슬랩', inSlab], ['−z볼벽', inCheekNz], ['+z볼벽', inCheekPz],
  ['판', inPlate], ['매듭', inKnot], ['방', inRoom], ['회랑', inCloister], ['하강판', inTread], ['넓은계단', inWideStair], ['전망판', inLkDisc],
]

function blockedBy(p) {
  for (const [nm, f] of OCCLUDERS) if (f(p)) return nm
  return null
}

// ── 눈 표본 ────────────────────────────────────────────────────────────
//  하강 보행선 23칸 + 정션 판 위 격자. 눈높이는 밟는 면 + 1.6.
function eyes() {
  const E = []
  const yTop = U_KNEE_END * H
  for (let i = 0; i < DESC_STEPS; i++) {
    const y = yTop - (i + 0.5) * STEP_RISE
    E.push({ tag: `하강#${i}`, p: [X_DESC0 - (yTop - y) / DESC_SLOPE, y + EYE, zc] })
  }
  for (let f = 0.1; f <= 0.91; f += 0.2) {
    const x = X_LAND_LO + (X_LAND_HI - X_LAND_LO) * f
    for (const z of [-2.4, 0, zc]) E.push({ tag: `판x${x.toFixed(0)}z${z}`, p: [x, JCT_PLATE_TOP + EYE, z] })
  }
  return E
}

// ── 광선 행진 ──────────────────────────────────────────────────────────
//  ★봉인 포락선 — 여길 벗어나면 이미 관·통로 밖(돔 내부)이다. 거기까지 안 막혔으면 누출이고,
//   더 행진할 이유가 없다(행진 길이가 30 → 평균 몇 단위로 줄어 계산이 성립한다).
const ENV = { x0: 156, x1: 212, y0: 234, y1: 294, zh: 22 }
function march(o, d) {
  for (let s = 0.15; s <= MARCH_MAX; s += STEP) {
    const px = o[0] + d[0] * s, py = o[1] + d[1] * s, pz = o[2] + d[2] * s
    if (px < ENV.x0) return '−x'
    if (px > ENV.x1) return '+x'
    if (py < ENV.y0) return '아래'
    if (py > ENV.y1) return '위'
    if (pz > ENV.zh) return '+z'
    if (pz < -ENV.zh) return '−z' 
    if (blockedBy([px, py, pz])) return null
  }
  return '무한'   // 끝까지 안 막힘 = 누출
}

function run() {
  const E = eyes()
  let leak = 0, total = 0
  const perEye = new Map(), perSide = new Map(), perAz = new Map(), perEl = new Map()
  for (const e of E) {
    let n = 0
    for (let ia = 0; ia < N_AZ; ia++) {
      const az = ia / N_AZ * Math.PI * 2
      for (let ie = 0; ie < N_EL; ie++) {
        const el = (EL0 + (EL1 - EL0) * (N_EL === 1 ? 0 : ie / (N_EL - 1))) / DEG
        const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)]
        total++
        const r = march(e.p, d)
        if (r) { leak++; n++
          perSide.set(r, (perSide.get(r) || 0) + 1)
          const ab = Math.round(az * DEG / 30) * 30 % 360
          perAz.set(ab, (perAz.get(ab) || 0) + 1)
          const eb = Math.round(el * DEG)
          perEl.set(eb, (perEl.get(eb) || 0) + 1) }
      }
    }
    if (n) perEye.set(e.tag, n)
  }
  return { leak, total, perEye, perSide, perAz, perEl }
}

console.log(`── 누출 차분 프로브 ─────────────────────────────────`)
console.log(`   JCT_DN_Z = ${JCT_DN_Z}   (채널 z중심)`)
console.log(`   판정 = 포함 · 표본 ${STEP} (< 살 ${RIB_WALL_T}) · 행진 ${MARCH_MAX} · 방위 ${N_AZ} × 고도 ${N_EL}(${EL0}~${EL1}°)`)
console.log(`   봉인 대장 = ${OCCLUDERS.map(o => o[0]).join(' · ')}`)
const t0 = Date.now()
const R = run()
console.log(`   눈 ${eyes().length}곳 · 광선 ${R.total}개`)
console.log(`\n   ★ 누출 표본 = ${R.leak}   (${((Date.now() - t0) / 1000).toFixed(1)}초)`)
console.log(`   탈출 방향: ${[...R.perSide].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(' · ')}`)
console.log(`   고도 분포: ${[...R.perEl].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}°:${v}`).join(' ')}`)
console.log(`   방위 분포(30°묶음): ${[...R.perAz].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k}° ${v}`).join(' · ')}`)
if (R.perEye.size) {
  console.log(`   누출 눈:`)
  for (const [k, v] of [...R.perEye].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`     ${k.padEnd(14)} ${v}`)
}
