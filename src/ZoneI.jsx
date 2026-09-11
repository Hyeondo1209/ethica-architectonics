// ★★★219 구역 I(리브 여정 = 자립 나선 ~ 전실) 빛 — 2026.09.08 (현도 공급지 설명 · 상수 ZI_* 주석 참조)
//  ⚠수학 정본 = lightingModel.js zoneI*(사본 금지). 여기는 **순회·마샬링·광선 공급·셰이더 게이트**만.
//  패스 순서: DSK(Corridor.jsx) 베이크가 목적지 리브 정점색을 찍은 **뒤**에 돈다(같은 color 속성을 나눠 쓴다 — 관 안면·천장 위 삼각형만 덧쓴다).
//  가림 광선 = three-mesh-bvh(three-bvh-csg의 종속 · 이미 트리에 있음) 한 소프: 구역 I 부재 전부 + 목적지 리브(관 안면 삼각형 = 'glow', 나머지 = 'body') — **로컬 좌표**(상부 여정 그룹).
//  외부 인상 불변: 리브에는 aZi 정점 속성(관 안면·천장 위 = 1)으로만 곱한다 · 나머지 부재는 통째 구역 I 안(vertexColors만) · 볼륨은 관 안·SHAFT 안, 후광 없음.
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, invalidate } from '@react-three/fiber'
import { MeshBVH } from 'three-mesh-bvh'
import { ZI_ON, ZI_VOL_ON, ZI_OP, ZI_FADE_POW, ZI_TOPF, ZI_COLOR, ZI_WALL_SELF, ZI_TREAD_LIT, DSK_ON, ZI_VOL_BORE, ZI_VOL_FEATHER, ZI_WALL_UNLIT, ZI_WALL_FACET_ON } from './constants.js'
import { zoneIBake, zoneIShadeAt, zoneIWallTone, zoneIWallTri, zoneIEmitTri, zoneIVisibleFromInside, zoneIFillFace, zoneIInteriorPoints, zoneIOwns, zoneITubeTris, zoneIDiscTris, zoneIDiscOpacity, ziToLocal } from './lightingModel.js'
import { FRL_TUBE_VERT, FRL_TUBE_FRAG } from './Corridor.jsx'
import { bootNow, bootPass } from './bootProbe.js'

//  리브 정점 속성 게이트 — DSK 패치 뒤에 체인: dskIn ∨ vZi>0.5 면 정점색 곱. DSK가 없는 재질이면 color_fragment를 직접 잡는다.
const ziPatch = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aZi; varying float vZi;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZi = aZi;')
  const fs = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vZi;')
  const fs2 = fs.includes('if (dskIn) diffuseColor.rgb *= vColor.rgb;')
    ? fs.replace('if (dskIn) diffuseColor.rgb *= vColor.rgb;', 'if (dskIn || vZi > 0.5) diffuseColor.rgb *= vColor.rgb;')
    : fs.replace('#include <color_fragment>', '#ifdef USE_COLOR\n  if (vZi > 0.5) diffuseColor.rgb *= vColor.rgb;\n#endif')
  //  ★219-i 관 안면 = 무조명 발광면: 장면 조명(outgoingLight)을 버리고 재질색×정점색(diffuseColor)을 그대로 낸다 — 발광체가 헤미·방향광 무늬를 입던 병(실측 constants ZI_WALL_UNLIT 주석).
  //   opaque_fragment 직전(outgoingLight 확정 뒤)에 한 줄. 톤매핑·색공간·fog는 그 뒤 청크가 그대로 받는다. vZi ≤ 0.5(다른 리브·E 그루터기)는 무접촉.
  shader.fragmentShader = ZI_WALL_UNLIT ? fs2.replace('#include <opaque_fragment>', 'if (vZi > 0.5) outgoingLight = diffuseColor.rgb;\n#include <opaque_fragment>') : fs2
}
const chain = (m, patch, key) => { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); patch(sh) }; const pk = m.customProgramCacheKey; m.customProgramCacheKey = () => (pk ? pk.call(m) : '') + key }

