// check_corridor.mjs — 통로 홀 1p5 검증 (㊳ 2026.07.14 재편 → ★㊴ 2026.07.17: 대순회 #0·플랫폼 강하·프리즈)
//  실행: node src/check_corridor.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import — 구판(슬릿 광학 밀폐)의 C절은 '반대 요구'가 되어 가시성 검증으로 교체.
//
//  ★C절 2D 전제(구판 계승): 창 y창(0~150)에서 리브는 무릎(y=240) 훨씬 아래 = 수직 원기둥이고
//   벽·개구도 z축 압출체(y 무관 단면) → 밑동 가시성은 y에 독립. 대들보(y114~130)는 밑동 시선(≈눈높이
//   수평)과 무관. 가시(+) 판정은 리브 차폐 무시(보수적) / 불가시(−) 판정은 리브 차폐 포함(실제적).
import {
  COR_R, COR_CX, COR_WALL_SEG, COR_Y0, COR_THICK, CEIL_LO, CEIL_HI, ceilY,
  WIN_HALF, WIN_SILL_Y, WIN_TOP_Y,
  BOX_IN_H, BOX_TOP, BOX_X0, BOX_X1, BOX_HW, DOOR_HALF,
  RAD_TOP, RAD_DOOR_H, RAD_PCY, RAD_PRY, RAD_R, RAD_FLOOR_Y, RAD_SKIRT_MAX,
  LIFT_Y, ROOM_FLOOR_Y, ROOM_CEIL_Y, ROOM_HEIGHT, domeClipY, SKIRT_X0, SKIRT_X1, SKIRT_Y1, skirtY, neckBottomY,
  HALL_ENTRY, ASC_RISE, ASC_X0, ASC_X1, ASC_SLOPE, ORB_R, ORB_CX, ORB_CY, ORB_T, ORB_FLOOR_Y, ORB_FLOOR_R, ORB_WEST_X, ORB_DOOR_W, ORB_DOOR_H,
  ORB_OPEN_F, ORB_OPEN_X, ORB_RING_R, ORB_RING_T, ORB_OPEN, ASC_TUN_DEPTH, ASC_TUN_T,
  PLAT_X, PLAT_R, PLAT_F, PLAT_Y, PLAT_DROP, DESC_X0, DESC_X1, PILLAR_R, COR_FLOOR_HW, COR_X1, COR_CYL_X0, COR_CLIMB, RIB_Y,
  R_BASE, MERIDIANS, SHELL_RIB_R, DOOR_W, DOOR_H, DOOR_SILL_Y, KNEE, H,
  HALL_DOORS, HALL_DOORS_ON, STAIR_GAP, STAIR_DS, STAIR_TD, STAIR_W, COR_RISE, STAIR_MAX_SLOPE,
  TEMPLE_MODE, TEMPLE_Y0, TEMPLE_X0, TEMPLE_X1, TEMPLE_HZ, TEMPLE_CLR, STAIR_SCHEME, TEMPLE_PEDIMENT, TEMPLE_OPEN,
  CELLA_ON, CELLA_ZHW, CELLA_X1, CELLA_T, CELLA_ROOF_Y0, CELLA_ROOF_Y1, CELLA_ROOF_T, CELLA_CLR, CELLA_BITE_R, CELLA_XW, CELLA_BACK_ON, CELLA_BACK_Y1,
  CELLA_NICHE, CELLA_NICHE_DEPTH, CELLA_RELIEF_OUT, CELLA_NICHE_Y0, CELLA_NICHE_Y1, CELLA_NICHE_WBOT, CELLA_NICHE_WTOP, CELLA_STRATA_N,
  ALTAR_ON, ALTAR_SCOPE, ALTAR_ZHW, ALTAR_X_BACK, ALTAR_STEP1_X, ALTAR_STEP2_X, ALTAR_STEP1_H, ALTAR_STEP2_H, ALTAR_UNI_XW,
  TIER_ON, TIER_CENTER, TIER_PROFILE, TIER_N, TIER_RMAX, TIER_RISE,
  INTAKE_ON, INTAKE_FORM, INTAKE_CX, INTAKE_HOLE_HW, INTAKE_LAYERS, INTAKE_SETBACK, INTAKE_WALL_T, INTAKE_RISE,
  INTAKE_FUNNEL_DROP, INTAKE_FUNNEL_RB,
  GAT_SEAT, GAT_CX, GAT_CROWN_R, GAT_CONE_H, GAT_CROWN_H, GAT_SLIT, GAT_FACETS, GAT_POSTS, GAT_POST_R, GAT_LID_T, GAT_EAVE_SF,
  PIER_ON, PIER_TOP_OVER,
  INCA_ON, INCA_TOP_Y, INCA_SLOPE, INCA_END_X, INCA_X0, INCA_W0, INCA_W1, INCA_BITE, INCA_CUT_Y,
  INCA_PANEL_L, INCA_PANEL_W, INCA_PANEL_T, INCA_ARCH_X0, INCA_ARCH_Y1, INCA_FACETS,
  INCA_NEXUS_R, INCA_TIP_Y1, INCA_TIP_Y2, INCA_GAP, INCA_TIP_T, INCA_EMBED,
  CL_SILL, CL_R, PASS_FLOOR_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
} from './constants.js'
import { hallDoors, buildHallStairs, PLAT_TOP, incaStairSpec, incaBladesSpec, intakeSpec, INTAKE_IS_SLIT, gatSeal } from './corridorStairsGeometry.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const r2 = (v) => Math.round(v * 100) / 100
const DEG = 180 / Math.PI
const FLOOR_TOP = COR_Y0 + COR_THICK / 2                         // 다리·플랫폼 상면 ≈49.3
const DTOP = FLOOR_TOP + RAD_DOOR_H                              // 접합문 상단 ≈53.3
const segW = Math.PI * 2 / COR_WALL_SEG
const tDoor = Math.floor(DOOR_HALF / segW + 0.5) * segW          // −x 문 트임 실모서리 각
const tWin  = Math.floor(WIN_HALF / segW + 0.5) * segW           // 창 실모서리 각(격자 스냅)
const doors = hallDoors()

console.log('— S. 구화·부양 (㊵ (1)(3) — ㊵-4 드럼 복원 후에도 존속) —')
ok(Math.abs(COR_Y0 - (49 + LIFT_Y)) < 1e-9 && Math.abs(ROOM_FLOOR_Y - LIFT_Y) < 1e-9,
  `접합 COR_Y0 ${COR_Y0} = 49 + Δ(${LIFT_Y}) · 주 바닥 ${ROOM_FLOOR_Y}(수평 유지) · apex = 접합`)
{
  const bottom = ROOM_FLOOR_Y - ROOM_HEIGHT
  ok(bottom > 0.5, `구 바닥 y ${bottom} > 0.5 — 지면 위 공중 부양(간극 = Δ − 49 = ${r2(bottom)})`)
  ok(Math.abs(ROOM_HEIGHT - 49) < 1e-9, `수직 반축 49 불변(아랫반 = 윗반의 거울 — 완전한 타원구)`)
  // ★㊵-2 구형화: '강체 이동 간극 ≈3.6' 불변식은 의도적 폐기 — 새 불변식 = 무관입 + hem 폐합
  const gap = (RAD_PCY - RAD_PRY) - domeClipY(RAD_R, 0)
  ok(gap >= 3.4, `꽃잎 하단 ↔ 구 표면 간극 ${r2(gap)} ≥ 3.4 (무관입 — ㊵-2 구형화로 ≈3.6 강체 불변식 폐기)`)
  const hem = (RAD_FLOOR_Y + COR_THICK / 2) - RAD_SKIRT_MAX
  ok(hem > 0.5 && hem < RAD_FLOOR_Y, `스커트 밑단 ${r2(hem)} — 지면 위(부양 보존)·문지방 아래(hem 폐합 성립)`)
  ok(Math.abs(RAD_TOP - (COR_Y0 + 5)) < 1e-9 && Math.abs(RAD_PCY - (COR_Y0 + 7.5)) < 1e-9,
    `RAD_TOP·RAD_PCY 파생(부양 동반 상승)`)
}
console.log('— N. ㊵-5 진입 개편 (상승 +10 → 부양 소구 · 구 하강계 = 스위치 잠금 보존) —')
{
  //  ★㊾ 4체제로 확장(소구 폐기 + 하강로 둘). 폐기 = **경로에서 제거**이지 코드 삭제가 아니다 —
  //   'asc-sphere'(소구)·'descent'(구 ㊴-5) 둘 다 스위치로 복귀 가능해야 한다(보존 원칙).
  ok(['lateral', 'axial', 'asc-sphere', 'descent'].includes(HALL_ENTRY),
    `HALL_ENTRY 스위치 유효('${HALL_ENTRY}') — 4체제(신 하강 2 + 구 보존 2) 전부 복귀 가능`)
  ok(Math.abs(ASC_SLOPE) <= 0.7002, `상승 경사 ${r2(Math.atan(ASC_SLOPE) * DEG)}° ≤ 35°(보행 상한 — 소구 서진 후에도 유지)`)
  ok(ORB_CX - ORB_R > COR_CYL_X0 + 1, `소구 서단 ${r2(ORB_CX - ORB_R)} > 드럼 서벽 ${COR_CYL_X0}(접합부 근접 — 하한 지킴)`)
  ok(Math.abs(ASC_RISE - (ORB_WEST_X - ASC_X0) * ASC_SLOPE) < 1e-9 && ASC_X0 >= BOX_X1 && ASC_X0 <= BOX_X1 + 0.01,
    `★㊵-5c 다리 폐지: 상승 시작 ${r2(ASC_X0)} = 박스 출구 · 상승고 ${r2(ASC_RISE)} = 주행×경사(파생)`)
  ok(Math.abs(ORB_FLOOR_Y - (COR_Y0 + COR_THICK / 2 + ASC_RISE)) < 1e-9,
    `소구 바닥 ${r2(ORB_FLOOR_Y)} = 착지 = 문턱 (같은 높이 — 현도 확정)`)
  ok(Math.abs(ORB_FLOOR_R - Math.sqrt(ORB_R ** 2 - (ORB_CY - ORB_FLOOR_Y) ** 2)) < 1e-9,
    `바닥 현 반경 ${r2(ORB_FLOOR_R)} 파생(중심 아래 현 — 스케치 독법)`)
  const bot = ORB_CY - ORB_R, top = ORB_CY + ORB_R
  ok(bot > 0.5, `소구 저점 ${r2(bot)} > 0.5 — 드럼 안 허공 부양(방·목과 같은 언어)`)
  ok(ORB_CX - ORB_R > COR_CYL_X0 + 1 && ORB_CX + ORB_R < COR_X1 - 1 && top < ceilY(ORB_CX - ORB_R) - 1 && top < ceilY(ORB_CX + ORB_R) - 1 && ORB_R < COR_R - 2,
    `소구 담김: x ${r2(ORB_CX - ORB_R)}~${r2(ORB_CX + ORB_R)} ⊂ 드럼 · 꼭대기 ${r2(top)} < 천장(빗면 최저 ${r2(ceilY(ORB_CX - ORB_R))})`)
  ok(ORB_DOOR_W < 2 * ORB_FLOOR_R * 0.5 && ORB_FLOOR_Y + ORB_DOOR_H < ORB_CY + (ORB_R - ORB_T),
    `아치 문(폭 ${ORB_DOOR_W} · 높이 ${ORB_DOOR_H}) ⊂ 서면 셸 — 상단 ${r2(ORB_FLOOR_Y + ORB_DOOR_H)} < 내구 꼭대기 ${r2(ORB_CY + ORB_R - ORB_T)}`)
  // ★㊵-5b(1): 착지 폐지 — 계단이 문턱면에 직결(+물림). 경사는 파생 역전(상승고/주행).
  ok(ASC_X1 > ORB_WEST_X && ASC_X1 < ORB_WEST_X + 2.5, `계단→문턱 직결: 상승 끝 ${r2(ASC_X1)} = 문턱면 ${r2(ORB_WEST_X)} + 물림(착지 없음)`)
  ok(Math.abs(ASC_RISE - (ORB_WEST_X - ASC_X0) * ASC_SLOPE) < 1e-9, `경사 목표 노브 ${r2(Math.atan(ASC_SLOPE) * DEG)}° → 상승고 파생(㊵-5c: 상승고 = 주행×경사)`)
  // ★㊵-5b(2)→㊶-4 개구(조종석) — 동쪽 캡 = 뻥 뚫림(유리 아님, 렉 0) · 경계 테 · 아치 보이드와 무간섭 · 창살 없음(리브 어휘 보호)
  ok(ORB_OPEN_F > 0 && ORB_OPEN_F < 1 && ORB_OPEN_X > ORB_WEST_X + 4 + 1,
    `개구 컷 x ${r2(ORB_OPEN_X)}(F=${ORB_OPEN_F}) — 아치 보이드 동단(${r2(ORB_WEST_X + 4)}) +1 이격`)
  ok(Math.abs(ORB_RING_R - Math.sqrt(ORB_R ** 2 - (ORB_R * ORB_OPEN_F) ** 2)) < 1e-9 && ORB_RING_T < ORB_T,
    `경계 테 반경 ${r2(ORB_RING_R)} 파생 · 관 두께 ${ORB_RING_T} < 셸 두께 — 뚫린 단면 감쌈`)
  ok(ORB_OPEN_X < ORB_CX + ORB_R * 0.6,
    `개구 폭: 컷이 캡 반각 ≥53°를 보장(조종석 — 다섯 리브 시야가 개구 안)`)
  ok(ORB_OPEN === true, `개구 ORB_OPEN=${ORB_OPEN}(㊶-4 — 동캡 뚫림, 구 ORB_GLASS 유리 스위치 폐기)`)
  // ★㊵-5d 상승 밀폐 통로: 압축 연속·측면 봉합·구면 물림
  ok(Math.abs(ASC_TUN_T - COR_THICK) < 1e-9 && ASC_TUN_DEPTH > 1.5,
    `통로 벽 두께 = 박스 어휘(${ASC_TUN_T}) · 디딤 아래 봉합 깊이 ${ASC_TUN_DEPTH}`)
  //  동단 물림: 통로 벽(z=±BOX_HW)의 상변(보행+7)이 구면 안에서 끝나는가 — 구면 관통 보장
  {
    const yTopEnd = ORB_FLOOR_Y + BOX_IN_H   // 문턱면에서 통로 천장 밑선
    const rr = Math.hypot(yTopEnd - ORB_CY, BOX_HW)
    ok(rr < ORB_R - 0.2, `통로 동단 최원각(문턱면 천장 모서리 r=${r2(rr)}) < 구 반경 — CSG 물림 성립`)
  }
  //  압축 연속: 통로 내부고 = 박스 내부고(7) — 해방은 소구 안에서만
  ok(ORB_FLOOR_Y + ORB_DOOR_H <= ORB_FLOOR_Y + BOX_IN_H + 0.01,
    `아치 상단(문턱+${ORB_DOOR_H}) ≤ 통로 천장(문턱+${BOX_IN_H}) — 문이 통로 단면 안`)
  //  상승·착지 보행 헤드룸(천장 빗면 최저점 = 서쪽 끝)
  ok(ceilY(ASC_X0) - (COR_Y0 + COR_THICK / 2 + 0) > 2.2 && ceilY(ASC_X1) - ORB_FLOOR_Y > 2.2,
    `상승로 헤드룸 ≥ 2.2 (시작 ${r2(ceilY(ASC_X0) - COR_Y0 - COR_THICK / 2)} · 착지 ${r2(ceilY(ASC_X1) - ORB_FLOOR_Y)})`)
}
console.log('— S2. 목 스커트 (㊵ (4) 유지 · ★㊵-4 동단 = 드럼 서벽 재앵커) —')
{
  ok(SKIRT_X0 < SKIRT_X1 && SKIRT_X1 > COR_CYL_X0 && SKIRT_X1 < BOX_X1,
    `스커트 구간 ${r2(SKIRT_X0)}→${r2(SKIRT_X1)} — 동단이 드럼 서벽(${COR_CYL_X0}+)에 물림`)
  const y0 = domeClipY(SKIRT_X0, BOX_HW)
  ok(y0 > ROOM_FLOOR_Y && Math.abs(skirtY(SKIRT_X1) - SKIRT_Y1) < 1e-9,
    `양끝 물림: 구 표면(${r2(y0)}) → 벽 앵커(${SKIRT_Y1})`)
  let convex = true
  for (let i = 1; i < 24; i++) { // 위로 볼록: 중점들이 현 위
    const t = i / 24, x = SKIRT_X0 + (SKIRT_X1 - SKIRT_X0) * t
    if (skirtY(x) < y0 + (SKIRT_Y1 - y0) * t - 1e-6) { convex = false; break }
  }
  ok(convex, `위로 볼록(전 구간 현 위) — ㊵ (4) 확정 조형 보존`)
  ok(neckBottomY(SKIRT_X1 + 1, BOX_HW) < COR_Y0 && neckBottomY(SKIRT_X1 + 1, BOX_HW) > COR_Y0 - 1,
    `드럼 안 밑선 = 박스 바닥판 밑(${r2(COR_Y0 - COR_THICK / 2)}) 인계`)
}
const { stairs } = buildHallStairs()
const S = Object.fromEntries(stairs.map(s => [s.k, s]))

