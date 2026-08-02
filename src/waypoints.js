// waypoints.js — 텔레포트 웨이포인트 (개발 도구, ★신설 2026.07.13)
// ============================================================================
//  왜: 로컬 판정 왕복이 P1의 실제 고정비다(실측 = 큰 조형 1건당 당일 3~7 왕복).
//      지금까지는 `SPAWN` 상수를 코드에서 고쳐 쓰고 하드 리로드해야 한 지점에 설 수 있었다.
//      → 여정의 모든 판정 지점을 표로 만들고, 런타임에 즉시 이동한다.
//
//  ★불변식 1 — 좌표 하드코딩 금지: 전부 constants 파생.
//    노브(LK_DISC_DY·X_LAND_HI·CL_PHI1·RAD_DROP…)를 튜닝해도 웨이포인트가 자동 추종한다.
//    (하드코딩하면 튜닝할 때마다 텔레포트가 벽 속·허공으로 간다 = 도구가 도구를 배신함.)
//
//  ★불변식 2 — y는 '발 딛는 면'(walkable 윗면)이다. 눈높이(EYE)는 FirstPersonControls가 더한다.
//    각 값의 근거는 항목별 주석에 해당 메시의 구성 규약을 적어 둔다(박스 = 중심±두께/2, ring = 평면, …).
//
//  ★불변식 3 — 목록 = DESIGN.md §5 정리 배치표. 15개 정리 전부 자기 웨이포인트를 갖는다.
//    (표가 바뀌면 여기도 바뀐다. 반대로, 여기 빈 칸이 생기면 §5에 집 없는 정리가 있다는 뜻.)
//
//  ⚠최종 배포 전: DEV_TELEPORT = false (패널·키 전부 사라짐, 스폰만 남음).
// ============================================================================
import {
  H, R_BASE, MERIDIANS, TREAD_THICK, POLE_CUT_F,
  rOf, ribCenter, spiralPoint,
  U_KNEE_END, U_LOOKOUT_END,
  X_LAND_LO, X_LAND_HI,
  LK_PLAT_R, LK_DISC_LIFT, LK_DISC_HALF, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_ROT,
  PASS_FLOOR_Y, PASS_X_END, RM_X0, RM_X1,
  CL_R, CL_PHI0, CL_PHI1, ST_PHI,
  LAMP_RIBS, LAMP_R,
  TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
  CL_FLOOR_END, clFloorY,        // ★78-2 계단 바닥
  COR_Y0, COR_THICK, PLAT_X, PLAT_Y, PLAT_R, DESC_X0, DESC_X1, PLAT_DROP,
  HALL_ENTRY, ASC_X0, ASC_X1, ASC_RISE, ORB_CX, ORB_FLOOR_Y,
  ROOM_CX, ROOM_FLOOR_Y, DAIS_H, ROOM_DISC_HOLE, ROOM_LAND_R,
  RAD_ANG0, RAD_R, RAD_JX, RAD_FLOOR_Y,
  P_FLOOR_TOP, P_SPAWN_LX, P1_ON,
  PIT_ON, NICHE_ON, SLOT_ON,} from './constants.js'
import { pitSpec, nicheSpec, nicheFloorYAt, slotSpec } from './defPitGeometry.js'   // ★101 각뿔대 · ★102 감실(좌표 사본 금지 — 스펙 파생)
import { p1HeightAt } from './radialEventsGeometry.js'   // 1p1 볼록 바닥 보정(모드·노브 자동 추종)
import { buildHallStairs, incaStairSpec, incaBladesSpec, descentSpec } from './corridorStairsGeometry.js'   // ★㊳ 계단 끝 4곳 + ★㊷ 날 끝 4곳(못 닿음 판정 지점) — 빌더 파생(자동 추종)
import { INCA_ON, INCA_GAP, FRIEZE_ROOM_ON, FR_FLOOR_Y, FR_WALL_T, TEMPLE_X0 } from './constants.js'   // ★55 프리즈 방
import { RIB_XFER_ON, RIB_DEST_PHI, STELE7_F, STAIR_STEPS, spiralU, RIB_FREE_MODE, RIB_OPEN_ON } from './constants.js'
import { ST_ON, RM10_ON, RM10_PHI, RM10_AX_R, RM10_FLOOR_Y, RM10_FLOOR_OPEN_R, RM10_ENTRY_TH, RM10_DOOR_HTH, RM10_TURN, RM10_CCW } from './constants.js'   // ★79 등불 방
import { RM10_EXIT_RIN, RM10_EXIT_ROUT, RM10_EXIT_TH, RM10_TERR_TH, RM10_EXIT_FLOOR_Y, RM10_STR_END } from './constants.js'   // ★79-5/6 출구 통로
import { RM10_FLARE_ON, RM10_FLARE_MX, RM10_FLARE_MZ, RM10_FLARE_MY, TERRACE_ON } from './constants.js'   // ★80 S자 나팔
import { terraceSpec, terracePoint, terraceLinkSpec } from './terraceGeometry.js'   // ★85·89·90 테라스(사본 금지 — 좌표는 빌더 파생)
import { TR_LINK_ON, GAT_CX } from './constants.js'   // ★90
import { openRimSpec, isOpenRib } from './ribGeometry.js'                                              // ★63 우물 발코니
import { ribCutSpec } from './corridorStairsGeometry.js'                                               // ★63 리브별 절단 좌표  // ★61 리브 갈아타기
import { freeSplitRange, destCut } from './ribGeometry.js'                               // ★61 자립 나선(정본 파생)
import { kneeTreads, kneeStairSpec } from './kneeStair.js'   // ★66·67 무릎길 계단 정본(사본 금지)

// ── 스위치 ──
export const DEV_TELEPORT = true      // ⚠배포 전 false — 패널·[·]·Tab 전부 비활성(스폰만 남음)
export const SPAWN_ID     = 'corridor' // ★㊳ 판정 세션용(1p5 홀). 직전 'p1'. 배포 최종은 'room'

