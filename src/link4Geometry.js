// link4Geometry.js — ★★★136 1p4 셸 나선 참 → ★133 복합체 참 접속 통로 (2026.08.15 현도 지시 + 도면 리드백 2왕복)
//
//  ★현도 확정(슬라이더 도면에서 값까지 직접 잡음):
//   · 두 참은 **같은 레벨 y112.50**이다 — ★133이 참 레벨을 `linkSpec().y0`에서 받았으므로 파생이 강제한 일치.
//     따라서 이 관은 LNK 가족 최초의 **완전 수평 관**(rise 0 · 계단 0단).
//   · 두 안을 **다 짓고** 로컬에서 견준다(`LK4_MODE` 한 줄 교체 — 보존계가 아니라 둘 다 정본):
//     ⓐ 'zigzag' = 나선 참에서 **접선 방향 짧은 직선** → 꺾임 → 직선 → 꺾임 → 참에 **수직** 진입(세 마디).
//     ⓑ 'smooth' = ① 어휘 그대로 3차 베지어(양 끝 접선 준수 · 곡률 연속 · 이음매 없음).
//   · 어휘는 ★130 통로 그대로 — 단면·두께 위계·빌더를 전부 `linkPassageGeometry`에서 받는다(사본 금지).
//
//  ⚠**직선과 접선 연속은 동시에 성립하지 않는다**(실측): 나선 참 접선 33.371°를 지킨 직선은 z=−2.70에 닿을 때
//   x = 73.8 — 참 바깥 끝 50.61을 23 지나친다. 그래서 ⓐ는 꺾임을 **받아들이는** 안이고 ⓑ는 직선을 **버리는** 안이다.
//   이 사실이 두 안이 나란히 서는 이유이므로 어느 쪽도 "타협"이 아니다.
//
//  ★도착 창이 좁다(파생): 마지막 마디가 +z로 곧게 꽂히면 관 외곽 폭 5.40이 **x 방향으로 눕는다**.
//   참 깊이는 landD 6.00 → 여유 0.60 → 도착 x 편차 상한 **±0.30**. `LK4_XOFF`는 참 정중앙 기준 편차다.
//
//  ★꺾임 마감 = 마이터(`buildLinkTube(..., { miter: true })`). 옛 중앙차분 프레임을 그대로 쓰면 꺾임에서
//   폭이 cos(θ/2)배로 오므라든다(33.9°면 5.40 → 5.16). ⚠miter 옵션은 **기본 false**라 ★130은 무회귀다.
//
//  ★캡 규약: 시작 캡은 **짓지 않는다** — 나선 참 종단 캡이 이미 열려 있고(`LNK_OPEN_SPIRAL`, extSpiralGeometry
//   L271: k에 무관하게 4셸 전부 열림), 단면이 동일하고 시작면이 그 캡면과 일치하므로 **이 관이 밀봉을 이어받는다**
//   (★130-c BITE=0과 같은 근거). 끝 캡은 짓는다 — 참 쪽 개구는 0(문 컷 = 다음 조각, ★133 어법).
//  ⚠부수 효과: 이 관이 서면 1p4 셸의 열린 종단이 닫힌다. 1p3(k=3)는 **여전히 열려 있다** — 선언된 빚.
//
//  ⚠사본 금지: P0·T0·단면 = linkSpec() · 참 x·z·레벨 = bridgeSpec(). 44.61·47.61·112.50을 적어 넣지 않는다.
//  ⚠보존계: LK4_ON=false 한 줄이면 전부 소등. (검사는 o.on으로 전역 스위치와 무관하게 기하를 시험할 수 있다 —
//   ⛔스윕에서 LK4_ON=false로 두면 검사가 null을 붙잡고 죽었다. 소등 체제에서도 검사는 살아 있어야 한다.)
import { linkSpec, buildLinkTube } from './linkPassageGeometry.js'
import { bridgeSpec } from './bridgeComplexGeometry.js'
import * as THREE from 'three'
import {
  LK4_ON, LK4_MODE, LK4_SEG1, LK4_SEG3, LK4_XOFF, LK4_BEZ_K, LK4_N, LK4_SINK, LK4_JOINT,
  LK4_ARC_ON, LK4_ARC_Z, LK4_ARC_SEG, LK4_ARC_KINK, BRG_SINK, BRG_ARC_EMB,
} from './constants.js'

