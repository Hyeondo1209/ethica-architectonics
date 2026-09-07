// ★217 _probe_bake.mjs — 베이크 패스(useFrame) 프로파일러 + 값 봉인 (개발 도구 — 배포·번들 무관)
//  왜 따로인가: _probe_boot.mjs는 useFrame을 no-op으로 두어 **베이크 6패스를 못 잰다**(그 도구 5행이 스스로 적은 한계).
//   현도 실측(09.07 밤) 첫 화면 87.4 s 중 ⓓ 프레임 78.4 s = BAKE_A 35.8 · DSK 33.0 · BAKE_C 9.6 — 전부 useFrame 안.
//  무엇을 하나: App 트리를 **실제 THREE 장면으로 조립**(mesh·group·instancedMesh·재질·기하·ref 전부 실물)하고
//   useFrame 콜백을 등록순으로 N프레임 돌린다 — 브라우저의 R3F 루프와 같은 순서(형제 등록순 · 대기 프레임 포함).
//   패스별 ms(콜백 단위)·V8 self-time(패스 **안**의 범인)·값 지문(정점색·인스턴스색·리본 기하·지붕 높이맵)을 낸다.
//  못 재는 것(정직하게): GPU 업로드·셰이더 컴파일(ⓔ) · 브라우저 DOM. 기하·베이크는 순수 JS라 Node = 브라우저 계산 몫.
//  사용: node src/_probe_bake.mjs                 (패스별 ms + 프레임 요약)
//        node src/_probe_bake.mjs --cpu           (+ V8 self-time 상위 40 — 프레임 구간만 프로파일)
//        node src/_probe_bake.mjs --snap F        (봉인: 베이크 결과 지문 전부 → F)
//        node src/_probe_bake.mjs --diff F        (차분: F와 대조 — 한 비트라도 다르면 붉음·exit 1)
//        node src/_probe_bake.mjs --report        (직전 실행의 결과 파일만 다시 표로 — 실행 없음)
//        node src/_probe_bake.mjs --frames 130    (프레임 수 · 기본 130 — DSK는 DrumCup을 최대 60프레임 기다린다)
import { execSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ARGS = process.argv.slice(2)
const argOf = (k) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : null }
const SNAP = argOf('--snap'), DIFF = argOf('--diff'), CPU = ARGS.includes('--cpu'), FRAMES = +(argOf('--frames') || 130)
const REPORT = ARGS.includes('--report')   // 직전 실행 결과(RESULT 파일)만 다시 표로 — 긴 실행과 판독을 분리
const RESULT = join(tmpdir(), 'ethica_bake_last.json')
const dir = mkdtempSync(join(tmpdir(), 'ethica-bake-'))
const bdir = join(process.cwd(), '.tmp_probe_bake'); mkdirSync(bdir, { recursive: true })
process.on('exit', () => { try { rmSync(bdir, { recursive: true, force: true }) } catch {} })

// ── react 대역품: 훅은 실물처럼 값을 돌려주고, effect는 커밋 뒤에 돌리려고 모아 둔다 ──
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
//  fiber 대역품: useFrame은 콜백을 등록순으로 모은다(R3F도 등록순) · useThree는 공용 장면 상태
writeFileSync(join(dir, 'fiber.mjs'), `
export const useFrame = (cb) => { globalThis.__frames.push({ comp: globalThis.__comp, cb }) }
export const useThree = () => globalThis.__three
export const useLoader = () => ({})
export const extend = () => {}
export const Canvas = (p) => ({ __el: '__canvas', props: { children: p.children } })
export const invalidate = () => {}
`)

const out = join(bdir, 'App.mjs')
execSync(`npx esbuild src/App.jsx --bundle --format=esm --outfile=${out} --loader:.jsx=jsx --jsx=automatic` +
  ` --alias:react=${join(dir, 'react.mjs')} --alias:react/jsx-runtime=${join(dir, 'jsx-runtime.mjs')}` +
  ` --alias:@react-three/fiber=${join(dir, 'fiber.mjs')} --external:three --external:three-bvh-csg --log-level=silent`, { stdio: 'pipe' })

