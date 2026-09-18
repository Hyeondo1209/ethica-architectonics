// lampRootGeometry.js — ★★★221 회랑 등불 **뿌리 목**(2026.09.14 · 현도 스케치 09.13)
//  "리브 자체가 유기적으로 뿌리처럼 내려와 조명이 된다." 관(LampRod)은 곧게 그대로 두고, 리브 밑면에서 관으로
//  수렴하는 **회전-변형 셸** 한 장을 얹는다(리브 정점 무변 = LOCKED 리브 형태 불침범).
//
//  기하(등불 로컬 · 관 축 = y · 관 축이 (0,·,0)):
//   · 둘레각 θ마다 모선(母線) 하나. 모선의 **위끝 = 리브 표면**(그 θ에서 반경 LR_R0인 점의 리브 밑면 높이 yTop(θ)),
//     **아래끝 = 공통 높이 yEnd** = LAMP_ENTRY_Y − LR_LEN, 반경 = LAMP_TUBE_R + LR_FUSE.
//   · 반경 프로파일 r(t) = rEnd + (LR_R0 − rEnd)·(1−t)^LR_POW  (t: 위 0 → 아래 1) — 아래끝에서 기울기 0 = 관에 접선 수렴,
//     위끝에서는 벌어진 채 리브 표면에 박힌다(뿌리가 흙에서 솟는 모양).
//   · 리브가 42° 기울어 있으므로 yTop(θ)는 θ에 따라 4m 가까이 다르다 → 예각 쪽 모선이 길다 = **스케치의 긴 꼬리**(현도: 의도).
//   · 위끝을 LR_LAP만큼 리브 속으로 더 밀어 넣어 표면 틈을 봉인한다(규율 6 · 리브는 불투명 솔리드).
//  ⚠리브 밑면 높이는 constants.rOf/H(리브 중심선)로 잰다 — check_lamps와 같은 방법(사본 아님: 같은 함수).
import * as THREE from 'three'
import { rOf, H, SHELL_RIB_R, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LR_ON, LR_R0, LR_POW, LR_LEN, LR_LAP, LR_FUSE, LR_SEG, LR_RM10_R0K, LR_RM10_LENK, LR_RM10_POW } from './constants.js'

//  리브 중심선까지 최단거리 — 리브 로컬 평면(반경 pr, 높이 py) + 평면 밖 오프셋 pz(작다).
function distToCenterline(pr, py, pz) {
  let best = 1e9
  const u0 = Math.max(0, (py - 12) / H), u1 = Math.min(0.5, (py + 12) / H)   // 리브 반경 6 · 기울기 42° → ±12m 창이면 충분(★221 실측: 전 구간 창과 동일 값)
  for (let i = 0; i <= 600; i++) {
    const u = u0 + (u1 - u0) * i / 600
    const d = Math.hypot(rOf(u) - pr, H * u - py, pz)
    if (d < best) best = d
  }
  return best
}
//  (pr, pz)에서 위로 올라가다 처음 리브 살에 닿는 높이 = 리브 **밑면**.
export function ribUndersideY(pr, pz, y0 = LAMP_ENTRY_Y - 8, y1 = LAMP_ENTRY_Y + 12) {
  let lo = null
  for (let y = y0; y <= y1; y += 0.05) { if (distToCenterline(pr, y, pz) <= SHELL_RIB_R) { lo = y; break } }
  if (lo === null) return null
  let a = lo - 0.05, b = lo                           // 이분법으로 0.001까지
  for (let k = 0; k < 8; k++) { const m = (a + b) / 2; if (distToCenterline(pr, m, pz) <= SHELL_RIB_R) b = m; else a = m }
  return b
}

//  ★221-c 변형 계수 {r0K, lenK}: 회랑 등불 = {1,1} · 등불 방 = constants.LR_RM10_*. 스펙은 계수별로 한 번만 잰다(캐시).
const _specs = new Map()
export function lampRootSpec(r0K = 1, lenK = 1) {
  const key = r0K + '|' + lenK
  if (_specs.has(key)) return _specs.get(key)
  const r0 = LR_R0 * r0K
  const rEnd = LAMP_TUBE_R + LR_FUSE, yEnd = LAMP_ENTRY_Y - LR_LEN * lenK
  const tops = []
  for (let i = 0; i < LR_SEG; i++) {
    const th = i / LR_SEG * Math.PI * 2
    const px = LAMP_R + Math.cos(th) * r0, pz = Math.sin(th) * r0
    tops.push(ribUndersideY(px, pz))
  }
  const spec = { rEnd, yEnd, tops, r0 }
  _specs.set(key, spec)
  return spec
}