export function ZoneILight() {
  const { scene } = useThree()
  const done = useRef(false), frames = useRef(0)
  const B = useMemo(() => (ZI_ON ? zoneIBake() : null), [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(ZI_COLOR) }, uOpacity: { value: ZI_OP }, uXF: { value: 0 }, uTopF: { value: ZI_TOPF }, uPow: { value: ZI_FADE_POW }, uCeil: { value: new THREE.Vector4(0, 0, 0, 0) } },
    vertexShader: FRL_TUBE_VERT, fragmentShader: FRL_TUBE_FRAG }), [])
  //  ★219-i 관 속 빛기둥 재질 = 튜브 재질 사본 · uXF = 반경 깃털 · uOpacity = 원판 겹 정규화(zoneIDiscOpacity — 원판 수는 기하가 정한다). 'tube' 보존계면 공유 재질 그대로.
  const boreMat = useMemo(() => { if (ZI_VOL_BORE !== 'discs') return mat
    const m = mat.clone(); m.uniforms = THREE.UniformsUtils.clone(mat.uniforms); m.uniforms.uXF.value = ZI_VOL_FEATHER; return m }, [mat])
  const geos = useMemo(() => {
    if (!B || !ZI_VOL_ON) return null
    const mk = (T) => { const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(T.pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(T.uv), 2)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(T.nrm), 3)); return g }
    const boreT = ZI_VOL_BORE === 'discs' ? zoneIDiscTris(B.spec) : zoneITubeTris(B.spec, 'bore')
    if (ZI_VOL_BORE === 'discs') boreMat.uniforms.uOpacity.value = zoneIDiscOpacity(boreT.discs)
    return { bore: mk(boreT), shaft: mk(zoneITubeTris(B.spec, 'shaft')) }
  }, [B, boreMat])
  useFrame(() => {
    if (!B || done.current) return
    frames.current++
    const members = [], rib = [], plates = []
    scene.traverse((o) => {
      if (o.userData.zoneI) o.traverse((m) => { if (m.isMesh && !members.includes(m)) members.push(m) })
      if (o.isMesh && o.userData.ziRib) rib.push(o)
      if (o.isInstancedMesh && o.userData.ziPlates) plates.push(o)
    })
    if ((!members.length || !rib.length) && frames.current < 60) return
    if (DSK_ON && rib.length && !rib[0].geometry.userData.bakedDsk && frames.current < 90) return   // DSK가 리브 정점색을 찍은 뒤
    done.current = true
    const t0 = bootNow()
    const v = new THREE.Vector3(), nm = new THREE.Vector3(), nMat = new THREE.Matrix3(), im = new THREE.Matrix4()
    //  ⑴ 가림 소프(로컬 좌표) — 삼각형별 kind
    const soupPos = [], kinds = []
    //  ⛔★219 함정(실측 09.08): `W.map(ziToLocal)`는 Array.map 둘째 인자(**인덱스** 0·1·2)가 ziToLocal의 phi 자리에 들어가 세 정점이 제각각 0·1·2 rad 돌아간다 —
    //   소프 삼각형 34967개 **전부** 변 100m 초과(최대 496m · 실측)로 부풀어 BVH가 무의미해지고(41.8µs/발) 가림이 엉터리가 됐다. 인자 하나짜리 화살표로 고정한다.
    const toL = (p) => ziToLocal(p)
    const addTri = (a, b, c, kind) => { soupPos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); kinds.push(kind) }
    const triWorld = (o, g, i0, i1, i2) => [i0, i1, i2].map((i) => { v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(o.matrixWorld); return [v.x, v.y, v.z] })
    const eachTri = (g, f) => { const P = g.attributes.position, I = g.index; const n = I ? I.count : P.count; for (let i = 0; i + 2 < n; i += 3) f(I ? I.getX(i) : i, I ? I.getX(i + 1) : i + 1, I ? I.getX(i + 2) : i + 2, i / 3) }   // ★219-n 넷째 인자 = 삼각형 번호
    //  ★219 종류는 **소유 메시가 아니라 면 자체**가 정한다 — 무릎길·전망 몸의 관 접촉면이 곧 관 안면(발광)이기 때문(lightingModel zoneIWallTri 주석 ⓐ).
    const triC = (W) => [(W[0][0] + W[1][0] + W[2][0]) / 3, (W[0][1] + W[1][1] + W[2][1]) / 3, (W[0][2] + W[1][2] + W[2][2]) / 3]
    const triN = (W) => { const u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], w = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]]
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...n); return l < 1e-12 ? null : [n[0] / l, n[1] / l, n[2] / l] }
    //  ★219-c 가림 분류는 **광원 판정**(zoneIEmitTri — 천장 무관)이다. 색 소유(zoneIWallTri — 천장 위)와 다른 선. 두 방향 다 본다(CSG 감김을 믿지 않는다).
    const kindOfTri = (W) => { const n = triN(W); if (!n) return 'body'; const c = triC(W)
      return (zoneIEmitTri(c, n, B.spec) || zoneIEmitTri(c, [-n[0], -n[1], -n[2]], B.spec)) ? 'glow' : 'body' }
    //  ★219-d 걷는 판(walkable)의 삼각형은 'tread' — 벽에 가려지는 대신 **준광원**으로 센다(상호반사). 단 벽 판정이 먼저다(관 접촉면이면 벽).
    const addMesh = (o) => { const g = o.geometry; if (!g || !g.attributes.position) return; o.updateWorldMatrix(true, false)
      const walk = o.userData.walkable === true
      const kind = (W) => { const k = kindOfTri(W); return k === 'glow' ? k : (walk ? 'tread' : 'body') }
      if (o.isInstancedMesh) { const M = new THREE.Matrix4()
        for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, im); M.multiplyMatrices(o.matrixWorld, im)
          eachTri(g, (a, b, c) => { const W = [a, b, c].map((i) => { v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(M); return [v.x, v.y, v.z] }); addTri(...W.map(toL), kind(W)) }) } return }
      eachTri(g, (a, b, c) => { const W = triWorld(o, g, a, b, c); addTri(...W.map(toL), kind(W)) }) }
    for (const m of members) addMesh(m)
    for (const p of plates) addMesh(p)
    for (const r of rib) addMesh(r)
    //  ⛔★219 함정 둘째(실측 09.08): MeshBVH는 **삼각형 순서를 재정렬**한다 — `kinds[hit.faceIndex]`는 다른 삼각형의 종류를 준다(맞은 면 중심이 y−920으로 나와 적발).
    //   해법 = 항등 색인(index[i] = i)을 미리 달아 두면, 재정렬 뒤에도 `index[3·faceIndex]`가 **원래 정점 번호**라 원 삼각형 = ⌊그 값/3⌋로 복원된다(실측 대조 완료).
    const soup = new THREE.BufferGeometry(); soup.setAttribute('position', new THREE.BufferAttribute(new Float32Array(soupPos), 3))
    { const nv = soupPos.length / 3, id = new Uint32Array(nv); for (let i = 0; i < nv; i++) id[i] = i; soup.setIndex(new THREE.BufferAttribute(id, 1)) }
    const tS = bootNow(); const bvh = new MeshBVH(soup); const tB = bootNow()
    const SIDX = soup.index.array, kindOfHit = (fi) => kinds[(SIDX[fi * 3] / 3) | 0]
    if (typeof window !== 'undefined') window.__ethicaZi = { soup: soup.attributes.position.array, kinds }   // 개발 핸들(★216 __ethicaBoot 어법) — 프로브가 소프를 꺼내 광선 성능을 잰다 · ★219-h 아래서 records·rayFn·B·ipts를 덧단다
    let nRay = 0
    const ray = new THREE.Ray(), rayFn = (o, d, maxD) => { nRay++; ray.origin.set(o[0], o[1], o[2]); ray.direction.set(d[0], d[1], d[2]); const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, maxD); if (!h) return null; return { dist: h.distance, kind: kindOfHit(h.faceIndex) } }
    //  인스턴스 표본점 = 인스턴스 **상면 중심**(중심점은 상자 속이라 광선이 제 윗면을 맞힌다 — DSK는 가림이 없어 중심점으로 충분했다) · 위 향
    const bbox = new THREE.Box3(), instTop = (o, k) => { o.getMatrixAt(k, im); im.premultiply(o.matrixWorld); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bbox.copy(o.geometry.boundingBox).applyMatrix4(im); return [(bbox.min.x + bbox.max.x) / 2, bbox.max.y, (bbox.min.z + bbox.max.z) / 2] }
    //  ★219-c 판 한 장 = 색 하나이므로 **상면 다점 평균**을 쓴다. 한 점 대표는 그 점이 우연히 위 판에 가리면 판 전체가 0.04로 떨어져
    //   나선을 따라 0.04↔1.0이 불규칙하게 튄다(현도 화면). 표본 = 상면 네 귀(면적 60% 안쪽 · 상자 밖으로 안 나가게) + 중심.
    const instTopSamples = (o, k) => { o.getMatrixAt(k, im); im.premultiply(o.matrixWorld); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bbox.copy(o.geometry.boundingBox).applyMatrix4(im)
      const cx = (bbox.min.x + bbox.max.x) / 2, cz = (bbox.min.z + bbox.max.z) / 2, hx = (bbox.max.x - bbox.min.x) * 0.3, hz = (bbox.max.z - bbox.min.z) * 0.3, y = bbox.max.y
      return [[cx, y, cz], [cx - hx, y, cz - hz], [cx + hx, y, cz - hz], [cx - hx, y, cz + hz], [cx + hx, y, cz + hz]] }
    //  ★219-d′ 걷는 판 = 발광 벽과 같은 밝기(현도 지시 "상단면들은 전부 흰색"). 노브 끄면 다점 평균 AO로 돌아간다.
    const shadeInstance = (o, k) => { if (ZI_TREAD_LIT && o.userData.walkable === true) return ZI_WALL_SELF
      const ss = instTopSamples(o, k); let a = 0; for (const p of ss) a += zoneIShadeAt(p, [0, 1, 0], rayFn, B); return a / ss.length }
    //  ⑵ 부재 정점색(세계 p·n → 모델) · 인스턴스 = 중심점·위 향
    const ipts = zoneIInteriorPoints(B.spec)
    const records = []   // ★219-h 베이크한 메시와 삼각형별 안팎 판정 — _probe_zoneI --verify가 값과 대조한다
    let nMesh = 0, nInst = 0, nVert = 0, nEmit = 0, nExt = 0
    const bakeMesh = (o) => {
      if (!o.isMesh || !o.geometry) return
      const mats = [].concat(o.material); if (!mats.every((m) => m && m.isMeshStandardMaterial)) return
      const g = o.geometry; o.updateWorldMatrix(true, false)
      if (o.isInstancedMesh) { const c = new THREE.Color()
        for (let k = 0; k < o.count; k++) o.setColorAt(k, c.setScalar(shadeInstance(o, k)))
        o.instanceColor.needsUpdate = true; nInst++; return }
      if (!g.attributes.normal) g.computeVertexNormals()
      if (g.userData.bakedZi) return
      nMat.getNormalMatrix(o.matrixWorld)
      const P = g.attributes.position, N = g.attributes.normal, col = new Float32Array(P.count * 3)
      //  ★219-g 삼각형 한 장마다 **가시성**으로 안팎을 먼저 가르고(좌표 상자 아님), 그 결과가 정하는 **방향**으로 음영을 낸다.
      //   ⛔이 순서를 뒤집었던 것이 09.09의 병: 판정은 감김 법선, 음영은 정점 법선을 써서 서로 반대를 가리켰다 —
      //    "안면이라 안 되돌리는데 빛은 못 받는" 면이 생겨 70㎡ 벽이 통째로 0.04로 남았다(실측). 이제 둘이 같은 방향을 쓴다.
      //  ⚠기준은 **정점 법선 자신**이다: side는 감김 법선 기준이라, 정점 법선이 감김과 반대인 면(CSG·수입 기하에 흔하다)에서는 그대로 쓰면 또 어긋난다.
      //   ⇒ 실내를 향하는 방향(desired = side·n_tri)과 그 정점의 법선을 직접 비교해 뒤집을지 정한다.
      const side = new Int8Array(P.count)          // +1 그대로 · −1 뒤집어 · 0 = 바깥면(안 칠한다)
      const fillV = new Uint8Array(P.count)        // ★219-h 공극에 면한 삼각형의 정점 = 1(zoneIShadeAt faceFill — 귀퉁이가 상자 밖이라도 채움)
      const triSide = new Int8Array(((g.index ? g.index.count : P.count) / 3) | 0)   // ★219-h 삼각형별 판정 기록(±1 안면·0 바깥면·2 퇴화) — 전수 대조 프로브 몫
      let nOut = 0, nIn = 0, ti = 0
      eachTri(g, (a, b, c) => { const W = triWorld(o, g, a, b, c); const n = triN(W); const t = ti++; if (!n) { triSide[t] = 2; return }
        const vis = zoneIVisibleFromInside(triC(W), n, rayFn, ipts, B.spec)
        triSide[t] = vis.inward ? vis.side : 0
        if (!vis.inward) { nOut += 3; return }
        nIn += 3
        const want = [n[0] * vis.side, n[1] * vis.side, n[2] * vis.side]
        if (zoneIFillFace(triC(W), want, B.spec)) { fillV[a] = 1; fillV[b] = 1; fillV[c] = 1 }
        for (const i of [a, b, c]) { nm.fromBufferAttribute(N, i).applyMatrix3(nMat)
          side[i] = (nm.x * want[0] + nm.y * want[1] + nm.z * want[2]) < 0 ? -1 : 1 } })
      for (let i = 0; i < P.count; i++) {
        if (side[i] === 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1; continue }   // 바깥면 = 기준선 복원(재질 원색과 같다 — ZI 이전 측정)
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); nm.fromBufferAttribute(N, i).applyMatrix3(nMat).normalize()
        //  정점 법선이 가시성이 정한 쪽과 어긋나면 뒤집어 쓴다(부드러운 법선의 뉘앙스는 살리고 방향만 바로잡는다)
        if (side[i] < 0) nm.negate()
        const sh = zoneIShadeAt([v.x, v.y, v.z], [nm.x, nm.y, nm.z], rayFn, B, false, fillV[i] === 1)
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = sh
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.userData.bakedZi = true; nVert += nIn; nExt += nOut
      records.push({ o, triSide })   // ★219-h 전수 대조 프로브에 판정을 넘긴다(개발 핸들 — 렌더 무관)
      //  ★219 발광 벽 정점 = ZI_WALL_SELF("빛이 나는 곳은 하얗다" — E 그루터기 규칙 승계). 무릎길·전망 몸의 관 접촉면이 여기 든다.
      let nEm = 0
      eachTri(g, (a, b, c) => { const W = triWorld(o, g, a, b, c); const n = triN(W); if (!n) return; const cc = triC(W)
        if (!zoneIWallTri(cc, n, B.spec) && !zoneIWallTri(cc, [-n[0], -n[1], -n[2]], B.spec)) return
        for (const i of [a, b, c]) { const tone = zoneIWallTone(W[[a, b, c].indexOf(i)], B.spec); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = tone; nEm++ } })   // ★219-j 발광 톤 = 정점 제 위치의 높이 함수(전망 판 위 관만 · 그 밖 = ZI_WALL_SELF)
      nEmit += nEm
      g.attributes.color.needsUpdate = true
      mats.forEach((m) => { m.vertexColors = true; m.needsUpdate = true }); nMesh++
    }
    for (const m of members) bakeMesh(m)
    const tM = bootNow()
    //  ⑶ 판 인스턴스 — 방 천장 위(zoneIOwns)만 덧쓴다(방 안 = E 값 그대로)
    for (const p of plates) { const c = new THREE.Color(); let n = 0
      for (let k = 0; k < p.count; k++) { p.getMatrixAt(k, im); v.setFromMatrixPosition(im).applyMatrix4(p.matrixWorld); const pw = [v.x, v.y, v.z]
        if (!zoneIOwns(pw, B.spec)) continue; if (!p.instanceColor) p.setColorAt(k, c.setScalar(1)); p.setColorAt(k, c.setScalar(shadeInstance(p, k))); n++ }
      if (n) { p.instanceColor.needsUpdate = true; nInst++ } }
    //  ⑷ 목적지 리브 — 삼각형 중심 소속(관 안면 ∧ 천장 위) → 세 정점 색 = 발광체 · aZi = 1 · 게이트 패치
    for (const r of rib) { const g = r.geometry, P = g.attributes.position; if (!P) continue
      let col = g.attributes.color; if (!col) { col = new THREE.BufferAttribute(new Float32Array(P.count * 3).fill(1), 3); g.setAttribute('color', col) }
      let zi = new Float32Array(P.count); let n = 0; const walls = []
      const nmInv = new THREE.Matrix3().getNormalMatrix(r.matrixWorld).invert()   // 세계 법선 → 메시 로컬
      eachTri(g, (a, b, c, ti) => { const W = triWorld(r, g, a, b, c), cw = [(W[0][0] + W[1][0] + W[2][0]) / 3, (W[0][1] + W[1][1] + W[2][1]) / 3, (W[0][2] + W[1][2] + W[2][2]) / 3]
        const nn = triN(W); if (!nn || (!zoneIWallTri(cw, nn, B.spec) && !zoneIWallTri(cw, [-nn[0], -nn[1], -nn[2]], B.spec))) return   // ★219 천장 경계는 zoneIWallTri 안에 있다(E와 겹치지 않는다 — 사본 금지)
        const tones = [a, b, c].map((i) => zoneIShadeAt(W[[a, b, c].indexOf(i)], [0, 1, 0], rayFn, B, true))   // ★219-j 정점 제 위치(삼각형 중심 덮어쓰기 = 계단)
        const nl = new THREE.Vector3(nn[0], nn[1], nn[2]).applyMatrix3(nmInv).normalize()                         // 감김 법선(로컬) — 양면 재질 faceDirection과 정합
        walls.push({ ti, a, b, c, tones, nl }); n++ })
      if (ZI_WALL_FACET_ON && g.index && walls.length) {
        //  ★219-n(ⓐ · 현도 09.11 "a로 가보자"): 관 안면 삼각형마다 **정점 분리**(자기 삼각형 전용 사본) · 법선 = 그 삼각형의 감김 면 법선 → 같은 10각형 면의 삼각형은 공면이라 한 톤,
        //   모서리에서는 정점을 나누지 않으니 각이 산다. CSG가 남긴 플랫/스무스 혼재(★219-l 실측 반반)를 지우되 조형(각진 면)은 그대로. 원래 정점·다른 삼각형은 무접촉(aZi 0 · 색 그대로).
        const oldN = P.count, add = walls.length * 3, names = Object.keys(g.attributes).filter((k) => k !== 'aZi')
        const grown = {}; for (const k of names) { const A = g.attributes[k], sz = A.itemSize, arr = new Float32Array((oldN + add) * sz); arr.set(A.array.subarray(0, oldN * sz)); grown[k] = { arr, sz } }
        const zi2 = new Float32Array(oldN + add); zi2.set(zi); const idx = g.index.array.slice()
        walls.forEach((w, wi) => { [w.a, w.b, w.c].forEach((src, j) => { const dst = oldN + wi * 3 + j
          for (const k of names) { const { arr, sz } = grown[k]; for (let q = 0; q < sz; q++) arr[dst * sz + q] = arr[src * sz + q] }
          const cA = grown.color, t = w.tones[j]; cA.arr[dst * 3] = cA.arr[dst * 3 + 1] = cA.arr[dst * 3 + 2] = t
          if (grown.normal) { const nA = grown.normal; nA.arr[dst * 3] = w.nl.x; nA.arr[dst * 3 + 1] = w.nl.y; nA.arr[dst * 3 + 2] = w.nl.z }
          zi2[dst] = 1; idx[w.ti * 3 + j] = dst }) })
        for (const k of names) g.setAttribute(k, new THREE.BufferAttribute(grown[k].arr, grown[k].sz))
        g.setIndex(new THREE.BufferAttribute(idx, 1)); col = g.attributes.color; zi = zi2; g.userData.ziFacetSplit = walls.length
      } else {
        for (const w of walls) [w.a, w.b, w.c].forEach((i, j) => { zi[i] = 1; const t = w.tones[j]; col.setXYZ(i, t, t, t) }) }
      col.needsUpdate = true; g.setAttribute('aZi', new THREE.BufferAttribute(zi, 1)); g.userData.bakedZi = true
      //  ★219-i 게이트 결정화: 리브 재질은 72기가 공유하고 aZi는 목적지 리브에만 있다 — 없는 메시에서 vZi가 잔존값을 읽던 구멍(외부 리브 전부가 분기에 걸린 실측 09.10) 봉쇄. three는 material.defaultAttributeValues를 어떤 재질에서든 읽는다.
      ;[].concat(r.material).forEach((m) => { m.vertexColors = true; m.defaultAttributeValues = { ...(m.defaultAttributeValues || {}), color: [1, 1, 1], uv: [0, 0], uv1: [0, 0], aZi: [0] }; chain(m, ziPatch, '|zi'); m.needsUpdate = true }); nMesh++
      console.info(`[ZI] 리브 관 안면(천장 위) 삼각형 ${n}` + (g.userData.ziFacetSplit ? ` · 정점 분리 ${g.userData.ziFacetSplit}장(★219-n 면마다 플랫)` : '')) }
    if (geos) console.info(`[ZI] 볼륨 — 관 속 ${ZI_VOL_BORE} ${geos.bore.attributes.position.count / 3}tri · uOpacity ${boreMat.uniforms.uOpacity.value.toFixed(4)} · uXF ${boreMat.uniforms.uXF.value} · SHAFT ${geos.shaft.attributes.position.count / 3}tri · uOpacity ${mat.uniforms.uOpacity.value.toFixed(4)}`)   // ★219-j 렌더 진단(현도 콘솔 — 볼륨이 장면에 있는지)
    if (typeof window !== 'undefined' && window.__ethicaZi) Object.assign(window.__ethicaZi, { records, rayFn, B, ipts })   // ★219-h 전수 대조 핸들
    bootPass('ZI', t0)
    console.info(`[ZI] ★219 구역 I: 소프 ${kinds.length}tri(발광 ${kinds.filter((k) => k === 'glow').length}) · 정점색 메시 ${nMesh}(정점 ${nVert}) · 인스턴스 ${nInst} · 발광 벽 정점 ${nEmit} · 바깥면 정점 ${nExt} · 판 ${kinds.filter((k) => k === 'tread').length}tri · 광선 ${nRay} · eRefHole ${B.eRefHole.toExponential(2)} · ms 소프 ${(tS - t0).toFixed(0)} bvh ${(tB - tS).toFixed(0)} 부재 ${(tM - tB).toFixed(0)} 판·리브 ${(bootNow() - tM).toFixed(0)}`)
    invalidate()
  })
  if (!geos) return null
  return (
    <>
      <mesh geometry={geos.bore} material={boreMat} userData={{ lightVolume: true, walkable: false }} frustumCulled={false} renderOrder={10} />
      <mesh geometry={geos.shaft} material={mat} userData={{ lightVolume: true, walkable: false }} frustumCulled={false} renderOrder={10} />
    </>
  )
}

