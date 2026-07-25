// kneeBodyGeometry.js — ★65 무릎길 몸 (2026.07.25)
// ============================================================================
//  §2-D 건축 마감 문법을 무릎길에 적용한다. 구판 = 허공에 뜬 판 435장(뿌리 없음 = §2-D ① 위반,
//  판 나열 = §2-D ② 위반). ㊾ 하강로 '판떼기' 반려와 같은 물건이고 규모는 그때보다 크다.
//
//  ★실측이 형태를 강제했다 — 관 안 여유는 균일하지 않다:
//    나선끝 4.49 · 배(x≈261) **0.11** · 중간 4.49 · 정션끝 3.71
//   무릎길은 관 안에서 **계곡**을 그린다. 앞쪽 1/4(118칸)은 이미 관 바닥에 닿아 있고,
//   살 있는 관 내벽(축거리 5.4971)과 무릎길 최대(5.491) 사이 여유는 **0.006**이다.
//   → ㊿ 하강로식 '깊이 2.6 등단면 스트링거'는 이 구간에서 **기하학적으로 불가능**하다.
//     (몸을 아래로 내밀려면 RIB_WALL_T를 0.15 밑으로 깎아야 하고, 그건 현도 반려선이다.)
//
//  ★그래서 구성은 하나, 파라미터가 두 벌이다(현도 "둘 다 구현하고 로컬 판정", 2026.07.25):
//   · 'fill'   — 각기둥이 관보다 **넓다**(HW 6.5 > 관 6) → 관이 깎는다. 배에서 몸이 소멸하며
//                관 바닥에 앉고, 양끝에서만 깎인 밑면이 드러난다. 뿌리 = ①접지.
//   · 'girder' — 각기둥이 **좁다**(HW 1.3) → 관이 안 깎는다. ㊿ 사다리꼴 배 그대로. 뿌리 = ③지지체.
//                대신 자리를 사려고 보행선을 올린다(KW_FLATTEN 0.84→0.70, 시작 35°→42°).
//   같은 코드 경로라야 비교가 공정하다. 모드가 바꾸는 것은 숫자뿐이다.
//
//  ⚠★64 교훈 준수: ① CSG 입력은 **구성으로 watertight**(열린 변 0) ② 감김은 짐작하지 말고
//   **부호 부피로 재서** 틀리면 뒤집는다 ③ 브러시 범위는 **딱 필요한 만큼**(넘치면 유령 관벽이 남는다).
// ============================================================================
import * as THREE from 'three'
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg'
import { kneeSurfaceY, kneeStairSpec, KNEE_XA, KNEE_XB, KNEE_SX } from './kneeStair.js'
import {
  TREAD_THICK,
  KW_BODY_ON, KW_BODY_MODE, KW_BODY_HW, KW_BODY_D, KW_BODY_BWF,
  KW_BODY_TOP, KW_BODY_EXT, KW_BODY_SEG, KW_BODY_TAPER, KW_TREAD_W,
  KW_ENTRY_ON, KW_ENTRY_L, KW_KNOT_D,   // ★67 도입 참 매듭
  SHELL_RIB_R, RIB_RADIAL_SEG, RIB_WALL_ON, RIB_WALL_T,
} from './constants.js'
import { makeRibCurve, signedVolume } from './ribGeometry.js'

//  리브 셸이 쓰는 것과 **같은** 종단 분할. 다르면 Frenet 프레임이 달라져 10각형 위상이 어긋나고,
//  그러면 클립이 관 내벽을 정확히 따라가지 못한다(모서리에서 새거나 파고든다).
export const RIB_TUB_SEG = 200

// ── 보행선 = ★66 계단 보행면(참 수평 + flight 직선). 정본은 kneeStair — 여기서 사본을 만들지 않는다 ──
//  ⚠★66 이전에는 이 모듈이 블렌드 식을 따로 갖고 있었다(사본). 계단이 참을 갖게 되면서 보행면이
//   더 이상 매끄러운 곡선이 아니므로, 몸의 상면도 **계단 보행면을 그대로** 따라가야 한다.
export { kneeSurfaceY as kneeWalkY } from './kneeStair.js'

