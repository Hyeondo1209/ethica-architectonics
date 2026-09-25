// ════════════════════════════════════════════════════════════════════════════
//  exitFlareGeometry.js — ★80 출구 통로(감아 오르는 나팔)의 기하 정본  (2026.07.28 · 5차)
// ════════════════════════════════════════════════════════════════════════════
//  좌표계 = **등불 방 로컬**(Dome.jsx `<group position={[AX,0,AZ]} rotation-y={-RM10_PHI}>` 안).
//   로컬 +x = 반경 바깥 · 로컬 −x = 돔 중심 방향 · y = 월드 y.
//   반원호가 `RM10_ARC_TH1`(230°)에서 끝나고 여기서 이어받는다.
//
//  ★현도 5차: 상승(계단) + 반원호 더 감기 + 회랑 외벽 부착 + 정조준 + 후반부 드라마틱 확장.
//   전체 의도 = 등불 방 + 이 통로가 **하나의 소라게 껍질**.
//
//  ★상승은 필요조건이다 — 회랑 발자국 안으로 들어가려면 밑판(237.83)을 피해야 하는데
//   수직 여유가 11.40뿐이다. 12.00 올라가면 통로 바닥 = 회랑 바닥(238.43)이 되어 그 위가 자유로워진다.
//  ★계단은 회랑 어법 계승: 5단 × 0.24 = 한 참 1.2 · 경사 30° · 계단 길이 2.08. 12.00 = 정확히 10참.
//
//  ⚠법선: 스윕 방향으로만 정점을 공유(indexed), 모서리 넷에서는 스트립을 나눠 각지게.

import * as THREE from 'three'
import { XPL_NRM_W } from './constants.js'   // ★241-c 음영 법선 u 창
import {
  RM10_FLARE_R, RM10_FLARE_SWEEP, RM10_FLARE_C, RM10_ARC_TH1, RM10_FLARE_LEN,
  RM10_FLARE_W1, RM10_FLARE_H1, RM10_FLARE_EASE, RM10_FLARE_EASE_HI, RM10_FLARE_B1_0,
  RM10_FLARE_LO_W, RM10_FLARE_LO_H, RM10_FLARE_TB, RM10_FLARE_BURST_RUN,
  RM10_FLARE_RISE, RM10_FLARE_STEPS, CL_STEP_RISE, CL_STEP_GO,
  RM10_EXIT_W, RM10_EXIT_ROOF, RM10_EXIT_FLOOR_Y, PASS_T,
  rm10Windows, RM10_WIN_ON, RM10_WIN_SILL, RM10_WIN_HEAD, RM10_WIN_TAPER,   // ★81 창
  RM10_WIN_BATTER_DEG, RM10_WIN_MODE, RM10_WIN_SLIT_H,
} from './constants.js'

//  ── 중심선 ────────────────────────────────────────────────────────────────
//  s = 0..SWEEP.  f = θb + π − s.  s=0에서 반원호 끝 위치·접선과 정확히 일치한다.
export function flarePoint (s) {
  const f = RM10_ARC_TH1 + Math.PI - s
  return {
    x: RM10_FLARE_C[0] + RM10_FLARE_R * Math.cos(f),
    z: RM10_FLARE_C[1] + RM10_FLARE_R * Math.sin(f),
    tx:  Math.sin(f), tz: -Math.cos(f),          // 진행
    nx: -Math.cos(f), nz: -Math.sin(f),          // 폭 방향. +N = 뒤집기 중심 쪽(안) / −N = 바깥(회랑 외벽 쪽)
  }
}

//  ── ★81 창 하나의 형상 ────────────────────────────────────────────────────
//  배터 폭 b = 창 키 × tan(배터각). **창 키에서 파생**이므로 창이 커져도 어법이 같다.
//  안전판: 폭의 35%를 넘지 않는다(넘으면 위턱이 한 점으로 수렴해 창이 삼각형이 된다).
export function winShape (w) {
  //  ★슬릿: 밑변(u 구간)은 사다리꼴 그대로, 키만 잘린다. 배터 없음 —
  //   얇은 띠에 기운 문선을 주면 개구가 마름모로 읽혀 '슬릿'이 아니게 된다.
  if (RM10_WIN_MODE === 'slit') return { hgt: RM10_WIN_SLIT_H, b: 0 }
  const tm = (w.u0 + w.u1) / 2 / RM10_FLARE_LEN
  const hgt = flareSection(tm).h - RM10_WIN_HEAD - RM10_WIN_SILL
  const raw = hgt * Math.tan(RM10_WIN_BATTER_DEG * Math.PI / 180)
  return { hgt, b: Math.max(0, Math.min(raw, (w.u1 - w.u0) * 0.35)) }
}