const runner = join(bdir, 'run.mjs')
writeFileSync(runner, `
import * as THREE from 'three'
import { Session } from 'node:inspector'
// ── DOM 스텁(렌더 본문이 캔버스 텍스처·window를 만진다) ──
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
const info = console.info; const logs = []; const keep = (a) => { const l = a.join(' '); if (/\\[(BAKE|DSK|ROOM|ACH|ethica)/.test(l)) logs.push(l) }
console.info = (...a) => keep(a); console.log = (...a) => keep(a)   // 패스 콘솔 줄만 모아서 뒤에 낸다
const OUT = (s) => process.stdout.write(s + '\\n')

globalThis.__effects = []; globalThis.__layout = []; globalThis.__frames = []; globalThis.__comp = null
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 3000); camera.position.set(0, 1.6, 0)
const gl = { domElement: { addEventListener: noop, removeEventListener: noop, requestPointerLock: noop, style: {}, clientWidth: 1280, clientHeight: 720 }, setPixelRatio: noop, setSize: noop, shadowMap: {}, info: { render: {} }, render: noop, capabilities: { getMaxAnisotropy: () => 1 } }
globalThis.__three = { scene, camera, gl, size: { width: 1280, height: 720 }, invalidate: noop, clock: new THREE.Clock(), get: () => globalThis.__three }

// ── 지붕 높이맵(DataTexture)은 uniform 클로저 안이라 밖에서 못 만진다 → needsUpdate 세터에 낚시 ──
const texReg = []
{ const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, 'needsUpdate')
  Object.defineProperty(THREE.DataTexture.prototype, 'needsUpdate', { set(v) { if (!texReg.includes(this)) texReg.push(this); d.set.call(this, v) }, get: d.get, configurable: true }) }

// ── 값 지문(FNV-1a 32bit — _probe_boot.mjs와 같은 어법) ──
const f64 = new Float64Array(1), u8of64 = new Uint8Array(f64.buffer)
const H = { h: 0x811c9dc5 }
const hb = (b) => { H.h ^= b; H.h = Math.imul(H.h, 0x01000193) >>> 0 }
const hbytes = (u8) => { for (let i = 0; i < u8.length; i++) hb(u8[i]) }
const hstr = (s) => { for (let i = 0; i < s.length; i++) hb(s.charCodeAt(i) & 255) }
const hnum = (n) => { f64[0] = n; hbytes(u8of64) }
const hview = (v) => { hstr(v.constructor.name); hnum(v.length); hbytes(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) }
const hashGeo = (g) => { H.h = 0x811c9dc5
  for (const k of Object.keys(g.attributes).sort()) { hstr(k); const a = g.attributes[k]; hnum(a.itemSize); hview(a.array) }
  hb(g.index ? 1 : 0); if (g.index) hview(g.index.array); return H.h >>> 0 }
const hashView = (v) => { H.h = 0x811c9dc5; hview(v); return H.h >>> 0 }

// ── 조립기: 요소 트리 → 실제 THREE 객체(R3F 최소 대역) ──
const M = await import('${out}')
const applyVec = (tgt, v) => { if (Array.isArray(v)) tgt.set(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0); else if (typeof v === 'number') tgt.setScalar(v); else if (v && v.isVector3) tgt.copy(v); else if (v && v.isEuler) tgt.copy(v) }
const SKIP = new Set(['children', 'key', 'ref', 'args', 'attach', 'dispose', 'onClick', 'onPointerOver', 'onPointerOut'])
const setRef = (r, o) => { if (!r) return; if (typeof r === 'function') r(o); else r.current = o }
const applyObjProps = (o, p) => {
  for (const [k, v] of Object.entries(p)) {
    if (SKIP.has(k) || v === undefined) continue
    if (k === 'position') applyVec(o.position, v)
    else if (k === 'rotation') applyVec(o.rotation, v)
    else if (k === 'scale') applyVec(o.scale, v)
    else if (k.startsWith('position-') || k.startsWith('rotation-') || k.startsWith('scale-')) { const [a, ax] = k.split('-'); o[a][ax] = v }
    else if (k === 'userData') Object.assign(o.userData, v)
    else if (k === 'geometry' || k === 'material') o[k] = v
    else if (k in o) { try { o[k] = v } catch {} }
  }
}
const matProps = (p) => { const q = {}; for (const [k, v] of Object.entries(p)) if (!SKIP.has(k) && v !== undefined && !k.includes('-')) q[k] = v; return q }
const isGeoEl = (t) => /Geometry$/.test(t), isMatEl = (t) => /Material$/.test(t)
const cls = (t) => t[0].toUpperCase() + t.slice(1)
const errs = []
const build = (node, parent) => {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const c of node) build(c, parent); return }
  const t = node.__el, p = node.props || {}
  if (typeof t === 'function') {
    const name = t.name || '(anon)', prev = globalThis.__comp; globalThis.__comp = name
    let o = null
    try { o = t(p) } catch (e) { errs.push(name + ': ' + (e && e.message)) }
    globalThis.__comp = prev
    build(o, parent); return
  }
  if (t === 'Fragment' || t === 'StrictMode' || t === '__canvas' || t === undefined) { build(p.children, parent); return }
  if (typeof t !== 'string') return
  if (t === 'div' || t === 'span' || t === 'b' || t === 'br' || t === 'button' || t === 'kbd') return   // DOM HUD — 장면 아님
  if (t === 'primitive') { const ob = p.object; if (!ob) return
    if (p.attach === 'geometry') parent.geometry = ob; else if (p.attach === 'material') parent.material = ob
    else { parent.add(ob); applyObjProps(ob, p); setRef(p.ref, ob); build(p.children, ob) } return }
  if (t === 'color') { if (p.attach === 'background') scene.background = new THREE.Color(...(p.args || [])); return }
  if (t === 'fog') { scene.fog = new THREE.Fog(...(p.args || [])); return }
  if (isGeoEl(t)) { const C = THREE[cls(t)]; if (!C) { errs.push('기하 없음 ' + t); return } const g = new C(...(p.args || [])); parent.geometry = g; setRef(p.ref, g); return }
  if (isMatEl(t)) { const C = THREE[cls(t)]; if (!C) { errs.push('재질 없음 ' + t); return } const m = new C(matProps(p)); if (p.onBeforeCompile) m.onBeforeCompile = p.onBeforeCompile; parent.material = m; setRef(p.ref, m); return }
  let o
  if (t === 'mesh') o = new THREE.Mesh()
  else if (t === 'instancedMesh') { const [g, m, n] = p.args || []; o = new THREE.InstancedMesh(g, m, n) }
  else if (t === 'group') o = new THREE.Group()
  else if (t === 'sprite') o = new THREE.Sprite()
  else { const C = THREE[cls(t)]; if (!C) { errs.push('요소 없음 ' + t); return } try { o = new C(...(p.args || [])) } catch (e) { errs.push(t + ': ' + e.message); return } }
  applyObjProps(o, p); parent.add(o); setRef(p.ref, o)
  build(p.children, o)
}
const tB0 = performance.now()
build({ __el: M.default, props: {} }, scene)
const buildMs = performance.now() - tB0
process.stderr.write('  조립 ' + buildMs.toFixed(0) + ' ms\\n')
// ── 커밋: layoutEffect → effect (실 React 순서). ref는 조립 중 이미 들어갔다 ──
const runFx = (list, label) => { const t0 = performance.now(); for (const e of list) { try { e.f() } catch (err) { errs.push(label + ' ' + e.comp + ': ' + (err && err.message)) } } return performance.now() - t0 }
const layoutMs = runFx(globalThis.__layout, 'layoutEffect'), effectMs = runFx(globalThis.__effects, 'effect')
let meshN = 0, instN = 0; scene.traverse((o) => { if (o.isInstancedMesh) instN++; else if (o.isMesh) meshN++ })

// ── 프레임 루프: 등록순 콜백 · 프레임마다 콜백별 ms ──
const F = globalThis.__frames, perCb = F.map((f) => ({ comp: f.comp, ms: 0, firstWork: -1, maxMs: 0, err: null }))
let sess = null
if (${CPU}) { sess = new Session(); sess.connect(); await new Promise((r) => sess.post('Profiler.enable', () => sess.post('Profiler.setSamplingInterval', { interval: 500 }, () => sess.post('Profiler.start', r)))) }
const tF0 = performance.now()
const frameMs = []
for (let fr = 0; fr < ${FRAMES}; fr++) {
  const t0 = performance.now()
  for (let i = 0; i < F.length; i++) {
    const c = perCb[i]; if (c.err) continue
    const t1 = performance.now()
    try { F[i].cb(globalThis.__three, 1 / 60) } catch (e) { c.err = (e && e.message) || String(e) }
    const d = performance.now() - t1
    c.ms += d; if (d > c.maxMs) c.maxMs = d; if (d > 5 && c.firstWork < 0) c.firstWork = fr
  }
  frameMs.push(performance.now() - t0)
  if (fr < 3 || fr % 20 === 0 || frameMs[fr] > 1000) process.stderr.write('  프레임 ' + fr + ': ' + frameMs[fr].toFixed(0) + ' ms\\n')
}
const framesMs = performance.now() - tF0
let prof = null
if (sess) prof = await new Promise((r) => sess.post('Profiler.stop', (e, { profile }) => r(profile)))

// ── 값 지문: 장면의 모든 메시 기하(정점색 포함) · 인스턴스색 · vertexColors 플래그 · 지붕 높이맵 ──
const tH0 = performance.now()
process.stderr.write('  프레임 루프 끝 ' + framesMs.toFixed(0) + ' ms — 지문 시작\\n')
const snap = {}
const pathOf = (o) => { const ps = []; let c = o; while (c && c !== scene) { const idx = c.parent ? c.parent.children.indexOf(c) : -1; ps.unshift((c.name || c.type) + '[' + idx + ']'); c = c.parent } return ps.join('/') }
let nColor = 0, nInstColor = 0
scene.traverse((o) => {
  if (!o.isMesh || !o.geometry) return
  const k = pathOf(o)
  snap[k + ' geo'] = hashGeo(o.geometry)
  if (o.geometry.attributes.color) nColor++
  if (o.isInstancedMesh && o.instanceColor) { snap[k + ' instColor'] = hashView(o.instanceColor.array); nInstColor++ }
  const mats = [].concat(o.material).filter(Boolean)
  snap[k + ' mat'] = mats.map((m) => (m.vertexColors ? 'V' : 'v') + (m.customProgramCacheKey ? m.customProgramCacheKey() : '')).join('|')
})
process.stderr.write('  지문 끝\\n')
texReg.forEach((t, i) => { snap['DataTexture#' + i] = hashView(t.image.data) })
process.stderr.write('  지문 ' + (performance.now() - tH0).toFixed(0) + ' ms\\n')
import { writeFileSync as WF } from 'fs'
WF('${RESULT}', JSON.stringify({ buildMs, layoutMs, effectMs, meshN, instN, framesMs, frameMs, perCb, errs, logs, snap, nColor, nInstColor, nTex: texReg.length, prof }))
`)
if (!REPORT) execSync(`node ${runner}`, { stdio: ['ignore', 'inherit', 'inherit'] })
const R = JSON.parse(readFileSync(RESULT, 'utf-8'))
const f = (x) => x.toFixed(1).padStart(9)

