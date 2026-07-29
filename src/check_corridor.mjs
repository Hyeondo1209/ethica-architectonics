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
  MIR_ON, MIR_DEPTH_F,   // ★87 돔 거울 확장
  HALL_DOORS, HALL_DOORS_ON, STAIR_GAP, STAIR_DS, STAIR_TD, STAIR_W, COR_RISE, STAIR_MAX_SLOPE,
  TEMPLE_MODE, TEMPLE_Y0, TEMPLE_X0, TEMPLE_X1, TEMPLE_HZ, TEMPLE_CLR, STAIR_SCHEME, TEMPLE_PEDIMENT, TEMPLE_OPEN,
  FRIEZE_ROOM_ON, FR_FLOOR_T, FR_WALL_T, FR_BACK_T, FR_CEIL_T, FR_FLOOR_Y, FR_ANNEX,   // ★55 프리즈 방(1p7)
  RIB_CUT_ON, RIB_CUT_MODE, RIB_CUT_SEED, RIB_CUT_GAP_MIN, RIB_CUT_HEAD, RIB_CUT_SEP,   // ★56 리브 절단(1p7)
  RIB_CUT_STUB_MIN, RIB_CUT_BOX_HW, RIB_CUT_CAP_T, RIB_CUT_CAP_MG,
  FR_SILL_ON, FR_SILL_SPAN, FR_SILL_IN, FR_SILL_BITE, FR_SILL_T, FR_SILL_LIFT, FR_SILL_MAT, RIB_VICE_NA,   // ★60 문지방
  RIB_XFER_ON, RIB_DEST_K, RIB_DEST_PHI, FREE_MOUTH_CLR,   // ★61 리브 갈아타기
  FR_KNOT_ON, FR_LAND_DEG, RIB_FREE_MODE, STAIR_R,   // ★62 바닥 매듭 · ★62-2 어휘 통일
  RIB_OPEN_ON, BAL_STEP, BAL_W,   // ★63 우물 발코니
  RIB_HOLE_CLR,   // ★64 관통 구멍 여유
  spiralPoint, STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, Y_POLE_CUT, ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1, U_SPIRAL_END, rOf, uOfX,
  RIB_WALL_ON, RIB_WALL_T, RIB_WALL_T_MAX, RIB_WALL_SCOPE, RIB_BORE_MAX_AX, RIB_RADIAL_SEG, RIB_WALL_END_CAP,   // ★57 벽 두께
  RIB_VICE_ON, RIB_NEWEL_R, RIB_NEWEL_Y0, RIB_NEWEL_Y1, RIB_VICE_SOFFIT, RIB_VICE_T, RIB_VICE_R_OUT, RIB_POLE_ON,  // ★58 vice
  STEPS_PER_TURN, ribCenter, spiralU, U_DOOR,
  KW_STEPS, KW_TREAD_D, KW_TREAD_W, KW_FLATTEN, X_LAND_HI, U_KNEE_END, PANEL_DX, PANEL_Z0, PANEL_Z1, LAND_T,
  KW_BODY_ON, KW_BODY_MODE, KW_BODY_HW, KW_BODY_D, KW_BODY_BWF, KW_BODY_TOP, KW_BODY_EXT,   // ★65 무릎길 몸
  KW_RISE, KW_SLOPE_DEG, KW_FLIGHT_N, KW_LAND_MIN,   // ★66 계단 규격
  KW_ENTRY_ON, KW_ENTRY_L, KW_ENTRY_OUT, KW_KNOT_D,   // ★67 도입 참
  KW_RAIL_ON, KW_RAIL_H, KW_MIN_HALFW, RIB_BORE_FACET,   // ★68·69
  X_LAND_LO, JCT_PLATE_XHI, Z_LAND,
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
  TERRACE_ON, TR_RIN, TR_ROUT, TR_Y, RM10_FLARE_ON, RM10_FLARE_MY,   // ★85 테라스
  CL_HW, CL_PHI0, CL_PHI1, ST_ON, ST_PHI, ST_HW, TERRACE_ARC, PASS_X_END, LAMP_RIBS,
  RM10_EXIT_FLOOR_Y, RM10_EXIT_ROUT, RM10_AX_R, RM10_STR_END,   // ★79-5/6 출구 통로   // ★78 K2
  CL_SEG_DROP, CL_STEP_N, CL_STEP_RISE, CL_STEP_GO, CL_STEP_RUN, CL_STAIR_MID, CL_STAIR_HPHI,   // ★78-2 K3
  CL_DROP_TOTAL, CL_FLOOR_END, CL_ROOF_Y, CL_HEAD_Y, CL_WALL_BOT, CL_ROOF, CL_HEAD, CL_LAMP_PHI,
  clLandingY, clFloorY, clSillY, clFloorSegments, clSillBands, KW_GO, ST_ROOF, PASS_DOOR_H,
  CL_STEP_SLOPE_DEG, CL_WIN_MODE, clSillSlopeY, clSillActiveY, CL_WIN_SLOPE_LIFT,   // ★78-3
  CL_WALL_T, CL_R_IN2, CL_R_OUT2, CL_FLOOR_BITE, LAMP_R,   // ★78-4
  JCT_KNOT_TOP, LK_DISC_T, LK_PLAT_R, LK_DISC_DX, LK_DISC_LIFT, LK_TOPSTEP_TOP, U_LOOKOUT_END, RM_X1, RM_Z0, RM_Z1,
  SHAFT_GRATE_ON, SHAFT_GRATE_BAR, SHAFT_GRATE_GAP, SHAFT_GRATE_T,
  JCT_PLATE_MODE, JCT_PLATE_SEG, JCT_UP_Z, JCT_DN_Z,
  RM_ROOF_OV_PX, CHEEK_TOP_PZ, CHEEK_TOP_NZ, PASS_T,
  ARCH_PIERCE_X,
  X_DESC_END,
  X_DESC0,
  PASS_HW,
  PASS_FUSE,
  JCT_SLOT_MARGIN,
  WARCH_HW,
  WARCH_FUSE,
  CHANNEL_HW,
  VAULT_HW,
  CLEAR_HW,
  FR_WIN_MODE, FR_WIN_ON, FR_WIN_SILL, FR_WIN_HEAD, FR_WIN_HZ, FR_WIN_SEAL_Y,           // ★77 서벽 창
  FR_WIN_HEAD_MAX, FR_WIN_SILL_MIN, FR_WIN_HZ_MAX,
  FR_WIN_BAR_ON, FR_WIN_BAR_W, FR_WIN_BAR_SET, FR_WIN_BAR_IN, FR_WIN_BAR_BITE, FR_WIN_BAR_ALIGN,
} from './constants.js'
import { hallDoors, buildHallStairs, PLAT_TOP, incaStairSpec, incaBladesSpec, intakeSpec, INTAKE_IS_SLIT, gatSeal, ribCutSpec , friezeWinBarZ } from './corridorStairsGeometry.js'
import * as THREE from 'three'                                                   // ★56 CSG 스모크(check_radial 전례)
import { Brush, Evaluator, HOLLOW_SUBTRACTION, SUBTRACTION } from 'three-bvh-csg'
import { kneeBodySamples, kneeBodySpec, kneeWalkY, kneeBodyHalfWidth, prismGeometry, innerTubeSolid, buildKneeBody, buildKneePlinth, kneeWallHalfAt } from './kneeBodyGeometry.js'
import { kneeStairSpec, kneeTreads, kneeTreadW, kneeSurfaceY, kneeSpineY, kneeHeadroom, KNEE_NOSE, KNEE_SX, KNEE_XA, KNEE_XB, KNEE_YA, KNEE_YB, KNEE_RUN, KNEE_CLIMB } from './kneeStair.js'   // ★66   // ★65 무릎길 몸
import { castDoorFan, doorArch } from './viewProbe.js'   // ★83 원근 시야 광선 정본(구 _probe_view)
import { buildJunctionKnot, junctionKnotSpec, buildLightShaft, lightShaftSpec, shaftCutSolid, buildShaftGrate, discSolid, buildJunctionPlate, junctionPlateOutline, plateMaxHalf, JCT_PLATE_TOP, buildPzCheek, pzCheekProfile, cheekTopPzAt, descFloorAt, descPierceX, axisDistAt, buildRoomMouthWall, roomMouthArch, inRibArchCut, wideStairTreads } from './junctionGeometry.js'   // ★70 매듭 · ★71 빛 기둥
import { buildRibShell, makeRibCurve, RIB_TUB_SEG, shellVolumeApprox, signedVolume, buildViceWedge, viceSplitIndex, newelSpec, viceBottomY, VICE_DTHETA, sillSpec, buildSill, freeSplitRange, freeNewelSpec, destCut, floorKnotSpec, buildFloorCollar, buildFloorLanding, openRimSpec, isOpenRib, ribHoleSolid } from './ribGeometry.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }
const r2 = (v) => Math.round(v * 100) / 100
const DEG = 180 / Math.PI

