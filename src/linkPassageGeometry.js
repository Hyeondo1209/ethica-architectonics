// linkPassageGeometry.js — ★★★130 셸 → 첨탑 테라스 접속 통로 (2026.08.14 현도 스케치·구술)
//
//  ★현도 확정(리드백 도면 `passage_readback_v2.html` 2왕복):
//   · 시작 = **상승 계단 끝의 오른쪽 벽**(로컬 s=sSt1 39.90 · +z 벽 · y112.5). 왼쪽(−z)은 셸을 감아 내려가는 나선.
//   · 끝   = **첨탑 정방위 벽**(기존 대각 터널 45°+90°k를 45° 돌린 0°/90°/180°/270°) · 테라스 레벨 y127.
//   · 어휘 = 셸 외부 나선 계승 = **휘어진 직육면체**(폭 RSP_W 4.6 승계).
//   · 두 접근법을 **서로 다른 셸에 하나씩** 얹어 한 번에 견준다(넷을 같게 하면 지금의 C4 대칭이 그대로 남는다).
//     ① 단일 곡선 = 시작→끝을 한 번에 잇는 오르는 곡선 관.
//     ② 경유지 = 수평(112.5) → **미니 첨탑에서 수직 상승** → 수평(127). 경유지는 ⚠**셸 정중앙(0°)에 두지 않는다**
//        — 방위를 비껴 놓는 것이 대칭을 깨는 장치다(★126 프로브 실측: 90° 회전 92~96% 일치).
//   · ★**모든 통로는 밀봉된다**(현도) — 바닥·양 벽·천장이 한 몸인 **닫힌 관**. 이 모듈이 만드는 것은 개구 0이다.
//     양 끝 문(문틀 어휘)은 다음 조각 — 지금 뚫으면 밀봉이 깨지고 문틀은 현도 그림 대기다.
//
//  ★단높이 = LNK_STEP 0.24(Claude 위임 결정): 상승 관·회랑과 같은 리듬. 현도 후보 0.40은 실측상
//   걷는 선 경사 **42.9°**(프로젝트 상한 35°·기존 상승 관 28.9°)라 못 걷는다 — 0.24면 29.2°.
//
//  로컬 프레임: 셸0(방위 315°) 월드 좌표로 한 번 짓고, 배정된 셸마다 90°k 회전 배치(등형).
//  사본 금지: 시작점은 `ascSpec()`, 끝점은 `wellWallR()`·`spireTerraceSpec()`에서 받는다.
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import { ascSpec } from './ascentTunnelGeometry.js'
import { extSpiralSpec } from './extSpiralGeometry.js'   // ★130-c 시작 = 나선 관의 접선 연장(사본 금지)
import { wellWallR } from './spireGeometry.js'
import {
  LNK_ON, LNK_ASSIGN, LNK_PHI, LNK_HW, LNK_H, LNK_FLOOR_T, LNK_WALL_T, LNK_TWR_T, LNK_BITE,
  LNK_STEP, LNK_TREAD,
  LNK_WALK_MAX, LNK_DOOR_ON, LNK_DOOR_H, LNK_DOOR_HW, LNK_DOOR_MARG,
  LNK_M_AZ, LNK_M_R, LNK_M_RIN, LNK_FOOT, LNK_FOOT_DROP, LNK_NEWEL_R, LNK_EMB,
  LNK_CONE_ON, LNK_CONE_Y, LNK_CONE_R,
  LK2_ON, LK3_R, LK3_BASE_K, BRG_SINK,
  RAD_ANG0, RAD_R, SPT_Y,
} from './constants.js'

const V = (a, b) => [a, b]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const mul = (a, k) => [a[0] * k, a[1] * k]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const nrm = a => Math.hypot(a[0], a[1])

//  ★★★143 셸0 프레임 → 셸 k 프레임(★132 규약: +90°k · LNK k다). link3Geometry가 쓰던 로컬 rotK를
//   여기로 내렸다 — 1p2도 같은 회전이 필요해졌고, 두 벌로 두면 규약이 갈라진다(규율: 사본 금지).
export const rotShellK = (p, k) => { const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c] }

//  ★★★143 "깊이가 자기를 부르는 방정식"(★137) — 이것도 여기로 내렸다.
//   ①이 참의 −x 변에 비스듬히 꽂히므로 d → 끝점 → θ → d. 고정점 반복으로 닫는다.
//   ⚠**d는 프레임 무관한 스칼라**라 1p3와 1p2가 같은 값을 받는다(회전 사본의 근거).
//   ⚠사본 금지: link3Spec도 이 함수를 부른다. 식이 여기 한 벌만 존재한다.
export function landingDepth({ P0k, R, hwOut, wOut }) {
  let d = wOut, iter = 0, resid = Infinity
  for (; iter < 64; iter++) {
    const E = [-hwOut, -(R + d / 2)]
    const u = [E[0] - P0k[0], E[1] - P0k[1]]
    const th = Math.abs(Math.atan2(u[1], u[0]))
    const dn = wOut / Math.cos(th)
    resid = Math.abs(dn - d); d = dn
    if (resid < 1e-12) break
  }
  return { d, iter, resid }
}

//  ★직선 경로를 표본으로 편다(trimAt·buildLinkTube가 폴리라인을 전제한다)
const straightPts = (A, B, n = 64) => Array.from({ length: n + 1 },
  (_, i) => [A[0] + (B[0] - A[0]) * i / n, A[1] + (B[1] - A[1]) * i / n])

