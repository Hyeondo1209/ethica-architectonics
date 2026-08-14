// Radial.jsx — ★방사 복합체(1p1~4 네 방·고리) 매싱 드래프트 2026.07.09
//  ★매싱 수정 2026.07.11: ①셸 확장(16/10.5/51.5, constants) ②봉합 — a.접선 문 고리정렬 컷 b.끝단 캡 12곳 c.컷 바닥 49.0 ③나선·슬롯 회전은 ROOM_TOP_AZ(constants)
//  ★문틀 마감 2026.07.11(현도 지정): 셸 문 12곳 잼+상인방 문틀 — 곡면 이음선을 문틀이 삼키고, 통로 벽·지붕은 문틀 안 평면 종료(TUBE_END)
//  골격: 허브(기존 랜딩+빛우물, Room.jsx가 원뿔대에 대각 문 4개를 뚫음) → 대각 터널 4(박스 어휘: 돔 표면 스커트+평천장)
//        → 유선형 꽃잎 방 4(납작 타원구 셸 — ★한 기하를 4회 회전 배치 = '등형'의 문자적 실현)
//        → 고리(원호 통로, 회랑 어휘) → 동측에서 박스 옆벽 접합문으로 통로(=1p5)에 인계.
//  방 내부 표현은 전부 미정(빈 셸) — 이 모듈은 덩어리·동선·밀폐만 책임진다. 수치 정본 = constants.js RAD 블록.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import { linkSpec, buildLinkParts } from './linkPassageGeometry.js'   // ★130 셸→테라스 접속 통로(밀봉 관·미니 첨탑)
import { ascSpec, ascDoorCut, buildAscentMass, buildAscentWalls, buildAscentCeiling, buildAscentColumns, buildAscentOverlook, buildAscentMouthSill } from './ascentTunnelGeometry.js'
import { buildArm13 } from './armGeometry.js'   // ★126 1p3 지지 팔
import { extSpiralSpec, buildExtSpiral, buildExtSpiralParapet, buildExtSpiralShell, buildExtSpiralSkirt, buildExtSpiralBridge, buildExtWindowFrame, extWindowRibbonGeo, winBandAt, winBandOver } from './extSpiralGeometry.js'   // ★122·★122-b·★122-c·★123
import { wellWallR } from './spireGeometry.js'   // ★127 빛우물 벽 사면 단일 정본(구 로컬 coneR 사본 폐기)
import {
  domeClipY, COR_Y0, COR_THICK, BOX_HW, RAD_ASC_ON, HUB_DOOR_GATE,
  RAD_RING_ON, RSP_ON, RSP_WIN_ON,
  TAN_DOOR_POS_GATE, TAN_DOOR_NEG_GATE, CYL_HUB_DOOR_GATE, RSP_ENCL, ASC_DOOR_GATE, TAN_JAMB_IN, TAN_FR_OUT_EXT, TAN_SILL_ON, TAN_SILL_T,
  ROOM_LAND_R, ROOM_WELL_RT, ROOM_CEIL_Y, ROOM_CYL_TOP,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY,
  RAD_T_HW, RAD_TOP, RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN,
  RAD_JPHI, RAD_JX, RAD_FLOOR_Y, RAD_T_IN, RAD_UNDER_LIP, RAD_WALL_R0,
  RAD_DROP, RAD_ST_N, RAD_ST_T, RAD_ST_LAND, RAD_ST_W,
  RAD_SKIRT_MAX,
  ROOM_R, ROOM_FLOOR_Y, ROOM_HEIGHT,
  RAD_CYL_ON, RAD_CYL_R, RAD_CYL_Y0, RAD_CYL_SEG, RAD_CYL_CLIP_ROOM,
  RAD_CYL_TERM_BY, RAD_CYL_TERM_TOP_BY, RAD_CYL_SPH_SEG, termSpec,
  RAD_CYL_DOOR_ON, RAD_CYL_DOOR_RING_ONLY, RAD_CYL_DOOR_M, CYL_TAN_DOOR_M,
  ARM13_ON, ARM13_K,
  RAD_CYL_COLLAR_ON, RAD_CYL_COLLAR_T,
} from './constants'

const MAT_WALL  = '#b89a6a'   // 터널·고리(통로 외피와 같은 가족)
const MAT_SHELL = '#c3ae7f'   // 꽃잎 셸(살짝 밝게 — 매싱 구분용, 재질은 Phase 3에서)
const MAT_FLOOR = '#c2a062'   // 바닥(길 연속)
const CUT_BOT = COR_Y0                            // ★문 컷 바닥 49.0(2026.07.11 ②c) — 바닥판(48.68~49.28) 안 = 판 밑 노출 슬리버 0. 문턱도 없음(판 윗면이 문지방)
const DTOP  = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H // 문 상단 53.3(터널 천장 54 아래 헤더 0.7) — ⚠아래 문틀 상수(JAMB_H 등)가 참조: 선언 순서 유지
// ★문틀 마감(2026.07.11, 현도 지정): 곡면 셸×직선 통로 접합부는 어떻게 깎아도 어중간 → 직사각 문틀이 이음선을 통째로 삼킨다.
//  구도 1(균일 관입 2.5): 방 안 스터브 2.35 / 구도 2(높이별 정합 밴드): 계단 실루엣 — 둘 다 기각.
const sR = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))  // 셸 수평 반경(높이 y)
const Y_FTOP = RAD_FLOOR_Y + COR_THICK / 2  // 문지방(터널·고리 바닥판 윗면) 49.28 — ★계란화 후에도 불변(방 바닥만 강하)
// ★㊵-2 스커트 밑단(hem): 구형화(ROOM_R 축소)로 발자국이 구 밖이면 domeClipY가 지면(0)을 반환해 커튼이 지면까지
//  낙하(부양 와해). 밑단 = 문지방 − RAD_SKIRT_MAX 에서 수평 폐합 — 구 표면이 밑단보다 높으면 종전대로 표면에 물림(봉합 유지).
const clipY = (x, z) => Math.max(domeClipY(x, z), Y_FTOP - RAD_SKIRT_MAX)
const Y_RFTOP = Y_FTOP - RAD_DROP           // ★방 바닥판 윗면 46.08(2026.07.12 계란화 — constants P_FLOOR_TOP과 동일 정의)
// ★꽃잎 바닥(계란화): 강하 레벨의 원뿔대 판 — 벽이 기울어(적도 아래) 원기둥이면 윗단은 틈(0.5 고리)·밑단은 돌출.
//  위/아래 반경을 각 높이 셸내면−0.05로 따로 파생 = 판 옆면이 벽 기울기를 따라감. ⚠sR 선언 뒤(TDZ — §15 스모크 검증)
const FLOOR_RT = sR(Y_FTOP - RAD_DROP) - 0.05           // 판 윗면 반경 ≈12.59
const FLOOR_RB = sR(Y_FTOP - RAD_DROP - COR_THICK) - 0.05  // 판 밑면 반경 ≈12.13
const FR_T    = 0.5                          // 문틀 두께(잼·상인방 공통) — 노브
const FR_OUT  = RAD_T_HW + FR_T              // 잼 바깥 반폭 2.7 — 셸 구멍 가장자리(RAD_DOOR_HW 2.3)를 삼킴
const LIN_TOP = RAD_TOP + 0.6                // 상인방 상단 54.6(튜브 지붕 54.4 위 0.2)
// ★문틀 걸침 일반화(2026.07.12 계란화): 구판은 "최심 코너 = 상인방 상단"을 가정(중심고가 문 스팬 안) —
//  중심고 56.5가 스팬(49.28~54.6) 위로 빠지며 벽이 단조 기울기가 되어 최심 코너가 '문지방'으로 반전.
//  잼 옆선(x=FR_OUT)에서의 셸 통과 반경을 스팬 양끝(+팽출점이 스팬 안이면 그것도)에서 재고 min/max로 걸친다.
const frRW = (y) => Math.sqrt(Math.max(0.25, sR(y) ** 2 - FR_OUT ** 2))
const FR_YS = [Y_FTOP, LIN_TOP, ...(RAD_PCY > Y_FTOP && RAD_PCY < LIN_TOP ? [RAD_PCY] : [])]
const FR_BACK  = Math.min(...FR_YS.map(frRW)) - 0.25  // 뒷면(방쪽) ≈13.99 — 최심 통과보다 0.25 깊게
const FR_FRONT = Math.max(...FR_YS.map(frRW)) + 0.25  // 앞면(바깥) ≈15.92 — 최전방 통과보다 0.25 앞
const FR_D    = FR_FRONT - FR_BACK           // 문틀 깊이(통로축) ≈1.93 — 기운 벽 전체가 이 안을 통과
const FR_C    = (FR_FRONT + FR_BACK) / 2     // 문틀 중심의 꽃잎 중심거리 ≈14.96
const TUBE_END = FR_BACK + 0.2               // 바닥 위 벽·지붕의 끝(중심거리) — 문틀 몸통 안에서 평면 종료
const JAMB_H  = DTOP - Y_FTOP                // 잼 높이(바닥판 윗면 → 문 상단)
const S_WALL0 = RAD_WALL_R0                  // ★118: constants 승격(검사가 읽어야 한다). 터널 벽·천장 시작 — 허브 문틀 파생이 참조
// ★★★120 구 허브 문 게이트 — 유도 정본은 constants.HUB_DOOR_GATE(사본 금지). 여기선 별칭만.
//  스위치 단독이 아니라 **구세계 결합**이다: RAD_ASC_ON=false면 이 문이 구 수평 터널의 방 진입구라
//  스위치와 무관하게 켜진다 → ★119 보존계(한 줄 복귀)가 무손상 유지된다.
const HUB_DOOR_ON = HUB_DOOR_GATE
// ★허브(빛우물) 문틀(2026.07.11): 같은 문틀을 빛우물 벽 문 4곳에. 걸침 깊이는 그 높이 벽 반경에서 파생.
//  ★127: 구 로컬 coneR 사본 폐기 — 벽 사면 정본 = spireGeometry.wellWallR(SPIRE_ON이면 원기둥 18 상수,
//  false면 구 원뿔 사면을 같은 함수가 반환 — 보존계가 함수 안에 있어 호출부는 무분기).
const HFR_BACK  = Math.min(Math.sqrt(Math.max(0.25, wellWallR(LIN_TOP) ** 2 - FR_OUT ** 2)) - 0.25, S_WALL0 - 0.15) // 뒷면(허브쪽) — 최심 요구 코너보다 깊게 & 벽 시작(15.5)도 몸통 안에 숨김
const HFR_FRONT = wellWallR(Y_FTOP) + 0.25   // 앞면(터널쪽) — 문 밑선 높이 벽 반경보다 앞(★127 원기둥 체제 = 18.25)
const HFR_D = HFR_FRONT - HFR_BACK           // 허브 문틀 깊이 ≈2.1(사면 걸침이라 셸보다 깊음)
const HFR_C = (HFR_FRONT + HFR_BACK) / 2     // 허브 문틀 중심 반경 ≈16.4