//  종단 표본 — 양끝은 KW_BODY_EXT만큼 **밖으로 뻗는다**(판넬·정션 판 안으로 파고들어 헤어라인 봉인 = §2-D ③ 매듭).
export function kneeBodySamples() {
  const x0 = KNEE_XB - KW_BODY_EXT, x1 = KNEE_XA + KW_BODY_EXT   // x는 나선끝(큰 값)→정션(작은 값)
  const s = kneeStairSpec()
  //  ★꺾임(참↔flight 경계)을 **반드시 표본에 넣는다**. 균등 표본만 쓰면 몸이 참을 매끄럽게 뭉개
  //   보행면 밑에 틈이 생긴다(계단이 참을 갖게 된 ★66의 새 요구). 경계 양쪽에 ε씩 둔다.
  const xs = new Set([x0, x1])
  const eps = 1e-4
  for (const f of s.flights) { xs.add(f.x0 - eps); xs.add(f.x1 + eps) }
  for (const L of s.landings) { xs.add(L.x1 - eps); xs.add(L.x0 + eps) }
  const n = Math.max(8, Math.ceil((x1 - x0) / (KW_BODY_SEG * s.G)))
  for (let i = 0; i <= n; i++) xs.add(x1 - (x1 - x0) * (i / n))
  return [...xs].filter(x => x <= x1 && x >= x0).sort((a, b) => b - a)
       .map(x => ({ x, y: kneeSurfaceY(Math.min(KNEE_XA, Math.max(KNEE_XB, x))) }))
}

//  몸의 반폭(양끝 테이퍼 포함) — **검증·렌더가 같은 함수를 쓴다**(상수 KW_BODY_HW를 직접 쓰면 거짓이 된다)
export function kneeBodyHalfWidth(x) {
  const S = kneeBodySamples()
  const xLo = S[S.length - 1].x
  //  ★67: **정션쪽에만** 테이퍼가 남는다. 나선쪽 테이퍼는 폐기 —
  //   도입 참이 나선 마지막 디딤판을 흡수하므로 피할 대상이 없어졌고, 그 테이퍼가 바로
  //   "거대한 구조물이 입구에서 폭 2.9로 시작하는" 결함의 원인이었다(현도 로컬 소견 07.25).
  const f = Math.max(0, Math.min(1, (x - xLo) / KW_BODY_TAPER))
  return KW_TREAD_W / 2 + (KW_BODY_HW - KW_TREAD_W / 2) * f
}

//  몸의 깊이 — 도입 참 밑은 **매듭 매스**로 두껍다(§2-D ③ 걷는 것 0.20 < 받치는 것 1.60 < 매듭 2.60).
//  ⚠걷는 면이 두꺼워지는 게 아니라 **아래**가 두꺼워진다 — 그래야 위계가 서면서도 계단은 계단으로 남는다.
export function kneeBodyDepth(x) {
  if (!KW_ENTRY_ON) return KW_BODY_D
  const blend = KW_ENTRY_L                       // 참 안쪽으로 이만큼에 걸쳐 매듭 → 몸 두께로 잦아든다
  if (x >= KNEE_SX) return KW_KNOT_D
  const f = Math.max(0, Math.min(1, (KNEE_SX - x) / blend))
  return KW_KNOT_D + (KW_BODY_D - KW_KNOT_D) * f
}

