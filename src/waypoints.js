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
  rOf, uOfX, ribCenter, spiralPoint,
  U_SPIRAL_END, U_KNEE_END, U_LOOKOUT_END,
  KW_STEPS, KW_FLATTEN, PANEL_Z0, PANEL_Z1,
  X_LAND_LO, X_LAND_HI,
  LK_PLAT_R, LK_DISC_LIFT, LK_DISC_HALF, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_ROT,
  PASS_FLOOR_Y, PASS_X_END, RM_X0, RM_X1,
  CL_R, CL_PHI0, CL_PHI1, ST_PHI,
  LAMP_RIBS, LAMP_R,
  TERRACE_RIN, TERRACE_ROUT, TERRACE_Y,
  COR_Y0, COR_THICK, PLAT_X, PLAT_Y, PLAT_R, DESC_X0, DESC_X1, PLAT_DROP,
  HALL_ENTRY, ASC_X0, ASC_X1, ASC_RISE, ORB_CX, ORB_FLOOR_Y,
  ROOM_CX, ROOM_FLOOR_Y, DAIS_H, ROOM_DISC_HOLE, ROOM_LAND_R,
  RAD_ANG0, RAD_R, RAD_JX, RAD_FLOOR_Y,
  P_FLOOR_TOP, P_SPAWN_LX, P1_ON,} from './constants.js'
import { p1HeightAt } from './radialEventsGeometry.js'   // 1p1 볼록 바닥 보정(모드·노브 자동 추종)
import { buildHallStairs, incaStairSpec, incaBladesSpec, descentSpec } from './corridorStairsGeometry.js'   // ★㊳ 계단 끝 4곳 + ★㊷ 날 끝 4곳(못 닿음 판정 지점) — 빌더 파생(자동 추종)
import { INCA_ON, INCA_GAP } from './constants.js'

// ── 스위치 ──
export const DEV_TELEPORT = true      // ⚠배포 전 false — 패널·[·]·Tab 전부 비활성(스폰만 남음)
export const SPAWN_ID     = 'corridor' // ★㊳ 판정 세션용(1p5 홀). 직전 'p1'. 배포 최종은 'room'

// 사람 눈높이(동결 — §3 '사람 치수 고정'). 웨이포인트 y(발 딛는 면)를 눈높이로 올리는 유일한 상수.
//  FirstPersonControls가 이 값을 import해 쓴다(중복 정의 금지 — 어긋나면 텔레포트만 눈높이가 달라짐).
export const EYE = 1.6

// ── 시선 헬퍼 ──
//  FirstPersonControls의 전진 벡터 = (−sin yaw, 0, −cos yaw).
//  따라서 수평방향 (dx,dz)를 바라보려면 yaw = atan2(−dx, −dz).  (pitch: + = 위)
const yawTo = (dx, dz) => Math.atan2(-dx, -dz)
const FACE_PX = yawTo(1, 0)     // +x(리브·바깥) 향
const FACE_NX = yawTo(-1, 0)    // −x(돔 중심) 향
const FACE_PZ = yawTo(0, 1)     // +z 향

// ── 구간별 바닥 레벨(메시 구성 규약에서 파생) ──
const HUB_TOP   = COR_Y0 + COR_THICK / 2 + 0.02   // Room.jsx 착지 디스크 윗면(압출 슬랩) ≈49.32
const PLAT_TOP  = PLAT_Y + COR_THICK / 2          // ★㊴ 낮은 플랫폼 상면 ≈45.8 — corridor 웨이포인트 기준(다리 49.3과 분리)
const JOINT_TOP = RAD_FLOOR_Y + COR_THICK / 2     // Radial.jsx 접합 패드 = 박스 중심 RAD_FLOOR_Y + 두께/2 ≈49.28
const CL_FLOOR  = PASS_FLOOR_Y - 0.02             // Dome.jsx 회랑 바닥 = ring 평면(floor − 0.02)
const ST_FLOOR  = PASS_FLOOR_Y - 0.05             // Dome.jsx 스텁 바닥 = 박스 윗면(floor − 0.05)

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

