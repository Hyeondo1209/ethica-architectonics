// _probe_exit.mjs — 빛 구획 '출구 통로·나팔' 개구 실측표(2026.09.25 · 측정 전용 · 앱 무접촉)
//  좌표 = 등불 방 로컬(Dome.jsx LampRoom 그룹 안 · +x 반경 바깥 · y 월드)
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import * as K from './constants.js'
import { buildFlareShell, flarePoint, flareSection, floorSmooth, stairProfile } from './exitFlareGeometry.js'

const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2)
const deg = (r) => f2(r * 180 / Math.PI)
const L = K.RM10_FLARE_LEN, TB = K.RM10_FLARE_TB, uB = L * TB

console.log('── A. 반원호 구간(방 쪽 문 → 나팔 시작) ──')
const th0 = K.RM10_EXIT_TH0, th1 = K.RM10_ARC_TH1
console.log(`방위 ${deg(th0)}° → ${deg(th1)}° (Δ ${deg(th1 - th0)}°) · 중심선 r ${f2(K.RM10_FLARE_RCL)} · 길이 ${f2(K.RM10_FLARE_RCL * (th1 - th0))}m`)
console.log(`바닥 y ${f2(K.RM10_EXIT_FLOOR_Y)} · 천장 y ${f2(K.RM10_EXIT_ROOF_Y)} · 폭 ${f2(K.RM10_EXIT_W)} (안벽 = 방 원뿔 바깥면 · 바깥 r ${f2(K.RM10_EXIT_ROUT)})`)
console.log(`방 쪽 문: 방위 ${deg(K.RM10_EXIT_TH)}° · 폭 ${f2(K.RM10_EXIT_DOOR_W)} · 높이 RM10_DOOR_H ${f2(K.RM10_DOOR_H)} · 반원호 구간 개구 = 이 문 하나(창 없음)`)

console.log('\n── B. 나팔 ──')
const sec0 = flareSection(0), secB = flareSection(TB), sec1 = flareSection(1)
console.log(`길이 ${f2(L)} · 낮은 구간 u 0~${f2(uB)} (평지 y ${f2(K.RM10_EXIT_FLOOR_Y)}) · 터짐 구간 ${f2(uB)}~${f2(L)} (${f2(L - uB)} · 계단 상승 ${f2(K.RM10_FLARE_RISE)})`)
console.log(`단면 폭×층고: 시작 ${f2(sec0.a0 * 2)}×${f2(sec0.h)} · 터짐 시작 ${f2(secB.a0 * 2)}×${f2(secB.h)} · 아가리 ${f2(sec1.a0 * 2)}×${f2(sec1.h)}`)
console.log(`회전 ${deg(K.RM10_FLARE_SWEEP)}° · 반경 ${K.RM10_FLARE_R} · +N = 뒤집기 중심 쪽(곡선 안쪽 벽 = 창 벽)`)
const pm = flarePoint(K.RM10_FLARE_SWEEP)
console.log(`아가리: 중심 로컬 (${f2(pm.x)}, ${f2(K.RM10_FLARE_MY)}, ${f2(pm.z)}) · 바닥 y ${f2(K.RM10_FLARE_MY)} · 천장 y ${f2(K.RM10_FLARE_MY + sec1.h)} · 면적 ${f2(sec1.a0 * 2 * sec1.h)}㎡ · 진행 방향 (${f2(pm.tx)}, ${f2(pm.tz)})`)

console.log('\n── C. 슬릿 창(RM10_WIN_MODE = ' + K.RM10_WIN_MODE + ') ──')
let aSum = 0
for (const w of K.rm10Windows()) {
  const p = flarePoint(K.RM10_FLARE_SWEEP * ((w.u0 + w.u1) / 2 / L))
  const a = w.w * K.RM10_WIN_SLIT_H; aSum += a
  console.log(`#${w.k} u ${f2(w.u0)}~${f2(w.u1)} (폭 ${f2(w.w)}) · 창턱 y ${f2(K.RM10_EXIT_FLOOR_Y + K.RM10_WIN_SILL)} · 위턱 y ${f2(K.RM10_EXIT_FLOOR_Y + K.RM10_WIN_SILL + K.RM10_WIN_SLIT_H)} · 면적 ${f2(a)}㎡ · 단면 폭 ${f2(flareSection((w.u0 + w.u1) / 2 / L).a0 * 2)}`)
}
console.log(`슬릿 합계 ${f2(aSum)}㎡ ↔ 아가리 ${f2(sec1.a0 * 2 * sec1.h)}㎡ (비 ${f2(sec1.a0 * 2 * sec1.h / aSum)}배) · 슬릿은 전부 낮은 구간(u < ${f2(uB)})`)

