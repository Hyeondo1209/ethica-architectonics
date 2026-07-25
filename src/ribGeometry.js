// ribGeometry.js — 리브 '몸통' 순수 빌더 (★57 2026.07.24)
// ============================================================================
//  ★왜 이 모듈이 따로 있나(모듈 분담):
//   · 여기(ribGeometry)      = 리브 **몸** — 관 자체의 단면(두께 있는 셸).
//   · corridorStairsGeometry = 리브에 뚫는 **구멍의 자리** — 문 다섯(hallDoors)·절단(ribCutSpec).
//     구멍의 좌표는 통로 홀·프리즈 방이 정하므로 그쪽이 정본이고, 몸은 돔 쪽이라 여기다.
//   Dome.jsx(렌더)와 check_corridor.mjs(검증)가 같은 함수를 소비한다.
//
//  ★57 두께의 원리 — **바깥면은 절대 안 건드린다**:
//   72기 리브는 형태가 완전 동일해야 하고(§1 LOCKED), 그 동일성이 1p11 반전(테라스에서 무한한
//   리브를 보는 순간)의 토대다. 그래서 바깥면은 나머지 71기와 **같은 TubeGeometry를 그대로 쓰고**,
//   같은 곡선·같은 분할로 반경만 줄인 안쪽 관을 하나 더 만들어 그 사이를 살로 채운다.
//   → 두 관이 같은 프레임(Frenet)을 공유하므로 정점이 1:1로 겹쳐 나란히 눕는다(어긋남 0).
//
//  ⚠**CSG를 안 쓰고 손으로 꿰맨다**: 두 관을 CSG로 빼면 거의 평행한 두 면이 만나 감김 파탄의
//   단골 상황이 된다(53-2/3 전례 — "부호 부피가 통과해도 CSG는 파탄한다"). 같은 정점에서 직접
//   꿰매면 watertight가 구성으로 보장되고, 검산은 부호 부피 하나로 끝난다.
// ============================================================================
import * as THREE from 'three'
import {
  SHELL_RIB_R, RIB_RADIAL_SEG, RIB_WALL_END_CAP, RIB_BORE_FACET,
  RIB_VICE_ON, RIB_NEWEL_R, RIB_NEWEL_Y0, RIB_NEWEL_Y1, RIB_VICE_SOFFIT, RIB_VICE_T, RIB_VICE_NA, RIB_VICE_R_OUT,
  STEPS_PER_TURN, STEP_RISE, STAIR_STEPS, spiralPoint, TREAD_THICK,
  //  ★60 문지방 — 프리즈 방 바닥과 나선을 잇는 매듭(방 쪽 좌표가 필요하다)
  FR_SILL_ON, FR_SILL_SPAN, FR_SILL_IN, FR_SILL_BITE, FR_SILL_T, FR_SILL_LIFT,
  FR_KNOT_ON, FR_LAND_DEG,   // ★62 바닥 매듭(칼라 + 반원 착지판)
  RIB_FREE_MODE,             // ★62-2 자립 구간 어휘
  RIB_OPEN_ON, BAL_STEP, BAL_W, BAL_PARA_H, BAL_RIM_IN,   // ★63 우물 발코니
  MERIDIANS,   // ★64 리브 추종 구멍
  FR_FLOOR_Y, TEMPLE_CLR, H, ribCenter, rOf,
  //  ★61 리브 갈아타기 — 자립 나선(방 바닥 → 목적지 아가리)
  RIB_XFER_ON, RIB_DEST_K, FREE_MOUTH_CLR,
} from './constants.js'
//  ⚠임포트 방향: corridorStairsGeometry는 constants(+lensGeometry)만 물므로 순환 없음.
//   절단(구멍)의 정본은 그쪽이고, 여기는 그 구멍 위에 서는 **몸**(자립 나선)을 파생한다 — 모듈 분담 유지.
import { ribCutSpec } from './corridorStairsGeometry.js'

//  발산 정리로 닫힌 삼각 수프의 부호 부피 — 감김 일관성 검산의 정본(㊿·53 전례)
export function signedVolume(posArr) {
  let v = 0
  for (let i = 0; i < posArr.length; i += 9) {
    const ax = posArr[i], ay = posArr[i + 1], az = posArr[i + 2]
    const bx = posArr[i + 3], by = posArr[i + 4], bz = posArr[i + 5]
    const cx = posArr[i + 6], cy = posArr[i + 7], cz = posArr[i + 8]
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
  }
  return v
}

