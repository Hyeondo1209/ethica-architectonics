// ★㊿ render_views.mjs — 셀프 렌더 검수 도구(개발 도구 — 배포·번들 무관, 티켓 무소모·웨이포인트 전례)
//  실제 소스 모듈의 기하를 웨이포인트 카메라에서 z-버퍼(순수 JS·GL 불필요)로 PNG에 굽는다.
//  ⚠용도 = 매싱·비례·틈 판단. 조명·재질·분위기 판단은 못 한다(그건 로컬·P2 몫).
//  ⚠충실도: 드럼 홀 권역 근사(벽 창 트임·프리즈 밴드·셀라 배경·리브 5·잉카·하강로) — CSG 세부(문·벽감·기단) 생략.
//  ★2026.07.28 정본 교체: ⓐ 전망 갈래가 ★75로 폐기된 **구 램프**를 계속 그리던 것을 넓은 계단으로 교체
//   ⓑ **회랑·등불·문·테라스 신규 커버** — 이 도구는 갈림 이후 여정 후반을 한 조각도 굽지 않고 있었다.
//  ⚠남은 사각지대는 `--coverage`가 매번 보고한다(현재 4곳 — 방·방사 2·전망 올려보기).
//  사용: node src/render_views.mjs [wp-id ...]   (기본: view inca-west)  · 해상도 880×495(토큰 절약)
//        node src/render_views.mjs --coverage    (전 시점 사각지대 검사 — 새 사각지대면 exit 1)
//  규율: 수치 스위트 green 이후에만 굽는다 · 형태 세션은 전달 전 셀프 검수 · 세션당 최대 2라운드.
import fs from 'fs'
import { PNG } from 'pngjs'
import * as THREE from 'three'
import * as C from './constants.js'
import { descentSpec, woldaeSpec, incaStairSpec, incaBladesSpec, drumPierAzimuths, descentPortSpec, portPrismTris, outwardTris, ribCutSpec } from './corridorStairsGeometry.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { WAYPOINTS, EYE } from './waypoints.js'
import { buildViceWedge, viceSplitIndex, buildSill, buildFloorCollar, buildFloorLanding, freeSplitRange, freeNewelSpec, destCut, openRimSpec, isOpenRib, ribHoleSolid } from './ribGeometry.js'
import { buildKneeBody, innerTubeSolid, kneeWalkY } from './kneeBodyGeometry.js'
import { buildJunctionKnot, buildLightShaft, buildShaftGrate, discSolid, buildJunctionPlate, buildPzCheek, buildWideStair, wideStairTreads, radialPlate } from './junctionGeometry.js'
import { buildFlareShell } from './exitFlareGeometry.js'   // ★80 — 사본이 아니라 정본을 부른다
import { kneeTreads, kneeStairSpec } from './kneeStair.js'                          // ★66 계단 규격·참   // ★60 매듭 · ★61 자립 나선 · ★62 바닥 매듭

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
  //  ★64-3: 실제 앱(RibCutCaps)과 **같은 규칙**으로 그린다 — 이게 어긋나 있어서 셀프 렌더가
  //   위아래 원판을 그리고 나는 그걸 보고 '괜찮다'고 오판했다(현도 반복 적발). 규칙:
  //   · 아랫캡: isOpenRib면 없음(발코니가 대신) · #0 없음(우물) · 그 외(#+2)만 원판
  //   · 윗캡: wallOf>0(살 있는 관 = 다섯 전부 'cut5')이면 없음(절단면이 저절로 고리 = 아가리)
  const wallOfK = (kk) => (C.RIB_WALL_ON && (C.RIB_WALL_SCOPE === 'cut5' || kk === 0 || (C.RIB_XFER_ON && kk === C.RIB_DEST_K))) ? C.RIB_WALL_T : 0
  if (cut) {
    const drawCap = (yy, rr) => {
      const cx = C.rOf(yy / C.H) * Math.cos(phi), cz = C.rOf(yy / C.H) * Math.sin(phi), NC = 20
      for (let j = 0; j < NC; j++) {
        const a0 = j / NC * Math.PI * 2, a1 = (j + 1) / NC * Math.PI * 2
        tris.push({ v: [[cx, yy, cz], [cx + rr * Math.cos(a0), yy, cz + rr * Math.sin(a0)],
                        [cx + rr * Math.cos(a1), yy, cz + rr * Math.sin(a1)]], c: [178, 158, 120] })
      }
    }
    if (!isOpenRib(k) && k !== 0) drawCap(cut.yBot, cut.capB)   // 아랫캡: #+2만(발판)
    if (wallOfK(k) === 0) drawCap(cut.yTop, cut.capT)           // 윗캡: 살 없는 관만(현 상태엔 없음)
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

// ── ★60 프리즈 방 바닥 + vice 상단 + 문지방 — 매듭 검수용(2026.07.24) ──
//  ⚠구판 렌더에는 **방 바닥이 없었다** — 그래서 "나선이 어디로 내려서는가"를 볼 수단 자체가 없었다.
//   (그 사각지대가 0.85 환형 허공을 여태 못 본 이유이기도 하다.) 격자로 근사하고 구멍 다섯만 뚫는다.
{
  const rx0 = C.TEMPLE_X0 + C.FR_WALL_T, rx1 = C.TEMPLE_X1 + C.FR_ANNEX - C.FR_BACK_T
  const rzh = C.TEMPLE_HZ - C.FR_WALL_T, fy = C.FR_FLOOR_Y
  const holes = CUTS.map(c => ({ x: c.bx, z: c.bz, r: C.SHELL_RIB_R + C.RIB_HOLE_CLR }))   // ★64-2 헤어라인 여유
  const NX = 44, NZ = 66
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x0 = rx0 + (rx1 - rx0) * i / NX, x1 = rx0 + (rx1 - rx0) * (i + 1) / NX
    const z0 = -rzh + 2 * rzh * j / NZ, z1 = -rzh + 2 * rzh * (j + 1) / NZ
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    if (holes.some(h => Math.hypot(cx - h.x, cz - h.z) < h.r)) continue
    quad([x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1], [186, 160, 112])
  }
  //  ★63 우물 발코니 — 뚫린 셋의 테두리(난간 + 한 단 올라선 판)
  const rimS = openRimSpec()
  if (rimS) for (const c of CUTS) if (isOpenRib(c.k)) {
    const ring = (r0, r1, y0, y1, col) => {
      const N = 32
      for (let a = 0; a < N; a++) {
        const t0 = a / N * Math.PI * 2, t1 = (a + 1) / N * Math.PI * 2
        const P = (r, t, y) => [c.bx + r * Math.cos(t), y, c.bz + r * Math.sin(t)]
        quad(P(r0, t0, y1), P(r1, t0, y1), P(r1, t1, y1), P(r0, t1, y1), col)          // 상면
        quad(P(r0, t0, y0), P(r0, t0, y1), P(r0, t1, y1), P(r0, t1, y0), col)          // 안쪽면
        quad(P(r1, t0, y0), P(r1, t0, y1), P(r1, t1, y1), P(r1, t1, y0), col)          // 바깥면
      }
    }
    ring(rimS.rimIn, rimS.rimOut, rimS.rimY0, rimS.rimY1, [150, 122, 80])
    ring(rimS.balIn, rimS.balOut, rimS.balY0, rimS.balY1, [163, 133, 88])
  }
  //  아랫캡(= 바닥 구멍의 마개) — ★63으로 뚫린 셋은 제외
  for (const c of CUTS) if (c.k !== 0 && !isOpenRib(c.k)) {
    const NC = 24
    for (let j = 0; j < NC; j++) {
      const a0 = j / NC * Math.PI * 2, a1 = (j + 1) / NC * Math.PI * 2, yy = c.yBot + 0.02
      tris.push({ v: [[c.bx, yy, c.bz], [c.bx + c.capB * Math.cos(a0), yy, c.bz + c.capB * Math.sin(a0)],
                      [c.bx + c.capB * Math.cos(a1), yy, c.bz + c.capB * Math.sin(a1)]], c: [166, 146, 110] })
    }
  }
  //  vice 상단 쐐기 40장 — 나선이 바닥으로 올라붙는 마지막 구간
  const split = viceSplitIndex(), wg = buildViceWedge().geometry
  for (let i = Math.max(0, split - 40); i < split; i++) {
    const f = (i + 0.5) / C.STAIR_STEPS, { theta } = C.spiralPoint(f)
    const cc = C.ribCenter(C.spiralU(f))
    const g = wg.clone(); g.rotateY(-theta); g.translate(cc.x, cc.y + C.TREAD_THICK / 2, cc.z)
    addGeo(g, [214, 171, 104])
  }
  //  ★60 문지방 / ★62 칼라·착지판 — 색을 일부러 갈라 둔다(검수에서 어디가 매듭인지 즉시 보이게)
  const sb = buildSill()
  if (sb) { const g = sb.geometry.clone(); g.rotateY(-sb.spec.theta); g.translate(sb.spec.cx, sb.spec.yTop, sb.spec.cz)
    addGeo(g, [150, 122, 80]) }
  const cb = buildFloorCollar()
  if (cb) { const g = cb.geometry.clone(); g.translate(cb.spec.cx, cb.spec.yTop, cb.spec.cz); addGeo(g, [150, 122, 80]) }
  const lb = buildFloorLanding()
  if (lb) { const g = lb.geometry.clone(); g.rotateY(-lb.spec.land.thMid); g.translate(lb.spec.cx, lb.spec.yTop, lb.spec.cz)
    addGeo(g, [163, 133, 88]) }
  //  ★61 — 자립 나선(쐐기 회전 배치) + 기둥 + 목적지 아가리 토막 + 1p7 비석(사각지대 예방: ★60 교훈)
  if (C.RIB_XFER_ON) {
    const fr = freeSplitRange(), ns = freeNewelSpec(), dc = destCut()
    if (fr && dc) {
      const cs = Math.cos(C.RIB_DEST_PHI), sn = Math.sin(C.RIB_DEST_PHI)
      const rot = (x, z) => [x * cs - z * sn, x * sn + z * cs]
      for (let i = fr.start; i < fr.end; i++) {
        const f = (i + 0.5) / C.STAIR_STEPS, { pos, theta } = C.spiralPoint(f)
        if (C.RIB_FREE_MODE === 'vice') {                       // ★61 원안 = 쐐기(축 중심)
          const cc = C.ribCenter(C.spiralU(f))
          const [px, pz] = rot(cc.x, cc.z)
          const g = wg.clone(); g.rotateY(-theta - C.RIB_DEST_PHI); g.translate(px, cc.y + C.TREAD_THICK / 2, pz)
          addGeo(g, [214, 171, 104])
        } else {                                                 // ★62-2 통일 = 부양 판(헬릭스 위)
          const [px, pz] = rot(pos.x, pos.z)
          const g = new THREE.BoxGeometry(C.TREAD_DEPTH, C.TREAD_THICK, C.TREAD_WIDTH)
          g.rotateY(-theta - C.RIB_DEST_PHI); g.translate(px, pos.y, pz)
          addGeo(g, [214, 171, 104])
        }
      }
      if (ns) {   // 자립 기둥('vice' 어휘일 때만)
        const mc = C.ribCenter(ns.cy / C.H); const [px, pz] = rot(mc.x, mc.z)
        const g = new THREE.CylinderGeometry(ns.r, ns.r, ns.h, 20); g.translate(px, ns.cy, pz)
        addGeo(g, [187, 138, 78])
      }
      {   // 목적지 윗토막 하부 8m(아가리) — 절단면 위에서 시작하는 관 토막(고리는 근사: 겉면만)
        const pts = []
        for (let i = 0; i <= 24; i++) { const y = dc.yTop + i / 24 * 8; pts.push(new THREE.Vector3(C.rOf(y / C.H), y, 0)) }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, C.SHELL_RIB_R, 12, false)
        g.rotateY(-C.RIB_DEST_PHI)
        addGeo(g, [187, 138, 78])
      }
      if (C.STELE7_ON) {   // 1p7 비석(슬랩 근사 — ⚠현도 07.24 소등, 자리 재판정 후 복귀)
        const c0 = C.ribCenter(C.FR_FLOOR_Y / C.H)
        const [qx, qz] = rot(c0.x, c0.z)
        const dx = qx - c0.x, dz = qz - c0.z
        let nx = dz, nz = -dx; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl
        if (nx * (c0.x + dx / 2) + nz * (c0.z + dz / 2) > 0) { nx = -nx; nz = -nz }
        const bx = c0.x + dx * C.STELE7_F + nx * C.STELE7_OFF, bz = c0.z + dz * C.STELE7_F + nz * C.STELE7_OFF
        const g = new THREE.BoxGeometry(0.5, 5.5, 4.4)
        g.rotateY(Math.atan2(-nz, nx)); g.translate(bx, C.FR_FLOOR_Y + 3.0, bz)
        addGeo(g, [106, 97, 82])
      }
    }
  }
}

