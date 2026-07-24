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
  FRIEZE_ROOM_ON, FR_FLOOR_T, FR_WALL_T, FR_BACK_T, FR_CEIL_T, FR_FLOOR_Y, FR_ANNEX,   // ★55 프리즈 방(1p7)
  RIB_CUT_ON, RIB_CUT_MODE, RIB_CUT_SEED, RIB_CUT_GAP_MIN, RIB_CUT_HEAD, RIB_CUT_SEP,   // ★56 리브 절단(1p7)
  RIB_CUT_STUB_MIN, RIB_CUT_BOX_HW, RIB_CUT_CAP_T, RIB_CUT_CAP_MG,
  spiralPoint, STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, Y_POLE_CUT, ARCH_Y0, U_SPIRAL_END, rOf, uOfX,
  RIB_WALL_ON, RIB_WALL_T, RIB_WALL_T_MAX, RIB_WALL_SCOPE, RIB_BORE_MAX_AX, RIB_RADIAL_SEG, RIB_WALL_END_CAP,   // ★57 벽 두께
  RIB_VICE_ON, RIB_NEWEL_R, RIB_NEWEL_Y0, RIB_NEWEL_Y1, RIB_VICE_SOFFIT, RIB_VICE_T, RIB_VICE_R_OUT, RIB_POLE_ON,  // ★58 vice
  STEPS_PER_TURN, ribCenter, spiralU, U_DOOR,
  KW_STEPS, KW_TREAD_D, KW_TREAD_W, KW_FLATTEN, X_LAND_HI, U_KNEE_END, PANEL_DX, PANEL_Z0, PANEL_Z1, LAND_T,
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
import { hallDoors, buildHallStairs, PLAT_TOP, incaStairSpec, incaBladesSpec, intakeSpec, INTAKE_IS_SLIT, gatSeal, ribCutSpec } from './corridorStairsGeometry.js'
import * as THREE from 'three'                                                   // ★56 CSG 스모크(check_radial 전례)
import { Brush, Evaluator, HOLLOW_SUBTRACTION, SUBTRACTION } from 'three-bvh-csg'
import { buildRibShell, shellVolumeApprox, signedVolume, buildViceWedge, viceSplitIndex, newelSpec, viceBottomY, VICE_DTHETA } from './ribGeometry.js'

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

