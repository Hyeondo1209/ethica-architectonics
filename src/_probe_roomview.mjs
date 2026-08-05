// _probe_roomview.mjs — ★110 진단: 정의·공리 방에서 **위를 올려다본** 그림을 출처별로 색칠해 찍는다.
//  ⚠이 도구는 `render_views`의 room 사각지대를 뚫으려는 진단용이다. 나선 3종은 **실제 모듈**을 부르고,
//   셸·디스크·빛우물은 Room.jsx의 인자를 **복제**한다(복제분은 아래 REPLICA 표시 — 정본 아님).
//  사용: node src/_probe_roomview.mjs "x,y,z,yawDeg,pitchDeg" out.png [fov]
import { buildDisc } from './discGeometry.js'
import fs from 'fs'
import { PNG } from 'pngjs'
import * as THREE from 'three'
import { buildSpiralMass, buildSpiralColumns, buildSpiralBeams } from './axiomSpiralGeometry.js'
import { pitSpec } from './defPitGeometry.js'
import { buildAxiomVaults } from './axiomVaultGeometry.js'
import {
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_OCULUS, ROOM_CEIL_Y, ROOM_CYL_TOP,
  ROOM_LAND_R, ROOM_DISC_HOLE, ROOM_WELL_RT, ROOM_STAIR_SLAB,
  ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN, COR_Y0, COR_THICK,
  RAD_ANG0, RAD_T_IN, RAD_T_HW, RAD_FLOOR_Y, RAD_R, RAD_UNDER_LIP,
  SHAFT_TOP_R, SHAFT_TOP_Y, POOL_R, PIT_ON, PIT_SHAFT_DROP, DAIS_H,
} from './constants.js'

const arg = (process.argv[2] || '0.4,75.2,-5.8,-516.8,74').split(',').map(Number)
const [ex, ey, ez, yawD, pitchD] = arg
const out = process.argv[3] || '_roomview.png'
const FOV = Number(process.argv[4] || 70)
const W = Number(process.env.PW || 1100), H = Number(process.env.PH || 700)

//  출처별 색 — 슬라이버가 무엇인지 눈으로 바로 갈리게 한다
const SRC = [
  ['나선 매스',   [214, 171, 104]],
  ['판 기둥',     [120, 200, 255]],
  ['벽 보',       [255,  90,  90]],   // ★★찌꺼기 후보 1
  ['착지 디스크', [194, 160,  98]],
  ['빛우물 원뿔', [151, 120,  78]],
  ['방 셸',       [ 60,  50,  36]],
  ['빛 샤프트',   [255, 240, 200]],
  ['방사터널 바닥판', [ 90, 255, 120]],
  ['공리 볼트',   [226, 156,  92]],   // ★111
]
const tris = []
const pushGeo = (g, si, mat) => {
  const p = g.getAttribute('position').array
  const v = new THREE.Vector3()
  for (let t = 0; t < p.length / 9; t++) {
    const b = t * 9, vs = []
    for (let k = 0; k < 3; k++) {
      v.set(p[b + k * 3], p[b + k * 3 + 1], p[b + k * 3 + 2])
      if (mat) v.applyMatrix4(mat)
      vs.push([v.x, v.y, v.z])
    }
    tris.push({ v: vs, s: si })
  }
}
const nonIndexed = (g) => g.index ? g.toNonIndexed() : g

// ── 실제 모듈(정본) ─────────────────────────────────────────────
pushGeo(buildSpiralMass(),    0)
pushGeo(buildSpiralColumns(), 1)
pushGeo(buildSpiralBeams(),   2)
{ const gV = buildAxiomVaults(); if (gV) pushGeo(gV, 8) }   // ★111 공리 볼트

