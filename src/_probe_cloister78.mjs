// _probe_cloister78.mjs — ★78 회랑 계단 바닥 확장의 '시야 누출' 실측 (2026.07.28)
//  실행: node src/_probe_cloister78.mjs   (repo 루트에서)
//
//  왜 이 도구인가: 회랑 창이 커지면 (a) 창밖 리브가 몇 기까지 한눈에 들어오는가(1p11 반전의 스포)
//  (b) 아래 세계(드럼·문·지면)가 보이는가 — 둘을 재야 한다. 축평행 광선·가림막 누락으로 진단이
//  틀린 전례가 반복됐으므로 **원근 광선 + 실제 가림막(개구 경계·리브·드럼)**으로 짠다.
//  ⚠쓰기 전에 자기 검증부터 한다(맨 아래 T절): 창턱을 0으로 낮추면 하부 누출이 *나타나야* 한다.
//   나타나지 않으면 도구가 거짓말하는 것이다.
import {
  rOf, H, SHELL_RIB_R, MERIDIANS, R_BASE,
  CL_R, CL_HW, CL_ROOF, CL_SILL, CL_HEAD, CL_PHI0, CL_PHI1, CL_OP_P0, CL_OP_P1,
  PASS_FLOOR_Y, COR_R, COR_CX, ceilY,
  clFloorY, clSillY, clSillSlopeY, CL_FLOOR_END, CL_HEAD_Y, CL_DROP_TOTAL, CL_WIN_MODE,   // ★78-2·78-3
  CL_R_OUT2, CL_WALL_T,   // ★78-4 인방
} from './constants.js'

const EYE = 1.6, D = 180 / Math.PI
const rIn = CL_R - CL_HW, rOut = CL_R + CL_HW
const STEP = 2 * Math.PI / MERIDIANS

// ── 리브 프로파일 폴리라인 (r, y) — 최근접 거리 조회용 ──
const PN = 4000, PR = new Float64Array(PN + 1), PY = new Float64Array(PN + 1)
for (let i = 0; i <= PN; i++) { const u = i / PN * 0.5; PR[i] = rOf(u); PY[i] = H * u }
// y는 단조 증가 → 이분 탐색 후 이웃만 훑는다(전수 스캔은 광선당 수천 번이라 못 쓴다)
function inPlaneDist(r, y) {
  let lo = 0, hi = PN
  while (lo < hi) { const m = (lo + hi) >> 1; if (PY[m] < y) lo = m + 1; else hi = m }
  let b = 1e9
  for (let i = Math.max(0, lo - 60); i <= Math.min(PN, lo + 60); i++) {
    const dr = PR[i] - r, dy = PY[i] - y, d = dr * dr + dy * dy
    if (d < b) b = d
  }
  return Math.sqrt(b)
}
// 점 → 가장 가까운 리브(k)까지의 3D 근사 거리. 리브는 방위 φ_k의 평면 안 곡선 = 관.
//  평면내 거리와 방위 이탈(r·Δφ)의 직교 합성 — 관이 거의 자오선이라 이 근사의 오차는 리브 굵기 대비 미미.
function ribHit(x, y, z) {
  const r = Math.hypot(x, z)
  let phi = Math.atan2(z, x); if (phi < 0) phi += Math.PI * 2
  const k = Math.round(phi / STEP) % MERIDIANS
  const dphi = phi - k * STEP
  const lat = r * dphi
  if (Math.abs(lat) > SHELL_RIB_R) return -1
  const dip = inPlaneDist(r, y)
  return Math.hypot(dip, lat) <= SHELL_RIB_R ? k : -1
}

// ── 드럼(하부 세계의 가림막): 평면 원(중심 COR_CX, 반경 COR_R) × 천장 빗면 ceilY(x) ──
//  회랑에서 내려다본 광선이 드럼 천장/벽에 막히는가. check_corridor K절과 같은 모델.
function inDrumPlan(x, z) { return Math.hypot(x - COR_CX, z) < COR_R }

// ── 한 눈에서 창을 통해 나가는 광선들을 쏜다 ──
//  sillY/headY = 그 φ 지점의 창턱·위턱 절대 높이(계단 바닥이면 국소값).
function cast(eye, sillAt, headY, opts = {}) {
  const NAZ = opts.naz ?? 56, NEL = opts.nel ?? 44
  const ribs = new Set()
  let lowest = 1e9, lowRay = null, drumSeen = false, groundSeen = false
  let maxEl = -90
  for (let ia = 0; ia < NAZ; ia++) {
    // 방위: 바깥(반경) 방향 ±80°
    const az = (-80 + 160 * ia / (NAZ - 1)) / D
    for (let ie = 0; ie < NEL; ie++) {
      const el = (-60 + 120 * ie / (NEL - 1)) / D          // 앙각 −60~+60
      // 눈의 로컬 프레임: 바깥 = r̂, 진행 = t̂
      const phiE = Math.atan2(eye.z, eye.x)
      const rh = [Math.cos(phiE), 0, Math.sin(phiE)]
      const th = [-Math.sin(phiE), 0, Math.cos(phiE)]
      const ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az)
      const dx = ce * (ca * rh[0] + sa * th[0]), dy = se, dz = ce * (ca * rh[2] + sa * th[2])
      // 행진
      let px = eye.x, py = eye.y, pz = eye.z, passed = false, blocked = false
      const ds = 0.35
      for (let s = 0; s < 1400; s++) {
        px += dx * ds; py += dy * ds; pz += dz * ds
        const r = Math.hypot(px, pz)
        if (!passed) {
          if (r < rIn - 0.05) { blocked = true; break }            // 안벽
          if (r >= rOut) {
            //  ★78-4: 벽에 두께가 생겨 개구는 **터널**이다 — 안면(rOut)과 바깥면(rOut2) 둘 다 통과해야 한다.
            //   인방(창턱 윗면·위턱 밑면·좌우 문선)이 비스듬한 광선을 실제로 잘라낸다.
            let ph = Math.atan2(pz, px); if (ph < 0) ph += Math.PI * 2
            const inOpen = ph > CL_OP_P0 && ph < CL_OP_P1 && py > sillAt && py < headY
            if (!inOpen) { blocked = true; break }                  // 안면에서 막힘
            if (r < CL_R_OUT2) continue                             // 아직 인방 속 — 계속 행진
            passed = true                                           // 바깥면까지 통과
          } else continue
        }
        if (py <= 0) { groundSeen = true; if (py < lowest) { lowest = py; lowRay = [az * D, el * D] } break }
        const k = ribHit(px, py, pz)
        if (k >= 0) { ribs.add(k); if (py < lowest) { lowest = py; lowRay = [az * D, el * D] } break }
        if (inDrumPlan(px, pz) && py <= ceilY(px)) { drumSeen = true; if (py < lowest) { lowest = py; lowRay = [az * D, el * D] } break }
        if (r > R_BASE + 60 || py > H * 0.55) break
        if (py < lowest) { lowest = py; lowRay = [az * D, el * D] }
        if (el * D > maxEl && passed) maxEl = el * D
      }
      if (!blocked && passed) { /* 통과한 광선 */ }
    }
  }
  return { ribs, nRibs: ribs.size, lowest, lowRay, drumSeen, groundSeen }
}

