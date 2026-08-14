// extSpiralGeometry.js — ★★★122 셸 외부 나선 계단 (2026.08.12 현도 그림)
//  "셸 안이 아니라 밖 — 셸을 감는 나선 통로. 접면은 넓은 창으로 뚫어 내부를 보고,
//   끝은 (접선 문을 거쳐) 방 바닥으로." — 현도, 찬디가르 급수탑 사진과 함께.
//  단일 유도점 규약(★118): 모든 수치는 extSpiralSpec()에서 나온다. Radial.jsx가 그리고
//  check_radial.mjs가 같은 유도를 잰다. 사본 금지.
//  좌표 = 꽃잎 로컬(+x 방사 바깥, 원점 = 꽃잎 중심). 4방 등형은 꽃잎 group 회전이 처리.
import * as THREE from 'three'
import {
  RAD_PRX, RAD_PRY, RAD_PCY, RAD_R, RAD_DOOR_HW,
  RAD_FLOOR_Y, COR_THICK, RAD_ASC_RISE_SEED,
  RAD_CYL_R, RAD_CYL_Y0,
  RSP_ON, RSP_K, RSP_DIR, RSP_W, RSP_BITE, RSP_MASS_T,
  RSP_PARA_H, RSP_PARA_T, RSP_WIN_SILL, RSP_WIN_TOP, RSP_WIN_MARG,
  RSP_ENCL, RSP_CLR, RSP_WALL_T, RSP_LAND_MARG, RSP_BRIDGE_R, RSP_WFR_T, RSP_WFR_D, RSP_WFR_IN,
  RSP_CLEAR, RSP_SKIRT_H, RSP_SKIRT_D, RSP_SKIRT_IN, RSP_SKIRT_BACK, ASC_JUNC_HW, RSP_BR_BITE, RSP_BR_IN, RSP_LAND_BITE,
  RSP_WIN_ON, RSP_WIN_LOW_ON, RSP_WFR_JAMB_DR,
  LNK_ON, LNK_OPEN_SPIRAL, LNK_DOOR_ON, LNK_PHI,   // ★130-f~g 참 종단 캡 = 접속 통로의 문
} from './constants.js'
import { ascSpec } from './ascentTunnelGeometry.js'
import { orientOutward } from './orientGeo.js'   // ★122-d 감김 자동 정렬

//  셸 외면 반경(계란 자오선) — Radial.jsx petalR과 같은 식(로컬 y)
const shellR = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))

//  ★126: opts.noCyl = 1p3 팔 세계 — ★91 원기둥이 없다. 하반부 안쪽 벽 = 셸 곡면 그대로,
//  하반부 창(★123 이중벽 포탈)은 성립 불가 → 소등(이설 = 선언된 빚, 현도 캡처 판정 후).
export function extSpiralSpec(opts = {}) {
  const A = ascSpec()
  const y0 = A.y1                                   // 시작 = 새 문지방(★119) 115.90
  const yEnd = RAD_FLOOR_Y + COR_THICK / 2          // 끝 = 접선 문지방 101.28
  const drop = y0 - yEnd                            // 14.62 — 상승 관 rise와 동일(같은 두 레벨)
  const N = Math.round(drop / RAD_ASC_RISE_SEED)    // 61 — 오름 61·내림 61 대칭(유도 결과)
  const rise = drop / N
  //  끝 방위 = 접선 문 중심(Radial.jsx FR_C·dc와 같은 유도 — 사본 아닌 동일 식)
  const frC = A.frC0 ?? null                        // (ascSpec에 없음 — 아래서 직접 유도)
  //  FR_C 유도: 문틀 중심의 꽃잎 중심거리 — Radial.jsx가 셸 자오선 통과 반경에서 파생.
  //  ⚠여기서는 검증된 결과값 식만 재현하면 사본이 되므로, Radial이 export한 FR_C를 쓰는 게 정본이나
  //   Radial은 React 모듈(THREE 앱 결합)이라 역참조가 무겁다 → frDoorAzimuth를 **검사가 Radial 실값과
  //   대조**하는 방식으로 잠근다(check_radial ★122 절). 여기 식은 FR_YS 스윕의 닫힌 재현.
  //  Radial.jsx L44~54와 동일 유도(잼 옆선 x=FR_OUT에서의 셸 통과 반경 — 스팬 양끝 + 팽출점):
  const FR_OUT = 2.7                                //  = RAD_T_HW(2.2) + FR_T(0.5) — Radial 값(검사가 소스 대조)
  const LIN_TOP = 106 + 0.6                         //  = RAD_TOP + 0.6 — Radial 값(동상)
  const frRW = (y) => Math.sqrt(Math.max(0.25, shellR(y) ** 2 - FR_OUT ** 2))
  const FR_YS = [yEnd, LIN_TOP, ...(RAD_PCY > yEnd && RAD_PCY < LIN_TOP ? [RAD_PCY] : [])]
  const FR_BACK = Math.min(...FR_YS.map(frRW)) - 0.25
  const FR_FRONT = Math.max(...FR_YS.map(frRW)) + 0.25
  const FR_C = (FR_FRONT + FR_BACK) / 2
  const dc = 2 * Math.asin(FR_C / (2 * RAD_R))      // 고리 각 오프셋(문틀 위치 유도 — 구 고리 정렬과 동일 식)
  const fx = RAD_R * (Math.cos(dc) - 1), fz = RAD_R * Math.sin(dc)
  //  ★122-c ⑤ 유격 정정: 착지 방위 기준 = 접선 '컷' 실기하(Radial 셸 컷: z0 = PRX−1 · xOff = R(cosφ−1)).
  //  문틀(FR_C 14.95) 기준과 0.5° 차이가 다리↔문 유격을 만들었다 — 컷이 실제 구멍이니 컷이 정본.
  const cutPhi = Math.asin((RAD_PRX - 1) / RAD_R)
  const cutX = RAD_R * (Math.cos(cutPhi) - 1), cutZ = RAD_R * Math.sin(cutPhi)
  const doorAz = Math.atan2(cutZ, cutX)             // +z 컷 중심 방위(로컬) — 착지 정렬 기준
  //  양끝 고정 스윕: phi0 = π(새 문). CCW면 끝 = −z 문(2π − doorAz), CW면 +z 문.
  const phi0 = Math.PI
  const target = RSP_DIR > 0 ? (2 * Math.PI - doorAz) : doorAz
  let sweep = RSP_DIR > 0 ? (target - phi0) : (phi0 - target)
  sweep = ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)   // 기본각(0~2π)
  sweep += (1 + RSP_K) * 2 * Math.PI                // +1바퀴 = 449.3°(≈1.25) · RSP_K로 +360°씩
  const phiEnd = phi0 + RSP_DIR * sweep
  //  안 가장자리: 상반부(y > 원기둥 상단 108.5) = 셸, 하반부 = ★91 원기둥 — 현도 ①수용
  const wallR = (y) => (opts.noCyl || y > RAD_CYL_Y0 ? shellR(y) : Math.max(shellR(y), RAD_CYL_R))
  //  ★122-c ④: 관입(−BITE) → 이격(+CLEAR) 반전 — 두께 0 셸 안쪽으로 계단 톱니 61개가 삐져나왔다
  //  (현도 실측 스크린샷). 접선 틈은 굽도리 몰딩(buildExtSpiralSkirt)이 봉합.
  //  ★★122-O: 셸 반경은 높이에 따라 변한다 — 단면을 y 하나로 잡으면 그 요소의 **아래쪽 높이**에서
  //  셸 안으로 돌출한다(방 안 찌꺼기의 본질). 요소의 세로 범위에서 **최대 wallR**을 기준으로 삼는다.
  const wallRMax = (ya, yb) => {
    let m = 0
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb)
    for (let k = 0; k <= 8; k++) m = Math.max(m, wallR(lo + (hi - lo) * k / 8))
    return m
  }
  //  ★★123: 포탈의 **먼 쪽** = 셸. 가까운 쪽(wallR)은 하반부에서 원기둥이 된다.
  //  요소의 세로 범위 최대 반경 기준(★122-O 규율)은 셸에도 그대로 적용한다.
  const shellRMax = (ya, yb) => {
    let m = 0
    const lo = Math.min(ya, yb), hi = Math.max(ya, yb)
    for (let k = 0; k <= 8; k++) m = Math.max(m, shellR(lo + (hi - lo) * k / 8))
    return m
  }
  const rIn = (y) => wallR(y) + RSP_CLEAR
  const stepY = (k) => y0 - rise * k                // 단 k 발판(k=0 = 문지방 레벨 → 마지막 단 = yEnd)
  //  ★122-b 층계참 → ★★122-e 대칭화(2026.08.12 현도 3차 "1번 여전히 이상해" 실측 결과):
  //  ⛔구 상태: 참이 문 **한쪽**(phi0−landA0 ~ phi0)만 평평하고 phi0부터 즉시 하강 —
  //   관 문이 φ0 ± 8.75°를 걸치므로 **문 폭 절반이 계단 톱니로 떨어져** 관 바닥판이 그 위에 낀다.
  //  → 참을 문 폭 **양쪽**으로 대칭 확장하고, 하강은 그 바깥(phiStep0)에서 시작한다.
  //   착지 방위(접선 문)는 불변 — 계단 구간 sweep을 landA0만큼 줄여 흡수한다.
  const landA0 = Math.asin(RAD_DOOR_HW / rIn(y0)) + RSP_LAND_MARG
  const landA1 = Math.asin(RAD_DOOR_HW / rIn(yEnd)) + RSP_LAND_MARG
  const phiL0 = phi0 - RSP_DIR * landA0              // 시작 층계참 바깥 끝(관 문 뒤쪽)
  const phiStep0 = phi0 + RSP_DIR * landA0           // ★하강 시작 = 참의 반대쪽 끝(문 폭 밖)
  const phiL1 = phiEnd + RSP_DIR * landA1            // 끝 층계참 바깥 끝
  const sweepStep = sweep - landA0                   // ★계단이 실제로 도는 각(참 몫을 뺀 나머지)
  const dphi = sweepStep / N                         // ★122-e: 계단 각 배분(참 몫 제외)
  const yAt = (phi) => y0 - drop * Math.min(1, Math.max(0, (RSP_DIR > 0 ? phi - phiStep0 : phiStep0 - phi) / sweepStep))
  return {
    y0, yEnd, drop, N, rise, phi0, phiEnd, sweep, sweepStep, dphi, dir: RSP_DIR, phiStep0,
    noCyl: !!opts.noCyl, doorAz, FR_C, dc, W: RSP_W, massT: RSP_MASS_T, wallR, rIn, yAt, stepY, shellR,
    turns: sweep / (2 * Math.PI),
    paraH: RSP_PARA_H, paraT: RSP_PARA_T,
    landA0, landA1, phiL0, phiL1, clr: RSP_CLR, wallRMax, shellRMax, wallT: RSP_WALL_T, bridgeR: RSP_BRIDGE_R,
  }
}