// ── 착지 디스크 — ★118: REPLICA 폐기, 정본 호출(사본이 거짓말하던 자리) ──
{
  pushGeo(nonIndexed(buildDisc()), 3, new THREE.Matrix4())
}
// ── REPLICA: 빛우물 원뿔대(문 CSG 생략) ─────────────────────────
{
  const yBot = ROOM_CEIL_Y - 3, yTop = ROOM_CYL_TOP
  const g = nonIndexed(new THREE.CylinderGeometry(ROOM_WELL_RT, ROOM_LAND_R, yTop - yBot, 96, 1, true))
  pushGeo(g, 4, new THREE.Matrix4().makeTranslation(0, (yBot + yTop) / 2, 0))
}
// ── REPLICA: 방 셸(상·하반) ─────────────────────────────────────
for (const args of [[0, Math.PI * 2, ROOM_OCULUS, Math.PI / 2 - ROOM_OCULUS], [0, Math.PI * 2, Math.PI / 2, Math.PI / 2]]) {
  const g = nonIndexed(new THREE.SphereGeometry(1, 48, 28, ...args))
  const m = new THREE.Matrix4().makeScale(ROOM_R, ROOM_HEIGHT, ROOM_R)
  m.premultiply(new THREE.Matrix4().makeTranslation(0, ROOM_FLOOR_Y, 0))
  pushGeo(g, 5, m)
}
// ── REPLICA: 빛 샤프트 두 절 — ⚠앱에서는 **반투명 가짜 볼륨**이다. 진단에서는 시야를 막으므로
//   기본 생략하고, 넷째 인자에 'shaft'를 주면 그린다.
if (process.argv[5] === 'shaft') {
  const a = nonIndexed(new THREE.CylinderGeometry(ROOM_WELL_RT - 0.3, SHAFT_TOP_R - 0.3, ROOM_CYL_TOP - SHAFT_TOP_Y, 40, 1, true))
  pushGeo(a, 6, new THREE.Matrix4().makeTranslation(0, (ROOM_CYL_TOP + SHAFT_TOP_Y) / 2, 0))
  const SHAFT_BOT_Y = (PIT_ON && PIT_SHAFT_DROP) ? pitSpec().yBot : ROOM_FLOOR_Y + DAIS_H
  const b = nonIndexed(new THREE.CylinderGeometry(SHAFT_TOP_R, POOL_R, SHAFT_TOP_Y - SHAFT_BOT_Y, 40, 1, true))
  pushGeo(b, 6, new THREE.Matrix4().makeTranslation(0, (SHAFT_TOP_Y + SHAFT_BOT_Y) / 2, 0))
}

// ── REPLICA: 방사 4방 터널 **바닥판** (Radial.jsx 인자 복제 — 디스크 밑으로 0.29 내려온다) ──
for (let k = 0; k < 4; k++) {
  const ang = RAD_ANG0 + k * Math.PI / 2
  const s1 = RAD_R                                  // 꽃잎 중심까지(근사 — 방 안 구간만 보면 충분)
  const midF = (Math.max(RAD_T_IN, ROOM_LAND_R + RAD_UNDER_LIP) + s1) / 2
  const lenF = s1 - Math.max(RAD_T_IN, ROOM_LAND_R + RAD_UNDER_LIP)
  const g = nonIndexed(new THREE.BoxGeometry(lenF, COR_THICK, RAD_T_HW * 2))
  const m = new THREE.Matrix4().makeRotationY(-ang)
  m.premultiply(new THREE.Matrix4().makeTranslation(midF * Math.cos(ang), RAD_FLOOR_Y, midF * Math.sin(ang)))
  pushGeo(g, 7, m)
}

// ── 래스터(render_views와 같은 규약) ────────────────────────────
const yaw = yawD * Math.PI / 180, pitch = pitchD * Math.PI / 180, eye = [ex, ey, ez]
const f  = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]
const zA = [-f[0], -f[1], -f[2]]
let xA = [zA[2], 0, -zA[0]]; const xl = Math.hypot(...xA); xA = xA.map(v => v / (xl || 1))
const yA = [zA[1] * xA[2] - zA[2] * xA[1], zA[2] * xA[0] - zA[0] * xA[2], zA[0] * xA[1] - zA[1] * xA[0]]
const focal = (H / 2) / Math.tan(FOV / 2 * Math.PI / 180), NEAR = 0.2
const zbuf = new Float32Array(W * H).fill(Infinity)
const smap = new Int8Array(W * H).fill(-1)
const img = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) { img[i * 4] = 8; img[i * 4 + 1] = 7; img[i * 4 + 2] = 5; img[i * 4 + 3] = 255 }
const Lg = (() => { const v = [0.3, 1, 0.2], l = Math.hypot(...v); return v.map(x => x / l) })()
const cam = (p) => { const r = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]
  return [r[0] * xA[0] + r[1] * xA[1] + r[2] * xA[2], r[0] * yA[0] + r[1] * yA[1] + r[2] * yA[2], r[0] * zA[0] + r[1] * zA[1] + r[2] * zA[2]] }