//  A에서 접선 t로 출발해 B에 닿는 유일한 원호(★51 하강로 어휘 — 접선 연속의 기계)
function arcPts(A, t, B, n = 64) {
  const nn = [-t[1], t[0]], AB = sub(B, A), den = 2 * dot(AB, nn)
  if (Math.abs(den) < 1e-9) { const out = []; for (let i = 0; i <= n; i++) out.push(add(A, mul(AB, i / n))); return { pts: out, R: Infinity } }
  const R = dot(AB, AB) / den, C = add(A, mul(nn, R)), rr = Math.abs(R)
  const a0 = Math.atan2(A[1] - C[1], A[0] - C[0]), a1 = Math.atan2(B[1] - C[1], B[0] - C[0])
  let da = a1 - a0
  if (R > 0) { while (da <= 0) da += Math.PI * 2 } else { while (da >= 0) da -= Math.PI * 2 }
  const pts = []
  for (let i = 0; i <= n; i++) { const a = a0 + da * i / n; pts.push([C[0] + rr * Math.cos(a), C[1] + rr * Math.sin(a)]) }
  return { pts, R: rr, turn: Math.abs(da) }
}
const plLen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += nrm(sub(p[i], p[i - 1])); return L }
//  ★130-b: 시작을 **자기 접선의 뒤로** BITE만큼 후퇴 — 관이 상대 벽을 뚫고 들어가 밖에서 T자로 읽힌다(꺾임 0).
function biteStart(pts, bite) {
  //  ⚠★130-d: bite=0이면 **같은 점을 하나 더 얹어** 퇴화 삼각형을 만든다(곡률 진단이 1.95로 허위 붕괴 — 실측 적발).
  if (!(bite > 1e-9)) return pts
  let d = sub(pts[1], pts[0]); const L = nrm(d) || 1; d = [d[0] / L, d[1] / L]
  return [sub(pts[0], mul(d, bite)), ...pts]
}
//  ★130-b: 탑에 닿는 다리를 **중심이 아니라 벽 안쪽 rStop에서 자른다** — 캡이 탑 벽 바로 뒤에 숨는다.
//  (구판은 중심 M까지 끌고 가 캡이 탑 한가운데서 뉴얼·계단과 교차했다 — 현도 반려 "여러 조각 갖다 붙인 것" 진범.)
function trimAt(pts, M, rStop, fromEnd) {
  const arr = fromEnd ? pts.slice().reverse() : pts.slice()
  const out = []
  for (let i = 0; i < arr.length; i++) {
    const d = nrm(sub(arr[i], M))
    if (d <= rStop) {
      if (i > 0) {                                     // 경계와의 교점을 정확히 얹는다(표본 의존 금지)
        const a = arr[i - 1], b = arr[i]
        const da = nrm(sub(a, M)), db = d
        const t = (da - rStop) / Math.max(da - db, 1e-9)
        out.push(add(a, mul(sub(b, a), t)))
      }
      break
    }
    out.push(arr[i])
  }
  return fromEnd ? out.reverse() : out
}

