// ★81 출구 통로의 창 — **측정 전용 프로브**(짓기 전에 제약을 잰다)
//  묻는 것 넷:
//   ⓐ 통로가 어디를 지나는가 — 구간별 길이·시간·바닥 높이
//   ⓑ 각 벽 **밖에 무엇이 있는가** — 회랑 살 / 리브 / 열린 돔 / 방 벽
//   ⓒ 창을 뚫으면 **무엇이 보이는가** — 리브 몇 기·거리 얼마·렌즈 노출 여부(1p11 봉인)
//   ⓓ 창턱·인방이 물리적으로 들어갈 여지가 있는가(층고·벽 살)
import * as C from './constants.js'
import { flarePoint, flareSection, floorSmooth, stairProfile } from './exitFlareGeometry.js'

const D = (x) => (x * 180 / Math.PI)
const EYE = 1.6, WALK = 6.0

//  ── 돔 리브 모델 ────────────────────────────────────────────────────────────
//  리브 = 방위 k·(360/72)°의 수직 관 근사. 그 높이의 중심 반경을 이분법으로 뽑는다.
function rAtY (y) {
  let lo = 0, hi = 1
  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; (C.ribCenter(m).y < y) ? lo = m : hi = m }
  return C.ribCenter((lo + hi) / 2).x
}

//  광선 ↔ 수직 원기둥(중심 cx,cz · 반경 rr). 앞쪽 최근접 교차 거리 or Infinity
function rayCyl (px, pz, dx, dz, cx, cz, rr) {
  const ox = px - cx, oz = pz - cz
  const b = ox * dx + oz * dz, c = ox * ox + oz * oz - rr * rr
  const disc = b * b - c
  if (disc < 0) return Infinity
  const s = Math.sqrt(disc)
  const t0 = -b - s, t1 = -b + s
  if (t0 > 1e-6) return t0
  if (t1 > 1e-6) return t1
  return Infinity
}

//  ── 통로 정거장 표 ──────────────────────────────────────────────────────────
//  구간 A = 반원호(방 벽 바깥을 도는 부분, 로컬 θ RM10_EXIT_TH0 → RM10_ARC_TH1)
//  구간 B = 나팔 낮은 구간(t 0 → TB) · 구간 C = 나팔 터짐 구간(t TB → 1)
const AX = C.RM10_AX_R, PHI = C.RM10_PHI
const cp = Math.cos(PHI), sp = Math.sin(PHI)
const toWorld = (lx, lz) => [AX * cp + lx * cp - lz * sp, AX * sp + lx * sp + lz * cp]

const stations = []
//  A: 원호
{
  const rCL = C.RM10_FLARE_RCL
  const th0 = C.RM10_EXIT_TH0, th1 = C.RM10_ARC_TH1
  const NA = 60
  for (let i = 0; i <= NA; i++) {
    const th = th0 + (th1 - th0) * i / NA
    const lx = rCL * Math.cos(th), lz = rCL * Math.sin(th)
    const [wx, wz] = toWorld(lx, lz)
    //  바깥 법선 = 반경 바깥(방 축에서 멀어지는 쪽) · 안쪽 법선 = 방 쪽
    const nOutL = [Math.cos(th), Math.sin(th)]
    stations.push({
      seg: 'A', u: rCL * (th - th0), wx, wz, y: C.RM10_EXIT_FLOOR_Y, h: C.RM10_EXIT_ROOF, w: C.RM10_EXIT_W,
      nOut: [nOutL[0] * cp - nOutL[1] * sp, nOutL[0] * sp + nOutL[1] * cp],
      hwOut: C.RM10_EXIT_W / 2, hwIn: C.RM10_EXIT_W / 2, th,
    })
  }
}
const arcLen = stations[stations.length - 1].u
//  B·C: 나팔
{
  const NF = 120
  for (let i = 1; i <= NF; i++) {
    const t = i / NF
    const p = flarePoint(C.RM10_FLARE_SWEEP * t), sec = flareSection(t)
    const [wx, wz] = toWorld(p.x, p.z)
    //  −N = 바깥(회랑 외벽 쪽) · +N = 돔 중심 쪽
    stations.push({
      seg: t <= C.RM10_FLARE_TB ? 'B' : 'C', u: arcLen + C.RM10_FLARE_LEN * t,
      wx, wz, y: floorSmooth(t), h: sec.h, w: sec.a0 + sec.b0, t,
      nOut: [(-p.nx) * cp - (-p.nz) * sp, (-p.nx) * sp + (-p.nz) * cp],   // −N 세계좌표
      hwOut: sec.b0, hwIn: sec.a0,
    })
  }
}

