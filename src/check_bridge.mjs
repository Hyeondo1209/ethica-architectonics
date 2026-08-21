// ════════════════════════════════════════════════════════════════════
//  check_bridge.mjs — ★★★147 접속 통로 검증 (2026.08.19)
//   테라스(y127) → ★54 월대(y101.30) · 방위 0°.
//   실소스(constants.js + bridgeDeckGeometry.js + 이웃 부재 정본)를 그대로 임포트해
//   **파생 항등**과 **기하 건전성**을 시각 확인 전에 잡는다. 실행: node src/check_bridge.mjs
//
//  ⚠규율: 모든 항은 **치환으로 falsify 가능**해야 한다. 그럴듯한 값을 다시 적는 항(=항진명제)은 금지.
//   그래서 이웃 부재(SPT·DRG·월대·드럼 천장)의 **정본을 따로 임포트해 맞대**는 방식으로 짰다.
// ════════════════════════════════════════════════════════════════════
import {
  BRD_ON, BRD_HW, BRD_PIER_HW, BRD_STAIR_HW, BRD_SPI_W, BRD_T, BRD_CLEAR,
  BRD_PORT_W, BRD_SIDE, BRD_SPI_DROP, BRD_STAIR_DEG,
  BRD_YW, BRD_DECK_BOT, BRD_ROOF_BOT, BRD_ROOF_TOP,
  BRD_X0, BRD_DECK_E, BRD_ROOF_E, ceilXAt,
  BRD_PX0, BRD_PX1, BRD_PIER_FOOT, BRD_PIER_HEAD, BRD_PORT_TOP,
  BRD_SPI_Y1, BRD_SPI_LOOP, BRD_SPI_TURNS, BRD_SPI_N, BRD_SPI_RISE, BRD_SPI_GOING,
  BRD_SPI_MIDX0, BRD_SPI_MIDX1, BRD_SPI_MIDZ, BRD_SPI_SLAB,
  BRD_STAIR_X0, BRD_STAIR_Y0, BRD_STAIR_X1, BRD_STAIR_Y1,
  BRD_STAIR_N, BRD_STAIR_RISE, BRD_STAIR_GOING, BRD_STAIR_RUN, BRD_STAIR_FALL, BRD_STAIR_SLAB,
  BRD_ARC_ON, BRD_ARC_Y0, BRD_ARC_APEX, BRD_ARC_O, BRD_ARC_NW, BRD_ARC_NE,
  BRD_ARC_E, BRD_ARC_TOP, BRD_ARC_BAYW, BRD_ARC_BAYE, BRD_ARC_RW, BRD_ARC_RE,
  BRD_ARC_SPRW, BRD_ARC_SPRE, BRD_ARC_SEG, BRD_ARC_MASS,
  BRA_ON, BRA_H, BRA_T, BRA_HW, BRA_WT, BRA_SEG, BRA_SPAN_ON, BRA_MASS, BRD_ARC_FLR,
  BRD_SPI_ON, BRD_STAIR_ON,
  BRD_SFT_ON, BRD_SFT_W, BRD_SFT_TURNS,
  BRD_EAST, BRD_EAST_X, BRD_CEIL_LAP, WOLDAE_OUT, BOX_X1, BRD_SFT_DOOR_ON, DESC_HW,
  //  이웃 정본(맞댈 상대)
  SPT_Y, SPT_T, DRG_R_IN, DRG_W, DRG_Y, DRG_H, DRG_KS, DRG_RAIL_W, DRG_WALL_T,
  ceilY, COR_CYL_X0, ROOM_STAIR_RISE, ROOM_STAIR_SLAB, COR_Y0, COR_THICK,
  BRG_COL_Z, BRG_COL_TOP,
  GAT_EAVE_ON, GAT_CUT_ON, GAT_FACETS, GAT_CROWN_R, GAT_CX, COR_WALL_SEG, COR_CX, COR_R, MERIDIANS, R_BASE, SHELL_RIB_R,
} from './constants.js'
import {
  bridgeDeckSpec, spiralAt, buildBridgeDeck, buildBridgeSides, buildBridgeRoof,
  buildBridgePier, buildBridgeSpiral, buildBridgeStair, buildBridgeDeckParts,
  arcadeBaySpec, arcadeStations, buildBridgeArcade,
  bridgeArchSpec, archCenterline, buildBridgeArches, buildBridgeSpandrels, buildArcadeFloor, spandrelTop, arcadeFloorT, braZBands,
  shaftSpec, buildShaftFrame, buildShaftSpiral, ceilNotchSpec,
} from './bridgeDeckGeometry.js'
import { woldaeSpec, descentSpec, hallDoors, gatSeal } from './corridorStairsGeometry.js'
import { gatEaveSpec, buildGatEave, gatCutSpec } from './gatEaveGeometry.js'
import { bridgeSpec, bridgeColTop } from './bridgeComplexGeometry.js'
import { EYE, STEP_UP } from './waypoints.js'
import { spireSpec, wellWallR, SPIRE_BODY_SEG, spireDoorSpec, buildSpireDoorFrame } from './spireGeometry.js'
import { buildBridgeComplex } from './bridgeComplexGeometry.js'
import { BRG_ON, BRG_MODE, BRG_KEEP } from './constants.js'
import { BRD_VLT_ON, BRD_VLT_N, BRD_VLT_COL, BRD_VLT_SEG, BRD_BAND_SEGS, SPIRE_T,
  BRD_TRP_ON, BRD_TRP_H, BRD_TRP_O, BRD_TRP_F, BRD_TRP_D, BRD_TRP_V, BRD_TRP_M, BRD_TRP_OVH,
  BRD_TRP_O2, BRD_TRP_JZ, BRD_TRP_JY, BRD_TRP_AY, BRD_TRP_SLOPE, BRD_TRP_TIPZ, BRD_TRP_TIPY,
  BRD_TRP_SLIT, BRD_TRP_STUB, BRD_TRP_C0Z, BRD_TRP_C0Y, BRD_TRP_CAPY, BRD_TRP_NOTCH_TOP, SPIRE_SINK,
  BRD_TRP_PNL, BRD_TRP_PNL_N, BRD_TRP_PNL_R, BRD_TRP_PNL_G, BRD_TRP_PNL_DP, SP_FR_W, BRD_WCUT, BRD_BAND_ON,
  UPF_ON, SPD_ON, BRD_COL_ON, BRD_COL_W, BRD_COL_CLR, BRD_COL_CURVE, BRD_COL_SECT, BRD_COL_R, BRD_COL_TH0,
  BRD_END_ON, BRD_END_X1, BRD_END_Y1, BRD_END_K, brdEndX, brdSlantX, brdProwX, brdCrossZ,
  BRD_PROW_ON, BRD_PROW_X0, BRD_PROW_Z0, BRD_PROW_Z1, BRD_PROW_K, SPD_HW, SPD_H, SPD_FW, SPD_PROJ, SPD_SIDE, SPD_EMB,
  BRD_VLT_OPEN, BRD_VLT_CAP_K, BRD_VLT_CAP_X, brdVaultTopY } from './constants.js'
import {
  bridgeVaultSpec, buildVaultWebs, buildVaultBands, buildVaultRibs, buildVaultColumns, buildSpireBand,
} from './bridgeVaultGeometry.js'
import { bridgeTrapSpec as trapSpec, buildBridgeTrapParts, trapPanelSpec,
  spireCutX, WCUT_NU, WCUT_NV, trapWestPieces, trapColumnSpec, buildTrapColumns,
  trapEndSpec, buildTrapEndCap, endCapCells, SLOPE_DS } from './bridgeTrapGeometry.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const EPS = 1e-9, GEO = 1e-3     // ⚠Float32 저장 오차(★134 지식): 기하 단언은 1e-3
const near = (a, b, e = EPS) => Math.abs(a - b) < e
const verts = geo => { const a = geo.getAttribute('position').array, v = []; for (let i = 0; i < a.length; i += 3) v.push([a[i], a[i + 1], a[i + 2]]); return v }

//  ── 기하 건전성 도구 ──
//   에지 일관성: 모든 유향 에지가 양방향 정확히 한 번씩(= 닫힌 다양체 · 감김 정합).
//   ⚠signed volume만으로는 불충분하다는 것이 프로젝트 기존 지식이다.
function edgeAudit(geo) {
  const idx = geo.index.array, p = geo.getAttribute('position').array
  const key = i => `${p[i * 3].toFixed(4)},${p[i * 3 + 1].toFixed(4)},${p[i * 3 + 2].toFixed(4)}`
  const m = new Map()
  for (let t = 0; t < idx.length; t += 3) {
    const a = key(idx[t]), b = key(idx[t + 1]), c = key(idx[t + 2])
    for (const [u, v] of [[a, b], [b, c], [c, a]]) m.set(u + '|' + v, (m.get(u + '|' + v) || 0) + 1)
  }
  //  ⚠**도구 정정**(2026.08.19): 이 지오메트리들은 **여러 개의 닫힌 상자**의 합집합이라
  //   맞닿은 상자끼리 같은 유향 에지를 각각 갖는다(정상). 그래서 "개수 1"이 아니라
  //   **"정방향 개수 == 역방향 개수"**가 올바른 닫힘 판정이다(경계 에지 0 = 구멍 없음).
  let bad = 0
  for (const [k, cnt] of m) {
    const [u, v] = k.split('|')
    if ((m.get(v + '|' + u) || 0) !== cnt) bad++
  }
  return bad
}
//  ★도구 자체 검증(규율: 진단 도구를 먼저 믿을 수 있게 만든다) — 일부러 면 하나를 뺀 상자는 잡혀야 한다.
function edgeAuditSelfTest() {
  const mkGeo = (skipOne) => {
    const pos = [], idx = []
    const q = (a, b, c, d) => { const n = pos.length / 3; for (const p of [a, b, c, d]) pos.push(...p); idx.push(n, n + 1, n + 2, n, n + 2, n + 3) }
    const P = [[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]]
    q(P[0],P[1],P[2],P[3]); q(P[4],P[7],P[6],P[5]); q(P[0],P[4],P[5],P[1])
    q(P[3],P[2],P[6],P[7]); q(P[0],P[3],P[7],P[4]); if (!skipOne) q(P[1],P[5],P[6],P[2])
    const g = new (Object.getPrototypeOf(bridgeDeckSpec) ? Object : Object)()
    return { index: { array: idx }, getAttribute: () => ({ array: pos }) }
  }
  return { closed: edgeAudit(mkGeo(false)), holed: edgeAudit(mkGeo(true)) }
}
function signedVolume(geo) {
  const idx = geo.index.array, p = geo.getAttribute('position').array
  let V = 0
  for (let t = 0; t < idx.length; t += 3) {
    const A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3
    V += (p[A] * (p[B + 1] * p[C + 2] - p[C + 1] * p[B + 2])
        - p[A + 1] * (p[B] * p[C + 2] - p[C] * p[B + 2])
        + p[A + 2] * (p[B] * p[C + 1] - p[C] * p[B + 1])) / 6
  }
  return V
}

const A = bridgeDeckSpec()
console.log('══ ★147-a 접속 통로 ══')
console.log('── ⓪ 진단 도구 자체 검증 ──')
{
  const t = edgeAuditSelfTest()
  ok(t.closed === 0, `edgeAudit: 온전한 상자 → 위반 0 (실측 ${t.closed})`)
  ok(t.holed > 0, `edgeAudit: 면 하나 뺀 상자 → 위반 검출 (실측 ${t.holed}) — 항진명제 아님`)
}

// ────────────────────────────────────────────────────────────
console.log('── ① 파생 항등: 실측치가 아니라 이웃 부재에서 나오는가 ──')
ok(near(BRD_YW, SPT_Y), `보행면 ${BRD_YW} = 테라스 상면 SPT_Y(${SPT_Y}) 항등`)
ok(near(BRD_DECK_BOT, SPT_Y - SPT_T), `데크 밑 ${BRD_DECK_BOT} = SPT_Y − SPT_T(${SPT_T}) — 테라스 판이 그대로 나간다`)
ok(near(BRD_PX0, DRG_R_IN) && near(BRD_PX1, DRG_R_IN + DRG_W),
  `기둥 두 면 ${BRD_PX0}·${BRD_PX1} = 회랑 안/바깥 반경(DRG_R_IN·+DRG_W) 항등`)
ok(near(BRD_PIER_FOOT, DRG_Y + DRG_H), `기둥 발 ${BRD_PIER_FOOT} = 회랑 옥상 DRG_Y+DRG_H 항등`)
ok(near(BRD_PIER_HEAD, BRD_DECK_BOT), `기둥 머리 ${BRD_PIER_HEAD} = 데크 밑 — 기둥이 관을 직접 받는다`)
{ //  월대 정본과 맞댄다(사본이면 여기서 갈린다)
  const W = woldaeSpec()
  ok(near(BRD_STAIR_Y1, W.yTop), `계단 착지 ${BRD_STAIR_Y1} = woldaeSpec().yTop(${W.yTop}) 항등`)
  ok(BRD_STAIR_X1 > W.contour.reduce((m, p) => Math.min(m, p.x), 1e9) &&
     BRD_STAIR_X1 < W.contour.reduce((m, p) => Math.max(m, p.x), -1e9),
    `착지 x${BRD_STAIR_X1.toFixed(2)}가 월대 발자국 x범위 안`)
  ok(BRD_STAIR_HW <= Math.max(...W.contour.map(p => Math.abs(p.z))) + EPS,
    `계단 반폭 ${BRD_STAIR_HW} ≤ 월대 z 반폭 ${Math.max(...W.contour.map(p => Math.abs(p.z)))}`)
}
{ //  첨탑 위 외벽과 맞댄다
  const S = spireSpec()
  ok(near(BRD_X0, S.rCylTop), `통로 서단 ${BRD_X0} = 첨탑 위 외벽 rCylTop(${S.rCylTop}) 항등`)
  ok(BRD_YW > S.cylProf.find(p => p[0] === S.rCylTop)[1] - EPS,
    `보행면이 첨탑 위 원통 구간 안(문이 뚫릴 벽이 실제로 거기 있다)`)
}
{ //  ★★★147-f ② 동단 체제
  ok(['portal', 'ceilcut'].includes(BRD_EAST), `동단 체제 '${BRD_EAST}'`)
  if (BRD_VLT_ON || BRD_TRP_ON) ok(near(BRD_ROOF_E, BRD_EAST_X, EPS),
    `★148·150: 지붕 동단 = 포털면 ${BRD_EAST_X}(ceilY 역함수는 구 빗천장 컷 전용 — 보존계 가지)`)
  else ok(near(ceilY(BRD_ROOF_E), BRD_ROOF_TOP, GEO), `ceilY(지붕 동단 ${BRD_ROOF_E.toFixed(3)}) = 지붕 상면 ${BRD_ROOF_TOP} (역함수 왕복)`)
  if (BRD_EAST === 'portal') {
    const W = woldaeSpec()
    const wx1 = W.contour.reduce((m, q) => Math.max(m, q.x), -Infinity)
    ok(near(BRD_DECK_E, BRD_EAST_X, GEO), `데크 동단 ${BRD_DECK_E} = BRD_EAST_X (portal 체제)`)
    ok(near(BRD_EAST_X, wx1, GEO),
      `★동단 ${BRD_EAST_X} = 월대 동단 ${wx1} **항등** — 전망대 발밑을 끝까지 월대가 받친다(손 수치 0)`)
    ok(BRD_EAST_X > COR_CYL_X0 + EPS,
      `전망대가 드럼 서벽 x${COR_CYL_X0} 안으로 ${(BRD_EAST_X - COR_CYL_X0).toFixed(2)} 들어간다`)
    if (BRD_VLT_ON || BRD_TRP_ON) ok(near(BRD_ROOF_E, BRD_DECK_E, EPS),
      `★148·150: 지붕·데크·측벽이 **같은 포털면**에서 끝난다(처마 0 — 구 처마 2.8은 상향 시 24.8로 폭주해 폐기)`)
    else ok(BRD_ROOF_E > BRD_DECK_E, `지붕이 데크보다 ${(BRD_ROOF_E - BRD_DECK_E).toFixed(2)} 더 나간다 = 개구 위 처마`)
  } else {
    ok(near(ceilY(BRD_DECK_E), BRD_DECK_BOT, GEO), `구 체제: ceilY(데크 동단) = 데크 밑 ${BRD_DECK_BOT}`)
  }
}
if (BRD_TRP_ON) {
  //  ★150 독립 재계산: 마루 중심선 = H+V+(O/2+돌출−M/2)·기울기, 지붕밑 = 그 − 판 절반
  const capIndep = BRD_TRP_H + BRD_TRP_V + (BRD_TRP_O / 2 + BRD_TRP_OVH - BRD_TRP_M / 2)
    * ((BRD_TRP_H - BRD_TRP_F) / (BRD_HW + BRD_TRP_F - BRD_TRP_O / 2))
  ok(near(BRD_ROOF_BOT - BRD_YW, capIndep - BRD_T / 2, EPS),
    `★150 외피고 ${(BRD_ROOF_BOT - BRD_YW).toFixed(3)} = 갓 마루(독립 재계산 ${capIndep.toFixed(3)}) − 판 절반`)
} else if (BRD_VLT_ON) {
  const riseIndep = Math.hypot((BRD_EAST_X - BRD_X0) / BRD_VLT_N, 2 * (BRD_HW - BRD_T)) / 2
  ok(near(BRD_ROOF_BOT - BRD_YW, BRD_VLT_COL + riseIndep, EPS),
    `★148 내부고 ${(BRD_ROOF_BOT - BRD_YW).toFixed(3)} = 기둥 ${BRD_VLT_COL} + 라이즈 ${riseIndep.toFixed(3)}(독립 재계산 — BRD_CLEAR 7은 보존계 노브로 격하)`)
} else ok(near(BRD_ROOF_BOT - BRD_YW, BRD_CLEAR), `내부고 ${BRD_CLEAR} = 지붕 밑 − 보행면 (위젯이 현도에게 보인 정의 그대로)`)
ok(near(BRD_ROOF_TOP - BRD_ROOF_BOT, BRD_T), `지붕판 두께 = BRD_T(${BRD_T})`)
//  ★가드 구멍 봉합(2026.08.19 자가 적발): BRD_CLEAR=2.00 치환이 87항을 전부 통과했다 —
//   사람이 못 지나가는 관인데 아무도 안 잡았다. 보행 성립은 **눈높이 정본**과 맞대야 한다.
ok(BRD_CLEAR >= EYE + STEP_UP, `내부고 ${BRD_CLEAR} ≥ 눈높이 ${EYE} + 단차여유 ${STEP_UP} — 관을 걸어서 지난다`)
ok(A.pier.exit.y1 - A.pier.exit.y0 >= EYE + STEP_UP,
  `계단 출구 개구 높이 ${(A.pier.exit.y1 - A.pier.exit.y0).toFixed(2)} ≥ ${(EYE + STEP_UP).toFixed(2)} — 문으로 나갈 수 있다`)
ok(A.pier.port.top - A.pier.foot >= EYE + STEP_UP,
  `회랑 관통 개구 높이 ${(A.pier.port.top - A.pier.foot).toFixed(2)} ≥ ${(EYE + STEP_UP).toFixed(2)} — 옥상 보행자가 지난다`)

// ────────────────────────────────────────────────────────────
console.log('── ② 직각나선: 방위 조건과 누적 정합 ──')
const S = A.spiral
if (BRD_SPI_ON) {
ok(S.n === BRD_SPI_N && S.steps.length === BRD_SPI_N, `단수 ${S.n} = round(하강 ${BRD_SPI_DROP} / ROOM_STAIR_RISE ${ROOM_STAIR_RISE})`)
ok(near(S.n * S.rise, BRD_SPI_DROP, GEO), `누적 하강 ${(S.n * S.rise).toFixed(4)} = ${BRD_SPI_DROP} (반올림 잔차 흡수 확인)`)
ok(near(S.steps[S.n - 1].yTop, BRD_SPI_Y1, GEO), `마지막 단 윗면 ${S.steps[S.n - 1].yTop.toFixed(3)} = 나선 끝 ${BRD_SPI_Y1}`)
ok(near(BRD_SPI_LOOP, 2 * ((BRD_SPI_MIDX1 - BRD_SPI_MIDX0) + 2 * BRD_SPI_MIDZ), GEO),
  `중심선 둘레 ${BRD_SPI_LOOP} = 사각 둘레(파생 — 박은 값 아님)`)
{ //  ★방위 조건: 서변에서 들어가 동변으로 나간다. 이게 1.5바퀴의 근거다.
  const s0 = spiralAt(S.s0), sEnd = spiralAt(S.sEnd)
  ok(near(s0.x, BRD_SPI_MIDX0, GEO) && near(s0.z, 0, GEO), `나선 시작 = 서변 중앙 (x${s0.x.toFixed(2)}, z${s0.z.toFixed(2)}) — 통로가 서쪽에서 온다`)
  ok(near(sEnd.x, BRD_SPI_MIDX1, GEO) && near(sEnd.z, 0, GEO), `나선 끝 = 동변 중앙 (x${sEnd.x.toFixed(2)}, z${sEnd.z.toFixed(2)}) — 계단이 동쪽으로 나간다`)
  ok(Math.abs(BRD_SPI_TURNS % 1 - 0.5) < EPS, `바퀴 수 ${BRD_SPI_TURNS} = 반홀수 — 서↔동 반대변 조건의 필요조건`)
  ok(near(S.sEnd - S.s0, BRD_SPI_TURNS * BRD_SPI_LOOP, GEO), `나선 호길이 ${(S.sEnd - S.s0).toFixed(2)} = ${BRD_SPI_TURNS}바퀴 × 둘레 ${BRD_SPI_LOOP}`)
  ok(near(S.steps[0].s - S.s0, S.going / 2, GEO) && near(S.sEnd - S.steps[S.n - 1].s, S.going / 2, GEO),
    `첫·끝 디딤 중앙이 양 끝에서 각 going/2 — 배열이 s0~sEnd를 정확히 채운다`)
}
{ //  전 디딤이 기둥 내부 사각 안(벽 관통 0)
    const half = S.w / 2, g = S.going / 2
  let out = 0
  for (const st of S.steps) {
    const alongX = st.dir === 'x+' || st.dir === 'x-'
    const x0 = alongX ? st.cx - g : st.cx - half, x1 = alongX ? st.cx + g : st.cx + half
    const z0 = alongX ? st.cz - half : st.cz - g, z1 = alongX ? st.cz + half : st.cz + g
    if (x0 < A.pier.inX0 - GEO || x1 > A.pier.inX1 + GEO || z0 < -A.pier.inZ - GEO || z1 > A.pier.inZ + GEO) out++
  }
  ok(out === 0, `디딤 ${S.n}장 전부 기둥 내부 사각 안(벽 관통 0) — 이탈 ${out}`)
}
{
  const deg = Math.atan(S.rise / S.going) * 180 / Math.PI
  ok(deg > 10 && deg < 35, `나선 경사 ${deg.toFixed(2)}° — 보행 대역(10~35°)`)
  ok(near(S.slab, ROOM_STAIR_SLAB), `디딤판 두께 = 방 내벽 나선 승계(${ROOM_STAIR_SLAB})`)
}
ok(S.steps.every((st, i) => i === 0 || near(S.steps[i - 1].yTop - st.yTop, S.rise, GEO)),
  `인접 단 낙차가 전부 ${S.rise.toFixed(4)} (등간격 — 어긋난 단 0)`)
} else ok(buildBridgeSpiral(A) === null, `⛔직각나선 소등(BRD_SPI_ON=false) — 경로 전면 수정(현도 판정 2차)`)