//  두께 있는 리브 셸(닫힌 솔리드) — t=0이면 구판 그대로의 열린 관을 돌려준다(스위치 off 경로).
//  반환: { geometry, outerGeo, stats }
//  ★공유 리브 곡선 — **단일 정본**(★65 2026.07.25 Dome.jsx에서 이관).
//   72기 리브·관 클립·검증이 전부 이 한 곡선을 소비해야 한다. 사본을 따로 만들면 형태 동일(§1 LOCKED)이
//   '지금은 같은 수식'이라는 우연으로 전락한다 — 무릎길 몸(★65)이 관 내벽에 정확히 맞물려야 하므로
//   여기서부터는 우연이 아니라 구성으로 보장한다. φ=0(+x) 평면 정의, 나머지는 y축 회전 인스턴스.
//   ⚠SEG=160은 리브 셸·검증이 공유하는 해상도다(바꾸면 정점이 어긋나 LOCKED가 깨진다).
export function makeRibCurve(seg = 160) {
  const pts = []
  for (let i = 0; i <= seg; i++) { const u = i / seg; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) }
  return new THREE.CatmullRomCurve3(pts)
}

export function buildRibShell(curve, t, tubSeg = 200, radSeg = RIB_RADIAL_SEG) {
  const outerGeo = new THREE.TubeGeometry(curve, tubSeg, SHELL_RIB_R, radSeg, false)
  if (!(t > 0)) return { geometry: outerGeo, outerGeo, stats: { solid: false, volume: 0 } }

  const innerGeo = new THREE.TubeGeometry(curve, tubSeg, SHELL_RIB_R - t, radSeg, false)
  const po = outerGeo.attributes.position, pi = innerGeo.attributes.position
  const no = outerGeo.attributes.normal, ni = innerGeo.attributes.normal
  const idx = outerGeo.index.array
  const out = [], nrm = []
  //  ★★법선을 **원본 관에서 그대로 실어 나른다** — 이게 이 빌더의 급소다.
  //   ⚠사고 기록(2026.07.24 현도 스크린샷 "각진 연필"): 처음엔 위치만 옮기고 computeVertexNormals()를
  //    불렀는데, 인덱스 없는 삼각 수프에서 그 함수는 **면 법선(flat)**을 찍는다. 정점은 나머지 71기와
  //    완전히 동일한데 빛만 다르게 받아, 탐험 리브만 10각 기둥으로 각져 보였다.
  //    → 형태 동일(§1 LOCKED)은 **정점만으로는 부족하고 법선까지 같아야 성립한다.** R7절이 이제 둘 다 잰다.
  const tri = (p, nAttr, sign, a, b, c) => {
    for (const i of [a, b, c]) {
      out.push(p.getX(i), p.getY(i), p.getZ(i))
      nrm.push(sign * nAttr.getX(i), sign * nAttr.getY(i), sign * nAttr.getZ(i))
    }
  }
  //  ① 바깥면 — 원본 관의 삼각형을 **그대로**(정점·법선·감김 무수정 = 나머지 71기와 형태 동일 보장)
  for (let k = 0; k < idx.length; k += 3) tri(po, no, +1, idx[k], idx[k + 1], idx[k + 2])
  //  ② 안쪽면 — 같은 정점, 감김 반전. 법선 처리는 ★68에서 갈렸다:
  //   ★★68(2026.07.25) **안쪽면만 패싯**(현도 소견: "무릎길 내벽이 그냥 주황색 경선 리브여서 짓다 만 느낌").
  //    원인 진단: 관은 정10각(패싯 폭 3.57)인데 **법선이 부드러워 원통으로 읽힌다.** 형태는 있는데 빛이 지운다.
  //    ⚠그 부드러움은 바깥면에 대해서는 **절대적으로 옳다**(★57 '각진 연필' 사고 — 72기 형태 동일 §1 LOCKED은
  //     정점만으로 부족하고 법선까지 같아야 성립한다). 그러나 **안쪽면은 LOCKED의 대상이 아니다** —
  //     살(RIB_WALL_T)이 다섯 기에만 있으므로 안쪽은 이미 72기가 다르다. 즉 안쪽면은 LOCKED의 대상이
  //     아닌데 LOCKED의 대가를 치르고 있었다. → 안쪽만 패싯 법선을 준다. **바깥면은 한 정점도 안 건드린다.**
  //    ★폭 방향으로만 평평하게, **길이 방향으로는 매끄럽게** 한다(사각형 한 장의 법선을 네 귀에 공유).
  //     삼각형마다 제 법선을 주면 사각형이 안 평평한 구간에서 대각선 이음매가 비친다.
  if (RIB_BORE_FACET) {
    const W2 = radSeg + 1
    const V = (i, j) => [pi.getX(i * W2 + j), pi.getY(i * W2 + j), pi.getZ(i * W2 + j)]
    for (let i = 0; i < tubSeg; i++) for (let j = 0; j < radSeg; j++) {
      //  ⚠삼각분할·감김은 **원본을 그대로** 따른다(TubeGeometry: (a,b,d)·(b,c,d), 안쪽은 그 역순).
      //   여기서 새로 짜면 감김이 뒤집혀 솔리드가 파탄한다 — 초기 구현이 그랬다(부호 부피 147115 vs 정답 8382).
      const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1)
      //  사각형 한 장의 법선 = 두 대각선의 외적(비평면이어도 안정적인 평균) → 폭 방향 평평·길이 방향 매끄러움
      const d1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], d2 = [d[0] - b[0], d[1] - b[1], d[2] - b[2]]
      let n = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]]
      const nl = Math.hypot(...n) || 1
      //  보어 쪽(축을 향함)이 이 면의 바깥이다 — 축에서 면 중심으로 가는 방향의 **반대**로 맞춘다
      const ctr = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2]
      const axc = curve.getPointAt((i + 0.5) / tubSeg)
      const ov = [ctr[0] - axc.x, ctr[1] - axc.y, ctr[2] - axc.z]
      const sgn = (n[0] * ov[0] + n[1] * ov[1] + n[2] * ov[2]) > 0 ? -1 : 1
      n = n.map(v => sgn * v / nl)
      for (const q of [d, b, a, d, c, b]) { out.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
    }
  } else {
    //  구판 — 안쪽도 부드럽게(원통으로 읽힘). 되돌릴 때만 쓴다.
    for (let k = 0; k < idx.length; k += 3) tri(pi, ni, -1, idx[k + 2], idx[k + 1], idx[k])
  }

  //  ③ 마구리 두 장(고리) — 열린 몸이면 감산 CSG가 파탄하므로 솔리드의 전제다.
  //   ⚠방향은 짐작하지 않고 **접선으로 판정해 맞춘다**(u=0 쪽은 −접선, u=1 쪽은 +접선이 바깥).
  const W = radSeg + 1
  const capRing = (ring, outward) => {
    const base = ring * W
    const v = (p, i) => [p.getX(i), p.getY(i), p.getZ(i)]
    //  ⚠방향은 짐작하지 않는다 — 첫 사각형의 법선을 재서 바깥(outward)과 어긋나면 전부 뒤집는다.
    const a0 = base, b0 = base + 1
    const A = new THREE.Vector3(...v(po, a0)), B = new THREE.Vector3(...v(po, b0))
    const Ci = new THREE.Vector3(...v(pi, b0))
    const flip = new THREE.Vector3().subVectors(B, A)
      .cross(new THREE.Vector3().subVectors(Ci, A)).dot(outward) < 0
    for (let j = 0; j < radSeg; j++) {
      const a = base + j, b = base + j + 1
      const oa = v(po, a), ob = v(po, b), ia = v(pi, a), ib = v(pi, b)
      //  고리 사각형 (oa, ob, ib, ia)를 삼각 둘로. flip이면 감김 반대로.
      const q = flip ? [oa, ia, ib, oa, ib, ob] : [oa, ob, ib, oa, ib, ia]
      //  마구리는 진짜 평면이라 flat 법선이 맞다(여기서 부드럽게 하면 모서리가 뭉갠다)
      const fn = outward.clone().normalize()
      for (const p of q) { out.push(p[0], p[1], p[2]); nrm.push(fn.x, fn.y, fn.z) }
    }
  }
  if (RIB_WALL_END_CAP) {
    const t0 = curve.getTangent(0).clone().multiplyScalar(-1)   // u=0 마구리의 바깥 = −접선
    const t1 = curve.getTangent(1).clone()                      // u=1 마구리의 바깥 = +접선
    capRing(0, t0)
    capRing(tubSeg, t1)
  }

  const arr = new Float32Array(out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(nrm), 3))
  //  ⚠computeVertexNormals()를 부르면 안 된다 — 위에서 실어 온 부드러운 법선을 flat으로 덮어쓴다(각진 연필 사고).
  const vol = signedVolume(arr)
  return {
    geometry: g,
    outerGeo,
    stats: { solid: true, volume: vol, tris: arr.length / 9, innerR: SHELL_RIB_R - t },
  }
}

