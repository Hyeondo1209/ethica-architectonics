// ★219-w‴ ziSubdivide.js — 구역 I 정점색 베이크용 적록 세분(순수 모듈 · three만 의존). ZoneI.jsx가 쓰고 check_lux ⓠ가 합성 사각형으로 자기검증한다.
import * as THREE from 'three'
//  ★219-w‴ 적록 세분(red-green refinement): 변 길이 > L인 변만 중점 삽입. 분할 결정이 **변**에만 달려 있어 이웃 삼각형이 같은 중점을 공유한다(T-접합 0 · ★198 구배 분할이 만든 톱니의 원인 회피).
//   패턴 = 긴 변 1개 → 2장 · 2개 → 3장 · 3개 → 4장. 변이 전부 ≤ L이 될 때까지 반복. 모든 float 속성(position·normal·uv…)을 중점에서 선형 보간(법선은 정규화). 위치 이동 0.
export function subdivideLongEdges(g, L) {
  const names = Object.keys(g.attributes); const A = {}; for (const k of names) { const at = g.attributes[k]; A[k] = { arr: Array.from(at.array), sz: at.itemSize } }
  let idx = g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i)
  let parent = Array.from({ length: idx.length / 3 }, (_, i) => i)   // 새 삼각형 → 원본 삼각형(가시성 판정을 물려준다 — 자식마다 다시 재면 30만 장 × 60발)
  const P = A.position.arr; const len2 = (a, b) => { const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]; return dx * dx + dy * dy + dz * dz }
  const L2 = L * L; let nSplit = 0
  for (let pass = 0; pass < 12; pass++) {
    const mids = new Map(); const mid = (a, b) => { const k = a < b ? a + ',' + b : b + ',' + a; let m = mids.get(k); if (m !== undefined) return m
      m = A.position.arr.length / 3; for (const kk of names) { const { arr, sz } = A[kk]; for (let q = 0; q < sz; q++) arr.push((arr[a * sz + q] + arr[b * sz + q]) / 2)
        if (kk === 'normal') { const o = m * 3, l = Math.hypot(arr[o], arr[o + 1], arr[o + 2]) || 1; arr[o] /= l; arr[o + 1] /= l; arr[o + 2] /= l } }
      mids.set(k, m); nSplit++; return m }
    const out = [], par = []; let any = false; const push = (...tris) => { for (let q = 0; q < tris.length; q += 3) par.push(parent[i / 3]) ; out.push(...tris) }
    var i
    for (i = 0; i + 2 < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]
      const la = len2(a, b) > L2, lb = len2(b, c) > L2, lc = len2(c, a) > L2, n = (la ? 1 : 0) + (lb ? 1 : 0) + (lc ? 1 : 0)
      if (n === 0) { push(a, b, c); continue } any = true
      if (n === 3) { const m0 = mid(a, b), m1 = mid(b, c), m2 = mid(c, a); push(a, m0, m2, m0, b, m1, m2, m1, c, m0, m1, m2); continue }
      //  긴 변이 1·2개: 정점을 돌려 긴 변 ab가 앞에 오게 정렬한 뒤 패턴 적용(감김 보존)
      let [x, y, z, ex, ey, ez] = [a, b, c, la, lb, lc]
      if (!ex) { if (ey) { [x, y, z, ex, ey, ez] = [b, c, a, lb, lc, la] } else { [x, y, z, ex, ey, ez] = [c, a, b, lc, la, lb] } }
      const mxy = mid(x, y)
      if (n === 1) { push(x, mxy, z, mxy, y, z); continue }
      //  n === 2: ab 긴 + (bc 또는 ca) 긴
      if (ey) { const myz = mid(y, z); push(x, mxy, z, mxy, y, myz, mxy, myz, z) }
      else { const mzx = mid(z, x); push(x, mxy, mzx, mxy, y, z, mxy, z, mzx) } }
    idx = out; parent = par; if (!any) break
  }
  const g2 = new THREE.BufferGeometry()
  for (const k of names) g2.setAttribute(k, new THREE.BufferAttribute(new Float32Array(A[k].arr), A[k].sz))
  g2.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1)); g2.userData = { ...g.userData, ziSubdiv: nSplit, ziParent: Int32Array.from(parent) }
  return g2
}