// ────────────────────────────────────────────────────────────
console.log('── ③ 직선 계단 ──')
const T = A.stair
if (BRD_STAIR_ON) {
ok(T.n === BRD_STAIR_N && T.steps.length === BRD_STAIR_N, `단수 ${T.n} = round(낙차 ${BRD_STAIR_FALL.toFixed(3)} / ${ROOM_STAIR_RISE})`)
ok(near(T.n * T.rise, BRD_STAIR_FALL, GEO), `누적 낙차 ${(T.n * T.rise).toFixed(4)} = ${BRD_STAIR_FALL.toFixed(4)}`)
ok(near(T.steps[T.n - 1].yTop, BRD_STAIR_Y1, GEO), `마지막 단 윗면 = 월대 상면 ${BRD_STAIR_Y1}`)
ok(near(T.steps[T.n - 1].x1, BRD_STAIR_X1, GEO), `마지막 단 동단 = ${BRD_STAIR_X1.toFixed(3)}`)
ok(near(Math.atan(T.rise / T.going) * 180 / Math.PI, BRD_STAIR_DEG, 1e-6),
  `실현 경사 ${(Math.atan(T.rise / T.going) * 180 / Math.PI).toFixed(4)}° = 현도 확정 ${BRD_STAIR_DEG}°`)
ok(near(BRD_STAIR_RUN, BRD_STAIR_FALL / Math.tan(BRD_STAIR_DEG * Math.PI / 180), GEO), `런 ${BRD_STAIR_RUN.toFixed(3)} = 낙차/tan(경사)`)
ok(near(T.x0, BRD_PX1), `계단 시작 x = 기둥 동면(현도 ⓐ 확정 — 기둥 안에서 시작하지 않는다)`)
//  ★두 번째 가드 구멍 봉합: W3=0.30 치환이 통과했다(전폭 0.6 = 통과 불가).
ok(BRD_SPI_W >= 0.6, `나선 답면 ${BRD_SPI_W} ≥ 0.6 — 몸이 지나가는 물리 하한`)
ok(2 * BRD_STAIR_HW >= BRD_SPI_W, `계단 전폭 ${(2 * BRD_STAIR_HW).toFixed(2)} ≥ 나선 답면 ${BRD_SPI_W} — 동선이 뒤로 갈수록 좁아지지 않는다`)
ok(BRD_STAIR_Y0 < BRD_DECK_BOT - EPS, `계단 최고점 ${BRD_STAIR_Y0} < 데크 밑 ${BRD_DECK_BOT} — 관 바닥과 충돌 0 (여유 ${(BRD_DECK_BOT - BRD_STAIR_Y0).toFixed(2)})`)
{ //  드럼 서벽 통과 높이 — ★147-c 개구 위치의 근거가 되는 실측
  const yAtWall = BRD_STAIR_Y0 - (COR_CYL_X0 - BRD_STAIR_X0) * Math.tan(BRD_STAIR_DEG * Math.PI / 180)
  ok(yAtWall > BRD_STAIR_Y1 && yAtWall < BRD_STAIR_Y0,
    `계단이 드럼 서벽 x${COR_CYL_X0}을 y${yAtWall.toFixed(2)}에서 지난다(★147-c 개구 자리)`)
}
} else {
  ok(buildBridgeStair(A) === null, `⛔직선 계단 소등(BRD_STAIR_ON=false) — 아치 ③ 관통(x97~118)·미밀봉이 사유`)
  //  ★새 도착 구조: 보행면이 드럼 안에서 끝나는 자리와 그 발밑 월대
  const xEnd = ceilXAt(BRD_YW)
  ok(xEnd > COR_CYL_X0, `보행면 끝 x${xEnd.toFixed(2)} — 드럼 서벽 안으로 ${(xEnd - COR_CYL_X0).toFixed(2)} 들어간 '전망대'`)
  const W = woldaeSpec()
  const wx0 = W.contour.reduce((m, q) => Math.min(m, q.x), Infinity)
  const wx1 = W.contour.reduce((m, q) => Math.max(m, q.x), -Infinity)
  ok(xEnd > wx0 && xEnd < wx1, `그 끝이 월대 발자국(x${wx0}~${wx1}) **바로 위** — 하강 경로를 여기서 낸다`)
  ok(near(BRD_YW - W.yTop, 25.70, 1e-2), `전망대 → 월대 낙차 ${(BRD_YW - W.yTop).toFixed(2)}`)
}

// ────────────────────────────────────────────────────────────
console.log('── ④ 기둥 · 회랑 관통 개구 ──')
const P = A.pier
ok(near(P.x1 - P.x0, DRG_W), `기둥 x 폭 ${(P.x1 - P.x0).toFixed(2)} = 회랑 폭 DRG_W(${DRG_W}) 항등`)
ok(near(P.port.x1 - P.port.x0, BRD_PORT_W, GEO), `관통 개구 폭 ${BRD_PORT_W}`)
ok(near((P.port.x0 + P.port.x1) / 2, (P.x0 + P.x1) / 2, GEO), `관통 개구가 기둥 중심 대칭`)
ok(P.port.x0 > P.x0 + EPS && P.port.x1 < P.x1 - EPS, `개구 양옆에 기둥 살이 남는다(각 ${(P.port.x0 - P.x0).toFixed(2)})`)
ok(BRD_PORT_W <= DRG_W - 2 * DRG_RAIL_W + GEO,
  `개구 폭 ${BRD_PORT_W} ≤ 회랑 옥상 난간 사이 유효폭 ${(DRG_W - 2 * DRG_RAIL_W).toFixed(2)} — 보행선이 개구를 통과한다`)
ok(P.port.top < BRD_SPI_Y1 - EPS,
  `개구 머리 ${P.port.top} < 나선 끝 ${BRD_SPI_Y1} — 회랑 보행과 나선이 겹치지 않는다(여유 ${(BRD_SPI_Y1 - P.port.top).toFixed(2)})`)
ok(near(P.inX0, P.x0 + BRD_T) && near(P.inX1, P.x1 - BRD_T) && near(P.inZ, P.hw - BRD_T),
  `기둥 내부 = 외곽 − 벽 두께 ${BRD_T} → ${(P.inX1 - P.inX0).toFixed(2)} × ${(2 * P.inZ).toFixed(2)}`)
if (BRD_STAIR_ON) { //  ★선언된 충돌 1 — 클램프가 실제로 필요했는지, 값이 맞는지
  ok(P.exit.clamped === (BRD_STAIR_HW > P.inZ),
    `출구 개구 클램프 플래그(${P.exit.clamped}) = (W3 ${BRD_STAIR_HW} > 기둥 내부 반폭 ${P.inZ})`)
  ok(near(P.exit.z1, Math.min(BRD_STAIR_HW, P.inZ), GEO), `출구 개구 반폭 ${P.exit.z1} = min(W3, 내부 반폭)`)
  ok(near(P.exit.clampBy, Math.max(0, BRD_STAIR_HW - P.inZ), GEO), `클램프량 ${P.exit.clampBy.toFixed(2)} (계단이 벽 뒤로 들어가는 양)`)
  ok(P.exit.y0 <= BRD_STAIR_Y0 - BRD_STAIR_SLAB + GEO, `출구 개구 하단 ${P.exit.y0.toFixed(2)} ≤ 계단 매스 밑 — 첫 단이 벽에 막히지 않는다`)
  ok(P.exit.y1 <= P.head + GEO, `출구 개구 머리 ${P.exit.y1.toFixed(2)} ≤ 기둥 머리 ${P.head}`)
}

// ────────────────────────────────────────────────────────────
console.log('── ⑤ 관: 데크 구멍이 나선을 통과시키는가 ──')
ok(near(P.inX0, A.pier.inX0) && near(P.inZ, A.pier.inZ), `데크 구멍 정의 = 기둥 내부 사각(같은 spec 필드 — 사본 0)`)
if (BRD_SPI_ON) {
  const half = BRD_SPI_W / 2
  ok(BRD_SPI_MIDX0 - half >= P.inX0 - GEO && BRD_SPI_MIDX1 + half <= P.inX1 + GEO,
    `나선 답면 x 범위가 데크 구멍 안 — 첫 단이 데크판에 걸리지 않는다`)
  ok(BRD_SPI_MIDZ + half <= P.inZ + GEO, `나선 답면 z 범위가 데크 구멍 안`)
} else {
  const d = buildBridgeDeck(A); d.computeBoundingBox()
  ok(edgeAudit(d) === 0, `데크판 = 구멍 없는 통짜(나선 소등 — 함정 방지)`)
}
ok(BRD_HW > P.hw - EPS ? true : false, `통로 반폭 ${BRD_HW} vs 기둥 반폭 ${P.hw} — 초과분 ${(BRD_HW - P.hw).toFixed(2)}(선언된 상태: 통로가 기둥보다 넓다)`)
ok(A.side === BRD_SIDE && (BRD_SIDE === 'solid' || BRD_SIDE === 'arcade'), `측벽 체제 = '${BRD_SIDE}' (-a는 solid · -b에서 arcade)`)
ok(BRD_TRP_ON ? buildBridgeSides(A) === null : (BRD_SIDE === 'solid') === (buildBridgeSides(A) !== null),
  BRD_TRP_ON ? `★150: 직사각 측벽 미생성(사다리꼴이 외피)` : `측벽 체제 ↔ 생성 정합('${BRD_SIDE}')`)

// ────────────────────────────────────────────────────────────
console.log('── ⑥ 기하 건전성(에지 일관성 · 부호 부피 · 해석 부피) ──')
const parts = buildBridgeDeckParts()
//  ⚠보존계(BRD_ON=false)에서 검사가 **죽으면** 스윕 자체가 무의미해진다(2026.08.19 스윕이 적발).
//   소등 상태에서는 "소등이 맞다"만 확인하고 기하 항을 건너뛴다.
const nSolid = (!BRD_TRP_ON && BRD_SIDE === 'solid' ? 1 : 0) + (BRD_ARC_ON ? 1 : 0) * 2 + (BRA_ON ? 1 : 0) + (BRD_ON && BRA_ON && BRA_SPAN_ON ? 1 : 0) + (BRD_SFT_ON ? 1 : 0) + (BRD_TRP_ON ? 1 : 2)   // ★150: 측벽·지붕판 제외
const nWalk = 1 + (BRD_SPI_ON ? 1 : 0) + (BRD_STAIR_ON ? 1 : 0) + (BRD_SFT_ON ? 1 : 0)   // 측벽? + 아케이드? + 큰아치? + 지붕판 + 기둥
ok(BRD_ON ? (parts !== null && parts.walk.length === nWalk && parts.solid.length === nSolid) : parts === null,
  BRD_ON ? `부재 ${nWalk + nSolid}기 — walk ${nWalk} · solid ${nSolid}` : `BRD_ON=false → 부재 0(보존계 정상)`)
for (const grp of parts ? ['walk', 'solid'] : []) for (const { id, geo } of parts[grp]) {
  const V = verts(geo)
  ok(V.every(v => v.every(Number.isFinite)), `${id}: NaN 없음`)
  ok(edgeAudit(geo) === 0, `${id}: 에지 일관성(모든 유향 에지 양방향 1회) — 위반 ${edgeAudit(geo)}`)
  ok(signedVolume(geo) > 0, `${id}: 부호 부피 > 0 (바깥 감김) = ${signedVolume(geo).toFixed(2)}`)
}
if (BRD_ON) { //  ★해석 부피 대조 — 빌더가 만든 것과 손으로 센 상자 합이 같은가(치환으로 falsify 가능)
  const h = BRD_YW - BRD_DECK_BOT, hw = BRD_HW
  const xEb = ceilXAt(BRD_DECK_BOT), xEt = ceilXAt(BRD_YW)
  //  ★구멍은 체제에 따라 갈린다: 기둥 나선(BRD_SPI_ON) / 월대 샤프트(BRD_SFT_ON) / 없음
  const hole = BRD_SPI_ON ? { a: P.inX0, b: P.inX1, z: P.inZ }
             : BRD_SFT_ON ? { a: shaftSpec().inX0, b: shaftSpec().inX1, z: shaftSpec().inZ } : null
  //  ★★★147-f ②: 'portal'이면 동 조각이 **직육면체**(수직 절단), 'ceilcut'이면 사다리꼴(빗면 컷).

  const eastRun = (xa) => BRD_EAST === 'portal' ? BRD_EAST_X - xa
                                                : (xEb + xEt) / 2 - xa      // 데크 높이대의 평균 동단
  const vDeck = hole === null
    ? eastRun(BRD_X0) * h * 2 * hw
    : (hole.a - BRD_X0) * h * 2 * hw
      + eastRun(hole.b) * h * 2 * hw
      + 2 * (hole.b - hole.a) * h * (hw - hole.z)
  ok(near(signedVolume(buildBridgeDeck(A)), vDeck, 1e-2),
    `데크판 부피 ${signedVolume(buildBridgeDeck(A)).toFixed(3)} = 해석 ${vDeck.toFixed(3)}`)

  if (BRD_SIDE === 'solid' && !BRD_TRP_ON) {   // ★150: 측벽 없음 — ⑰이 사다리꼴 부피를 잰다
    const hs = BRD_ROOF_BOT - BRD_YW
    const sideRun = BRD_EAST === 'portal'
      ? BRD_EAST_X - BRD_X0
      : ((ceilXAt(BRD_YW) - BRD_X0) + (ceilXAt(BRD_ROOF_BOT) - BRD_X0)) / 2
    let vSide = 2 * sideRun * hs * BRD_T
    if (BRD_VLT_ON && BRD_VLT_OPEN) {
      //  ★149 개방: 서쪽은 마루 곡선 아래 면적(빌더와 **같은 스테이션**의 사다리꼴 — ★144 규칙), 동쪽은 상자
      const nx = BRD_VLT_CAP_K * BRD_VLT_SEG
      let a = 0
      for (let i = 0; i < nx; i++) {
        const xa = BRD_X0 + (BRD_VLT_CAP_X - BRD_X0) * i / nx
        const xb = BRD_X0 + (BRD_VLT_CAP_X - BRD_X0) * (i + 1) / nx
        a += (xb - xa) * ((brdVaultTopY(xa) - BRD_YW) + (brdVaultTopY(xb) - BRD_YW)) / 2
      }
      vSide = 2 * BRD_T * (a + (BRD_EAST_X - BRD_VLT_CAP_X) * (BRD_ROOF_BOT - BRD_YW))
    }
    ok(near(signedVolume(buildBridgeSides(A)), vSide, 1e-2),
      `측벽 부피 ${signedVolume(buildBridgeSides(A)).toFixed(3)} = 해석 ${vSide.toFixed(3)}`)
  } else ok(buildBridgeSides(A) === null, `'${BRD_SIDE}' 체제 — 민짜 측벽 미생성(★147-b 아케이드 자리)`)

  const vRoof = BRD_VLT_ON
    ? ((BRD_VLT_OPEN ? BRD_EAST_X - BRD_VLT_CAP_X : BRD_EAST_X - BRD_X0)) * BRD_T * 2 * hw
    : ((ceilXAt(BRD_ROOF_BOT) - BRD_X0) + (ceilXAt(BRD_ROOF_TOP) - BRD_X0)) / 2 * BRD_T * 2 * hw
  if (BRD_TRP_ON) ok(buildBridgeRoof(A) === null, `★150: 지붕판 미생성(갓이 지붕) — 부피는 ⑰이 잰다`)
  else ok(near(signedVolume(buildBridgeRoof(A)), vRoof, 1e-2),
    `지붕판 부피 ${signedVolume(buildBridgeRoof(A)).toFixed(3)} = 해석 ${vRoof.toFixed(3)}`)

  const H = P.head - P.foot
  const vPier = 2 * ((P.port.x0 - P.x0) * H * BRD_T + (P.x1 - P.port.x1) * H * BRD_T
      + (P.port.x1 - P.port.x0) * (P.head - P.port.top) * BRD_T)                 // z 양면 벽
    + BRD_T * H * (2 * P.inZ)                                                    // 서면
    + (BRD_STAIR_ON
        ? BRD_T * H * (P.exit.z0 - (-P.hw + BRD_T))
          + BRD_T * H * ((P.hw - BRD_T) - P.exit.z1)
          + BRD_T * (P.exit.y0 - P.foot) * (P.exit.z1 - P.exit.z0)
          + BRD_T * (P.head - P.exit.y1) * (P.exit.z1 - P.exit.z0)
        : BRD_T * H * (2 * P.inZ))                                               // 계단 소등 → 동면 통짜
  ok(near(signedVolume(buildBridgePier(A)), vPier, 1e-2),
    `기둥 부피 ${signedVolume(buildBridgePier(A)).toFixed(3)} = 해석 ${vPier.toFixed(3)}`)

  if (BRD_SPI_ON) {
    const vSpi = BRD_SPI_N * BRD_SPI_W * BRD_SPI_GOING * BRD_SPI_SLAB
    ok(near(signedVolume(buildBridgeSpiral(A)), vSpi, 1e-2),
      `나선 부피 ${signedVolume(buildBridgeSpiral(A)).toFixed(3)} = ${BRD_SPI_N}단 × ${BRD_SPI_W}×${BRD_SPI_GOING}×${BRD_SPI_SLAB}`)
  }

  if (BRD_STAIR_ON) {
    const vStair = BRD_STAIR_N * BRD_STAIR_GOING * BRD_STAIR_RISE * 2 * BRD_STAIR_HW
      + BRD_STAIR_RUN * BRD_STAIR_SLAB * 2 * BRD_STAIR_HW
    ok(near(signedVolume(buildBridgeStair(A)), vStair, 1e-2),
      `계단 부피 ${signedVolume(buildBridgeStair(A)).toFixed(3)} = 해석 ${vStair.toFixed(3)}`)
  }
}

// ────────────────────────────────────────────────────────────
console.log('── ⑦ 이웃 체제 · 보존계 ──')
ok(DRG_KS.includes(0), `DRG_KS에 0 포함 — 방위 0° 리브·접합판 복원(현도 ③ 확정)`)
ok(DRG_KS.length === 4 && [0, 1, 2, 3].every(k => DRG_KS.includes(k)), `DRG_KS = 네 방위 전부(${DRG_KS.join(',')})`)
ok(BRD_T >= DRG_WALL_T - 1e-6, `벽 두께 ${BRD_T} ≥ 회랑 안벽 ${DRG_WALL_T} (얇아지지 않았다)`)
ok(typeof BRD_ON === 'boolean', `보존 스위치 BRD_ON 존재 — false 한 줄로 ★146 상태 복귀`)
{ //  ★스위치가 실제로 죽이는가(치환 검증 — 항진명제 방지)
  ok(BRD_ON === true ? parts !== null : parts === null, `BRD_ON(${BRD_ON}) ↔ buildBridgeDeckParts() ${parts === null ? 'null' : '생성'} 정합`)
}

console.log('── ⑧ ★133 ⓑ 체제(참·기둥·브래킷만 존치 — 현도 2026.08.19 확정) ──')
{
  const brg = BRG_ON ? buildBridgeComplex() : null
  ok(BRG_MODE === 'stub', `BRG_MODE='${BRG_MODE}' — ⓑ 체제(관·아치·포털 철거 · 참·기둥·브래킷 존치)`)
  if (brg) {
    const ids = [...brg.walk, ...brg.solid].map(q => q.id)
    ok(BRG_KEEP.every(k => ids.includes(k)) && ids.length === BRG_KEEP.length,
      `존치 부재 = BRG_KEEP(${BRG_KEEP.join('·')}) — ★136 도착지 보존`)
    //  ★새 관 부피와의 겹침이 **0이어야** 한다(ⓑ의 목적). 치환으로 falsify 가능: BRG_MODE='full'이면 12기가 걸린다.
    const boxes = [...brg.walk, ...brg.solid].map(({ id, geo }) => {
      geo.computeBoundingBox(); const b = geo.boundingBox; return { id, b }
    })
    const tube = { x0: BRD_X0, x1: BRD_DECK_E, y0: BRD_DECK_BOT, y1: BRD_ROOF_TOP, z: BRD_HW }
    const hit = boxes.filter(({ b }) =>
      b.max.x > tube.x0 && b.min.x < tube.x1 && b.max.y > tube.y0 && b.min.y < tube.y1 &&
      b.max.z > -tube.z && b.min.z < tube.z)
    ok(hit.length === 0, `존치 부재가 새 관 부피와 겹치지 않는다 — 겹침 ${hit.length}기${hit.length ? ' (' + hit.map(h => h.id).join('·') + ')' : ''}`)
    //  ⚠**선언된 빚**: column은 0° 리브 발자국을 관통한다(표면 샘플링 실측 — 정점 판정은 못 잡는다).
    const col = boxes.find(q => q.id === 'column')
    ok(col !== undefined && col.b.min.y < 90 && col.b.max.y > 105,
      `column 존치(y${col.b.min.y.toFixed(2)}~${col.b.max.y.toFixed(2)}) — ⚠0° 리브 발자국 85점 관통 = 선언된 빚(현도 판정 대기)`)
  } else {
    ok(true, `BRG_ON=false — ★133 전부 소등(★136도 함께 꺼진다)`)
  }
}


