// discGeometry.js — ★118 착지 디스크 두껍게 (2026.08.05 현도 결정)
//  현도: *"디스크 판이 너무 얇게 보여서 대충 만든 것 같다. 디스크·뿔대·셸이 만드는 단차도 어색하다."*
//   → **두께를 늘려 밑면을 오큘러스 림 평면까지 내린다** = 세로 단차 1.827 소멸.
//
//  ★두께는 노브가 아니라 **파생**이다(`DISC_MODE='thick'`):
//    T = 디스크 윗면 − 오큘러스 림 높이 = 101.320 − 99.1435 = **2.177**
//    → `ROOM_R`·`ROOM_OCULUS_R`·`LIFT_Y`를 밀면 단차 소멸이 **저절로 따라온다**(하드코딩 금지).
//
//  ★상한이 셋 몰려 있다(2026.08.05 실측 — constants DISC 블록 주석이 수치 정본):
//    ⓐ T 2.086 — 나선 헤드룸이 `SUP_HEAD_MIN` 2.2로 떨어지는 값
//    ⓑ T 2.177 — 밑면 = 오큘러스 림 (**현도 채택**, 헤드룸 2.109)
//    ⓒ T 2.298 — 바깥 모서리 r18이 셸 곡면에 접하는 값 (헤드룸 1.988)
//   ⓑ는 ⓐ를 0.09 넘어선다 — **선언된 비용**이다(눈높이 EYE 1.6 기준 머리 위 0.51).
//
//  ★★슬롯이 함께 움직인다 — 이게 두께의 전제다.
//   구판 슬롯은 도착각(37.5°) **뒤 8°**에서 끝났다. 그 8° 구간에서 나선 윗면은 이미 100.83~101.30이라
//   두께 0.35짜리 디스크에도 **파고들어 있었다**(= 일지의 '슬래브 관입 36정점'). 두껍게 하면 그 관입이
//   2.18로 커진다. → 슬롯 끝을 **도착각까지** 민다(59° → 67°). 두께와 관입이 한 수로 같이 닫힌다.
//   ⚠**선언된 비용**: 슬롯 끝 37.5°가 45° 터널 벽선(r15.5에서 36.84°)을 **r16.85 안쪽에서만** 넘는다
//    → 터널 입구 안쪽 모서리에 쐐기 틈(반경대 15.50~16.85 · 최대 각 0.66° · 호 0.18). 검사가 매 실행 잰다.
//
//  ★밑면 어법 = §2-D 2 '속 찬 매스 + 깎인 밑면'. 두께가 2를 넘으면 밑면이 방에서 올려다보는 큰 면이
//   되므로 직각 판떼기로 두지 않는다. `ROOM_DISC_CHAMF`(기본 0.45 = 공리 나선 `SPIRAL_CHAMF` 라임).
//   0으로 내리면 직각. **바깥·안쪽·양 끝면 네 곳의 밑모서리 전부**에 같은 값이 간다(스윕 단면이 하나라 자동).
//
//  ★법선: 8각이 아니라 원호 스윕이지만 단면이 평면 다각형이라 **면 법선**으로 낸다(감김은 want로 맞춤 —
//   ★102-2 '자가교차·감김 뒤집힘' 교훈. 캡도 반드시 같은 경로를 탄다 — ★107 기둥 캡 컬링 전례).
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  COR_Y0, COR_THICK, ROOM_STAIR_SLAB,
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_OCULUS_R,
  ROOM_LAND_R, ROOM_DISC_HOLE, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN,
  DISC_MODE, ROOM_DISC_CHAMF, ROOM_DISC_SEGS,
  DISC_RAIL_ON, DISC_RAIL_H, DISC_RAIL_W, DISC_RAIL_CHAMF,
} from './constants.js'

//  ── 감김을 손으로 세지 않는다: want 방향만 주고 여기서 맞춘다 ──
const faceN = (a, b, c) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  const L = Math.hypot(nx, ny, nz)
  return L < 1e-10 ? null : [nx / L, ny / L, nz / L]
}
function tri(P, N, a, b, c, n) {
  for (const v of [a, b, c]) P.push(v[0], v[1], v[2])
  for (let i = 0; i < 3; i++) N.push(n[0], n[1], n[2])
}
function triTo(P, N, a, b, c, want) {
  const n = faceN(a, b, c)
  if (!n) return                                    // 퇴화 삼각 = 안 낸다(챔퍼 0에서 발생)
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { tri(P, N, a, c, b, faceN(a, c, b)); return }
  tri(P, N, a, b, c, n)
}
const quadTo = (P, N, a, b, c, d, want) => { triTo(P, N, a, b, c, want); triTo(P, N, a, c, d, want) }