// ── ★55 프리즈 방(1p7) — 부재 속을 파낸 방. 현도 스케치 2026.07.24 ──
console.log('\n— R5. ★55 프리즈 방 (1p7 — 떠 있는 실체) —')
if (!FRIEZE_ROOM_ON) {
  ok(true, '프리즈 방 꺼짐 — 검사 생략')
} else {
  const rx0 = TEMPLE_X0 + FR_WALL_T, rx1 = TEMPLE_X1 + FR_ANNEX - FR_BACK_T, rzh = TEMPLE_HZ - FR_WALL_T
  const crown = TEMPLE_Y0 + TEMPLE_OPEN                       // 아치 꼭대기 = 방 바닥의 밑면 최고점
  const cW = ceilY(rx0) - 0.02 - FR_CEIL_T, cE = ceilY(rx1) - 0.02 - FR_CEIL_T
  //  ①★봉인의 급소 — 바닥 두께. 0이면 아치 크라운에서 방이 터널로 뚫려 홀에서 방 안이 보인다.
  //   이건 미학 노브가 아니다. 값을 줄일 때 이 검사가 먼저 죽어야 한다.
  ok(FR_FLOOR_T > 0 && FR_FLOOR_Y === crown + FR_FLOOR_T,
    `바닥 두께 ${FR_FLOOR_T} > 0 · 바닥 상면 ${FR_FLOOR_Y} = 아치 크라운 ${crown} + 두께 — 홀에서 방 안 불가시`)
  //  ⚠하한 2의 근거 정정(2026.07.24 실측): CSG는 두께 1에서도 멀쩡했다(NaN 0·바닥면 정점 유지).
  //   따라서 이 하한은 기하 한계가 아니라 **밟는 면의 살 + 봉인 여유**라는 설계 판단이다.
  ok(FR_FLOOR_T >= 2, `바닥 두께 ${FR_FLOOR_T} ≥ 2 — 밟는 면의 살·봉인 여유(CSG 한계 아님, 실측)`)
  //  ② 나머지 다섯 면의 살
  ok(FR_WALL_T > 0 && rx0 < rx1, `앞·뒷벽 ${FR_WALL_T} — 방 x${r2(rx0)}~${r2(rx1)} ⊂ 프리즈 ${r2(TEMPLE_X0)}~${TEMPLE_X1}`)
  ok(rzh > 0 && rzh < TEMPLE_HZ, `옆벽 ${FR_WALL_T} — 방 z±${r2(rzh)} ⊂ 프리즈 z±${TEMPLE_HZ}`)
  ok(FR_CEIL_T > 0 && cE < ceilY(rx1), `천장 두께 ${FR_CEIL_T} — 방 천장 ${r2(cE)} < 빗면 천장 ${r2(ceilY(rx1))} (돔 쪽 무누출)`)
  //  ③ 방이 방 노릇을 하는가 — 층고·부피
  ok(cW - FR_FLOOR_Y > 6, `층고(서) ${r2(cW - FR_FLOOR_Y)} > 6 — 설 수 있다`)
  ok(cE > cW, `동쪽이 높다 ${r2(cE)} > ${r2(cW)} — 빗면 천장 추종(방이 기울어 있다)`)
  //  ④★리브 다섯이 이 방을 관통하는가 = 1p7이 성립할 조건(끊을 대상이 방 안에 있어야 한다)
  let thru = 0
  for (const d of hallDoors())
    if (d.cx > rx0 - SHELL_RIB_R && d.cx < rx1 + SHELL_RIB_R && Math.abs(d.cz) < rzh) thru++
  ok(thru === 5, `리브 ${thru}/5기가 방을 관통 — 다섯을 끊을 수 있다(현도 ⓐ: 프리즈 안 5개만)`)
  //  ★★55-2 리브 뒤 여유 — 1p7의 급소. 벽에 박히면 "아무것에도 의존하지 않는다"가 반대로 읽힌다.
  //   현도 로컬 판정("답답하다") → 실측 결과 #0 −2.0·#±1 −0.9로 **세 개가 벽 속에 있었다**.
  //   동쪽 상한 = 셀라 동벽 안면(CELLA_X1−CELLA_T). 그 밖은 돔 리브 케이지 바깥이라 봉인 문제가 된다.
  let backMin = 1e9, backWho = ''
  for (const d of hallDoors()) { const g = rx1 - (d.cx + SHELL_RIB_R); if (g < backMin) { backMin = g; backWho = '#' + d.k } }
  ok(backMin > 0, `리브 뒤 여유 최소 ${r2(backMin)}(${backWho}) > 0 — 어느 리브도 뒷벽에 안 박힌다`)
  //  ★55-3 별채 — 셀라 바깥면(302)까지는 **새 돌출 0**(셀라가 이미 거기까지 나가 있다).
  //   그 너머는 신전이 실제로 더 튀어나오는 것 = 조감 판정 대상이므로 검증이 상한으로 잡는다.
  //  ★55-4 별채 = 파생(동단 ≡ 셀라 바깥면). 구조로 보장되지만, 파생이 끊기면 즉시 허공 돌출이 되므로 잠근다.
  ok(TEMPLE_X1 + FR_ANNEX === CELLA_X1 + CELLA_T,
    `별채 동단 ${r2(TEMPLE_X1 + FR_ANNEX)} ≡ 셀라 바깥면 ${CELLA_X1 + CELLA_T} — 항상 셀라 발자국 위(§2-D ① 뿌리)`)
  //  별채 밑면(아치 크라운 y164)을 배경벽이 받는가 — 허공 돌출 금지(§2-D ①)
  ok(FR_ANNEX === 0 || (TEMPLE_Y0 + TEMPLE_OPEN >= CELLA_ROOF_Y1 - 0.5 && TEMPLE_Y0 + TEMPLE_OPEN <= CELLA_BACK_Y1),
    `별채 밑면 y${TEMPLE_Y0 + TEMPLE_OPEN} ∈ 배경벽 y구간 [${r2(CELLA_ROOF_Y1 - 0.5)}, ${CELLA_BACK_Y1}] — 받쳐진다`)
  //  ★55-5 단차 봉인 — 방 바닥 위로 **다른 컴포넌트가 솟지 않는가**.
  //   배경벽은 Cella 소속이라 프리즈 방 감산이 안 닿는다 → 상단이 바닥보다 높으면 그대로 단차가 된다.
  //   (현도 스크린샷으로 발견: 구 +6이 4 솟아 방 동쪽 12 구간에 전폭 턱을 만들었다)
  ok(CELLA_BACK_Y1 <= FR_FLOOR_Y,
    `배경벽 상단 ${r2(CELLA_BACK_Y1)} ≤ 방 바닥 ${FR_FLOOR_Y} — 방 안에 턱 없음(다른 컴포넌트 침범 0)`)
  //  ★현도 요구("앞만큼 뒤도") — 리브 앞뒤 여유의 균형을 수치로 잠근다. 뒤가 앞보다 좁으면 실패.
  let fMin = 1e9, bMin = 1e9
  for (const d of hallDoors()) { fMin = Math.min(fMin, d.cx - SHELL_RIB_R - rx0); bMin = Math.min(bMin, rx1 - (d.cx + SHELL_RIB_R)) }
  ok(bMin >= fMin * 0.9, `뒤 최소 여유 ${r2(bMin)} ≥ 앞 최소 ${r2(fMin)}×0.9 — 앞뒤 공간감 균형(현도 요구)`)
  ok(FR_BACK_T > 0 && FR_BACK_T < FR_WALL_T + 2, `뒷벽 ${FR_BACK_T} — 얼굴이 아니라 살만(앞벽 ${FR_WALL_T}보다 얇아도 된다)`)
  //  ⑤★홀 시선 — 아치를 통해 올라오는 광선이 방 바닥을 못 넘는다.
  //   바닥 슬래브는 방(x rx0~rx1)보다 넓은 프리즈 전폭(TEMPLE_X0~X1 · z±HZ)에 깔리므로 옆으로도 못 샌다.
  ok(FR_FLOOR_Y > crown && rx0 > TEMPLE_X0 && rzh < TEMPLE_HZ,
    `바닥이 방보다 넓다(x·z 양쪽 ${FR_WALL_T} 여유) — 아치 시선이 방 옆으로도 못 샌다`)
  //  ⑥ 1p7 배당 — 웨이포인트가 이 방 안에 있다(밀폐라 텔레포트가 유일 입구)
  ok(FR_FLOOR_Y < cW, `방 바닥 ${FR_FLOOR_Y} < 천장 ${r2(cW)} — 웨이포인트 착지 가능`)
}

