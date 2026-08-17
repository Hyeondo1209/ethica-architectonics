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
  ARM13_BR_ON, ARM13_BR_S, ARM13_BR_T, ARM13_BR_HW, ARM13_BR_SEG, ARM13_BR_SEAT_N, ARM13_BR_FLOAT, ARM13_BR_EMB,
  ARM13_BR_CURV0, ARM13_BR_CURV1, ARM13_BR_T1, ARM13_BR_AZ,
} from './constants.js'
import { ascSpec } from './ascentTunnelGeometry.js'
import { linkSpec } from './linkPassageGeometry.js'   // ★139 미니 첨탑 원뿔대 좌표(사본 금지 — 정본 직결)
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


// ══════════════════════════════════════════════════════════════════════════
//  ★★★139 1p1 갈래 팔 — 몸통 중간에서 갈라져 ② 미니 첨탑 하단 원뿔대를 받친다
//   (2026.08.15 현도 확정: 분기 s50 · 원뿔대 y111→106 r4.1 · 플레어 받침 · 밑면 띄움)
//  ⚠★126 빌더와 **구조가 다르다**: 저쪽은 (s,y) 다각형 × 접선 압출이라 꽃잎 축 평면에 갇힌다.
//   첨탑은 그 평면에서 옆으로 19.15 떨어져 있으므로 갈래는 **경로 위 사각 단면 스윕**이다.
// ══════════════════════════════════════════════════════════════════════════

//  ★첨탑 중심을 꽃잎 로컬 (s, z)로 — 파생(손 좌표 0).
//   LNK 기하는 '셸0 프레임'(꽃잎이 −45°)에서 지어져 rotation-y로 k배치되고, 꽃잎 프레임도 같은 90°k로
//   함께 돈다 → 두 프레임의 차는 **항상 +45° 한 번**이다(k 무관). 그래서 회전 한 줄이면 끝난다.
export function towerLocal(S = linkSpec()) {
  const c = Math.SQRT1_2, M = S.two.M
  return [(M[0] - M[1]) * c, (M[0] + M[1]) * c]      // [s, z]
}

