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
import {
  RM10_FLARE_R, RM10_FLARE_SWEEP, RM10_FLARE_C, RM10_ARC_TH1, RM10_FLARE_LEN,
  RM10_FLARE_W1, RM10_FLARE_H1, RM10_FLARE_EASE, RM10_FLARE_EASE_HI, RM10_FLARE_B1_0,
  RM10_FLARE_LO_W, RM10_FLARE_LO_H, RM10_FLARE_TB, RM10_FLARE_BURST_RUN,
  RM10_FLARE_RISE, RM10_FLARE_STEPS, CL_STEP_RISE, CL_STEP_GO,
  RM10_EXIT_W, RM10_EXIT_ROOF, RM10_EXIT_FLOOR_Y, PASS_T,
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
  const NLO = 40
  for (let i = 0; i <= NLO; i++) { u = uB * i / NLO; push() }
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

function strip (A, B) {
  const n = A.length, pos = [], idx = []
  for (let i = 0; i < n; i++) pos.push(...A[i], ...B[i])
  for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

//  ── 껍질 ──────────────────────────────────────────────────────────────────
//  모서리 순서: 0 바닥+N(안) → 1 바닥−N(바깥) → 2 천장−N → 3 천장+N
//  ★바닥은 계단 프로파일을 그대로 따라 오르고, 천장은 **매끄러운 램프 + 층고**로 오른다
//   (천장까지 계단지면 머리 위가 톱니가 된다 — 건축 통례).
export function buildFlareShell () {
  const sp = stairProfile(), S = sp.samples
  const C = [[], [], [], []], E = [[], [], [], []]
  for (const smp of S) {
    const t = smp.u / RM10_FLARE_LEN
    const p = flarePoint(RM10_FLARE_SWEEP * t), sec = flareSection(t)
    const yRoof = floorSmooth(t) + sec.h
    const put = (arr, off, y) => arr.push([p.x + off * p.nx, y, p.z + off * p.nz])
    put(C[0],  sec.a0, smp.y);      put(C[1], -sec.b0, smp.y)
    put(C[2], -sec.b1, yRoof);      put(C[3],  sec.a1, yRoof)
    put(E[0],  sec.a0 + PASS_T, smp.y - PASS_T);  put(E[1], -(sec.b0 + PASS_T), smp.y - PASS_T)
    put(E[2], -(sec.b1 + PASS_T), yRoof + PASS_T); put(E[3], sec.a1 + PASS_T, yRoof + PASS_T)
  }
  const out = []
  const face = ['floor', 'wOuter', 'roof', 'wDome']   // 1-2 = 회랑 외벽에 붙는 벽
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    out.push({ key: 'fli' + face[k], walk: k === 0, geo: strip(C[k], C[j]) })
    out.push({ key: 'fle' + face[k], walk: false,   geo: strip(E[k], E[j]) })
  }
  const N = S.length - 1
  const rc = [], re = [], sc = [], se = []
  for (let k = 0; k <= 4; k++) { const j = k % 4; rc.push(C[j][N]); re.push(E[j][N]); sc.push(C[j][0]); se.push(E[j][0]) }
  out.push({ key: 'flrim', walk: false, geo: strip(rc, re) })   // 아가리(정조준·수직 단면)
  out.push({ key: 'flcap', walk: false, geo: strip(sc, se) })   // 시작 테두리
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