function render(eye, yaw, pitch, W, H, name, quiet = false) {
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
  fs.writeFileSync(name, PNG.sync.write(png))
  if (!quiet) console.log('wrote', name, `(${tris.length} tris)`)
}

// ── ★65 무릎길(2026.07.25) — 판 435 + 몸 + 관 하반부(계곡) + 양끝 매듭 판 ──
//  상부 여정 그룹과 같은 −RIB_DEST_PHI 회전을 건다(App.jsx와 동일).
//  ⚠★이 래스터라이저는 **후면 컬링이 없다**. 카메라가 관 안에 있으므로 관을 통째로 굽으면 앞쪽 관벽이
//   화면을 통째로 덮는다 → 관은 **보행선 아래**(= 걸으며 실제로 보이는 계곡)만 굽는다.
//   이 검수가 보려는 것이 정확히 그 계곡이다: 몸이 관 바닥에 어떻게 앉고 어디서 들리는가.
{
  const phi = C.RIB_XFER_ON ? C.RIB_DEST_PHI : 0
  const cs = Math.cos(phi), sn = Math.sin(phi)
  const rot = (x, z) => [x * cs - z * sn, x * sn + z * cs]
  const xA = C.rOf(C.U_SPIRAL_END), xB = C.X_LAND_HI

  //  ① 관 계곡 — 정본(innerTubeSolid)의 삼각형에서 보행선 아래만 남긴다
  {
    const g = innerTubeSolid()
    const p = g.attributes.position
    for (let i = 0; i < p.count; i += 3) {
      const V = [0, 1, 2].map(k => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)])
      //  세 정점 모두 그 x의 보행면보다 아래일 때만(위쪽 관벽·마구리는 버린다)
      if (!V.every(v => v[1] < kneeWalkY(Math.min(xA, Math.max(xB, v[0]))) - 0.05)) continue
      if (!V.every(v => v[0] > xB - 1 && v[0] < xA + 1)) continue
      tris.push({ v: V.map(v => { const [px, pz] = rot(v[0], v[2]); return [px, v[1], pz] }), c: [140, 118, 84] })
    }
  }

  //  ② 몸 — CSG 결과는 indexed다(★64 교훈 ⓐ). addGeo가 toNonIndexed로 풀어 주므로 그대로 넘긴다.
  if (C.KW_BODY_ON) {
    const b = buildKneeBody()
    if (b) { const g = b.clone(); g.rotateY(-phi); addGeo(g, [184, 154, 106]) }
  }

  //  ③ ★66 디딤 + 참 — 배치 정본은 kneeStair(사본 금지). 참은 색을 갈라 리듬이 눈에 보이게 한다.
  for (const t of kneeTreads()) {
    const [px, pz] = rot(t.x, 0)
    const g = new THREE.BoxGeometry(t.d, C.TREAD_THICK, t.w)
    g.rotateY(-phi); g.translate(px, t.y, pz)
    addGeo(g, [214, 171, 104])
  }
  for (const L of kneeStairSpec().landings) {
    const z0 = L.z0 ?? -C.KW_TREAD_W / 2, z1 = L.z1 ?? C.KW_TREAD_W / 2   // ★67 도입 참만 z 범위가 다르다
    const [px, pz] = rot((L.x0 + L.x1) / 2, (z0 + z1) / 2)
    const g = new THREE.BoxGeometry(L.x1 - L.x0, C.TREAD_THICK, z1 - z0)
    g.rotateY(-phi); g.translate(px, L.y, pz)
    addGeo(g, L.entry ? [206, 172, 128] : [200, 165, 120])
  }

  //  ④ 정션 착지장(구 착지 판넬은 ★67로 폐기 — 도입 참이 대신한다)
  {
    //  ★72 판 윤곽 — 'bore'면 관 단면을 따라 벽에 닿는다(정본 = junctionGeometry, 사본 금지)
    const g = buildJunctionPlate(); g.rotateY(-phi)
    addGeo(g, [163, 133, 88])
  }

  //  ④-2 ★70 정션 매듭 — 판 밑 받침 매스(§2-D ③ 두께 위계)
  if (C.JCT_KNOT_ON) {
    const k = buildJunctionKnot()
    if (k) { const g = k.clone(); g.rotateY(-phi); addGeo(g, [150, 124, 82]) }
  }

  //  ④-3 하강 갈래(RibJunction의 23칸) — ⚠구판 렌더는 이 갈래를 통째로 빠뜨렸다.
  //   정션 '형태'를 보려면 세 갈래가 다 있어야 한다(판만 굽고 판단할 수는 없다).
  {
    const yT = C.U_KNEE_END * C.H
    for (let i = 0; i < C.DESC_STEPS; i++) {
      const y = yT - (i + 0.5) * C.STEP_RISE
      const [px, pz] = rot(C.X_DESC0 - (yT - y) / C.DESC_SLOPE, C.JCT_DN_Z)
      const g = new THREE.BoxGeometry(C.TREAD_DEPTH, C.TREAD_THICK, C.TREAD_WIDTH * 2)
      g.rotateY(-phi); g.translate(px, y, pz)
      addGeo(g, [196, 150, 96])
    }
  }

  //  ④-4 전망 갈래 — ★75 넓은 상승 계단(몸 + 디딤판 68) + 반원 디스크
  //  ⛔**구판 버그(2026.07.28 적발·수리):** 여기는 ★75(07.26)가 폐기한 **구 램프**(폭 2 허공 판 35장)를
  //   계속 그리고 있었다 = 셀프 렌더가 **존재하지 않는 기하**를 보여줬다. 조명 판정을 이 도구로 하려면
  //   도구가 먼저 맞아야 한다(운용계획 v5 §8 P1′ ④).
  //  ★수리 방식 = 치수를 다시 적지 않고 **정본 함수를 직접 부른다**(buildWideStair·wideStairTreads).
  //   ★65 무릎길 몸·★70 매듭과 같은 어법이라, 이후 계단이 바뀌어도 도구가 자동으로 따라온다.
  {
    const gw = buildWideStair()
    if (gw) { const g = gw.clone(); g.rotateY(-phi); addGeo(g, [163, 133, 88]) }
    for (const w of wideStairTreads()) {          // Dome.Lookout의 인스턴스 배치와 같은 식(단위 상자 × 비율)
      const g = new THREE.BoxGeometry(w.d, C.TREAD_THICK, w.w)
      const [tx, tz] = rot(w.x, w.z ?? 0)
      g.rotateY(-phi); g.translate(tx, w.y, tz)
      addGeo(g, [214, 171, 104])
    }
    const dX = C.rOf(C.U_LOOKOUT_END) + C.LK_DISC_DX
    const dY = C.U_LOOKOUT_END * C.H + C.LK_DISC_LIFT + C.LK_DISC_DY
    const [px, pz] = rot(dX, C.LK_DISC_DZ)
    //  ★71-2b 반원 판 = 닫힌 솔리드(구 cylinderGeometry는 부채꼴 평면을 안 만들어 종잇장)
    const gd = discSolid(C.LK_PLAT_R, C.LK_DISC_T, C.LK_DISC_HALF)
    gd.translate(0, -C.LK_DISC_T, 0)
    gd.rotateY(C.LK_DISC_ROT - phi); gd.translate(px, dY, pz)
    addGeo(gd, [163, 133, 88])
  }

  //  ⑤ ★73 통로 권역(방·볼벽·봉인 슬랩) — ⚠구판 렌더는 이걸 **통째로** 빠뜨렸다.
  //   현도가 하강 도중 보는 것이 바로 여기라, 이게 없으면 "무엇이 튀어나왔나"를 도구가 영영 못 본다.
  //   ★진단 모드: `DIAG_PASS=1` 이면 부재마다 색을 갈라 굽는다(현도가 색으로 지목할 수 있게).
  {
    const DIAG = process.env.DIAG_PASS === '1'
    const t = C.PASS_T, floor = C.PASS_FLOOR_Y, zc = C.JCT_DN_Z, zw = C.PASS_HW + t / 2
    const NEU = [150, 128, 92]
    const box = (cx, cy, cz, sx, sy, sz, col) => {
      const g = new THREE.BoxGeometry(sx, sy, sz)
      const [px, pz] = rot(cx, cz)
      g.rotateY(-phi); g.translate(px, cy, pz)
      addGeo(g, DIAG ? col : NEU)
    }
    // ⓐ 봉인 슬랩 (자주)
    box((C.RM_X1 + C.PASS_X_DEEP) / 2, floor - t / 2, zc, C.PASS_X_DEEP - C.RM_X1, t, 2 * C.PASS_HW + 2 * t, [150, 90, 170])
    // ⓑ −z 볼벽 (초록) — 하강 진행 기준 **오른편**
    box((C.RM_X1 + C.PASS_X_CHEEK) / 2, (floor + C.CHEEK_TOP_NZ) / 2, zc - zw, C.PASS_X_CHEEK - C.RM_X1, C.CHEEK_TOP_NZ - floor, t, [90, 170, 110])
    // ⓒ +z 볼벽 (파랑) — ★74 레이크 상단(정본 = junctionGeometry, 사본 금지)
    { const g = buildPzCheek(); const [px, pz] = rot(0, 0); g.rotateY(-phi); addGeo(g, DIAG ? [80, 120, 200] : NEU) }
    // ⓓ 방 지붕 (빨강) — ★73으로 +x 0.3 절삭한 것
    {
      const rx0 = C.RM_X0 - t, rx1 = C.RM_X1 + C.RM_ROOF_OV_PX
      box((rx0 + rx1) / 2, floor + C.RM_ROOF + t / 2, (C.RM_Z0 + C.RM_Z1) / 2, rx1 - rx0, t, C.RM_Z1 - C.RM_Z0 + 2 * t, [200, 80, 80])
    }
    // ⓔ 방 바닥·벽 (중립 회색)
    box((C.RM_X0 + C.RM_X1) / 2, floor - t / 2, (C.RM_Z0 + C.RM_Z1 + 0.6) / 2, C.RM_X1 - C.RM_X0, t, C.RM_Z1 - C.RM_Z0 + 0.6, [130, 120, 108])
    box(C.RM_X0 - t / 2, floor + C.RM_ROOF / 2, (C.RM_Z0 + C.RM_Z1) / 2, t, C.RM_ROOF + 2 * t, C.RM_Z1 - C.RM_Z0 + 2 * t, [130, 120, 108])
    box((C.RM_X0 + C.RM_X1) / 2, floor + C.RM_ROOF / 2, C.RM_Z0 - t / 2, C.RM_X1 - C.RM_X0 + 2 * t, C.RM_ROOF + 2 * t, t, [130, 120, 108])
  }

  //  ④-5 ★71 빛 기둥 — 전망 판 → 전실 방. ⚠전실 방 자체는 이 도구가 안 굽는다(드럼 권역 근사).
  if (C.SHAFT_ON) {
    const sh = buildLightShaft()
    if (sh) { const g = sh.clone(); g.rotateY(-phi); addGeo(g, [198, 168, 118]) }
    const gr = buildShaftGrate()
    if (gr) { const g = gr.clone(); g.rotateY(-phi); addGeo(g, [214, 171, 104]) }
  }

  //  ⑥ ★78 회랑 권역(1p9 회랑 · 1p10 등불 · 1p11 문 · 1p12~15 테라스) — ★신설 2026.07.28
  //  ⛔**구판은 이 권역을 한 조각도 굽지 않았다.** 실측으로 확인했다: `door`·`cloister`·`terrace`
  //   세 시점을 구판으로 구우면 빈 하늘(또는 드럼·리브만)이 나온다. 일지에 적힌 "옛 평바닥·두께 0 벽을
  //   그린다"는 **틀린 진단**이었다 — 도구는 거짓말한 게 아니라 **눈이 멀어** 있었다.
  //   여정 후반 절반(갈림 이후 전부)을 셀프 렌더로 볼 수단이 아예 없었다는 뜻이다.
  //  ★조각의 정본 = constants 생성기(clFloorSegments·clSillBands·clSillActiveY) — 앱·검사와 같은 출처.
  //   ⚠남은 중복 = 벽 **목록**(어떤 링/실린더가 있는가)뿐이며, Dome.RevealPassage와 두 벌이다.
  //   구조적 해소안은 §종료 보고 참조(기술자 트리 순회 렌더러).
  {
    const t = C.PASS_T
    const rIn = C.CL_R - C.CL_HW, rOut = C.CL_R + C.CL_HW
    const FLOOR = [196, 150, 96], SHELL = [150, 128, 92], STONE = [176, 146, 99]
    //  Dome의 ring()/cyl()과 **같은 args**를 쓴다(ringGeometry: thetaStart −p1 / cylinder: π/2 − p1).
    const ring = (r0, r1, y, p0, p1, col) => {
      const g = new THREE.RingGeometry(r0, r1, 96, 1, -p1, p1 - p0)
      g.rotateX(-Math.PI / 2); g.translate(0, y, 0); g.rotateY(-phi); addGeo(g, col)
    }
    const cyl = (r, y0, y1, p0, p1, col) => {
      if (!(p1 > p0) || !(y1 > y0)) return
      const g = new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, true, Math.PI / 2 - p1, p1 - p0)
      g.translate(0, (y0 + y1) / 2, 0); g.rotateY(-phi); addGeo(g, col)
    }
    //  회전 박스: Dome의 <mesh position rotation-y={ry}> = 로컬 회전 → 이동 → 그룹 회전
    const rbox = (x, y, z, sx, sy, sz, ry, col) => {
      const g = new THREE.BoxGeometry(sx, sy, sz)
      g.rotateY(ry); g.translate(x, y, z); g.rotateY(-phi); addGeo(g, col)
    }

    // ⓐ 바닥 = 층계참 9 + 계단 8×5단(조각 49) + 챌판 40 — ★78-2 정본 생성기
    const { segs, risers } = C.clFloorSegments()
    for (const f of segs) ring(rIn - t, rOut + t, f.y - 0.02, f.p0, f.p1, FLOOR)
    for (const r of risers)
      rbox(C.CL_R * Math.cos(r.phi), r.top - (C.CL_STEP_RISE + t) / 2, C.CL_R * Math.sin(r.phi),
           2 * C.CL_HW + 2 * t, C.CL_STEP_RISE + t, t, -r.phi, FLOOR)

    // ⓑ 밑판 · 지붕(절대 높이 — 바닥만 내려가고 천장은 안 움직인다)
    ring(C.CL_R_IN2, C.CL_R_OUT2, C.CL_WALL_BOT, C.CL_PHI0, C.CL_PHI1, SHELL)
    ring(C.CL_R_IN2, C.CL_R_OUT2, C.CL_ROOF_Y, C.CL_PHI0, C.CL_PHI1, SHELL)

    // ⓒ 안벽(스텁 입만큼 끊김) · 바깥벽(개구만큼 끊김) — 안팎 두 겹(★78-4 두께)
    const mPhi = C.ST_HW / rIn
    for (const r of [rIn, C.CL_R_IN2]) {
      if (C.ST_ON) {
        cyl(r, C.CL_WALL_BOT, C.CL_ROOF_Y, C.CL_PHI0, C.ST_PHI - mPhi, SHELL)
        cyl(r, C.CL_WALL_BOT, C.CL_ROOF_Y, C.ST_PHI + mPhi, C.CL_PHI1, SHELL)
        cyl(r, C.CL_FLOOR_END + C.ST_ROOF, C.CL_ROOF_Y, C.ST_PHI - mPhi, C.ST_PHI + mPhi, SHELL)
      } else cyl(r, C.CL_WALL_BOT, C.CL_ROOF_Y, C.CL_PHI0, C.CL_PHI1, SHELL)
    }
    for (const r of [rOut, C.CL_R_OUT2]) {
      cyl(r, C.CL_WALL_BOT, C.CL_ROOF_Y, C.CL_PHI0, C.CL_OP_P0, SHELL)
      cyl(r, C.CL_WALL_BOT, C.CL_ROOF_Y, C.CL_OP_P1, C.CL_PHI1, SHELL)
      cyl(r, C.CL_HEAD_Y, C.CL_ROOF_Y, C.CL_OP_P0, C.CL_OP_P1, SHELL)     // 창 위턱 위
    }

    // ⓓ 파라펫 — 'step'(계단식 띠 9) / 'slope'(한 줄). 창턱 정본 = clSillActiveY
    if (C.CL_WIN_MODE === 'slope') {
      const N = 128
      for (let i = 0; i < N; i++) {
        const p0 = C.CL_OP_P0 + (C.CL_OP_P1 - C.CL_OP_P0) * (i / N)
        const p1 = C.CL_OP_P0 + (C.CL_OP_P1 - C.CL_OP_P0) * ((i + 1) / N)
        const y = Math.min(C.clSillActiveY(p0), C.clSillActiveY(p1))
        cyl(rOut, C.CL_WALL_BOT, y, p0, p1, SHELL)
        cyl(C.CL_R_OUT2, C.CL_WALL_BOT, y, p0, p1, SHELL)
        ring(rOut, C.CL_R_OUT2, y, p0, p1, SHELL)
      }
    } else {
      const bands = C.clSillBands()
      bands.forEach((b, i) => {
        cyl(rOut, C.CL_WALL_BOT, b.y, b.p0, b.p1, SHELL)
        cyl(C.CL_R_OUT2, C.CL_WALL_BOT, b.y, b.p0, b.p1, SHELL)
        ring(rOut, C.CL_R_OUT2, b.y, b.p0, b.p1, SHELL)                    // 인방 창턱 윗면
        if (i > 0) rbox((rOut + C.CL_R_OUT2) / 2 * Math.cos(b.p0), b.y + C.CL_SEG_DROP / 2,
                        (rOut + C.CL_R_OUT2) / 2 * Math.sin(b.p0),
                        C.CL_WALL_T, C.CL_SEG_DROP, t, -b.p0, SHELL)       // 창턱 한 칸 강하면
      })
    }

    // ⓔ 창 인방(위턱 밑면 + 좌우 문선) · 끝캡
    ring(rOut, C.CL_R_OUT2, C.CL_HEAD_Y, C.CL_OP_P0, C.CL_OP_P1, SHELL)
    for (const ph of [C.CL_OP_P0, C.CL_OP_P1]) {
      const sy = C.clSillActiveY(ph)
      rbox((rOut + C.CL_R_OUT2) / 2 * Math.cos(ph), (sy + C.CL_HEAD_Y) / 2,
           (rOut + C.CL_R_OUT2) / 2 * Math.sin(ph), C.CL_WALL_T, C.CL_HEAD_Y - sy, t, -ph, SHELL)
    }
    //  ★79-2 끝캡 = 문 뚫린 네 조각(Dome과 같은 규칙)
    {
      const cap = (rc, rw, y0, y1) => { if (rw > 1e-6 && y1 - y0 > 1e-6)
        rbox(rc * Math.cos(C.CL_PHI1), (y0 + y1) / 2, rc * Math.sin(C.CL_PHI1), rw, y1 - y0, t, -C.CL_PHI1, SHELL) }
      const dR0 = C.CL_R - C.CL_HW, dR1 = C.CL_R + C.CL_HW
      const yA = C.CL_WALL_BOT - t, yB = C.CL_ROOF_Y + t
      if (C.RM10_ON) {
        cap((C.CL_R_IN2 + dR0) / 2, dR0 - C.CL_R_IN2, yA, yB)
        cap((dR1 + C.CL_R_OUT2) / 2, C.CL_R_OUT2 - dR1, yA, yB)
        cap(C.CL_R, dR1 - dR0, yA, C.CL_FLOOR_END)
        cap(C.CL_R, dR1 - dR0, C.CL_FLOOR_END + C.RM10_DOOR_H, yB)
      } else cap(C.CL_R, C.CL_R_OUT2 - C.CL_R_IN2, yA, yB)
    }

    // ⓕ 스텁 — ⛔★79-2 소등(ST_ON=false). 구 회랑→테라스 출구.
    if (C.ST_ON) {
      const sp = C.ST_PHI, cS = Math.cos(-sp), sS = Math.sin(-sp)
      const L = (x, z) => [x * cS + z * sS, -x * sS + z * cS]     // 로컬 → 월드(−ST_PHI 회전)
      const sbox = (lx, y, lz, sx, sy, sz, col) => {
        const [wx, wz] = L(lx, lz); rbox(wx, y, wz, sx, sy, sz, -sp, col)
      }
      const stX1 = rIn + 0.4, stL = stX1 - C.PASS_X_END
      const dHW = C.PASS_DOOR_W / 2, sideW = C.ST_HW - dHW
      sbox((C.PASS_X_END - 0.6 + stX1) / 2, C.CL_FLOOR_END - 0.05 - t / 2, 0,
           stL + 1.0, t, 2 * C.ST_HW + 2 * t, FLOOR)                                   // 바닥
      for (const s of [-1, 1])
        sbox((C.PASS_X_END + stX1) / 2, C.CL_FLOOR_END + C.ST_ROOF / 2, s * (C.ST_HW + t / 2),
             stL, C.ST_ROOF + 2 * t, t, SHELL)                                          // 측벽
      sbox((C.PASS_X_END + stX1) / 2, C.CL_FLOOR_END + C.ST_ROOF + t / 2, 0,
           stL + t, t, 2 * C.ST_HW + 2 * t, SHELL)                                      // 지붕
      for (const s of [-1, 1])
        sbox(C.PASS_X_END, C.CL_FLOOR_END + C.ST_ROOF / 2, s * (dHW + sideW / 2),
             t, C.ST_ROOF + 2 * t, sideW, SHELL)                                        // 문선
      sbox(C.PASS_X_END, (2 * C.CL_FLOOR_END + C.PASS_DOOR_H + C.ST_ROOF + t) / 2, 0,
           t, C.ST_ROOF + t - C.PASS_DOOR_H, C.PASS_DOOR_W, SHELL)                      // 린텔
    }

    // ⓖ 테라스(1p12~15) — 무단차 도착. 부채꼴 ±68.75°가 회랑 길이의 진짜 상한이다(★78 K2절)
    ring(C.TERRACE_RIN, C.TERRACE_ROUT, C.TERRACE_Y, -C.TERRACE_ARC / 2, C.TERRACE_ARC / 2, STONE)

    // ⓗ 등불 9기(1p10) — 관 + 갓. 갓 입 높이가 층계참마다 내려온다(★78-2)
    {
      const n = C.LAMP_RIBS.length
      C.LAMP_RIBS.forEach((k, i) => {
        const a = -(k / C.MERIDIANS) * Math.PI * 2
        const [lx, lz] = [C.LAMP_R * Math.cos(a), C.LAMP_R * Math.sin(a)]
        const floor = C.clLandingY(i), fr = n > 1 ? i / (n - 1) : 0
        const mouthY = floor + C.LAMP_MOUTH_Y0 + (C.LAMP_MOUTH_Y1 - C.LAMP_MOUTH_Y0) * fr
        const neckY = mouthY + C.LAMP_FUNNEL_H
        const rod = new THREE.CylinderGeometry(C.LAMP_TUBE_R, C.LAMP_TUBE_R, C.LAMP_TOP_Y - neckY, 12, 1, true)
        rod.translate(lx, (neckY + C.LAMP_TOP_Y) / 2, lz); rod.rotateY(-phi); addGeo(rod, [232, 196, 140])
        const fun = new THREE.CylinderGeometry(C.LAMP_TUBE_R, C.LAMP_MOUTH_R, C.LAMP_FUNNEL_H, 16, 1, true)
        fun.translate(lx, (mouthY + neckY) / 2, lz); fun.rotateY(-phi); addGeo(fun, [246, 214, 160])
      })
    }

    // ⓘ ★79 등불 방(1p10) — Dome.LampRoom과 같은 규칙. 계단 정본 = C.rm10Steps()
    if (C.RM10_ON) {
      const AX = C.RM10_AX_R * Math.cos(C.RM10_PHI), AZ = C.RM10_AX_R * Math.sin(C.RM10_PHI)
      const rO = C.RM10_RHO + C.RM10_WALL_T
      const dth = C.RM10_DOOR_HTH, a0 = C.RM10_ENTRY_TH - dth, a1 = C.RM10_ENTRY_TH + dth
      const doorTop = C.CL_FLOOR_END + C.RM10_DOOR_H
      //  로컬(원점 = 방 축 · x = 반경 바깥 · z = 회랑 진행) → 그룹 회전까지 한 번에
      const place = (g) => { g.rotateY(-C.RM10_PHI); g.translate(AX, 0, AZ); g.rotateY(-phi); return g }
      const lring = (r0, r1, y, b0, b1, col) => {
        const g = new THREE.RingGeometry(r0, r1, 96, 1, -b1, b1 - b0)
        g.rotateX(-Math.PI / 2); g.translate(0, y, 0); addGeo(place(g), col)
      }
      const lcyl = (r, y0, y1, b0, b1, col) => {
        if (!(b1 > b0) || !(y1 > y0)) return
        const g = new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, true, Math.PI / 2 - b1, b1 - b0)
        g.translate(0, (y0 + y1) / 2, 0); addGeo(place(g), col)
      }
      const coneT = C.RM10_WALL_T / Math.cos(C.RM10_CONE_DEG * Math.PI / 180)
      //  ★79-3 바닥 = 동심원 여러 겹(두 어법 스위치) + 겹 사이 챌판
      for (const g of C.rm10Tiers()) {
        lring(g.r0, g.r1, g.top - 0.02, 0, 2 * Math.PI, [214, 171, 104])
        if (g.i < C.RM10_TIER_N - 1) {
          const y0 = Math.min(g.top, g.top + C.RM10_TIER_SIGN * C.RM10_TIER_RISE)
          lcyl(g.r0, y0, y0 + C.RM10_TIER_RISE, 0, 2 * Math.PI, FLOOR)
        }
      }
      lring(0, C.RM10_FLOOR_R + coneT, C.RM10_BOT_Y, 0, 2 * Math.PI, SHELL)
      //  벽: 층계참 위 = 원기둥 / 아래 = 원뿔대
      for (const [r, off] of [[C.RM10_RHO, 0], [rO, coneT]]) {
        lcyl(r, C.RM10_CONE_Y, C.RM10_ROOF_Y, a1, a0 + 2 * Math.PI, SHELL)
        lcyl(r, doorTop, C.RM10_ROOF_Y, a0, a1, SHELL)
        //  ★79-5 출구 문 각폭만 비우고 문 위·아래는 다시 채운다
        const cone = (y0c, y1c, c0, c1) => {
          if (!(c1 > c0) || !(y1c - y0c > 1e-6)) return
          const g = new THREE.CylinderGeometry(C.rm10R(y1c) + off, C.rm10R(y0c) + off, y1c - y0c, 96, 1, true, Math.PI / 2 - c1, c1 - c0)
          g.translate(0, (y0c + y1c) / 2, 0); addGeo(place(g), SHELL)
        }
        const e0 = C.RM10_EXIT_TH - C.RM10_EXIT_DHTH, e1 = C.RM10_EXIT_TH + C.RM10_EXIT_DHTH
        cone(C.RM10_BOT_Y, C.RM10_CONE_Y, e1, e0 + 2 * Math.PI)
        cone(C.RM10_BOT_Y, C.RM10_FLOOR_Y, e0, e1)
        cone(C.RM10_FLOOR_Y + C.RM10_DOOR_H, C.RM10_CONE_Y, e0, e1)
      }
      lring(C.RM10_RHO, rO, doorTop, a0, a1, SHELL)
      lring(C.RM10_LAND_RIN, rO, C.RM10_LAND_Y, a0, a1, FLOOR)   // ★79-4 초입 판 + 공면 해소
      for (const s of C.rm10Steps()) {
        const [b0, b1] = s.thA < s.thB ? [s.thA, s.thB] : [s.thB, s.thA]
        lring(s.rIn, s.rOut, s.top, b0, b1, [214, 171, 104])
      }
      //  천장 = 원판 − 리브(월드 #RM10_K+RIB_DEST_K). ⚠그룹 회전 되돌리기 한 줄이 정합의 전부다.
      {
        const disc = discSolid(rO, t, false); disc.translate(AX, C.RM10_ROOF_Y, AZ)
        const cut = ribHoleSolid(C.RM10_K + C.RIB_DEST_K, C.RM10_ROOF_Y - 1.0, C.RM10_ROOF_Y + t + 1.0, 0.04)
        cut.rotateY(phi)
        const ev = new Evaluator(); ev.attributes = ['position', 'normal']
        const A2 = new Brush(disc), B2 = new Brush(cut)
        A2.updateMatrixWorld(); B2.updateMatrixWorld()
        const g = ev.evaluate(A2, B2, SUBTRACTION).geometry.clone()
        g.rotateY(-phi); addGeo(g, SHELL)
      }
      //  ★79-5/6 출구 통로 — 원호 90° + 좌회전 직선. Dome.LampRoom과 같은 규칙.
      {
        const t2 = C.PASS_T, y0 = C.RM10_EXIT_FLOOR_Y, y1 = C.RM10_EXIT_ROOF_Y
        const FL = C.RM10_FLARE_ON
        const b0 = C.RM10_EXIT_TH0, b1 = FL ? C.RM10_ARC_TH1 : C.RM10_EXIT_TH1
        const RI = C.RM10_EXIT_RIN, RO = C.RM10_EXIT_ROUT
        const iH = C.RM10_EXIT_DHTH
        const i0 = C.RM10_EXIT_TH - iH, i1 = C.RM10_EXIT_TH + iH
        const o0 = C.RM10_TERR_TH - C.RM10_TERR_DHTH, o1 = C.RM10_TERR_TH + C.RM10_TERR_DHTH
        const lbox = (cx, cy, cz, sx, sy, sz, col) => {
          const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(cx, cy, cz); addGeo(place(g), col)
        }
        const lrbx = (r, th, y, sr, sy, st) => {
          const g = new THREE.BoxGeometry(sr, sy, st); g.rotateY(-th)
          g.translate(r * Math.cos(th), y, r * Math.sin(th)); addGeo(place(g), SHELL)
        }
        //  ★79-7 링 안쪽 반지름 = 그 높이의 원뿔면 − t (고정값이 틈의 원인이었다) · 별도 안벽 없음
        lring(C.rm10R(y0) + C.RM10_CONE_T - t2, RO + t2, y0 - 0.02, b0, b1, FLOOR)
        lring(C.rm10R(y1) + C.RM10_CONE_T - t2, RO + t2, y1, b0, b1, SHELL)
        for (const r of [RO, RO + t2]) {
          lcyl(r, y0 - t2, y1, b0, o0, SHELL)
          lcyl(r, y0 - t2, y1, o1, b1, SHELL)
        }
        for (const th of [o0, o1]) lrbx(RO + t2 / 2, th, (y0 + y1) / 2, t2, y1 - y0, t2)
        //  ★79-7 문선·끝캡 = 원뿔을 따르는 사다리꼴 판
        const yH = y0 + C.RM10_DOOR_H
        for (const th of [i0, i1]) addGeo(place(radialPlate([
          [C.rm10R(y0) + C.RM10_CONE_T, y0], [C.rm10R(y0), y0],
          [C.rm10R(yH), yH], [C.rm10R(yH) + C.RM10_CONE_T, yH]], t2, th)), SHELL)
        lring(C.rm10R(yH), C.rm10R(yH) + C.RM10_CONE_T, yH, i0, i1, SHELL)
        for (const th of (FL ? [b0] : [b0, b1])) addGeo(place(radialPlate([
          [C.rm10R(y0 - t2) + C.RM10_CONE_T - t2, y0 - t2], [RO + t2, y0 - t2],
          [RO + t2, y1 + t2], [C.rm10R(y1 + t2) + C.RM10_CONE_T - t2, y1 + t2]], t2, th)), SHELL)
        const xs = -(RO - t2), xe = -(RO + C.RM10_STR_L)
        const hw = C.RM10_EXIT_W / 2, dw = C.RM10_TERR_DOOR_W / 2
        lring(C.rm10Tiers()[0].r1 - t2, C.rm10R(y0) + C.RM10_CONE_T, y0 - 0.04, i0, i1, FLOOR)   // ★79-9 문지방
        if (FL) {
          //  ★80 S자 나팔 — ⚠**빌더를 직접 부른다(사본 금지).** 구판은 직선 통로를 제 손으로 다시
          //   그렸고, ★80이 그걸 폐기한 뒤에도 계속 그렸을 것이다 = 도구가 거짓말한다(★79-7 전례).
          for (const m of buildFlareShell()) addGeo(place(m.geo), m.walk ? FLOOR : SHELL)
        } else {
          lbox((xs + xe) / 2, y0 - 0.04 - t2 / 2, 0, xs - xe, t2, C.RM10_EXIT_W + 2 * t2, FLOOR)
          lbox((xs + xe) / 2, y1 + 0.02 + t2 / 2, 0, xs - xe, t2, C.RM10_EXIT_W + 2 * t2, SHELL)
          for (const sg of [-1, 1]) lbox((xs + xe) / 2, (y0 + y1) / 2, sg * (hw + t2 / 2), xs - xe, y1 - y0 + 2 * t2, t2, SHELL)
          for (const sg of [-1, 1]) lbox(xe + t2 / 2, (y0 + y1) / 2, sg * (dw + (hw - dw) / 2), t2, y1 - y0 + 2 * t2, hw - dw, SHELL)
          lbox(xe + t2 / 2, (y0 + C.PASS_DOOR_H + y1) / 2, 0, t2, y1 - (y0 + C.PASS_DOOR_H), 2 * dw, SHELL)
        }
      }
      //  중앙 등불 — 관 + 갓
      {
        const my = C.RM10_CENTER_Y + C.LAMP_MOUTH_Y1, ny = my + C.LAMP_FUNNEL_H
        const rod = new THREE.CylinderGeometry(C.LAMP_TUBE_R, C.LAMP_TUBE_R, C.LAMP_TOP_Y - ny, 12, 1, true)
        rod.translate(0, (ny + C.LAMP_TOP_Y) / 2, 0); addGeo(place(rod), [232, 196, 140])
        const fun = new THREE.CylinderGeometry(C.LAMP_TUBE_R, C.LAMP_MOUTH_R, C.LAMP_FUNNEL_H, 16, 1, true)
        fun.translate(0, (my + ny) / 2, 0); addGeo(place(fun), [246, 214, 160])
      }
    }
  }
}