export function armBranchSpec() {
  const S = linkSpec()
  const [ms, mz] = towerLocal(S)
  const cone = S.two.tw.cone
  const seatY = cone ? cone.yBot : S.two.tw.yBot
  const seatR = cone ? cone.rOut : S.two.tw.rOut
  const s0 = ARM13_BR_S
  const rootY = domeY(s0) + ARM13_T                     // 몸통 윗변(파생 — s ≤ S_MERGE에서만 유효)
  const m0 = -domeDY(s0)                                // 몸통 윗변이 **안쪽으로** 오르는 기울기(접선 연속의 근거)
  const rootOK = s0 > ascSpec().s0 && s0 < ARM13_S_MERGE
  //  ★126-e 원형 클램프 파생 — 끝 모서리가 원뿔대 밑 원 위에 정확히 앉는 축방향 반길이
  const seatX = Math.sqrt(Math.max(0, seatR * seatR - ARM13_BR_HW * ARM13_BR_HW))
  //  ── ① 평면: 3차 베지어. 뿌리 접선 = **몸통 축**(그래서 하나로 읽힌다) · 도착 접선 = 현 방향 ──
  const P0 = [s0, 0], P3 = [ms, mz]
  const t0 = [-1, 0]                                     // 몸통 축 안쪽
  //  ★139-c 도착 방위 = 현 방향에서 ARM13_BR_AZ만큼 회전. 갈래가 첨탑을 **감아 돌며** 붙는다.
  const aw = Math.atan2(P3[1] - P0[1], P3[0] - P0[0]) + ARM13_BR_AZ * Math.PI / 180
  const t1 = [Math.cos(aw), Math.sin(aw)]
  //  ⚠받침은 **직선·평평**해야 원뿔대 밑 원이 정확히 앉는다(곡선 위에 얹으면 ★126-e 내접이 깨진다).
  //   그래서 곡선은 첨탑 중심이 아니라 **중심 − seatX**에서 끝나고, 거기서부터 2·seatX가 직선 받침이다.
  const Pm = [P3[0] - t1[0] * seatX, P3[1] - t1[1] * seatX]
  //  ⚠손잡이의 기준 '현'은 **곡선 자신의 현**(P0→Pm)이다. 첨탑 중심까지의 현을 쓰면 받침 길이만큼
  //   손잡이가 과장돼 곡률이 뒤집힌다(실측: 최소 곡률반경 6.1 → 3.93 · 변곡 발생).
  const ch = Math.hypot(Pm[0] - P0[0], Pm[1] - P0[1])
  const B1 = [P0[0] + t0[0] * ARM13_BR_CURV0 * ch, P0[1] + t0[1] * ARM13_BR_CURV0 * ch]
  const B2 = [Pm[0] - t1[0] * ARM13_BR_CURV1 * ch, Pm[1] - t1[1] * ARM13_BR_CURV1 * ch]
  const bez = (t) => { const u = 1 - t
    return [u*u*u*P0[0] + 3*u*u*t*B1[0] + 3*u*t*t*B2[0] + t*t*t*Pm[0],
            u*u*u*P0[1] + 3*u*u*t*B1[1] + 3*u*t*t*B2[1] + t*t*t*Pm[1]] }
  const bezD = (t) => { const u = 1 - t
    return [3*(u*u*(B1[0]-P0[0]) + 2*u*t*(B2[0]-B1[0]) + t*t*(Pm[0]-B2[0])),
            3*(u*u*(B1[1]-P0[1]) + 2*u*t*(B2[1]-B1[1]) + t*t*(Pm[1]-B2[1]))] }
  //  호길이 표(누적) — ★137-b 교훈: 높이는 인덱스 비가 아니라 **호길이**로 매긴다
  const NA = 600, ts = [0], as = [0]
  let acc = 0, prevP = bez(0), minR = Infinity, rev = false, sgn = 0
  for (let i = 1; i <= NA; i++) {
    const t = i / NA, p = bez(t)
    acc += Math.hypot(p[0] - prevP[0], p[1] - prevP[1]); prevP = p
    ts.push(t); as.push(acc)
    const d = bezD(t), e = [6*((1-t)*(B2[0]-2*B1[0]+P0[0]) + t*(Pm[0]-2*B2[0]+B1[0])),
                            6*((1-t)*(B2[1]-2*B1[1]+P0[1]) + t*(Pm[1]-2*B2[1]+B1[1]))]
    const cr = d[0]*e[1] - d[1]*e[0], sp = Math.hypot(d[0], d[1])
    if (Math.abs(cr) > 1e-9) { minR = Math.min(minR, sp*sp*sp/Math.abs(cr))
      if (sgn === 0) sgn = Math.sign(cr); else if (Math.sign(cr) !== sgn) rev = true }
  }
  const Lc = acc                                          // 곡선 호길이
  const Lseat = 2 * seatX
  const uSeat0 = Lc, uEnd = Lc + Lseat, uMid = Lc + seatX // 첨탑 중심의 호좌표
  const tOfU = (u) => { if (u <= 0) return 0; if (u >= Lc) return 1
    let lo = 0, hi = NA
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (as[m] < u) lo = m; else hi = m }
    const f = (u - as[lo]) / Math.max(1e-12, as[hi] - as[lo]); return ts[lo] + (ts[hi] - ts[lo]) * f }
  //  ── ② 세로: 두 접선 조건 아치(★136-c·★137과 같은 계열) — 표본 의존 0의 닫힌 식 ──
  //   뿌리 접선 y = rootY + m0·u · 받침 접선 y = seatY → 제어점 C = (xC, seatY), xC = (seatY − rootY)/m0.
  //   2차 베지어 x(t) = 2(1−t)t·xC + t²·Lc 를 u에 대해 **역으로 풀어** t를 얻는다(닫힌 해).
  const xC = (seatY - rootY) / m0
  const archOK = xC > 0 && xC < Lc
  const yArch = (u) => {
    if (u >= Lc) return seatY
    if (u <= 0) return rootY + m0 * u                     // 뿌리 물림 구간 = 접선 그대로
    const A = Lc - 2 * xC
    const t = Math.abs(A) < 1e-9 ? u / (2 * xC)
            : (-xC + Math.sqrt(Math.max(0, xC * xC + A * u))) / A
    const q = 1 - t
    return seatY - q * q * (seatY - rootY)
  }
  const thAt = (u) => (u <= 0 ? ARM13_BR_T
    : ARM13_BR_T + (ARM13_BR_T1 - ARM13_BR_T) * Math.min(1, u / Lc))
  //  받침 구간만 원형 클램프(★126-e) — 그 밖은 기본 반폭
  const hwAt = (u) => { const x = u - uMid
    const q = seatR * seatR - x * x
    return (u >= uSeat0 && q > 0) ? Math.max(ARM13_BR_HW, Math.sqrt(q)) : ARM13_BR_HW }
  //  호좌표 → 꽃잎 로컬 평면 (s, z) · 진행 단위벡터
  const at = (u) => { if (u <= 0) return [P0[0] - t0[0] * (-u), P0[1] - t0[1] * (-u)]
    if (u >= Lc) return [Pm[0] + t1[0] * (u - Lc), Pm[1] + t1[1] * (u - Lc)]
    return bez(tOfU(u)) }
  const dirAt = (u) => { if (u <= 0) return t0
    if (u >= Lc) return t1
    const d = bezD(tOfU(u)), n = Math.hypot(d[0], d[1]); return [d[0] / n, d[1] / n] }
  const slopeAt = (u) => { const h = 1e-4; return Math.atan2(yArch(Math.min(Lc, u + h)) - yArch(Math.max(0, u - h)), Math.min(Lc, u + h) - Math.max(0, u - h)) * 180 / Math.PI }
  return {
    S, ms, mz, s0, rootY, m0, rootOK, seatY, seatR, seatX, xC, archOK,
    P0, P3, Pm, B1, B2, t0, t1, ch, Lc, Lseat, uSeat0, uMid, uEnd, minR, rev,
    bez, bezD, tOfU, yArch, thAt, hwAt, at, dirAt, slopeAt,
    uRoot: -ARM13_BR_EMB,
    slopeRootDeg: Math.atan(m0) * 180 / Math.PI,
    slopeMaxDeg: (() => { let m = 0; for (let i = 0; i <= 200; i++) m = Math.max(m, slopeAt(Lc * i / 200)); return m })(),
    T: ARM13_BR_T, T1: ARM13_BR_T1, hw: ARM13_BR_HW, float: ARM13_BR_FLOAT,
  }
}

