// check_render.mjs — ★신설 2026.07.28: **"빌드 green인데 흰 화면"을 잡는 검사**
//  실행: node src/check_render.mjs   (repo 루트에서)
//
//  왜 필요한가 — 실제로 당했다(★78-4). `clSillY`를 Dome.jsx가 쓰면서 import를 안 했는데
//  `vite build`는 통과했다. 번들러에게 자유 식별자는 런타임 전역 후보일 뿐이라 에러가 아니다.
//  그런데 브라우저에서 컴포넌트가 **렌더될 때** ReferenceError가 나고 React 트리 전체가 죽어 흰 화면이 된다.
//  기존 스위트는 전부 기하 상수·함수만 import해서 봤기 때문에 이 구멍을 못 봤다.
//
//  전략: 컴포넌트를 **실제로 호출한다.** react/three 훅을 얇게 가짜로 물리고(JSX는 기술자 객체만 만들면 됨)
//  각 export된 컴포넌트 함수를 부른다. 함수 본문의 `.map`·수식·상수 접근이 전부 그 자리에서 평가되므로
//  누락 import·TDZ·NaN·널 참조가 즉시 터진다.
//  ⚠한계(정직하게): 자식 컴포넌트(<SlopedParapet/> 같은 것)는 기술자만 만들어지므로 **따로 부른다**(아래 목록).
//   훅 의존성·상태 전이·GPU 동작은 이 검사의 범위 밖이다.
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RM10_FLARE_ON } from './constants.js'   // ★80 나팔 체제 스위치

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }

//  렌더할 모듈 = 화면을 만드는 것 전부. 새 컴포넌트 파일이 생기면 여기 추가한다.
const TARGETS = [
  'src/Dome.jsx', 'src/Corridor.jsx', 'src/Room.jsx', 'src/Radial.jsx',
  'src/RadialEvents.jsx', 'src/Lens.jsx', 'src/Steles.jsx',
]

const dir = mkdtempSync(join(tmpdir(), 'ethica-render-'))
const ALLKEYS = {}   // ★79-8 컴포넌트별 mesh key 대장

//  react / @react-three/fiber 얇은 대역품 — 훅은 즉시 실행, JSX는 기술자 객체.
writeFileSync(join(dir, 'react.mjs'), `
export const useMemo = (f) => f()
export const useRef = (v = null) => ({ current: v })
export const useState = (v) => [typeof v === 'function' ? v() : v, () => {}]
export const useEffect = () => {}
export const useLayoutEffect = () => {}
export const useCallback = (f) => f
export const useContext = () => ({})
export const createContext = () => ({ Provider: () => null })
export const forwardRef = (f) => f
export const memo = (f) => f
export const Fragment = 'Fragment'
export const createElement = (t, p, ...c) => ({ __el: t, props: { ...p, children: c } })
export default { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, forwardRef, memo, Fragment, createElement }
`)
writeFileSync(join(dir, 'jsx-runtime.mjs'), `
export const Fragment = 'Fragment'
export const jsx = (t, p, k) => ({ __el: t, props: p, key: k })
export const jsxs = jsx
export const jsxDEV = jsx
`)
writeFileSync(join(dir, 'fiber.mjs'), `
export const useFrame = () => {}
export const useThree = () => ({ camera: { position: { set: () => {} } }, scene: {}, gl: {}, size: { width: 1, height: 1 } })
export const useLoader = () => ({})
export const extend = () => {}
export const Canvas = () => null
export const invalidate = () => {}
`)