//  quadGeo — ascentTunnelGeometry와 동일 관례(반시계 감김·법선 자동·indexed)
function quadGeo(fill) {
  const pos = [], idx = []
  const q = (...v) => {
    const b = pos.length / 3
    for (let i = 0; i < 12; i += 3) pos.push(v[i], v[i + 1], v[i + 2])
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  fill(q)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  //  ★122-d: 감김은 빌더가 아니라 도구가 보증한다(면별 손 정렬은 새 면마다 재발했다 — 현도 ② 지적)
  return orientOutward(g)
}

//  ★계단 매스: 위면 = 61단 톱니(부채꼴 평판) · 아래면 = 나선 경사 헬리코이드 − massT(§2-D 속 찬 매스)
//  안면 = 셸/원기둥 외면 안으로 BITE 관입(비가시·틈 0) · 바깥면 = 수직.
//  ⚠감김(★121 교훈): +y에서 (cosφ, sinφ) 증가 순회 = 시계. CCW(dir=+1) 진행 시 부채꼴의
//   "진행 방향" 감김을 발산 정리(부호 부피)가 검사에서 잠근다.
export function buildExtSpiral(opts = {}) {
  if (!RSP_ON) return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  //  ★단 블록 방식(2026.08.12 매니폴드 수리 — 열린 에지 426 적발 후 재편):
  //  계란 조임 구간에서 단마다 안 반경이 변하므로, 연속 스킨은 단 경계마다 실틈을 남긴다.
  //  각 단 = 완전 밀폐 부채꼴 프리즘(위 평평 · 아래 = 그 단의 헬리코이드 − massT · 양끝 캡 전체 단면).
  //  인접 블록의 캡끼리 거의 겹침(반경 차 ~0.1) = 내부 비가시 · 발산 부피 정확 · 블록별 watertight.
  const SUB = 3
  return quadGeo((q) => {
    for (let k = 0; k < S.N; k++) {
      const yT = S.stepY(k + 1)                     // 단 위면
      //  ★122-O: 블록은 위면 yT ~ 아래면(헬리코이드−massT)까지 걸치므로 그 범위 최대 셸 반경 기준
      const ri = S.wallRMax(yT, S.yAt(S.phiStep0 + S.dir * S.dphi * (k + 1)) - S.massT) + RSP_CLEAR
      const ro = S.rIn(yT) + S.W                   // 바깥은 통로 폭 기준 불변
      const pA = S.phiStep0 + S.dir * S.dphi * k, pB = S.phiStep0 + S.dir * S.dphi * (k + 1)
      const yBot = (phi) => S.yAt(phi) - S.massT    // 아래면(헬리코이드)
      const quad = (...v) => q(...v.flat())
      for (let j = 0; j < SUB; j++) {
        const a = pA + (pB - pA) * j / SUB, b = pA + (pB - pA) * (j + 1) / SUB
        const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
        const yA = yBot(a), yB = yBot(b)
        //  ⚠감김(★121 교훈 · 부호 부피로 잠금): φ 증가(dir=+1)는 +y에서 볼 때 시계 순회 —
        //  아래 삼항의 양팔이 이미 그 반전을 담고 있다(cw=true → 역순 나열). 이중 반전 금지.
        const cw = S.dir > 0
        const T = [[ri * ca, yT, ri * sa], [ro * ca, yT, ro * sa], [ro * cb, yT, ro * sb], [ri * cb, yT, ri * sb]]
        const B = [[ri * ca, yA, ri * sa], [ro * ca, yA, ro * sa], [ro * cb, yB, ro * sb], [ri * cb, yB, ri * sb]]
        //  ⚠cw(=dir>0, φ 증가)는 +y에서 볼 때 **시계** 순회(★121) — 위면 +y 감김엔 역순이 맞다.
        quad(...(cw ? [T[3], T[2], T[1], T[0]] : [T[0], T[1], T[2], T[3]]))
        quad(...(cw ? [B[0], B[1], B[2], B[3]] : [B[3], B[2], B[1], B[0]]))
        quad(...(cw ? [T[2], B[2], B[1], T[1]] : [T[1], B[1], B[2], T[2]]))   // 바깥
        quad(...(cw ? [T[0], B[0], B[3], T[3]] : [T[3], B[3], B[0], T[0]]))   // 안
      }
      //  양끝 캡(전체 단면: yT ↔ 헬리코이드 아래) — pA 캡은 뒤(진행 반대), pB 캡은 앞
      for (const [phi, isA] of [[pA, true], [pB, false]]) {
        const c = Math.cos(phi), s2 = Math.sin(phi), yB2 = yBot(phi)
        const C = [[ri * c, yT, ri * s2], [ro * c, yT, ro * s2], [ro * c, yB2, ro * s2], [ri * c, yB2, ri * s2]]
        const fwd = (isA === (S.dir > 0))
        quad(...(fwd ? [C[1], C[0], C[3], C[2]] : [C[0], C[1], C[2], C[3]]))
      }
    }
    //  ★122-b 층계참 2(현도 ②③ — 2026.08.12 오류 보고 수리): 단 블록 어법(watertight 프리즘, 위·아래 평평).
    //  나선이 문 정중앙 방위에서 시작/종료해 문 폭 절반이 낭떠러지였다 → 양끝을 문 반각+마진 연장.
    //  시작: [phiL0, phi0] y0 레벨(관 바닥과 동일면 — 문 전 폭이 바닥 위)
    //  끝:   [phiEnd, phiL1] yEnd 레벨 · 안 가장자리 = bridgeR(문지방 몸통 안) — 이중벽 포탈 관통 다리(현도 ③).
    const qq = (...v) => q(...v.flat())
    //  ★122-k ②(현도 제안): 층계참 안 가장자리는 **셸 안쪽으로 관입**(이격 0.05 → 관입 −0.25).
    //  이격이 남아 있는 한 그 자리는 언제나 슬릿 후보다. 두 층계참 모두 문 개구 방위라 방 안 비가시.
    const lands = [
      { a: S.phiL0, b: S.phiStep0, y: S.y0, ri: S.wallRMax(S.y0, S.y0 - RSP_MASS_T) - RSP_LAND_BITE, bridge: false },   // ★122-e 대칭(문 폭 전체가 평평)
      { a: S.phiEnd, b: S.phiL1, y: S.yEnd, ri: S.wallRMax(S.yEnd, S.yEnd - RSP_MASS_T) - RSP_LAND_BITE, bridge: false }, // ★122-d: 안쪽 확장은 buildExtSpiralBridge()
    ]
    for (const L of lands) {
      const ri2 = L.bridge ? S.bridgeR : L.ri
      const ro2 = S.rIn(L.y) + S.W                 // 바깥 가장자리는 통로 폭 기준 불변(관입은 안쪽만)
      const yT2 = L.y, yB2 = L.y - S.massT
      const SEG = 4
      for (let j = 0; j < SEG; j++) {
        const a = L.a + (L.b - L.a) * j / SEG, b = L.a + (L.b - L.a) * (j + 1) / SEG
        const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
        const fw = (b > a)                            //  각 증가 진행 = 단 블록 cw(dir>0)와 같은 순회 반전
        const T = [[ri2 * ca, yT2, ri2 * sa], [ro2 * ca, yT2, ro2 * sa], [ro2 * cb, yT2, ro2 * sb], [ri2 * cb, yT2, ri2 * sb]]
        const B = [[ri2 * ca, yB2, ri2 * sa], [ro2 * ca, yB2, ro2 * sa], [ro2 * cb, yB2, ro2 * sb], [ri2 * cb, yB2, ri2 * sb]]
        qq(...(fw ? [T[3], T[2], T[1], T[0]] : [T[0], T[1], T[2], T[3]]))
        qq(...(fw ? [B[0], B[1], B[2], B[3]] : [B[3], B[2], B[1], B[0]]))
        qq(...(fw ? [T[2], B[2], B[1], T[1]] : [T[1], B[1], B[2], T[2]]))   // 바깥
        qq(...(fw ? [T[0], B[0], B[3], T[3]] : [T[3], B[3], B[0], T[0]]))   // 안
      }
      for (const [phi, isA] of [[L.a, true], [L.b, false]]) {
        const c = Math.cos(phi), s2 = Math.sin(phi)
        const C = [[ri2 * c, yT2, ri2 * s2], [ro2 * c, yT2, ro2 * s2], [ro2 * c, yB2, ro2 * s2], [ri2 * c, yB2, ri2 * s2]]
        const fwd = (isA === (L.b > L.a))
        qq(...(fwd ? [C[1], C[0], C[3], C[2]] : [C[0], C[1], C[2], C[3]]))
      }
    }
  })
}

//  ★★122-b 관화(현도 ① "밀봉 — 열린 하늘길은 외부를 스포일러"): 바깥벽 + 천장 = 관(터널) 어법.
//  단면: 안벽 = 셸/원기둥(기존) · 바닥 = 계단 매스 · 바깥벽(수직, 두께 wallT) · 천장(헬리코이드 추종,
//  내부고 clr = 문 높이 — 문·관 단면 연속). 천장 안 가장자리는 그 높이의 벽면에 BITE 물림(셸 조임 추종).
//  범위 = 층계참 포함 [phiL0, phiL1]. 양끝은 전체 단면 캡(문 개구부는 셸 컷이 담당 — 관 몸통은 막힘).
export function buildExtSpiralShell(opts = {}) {
  if (!RSP_ON || RSP_ENCL !== 'tube') return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  //  ★122-c ①②: 관↔나선 T 접속 — 바깥벽에 관 단면 개구(방위 phi0 ± juncA · 마구리 캡).
  //  관 천장(y1+4.0)과 나선 천장(y0+clr)은 동일면 → 천장은 개구 구간에도 이어진다(연속 접합).
  const rW1atDoor = S.rIn(S.y0) + S.W + S.wallT
  const juncA = Math.asin(ASC_JUNC_HW / rW1atDoor)
  const jA = S.phi0 - juncA, jB = S.phi0 + juncA
  //  스테이션: 균일 분할 + 개구 경계 2 삽입 정렬 — 개구가 세그 격자에 스냅되지 않게(정확 경계)
  const M = (S.N + 8) * 2
  const p0 = S.phiL0, p1 = S.phiL1
  const lo = Math.min(p0, p1), hi = Math.max(p0, p1)
  const st = []
  for (let i = 0; i <= M; i++) st.push(lo + (hi - lo) * i / M)
  for (const j of [jA, jB]) if (j > lo + 1e-9 && j < hi - 1e-9) st.push(j)
  st.sort((a, b) => a - b)
  const inJunc = (a, b) => (a + b) / 2 > jA && (a + b) / 2 < jB
  const yF = (phi) => S.yAt(phi)
  return quadGeo((q) => {
    const qq = (...v) => q(...v.flat())
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], b = st[i + 1]
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      const yA = yF(a), yB = yF(b)
      const rW0a = S.rIn(yA) + S.W, rW0b = S.rIn(yB) + S.W
      const rW1a = rW0a + S.wallT, rW1b = rW0b + S.wallT
      const wyBa = yA - S.massT, wyBb = yB - S.massT
      const cyA = yA + S.clr, cyB = yB + S.clr
      const tyA = cyA + S.wallT, tyB = cyB + S.wallT
      if (!inJunc(a, b)) {
        //  바깥벽 3면(안·밖·하단) — 개구 구간은 스킵(★122-c ② "옆면이 경로를 막는다" 해소)
        qq([rW0a*ca,yA,rW0a*sa],[rW0a*ca,tyA,rW0a*sa],[rW0b*cb,tyB,rW0b*sb],[rW0b*cb,yB,rW0b*sb])
        qq([rW1b*cb,wyBb,rW1b*sb],[rW1b*cb,tyB,rW1b*sb],[rW1a*ca,tyA,rW1a*sa],[rW1a*ca,wyBa,rW1a*sa])
        qq([rW0a*ca,wyBa,rW0a*sa],[rW1a*ca,wyBa,rW1a*sa],[rW1b*cb,wyBb,rW1b*sb],[rW0b*cb,wyBb,rW0b*sb])
      }
      //  천장(개구 포함 전 구간 — 관 천장과 동일면 접합): 밑면·윗면·안 마구리
      const rC0a = S.wallRMax(cyA, cyA + S.wallT) - RSP_BITE, rC0b = S.wallRMax(cyB, cyB + S.wallT) - RSP_BITE
      const rT0a = rC0a, rT0b = rC0b   // ★122-O: 천장 두께 범위 최대 기준으로 통일(마구리 수직)
      qq([rC0a*ca,cyA,rC0a*sa],[rW0a*ca,cyA,rW0a*sa],[rW0b*cb,cyB,rW0b*sb],[rC0b*cb,cyB,rC0b*sb])
      qq([rT0b*cb,tyB,rT0b*sb],[rW1b*cb,tyB,rW1b*sb],[rW1a*ca,tyA,rW1a*sa],[rT0a*ca,tyA,rT0a*sa])
      qq([rC0b*cb,cyB,rC0b*sb],[rT0b*cb,tyB,rT0b*sb],[rT0a*ca,tyA,rT0a*sa],[rC0a*ca,cyA,rC0a*sa])
      //  천장 바깥 마구리(개구 구간 — 벽이 없으니 천장 두께 단면 노출 봉합)
      if (inJunc(a, b))
        qq([rW1a*ca,cyA,rW1a*sa],[rW1a*ca,tyA,rW1a*sa],[rW1b*cb,tyB,rW1b*sb],[rW1b*cb,cyB,rW1b*sb])
    }
    //  ★122-c ①: 개구 마구리 캡 2(벽 절단면 — 관 벽과 만나는 면)
    for (const [phi, first] of [[jA, true], [jB, false]]) {
      const c = Math.cos(phi), s2 = Math.sin(phi)
      const y = yF(phi), cy = y + S.clr
      const rW0 = S.rIn(y) + S.W, rW1 = rW0 + S.wallT
      const CAP = [[rW0*c,y-S.massT,rW0*s2],[rW1*c,y-S.massT,rW1*s2],[rW1*c,cy,rW1*s2],[rW0*c,cy,rW0*s2]]
      qq(...(first ? [CAP[0],CAP[1],CAP[2],CAP[3]] : [CAP[1],CAP[0],CAP[3],CAP[2]]))
    }
    //  ★122-c ⑤ → ★★★122-L 정정(2026.08.12 · 레이캐스트 렌더로 뚫린 픽셀 좌표 확정):
    //  ⛔양끝 캡의 안쪽 반경을 **바닥 높이 하나로 고정**했는데 셸은 위로 갈수록 좁아진다
    //   (y112.5에서 15.55 → y115.8에서 14.46). 캡이 셸에 1.1이나 못 미쳐 **위쪽이 벌어졌고**,
    //   그 틈이 세로 슬릿으로 보였다 — 현도가 다섯 번 지적한 그 틈.
    //  → 캡을 세로로 분할해 각 높이의 벽면(wallR(y))을 따라가게 한다(셸 곡률 추종 · 물림 0.15).
    for (const [phi, isStart] of [[p0, true], [p1, false]]) {
      //  ★★★130-f: 참(landing) 바깥 끝 p0에 **접속 통로가 이어지면** 이 캡은 문이 된다 → 짓지 않는다.
      //   (밀봉은 통로가 이어받는다 — 관 단면이 동일하고 시작면이 이 캡면과 일치한다. ★130-c 참조.)
      //  ★130-g: 'landing'(정본 파생)이거나 도수가 φL0와 0.05° 이내면 그 캡은 **문**이다 → 짓지 않는다.
      //   ⛔구판은 반올림한 상수(168.37)와 실값(168.3708…)을 1e-6으로 비교해 **영영 열리지 않았다**(현도 실측).
      const capIsDoor = LNK_PHI === 'landing' || Math.abs(LNK_PHI * Math.PI / 180 - p0) < 0.05 * Math.PI / 180
      if (isStart && LNK_ON && LNK_DOOR_ON && LNK_OPEN_SPIRAL && capIsDoor) continue
      const c = Math.cos(phi), s2 = Math.sin(phi)
      const y = yF(phi), ty = y + S.clr + S.wallT
      const rW1 = S.rIn(y) + S.W + S.wallT
      const yB0 = y - S.massT
      const SEG2 = 12
      const fwd = (isStart === (p0 < p1))
      for (let k2 = 0; k2 < SEG2; k2++) {
        const ya = yB0 + (ty - yB0) * k2 / SEG2, yb = yB0 + (ty - yB0) * (k2 + 1) / SEG2
        const ra = S.wallRMax(ya, yb) - RSP_BITE, rb = ra   // ★122-O: 세그 범위 최대 기준
        const CAP = [[ra*c,ya,ra*s2],[rW1*c,ya,rW1*s2],[rW1*c,yb,rW1*s2],[rb*c,yb,rb*s2]]
        qq(...(fwd ? [CAP[1],CAP[0],CAP[3],CAP[2]] : [CAP[0],CAP[1],CAP[2],CAP[3]]))
      }
    }
  })
}

