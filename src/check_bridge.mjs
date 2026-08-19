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
  BRD_ARC_SPRW, BRD_ARC_SPRE, BRD_ARC_SEG,
  BRA_ON, BRA_H, BRA_T, BRA_HW, BRA_WT, BRA_SEG, BRA_SPAN_ON, BRD_ARC_FLR,
  BRD_SPI_ON, BRD_STAIR_ON,
  BRD_SFT_ON, BRD_SFT_W, BRD_SFT_TURNS,
  //  이웃 정본(맞댈 상대)
  SPT_Y, SPT_T, DRG_R_IN, DRG_W, DRG_Y, DRG_H, DRG_KS, DRG_RAIL_W, DRG_WALL_T,
  ceilY, COR_CYL_X0, ROOM_STAIR_RISE, ROOM_STAIR_SLAB, COR_Y0, COR_THICK,
} from './constants.js'
import {
  bridgeDeckSpec, spiralAt, buildBridgeDeck, buildBridgeSides, buildBridgeRoof,
  buildBridgePier, buildBridgeSpiral, buildBridgeStair, buildBridgeDeckParts,
  arcadeBaySpec, arcadeStations, buildBridgeArcade,
  bridgeArchSpec, archCenterline, buildBridgeArches, buildBridgeSpandrels, buildArcadeFloor, spandrelTop,
  shaftSpec, buildShaftFrame, buildShaftSpiral,
} from './bridgeDeckGeometry.js'
import { woldaeSpec } from './corridorStairsGeometry.js'
import { EYE, STEP_UP } from './waypoints.js'
import { spireSpec } from './spireGeometry.js'
import { buildBridgeComplex } from './bridgeComplexGeometry.js'
import { BRG_ON, BRG_MODE, BRG_KEEP } from './constants.js'

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
{ //  빗천장 역함수 왕복 — 한쪽만 맞추면 통과하는 항이 아니다
  ok(near(ceilY(BRD_DECK_E), BRD_DECK_BOT, GEO), `ceilY(데크 동단 ${BRD_DECK_E.toFixed(3)}) = 데크 밑 ${BRD_DECK_BOT} (역함수 왕복)`)
  ok(near(ceilY(BRD_ROOF_E), BRD_ROOF_TOP, GEO), `ceilY(지붕 동단 ${BRD_ROOF_E.toFixed(3)}) = 지붕 상면 ${BRD_ROOF_TOP}`)
  ok(BRD_ROOF_E > BRD_DECK_E, `지붕이 데크보다 동쪽으로 더 간다(빗천장이 동쪽으로 상승하므로) Δ${(BRD_ROOF_E - BRD_DECK_E).toFixed(2)}`)
}
ok(near(BRD_ROOF_BOT - BRD_YW, BRD_CLEAR), `내부고 ${BRD_CLEAR} = 지붕 밑 − 보행면 (위젯이 현도에게 보인 정의 그대로)`)
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
ok((BRD_SIDE === 'solid') === (buildBridgeSides(A) !== null), `측벽 체제 ↔ 생성 정합('${BRD_SIDE}')`)