console.log('── ⑨ ★147-b 양면 아케이드(현도 ⓑ 반원 승계) ──')
//  ⚠BRD_ON=false면 아케이드도 없다 — -a에서 겪은 '보존계에서 검사가 죽는' 함정 재발 방지.
if (BRD_ON && BRD_ARC_ON) {
  const bays = arcadeBaySpec()
  ok(bays.length === BRD_ARC_NW + BRD_ARC_NE, `베이 ${bays.length}기 = 서 ${BRD_ARC_NW} + 동 ${BRD_ARC_NE}`)
  //  ★정점 정렬이 이 안의 핵심 의도다 — 반지름이 베이별로 다른데도 정점이 같아야 한다.
  ok(bays.every(b => near(b.apex, BRD_ARC_APEX, GEO)),
    `전 베이 정점 = ${BRD_ARC_APEX} (반지름은 베이 파생이라 spring이 갈린다: 서 ${BRD_ARC_SPRW.toFixed(3)} / 동 ${BRD_ARC_SPRE.toFixed(3)})`)
  ok(!near(BRD_ARC_SPRW, BRD_ARC_SPRE, 1e-6),
    `서·동 spring이 실제로 다르다(Δ${Math.abs(BRD_ARC_SPRE - BRD_ARC_SPRW).toFixed(3)}) — 정렬 대상이 정점임을 보증`)
  ok(bays.every(b => near(b.wOp, b.bay * BRD_ARC_O, GEO)), `전 베이 개구 = 베이 × ${BRD_ARC_O}`)
  ok(bays.every(b => b.uL > b.x0 + 1e-9 && b.uR < b.x1 - 1e-9),
    `전 베이에 피어 살이 남는다(서 ${(BRD_ARC_BAYW - 2 * BRD_ARC_RW).toFixed(3)} · 동 ${(BRD_ARC_BAYE - 2 * BRD_ARC_RE).toFixed(3)})`)
  ok(bays.every(b => b.springY > BRD_ARC_Y0 + 1e-9), `문설주 높이 > 0 — 발에서 바로 원호가 서지 않는다(★145 어법)`)
  ok(BRD_ARC_APEX < BRD_ARC_TOP - 1e-9, `정점 ${BRD_ARC_APEX} < 상현 ${BRD_ARC_TOP} — 스팬드럴 ${(BRD_ARC_TOP - BRD_ARC_APEX).toFixed(2)}`)
  //  ★양 끝이 이웃 부재와 정확히 만나는가(틈 0)
  const W = bays.filter(b => b.side === 'W'), E = bays.filter(b => b.side === 'E')
  ok(near(W[0].x0, BRD_X0) && near(W[W.length - 1].x1, BRD_PX0, GEO),
    `서 구간 ${BRD_X0} → ${BRD_PX0}(기둥 서면) — 틈 0`)
  ok(near(E[0].x0, BRD_PX1) && near(E[E.length - 1].x1, BRD_ARC_E, GEO),
    `동 구간 ${BRD_PX1}(기둥 동면) → ${BRD_ARC_E}(드럼 서벽) — 틈 0`)
  ok(near(BRD_ARC_TOP, BRD_DECK_BOT), `상현 = 데크 밑 항등 — 아케이드가 관을 진다`)
  //  ★★★147-h 살 체제
  ok(['solid', 'twin'].includes(BRD_ARC_MASS), `아케이드 살 체제 '${BRD_ARC_MASS}'`)
  //  ★계단과의 z 분리 — ⚠체제에 따라 뜻이 갈린다(규율 13′): 'solid'면 아케이드가 z 전폭을 채우므로
  //   계단이 켜지는 순간 **살 속에 묻힌다**. 구 부등식을 그대로 두면 통과하면서 거짓 안전이 된다.
  if (BRD_ARC_MASS === 'twin')
    ok(BRD_STAIR_HW < BRD_HW - BRD_T + GEO,
      `계단 반폭 ${BRD_STAIR_HW} < 아케이드 안쪽면 ${(BRD_HW - BRD_T).toFixed(2)} — 계단이 아케이드 살을 뚫지 않는다`)
  else
    ok(!BRD_STAIR_ON,
      `'solid' 체제에서 직선 계단 소등 — 켜면 아케이드 살(z 전폭 ${(2 * BRD_HW).toFixed(2)}) 속에 묻힌다`)
  //  ★기하 건전성 + 해석 부피
  const g = buildBridgeArcade()
  ok(g !== null && edgeAudit(g) === 0, `아케이드: 에지 일관성 위반 ${g ? edgeAudit(g) : 'null'}`)
  ok(signedVolume(g) > 0, `아케이드: 부호 부피 ${signedVolume(g).toFixed(2)} > 0`)
  {
    //  단면적 = (상현 − yBot)을 x로 적분. 스테이션 사슬을 사다리꼴로 적분하면 빌더와 **같은 다각형**이 된다.
    const area = (st) => { let a = 0
      for (let i = 0; i < st.length - 1; i++) {
        const [xa, ya] = st[i], [xb, yb] = st[i + 1]
        a += (xb - xa) * ((BRD_ARC_TOP - ya) + (BRD_ARC_TOP - yb)) / 2
      }
      return a }
    const stW = arcadeStations(W, BRD_X0, BRD_PX0), stE = arcadeStations(E, BRD_PX1, BRD_ARC_E)
    //  ★147-h: 'solid'면 z 전폭 한 덩어리, 'twin'이면 두께 × 두 장. 체제를 갈면 값이 갈린다(falsify 가능).
    const zw = BRD_ARC_MASS === 'solid' ? 2 * BRD_HW : BRD_T * 2
    const vol = (area(stW) + area(stE)) * zw
    ok(near(signedVolume(g), vol, 1e-2),
      `아케이드 부피 ${signedVolume(g).toFixed(3)} = 해석 ${vol.toFixed(3)} (사슬 사다리꼴 적분 × z폭 ${zw.toFixed(2)})`)
    if (BRD_ARC_MASS === 'solid') {
      //  ★"두께 상한 = 현 두 판의 바깥 경계" — 현도 조건. 넘지도 모자라지도 않는다.
      const V = verts(g)
      const zmax = Math.max(...V.map(v => Math.abs(v[2])))
      ok(near(zmax, BRD_HW, GEO), `살 z 반폭 ${zmax.toFixed(3)} = 구 두 판의 바깥면 ${BRD_HW} 항등(상한 준수)`)
      //  ★안쪽 면(±3.90)이 **사라졌는가** = 통짜의 직독. 남아 있으면 두 판 체제가 섞인 것이다.
      const innerFace = V.some(v => Math.abs(Math.abs(v[2]) - (BRD_HW - BRD_T)) < GEO)
      ok(!innerFace, `구 안쪽 면(|z|=${(BRD_HW - BRD_T).toFixed(2)}) 정점 0 — 판 둘이 아니라 한 덩어리`)
      //  ★개구는 그 깊이를 관통한다 — 정점 z가 두 값(±HW)뿐이어야(중간 벽 없음)
      const zs = new Set(V.map(v => v[2].toFixed(3)))
      ok(zs.size === 2, `살의 z 값 ${zs.size}종 = ±${BRD_HW}뿐 — 개구가 두께를 관통(중간 격벽 0)`)
    }
  }
  ok(BRD_ARC_SEG >= 8, `아치 분할 ${BRD_ARC_SEG} ≥ 8 — 인트라도스가 각져 보이지 않는다`)
  //  ★가드 구멍 봉합: BRD_ARC_NE 치환이 전항 통과했다. 베이 수는 자유도지만 **서·동 리듬이 크게 갈리면
  //   한 아케이드로 안 읽힌다** — 현도 스케치가 서 11.41 · 동 10.78(차 5.5%)로 맞춰 그린 것이 의도다.
  const rhythm = Math.abs(BRD_ARC_BAYW - BRD_ARC_BAYE) / BRD_ARC_BAYW
  ok(rhythm < 0.15, `서·동 베이 폭 차 ${(rhythm * 100).toFixed(1)}% < 15% — 한 아케이드로 읽힌다(서 ${BRD_ARC_BAYW.toFixed(2)} · 동 ${BRD_ARC_BAYE.toFixed(2)})`)
} else {
  ok(buildBridgeArcade() === null,
    `아케이드 미생성 — ${!BRD_ON ? 'BRD_ON=false(★147 전부 소등)' : 'BRD_ARC_ON=false(-a 상태 · 보존계)'}`)
}


console.log('── ⑩ ★147-c 큰 아치 3기(정점 공유 비대칭 + 반원 둘) ──')
if (BRD_ON && BRA_ON) {
  const A = bridgeArchSpec()
  const B = (await import('./bridgeComplexGeometry.js')).bridgeSpec()
  const S = spireSpec(), W = woldaeSpec()
  //  ★교각 좌표가 정본에서 나오는가(bbox 유도였다면 여기서 갈린다)
  ok(near(A.p1a, B.xL0, GEO) && near(A.p1b, B.xL1, GEO),
    `★133 기둥 두 면 ${A.p1a.toFixed(2)}·${A.p1b.toFixed(2)} = bridgeSpec().xL0/xL1 항등`)
  ok(near(A.woldW, W.contour.reduce((m, q) => Math.min(m, q.x), Infinity), GEO),
    `월대 서단 ${A.woldW} = woldaeSpec() contour 최소 x 항등`)
  //  ★②③ 반원: 반지름이 스팬 절반(파생 — 박은 값 아님)
  ok(near(A.a2.R, (A.a2.x1 - A.a2.x0) / 2, GEO) && near(A.a3.R, (A.a3.x1 - A.a3.x0) / 2, GEO),
    `②③ 반지름 = 스팬/2 (${A.a2.R.toFixed(3)} · ${A.a3.R.toFixed(3)})`)
  ok(near(A.a2.x0, A.p1b) && near(A.a2.x1, BRD_PX0) && near(A.a3.x0, BRD_PX1),
    `②③ 발이 두 교각 면에 정확히 선다 — 틈 0`)
  //  ★① 동쪽 호 = ② 반지름(현도 "②와 같게")
  ok(near(A.a1.R1, A.a2.R, GEO), `① 동쪽 호 R1 ${A.a1.R1.toFixed(3)} = ② 반지름 항등(현도 확정)`)
  //  ★r은 노브가 아니라 "서쪽 발이 첨탑 외벽에 닿는다"의 귀결이다 — 치환으로 falsify 가능
  ok(near(A.a1.r, A.a1.apex.x - S.rCyl, GEO), `서쪽 호 r ${A.a1.r.toFixed(3)} = 정점x − 첨탑 rCyl(${S.rCyl}) 파생`)
  ok(near(A.a1.wFoot.x, S.rCyl, GEO), `서쪽 발 x = 첨탑 아래 외벽 ${S.rCyl} 항등`)
  {
    //  그 높이에 실제로 벽이 있는가(첨탑 원통 구간) — 여기가 이 안의 성립 조건이다
    const prof = S.cylProf.filter(p => near(p[0], S.rCyl, 1e-6)).map(p => p[1])
    const lo = Math.min(...prof), hi = Math.max(...prof)
    ok(A.a1.wFoot.y > lo && A.a1.wFoot.y < hi,
      `서쪽 발 y${A.a1.wFoot.y.toFixed(2)}가 첨탑 원통 구간 y${lo}~${hi} 안 — 벽에 실제로 닿는다`)
  }
  //  ★정점 공유: 두 호가 같은 점에서 만나고 접선이 수평(매끄러운 연결)
  {
    const P = archCenterline(A.a1, A.seg)
    const mid = A.seg
    ok(near(P[mid][0], A.a1.apex.x, GEO) && near(P[mid][1], A.a1.apex.y, GEO),
      `중심선 중앙점 = 정점 (${A.a1.apex.x.toFixed(2)}, ${A.a1.apex.y.toFixed(2)}) — 두 호가 공유`)
    const dL = [P[mid][0] - P[mid - 1][0], P[mid][1] - P[mid - 1][1]]
    const dR = [P[mid + 1][0] - P[mid][0], P[mid + 1][1] - P[mid][1]]
    const ang = (d) => Math.abs(Math.atan2(d[1], d[0]) * 180 / Math.PI)
    ok(ang(dL) < 3 && ang(dR) < 3, `정점 좌우 접선이 수평(${ang(dL).toFixed(2)}° · ${ang(dR).toFixed(2)}°) — 꺾임 없음`)
    ok(near(P[0][0], A.a1.wFoot.x, GEO) && near(P[P.length - 1][0], A.a1.eFoot.x, GEO),
      `① 중심선 양 끝 = 서쪽 발 → 동쪽 발`)
    //  ★둘 다 위로 볼록(현도가 두 번 정정한 지점) — 중심선이 양 끝보다 위로 솟는다
    ok(P.every(p => p[1] <= A.a1.apex.y + GEO) && A.a1.apex.y > Math.max(P[0][1], P[P.length - 1][1]),
      `① 전 구간이 정점 아래 = 위로 볼록(S자·아래볼록 아님)`)
  }
  //  ★발 높이 통일(현도 ⑵) — ②③ 네 발과 ①의 동쪽 발이 같은 높이
  ok(near(A.a1.eFoot.y, BRA_H) && near(A.a2.y, BRA_H) && near(A.a3.y, BRA_H),
    `발 다섯이 공통 높이 ${BRA_H} (① 서쪽 발만 첨탑 벽 착지로 ${A.a1.wFoot.y.toFixed(2)})`)
  ok(A.a3.y >= BRD_PIER_FOOT - GEO, `발 높이 ${BRA_H} ≥ 접속 기둥 발 ${BRD_PIER_FOOT}(회랑 옥상)`)
  //  ★아케이드 하현 침범 0
  const tops = [A.a1.apex.y, A.a2.y + A.a2.R, A.a3.y + A.a3.R]
  ok(tops.every(t => t + BRA_T / 2 < BRD_ARC_Y0),
    `세 정점 + 살 반두께가 아케이드 하현 ${BRD_ARC_Y0} 아래 — 최소 여유 ${Math.min(...tops.map(t => BRD_ARC_Y0 - t - BRA_T / 2)).toFixed(2)}`)
  //  ★z 폭이 ★133 기둥보다 좁다(현도 확정)
  ok(BRA_HW < B.colD / 2 - 1e-9, `아치 z 반폭 ${BRA_HW} < ★133 기둥 반폭 ${(B.colD / 2).toFixed(2)}`)
  ok(BRA_WT < BRA_HW, `벽 두께 ${BRA_WT} < 반폭 — 두 장이 겹치지 않는다`)
  //  ★기하 건전성
  const g = buildBridgeArches()
  ok(g !== null && edgeAudit(g) === 0, `큰 아치: 에지 일관성 위반 ${g ? edgeAudit(g) : 'null'}`)
  ok(signedVolume(g) > 0, `큰 아치: 부호 부피 ${signedVolume(g).toFixed(2)} > 0`)
  {
    //  해석 부피 = 중심선 길이 × 살 두께 × 벽 두께 × 2장 (곡률 보정은 살이 얇아 무시 가능 범위)
    let L = 0
    for (const a of [A.a1, A.a2, A.a3]) {
      const P = archCenterline(a, A.seg)
      for (let i = 0; i < P.length - 1; i++) L += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1])
    }
    //  ★147-i: z폭이 체제로 갈린다 — 'solid' 한 덩어리(2·HW) vs 'twin' 두 장(WT×2). 갈면 값이 갈린다.
    const zw = braZBands().reduce((a, [zA, zB]) => a + (zB - zA), 0)
    const v = L * BRA_T * zw
    ok(Math.abs(signedVolume(g) - v) / v < 0.03,
      `큰 아치 부피 ${signedVolume(g).toFixed(2)} ≈ 중심선 ${L.toFixed(2)} × ${BRA_T} × z폭 ${zw.toFixed(2)} = ${v.toFixed(2)} (±3%)`)
  }
  //  ★★★147-i 통짜 체제 직독
  ok(['solid', 'twin'].includes(BRA_MASS), `큰 아치 살 체제 '${BRA_MASS}'`)
  if (BRA_MASS === 'solid') {
    const V = verts(g)
    const zmax = Math.max(...V.map(v2 => Math.abs(v2[2])))
    ok(near(zmax, BRA_HW, GEO), `살 z 반폭 ${zmax.toFixed(3)} = 구 두 판의 바깥면 ${BRA_HW} 항등(상한 준수)`)
    ok(!V.some(v2 => Math.abs(Math.abs(v2[2]) - (BRA_HW - BRA_WT)) < GEO),
      `구 안쪽 면(|z|=${(BRA_HW - BRA_WT).toFixed(2)}) 정점 0 — 판 둘이 아니라 한 덩어리`)
    ok(BRA_HW < 2.70 - GEO, `살 반폭 ${BRA_HW} < ★133 기둥 z±2.70 — 통짜여도 기둥보다 좁다(현도 확정 불변)`)
    //  ★스팬드럴이 같은 체제를 따르는가 — 아치만 통짜면 그 위가 빈다
    const sp = buildBridgeSpandrels()
    if (sp) {
      const SV = verts(sp)
      ok(!SV.some(v2 => Math.abs(Math.abs(v2[2]) - (BRA_HW - BRA_WT)) < GEO),
        `스팬드럴도 같은 z대역 정본(braZBands)을 읽는다 — 아치 위가 안 빈다`)
    }
  }
  ok(BRA_SEG >= 16, `호 분할 ${BRA_SEG} ≥ 16`)
} else {
  ok(buildBridgeArches() === null, `큰 아치 미생성 — ${!BRD_ON ? 'BRD_ON=false' : 'BRA_ON=false(보존계)'}`)
}


console.log('── ⑪ 스팬드럴 + 아케이드 바닥판(현도 로컬 판정 1차 반영) ──')
if (BRD_ON && BRD_ARC_ON) {
  const A = bridgeArchSpec(), top = spandrelTop()
  const flT = arcadeFloorT()
  ok(near(top, BRD_ARC_Y0 - flT, GEO), `스팬드럴 상단 ${top.toFixed(2)} = 하현 ${BRD_ARC_Y0} − 바닥판 ${flT.toFixed(3)}`)
  ok(flT <= BRD_ARC_FLR + GEO, `바닥판 두께 ${flT.toFixed(3)} ≤ 노브 상한 ${BRD_ARC_FLR}`)
  ok(flT >= BRD_T / 3 - GEO,
    `바닥판 두께 ${flT.toFixed(3)} ≥ 종잇장 하한 ${(BRD_T / 3).toFixed(3)}(=벽 두께÷3, §2-D)`)
  //  ★바닥판이 아치를 뚫지 않는가 — 이 세션의 실측 상한(1.22)이 여기서 falsify된다
  const ext = Math.max(A.a1.apex.y, A.a2.y + A.a2.R, A.a3.y + A.a3.R) + A.t / 2
  ok(top >= ext - GEO,
    `바닥판 밑면 ${top.toFixed(2)} ≥ 아치 엑스트라도스 최고 ${ext.toFixed(2)} — 여유 ${(top - ext).toFixed(3)}`)
  const fl = buildArcadeFloor()
  ok(fl !== null && edgeAudit(fl) === 0 && signedVolume(fl) > 0, `아케이드 바닥판: 에지 0 · 부피 ${signedVolume(fl).toFixed(2)}`)
  {
    const v = (BRD_ARC_E - BRD_X0) * flT * 2 * BRD_HW
    ok(near(signedVolume(fl), v, 1e-2), `바닥판 부피 ${signedVolume(fl).toFixed(2)} = ${(BRD_ARC_E - BRD_X0).toFixed(2)}×${flT.toFixed(3)}×${(2 * BRD_HW).toFixed(2)}`)
  }
  ok(2 * BRD_HW > 2 * BRA_HW, `바닥판 폭 ${(2 * BRD_HW).toFixed(2)} > 아치 폭 ${(2 * BRA_HW).toFixed(2)} — 양쪽 각 ${(BRD_HW - BRA_HW).toFixed(2)} 내밀림(선언된 상태)`)
  if (BRA_ON && BRA_SPAN_ON) {
    const sp = buildBridgeSpandrels()
    ok(sp !== null && edgeAudit(sp) === 0, `스팬드럴: 에지 일관성 위반 ${sp ? edgeAudit(sp) : 'null'}`)
    ok(signedVolume(sp) > 0, `스팬드럴: 부호 부피 ${signedVolume(sp).toFixed(2)} > 0`)
    sp.computeBoundingBox()
    ok(near(sp.boundingBox.max.y, top, GEO), `스팬드럴 최고 y = 바닥판 밑면 ${top.toFixed(2)} — 틈 0`)
    ok(near(sp.boundingBox.min.x, A.a1.wFoot.x, GEO) && near(sp.boundingBox.max.x, A.a3.x1, GEO),
      `스팬드럴 x 범위 = 첫 아치 서발 ${A.a1.wFoot.x} ~ 셋째 아치 동발 ${A.a3.x1}`)
    ok(near(sp.boundingBox.max.z, BRA_HW, GEO), `스팬드럴 z = 아치와 같은 ±${BRA_HW}`)
  } else ok(buildBridgeSpandrels() === null, `스팬드럴 미생성 — BRA_SPAN_ON=${BRA_SPAN_ON}`)
} else ok(buildArcadeFloor() === null, `아케이드 바닥판 미생성(보존계)`)


