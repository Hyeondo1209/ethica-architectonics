// ══════════════════════════════════════════════════════════════════════
//  roomShellGeometry.js — ★★★169 방 껍질 솔리드 (2026.08.22 현도 ⓒ)
//  구 체제(두께 0 sphereGeometry 두 장)를 **법선 오프셋 타원구 껍질** 하나로 교체한다.
//  · 중립면 = 구 종잇장과 같은 이상적 타원구 (수평 R = ROOM_R · 수직 H = ROOM_HEIGHT · 중심 y = ROOM_FLOOR_Y)
//  · 바깥면 = 중립면 + n̂·T_OUT / 안면 = 중립면 − n̂·T_IN  (오프셋 곡면 — 균일 법선 두께.
//    스케일 오프셋이 아니다: 타원구는 스케일이 법선 오프셋과 다르고, 두께가 방향마다 흔들린다)
//  · 오큘러스: **안면 구멍의 수평 반경 = ROOM_OCULUS_R(17.45 · 기능 절대치)** — 나선 도착 고리 14 +
//    빛우물 17.3 통과가 이 값에 물려 있다. 림 시작 극각 φ_in은 그 절대치에서 **역산**(이분법 · 파생).
//  · 남극: 안·밖 두 면이 각자 제 극점 팬으로 닫힌다 → 오큘러스 림 스트립 하나가 유일한 경계 = watertight.
//  · 법선 = 전부 명시(§2-D ⛔computeVertexNormals — '각진 연필'). 오프셋 곡면의 셰이딩 법선은
//    평행곡면 성질로 **중립면 법선 그대로**가 해석적으로 정확하다. orientOutward는 쓰지 않는다
//    (마지막에 computeVertexNormals를 불러 명시 법선을 덮어쓴다) — 감김은 아래 해석 유도로 확정,
//    검사(check_rooms ★169절)가 부호 부피 + 열린 에지 0으로 심판한다.
//  · 감김 유도(구면 파라미터 P(θ,u)): ∂θ×∂u ∝ +r̂(바깥) → 바깥면 쿼드 (i,j)(i+1,j)(i+1,j+1)(i,j+1),
//    안면은 역순, 림은 ∂θ×n̂ ∝ −∂u(위·구멍축 쪽) → [rimI, rimI′, rimO′, rimO]. 양의 아핀 스케일은 부호 불변.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_OCULUS_R, ROOM_OCULUS,
  ROOM_SHELL_SEG_U, ROOM_SHELL_SEG_A, ROOM_SHELL_T_OUT, ROOM_SHELL_T_IN,
} from './constants.js'

const R = ROOM_R, H = ROOM_HEIGHT, F = ROOM_FLOOR_Y

//  중립면 점·단위법선 — 해석 정본(u = 극각 0=천정 … π=남극)
export const shellMid = (th, u) => [R * Math.sin(u) * Math.cos(th), F + H * Math.cos(u), R * Math.sin(u) * Math.sin(th)]
export const shellNrm = (th, u) => {
  const nr = Math.sin(u) / R, ny = Math.cos(u) / H
  const L = Math.hypot(nr, ny)
  return [(nr / L) * Math.cos(th), ny / L, (nr / L) * Math.sin(th)]
}
//  안면의 수평 반경(θ 무관): r_in(u) = R sin u − T_IN · n_r(u)
const rInAt = (u) => {
  const nr = Math.sin(u) / R, ny = Math.cos(u) / H
  return R * Math.sin(u) - ROOM_SHELL_T_IN * (nr / Math.hypot(nr, ny))
}

export function roomShellSpec() {
  //  φ_in 역산: 안면 구멍 수평 반경 = ROOM_OCULUS_R (단조 구간 [OCU/2, π/2]에서 이분법)
  let lo = ROOM_OCULUS * 0.5, hi = Math.PI / 2
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2
    if (rInAt(m) < ROOM_OCULUS_R) lo = m; else hi = m
  }
  const phiIn = (lo + hi) / 2
  const nU = ROOM_SHELL_SEG_U
  const nV = Math.max(2, Math.ceil((Math.PI - phiIn) / ROOM_SHELL_SEG_A))  // 구 밀도 승계(파생)
  return {
    phiIn, nU, nV,
    tOut: ROOM_SHELL_T_OUT, tIn: ROOM_SHELL_T_IN,
    rimIn: { r: rInAt(phiIn), y: F + H * Math.cos(phiIn) - ROOM_SHELL_T_IN * shellNrm(0, phiIn)[1] },
    rimOut: {
      r: R * Math.sin(phiIn) + ROOM_SHELL_T_OUT * (Math.sin(phiIn) / R) / Math.hypot(Math.sin(phiIn) / R, Math.cos(phiIn) / H),
      y: F + H * Math.cos(phiIn) + ROOM_SHELL_T_OUT * shellNrm(0, phiIn)[1],
    },
    yPoleOut: F - H - ROOM_SHELL_T_OUT,
    yPoleIn: F - H + ROOM_SHELL_T_IN,
  }
}