for (const t of tris) {
  const e1 = [t.v[1][0] - t.v[0][0], t.v[1][1] - t.v[0][1], t.v[1][2] - t.v[0][2]]
  const e2 = [t.v[2][0] - t.v[0][0], t.v[2][1] - t.v[0][1], t.v[2][2] - t.v[0][2]]
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
  const nl = Math.hypot(...n); if (nl < 1e-9) continue; n = n.map(v => v / nl)
  //  ★CULL=1 — 앱(단면 렌더)과 같은 후면 컬링. 감김이 뒤집힌 삼각형은 앱처럼 사라진다(★111 사고 재현용)
  if (process.env.CULL === '1') {
    const toEye = [eye[0] - t.v[0][0], eye[1] - t.v[0][1], eye[2] - t.v[0][2]]
    if (n[0] * toEye[0] + n[1] * toEye[1] + n[2] * toEye[2] <= 0) continue
  }
  const sh = Math.min(1, 0.38 + 0.70 * Math.abs(n[0] * Lg[0] + n[1] * Lg[1] + n[2] * Lg[2]))
  const base = SRC[t.s][1], col = [base[0] * sh, base[1] * sh, base[2] * sh]
  let poly = t.v.map(cam), o = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const ain = a[2] <= -NEAR, bin = b[2] <= -NEAR
    if (ain) o.push(a)
    if (ain !== bin) { const s = (-NEAR - a[2]) / (b[2] - a[2]); o.push([a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]), -NEAR]) }
  }
  if (o.length < 3) continue
  for (let k = 1; k < o.length - 1; k++) {
    const P = [o[0], o[k], o[k + 1]].map(p => [W / 2 + p[0] * focal / (-p[2]), H / 2 - p[1] * focal / (-p[2]), -p[2]])
    const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])
    if (Math.abs(area) < 1e-6) continue
    const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])))
    const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const w0 = ((P[1][0] - x) * (P[2][1] - y) - (P[2][0] - x) * (P[1][1] - y)) / area
      const w1 = ((P[2][0] - x) * (P[0][1] - y) - (P[0][0] - x) * (P[2][1] - y)) / area
      const w2 = 1 - w0 - w1
      if (w0 < 0 || w1 < 0 || w2 < 0) continue
      const z = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2], idx = y * W + x
      if (z < zbuf[idx]) { zbuf[idx] = z; smap[idx] = t.s
        img[idx * 4] = col[0]; img[idx * 4 + 1] = col[1]; img[idx * 4 + 2] = col[2] }
    }
  }
}
const png = new PNG({ width: W, height: H }); img.copy(png.data)
fs.writeFileSync(out, PNG.sync.write(png))
const cnt = SRC.map(() => 0)
for (const s of smap) if (s >= 0) cnt[s]++
console.log(`wrote ${out}  eye ${eye} yaw ${yawD} pitch ${pitchD} fov ${FOV}`)
//  ★픽셀 질의 — 눈 없이 "이 좌표에 보이는 것이 무엇인가"를 답한다. PQ="x,y;x,y;..."
if (process.env.PQ) {
  console.log('픽셀 질의:')
  for (const q of process.env.PQ.split(';')) {
    const [qx, qy] = q.split(',').map(Number)
    const i = qy * W + qx
    const s = (qx >= 0 && qx < W && qy >= 0 && qy < H) ? smap[i] : -2
    console.log(`  (${qx}, ${qy}) → ${s < 0 ? '(배경/없음)' : SRC[s][0]}  거리 ${s < 0 ? '-' : zbuf[i].toFixed(2)}`)
  }
}
console.log('화면 점유(픽셀):')
SRC.forEach((s, i) => console.log(`  ${s[0].padEnd(12)} rgb(${s[1]}) ${String(cnt[i]).padStart(7)}`))

// ── 출처별 **연결 덩어리** 분석 — 화면에 몇 조각으로, 어디에 보이는가(눈 없이 판정하기 위함) ──
{
  const seen = new Int8Array(W * H)
  const blobs = []
  const st = []
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || smap[i] < 0) continue
    const s = smap[i]
    let n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0, zmin = Infinity, zmax = 0
    st.length = 0; st.push(i); seen[i] = 1
    while (st.length) {
      const j = st.pop(), jx = j % W, jy = (j / W) | 0
      n++; if (jx < x0) x0 = jx; if (jx > x1) x1 = jx; if (jy < y0) y0 = jy; if (jy > y1) y1 = jy
      if (zbuf[j] < zmin) zmin = zbuf[j]; if (zbuf[j] > zmax) zmax = zbuf[j]
      if (jx > 0     && !seen[j - 1] && smap[j - 1] === s) { seen[j - 1] = 1; st.push(j - 1) }
      if (jx < W - 1 && !seen[j + 1] && smap[j + 1] === s) { seen[j + 1] = 1; st.push(j + 1) }
      if (jy > 0     && !seen[j - W] && smap[j - W] === s) { seen[j - W] = 1; st.push(j - W) }
      if (jy < H - 1 && !seen[j + W] && smap[j + W] === s) { seen[j + W] = 1; st.push(j + W) }
    }
    if (n >= 30) blobs.push({ s, n, x0, x1, y0, y1, zmin, zmax })
  }
  console.log('\n연결 덩어리(30px 이상) — 출처별 개수:')
  SRC.forEach((sr, i) => {
    const b = blobs.filter(x => x.s === i)
    if (!b.length) return
    console.log(`  ${sr[0]}: ${b.length}조각`)
    b.sort((p, q) => q.n - p.n).slice(0, 12).forEach(x =>
      console.log(`     ${String(x.n).padStart(6)}px  화면 x${x.x0}~${x.x1} y${x.y0}~${x.y1} (${x.x1-x.x0}×${x.y1-x.y0})  거리 ${x.zmin.toFixed(1)}~${x.zmax.toFixed(1)}`))
  })
}