//  ★★단면이 볼록에서 **L자(난간)**로 바뀌면서 두 기계를 갈아 끼웠다(★118-2).
//   ⛔구판은 (a) 변 법선을 **무게중심**으로 뽑고 (b) 캡을 **부채**로 냈다 — 둘 다 볼록 전제다.
//    난간이 붙는 순간 무게중심이 L의 오목한 쪽으로 들어가 바깥 법선이 뒤집히고, 부채는 도형 밖으로 삼각을 낸다.
//   정본 = (a) **부호 면적**으로 감김 방향을 정하고 변마다 수직을 돌린다(임의의 단순 다각형에서 정확)
//         (b) **귀 자르기**(ear clipping) — 오목 꼭짓점이 있어도 도형 안에서만 삼각이 난다.
const polyArea2 = (pts) => {
  let A = 0
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1] }
  return A
}
//  변 j의 바깥 수직((r,y) 평면) — CCW면 진행 방향의 오른쪽이 바깥이다
function edgeNormal2(pts, j, ccw) {
  const p = pts[j], q = pts[(j + 1) % pts.length]
  const dr = q[0] - p[0], dy = q[1] - p[1]
  const L = Math.hypot(dr, dy) || 1
  return ccw ? [dy / L, -dr / L] : [-dy / L, dr / L]
}
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
function inTri(p, a, b, c) {
  const d1 = cross2(a, b, p), d2 = cross2(b, c, p), d3 = cross2(c, a, p)
  const neg = d1 < -1e-12 || d2 < -1e-12 || d3 < -1e-12
  const pos = d1 > 1e-12 || d2 > 1e-12 || d3 > 1e-12
  return !(neg && pos)
}
//  ★단순 다각형 삼각분할 — 인덱스 삼각 배열을 돌려준다(단면 캡 전용, 정점 10개 수준)
function earClip(pts) {
  const n = pts.length
  const ccw = polyArea2(pts) > 0
  const idx = ccw ? [...pts.keys()] : [...pts.keys()].reverse()   // 항상 CCW로 세운다
  const out = []
  let guard = 0
  while (idx.length > 3 && guard++ < 500) {
    let cut = false
    for (let i = 0; i < idx.length; i++) {
      const a = pts[idx[(i + idx.length - 1) % idx.length]], b = pts[idx[i]], c = pts[idx[(i + 1) % idx.length]]
      if (cross2(a, b, c) <= 1e-12) continue                      // 오목·퇴화 = 귀 아님
      let ok = true
      for (let k = 0; k < idx.length; k++) {
        const j = idx[k]
        if (j === idx[(i + idx.length - 1) % idx.length] || j === idx[i] || j === idx[(i + 1) % idx.length]) continue
        if (inTri(pts[j], a, b, c)) { ok = false; break }
      }
      if (!ok) continue
      out.push([idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]])
      idx.splice(i, 1); cut = true; break
    }
    if (!cut) break                                               // 자가교차 등 — 남은 것은 아래에서 부채로
  }
  for (let i = 1; i < idx.length - 1; i++) out.push([idx[0], idx[i], idx[i + 1]])
  return out
}