//  ── 계단 프로파일 ─────────────────────────────────────────────────────────
//  참(수평) → 5단(라이저+디딤) 를 10번. 마지막도 참으로 끝난다(참 11 · 참간 균등).
//  반환 = [{u(호길이), y}] — 라이저는 같은 u에서 y가 뛰므로 ε만큼 벌려 퇴화 삼각형을 막는다.
export function stairProfile () {
  //  ★계단은 **터짐 구간에만** 있다 — 낮은 구간은 회랑 밑이라 오를 수 없다.
  //   50단 × 디딤 0.416 = 주행 20.78 · 상승 12.00 → 경사 30.0° = 회랑 계단과 같은 어법.
  const uB = RM10_FLARE_LEN * RM10_FLARE_TB
  const stairRun = RM10_FLARE_STEPS * CL_STEP_GO
  const land = (RM10_FLARE_BURST_RUN - stairRun) / 2      // 계단 위아래 참
  const out = []
  let u = 0, y = RM10_EXIT_FLOOR_Y
  const push = () => out.push({ u: Math.min(u, RM10_FLARE_LEN), y })
  //  ⓐ 낮은 구간 — 평지. 형상 변화를 담으려 중간 샘플을 촘촘히 둔다.
  //  ★81: 창 모서리 u를 **이 표본 목록에 합류**시킨다. 벽만 따로 촘촘히 뜨면
  //   바닥·지붕 폴리라인과 현(chord)이 어긋나 틈이 생긴다 — 네 면이 같은 표본을 쓰는 것이 봉인이다.
  const NLO = 40
  const us = []
  for (let i = 0; i <= NLO; i++) us.push(uB * i / NLO)
  for (const w of rm10Windows()) {
    const SUB = 6                                  // 창 안쪽도 쪼갠다(위턱이 천장 곡선을 따라가야 하므로)
    for (let j = 0; j <= SUB; j++) us.push(w.u0 + (w.u1 - w.u0) * j / SUB)
    const { b } = winShape(w)                      // ★배터 꺾임점 — 여기 표본이 없으면 사다리꼴이 뭉개진다
    if (b > 1e-9) { us.push(w.u0 + b); us.push(w.u1 - b) }
  }
  us.sort((a, b) => a - b)
  for (const v of us) { if (out.length && v - out[out.length - 1].u <= 1e-6) continue; u = v; push() }
  //  ⓑ 아래 참 → 계단 50단 → 위 참
  u += land; push()
  for (let j = 0; j < RM10_FLARE_STEPS; j++) {
    y += CL_STEP_RISE; u += 1e-3; push()      // 라이저
    u += CL_STEP_GO; push()                   // 디딤
  }
  u = RM10_FLARE_LEN; push()
  return { samples: out, land, stairRun, totalRise: RM10_FLARE_STEPS * CL_STEP_RISE, uB }
}

//  매끄러운 바닥 기준선(천장이 톱니가 되지 않게) — 낮은 구간 평지, 터짐 구간 선형
export function floorSmooth (t) {
  return t <= RM10_FLARE_TB ? RM10_EXIT_FLOOR_Y
    : RM10_EXIT_FLOOR_Y + RM10_FLARE_RISE * (t - RM10_FLARE_TB) / (1 - RM10_FLARE_TB)
}

