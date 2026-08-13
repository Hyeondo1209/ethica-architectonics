// armGeometry.js — ★★★126 1p3 지지 팔(2026.08.13 현도 스케치 → ★126-b 1차 판정 반영)
//  프로파일은 방사 수직면 (s, y)에서 한 다각형으로 그리고 접선 ±ARM13_HW로 압출한다.
//  s = 중심축으로부터 수평 거리(꽃잎 로컬 x = s − RAD_R). 수치 정본 = constants ARM13_*.
//  ★126-b 개정 3건(현도 1차 판정 — 로컬 캡처 2장):
//   ① 각기둥 소등(`ARM13_COL_ON=false` — "없어도 되는 부분"). 보존계: 상수·빌더 존속.
//   ② 받침 = **원반 2단**(구 직육면체 컵 폐기). 위 원반이 셸 하단을 **파고들어**(D1_TOP > 셸 밑극점)
//      받치는 마감, 아래 원반은 팔 폭(2·HW)과 지름을 맞춰 자연 연결.
//   ③ 소핏 = **한쪽 아치**. 구 판(양끝 다 아치 · 안쪽 발 꺾임 55.4°)을 폐기하고 **에르미트**로 양단
//      접선을 잇는다: 안쪽(S_IN) = 돔 윗변 접선 → 꺾임 0(현도 "C자로 이어져야") · 바깥(SOF_SOUT) =
//      터널 밑선 접선 → 두께 0으로 사라짐 = 그 바깥은 직육면체 통로만(현도 "끝부분에 아치가 없었으면").
import * as THREE from 'three'
import {
  RAD_R, ROOM_FLOOR_Y, ROOM_R, ROOM_HEIGHT, RAD_PCY, RAD_PRY, RAD_PRX,
  ARM13_HW, ARM13_T, ARM13_EMBED, ARM13_SOF_S0, ARM13_SOF_SOUT, ARM13_SOF_A, ARM13_SOF_B,
  ARM13_S_DEP, ARM13_BLADE_X,
  ARM13_D1_R, ARM13_D1_TOP, ARM13_D1_H, ARM13_D2_R, ARM13_D2_H, ARM13_DISC_SEG,
  ARM13_FLARE_ON, ARM13_FLARE_R, ARM13_FLARE_L, ARM13_SEAT_N,
  ARM13_COL_ON, ARM13_COL_W, ARM13_COL_EMB,
  ARM13_RISE_CX, ARM13_RISE_CY, ARM13_S_MERGE,
} from './constants.js'
import { ascSpec } from './ascentTunnelGeometry.js'
import { orientOutward } from './orientGeo.js'

//  방 타원구 표면 y(s) — 바깥(윗) 반구 · 도함수는 해석해(수치미분 아님)
export const domeY = (s) => ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (s / ROOM_R) ** 2))
export const domeDY = (s) => {
  const q = Math.max(1e-9, 1 - (s / ROOM_R) ** 2)
  return -ROOM_HEIGHT * s / (ROOM_R * ROOM_R * Math.sqrt(q))
}

//  상승 터널 매스 밑선 y(s) — buildAscentMass의 bot 사슬과 동일 정의
export const tunnelBotY = (s, S = ascSpec()) => {
  const yLo = S.y0 - S.massT, yHi = S.y1 - S.massT
  if (s <= S.sSt0) return yLo
  if (s >= S.sSt1) return yHi
  return yLo + (yHi - yLo) * (s - S.sSt0) / (S.sSt1 - S.sSt0)
}
export const tunnelBotDY = (s, S = ascSpec()) =>
  (s <= S.sSt0 || s >= S.sSt1) ? 0 : (S.y1 - S.y0) / (S.sSt1 - S.sSt0)

