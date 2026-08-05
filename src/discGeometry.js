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

  //  ── 단면(반경 r, 높이 y) — 닫힌 볼록 다각형. 밑모서리 넷이 챔퍼로 깎인다 ──
  const prof = chamf > 1e-9
    ? [[ROOM_LAND_R, yTop], [ROOM_LAND_R, yBot + chamf], [ROOM_LAND_R - chamf, yBot],
       [ROOM_DISC_HOLE + chamf, yBot], [ROOM_DISC_HOLE, yBot + chamf], [ROOM_DISC_HOLE, yTop]]
    : [[ROOM_LAND_R, yTop], [ROOM_LAND_R, yBot], [ROOM_DISC_HOLE, yBot], [ROOM_DISC_HOLE, yTop]]

  //  단면 무게중심 — 면 법선의 want를 여기서 뽑는다(볼록이라 안전)
  let cr = 0, cy = 0
  for (const p of prof) { cr += p[0]; cy += p[1] }
  cr /= prof.length; cy /= prof.length

  const segs = Math.max(24, Math.round(ROOM_DISC_SEGS * sweep / (Math.PI * 2)))

  return {
    yTop, yBot, thick, chamf, yOculus, yShellAtRim,
    rIn: ROOM_DISC_HOLE, rOut: ROOM_LAND_R,
    t0, t1, wA, wB, sweep, gap, segs, prof, cr, cy,
    //  두께가 셸을 뚫지 않는가(불변식 — 검사가 박는다)
    shellSafe: yBot >= yShellAtRim - 1e-9,
  }
}

// ══════════════════════════════════════════════════════════════
//  빌드 — 닫힌 단면을 방위로 스윕 + 양 끝 캡
// ══════════════════════════════════════════════════════════════
export function buildDisc() {
  const s = discSpec()
  const P = [], N = []
  const pt = (w, p) => [p[0] * Math.cos(w), p[1], p[0] * Math.sin(w)]

  //  옆·위·밑 — 단면 변마다 스윕 한 띠
  for (let i = 0; i < s.segs; i++) {
    const w0 = s.wA - s.sweep * (i / s.segs)
    const w1 = s.wA - s.sweep * ((i + 1) / s.segs)
    const wm = (w0 + w1) / 2
    for (let j = 0; j < s.prof.length; j++) {
      const p0 = s.prof[j], p1 = s.prof[(j + 1) % s.prof.length]
      //  변 중점이 무게중심에서 밖으로 향하는 방향 = 바깥 법선(볼록 단면)
      const mr = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2
      const dr = mr - s.cr, dy = my - s.cy
      const want = [dr * Math.cos(wm), dy, dr * Math.sin(wm)]
      quadTo(P, N, pt(w0, p0), pt(w1, p0), pt(w1, p1), pt(w0, p1), want)
    }
  }
  //  끝 캡 둘 — 단면 다각형을 부채로(볼록이라 안전). want = 스윕 접선의 바깥쪽
  for (const [w, sgn] of [[s.wA, +1], [s.wB, -1]]) {
    const want = [-Math.sin(w) * sgn, 0, Math.cos(w) * sgn]
    for (let j = 1; j < s.prof.length - 1; j++)
      triTo(P, N, pt(w, s.prof[0]), pt(w, s.prof[j]), pt(w, s.prof[j + 1]), want)
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