// ── 무릎길 중간칸(KneeWalk의 배치식을 그대로 재현 — 수평 균일 + KW_FLATTEN 블렌드) ──
const kneeWalkAt = (i) => {
  const xA = rOf(U_SPIRAL_END), xB = X_LAND_HI
  const yA = H * U_SPIRAL_END, yB = H * U_KNEE_END
  const x = xA - (i + 0.5) * (xA - xB) / KW_STEPS
  const yCen = H * uOfX(x)                                   // 리브 중심선(가파름)
  const yChord = yA + (yB - yA) * (xA - x) / (xA - xB)       // 곧은 현(완만)
  return { x, y: (1 - KW_FLATTEN) * yCen + KW_FLATTEN * yChord + TREAD_THICK / 2, z: 0 }
}
const KW = kneeWalkAt(Math.floor(KW_STEPS / 2))

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
export const WAYPOINTS = [
  { id: 'room', group: '지상', label: '정의·공리 방 (기단 위)', prop: 'D1~8 · A1~7',
    x: ROOM_CX, y: ROOM_FLOOR_Y + DAIS_H, z: 0, yaw: FACE_NX, pitch: 0 },

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
  { id: 'pole', group: '리브 (계단 구역)', label: '폴 절단 (외부지지 가설의 종단)', prop: '1p6 · 1p7',
    x: DP.x, y: DP.y, z: DP.z, yaw: yawTo(POLE_DX, POLE_DZ), pitch: POLE_PITCH },
  { id: 'panel', group: '리브 (계단 구역)', label: '나선 끝 · 착지 판넬', prop: '—',
    x: rOf(U_SPIRAL_END), y: H * U_SPIRAL_END - TREAD_THICK / 2 - 0.03, z: (PANEL_Z0 + PANEL_Z1) / 2,
    yaw: FACE_NX, pitch: 0 },                                            // 판넬 상면 = 계단 밑면 살짝 아래(설계)
  { id: 'kneewalk', group: '리브 (계단 구역)', label: '무릎길 중간', prop: '—',
    x: KW.x, y: KW.y, z: KW.z, yaw: FACE_NX, pitch: 0 },
  { id: 'junction', group: '리브 (계단 구역)', label: '갈림 — 사각 착지판 (이지선다)', prop: '—',
    x: (X_LAND_LO + X_LAND_HI) / 2, y: U_KNEE_END * H + 0.1, z: 0,       // JunctionLanding 윗면
    yaw: FACE_NX, pitch: 0 },
  { id: 'lookout', group: '리브 (계단 구역)', label: '전망 — 보어 올려다보기 (막다름)', prop: '1p8',
    x: LK_X0 - LK_IN * Math.cos(LK_DISC_ROT), y: LK_Y, z: LK_DISC_DZ + LK_IN * Math.sin(LK_DISC_ROT),
    yaw: FACE_NX, pitch: 1.0 },

  { id: 'ante', group: '통로판 (1p9~11)', label: '전실 — 하강 착지 · 회랑 입', prop: '—',
    x: (RM_X0 + RM_X1) / 2, y: PASS_FLOOR_Y, z: 1, yaw: FACE_PZ, pitch: 0 },
  { id: 'cloister', group: '통로판 (1p9~11)', label: '회랑 시작 — 창밖 리브 누적', prop: '1p9',
    x: CL_R * Math.cos(CL_PHI), y: CL_FLOOR, z: CL_R * Math.sin(CL_PHI),
    yaw: yawTo(CL_T[0] + CL_O[0], CL_T[1] + CL_O[1]), pitch: 0 },        // 진행 ↔ 창 사이 45°
  { id: 'lamp', group: '통로판 (1p9~11)', label: `마지막 등불 #${LAMP_K} 밑 — 올려다보기`, prop: '1p10',
    x: LAMP_R * Math.cos(LAMP_PHI), y: CL_FLOOR, z: LAMP_R * Math.sin(LAMP_PHI),
    yaw: yawTo(-Math.sin(LAMP_PHI), Math.cos(LAMP_PHI)), pitch: 1.15 },  // 관 → 리브 시선 안내선
  { id: 'door', group: '통로판 (1p9~11)', label: '스텁 끝 문 — 공개 직전', prop: '1p11',
    x: DOOR_RR * Math.cos(ST_PHI), y: ST_FLOOR, z: DOOR_RR * Math.sin(ST_PHI),
    yaw: yawTo(-Math.cos(ST_PHI), -Math.sin(ST_PHI)), pitch: 0 },

  { id: 'terrace', group: '테라스 (1p12~15)', label: '테라스 — 무한 리브 · 정점 렌즈', prop: '1p12~15',
    x: (TERRACE_RIN + TERRACE_ROUT) / 2, y: TERRACE_Y, z: 0, yaw: FACE_NX, pitch: 0.25 },
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