// ══ 단일 유도점 ══
export function linkSpec(opts = {}) {
  const A = ascSpec()
  const y0 = A.y1                                   // 시작 = 상승 계단 끝 문지방 112.5
  const y1 = SPT_Y                                  // 끝 = 테라스 걷는 면 127
  const rise = y1 - y0
  //  ★★130-c 시작 = **외부 나선 관의 접선 연장**(구판은 계단 끝 s39.90 옆구리 — 노드 자체가 틀렸다).
  //   나선 중심선 반경 rc = rIn(y0) + W/2 이고, 꽃잎 중심은 로컬 s = RAD_R. 참 바깥 끝 φL0에서 관이 끝난다.
  //   φ 감소 방향(참 바깥으로)이 새 팔의 진행 방향이다 → 접선 t(φ) = (sinφ, −cosφ).
  const E = extSpiralSpec()
  //  ★130-g: 'landing'이면 참 바깥 끝을 **정본에서 그대로** 받는다(반올림한 도수 상수는 개구 조건을 깬다 — 실측)
  const phi = LNK_PHI === 'landing' ? E.phiL0 : LNK_PHI * Math.PI / 180
  const phiDeg = phi * 180 / Math.PI
  const rc = E.rIn(E.y0) + E.W / 2
  const Ploc = [RAD_R + rc * Math.cos(phi), rc * Math.sin(phi)]      // 로컬 (s, z)
  const Tloc = [Math.sin(phi), -Math.cos(phi)]                       // 로컬 접선(φ 감소 = 참 바깥)
  const ang = -Math.PI / 4                          // 셸0 = 315°(마운트 rotateY(−ang)와 같은 식)
  const ca = Math.cos(ang), sa = Math.sin(ang)
  const L2W = ([s, z]) => [s * ca - z * sa, s * sa + z * ca]
  const P0 = L2W(Ploc)
  const T0 = (() => { const v = L2W(Tloc); const L = nrm(v); return [v[0] / L, v[1] / L] })()
  //  ★겹침 0 진단: 참은 φL0~φStep0을 점유한다. 시작이 그 안쪽이면 부피가 겹친다(검사가 막는다).
  const insideLanding = phiDeg > (E.phiL0 * 180 / Math.PI) + 1e-6 && phiDeg < (E.phiStep0 * 180 / Math.PI) - 1e-6
  const phiL0deg = E.phiL0 * 180 / Math.PI, phi0deg = E.phi0 * 180 / Math.PI, phiStepDeg = E.phiStep0 * 180 / Math.PI
  const armDeg = Math.abs(Math.atan2(Tloc[1], Tloc[0]) * 180 / Math.PI)   // 상승 관 축(+s)과의 사이각
  //  끝점: 첨탑 정방위 0° 벽. 관 끝은 벽 속으로 LNK_EMB 묻힌다(틈 금지 — ★128 어휘)
  const rWall = wellWallR(y1, { forceSpire: true })
  const P1 = [rWall - LNK_EMB, 0]
  const T1 = [-1, 0]                                // 반경 방향 진입(첨탑에 반듯하게 꽂힌다)

  // ⛔① 단일 곡선 = **삭제**(★141 · 2026.08.16 현도 임무 ②·Q5 "삭제가 맞아").
  //  3차 베지어·쌍원호·극좌표 세 체제와 `pts1`·`L1`·`one` 반환이 전부 제거됐다.
  //  이 통로가 서 있던 셸(1p2)은 ② 경유지를 받고, 1p1은 ★137형(link3Geometry)을 받는다.
  //  ⚠부활은 스위치가 아니라 재구현이다 — 노브(LNK_CURVE·BEZ_K·BIARC_D)도 함께 지웠다.

  // ── ② 경유지 ──
  //  ★★★143(2026.08.17 현도): 다리 둘이 **원호 → 직선**이 됐고, 경유지가 **1p3 기둥 자리**로 이사했다.
  //   현도: *"쉘 > 직선통로1 > 미니첨탑(원통) > 상승 > 직선통로2 > 테라스. 직선통로 1과 2는 위에서 봤을 때
  //    1p3 테라스 통로의 직선 형태를 가져야 해. 직선통로 2가 방위 0°로, 직선통로 1은 1p3 첫 직선의 기울기로."*
  //   ⚠평면만 이식한다 — 상승은 여전히 **나선이 전부 먹는다**(관 둘은 수평 y112.5 / y127).
  //   ⚠사본 금지: 자리는 손 좌표가 아니라 **1p3 기둥 중심의 파생** = LK3_R + d/2. d는 공유 solver가 푼다.
  //   ⛔LK2_ON=false면 ★130 곡선 경유지(LNK_M_AZ·LNK_M_R)로 한 줄에 복귀한다(보존계).
  const hwOutL = LNK_HW + LNK_WALL_T, wOutL = 2 * hwOutL
  const LD = landingDepth({ P0k: rotShellK(P0, LK3_BASE_K), R: LK3_R, hwOut: hwOutL, wOut: wOutL })
  const RM2 = LK3_R + LD.d / 2                                // 1p3 기둥 중심 반경(파생)
  const aM = LNK_M_AZ * Math.PI / 180
  const M = LK2_ON ? [RM2, 0] : [LNK_M_R * Math.cos(aM), LNK_M_R * Math.sin(aM)]
  //  ★직선 1의 도착점 = 1p3 E1의 회전상(현도 확정 "1p3 그대로" — 축이 첨탑 중심에서 hwOut 비낀다)
  const E1s = [RM2, -hwOutL]
  const legA0 = LK2_ON ? { pts: straightPts(P0, E1s, 72), R: Infinity } : arcPts(P0, T0, M, 72)
  const legB0 = LK2_ON ? { pts: straightPts(P1, [RM2, 0], 64), R: Infinity } : arcPts(P1, [-T1[0], -T1[1]], M, 64)
  //  ★130-b: 다리는 탑 **벽 안쪽 한 뼘**에서 끝난다(관입 = 벽을 완전히 뚫고 캡은 내부에 숨음)
  //  ★★★143-b(2026.08.17 현도 "직선통로 1과 미니첨탑 입구 부분 틈이 있어"):
  //   ⛔옛 값 `LNK_M_RIN − BITE`는 **곡선 체제의 값**이었다. 그때는 다리가 첨탑 중심을 향해 유도돼
  //    축이 중심을 지났고(비낌 0), 축에 수직인 평평한 끝면이 원통 곡면과 거의 나란했다.
  //   ⚠직선 체제에서는 축이 중심에서 hwOut만큼 비껴 있다(1.307 실측) → 같은 자리에서 자르면
  //    끝면 두 모서리의 반경이 **6.418 / 7.437로 1.019 벌어지고**, 안쪽 모서리가 안쪽 벽에서
  //    **0.018**밖에 안 떨어진 공면이 된다. 벽 두께 1.2에 그 폭을 욱여넣을 수 없다 = 현도가 본 틈.
  //   ★수리: 자르는 자리를 **파생**시킨다. 끝면의 **가장 바깥 모서리**가 안쪽 벽을 여유 `LNK_EMB`만큼
  //    넘어서도록 축 상의 지점을 역산한다 → 벽 구멍이 관 살로 완전히 막힌다(곡률과 무관하게 틈 0).
  //   ⚠**다리마다 다르다**: 축 비낌 h는 도착점 오프셋이 아니라 M에서 그 직선까지의 **수선거리**다
  //    (직선1은 hwOut·cos(방위) = 1.307 · 직선2는 반경 방향이라 0). 손 수치 금지 — 선분에서 직접 잰다.
  const perpDist = (A, B) => { const vx = B[0] - A[0], vy = B[1] - A[1], L = Math.hypot(vx, vy) || 1
    return Math.abs((M[0] - A[0]) * vy - (M[1] - A[1]) * vx) / L }
  const rStopFor = (A, B) => {
    const h = perpDist(A, B)
    const rTgt = LNK_M_RIN - LNK_EMB                   // 가장 바깥 모서리가 도달해야 할 반경
    const t2 = rTgt * rTgt - (h + hwOutL) * (h + hwOutL)
    if (!(t2 > 0)) return Math.max(LNK_NEWEL_R + 0.3, 0.1)   // 기하가 안 닫히면 옛 하한으로(체제 안전)
    return Math.max(Math.sqrt(t2 + h * h), LNK_NEWEL_R + 0.3)
  }
  const rStopA = LK2_ON ? rStopFor(P0, E1s) : Math.max(LNK_M_RIN - LNK_BITE, LNK_NEWEL_R + 0.3)
  const rStopB = LK2_ON ? rStopFor(P1, [RM2, 0]) : Math.max(LNK_M_RIN - LNK_BITE, LNK_NEWEL_R + 0.3)
  //  legA는 M쪽이 **끝**(순방향 순회로 경계에서 멈춤) · legB는 뒤집으면 M쪽이 **앞**(fromEnd로 자름)
  //  ★★★143-e 시작 끝면 — 직선 체제에서 나선 참 종단면과 **몇 도 어긋나는가**(곡선 체제는 접선 출발이라 0).
  //   ⛔현도 *"쉘과 직선통로 1 사이의 틈이 생겼어"*의 진범: 옵션을 안 주면 끝면이 진행 방향에 수직으로
  //    잘려 참 종단면과 이 각도만큼 벌어진다 = 쐐기 틈. ★137 ①이 이미 `tan0`+`scale0`로 푼 자리인데
  //    1p2 관은 `buildLinkParts`가 옵션 없이 지어 그 경로를 못 탔다.
  const startKinkDeg = LK2_ON
    ? Math.abs(Math.atan2(E1s[1] - P0[1], E1s[0] - P0[0]) - Math.atan2(T0[1], T0[0])) * 180 / Math.PI
    : 0
  const legA = { pts: biteStart(trimAt(legA0.pts, M, rStopA, false), LNK_BITE), R: legA0.R }
  const legBp = trimAt(legB0.pts.slice().reverse(), M, rStopB, true)
  const legB = { pts: legBp, R: legB0.R }
  //  미니 첨탑: 닫힌 원통 — 두 다리의 내부고를 다 품어야 한다
  const tw = {
    rIn: LNK_M_RIN, rOut: LNK_M_RIN + LNK_TWR_T,               // 벽 = 첨탑 살 두께 승계(관이 아니라 '탑')
    yTop: y1 + LNK_H + LNK_WALL_T,                             // 둘째 다리 천장 위
    //  ★★★139: 원뿔대 체제에서 벽의 원기둥 부분은 **바닥 슬래브 밑면**에서 끝난다(파생 — 노브 아님).
    //   구 체제는 `LNK_FOOT_DROP`만큼 더 내려가 걷는 바닥 밑에 죽은 자락 4.5를 남겼다(현도 적발).
    //  ⛔★★★143-e 공면 제거(현도 *"외부에서 봤을 때는 그대로 있어 … 어정쩡하게 그냥 붙어있어서"*):
    //   첨탑 밑면이 **관 바닥 밑면과 정확히 같은 평면**(y111)이었다 → 두 면이 겹쳐 실틈·깜빡임으로 보인다.
    //   `BRG_SINK` 어법(프로젝트 표준 공면 회피)으로 첨탑을 그만큼 **더 내려** 관 바닥이 첨탑 살에 묻히게 한다.
    //   ⚠조형 변화 0.05 — 원뿔대 높이만 그만큼 길어진다(밑 y는 노브 그대로).
    yBot: LNK_CONE_ON ? y0 - LNK_FLOOR_T - BRG_SINK
          : (LNK_FOOT === 'dome' ? domeYAt(LNK_M_R) : y0 - LNK_FLOOR_T - LNK_FOOT_DROP),
    //  ★원뿔대(아래로 좁아짐) — 위 = 원기둥 끝(rOut·rIn 그대로) · 아래 = LNK_CONE_R.
    //   ⚠안반경은 **수평 벽두께 보존**으로 파생한다(rIn = rOut − LNK_TWR_T). 밑에서도 살 두께가 같다.
    cone: LNK_CONE_ON ? {
      yTop: y0 - LNK_FLOOR_T - BRG_SINK, yBot: LNK_CONE_Y,   // ★143-e 위 = 원기둥 끝(내려간 값 그대로 물려받는다)
      rOut: LNK_CONE_R, rIn: Math.max(0.05, LNK_CONE_R - LNK_TWR_T),
      h: (y0 - LNK_FLOOR_T - BRG_SINK) - LNK_CONE_Y,
      wallDeg: Math.atan2((y0 - LNK_FLOOR_T) - LNK_CONE_Y, (LNK_M_RIN + LNK_TWR_T) - LNK_CONE_R) * 180 / Math.PI,
    } : null,
    newel: LNK_NEWEL_R,
  }
  //  나선: 뉴얼~안벽 중간반경에서 디딤을 재 한 바퀴 단수를 얻는다(닫힌 식 — 표본 없음)
  //  ★★130-g 나선을 **두 문 사이에** 건다(현도: "수평 통로→경유지 후 나선 계단 가는 부분 바닥이 없다").
  //   구판은 계단이 임의 방위에서 시작·종료해 문 앞이 허공이었다. → 문 방위에서 **층계참**으로 받고,
  //   계단은 그 사이만 돈다(★122-e 나선 층계참과 같은 어법: 참 반각 = asin(문반폭/안반경) + 마진).
  const azIn = Math.atan2(legA.pts[legA.pts.length - 1][1] - M[1], legA.pts[legA.pts.length - 1][0] - M[0])
  const azOut = Math.atan2(legBp[0][1] - M[1], legBp[0][0] - M[0])
  const landAz = Math.asin(Math.min(0.95, LNK_HW / tw.rIn)) + 0.055
  //  계단 구간 = (진입 참 끝) → (진출 참 시작), CCW로 한 바퀴 안쪽에서 닫는다
  let sweep = ((azOut - landAz) - (azIn + landAz))
  while (sweep <= 0.6) sweep += Math.PI * 2
  const rMid = (tw.newel + tw.rIn) / 2
  const stepsTurn = Math.max(6, Math.round(2 * Math.PI * rMid / LNK_TREAD))
  const nSteps = sw => Math.max(2, Math.round(sw / (Math.PI * 2) * stepsTurn))
  const walkOf = sw => Math.atan2(rise / nSteps(sw), sw * rMid / nSteps(sw)) * 180 / Math.PI
  //  ★130-g: 두 문 사이 기본각만으로는 계단이 가팔라진다(실측 146° → 단높이 0.58 · 걷는 선 53°).
  //   상한 35°(하강로 규율) 아래로 내려올 때까지 **한 바퀴씩 더 감는다** — 문 방위는 그대로 유지된다.
  let guard = 0
  while (walkOf(sweep) > LNK_WALK_MAX && guard++ < 6) sweep += Math.PI * 2
  const steps = nSteps(sweep)
  const stepRise = rise / steps
  const turns = sweep / (Math.PI * 2)
  const tread = sweep * rMid / steps
  const walkDeg = Math.atan2(stepRise, tread) * 180 / Math.PI

  //  ★130-b 접합부 명세(다음 조각 = 문 컷의 입력 — "구멍을 생각 안 했다" 반려의 대답):
  //   각 접합의 위치·법선·문 직사각(폭 2·hw × 높이 h)을 지금 파생해 둔다. 컷 조각은 이 표만 읽으면 된다.
  const doorW = 2 * LNK_HW, doorH = LNK_H
  const junctions = [
    { id: 'asc→②', host: '상승 관 +z 벽', p: P0, az: Math.atan2(T0[1], T0[0]), y: y0, w: doorW, h: doorH },
    { id: '②A→탑', host: '미니 첨탑 벽(다리A 방위)', p: legA.pts[legA.pts.length - 1], az: null, y: y0, w: doorW, h: doorH },
    { id: '탑→②B', host: '미니 첨탑 벽(다리B 방위)', p: legBp[0], az: null, y: y1, w: doorW, h: doorH },
    { id: '②B→첨탑', host: '첨탑 정방위 벽', p: [rWall, 0], az: Math.PI, y: y1, w: doorW, h: doorH },
  ]
  return {
    on: LNK_ON, assign: LNK_ASSIGN, y0, y1, rise, P0, T0, P1, T1, rWall, emb: LNK_EMB,
    phiDeg, phiL0deg, phi0deg, phiStepDeg, insideLanding, armDeg, Ploc, Tloc, rc,
    hw: LNK_HW, h: LNK_H, ft: LNK_FLOOR_T, wt: LNK_WALL_T, bite: LNK_BITE, junctions,
    straight: LK2_ON, rStopA, rStopB, startKink: startKinkDeg, land: { R: LK3_R, d: LD.d, iter: LD.iter, resid: LD.resid, RM: RM2, E1: E1s, hwOut: hwOutL, wOut: wOutL },
    two: { M, legA: legA.pts, legB: legBp, LA: plLen(legA.pts), LB: plLen(legBp), RA: legA.R, RB: legB.R,
           tw, rMid, stepsTurn, steps, stepRise, turns, walkDeg, tread, azIn, azOut, landAz, sweep },
  }
}
//  돔 표면(사본 금지용 로컬 — 상수 파생)
function domeYAt(r) {
  const R = 64, H = 49, Y0 = 52
  return Y0 + H * Math.sqrt(Math.max(0, 1 - (r / R) ** 2))
}