//  ── 단면 ──────────────────────────────────────────────────────────────────
export function flareSection (t) {
  const TB = RM10_FLARE_TB, s0 = RM10_EXIT_W / 2
  let w, h
  if (t <= TB) {
    //  ⓐ 압축 — 회랑 밑. 낌새만(선형). 상한에서 여유를 남긴다(공면 금지).
    const u = Math.pow(Math.max(0, t) / TB, RM10_FLARE_EASE)
    w = RM10_EXIT_W + (RM10_FLARE_LO_W - RM10_EXIT_W) * u
    h = RM10_EXIT_ROOF + (RM10_FLARE_LO_H - RM10_EXIT_ROOF) * u
  } else {
    //  ⓑ 터짐 — 회랑을 벗어나는 순간. 계단과 동시에.
    const u = Math.pow((t - TB) / (1 - TB), RM10_FLARE_EASE_HI)
    w = RM10_FLARE_LO_W + (RM10_FLARE_W1 - RM10_FLARE_LO_W) * u
    h = RM10_FLARE_LO_H + (RM10_FLARE_H1 - RM10_FLARE_LO_H) * u
  }
  const hw = w / 2
  //  천장 안쪽 모서리만 시작값이 다르다(방 원뿔 추종 — 수직이면 이음매가 벌어진다)
  const b1 = t <= TB
    ? RM10_FLARE_B1_0 + (hw - RM10_FLARE_B1_0) * Math.pow(Math.max(0, t) / TB, RM10_FLARE_EASE)
    : hw
  return { a0: hw, b0: hw, a1: hw, b1: Math.max(b1, hw * 0.999), h }
}

