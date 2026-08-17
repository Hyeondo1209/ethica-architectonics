// link2Geometry.js — ★★★143 1p2 통로의 기둥 + 아치 둘 (2026.08.17 현도 확정)
//
//  ★현도 그림: *"쉘 > 직선통로1 > 미니첨탑(원통) > 상승 > 직선통로2 > 테라스.
//   직선통로 1과 2는 위에서 봤을 때 1p3 테라스 통로의 직선 형태를 가져야 해."*
//   → **평면은 1p3의 정확한 회전 이식**이고(프레임 오차 0 실측), 관 둘과 미니 첨탑은
//     `linkPassageGeometry`가 이미 짓는다. 이 모듈이 더하는 것은 **기둥 1기 + 아치 2기**뿐이다.
//
//  ★★1p3와 갈리는 지점 둘(실측으로 규명 · 현도 판단으로 봉합):
//   ⓐ **관 둘이 수평이다.** 상승 14.50을 나선이 전부 먹으므로 소핏 기울기 m = 0 →
//      `legArch`가 ★136-c 식(수평 소핏)으로 **정확히 퇴화**한다. 그리고 두 아치의 발원 높이가
//      y111 / y125.5로 **14.50 벌어진다**(1p3는 참 밑면 y119.6 하나에서 둘 다 나갔다).
//   ⓑ **기둥 머리가 원뿔대 밑(y106)이다.** 1p3는 참 밑면이 머리였다. 현도 2026.08.17 확정 —
//      ⛔이 결정이 ★142의 "원뿔대 부양 유지"를 **철회한다**(기둥이 원뿔대를 받는다).
//      ⛔대안 "머리를 ① 소핏 y111에" 는 원뿔대를 5.00 관통해 성립 불가(실측).
//
//  ⚠그 귀결로 ② 아치의 라이즈가 37.52로 커져 1p3 곡률(K 1.40)이면 첨탑 원통 밑면(y111)을
//   **10.507 관통**한다. 현도가 단면 슬라이더로 **K 0.80**을 골랐다(여유 0.94 — 타이트).
//   검사가 그 여유를 상설로 잰다.
//
//  ⚠사본 금지: 자리·깊이 = `linkSpec().land`(공유 solver) · 아치 = `legArch`(link3Geometry) ·
//   스윕 = `buildSweptArch`(link4Geometry) · 기둥 = `buildDomeFootColumn`(link3Geometry) · 돔 = `bridgeDomeY`.
//   이 파일에 손 좌표는 **0**이다.
//  ⚠밀봉: 이 판의 개구는 0이다(문 컷 = 다음 조각 — ★133·★136·★137과 같은 규약).
//  ⚠보존계: LK2_ON=false면 ★130 곡선 경유지로 돌아가고 이 부재들도 함께 소등된다.
import { linkSpec } from './linkPassageGeometry.js'
import { legArch, buildDomeFootColumn } from './link3Geometry.js'
import { buildSweptArch } from './link4Geometry.js'
import { bridgeDomeY } from './bridgeComplexGeometry.js'
import {
  LK2_ON, LK2_COL_ON, LK2_COL_HEAD, LK2_ARC_ON, LK2_ARC_S, LK2_ARC_WF, LK2_ARC_K,
  LK2_ARC2_ON, LK2_ARC2_S, LK2_ARC2_WF, LK2_ARC2_K,
  LK3_COL_EMB, LK3_COL_N, LK3_ARC_KINK, LK3_ARC_SEG, LK3_ARC_EMB, BRG_SINK,
  LNK_ASSIGN, LNK_ON, SPT_Y,
} from './constants.js'

//  ★마운트: 경유지가 배정된 LNK k(★141 파생 규약과 같은 표를 읽는다 — 손 지정 0)
export const link2Ks = () => (LK2_ON && LNK_ON ? LNK_ASSIGN.map((m, k) => (m === 2 ? k : -1)).filter(k => k >= 0) : [])
export const link2RotY = (k) => -(k * Math.PI / 2)          // ★130 마운트 규약 승계
export function link2Mounts() { return link2Ks().map(k => ({ k, rotY: link2RotY(k) })) }

