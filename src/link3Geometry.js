// link3Geometry.js — ★★★137 1p3 셸 → 첨탑 테라스 통로 (2026.08.15 현도 그림 + 리드백 3왕복)
//
//  ★현도 그림(2차판 — 1차판 "수평 이동 후 상승"은 같은 세션에서 폐기):
//   나선 참에서 **직선으로 올라가** 띄운 참에 닿고(① 관), 거기서 다시 올라 테라스 문으로(② 관).
//   ⛔1차판 폐기 사유(Claude 실측 보고 → 현도 수정): 1p3의 배치는 1p4의 **정확한 270° 회전**이다
//    (나선 참 → 정방위 문의 각차가 양쪽 다 40.361°). 그래서 참을 나선 참과 같은 높이에 두면
//    ② 구간이 수평 22.763 / 상승 14.500 / 걷는 선 32.497° — ★133 계단 관과 **소수점까지 같아진다**.
//    ★130 취지("①②③의 복제가 아니라 또 다른 접근법 — C4 대칭을 깨는 것이 목적")에 정면으로 어긋난다.
//    → 현도가 참을 띄워 상승 14.50을 **두 구간에 나눴다**(8.60 + 5.90). 그 순간 수치 일치가 깨진다.
//
//  ★현도 확정: 참 안쪽 면 반경 45.4 · 참 걷는 면 y121.1 · 참 판은 **② 축(방위 270°) 정렬** · 크기는 **관 외곽 폭 파생(틈 0)**.
//  ★★그 둘의 귀결 = **깊이가 자기를 부르는 방정식**. ①이 참의 −x 변에 비스듬히 꽂히므로
//    d(깊이) → ① 끝점 = 그 변의 중점 → θ(비스듬 각) → d = wOut / cos θ.  고정점 반복으로 닫는다.
//    ⚠해석해가 없는 건 아니지만(1변수 초월방정식), 반복이 6회에 1e-9로 수렴하고 **표본 의존이 없다** —
//     닫힌 식이 아니라 **닫힌 조건**이 정본이고, spec이 잔차를 들고 다녀 검사가 수렴을 박는다.
//
//  ★어휘 승계(현도: "1p4랑 비슷하게 — 통로 어휘도, 기둥과 아치도 전부 유사하게"):
//   · 관 = `buildLinkTube`(★130/★136 가족 — 경사 관. 단면·두께 위계 전부 `linkSpec()`에서 받는다)
//   · 참·기둥 = ★133 어법(`BRG_LAND_T`·`BRG_COL_*`·`BRG_SEAT`·`BRG_EMB_TOP`)
//   · 아치 = ★136-c/d 어법(`buildSweptArch`·`splitRuns`·`archY` — 전부 link4Geometry에서 **재사용**, 사본 0)
//
//  ★★아치 유도가 여기서 **일반화된다**: 1p4는 소핏이 수평이라 제어점이 C=(0,yJ)로 퇴화했지만
//   ① 관은 16.03° 오르막이라 소핏이 기울어 있다. ★133-b의 두 접선 조건을 다시 풀면 **C.y = yJ + m·L**
//   (m = 소핏 기울기 · s는 기둥 면에서 잰 평면 호길이) → `archY({L, yJ, yC, yB})`. 수평이면 yC = yJ로 퇴화한다.
//
//  ⚠사본 금지: P0·접선·단면 = `linkSpec()`(셸0 프레임을 k=3으로 회전) · 문 = `wellWallR()` · 돔 = `bridgeDomeY()` ·
//   참·기둥 규격 = ★133 상수. 45.4·121.1 **말고는** 손 좌표가 없다(그 둘은 현도 값).
//  ⚠밀봉: 이 판의 개구는 0이다(문 컷 = 다음 조각 — ★133·★136 어법).
//  ⚠보존계: LK3_ON=false 한 줄이면 전부 소등.
import * as THREE from 'three'
import { linkSpec, buildLinkTube, rotShellK, landingDepth } from './linkPassageGeometry.js'
import { archY, buildSweptArch, splitRuns, orientOutward } from './link4Geometry.js'
import { bridgeDomeY } from './bridgeComplexGeometry.js'
import { wellWallR } from './spireGeometry.js'
import {
  LK3_ON, LK3_KS, LK3_BASE_K, LK3_R, LK3_Y, LK3_SINK, LK3_START, LK3_ARC_ON, LK3_ARC_S, LK3_ARC_SEG, LK3_ARC_KINK,
  LK3_ARC2_ON, LK3_ARC2_S, LK3_SHELL_ON, LK3_SHELL_LAP, LK3_COL_FIT, LK3_COL_EMB, LK3_COL_N, LK3_ARC_EMB, LK3_ARC_WF, LK3_ARC2_WF, LK3_ARC_K, LK3_ARC2_K,
  LNK_EMB, SPT_Y, BRG_LAND_T, BRG_COL_W, BRG_COL_D, BRG_SEAT, BRG_EMB_TOP, BRG_ARCH_UPB, BRG_SINK,
} from './constants.js'