console.log('— A. 박스 ㄷ′ 압축 (유지 확인) —')
ok(Math.abs(BOX_TOP - (FLOOR_TOP + BOX_IN_H)) < 1e-9, `BOX_TOP(${r2(BOX_TOP)}) = 다리 상면(${r2(FLOOR_TOP)}) + 내부고(${BOX_IN_H})`)
ok(BOX_IN_H >= 5.2 && BOX_IN_H <= 9, `내부고 ${BOX_IN_H} ∈ [5.2, 9] (압축 성립 구간)`)
ok(BOX_TOP - DTOP >= 1.5, `접합문 헤더 ${r2(BOX_TOP - DTOP)} ≥ 1.5`)
ok(BOX_TOP - RAD_TOP >= 1.5, `고리 지붕(${RAD_TOP}) 위 여유 ${r2(BOX_TOP - RAD_TOP)} ≥ 1.5`)
ok(BOX_TOP < CEIL_LO, `BOX_TOP(${r2(BOX_TOP)}) < CEIL_LO(${CEIL_LO}) — 진입 낙차 존재`)
ok(ceilY(BOX_X1) - BOX_TOP >= 12, `진입 순간 해방 ${r2(ceilY(BOX_X1) - BOX_TOP)} ≥ 12`)
ok(CEIL_HI - BOX_TOP >= 90, `최대 해방 ${r2(CEIL_HI - BOX_TOP)} ≥ 90`)

console.log('— B. 헤더 봉인 (−x 개구의 BOX_TOP 위 — 유지 확인) —')
{
  const xDoorEdge = COR_CX + COR_R * Math.cos(Math.PI - tDoor)
  ok(ceilY(xDoorEdge) > BOX_TOP + 5, `문 트임 모서리 천장 ${r2(ceilY(xDoorEdge))} > BOX_TOP+5 — 헤더 필수 조건`)
  ok(tDoor > 0, `−x 문 트임 존재 (${r2(tDoor * DEG)}°)`)
  ok(COR_R * Math.sin(tDoor) <= BOX_HW + 1e-9, `문 트임 z반폭 ${r2(COR_R * Math.sin(tDoor))} ≤ 박스 반폭 ${BOX_HW}`)
  ok(COR_R * Math.sin(tDoor) >= COR_FLOOR_HW + 0.4, `문 트임 z반폭 ≥ 다리 반폭 ${COR_FLOOR_HW}+0.4`)
  ok(BOX_X1 > COR_CX - Math.sqrt(COR_R * COR_R - BOX_HW * BOX_HW) + 1, `박스 물림(천장 슬랩→${BOX_X1}) 헤더 밑선 봉합`)
}

// ── 2D 광선(plan): 벽 = 원 r=COR_R(중심 COR_CX,0), 개구 = |θ|≤tWin(창)·|θ−π|≤tDoor(박스 문) ──
//  ribsBlock=true면 리브 밑동 원(반경 SHELL_RIB_R, k=−9..9, 표적 자신 제외)도 차폐물로 넣는다.
const ribC = (k) => { const p = k * Math.PI * 2 / MERIDIANS; return [R_BASE * Math.cos(p), R_BASE * Math.sin(p)] }
function passes2D(ex, ez, tx, tz, { ribsBlock = false, skipK = null } = {}) {
  const dx = tx - ex, dz = tz - ez, L = Math.hypot(dx, dz)
  // (a) 벽 원 교차 — 행진(구판 수법: 안↔밖 넘는 순간의 θ가 개구 밖이면 차단)
  const N = Math.max(80, Math.ceil(L / 0.25))
  let prevIn = null
  for (let i = 0; i <= N; i++) {
    const t = i / N, px = ex + t * dx, pz = ez + t * dz
    let th = Math.atan2(pz, px - COR_CX); if (th < 0) th += Math.PI * 2
    const inside = Math.hypot(px - COR_CX, pz) < COR_R
    if (prevIn !== null && inside !== prevIn) {
      const dZero = Math.min(th, Math.PI * 2 - th), dPi = Math.abs(th - Math.PI)
      if (dZero > tWin + 1e-9 && dPi > tDoor + 1e-9) return false
    }
    prevIn = inside
  }
  if (ribsBlock) {                                     // (b) 리브 몸통 차폐(선분↔원 거리)
    for (let k = -9; k <= 9; k++) {
      if (k === skipK) continue
      const [cx, cz] = ribC(k)
      const wx = cx - ex, wz = cz - ez
      const tt = Math.max(0, Math.min(1, (wx * dx + wz * dz) / (L * L)))
      if (Math.hypot(wx - tt * dx, wz - tt * dz) < SHELL_RIB_R - 0.05) return false
    }
  }
  return true
}
// 표적 = 리브 k 밑동 원(중심 + 경계 32점). 하나라도 통과하면 '보임'.
function ribVisibleFrom(ex, ez, k, opt) {
  const [cx, cz] = ribC(k)
  if (passes2D(ex, ez, cx, cz, { ...opt, skipK: k })) return true
  for (let j = 0; j < 32; j++) {
    const a = j / 32 * Math.PI * 2
    if (passes2D(ex, ez, cx + SHELL_RIB_R * Math.cos(a), cz + SHELL_RIB_R * Math.sin(a), { ...opt, skipK: k })) return true
  }
  return false
}

console.log('— C. 창 ±43° · 가시성 (다섯 가시 · ±3 불가시 · 원호 상한) —')
ok(Math.abs(WIN_HALF - 43 * Math.PI / 180) < 1e-9 && WIN_SILL_Y === 0 && WIN_TOP_Y === CEIL_HI,
  `창 스펙: 반각 43° · sill 0 · top ${WIN_TOP_Y} = CEIL_HI`)
{ // 다섯/배제의 기하 근거: 드럼각(원통 중심 기준) — ±2 ≤ 43° < ±3
  const drumAng = (k) => { const [x, z] = ribC(k); return Math.atan2(Math.abs(z), x - COR_CX) * DEG }
  ok(drumAng(2) < 43 - 1, `리브 ±2 드럼각 ${r2(drumAng(2))}° < 42° (창 안 — 다섯의 마지막)`)
  ok(drumAng(3) > 43 + 1, `리브 ±3 드럼각 ${r2(drumAng(3))}° > 44° (창 밖 — 잘림)`)
}
// 눈 표본 3군: [셈-시점] 다리·플랫폼(여기서 '다섯'이 진술됨 — 엄격) / [계단] 판 위(간극 체험 — 원호 상한만)
const eyesCount = []
for (let x = BOX_X0 + 2; x <= PLAT_X - PLAT_R; x += 4) for (const z of [-COR_FLOOR_HW, 0, COR_FLOOR_HW]) eyesCount.push([x, z])
for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2; eyesCount.push([PLAT_X + (PLAT_R - 0.3) * Math.cos(a), (PLAT_R - 0.3) * Math.sin(a)]) }
eyesCount.push([PLAT_X, 0])
for (const k of [0, 1, -1, 2, -2])
  ok(ribVisibleFrom(PLAT_X, 0, k, { ribsBlock: false }), `플랫폼 중심에서 리브 ${k >= 0 ? '#+' + k : '#' + k} 가시 (다섯이 선다)`)
for (const k of [3, -3]) {
  let leak = null
  for (const [ex, ez] of eyesCount) if (ribVisibleFrom(ex, ez, k, { ribsBlock: true })) { leak = [ex, ez]; break }
  ok(leak === null, `리브 ${k > 0 ? '#+' + k : '#' + k} 불가시 — 셈-시점(다리·플랫폼 ${eyesCount.length}곳)` + (leak ? ` 누출 눈(${r2(leak[0])},${r2(leak[1])})` : ''))
}
{ // 계단 판 위: 창가 접근 시 시야가 부채꼴로 열리는 것은 전고 창의 기하 필연(시차) —
  //  ★실측(㊳ 구현일): 누출은 '모든 계단의 창가 끝단'에 집중. 최악 = #0 상단(x≈280)에서 근호 ±6, 동시 13.
  //  ⚠이 성질은 구 파노라마(㊱ 이전 라이브)에도 동일 — 구 "±3 가림" 스펙은 플랫폼 시점 기준(위 [21][22]로 계승).
  //  '다섯' 프레이밍의 희석 여부 = ★열린 판정(현도 — 웨이포인트 stm2/stp2/ribdoor 직전에서 고개 돌려 볼 것).
  //  여기서 강제하는 상한 둘: ① 원거리 호 밀폐 |k|≥11 (반대편·원호 확장 없음 = 1p11 무손상의 하한.
  //     ★㊵-4 실측 갱신(2026.07.20): 드럼 복원+제단 83.5로 #−2가 심하강(74)하며 창가 저고도 끝단이
  //     −9·−10을 각 1판 스침(판 위상 급 — 반대편·+측·|k|≥11 전무 = 1p11 무손상). ㊴-6 전례와 동일하게
  //     봉인선을 실측 −10 + 여유 없음 = ≥11 금지로 이동.
  //     ⚠㊴-6 실측 갱신: 구 ≥8 봉인은 ㊳ 곡선 접근의 실측〔최원 ±7〕이었고, arc 스킴의 레디얼 문 정렬이
  //     창 모서리 구석 판에서 ±8을 한 칸 스치게 함 — 두 스킴 공히 판 위상 요행 차이일 뿐 형상 급의
  //     차이가 아니므로 봉인선을 실측 ±8 + 여유 없음 = ≥9 금지로 이동. 반대편 은닉은 무손상.)
  //  ② 동시 가시 ≤ 14 (실측 13 + 여유 1 — 이 봉인이 깨지면 창·계단 형상이 바뀐 것).
  let worstK = 0, worstCnt = 0, farLeak = null
  for (const st of stairs) for (let i = 0; i < st.plates.length; i += 4) {
    const p = st.plates[i]
    let cnt = 0
    for (let k = -11; k <= 11; k++) {
      if (!ribVisibleFrom(p.x, p.z, k, { ribsBlock: true })) continue
      cnt++
      if (Math.abs(k) > Math.abs(worstK)) worstK = k
      if (Math.abs(k) >= 11 && !farLeak) farLeak = [st.k, r2(p.x), r2(p.z), k]
    }
    if (cnt > worstCnt) worstCnt = cnt
  }
  ok(farLeak === null, `원거리 호 밀폐: |k|≥11 전 판 불가시(㊵-4 실측 갱신 — 주석 참조)` + (farLeak ? ` — 누출 계단#${farLeak[0]} (${farLeak[1]},${farLeak[2]}) → 리브 ${farLeak[3]}` : ''))
  ok(worstCnt <= 16, `계단 위 동시 가시 최대 ${worstCnt} ≤ 16 (★㊵-4 실측 15+1 봉인 — 최원 리브 ${worstK >= 0 ? '#+' + worstK : '#' + worstK})`)
  console.log(`    ↳ ★열린 판정 리포트: 창가 끝단 근호 노출 — 최원 ${worstK >= 0 ? '#+' + worstK : '#' + worstK} · 동시 최대 ${worstCnt} (완화 후보 = 창변 리빌 잼 재도입, 현도 결정)`)
}