console.log('— 렌더 스모크: 컴포넌트를 실제로 호출한다 (흰 화면 방지) —')
for (const t of TARGETS) {
  const out = join(dir, t.replace(/[/.]/g, '_') + '.mjs')
  let built = true, msg = ''
  try {
    execSync(`npx esbuild ${t} --bundle --format=esm --outfile=${out} --loader:.jsx=jsx --jsx=automatic` +
      ` --alias:react=${join(dir, 'react.mjs')} --alias:react/jsx-runtime=${join(dir, 'jsx-runtime.mjs')}` +
      ` --alias:@react-three/fiber=${join(dir, 'fiber.mjs')} --log-level=silent`, { stdio: 'pipe' })
  } catch (e) { built = false; msg = (e.stderr || e.stdout || '').toString().split('\n').slice(0, 3).join(' | ') }
  ok(built, `${t} 번들` + (built ? '' : ` — ${msg}`))
  if (!built) continue

  //  ★핵심: export된 컴포넌트를 하나씩 실제 호출한다.
  const runner = join(dir, 'run_' + t.replace(/[/.]/g, '_') + '.mjs')
  writeFileSync(runner, `
//  ⚠브라우저 API 대역품 — 캔버스 텍스처(비석·정리 글자)는 document를 쓴다. 이건 **버그가 아니므로**
//   검사가 여기서 실패하면 안 된다. 진짜 예외만 남기려고 얇게 물린다.
const ctx2d = new Proxy({}, { get: (_, k) =>
  k === 'measureText' ? (() => ({ width: 10 }))
  : k === 'createLinearGradient' || k === 'createRadialGradient' ? (() => ({ addColorStop() {} }))
  : k === 'getImageData' ? (() => ({ data: new Uint8ClampedArray(4) }))
  : k === 'canvas' ? { width: 1, height: 1 }
  : (() => {}) })
globalThis.document = { createElement: (t) => t === 'canvas'
  ? { width: 0, height: 0, getContext: () => ctx2d, toDataURL: () => '' }
  : { style: {}, setAttribute() {}, appendChild() {} },
  body: { appendChild() {} } }
globalThis.window = globalThis.window || { devicePixelRatio: 1, innerWidth: 1, innerHeight: 1, addEventListener() {} }
import * as M from '${out}'
//  ★무엇을 '실패'로 볼 것인가 — 여기서 정직해야 한다.
//   흰 화면의 원인은 **ReferenceError**(선언 안 된 식별자)다. 그건 무조건 실패다.
//   반면 props 없이 부른 탓에 나는 TypeError는 **검사 장치의 한계**이지 코드 버그가 아니다
//   (PropStele은 text를 받아 split한다). 둘을 섞으면 이 검사는 늑대소년이 된다.
const bad = [], noted = []
//  ★79-8 부재 대장 — 기술자 트리를 훑어 mesh **key**를 모은다.
//   왜: ★79-7에서 편집 슬라이스가 넘쳐 통로 바깥벽이 통째로 지워졌는데 **어떤 검사도 못 잡았다**
//   (셀프 렌더는 제 사본에 벽이 남아 0% 누출로 보고했다). 부재가 사라진 것은 '있는가'를 물어야 잡힌다.
const keys = {}
const walk = (node, into) => {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const c of node) walk(c, into); return }
  if (node.__el === 'mesh' && node.key != null) into.push(String(node.key))
  const p = node.props
  if (p) { walk(p.children, into); for (const v of Object.values(p)) if (v && typeof v === 'object') walk(v, into) }
}
let called = 0
for (const [k, v] of Object.entries(M)) {
  if (typeof v !== 'function') continue
  if (!/^[A-Z]/.test(k)) continue                    // 컴포넌트 관례 = 대문자 시작
  try { const out = v({}); called++; const acc = []; walk(out, acc); if (acc.length) keys[k] = acc }
  catch (e) {
    if (e instanceof ReferenceError) bad.push(k + ': ' + e.message)
    else noted.push(k + ': ' + e.message)            // props 미제공 등 — 보고만
  }
}
console.log(JSON.stringify({ called, bad, noted, keys }))
`)
  let res = null, err = ''
  try { res = JSON.parse(execSync(`node ${runner}`, { stdio: 'pipe' }).toString().trim().split('\n').pop()) }
  catch (e) { err = (e.stderr || '').toString().split('\n')[0] || e.message }
  ok(res !== null, `${t} 모듈 평가(임포트 시점 예외 없음)` + (res ? '' : ` — ${err}`))
  if (!res) continue
  Object.assign(ALLKEYS, res.keys || {})
  ok(res.bad.length === 0,
    `${t} 컴포넌트 ${res.called}개 호출 — **ReferenceError 0**(흰 화면의 원인)` +
    (res.bad.length ? ` — ${res.bad.join(' / ')}` : '') +
    (res.noted.length ? `  ⓘ props 필요로 건너뜀 ${res.noted.length}개` : ''))
}

//  ── ★79-8 부재 대장 대조 ──────────────────────────────────────────────────────
//   "있어야 할 부재가 있는가"를 묻는다. 값이 틀린 것은 다른 스위트가 잡지만, **통째로 사라진 것**은
//   여기서만 잡힌다. 새 부재를 지으면 이 목록에 키를 추가할 것(추가를 잊으면 보호가 안 된다).
{
  //  ★80: 나팔이 켜지면 통로 뒷부분의 부재 구성이 통째로 바뀐다 —
  //   테라스 문(xob*/xoj*/xc1)과 직선(s*)이 사라지고, 대신 나팔 껍질 10종이 선다.
  //   ⚠두 체제 **모두**를 대장에 적어 둔다. 스위치를 되돌렸을 때 보호가 같이 돌아오게.
  const REQUIRED = {
    LampRoom: [
      'xf', 'xr',                     // 통로 바닥·지붕
      'xoa0', 'xoa1',                 // ★통로 바깥벽 안팎 두 겹 — ★79-7에서 지워졌던 것
      'xij0', 'xij1', 'xih',          // 방 쪽 문 문선·인방
      'xc0',                          // 방 쪽 끝캡
      'ld', 'xth',                    // 입구 층계참 · ★79-9 문지방
      ...(RM10_FLARE_ON
        ? ['flifloor', 'flefloor', 'fliwOuter', 'flewOuter', 'fliroof', 'fleroof',
           'fliwDome', 'flewDome', 'flrim', 'flcap']      // ★80 나팔 껍질(안4·밖4·사선 아가리·시작 테두리)
        : ['xob0', 'xob1', 'xoj0', 'xoj1', 'xc1',         // 구 테라스 문
           'sf', 'sr', 'sw-1', 'sw1', 'se-1', 'se1', 'sl']),  // 구 직선
    ],
  }
  for (const [comp, need] of Object.entries(REQUIRED)) {
    const have = new Set(ALLKEYS[comp] || [])
    const miss = need.filter((k) => !have.has(k))
    ok(miss.length === 0,
      `${comp} 부재 대장 ${need.length}종 전부 존재` + (miss.length ? ` — ✗누락: ${miss.join(', ')}` : ` (총 mesh ${have.size}종)`))
  }
}

//  자식 컴포넌트(모듈 밖으로 export되지 않는 것)는 위 루프가 못 부른다.
//  → 부모가 그 기술자를 만들었는지만 확인하고, 실제 호출이 필요한 것은 export해서 이 목록에 올린다.
console.log('  ⓘ 한계: export 안 된 내부 컴포넌트는 기술자 생성까지만 검증된다(호출 필요 시 export할 것)')

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