const nrm = a => Math.hypot(a[0], a[1])
//  셸0 프레임(315°) → 셸 k 프레임. ★132 규약: k 회전 = **+90°k**(꽃잎 k와 45° 어긋난 LNK k다).
const ROT_K = LK3_BASE_K                            // ★141: 기준 프레임(=3) — 셸 225° · 첨탑 문 270°
//  ★★★143: 회전은 `rotShellK`(linkPassageGeometry)로 내렸다 — 1p2도 같은 규약을 쓴다(사본 0).
const rotK = (p, k = ROT_K) => rotShellK(p, k)

//  ★★★141 다중 마운트: 이 모듈은 **기준 프레임 하나**에서만 짓는다(참·기둥·② 관이 방위 270° 축에
//   정렬돼 있으므로 spec 자체를 k로 일반화하면 식이 전부 갈라진다). 대신 완성된 기하를 **회전해서** 단다.
//   회전이 근사가 아니라 **정확한** 이유: 이 통로가 참조하는 것이 전부 회전 불변이다 —
//   돔(`bridgeDomeY`는 반경의 함수) · 첨탑 벽(`wellWallR`, C4 이상) · 나선 참(셸0 프레임을 k로 돌려 받는다).
//   ⚠그래서 k별 치수 분화가 필요해지면 회전이 아니라 `link3Spec({ R, Y, … })`를 k마다 부르는 쪽으로 간다.
export const link3RotY = (k) => -((k - LK3_BASE_K) * Math.PI / 2)
//  마운트 목록 — [{ k, rotY }]. LK3_ON=false면 빈 배열.
export function link3Mounts() {
  if (!LK3_ON) return []
  return LK3_KS.map(k => ({ k, rotY: link3RotY(k) }))
}