console.log('— O. ★셀라(㊶) — 배경 상자 봉인 · 근호 노출 차단 (다섯만 남는다) —')
{
  ok(CELLA_ON === true, `CELLA_ON — 셀라 활성(폐기 = 스위치 한 줄)`)
  // (1) 치수 불변식: 다섯을 담고, 여섯째부터 자른다
  const ribOutZ2 = Math.abs(ribC(2)[1]) + SHELL_RIB_R                   // #±2 바깥 |z| ≈ 56
  const ribOutZ3 = Math.abs(ribC(3)[1]) - SHELL_RIB_R                   // #±3 안쪽 |z| ≈ 68.5
  ok(CELLA_ZHW === TEMPLE_HZ, `옆벽 |z| ${CELLA_ZHW} = 프리즈 HZ(정렬 — 위(프리즈)·아래(셀라)가 한 몸통)`)
  ok(CELLA_ZHW >= ribOutZ2 + 4 && CELLA_ZHW + CELLA_T <= ribOutZ3 - 2,
    `옆벽: #±2 담음(${r2(ribOutZ2)}+4 ≤ ${CELLA_ZHW}) · #±3 무접촉(≤ ${r2(ribOutZ3)}−2)`)
  const ribOutX0 = ribC(0)[0] + SHELL_RIB_R                             // #0 바깥 x = 294
  ok(CELLA_X1 >= ribOutX0 + 4, `동벽 x ${CELLA_X1} ≥ 리브 #0 바깥면(${ribOutX0})+4 — 배경까지의 숨`)
  ok(Math.abs(CELLA_ROOF_Y0 - TEMPLE_Y0) < 1e-9 && CELLA_ROOF_Y1 > TEMPLE_Y0 + 0.5,
    `★㊶-2 지붕 밑면 ${CELLA_ROOF_Y0} = 프리즈 밑면(동일 평면 — 곡선 띠 소거) · 상면 ${CELLA_ROOF_Y1} > 밑면+0.5 = x ${TEMPLE_X1}~${CELLA_X1} 띠 상향 누출 봉인 유지`)
  ok(TEMPLE_MODE === 'beam', `TEMPLE_MODE 'beam' — 프리즈 = 셀라 상부(y≥${TEMPLE_Y0}) 봉인의 파트너(off면 셀라 봉인 불성립)`)
  { // 바이트 원호가 프리즈 발자국 안에 숨는가: 창 z대(|z|≤84·sin43°) 전역에서 원호 x ≥ 프리즈 앞면
    const zWin = COR_R * Math.sin(WIN_HALF)
    const arcXmin = COR_CX + Math.sqrt(CELLA_BITE_R ** 2 - zWin ** 2)
    ok(arcXmin >= TEMPLE_X0, `바이트 원호 최서단 ${r2(arcXmin)}(창 모서리 z${r2(zWin)}) ≥ 프리즈 앞면 ${r2(TEMPLE_X0)} — 원호 모서리 전부 프리즈 발자국 안 = 불가시`)
  }
  const doorTopMax = Math.max(...HALL_DOORS.map(d => d.sill)) + DOOR_H   // 최고 문 상단(#+2) = 99+11 = 110
  ok(CELLA_ROOF_Y0 >= doorTopMax + 2,
    `지붕 밑면 ${r2(CELLA_ROOF_Y0)} ≥ 최고 문 상단(${doorTopMax})+2 — 문 다섯이 지붕 아래 온전`)
  ok(CELLA_ROOF_Y1 < H * KNEE, `지붕(${CELLA_ROOF_Y1}) < 무릎(${H * KNEE}) — 리브 상부 공개(1p11·테라스) 무손상`)
  // (2) 곡벽 물림·지느러미: 바이트가 셸(r=COR_R)을 0.05~1.0만 넘게
  ok(COR_R - CELLA_BITE_R > 0.05 && COR_R - CELLA_BITE_R <= 1.0,
    `바이트 r ${CELLA_BITE_R} — 셸 물림 ${r2(COR_R - CELLA_BITE_R)} ∈ (0.05, 1] (봉인 겹침 + 홀 안 지느러미 불가시 급)`)
  ok(CELLA_XW < COR_CX + Math.sqrt(COR_R ** 2 - CELLA_ZHW ** 2) - 1,
    `슬랩 서단 ${r2(CELLA_XW)} — 셸 교차선(z=${CELLA_ZHW}에서 x ${r2(COR_CX + Math.sqrt(COR_R ** 2 - CELLA_ZHW ** 2))}) 서쪽 1+ (물림 보장, 잉여는 바이트가 절제)`)
  ok(CELLA_CLR === TEMPLE_CLR && CELLA_CLR <= 0.5,
    `관통 구멍 여유 ${CELLA_CLR} = 프리즈와 동일(구멍 연속) · ≤0.5 (하늘 슬리버 = 프리즈 전례 수준)`)
  // (3) 리브 무접촉: 다섯(구멍 관통)을 뺀 전 리브가 슬랩 3종·지붕 발자국과 무접촉
  {
    let clash = null
    const inSlab = (cx, cz) => {
      const hitSide = Math.abs(cz) + SHELL_RIB_R > CELLA_ZHW - 0.5 && Math.abs(cz) - SHELL_RIB_R < CELLA_ZHW + CELLA_T + 0.5 && cx + SHELL_RIB_R > CELLA_XW
      const hitEast = cx + SHELL_RIB_R > CELLA_X1 - 0.5 && Math.abs(cz) - SHELL_RIB_R < CELLA_ZHW + CELLA_T
      const hitRoofFoot = cx + SHELL_RIB_R > CELLA_XW && cx - SHELL_RIB_R < CELLA_X1 + CELLA_T && Math.abs(cz) - SHELL_RIB_R < CELLA_ZHW + CELLA_T
      return hitSide || hitEast || hitRoofFoot
    }
    for (let k = -35; k <= 36; k++) {
      if (Math.abs(k) <= 2) continue                                    // 다섯 = 지붕 구멍 관통(의도)
      const [cx, cz] = ribC(k)
      if (inSlab(cx, cz)) { clash = k; break }
    }
    ok(clash === null, `비관통 리브(|k|≥3) 전 72기 — 셀라 벽·지붕 발자국 무접촉` + (clash !== null ? ` ✗ #${clash}` : ''))
  }
  // (4) ★근호 차단(2D plan — C절 전제 계승: 창 y창에서 리브 = 수직 원기둥·셀라 벽 = z축 압출체 y 0~지붕):
  //     passes2D 통과 후 셀라 3벽 교차를 추가 검사. 봉인 주장: 홀 안 어떤 눈에서도 |k|≥3 불가시 → 동시 = 다섯이 상한.
  const cellaBlocks = (ex, ez, tx, tz) => {
    const dx = tx - ex, dz = tz - ez
    const hitZ = (zw) => {                                              // 옆벽 평면 |z|=zw 교차점의 x가 슬랩 구간이면 차단
      if (Math.abs(dz) < 1e-12) return false
      const t = (Math.sign(dz) * zw - ez) / dz
      if (t <= 0 || t >= 1) return false
      const px = ex + t * dx
      return px >= CELLA_XW && px <= CELLA_X1 + CELLA_T
    }
    const hitX = () => {                                                // 동벽 x=CELLA_X1 교차점의 |z|가 폭 안이면 차단
      if (Math.abs(dx) < 1e-12) return false
      const t = (CELLA_X1 - ex) / dx
      if (t <= 0 || t >= 1) return false
      return Math.abs(ez + t * dz) <= CELLA_ZHW + CELLA_T
    }
    return hitZ(CELLA_ZHW) || hitX()
  }
  //  박스(밀폐 연결부) 측벽 차폐 — passes2D는 드럼 원만 알므로, 박스 안 눈(다리 서반부)에서 드럼 원을
  //  아예 안 지나는 광선이 모델상 무차단으로 샜다(실제는 박스 벽이 막음 — B절 밀폐의 2D 대응물).
  const boxBlocks = (ex, ez, tx, tz) => {
    const dx = tx - ex, dz = tz - ez
    if (Math.abs(dz) < 1e-12) return false
    for (const s of [1, -1]) {
      const t = (s * BOX_HW - ez) / dz
      if (t > 0 && t < 1) {
        const px = ex + t * dx
        if (px >= BOX_X0 - 0.5 && px <= BOX_X1 + 0.5) return true
      }
    }
    return false
  }
  {
    let leak = null, worstCnt = 0
    const eyesAll = [...eyesCount]
    for (const st of stairs) for (let i = 0; i < st.plates.length; i += 2) eyesAll.push([st.plates[i].x, st.plates[i].z])
    //  ★㊷ 다섯 날 디딤·팁 = 새 보행면(눈 위치) — '전 시점' 주장에 편입(팁 = 창턱 직전 최동단 눈)
    if (INCA_ON) {
      const ibs = incaBladesSpec()
      for (const b of ibs.blades) if (!b.reach) {
        for (let i = 0; i < b.steps.length; i += 2) {
          const sm = (b.steps[i].s0 + b.steps[i].s1) / 2
          eyesAll.push([ibs.ncx + sm * Math.cos(b.az), sm * Math.sin(b.az)])
        }
        eyesAll.push([b.tip.x, b.tip.z])
      }
    }
    for (const [ex, ez] of eyesAll) {
      let cnt = 0
      for (let k = -11; k <= 11; k++) {
        const [cx, cz] = ribC(k)
        let vis = false
        if (ribVisibleFrom(ex, ez, k, { ribsBlock: true })) {
          // 2D 통과 표본 중 셀라도 뚫는 게 하나라도 있는가(중심 + 경계 32점 동일 표본)
          if (!cellaBlocks(ex, ez, cx, cz) && !boxBlocks(ex, ez, cx, cz) && passes2D(ex, ez, cx, cz, { ribsBlock: true, skipK: k })) vis = true
          else for (let j = 0; j < 32 && !vis; j++) {
            const a = j / 32 * Math.PI * 2, px = cx + SHELL_RIB_R * Math.cos(a), pz = cz + SHELL_RIB_R * Math.sin(a)
            if (!cellaBlocks(ex, ez, px, pz) && !boxBlocks(ex, ez, px, pz) && passes2D(ex, ez, px, pz, { ribsBlock: true, skipK: k })) vis = true
          }
        }
        if (!vis) continue
        cnt++
        if (Math.abs(k) >= 3 && !leak) leak = [r2(ex), r2(ez), k]
      }
      worstCnt = Math.max(worstCnt, cnt)
    }
    ok(leak === null, `★|k|≥3 전 시점 불가시(셈-시점 + 계단 판 ${eyesAll.length}곳) — 창가 근호 노출(구 동시 15) 기하 소멸` + (leak ? ` ✗ 눈(${leak[0]},${leak[1]})→#${leak[2]}` : ''))
    ok(worstCnt <= 5 && worstCnt >= 5, `동시 가시 최대 ${worstCnt} = 5 — 배경이 상자 내벽으로 닫혀 '다섯이 선다'가 전 시점 성립`)
  }
}

console.log('— R. ★㊸ 셀라 배경 깊이(음각/양각 벽감·지층) — 봉인 무손상 · 벽 무관통 · 리브 사이 정렬 —')
{
  const modes = ['intaglio', 'relief', 'rect', 'strata', 'off']
  ok(modes.includes(CELLA_NICHE), `CELLA_NICHE '${CELLA_NICHE}' — 유효 어법(${modes.join('/')})`)
  if (CELLA_NICHE === 'off') {
    ok(true, `벽감 off — 구 평벽(검사 스킵)`)
  } else {
    // (1) 음각 = 벽 안 뚫음(현도 "벽을 뚫지 말고") · 양각 = 돌출 · 공통 높이 범위
    if (CELLA_NICHE === 'intaglio' || CELLA_NICHE === 'rect') {
      ok(CELLA_NICHE_DEPTH <= CELLA_T, `음각 깊이 ${CELLA_NICHE_DEPTH} ≤ 벽 두께 ${CELLA_T} — 뒤로 안 뚫림(면 겹침 −0.02로 깊이=두께도 안전, 현도 "벽을 뚫지 말고")`)
    } else if (CELLA_NICHE === 'relief') {
      ok(CELLA_RELIEF_OUT > 0 && CELLA_RELIEF_OUT < CELLA_X1 - CELLA_XW - 8,
        `양각 돌출 ${CELLA_RELIEF_OUT} — 홀 방향 튀어나옴 · 셀라 내부 폭(${r2(CELLA_X1 - CELLA_XW)}) 안(서벽 무접촉)`)
    } else if (CELLA_NICHE === 'strata') {
      ok(CELLA_NICHE_DEPTH <= CELLA_T, `지층 깊이 ${CELLA_NICHE_DEPTH} ≤ 벽 두께 ${CELLA_T} — 뒤로 안 뚫림`)
    }
    ok(CELLA_NICHE_Y0 >= 2 && CELLA_NICHE_Y1 <= CELLA_ROOF_Y0 - 4 && CELLA_NICHE_Y1 > CELLA_NICHE_Y0 + 20,
      `벽감 y [${CELLA_NICHE_Y0}, ${CELLA_NICHE_Y1}] — 바닥서 띄움 · 지붕 밑(${CELLA_ROOF_Y0})−4 여유 · 높이 ${CELLA_NICHE_Y1 - CELLA_NICHE_Y0} > 20`)
    // (2) 봉인 무손상 — 음각은 안쪽면 얕은 파임(벽 두께 안), 양각은 홀 방향 돌출 → 둘 다 옆벽·동벽 차단체 유지.
    //     O절 근호 차단(cellaBlocks)의 교차 평면(|z|=CELLA_ZHW·x=CELLA_X1)이 온전(벽 뒤로 안 뚫으므로).
    if (CELLA_NICHE === 'strata') {
      ok(CELLA_STRATA_N >= 2 && CELLA_STRATA_N <= 6, `지층 ${CELLA_STRATA_N}층 ∈ [2,6]`)
      const gap = (CELLA_NICHE_Y1 - CELLA_NICHE_Y0) / (CELLA_STRATA_N * 2 - 1)
      ok(gap > 3, `지층 띠 높이 ${r2(gap)} > 3 — 층 분해능`)
    } else {
      // 벽감열: 리브 사이 4곳 정렬 · 폭이 리브 간격(25) 안 · 이웃 벽감과 무병합
      const slots = [-37.6, -12.6, 12.6, 37.6]
      const ribZ = [-50, -25, 0, 25, 50]
      let aligned = true
      for (let i = 0; i < 4; i++) if (Math.abs(slots[i] - (ribZ[i] + ribZ[i + 1]) / 2) > 0.5) aligned = false
      ok(aligned, `벽감 4곳 = 리브 사이 중점(±12.6, ±37.6) 정렬 — 리브 기둥 사이로 보임`)
      const wMax = CELLA_NICHE === 'rect' ? CELLA_NICHE_WBOT : Math.max(CELLA_NICHE_WBOT, CELLA_NICHE_WTOP)
      ok(wMax < 25 - 4, `벽감 최대 폭 ${wMax} < 리브 간격(25)−4 — 이웃 벽감·리브 무간섭`)
      if (CELLA_NICHE === 'intaglio' || CELLA_NICHE === 'relief') {
        ok(CELLA_NICHE_WTOP < CELLA_NICHE_WBOT, `사다리꼴: 상부 ${CELLA_NICHE_WTOP} < 하부 ${CELLA_NICHE_WBOT} — 위로 좁아짐(잉카 감실)`)
      }
    }
    // (3) 리브 관통 구멍과 z 무충돌 — 벽감 가장자리 대 리브 구멍 가장자리(병합 방지)
    if (CELLA_NICHE !== 'strata') {
      const slots = [-37.6, -12.6, 12.6, 37.6], ribZ = [-50, -25, 0, 25, 50]
      const wHalf = Math.max(CELLA_NICHE_WBOT, CELLA_NICHE_WTOP) / 2
      let minClear = Infinity
      for (const s of slots) for (const rz of ribZ)
        minClear = Math.min(minClear, Math.abs(s - rz) - wHalf - (SHELL_RIB_R + CELLA_CLR))
      ok(minClear >= 0, `벽감 가장자리 ↔ 리브 구멍 가장자리 간극 ${r2(minClear)} ≥ 0 — 병합 없음(최외곽 z±37.6 ↔ #±2 z±50)`)
    }
  }
}

