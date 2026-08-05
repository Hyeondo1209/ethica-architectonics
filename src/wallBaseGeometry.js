// ════════════════════════════════════════════════════════════════════
//  wallBaseGeometry.js — ★114 벽 밑동 팔각 각뿔대 (2026.08.05 현도 지시)
//   현도: "구 내벽과 바닥이 맞닿는 부분 마감... 정의 감실부와 비슷한 8각형 기둥으로 마무리."
//
//  ★경위(기록 — 같은 실수 반복 방지):
//   1차 리드백에서 내가 "수직 각기둥은 셸을 뚫으니 불가, 각뿔대만 성립"이라고 했다.
//   현도 정정 = *"기울일 필요 없이 수직인 팔각형을 세우고 윗면이 보이지 않도록"* → 수직판으로 구현.
//   현도 로컬 판정 = **반려**("별로다"). 지시 = *"너가 착각했던 그 버전으로"* → **기울인 각뿔대**가 정본.
//   ⚠즉 이 모듈은 수직판(폐기)이 아니라 **기울인 판**이다. 기울기 0을 주면 구 수직판으로 돌아간다.
//
//  ★형상 = (셸 안쪽) − (팔각 **각뿔대**).
//   · 안쪽 면 = 여덟 개의 평면. 위로 갈수록 축 쪽으로 `WBASE_TILT`만큼 눕는다.
//   · 바깥 면 = 셸을 `WBASE_CLR`만큼 안으로 뗀 회전면(동일평면 z-fighting 회피).
//   · **윗면 = 수평 절단면**(현도 2026.08.05 3차 정정 — *"아치형으로 보이게 하지 말고 그냥 바닥과
//     수평이게 잘라서 윗면이 보이도록"*). 셸에 흡수시켜 칼끝으로 닫는 안(아치 여덟)은 **반려됐다.**
//     윗면 = 팔각(안) ↔ 셸(밖) 사이의 수평 고리. 밑동이 갓/코니스처럼 읽힌다.
//   ⚠**높이가 노브가 되면서 보 삼킴이 풀렸다** — 최저 보 밑면(바닥 위 12.79)보다 낮게 자르면 무접촉.
//   · 밑면 = 바닥(y = ROOM_FLOOR_Y)의 팔각↔원 사이 고리. 판(+ROOM_FLOOR_LIFT)이 덮어 안 보인다.
//
//  ★파생 관계(노브는 `WBASE_RB`·`WBASE_TILT` 둘):
//   a0 = Rb·cos(π/N)                     바닥 면중심 축거리(가장 가깝다 = 가장 두껍고 높다)
//   w  = Rb·sin(π/N)                     바닥 면 반폭(접선 방향)
//   s(y) = (a0 − (y−y0)·tanθ) / a0       각뿔대의 균등 축소율. θ=0이면 s≡1 = 수직 각기둥
//   면 위 바닥 접선좌표 t의 축거리 ρ(y,t) = s(y)·√(a0² + t²)
//   윗면 높이 yTop = y0 + WBASE_H  (수평 — 방위에 무관한 상수)
//   윗면 고리 폭 = wallR(yTop) − CLR − ρ(yTop, t) ⇒ 면 중심에서 최대, 모서리에서 최소
//   ⚠**절단 상한** = 팔각이 셸에 닿는 최저 높이(모서리). 그보다 높이 자르면 모서리가 먼저 셸을
//    만나 윗면이 끊긴다 = 반려된 아치가 되살아난다. `yTopAt(w)`가 그 상한이고 검사가 박는다.
//
//  ★위상 두 체제 — `WBASE_PHASE`:
//   'align'   정의 각뿔대와 같은 위상(+x가 모서리) — 모서리끼리 맞는다. 하나의 질서.
//   'counter' π/N(22.5°) 회전(+x가 면 중심) — 밑동의 면이 정의의 모서리를 마주본다. 대구.
//
//  ★법선: 안쪽은 여덟 평면이므로 **면 법선이 옳다**. `computeVertexNormals()`를 쓰지 않고
//   삼각형마다 직접 찍는다(defPitGeometry와 같은 규약 — '각진 연필' 사고의 역: 여기선 각져야 맞다).
//
//  ⚠수치 정본 = constants.js ★114 블록 주석. 여기엔 '어떻게'만 둔다.
//  ⚠사본 금지 — Room.jsx·check_rooms가 **이 함수들을** 부른다.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, wallR,
  PIT_SIDES, PIT_PHASE,
  WBASE_RB, WBASE_TILT, WBASE_H, WBASE_PHASE, WBASE_CLR, WBASE_SEGS, WBASE_VSEGS,
} from './constants.js'