const nrm = a => Math.hypot(a[0], a[1])
const plLen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L }
const degOf = d => Math.atan2(d[1], d[0]) * 180 / Math.PI
const unit = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], L = nrm(d) || 1; return [d[0] / L, d[1] / L] }

// ── 스펙(전부 파생 — 수치 하드코딩 금지) ──
export function link4Spec(o = {}) {
  const L = o.link ?? linkSpec()
  const B = o.bridge ?? bridgeSpec()
  const y = L.y0                                     // = B.yLand (같은 레벨 — 검사가 항등을 박는다)
  const hwOut = L.hw + L.wt                          // 관 외곽 반폭 2.70
  //  도착 창: 참 안에 관 폭이 수직으로 눕는다 → 중앙 ± (landD/2 − hwOut)
  const xWin = B.landD / 2 - hwOut
  const xOff = o.xOff ?? LK4_XOFF
  const xE = B.xCol + xOff                           // 참 정중앙 기준 편차(중앙 = 기둥 축 x)
  const zFace = -B.wOut / 2                          // 참 −z 변
  const E = [xE, zFace + LK4_SINK]                   // 관입(공면 z-fighting 방지 — BRG_SINK 어법)
  const P0 = L.P0, T0 = L.T0
  const t0deg = degOf(T0)

  //  ⓐ 지그재그 — 세 마디. 마디 방향이 곧 프레임이므로 표본을 넣지 않는다(마디당 두 점).
  const seg1 = o.seg1 ?? LK4_SEG1, seg3 = o.seg3 ?? LK4_SEG3
  const A1 = [P0[0] + T0[0] * seg1, P0[1] + T0[1] * seg1]
  const A2 = [xE, E[1] - seg3]                       // 마지막 마디는 +z로 곧게 — 참에 수직
  const zig = [P0, A1, A2, E]
  const d2 = unit(A1, A2), az2 = degOf(d2)
  const kink1 = az2 - t0deg                          // 첫 꺾임(접선 마디 → 가운데 마디)
  const kink2 = 90 - az2                             // 둘째 꺾임(가운데 마디 → 수직 진입 마디)
  //  마이터 신장 = 1/cos(θ/2) · 바깥 모서리가 중심선에서 벗어나는 거리
  const miterOf = th => hwOut / Math.cos(th * Math.PI / 360)
  const zigMiter = [miterOf(kink1), miterOf(kink2)]

  //  ⓑ 곡선 — ① 어휘(3차 베지어). 도착 접선 = 참에 수직(+z).
  const T1 = [0, 1]                                  // 도착 접선 = 참에 수직(+z) — 두 안 공통
  const ch = nrm([E[0] - P0[0], E[1] - P0[1]]), hh = (o.bezK ?? LK4_BEZ_K) * ch / 3
  const Bz = [P0, [P0[0] + T0[0] * hh, P0[1] + T0[1] * hh], [E[0] - T1[0] * hh, E[1] - T1[1] * hh], E]
  const at = t => { const u = 1 - t
    return [u * u * u * Bz[0][0] + 3 * u * u * t * Bz[1][0] + 3 * u * t * t * Bz[2][0] + t * t * t * Bz[3][0],
            u * u * u * Bz[0][1] + 3 * u * u * t * Bz[1][1] + 3 * u * t * t * Bz[2][1] + t * t * t * Bz[3][1]] }
  const d1 = t => { const u = 1 - t
    return [3 * (u * u * (Bz[1][0] - Bz[0][0]) + 2 * u * t * (Bz[2][0] - Bz[1][0]) + t * t * (Bz[3][0] - Bz[2][0])),
            3 * (u * u * (Bz[1][1] - Bz[0][1]) + 2 * u * t * (Bz[2][1] - Bz[1][1]) + t * t * (Bz[3][1] - Bz[2][1]))] }
  const dd = t => { const u = 1 - t
    return [6 * (u * (Bz[2][0] - 2 * Bz[1][0] + Bz[0][0]) + t * (Bz[3][0] - 2 * Bz[2][0] + Bz[1][0])),
            6 * (u * (Bz[2][1] - 2 * Bz[1][1] + Bz[0][1]) + t * (Bz[3][1] - 2 * Bz[2][1] + Bz[1][1]))] }
  const N = o.N ?? LK4_N
  const smooth = []
  let minR = Infinity, sgn = 0, rev = false
  for (let i = 0; i <= N; i++) {
    const t = i / N
    smooth.push(at(t))
    const a = d1(t), b = dd(t), cr = a[0] * b[1] - a[1] * b[0], sp = nrm(a)
    if (Math.abs(cr) > 1e-9) {
      minR = Math.min(minR, sp * sp * sp / Math.abs(cr))
      if (sgn === 0) sgn = Math.sign(cr); else if (Math.sign(cr) !== sgn) rev = true
    }
  }

  //  ⓒ ★★★143-d 직선(2026.08.17 현도: *"1p4 쉘에서 복합체까지 가는 통로 직선형으로 만들어줘"*)
  //   ★1p2·1p3과 같은 어법으로 통일된다 — 셸 넷 중 셋이 직선 관이 된다.
  //   ⚠대가: 곡선은 양 끝에 **수직으로** 꽂혔지만(접선 준수) 직선은 두 면 다 비스듬해진다.
  //    시작 = 나선 참 종단 캡과 kinkS · 끝 = ★133 참 −z 면과 kinkE. 둘 다 ★137 비스듬 절단으로 받는다
  //    (끝면 반폭을 1/cosθ 늘려 발자국을 면에 맞춘다 — 그만큼 상대 면을 **넘칠 수 있다**. 검사가 잰다).
  const str = [P0, E]
  const dS = unit(P0, E), azS = degOf(dS)
  const kinkS = Math.abs(azS - t0deg)                // 시작: 나선 참 접선과의 사이각
  const kinkE = Math.abs(90 - azS)                   // 끝: 참 수직(+z)과의 사이각
  const secS = 1 / Math.cos(kinkS * Math.PI / 180), secE = 1 / Math.cos(kinkE * Math.PI / 180)
  const straight = { pts: str, L: plLen(str), az: azS, kinkS, kinkE,
    footS: 2 * hwOut * secS, footE: 2 * hwOut * secE,        // 비스듬 절단 발자국(면 위에서의 폭)
    overS: 2 * hwOut * secS - 2 * hwOut, overE: 2 * hwOut * secE - 2 * hwOut }

  const mode = o.mode ?? LK4_MODE
  const pts = mode === 'smooth' ? smooth : mode === 'straight' ? str : zig
  return {
    on: o.on ?? LK4_ON, mode, joint: o.joint ?? LK4_JOINT, y, rise: B.yLand - L.y0,
    P0, T0, T1, t0deg, E, xE, xOff, xWin, zFace, sink: LK4_SINK,
    hw: L.hw, h: L.h, ft: L.ft, wt: L.wt, hwOut,
    zig: { pts: zig, A1, A2, seg1, seg3, az2, kink1, kink2, miter: zigMiter, L: plLen(zig) },
    smooth: { pts: smooth, ctrl: Bz, minR, rev, K: o.bezK ?? LK4_BEZ_K, L: plLen(smooth) },
    straight,
    pts, len: plLen(pts),
    //  검사용 파생: 관 x 최저점이 ★133 계단 관 끝(B.r0)을 넘지 않아야 한다(관끼리 겹침 금지)
    xMinEnd: xE - hwOut, xMaxEnd: xE + hwOut, brgTubeEnd: B.r0, landX0: B.xL0, landX1: B.xL1,
    arch: archSpec({ pts, E, xE, hwOut, y, B, o }),
  }
}

