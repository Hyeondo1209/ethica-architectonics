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
  SHELL_RIB_R, RIB_RADIAL_SEG, RIB_WALL_END_CAP,
  RIB_VICE_ON, RIB_NEWEL_R, RIB_NEWEL_Y0, RIB_NEWEL_Y1, RIB_VICE_SOFFIT, RIB_VICE_T, RIB_VICE_NA, RIB_VICE_R_OUT,
  STEPS_PER_TURN, STEP_RISE, STAIR_STEPS, spiralPoint,
} from './constants.js'

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
  //  ② 안쪽면 — 같은 인덱스, 감김 반전 + 법선 반전(보어 쪽 = 살 바깥으로 향함). 부드러움은 그대로 유지.
  for (let k = 0; k < idx.length; k += 3) tri(pi, ni, -1, idx[k + 2], idx[k + 1], idx[k])

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

//  쐐기 = 닫힌 솔리드. ⚠면마다 바깥 방향을 명시해 개별 정렬한다(53-3 교훈: 전역 반전은
//   감김이 이미 일관될 때만 통한다 — 애초에 일관되게 짓는다).
export function buildViceWedge() {
  const h = VICE_DTHETA / 2, NA = RIB_VICE_NA
  const r0 = RIB_NEWEL_R, r1 = RIB_VICE_R_OUT
  const th = (a) => -h + (a / NA) * VICE_DTHETA
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
    const y0 = viceBottomY(th(a)), y1 = viceBottomY(th(a + 1))
    const iT0 = P(r0, a, 0), oT0 = P(r1, a, 0), iT1 = P(r0, a + 1, 0), oT1 = P(r1, a + 1, 0)
    const iB0 = P(r0, a, y0), oB0 = P(r1, a, y0), iB1 = P(r0, a + 1, y1), oB1 = P(r1, a + 1, y1)
    quad(iT0, oT0, oT1, iT1, [0, 1, 0])                        // 상면(밟는 면)
    quad(iB0, oB0, oB1, iB1, [0, -1, 0])                       // 밑면(나선 볼트)
    quad(iT0, iT1, iB1, iB0, radial(a).map(v => -v))           // 안쪽면(기둥에 붙음)
    quad(oT0, oT1, oB1, oB0, radial(a))                        // 바깥면(벽에 물림)
  }
  //  양 끝 마구리(라이저 면) — 이웃 쐐기와 맞닿는다
  {
    const y0 = viceBottomY(th(0)), yN = viceBottomY(th(NA))
    quad(P(r0, 0, 0), P(r1, 0, 0), P(r1, 0, y0), P(r0, 0, y0), tang(0, -1))
    quad(P(r0, NA, 0), P(r1, NA, 0), P(r1, NA, yN), P(r0, NA, yN), tang(NA, 1))
  }
  const arr = new Float32Array(out)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeVertexNormals()
  return { geometry: g, volume: signedVolume(arr), tris: arr.length / 9 }
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