function stripCoarse (A, B) {
  const n = A.length, pos = [], idx = []
  for (let i = 0; i < n; i++) pos.push(...A[i], ...B[i])
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

//  ★★★241 빛 구획 X — **같은 띠를 촘촘하게 다시 짓는다**(정점색 해상도 · 규율 36: 변을 쪼개지 않고 면을 다시 짓는다).
//   원래 띠 = 레일 A·B 사이 사각형 사슬, 사각형마다 대각선 A_i→B_i+1로 두 삼각형(폭 방향 정점 2개 → 아가리 쪽 변 40m).
//   ⛔첫 판(쌍선형 격자)은 **원래 면과 최대 0.31m 달랐다**(실측 — 천장 램프 사각형은 비평면이라 원래 면 = 대각선에서 꺾인 두 삼각형).
//    화면의 천장 모양이 바뀌면 조형 변경이다 ⇒ 원래 **삼각형 위에만** 점을 놓는다:
//   ⓐ 평면 사각형(바닥 디딤·수직 벽 — 뒤틀림 < 1e-5): 진행 방향으로도 현 위 보간 기둥을 끼운다(평면이라 원래 면과 동일).
//   ⓑ 비평면 사각형(기운 −N벽 · 천장 램프): 기둥을 끼우지 않고, 원래 두 삼각형 각각을 **긴 두 변 사이 지퍼**로 채운다(꺾임선 = 대각선 보존).
//   ⓒ 기둥 A→B는 제 길이/L 칸(기둥마다 칸 수가 다르다) · 칸 수가 다른 두 줄 사이 = 지퍼 삼각분할(T자 이음 0) · 감김 = 원래 strip()과 같은 향.
function lerp3 (a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f] }
const _d3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
export function quadTwist (a, b, c, d) {   // a=A_i b=B_i c=A_i+1 d=B_i+1 → d의 평면(a,b,c)까지 거리
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], L = Math.hypot(...n)
  if (L < 1e-12) return 0
  return Math.abs((d[0] - a[0]) * n[0] + (d[1] - a[1]) * n[1] + (d[2] - a[2]) * n[2]) / L
}
export const FLARE_TWIST_TOL = 1e-5
function stripFine (A, B, L) {
  const pos = [], idx = []
  const add = (p) => { pos.push(p[0], p[1], p[2]); return pos.length / 3 - 1 }
  const line = (p, q, i0, i1) => {                                   // p→q 칸 나눔 · 끝점 색인 공유(있으면)
    const m = Math.max(1, Math.ceil(_d3(p, q) / L - 1e-9)), ids = []
    for (let k = 0; k <= m; k++) ids.push(k === 0 && i0 != null ? i0 : k === m && i1 != null ? i1 : add(lerp3(p, q, k / m)))
    return ids
  }
  const zip = (P, Q) => {                                             // 두 줄(각각 시작→끝) 사이 · 퇴화(같은 색인) 삼각형은 버린다
    const pm = P.length - 1, qm = Q.length - 1
    let i = 0, j = 0
    const put = (a, b, c) => { if (a !== b && b !== c && a !== c) idx.push(a, b, c) }
    while (i < pm || j < qm) {
      if (i < pm && (j === qm || (i + 1) / pm <= (j + 1) / qm)) { put(P[i], P[i + 1], Q[j]); i++ }
      else { put(P[i], Q[j + 1], Q[j]); j++ }
    }
  }
  let col = line(A[0], B[0])
  for (let i = 0; i + 1 < A.length; i++) {
    const tw = quadTwist(A[i], B[i], A[i + 1], B[i + 1])
    if (tw < FLARE_TWIST_TOL) {                                        // ⓐ 평면 — 현 위 기둥 삽입
      const n = Math.max(1, Math.ceil(Math.max(_d3(A[i], A[i + 1]), _d3(B[i], B[i + 1])) / L - 1e-9))
      for (let j = 1; j <= n; j++) {
        const nxt = j === n ? line(A[i + 1], B[i + 1]) : line(lerp3(A[i], A[i + 1], j / n), lerp3(B[i], B[i + 1], j / n))
        zip(col, nxt); col = nxt
      }
    } else {                                                           // ⓑ 비평면 — 원래 두 삼각형(대각선 A_i→B_i+1) 각각을 채운다
      const nxt = line(A[i + 1], B[i + 1])
      const dg = line(A[i], B[i + 1], col[0], nxt[nxt.length - 1])
      zip(col, dg)                                                     // 삼각형 (A_i, B_i, B_i+1)
      zip(dg, nxt)                                                     // 삼각형 (A_i, B_i+1, A_i+1) — 끝이 B_i+1에서 만난다
      col = nxt
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

//  ★241 촘촘한 판의 **음영 법선 = 매개 곡면의 해석 법선** — 셸은 표본 사이가 평면 조각이라(낮은 구간 1.6m · 계단 구간 디딤 0.416m)
//   면 법선이 조각마다 2~3°씩 뛴다(실측: 챌판 자리 두 기둥이 정점을 나눠 갖지 않아 평균도 안 된다). 아가리는 벽에 스치듯 비치므로
//   이 몇 도가 명암 9%로 커져 **세로 띠**가 됐다(프로브 x8). ⇒ 벽·천장의 음영 법선을 셸이 근사하는 매개 곡면 X(u, k)에서 직접 잰다:
//   +N벽 X = p(u) + a(u)·N(u) (수직) · −N벽 X = p(u) + (−b0 + (b0 − b1)·k)·N(u), y = 바닥(매끈) + k·층고 · 천장 X = p(u) + (−b1 + (a1 + b1)·k)·N(u), y = 천장.
//   위치·색인 무변 — 음영 법선만(부호는 원래 면 법선 쪽). 바닥(디딤·챌판 = 다른 면)은 그대로.
function flareSurf (key, u, k) {
  const t = Math.min(1, Math.max(0, u / RM10_FLARE_LEN)), p = flarePoint(RM10_FLARE_SWEEP * t), sec = flareSection(t), yF = floorSmooth(t), yR = yF + sec.h
  const at = (off, y) => [p.x + off * p.nx, y, p.z + off * p.nz]
  if (key === 'fliwDome') return at(sec.a0, yF + k * sec.h)
  if (key === 'fliwOuter') return at(-sec.b0 + (sec.b0 - sec.b1) * k, yF + k * sec.h)
  return at(-sec.b1 + (sec.a1 + sec.b1) * k, yR)
}
function analyticNormals (g, key) {
  //  h = 0.25m 할선(u) — 단면 확대 곡선이 시작점에서 기울기 무한(pow(t, EASE<1))이라 미분 대신 셸 표본 간격 수준의 할선으로 잰다(시작부 12~24° 어긋남 실측 → 수리)
  const P = g.attributes.position, N = g.attributes.normal, out = new Float32Array(P.count * 3), h = 1e-3, hu = 0.25
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), f = Math.atan2(z - RM10_FLARE_C[1], x - RM10_FLARE_C[0])
    let sw = RM10_ARC_TH1 + Math.PI - f; sw -= 2 * Math.PI * Math.floor((sw + Math.PI) / (2 * Math.PI))
    const u = sw * RM10_FLARE_R, t = Math.min(1, Math.max(0, u / RM10_FLARE_LEN)), sec = flareSection(t), yF = floorSmooth(t), pp = flarePoint(RM10_FLARE_SWEEP * t)
    const off = (x - pp.x) * pp.nx + (z - pp.z) * pp.nz
    const k = key === 'fliroof' ? (off + sec.b1) / (sec.a1 + sec.b1 || 1) : Math.min(1, Math.max(0, (y - yF) / (sec.h || 1)))
    //  ★241-c(현도 09.25 "나팔 입으로 이어지는 천장 — 경사가 갑자기 높아지며 명암도 급격히 바뀐다 · 얼룩처럼 보인다"):
    //   낮은 구간 → 터짐 구간 경계(u = LEN·TB)에서 천장 기울기·단면 확대율이 **꺾인다**(실측: 천장 법선 u62.6 (0,−1) → u64.2 앞·아래 50° · 값 0.22 → 1.0이 1.5m 안).
    //   ⇒ 음영 법선을 u 방향 ±XPL_NRM_W 창으로 평균(상자 필터 · 9표본) — 꺾임이 창 폭에 걸쳐 돌아간다(모양 무변 · 음영만). 매끈한 곳은 대칭 평균이라 방향 불변.
    let n = [0, 0, 0]
    for (let j = -4; j <= 4; j++) { const uj = Math.max(0, Math.min(RM10_FLARE_LEN, u + XPL_NRM_W * j / 4))
      const ua = Math.max(0, Math.min(RM10_FLARE_LEN - 2 * hu, uj - hu)), du = [0, 1, 2].map((c) => (flareSurf(key, ua + 2 * hu, k)[c] - flareSurf(key, ua, k)[c]) / (2 * hu))
      const dk = [0, 1, 2].map((c) => (flareSurf(key, uj, Math.min(1, k + h))[c] - flareSurf(key, uj, Math.max(0, k - h))[c]))
      const m = [du[1] * dk[2] - du[2] * dk[1], du[2] * dk[0] - du[0] * dk[2], du[0] * dk[1] - du[1] * dk[0]], lm = Math.hypot(...m) || 1
      const sg = (m[0] * N.getX(i) + m[1] * N.getY(i) + m[2] * N.getZ(i)) < 0 ? -1 : 1
      n = [n[0] + sg * m[0] / lm, n[1] + sg * m[1] / lm, n[2] + sg * m[2] / lm] }
    const l = Math.hypot(...n) || 1; n = n.map((v) => v / l)
    if (n[0] * N.getX(i) + n[1] * N.getY(i) + n[2] * N.getZ(i) < 0) n = n.map((v) => -v)
    out[3 * i] = n[0]; out[3 * i + 1] = n[1]; out[3 * i + 2] = n[2]
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out, 3))
}
export const FLARE_SMOOTH_KEYS = ['fliwDome', 'fliwOuter', 'fliroof']