// ── ★★★136-c 접합부 아치 — 관의 평면 곡선을 **따라 휘는** 스윕(평면 아치 아님) ──
//  경로 = [기둥 −z 면] → [관 끝] → 관 중심선을 바깥으로 LK4_ARC_Z까지.
//   ⚠기둥 면(z=−1.50)은 관 끝(z=−2.65)보다 **참 안쪽**이다 — 그 사이 1.15는 참 밑을 지나는 직선 구간이다.
function archSpec({ pts, E, xE, hwOut, y, B, o }) {
  const on = o.archOn ?? LK4_ARC_ON
  //  ★136-d: 아치는 관을 따라가므로 **관보다 멀리 갈 수 없다** — 관 시작(나선 참)의 z가 물리적 상한이다.
  const zMin = pts[0][1]
  const zAsk = o.archZ ?? LK4_ARC_Z
  const clamped = zAsk < zMin
  const zEnd = clamped ? zMin : zAsk
  const zCol = -B.colD / 2                           // 기둥 −z 면(파생)
  const yJ = y - (o.ftOverride ?? B.ft)              // 소핏 = 걷는 면 − 바닥 매스 → B.yLandU와 같은 값
  const yB = B.arch.yB                               // ★133 아치와 **같은 발 높이**(돔 + BRG_ARCH_UPB) — 사본 아님
  //  경로: 기둥 면 → 관 끝 → 관 중심선(역순, z가 zEnd에 닿을 때까지 · 경계점은 정확히 얹는다)
  //  ★★★138 발원 되물림 통일(1p3 ★137-e 규칙): 기둥 면에서 **다리 방향으로** 되물려 캡을 기둥 살 속에 묻는다.
  //   ⛔★138에서 기둥 발자국을 참만큼 넓히자 기둥 −z 면이 **관 끝을 지나쳐** 옛 A0(기둥 면)이 관 바깥으로 나갔다.
  //    → 기준을 기둥 면이 아니라 **관 끝(E)**으로 잡고 거기서 +z(안쪽)로 되물린다. 이 다리는 면에 수직이라 tanθ=0.
  const embA = Math.max(0, BRG_ARC_EMB)
  //  ⚠+z가 기둥 **속**이다. 상한은 기둥의 **+z 면**(−z 면으로 자르면 되물림이 통째로 무효가 된다 — 실측 적발)
  const A0z = Math.min(E[1] + embA, -zCol)
  const path = [[xE, A0z], [E[0], E[1]]]
  const rev = pts.slice().reverse()                  // pts는 나선→참 순서라 뒤집으면 참→나선
  for (let i = 1; i < rev.length; i++) {
    const a = rev[i - 1], b = rev[i]
    if (b[1] <= zEnd) {                              // 경계 통과 — 정확한 교점을 얹고 끝낸다
      const t = (a[1] - zEnd) / Math.max(a[1] - b[1], 1e-12)
      path.push([a[0] + (b[0] - a[0]) * t, zEnd]); break
    }
    path.push([b[0], b[1]])
  }
  //  호길이(기둥 면이 s=0)
  const sArr = [0]
  for (let i = 1; i < path.length; i++) sArr.push(sArr[i - 1] + nrm([path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]]))
  const L = sArr[sArr.length - 1]
  //  ★닫힌형 — ★137 일반화식을 쓴다. 1p4는 소핏이 **수평**이라 yC = yJ이고, 그러면 식이
  //   y = yJ + (yB − yJ)(1 − √(s/L))² 로 정확히 퇴화한다(검사가 두 식의 동치를 실측으로 박는다).
  const yOfS = archY({ L, yJ, yC: yJ, yB, K: o.archK ?? 1 })
  const reach = path[path.length - 1]
  //  ★★136-d 마디 분해(현도: "지그재그되는 부분에도 아치를 적용시키다보니 다면체처럼 보여 —
  //   직선부분에만 아치를 적용시키고, 접하는 부분의 짧은 부분은 직육면체로 채워도 돼").
  //   ⛔진짜 원인은 둘이다: (a) 꺾임에서 마이터로 이어 붙인 것 (b) **지그재그 경로가 점 4개뿐**이라
  //    y(s) 곡선이 3면으로 잘렸다(= 다면체로 보인 주범). 마디를 나누고 **마디 안에서 조밀화**하면 둘 다 없어진다.
  //   → 방향이 LK4_ARC_KINK 이상 꺾이는 자리에서 경로를 **마디로 쪼개고**, 꺾임 자리는 **각기둥 채움**으로 잇는다.
  const { dirs, runs, corners } = splitRuns(path, sArr, o.archKink ?? LK4_ARC_KINK)
  const yTopC = yJ + BRG_SINK
  return { on, yTopOf: () => yTopC, reach0: E[1], zEnd, zEndAsked: o.archZ ?? LK4_ARC_Z, zMin, clamped, zCol, yJ, yB, path, sArr, L, yOfS, rise: yJ - yB, hwOut, reach,
    dirs, runs, corners,
    yTop: yJ + BRG_SINK,                             // 관 바닥 매스 속으로 관입(공면 방지 — BRG_SINK 어법)
    seg: o.archSeg ?? LK4_ARC_SEG }
}

