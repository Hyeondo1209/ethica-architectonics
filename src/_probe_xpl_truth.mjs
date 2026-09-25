// _probe_xpl_truth.mjs — ★241 빛 구획 X 모델 ↔ 광선 참값 대조(측정 전용 · 앱 무접촉)
//  참값 = 실제 나팔 셸(buildFlareShell 정본) + 반원호 면(Dome ★79-5 식 재구성: 원뿔 바깥면·바깥벽·바닥 링·지붕 링·끝캡) BVH로
//   발광면 위 층화 표본(형태계수 cosθr·cosθe/(πd²)·dA)을 광선 가시로 적분. 모델 = lightingModel.xplRawAt(해석 다각형 · 반공간 · 가시율 표).
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import * as K from './constants.js'
import * as LM from './lightingModel.js'
import { buildFlareShell, flarePoint, flareSection } from './exitFlareGeometry.js'
const F = LM.xplFrame(), S = LM.xplSpec()
// ── 가림막 ──
const tris = []
for (const m of buildFlareShell()) { const g = m.geo.toNonIndexed(), p = g.attributes.position.array; for (let i = 0; i < p.length; i++) tris.push(p[i]) }
const quad = (a, b, c, d) => tris.push(...a, ...b, ...c, ...a, ...c, ...d)
const P = (r, th, y) => [r * Math.cos(th), y, r * Math.sin(th)]
const N = 300, th0 = F.th0, th1 = F.th1, y0 = F.y0 + 0.02, y1 = F.y1, rc = (y) => K.rm10R(y) + K.RM10_CONE_T
const Fr = LM.rm10lFrame()
for (let i = 0; i < N; i++) { const a = th0 + (th1 - th0) * i / N, b = th0 + (th1 - th0) * (i + 1) / N, mid = (a + b) / 2
  const inDoor = mid > Fr.xth0 && mid < Fr.xth1
  if (!inDoor) quad(P(rc(y0), a, y0), P(rc(y0), b, y0), P(rc(y1), b, y1), P(rc(y1), a, y1))            // 원뿔 바깥면(문 자리 빈칸)
  else quad(P(rc(y0 + K.RM10_DOOR_H), a, y0 + K.RM10_DOOR_H), P(rc(y0 + K.RM10_DOOR_H), b, y0 + K.RM10_DOOR_H), P(rc(y1), b, y1), P(rc(y1), a, y1))   // 문 위 인방 벽
  quad(P(F.rO, a, y0), P(F.rO, b, y0), P(F.rO, b, y1), P(F.rO, a, y1))                                 // 바깥벽
  quad(P(rc(y0), a, F.y0), P(F.rO, a, F.y0), P(F.rO, b, F.y0), P(rc(y0), b, F.y0))                     // 바닥
  quad(P(rc(y1), a, y1), P(F.rO, a, y1), P(F.rO, b, y1), P(rc(y1), b, y1)) }                           // 지붕
quad(P(rc(y0), th0, F.y0), P(F.rO, th0, F.y0), P(F.rO, th0, y1), P(rc(y1), th0, y1))                   // 끝캡
const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3)); const bvh = new MeshBVH(G)
const ray = new THREE.Ray(), o = new THREE.Vector3(), dv = new THREE.Vector3()
const visible = (a, b) => { o.set(...a); dv.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const d = dv.length(); dv.normalize(); ray.set(o, dv); const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, d - 2e-3); return !h }
// 도구 자기검증: 벽 밖 → 안 = 가림 · 안 → 안(같은 단면) = 보임
{ const p = flarePoint(0.5 * F.SW), s = flareSection(0.5), yy = F.y0 + 3   // ⚠첫 판 y0+2는 슬릿 #4 높이(228.03~228.83)라 광선이 창으로 빠졌다
  const a = [p.x, yy, p.z], b = [p.x + (s.a0 + 2) * p.nx, yy, p.z + (s.a0 + 2) * p.nz], c = [p.x - 0.8 * s.b0 * p.nx, yy, p.z - 0.8 * s.b0 * p.nz]
  console.log(`도구 검증: 안→벽 밖 ${visible(a, b) ? '보임 ✗' : '가림 ✓'} · 안→안 ${visible(a, c) ? '보임 ✓' : '가림 ✗'}`) }