//  ── 껍질 ──────────────────────────────────────────────────────────────────
//  모서리 순서: 0 바닥+N(안) → 1 바닥−N(바깥) → 2 천장−N → 3 천장+N
//  ★바닥은 계단 프로파일을 그대로 따라 오르고, 천장은 **매끄러운 램프 + 층고**로 오른다
//   (천장까지 계단지면 머리 위가 톱니가 된다 — 건축 통례).
//  여러 조각을 한 부재로 합친다(부재 대장 유지 + draw call 절약).
//  ★법선은 조각별로 **이미 계산된 것을 그대로 옮긴다** — 합친 뒤 다시 계산하면 조각 경계에서
//   평균이 나 '각진 연필'(2026.07.24)의 반대 사고가 난다.
function mergeGeo (list) {
  const P = [], NM = [], I = []
  let off = 0
  for (const g of list) {
    const p = g.attributes.position.array, nn = g.attributes.normal.array
    const ix = g.index ? g.index.array : null
    for (let i = 0; i < p.length; i++) P.push(p[i])
    for (let i = 0; i < nn.length; i++) NM.push(nn[i])
    const nv = p.length / 3
    if (ix) for (let i = 0; i < ix.length; i++) I.push(ix[i] + off)
    else for (let i = 0; i < nv; i++) I.push(i + off)
    off += nv
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(NM, 3))
  g.setIndex(I)
  return g
}