//  ── 벽 밖에 무엇이 있는가 ───────────────────────────────────────────────────
//  side = +1 → −N(바깥·회랑 외벽 쪽) · side = −1 → +N(돔 중심 쪽)
function look (s, side) {
  const y = s.y + EYE
  const R = rAtY(y)                                  // 그 높이의 리브 중심 반경
  const nx = s.nOut[0] * side, nz = s.nOut[1] * side
  const off = side > 0 ? s.hwOut : s.hwIn
  const px = s.wx + nx * off, pz = s.wz + nz * off    // 벽 안쪽 면에서 출발
  const hits = { rib: new Set(), nearRib: Infinity, cloister: 0, room: 0, open: 0, nearAny: Infinity }
  const NR = 121, FOV = 70 * Math.PI / 180           // ±70° 부채(사람이 창가에서 훑는 범위)
  const base = Math.atan2(nz, nx)
  for (let i = 0; i < NR; i++) {
    const a = base + (-FOV + 2 * FOV * i / (NR - 1))
    const dx = Math.cos(a), dz = Math.sin(a)
    let best = Infinity, what = 'open', which = -1
    //  ① 리브 72기
    for (let k = 0; k < C.MERIDIANS; k++) {
      const th = k * 2 * Math.PI / C.MERIDIANS
      const d = rayCyl(px, pz, dx, dz, R * Math.cos(th), R * Math.sin(th), C.SHELL_RIB_R)
      if (d < best) { best = d; what = 'rib'; which = k }
    }
    //  ② 등불 방 벽(그 높이의 원뿔 반경 + 살)
    {
      const rr = C.rm10R(y) + C.RM10_CONE_T
      const d = rayCyl(px, pz, dx, dz, AX * cp, AX * sp, rr)
      if (d < best) { best = d; what = 'room' }
    }
    //  ③ 회랑 몸(안·바깥 벽 두 원기둥, φ·y 범위 안일 때만)
    for (const rr of [C.CL_R - C.CL_HW - C.CL_WALL_T, C.CL_R + C.CL_HW + C.CL_WALL_T]) {
      const d = rayCyl(px, pz, dx, dz, 0, 0, rr)
      if (d < best) {
        const hx = px + dx * d, hz = pz + dz * d
        const az = Math.atan2(hz, hx)
        if (az >= C.CL_PHI0 && az <= C.CL_PHI1 && y < C.CL_HEAD_Y && y > C.CL_WALL_BOT - 6) { best = d; what = 'cloister' }
      }
    }
    if (what === 'rib') { hits.rib.add(which); hits.nearRib = Math.min(hits.nearRib, best) }
    else if (what === 'cloister') hits.cloister++
    else if (what === 'room') hits.room++
    else hits.open++
    hits.nearAny = Math.min(hits.nearAny, best)
  }
  //  렌즈 노출 — 렌즈 하단 가장자리를 보려면 필요한 올려다보는 각
  const dAx = Math.hypot(px, pz)
  const lensEl = D(Math.atan2(C.LENS_Y - y, Math.max(1, dAx - C.LENS_R)))
  return { ...hits, ribN: hits.rib.size, R, lensEl, dAx }
}

//  ── 출력 ────────────────────────────────────────────────────────────────────
console.log('══ ★81 출구 통로의 창 — 측정 ══\n')

const sp2 = stairProfile()
const totLen = stations[stations.length - 1].u
console.log('— ⓐ 구간 대장 —')
for (const [nm, seg, desc] of [['A', 'A', '반원호(방 벽을 돈다)'], ['B', 'B', '나팔 낮은 구간(회랑 밑)'], ['C', 'C', '나팔 터짐 구간(계단)']]) {
  const ss = stations.filter((s) => s.seg === seg)
  const l0 = ss[0].u - (seg === 'A' ? 0 : stations[stations.indexOf(ss[0]) - 1].u)
  const len = ss[ss.length - 1].u - ss[0].u + l0
  console.log(`  ${nm} ${desc}: 길이 ${len.toFixed(1)} · ${(len / WALK).toFixed(1)}초 · ` +
    `바닥 ${ss[0].y.toFixed(1)}→${ss[ss.length - 1].y.toFixed(1)} · 층고 ${ss[0].h.toFixed(1)}→${ss[ss.length - 1].h.toFixed(1)} · 폭 ${ss[0].w.toFixed(1)}→${ss[ss.length - 1].w.toFixed(1)}`)
}
console.log(`  합계 ${totLen.toFixed(1)} · ${(totLen / WALK).toFixed(1)}초   (A+B = 창 후보 구간 ${(stations.filter(s=>s.seg!=='C').at(-1).u).toFixed(1)} · ${(stations.filter(s=>s.seg!=='C').at(-1).u / WALK).toFixed(1)}초 = 전체의 ${(100*stations.filter(s=>s.seg!=='C').at(-1).u/totLen).toFixed(0)}%)`)