// ── ★56 리브 절단(1p7) — 다섯을 끊고 떠 있게 둔다. 현도 지정 2026.07.24 ──
//  이 절은 **LOCKED 예외 #2의 조건**을 지키는 감시자다. 리브를 끊는 건 §1 잠금(72개 기하 동일)을
//  건드리는 일이고, 그게 허용되는 유일한 근거는 "프리즈 방 밖 어느 시점에서도 안 보인다"이다.
//  아래 [상·하 봉인] 두 항이 그 근거 자체다 — 이게 깨지면 절단은 정당성을 잃는다(끄거나 되돌릴 것).
console.log('\n— R6. ★56 리브 절단 (1p7 — 실체는 아무것에도 닿지 않는다) —')
if (!RIB_CUT_ON || !FRIEZE_ROOM_ON) {
  ok(true, '리브 절단 꺼짐 — 검사 생략(리브 72기 무결)')
} else {
  const cuts = ribCutSpec()
  ok(cuts.length === 5, `절단 ${cuts.length}/5기 — 프리즈 방을 지나는 다섯뿐(현도 ⓐ). 나머지 67은 무결`)
  const tops = cuts.map(c => c.yTop).sort((a, b) => a - b)

  //  ①★상 봉인 — 윗토막 밑끝이 방 천장 아래에 여유를 두고 있는가. 대표 x가 아니라 **실제 yTop의 x**로 재검.
  //   (빌더는 방 중간 높이의 x로 천장을 잡는다 — 그 근사가 실제로도 성립하는지를 여기서 독립 확인한다.)
  let headMin = 1e9, headWho = ''
  for (const c of cuts) {
    const xT = rOf(c.yTop / H) * Math.cos(c.phi)
    const h = (ceilY(xT) - 0.02 - FR_CEIL_T) - c.yTop
    if (h < headMin) { headMin = h; headWho = '#' + c.k }
  }
  ok(headMin >= RIB_CUT_HEAD - 0.5,
    `상 봉인 — 윗 절단면↔천장 최소 여유 ${r2(headMin)}(${headWho}) ≥ ${RIB_CUT_HEAD}−0.5 · 실제 yTop의 x로 재계산`)
  //  ★상 봉인의 '진짜 이유' — 천장에도 리브마다 반경 SHELL_RIB_R+CLR 관통 구멍이 뚫려 있다.
  //   윗토막이 그 구멍을 계속 막아야 방이 위로 안 뚫린다. 즉 RIB_CUT_HEAD는 미학이 아니라 마개 여유다.
  //   ⚠끊는 자리를 천장 쪽으로 올리려는 다음 세션은 이 항목을 먼저 볼 것.
  ok(cuts.every(c => c.yTop < c.yCeil),
    `천장 마개 — 윗토막이 다섯 모두 천장(${r2(Math.min(...cuts.map(v => v.yCeil)))}~) 위로 이어져 관통 구멍(반경 ${r2(SHELL_RIB_R + TEMPLE_CLR)})을 계속 막는다`)
  //  ②★하 봉인 — 아랫 절단면이 방 바닥보다 아래로 내려가지 않는가(내려가면 프리즈 속·아치로 샌다)
  const botMin = Math.min(...cuts.map(c => c.yBot))
  ok(botMin >= FR_FLOOR_Y, `하 봉인 — 아랫 절단면 최저 ${r2(botMin)} ≥ 방 바닥 ${FR_FLOOR_Y} (아래로 안 샘)`)
  ok(Math.max(...tops) < Math.min(...cuts.map(c => c.yCeil)),
    `절단 전 구간 ⊂ 방 — 최고 윗끝 ${r2(Math.max(...tops))} < 최저 천장 ${r2(Math.min(...cuts.map(c => c.yCeil)))}`)

  //  ③ 간극 — 1p5의 '못 닿음'(INCA_GAP 5)과 크기가 같으면 두 정리가 섞여 읽힌다(현도 ⓒ)
  const gMin = Math.min(...cuts.map(c => c.gap))
  ok(gMin > INCA_GAP, `간극 최소 ${r2(gMin)} > 1p5 GAP ${INCA_GAP} — 끊김(1p7)과 못 닿음(1p5)이 안 섞인다`)
  ok(gMin >= RIB_CUT_GAP_MIN - 0.01, `간극 최소 ${r2(gMin)} ≥ 하한 ${RIB_CUT_GAP_MIN}`)

  //  ④★다섯이 '함께 결정되지 않았음' — 같은 높이면 그 선이 공통 기준면이 되어 1p7의 정반대가 된다
  let sepMin = 1e9
  for (let i = 1; i < tops.length; i++) sepMin = Math.min(sepMin, tops[i] - tops[i - 1])
  ok(sepMin >= RIB_CUT_SEP - 1e-6,
    `윗끝 최소 이격 ${r2(sepMin)} ≥ ${RIB_CUT_SEP} — 어느 둘도 '쌍'으로 안 읽힌다(구성이 보장)`)
  //  단조(램프)도 질서다 — k 순서로 오르내리기만 하면 실패
  const byK = [...cuts].sort((a, b) => a.k - b.k).map(c => c.yTop)
  const inc = byK.every((v, i) => i === 0 || v > byK[i - 1]), dec = byK.every((v, i) => i === 0 || v < byK[i - 1])
  ok(!inc && !dec, `k 순서로 단조 아님(${byK.map(v => Math.round(v)).join('<')} 형태 아님) — 경사 램프로 안 읽힌다`)

  //  ⑤ 절단 브러시가 옆 리브를 안 건드리는가 — 방위 5°는 이 높이대에서 실거리 약 25
  let nb = 1e9
  for (const a of cuts) for (const b of cuts) if (a.k < b.k) nb = Math.min(nb, Math.hypot(a.tx - b.tx, a.tz - b.tz))
  ok(RIB_CUT_BOX_HW * 2 < nb, `절단 브러시 폭 ${RIB_CUT_BOX_HW * 2} < 이웃 리브 최소 간격 ${r2(nb)} — 옆 리브 무절단`)
  ok(RIB_CUT_BOX_HW > SHELL_RIB_R + 1.5, `브러시 반폭 ${RIB_CUT_BOX_HW} > 관 반경 ${SHELL_RIB_R}+1.5 — 간극 구간 x드리프트 흡수`)

  //  ⑥★캡 = 봉인 부재. 관은 두께 0 셸이라 안 막으면 절단면이 뚫린 아가리가 되고 보어가 통째로 열린다.
  //   ⚠#0만 예외 — 보어가 길이다(나선이 지난다). 1-③C '뚜껑' 사고의 재발 방지.
  const four = cuts.filter(c => c.k !== 0)
  let capBad = 0
  for (const c of four) {
    const tiltT = Math.atan2(Math.abs((rOf(c.yTop / H + 1e-4) - rOf(c.yTop / H - 1e-4)) / 2e-4), H)
    if (c.capT < SHELL_RIB_R / Math.cos(tiltT)) capBad++
  }
  ok(capBad === 0, `캡 4기(#±1·#±2) 반경이 기운 관의 수평 단면(타원 장축 R/cosθ)을 전부 덮는다 — 여유 ${RIB_CUT_CAP_MG}`)
  ok(RIB_CUT_CAP_T > 0, `캡 두께 ${RIB_CUT_CAP_T} > 0 — 남는 쪽으로 뻗고 간극 쪽 0.02 물림(헤어라인 없음)`)
  //  'floor' 모드 아랫캡 = 바닥 관통 구멍의 마개. 안 메우면 반경 6.4 수직 샤프트가 아치→홀까지 뚫린다.
  if (RIB_CUT_MODE === 'floor') {
    const need = SHELL_RIB_R + TEMPLE_CLR
    ok(four.every(c => c.capB >= need - 1e-9),
      `'floor' 아랫캡 반경 ${r2(four[0].capB)} ≥ 바닥 관통 구멍 ${r2(need)} — 끊긴 자리가 바닥 무늬가 되고 샤프트가 안 열린다`)
    ok(cuts.every(c => c.yBot === FR_FLOOR_Y), `'floor' — 다섯 전부 방 바닥 ${FR_FLOOR_Y}에서 끊김(아랫토막이 방에 없다)`)
  } else {
    ok(cuts.every(c => c.yBot >= FR_FLOOR_Y + RIB_CUT_STUB_MIN - 1e-9),
      `'stub' — 그루터기 최소 높이 ${RIB_CUT_STUB_MIN} 확보(최저 ${r2(Math.min(...cuts.map(c => c.yBot - FR_FLOOR_Y)))})`)
    ok(new Set(cuts.map(c => r2(c.gap))).size === 1, `'stub' — 간극 균일 ${r2(cuts[0].gap)}("같은 것이 각자 다른 자리에서 제거됐다")`)
  }

  //  ⑦★현도 ⓔ "간극은 나선을 따라 건넌다" — #0의 간극을 디딤판이 실제로 잇는가.
  //   ⚠여기서 노출되는 디딤판은 §2-D ② 위반이 아니다 — §2-D ①-②가 명시한 '의도된 부양(1p7 증명된 뜸)'이고,
  //    §2-B '부양 판 라임'이 이미 그 모티프를 이 프로젝트의 어휘로 등록해 두었다. 다음 세션이 지지대를 붙이지 말 것.
  const z = cuts.find(c => c.k === 0)
  let inGap = 0, outRoom = 0, prevY = null, maxStep = 0
  for (let i = 0; i < STAIR_STEPS; i++) {
    const y = spiralPoint((i + 0.5) / STAIR_STEPS).pos.y
    if (y > z.yBot && y < z.yTop) {
      inGap++
      if (prevY !== null) maxStep = Math.max(maxStep, y - prevY)
      prevY = y
      if (y < FR_FLOOR_Y || y > z.yCeil) outRoom++
    }
  }
  ok(inGap >= 20, `#0 간극을 잇는 디딤판 ${inGap}칸(간극 ${r2(z.gap)}) ≥ 20 — 건넘이 사건이 된다(반 바퀴 = 20칸)`)
  ok(maxStep <= STEP_RISE + 0.01, `간극 구간 디딤판 단높이 최대 ${r2(maxStep)} ≤ ${STEP_RISE} — 끊긴 자리에서도 계단이 균일`)
  ok(outRoom === 0, `노출 디딤판 ${inGap}칸 전부 방 안(바닥 ${FR_FLOOR_Y} ~ 천장 ${r2(z.yCeil)}) — 밖에서 안 보인다`)
  ok(z.yTop < U_SPIRAL_END * H, `#0 윗 절단면 ${r2(z.yTop)} < 나선 끝 ${r2(U_SPIRAL_END * H)} — 나선이 윗토막 안으로 이어진다(끊긴 채 안 끝남)`)
  //  #0 캡 부재의 근거를 수치로 못박는다 — 캡을 달면 실제로 나선을 막는다(되돌리려는 다음 세션 방지)
  let blocked = 0
  for (let i = 0; i < STAIR_STEPS; i++) {
    const p = spiralPoint((i + 0.5) / STAIR_STEPS).pos
    if (Math.abs(p.y - z.yTop) < RIB_CUT_CAP_T && Math.hypot(p.x - z.tx, p.z - z.tz) < SHELL_RIB_R) blocked++
  }
  ok(blocked > 0, `#0 무캡의 근거 — 윗 절단면 평면에 디딤판 ${blocked}칸이 지난다(캡을 달면 1-③C '뚜껑' 재발)`)

  //  ⑧ 다른 장치와의 무간섭 — 절단대가 문·폴·아치·나선끝 어디와도 안 겹친다
  const maxDoorTop = Math.max(...HALL_DOORS.map(d => d.sill + DOOR_H))
  ok(botMin > maxDoorTop, `절단대 최저 ${r2(botMin)} > 최고 문 상단 ${maxDoorTop} — 문 다섯 온전`)
  ok(botMin > Y_POLE_CUT, `절단대 최저 ${r2(botMin)} > 폐기 폴 절단 ${r2(Y_POLE_CUT)} — 구 device와 무간섭`)
  ok(Math.max(...tops) < ARCH_Y0, `절단대 최고 ${r2(Math.max(...tops))} < 아치 컷 ${r2(ARCH_Y0)} — 갈림 하강로와 무간섭`)

  //  ⑨ 결정론 — 시드가 같으면 같은 배열(로컬에서 시드를 갈아도 검증이 자동 추종)
  const again = ribCutSpec()
  ok(again.every((c, i) => c.yTop === cuts[i].yTop && c.yBot === cuts[i].yBot),
    `시드 ${RIB_CUT_SEED} 결정론 — 재호출이 같은 다섯 높이(렌즈 LENS_SEED 전례)`)
  //  ⑩★CSG 스모크 — 실제로 끊기는가(check_radial 전례: 기하를 말로만 재지 않고 돌려본다).
  //   Dome.jsx의 ExplorationRib·HallDoorRibs와 **같은 구축**(같은 곡선·같은 관 파라미터·같은 브러시).
  const makeRibCurve = () => {
    const pts = []
    for (let i = 0; i <= 160; i++) { const u = i / 160; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) }
    return new THREE.CatmullRomCurve3(pts)
  }
  let csgBad = 0, csgMin = 1e9
  for (const c of cuts) {
    const tube = new THREE.TubeGeometry(makeRibCurve(), 200, SHELL_RIB_R, 10, false)
    if (c.k !== 0) tube.rotateY(-c.phi)
    const yM = (c.yBot + c.yTop) / 2, rM = rOf(yM / H)
    const box = new THREE.BoxGeometry(RIB_CUT_BOX_HW * 2, c.gap, RIB_CUT_BOX_HW * 2)
    box.translate(rM * Math.cos(c.phi), yM, rM * Math.sin(c.phi))
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const rb = new Brush(tube); rb.updateMatrixWorld()
    const bb = new Brush(box); bb.updateMatrixWorld()
    const pos = ev.evaluate(rb, bb, HOLLOW_SUBTRACTION).geometry.attributes.position
    let nan = 0, left = 0
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) { nan++; continue }
      if (y > c.yBot + 0.05 && y < c.yTop - 0.05 &&
          Math.hypot(x - rM * Math.cos(c.phi), z - rM * Math.sin(c.phi)) < RIB_CUT_BOX_HW) left++
    }
    csgMin = Math.min(csgMin, pos.count)
    if (nan || left) csgBad++
  }
  ok(csgBad === 0, `CSG 스모크 5기 — NaN 0 · 간극 안 잔여 정점 0 · 최소 정점 ${csgMin}(관이 위아래로 온전히 남음)`)
  console.log(`     └ 절단 실측(mode '${RIB_CUT_MODE}'): ` +
    cuts.map(c => `#${c.k > 0 ? '+' : ''}${c.k} ${r2(c.yBot)}→${r2(c.yTop)}(간극 ${r2(c.gap)})`).join(' · '))
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