// ── 조립 — { walk:[{id,geo}], solid:[] } · LK4_ON=false → null ──
export function buildLink4(S = link4Spec()) {
  if (!S.on) return null
  //  시작 캡 없음(나선 참 종단이 이미 열려 있다 — 이 관이 밀봉을 이어받는다) · 끝 캡 있음(개구 0)
  const caps = [false, true]
  const yOf = () => S.y                              // 완전 수평 — t와 무관
  //  ★양 끝 프레임 = 해석 접선(현이 아니라) — 시작면은 나선 참 종단면과, 끝면은 참 −z 변과 정확히 맞물려야 한다
  const tan = { tan0: S.T0, tan1: S.T1 }
  //  ★136-c 아치는 걷는 면이 아니다 → solid. 두 안(zigzag·smooth) 다 같은 빌더가 관 곡선을 받아 휜다.
  const arch = buildLink4Arch(S)
  const sol = arch ? [{ id: 'arch', geo: arch }] : []
  if (S.mode === 'smooth') {
    return { walk: [{ id: 'tube', geo: buildLinkTube(S.pts, yOf, S, caps, tan) }], solid: sol }
  }
  //  ★★★143-d 직선 — 마디가 하나뿐이라 마이터가 필요 없다. 양 끝면만 상대 면에 맞춰 **비스듬히** 자른다.
  //   ⚠`scale0`/`scale1` = 1/cos θ: 끝면을 기울인 만큼 반폭을 늘려 발자국이 상대 면 위에서 폭 5.40을 유지하게.
  //    (★137 ① 관과 같은 어법 — 사본이 아니라 같은 옵션 경로다.)
  if (S.mode === 'straight') {
    const R = Math.PI / 180
    return { walk: [{ id: 'tube', geo: buildLinkTube(S.pts, yOf, S, caps, {
      tan0: S.T0, scale0: 1 / Math.cos(S.straight.kinkS * R),
      tan1: S.T1, scale1: 1 / Math.cos(S.straight.kinkE * R),
    }) }], solid: sol }
  }
  if (S.joint === 'butt') {
    //  보존계: 마디를 따로 짓는다(꺾임에 쐐기 틈이 남는다 — 마감 어휘를 바꿀 때의 자리)
    const out = []
    for (let i = 0; i + 1 < S.pts.length; i++) {
      out.push({ id: 'seg' + i, geo: buildLinkTube([S.pts[i], S.pts[i + 1]], yOf, S, [i === 0 ? false : true, true]) })
    }
    return { walk: out, solid: sol }
  }
  return { walk: [{ id: 'tube', geo: buildLinkTube(S.pts, yOf, S, caps, { miter: true, ...tan }) }], solid: sol }
}

