// ★㊿ render_views.mjs — 셀프 렌더 검수 도구(개발 도구 — 배포·번들 무관, 티켓 무소모·웨이포인트 전례)
//  실제 소스 모듈의 기하를 웨이포인트 카메라에서 z-버퍼(순수 JS·GL 불필요)로 PNG에 굽는다.
//  ⚠용도 = 매싱·비례·틈 판단. 조명·재질·분위기 판단은 못 한다(그건 로컬·P2 몫).
//  ⚠충실도: 드럼 홀 권역 근사(벽 창 트임·프리즈 밴드·셀라 배경·리브 5·잉카·하강로) — CSG 세부(문·벽감·기단·갓) 생략.
//  사용: node src/render_views.mjs [wp-id ...]   (기본: view inca-west)  · 해상도 880×495(토큰 절약)
//  규율: 수치 스위트 green 이후에만 굽는다 · 형태 세션은 전달 전 셀프 검수 · 세션당 최대 2라운드.
import fs from 'fs'
import { PNG } from 'pngjs'
import * as THREE from 'three'
import * as C from './constants.js'
import { descentSpec, incaStairSpec, incaBladesSpec, drumPierAzimuths, descentPortSpec, portPrismTris, outwardTris } from './corridorStairsGeometry.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { WAYPOINTS, EYE } from './waypoints.js'

const tris = []
function addGeo(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const p = g.attributes.position.array
  for (let i = 0; i < p.length; i += 9)
    tris.push({ v: [[p[i], p[i+1], p[i+2]], [p[i+3], p[i+4], p[i+5]], [p[i+6], p[i+7], p[i+8]]], c: color })
}
const quad = (a, b, c2, d2, col) => { tris.push({ v: [a, b, c2], c: col }); tris.push({ v: [a, c2, d2], c: col }) }