//  ★프로파일 스펙 — 검사와 빌더가 같은 함수를 부른다(단일 진실)
export function armSpec() {
  const S = ascSpec()
  const shellBot = RAD_PCY - RAD_PRY                      // 셸 밑극점 y(= 91.5)
  const d1Top = ARM13_D1_TOP
  const d1Bot = d1Top - ARM13_D1_H
  const d2Bot = d1Bot - ARM13_D2_H                        // 아래 원반 밑 = 팔 끝이 붙는 레벨
  const colTop = d2Bot + 0.2                              // (보존) 각기둥
  const colBot = domeY(RAD_R) - ARM13_COL_EMB
  //  ★★소핏 = **되말리는 갈고리**(3차 Bézier). 현도가 캡처에 그린 빨간 선의 역투영 적합(RMS 0.485).
  //  ⚠s에 대해 단일값이 아니다 — 안쪽으로 감겼다가 되나온다. 그래서 y(s) 함수가 아니라 t 매개다.
  //   t=0 = 돔 착지(접선 = 돔 윗변, s 감소 방향) · t=1 = 터널 합류(접선 = 터널 밑선, s 증가 방향).
  const sofA = [ARM13_SOF_S0, domeY(ARM13_SOF_S0) + ARM13_T]     // 착지단
  const sofB = [ARM13_SOF_SOUT, tunnelBotY(ARM13_SOF_SOUT, S)]   // 터널단
  const nD = Math.hypot(1, domeDY(ARM13_SOF_S0))
  const dTan = [-1 / nD, -domeDY(ARM13_SOF_S0) / nD]              // 돔 윗변 접선(s 감소 쪽 단위)
  const kT = tunnelBotDY(ARM13_SOF_SOUT, S), nT = Math.hypot(1, kT)
  const tTan = [1 / nT, kT / nT]                                  // 터널 밑선 접선(s 증가 쪽 단위)
  const cp1 = [sofA[0] + ARM13_SOF_A * dTan[0], sofA[1] + ARM13_SOF_A * dTan[1]]
  const cp2 = [sofB[0] - ARM13_SOF_B * tTan[0], sofB[1] - ARM13_SOF_B * tTan[1]]
  const soffitAt = (t) => {
    const u = 1 - t
    return [u*u*u*sofA[0] + 3*u*u*t*cp1[0] + 3*u*t*t*cp2[0] + t*t*t*sofB[0],
            u*u*u*sofA[1] + 3*u*u*t*cp1[1] + 3*u*t*t*cp2[1] + t*t*t*sofB[1]]
  }
  //  ★소핏이 터널 밑선을 넘는 지점 t*(파생) — 프로파일은 여기서 끊는다.
  //   넘지 않으면 t*=1(끝까지 사용). 이분법 40회 = Float32 정밀도 이하.
  const gap = (t) => { const [s, y] = soffitAt(t); return tunnelBotY(s, S) - y }
  //  ⚠교차가 **둘**일 수 있다(넘어갔다 되돌아와 끝점에서 다시 만남) → 끝점만 보면 놓친다.
  //   조밀 스캔으로 **첫** 부호 변화를 잡고 그 구간에서만 이분법(★119 이분법 규율과 같은 계열).
  let tCut = 1
  const NS = 512
  for (let i = 1; i <= NS; i++) {
    const a = (i - 1) / NS, b = i / NS
    if (gap(a) > 0 && gap(b) <= 0) {
      let lo = a, hi = b
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (gap(m) > 0) lo = m; else hi = m }
      tCut = (lo + hi) / 2
      break
    }
  }
  const sofCut = soffitAt(tCut)
  //  ★126-e 받침 반폭(파생 — 노브 아님): 밑변 끝점이 원반 원 **위에** 정확히 앉으려면
  //   x² + HW² = FLARE_R² 이어야 한다(끝점의 반폭은 HW 하한에 걸리므로). ⚠반경을 바로 쓰면 √(R²+HW²)로
  //   삐져나온다(실측 0.28). 날 꼭대기·안 모서리 x는 여기서 나온다.
  //  ★126-f: 클램프 원 = FLARE_R(≤ D2_R) — 받침이 원반 **안쪽**에 들어가고 원반이 챙처럼 덮는다.
  const seatX = Math.sqrt(Math.max(0, ARM13_FLARE_R * ARM13_FLARE_R - ARM13_HW * ARM13_HW))
  //  안 모서리 아치(받침): 아래 원반 밑 → 돔 구간 윗변 합류, 2차 Bézier
  const riseP0 = [RAD_R - seatX, d2Bot]
  const riseP2 = [ARM13_S_MERGE, domeY(ARM13_S_MERGE) + ARM13_T]
  const riseC = [ARM13_RISE_CX, ARM13_RISE_CY]
  const riseAt = (t) => [
    (1 - t) * (1 - t) * riseP0[0] + 2 * (1 - t) * t * riseC[0] + t * t * riseP2[0],
    (1 - t) * (1 - t) * riseP0[1] + 2 * (1 - t) * t * riseC[1] + t * t * riseP2[1],
  ]
  return {
    S, shellBot, d1Top, d1Bot, d2Bot, colTop, colBot,
    sofA, sofB, soffitAt, tCut, sofCut, cp1, cp2, dTan, tTan, riseP0, riseP2, riseC, riseAt,
    bladeFoot: [ARM13_S_DEP, domeY(ARM13_S_DEP) - ARM13_EMBED],
    bladeTop: [RAD_R + seatX, d2Bot],
    seatX,
    shellR: (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2)),
  }
}

