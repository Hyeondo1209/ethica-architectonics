// ★216 _probe_boot.mjs — 부팅 시간 프로파일러 (개발 도구 — 배포·번들 무관)
//  무엇을 재나: App 트리를 **실제로 렌더**(컴포넌트 함수를 재귀 호출)하면서 useMemo 하나하나의
//   소요 시간을 잰다. 기하(CSG·높이맵·표본·인스턴스 행렬)는 순수 JS라 Node와 브라우저가 같은 코드를
//   돈다 — 여기 수치 = 브라우저 메인스레드 **계산** 몫의 근사. 
//  못 재는 것(정직하게): GPU 업로드·셰이더 컴파일·useEffect/useLayoutEffect 본체·useFrame 베이크.
//   그건 브라우저 계측(App.jsx의 __ethicaBoot)이 잰다. 둘을 합쳐 읽는다.
//  ⚠StrictMode: 개발 모드에서 React가 useMemo 계산을 **두 번** 부른다(결과 하나 버림). 여기서는 한 번만
//   재므로 브라우저 dev 수치는 이 표의 계산 몫이 ×2 가까이 나올 수 있다 — 가설, 브라우저에서 확정할 것.
//  사용: node src/_probe_boot.mjs            (상위 25개 useMemo + 컴포넌트별 합계)
//        node src/_probe_boot.mjs --all      (전부)
//        node src/_probe_boot.mjs --json     (JSON 한 줄 — 비교용)
//        node src/_probe_boot.mjs --cpu      (+ V8 CPU 프로파일: 함수별 self-time 상위 30)
//        node src/_probe_boot.mjs --snap F   (봉인: useMemo 170개의 **결과값 전부**를 FNV-1a로 찍어 F에 저장)
//        node src/_probe_boot.mjs --diff F   (차분: F와 대조 — 한 비트라도 다르면 붉음·exit 1. 최적화 = 값 무변의 증명)
import { execSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const ARGS = process.argv.slice(2)
const ALL = ARGS.includes('--all'), JSONOUT = ARGS.includes('--json')
const argOf = (k) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : null }
const SNAP = argOf('--snap'), DIFF = argOf('--diff')
const dir = mkdtempSync(join(tmpdir(), 'ethica-boot-'))
//  번들은 repo 안 임시 폴더에 둔다 — three·three-bvh-csg를 external로 빼야 Evaluator 프로토타입에 장부를 물릴 수 있고,
//  external은 번들 파일 위치에서 node_modules를 찾으므로 repo 안이어야 한다. 끝나면 지운다.
import { mkdirSync, rmSync } from 'fs'
const bdir = join(process.cwd(), '.tmp_probe_boot'); mkdirSync(bdir, { recursive: true })
process.on('exit', () => { try { rmSync(bdir, { recursive: true, force: true }) } catch {} })

// ── react 대역품: useMemo에 스톱워치. 어느 컴포넌트 안인지는 렌더러가 globalThis.__comp에 놓는다 ──
writeFileSync(join(dir, 'react.mjs'), `
const now = () => performance.now()
export const useMemo = (f) => {
  const c = globalThis.__comp || '?', t0 = now()
  const v = f()
  const dt = now() - t0
  const idx = (globalThis.__memoIdx[c] = (globalThis.__memoIdx[c] || 0) + 1)
  globalThis.__prof.push({ comp: c, ms: dt, idx })
  if (globalThis.__snap) globalThis.__snap[c + '#' + idx] = globalThis.__hash(v)
  return v
}
export const useRef = (v = null) => ({ current: v })
export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}]
export const useEffect = () => {}
export const useLayoutEffect = () => {}
export const useCallback = (f) => f
export const useContext = () => ({})
export const createContext = () => ({ Provider: () => null })
export const forwardRef = (f) => f
export const memo = (f) => f
export const StrictMode = 'StrictMode'
export const Fragment = 'Fragment'
export const createElement = (t, p, ...c) => ({ __el: t, props: { ...p, children: c } })
export default { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, forwardRef, memo, Fragment, StrictMode, createElement }
`)
writeFileSync(join(dir, 'jsx-runtime.mjs'), `
export const Fragment = 'Fragment'
export const jsx = (t, p, k) => ({ __el: t, props: p, key: k })
export const jsxs = jsx
export const jsxDEV = jsx
`)
writeFileSync(join(dir, 'fiber.mjs'), `
export const useFrame = () => {}
export const useThree = () => ({ camera: { position: { set() {}, copy() {} }, rotation: { set() {} } }, scene: { traverse() {} }, gl: { domElement: {} }, size: { width: 1, height: 1 } })
export const useLoader = () => ({})
export const extend = () => {}
export const Canvas = (p) => p.children   // 자식을 그대로 내보내 트리가 이어지게
export const invalidate = () => {}
`)