// 사람 눈높이(동결 — §3 '사람 치수 고정'). 웨이포인트 y(발 딛는 면)를 눈높이로 올리는 유일한 상수.
//  FirstPersonControls가 이 값을 import해 쓴다(중복 정의 금지 — 어긋나면 텔레포트만 눈높이가 달라짐).
export const EYE = 1.6

// ── 보행 리그(★2026.07.29 W절 신설) — EYE와 **같은 이유**로 여기가 정본이다 ──
//  왜 여기냐: 이 셋은 '웨이포인트 y(발 딛는 면)에서 실제로 걸을 수 있는가'를 정하는 값이고,
//  검사(check_waypoints W절)와 런타임(FirstPersonControls)이 **같은 수를 봐야** 판정이 의미를 갖는다.
//  구판은 FirstPersonControls 안의 지역 const라 Node 검사가 못 읽었다 = 사본을 적을 수밖에 없었다.
//  ⚠STEP_UP/DOWN은 probe()의 광선 길이를 정한다: 발+STEP_UP에서 아래로 (STEP_UP+STEP_DOWN)만큼.
//   즉 **올라설 수 있는 최대 단차 = STEP_UP · 내려설 수 있는 최대 낙차 = STEP_DOWN**.
//   이보다 큰 이음매는 '보이지만 밟을 수 없는' 지점이 된다(★60·★62·★63 전례).
export const STEP_UP   = 0.8   // 올라설 수 있는 최대 단차
export const STEP_DOWN = 2.2   // 내려설 수 있는 최대 낙차
//  ⚠편집 중 노브 — true면 probe()를 건너뛴다(벽 통과·무낙하). 형태는 검증되지만 **보행은 안 된다**.
//   운용계획 v5 §8 운용규칙 2: P3 5일 예산은 '이미 걸어봤다'를 전제로 선 값이다.
export const FREE_WALK = true

// ── 시선 헬퍼 ──
//  FirstPersonControls의 전진 벡터 = (−sin yaw, 0, −cos yaw).
//  따라서 수평방향 (dx,dz)를 바라보려면 yaw = atan2(−dx, −dz).  (pitch: + = 위)
const yawTo = (dx, dz) => Math.atan2(-dx, -dz)

// ── ★61 상부 여정 회전(목적지 리브 #+2, 방위각 +RIB_DEST_PHI) ──
//  위치 (x,z)와 시선(yaw)을 **같은 변환**으로 돌린다 — App.jsx 그룹 회전·RibStair 인스턴스 회전과 동일.
//  유도: fwd(yaw)=(−sin,−cos)를 방위각 +φ 회전하면 fwd(yaw−φ) ⇒ yaw' = yaw − φ.
const XPHI = RIB_XFER_ON ? RIB_DEST_PHI : 0
const XC = Math.cos(XPHI), XS = Math.sin(XPHI)
const rX   = (x, z) => x * XC - z * XS
const rZ   = (x, z) => x * XS + z * XC
const rYaw = (yaw) => yaw - XPHI
const FACE_PX = yawTo(1, 0)     // +x(리브·바깥) 향
const FACE_NX = yawTo(-1, 0)    // −x(돔 중심) 향
const FACE_PZ = yawTo(0, 1)     // +z 향

// ── 구간별 바닥 레벨(메시 구성 규약에서 파생) ──
const HUB_TOP   = COR_Y0 + COR_THICK / 2 + 0.02   // Room.jsx 착지 디스크 윗면(압출 슬랩) ≈49.32
const PLAT_TOP  = PLAT_Y + COR_THICK / 2          // ★㊴ 낮은 플랫폼 상면 ≈45.8 — corridor 웨이포인트 기준(다리 49.3과 분리)
const JOINT_TOP = RAD_FLOOR_Y + COR_THICK / 2     // Radial.jsx 접합 패드 = 박스 중심 RAD_FLOOR_Y + 두께/2 ≈49.28
//  ★78-2 회랑 바닥은 φ의 함수다(계단) — 상수 하나로 못 쓴다. 지점마다 clFloorY로 딴다.
const CL_FLOOR  = (phi) => clFloorY(phi) - 0.02   // Dome.jsx 회랑 바닥 = ring 평면(층계참 − 0.02)
const ST_FLOOR  = CL_FLOOR_END - 0.05             // ★78-2 스텁 = 마지막 층계참 높이(Dome.jsx와 동일 식)

// ── 리브 나선(f축: 0=문 · 1=나선 끝). 디딤판 윗면 = 중심 y + 두께/2 ──
const treadTop = (f) => {
  const { pos } = spiralPoint(f)
  return { x: pos.x, y: pos.y + TREAD_THICK / 2, z: pos.z }
}
const D0 = treadTop(0)                // 문 안쪽 첫 디딤판(위상 π = −x면)
const DP = treadTop(POLE_CUT_F)       // 폴 절단 지점(1p6 종단 → 1p7)

// 폴은 (x=R_BASE, z=0)의 수직 원기둥. 절단 캡의 높이 = Y_POLE_CUT = 이 디딤판의 중심 y와 같다
//  → 캡은 눈보다 (디딤판 두께/2 + EYE)만큼 아래, 수평으로 STAIR_R만큼 옆. 그 각을 그대로 역산해 내려본다.
const POLE_DX = R_BASE - DP.x, POLE_DZ = 0 - DP.z
const POLE_HD = Math.hypot(POLE_DX, POLE_DZ)                        // 캡까지 수평거리(= STAIR_R ≈3.3)
const POLE_PITCH = -Math.atan2(TREAD_THICK / 2 + EYE, POLE_HD)