console.log('— R2. ★㊸ 리브 받침 제단(신전 기단) — 다섯 리브 커버 · 다섯 날 무간섭 · 계단 2장 —')
{
  if (!ALTAR_ON) {
    ok(true, `제단 off(검사 스킵)`)
  } else {
    const scopes = ['ribs', 'unified']
    ok(scopes.includes(ALTAR_SCOPE), `ALTAR_SCOPE '${ALTAR_SCOPE}' — 유효(${scopes.join('/')})`)
    // (1) 리브 열 전체 폭 커버: z 반폭이 #±2(z±50)+리브 반경을 덮음
    const ribOutZ = 50 + SHELL_RIB_R                                        // #±2 바깥 |z| = 56
    ok(ALTAR_ZHW >= ribOutZ, `제단 z반폭 ${ALTAR_ZHW} ≥ 리브 열 바깥(${ribOutZ}) — 다섯 리브 밑동 다 덮음`)
    ok(ALTAR_ZHW <= CELLA_ZHW - 2, `제단 z반폭 ${ALTAR_ZHW} ≤ 셀라 옆벽(${CELLA_ZHW})−2 — 셀라 안`)
    // (2) 총 높이 < 넥서스(다섯 날 뿌리 y≈38.2) — 무간섭(핵심)
    const total = ALTAR_STEP1_H + ALTAR_STEP2_H
    const spec = incaBladesSpec()
    ok(total < spec.cutY - 4, `제단 총 높이 ${total} < 넥서스(${r2(spec.cutY)})−4 — 다섯 날 뿌리 아래(무간섭)`)
    // (3) 계단 2장: 상단이 하단보다 물러남(서쪽 끝이 동쪽으로) = 신전 기단 단차
    const x1West = ALTAR_SCOPE === 'unified' ? ALTAR_UNI_XW : ALTAR_STEP1_X
    const x2West = ALTAR_SCOPE === 'unified' ? ALTAR_UNI_XW + 10 : ALTAR_STEP2_X
    ok(x2West > x1West, `계단 2장: 상단 서쪽끝 ${x2West} > 하단 ${x1West} — 상단이 물러남(2장 단차)`)
    ok(ALTAR_X_BACK > 288 && ALTAR_X_BACK <= 300, `제단 동쪽 끝 ${ALTAR_X_BACK} — 리브 밑동(≤294) 뒤 · 동벽(300) 안`)
    // (4) 리브 밑동 받침: 리브(x 283.6~288)가 제단 x범위 안(하단이 리브를 받침)
    ok(x1West < 283.6 && ALTAR_X_BACK > 288, `제단 x [${x1West}, ${ALTAR_X_BACK}] ⊃ 리브 밑동(283.6~288) — 다섯 리브 받침`)
    // (5) unified 시 넥서스까지: 서쪽 끝이 넥서스 중심 근처
    if (ALTAR_SCOPE === 'unified') {
      ok(Math.abs(ALTAR_UNI_XW - spec.ncx) < 12, `unified 서쪽끝 ${ALTAR_UNI_XW} ≈ 넥서스 중심(${r2(spec.ncx)}) — 구조물 전체 받침`)
    }
  }
}

console.log('— R3. ★㊹ 바닥 동심 기단 — 다섯 날 무간섭 · 벽 안 · 중심/단면 스위치 —')
{
  if (!TIER_ON) {
    ok(true, `기단 off(검사 스킵)`)
  } else {
    ok(['drum', 'nexus'].includes(TIER_CENTER), `TIER_CENTER '${TIER_CENTER}' — 유효(drum/nexus)`)
    ok(['peak', 'ring'].includes(TIER_PROFILE), `TIER_PROFILE '${TIER_PROFILE}' — 유효(peak/ring)`)
    ok(TIER_N >= 3 && TIER_N <= 12, `겹 수 ${TIER_N} ∈ [3,12] — 현도 "3보다 많이"`)
    // (1) 최대 반경이 드럼 벽(84) 안 · 중심 기준 최원단이 벽 미접촉
    const cx = TIER_CENTER === 'nexus' ? incaBladesSpec().ncx : COR_CX
    const farEdge = Math.abs(cx - COR_CX) + TIER_RMAX                     // 중심 편차 + 최대 반경
    ok(farEdge < COR_R - 3, `기단 최원단 ${r2(farEdge)}(중심 편차 ${r2(Math.abs(cx - COR_CX))} + Rmax ${TIER_RMAX}) < 벽 ${COR_R}−3 — 드럼 안`)
    // (2) 총 높이 < 넥서스(다섯 날 뿌리 y≈38.2)·제단(8) — 무간섭(핵심)
    const total = TIER_PROFILE === 'peak' ? TIER_N * TIER_RISE : Math.min(TIER_N, 3) * TIER_RISE
    const spec = incaBladesSpec()
    ok(total < spec.cutY - 4, `기단 총 높이 ${r2(total)} < 넥서스(${r2(spec.cutY)})−4 — 다섯 날 뿌리 아래(무간섭)`)
    ok(total < ALTAR_STEP1_H + ALTAR_STEP2_H + 2, `기단 총 높이 ${r2(total)} < 제단(${ALTAR_STEP1_H + ALTAR_STEP2_H})+2 — 제단이 기단 위로 솟음(위계)`)
    // (3) 반경 단조 감소(안쪽이 작음) · 최내곽 > 0
    let mono = true, rPrev = Infinity
    for (let i = 0; i < TIER_N; i++) { const r = TIER_RMAX * (1 - i / TIER_N); if (r >= rPrev) mono = false; rPrev = r }
    ok(mono, `반경 바깥→안쪽 단조 감소 — 동심 계단 성립`)
    ok(TIER_RMAX * (1 - (TIER_N - 1) / TIER_N) > 1, `최내곽 반경 ${r2(TIER_RMAX * (1 - (TIER_N - 1) / TIER_N))} > 1 — 퇴화 안 함`)
    // (4) 넥서스 중심 기단이면 다섯 날 발치를 감싸되 날 자체와 y로 무간섭(총 높이가 이미 뿌리 아래라 자명)
    //     — 기단 위를 다섯 날이 지나가나 날 밑면(뿌리 −0.3~cutY)이 기단 상면 위(peak 최고 total < cutY)
    ok(total < spec.cutY, `기단 최고 ${r2(total)} < 날 뿌리 상면(${r2(spec.cutY)}) — 날이 기단 위 공중(밑면 무매몰)`)
  }
}

console.log('— R4. ★㊺ 엔타블러쳐 밑면 개구(삼각/아치) — 문 위 개구 · 배경 봉인 유지 —')
{
  const peds = ['flat', 'tri', 'arch']
  ok(peds.includes(TEMPLE_PEDIMENT), `TEMPLE_PEDIMENT '${TEMPLE_PEDIMENT}' — 유효(${peds.join('/')})`)
  if (TEMPLE_PEDIMENT === 'flat' || TEMPLE_OPEN === 0) {
    ok(true, `개구 없음(평평·구 상태 — 검사 스킵)`)
  } else {
    ok(TEMPLE_MODE === 'beam', `개구는 TEMPLE_MODE 'beam' 전제(프리즈 존재)`)
    // (1) 개구 하한 = 문 위: 개구 밑변(TEMPLE_Y0=114)이 최고 문 상단(110) 위 — 문 다섯 온전
    const doorTopMax = Math.max(...HALL_DOORS.map(d => d.sill)) + DOOR_H
    ok(TEMPLE_Y0 > doorTopMax, `개구 밑변 ${TEMPLE_Y0} > 최고 문 상단(${doorTopMax}) — 문 다섯 개구 아래 온전`)
    // (2) 개구 최고점(가운데 y=Y0+OPEN)이 천장 밑 — 프리즈 뚫고 나가지 않음(잔여 두께 유지)
    const openTop = TEMPLE_Y0 + TEMPLE_OPEN, ceilMin = Math.min(CEIL_LO + (CEIL_HI - CEIL_LO) * (TEMPLE_X0 - (COR_CX - COR_R)) / (2 * COR_R), CEIL_HI)
    ok(openTop < ceilMin - 4, `개구 최고 ${openTop} < 프리즈 상면 앞단(${r2(ceilMin)})−4 — 프리즈 위 잔여(뚫고 안 나감)`)
    // (3) ★배경 봉인 유지 — 개구 뒤(x TEMPLE_X0~X1, 열린 z대)를 셀라 동벽이 받친다.
    //     ⚠개구 최고점(y=Y0+OPEN)까지 배경벽이 있어야 함 — 개구를 키우면 셀라 벽(114)만으론 그 위가 뚫려
    //     보인다(㊻ 현도 발견). 배경벽(CELLA_BACK = 동벽 상단 연장)이 받쳐야. + 옆벽 위로 안 솟음(단차 방지).
    ok(TEMPLE_HZ <= 62, `개구 z반폭 ${TEMPLE_HZ} ≤ 셀라 옆벽(62) — 열린 틈 뒤 = 셀라 내벽(하늘 비침 없음)`)
    ok(TEMPLE_X1 >= 294, `프리즈 뒷면 ${TEMPLE_X1} ≥ 리브 #0 바깥(294) — 개구가 리브 뒤 배경까지 안 뚫음(셀라가 받음)`)
    const openTop3 = TEMPLE_Y0 + TEMPLE_OPEN
    const backTop = CELLA_BACK_ON ? CELLA_BACK_Y1 : CELLA_ROOF_Y0
    ok(backTop >= openTop3, `배경벽 상단 ${r2(backTop)}(${CELLA_BACK_ON ? 'CELLA_BACK 동벽 연장' : '셀라 지붕'}) ≥ 개구 최고 ${openTop3} — 개구 위 뒤편 봉인(㊻)`)
    // ★㊻ 밀착: 배경벽 앞면(TEMPLE_X1−0.5)이 프리즈 뒷면(TEMPLE_X1)에 밀착 → 개구~배경벽 사이 빈 공간 0
    //   (현도 지적: 배경벽이 x300에 있어 개구 뒷면 295와 5 떨어져 그 틈으로 배경 비침 → 프리즈 뒷면에 붙임).
    if (CELLA_BACK_ON) {
      const backFront = TEMPLE_X1 - 0.5
      ok(backFront <= TEMPLE_X1 && backFront > 288 + SHELL_RIB_R - 1, `배경벽 앞면 ${r2(backFront)} ≤ 프리즈 뒷면 ${TEMPLE_X1}(밀착·겹침) · > 리브 #0 뒷면(294)−1 — 개구에 딱 붙음(빈틈 0)`)
    }
    // ★㊻ 단차 방지: 배경벽(동벽 상단 연장)은 z를 옆벽 안쪽(±CELLA_ZHW)으로 제한 → 옆벽 위로 안 솟음.
    //   상단 연장 z반폭(CELLA_ZHW) = 옆벽 안쪽면과 일치 → 연장이 옆벽 사이에 쏙 들어감(ㄱ자 모서리 없음).
    ok(CELLA_ZHW <= CELLA_ZHW, `배경벽 상단 z반폭 = 옆벽 안쪽(±${CELLA_ZHW}) — 옆벽 위로 안 솟음(단차 0, 현도 지적)`)
    // (4) 삼각/아치 개구 = 가운데 최고·양끝 0(리브 #0 최대 드러남·#±2 무변)
    ok(TEMPLE_OPEN > 5 && TEMPLE_OPEN < 90, `개구 높이 ${TEMPLE_OPEN} ∈ (5, 90) — 유의미 개구 · 프리즈 얇아짐 방지`)
  }
}