const W = 880, H = 495

//  ── ★사각지대 검사 `node src/render_views.mjs --coverage` (★신설 2026.07.28) ──
//   왜 있는가: 이 도구는 **회랑 이후 여정 전부를 한 조각도 굽지 않고 있었다.** 그런데 아무도 몰랐다 —
//   구우면 그림이 나오긴 하니까(하늘·리브만 나와도 PNG는 만들어진다). 검사가 없으면 '눈이 먼 권역'은
//   영영 안 보인다. ⇒ 웨이포인트마다 저해상도로 구워 **배경 픽셀 비율**을 재고, 사실상 빈 화면이면 보고한다.
//   ⚠이건 형태가 *맞는가*를 재는 검사가 아니다. 도구가 그 자리에서 *뭔가라도 보는가*만 잰다(정직한 한계).
//  ★기준선(baseline) = **지금 알고 있는** 사각지대. 새 사각지대만 실패로 본다(회귀 가드).
//   ⚠기준선은 '괜찮다'는 뜻이 아니라 '적발됐고 아직 안 고쳤다'는 뜻이다. 줄여 나갈 목록이다.
const COV_KNOWN = {
  room: '정의·공리 방(Room.jsx) — 이 도구는 드럼 홀 권역만 근사한다(파일 머리 명시). 범위 밖.',
  p2:   '방사 4방(Radial.jsx) — 위와 같음. 범위 밖.',
  p3:   '방사 4방(Radial.jsx) — 위와 같음. 범위 밖.',
  reveal: '⚠★80 신규: 나팔 입에서 앞을 보면 **열린 돔**뿐인데 이 도구는 드럼 홀 권역만 근사한다(파일 머리). ' +
          '즉 **클라이막스 시점은 원리적으로 자기 검증이 안 된다** — 통로 후반부(진행 ~70% 이후)의 형태·비례는 ' +
          '현도의 로컬 확인이 유일한 판정기다. lookout과 같은 뿌리(카메라별 굽기 부재)이나, 여기선 그리는 범위 자체의 문제라 ' +
          '카메라별 굽기로도 안 풀린다. 통로 **안쪽**은 free 카메라로 볼 수 있다(진행 5%·45% 확인함).',
  lookout: '⚠★미해결: 1p8 전망에서 **보어 올려다보기**가 이 도구엔 안 보인다. 관 셸을 보행선 위로 안 굽기 ' +
           '때문(무릎길 가림 회피 — 파일 머리 참조). 삼각형 한 벌을 모든 카메라가 공유하는 구조의 한계라, ' +
           '고치려면 **카메라별 굽기**가 필요하다. 1p8 권역의 핵심 시점이므로 우선순위 있음.',
}
function coverage() {
  const BG = [222, 216, 203], w = 176, h = 99
  const rows = [], blind = []
  for (const wp of WAYPOINTS) {
    const tmp = `_cov_tmp.png`
    render([wp.x, wp.y + EYE, wp.z], wp.yaw, wp.pitch, w, h, tmp, true)
    const px = PNG.sync.read(fs.readFileSync(tmp))
    let bg = 0
    for (let i = 0; i < px.data.length; i += 4)
      if (px.data[i] === BG[0] && px.data[i + 1] === BG[1] && px.data[i + 2] === BG[2]) bg++
    const frac = bg / (w * h)
    rows.push([wp.id, frac])
    if (frac > 0.98) blind.push(wp.id)
    fs.unlinkSync(tmp)
  }
  console.log('— 셀프 렌더 사각지대 검사 (배경 픽셀 비율; 0.98 초과 = 아무것도 안 그려짐) —')
  for (const [id, f] of rows)
    console.log(`  ${f > 0.98 ? (COV_KNOWN[id] ? '·' : '✗') : '✓'} ${id.padEnd(12)} 배경 ${(f * 100).toFixed(1)}%`)
  const fresh = blind.filter(id => !COV_KNOWN[id])
  const fixed = Object.keys(COV_KNOWN).filter(id => !blind.includes(id))
  console.log('\n[기준선 — 적발됐으나 미해결]')
  for (const id of Object.keys(COV_KNOWN)) console.log(`  · ${id}: ${COV_KNOWN[id]}`)
  if (fixed.length) console.log(`\n✓ 기준선에서 해소됨 — COV_KNOWN에서 지울 것: ${fixed.join(', ')}`)
  if (fresh.length) { console.error(`\n✗ 새 사각지대 ${fresh.length}곳: ${fresh.join(', ')}`); process.exit(1) }
  console.log(`\n새 사각지대 없음 (${rows.length}시점 · 삼각형 ${tris.length})`)
}
if (process.argv.includes('--coverage')) { coverage(); process.exit(0) }

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
