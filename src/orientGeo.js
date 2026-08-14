// orientGeo.js — ★★122-d 감김 자동 정렬(2026.08.12)
//  ⛔문제의 역사: 매 신규 기하마다 "특정 면이 안 보인다"가 재발했고(★119 매스·★121 기둥·★122 매스·
//   ★122-b 외피·창틀), 그때마다 면별 순회를 손으로 맞췄다. 손 정렬은 새 면을 추가할 때마다 다시 틀린다.
//  ★해법 = 도구: 위상으로 전 면의 감김을 일관되게 맞춘 뒤(BFS), 성분별 부호 부피로 바깥을 결정한다.
//   빌더는 이제 "면을 빠짐없이 만들기"만 책임지고, "어느 쪽이 앞면인가"는 이 패스가 보증한다.
//  적용: 모든 빌더 출력의 마지막에 orientOutward(geo). 검사는 결과를 부호 부피로 재확인한다.
import * as THREE from 'three'

//  ⚠★127에서 노출된 도구 결함: −2.4e-16 같은 값이 '-0.0000'으로 찍혀 '0.0000'과 다른 키가 된다(음의 영).
//  반올림 후 0이면 부호를 지운다 — 병합되어야 할 정점만 병합되는 방향의 변화(전 스위트 재검증 완료).
const F = v => { const s = v.toFixed(4); return s === '-0.0000' ? '0.0000' : s }
const KEY = (x, y, z) => `${F(x)},${F(y)},${F(z)}`

export function orientOutward(geo) {
  const pos = geo.getAttribute('position')
  if (!pos || !geo.index) return geo
  const idx = Array.from(geo.index.array)
  const nTri = idx.length / 3
  if (!nTri) return geo

  //  ① 용접: 좌표 일치 정점을 하나로 — 위상(이웃 면) 판정의 전제
  const wid = new Int32Array(pos.count)
  const map = new Map()
  for (let i = 0; i < pos.count; i++) {
    const k = KEY(pos.getX(i), pos.getY(i), pos.getZ(i))
    let w = map.get(k)
    if (w === undefined) { w = map.size; map.set(k, w) }
    wid[i] = w
  }
  //  ② 에지 → 면 목록(무방향)
  const eMap = new Map()
  const ekey = (a, b) => (a < b ? a + ':' + b : b + ':' + a)
  for (let t = 0; t < nTri; t++) {
    const v = [wid[idx[3 * t]], wid[idx[3 * t + 1]], wid[idx[3 * t + 2]]]
    for (let e = 0; e < 3; e++) {
      const k = ekey(v[e], v[(e + 1) % 3])
      let arr = eMap.get(k); if (!arr) { arr = []; eMap.set(k, arr) }
      arr.push(t)
    }
  }
  //  ③ 성분별 BFS로 감김 일관화: 공유 에지를 두 면이 '반대 방향'으로 지나야 같은 쪽을 본다
  const comp = new Int32Array(nTri).fill(-1)
  const flip = new Uint8Array(nTri)
  let nComp = 0
  const dirOf = (t, a, b) => {                       // 면 t가 에지 (a→b)를 그 방향으로 지나는가
    const v = [wid[idx[3 * t]], wid[idx[3 * t + 1]], wid[idx[3 * t + 2]]]
    for (let e = 0; e < 3; e++) if (v[e] === a && v[(e + 1) % 3] === b) return true
    return false
  }
  for (let s = 0; s < nTri; s++) {
    if (comp[s] !== -1) continue
    const c = nComp++
    comp[s] = c; flip[s] = 0
    const stack = [s]
    while (stack.length) {
      const t = stack.pop()
      const v = [wid[idx[3 * t]], wid[idx[3 * t + 1]], wid[idx[3 * t + 2]]]
      const vt = flip[t] ? [v[0], v[2], v[1]] : v     // 현재 확정된 순회
      for (let e = 0; e < 3; e++) {
        const a = vt[e], b = vt[(e + 1) % 3]
        const share = eMap.get(ekey(a, b))
        //  ⚠비매니폴드 에지(3면 이상 — 인접 블록이 캡을 겹쳐 맞댄 자리)에서는 전파를 끊는다.
        //  끊지 않으면 서로 다른 덩어리가 한 성분으로 묶여 부호 부피가 뒤엉킨다(실측: 5146 vs 929).
        if (share.length > 2) continue
        for (const u of share) {
          if (u === t || comp[u] !== -1) continue
          //  이웃 u는 같은 에지를 (b→a)로 지나야 정합 — 아니면 뒤집는다
          const uForward = dirOf(u, a, b)             // u가 (a→b)면 같은 방향 = 불일치
          comp[u] = c; flip[u] = uForward ? 1 : 0
          stack.push(u)
        }
      }
    }
  }
  //  ④ 성분별 부호 부피 → 음수면 그 성분 전체 반전(바깥 = 양수 규약, 발산 정리)
  const vol = new Float64Array(nComp)
  const P = (i) => [pos.getX(i), pos.getY(i), pos.getZ(i)]
  for (let t = 0; t < nTri; t++) {
    let i0 = idx[3 * t], i1 = idx[3 * t + 1], i2 = idx[3 * t + 2]
    if (flip[t]) { const tmp = i1; i1 = i2; i2 = tmp }
    const a = P(i0), b = P(i1), c = P(i2)
    vol[comp[t]] += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
  }
  //  ⑤ 재조립
  const out = new Array(idx.length)
  for (let t = 0; t < nTri; t++) {
    const neg = vol[comp[t]] < 0
    const f = (flip[t] === 1) !== neg
    out[3 * t] = idx[3 * t]
    out[3 * t + 1] = f ? idx[3 * t + 2] : idx[3 * t + 1]
    out[3 * t + 2] = f ? idx[3 * t + 1] : idx[3 * t + 2]
  }
  geo.setIndex(out)
  geo.computeVertexNormals()
  return geo
}

//  검사·디버그용: 열린 에지 수(0이면 watertight) — 감김과 무관한 '구멍' 진단
export function openEdgeCount(geo) {
  const pos = geo.getAttribute('position'), idx = geo.index
  if (!pos || !idx) return -1
  const E = new Map()
  const k = (i) => KEY(pos.getX(i), pos.getY(i), pos.getZ(i))
  for (let t = 0; t < idx.count; t += 3) {
    const v = [k(idx.getX(t)), k(idx.getX(t + 1)), k(idx.getX(t + 2))]
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], bw = b + '|' + a
      if (E.has(bw)) E.set(bw, E.get(bw) + 1)
      else E.set(a + '|' + b, (E.get(a + '|' + b) || 0) + 1)
    }
  }
  let open = 0
  for (const v of E.values()) if (v === 1) open++
  return open
}
