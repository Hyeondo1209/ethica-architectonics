// ★★★239 빛 구획 G — 등불 방(1p10) 내부 명암 베이크 (2026.09.24 셋째 대화 · 조명 헌장 Ⅰ G행 · Ⅱ)
//  ⚠수학 정본 = lightingModel.js rm10l*(사본 금지). 여기는 **순회·재격자·안팎 판정 배선·셰이더 게이트**만 — CloisterLight(★226)와 같은 기계.
//  대상 = 장면에서 userData.rm10l 그룹(Dome.jsx LampRoom 전체) 안의 메시 — 단 userData.rm10lSkip 아래(중앙 등불: 관·뿌리 목·갓·빛기둥)는 제외.
//  좌표: 태그 그룹의 역행렬로 **상부 여정 로컬**에 옮긴 뒤 rm10lToRoom으로 방 로컬(원점 = 방 축)에 놓는다(그룹 회전을 손으로 적지 않는다 — ★222 규율).
//  외면 불변: 벽·바닥·천장은 두께 0 **양면 판** → 삼각형마다 실내 쪽(감김 법선 기준 ±1 · 0 = 바깥면)을 aRm10l에 싣고
//   조각 셰이더가 **gl_FrontFacing이 그쪽일 때만** 정점색을 곱한다(F와 같은 게이트).
//  ★G에만 있는 것 — **허공에 뜬 판**(계단 디딤판·입구 층계참): 윗면·밑면이 둘 다 방 공극에 면한다. 정점색은 정점당 하나라 한 삼각형이 두 값을 못 가진다
//   ⇒ 그런 삼각형은 **뒤집은 사본**을 하나 더 짓고(밑면 값) 둘 다 aRm10l = 2로 싣는다: 셰이더가 2인 삼각형의 **뒷면을 버린다**(discard) → 각자 제 앞면만 그린다(겹침 0).
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, invalidate } from '@react-three/fiber'
import { RM10L_ON, RM10L_SUBDIV, CLF_DIM, CLF_ON, RM10L_EPS } from './constants.js'
import { rm10lSpec, rm10lTermsAt, rm10lCompose, rm10lToRoom, rm10lFromRoom, rm10lEvalPoint, RM10L_TUNE, rm10lPoolSpec, clfPoolGLSL, clfPoolShape,
  clfSpec, clfFaceSide, clfTermsAt, clfCompose, clfClampToVolume, faceSideBy, rm10lNearVolume } from './lightingModel.js'   // ★239 ⓙ 이음매: 방 부재가 회랑 공극에 면한 곳 = F 정본으로
import { rm10xFaceSide, xplSpec, XPL_TUNE, xplNearVolume, rm10xTermsAt, rm10xCompose } from './lightingModel.js'   // ★241 빛 구획 X(출구 통로·나팔) — 방 공극 ∪ 통로 공극 한 베이크
import { buildFlareShell } from './exitFlareGeometry.js'   // ★241 나팔 셸 촘촘한 판(같은 면 · 꺾임 보존)
import { subdivideLongEdges } from './ziSubdivide.js'
import { regridPrimitive } from './clfGrid.js'
import { bootNow, bootPass } from './bootProbe.js'
import { lampGlowMaterials } from './lampGlow.js'   // ★239-d 안개 유니폼(튜너)

//  셰이더 게이트 — color_fragment 한 청크(대상이 없으면 throw). ⚠export하지 않는다(react-refresh) — check_lux가 소스 문자열로 배선을 문다
const RM10L_GATE = 'if (vRm10l > 1.5 && !gl_FrontFacing) discard; if (vRm10l * (gl_FrontFacing ? 1.0 : -1.0) > 0.5) { vec3 clfC = vColor.rgb; if (vClfMark > 1e-4) clfC = min(vec3(1.0), clfC + uClfPoolK * clfPool(vClfW) * vClfMark); diffuseColor.rgb *= clfC; }'
const POOL = clfPoolGLSL(rm10lPoolSpec())   // 바닥 빛 자국 — 회랑과 같은 GLSL 함수 · 등불 하나(방 축)
const POOL_U = { uClfPool: { value: POOL.uniforms.uClfPool }, uClfLamps: { value: POOL.uniforms.uClfLamps.map(([x, z]) => new THREE.Vector2(x, z)) }, uClfPoolR: { value: POOL.uniforms.uClfPoolR },
  uClfPoolK: { value: POOL.uniforms.uClfPoolK }, uClfRot: { value: new THREE.Vector2(...POOL.uniforms.uClfRot) } }