// ── 스펙(전부 파생 — 현도 값 둘 말고는 하드코딩 0) ──
export function link3Spec(o = {}) {
  const L = o.link ?? linkSpec()
  const hw = L.hw, h = L.h, ft = L.ft, wt = L.wt
  const hwOut = hw + wt, wOut = 2 * hwOut
  const P0 = rotK(L.P0), T0 = rotK(L.T0)             // 1p3 나선 참 접합부와 그 접선
  const y0 = L.y0
  const R = o.R ?? LK3_R, Y = o.Y ?? LK3_Y
  const sink = o.sink ?? LK3_SINK
  const rDoor = wellWallR(SPT_Y, { forceSpire: true }) - LNK_EMB   // 문 매몰면(틈 금지 — ★128 어법)

  //  ★★깊이가 자기를 부르는 방정식: d → 끝점 → θ → d.  잔차를 들고 나가 검사가 수렴을 박는다.
  //  ★★★143: 식 자체는 `landingDepth`(linkPassageGeometry)로 내렸다 — 1p2가 같은 d를 써야 하고
  //   두 벌로 두면 갈라진다. 여기는 그 값을 받아 쓰기만 한다(사본 0).
  const { d, iter, resid } = landingDepth({ P0k: P0, R, hwOut, wOut })
  const E1 = [-hwOut, -(R + d / 2)]                  // ① 끝점 = 참 −x 변의 중점(비스듬 꽂힘의 중심)
  const u1 = [E1[0] - P0[0], E1[1] - P0[1]], L1 = nrm(u1)
  const az1 = Math.atan2(u1[1], u1[0]) * 180 / Math.PI
  const t0deg = Math.atan2(T0[1], T0[0]) * 180 / Math.PI
  const wrap = a => { let v = a % 360; if (v > 180) v -= 360; if (v < -180) v += 360; return v }
  const kink = wrap(az1 - t0deg)                     // 나선 참에서의 꺾임
  const turn = wrap(90 - az1)                        // 참에서의 회전(② 는 +z = az 90°로 나간다)
  const theta = Math.abs(az1)                        // ① 이 −x 면에 비스듬한 각
  const foot = wOut / Math.cos(theta * Math.PI / 180)  // 그 면 위 발자국 = d 와 같아야 한다(틈 0)

  //  ② 관: 참 안쪽 면 → 테라스 문(반경 방향, az 270° 축). 참 속으로 sink 관입(공면 방지)
  const leg2 = [[0, -(R + sink)], [0, -rDoor]]
  const L2 = R + sink - rDoor
  const rise1 = Y - y0, rise2 = SPT_Y - Y
  const walk1 = Math.atan2(rise1, L1) * 180 / Math.PI
  const walk2 = Math.atan2(rise2, L2) * 180 / Math.PI

  //  참 판(② 축 정렬): x ∈ ±hwOut(접선 방향) · z ∈ [−(R+d), −R](반경 방향) · 두께 = ★133 어법
  const landT = o.landT ?? BRG_LAND_T
  const land = { x0: -hwOut, x1: hwOut, z0: -(R + d), z1: -R, yTop: Y, yBot: Y - landT, d, w: wOut }
  //  기둥(참 중앙 밑 — ★133 어법): 반경 방향 폭 = BRG_COL_W(z) · 접선 방향 = BRG_COL_D(x)
  const colC = [0, -(R + d / 2)]
  //  ★137-d ⓐ 기둥 단면 = 관 외곽 폭 파생(참과 같은 논리). 두 아치가 전부 기둥에 얹히고 교차가 기둥 속에 묻힌다.
  const colFit = o.colFit ?? LK3_COL_FIT
  //  ★137-e: 기둥 발자국 = **참 발자국과 동일**(x 관 외곽 폭 · z 참 깊이). 그래야 비스듬한 아치 캡이 안에 내접한다.
  const colW = colFit ? d : BRG_COL_W, colD = colFit ? wOut : BRG_COL_D
  //  ⚠기둥 머리: fit이면 기둥 옆면이 참 옆면과 **같은 평면**(x = ±관 외곽 반폭)이 된다.
  //   그 상태로 참 살 속에 매몰(EMB_TOP)시키면 같은 법선의 면이 겹쳐 z-fighting이 난다 →
  //   fit일 때는 머리를 참 밑면에 **정확히 맞춘다**(맞닿되 겹치지 않음 · 법선이 서로 반대라 틈도 안 보인다).
  const col = { cx: colC[0], cz: colC[1], w: colW, dd: colD, fit: colFit, emb: LK3_COL_EMB, n: LK3_COL_N,
    top: colFit ? land.yBot : land.yBot + BRG_EMB_TOP, domeY: bridgeDomeY(Math.hypot(colC[0], colC[1])) }

  return {
    on: o.on ?? LK3_ON, k: ROT_K, P0, T0, t0deg, y0, R, Y, rDoor, sink,
    hw, h, ft, wt, hwOut, wOut,
    d, iter, resid, E1, L1, az1, kink, turn, theta, foot,
    start: o.start ?? LK3_START,
    //  ★끝 프레임을 상대 면의 평면으로 돌리므로, 그 비틀림이 관 전체에 번지지 않게 양 끝에 전이점을 둔다.
    //   ⛔전이 길이는 임의가 아니다: 수직 단면의 **안쪽 모서리가 그 평면을 넘지 않는** 최소값이 있다.
    //    모서리의 면 방향 돌출 = 외곽 반폭·sin θ 이고 진행이 cos θ 이므로 **ε = 외곽 반폭 · tan θ**.
    //    그보다 짧으면 관이 상대 몸속으로 얇게 삐져 들어간다(ε 0.02로 두고 실측해 적발).
    eps0: hwOut * Math.tan(Math.abs(kink) * Math.PI / 180),
    eps1: hwOut * Math.tan(theta * Math.PI / 180),
    leg1: (() => { const u = [(E1[0] - P0[0]) / L1, (E1[1] - P0[1]) / L1]
      const e0 = hwOut * Math.tan(Math.abs(kink) * Math.PI / 180)
      const e1 = hwOut * Math.tan(theta * Math.PI / 180)
      return [P0, [P0[0] + u[0] * e0, P0[1] + u[1] * e0], [E1[0] - u[0] * e1, E1[1] - u[1] * e1], E1] })(),
    leg1Chord: [P0, E1], leg2, L2, rise1, rise2, walk1, walk2,
    startOverflow: wOut / Math.cos(Math.abs(kink) * Math.PI / 180) - wOut,
    land, col,
    arch: legArch({ o: { ...o, __nFace: [1, 0] }, A0: [col.cx - col.dd / 2, col.cz], join: E1, uOut: [(P0[0] - E1[0]) / L1, (P0[1] - E1[1]) / L1],
      legLen: L1, m: rise1 / L1, landBot: land.yBot, colDomeY: col.domeY,
      hwOut: hwOut * (o.archWf ?? LK3_ARC_WF), wf: o.archWf ?? LK3_ARC_WF, K: o.archK ?? LK3_ARC_K,
      on: o.archOn ?? LK3_ARC_ON, ask: o.archS ?? LK3_ARC_S, kink: o.archKink ?? LK3_ARC_KINK, seg: o.archSeg ?? LK3_ARC_SEG }),
    //  ★★137-c ⓐ 같은 기둥의 **+z 면**에서 ② 관 밑을 따라 문 쪽으로
    arch2: legArch({ o: { ...o, __nFace: [0, -1] }, A0: [col.cx, col.cz + col.w / 2], join: [0, land.z1], uOut: [0, 1],
      legLen: L2, m: rise2 / L2, landBot: land.yBot, colDomeY: col.domeY,
      hwOut: hwOut * (o.arch2Wf ?? LK3_ARC2_WF), wf: o.arch2Wf ?? LK3_ARC2_WF, K: o.arch2K ?? LK3_ARC2_K,
      on: o.arch2On ?? LK3_ARC2_ON, ask: o.arch2S ?? LK3_ARC2_S, kink: o.archKink ?? LK3_ARC_KINK, seg: o.archSeg ?? LK3_ARC_SEG }),
    shell: { on: o.shellOn ?? LK3_SHELL_ON, lap: LK3_SHELL_LAP,
      yIn: Y + h, yTop: Y + h + wt, yBot: Y - ft,
      //  ① 내부 개구가 −x 면에서 차지하는 z 대역(그 바깥 두 띠는 ① 자신의 벽이 잇는다)
      openZ: [-(R + d / 2) - hw / Math.cos(theta * Math.PI / 180), -(R + d / 2) + hw / Math.cos(theta * Math.PI / 180)] },
  }
}