console.log('\n— ⓑ·ⓒ 벽 밖에 무엇이 있는가 (눈높이 바닥+1.6 · ±70° 부채 121선) —')
console.log('  구간  u     축거리  |  ⟵돔중심쪽 벽(+N):  리브 / 최근접 / 열림 / 회랑 / 방  |  바깥쪽 벽(−N): 리브 / 최근접 / 열림 / 회랑 / 방')
const picks = []
for (const s of stations) if (Math.round(s.u * 10) % 100 === 0 || s === stations.at(-1)) picks.push(s)
const seen = new Set()
for (const s of stations) {
  const key = Math.round(s.u / 8)
  if (seen.has(key)) continue
  seen.add(key)
  const i = look(s, -1), o = look(s, +1)
  const f = (h) => `${String(h.ribN).padStart(2)}기 ${(h.nearRib === Infinity ? '  —  ' : h.nearRib.toFixed(1).padStart(5))} ${String(h.open).padStart(3)} ${String(h.cloister).padStart(3)} ${String(h.room).padStart(3)}`
  console.log(`  ${s.seg}   ${s.u.toFixed(1).padStart(5)}  ${Math.hypot(s.wx, s.wz).toFixed(1).padStart(6)}  |  ${f(i)}  |  ${f(o)}`)
}

console.log('\n— ⓒ-2 렌즈 봉인(1p11 반전) — 창으로 렌즈가 새는가 —')
{
  const s = stations[0], e = stations.filter((x) => x.seg !== 'C').at(-1)
  for (const [nm, st] of [['통로 시작', s], ['낮은 구간 끝(터짐 직전)', e]]) {
    const i = look(st, -1), o = look(st, +1)
    console.log(`  ${nm}: 축거리 ${i.dAx.toFixed(1)} · 렌즈 하단을 보려면 올려다보는 각 ${i.lensEl.toFixed(1)}° (안쪽) / ${o.lensEl.toFixed(1)}° (바깥)`)
  }
  console.log(`  ⓘ 렌즈 = y${C.LENS_Y} · R${C.LENS_R} · 통로 바닥 y${C.RM10_EXIT_FLOOR_Y.toFixed(1)} → 수직 격차 ${(C.LENS_Y - C.RM10_EXIT_FLOOR_Y).toFixed(0)}`)
}

console.log('\n— ⓓ 창이 들어갈 여지(층고·벽 살) —')
{
  const rows = []
  for (const s of stations) {
    const key = Math.round(s.u / 20)
    if (rows.some((r) => r.k === key)) continue
    rows.push({ k: key, s })
  }
  console.log(`  회랑 창 어법(비교군): 창턱 ${C.CL_SILL} · 위턱 ${C.CL_HEAD} · 창 높이 ${(C.CL_HEAD - C.CL_SILL).toFixed(1)} · 층고 ${(C.CL_HEAD_Y - C.CL_FLOOR_END).toFixed(1)}~ · 벽 두께 ${C.CL_WALL_T}`)
  for (const r of rows) {
    const s = r.s
    console.log(`  ${s.seg} u${s.u.toFixed(0).padStart(4)}: 층고 ${s.h.toFixed(2)} · 벽 두께 ${C.PASS_T} · 창턱 1.6이면 남는 높이 ${(s.h - 1.6).toFixed(2)}`)
  }
}