// ══ 닫힌 관 빌더 — 직사각 고리 단면을 평면 곡선 위로 스윕(밀봉: 개구 0) ══
//  단면(진행 법선 u, 연직 v): 바깥 고리 4점 · 안 고리 4점. 옆면(바깥·안) + 양 끝 캡(고리) = watertight.
//  caps = [시작 캡, 끝 캡] — ★130-f: **문이 나는 쪽 캡은 짓지 않는다**(상대 몸속으로 열린다).
//   밀봉은 "구멍이 없다"가 아니라 "열린 에지가 없다"이므로, 캡을 뺀 쪽은 상대 부재가 이어받는다.
export function buildLinkTube(pts, yOf, S = linkSpec(), caps = [true, true], opts = {}) {
  //  ★130-b 두께 위계: 바닥 = 매스 1.5(걷는 것) · 벽·천장 = 0.40(감싸는 것 — 나선 외피·상승 관 천장판 승계)
  //  ★★★136 opts.miter: **기본 false = 이 함수의 옛 거동과 한 좌표도 다르지 않다**(★130 무회귀 보장).
  //   true면 꺾임 마디에서 프레임을 **이등분 법선 + 1/cos(θ/2) 신장**으로 잡는다 — 양 벽선이 연장돼 정확히 만난다.
  //   ⛔옛 프레임(중앙차분 o→q)은 두 가지가 다르다: (a) 폭이 cos(θ/2)배로 오므라들고
  //    (b) 세 점 [P0,A1,A2]에서 A1의 방향이 P0→A2 **현**이라 이등분선이 아니다. 조밀 표본 곡선에선 둘 다 무시할 수 있어
  //    ★130은 그대로 두고, 마디가 굵은 지그재그에서만 켠다.
  const hw = S.hw, h = S.h, ft = S.ft, wt = S.wt
  const OUT = [[-hw - wt, -ft], [hw + wt, -ft], [hw + wt, h + wt], [-hw - wt, h + wt]]
  const IN = [[-hw, 0], [hw, 0], [hw, h], [-hw, h]]
  //  ★★★136 opts.tan0 / opts.tan1: 양 끝 프레임의 방향을 **해석 접선**으로 못 박는다(기본 없음 = 옛 거동).
  //   ⛔곡선을 표본으로 훑으면 끝 프레임이 마지막 **현**을 쓴다 — 실측 0.09° 기울었고, 끝 캡이 그만큼 비스듬해
  //    상대 면과 정확히 맞물리지 않았다(시작 쪽은 나선 참 종단면과의 정합이 걸린 자리라 더 중요하다).
  const seg = i => {
    if (i === 0 && opts.tan0) return opts.tan0
    if (i === pts.length - 2 && opts.tan1) return opts.tan1
    let d = sub(pts[i + 1], pts[i]); const L = nrm(d) || 1; return [d[0] / L, d[1] / L]
  }
  //  ★★★137-b opts.yByArc: 높이를 **호길이 비**로 매긴다(기본 false = 옛 거동 · ★130·★133·★136 무회귀).
  //   ⛔`i/(n−1)`은 **점이 등간격일 때만** 호길이 비와 같다. 1p3 ① 관은 양 끝에 전이점을 둬 간격이
  //    1.42 / 27.02 / 1.49로 불균등한데 상승을 1/3씩 나눠 버려 **63.7° → 6.1° → 62.5°**의 계단이 생겼다
  //    (의도값 16.03°). 현도 보고 "나선참 통로 접합부가 굉장히 이상하다"의 진범 — 양 끝이 정확히 그 급경사다.
  const arcF = (() => {
    if (!opts.yByArc) return null
    const c = [0]
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + nrm(sub(pts[i], pts[i - 1])))
    const T = c[c.length - 1] || 1
    return c.map(v => v / T)
  })()
  const frames = pts.map((p, i) => {
    const y = yOf(arcF ? arcF[i] : i / (pts.length - 1))
    //  ★★★137 scale0/scale1: 끝 단면을 **상대 면의 평면으로 비스듬히 자른다**(기본 1 = 옛 거동).
    //   ⛔비스듬히 꽂히는 관의 끝을 축에 수직으로 자르면 한쪽 모서리가 상대 몸속으로 들어가고 반대쪽은 밖으로 튄다
    //    (1p3 ① 관 실측: θ 28.96°에서 각각 1.31). 법선을 그 면의 법선으로 두고 반폭을 1/cos θ 만큼 늘리면
    //    단면이 그 평면 안에 놓이면서 **진짜 폭(축에 수직)은 보존**된다 → 면 위 발자국이 정확히 상대 면을 채운다.
    if (i === 0 && opts.tan0) { const d = opts.tan0, k = opts.scale0 ?? 1; return { p, n: [-d[1] * k, d[0] * k], y } }
    if (i === pts.length - 1 && opts.tan1) { const d = opts.tan1, k = opts.scale1 ?? 1; return { p, n: [-d[1] * k, d[0] * k], y } }
    if (opts.miter) {
      const a = i > 0 ? seg(i - 1) : seg(0), b = i + 1 < pts.length ? seg(i) : seg(pts.length - 2)
      const n1 = [-a[1], a[0]], n2 = [-b[1], b[0]]
      let m = [n1[0] + n2[0], n1[1] + n2[1]]; const ml = nrm(m) || 1; m = [m[0] / ml, m[1] / ml]
      const c = dot(m, n1)                                   // = cos(θ/2) — 접힘 각의 반
      //  ⚠발산 가드: θ→180°(되꺾임)면 c→0이라 마이터가 무한대로 뻗는다. 검사가 상한을 박는다.
      const k = 1 / Math.max(c, 0.2)
      return { p, n: [m[0] * k, m[1] * k], y }
    }
    const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]
    let d = sub(q, o); const L = nrm(d) || 1; d = [d[0] / L, d[1] / L]
    return { p, n: [-d[1], d[0]], y }
  })
  const W = (f, [u, v]) => [f.p[0] + f.n[0] * u, f.y + v, f.p[1] + f.n[1] * u]
  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  for (let i = 0; i + 1 < frames.length; i++) {
    const f = frames[i], g = frames[i + 1]
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4
      quad(W(f, OUT[k]), W(g, OUT[k]), W(g, OUT[k2]), W(f, OUT[k2]))   // 바깥면
      //  ⛔★137-h: 안면은 바깥면과 **반대로** 감아야 한다(법선이 터널 쪽을 봐야 안에서 벽이 보인다).
      //   같은 감김이면 법선이 살 속을 향해 FrontSide 컬링에 잘려 나간다 — 부호 있는 부피가 (겉+속)이 되어
      //   전체 검사도 통과해 버리므로 **에지 일관성**으로만 잡힌다.
      quad(W(f, IN[k2]), W(g, IN[k2]), W(g, IN[k]), W(f, IN[k]))       // 안면(관 내부)
    }
  }
  for (const [f, s, on] of [[frames[0], 1, caps[0]], [frames[frames.length - 1], -1, caps[1]]]) {  // 끝 캡 = 고리
    if (!on) continue
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4
      //  ⛔★137-h: 시작 캡의 법선은 −t, 끝 캡은 +t다. 두 순서가 서로 바뀌어 있었다.
      if (s > 0) quad(W(f, OUT[k]), W(f, OUT[k2]), W(f, IN[k2]), W(f, IN[k]))
      else quad(W(f, OUT[k2]), W(f, OUT[k]), W(f, IN[k]), W(f, IN[k2]))
    }
  }
  return toGeo(pos)
}