// ── ★137 아치 스펙(두 다리 공용) — 기둥 한 면에서 발원해 그 관 밑면을 따라(★136-c/d 어법) ──
//  ★소핏이 기울어도 성립한다: ★133-b의 두 접선 조건을 호길이 s 위에서 풀면 제어점이 **C = (0, yJ + m·L)**.
//   m = 0(수평)이면 ★136-c 식으로 정확히 퇴화한다.
export function legArch({ o, A0: face, join, uOut, legLen, m, landBot, colDomeY, hwOut, wf, K, on, ask, kink, seg }) {
  //  ★★137-e 발원점을 기둥 면에서 **다리 방향으로 되물려** 살 속에 묻는다(캡이 기둥 면과 공면이 되는 것을 막는다).
  //   ⚠기둥 면·참 면·바깥 끝이 원래 한 직선 위에 있으므로, 되물린 A0도 그 직선 위다 → 경로에 꼭짓점이 없다 = 꺾임 0 보장.
  //  ★★137-e 닫힌 되물림: emb = max(외곽 반폭 · tanθ, 바닥값).
  //   θ = 다리 방향과 기둥 면 법선의 사이각. 비스듬한 다리는 그 값에서 캡이 기둥 안에 **정확히 내접**한다.
  const nFace = o.__nFace ?? [1, 0]
  const cosT = Math.abs(uOut[0] * nFace[0] + uOut[1] * nFace[1])
  const tanT = Math.sqrt(Math.max(0, 1 - cosT * cosT)) / Math.max(cosT, 1e-9)
  const emb = o.archEmb ?? Math.max(hwOut * tanT, LK3_ARC_EMB)
  const A0 = [face[0] - uOut[0] * emb, face[1] - uOut[1] * emb]
  const lead = nrm([join[0] - A0[0], join[1] - A0[1]])   // 기둥·참 밑을 지나는 구간(소핏이 평평한 구간)
  const Lmax = lead + legLen                              // ★상한은 관 자신이다(★136-d 규율)
  const clamped = ask > Lmax
  const L = clamped ? Lmax : ask
  const far = [join[0] + uOut[0] * (L - lead), join[1] + uOut[1] * (L - lead)]
  //  ⛔공선이면 중간점을 넣지 않는다 — 넣으면 길이 0/미소 마디가 생겨 꺾임 채움이 **턱**으로 남는다(★137-d).
  const cross = Math.abs((join[0] - A0[0]) * (far[1] - A0[1]) - (join[1] - A0[1]) * (far[0] - A0[0]))
  const collinear = cross < 1e-9
  const path = collinear ? [A0, far] : [A0, join, far]
  const sArr = collinear ? [0, L] : [0, lead, L]
  return finishLeg({ on, path, sArr, L, lead, Lmax, clamped, ask, hwOut, wf, K, m, landBot, colDomeY, kink, seg, uOut, emb, face, collinear, tanT,
    footY: o.footY })
}
function finishLeg({ on, path, sArr, L, lead, Lmax, clamped, ask, hwOut, wf, K, m, landBot, colDomeY, kink, seg, uOut, emb, face, collinear, tanT, footY }) {
  //  ⚠부호: ①은 바깥으로 갈수록 **내려가고**(나선 참이 낮다), ②는 바깥으로 갈수록 **올라간다**(테라스가 높다).
  //   두 경우 다 "참 밑에서 멀어질수록 소핏이 |m|만큼 변한다"는 같은 식이고, 부호만 다리마다 다르다.
  const sgn = uOut[0] === 0 && uOut[1] === 1 ? +1 : -1     // ② (반경 방향 안쪽 = +z)면 오르막
  const soffit = s => (s <= lead ? landBot : landBot + sgn * m * (s - lead))
  const yJ = soffit(L)
  const yC = yJ - sgn * m * L                              // J에서 소핏과 나란히 합류(★133-b 조건 ⓑ)
  //  ★★★143-c: 발을 **돔이 아닌 다른 부재**에 앉힐 수 있어야 한다(1p2 아치 ②는 첨탑 벽에 묻는다).
  //   ⚠기본은 옛 규약 그대로 — 지정이 없으면 돔 + UPB. 1p3·1p4는 한 글자도 안 바뀐다.
  const yB = Number.isFinite(footY) ? footY : colDomeY + BRG_ARCH_UPB
  const yOfS = archY({ L, yJ, yC, yB, K })
  const { dirs, runs, corners } = splitRuns(path, sArr, kink)
  //  ⚠경로 점 수가 체제에 따라 2 또는 3이므로(lead 0 여부) **인덱스가 아니라 이름**으로 내보낸다
  return { on, path, sArr, L, lead, Lmax, clamped, ask, hwOut, wf, K, m, sgn, soffit, yJ, yC, yB, yOfS, emb, face, collinear, tanT,
    foot: path[0], join: path[path.length - 2], far: path[path.length - 1],
    dirs, runs, corners, yTopOf: s => soffit(s) + BRG_SINK, seg }
}