//  프로파일 다각형(한 바퀴 — 자기교차 없음은 ★126 검사가 잠근다)
export function armProfile() {
  const A = armSpec()
  const P = []
  //  ⓐ 윗변 = 터널 밑선(바깥 SOF_SOUT → 안쪽 s0). 그 바깥은 두께 0 = 직육면체 통로만.
  P.push([A.sofCut[0], A.sofCut[1]])                      // 소핏 ↔ 터널 밑선 교차(파생)
  if (A.S.sSt0 > A.S.s0 && A.S.sSt0 < A.sofCut[0]) P.push([A.S.sSt0, tunnelBotY(A.S.sSt0, A.S)])
  P.push([A.S.s0, tunnelBotY(A.S.s0, A.S)])
  //  ⓑ 디스크 끝면(수직) → 돔 융합 밑변(표면 − EMBED)
  P.push([A.S.s0, domeY(A.S.s0) - ARM13_EMBED])
  for (let i = 1; i <= 14; i++) {
    const s = A.S.s0 + (ARM13_S_DEP - A.S.s0) * i / 14
    P.push([s, domeY(s) - ARM13_EMBED])
  }
  //  ⓒ 날(직선 — 중간점 없음) → **받침 밑변**(원형 클램프가 곡선을 그리려면 중간 정점이 필요)
  P.push(A.bladeTop)
  for (let i = 1; i < ARM13_SEAT_N; i++) {
    const x = A.bladeTop[0] + (A.riseP0[0] - A.bladeTop[0]) * i / ARM13_SEAT_N
    P.push([x, A.d2Bot])
  }
  P.push([A.riseP0[0], A.riseP0[1]])
  //  ⓓ 안 모서리 아치(Bézier) → 합류점
  for (let i = 1; i <= 10; i++) P.push(A.riseAt(i / 10))
  //  ⓔ 돔 구간 윗변(표면 + T): S_MERGE → SOF_S0(소핏 착지점). 그 안쪽(s0~SOF_S0)은 매스가 꽉 찬다.
  for (let i = 1; i <= 12; i++) {
    const s = ARM13_S_MERGE + (ARM13_SOF_S0 - ARM13_S_MERGE) * i / 12
    P.push([s, domeY(s) + ARM13_T])
  }
  //  ⓕ 소핏 갈고리(3차 Bézier): 착지 → 되말림 → 터널 합류. 끝점은 ⓐ 시작과 같으므로 생략(폐합)
  for (let i = 1; i < 28; i++) P.push(A.soffitAt(A.tCut * i / 28))
  return P
}