// ── ★136-c/d 아치 빌더 — 마디별 스윕 + 꺾임 각기둥 채움 ──
//  ★현도 지시(★136-d): 꺾임 자리는 아치를 굽히지 말고 **직육면체(각기둥)로 채운다**.
//  ⛔그리고 진짜 주범: 지그재그 경로가 점 4개뿐이라 y(s)가 3면으로 잘렸다 → **마디 안에서 조밀화**한다.
//   조밀화 간격 = L / LK4_ARC_SEG. 곡선 안은 애초에 촘촘하지만 같은 규칙을 태워 둘을 한 코드로 다룬다.
function densify(path, i0, i1, step) {
  const out = [path[i0]]
  for (let i = i0; i < i1; i++) {
    const a = path[i], b = path[i + 1]
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1])
    const n = Math.max(1, Math.ceil(seg / step - 1e-9))
    for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])
  }
  return out
}
//  평면 볼록껍질(점 4개 — 단조 사슬)
function hull(ps) {
  const P = ps.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1])
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], hi = []
  for (const q of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q) }
  lo.pop(); hi.pop()
  return lo.concat(hi)
}
//  ★★★137 일반화 — ★133-b의 두 접선 조건을 **소핏이 기울어도** 풀 수 있게 한다.
//   2차 베지어 J=(L, yJ) · C=(0, yC) · B=(0, yB)에서 s(t)=L(1−t)² 이므로 u=√(s/L)로 두면
//     **y(s) = u²·yJ + 2u(1−u)·yC + (1−u)²·yB**
//   조건 ⓐ 기둥에서 수직 발진 → C.s = 0 · 조건 ⓑ J에서 소핏과 나란히 합류 → **C.y = 소핏(s=0)**
//   (소핏이 s에 대해 직선이면 C가 그 직선 위에 오는 것이 곧 접선 조건이다.)
//   ⚠소핏이 수평(yC = yJ)이면 ★136-c의 y = yJ + (yB−yJ)(1−u)² 로 **정확히 퇴화**한다 — 대수로도 검사로도 확인.
//   볼록포 논증도 그대로: J·C가 소핏선 위에 있으므로 곡선 전체가 그 아래 = 스팬드럴 두께 비음수.
//  ★★★137-g 곡률 노브 K: 2차를 **3차로 승격**하고 손잡이를 K배 한다(★130 LNK_BEZ_K 어법).
//   K=1이면 승격 공식(P1 = P0 + ⅔(C−P0) · P2 = P3 + ⅔(C−P3)) 그대로라 **옛 2차와 정확히 같은 곡선**이다(검사가 실증).
//   K<1 = 발 쪽으로 당겨 붙어 **깊고 뾰족해지고**, K>1 = 소핏 쪽으로 부풀어 **얕고 완만**해진다.
//   ⚠두 접선 조건은 불변이다 — 손잡이가 그 접선 위에서만 움직이므로 J의 소핏 합류와 B의 수직 발진은 그대로다.
//   ⚠s(t)가 단조 감소해야 역산이 유일하다: s1 = L(1−2K/3) ≥ 0 → **K ≤ 1.5**에서 보장된다(클램프).
export const archY = ({ L, yJ, yC, yB, K = 1 }) => {
  const k = Math.max(1e-3, Math.min(1.5, K))
  const s1 = L * (1 - 2 * k / 3)
  const y1 = yJ + k * (2 / 3) * (yC - yJ), y2 = yB + k * (2 / 3) * (yC - yB)
  const sOf = t => { const u = 1 - t; return u * u * u * L + 3 * u * u * t * s1 }
  const yOf = t => { const u = 1 - t
    return u * u * u * yJ + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * yB }
  return s => {
    const q = Math.max(0, Math.min(L, s))
    //  s(t)는 단조 감소 → 이분법으로 유일한 t를 찾는다(곡선 표본이 아니라 **근찾기**다 — 결정적이고 1e-13까지 닫힌다)
    let lo = 0, hi = 1
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (sOf(mid) > q) lo = mid; else hi = mid }
    return yOf((lo + hi) / 2)
  }
}