// ══ 미니 첨탑 — 닫힌 원통(벽 + 지붕 + 바닥) ══
export function buildLinkTower(S = linkSpec(), SEG = 48) {
  const T = S.two.tw, pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const P = (r, y, k) => { const a = (k % SEG) / SEG * Math.PI * 2; return [T.rOut === r || T.rIn === r ? r * Math.cos(a) : r * Math.cos(a), y, r * Math.sin(a)] }
  const at = (r, y, k) => { const a = (k % SEG) / SEG * Math.PI * 2; return [S.two.M[0] + r * Math.cos(a), y, S.two.M[1] + r * Math.sin(a)] }
  //  ★★130-f 문 2개: 다리 A(도착·y0)·다리 B(출발·y1)의 방위에서 벽을 그 높이 대역만 뚫는다.
  //   벽이 곡면이라 자르개 CSG 대신 **면을 안 짓는 방식**(개구 경계에 마구리 캡을 세워 watertight 유지).
  const doors = LNK_DOOR_ON ? [
    { az: Math.atan2(S.two.legA[S.two.legA.length - 1][1] - S.two.M[1], S.two.legA[S.two.legA.length - 1][0] - S.two.M[0]), y: S.y0 },
    { az: Math.atan2(S.two.legB[0][1] - S.two.M[1], S.two.legB[0][0] - S.two.M[0]), y: S.y1 },
  ] : []
  const halfAz = Math.asin(Math.min(0.95, LNK_DOOR_HW / T.rIn))
  const inDoor = (a, y0d, y1d) => doors.some(d => {
    let da = Math.abs(((a - d.az + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    return da < halfAz && y0d >= d.y - 1e-9 && y1d <= d.y + LNK_DOOR_H + 1e-9
  })
  const mid = k => ((k + 0.5) % SEG) / SEG * Math.PI * 2
  const bands = [[T.yBot, S.y0], [S.y0, S.y0 + LNK_DOOR_H], [S.y0 + LNK_DOOR_H, S.y1], [S.y1, S.y1 + LNK_DOOR_H], [S.y1 + LNK_DOOR_H, T.yTop]]
    .filter(([a, b]) => b - a > 1e-6)
  for (let k = 0; k < SEG; k++) {
    for (const [ya, yb] of bands) {
      if (inDoor(mid(k), ya, yb)) continue
      quad(at(T.rOut, ya, k), at(T.rOut, yb, k), at(T.rOut, yb, k + 1), at(T.rOut, ya, k + 1))                     // 바깥벽
      quad(at(T.rIn, ya, k), at(T.rIn, yb, k), at(T.rIn, yb, k + 1), at(T.rIn, ya, k + 1))                         // 안벽
    }
    //  개구 마구리(벽 두께 단면) — 방위 경계·상하 경계
    for (const [ya, yb] of bands) {
      const now = inDoor(mid(k), ya, yb), nxt = inDoor(mid(k + 1), ya, yb), prv = inDoor(mid(k - 1 + SEG), ya, yb)
      if (now && !nxt) quad(at(T.rIn, ya, k + 1), at(T.rIn, yb, k + 1), at(T.rOut, yb, k + 1), at(T.rOut, ya, k + 1))
      if (now && !prv) quad(at(T.rOut, ya, k), at(T.rOut, yb, k), at(T.rIn, yb, k), at(T.rIn, ya, k))
    }
    for (const y of [S.y0, S.y0 + LNK_DOOR_H, S.y1, S.y1 + LNK_DOOR_H]) {
      const below = bands.find(([a, b]) => Math.abs(b - y) < 1e-9), above = bands.find(([a]) => Math.abs(a - y) < 1e-9)
      if (!below || !above) continue
      const db = inDoor(mid(k), below[0], below[1]), da = inDoor(mid(k), above[0], above[1])
      if (db !== da) quad(at(T.rIn, y, k), at(T.rIn, y, k + 1), at(T.rOut, y, k + 1), at(T.rOut, y, k))
    }
    const _skip = 0
    quad(at(T.rOut, T.yTop, k), at(T.rIn, T.yTop, k), at(T.rIn, T.yTop, k + 1), at(T.rOut, T.yTop, k + 1))         // 지붕 고리
    //  ★★★139 원뿔대: 원기둥 밑(yBot = 바닥 슬래브 밑면)에서 아래로 좁아진다.
    //   ⚠원뿔대가 켜지면 **밑 고리·밑 슬래브는 원뿔대 밑으로 내려간다**(여기서 닫으면 이중 바닥).
    if (T.cone) {
      const C0 = T.cone
      const ap = (r, y, kk) => at(r, y, kk)
      quad(ap(T.rOut, C0.yTop, k), ap(C0.rOut, C0.yBot, k), ap(C0.rOut, C0.yBot, k + 1), ap(T.rOut, C0.yTop, k + 1))   // 원뿔 바깥벽
      quad(ap(C0.rIn, C0.yBot, k), ap(T.rIn, C0.yTop, k), ap(T.rIn, C0.yTop, k + 1), ap(C0.rIn, C0.yBot, k + 1))       // 원뿔 안벽
      quad(ap(C0.rOut, C0.yBot, k), ap(C0.rIn, C0.yBot, k), ap(C0.rIn, C0.yBot, k + 1), ap(C0.rOut, C0.yBot, k + 1))   // 밑 고리
      tri([S.two.M[0], C0.yBot, S.two.M[1]], ap(C0.rIn, C0.yBot, k + 1), ap(C0.rIn, C0.yBot, k))                       // 밑 슬래브
    } else {
      quad(at(T.rOut, T.yBot, k), at(T.rIn, T.yBot, k), at(T.rIn, T.yBot, k + 1), at(T.rOut, T.yBot, k + 1))         // 밑 고리
      tri([S.two.M[0], T.yBot, S.two.M[1]], at(T.rIn, T.yBot, k + 1), at(T.rIn, T.yBot, k))
    }
    //  지붕 슬래브(밀봉 — 안쪽을 덮는다)
    tri([S.two.M[0], T.yTop, S.two.M[1]], at(T.rIn, T.yTop, k), at(T.rIn, T.yTop, k + 1))
  }
  return toGeo(pos)
}

// ══ 미니 첨탑 안 나선 — 뉴얼 기둥 + 부채꼴 디딤(★58 어휘) ══
export function buildLinkStair(S = linkSpec(), SEG = 24) {
  const T = S.two.tw, W = S.two, pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const cx = W.M[0], cz = W.M[1]
  //  뉴얼(기둥) — 닫힌 원기둥
  for (let k = 0; k < SEG; k++) {
    const a0 = k / SEG * Math.PI * 2, a1 = (k + 1) / SEG * Math.PI * 2
    const p = (a, y) => [cx + T.newel * Math.cos(a), y, cz + T.newel * Math.sin(a)]
    quad(p(a0, S.y0), p(a0, S.y1 + 0.4), p(a1, S.y1 + 0.4), p(a1, S.y0))
    tri([cx, S.y1 + 0.4, cz], p(a0, S.y1 + 0.4), p(a1, S.y1 + 0.4))
    tri([cx, S.y0, cz], p(a1, S.y0), p(a0, S.y0))
  }
  //  ★★130-g 층계참 2기 — 두 문 앞의 **평평한 바닥**(없으면 문을 나서자마자 허공이다. 현도 실측 반려)
  //  full=true면 옆 마구리를 세우지 않는다(고리 한 바퀴 — 시작·끝이 같은 자리라 마구리가 내부에 갇힌다)
  const sector = (a0, a1, yTop, n = 10, full = false) => {
    const R0 = T.newel - 0.05, R1 = T.rIn + 0.05, yb = yTop - S.ft
    const c = (a, r, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)]
    for (let j = 0; j < n; j++) {
      const b0 = a0 + (a1 - a0) * j / n, b1 = a0 + (a1 - a0) * (j + 1) / n
      quad(c(b0, R0, yTop), c(b0, R1, yTop), c(b1, R1, yTop), c(b1, R0, yTop))   // 밟는 면
      quad(c(b0, R0, yb), c(b1, R0, yb), c(b1, R1, yb), c(b0, R1, yb))           // 밑면
      quad(c(b0, R1, yb), c(b1, R1, yb), c(b1, R1, yTop), c(b0, R1, yTop))       // 바깥 마구리
      quad(c(b0, R0, yb), c(b0, R0, yTop), c(b1, R0, yTop), c(b1, R0, yb))       // 안 마구리
    }
    if (!full) {
      quad(c(a0, R0, yb), c(a0, R1, yb), c(a0, R1, yTop), c(a0, R0, yTop))       // 옆 마구리
      quad(c(a1, R0, yTop), c(a1, R1, yTop), c(a1, R1, yb), c(a1, R0, yb))
    }
  }
  //  ★★130-h(현도: "경유지 바닥이 절반만 가려지고 나머지는 아래가 보인다 — 꽉 채워줘"):
  //   진입 레벨은 **한 바퀴 통째로** 깐다(참 사각만 깔면 나머지 방위가 뚫려 밑동까지 내려다보인다).
  //   ⚠진출 레벨(y1)은 참 사각 그대로 — 거기까지 채우면 계단통 자체가 덮인다.
  sector(0, Math.PI * 2, S.y0, 48, true)                      // 진입 바닥 = 고리 전면(뉴얼 ~ 안벽)
  sector(W.azOut - W.landAz, W.azOut + W.landAz, S.y1)        // 진출 참(둘째 다리와 같은 높이)

  //  디딤 = 부채꼴 프리즘(뉴얼 → 안벽). 계단 구간은 **두 참 사이**만 돈다.
  const dA = W.sweep / W.steps, tT = W.stepRise, a00 = W.azIn + W.landAz
  for (let i = 0; i < W.steps; i++) {
    const a0 = a00 + i * dA, a1 = a0 + dA * 1.02   // 1.02 = 이웃 디딤과 살짝 겹쳐 틈 방지
    const yb = S.y0 + i * W.stepRise, yt = yb + tT
    const R0 = T.newel - 0.05, R1 = T.rIn + 0.05
    const c = (a, r, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)]
    const N = 4
    for (let j = 0; j < N; j++) {
      const b0 = a0 + (a1 - a0) * j / N, b1 = a0 + (a1 - a0) * (j + 1) / N
      quad(c(b0, R0, yt), c(b0, R1, yt), c(b1, R1, yt), c(b1, R0, yt))        // 윗면(밟는 면)
      quad(c(b0, R0, yb), c(b1, R0, yb), c(b1, R1, yb), c(b0, R1, yb))        // 밑면
      quad(c(b0, R1, yb), c(b1, R1, yb), c(b1, R1, yt), c(b0, R1, yt))        // 바깥 마구리
      quad(c(b0, R0, yb), c(b0, R0, yt), c(b1, R0, yt), c(b1, R0, yb))        // 안 마구리
    }
    const e = (a, r, y) => [cx + r * Math.cos(a), y, cz + r * Math.sin(a)]
    quad(e(a0, R0, yb), e(a0, R1, yb), e(a0, R1, yt), e(a0, R0, yt))          // 옆 마구리
    quad(e(a1, R0, yt), e(a1, R1, yt), e(a1, R1, yb), e(a1, R0, yb))
  }
  return toGeo(pos)
}

function toGeo(pos) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}