// ── 참값 적분 ──
function truthPoly(q, n, poly, sn, ns) {
  const [a, b, , d] = poly, eu = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ev = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]
  const c = poly[2], ew = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  let E = 0
  for (let i = 0; i < ns; i++) for (let j = 0; j < ns; j++) { const s = (i + 0.5) / ns, t = (j + 0.5) / ns
    // 사다리꼴 쌍선형 표본(평면 사각형)
    const top = [d[0] + (c[0] - d[0]) * s, d[1] + (c[1] - d[1]) * s, d[2] + (c[2] - d[2]) * s], bot = [a[0] + eu[0] * s, a[1] + eu[1] * s, a[2] + eu[2] * s]
    const x = [bot[0] + (top[0] - bot[0]) * t, bot[1] + (top[1] - bot[1]) * t, bot[2] + (top[2] - bot[2]) * t]
    const lenB = Math.hypot(...eu), lenT = Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]), h = Math.hypot(...ev)
    const dA = (lenB + (lenT - lenB) * t) / ns * (h / ns)                                              // 근사 면적 요소(평행 변 사다리꼴)
    const r = [x[0] - q[0], x[1] - q[1], x[2] - q[2]], d2 = r[0] ** 2 + r[1] ** 2 + r[2] ** 2, dd = Math.sqrt(d2)
    const cr = (r[0] * n[0] + r[1] * n[1] + r[2] * n[2]) / dd, ce = -(r[0] * sn[0] + r[1] * sn[1] + r[2] * sn[2]) / dd
    if (cr <= 0 || ce <= 0) continue
    if (!visible(q, x)) continue
    E += cr * ce * dA / d2 }                                                                           // 휘도 1의 조도(polyIrradiance와 같은 단위 = π·형태계수)
  return E
}
function truthAt(q, n) {
  let win = 0, mouth = 0, door = 0
  for (const e of S.E.slit) win += truthPoly(q, n, e.v, e.n, 6)
  for (const e of S.E.door) door += truthPoly(q, n, e.v, e.n, 6)
  { const M = S.E.mouth[0], NU = 16, NV = 10                                                       // 아가리 = 참값 쪽은 셀 16×10 · 셀마다 6×6 표본 · 광선 가시
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) mouth += truthPoly(q, n, [LM.xplMouthPt(M, i / NU, j / NV), LM.xplMouthPt(M, (i + 1) / NU, j / NV), LM.xplMouthPt(M, (i + 1) / NU, (j + 1) / NV), LM.xplMouthPt(M, i / NU, (j + 1) / NV)], M.n, 6) }
  return { win, mouth, door }
}
// ── 수광점 ──
const pts = []
const arcPt = (thD, where) => { const th = thD * Math.PI / 180, ym = (y0 + y1) / 2
  if (where === 'out') return { nm: `호${thD}° 바깥벽`, q: P(F.rO - 0.02, th, y0 + 1.6), n: [-Math.cos(th), 0, -Math.sin(th)] }
  if (where === 'floor') return { nm: `호${thD}° 바닥`, q: P((rc(y0) + F.rO) / 2, th, F.y0 + 0.02), n: [0, 1, 0] }
  if (where === 'roof') return { nm: `호${thD}° 지붕`, q: P((rc(y1) + F.rO) / 2, th, y1 - 0.02), n: [0, -1, 0] } }
for (const t of [92, 100, 110, 125, 160, 215, 228]) for (const w of ['out', 'floor', 'roof']) pts.push(arcPt(t, w))
const flPt = (u, where) => { const p = flarePoint(u / F.R), yF = LM.xplFloorAt(u, F), B = LM.xplFlareBounds(u, yF + 1.6, F), yR = B.yR
  if (where === 'nW') return { nm: `u${u} −N벽`, q: [p.x + (-B.b + 0.02) * p.nx, yF + 1.6, p.z + (-B.b + 0.02) * p.nz], n: [p.nx, 0, p.nz] }
  if (where === 'pW') return { nm: `u${u} +N벽`, q: [p.x + (B.a - 0.02) * p.nx, yF + 1.0, p.z + (B.a - 0.02) * p.nz], n: [-p.nx, 0, -p.nz] }
  if (where === 'floor') return { nm: `u${u} 바닥`, q: [p.x, yF + 0.02, p.z], n: [0, 1, 0] }
  if (where === 'roof') { const Bt = LM.xplFlareBounds(u, yR - 0.02, F); return { nm: `u${u} 천장`, q: [p.x, Bt.yR - 0.02, p.z], n: [0, -1, 0] } } }
for (const u of [3, 7, 13, 22, 31, 40, 48, 56, 62, 68, 76, 84]) for (const w of ['nW', 'floor', 'roof', 'pW']) pts.push(flPt(u, w))
const f = (v) => v.toExponential(2).padStart(9)
let worst = { win: 0, mouth: 0, door: 0 }, wc = { d: 0, nm: '' }
const rel = (m, t, ref) => Math.abs(m - t) / ref
const terms = (r) => ({ win: r.win / S.skyRef, mouth: r.mouth / S.skyRef, door: r.door / S.doorRef })
console.log('수광점                  슬릿 모델/참값          아가리 모델/참값        문 모델/참값')
for (const p of pts) {
  const m = LM.xplRawAt(p.q, p.n, S), t = truthAt(p.q, p.n)
  for (const k of ['win', 'mouth', 'door']) { const ref = k === 'door' ? S.doorRef : S.skyRef; worst[k] = Math.max(worst[k], rel(m[k], t[k], ref)) }
  const cm = LM.xplCompose(terms(m)), ct = LM.xplCompose(terms(t)); if (Math.abs(cm - ct) > wc.d) wc = { d: Math.abs(cm - ct), nm: p.nm }
  console.log(`${p.nm.padEnd(18)} ${f(m.win)} ${f(t.win)}   ${f(m.mouth)} ${f(t.mouth)}   ${f(m.door)} ${f(t.door)}   값 ${cm.toFixed(3)}/${ct.toFixed(3)}`)
}
console.log(`합성 값 최대 차 ${wc.d.toFixed(3)} (${wc.nm}) · 기본 노브`)
console.log(`최대 오차(기준 조도 대비): 슬릿 ${worst.win.toFixed(3)} · 아가리 ${worst.mouth.toFixed(3)} · 문 ${worst.door.toFixed(3)}  (skyRef ${S.skyRef.toExponential(3)} · doorRef ${S.doorRef.toExponential(3)})`)