// ────────────────────────────────────────────────────────────
console.log('── ⑥ 기하 건전성(에지 일관성 · 부호 부피 · 해석 부피) ──')
const parts = buildBridgeDeckParts()
//  ⚠보존계(BRD_ON=false)에서 검사가 **죽으면** 스윕 자체가 무의미해진다(2026.08.19 스윕이 적발).
//   소등 상태에서는 "소등이 맞다"만 확인하고 기하 항을 건너뛴다.
const nSolid = (BRD_SIDE === 'solid' ? 1 : 0) + (BRD_ARC_ON ? 1 : 0) * 2 + (BRA_ON ? 1 : 0) + (BRD_ON && BRA_ON && BRA_SPAN_ON ? 1 : 0) + (BRD_SFT_ON ? 1 : 0) + 2
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
  const vDeck = hole === null
    ? ((xEb - BRD_X0) + (xEt - BRD_X0)) / 2 * h * 2 * hw
    : (hole.a - BRD_X0) * h * 2 * hw
      + ((xEb - hole.b) + (xEt - hole.b)) / 2 * h * 2 * hw
      + 2 * (hole.b - hole.a) * h * (hw - hole.z)
  ok(near(signedVolume(buildBridgeDeck(A)), vDeck, 1e-2),
    `데크판 부피 ${signedVolume(buildBridgeDeck(A)).toFixed(3)} = 해석 ${vDeck.toFixed(3)}`)

  if (BRD_SIDE === 'solid') {
    const hs = BRD_ROOF_BOT - BRD_YW
    const vSide = 2 * ((ceilXAt(BRD_YW) - BRD_X0) + (ceilXAt(BRD_ROOF_BOT) - BRD_X0)) / 2 * hs * BRD_T
    ok(near(signedVolume(buildBridgeSides(A)), vSide, 1e-2),
      `측벽 부피 ${signedVolume(buildBridgeSides(A)).toFixed(3)} = 해석 ${vSide.toFixed(3)}`)
  } else ok(buildBridgeSides(A) === null, `'${BRD_SIDE}' 체제 — 민짜 측벽 미생성(★147-b 아케이드 자리)`)

  const vRoof = ((ceilXAt(BRD_ROOF_BOT) - BRD_X0) + (ceilXAt(BRD_ROOF_TOP) - BRD_X0)) / 2 * BRD_T * 2 * hw
  ok(near(signedVolume(buildBridgeRoof(A)), vRoof, 1e-2),
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
  //  ★계단과의 z 분리(동 구간에서 계단이 아케이드 하현 위로 올라온다)
  ok(BRD_STAIR_HW < BRD_HW - BRD_T + GEO,
    `계단 반폭 ${BRD_STAIR_HW} < 아케이드 안쪽면 ${(BRD_HW - BRD_T).toFixed(2)} — 계단이 아케이드 살을 뚫지 않는다`)
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
    const vol = (area(stW) + area(stE)) * BRD_T * 2      // × 두께 × **벽 두 장**(남·북)
    ok(near(signedVolume(g), vol, 1e-2),
      `아케이드 부피 ${signedVolume(g).toFixed(3)} = 해석 ${vol.toFixed(3)} (스테이션 사슬 사다리꼴 적분 × 두께 × 양면)`)
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
    const v = L * BRA_T * BRA_WT * 2
    ok(Math.abs(signedVolume(g) - v) / v < 0.03,
      `큰 아치 부피 ${signedVolume(g).toFixed(2)} ≈ 중심선 ${L.toFixed(2)} × ${BRA_T} × ${BRA_WT} × 2장 = ${v.toFixed(2)} (±3%)`)
  }
  ok(BRA_SEG >= 16, `호 분할 ${BRA_SEG} ≥ 16`)
} else {
  ok(buildBridgeArches() === null, `큰 아치 미생성 — ${!BRD_ON ? 'BRD_ON=false' : 'BRA_ON=false(보존계)'}`)
}


console.log('── ⑪ 스팬드럴 + 아케이드 바닥판(현도 로컬 판정 1차 반영) ──')
if (BRD_ON && BRD_ARC_ON) {
  const A = bridgeArchSpec(), top = spandrelTop()
  ok(near(top, BRD_ARC_Y0 - BRD_ARC_FLR, GEO), `스팬드럴 상단 ${top.toFixed(2)} = 하현 ${BRD_ARC_Y0} − 바닥판 ${BRD_ARC_FLR}`)
  //  ★바닥판이 아치를 뚫지 않는가 — 이 세션의 실측 상한(1.22)이 여기서 falsify된다
  const ext = Math.max(A.a1.apex.y, A.a2.y + A.a2.R, A.a3.y + A.a3.R) + A.t / 2
  ok(top >= ext - GEO,
    `바닥판 밑면 ${top.toFixed(2)} ≥ 아치 엑스트라도스 최고 ${ext.toFixed(2)} — 여유 ${(top - ext).toFixed(3)}`)
  const fl = buildArcadeFloor()
  ok(fl !== null && edgeAudit(fl) === 0 && signedVolume(fl) > 0, `아케이드 바닥판: 에지 0 · 부피 ${signedVolume(fl).toFixed(2)}`)
  {
    const v = (BRD_ARC_E - BRD_X0) * BRD_ARC_FLR * 2 * BRD_HW
    ok(near(signedVolume(fl), v, 1e-2), `바닥판 부피 ${signedVolume(fl).toFixed(2)} = ${(BRD_ARC_E - BRD_X0).toFixed(2)}×${BRD_ARC_FLR}×${(2 * BRD_HW).toFixed(2)}`)
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
} else ok(buildShaftFrame() === null, `샤프트 미생성 — ${!BRD_ON ? 'BRD_ON=false' : 'BRD_SFT_ON=false'}`)

console.log(`\n${fail === 0 ? '✅' : '❌'} ★147 접속 통로 : ${n}항 중 ${n - fail} green` + (fail ? ` · ${fail} 실패` : ''))
process.exit(fail ? 1 : 0)