// ══ 셸별 조립(배정표대로) — 반환 = [{ k, parts:[geo…] }] ══
export function buildLinkParts(S = linkSpec()) {
  if (!S.on) return []
  const out = []
  S.assign.forEach((mode, k) => {
    if (!mode) return
    //  ★130-f 캡 규약: 시작(나선 참) · 끝(첨탑 벽) · 탑 양쪽 — 문이 나는 쪽은 캡을 뺀다.
    const C = LNK_DOOR_ON ? [false, false] : [true, true]
    //  ★141: 배정값은 이제 0(없음)/2(경유지)뿐이다 — ① 단일 곡선 갈래는 삭제됐다.
    const w = S.two
    //  ★★★143-e 직선 체제: 시작 끝면을 **나선 참 종단면의 평면으로** 비스듬히 자른다(★137 ① 어법 승계).
    //   ⚠`scale0 = 1/cos(kink)`은 반폭을 늘려 그 면 위의 발자국을 관 폭에 맞추는 값이다.
    //    참 종단면은 5.40 고정이라 발자국 6.098이 **0.698 넘친다** — ★137 ①과 똑같은 대가(선언된 값).
    //    ⛔넘침을 피하려고 옵션을 빼면 27.674° 쐐기 틈이 돌아온다. 둘 중에는 맞물림이 옳다(현도 판정).
    const R = Math.PI / 180
    const optA = S.straight ? { tan0: S.T0, scale0: 1 / Math.cos(S.startKink * R) } : {}
    out.push({
      k,
      walk: [buildLinkTube(w.legA, () => S.y0, S, C, optA), buildLinkTube(w.legB, () => S.y1, S, C), buildLinkStair(S)],
      solid: [buildLinkTower(S)],
    })
  })
  return out
}