export function link2Spec(o = {}) {
  const L = o.link ?? linkSpec()
  const LD = L.land                                          // { R, d, RM, E1, hwOut, wOut }
  const tw = L.two.tw
  const cone = tw.cone
  const RM = LD.RM, d = LD.d, hwOut = LD.hwOut, wOut = LD.wOut

  //  ── 기둥: 1p3 규격 그대로(발자국 = 참 발자국) · 머리만 다르다 ──
  //   ⚠셸0 프레임이라 반경 방향 = +x, 접선 방향 = z(1p3는 −z가 반경이었다 — 90° 회전상).
  //  ⛔★143-e 공면 제거: 기둥 머리가 원뿔대 밑과 **정확히 같은 평면**(y106)이었다 → 실틈.
  //   `BRG_SINK`만큼 더 올려 기둥이 원뿔대 살로 파고들게 한다(★126 팔 물림·★133 아치와 같은 어법).
  const headCone = (o.head ?? LK2_COL_HEAD) === 'cone'
  const top = headCone ? (cone ? cone.yBot + BRG_SINK : tw.yBot + BRG_SINK) : L.y0 - L.ft
  const col = {
    cx: RM, cz: 0,
    w: hwOut * 2,                                            // z(접선) 폭 = 관 외곽 폭 5.40
    dd: d,                                                   // x(반경) 폭 = 참 깊이 6.171
    top, emb: LK3_COL_EMB, n: LK3_COL_N,
    domeY: bridgeDomeY(RM),
    head: headCone ? 'cone' : 'soffit',
  }
  col.h = col.top - col.domeY
  //  ⚠성립 조건: 머리가 원뿔대를 뚫고 올라가면 안 된다(‘soffit’ 체제가 실패하는 자리 — 검사가 박는다)
  col.conePierce = cone ? col.top - cone.yBot : col.top - tw.yBot   // ★143-e 원뿔대 소등 체제에서는 원통 밑면 기준

  //  ── 아치 ①(셸 쪽) — 기둥의 −z 면에서 발원해 직선1 밑을 따라 바깥으로 ──
  //   ⚠1p3의 '−x 면'이 여기서는 '−z 면'이다(90° 회전상). 진행 방향은 직선1의 **바깥쪽** 단위벡터.
  const E1 = LD.E1
  const L1 = Math.hypot(E1[0] - L.P0[0], E1[1] - L.P0[1])
  const uOut1 = [(L.P0[0] - E1[0]) / L1, (L.P0[1] - E1[1]) / L1]
  const soffit1 = L.y0 - L.ft                                // 111.0 — 직선1 밑면(수평)
  const arch = legArch({
    o: { ...o, __nFace: [0, -1] },
    A0: [col.cx, col.cz - col.w / 2], join: E1, uOut: uOut1,
    legLen: L1, m: 0, landBot: soffit1, colDomeY: col.domeY,
    hwOut: hwOut * (o.archWf ?? LK2_ARC_WF), wf: o.archWf ?? LK2_ARC_WF, K: o.archK ?? LK2_ARC_K,
    on: (o.archOn ?? LK2_ARC_ON) && LK2_COL_ON, ask: o.archS ?? LK2_ARC_S,
    kink: LK3_ARC_KINK, seg: LK3_ARC_SEG,
  })

  //  ── 아치 ②(테라스 쪽) — ★143-c: **관 밑에만** 놓는다(기둥에서 발원하지 않는다) ──
  //   ⚠1p3와 갈리는 지점: 1p3 ② 아치는 기둥 면에서 나오지만, 여기서 그러면 첨탑 발자국을 가로질러
  //    살이 계단실로 14.55 들어간다(실측). 발원을 **첨탑 바깥벽**으로 옮기면 그 구간을 아예 안 지난다.
  //   ★발 = 첨탑 원통 밑면(y111) — 그 아래는 비어 있어 살을 물릴 데가 거기뿐이다.
  //   ⚠되물림: 면 법선과 나란하므로 tanθ = 0이지만, 첨탑이 **원통**이라 아치 반폭만큼 옆에서
  //    새김(sagitta)만큼 물러난다 → 그 값을 더해 캡이 첨탑 살에 확실히 묻히게 한다(전부 파생).
  const rDoor = L.rWall - L.emb
  const rTwFace = RM - tw.rOut                               // 첨탑 바깥벽(방위 0° 접점)
  const L2 = rTwFace - rDoor                                 // 직선2 길이(관 자신) = 아치 상한
  const soffit2 = SPT_Y - L.ft                               // 125.5 — 직선2 밑면
  const hwArc2 = hwOut * (o.arch2Wf ?? LK2_ARC2_WF)
  const sagitta = tw.rOut - Math.sqrt(Math.max(0, tw.rOut * tw.rOut - hwArc2 * hwArc2))
  const arch2 = legArch({
    //  ⚠발도 첨탑 밑면과 공면이 되면 안 된다 → BRG_SINK만큼 올려 첨탑 살 안에서 끝낸다(★143-e).
    o: { ...o, __nFace: [-1, 0], footY: tw.yBot + BRG_SINK, archEmb: sagitta + LK3_ARC_EMB },
    A0: [rTwFace, 0], join: [rTwFace, 0], uOut: [-1, 0],
    legLen: L2, m: 0, landBot: soffit2, colDomeY: col.domeY,
    hwOut: hwArc2, wf: o.arch2Wf ?? LK2_ARC2_WF, K: o.arch2K ?? LK2_ARC2_K,
    on: o.arch2On ?? LK2_ARC2_ON, ask: o.arch2S ?? LK2_ARC2_S,
    kink: LK3_ARC_KINK, seg: LK3_ARC_SEG,
  })
  //  ★기록: 기둥에서 발원시켰다면 어땠는지(검사가 그 갈림을 재현한다 — 다음 세션이 되풀이하지 않게)
  const gap2 = { emptyRun: RM - col.dd / 2 - rTwFace, soffitVsCyl: soffit2 - tw.yBot, sagitta, rTwFace }

  //  ★★검사가 상설로 재는 것: ② 아치가 첨탑 원통 밑면을 넘지 않는가(현도 K 0.80의 근거).
  //   원통 발자국은 중심 RM · 반경 tw.rOut. 아치는 −x 방향 직선이므로 s ↔ r가 1:1이다.
  //  ★★검사가 상설로 재는 것 — 아치는 **인트라도스~소핏을 채운 솔리드**다(규율 15).
  //   그래서 "곡선이 어디를 지나는가"가 아니라 **"살이 계단실을 침범하는가"**를 본다.
  //   계단실 = 원통 안(반경 tw.rIn) · 걷는 바닥 위(y > tw.yBot).
  const clear1 = (() => {
    if (!arch.on) return { on: false, intrude: 0, sinkOnly: true }
    let intrude = 0, sMax = 0
    for (let i = 0; i <= 1200; i++) {
      const s = arch.L * i / 1200
      const p = [arch.path[0][0] + uOut1[0] * s, arch.path[0][1] + uOut1[1] * s]
      if (Math.hypot(p[0] - RM, p[1]) > tw.rIn) continue
      const ov = Math.min(arch.yTopOf(s), tw.yTop) - Math.max(arch.yOfS(s), tw.yBot)
      if (ov > intrude) { intrude = ov; sMax = s }
    }
    //  ⚠SINK 0.05는 **설계된 물림**이다(공면 z-fighting 방지) — 그만큼은 침범이 아니다.
    //  ⚠허용치는 **파생**이다: 아치 마루가 소핏 +SINK이고 첨탑 밑면이 소핏 −SINK이므로 겹침 = 2·SINK.
    //   ⛔고정 수치로 적으면 ★143-e처럼 첨탑을 내리는 순간 거짓이 된다(현재값 단언 금지).
    const allow = (soffit1 + BRG_SINK) - tw.yBot
    return { on: true, intrude, sMax, allow, ok: intrude <= allow + 1e-9, cylBot: tw.yBot, cylRIn: tw.rIn }
  })()

  //  ★★아치 ②도 살로 잰다(규율 15): 계단실 침범 0이어야 하고, 발은 첨탑 살에 묻혀야 한다.
  const clear2 = (() => {
    if (!arch2.on) return { on: false, intrude: 0, footInWall: true }
    let intrude = 0
    for (let i = 0; i <= 1200; i++) {
      const s = arch2.L * i / 1200
      const p = [arch2.path[0][0] - s, 0]
      if (Math.hypot(p[0] - RM, p[1]) > tw.rIn) continue
      const ov = Math.min(arch2.yTopOf(s), tw.yTop) - Math.max(arch2.yOfS(s), tw.yBot)
      if (ov > intrude) intrude = ov
    }
    //  발(되물림 캡)의 가장 먼 모서리가 첨탑 바깥면 안에 있는가
    const dFoot = Math.hypot(arch2.path[0][0] - RM, arch2.path[0][1])
    const footCorner = Math.hypot(dFoot, hwArc2)
    return { on: true, intrude, ok: intrude <= 1e-9, dFoot, footCorner,
      footInWall: footCorner <= tw.rOut + 1e-9 && footCorner >= tw.rIn - 1e-9, rOut: tw.rOut, rIn: tw.rIn }
  })()

  return {
    on: (o.on ?? LK2_ON) && LNK_ON, ks: link2Ks(),
      RM, d, hwOut, wOut, R: LD.R, E1, L1, L2, soffit1, soffit2, uOut1,
    col, arch, arch2, clear1, clear2, gap2, rDoor, rTwFace, tw, cone,
    colOn: LK2_COL_ON,
  }
}

// ── 조립 — { walk: [], solid: [{id, geo}] } · 소등이면 null ──
export function buildLink2(S = link2Spec()) {
  if (!S.on) return null
  const solid = []
  if (S.colOn) solid.push({ id: 'col2', geo: buildDomeFootColumn(S.col) })
  if (S.arch.on) solid.push({ id: 'arch2a', geo: buildSweptArch(S.arch) })
  if (S.arch2 && S.arch2.on) solid.push({ id: 'arch2b', geo: buildSweptArch(S.arch2) })
  return solid.length ? { walk: [], solid } : null
}