const rm10lPatch = (shader) => {
  if (!shader.fragmentShader.includes('#include <color_fragment>')) throw new Error('★239: color_fragment 청크 없음 — 게이트 치환 대상 없음')
  Object.assign(shader.uniforms, POOL_U)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aRm10l; varying float vRm10l; attribute float aRm10lMark; varying float vClfMark; varying vec3 vClfW;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRm10l = aRm10l; vClfMark = aRm10lMark; vClfW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vRm10l;\n' + POOL.decl + '\n' + POOL.fn)
    .replace('#include <color_fragment>', '#ifdef USE_COLOR\n  ' + RM10L_GATE + '\n#endif')
}
const chain = (m, patch, key) => { const prev = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); patch(sh) }; const pk = m.customProgramCacheKey; m.customProgramCacheKey = () => (pk ? pk.call(m) : '') + key }
const skipped = (o, root) => { for (let c = o; c && c !== root; c = c.parent) if (c.userData && c.userData.rm10lSkip) return true; return false }

export function LampRoomLight() {
  const { scene } = useThree()
  const done = useRef(false), frames = useRef(0), watch = useRef(0), bakeRef = useRef(null), seam = useRef({ done: false, frames: 0, G: null, S: null })
  const [baked, setBaked] = useState(false)
  useFrame(() => {
    //  ★239 ⓘ 이음매(F 베이크 뒤 한 번) — **F가 바깥면(triSide 0)으로 둔 회랑 부재 삼각형 중 방 공극에 면한 것**에 G 값을 쓴다.
    //   실측(09.24 프로브): 회랑 바닥판 끝(#697 · φ 47.5~47.7° · y 237.23~238.43)이 방 문 살 너머 원뿔 공기로 물려 있어 그 밑면이 방에서 1.0 흰 면으로 보였다.
    //   F 부재는 이미 비색인(F 베이크) · F 게이트(aClf)를 그대로 쓴다: aClf를 **사본**으로 갈아 끼워 쓴 값(±1)을 싣는다 — F 기록의 side 배열(구 aClf)은 0 그대로라 F 튜너가 덮지 않는다.
    //   G 튜너 합류: 기록 { o, terms, side = 이음매 정점만 ±1 }.
    //  ★241 감시(베이크 뒤 60프레임마다) — 누가 베이크된 geometry를 갈아 끼웠으면(렌더마다 새 geometry를 넘기는 부재 · 현도 09.25 나팔) 경고하고 되돌린다.
    //   원인은 부재 쪽(Dome 인라인 생성)에서 고친다 — 이건 재발을 **보이게** 하는 경보다(조용히 명암이 사라지는 대신 콘솔에 이름이 뜬다).
    if (done.current && bakeRef.current && ++watch.current % 60 === 0) {
      for (const r of bakeRef.current) if (r.geo && r.o.geometry !== r.geo) {
        if (!r.warned) { r.warned = true; console.warn(`[RM10L] ★241 베이크된 geometry가 교체됐다 — ${r.o.name || r.o.type}#${r.o.id} (렌더마다 새 geometry를 넘기는 부재?) · 되돌림`) }
        r.o.geometry = r.geo; invalidate() } }
    const SM = seam.current
    if (done.current && !SM.done && SM.G) {
      if (!CLF_ON) { SM.done = true; return }
      const Zf = typeof window !== 'undefined' ? window.__ethicaClf : null
      if (!Zf || !Zf.records) { if (++SM.frames < 600) return; SM.done = true; console.warn('[RM10L] 이음매 ⓘ: 회랑 베이크 기록이 없다 — 건너뜀'); return }
      SM.done = true
      const inv = new THREE.Matrix4().copy(SM.G.matrixWorld).invert(), Lm = new THREE.Matrix4(), nM = new THREE.Matrix3(), v = new THREE.Vector3(), nv = new THREE.Vector3()
      let nT = 0, nV = 0, nMesh = 0
      //  ★239-e′(현도 09.24 HUD free:92.44,241.1,149.76 "벽면 옆 톱니 무늬가 위로 쭉"): 회랑 끝캡 바깥 문선 조각(cpO #696)의 바깥 면이 방 벽 원통과 교차 —
      //   방 벽이 삼각형을 가로질러 자르면 네 판정점이 전부 벽 밖이라 아무도 안 굽는다(1.0) → G가 구운 이웃(0.17)과 교대 = 톱니(실측 --pix).
      //   ⇒ F 바깥면은 방 공극 **한 격자 칸(RM10L_SUBDIV) 안**의 점까지 방 쪽으로 친다(rm10lNearVolume). F가 구운 면은 무접촉(구판 ⓘ 규칙 그대로).
      //   ⛔★239-e 첫 판(F가 구운 같은 쪽 면 정점 덮기 · 반대쪽 뒤집기)은 톱니와 무관했고 회랑에서 본 문 인방 밑면을 최대 73단계 어둡게 바꿨다(실측) → 되돌림.
      for (const r of Zf.records) { if (r.seam || !r.triSide) continue
        const o = r.o, g = o.geometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, A = g.attributes.aClf; if (!P || !C || !A || g.index) continue
        o.updateWorldMatrix(true, false); Lm.multiplyMatrices(inv, o.matrixWorld); nM.getNormalMatrix(Lm)
        const loc = (i) => rm10lToRoom(v.fromBufferAttribute(P, i).applyMatrix4(Lm).toArray())
        let side2 = null, terms = null, termsT = null, mask = null
        for (let t = 0; t < r.triSide.length; t++) { if (r.triSide[t] !== 0) continue
          const W = [loc(3 * t), loc(3 * t + 1), loc(3 * t + 2)], fs = faceSideBy(W, (q) => rm10lNearVolume(q, RM10L_SUBDIV), RM10L_EPS); if (fs.side === 0) continue
          if (!side2) { side2 = A.array.slice(); terms = new Float32Array(P.count); termsT = new Float32Array(P.count); mask = new Float32Array(P.count) }
          const u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], w = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]]
          const wn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
          for (let j = 0; j < 3; j++) { const i = 3 * t + j
            nv.fromBufferAttribute(N, i).applyMatrix3(nM).normalize(); const nr = rm10lToRoom([nv.x, nv.y, nv.z]), n0 = rm10lToRoom([0, 0, 0]), nl = [nr[0] - n0[0], nr[1], nr[2] - n0[2]]
            if ((nl[0] * wn[0] + nl[1] * wn[1] + nl[2] * wn[2]) * fs.side < 0) { nl[0] = -nl[0]; nl[1] = -nl[1]; nl[2] = -nl[2] }
            const T = rm10lTermsAt(rm10lEvalPoint(W[j], nl), nl, SM.S), val = rm10lCompose(T)   // ★239-c 한 발짝 띄워 잰다
            if (!Number.isFinite(val)) continue
            C.setXYZ(i, val, val, val); side2[i] = fs.side; terms[i] = T.pool; termsT[i] = T.tube; mask[i] = fs.side; nV++ }
          nT++ }
        if (side2) { g.setAttribute('aClf', new THREE.BufferAttribute(side2, 1)); C.needsUpdate = true; nMesh++
          g.userData.rm10lSeam = true; if (bakeRef.current) bakeRef.current.push({ o, terms, termsT, side: mask, seam: true }) }
      }
      //  ⓘ′ F가 **아예 굽지 않은**(실내 면 없음 → 정점색 없음) 회랑 메시 중 방 공극에 면한 것 = G 베이크 그대로(실측: 회랑 밑판 #637 RingGeometry y237.83 끝이 방 원뿔 공기 위에 떠 흰 띠)
      let nX = 0
      if (Zf.group && SM.bakeOne) { const extra = []; Zf.group.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position && !o.geometry.userData.bakedClf && !o.geometry.userData.bakedRm10l) extra.push(o) })
        for (const o of extra) if (SM.bakeOne(o)) nX++ }
      if (typeof window !== 'undefined' && window.__ethicaRm10l) window.__ethicaRm10l.seamI = { nMesh, nT, nV, nX }
      console.info(`[RM10L] ★239 이음매 ⓘ: 회랑 부재 ${nMesh}개 · F 바깥면 중 방 공극에 면한 삼각형 ${nT} · 쓴 정점 ${nV}(★239-e′ 한 칸 여유) · ⓘ′ F 미베이크 회랑 메시 G 베이크 ${nX}`)
      invalidate(); return
    }
    if (!RM10L_ON || done.current) return
    frames.current++
    let G = null
    scene.traverse((o) => { if (!G && o.userData.rm10l) G = o })
    if (!G && frames.current < 60) return
    done.current = true
    if (!G) { console.warn('[RM10L] 등불 방 그룹(userData.rm10l)을 못 찾았다 — 베이크 없음'); return }
    const t0 = bootNow(), S = rm10lSpec(), SF = CLF_ON ? clfSpec() : null   // ★239 ⓙ 회랑 공극에 면한 방 부재 = F 정본
    const tX = bootNow(), SX = xplSpec(), msX = bootNow() - tX   // ★241 통로 발광면·아가리 가시율 표(한 번)
    let flareMap = null, nFlare = 0, nX = 0
    let nSeal = 0, nBlend = 0
    const flareFine = (key) => { if (!flareMap) flareMap = new Map(buildFlareShell({ grid: RM10L_SUBDIV }).map((m) => [m.key, m.geo])); const g0 = flareMap.get(key); return g0 ? g0.clone() : null }
    let nJ = 0
    G.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), Lm = new THREE.Matrix4(), nMat = new THREE.Matrix3()
    const v = new THREE.Vector3(), nv = new THREE.Vector3()
    const meshes = []; G.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position && !skipped(o, G)) meshes.push(o) })
    let nMesh = 0, nSkip = 0, nTri = 0, nIn = 0, nBoth = 0, nVert = 0, nShade = 0, nRegrid = 0, nFallback = 0
    const cache = new Map(), records = []
    //  한 메시 베이크(★239 — 이음매 ⓘ′가 F가 건너뛴 회랑 메시에도 같은 베이크를 건다 · 클로저가 명세·캐시·계수를 공유)
    const bakeOne = (o) => {
      const mats = [].concat(o.material); if (!mats.every((m) => m && m.isMeshStandardMaterial)) { nSkip++; return false }
      o.updateWorldMatrix(true, false); Lm.multiplyMatrices(inv, o.matrixWorld); nMat.getNormalMatrix(Lm)
      const flip = Lm.determinant() < 0 ? -1 : 1
      const locU = (g, i) => v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(Lm).toArray(), loc = (g, i) => rm10lToRoom(locU(g, i))   // 상부 여정 로컬 · 방 로컬
      const eachTri = (g, f) => { const I = g.index, n = I ? I.count : g.attributes.position.count; for (let i = 0; i + 2 < n; i += 3) f(I ? I.getX(i) : i, I ? I.getX(i + 1) : i + 1, I ? I.getX(i + 2) : i + 2) }
      //  ⑴ 원본 삼각형으로 먼저 거른다 — 실내에 면한 삼각형이 없으면 손대지 않는다(출구 통로·나팔 등)
      let any = false
      eachTri(o.geometry, (a, b, c) => { if (!any && (rm10xFaceSide([loc(o.geometry, a), loc(o.geometry, b), loc(o.geometry, c)]).side !== 0 || (SF && clfFaceSide([locU(o.geometry, a), locU(o.geometry, b), locU(o.geometry, c)]) !== 0))) any = true })
      if (!any) { nSkip++; return false }
      //  ⑵ 재격자(원통·원뿔대·고리·상자) — 모르는 기하(천장 CSG)만 변 세분 → 비색인화
      let g = o.geometry
      if (!g.attributes.normal) g.computeVertexNormals()
      //  ★241 나팔 셸(BufferGeometry — 원시 매개 없음) = 같은 부재의 촘촘한 판(exitFlareGeometry.stripFine · 원래 삼각형 위 · 꺾임 보존)
      const fk = g.userData && g.userData.flareKey, rg = fk ? flareFine(fk) : regridPrimitive(g, RM10L_SUBDIV)
      if (rg) nRegrid++; else nFallback++; if (fk && rg) nFlare++
      g = (rg || subdivideLongEdges(g, RM10L_SUBDIV)).toNonIndexed()
      const P0 = g.attributes.position, N0 = g.attributes.normal, nT0 = P0.count / 3
      //  ⑶ 판정 — 양면 판(both)은 뒤집은 사본을 덧붙인다(머리 주석)
      const tri = []                                                            // { t, side, flipCopy }
      for (let t = 0; t < nT0; t++) {
        const W = [loc(g, 3 * t), loc(g, 3 * t + 1), loc(g, 3 * t + 2)], fs = rm10xFaceSide(W)   // ★241 방 ∪ 통로
        if (fk === 'flcap') { const f2 = faceSideBy(W, (q) => xplNearVolume(q), RM10L_EPS)   // ★241-b 곡률 반전점 테두리 봉인
          //  ⛔첫 판은 fs.side === 0인 것만 봤다 — 모서리가 공극에 닿은 삼각형은 일반 가지가 **한쪽만** 구워 틈으로 뒷면(1.0)이 보였다(--pix rm=−1)
          //  ⛔그 전 판은 한쪽만 구웠다 — 테두리는 원호 쪽·나팔 쪽 **양쪽**이 공극에 닿아, 틈으로 보이던 건 굽지 않은 반대쪽 면이었다(--pix: rm=−1 · 앞면 · gate off → 1.0)
          if (f2.side && f2.both) { tri.push({ t, side: 2, copy: false }); tri.push({ t, side: 2, copy: true }); nSeal += 2 } else { tri.push({ t, side: f2.side * flip, copy: false }); if (f2.side) nSeal++ } }
        else if (fs.side !== 0 && fs.both) { tri.push({ t, side: 2, copy: false }); tri.push({ t, side: 2, copy: true }); nBoth++ }
        else if (fs.side === 0 && SF) { const fc = clfFaceSide([locU(g, 3 * t), locU(g, 3 * t + 1), locU(g, 3 * t + 2)]); tri.push({ t, side: fc * flip, copy: false, f: fc !== 0 }); if (fc) nJ++ }   // ★239 ⓙ
        else tri.push({ t, side: fs.side * flip, copy: false })
      }
      const nT = tri.length, pos = new Float32Array(nT * 9), nrm = new Float32Array(nT * 9)
      tri.forEach((q, k) => { for (let j = 0; j < 3; j++) { const src = 3 * q.t + (q.copy ? 2 - j : j)   // 사본 = 감김 반전 + 법선 반전
        for (let c = 0; c < 3; c++) { pos[9 * k + 3 * j + c] = P0.array[3 * src + c]; nrm[9 * k + 3 * j + c] = (q.copy ? -1 : 1) * N0.array[3 * src + c] } } })
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3))
      const P = geo.attributes.position, N = geo.attributes.normal
      const col = new Float32Array(nT * 9), side = new Float32Array(nT * 3), triSide = new Int8Array(nT), terms = new Float32Array(nT * 3), termsT = new Float32Array(nT * 3), mark = new Float32Array(nT * 3), fromF = new Uint8Array(nT * 3)
      const xz = new Float32Array(nT * 3), xW = new Float32Array(nT * 3), xM = new Float32Array(nT * 3), xD = new Float32Array(nT * 3)   // ★241 통로 정점(1) · 슬릿·아가리·문 원시 항
      for (let k = 0; k < nT; k++) {
        const s = tri[k].side; triSide[k] = s
        const W = [loc(geo, 3 * k), loc(geo, 3 * k + 1), loc(geo, 3 * k + 2)]
        const u = [W[1][0] - W[0][0], W[1][1] - W[0][1], W[1][2] - W[0][2]], w = [W[2][0] - W[0][0], W[2][1] - W[0][1], W[2][2] - W[0][2]]
        const wn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
        const want = Math.sign(s) * flip                                         // 실내 쪽 = 감김 법선 × want(F와 같은 식 · 2 = 그 삼각형의 앞면 쪽)
        for (let j = 0; j < 3; j++) {
          const i = 3 * k + j; side[i] = s
          if (s === 0) { col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = 1; continue }
          //  음영 법선 = 정점 법선(곡면 부드러움)을 실내 쪽으로 · 방 로컬로 회전(방 그룹 회전은 y축 — 법선도 같은 식)
          nv.fromBufferAttribute(N, i).applyMatrix3(nMat).normalize()
          const nr = rm10lToRoom([nv.x, nv.y, nv.z]), n0 = rm10lToRoom([0, 0, 0]), nl = [nr[0] - n0[0], nr[1], nr[2] - n0[2]]   // 아핀의 차 = 회전만
          if ((nl[0] * wn[0] + nl[1] * wn[1] + nl[2] * wn[2]) * want < 0) { nl[0] = -nl[0]; nl[1] = -nl[1]; nl[2] = -nl[2] }
          if (tri[k].f) {                                                         // ★239 ⓙ 회랑 공극 쪽 = F 정본(상부 여정 로컬) · G 튜너는 건너뛴다(fromF)
            const pu = rm10lFromRoom(W[j]), nu0 = rm10lFromRoom([0, 0, 0]), nu1 = rm10lFromRoom(nl), nu = [nu1[0] - nu0[0], nu1[1], nu1[2] - nu0[2]]
            const val = clfCompose(clfTermsAt(clfClampToVolume(pu), nu, SF)); col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = val; fromF[i] = 1; continue }
          const p = W[j], key = `${Math.round(p[0] * 1e3)},${Math.round(p[1] * 1e3)},${Math.round(p[2] * 1e3)},${Math.round(nl[0] * 1e3)},${Math.round(nl[1] * 1e3)},${Math.round(nl[2] * 1e3)}`
          //  ★241 평가점 = 한 발짝 띄운 점이 든 공극(방 = G 항 · 통로 = X 항) · 둘 다 밖이면 가까운 공극으로 물림(★239-c 어법 확장)
          //  ★241-a 문 띠 안이면 G·X 둘 다 재서 섞는다(무게 w = X 몫) · 띠 밖은 평가점 구역 그대로(w = 0 또는 1)
          let T = cache.get(key); if (T === undefined) { T = rm10xTermsAt(p, nl, S, SX); cache.set(key, T); nShade++; if (T.w > 0) nX++; if (T.w > 0 && T.w < 1) nBlend++ }   // ★239-c 한 발짝 · ★241-a 문 섞기(정본 = lightingModel)
          xz[i] = T.w; xW[i] = T.win; xM[i] = T.mouth; xD[i] = T.door; terms[i] = T.pool; termsT[i] = T.tube
          col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = rm10xCompose(T)
          if (T.w >= 1) continue                                                  // 통로엔 등불 빛 자국 없음(mark 0)
          if (nl[1] > 0.9) mark[i] = 1                                           // 바닥 빛 자국 가중(위 향 실내 면)
        }
        if (s !== 0) nIn++
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      geo.setAttribute('aRm10l', new THREE.BufferAttribute(side, 1)); geo.setAttribute('aRm10lMark', new THREE.BufferAttribute(mark, 1))
      geo.userData.bakedRm10l = true
      o.geometry = geo
      mats.forEach((m) => { m.vertexColors = true; m.defaultAttributeValues = { ...(m.defaultAttributeValues || {}), aRm10lMark: [0] }; chain(m, rm10lPatch, '|rm10l'); m.needsUpdate = true })
      records.push({ o, geo, triSide, terms, termsT, side, fromF, xz, xW, xM, xD })
      nMesh++; nTri += nT; nVert += P.count
      return true
    }
    for (const o of meshes) bakeOne(o)
    if (typeof window !== 'undefined') window.__ethicaRm10l = { records, spec: S, specX: SX, group: G, nRegrid, nFallback, nBoth, nJ, nFlare, nX }   // 개발 핸들(프로브·검사)
    bakeRef.current = records; setBaked(true); seam.current.G = G; seam.current.S = S; seam.current.bakeOne = bakeOne
    bootPass('RM10L', t0)
    console.info(`[RM10L] ★239 등불 방 명암: 수광 메시 ${nMesh}(재격자 ${nRegrid} · 변 세분 ${nFallback} · 바깥 전용·비표준 ${nSkip}) · 삼각형 ${nTri}(실내 면 ${nIn} · 양면 판 사본 ${nBoth} · ⓙ 회랑 쪽 ${nJ}) · 정점 ${nVert} · 음영 계산 ${nShade} · ${(bootNow() - t0).toFixed(0)}ms`)
    console.info(`[XPL] ★241 출구 통로·나팔 명암: 나팔 촘촘한 판 ${nFlare} · 통로 음영 계산 ${nX}(문 이음매 섞기 ${nBlend}) · 테두리 봉인 삼각형 ${nSeal} · 명세(가시율 표) ${msX.toFixed(0)}ms`)
    invalidate()
  })
  //  개발 튜너(`J` 키 · 개발 서버 전용 — F의 `K` 튜너와 같은 형): 정점마다 저장한 원시 항을 rm10lCompose로 다시 합치기만 한다(재계산 0 · 즉시).
  useEffect(() => {
    if (!baked || !(import.meta.env && import.meta.env.DEV) || typeof document === 'undefined') return
    const KN = [['FILL', 0, 0.6, 0.01, '채움 — 웅덩이를 못 보는 면의 밝기(위쪽 원통·천장)'], ['POOL_K', 0, 12, 0.1, '웅덩이 되쏨 — 1 = 회랑 등불과 같은 물리(같은 등불)'], ['TUBE_K', 0, 2, 0.01, '★239-b 관 옆면 발광 — 원기둥 벽(관 중간 높이)의 관 몫'],
      ['GAMMA', 0.5, 3, 0.05, '대비 지수(1 = 선형)'], ['MARK_K', 0, 1, 0.02, '바닥 빛 자국 세기'], ['GLOW_OP', 0, 0.8, 0.01, '★239-d 기둥 빛 안개 세기'], ['GLOW_W', 0, 5, 0.05, '★239-d 안개 두께(m)'], ['GLOW_POW', 0.5, 8, 0.1, '★239-d 안개 실루엣 지수 — 클수록 기둥 가까이 모임'], ['MARK_POW', 0.5, 6, 0.1, '빛 자국 모양 — 클수록 중심에 모임'],
      ['X_FILL', 0, 0.6, 0.01, '★241 통로 채움 — 어느 공급지도 못 보는 면(어두운 원호)'], ['X_SKY_K', 0, 3, 0.01, '★241 슬릿·아가리 세기 — 슬릿 #0 맞은편 벽 눈높이의 몫'], ['X_DOOR_K', 0, 2, 0.01, '★241 방 쪽 문(약한 공급지) — 문 맞은편 바깥벽의 몫']]
    const TGT = (k) => (k.startsWith('X_') ? [XPL_TUNE, k.slice(2)] : [RM10L_TUNE, k])   // ★241 통로 노브는 XPL_TUNE에
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:16px;top:16px;z-index:9;background:rgba(20,20,18,.86);color:#eee;font:12px/1.5 monospace;padding:10px 12px;border-radius:8px;display:none;min-width:320px'
    box.innerHTML = '<b>등불 방 명암 튜닝 (J 닫기)</b><br><small>즉시 반영 · 값은 [복사] → 붙여 주세요</small><br>'
    const apply = () => {
      for (const r of bakeRef.current || []) { const C = r.o.geometry.attributes.color, Tm = r.terms, sd = r.side
        for (let i = 0; i < C.count; i++) { if (sd[i] === 0 || (r.fromF && r.fromF[i])) continue
          const val = rm10xCompose({ w: r.xz ? r.xz[i] : 0, pool: Tm[i], tube: r.termsT ? r.termsT[i] : 0, win: r.xW ? r.xW[i] : 0, mouth: r.xM ? r.xM[i] : 0, door: r.xD ? r.xD[i] : 0 }); C.setXYZ(i, val, val, val) }
        C.needsUpdate = true }
      POOL_U.uClfPoolK.value = (RM10L_TUNE.MARK_K ?? 0) * (1 - CLF_DIM); POOL_U.uClfPool.value = clfPoolShape(RM10L_TUNE.MARK_POW)
      for (const gm of lampGlowMaterials()) { gm.uniforms.uOpacity.value = RM10L_TUNE.GLOW_OP; gm.uniforms.uW.value = RM10L_TUNE.GLOW_W; gm.uniforms.uEdgePow.value = RM10L_TUNE.GLOW_POW }   // ★239-d 즉시
      invalidate() }
    for (const [k, lo, hi, st, tip] of KN) { const row = document.createElement('div'); row.title = tip
      const [tg, tk] = TGT(k)
      row.innerHTML = `<span style="display:inline-block;width:62px">${k}</span><input type="range" min="${lo}" max="${hi}" step="${st}" value="${tg[tk]}" style="width:170px;vertical-align:middle"> <span class="v">${tg[tk]}</span>`
      box.appendChild(row); const inp = row.querySelector('input'); inp.oninput = () => { tg[tk] = +inp.value; row.querySelector('.v').textContent = inp.value; apply() } }
    const btn = document.createElement('button'); btn.textContent = '복사(constants 값)'; btn.style.cssText = 'margin-top:6px;display:block'; box.appendChild(btn)
    const out = document.createElement('pre'); out.style.cssText = 'margin:6px 0 0;white-space:pre-wrap;color:#9c9'; box.appendChild(out)
    document.body.appendChild(box)
    const fmt = () => `RM10L_FILL=${RM10L_TUNE.FILL} RM10L_POOL_K=${RM10L_TUNE.POOL_K} RM10L_TUBE_K=${RM10L_TUNE.TUBE_K} RM10L_GAMMA=${RM10L_TUNE.GAMMA} RM10L_MARK_K=${RM10L_TUNE.MARK_K} RM10L_MARK_POW=${RM10L_TUNE.MARK_POW} RM10L_GLOW_OP=${RM10L_TUNE.GLOW_OP} RM10L_GLOW_W=${RM10L_TUNE.GLOW_W} RM10L_GLOW_POW=${RM10L_TUNE.GLOW_POW} XPL_FILL=${XPL_TUNE.FILL} XPL_SKY_K=${XPL_TUNE.SKY_K} XPL_DOOR_K=${XPL_TUNE.DOOR_K}`
    btn.onclick = () => { out.textContent = fmt(); console.info('[RM10L tune] ' + fmt()); try { navigator.clipboard.writeText(fmt()) } catch { /* 클립보드 거부 — 화면 값 사용 */ } }
    const key = (ev) => { if (ev.code === 'KeyJ' && !ev.repeat) box.style.display = box.style.display === 'none' ? 'block' : 'none' }
    addEventListener('keydown', key)
    return () => { removeEventListener('keydown', key); box.remove() }
  }, [baked])
  return null
}