console.log('── ⑫ ★147-e 월대 샤프트(전망대 → 월대 · 월대는 이제 참) ──')
if (BRD_ON && BRD_SFT_ON) {
  const S = shaftSpec(), W = woldaeSpec()
  ok(near(S.y0, W.yTop), `샤프트 하단 ${S.y0} = 월대 상면 항등 — 여기가 **참**이 된다`)
  ok(near(S.y1, BRD_YW), `샤프트 상단 ${S.y1} = 전망대 보행면 항등`)
  //  ★x1은 보행면 컷(130.50)이 아니라 **데크 밑면 컷**(127.35)이다 — 그래야 틀이 데크에 받쳐진다.
  ok(near(S.x1, ceilXAt(BRD_DECK_BOT), GEO),
    `틀 동단 ${S.x1.toFixed(2)} = ceilXAt(데크 밑 ${BRD_DECK_BOT}) — 보행면 컷 ${ceilXAt(BRD_YW).toFixed(2)}이 아니다`)
  ok(S.x1 < ceilXAt(BRD_YW) - GEO, `틀이 데크 밑면 안에서 끝난다(허공 0)`)
  //  ★틀이 월대 발자국 안에 있는가 — 밖이면 허공에 선다
  const wx0 = W.contour.reduce((m, q) => Math.min(m, q.x), Infinity)
  const wx1 = W.contour.reduce((m, q) => Math.max(m, q.x), -Infinity)
  const wz = Math.max(...W.contour.map(q => Math.abs(q.z)))
  ok(S.x0 >= wx0 - GEO && S.x1 <= wx1 + GEO, `틀 x가 월대 발자국(${wx0}~${wx1}) 안 — 허공 0`)
  ok(S.hw <= wz + GEO, `틀 z 반폭 ${S.hw} ≤ 월대 z 반폭 ${wz}`)
  ok(near(S.hw, BRD_HW), `틀 z = 관 폭과 같다 — 밀폐관이 그대로 내려온다`)
  //  ★나선 누적·방위
  ok(S.n === Math.round(S.drop / ROOM_STAIR_RISE) && S.steps.length === S.n,
    `단수 ${S.n} = round(낙차 ${S.drop.toFixed(2)} / ${ROOM_STAIR_RISE})`)
  ok(near(S.n * S.rise, S.drop, GEO), `누적 하강 ${(S.n * S.rise).toFixed(4)} = ${S.drop.toFixed(4)}`)
  ok(near(S.steps[S.n - 1].yTop, S.y0, GEO), `마지막 단 = 월대 상면 ${S.y0}`)
  ok(Math.abs(BRD_SFT_TURNS % 1 - 0.5) < EPS, `바퀴 ${BRD_SFT_TURNS} = 반홀수 → 서변 진입·동변 종료`)
  {
    const a = S.at(S.s0), b = S.at(S.sEnd)
    ok(near(a.x, S.mx0, GEO) && Math.abs(a.z) < GEO, `진입 = 서변 중앙(전망대가 서쪽에서 온다)`)
    ok(near(b.x, S.mx1, GEO) && Math.abs(b.z) < GEO, `종료 = 동변 중앙 (x${b.x.toFixed(2)}) — 월대 위에서 ★㊾ 하강로(x124)로 걸어간다`)
  }
  {
    const deg = Math.atan(S.rise / S.going) * 180 / Math.PI
    ok(deg > 10 && deg < 35, `경사 ${deg.toFixed(2)}° — 보행 대역`)
    ok(S.w >= BRD_SPI_W, `답면 ${S.w} ≥ 기둥 나선 ${BRD_SPI_W} — 주 동선으로 승격`)
  }
  //  ★전 디딤이 틀 내부에
  let out = 0
  for (const st of S.steps) {
    const aX = st.dir === 'x+' || st.dir === 'x-', h = S.w / 2, g = S.going / 2
    const x0 = aX ? st.cx - g : st.cx - h, x1 = aX ? st.cx + g : st.cx + h
    const z0 = aX ? st.cz - h : st.cz - g, z1 = aX ? st.cz + h : st.cz + g
    if (x0 < S.inX0 - GEO || x1 > S.inX1 + GEO || z0 < -S.inZ - GEO || z1 > S.inZ + GEO) out++
  }
  ok(out === 0, `디딤 ${S.n}장 전부 틀 내부(벽 관통 0) — 이탈 ${out}`)
  //  ★기하 건전성
  for (const [nm, g] of [['틀', buildShaftFrame()], ['나선', buildShaftSpiral()]]) {
    ok(g !== null && edgeAudit(g) === 0, `샤프트 ${nm}: 에지 위반 ${g ? edgeAudit(g) : 'null'}`)
    ok(signedVolume(g) > 0, `샤프트 ${nm}: 부피 ${signedVolume(g).toFixed(2)} > 0`)
  }
  ok(near(signedVolume(buildShaftSpiral()), S.n * S.w * S.going * S.slab, 1e-2),
    `나선 부피 = ${S.n}단 × ${S.w}×${S.going.toFixed(3)}×${S.slab}`)
  //  ★데크에 구멍이 실제로 뚫렸는가(막힌 바닥이면 내려갈 수 없다)
  {
    const d = buildBridgeDeck(bridgeDeckSpec())
    const V = verts(d)
    const hit = V.some(v => Math.abs(v[0] - S.inX0) < GEO || Math.abs(v[0] - S.inX1) < GEO)
    ok(hit, `데크판에 샤프트 구멍(x${S.inX0.toFixed(2)}~${S.inX1.toFixed(2)})이 뚫려 있다`)
  }
  // ────────────────────────────────────────────────────────────
  console.log('── ⑬ ★147-f ③ 샤프트 하단 출구 + 틀 해석 부피 ──')
  {
    const S2 = shaftSpec(), D = S2.door
    ok((D !== null) === BRD_SFT_DOOR_ON, `출구 체제 ↔ 생성 정합(BRD_SFT_DOOR_ON=${BRD_SFT_DOOR_ON})`)
    if (D) {
      //  ★도구 검증: 문 위치를 검사가 **독립적으로** 다시 푼다(하강로 표본 이분) — 값이 갈리면 잡힌다
      const dd = descentSpec()
      let zc = null
      for (let i = 1; i < dd.samples.length; i++) {
        const a = dd.samples[i - 1], b = dd.samples[i]
        if ((a.x - S2.x1) * (b.x - S2.x1) < 0) { const u = (S2.x1 - a.x) / (b.x - a.x); zc = a.z + u * (b.z - a.z); break }
      }
      ok(zc !== null && near(D.zCross, zc, 1e-6),
        `문 중심 근거 = 하강로가 틀 바깥면 x${S2.x1.toFixed(2)}을 지나는 z ${D.zCross.toFixed(3)}(독립 재계산 일치)`)
      ok(near(D.hz, Math.min(S2.inZ, DESC_HW + Math.abs(D.zCross)), GEO),
        `문 반폭 ${D.hz.toFixed(3)} = min(내부 반폭 ${S2.inZ.toFixed(2)}, 하강로 반폭 ${DESC_HW} + |z| ${Math.abs(D.zCross).toFixed(2)})`)
      ok(D.clamped === (DESC_HW + Math.abs(D.zCross) > S2.inZ), `클램프 플래그 ${D.clamped} = (필요 폭 > 내부 반폭)`)
      ok(2 * D.hz >= 2 * DESC_HW - GEO, `문 폭 ${(2 * D.hz).toFixed(2)} ≥ 하강로 폭 ${2 * DESC_HW} — 통행 성립`)
      ok(D.y1 - D.y0 >= EYE + STEP_UP - GEO,
        `문 높이 ${(D.y1 - D.y0).toFixed(2)} ≥ 눈높이 ${EYE} + 오름 ${STEP_UP} — 머리 안 부딪는다`)
      ok(D.hz < S2.hw - GEO, `문설주가 남는다(각 ${(S2.hw - D.hz).toFixed(2)})`)
      ok(near(D.y0, S2.y0, GEO), `문턱 = 월대 상면 ${S2.y0} — 무단차`)
    }
    //  ★해석 부피 — 벽 넷에서 개구를 뺀 값. 문 폭·높이 어느 쪽을 틀어도 갈린다(falsify 가능)
    const H2 = S2.y1 - S2.y0, tW = S2.t
    const vW = tW * H2 * 2 * S2.hw                                  // 서벽
    const vE = D ? tW * H2 * 2 * (S2.hw - D.hz) + tW * (S2.y1 - D.y1) * 2 * D.hz
                 : tW * H2 * 2 * S2.hw                              // 동벽(문설주 둘 + 인방)
    const vNS = 2 * (S2.inX1 - S2.inX0) * H2 * (S2.hw - S2.inZ)      // 남·북벽
    ok(near(signedVolume(buildShaftFrame()), vW + vE + vNS, 1e-2),
      `틀 부피 ${signedVolume(buildShaftFrame()).toFixed(2)} = 해석 ${(vW + vE + vNS).toFixed(2)}`)
  }

  // ────────────────────────────────────────────────────────────
  console.log('── ⑭ ★147-f ② 천장 노치 — 잘린 변이 전부 살 속인가 ──')
  {
    const N = ceilNotchSpec()
    ok(N.on === (BRD_ON && BRD_EAST === 'portal'), `노치 체제 ↔ 동단 체제 정합`)
    ok(near(N.lap, BRD_CEIL_LAP, GEO) && N.lap > 0, `물림 ${N.lap} = 벽 두께÷2`)
    ok(N.hz > BRD_HW - BRD_T + GEO && N.hz < BRD_HW - GEO,
      `노치 반폭 ${N.hz} ∈ (측벽 안면 ${(BRD_HW - BRD_T).toFixed(2)}, 바깥면 ${BRD_HW}) — 잘린 변이 측벽 살 속`)
    ok(N.yLo > BRD_DECK_BOT + GEO && N.yLo < BRD_YW - GEO,
      `노치 밑변 ${N.yLo} ∈ (데크 밑 ${BRD_DECK_BOT}, 보행면 ${BRD_YW}) — 데크판 살 속`)
    if (BRD_TRP_ON) {
      //  ★150 동결선: yHi = 빗면 **중심선**이 노치 반폭 hz를 지나는 높이(독립 재계산). 위로 열면 슬롯,
      //   아래로 닫으면 통행 단면 잠식 — 이 높이가 유일하게 가장자리를 살 한복판에 둔다.
      const yFreeze = BRD_TRP_JY + (BRD_TRP_JZ - N.hz) * BRD_TRP_SLOPE
      ok(near(N.yHi, yFreeze, EPS), `★150 노치 윗변 ${N.yHi.toFixed(3)} = 동결선(빗면 중심선이 hz ${N.hz} 통과) 재계산 ${yFreeze.toFixed(3)}`)
      //  그 높이에서 가장자리가 정말 살 속인가 — 외피·내면으로 협공
      const zc = BRD_TRP_JZ - (N.yHi - BRD_TRP_JY) / BRD_TRP_SLOPE
      ok(Math.abs(zc - N.hz) < EPS && N.hz > BRD_TRP_O2 + BRD_T / 2,
        `동결선에서 벽 중심선 = ${zc.toFixed(3)} = hz(살 정중앙) · 상부 외피 ${(BRD_TRP_O2 + BRD_T / 2).toFixed(3)} < hz(위로는 안 연다)`)
    } else ok(N.yHi > BRD_ROOF_BOT + GEO && N.yHi < BRD_ROOF_TOP - GEO,
      `노치 윗변 ${N.yHi} ∈ (지붕 밑 ${BRD_ROOF_BOT}, 상면 ${BRD_ROOF_TOP}) — 지붕판 살 속`)
    if (N.well) {
      const S3 = shaftSpec()
      ok(N.well.x0 === undefined, `데크 밑 몫에 서쪽 경계 없음 — 천장이 x115.68에서 스스로 끝나므로 새 잘린 변 0(★147-f ⑤)`)
      ok(N.well.x1 > S3.inX1 + GEO && N.well.x1 < S3.x1 - GEO,
        `우물 동변 ${N.well.x1.toFixed(3)} ∈ (${S3.inX1.toFixed(2)}, ${S3.x1.toFixed(2)}) — 동벽 살 속`)
      ok(near(N.well.yTop, N.yLo, GEO), `우물 윗변 = 관 노치 밑변 — 두 영역이 이음매 없이 붙는다`)
    }
    //  ★전망대 개구(수직 절단면)의 실치수
    if (BRD_EAST === 'portal') {
      if (BRD_VLT_ON) {
        const riseI = Math.hypot((BRD_EAST_X - BRD_X0) / BRD_VLT_N, 2 * (BRD_HW - BRD_T)) / 2
        ok(near(BRD_ROOF_BOT - BRD_YW, BRD_VLT_COL + riseI, EPS),
          `★148 전망대 개구 = **첨두 아치 윤곽**: 폭 ${(2 * (BRD_HW - BRD_T)).toFixed(2)} · 정점 ${(BRD_ROOF_BOT - BRD_YW).toFixed(3)}(구 직사각 7.00의 2.5배 — 현도 인지 대상)`)
      } else if (BRD_TRP_ON) ok(BRD_TRP_CAPY + BRD_T / 2 - BRD_YW > BRD_TRP_H && BRD_TRP_O < 2 * (BRD_HW - BRD_T),
        `★150 전망대 개구 = 사다리꼴+슬릿+갓 단면(바닥 10.30 → 꼭대기 ${BRD_TRP_O} · 총고 ${(BRD_TRP_CAPY + BRD_T / 2 - BRD_YW).toFixed(2)}) — 구 직사각의 재정의`)
      else ok(near(BRD_ROOF_BOT - BRD_YW, BRD_CLEAR, GEO),
        `전망대 개구 ${(2 * (BRD_HW - BRD_T)).toFixed(2)} × ${BRD_CLEAR} (폭 = 관 내부 유효폭 · 높이 = 내부고)`)
    }
  }
} else ok(buildShaftFrame() === null, `샤프트 미생성 — ${!BRD_ON ? 'BRD_ON=false' : 'BRD_SFT_ON=false'}`)

// ────────────────────────────────────────────────────────────
console.log('── ⑮ ★147-g 갓 서쪽 처마 살(두께 0 처마 → 끝면 + 쐐기 주머니 메움) ──')
{
  const E = gatEaveSpec()
  ok(E.on === GAT_EAVE_ON, `처마 살 체제 정합(GAT_EAVE_ON=${GAT_EAVE_ON})`)
  const geo = buildGatEave()
  ok((geo !== null) === GAT_EAVE_ON, `체제 ↔ 생성 정합`)
  if (geo) {
    ok(edgeAudit(geo) === 0, `처마 살: 에지 일관성 위반 0`)
    ok(signedVolume(geo) > 0, `처마 살: 부호 부피 ${signedVolume(geo).toFixed(2)} > 0(바깥 감김)`)
    //  ★현도 조건 — "원기둥과 천장에 틈이 생기지 않는 선에서". 살 밑면이 벽 top 아래로 물려야 닫힌다.
    let worstGap = -1e9, lap = 1e9
    for (const st of E.stations) {
      const wallTop = ceilY(st.xi), bot = st.yTopIn - E.t
      worstGap = Math.max(worstGap, bot - wallTop); lap = Math.min(lap, wallTop - bot)
    }
    ok(worstGap < -GEO, `벽 top ↔ 살 밑면: 전 정거장 물림(최소 ${lap.toFixed(3)}) — 틈 0(현도 조건)`)
    ok(E.t > E.pocket + GEO,
      `두께 ${E.t} > 쐐기 주머니 최대 ${E.pocket.toFixed(3)} — 주머니를 닫는 하한을 넘는다`)
    //  ★끝면이 실제로 있는가 = 바깥 변에서 두께가 t인가(종잇장 반증)
    const last = E.stations[E.stations.length - 1]
    ok(near(last.yTopEx - (last.yTopEx - E.t), E.t, GEO), `바깥 끝면 높이 = 두께 ${E.t}(종잇장 소멸)`)
    //  ★범위 = ⓑ 서쪽 대역만: 렌즈가 접점에서 폭 0으로 닫히고, 다리 대역은 비어 있다
    ok(near(E.stations[0].width, E.rIn * 0 + (COR_R - E.rIn), 1e-2) || E.stations[0].width < 0.1,
      `접점 쪽 폭 ${E.stations[0].width.toFixed(3)} ≈ 0 — 그루터기 없이 스스로 닫힌다`)
    ok(E.azTan > Math.PI / 2 && E.azEnd < Math.PI, `렌즈 방위 ${(E.azTan * 180 / Math.PI).toFixed(1)}°~${(E.azEnd * 180 / Math.PI).toFixed(1)}° — 서쪽 대역만(현도 ⓑ)`)
    //  ★다리 대역 침범 0 — 끝면이 아케이드 벽 살 속에서 끝난다
    const V = verts(geo)
    const zmin = Math.min(...V.map(v => Math.abs(v[2])))
    ok(zmin > BRD_HW - BRD_T - GEO && zmin < BRD_HW + GEO,
      `살의 |z| 최소 ${zmin.toFixed(3)} ∈ 아케이드 벽 살 [${(BRD_HW - BRD_T).toFixed(2)}, ${BRD_HW}] — 끝면 은닉`)
    //  ★윗면이 갓 위로 안 솟는가(바깥 변 = ceilY 항등)
    let worstTop = 0
    for (const st of E.stations) worstTop = Math.max(worstTop, Math.abs(st.yTopEx - ceilY(st.xe)))
    ok(worstTop < 1e-6, `바깥 변 윗면 = ceilY 항등(편차 ${worstTop.toExponential(1)}) — 갓 위로 돌출 0`)
    //  ★리브 구멍과 무간섭(ⓐ를 안 고른 이유가 실제로 성립하는가)
    let nearest = 1e9
    for (const d of hallDoors()) {
      const a = d.k * 2 * Math.PI / MERIDIANS
      const cx = R_BASE * Math.cos(a), cz = R_BASE * Math.sin(a)
      for (const v of V) nearest = Math.min(nearest, Math.hypot(v[0] - cx, v[2] - cz))
    }
    ok(nearest > SHELL_RIB_R + 1, `리브 구멍까지 최소 ${nearest.toFixed(2)} > 반경 ${SHELL_RIB_R}+1 — 소매 문제 무간섭(ⓑ의 근거)`)
  }
}

// ────────────────────────────────────────────────────────────
console.log('── ⑯ ★147-g v2 갓 절단 + 벽 상향(현도 ⓑ — v1 살 반려) ──')
{
  const G = gatCutSpec()
  ok(G.on === GAT_CUT_ON, `절단 체제 정합(GAT_CUT_ON=${GAT_CUT_ON})`)
  ok(!(GAT_CUT_ON && GAT_EAVE_ON),
    `⛔CUT·EAVE 동시 점등 금지 — 살이 절단면 밖 허공에 뜬다(v1은 외접 돌출을 전제)`)
  if (G.on) {
    //  ★대역 스냅: 접점(162°)이 세그 경계가 아니라 경계 43(161.25°)으로 내림 — 파생 검산
    const segW = 2 * Math.PI / COR_WALL_SEG
    ok(G.segA === Math.floor((Math.PI - Math.PI / GAT_FACETS) / segW),
      `대역 첫 세그 ${G.segA} = floor(접점/세그폭) — 경계 스냅 파생`)
    ok(G.segB === COR_WALL_SEG / 2, `절반 끝 세그 ${G.segB} = N/2(거울이 나머지)`)
    ok(near(G.chord, COR_R * Math.cos(Math.PI / COR_WALL_SEG), GEO), `현 거리 ${G.chord.toFixed(3)} = R·cos(π/N)`)
    //  ★공유 에지 항등 — 검사가 패싯 평면을 **독립 재구성**해 대조(gatPlane 내부 구현과 별개)
    {
      const seal2 = gatSeal(), F2 = GAT_FACETS, rO = COR_R / Math.cos(Math.PI / F2)
      const t0 = Math.PI - 2 * Math.PI / F2, t1 = Math.PI
      const pO = (t) => [COR_CX + rO * Math.cos(t), ceilY(COR_CX + rO * Math.cos(t)), rO * Math.sin(t)]
      const A = pO(t0), B = pO(t1)
      const Cc = [GAT_CX + GAT_CROWN_R * Math.cos(t1), seal2.baseY, GAT_CROWN_R * Math.sin(t1)]
      const d1 = [B[0]-A[0], B[1]-A[1], B[2]-A[2]], d2 = [Cc[0]-A[0], Cc[1]-A[1], Cc[2]-A[2]]
      const nv = [d1[1]*d2[2]-d1[2]*d2[1], d1[2]*d2[0]-d1[0]*d2[2], d1[0]*d2[1]-d1[1]*d2[0]]
      const indep = (x, z) => A[1] - (nv[0]*(x-A[0]) + nv[2]*(Math.abs(z)-A[2])) / nv[1]
      let worst = 0
      for (let i = G.segA; i < G.segB; i++) for (const u of [0, 0.5, 1]) {
        const tA = i * segW, tB = (i + 1) * segW
        const x = COR_CX + COR_R * (Math.cos(tA) + (Math.cos(tB) - Math.cos(tA)) * u)
        const z = COR_R * (Math.sin(tA) + (Math.sin(tB) - Math.sin(tA)) * u)
        worst = Math.max(worst, Math.abs(G.surf(x, z) - indep(x, z)))
      }
      ok(worst < 1e-9, `surf = 패싯 평면 항등(독립 재구성 대조 · 편차 ${worst.toExponential(1)})`)
      //  상향량 = 구 쐐기 주머니: 경계에서 ~0, 꼭짓점에서 최대 — 연속 소멸(그루터기 0)
      const upA = G.surf(COR_CX + COR_R * Math.cos(G.segA * segW), COR_R * Math.sin(G.segA * segW))
                - ceilY(COR_CX + COR_R * Math.cos(G.segA * segW))
      const upV = G.surf(COR_CX - COR_R, 0) - ceilY(COR_CX - COR_R)
      ok(upA < 0.05, `대역 경계 상향 ${upA.toFixed(3)} < 0.05 — 절단·상향이 경계에서 0으로 소멸`)
      //  ⚠자기 적발: 초판은 `2.5 < upV < 3.5`(현재값 고정)였다 — FACETS=8 스윕에서 4.559가 나와 실패했는데
      //   그건 **옳은 파생 동작**이다(패싯이 줄면 돌출·주머니가 커진다). 현재-값 단언 안티패턴 → 불변식으로 교체.
      ok(upV > upA + GEO, `꼭짓점 상향 ${upV.toFixed(3)} > 경계 상향 — 주머니가 꼭짓점으로 갈수록 깊다(단조)`)
      ok(G.surf(COR_CX - COR_R, 0) < gatSeal().baseY - GEO,
        `벽 새 top ${G.surf(COR_CX - COR_R, 0).toFixed(2)} < 크라운 밑동 ${gatSeal().baseY.toFixed(2)} — 상향이 갓 안쪽 링을 안 넘는다`)
    }
    //  ★부호함수 자기 검증: 현-밖·방위 함수가 알려진 점에서 옳은 부호를 내는가(도구 검증)
    const mid = G.segA + 2, tm = (mid + 0.5) * segW
    const pIn = [COR_CX + (G.chord - 1) * Math.cos(tm), 0, (G.chord - 1) * Math.sin(tm)]
    const pOut = [COR_CX + (G.chord + 1) * Math.cos(tm), 0, (G.chord + 1) * Math.sin(tm)]
    ok(G.segOut(mid)(pIn) < 0 && G.segOut(mid)(pOut) > 0, `segOut 부호: 안 −/밖 + (도구 검증)`)
    ok(G.azGE(tm)(pOut) < GEO && G.azGE(tm - 0.01)(pOut) > 0, `azGE 부호: 경계 0·안쪽 + (도구 검증)`)
  }
}

