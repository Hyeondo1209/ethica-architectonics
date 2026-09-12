// ★219 _probe_zoneI.mjs — 구역 I(자립 나선 ~ 전실) 착수 전 실측 스윕 (개발 도구 — 배포·번들 무관)
//  ★218 ⓪ᵂ⁵ ⑶: "전 구간 관 속 스윕(Ⅵ의 끊김 실측 — 짐작 금지)". 무엇을 재나:
//   ⓐ 장면을 실제 THREE 객체로 조립(★217 _probe_bake와 같은 대역)하고 베이크 프레임을 돌린 뒤,
//      구역 I 후보 부재(목적지 리브 #+2 · RibStair 판/기둥 · KneeWalk · RibJunction · Lookout · RevealPassage)의
//      메시 경로·정점 수·태그·재질·정점색 유무·정점색 값 분포(리브 관 속 대역)를 낸다.
//   ⓑ 목적지 리브 축을 따라 y 166→300(0.5 간격) × 축거리 {0, 2.9, 5.7}에서 D 규칙 셋 —
//      friezeLightInBore(★215-f 관 속 = 1) · dskirtInterior(정점 판정) · friezeRoomIn — 과 조각 게이트(dsk 모드 1 위치 판정 =
//      지붕 높이맵 아래인가)를 같은 식으로 재현해 "어디서 1.0 칠이 시작·끊기나"를 표로 낸다.
//  사용: node src/_probe_zoneI.mjs            (스윕 표 + 부재 표)
//        node src/_probe_zoneI.mjs --report   (직전 실행 결과만 다시)
//        node src/_probe_zoneI.mjs --eye      ★219-p 무릎길 눈-가시성 실측(_probe_zoneI_eye.mjs — 베이크의 rayFn·records를 그대로 씀 · 눈 경로 자기검사 Ⓔ0 포함)
//        node src/_probe_zoneI.mjs --verify   ★219-h 전수 대조(구역 I 전 삼각형 안팎 판정↔구운 값 · _probe_zoneI_verify.mjs) — 불일치가 있으면 종료 코드 1
//                                              (check_lux [520]·[521]이 못 박은 한계의 반쪽 = 장면 있는 검사. 조립 뒤 베이크가 남긴 records·rayFn을 그대로 쓴다)
import { execSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ARGS = process.argv.slice(2)
const REPORT = ARGS.includes('--report'), VERIFY = ARGS.includes('--verify'), EYEP = ARGS.includes('--eye')
const LOOK = (ARGS.find((a) => a.startsWith('--look=')) || '').slice(7)   // ★219-q --look=x,y,z,yawDeg,pitchDeg — HUD 자세에서 화면 격자 광선 → 명중 메시·정점색(어느 메시가 화면의 무엇인지 확정)
const RESULT = join(tmpdir(), 'ethica_zoneI_last.json')
const dir = mkdtempSync(join(tmpdir(), 'ethica-zi-'))
const bdir = join(process.cwd(), '.tmp_probe_zoneI'); mkdirSync(bdir, { recursive: true })
process.on('exit', () => { try { rmSync(bdir, { recursive: true, force: true }) } catch {} })

writeFileSync(join(dir, 'react.mjs'), `
export const useMemo = (f) => f()
export const useRef = (v = null) => ({ current: v })
export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}]
export const useEffect = (f) => { globalThis.__effects.push({ comp: globalThis.__comp, f }) }
export const useLayoutEffect = (f) => { globalThis.__layout.push({ comp: globalThis.__comp, f }) }
export const useCallback = (f) => f
export const useContext = () => ({})
export const createContext = () => ({ Provider: () => null })
export const forwardRef = (f) => f
export const memo = (f) => f
export const StrictMode = 'StrictMode'
export const Fragment = 'Fragment'
export const createElement = (t, p, ...c) => ({ __el: t, props: { ...p, children: c } })
export default { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, useContext, createContext, forwardRef, memo, Fragment, StrictMode, createElement }
`)
writeFileSync(join(dir, 'jsx-runtime.mjs'), `
export const Fragment = 'Fragment'
export const jsx = (t, p, k) => ({ __el: t, props: p, key: k })
export const jsxs = jsx
export const jsxDEV = jsx
`)
writeFileSync(join(dir, 'fiber.mjs'), `
export const useFrame = (cb) => { globalThis.__frames.push({ comp: globalThis.__comp, cb }) }
export const useThree = () => globalThis.__three
export const useLoader = () => ({})
export const extend = () => {}
export const Canvas = (p) => ({ __el: '__canvas', props: { children: p.children } })
export const invalidate = () => {}
`)
const out = join(bdir, 'App.mjs'), outL = join(bdir, 'lm.mjs'), outC = join(bdir, 'c.mjs')
if (!REPORT) {
  const common = ` --format=esm --loader:.jsx=jsx --jsx=automatic --alias:react=${join(dir, 'react.mjs')} --alias:react/jsx-runtime=${join(dir, 'jsx-runtime.mjs')} --alias:@react-three/fiber=${join(dir, 'fiber.mjs')} --external:three --external:three-bvh-csg --external:three-mesh-bvh --log-level=silent`
  execSync(`npx esbuild src/App.jsx --bundle --outfile=${out}` + common, { stdio: 'pipe' })
}
const runner = join(bdir, 'run.mjs')
writeFileSync(runner, `
import * as THREE from 'three'
import * as LM from '${join(process.cwd(), 'src/lightingModel.js')}'
import * as K from '${join(process.cwd(), 'src/constants.js')}'
const ctx2d = new Proxy({}, { get: (_, k) =>
  k === 'measureText' ? (() => ({ width: 10 }))
  : k === 'createLinearGradient' || k === 'createRadialGradient' ? (() => ({ addColorStop() {} }))
  : k === 'getImageData' ? (() => ({ data: new Uint8ClampedArray(4) }))
  : k === 'canvas' ? { width: 1, height: 1 }
  : (() => {}) })
const noop = () => {}
globalThis.document = { createElement: (t) => t === 'canvas'
  ? { width: 0, height: 0, getContext: () => ctx2d, toDataURL: () => '' }
  : { style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop, removeEventListener: noop },
  body: { appendChild: noop, style: {} }, getElementById: () => null, addEventListener: noop, removeEventListener: noop, pointerLockElement: null, exitPointerLock: noop }
globalThis.window = { devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, __ethicaT0: performance.now(), location: { search: '' } }
globalThis.CustomEvent = class { constructor(t, d) { this.type = t; this.detail = d && d.detail } }
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(performance.now()), 0)
const logs = []; const keep = (a) => { const l = a.join(' '); if (/\\[(BAKE|DSK|ROOM|ACH|ethica|ZI)/.test(l)) logs.push(l) }
console.info = (...a) => keep(a); console.log = (...a) => keep(a)
globalThis.__effects = []; globalThis.__layout = []; globalThis.__frames = []; globalThis.__comp = null
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 3000); camera.position.set(0, 1.6, 0)
const gl = { domElement: { addEventListener: noop, removeEventListener: noop, requestPointerLock: noop, style: {}, clientWidth: 1280, clientHeight: 720 }, setPixelRatio: noop, setSize: noop, shadowMap: {}, info: { render: {} }, render: noop, capabilities: { getMaxAnisotropy: () => 1 } }
globalThis.__three = { scene, camera, gl, size: { width: 1280, height: 720 }, invalidate: noop, clock: new THREE.Clock(), get: () => globalThis.__three }
const texReg = []
{ const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate')
  Object.defineProperty(THREE.DataTexture.prototype, 'needsUpdate', { set(v) { if (!texReg.includes(this)) texReg.push(this); d.set.call(this, v) }, get: d.get, configurable: true }) }
const M = await import('${out}')
const applyVec = (tgt, v) => { if (Array.isArray(v)) tgt.set(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0); else if (typeof v === 'number') tgt.setScalar(v); else if (v && v.isVector3) tgt.copy(v); else if (v && v.isEuler) tgt.copy(v) }
const SKIP = new Set(['children', 'key', 'ref', 'args', 'attach', 'dispose', 'onClick', 'onPointerOver', 'onPointerOut'])
const setRef = (r, o) => { if (!r) return; if (typeof r === 'function') r(o); else r.current = o }
const applyObjProps = (o, p) => { for (const [k, v] of Object.entries(p)) { if (SKIP.has(k) || v === undefined) continue
  if (k === 'position') applyVec(o.position, v); else if (k === 'rotation') applyVec(o.rotation, v); else if (k === 'scale') applyVec(o.scale, v)
  else if (k.startsWith('position-') || k.startsWith('rotation-') || k.startsWith('scale-')) { const [a, ax] = k.split('-'); o[a][ax] = v }
  else if (k === 'userData') Object.assign(o.userData, v); else if (k === 'geometry' || k === 'material') o[k] = v
  else if (k in o) { try { o[k] = v } catch {} } } }
const matProps = (p) => { const q = {}; for (const [k, v] of Object.entries(p)) if (!SKIP.has(k) && v !== undefined && !k.includes('-')) q[k] = v; return q }
const isGeoEl = (t) => /Geometry$/.test(t), isMatEl = (t) => /Material$/.test(t)
const cls = (t) => t[0].toUpperCase() + t.slice(1)
const errs = []
const build = (node, parent) => {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const c of node) build(c, parent); return }
  const t = node.__el, p = node.props || {}
  if (typeof t === 'function') { const name = t.name || '(anon)', prev = globalThis.__comp; globalThis.__comp = name
    let o = null; try { o = t(p) } catch (e) { errs.push(name + ': ' + (e && e.message)) }
    build(o, parent); globalThis.__comp = prev; return }   // ★자식 조립까지 컴포넌트 이름 유지(메시에 새기려고)
  if (t === 'Fragment' || t === 'StrictMode' || t === '__canvas' || t === undefined) { build(p.children, parent); return }
  if (typeof t !== 'string') return
  if (t === 'div' || t === 'span' || t === 'b' || t === 'br' || t === 'button' || t === 'kbd') return
  if (t === 'primitive') { const ob = p.object; if (!ob) return
    if (p.attach === 'geometry') parent.geometry = ob; else if (p.attach === 'material') parent.material = ob
    else { parent.add(ob); applyObjProps(ob, p); setRef(p.ref, ob); build(p.children, ob) } return }
  if (t === 'color') { if (p.attach === 'background') scene.background = new THREE.Color(...(p.args || [])); return }
  if (t === 'fog') { scene.fog = new THREE.Fog(...(p.args || [])); return }
  if (isGeoEl(t)) { const C = THREE[cls(t)]; if (!C) { errs.push('기하 없음 ' + t); return } const g = new C(...(p.args || [])); parent.geometry = g; setRef(p.ref, g); return }
  if (isMatEl(t)) { const C = THREE[cls(t)]; if (!C) { errs.push('재질 없음 ' + t); return } const m = new C(matProps(p)); if (p.onBeforeCompile) m.onBeforeCompile = p.onBeforeCompile; parent.material = m; setRef(p.ref, m); return }
  let o
  if (t === 'mesh') o = new THREE.Mesh(); else if (t === 'instancedMesh') { const [g, m, n] = p.args || []; o = new THREE.InstancedMesh(g, m, n) }
  else if (t === 'group') o = new THREE.Group(); else if (t === 'sprite') o = new THREE.Sprite()
  else { const C = THREE[cls(t)]; if (!C) { errs.push('요소 없음 ' + t); return } try { o = new C(...(p.args || [])) } catch (e) { errs.push(t + ': ' + e.message); return } }
  applyObjProps(o, p); parent.add(o); setRef(p.ref, o); build(p.children, o)
}
//  ★조립 중 컴포넌트 이름을 메시에 새긴다(어느 컴포넌트가 만든 메시인지 — 부재 표의 열)
const origAdd = THREE.Object3D.prototype.add
THREE.Object3D.prototype.add = function (...a) { for (const o of a) if (o && !o.userData.__comp) o.userData.__comp = globalThis.__comp; return origAdd.apply(this, a) }
build({ __el: M.default, props: {} }, scene)
const runFx = (list, label) => { for (const e of list) { try { e.f() } catch (err) { errs.push(label + ' ' + e.comp + ': ' + (err && err.message)) } } }
runFx(globalThis.__layout, 'layoutEffect'); runFx(globalThis.__effects, 'effect')
const F = globalThis.__frames
for (let fr = 0; fr < 130; fr++) for (let i = 0; i < F.length; i++) { try { F[i].cb(globalThis.__three, 1 / 60) } catch (e) { errs.push('frame ' + F[i].comp + ': ' + (e && e.message)) } }
scene.updateMatrixWorld(true)
process.stderr.write('  조립+프레임 끝 · 오류 ' + errs.length + '\\n')

// ── ⓐ 구역 I 후보 부재 표 ──
const pathOf = (o) => { const ps = []; let c = o; while (c && c !== scene) { const idx = c.parent ? c.parent.children.indexOf(c) : -1; ps.unshift((c.name || c.type) + '[' + idx + ']'); c = c.parent } return ps.join('/') }
const WANT = new Set(['HallDoorRibs', 'RibStair', 'KneeWalk', 'RibJunction', 'Lookout', 'RevealPassage', 'LandingDisc', 'MouthWall', 'PzCheek', 'LightShaft', 'BoredBox'])
const PHI = K.RIB_DEST_PHI, RIN = K.SHELL_RIB_R - K.RIB_WALL_T
const axisOf = (y) => { const r = K.rOf(y / K.H); return [r * Math.cos(PHI), y, r * Math.sin(PHI)] }
const axDist = (p) => { const a = axisOf(p[1]); return Math.hypot(p[0] - a[0], p[2] - a[2]) }
const FRB = LM.friezeRoomBox(), ceilAt = (x) => LM.friezeRoomCeil(x, FRB)
const members = [], darkFaces = []
const v = new THREE.Vector3(), im = new THREE.Matrix4()
scene.traverse((o) => {
  if (!o.isMesh) return
  const comp = o.userData.__comp || '?'
  if (!WANT.has(comp)) return
  const g = o.geometry, P = g && g.attributes.position, C = g && g.attributes.color
  const mats = [].concat(o.material).filter(Boolean)
  const row = { comp, path: pathOf(o), inst: !!o.isInstancedMesh, count: o.isInstancedMesh ? o.count : 0, verts: P ? P.count : 0, tris: g ? (g.index ? g.index.count / 3 : (P ? P.count / 3 : 0)) : 0,
    tags: Object.keys(o.userData).filter((k) => k !== '__comp' && o.userData[k] === true).join(','), mat: mats.map((m) => m.type + (m.vertexColors ? '·V' : '') + (m.customProgramCacheKey ? m.customProgramCacheKey() : '')).join('|'),
    hasColor: !!C, instColor: !!(o.isInstancedMesh && o.instanceColor) }
  //  구역 I 대역(관 속 · 방 천장 위) 정점 수와 그 정점색 분포
  if (P) { let nBore = 0, nAbove = 0, hist = {}, yMin = 1e9, yMax = -1e9
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const p = [v.x, v.y, v.z]; yMin = Math.min(yMin, p[1]); yMax = Math.max(yMax, p[1])
      if (axDist(p) <= RIN + 0.3 && p[1] >= 166) { nBore++; if (p[1] > ceilAt(p[0])) { nAbove++; if (C) { const k = C.getX(i).toFixed(2); hist[k] = (hist[k] || 0) + 1 } } } }
    let zh = {}, zmin = 9, zmax = -9; if (C && o.userData.__comp !== 'HallDoorRibs') for (let i = 0; i < C.count; i++) { const c = C.getX(i); zmin = Math.min(zmin, c); zmax = Math.max(zmax, c); const k = (Math.round(c * 10) / 10).toFixed(1); zh[k] = (zh[k] || 0) + 1 }
    const aZi = g.attributes.aZi; let nZi = 0; if (aZi) for (let i = 0; i < aZi.count; i++) if (aZi.getX(i) > 0.5) nZi++
    row.own = [g.userData.bakedZi ? 'ZI' : '', g.userData.bakedDsk ? 'DSK' : '', g.userData.dskOwner ? 'own' : ''].filter(Boolean).join('+') || '-'
    Object.assign(row, { yMin: +yMin.toFixed(1), yMax: +yMax.toFixed(1), nBore, nAbove, hist, zh, zmin: +zmin.toFixed(3), zmax: +zmax.toFixed(3), nZi })
  }
  if (o.isInstancedMesh) { const c = new THREE.Color(); let nAbove = 0, hist = {}, yMin = 1e9, yMax = -1e9
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); v.setFromMatrixPosition(im).applyMatrix4(o.matrixWorld); const p = [v.x, v.y, v.z]; yMin = Math.min(yMin, p[1]); yMax = Math.max(yMax, p[1])
      if (p[1] > ceilAt(p[0]) && axDist(p) <= RIN + 0.3) { nAbove++; if (o.instanceColor) { o.getColorAt(i, c); const k = c.r.toFixed(2); hist[k] = (hist[k] || 0) + 1 } } }
    Object.assign(row, { yMin: +yMin.toFixed(1), yMax: +yMax.toFixed(1), nAbove, hist }) }
  //  ★219-f 큰 검은 **면** 특정 — 세 정점이 다 어둡고(≤0.15) 면적이 큰 삼각형(현도 화면 x169.9 y254 z10.7)
  if (P && C) { const cam2 = new THREE.Vector3(169.92, 253.95, 10.66), a3 = new THREE.Vector3(), b3 = new THREE.Vector3(), c3 = new THREE.Vector3()
    const II = g.index, nn = II ? II.count : P.count
    for (let i = 0; i + 2 < nn; i += 3) { const ids = [0, 1, 2].map((k) => (II ? II.getX(i + k) : i + k))
      if (!ids.every((id) => C.getX(id) <= 0.15)) continue
      a3.fromBufferAttribute(P, ids[0]).applyMatrix4(o.matrixWorld); b3.fromBufferAttribute(P, ids[1]).applyMatrix4(o.matrixWorld); c3.fromBufferAttribute(P, ids[2]).applyMatrix4(o.matrixWorld)
      const ar = b3.clone().sub(a3).cross(c3.clone().sub(a3)).length() / 2
      if (ar < 4) continue
      const ctr = a3.clone().add(b3).add(c3).multiplyScalar(1 / 3)
      const nrm = b3.clone().sub(a3).cross(c3.clone().sub(a3)).normalize()
      darkFaces.push({ comp: o.userData.__comp || '?', ar: +ar.toFixed(1), d: +ctr.distanceTo(cam2).toFixed(1), c: ctr.toArray().map((x) => +x.toFixed(1)), n: nrm.toArray().map((x) => +x.toFixed(2)), col: +C.getX(ids[0]).toFixed(3), path: pathOf(o) }) } }
  //  ★219-e 현도 화면(x151.8 y262.3 z9.8)에서 검게 보이는 메시 특정 — 어두운 정점(≤0.1)이 있는 메시의 세계 bbox·최근접 거리
  if (row.zmin !== undefined && row.zmin <= 0.1 && P) { const bb = new THREE.Box3()
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); bb.expandByPoint(v) }
    const cam = new THREE.Vector3(151.79, 262.34, 9.77)
    row.bbox = [bb.min.toArray().map((x) => +x.toFixed(1)), bb.max.toArray().map((x) => +x.toFixed(1))]
    row.dist = +bb.distanceToPoint(cam).toFixed(1)
    let nDark = 0; if (C) for (let i = 0; i < C.count; i++) if (C.getX(i) <= 0.1) nDark++
    row.nDark = nDark }
  members.push(row)
})

// ── ⓑ 축 스윕: 목적지 리브 축을 따라 y × 축거리 ──
const spec = LM.friezeLightBake()?.spec, D = LM.dskirtSpec()
const roof = texReg[0]   // DSK 지붕 높이맵(RN × RM · R32F)
const dskFragIn = (p) => {   // Corridor.jsx dskPatchFor 모드 1과 같은 판정(높이맵 = 최근접 텍셀 · 셰이더는 선형이라 경계 ±1텍셀 차이 가능)
  if (!roof) return null
  const e = K.DSK_FRAG_E ?? 1e-3, cx = K.COR_CX, dx = p[0] - cx, dz = p[2], r = Math.hypot(dx, dz)
  if (FRB.on && p[0] >= FRB.x0 - e && p[0] <= FRB.x1 + e && Math.abs(p[2]) <= FRB.zh + e && p[1] >= FRB.y0 - e && p[1] <= ceilAt(p[0]) + e) return 'fr'   // 프리즈 방 상자 = 안
  if (r <= D.slit.R + e) return p[1] <= D.slit.y1 + e
  if (p[1] < -e) return Math.hypot(r, p[1]) <= K.C_CUP + e
  if (r > K.COR_R + e) return false
  const RN = roof.image.width, RM = roof.image.height
  const u = Math.atan2(dz, dx) / (2 * Math.PI) + 0.5, vv = r / K.COR_R
  const i = Math.min(RN - 1, Math.max(0, Math.floor(u * RN))), j = Math.min(RM - 1, Math.max(0, Math.floor(vv * RM)))
  return p[1] <= roof.image.data[j * RN + i] + e
}
const sweep = []
for (let y = 166; y <= 300; y += 0.5) for (const rr of [0, 2.9, 5.7]) {
  const a = axisOf(y), p = [a[0] + rr, y, a[2]]
  sweep.push({ y, rr, x: +p[0].toFixed(2), z: +p[2].toFixed(2), ceil: +ceilAt(p[0]).toFixed(2),
    inBore: spec ? LM.friezeLightInBore(p, spec) : null, dskIn: D ? LM.dskirtInterior(p, D) : null, frIn: LM.friezeRoomIn(p), frag: dskFragIn(p) })
}
const wp = ['freevice', 'mouth', 'panel', 'kneewalk', 'junction', 'lookout', 'ante']
let wps = []
try { const W = await import('${join(process.cwd(), 'src/waypoints.js')}'); const list = (W.WAYPOINTS || W.default || W.waypoints || []); for (const w of list) if (wp.includes(w.id)) wps.push({ id: w.id, x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2), ax: +axDist([w.x, w.y, w.z]).toFixed(2), ceil: +ceilAt(w.x).toFixed(2), inBore: spec ? LM.friezeLightInBore([w.x, w.y, w.z], spec) : null, dskIn: D ? LM.dskirtInterior([w.x, w.y, w.z], D) : null, frag: dskFragIn([w.x, w.y, w.z]) }) } catch (e) { errs.push('waypoints: ' + e.message) }
import { writeFileSync as WF } from 'fs'
if (globalThis.window.__ethicaZi) { WF('/tmp/zi_soup.bin', Buffer.from(globalThis.window.__ethicaZi.soup.buffer)); WF('/tmp/zi_kinds.json', JSON.stringify(globalThis.window.__ethicaZi.kinds)) }
//  ★219-h 전수 대조 — 베이크가 남긴 삼각형별 판정(records)과 정점색을 같은 광선 함수로 대조
let verify = null
//  ★219-m Ⓓ 리브 관 안면(전망 판 위) — 기하로 고른 안면 후보(축거리 ≤ rIn+wallT/2 · 접선 아님 · 정점 하나라도 y>판) 중 aZi 미분류 또는 어두운 정점 = 0. records(부재)에 리브가 없어 ★219-m 병(27장 273㎡)을 못 잡던 구멍.
let ribV = null
{ let rib = null; scene.traverse(function (o) { if (o.isMesh && o.userData.ziRib) rib = o })
  if (rib) { const g = rib.geometry, P = g.attributes.position, C = g.attributes.color, Zi = g.attributes.aZi, I = g.index, nn = I ? I.count : P.count, idx = function (i) { return I ? I.getX(i) : i }
    const Z = LM.zoneISpec(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), gn = new THREE.Vector3(); let inner = 0, miss = 0, dark = 0, missArea = 0
    const plateY = LM.ziToWorld(Z.top)[1]
    for (let i = 0; i + 2 < nn; i += 3) { const a = idx(i), b = idx(i + 1), c = idx(i + 2); va.fromBufferAttribute(P, a); vb.fromBufferAttribute(P, b); vc.fromBufferAttribute(P, c)
      if (Math.max(va.y, vb.y, vc.y) <= plateY) continue
      const cw = [(va.x + vb.x + vc.x) / 3, (va.y + vb.y + vc.y) / 3, (va.z + vb.z + vc.z) / 3], cl = LM.ziToLocal(cw), n = LM.ziNearest(cl); if (n.d > Z.rIn + Z.wallT + 1e-3 || LM.ziBoreSide(cl, n, Z) !== 'in') continue   // ★219-o 안면만(바깥면은 각도별 반지름으로 가른다)
      gn.subVectors(vb, va).cross(vc.clone().sub(va)); const area = gn.length() / 2; gn.normalize(); const nl = LM.ziToLocal([gn.x, gn.y, gn.z]), t = LM.ziTangent(n.u); if (Math.abs(nl[0] * t[0] + nl[1] * t[1] + nl[2] * t[2]) >= 0.9) continue
      inner++; if (!Zi || Zi.getX(a) + Zi.getX(b) + Zi.getX(c) < 3) { miss++; missArea += area } if (C) for (const k of [a, b, c]) if (C.getX(k) < K.ZI_DIM + 0.1) dark++ }
    ribV = { inner, miss, missArea: +missArea.toFixed(1), dark } } }
if (globalThis.window.__ethicaZi && globalThis.window.__ethicaZi.records) { const V = await import('${join(process.cwd(), 'src/_probe_zoneI_verify.mjs')}'); verify = V.verifyZoneI(THREE, globalThis.window.__ethicaZi) }
let look = null
if ('${LOOK}') { const [cx, cy, cz, yawD, pitD] = '${LOOK}'.split(',').map(Number); const yaw = yawD * Math.PI / 180, pit = pitD * Math.PI / 180
  const rc = new THREE.Raycaster(); rc.far = 400; const origin = new THREE.Vector3(cx, cy, cz)
  const fovV = 70 * Math.PI / 180, aspect = 16 / 9, tanV = Math.tan(fovV / 2), tanH = tanV * aspect
  const meshes = []; scene.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.lightVolume) meshes.push(o) })
  const rows = []
  for (let r = 0; r < 7; r++) for (let c = 0; c < 9; c++) {
    const sx = (c / 8) * 2 - 1, sy = 1 - (r / 6) * 2   // 화면 -1..1
    const d = new THREE.Vector3(sx * tanH, sy * tanV, -1).normalize().applyEuler(new THREE.Euler(pit, yaw, 0, 'YXZ'))
    rc.set(origin, d); const h = rc.intersectObjects(meshes, false)[0]
    if (!h) { rows.push({ r, c, hit: null }); continue }
    const o = h.object, g = o.geometry, C = g.attributes.color, f = h.face
    const cols = C ? [C.getX(f.a), C.getX(f.b), C.getX(f.c)].map((x) => +x.toFixed(2)) : null
    const inst = o.isInstancedMesh ? (() => { const cc = new THREE.Color(); if (o.instanceColor) o.getColorAt(h.instanceId, cc); return +cc.r.toFixed(2) })() : null
    const P = g.attributes.position, ys = [f.a, f.b, f.c].map((i) => +new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).y.toFixed(1))
    rows.push({ r, c, comp: o.userData.__comp || o.name || '?', inst: o.isInstancedMesh, walk: o.userData.walkable === true, ziRib: !!o.userData.ziRib, d: +h.distance.toFixed(1), p: h.point.toArray().map((x) => +x.toFixed(1)), n: f.normal.toArray().map((x) => +x.toFixed(2)), cols, vy: ys, instCol: inst, idx: !!g.index, nTri: (g.index ? g.index.count : P.count) / 3 })
  }
  look = rows }
let shelf = null
if ('${LOOK}' && globalThis.window.__ethicaZi && globalThis.window.__ethicaZi.records) {   // ★219-q 선반(몸 상면 비탈) 삼각형 단위 덤프
  const { records, rayFn, B } = globalThis.window.__ethicaZi, rows = []
  for (const { o, g, triSide } of records) { if ((o.userData.__comp || '') !== 'KneeWalk' || o.userData.walkable) continue
    const P = g.attributes.position, C = g.attributes.color, I = g.index, nn = I ? I.count : P.count, idx = (i) => I ? I.getX(i) : i
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) { const ia = idx(i), ib = idx(i + 1), ic = idx(i + 2)
      a.fromBufferAttribute(P, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, ib).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, ic).applyMatrix4(o.matrixWorld)
      const n = b.clone().sub(a).cross(c.clone().sub(a)); const ar = n.length() / 2; n.normalize()
      const cw = [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3], cl = LM.ziToLocal(cw)
      if (cl[0] < 200 || cl[0] > 226 || Math.abs(cl[2]) < 1.0 || Math.abs(cl[2]) > 3.6 || n.y < 0.5) continue
      const sh = LM.zoneIShadeAt(cw, [n.x, n.y, n.z], rayFn, B)
      rows.push({ mesh: nn / 3, t, side: triSide[t], ar: +ar.toFixed(2), cl: cl.map((x) => +x.toFixed(2)), n: [n.x, n.y, n.z].map((x) => +x.toFixed(2)), cols: [C.getX(ia), C.getX(ib), C.getX(ic)].map((x) => +x.toFixed(2)), ctr: +sh.toFixed(2),
        vl: [a, b, c].map((v) => LM.ziToLocal([v.x, v.y, v.z]).map((x) => +x.toFixed(2))) }) } }
  shelf = rows.sort((p, q) => q.cl[0] - p.cl[0] || p.cl[2] - q.cl[2]) }
let eye = null
if (${EYEP} && globalThis.window.__ethicaZi && globalThis.window.__ethicaZi.records) { const EM = await import('${join(process.cwd(), 'src/_probe_zoneI_eye.mjs')}'); const tE = performance.now(); eye = EM.eyeProbe(THREE, globalThis.window.__ethicaZi); eye.ms = Math.round(performance.now() - tE) }
WF('${RESULT}', JSON.stringify({ errs, logs, members, darkFaces, sweep, wps, verify, ribV, eye, look, shelf, consts: { PHI, RIN, H: K.H, R: spec ? spec.R : null, ribs: spec ? spec.ribs.map((r) => ({ k: r.k, yTop: +r.yTop.toFixed(3), top: r.top.map((x) => +x.toFixed(3)), stubLen: +r.stubLen.toFixed(3) })) : null, FRB } }))
process.exit(0)
`)
if (!REPORT) execSync(`node ${process.env.PROF ? "--cpu-prof --cpu-prof-dir=/tmp/prof " : ""}${runner}`, { stdio: ['ignore', 'inherit', 'inherit'] })
const R = JSON.parse(readFileSync(RESULT, 'utf-8'))
console.log('상수:', JSON.stringify(R.consts)); for (const l of R.logs) if (/\[ZI|\[ethica/.test(l)) console.log('  ' + l)
if (R.errs.length) console.log('오류:', R.errs.join(' | '))
if (LOOK) {
  console.log('\n── ★219-q --look ' + LOOK + ' (7행×9열 · 화면 좌상→우하) ──')
  for (const q of R.look) console.log(q.hit === null ? `  r${q.r} c${q.c} —` : `  r${q.r} c${q.c} ${q.comp.padEnd(14)}${q.inst ? ' inst' : ''}${q.walk ? ' walk' : ''}${q.ziRib ? ' ziRib' : ''} d${String(q.d).padStart(6)} p${JSON.stringify(q.p)} n${JSON.stringify(q.n)} 색${q.cols ? JSON.stringify(q.cols) : q.instCol !== null ? 'inst' + q.instCol : '-'} 정점y${JSON.stringify(q.vy)}`)
  if (!EYEP && !VERIFY) process.exit(0)
}
if (EYEP) {
  const E = R.eye
  if (!E) { console.log('\n── ★219-p 눈-가시성 — records 없음'); process.exit(2) }
  console.log(`\n── ★219-p 무릎길 눈-가시성 (눈 ${E.eyes}점 · 걸음 ${E.step} · z±${E.zOff} · ${E.ms}ms) ──`)
  const ok0 = E.self.badDown.length === 0 && E.self.badUp.length === 0
  console.log(`${ok0 ? '✓' : '✗'} Ⓔ0 눈 경로 자기검사 — 아래 어긋남 ${E.self.badDown.length} · 위 없음 ${E.self.badUp.length} (기대 0·0)`)
  for (const b of E.self.badDown.slice(0, 8)) console.log('     아래', JSON.stringify(b))
  for (const b of E.self.badUp.slice(0, 8)) console.log('     위', JSON.stringify(b))
  for (const r of E.rows) console.log(`  ${r.comp.padEnd(15)} tri${String(r.tris).padStart(6)} 눈에보임${String(r.vis).padStart(6)}(그중 안면 ${String(r.visIn).padStart(5)})  Ⓔ1 바깥면인데 보임 ${String(r.E1).padStart(5)} ${String(r.arE1).padStart(7)}㎡  Ⓔ2 안면인데 안보임 ${r.E2}`)
  console.log(`Ⓔ1 합 ${E.nE1}장 ${E.arE1}㎡ · Ⓔ2 합 ${E.nE2}장 ${E.arE2}㎡ · Ⓔ3 눈에 보이는 면 중 안면 ${E.nVisIn}/${E.nVis}`)
  console.log('Ⓔ1 y 분포(㎡):', E.byY.map((r) => `${r.y}:${r.ar}`).join(' '))
  if (!VERIFY) process.exit(ok0 ? 0 : 1)
}
if (VERIFY) {
  const V = R.verify
  if (!V) { console.log('\n── ★219-h 전수 대조 — records 없음(ZI_ON=false거나 베이크 미실행)'); process.exit(2) }
  console.log('\n── ★219-h 전수 대조: 안팎 판정 ↔ 구운 값 (구역 I 정점색 메시 전 삼각형) ──')
  console.log(`삼각형 ${V.nTri} = 안면 ${V.nIn}(${V.areaIn}㎡) · 바깥면 ${V.nOut}(${V.areaOut}㎡) · 퇴화 ${V.nDeg}`)
  console.log(`${V.nSwap === 0 ? '✓' : '✗'} Ⓖ 지오메트리 교체 — 베이크 당시 records.g ≠ 지금 o.geometry인 메시 ${V.nSwap} (기대 0 · ★219-p)`)
  console.log(`Ⓒ 안면 정점평균 − 중심 재계산: n${V.diff.n} min${V.diff.min} p01${V.diff.p01} p10${V.diff.p10} p50${V.diff.p50} p90${V.diff.p90} p99${V.diff.p99} max${V.diff.max}`)
  console.log(`Ⓒ 정보 — 면 ≥1㎡ 중 정점평균이 중심보다 0.3 넘게 어두운 면 ${V.nC} (면적순 상위):`)
  for (const f of V.Cface) console.log(`     ${f.comp.padEnd(14)} ${String(f.ar).padStart(7)}㎡ 정점${JSON.stringify(f.cols)} 평균${f.mean} 중심${f.ref} 중심좌표${JSON.stringify(f.c)} 법선${JSON.stringify(f.n)}`)
  for (const r of V.rows) console.log(`  ${r.comp.padEnd(14)} ${r.indexed ? 'idx' : 'raw'} tri${String(r.tris).padStart(6)} 안${String(r.in).padStart(6)} 밖${String(r.out).padStart(6)}  Ⓐ${r.A}(${r.arA}㎡) Ⓑ${r.B}`)
  const okA = V.nA === 0, okB = V.nB === 0
  console.log(`${okA ? '✓' : '✗'} Ⓐ 안면인데 어둠(세 정점 ≤ DIM · 중심 재계산은 밝음) = ${V.nA}면 ${V.areaA}㎡ (기대 0)`)
  for (const f of V.Aface) console.log(`     ${f.comp.padEnd(14)} ${String(f.ar).padStart(7)}㎡ 재계산${f.ref} side${f.side} 중심${JSON.stringify(f.c)} 법선${JSON.stringify(f.n)}`)
  console.log(`${okB ? '✓' : '✗'} Ⓑ 바깥면인데 칠함(안면과 공유하지 않는 정점 값 ≠ 1) = ${V.nB}정점 (기대 0)`)
  for (const b of V.Bvert) console.log(`     ${b.comp.padEnd(14)} #${b.id} 값${b.col} ${JSON.stringify(b.p)}`)
  const RV = R.ribV, okD = !!RV && RV.miss === 0 && RV.dark === 0
  console.log(`${okD ? '✓' : '✗'} Ⓓ 리브 관 안면(판 위 · ★219-o 안면만) — 후보 ${RV ? RV.inner : '?'}장 중 미분류 ${RV ? RV.miss : '?'}장 ${RV ? RV.missArea : '?'}㎡ · 어두운 정점 ${RV ? RV.dark : '?'} (기대 0·0 — ★219-m 이전 27장 273㎡)`)
  process.exit(okA && okB && okD && V.nSwap === 0 ? 0 : 1)
}
console.log('\n── ⓐ 구역 I 후보 부재 ──')
for (const m of R.members) console.log(`${m.comp.padEnd(14)} ${m.inst ? 'inst×' + m.count : 'mesh'} 주인:${(m.own || '-').padEnd(7)} v${m.verts} y${m.yMin}~${m.yMax} 색:${m.hasColor ? 'V' : '-'}${m.instColor ? 'I' : ''} aZi:${m.nZi ?? '-'} 태그[${m.tags}] ${m.zmin !== undefined && m.zmin < 9 ? 'ZI값 ' + m.zmin + '~' + m.zmax + ' ' + JSON.stringify(m.zh) : ''} ${m.inst ? '천장위 인스턴스색 ' + JSON.stringify(m.hist) : ''}`)
console.log('\n── ⓕ 큰 검은 면(면적 ≥4㎡ · 현도 화면 근처 순) ──')
for (const f of (R.darkFaces || []).sort((a, b) => a.d - b.d).slice(0, 16))
  console.log(`d${String(f.d).padStart(6)} ${String(f.ar).padStart(7)}㎡ ${f.comp.padEnd(14)} 값${f.col} 중심${JSON.stringify(f.c)} 법선${JSON.stringify(f.n)}\n     ${f.path}`)
console.log('\n── ⓔ 어두운 메시(현도 화면 근처 순) ──')
for (const m of R.members.filter((x) => x.bbox).sort((a, b) => a.dist - b.dist).slice(0, 14))
  console.log(`d${String(m.dist).padStart(6)} ${m.comp.padEnd(14)} v${m.verts} 어두움${m.nDark} 값${m.zmin}~${m.zmax} bbox${JSON.stringify(m.bbox)}\n     ${m.path}`)
console.log('\n── ⓑ 축 스윕(y × 축거리 rr) — inBore/dskIn/frIn/조각게이트 ──')
const prev = {}
for (const s of R.sweep) { const key = `${s.inBore}|${s.dskIn}|${s.frIn}|${s.frag}`; if (key !== prev[s.rr]) { console.log(`rr${s.rr} y${s.y.toFixed(1).padStart(6)} x${s.x} z${s.z} 천장${s.ceil}  inBore=${s.inBore} dskIn=${s.dskIn} frIn=${s.frIn} frag=${s.frag}`); prev[s.rr] = key } }
console.log('\n── 웨이포인트 ──')
for (const w of R.wps) console.log(JSON.stringify(w))