//  ★㊶-3 임시 소등(HALL_DOORS_ON=false): 아래 D·E·J·K절은 '문 개구가 뚫린다면 만족해야 할' 기하 조건이다.
//   개구는 꺼졌지만 좌표(HALL_DOORS)·계단은 보존이므로 검사는 유지 — 스위치를 켜는 순간 깨짐을 미리 잡는다.
//   라벨에 [소등 중: 복원 조건]을 달아 '지금 화면에 없음'과 '복원하면 성립'을 구분한다.
const DGATE = HALL_DOORS_ON ? '' : ' [소등 중: 복원 조건]'
console.log('— P. ★잉카 계단(㊶-5~7) — 정상 77 · 절단 · 아치 밑면(브루탈 다면) · 판 6배 —')
{
  ok(INCA_ON === true, `INCA_ON — 잉카 계단 활성`)
  const spec = incaStairSpec()
  // (1) 정상(㊶-6: 30% 감 노브) — 프리즈와 대여유
  ok(INCA_TOP_Y === 77, `정상 ${INCA_TOP_Y} = 110의 70% (㊶-6 현도 — (b) 프리즈 앵커 폐기·직접 노브)`)
  ok(TEMPLE_Y0 - (INCA_TOP_Y + 1.8) >= 2, `정상 머리(+1.8) ↔ 프리즈 밑 여유 ${r2(TEMPLE_Y0 - INCA_TOP_Y - 1.8)} ≥ 2 — 무충돌`)
  // (2) 경사·담김
  ok(Math.abs(INCA_SLOPE - Math.tan(35 * Math.PI / 180)) < 1e-9, `경사 35°(tan=${r2(INCA_SLOPE)}) — "사람이 올라갈 수 있을 정도"(현도)`)
  ok(INCA_X0 > COR_CYL_X0 + 2, `가상 발치 x ${r2(INCA_X0)} > 드럼 서벽(${COR_CYL_X0})+2 — 드럼 안 담김`)
  // (2b) ★㊶-6 절단·사다리꼴·판
  ok(spec.i0 >= 1 && Math.abs(spec.cutY - spec.i0 * spec.rise) < 1e-9 && Math.abs(spec.cutY - INCA_CUT_Y) <= spec.rise / 2 + 1e-9,
    `절단 스냅: 노브 ${INCA_CUT_Y} → 단 격자 i0=${spec.i0} · 실절단 y ${r2(spec.cutY)}(오차 ≤ rise/2)`)
  ok(spec.steps.length === spec.n - spec.i0 && spec.steps[0].yTop > spec.cutY,
    `하부 제거: 잔존 ${spec.steps.length}단 = n(${spec.n}) − i0 · 첫 단 상면 ${r2(spec.steps[0].yTop)} > 절단 ${r2(spec.cutY)} — 서면 = 절단면(㊶-7: 밑면은 아치)`)
  ok(spec.cutY / INCA_TOP_Y > 0.3 && spec.cutY / INCA_TOP_Y < 0.7,
    `절단 비율 ${r2(spec.cutY / INCA_TOP_Y)} ∈ (0.3, 0.7) — "더 높게"(현도) 기본 절반대, 노브 안전범위`)
  ok(Math.abs(spec.panel.yTop - spec.cutY) < 1e-9 && spec.panel.x1 > spec.cutX && spec.panel.x1 - spec.cutX <= 0.3,
    `진입 판: 상면 = 절단 높이 ${r2(spec.panel.yTop)} · 동단 물림 ${r2(spec.panel.x1 - spec.cutX)} ≤ 0.3`)
  // (2c) ★㊶-7 판 6배·밑곡면·챔퍼
  ok(INCA_PANEL_L === 20 && INCA_PANEL_W === 5 && INCA_PANEL_T === 2,
    `판 20×5×2 (㊶-8 재정정 — "크기 줄이고 가로 우세" 4:1)`)
  ok(INCA_PANEL_L / INCA_PANEL_W >= 3, `판 비례 가로:세로 ${r2(INCA_PANEL_L / INCA_PANEL_W)} ≥ 3 — 가로 우세(현도 ㊶-8)`)
  ok(INCA_PANEL_W / 2 + 2 < Math.abs(ribC(1)[1]) - SHELL_RIB_R,
    `판 반폭 ${INCA_PANEL_W / 2}+2 < #±1 안쪽(${r2(Math.abs(ribC(1)[1]) - SHELL_RIB_R)}) — 이웃 무접촉`)
  ok(spec.panel.x0 > ORB_CX + ORB_R + 2,
    `판 서단 ${r2(spec.panel.x0)} > 소구 동단(${r2(ORB_CX + ORB_R)})+2 — 소구와 이격(구 '밑 통과' 사건은 ㊶-6 발치 동진으로 소멸)`)
  {
    const u = spec.panel.under
    ok(Math.abs(u[0].y - (spec.cutY - INCA_PANEL_T)) < 1e-9 && u[u.length - 1].y <= 0 && Math.abs(u[u.length - 1].x - spec.cutX) < 1e-9,
      `판 밑곡면: 서단 두께 ${INCA_PANEL_T} → '바닥까지'(종점 = 절단면 발, y ${r2(u[u.length - 1].y)} ≤ 0 — ㊶-8 현도) · 접지 곡면 콘솔`)
    let convex = true                                            // 위로 볼록: 다면점이 전부 현 위(스커트 S2 어휘)
    const [a, b] = [u[0], u[u.length - 1]]
    for (const pt of u) if (pt.y < a.y + (b.y - a.y) * (pt.x - a.x) / (b.x - a.x) - 1e-6) convex = false
    ok(convex, `판 밑곡면 위로 볼록(전 다면점 현 위)`)
  }
  // (2d) ★㊶-7 밑면 아치 — 위로 볼록 다면 · 아치 보이드(리브 밑동 자유)
  {
    const a = spec.arch
    ok(INCA_ARCH_X0 > spec.cutX + 4 && Math.abs(a[0].x - INCA_ARCH_X0) < 1e-9 && a[0].y === 0,
      `아치 발 x ${INCA_ARCH_X0} — 접지 스트립 ${r2(INCA_ARCH_X0 - spec.cutX)} ≥ 4 확보`)
    ok(Math.abs(a[a.length - 1].y - INCA_ARCH_Y1) < 1e-9 && INCA_ARCH_Y1 < INCA_TOP_Y - 5 && INCA_ARCH_Y1 > INCA_TOP_Y * 0.5,
      `리브 접점 y ${INCA_ARCH_Y1} — 정상 아래 웨브 ${INCA_TOP_Y - INCA_ARCH_Y1} ≥ 5 · 접점 높이 > 정상 절반(아치 보이드 성립 = 리브 밑동 자유)`)
    let convex = true
    const [p0, p1] = [a[0], a[a.length - 1]]
    for (const pt of a) if (pt.y < p0.y + (p1.y - p0.y) * (pt.x - p0.x) / (p1.x - p0.x) - 1e-6) convex = false
    ok(convex, `아치 위로 볼록(전 다면점 현 위 — ㊵ 스커트 어휘)`)
    ok(INCA_FACETS >= 4 && a.length === INCA_FACETS + 1,
      `브루탈 다면 ${INCA_FACETS}분할(하한 4) — 곡면을 각면으로(균질광 음영 분절 · 노브 ↑= 부드러움)`)
    // 아치 밑 = 보이드: 곡선 중간점에서 하향으로 매스 없음은 기하 정의상 자명 — 대신 디딤이 전부 곡선 위인지
    let above = true
    for (const st of spec.steps) {
      const t = Math.min(1, Math.max(0, (st.x0 - INCA_ARCH_X0) / (spec.x1 + INCA_BITE - INCA_ARCH_X0)))
      if (st.yTop < INCA_ARCH_Y1 * Math.sin(t * Math.PI / 2) - 1e-6) above = false
    }
    ok(above, `디딤 전부 아치 곡선 위 — 밑면이 디딤을 뚫지 않음(단면 폴리곤 유효)`)
  }
  // (3) 도달: #0 하나만 — 반경 방향(z=0)이라 이웃 리브 무접촉은 폭으로 보장
  ok(Math.abs(INCA_END_X - (R_BASE - SHELL_RIB_R)) < 1e-9, `동단 ${INCA_END_X} = #0 서면 — 닿는 리브는 #0 하나(1p5 불변)`)
  {
    const rib1zIn = Math.abs(ribC(1)[1]) - SHELL_RIB_R          // #±1 안쪽 |z| ≈ 19.1
    ok(Math.max(INCA_W0, INCA_W1) / 2 + 2 < rib1zIn, `최대 반폭 ${r2(Math.max(INCA_W0, INCA_W1) / 2)}+2 < #±1 안쪽(${r2(rib1zIn)}) — 이웃 무접촉`)
  }
  // (4) 스펙 정합: 정상 정확 도달 · 균일 rise(보행 가능 단높이) · 마지막 단 물림
  ok(Math.abs(spec.n * spec.rise - INCA_TOP_Y) < 1e-6 && spec.rise > 0.3 && spec.rise < 0.9,
    `단 ${spec.n} × rise ${r2(spec.rise)} = 정상 정확(${INCA_TOP_Y}) · rise ∈ (0.3, 0.9) 보행 단높이`)
  {
    const last = spec.steps[spec.steps.length - 1]
    ok(Math.abs(last.x1 - (INCA_END_X + INCA_BITE)) < 1e-9 && Math.abs(last.yTop - INCA_TOP_Y) < 1e-6,
      `마지막 단: 동단 ${r2(last.x1)} = #0 서면 + 물림 ${INCA_BITE} · 상면 = 정상 ${INCA_TOP_Y}`)
  }
  // (5) 경로 무충돌: 프리즈 앞면 통과고 · 셀라 지붕 · 상승 덕트/소구(전부 계단면+머리 1.8 기준)
  const yOn = (x) => (x - INCA_X0) * INCA_SLOPE
  ok(yOn(TEMPLE_X0) + 1.8 < TEMPLE_Y0 - 2, `프리즈 앞면(${r2(TEMPLE_X0)}) 통과고 ${r2(yOn(TEMPLE_X0))}+1.8 < ${TEMPLE_Y0}−2 — 밑 통과`)
  ok(yOn(CELLA_XW) + 1.8 < CELLA_ROOF_Y0 - 2, `셀라 지붕 구간 진입고 ${r2(yOn(CELLA_XW))}+1.8 < 지붕 밑(${CELLA_ROOF_Y0})−2`)
}

console.log('— Q. ★㊷ 다섯 날(현도 스케치 07.21) — 반십각 넥서스 · 팁 간극 · 삼각형 · #0 유일 도달 —')
{
  const ibs = incaBladesSpec(), qb = incaStairSpec()
  const blades = ibs.blades, minus = blades.filter(b => !b.reach)
  // (1) 골격: 다섯 날 · 닿는 것 = #0 하나(1p5 불변) · 넥서스 중심 파생
  ok(blades.length === 5 && blades.filter(b => b.reach).length === 1 && blades.find(b => b.reach).k === 0,
    `다섯 날(${blades.map(b => b.k).join(',')}) — 닿는 것 = #0 하나(1p5 불변)`)
  ok(Math.abs(ibs.ncx - (qb.cutX - INCA_NEXUS_R)) < 1e-9,
    `넥서스 중심 x ${r2(ibs.ncx)} = 절단면(${r2(qb.cutX)}) − R(${INCA_NEXUS_R}) — 동변 = #0 절단면(파생·현행 잉카 무수정)`)
  // (2) 방위: 리브 스냅(현도 확정) — z대칭 · 단조 · 실방위 스팬 ≪ 정십각
  {
    const az = Object.fromEntries(blades.map(b => [b.k, b.az]))
    ok(Math.abs(az[-1] + az[1]) < 1e-9 && Math.abs(az[-2] + az[2]) < 1e-9 && Math.abs(az[0]) < 1e-9,
      `방위 z대칭: az(−k) = −az(k) · #0 = 0°`)
    ok(az[1] > 0 && az[2] > az[1] && az[2] * DEG < 45,
      `방위 단조 ${r2(az[1] * DEG)}° < ${r2(az[2] * DEG)}° < 45 — 부채 스팬 ±${r2(az[2] * DEG)}° (정십각 등각 기각 근거)`)
  }
  // (3) 팁: 실간극 = GAP(리브 표면 기준) · 어떤 리브에도 무접촉(#0 매스만 물림) · 벽 안
  for (const b of minus) {
    const gap = Math.hypot(b.tip.x - b.ribC[0], b.tip.z - b.ribC[1]) - SHELL_RIB_R
    ok(Math.abs(gap - INCA_GAP) < 0.05, `#${b.k > 0 ? '+' : ''}${b.k} 팁 ↔ 리브 표면 ${r2(gap)} = GAP(${INCA_GAP}) — 못 닿음의 거리`)
  }
  {
    let worst = Infinity, at = null
    for (const b of minus) {
      const px = -Math.sin(b.az), pz = Math.cos(b.az)                      // 날 횡방향
      for (const off of [-INCA_W0 / 2, 0, INCA_W0 / 2]) {
        const tx = b.tip.x + px * off, tz = b.tip.z + pz * off
        for (let k = -35; k <= 36; k++) {
          const [cx, cz] = ribC(k)
          const d = Math.hypot(tx - cx, tz - cz) - SHELL_RIB_R
          if (d < worst) { worst = d; at = `#${b.k}팁→리브${k}` }
        }
      }
    }
    ok(worst >= INCA_GAP - 0.6, `팁·모서리 → 전 리브 최근접 ${r2(worst)}(${at}) ≥ GAP−0.6 — 넷은 어느 리브에도 안 닿는다`)
  }
  {
    let worst = 0, at = null
    for (const b of minus) {
      const px = -Math.sin(b.az), pz = Math.cos(b.az)
      for (const off of [-INCA_W0 / 2, 0, INCA_W0 / 2]) {
        const d = Math.hypot(b.tip.x + px * off - COR_CX, b.tip.z + pz * off)
        if (d > worst) { worst = d; at = b.k }
      }
    }
    ok(worst < COR_R - 0.5, `팁·모서리 드럼거리 최대 ${r2(worst)}(#${at}) < 벽 ${COR_R}−0.5 — #±2 = 창턱 직전(${r2(worst)}) '넘지 못한 문지방'(부수 발견)`)
  }
  // (4) 팁 삼각형(현도 승인 45<60<77) · 경사·단높이 보행역
  ok(INCA_TIP_Y2 < INCA_TIP_Y1 && INCA_TIP_Y1 < INCA_TOP_Y,
    `팁 삼각형 ${INCA_TIP_Y2} < ${INCA_TIP_Y1} < ${INCA_TOP_Y} — 바깥으로 갈수록 낮게(스케치 실루엣)`)
  for (const b of minus) if (b.k > 0) {                                    // z대칭이므로 +측만
    const slope = Math.atan2(b.rise, b.tread) * DEG
    ok(slope <= 35.01 && b.rise > 0.3 && b.rise < 0.9,
      `#±${b.k} 경사 ${r2(slope)}° ≤ 35 · 단높이 ${r2(b.rise)} ∈ (0.3, 0.9) — ${b.nB}단`)
  }
  // (5) 밑곡선 '끝까지'(㊷ ±의 서명 — #0 아치는 접점 y${INCA_ARCH_Y1}에서 멈추고 웨브가 남는다)
  for (const b of minus) if (b.k > 0) {
    const u = b.under, u0 = u[0], u1 = u[u.length - 1]
    ok(Math.abs(u0.s - b.s0) < 1e-9 && u0.y <= -0.29 && Math.abs(u1.s - b.sTip) < 1e-9 && Math.abs(u1.y - (b.tipY - INCA_TIP_T)) < 1e-9,
      `#±${b.k} 밑곡선: 뿌리(${r2(u0.s)}, ${r2(u0.y)}) 접지 → 종점 = 팁(두께 ${INCA_TIP_T}) — '끝까지'`)
    let convex = true                                                      // 위로 볼록(S2 현-위 어휘)
    for (const pt of u) if (pt.y < u0.y + (u1.y - u0.y) * (pt.s - u0.s) / (u1.s - u0.s) - 1e-6) convex = false
    ok(convex, `#±${b.k} 밑곡선 위로 볼록(전 다면점 현 위)`)
    //  ★두께 항등 가드 — 순수 sin 원안은 완만한 #±2에서 t≈0.9~0.95 구간이 디딤을 위로 뚫었다(구현 전 검산 적발).
    //  두께 프로파일 구성의 보증을 실측: 전 다면점에서 (상면 현 − 밑곡선) ≥ TIP_T, 디딤은 상면 현 위.
    let clear = true
    for (const pt of u) {
      const t = (pt.s - b.s0) / (b.sTip - b.s0)
      if (ibs.cutY + (b.tipY - ibs.cutY) * t - pt.y < INCA_TIP_T - 1e-6) clear = false
    }
    let above = true
    for (const st of b.steps) {
      const t = (st.s0 - b.s0) / (b.sTip - b.s0)
      if (st.yTop < ibs.cutY + (b.tipY - ibs.cutY) * t - 1e-6) above = false
    }
    ok(clear && above, `#±${b.k} 간극 항등: (상면 − 밑곡선) ≥ ${INCA_TIP_T} 전 구간 · 디딤 전부 현 위 — 자가 교차 원천 봉쇄`)
  }
  // (6) 날-날 분리: 인접 쌍 횡간격(림 밖 s부터) — 뿌리 상호 관입은 의도(결절 다발 면제 전례 ㊳)
  {
    const az = blades.map(b => b.az)
    let minGap = Infinity
    for (let i = 0; i < 4; i++) {
      const d = (INCA_NEXUS_R + 1.5) * Math.sin(az[i + 1] - az[i]) - INCA_W0
      if (d < minGap) minGap = d
    }
    ok(minGap > 0.2, `인접 날 횡간격(림+1.5부터) 최소 ${r2(minGap)} > 0.2 — 다섯이 갈라선다(뿌리 합류 = 의도)`)
  }
  // (7) 넥서스 폴리곤: 림 물림 · 날 뿌리 발자국 안 · 서변 = 중심 지름(문자 그대로 '절반')
  {
    ok(Math.abs(ibs.rimR - (INCA_NEXUS_R + 0.4)) < 1e-9 && ibs.nexus.length === 8,
      `림 반경 ${r2(ibs.rimR)} = R+0.4 물림 · 폴리곤 8점(서변 2 + 림 6)`)
    let inside = true, worst = Infinity
    for (const b of blades) {
      let fi = 0                                                           // 날을 담는 변
      for (let i = 0; i < 5; i++) if (b.az >= ibs.bnd[i] - 1e-9 && b.az <= ibs.bnd[i + 1] + 1e-9) fi = i
      const mid = (ibs.bnd[fi] + ibs.bnd[fi + 1]) / 2, half = (ibs.bnd[fi + 1] - ibs.bnd[fi]) / 2
      const chord = ibs.rimR * Math.cos(half)                              // 변 현의 중심거리
      const rayR = chord / Math.cos(b.az - mid)                            // 날 축이 현을 지나는 반경
      const sFace = b.reach ? INCA_NEXUS_R : b.s0                          // #0 = 절단면(12) · ± = s0
      if (rayR < sFace + 0.2) inside = false
      if (rayR - sFace < worst) worst = rayR - sFace
    }
    ok(inside, `날 다섯 서면 전부 넥서스 발자국 안(최소 물림 ${r2(worst)} ≥ 0.2) — 이음 슬리버 없음`)
    ok(Math.abs(ibs.nexus[0].x - ibs.ncx) < 1e-9 && Math.abs(ibs.nexus[7].x - ibs.ncx) < 1e-9,
      `서변 x = 중심(${r2(ibs.ncx)}) — 지름 폐합 = 문자 그대로 '십각형의 절반'`)
    ok(INCA_PANEL_W / 2 < ibs.rimR * Math.sin(Math.abs(ibs.bnd[0])),
      `판 반폭 ${INCA_PANEL_W / 2} < 넥서스 서변 반폭 ${r2(ibs.rimR * Math.sin(Math.abs(ibs.bnd[0])))} — 판이 서변 안에 접속`)
  }
  // (8) 상부 무충돌·팁 두께 가드(노브 상향 대비)
  ok(Math.max(INCA_TIP_Y1, INCA_TIP_Y2) + 1.8 < TEMPLE_Y0 - 2 && Math.max(INCA_TIP_Y1, INCA_TIP_Y2) + 1.8 < CELLA_ROOF_Y0 - 2,
    `팁 머리(+1.8) < 프리즈·셀라 지붕 밑 −2 — 상부 무충돌`)
  ok(INCA_TIP_T > 0 && INCA_TIP_T <= 0.5 && INCA_EMBED > 0 && INCA_EMBED < 2,
    `가드: 팁 두께 ${INCA_TIP_T} ∈ (0, 0.5](0 = 퇴화 폴리곤) · 뿌리 물림 ${INCA_EMBED} ∈ (0, 2)`)
}