export function buildRoomShell() {
  const S = roomShellSpec()
  const { phiIn, nU, nV, tOut, tIn } = S
  const pos = [], nrm = []
  const push = (p, n) => { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]) }
  const uAt = (j) => phiIn + (Math.PI - phiIn) * j / nV

  //  ── 정점 ──  (θ는 wrap: i = 0..nU−1 · 극 링 j=nV는 극점 하나로 대체)
  //  바깥면 링 j=0..nV−1
  for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) {
    const th = 2 * Math.PI * i / nU, u = uAt(j)
    const P = shellMid(th, u), N = shellNrm(th, u)
    push([P[0] + N[0] * tOut, P[1] + N[1] * tOut, P[2] + N[2] * tOut], N)
  }
  const O_POLE = pos.length / 3
  push([0, S.yPoleOut, 0], [0, -1, 0])
  //  안면 링(법선 = −n̂ = 방 안쪽)
  const I0 = pos.length / 3
  for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) {
    const th = 2 * Math.PI * i / nU, u = uAt(j)
    const P = shellMid(th, u), N = shellNrm(th, u)
    push([P[0] - N[0] * tIn, P[1] - N[1] * tIn, P[2] - N[2] * tIn], [-N[0], -N[1], -N[2]])
  }
  const I_POLE = pos.length / 3
  push([0, S.yPoleIn, 0], [0, 1, 0])
  //  림 스트립 전용 정점(좌표 = 두 링0 복제 · 법선 = −∂u = 위·구멍축 쪽 자오선) — 각을 세우는 명시 복제
  const RIM_O = pos.length / 3
  for (let i = 0; i < nU; i++) {
    const th = 2 * Math.PI * i / nU
    const du = [R * Math.cos(phiIn) * Math.cos(th), -H * Math.sin(phiIn), R * Math.cos(phiIn) * Math.sin(th)]
    const L = Math.hypot(du[0], du[1], du[2])
    const rn = [-du[0] / L, -du[1] / L, -du[2] / L]
    const P = shellMid(th, phiIn), N = shellNrm(th, phiIn)
    push([P[0] + N[0] * tOut, P[1] + N[1] * tOut, P[2] + N[2] * tOut], rn)
  }
  const RIM_I = pos.length / 3
  for (let i = 0; i < nU; i++) {
    const th = 2 * Math.PI * i / nU
    const du = [R * Math.cos(phiIn) * Math.cos(th), -H * Math.sin(phiIn), R * Math.cos(phiIn) * Math.sin(th)]
    const L = Math.hypot(du[0], du[1], du[2])
    const rn = [-du[0] / L, -du[1] / L, -du[2] / L]
    const P = shellMid(th, phiIn), N = shellNrm(th, phiIn)
    push([P[0] - N[0] * tIn, P[1] - N[1] * tIn, P[2] - N[2] * tIn], rn)
  }

  //  ── 면 ──
  const idx = []
  const O = (i, j) => j * nU + (i % nU)
  const I = (i, j) => I0 + j * nU + (i % nU)
  //  바깥면(밖을 본다): (a,b,c)+(a,c,d) with quad (i,j)(i+1,j)(i+1,j+1)(i,j+1)
  for (let j = 0; j < nV - 1; j++) for (let i = 0; i < nU; i++)
    idx.push(O(i, j), O(i + 1, j), O(i + 1, j + 1), O(i, j), O(i + 1, j + 1), O(i, j + 1))
  for (let i = 0; i < nU; i++) idx.push(O(i, nV - 1), O(i + 1, nV - 1), O_POLE)
  //  안면(방 안을 본다): 역순
  for (let j = 0; j < nV - 1; j++) for (let i = 0; i < nU; i++)
    idx.push(I(i, j), I(i + 1, j + 1), I(i + 1, j), I(i, j), I(i, j + 1), I(i + 1, j + 1))
  for (let i = 0; i < nU; i++) idx.push(I(i, nV - 1), I_POLE, I(i + 1, nV - 1))
  //  림(위·구멍축 쪽을 본다): [rimI(i), rimI(i+1), rimO(i+1), rimO(i)]
  for (let i = 0; i < nU; i++) {
    const a = RIM_I + i, b = RIM_I + (i + 1) % nU, c = RIM_O + (i + 1) % nU, d = RIM_O + i
    idx.push(a, b, c, a, c, d)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.setIndex(idx)
  return g
}