console.log('\n── D. 아가리 가시성(나팔 셸만 가림막 · 눈높이 1.6 · 중심선 · 아가리 격자 24×12) ──')
const meshes = buildFlareShell()
const geos = meshes.map((m) => m.geo.index ? m.geo.toNonIndexed() : m.geo)
const all = []
for (const g of geos) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i++) all.push(p[i]) }
const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(all, 3))
const bvh = new MeshBVH(G), M = new THREE.Mesh(G, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
M.geometry.boundsTree = bvh
M.raycast = (rc, hits) => { const h = bvh.raycastFirst(rc.ray, THREE.DoubleSide); if (h) hits.push(h) }
const rc = new THREE.Raycaster(); rc.firstHitOnly = true
// ⚠도구 자기검증: 아가리 바로 앞(u = L − 0.5)은 100% 보여야 하고, 창 벽 밖에서 쏜 광선은 벽에 맞아야 한다
const mouthPts = []
for (let i = 0; i < 24; i++) for (let j = 0; j < 12; j++) {
  const off = -sec1.b0 + (sec1.a0 + sec1.b0) * (i + 0.5) / 24
  const y = K.RM10_FLARE_MY + sec1.h * (j + 0.5) / 12
  mouthPts.push(new THREE.Vector3(pm.x + off * pm.nx, y, pm.z + off * pm.nz))
}
function visFrac(e) {
  let v = 0
  for (const q of mouthPts) {
    const d = q.clone().sub(e), dist = d.length(); d.normalize()
    rc.set(e, d); rc.far = dist - 0.05
    const h = []; M.raycast(rc, h)
    if (!h.length || h[0].distance > dist - 0.05) v++
  }
  return v / mouthPts.length
}
{ // 자기검증 ②: 벽 밖 점 → 아가리 = 가려져야
  const p = flarePoint(K.RM10_FLARE_SWEEP * 0.5), s = flareSection(0.5)
  const out = new THREE.Vector3(p.x + (s.a0 + 3) * p.nx, K.RM10_EXIT_FLOOR_Y + 1.6, p.z + (s.a0 + 3) * p.nz)
  console.log(`도구 검증: 아가리 앞 0.5m = ${f2(visFrac(new THREE.Vector3(pm.x - 0.5 * pm.tx, K.RM10_FLARE_MY + 1.6, pm.z - 0.5 * pm.tz)) * 100)}% (기대 100) · 창 벽 3m 밖 = ${f2(visFrac(out) * 100)}% (기대 ≈0)`)
}
const sp = stairProfile().samples
const yAt = (u) => { let y = sp[0].y; for (const s of sp) { if (s.u <= u + 1e-9) y = s.y; else break } return y }
const rows = []
for (let u = 0; u <= L + 1e-6; u += L / 24) {
  const t = u / L, p = flarePoint(K.RM10_FLARE_SWEEP * t), s = flareSection(t)
  const res = []
  for (const off of [s.a0 * 0.8, 0, -s.b0 * 0.8]) {
    const e = new THREE.Vector3(p.x + off * p.nx, yAt(u) + 1.6, p.z + off * p.nz)
    res.push(visFrac(e))
  }
  rows.push(`u ${f2(u).padStart(6)}${u <= uB ? ' 낮음' : ' 터짐'} · 창벽쪽 ${f2(res[0] * 100).padStart(6)}% · 중심 ${f2(res[1] * 100).padStart(6)}% · 바깥벽쪽 ${f2(res[2] * 100).padStart(6)}%`)
}
console.log(rows.join('\n'))

console.log('\n── E. 나팔 셸 삼각형 통계(세분 폭발 예측 · 규율 36) ──')
let tot = 0
for (const m of meshes) {
  const g = m.geo, p = g.attributes.position, ix = g.index
  const nT = ix ? ix.count / 3 : p.count / 3
  let emax = 0, amin = Infinity
  const v = (k) => new THREE.Vector3().fromBufferAttribute(p, ix ? ix.getX(k) : k)
  for (let t = 0; t < nT; t++) {
    const a = v(3 * t), b = v(3 * t + 1), c = v(3 * t + 2)
    const e = [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)]
    emax = Math.max(emax, ...e)
  }
  tot += nT
  console.log(`${m.key.padEnd(10)} 삼각형 ${String(nT).padStart(5)} · 최장변 ${f2(emax)}m`)
}
const sub = K.RM10L_SUBDIV ?? K.CLF_SUBDIV
console.log(`합계 ${tot} · 정점색 목표 해상도(SUBDIV) ${sub}`)