//  ★126-d 점별 압출 반폭: 받침(아래 원반 밑면 레벨)에서 D2_R까지 벌어져 원반을 **면으로** 받는다.
//   기준점 = 프로파일에서 y가 d2Bot인 두 점(날 꼭대기·안 모서리). 거기서 곡선 길이 FLARE_L 안에서 smoothstep.
export function armHalfWidths(P = armProfile(), A = armSpec()) {
  const n = P.length
  if (!ARM13_FLARE_ON) return new Array(n).fill(ARM13_HW)
  //  받침 정점 집합(= d2Bot 레벨)
  const seeds = []
  for (let i = 0; i < n; i++) if (Math.abs(P[i][1] - A.d2Bot) < 1e-9) seeds.push(i)
  //  둘레를 따라 최단 곡선 거리(양방향 완화 — 폐곡선이라 두 바퀴면 수렴)
  const D = new Array(n).fill(Infinity)
  for (const i of seeds) D[i] = 0
  const seg = (i) => Math.hypot(P[(i + 1) % n][0] - P[i][0], P[(i + 1) % n][1] - P[i][1])
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; D[j] = Math.min(D[j], D[i] + seg(i)) }
    for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n; D[i] = Math.min(D[i], D[j] + seg(i)) }
  }
  //  ★126-e 원형 클램프: 벌어진 폭은 아래 원반 원 **안에 내접**한다(사각 단면이 원판 밖으로 나오면 어색 — 현도).
  //   반현 √(D2_R²−x²)가 상한이고, 원 밖(|x| ≥ D2_R)에서는 기본 폭 HW로 떨어진다(연속).
  const chord = (s) => {
    const x = s - RAD_R
    const q = ARM13_FLARE_R * ARM13_FLARE_R - x * x
    return q > 0 ? Math.max(ARM13_HW, Math.sqrt(q)) : ARM13_HW
  }
  return D.map((d, i) => {
    const u = Math.min(1, Math.max(0, 1 - d / ARM13_FLARE_L))
    const sm = u * u * (3 - 2 * u)                           // smoothstep — 어깨가 부드럽게 벌어진다
    const target = chord(P[i][0])
    return ARM13_HW + (target - ARM13_HW) * sm
  })
}

export function buildArm13() {
  const A = armSpec()
  const P = armProfile()
  const HWs = armHalfWidths(P, A)
  const pos = []
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c) }
  const V = (q, w) => [q[0] - RAD_R, q[1], w]
  const faces = THREE.ShapeUtils.triangulateShape(P.map(q => new THREE.Vector2(q[0], q[1])), [])
  for (const [i, j, k] of faces) {
    tri(V(P[i], HWs[i]), V(P[j], HWs[j]), V(P[k], HWs[k]))
    tri(V(P[k], -HWs[k]), V(P[j], -HWs[j]), V(P[i], -HWs[i]))
  }
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length
    tri(V(P[i], HWs[i]), V(P[i], -HWs[i]), V(P[j], -HWs[j]))
    tri(V(P[i], HWs[i]), V(P[j], -HWs[j]), V(P[j], HWs[j]))
  }
  //  ★원반 2단(회전체 — 축 = 셸 밑극점 로컬 x0)
  const disc = (r, y0, y1) => {
    const N = ARM13_DISC_SEG
    for (let i = 0; i < N; i++) {
      const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2
      const p = (a, y) => [r * Math.cos(a), y, r * Math.sin(a)]
      tri(p(a0, y1), p(a1, y1), [0, y1, 0])
      tri([0, y0, 0], p(a1, y0), p(a0, y0))
      tri(p(a0, y0), p(a1, y0), p(a1, y1))
      tri(p(a0, y0), p(a1, y1), p(a0, y1))
    }
  }
  disc(ARM13_D1_R, A.d1Bot, A.d1Top)
  disc(ARM13_D2_R, A.d2Bot, A.d1Bot)
  //  (보존계) 각기둥 — ARM13_COL_ON으로 한 줄 복귀
  if (ARM13_COL_ON) {
    const h = ARM13_COL_W / 2, y0 = A.colBot, y1 = A.colTop
    const c = [[-h, y0, -h], [h, y0, -h], [h, y0, h], [-h, y0, h], [-h, y1, -h], [h, y1, -h], [h, y1, h], [-h, y1, h]]
    for (const [a, b, c2, d] of [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]]) {
      tri(c[a], c[b], c[c2]); tri(c[a], c[c2], c[d])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}