//  ★122-c ④ 굽도리 몰딩: 계단 안 가장자리(이격 0.05)와 셸의 접선을 봉합하는 연속 밴드 —
//  창 몰딩과 같은 가족(§2-D 두께 위계 최하단). 셸을 안팎으로 물고 계단 몸통 위에 앉는다.
//  범위: 전 구간, 단 끝쪽은 접선 문 컷 반각 전에 종료(문지방을 가로지르는 문턱 방지).
export function buildExtSpiralSkirt(opts = {}) {
  if (!RSP_ON) return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  //  ★★122-i ①(현도 7차 — 격자 스캔으로 좌표 확정): 굽도리를 접선 문 앞에서 **과다 절단**(+0.05rad
  //  = 2.86°)해, 그 구간에서 셸(원기둥 16.25)과 계단 안 가장자리(16.30) 사이 **이격 0.05가 맨살로
  //  노출**됐다 — 셸은 두께 0이라 그대로 관통 슬릿이 된다(현도가 두 번 지적한 그 틈).
  //  → 여유를 빼고 컷 실제 반각보다 **안으로 0.02rad 더 물린다**(개구 안에는 셸이 없어 봉합 불필요).
  //  ★122-P(현도: 문틀 우하단 연석을 "약간만 짧게"): 문 앞 후퇴를 RSP_SKIRT_BACK만큼 더.
  const cutHalf = Math.asin(2.3 / S.wallR(S.yEnd)) - 0.02 + RSP_SKIRT_BACK
  //  ★★122-h ②(현도 6차): 굽도리가 **관 문(전망 개구) 앞도 가로질러** 발판 위 0.45 턱을 만들었다.
  //  ★122-c에서 접선 문 앞(cutHalf)만 비켰고 관 문 앞은 안 비켰다 — 문 앞에는 문턱을 두지 않는다.
  //  ★★★122-j(현도 8차 — 카메라 좌표가 결정적 단서): 굽도리 범위가 계단 끝(phiEnd−cutHalf)까지였고
  //  **착지 층계참 구간(phiEnd → phiL1)이 통째로 빠져** 있었다. 층계참 안 가장자리도 이격 0.05를
  //  갖는데 덮개가 없으니 그 구간 전체가 관통 슬릿이었다 — 현도가 네 번 지적한 그 틈의 정체.
  //  (내가 계속 '계단 구간'만 보고 층계참이 범위 밖인 걸 놓쳤다.)
  //  → 범위를 **양끝 층계참 끝까지**(phiL0 → phiL1) 늘리고, **개구 방위만** 비운다(문 앞엔 문턱 없음).
  const ovlHalf = Math.asin((RAD_DOOR_HW + 0.15) / S.rIn(S.y0))   // 관 문(전망 개구) 반각 + 여유
  const p0 = S.phiL0, p1 = S.phiL1
  const lo = Math.min(p0, p1), hi = Math.max(p0, p1)
  //  비울 구간 2: ⓐ관 문(전망 개구) 앞 ⓑ접선 문(착지) 앞 — 개구 안엔 셸이 없어 봉합 대상이 아니다
  const skipLo = S.phi0 - ovlHalf, skipHi = S.phi0 + ovlHalf
  const skipLo2 = Math.min(S.phiEnd - cutHalf, S.phiEnd + cutHalf)
  const skipHi2 = Math.max(S.phiEnd - cutHalf, S.phiEnd + cutHalf)
  //  ⚠분할 해상도: N*2면 세그 4.7°라 개구 경계·곡률을 못 따른다(실측). N*8 = 1.2°.
  const M = S.N * 8
  return quadGeo((q) => {
    const qq = (...v) => q(...v.flat())
    const sec = (phi) => {
      const y = S.yAt(phi), w = S.wallR(y)
      //  ★122-O: 안쪽 관입은 SKIRT_IN(0.06 = 새그 0.035 + 여유)만 — 구 SKIRT_D/2(0.275)는 방 안 찌꺼기
      return { r0: S.wallRMax(y - 0.25, y + RSP_SKIRT_H) - RSP_SKIRT_IN, r1: w + RSP_SKIRT_D / 2 + RSP_CLEAR + 0.1, y0: y - 0.25, y1: y + RSP_SKIRT_H }
    }
    //  ⚠스테이션에 개구 경계를 **삽입**한다(균일 분할만 쓰면 세그 4.7°가 경계를 뭉갠다 — 실측 적발)
    const st = []
    for (let i = 0; i <= M; i++) st.push(lo + (hi - lo) * i / M)
    for (const j of [skipLo, skipHi, skipLo2, skipHi2]) if (j > lo + 1e-9 && j < hi - 1e-9) st.push(j)
    st.sort((x, y2) => x - y2)
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], b = st[i + 1]
      const mid = (a + b) / 2
      if (mid > skipLo && mid < skipHi) continue                    // ★122-h ②: 전망 개구 앞 비움
      if (mid > skipLo2 && mid < skipHi2) continue                  // ★122-j: 접선 문(착지) 개구 앞 비움
      const A = sec(a), B = sec(b)
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      qq([A.r0*ca,A.y1,A.r0*sa],[A.r1*ca,A.y1,A.r1*sa],[B.r1*cb,B.y1,B.r1*sb],[B.r0*cb,B.y1,B.r0*sb])
      qq([B.r0*cb,B.y0,B.r0*sb],[B.r1*cb,B.y0,B.r1*sb],[A.r1*ca,A.y0,A.r1*sa],[A.r0*ca,A.y0,A.r0*sa])
      qq([B.r1*cb,B.y0,B.r1*sb],[B.r1*cb,B.y1,B.r1*sb],[A.r1*ca,A.y1,A.r1*sa],[A.r1*ca,A.y0,A.r1*sa])
      qq([A.r0*ca,A.y0,A.r0*sa],[A.r0*ca,A.y1,A.r0*sa],[B.r0*cb,B.y1,B.r0*sb],[B.r0*cb,B.y0,B.r0*sb])
    }
    //  ★122-h: 구간이 개구로 둘로 갈라지므로 마구리 4곳(양 끝 + 개구 양옆)
    const ends = [[lo, true], [hi, false]]
    for (const [j, st2] of [[skipLo, false], [skipHi, true], [skipLo2, false], [skipHi2, true]])
      if (j > lo && j < hi) ends.push([j, st2])
    for (const [phi, isStart] of ends) {
      const A = sec(phi)
      const c = Math.cos(phi), s2 = Math.sin(phi)
      const CAP = [[A.r0*c,A.y0,A.r0*s2],[A.r1*c,A.y0,A.r1*s2],[A.r1*c,A.y1,A.r1*s2],[A.r0*c,A.y1,A.r0*s2]]
      qq(...(isStart ? [CAP[1],CAP[0],CAP[3],CAP[2]] : [CAP[0],CAP[1],CAP[2],CAP[3]]))
    }
  })
}