console.log('\n— ⓔ 회랑 창과의 거리 대비(어휘 충돌 감시) —')
{
  const yC = C.CL_FLOOR_END + EYE, Rc = rAtY(yC)
  console.log(`  회랑: 눈높이 y${yC.toFixed(1)} · 리브 중심 반경 ${Rc.toFixed(1)} · 회랑 중심선 ${C.CL_R} → 정면 리브까지 ${(Rc - C.CL_R).toFixed(1)}`)
  const b = stations.filter((s) => s.seg === 'B')
  const s0 = b[0], s1 = b.at(-1)
  for (const [nm, s] of [['통로 시작', stations[0]], ['낮은 구간 시작', s0], ['낮은 구간 끝', s1]]) {
    const o = look(s, +1), i = look(s, -1)
    console.log(`  ${nm}: 리브 중심 반경 ${o.R.toFixed(1)} · 통로 축거리 ${Math.hypot(s.wx, s.wz).toFixed(1)} · 최근접 리브 바깥 ${(o.nearRib === Infinity ? '없음' : o.nearRib.toFixed(1))} / 안쪽 ${(i.nearRib === Infinity ? '없음' : i.nearRib.toFixed(1))}`)
  }
}

//  ── ⓕ 창 한 장이 리브 몇 기를 담는가 (창 폭 ↔ 시야콘 ↔ 리브 겉보기 간격) ──
console.log('\n— ⓕ 창 폭 ↔ 담기는 리브 수 (산술) —')
{
  const y = C.RM10_EXIT_FLOOR_Y + EYE
  const R = rAtY(y), dTh = 2 * Math.PI / C.MERIDIANS
  for (const [nm, d] of [['통로 시작(A)', 173.4], ['낮은 구간 중간(B)', 172.0], ['낮은 구간 끝(B)', 162.9]]) {
    //  관측자 = 통로 중심선, 바깥 벽 밖으로 본다. 이웃 리브의 겉보기 각차
    const near = R - d
    const lat = R * Math.sin(dTh), dep = R * Math.cos(dTh) - d
    const pitch = D(Math.atan2(lat, dep))
    const sub = D(2 * Math.atan(C.SHELL_RIB_R / near))
    console.log(`  ${nm}: 정면 리브 ${near.toFixed(1)} · 이웃 리브 겉보기 간격 ${pitch.toFixed(1)}° · 리브 하나가 차지 ${sub.toFixed(1)}° · 틈 ${(pitch - sub).toFixed(1)}°`)
  }
  console.log(`\n  벽 두께(통로) ${C.PASS_T}  vs  회랑 ${C.CL_WALL_T} — 창의 '깊이'가 시야콘을 좁히는 유일한 장치다`)
  console.log('  창 폭 w · 눈이 창에서 b 물러섰을 때 시야콘 = 2·atan(w/2/(b+두께)):')
  console.log('   창폭 w  | 창가(b=0)  중앙(b=1.5)  반대벽(b=3.0)   ← 담기는 리브 수(간격 13°대 기준)')
  for (const w of [0.5, 1.0, 1.5, 2.0, 3.0, 5.0]) {
    const cone = (b) => 2 * D(Math.atan((w / 2) / (b + C.PASS_T)))
    const n = (b) => Math.max(1, Math.round(cone(b) / 13.4) + 1)
    console.log(`   ${w.toFixed(1).padStart(5)}   | ${cone(0).toFixed(0).padStart(4)}°(${n(0)}기)   ${cone(1.5).toFixed(0).padStart(4)}°(${n(1.5)}기)   ${cone(3.0).toFixed(0).padStart(4)}°(${n(3.0)}기)`)
  }
}

//  ── ⓖ 렌즈가 창으로 새는가 (인방 높이 ↔ 올려다보는 각) ──
console.log('\n— ⓖ 렌즈 누출(1p11 봉인) — 인방 높이별 최대 올려다보는 각 —')
{
  const need = 54.4    // ⓒ-2에서 잰 값(통로 시작·가장 유리한 지점)
  console.log(`  렌즈 하단이 보이기 시작하는 각 = ${need}° (통로 시작) ~ 60.0° (낮은 구간 끝)`)
  console.log('   인방높이 | 창가(b=0)  중앙(b=1.5)  반대벽(b=3.0)     ← ⛔ = 렌즈 노출')
  for (const hd of [2.5, 3.0, 3.5, 4.0, 4.5]) {
    const el = (b) => D(Math.atan((hd - EYE) / (b + C.PASS_T)))
    const m = (b) => (el(b) > need ? '⛔' : '✓ ')
    console.log(`   ${hd.toFixed(1).padStart(6)}   | ${el(0).toFixed(0).padStart(3)}°${m(0)}    ${el(1.5).toFixed(0).padStart(3)}°${m(1.5)}     ${el(3.0).toFixed(0).padStart(3)}°${m(3.0)}`)
  }
  console.log(`  ⓘ 낮은 구간(B)은 회랑 밑판(y${C.CL_WALL_BOT.toFixed(1)} = 바닥 위 ${(C.CL_WALL_BOT - C.RM10_EXIT_FLOOR_Y).toFixed(1)})이 위를 덮는다 —`)
  console.log(`     발자국 r${(C.CL_R - C.CL_HW - C.CL_WALL_T).toFixed(1)}~${(C.CL_R + C.CL_HW + C.CL_WALL_T).toFixed(1)} 안에서는 올려보기가 자동 차단된다. 구간 A는 그 덮개가 없다.`)
}