// ── 무릎길 중간 — ★66 이후 배치 정본은 kneeStair 하나뿐이다(사본 재현 금지) ──
//  ⚠구판은 여기서 블렌드 식을 **다시 적었다**. 계단이 참을 갖게 되면서 그 사본은 즉시 거짓이 됐을 것이다.
//   웨이포인트는 이제 실제 디딤판 배열의 가운데 칸에 선다.
const kneeWalkAt = (i) => {
  const T = kneeTreads()
  const t = T[Math.min(T.length - 1, Math.max(0, i))]
  return { x: t.x, y: t.y + TREAD_THICK / 2, z: 0 }
}
const KW = kneeWalkAt(Math.floor(kneeTreads().length / 2))

// ── 전망 반원판: 재질 반쪽이 로컬 −x에 있다(thetaStart π) → 중심(=지름변)이 아니라 안쪽으로 들어가 선다 ──
const LK_X0 = rOf(U_LOOKOUT_END) + LK_DISC_DX
const LK_Y  = U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY   // 디스크 윗면
const LK_IN = (LK_DISC_HALF ? LK_PLAT_R * 0.45 : 0)           // 지름변에서 반쪽 안으로(회전 노브 반영)

// ── 회랑: 호 시작 살짝 안쪽. 진행(접선)과 창(반경 바깥) 사이 45°를 봄 ──
const CL_PHI = CL_PHI0 + 0.035
const CL_T = [-Math.sin(CL_PHI), Math.cos(CL_PHI)]   // 접선(+φ = 걷는 방향)
const CL_O = [Math.cos(CL_PHI), Math.sin(CL_PHI)]    // 반경 바깥(= 개구가 난 벽)

// ── 등불: 마지막 등불(하강 램프의 끝 — 몸 가까이 내려온 것) 밑 ──
const LAMP_K = LAMP_RIBS[LAMP_RIBS.length - 1]
const LAMP_PHI = (LAMP_K / MERIDIANS) * Math.PI * 2

// ── 스텁 끝 문(1p11): 문 안쪽 3에서 문을 정면으로 ──
const DOOR_RR = PASS_X_END + 3.0

// ── 방사 꽃잎 4(등형: 같은 로컬 좌표를 4회 회전) — 문 안쪽·비석 정면 ──
const petal = (id, k, label, prop) => {
  const ang = RAD_ANG0 + k * Math.PI / 2
  const r = RAD_R + P_SPAWN_LX                                   // 로컬 z=0 → 월드 = 같은 방위의 반경 r
  const lift = (id === 'p1' && P1_ON) ? p1HeightAt(P_SPAWN_LX, 0) : 0   // 볼록 바닥은 1p1 방만
  return {
    id, group: '방사 (1p1~4)', label, prop,
    x: r * Math.cos(ang), y: P_FLOOR_TOP + lift, z: r * Math.sin(ang),
    yaw: yawTo(Math.cos(ang), Math.sin(ang)), pitch: 0,          // 로컬 +x = 방사 바깥 = 비석 벽
  }
}

// ============================================================================
//  웨이포인트 표 — 여정 순서([ ] 키가 이 순서로 순환)
// ============================================================================
// ── ★61 파생: 횡단(비석 자리) · 자립 나선 중간 · 아가리 ──
//  전부 정본 함수(freeSplitRange·destCut·ribCenter) 파생 — 시드·노브를 갈아도 자동 추종.
const X61 = (() => {
  if (!RIB_XFER_ON) return null
  const fr = freeSplitRange(), dc = destCut()
  if (!fr || !dc) return null
  //  횡단 현: #0 발치 → 목적지 발치(방 바닥 높이의 리브 축). FriezeCrossing과 같은 식.
  const c0 = ribCenter(FR_FLOOR_Y / H)
  const p0 = [c0.x, c0.z], p2 = [rX(c0.x, c0.z), rZ(c0.x, c0.z)]
  const dx = p2[0] - p0[0], dz = p2[1] - p0[1]
  let nx = dz, nz = -dx; const nL = Math.hypot(nx, nz); nx /= nL; nz /= nL
  if (nx * (p0[0] + dx / 2) + nz * (p0[1] + dz / 2) > 0) { nx = -nx; nz = -nz }   // 안쪽(서) 법선
  const crossX = p0[0] + dx * STELE7_F, crossZ = p0[1] + dz * STELE7_F
  //  자립 나선 중간 칸(쐐기 상면) — 위치·자세는 RibStair 배치 규약과 동일(축중심 + 회전)
  const stand = (i, wedge) => {
    const f = (i + 0.5) / STAIR_STEPS
    const { pos, theta } = spiralPoint(f)
    const c = ribCenter(spiralU(f))
    const bx = wedge ? c.x : pos.x, bz = wedge ? c.z : pos.z
    return { x: rX(bx, bz), y: c.y + TREAD_THICK / 2, z: rZ(bx, bz), theta }
  }
  const mid = Math.floor((fr.start + fr.end) / 2)
  const fv = stand(mid, RIB_FREE_MODE === 'vice')      // ★62-2: 'plate'면 판 배치(헬릭스 위)
  const mo = stand(Math.min(STAIR_STEPS - 1, fr.end + 1), false)          // 아가리 위 첫 판들
  //  시선: 횡단 = 비석 쪽(법선 n̂) · 자립 = 목적지 축 쪽 · 아가리 = 보어 위(pitch가 담당)
  const ax = rX(c0.x, c0.z), az = rZ(c0.x, c0.z)
  return {
    crossX, crossZ, crossYaw: yawTo(nx, nz),
    fvX: fv.x, fvY: fv.y, fvZ: fv.z, fvYaw: yawTo(ax - fv.x, az - fv.z),
    moX: mo.x, moY: mo.y, moZ: mo.z, moYaw: yawTo(ax - mo.x, az - mo.z),
  }
})()