//  ★바깥 패러핏(★75 STAIR_PARA·★118 L자 계열의 단순형): 바깥 가장자리 위 연속 벽 리본.
//  위면 = 헬리코이드 + paraH(연속 — 계단 톱니를 따르지 않아 실루엣이 나선으로 읽힘. ★118 어법)
export function buildExtSpiralParapet(opts = {}) {
  if (!RSP_ON) return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  const M = S.N * 3
  return quadGeo((q) => {
    for (let i = 0; i < M; i++) {
      const a = S.phi0 + S.dir * S.sweep * i / M, b = S.phi0 + S.dir * S.sweep * (i + 1) / M
      const yA = S.yAt(a), yB = S.yAt(b)
      const r0a = S.rIn(yA) + S.W, r0b = S.rIn(yB) + S.W          // 안면 = 통로 바깥 가장자리
      const r1a = r0a + S.paraT, r1b = r0b + S.paraT
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      const yTa = yA + S.paraH, yTb = yB + S.paraH
      const walls = S.dir > 0 ? [
        [[r0a * ca, yA, r0a * sa], [r0a * ca, yTa, r0a * sa], [r0b * cb, yTb, r0b * sb], [r0b * cb, yB, r0b * sb]],   // 안면(통로 쪽)
        [[r1b * cb, yB - S.massT, r1b * sb], [r1b * cb, yTb, r1b * sb], [r1a * ca, yTa, r1a * sa], [r1a * ca, yA - S.massT, r1a * sa]], // 바깥면
        [[r0a * ca, yTa, r0a * sa], [r1a * ca, yTa, r1a * sa], [r1b * cb, yTb, r1b * sb], [r0b * cb, yTb, r0b * sb]], // 윗면
      ] : [
        [[r0b * cb, yB, r0b * sb], [r0b * cb, yTb, r0b * sb], [r0a * ca, yTa, r0a * sa], [r0a * ca, yA, r0a * sa]],
        [[r1a * ca, yA - S.massT, r1a * sa], [r1a * ca, yTa, r1a * sa], [r1b * cb, yTb, r1b * sb], [r1b * cb, yB - S.massT, r1b * sb]],
        [[r0b * cb, yTb, r0b * sb], [r1b * cb, yTb, r1b * sb], [r1a * ca, yTa, r1a * sa], [r0a * ca, yTa, r0a * sa]],
      ]
      for (const W2 of walls)
        q(W2[0][0], W2[0][1], W2[0][2], W2[1][0], W2[1][1], W2[1][2],
          W2[2][0], W2[2][1], W2[2][2], W2[3][0], W2[3][1], W2[3][2])
    }
  })
}