//  ── ⓗ 구현 후 검증: 창은 정말 뚫렸고, 살은 정말 막혔는가 (광선 ↔ 실제 삼각형) ──
//  ⚠셀프 렌더가 이 권역에서 판독 불가(DESIGN 등록 사각지대)라, **기하로** 대신 잰다.
{
  const { buildFlareShell, flarePoint, flareSection, floorSmooth, winShape } = await import('./exitFlareGeometry.js')
  const wall = buildFlareShell().find((m) => m.key === 'fliwDome')
  const P = wall.geo.attributes.position.array, IX = wall.geo.index.array
  //  Möller–Trumbore
  const hit = (o, d) => {
    let best = Infinity
    for (let i = 0; i < IX.length; i += 3) {
      const a = IX[i] * 3, b = IX[i + 1] * 3, c = IX[i + 2] * 3
      const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]]
      const e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]
      const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]]
      const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]
      if (Math.abs(det) < 1e-12) continue
      const f = 1 / det, s = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]]
      const u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2])
      if (u < 0 || u > 1) continue
      const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]]
      const v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2])
      if (v < 0 || u + v > 1) continue
      const tt = f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2])
      if (tt > 1e-6 && tt < best) best = tt
    }
    return best
  }
  const wins = C.rm10Windows()
  console.log('\n— ⓗ 창이 뚫렸는가 / 살이 막혔는가 (광선 ↔ 벽 삼각형) —')
  console.log('  지점            눈높이 광선  머리높이(+2.4)   판정')
  const shoot = (u, dy) => {
    const t = u / C.RM10_FLARE_LEN
    const p = flarePoint(C.RM10_FLARE_SWEEP * t), sec = flareSection(t)
    const o = [p.x - sec.b0 * 0.5 * p.nx, floorSmooth(t) + dy, p.z - sec.b0 * 0.5 * p.nz]
    return hit(o, [p.nx, 0, p.nz])
  }
  let pass = 0, tot = 0
  for (const w of wins) {
    const um = (w.u0 + w.u1) / 2
    const a = shoot(um, EYE), b = shoot(um, 2.4)
    const open = a === Infinity
    tot++; if (open) pass++
    console.log(`  창${w.k + 1} 중앙(u${um.toFixed(1).padStart(5)})   ${open ? '뚫림 ✓' : '막힘 ✗'}      ${b === Infinity ? '뚫림' : '막힘(' + b.toFixed(2) + ')'}        ${open ? '개구 성립' : '⛔ 창이 안 뚫렸다'}`)
  }
  for (let k = 0; k + 1 < wins.length; k++) {
    const um = (wins[k].u1 + wins[k + 1].u0) / 2
    const a = shoot(um, EYE)
    tot++; if (a !== Infinity) pass++
    console.log(`  살${k + 1} 중앙(u${um.toFixed(1).padStart(5)})   ${a === Infinity ? '뚫림 ✗' : '막힘 ✓ (' + a.toFixed(2) + ')'}                    ${a === Infinity ? '⛔ 살에 구멍' : '살 성립'}`)
  }
  //  창턱 아래 · 인방 위는 반드시 막혀야 한다(창은 띠지 벽 전체가 아니다)
  const wm = (wins[2].u0 + wins[2].u1) / 2
  const below = shoot(wm, 0.6), above = shoot(wm, flareSection(wm / C.RM10_FLARE_LEN).h - 0.35)
  console.log(`  창3 창턱 아래(0.6): ${below === Infinity ? '뚫림 ⛔' : '막힘 ✓'} · 창3 인방 위: ${above === Infinity ? '뚫림 ⛔' : '막힘 ✓'}`)
  console.log(`  → 창/살 판정 ${pass}/${tot} 통과`)
}