const out = join(bdir, 'App.mjs')
const tBundle0 = performance.now()
execSync(`npx esbuild src/App.jsx --bundle --format=esm --outfile=${out} --loader:.jsx=jsx --jsx=automatic` +
  ` --alias:react=${join(dir, 'react.mjs')} --alias:react/jsx-runtime=${join(dir, 'jsx-runtime.mjs')}` +
  ` --alias:@react-three/fiber=${join(dir, 'fiber.mjs')} --external:three --external:three-bvh-csg --log-level=silent`, { stdio: 'pipe' })
const bundleMs = performance.now() - tBundle0

const runner = join(bdir, 'run.mjs')
writeFileSync(runner, `
const ctx2d = new Proxy({}, { get: (_, k) =>
  k === 'measureText' ? (() => ({ width: 10 }))
  : k === 'createLinearGradient' || k === 'createRadialGradient' ? (() => ({ addColorStop() {} }))
  : k === 'getImageData' ? (() => ({ data: new Uint8ClampedArray(4) }))
  : k === 'canvas' ? { width: 1, height: 1 }
  : (() => {}) })
globalThis.document = { createElement: (t) => t === 'canvas'
  ? { width: 0, height: 0, getContext: () => ctx2d, toDataURL: () => '' }
  : { style: {}, setAttribute() {}, appendChild() {} },
  body: { appendChild() {} }, getElementById: () => null, addEventListener() {} }
globalThis.window = globalThis.window || { devicePixelRatio: 1, innerWidth: 1, innerHeight: 1, addEventListener() {}, dispatchEvent() {} }
globalThis.__prof = []; globalThis.__memoIdx = {}; globalThis.__comp = null
//  ── 값 지문(FNV-1a 32bit): 숫자는 float64 바이트, 형식 배열은 바이트 그대로, BufferGeometry는 속성·인덱스 바이트.
//     객체는 키 정렬 후 재귀(깊이 14 · 순환 차단). 함수는 무시. → 같은 값 ⇔ 같은 지문(한 비트 달라도 다른 지문).
const f64 = new Float64Array(1), u8of64 = new Uint8Array(f64.buffer)
const H = { h: 0x811c9dc5 }
const hb = (b) => { H.h ^= b; H.h = Math.imul(H.h, 0x01000193) >>> 0 }
const hbytes = (u8) => { for (let i = 0; i < u8.length; i++) hb(u8[i]) }
const hstr = (s) => { for (let i = 0; i < s.length; i++) hb(s.charCodeAt(i) & 255) }
const hnum = (n) => { f64[0] = n; hbytes(u8of64) }
const walkH = (v, d, seen) => {
  if (v == null) { hb(0); return }
  const t = typeof v
  if (t === 'number') { hb(1); hnum(v); return }
  if (t === 'string') { hb(2); hstr(v); return }
  if (t === 'boolean') { hb(3); hb(v ? 1 : 0); return }
  if (t === 'function') { hb(4); return }
  if (t !== 'object') { hb(5); return }
  if (ArrayBuffer.isView(v)) { hb(6); hstr(v.constructor.name); hbytes(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return }
  if (seen.has(v) || d > 14) { hb(7); return }
  seen.add(v)
  if (v.isBufferGeometry) {
    hb(8)
    for (const k of Object.keys(v.attributes).sort()) { hstr(k); const a = v.attributes[k]; hnum(a.itemSize); walkH(a.array, d + 1, seen) }
    hb(v.index ? 1 : 0); if (v.index) walkH(v.index.array, d + 1, seen)
    return
  }
  if (Array.isArray(v)) { hb(9); hnum(v.length); for (const e of v) walkH(e, d + 1, seen); return }
  hb(10)
  //  three 객체의 uuid·id는 실행마다 다른 난수/일련번호 — 값이 아니라 정체성이므로 제외(그 외 키는 전부 본다)
  for (const k of Object.keys(v).sort()) { if (k.startsWith('__') || k === 'uuid' || k === 'id') continue; hstr(k); walkH(v[k], d + 1, seen) }
}
globalThis.__hash = (v) => { H.h = 0x811c9dc5; walkH(v, 0, new Set()); return H.h >>> 0 }
globalThis.__snap = ${JSON.stringify(SNAP || DIFF) !== 'null'} ? {} : null
//  ── CSG 장부: evaluate 한 건마다 (컴포넌트 · 입력 삼각형 수 · 소요) ──
import { Evaluator, Brush } from 'three-bvh-csg'
const csg = []
const triN = (g) => g ? ((g.index ? g.index.count : g.attributes.position.count) / 3) : 0
const _ev = Evaluator.prototype.evaluate
Evaluator.prototype.evaluate = function (a, b, op, ...rest) {
  const t0 = performance.now()
  const r = _ev.call(this, a, b, op, ...rest)
  csg.push({ comp: globalThis.__comp || '?', a: triN(a.geometry), b: triN(b.geometry), out: triN(r && r.geometry), ms: performance.now() - t0 })
  return r
}

const tImp0 = performance.now()
const M = await import('${out}')
const importMs = performance.now() - tImp0     // 모듈 최상위 실행(constants·lightingModel 등의 파생값 계산) 몫

// ── 재귀 렌더러: 함수 요소면 부르고, 결과를 다시 훑는다 ──
const compMs = {}, errs = []
const render = (node, depth) => {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const c of node) render(c, depth); return }
  if (typeof node.__el === 'function') {
    const name = node.__el.name || '(anon)'
    const prev = globalThis.__comp; globalThis.__comp = name
    const t0 = performance.now()
    let out = null
    try { out = node.__el(node.props || {}) }
    catch (e) { errs.push(name + ': ' + (e && e.message)) }
    compMs[name] = (compMs[name] || 0) + (performance.now() - t0)
    globalThis.__comp = prev
    render(out, depth + 1)
    return
  }
  if (node.props) render(node.props.children, depth + 1)
}
const tR0 = performance.now()
render({ __el: M.default, props: {} }, 0)
const renderMs = performance.now() - tR0
const G = globalThis.__cnt; if (G) console.error('COUNTERS', JSON.stringify({ axisDistAt: G.ad, distinct: G.adKeys.size, tubeBottomAt: G.tb, tbDistinct: G.tbKeys.size, tubeInnerBottomAt: G.tib, tibDistinct: G.tibKeys.size, byComp: G.byComp }))
console.log(JSON.stringify({ importMs, renderMs, compMs, prof: globalThis.__prof, errs, csg, snap: globalThis.__snap }))
`)
const CPU = ARGS.includes('--cpu')
const raw = execSync(`node ${CPU ? `--cpu-prof --cpu-prof-dir=${bdir} --cpu-prof-name=boot.cpuprofile` : ''} ${runner}`, { stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 26 }).toString()
const R = JSON.parse(raw.trim().split('\n').pop())