// ── ① 각기둥(prism)// ── ① 각기둥(prism) — 보행선을 따라 사다리꼴 단면을 쓸어간다(㊿ DescentPath 어휘) ──
//  단면 로컬: u = 횡(=z축, 보행선이 x–y 평면에 있으므로 그대로) · v = 보행선 기준 종(=y).
//  상면 = 디딤판 밑면 + KW_BODY_TOP → 판이 그만큼 파묻혀 **판 밑 틈이 구조적으로 없다**(㊿ ②).
export function prismGeometry() {
  const S = kneeBodySamples()
  const vTop = -TREAD_THICK / 2 + KW_BODY_TOP
  //  ★66: 양끝에서 **보행 폭까지 좁힌다.** 근거는 미학이 아니라 충돌이다 —
  //   나선 마지막 디딤판이 z≈+3.3(판넬 도착)에 있어, 폭 13짜리 몸이 그대로 끝까지 가면 그걸 삼킨다
  //   (검증 R11이 잡았다). 매스가 착지판에 물릴 때 보행 폭으로 좁아지는 것은 정상적인 석조 어법이기도 하다.
  const pt = (i, j) => {
    const q = S[i], hw = kneeBodyHalfWidth(q.x), vBot = vTop - kneeBodyDepth(q.x)
    const sec = [[-hw, vTop], [hw, vTop], [hw * KW_BODY_BWF, vBot], [-hw * KW_BODY_BWF, vBot]]
    const [u, v] = sec[j]
    return [q.x, q.y + v, u]
  }
  const pos = []
  const push = (a, b, c) => pos.push(...a, ...b, ...c)
  for (let i = 0; i < S.length - 1; i++)
    for (let j = 0; j < 4; j++) {
      const a = pt(i, j), b = pt(i, (j + 1) % 4), c = pt(i + 1, (j + 1) % 4), d = pt(i + 1, j)
      push(a, b, c); push(a, c, d)
    }
  //  마구리 두 장 — 없으면 열린 셸 = CSG 파탄(★64). ⚠**두 장의 감김은 서로 반대**여야 한다.
  //   같은 순서로 찍으면 한쪽이 안을 향해 닫힌 몸이 아니게 되고, 전역 뒤집기로도 못 고친다
  //   (부피가 음수·과대로 나온다 — 초기 구현이 정확히 이 사고였다).
  {
    const s0 = [0, 1, 2, 3].map(j => pt(0, j))
    push(s0[2], s0[1], s0[0]); push(s0[3], s0[2], s0[0])
    const s1 = [0, 1, 2, 3].map(j => pt(S.length - 1, j))
    push(s1[0], s1[1], s1[2]); push(s1[0], s1[2], s1[3])
  }
  return finish(pos)
}

// ── ② 관 안쪽 솔리드 — 리브와 **같은 곡선·같은 분할**의 TubeGeometry에서 정점을 그대로 빌려 쓴다 ──
//  ★위상을 손으로 계산하지 않는 것이 요점이다. 10각형이 어느 각도로 놓이는지는 Frenet 프레임이 정하고,
//   그건 곡선과 종단 분할의 함수다. 같은 인자로 부르면 정점이 1:1로 같으므로 위상 문제가 **소멸**한다.
//  ⚠범위는 무릎길이 쓰는 u 구간 + 여유만(★64-5 교훈 — 넘치면 관벽이 유령으로 남는다. 여기선 교차라
//   유령은 안 남지만 삼각형만 낭비된다).
export function innerTubeSolid() {
  const r = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
  const curve = makeRibCurve()
  const geo = new THREE.TubeGeometry(curve, RIB_TUB_SEG, r, RIB_RADIAL_SEG, false)
  const p = geo.attributes.position
  const W = RIB_RADIAL_SEG + 1                              // 링당 정점 수(마지막은 첫 정점의 복제)
  //  ★★급소: TubeGeometry는 링을 `getPointAt`(**호길이** 파라미터)에 놓는다. `getPoint`(원 파라미터)로
  //   마구리 중심을 잡으면 중심이 링 평면 밖으로 어긋나 솔리드가 비틀린 뿔이 된다(초기 구현 실패 —
  //   부호 부피가 30배 과대에 음수로 나왔다). 링 좌표계는 반드시 getPointAt으로 읽는다.
  const ctrAt = (i) => curve.getPointAt(i / RIB_TUB_SEG)
  //  ⚠u→i 변환도 같은 이유로 못 쓴다(u는 원 파라미터). 범위는 **실제 링 중심 x**로 고른다.
  const S = kneeBodySamples()
  const xLo = Math.min(...S.map(s => s.x)) - 2, xHi = Math.max(...S.map(s => s.x)) + 2
  let i0 = 0, i1 = RIB_TUB_SEG
  for (let i = 0; i <= RIB_TUB_SEG; i++) {                  // 링 중심 x는 i에 대해 단조 감소(리브가 위로 갈수록 안으로)
    const cx = ctrAt(i).x
    if (cx >= xHi) i0 = i
    if (cx > xLo) i1 = Math.min(RIB_TUB_SEG, i + 1)
  }
  i0 = Math.max(0, i0 - 1)
  const V = (i, j) => [p.getX(i * W + j), p.getY(i * W + j), p.getZ(i * W + j)]
  const pos = []
  const push = (a, b, c) => pos.push(...a, ...b, ...c)
  for (let i = i0; i < i1; i++)
    for (let j = 0; j < RIB_RADIAL_SEG; j++) {
      const a = V(i, j), b = V(i, j + 1), c = V(i + 1, j + 1), d = V(i + 1, j)
      push(a, b, c); push(a, c, d)
    }
  //  마구리 = 링 중심 부채(정점을 링과 공유 → 열린 변 0). ⚠두 장의 감김은 **반대**(위 각기둥과 같은 이유).
  {
    const c0 = ctrAt(i0), c1 = ctrAt(i1)
    const a0 = [c0.x, c0.y, c0.z], a1 = [c1.x, c1.y, c1.z]
    //  방향은 옆면이 남긴 **경계 변과 반대**여야 한다(닫힌 몸의 정의). 옆면이 링 i0에 남기는 변은
    //   V(i0,j)→V(i0,j+1), 링 i1에는 V(i1,j+1)→V(i1,j)이므로 마구리는 각각 그 반대로 찍는다.
    for (let j = 0; j < RIB_RADIAL_SEG; j++) push(a0, V(i0, j + 1), V(i0, j))
    for (let j = 0; j < RIB_RADIAL_SEG; j++) push(a1, V(i1, j), V(i1, j + 1))
  }
  geo.dispose()
  return finish(pos)
}