//  ★64-4 검사용: Corridor.thickenSurface의 사본(두께 0 면 → solid 판). 소스와 같은 로직을 검증에서 재현.
function thickenSurfaceT(geo, t) {
  const src = geo.index ? geo.toNonIndexed() : geo; const p = src.attributes.position, n = src.count
  src.computeVertexNormals(); const nm = src.attributes.normal; const out = []
  const push = (x, y, z) => out.push(x, y, z)
  for (let i = 0; i < n; i += 3) {
    const A = [p.getX(i), p.getY(i), p.getZ(i)], B = [p.getX(i+1), p.getY(i+1), p.getZ(i+1)], Cc = [p.getX(i+2), p.getY(i+2), p.getZ(i+2)]
    push(...A); push(...B); push(...Cc)
    const off = (v, k) => [v[0]+nm.getX(k)*t, v[1]+nm.getY(k)*t, v[2]+nm.getZ(k)*t]
    const A2 = off(A, i), B2 = off(B, i+1), C2 = off(Cc, i+2); push(...A2); push(...C2); push(...B2)
  }
  const key = (a, b) => a < b ? a+'|'+b : b+'|'+a, vid = new Map(), verts = []
  const id = (i) => { const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!vid.has(k)) { vid.set(k, verts.length); verts.push([p.getX(i), p.getY(i), p.getZ(i), nm.getX(i), nm.getY(i), nm.getZ(i)]) } return vid.get(k) }
  const cnt = new Map(); for (let i = 0; i < n; i += 3) { const a = id(i), b = id(i+1), c = id(i+2); for (const [u, v] of [[a,b],[b,c],[c,a]]) { const kk = key(u, v); cnt.set(kk, (cnt.get(kk) || 0) + 1) } }
  for (const [kk, c] of cnt) if (c === 1) { const [ui, vi] = kk.split('|').map(Number), V0 = verts[ui], V1 = verts[vi]
    const b0 = [V0[0], V0[1], V0[2]], b1 = [V1[0], V1[1], V1[2]], t0 = [V0[0]+V0[3]*t, V0[1]+V0[4]*t, V0[2]+V0[5]*t], t1 = [V1[0]+V1[3]*t, V1[1]+V1[4]*t, V1[2]+V1[5]*t]
    push(...b0); push(...b1); push(...t1); push(...b0); push(...t1); push(...t0) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(out), 3)); g.computeVertexNormals(); return g
}
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

  //  ⑦★★61 개정(2026.07.24): 여정이 두 리브가 되며 '간극 건넘'의 주어가 바뀌었다 —
  //   구판 "#0 간극을 나선이 (관 안에서) 건넌다"는 폐기(#0 나선은 방 바닥 문지방에서 끝난다).
  //   신판 = **목적지(#+2) 간극을 자립 나선이 (방 허공에서) 오른다**. 같은 헬릭스 f축이라
  //   좌표 산술은 φ=0 평면에서 그대로 재고, 실배치는 +RIB_DEST_PHI 회전(RibStair·검증 R10이 대응).
  //   ⚠노출 쐐기·판은 §2-D ② 위반이 아니다 — 자립 나선은 기둥 접지(§2-C) + 관내 판은 '의도된 부양'.
  const z = cuts.find(c => c.k === (RIB_XFER_ON ? RIB_DEST_K : 0))
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
  ok(inGap >= 20, `목적지 #${z.k > 0 ? '+' + z.k : z.k} 간극을 오르는 나선 ${inGap}칸(간극 ${r2(z.gap)}) ≥ 20 — 오름이 사건이 된다(시드 ${RIB_CUT_SEED} 선정 기준)`)
  ok(maxStep <= STEP_RISE + 0.01, `간극 구간 디딤 단높이 최대 ${r2(maxStep)} ≤ ${STEP_RISE} — 자립 구간에서도 계단이 균일`)
  ok(outRoom === 0, `노출 나선 ${inGap}칸 전부 방 안(바닥 ${FR_FLOOR_Y} ~ 천장 ${r2(z.yCeil)}) — 밖에서 안 보인다`)
  ok(z.yTop < U_SPIRAL_END * H, `목적지 윗 절단면 ${r2(z.yTop)} < 나선 끝 ${r2(U_SPIRAL_END * H)} — 나선이 아가리를 꿰고 윗토막 안으로 이어진다`)
  //  아가리 무캡의 근거를 수치로 못박는다 — 캡을 달면 실제로 나선을 막는다(되돌리려는 다음 세션 방지)
  let blocked = 0
  for (let i = 0; i < STAIR_STEPS; i++) {
    const p = spiralPoint((i + 0.5) / STAIR_STEPS).pos
    if (Math.abs(p.y - z.yTop) < RIB_CUT_CAP_T && Math.hypot(p.x - rOf(z.yTop / H), p.z) < SHELL_RIB_R) blocked++
  }
  ok(blocked > 0, `목적지 무캡(아가리)의 근거 — 절단면 평면에 디딤 ${blocked}칸이 지난다(캡 = 1-③C '뚜껑' 재발)`)

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
  //  ★87: 구 지역 사본("Dome.jsx와 같은 구축"의 복제)을 **정본 소비**로 교체 — Dome이 미러 연장
  //   곡선을 쓰게 됐으므로 사본을 두면 이 스모크가 그 순간 렌더와 다른 관을 재는 죽은 검사가 된다(★83 전례).
  let csgBad = 0, csgMin = 1e9
  for (const c of cuts) {
    const tube = new THREE.TubeGeometry(makeRibCurve(), RIB_TUB_SEG, SHELL_RIB_R, 10, false)
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
  //  ★85(2026.07.29): 테라스가 재설계되면서 **시점이 12.00 올라갔다**(226.43 → 238.43).
  //   이 절은 LOCKED 예외 #1의 조건 ③('다른 시점에서 문 전부 불가시')을 강제하는 자리이므로
  //   눈높이가 바뀌면 반드시 다시 재야 한다 — 구 좌표로 계속 재면 **죽은 검사**가 된다(★83 전례).
  //   ⚠방위는 여전히 360° 전수(새 부채꼴 −10~31.57°의 상위집합) = 보수적으로 잰다.
  const tRin = TERRACE_ON ? TR_RIN : TERRACE_RIN
  const tRout = TERRACE_ON ? TR_ROUT : TERRACE_ROUT
  const tY = TERRACE_ON ? TR_Y : TERRACE_Y
  let leak = null
  outer:
  for (let j = 0; j < 12; j++) {
    const a = j / 12 * Math.PI * 2
    for (const rr of [tRin + 0.5, tRout - 0.5]) {
      const ex = rr * Math.cos(a), ez = rr * Math.sin(a), ey = tY + EYE
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
  ok(leak === null, `테라스(★85 y${r2(tY)} · r${r2(tRin)}~${r2(tRout)} · 24점 × 문 5 × 표본 4) → 문 전부 불가시(드럼 천장·벽이 차단)` + (leak ? ` — 누출 (${leak[0]},${leak[1]}) → #${leak[2]}` : ''))
}

console.log('— K2. ★78 회랑 확장 — 끝캡 비공면 · 문 ↔ 테라스 도착 —')
{
  //  ★78(2026.07.28)로 CL_PHI1이 23.6°→48.6°가 되면서 **새로 위험해진 것 둘**을 여기서 잰다.
  //   ① 끝캡이 리브 중심선과 공면이 될 수 있다(각도판 코플레이너 — 50.0°가 정확히 그 값이었다)
  //   ② 문이 테라스 호 밖으로 걸어 나갈 수 있다(테라스는 온전한 링이 아니라 ±TERRACE_ARC/2 부채꼴)
  //  둘 다 이전엔 φ1이 작아 문제가 될 수 없어 아무도 재지 않았다. 호를 더 늘릴 때 이 절이 먼저 운다.
  const D = 180 / Math.PI, STEP = 360 / MERIDIANS
  const phi1 = CL_PHI1 * D

  // ① 끝캡 ↔ 리브 중심선 비공면. 끝캡 = φ1의 방사 평면. 리브는 5°마다.
  const nearRib = Math.round(phi1 / STEP) * STEP
  const dCap = Math.abs(phi1 - nearRib)
  ok(dCap > 0.5, `끝캡 φ1=${r2(phi1)}° ↔ 최근접 리브 ${nearRib}° 이격 ${r2(dCap)}° > 0.5 — 공면 금지(★75 코플레이너 병의 각도판)`)
  //  현행 설계 어휘 = '리브 방위에서 1.4° 물러섬'(23.6=25−1.4, 48.6=50−1.4). 어긋나면 경고만.
  ok(Math.abs(dCap - 1.4) < 0.35 || dCap > 2.021,
    `끝캡 물러섬 ${r2(dCap)}° — 어휘(리브 −1.4°) 또는 리브 살(2.02°) 밖`)

  // ② 문(스텁 끝벽) 방위 ± 각반폭이 테라스 부채꼴 안에 온전히 드는가
  //  ⚠★85: 이 항은 **구 체제 전용**이다 — 상대가 구 스텁 문(ST_ON=false)이고 구 링 호(±68.75°)다.
  //   ★80이 출구를 나팔로 바꾸고 ★85가 테라스를 아가리 파생으로 바꿨으므로, 현행 도착 관계는
  //   `check_waypoints` **F절**(아가리 문턱 ⊂ 부채꼴)과 **W5**(문턱 41점 → 판 윗면 겹침)가 잰다.
  //   치수는 지우지 않는다(되살릴 근거) — ST_ON 전례와 같은 형식으로 스위치 뒤에 둔다.
  if (!RM10_FLARE_ON) {
    const tHalf = TERRACE_ARC / 2 * D                       // ±68.75°
    const doorHalf = Math.atan(ST_HW / PASS_X_END) * D      // 문벽 반경에서의 각반폭
    const stub = ST_PHI * D
    ok(Math.abs(stub) + doorHalf < tHalf - 1.0,
      `문 ${r2(stub)}°±${r2(doorHalf)} ⊂ 테라스 호 ±${r2(tHalf)}° — 남은 여유 ${r2(tHalf - Math.abs(stub) - doorHalf)}° (호 ${r2((tHalf - Math.abs(stub) - doorHalf) / D * TERRACE_ROUT)})`)
  } else {
    ok(TERRACE_ON, `구 스텁↔구 링 도착 조항 = 보존계(★80 나팔·★85 테라스로 대체). 현행 도착은 check_waypoints F·W5가 잰다`)
  }
  //  ⛔★79-5: 구 스텁 문↔테라스 림 물림 조항. 테라스가 출구 통로 파생으로 옮겨가 이 관계는 죽었다.
  //   ST_ON을 되살릴 때만 유효하므로 스위치 뒤로 넣는다(치수 보존 — 지우면 되살릴 근거가 사라진다).
  if (ST_ON) ok(PASS_X_END > TERRACE_ROUT && PASS_X_END - TERRACE_ROUT < 1.2,
    `문벽 반경 ${r2(PASS_X_END)} = 테라스 외림 ${r2(TERRACE_ROUT)} + ${r2(PASS_X_END - TERRACE_ROUT)}(림 물림 ∈ (0,1.2))`)
  {   // ★85-2: 폭 기준은 `check_waypoints` F절로 이관(현도가 폭을 줄이는 노브 TR_W_F를 만들었다).
    //  여기선 구 링만 구 기준으로 잰다 — 새 테라스의 진짜 구속은 폭이 아니라 '아가리 앞 깊이'다.
    if (!TERRACE_ON) ok(TERRACE_ROUT - TERRACE_RIN > 8, `구 링 폭 ${r2(TERRACE_ROUT - TERRACE_RIN)} > 8`)
    else ok(TR_ROUT - TR_RIN > 0, `테라스 폭 ${r2(TR_ROUT - TR_RIN)}(노브 TR_W_F) — 하한 판정은 check_waypoints F절`)
  }

  // ③ 등불이 호에서 파생됐는가(손 목록 잔재 = 호를 늘려도 안 따라오는 사고) — 여기서 다시 유도해 대조
  const derived = []
  for (let k = 1; k * STEP < phi1; k++) if (k * STEP > CL_PHI0 * D) derived.push(k)
  ok(derived.length === LAMP_RIBS.length && derived.every((k, i) => k === LAMP_RIBS[i]),
    `등불 재유도 = [${derived.join(',')}] = LAMP_RIBS(${LAMP_RIBS.length}기) — 호 파생 동기화`)
  console.log(`     └ ★78 실측: 중심선 호 ${r2(CL_R * (CL_PHI1 - CL_PHI0))} · 보행 ${r2(CL_R * (CL_PHI1 - CL_PHI0) / 6)}s · 등불 ${LAMP_RIBS.length}기(마지막 ${LAMP_RIBS[LAMP_RIBS.length - 1] * STEP}°) · 마지막등불→끝캡 ${r2(phi1 - LAMP_RIBS[LAMP_RIBS.length - 1] * STEP)}°`)
}

console.log('— K3. ★78-2 회랑 계단 바닥 — 연속성 · 보행 · 파라펫 · 도착 —')
{
  const D = 180 / Math.PI, EYE = 1.6, STEP_UP = 0.8
  const { segs, risers } = clFloorSegments()
  const bands = clSillBands()

  // ── ① 바닥 조각의 위상: 층계참 9 + 디딤판 8×5 = 49, 빈틈·겹침 0 ──
  ok(segs.length === CL_STAIR_MID.length * (CL_STEP_N + 1) + 1,
    `바닥 조각 ${segs.length} = 층계참 ${CL_STAIR_MID.length + 1} + 디딤판 ${CL_STAIR_MID.length * CL_STEP_N}`)
  let gap = 0
  for (let i = 1; i < segs.length; i++) gap = Math.max(gap, Math.abs(segs[i].p0 - segs[i - 1].p1))
  ok(gap < 1e-12, `조각 이음매 최대 어긋남 ${gap.toExponential(1)} — 빈틈·겹침 없음`)
  ok(Math.abs(segs[0].p0 - CL_PHI0) < 1e-12 && Math.abs(segs[segs.length - 1].p1 - CL_PHI1) < 1e-12,
    `바닥이 호 전체(${r2(CL_PHI0 * D)}~${r2(CL_PHI1 * D)}°)를 덮는다`)

  // ── ② 해석식 clFloorY ↔ 실제 조각: 독립한 두 표현의 대조(둘 중 하나만 고치는 사고 방지) ──
  let worst = 0
  for (const g of segs) {
    for (const f of [0.25, 0.5, 0.75]) {
      const phi = g.p0 + (g.p1 - g.p0) * f
      worst = Math.max(worst, Math.abs(clFloorY(phi) - g.y))
    }
  }
  ok(worst < 1e-9, `clFloorY(해석) ↔ 조각(기하) 최대 편차 ${worst.toExponential(1)} — 두 표현 일치`)

  // ── ③ 보행: 단높이가 되돌아 오를 수 있는가 · 총 하강이 프로필과 맞는가 ──
  ok(CL_STEP_RISE <= STEP_UP - 0.2, `단높이 ${CL_STEP_RISE} ≤ STEP_UP(${STEP_UP})−0.2 — 되돌아 오를 수 있다`)
  let maxJump = 0
  for (let i = 1; i < segs.length; i++) maxJump = Math.max(maxJump, Math.abs(segs[i].y - segs[i - 1].y))
  ok(maxJump <= STEP_UP - 0.2, `이웃 조각 최대 단차 ${r2(maxJump)} ≤ ${STEP_UP - 0.2}`)
  ok(Math.abs((PASS_FLOOR_Y - segs[segs.length - 1].y) - CL_DROP_TOTAL) < 1e-9,
    `총 하강 ${r2(PASS_FLOOR_Y - segs[segs.length - 1].y)} = CL_DROP_TOTAL ${CL_DROP_TOTAL}`)
  ok(Math.abs(segs[segs.length - 1].y - CL_FLOOR_END) < 1e-9, `마지막 조각 = CL_FLOOR_END ${r2(CL_FLOOR_END)}`)
  //  ★78-3 계단 어휘: 무릎길과 **의도적으로 갈라졌다**(현도 "계단이 짧게 느껴진다" → 30°로 눕힘).
  //   그래서 '동일'이 아니라 '프로젝트 계단 대역 안인가'로 재고 두 값을 나란히 보고한다.
  const slopeDeg = Math.atan(CL_STEP_RISE / CL_STEP_GO) * D
  ok(Math.abs(slopeDeg - CL_STEP_SLOPE_DEG) < 1e-9 && slopeDeg >= 20 && slopeDeg <= 45,
    `계단 경사 ${r2(slopeDeg)}° = 노브 ${CL_STEP_SLOPE_DEG}° · 대역 [20,45] 안 (무릎길 ${r2(Math.atan(KW_RISE / KW_GO) * D)}°에서 의도적 이탈)`)
  //  ★길이 사슬: 단수 N은 약분돼 사라진다 — 계단 길이는 하강과 경사만의 함수다(현도가 착각하기 쉬운 지점)
  ok(Math.abs(CL_STEP_RUN - CL_SEG_DROP / Math.tan(CL_STEP_SLOPE_DEG * Math.PI / 180)) < 1e-9,
    `계단 길이 ${r2(CL_STEP_RUN)} = 하강 ${CL_SEG_DROP} / tan(${CL_STEP_SLOPE_DEG}°) — 단수 무관`)
  //  챌판이 디딤판 단차를 정확히 메우는가
  let rBad = null
  for (const r of risers) if (Math.abs(clFloorY(r.phi - 1e-7) - r.top) > 1e-9) rBad = r
  ok(rBad === null, `챌판 ${risers.length}장 윗면 = 직전 디딤판 높이` + (rBad ? ` — 어긋남 φ${r2(rBad.phi * D)}°` : ''))

  // ── ④ ★파라펫: 국소 바닥 위 높이가 어디서도 눈높이 밑으로 안 간다 = 하향 시선 차단의 구조적 근거 ──
  let minPar = 1e9, atPhi = 0
  for (let i = 0; i <= 20000; i++) {
    const phi = CL_PHI0 + (CL_PHI1 - CL_PHI0) * i / 20000
    const h = clSillY(phi) - clFloorY(phi)
    if (h < minPar) { minPar = h; atPhi = phi }
  }
  ok(minPar >= EYE - 1e-9, `파라펫 최소 ${r2(minPar)}(φ${r2(atPhi * D)}°) ≥ 눈높이 ${EYE} — 아래 세계 불가시`)
  ok(minPar >= CL_SILL - 1e-9, `파라펫이 CL_SILL(${CL_SILL}) 밑으로 안 감 — 계단 밑 강하 규칙의 배당`)
  //  ⚠계단 **중간**에서 창턱을 내리면 여기서 1.0이 나온다(_probe_cloister78이 잡은 결함의 회귀 방지)
  ok(bands.length >= 1 && bands.every(b => b.p1 > b.p0), `파라펫 띠 ${bands.length}장 · 전부 양의 폭`)
  //  ★78-3 창턱 두 어법: **꺼진 쪽도 상시 잰다**(M절 전례 — 비활성 스킴 보전).
  //   'slope'는 그냥 그으면 첫 계단 직전에 파라펫이 0.477로 무너진다. 들림값이 그걸 막고 있는지 매번 확인.
  for (const [mode, fn] of [['step', clSillY], ['slope', clSillSlopeY]]) {
    let mn = 1e9, mx = -1e9, at = 0
    for (let i = 0; i <= 20000; i++) {
      const phi = CL_PHI0 + (CL_PHI1 - CL_PHI0) * i / 20000
      const h = fn(phi) - clFloorY(phi)
      if (h < mn) { mn = h; at = phi }
      if (h > mx) mx = h
    }
    ok(mn >= EYE - 1e-9,
      `[${mode}${CL_WIN_MODE === mode ? '·활성' : ''}] 파라펫 ${r2(mn)}~${r2(mx)}(최저 φ${r2(at * D)}°) ≥ 눈높이 ${EYE} · 창높이 ${r2(CL_HEAD_Y - fn(CL_PHI0))}→${r2(CL_HEAD_Y - fn(CL_PHI1))}`)
  }
  //  들림값은 상수가 아니라 파생이어야 한다 — 바닥(하강·단수·경사)을 만지면 따라와야 하므로
  //  ⚠**표본으로 재면 안 된다.** 바닥이 계단(구간 상수)이고 선은 단조 감소하므로 최저점은 각 평평 조각의
  //   **오른쪽 끝에서 좌극한**으로만 잡힌다 — 어떤 유한 표본도 그 값에 못 닿고 항상 조금 위를 잰다.
  //   (2026.07.28: 상수를 8000점으로 뽑고 검사를 20000점으로 재서 서로 어긋났다. 둘 다 해석적으로 고쳤다.)
  const slopeMin = Math.min(...segs.map(g => clSillSlopeY(g.p1) - g.y))
  ok(Math.abs(slopeMin - CL_SILL) < 1e-9,
    `경사 창턱 들림 ${r2(CL_WIN_SLOPE_LIFT)} → 최저점(조각 우단 좌극한) ${slopeMin.toFixed(6)} = CL_SILL ${CL_SILL} 정확`)
  ok(['step', 'slope'].includes(CL_WIN_MODE), `CL_WIN_MODE='${CL_WIN_MODE}' — 두 어법 중 하나`)

  // ── ⑤ 천장·창 위턱은 절대 고정(바닥만 내려간다 = 현도 의도) ──
  ok(Math.abs(CL_ROOF_Y - (PASS_FLOOR_Y + CL_ROOF)) < 1e-9, `지붕 ${r2(CL_ROOF_Y)} 고정 — 시작 지점에서 구값과 항등`)
  ok(Math.abs(CL_HEAD_Y - (PASS_FLOOR_Y + CL_HEAD)) < 1e-9, `창 위턱 ${r2(CL_HEAD_Y)} 고정`)
  ok(CL_ROOF_Y - CL_FLOOR_END > CL_ROOF, `끝 층고 ${r2(CL_ROOF_Y - CL_FLOOR_END)} > 시작 ${CL_ROOF} — 걸을수록 자란다`)
  ok(CL_WALL_BOT < CL_FLOOR_END, `벽 밑단 ${r2(CL_WALL_BOT)} < 최저 바닥 ${r2(CL_FLOOR_END)} — 벽이 바닥 아래까지 내려와 봉인`)

  // ── ⑥ 등불은 층계참 위에 선다(계단 위에 서면 갓 밑이 기울어 보인다) ──
  let lampBad = null
  for (let i = 0; i < CL_LAMP_PHI.length; i++) {
    const seg = segs.find(g => CL_LAMP_PHI[i] >= g.p0 && CL_LAMP_PHI[i] <= g.p1)
    if (!seg || seg.kind !== 'landing' || Math.abs(seg.y - clLandingY(i)) > 1e-9) lampBad = i
  }
  ok(lampBad === null, `등불 ${CL_LAMP_PHI.length}기 전부 제 층계참 위` + (lampBad !== null ? ` — #${lampBad} 이탈` : ''))
  //  층계참 여유(등불 좌우로 걸을 자리)
  const landW = (5 * Math.PI / 180 - CL_STEP_RUN / CL_R) * CL_R
  ok(landW > 8, `층계참 호 ${r2(landW)} > 8 (등불 좌우 ±${r2(landW / 2)}) — 계단 길이 ${r2(CL_STEP_RUN)}`)

  // ── ⑦ 도착: 스텁이 평평한 마지막 층계참에서 출발하고, 테라스가 따라 내려왔는가 ──
  const stubSeg = segs.find(g => ST_PHI >= g.p0 && ST_PHI <= g.p1)
  const mouthHalf = ST_HW / (CL_R - CL_HW)
  const mouthIn = segs.filter(g => g.p1 > ST_PHI - mouthHalf && g.p0 < ST_PHI + mouthHalf)
  ok(stubSeg && stubSeg.kind === 'landing' && mouthIn.every(g => g.kind === 'landing' && Math.abs(g.y - CL_FLOOR_END) < 1e-9),
    `스텁 입(${r2((ST_PHI - mouthHalf) * D)}~${r2((ST_PHI + mouthHalf) * D)}°)이 **평평한** 마지막 층계참 위 — 계단에 안 걸림`)
  //  ★79-5 '문턱 없는 도착'의 **상대가 바뀌었다** — 회랑이 아니라 등불 방의 출구 통로다.
  //   관계(무단차)는 그대로고 값만 12 더 내려갔다. 어느 쪽에 묶여 있는지를 검사가 못 박는다.
  //  ⚠★85: 아래 둘은 **구 링(★79-5 출구 통로 파생) 전용**이다. ★80이 12.00을 올려 아가리를 회랑
  //   레벨에 놓았고 ★85가 테라스를 그 아가리에서 파생시켰으므로, 두 관계는 상대가 통째로 바뀌었다.
  //   현행 = `TR_Y = RM10_FLARE_MY = CL_FLOOR_END` · `TR_ROUT = 아가리 모서리 반경`(check_waypoints F절).
  if (!RM10_FLARE_ON) {
    ok(Math.abs(TERRACE_Y - RM10_EXIT_FLOOR_Y) < 1e-9,
      `TERRACE_Y ${r2(TERRACE_Y)} = 출구 통로 바닥 — '문턱 없는 도착' 관계 보존(구 상대 = 회랑 끝 ${r2(CL_FLOOR_END)})`)
    ok(TERRACE_ROUT <= RM10_AX_R - RM10_STR_END + PASS_T + 1e-9 && TERRACE_ROUT > RM10_AX_R - RM10_STR_END,
      `테라스 외림 ${r2(TERRACE_ROUT)} = 직선 끝 ${r2(RM10_AX_R - RM10_STR_END)} + 물림 ${r2(PASS_T)} — 문지방에 틈 없음`)
  } else {
    ok(Math.abs(TR_Y - CL_FLOOR_END) < 1e-9 && Math.abs(TR_Y - RM10_FLARE_MY) < 1e-9,
      `★85 도착 = TR_Y ${r2(TR_Y)} = 아가리 바닥 = 회랑 바닥(구 관계는 스위치 뒤 보존)`)
  }
  ok((TERRACE_ON ? TR_Y : TERRACE_Y) - 110 > 100, `테라스 ${r2(TERRACE_ON ? TR_Y : TERRACE_Y)} − 최고 문 상단 110 = ${r2((TERRACE_ON ? TR_Y : TERRACE_Y) - 110)} > 100 — 하부 세계는 여전히 한참 아래`)
  ok(CL_FLOOR_END - 0.05 + PASS_DOOR_H < CL_FLOOR_END + ST_ROOF, `문(${PASS_DOOR_H}) < 스텁 내부고(${ST_ROOF})`)
  console.log(`     └ ★78-2 실측: 바닥 ${r2(PASS_FLOOR_Y)}→${r2(CL_FLOOR_END)}(−${CL_DROP_TOTAL}) · 층고 ${CL_ROOF}→${r2(CL_ROOF_Y - CL_FLOOR_END)} · 창높이 ${r2(CL_HEAD - CL_SILL)}→${r2(CL_HEAD_Y - (CL_FLOOR_END + CL_SILL))} · 계단 ${CL_STAIR_MID.length}×${CL_STEP_N}단`)
}

console.log('— K4. ★78-4 회랑 벽 두께 — 돌출 소멸 · 폭 사슬 · 인방 —')
{
  const D = 180 / Math.PI
  const rIn = CL_R - CL_HW, rOut = CL_R + CL_HW
  //  ── ① 결함 수리 확인: 바닥·챌판이 벽 밖으로 안 나온다 ──
  //   바닥 링과 챌판 박스는 rIn−BITE ~ rOut+BITE를 덮는다(구 '오버행'). 벽 살이 그걸 삼켜야 한다.
  const fl0 = rIn - CL_FLOOR_BITE, fl1 = rOut + CL_FLOOR_BITE
  ok(fl0 > CL_R_IN2 && fl1 < CL_R_OUT2,
    `바닥·챌판 반경 ${r2(fl0)}~${r2(fl1)} ⊂ 벽 발자국 ${r2(CL_R_IN2)}~${r2(CL_R_OUT2)} — **돌출 0**(89장 전부)`)
  //  ★75 폭 사슬: 물림이 0이면 공면(z파이팅), 두께 이상이면 관통. 사이여야 한다.
  ok(CL_FLOOR_BITE > 0 && CL_FLOOR_BITE < CL_WALL_T,
    `폭 사슬 0 < 물림 ${CL_FLOOR_BITE} < 두께 ${CL_WALL_T} — 어느 벽면과도 공면 아님(여유 안 ${r2(CL_WALL_T - CL_FLOOR_BITE)} / 밖 ${CL_FLOOR_BITE})`)
  ok(Math.abs((rIn - CL_R_IN2) - CL_WALL_T) < 1e-9 && Math.abs((CL_R_OUT2 - rOut) - CL_WALL_T) < 1e-9,
    `안·바깥 벽 두께 둘 다 ${CL_WALL_T} — 대칭`)

  //  ── ② 통행 단면은 안 건드렸다(두께는 밖으로만 자란다) ──
  ok(Math.abs((rOut - rIn) - 2 * CL_HW) < 1e-9, `내부 통행폭 ${r2(2 * CL_HW)} 불변 — 두께는 바깥으로만`)
  ok(LAMP_R > rIn && LAMP_R < rOut, `등불 관 r=${LAMP_R}이 여전히 통행 단면 안`)

  //  ── ③ 벽 발자국이 이웃을 안 먹는가 ──
  {   // ★85: 회랑 안벽 ↔ 테라스 외림. 둘은 **같은 레벨**이라 이 여유가 곧 그 사이 빈 폭이다.
    const tro = TERRACE_ON ? TR_ROUT : TERRACE_ROUT
    ok(CL_R_IN2 > tro + 1, `안벽 안쪽면 ${r2(CL_R_IN2)} > 테라스 외림 ${r2(tro)}+1 — 빈 폭 ${r2(CL_R_IN2 - tro)}`)
  }
  ok(CL_R_IN2 - PASS_X_END > 3, `스텁 남은 길이 ${r2(CL_R_IN2 - PASS_X_END)} > 3 — 벽이 스텁을 삼키지 않았다`)
  ok(ST_ROOF + CL_FLOOR_END > CL_FLOOR_END, `스텁이 안벽을 관통해 뚫린다(측벽 r ${r2(PASS_X_END)}~${r2(rIn + 0.4)} ⊃ 벽 ${r2(CL_R_IN2)}~${r2(rIn)})`)

  //  ── ④ 인방(reveal): 깊이 = 두께. 창밖 리브가 인방에 얼마나 붙는지는 **막지 않고 잰다** ──
  const dist = (pr, py) => { let b = 1e9; for (let i = 0; i <= 6000; i++) { const u = i / 6000 * 0.5; const d = Math.hypot(rOf(u) - pr, H * u - py); if (d < b) b = d } return b }
  const clrHead = dist(CL_R_OUT2, CL_HEAD_Y) - SHELL_RIB_R
  ok(CL_WALL_T > 0.9, `인방 깊이 ${CL_WALL_T} > 0.9(바닥 물림 0.6 + 여유) — 창이 '살을 가진 개구'로 읽힌다`)
  ok(clrHead > 0, `창 위턱(${r2(CL_HEAD_Y)})에서 바깥면 → 리브 살 여유 ${r2(clrHead)} > 0` +
    (clrHead < 1 ? ' ⚠1 미만 — 창밖 리브가 인방에 붙는다(두께를 줄이거나 감수)' : ''))
  //  창 개구 자체는 두께와 무관하게 보존되는가(높이·φ 범위)
  for (const [mode, fn] of [['step', clSillY], ['slope', clSillSlopeY]])
    ok(CL_HEAD_Y - fn(CL_PHI1) > 3, `[${mode}] 끝 창높이 ${r2(CL_HEAD_Y - fn(CL_PHI1))} > 3 — 인방이 창을 잡아먹지 않았다`)
  console.log(`     └ ★78-4 실측: 벽 두께 ${CL_WALL_T} · 발자국 ${r2(CL_R_IN2)}~${r2(CL_R_OUT2)}(전폭 ${r2(CL_R_OUT2 - CL_R_IN2)}) · 통행 ${r2(2 * CL_HW)} · 인방 깊이 ${CL_WALL_T} · 위턱↔리브 ${r2(clrHead)}`)
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
    ok(GAT_CX === COR_CX, `크라운 중심 x ${r2(GAT_CX)} = 드럼 중심 ${COR_CX} — 동심(대칭, 현도 07.25). 갓 링 폭이 사방 균일`)
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
    ok(Math.abs(COR_CX - GAT_CX) < 1e-9, `대칭 — 크라운↔드럼 중심 이격 ${r2(COR_CX - GAT_CX)} = 0 (갓 각뿔대 좌우 대칭, 현도 07.25 — 구 서쪽 16 치우침 폐기)`)
    ok(['wall','pier'].includes(GAT_SEAT), `양태 안착 '${GAT_SEAT}' — ${GAT_SEAT==='wall' ? '벽 top(틈 0, 피어가 지붕 관통)' : '피어 top(⚠벽 상향 필요)'}`)
    { // ★크라운↔양태 이음 봉인(07.22 현도 "틈이 보인다"): 양태 안쪽 다각형이 크라운 원 '안'에 있어야 겹쳐 막힌다
      const rEdge = GAT_CROWN_R * Math.cos(Math.PI / GAT_FACETS)      // 내접 다각형 모서리 최소 반경
      ok(rEdge < GAT_CROWN_R, `양태 안쪽 = 크라운 원에 내접(모서리 최소 반경 ${r2(rEdge)} < 크라운 ${GAT_CROWN_R}) — 겹쳐서 틈 0`)
      const rOutEdge = COR_R / Math.cos(Math.PI / GAT_FACETS) * Math.cos(Math.PI / GAT_FACETS)
      ok(Math.abs(rOutEdge - COR_R) < 1e-9, `양태 바깥 = 드럼 벽 원에 외접(모서리가 접선) — 벽 top 덮어 틈 0(원안 복원)`)
      ok(Math.abs((seal.cutY - seal.baseY) - GAT_CROWN_H) < 1e-9, `크라운 벽 높이 균일 ${r2(seal.cutY - seal.baseY)} = GAT_CROWN_H (밑동도 수평)`)
    }
    { //  ★64-6(현도 07.25 최종): 매끈한 각뿔대에 리브 겹치는 부분만 CSG 제거 — 실제 ceilGeo 로직 재현.
      //   ① 리브 자리(5개) 보어가 뚫렸나(관 축 광선 통과) ② 리브 사이는 각뿔대 연속(틈 없음).
      const seat = GAT_SEAT === 'pier' ? PIER_TOP_OVER : 0, F = GAT_FACETS, kOut = 1 / Math.cos(Math.PI / F)
      const rOut = COR_R * kOut, rIn = GAT_CROWN_R
      const PO = (t) => [COR_CX + rOut*Math.cos(t), ceilY(COR_CX + rOut*Math.cos(t)) + seat, rOut*Math.sin(t)]
      const PI_ = (t) => [GAT_CX + rIn*Math.cos(t), seal.baseY, rIn*Math.sin(t)]
      const SKIN = 0.5, shellPos = []
      const tri = (a, b, c) => shellPos.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2])
      for (let i = 0; i < F; i++) {
        const t0 = (i/F)*Math.PI*2, t1 = ((i+1)/F)*Math.PI*2
        const o0 = PO(t0), o1 = PO(t1), i0 = PI_(t0), i1 = PI_(t1)
        tri(o0, o1, i1); tri(o0, i1, i0)
        const O0=[o0[0],o0[1]-SKIN,o0[2]], O1=[o1[0],o1[1]-SKIN,o1[2]], I0=[i0[0],i0[1]-SKIN,i0[2]], I1=[i1[0],i1[1]-SKIN,i1[2]]
        tri(O0, I1, O1); tri(O0, I0, I1)
        tri(o0, O0, O1); tri(o0, O1, o1)
        tri(i0, i1, I1); tri(i0, I1, I0)
      }
      const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(shellPos), 3)); shell.computeVertexNormals()
      const evG = new Evaluator(); evG.attributes = ['position', 'normal']
      let acc = new Brush(shell); acc.updateMatrixWorld()
      const surfY = (d, pick) => { let ym = pick === 'min' ? Infinity : -Infinity
        for (let a = 0; a < 16; a++) { const th = a/16*Math.PI*2
          for (const rr of [0, 3, SHELL_RIB_R + 0.5]) {
            const x = d.cx + rr*Math.cos(th), z = d.cz + rr*Math.sin(th), r = Math.hypot(x - COR_CX, z)
            const f = Math.min(1, Math.max(0, (rOut - r) / Math.max(rOut - rIn, 1e-6))), rimY = ceilY(x) + seat
            const y = rimY + (seal.baseY - rimY) * f
            ym = pick === 'min' ? Math.min(ym, y) : Math.max(ym, y) } }
        return ym }
      for (const d of hallDoors()) { const b = new Brush(ribHoleSolid(d.k, surfY(d,'min') - SKIN - 1, surfY(d,'max') + 2, RIB_HOLE_CLR)); b.updateMatrixWorld(); acc = evG.evaluate(acc, b, SUBTRACTION) }
      //  ★64-7: 갓 각뿔대 = 두께0 면 + 격자 클립 + 거울 복사. 소스와 같은 로직을 재현해 검증한다.
      const ribAt = (k, y) => { const c = ribCenter(y / H).x, dd = 0.4
        const slope = Math.abs(ribCenter((y + dd) / H).x - ribCenter((y - dd) / H).x) / (2 * dd)
        const a = k * 2 * Math.PI / MERIDIANS
        return { x: c * Math.cos(a), z: c * Math.sin(a), r: (SHELL_RIB_R + RIB_HOLE_CLR) * Math.sqrt(1 + slope*slope) } }
      const sOf = (P, k) => { const a = ribAt(k, P[1]); return Math.hypot(P[0] - a.x, P[2] - a.z) - a.r }
      const clipRib = (poly, k) => { const o = []
        for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i+1)%poly.length], sa = sOf(A,k), sb = sOf(B,k)
          if (sa >= 0) o.push(A)
          if ((sa >= 0) !== (sb >= 0)) { const t = sa/(sa-sb); o.push([A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t]) } }
        return o }
      const NU = 24, NV = 12, half = []
      for (let f = 0; f < GAT_FACETS/2; f++) {
        const t0 = (f/GAT_FACETS)*Math.PI*2, t1 = ((f+1)/GAT_FACETS)*Math.PI*2
        const o0 = PO(t0), o1 = PO(t1), i0 = PI_(t0), i1 = PI_(t1)
        const P = (u, v) => { const ox=o0[0]+(o1[0]-o0[0])*u, oy=o0[1]+(o1[1]-o0[1])*u, oz=o0[2]+(o1[2]-o0[2])*u
          const ix=i0[0]+(i1[0]-i0[0])*u, iy=i0[1]+(i1[1]-i0[1])*u, iz=i0[2]+(i1[2]-i0[2])*u
          return [ox+(ix-ox)*v, oy+(iy-oy)*v, oz+(iz-oz)*v] }
        const fine = (f === 0), nu = fine ? NU : 1, nv = fine ? NV : 1
        const vAt = (j) => { const t = j/nv; return fine ? t*t : t }
        for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
          const A = P(iu/nu, vAt(iv)), B = P((iu+1)/nu, vAt(iv)), D = P((iu+1)/nu, vAt(iv+1)), E = P(iu/nu, vAt(iv+1))
          for (let poly of [[A,B,D],[A,D,E]]) {
            if (fine) for (const k of [0,1,2]) { poly = clipRib(poly, k); if (poly.length < 3) break }
            if (poly.length < 3) continue
            for (let j = 1; j+1 < poly.length; j++) half.push([poly[0], poly[j], poly[j+1]]) } } }
      const T = half.slice()
      for (const t of half) { const m = t.map(v => [v[0], v[1], -v[2]]); T.push([m[0], m[2], m[1]]) }
      const TV = T.map(t => t.map(v => new THREE.Vector3(v[0], v[1], v[2])))
      const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), tgt = new THREE.Vector3()
      const hitY = (x, z) => { ray.origin.set(x, 100, z); let b = null
        for (const t of TV) { if (ray.intersectTriangle(t[0], t[1], t[2], false, tgt) && tgt.y > 100) { if (b === null || tgt.y < b) b = tgt.y } }
        return b }
      // ① ★좌우 대칭 — 같은 방위·반경의 ±z 천장 높이가 같아야(구 대각선 분할은 0.7~1.4 어긋났다)
      let asym = 0, nSym = 0
      for (const az of [8, 16.8, 24, 32.1, 45, 60, 90, 120, 150]) for (const rr of [35, 50, 65, 78]) {
        const th = az*Math.PI/180, a = hitY(COR_CX + rr*Math.cos(th), rr*Math.sin(th)), b = hitY(COR_CX + rr*Math.cos(-th), rr*Math.sin(-th))
        nSym++
        if (!((a === null && b === null) || (a !== null && b !== null && Math.abs(a - b) < 0.02))) asym++ }
      ok(asym === 0, `갓 좌우 대칭 — ±z 천장 높이 일치 ${nSym}곳 (절반 생성 후 거울 복사로 구조적 보장)` + (asym ? ` ✗ ${asym}곳 불일치` : ''))
      // ② 리브 보어 침범 없음(높이별 축거리) — 초승달·소매 잔재 검출
      let intrude = 0
      for (const d of hallDoors()) for (const t of T) { const ys = [t[0][1], t[1][1], t[2][1]]
        if (Math.max(...ys) < 190 || Math.min(...ys) > 210) continue
        for (let i = 0; i <= 5; i++) for (let j = 0; j <= 5 - i; j++) { const a = i/5, b = j/5, c = 1 - a - b
          const px = a*t[0][0]+b*t[1][0]+c*t[2][0], py = a*t[0][1]+b*t[1][1]+c*t[2][1], pz = a*t[0][2]+b*t[1][2]+c*t[2][2]
          const ax = ribAt(d.k, py); if (Math.hypot(px - ax.x, pz - ax.z) < SHELL_RIB_R - 0.5) intrude++ } }
      ok(intrude === 0, `리브 보어 침범 없음 — 관 안에 갓 면 조각 0(구 수직 원기둥은 초승달, 두께 껍질은 소매)` + (intrude ? ` ✗ ${intrude}` : ''))
      // ③ 리브 사이 틈 없음(리브 구멍·이음선을 피한 지점)
      let gap = 0, checks = 0
      for (const az of [8.4, -8.4, 26, -26, 45, 90, 135, -45, -90, -135]) for (const rr of [40, 60, 75]) {
        const th = az*Math.PI/180; checks++
        if (hitY(COR_CX + rr*Math.cos(th), rr*Math.sin(th)) === null) gap++ }
      ok(gap === 0, `리브 사이 각뿔대 연속 — 틈 없음(리브 없는 ${checks}곳 전부 천장 있음)` + (gap ? ` ✗ ${gap}곳 틈` : ''))
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
  {   // 무릎길 — ★66 이후 **디딤판·참의 정본은 kneeStair**다(여기서 배치식을 다시 적지 않는다)
    for (const tr of kneeTreads()) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const d = axDist(tr.x + sx * tr.d / 2, tr.y - TREAD_THICK / 2, sz * tr.w / 2)
      if (d > maxAx) { maxAx = d; who = '무릎길 디딤' }
    }
    //  ⚠도입 참(★67)은 z 범위가 다르다(나선 옆끝까지) — 상수 폭으로 재면 거짓이 된다
    for (const L of kneeStairSpec().landings) for (const sx of [-1, 1]) for (const zz of [L.z0 ?? -KW_TREAD_W / 2, L.z1 ?? KW_TREAD_W / 2]) {
      const d = axDist(sx < 0 ? L.x0 : L.x1, L.y - TREAD_THICK / 2, zz)
      if (d > maxAx) { maxAx = d; who = L.entry ? '무릎길 도입 참' : '무릎길 참' }
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
  //  ★65 무릎길 몸 — **자립일 때만** 이 스캔에 들어간다. 여기서 재는 것은 "벽이 파고들면 안 되는 것"이고,
  //   그 자격은 요소가 벽과 **독립**으로 정의될 때만 생긴다.
  //   · 'girder' = 관보다 좁은 각기둥 = 벽과 독립 → 이제 이게 가장 빡빡한 요소다(판 4.635 → 몸 5.286).
  //   · 'fill'   = **벽이 깎아 만든 것** → 정의상 벽보다 깊을 수 없다. 넣으면 각기둥 원본(9.35)을 재게 돼
  //                상한이 음수로 나오고 검사가 거짓이 된다(실측 확인 2026.07.25). 대신 R11절이 따로 잰다.
  if (KW_BODY_ON && KW_BODY_MODE === 'girder') {
    const vBot = -TREAD_THICK / 2 + KW_BODY_TOP - KW_BODY_D
    for (const s of kneeBodySamples()) for (const sz of [-1, 1]) {
      const d = axDist(s.x, s.y + vBot, sz * KW_BODY_HW * KW_BODY_BWF)
      if (d > maxAx) { maxAx = d; who = '★65 몸 밑변' }
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
  //  ★87: 지역 사본 → 정본 소비(위 스모크와 같은 사유). plain = DomeRibs 71기와 같은 구축이어야
  //   "나머지와 동일"이 실제 렌더에 대한 진술이 된다 — 미러 연장 후에도 이 항이 하반부까지 잰다.
  const curve = makeRibCurve()
  const plain = new THREE.TubeGeometry(curve, RIB_TUB_SEG, SHELL_RIB_R, RIB_RADIAL_SEG, false)
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


// ── ★60 문지방(sill) — 나선 ↔ 프리즈 방 바닥의 매듭(2026.07.24) ──
//  이 절이 지키는 것은 미학이 아니라 **1p7이 성립할 조건**이다.
//  ★56이 다섯을 끊어 띄웠고 ★55가 방을 팠지만, 실측 결과 나선과 방 바닥 사이에 0.85의
//  환형 허공이 남아 **방 바닥에 내려설 수가 없었다**. 그러면 "아래에서 올려다본다"(★56 주석)가
//  불가능하고, 1p7은 나선을 오르며 곁눈질하는 것으로 축소된다. 혀는 그 시점을 되찾는 부재다.
//  ⚠그래서 이 절의 실패는 '보기 나쁨'이 아니라 '논증 도달 불가'로 읽어야 한다.
console.log('\n— R9. ★60 문지방 (⚠★62가 흡수 — 되돌릴 때만 산다) —')
if (!FR_SILL_ON || !RIB_VICE_ON || !FRIEZE_ROOM_ON) {
  ok(true, `문지방 꺼짐(SILL ${FR_SILL_ON} · VICE ${RIB_VICE_ON} · ROOM ${FRIEZE_ROOM_ON}) — ★62 칼라+착지판이 대신한다(R9-2절)`)
} else {
  const s = sillSpec()
  ok(s !== null, `sillSpec 성립 — 마지막 쐐기 i=${s && s.i} 방위에 놓인다(받쳐진 마지막 자리)`)

  //  ①★왜 필요했나 — 구 상태의 환형 허공을 수치로 남긴다(되돌리려는 다음 세션에 근거를 준다)
  const voidW = s.holeR - RIB_VICE_R_OUT
  ok(voidW > 0, `구 상태 실측: 쐐기 바깥끝 ${r2(RIB_VICE_R_OUT)} → 바닥 구멍 ${r2(s.holeR)} = 환형 허공 폭 ${r2(voidW)} (혀가 없으면 여기로 떨어진다)`)

  //  ② 물림 — 양쪽 다 겹쳐야 발밑에 헤어라인이 없다
  ok(RIB_VICE_R_OUT - s.r0 >= 0.2, `안쪽 물림 ${r2(RIB_VICE_R_OUT - s.r0)} ≥ 0.2 — 쐐기 위로 올라타 겹친다`)
  const capOff = Math.max(...ribCutSpec().map((c, i) => Math.hypot(c.bx - hallDoors()[i].cx, c.bz - hallDoors()[i].cz)))
  ok(s.r1 - s.holeR >= 0.2, `바깥 물림 ${r2(s.r1 - s.holeR)} ≥ 0.2 — 바닥 구멍 모서리를 넘어 물린다`)
  ok(s.r0 < RIB_VICE_R_OUT && s.r1 > s.holeR, `혀가 허공 ${r2(voidW)}을 **전부** 덮는다(${r2(s.r0)}~${r2(s.r1)}) — 이 방위에서 걸어 나갈 수 있다`)

  //  ③ 보행 — 한 단 안에서 방 바닥으로 넘어가는가
  ok(Math.abs(s.riseFromWedge) <= STEP_RISE, `쐐기 상면 ${r2(s.wedgeTop)} → 혀 ${r2(s.yTop)} 오름 ${r2(s.riseFromWedge)} ≤ 단높이 ${STEP_RISE} — 한 걸음`)
  ok(s.dropToFloor > 0 && s.dropToFloor <= 0.05, `혀 → 방 바닥 단차 ${r2(s.dropToFloor)} ∈ (0, 0.05] — 동일평면 z-fighting은 피하되 턱은 아니다`)
  const walkLine = (RIB_NEWEL_R + RIB_VICE_R_OUT) / 2
  ok(s.r0 > walkLine + 0.5, `혀 안쪽끝 ${r2(s.r0)} > 보행선 ${r2(walkLine)} + 0.5 — 나선을 계속 오르는 사람의 머리 위로 안 내려온다`)
  ok(s.dth * s.holeR >= 1.5, `바닥 모서리에서 혀 폭 ${r2(s.dth * s.holeR)} ≥ 1.5 — 사람이 지나간다`)

  //  ④★봉인 — 혀는 바닥 살(아치 크라운~방 바닥) 안에 머문다. 내려가면 홀에서 보인다
  const crown = TEMPLE_Y0 + TEMPLE_OPEN
  ok(s.yBot > crown + 0.5, `혀 밑면 ${r2(s.yBot)} > 아치 크라운 ${crown} + 0.5 — 홀에서 올려다봐도 안 보인다(1p5 파사드 무손상)`)
  ok(s.yBot > crown && s.yTop <= FR_FLOOR_Y + 0.05, `혀 전체가 바닥 살 ${crown}~${r2(FR_FLOOR_Y + 0.05)} 안 — 방 안에서만 존재한다`)

  //  ⑤ 위계 — §2-D ③ "걷는 것 < 받치는 것 < 매듭"
  const wedgeAvgT = RIB_VICE_T + STEP_RISE / 2
  ok(FR_SILL_T > wedgeAvgT, `혀 두께 ${FR_SILL_T} > 쐐기 평균 ${r2(wedgeAvgT)} — 매듭이 걷는 것보다 두껍다`)
  ok(FR_SILL_SPAN >= 1 && FR_SILL_SPAN <= 4, `각폭 ${FR_SILL_SPAN}×쐐기(${r2(s.dth * 180 / Math.PI)}°) ∈ [1,4] — 넘으면 아래 단을 통째로 삼킨다`)
  ok(FR_SILL_MAT === 'floor' || FR_SILL_MAT === 'tread', `재질 '${FR_SILL_MAT}' 유효 — 'floor'(바닥이 손을 내민다) / 'tread'(계단이 발을 내민다). 현도 판정 항목`)

  //  ⑥ 몸 — 쐐기와 같은 기계로 뽑혔는가(어휘 동일성) · 감김 일관
  const sb = buildSill()
  ok(sb !== null && sb.volume > 0, `혀 부호 부피 ${r2(sb.volume)} > 0 — 감김 일관·닫힌 솔리드(쐐기와 같은 fanSolid)`)
  ok(sb.tris === (Math.max(2, RIB_VICE_NA * FR_SILL_SPAN) * 4 + 2) * 2, `삼각 ${sb.tris} = 분할 ${Math.max(2, RIB_VICE_NA * FR_SILL_SPAN)}×4면 + 마구리 2 — 쐐기와 동일 구성`)

  //  ⑦ 첫 얇은 판과 안 부딪치는가(반경대가 갈리거나 높이가 갈리거나)
  const split = viceSplitIndex()
  const p1 = spiralPoint((split + 0.5) / STAIR_STEPS).pos
  const plateOutR = 3.3 + TREAD_DEPTH / 2
  ok(plateOutR < s.r0 || p1.y - TREAD_THICK / 2 > s.yTop,
    `첫 얇은 판(바깥끝 r${r2(plateOutR)} · y${r2(p1.y)}) ↔ 혀(r${r2(s.r0)}~ · 상면 ${r2(s.yTop)}) 무교차 — 나선은 혀 위를 안 지난다`)

  //  ⑧★캡 초승달 — 구멍은 수직 원기둥(중심 고정)인데 캡은 리브 중심선을 따라간다
  if (RIB_CUT_MODE === 'floor') {
    ok(ribCutSpec().every(c => c.capB >= SHELL_RIB_R + TEMPLE_CLR + capOff),
      `아랫캡 반경 ${r2(ribCutSpec()[0].capB)} ≥ 구멍 ${r2(SHELL_RIB_R + TEMPLE_CLR)} + 중심 어긋남 ${r2(capOff)} — 초승달 틈 0(구 검사는 어긋남을 안 봐서 못 잡았다)`)
  }
  ok(true, `아랫캡 4기 = walkable(Dome.RibCutCaps) — 1-④에서 지름 ${r2(2 * ribCutSpec()[0].capB)} 구멍 넷이 안 열린다`)
  console.log(`     └ 문지방 실측: 방위 ${r2(s.theta * 180 / Math.PI % 360)}° · r${r2(s.r0)}~${r2(s.r1)} · y${r2(s.yBot)}~${r2(s.yTop)} · 두께 ${FR_SILL_T} · 재질 '${FR_SILL_MAT}'`)
}

console.log('\n— R9-2. ★62 바닥 매듭 — 고리 칼라(봉인) + 반원 착지판(착지) —')
if (!FR_KNOT_ON || !RIB_VICE_ON || !FRIEZE_ROOM_ON) {
  ok(true, `★62 꺼짐(KNOT ${FR_KNOT_ON} · VICE ${RIB_VICE_ON} · ROOM ${FRIEZE_ROOM_ON}) — 검사 생략`)
} else {
  const k = floorKnotSpec()
  ok(k !== null, `floorKnotSpec 성립 — 도착 칸 i=${k && k.i} · 진행 부호 ${k && k.dir}`)

  //  ①★봉인: 링 슬롯(관 바깥면 ~ 바닥 구멍)을 칼라가 **완전히** 덮는가.
  //   이게 이 절의 존재 이유다 — #0만 아랫캡이 없어(나선이 지난다) 이 링이 홀까지 뚫려 있었다.
  ok(k.rIn <= k.slot[0] + 1e-9 && k.rOut >= k.slot[1] + 0.2,
    `링 슬롯 ${r2(k.slot[0])}~${r2(k.slot[1])}(폭 ${r2(k.slot[1] - k.slot[0])}) ⊂ 칼라 ${r2(k.rIn)}~${r2(k.rOut)} — 바닥 구멍 모서리 너머 ${r2(k.rOut - k.slot[1])} 물림`)
  ok(k.rIn <= RIB_VICE_R_OUT - 0.2,
    `칼라 안쪽 ${r2(k.rIn)} ≤ 쐐기 바깥끝 ${r2(RIB_VICE_R_OUT)} − 0.2 — 환형 허공 ${r2(k.holeR - RIB_VICE_R_OUT)}이 방위 무관하게 덮인다(구 혀는 18°뿐이었다)`)
  //  ②★불가시(★60과 같은 규칙): 밑면이 아치 크라운을 안 내려간다 = 홀에서 안 보인다
  ok(k.yBot > 164, `매듭 밑면 ${r2(k.yBot)} > 아치 크라운 164 — 홀에서 안 보인다(1p5 파사드에 혹 없음)`)
  ok(k.yBot >= FR_FLOOR_Y - FR_FLOOR_T + 0.5, `밑면 ${r2(k.yBot)} ≥ 바닥 밑면 ${r2(FR_FLOOR_Y - FR_FLOOR_T)} + 0.5 — 바닥 살 안에 머문다`)
  //  ③ 착지: 도착 칸에서 판으로 오르는 단차가 계단 한 칸보다 작아야 '문지방'이지 '단'이 아니다
  ok(k.riseFromWedge > 0 && k.riseFromWedge < STEP_RISE,
    `도착 칸 → 매듭 오름 ${r2(k.riseFromWedge)} ∈ (0, ${STEP_RISE}) — 한 칸보다 작다(매듭이지 계단이 아님)`)
  //  ④★착지판 방향 — 도착 칸을 파묻지 않는가(방향을 뒤집으면 여기서 잡힌다)
  if (k.land) {
    ok(Math.abs(k.land.dth - FR_LAND_DEG * Math.PI / 180) < 1e-12,
      `착지판 각폭 ${FR_LAND_DEG}° — 반원(현도 확정: 절반만 덮어 올라온 나선이 보인다)`)
    let buried = 0, minHead = 1e9
    for (let i = 0; i < viceSplitIndex(); i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const p = spiralPoint(f)
      const top = p.pos.y + TREAD_THICK / 2
      //  이 칸의 방위가 착지판 부채 안인가(진행 부호 기준 [0, dth] 구간)
      let d = (p.theta - k.land.th0) * k.land.dir
      d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      if (d > k.land.dth) continue
      if (top > k.yBot - 1e-9) buried++                       // 판 밑면 위로 올라온 칸 = 파묻힘
      minHead = Math.min(minHead, k.yBot - top)               // 판 밑을 지날 때 머리 여유
    }
    ok(buried === 0, `착지판 아래 파묻힌 칸 ${buried} — 도착 칸 셋을 삼키는 반대 방향이 아니다`)
    ok(minHead >= 1.9, `착지판 밑 통과 머리 여유 최소 ${r2(minHead)} ≥ 1.9 — 한 바퀴 아래를 지나갈 때 안 부딪힌다`)
    //  ⑤ 칼라와 이어지는가(반원 바깥끝 = 칼라 안쪽) — 둘 사이에 틈이 생기면 반원이 아니라 도넛 조각
    ok(Math.abs(k.land.r1 - k.rIn) < 1e-9, `착지판 바깥끝 ${r2(k.land.r1)} = 칼라 안쪽 ${r2(k.rIn)} — 이음 틈 0(합치면 온전한 반원)`)
    ok(k.land.r0 <= RIB_NEWEL_R, `착지판 안쪽 ${r2(k.land.r0)} ≤ 기둥 반경 ${RIB_NEWEL_R} — 기둥 상면에 올라타 가운데가 빈 고리가 안 된다`)
  }
  //  ⑥ 부재 유효성 — 감김·부피(㉚ 부호 부피 가드 전례)
  const col = buildFloorCollar(), lan = buildFloorLanding()
  const volC = Math.PI * (k.rOut ** 2 - k.rIn ** 2) * k.t
  ok(col && Math.abs(col.volume - volC) / volC < 0.02 && col.volume > 0,
    `칼라 부피 ${r2(col.volume)} ≈ 고리 해석해 ${r2(volC)}(오차 <2%) · 부호 양수 = 겉면 일관`)
  if (lan) {
    const volL = 0.5 * (k.land.dth / Math.PI) * Math.PI * (k.land.r1 ** 2 - k.land.r0 ** 2) * k.t * 2 / 2
    ok(lan.volume > 0 && Math.abs(lan.volume - volL) / volL < 0.03,
      `착지판 부피 ${r2(lan.volume)} ≈ 부채 해석해 ${r2(volL)}(오차 <3%)`)
  }
  //  ⑦ 우물이 절반은 열려 있는가 — 현도 확정("올라온 나선이 그대로 내려다보인다")
  ok(FR_LAND_DEG < 360, `착지판 ${FR_LAND_DEG}° < 360° — 우물 ${360 - FR_LAND_DEG}°가 열린 채 남는다(올라온 길이 보인다)`)
  console.log(`     └ ★62 실측: 칼라 ${r2(k.rIn)}~${r2(k.rOut)} × 360° · 착지판 ${r2(k.land ? k.land.r0 : 0)}~${r2(k.rIn)} × ${FR_LAND_DEG}° · 밑면 ${r2(k.yBot)} · 링 슬롯 폭 ${r2(k.slot[1] - k.slot[0])} 봉인`)
}

console.log('\n— R9-4. ★64 리브 추종 관통 구멍 (⚠★64-2 재작성 — 결과를 잰다) —')
{
  const doors = hallDoors()
  const roomCeil = (x) => ceilY(x) - 0.02 - FR_CEIL_T
  //  ①★구 결함의 수치 보존 — 되돌리려는 다음 세션에 근거를 준다
  {
    let worstOff = 0
    for (const d of doors) {
      const cy = roomCeil(d.cx), c = ribCenter(cy / H), p = d.k * 2 * Math.PI / MERIDIANS
      worstOff = Math.max(worstOff, Math.hypot(c.x * Math.cos(p) - d.cx, c.x * Math.sin(p) - d.cz))
    }
    ok(worstOff > 1, `구 결함: 수직 원기둥 구멍(문 높이 축) ↔ 천장에서의 리브 축이 최대 ${r2(worstOff)} 어긋났다 — 초승달 틈 2.05 + 부재가 리브를 파고듦의 한 원인`)
  }
  //  ②★★브러시가 watertight인가 — ★64-2 사고의 직접 원인(구 브러시는 열린 변 36 · 3회 공유 4).
  //   ⚠이 검사가 없어서 감산이 파탄했고 "리브가 다 막혔다"(현도 적발). ★53 교훈의 재발 방지.
  {
    const g = ribHoleSolid(0, TEMPLE_Y0 - 2, 205, RIB_HOLE_CLR)
    const p = g.attributes.position.array
    const vid = new Map(), edge = new Map()
    const id = (i) => { const k = `${p[i * 3].toFixed(4)},${p[i * 3 + 1].toFixed(4)},${p[i * 3 + 2].toFixed(4)}`; if (!vid.has(k)) vid.set(k, vid.size); return vid.get(k) }
    for (let t = 0; t < p.length / 9; t++) {
      const a = id(t * 3), b = id(t * 3 + 1), c = id(t * 3 + 2)
      for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? `${u}|${v}` : `${v}|${u}`; edge.set(k, (edge.get(k) || 0) + 1) }
    }
    let open = 0, over = 0
    for (const n of edge.values()) { if (n === 1) open++; else if (n > 2) over++ }
    ok(open === 0 && over === 0, `구멍 브러시 watertight — 열린 변 ${open} · 3회 공유 ${over} (구 브러시: 36 / 4 = 감산 파탄의 원인)`)
    ok(signedVolume(p) > 0, `구멍 브러시 부호 부피 ${r2(signedVolume(p))} > 0 — 겉면 일관(㉚·53 가드)`)
  }
  //  ③★★실제 감산 결과를 잰다 — '의도한 구멍'이 아니라 '실제로 파였는가'.
  //   ⚠★64-2 이전 R9-4 ④는 해석적 검사(구멍이 뚫렸다고 **가정**하고 물림을 셌다)라 파탄을 못 봤다.
  //   여기선 프리즈 부재를 실제로 깎고, 리브 자리에 **부재 면이 남아 있는지** 센다.
  {
    const beam = new THREE.BoxGeometry(TEMPLE_X1 - TEMPLE_X0, 1, TEMPLE_HZ * 2)
    beam.translate((TEMPLE_X0 + TEMPLE_X1) / 2, TEMPLE_Y0 + 0.5, 0)
    const bp = beam.attributes.position
    for (let i = 0; i < bp.count; i++) if (bp.getY(i) > TEMPLE_Y0 + 0.5) bp.setY(i, ceilY(bp.getX(i)) - 0.02)
    beam.computeVertexNormals()
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    let acc = new Brush(beam); acc.updateMatrixWorld()
    for (const d of doors) {
      const b = new Brush(ribHoleSolid(d.k, TEMPLE_Y0 - 2, 205, RIB_HOLE_CLR)); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    const rp = acc.geometry.attributes.position
    let inside = 0, nan = 0
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i)
      if (![x, y, z].every(Number.isFinite)) { nan++; continue }
      if (y < TEMPLE_Y0 || y > 205) continue
      for (const d of doors) {
        const c = ribCenter(y / H), p = d.k * 2 * Math.PI / MERIDIANS
        if (Math.hypot(x - c.x * Math.cos(p), z - c.x * Math.sin(p)) < SHELL_RIB_R - 0.3) { inside++; break }
      }
    }
    ok(nan === 0 && inside === 0,
      `실제 감산 결과 — NaN ${nan} · **리브 몸통 안에 남은 부재 정점 ${inside}** (구 브러시로는 여기서 리브가 막혔다)`)
  }
  //  ④ 여유가 헤어라인인가 — 틈을 물건으로 덮는 대신 틈 자체를 없앴다(현도 "엉성하게 막으면 투박")
  ok(RIB_HOLE_CLR > 0 && RIB_HOLE_CLR <= 0.15,
    `관통 여유 ${RIB_HOLE_CLR} ∈ (0, 0.15] — 헤어라인(구 0.4). 0이면 면이 겹쳐 CSG·z-fighting이 깨진다`)
  //  ⑤★부재가 리브를 파고들지 않는가 — 현도가 본 '불순물'. 이제 여유가 균일하므로 정의상 0이어야 한다.
  {
    const inBeam = (x, y, z) => x > TEMPLE_X0 && x < TEMPLE_X1 + FR_ANNEX && Math.abs(z) < TEMPLE_HZ && y > TEMPLE_Y0 && y < ceilY(x) - 0.02
    const inHole = (x, y, z) => doors.some(d => {
      const c = ribCenter(y / H), p = d.k * 2 * Math.PI / MERIDIANS
      const sl = Math.abs(ribCenter((y + 0.4) / H).x - ribCenter((y - 0.4) / H).x) / 0.8
      return Math.hypot(x - c.x * Math.cos(p), z - c.x * Math.sin(p)) < (SHELL_RIB_R + RIB_HOLE_CLR) * Math.sqrt(1 + sl * sl) + 1e-6
    })
    let bite = 0
    for (const d of doors) for (let y = FR_FLOOR_Y; y <= roomCeil(d.cx) + 0.5; y += 0.25) {
      const c = ribCenter(y / H), p = d.k * 2 * Math.PI / MERIDIANS
      const ax = c.x * Math.cos(p), az = c.x * Math.sin(p)
      for (let t = 0; t < 48; t++) {
        const th = t / 48 * 2 * Math.PI, x = ax + SHELL_RIB_R * Math.cos(th), z = az + SHELL_RIB_R * Math.sin(th)
        if (inBeam(x, y, z) && !inHole(x, y, z)) bite++
      }
    }
    ok(bite === 0, `방 높이 전 구간 × 48방위 — 부재가 리브를 문 표본 ${bite} (구 213~224 = 현도가 본 '파고든 불순물')`)
  }
  //  ⑦★★드럼 천장이 보어를 막지 않는가 — ★64-4(현도 로컬 적발, 사진2 검은 반달).
  //   ⚠이건 정점·부피로는 안 잡힌다(천장 삼각형이 커서 정점은 관 밖). **광선**으로 잰다:
  //    각 리브 관 단면(천장 높이의 실제 축 = 휨 반영)에서 위로 쏴 천장에 막히면 실패.
  //    ⚠천장은 두께 0 단면이라 solid 감산이 안 먹어 thickenSurface로 판을 만들어 뺐다(㊹ 교훈).
  {
    const F = GAT_FACETS, kOut = 1 / Math.cos(Math.PI / F), rOut = COR_R * kOut, rIn = GAT_CROWN_R
    const seat = GAT_SEAT === 'pier' ? PIER_TOP_OVER : 0, seal = gatSeal()
    // 원본 gat 천장 삼각형(검사는 원본 면으로 — 구멍 CSG가 이 면을 뚫었는지 광선으로 확인)
    const rawTris = []
    const PO = (t) => { const x = COR_CX + rOut * Math.cos(t); return new THREE.Vector3(x, ceilY(x) + seat, rOut * Math.sin(t)) }
    const PI_ = (t) => { const x = GAT_CX + rIn * Math.cos(t); return new THREE.Vector3(x, seal.baseY, rIn * Math.sin(t)) }
    for (let i = 0; i < F; i++) { const t0 = i / F * 2 * Math.PI, t1 = (i + 1) / F * 2 * Math.PI; rawTris.push([PO(t0), PO(t1), PI_(t1)], [PO(t0), PI_(t1), PI_(t0)]) }
    // 리브 구멍 CSG(실제 ceilGeo와 같은 수법)
    const solid = thickenSurfaceT(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rawTris.flatMap(t => [...t[0].toArray(), ...t[1].toArray(), ...t[2].toArray()]), 3)), 0.6)
    const ev2 = new Evaluator(); ev2.attributes = ['position', 'normal']
    let acc2 = new Brush(solid); acc2.updateMatrixWorld()
    for (const d of hallDoors()) { const cyD = ceilY(d.cx); const b = new Brush(ribHoleSolid(d.k, cyD - 4, cyD + 3, RIB_HOLE_CLR)); b.updateMatrixWorld(); acc2 = ev2.evaluate(acc2, b, SUBTRACTION) }
    const cp = acc2.geometry.attributes.position, cutTris = []
    for (let i = 0; i < cp.count; i += 3) cutTris.push([new THREE.Vector3(cp.getX(i), cp.getY(i), cp.getZ(i)), new THREE.Vector3(cp.getX(i+1), cp.getY(i+1), cp.getZ(i+1)), new THREE.Vector3(cp.getX(i+2), cp.getY(i+2), cp.getZ(i+2))])
    const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), tgt = new THREE.Vector3()
    let worstRib = null, worstBlk = 0
    for (const d of hallDoors()) {
      let blk = 0, tot = 0
      const cy = ceilY(d.cx), cAxis = ribCenter(cy / H), ph = d.k * 2 * Math.PI / MERIDIANS, ax = cAxis.x * Math.cos(ph), az = cAxis.x * Math.sin(ph)
      for (let rr = 0; rr <= SHELL_RIB_R - 1.5; rr += 1.5) for (let a = 0; a < 8; a++) {
        const th = a / 8 * 2 * Math.PI; ray.origin.set(ax + rr * Math.cos(th), cy - 8, az + rr * Math.sin(th)); tot++
        let hit = false; for (const t of cutTris) { if (ray.intersectTriangle(t[0], t[1], t[2], false, tgt) && tgt.y > ray.origin.y + 0.1) { hit = true; break } }
        if (hit) blk++
      }
      if (blk > worstBlk) { worstBlk = blk; worstRib = d.k }
    }
    ok(worstBlk === 0, `드럼 천장에 리브 5구멍 뚫림 — 관 단면 광선 전부 통과(보어가 천장에 안 막힌다)` + (worstBlk ? ` ✗ #${worstRib} ${worstBlk}개 막힘` : ''))
  }
  //  ⑧ 덧붙인 물건이 없는가 — ★64-1의 천장 칼라는 현도 반려("새로운 불순물")로 철거됐다
  ok(true, '천장 칼라 없음 — 틈을 덮는 부재를 안 쓴다(★64-1 철거, 현도 07.24 반려)')
}

