// ════════════════════════════════════════════════════════════════════════════
//  terraceGeometry.js — ★85 테라스(1p12~15의 집)의 기하 정본  (2026.07.29 · 덩어리 블록아웃)
// ════════════════════════════════════════════════════════════════════════════
//  좌표계 = **상부 여정 그룹 로컬**(App `<group rotation-y={-RIB_DEST_PHI}>` 안). 월드 = 로컬 +10°.
//
//  형태 = 환형 부채꼴 **슬래브 하나**(현도 2026.07.29 지시):
//   · 바깥 림 `TR_ROUT` = 나팔 아가리 두 모서리를 꿰는 호 — "끝에 딱 맞게"
//   · 방위 `TR_AZ0`(−10° = 리브 #0 반지름선) ~ `TR_AZ1`(아가리 먼 모서리)
//   · 안쪽 림 `TR_RIN` = 구 링 그대로 129.6
//   · 두께 `TERRACE_T` 1.50 — 구 '두께 0 링 한 장'(판떼기)의 교체
//  수치의 근거·유도는 전부 constants.js ★85 블록 머리에 있다. 여기는 그리기만 한다.
//
//  ⚠법선은 **명시**한다(computeVertexNormals 금지 — ★57 '각진 연필' 전례).
//   윗·밑면 = ±y · 두 림 = 반경(호를 따라 매끄럽게) · 두 끝캡 = 그 방위의 접선.
//   즉 **모서리 넷에서 각지고, 스윕 방향으로만 매끄럽다**(exitFlareGeometry와 같은 규칙).
import * as THREE from 'three'
import { TR_RIN, TR_ROUT, TR_AZ0, TR_AZ1, TR_Y, TERRACE_T, TR_SEG, terraceMouth } from './constants.js'

//  ── 스펙(검사·웨이포인트 공용 — 사본 금지) ────────────────────────────────
export function terraceSpec () {
  const m = terraceMouth()
  const span = TR_AZ1 - TR_AZ0
  return {
    rIn: TR_RIN, rOut: TR_ROUT, az0: TR_AZ0, az1: TR_AZ1, span,
    yTop: TR_Y, yBot: TR_Y - TERRACE_T, t: TERRACE_T,
    width: TR_ROUT - TR_RIN,                       // 12.94 — 아가리에서 안쪽 림까지 걷는 거리
    arcOut: TR_ROUT * span, arcIn: TR_RIN * span,  // 103.4 / 94.0
    seg: TR_SEG,
    mouth: m,
    crescent: m.rOut - m.ctrR,                     // 1.410 — 문턱 현과 바깥 호 사이(가운데 최대)
  }
}

//  ── 부채꼴 위의 한 점(윗면) — 웨이포인트·검사가 쓰는 유일한 좌표 생성기 ──
//  fr = 반경 보간(0 = 안쪽 림 · 1 = 바깥 림) · fa = 방위 보간(0 = 리브 #0 선 · 1 = 아가리 끝)
export function terracePoint (fr, fa) {
  const r = TR_RIN + (TR_ROUT - TR_RIN) * fr
  const a = TR_AZ0 + (TR_AZ1 - TR_AZ0) * fa
  return { x: r * Math.cos(a), z: r * Math.sin(a), y: TR_Y, r, az: a }
}

//  ── 슬래브 ────────────────────────────────────────────────────────────────
export function buildTerrace () {
  const P = [], N = []
  //  A,B,C,D = 면을 한 바퀴 도는 네 점 · nA~nD = 각 점의 법선. 감김은 법선에 맞춰 자동 교정한다.
  const quad = (A, B, C, D, nA, nB, nC, nD) => {
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
    const e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const cx = e1[1] * e2[2] - e1[2] * e2[1]
    const cy = e1[2] * e2[0] - e1[0] * e2[2]
    const cz = e1[0] * e2[1] - e1[1] * e2[0]
    const nm = [(nA[0] + nC[0]) / 2, (nA[1] + nC[1]) / 2, (nA[2] + nC[2]) / 2]
    const flip = (cx * nm[0] + cy * nm[1] + cz * nm[2]) < 0
    const tri = flip ? [[A, nA], [D, nD], [C, nC], [A, nA], [C, nC], [B, nB]]
                     : [[A, nA], [B, nB], [C, nC], [A, nA], [C, nC], [D, nD]]
    for (const [p, n] of tri) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]) }
  }

  const yT = TR_Y, yB = TR_Y - TERRACE_T
  const UP = [0, 1, 0], DN = [0, -1, 0]
  const at = (r, a, y) => [r * Math.cos(a), y, r * Math.sin(a)]
  const rad = (a) => [Math.cos(a), 0, Math.sin(a)]          // 바깥 향 반경 단위
  const azOf = (i) => TR_AZ0 + (TR_AZ1 - TR_AZ0) * i / TR_SEG

  for (let i = 0; i < TR_SEG; i++) {
    const a0 = azOf(i), a1 = azOf(i + 1)
    const r0o = rad(a0), r1o = rad(a1)
    const r0i = [-r0o[0], 0, -r0o[2]], r1i = [-r1o[0], 0, -r1o[2]]

    // 윗면(밟는 면) · 밑면
    quad(at(TR_RIN, a0, yT), at(TR_ROUT, a0, yT), at(TR_ROUT, a1, yT), at(TR_RIN, a1, yT), UP, UP, UP, UP)
    quad(at(TR_RIN, a0, yB), at(TR_ROUT, a0, yB), at(TR_ROUT, a1, yB), at(TR_RIN, a1, yB), DN, DN, DN, DN)
    // 바깥 림(아가리가 닿는 쪽) · 안쪽 림 — 호를 따라 매끄럽게
    quad(at(TR_ROUT, a0, yB), at(TR_ROUT, a0, yT), at(TR_ROUT, a1, yT), at(TR_ROUT, a1, yB), r0o, r0o, r1o, r1o)
    quad(at(TR_RIN, a0, yB), at(TR_RIN, a0, yT), at(TR_RIN, a1, yT), at(TR_RIN, a1, yB), r0i, r0i, r1i, r1i)
  }
  //  끝캡 둘 — 방위 평면. 법선 = 그 방위의 접선(부채꼴 바깥 향).
  for (const [a, sg] of [[TR_AZ0, -1], [TR_AZ1, 1]]) {
    const t = [-Math.sin(a) * sg, 0, Math.cos(a) * sg]
    quad(at(TR_RIN, a, yB), at(TR_ROUT, a, yB), at(TR_ROUT, a, yT), at(TR_RIN, a, yT), t, t, t, t)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  g.computeBoundingSphere()
  return g
}