export function buildFlareShell (opts = {}) {
  //  ★241 opts.grid = L → 모든 띠를 stripFine(L)로(베이크 전용 · 기본 호출은 비트 동일)
  const strip = opts.grid ? (A, B) => stripFine(A, B, opts.grid) : stripCoarse
  const sp = stairProfile(), S = sp.samples
  const C = [[], [], [], []], E = [[], [], [], []]
  const meta = []
  for (const smp of S) {
    const t = smp.u / RM10_FLARE_LEN
    const p = flarePoint(RM10_FLARE_SWEEP * t), sec = flareSection(t)
    const yRoof = floorSmooth(t) + sec.h
    const put = (arr, off, y) => arr.push([p.x + off * p.nx, y, p.z + off * p.nz])
    put(C[0],  sec.a0, smp.y);      put(C[1], -sec.b0, smp.y)
    put(C[2], -sec.b1, yRoof);      put(C[3],  sec.a1, yRoof)
    put(E[0],  sec.a0 + PASS_T, smp.y - PASS_T);  put(E[1], -(sec.b0 + PASS_T), smp.y - PASS_T)
    put(E[2], -(sec.b1 + PASS_T), yRoof + PASS_T); put(E[3], sec.a1 + PASS_T, yRoof + PASS_T)
    meta.push({ t, p, sec, yFloor: smp.y, yRoof, u: smp.u })
  }
  const out = []
  const face = ['floor', 'wOuter', 'roof', 'wDome']   // 1-2 = 회랑 외벽에 붙는 벽
  const wins = RM10_WIN_ON ? rm10Windows() : []
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    //  ★81: k=3 = +N 벽(좌측·돔 중심 쪽) — 창이 켜져 있으면 아래 전용 빌더가 대신 짓는다
    if (k === 3 && wins.length) continue
    out.push({ key: 'fli' + face[k], walk: k === 0, geo: strip(C[k], C[j]) })
    out.push({ key: 'fle' + face[k], walk: false,   geo: strip(E[k], E[j]) })
  }
  // ── ★81 창 뚫린 +N 벽 ─────────────────────────────────────────────────────
  //  이 벽은 **수직 평면 슬래브**다(a0 = a1 = 반폭, 안팎 간격 = PASS_T) → CSG 불요.
  //  띠로 쪼개 짓는다: 창 밖 = 온벽 / 창 안 = 창턱 아래 띠 + 인방 위 띠 / 그리고 살(reveal) 넷.
  if (wins.length) {
    const idxOf = (u) => { let b = 0; for (let i = 1; i < meta.length; i++) if (Math.abs(meta[i].u - u) < Math.abs(meta[b].u - u)) b = i; return b }
    const pIn  = (i, y) => [meta[i].p.x + meta[i].sec.a0 * meta[i].p.nx, y, meta[i].p.z + meta[i].sec.a0 * meta[i].p.nz]
    const pOut = (i, y) => [meta[i].p.x + (meta[i].sec.a0 + PASS_T) * meta[i].p.nx, y,
                            meta[i].p.z + (meta[i].sec.a0 + PASS_T) * meta[i].p.nz]
    const sillY = (i) => meta[i].yFloor + RM10_WIN_SILL
    //  ★사다리꼴 = 위턱이 통로 천장을 따라간다(층고가 5.0→9.8로 자라므로 창이 저절로 큰다).
    const headBase = (i, w) => RM10_WIN_TAPER
      ? meta[i].yFloor + meta[i].sec.h - RM10_WIN_HEAD
      : meta[i].yFloor + flareSection((w.u0 + w.u1) / 2 / RM10_FLARE_LEN).h - RM10_WIN_HEAD
    //  ★배터: 창 양끝에서 위턱이 창턱까지 내려온다 = 문선이 안으로 기운 사다리꼴.
    //   b=0이면 f는 항상 1이라 곧은 직사각 개구로 되돌아간다(같은 식, 분기 없음).
    const headY = (i, w, b) => {
      //  ★슬릿 = 창턱에서 SLIT_H 만큼만. 수평 띠 하나(현도 "너머의 수많은 리브만 보는 걸로").
      if (RM10_WIN_MODE === 'slit') return sillY(i) + RM10_WIN_SLIT_H
      const s0 = sillY(i), hb = headBase(i, w)
      if (b <= 1e-9) return hb
      const u = meta[i].u
      const f = Math.max(0, Math.min(1, (u - w.u0) / b, (w.u1 - u) / b))
      return s0 + (hb - s0) * f
    }

    const R = wins.map((w) => ({ w, i0: idxOf(w.u0), i1: idxOf(w.u1), b: winShape(w).b }))
    const sub = (arr, a, b) => arr.slice(a, b + 1)
    const inner = [], outer = [], reveal = []
    //  ⓐ 창 사이·양끝의 온벽
    let cur = 0
    for (const r of R) {
      if (r.i0 > cur) { inner.push(strip(sub(C[3], cur, r.i0), sub(C[0], cur, r.i0)));
                        outer.push(strip(sub(E[3], cur, r.i0), sub(E[0], cur, r.i0))) }
      cur = r.i1
    }
    if (cur < meta.length - 1) {
      inner.push(strip(sub(C[3], cur, meta.length - 1), sub(C[0], cur, meta.length - 1)))
      outer.push(strip(sub(E[3], cur, meta.length - 1), sub(E[0], cur, meta.length - 1)))
    }
    //  ⓑ 창 구간 — 창턱 아래 띠 · 인방 위 띠 · 살 넷
    for (const r of R) {
      const sI = [], sO = [], hI = [], hO = []
      for (let i = r.i0; i <= r.i1; i++) {
        sI.push(pIn(i, sillY(i)));        sO.push(pOut(i, sillY(i)))
        hI.push(pIn(i, headY(i, r.w, r.b)));   hO.push(pOut(i, headY(i, r.w, r.b)))
      }
      inner.push(strip(sI, sub(C[0], r.i0, r.i1)))          // 창턱 아래(안)
      inner.push(strip(sub(C[3], r.i0, r.i1), hI))          // 인방 위(안)
      outer.push(strip(sO, sub(E[0], r.i0, r.i1)))          // 창턱 아래(밖)
      outer.push(strip(sub(E[3], r.i0, r.i1), hO))          // 인방 위(밖)
      reveal.push(strip(sI, sO))                            // 창턱 윗면
      //  ★배터가 있으면 이 한 줄이 인방 + 기운 문선 둘을 **한 띠로** 그린다
      //   (hI가 창턱→인방→창턱을 훑으므로 개구 윤곽 전체가 된다).
      reveal.push(strip(hI, hO))
      if (r.b <= 1e-9) for (const i of [r.i0, r.i1])         // 곧은 개구일 때만 수직 문선이 따로 선다
        reveal.push(strip([pIn(i, sillY(i)), pIn(i, headY(i, r.w, 0))],
                          [pOut(i, sillY(i)), pOut(i, headY(i, r.w, 0))]))
    }
    out.push({ key: 'fliwDome', walk: false, geo: mergeGeo(inner) })
    out.push({ key: 'flewDome', walk: false, geo: mergeGeo(outer) })
    out.push({ key: 'flwin',    walk: false, geo: mergeGeo(reveal) })   // 창턱·인방·문선
  }
  const N = S.length - 1
  const rc = [], re = [], sc = [], se = []
  for (let k = 0; k <= 4; k++) { const j = k % 4; rc.push(C[j][N]); re.push(E[j][N]); sc.push(C[j][0]); se.push(E[j][0]) }
  out.push({ key: 'flrim', walk: false, geo: strip(rc, re) })   // 아가리(정조준·수직 단면)
  out.push({ key: 'flcap', walk: false, geo: strip(sc, se) })   // 시작 테두리
  for (const m of out) m.geo.userData.flareKey = m.key            // ★241 베이크 재격자 표지(위치·색인 무변)
  if (opts.grid) for (const m of out) if (FLARE_SMOOTH_KEYS.includes(m.key)) analyticNormals(m.geo, m.key)   // ★241 촘촘한 판만(기본 호출 무변)
  return out
}

export function flareSpec () {
  const sp = stairProfile()
  const st = sp.samples.map((smp) => {
    const t = smp.u / RM10_FLARE_LEN, s = RM10_FLARE_SWEEP * t
    const p = flarePoint(s), sec = flareSection(t)
    return { t, s, u: smp.u, y: smp.y, x: p.x, z: p.z, headX: p.tx, headZ: p.tz, nx: p.nx, nz: p.nz,
             w: sec.a0 + sec.b0, h: sec.h, axDist: Math.hypot(p.x, p.z) }
  })
  return { R: RM10_FLARE_R, sweep: RM10_FLARE_SWEEP, len: RM10_FLARE_LEN, stair: sp, stations: st }
}