// 공용 쿼드 빌더
function quadGeo(build) {
  const pos = [], idx = []
  const q = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
    const n = pos.length / 3
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  build(q)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

//  ★124: 검사 하네스(임시 디렉터리 번들)는 상대 임포트를 못 쓴다 → 나선 기하를 여기서 재수출한다.
//  ⚠사본이 아니라 **재수출**이다(정본 = extSpiralGeometry.js 한 곳).
export { buildExtWindowFrame, winBandAt, winBandOver } from './extSpiralGeometry.js'

// ── ★★★123 적도 칼라(2026.08.12) — 원기둥 상단(적도)과 셸 사이 **환형 입**을 닫는 평판 링 ──
//  ⚠발견 경위 = 실측: 통로 안 적도 바로 위에서 아래로 쏜 광선이 36방위 중 **27**에서 아무것도 안 맞고
//   환형 공동으로 떨어졌다(원기둥 말단 y −20까지 관통). ★122까지는 하반부에 창이 없어 안 보였을 뿐이다.
//  ★★124(현도 로컬 판정 — 스크린샷 + HUD 좌표): *"창 사이의 아주 얇은 링, 이물로 읽혀. 없애줘."*
//   좌표를 풀어 확정 = NE 꽃잎 로컬 r18.64 φ32.6° y108.85. 그 시점을 레이캐스트로 렌더하니
//   **칼라가 창 개구 한가운데를 수평으로 가로지르고 있었다**(화면 0.91%). 실측: 방위 **18.3°~85.3°(67°)**
//   구간에서 창 상단이 적도 위로 올라가 창이 적도를 점유한다 = 그 구간에서 칼라는 창을 가로지른다.
//  ⛔**내 잘못 = 규율 반복**: ★122-h에서 굽도리로 똑같은 실수를 하고 \"문 앞에는 문턱을 두지 않는다 —
//   몰딩·굽도리를 두를 때 **모든 개구를 비우는지 전수 확인**\"을 규율로 적어 놓고, 칼라를 만들며 안 지켰다.
//  ★수리 = 개구 방위에서 칼라를 **비운다**. 봉인은 무손상이다: 개구 안에서는 원기둥·셸이 이미 둘 다
//   뚫려 있어 그 자리가 '공동'이 아니라 **창의 깊이**이고, 공동이 옆으로 새는 것은 개구 **밖**의 온전한
//   원기둥·셸이 막는다(그 위는 칼라가 그대로 닫는다).
//  ★관입 0(규율 ⑦): 안 반경 = **셸 적도 다각형의 그 방위 표면 반경**(닫힌 식 — 정점에서 RAD_PRX,
//   변 중앙에서 PRX·cos(π/N)). 균등 48 정점만 쓰던 구판은 개구 경계각을 넣는 순간 새그(0.034)만큼
//   방 안으로 튀었을 것이다 — 반경을 방위 파생으로 바꿔 **경계각을 자유롭게 넣을 수 있게** 했다.
export function buildCylCollar() {
  const pos = [], nrm = []
  if (!(RAD_CYL_ON && RAD_CYL_COLLAR_ON)) {
    const g0 = new THREE.BufferGeometry()
    g0.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    g0.setAttribute('normal', new THREE.Float32BufferAttribute([], 3))
    return g0
  }
  const N = RAD_CYL_SEG, y = RAD_CYL_Y0, TAU = Math.PI * 2
  //  셸 적도 다각형 표면 반경(방위 파생 — 정점 사이에서 안쪽으로 새그)
  const step = TAU / N
  const shellPolyR = (a) => {
    const t = ((a % step) + step) % step - step / 2
    return RAD_PRX * Math.cos(Math.PI / N) / Math.cos(t)
  }
  //  ★124: 창이 적도를 점유하는 방위 = 칼라가 개구를 가로지르는 방위 → 비운다
  const crosses = (a) => {
    const b = winBandAt(((a % TAU) + TAU) % TAU)
    return !!b && b[1] >= RAD_CYL_Y0 - 1e-9
  }
  //  각 스테이션 = 균등 N + 개구 경계각(이분법 — 원기둥 문 어법과 동일)
  const angs = []
  for (let i = 0; i <= N; i++) angs.push((i / N) * TAU)
  {
    const FINE = N * 24
    for (let i = 0; i < FINE; i++) {
      let a0 = (i / FINE) * TAU, a1 = ((i + 1) / FINE) * TAU
      if (crosses(a0) === crosses(a1)) continue
      for (let q = 0; q < 40; q++) { const m = (a0 + a1) / 2; if (crosses(m) === crosses(a0)) a0 = m; else a1 = m }
      angs.push((a0 + a1) / 2 - 1e-9, (a0 + a1) / 2 + 1e-9)
    }
  }
  angs.sort((u, v) => u - v)
  const put = (a, r) => { pos.push(r * Math.cos(a), y, r * Math.sin(a)); nrm.push(0, 1, 0) }
  for (let i = 0; i < angs.length - 1; i++) {
    const a0 = angs[i], a1 = angs[i + 1]
    if (a1 - a0 < 1e-7) continue
    if (crosses((a0 + a1) / 2)) continue          // ★124: 개구 구간은 비운다
    //  감김 = 위(+y)를 보도록: (a0,안) → (a1,밖) → (a0,밖) / (a0,안) → (a1,안) → (a1,밖)
    put(a0, shellPolyR(a0)); put(a1, RAD_CYL_R); put(a0, RAD_CYL_R)
    put(a0, shellPolyR(a0)); put(a1, shellPolyR(a1)); put(a1, RAD_CYL_R)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}

// ── 꽃잎 셸(로컬 프레임: +x = 방사 바깥, 문 = 안쪽 −x 1 + 접선 ±z 2) — 한 번 만들어 4회 배치 ──
export function buildPetalShell() {   // ★120: export = 검사가 셸 구멍을 광선으로 실측(봉인 확인)
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const shell = new THREE.SphereGeometry(1, 48, 32)
  shell.scale(RAD_PRX, RAD_PRY, RAD_PRX)
  shell.translate(0, RAD_PCY, 0)
  let acc = new Brush(shell); acc.updateMatrixWorld()
  const H = DTOP - CUT_BOT, YMID = (DTOP + CUT_BOT) / 2
  const cutBrush = (g) => {
    const b = new Brush(g); b.updateMatrixWorld()
    acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld()
  }
  // 안쪽 문(허브 터널, −x): 터널이 정확히 방사축 위 → 축정렬 컷 그대로
  //  ★★★122 창 리본(2026.08.12 현도: "접하는 부분은 아주 넓은 창"): 나선 추종 밴드 컷 — 이번 조각은
  //  상반부(단일벽 y≥적도)만. 하반부(★91 원기둥 이중벽 포탈)는 다음 조각. 정본 = extWindowRibbonGeo().
  if (RSP_ON && RSP_WIN_ON) cutBrush(extWindowRibbonGeo())
  //  ★★★120(2026.08.11 현도 "구 허브문은 일단 없애줘"): 봉인. ★119가 "우선 남겨봐"로 존치했으나
  //  실측이 존치 비용을 확정했다 — 문지방 101.00 → 발밑 85.26 = 낙차 15.74(STEP_DOWN 2.2의 7.16배).
  //  ⚠컷을 지우지 않고 **게이트**한다(보존계) — HUB_DOOR_ON 한 줄로 셸 구멍이 그대로 돌아온다.
  if (HUB_DOOR_ON) {
    const g = new THREE.BoxGeometry(8, H, RAD_DOOR_HW * 2)
    g.translate(-RAD_PRX + 1, YMID, 0)
    cutBrush(g)
  }
  // ★★★119 상부 문(상승 터널 도착, −x 허브면 · 진입 바닥 RAD_ASC_Y1): 컷 바닥 = 평지 매스 안(슬리버 0)
  //  ★★122-d(현도 2차 지시): 새 문 = **전망대**로 복원 — "참에서 전망대처럼 셸 내부를 내려다볼 수 있어".
  //  통과하는 문이 아니므로 개구를 난간(buildAscentOverlook)이 가로막는다. 방 안 스텁은 폐기(매스 = 셸면 flush).
  if (RAD_ASC_ON) {
    const c = ascDoorCut()
    const g = new THREE.BoxGeometry(c.w, c.h, c.d)
    g.translate(-RAD_PRX + 1, c.cy, 0)
    cutBrush(g)
  }
  // ★접선 문 2(고리 ±z) — 고리 정렬 컷(2026.07.11 ②a). 고리 중심선은 로컬 원(중심 (−R,0), 반경 R):
  //  z₀=PRX−1에서 중심선 x = R(cosφ−1)(φ=asin(z₀/R)), 진행방향도 φ만큼 기움.
  //  구(舊) 축정렬 컷은 x오프셋 1.17·각 11.2° 어긋나 구멍이 고리 바깥벽 너머로 1.27 노출(셸 옆구리 슬릿 8곳) → 컷을 중심선에 놓고 돌려 구멍=고리 단면.
  {
    const z0 = RAD_PRX - 1
    const phi = Math.asin(z0 / RAD_R)
    const xOff = RAD_R * (Math.cos(phi) - 1)
    //  ★★122-b 유령 개구 봉인(현도 ⑤): 고리 소등 후 이 컷들이 뻥 뚫린 채 노출됐다.
    //  게이트 정본 = constants(TAN_DOOR_±_GATE — 그 문을 쓰는 세계〔고리 or 나선 착지〕가 살아 있을 때만).
    for (const sgn of [1, -1]) {
      if (!(sgn > 0 ? TAN_DOOR_POS_GATE : TAN_DOOR_NEG_GATE)) continue
      const g = new THREE.BoxGeometry(RAD_DOOR_HW * 2, H, 8)
      g.rotateY(-sgn * phi)                 // 컷 깊이축(z) → 그 지점 고리 접선 방향
      g.translate(xOff, YMID, sgn * z0)
      cutBrush(g)
    }
  }
  return acc.geometry
}

// ── ★진입 계단(2026.07.12 계란화 — 스케치 3항): 문지방(49.28) → 방 바닥(46.08), 문 3곳 전부 ──
//  프로파일(문틀 로컬, +z = 방 안쪽): 뒤 z=−1.6(셸 밖 여유) → 착지장(윗면 = 문지방 −0.02 립,
//  통로 바닥판 혀끝〔중심거리 ≈13.5〕을 관입으로 삼킴 — 혀끝·스커트가 착지장 몸통에 묻힘) → 단 N → 발치(바닥판에 0.23 매몰).
//  ★셸 정합 = CSG '교집합'(−0.05 축소 셸): 기운 벽(문지방 높이 14.4 ↔ 바닥 높이 12.6)에 수직 등짝을 대면
//  아래는 돌출·위는 틈 — 교집합이 등짝·밑면을 셸 내면 그대로 깎아 둘 다 소거(사발면 정합).
// ★★원기둥 받침 + 말단(2026.07.30 1~3차) — **하나의 회전체 프로파일**.
//  위 = 등반경 원기둥(적도 108.5 → 말단 꼭대기): 방 클립 + 문 12곳이 여기에만 걸린다.
//  아래 = 말단(구 띠 / 원기둥 / 원뿔대 조합, 막힌 끝): constants `RAD_CYL_TERM`이 정본.
//  ★★반경 연속은 **코드가 강제**한다 — 각 구간이 직전 반경에서 시작하므로 단이 구조적으로 생길 수 없다.
//   기울기는 경계에서 꺾인다(도형이 바뀌므로) → 경계마다 링을 **두 개** 낸다(법선이 다르기 때문).
//  ★법선은 전부 **명시**한다(`computeVertexNormals` 금지 — ★57 '각진 연필'):
//   원기둥 (1,0) · 원뿔대 = 모선의 수직 · 구 띠 = 구 중심에서의 정확한 법선(⏸보존계 — 2026.07.31 미사용).
//  ★2026.07.31 현도 정정: 말단 프로파일은 **직선 모선만**(곡률 구간 0). 경계마다 링을 둘 내므로
//   구간이 바뀌는 자리는 법선이 갈려 **각이 선다** — 그것이 곧 현도가 말한 '도형이 바뀌는 경계'다.
//  ⚠말단에는 클립·문을 안 건다 — 말단은 방 구 **아래**에 있어 클립이 무의미하다.
//   그 전제(말단 꼭대기 < 방 구 아랫면)는 constants가 파생으로 세우고 검사 §18이 지킨다.
export function buildCylSkirt(k) {
  const name = RAD_CYL_TERM_BY[k], spec = termSpec(name)
  const TOP = RAD_CYL_TERM_TOP_BY[k]                 // 원기둥 밑단 ≡ 말단 꼭대기(연속)
  //  ★122-M: 접선(고리) 개구 여유는 세계 파생 — 허브 개구는 구 값 유지
  const R = RAD_CYL_R, N = RAD_CYL_SEG, M = CYL_TAN_DOOR_M
  const W = RAD_T_HW + M, DOOR_TOP = RAD_TOP + 0.4 + M

  const doorAt = (a) => {
    if (!RAD_CYL_DOOR_ON) return null
    const lx = R * Math.cos(a), lz = R * Math.sin(a)
    const d = Math.hypot(RAD_R + lx, lz)
    //  ★★122-b 유령 개구 봉인(현도 ⑤): 개구 = 그 개구를 쓰는 세계가 살아 있을 때만.
    //  허브 개구 = 구 수평 터널 세계(CYL_HUB_DOOR_GATE = !RAD_ASC_ON — ★119 소등 후 유령이었다).
    //  고리 교차 개구 = 고리 or 나선 착지 쪽(±z를 TAN_DOOR_±_GATE로 개별 판정).
    const inHub = !RAD_CYL_DOOR_RING_ONLY && CYL_HUB_DOOR_GATE && lx < 0 && Math.abs(lz) <= W
    const tanGate = lz > 0 ? TAN_DOOR_POS_GATE : TAN_DOOR_NEG_GATE
    const inRing = tanGate && Math.abs(d - RAD_R) <= W
    return (inHub || inRing) ? [clipY(d, 0) - M, DOOR_TOP] : null
  }
  const roomAt = (a) => {
    const d = Math.hypot(RAD_R + R * Math.cos(a), R * Math.sin(a))
    if (!RAD_CYL_CLIP_ROOM || d >= ROOM_R) return [ROOM_FLOOR_Y, ROOM_FLOOR_Y]
    const t = Math.sqrt(Math.max(0, 1 - (d * d) / (ROOM_R * ROOM_R)))
    return [ROOM_FLOOR_Y - ROOM_HEIGHT * t, ROOM_FLOOR_Y + ROOM_HEIGHT * t]
  }

  //  ★★★123 나선 하반부 창 개구(현도 ⓐ): 정본 = extSpiralGeometry.winBandAt()의 닫힌 역산.
  //  ⚠구간 판정은 **보수적 교집합**(winBandOver) — 개구가 창턱·인방 판 몸통 안에 들어야
  //   가장자리가 숨는다(규율 ④ · 판이 삼키는 쪽). 각 스테이션은 아래에서 리본 세그마다 넣는다.
  const winSpan = (a0, a1) => (RAD_CYL_DOOR_ON ? winBandOver(a0, a1) : null)

  //  ★열 각도 = 균등 N + 문 경계각(이분법). 말단도 같은 각 목록을 쓴다 → 이음매에서 정점이 맞물린다.
  const angs = []
  for (let i = 0; i <= N; i++) angs.push((i / N) * Math.PI * 2)
  //  ★123: 창 개구 가장자리는 방위에 따라 높이가 변한다 → 리본 세그와 같은 밀도로 스테이션을 넣어
  //   계단 오차를 판 두께(RSP_WFR_T/2) 훨씬 아래로 낮춘다(균일 분할만 쓰면 세그가 경계를 뭉갠다 — ★122-h 실측 전례).
  if (RAD_CYL_DOOR_ON && RSP_ON && RSP_WIN_ON) {
    const SS = extSpiralSpec()
    const M2 = SS.N * 4
    for (let i = 0; i <= M2; i++) {
      let a = SS.phiStep0 + SS.dir * SS.sweepStep * i / M2
      a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      angs.push(a)
    }
  }
  if (RAD_CYL_DOOR_ON) {
    const isIn = (a) => doorAt(a) != null || winBandAt(a) != null
    const FINE = N * 24
    for (let i = 0; i < FINE; i++) {
      let a0 = (i / FINE) * Math.PI * 2, a1 = ((i + 1) / FINE) * Math.PI * 2
      if (isIn(a0) === isIn(a1)) continue
      for (let q = 0; q < 40; q++) { const m = (a0 + a1) / 2; if (isIn(m) === isIn(a0)) a0 = m; else a1 = m }
      angs.push((a0 + a1) / 2 - 1e-9, (a0 + a1) / 2 + 1e-9)
    }
  }
  angs.sort((u, v) => u - v)

  const pos = [], nrm = []
  const put = (a, y, r, nr, ny) => {
    pos.push(r * Math.cos(a), y, r * Math.sin(a))
    nrm.push(nr * Math.cos(a), ny, nr * Math.sin(a))
  }
  //  ── ① 등반경 원기둥 구간(클립 + 문) ──
  for (let i = 0; i < angs.length - 1; i++) {
    const a0 = angs[i], a1 = angs[i + 1]
    if (a1 - a0 < 1e-7) continue
    const [rb0, rt0] = roomAt(a0), [rb1, rt1] = roomAt(a1)
    //  ★★★123: 개구가 이제 **둘 이상**일 수 있다(문 + 나선 하반부 창) → 목록으로 일반화한다.
    //  ⚠구 코드는 개구 하나를 전제로 세 밴드를 박아 뒀다. 겹치면 병합하고, 떨어져 있으면
    //   사이 벽을 남긴다(고리 복귀 체제에서 +z 문과 창이 같은 방위를 지나는 경우가 실제로 있다).
    const ops = []
    const dr = doorAt((a0 + a1) / 2); if (dr) ops.push([dr[0], dr[1]])
    const wr = winSpan(a0, a1); if (wr) ops.push([wr[0], wr[1]])
    ops.sort((u, v) => u[0] - v[0])
    const mg = []
    for (const o of ops) {
      const L = mg[mg.length - 1]
      if (L && o[0] <= L[1] + 1e-9) L[1] = Math.max(L[1], o[1]); else mg.push([o[0], o[1]])
    }
    const bands = [[TOP, rb0, TOP, rb1]]        // 방 아래쪽(말단 꼭대기까지)
    let c0 = rt0, c1 = rt1                       // 방 위에서 시작해 개구를 하나씩 건너뛴다
    for (const [oLo, oHi] of mg) {
      const cut = Math.min(Math.max(oLo, 0), RAD_CYL_Y0)
      bands.push([c0, Math.max(c0, cut), c1, Math.max(c1, cut)])
      c0 = Math.max(c0, oHi); c1 = Math.max(c1, oHi)
    }
    bands.push([c0, RAD_CYL_Y0, c1, RAD_CYL_Y0])   // 마지막 개구 위 인방
    for (const [lo0, hi0, lo1, hi1] of bands) {
      if (hi0 - lo0 < 1e-9 && hi1 - lo1 < 1e-9) continue
      put(a0, lo0, R, 1, 0); put(a0, hi0, R, 1, 0); put(a1, hi1, R, 1, 0)
      put(a0, lo0, R, 1, 0); put(a1, hi1, R, 1, 0); put(a1, lo1, R, 1, 0)
    }
  }
  //  ── ② 말단 회전체 ── 링 목록을 만들고(경계마다 둘) 이웃 링 사이를 돈다
  const rings = []
  for (const g of spec.segs) {
    const yTop = TOP + g.y0, yBot = TOP + g.y1
    if (g.t === 'sph') {
      const yc = g.r0 >= g.r1 ? yTop : yBot            // 적도 = 넓은 쪽 끝
      for (let i = 0; i <= RAD_CYL_SPH_SEG; i++) {
        const y = yTop - (i / RAD_CYL_SPH_SEG) * g.d
        const r = Math.sqrt(Math.max(0, g.Rs ** 2 - (y - yc) ** 2))
        rings.push({ y, r, nr: r / g.Rs, ny: (y - yc) / g.Rs })   // ★구 중심에서의 정확한 법선
      }
    } else {
      const L = Math.hypot(g.r1 - g.r0, g.d)
      const nr = g.d / L, ny = (g.r1 - g.r0) / L        // 모선의 수직(원기둥이면 (1,0))
      rings.push({ y: yTop, r: g.r0, nr, ny }, { y: yBot, r: g.r1, nr, ny })
    }
  }
  for (let j = 0; j < rings.length - 1; j++) {
    const A = rings[j], B = rings[j + 1]
    if (Math.abs(A.y - B.y) < 1e-9 && Math.abs(A.r - B.r) < 1e-9) continue
    for (let i = 0; i < angs.length - 1; i++) {
      const a0 = angs[i], a1 = angs[i + 1]
      if (a1 - a0 < 1e-7) continue
      put(a0, B.y, B.r, B.nr, B.ny); put(a0, A.y, A.r, A.nr, A.ny); put(a1, A.y, A.r, A.nr, A.ny)
      put(a0, B.y, B.r, B.nr, B.ny); put(a1, A.y, A.r, A.nr, A.ny); put(a1, B.y, B.r, B.nr, B.ny)
    }
  }
  //  ── ③ 막힌 끝(현도 3차 "이젠 막힌 관") — 평면 원반, 법선 아래 ──
  const E = rings[rings.length - 1]
  for (let i = 0; i < angs.length - 1; i++) {
    const a0 = angs[i], a1 = angs[i + 1]
    if (a1 - a0 < 1e-7) continue
    pos.push(0, E.y, 0); nrm.push(0, -1, 0)
    put(a0, E.y, E.r, 0, -1); put(a1, E.y, E.r, 0, -1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}

function buildStairGeo(rotY, tx, tz, ev, shellBrush) {
  const yTop = Y_FTOP - 0.02, yBot = Y_RFTOP - 0.23
  const RISE = (yTop - Y_RFTOP) / RAD_ST_N            // 단높이 ≈0.318
  const sh = new THREE.Shape()
  sh.moveTo(-1.6, yBot); sh.lineTo(-1.6, yTop); sh.lineTo(RAD_ST_LAND, yTop)
  for (let k = 1; k <= RAD_ST_N; k++) {
    const z0 = RAD_ST_LAND + (k - 1) * RAD_ST_T
    sh.lineTo(z0, yTop - k * RISE); sh.lineTo(z0 + RAD_ST_T, yTop - k * RISE)
  }
  sh.lineTo(RAD_ST_LAND + RAD_ST_N * RAD_ST_T, yBot); sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: RAD_ST_W, bevelEnabled: false })
  g.translate(0, 0, -RAD_ST_W / 2)
  g.rotateY(-Math.PI / 2)                             // (프로파일, y, 폭) → (폭, y, 프로파일): +z = 방 안쪽
  g.rotateY(rotY); g.translate(tx, 0, tz)             // 문틀과 같은 배치(꽃잎 로컬)
  let b = new Brush(g); b.updateMatrixWorld()
  b = ev.evaluate(b, shellBrush, INTERSECTION)
  return b.geometry
}

export function buildStairs() {  // export = check_radial §15가 번들 임포트로 실제 CSG 실행 검증
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const sg = new THREE.SphereGeometry(1, 48, 32)
  sg.scale(RAD_PRX - 0.05, RAD_PRY - 0.05, RAD_PRX - 0.05)
  sg.translate(0, RAD_PCY, 0)
  const shellB = new Brush(sg); shellB.updateMatrixWorld()
  const dc = 2 * Math.asin(FR_C / (2 * RAD_R))
  const fx = RAD_R * (Math.cos(dc) - 1), fz = RAD_R * Math.sin(dc)
  //  방향 주의: 문틀 로컬 +z가 '방 안쪽'인 배치 — 허브(π/2)·−z 고리(+dc)는 그대로, +z 고리는 π 뒤집음
  //  ★★★120: 허브 계단은 문과 한 몸이다 — 문을 봉인하면 "3.2 올라가서 15.74 허공으로 나가는 계단"이
  //  방마다 하나씩 남는다. 같은 게이트로 묶는다(보존계 — 배열에서 지우지 않고 조건부 포함).
  //  ★122-b: 접선 계단도 문과 한 몸(★120 패턴) — 봉인된 문 앞 계단은 게이트.
  return [
    ...(HUB_DOOR_ON ? [buildStairGeo(Math.PI / 2, -FR_C, 0, ev, shellB)] : []),
    ...(TAN_DOOR_POS_GATE ? [buildStairGeo(-dc + Math.PI, fx, fz, ev, shellB)] : []),
    ...(TAN_DOOR_NEG_GATE ? [buildStairGeo(dc, fx, -fz, ev, shellB)] : []),
  ]
}

// ── 대각 터널(월드 좌표: 각 ang): 바닥판 + 스커트 벽 2 + 천장판 — 셸 끝은 문틀 몸통 안 평면 종료 ──
function Tunnel({ ang }) {
  const d = [Math.cos(ang), Math.sin(ang)]
  const n = [-Math.sin(ang), Math.cos(ang)]
  const sWall0 = S_WALL0                    // 원뿔벽(r≈16~17@문높이) 관통 시작 — 허브 문틀 몸통 안(HFR_BACK<15.5) 시작
  const s1 = RAD_R - RAD_PRX + 2.5          // 언더플로어(바닥판·스커트 하부·캡) 끝 — 깊은 관입(안 보임·밀폐 담당)
  //  ★★★110(2026.08.04 현도 로컬 적발: "원판 밑에 붙은 찌꺼기") — **언더플로어의 안쪽 시작을 자른다.**
  //   ⛔구판 전제가 틀렸다: 아래 바닥판 주석은 "방 안 부분은 방 원판 밑 = 안 보임"이라고 적혀 있었지만
  //   **안 보이지 않는다.** 실측 — 디스크 밑면 100.970 vs 바닥판 밑면 100.680 → **0.290 아래로 노출**.
  //   스커트는 더 심하다(밑끝 = 돔 표면 ≈99.1~100.1 → 최대 **2.1** 노출). 오큘러스(r17.45) 안쪽에는
  //   받아 줄 돔이 아예 없어서 스커트가 허공에 매달린다. 방에서 올려다보면 4방×3조각이 원판에 붙어 보인다.
  //   ★정본 = **언더플로어는 디스크 바깥(r ≥ ROOM_LAND_R)에서만 존재한다.** 디스크(r6~18)가 그 구간의
  //   걷는 면을 이미 전담하므로 잘라도 밟을 것이 사라지지 않는다(윗면 단차 101.32→101.28 = 0.04).
  const sUnder = Math.max(RAD_T_IN, ROOM_LAND_R + RAD_UNDER_LIP)   // 바닥판 안쪽 시작
  const sSkirt = Math.max(sWall0, ROOM_LAND_R + RAD_UNDER_LIP)     // 스커트 안쪽 시작
  const sTube = RAD_R - TUBE_END            // ★바닥 위 벽·지붕 끝 스테이션 ≈47.0 — 문틀 안
  const wallGeo = useMemo(() => quadGeo((q) => {
    for (const sgn of [1, -1]) {
      const off = sgn * RAD_T_HW
      const X = (sv) => [sv * d[0] + off * n[0], sv * d[1] + off * n[1]]
      // 바닥 위(49.28→RAD_TOP): sWall0→sTube — 문틀 몸통 안에서 평면 종료
      const seg = Math.max(3, Math.ceil((sTube - sWall0) / 4))
      for (let i = 0; i < seg; i++) {
        const [ax, az] = X(sWall0 + (sTube - sWall0) * (i / seg))
        const [bx, bz] = X(sWall0 + (sTube - sWall0) * ((i + 1) / seg))
        q(ax, Y_FTOP, az, bx, Y_FTOP, bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
      // 바닥 밑 스커트(돔 표면→49.28): sSkirt→s1 깊은 관입 (★110: 시작을 디스크 밖으로 물림)
      const segB = Math.max(3, Math.ceil((s1 - sSkirt) / 4))
      for (let i = 0; i < segB; i++) {
        const [ax, az] = X(sSkirt + (s1 - sSkirt) * (i / segB))
        const [bx, bz] = X(sSkirt + (s1 - sSkirt) * ((i + 1) / segB))
        q(ax, clipY(ax, az), az, bx, clipY(bx, bz), bz, bx, Y_FTOP, bz, ax, Y_FTOP, az)
      }
    }
    // ★끝단 캡(②b): 언더플로어 개방 단면(돔 표면 → 바닥판 밑면 48.68) 봉합 — 판 옆면(48.68~49.28)은 판이 스스로 덮음
    const yCap = RAD_FLOOR_Y - COR_THICK / 2
    const cax = s1 * d[0] + RAD_T_HW * n[0], caz = s1 * d[1] + RAD_T_HW * n[1]
    const cbx = s1 * d[0] - RAD_T_HW * n[0], cbz = s1 * d[1] - RAD_T_HW * n[1]
    q(cax, clipY(cax, caz), caz, cbx, clipY(cbx, cbz), cbz, cbx, yCap, cbz, cax, yCap, caz)
  }), [ang])
  const midF = (sUnder + s1) / 2, lenF = s1 - sUnder     // ★110: 바닥판도 디스크 밖에서 시작
  const midC = (sWall0 + sTube) / 2, lenC = sTube - sWall0   // 천장판도 문틀 안 종료
  return (
    <group>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 바닥판 — ★110: **디스크 바깥(r ≥ ROOM_LAND_R + 립)에서 시작**한다. 구판은 r12부터라 디스크 밑면보다
          0.29 아래로 삐져나와 방에서 '원판에 붙은 찌꺼기'로 보였다(현도 2026.08.04 적발·실측 확인). */}
      <mesh position={[midF * d[0], RAD_FLOOR_Y, midF * d[1]]} rotation-y={-ang} userData={{ walkable: true }}>
        <boxGeometry args={[lenF, COR_THICK, RAD_T_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 천장판 — 폭 = 벽과 플러시 */}
      <mesh position={[midC * d[0], RAD_TOP + 0.2, midC * d[1]]} rotation-y={-ang}>
        <boxGeometry args={[lenC, 0.4, RAD_T_HW * 2]} />
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── 고리 원호 구간(월드): 바닥 고리판(보행) + 안/밖 스커트 벽 + 지붕 고리판 ──
//  boxStart/boxEnd = 그 끝이 박스 옆벽(z=±BOX_HW) 접합 → 반경별 각 asin(BOX_HW/r)로 z평면에 정확히 착지(지느러미·슬릿 제거).
//  셸쪽 끝: 바닥 위 벽·지붕은 문틀 몸통 안(TUBE_END)에서 평면 종료, 언더플로어(바닥판·스커트 하부·캡)만 깊은 관입(ARC_IN).
function ArcSection({ phi0, phi1, boxStart = false, boxEnd = false }) {
  const rIn = RAD_R - RAD_T_HW, rOut = RAD_R + RAD_T_HW
  const p = (r, phi) => [r * Math.cos(phi), r * Math.sin(phi)]
  // 깊은 끝: 박스 끝 = z평면 클립 / 셸 끝 = ARC_IN 광선
  const clipAng = (r, ph) => (Math.sin(ph) >= 0 ? Math.asin(BOX_HW / r) : Math.PI * 2 - Math.asin(BOX_HW / r))
  const aDeep = (r) => (boxStart ? clipAng(r, phi0) : phi0)
  const bDeep = (r) => (boxEnd ? clipAng(r, phi1) : phi1)
  // 셸 끝의 꽃잎 중심 방위각과, 반경 r에서 중심거리 TUBE_END가 되는 각 오프셋(문틀 안 종료각)
  const P0 = phi0 - RAD_ARC_IN, P1 = phi1 + RAD_ARC_IN
  const dTube = (r) => Math.acos(Math.min(1, Math.max(-1, (r * r + RAD_R * RAD_R - TUBE_END ** 2) / (2 * r * RAD_R))))
  const aUp = (r) => (boxStart ? aDeep(r) : P0 + dTube(r))   // 바닥 위 벽의 시작·끝각
  const bUp = (r) => (boxEnd ? bDeep(r) : P1 - dTube(r))
  const wallRoofGeo = useMemo(() => quadGeo((q) => {
    const segN = Math.max(4, Math.ceil((phi1 - phi0) * RAD_R / 4))
    for (const r of [rIn, rOut]) {
      // 바닥 위 벽(49.28→RAD_TOP): 문틀 안 종료각까지
      const A0 = aUp(r), B0 = bUp(r)
      for (let i = 0; i < segN; i++) {
        const a = A0 + (B0 - A0) * (i / segN), b = A0 + (B0 - A0) * ((i + 1) / segN)
        const [ax, az] = p(r, a), [bx, bz] = p(r, b)
        q(ax, Y_FTOP, az, bx, Y_FTOP, bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
      // 바닥 밑 스커트(돔 표면→49.28): 깊은 끝까지
      const AD = aDeep(r), BD = bDeep(r)
      for (let i = 0; i < segN; i++) {
        const a = AD + (BD - AD) * (i / segN), b = AD + (BD - AD) * ((i + 1) / segN)
        const [ax, az] = p(r, a), [bx, bz] = p(r, b)
        q(ax, clipY(ax, az), az, bx, clipY(bx, bz), bz, bx, Y_FTOP, bz, ax, Y_FTOP, az)
      }
    }
    // 지붕(평판 고리, y=RAD_TOP): 모서리를 각 반경의 바닥 위 종료각에 물림
    for (let i = 0; i < segN; i++) {
      const t0 = i / segN, t1 = (i + 1) / segN
      const [ia, iza] = p(rIn, aUp(rIn) + (bUp(rIn) - aUp(rIn)) * t0)
      const [ib, izb] = p(rIn, aUp(rIn) + (bUp(rIn) - aUp(rIn)) * t1)
      const [oa, oza] = p(rOut, aUp(rOut) + (bUp(rOut) - aUp(rOut)) * t0)
      const [ob, ozb] = p(rOut, aUp(rOut) + (bUp(rOut) - aUp(rOut)) * t1)
      q(ia, RAD_TOP, iza, ib, RAD_TOP, izb, ob, RAD_TOP, ozb, oa, RAD_TOP, oza)
    }
    // ★끝단 캡(②b — 셸쪽 깊은 끝만): 언더플로어 개방 단면(돔 표면 → 바닥 고리판 윗면) 봉합
    for (const [isBox, ph] of [[boxStart, phi0], [boxEnd, phi1]]) {
      if (isBox) continue
      const [ix, iz] = p(rIn, ph), [ox, oz] = p(rOut, ph)
      q(ix, clipY(ix, iz), iz, ox, clipY(ox, oz), oz, ox, Y_FTOP, oz, ix, Y_FTOP, iz)
    }
  }), [phi0, phi1, boxStart, boxEnd])
  const floorGeo = useMemo(() => quadGeo((q) => {
    const segN = Math.max(4, Math.ceil((phi1 - phi0) * RAD_R / 4))
    for (let i = 0; i < segN; i++) {
      const t0 = i / segN, t1 = (i + 1) / segN
      // 벽과 플러시 폭·깊은 끝까지(방 안 부분은 방 원판 0.02 립 아래 = 안 보임)
      const [ia, iza] = p(rIn, aDeep(rIn) + (bDeep(rIn) - aDeep(rIn)) * t0)
      const [ib, izb] = p(rIn, aDeep(rIn) + (bDeep(rIn) - aDeep(rIn)) * t1)
      const [oa, oza] = p(rOut, aDeep(rOut) + (bDeep(rOut) - aDeep(rOut)) * t0)
      const [ob, ozb] = p(rOut, aDeep(rOut) + (bDeep(rOut) - aDeep(rOut)) * t1)
      q(ia, Y_FTOP, iza, ib, Y_FTOP, izb, ob, Y_FTOP, ozb, oa, Y_FTOP, oza)
    }
  }), [phi0, phi1, boxStart, boxEnd])
  return (
    <group>
      <mesh geometry={wallRoofGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={floorGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── ★문틀(2026.07.11, 현도 지정): 잼 2 + 상인방 1. 꽃잎 로컬 프레임에서 문 3곳에 배치(등형 — 4방 동일) ──
//  문틀이 셸 표면을 앞뒤로 걸쳐(깊이 FR_D) 곡면 이음선·구멍 가장자리(±2.3)·튜브 끝을 전부 몸통 안에 삼킨다.
//  로컬: 깊이축 = group z / 좌우 = group x. 문지방(단차)은 안 올림 — 바닥판 윗면이 그대로 문지방(보행 무단차).
//  ★119 높이 일반화: yFloor/yDoorTop/yLinTop 프롭 신설(기본값 = 구 문 12곳 — 호출부 무수정).
//  상부 문틀은 같은 어법을 진입 바닥 높이에서 재사용한다(잼 2 + 상인방 1 · 이음선을 몸통이 삼킴).
//  ★122-k: jambIn = 잼을 컷 안쪽으로 더 물리는 양(기본 0 = 구 어법). 접선 문은 겹침 0.10뿐이라
//  컷 가장자리가 잼 옆으로 새어 세로 슬릿이 됐다(현도 지적) → TAN_JAMB_IN으로 삼킴을 키운다.
//  ★★★122-N(2026.08.12 현도 지시 그대로): **문틀을 나선 통로 쪽(셸 바깥 방향)으로 연장**한다.
//  구 문틀은 바깥 끝이 r16.455로 원기둥면(16.25)을 겨우 0.2 넘었고, 통로 안 가장자리(16.30)
//  안쪽에서 끝나 원기둥 개구 가장자리를 못 삼켰다 → 그 자리가 세로 슬릿.
//  ⚠좌표: 문틀 로컬 **+z = 반경 감소(방 안쪽)**(실측 dot −0.993) → 통로 쪽 연장은 **−z**.
//   박스를 depth+outExt로 키우고 −outExt/2 만큼 옮기면 안쪽 끝은 그대로, 바깥만 자란다.
function DoorFrame({ position, rotY, depth = FR_D, yFloor = Y_FTOP, yDoorTop = DTOP, yLinTop = LIN_TOP, jambIn = 0, outExt = 0, sill = false }) {
  const D = depth + outExt, zOff = -outExt / 2
  return (
    <group position={position} rotation-y={rotY}>
      {[1, -1].map((sg) => (
        <mesh key={sg} position={[sg * (RAD_T_HW - jambIn + (FR_T + jambIn) / 2), (yFloor + yDoorTop) / 2, zOff]}>
          <boxGeometry args={[FR_T + jambIn, yDoorTop - yFloor, D]} />
          <meshStandardMaterial color={MAT_WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, (yDoorTop + yLinTop) / 2, zOff]}>
        <boxGeometry args={[FR_OUT * 2, yLinTop - yDoorTop, D]} />
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} />
      </mesh>
      {/* ★★122-Q ② 문지방 — 나선(직선·원호)과 셸(구면)의 곡률 차가 만드는 바닥 쐐기 틈을
          판 하나로 덮는다(윗면 = 문지방 레벨 = 단차 0 · 두께는 아래로, 매스 몸통에 묻힘). */}
      {sill && (
        <mesh position={[0, yFloor - TAN_SILL_T / 2, zOff]} userData={{ walkable: true }}>
          <boxGeometry args={[FR_OUT * 2, TAN_SILL_T, D]} />
          <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}

// ── ★★★119 상승 터널(2026.08.05 현도 스케치): 허브→방 접근 = 오르는 계단 관 ──
//  기하 정본 = ascentTunnelGeometry.js(순수 모듈 — check_radial 공유). 로컬 +x 프레임 한 번 → 4회 회전(등형).
//  구 수평 터널(Tunnel)은 RAD_ASC_ON=false로 복귀하는 보존계.
function LinkPassages() {
  const parts = useMemo(() => buildLinkParts(linkSpec()), [])
  if (!parts.length) return null
  return (
    <>
      {parts.map(({ k, walk, solid }) => (
        <group key={k} rotation-y={-(k * Math.PI / 2)}>
          {/* ★★130-g side=DoubleSide: 관은 ★130-f에서 **양 끝 캡을 뺐다** → 더는 닫힌 솔리드가 아니라
              FrontSide로는 안에서 뒷면이 컬링돼 **통로 안에서 바깥이 훤히 보였다**(현도 실측 버그).
              상승 관 벽·천장이 이미 DoubleSide인 것과 같은 어법. */}
          {walk.map((g, i) => (
            <mesh key={'w' + i} geometry={g} userData={{ walkable: true }}>
              <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {solid.map((g, i) => (
            <mesh key={'s' + i} geometry={g} userData={{ walkable: false }}>
              <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function AscentTunnel({ ang }) {
  const massGeo = useMemo(buildAscentMass, [])
  const wallGeo = useMemo(buildAscentWalls, [])
  const ceilGeo = useMemo(buildAscentCeiling, [])
  const colGeo  = useMemo(buildAscentColumns, [])
  const ovlGeo  = useMemo(buildAscentOverlook, [])   // ★122-d 전망 난간
  const mouthGeo = useMemo(buildAscentMouthSill, [])  // ★122-R 어귀 접합 판   // ★121 기둥 5기(RASC_SUP_ON=false면 빈 기하 — 보존계)
  return (
    <group rotation-y={-ang}>
      <mesh geometry={massGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
      </mesh>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ceilGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* ★★122-d 전망 난간(현도: "참에서 전망대처럼 셸 내부를 내려다본다") — 새 문 개구를 가로막는다 */}
      <mesh geometry={ovlGeo} userData={{ walkable: false }}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} />
      </mesh>
      {/* ★★122-R ① 어귀 접합 판 — 디스크(원판)와 관(직선 폭)의 곡률 차 바닥 틈을 덮는다 */}
      <mesh geometry={mouthGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
      </mesh>
      {/* ★★★121 기둥 지지(2026.08.11 현도 결정 A) — 팔각 뿔대 5기, 발 = 돔 로프트 착지.
          ⚠밟는 면 아님 · 색 = 셸 석재(★113 원칙 — 새 색 없음) · 소등 = RASC_SUP_ON */}
      <mesh geometry={colGeo} userData={{ walkable: false }}>
        <meshStandardMaterial color={MAT_SHELL} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function RadialRooms() {
  const petalGeo = useMemo(buildPetalShell, [])
  const extSpiralGeos = useMemo(() => ({
    mass: buildExtSpiral(),
    encl: RSP_ENCL === 'tube' ? buildExtSpiralShell() : buildExtSpiralParapet(),   // ★122-b 체제 스위치
    wfr: buildExtWindowFrame(),
    skirt: buildExtSpiralSkirt(),   // ★122-c
    bridge: buildExtSpiralBridge(), // ★122-d
  }), [])   // ★122·★122-b·★122-c
  //  ★★★126 1p3 변형체: 팔 세계의 나선 = noCyl(하반부 안쪽 벽 = 셸 곡면 · 창틀도 셸 추종)
  const extSpiralGeos13 = useMemo(() => (ARM13_ON && RSP_ON ? {
    mass: buildExtSpiral({ noCyl: true }),
    encl: RSP_ENCL === 'tube' ? buildExtSpiralShell({ noCyl: true }) : buildExtSpiralParapet({ noCyl: true }),
    wfr: buildExtWindowFrame({ noCyl: true }),
    skirt: buildExtSpiralSkirt({ noCyl: true }),
    bridge: buildExtSpiralBridge({ noCyl: true }),
  } : null), [])
  const armGeo = useMemo(() => (ARM13_ON ? buildArm13() : null), [])   // ★126 팔(스팬드럴·돔 융합·날·컵·각기둥)
  const cylAt = (k) => RAD_CYL_ON && !(ARM13_ON && k === ARM13_K)     // ★126 게이트 — k=2 원기둥·말단·칼라 소등
  const cylGeos = useMemo(() => [0, 1, 2, 3].map(buildCylSkirt), [])   // ★말단이 넷 다 달라 개별 기하
  const collarGeo = useMemo(buildCylCollar, [])   // ★123 적도 칼라(넷 동일 — 말단과 무관)
  const stairGeos = useMemo(buildStairs, [])
  const angs = [0, 1, 2, 3].map(k => RAD_ANG0 + k * Math.PI / 2)
  // 고리: 온호 3(꽃잎 사이) + 동측 반호 2(박스 옆벽 z=±6에서 종단 — 접합문)
  const A = RAD_ARC_IN
  const arcs = [                                             // [phi0, phi1, boxStart, boxEnd] — 박스 끝은 z평면 클립, 셸 끝은 배 밑 캡
    [angs[0] + A, angs[1] - A, false, false],                // NE→NW
    [angs[1] + A, angs[2] - A, false, false],                // NW→SW
    [angs[2] + A, angs[3] - A, false, false],                // SW→SE
    [RAD_JPHI, angs[0] - A, true, false],                    // 박스 북벽(z=+6 클립) → NE
    [angs[3] + A, Math.PI * 2 - RAD_JPHI, false, true],      // SE → 박스 남벽(z=−6 클립)
  ]
  return (
    <group>
      {/* 꽃잎 4 — 같은 셸 기하의 회전 배치(등형). 로컬 +x = 방사 바깥 */}
      {angs.map((ang, k) => (
        <group key={k} position={[RAD_R * Math.cos(ang), 0, RAD_R * Math.sin(ang)]} rotation-y={-ang}>
          <mesh geometry={petalGeo}>
            <meshStandardMaterial color={MAT_SHELL} roughness={0.88} side={THREE.DoubleSide} />
          </mesh>
          {/* ★원기둥 받침(2026.07.30) — 셸 적도에서 아래로. 재질은 셸과 같게 = 한 몸으로 읽힘(Claude 값·P2에서 재판정) */}
          {cylAt(k) && (
            <mesh geometry={cylGeos[k]}>
              <meshStandardMaterial color={MAT_SHELL} roughness={0.88} side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* ★★★126 1p3 지지 팔(2026.08.13 현도 스케치) — 원기둥 대체: 스팬드럴+돔융합+날+컵+각기둥 */}
          {ARM13_ON && k === ARM13_K && (
            <mesh geometry={armGeo} userData={{ walkable: false }}>
              <meshStandardMaterial color={MAT_SHELL} roughness={0.88} />
            </mesh>
          )}
          {/* ★123 적도 칼라 — 원기둥 상단 ↔ 셸 적도 환형 입 봉인(하반부 창에서 공동이 보이는 것을 막는다) */}
          {cylAt(k) && RAD_CYL_COLLAR_ON && (
            <mesh geometry={collarGeo} userData={{ walkable: false }}>
              <meshStandardMaterial color={MAT_SHELL} roughness={0.88} side={THREE.DoubleSide} />
            </mesh>
          )}
          {/* ★내부 바닥(2026.07.12 계란화): 강하 레벨 원뿔대 판 — 위/아래 반경을 각 높이 셸내면−0.05로 파생(기운 벽 정합, 틈·돌출 동시 소거) */}
          <mesh position={[0, Y_RFTOP - COR_THICK / 2, 0]} userData={{ walkable: true }}>
            <cylinderGeometry args={[FLOOR_RT, FLOOR_RB, COR_THICK, 48]} />
            <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* ★진입 계단 3(계란화): 문지방→방 바닥, 셸 교집합 정합 — 등형(4방 동일 기하) */}
          {stairGeos.map((g, i) => (
            <mesh key={'st' + i} geometry={g} userData={{ walkable: true }}>
              <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
            </mesh>
          ))}
          {/* ★문틀 3(방사 1 + 접선 2) — 접선은 고리 중심선 위(FR_C 지점)·접선 방향 회전 */}
          {/* ★★★120: 방사(허브) 문틀은 문과 한 몸 — 문이 봉인되면 삼킬 이음선이 없다 */}
          {HUB_DOOR_ON && <DoorFrame position={[-FR_C, 0, 0]} rotY={Math.PI / 2} />}
          {/* ★119 상부 문틀 — ★122-d: 전망 개구의 테두리로 복원 */}
          {RAD_ASC_ON && (() => {
            const S = ascSpec()
            return <DoorFrame position={[-S.frC, 0, 0]} rotY={Math.PI / 2} depth={S.frD}
              yFloor={S.y1} yDoorTop={S.doorTop} yLinTop={S.linTop} />
          })()}
          {(() => {
            const dc = 2 * Math.asin(FR_C / (2 * RAD_R))            // 중심거리 FR_C가 되는 고리 각 오프셋
            const fx = RAD_R * (Math.cos(dc) - 1), fz = RAD_R * Math.sin(dc)
            return [1, -1].filter((sg) => (sg > 0 ? TAN_DOOR_POS_GATE : TAN_DOOR_NEG_GATE)).map((sg) => (
              <DoorFrame key={sg} position={[fx, 0, sg * fz]} rotY={-sg * dc} jambIn={TAN_JAMB_IN} outExt={TAN_FR_OUT_EXT} sill={TAN_SILL_ON} />
            ))
          })()}
          {/* ★★★122 셸 외부 나선 계단(2026.08.12 현도 그림) — 꽃잎 로컬 마운트 = 4방 등형 자동.
              새 문(π) → 접선 −z 문, 61단(오름 61·내림 61 대칭), 안 가장자리 = 셸/★91 원기둥 물림 */}
          {RSP_ON && (() => { const EG = (ARM13_ON && k === ARM13_K && extSpiralGeos13) || extSpiralGeos; return (
            <>
              <mesh geometry={EG.mass} userData={{ walkable: true }}>
                <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
              </mesh>
              {/* ★122-b 체제: 'tube' = 밀봉 관(현도 ① — 바깥벽+천장, 스포일러 차단) · 'parapet' = 구 패러핏(보존계) */}
              <mesh geometry={EG.encl} userData={{ walkable: false }}>
                <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
              </mesh>
              {/* ★122-b 창 몰딩(현도 ④ — 잼 어법, 셸 종잇장 단면을 삼킨다) */}
              <mesh geometry={EG.wfr} userData={{ walkable: false }}>
                <meshStandardMaterial color={MAT_SHELL} roughness={0.85} />
              </mesh>
              {/* ★122-c 굽도리 몰딩(현도 ④ — 계단 안 가장자리 이격 0.05와 셸의 접선을 연속 밴드로 봉합) */}
              <mesh geometry={EG.skirt} userData={{ walkable: false }}>
                <meshStandardMaterial color={MAT_SHELL} roughness={0.85} />
              </mesh>
              {/* ★122-d 착지 다리(현도 ③ — 접선 컷과 같은 방향·폭의 판: 호↔직선 쐐기 틈 소거) */}
              <mesh geometry={EG.bridge} userData={{ walkable: true }}>
                <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} />
              </mesh>
            </>
          ) })()}
        </group>
      ))}
      {/* ★★★130 접속 통로(2026.08.14 현도) — 상승 계단 끝 오른쪽 벽 → 첨탑 정방위 테라스.
          배정표 `LNK_ASSIGN`대로 셸마다 다른 접근법(①단일 곡선 / ②경유지+미니 첨탑). **개구 0 = 밀봉**(양 끝 문은 다음 조각).
          기하는 셸0(315°) 월드로 한 번 짓고 90°k 회전 배치 — 상승 관·문틀과 같은 등형 어법. */}
      <LinkPassages />
      {/* 대각 터널 4 — ★119 체제: 상승 관 ↔ 구 수평 관(보존계) */}
      {angs.map((ang, k) => RAD_ASC_ON ? <AscentTunnel key={k} ang={ang} /> : <Tunnel key={k} ang={ang} />)}
      {/* ★허브 문틀 4(원뿔대 문, 2026.07.11) — 사면 걸침 깊이(HFR_D)로 원뿔 이음선·벽 시작 모서리·컷 림을 삼킴 */}
      {angs.map((ang, k) => (
        <DoorFrame key={'h' + k} position={[HFR_C * Math.cos(ang), 0, HFR_C * Math.sin(ang)]}
          rotY={Math.PI / 2 - ang} depth={HFR_D} />
      ))}
      {/* 고리 5구간 — ⛔★122 소등(2026.08.12 현도 "고리는 일단 없애자"). 보존계: RAD_RING_ON 한 줄 복귀.
          ⚠선언된 동선 단절: 방→고리→진출 박스(1p5) 경로 소멸. 접선 문·문틀·진입 계단·접합 패드는 존속. */}
      {RAD_RING_ON && arcs.map(([a, b, bs, be], i) => <ArcSection key={i} phi0={a} phi1={b} boxStart={bs} boxEnd={be} />)}
      {/* 접합 패드(박스 내부, 문 2 ↔ 다리): 다리판 밑 0.02 립 */}
      <mesh position={[RAD_JX, RAD_FLOOR_Y, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[7, COR_THICK, BOX_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