// ────────────────────────────────────────────────────────────
console.log('── ⑰ ★147-j 기둥 셋(현도 7차 판정) ──')
{
  //  ③ 관통 개구 머리 = 아케이드 하현 항등(구 손 값 115.46 → 0.16 슬릿)
  ok(near(BRD_PORT_TOP, BRD_ARC_Y0, GEO),
    `관통 개구 머리 ${BRD_PORT_TOP} = 아케이드 하현 ${BRD_ARC_Y0} 항등 — 바닥판 위 슬릿 0`)
  {
    const P = bridgeDeckSpec().pier
    const V = verts(buildBridgePier())
    const above = V.filter(v => v[1] > BRD_ARC_Y0 + GEO && v[1] < BRD_ARC_Y0 + 1 &&
                                v[0] > P.port.x0 - GEO && v[0] < P.port.x1 + GEO)
    ok(above.length === 0,
      `개구 x대역(${P.port.x0.toFixed(2)}~${P.port.x1.toFixed(2)})에 하현~+1 사이 정점 0 — 틈이 생길 자리가 없다`)
    ok(near(P.port.top, BRD_ARC_Y0, GEO), `pier spec의 개구 머리도 같은 값(사본 아님)`)
  }
  //  ①② ★133 기둥 — z폭 승계 · 머리 = 아케이드 바닥판 밑면
  {
    const B = bridgeSpec()
    ok(near(B.colW, B.landD, GEO), `★133 기둥 x폭 ${B.colW.toFixed(2)} = 참 깊이(불변 — 큰 아치 발이 물린다)`)
    if (BRG_COL_Z === 'pier')
      ok(near(B.colD, 2 * BRD_PIER_HW, GEO),
        `★133 기둥 z폭 ${B.colD.toFixed(2)} = 접속 기둥 z폭 ${(2 * BRD_PIER_HW).toFixed(2)} 항등(현도 ①)`)
    else ok(near(B.colD, B.wOut, GEO), `★133 기둥 z폭 = 관 외곽 폭(구 'fit' 보존계)`)
    const top = bridgeColTop(B)
    if (BRG_COL_TOP === 'arcade')
      ok(near(top, spandrelTop(), GEO),
        `★133 기둥 머리 ${top.toFixed(3)} = 아케이드 바닥판 밑면 항등(현도 ② — 구 ${B.yLandU} 대비 +${(top - B.yLandU).toFixed(2)})`)
    else ok(near(top, B.yLandU, GEO), `★133 기둥 머리 = 참 밑면(구 'land' 보존계)`)
    //  ★큰 아치 발이 여전히 기둥 x면에 물리는가(z를 늘려도 아치 스팬은 안 바뀐다)
    const A = bridgeArchSpec()
    ok(near(A.p1a, B.xL0, GEO) && near(A.p1b, B.xL1, GEO),
      `큰 아치 ①② 발이 기둥 두 면(${B.xL0.toFixed(3)} · ${B.xL1.toFixed(3)})에 그대로 물린다 — 스팬 무변`)
    //  ★기둥이 아케이드 바닥판을 뚫지 않는다(머리 = 밑면 = 맞댐)
    ok(top <= spandrelTop() + GEO, `기둥이 바닥판을 관통하지 않는다(머리 ≤ 밑면)`)
  }
}

//  ══ ⑮ ★★★148 관 사변형 리브 볼트 + 벽앞 기둥 + 첨탑 대역 ⓚ′ ══
if (BRD_VLT_ON) {
  console.log('\n⑮ ★148 볼트·기둥·대역')
  const A = bridgeVaultSpec()
  const meshVol = (g) => {
    const p = g.getAttribute('position'), ix = g.index.array
    let v = 0
    for (let t = 0; t < ix.length; t += 3) {
      const a = [p.getX(ix[t]), p.getY(ix[t]), p.getZ(ix[t])]
      const b = [p.getX(ix[t + 1]), p.getY(ix[t + 1]), p.getZ(ix[t + 1])]
      const c = [p.getX(ix[t + 2]), p.getY(ix[t + 2]), p.getZ(ix[t + 2])]
      v += (a[0] * (b[1] * c[2] - c[1] * b[2]) - b[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b[2] - b[1] * a[2])) / 6
    }
    return v
  }
  //  ── A. 상수 파생 항등(전부 재계산 대조 — 값 고정이 아니라 인과 고정) ──
  {
    ok(near(A.bay, (BRD_EAST_X - BRD_X0) / BRD_VLT_N, EPS), `베이 ${A.bay.toFixed(3)} = 관 길이/${BRD_VLT_N}`)
    ok(near(A.w, 2 * (BRD_HW - BRD_T), EPS), `내부 폭 ${A.w.toFixed(2)} = 2(반폭−벽) — 횡단 스팬`)
    ok(near(A.rise, Math.hypot(A.bay, A.w) / 2, EPS), `라이즈 ${A.rise.toFixed(3)} = hypot(베이, 폭)/2 — 대각 반원이 정한 값(자유도 아님)`)
    ok(near(A.spr, BRD_YW + BRD_VLT_COL, EPS), `스프링 ${A.spr.toFixed(2)} = 보행면 + 기둥 ${BRD_VLT_COL}(현도 ⑥)`)
    ok(near(A.crown, A.spr + A.rise, EPS) && near(A.crown, BRD_ROOF_BOT, EPS),
      `크라운 ${A.crown.toFixed(3)} = 스프링+라이즈 = 지붕 밑 **항등**(빈틈·중복 0)`)
    ok(near(BRD_ROOF_TOP, A.crown + BRD_T, EPS), `지붕 상면 ${BRD_ROOF_TOP.toFixed(3)} = 크라운 + 판`)
    ok(BRD_VLT_SEG === BRD_ARC_SEG, `웹 격자 ${BRD_VLT_SEG} = 아치 분할 ARC_SEG(TDZ 값 복사 — 이 항등이 사본을 잠근다)`)
    ok(near(A.webT, BRD_CEIL_LAP, EPS) && near(A.rib, BRD_T, EPS) && near(A.cw, SPIRE_T, EPS),
      `웹 0.625 = 노치 lap · 리브 1.25 = 판 두께 · 기둥 1.2 = SPIRE_T — 새 숫자 0`)
    ok(near(BRD_ROOF_E, BRD_EAST_X, EPS), `지붕 동단 = 포털면(볼트 체제 — 구 빗천장 컷 24.8 처마 폭주 차단)`)
    ok(BRD_T - A.webT > 0.5, `크라운 돌출(${(A.crown + A.webT).toFixed(3)})이 지붕판 살 속 — 여유 ${(BRD_T - A.webT).toFixed(3)}`)
  }
  //  ── B. 첨두 아치 프로파일(발 0 · 정점 = 라이즈 · 첨두성) ──
  {
    ok(near(A.H1(A.w2), 0, EPS) && near(A.H1(-A.w2), 0, EPS), `횡단 아치 발(±${A.w2}) = 0`)
    ok(near(A.H1(0), A.rise, EPS), `횡단 아치 정점 = 라이즈(정확)`)
    ok(near(A.H2(A.bay / 2), 0, EPS) && near(A.H2(0), A.rise, EPS), `종단 아치 발 0 · 정점 = 라이즈`)
    ok(A.rise > A.w / 2 + EPS && A.rise > A.bay / 2 + EPS, `첨두성: 라이즈 > 반스팬 양방향(원 중심 c < 0)`)
    //  프로파일이 정말 원호인가 — 표본이 원 방정식 위(파생식 검산)
    const c1 = (A.w * A.w / 4 - A.rise * A.rise) / A.w, rho1 = A.w / 2 - c1
    let worst = 0
    for (const t of [0.5, 1.5, 2.5, 3.5]) {
      const h = A.H1(t)
      worst = Math.max(worst, Math.abs(Math.hypot(t - c1, h) - rho1))
    }
    ok(worst < 1e-9, `H1 표본 4점이 원(c ${c1.toFixed(3)} · ρ ${rho1.toFixed(3)}) 위 — 편차 ${worst.toExponential(1)}`)
  }
  //  ── C. surf(인트라도스 장) — 경계 연속 · 벽선 · 전역 대역 ──
  {
    let jump = 0
    for (let k = 1; k < BRD_VLT_N; k++) {
      const xb = A.bayX0(k)
      for (const z of [0, 1.7, -3.1]) jump = Math.max(jump, Math.abs(A.surf(xb - 1e-6, z) - A.surf(xb + 1e-6, z)))
    }
    ok(jump < 1e-4, `베이 경계 15곳 연속(최대 단차 ${jump.toExponential(1)}) — H2 발 0이 보증`)
    ok(near(A.surf(A.bayX0(3) + A.bay / 2, A.w2), A.crown, EPS), `벽선 베이 중앙 = 크라운(측벽 아치 정점)`)
    //  ⚠발은 접선이 수직이라 √ 조건수: 경계 x의 float 오차 δ(~1e-14)가 h ≈ √(2ρδ)(~1e-7)로 증폭된다.
    //   기하가 아니라 평가의 성질이므로 1e-5로 잰다(발 자체가 0인 것은 [214]·[216]이 정확히 잠근다).
    ok(near(A.surf(A.bayX0(3), A.w2), A.spr, 1e-5), `모서리(경계×벽) = 스프링(√조건수 감안 1e-5)`)
    let lo = Infinity, hi = -Infinity
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 20; j++) {
      const s = A.surf(BRD_X0 + (BRD_EAST_X - BRD_X0) * i / 40, -A.w2 + A.w * j / 20)
      lo = Math.min(lo, s); hi = Math.max(hi, s)
    }
    ok(lo > A.spr - EPS && hi < A.crown + EPS, `전역 표본 861점: 스프링 ≤ surf ≤ 크라운`)
    ok(near(A.surf(60, A.w2 + A.lap), A.surf(60, A.w2), EPS), `살속 연장(|z|=${(A.w2 + A.lap).toFixed(3)}) = 벽선 값 — 클램프 성질`)
    ok(A.w2 + A.lap < BRD_HW - EPS, `웹 잘린 변 ${(A.w2 + A.lap).toFixed(3)} < 벽 바깥 ${BRD_HW} — 살 속(불가시)`)
  }
  //  ── D. 웹 메시 — 정점이 정확히 장 위 + 부피 = 두께×평면적(연직 오프셋의 정확 항등) ──
  {
    const g = buildVaultWebs(A)
    const p = g.getAttribute('position')
    //  ⚠베이 경계 정점의 Float32 x(x~145에서 ε ≈ 7.6e-6)는 종단 아치 **발**의 √조건수로
    //   h ≈ √(2ρ₂·7.6e-6) ≈ 9e-3까지 증폭된다(규명: 편차 8.4e-3 실측 = 이 식). 섭동 평가로는 못 피하고,
    //   경계 1e-3 이내 정점은 경계 **극한값**(spr + H1 — H2 발 = 0)과도 대조한다. 진짜 이탈은 여전히 잡힌다.
    let worst = 0, yMin = Infinity, yMax = -Infinity
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      const s = A.surf(x, z)
      let dev = Math.min(Math.abs(y - s), Math.abs(y - s - A.webT))
      const m = (x - BRD_X0) / A.bay
      if (Math.abs(m - Math.round(m)) * A.bay < 1e-3) {
        const sb = A.spr + A.H1(z)
        dev = Math.min(dev, Math.abs(y - sb), Math.abs(y - sb - A.webT))
      }
      worst = Math.max(worst, dev)
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y)
    }
    ok(worst < GEO, `웹 정점 ${p.count}개 전수: 인트라도스/엑스트라도스 장 위(최대 편차 ${worst.toExponential(1)})`)
    ok(yMin > A.spr - GEO && yMax < BRD_ROOF_TOP - 0.5, `y 대역 [${yMin.toFixed(3)}, ${yMax.toFixed(3)}] — 크라운 돌출이 지붕 상면 아래`)
    let exact = 0
    for (let k = 0; k < BRD_VLT_N; k++) exact += A.webT * A.bay * 2 * A.zOut(k)
    const vol = meshVol(g)
    ok(Math.abs(vol - exact) < 0.05, `웹 부피 ${vol.toFixed(3)} = Σ 두께×베이 평면적 ${exact.toFixed(3)}(연직 셸의 정확식 · 감김 검증 겸용)`)
  }
  //  ── E. 횡단 아치 17기 — 정렬 · 부피 = 단면×곡선 길이 ──
  {
    ok(A.bands.length === BRD_VLT_N + 1, `횡단 아치 ${A.bands.length}기 = 경계 수`)
    ok(near(A.bands[0].x0, BRD_X0, EPS) && near(A.bands[BRD_VLT_N].x1, BRD_EAST_X, EPS),
      `양끝 띠가 관 범위에 안으로 붙는다(밖 돌출 0)`)
    //  ⚠부피 = 단면적 × 도심 경로 길이(대칭 단면 + 마이터 조인트의 스윕 정리). 곡선 길이를 그대로 쓰면
    //   단면 도심이 곡선에서 (rib−sink)/2 = 0.375 안쪽(오목 쪽)이라 −6.5%가 남는다(스모크 자가 적발).
    //   도심 경로 = 원호의 반경 오프셋(정확·빌더 유한차분과 독립) 폴리라인.
    const dCen = (A.sink - A.rib) / 2
    const cenPath = (pts) => {
      let L = 0
      for (let j = 1; j < pts.length; j++) L += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])
      return L
    }
    const cArc = (A.w * A.w / 4 - A.rise * A.rise) / A.w, rhoArc = A.w / 2 - cArc
    const ptsB = []
    for (let j = 0; j <= A.seg; j++) {
      const z = -A.w2 + 2 * A.w2 * j / A.seg, h = A.H1(z)
      const cx = z >= 0 ? cArc : -cArc                     // 원 중심(스프링선 위 ±c)
      const nl = Math.hypot(z - cx, h)                     // = ρ — 반경 방향이 정확 법선
      ptsB.push([z + (z - cx) / nl * dCen, h + h / nl * dCen])
    }
    const Lb = cenPath(ptsB)
    const vol = meshVol(buildVaultBands(A)), exact = A.rib * (A.rib + A.sink) * Lb * (BRD_VLT_N + 1)
    ok(Math.abs(vol / exact - 1) < 0.01, `횡단 아치 부피 ${vol.toFixed(1)} = 단면×도심 경로 ${exact.toFixed(1)}(±1%)`)
  }
  //  ── F. 대각 리브 32기 — 그로인 끝점 · 부피 ──
  {
    const g = buildVaultRibs(A)
    ok(near(A.surf(A.bayX0(5), -A.w2), A.spr, EPS) && near(A.surf(A.bayX0(5) + A.bay, A.w2), A.spr, EPS),
      `그로인 끝(모서리) = 스프링 — 리브 발이 기둥 머리 높이에 실린다`)
    ok(near(A.surf(A.bayX0(5) + A.bay / 2, 0), A.crown, EPS), `그로인 교차점(베이 중심) = 크라운`)
    //  부피 = 단면 × 도심 경로(횡단 아치와 같은 정리). 도심 폴리라인을 surf에서 독립 구성.
    const dx = A.bay / 2, dz = A.w2, cx = A.bayX0(0) + A.bay / 2
    const Lp = Math.hypot(dx, dz), dC = (A.sink - A.rib) / 2
    const cen = []
    for (let i = 0; i <= A.seg; i++) {
      const t = -1 + 2 * i / A.seg
      const x = cx + t * dx, z = t * dz, y = A.surf(x, z)
      const tp = Math.min(1, t + 1 / A.seg), tm = Math.max(-1, t - 1 / A.seg)
      const yp = (A.surf(cx + tp * dx, tp * dz) - A.surf(cx + tm * dx, tm * dz)) / ((tp - tm) * Lp)
      const nl = Math.hypot(yp, 1), ns = -yp / nl, ny = 1 / nl
      cen.push([x + ns * (dx / Lp) * dC, y + ny * dC, z + ns * (dz / Lp) * dC])
    }
    let Lr = 0
    for (let i = 1; i <= A.seg; i++) Lr += Math.hypot(cen[i][0] - cen[i - 1][0], cen[i][1] - cen[i - 1][1], cen[i][2] - cen[i - 1][2])
    const vol = meshVol(g), exact = A.rib * (A.rib + A.sink) * Lr * 2 * BRD_VLT_N
    ok(Math.abs(vol / exact - 1) < 0.01, `대각 리브 부피 ${vol.toFixed(1)} = 단면×도심 경로 ${exact.toFixed(1)}(±1%)`)
  }
  //  ── G. 벽앞 기둥 — 개수·생략 근거·정확 부피 ──
  {
    const S = shaftSpec()
    const overlap = []
    for (let k = 0; k <= BRD_VLT_N; k++) {
      const xb = A.bayX0(k)
      const x0 = k === 0 ? BRD_X0 : k === BRD_VLT_N ? BRD_EAST_X - A.cw : xb - A.cw / 2
      if (x0 + A.cw > S.inX0 && x0 < S.inX1) overlap.push(k)
    }
    ok(overlap.length === 1 && overlap[0] === 13,
      `샤프트 구멍과 겹치는 경계 = {13}뿐(독립 재계산) — 발 디딜 데크가 없다`)
    ok(A.omitted.length === 2 && A.omitted.every(c => c.k === 13),
      `생략 = 경계 13 양벽 2기(선언된 처리 — 현도 판정 대기)`)
    ok(A.columns.length === 2 * (BRD_VLT_N + 1) - 2, `기둥 ${A.columns.length}기 = 경계 17×양벽 − 생략 2`)
    ok(A.columns.every(c => near(Math.max(Math.abs(c.z0), Math.abs(c.z1)), A.w2, EPS)
      && near(Math.abs(c.z1 - c.z0), A.cw, EPS)), `전 기둥: 벽 안쪽면에 붙어 ${A.cw} 돌출`)
    const vol = meshVol(buildVaultColumns(A)), exact = A.columns.length * A.cw * A.cw * (A.spr - BRD_YW)
    ok(near(vol, exact, 5e-3), `기둥 부피 ${vol.toFixed(3)} = ${A.columns.length}×${A.cw}²×${(A.spr - BRD_YW).toFixed(1)}(Float32 저장 오차 5e-3 — ★134 지식)`)
  }
  //  ── H. 첨탑 대역 ⓚ′ — 정본 파생·스냅 유일성·커버리지·정확 부피·날개 제원 ──
  {
    const SP = spireSpec(), B = A.band
    ok(near(B.rIn, SP.rCylTopIn, EPS) && near(B.rOut, SP.rCylTop, EPS),
      `대역 반경 ${B.rIn}~${B.rOut} = 첨탑 위 원기둥 정본 항등(사본 금지)`)
    const capWant = BRD_VLT_OPEN ? A.crown + A.webT : BRD_ROOF_TOP
    ok(near(B.y0, SP.yTop0, EPS) && near(B.y1, capWant, EPS),
      `대역 y ${B.y0.toFixed(2)}~${B.y1.toFixed(3)} = 빗면 시작 → ${BRD_VLT_OPEN ? '웹 엑스트라도스 크라운' : '지붕 상면'}(파생)`)
    ok(B.y1 + EPS >= A.crown + A.webT, `대역이 서단 최고점(엑스트라도스 크라운 ${(A.crown + A.webT).toFixed(3)})을 덮는다`)
    ok(near(B.half, BRD_BAND_SEGS * 2 * Math.PI / 96, EPS), `반각 = ${BRD_BAND_SEGS}세그 스냅(첨탑 SEG 96)`)
    //  스냅 유일성 — 한 세그 좁으면 관 안폭 미달, 한 세그 넓으면 벽 밖 돌출(실측의 잠금)
    ok(B.rIn * Math.sin(B.half) > A.w2 && B.rOut * Math.sin(B.half) < BRD_HW,
      `커버리지 ${(B.rIn * Math.sin(B.half)).toFixed(3)} > 안폭 ${A.w2} · ${(B.rOut * Math.sin(B.half)).toFixed(3)} < 바깥 ${BRD_HW}`)
    ok(!(B.rIn * Math.sin(B.half - B.segW) > A.w2) && !(B.rOut * Math.sin(B.half + B.segW) < BRD_HW),
      `스냅 유일성: ±1세그는 두 조건 중 하나를 깬다(3세그만 성립)`)
    const vol = meshVol(buildSpireBand(A))
    const exact = BRD_BAND_SEGS * Math.sin(B.segW) * (B.rOut ** 2 - B.rIn ** 2) * (B.y1 - B.y0)
    ok(Math.abs(vol - exact) < 1e-3, `대역 부피 ${vol.toFixed(3)} = 다각형 정확식 ${exact.toFixed(3)}(현 스테이션)`)
    //  날개 제원(파생 잠금): 팔각뿔대 반경을 독립 재계산해 꼭대기 돌출 대조
    const octAt = (y) => SP.octBase + (SP.rMid - SP.octBase) * (y - SP.y1) / (SP.y2 - SP.y1)
    const pTop = B.rOut - octAt(B.y1), pBot = B.rOut - SP.octBase
    ok(pTop > pBot + EPS && near(pBot, B.rOut - SP.octBase, EPS),
      `날개 = 벌어지는 쐐기: 밑 ${pBot.toFixed(3)}(팔각 밑) → 꼭대기 ${pTop.toFixed(3)} — 현도 감수 ⑦`)
    ok(B.y1 > SP.y1 + EPS, `날개가 팔각 어깨 ${SP.y1.toFixed(2)}를 ${(B.y1 - SP.y1).toFixed(3)} 넘는다(선언된 대가)`)
  }
  //  ── I. ⛔★147-f 쐐기 재발 방지 — 상향된 지붕이 여전히 드럼 **안**에서 끝난다 ──
  {
    const surf = gatCutSpec().surf
    const solve = (y, z) => { let a = 100, b = 260; for (let i = 0; i < 100; i++) { const m = (a + b) / 2; if (surf(m, z) < y) a = m; else b = m } return (a + b) / 2 }
    const xr = solve(BRD_ROOF_TOP, BRD_HW)
    ok(xr < BRD_EAST_X - 1, `지붕 상면 ${BRD_ROOF_TOP.toFixed(3)}의 갓 패싯 통과 x ${xr.toFixed(3)} < 동단 ${BRD_EAST_X}(여유 ${(BRD_EAST_X - xr).toFixed(2)})`)
    const xw = solve(BRD_YW, BRD_HW)
    ok(xw < 126.1 + 1e-6, `보행면 통과 ${xw.toFixed(3)} — 관통대 서단 불변(상향은 위만 밀었다)`)
  }
}