//  ── ⓘ 3체제 비교 (off / trapezoid / slit) — 로컬 판정용 ──────────────────────
//  ⚠체제를 갈아 끼우지 않고 **두 식을 다 계산**한다(빌드 없이 옆에 두고 볼 수 있게).
//   ⚠수치는 전부 파생 — 하드코딩 금지(노브를 돌리면 이 표가 따라온다).
console.log('\n— ⓘ 3체제 비교 —')
{
  const { flareSection, flarePoint, stairProfile } = await import('./exitFlareGeometry.js')
  const Ws = C.rm10Windows(), LEN = C.RM10_FLARE_LEN, R = C.RM10_FLARE_R
  const scale = (t) => (R - flareSection(t).a0) / R              // 곡선 **안쪽** 면 보정
  const hTrap = (u) => flareSection(u / LEN).h - C.RM10_WIN_HEAD - C.RM10_WIN_SILL
  const bTrap = (w) => {                                          // 사다리꼴 배터 폭(그 체제의 식)
    const hm = hTrap((w.u0 + w.u1) / 2)
    return Math.max(0, Math.min(hm * Math.tan(C.RM10_WIN_BATTER_DEG * Math.PI / 180), (w.u1 - w.u0) * 0.35))
  }
  let aT = 0, aS = 0
  for (const w of Ws) {
    const M = 80, b = bTrap(w)
    for (let j = 0; j < M; j++) {
      const u = w.u0 + (w.u1 - w.u0) * (j + 0.5) / M, t = u / LEN, du = (w.u1 - w.u0) / M
      const f = b <= 1e-9 ? 1 : Math.max(0, Math.min(1, (u - w.u0) / b, (w.u1 - u) / b))
      aT += hTrap(u) * f * scale(t) * du
      aS += C.RM10_WIN_SLIT_H * scale(t) * du
    }
  }
  //  좌측 온벽 면적(파생)
  const S = stairProfile().samples
  let full = 0
  for (let i = 1; i < S.length; i++) {
    const t0 = S[i - 1].u / LEN, t1 = S[i].u / LEN
    const p0 = flarePoint(C.RM10_FLARE_SWEEP * t0), p1 = flarePoint(C.RM10_FLARE_SWEEP * t1)
    const a0 = flareSection(t0).a0, a1 = flareSection(t1).a0
    full += Math.hypot((p1.x + a1 * p1.nx) - (p0.x + a0 * p0.nx), (p1.z + a1 * p1.nz) - (p0.z + a0 * p0.nz))
          * (flareSection(t0).h + flareSection(t1).h) / 2
  }
  const elT = Math.atan(hTrap(Ws[0].u0 + 0.5) / C.PASS_T) * 180 / Math.PI
  const elS = Math.atan(C.RM10_WIN_SLIT_H / C.PASS_T) * 180 / Math.PI
  const LENS = 54.4
  console.log('  체제         개구 면적   좌측 벽 대비   창가 최대 올려보기   렌즈')
  console.log(`  off            ${'0.0'.padStart(6)}      ${'0.0%'.padStart(6)}      ${'—'.padStart(7)}            ✓ 봉인`)
  console.log(`  trapezoid    ${aT.toFixed(1).padStart(6)}      ${(100 * aT / full).toFixed(1).padStart(5)}%      ${elT.toFixed(1).padStart(6)}°            ${elT < LENS ? '✓ 봉인' : '⛔ 노출'}`)
  console.log(`  slit         ${aS.toFixed(1).padStart(6)}      ${(100 * aS / full).toFixed(1).padStart(5)}%      ${elS.toFixed(1).padStart(6)}°            ${elS < LENS ? '✓ 재봉인' : '⛔ 노출'}`)
  console.log(`  (좌측 온벽 ${full.toFixed(0)} · 현 체제 = '${C.RM10_WIN_MODE}')`)

  console.log('\n  창 너머 리브의 **세로 띠 높이**(정면 리브 91 기준 — 위로 얼마나 보이는가):')
  console.log('   위치               사다리꼴    슬릿')
  for (const [nm, b] of [['창가(b=0)', 0], ['통로 중앙(b=1.5)', 1.5], ['반대 벽(b=3.0)', 3.0]])
    console.log(`   ${nm.padEnd(18)}${(91 * hTrap(Ws[0].u0 + 0.5) / (b + C.PASS_T)).toFixed(0).padStart(5)}   ${(91 * C.RM10_WIN_SLIT_H / (b + C.PASS_T)).toFixed(0).padStart(5)}`)
  console.log('   → 슬릿은 리브의 **띠 하나**만 보여준다(수직 전체가 아니라) = 현도 "너머의 수많은 리브만".')
  console.log(`\n  전환: src/constants.js  RM10_WIN_MODE = 'off' | 'trapezoid' | 'slit'`)
}