//  ★창 리본 컷 브러시(셸 CSG용): 나선 추종 밴드 — 이번 조각은 **상반부(단일벽) 구간만**.
//  발판 위 [SILL, TOP] 높이의 부채꼴 스윕 매스(반경 관통 r 셸−4 ~ 셸+2) — buildPetalShell cutBrush에 투입.
//  창 세그(정본 한 곳 — 리본 컷·몰딩이 공유. ★122-b에서 추출): 상반부 단일벽 한정 + 양끝 문틀 마진
export function windowSegs(opts = {}) {
  const S = extSpiralSpec(opts)
  const segs = []
  const M = S.N * 2
  for (let i = 0; i < M; i++) {
    const a = S.phiStep0 + S.dir * S.sweepStep * i / M, b = S.phiStep0 + S.dir * S.sweepStep * (i + 1) / M
    const yA = S.yAt(a), yB = S.yAt(b)
    //  ★★123: 하반부(이중벽 포탈) 개방 — 끄면 ★122 상태(상반부 단일벽만)로 한 줄 복귀
    if (!RSP_WIN_LOW_ON && Math.min(yA, yB) + RSP_WIN_SILL < RAD_CYL_Y0) continue
    const offA = S.dir > 0 ? a - S.phiStep0 : S.phiStep0 - a
    const offB = S.dir > 0 ? S.phiEnd - b : b - S.phiEnd
    if (offA < RSP_WIN_MARG || offB < RSP_WIN_MARG) continue
    segs.push([a, b, yA, yB])
  }
  return segs
}