// ── 스펙(단일 유도점) ──
export function wallBaseSpec() {
  const N    = PIT_SIDES
  const half = Math.PI / N
  const y0   = ROOM_FLOOR_Y                       // 밑면 = 바닥 판 윗면보다 ROOM_FLOOR_LIFT만큼 아래(밑선 봉합)
  const Rb   = WBASE_RB
  const a0   = Rb * Math.cos(half)                // 바닥 면중심 축거리(내접반경)
  const w    = Rb * Math.sin(half)                // 바닥 면 반폭
  const tn   = Math.tan(WBASE_TILT * Math.PI / 180)
  //  위상: 'align' = PIT과 같은 모서리 방위 / 'counter' = 반 칸 회전
  const phase = PIT_PHASE + (WBASE_PHASE === 'counter' ? half : 0)

  const scaleAt = (y) => Math.max(0, (a0 - (y - y0) * tn) / a0)
  const rhoAt   = (y, t) => scaleAt(y) * Math.hypot(a0, t)
  const rOutAt  = (y) => wallR(y) - WBASE_CLR

  //  끝높이 — ρ(y,t)는 단조 감소, rOut(y)도 단조 감소하지만 셸이 더 빨리 닫힌다. 교차는 하나뿐.
  const yTopAt = (t) => {
    let lo = y0, hi = ROOM_FLOOR_Y + ROOM_HEIGHT - 1e-6
    if (!(rhoAt(lo, t) < rOutAt(lo))) return lo    // 바닥에서 이미 셸 밖 = 밑동 없음(가드)
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2
      if (rhoAt(m, t) < rOutAt(m)) lo = m; else hi = m
    }
    return lo
  }

  //  면 중심 방위(밑동 여덟 면이 향하는 곳) · 모서리 방위
  const faceAz = Array.from({ length: N }, (_, i) => phase + (i + 0.5) * (2 * Math.PI / N))
  const edgeAz = Array.from({ length: N }, (_, i) => phase + i * (2 * Math.PI / N))

  const yTop = y0 + WBASE_H                       // ★수평 절단면(방위 무관)
  return {
    N, half, y0, Rb, a0, w, tiltDeg: WBASE_TILT, phase, faceAz, edgeAz,
    scaleAt, rhoAt, rOutAt, yTopAt, yTop, H: WBASE_H,
    hMax:        yTopAt(w) - y0,                   // ★절단 상한 = 모서리가 셸에 닿는 높이
    topFace:     rOutAt(yTop) - rhoAt(yTop, 0),    // 윗면 고리 폭(면 중심 — 가장 넓다)
    topCorner:   rOutAt(yTop) - rhoAt(yTop, w),    // 윗면 고리 폭(모서리 — 가장 좁다)
    thickFace:   rOutAt(y0) - a0,                  // 바닥 두께(면 중심)
    thickCorner: rOutAt(y0) - Rb,                  // 바닥 두께(모서리) — 음수면 팔각이 원 밖(금지)
  }
}