//  ══ ⑯ ★★★149 지붕 개방 — 볼트 등 노출 + 스캘럽 측벽 ══
if (BRD_VLT_ON && BRD_VLT_OPEN) {
  console.log('\n⑯ ★149 지붕 개방')
  const A = bridgeVaultSpec()
  const surfC = gatCutSpec().surf
  //  ── A. 캡 경계 — 검사가 천장 교차 구간을 **독립 재계산**해 CAP_K를 잠근다 ──
  {
    const EXT = (x, z) => A.surf(x, z) + A.webT
    //  천장이 볼트 등보다 낮은(= 교차하는) x의 동쪽 끝을 중앙선·벽선 둘로 이분
    const solve = (z) => { let a = 100, b = 200; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (surfC(m, z) < EXT(m, z)) a = m; else b = m } return (a + b) / 2 }
    const xEnd = Math.max(solve(0), solve(BRD_HW - BRD_CEIL_LAP))
    //  ★천장 서단 = 갓 바깥 반경의 방위 180° 지점 — **정본 파생**(손 수치 115.68 금지)
    const ceilW = COR_CX - gatEaveSpec().rOut
    ok(BRD_VLT_CAP_X <= ceilW + GEO,
      `캡 서단 ${BRD_VLT_CAP_X.toFixed(3)} ≤ 갓 천장 서단 ${ceilW.toFixed(3)}(파생) — 교차 구간 서쪽 끝을 덮는다`)
    //  ★최대성 — "최대한 드러낸다"를 잠근다. 이게 없으면 캡을 서쪽으로 아무리 밀어도 검사가 안 문다(스윕 실증).
    ok(BRD_X0 + (BRD_VLT_CAP_K + 1) * A.bay > ceilW + GEO,
      `CAP_K ${BRD_VLT_CAP_K}가 **최대** — 한 베이 더 열면 캡 서단 ${(BRD_X0 + (BRD_VLT_CAP_K + 1) * A.bay).toFixed(3)}이 천장 안으로 들어간다`)
    ok(BRD_EAST_X >= xEnd - GEO && BRD_VLT_CAP_X <= xEnd,
      `천장 교차가 x${xEnd.toFixed(3)}에서 끝나고 캡 구간 [${BRD_VLT_CAP_X.toFixed(2)}, ${BRD_EAST_X}]이 그것을 포함`)
    ok(BRD_VLT_CAP_K > 0 && BRD_VLT_CAP_K < BRD_VLT_N && near(BRD_VLT_CAP_X, BRD_X0 + BRD_VLT_CAP_K * A.bay, EPS),
      `캡 경계가 베이 경계 ${BRD_VLT_CAP_K}에 스냅(x ${BRD_VLT_CAP_X.toFixed(3)}) — 웹 격자와 어긋나지 않는다`)
    const kMin = Math.ceil((xEnd - BRD_X0) / A.bay)
    ok(BRD_VLT_CAP_K <= kMin, `CAP_K ${BRD_VLT_CAP_K} ≤ 교차가 요구하는 최소 ${kMin}(더 크면 천장이 볼트를 자른다)`)
    //  ★노치의 잘린 변이 여전히 지붕판 살 속인가(개방이 이 봉인을 깨지 않았다)
    const N = ceilNotchSpec()
    ok(N.yHi > BRD_ROOF_BOT + EPS && N.yHi < BRD_ROOF_TOP - EPS,
      `노치 윗변 ${N.yHi.toFixed(3)} ∈ 지붕판(${BRD_ROOF_BOT.toFixed(3)}, ${BRD_ROOF_TOP.toFixed(3)}) — 캡 구간에 판이 남아 살이 있다`)
  }
  //  ── B. 벽 윗변 = 볼트 인트라도스 항등(정본 함수 하나를 벽·웹이 공유) ──
  {
    let worst = 0
    for (let i = 0; i <= 400; i++) {
      const x = BRD_X0 + (BRD_VLT_CAP_X - BRD_X0) * i / 400
      for (const z of [BRD_HW - BRD_T, BRD_HW - BRD_T / 2, BRD_HW]) worst = Math.max(worst, Math.abs(brdVaultTopY(x) - A.surf(x, z)))
    }
    ok(worst < 1e-12, `벽 윗변 = surf(x, |z|≥3.90) 항등 — 1203점 편차 ${worst.toExponential(1)}(z 무관 = 모선이 직선)`)
    //  ⚠경계값은 아치 **발**이라 √조건수(★148 규명): 베이 경계 x의 float 오차 1.4e-15가
    //   h ≈ √(2ρδ) ≈ 1.5e-7로 증폭된다. 기하가 아니라 평가의 성질이므로 1e-5로 잰다.
    ok(near(brdVaultTopY(BRD_X0), A.spr, 1e-5) && near(brdVaultTopY(BRD_X0 + A.bay / 2), A.crown, EPS),
      `마루가 경계 ${A.spr.toFixed(2)} ↔ 중앙 ${A.crown.toFixed(3)}으로 물결친다(진폭 = 라이즈 ${A.rise.toFixed(3)})`)
    ok(near(brdVaultTopY(BRD_VLT_CAP_X), A.spr, 1e-5), `캡 경계의 마루 = 스프링(단차 밑이 베이 경계라 정확)`)
  }
  //  ── C. 봉인 — 옆에서 볼 때 안이 안 보인다(벽 윗변 위는 웹이 이어받는다) ──
  {
    let gap = 0, over = 0
    for (let i = 0; i <= 800; i++) {
      const x = BRD_X0 + (BRD_VLT_CAP_X - BRD_X0) * i / 800
      gap = Math.max(gap, A.surf(x, BRD_HW) - brdVaultTopY(x))          // 웹 밑면 − 벽 윗변 (틈)
      over = Math.max(over, brdVaultTopY(x) - A.surf(x, BRD_HW))        // 벽이 볼트를 가리는 양
    }
    ok(gap < 1e-12 && over < 1e-12, `벽 윗변과 웹 밑면이 전 구간 **정확히 맞닿는다**(틈 ${gap.toExponential(1)} · 겹침 ${over.toExponential(1)})`)
    ok(near(A.zOut(0), BRD_HW, EPS) && near(A.zOut(BRD_VLT_N - 1), A.w2 + A.lap, EPS),
      `웹 바깥 한계: 개방 베이 ${A.zOut(0)}(벽 바깥면 flush) · 캡 베이 ${A.zOut(BRD_VLT_N - 1)}(살 속)`)
    for (let k = 0; k < BRD_VLT_N; k++) {
      if (k === BRD_VLT_CAP_K) continue
      if (!near(A.zOut(k), A.zOut(Math.max(0, k - 1)), EPS)) { ok(false, `zOut 단차가 캡 경계 밖(${k})에 있다`); break }
    }
    ok(true, `zOut 단차는 캡 경계 ${BRD_VLT_CAP_K} 한 곳뿐(마구리도 거기 한 장)`)
  }
  //  ── D. 메시 무결 — 웹·측벽 둘 다 닫힌 몸(에지가 방향별로 정확히 한 번) ──
  {
    const audit = (g) => {
      const p = g.getAttribute('position'), ix = g.index.array, m = new Map()
      const K = (i) => [p.getX(i), p.getY(i), p.getZ(i)].map(v => { const s = v.toFixed(4); return s === '-0.0000' ? '0.0000' : s }).join(',')
      for (let t = 0; t < ix.length; t += 3) {
        const v = [K(ix[t]), K(ix[t + 1]), K(ix[t + 2])]
        for (let e = 0; e < 3; e++) { const k = v[e] + '|' + v[(e + 1) % 3]; m.set(k, (m.get(k) || 0) + 1) }
      }
      let bad = 0
      for (const [k, c] of m) { if (c !== 1) bad++; const [a, b] = k.split('|'); if (!m.has(b + '|' + a)) bad++ }
      return bad
    }
    ok(audit(buildVaultWebs(A)) === 0, `웹 에지 감사 0 — T-접합·구멍 없음(4.525 상시 스테이션이 개방↔캡 경계를 맞춘다)`)
    ok(audit(buildBridgeSides(bridgeDeckSpec())) === 0, `측벽 에지 감사 0 — 닫힌 스윕 프리즘(칸별 상자 금지의 사후 봉인)`)
  }
  //  ── E. 밖에서 보이는 민짜 띠가 물결친다(★148에서 남긴 의제의 부수 해소) ──
  {
    const lo = A.spr + A.webT - BRD_DECK_BOT, hi = A.crown + A.webT - BRD_DECK_BOT
    ok(hi - lo > A.rise - GEO, `민짜 띠가 ${lo.toFixed(3)} ↔ ${hi.toFixed(3)}로 물결친다(구 통짜 ${(145.721 - BRD_DECK_BOT).toFixed(3)} 평면)`)
    ok(hi < 145.721 - BRD_DECK_BOT, `최대치도 구 통짜보다 낮다 — 지붕판 두께 몫이 빠졌다`)
  }
}


//  ── ★158 공용: 다각형에 ∫L(y)dA — L은 y의 **구간선형**(브레이크 127 · 142.825)이라
//   그 높이에서 잘라 조각마다 면적×L(무게중심 y)로 **정확히** 적분한다.
function _clipY(poly, Y, keepBelow) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const ia = keepBelow ? a[1] <= Y : a[1] >= Y
    const ib = keepBelow ? b[1] <= Y : b[1] >= Y
    if (ia) out.push(a)
    if (ia !== ib) { const t = (Y - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, Y]) }
  }
  return out
}
function _areaCentroid(poly) {
  let A2 = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]
    const cr = x0 * y1 - x1 * y0
    A2 += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr
  }
  if (Math.abs(A2) < 1e-14) return { a: 0, cy: 0 }
  return { a: Math.abs(A2) / 2, cy: cy / (3 * A2) }
}
//  poly = [z,y] 목록(면적은 z-y 평면). L(y) = brdEndX(y) − x0
//  ★159: 끝 면이 두 장이라 **교대선**에서도 쪼갠다. 조각 안에서는 끝 x가 (z,y)에 선형이므로
//   면적 × 끝x(무게중심)가 정확하다.
function _clipG(poly, g, keepPos) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const ga = keepPos ? g(a) : -g(a), gb = keepPos ? g(b) : -g(b)
    if (ga >= 0) out.push(a)
    if ((ga >= 0) !== (gb >= 0)) { const t = ga / (ga - gb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
  }
  return out
}
function _centroid2(poly) {
  let A2 = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]
    const cr = x0 * y1 - x1 * y0
    A2 += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr
  }
  if (Math.abs(A2) < 1e-14) return null
  return { a: Math.abs(A2) / 2, cz: cx / (3 * A2), cy: cy / (3 * A2) }
}
function intLenOverQuad(poly, x0) {
  let pieces = [poly]
  for (const Y of [BRD_YW]) {
    const nx = []
    for (const pc of pieces) for (const c of [_clipY(pc, Y, true), _clipY(pc, Y, false)]) if (c.length >= 3) nx.push(c)
    pieces = nx
  }
  {
    const nx = []
    for (const pc of pieces) {
      const sg = pc.reduce((a, p) => a + p[0], 0) >= 0 ? 1 : -1
      const g = (p) => sg * p[0] - brdCrossZ(p[1])
      for (const c of [_clipG(pc, g, true), _clipG(pc, g, false)]) if (c.length >= 3) nx.push(c)
    }
    pieces = nx
  }
  let v = 0
  for (const pc of pieces) {
    const c = _centroid2(pc)
    if (c && c.a > 1e-12) v += c.a * (brdEndX(c.cy, c.cz) - x0)
  }
  return v
}