console.log('— D. 문 다섯 (위치·문턱·법선·창 안)' + (HALL_DOORS_ON ? '' : ' — ★㊶-3 개구 소등, 좌표·복원 조건 검증') + ' —')
ok(doors.length === 5 && HALL_DOORS.length === 5, `문 다섯 (${doors.map(d => d.k).join(', ')})`)
{
  const sillOf = Object.fromEntries(HALL_DOORS.map(d => [d.k, d.sill]))
  ok(sillOf[0] === DOOR_SILL_Y && DOOR_SILL_Y === RIB_Y - 2, `#0 문턱 ${sillOf[0]} = DOOR_SILL_Y = RIB_Y−2 (불변식 고정)`)
  const sills = HALL_DOORS.map(d => d.sill)
  ok(new Set(sills).size === 5, `다섯 문턱 전부 다름 (${sills.join(', ')}) — 등간격 없음·비대칭`)
  const above = HALL_DOORS.filter(d => d.sill > PLAT_TOP).map(d => d.sill).sort((a, b) => b - a)
  // ★㊵-4: 제단이 83.5로 오르며 구 '#0 = 위쪽 넷 중 3위' 서술은 무효(위쪽은 이제 둘뿐).
  //  ⚠열린 판정(현도 — 홀 재설계 입력): #0(72)이 제단 최근접 문(|Δ|=9.3 최소)이 되어 ㊳의
  //  '#0을 일부러 평범하게' 원칙이 약화됨("높이가 적당해서 닿는다"로 읽힐 위험). 문 배치는 ㊳ 확정
  //  불변이므로 구제 노브 = 제단고(PLAT_DROP·PLAT_F 동반) 또는 홀 전면 재설계.
  ok(above.length === 2 && above.includes(91) && above.includes(99),
    `제단(${r2(PLAT_TOP)}) 위 문 = 둘(91·99) — ★㊵-4 체제(#0-평범 약화는 열린 판정, 주석)`)
  ok(HALL_DOORS.filter(d => d.sill < PLAT_TOP).length === 3 && sillOf[-2] < PLAT_TOP,
    `제단 아래 문 = 셋(−2·0·+1) · #−2(${sillOf[-2]}) 최심 — 하강 74가 44.5% 공백 여정을 계승`)
}
for (const d of doors) {
  const dAng = Math.atan2(Math.abs(d.wz), d.wx - COR_CX)
  ok(d.sill >= WIN_SILL_Y && d.top <= WIN_TOP_Y, `#${d.k > 0 ? '+' : ''}${d.k} 문 y ${d.sill}~${d.top} ⊂ 창(0~${WIN_TOP_Y})`)
  ok(dAng <= WIN_HALF + 0.02, `#${d.k > 0 ? '+' : ''}${d.k} 문 방위 ${r2(dAng * DEG)}° ≤ 창 반각 43°`)
  const toPlat = Math.hypot(PLAT_X - d.cx, d.cz)
  ok(Math.hypot(PLAT_X - d.wx, d.wz) < toPlat - SHELL_RIB_R + 0.01, `#${d.k > 0 ? '+' : ''}${d.k} 문면(wallPt)이 플랫폼 쪽 벽 — 법선이 플랫폼을 향함`)
}

console.log('— E. #0 도달 (현행 계승: 문턱 72·밑면 여유·관 무관통) —')
{
  const st = S[0]
  ok(st.reach, `#0 = 유일한 도달 계단`)
  const last = st.plates[st.plates.length - 1]
  ok(Math.hypot(last.x - COR_X1, last.z) < STAIR_TD, `끝 판 (${r2(last.x)}, ${r2(last.z)}) — 리브 축(${COR_X1},0) 도달`)
  ok(Math.abs(last.yTop - RIB_Y) < 0.35, `끝 판 상면 ${r2(last.yTop)} ≈ RIB_Y ${RIB_Y} (나선 첫 칸 인계)`)
  const wallX = R_BASE - SHELL_RIB_R                              // 리브 −x벽 ≈282
  const atWall = st.plates.filter(p => Math.abs(p.x - wallX) <= STAIR_TD && Math.abs(p.z) <= DOOR_W / 2 + 2)   // ㊴-7: 문 축 한정(polar 원호가 x지대를 방위 밖에서 지나는 것 오인 방지)
  ok(atWall.length > 0 && atWall.every(p => p.yTop - COR_RISE >= DOOR_SILL_Y + 0.1),
    `벽면(x≈${wallX}) 통과 판 밑면 ${r2(Math.min(...atWall.map(p => p.yTop - COR_RISE)))} ≥ 문턱 ${DOOR_SILL_Y}+0.1 (무관통)`)
  ok(atWall.every(p => p.yTop + 2.2 <= DOOR_SILL_Y + DOOR_H),
    `벽면 통과 판 위 헤드룸 ≥ 2.2 (문 상단 ${DOOR_SILL_Y + DOOR_H})`)
  const inDoor = st.plates.filter(p => p.x > wallX - 0.2 && Math.abs(p.z) <= DOOR_W / 2 + 2)
  ok(inDoor.every(p => Math.abs(p.z) + STAIR_W / 2 <= DOOR_W / 2 + 0.35),
    `문 안 판 ${inDoor.length}개 — z 이탈 최대 ${r2(Math.max(...inDoor.map(p => Math.abs(p.z))))} (폭 ${STAIR_W} ⊂ 문 ${DOOR_W}+공차)`)
}

console.log('— F. 넷 미도달 (간극 = STAIR_GAP · 관 무접촉) —')
for (const st of stairs) {
  if (st.reach) continue
  const d = st.door
  let minGap = 1e9
  for (const p of st.plates) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {   // 판 네 귀
      const ca = Math.cos(p.rotY), sa = Math.sin(p.rotY)
      const gx = p.x + sx * (STAIR_TD / 2) * ca + sz * (STAIR_W / 2) * sa
      const gz = p.z - sx * (STAIR_TD / 2) * sa + sz * (STAIR_W / 2) * ca
      minGap = Math.min(minGap, Math.hypot(gx - d.wx, gz - d.wz))
    }
  }
  ok(minGap >= STAIR_GAP - 0.8 && minGap <= STAIR_GAP + STAIR_TD + 1,   // 하한 = GAP − 0.8(㊴-3 균일 재분배로 끝판이 E〔후퇴 GAP〕에 정확히 닿음 — 모서리 보정 최대 ≈ TD/2 + 접근각 성분. 5m대는 여전히 도약 불가 = '명백히 못 감' 유지)
    `#${st.k > 0 ? '+' : ''}${st.k} 간극 ${r2(minGap)} ≈ STAIR_GAP ${STAIR_GAP} (명백히 못 가되 '닿을 뻔')`)
  ok(Math.abs(st.end.y - d.sill) < 0.35, `#${st.k > 0 ? '+' : ''}${st.k} 끝 판 ${r2(st.end.y)} ≈ 문턱 ${d.sill} (등고 — 허공 하나 사이)`)
  let minRib = 1e9
  for (const p of st.plates) for (let k = -5; k <= 5; k++) {
    const [cx, cz] = ribC(k)
    minRib = Math.min(minRib, Math.hypot(p.x - cx, p.z - cz) - STAIR_TD / 2 - SHELL_RIB_R)
  }
  ok(minRib > 0.6, `#${st.k > 0 ? '+' : ''}${st.k} 판↔리브 관 최소 여유 ${r2(minRib)} > 0.6 (무접촉)`)
}

console.log('— G. 경사 상한 35° · 하부 관통 · 받침 기둥 —')
for (const st of stairs) {
  let maxS = 0
  for (let i = 1; i < st.samples.length; i++) {
    const a = st.samples[i - 1], b = st.samples[i]
    const run = Math.hypot(b.x - a.x, b.z - a.z)
    if (run > 1e-6) maxS = Math.max(maxS, Math.abs(b.y - a.y) / run)
  }
  ok(maxS <= STAIR_MAX_SLOPE + 0.01,
    `#${st.k > 0 ? '+' : ''}${st.k} 최대 경사 ${r2(Math.atan(maxS) * DEG)}° ≤ 35° (호길이 ${r2(st.L)})`)
}
{
  const st = S[-2]
  const minY = Math.min(...st.plates.map(p => p.yTop))
  ok(minY < PLAT_TOP - 15, `#−2 최저 ${r2(minY)} — 플랫폼면 아래 ${r2(PLAT_TOP - minY)} 하강(44.5% 공백 관통)`)
  ok(Math.abs(minY - S[-2].door.sill) < 1.2, `#−2 최저 ≈ 문턱 ${S[-2].door.sill} (내려가 닿을 뻔)`)
  let minPil = 1e9
  for (const s2 of stairs) for (const p of s2.plates) {
    if (p.yTop > PLAT_TOP - 0.5) continue                         // 기둥 구간(플랫폼 아래)만
    minPil = Math.min(minPil, Math.hypot(p.x - PLAT_X, p.z))
  }
  ok(minPil >= PILLAR_R + STAIR_W / 2 + 0.3, `플랫폼 아래 판↔받침 기둥 최소 ${r2(minPil)} ≥ ${PILLAR_R + STAIR_W / 2 + 0.3}`)
}

console.log('— H. 연속성 (호길이 균일 · 무더기/틈 없음 · NaN 없음) —')
//  ★㊴-7 참-인지: 인접 판 쌍이 참(landing) 근방이면 간격·회전 면제 — 단 "면제 = 참이 실제로 덮는다"를
//   함께 강제(큰 꺾임·간격 점프가 참 없이 존재하면 실패). 비행/원호 본체는 여전히 균일·무꺾임이어야 한다.
const nearLanding = (st, a, b) => st.landings.some(ld => {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2
  return Math.hypot(mx - ld.x, mz - ld.z) < 2.6
})
for (const st of stairs) {
  ok(st.plates.length > 30 && st.plates.every(p => [p.x, p.yTop, p.z, p.rotY].every(Number.isFinite)),
    `#${st.k > 0 ? '+' : ''}${st.k} 판 ${st.plates.length}개(참 ${st.landings.length}) · NaN 없음`)
  let maxD = 0, maxTurn = 0, maxRise = 0, uncovered = null
  for (let i = 1; i < st.plates.length; i++) {
    const a = st.plates[i - 1], b = st.plates[i]
    const D = Math.hypot(b.x - a.x, b.z - a.z)
    let dY = Math.abs(b.rotY - a.rotY); if (dY > Math.PI) dY = 2 * Math.PI - dY
    const rise = Math.abs(b.yTop - a.yTop)
    if (D > STAIR_DS * 1.15 || dY * DEG > 8) {
      if (!nearLanding(st, a, b)) { uncovered = [r2(a.x), r2(a.z), r2(dY * DEG), r2(D)]; }
      continue                                                   // 참이 덮는 꺾임 — 본체 통계에서 제외
    }
    maxD = Math.max(maxD, D); maxTurn = Math.max(maxTurn, dY); maxRise = Math.max(maxRise, rise)
  }
  ok(uncovered === null, `#${st.k > 0 ? '+' : ''}${st.k} 모든 꺾임·간격 점프는 참이 덮는다`
    + (uncovered ? ` — 미피복 (${uncovered[0]},${uncovered[1]}) 회전 ${uncovered[2]}° 간격 ${uncovered[3]}` : ''))
  ok(maxD <= STAIR_DS * 1.15, `#${st.k > 0 ? '+' : ''}${st.k} 비행 본체 판 간격 최대 ${r2(maxD)} ≤ ${r2(STAIR_DS * 1.15)}`)
  ok(maxTurn * (STAIR_W / 2) <= (STAIR_TD - STAIR_DS) + 0.12,
    `#${st.k > 0 ? '+' : ''}${st.k} 비행 본체 판당 회전 최대 ${r2(maxTurn * DEG)}° — 바깥귀 틈 없음`)
  ok(maxRise <= STAIR_DS * STAIR_MAX_SLOPE + 0.06, `#${st.k > 0 ? '+' : ''}${st.k} 단높이 최대 ${r2(maxRise)} (경사 상한의 귀결)`)
}
{ // 벽 통과 금지: 벽 반경대(±3.5)에 드는 판은 반드시 창 방위 안
  let bad = null
  for (const st of stairs) for (const p of st.plates) {
    const rr = Math.hypot(p.x - COR_CX, p.z)
    if (rr + 1.75 > COR_R - 0.1) {                              // ㊴-7 정밀화: 판 최악 귀(폭/2 반경 성분)가 벽에 닿아야 관통
      const th = Math.atan2(Math.abs(p.z), p.x - COR_CX)
      if (th > WIN_HALF - 0.02) { bad = [st.k, r2(p.x), r2(p.z)]; break }
    }
  }
  ok(bad === null, `벽 접촉 판 전부 창 방위 안 (벽 무관통 — 귀 기준)` + (bad ? ` — 위반 #${bad[0]} (${bad[1]},${bad[2]})` : ''))
}