// ── 조립 — { walk:[{id,geo}], solid:[{id,geo}] } · LK3_ON=false → null ──
function extrude(profile, z0, z1) {
  const sh = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 })
  g.translate(0, 0, z0)
  return g
}
export function buildLink3(S = link3Spec()) {
  if (!S.on) return null
  const walk = [], solid = []
  //  ① 관(나선 참 → 참) — 시작 캡 없음: 나선 참 종단 캡이 이미 열려 있고 이 관이 밀봉을 이어받는다(★136 근거).
  //  ★137 끝면 비스듬 절단: 참 쪽은 −x 면의 평면(법선 +x)으로 자르고 반폭을 1/cos θ 늘린다 → 발자국 = 참 깊이(틈 0).
  //   시작 쪽은 나선 참 종단면(법선 T0)으로 자른다. ⚠그 면은 5.40 고정이라 비스듬 발자국 6.10이 **0.70 넘친다**
  //   (직선이 강제하는 대가 — ★136에서 곡선을 고른 것과 같은 갈림. `LK3_START='square'`면 수직 절단으로 되돌린다).
  const sc = 1 / Math.cos(S.theta * Math.PI / 180)
  const st = S.start === 'oblique'
    ? { tan0: S.T0, scale0: 1 / Math.cos(S.kink * Math.PI / 180) } : {}
  walk.push({ id: 'tube1', geo: buildLinkTube(S.leg1, t => S.y0 + S.rise1 * t, S, [false, true],
    { ...st, tan1: [1, 0], scale1: sc, yByArc: true }) })
  //  ② 관(참 → 테라스 문) — 양 끝 캡(개구 0 · 문 컷 = 다음 조각)
  walk.push({ id: 'tube2', geo: buildLinkTube(S.leg2, t => S.Y + S.rise2 * t, S, [true, true], { yByArc: true }) })
  //  ③ 참 판 — ② 축 정렬 직사각(x = 접선 · z = 반경). ExtrudeGeometry는 (x,y) 단면을 z로 미므로 그대로 맞는다.
  walk.push({ id: 'landing', geo: extrude(
    [[S.land.x0, S.land.yBot], [S.land.x1, S.land.yBot], [S.land.x1, S.land.yTop], [S.land.x0, S.land.yTop]],
    S.land.z0, S.land.z1) })
  //  ④ ★137-d ⓑ 기둥 1기 — 빌더는 아래 `buildDomeFootColumn`으로 뺐다(★143에서 1p2도 쓴다 · 사본 0).
  solid.push({ id: 'column', geo: buildDomeFootColumn(S.col) })
  //  ⑤ ★★137-c ⓑ 참 감싸기 — 관 어휘 그대로(벽 0.40 · 지붕 0.40 · 내부고 4.72).
  //   −x는 ①이, 안쪽 z는 ②가 이어받는다(★130-f 규약). 모서리는 **겹치게** 만든다 — 틈보다 겹침이 안전하다.
  //   ⛔수리 전 상태: 참은 판 하나뿐이라 위가 통째로 열려 있었다(현도 "참부분 밀봉이 안됐잖아").
  if (S.shell.on) {
    const { x0, x1, z0, z1 } = S.land, { yBot, yTop, lap, openZ } = S.shell
    const hw = S.hw, wt = S.wt
    //  ⓐ +x 벽(막힌 옆구리) — 참 전 깊이
    solid.push({ id: 'shellX', geo: extrude(
      [[hw, yBot], [x1, yBot], [x1, yTop], [hw, yTop]], z0, z1) })
    //  ⓑ 바깥 z 벽(막다른 끝) — 참 전 폭. ①·②가 닿지 않는 유일한 면이라 **캡처럼 통짜**로 막는다
    solid.push({ id: 'shellZ', geo: extrude(
      [[x0, yBot], [x1, yBot], [x1, yTop], [x0, yTop]], z0, z0 + wt) })
    //  ⓒ −x 벽의 **두 모서리 띠** — ① 내부 개구 바깥쪽만. 겹침 lap 만큼 개구 쪽으로 물려 틈을 없앤다
    for (const [a1, b1] of [[z0, openZ[0] + lap], [openZ[1] - lap, z1]]) {
      if (b1 - a1 > 1e-9) solid.push({ id: 'shellXn', geo: extrude(
        [[x0, yBot], [-hw, yBot], [-hw, yTop], [x0, yTop]], a1, b1) })
    }
    //  ⓓ 지붕 — 참 전면. ①·② 지붕과 같은 높이라 모서리에서 맞물린다
    solid.push({ id: 'shellRoof', geo: extrude(
      [[x0, S.shell.yIn], [x1, S.shell.yIn], [x1, yTop], [x0, yTop]], z0, z1) })
  }
  //  ⑥ 아치 둘 — ★136-c/d 공용 빌더에 위임(사본 0)
  if (S.arch.on) solid.push({ id: 'arch', geo: buildSweptArch(S.arch) })
  if (S.arch2.on) solid.push({ id: 'arch2', geo: buildSweptArch(S.arch2) })
  return { walk, solid }
}