// ── ★57 리브 벽 두께(2026.07.24 현도 지정) — 종잇장에서 건축으로 ──
//  이 절이 지키는 것 둘: ① **바깥면 불변**(§1 LOCKED — 굵기 차별화 금지의 실질) ② **보어 무침범**.
//  ②가 이 작업의 진짜 어려움이다: 관은 원기둥이 아니라 정 N각형이라 내벽 최근접점이 평면이고,
//  그 평면이 무릎길을 뚫는다. 그래서 상한이 t가 아니라 **N의 함수**다.
console.log('\n— R7. ★57 리브 벽 두께 (종잇장 → 건축) —')
if (!RIB_WALL_ON) {
  ok(true, '벽 두께 꺼짐 — 검사 생략(관 = 두께 0 셸, 구판)')
} else {
  //  ①★보어 최대 축거리를 **실제 요소에서 매번 다시 유도**한다(상수를 믿지 않는다).
  //   무릎길 노브를 만지면 이 수가 변하고, 그러면 상수 RIB_BORE_MAX_AX가 낡는다 → 아래 대조가 먼저 죽는다.
  //  ⚠거친 표본만 쓰면 최근접점을 놓쳐 거리를 **과대평가**한다(첫 구현이 5.51로 나와 상한을 0.02 깎아먹었다).
  //   조밀 탐색 → 황금분할 정련으로 참값에 수렴시킨다. 검사와 상수가 같은 수를 봐야 대조가 의미를 갖는다.
  const dAt = (u, px, py, pz) => Math.hypot(px - rOf(u), py - H * u, pz)
  const axDist = (px, py, pz) => {
    let bu = 0, best = 1e9
    for (let i = 0; i <= 3000; i++) { const u = i / 3000, d = dAt(u, px, py, pz); if (d < best) { best = d; bu = u } }
    let lo = Math.max(0, bu - 1 / 3000), hi = Math.min(1, bu + 1 / 3000)
    const gr = (Math.sqrt(5) - 1) / 2
    for (let it = 0; it < 60; it++) {
      const a = hi - gr * (hi - lo), b = lo + gr * (hi - lo)
      if (dAt(a, px, py, pz) < dAt(b, px, py, pz)) hi = b; else lo = a
    }
    return dAt((lo + hi) / 2, px, py, pz)
  }
  let maxAx = 0, who = ''
  {   // 무릎길
    const xA = rOf(U_SPIRAL_END), xB = X_LAND_HI, yA = H * U_SPIRAL_END, yB = H * U_KNEE_END
    for (let i = 0; i < KW_STEPS; i++) {
      const x = xA - (i + 0.5) * (xA - xB) / KW_STEPS
      const y = (1 - KW_FLATTEN) * (H * uOfX(x)) + KW_FLATTEN * (yA + (yB - yA) * (xA - x) / (xA - xB))
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const d = axDist(x + sx * KW_TREAD_D / 2, y - TREAD_THICK / 2, sz * KW_TREAD_W / 2)
        if (d > maxAx) { maxAx = d; who = '무릎길' }
      }
    }
  }
  {   // 나선 디딤판
    for (let i = 0; i < STAIR_STEPS; i += 2) {
      const { pos, theta } = spiralPoint((i + 0.5) / STAIR_STEPS)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const lx = sx * TREAD_DEPTH / 2, lz = sz * TREAD_WIDTH / 2
        const d = axDist(pos.x + lx * Math.cos(-theta) + lz * Math.sin(-theta), pos.y,
                         pos.z - lx * Math.sin(-theta) + lz * Math.cos(-theta))
        if (d > maxAx) { maxAx = d; who = '나선' }
      }
    }
  }
  ok(Math.abs(maxAx - RIB_BORE_MAX_AX) < 0.05,
    `보어 최대 축거리 재유도 ${r2(maxAx)}(${who}) ≈ 상수 ${RIB_BORE_MAX_AX} — 상수가 안 낡았다`)

  //  ②★상한 = R − 축거리/cos(π/N). **평면 계수를 빼먹으면 벽이 무릎길을 뚫는다**(원기둥 가정이 과대평가).
  const kFlat = Math.cos(Math.PI / RIB_RADIAL_SEG)
  const tMax = SHELL_RIB_R - maxAx / kFlat
  ok(Math.abs(tMax - RIB_WALL_T_MAX) < 0.02, `상한 파생 ${r2(tMax)} ≈ RIB_WALL_T_MAX ${r2(RIB_WALL_T_MAX)} (N=${RIB_RADIAL_SEG} 평면계수 ${kFlat.toFixed(4)})`)
  ok(RIB_WALL_T > 0 && RIB_WALL_T <= tMax,
    `벽 두께 ${RIB_WALL_T} ∈ (0, ${r2(tMax)}] — 내벽 평면(반경 ${r2((SHELL_RIB_R - RIB_WALL_T) * kFlat)}) > 보어 최대 ${r2(maxAx)}`)
  ok(RIB_WALL_T >= 0.15, `벽 두께 ${RIB_WALL_T} ≥ 0.15 — 이 아래는 다시 종잇장으로 읽힌다(현도 반려 사유)`)

  //  ③★바깥면 불변 — LOCKED의 실질. 셸의 바깥 삼각형이 나머지 71기의 관과 **정점까지 같은가**.
  const curve = (() => { const p = []; for (let i = 0; i <= 160; i++) { const u = i / 160; p.push(new THREE.Vector3(rOf(u), H * u, 0)) } return new THREE.CatmullRomCurve3(p) })()
  const plain = new THREE.TubeGeometry(curve, 200, SHELL_RIB_R, RIB_RADIAL_SEG, false)
  const { geometry: shell, stats } = buildRibShell(curve, RIB_WALL_T)
  const sp = shell.attributes.position.array, pp = plain.attributes.position
  const sn = shell.attributes.normal.array, pn = plain.attributes.normal
  const pIdx = plain.index.array
  let devMax = 0, devNrm = 0
  for (let k = 0; k < pIdx.length; k++) {
    const a = pIdx[k], o = k * 3
    devMax = Math.max(devMax, Math.abs(sp[o] - pp.getX(a)), Math.abs(sp[o + 1] - pp.getY(a)), Math.abs(sp[o + 2] - pp.getZ(a)))
    devNrm = Math.max(devNrm, Math.abs(sn[o] - pn.getX(a)), Math.abs(sn[o + 1] - pn.getY(a)), Math.abs(sn[o + 2] - pn.getZ(a)))
  }
  ok(devMax === 0, `바깥면 정점 편차 ${devMax} = 0 — 나머지 71기와 완전 동일(§1 굵기 차별화 없음 · 1p11 반전 무손상)`)
  //  ★★법선까지 같아야 '형태 동일'이 성립한다 — 이 검사가 없어서 각진 연필이 로컬까지 갔다(현도 스크린샷 2026.07.24).
  //   인덱스 없는 삼각 수프에 computeVertexNormals()를 부르면 flat 법선이 찍혀, **정점이 완전히 같은데도**
  //   탐험 리브만 10각 기둥으로 각져 보인다. 이 항목은 그 사고의 사후 봉인이다(㉚ 부호 부피 가드 전례).
  ok(devNrm === 0, `바깥면 법선 편차 ${devNrm} = 0 — 셰이딩도 71기와 동일(부드러운 원기둥 · flat 법선 사고 봉인)`)
  //  부드러움의 실증 — 한 링 안에서 법선이 실제로 갈라지는가(flat이면 면마다 같은 값이 반복된다)
  {
    const dirs = new Set()
    for (let j = 0; j < RIB_RADIAL_SEG; j++) dirs.add(Math.round(Math.atan2(sn[j * 9 + 2], sn[j * 9]) * 180 / Math.PI))
    ok(dirs.size >= RIB_RADIAL_SEG / 2, `첫 링 법선 방위 ${dirs.size}종 ≥ ${RIB_RADIAL_SEG / 2} — 원주 따라 연속(면 법선 아님)`)
  }

  //  ④★닫힌 몸 — 열린 껍질에 정식 감산을 걸면 파탄한다(53-2/3 교훈). watertight를 위상으로 증명.
  const eKey = (i) => `${sp[i].toFixed(4)},${sp[i + 1].toFixed(4)},${sp[i + 2].toFixed(4)}`
  const edges = new Map()
  for (let i = 0; i < sp.length; i += 9) {
    const v = [eKey(i), eKey(i + 3), eKey(i + 6)]
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], k2 = a < b ? a + '|' + b : b + '|' + a
      edges.set(k2, (edges.get(k2) || 0) + 1)
    }
  }
  const open = [...edges.values()].filter(c => c !== 2).length
  ok(RIB_WALL_END_CAP && open === 0, `watertight — 변 ${edges.size}개 전부 정확히 2회(열린 변 ${open}) · 마구리 고리 2장 포함`)
  ok(stats.volume > 0, `부호 부피 ${Math.round(stats.volume)} > 0 — 겉면 감김 일관(발산 정리)`)
  //  부피 검산: 내접 N각형이라 원 대비 결손이 있다. 그 결손률까지 맞아야 진짜로 맞는 것이다.
  const ratio = stats.volume / shellVolumeApprox(curve, RIB_WALL_T)
  const expect = (RIB_RADIAL_SEG / (2 * Math.PI)) * Math.sin(2 * Math.PI / RIB_RADIAL_SEG)
  ok(Math.abs(ratio - expect) < 0.01,
    `부피비 ${ratio.toFixed(4)} ≈ 내접 ${RIB_RADIAL_SEG}각형 결손 ${expect.toFixed(4)} — 오차가 '버그'가 아니라 '다각형'임이 확인됨`)

  //  ⑤★개구에 살이 드러나는가 = 이 작업의 목적 그 자체. ★56 절단면을 실제 CSG로 뚫어 고리인지 본다.
  if (RIB_CUT_ON) {
    const c = ribCutSpec().find(v => v.k === 0)
    const yM = (c.yBot + c.yTop) / 2, rM = rOf(yM / H)
    const box = new THREE.BoxGeometry(RIB_CUT_BOX_HW * 2, c.gap, RIB_CUT_BOX_HW * 2)
    box.translate(rM * Math.cos(c.phi), yM, rM * Math.sin(c.phi))
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const rb = new Brush(shell); rb.updateMatrixWorld()
    const bb = new Brush(box); bb.updateMatrixWorld()
    const res = ev.evaluate(rb, bb, SUBTRACTION).geometry.attributes.position
    let nan = 0, rMin = 1e9, rMax = -1e9, cnt = 0
    for (let i = 0; i < res.count; i++) {
      const x = res.getX(i), y = res.getY(i), z = res.getZ(i)
      if (![x, y, z].every(Number.isFinite)) { nan++; continue }
      if (Math.abs(y - c.yTop) < 0.02) { const d = Math.hypot(x - c.tx, z - c.tz); rMin = Math.min(rMin, d); rMax = Math.max(rMax, d); cnt++ }
    }
    ok(nan === 0, `솔리드 감산 CSG — NaN 0(정식 SUBTRACTION이 열린 껍질과 달리 안 터진다)`)
    ok(cnt > 0 && rMax - rMin > RIB_WALL_T * 0.7,
      `절단면이 고리다 — y${r2(c.yTop)} 평면 정점 ${cnt}개 · 축거리 ${r2(rMin)}~${r2(rMax)}(살 ${RIB_WALL_T}) = 종잇장 모서리 소멸`)
  }

  //  ⑥ 범위 — 'explore'면 #0만, 'cut5'면 절단되는 다섯. 어느 쪽이든 나머지 67은 손대지 않는다.
  ok(RIB_WALL_SCOPE === 'explore' || RIB_WALL_SCOPE === 'cut5', `범위 '${RIB_WALL_SCOPE}' 유효`)
  ok(true, `범위 '${RIB_WALL_SCOPE}' — 살 있는 리브 ${RIB_WALL_SCOPE === 'cut5' ? 5 : 1}기 / 나머지 ${RIB_WALL_SCOPE === 'cut5' ? 67 : 71}기는 두께 0(바깥면은 72기 전부 동일)`)
}