//  ★갈래 스윕 — 사각 고리 단면을 **호길이** 위로 훑는다(★137-b 규율). watertight(양 끝 캡 포함).
export function buildArmBranch() {
  const B = armBranchSpec()
  const pos = []
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c) }
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const V = (s, y, z) => [s - RAD_R, y, z]
  //  스테이션: 뿌리 물림 → 곡선(SEG) → 받침(SEAT_N×2, 원형 클램프가 곡선으로 보이려면 조밀해야 한다)
  const us = [B.uRoot]
  for (let i = 0; i <= ARM13_BR_SEG; i++) us.push(B.Lc * i / ARM13_BR_SEG)
  for (let i = 1; i <= ARM13_BR_SEAT_N * 2; i++) us.push(B.Lc + B.Lseat * i / (ARM13_BR_SEAT_N * 2))
  const ring = (u) => {
    const [s, z] = B.at(u), d = B.dirAt(u), hw = B.hwAt(u), yT = B.yArch(u), th = B.thAt(u)
    const nx = -d[1], nz = d[0]
    const sL = s + nx * hw, zL = z + nz * hw, sR = s - nx * hw, zR = z - nz * hw
    //  ⚠클램프는 **모서리마다**(규율 ⑥) — 단면 중심의 r로 한 번만 재면 한쪽이 돔을 뚫는다(실측 −1.88 전례)
    const low = (ss, zz) => (B.float
      ? Math.max(yT - th, domeY(Math.hypot(ss, zz)) - ARM13_EMBED)
      : Math.min(yT - 0.2, domeY(Math.hypot(ss, zz)) - ARM13_EMBED))
    return [V(sL, yT, zL), V(sR, yT, zR), V(sR, low(sR, zR), zR), V(sL, low(sL, zL), zL)]
  }
  let prev = ring(us[0])
  //  ⚠캡 감김은 옆면의 고리 순회와 반대여야 짝이 맞는다(같은 방향이면 중복 에지 = 감김 파탄 · 실측으로 잡음)
  quad(prev[0], prev[1], prev[2], prev[3])
  for (let i = 1; i < us.length; i++) {
    const cur = ring(us[i])
    for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; quad(prev[j], cur[j], cur[j2], prev[j2]) }
    prev = cur
  }
  quad(prev[3], prev[2], prev[1], prev[0])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}


// ══════════════════════════════════════════════════════════════════════════
//  ⛔★★★142 두 번째 팔(★140) = **삭제** (2026.08.17 현도 확정 — "우선 제거하자")
//   여기 있던 `arm2Spec` · `arm2Profile` · `arm2HalfWidths` · `buildArm2` 넷과
//   ARM2_* 노브 17개가 전부 사라졌다. 소등이 아니라 삭제이므로 **부활 = 재구현**이다.
//   ⚠남긴 것: `towerLocal()` — ★139 갈래(보존계)가 아직 쓴다. 지우면 갈래가 죽는다.
//   ★미니 첨탑 하단 원뿔대는 받침 없이 **부양**한다(현도 확정). 그 자리 돔 표면과의 허공 15.446.
// ══════════════════════════════════════════════════════════════════════════