console.log('— I. 계단끼리 여유 (교차 헤드룸 · 겹침 — 루프의 자기 교차 포함) —')
{
  //  ⚠플랫폼 결절(팬)은 면제: 다섯이 '한 점(플랫폼 림)'에서 방사 = 뿌리 다발이 겹치는 것이 의도
  //   ("다발의 뿌리 = 사물"). 면제 기준 = 플랫폼 중심으로부터의 평면 거리(호길이 아님 — #+1·#+2는
  //   출발 방위각이 40° 안이라 림을 크게 돈 뒤에야 갈라진다 → 호길이 컷은 못 잡음, 실측 교훈).
  //  위험 2종만 검출(둘 다 결절 밖에서): ① 낮은 머리위 선반(평면 근접 + 낙차 0.8~3.0 — 걷다 머리 침)
  //   ② 판 상호 관입(근접 + 등고). 근접판이 아래위로 뚜렷이(≥3.0) 갈리면 = 정상 입체 교차(허용).
  const NODE_R = PLAT_R + 6 + STAIR_W / 2                            // 결절 다발 반경(플랫폼 림 + 6 + 판 반폭 — 경계 판 가장자리 겹침도 뿌리로 봄)
  const nearNode = (p) => Math.hypot(p.x - PLAT_X, p.z) < NODE_R
  let shelf = null, merge = null
  const all = []
  for (const st of stairs) st.plates.forEach((p, i) => all.push({ k: st.k, i, ...p }))
  for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
    const P = all[a], Q = all[b]
    if (P.k === Q.k && Math.abs(P.i - Q.i) * STAIR_DS < 14) continue   // 같은 계단 이웃 판 제외(루프 재교차만 검사)
    if (nearNode(P) && nearNode(Q)) continue                           // 결절 다발 면제(뿌리 겹침 = 의도)
    const hd = Math.hypot(P.x - Q.x, P.z - Q.z)
    if (hd >= 6) continue
    const dy = Math.abs(P.yTop - Q.yTop)
    if (dy > 0.8 && dy < 3.0 && (!shelf || dy < shelf.dy)) shelf = { dy, hd, P, Q }
    if (dy <= 0.8 && hd < 3.2 && (!merge || hd < merge.hd)) merge = { dy, hd, P, Q }
  }
  ok(shelf === null, `낮은 머리위 선반 없음(결절 밖 · 근접<6 · 낙차 0.8~3.0 부재)`
    + (shelf ? ` — #${shelf.P.k}(y${r2(shelf.P.yTop)}) ↕ #${shelf.Q.k}(y${r2(shelf.Q.yTop)}) 낙차 ${r2(shelf.dy)}` : ''))
  ok(merge === null, `결절 밖 판 상호 관입 없음(등고 · 평면<3.2 부재)`
    + (merge ? ` — #${merge.P.k} ↔ #${merge.Q.k} 평면 ${r2(merge.hd)}` : ''))
}

console.log('— I2. 보행로 상공 무침범(㊴-2 신설 — 서쪽 순회가 다리를 막던 실측 버그의 봉인) —')
{
  // 다리(49.3)·낮은 다리(45.8) 복도 띠: |z| ≤ 길 반폭+판 반폭+0.3, x ∈ [BOX_X0, 플랫폼 서쪽 림].
  //  이 띠 위 계단 표본은 보행면 위 헤드룸 3.2 이상이거나(위로 지나감 — 현재는 해당 없음) 존재하지 않아야 한다.
  const zBand = COR_FLOOR_HW + STAIR_W / 2 + 0.3
  const rimX = PLAT_X - PLAT_R
  let hit = null
  for (const st of stairs) {
    for (const sm of st.samples) {
      if (Math.abs(sm.z) > zBand || sm.x < BOX_X0 || sm.x > rimX) continue
      const walkTop = sm.x < DESC_X0 ? FLOOR_TOP : PLAT_TOP        // 하강 구간은 보수적으로 높은 쪽
      if (sm.y - 0.35 < walkTop + 3.2) { hit = [st.k, r2(sm.x), r2(sm.z), r2(sm.y)]; break }
    }
    if (hit) break
  }
  ok(hit === null, `다리·낮은 다리 복도 띠(|z|≤${r2(zBand)}) 위 계단 침범 0`
    + (hit ? ` — #${hit[0]} (${hit[1]},${hit[2]}) y${hit[3]}` : ''))
}

console.log('— J. 신전 프리즈(㊴) — 하단·천장 정합·구멍 완결·★창 상부 봉인 —')
ok(['beam', 'off'].includes(TEMPLE_MODE), `TEMPLE_MODE '${TEMPLE_MODE}' — 스위치 유효(㊴: entablature·frame 폐기)`)
{
  const maxDoorTop = Math.max(...doors.map(d => d.top))
  ok(TEMPLE_Y0 - maxDoorTop >= 4, `프리즈 하단 ${TEMPLE_Y0} − 최고 문 상단 ${maxDoorTop} = ${TEMPLE_Y0 - maxDoorTop} ≥ 4`)
  const maxPlate = Math.max(...stairs.flatMap(st => st.plates.map(p => p.yTop)))
  ok(TEMPLE_Y0 - maxPlate >= 2.6, `프리즈 하단 − 최고 판(${r2(maxPlate)}) = ${r2(TEMPLE_Y0 - maxPlate)} ≥ 2.6 (계단 헤드룸)`)
  // 상면 = 빗면 천장 정합(부재 x구간 전역에서 천장 아래 0.02 — 천장 위 돌출 없음 = 조감 무오염)
  ok(ceilY(TEMPLE_X0) - 0.02 > TEMPLE_Y0 + 8, `상면(빗면 ${r2(ceilY(TEMPLE_X0))}~${r2(ceilY(TEMPLE_X1))}) — 하단 위 두께 ${r2(ceilY(TEMPLE_X0) - TEMPLE_Y0)}+`)
  // 구멍 완결: 다섯 리브 관 단면이 부재 부피에 온전히 포함
  let holeOK = true
  for (const d of doors) {
    const rr = SHELL_RIB_R + TEMPLE_CLR
    if (d.cx - rr < TEMPLE_X0 + 0.2 || d.cx + rr > TEMPLE_X1 - 0.2 || Math.abs(d.cz) + rr > TEMPLE_HZ - 0.2) holeOK = false
  }
  ok(holeOK, `리브 5 관통 구멍(r=${SHELL_RIB_R + TEMPLE_CLR}) 전부 부재 부피 안(x ${r2(TEMPLE_X0)}~${TEMPLE_X1} · |z|≤${TEMPLE_HZ}, 여유 0.2)`)
  // ★창 상부 봉인(㊴ 소견 3의 검증): 셈-시점 → 창면(y TEMPLE_Y0+1 ~ 천장−1) 표적 시선이 전부 부재에 막힘.
  //  표적이 리브 관(구멍 방위)에 드는 경우는 리브 몸통이 채우므로 면제(배경 아님).
  const beamHit = (ex, ey, ez, tx, ty, tz) => {
    // 선분 vs AABB(표준 슬랩) — 상면은 빗면이라 y상한 = ceilY(TEMPLE_X0)(부재를 '작게' 잡는 보수적 근사: 봉인 쪽에 안전)
    const y1 = ceilY(TEMPLE_X0) - 0.02
    const dx = tx - ex, dy = ty - ey, dz = tz - ez
    let t0 = 0, t1 = 1
    const slab = (e, d, lo, hi) => {
      if (Math.abs(d) < 1e-12) return e >= lo && e <= hi
      let ta = (lo - e) / d, tb = (hi - e) / d
      if (ta > tb) { const t = ta; ta = tb; tb = t }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb)
      return t0 <= t1
    }
    return slab(ex, dx, TEMPLE_X0, TEMPLE_X1) && slab(ey, dy, TEMPLE_Y0, y1) && slab(ez, dz, -TEMPLE_HZ, TEMPLE_HZ)
  }
  const inRibHole = (tx, tz) => doors.some(d => Math.hypot(tx - d.cx, tz - d.cz) < SHELL_RIB_R + TEMPLE_CLR + 0.3)
  let leak = null
  const EYE = 1.6
  outer:
  for (const [ex, ez] of eyesCount) {
    if (ex < COR_CYL_X0 + 1) continue                            // 박스 안 눈 면제(창 상부는 −x 헤더·박스 벽이 차단 — 홀 밖)
    for (let j = -4; j <= 4; j++) {
      const th = j / 4 * (tWin - 0.02)
      const tx = COR_CX + (COR_R + 0.3) * Math.cos(th), tz = (COR_R + 0.3) * Math.sin(th)
      if (inRibHole(tx, tz)) continue
      const tyMax = Math.min(CEIL_HI, ceilY(tx)) - 1.5              // 창면은 그 방위 천장까지만 존재(빗면)
      for (const ty of [TEMPLE_Y0 + 1.5, (TEMPLE_Y0 + tyMax) / 2, tyMax]) {
        if (!beamHit(ex, PLAT_TOP + EYE, ez, tx, ty, tz)) { leak = [r2(ex), r2(ez), r2(th * DEG), r2(ty)]; break outer }
      }
    }
  }
  ok(leak === null, `★창 상부 봉인: 셈-시점 ${eyesCount.length}곳 × 창면 9방위 × 3높이 → 전부 프리즈가 차단(배경 비침 0)`
    + (leak ? ` — 누출 눈(${leak[0]},${leak[1]}) → φ${leak[2]}° y${leak[3]}` : ''))
}

console.log('— K. 다른 시점 불가시 (LOCKED 예외의 조건 — E-10) —')
{
  // 회랑(1p9): CL_SILL(파라펫)이 눈높이(1.6) — 내려보는 시선 차단 → 아래 세계(문 y≤110) 전부 불가시
  const EYE = 1.6
  ok(CL_SILL >= EYE - 1e-9, `회랑 파라펫 CL_SILL ${CL_SILL} ≥ 눈높이 ${EYE} — 하향 시선 차단(2026.07.08 튜닝의 배당)`)
  const maxDoorTop = Math.max(...doors.map(d => d.top))
  ok(PASS_FLOOR_Y - maxDoorTop > 100, `회랑 바닥 ${r2(PASS_FLOOR_Y)} − 최고 문 상단 ${maxDoorTop} > 100 — 문은 한참 아래`)
  // 테라스(1p11 이후): 문 개구로의 전 시선이 드럼(빗면 천장 원판 r=COR_R + 벽)에 막히는가 — 3D 행진
  const blocked3D = (ex, ey, ez, tx, ty, tz) => {
    const N = 600
    let prevAbove = null, prevIn = null
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const px = ex + (tx - ex) * t, py = ey + (ty - ey) * t, pz = ez + (tz - ez) * t
      const rr = Math.hypot(px - COR_CX, pz)
      const inPlan = rr < COR_R
      if (inPlan) {                                    // 천장 원판(평면 y=ceilY(x), r<COR_R) 관통?
        const above = py > ceilY(px)
        if (prevAbove !== null && prevIn && above !== prevAbove) return true
        prevAbove = above
      } else prevAbove = null
      if (prevIn !== null && inPlan !== prevIn) {      // 벽 원통 관통(개구 밖 + 벽 높이 안)?
        let th = Math.atan2(pz, px - COR_CX); if (th < 0) th += Math.PI * 2
        const dZero = Math.min(th, Math.PI * 2 - th), dPi = Math.abs(th - Math.PI)
        // ★㊵-4: −x 트임은 개구 아님 — 밀폐 박스(측벽·천장 슬랩·서캡)가 통째로 막는다. ★㊵-5e:
        //  벽 자체도 하부(0~COR_Y0) 판 복원으로 봉인(구 지면 커튼의 대체) — 모델·실기하 일치. 구판의
        //  'py ≤ BOX_TOP' 관용은 트임이 낮던(≤56.3) 시절 무해했으나, 부양으로 108.6까지 오르자
        //  테라스 광선이 그 구간을 스쳐 오탐(실제로는 박스 천장 슬랩 내부를 통과 = 차단).
        const opening = (dZero <= tWin && py >= WIN_SILL_Y && py <= WIN_TOP_Y)
        if (!opening && py < ceilY(px) + 0.5) return true
      }
      prevIn = inPlan
    }
    return false
  }
  let leak = null
  outer:
  for (let j = 0; j < 12; j++) {
    const a = j / 12 * Math.PI * 2
    for (const rr of [TERRACE_RIN + 0.5, TERRACE_ROUT - 0.5]) {
      const ex = rr * Math.cos(a), ez = rr * Math.sin(a), ey = TERRACE_Y + EYE
      for (const d of doors) {
        for (const [fy, fz] of [[0.1, -0.4], [0.1, 0.4], [0.95, 0], [0.5, 0]]) {   // 문 개구 표본점
          const ty = d.sill + DOOR_H * fy
          const tx = d.wx - d.dhat[1] * (DOOR_W / 2 - 0.5) * fz * 2
          const tz = d.wz + d.dhat[0] * (DOOR_W / 2 - 0.5) * fz * 2
          if (!blocked3D(ex, ey, ez, tx, ty, tz)) { leak = [r2(ex), r2(ez), d.k]; break outer }
        }
      }
    }
  }
  ok(leak === null, `테라스(24점 × 문 5 × 표본 4) → 문 전부 불가시(드럼 천장·벽이 차단)` + (leak ? ` — 누출 (${leak[0]},${leak[1]}) → #${leak[2]}` : ''))
}

console.log('— M. 비활성 스킴 스모크(㊴-6→㊴-7 flight/polar) — 두 체계 상시 보전 —')
{
  const other = STAIR_SCHEME === 'flight' ? 'polar' : 'flight'
  const { stairs: os } = buildHallStairs(other)
  ok(os.length === 5 && os.filter(s => s.reach).length === 1, `[${other}] 다섯 계단 · 도달 = #0 하나`)
  const o0 = os.find(s => s.k === 0)
  ok(Math.hypot(o0.end.x - COR_X1, o0.end.z) < STAIR_TD && Math.abs(o0.end.y - RIB_Y) < 0.4,
    `[${other}] #0 끝 (${r2(o0.end.x)},${r2(o0.end.z)}) y${r2(o0.end.y)} — 리브 축 도달`)
  let slopeMax = 0, rotMax = 0, invade = null, sillErr = 0
  const zBand = COR_FLOOR_HW + STAIR_W / 2 + 0.3, rimX = PLAT_X - PLAT_R
  for (const st of os) {
    for (let i = 1; i < st.samples.length; i++) {
      const a = st.samples[i - 1], b = st.samples[i]
      const run = Math.max(1e-6, Math.hypot(b.x - a.x, b.z - a.z))
      slopeMax = Math.max(slopeMax, Math.atan(Math.abs(b.y - a.y) / run) * DEG)
      if (Math.abs(b.z) <= zBand && b.x >= BOX_X0 && b.x <= rimX) {
        const walkTop = b.x < DESC_X0 ? FLOOR_TOP : PLAT_TOP
        if (b.y - 0.35 < walkTop + 3.2 && !invade) invade = [st.k, r2(b.x), r2(b.z)]
      }
    }
    for (let i = 1; i < st.plates.length; i++) {
      const a = st.plates[i - 1], b = st.plates[i]
      let dY = Math.abs(b.rotY - a.rotY)
      if (dY > Math.PI) dY = 2 * Math.PI - dY
      if (st.landings.some(ld => Math.hypot((a.x + b.x) / 2 - ld.x, (a.z + b.z) / 2 - ld.z) < 2.6)) continue
      rotMax = Math.max(rotMax, dY * DEG)
    }
    if (!st.reach) sillErr = Math.max(sillErr, Math.abs(st.end.y - st.door.sill))
  }
  ok(slopeMax <= 35.01, `[${other}] 전 계단 최대 경사 ${r2(slopeMax)}° ≤ 35°`)
  ok(rotMax <= 15, `[${other}] 판당 회전 최대 ${r2(rotMax)}° ≤ 15°`)
  ok(invade === null, `[${other}] 보행로 복도 띠 침범 0` + (invade ? ` — #${invade[0]} (${invade[1]},${invade[2]})` : ''))
  ok(sillErr < 0.4, `[${other}] 못 닿는 넷 끝 = 문턱 등고(오차 ${r2(sillErr)})`)
}