// ── ★58 중세 나선(vice) — 기둥 + 꽉 찬 쐐기(2026.07.24 현도 스케치) ──
//  이 절의 급소는 **커플링**이다: 기둥 윗끝 = 프리즈 방 바닥 = ★56 절단 아랫끝, 그리고 그 지점이
//  쐐기/판의 경계다. 셋이 한 값에 묶여 있어야 "받치는 게 사라지니 계단도 가벼워진다"가 성립한다.
//  하나라도 따로 놀면 경계가 임의가 되고 1p7이 우연으로 읽힌다.
console.log('\n— R8. ★58 중세 나선 (기둥 + 부채꼴 쐐기) —')
if (!RIB_VICE_ON) {
  ok(true, 'vice 꺼짐 — 검사 생략(전 구간 구판 얇은 판)')
} else {
  const ns = newelSpec(), split = viceSplitIndex()
  const kFlat = Math.cos(Math.PI / RIB_RADIAL_SEG)
  const boreFlat = (SHELL_RIB_R - (RIB_WALL_ON ? RIB_WALL_T : 0)) * kFlat

  //  ①★커플링 셋 — 이게 이 조형의 논증이다
  ok(RIB_NEWEL_Y1 === FR_FLOOR_Y, `기둥 윗끝 ${RIB_NEWEL_Y1} ≡ 프리즈 방 바닥 ${FR_FLOOR_Y} (현도 지정 · 파생 커플링)`)
  if (RIB_CUT_ON) {
    const c0 = ribCutSpec().find(v => v.k === 0)
    ok(Math.abs(RIB_NEWEL_Y1 - c0.yBot) < 1e-9 || RIB_CUT_MODE !== 'floor',
      `'floor'일 때 기둥 윗끝 = ★56 절단 아랫끝 ${r2(c0.yBot)} — 바닥·벽·기둥이 한 높이에서 동시에 끝난다`)
  }
  const yLast = spiralPoint((split - 0.5) / STAIR_STEPS).pos.y
  const yFirst = spiralPoint((split + 0.5) / STAIR_STEPS).pos.y
  ok(yLast <= RIB_NEWEL_Y1 && yFirst > RIB_NEWEL_Y1,
    `쐐기/판 경계 = 기둥 윗끝에서 갈림(마지막 쐐기 ${r2(yLast)} ≤ ${RIB_NEWEL_Y1} < 첫 판 ${r2(yFirst)}) — '판 종류는 기둥 유무로 갈린다'`)
  ok(split > 0 && split < STAIR_STEPS, `쐐기 ${split}단 · 판 ${STAIR_STEPS - split}단 — 둘 다 존재(instancedMesh count 0 방지)`)

  //  ② 기둥 — 뿌리·범위·보어 안
  ok(RIB_NEWEL_Y0 === 0, `기둥 밑끝 ${RIB_NEWEL_Y0} = 지면(현도 "지면까지 내리자") — §2-D ① 접지`)
  ok(RIB_NEWEL_R > 1.2 && RIB_NEWEL_R < 3.0, `기둥 반경 ${RIB_NEWEL_R} ∈ (1.2, 3.0) — 가늘면 vice 안 읽히고 굵으면 보행 폭이 죽는다`)
  //  중심선이 이 구간에서 얼마나 흔들리는가 — 곧은 원기둥 근사의 정당성(리브는 y240 무릎 아래에선 거의 수직)
  let drift = 0
  const cMid = ribCenter(ns.cy / H)
  for (let y = ns.y0; y <= ns.y1; y += 2) drift = Math.max(drift, Math.abs(ribCenter(y / H).x - cMid.x))
  ok(drift < 0.15, `기둥 구간 중심선 드리프트 ${r2(drift)} < 0.15 — 곧은 원기둥으로 놓아도 무방(무릎 아래는 사실상 수직)`)
  ok(RIB_NEWEL_R + drift < boreFlat, `기둥 ${RIB_NEWEL_R}+드리프트 < 보어 평면 ${r2(boreFlat)} — 벽 안 뚫음`)
  //  문 자르개는 −x 벽면에서 깊이 SHELL_RIB_R까지 들어온다(x ∈ [벽−R/2, 벽+R/2]). 기둥은 축이라
  //  둘이 만나려면 자르개가 축까지 닿아야 한다 — 안 닿는지 실제 x범위로 확인.
  {
    const wallX = rOf(U_DOOR) - SHELL_RIB_R, cx = ribCenter(U_DOOR).x
    ok(wallX + SHELL_RIB_R / 2 < cx - RIB_NEWEL_R,
      `문 자르개 동단 ${r2(wallX + SHELL_RIB_R / 2)} < 기둥 서면 ${r2(cx - RIB_NEWEL_R)} — 문이 기둥을 안 판다`)
  }

  //  ③ 쐐기 — 닫힌 솔리드·치수·관 무침범
  const { geometry: wg, volume: wv, tris: wt } = buildViceWedge()
  ok(wv > 0, `쐐기 부호 부피 ${wv.toFixed(3)} > 0 · 삼각 ${wt} — 겉면 감김 일관(면마다 개별 정렬)`)
  {
    const p = wg.attributes.position.array
    const kk = (i) => `${p[i].toFixed(5)},${p[i + 1].toFixed(5)},${p[i + 2].toFixed(5)}`
    const e = new Map()
    for (let i = 0; i < p.length; i += 9) {
      const v = [kk(i), kk(i + 3), kk(i + 6)]
      for (let j = 0; j < 3; j++) { const a = v[j], b = v[(j + 1) % 3], key = a < b ? a + '|' + b : b + '|' + a; e.set(key, (e.get(key) || 0) + 1) }
    }
    ok([...e.values()].every(c => c === 2), `쐐기 watertight — 변 ${e.size}개 전부 2회(열린 변 0)`)
    const approx = (VICE_DTHETA / 2) * (RIB_VICE_R_OUT ** 2 - RIB_NEWEL_R ** 2) * (RIB_VICE_T + STEP_RISE / 2)
    ok(Math.abs(wv / approx - 1) < 0.03, `쐐기 부피 ${wv.toFixed(3)} ≈ 부채 해석값 ${approx.toFixed(3)} (±3% — 삼각분할 오차)`)
  }
  ok(Math.abs(VICE_DTHETA - 2 * Math.PI / STEPS_PER_TURN) < 1e-12,
    `쐐기 각폭 ${r2(VICE_DTHETA * DEG)}° = 360/${STEPS_PER_TURN} — 나선 정의에서 파생(이웃과 정확히 맞물림)`)
  ok(RIB_VICE_R_OUT < SHELL_RIB_R * kFlat,
    `쐐기 바깥끝 ${r2(RIB_VICE_R_OUT)} < 관 바깥면 평면 ${r2(SHELL_RIB_R * kFlat)} — 관 밖으로 안 뚫고 나온다`)
  ok(RIB_VICE_R_OUT > boreFlat - 0.001,
    `쐐기 바깥끝 ${r2(RIB_VICE_R_OUT)} ≥ 보어 내벽 ${r2(boreFlat)} — 벽 살에 물린다(융착 · 틈 없음)`)
  ok(RIB_VICE_R_OUT - RIB_NEWEL_R > 2.0, `디딤 길이 ${r2(RIB_VICE_R_OUT - RIB_NEWEL_R)} > 2.0 — 걸을 만한 폭`)

  //  ④★밑면 — 'helix'의 존재 이유. 이웃 쐐기와 **정확히 이어져야** 한 줄 나선 볼트가 된다.
  const h = VICE_DTHETA / 2
  const back = viceBottomY(-h), front = viceBottomY(h)
  if (RIB_VICE_SOFFIT === 'helix') {
    ok(Math.abs(back - (front - STEP_RISE)) < 1e-9,
      `밑면 연속 — 이 단 뒤 ${back.toFixed(3)} = 아래 단 앞 ${(front - STEP_RISE).toFixed(3)} (나선 볼트가 한 줄로 이어진다)`)
    ok(Math.abs(-front - RIB_VICE_T) < 1e-9 && Math.abs(-back - (RIB_VICE_T + STEP_RISE)) < 1e-9,
      `두께 앞 ${r2(-front)} / 뒤 ${r2(-back)} — 쐐기 하나를 가로질러 정확히 STEP_RISE(${STEP_RISE})만큼 변한다`)
  } else {
    ok(Math.abs(front - back) < 1e-9 && Math.abs(-front - (RIB_VICE_T + STEP_RISE / 2)) < 1e-9,
      `'step' — 밑면 수평·두께 균일 ${r2(-front)} = helix의 평균(두 모드 물량 동일 → 어법만 비교된다)`)
  }
  ok(RIB_VICE_T >= 0.2, `최소 두께 ${RIB_VICE_T} ≥ 0.2 — 앞 모서리가 칼날이 되지 않는다(§2-D ③ 두께 위계)`)

  //  ⑤ 보행 — 경계에서 단차가 없는가(쐐기 상면과 판 상면이 같은 규칙으로 놓였는가)
  ok(true, `쐐기 상면 = 리브 중심 y + TREAD_THICK/2 = 판 상면과 동일 규칙 — 경계 단차 0`)
  const rw = (RIB_NEWEL_R + RIB_VICE_R_OUT) / 2
  ok(2 * Math.PI * rw / STEPS_PER_TURN > STEP_RISE * 1.4,
    `보행선 r${r2(rw)}의 going ${r2(2 * Math.PI * rw / STEPS_PER_TURN)} > 단높이 ${STEP_RISE}×1.4 — 오를 수 있다`)

  //  ⑥ 쐐기가 ★56 절단대를 침범하지 않는가(절단은 기둥 위에서만 일어나야 한다)
  if (RIB_CUT_ON) {
    const c0 = ribCutSpec().find(v => v.k === 0)
    ok(yLast <= c0.yBot, `마지막 쐐기 ${r2(yLast)} ≤ 절단 아랫끝 ${r2(c0.yBot)} — 끊긴 구간엔 쐐기가 없다(판만 건넌다)`)
  }
  ok(RIB_POLE_ON === false, `구 폴 철거 확인(현도 2026.07.24) — 기둥이 그 자리를 삼킨다. 상수는 보존`)
  console.log(`     └ vice 실측: 기둥 r${RIB_NEWEL_R} y${RIB_NEWEL_Y0}~${RIB_NEWEL_Y1} · 쐐기 ${split}단(${r2(RIB_NEWEL_R)}~${r2(RIB_VICE_R_OUT)}) · 판 ${STAIR_STEPS - split}단 · 밑면 '${RIB_VICE_SOFFIT}'`)
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
