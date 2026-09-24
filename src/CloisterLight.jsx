// ★★★226 빛 구획 F — 회랑(1p9) 내부 명암 베이크 (2026.09.24 · 조명 헌장 Ⅱ)
//  ⚠수학 정본 = lightingModel.js clf*(사본 금지). 여기는 **순회·세분·안팎 판정 배선·셰이더 게이트**만.
//  대상 = 장면에서 userData.clf 그룹(Dome.jsx RevealPassage의 회랑 C절) 안의 메시. 좌표는 그 그룹의 역행렬로 **회랑 로컬**에 옮겨 부른다
//   (상부 여정 그룹 회전 −RIB_DEST_PHI를 손으로 적지 않는다 — ★222 프레임 사고 규율).
//  외면 불변: 회랑 벽·지붕·바닥은 두께 0 **양면 판**이라 한 정점이 안팎 두 면에 동시에 그려진다.
//   ⇒ 삼각형마다 실내 쪽(감김 법선 기준 ±1 · 0 = 바깥면)을 aClf 속성에 싣고, 조각 셰이더가 **gl_FrontFacing이 그쪽일 때만** 정점색을 곱한다.
//   바깥면으로 판정된 삼각형이 하나도 없는 메시는 손대지 않는다(기하·재질 그대로).
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, invalidate } from '@react-three/fiber'
import { CLF_ON, CLF_SUBDIV, ZI_ON, CLF_DIM as CLF_DIM_L } from './constants.js'
import { clfSpec, clfTermsAt, clfCompose, clfFaceSide, CLF_TUNE, clfPoolGLSL, clfPoolShape, clfClampToVolume, clfRoofHoleR } from './lightingModel.js'
import { subdivideLongEdges } from './ziSubdivide.js'
import { regridPrimitive } from './clfGrid.js'   // ★226 원시 재격자(가는 조각 세분 폭발의 수리 — clfGrid.js 머리 주석)
import { bootNow, bootPass } from './bootProbe.js'

//  셰이더 게이트 — color_fragment 한 청크를 갈아 끼운다(대상이 없으면 throw → 빌드·프로브에서 잡힌다)
//   ⚠export하지 않는다(react-refresh: 컴포넌트 파일은 컴포넌트만) — check_lux가 소스 문자열로 배선을 문다
const CLF_GATE = 'if (vClf * (gl_FrontFacing ? 1.0 : -1.0) > 0.5) { vec3 clfC = vColor.rgb; if (vClfMark > 1e-4) clfC = min(vec3(1.0), clfC + uClfPoolK * clfPool(vClfW) * vClfMark); diffuseColor.rgb *= clfC; }'   // ★232 빛 자국 = 바닥 가중 × 픽셀 표 보간
const POOL = clfPoolGLSL()   // ★232 회랑 빛 자국(모듈 1회 · 전실 표 공유)
//  ★235 지붕 등불 축 구멍 — 지붕 재질에만 CLF_ROOF_HOLE 정의 · 반경 = clfRoofHoleR(시야 원뿔) · 등불 xz = 빛 자국과 같은 유니폼
const CLF_HOLE = '#ifdef CLF_ROOF_HOLE\n  { float hx = vClfW.x * uClfRot.x + vClfW.z * uClfRot.y, hz = -vClfW.x * uClfRot.y + vClfW.z * uClfRot.x;\n    for (int k = 0; k < ' + POOL.uniforms.uClfLamps.length + '; k++) { if (length(vec2(hx - uClfLamps[k].x, hz - uClfLamps[k].y)) < uClfHoleR) discard; } }\n#endif\n'
const POOL_U = { uClfPool: { value: POOL.uniforms.uClfPool }, uClfLamps: { value: POOL.uniforms.uClfLamps.map(([x, z]) => new THREE.Vector2(x, z)) }, uClfPoolR: { value: POOL.uniforms.uClfPoolR },
  uClfPoolK: { value: POOL.uniforms.uClfPoolK }, uClfRot: { value: new THREE.Vector2(...POOL.uniforms.uClfRot) }, uClfHoleR: { value: clfRoofHoleR() } }
