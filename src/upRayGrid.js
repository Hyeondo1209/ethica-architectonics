// ★217-a 수직 광선 격자 — three `Mesh.raycast`의 **비트 동일 복제** + xz 격자 후보 걸러내기
//  왜: ★214-h 지붕 높이맵은 광선 32,768발(512×64)을 '드럼 천장' 메시 **전 삼각형**에 쏜다(three는 BVH 없이 선형).
//   ★217 실측(_probe_bake.mjs --cpu): three 삼각형 루프(checkGeometryIntersection·getVertexPosition·intersectTriangle)
//   ≈ 22 s = DSK 패스의 40%. 광선은 전부 +y 수직이므로, 삼각형의 **세계 xz 상자**가 (x,z)를 안 품으면 맞을 수 없다.
//  값 무변의 근거(한 줄씩 three 원문 대응 — three r184 `Mesh.raycast` · `checkIntersection$1`):
//   ① 로컬 광선 = `ray.applyMatrix4(matrixWorld⁻¹)`(three와 같은 Ray 메서드) ② 삼각형 교차 = `ray.intersectTriangle`
//   (BackSide면 pC,pB,pA 뒤집기 · FrontSide면 뒷면 컬링 — three와 같은 분기) ③ 세계점 = 로컬점·matrixWorld ·
//   거리 = `raycaster.ray.origin.distanceTo(세계점)` · near/far 걸러내기 ④ 선택 = 거리 오름차순 **안정 정렬의 첫 항**
//   = 최소 거리 · 동률이면 **삼각형 순서가 앞선 것**(three는 삼각형 순서로 push한 뒤 안정 정렬). 여기서는 격자 후보를
//   삼각형 색인 오름차순으로 훑으며 '엄격히 작을 때만' 갱신 → 같은 규칙.
//  ⚠보증 범위: 단일 재질(그룹 없음) · 모프·스킨 없음 · drawRange 전체. 벗어나면 null을 돌려주고 호출부가 three 경로로 간다.
//  ⚠격자 크기는 손 수치가 아니라 삼각형 수에서 유도(√nTri — 셀당 삼각형 O(1) 기대).
import * as THREE from 'three'

const _inv = new THREE.Matrix4(), _ray = new THREE.Ray(), _pt = new THREE.Vector3(), _w = new THREE.Vector3()
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _o = new THREE.Vector3()

/** 격자 구축 — 실패(보증 범위 밖)면 null. 로컬 정점은 한 번 읽어 둔다(getVertexPosition은 모프 없을 때 position 그대로). */
export function buildUpRayGrid(mesh) {
  const g = mesh.geometry, mat = mesh.material
  if (!g || !mat || Array.isArray(mat) || mesh.isSkinnedMesh) return null
  if (g.morphAttributes && g.morphAttributes.position && g.morphAttributes.position.length) return null
  const pos = g.attributes.position; if (!pos) return null
  const idx = g.index
  const start = g.drawRange.start, count = g.drawRange.count
  if (start !== 0 || count !== Infinity) return null
  mesh.updateWorldMatrix(true, false)
  const nTri = ((idx ? idx.count : pos.count) / 3) | 0
  //  로컬 정점(세 꼭짓점을 삼각형 순으로 평탄화 — three가 getVertexPosition으로 읽는 값과 같은 Float32→double)
  const L = new Float64Array(nTri * 9)
  const W = mesh.matrixWorld
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity
  const bx0 = new Float64Array(nTri), bx1 = new Float64Array(nTri), bz0 = new Float64Array(nTri), bz1 = new Float64Array(nTri)
  for (let t = 0; t < nTri; t++) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
    for (let k = 0; k < 3; k++) {
      const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k
      const x = pos.getX(vi), y = pos.getY(vi), z = pos.getZ(vi)
      L[t * 9 + k * 3] = x; L[t * 9 + k * 3 + 1] = y; L[t * 9 + k * 3 + 2] = z
      _w.set(x, y, z).applyMatrix4(W)
      if (_w.x < x0) x0 = _w.x; if (_w.x > x1) x1 = _w.x; if (_w.z < z0) z0 = _w.z; if (_w.z > z1) z1 = _w.z
    }
    bx0[t] = x0; bx1[t] = x1; bz0[t] = z0; bz1[t] = z1
    if (x0 < minX) minX = x0; if (x1 > maxX) maxX = x1; if (z0 < minZ) minZ = z0; if (z1 > maxZ) maxZ = z1
  }
  const N = Math.max(1, Math.ceil(Math.sqrt(nTri)))
  const cw = (maxX - minX) / N || 1, ch = (maxZ - minZ) / N || 1
  const cells = new Array(N * N); for (let i = 0; i < N * N; i++) cells[i] = []
  const cellX = (x) => Math.min(N - 1, Math.max(0, Math.floor((x - minX) / cw)))
  const cellZ = (z) => Math.min(N - 1, Math.max(0, Math.floor((z - minZ) / ch)))
  for (let t = 0; t < nTri; t++) {   // 삼각형 순서로 넣으므로 각 셀의 목록은 색인 오름차순
    const i0 = cellX(bx0[t]), i1 = cellX(bx1[t]), j0 = cellZ(bz0[t]), j1 = cellZ(bz1[t])
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[j * N + i].push(t)
  }
  return { mesh, L, bx0, bx1, bz0, bz1, cells, N, cw, ch, minX, minZ, maxX, maxZ, nTri, side: mat.side }
}

/** 세계 (x, z)에서 y0부터 +y로 쏜 광선의 첫 교점 y — 없으면 null. three `intersectObject(mesh,false)[0].point.y`와 동일. */
export function upRayHitY(G, x, z, y0, near, far) {
  if (x < G.minX || x > G.maxX || z < G.minZ || z > G.maxZ) return null   // 상자 밖 — 세계 xz 상자 없는 삼각형은 없다
  const i = Math.min(G.N - 1, Math.max(0, Math.floor((x - G.minX) / G.cw))), j = Math.min(G.N - 1, Math.max(0, Math.floor((z - G.minZ) / G.ch)))
  const list = G.cells[j * G.N + i]
  if (!list.length) return null
  const mesh = G.mesh
  _o.set(x, y0, z)
  _ray.origin.copy(_o); _ray.direction.set(0, 1, 0)
  _inv.copy(mesh.matrixWorld).invert()
  _ray.applyMatrix4(_inv)                                    // three: `_ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix)`
  const back = G.side === THREE.BackSide, cull = G.side === THREE.FrontSide
  let best = Infinity, bestY = null
  const L = G.L
  for (let n = 0; n < list.length; n++) {
    const t = list[n]
    if (x < G.bx0[t] || x > G.bx1[t] || z < G.bz0[t] || z > G.bz1[t]) continue   // 세계 xz 상자 밖 = 못 맞춘다
    const o = t * 9
    _a.set(L[o], L[o + 1], L[o + 2]); _b.set(L[o + 3], L[o + 4], L[o + 5]); _c.set(L[o + 6], L[o + 7], L[o + 8])
    const hit = back ? _ray.intersectTriangle(_c, _b, _a, true, _pt) : _ray.intersectTriangle(_a, _b, _c, cull, _pt)
    if (hit === null) continue
    _w.copy(_pt).applyMatrix4(mesh.matrixWorld)
    const d = _o.distanceTo(_w)                              // three: raycaster.ray.origin.distanceTo(세계점)
    if (d < near || d > far) continue
    if (d < best) { best = d; bestY = _w.y }                 // 엄격 부등 = 동률이면 앞선 삼각형(안정 정렬과 같다)
  }
  return bestY
}
