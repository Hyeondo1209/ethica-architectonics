// _probe_clf_body.mjs — _probe_clf.mjs 본문(개발 도구). 조립·프레임이 끝난 scene을 받는다.
//  ⓐ 회랑 부재 표(RevealPassage 중 구역 I 그룹 밖 = 회랑 C절 · CloisterLamps)
//  ⓑ 광선 렌더: 화면 픽셀마다 BVH 광선 → 명중 삼각형의 보간 법선·정점색 → 장면광 조도(lightingModel.luxAt와 같은 항:
//     amb + hemi(n) + Σ dir·max(0,n·l) + Σ 점광 distAtt·cos) × 재질 밝기 × 정점색 → displayLum(ACES+sRGB).
//     ⚠그림자 없음(RND_SHADOWS=false = 실제 앱과 같음) · 투명 재질·빛 볼륨은 제외(판정 대상이 벽 명암이라서).
//  좌표: 회랑은 상부 여정 그룹(rotation-y = −RIB_DEST_PHI) 안 — 자세는 회랑 로컬(φ, r, y)로 적고 월드로 돌린다.
import { MeshBVH } from 'three-mesh-bvh'
import { PNG } from 'pngjs'
import { writeFileSync, mkdirSync } from 'fs'

export async function run({ THREE, scene, LM, K, errs, args }) {
  const console = { log: (...a) => process.stdout.write(a.join(" ") + "\n") }
  scene.updateMatrixWorld(true)
  const arg = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d }
  const OUT = arg('out', '/tmp/clf'), TAG = arg('tag', 'now'); mkdirSync(OUT, { recursive: true })
  const A = K.RIB_XFER_ON ? K.RIB_DEST_PHI : 0, ca = Math.cos(A), sa = Math.sin(A)
  const toW = (p) => [p[0] * ca - p[2] * sa, p[1], p[0] * sa + p[2] * ca]          // 회랑 로컬 → 월드(φ + A)
  const cyl = (phiDeg, r, y) => { const f = phiDeg * Math.PI / 180; return toW([r * Math.cos(f), y, r * Math.sin(f)]) }
  const underZoneI = (o) => { for (let c = o; c; c = c.parent) if (c.userData && c.userData.zoneI) return true; return false }

  // ── ⓐ 부재 표 ──
  const v = new THREE.Vector3(), rows = {}
  scene.traverse((o) => {
    if (!o.isMesh) return
    const comp = o.userData.__comp || '?'
    if (comp !== 'RevealPassage' && comp !== 'CloisterLamps' && comp !== 'LampRod' && comp !== 'LampRoot' && comp !== 'LampBeam') return
    if (underZoneI(o)) return
    const g = o.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count
    let area = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (let i = 0; i + 2 < n; i += 3) { const ia = I ? I.getX(i) : i, ib = I ? I.getX(i + 1) : i + 1, ic = I ? I.getX(i + 2) : i + 2
      a.fromBufferAttribute(P, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, ib).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, ic).applyMatrix4(o.matrixWorld)
      area += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2 }
    const m = [].concat(o.material)[0], key = comp + ' · ' + g.type + ' · ' + (m ? m.type : '?') + (m && m.vertexColors ? '·V' : '') + (m && m.side === THREE.DoubleSide ? '·2면' : '')
    const R = rows[key] || (rows[key] = { n: 0, tris: 0, area: 0, verts: 0 }); R.n++; R.tris += n / 3; R.area += area; R.verts += P.count
  })
  console.log('\n── ⓐ 회랑 부재(구역 I 그룹 밖) ──')
  for (const [k, R] of Object.entries(rows).sort((x, y) => y[1].area - x[1].area)) console.log(`${k.padEnd(62)} 메시${String(R.n).padStart(4)} 삼각형${String(R.tris).padStart(6)} 정점${String(R.verts).padStart(6)} 면적${R.area.toFixed(0).padStart(7)}㎡`)
  const pts = []; scene.traverse((o) => { if (o.isPointLight) { o.getWorldPosition(v); pts.push({ p: [v.x, v.y, v.z], i: o.intensity, dist: o.distance, decay: o.decay, comp: o.userData.__comp }) } })
  console.log(`점광 ${pts.length}개 — 회랑 근처(r 160~180 · y 225~290): ${pts.filter((q) => Math.hypot(q.p[0], q.p[2]) > 160 && Math.hypot(q.p[0], q.p[2]) < 180 && q.p[1] > 225 && q.p[1] < 290).length}`)
  //  프레임 자기검증: 첫 등불(k=LAMP_RIBS[0]) 빛기둥 메시의 월드 x·z가 공식과 같은가
  { let beam = null; scene.traverse((o) => { if (!beam && o.isMesh && o.userData.__comp === 'LampBeam') beam = o })
    if (beam) { beam.getWorldPosition(v); const f = K.LAMP_RIBS[0] * 360 / K.MERIDIANS, q = cyl(f, K.LAMP_R, 0)
      console.log(`프레임 검증: 첫 빛기둥 월드 (${v.x.toFixed(3)}, ${v.z.toFixed(3)}) vs 공식 (${q[0].toFixed(3)}, ${q[2].toFixed(3)}) — 차 ${Math.hypot(v.x - q[0], v.z - q[2]).toExponential(1)}`) } }

  { const Z = globalThis.window.__ethicaClf; if (Z) { let nIn = 0, nOut = 0; for (const r of Z.records) for (const s of (r.triSide || [])) { if (s) nIn++; else nOut++ }
      console.log(`CLF 베이크: 수광 메시 ${Z.records.length}(재격자 ${Z.nRegrid} · 변 세분 ${Z.nFallback}) · 실내 삼각형 ${nIn} · 바깥면 삼각형 ${nOut} · poolRef ${Z.spec.poolRef.toFixed(4)} · winRef ${Z.spec.winRef.toFixed(4)}`) } else console.log('CLF 베이크 핸들 없음') }
  { const Z = globalThis.window.__ethicaClf; console.log('이음매 패스: ' + JSON.stringify(Z && Z.seam))
    scene.traverse((o) => { const sm = o.isMesh && o.geometry && o.geometry.userData.clfSeam; if (!sm || !sm.length) return; const P = o.geometry.attributes.position, w = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9
      for (const id of sm) { w.fromBufferAttribute(P, id).applyMatrix4(o.matrixWorld); const l = [w.x * ca + w.z * sa, w.y, -w.x * sa + w.z * ca]; x0 = Math.min(x0, l[0]); x1 = Math.max(x1, l[0]); y0 = Math.min(y0, l[1]); y1 = Math.max(y1, l[1]); z0 = Math.min(z0, l[2]); z1 = Math.max(z1, l[2]) }
      console.log(`   이음매 #${o.id} ${o.userData.__comp} 정점 ${sm.length} · 로컬 x ${x0.toFixed(2)}~${x1.toFixed(2)} y ${y0.toFixed(2)}~${y1.toFixed(2)} z ${z0.toFixed(2)}~${z1.toFixed(2)}`) }) }
  // ── ⓑ 소프(회랑 부근 삼각형만) ──
  const C0 = arg('c0', '') ? arg('c0', '').split(',').map(Number) : cyl(25, K.CL_R, 250), RAD = +arg('rad', 75)   // ★227 --c0=x,y,z(월드) --rad=m
  const pos = [], nrm = [], col = [], mat = [], pth = [], mk = []   // 삼각형별 3정점 · ★229 aZiPath
  const cTmp = new THREE.Color(), lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  const nMat = new THREE.Matrix3(), M = new THREE.Matrix4(), im = new THREE.Matrix4(), nn = new THREE.Vector3()
  const add = (o, g, Mw, instCol) => {
    const P = g.attributes.position, N = g.attributes.normal, CA = g.attributes.color, I = g.index, n = I ? I.count : P.count
    const m = [].concat(o.material)[0]; if (!m || m.transparent || m.isShaderMaterial || o.userData.lightVolume) return
    const basic = m.isMeshBasicMaterial, useV = !!(m.vertexColors && CA)
    const alb = lum(m.color || cTmp.setScalar(1)) * (instCol ?? 1)
    const emi = m.emissive ? lum(m.emissive) * (m.emissiveIntensity ?? 1) : 0
    nMat.getNormalMatrix(Mw)
    for (let i = 0; i + 2 < n; i += 3) {
      const ids = [0, 1, 2].map((k) => (I ? I.getX(i + k) : i + k))
      const W = ids.map((id) => v.fromBufferAttribute(P, id).applyMatrix4(Mw).toArray())
      if (W.every((w) => Math.hypot(w[0] - C0[0], w[1] - C0[1], w[2] - C0[2]) > RAD)) continue
      for (let k = 0; k < 3; k++) { pos.push(...W[k])
        if (N) { nn.fromBufferAttribute(N, ids[k]).applyMatrix3(nMat).normalize(); nrm.push(nn.x, nn.y, nn.z) } else nrm.push(0, 0, 0)
        col.push(useV ? lum({ r: CA.getX(ids[k]), g: CA.getY(ids[k]), b: CA.getZ(ids[k]) }) : 1); { const AZ = g.attributes.aZiPath; pth.push(AZ && useV ? AZ.getX(ids[k]) : 0, AZ && useV ? AZ.getY(ids[k]) : 0, AZ && useV ? AZ.getZ(ids[k]) : 0) } }
      const AC = g.attributes.aClf, clf = (AC && m.vertexColors) ? AC.getX(ids[0]) : null   // ★226 면 방향 게이트(셰이더와 같은 규칙)
      const AM = g.attributes.aClfMark; for (let k = 0; k < 3; k++) mk.push(AM && clf !== null ? AM.getX(ids[k]) : 0)   // ★232
      mat.push({ alb, emi, basic, comp: o.userData.__comp || '?', clf, mid: o.id, gtype: (o.geometry.userData.bakedClf ? 'CLF:' : '') + (o.geometry.type || '') })
    }
  }
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return
    if (o.isInstancedMesh) { const cc = new THREE.Color(); for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, im); M.multiplyMatrices(o.matrixWorld, im); let ic = null; if (o.instanceColor) { o.getColorAt(k, cc); ic = lum(cc) } add(o, o.geometry, M, ic) } return }
    add(o, o.geometry, o.matrixWorld, null)
  })
  const nT = mat.length
  const soup = new THREE.BufferGeometry(); soup.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  { const id = new Uint32Array(nT * 3); for (let i = 0; i < id.length; i++) id[i] = i; soup.setIndex(new THREE.BufferAttribute(id, 1)) }
  const bvh = new MeshBVH(soup), SIDX = soup.index.array
  console.log(`\n── ⓑ 렌더 소프 ${nT}삼각형(중심 반경 ${RAD}m) ──`)

  const dirs = LM.DIRS.map((d) => ({ i: d.i, l: LM.nrm(d.p) }))
  const shade = (p, n, alb, vc, emi, basic) => {
    if (basic) return LM.displayLum(alb * vc)                                  // 무조명(도관·봉)
    let E = K.LGT_AMB_I + K.LGT_HEMI_I * (LM.HEMI_GND_LUM + (LM.HEMI_SKY_LUM - LM.HEMI_GND_LUM) * (0.5 * n[1] + 0.5))
    let SP = 0   // ★238 방향광 GGX 정반사(three MeshStandardMaterial: F0 0.04 · α = rough² · Smith 상관 V · Schlick F) — 시선 V가 있을 때만
    for (const d of (globalThis.__noDir ? [] : dirs)) { const nl = Math.max(0, n[0] * d.l[0] + n[1] * d.l[1] + n[2] * d.l[2]); E += d.i * nl
      if (globalThis.__view && nl > 0 && globalThis.__rough !== undefined) { const V = globalThis.__view, nv = Math.max(1e-4, n[0] * V[0] + n[1] * V[1] + n[2] * V[2]), Hh = LM.nrm([d.l[0] + V[0], d.l[1] + V[1], d.l[2] + V[2]])
        const nh = Math.max(0, n[0] * Hh[0] + n[1] * Hh[1] + n[2] * Hh[2]), vh = Math.max(0, V[0] * Hh[0] + V[1] * Hh[1] + V[2] * Hh[2]), a = globalThis.__rough ** 2, a2 = a * a
        const D = a2 / (Math.PI * (nh * nh * (a2 - 1) + 1) ** 2), gv = nl * Math.sqrt(a2 + (1 - a2) * nv * nv), gl = nv * Math.sqrt(a2 + (1 - a2) * nl * nl), Vs = 0.5 / Math.max(1e-6, gv + gl)
        const F = 0.04 + 0.96 * Math.pow(1 - vh, 5); SP += d.i * nl * F * Vs * D } }
    globalThis.__lastSpec = SP
    for (const q of (globalThis.__noPt ? [] : pts)) { const dx = q.p[0] - p[0], dy = q.p[1] - p[1], dz = q.p[2] - p[2], dd = Math.hypot(dx, dy, dz); if (q.dist > 0 && dd > q.dist) continue
      E += q.i * LM.distAtt(dd, q.dist, q.decay) * Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / dd) }
    globalThis.__lastE = alb * vc * E + SP + emi
    return LM.displayLum(alb * vc * E + SP + emi)
  }
  const ray = new THREE.Ray()
  const render = (name, eyeL, tgtL, W = 480, H = 270, fovV = 70) => {
    const eye = toW(eyeL), tgt = toW(tgtL)
    const cam = new THREE.PerspectiveCamera(fovV, W / H, 0.1, 500); cam.position.set(...eye); cam.lookAt(...tgt); cam.updateMatrixWorld(true)
    const png = new PNG({ width: W, height: H }), dir = new THREE.Vector3(); let hits = 0, gated = 0, gatedIn = 0; const bad = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      dir.set((x + 0.5) / W * 2 - 1, 1 - (y + 0.5) / H * 2, 0.5).unproject(cam).sub(cam.position).normalize()
      ray.origin.copy(cam.position); ray.direction.copy(dir)
      const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, 400); let L = LM.displayLum(0.9)   // 배경(하늘 근사)
      if (h) { hits++; const t = (SIDX[h.faceIndex * 3] / 3) | 0, o9 = t * 9, P = h.point
        const a = [pos[o9], pos[o9 + 1], pos[o9 + 2]], b = [pos[o9 + 3], pos[o9 + 4], pos[o9 + 5]], c = [pos[o9 + 6], pos[o9 + 7], pos[o9 + 8]]
        const v0 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v2 = [P.x - a[0], P.y - a[1], P.z - a[2]]
        const d00 = v0[0] * v0[0] + v0[1] * v0[1] + v0[2] * v0[2], d01 = v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2], d11 = v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]
        const d20 = v2[0] * v0[0] + v2[1] * v0[1] + v2[2] * v0[2], d21 = v2[0] * v1[0] + v2[1] * v1[1] + v2[2] * v1[2], den = d00 * d11 - d01 * d01 || 1
        const bv = (d11 * d20 - d01 * d21) / den, bw = (d00 * d21 - d01 * d20) / den, bu = 1 - bv - bw
        let n = [0, 1, 2].map((k) => bu * nrm[o9 + k] + bv * nrm[o9 + 3 + k] + bw * nrm[o9 + 6 + k]); const nl = Math.hypot(...n)
        if (nl < 1e-6) { n = [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]] } n = LM.nrm(n)
        if (n[0] * dir.x + n[1] * dir.y + n[2] * dir.z > 0) n = n.map((q) => -q)   // 양면 재질: 보는 쪽 법선
        const m = mat[t]; let vc = bu * col[t * 3] + bv * col[t * 3 + 1] + bw * col[t * 3 + 2]
        //  ⛔도구 정정(★226): 광선 방향으로만 물러나면 스치는 광선이 현(chord) 처짐 3.3mm·δ 띠·창턱선에 걸려 거짓 경보(858+50px 실측) → 보는 쪽 법선 2cm + 광선 5cm
        if (m.clf !== null) { const wn = [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]]
          const front = wn[0] * dir.x + wn[1] * dir.y + wn[2] * dir.z < 0; if (!(m.clf * (front ? 1 : -1) > 0.5)) vc = 1
          else { gated++; const q = [P.x + n[0] * 0.02 - dir.x * 0.05, P.y + n[1] * 0.02 - dir.y * 0.05, P.z + n[2] * 0.02 - dir.z * 0.05], ql = [q[0] * ca + q[2] * sa, q[1], -q[0] * sa + q[2] * ca]; if (LM.clfInterior(ql)) gatedIn++; else if (bad.length < 4000) { const hl = [P.x * ca + P.z * sa, P.y, -P.x * sa + P.z * ca], ph = Math.atan2(hl[2], hl[0])
            bad.push({ dy: +(hl[1] - K.clFloorY(ph)).toFixed(3), dr: +(Math.hypot(hl[0], hl[2]) - K.CL_R).toFixed(3), ny: +n[1].toFixed(2), comp: m.comp, grazing: +Math.abs(n[0] * dir.x + n[1] * dir.y + n[2] * dir.z).toFixed(3), phd: +(ph * 180 / Math.PI).toFixed(3), y: +hl[1].toFixed(3), nr: +((n[0] * ca + n[2] * sa) * Math.cos(ph) + (-n[0] * sa + n[2] * ca) * Math.sin(ph)).toFixed(3), qIn: LM.clfInterior(ql), qr: +(Math.hypot(ql[0], ql[2]) - K.CL_R).toFixed(4), qy: +(ql[1] - K.clFloorY(Math.atan2(ql[2], ql[0]))).toFixed(4), qph: +(Math.atan2(ql[2], ql[0]) * 180 / Math.PI).toFixed(3) }) } } }
        L = shade([P.x, P.y, P.z], n, m.alb, vc, m.emi, m.basic) }
      const g8 = Math.round(Math.max(0, Math.min(1, L)) * 255), q = (y * W + x) * 4
      png.data[q] = g8; png.data[q + 1] = g8; png.data[q + 2] = g8; png.data[q + 3] = 255
    }
    const f = `${OUT}/${TAG}_${name}.png`; writeFileSync(f, PNG.sync.write(png)); console.log(`  ${f} · 명중 ${(100 * hits / (W * H)).toFixed(0)}% · 정점색 칠해진 픽셀 ${gated} 중 명중 직전 점이 회랑 공극 안 ${gatedIn}${gated === gatedIn ? ' ✓' : ' ✗ 외면 누출 의심'}`)
    if (bad.length) { const cat = {}; for (const b of bad) { const k = `${b.ny > 0.9 ? '위향면' : b.ny < -0.9 ? '아래향면' : '세로면'} dy${b.dy < -0.05 ? '<-0.05' : b.dy < 0.05 ? '≈0' : '>0'} 스침${b.grazing < 0.2 ? '<0.2' : '≥0.2'}`; cat[k] = (cat[k] || 0) + 1 }
      console.log('    불일치 분류: ' + JSON.stringify(cat))
      if (bad.length <= 10) for (const b of bad) console.log('     전수 ' + JSON.stringify(b))
      const hi = bad.length <= 10 ? [] : bad.filter((b) => b.grazing >= 0.2); const seen = new Set()
      for (const b of hi) { const k = `${b.phd.toFixed(1)}|${b.dr.toFixed(1)}|${b.y.toFixed(1)}`; if (seen.has(k)) continue; seen.add(k); if (seen.size > 12) break; console.log('     ' + JSON.stringify(b)) }
      const lo = bad.filter((b) => b.grazing < 0.2), drs = lo.map((b) => b.dr); if (lo.length) console.log(`     스침<0.2: dr 범위 ${Math.min(...drs)}~${Math.max(...drs)} · 그중 안벽(dr<-2.5) ${lo.filter((b) => b.dr < -2.5).length} · 바깥벽(dr>2.5) ${lo.filter((b) => b.dr > 2.5).length} · 물러난 점 반경−CL_R 최대 ${Math.max(...lo.map((b) => b.qr))}`) }
  }
  //  ★226 HUD free: 자세(월드 x,y,z,yaw°,pitch°) — _probe_zoneI --look과 같은 규약(Euler(pitch, yaw, 0, 'YXZ')) · 셰이딩 + 부재 가색 + 정점색 값 세 장
  const renderPose = (name, pose, W = 640, H = 360) => {
    const [px, py, pz, yawD, pitD] = pose, yaw = yawD * Math.PI / 180, pit = pitD * Math.PI / 180
    const tanV = Math.tan(35 * Math.PI / 180), tanH = tanV * W / H, E = new THREE.Euler(pit, yaw, 0, 'YXZ')
    const imS = new PNG({ width: W, height: H }), imM = new PNG({ width: W, height: H }), imV = new PNG({ width: W, height: H }), imW = new PNG({ width: W, height: H }), dir = new THREE.Vector3(), tally = {}
    const hash = (k) => { let h = 2166136261; for (const c of String(k)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return [(h & 255), (h >> 8) & 255, (h >> 16) & 255] }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      dir.set(((x + 0.5) / W * 2 - 1) * tanH, (1 - (y + 0.5) / H * 2) * tanV, -1).normalize().applyEuler(E)
      ray.origin.set(px, py, pz); ray.direction.copy(dir)
      const h = bvh.raycastFirst(ray, THREE.DoubleSide, 0, 400), q = (y * W + x) * 4
      let L = LM.displayLum(0.9), mc = [200, 220, 255], vv = 255
      if (h) { const t = (SIDX[h.faceIndex * 3] / 3) | 0, o9 = t * 9, P = h.point, m = mat[t]
        const a = [pos[o9], pos[o9 + 1], pos[o9 + 2]], b = [pos[o9 + 3], pos[o9 + 4], pos[o9 + 5]], c = [pos[o9 + 6], pos[o9 + 7], pos[o9 + 8]]
        const v0 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v1 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v2 = [P.x - a[0], P.y - a[1], P.z - a[2]]
        const d00 = v0[0] * v0[0] + v0[1] * v0[1] + v0[2] * v0[2], d01 = v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2], d11 = v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]
        const d20 = v2[0] * v0[0] + v2[1] * v0[1] + v2[2] * v0[2], d21 = v2[0] * v1[0] + v2[1] * v1[1] + v2[2] * v1[2], den = d00 * d11 - d01 * d01 || 1
        const bv = (d11 * d20 - d01 * d21) / den, bw = (d00 * d21 - d01 * d20) / den, bu = 1 - bv - bw
        let n = LM.nrm([0, 1, 2].map((k) => bu * nrm[o9 + k] + bv * nrm[o9 + 3 + k] + bw * nrm[o9 + 6 + k]).map((x2) => x2 || 0))
        if (!Number.isFinite(n[0])) n = LM.nrm([v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]])
        if (n[0] * dir.x + n[1] * dir.y + n[2] * dir.z > 0) n = n.map((z) => -z)
        let vc = bu * col[t * 3] + bv * col[t * 3 + 1] + bw * col[t * 3 + 2], gate = 'raw'
        { const q9 = t * 9, it = (k) => bu * pth[q9 + k] + bv * pth[q9 + 3 + k] + bw * pth[q9 + 6 + k], wW = it(0), wT = it(1)   // ★230 셰이더와 같은 가중 혼합 · ★231 직사 = 해석 프로파일
          if (wW + wT > 1e-4) { const pl = LM.ziToLocal([P.x, P.y, P.z]), A = LM.zoneIPathA(pl), h = LM.zoneIHoleProfileAt(pl), D = K.ZI_DIM; vc *= 1 + (A - 1) * Math.min(1, wW); const tT = D + (1 - D) * Math.min(1, (A - D) / (1 - D) + h); vc += (tT - vc) * Math.min(1, wT) } }
        if (m.clf !== null) { const wn = [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]]
          const front = wn[0] * dir.x + wn[1] * dir.y + wn[2] * dir.z < 0; gate = (m.clf * (front ? 1 : -1) > 0.5) ? 'in' : 'off'; if (gate === 'off') vc = 1
          else { const mm = bu * mk[t * 3] + bv * mk[t * 3 + 1] + bw * mk[t * 3 + 2]; if (mm > 1e-4) vc = Math.min(1, vc + K.CLF_MARK_K * (1 - K.CLF_DIM) * LM.clfPoolAt(LM.ziToLocal([P.x, P.y, P.z])) * mm) } }   // ★232 셰이더와 같은 식
        { const isRib = /LampRibs|DomeRibs/.test(m.comp || ''); globalThis.__view = isRib ? [-dir.x, -dir.y, -dir.z] : null; globalThis.__rough = isRib ? 0.7 : undefined
          const q0 = LM.ziToLocal([P.x, P.y, P.z]), r0 = Math.hypot(q0[0], q0[2]); globalThis.__noDir = !!(args.includes('--ribnodir') && isRib && r0 > K.CL_R - K.CL_HW - 0.05 && r0 < K.CL_R + K.CL_HW + 0.05 && q0[1] < K.CL_ROOF_Y)
          globalThis.__noPt = !!(isRib && !args.includes('--ribold') && LM.ribInCloister([P.x, P.y, P.z])) }   // ★238 셰이더와 같은 규칙(회랑 안 리브 = 점광 없음)
        L = shade([P.x, P.y, P.z], n, m.alb, vc, m.emi, m.basic); mc = hash(m.mid); vv = Math.round(Math.max(0, Math.min(1, vc)) * 255)
        if (/LampRibs|DomeRibs/.test(m.comp || '')) { const q = LM.ziToLocal([P.x, P.y, P.z]), rr = Math.hypot(q[0], q[2]), inside = rr > K.CL_R - K.CL_HW - 0.05 && rr < K.CL_R + K.CL_HW + 0.05 && q[1] < K.CL_ROOF_Y
          const gw = [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]], fr = (gw[0] * dir.x + gw[1] * dir.y + gw[2] * dir.z) < 0, nn = n, key = (inside ? '회랑안' : '회랑밖') + (fr ? '·앞면' : '·뒷면')
          const A = (globalThis.__ribAcc ||= {}); const Ew = globalThis.__lastE; const sv = globalThis.__noDir; globalThis.__noDir = true; shade([P.x, P.y, P.z], n, m.alb, vc, m.emi, m.basic); const En = globalThis.__lastE; globalThis.__noDir = sv
          const svP = globalThis.__noPt; globalThis.__noDir = true; globalThis.__noPt = true; shade([P.x, P.y, P.z], n, m.alb, vc, m.emi, m.basic); const Eind = globalThis.__lastE; globalThis.__noDir = sv; globalThis.__noPt = svP
          const e = (A[key] ||= { n: 0, L: 0, ny: 0, r: 0, sp: 0, Ew: 0, En: 0 }); e.n++; e.L += L; e.ny += nn[1]; e.r += rr; e.sp += globalThis.__lastSpec || 0; e.Ew += Ew; e.En += En; e.Ei = (e.Ei || 0) + Eind }
        const edge = Math.min(bu, bv, bw) * Math.sqrt(Math.min(d00, d11)) < 0.03; imW.data[q] = imW.data[q + 1] = imW.data[q + 2] = edge ? 0 : vv; imW.data[q + 3] = 255
        const key = `${m.comp}#${m.mid} ${m.gtype} clf=${m.clf} gate=${gate}`; tally[key] = (tally[key] || 0) + 1 }
      const g8 = Math.round(Math.max(0, Math.min(1, L)) * 255)
      imS.data[q] = imS.data[q + 1] = imS.data[q + 2] = g8; imM.data[q] = mc[0]; imM.data[q + 1] = mc[1]; imM.data[q + 2] = mc[2]; imV.data[q] = imV.data[q + 1] = imV.data[q + 2] = vv
      imS.data[q + 3] = imM.data[q + 3] = imV.data[q + 3] = 255 }
    if (globalThis.__ribAcc) { for (const [k, e] of Object.entries(globalThis.__ribAcc)) console.log(`리브픽셀 ${k}: ${e.n}px · 평균 음영 ${(e.L / e.n).toFixed(3)} · 평균 법선 y ${(e.ny / e.n).toFixed(2)} · 평균 r ${(e.r / e.n).toFixed(1)} · 평균 정반사 ${(e.sp / e.n).toFixed(4)} · 선형 E(방향광 포함) ${(e.Ew / e.n).toFixed(3)} · 선형 E(방향광 없음) ${(e.En / e.n).toFixed(3)} · 선형 E(직접광 전부 없음 = 반구+환경) ${(e.Ei / e.n).toFixed(3)}`); globalThis.__ribAcc = null }
    for (const [im, suf] of [[imS, 'shade'], [imM, 'mesh'], [imV, 'vcol'], [imW, 'wire']]) writeFileSync(`${OUT}/${TAG}_${name}_${suf}.png`, PNG.sync.write(im))
    console.log(`  포즈 ${name}: 부재별 픽셀(상위 12) — 색 · 로컬 범위(r · y · φ°)`)
    const byId = new Map(); scene.traverse((o) => { if (o.isMesh) byId.set(o.id, o) })
    const rng = (o) => { if (o.isInstancedMesh) return 'inst'; const P = o.geometry.attributes.position; let r0 = 1e9, r1 = -1e9, y0 = 1e9, y1 = -1e9, f0 = 1e9, f1 = -1e9; const w = new THREE.Vector3()
      for (let i = 0; i < P.count; i += Math.max(1, (P.count / 400) | 0)) { w.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const l = [w.x * ca + w.z * sa, w.y, -w.x * sa + w.z * ca], r = Math.hypot(l[0], l[2]), f = Math.atan2(l[2], l[0]) * 180 / Math.PI
        r0 = Math.min(r0, r); r1 = Math.max(r1, r); y0 = Math.min(y0, l[1]); y1 = Math.max(y1, l[1]); f0 = Math.min(f0, f); f1 = Math.max(f1, f) }
      return `r ${r0.toFixed(2)}~${r1.toFixed(2)} · y ${y0.toFixed(2)}~${y1.toFixed(2)} · φ ${f0.toFixed(2)}~${f1.toFixed(2)}` }
    for (const [k, c] of Object.entries(tally).sort((x2, y2) => y2[1] - x2[1]).slice(0, 12)) { const mid = +k.split('#')[1].split(' ')[0], o = byId.get(mid); console.log(`     ${String(c).padStart(6)} ${k} rgb${JSON.stringify(hash(mid))} ${o ? rng(o) : ''}`) }
  }
  //  ★226 --dump: 인방 밑면(rvh — r rOut~rOut2 · y = 위턱 수평) 구운 정점 ↔ 재계산 대조
  if (args.includes('--dump')) { const Z = globalThis.window.__ethicaClf, Fm = LM.clfFrame(), w = new THREE.Vector3(), nv = new THREE.Vector3(), nm3 = new THREE.Matrix3()
    for (const r of Z.records) { const o = r.o, g = o.geometry, P = g.attributes.position, C = g.attributes.color, A = g.attributes.aClf, N = g.attributes.normal
      w.fromBufferAttribute(P, 0).applyMatrix4(o.matrixWorld); const l0 = [w.x * ca + w.z * sa, w.y, -w.x * sa + w.z * ca]
      if (Math.abs(l0[1] - Fm.head) > 1e-3) continue
      let ok = true; for (let i = 0; i < P.count; i += 97) { w.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); if (Math.abs(w.y - Fm.head) > 1e-3) ok = false } if (!ok) continue
      nm3.getNormalMatrix(o.matrixWorld); const vals = []
      for (let i = 0; i < P.count; i++) { w.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const l = [w.x * ca + w.z * sa, w.y, -w.x * sa + w.z * ca]
        nv.fromBufferAttribute(N, i).applyMatrix3(nm3).normalize(); vals.push({ i, c: C.getX(i), a: A.getX(i), r: Math.hypot(l[0], l[2]), ph: Math.atan2(l[2], l[0]) * 180 / Math.PI, ny: nv.y, re: LM.clfShadeAt(l, [0, -1, 0]) }) }
      const cs = vals.map((q) => q.c).sort((a, b) => a - b)
      console.log(`rvh 후보 #${o.id}: 정점 ${P.count} · 색 분위(0,5,50,95,100)% ${[0, 0.05, 0.5, 0.95, 1].map((f) => cs[Math.min(cs.length - 1, Math.floor(f * cs.length))].toFixed(3)).join(' ')} · aClf 값 ${[...new Set(vals.map((q) => q.a))].join(',')}`)
      const top = vals.slice().sort((a, b) => b.c - a.c).slice(0, 8)
      for (const q of top) console.log(`   밝은 정점 #${q.i} 색 ${q.c.toFixed(3)} 재계산(아래 향) ${q.re.toFixed(3)} · 법선y ${q.ny.toFixed(3)} · r ${q.r.toFixed(3)} · φ ${q.ph.toFixed(3)} · aClf ${q.a}`)
      const bad = vals.filter((q) => Math.abs(q.c - q.re) > 0.02); console.log(`   구운 값 ≠ 재계산(>0.02) 정점 ${bad.length}/${vals.length} · 그중 법선y>0(위 향으로 구움) ${bad.filter((q) => q.ny > 0).length}`) }
    return }
  if (args.includes('--ribmat')) {   // ★238 리브 계열 메시·재질·그림자·조명 목록
    const seen = new Set()
    scene.traverse((o) => { if (!o.isMesh) return; const c = o.userData.__comp || o.name || ''; if (!/Rib|LampRoot/i.test(c)) return
      const ms = [].concat(o.material); for (const m of ms) { const key = c + '|' + m.uuid; if (seen.has(key)) continue; seen.add(key)
        console.log(`리브재질 ${c}#${o.id} inst=${!!o.isInstancedMesh}${o.isInstancedMesh ? '(' + o.count + ')' : ''} 재질=${m.type} color=#${m.color ? m.color.getHexString() : '-'} emis=#${m.emissive ? m.emissive.getHexString() : '-'}×${m.emissiveIntensity ?? '-'} rough=${m.roughness ?? '-'} metal=${m.metalness ?? '-'} vc=${m.vertexColors} side=${m.side} obc=${m.onBeforeCompile ? (m.customProgramCacheKey ? m.customProgramCacheKey() : 'y') : 'n'} cast=${o.castShadow} recv=${o.receiveShadow} fog=${m.fog} tone=${m.toneMapped}`) } })
    let nP = 0; scene.traverse((o) => { if (!o.isLight) return; if (o.isPointLight) { nP++; if (nP > 3) return } const wp = new THREE.Vector3(); o.getWorldPosition(wp); console.log(`조명 ${o.type} I=${o.intensity} col=${o.color && o.color.getHexString ? '#' + o.color.getHexString() : '-'} gnd=${o.groundColor && o.groundColor.getHexString ? '#' + o.groundColor.getHexString() : '-'} dist=${o.distance ?? '-'} 월드=${wp.toArray().map((v) => v.toFixed(0)).join(',')}`) }); console.log('점광 총', nP)
    return }
  if (args.includes('--shadegap')) {   // ★237 실제 메시 광선: 갓 입 아래에서 반경 0.60~0.70 고리를 수직·비스듬히 올려다봄 → 목(neckY) 위로 빠지는 광선 수(기대 0)
    const rc = new THREE.Raycaster(); let tot = 0, leak = 0; const ex = [], tg = []
    scene.traverse((o) => { if (o.isMesh && /CloisterLamps|LampRod|LampRoot/.test(o.userData.__comp || '')) tg.push(o) })   // 등불 부재만(틈 판정에 충분 · 전 장면은 너무 느리다)
    console.log('갓틈 대상 메시', tg.length)
    //  ⛔첫 판 = 입 밖으로 지나는(갓에 안 들어간) 광선까지 셌다(바깥 기울기 1440 '누수'는 가짜). ⇒ **목 평면의 틈 고리(r 0.674~0.698)를 지나는** 광선을 역으로 짓고, 입 평면에서 입 안(r < 입 반경)으로 들어온 것만 센다
    for (const L of K.clLampSpecs()) for (let a = 0; a < 48; a++) for (const rr of [0.674, 0.68, 0.69, 0.698]) for (const tilt of [-0.08, 0, 0.08]) {
      const th = (a + 0.5) / 48 * Math.PI * 2, c = Math.cos(th), s2 = Math.sin(th), dy = L.neckY - (L.mouthY - 0.5)
      const tgt = [L.x + c * rr, L.neckY - 0.01, L.z + s2 * rr], dL = [c * tilt, 1, s2 * tilt], lo = [tgt[0] - dL[0] * dy, L.mouthY - 0.5, tgt[2] - dL[2] * dy]
      const rMouth = Math.hypot(lo[0] + dL[0] * 0.5 - L.x, lo[2] + dL[2] * 0.5 - L.z); if (rMouth >= K.LAMP_MOUTH_R * Math.cos(Math.PI / 24) - 1e-3) continue   // 입 밖(갓 24각의 내접 반경 기준 — 원 반경으로 재면 다각형 밖 광선이 섞인다 · 실측 288 가짜) = 세지 않음
      const o = LM.ziToWorld(lo), d = LM.ziToWorld(dL); rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); rc.far = 3
      const h = rc.intersectObjects(tg, false).filter((q) => q.object.visible)[0]; tot++
      const yh = h ? LM.ziToLocal(h.point.toArray())[1] : Infinity; if (!(yh <= L.neckY + 0.05)) { leak++; if (ex.length < 4) ex.push({ phi: +(L.phi * 180 / Math.PI).toFixed(0), a, rr, tilt, hit: h ? (h.object.userData.__comp || h.object.name) + '@' + yh.toFixed(2) : '없음' }) } }
    console.log(`갓틈: 광선 ${tot} 중 목 위로 빠짐 ${leak} ${JSON.stringify(ex)}`); return }
  if (args.includes('--tubeup')) {   // ★235 실제 메시 광선: ① 관 축·시야 원뿔 위로 첫 가림 ② 지붕 구멍 가장자리에서 수평 바깥 첫 명중 = 리브 껍질?
    const R = LM.clfRoofHoleR(), rc = new THREE.Raycaster(), hits = (o, d) => { rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); rc.far = 60
      return rc.intersectObjects(scene.children, true).filter((h) => { const L = h.object; if (!L.visible || (L.material && L.material.visible === false)) return false
        if (L.userData.clfRoofHole) { const q = LM.ziToLocal(h.point.toArray()); if (LM.clLampSpecs ? false : false) return true; for (const Ls of K.clLampSpecs()) if (Math.hypot(q[0] - Ls.x, q[2] - Ls.z) < R) return false }
        return true }) }
    const toW = (l) => LM.ziToWorld(l)
    console.log('지붕 구멍 반경 R', R.toFixed(3))
    for (const L of K.clLampSpecs()) { const res = []
      for (const [ox, oz, tx, tz] of [[0, 0, 0, 0], [0.4, 0, -0.4, 0], [0, 0.4, 0, -0.4], [-0.4, 0, 0.4, 0]]) { const o = toW([L.x + ox, L.mouthY - 0.3, L.z + oz]), t = toW([L.x + tx, 270, L.z + tz]); const h = hits(o, [t[0] - o[0], t[1] - o[1], t[2] - o[2]])[0]
        res.push(h ? `${h.object.userData.__comp || h.object.name}@y${LM.ziToLocal(h.point.toArray())[1].toFixed(1)}` : '없음') }
      let rim = 0, rimRib = 0; const bad = {}
      for (let a = 0; a < 16; a++) for (const dy of [0.05, -0.05]) { const th = a / 16 * Math.PI * 2, l = [L.x + Math.cos(th) * R, K.CL_ROOF_Y + dy, L.z + Math.sin(th) * R], o = toW(l), dL = [Math.cos(th), 0, Math.sin(th)], dW = LM.ziToWorld(dL)
        const h = hits(o, dW)[0]; rim++; const nm = h ? (h.object.userData.__comp || h.object.name) : '없음'; if (/LampRibs/.test(nm)) rimRib++; else bad[nm] = (bad[nm] || 0) + 1 }
      //  ③ 회랑 눈높이에서 구멍이 보이나 — 구멍 가장자리·안 점(지붕 바로 밑) → 눈(회랑 중심선 · φ±0.5~12° · 바닥+1.6) 광선이 막힘 없이 닿으면 '보임'
      let vis = 0, tot = 0
      for (let a = 0; a < 12; a++) for (const rr of [0.2, 0.5, R * 0.98]) { const th = a / 12 * Math.PI * 2, lp = [L.x + Math.cos(th) * rr, K.CL_ROOF_Y - 0.01, L.z + Math.sin(th) * rr], o = toW(lp)
        for (const dph of [-12, -8, -5, -3, -1.5, -0.5, 0.5, 1.5, 3, 5, 8, 12]) { const ph = L.phi + dph * Math.PI / 180; if (ph < K.CL_PHI0 + 0.002 || ph > K.CL_PHI1 - 0.002) continue
          for (const rEye of [K.CL_R - 1.8, K.CL_R, K.CL_R + 1.8]) { const e = toW([rEye * Math.cos(ph), K.clFloorY(ph) + 1.6, rEye * Math.sin(ph)]), dv = [e[0] - o[0], e[1] - o[1], e[2] - o[2]], dist = Math.hypot(...dv)
            const h = hits(o, dv)[0]; tot++; if (!h || h.distance > dist - 0.05) vis++ } } }
      console.log(`  구멍 가시성 φ${(L.phi * 180 / Math.PI).toFixed(1)}°: 회랑 눈 → 구멍 막힘 없음 ${vis}/${tot}(기대 0)`)
      console.log(`관올려봄 등불 φ${(L.phi * 180 / Math.PI).toFixed(1)}° 첫 가림(축·원뿔 4선): ${res.join(' | ')} · 구멍 가장자리 수평 첫 명중 = 리브 껍질 ${rimRib}/${rim} ${JSON.stringify(bad)}`) }
    return }
  if (args.includes('--seamdump')) { scene.traverse((o) => { const g = o.isMesh && o.geometry; const sm = g && g.userData.clfSeam; if (!sm || !sm.length) return
      const P = g.attributes.position, C = g.attributes.color, AZ = g.attributes.aZiPath, I = g.index; let cMin = 9, cMax = -9, nNaN = 0, azMax = 0
      for (const id of sm) { const c = C.getX(id); if (!Number.isFinite(c)) nNaN++; else { cMin = Math.min(cMin, c); cMax = Math.max(cMax, c) } if (AZ) azMax = Math.max(azMax, AZ.getX(id), AZ.getY(id)) }
      let bad = 0, maxIdx = 0; if (I) for (let i = 0; i < I.count; i++) { const v = I.getX(i); maxIdx = Math.max(maxIdx, v); if (v >= P.count) bad++ }
      const sset = new Set(sm); let triSeam = 0, triMixed = 0; if (I) for (let i = 0; i < I.count; i += 3) { const k = [I.getX(i), I.getX(i + 1), I.getX(i + 2)].filter((v) => sset.has(v)).length; if (k === 3) triSeam++; else if (k > 0) triMixed++ }
      let dark = 0; for (let i = 0; i < C.count; i++) if (C.getX(i) < 0.05) dark++
      console.log(`이음매덤프 #${o.id} ${o.userData.__comp} 색인형 ${I ? I.array.constructor.name : '없음'} 정점 ${P.count} 최대색인 ${maxIdx} 범위밖 ${bad} · 이음매 정점 ${sm.length} 값 ${cMin.toFixed(3)}~${cMax.toFixed(3)} NaN ${nNaN} aZiPath최대 ${azMax} · 삼각형 이음매 ${triSeam} 섞임 ${triMixed} · 전체 색<0.05 정점 ${dark}`) }); return }
  const POSES = arg('poses', '')
  if (POSES) { for (const ps of POSES.split(';')) { const [nm, rest] = ps.split(':'); renderPose(nm, rest.split(',').map(Number)) } return }
  //  자세(회랑 로컬 φ° · r · y) — 층계참 높이는 clLandingY(j) · 눈높이 +1.6
  const eyeY = (j) => K.clLandingY(j) + 1.6, R = K.CL_R
  const ahead = (phi, r, y, dphi, dy = 0) => [cyl(phi, r, y), cyl(phi + dphi, r, y + dy)]
  const V = {
    a_entry_fwd: [[3.0, R, eyeY(0)], [9.0, R + 0.4, eyeY(0) - 0.6]],
    b_mid_fwd: [[21.0, R, eyeY(3) - 0.6], [27.0, R + 0.4, eyeY(4) - 0.6]],
    c_lamp_up: [[24.0, R, eyeY(4)], [25.3, R, eyeY(4) + 12]],
    d_inner_wall: [[30.0, R + 2.0, eyeY(5)], [30.0, R - 6, eyeY(5) + 1.5]],
    e_window: [[35.0, R - 2.0, eyeY(6)], [35.0, R + 6, eyeY(6) + 0.8]],
    f_back: [[40.0, R, eyeY(7)], [34.0, R - 0.4, eyeY(6) + 0.6]],
    g_exterior: [[25.0, 140, 246], [27.0, 176, 252]],                     // ★226 외면 불변 — 안쪽(테라스 쪽)에서 회랑 안벽 바깥면
    h_ext_far: [[20.0, 200, 262], [30.0, 172, 256]],                      // ★226 외면 불변 — 바깥(리브 사이)에서 바깥벽·창
    i_back_start: [[7.0, R, eyeY(0)], [1.5, R - 0.3, eyeY(0) + 1]],        // 시작 끝(구역 I 패널·트랜섬) 돌아보기
  }
  const loc = (p) => { const f = p[0] * Math.PI / 180; return [p[1] * Math.cos(f), p[2], p[1] * Math.sin(f)] }
  const ONLY = arg('only', ''); for (const [k, [e, t]] of Object.entries(V)) if (!ONLY || ONLY.split(',').includes(k)) render(k, loc(e), loc(t))
}