// ── ★63 파생: 우물 발코니 판정 지점(#+1 = 횡단 경로 곁 — 돌아가며 마주치는 우물) ──
const BAL = (() => {
  if (!RIB_OPEN_ON) return null
  const rs = openRimSpec(); if (!rs) return null
  const c = ribCutSpec().find(v => isOpenRib(v.k) && v.k > 0) || ribCutSpec().find(v => isOpenRib(v.k))
  if (!c) return null
  //  발코니 판 한가운데(고리 중간 반경)에서 우물 쪽(축)을 본다 — 난간에 기대 내려다보는 자세
  const r = (rs.balIn + rs.balOut) / 2
  const ux = -Math.cos(Math.atan2(c.bz, c.bx)), uz = -Math.sin(Math.atan2(c.bz, c.bx))   // 돔 중심 쪽
  return { x: c.bx - ux * r, y: rs.balY1, z: c.bz - uz * r, yaw: yawTo(ux, uz), k: c.k }
})()

// ★101 정의 각뿔대 바닥(2026.08.02) — 블록아웃 사이즈감 판정 지점.
//  바닥 한가운데에 서서 **D1 면 중심**(방위 22.5°)의 한복판을 본다. 면이 62° 경사라 올려다보는 자세가 된다.
//  ⚠불변식 1 — 좌표 하드코딩 0: 깊이·상면·하면 노브를 밀면 이 지점이 자동으로 따라온다.
const PIT_WP = PIT_ON ? (() => {
  const s = pitSpec()
  const az = s.faceAz[0]                                  // D1 자리
  const rMid = (s.apoTop + s.apoBot) / 2                  // 면 중앙까지의 축거리(내접반경 평균)
  const yMid = (s.yTop + s.yBot) / 2                      // 면 중앙 높이
  return {
    y: s.yBot,                                            // 발 딛는 면 = 각뿔대 바닥 윗면(불변식 2)
    yaw: yawTo(Math.cos(az), Math.sin(az)),
    pitch: Math.atan2(yMid - (s.yBot + EYE), rMid),
  }
})() : null

// ★102 감실 안(2026.08.02) — D1 감실의 절반쯤 들어가 **뒷벽**을 본다(정의가 앉을 면).
//  y는 nicheFloorYAt이 정한다 → 'flat'이면 턱, 'stair'면 그 자리 단의 윗면(체제 자동 추종).
const NICHE_WP = (PIT_ON && NICHE_ON) ? (() => {
  const q = nicheSpec(), az = q.s.faceAz[0]
  const rr = q.s.apoAt(q.yS) + (q.backAt(q.yS) - q.s.apoAt(q.yS)) * 0.75   // 뒷벽 체제 자동 추종 · ⓑ에선 착지(수평 바닥) 위
  return { x: rr * Math.cos(az), z: rr * Math.sin(az), y: nicheFloorYAt(rr),
    yaw: yawTo(Math.cos(az), Math.sin(az)) }
})() : null

//  ★103 슬롯 — 턱 높이 바닥 한가운데에 서서 **뒷벽(바깥)을 본다**. 위를 올려다보면 판까지 20이 트여 있다.
const SLOT_WP = (PIT_ON && SLOT_ON) ? (() => {
  const g = slotSpec()
  const rr = (g.rEdge(g.y0) + g.back) / 2
  return { x: rr * Math.cos(g.az), z: rr * Math.sin(g.az), y: g.y0,
    yaw: yawTo(Math.cos(g.az), Math.sin(g.az)) }
})() : null