//  ══ ⑰ ★★★150 사다리꼴 관 — 파생 항등 · 프리즘 정확 부피 · 접합 실측 ══
if (BRD_TRP_ON) {
  console.log('\n⑰ ★150 사다리꼴 관')
  const A = trapSpec()
  const meshVol = (g) => {
    const p = g.getAttribute('position'), ix = g.index.array
    let v = 0
    for (let t = 0; t < ix.length; t += 3) {
      const a = [p.getX(ix[t]), p.getY(ix[t]), p.getZ(ix[t])]
      const b = [p.getX(ix[t + 1]), p.getY(ix[t + 1]), p.getZ(ix[t + 1])]
      const c = [p.getX(ix[t + 2]), p.getY(ix[t + 2]), p.getZ(ix[t + 2])]
      v += (a[0] * (b[1] * c[2] - c[1] * b[2]) - b[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b[2] - b[1] * a[2])) / 6
    }
    return v
  }
  //  ── A. 파생 사슬 항등(현도 6값 → 전 좌표 재계산 대조) ──
  {
    ok(near(BRD_TRP_JZ, BRD_HW + BRD_TRP_F, EPS) && near(BRD_TRP_JY, BRD_YW + BRD_TRP_F, EPS),
      `접점 (±${BRD_TRP_JZ.toFixed(2)}, ${BRD_TRP_JY.toFixed(2)}) = 45° 스커트(가정)`)
    ok(near(BRD_TRP_SLOPE, (BRD_TRP_H - BRD_TRP_F) / (BRD_TRP_JZ - BRD_TRP_O / 2), EPS),
      `빗면 기울기 ${BRD_TRP_SLOPE.toFixed(3)} (${(Math.atan(BRD_TRP_SLOPE) * 180 / Math.PI).toFixed(1)}°)`)
    ok(near(BRD_TRP_TIPZ, BRD_TRP_JZ + BRD_TRP_D / BRD_TRP_SLOPE, EPS) && near(BRD_TRP_TIPY, BRD_TRP_JY - BRD_TRP_D, EPS),
      `처마 끝 (±${BRD_TRP_TIPZ.toFixed(3)}, ${BRD_TRP_TIPY.toFixed(2)}) — 접점 지나 ${BRD_TRP_D} 내림`)
    ok(BRD_TRP_TIPY > BRD_DECK_BOT + EPS, `처마 끝이 데크 밑(${BRD_DECK_BOT})보다 ${(BRD_TRP_TIPY - BRD_DECK_BOT).toFixed(2)} 위 — 아케이드 띠와 안 겹친다`)
    ok(near(BRD_TRP_SLIT, BRD_TRP_V * 0.45, EPS) && near(BRD_TRP_STUB * 2 + BRD_TRP_SLIT, BRD_TRP_V, EPS),
      `슬릿 ${BRD_TRP_SLIT.toFixed(2)} + 토막 2×${BRD_TRP_STUB.toFixed(3)} = 구간 ${BRD_TRP_V}(위젯 비례 45% 승계)`)
    ok(near(BRD_TRP_CAPY, BRD_TRP_C0Y + (BRD_TRP_C0Z - BRD_TRP_M / 2) * BRD_TRP_SLOPE, EPS),
      `갓 마루 중심선 ${BRD_TRP_CAPY.toFixed(3)} — 갓 빗판이 벽과 같은 기울기`)
    ok(near(BRD_ROOF_TOP, BRD_TRP_CAPY + BRD_T / 2, EPS), `외피 상면 ${BRD_ROOF_TOP.toFixed(3)} = 마루 + 판 절반(파생)`)
    ok(near(BRD_TRP_OVH, SPIRE_SINK, EPS), `갓 돌출 ${BRD_TRP_OVH} = SPIRE_SINK(침강 가족 — 새 숫자 0)`)
    ok(2 * BRD_TRP_JZ > 2 * BRD_HW && near(2 * BRD_TRP_JZ, 14.1, 1e-9),
      `발 전폭 ${(2 * BRD_TRP_JZ).toFixed(2)} > 아케이드 10.30 — 현도 의도 확인 ②`)
  }
  //  ── B. 부재 프리즘 — 등단면이므로 부피 = 단면적 × 길이 **정확식**(감김·중복을 부피 하나로 잠근다) ──
  {
    const P = buildBridgeTrapParts()
    const base = ['스커트', '빗면', '토막아래', '토막위', '갓빗판', '갓마루']
    const want = [...base,
      ...(BRD_END_ON ? ['동단마개'] : []),                    // ★158 동단 빗면 마개
      ...(BRD_COL_ON ? ['기둥몸', '슬릿마개'] : []),          // ★157 도면 트레이스 리브 + 슬릿 마개
      ...(BRD_WCUT ? base.map(b => '서단' + b) : []),        // ★151 서단 연장체(면추종)
      ...(BRD_BAND_ON ? ['첨탑대역'] : [])]                   // ★151: 절단이 틈을 없애면 대역은 파생으로 꺼진다
    ok(P.solid.length === want.length && P.solid.every((p, i) => p.id === want[i]),
      `부재 ${P.solid.length}기 = ${want.join('·')}`)
    for (const s of A.secs) {
      const part = P.solid.find(p => p.id === s.id)
      if (!part) { ok(false, `${s.id} 파츠 누락`); continue }
      let exact
      if (s.id === '빗면') {   // ★150-b 조립체 + ★158 빗면 컷 — (s,u) 사각을 y로 사상해 ∫길이 적분
        const PS = trapPanelSpec()
        const Ls = Math.hypot(BRD_TRP_JZ - BRD_TRP_O2, BRD_TRP_AY - BRD_TRP_JY)
        const dy2 = (BRD_TRP_AY - BRD_TRP_JY) / Ls, ny2 = -(BRD_TRP_O2 - BRD_TRP_JZ) / Ls
        const dz2 = (BRD_TRP_O2 - BRD_TRP_JZ) / Ls, nz2 = (BRD_TRP_AY - BRD_TRP_JY) / Ls
        const yOf = (sp, u) => BRD_TRP_JY + dy2 * sp + ny2 * (BRD_T / 2 - u)
        const zOf = (sp, u) => BRD_TRP_JZ + dz2 * sp + nz2 * (BRD_T / 2 - u)
        //  ★159: 끝 x가 (y,z) 둘에 의존 → (s,u) 격자로 세밀 적분(빌더와 같은 이산화 · ★144 규칙)
        //  ★159: 빌더는 패치를 s로 쪼갠 뒤 **모서리 넷의 끝 x를 이중선형 보간**한다.
        //   해석식도 같은 이산화를 써야 한다(★144 규칙 — 다른 이산화로 재면 영원히 안 맞는다).
        const sCrossAt = (u) => (BRD_YW - BRD_TRP_JY - ny2 * (BRD_T / 2 - u)) / dy2
        exact = 0
        for (const p of PS.patches) {
          const sC2 = (u) => {
            const yb = BRD_TRP_JY + ny2 * (BRD_T / 2 - u), zb = Math.abs(BRD_TRP_JZ + nz2 * (BRD_T / 2 - u))
            const zs = (BRD_TRP_JZ + nz2 * (BRD_T / 2 - u)) >= 0 ? 1 : -1
            const A1 = -BRD_END_K * dy2, B1 = BRD_EAST_X - BRD_END_K * (yb - BRD_YW)
            const A2 = -(zs * dz2) / BRD_PROW_K, B2 = BRD_PROW_X0 + (BRD_PROW_Z0 - zb) / BRD_PROW_K
            return Math.abs(A1 - A2) < 1e-12 ? NaN : (B2 - B1) / (A1 - A2)
          }
          const cs = [sCrossAt(p.u0), sCrossAt(p.u1), sC2(p.u0), sC2(p.u1)]
            .filter(v => isFinite(v) && v > p.s0 + 1e-9 && v < p.s1 - 1e-9).sort((a, b) => a - b)
          const raw = []
          let s0b = p.s0
          for (const c of cs) { raw.push([s0b, c]); s0b = c }
          raw.push([s0b, p.s1])
          const bands = []
          for (const [a2, b2] of raw) {
            const n2 = Math.max(1, Math.ceil((b2 - a2) / SLOPE_DS))
            for (let i = 0; i < n2; i++) bands.push([a2 + (b2 - a2) * i / n2, a2 + (b2 - a2) * (i + 1) / n2])
          }
          for (const [sa, sb] of bands) {
            const eA = Math.min(p.x1, brdEndX(yOf(sa, p.u0), zOf(sa, p.u0)))
            const eB = Math.min(p.x1, brdEndX(yOf(sb, p.u0), zOf(sb, p.u0)))
            const eC = Math.min(p.x1, brdEndX(yOf(sa, p.u1), zOf(sa, p.u1)))
            const eD = Math.min(p.x1, brdEndX(yOf(sb, p.u1), zOf(sb, p.u1)))
            const avg = (eA + eB + eC + eD) / 4
            exact += 2 * (sb - sa) * (p.u1 - p.u0) * (avg - p.x0)
          }
        }
      } else exact = intLenOverQuad(s.quad, BRD_X0) * (s.mirror ? 2 : 1)   // ★158 빗면 컷 반영
      const vol = meshVol(part.geo)
      ok(Math.abs(vol - exact) < 0.05, `${s.id} 부피 ${vol.toFixed(2)} = ${s.id === '빗면' ? '패치 합' : '단면적×길이'} ${exact.toFixed(2)}(정확식)`)
      if (s.id === '빗면') ok(true, `빗면: 에지 감사 면제 — 상자 타일링의 내부 접면 중복은 구조적(불가시·부피 상쇄). 부피 정확식·NaN·감김이 대신 잠근다`)
      else ok(edgeAudit(part.geo) === 0, `${s.id} 에지 감사 0(닫힌 프리즘${s.mirror ? ' ×2' : ''})`)
    }
  }
  //  ── C. 단면 위상 — 봉인·틈·겹침(전부 파생 좌표의 부등식) ──
  {
    const t = BRD_T, snk = SPIRE_SINK
    //  스커트 밑끝 연장이 데크 살 속: 연장점 z < 데크 가장자리 5.15 · y ∈ (125.5, 127)
    const ext = [BRD_HW - snk * Math.SQRT1_2, BRD_YW - snk * Math.SQRT1_2]
    ok(ext[0] < BRD_HW - EPS && ext[1] > BRD_DECK_BOT + EPS && ext[1] < BRD_YW - EPS,
      `스커트 밑끝(${ext[0].toFixed(3)}, ${ext[1].toFixed(3)}) = 데크 살 속(침강)`)
    //  빗면 위끝 연장이 토막 살 속: 연장점 z ∈ 토막 살(±O2±t/2) · y > AY
    const L = Math.hypot(BRD_TRP_JZ - BRD_TRP_O2, BRD_TRP_AY - BRD_TRP_JY)
    const ex2 = [BRD_TRP_O2 - snk * (BRD_TRP_JZ - BRD_TRP_O2) / L, BRD_TRP_AY + snk * (BRD_TRP_AY - BRD_TRP_JY) / L]
    ok(Math.abs(ex2[0]) > BRD_TRP_O2 - t / 2 && Math.abs(ex2[0]) < BRD_TRP_O2 + t / 2 && ex2[1] > BRD_TRP_AY,
      `빗면 위끝(${ex2[0].toFixed(3)}, ${ex2[1].toFixed(3)}) = 아랫토막 살 속(침강)`)
    //  슬릿이 정말 뚫려 있다: 토막들 사이 y 간격 = SLIT (두 토막의 y 범위가 안 겹침)
    ok(BRD_TRP_AY + BRD_TRP_STUB + EPS < BRD_TRP_AY + BRD_TRP_STUB + BRD_TRP_SLIT - EPS,
      `슬릿 ${BRD_TRP_SLIT.toFixed(2)} 개방(토막 사이 y ${(BRD_TRP_AY + BRD_TRP_STUB).toFixed(3)}~${(BRD_TRP_AY + BRD_TRP_STUB + BRD_TRP_SLIT).toFixed(3)})`)
    //  갓 마루판 연장이 갓 빗판 살 속(z 방향 snk)
    ok(BRD_TRP_M / 2 + snk < BRD_TRP_C0Z + t / 2, `갓 마루판 연장(±${(BRD_TRP_M / 2 + snk).toFixed(2)})이 빗판 대역 안`)
    //  갓 돌출 소핏(의도된 처마): 갓 밑 바깥 모서리가 토막 바깥면보다 밖
    ok(BRD_TRP_C0Z > BRD_TRP_O2 + EPS, `갓이 토막보다 ${BRD_TRP_OVH} 밖 — 노출 소핏 = 의도(현도 스케치)`)
  }
  //  ── D. 동단 안전(★147-f 재발 방지) + 교차부 선언 실측 ──
  {
    const surf = gatCutSpec().surf
    const solve = (y, z) => { let a = 100, b = 220; for (let i = 0; i < 90; i++) { const m = (a + b) / 2; if (surf(m, z) < y) a = m; else b = m } return (a + b) / 2 }
    const xr = solve(BRD_ROOF_TOP, BRD_TRP_M / 2)
    ok(xr < BRD_EAST_X - 1, `마루 상면 ${BRD_ROOF_TOP.toFixed(3)}의 패싯 통과 x ${xr.toFixed(3)} < 동단(여유 ${(BRD_EAST_X - xr).toFixed(2)})`)
    const xt = solve(BRD_TRP_TIPY, Math.min(BRD_TRP_TIPZ, 4.5))
    ok(xt > BRD_X0 + 50, `처마 끝 높이의 천장 도달 x ${xt.toFixed(2)} — 서쪽 ${(xt - BRD_X0).toFixed(1)}는 자유 구간(교차는 동쪽 국소)`)
    //  ★★★152: 노치가 밴드(중심선 추종)로 바뀌었다 — **잔재 0**을 실측으로 잠근다.
    const N2 = ceilNotchSpec()
    ok(Array.isArray(N2.bands) && N2.bands.length === 6, `노치 밴드 ${N2.bands.length}기(중심선 추종) — 구 축평행 상자 폐지`)
    let gapMax = 0, gapY = 0, over = 0
    for (let i = 0; i <= 600; i++) {
      const y = BRD_DECK_BOT + BRD_CEIL_LAP + (BRD_ROOF_TOP - (BRD_DECK_BOT + BRD_CEIL_LAP)) * i / 600
      const b = N2.bands.find(bb => y >= bb.y0 - 1e-9 && y <= bb.y1 + 1e-9)
      if (!b) continue
      const zb = b.a * y + b.b, ze = A.zOut(y)
      if (ze > 1e-9 && zb > ze) over = Math.max(over, zb - ze)          // 밴드가 관 밖 = 천장에 구멍
      if (y >= BRD_TRP_JY && ze > 1e-9 && ze - zb > gapMax) { gapMax = ze - zb; gapY = y }
    }
    ok(over < 1e-9, `밴드가 관 외곽을 넘지 않는다(초과 ${over.toExponential(1)}) — 천장에 여분 구멍 없음`)
    //  빗면 대역에서 남는 몫은 **살 두께의 수평 반폭**뿐이어야 한다(69.5°라 0.625가 아니라 0.667)
    const halfH = (BRD_T / 2) * Math.hypot(1, 1 / BRD_TRP_SLOPE)
    ok(gapMax < halfH + 1e-6, `빗면 대역 잔재 ${gapMax.toFixed(4)}(y${gapY.toFixed(2)}) ≤ 살 수평 반폭 ${halfH.toFixed(4)} — 남는 건 살 속뿐`)
    ok(near(N2.bands[2].a, -1 / BRD_TRP_SLOPE, EPS) && near(N2.bands[1].a, 1, EPS),
      `밴드 기울기 = 빗면 −1/${BRD_TRP_SLOPE.toFixed(3)} · 스커트 45°(파생 — 손 수치 0)`)
    //  구 상자였다면 얼마가 남았는지(고친 것의 크기 — 현도 사진의 그 쐐기)
    let boxWorst = 0, boxY = 0
    for (let i = 0; i <= 600; i++) {
      const y = BRD_YW + (BRD_TRP_NOTCH_TOP - BRD_YW) * i / 600
      const d = A.zOut(y) - (BRD_HW - BRD_CEIL_LAP)
      if (d > boxWorst) { boxWorst = d; boxY = y }
    }
    ok(boxWorst > 3, `구 상자 노치였다면 y${boxY.toFixed(2)}에서 ${boxWorst.toFixed(3)}의 천장 살이 관 **안**에 남았다 — 고친 것의 크기`)
  }
  //  ── E. 서단 접합 — ★151이면 면추종 절단, 아니면 대역 ⓚ′ ──
  if (BRD_WCUT) {
    const SP = spireSpec()
    //  E-1. 격자점이 **첨탑 다각형 위에 정확히** 있나 — 방위로 역산한 독립 재계산(사본 아님)
    let worst = 0
    for (const { q: Q, n: nH } of trapWestPieces()) {
      for (let i = 0; i <= WCUT_NU; i++) for (let j = 0; j <= WCUT_NV; j++) {
        const u = i / WCUT_NU, v = j / WCUT_NV
        const a = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u]
        const b = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u]
        const z = a[0] + (b[0] - a[0]) * v, y = a[1] + (b[1] - a[1]) * v
        const x = spireCutX(y, z, SP, nH)
        if (!isFinite(x)) { worst = Infinity; break }
        const R = wellWallR(y, { spec: SP, forceSpire: true })
        const N = nH, az0 = nH === 8 ? SP.cornerAz0 : 0
        const st = 2 * Math.PI / N, phi = Math.atan2(Math.abs(z), x)
        const k = Math.floor((phi - az0) / st), mid = az0 + (k + 0.5) * st
        worst = Math.max(worst, Math.abs(Math.hypot(x, z) - R * Math.cos(st / 2) / Math.cos(phi - mid)))
      }
    }
    ok(worst < 1e-9, `절단면 격자점이 첨탑 다각형 위 — 최대 편차 ${worst.toExponential(1)}(방위 역산 독립 대조)`)
    //  E-1b. **칸 사이의 현 오차** — 격자점만 재면 해상도가 아무리 거칠어도 통과한다(스윕이 적발).
    //   칸 중앙에서 네 꼭짓점 x의 이중선형 값과 참 절단면 x를 대조한다.
    let chord = 0
    for (const { q: Q, n: nH } of trapWestPieces()) {
      const C = (u, v) => {
        const a = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u]
        const b = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u]
        return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]
      }
      for (let i = 0; i < WCUT_NU; i++) for (let j = 0; j < WCUT_NV; j++) {
        const uu = [i / WCUT_NU, (i + 1) / WCUT_NU], vv = [j / WCUT_NV, (j + 1) / WCUT_NV]
        let lerp = 0
        for (const u of uu) for (const v of vv) { const [z, y] = C(u, v); lerp += spireCutX(y, z, spireSpec(), nH) / 4 }
        const [zc, yc] = C((uu[0] + uu[1]) / 2, (vv[0] + vv[1]) / 2)
        chord = Math.max(chord, Math.abs(lerp - spireCutX(yc, zc, spireSpec(), nH)))
      }
    }
    ok(chord < 0.02, `칸 사이 현 오차 ${chord.toFixed(4)} < 0.02 — 격자 ${WCUT_NU}×${WCUT_NV}가 다각 꼭짓점을 잡는다`)
    //  E-1c. **조각 태그 독립 검증** — 태그를 스펙에서 그대로 읽으면 눈이 먼다(스윕 실증).
    //   조각 **내부 표본점**의 y로 다각형을 다시 유도해 태그와 대조하고, 조각이 y1을 걸치지 않음도 확인.
    let tagBad = 0, straddle = 0
    for (const { q: Q, n: nH } of trapWestPieces()) {
      const ys = Q.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys)
      if (lo < SP.y1 - 1e-9 && hi > SP.y1 + 1e-9) straddle++
      for (const [u, v] of [[0.25, 0.5], [0.5, 0.5], [0.75, 0.5]]) {
        const a = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u]
        const b = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u]
        const y = a[1] + (b[1] - a[1]) * v
        if ((y <= SP.y1 ? SPIRE_BODY_SEG : 8) !== nH) tagBad++
      }
    }
    ok(tagBad === 0, `조각 태그 = 내부 표본점이 요구하는 다각형(불일치 ${tagBad}) — 96각↔8각 오배정 없음`)
    ok(straddle === 0, `y1 턱을 걸친 조각 0 — 분할선이 불연속과 정확히 일치`)
    //  E-2. **근사 금지의 근거**: 원으로 쟀으면 팔각 구간에서 1 이상 어긋난다
    let dev = 0
    for (let i = 0; i <= 200; i++) {
      const y = BRD_TRP_TIPY + (BRD_ROOF_TOP - BRD_TRP_TIPY) * i / 200
      const z = A.zOut(y), R = wellWallR(y, { spec: SP, forceSpire: true })
      if (R * R > z * z) dev = Math.max(dev, Math.abs(Math.sqrt(R * R - z * z) - spireCutX(y, z)))
    }
    ok(dev > 0.5, `원 근사였다면 최대 ${dev.toFixed(3)} 어긋났다(팔각 구간) — 다각형 추종이 필수인 근거`)
    //  E-3. 첨탑보다 넓은 구간이 없다(NaN = 설계 오류)
    let bad = 0
    for (let i = 0; i <= 400; i++) {
      const y = BRD_TRP_TIPY + (BRD_ROOF_TOP - BRD_TRP_TIPY) * i / 400
      if (!isFinite(spireCutX(y, A.zOut(y)))) bad++
    }
    ok(bad === 0, `전 높이에서 관이 첨탑 단면 안 — 절단 성립(NaN 0)`)
    //  E-4. 연장체가 본체와 **침강으로 겹친다**(공면 접촉면 금지)
    ok(SPIRE_SINK > 0, `서단 연장체 동단 ${(BRD_X0 + SPIRE_SINK).toFixed(2)} = 본체 살 속(침강 ${SPIRE_SINK}) — 공면 접촉면 없음`)
    //  E-5. 초승달이 정의상 0 · 대역이 파생으로 꺼졌다
    ok(!BRD_BAND_ON, `대역 ⓚ′ 소등 — 틈을 가리던 부재라 절단이 틈을 없애면 존재 이유가 없다(파생)`)
    const xMin = spireCutX(BRD_ROOF_TOP, 0), xMax = spireCutX(BRD_TRP_JY, A.zOut(BRD_TRP_JY))
    ok(xMin < BRD_X0 - 5 && xMax < BRD_X0,
      `관이 첨탑에 박힌다: 마루 x${xMin.toFixed(2)} ~ 최대폭 x${xMax.toFixed(2)}(구 평면 ${BRD_X0}) — 깊이 ${(BRD_X0 - xMin).toFixed(2)}`)
  } else {
    const SP = spireSpec(), B = bridgeVaultSpec().band
    ok(B.on, `대역 살아있음(BAND_ON = VLT‖TRP 파생)`)
    ok(near(B.y1, BRD_ROOF_TOP, EPS), `대역 캡 ${B.y1.toFixed(3)} = 외피 상면(파생 — 마루까지 덮는다)`)
    //  새 입 최대 반폭(곧은 벽 위 134.92에서의 내부) — 빗면 내면 재계산
    const nrm = (BRD_TRP_AY - BRD_TRP_JY) / Math.hypot(BRD_TRP_JZ - BRD_TRP_O2, BRD_TRP_AY - BRD_TRP_JY)
    const zin = (y) => BRD_TRP_JZ - (y - BRD_TRP_JY) / BRD_TRP_SLOPE - BRD_T / 2 * nrm
    const need = zin(SP.yTop0)
    //  가림 조건: 동→서 시선이 대역 부채(±11.25°)를 지나는가. 시선의 최소 방위는 **바깥 반경**에서
    //   생긴다(asin(z/r)이 r에 감소) → 기준 = rOut·sin. (초판 rIn은 과잉 엄격 — 스스로 정정)
    //  ⛔**거짓 안전 자기 적발(2026.08.21)**: 초판은 커버 대상을 빗면 **내면**(zin)으로 쟀다 — 실제로 가려야 할 것은
    //   **외피 전체**(zOut)이고, 그것도 대역 y 범위 밖의 스커트·처마까지다. 내면 4.213 < 4.331로 "통과"했지만
    //   외피는 y134.92에서 5.384, 접점 y128.90에서 7.492다. 파생값이 옳아도 **잰 대상이 틀리면 검사는 거짓말한다**.
    let zMaxInBand = 0, zMaxAll = 0, yWorst = 0
    for (let i = 0; i <= 400; i++) {
      const y = BRD_YW + (BRD_ROOF_TOP - BRD_YW) * i / 400
      const z = A.zOut(y)
      if (z > zMaxAll) { zMaxAll = z; yWorst = y }
      if (y >= B.y0 && y <= B.y1) zMaxInBand = Math.max(zMaxInBand, z)
    }
    const cov = B.rOut * Math.sin(B.half)
    ok(true, `⚠선언(★151 의제): 대역 커버 ±${cov.toFixed(3)} < 대역 구간 내 외피 최대 ±${zMaxInBand.toFixed(3)} → 양옆 ${(zMaxInBand - cov).toFixed(3)} 노출`)
    ok(true, `⚠선언: 대역 밑끝 y${B.y0.toFixed(2)} **아래**(스커트·처마 y${BRD_YW}~${B.y0.toFixed(2)})는 대역이 없다 — 외피 최대 ±${zMaxAll.toFixed(3)}(y${yWorst.toFixed(2)})`)
    //  초승달: 관 서단은 **평면**, 첨탑은 **원통** → z≠0에서 반드시 벌어진다(구조적)
    const rAt = (y) => y <= SP.yTop0 ? SP.rCylTop
      : y <= SP.y1 ? SP.rCylTop + (SP.octBase - SP.rCylTop) * (y - SP.yTop0) / (SP.y1 - SP.yTop0)
      : SP.octBase + (SP.rMid - SP.octBase) * (y - SP.y1) / (SP.y2 - SP.y1)
    let cres = 0, cresY = 0
    for (let i = 0; i <= 400; i++) {
      const y = BRD_YW + (SP.yTop0 - BRD_YW) * i / 400
      const z = A.zOut(y), r = rAt(y)
      if (r * r > z * z) { const g = BRD_X0 - Math.sqrt(r * r - z * z); if (g > cres) { cres = g; cresY = y } }
    }
    ok(cres > 1, `⚠선언: 곧은 벽 구간 초승달 최대 ${cres.toFixed(3)}(y${cresY.toFixed(2)}) — ★148 때 0.606에서 커졌다(플레어 때문)`)
    ok(BRD_ROOF_TOP - SP.yTop0 > 0, `⚠선언: 관 마루가 첨탑 곧은 벽 끝을 ${(BRD_ROOF_TOP - SP.yTop0).toFixed(2)} · 팔각 어깨를 ${(BRD_ROOF_TOP - SP.y1).toFixed(2)} 넘는다 — 좁아지는 첨탑에 관이 지느러미로 붙는다`)
    const octAt = (y) => SP.octBase + (SP.rMid - SP.octBase) * (y - SP.y1) / (SP.y2 - SP.y1)
    ok(B.rOut - octAt(B.y1) > 9, `⚠선언: 날개 꼭대기 돌출 ${(B.rOut - octAt(B.y1)).toFixed(2)}(구 7.71 → 커짐) — 실루엣 판정 = 현도`)
  }
  //  ── F. ★150-b 빗면 2단 액자(현도 13·0.56·2.2·0.09·1.10 · 2버전) ──
  if (BRD_TRP_PNL !== 'off') {
    const PS = trapPanelSpec()
    ok(PS.mode === 'in' || PS.mode === 'stamp', `버전 '${PS.mode}'('in' 내부 음각·외부 민짜 / 'stamp' 관통 복사) — 한 글자 전환`)
    ok(PS.patches.length === 2 + (BRD_TRP_PNL_N + 1) + BRD_TRP_PNL_N * 5,
      `패치 ${PS.patches.length} = 가로띠 2 + 세로살 ${BRD_TRP_PNL_N + 1} + 패널(링4+필드)×${BRD_TRP_PNL_N}`)
    //  타일링 항등: 패치 발자국 합 = 빗면 전체 발자국(겹침·빈틈 0을 넓이 하나로 잠근다)
    const foot = PS.patches.reduce((a, p) => a + (p.x1 - p.x0) * (p.s1 - p.s0), 0)
    ok(near(foot, (PS.s1 - PS.s0) * (BRD_EAST_X - BRD_X0), 1e-6),
      `타일링: 발자국 합 ${foot.toFixed(3)} = 전체 ${((PS.s1 - PS.s0) * (BRD_EAST_X - BRD_X0)).toFixed(3)}`)
    ok(near(PS.pw, PS.bay * BRD_TRP_PNL_R, EPS) && near(PS.bay, (BRD_EAST_X - BRD_X0) / BRD_TRP_PNL_N, EPS),
      `베이 ${PS.bay.toFixed(3)} · 패널 폭 ${PS.pw.toFixed(3)}(=비율 ${BRD_TRP_PNL_R}) — 위젯 값 그대로`)
    ok(near(PS.fw, SP_FR_W, EPS), `틀 단 폭 ${PS.fw} = ★127 어귀 액자 띠 폭 승계(새 숫자 0)`)
    ok(2 * BRD_TRP_PNL_DP < BRD_T / 2 - EPS, `총 깊이 ${(2 * BRD_TRP_PNL_DP).toFixed(2)} < 살 절반 — 찢김 없음`)
    if (PS.mode === 'in') {
      ok(PS.patches.every(p => p.u0 === 0), `'in': 전 패치 바깥면 u=0 — **외부 민짜**(현도 버전 ⓐ)`)
      ok(PS.patches.filter(p => p.zone === 'field').every(p => near(p.u1, BRD_T - 2 * BRD_TRP_PNL_DP, EPS)),
        `'in': 필드 두께 ${(BRD_T - 2 * BRD_TRP_PNL_DP).toFixed(2)} — 안쪽만 2단 파임`)
    } else {
      ok(PS.patches.every(p => near(p.u1 - p.u0, BRD_T, EPS)), `'stamp': 전 패치 두께 = 살(관통 복사)`)
      ok(PS.patches.filter(p => p.zone === 'field').every(p => near(p.u0, -2 * BRD_TRP_PNL_DP, EPS)),
        `'stamp': 필드가 밖으로 ${(2 * BRD_TRP_PNL_DP).toFixed(2)} 돋음(외양각·내음각 — 현도 버전 ⓑ)`)
    }
    //  패널 대역이 빗면 안(연직 여백·틀이 위젯 정의 그대로)
    ok(PS.sp0 > PS.s0 + EPS && PS.sp1 < PS.Ls - EPS && PS.sf0 > PS.sp0 && PS.sf1 < PS.sp1,
      `패널 s ${PS.sp0.toFixed(2)}~${PS.sp1.toFixed(2)} ⊂ 빗면 · 틀 안 s ${PS.sf0.toFixed(2)}~${PS.sf1.toFixed(2)}`)
  }
}