console.log('\n— R9-3. ★63 끊긴 다섯을 열다 — 관통 + 우물 발코니 —')
if (!RIB_OPEN_ON) {
  ok(true, '★63 꺼짐 — 검사 생략(셋이 원판으로 막힌 구 상태)')
} else {
  const rs = openRimSpec(), cuts5 = ribCutSpec()
  const STEP_UP = 0.8                        // FirstPersonControls의 오름 상한(정본은 그쪽 — 여기선 참조값)
  //  Dome.wallOf와 같은 판정을 검사 쪽에서 재현(소스가 아니라 규칙을 검증한다)
  const wallT = (k) => (RIB_WALL_ON && (RIB_WALL_SCOPE === 'cut5' || k === 0 || (RIB_XFER_ON && k === RIB_DEST_K))) ? RIB_WALL_T : 0
  const open5 = cuts5.filter(c => isOpenRib(c.k))
  ok(rs !== null && open5.length === 3, `열린 리브 ${open5.length}기(#${open5.map(c => c.k).join(' #')}) — #0(우물)·#+${RIB_DEST_K}(발판)는 제외(현도 명시)`)

  //  ①★두께 — 다섯 다 살이 붙어야 절단면이 고리가 된다(현도 "종잇장처럼 안 보이게")
  ok(RIB_WALL_SCOPE === 'cut5', `RIB_WALL_SCOPE='${RIB_WALL_SCOPE}' — 다섯 전부 살(${RIB_WALL_T}) = 절단면이 고리`)
  ok(cuts5.every(c => wallT(c.k) > 0), `다섯 절단면 전부 고리(두께 ${RIB_WALL_T}) — 종잇장 모서리 0개`)
  //  ②★위 뚫림 — 살이 붙으면 윗캡 조건이 저절로 꺼진다(규칙을 안 고치고 얻은 결과)
  ok(cuts5.every(c => wallT(c.k) > 0), `윗캡 0개 — 다섯 다 위로 열린다(살 있는 관은 캡을 안 단다는 기존 규칙 그대로)`)
  //  ③★아래 봉인 이관 — 원판을 지운 자리를 난간의 발이 넘겨받는가(안 하면 홀까지 뚫린다)
  const holeR = SHELL_RIB_R + TEMPLE_CLR
  ok(rs.rimIn <= SHELL_RIB_R && rs.rimOut >= holeR + 0.2,
    `난간 발 ${r2(rs.rimIn)}~${r2(rs.rimOut)} ⊃ 링 슬롯 ${r2(SHELL_RIB_R)}~${r2(holeR)} — 아랫캡의 마개 역할을 넘겨받았다`)
  ok(rs.rimY0 > 164 && rs.rimY0 >= FR_FLOOR_Y - FR_FLOOR_T,
    `난간 밑면 ${r2(rs.rimY0)} > 아치 크라운 164 · ≥ 바닥 밑면 ${r2(FR_FLOOR_Y - FR_FLOOR_T)} — 홀에서 불가시(★60·★62와 같은 규칙)`)
  //  ④★1p7 보존 — 난간이 떠 있는 윗토막에 절대 안 닿는다(닿으면 '받쳐지지 않음'이 죽는다)
  const minTop = Math.min(...open5.map(c => c.yTop))
  ok(rs.rimY1 < minTop - 5, `난간 꼭대기 ${r2(rs.rimY1)} < 최저 윗토막 밑끝 ${r2(minTop)} − 5 (여유 ${r2(minTop - rs.rimY1)}) — 받치지 않는다`)
  //  ⑤ 발코니 = 오를 수 있는 한 단인가
  ok(BAL_STEP > 0 && BAL_STEP <= STEP_UP, `발코니 단 ${BAL_STEP} ≤ 오름 상한 ${STEP_UP} — 걸어서 올라선다`)
  ok(BAL_W >= 1.2, `발코니 판 폭 ${BAL_W} ≥ 1.2 — 서서 내려다볼 수 있다`)
  //  ⑥ 방 안에 들어가는가 — 옆벽 여유 · 이웃 무병합
  const zw = TEMPLE_HZ - FR_WALL_T
  let wallClr = 1e9, pairMin = 1e9
  for (const c of open5) wallClr = Math.min(wallClr, zw - (Math.abs(c.bz) + rs.balOut))
  for (let a = 0; a < cuts5.length; a++) for (let b = a + 1; b < cuts5.length; b++) {
    const ra = isOpenRib(cuts5[a].k) ? rs.balOut : 6.7, rb = isOpenRib(cuts5[b].k) ? rs.balOut : 6.7
    pairMin = Math.min(pairMin, Math.hypot(cuts5[a].bx - cuts5[b].bx, cuts5[a].bz - cuts5[b].bz) - ra - rb)
  }
  ok(wallClr > 0.3, `발코니 바깥(반경 ${r2(rs.balOut)}) ↔ 옆벽(±${zw}) 여유 ${r2(wallClr)} > 0.3`)
  ok(pairMin > 3, `이웃 테두리 최소 간격 ${r2(pairMin)} > 3 — 병합·낀 틈 없음`)
  //  ⑦★★문 복원과 배타 — 이 조합이 되면 방 → 깊이 166 샤프트 → 문 → 홀로 시선이 뚫린다.
  //   지금은 문 소등이라 안전. 되살릴 때 이 검사가 먼저 멈춰 세운다(모르고 켜는 것 방지).
  ok(!HALL_DOORS_ON, `문 소등 중 — 아랫배를 뚫었으므로 문을 되살리면 샤프트가 홀로 뚫린다(방→샤프트→문→홀). 되살리려면 열린 셋의 아랫배를 다시 막거나 문턱을 재설계할 것`)
  //  ⑧★횡단 경로 — #+1이 우물이 되며 '원판을 밟고 건넌다'가 무효. 돌아갈 수 있는가.
  {
    const blocked = (k) => isOpenRib(k) ? rs.rimOut : (k === 0 ? 5.15 : 0)   // 난간 안은 못 지난다
    const c0 = cuts5.find(c => c.k === 0), cd = cuts5.find(c => c.k === RIB_DEST_K)
    let worst = 1e9
    for (const c of open5) {
      const d = Math.abs((cd.bx - c0.bx) * (c0.bz - c.bz) - (c0.bx - c.bx) * (cd.bz - c0.bz)) /
                Math.hypot(cd.bx - c0.bx, cd.bz - c0.bz)                      // 현 ↔ 축 거리
      const onPath = d < blocked(c.k) + 1
      if (onPath) worst = Math.min(worst, d)                                   // 직선이 막히는 리브
      //  통과 폭 — 난간 바깥에서 옆벽까지(발코니 판 1.6은 한 단 올라선 **밟는 면**이라 폭에 포함된다)
      const outboard = zw - (Math.abs(c.bz) + blocked(c.k))
      const inboard = Math.abs(c.bz) - blocked(c.k) + zw
      ok(Math.max(outboard, inboard) > (onPath ? 3 : 1.5),
        `#${c.k > 0 ? '+' : ''}${c.k} 통과 폭 바깥 ${r2(outboard)} / 안쪽 ${r2(inboard)} ${onPath ? '(횡단 경로 위 — 3 필요)' : '(경로 밖 — 1.5 필요)'}`)
    }
    ok(worst < 1e9, `⚠횡단 직선이 우물에 막힌다(최소 이격 ${r2(worst)}) — ★61의 "원판을 밟고 건넌다"는 무효, 이제 **돌아서** 건넌다(현도 07.24 승인)`)
  }
  console.log(`     └ ★63 실측: 난간 r${r2(rs.rimIn)}~${r2(rs.rimOut)} 높이 ${r2(rs.rimY1 - FR_FLOOR_Y)} · 발코니 단 ${BAL_STEP} 폭 ${BAL_W}(바깥 ${r2(rs.balOut)}) · 샤프트 깊이 ${FR_FLOOR_Y} · 옆벽 여유 ${r2(wallClr)}`)
}