//  셸 부피의 해석 근사 — 검산용(관 = 반지름 R·R−t의 두 관, 길이 L의 고리 기둥)
export function shellVolumeApprox(curve, t, samples = 400) {
  let L = 0
  let prev = curve.getPoint(0)
  for (let i = 1; i <= samples; i++) {
    const p = curve.getPoint(i / samples)
    L += p.distanceTo(prev); prev = p
  }
  return Math.PI * (SHELL_RIB_R ** 2 - (SHELL_RIB_R - t) ** 2) * L
}


// ============================================================================
//  ★58 중세 나선(vice) — 기둥 + 부채꼴 쐐기
// ============================================================================
//  ★쐐기 한 장은 **모든 단에서 형태가 똑같다**(같은 각폭·같은 반경대·같은 밑면 기울기).
//   다른 건 축 둘레의 회전각과 높이뿐 → 하나만 만들어 인스턴싱한다(구 디딤판과 같은 수법).
//   로컬 좌표: 축이 원점, 부채의 각중심이 +x, 상면이 y=0. 배치 = rotation.y=−θ + position=리브 중심.
export const VICE_DTHETA = 2 * Math.PI / STEPS_PER_TURN     // 한 단의 각폭(9°) — 나선 정의에서 파생

//  쐐기 밑면의 로컬 y(진행각 θ에 대한 함수). 'helix'는 피치와 나란한 나선면, 'step'은 수평.
//  ⚠'helix': 앞 모서리(+Δθ/2)에서 두께 = RIB_VICE_T, 뒤(−Δθ/2)에서 = T + STEP_RISE.
//   이웃 쐐기와 밑면이 **정확히 이어진다**(뒤 모서리 = 아래 단 앞 모서리) — 그래서 한 줄 나선 볼트가 된다.
export function viceBottomY(th) {
  //  ⚠'step'의 두께를 helix의 **평균**과 같게 잡는다 — 그래야 두 모드가 같은 물량으로 비교된다
  //   (로컬 왕복에서 '두께가 달라 보이는 것'과 '밑면 어법이 달라 보이는 것'이 안 섞이게).
  //   결과로 블록이 아래 단에 조금 묻히는데, 같은 재료라 무해하고 밑면 계단감도 그대로다.
  if (RIB_VICE_SOFFIT === 'step') return -(RIB_VICE_T + STEP_RISE / 2)
  return th * (STEP_RISE / VICE_DTHETA) - RIB_VICE_T - STEP_RISE / 2
}