if (SNAP) { writeFileSync(SNAP, JSON.stringify(R.snap)); console.log(`봉인 저장: 지문 ${Object.keys(R.snap).length}개(정점색 기하 ${R.nColor} · 인스턴스색 ${R.nInstColor} · 텍스처 ${R.nTex}) → ${SNAP}`) }
if (DIFF) {
  const base = JSON.parse(readFileSync(DIFF, 'utf-8')), cur = R.snap
  const keys = new Set([...Object.keys(base), ...Object.keys(cur)])
  const bad = [], added = [], removed = []
  for (const k of keys) {
    if (!(k in base)) added.push(k)
    else if (!(k in cur)) removed.push(k)
    else if (base[k] !== cur[k]) bad.push(`${k}: ${base[k]} → ${cur[k]}`)
  }
  if (added.length) console.log(`ⓘ 기준에 없던 항목(신규): ${added.length}개 — ${added.slice(0, 5).join(', ')}`)
  if (removed.length) console.log(`ⓘ 기준에 있었으나 사라진 항목: ${removed.length}개 — ${removed.slice(0, 5).join(', ')}`)
  if (bad.length) { console.log(`✗ 봉인 차분 — ${bad.length}개 항목이 **다르다**:`); for (const b of bad.slice(0, 40)) console.log('   ' + b); process.exit(1) }
  console.log(`✓ 봉인 차분 무결 — 기준 ${Object.keys(base).length}개 지문 전부 일치 (${DIFF})`)
}