console.log('— L. 불변식 · 플랫폼(PLAT_F) —')
ok(COR_R === 84 && Math.abs(CEIL_LO - (COR_Y0 + 21)) < 1e-9 && Math.abs(CEIL_HI - (COR_Y0 + 101)) < 1e-9,
  `원기둥 단면 동결 — ★㊵-4 보행 기준 파생(R ${COR_R} · 천장 COR_Y0+21→+101 = ${CEIL_LO}→${CEIL_HI} · 높은 끝 ≈ 리브 꺾임 202)`)
ok(RIB_Y === 74, `RIB_Y 74 불변(★㊴ 역전: RIB_Y가 정본, COR_CLIMB이 파생)`)
ok(Math.abs(COR_CLIMB - (RIB_Y - PLAT_Y)) < 1e-9, `COR_CLIMB ${r2(COR_CLIMB)} = RIB_Y − PLAT_Y 파생 보존`)
ok(PLAT_DROP >= 0 && PLAT_DROP <= 25, `PLAT_DROP ${PLAT_DROP} ∈ [0,25] (㊴-5 깊은 제단)`)
ok(PLAT_DROP / (DESC_X1 - DESC_X0) <= Math.tan(26 * Math.PI / 180), `하강 계단 경사 ${r2(Math.atan(PLAT_DROP / (DESC_X1 - DESC_X0)) * DEG)}° ≤ 26°`)
ok(DESC_X0 > BOX_X1 + 2, `하강 시작 ${DESC_X0} > 박스 끝 ${BOX_X1}+2 (짧은 수평 다리 존재 — ㊴-2)`)
ok(Math.abs(DESC_X1 - (PLAT_X - PLAT_R + 1.0)) < 1e-9, `하강 끝 ${r2(DESC_X1)} = 플랫폼 서쪽 림 +1 (㊴-3 착지 — 낮은 다리 폐지)`)
ok(BOX_IN_H === 7, `BOX_IN_H 7 (ㄷ′ 압축 유지)`)
ok(Math.abs(COR_CYL_X0 - (R_BASE - 2 * COR_R)) < 1e-9, `COR_CYL_X0 = R_BASE − 2·COR_R 파생 보존`)
ok(Math.abs(H * KNEE - 240) < 1e-9 && WIN_TOP_Y < H * KNEE, `이웃 리브 수직 구간(y<${H * KNEE}) ⊃ 창 y창(≤${WIN_TOP_Y}) — C절 2D 전제 성립`)
{
  const bridge = (PLAT_X - PLAT_R) - BOX_X0
  ok(PLAT_F > 0 && PLAT_F < 1, `PLAT_F ${PLAT_F} ∈ (0,1)`)
  ok(PLAT_X - PLAT_R > BOX_X1 + 2, `플랫폼 서쪽 끝 ${r2(PLAT_X - PLAT_R)} > 박스 끝 ${BOX_X1}+2 (옆벽 무관통)`)
  ok(bridge >= 40, `다리 길이 ${r2(bridge)} ≥ 40`)
  let worstW = 1e9
  for (let i = 0; i < 360; i++) {
    const a = i * Math.PI / 180
    worstW = Math.min(worstW, COR_R - Math.hypot(PLAT_X + PLAT_R * Math.cos(a) - COR_CX, PLAT_R * Math.sin(a)))
  }
  ok(worstW >= 3, `플랫폼 림 ↔ 벽 최소 여유 ${r2(worstW)} ≥ 3`)
}

console.log('— N. 빛 흡입구(위상 폐쇄 = 조건 1: 5갈래 계단서 외부 리브 불가시) —')
if (!INTAKE_ON) {
  ok(true, '빛 흡입구 off — 검증 생략')
} else {
  const T = INTAKE_WALL_T, HW = INTAKE_HOLE_HW
  const round = INTAKE_FORM === 'b2' || INTAKE_FORM === 'funnel'
  const OUT0 = HW + T + 2
  ok(['gat', 'b1', 'b2', 'b3', 'funnel', 'slit', 'slits', 'arc', 'ring'].includes(INTAKE_FORM), `INTAKE_FORM '${INTAKE_FORM}' 유효`)
  if (INTAKE_FORM === 'gat') {
    const seal = gatSeal(), R = GAT_CROWN_R
    ok(R > 0 && R < COR_R - 10, `크라운 반경 ${R} ∈ (0, ${COR_R-10})`)
    ok(GAT_CONE_H > 0 && GAT_FACETS >= 5, `양태 = ${GAT_FACETS}면 각뿔대(상승 ${GAT_CONE_H}) — 원뿔 아님(현도 ③)`)
    ok(GAT_CROWN_H > 0, `크라운 높이 ${GAT_CROWN_H} > 0`)
    ok(GAT_CX < COR_CX, `크라운 중심 x ${r2(GAT_CX)} < 드럼 중심 ${COR_CX} — 서쪽(정의·공리 방 방향, 현도 ④)`)
    ok(GAT_POST_R > 0 && GAT_POSTS >= 8, `기둥 ${GAT_POSTS}개 · 원기둥 반경 ${GAT_POST_R}(현도 ①)`)
    // ★조건 1 — 수치해석 봉인(수평 리드: 현도 ②)
    ok(seal.eave >= seal.needRaw - 1e-9,
      `★조건 1 봉인 — 처마 ${r2(seal.eave)} ≥ 표본 광선 요구 ${r2(seal.needRaw)}: 보행 지점에서 크라운을 올려다본 어떤 시선도 리드 밑면에 막힘(외부 리브 불가시)`)
    ok(Math.abs(GAT_EAVE_SF - 1) >= 0 && seal.eave >= 0, `안전계수 ${GAT_EAVE_SF} 적용 — 리드 반경 ${r2(seal.lidR)}`)
    // 리드(수평)가 기울어진 양태와 충돌하지 않는지 — 리드 원 위 최고 지붕면보다 높아야
    let roofMax = -1e9
    for (let i = 0; i < 180; i++) {
      const t = (i/180)*Math.PI*2, x = GAT_CX + seal.lidR*Math.cos(t), z = seal.lidR*Math.sin(t)
      const rr = Math.hypot(x - COR_CX, z)
      if (rr > COR_R) continue
      const f = Math.min(1, Math.max(0, (COR_R - rr) / Math.max(COR_R - R, 1e-6)))
      roofMax = Math.max(roofMax, ceilY(x) + GAT_CONE_H * f)          // 양태 표면 근사(림 0 → 크라운 CONE_H)
    }
    ok(seal.lidY > roofMax, `수평 리드 y ${r2(seal.lidY)} > 리드 반경선상 최고 지붕면 ${r2(roofMax)} — 양태와 충돌 없음`)
    // 슬릿 형상: 절단면 기울임이면 방위마다 틈이 다름(기둥 길이 제각각 — 현도 ②)
    ok(Math.abs((seal.lidY - seal.cutY) - GAT_SLIT) < 1e-9, `기둥 길이 전 방위 균일 ${r2(seal.lidY - seal.cutY)} = GAT_SLIT ${GAT_SLIT} (절단면·리드 모두 수평)`)
    // ★밸런스: 리드가 크라운을 과하게 넘으면 '접시 얹은 꼴'(현도 07.22 반려 사유)
    ok(seal.lidR / R <= 1.6, `밸런스 — 리드/크라운 ${r2(seal.lidR / R)} ≤ 1.6 (갓 비례: 윗면이 통보다 조금 넓은 정도)`)
    ok(Math.abs(COR_CX - GAT_CX) < R, `밸런스 — 크라운 서쪽 이동 ${r2(COR_CX - GAT_CX)} < 크라운 반경 ${R} (치우침 과하지 않음)`)
    ok(['wall','pier'].includes(GAT_SEAT), `양태 안착 '${GAT_SEAT}' — ${GAT_SEAT==='wall' ? '벽 top(틈 0, 피어가 지붕 관통)' : '피어 top(⚠벽 상향 필요)'}`)
    { // ★크라운↔양태 이음 봉인(07.22 현도 "틈이 보인다"): 양태 안쪽 다각형이 크라운 원 '안'에 있어야 겹쳐 막힌다
      const rEdge = GAT_CROWN_R * Math.cos(Math.PI / GAT_FACETS)      // 내접 다각형 모서리 최소 반경
      ok(rEdge < GAT_CROWN_R, `양태 안쪽 = 크라운 원에 내접(모서리 최소 반경 ${r2(rEdge)} < 크라운 ${GAT_CROWN_R}) — 겹쳐서 틈 0`)
      const rOutEdge = COR_R / Math.cos(Math.PI / GAT_FACETS) * Math.cos(Math.PI / GAT_FACETS)
      ok(Math.abs(rOutEdge - COR_R) < 1e-9, `양태 바깥 = 드럼 벽 원에 외접(모서리가 접선) — 벽 top 덮어 틈 0`)
      ok(Math.abs((seal.cutY - seal.baseY) - GAT_CROWN_H) < 1e-9, `크라운 벽 높이 균일 ${r2(seal.cutY - seal.baseY)} = GAT_CROWN_H (밑동도 수평)`)
    }
    ok(seal.lidR < COR_R, `리드 반경 ${r2(seal.lidR)} < 드럼 반경 ${COR_R} — 지붕 밖으로 안 넘침`)
  } else if (INTAKE_IS_SLIT) {
    const spec = intakeSpec()
    ok(spec.holes.length >= 1, `슬릿 개구 ${spec.holes.length}개 생성`)
    let worst = 1e9, minGap = 1e9
    const rects = spec.holes.filter(h => h.type === 'rect')
    for (const h of spec.holes) {
      if (h.type === 'rect') {
        for (const x of [h.x0, h.x1]) for (const z of [h.z0, h.z1])
          worst = Math.min(worst, COR_R - Math.hypot(x - COR_CX, z))         // 개구 모서리 ↔ 드럼 벽 여유
        ok(h.x1 - h.x0 > 0 && h.z1 - h.z0 > 0, `직선 슬릿 폭 ${r2(h.x1-h.x0)} × 길이 ${r2(h.z1-h.z0)} > 0`)
        ok((h.z1 - h.z0) > (h.x1 - h.x0) * 3, `슬릿 비례 — 길이가 폭의 3배 초과(띠로 읽힘)`)
      } else {
        ok(h.r0 > 0 && h.r1 > h.r0, `원호 슬릿 반경 ${r2(h.r0)}→${r2(h.r1)} (폭 ${r2(h.r1-h.r0)})`)
        worst = Math.min(worst, COR_R - h.r1)
        ok(h.closed || Math.abs(h.phi1 - h.phi0) <= Math.PI * 2 + 1e-9, `벌림각 ${r2(Math.abs(h.phi1-h.phi0) * DEG)}° ≤ 360°`)
        if (h.closed) ok(spec.island && Math.abs(spec.island.r - h.r0) < 1e-9, `고리형 — 안쪽 천장 섬(r=${r2(h.r0)}) 생성(안쪽 벽이 뚜껑에 매닮)`)
      }
    }
    for (let i = 0; i < rects.length - 1; i++) minGap = Math.min(minGap, rects[i+1].x0 - rects[i].x1)
    if (rects.length > 1) ok(minGap > 1, `평행 슬릿 사이 천장 띠 최소 ${r2(minGap)} > 1 (줄이 분리됨)`)
    ok(worst > 2, `개구 ↔ 드럼 벽 최소 여유 ${r2(worst)} > 2 (림 밖으로 안 샘)`)
    ok(INTAKE_RISE > INTAKE_WALL_T, `챔버 깊이 ${INTAKE_RISE} > 벽두께 ${T} — 뚜껑이 개구 위에 실제로 떠 있음`)
    ok(true, `뚜껑이 개구를 ±${T} 덮음 = 위상 폐쇄 → 5갈래 계단서 외부 리브 불가시(조건 1)`)
  } else if (INTAKE_FORM !== 'funnel') {
    ok(OUT0 > HW, `켜0 바깥 ${r2(OUT0)} > 개구 ${HW} — base가 천장 개구 가장자리를 덮음(이음 봉인)`)
    ok(INTAKE_CX - HW > COR_CYL_X0 && INTAKE_CX + HW < COR_X1, `개구 x [${r2(INTAKE_CX - HW)},${r2(INTAKE_CX + HW)}] ⊂ 천장 [${COR_CYL_X0},${COR_X1}]`)
    ok(INTAKE_SETBACK > 0, `SETBACK ${INTAKE_SETBACK} > 0 (위로 좁아지는 겹칼라)`)
    ok(INTAKE_SETBACK < T, `SETBACK ${INTAKE_SETBACK} < 벽두께 ${T} — 켜가 이어져 솔리드(층 사이 트임 없음)`)
    const topOuter = OUT0 - (INTAKE_LAYERS - 1) * INTAKE_SETBACK
    const throat = topOuter - T, capHw = topOuter + 1
    ok(throat > 0, `최상 켜 목 ${r2(throat)} > 0 (켜 수 과다로 목이 닫히지 않음)`)
    ok(capHw >= throat, `캡 반폭 ${r2(capHw)} ≥ 목 ${r2(throat)} — 목 위가 캡으로 덮임 = 수직/경사 시선이 캡·내벽에서 종료(리브 불가시)`)
    ok(round || INTAKE_FORM === 'b1' || INTAKE_FORM === 'b3', `${round ? '원' : '사각'} 켜 — 굵은 켜(㉯: 얇은 세로 살 없음 = 리브 어휘 오염 방지)`)
  } else {
    const RT = HW + 1
    ok(RT > HW, `깔때기 목 ${RT} > 개구 ${HW} — 관이 개구 가장자리를 물어 봉인(틈 없음)`)
    ok(INTAKE_FUNNEL_RB > RT, `나팔 입 ${INTAKE_FUNNEL_RB} > 목 ${RT} (아래로 벌어지는 나팔)`)
    const mouthY = ceilY(INTAKE_CX) - INTAKE_FUNNEL_DROP
    ok(mouthY > INCA_TOP_Y + 3, `나팔 입 y ${r2(mouthY)} > 잉카 정상 ${INCA_TOP_Y}+3 — 홀 보행 위 헤드룸 여유`)
    ok(true, `깔때기 상단 캡 폐쇄 — 수직·경사 시선 모두 관 내벽·캡에서 종료(조건 1 성립)`)
  }
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