//  ★부채꼴 솔리드 — 쐐기(★58)와 문지방(★60)이 공유하는 한 기계.
//   ⚠공유하는 이유는 절약이 아니라 **어휘 동일성**이다: 문지방이 쐐기와 다른 방식으로 지어지면
//    같은 나선 위에서 두 어법이 부딪친다(㊾ '판떼기' 반려의 구조적 원인이 그것이었다).
//    다른 것은 반경대·각폭·밑면 함수뿐이고, 감김·마구리·정렬 규약은 글자 그대로 같다.
//   ⚠면마다 바깥 방향을 명시해 개별 정렬한다(53-3 교훈: 전역 반전은 감김이 이미 일관될 때만
//    통한다 — 애초에 일관되게 짓는다).
//   로컬 좌표 규약: 축이 원점 · 부채의 각중심이 +x · **상면이 y=0**(배치 쪽이 y를 준다).
function fanSolid(r0, r1, dth, NA, bottomY) {
  const h = dth / 2
  const th = (a) => -h + (a / NA) * dth
  const P = (r, a, y) => [r * Math.cos(th(a)), y, r * Math.sin(th(a))]
  const out = []
  const push = (t) => { for (const v of t) out.push(v[0], v[1], v[2]) }
  //  사각형 하나를 '바깥 방향 ref'에 맞춰 감아 넣는다
  const quad = (A, B, C, D, ref) => {
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const v = [D[0] - A[0], D[1] - A[1], D[2] - A[2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const flip = n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0
    if (flip) { push([A, D, C]); push([A, C, B]) } else { push([A, B, C]); push([A, C, D]) }
  }
  const radial = (a) => [Math.cos(th(a)), 0, Math.sin(th(a))]
  const tang = (a, sgn) => [-Math.sin(th(a)) * sgn, 0, Math.cos(th(a)) * sgn]
  for (let a = 0; a < NA; a++) {
    const y0 = bottomY(th(a)), y1 = bottomY(th(a + 1))
    const iT0 = P(r0, a, 0), oT0 = P(r1, a, 0), iT1 = P(r0, a + 1, 0), oT1 = P(r1, a + 1, 0)
    const iB0 = P(r0, a, y0), oB0 = P(r1, a, y0), iB1 = P(r0, a + 1, y1), oB1 = P(r1, a + 1, y1)
    quad(iT0, oT0, oT1, iT1, [0, 1, 0])                        // 상면(밟는 면)
    quad(iB0, oB0, oB1, iB1, [0, -1, 0])                       // 밑면(나선 볼트)
    quad(iT0, iT1, iB1, iB0, radial(a).map(v => -v))           // 안쪽면(기둥에 붙음)
    quad(oT0, oT1, oB1, oB0, radial(a))                        // 바깥면(벽에 물림)
  }
  //  양 끝 마구리(라이저 면) — 이웃 쐐기와 맞닿는다
  {
    const y0 = bottomY(th(0)), yN = bottomY(th(NA))
    quad(P(r0, 0, 0), P(r1, 0, 0), P(r1, 0, y0), P(r0, 0, y0), tang(0, -1))
    quad(P(r0, NA, 0), P(r1, NA, 0), P(r1, NA, yN), P(r0, NA, yN), tang(NA, 1))
  }
  const arr = new Float32Array(out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeVertexNormals()
  return { geometry: g, volume: signedVolume(arr), tris: arr.length / 9 }
}

//  쐐기 = 닫힌 솔리드(밑면 = 나선 볼트). 한 장 만들어 263장 인스턴싱한다.
export function buildViceWedge() {
  return fanSolid(RIB_NEWEL_R, RIB_VICE_R_OUT, VICE_DTHETA, RIB_VICE_NA, viceBottomY)
}

//  쐐기/판 경계 — **기둥 윗끝(RIB_NEWEL_Y1)을 넘는 첫 단**. 기둥이 없으면 쐐기도 없다(한 줄 규칙).
export function viceSplitIndex() {
  if (!RIB_VICE_ON) return 0
  for (let i = 0; i < STAIR_STEPS; i++)
    if (spiralPoint((i + 0.5) / STAIR_STEPS).pos.y > RIB_NEWEL_Y1) return i
  return STAIR_STEPS
}

//  기둥 제원(렌더·검증 공유)
export function newelSpec() {
  const y0 = RIB_NEWEL_Y0, y1 = RIB_NEWEL_Y1
  return { r: RIB_NEWEL_R, y0, y1, h: y1 - y0, cy: (y0 + y1) / 2 }
}

// ============================================================================
//  ★60 문지방(sill) — 나선 ↔ 프리즈 방 바닥의 매듭. 렌더·검증이 같은 정본을 소비
// ============================================================================
//  자리 = **마지막 쐐기의 방위**. 왜 하필 거기냐: 그 한 단이 '기둥이 있는 마지막 단'이고,
//  바로 다음 단부터 받치는 게 사라진다(★58 한 줄 규칙). 나가는 문을 **받쳐진 마지막 자리**에
//  두면 관람자는 "받쳐진 데서 내려서서, 안 받쳐진 것들을 올려다본다" — 1p7의 시점이 곧 동선이 된다.
//  (한 단 위에 두면 나가는 자리부터 이미 떠 있어서 그 대조가 사라진다.)
export function sillSpec() {
  if (!FR_SILL_ON || !RIB_VICE_ON) return null
  const split = viceSplitIndex()
  if (split <= 0) return null
  const i = split - 1                                   // 마지막 쐐기
  const { theta } = spiralPoint((i + 0.5) / STAIR_STEPS)
  const wedgeTop = spiralPoint((i + 0.5) / STAIR_STEPS).pos.y + TREAD_THICK / 2   // 쐐기 상면(Dome 배치 규약과 동일)
  const yTop = FR_FLOOR_Y + FR_SILL_LIFT
  const c = ribCenter(yTop / H)                         // 그 높이의 리브 축(혀는 축을 중심으로 놓인다)
  const holeR = SHELL_RIB_R + TEMPLE_CLR                // 바닥 관통 구멍 = 혀가 물어야 할 바깥 목표
  return {
    i, theta, dth: FR_SILL_SPAN * VICE_DTHETA,
    r0: RIB_VICE_R_OUT - FR_SILL_IN,                    // 안쪽 = 쐐기 바깥끝보다 더 안(겹침)
    r1: holeR + FR_SILL_BITE,                           // 바깥 = 바닥 구멍 모서리 너머(물림)
    holeR,
    yTop, yBot: yTop - FR_SILL_T, t: FR_SILL_T,
    cx: c.x, cz: c.z,
    wedgeTop, riseFromWedge: yTop - wedgeTop,           // 쐐기 → 혀 오름(0에 가까워야 한다)
    dropToFloor: yTop - FR_FLOOR_Y,                     // 혀 → 바닥 내림 = FR_SILL_LIFT(동일평면 회피분)
  }
}

//  혀 = 쐐기와 **같은 기계**로 뽑은 부채꼴 한 장. 다른 것은 반경대·각폭·평평한 밑면뿐.
//  ⚠밑면이 평평한 이유: 나선 볼트(helix)는 '이어지는 계단'의 어법이고, 혀는 그 줄이 **끝나는**
//   자리다(§2-D ③ 매듭). 볼트를 이어 붙이면 매듭이 아니라 한 단이 더 있는 것으로 읽힌다.
// ── ★62 바닥 매듭: 고리 칼라(360° 봉인) + 반원 착지판(180° 착지) ──
//  ★60 문지방을 둘로 나눈 것 = 봉인과 착지를 분리했다(상세 근거 = constants ★62 블록).
//  치수 정본은 ★60 노브(두께·부양·물림·재질)를 그대로 쓴다 — 위계는 한 곳에서만 정한다.
export function floorKnotSpec() {
  if (!FR_KNOT_ON || !RIB_VICE_ON) return null
  const split = viceSplitIndex()
  if (split <= 0) return null
  const i = split - 1                                    // 마지막 쐐기(= 도착 칸)
  const f = (i + 0.5) / STAIR_STEPS
  const { theta } = spiralPoint(f)
  const wedgeTop = spiralPoint(f).pos.y + TREAD_THICK / 2
  //  진행 방향 = 헬릭스가 정한다(감김 부호를 뒤집어도 착지판이 따라간다 — 방향 하드코딩 금지)
  const dir = Math.sign(spiralPoint((i + 1.5) / STAIR_STEPS).theta - theta) || 1
  const yTop = FR_FLOOR_Y + FR_SILL_LIFT
  const c = ribCenter(yTop / H)
  const holeR = SHELL_RIB_R + TEMPLE_CLR                 // 방 바닥 관통 구멍 = 봉인의 바깥 목표
  const rIn = RIB_VICE_R_OUT - FR_SILL_IN                // 칼라 안쪽 — 쐐기 바깥 사면을 문다
  const rOut = holeR + FR_SILL_BITE                      // 칼라 바깥 — 구멍 모서리 너머로 물린다
  const dth = FR_LAND_DEG * Math.PI / 180
  //  착지판 = 마지막 쐐기의 **진행 쪽 모서리**에서 시작(그 앞은 한 바퀴 아래라 파묻을 것이 없다).
  //   반대로 잡으면 밑면이 마지막 쐐기 상면보다 낮아 도착 칸 셋을 삼킨다.
  const th0 = theta + dir * VICE_DTHETA / 2
  const land = FR_LAND_DEG > 0 ? {
    r0: Math.max(0.2, RIB_NEWEL_R - FR_SILL_IN),         // 기둥면 물림(가운데는 기둥 상면이 채운다)
    r1: rIn, dth, th0, thMid: th0 + dir * dth / 2, dir,
  } : null
  return {
    i, theta, dir, wedgeTop, riseFromWedge: yTop - wedgeTop,
    yTop, yBot: yTop - FR_SILL_T, t: FR_SILL_T,
    cx: c.x, cz: c.z, holeR, rIn, rOut, land,
    slot: [SHELL_RIB_R, holeR],                          // 봉인해야 할 링 슬롯(관 바깥면 ~ 구멍)
  }
}

//  고리 프리즘(속 빈 원기둥) — 감김은 fanSolid와 같은 규약(면마다 바깥 ref로 정렬)
function annulusSolid(r0, r1, t, NA) {
  const out = []
  const push = (tri) => { for (const v of tri) out.push(v[0], v[1], v[2]) }
  const th = (a) => (a / NA) * Math.PI * 2
  const P = (r, a, y) => [r * Math.cos(th(a)), y, r * Math.sin(th(a))]
  const quad = (A, B, C, D, ref) => {
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const v = [D[0] - A[0], D[1] - A[1], D[2] - A[2]]
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    if (n[0] * ref[0] + n[1] * ref[1] + n[2] * ref[2] < 0) { push([A, D, C]); push([A, C, B]) }
    else { push([A, B, C]); push([A, C, D]) }
  }
  for (let a = 0; a < NA; a++) {
    const rad = [Math.cos(th(a + 0.5)), 0, Math.sin(th(a + 0.5))]
    const iT0 = P(r0, a, 0), oT0 = P(r1, a, 0), iT1 = P(r0, a + 1, 0), oT1 = P(r1, a + 1, 0)
    const iB0 = P(r0, a, -t), oB0 = P(r1, a, -t), iB1 = P(r0, a + 1, -t), oB1 = P(r1, a + 1, -t)
    quad(iT0, oT0, oT1, iT1, [0, 1, 0])                      // 상면(밟는 면)
    quad(iB0, oB0, oB1, iB1, [0, -1, 0])                     // 밑면(홀에서 안 보이는 면)
    quad(iT0, iT1, iB1, iB0, rad.map(v => -v))               // 안쪽면(우물 테두리)
    quad(oT0, oT1, oB1, oB0, rad)                            // 바깥면(바닥 살에 묻힘)
  }
  const arr = new Float32Array(out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeVertexNormals()
  return { geometry: g, volume: signedVolume(arr), tris: arr.length / 9 }
}

export function buildFloorCollar() {
  const s = floorKnotSpec()
  if (!s) return null
  return { ...annulusSolid(s.rIn, s.rOut, s.t, 72), spec: s }   // 72 = 리브 수와 같은 분할(관례)
}

export function buildFloorLanding() {
  const s = floorKnotSpec()
  if (!s || !s.land) return null
  const NA = Math.max(8, Math.round(RIB_VICE_NA * (s.land.dth / VICE_DTHETA)))
  return { ...fanSolid(s.land.r0, s.land.r1, s.land.dth, NA, () => -s.t), spec: s }
}

// ── ★63 우물 발코니 — 뚫린 셋(#−2·#−1·#+1)의 테두리 ──
//  두 고리로 이뤄진다(현도 (b)안):
//   ① **난간** r[BAL_RIM_IN, 구멍+물림] — 발이 바닥 살에 묻혀 **링 슬롯 봉인을 겸한다**(구 아랫캡의 일).
//   ② **발코니 판** 그 바깥 고리, 바닥에서 BAL_STEP 올라선 단 — 걸어가다 한 단 올라서서 내려다본다.
//  ⚠난간은 윗토막에 안 닿는다(1p7). ⚠동자 없는 속 찬 고리여야 한다(§2-C).
export function openRimSpec() {
  if (!RIB_OPEN_ON) return null
  const holeR = SHELL_RIB_R + TEMPLE_CLR
  const rimIn = BAL_RIM_IN
  const rimOut = holeR + FR_SILL_BITE                   // 6.70 — ★62 칼라와 같은 바깥(어휘 통일)
  return {
    rimIn, rimOut, holeR,
    rimY0: FR_FLOOR_Y + FR_SILL_LIFT - FR_SILL_T,        // 165.12 — 발이 바닥 살에 묻힌다(> 아치 크라운 164)
    rimY1: FR_FLOOR_Y + BAL_STEP + BAL_PARA_H,           // 난간 꼭대기
    balIn: rimOut, balOut: rimOut + BAL_W,               // 발코니 판 고리
    balY0: FR_FLOOR_Y, balY1: FR_FLOOR_Y + BAL_STEP,
    step: BAL_STEP, paraH: BAL_PARA_H,
  }
}

//  뚫린 리브인가 — cuts에 #0은 없고, #+2는 발판이라 원판 유지(현도 명시)
export const isOpenRib = (k) => RIB_OPEN_ON && k !== 0 && k !== RIB_DEST_K

export function buildOpenRim() {
  const s = openRimSpec()
  if (!s) return null
  return {
    rim: annulusSolid(s.rimIn, s.rimOut, s.rimY1 - s.rimY0, 48),   // 원점 상면 기준 아래로 두께
    bal: annulusSolid(s.balIn, s.balOut, s.balY1 - s.balY0, 48),
    spec: s,
  }
}

// ── ★64 리브를 따라가는 관통 구멍 (2026.07.24 · ★64-2 재작성) ──
//  ⚠**두 증상이 한 원인이었다**(실측): 구 구멍은 **수직 원기둥**(문 높이 y74의 축 기준)인데
//   리브는 기울어 있다. 방 천장(y196.9~199.0)에서 축이 **1.33~1.65 어긋나** 한쪽엔 최대
//   **2.05 폭 초승달 틈**이 열리고, 반대쪽에선 **프리즈 부재가 리브를 파고든다**(표본 213~224).
//
//  ⚠⚠**★64-2 사고 기록(2026.07.24, 현도 적발 "경선리브들 왜 다 막아놨어?")**:
//   1차 구현은 `TubeGeometry`(열린 셸) + 별도 원기둥 마구리를 **겹쳐 병합**한 브러시를 썼다.
//   → **열린 변 36 · 3회 공유 4 = 비다양체**. 감산이 파탄해 리브 자리에 부재가 남았다 =
//   구멍을 뚫으려다 리브를 막았다. ★53의 교훈("감김·부피가 통과해도 CSG는 파탄한다")의 재발이고,
//   더 나쁘게는 **검사가 '의도한 구멍'만 재고 '실제 파인 결과'를 안 쟀다**(R9-4 ④가 해석적 검사였다).
//   → 재작성: **로프트(수평 단면 적층)로 처음부터 watertight**하게 짓고, R9-4가 **감김·열린 변 +
//   실제 CSG 잔여 정점**을 잰다. 도구가 결과를 보게 만드는 것이 수정의 절반이다.
//
//  ★단면을 '수평 원'으로 쓰는 이유: 기운 관의 수평 단면은 타원(장축 R/cosθ)이다. 반지름을
//   R/cosθ로 잡은 **수평 원**을 쌓으면 관을 확실히 품는다(직교 방향으로 아주 살짝 넉넉할 뿐).
export function ribHoleSolid(k, y0, y1, clr) {
  const N = 64, M = RIB_RADIAL_SEG * 2
  const rings = []
  for (let i = 0; i <= N; i++) {
    const y = y0 + (y1 - y0) * (i / N)
    const c = ribCenter(y / H)
    const d = 0.4
    const c1 = ribCenter((y + d) / H), c0 = ribCenter((y - d) / H)
    const slope = Math.abs(c1.x - c0.x) / (2 * d)               // 기울기(축이 수직에서 벗어난 정도)
    const r = (SHELL_RIB_R + clr) * Math.sqrt(1 + slope * slope)  // = (R+clr)/cosθ
    rings.push({ y, cx: c.x, r })
  }
  const out = []
  const push = (a, b, c2) => { out.push(a[0], a[1], a[2], b[0], b[1], b[2], c2[0], c2[1], c2[2]) }
  const P = (ri, j) => {
    const t = (j % M) / M * Math.PI * 2, R0 = rings[ri]
    return [R0.cx + R0.r * Math.cos(t), R0.y, R0.r * Math.sin(t)]
  }
  //  옆면 — 아래에서 위로 보아 바깥을 향하게(반시계). 정점을 **공유**하므로 열린 변이 안 생긴다.
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = P(i, j), b = P(i, j + 1), c2 = P(i + 1, j + 1), d2 = P(i + 1, j)
    push(a, c2, b); push(a, d2, c2)
  }
  //  마구리 두 장 — 부채(fan). 중심 정점을 링과 공유해 변 짝을 맞춘다.
  const cBot = [rings[0].cx, rings[0].y, 0], cTop = [rings[N].cx, rings[N].y, 0]
  for (let j = 0; j < M; j++) {
    push(cBot, P(0, j), P(0, j + 1))              // 밑면(아래를 봄)
    push(cTop, P(N, j + 1), P(N, j))              // 윗면(위를 봄)
  }
  const arr = new Float32Array(out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeVertexNormals()
  g.rotateY(-k * 2 * Math.PI / MERIDIANS)          // 방위 k로 배치(리브 격자 규약)
  return g
}

export function buildSill() {
  const s = sillSpec()
  if (!s) return null
  const NA = Math.max(2, RIB_VICE_NA * FR_SILL_SPAN)
  return { ...fanSolid(s.r0, s.r1, s.dth, NA, () => -s.t), spec: s }
}

// ============================================================================
//  ★61 자립 나선 — 프리즈 방 바닥 → 목적지 리브(#+2) 아가리. 렌더·검증이 같은 정본을 소비
// ============================================================================
//  ★같은 헬릭스를 **이어서** 쓴다(spiralPoint의 f축 그대로) — 두 이유:
//   ① 아가리 위 관 안의 얇은 판과 **정확히 연속**해야 한다(끊기면 아가리에서 단차·비틀림).
//   ② "나선이 계속된다"가 곧 진술이다: #0에서 오르던 그 계단 법칙이 다른 실체에서 **다시** 시작된다
//      (독해 ㄴ — 같은 무한을 다른 실체에서 다시 만난다). 새 법칙을 만들면 '다른 무언가'가 된다.
//  ⚠탑승 방위는 헬릭스가 정한다(위상 노브 없음) — 위상을 돌리면 아가리 위 판과의 연속이 깨진다.
//   첫 쐐기는 바닥 위 한 단(≈166.4)이라 어느 방향에서 와도 오를 수 있다(로컬 판정 항목).

//  목적지 리브의 절단 스펙 한 벌(없으면 null — 스위치 off·절단 off 경로)
export function destCut() {
  if (!RIB_XFER_ON) return null
  return ribCutSpec().find(c => c.k === RIB_DEST_K) || null
}

//  자립 나선 기둥 윗끝 = 아가리 − 여유. **한 줄 규칙 유지**: 이 위로는 기둥이 없으니 판이다.
export function freeNewelSpec() {
  if (RIB_FREE_MODE !== 'vice') return null      // ★62-2 부양 판 통일 — 기둥 없음(기둥의 유무가 판 종류를 가른다)
  const c = destCut()
  if (!c || !RIB_VICE_ON) return null
  const y0 = FR_FLOOR_Y, y1 = c.yTop - FREE_MOUTH_CLR
  if (y1 <= y0 + 1) return null                        // 간극이 너무 작으면 자립 나선 불성립(시드가 잘못됨)
  return { r: RIB_NEWEL_R, y0, y1, h: y1 - y0, cy: (y0 + y1) / 2, mouthY: c.yTop }
}

//  자립 구간 [freeStart, freeEnd): 방 바닥 위 ~ 기둥 윗끝. 그 위는 판(아가리를 꿰고 들어간다).
//  ⚠freeStart = viceSplitIndex()와 같은 식이어야 한다(#0 쐐기의 끝 = 자립 쐐기의 시작 후보역) —
//   실제로 같은 값이다(RIB_NEWEL_Y1 = FR_FLOOR_Y). 별도 함수로 두는 건 의미가 다르기 때문(#0의 끝 vs 자립의 시작).
export function freeSplitRange() {
  //  ★방 허공을 오르는 구간(방 바닥 위 첫 칸 ~ 아가리 직전) — **어휘와 무관한 기하 사실**이다.
  //   ★62-2에서 이 구간의 어휘가 쐐기→판으로 바뀌었지만 구간 자체는 그대로이므로
  //   기둥 스펙(모드 의존)이 아니라 절단면에서 직접 유도한다(모드를 갈아도 검증·웨이포인트가 산다).
  const c = destCut()
  if (!c || !RIB_VICE_ON || !RIB_XFER_ON) return null
  const yCeil = c.yTop - FREE_MOUTH_CLR
  let s = -1, e = -1
  for (let i = 0; i < STAIR_STEPS; i++) {
    const y = spiralPoint((i + 0.5) / STAIR_STEPS).pos.y
    if (s < 0 && y > FR_FLOOR_Y) s = i
    if (y <= yCeil) e = i + 1
  }
  if (s < 0 || e <= s) return null
  return { start: s, end: e, n: e - s }
}