// ── 매스 ──
//  구성 = 방위 표본마다 프로파일 하나(안쪽 아래 → 칼끝 → 바깥 아래)를 세우고 이웃끼리 로프트.
//  표본은 **모서리를 정확히 밟는다**(면당 WBASE_SEGS 등분) → 면 안에서는 평면이 정확히 유지되고
//  모서리에서만 꺾인다. 면 법선을 삼각형마다 찍으므로 그 꺾임이 그대로 살아난다.
export function buildWallBase() {
  const s = wallBaseSpec()
  const { N, a0, w, y0 } = s
  const SEG = Math.max(2, WBASE_SEGS), VS = Math.max(2, WBASE_VSEGS)

  //  방위 표본 — 면 f의 접선좌표 t를 −w..+w로 훑는다(끝점 = 모서리, 이웃 면과 공유)
  const cols = []
  for (let f = 0; f < N; f++) {
    for (let i = 0; i < SEG; i++) {                // i=SEG는 다음 면의 i=0과 같은 점이라 생략
      const t  = -w + (2 * w) * (i / SEG)
      const az = s.faceAz[f] + Math.atan2(t, a0)
      const yT = s.yTop
      const pts = []
      pts.push([s.rhoAt(y0, t), y0])               // 0: 안쪽 밑
      pts.push([s.rhoAt(yT, t), yT])               // 1: 안쪽 위(윗면 안쪽 모서리)
      pts.push([s.rOutAt(yT), yT])                 // 2: 윗면 바깥 모서리 ← ★수평 절단면
      for (let v = 1; v <= VS; v++) {              // 3..VS+2: 바깥면을 내려온다
        const y = yT - (yT - y0) * (v / VS)
        pts.push([s.rOutAt(y), y])
      }
      cols.push({ az, pts })
    }
  }

  const M = cols[0].pts.length
  const P = (c, j) => {
    const [r, y] = cols[c].pts[j]
    return [r * Math.cos(cols[c].az), y, r * Math.sin(cols[c].az)]
  }
  //  안팎 사이의 기준점(법선 방향 결정용) — 이 방위 프로파일의 무게중심
  const ref = (c) => {
    let r = 0, y = 0
    for (const p of cols[c].pts) { r += p[0]; y += p[1] }
    r /= M; y /= M
    return [r * Math.cos(cols[c].az), y, r * Math.sin(cols[c].az)]
  }

  const pos = [], nor = []
  const tri = (A, B, C, inside) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2]
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const L = Math.hypot(nx, ny, nz)
    if (!(L > 1e-12)) return                        // 퇴화 삼각형은 버린다
    nx /= L; ny /= L; nz /= L
    //  매스 바깥을 향하게 — 삼각형 중심에서 기준점으로 가는 벡터의 반대편
    const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, cz = (A[2] + B[2] + C[2]) / 3
    if (nx * (cx - inside[0]) + ny * (cy - inside[1]) + nz * (cz - inside[2]) < 0) { nx = -nx; ny = -ny; nz = -nz }
    //  법선 방향에 맞춰 감김도 뒤집는다(감김↔법선 정합 — ★102-2 전례)
    const vs = (nx * (uy * vz - uz * vy) + ny * (uz * vx - ux * vz) + nz * (ux * vy - uy * vx)) > 0
      ? [A, B, C] : [A, C, B]
    for (const p of vs) { pos.push(p[0], p[1], p[2]); nor.push(nx, ny, nz) }
  }

  const NC = cols.length
  for (let c = 0; c < NC; c++) {
    const d = (c + 1) % NC
    const mid = ref(c).map((v, i) => (v + ref(d)[i]) / 2)
    for (let j = 0; j < M - 1; j++) {               // 안쪽 1칸 + **윗면 1칸** + 바깥 VS칸
      const A = P(c, j), B = P(c, j + 1), C = P(d, j + 1), D = P(d, j)
      tri(A, B, C, mid); tri(A, C, D, mid)
    }
    //  밑면 고리 — 안쪽 밑(0) ↔ 바깥 밑(M−1)
    const A = P(c, 0), B = P(c, M - 1), C = P(d, M - 1), D = P(d, 0)
    tri(A, B, C, mid); tri(A, C, D, mid)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3))
  return g
}

//  ── 보 삼킴 보고(검사·프로브 공용) ── 막지 않는다. 선언된 비용을 매 실행 재서 보고한다.
export function beamBurial(beams) {
  const s = wallBaseSpec()
  const out = []
  for (let i = 0; i < beams.length; i++) {
    const b = beams[i]
    //  보 방위를 면 안 접선좌표로 환산
    let q = ((b.az - s.phase) % (2 * Math.PI / s.N) + (2 * Math.PI / s.N)) % (2 * Math.PI / s.N) - s.half
    const t = s.a0 * Math.tan(q)
    if (s.yTop <= b.yB) continue                     // 밑동 윗면이 보 밑면보다 낮다 = 무접촉
    const dep = wallR(b.yB) - s.rhoAt(b.yB, t)
    const span = b.rOutT - b.rIn
    out.push({ i, t, depth: dep, span, frac: dep / span })
  }
  return out
}