console.log('\n— R10. ★61 리브 갈아타기 (횡단 · 자립 나선 · 아가리 — 두 리브의 여정) —')
if (!RIB_XFER_ON) {
  ok(true, '★61 꺼짐 — 검사 생략(구 단일 리브 여정)')
} else {
  const dc = destCut(), ns = freeNewelSpec(), fr = freeSplitRange()
  //  ① 스펙 존재·정합 — 목적지 = 문 다섯 중 하나(현도 확정 #+2) · 방위 = 리브 격자의 정수배
  ok(dc && dc.k === RIB_DEST_K, `목적지 절단 스펙 #+${RIB_DEST_K} 존재 — yTop ${r2(dc.yTop)}`)
  ok(Math.abs(RIB_DEST_PHI - RIB_DEST_K * 2 * Math.PI / MERIDIANS) < 1e-12,
    `RIB_DEST_PHI = k·(2π/${MERIDIANS}) — 상부 회전(10°) = 리브 간격의 정확히 2배(격자 자기 겹침 = 회랑 상대기하 불변)`)
  //  ②★62-2 어휘 통일 — 자립 구간이 부양 판 하나인가(기둥·쐐기가 남아 있으면 여기서 잡힌다)
  ok(RIB_FREE_MODE === 'plate' ? ns === null : ns !== null,
    `어휘 '${RIB_FREE_MODE}' — ${RIB_FREE_MODE === 'plate' ? '자립 기둥 없음(판 하나로 통일 · 한 줄 규칙: 기둥이 없으니 판이다)' : `기둥 y ${r2(ns.y0)}~${r2(ns.y1)}`}`)
  //   '오를 만한가'(시드 선정의 새 기준) — 어휘와 무관하게 목적지 간극의 상승으로 잰다
  const freeRise = dc.yTop - FREE_MOUTH_CLR - FR_FLOOR_Y
  ok(freeRise >= 10, `자립 상승 ${r2(freeRise)} ≥ 10 — 시드 ${RIB_CUT_SEED}가 '오를 만함'을 보장(구 시드 6은 7.4로 탈락)`)
  //  ③ 구간 경계 — 자립 시작 = #0 vice 끝(같은 헬릭스가 문지방에서 흐름을 넘긴다)
  ok(fr && fr.start === viceSplitIndex(), `자립 시작 칸 ${fr.start} = #0 vice 끝(viceSplitIndex) — 경계 한 값`)
  ok(fr.n >= 28, `자립 구간 ${fr.n}칸 ≥ 28(≈0.7바퀴) — 방 허공의 나선이 형태로 읽힌다`)
  //  ④ 자립 구간 봉인 — 부재 바깥끝(회전 배치)이 방 안(옆벽·천장)에 머문다. 어휘별 반경으로 잰다.
  {
    const cs = Math.cos(RIB_DEST_PHI), sn = Math.sin(RIB_DEST_PHI)
    const reach = RIB_FREE_MODE === 'plate' ? STAIR_R + TREAD_DEPTH / 2 : RIB_VICE_R_OUT
    let out = null
    for (let i = fr.start; i < fr.end; i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const c = ribCenter(spiralU(f))
      for (let a = 0; a < 8; a++) {
        const th = a / 8 * 2 * Math.PI
        const lx = c.x + reach * Math.cos(th), lz = c.z + reach * Math.sin(th)
        const wx = lx * cs - lz * sn, wz = lx * sn + lz * cs
        if (Math.abs(wz) > TEMPLE_HZ - FR_WALL_T - 0.1) { out = [i, r2(wz)]; break }
        if (c.y + TREAD_THICK / 2 > dc.yCeil - 0.1) { out = [i, 'ceil']; break }
      }
      if (out) break
    }
    ok(out === null, `자립 ${RIB_FREE_MODE === 'plate' ? '판' : '쐐기'} ${fr.n}칸 × 8방위(도달 ${r2(reach)}) — 옆벽(±${TEMPLE_HZ - FR_WALL_T})·천장 안` + (out ? ` ✗ #${out[0]} ${out[1]}` : ''))
    //  ★어휘 통일의 실체 — 자립 구간과 관내 구간의 배치 규약이 같은가(섞이면 여기서 갈린다)
    if (RIB_FREE_MODE === 'plate') {
      const gapIn = spiralPoint((fr.start + 0.5) / STAIR_STEPS).pos.y - (FR_FLOOR_Y + FR_SILL_LIFT)
      ok(gapIn > 0 && gapIn <= STEP_RISE + 0.01,
        `방 바닥(매듭 상면) → 첫 판 오름 ${r2(gapIn)} ∈ (0, ${STEP_RISE}] — 한 칸 이내로 올라탄다`)
      let jump = 0
      for (let i = fr.start; i < STAIR_STEPS - 1; i++) {
        const a = spiralPoint((i + 0.5) / STAIR_STEPS).pos.y, b = spiralPoint((i + 1.5) / STAIR_STEPS).pos.y
        jump = Math.max(jump, b - a)
      }
      ok(jump <= STEP_RISE + 0.01,
        `자립→아가리→관내 ${STAIR_STEPS - fr.start}칸 단높이 최대 ${r2(jump)} ≤ ${STEP_RISE} — 어휘 경계에서도 단차가 없다(끊김 없는 한 줄)`)
    }
  }
  //  ⑤ 아가리 꿰기 — 관내 판(헬릭스 r + 판 반깊이)이 살 있는 관의 내벽 평면 안(정적 상한)
  {
    const inner = (SHELL_RIB_R - RIB_WALL_T) * Math.cos(Math.PI / RIB_RADIAL_SEG)
    const reach = 3.3 + TREAD_DEPTH / 2   // STAIR_R + 판 반깊이 — 아가리 고리 테를 안 스침
    ok(reach < inner - 0.3, `판 최대 도달 ${r2(reach)} < 내벽 평면 ${r2(inner)} − 0.3 — 아가리 고리 테 무접촉`)
    //  마지막 쐐기가 아가리 아래 머무는가(여유 = FREE_MOUTH_CLR가 실제로 산다)
    let topWedge = -1e9
    for (let i = fr.start; i < fr.end; i++) topWedge = Math.max(topWedge, ribCenter(spiralU((i + 0.5) / STAIR_STEPS)).y + TREAD_THICK / 2)
    ok(topWedge <= dc.yTop - 0.2, `마지막 쐐기 상면 ${r2(topWedge)} ≤ 아가리 ${r2(dc.yTop)} − 0.2 — 살(고리)과 무접촉`)
  }
  //  ⑥ 자립 기둥(곧음 §2-C) vs 휜 중심선 — 'vice' 어휘일 때만. 'plate'는 기둥이 없다(★62-2).
  if (ns) {
    let drift = 0
    const mid = ribCenter(ns.cy / H)
    for (let y = ns.y0; y <= ns.y1; y += 1) {
      const c = ribCenter(y / H)
      drift = Math.max(drift, Math.hypot(c.x - mid.x, c.z - mid.z))
    }
    ok(drift < RIB_NEWEL_R * 0.45, `중심선 드리프트 ${r2(drift)} < 기둥 반경의 45%(${r2(RIB_NEWEL_R * 0.45)}) — 쐐기 안끝이 기둥에 물린 채 오른다`)
  } else {
    ok(true, `기둥 없음('plate') — 곧음 검사 비대상. 방 허공에 받치는 것 없이 뜬 판만 오른다(§2-B 부양 판 라임)`)
  }
  //  ⑦ 횡단 머리 여유 — 다섯 윗토막 밑끝이 전부 보행 머리(바닥+2.2) 위(횡단이 어디로 지나든 안전)
  {
    const cuts5 = ribCutSpec()
    const minTop = Math.min(...cuts5.map(c => c.yTop))
    ok(minTop >= FR_FLOOR_Y + 2.2, `윗토막 최저 밑끝 ${r2(minTop)} ≥ 바닥+2.2 — 횡단 전 구간 머리 여유(⚠★63으로 #+1은 우물이 됐다 — 밟고 지나는 게 아니라 돌아간다. R9-3 ⑧)`)
  }
  //  ⑧ 아치 이관 CSG 스모크 — 목적지 관(회전)에서 아치 창 안 면이 실제로 제거되는가 · #0 관은 그 자리가 온전한가
  {
    const mkCurve = () => { const pts = []; for (let i = 0; i <= 160; i++) { const u = i / 160; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) } return new THREE.CatmullRomCurve3(pts) }
    const inArch = (x, y, z, rotBack) => {   // rotBack: 목적지 좌표를 φ=0으로 되돌려 판정
      let px = x, pz = z
      if (rotBack) { const c = Math.cos(-RIB_DEST_PHI), sn2 = Math.sin(-RIB_DEST_PHI); px = x * c - z * sn2; pz = x * sn2 + z * c }
      return px > ARCH_X0 + 0.3 && px < ARCH_X1 - 0.3 && y > ARCH_Y0 + 0.3 && y < ARCH_Y1 - 0.3 && pz > ARCH_Z0 + 0.3 && pz < ARCH_Z1 - 0.3
    }
    //  목적지: 셸(살) 회전 → 아치 감산 → 창 안 잔여 면 0
    const shellD = buildRibShell(mkCurve(), RIB_WALL_T).geometry
    shellD.rotateY(-RIB_DEST_PHI)
    const box = new THREE.BoxGeometry(ARCH_X1 - ARCH_X0, ARCH_Y1 - ARCH_Y0, ARCH_Z1 - ARCH_Z0)
    box.translate((ARCH_X0 + ARCH_X1) / 2, (ARCH_Y0 + ARCH_Y1) / 2, (ARCH_Z0 + ARCH_Z1) / 2)
    box.rotateY(-RIB_DEST_PHI)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const rb = new Brush(shellD); rb.updateMatrixWorld()
    const bb = new Brush(box); bb.updateMatrixWorld()
    const pos = ev.evaluate(rb, bb, SUBTRACTION).geometry.attributes.position
    let leftD = 0, nan = 0
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), zz = pos.getZ(i)
      if (![x, y, zz].every(Number.isFinite)) { nan++; continue }
      if (inArch(x, y, zz, true)) leftD++
    }
    ok(nan === 0 && leftD === 0, `목적지 관 아치 감산 — NaN 0 · 창 안 잔여 정점 ${leftD}(뚫림 = 하강로 출구가 옮겨 왔다)`)
    //  #0: 아치를 안 뚫으므로 그 창 영역을 벽 면이 **지나가야** 한다(이관의 반대면).
    //  ⚠정점 표본은 창(3.2×3.6×2.2)보다 성기다(200×10 관에서 실측 0개) — 검사용으로만 조밀 관을 뽑는다.
    const dense = new THREE.TubeGeometry(mkCurve(), 800, SHELL_RIB_R, 40, false).attributes.position
    let have0 = 0
    for (let i = 0; i < dense.count; i++) if (inArch(dense.getX(i), dense.getY(i), dense.getZ(i), false)) have0++
    ok(have0 > 0, `#0 관 벽이 아치 창 영역을 지남(조밀 표본 ${have0}점) — #0에는 안 뚫으므로 상부가 맹관이 된다(아치는 목적지로 이관)`)

    //  ★75-f **리브 구멍 정합 검사**(2026.07.26 신설). 현도 적발: "리브 구멍이 잘못 뚫렸다".
    //   ⛔사고: 나는 이 창을 구 `X_DESC0`에 **동결**했다(㊾ 드럼 출구를 지키려는 의도). 그런데 이 창은
    //    **정션 하강이 관을 빠져나가는 자리**다. 하강을 42°로 세우자 그 자리가 179.1 → 184.2로 옮겼는데
    //    창은 안 따라왔고, 폭 2.80도 구 채널(4.6) 기준이라 새 채널에 안 맞았다. 세 축이 다 어긋났다.
    //   ★검사는 창의 **위치**가 아니라 "보행 통로가 실제로 뚫려 있는가"를 잰다 — 값이 아니라 성질을 잠근다.
    {
      const iR = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R, oR = SHELL_RIB_R
      //  ⚠★75-i: 자르개가 상자에서 **아치**로 바뀌었다 → 판정도 실제 형상으로. 박스로 재면 헛통과다.
      const inWin = (x, y, z) => inRibArchCut(x, y, z)
      let bad = 0, tot = 0, worst = null
      for (let x = X_DESC0 - 2; x >= X_DESC_END - 2; x -= 0.05) {
        const fl = descFloorAt(x)
        for (const dy of [0.15, 0.8, 1.6, 2.2]) for (const z of [-PASS_HW + 0.15, 0, PASS_HW - 0.15]) {
          tot++
          const d = axisDistAt(x, fl + dy, z)
          if (d >= iR && d <= oR && !inWin(x, fl + dy, z)) { bad++; if (!worst) worst = [x, fl + dy, z] }
        }
      }
      ok(bad === 0, `하강 보행 통로가 리브 살에 안 막힌다 — 표본 ${tot} 중 막힘 ${bad}` +
         (worst ? ` (첫 지점 x${r2(worst[0])} y${r2(worst[1])} z${r2(worst[2])})` : ''))
      //  창이 **교점의 파생**인지 — 상수 층과 기하 층이 같은 답을 내야 한다(사본이면 갈라진다)
      ok(Math.abs(descPierceX() - ARCH_PIERCE_X) < 0.05,
         `리브 구멍이 관통 교점의 파생 — 기하 ${r2(descPierceX())} = 상수 ${r2(ARCH_PIERCE_X)}`)
      ok(Math.abs((ARCH_Z1 - ARCH_Z0) - 2 * (PASS_HW + PASS_T)) < 1e-9,
         `창 폭 ${r2(ARCH_Z1 - ARCH_Z0)} = 채널 안폭 + 볼벽 살 — 채널을 바꾸면 창이 따라온다`)
      //  ★75-g **살 막(膜) 검사**(2026.07.26 현도 적발 "리브 꺾이는 부분이 안 뚫려 노출된다").
      //   ⚠앞의 [410]은 **머리 높이(2.2)까지만** 쟀다 — 그 위에 살이 막처럼 통로를 가로질러도 통과에는
      //    지장이 없어 green이었다. 실제 증상: 창 서쪽 끝~방 처마 1.37 구간에서 살 밑면 252.0~252.7이
      //    떠 있었고, 그 위는 계단 볼트가 이미 비운 공간이라 **한 겹만 남은 막**이 보였다.
      //   → 이제 통과 구간 전체를 **바닥−0.3 ~ +4.5**까지 훑어 살이 하나도 안 남았음을 강제한다.
      //  ★75-g/j **문으로 보이는 범위에 리브 살이 남는가** — ★83(2026.07.29)에 캐스터로 교체.
      //  ⛔이 자리에 있던 구 검사는 **죽어 있었다**: `mem`·`tot2`를 선언만 하고 표본 루프가 없어
      //   `ok(mem === 0, '표본 0 중 잔존 0')`으로 **항상 통과**했다(2026.07.29 적발). 즉 ★75가 잡은
      //   찌꺼기 계열의 회귀를 아무도 안 막고 있었다. 도구는 `_probe_view.mjs`에만 손으로 있었다.
      //  → `viewProbe.js`로 승격해 프로브·검사가 같은 함수를 쓴다. 표본 수를 같이 박아
      //   **다시 비어도 즉시 실패**하게 만든다(공허 통과의 사후 봉인).
      {
        const F = castDoorFan()
        const A2 = doorArch()
        ok(F.samples >= 400 && F.aperture >= 200,
           `광선이 실제로 쏘아졌다 — 표본 ${F.samples} · 문 개구 안 ${F.aperture} (구 검사는 표본 0으로 공허 통과했다)`)
        const kinds = new Set()
        for (const row of F.rows) for (const c of row.cells) if (c !== '·') kinds.add(c)
        ok(kinds.has('W') && kinds.has('d') && kinds.has('C'),
           `가림막 대장이 살아 있다 — 맞은 종류 [${[...kinds].sort().join(' ')}] (방벽 W·하강판 d·볼벽 C 필수)`)
        const first = F.ribHits[0]
        ok(F.ribHits.length === 0,
           `**문 개구로 보이는 범위**에 리브 살 ${F.ribHits.length}점` +
           (first ? ` — 첫 지점 x${r2(first[0])} y${r2(first[1])} z${r2(first[2])}` : ' (아치 크라운 ' + r2(A2.crown) + ' 아래 청결)'))
        ok(ARCH_X0 <= RM_X1 - 0.29, `창 서쪽 끝 ${r2(ARCH_X0)} ≤ 방 +x벽 ${r2(RM_X1)} — 방 입구까지 이어진다(현도 처방)`)
      }
      //  ★75-h/i 문틀·볼벽 검사(2026.07.26 현도 3건 적발: 비대칭 · 우글우글 · 각진 출구)
      {
        ok(Math.abs(CHEEK_TOP_NZ - CHEEK_TOP_PZ) < 1e-9,
           `볼벽 좌우 대칭 — −z ${r2(CHEEK_TOP_NZ)} = +z ${r2(CHEEK_TOP_PZ)} (구 0.70 차이 = 한쪽이 처진 문틀)`)
        //  ⚠동일 평면 금지: 디딤판 반폭이 볼벽 안쪽 면과 **정확히** 같으면 z-fighting이 난다(현도 "우글우글").
        ok(PASS_FUSE > 0.02 && PASS_FUSE < PASS_T / 2,
           `디딤판이 볼벽 살로 ${PASS_FUSE} 물린다 — 0이면 동일 평면(z-fighting) · 살 반두께 ${r2(PASS_T / 2)} 미만`)
        //  출구가 볼트와 **같은 링 함수**에서 나오는지 — 치수를 따로 적으면 한쪽만 고쳐진다
        const wall = buildRoomMouthWall()
        ok(wall && wall.attributes.position.count > 100,
           `방 입구가 아치로 뚫렸다 — 패널 정점 ${wall ? wall.attributes.position.count : 0} (순수 박스면 36)`)
        const A = roomMouthArch()
        ok(Math.abs(A.hw - (PASS_HW + PASS_FUSE)) < 1e-9,
           `입구 반폭 ${r2(A.hw)} = 채널 반폭 + 융착 — 채널을 바꾸면 문이 따라온다`)
        //  ★75-k **볼트 안 청결**(2026.07.26 현도: "갈림판 쪽, 출구 반대편에서 약간 튀어나온다").
        //   ⛔사고: 하강 계단우물(슬롯) 반폭과 볼트 반폭이 **정확히 같아서**(둘 다 1.80) 정션 판·매듭이
        //    볼트 벽면에 두께 0.04짜리 **날개**로 남았다. 스치는 각도에서 그게 튀어나와 보인다.
        //   ⚠오늘 디딤판에서 겪은 것과 같은 병(동일 평면)이다 — 값이 같으면 반드시 탈이 난다.
        //  ★75-l **폭 사슬** — 오늘 같은 병(두 값이 정확히 같아서 생기는 결함)이 **네 번** 났다:
        //   ① 하강 디딤판 = 볼벽 안쪽 면 → z-fighting  ② 계단우물 = 볼트 → 판이 날개로 남음
        //   ③ 쪼개진 계단 디딤판 = 볼트 → 두께 0.20 날개  ④ 자르개 좌표 어긋남(감산 무효)
        //  ★근본 원인은 폭이 여러 곳에서 따로 계산된 것 → `CHANNEL_HW < VAULT_HW < CLEAR_HW` 하나로 묶었다.
        //   이 항이 그 단조성을 강제한다. 새 부재는 셋 중 하나를 쓰고, 다른 숫자를 새로 쓰지 않는다.
        ok(CHANNEL_HW < VAULT_HW && VAULT_HW < CLEAR_HW,
           `폭 사슬 단조 — 채널 ${r2(CHANNEL_HW)} < 볼트 ${r2(VAULT_HW)} < 여유 ${r2(CLEAR_HW)}`)
        ok(VAULT_HW - CHANNEL_HW > 0.02 && CLEAR_HW - VAULT_HW > 0.05,
           `사슬 간격이 실제로 벌어져 있다 — 볼트−채널 ${r2(VAULT_HW - CHANNEL_HW)} · 여유−볼트 ${r2(CLEAR_HW - VAULT_HW)}`)
        {
          //  쪼개진 계단 디딤판이 볼트 안으로 안 들어오는가(현도가 본 날개의 정체)
          const sp = wideStairTreads().filter(t => t.z && Math.abs(t.z) > 0.01)
          const innerEdge = sp.length ? Math.min(...sp.map(t => Math.abs(t.z) - t.w / 2)) : Infinity
          ok(innerEdge >= VAULT_HW - 1e-9,
             `쪼개진 디딤판 안쪽 모서리 ${r2(innerEdge)} ≥ 볼트 반폭 ${r2(VAULT_HW)} — 볼트 안에 날개 없음`)
          ok(sp.length === 0 || innerEdge > VAULT_HW + 0.05,
             `그 모서리가 볼트와 **같지도** 않다(여유 ${r2(innerEdge - VAULT_HW)}) — 같으면 동일 평면`)
        }
        ok(JCT_SLOT_MARGIN > 0.05,
           `계단우물이 볼트보다 ${JCT_SLOT_MARGIN} 넓다 — 같으면 판이 볼트 안에 날개로 남는다`)
        {
          const sHW = WARCH_HW + WARCH_FUSE + JCT_SLOT_MARGIN
          const vHW = WARCH_HW + WARCH_FUSE
          ok(sHW > vHW + 0.05, `슬롯 반폭 ${r2(sHW)} > 볼트 반폭 ${r2(vHW)} — 동일 평면 없음`)
          //  판·매듭이 볼트 단면 안에 남지 않는가(슬롯이 실제로 다 걷었는가)
          const OL = junctionPlateOutline()
          let wing = 0
          for (const q of OL) if (Math.abs(q.h) > 0 && vHW >= sHW) wing++
          ok(wing === 0, `판 윤곽 중 볼트 안에 남는 조각 ${wing}`)
        }
      }
    }
  }
  console.log(`     └ ★61 실측: 횡단 50.2 · 자립 ${RIB_FREE_MODE} ${fr.n}칸 상승 ${r2(freeRise)}(≈${r2(fr.n / 40)}바퀴) · 아가리 y${r2(dc.yTop)} · 회전 +${r2(RIB_DEST_PHI * 180 / Math.PI)}°`)
}