//  등불 로컬(관 축 원점 · 월드 y) 기하 — Dome.jsx의 <group position=[LAMP_R,0,0]> 안에 그대로 얹는다.
export function buildLampRoot(r0K = 1, lenK = 1, pow = LR_POW) {
  if (!LR_ON) return null
  const S = lampRootSpec(r0K, lenK)
  const N = LR_SEG, M = 16
  const pos = [], nrm = []
  const P = (i, j) => {                       // i: 둘레, j: 모선(0 위끝 → M 아래끝)
    const th = (i % N) / N * Math.PI * 2, c = Math.cos(th), s = Math.sin(th)
    const t = j / M
    const yTop = S.tops[i % N] + LR_LAP, y = yTop + (S.yEnd - yTop) * t
    const r = S.rEnd + (S.r0 - S.rEnd) * Math.pow(1 - t, pow)
    return [c * r, y, s * r]
  }
  const push = (a, b, c) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
    const l = Math.hypot(...n) || 1
    for (const v of [a, c, b]) { pos.push(...v); nrm.push(-n[0] / l, -n[1] / l, -n[2] / l) }   // ★부호부피 실측으로 감김 확정(+)
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1)
    push(a, c, b); push(a, d, c)                 // 바깥을 향하는 감김(밖에서 볼 때 반시계)
  }
  //  위 뚜껑(리브 속에 묻힘 · 솔리드로 읽히게) + 아래 뚜껑(관이 지나가는 고리 — 관 반경까지 뚫린 링)
  const topC = [0, Math.max(...S.tops) + LR_LAP, 0]
  for (let i = 0; i < N; i++) push(P(i, 0), P(i + 1, 0), topC)
  for (let i = 0; i < N; i++) {
    const a = P(i, M), b = P(i + 1, M)
    const th0 = i / N * Math.PI * 2, th1 = ((i + 1) % N) / N * Math.PI * 2   // 모듈로: 마지막 조각이 첫 정점과 비트 동일(열린 에지 방지)
    const ai = [Math.cos(th0) * LAMP_TUBE_R, S.yEnd, Math.sin(th0) * LAMP_TUBE_R], bi = [Math.cos(th1) * LAMP_TUBE_R, S.yEnd, Math.sin(th1) * LAMP_TUBE_R]
    push(a, ai, b); push(b, ai, bi)              // 아래를 향하는 링
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  g.computeVertexNormals()                      // 면 법선 → 정점 평균은 안 됨(non-indexed) — 셸은 매끈해야 하므로 아래서 다시 편다
  smoothShellNormals(g, N, M, S, pow)
  return g
}
//  셸 부분(앞 N·M·6 정점)의 법선을 해석적으로 편다: 인접 모선·둘레 방향 접선의 외적. 뚜껑은 면 법선 유지.
function smoothShellNormals(g, N, M, S, pow) {
  const posA = g.attributes.position, nrmA = g.attributes.normal
  const cnt = N * M * 6
  for (let k = 0; k < cnt; k++) {
    const x = posA.getX(k), y = posA.getY(k), z = posA.getZ(k)
    const r = Math.hypot(x, z) || 1e-6, c = x / r, s = z / r
    //  모선 접선: 이 θ의 (yTop, yEnd)로 t 역산 → dr/dt, dy/dt
    const th = Math.atan2(z, x); let i = Math.round(((th < 0 ? th + Math.PI * 2 : th) / (Math.PI * 2)) * N) % N
    const yTop = S.tops[i] + LR_LAP, dy = S.yEnd - yTop
    const t = Math.max(0, Math.min(1, (y - yTop) / dy))
    const drdt = -pow * (S.r0 - S.rEnd) * Math.pow(Math.max(1e-6, 1 - t), pow - 1)
    //  접선 벡터 T_t = (c·drdt, dy, s·drdt), T_θ = (−s, 0, c) → 법선 = T_θ × T_t (밖으로)
    const nx = c * dy, ny = -drdt, nz = s * dy
    const sign = (c * nx + s * nz) < 0 ? -1 : 1
    const l = Math.hypot(nx, ny, nz) || 1
    nrmA.setXYZ(k, sign * nx / l, sign * ny / l, sign * nz / l)
  }
  nrmA.needsUpdate = true
}

//  ★221-d 화면 튜너 스토어(개발 도구 · 2026.09.18 현도 "화면 내에서 조절") — React 밖 잎 스토어. 등불 방 LampRoot만 구독한다.
//   값이 바뀌면 그 mesh 하나만 다시 짓는다(씬 전체 리렌더 0 — ★99/★135 원칙). 초기값 = constants LR_RM10_*.
let _tune = { r0: LR_R0 * LR_RM10_R0K, len: LR_LEN * LR_RM10_LENK, pow: LR_RM10_POW }   // 절대치(m · m · 지수)
const _subs = new Set()
//  ⚠useSyncExternalStore는 get()의 **참조 동일성**으로 변화를 판단한다 — 같은 객체를 Object.assign으로 고치면
//   구독자가 깨어나도 "안 바뀜"으로 보고 리렌더를 건너뛴다(1차 오작동: 화면 무반응). 반드시 새 객체.
export const lampRootTune = {
  get: () => _tune,
  set: (patch) => { _tune = { ..._tune, ...patch }; for (const f of _subs) f() },
  subscribe: (f) => { _subs.add(f); return () => _subs.delete(f) },
}