if (SNAP) { writeFileSync(SNAP, JSON.stringify(R.snap, null, 0)); console.log(`봉인 저장: ${Object.keys(R.snap).length}개 useMemo 결과 지문 → ${SNAP}`) }
if (DIFF) {
  const base = JSON.parse(readFileSync(DIFF, 'utf-8')), cur = R.snap
  const keys = new Set([...Object.keys(base), ...Object.keys(cur)])
  const bad = [], added = [], removed = []
  for (const k of keys) {
    if (!(k in base)) added.push(k)
    else if (!(k in cur)) removed.push(k)
    else if (base[k] !== cur[k]) bad.push(`${k}: ${base[k]} → ${cur[k]}`)
  }
  if (added.length) console.log(`ⓘ 기준에 없던 useMemo(신규 — 값 변경 아님): ${added.join(', ')}`)
  if (removed.length) console.log(`ⓘ 기준에 있었으나 사라진 useMemo: ${removed.join(', ')}`)
  if (bad.length) { console.log(`✗ 봉인 차분 — ${bad.length}개 useMemo 결과가 **다르다**:`); for (const b of bad) console.log('   ' + b); process.exit(1) }
  console.log(`✓ 봉인 차분 무결 — 기준의 useMemo ${Object.keys(base).length}개 결과 지문 전부 일치 (${DIFF})`)
  if (!ALL && !ARGS.includes('--cpu')) process.exit(0)
}
const memoTotal = R.prof.reduce((s, p) => s + p.ms, 0)
const byComp = {}
for (const p of R.prof) byComp[p.comp] = (byComp[p.comp] || 0) + p.ms
const compRows = Object.entries(byComp).sort((a, b) => b[1] - a[1])
const top = [...R.prof].sort((a, b) => b.ms - a.ms)
const f = (x) => x.toFixed(1).padStart(8)

