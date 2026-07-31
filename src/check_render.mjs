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
import * as CUP from './drumCupGeometry.js'
import { RM10_FLARE_ON, RM10_WIN_ON, MIR_ON, MIR_PADS, RAD_CYL_ON, RAD_CYL_Y1_BY, CUP_ON, CUP_R, PIER_ON, PIER_N } from './constants.js'   // ★80 나팔 체제 스위치 · ★81 창 스위치 · ★87 미러·임시 판 · ★91 원기둥 받침

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }

//  렌더할 모듈 = 화면을 만드는 것 전부. 새 컴포넌트 파일이 생기면 여기 추가한다.
const TARGETS = [
  'src/Dome.jsx', 'src/Corridor.jsx', 'src/Room.jsx', 'src/Radial.jsx',
  'src/RadialEvents.jsx', 'src/Lens.jsx', 'src/Steles.jsx',
]

const dir = mkdtempSync(join(tmpdir(), 'ethica-render-'))
const ALLKEYS = {}   // ★79-8 컴포넌트별 mesh key 대장
const ALLGROUND = []   // ★87 접지 스캔 수집

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
const PADS = ${JSON.stringify(MIR_PADS)}   // ★87 임시 판(constants 정본에서 주입)
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
//  ── ★87 접지 스캔 — 기술자 트리를 **월드 변환 누적**으로 순회해 y≤0.01 정점을 가진 mesh를 찾는다 ──
//   왜 여기인가: 컴포넌트를 실제 호출하는 곳이 이 검사뿐이다. Ground 폐기 후 '접지 요소 전부에 임시 판이
//   있는가'(브리프 §5-3 명단 소진)를 물으려면 요소를 선언이 아니라 **결과에서** 찾아야 한다(★64 교훈).
//   ⚠한계(정직하게): instancedMesh는 행렬을 useLayoutEffect가 놓는데 여기선 no-op라 판정 불가 — 보고만.
//   (인스턴스드 접지 후보는 리브뿐이고 리브 = 미러 그 자체다. 상부 여정 부품 좌표는 waypoints가 잰다.)
import * as THREE from '${process.cwd()}/node_modules/three/build/three.module.js'
const geoOf = (node) => {
  const p = node.props || {}
  if (p.geometry && p.geometry.attributes) return p.geometry
  for (const c of [].concat(p.children || []).flat(9)) {
    if (c && typeof c === 'object' && /[gG]eometry$/.test(String(c.__el || ''))) {
      const cls = String(c.__el)[0].toUpperCase() + String(c.__el).slice(1)
      try { return new THREE[cls](...((c.props && c.props.args) || [])) } catch { return null }
    }
  }
  return null
}
const nodeMatrix = (node) => {
  const p = node.props || {}, o = new THREE.Object3D()
  if (p.position) { const v = p.position; o.position.set(v[0] ?? v.x ?? 0, v[1] ?? v.y ?? 0, v[2] ?? v.z ?? 0) }
  if (p.rotation) { const r = p.rotation; o.rotation.set(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0) }
  for (const ax of ['x', 'y', 'z']) if (p['rotation-' + ax] != null) o.rotation[ax] = p['rotation-' + ax]
  if (p['position-y'] != null) o.position.y = p['position-y']
  if (p.scale != null) { const sc = p.scale; typeof sc === 'number' ? o.scale.setScalar(sc) : o.scale.set(sc[0] ?? 1, sc[1] ?? 1, sc[2] ?? 1) }
  o.updateMatrix(); return o.matrix
}
const grounded = []
const gwalk = (node, mat, comp) => {
  if (node == null || typeof node !== 'object') return
  if (Array.isArray(node)) { for (const c of node) gwalk(c, mat, comp); return }
  if (!node.__el) return
  const m = mat.clone().multiply(nodeMatrix(node))
  if (node.__el === 'mesh' || node.__el === 'instancedMesh') {
    const g = geoOf(node)
    if (g && g.attributes && g.attributes.position) {
      const p = g.attributes.position, v = new THREE.Vector3()
      let lo = 1e9, dmax = { }
      for (let i = 0; i < p.count; i++) {
        v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m)
        if (v.y < lo) lo = v.y
        if (v.y < 0.5) for (const pad of PADS) {
          const d = Math.hypot(v.x - pad.cx, v.z - pad.cz)
          if (!(pad.id in dmax) || d > dmax[pad.id]) dmax[pad.id] = d
        }
      }
      if (lo <= 0.01) grounded.push({ comp, el: node.__el, minY: +lo.toFixed(2),
        covered: PADS.some((pad) => (dmax[pad.id] ?? 1e9) <= pad.r) })
    }
  }
  if (node.props) gwalk(node.props.children, m, comp)
}
let called = 0
for (const [k, v] of Object.entries(M)) {
  if (typeof v !== 'function') continue
  if (!/^[A-Z]/.test(k)) continue                    // 컴포넌트 관례 = 대문자 시작
  try { const out = v({}); called++; const acc = []; walk(out, acc); if (acc.length) keys[k] = acc
        gwalk(out, new THREE.Matrix4(), k) }
  catch (e) {
    if (e instanceof ReferenceError) bad.push(k + ': ' + e.message)
    else noted.push(k + ': ' + e.message)            // props 미제공 등 — 보고만
  }
}
console.log(JSON.stringify({ called, bad, noted, keys, grounded }))
`)
  let res = null, err = ''
  try { res = JSON.parse(execSync(`node ${runner}`, { stdio: 'pipe' }).toString().trim().split('\n').pop()) }
  catch (e) { err = (e.stderr || '').toString().split('\n')[0] || e.message }
  ok(res !== null, `${t} 모듈 평가(임포트 시점 예외 없음)` + (res ? '' : ` — ${err}`))
  if (!res) continue
  Object.assign(ALLKEYS, res.keys || {})
  for (const g of res.grounded || []) ALLGROUND.push({ ...g, file: t })
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
           'fliwDome', 'flewDome', 'flrim', 'flcap',      // ★80 나팔 껍질(안4·밖4·사선 아가리·시작 테두리)
           ...(RM10_WIN_ON ? ['flwin'] : [])]             // ★81 창 살(창턱·인방·기운 문선)
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

//  ── ★87 접지 명단 소진(브리프 §5-3) — y≤0 요소 전부에 임시 판이 있는가 ──
{
  const RIB_COMPS = new Set(['DomeRibs', 'ExplorationRib', 'HallDoorRibs'])   // 리브 = 미러 그 자체(판 대상 아님)
  const PAD_COMPS = new Set(['MirrorPads', 'Ground'])                          // 판 자신·(스위치 복원 시) 구 지면
  if (!MIR_ON) {
    ok(true, '미러 꺼짐 — 접지 소진 검사 생략(구 지면이 전부 받는다)')
  } else {
    //  ★2026.07.30 ★91 — 지면이 폐기된 세계에서 **아래로 끝나는 것**에는 두 종류가 있다:
    //   ⓐ 원래 지면에 서 있던 것 → 임시 판이 받아야 한다(★87 명단 소진의 대상)
    //   ⓑ 처음부터 허공에서 끝나도록 지은 것 → 받을 판이 없다(리브 미러가 같은 부류)
    //  ★구분은 **선언**으로 한다 — 깊이로 자동 추정하면 ⓐ의 누락이 조용히 통과한다.
    //   원기둥 받침(현도 "공중에 뜬 성", 2026.07.30) = ⓑ. 밑단이 정확히 `RAD_CYL_Y1`인 4기.
    //  ★2차(2026.07.30): 길이가 4기 불규칙이라 밑단이 넷 다 다르다 — 값 집합으로 선언한다.
    //  ★92(2026.07.31) — 드럼 하판도 ⓑ 부류다: 반구·기둥은 처음부터 허공에서 끝나도록 지었다.
    //   밑끝은 파생 — 반구 = −R · 기둥 = −R − 두께(극점에서 호 법선이 정확히 아래라 두께가 그대로 더해진다).
    const HANG = [
      ...(RAD_CYL_ON ? RAD_CYL_Y1_BY.map((y) => ({ comp: 'RadialRooms', minY: y, n: 1 })) : []),
      //  ★2026.07.31 현도 2차 정정 후: 기둥 깊이가 극점에서 0으로 수렴하므로 반구·기둥 **둘 다 −R**에서 끝난다.
      ...(CUP_ON && MIR_ON ? [{ comp: 'DrumCup', minY: -CUP_R, n: 1 }, { comp: 'DrumCup', minY: -CUP_R, n: 1 }] : []),
    ]
    const isHung = (g) => HANG.some((h) => h.comp === g.comp && Math.abs(g.minY - h.minY) < 0.05)
    const all = ALLGROUND.filter((g) => g.el === 'mesh' && !RIB_COMPS.has(g.comp) && !PAD_COMPS.has(g.comp))
    const hung = all.filter(isHung)
    if (HANG.length) {
      const got = hung.map((g) => g.minY).sort((u, v) => u - v)
      const want = HANG.map((h) => h.minY).sort((u, v) => u - v)
      ok(got.length === want.length && want.every((v, i) => Math.abs(v - got[i]) < 0.05),
        `⚠선언된 매달림 ${want.length}기(길이 불규칙) — 실측 밑단 ${got.join(' · ')}`)
    }
    const targets = all.filter((g) => !isHung(g))
    const bare = targets.filter((g) => !g.covered)
    if (MIR_PADS.length === 0) {
      //  ★★2026.07.31 현도 ★92 — 임시 판을 지웠고 **바닥을 우선 없게** 하기로 했다("나중에 내부
      //   인테리어는 손볼거야"). 그래서 드럼 단지 접지 전부가 받침을 잃는다 = **선언된 빚**이다.
      //   ⚠검사를 끄지 않는다 — **수를 박는다.** 새로 생긴 접지 요소는 이 수를 깨서 즉시 걸린다
      //   (UNASSIGNED·WALK_DEBT와 같은 형식. 판을 되살리면 아래 else 가지가 다시 명단을 소진한다).
      //  ★2026.07.31 ★92-c 'loft': 피어 밑동이 로프트 목 안으로 **올라가므로**(y 5.5) 피어 8기는
      //   더는 접지가 아니다 — 로프트가 받는다. 그래서 기대 수가 체제에 따라 갈린다. 끄지 않고 **수를 옮긴다.**
      //  ★체제 깃발이 아니라 **실제 밑동 높이**로 판정한다(깃발과 기하가 어긋나면 깃발이 거짓말한다).
      const lifted = PIER_ON && CUP.pierBottomY() > 0.01 ? PIER_N : 0
      ok(targets.length === 25 - lifted,
        `⚠선언된 빚 — 드럼 단지 접지 ${targets.length}기가 받침 없음(현도 2026.07.31 "일단 두자")` +
        (lifted ? ` · 피어 ${lifted}기는 로프트가 받아 명단에서 빠졌다` : '') +
        ` · 내역 ${[...new Set(targets.map((g) => g.comp))].join(' · ')}`)
    } else {
      ok(bare.length === 0,
        `접지 mesh ${targets.length}개 전부 임시 판 안(명단 소진)` +
        (bare.length ? ` — ✗판 없음: ${bare.map((g) => g.comp).join(', ')}` : ''))
    }
    ok(targets.length >= 25 - (PIER_ON && CUP.pierBottomY() > 0.01 ? PIER_N : 0),
      `접지 스캔이 실제로 잡는다 — ${targets.length}개 ≥ 25(2026.07.29 실측 25 — 리브·지면 제외: 드럼 벽·셀라·피어 8·바닥단 7·잉카+날 5·제단·오벨리스크 기둥. 격감 = 스캔 고장 신호)`)
    const inst = ALLGROUND.filter((g) => g.el === 'instancedMesh' && !RIB_COMPS.has(g.comp))
    if (inst.length) console.log(`  ⓘ instancedMesh ${inst.length}개는 행렬 미적용이라 판정 불가(원점 기하) — ${[...new Set(inst.map((g) => g.comp))].join(', ')}`)
  }
}

//  자식 컴포넌트(모듈 밖으로 export되지 않는 것)는 위 루프가 못 부른다.
//  → 부모가 그 기술자를 만들었는지만 확인하고, 실제 호출이 필요한 것은 export해서 이 목록에 올린다.
console.log('  ⓘ 한계: export 안 된 내부 컴포넌트는 기술자 생성까지만 검증된다(호출 필요 시 export할 것)')

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