const clfPatch = (shader) => {
  if (!shader.fragmentShader.includes('#include <color_fragment>')) throw new Error('★226: color_fragment 청크 없음 — 게이트 치환 대상 없음')
  Object.assign(shader.uniforms, POOL_U)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aClf; varying float vClf; attribute float aClfMark; varying float vClfMark; varying vec3 vClfW;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClf = aClf; vClfMark = aClfMark; vClfW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vClf;\nuniform float uClfHoleR;\n' + POOL.decl + '\n' + POOL.fn)
    .replace('#include <color_fragment>', CLF_HOLE + '#ifdef USE_COLOR\n  ' + CLF_GATE + '\n#endif')
}
const chain = (m, patch, key) => { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); patch(sh) }; const pk = m.customProgramCacheKey; m.customProgramCacheKey = () => (pk ? pk.call(m) : '') + key }

export function CloisterLight() {
  const { scene } = useThree()
  const done = useRef(false), frames = useRef(0), bakeRef = useRef(null), seam = useRef({ done: false, frames: 0, G: null, S: null })
  const [baked, setBaked] = useState(false)
  useFrame(() => {
    //  ★★★227 이음매 패스(구역 I 베이크 뒤 한 번) — 구역 I 부재 중 **구역 I가 바깥면으로 둔(triSide 0) 삼각형**이면서 회랑 공극에 면하는 것
    //   (회랑 입 아치 패널·트랜섬의 회랑 쪽 면 — 구역 I 대표점에서 안 보여 1.0 흰 면으로 남던 것)에 회랑 명암을 쓴다. 부재 목록을 손으로 적지 않는다(규칙이 고른다).
    //   ⚠다른 삼각형과 공유하는 정점은 복제해 쓴다(★227-b) · 구역 I 부재는 닫힌 솔리드라 그 삼각형의 뒷면은 살 속 · 쓴 정점 = g.userData.clfSeam(구역 I 전수 대조 Ⓑ의 명시 예외).
    const SM = seam.current
    if (done.current && !SM.done && SM.G) {
      const Zh = typeof window !== 'undefined' ? window.__ethicaZi : null
      if (!ZI_ON) { SM.done = true; return }
      if (!Zh || !Zh.records) { if (++SM.frames < 600) return; SM.done = true; console.warn('[CLF] 이음매 패스: 구역 I 베이크 기록이 없다 — 건너뜀'); return }
      SM.done = true
      const inv = new THREE.Matrix4().copy(SM.G.matrixWorld).invert(), Lm = new THREE.Matrix4(), v = new THREE.Vector3()
      let nT = 0, nV = 0, nDup = 0, nNaN = 0
      for (const { o, triSide } of Zh.records) {
        const g = o.geometry, P = g.attributes.position, C = g.attributes.color; if (!P || !C || !triSide) continue
        o.updateWorldMatrix(true, false); Lm.multiplyMatrices(inv, o.matrixWorld)
        //  ⛔★234(09.24 현도 "바닥에 검은 톱니 · 벽 무늬 그대로" → 실측 NaN 49정점): loc가 **복제 전 위치 속성 P**를 붙잡고 있어 복제된 새 정점(색인 ≥ 구 개수)을 읽으면 범위 밖 = NaN → 검정.
        //   ★227-b 복제 도입부터 있던 병(아치 패널 26정점 = "벽 무늬") · ★233 대상 확장으로 전실 슬랩까지 번졌다. ⇒ 항상 **현재** 위치 속성을 읽는다.
        const I = g.index, nn = I ? I.count : P.count, idx = (i) => (I ? I.getX(i) : i), loc = (i) => v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(Lm).toArray()
        //  ⑴ 삼각형 판정: 구역 I 바깥면 ∧ 회랑 공극에 면함 → 이음매(실내 쪽 평면 법선)
        const seamTri = []                                                      // { t, ids, n }
        const other = new Uint8Array(P.count)                                   // 이음매 아닌 삼각형이 쓰는 정점
        for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) {
          //  ★233 대상 = (구역 I 바깥면 ∨ **구역 I가 실내라 본 쪽이 곧 회랑 공극 쪽**) ∧ 회랑 공극에 면함.
          //   ⛔★227 판은 바깥면(triSide 0)만 골랐다 — 구역 I 가시성 광선이 **아치 개구를 통해** 전실 대표점에 닿아, 아치 둘레 패널의 회랑 쪽 삼각형 일부가
          //    '구역 I 안면'으로 분류돼 전실 값(표본 결 + 경로 곱)을 받았다(현도 09.24 "모서리 얼룩" — 공극 안 평가로는 안 없어져 실측으로 특정). 같은 부호 = 같은 면이 회랑을 본다.
          //   ⛔★235(현도 "문턱 바닥 지그재그"): 그 확장이 **전실 바닥 슬랩 윗면**(회랑 공극으로 0.3m 물린 몫)까지 끌어와 삼각형 단위로 회랑 값을 받았다 → 삼각형 변을 따라 톤 경계.
          //    ⇒ 확장(구역 I 안면)은 **수평 아닌 면만**(실내 쪽 법선 |y| < 0.5) — 바닥·천장은 구역 I 경로 셰이더(픽셀 연속)에 남긴다. 구역 I 바깥면(★227)은 그대로.
          const ids = [idx(i), idx(i + 1), idx(i + 2)], W = ids.map(loc), s0 = clfFaceSide(W)
          const u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], w = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]]
          let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; const L = Math.hypot(...n) || 1; n = n.map((x) => x * s0 / L)
          const s = (triSide[t] === 0 || (triSide[t] === s0 && Math.abs(n[1]) < 0.5)) ? s0 : 0
          if (s === 0) { for (const id of ids) other[id] = 1; continue }
          seamTri.push({ t, i, ids, n })
        }
        if (!seamTri.length) continue
        //  ⑵ ★227-b 공유 정점은 **복제**한다(구판 = 건너뜀 → 회랑 쪽 면 가장자리에 1.0 정점이 남아 흰 번짐 · 실측 479정점). 색인 판만 해당(비색인은 원래 공유 없음).
        //   삼각형 순서·수는 불변(색인만 고친다) → 구역 I의 triSide·records와 정합. 원래 정점은 이음매 아닌 삼각형 몫으로 남아 값 1.0 그대로(외면 불변).
        const dupOf = new Map(); let add = 0
        if (I) for (const q of seamTri) for (const id of q.ids) if (other[id] && !dupOf.has(id)) dupOf.set(id, P.count + add++)
        if (add) { const names = Object.keys(g.attributes), grown = {}
          for (const k of names) { const A = g.attributes[k], sz = A.itemSize, arr = new A.array.constructor((P.count + add) * sz); arr.set(A.array.subarray(0, P.count * sz))
            for (const [src, dst] of dupOf) for (let c = 0; c < sz; c++) arr[dst * sz + c] = A.array[src * sz + c]
            grown[k] = new THREE.BufferAttribute(arr, sz, A.normalized) }
          const ix = I.array.slice(); for (const q of seamTri) for (let k = 0; k < 3; k++) { const id = q.ids[k]; if (dupOf.has(id)) { ix[q.i + k] = dupOf.get(id); q.ids[k] = dupOf.get(id) } }
          for (const k of names) g.setAttribute(k, grown[k]); g.setIndex(new THREE.BufferAttribute(ix, 1)); nDup += add }
        //  ⑶ 쓰기
        const Cn = g.attributes.color, N = Cn.count, terms = new Float32Array(N * 3), side = new Float32Array(N), done2 = new Uint8Array(N), written = []
        for (const q of seamTri) { const W = q.ids.map(loc); q.ids.forEach((id, k) => { if (done2[id]) return; done2[id] = 1
          //  ★233 벽 뒤 조각 정점 = 공극 안 최근접점 · ⛔★234: 이 주석이 ★233에서 줄 가운데 박혀 terms(창·빛기둥) 저장을 주석 처리했다(튜너 재합성 때 이음매 면만 창 몫 0) → 줄을 나눴다
          const T = clfTermsAt(clfClampToVolume(W[k]), q.n, SM.S), val = clfCompose(T)
          if (!Number.isFinite(val)) { nNaN++; return }                        // ★234 가드 — NaN은 쓰지 않고 센다(기대 0)
          terms[3 * id] = T.pool; terms[3 * id + 1] = T.win; terms[3 * id + 2] = T.beam
          Cn.setXYZ(id, val, val, val); side[id] = 1; written.push(id) }); nT++ }
        { const AP = g.attributes.aZiPath; if (AP) { for (const id of written) AP.setXYZ(id, 0, 0, 0); AP.needsUpdate = true } }   // ★229 회랑 쪽 면은 구역 I 경로 셰이더 밖(복제 정점이 원본 표시를 물려받는다)
        nV += written.length; Cn.needsUpdate = true; g.userData.clfSeam = Int32Array.from(written)
        if (bakeRef.current) bakeRef.current.push({ o, triSide: null, terms, side, seam: true })   // 튜너 재합성에 합류
      }
      if (typeof window !== 'undefined' && window.__ethicaClf) window.__ethicaClf.seam = { nT, nV, nDup, nNaN }
      console.info(`[CLF] ★227 이음매 패스: 구역 I 바깥면 중 회랑 공극에 면한 삼각형 ${nT} · 쓴 정점 ${nV}(공유라 복제 ${nDup}) · NaN ${nNaN}(기대 0)`)
      invalidate(); return
    }
    if (!CLF_ON || done.current) return
    frames.current++
    let G = null
    scene.traverse((o) => { if (!G && o.userData.clf) G = o })
    if (!G && frames.current < 60) return
    done.current = true
    if (!G) { console.warn('[CLF] 회랑 그룹(userData.clf)을 못 찾았다 — 베이크 없음'); return }
    const t0 = bootNow(), S = clfSpec()
    G.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), Lm = new THREE.Matrix4(), nMat = new THREE.Matrix3()
    const v = new THREE.Vector3(), nv = new THREE.Vector3()
    const meshes = []; G.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) meshes.push(o) })
    let nMesh = 0, nSkip = 0, nTri = 0, nIn = 0, nVert = 0, nShade = 0, nRegrid = 0, nFallback = 0
    const cache = new Map()
    const records = []
    for (const o of meshes) {
      const mats = [].concat(o.material); if (!mats.every((m) => m && m.isMeshStandardMaterial)) { nSkip++; continue }
      o.updateWorldMatrix(true, false); Lm.multiplyMatrices(inv, o.matrixWorld); nMat.getNormalMatrix(Lm)
      const flip = Lm.determinant() < 0 ? -1 : 1                                  // 거울 변환이면 앞면 규약이 뒤집힌다(현재 없음 · 방어)
      const loc = (g, i) => v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(Lm).toArray()
      const eachTri = (g, f) => { const I = g.index, n = I ? I.count : g.attributes.position.count; for (let i = 0; i + 2 < n; i += 3) f(I ? I.getX(i) : i, I ? I.getX(i + 1) : i + 1, I ? I.getX(i + 2) : i + 2, i / 3) }
      //  ⑴ 원본 삼각형으로 먼저 거른다 — 실내에 면한 삼각형이 없으면 이 메시는 바깥 전용(손대지 않는다)
      let any = false
      eachTri(o.geometry, (a, b, c) => { if (!any && clfFaceSide([loc(o.geometry, a), loc(o.geometry, b), loc(o.geometry, c)]) !== 0) any = true })
      if (!any) { nSkip++; continue }
      //  ⑵ 재격자(원통·고리·상자 = 같은 면을 규칙 격자로 · 면 이동 ≤ 1mm) — 모르는 기하만 변 세분(대체 경로) → 비색인화(삼각형마다 제 정점 = 안팎 속성이 섞이지 않는다)
      let g = o.geometry
      if (!g.attributes.normal) g.computeVertexNormals()
      const rg = regridPrimitive(g, CLF_SUBDIV)
      if (rg) nRegrid++; else nFallback++
      g = (rg || subdivideLongEdges(g, CLF_SUBDIV)).toNonIndexed()
      const P = g.attributes.position, N = g.attributes.normal, nT = P.count / 3
      const col = new Float32Array(P.count * 3), side = new Float32Array(P.count), triSide = new Int8Array(nT)
      const terms = new Float32Array(P.count * 3)                               // 정점별 원시 항(웅덩이·창·빛기둥) — 튜너가 재합성(재계산 없음)
      const mark = new Float32Array(P.count)                                    // ★232 빛 자국 가중 = 실내 쪽 위 향 바닥(법선 y > 0.9) — 픽셀 보간(가중이라 보간 안전)
      for (let t = 0; t < nT; t++) {
        const W = [loc(g, 3 * t), loc(g, 3 * t + 1), loc(g, 3 * t + 2)]
        const s = clfFaceSide(W) * flip; triSide[t] = s
        const u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], w = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]]
        const wn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
        for (let k = 0; k < 3; k++) {
          const i = 3 * t + k; side[i] = s
          if (s === 0) { col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = 1; continue }
          //  음영 법선 = 정점 법선(곡면의 부드러움 유지)을 **실내 쪽**으로 돌려 쓴다(ZoneI ★219-g 어법)
          nv.fromBufferAttribute(N, i).applyMatrix3(nMat).normalize()
          const want = s * flip
          if ((nv.x * wn[0] + nv.y * wn[1] + nv.z * wn[2]) * want < 0) nv.negate()
          const p = W[k], key = `${Math.round(p[0] * 1e3)},${Math.round(p[1] * 1e3)},${Math.round(p[2] * 1e3)},${Math.round(nv.x * 1e3)},${Math.round(nv.y * 1e3)},${Math.round(nv.z * 1e3)}`
          let T = cache.get(key); if (T === undefined) { T = clfTermsAt(clfClampToVolume(p), [nv.x, nv.y, nv.z], S); cache.set(key, T); nShade++ }   // ★233 공극 안에서 잰다
          terms[3 * i] = T.pool; terms[3 * i + 1] = T.win; terms[3 * i + 2] = T.beam
          col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = clfCompose(T)
          if (nv.y > 0.9) mark[i] = 1
        }
        if (s !== 0) nIn++
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      g.setAttribute('aClf', new THREE.BufferAttribute(side, 1)); g.setAttribute('aClfMark', new THREE.BufferAttribute(mark, 1))
      g.userData.bakedClf = true
      o.geometry = g
      mats.forEach((m) => { m.vertexColors = true; m.defaultAttributeValues = { ...(m.defaultAttributeValues || {}), aClfMark: [0] }; if (o.userData.clfRoofHole) m.defines = { ...(m.defines || {}), CLF_ROOF_HOLE: '' }; chain(m, clfPatch, '|clf' + (o.userData.clfRoofHole ? 'h' : '')); m.needsUpdate = true })
      records.push({ o, triSide, terms, side })
      nMesh++; nTri += nT; nVert += P.count
    }
    if (typeof window !== 'undefined') window.__ethicaClf = { records, spec: S, group: G, nRegrid, nFallback }   // 개발 핸들(프로브·검사가 판정을 대조한다)
    bakeRef.current = records; setBaked(true); seam.current.G = G; seam.current.S = S
    bootPass('CLF', t0)
    console.info(`[CLF] ★226 회랑 명암: 수광 메시 ${nMesh}(재격자 ${nRegrid} · 변 세분 ${nFallback} · 바깥 전용·비표준 ${nSkip}) · 삼각형 ${nTri}(실내 면 ${nIn}) · 정점 ${nVert} · 음영 계산 ${nShade} · ${(bootNow() - t0).toFixed(0)}ms`)
    invalidate()
  })
  //  ★226 개발 튜너(`K` 키 · 개발 서버 전용 · ★221-d LampRootTuner 교훈: 미적 수치는 화면에서 현도가 잡는 게 왕복보다 싸다).
  //   베이크가 정점마다 저장한 원시 항을 clfCompose로 **다시 합치기만** 한다(재계산 0 · 즉시). 값은 [복사]로 constants에 옮긴다.
  useEffect(() => {
    if (!baked || !(import.meta.env && import.meta.env.DEV) || typeof document === 'undefined') return
    const KN = [['FILL', 0, 0.6, 0.01, '채움 — 어느 공급지도 못 보는 면의 밝기(천장 한복판 등)'], ['POOL_K', 0, 3, 0.05, '웅덩이 되쏨 — 등불 주변 벽·계단'],
      ['WIN_K', 0, 1.5, 0.05, '창 — 창 맞은편 안벽(헌장 밖 추가 항)'], ['GAMMA', 0.5, 3, 0.05, '대비 지수(1 = 선형 · 클수록 어두운 쪽이 더 어두워짐)'],
      ['MARK_K', 0, 1, 0.02, '★233 등불 바닥 빛 자국 세기'], ['MARK_POW', 0.5, 6, 0.1, '★233 빛 자국 모양 — 클수록 중심에 모임']]
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:16px;top:16px;z-index:9;background:rgba(20,20,18,.86);color:#eee;font:12px/1.5 monospace;padding:10px 12px;border-radius:8px;display:none;min-width:320px'
    box.innerHTML = '<b>회랑 명암 튜닝 (K 닫기)</b><br><small>즉시 반영 · 값은 [복사] → 붙여 주세요</small><br>'
    const apply = () => {
      for (const r of bakeRef.current || []) { const g = r.o.geometry, C = g.attributes.color, Tm = r.terms, sd = r.side
        for (let i = 0; i < C.count; i++) { if (sd[i] === 0) continue; const v = clfCompose({ pool: Tm[3 * i], win: Tm[3 * i + 1], beam: Tm[3 * i + 2] }); C.setXYZ(i, v, v, v) }
        C.needsUpdate = true }
      POOL_U.uClfPoolK.value = (CLF_TUNE.MARK_K ?? 0) * (1 - CLF_DIM_L); POOL_U.uClfPool.value = clfPoolShape(CLF_TUNE.MARK_POW)   // ★233 빛 자국 즉시
      invalidate() }
    for (const [k, lo, hi, st, tip] of KN) { const row = document.createElement('div'); row.title = tip
      row.innerHTML = `<span style="display:inline-block;width:62px">${k}</span><input type="range" min="${lo}" max="${hi}" step="${st}" value="${CLF_TUNE[k]}" style="width:170px;vertical-align:middle"> <span class="v">${CLF_TUNE[k]}</span>`
      box.appendChild(row); const inp = row.querySelector('input'); inp.oninput = () => { CLF_TUNE[k] = +inp.value; row.querySelector('.v').textContent = inp.value; apply() } }
    const wrow = document.createElement('label'); wrow.innerHTML = `<input type="checkbox" ${CLF_TUNE.WIN_ON ? 'checked' : ''}> 창 항 켜기(끄면 헌장 F행 문자 그대로 = 등불만)`; box.appendChild(wrow)
    wrow.querySelector('input').onchange = (e) => { CLF_TUNE.WIN_ON = e.target.checked; apply() }
    const btn = document.createElement('button'); btn.textContent = '복사(constants 값)'; btn.style.cssText = 'margin-top:6px;display:block'; box.appendChild(btn)
    const out = document.createElement('pre'); out.style.cssText = 'margin:6px 0 0;white-space:pre-wrap;color:#9c9'; box.appendChild(out)
    document.body.appendChild(box)
    const fmt = () => `CLF_FILL=${CLF_TUNE.FILL} CLF_POOL_K=${CLF_TUNE.POOL_K} CLF_WIN_K=${CLF_TUNE.WIN_K} CLF_GAMMA=${CLF_TUNE.GAMMA} CLF_WIN_ON=${CLF_TUNE.WIN_ON} CLF_MARK_K=${CLF_TUNE.MARK_K} CLF_MARK_POW=${CLF_TUNE.MARK_POW}`
    btn.onclick = () => { out.textContent = fmt(); console.info('[CLF tune] ' + fmt()); try { navigator.clipboard.writeText(fmt()) } catch { /* 클립보드 거부 — 화면 값 사용 */ } }
    const key = (ev) => { if (ev.code === 'KeyK' && !ev.repeat) box.style.display = box.style.display === 'none' ? 'block' : 'none' }
    addEventListener('keydown', key)
    return () => { removeEventListener('keydown', key); box.remove() }
  }, [baked])
  return null
}