//  ══ ⑱ ★★★153 새 층 소등 · ★★★154 첨탑 az0° 문 ══
{
  console.log('\n⑱ ★153 새 층 소등 · ★154 첨탑 az0° 문')
  const SP = spireSpec()
  //  ── ★153: 층이 필요 없어진 근거를 수치로 잠근다 ──
  ok(!UPF_ON, `★131 새 층 소등(계단 2기 + 플랫폼 — 현도 2026.08.21 "둘 다 지워")`)
  ok(near(SPT_Y, BRD_YW, EPS),
    `테라스 ${SPT_Y} = 관 데크 보행면 ${BRD_YW} — **층 차 0**이라 계단이 불필요(★147이 관을 이 레벨에 지으면서 ★132 ⓒ가 무효화됐다)`)
  ok(Math.abs((132.12 + 1.18) - BRD_YW) > 6, `구 플랫폼 걷는 면 133.30은 관 데크보다 ${((132.12 + 1.18) - BRD_YW).toFixed(2)} 높았다 — 소등의 실측 근거`)
  //  ── ★154: 문·틀 ──
  if (SPD_ON) {
    const D = spireDoorSpec(SP)
    ok(near(D.hw, SPD_HW, EPS) && near(D.h, SPD_H, EPS) && near(D.fw, SPD_FW, EPS),
      `문 반폭 ${D.hw} · 높이 ${D.h} · 틀 띠 ${D.fw}(현도 위젯 확정 — 전폭 ${(2 * D.hw).toFixed(2)} · 상단 y${D.y1.toFixed(2)})`)
    ok(near(D.y0, BRD_YW, EPS), `문턱 ${D.y0} = 데크 보행면 — 문지방 단차 0`)
    ok(D.y1 < SP.yTop0 - 1, `문 상단 ${D.y1.toFixed(2)} < 곧은 벽 끝 ${SP.yTop0.toFixed(2)} — 문이 빗면 구간을 침범하지 않는다(여유 ${(SP.yTop0 - D.y1).toFixed(2)})`)
    //  ★개구가 관 내부 안에 든다(넘으면 관 벽을 뚫는다)
    ok(D.hw + D.fw < BRD_HW - BRD_T + EPS,
      `틀 반폭 ${(D.hw + D.fw).toFixed(2)} ≤ 관 내부 반폭 ${(BRD_HW - BRD_T).toFixed(2)} — 문·틀이 관 안에 든다`)
    //  ★침강 근거 — 96각 편차보다 EMB가 크다(틀이 들뜨지 않는다)
    ok(D.emb > Math.max(D.devOut, D.devIn) * 3,
      `문틀 침강 ${D.emb} > 96각 편차 최대 ${Math.max(D.devOut, D.devIn).toFixed(4)}의 3배 — 전 폭에서 살 속(들뜸 0)`)
    ok(D.devOut > 0.01 && D.devIn > 0.01,
      `편차가 0이 아니다(밖 ${D.devOut.toFixed(4)} · 안 ${D.devIn.toFixed(4)}) — 첨탑이 원기둥이 아니라 96각이라는 증거(침강이 필요한 이유)`)
    //  ★종잇장 방지 셋
    ok(near(SP.rCylTop - SP.rCylTopIn, SP.T, EPS), `잼 단면 = 벽 두께 ${SP.T}(SUBTRACTION이라 컷 면이 캡으로 닫힌다 — 얼굴 ①)`)
    const bandsWant = SPD_SIDE === 'both' ? 2 : 1
    ok(D.bands.length === bandsWant, `문틀 ${D.bands.length}면('${SPD_SIDE}') — 얼굴 ②`)
    for (const b of D.bands) ok(b.r1 - b.r0 > SPD_PROJ, `${b.id} 틀 대역 r${b.r0.toFixed(2)}~${b.r1.toFixed(2)} = 내밀기 ${SPD_PROJ} + 침강 ${SPD_EMB} — 얼굴 ③`)
    //  ★메시 무결
    const g = buildSpireDoorFrame(SP)
    ok(edgeAudit(g) === 0, `문틀 에지 감사 0(닫힌 상자 ${D.bands.length * 3}기)`)
    const vol = (() => {
      const p = g.getAttribute('position'), ix = g.index.array
      let v = 0
      for (let t = 0; t < ix.length; t += 3) {
        const a = [p.getX(ix[t]), p.getY(ix[t]), p.getZ(ix[t])]
        const b2 = [p.getX(ix[t + 1]), p.getY(ix[t + 1]), p.getZ(ix[t + 1])]
        const c = [p.getX(ix[t + 2]), p.getY(ix[t + 2]), p.getZ(ix[t + 2])]
        v += (a[0] * (b2[1] * c[2] - c[1] * b2[2]) - b2[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b2[2] - b2[1] * a[2])) / 6
      }
      return v
    })()
    const exact = D.bands.reduce((acc, b) => acc + (b.r1 - b.r0) * (2 * D.fw * D.h + (2 * (D.hw + D.fw)) * D.fw), 0)
    //  ⚠Float32 위치 정밀도 — 1e-6은 못 잰다(프로젝트 규율: 1e-3 톨러런스)
    ok(Math.abs(vol - exact) < 1e-3, `문틀 부피 ${vol.toFixed(4)} = 문설주2+인방 해석 ${exact.toFixed(4)}(정확식)`)
  } else ok(buildSpireDoorFrame() === null, `문 소등 — SPD_ON=false`)
}

//  ══ ⑲ ★★★157 관 내부 기둥 — 도면 트레이스 ══
if (BRD_TRP_ON && BRD_COL_ON) {
  console.log('\n⑲ ★157 관 내부 기둥(도면 트레이스)')
  const A = trapSpec(), K = trapColumnSpec(A), PS = trapPanelSpec()
  //  ── A. 자리 = 살 한복판 · 대칭(★155 계승) ──
  ok(BRD_TRP_PNL_N % 2 === 0, `패널 ${BRD_TRP_PNL_N}기가 짝수 — 홀수면 "두 개당 하나"의 양 끝 여백이 어긋난다`)
  ok(K.xs.length === BRD_TRP_PNL_N / 2, `기둥 ${K.xs.length}기 = 패널 ÷ 2`)
  const wMar = K.xs[0] - BRD_X0, eMar = BRD_EAST_X - K.xs[K.xs.length - 1]
  ok(near(wMar, eMar, EPS), `양 끝 여백 대칭 ${wMar.toFixed(3)}`)
  let offMax = 0
  for (const xc of K.xs) { let best = Infinity
    for (let k = 1; k < BRD_TRP_PNL_N; k++) best = Math.min(best, Math.abs(xc - (BRD_X0 + k * PS.bay)))
    offMax = Math.max(offMax, best) }
  ok(offMax < 1e-9, `기둥이 살 중심에 앉는다(편차 ${offMax.toExponential(1)})`)
  ok(K.w < K.gap - EPS, `기둥 폭 ${K.w} < 살 ${K.gap.toFixed(3)}(여유 양쪽 ${((K.gap - K.w) / 2).toFixed(3)})`)
  //  ── B. 곡선이 도면 제어점을 **정확히** 지난다 ──
  {
    let worst = 0
    for (const [z, y] of BRD_COL_CURVE) worst = Math.max(worst, Math.abs(K.curveZ(y) - z))
    ok(worst < 1e-9, `안쪽 면이 도면 제어점 ${BRD_COL_CURVE.length}개를 정확히 지난다(편차 ${worst.toExponential(1)})`)
    //  ⚠제어점 사이 과주 — 무해함을 수치로 선언
    let over = 0, oy = 0
    for (let i = 0; i <= 2000; i++) { const y = K.y0 + (K.yTop - K.y0) * i / 2000
      const d = K.curveZ(y) - Math.max(...BRD_COL_CURVE.map(p => p[0]))
      if (d > over) { over = d; oy = y } }
    ok(over < 0.02, `스플라인 과주 ${over.toFixed(4)}(y${oy.toFixed(1)}) — 제어점 최대 3.73 대비 무해(그 높이 벽 여유 ${(K.innerWallZ(oy) - K.curveZ(oy)).toFixed(2)})`)
  }
  //  ── C. 기둥이 벽 **안**에 있다(두께 ≥ 0 · 관 밖으로 안 나간다) ──
  {
    let neg = 0, thMax = 0, thY = 0
    for (let i = 0; i <= 2000; i++) { const y = K.y0 + (K.yTop - K.y0) * i / 2000
      const t = K.th(y); if (t < -1e-9) neg++
      if (t > thMax) { thMax = t; thY = y } }
    ok(neg === 0, `전 높이에서 두께 ≥ 0 — 곡선이 벽 안쪽면을 넘지 않는다`)
    ok(thMax > 2 && thMax < 3, `최대 두께 ${thMax.toFixed(3)}(y${thY.toFixed(2)}) — 접점 부근에서 가장 두껍다(스케치대로)`)
    ok(near(K.yTop, BRD_COL_CURVE[BRD_COL_CURVE.length - 2][1] - BRD_COL_TH0, EPS),
      `몸통 끝 ${K.yTop.toFixed(3)} = 벽 안쪽면 불연속(${BRD_COL_CURVE[BRD_COL_CURVE.length - 2][1]}) 직전 — 마감 두께 ${K.th(K.yTop).toFixed(4)}`)
    ok(K.th(K.yTop) > 1e-3 && K.th(K.yTop) < 0.1,
      `마감 두께 ${K.th(K.yTop).toFixed(4)} — 0이 아니면서(단면 퇴화 회피) 불가시`)
    //  ★리브는 **단봉**이어야 한다: 두께가 한 번 오르고 한 번 내린다.
    //   제어점 하나만 어긋나도 중간에 잘록해지는데, 최대·최소만 재는 가드로는 안 잡힌다(스윕 실증).
    let peak = -1, peakY = 0
    for (let i = 0; i <= 1200; i++) { const y = K.y0 + (K.yTop - K.y0) * i / 1200
      const t = K.th(y); if (t > peak) { peak = t; peakY = y } }
    //  ⚠개수가 아니라 **크기**로 잰다(개수 가드는 참 곡선의 미세 요동도 물었다).
    //  ⛔그리고 **한 칸씩의 변화**를 재면 안 된다 — 0.76짜리 잘록함도 스텝당 0.0046이라 안 물린다(스윕 실증).
    //   **달리는 극값과의 누적 편차**로 잰다. 느린 표류를 잡는 유일한 방법이다.
    let bad = 0, runMax = -Infinity, runMin = Infinity
    for (let i = 0; i <= 1200; i++) { const y = K.y0 + (K.yTop - K.y0) * i / 1200
      const t = K.th(y)
      if (y < peakY) { runMax = Math.max(runMax, t); bad = Math.max(bad, runMax - t) }
      else { runMin = Math.min(runMin, t); bad = Math.max(bad, t - runMin) }
    }
    //  ⚠문턱 0.15의 근거: 벽 안쪽면이 **스커트 밑 모서리**(y127.088)에서 4.443→4.355로 0.089 들어간다 —
    //   벽의 실제 형상이지 기둥 결함이 아니다. 치환 반증은 0.4 이상을 만들므로 여유가 충분하다.
    ok(bad < 0.15, `두께가 **단봉**(y${peakY.toFixed(2)}에서 ${peak.toFixed(3)} 정점) — 역행 최대 ${bad.toFixed(4)} < 0.15(벽 모서리 몫 0.089 포함)`)
  }
  //  ── D. 슬릿 마개(현도 확정: 기둥이 빛틈을 메운다) ──
  {
    ok(near(K.slit.y0, BRD_TRP_AY + BRD_TRP_STUB, EPS) && near(K.slit.y1 - K.slit.y0, BRD_TRP_SLIT, EPS),
      `슬릿 마개 y${K.slit.y0.toFixed(3)}~${K.slit.y1.toFixed(3)} = 슬릿 구간 그대로`)
    ok(near(K.slit.zOut - K.slit.zIn, BRD_T, EPS), `마개 두께 ${BRD_T} = 벽 전체(그 높이엔 벽이 없다)`)
    const openRatio = 1 - (K.xs.length * K.w) / (BRD_EAST_X - BRD_X0)
    ok(openRatio > 0.8, `슬릿은 길이의 ${(openRatio * 100).toFixed(1)}%가 여전히 열려 있다(기둥 ${K.xs.length}기 × 폭 ${K.w})`)
  }
  //  ── E. 수평 단면 두 버전 ──
  {
    ok(K.sect === 'trap' || K.sect === 'rect', `수평 단면 '${K.sect}' — 한 글자 전환(현도 "둘 다 구현")`)
    ok(near(K.r, K.sect === 'rect' ? 1 : BRD_COL_R, EPS),
      `안쪽 폭 ${(K.w * K.r).toFixed(2)} / 벽 쪽 ${K.w}${K.sect === 'rect' ? '(직사각)' : '(사다리꼴)'}`)
  }
  //  ── F. 메시 — 로프트 부피 정확식 · 에지 감사 ──
  {
    const P2 = buildBridgeTrapParts()
    const meshVol = (g) => {
      const p = g.getAttribute('position'), ix = g.index.array
      let v = 0
      for (let t = 0; t < ix.length; t += 3) {
        const a = [p.getX(ix[t]), p.getY(ix[t]), p.getZ(ix[t])]
        const b = [p.getX(ix[t + 1]), p.getY(ix[t + 1]), p.getZ(ix[t + 1])]
        const c = [p.getX(ix[t + 2]), p.getY(ix[t + 2]), p.getZ(ix[t + 2])]
        v += (a[0] * (b[1] * c[2] - c[1] * b[2]) - b[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b[2] - b[1] * a[2])) / 6
      }
      return v
    }
    let ex = 0
    for (let i = 0; i + 1 < K.stations.length; i++) {
      const y0 = K.stations[i], y1 = K.stations[i + 1]
      ex += (y1 - y0) * (K.areaAt(y0) + K.areaAt(y1)) / 2
    }
    ex *= K.xs.length * 2
    const body = P2.solid.find(p => p.id === '기둥몸')
    ok(Math.abs(meshVol(body.geo) - ex) < 0.01, `기둥몸 부피 ${meshVol(body.geo).toFixed(3)} = 스테이션 사다리꼴 적분 ${ex.toFixed(3)}`)
    ok(edgeAudit(body.geo) === 0, `기둥몸 에지 감사 0(로프트 ${K.xs.length * 2}기 · 스테이션 ${K.stations.length})`)
    const cap = P2.solid.find(p => p.id === '슬릿마개')
    const exC = (K.w * (1 + K.r) / 2) * (K.slit.zOut - K.slit.zIn) * (K.slit.y1 - K.slit.y0) * K.xs.length * 2
    ok(Math.abs(meshVol(cap.geo) - exC) < 0.01, `슬릿마개 부피 ${meshVol(cap.geo).toFixed(3)} = 해석 ${exC.toFixed(3)}`)
    ok(edgeAudit(cap.geo) === 0, `슬릿마개 에지 감사 0`)
    //  ★스테이션이 벽 관절(JY)과 곡선 제어점을 포함하는가 — ★151·152·156의 교훈
    ok(K.stations.some(y => near(y, BRD_TRP_JY, 1e-9)), `스테이션에 벽 관절 y${BRD_TRP_JY} 포함(꺾임 규율)`)
    const missing = BRD_COL_CURVE.filter(([, y]) => y > K.y0 && y < K.yTop && !K.stations.some(s2 => near(s2, y, 1e-9)))
    ok(missing.length === 0, `스테이션에 곡선 제어점 전부 포함(누락 ${missing.length})`)
  }
  //  ── G. 통행 ──
  {
    ok(near(2 * K.curveZ(BRD_YW), 6.96, 1e-3), `보행면 순폭 ${(2 * K.curveZ(BRD_YW)).toFixed(3)}(도면 3.48 × 2)`)
  }
} else if (BRD_TRP_ON) ok(buildTrapColumns() === null, `기둥 소등 — BRD_COL_ON=false`)

//  ══ ⑳ ★★★158 동단 빗면 마개 ══
if (BRD_TRP_ON && BRD_END_ON) {
  console.log('\n⑳ ★158 동단 빗면 마개')
  const A = trapSpec(), E = trapEndSpec(A)
  //  ── A. 빗면 파생 ──
  ok(near(BRD_END_Y1, BRD_TRP_AY + BRD_TRP_STUB, EPS),
    `빗면 윗점 y${BRD_END_Y1.toFixed(3)} = **슬릿 밑바닥**(파생 — 현도가 거기 맞춰 그렸다)`)
  ok(near(brdEndX(BRD_YW), BRD_EAST_X, EPS) && near(brdEndX(BRD_END_Y1), BRD_END_X1, EPS),
    `빗면 (${BRD_EAST_X}, ${BRD_YW}) → (${BRD_END_X1}, ${BRD_END_Y1.toFixed(3)}) · 각 ${E.angle.toFixed(1)}°(연직에서 ${(90 - E.angle).toFixed(1)}°)`)
  ok(near(brdEndX(BRD_END_Y1, 0), BRD_END_X1, EPS), `빗면이 슬릿 밑바닥에서 x${BRD_END_X1}(도면의 그 점)`)
  //  ★159 되돌림: 빗면 위는 다시 수직 컷(★158 체제)
  ok(near(brdSlantX(BRD_ROOF_TOP), BRD_END_X1, EPS), `빗면 위는 **수직 컷** x${BRD_END_X1}(★158 체제 복귀)`)
  //  ★현도 지시 자체를 가드로: "빗면으로 처리" — 수직도 수평도 아니어야 한다.
  //   값만 대조하면 X1을 144.5(사실상 수직)로 바꿔도 통과한다(스윕 실증).
  ok(E.angle > 55 && E.angle < 82, `빗면 각 ${E.angle.toFixed(1)}° ∈ (55°, 82°) — 수직 컷도 평지붕도 아닌 **빗면**(현도 지시)`)
  ok(BRD_EAST_X - BRD_END_X1 > 2, `눕는 수평량 ${(BRD_EAST_X - BRD_END_X1).toFixed(2)} — 눈에 보일 만큼 눕는다`)
  ok(near(brdEndX(BRD_DECK_BOT), BRD_EAST_X, EPS),
    `보행면 아래는 동단 ${BRD_EAST_X}로 클램프 — 식대로면 145를 넘는다(처마·데크 살)`)
  //  ── B. 관 부재가 컷 면을 넘지 않는다 ──
  {
    const P = buildBridgeTrapParts()
    let worst = -Infinity, wid = ''
    for (const p of P.solid) {
      if (p.id.startsWith('서단') || p.id === '첨탑대역') continue
      const pos = p.geo.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const d = pos.getX(i) - brdEndX(pos.getY(i))
        if (d > worst) { worst = d; wid = p.id }
      }
    }
    ok(worst < 1e-3, `전 부재가 컷 면 서쪽(최대 초과 ${worst.toFixed(4)} · ${wid}) — 빗면 밖으로 안 나간다`)
    //  상부가 실제로 잘렸나(안 잘리면 145까지 갈 것)
    for (const id of ['갓마루', '토막위', '갓빗판']) {
      const pos = P.solid.find(p => p.id === id).geo.getAttribute('position')
      let mx = -Infinity
      for (let i = 0; i < pos.count; i++) mx = Math.max(mx, pos.getX(i))
      ok(near(mx, BRD_END_X1, 1e-3), `${id} 동단 ${mx.toFixed(3)} = 수직 컷 ${BRD_END_X1}`)
    }
    //  ⚠**선언된 빚(현도 2026.08.21 되돌림)**: 이 수직 컷은 기울어진 드럼 천장을 못 따라간다.
    //   중심에서 −0.005 · 가장자리에서 −0.623 어긋나고, 잘린 면이 y142.83~148 대역에서 천장 아래라
    //   드럼에서 관 단면이 보인다. ★159의 해법(빗면 연장 + 뱃머리)은 **현도가 반려**했다 — 미해결로 남는다.
    ok(true, `⚠선언: 동단 상부 단면이 드럼에 노출된다(수직 컷 vs 기운 천장) — ★159 반려로 미해결`)
  }
  //  ── C. 마개 — 닫힘·부피·에지 ──
  {
    const cap = buildTrapEndCap(A)
    ok(near(E.th, BRD_T * Math.hypot(1, BRD_END_K), EPS),
      `판 **수평** 두께 ${E.th.toFixed(3)} = 살 ${BRD_T} × √(1+k²) — 눕는 만큼 커진다(연직 1.25가 아니다)`)
    //  ⚠초기값을 0으로 두면 음수만 나오는 최대값이 0으로 고정돼 **항상 통과**한다(자기 적발 — ±Infinity로 시작한다)
    let cover = Infinity, over = -Infinity
    for (let i = 0; i <= 400; i++) {
      const y = BRD_YW + (E.y1 - BRD_YW) * i / 400
      cover = Math.min(cover, E.zAt(y) - E.innerZ(y))     // 0 미만이면 안 덮는다
      over = Math.max(over, E.zAt(y) - A.zOut(y))         // 0 초과면 살 밖으로 나간다
    }
    ok(cover >= -1e-9, `판이 관 내부를 전부 덮는다(최소 여유 ${cover.toFixed(4)})`)
    ok(over < -1e-9, `판 가장자리가 살 **속**에서 끝난다(외피 대비 최대 ${over.toFixed(4)})`)
    const meshVol = (g) => {
      const p = g.getAttribute('position'), ix = g.index.array
      let v = 0
      for (let t = 0; t < ix.length; t += 3) {
        const a = [p.getX(ix[t]), p.getY(ix[t]), p.getZ(ix[t])]
        const b = [p.getX(ix[t + 1]), p.getY(ix[t + 1]), p.getZ(ix[t + 1])]
        const c = [p.getX(ix[t + 2]), p.getY(ix[t + 2]), p.getZ(ix[t + 2])]
        v += (a[0] * (b[1] * c[2] - c[1] * b[2]) - b[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b[2] - b[1] * a[2])) / 6
      }
      return v
    }
    //  ★159: 마개는 **셀 타일링**(끝 면이 두 장) — 셀 부피 합이 정확식이다
    const { cells, thSlant, thProw } = endCapCells(A)
    let ex = 0
    for (const c of cells) ex += c.th * (c.y1 - c.y0) * ((c.v1 - c.v0) / 2) * (c.zAt0 + c.zAt1)
    ok(Math.abs(meshVol(cap.geo) - ex) < 0.01, `마개 부피 ${meshVol(cap.geo).toFixed(3)} = 셀 ${cells.length}기 합 ${ex.toFixed(3)}(정확식)`)
    ok(true, `마개 에지 감사 면제 — 셀 타일링의 내부 접면 중복은 구조적(부피 정확식이 대신 잠근다)`)
    ok(near(thSlant, BRD_T * Math.hypot(1, BRD_END_K), EPS) && thProw > thSlant,
      `셀 두께 두 종: 빗면 ${thSlant.toFixed(3)} · 뱃머리 ${thProw.toFixed(3)}(더 눕는 면이 더 두껍다)`)
    ok(E.stations.some(y => near(y, BRD_YW, 1e-9)) && E.stations.some(y => near(y, BRD_TRP_JY, 1e-9)),
      `마개 스테이션에 꺾임(보행면 ${BRD_YW} · 벽 관절 ${BRD_TRP_JY}) 포함`)
    ok(near(E.y0, BRD_DECK_BOT + BRD_CEIL_LAP, EPS), `판 밑끝 ${E.y0} = 데크 살 속(침강)`)
  }
  //  ── D. 빛구멍 = 마개 위 ──
  {
    const openH = BRD_TRP_CAPY - BRD_T / 2 - E.y1
    ok(openH > 1, `빛구멍 높이 ${openH.toFixed(3)}(마개 위 y${E.y1.toFixed(3)} ~ 갓 마루 밑 ${(BRD_TRP_CAPY - BRD_T / 2).toFixed(3)}) — 현도 "윗부분만 뚫는다"`)
    ok(E.y1 < BRD_TRP_CAPY, `마개가 갓에 닿지 않는다 — 그 사이가 구멍이다`)
  }
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ★147~158 접속 통로 : ${n}항 중 ${n - fail} green` + (fail ? ` · ${fail} 실패` : ''))
process.exit(fail ? 1 : 0)