// ── 하강로: 판 + ★㊿ 보 + 참 블록 (Corridor.jsx DescentPath와 동일 구축) ──
if (C.HALL_ENTRY === 'axial' || C.HALL_ENTRY === 'lateral') {
  const d = descentSpec(C.HALL_ENTRY)
  for (const pl of d.plates) {
    const g = new THREE.BoxGeometry(d.ds * 1.3, C.COR_RISE, C.DESC_HW * 2)
    g.rotateY(pl.rotY); g.translate(pl.x, pl.yTop - C.COR_RISE / 2, pl.z)
    addGeo(g, [194, 160, 98])
  }
  const sec = [[-C.DESC_HW, -C.DESC_GIRDER_TOP], [C.DESC_HW, -C.DESC_GIRDER_TOP],
               [C.DESC_HW * C.DESC_GIRDER_BWF, -C.DESC_GIRDER], [-C.DESC_HW * C.DESC_GIRDER_BWF, -C.DESC_GIRDER]]
  const S = d.samples
  const pt = (i, j) => { const q = S[i], [u, v] = sec[j]; return [q.x + u * -q.tz, q.y + v, q.z + u * q.tx] }
  for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < 4; j++)
    quad(pt(i, j), pt(i, (j + 1) % 4), pt(i + 1, (j + 1) % 4), pt(i + 1, j), [184, 154, 106])
  quad(pt(0, 3), pt(0, 2), pt(0, 1), pt(0, 0), [184, 154, 106])
  const e = S.length - 1
  quad(pt(e, 0), pt(e, 1), pt(e, 2), pt(e, 3), [184, 154, 106])
}
// ── 잉카(매스·판·넥서스·날 4 — 스모크와 동일) ──
{
  const spec = incaStairSpec(), { steps, arch, panel, cutX } = spec, Y0 = -0.3
  const ms = new THREE.Shape(); ms.moveTo(cutX, Y0); ms.lineTo(cutX, steps[0].yTop)
  for (const st of steps) { ms.lineTo(st.x0, st.yTop); ms.lineTo(st.x1, st.yTop) }
  const last = steps[steps.length - 1]; ms.lineTo(last.x1, arch[arch.length - 1].y)
  for (let i = arch.length - 1; i >= 0; i--) ms.lineTo(arch[i].x, arch[i].y)
  ms.lineTo(arch[0].x, Y0); ms.closePath()
  const mg = new THREE.ExtrudeGeometry(ms, { depth: C.INCA_W0, bevelEnabled: false })
  mg.translate(0, 0, -C.INCA_W0 / 2); addGeo(mg, [184, 154, 106])
  const ps = new THREE.Shape(); ps.moveTo(panel.x0, panel.yTop); ps.lineTo(panel.x1, panel.yTop); ps.lineTo(panel.x1, -0.3)
  for (let i = panel.under.length - 1; i >= 1; i--) ps.lineTo(panel.under[i].x, panel.under[i].y)
  ps.lineTo(panel.x0 + C.INCA_CHAMF, panel.yTop - panel.t); ps.lineTo(panel.x0, panel.yTop - panel.t + C.INCA_CHAMF); ps.closePath()
  const pg = new THREE.ExtrudeGeometry(ps, { depth: panel.w, bevelEnabled: false })
  pg.translate(0, 0, -panel.w / 2); addGeo(pg, [184, 154, 106])
  const bs = incaBladesSpec()
  const ns = new THREE.Shape(); ns.moveTo(bs.nexus[0].x, bs.nexus[0].z)
  for (let i = 1; i < bs.nexus.length; i++) ns.lineTo(bs.nexus[i].x, bs.nexus[i].z); ns.closePath()
  const ng = new THREE.ExtrudeGeometry(ns, { depth: C.INCA_PANEL_T, bevelEnabled: false })
  ng.rotateX(Math.PI / 2); ng.translate(0, bs.cutY + 0.04, 0); addGeo(ng, [184, 154, 106])
  for (const b of bs.blades.filter(b => !b.reach)) {
    const sh = new THREE.Shape(); sh.moveTo(b.s0, Y0); sh.lineTo(b.s0, bs.cutY)
    for (const st of b.steps) { sh.lineTo(st.s0, st.yTop); sh.lineTo(st.s1, st.yTop) }
    for (let i = b.under.length - 1; i >= 1; i--) sh.lineTo(b.under[i].s, b.under[i].y)
    sh.closePath()
    const g = new THREE.ExtrudeGeometry(sh, { depth: C.INCA_W0, bevelEnabled: false })
    g.translate(0, 0, -C.INCA_W0 / 2); g.rotateY(-b.az); g.translate(bs.ncx, 0, 0)
    addGeo(g, [184, 154, 106])
  }
}
// ── 드럼 근사: 벽(창 ±43° 트임) + 프리즈 밴드 + 빗면 천장 + 바닥 + 셀라 배경 ──
{
  const cx = C.COR_CX, R = C.COR_R, N = 120
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, am = (a0 + a1) / 2
    const p0 = [cx + R * Math.cos(a0), 0, R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), 0, R * Math.sin(a1)]
    const t0 = C.ceilY(p0[0]), t1 = C.ceilY(p1[0])
    const azm = Math.atan2(Math.sin(am), Math.cos(am)) * 180 / Math.PI
    if (Math.abs(azm) <= 43) quad([p0[0], 114, p0[2]], [p1[0], 114, p1[2]], [p1[0], t1, p1[2]], [p0[0], t0, p0[2]], [176, 148, 100])
    else quad(p0, p1, [p1[0], t1, p1[2]], [p0[0], t0, p0[2]], [184, 154, 106])
  }
  const ctr = [cx, C.ceilY(cx), 0]
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2
    const p0 = [cx + R * Math.cos(a0), 0, R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), 0, R * Math.sin(a1)]
    tris.push({ v: [[p0[0], C.ceilY(p0[0]), p0[2]], [p1[0], C.ceilY(p1[0]), p1[2]], ctr], c: [165, 144, 99] })
    tris.push({ v: [p0, p1, [cx, 0, 0]], c: [172, 162, 137] })
  }
  quad([298, 0, -62], [298, 0, 62], [298, 114, 62], [298, 114, -62], [178, 150, 103])
}
// ── ★53 기어 피어 8기(관통 피어는 관문 CSG) ──
{
  const ports = descentPortSpec(C.HALL_ENTRY), ev = new Evaluator(); ev.attributes = ['position']
  for (const th of drumPierAzimuths()) {
    const c = Math.cos(th), sn = Math.sin(th)
    const corner = (r, w) => [C.COR_CX + r * c - w * sn, r * sn + w * c]
    const V = [corner(C.COR_R + C.PIER_OUT, -C.PIER_HW), corner(C.COR_R + C.PIER_OUT, C.PIER_HW),
               corner(C.COR_R - C.PIER_DEPTH, C.PIER_HW), corner(C.COR_R - C.PIER_DEPTH, -C.PIER_HW)]
    const pos = []
    for (const q of V) pos.push(q[0], -0.5, q[1])
    for (const q of V) pos.push(q[0], C.ceilY(q[0]) + C.PIER_TOP_OVER, q[1])
    const idx = [4,5,6,4,6,7, 0,1,5,0,5,4, 1,2,6,1,6,5, 2,3,7,2,7,6, 3,0,4,3,4,7, 1,0,3,1,3,2]
    const flat = []
    for (const i of idx) flat.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
    let g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(outwardTris(flat), 3))
    const port = ports.find(p => Math.abs(((p.az - th + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1e-6)
    if (port) {
      const cut = new THREE.BufferGeometry()
      cut.setAttribute('position', new THREE.Float32BufferAttribute(portPrismTris(port), 3))
      const bA = new Brush(g); bA.updateMatrixWorld()
      const bB = new Brush(cut); bB.updateMatrixWorld()
      g = ev.evaluate(bA, bB, SUBTRACTION).geometry
    }
    addGeo(g, [171, 143, 94])
  }
}
// ── 리브 다섯(구면 경선 튜브) ──
for (const k of [-2, -1, 0, 1, 2]) {
  const phi = k / C.MERIDIANS * Math.PI * 2, M = 40, S = 10
  const ring = (u) => {
    const cu = Math.cos(u), su = Math.sin(u)
    const cpt = [C.R_BASE * cu * Math.cos(phi), C.R_BASE * su, C.R_BASE * cu * Math.sin(phi)]
    const n0 = [cu * Math.cos(phi), su, cu * Math.sin(phi)]
    const tg = [-su * Math.cos(phi), cu, -su * Math.sin(phi)]
    const bn = [tg[1] * n0[2] - tg[2] * n0[1], tg[2] * n0[0] - tg[0] * n0[2], tg[0] * n0[1] - tg[1] * n0[0]]
    return Array.from({ length: S }, (_, j) => {
      const t = j / S * Math.PI * 2, r = C.SHELL_RIB_R
      return [0, 1, 2].map(ax => cpt[ax] + r * (Math.cos(t) * n0[ax] + Math.sin(t) * bn[ax]))
    })
  }
  let prev = ring(-0.02)
  for (let i = 1; i <= M; i++) {
    const cur = ring(-0.02 + (i / M) * 0.82)
    for (let j = 0; j < S; j++) quad(prev[j], prev[(j + 1) % S], cur[(j + 1) % S], cur[j], [204, 186, 146])
    prev = cur
  }
}

function render(eye, yaw, pitch, W, H, name) {
  const f = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]
  const zA = [-f[0], -f[1], -f[2]]
  let xA = [zA[2], 0, -zA[0]]; const xl = Math.hypot(...xA); xA = xA.map(v => v / (xl || 1))
  const yA = [zA[1] * xA[2] - zA[2] * xA[1], zA[2] * xA[0] - zA[0] * xA[2], zA[0] * xA[1] - zA[1] * xA[0]]
  const focal = (H / 2) / Math.tan(35 * Math.PI / 180), NEAR = 0.3
  const zbuf = new Float32Array(W * H).fill(Infinity)
  const img = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) { img[i * 4] = 222; img[i * 4 + 1] = 216; img[i * 4 + 2] = 203; img[i * 4 + 3] = 255 }
  const L = (() => { const v = [0.45, 1, 0.3], l = Math.hypot(...v); return v.map(x => x / l) })()
  const cam = (p) => { const r = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]
    return [r[0] * xA[0] + r[1] * xA[1] + r[2] * xA[2], r[0] * yA[0] + r[1] * yA[1] + r[2] * yA[2], r[0] * zA[0] + r[1] * zA[1] + r[2] * zA[2]] }
  for (const t of tris) {
    const e1 = [t.v[1][0] - t.v[0][0], t.v[1][1] - t.v[0][1], t.v[1][2] - t.v[0][2]]
    const e2 = [t.v[2][0] - t.v[0][0], t.v[2][1] - t.v[0][1], t.v[2][2] - t.v[0][2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const nl = Math.hypot(...n); if (nl < 1e-9) continue; n = n.map(v => v / nl)
    const sh = Math.min(1, 0.42 + 0.62 * Math.abs(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]))
    const col = [t.c[0] * sh, t.c[1] * sh, t.c[2] * sh]
    let poly = t.v.map(cam), out = []
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length]
      const ain = a[2] <= -NEAR, bin = b[2] <= -NEAR
      if (ain) out.push(a)
      if (ain !== bin) { const s = (-NEAR - a[2]) / (b[2] - a[2])
        out.push([a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]), -NEAR]) }
    }
    if (out.length < 3) continue
    for (let k = 1; k < out.length - 1; k++) {
      const P = [out[0], out[k], out[k + 1]].map(p => [W / 2 + p[0] * focal / (-p[2]), H / 2 - p[1] * focal / (-p[2]), -p[2]])
      const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])
      if (Math.abs(area) < 1e-6) continue
      const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0])))
      const x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])))
      const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1])))
      const y1 = Math.min(H - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])))
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w0 = ((P[1][0] - x) * (P[2][1] - y) - (P[2][0] - x) * (P[1][1] - y)) / area
        const w1 = ((P[2][0] - x) * (P[0][1] - y) - (P[0][0] - x) * (P[2][1] - y)) / area
        const w2 = 1 - w0 - w1
        if (w0 < 0 || w1 < 0 || w2 < 0) continue
        const z = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2]
        const idx = y * W + x
        if (z < zbuf[idx]) { zbuf[idx] = z
          img[idx * 4] = col[0]; img[idx * 4 + 1] = col[1]; img[idx * 4 + 2] = col[2] }
      }
    }
  }
  const png = new PNG({ width: W, height: H }); img.copy(png.data)
  fs.writeFileSync(name, PNG.sync.write(png)); console.log('wrote', name, `(${tris.length} tris)`)
}

const W = 880, H = 495
const cams = process.argv.slice(2).length ? process.argv.slice(2) : ['view', 'inca-west']
for (const id of cams) {
  if (id === 'inca-west') {                            // 특수: 잉카 판에서 서쪽(도착 역방향)
    const ic = WAYPOINTS.find(w => w.id === 'inca')
    render([ic.x, ic.y + EYE, ic.z], Math.PI / 2, 0.10, W, H, `_render_${id}.png`)
  } else {
    const wp = WAYPOINTS.find(w => w.id === id)
    if (!wp) { console.error(`⚠ 웨이포인트 '${id}' 없음`); continue }
    render([wp.x, wp.y + EYE, wp.z], wp.yaw, wp.pitch, W, H, `_render_${id}.png`)
  }
}
