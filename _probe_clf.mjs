// _probe_clf.mjs — 회랑(1p9) 명암 실측·자가 렌더 (개발 도구 — 배포·번들 무관 · 빛 구획 F)
//  장면을 실제 THREE 객체로 조립(_probe_zoneI와 같은 대역)하고 베이크 프레임을 돌린 뒤,
//  본문 모듈(_probe_clf_body.mjs)이 ⓐ 회랑 부재 표 ⓑ 광선 렌더(PNG · 장면광 에뮬레이션 = lightingModel.luxAt 계열)를 낸다.
//  사용: node src/_probe_clf.mjs [--out=/tmp/clf] [--tag=before]
import { execSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ARGS = process.argv.slice(2)
const REPORT = ARGS.includes('--report'), VERIFY = ARGS.includes('--verify'), EYEP = ARGS.includes('--eye')
const LOOK = (ARGS.find((a) => a.startsWith('--look=')) || '').slice(7)   // ★219-q --look=x,y,z,yawDeg,pitchDeg — HUD 자세에서 화면 격자 광선 → 명중 메시·정점색(어느 메시가 화면의 무엇인지 확정)
const RESULT = join(tmpdir(), 'ethica_clf_last.json')
const dir = mkdtempSync(join(tmpdir(), 'ethica-clf-'))
const bdir = join(process.cwd(), '.tmp_probe_clf'); mkdirSync(bdir, { recursive: true })
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


const BODY = await import('${join(process.cwd(), 'src/_probe_clf_body.mjs')}')
await BODY.run({ THREE, scene, LM, K, errs, args: ${JSON.stringify(ARGS)} })
process.stderr.write('  오류 ' + errs.length + (errs.length ? ' — ' + errs.slice(0, 5).join(' | ') : '') + '\\n')
`)
execSync(`node ${runner}`, { stdio: ['ignore', 'inherit', 'inherit'] })