// ══════════════════════════════════════════════════════════════
//  스펙 — Room.jsx·검사·프로브가 전부 여기서 읽는다(사본 금지)
// ══════════════════════════════════════════════════════════════
export function discSpec() {
  //  윗면 = 통로 접합 레벨 파생. **절대 안 움직인다** — 걷는 면이고 문지방이 여기에 물려 있다.
  const yTop = COR_Y0 + COR_THICK / 2 + 0.02

  //  오큘러스 림 높이 — 타원체 r(y)에서 역산(구멍 반지름이 정본이므로 높이가 파생이다)
  const yOculus = ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (ROOM_OCULUS_R / ROOM_R) ** 2))

  const thick = DISC_MODE === 'thick' ? yTop - yOculus : ROOM_STAIR_SLAB
  const yBot = yTop - thick

  //  ★셸 곡면이 r18에 닿는 높이 — 두께의 절대 상한(ⓒ). 넘으면 바깥 모서리가 돔을 뚫는다.
  const yShellAtRim = ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (ROOM_LAND_R / ROOM_R) ** 2))

  //  챔퍼는 두께·고리 폭의 절반을 못 넘는다(파생 클램프 — 노브를 밀어도 매스가 안 뒤집힌다)
  const band = ROOM_LAND_R - ROOM_DISC_HOLE
  const chamf = Math.max(0, Math.min(ROOM_DISC_CHAMF, thick * 0.5 - 0.02, band * 0.5 - 0.02))

  //  ── 방위: 링 규약 θ = −월드. 그려진 살 = shape θ ∈ [t0, t1] ──
  const t0 = ROOM_DISC_SLOT_START, t1 = t0 + ROOM_DISC_SLOT_LEN
  const wA = -t0, wB = -t1                       // 월드 방위(감소 방향으로 스윕)
  const sweep = wA - wB                          // 양수(= SLOT_LEN)
  const gap = Math.PI * 2 - sweep                // 트인 슬롯 폭

  //  ── ★118-2 난간(현도 2026.08.05) — 별도 부재가 아니라 **같은 단면 안**이다 ──
  //   높이·두께는 노브, 갓돌 모접기는 둘의 절반으로 자동 클램프(밀어도 단면이 안 뒤집힌다).
  const bandW = ROOM_LAND_R - ROOM_DISC_HOLE
  const railOn = DISC_RAIL_ON && DISC_RAIL_H > 1e-6 && DISC_RAIL_W > 1e-6
  const railH = railOn ? DISC_RAIL_H : 0
  const railW = railOn ? Math.min(DISC_RAIL_W, bandW * 0.5) : 0
  const railC = railOn ? Math.max(0, Math.min(DISC_RAIL_CHAMF, railH * 0.5 - 0.01, railW * 0.5 - 0.01)) : 0
  const yRail = yTop + railH

  //  ── 단면(반경 r, 높이 y) — 닫힌 다각형. 밑모서리는 챔퍼, 안쪽 위는 난간(L자 = **오목**) ──
  //   ★난간 안쪽 면은 구멍 벽(r = ROOM_DISC_HOLE)의 **연장**이다 — 한 면으로 이어져 이음매가 없다.
  const base = chamf > 1e-9
    ? [[ROOM_LAND_R, yTop], [ROOM_LAND_R, yBot + chamf], [ROOM_LAND_R - chamf, yBot],
       [ROOM_DISC_HOLE + chamf, yBot], [ROOM_DISC_HOLE, yBot + chamf]]
    : [[ROOM_LAND_R, yTop], [ROOM_LAND_R, yBot], [ROOM_DISC_HOLE, yBot]]
  const cap = railOn
    ? (railC > 1e-9
        ? [[ROOM_DISC_HOLE, yRail - railC], [ROOM_DISC_HOLE + railC, yRail],
           [ROOM_DISC_HOLE + railW - railC, yRail], [ROOM_DISC_HOLE + railW, yRail - railC],
           [ROOM_DISC_HOLE + railW, yTop]]
        : [[ROOM_DISC_HOLE, yRail], [ROOM_DISC_HOLE + railW, yRail], [ROOM_DISC_HOLE + railW, yTop]])
    : [[ROOM_DISC_HOLE, yTop]]
  const prof = [...base, ...cap]

  const ccw = polyArea2(prof) > 0
  const tris2 = earClip(prof)
  const segs = Math.max(24, Math.round(ROOM_DISC_SEGS * sweep / (Math.PI * 2)))

  return {
    yTop, yBot, thick, chamf, yOculus, yShellAtRim,
    rIn: ROOM_DISC_HOLE, rOut: ROOM_LAND_R,
    railOn, railH, railW, railC, yRail,
    rWalkIn: ROOM_DISC_HOLE + railW,          // 실제로 밟는 띠의 안쪽 끝
    walkW: bandW - railW,                     // 남는 보행 폭
    t0, t1, wA, wB, sweep, gap, segs, prof, ccw, tris2,
    //  두께가 셸을 뚫지 않는가(불변식 — 검사가 박는다)
    shellSafe: yBot >= yShellAtRim - 1e-9,
    //  메시가 차지하는 높이 상한(난간 포함) — 검사가 메시 범위를 이걸로 잰다
    yMax: railOn ? yRail : yTop,
  }
}