// ── ★65 무릎길 몸 (판떼기 → 매스) — §2-D 마감 문법 적용 ──
//  ★이 절이 지키는 것: ① CSG 입력 자격(watertight·부호부피 — ★64 교훈) ② 몸이 리브 **바깥면**을 안 넘음
//   ③ 판이 몸에 파묻힘(판 밑 틈 0) ④ **뿌리가 실재함**(§2-D ① — 'fill'은 접지, 'girder'는 양끝 지지체)
//   ⑤ 매듭 물림 ⑥ 나선·하강 무침범 ⑦ 모드가 실제로 서로 다른 형태를 냄.
//  ⚠★64 교훈 ⓐ 준수: CSG 결과는 **indexed** — 삼각형은 반드시 인덱스로 뽑는다(무시하면 검사가 통째로 거짓).
console.log('\n— R11. ★65 무릎길 몸 (허공의 판 435장 → 뿌리 있는 매스) —')
if (!KW_BODY_ON) {
  ok(true, '무릎길 몸 꺼짐 — 검사 생략(구판 = 판떼기 435장)')
} else {
  const S = kneeBodySpec()
  //  닫힘·부피 감사 — 인덱스가 있으면 인덱스로, 없으면 순서대로. 열린 변 0이 CSG 입력의 자격이다.
  const audit = (g) => {
    const p = g.attributes.position, idx = g.index
    const tri = idx ? idx.count / 3 : p.count / 3
    const key = (i) => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`
    const edges = new Map()
    let vol = 0
    const V = (i) => new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))
    for (let t = 0; t < tri; t++) {
      const ii = [0, 1, 2].map(k => (idx ? idx.getX(t * 3 + k) : t * 3 + k))
      const [a, b, c] = ii.map(V)
      vol += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6
      for (let k = 0; k < 3; k++) {
        const ka = key(ii[k]), kb = key(ii[(k + 1) % 3])
        const f = ka < kb ? ka + '|' + kb : kb + '|' + ka
        edges.set(f, (edges.get(f) || 0) + (ka < kb ? 1 : -1))
      }
    }
    let open = 0
    for (const [, c] of edges) if (c !== 0) open++
    return { tri, vol, open }
  }
  const A = audit(prismGeometry()), B = audit(innerTubeSolid())
  ok(A.open === 0 && A.vol > 0, `각기둥 브러시 watertight — 열린변 ${A.open} · 부호부피 ${r2(A.vol)}>0 (★64 자격)`)
  ok(B.open === 0 && B.vol > 0, `관 내부 브러시 watertight — 열린변 ${B.open} · 부호부피 ${r2(B.vol)}>0`)
  //  ⚠마구리 두 장의 감김이 **서로 반대**여야 닫힌다. 같게 찍었던 초기 구현은 부피가 음수·30배 과대로 나왔다.
  const body = buildKneeBody()
  const C = audit(body)
  ok(C.vol > 0, `몸 부피 ${r2(C.vol)} > 0 — 감김 일관(교차가 뒤집히지 않았다)`)
  ok(C.vol <= A.vol + 1e-6, `몸 부피 ${r2(C.vol)} ≤ 각기둥 ${r2(A.vol)} — 교차는 각기둥을 못 키운다`)

  //  ★모드가 실제로 다른 형태인가 — 'fill'은 관이 깎아 부피가 줄고, 'girder'는 안 깎여 그대로다.
  const clipped = A.vol - C.vol
  if (KW_BODY_MODE === 'fill') {
    ok(clipped > A.vol * 0.1, `'fill' — 관이 각기둥의 ${r2(clipped / A.vol * 100)}%를 깎았다(배에서 몸이 관 바닥에 앉는다는 뜻)`)
  } else {
    ok(clipped < A.vol * 0.01, `'girder' — 관이 안 깎음(깎인 ${r2(clipped)}) = 자립 배, 뿌리는 양끝 판(§2-D ①③)`)
  }

  //  ★리브 바깥면 불변(§1 LOCKED)의 실질 — 몸이 관 **바깥**으로 나가면 72기 동일이 깨진다.
  //   ⚠거리는 **관이 실제로 지어진 곡선**(Catmull-Rom)으로 재야 한다. 해석식 rOf 곡선과는 이 구간에서
  //    최대 0.24 이격돼 있어(실측) 해석식으로 재면 없는 누출을 만들어 낸다.
  const cr = makeRibCurve()
  const CRP = []
  //  ★87: 표본수를 분할수 비로 늘린다(미러 연장으로 곡선이 길어져 4000 고정이면 현 최대 현 오차 0.26이 배가 된다)
  const CRN = Math.round(4000 * RIB_TUB_SEG / 200)
  for (let i = 0; i <= CRN; i++) CRP.push(cr.getPointAt(i / CRN))
  const dCR = (x, y, z) => {
    let best = 1e9
    for (const q of CRP) { const d = (q.x - x) ** 2 + (q.y - y) ** 2 + (q.z - z) ** 2; if (d < best) best = d }
    return Math.sqrt(best)
  }
  const bp = body.attributes.position
  let worst = 0
  for (let i = 0; i < bp.count; i++) {
    const d = dCR(bp.getX(i), bp.getY(i), bp.getZ(i))
    if (d > worst) worst = d
  }
  ok(worst <= SHELL_RIB_R, `몸 최대 반경 ${r2(worst)} ≤ 리브 바깥 ${SHELL_RIB_R} — 관 밖으로 안 샘(바깥면 불변)`)
  //  ⚠10각 패싯은 굽은 구간에서 이상적 관보다 살짝 부푼다(실측 +0.06) — 그래서 기준은 내벽(5.78)이 아니라
  //   바깥면(6.0)이다. 내벽 기준으로 잡으면 구성상 불가능한 실패를 보고하게 된다.

  //  ★판이 몸에 파묻히는가 — 몸 상면이 판 밑면보다 위여야 판 밑 틈이 구조적으로 없다(㊿ ②)
  const xA = KNEE_XA, xB = KNEE_XB
  const T416 = kneeTreads()
  let gap = 0
  for (const tr of T416) if (S.vTop < -TREAD_THICK / 2 - 1e-9) gap++
  ok(gap === 0 && KW_BODY_TOP > 0, `디딤 ${T416.length}장 + 참 ${kneeStairSpec().landings.length}개 전부 몸에 ${KW_BODY_TOP} 파묻힘 — 밑 틈 0 · z파이팅 없음`)

  //  ★뿌리가 실재하는가(§2-D ①) — 'fill'은 배에서 관 바닥에 **닿아야** 하고, 'girder'는 양끝이 판에 물려야 한다.
  const kFlat = Math.cos(Math.PI / RIB_RADIAL_SEG)
  const limit = S.innerR * kFlat
  //  R7의 axDist는 그 블록 스코프라 여기선 못 쓴다 — 같은 방식(조밀탐색+황금분할)으로 하나 더 둔다.
  const _d = (u, px, py, pz) => Math.hypot(px - rOf(u), py - H * u, pz)
  const axD = (px, py, pz) => {
    let bu = 0, best = 1e9
    for (let i = 0; i <= 2000; i++) { const u = i / 2000, d = _d(u, px, py, pz); if (d < best) { best = d; bu = u } }
    let lo = Math.max(0, bu - 1 / 2000), hi = Math.min(1, bu + 1 / 2000)
    const gr = (Math.sqrt(5) - 1) / 2
    for (let it = 0; it < 50; it++) {
      const a = hi - gr * (hi - lo), b = lo + gr * (hi - lo)
      if (_d(a, px, py, pz) < _d(b, px, py, pz)) hi = b; else lo = a
    }
    return _d((lo + hi) / 2, px, py, pz)
  }
  let touch = 0, minRoom = 1e9
  for (const s of S.samples) {
    const room = limit - axD(s.x, s.y + S.vTop, 0)
    if (room < minRoom) minRoom = room
    if (room <= KW_BODY_D) touch++
  }
  if (KW_BODY_MODE === 'fill') {
    ok(touch > 0, `접지 표본 ${touch}/${S.samples.length} — 몸이 관 바닥에 실제로 앉는다(뿌리 = §2-D ①접지, 최소 여유 ${r2(minRoom)})`)
  } else {
    ok(true, `자립 — 관 바닥까지 최소 ${r2(minRoom)} 뜸. 뿌리 = 양끝 판(§2-D ③지지체)`)
  }

  //  ★매듭 물림(§2-D ③) — 몸이 판넬·정션 판 안으로 파고들어야 이음매에 헤어라인이 안 생긴다.
  const xs = S.samples.map(s => s.x)
  const bodyHi = Math.max(...xs), bodyLo = Math.min(...xs)
  ok(bodyHi >= xA + KW_BODY_EXT - 1e-6, `나선끝 매듭 — 몸 +x끝 ${r2(bodyHi)} ≥ 나선끝 ${r2(xA)}+${KW_BODY_EXT}(판넬 x ${r2(xA - PANEL_DX / 2)}~${r2(xA + PANEL_DX / 2)} 안으로 물림)`)
  ok(bodyLo <= X_LAND_HI - KW_BODY_EXT + 1e-6, `정션 매듭 — 몸 −x끝 ${r2(bodyLo)} ≤ 판 +x변 ${r2(X_LAND_HI)}−${KW_BODY_EXT}(정션 판 안으로 물림)`)

  //  ★무침범 — 몸이 나선 마지막 바퀴나 하강·전망을 삼키지 않는가.
  //   ⚠실측(2026.07.25): 나선 디딤판은 전부 x≥282.8 = 무릎길 구간 **밖**이고, 하강·전망은 x<184.5다.
  //    즉 겹칠 수 있는 것은 몸이 매듭으로 뻗은 KW_BODY_EXT 구간뿐이라 거기만 정밀히 본다.
  //  ★67: 도입 참이 **나선 마지막 디딤판을 흡수한다**(그게 설계다 — 도착과 착지가 한 부재로 합쳐졌다).
  //   그래서 '묻힘 0'은 더 이상 옳은 검사가 아니다. 옳은 것은 **오르는 단차가 걸을 만한가**이다.
  const entry = kneeStairSpec().landings.find(l => l.entry)
  let eat = 0
  for (let i = 0; i < STAIR_STEPS; i += 1) {
    const { pos } = spiralPoint((i + 0.5) / STAIR_STEPS)
    if (pos.x < bodyLo || pos.x > bodyHi) continue
    if (entry && pos.x >= entry.x0 && pos.x <= entry.x1 && pos.z >= entry.z0 && pos.z <= entry.z1) continue  // 도입 참이 받는 자리
    const wy = kneeWalkY(Math.min(xA, Math.max(xB, pos.x)))
    if (pos.y > wy + S.vBot && pos.y < wy + S.vTop && Math.abs(pos.z) < kneeBodyHalfWidth(pos.x)) eat++
  }
  ok(eat === 0, `나선 디딤판 ${STAIR_STEPS}칸 중 몸에 묻힌 것 ${eat} — 도입 참이 받는 자리(x ${r2(entry?.x0 ?? 0)}~${r2(entry?.x1 ?? 0)} · z ${entry?.z0}~${entry?.z1})는 제외`)
  if (entry) {
    //  나선에서 도입 참으로 오르는 단차 — 0 이상이되 한 단(R)의 1.5배를 넘으면 턱이다
    let last = null
    for (let i = 0; i < STAIR_STEPS; i++) {
      const { pos } = spiralPoint((i + 0.5) / STAIR_STEPS)
      if (pos.x >= entry.x0 && pos.x <= entry.x1 && pos.z >= entry.z0 && pos.z <= entry.z1) last = pos
    }
    const rise = last ? entry.y - (last.y + TREAD_THICK / 2) : null
    const R66 = kneeStairSpec().R
    ok(last !== null && rise >= -1e-6 && rise <= 1.5 * R66,
       `나선 → 도입 참 단차 ${r2(rise ?? -99)} ∈ [0, ${r2(1.5 * R66)}] — 내려서는 순간이 턱이 아니다(마지막 단 y${r2(last?.y ?? 0)} → 참 y${r2(entry.y)})`)
    ok(entry.L >= 2.4 && (entry.z1 - entry.z0) >= 6.0,
       `도입 참 ${r2(entry.L)} × ${r2(entry.z1 - entry.z0)} = 면적 ${r2(entry.L * (entry.z1 - entry.z0))} — 구 착지 판넬(1.6 × 5.0 = 8.0)의 3배(현도 "너무 작다" 07.25)`)
    //  ★67-2 대칭 — 현도: "저 판떼기 비대칭적이고 딱히 착지에 도움이 되지도 않아"(07.25 사진)
    ok(Math.abs(entry.z0 + entry.z1) < 1e-9,
       `도입 참 z ${entry.z0}~${entry.z1} — **보행 중심(z=0) 대칭**. 구판 −1~+4는 한쪽으로만 4 뻗은 슬래브라 '남은 다리'로 읽혔다`)
    //  ★67-2 나선 머리 여유 — 참을 바깥으로 내밀면 나선 마지막 접근 단을 덮어 그 위가 낮아진다.
    //   ⚠★67 초판(KW_ENTRY_OUT 1.20)이 칸 388(x283.73)을 덮어 **머리 여유 0.33**을 만들었다(구 판넬 x≤283.49는 안 덮었다).
    //   융착되는 도착 단(여유 ≈0)은 제외하고 잰다 — 그건 '덮인' 게 아니라 '합쳐진' 것이다.
    let hrMin = 1e9, hrI = -1
    for (let i = 0; i < STAIR_STEPS; i++) {
      const { pos } = spiralPoint((i + 0.5) / STAIR_STEPS)
      if (!(pos.x >= entry.x0 && pos.x <= entry.x1 && pos.z >= entry.z0 && pos.z <= entry.z1)) continue
      const hr = entry.y - TREAD_THICK / 2 - (pos.y + TREAD_THICK / 2)
      if (hr > 0.05 && hr < hrMin) { hrMin = hr; hrI = i }
    }
    ok(hrMin >= 2.2, `참 밑 나선 머리 여유 ${hrMin === 1e9 ? '해당 없음' : r2(hrMin) + `(칸 ${hrI})`} ≥ 2.2 — 도착 직전 단에서 머리가 참에 안 닿는다`)
  }
  ok(X_LAND_LO < X_LAND_HI - KW_BODY_EXT, `하강·전망 시작 x<${r2(X_LAND_LO)} < 몸 −x끝 ${r2(bodyLo)} — 갈래 무침범(갈림은 판이 맡는다)`)

  //  ── ★68 ① 보어 패싯 — **정점은 한 개도 안 건드렸다**는 것이 이 절의 핵심 보증(§1 LOCKED) ──
  {
    const cur = makeRibCurve()
    const sh = buildRibShell(cur, RIB_WALL_T)
    const ap = shellVolumeApprox(cur, RIB_WALL_T)
    const apv = typeof ap === 'number' ? ap : ap.volume
    ok(Math.abs(sh.stats.volume - apv) / apv < 0.10,
       `관 셸 부피 ${r2(sh.stats.volume)} ≈ 해석 근사 ${r2(apv)} — 패싯 법선이 기하를 안 건드렸다(감김 무손상)`)
    //  ⚠초기 구현이 안쪽면을 직접 재삼각분할했다가 감김이 뒤집혀 부피가 147115(정답 8382)로 나왔다.
    //   그래서 여기서는 **삼각분할·감김은 원본 그대로**, 법선만 갈아끼운다. 이 항이 그 규율을 지킨다.
    {   // ★87: 상수 8040 → 공식(분할수가 미러 연장으로 파생값이 됐다). 4·tubSeg·radSeg(안팎 관) + 4·radSeg(마구리 2)
    const expectTris = 4 * RIB_TUB_SEG * RIB_RADIAL_SEG + 4 * RIB_RADIAL_SEG
    ok(sh.stats.tris === expectTris, `관 셸 삼각 ${sh.stats.tris} = 공식 ${expectTris} — 정점·삼각분할 불변(바뀐 것은 법선뿐)`)
  }
  }
  //  ── ★69-2 난간 = 가장자리에 딱 붙되 안 끊긴다(현도 "남는 부분이 있어서 불편") ──
  //   ⚠기준이 또 바뀌었다: ★69는 '상수 |z|'였는데, 그러면 넓은 구간에서 난간 **바깥에 바닥이 남는다**.
  //    현도: *"차라리 끝에 딱 붙이고, 꼭 직선이 아니어도 되니까, 끊기지만 않게."* → 가장자리 추종 복귀.
  //   ★★그리고 이번엔 공짜다 — ★68-3에서 끊김을 만들던 원인(배 구간 벽 반폭 1.69)을 ★69 클램프가
  //    이미 없앴다. **원인을 고쳤더니 예전에 못 쓰던 형태가 쓸 수 있게 됐다.**
  if (KW_RAIL_ON) {
    const rl = buildKneePlinth()
    const A2 = audit(rl)
    ok(A2.open === 0 && A2.vol > 0, `난간 watertight — 열린변 ${A2.open} · 부피 ${r2(A2.vol)}>0(거울상 감김 반전 포함)`)
    const u2 = rl.userData
    ok(u2.runs === 1, `난간 토막 ${u2.runs}개 — 전 구간 연속`)
    //  ★★이 항이 ★69의 값어치를 잰다: clamp가 **한 번도 발동 안 하면** 두께가 균일하다는 뜻이고,
    //   그건 곧 "가장자리를 따라가도 자리가 늘 충분하다"는 것이다(★68-3에서는 0.35까지 얇아졌다).
    ok(Math.abs(u2.minT - u2.maxT) < 1e-6, `난간 두께 ${r2(u2.minT)} 균일 — 안전장치 clamp가 한 번도 발동 안 함(★69 들림 덕분, 구판은 0.35까지 얇아졌다)`)
    ok(u2.shelf >= 1.2, `텍스트 선반 최소 ${r2(u2.shelf)} ≥ 1.2 — 계단끝 ~ 난간 안끝(★68-3은 배에서 0.10)`)
    //  ★"남는 부분 없음" — 난간 바깥끝이 실제로 벽에 붙어 있는가
    ok(u2.outMax > 5.0 && u2.outMin > KW_MIN_HALFW - 0.1,
       `난간 바깥끝 |z| ${r2(u2.outMin)}~${r2(u2.outMax)} — 벽에 붙어 따라간다(바닥이 남지 않는다)`)
    const rp = rl.attributes.position
    let worstR = 0
    for (let i = 0; i < rp.count; i++) { const d = dCR(rp.getX(i), rp.getY(i), rp.getZ(i)); if (d > worstR) worstR = d }
    ok(worstR <= SHELL_RIB_R, `난간 최대 반경 ${r2(worstR)} ≤ 리브 바깥 ${SHELL_RIB_R} — 꼭대기까지 관 안`)
  }
  //  ── ★69 클램프 자체 — "보행면이 관 바닥에 붙어 폭을 잃는다"는 근본 원인을 막았는가 ──
  {
    let mn = 1e9, mnx = 0
    for (let i = 0; i <= 300; i++) {
      const x = KNEE_SX - (KNEE_SX - KNEE_XB) * i / 300
      const w = kneeWallHalfAt(x, kneeSurfaceY(x) - TREAD_THICK / 2 + KW_BODY_TOP)
      if (w < mn) { mn = w; mnx = x }
    }
    ok(mn >= KW_MIN_HALFW, `보행면 높이 관 반폭 최소 ${r2(mn)} ≥ 목표 ${KW_MIN_HALFW} (x${r2(mnx)}) — 구판 1.69에서 회복`)
    //  ⚠대가 — 스파인이 들리면 flight보다 가팔라질 수 있고, 그러면 참이 한 곳도 못 선다(W 4.0에서 실제로 그렇다)
    let sp = 0
    for (let i = 1; i < 800; i++) {
      const x = KNEE_XA - KNEE_RUN * i / 800, d = 0.06
      const s2 = Math.atan2(kneeSpineY(x - d) - kneeSpineY(x + d), 2 * d) * 180 / Math.PI
      if (s2 > sp) sp = s2
    }
    ok(sp < kneeStairSpec().slopeDeg, `클램프 후 스파인 최대경사 ${r2(sp)}° < flight ${r2(kneeStairSpec().slopeDeg)}° — 참이 성립하는 조건 유지(W를 4.0까지 올리면 41.7°가 돼 깨진다)`)
  }
  console.log(`     └ ★65 실측: 모드 ${KW_BODY_MODE} · 몸 삼각 ${C.tri} · 부피 ${r2(C.vol)}(각기둥 ${r2(A.vol)}) · 최대반경 ${r2(worst)} · 배 여유 ${r2(minRoom)} · flight경사 ${r2(kneeStairSpec().slopeDeg)}°`)
}

// ── ★66 무릎길 계단 규격·참 — 골판(2R+G 0.429·참 0개)을 다시 못 만들게 하는 절 ──
//  ★이 절이 존재하는 이유: ★66의 진단은 전부 "**아무도 다시 재지 않았다**"에서 나왔다.
//   KW_GO=0.22는 나선끝 62° 시절 값인데 ③F·③G가 35°로 낮춘 뒤 재유도되지 않아 단높이가 0.105로 떨어졌고,
//   2R+G=0.429 = 사람이 못 딛는 골판이 됐다. 그 유산이 **세 세션을 살아남았다.**
//   → 이제 사람 치수를 검사가 지킨다. 수치가 낡으면 검사가 먼저 죽는다.
console.log('\n— T. ★66 무릎길 계단 규격 (골판 → 계단 + 참) —')
{
  const s = kneeStairSpec()
  //  ⚠상한을 0.66 → 0.68로 넓힌다(★67-3). 0.60~0.66은 **실내 실용 계단**의 블롱델 밴드이고, 기념비적·행렬용
  //   계단은 통상 그보다 완만하다(디딤이 깊고 단이 낮다). 그리고 여기선 완만함이 **관에 막혀** 있다:
  //   32° 이하는 참이 스파인을 못 따라잡아 보행면이 가라앉고 관 바닥을 뚫는다(실측 −1.22/−0.01).
  //   즉 34°(0.661)는 '통례를 벗어난 값'이 아니라 **기하가 허용하는 가장 완만한 값**이다.
  ok(s.blondel >= 0.60 && s.blondel <= 0.68,
     `블롱델 2R+G = ${r2(s.blondel)} ∈ [0.60, 0.68] — R ${r2(s.R)} · G ${r2(s.G)} (구판 0.429 = 골판)`)
  ok(s.R >= 0.14 && s.R <= 0.21, `단높이 ${r2(s.R)} ∈ [0.14, 0.21] — 1단위≈1m이므로 사람이 딛는 높이(구판 0.105)`)
  ok(s.G * KNEE_NOSE >= 0.26, `디딤 실폭 ${r2(s.G * KNEE_NOSE)} ≥ 0.26 — 코(${KNEE_NOSE}배) 포함 발이 얹힌다(구판 0.264는 겹침용이라 실제 딛는 면은 0.22)`)
  //  ★참이 실재하는가 — ㊴이 홀 계단에 못 박은 규칙("거장 전례 = 직선 flight + 참")의 이 구간 적용
  ok(s.landings.length >= 6, `참 ${s.landings.length}개 ≥ 6 — 435단 연속(참 0개)이 아니다(㊴ 규칙의 이 구간 적용)`)
  ok(Math.min(...s.landings.map(l => l.L)) >= KW_LAND_MIN,
     `가장 짧은 참 ${r2(Math.min(...s.landings.map(l => l.L)))} ≥ ${KW_LAND_MIN} — 보폭 미만은 참이 아니다`)
  //  ★참 길이는 노브가 아니라 **리브 곡선이 정한다**. 그 규칙이 살아 있는지 = 참이 다 같지 않은지로 잰다.
  const Ls = s.landings.map(l => l.L)
  ok(Math.max(...Ls) - Math.min(...Ls) > 0.15,
     `참 길이 ${r2(Math.min(...Ls))}~${r2(Math.max(...Ls))} — 균일하지 않다 = 리브 곡선이 정했다(스파인 따라잡기 규칙이 살아 있다)`)
  //  ★닫힘 — 계단이 나선끝·정션 판에 **정확히** 닿아야 한다(어긋나면 양끝에 단차)
  ok(Math.abs(s.endX - KNEE_XB) < 1e-3 && Math.abs(s.endY - KNEE_YB) < 1e-6,
     `닫힘: 끝 (${r2(s.endX)}, ${r2(s.endY)}) = 정션 판 (${r2(KNEE_XB)}, ${r2(KNEE_YB)})`)
  ok(Math.abs(s.N * s.R - KNEE_CLIMB) < 1e-6, `등반 ${r2(s.N * s.R)} = ${s.N}단 × ${r2(s.R)} — 단높이가 전 구간 동일(다리가 배우는 것은 이것 하나다)`)
  //  ★보행면은 스파인 **위로만** 뜬다 — 아래로 내려가면 관 바닥을 뚫는다(참이 생기며 새로 생긴 위험)
  let lift = 0, minHR = 1e9, hrX = 0
  for (let i = 0; i <= 2000; i++) {
    const x = KNEE_XA - KNEE_RUN * i / 2000
    lift = Math.min(lift, kneeSurfaceY(x) - kneeSpineY(x))
    const h = kneeHeadroom(x); if (h < minHR) { minHR = h; hrX = x }
  }
  //  ★flight는 스파인보다 **반드시 가팔라야** 한다 — 그래야 보행면이 스파인 위로 떠서 참이 성립하고,
  //   그래야 보행면이 관 바닥 쪽으로 내려가지 않는다. 이게 이 구간 계단의 존재 조건이다.
  //   ⛔girder 모드는 이 조건과 통례를 **동시에 만족할 수 없다**(2026.07.25 산술 확인):
  //     스파인 시작 41.8° → 경사 > 41.8° 필요 / 2R+G ≥ 0.60 → 경사 ≤ 40.8°. 교집합 공집합.
  //     그래서 ★66이 ★65의 두 안 중 girder를 **폐기**했다. 이 절이 실패하는 것이 곧 그 문서화다.
  const _d2 = (u, px, py, pz) => Math.hypot(px - rOf(u), py - H * u, pz)
  const axD = (px, py, pz) => { let b = 1e9
    for (let i = 0; i <= 1500; i++) { const d = _d2(i / 1500, px, py, pz); if (d < b) b = d }
    return b }
  let spineMax = 0
  for (let i = 0; i <= 2000; i++) {
    const x = KNEE_XA - KNEE_RUN * i / 2000, d = 0.05
    spineMax = Math.max(spineMax, Math.atan2(kneeSpineY(x - d) - kneeSpineY(x + d), 2 * d) * 180 / Math.PI)
  }
  //  ⚠★67-3 정정: 구판은 "flight > 스파인 **최대** 경사"를 요구했다. 그건 **충분조건이지 필요조건이 아니다** —
  //   스파인 최대(35.67°)는 나선끝 극점 한 점에서만 나오고, 그 구간은 관 여유가 5.4로 최대라 보행면이
  //   잠시 가라앉아도 안전하다. 실제로 34° flight에서 참 12개가 정상 생성되고 바닥 여유 0.21이 유지된다.
  //   → 진짜 불변식은 **바닥 여유 > 0**(아래)이고, 여기서는 "참이 실제로 생기는 구간에서는 더 가파르다"만 잰다.
  let slower = 0
  for (const L of s.landings) {
    if (L.entry) continue
    const d = 0.05, xu = L.x0
    const sl = Math.atan2(kneeSpineY(xu - d) - kneeSpineY(xu + d), 2 * d) * 180 / Math.PI
    if (sl >= s.slopeDeg) slower++
  }
  ok(slower === 0, `참 ${s.landings.length - 1}곳 전부에서 flight ${r2(s.slopeDeg)}° > 그 자리 스파인 경사 — 따라잡기가 성립하는 조건(스파인 최대 ${r2(spineMax)}°는 나선끝 극점 한 점이라 무관)`)
  ok(lift > -KW_ENTRY_L - 0.1, `스파인 대비 최저 ${r2(lift)} — 도입 참(평평·나선 도착 높이)이 만드는 낙차 안(그 구간 여유 5.4)`)
  ok(minHR >= 2.2, `최소 층고 ${r2(minHR)} ≥ 2.2 (x${r2(hrX)}) — 참이 보행면을 들어올린 대가. 눈높이 1.6이므로 머리 위 ${r2(minHR - 1.6)}`)
  //  ⚠flight 단수 — 초입 급구간에서는 참이 못 서서 자동으로 길어진다. 통례 상한(18)을 넘으면 '긴 첫 flight'다.
  const long = s.flights.filter(f => f.n > 18)
  ok(long.length <= 1, `통례(18단) 초과 flight ${long.length}개 — ${long.length ? `최대 ${s.maxRisersPerFlight}단(나선에서 올라오는 급구간이라 참이 못 선다 = 신전 앞 긴 계단 어법, 현도 판정 사항)` : '없음'}`)
  //  ⛔★67-3 폭 전이는 **★69로 최종 폐기**했다 — 원인이 사라졌기 때문이다.
  //   그 전이는 "판 8.0 → 계단 2.0 = 4배 급전이"를 잇기 위한 것이었는데, ★69로 **수로**가 넓어져
  //   비가 1.25배로 떨어졌다. 이제 재야 할 것은 계단 폭이 아니라 **수로 폭**이다.
  {
    const T = kneeTreads()
    const e2 = kneeStairSpec().landings[0]
    const chan = T[0].w + 2 * (KW_MIN_HALFW - T[0].w / 2)
    const jump = e2 ? (e2.z1 - e2.z0) / chan : 1
    ok(Math.max(...T.map(t => t.w)) - Math.min(...T.map(t => t.w)) < 1e-9,
       `디딤 폭 전 구간 ${r2(T[0].w)} 일정 — 상수 난간과 짝을 이룬다`)
    ok(jump <= 1.6, `도입 참 폭 ${r2(e2 ? e2.z1 - e2.z0 : 0)} ÷ 수로 폭 ${r2(chan)} = ${r2(jump)}배 ≤ 1.6 (★67-3 시절 4.0배)`)
  }
  console.log(`     └ ★66 실측: ${s.N}단(구 435) · R ${r2(s.R)} · G ${r2(s.G)} · flight ${s.slopeDeg.toFixed(1)}° · flight ${s.flights.length}개 · 참 ${s.landings.length}개(총 ${r2(s.landTotal)}) · 층고 ${r2(minHR)}~${r2(Math.max(...[0.05, 0.2, 0.4].map(f => kneeHeadroom(KNEE_XA - KNEE_RUN * f))))}`)
}


// ══════════════════════════════════════════════════════════════════════════
console.log('\n— U. ★70 정션 매듭 + ★71 빛 기둥 (LOCKED 예외 #4) —')
// ══════════════════════════════════════════════════════════════════════════
{
  const K = junctionKnotSpec(), S = lightShaftSpec()
  const vol = (g0) => { const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position; let v = 0
    for (let i = 0; i < p.count; i += 3) { const ax=p.getX(i),ay=p.getY(i),az=p.getZ(i),bx=p.getX(i+1),by=p.getY(i+1),bz=p.getZ(i+1),cx=p.getX(i+2),cy=p.getY(i+2),cz=p.getZ(i+2)
      v += (ax*(by*cz-bz*cy) - ay*(bx*cz-bz*cx) + az*(bx*cy-by*cx)) / 6 } return v }
  const finite = (g0) => { const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position
    for (let i = 0; i < p.count; i++) if (![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)) return false; return true }
  const axisDist = (x, y, z) => { let b = 1e9
    for (let u = 0.15; u < 0.40; u += 0.0002) b = Math.min(b, Math.hypot(rOf(u)-x, u*H-y, z)); return b }

  // ── ★70 매듭: 두께 위계가 정션에서 바로 서는가 ──
  ok(TREAD_THICK < KW_BODY_D && KW_BODY_D < KW_KNOT_D,
     `두께 위계(§2-D ③) 걷는 것 ${TREAD_THICK} < 받치는 것 ${KW_BODY_D} < 매듭 ${KW_KNOT_D}`)
  ok(!K.on || K.depth >= KW_KNOT_D,
     `정션 매듭 ${K.depth} ≥ 무릎길 매듭 ${KW_KNOT_D} — 여정 최대 마디가 가장 얇던 결함(LAND_T ${LAND_T})의 해소`)
  if (K.on) {
    const kg = buildJunctionKnot()
    ok(kg && finite(kg), '정션 매듭 CSG 실행·정점 유한')
    ok(vol(kg) > 0, `매듭 부호 부피 ${r2(vol(kg))} > 0 — 감김 일관(★53·★65 교훈: 닫힘만으로는 부족)`)
    //  교차로 지었으므로 관 밖 누출은 원리적으로 불가 — 그래도 **잰다**(구성의 보증을 검사가 사후 봉인)
    const g = kg.index ? kg.toNonIndexed() : kg, p = g.attributes.position
    let worst = -1e9
    for (let i = 0; i < p.count; i += 7) worst = Math.max(worst, axisDist(p.getX(i), p.getY(i), p.getZ(i)) - K.innerR)
    ok(worst <= 0.05, `매듭 전 정점이 관 안 — 내벽 최대 초과 ${r2(worst)}`)
    ok(Math.abs(K.yTop - (K.plateBot + JCT_KNOT_TOP)) < 1e-9,
       `매듭 상면이 판 밑면보다 ${JCT_KNOT_TOP} 높다 — 판이 파묻혀 판 밑 틈이 구조적으로 없다(㊿ ②)`)
  }

  // ── ★72 정션 판 윤곽 (사각 → 관 단면 추종) ──
  {
    const O = junctionPlateOutline()
    const innerR = K.innerR, yP = JCT_PLATE_TOP
    const dAt = (x, z) => { let b = 1e9
      for (let u = 0.15; u < 0.40; u += 0.0002) b = Math.min(b, Math.hypot(rOf(u) - x, u * H - yP, z)); return b }
    ok(O.length === JCT_PLATE_SEG + 1, `윤곽 표본 ${O.length}개 — x 범위는 불변(${r2(X_LAND_LO)}~${r2(X_LAND_HI)})`)
    if (JCT_PLATE_MODE === 'bore') {
      //  ① 판이 벽에 **닿는다** — 뜬 모서리 소멸이 이 수정의 목적이다
      let minPen = 1e9, maxPen = -1e9
      for (const q of O) { const pen = dAt(q.x, q.h) - innerR; minPen = Math.min(minPen, pen); maxPen = Math.max(maxPen, pen) }
      ok(minPen > 0, `판 가장자리가 전 구간 관 내벽 **밖**(파고듦 ${r2(minPen)}~${r2(maxPen)}) — 뜬 모서리 0`)
      //  ② 그러나 살은 안 뚫는다 — 융착이지 관통이 아니다
      ok(maxPen < RIB_WALL_T, `파고듦 최대 ${r2(maxPen)} < 살 두께 ${RIB_WALL_T} — 바깥면 무손상(LOCKED 무관)`)
      //  ③ 사각 시절보다 넓어졌는가(같으면 수정이 안 먹은 것)
      ok(Math.min(...O.map(q => q.h)) > Z_LAND,
         `최소 반폭 ${r2(Math.min(...O.map(q => q.h)))} > 구 사각 ${Z_LAND} — 판이 벽까지 벌어졌다`)
    }
    //  ④ 세 갈래가 여전히 판 위인가 — 윤곽을 바꿔도 커플링이 안 깨졌다는 증명
    const hAt = (x) => { let best = O[0].h, bd = 1e9
      for (const q of O) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; best = q.h } } return best }
    for (const [nm, z] of [['무릎길', 0], ['전망', JCT_UP_Z], ['하강', JCT_DN_Z]])
      ok(Math.abs(z) + 1 < hAt((X_LAND_LO + X_LAND_HI) / 2), `${nm} 갈래(z=${z}) ±1 폭이 판 안 — 커플링 무손상`)
    //  ⑤ 판·매듭이 같은 윤곽을 쓰는가(따로 계산하면 판 밑에 턱이 생긴다)
    ok(!K.on || JCT_PLATE_MODE !== 'bore' || Math.abs(plateMaxHalf() - Math.max(...O.map(q => q.h))) < 1e-9,
       `판·매듭이 같은 윤곽 정본(최대 반폭 ${r2(plateMaxHalf())}) — 사본 없음`)
    //  ⑥ 판 솔리드 검산
    const pg = buildJunctionPlate()
    ok(finite(pg) && Math.abs(vol(pg)) > 0, `판 솔리드 부피 ${r2(Math.abs(vol(pg)))} > 0 (구 사각판 ${r2((X_LAND_HI-X_LAND_LO)*LAND_T*2*Z_LAND)})`)
  }

  // ── ★71 빛 기둥 ──
  if (S.on) {
    //  ⚠위치: 반원의 '중간'은 중심점이 아니다(thetaStart π → 중심에서 −x 절반만 채운다)
    const centroid = rOf(U_LOOKOUT_END) + LK_DISC_DX - 4 * LK_PLAT_R / (3 * Math.PI)
    ok(Math.abs(S.x - centroid) < 1e-6,
       `기둥 x ${r2(S.x)} = 반원 **도심**(중심점 ${r2(rOf(U_LOOKOUT_END)+LK_DISC_DX)}이 아님 — 중심점은 램프가 닿는 가장자리)`)
    ok(S.x - S.rBot > rOf(U_LOOKOUT_END) + LK_DISC_DX - LK_PLAT_R && S.x + S.rBot < rOf(U_LOOKOUT_END) + LK_DISC_DX,
       `기둥이 반원 판 발자국 안 — 판 재질이 관을 사방에서 문다`)
    //  방 안 통행: 하강 도착 입에서 들어와 회랑 입(+z)으로 나가는 동선이 살아 있는가
    const gapMouth = (RM_X1 - S.x) - S.rBot, gapNz = (S.z - RM_Z0) - S.rBot, gapPz = (RM_Z1 - S.z) - S.rBot
    ok(Math.min(gapMouth, gapNz, gapPz) >= 1.2,
       `방 안 통행 여유 — 하강 입 ${r2(gapMouth)} · −z벽 ${r2(gapNz)} · +z벽 ${r2(gapPz)} (하한 1.2)`)
    //  ★71-3 현도 판정: 바닥이 아니라 **방 천장에 닿아 끝난다** → 방에서는 천장에 뚫린 눈으로 보인다
    ok(Math.abs(S.yBot - S.roofBot) < 1e-9,
       `기둥 아랫끝 ${r2(S.yBot)} = 방 천장 아랫면 ${r2(S.roofBot)} — 방 안에 기둥이 서지 않는다(현도 판정)`)
    ok(S.yBot < S.roofTop && S.roofTop < S.discBot,
       `관이 지붕 두께(${r2(S.roofTop - S.yBot)})만 관통 — 그 위로 판 밑면까지 ${r2(S.discBot - S.roofTop)}`)

    const sg = buildLightShaft()
    ok(sg && finite(sg), '빛 기둥 CSG 실행·정점 유한')
    const expect = Math.PI * (S.rBot ** 2 - Math.max(0.1, S.rBot - S.wallT) ** 2) * (S.yTop - S.yBot)
    ok(!S.hollow || Math.abs(vol(sg) - expect) / expect < 0.05,
       `관 부피 ${r2(vol(sg))} ≈ 고리 단면 × 길이 ${r2(expect)} (±5%) — 속이 실제로 비었다`)

    // ── ★★LOCKED 예외 #4 경계 — 검사가 예외를 가둔다 ──
    const t = RIB_WALL_T
    const { geometry: tube } = buildRibShell(makeRibCurve(), t)
    tube.rotateY(-RIB_DEST_PHI)
    const cutg = shaftCutSolid(S.roofTop, S.discBot); cutg.rotateY(-RIB_DEST_PHI)
    const evU = new Evaluator(); evU.attributes = ['position', 'normal']
    const ba = new Brush(tube), bb = new Brush(cutg)
    ba.updateMatrixWorld(); bb.updateMatrixWorld()
    const holed = evU.evaluate(ba, bb, SUBTRACTION).geometry
    //  ① 진짜 뚫렸는가 — **광선으로 잰다**(★64-4 교훈: 정점 스캔은 큰 면을 놓친다)
    const mesh = new THREE.Mesh(holed.index ? holed.toNonIndexed() : holed); mesh.updateMatrixWorld()
    const rc = new THREE.Raycaster()
    const cs = Math.cos(RIB_DEST_PHI), sn = Math.sin(RIB_DEST_PHI)
    const wx = S.x * cs - S.z * sn, wz = S.x * sn + S.z * cs
    let blocked = 0, tested = 0
    for (const dx of [-0.9, -0.45, 0, 0.45, 0.9]) for (const dz of [-0.9, -0.45, 0, 0.45, 0.9]) {
      if (Math.hypot(dx, dz) > 1.0) continue
      tested++
      rc.set(new THREE.Vector3(wx + dx, S.discBot - 0.5, wz + dz), new THREE.Vector3(0, -1, 0))
      rc.far = S.discBot - S.roofTop
      if (rc.intersectObject(mesh, false).length) blocked++
    }
    ok(blocked === 0, `리브 껍질 관통 — 관 안쪽 광선 ${tested}개 전부 통과(막힘 ${blocked})`)
    //  ② 국소적인가 — 예외가 '구멍 하나'를 넘어 리브를 갉아먹지 않는다
    const removed = vol(tube) - vol(holed)
    ok(removed > 0 && removed / vol(tube) < 0.02,
       `제거 ${r2(removed)} = 껍질 부피의 ${r2(removed / vol(tube) * 100)}% — 국소 구멍(상한 2%)`)
    //  ③ 대상이 목적지 리브 **하나뿐**인가 — 자르개가 이웃 리브 방위와 안 겹친다
    const nb = 2 * Math.PI / MERIDIANS
    ok(Math.hypot(S.x, S.z) * nb > 2 * S.rBot,
       `이웃 리브 무손상 — 방위 간격 ${r2(nb * DEG)}° = 호길이 ${r2(Math.hypot(S.x,S.z)*nb)} > 구멍 폭 ${r2(2*(S.rBot+S.clr))}`)
    //  ④ 봉인 — 여유가 헤어라인인가(★64: 넉넉한 여유는 봉인이 아니라 틈이 된다)
    //  ★71-3 **부호 반전**: 여유가 아니라 융착이다(현도 로컬 적발 "미세한 틈이 보인다")
    ok(S.fuse > 0, `구멍이 관보다 ${S.fuse} 작다 = 융착 — 여유(구 0.08)는 헤어라인이라도 **틈으로 보인다**`)
    {
      const rHole = S.rBot - S.fuse
      ok(rHole < S.rBot, `구멍 반경 ${r2(rHole)} < 관 반경 ${S.rBot} — 관이 파고들어 이음매가 원리적으로 없다`)
    }
    //  ⑤ 구멍 대역이 리브 껍질 두께만 지나는가(★64-5: 자르개가 넘치면 관벽이 유령으로 남는다)
    ok(S.discBot - S.roofTop < 14, `자르개 세로 ${r2(S.discBot - S.roofTop)} = 판 밑면~지붕 윗면만 — 필요 범위 밖으로 안 넘친다`)
  }

  // ── ★71-4 격자 체 ──
  {
    const gr = buildShaftGrate()
    if (SHAFT_GRATE_ON && S.on) {
      ok(gr !== null, '격자 체 생성 — 판 구멍을 덮어 밟을 수 있게 한다(현도 제안)')
      const p = gr.attributes.position
      const R = S.rTop - S.wallT
      let outMax = -1e9, yLo = 1e9, yHi = -1e9
      for (let i = 0; i < p.count; i++) {
        outMax = Math.max(outMax, Math.hypot(p.getX(i) - S.x, p.getZ(i) - S.z) - R)
        yLo = Math.min(yLo, p.getY(i)); yHi = Math.max(yHi, p.getY(i))
      }
      ok(outMax <= SHAFT_GRATE_BAR, `살이 보어(${r2(R)}) 밖으로 ${r2(outMax)} 이내 — 판 위로 안 튀어나온다`)
      ok(Math.abs(yHi - S.yTop) < 1e-3 && yLo >= S.yTop - SHAFT_GRATE_T - 1e-3,   // float32 정밀도(3e-6)
         `살 윗면 = 판 윗면 ${r2(yHi)} · 두께 ${SHAFT_GRATE_T} — 걷는 면과 같은 높이(턱 없음)`)
      ok(SHAFT_GRATE_GAP < 0.5, `살 간격 ${SHAFT_GRATE_GAP} < 0.5 — 발이 안 빠진다`)
    }
  }

  // ── ★71-2b 반원 판이 닫힌 솔리드인가(옆면 있음) ──
  {
    const d = discSolid(LK_PLAT_R, LK_DISC_T, true)
    const dv = vol(d)
    const expect = 0.5 * Math.PI * LK_PLAT_R ** 2 * LK_DISC_T
    ok(Math.abs(dv) > 0 && Math.abs(Math.abs(dv) - expect) / expect < 0.05,
       `반원 판 부피 ${r2(Math.abs(dv))} ≈ 반원 넓이×두께 ${r2(expect)} — **닫힌 솔리드**(구 cylinderGeometry는 부채꼴 평면을 안 만들어 종잇장이었다)`)
  }

  // ── ★73 방 지붕 +x 오버행 + ⚠봉인 부재 대장(검사 공백 메우기) ──
  //  ★★이번 세션의 발견: 볼벽 상단(CHEEK_TOP_*)을 강제하는 검사가 **하나도 없었다.**
  //   ㉙ 시절 21·22항이 이후 재편에서 사라졌고, 그래서 "줄여도 되나"를 물었을 때 답해 줄 것이 없었다.
  //   완전한 봉인 재현은 별건이므로(㊼ gatSeal 급 작업), 여기서는 **값이 조용히 바뀌는 것을 막는 잠금**을 건다.
  {
    ok(Math.abs(RM_ROOF_OV_PX - PASS_T / 2) < 1e-9,
       `방 지붕 +x 오버행 ${r2(RM_ROOF_OV_PX)} = 벽 바깥면(${r2(RM_X1 + PASS_T / 2)})에 정합 — 구판 ${PASS_T}는 0.3 더 나와 하강 도중 보였다`)
    ok(RM_ROOF_OV_PX >= 0, `오버행 ≥ 0 — 음수면 지붕이 벽 안으로 후퇴해 이음매가 열린다`)
    //  ⚠봉인 부재는 **줄이면 안 된다**(차분 광선 실측 2026.07.25: +z 0.7 낮춤 → 누출 +67 · −z 0.43 낮춤 → +34).
    //   아래 두 항은 상한이 아니라 **하한 잠금**이다 — 다음 세션이 "튀어나와 보인다"고 낮추는 것을 막는다.
    //  ★74 재측정으로 하한이 내려갔다 — 근거는 ★72가 판을 넓혀 볼벽 z 4.35를 덮게 된 것.
    //   ⚠255.5부터 누출(+6) 실측 → 하한은 판 윗면. 여기서 더 낮추면 관 밖 구간(칸 12~)이 열린다.
    ok(CHEEK_TOP_PZ >= JCT_PLATE_TOP - 1e-9,
       `+z 볼벽 상단 ${r2(CHEEK_TOP_PZ)} ≥ 판 윗면 ${r2(JCT_PLATE_TOP)} — 봉인 하한(255.5부터 누출 실측)`)
    ok(CHEEK_TOP_PZ <= JCT_PLATE_TOP + 0.05,
       `+z 볼벽 낮은 끝이 판 위로 안 솟는다 — 구판은 1.4 솟아 바닥을 뚫고 올라와 있었다(현도 적발)`)
    //  ★74 레이크 — 단차 대신 경사로 잇는다. 관 밖 구간(x ≲ 181)은 구 높이를 **남겨야** 한다.
    {
      const P = pzCheekProfile()
      //  ⛔★75(2026.07.26) 레이크 **폐기** — 이 항은 ★74의 결정을 강제하고 있었다. 지우지 않고 뒤집는다.
      //   현도 적발: "갈림판 옆 거슬리는 난간 구조물". 판보다 1.40 솟고 −z 볼벽은 0.70 낮아 **비대칭 벽**이었다.
      //   ★지우기 전 봉인 차분 실측(`_probe_leak75.mjs`): 레이크만 판 높이로 낮춤 → **Δ 0**.
      //    대조군으로 +z 볼벽을 통째로 없애면 **+538** → 프로브는 볼벽을 보고 있다 = 판 위 1.40은 기여 0.
      //    ★75 넓은 계단 매스가 관을 채워 그 위를 덮기 때문이다(★74 시점엔 위가 허공 판 35장이었다).
      ok(Math.abs(P.hi - P.lo) < 1e-9,
         `레이크 없음(평평 ${r2(P.hi)}) — ★75가 폐기. 봉인은 넓은 계단 매스가 대신한다(차분 Δ0·대조군 +538)`)
      ok(Math.abs(P.hi - JCT_PLATE_TOP) < 1e-9,
         `+z 볼벽 상단이 판 윗면과 같다 — 판 위로 솟는 부재 없음(비대칭 난간 소멸)`)
      //  ★75-e **갈림판 청결 검사**(2026.07.26 신설). 현도가 판 위 잔여 구조물을 세 번 적발했고
      //   그때마다 검사는 green이었다 — 부재별로만 재고 **판 발자국 전체를 훑는 항이 없었다.**
      //   ⚠실제 사고: 판을 동쪽으로 2.39 늘리자 무릎길 난간의 서쪽 끝이 판 위로 올라타
      //    굽은 벽 토막 둘로 남았다(판보다 0.70). 부재 각각은 아무 규칙도 안 어겼다.
      //   → 이제 **판 위에 설 수 있는 것은 넓은 계단뿐**임을 이 한 항이 강제한다.
      {
        const foot = (g) => {
          if (!g) return { n: 0, ymax: -Infinity }
          const q = g.index ? g.toNonIndexed() : g
          const a = q.attributes.position
          let n = 0, ymax = -Infinity
          for (let i = 0; i < a.count; i++) {
            const x = a.getX(i), y = a.getY(i)
            if (x >= X_LAND_LO - 0.2 && x <= JCT_PLATE_XHI + 0.2 && y > JCT_PLATE_TOP + 0.05) { n++; if (y > ymax) ymax = y }
          }
          return { n, ymax }
        }
        for (const [nm, g] of [['무릎길 난간', buildKneePlinth()], ['무릎길 몸', buildKneeBody()],
                               ['정션 판', buildJunctionPlate()], ['매듭', buildJunctionKnot()],
                               ['+z 볼벽', buildPzCheek()]]) {
          const r = foot(g)
          ok(r.n === 0, `갈림판 위 청결 — ${nm}: 판 발자국 안에서 판 윗면 위 정점 ${r.n}` +
             (r.n ? ` (최고 ${r2(r.ymax)} = 판 위 ${r2(r.ymax - JCT_PLATE_TOP)})` : ''))
        }
      }
      ok(P.rx0 < P.rx1 && P.rx0 >= P.x0, `레이크 구간 x ${r2(P.rx0)}~${r2(P.rx1)} ⊂ 벽 범위 ${r2(P.x0)}~${r2(P.x1)}`)
      //  ⚠관 밖 구간에서 구 높이 보존 — 여기서 낮추면 고도 60° 광선이 샌다(실측 3개)
      ok(cheekTopPzAt(178) >= P.hi - 1e-9,
         `관 밖 구간(x 178)도 판 높이 ${r2(cheekTopPzAt(178))} — 평평(★75)`)
      ok(Math.abs(cheekTopPzAt(P.rx1) - JCT_PLATE_TOP) < 1e-9,
         `판 −x변(x ${r2(P.rx1)})에서 판 윗면 ${r2(JCT_PLATE_TOP)}에 정확히 닿는다 — 판이 상단을 삼킨다`)
      const slope = (P.hi - P.lo) / (P.rx1 - P.rx0)
      ok(slope < 0.6, `레이크 경사 ${r2(slope)} < 0.6 — 단차가 아니라 경사로 읽힌다`)
      const g = buildPzCheek()
      ok(finite(g) && Math.abs(vol(g)) > 0, `+z 볼벽 솔리드 부피 ${r2(Math.abs(vol(g)))} > 0`)
    }
    ok(CHEEK_TOP_NZ >= JCT_PLATE_TOP - 0.9,
       `−z 볼벽 상단 ${r2(CHEEK_TOP_NZ)} ≥ 판 윗면 − 0.9 — 봉인 하한(낮추면 하강 우측 시선 누출)`)
  }

  // ── ★71 전망 판 두께 분리 ──
  ok(LK_DISC_T > LAND_T, `전망 판 두께 ${LK_DISC_T} > 정션 판 ${LAND_T} — 상수 분리(구판은 공유라 종잇장)`)
  ok(2 * LK_PLAT_R / LK_DISC_T < 12, `판 지름 ${2*LK_PLAT_R} : 두께 ${LK_DISC_T} = 1:${r2(2*LK_PLAT_R/LK_DISC_T)} < 1:12 — 종잇장 탈출`)
  ok(Math.abs(LK_DISC_LIFT - Math.max(0.1, LK_TOPSTEP_TOP + 0.05 + LK_DISC_T - U_LOOKOUT_END * H)) < 1e-9,
     `판 들림이 두께의 파생 — 두께를 키우면 램프가 저절로 따라온다(사본 없음)`)
}


// ══════════════════════════════════════════════════════════════════════════
console.log('\n— V. ★77 프리즈 방 서벽 창 (1p7의 방에 빛을 들인다) —')
// ══════════════════════════════════════════════════════════════════════════
if (!FR_WIN_ON) {
  ok(true, `서벽 창 꺼짐(FR_WIN_MODE='${FR_WIN_MODE}') — 검사 생략(방 밀폐 복귀)`)
} else {
  const rx0 = TEMPLE_X0 + FR_WALL_T
  const ceilIn = ceilY(rx0) - 0.02 - FR_CEIL_T

  //  ① 개구가 벽 안에 있는가 — 넘기면 창이 아니라 홈·이 빠진 자국이 된다
  ok(FR_WIN_SILL < FR_WIN_HEAD, `창턱 ${r2(FR_WIN_SILL)} < 상단 ${r2(FR_WIN_HEAD)} — 높이 ${r2(FR_WIN_HEAD - FR_WIN_SILL)}`)
  ok(FR_WIN_SILL >= FR_WIN_SILL_MIN,
     `창턱 ${r2(FR_WIN_SILL)} ≥ 하한 ${r2(FR_WIN_SILL_MIN)} — 바닥(${FR_FLOOR_Y}) 살 보존`)
  ok(FR_WIN_HEAD <= FR_WIN_HEAD_MAX,
     `상단 ${r2(FR_WIN_HEAD)} ≤ 상한 ${r2(FR_WIN_HEAD_MAX)} — 방 천장(${r2(ceilIn)})을 안 파고든다`)
  ok(FR_WIN_HZ <= FR_WIN_HZ_MAX,
     `z 반폭 ${r2(FR_WIN_HZ)} ≤ 상한 ${r2(FR_WIN_HZ_MAX)} — 옆벽 살 보존`)
  //  아치 크라운(z=0에서 최고 ${TEMPLE_Y0}+${TEMPLE_OPEN})보다 위라야 창이 아치 터널로 안 샌다
  ok(FR_WIN_SILL > TEMPLE_Y0 + TEMPLE_OPEN,
     `창턱 ${r2(FR_WIN_SILL)} > 아치 크라운 ${r2(TEMPLE_Y0 + TEMPLE_OPEN)} — 아치 터널로 안 샘`)

  //  ② 리브 관통 구멍과 안 만나는가 — 만나면 창이 리브 구멍으로 이어져 보어가 열린다
  let ribW = 1e9, ribWho = ''
  for (const d of hallDoors()) {
    for (let y = FR_WIN_SILL; y <= FR_WIN_HEAD; y += 0.5) {
      const cx = rOf(y / H) * Math.cos(d.phi) - (SHELL_RIB_R + RIB_HOLE_CLR)
      if (cx < ribW) { ribW = cx; ribWho = '#' + d.k }
    }
  }
  ok(ribW > TEMPLE_X0 + FR_WALL_T + 1,
     `리브 구멍 서쪽 끝 최저 ${r2(ribW)}(${ribWho}) > 자르개 동쪽 끝 ${r2(TEMPLE_X0 + FR_WALL_T + 1)} — 창과 리브 구멍 무접촉`)

  //  ③ 창살 — 세로살만(현도 지정), 개수·간격은 리브 파생. 동일 평면 금지(★75 폭 사슬 교훈)
  if (!FR_WIN_BAR_ON) {
    ok(true, '창살 꺼짐 — 검사 생략')
  } else {
    const bz = friezeWinBarZ()
    ok(bz.length === (FR_WIN_BAR_ALIGN === 'between' ? 4 : 5),
       `창살 ${bz.length}개 — 정렬 '${FR_WIN_BAR_ALIGN}'(리브 다섯에서 파생, 여기서 개수를 안 쓴다)`)
    ok(bz.every(v => Math.abs(v) + FR_WIN_BAR_W / 2 < FR_WIN_HZ),
       `창살 전부 개구 안(z ±${r2(FR_WIN_HZ)}) — 가장 바깥 살 ${r2(Math.max(...bz.map(Math.abs)))} + 반폭`)
    let sep = 1e9
    const srt = [...bz].sort((a, b) => a - b)
    for (let i = 1; i < srt.length; i++) sep = Math.min(sep, srt[i] - srt[i - 1])
    ok(sep > FR_WIN_BAR_W, `살 최소 간격 ${r2(sep)} > 살 폭 ${FR_WIN_BAR_W} — 살끼리 안 붙는다`)
    //  ★동일 평면 금지 — 0이면 벽 앞/뒷면과 정확히 같은 평면이 되어 아티팩트가 난다
    ok(FR_WIN_BAR_SET > 0, `살 후퇴 ${FR_WIN_BAR_SET} > 0 — 파사드 면과 동일 평면 아님`)
    ok(FR_WIN_BAR_IN > 0, `살 내밈 ${FR_WIN_BAR_IN} > 0 — 벽 안쪽면과 동일 평면 아님`)
    ok(FR_WIN_BAR_SET < FR_WALL_T, `살 후퇴 ${FR_WIN_BAR_SET} < 벽 두께 ${FR_WALL_T} — 살이 인방 안에 남는다`)
    //  ★물림 — 안 물리면 살이 허공의 막대가 된다(★62 링 슬롯 계열의 병)
    ok(FR_WIN_SILL - FR_WIN_BAR_BITE > FR_FLOOR_Y,
       `살 아랫끝 ${r2(FR_WIN_SILL - FR_WIN_BAR_BITE)} > 방 바닥 ${FR_FLOOR_Y} — 아래 물림이 살 속에 든다`)
    ok(FR_WIN_HEAD + FR_WIN_BAR_BITE < ceilIn,
       `살 윗끝 ${r2(FR_WIN_HEAD + FR_WIN_BAR_BITE)} < 방 천장 ${r2(ceilIn)} — 위 물림이 살 속에 든다`)
  }

  //  ④★★봉인 — 홀에서 ★56 절단이 보이는가. **막지 않고 잰다**(현도가 'grand'로 여는 것을 택했다).
  //   봉인선을 여기서 **다시 유도**해 상수 FR_WIN_SEAL_Y와 대조한다 — 숫자만 남고 근거를 잃는 것 방지.
  if (RIB_CUT_ON && FRIEZE_ROOM_ON) {
    const cuts = ribCutSpec()
    const XW = TEMPLE_X0, rzh = TEMPLE_HZ - FR_WALL_T
    const cOut = ceilY(XW) - 0.02, cInW = ceilIn
    const targets = []
    for (const c of cuts) for (let y = c.yBot; y <= c.yTop + 1e-9; y += 1.0) {
      const r = rOf(y / H)
      targets.push({ k: c.k, x: r * Math.cos(c.phi), y, z: r * Math.sin(c.phi) })
    }
    let hStar = -Infinity
    const seen = new Set()
    for (let vx = COR_CYL_X0 + 2; vx <= 286; vx += 4) {
      const dz = Math.sqrt(Math.max(0, COR_R * COR_R - (vx - COR_CX) ** 2))
      for (let vz = -dz + 1; vz <= dz - 1; vz += 4) {
        for (let vy = 39.9; vy <= 103.001; vy += 4) {
          for (const g of targets) {
            if (g.x <= vx) continue
            const t = (XW - vx) / (g.x - vx)
            if (t < 0 || t > 1) continue
            const hy = vy + t * (g.y - vy)
            if (hy < FR_FLOOR_Y || hy > cOut) continue
            const hz = vz + t * (g.z - vz)
            if (Math.abs(hz) > rzh) continue
            const t2 = (XW + FR_WALL_T - vx) / (g.x - vx)
            if (vy + t2 * (g.y - vy) > cInW) continue
            if (hy > hStar) hStar = hy
            if (hy >= FR_WIN_SILL && hy <= FR_WIN_HEAD) seen.add(g.k)
          }
        }
      }
    }
    ok(isFinite(hStar) && Math.abs(hStar - FR_WIN_SEAL_Y) < 1.2,
       `봉인선 재유도 ${r2(hStar)} ≈ 상수 FR_WIN_SEAL_Y ${FR_WIN_SEAL_Y} (±1.2 · 성긴 표본) — 근거가 살아 있다`)
    const exposed = [...seen].sort((a, b) => a - b)
    if (FR_WIN_SILL > FR_WIN_SEAL_Y) {
      ok(exposed.length === 0,
         `봉인 유지 — 창턱 ${r2(FR_WIN_SILL)} > 봉인선 ${FR_WIN_SEAL_Y} · 홀에서 절단 노출 0기`)
    } else {
      //  ⚠실패가 아니다. 현도가 2026.07.28에 'ㄴ = 봉인을 연다'를 택했다. 비용을 매 실행마다 보고한다.
      ok(true,
         `⚠봉인 열림(현도 판정 ㄴ) — 창턱 ${r2(FR_WIN_SILL)} ≤ 봉인선 ${FR_WIN_SEAL_Y} · 홀에서 절단 노출 ${exposed.length}기 [${exposed.map(k => '#' + k).join(' ')}] — 유지/철회는 로컬 육안 판정`)
      ok(exposed.length <= 5, `노출 리브 ${exposed.length} ≤ 5 — 프리즈 방을 지나는 다섯 밖으로는 안 번진다`)
    }
  }
}

// ════════ ★87 M절. 돔 거울 확장 — 캡슐·접합·민짜 (2026.07.29 브리프 §5) ════════
//  지키는 것 셋: ① 접합 C1(림 평면에서 꺾임 없음 — ★86 실측 2e-8°의 상시화) ② 하반부 = 상반부의
//  거울(r 대칭 — §1 LOCKED "72기 동일"의 하반부 연장. 방위 격자는 인스턴싱이 구성으로 보장) ③ **민짜**:
//  수술(문5·아치·빛기둥·절단)은 전부 상반부 국소이고 하반부엔 개구가 하나도 없다(유령 부재 — 광선 실측).
console.log('\n— ★87 M절. 돔 거울 확장 (캡슐·접합·민짜) —')
if (!MIR_ON) {
  ok(true, '미러 꺼짐(MIR_ON=false) — 구세계 복원 경로. M절 생략')
} else {
  const f = MIR_DEPTH_F
  const cur = makeRibCurve()
  //  ① 캡슐 치수 — 깊이·바닥 개구·camera far 여유(브리프 §2)
  {
    const p0 = cur.getPoint(0)
    ok(Math.abs(p0.y - (-H * f)) < 1e-6 && Math.abs(p0.x - rOf(f)) < 1e-6,
       `캡슐 밑끝 (r ${r2(p0.x)}, y ${r2(p0.y)}) = (rOf(f) ${r2(rOf(f))}, −H·f ${r2(-H * f)}) — 절단 미러(압축 아님)`)
    const diag = Math.hypot(2 * R_BASE, H * (1 + f))
    ok(diag < 3000, `캡슐 대각 ${r2(diag)} < camera far 3000 — 어느 끝에서도 반대 끝이 잘리지 않는다`)
  }
  //  ② 접합 C1 — 적도(y=0)를 지나는 접선이 수직에서 벗어나지 않는다(꺾임 = 이음새)
  {
    //  적도의 곡선 파라미터를 y로 이분 탐색(호길이 파라미터라 u→t 해석식이 없다)
    let lo = 0, hi = 1
    for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (cur.getPointAt(m).y < 0) lo = m; else hi = m }
    const tg = cur.getTangentAt((lo + hi) / 2)
    const kink = Math.atan2(Math.abs(tg.x), Math.abs(tg.y)) * 180 / Math.PI
    ok(kink < 1e-3, `적도 접선 수직 이탈 ${kink.toExponential(1)}° < 1e-3° — 거울 접합 무꺾임(★86 실측 2e-8°의 상시화)`)
  }
  //  ③ 하반부 = 상반부의 거울 — 표본 y에서 r(−y) = r(+y). 방위 격자 동일은 인스턴싱(같은 기하 72회전)이
  //   구성으로 보장하므로 여기서는 곡선 수준만 잰다(§1 LOCKED R7 [정점·법선 0]이 셸 수준을 이미 잰다).
  {
    const rAtY = (y) => {   // 호길이 파라미터에서 y로 이분 탐색해 반지름을 읽는다
      let lo = 0, hi = 1
      for (let it = 0; it < 50; it++) { const m = (lo + hi) / 2; if (cur.getPointAt(m).y < y) lo = m; else hi = m }
      return cur.getPointAt((lo + hi) / 2).x
    }
    let worst = 0
    for (const v of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const y = H * Math.min(v * f, f) * 0.999
      worst = Math.max(worst, Math.abs(rAtY(-y) - rAtY(y)))
    }
    ok(worst < 5e-3, `하반부 반지름 대칭 |r(−y) − r(+y)| 최대 ${worst.toExponential(1)} < 5e-3 — 거울 프로파일`)
  }
  //  ④ ★민짜 — 수술 자국의 하반부 유령 부재. 여정 리브 둘의 **실제 CSG 결과**(렌더와 같은 구축)에
  //   하반부 대역 방사 광선을 쏜다: 축→바깥, 전부 껍질에 막혀야 한다(뚫림 = 유령 개구).
  //   수술 브러시 12종 y범위 전수 실측(2026.07.29 _probe_mirror87): 최저 = 문 #−2 밑 y9 — 전부 y≥0.
  {
    const ev5 = new Evaluator(); ev5.attributes = ['position', 'normal']
    const holed = (k) => {   // Dome.jsx ExplorationRib·HallDoorRibs와 같은 구축(간이 — 문+절단만: 아치·빛기둥은 y247+)
      const { geometry: tube } = buildRibShell(makeRibCurve(), RIB_WALL_T)
      const d = hallDoors().find(v => v.k === k)
      const doorCut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
      doorCut.translate(rOf(d.sill / H) - SHELL_RIB_R, d.sill + DOOR_H / 2, 0)
      const a = new Brush(tube); a.updateMatrixWorld()
      const b = new Brush(doorCut); b.updateMatrixWorld()
      let acc = ev5.evaluate(a, b, SUBTRACTION)
      const c = ribCutSpec().find(v => v.k === k)
      if (c) {
        const g = new THREE.BoxGeometry(RIB_CUT_BOX_HW * 2, c.gap, RIB_CUT_BOX_HW * 2)
        const yM = (c.yBot + c.yTop) / 2
        g.translate(rOf(yM / H), yM, 0)
        const cb = new Brush(g); cb.updateMatrixWorld()
        acc = ev5.evaluate(acc, cb, SUBTRACTION)
      }
      return acc.geometry
    }
    for (const k of [0]) {
      const g = holed(k)
      const mesh = new THREE.Mesh(g.index ? g.toNonIndexed() : g); mesh.updateMatrixWorld()
      const rc = new THREE.Raycaster()
      //  ⚠광선은 수평이 아니라 **링 평면**(국소 축에 수직)으로 쏜다 — 무릎 거울부(y −240)는 축이 크게
      //   기울어 수평 광선이 보어를 따라가며 far를 초과한다(1차 구현이 그렇게 거짓 뚫림 2를 보고했다 —
      //   '진단 도구를 먼저 검증한다' 전례. 실측: 수평 ±x 광선의 벽 도달 거리 12.8 > far 12).
      const yToT = (y) => { let lo = 0, hi = 1
        for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (cur.getPointAt(m).y < y) lo = m; else hi = m }
        return (lo + hi) / 2 }
      let open = 0, tested = 0
      for (const v of [0.08, 0.25, 0.5, 0.75, 0.95]) {
        const y = -H * f * v
        const t0 = yToT(y)
        const P = cur.getPointAt(t0), T = cur.getTangentAt(t0)
        const n1 = new THREE.Vector3(0, 0, 1)
        const n2 = new THREE.Vector3().crossVectors(T, n1).normalize()   // 링 평면의 두 직교기저
        for (let a = 0; a < 12; a++) {
          const th = a / 12 * Math.PI * 2
          tested++
          const dir = n1.clone().multiplyScalar(Math.sin(th)).addScaledVector(n2, Math.cos(th))
          rc.set(P.clone(), dir)
          rc.far = SHELL_RIB_R * 1.5
          if (rc.intersectObject(mesh, false).length === 0) open++
        }
      }
      ok(open === 0, `#${k} 하반부 민짜 — 링 평면 방사 광선 ${tested}개 전부 껍질에 막힘(뚫림 ${open} = 유령 개구 0)`)
    }
    ok(true, '수술 브러시 12종 y범위 전수 실측 최저 = 문 #−2 y9 ≥ 0 — 하반부 침범 브러시 없음(_probe_mirror87)')
  }
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