//  ★★★137-g 면 방향 자가 교정 — 닫힌 메시의 **부호 있는 부피**가 음수면 안팎이 뒤집힌 것이다.
//   ⛔실측: 기둥과 1p3 아치 둘이 전면 뒤집혀 있었고(삼각형 282/282), FrontSide 컬링이라 시점에 따라 면이 사라졌다.
//    (현도: "지금 보면 기둥의 면 두개가 안보이거든?") — 감김을 손으로 맞추는 대신 **빌더가 스스로 바로잡게** 한다.
//   ⚠부피가 이미 양수면 한 좌표도 건드리지 않는다 → ★136 무회귀.
export function orientOutward(geo) {
  const a = geo.getAttribute('position'), arr = a.array
  let V = 0
  for (let i = 0; i < a.count; i += 3) {
    const o = i * 3
    const x0 = arr[o], y0 = arr[o + 1], z0 = arr[o + 2]
    const x1 = arr[o + 3], y1 = arr[o + 4], z1 = arr[o + 5]
    const x2 = arr[o + 6], y2 = arr[o + 7], z2 = arr[o + 8]
    V += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6
  }
  if (V >= 0) return geo
  for (let i = 0; i < a.count; i += 3) {
    const o = i * 3
    for (let k = 0; k < 3; k++) { const t = arr[o + 3 + k]; arr[o + 3 + k] = arr[o + 6 + k]; arr[o + 6 + k] = t }
  }
  a.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

//  ★★★137 공용 스윕 빌더 — ★136-c/d의 몸통을 1p4·1p3이 함께 쓴다(사본 금지).
//   A = { path, sArr, L, yOfS, hwOut, yTopOf, seg, runs, corners }
export function buildSweptArch(A) {
  const hw = A.hwOut
  const pos = []
  const tri = (a, b, c) => { for (const q of [a, b, c]) for (const v of q) pos.push(v) }
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const sOfPoint = q => {
    let best = 0, bd = Infinity
    for (let i = 0; i + 1 < A.path.length; i++) {
      const a = A.path[i], b = A.path[i + 1]
      const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz || 1
      let t = ((q[0] - a[0]) * vx + (q[1] - a[1]) * vz) / L2
      t = Math.max(0, Math.min(1, t))
      const px = a[0] + vx * t, pz = a[1] + vz * t, d = Math.hypot(q[0] - px, q[1] - pz)
      if (d < bd) { bd = d; best = A.sArr[i] + Math.sqrt(L2) * t }
    }
    return best
  }
  const step = A.L / A.seg
  for (const [i0, i1] of A.runs) {
    const P = densify(A.path, i0, i1, step)
    const nOf = j => {
      const a = P[Math.max(j - 1, 0)], b = P[Math.min(j + 1, P.length - 1)]
      const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1
      return [-d[1] / l, d[0] / l]
    }
    const F = P.map((p, j) => { const n = nOf(j), sp = sOfPoint(p); return { p, n, yb: A.yOfS(sp), yt: A.yTopOf(sp) } })
    const cs = f => [[f.p[0] - f.n[0] * hw, f.yb, f.p[1] - f.n[1] * hw], [f.p[0] + f.n[0] * hw, f.yb, f.p[1] + f.n[1] * hw],
                     [f.p[0] + f.n[0] * hw, f.yt, f.p[1] + f.n[1] * hw], [f.p[0] - f.n[0] * hw, f.yt, f.p[1] - f.n[1] * hw]]
    for (let j = 0; j + 1 < F.length; j++) {
      const f = cs(F[j]), g = cs(F[j + 1])
      for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; quad(f[k], g[k], g[k2], f[k2]) }
    }
    const a0 = cs(F[0]), a1 = cs(F[F.length - 1])
    //  ⛔★137-h: 시작 캡 법선은 −t, 끝 캡은 +t. 두 순서가 서로 바뀌어 있었다(에지 일관성 검사가 적발).
    quad(a0[0], a0[1], a0[2], a0[3]); quad(a1[0], a1[3], a1[2], a1[1])
  }
  for (const c of A.corners) {
    const yb = A.yOfS(c.s), yt = A.yTopOf(c.s)
    const H = hull([[c.p[0] + c.nIn[0] * hw, c.p[1] + c.nIn[1] * hw], [c.p[0] - c.nIn[0] * hw, c.p[1] - c.nIn[1] * hw],
                    [c.p[0] + c.nOut[0] * hw, c.p[1] + c.nOut[1] * hw], [c.p[0] - c.nOut[0] * hw, c.p[1] - c.nOut[1] * hw]])
    const N = H.length
    for (let i = 0; i < N; i++) {
      const a = H[i], b = H[(i + 1) % N]
      quad([a[0], yb, a[1]], [b[0], yb, b[1]], [b[0], yt, b[1]], [a[0], yt, a[1]])
    }
    for (let i = 1; i + 1 < N; i++) {
      tri([H[0][0], yt, H[0][1]], [H[i][0], yt, H[i][1]], [H[i + 1][0], yt, H[i + 1][1]])
      tri([H[0][0], yb, H[0][1]], [H[i + 1][0], yb, H[i + 1][1]], [H[i][0], yb, H[i][1]])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return orientOutward(g)                                  // ★137-g 안팎 자가 교정
}

//  ★★★137 마디 분해(★136-d) — 1p3도 같은 규율을 쓴다(사본 금지)
export function splitRuns(path, sArr, kinkDeg) {
  const dirs = []
  for (let i = 0; i + 1 < path.length; i++) {
    const d = [path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]], l = Math.hypot(d[0], d[1]) || 1
    dirs.push([d[0] / l, d[1] / l])
  }
  const kc = Math.cos(kinkDeg * Math.PI / 180), cuts = []
  for (let i = 1; i < dirs.length; i++) if (dirs[i - 1][0] * dirs[i][0] + dirs[i - 1][1] * dirs[i][1] < kc) cuts.push(i)
  const runs = []; let a0 = 0
  for (const c of cuts) { runs.push([a0, c]); a0 = c }
  runs.push([a0, path.length - 1])
  const corners = cuts.map(i => ({ i, s: sArr[i], p: path[i], nIn: [-dirs[i - 1][1], dirs[i - 1][0]], nOut: [-dirs[i][1], dirs[i][0]],
    turn: Math.acos(Math.max(-1, Math.min(1, dirs[i - 1][0] * dirs[i][0] + dirs[i - 1][1] * dirs[i][1]))) * 180 / Math.PI }))
  return { dirs, runs, corners }
}

export function buildLink4Arch(S = link4Spec()) {
  if (!S.on || !S.arch.on) return null
  return buildSweptArch(S.arch)
}