// ══════════════════════════════════════════════════════════════
//  빌드 — 닫힌 단면을 방위로 스윕 + 양 끝 캡
// ══════════════════════════════════════════════════════════════
export function buildDisc() {
  const s = discSpec()
  const P = [], N = []
  const pt = (w, p) => [p[0] * Math.cos(w), p[1], p[0] * Math.sin(w)]

  //  옆·위·밑 — 단면 변마다 스윕 한 띠. ★법선은 **부호 면적**으로(무게중심 금지 — 난간이 오목을 만든다)
  for (let i = 0; i < s.segs; i++) {
    const w0 = s.wA - s.sweep * (i / s.segs)
    const w1 = s.wA - s.sweep * ((i + 1) / s.segs)
    const wm = (w0 + w1) / 2
    for (let j = 0; j < s.prof.length; j++) {
      const p0 = s.prof[j], p1 = s.prof[(j + 1) % s.prof.length]
      const [nr, ny] = edgeNormal2(s.prof, j, s.ccw)
      const want = [nr * Math.cos(wm), ny, nr * Math.sin(wm)]
      quadTo(P, N, pt(w0, p0), pt(w1, p0), pt(w1, p1), pt(w0, p1), want)
    }
  }
  //  끝 캡 둘 — ★귀 자르기 결과를 쓴다(부채 금지 — 오목 꼭짓점에서 도형 밖으로 샌다)
  for (const [w, sgn] of [[s.wA, +1], [s.wB, -1]]) {
    const want = [-Math.sin(w) * sgn, 0, Math.cos(w) * sgn]
    for (const [a, b, c] of s.tris2)
      triTo(P, N, pt(w, s.prof[a]), pt(w, s.prof[b]), pt(w, s.prof[c]), want)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  g.computeBoundingSphere()
  return g
}

// ══════════════════════════════════════════════════════════════
//  ★슬롯 ↔ 45° 터널 물림 실측 — 선언된 비용을 검사가 매 실행 잰다
//   터널 벽은 r `RAD_WALL_R0`(15.5)에서 시작하고 반폭은 `RAD_T_HW`다.
//   반경 r에서 터널의 가까운 쪽 벽 방위 = 45° − asin(RAD_T_HW/r).
//   슬롯 끝(월드 wA = 도착각)이 그보다 크면 그 반경에서 물린다.
// ══════════════════════════════════════════════════════════════
export function slotTunnelBite(RAD_ANG0, RAD_T_HW, RAD_WALL_R0) {
  const s = discSpec()
  //  ⚠슬롯의 두 가장자리는 wA(−29.5°)와 wB(−322.5° ≡ +37.5°)다. 45° 터널에 붙는 쪽은 **wB**다.
  //   (구현 중 wA를 쓰는 오답을 냈다 — 물림 292°가 나와 즉시 들통났다. 부호 규약은 반드시 정규화해 확인할 것.)
  const slotEnd = ((s.wB % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)   // 도착각 쪽 슬롯 끝(월드)
  //  물림이 시작되는 임계 반경 — 이보다 안쪽에서만 물린다
  const dAng = RAD_ANG0 - slotEnd
  const rCrit = dAng > 1e-9 && dAng < Math.PI / 2 ? RAD_T_HW / Math.sin(dAng) : Infinity
  let maxDeg = 0, atR = 0, maxArc = 0
  if (rCrit > RAD_WALL_R0) {
    for (let r = RAD_WALL_R0; r <= Math.min(rCrit, ROOM_LAND_R); r += 0.005) {
      const near = RAD_ANG0 - Math.asin(Math.min(1, RAD_T_HW / r))
      const ov = slotEnd - near
      if (ov > 0) { const arc = ov * r; if (arc > maxArc) { maxArc = arc; maxDeg = ov * 180 / Math.PI; atR = r } }
    }
  }
  return { slotEnd, rCrit, rLo: RAD_WALL_R0, rHi: Math.min(rCrit, ROOM_LAND_R), maxDeg, maxArc, atR }
}