// ── 회랑 위 눈 위치들 ──
function eyesAt(floorFn, nPhi = 13) {
  const out = []
  for (let i = 0; i < nPhi; i++) {
    const phi = CL_PHI0 + (CL_PHI1 - CL_PHI0) * (i / (nPhi - 1))
    for (const rr of [rIn + 0.6, CL_R, rOut - 0.4]) {          // 안벽쪽·중앙·창가(최악)
      const f = floorFn(phi)
      out.push({ x: rr * Math.cos(phi), y: f + EYE, z: rr * Math.sin(phi), phi, floor: f })
    }
  }
  return out
}

function run(label, floorFn, sillFn, headY) {
  let maxRibs = 0, allRibs = new Set(), low = 1e9, drum = false, ground = false, worst = null
  for (const e of eyesAt(floorFn)) {
    const r = cast(e, sillFn(e.phi), headY)
    if (r.nRibs > maxRibs) { maxRibs = r.nRibs; worst = e }
    for (const k of r.ribs) allRibs.add(k)
    if (r.lowest < low) low = r.lowest
    drum ||= r.drumSeen; ground ||= r.groundSeen
  }
  console.log(`${label}`)
  console.log(`   동시 가시 리브 최대 ${maxRibs}기(한 시점) · 여정 전체 누적 ${allRibs.size}기 / 72`)
  console.log(`   광선이 닿은 최저 y = ${low > 1e8 ? '—' : low.toFixed(1)} · 드럼 도달 ${drum ? '★있음' : '없음'} · 지면 도달 ${ground ? '★있음' : '없음'}`)
  if (worst) console.log(`   최악 시점 φ=${(worst.phi * D).toFixed(1)}° 바닥 ${worst.floor.toFixed(1)}`)
  return { maxRibs, cum: allRibs.size, low, drum, ground }
}

const FLAT = () => PASS_FLOOR_Y
const HEAD_ABS = PASS_FLOOR_Y + CL_HEAD

console.log('══ T. 도구 자기 검증 (믿기 전에 먼저) ══')
{
  const a = run('  [T1] 현행 그대로 (창턱 = 바닥+1.6 = 눈높이)', FLAT, () => PASS_FLOOR_Y + CL_SILL, HEAD_ABS)
  const b = run('  [T2] 창턱을 바닥까지 낮춤 (파라펫 제거 — 누출이 *나타나야* 한다)', FLAT, () => PASS_FLOOR_Y, HEAD_ABS)
  const grew = b.low < a.low - 0.5 || (b.drum && !a.drum) || b.maxRibs > a.maxRibs
  console.log(`  ⇒ 도구 판정: 파라펫 제거 시 시야가 ${grew ? '실제로 아래로 열렸다 ✔ 도구 신뢰 가능' : '★안 열렸다 — 도구가 고장났다. 결과 쓰지 말 것'}`)
}

console.log('\n══ A. 기준선 — 현행 평바닥 (창높이 5.4) ══')
const base = run('  현행', FLAT, () => PASS_FLOOR_Y + CL_SILL, HEAD_ABS)

console.log('\n══ B. ★78-3 창턱 두 어법 — 같은 계단 바닥 위에서 비교 ══')
for (const [mode, fn] of [['step ', clSillY], ['slope', clSillSlopeY]]) {
  const tag = `  [${mode}]${CL_WIN_MODE.startsWith(mode.trim()) ? ' ← 현재 활성' : ''}`
  run(tag, clFloorY, fn, HEAD_ABS)
  let mn = 1e9, mx = -1e9
  for (const g of (await import('/home/claude/ethica-architectonics/src/constants.js')).clFloorSegments().segs) {
    const h = fn(g.p1) - g.y; if (h < mn) mn = h
    const h2 = fn(g.p0) - g.y; if (h2 > mx) mx = h2
  }
  console.log(`   파라펫 ${mn.toFixed(3)}~${mx.toFixed(3)} · 창높이 시작 ${(HEAD_ABS - fn(CL_PHI0)).toFixed(2)} → 끝 ${(HEAD_ABS - fn(CL_PHI1)).toFixed(2)}`)
}
