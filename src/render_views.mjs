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
import { descentSpec, woldaeSpec, incaStairSpec, incaBladesSpec, drumPierAzimuths, descentPortSpec, portPrismTris, outwardTris, ribCutSpec } from './corridorStairsGeometry.js'
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
  //  ★54 월대 — 사다리꼴 코벨 매스(정거장 잇기, Corridor.Woldae와 동일 구축) + 동단 립
  const wd = woldaeSpec()
  if (wd.on) {
    const C2 = wd.contour, col = [176, 146, 99]
    const v2 = C2.map(p => new THREE.Vector2(p.x, p.z))
    const fcs = THREE.ShapeUtils.triangulateShape(v2, [])
    const top = C2.map(p => [p.x, wd.yTop, p.z]), bot = C2.map(p => [p.x, wd.underY(p.x), p.z])
    for (const [i, j, k] of fcs) { tris.push({ v: [top[i], top[j], top[k]], c: col }); tris.push({ v: [bot[k], bot[j], bot[i]], c: col }) }
    for (let i = 0; i < C2.length; i++) { const j = (i + 1) % C2.length
      quad(top[i], bot[i], bot[j], top[j], col) }
    if (wd.rise) {                                      // ★54-3 상승단(Corridor.Woldae와 동일 구축)
      const r = wd.rise
      let poly
      if (r.form === 'all') { poly = []
        for (let i = 0; i < C2.length; i++) { const A = C2[i], B = C2[(i + 1) % C2.length]
          const inA = A.x >= r.podWest, inB = B.x >= r.podWest
          if (inA) poly.push(A)
          if (inA !== inB) { const t = (r.podWest - A.x) / (B.x - A.x); poly.push({ x: r.podWest, z: A.z + (B.z - A.z) * t }) } }
      } else poly = [{ x: r.podWest, z: -r.podW }, { x: r.podEast, z: -r.podW },
                     { x: r.podEast, z: r.podW }, { x: r.podWest, z: r.podW }]
      if (poly.length >= 3) {
        const fp = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p.x, p.z)), [])
        const tp = poly.map(p => [p.x, r.top, p.z]), bp = poly.map(p => [p.x, wd.yTop, p.z])
        for (const [i, j, k] of fp) { tris.push({ v: [tp[i], tp[j], tp[k]], c: col }); tris.push({ v: [bp[k], bp[j], bp[i]], c: col }) }
        for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; quad(tp[i], bp[i], bp[j], tp[j], col) }
      }
      for (let k = 1; k <= r.n; k++) {
        const xa = r.stairW + (k - 1) * r.run, xb = xa + r.run
        const zw = Math.min(r.podW, wd.hwAt((xa + xb) / 2)), yt = wd.yTop + r.stepH * k
        const P = [[xa, yt, -zw], [xb, yt, -zw], [xb, yt, zw], [xa, yt, zw]]
        const Q = P.map(q => [q[0], wd.yTop, q[2]])
        quad(P[0], P[1], P[2], P[3], col)
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(P[i], Q[i], Q[j], P[j], col) }
      }
    }
    if (wd.rim > 0) {                                   // 립 = 동단·노치 폴리라인 스윕(Corridor.Woldae와 동일)
      const E = C2.slice(wd.eastFrom, wd.eastTo + 1), dd = wd.rim * 2
      const y0 = wd.yTop - 0.05, y1 = wd.yTop + wd.rim
      const ring = (i) => { const p = E[i]
        const a = E[Math.max(0, i - 1)], b = E[Math.min(E.length - 1, i + 1)]
        const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, n = [dz / L, -dx / L]
        return [[p.x, y0, p.z], [p.x, y1, p.z], [p.x + n[0] * dd, y1, p.z + n[1] * dd], [p.x + n[0] * dd, y0, p.z + n[1] * dd]] }
      for (let i = 0; i < E.length - 1; i++) { const A = ring(i), B = ring(i + 1)
        for (let j = 0; j < 4; j++) quad(A[j], A[(j + 1) % 4], B[(j + 1) % 4], B[j], col) }
    }
  }
  for (const pl of d.plates.filter(p => !p.onWoldae)) {
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
// ── 리브 다섯(구면 경선 튜브) — ★56 절단 반영(끊긴 띠는 안 그린다) ──
const CUTS = ribCutSpec()
for (const k of [-2, -1, 0, 1, 2]) {
  const cut = CUTS.find(c => c.k === k)
  const phi = k / C.MERIDIANS * Math.PI * 2, M = 160, S = 10
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
    //  ★56: 절단 띠 안의 세그먼트는 건너뛴다 = 끊긴 자리(간극). 실제 CSG의 근사이지만 매싱 판단에는 충분.
    const yM = (prev[0][1] + cur[0][1]) / 2
    if (!(cut && yM > cut.yBot && yM < cut.yTop))
      for (let j = 0; j < S; j++) quad(prev[j], prev[(j + 1) % S], cur[(j + 1) % S], cur[j], [204, 186, 146])
    prev = cur
  }
  //  절단면 캡(#0 제외 — 보어가 길이라 안 막는다)
  if (cut && k !== 0) for (const [yy, rr] of [[cut.yBot, cut.capB], [cut.yTop, cut.capT]]) {
    const cx = C.rOf(yy / C.H) * Math.cos(phi), cz = C.rOf(yy / C.H) * Math.sin(phi), NC = 20
    for (let j = 0; j < NC; j++) {
      const a0 = j / NC * Math.PI * 2, a1 = (j + 1) / NC * Math.PI * 2
      tris.push({ v: [[cx, yy, cz], [cx + rr * Math.cos(a0), yy, cz + rr * Math.sin(a0)],
                      [cx + rr * Math.cos(a1), yy, cz + rr * Math.sin(a1)]], c: [178, 158, 120] })
    }
  }
}
// ── ★56 노출 나선(#0 간극 구간) — §2-D ① '의도된 부양'(1p7 증명된 뜸). 여기가 검수의 핵심이다 ──
{
  const z = CUTS.find(c => c.k === 0)
  if (z) for (let i = 0; i < C.STAIR_STEPS; i++) {
    const f = (i + 0.5) / C.STAIR_STEPS, { pos, theta } = C.spiralPoint(f)
    if (pos.y < z.yBot - 1 || pos.y > z.yTop + 1) continue
    const g = new THREE.BoxGeometry(C.TREAD_DEPTH, C.TREAD_THICK, C.TREAD_WIDTH)
    g.rotateY(-theta); g.translate(pos.x, pos.y, pos.z)
    addGeo(g, [214, 171, 104])
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
  if (id.startsWith('free:')) {                        // ★54 자유 카메라: free:x,y,z,yaw,pitch(도)
    //  웨이포인트는 전부 '경로 위 눈높이'라 물러선 조감이 없다 — 매싱·비례 판독의 사각지대였다.
    const [fx, fy, fz, fyaw, fpit] = id.slice(5).split(',').map(Number)
    render([fx, fy, fz], (fyaw || 0) * Math.PI / 180, (fpit || 0) * Math.PI / 180, W, H,
      `_render_free_${fyaw}_${fpit}.png`)
  } else if (id === 'inca-west') {                     // 특수: 잉카 판에서 서쪽(도착 역방향)
    const ic = WAYPOINTS.find(w => w.id === 'inca')
    render([ic.x, ic.y + EYE, ic.z], Math.PI / 2, 0.10, W, H, `_render_${id}.png`)
  } else {
    const wp = WAYPOINTS.find(w => w.id === id)
    if (!wp) { console.error(`⚠ 웨이포인트 '${id}' 없음`); continue }
    render([wp.x, wp.y + EYE, wp.z], wp.yaw, wp.pitch, W, H, `_render_${id}.png`)
  }
}