//  ★★★123 원기둥 개구용 — "이 방위에서 나선 창은 어느 높이 대역인가"의 **닫힌 역산**(격자 탐색 아님).
//  나선은 방위 a를 최대 두 번 지난다(1.23바퀴). 원기둥은 적도 아래에만 있으므로, 창 대역을
//  적도로 자른 뒤 남는 것이 원기둥 개구다 — 상반부 통과분은 자동으로 빈 대역이 되어 탈락한다.
//  ⚠정본 = windowSegs()의 실제 양끝(문틀 마진 포함) — 리본과 개구가 같은 곳에서 시작·끝난다.
export function winBandAt(a, opts = {}) {
  if (!(RSP_ON && RSP_WIN_ON && RSP_WIN_LOW_ON)) return null
  const S = extSpiralSpec(opts)
  const segs = windowSegs()
  if (!segs.length) return null
  const pA = segs[0][0], pB = segs[segs.length - 1][1]
  const lo = Math.min(pA, pB), hi = Math.max(pA, pB)
  for (let k = Math.ceil((lo - a) / (2 * Math.PI)); ; k++) {
    const phi = a + k * 2 * Math.PI
    if (phi > hi + 1e-12) break
    if (phi < lo - 1e-12) continue
    const y = S.yAt(phi)
    const b0 = y + RSP_WIN_SILL, b1 = Math.min(y + RSP_WIN_TOP, RAD_CYL_Y0)
    if (b1 - b0 > 1e-9) return [b0, b1]        // 상반부 통과분은 b1 ≤ b0 → 여기서 탈락
  }
  return null
}