//  감김을 **재서** 맞춘다 — 짐작하면 CSG가 조용히 뒤집힌다(★53·★64 전례).
function finish(pos) {
  const arr = new Float32Array(pos)
  if (signedVolume(arr) < 0) {
    for (let i = 0; i < arr.length; i += 9) {               // 삼각형마다 두 정점 교환 = 전면 반전
      for (let k = 0; k < 3; k++) { const t = arr[i + 3 + k]; arr[i + 3 + k] = arr[i + 6 + k]; arr[i + 6 + k] = t }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeVertexNormals()                                  // 비공유 정점 = 면 법선(플랫) — 브루탈 어휘(㊿과 같은 선택)
  return g
}

// ── ③ 몸 = 각기둥 ∩ 관 안쪽 ──
//  'girder'는 각기둥이 관보다 좁아 교차가 각기둥 자신이 된다(= 자립 배). 'fill'은 관이 깎는다.
//  즉 **한 연산이 두 형태를 다 낸다** — 분기 없음이 이 설계의 요점이다.
export function buildKneeBody() {
  if (!KW_BODY_ON) return null
  const prism = prismGeometry()
  const tube = innerTubeSolid()
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const a = new Brush(prism), b = new Brush(tube)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  const out = ev.evaluate(a, b, INTERSECTION)
  prism.dispose(); tube.dispose()
  return out.geometry
}

//  검증·진단이 소비하는 스펙 한 벌(렌더와 같은 정본)
export function kneeBodySpec() {
  return {
    on: KW_BODY_ON, mode: KW_BODY_MODE, hw: KW_BODY_HW, d: KW_BODY_D, bwf: KW_BODY_BWF,
    top: KW_BODY_TOP, ext: KW_BODY_EXT, slopeDeg: kneeStairSpec().slopeDeg,
    innerR: RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R,
    samples: kneeBodySamples(),
    vTop: -TREAD_THICK / 2 + KW_BODY_TOP,
    vBot: -TREAD_THICK / 2 + KW_BODY_TOP - KW_BODY_D,
    vBotKnot: -TREAD_THICK / 2 + KW_BODY_TOP - KW_KNOT_D,
  }
}