console.log('— ★217 베이크 패스 프로파일 (Node · 순수 JS 몫 · 실제 THREE 장면 · 등록순 프레임 루프) —')
console.log(`조립(렌더+useMemo)  ${f(R.buildMs)} ms   메시 ${R.meshN} · 인스턴스 메시 ${R.instN}`)
console.log(`layoutEffect        ${f(R.layoutMs)} ms   effect ${f(R.effectMs)} ms`)
console.log(`프레임 ${FRAMES}개 합      ${f(R.framesMs)} ms   (첫 프레임 ${R.frameMs[0].toFixed(0)} ms · 최대 ${Math.max(...R.frameMs).toFixed(0)} ms)`)
console.log('\n— useFrame 콜백별 (등록순 = R3F 실행순) —')
for (const c of R.perCb) console.log(`  ${f(c.ms)} ms  ${c.comp.padEnd(20)} 첫 일 프레임 ${c.firstWork < 0 ? '-' : c.firstWork}  최대 1프레임 ${c.maxMs.toFixed(0)} ms${c.err ? '  ⚠예외: ' + c.err : ''}`)
console.log('\n— 패스 콘솔 줄 —')
for (const l of R.logs) if (/\[(BAKE|DSK|ROOM|ACH|ethica)/.test(l)) console.log('  ' + l)
console.log(`\n지문 대상: 메시 기하 ${R.meshN + R.instN} · 정점색 ${R.nColor} · 인스턴스색 ${R.nInstColor} · 텍스처 ${R.nTex}`)
if (R.prof) {
  const prof = R.prof, self = {}, byId = new Map(prof.nodes.map((n) => [n.id, n])), dts = prof.timeDeltas || []
  for (let i = 0; i < prof.samples.length; i++) {
    const n = byId.get(prof.samples[i]); if (!n) continue
    const cf = n.callFrame, file = (cf.url || '').split('/').slice(-1)[0] || '(native)'
    const k = `${cf.functionName || '(anon)'}  @${file}:${cf.lineNumber + 1}`
    self[k] = (self[k] || 0) + (dts[i] || 0) / 1000
  }
  const rows = Object.entries(self).sort((a, b) => b[1] - a[1]), tot = rows.reduce((s, r) => s + r[1], 0)
  console.log(`\n— V8 self-time 상위 40 · 프레임 구간만 (표본 합 ${tot.toFixed(0)} ms) —`)
  for (const [k, ms] of rows.slice(0, 40)) console.log(`  ${f(ms)} ms  ${(100 * ms / tot).toFixed(1).padStart(5)}%  ${k}`)
}
if (R.errs.length) { console.log('\n— 예외(대역품 한계일 수 있음) —'); for (const e of R.errs) console.log('  ' + e) }