//  ★구간 [a0,a1]에서 **보수적**(교집합) 대역 — 원기둥 개구가 창턱·인방 판 **몸통 안**에 들도록.
//  규율 ④: 판이 개구를 삼키는 쪽이므로 개구가 좁아야 가장자리가 숨는다.
export function winBandOver(a0, a1, opts = {}) {
  const A = winBandAt(a0, opts), B = winBandAt(a1, opts)
  if (!A || !B) return null
  const lo = Math.max(A[0], B[0]), hi = Math.min(A[1], B[1])
  return hi - lo > 1e-9 ? [lo, hi] : null
}

export function extWindowRibbonGeo(opts = {}) {
  //  ★122-c ③: 세그별 독립 박스 122개를 한 지오로 CSG에 넣으니 세그 경계마다 미절단 슬리버가
  //  남았다(현도 스크린샷 — "창에 찌꺼기"). → 연속 스윕 매스 하나(옆면 4 연속 + 양끝 캡 2, watertight).
  const S = extSpiralSpec(opts)
  const segs = windowSegs()
  const pos = [], idx = []
  const q = (...v) => { const base = pos.length / 3
    for (let i = 0; i < 12; i += 3) pos.push(v[i], v[i + 1], v[i + 2])
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3) }
  const qq = (...v) => q(...v.flat())
  if (segs.length) {
    //  스테이션 = [seg0.a, seg0.b, seg1.b, …](연속 구간 전제 — 단조 하강이라 한 구간)
    const st = [[segs[0][0], segs[0][2]], ...segs.map(([, b2, , yB]) => [b2, yB])]
    const sec = (phi, y) => ({ rI: 9.5, rO: S.wallR(y) + 2, y0: y + RSP_WIN_SILL, y1: y + RSP_WIN_TOP })
    for (let i = 0; i < st.length - 1; i++) {
      const [a, yA] = st[i], [b, yB] = st[i + 1]
      const A = sec(a, yA), B = sec(b, yB)
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      qq([A.rI*ca,A.y0,A.rI*sa],[A.rO*ca,A.y0,A.rO*sa],[B.rO*cb,B.y0,B.rO*sb],[B.rI*cb,B.y0,B.rI*sb])   // 밑
      qq([A.rI*ca,A.y1,A.rI*sa],[B.rI*cb,B.y1,B.rI*sb],[B.rO*cb,B.y1,B.rO*sb],[A.rO*ca,A.y1,A.rO*sa])   // 위
      qq([A.rI*ca,A.y0,A.rI*sa],[B.rI*cb,B.y0,B.rI*sb],[B.rI*cb,B.y1,B.rI*sb],[A.rI*ca,A.y1,A.rI*sa])   // 안
      qq([A.rO*ca,A.y0,A.rO*sa],[A.rO*ca,A.y1,A.rO*sa],[B.rO*cb,B.y1,B.rO*sb],[B.rO*cb,B.y0,B.rO*sb])   // 밖
    }
    for (const [k, isStart] of [[0, true], [st.length - 1, false]]) {
      const [phi, y] = st[k]
      const A = sec(phi, y)
      const c = Math.cos(phi), s2 = Math.sin(phi)
      const CAP = [[A.rI*c,A.y0,A.rI*s2],[A.rO*c,A.y0,A.rO*s2],[A.rO*c,A.y1,A.rO*s2],[A.rI*c,A.y1,A.rI*s2]]
      qq(...(isStart ? [CAP[1],CAP[0],CAP[3],CAP[2]] : [CAP[0],CAP[1],CAP[2],CAP[3]]))
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return orientOutward(g)   // ★122-d
}

//  ★★122-b 창 몰딩(현도 ④ "셸이 종잇장·창이 버그처럼"): DoorFrame 잼 어법("컷 림을 삼킨다")의
//  나선 추종형 — 창 상·하연 밴드 + 양끝 수직 몰딩이 셸을 안팎 WFR_D/2씩 물어 두께 없는 컷 단면을 가린다.
//  세그 = windowSegs()(리본 컷과 동일 정본) → 몰딩·개구 자동 정렬.
export function buildExtWindowFrame(opts = {}) {
  if (!RSP_ON) return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  const segs = windowSegs()
  if (!segs.length) return quadGeo(() => {})
  return quadGeo((q) => {
    const qq = (...v) => q(...v.flat())
    //  독립 6면 박스(단 블록 정신 — watertight·감김 단순) 하나를 만드는 로컬 공장
    const box = (a, b, y0a, y1a, y0b, y1b) => {
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
      //  ★122-R ③: 안쪽 관입은 WFR_IN만 — 구 WFR_D/2가 방 안 얇은 띠였다.
      //  세로 범위 최대 반경 기준(★122-O 규율) · 바깥은 WFR_D−IN으로 두껍게 남는다.
      //  ★★123: 판이 **두 rim을 다 삼킨다** — 먼 쪽(셸 컷 단면) ~ 가까운 쪽(원기둥 컷 단면).
      //   상반부는 셸 = 원기둥이므로 rIa1 = rIa0 + WFR_D로 **축퇴**한다(구 식과 동일 — 분기 없음).
      //   하반부에서만 판이 포탈 깊이만큼 길어져 창턱·인방이 된다(현도 ⓐ "드러낸다").
      const rIa0 = S.shellRMax(y0a, y1a) - RSP_WFR_IN, rIa1 = S.wallRMax(y0a, y1a) + (RSP_WFR_D - RSP_WFR_IN)
      const rIb0 = S.shellRMax(y0b, y1b) - RSP_WFR_IN, rIb1 = S.wallRMax(y0b, y1b) + (RSP_WFR_D - RSP_WFR_IN)
      const fw = (b > a)
      const V = {
        ai0b: [rIa0 * ca, y0a, rIa0 * sa], ai1b: [rIa1 * ca, y0a, rIa1 * sa],
        ai0t: [rIa0 * ca, y1a, rIa0 * sa], ai1t: [rIa1 * ca, y1a, rIa1 * sa],
        bi0b: [rIb0 * cb, y0b, rIb0 * sb], bi1b: [rIb1 * cb, y0b, rIb1 * sb],
        bi0t: [rIb0 * cb, y1b, rIb0 * sb], bi1t: [rIb1 * cb, y1b, rIb1 * sb],
      }
      const F = (p1, p2, p3, p4) => qq(...(fw ? [V[p1], V[p2], V[p3], V[p4]] : [V[p4], V[p3], V[p2], V[p1]]))
      F('ai0t', 'ai1t', 'bi1t', 'bi0t')   // 위(+y)
      F('bi0b', 'bi1b', 'ai1b', 'ai0b')   // 아래(−y)
      F('bi1b', 'bi1t', 'ai1t', 'ai1b')   // 바깥(+r)
      F('ai0b', 'ai0t', 'bi0t', 'bi0b')   // 안(−r)
      const CA = fw ? ['ai1b', 'ai1t', 'ai0t', 'ai0b'] : ['ai0b', 'ai0t', 'ai1t', 'ai1b']
      const CB = fw ? ['bi0b', 'bi0t', 'bi1t', 'bi1b'] : ['bi1b', 'bi1t', 'bi0t', 'bi0b']
      qq(...CA.map((k) => V[k])); qq(...CB.map((k) => V[k]))
    }
    for (const [a, b, yA, yB] of segs) {
      box(a, b, yA + RSP_WIN_SILL - RSP_WFR_T / 2, yA + RSP_WIN_SILL + RSP_WFR_T / 2,
             yB + RSP_WIN_SILL - RSP_WFR_T / 2, yB + RSP_WIN_SILL + RSP_WFR_T / 2)      // 하연
      box(a, b, yA + RSP_WIN_TOP - RSP_WFR_T / 2, yA + RSP_WIN_TOP + RSP_WFR_T / 2,
             yB + RSP_WIN_TOP - RSP_WFR_T / 2, yB + RSP_WIN_TOP + RSP_WFR_T / 2)        // 상연
    }
    //  ★★★125 양끝 수직 몰딩(잼) — **셸 곡률 추종**(현도 3차: "직각삼각형 틈")
    //  ⚠구판은 세로 전 범위(2.25)를 박스 하나로 잡고 `shellRMax` 한 값을 썼다 → 그 범위에서 셸 반경이
    //   0.76 변하므로 반대편 끝이 그만큼 벌어졌다(끝0 위 +0.372 · 끝1 아래 +0.339 = 삼각형 틈).
    //  ★수리 = ★122-L 어법(관 외피 끝 캡 세로 12분할) 재사용: 잼을 세로로 쪼개면 `box()`가 조각마다
    //   그 높이의 `shellRMax`·`wallRMax`를 다시 잡으므로 **추종은 저절로** 된다(새 식 없음).
    //  ★분할 수 = 파생: 조각당 반경 변화 ≤ `RSP_WFR_JAMB_DR`. 노브(SILL·TOP·y1)를 밀면 따라온다.
    for (const end of [0, 1]) {
      const seg = segs[end === 0 ? 0 : segs.length - 1]
      const phi = end === 0 ? seg[0] : seg[1]
      const y = end === 0 ? seg[2] : seg[3]
      const dA = 0.032 * (end === 0 ? 1 : -1) * Math.sign(segs[0][1] - segs[0][0])
      const yA = y + RSP_WIN_SILL - RSP_WFR_T / 2, yB = y + RSP_WIN_TOP + RSP_WFR_T / 2
      const dr = Math.abs(S.shellR(yB) - S.shellR(yA))
      const nSub = RSP_WFR_JAMB_DR > 0 ? Math.max(1, Math.min(48, Math.ceil(dr / RSP_WFR_JAMB_DR))) : 1
      for (let k = 0; k < nSub; k++) {
        const s0 = yA + (yB - yA) * k / nSub, s1 = yA + (yB - yA) * (k + 1) / nSub
        box(phi, phi + dA, s0, s1, s0, s1)
      }
    }
  })
}

//  ★★122-d 착지 다리(현도 ③ "나선에서 셸로 들어가는 바닥이 어긋나 있다"):
//  원호 층계참으로 문 앞을 덮으면 **호 ↔ 직선 문**이라 양 모서리에 쐐기 틈이 남는다(실측 사진).
//  → 다리는 접선 문 **컷과 같은 방향·같은 폭의 판**으로 만든다(Radial 셸 컷: z0 = PRX−1 ·
//    xOff = R(cosφ−1) · rotateY(−sgn·φ) — 그 컷이 실제 구멍이니 컷이 정본).
//  안쪽 끝은 진입 계단 착지장(중심거리 ≈13.5)을 물어 삼키고, 바깥 끝은 회랑 바닥과 겹친다.
export function buildExtSpiralBridge(opts = {}) {
  if (!RSP_ON) return quadGeo(() => {})
  const S = extSpiralSpec(opts)
  const sgn = S.dir > 0 ? -1 : 1                    // 착지 쪽(dir=+1 → −z 문)
  const phi = Math.asin((RAD_PRX - 1) / RAD_R)
  const xOff = RAD_R * (Math.cos(phi) - 1), zOff = sgn * (RAD_PRX - 1)
  const th = -sgn * phi
  const ct = Math.cos(th), stt = Math.sin(th)
  //  ★★122-h ①(현도 6차): 다리 폭이 컷 폭과 **정확히 같아** 물림 0 → 컷 벽면과 동일면에서 실틈.
  //  컷 가장자리를 양쪽 BRIDGE_BITE만큼 물어 삼킨다(셸은 두께 0이라 관통해도 무해).
  const hw = RAD_DOOR_HW + RSP_BR_BITE
  //  ★★122-i ②(현도 7차): 안쪽 −2.4는 **진입 계단 착지장(중심거리 ≈13.5)을 2.09 덮어** 기존 계단
  //  경로를 삼켰다. 다리는 셸 컷을 건너는 역할만 — 방 안 바닥은 진입 계단 착지장이 이미 담당한다.
  //  → 안쪽 끝을 착지장 앞코에 **살짝 물리는 깊이**로 축소(RSP_BR_IN).
  //  ⚠부호 실측(2026.08.12): 로컬 lz **증가 = 반경 감소 = 방 안쪽**이다(회전 −sgn·φ 결과).
  //   구 코드는 반대로 두어 다리 바깥 끝이 r16.22로 회랑(16.30)에 **닿지도 못했다** — 틈의 직접 원인.
  //  ⚠깊이축 부호는 착지 쪽(sgn)에 의존한다 — 회전각 th = −sgn·φ이므로 lz의 반경 방향이 뒤집힌다.
  //   sgn으로 일반화하지 않으면 한쪽 체제(RSP_DIR)만 맞는다(스윕이 적발).
  const dIn = -sgn * RSP_BR_IN, dOut = sgn * 3.6    // 방 안쪽 ↔ 회랑 쪽(양 체제 공통)
  const yT = S.yEnd, yB = S.yEnd - S.massT
  //  로컬(x=폭, z=깊이) → 월드: rotateY(th) 후 (xOff, zOff) 이동 — Radial 컷과 동일 변환
  const W2 = (lx, lz) => [lx * ct + lz * stt + xOff, -lx * stt + lz * ct + zOff]
  const c = [[-hw, dIn], [hw, dIn], [hw, dOut], [-hw, dOut]].map(([a, b]) => W2(a, b))
  return quadGeo((q) => {
    const qq = (...v) => q(...v.flat())
    const T = c.map(([x, z]) => [x, yT, z]), B = c.map(([x, z]) => [x, yB, z])
    qq(T[0], T[1], T[2], T[3])                      // 윗면(밟는 면)
    qq(B[3], B[2], B[1], B[0])                      // 밑면
    for (let i = 0; i < 4; i++) {                   // 옆면 4
      const j = (i + 1) % 4
      qq(T[i], B[i], B[j], T[j])
    }
  })
}