// ── ★★★137-d ⓑ / ★143 공용: 돔을 좇는 발을 가진 기둥 ──
//  ⛔옛 판: 상수 반경 프로파일(min|z|)로 앉혀 정점 120개 중 76개가 떠 있었다 = 현도 "그냥 툭 얹혀있음".
//   팔 어법(ARM13_EMBED) 승계 — 표면보다 emb만큼 파고들어 **잘린 자리가 곧 접지선**이 된다.
//  ⚠★137-h: 윗면을 통짜로 두면 옆면(격자 n등분)과 T-교차 44곳이 생겨 실틈이 난다 → 같은 격자로 쪼갠다.
//  ⚠★143: 1p2 기둥은 머리 높이(top)만 다르고 나머지는 같은 규칙이다 → 인자로 받는다(사본 0).
export function buildDomeFootColumn(c) {
  const n = c.n
  const x0 = c.cx - c.dd / 2, x1 = c.cx + c.dd / 2, z0 = c.cz - c.w / 2, z1 = c.cz + c.w / 2
  const X = i => x0 + (x1 - x0) * i / n, Z = j => z0 + (z1 - z0) * j / n
  const yb = (x, z) => bridgeDomeY(Math.hypot(x, z)) - c.emb
  const pos = []
  const tri = (a, b, d) => { for (const q of [a, b, d]) for (const v of q) pos.push(v) }
  const quad4 = (a, b, d, e) => { tri(a, b, d); tri(a, d, e) }
  const top = c.top
  for (let i = 0; i < n; i++) {
    const xa = X(i), xb = X(i + 1)
    quad4([xa, yb(xa, z0), z0], [xb, yb(xb, z0), z0], [xb, top, z0], [xa, top, z0])
    quad4([xb, yb(xb, z1), z1], [xa, yb(xa, z1), z1], [xa, top, z1], [xb, top, z1])
  }
  for (let j = 0; j < n; j++) {
    const za = Z(j), zb = Z(j + 1)
    quad4([x1, yb(x1, za), za], [x1, yb(x1, zb), zb], [x1, top, zb], [x1, top, za])
    quad4([x0, yb(x0, zb), zb], [x0, yb(x0, za), za], [x0, top, za], [x0, top, zb])
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const xa = X(i), xb = X(i + 1), za = Z(j), zb = Z(j + 1)
    quad4([xa, yb(xa, za), za], [xa, yb(xa, zb), zb], [xb, yb(xb, zb), zb], [xb, yb(xb, za), za])
    quad4([xa, top, za], [xb, top, za], [xb, top, zb], [xa, top, zb])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return orientOutward(g)   // ★137-g 안팎 자가 교정
}