if (JSONOUT) { console.log(JSON.stringify({ bundleMs: R.bundleMs, importMs: R.importMs, renderMs: R.renderMs, memoTotal, byComp, top: top.slice(0, 40), errs: R.errs })); process.exit(0) }

console.log('— ★216 부팅 프로파일 (Node · 계산 몫만 · StrictMode ×2 미반영) —')
console.log(`esbuild 번들        ${f(bundleMs)} ms   (참고 — Vite dev는 다른 경로)`)
console.log(`모듈 최상위(import) ${f(R.importMs)} ms   ← constants.js·lightingModel.js 등 파생값 계산`)
console.log(`트리 렌더(전체)     ${f(R.renderMs)} ms   ← 컴포넌트 함수 호출 전부(useMemo 포함)`)
console.log(`  그중 useMemo 합   ${f(memoTotal)} ms   (${R.prof.length}개)`)
console.log('\n— 컴포넌트별 useMemo 합계 —')
for (const [c, ms] of compRows) if (ALL || ms >= 5) console.log(`  ${f(ms)} ms  ${c}  (${R.prof.filter((p) => p.comp === c).length}개)`)
console.log(`\n— 무거운 useMemo 상위 ${ALL ? '전부' : 25} (comp#순번 = 그 컴포넌트 안에서 몇 번째 useMemo) —`)
for (const p of top.slice(0, ALL ? 1e9 : 25)) if (ALL || p.ms >= 1) console.log(`  ${f(p.ms)} ms  ${p.comp}#${p.idx}`)
const csgMs = R.csg.reduce((s, c) => s + c.ms, 0)
console.log(`\n— CSG 장부: evaluate ${R.csg.length}건 · 합 ${csgMs.toFixed(1)} ms (= 렌더의 ${(100 * csgMs / R.renderMs).toFixed(0)}%) —`)
const byC = {}
for (const c of R.csg) { const k = c.comp; byC[k] = byC[k] || { n: 0, ms: 0, tri: 0 }; byC[k].n++; byC[k].ms += c.ms; byC[k].tri += c.a + c.b }
for (const [k, v] of Object.entries(byC).sort((a, b) => b[1].ms - a[1].ms)) if (ALL || v.ms >= 5) console.log(`  ${f(v.ms)} ms  ${k}  (${v.n}건 · 입력 삼각형 합 ${v.tri})`)
if (CPU) {
  //  V8 CPU 프로파일 → 함수별 self-time 상위. 어느 파일의 어느 함수가 실제로 시간을 먹는지.
  const prof = JSON.parse(readFileSync(join(bdir, 'boot.cpuprofile'), 'utf-8'))
  const self = {}, byId = new Map(prof.nodes.map((n) => [n.id, n]))
  const dts = prof.timeDeltas || []
  for (let i = 0; i < prof.samples.length; i++) {
    const n = byId.get(prof.samples[i]); if (!n) continue
    const cf = n.callFrame, file = (cf.url || '').split('/').slice(-1)[0] || '(native)'
    const k = `${cf.functionName || '(anon)'}  @${file}:${cf.lineNumber + 1}`
    self[k] = (self[k] || 0) + (dts[i] || 0) / 1000
  }
  const rows = Object.entries(self).sort((a, b) => b[1] - a[1])
  const tot = rows.reduce((s, r) => s + r[1], 0)
  console.log(`\n— V8 self-time 상위 30 (표본 합 ${tot.toFixed(0)} ms) —`)
  for (const [k, ms] of rows.slice(0, 30)) console.log(`  ${f(ms)} ms  ${(100 * ms / tot).toFixed(1).padStart(5)}%  ${k}`)
}
if (R.errs.length) { console.log('\n— 호출 중 예외(대역품 한계일 수 있음 — 그 컴포넌트의 나머지 useMemo는 안 잰 것) —'); for (const e of R.errs) console.log('  ' + e) }