export const WAYPOINTS = [
  { id: 'room', group: '지상', label: '정의·공리 방 (기단 위)', prop: 'D1~8 · A1~7',
    x: ROOM_CX, y: ROOM_FLOOR_Y + DAIS_H, z: 0, yaw: FACE_NX, pitch: 0 },
  ...(PIT_ON ? [{ id: 'defpit', group: '지상', label: '정의 각뿔대 바닥 (★101 블록아웃)', prop: 'D1~8',
    x: ROOM_CX, y: PIT_WP.y, z: 0, yaw: PIT_WP.yaw, pitch: PIT_WP.pitch }] : []),
  ...(PIT_ON && NICHE_ON ? [{ id: 'defniche', group: '지상', label: 'D1 감실 안 (★102)', prop: 'D1',
    x: ROOM_CX + NICHE_WP.x, y: NICHE_WP.y, z: NICHE_WP.z, yaw: NICHE_WP.yaw, pitch: 0 }] : []),
  ...(PIT_ON && SLOT_ON ? [{ id: 'defslot', group: '지상', label: '모서리 슬롯 바닥 (★103)', prop: '—',
    x: ROOM_CX + SLOT_WP.x, y: SLOT_WP.y, z: SLOT_WP.z, yaw: SLOT_WP.yaw, pitch: 0.35 }] : []),

  // 허브 = 빛우물 원뿔대 안. 디스크는 고리(r 6~18)이고 +x에 59° 슬롯(구멍)이 뚫려 있으므로
  //  슬롯 반대편(φ=180°)의 고리 위에 선다. 정면(+x)에 슬롯·빛우물, 좌우 뒤로 대각 문 4.
  { id: 'hub', group: '방사 (1p1~4)', label: '허브 (착지 디스크 · 대각 문 4)', prop: '—',
    x: -(ROOM_DISC_HOLE + ROOM_LAND_R) / 2, y: HUB_TOP, z: 0, yaw: FACE_PX, pitch: 0 },

  petal('p1', 0, 'NE 꽃잎 — 미분리 융기', '1p1'),
  petal('p2', 1, 'NW 꽃잎 — 전단 천장', '1p2'),
  petal('p3', 2, 'SW 꽃잎 — 천장 인발 4기', '1p3'),
  petal('p4', 3, 'SE 꽃잎 — 무어 군집', '1p4'),

  { id: 'joint', group: '통로 (1p5)', label: '접합문 (고리 → 박스)', prop: '—',
    x: RAD_JX, y: JOINT_TOP, z: 0, yaw: FACE_PX, pitch: 0 },
  // ★㊾ 진입 체제 3분기(2026.07.23): 신 하강로(axial/lateral) / 구 소구계 / 구 ㊴-5 하강계.
  //  ⚠구조 교정: 잉카 판·못 닿는 날 4는 **진입 체제와 무관한** 1p5 판정 지점인데 asc-sphere 가지
  //   안에만 있어, 체제를 바꾸면 통째로 사라졌다(㊾에서 발견). → 아래 공통 블록으로 승격.
  ...(HALL_ENTRY === 'asc-sphere' ? [
    { id: 'slope', group: '통로 (1p5)', label: '상승 계단 — 중간 (㊵-5)', prop: '—',
      x: (ASC_X0 + ASC_X1) / 2, y: COR_Y0 + COR_THICK / 2 + ASC_RISE * 0.5, z: 0,
      yaw: FACE_PX, pitch: 0.1 },
    { id: 'corridor', group: '통로 (1p5)', label: '소구 안 (부양 막다른 방 · ㊵-5)', prop: '1p5',
      x: ORB_CX, y: ORB_FLOOR_Y, z: 0, yaw: FACE_PX, pitch: 0 },
  ] : HALL_ENTRY === 'descent' ? [
    { id: 'slope', group: '통로 (1p5)', label: '하강 계단 — 중간 (제단 조망)', prop: '—',
      x: (DESC_X0 + DESC_X1) / 2, y: COR_Y0 + COR_THICK / 2 - PLAT_DROP * 0.5, z: 0,
      yaw: FACE_PX, pitch: -0.15 },
    { id: 'corridor', group: '통로 (1p5)', label: '제단 (드럼 안 결절 · ㊵-4)', prop: '1p5',
      x: PLAT_X, y: PLAT_TOP, z: 0, yaw: FACE_PX, pitch: 0 },
  ] : (() => {
    //  좌표 전부 descentSpec() 파생 — DESC_SWEEP·DESC_R를 돌리면 판정 지점이 따라 움직인다.
    const d = descentSpec(HALL_ENTRY)
    const at = f => d.samples[Math.round(f * (d.samples.length - 1))]
    const face = p => yawTo(p.tx, p.tz)                      // 진행 방향 보기
    const a = at(0.30), b = at(0.72)
    const out = []
    //  ★54 월대 — 압축관(내부고 7)에서 나와 처음 서는 자리. 동단 립 앞에서 홀을 **내려다본다**
    //   (발밑 101m). 좌표는 woldaeSpec 파생이라 돌출·반폭 노브를 돌리면 따라온다.
    if (d.woldae.on) {
      const w = d.woldae
      //  ★54-2: 노치가 있으면 **노치 안**에 선다(좋은 자리가 칼끝이 아니라 품이 된 것이 노치의 요점).
      //   시선 = 넥서스 정조준(부각 파생) — 노치 형상·반경을 바꿔도 자동 추종.
      //  ★54-3: 상승단이 있으면 그 위(전망단 동단 앞)에 선다. y는 보행면 정본 surfY가 준다.
      //  ⚠버그 1건 자가 적발(전수 스윕): 'all'은 podEast = 동단(137)이라 그 앞 0.7이
      //   **노치 구멍 안**(x136.3, |z|<4.95가 허공)이었다. 서는 자리는 노치 바닥보다 서쪽이어야 한다.
      const wEast = Math.min(w.rise ? w.rise.podEast : w.x1, w.notch ? w.notchBotX : w.x1)
      const wx = (w.rise || w.notch) ? wEast - 0.7 : w.x1 - w.rim * 2 - 1.4
      const wy = w.surfY(wx, 0)
      const bs0 = incaBladesSpec()
      out.push({ id: 'woldae', group: '통로 (1p5)',
        label: `★월대 — ${w.rise ? '전망단(' + w.rise.form + ' H' + w.rise.H + ')' : w.notch ? '노치 안' : '동단'}`
             + ` (드럼 전경 · 54${w.notch ? '-2 ' + w.notchForm : ''})`, prop: '1p5',
        x: wx, y: wy, z: 0, yaw: yawTo(1, 0),
        pitch: -Math.atan2(wy + EYE - bs0.cutY, bs0.ncx - wx) })
    }
    out.push(
      { id: 'slope', group: '통로 (1p5)', label: `하강로 — 초반 (${d.scheme} · ${d.slopeDeg.toFixed(0)}°)`, prop: '—',
        x: a.x, y: a.y, z: a.z, yaw: face(a), pitch: -0.12 })
    if (d.scheme === 'lateral') {
      //  ★구도점 = **벽 호의 중간**(빌더 viewS 파생 — ★51 접선화로 landS 폐지, 호 범위는 빌더가 안다).
      //   회전량·방향·진입 방위를 어떻게 돌려도 항상 '도는 중간'을 가리킨다.
      const sMid = d.viewS
      let best = d.samples[0], bd = 1e9
      for (const p of d.samples) { const e = Math.abs(p.s - sMid); if (e < bd) { bd = e; best = p } }
      const bs = incaBladesSpec()
      out.push({ id: 'view', group: '통로 (1p5)', label: '★부채 측면 구도 (호 중간 · ㊾)', prop: '1p5',
        x: best.x, y: best.y, z: best.z,
        yaw: yawTo(bs.ncx - best.x, -best.z), pitch: -0.28 })
    }
    out.push({ id: 'corridor', group: '통로 (1p5)', label: `하강로 — 도착 직전 (${d.scheme})`, prop: '1p5',
      x: b.x, y: b.y, z: b.z, yaw: face(b), pitch: -0.15 })
    return out
  })()),
  // ★㊶-6 잉카 진입 판 + ★㊷ 못 닿는 날 끝 4 — 진입 체제와 무관한 공통 판정 지점(㊾ 승격).
  ...(HALL_ENTRY === 'descent' ? [] : [
    { id: 'inca', group: '통로 (1p5)', label: '잉카 계단 진입 판 (부양 · ㊶-6)', prop: '1p5',
      x: (incaStairSpec().panel.x0 + incaStairSpec().panel.x1) / 2, y: incaStairSpec().panel.yTop,
      z: 0, yaw: FACE_PX, pitch: 0.25 },
  ]),
  ...(HALL_ENTRY !== 'descent' && INCA_ON ? incaBladesSpec().blades.filter(b => !b.reach) : []).map(b => {
    const bs = incaBladesSpec(), last = b.steps[b.steps.length - 1]
    const sm = (last.s0 + last.s1) / 2
    return {
      id: `bl${b.k < 0 ? 'm' : 'p'}${Math.abs(b.k)}`, group: '통로 (1p5)',
      label: `잉카 날 끝 #${b.k > 0 ? '+' : ''}${b.k} — 리브 ${INCA_GAP} 앞 허공`, prop: '1p5',
      x: bs.ncx + sm * Math.cos(b.az), y: last.yTop, z: sm * Math.sin(b.az),
      yaw: yawTo(Math.cos(b.az), Math.sin(b.az)), pitch: 0,
    }
  }),
  // ★㊳ 못 닿는 계단 끝 4곳 — "도달하지 못하는 그 감정"의 판정 지점(끝 판 위, 시선 = 문 정면).
  //  좌표 = 빌더 파생(STAIR5·STAIR_GAP 튜닝 자동 추종). #0은 닿으므로 제외(ribdoor가 그 다음 지점).
  ...(HALL_ENTRY === 'descent' ? buildHallStairs().stairs.filter(s => !s.reach) : []).map(s => ({
    id: `st${s.k < 0 ? 'm' : 'p'}${Math.abs(s.k)}`, group: '통로 (1p5)',
    label: `계단 끝 #${s.k > 0 ? '+' : ''}${s.k} — 못 닿는 문 앞`, prop: '1p5',
    x: s.end.x, y: s.end.y, z: s.end.z, yaw: s.yawToDoor, pitch: 0,
  })),

  { id: 'ribdoor', group: '리브 (계단 구역)', label: '리브 문 — 나선 첫 칸', prop: '—',
    x: D0.x, y: D0.y, z: D0.z, yaw: FACE_PX, pitch: 0 },                 // +x = 관 안(폴 쪽)
  //  ⚠구 1p6·1p7 = 폐기 확정(현도 2026.07.24). 폴 절단 장치는 코드·웨이포인트를 남기되
  //   **정리 배당을 뗀다**(폐기 = 경로에서 제거이지 코드 삭제가 아님 — ㊾ 전례).
  { id: 'pole', group: '리브 (계단 구역)', label: '폴 절단 (구 장치 — 정리 배당 없음)', prop: '—',
    x: DP.x, y: DP.y, z: DP.z, yaw: yawTo(POLE_DX, POLE_DZ), pitch: POLE_PITCH },
  //  ★55 프리즈 방(1p7) — 밀폐 공간이라 걸어서 못 간다. 판정하려면 이 텔레포트가 유일한 입구.
  //   서벽 쪽에 서서 동쪽(리브 다섯)을 본다. y는 방 바닥 상면 = FR_FLOOR_Y 파생.
  ...(FRIEZE_ROOM_ON ? [{ id: 'frieze', group: '리브 (계단 구역)', label: '★프리즈 방 — 떠 있는 실체 (55)', prop: '1p7',
    x: TEMPLE_X0 + FR_WALL_T + 4, y: FR_FLOOR_Y, z: 0, yaw: FACE_PX, pitch: 0.18 }] : []),
  //  ★61 신설 3곳 — 횡단(1p7 비석) · 자립 나선 · 아가리. 전부 파생(자동 추종).
  ...(X61 ? [
    { id: 'cross', group: '리브 (계단 구역)', label: '★횡단 중간 — 방을 걸어서 건넌다 (61)', prop: '—',
      x: X61.crossX, y: FR_FLOOR_Y, z: X61.crossZ, yaw: X61.crossYaw, pitch: 0.05 },
    { id: 'freevice', group: '리브 (계단 구역)', label: '★부양 판 나선 중간 — 방 허공을 오른다 (61·62-2)', prop: '—',
      x: X61.fvX, y: X61.fvY, z: X61.fvZ, yaw: X61.fvYaw, pitch: 0.35 },
    { id: 'mouth', group: '리브 (계단 구역)', label: '★아가리 — 다른 실체의 보어로 (61)', prop: '1p8',
      x: X61.moX, y: X61.moY, z: X61.moZ, yaw: X61.moYaw, pitch: 0.9 },
  ] : []),
  ...(BAL ? [{ id: 'balcony', group: '리브 (계단 구역)', label: `★우물 발코니 #${BAL.k > 0 ? '+' : ''}${BAL.k} — 끊긴 관을 내려다본다 (63)`, prop: '1p7',
    x: BAL.x, y: BAL.y, z: BAL.z, yaw: BAL.yaw, pitch: -0.5 }] : []),
  //  ⚠★61: 아래 상부 지점들(판넬~테라스)은 목적지 리브(+10°)로 회전 배치 — rX/rZ/rYaw가 일괄 적용.
  { id: 'panel', group: '리브 (계단 구역)', label: '나선 끝 · 도입 참 (★67)', prop: '—',
    //  ⛔구 착지 판넬 폐기(★67) — 무릎길의 **첫 참**이 그 자리다. 좌표는 계단 정본에서 파생한다.
    ...(() => { const e = kneeStairSpec().landings[0]
      const zc = ((e.z0 ?? 0) + (e.z1 ?? 0)) / 2, xc = (e.x0 + e.x1) / 2
      return { x: rX(xc, zc), y: e.y + TREAD_THICK / 2, z: rZ(xc, zc) } })(),
    yaw: rYaw(FACE_NX), pitch: 0 },
  { id: 'kneewalk', group: '리브 (계단 구역)', label: '무릎길 중간', prop: '—',
    x: rX(KW.x, KW.z), y: KW.y, z: rZ(KW.x, KW.z), yaw: rYaw(FACE_NX), pitch: 0 },
  { id: 'junction', group: '리브 (계단 구역)', label: '갈림 — 사각 착지판 (이지선다)', prop: '—',
    x: rX((X_LAND_LO + X_LAND_HI) / 2, 0), y: U_KNEE_END * H + 0.1, z: rZ((X_LAND_LO + X_LAND_HI) / 2, 0),
    yaw: rYaw(FACE_NX), pitch: 0 },
  { id: 'lookout', group: '리브 (계단 구역)', label: '전망 — 보어 올려다보기 (막다름)', prop: '1p8',
    x: rX(LK_X0 - LK_IN * Math.cos(LK_DISC_ROT), LK_DISC_DZ + LK_IN * Math.sin(LK_DISC_ROT)), y: LK_Y,
    z: rZ(LK_X0 - LK_IN * Math.cos(LK_DISC_ROT), LK_DISC_DZ + LK_IN * Math.sin(LK_DISC_ROT)),
    yaw: rYaw(FACE_NX), pitch: 1.0 },

  { id: 'ante', group: '통로판 (1p9~11)', label: '전실 — 하강 착지 · 회랑 입', prop: '—',
    x: rX((RM_X0 + RM_X1) / 2, 1), y: PASS_FLOOR_Y, z: rZ((RM_X0 + RM_X1) / 2, 1), yaw: rYaw(FACE_PZ), pitch: 0 },
  { id: 'cloister', group: '통로판 (1p9~11)', label: '회랑 시작 — 창밖 리브 누적', prop: '1p9',
    x: rX(CL_R * Math.cos(CL_PHI), CL_R * Math.sin(CL_PHI)), y: CL_FLOOR(CL_PHI),
    z: rZ(CL_R * Math.cos(CL_PHI), CL_R * Math.sin(CL_PHI)),
    yaw: rYaw(yawTo(CL_T[0] + CL_O[0], CL_T[1] + CL_O[1])), pitch: 0 },  // 진행 ↔ 창 사이 45°
  { id: 'lamp', group: '통로판 (1p9~11)', label: `마지막 등불 #${LAMP_K} 밑 — 올려다보기`, prop: '1p10',
    x: rX(LAMP_R * Math.cos(LAMP_PHI), LAMP_R * Math.sin(LAMP_PHI)), y: CL_FLOOR(LAMP_PHI),
    z: rZ(LAMP_R * Math.cos(LAMP_PHI), LAMP_R * Math.sin(LAMP_PHI)),
    yaw: rYaw(yawTo(-Math.sin(LAMP_PHI), Math.cos(LAMP_PHI))), pitch: 1.15 },  // 관 → 리브 시선 안내선
  //  ⛔★79-2 스텁 소등 → 이 웨이포인트도 같이 꺼진다(ST_ON 스위치 하나가 기하·경로를 함께 움직인다)
  ...(ST_ON ? [{ id: 'door', group: '통로판 (1p9~11)', label: '스텁 끝 문 — 공개 직전', prop: '1p11',
    x: rX(DOOR_RR * Math.cos(ST_PHI), DOOR_RR * Math.sin(ST_PHI)), y: ST_FLOOR,
    z: rZ(DOOR_RR * Math.cos(ST_PHI), DOOR_RR * Math.sin(ST_PHI)),
    yaw: rYaw(yawTo(-Math.cos(ST_PHI), -Math.sin(ST_PHI))), pitch: 0 }] : []),

  //  ★79 등불 방(1p10) — 방 축은 회랑 중심선 위 리브 #10 자리. 로컬 극좌표를 월드로 편다.
  ...(RM10_ON ? (() => {
    const AX = RM10_AX_R * Math.cos(RM10_PHI), AZ = RM10_AX_R * Math.sin(RM10_PHI)
    //  로컬 (x=반경 바깥, z=회랑 진행) → 월드: 축 위치 + 회전 −RM10_PHI 을 되돌린 성분
    const L = (rr, th) => {
      const lx = rr * Math.cos(th), lz = rr * Math.sin(th)
      const x = AX + lx * Math.cos(RM10_PHI) - lz * Math.sin(RM10_PHI)
      const z = AZ + lx * Math.sin(RM10_PHI) + lz * Math.cos(RM10_PHI)
      return [x, z]
    }
    //  ★80 나팔 입은 극좌표가 아니라 **로컬 직교**로 나온다 — 같은 회전의 직교판
    const LC = (lx, lz) => [
      AX + lx * Math.cos(RM10_PHI) - lz * Math.sin(RM10_PHI),
      AZ + lx * Math.sin(RM10_PHI) + lz * Math.cos(RM10_PHI),
    ]
    const s2 = RM10_CCW ? 1 : -1
    const thEnd = RM10_ENTRY_TH + s2 * (RM10_DOOR_HTH + RM10_TURN)   // 계단이 바닥에 닿는 방위
    const [ex, ez] = L(RM10_FLOOR_OPEN_R * 0.55, thEnd)
    //  ★79-5 통로 = 1p11의 집. 테라스 쪽 문 바로 안에서 **돔 중심을 향해** 선다(클라이막스 직전).
    const rm = (RM10_EXIT_RIN + RM10_EXIT_ROUT) / 2
    //  ★80 공개 지점 = **나팔 입**. 구 직선 끝을 대체한다 — 조준은 곡선이 만든다(cos s = R/(rCL+R−AX)).
    //   ⚠좌표는 constants 파생(RM10_FLARE_MX/MZ)이라 R·확대 노브를 돌리면 자동 추종한다.
    const [gx, gz] = RM10_FLARE_ON ? LC(RM10_FLARE_MX, RM10_FLARE_MZ) : L(RM10_STR_END - 1.2, RM10_TERR_TH)
    const [ix, iz] = L(rm, RM10_EXIT_TH)
    //  돔 중심 방향 = 월드 원점 쪽. 로컬 θ=180°에서 나가는 방향과 같다.
    return [
      { id: 'lamproom', group: '등불 방 (1p10)', label: '등불 방 — 관이 속성에 꽂히는 자리', prop: '1p10',
        x: rX(ex, ez), y: RM10_FLOOR_Y, z: rZ(ex, ez),
        yaw: rYaw(yawTo(AX - ex, AZ - ez)), pitch: 1.1 },
      { id: 'exitpass', group: '등불 방 (1p10)', label: '출구 통로 — 방 벽을 돈다(밀폐)', prop: '—',
        x: rX(ix, iz), y: RM10_EXIT_FLOOR_Y, z: rZ(ix, iz),
        yaw: rYaw(yawTo(gx - ix, gz - iz)), pitch: 0 },
      //  ⚠★85에서 적발: 나팔은 12.00을 **올라가서** 끝나는데 이 y가 구 통로 바닥(226.43)에 묶여 있었다.
      //   스냅 레이(발+2.5에서 아래로 8.5)로는 12를 못 메우므로 아가리 바닥을 못 찾는다. 아가리면 아가리 바닥.
      { id: 'reveal', group: '등불 방 (1p10)', label: RM10_FLARE_ON ? '나팔 입 — 정조준 공개 지점' : '테라스 문 — 직선 끝, 공개 직전(돔 중심 향)', prop: '1p11',
        x: rX(gx, gz), y: RM10_FLARE_ON ? RM10_FLARE_MY : RM10_EXIT_FLOOR_Y, z: rZ(gx, gz),
        yaw: rYaw(yawTo(-gx, -gz)), pitch: 0.15 },
    ]
  })() : []),

  //  ★85 테라스 = 아가리를 받는 부채꼴. 좌표는 `terracePoint()` 파생이라 ★80 노브를 돌려도 자동 추종한다.
  //   자리 = 아가리 정면(방위 = 문턱 중앙) × 띠 한가운데 → 문턱에서 안쪽으로 약 5걸음.
  ...(TERRACE_ON ? (() => {
    const sp = terraceSpec()
    const fa = (sp.mouth.ctrAz - sp.az0) / sp.span          // 아가리 문턱 중앙의 방위 보간값
    const t  = terracePoint(0.5, fa)
    const out = [{ id: 'terrace', group: '테라스 (1p12~15)', label: '테라스 — 무한 리브 · 정점 렌즈', prop: '1p12~15',
      x: rX(t.x, t.z), y: t.y, z: rZ(t.x, t.z),
      yaw: rYaw(yawTo(-t.x, -t.z)), pitch: 0.25 }]
    //  ★89 참(최저점) — 계단 판정용. 부채꼴이 리브 #0 대칭이므로 fa=0.5가 정확히 월드 0°(= 참 중앙)다.
    //   ⚠y는 `terracePoint`가 프로파일에서 받아온다(사본 금지). 평판 모드면 저절로 TR_Y가 되어 무해하다.
    if (sp.stepped) {
      const L = terracePoint(0.5, 0.5)
      out.push({ id: 'terrace-land', group: '테라스 (1p12~15)', label: '테라스 참 — 계단 최저점(리브 #0 축)', prop: '1p12~15',
        x: rX(L.x, L.z), y: L.y, z: rZ(L.x, L.z),
        yaw: rYaw(yawTo(-L.x, -L.z)), pitch: 0.25 })
      //  ★90 연결 계단 — 중간과 도착(갓 리드). 좌표는 `terraceLinkSpec()` 파생이라 폭·처마를 돌려도 따라온다.
      //   ⚠계단은 월드 방위 0°(z=0) 축 위이고 웨이포인트는 그룹 로컬을 받으므로 로컬로 되돌려 넣는다.
      if (TR_LINK_ON) {
        const K = terraceLinkSpec()
        const loc = (x) => [x * Math.cos(-RIB_DEST_PHI), x * Math.sin(-RIB_DEST_PHI)]
        const midK = Math.round(K.N / 2)
        const [mx, mz] = loc(K.x0 + K.go * midK)
        out.push({ id: 'terrace-link', group: '테라스 (1p12~15)', label: '리드 연결 계단 — 중간(방사 하강)', prop: '1p12~15',
          x: rX(mx, mz), y: K.y0 - K.rise * midK, z: rZ(mx, mz),
          yaw: rYaw(yawTo(Math.cos(-RIB_DEST_PHI), Math.sin(-RIB_DEST_PHI))), pitch: -0.1 })
        const [gx2, gz2] = loc(GAT_CX)
        out.push({ id: 'gat-lid', group: '테라스 (1p12~15)', label: '갓 리드 — 드럼 통로 꼭대기 원판(도착)', prop: '1p12~15',
          x: rX(gx2, gz2), y: K.lidTop, z: rZ(gx2, gz2),
          yaw: rYaw(yawTo(-Math.cos(-RIB_DEST_PHI), -Math.sin(-RIB_DEST_PHI))), pitch: 0.15 })
      }
    }
    return out
  })() : []),
]

export const wpIndexOf = (id) => WAYPOINTS.findIndex(w => w.id === id)
export const wpById    = (id) => WAYPOINTS[wpIndexOf(id)]

// 패널 렌더용 — 표의 group 필드를 순서대로 묶기만 함(표가 정본, 여기서 순서를 바꾸지 않는다)
export const WP_GROUPS = WAYPOINTS.reduce((gs, w, i) => {
  const last = gs[gs.length - 1]
  if (last && last.name === w.group) last.items.push({ w, i })
  else gs.push({ name: w.group, items: [{ w, i }] })
  return gs
}, [])
