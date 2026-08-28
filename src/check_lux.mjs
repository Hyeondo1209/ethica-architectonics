// check_lux.mjs — ★175 조도 검사 스위트
//   실행: node src/check_lux.mjs
//
//  ⚠이 스위트의 존재 이유: ★174의 검사(Q9 계열)는 **소스 문자열만** 봤다. 그래서 그린이 뜬 채로
//   화면은 한 픽셀도 안 변했고, "고쳤다"를 네 번 잘못 선언했다.
//   여기서는 조도를 계산한다 — 순수 함수이므로 반증 가능하고, 나쁜 값을 넣으면 실제로 빨개진다.
//  ⚠규율: 현재값 단언 금지. 전부 불변식이거나 '왜 이 대역이어야 하는가'가 유도되는 항목이다.
import {
  LGT_AMB_I, LGT_HEMI_I, LGT_DIR_I, LGT_DIR2_I, LGT_DIR3_I, LGT_DIR23_SHADOW,
  RND_SHADOWS, RND_SHDW_NBIAS, ROOM_DARK_ON, ROOM_DARK_AO, ROOM_DARK_SHELL,
  ROOM_SHELL_T_IN, ROOM_SHELL_T_OUT, SHELL_RIB_R,
  ROOM_FLOOR_Y, RM_SPOT_I, RM_SPOT_DECAY, RM_SPOT_SPREAD_R, SHDW_CAST_SCOPE,
  ROOM_SHAFT_ON, SHAFT_FIT, SHAFT_WAIST_R, SHAFT_POOL_R, ROOM_OCULUS_R, ROOM_CEIL_Y, ROOM_CYL_TOP, RM_SPOT_SHADOW,
  ROOM_WELL_RT, RM_SPOT_SHDW_NEAR, RM_SPOT_SHDW_NBIAS,
  SHAFT_DROP_ON, SHAFT_HALO_K_UP, SHAFT_HALO_K_LO, SHAFT_HALO_OP, RM_SHAFT_OP, ROOM_R,
  DISC_HOLE_R, DISC_Y_LO, DISC_Y_HI, SPIRE_NOCAST,
  BAKE_A_ON, BAKE_N, BAKE_FLOOR, BAKE_GAMMA, BAKE_SPLIT_ON, BAKE_SPLIT_EPS, ROOM_CX, BAKE_TIP_CAP_ON,
  BAKE_DISC_GAP_ON, BAKE_WRAP, BAKE_AMB, BAKE_BOUNCE, BAKE_TONE, BAKE_STAIR_MIN, BAKE_INST_ON, BAKE_DISC_OPEN_SEG,
} from './constants.js'
import { shaftNodes, zoneDBakeSpec, zoneDShadeAt, zoneDInterior, cylinderBandPolys,
  shaftSilhouetteFacing, shaftSlopes, shaftLenCurve, polysSolidAngle, polysIrradianceW } from './lightingModel.js'   // ★188 D구획 + ★189·★190 빛기둥
import { spireSpec } from './spireGeometry.js'
const _SP = spireSpec(), SP_TIP = _SP.tipY, SP_HOLE = _SP.holeR
import { luxAt, displayLum, selfTest, SHDW_TEXEL, SHDW_BIAS_WORLD,
  supplyDiskSamples, supplyRingSamples, bakeIrradianceAt, zoneABakeSpec, zoneAShadeAt, zoneAInterior,
  splitSoupAtBoundary, capMidY, toneCurve, zoneASegOf, polysIrradiance, diskPolys,
} from './lightingModel.js'
import { pitSpec } from './defPitGeometry.js'
import { COR_CX, COR_R, ceilY, gatCap, GAT_SLIT, GAT_CROWN_R, GAT_POSTS, BAKE_D_GAMMA, BAKE_D_SEG, SHAFT_EDGE_AXIAL, SHAFT_TOP_FADE } from './constants.js'   // ★188 D구획
import { BAKE_WELL, BAKE_WELL_BANDS, BAKE_WELL_SEG, BAKE_POLY_ON, BAKE_SEG_BLEND, BAKE_WALL_FACE_ON, BAKE_BOUNCE_UP, BAKE_GAMMA_UP, BAKE_GRAD_ON, BAKE_GRAD_TOL, BAKE_GRAD_MIN } from './constants.js'   // ★192~★198
import { wellWallBandPolys, polysIrradianceWtd, discOpenAt, discGapInteriorAt, splitSoupByGradient } from './lightingModel.js'   // ★192~★198
import { buildDisc } from './discGeometry.js'   // ★207 실기하 정점(합성 좌표는 병을 재현 못 한다)
import { wellInnerClear, wellWallR, buildSpire } from './spireGeometry.js'   // ★192 2경로 재유도 · ★195 벽 바깥반경 · ★198 표적 부재
import { discSpec as discSpec192 } from './discGeometry.js'   // ★192 대역 하단 파생 검증
import { incaBladesSpec } from './corridorStairsGeometry.js'   // ★188 실효성 항(홀 안 실부재 좌표)
import { shellMid, shellNrm } from './roomShellGeometry.js'   // ★177 D절 — 벽 표본점(합성 화면 판정)
import { readFileSync } from 'fs'

let pass = 0, fail = 0
const T = (name, cond, note = '') => {
  if (cond) { pass++; console.log(`✓ [${pass + fail}] ${name}`) }
  else { fail++; console.log(`✗ [${pass + fail}] ${name}${note ? '  → ' + note : ''}`) }
}
const FLOOR = (r) => luxAt([r, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true })

console.log('── A. 도구 자기검증(모델이 three 공식을 옳게 재현하는가) ──')
for (const [n, ok] of selfTest()) T(n, ok)

console.log('\n── B. 그림자 리그 불변식(acne ↔ 빛샘의 양끝) ──')
//  normalBias는 셰이딩 점을 법선으로 밀어 shadow map을 샘플한다.
//  텍셀보다 작으면 자기그림자 양자화를 못 덮어 acne, 벽 두께보다 크면 얇은 벽을 뚫어 빛샘.
const SHELL_T = ROOM_SHELL_T_IN + ROOM_SHELL_T_OUT
T(`normalBias(${RND_SHDW_NBIAS}) > 섀도 텍셀(${SHDW_TEXEL.toFixed(4)}) — acne 하한`,
  RND_SHDW_NBIAS > SHDW_TEXEL)
T(`normalBias(${RND_SHDW_NBIAS}) < 방 껍질 두께(${SHELL_T.toFixed(3)}) — 빛샘 상한`,
  RND_SHDW_NBIAS < SHELL_T, '벽보다 크게 밀면 반대편을 샘플해 그림자가 새고 실내 어둠이 깨진다')
T(`normalBias < 리브 관 반경/4(${(SHELL_RIB_R / 4).toFixed(3)}) — 곡면 줄무늬 방지`,
  RND_SHDW_NBIAS < SHELL_RIB_R / 4, '★173-c2의 5.0은 관 반경(4.375)과 맞먹어 샘플이 표면 밖으로 튀었다')
T(`bias 월드환산(${SHDW_BIAS_WORLD.toFixed(3)}) > 텍셀×2 — acne 하한`,
  SHDW_BIAS_WORLD > SHDW_TEXEL * 2)
T(`bias 월드환산 < 리브 반경/10(${(SHELL_RIB_R / 10).toFixed(3)}) — peter-panning 상한`,
  SHDW_BIAS_WORLD < SHELL_RIB_R / 10, '구 -0.0015 = 월드 1.2 → 그림자가 발에서 뜬다')
//  ★175-h 그림자는 **체제 선택**이지 필요조건이 아니다(★175의 오판을 정정).
//   OFF면 dir 3기가 벽을 통과해 **형태를 드러내는 방향성 채움광**이 된다 — GI 없는 렌더의 대역폭 역할.
//   실내 어둠 자체는 aoMap이 만든다. 여기서는 도메인과 **체제별 귀결**만 문다.
T(`그림자 게이트가 스위치로 존재(현행 ${RND_SHADOWS})`, typeof RND_SHADOWS === 'boolean')

console.log('\n── C. 전역 조명 무접촉(외부 인상 보존) ──')
//  ROOM_DARK는 재질 단위 기제다. 전역 노브를 건드렸다면 이 세 항이 깨진다.
T('LGT_AMB_I = 0.42 (★172 정본 무변)', LGT_AMB_I === 0.42)
T('LGT_HEMI_I = 1.15 (★172 정본 무변)', LGT_HEMI_I === 1.15)
T('dir 3기 세기 무변(0.55/0.38/0.26)', LGT_DIR_I === 0.55 && LGT_DIR2_I === 0.38 && LGT_DIR3_I === 0.26)
const OUT = luxAt([0, 0, 0], [0, 1, 0], { indoor: false, roomDark: false })
T(`실외 바닥 전역조도 = 2.1967 (±1e-3) — 화면밝기 ${displayLum(OUT.global).toFixed(3)}`,
  Math.abs(OUT.global - 2.1967) < 1e-3, `실측 ${OUT.global.toFixed(4)}`)

console.log('\n── D. 실내 어둠(★177: 베이크 전담 · aoMap = 보존계) ──')
const c = FLOOR(0), edge = FLOOR(60)
//  ★177 체제 전환(2026.08.27 현도 ⓐ): aoMap은 재질 단위라 안팎을 못 갈라 방 그룹 **바깥면**(사발·회랑·다리)의
//  간접광까지 죽였다(실외 사발 화면 0.91→0.50 실측). 어둠은 안팎을 가르는 베이크가 전담한다(헌장 Ⅱ 체제 귀결).
T('어둠 기제는 하나다 — aoMap(★175)·베이크(★176) 동시 점등 금지(겹침 = 밖이 검게 변한 그 체제)',
  !(ROOM_DARK_ON && BAKE_A_ON))
T('어둠 부재 금지 — ★175 복귀는 두 줄이다(BAKE_A_ON=false + ROOM_DARK_ON=true)',
  ROOM_DARK_ON || BAKE_A_ON)
//  ★175-b: '완전 차단'이 아니라 '억제 + 잔광 보존'이 그림이다. aoMap 공식(indirect × (1−AO))이 옳게 적용되는지를 문다.
const rawInd = luxAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, roomDark: false }).indirect
const aoInd  = luxAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, roomDark: true }).indirect
T(`[보존계] 간접광 = 원값 × (1−AO) — aoMap 공식 보존(명시 roomDark:true · 체제 무관) (${rawInd.toFixed(3)} → ${aoInd.toFixed(4)})`,
  Math.abs(aoInd - rawInd * (1 - ROOM_DARK_AO)) < 1e-9)
T(`[보존계] aoMap 체제의 간접광 억제 ≤ 5% (실측 ${(aoInd / rawInd * 100).toFixed(1)}%)`,
  aoInd <= rawInd * 0.05)
T(RND_SHADOWS
  ? '[그림자 ON] 실내 directional = 0 — 껍질이 세 방향 전부를 막는다'
  : `[그림자 OFF] dir이 실내로 들어와 채움광이 된다 (${c.dir.toFixed(3)}) — 형태가 읽히는 근거`,
  RND_SHADOWS ? c.dir === 0 : c.dir > 0.3)
T('dir2·dir3 그림자 참여(끄면 조도 0.18 = 화면 0.50 중간회색이 남는다)', LGT_DIR23_SHADOW === true)
//  ★175-b 현도 그림의 두 절을 각각 문다 — 한쪽만 만족하면 그림이 아니다.
//   ⑴"어두운 방"      : 배경이 웅덩이의 1/3 미만
//   ⑵"빛을 공급받는다": 배경이 순검정이 아니다. ⚠AO=1.0(초판)은 여기서 깨진다 —
//     GI가 없는 실시간에서 amb+hemi는 '빛이 퍼짐'을 근사하는 유일한 성분이고, 0으로 만들면 컷아웃이 된다(현도: "흑백영화 느낌").
//  ⑴'어두운 방'의 체제 무관 불변식 = **실내가 실외보다 어둡다**. 대비 기준은 그림자 체제에 따라 달라지므로 쓰지 않는다.
//  ★177 합성: 베이크 체제의 화면 = displayLum(조도 × 정점 shade) — vertexColors가 확산 응답 전체에 곱해진다.
//   보존계(베이크 소등 + aoMap)에선 shade=1이 되고 luxAt 기본값이 aoMap을 적용해 구 판정으로 자연 복귀한다.
const ZD = zoneABakeSpec()
const scrD = (p, n) => { const L = luxAt(p, n, { indoor: true })
  const sh = (BAKE_A_ON && zoneAInterior(p, ZD.spire)) ? zoneAShadeAt(p, n, ZD) : 1
  return displayLum(L.total * sh) }
const wallD = (() => { const u = 70 * Math.PI / 180, th = 0.3
  const m = shellMid(th, u), n = shellNrm(th, u)
  return { p: [m[0] - n[0] * ROOM_SHELL_T_IN, m[1] - n[1] * ROOM_SHELL_T_IN, m[2] - n[2] * ROOM_SHELL_T_IN],
           n: [-n[0], -n[1], -n[2]] } })()
const OUTF = luxAt([0, 0, 0], [0, 1, 0], { indoor: false, roomDark: false })
const wallScr = scrD(wallD.p, wallD.n)
T(`⑴어두운 방: 벽 합성 화면(${wallScr.toFixed(3)}) < 실외 × 0.85(${(displayLum(OUTF.total) * 0.85).toFixed(3)}) — 어둠 기제를 빼면 0.926으로 깨진다`,
  wallScr < displayLum(OUTF.total) * 0.85)
T(`⑵빛을 공급받는다: 벽 합성 화면 > 0.05 (실측 ${wallScr.toFixed(3)}) — 순검정 컷아웃 금지(★175-b 그림 후반부)`,
  wallScr > 0.05)

//  ★175-b 캐스터 범위 — 현도 지시("리브는 그림자를 만들지 않는다")의 잠금.
//  ⚠현재값 단언 금지 규율: 'room'을 못박지 않고 **도메인 + 두 체제의 배선 일관성**을 문다(보존계 스윕에서도 green).
const appSrc = readFileSync(new URL('./App.jsx', import.meta.url), 'utf-8')
T(`캐스터 범위가 선언된 도메인 안(현행 '${SHDW_CAST_SCOPE}')`, ['room', 'all'].includes(SHDW_CAST_SCOPE))
T('App.jsx에 캐스터 범위 분기가 실재 — \'all\'이면 씬 전체, \'room\'이면 켜지 않는다',
  /const castAll = SHDW_CAST_SCOPE === 'all'/.test(appSrc)
  && /castAll \? !\(o\.material && o\.material\.transparent\) : false/.test(appSrc))
T(`'room' 체제에서만 방이 캐스터를 떠맡는다 — 두 곳이 동시에 켜면 중복(현행 '${SHDW_CAST_SCOPE}')`,
  SHDW_CAST_SCOPE === 'room'
    ? /wantCast\) o\.castShadow =/.test(readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8'))
    : /const castAll = SHDW_CAST_SCOPE === 'all'/.test(appSrc))

console.log('\n── E. 빛우물 낙하광(그림 ②가 화면에 도달하는가) ──')
T(`웅덩이 중심 화면밝기 > 0.6 (실측 ${c.display.toFixed(3)})`, c.display > 0.6)
//  대비 요구는 그림자 체제에서만 성립한다(OFF면 dir 채움광이 배경을 함께 올린다).
const edgeScr = scrD([60, ROOM_FLOOR_Y, 0], [0, 1, 0])   // ★177: 가장자리도 합성 화면(베이크 shade 포함)으로
T(RND_SHADOWS
  ? `[그림자 ON] 중심 − 가장자리 합성 화면 차 > 0.5 (${(c.display - edgeScr).toFixed(3)})`
  : `[그림자 OFF] 중심이 가장자리보다 밝다 (${c.display.toFixed(3)} > ${edgeScr.toFixed(3)})`,
  RND_SHADOWS ? c.display - edgeScr > 0.5 : c.display > edgeScr,
  '조도비가 아니라 화면밝기로 판정한다 — ACES가 대비를 압축하므로')
T(`스포트 단독 기여 > 0.25 (실측 ${c.spot.toFixed(3)}) — 웅덩이가 기단 점광의 부산물이 아닐 것`,
  c.spot > 0.25)
T(`스포트 원뿔 반경(${RM_SPOT_SPREAD_R}) 밖에서 스포트 기여 = 0`, FLOOR(RM_SPOT_SPREAD_R + 5).spot === 0)

console.log('\n── E-2. 빛기둥(★175-c) — 빛의 출처가 화면에 있는가 ──')
//  ⚠사실 규명: 표면 조명은 공기를 밝히지 않는다 ⇒ '빛이 쏟아져 내려온다'는 볼륨 없이 표현 불가능하다.
//   ★113에서 소등됐던 기계를 현도가 재론·복귀시켰다(2026.08.25 선택 ⓑ).
//  ⚠현재값 단언 금지: 점등 여부가 아니라 **게이트와 배선이 온전한가**를 문다(보존계 스윕에서도 green).
T('빛기둥 게이트가 스위치로 존재하고 Room.jsx가 그것으로 분기한다',
  typeof ROOM_SHAFT_ON === 'boolean' && /\{ROOM_SHAFT_ON && \(<>/.test(readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')))
const _sy = ROOM_CYL_TOP - 6            // 스포트 높이(lightingModel과 같은 식)
const poolDerived = ROOM_OCULUS_R * (_sy - ROOM_FLOOR_Y) / (_sy - ROOM_CEIL_Y)   // 천장 개구만 볼 때의 바닥 반경(구 기준값)
//  ★175-f 기둥 2절(현도 지적: "빛기둥이 2개로 나뉘어야 하고, 아래는 착지 디스크 중앙 구멍에서 뻗어나간다")
const SN = shaftNodes()
T('기둥이 두 절로 나뉜다(상절 = 갓→디스크 상면 · 하절 = 디스크 구멍→아래)',
  SN.upper.length >= 2 && SN.lower.length >= 2)
T('상절 첫 마디 = 갓 꼭지·갓 구멍 반경 — 기둥이 갓에서 시작한다(현도 답 ①)',
  SN.upper[0][0] === SP_TIP && Math.abs(SN.upper[0][1] - SP_HOLE) < 1e-12)
T(`상절이 디스크 상면(${DISC_Y_HI})에서 끝난다 — 디스크가 빛을 막는다`,
  SN.upper[SN.upper.length - 1][0] === DISC_Y_HI)
T(`하절이 디스크 하면(${DISC_Y_LO})의 구멍 반경(${DISC_HOLE_R})에서 시작한다 — **진짜 조리개**`,
  SN.lower[0][0] === DISC_Y_LO && SN.lower[0][1] === DISC_HOLE_R)
//  ★175-e까지 이 항이 없어 조리개를 우물 통(16.8)으로 오인했다. 디스크가 그보다 2.8배 좁다.
T(`디스크 구멍이 우물 통·천장 개구보다 좁다 (${DISC_HOLE_R} < 16.8 < ${ROOM_OCULUS_R})`,
  DISC_HOLE_R < 16.8 && 16.8 < ROOM_OCULUS_R)
//  하절 마디가 **같은 광선 다발** 위에 있어야 기둥과 웅덩이가 어긋나지 않는다(★175-c 실패 방지).
const tL = SN.lower.map(([y, r]) => r / (SN.spotY - y))
T(`하절 마디가 모두 같은 기울기 위에 있다 (${tL.map((t) => t.toFixed(5)).join(' = ')})`,
  tL.every((t) => Math.abs(t - tL[0]) < 1e-9))
T(`하절 기울기 = 디스크 구멍이 정한 값(${SN.tanD.toFixed(5)}) — 우물 기울기(${SN.tanW.toFixed(5)})가 아니다`,
  Math.abs(tL[0] - SN.tanD) < 1e-9 && SN.tanD < SN.tanW)
T(`마지막 마디 = 각뿔대 바닥(SHAFT_DROP_ON=${SHAFT_DROP_ON})`,
  !SHAFT_DROP_ON || SN.lower[SN.lower.length - 1][0] < ROOM_FLOOR_Y)
T(`헤일로 배수가 절마다 다르다 (상 ${SHAFT_HALO_K_UP} · 하 ${SHAFT_HALO_K_LO}) — 스케치 실측`,
  SN.haloUp.every((h, i) => Math.abs(h[1] - SN.upper[i][1] * SHAFT_HALO_K_UP) < 1e-9)
  && SN.haloLo.every((h, i) => Math.abs(h[1] - SN.lower[i][1] * SHAFT_HALO_K_LO) < 1e-9))
T('헤일로 하절은 각뿔대에 들어가지 않는다', SN.haloLo.every((h) => h[0] >= ROOM_FLOOR_Y))
T(`헤일로 바닥 반경(${SN.haloLo[SN.haloLo.length - 1][1].toFixed(1)}) < 방 반경(${ROOM_R})`,
  SN.haloLo[SN.haloLo.length - 1][1] < ROOM_R)
T(`헤일로가 기둥보다 흐리다 (${SHAFT_HALO_OP} < ${RM_SHAFT_OP})`, SHAFT_HALO_OP < RM_SHAFT_OP)

T('스포트 그림자 게이트가 스위치로 존재한다', typeof RM_SPOT_SHADOW === 'boolean')
//  ★175-d 스포트 shadow camera near의 두 끝 — 광원이 반경 3.6짜리 좁은 굴뚝 안에 있다는 기하에서 유도된다.
const _spotToCeil = _sy - ROOM_CEIL_Y                                   // 스포트 → 천장 거리
const _neckSlope = (ROOM_OCULUS_R - ROOM_WELL_RT) / (ROOM_CYL_TOP - ROOM_CEIL_Y)
const _rAtSpot = ROOM_WELL_RT + (ROOM_CYL_TOP - _sy) * _neckSlope        // 스포트 높이의 목 반경
const _coneSlope = RM_SPOT_SPREAD_R / (_sy - ROOM_FLOOR_Y)
const _dHitNeck = _rAtSpot / (_coneSlope - _neckSlope)                   // 원뿔이 목 벽에 처음 닿는 거리
T(`shadow near(${RM_SPOT_SHDW_NEAR}) < 스포트→천장(${_spotToCeil}) — 천장이 빠지면 개구 잘림 자체가 사라진다`,
  RM_SPOT_SHDW_NEAR < _spotToCeil)
T(`shadow near > 원뿔이 목 벽에 닿는 거리(${_dHitNeck.toFixed(1)}) — 목 내벽이 캐스터로 들어오면 ~80° 스침각 acne`,
  RM_SPOT_SHDW_NEAR > _dHitNeck)
T(`스포트 normalBias(${RM_SPOT_SHDW_NBIAS}) > 0 — ★175-c에서 빠뜨린 항목(자책)`, RM_SPOT_SHDW_NBIAS > 0)
T('스포트 normalBias < 방 껍질 두께 — 얇은 벽을 뚫으면 빛샘',
  RM_SPOT_SHDW_NBIAS < ROOM_SHELL_T_IN + ROOM_SHELL_T_OUT)
T('Room.jsx가 스포트 shadow에 normalBias·near를 노브로 배선',
  /shadow-normalBias=\{RM_SPOT_SHDW_NBIAS\}/.test(readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8'))
  && /shadow-camera-near=\{RM_SPOT_SHDW_NEAR\}/.test(readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')))
//  ⚠잘림 경계는 **개구**가 정한다(poolDerived) — 샤프트 기하값(SHAFT_POOL_R)이 아니다.
//   'legacy' 체제에서도 빛의 잘림은 그대로이므로 표본을 물리 경계에 둔다.
const inPool = FLOOR(poolDerived - 3), outPool = FLOOR(poolDerived + 3)
T(`개구 안쪽 바닥은 스포트를 받는다 (r=${(poolDerived - 3).toFixed(1)} → ${inPool.spot.toFixed(3)})`, inPool.spot > 0.05)
//  체제별로 **반대 사실**을 문다 — 켜면 잘리고, 끄면 샌다. 어느 쪽이든 배선이 실제로 작동함을 보인다.
T(RND_SHADOWS && RM_SPOT_SHADOW
  ? `개구 바깥 바닥은 스포트가 0 (r=${(poolDerived + 3).toFixed(1)}) — 빛이 구멍 모양으로 잘린다`
  : `[그림자 소등] 개구 밖에도 빛이 샌다 (${outPool.spot.toFixed(3)})`,
  RND_SHADOWS && RM_SPOT_SHADOW ? outPool.spot === 0 : outPool.spot > 0)
//  ⚠렌더러 게이트가 우선한다: RND_SHADOWS=false면 Canvas가 그림자를 아예 그리지 않으므로 스포트 castShadow도 무효다.
const spotShdwLive = RND_SHADOWS && RM_SPOT_SHADOW
T(spotShdwLive
  ? `웅덩이 경계가 선명하다: 안 ${inPool.display.toFixed(2)} vs 밖 ${outPool.display.toFixed(2)} (차 > 0.25)`
  : `[그림자 소등] 경계가 뭉개진다: 안 ${inPool.display.toFixed(2)} vs 밖 ${outPool.display.toFixed(2)}`,
  spotShdwLive ? inPool.display - outPool.display > 0.25 : inPool.display - outPool.display < 0.25)

console.log('\n── F. 반증가능성(나쁜 값이면 빨개지는가) ──')
//  각 항은 '이 설정이 아니었다면 실패했을 것'을 계산으로 보인다 — 현재값 단언이 아니다.
const oldDecay = luxAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, spotDecay: 1.1, spotI: 14 })
T(`구 체제(decay 1.1·I 14)면 스포트 조도 < 0.05 (실측 ${oldDecay.spot.toFixed(4)}) — 감쇠 재설정이 유의미했다`,
  oldDecay.spot < 0.05)
const noDark = luxAt([60, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, roomDark: false })
T(`ROOM_DARK를 끄면 실내 배경 화면밝기 > 0.9 (실측 ${noDark.display.toFixed(3)}) — 어둠은 이 기제가 만든다`,
  noDark.display > 0.9)
const noShadow = luxAt([60, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, shadowsOn: false })
T(`그림자를 끄면 실내에 dir 누수 > 0.5 (실측 ${noShadow.dir.toFixed(3)}) — aoMap만으로는 부족하다`,
  noShadow.dir > 0.5)
T('aoMapIntensity = 1이면 간접광 완전 차단(0.9면 10% 잔광)',
  ROOM_DARK_AO === 1 ? c.indirect === 0 : c.indirect > 0)
//  E-2와 **같은 표본점**을 쓴다 — 한 지점에서 배선만 바꿔 0 ↔ 유의값이 뒤집히는 것을 보이는 게 반증의 요체다.
const noSpotShdw = luxAt([poolDerived + 3, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, spotShadow: false })
T(`같은 지점(r=${(poolDerived + 3).toFixed(1)})에서 스포트 그림자를 끄면 빛이 샌다: 0 → ${noSpotShdw.spot.toFixed(3)} — 잘림은 이 배선이 만든다`,
  noSpotShdw.spot > 0.02)

console.log('\n── G. 소스 대조(코드와 모델이 같은 값을 보는가) ──')
const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf-8')
const room = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')
T('App.jsx에 dir 위치 리터럴 [400, 700, 300] 잔존 0 — constants 정본화 완료',
  !app.includes('[400, 700, 300]'))
T('App.jsx가 LGT_DIR_POS/2/3를 마운트에 사용', app.includes('LGT_DIR_POS') && app.includes('LGT_DIR2_POS') && app.includes('LGT_DIR3_POS'))
T('ShadowRig가 map·intensity를 prop으로 받는다(dir2·3 재사용)', /function ShadowRig\(\{[^}]*map[^}]*\}\)/.test(app))
T('Room.jsx aoMap 주입에 m.needsUpdate 존재 — 없으면 USE_AOMAP 재컴파일이 안 돼 화면이 그대로다',
  /m\.needsUpdate\s*=\s*true/.test(room))
T('Room.jsx 스포트 decay가 RM_SPOT_DECAY 참조(인라인 리터럴 아님)', room.includes('decay={RM_SPOT_DECAY}'))
T('Room.jsx 샤프트가 shaftNodes() 정본을 쓴다 — 마디 좌표 사본 금지',
  /import \{[^}]*shaftNodes[^}]*\} from '\.\/lightingModel\.js'/.test(room)   // ★176: 임포트 줄이 자라도 의도(정본 사용)를 문다
  && /SHAFT\.upper/.test(room) && /SHAFT\.lower/.test(room))
T('Room.jsx가 헤일로 두 절을 그린다', /SHAFT\.haloUp/.test(room) && /SHAFT\.haloLo/.test(room))
//  ★175-g 이음매 밝기 점프 방지 — 셰이더의 세로 페이드가 uv.y를 쓰므로, 세그먼트 uv를 사슬 전체 비율로 다시 써야 한다.
T('샤프트 세그먼트 uv를 사슬 전체 비율로 리맵한다 — 없으면 마디마다 하단이 0으로 꺼져 원형 경계가 생긴다',
  /uv\.setY\(k, \(wy - yBot\) \/ span\)/.test(room) && /uv\.needsUpdate = true/.test(room))
T('셰이더의 세로 페이드가 여전히 uv.y(vY) 기반 — 리맵 전제가 유효한가',
  /vY = uv\.y/.test(room) && /smoothstep\(0\.0, 0\.18, vY\)/.test(room))
//  ★175-g 첨탑 캐스터 제외 — 조리개는 디스크(r6)이고 첨탑 벽은 그보다 훨씬 넓어 막을 것이 없다.
T(`첨탑 캐스터 제외 게이트가 스위치로 존재(현행 ${SPIRE_NOCAST})`, typeof SPIRE_NOCAST === 'boolean')
T('Room.jsx가 첨탑 mesh에 제외 표식을 달고 주입 루프가 그것을 본다',
  /userData=\{\{ spireShell: true \}\}/.test(room) && /SPIRE_NOCAST && o\.userData\.spireShell/.test(room))
T(`첨탑 내부 반경(16.8)이 디스크 구멍(${DISC_HOLE_R})보다 넓다 — 캐스터에서 빼도 조리개는 그대로`,
  16.8 > DISC_HOLE_R)
T('Room.jsx 스포트에 castShadow 배선(값이 아니라 노브를 문다)', /castShadow=\{RM_SPOT_SHADOW\}/.test(room))
T('Room.jsx 순회가 방 그룹 한정(darkRef) — 씬 전체 traverse 아님', room.includes('darkRef.current.traverse'))
T('Room.jsx가 방 메시에 castShadow를 켠다(캐스터 = 방)', /wantCast\) o\.castShadow =/.test(room))
T('어둠 게이트와 캐스터 게이트가 분리돼 있다 — ROOM_DARK_ON=false가 씬 그림자를 통째로 끄면 안 된다',
  /const wantDark = ROOM_DARK_ON/.test(room) && /const wantCast = SHDW_CAST_SCOPE/.test(room))
T('킬스위치 3종 존재(ROOM_DARK_ON · ROOM_DARK_AO · ROOM_DARK_SHELL)',
  typeof ROOM_DARK_ON === 'boolean' && typeof ROOM_DARK_AO === 'number' && typeof ROOM_DARK_SHELL === 'boolean')

console.log('\n── N. ★176 베이크 1차(공급지 = 표본점 집합 · 조명 헌장 Ⅱ) ──')
//  ⚠일반화가 설계 조건(현도 2026.08.25): 베이커 본체는 표본 배열만 받는다 — A(원판)·D(링)가 같은 함수.
{
  const B = zoneABakeSpec()
  //  ⑴ 표본 생성 — 결정론·기하 소속
  const d1 = supplyDiskSamples({ c: [0, DISC_Y_LO, 0], r: DISC_HOLE_R })
  const d2 = supplyDiskSamples({ c: [0, DISC_Y_LO, 0], r: DISC_HOLE_R })
  T(`원판 표본 결정론 — 두 호출이 비트 동일(N=${BAKE_N})`,
    d1.length === BAKE_N && JSON.stringify(d1) === JSON.stringify(d2))
  T('원판 표본 전부가 원판 위(반경 이내 · 같은 y)',
    d1.every((s) => Math.hypot(s.p[0], s.p[2]) <= DISC_HOLE_R + 1e-9 && s.p[1] === DISC_Y_LO))
  const RING_R = 10   // ⚠임의 반경 — D의 실제 기하가 아니라 링 광원의 **물리**를 무는 항(실기하는 D 착수 때)
  const rg = supplyRingSamples({ c: [0, 40, 0], R: RING_R })
  T('링 표본 전부가 정확히 고리 위(|ρ−R| < 1e-9)',
    rg.length === BAKE_N && rg.every((s) => Math.abs(Math.hypot(s.p[0], s.p[2]) - RING_R) < 1e-9))
  //  ⑵ 베이커 일반성 — 공급지 좌표가 함수 밖(표본)에만 있다는 증명: 평행이동 불변
  const tr = [7.3, -11.1, 4.2]
  const dT = d1.map((s) => ({ p: [s.p[0] + tr[0], s.p[1] + tr[1], s.p[2] + tr[2]], n: s.n }))
  const pA = [3, 60, -2], nA = [0, 1, 0]
  T('베이커 평행이동 불변 — 공급지 하드코딩 없음(표본·정점을 같이 옮기면 E 동일)',
    Math.abs(bakeIrradianceAt(pA, nA, d1)
      - bakeIrradianceAt([pA[0] + tr[0], pA[1] + tr[1], pA[2] + tr[2]], nA, dT)) < 1e-15)
  //  ⑶ 코사인 두 짝 — 표면 등 뒤 0 · 개구 뒤(발광 반구 밖) 0
  //  ★181: '등 뒤 = 0'은 이제 **직접항의 성질**이다(wrap·amb를 끄고 문다). 켠 체제에서 amb가 닿는 것은 [125]가 판정한다.
  T('[직접항] 표면 등 뒤(법선이 공급지 반대) → E = 0',
    bakeIrradianceAt([0, 60, 0], [0, -1, 0], d1, { wrap: 0, amb: 0 }) === 0)
  //  ⚠배치 주의(공허 가드 자기 적발 — ★161 계열): 위쪽 점에 **상향** 법선을 주면 수신 코사인이 먼저 죽여
  //   발광 코사인을 지워도 통과한다. 발광 코사인만이 죽일 수 있는 배치 = 개구 위에서 **내려다보는** 면.
  T('개구 뒤(공급면 위에서 내려다보는 면) → E = 0 — 발광 반구 밖',
    bakeIrradianceAt([0, DISC_Y_LO + 10, 0], [0, -1, 0], d1) === 0)
  //  ⑷ 거리 단조(하절 축상): 방 바닥 중앙 > 각뿔대 바닥 중앙(더 멀다)
  const pit = pitSpec()
  T('축상 거리 단조 — 방 바닥 E > 각뿔대 바닥 E',
    bakeIrradianceAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], B.lower.samples)
    > bakeIrradianceAt([0, pit.yBot, 0], [0, 1, 0], B.lower.samples))
  //  ⑸ ★176 ③ 방향 가드 — "첨두의 빛기둥 쪽 면은 밝고 반대 면은 어둡다"(★175-i 헌장 예문 그대로)
  const rEx = pit.rTop   // 각뿔대 상면 외접(파생) — 첨두·감실권의 대표 반경
  T(`방향 가드 — r≈${rEx.toFixed(1)} 높이 중간에서 축 향한 면 shade > 반대 면 shade (엄격 부등)`,
    zoneAShadeAt([rEx, ROOM_FLOOR_Y + 1, 0], [-1, 0, 0], B)
    > zoneAShadeAt([rEx, ROOM_FLOOR_Y + 1, 0], [1, 0, 0], B))
  //  ⑹ 범위·정규화
  const sweep = [
    [[0, ROOM_FLOOR_Y, 0], [0, 1, 0]], [[60, 70, 0], [-1, 0, 0]], [[60, 70, 0], [1, 0, 0]],
    [[0, 130, 0], [0, 1, 0]], [[-40, 55, 20], [0.6, 0.8, 0]], [[0, pit.yBot, 0], [0, 1, 0]],
  ].map(([p, n2]) => zoneAShadeAt(p, n2, B))
  T(`shade 전 표본 ∈ [BAKE_FLOOR(${BAKE_FLOOR}), 1]`,
    sweep.every((s) => s >= BAKE_FLOOR - 1e-12 && s <= 1 + 1e-12))
  //  ★183: 기준점 불변식은 't = 1'이다 — 화면값은 곡선에 따른다(clip → 1 · soft → (1−e⁻¹)^γ). 체제 무관 형태로 문다.
  const refShade = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(1)
  T(`정규화 항등 — 하절 기준점의 t = 1 (화면 ${refShade.toFixed(3)} = FLOOR+(1−FLOOR)·toneCurve(1))`,
    Math.abs(zoneAShadeAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], B) - refShade) < 1e-12)
  //  ⑺ 두 절 분리 — 경계·공급지 대응이 전부 파생(디스크 상하면·첨탑 꼭지)
  T('절 경계 = 디스크 중간 높이(파생)', Math.abs(B.splitY - (DISC_Y_LO + DISC_Y_HI) / 2) < 1e-12)
  T('상절 공급지 = 첨탑 꼭지 구멍(y=tipY · r=holeR — 파생 대조)',
    B.upper.samples.every((s) => s.p[1] === SP_TIP && Math.hypot(s.p[0], s.p[2]) <= SP_HOLE + 1e-9))
  //  ★186: 조사량 경로가 둘이다(해석 다각형 / 점 표본). 자기일관은 **산 경로**(spec의 eAt)로 문다 — 체제 무관.
  T('우물 안 점(경계 위)은 상절로 계산된다 — 함수 자기일관(spec의 eAt 경로 + toneCurve)',
    Math.abs(zoneAShadeAt([0, DISC_Y_HI + 5, 0], [0, 1, 0], B)
      - (BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(
          B.eAt([0, DISC_Y_HI + 5, 0], [0, 1, 0], B.upper) / B.upper.eRef, BAKE_TONE, BAKE_GAMMA_UP))) < 1e-12)   // ★197 상절 감마

  //  ★186 해석 면적분 — 도구 자기검증(폐형해 대조)이 먼저다
  {
    for (const [R, h] of [[6, 2], [18, 0.5], [18, 47], [6, 0.05]]) {
      const num = polysIrradiance([0, -h, 0], [0, 1, 0], diskPolys({ c: [0, 0, 0], r: R, seg: 48 }))
      const exact = Math.PI * R * R / (R * R + h * h)
      T(`[도구] 원판 축상 조사량이 폐형해 πR²/(R²+h²)와 일치 (R=${R} h=${h} · 오차 ${(Math.abs(num - exact) / exact * 100).toFixed(3)}%)`,
        Math.abs(num - exact) / exact < 5e-3)
    }
    T('[도구] 개구 뒤(발광 반구 밖)와 표면 등 뒤는 0',
      polysIrradiance([0, 5, 0], [0, 1, 0], diskPolys({ c: [0, 0, 0], r: 6 })) === 0
      && polysIrradiance([0, -2, 0], [0, -1, 0], diskPolys({ c: [0, 0, 0], r: 6 })) === 0)
    //  ⛔점 표본의 근거리 붕괴 — 병의 실재(이것이 현도가 본 '개구 밑이 검다'의 정체)
    const near = [0, -0.3, 0]
    const eSmp = bakeIrradianceAt(near, [0, 1, 0], supplyDiskSamples({ c: [0, 0, 0], r: 18, n: 16 }))
    const ePoly = polysIrradiance(near, [0, 1, 0], diskPolys({ c: [0, 0, 0], r: 18, seg: 48 }))
    T(`[반증] 점 표본은 개구 코앞에서 붕괴한다 — 표본 ${eSmp.toExponential(1)} vs 해석 ${ePoly.toFixed(3)}(≈π). 해석식이 그 병을 없앤다`,
      ePoly > 3 && eSmp * 18 * 18 * Math.PI < ePoly * 0.5)
    //  방위 규약(규율 32) — 틈 = wA→+gap · 살 = wB→+sweep. 거꾸로 넣으면 공급지가 살 위에 얹힌다
    const DG = (await import('./discGeometry.js')).discSpec()
    const TAU2 = Math.PI * 2, nrm = (a) => ((a % TAU2) + TAU2) % TAU2
    const gapMid2 = DG.wA + DG.gap / 2, solidMid2 = DG.wB + DG.sweep / 2
    const rM = (DG.rIn + DG.rOut) / 2
    const yUnder = DISC_Y_LO - 1.5
    const under = (az) => zoneAShadeAt([rM * Math.cos(az), yUnder, rM * Math.sin(az)], [0, 1, 0], B)
    T(`방위 규약: 틈 아래(${(nrm(gapMid2) * 180 / Math.PI).toFixed(0)}°)가 살 아래(${(nrm(solidMid2) * 180 / Math.PI).toFixed(0)}°)보다 밝다 — 거꾸로 넣으면 뒤집힌다`,
      under(gapMid2) > under(solidMid2) + 0.05)
    //  단조성 — 개구에 다가갈수록 밝아진다(구 체제에선 정반대였다: 0.143 → 0.030)
    const col = [DISC_Y_LO - 8, DISC_Y_LO - 4, DISC_Y_LO - 1, DISC_Y_LO - 0.2]
      .map((y) => zoneAShadeAt([rM * Math.cos(gapMid2), y, rM * Math.sin(gapMid2)], [0, 1, 0], B))
    T(`개구 아래에서 다가갈수록 밝아진다 (${col.map((x) => x.toFixed(2)).join(' → ')}) — 점 표본판은 여기서 거꾸로 어두워졌다`,
      col.every((x, i) => i === 0 || x >= col[i - 1] - 1e-9))
  }
  //  ⑻ D 미리보기 — 링 광원의 물리(★175-j ⑷: 중앙 중첩·외곽 감쇠)를 **같은 베이커**가 재현
  const ringE = (x) => bakeIrradianceAt([x, 40 - RING_R, 0], [0, 1, 0], rg)
  T('링 광원: 축 아래 중앙 E > 2R 벗어난 점 E (중앙 중첩·외곽 감쇠)', ringE(0) > ringE(2 * RING_R))
  //  ⑼ 내부 판정(안팎 구분 = 제1 원칙) — 방·우물 안 true / 껍질 밖·첨탑 밖 false
  T('내부 판정: 방 중심·각뿔대 바닥·우물 축 true / 방 밖·첨탑 밖 false',
    zoneAInterior([0, 70, 0]) && zoneAInterior([0, pit.yBot + 0.1, 0]) && zoneAInterior([0, 140, 0])
    && !zoneAInterior([ROOM_R + 5, ROOM_FLOOR_Y, 0]) && !zoneAInterior([30, 140, 0]))
  //  ⑽ 노브 위생 — 표본 4 미만이면 링이 링이 아니다 · floor는 (0,1) 열린 구간
  T(`노브 위생 — BAKE_N(${BAKE_N}) ≥ 4 · BAKE_FLOOR(${BAKE_FLOOR}) ∈ (0,1)`,
    BAKE_N >= 4 && BAKE_FLOOR > 0 && BAKE_FLOOR < 1)
  //  ⑾ 배선 — Room.jsx가 정본 함수를 쓰고(사본 금지) 재질 무접촉 원칙을 지키는가
  T('Room.jsx가 lightingModel의 베이크 정본을 임포트(사본 금지)',
    /zoneABakeSpec, zoneAShadeAt, zoneAInterior/.test(room))
  T('베이크 게이트 = BAKE_A_ON 한 노브(규율 41 — 순회·useMemo 둘 다 문다)',
    /BAKE_A_ON \|\| !bakeZ/.test(room) && /BAKE_A_ON \? zoneABakeSpec\(\)/.test(room))
  T('구획 밖 전용 메시는 색·재질 무접촉(touched 게이트)', /if \(!touched\) return/.test(room))
  T('베이크 순회도 방 그룹 한정 + 재방문 표식(ROOM_DARK와 같은 어법)',
    /o\.userData\.bakeSeen/.test(room))
}

console.log('\n── O. ★178 경계 분할(정점색 보간 스미어 소거) ──')
//  ★176의 "구획 밖 정점 = 화면 불변"은 정점 단위로만 참 — 삼각형이 경계를 걸치면 GPU 보간이 어둠을
//  바깥면으로 번지게 한다(실측: 바깥 오염 7,020). 분할기는 그 삼각형만 최장변 재귀 이분한다.
{
  //  O-1. 도구 자기검증 — 합성: 평면 경계(x>0)를 걸치는 큰 삼각형 하나
  const mk = () => ({
    position: { array: new Float32Array([-10, 0, 0, 10, 0, 0, 0, 20, 0]), itemSize: 3 },
    normal:   { array: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), itemSize: 3 },
  })
  const EPS_T = 1.0
  const inX = (x) => x > 0
  const r = splitSoupAtBoundary(mk(), inX, EPS_T)
  const P = r.attrs.position, NN = r.attrs.normal
  const triMax = (t) => { const p = (k, a) => P[(t * 3 + k) * 3 + a]
    const e = (i, j) => Math.hypot(p(i, 0) - p(j, 0), p(i, 1) - p(j, 1), p(i, 2) - p(j, 2))
    return Math.max(e(0, 1), e(1, 2), e(2, 0)) }
  const triFlags = (t) => { let c = 0; for (let k = 0; k < 3; k++) if (inX(P[(t * 3 + k) * 3])) c++; return c }
  const triArea = (t) => { const g = (k) => [P[(t * 3 + k) * 3], P[(t * 3 + k) * 3 + 1], P[(t * 3 + k) * 3 + 2]]
    const [a, b, c] = [g(0), g(1), g(2)]
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const x = u[1] * v[2] - u[2] * v[1], y = u[2] * v[0] - u[0] * v[2], z = u[0] * v[1] - u[1] * v[0]
    return Math.hypot(x, y, z) / 2 }
  let badLong = 0, area = 0, offPlane = 0, badNrm = 0, badWind = 0
  for (let t = 0; t < r.tris; t++) {
    const f = triFlags(t)
    if (f > 0 && f < 3 && triMax(t) > EPS_T + 1e-9) badLong++
    area += triArea(t)
    for (let k = 0; k < 3; k++) {
      if (Math.abs(P[(t * 3 + k) * 3 + 2]) > 1e-9) offPlane++                       // 부모 평면 z=0 위인가
      const b = (t * 3 + k) * 3
      if (Math.abs(Math.hypot(NN[b], NN[b + 1], NN[b + 2]) - 1) > 1e-6) badNrm++    // 법선 단위 보존
    }
    //  감김 보존: 부모가 +z를 보므로 자식 외적의 z도 양수여야 한다
    const g = (k) => [P[(t * 3 + k) * 3], P[(t * 3 + k) * 3 + 1]]
    const [a, b, c] = [g(0), g(1), g(2)]
    if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 0) badWind++
  }
  T(`[도구] 걸친-긴 삼각형 잔존 0 (출력 ${r.tris}기 · 추가 ${r.added})`, badLong === 0 && r.added > 0)
  T(`[도구] 총면적 보존 (${area.toFixed(6)} = 200)`, Math.abs(area - 200) < 1e-6)
  T('[도구] 새 정점 전부 부모 평면 위(위치 이동 0 — 실루엣 불변의 근거)', offPlane === 0)
  T('[도구] 법선 단위 보존(중점 보간 후 정규화)', badNrm === 0)
  T('[도구] 감김 보존(자식 전부 부모 방향)', badWind === 0)

  //  O-2. 실기하 — 첨탑 셸(최대 오염원 · 실측 바깥 2,326)에 실제 판정으로
  const { buildSpire } = await import('./spireGeometry.js')
  const ZB = zoneABakeSpec()
  const geo = buildSpire()
  const src = geo.index ? geo.toNonIndexed() : geo
  const attrs = { position: { array: src.attributes.position.array, itemSize: 3 } }
  const clsf = (x, y, z) => zoneAInterior([x - ROOM_CX, y, z], ZB.spire)   // 첨탑은 원점 마운트 — 변환 항등
  //  병의 실재(공허 방지): 분할 전, 걸친-긴 삼각형이 실제로 있다
  const pre = (() => { const A = attrs.position.array; let n = 0
    for (let t = 0; t < A.length / 9; t++) { let f = 0, m = 0
      const p = (k) => [A[(t * 3 + k) * 3], A[(t * 3 + k) * 3 + 1], A[(t * 3 + k) * 3 + 2]]
      const [a, b, c] = [p(0), p(1), p(2)]
      for (const q of [a, b, c]) if (clsf(...q)) f++
      const e = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2])
      m = Math.max(e(a, b), e(b, c), e(c, a))
      if (f > 0 && f < 3 && m > BAKE_SPLIT_EPS) n++ } return n })()
  T(`[실기하] 분할 전 걸친-긴 삼각형 실재 (${pre}기) — 병이 있어야 약이 검증된다`, pre > 0)
  const r2 = splitSoupAtBoundary(attrs, clsf, BAKE_SPLIT_EPS)
  const post = (() => { const A = r2.attrs.position; let n = 0
    for (let t = 0; t < r2.tris; t++) { let f = 0
      const p = (k) => [A[(t * 3 + k) * 3], A[(t * 3 + k) * 3 + 1], A[(t * 3 + k) * 3 + 2]]
      const [a, b, c] = [p(0), p(1), p(2)]
      for (const q of [a, b, c]) if (clsf(...q)) f++
      const e = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2])
      const m = Math.max(e(a, b), e(b, c), e(c, a))
      if (f > 0 && f < 3 && m > BAKE_SPLIT_EPS + 1e-6) n++ } return n })()
  T(`[실기하] 분할 후 걸친-긴 삼각형 0 (출력 ${r2.tris}기 · 추가 +${r2.added})`, post === 0 && r2.added > 0)
  //  총면적 보존 — Float32 정점이라 상대 1e-5
  const areaOf = (A, n) => { let a = 0
    for (let t = 0; t < n; t++) { const p = (k) => [A[(t * 3 + k) * 3], A[(t * 3 + k) * 3 + 1], A[(t * 3 + k) * 3 + 2]]
      const [x, y, z] = [p(0), p(1), p(2)]
      const u = [y[0] - x[0], y[1] - x[1], y[2] - x[2]], v = [z[0] - x[0], z[1] - x[1], z[2] - x[2]]
      a += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2 } return a }
  const a0 = areaOf(attrs.position.array, attrs.position.array.length / 9), a1 = areaOf(r2.attrs.position, r2.tris)
  T(`[실기하] 총면적 보존 (상대오차 ${(Math.abs(a1 - a0) / a0).toExponential(2)})`, Math.abs(a1 - a0) / a0 < 1e-5)

  //  O-3. 파생·배선
  T('EPS 파생 항등 = 방 껍질 벽 두께(T_OUT+T_IN — 스미어 상한의 물리 근거)',
    Math.abs(BAKE_SPLIT_EPS - (ROOM_SHELL_T_OUT + ROOM_SHELL_T_IN)) < 1e-12)
  const roomSrc2 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')
  T('Room.jsx가 분할기 정본을 임포트(사본 금지)', /splitSoupAtBoundary[^]*from '\.\/lightingModel\.js'/.test(roomSrc2))
  T('분할 게이트 = BAKE_SPLIT_ON + 재방문 표식(bakeSplit)',
    /BAKE_SPLIT_ON && !g\.userData\.bakeSplit/.test(roomSrc2) && /g\.userData\.bakeSplit = true/.test(roomSrc2))
  T('무접촉 보존 — 걸침 없으면 기하 원형 유지(선판정 후 조기 반환)', /if \(!any\) return 0/.test(roomSrc2))

  //  O-4. ★179 갓 중립면 = 상절 천장 — 반경만 보던 판정이 갓 윗면을 삼켰다(현도 실증: 꼭지 바깥 검어짐)
  const SP = (await import('./spireGeometry.js')).spireSpec()
  const slope = SP.finCapH / (SP.finCapR - SP.holeR)
  T(`capMidY 파생 항등 — 수직 오프셋 = capT·√(1+기울기²)/2 (손 수치 0 · 기울기 ${slope.toFixed(4)})`,
    Math.abs(capMidY(SP.finCapR, SP) - (SP.finColTop - SP.capT * Math.hypot(1, slope) / 2)) < 1e-9
    && Math.abs(capMidY(SP.holeR, SP) - (SP.tipY - SP.capT * Math.hypot(1, slope) / 2)) < 1e-9)
  T('구멍 안은 중립면을 수평 연장(클램프) — 특례로 tipY를 주면 림 윗면이 도로 안이 된다',
    Math.abs(capMidY(0, SP) - capMidY(SP.holeR, SP)) < 1e-12 && capMidY(0, SP) < SP.tipY)
  //  한 자리에서 뒤집힘 — 갓 살 두께를 가로지르면 판정이 갈린다(반증의 요체)
  const capOut = [SP.holeR, SP.tipY, 0], capIn = [SP.holeR, capMidY(SP.holeR, SP) - 0.05, 0]
  T('갓 림: 바깥면(하늘) = 밖 ↔ 안면(우물) = 안 — 같은 반경에서 두께를 가로지르며 갈린다',
    !zoneAInterior(capOut, SP) && zoneAInterior(capIn, SP))
  //  실기하 전수: 갓 중립면 **위**에 있는 정점은 하나도 안이 아니다
  {
    const gg = (await import('./spireGeometry.js')).buildSpire()
    const PP = gg.attributes.position
    let above = 0, bad = 0
    for (let i = 0; i < PP.count; i++) {
      const x = PP.getX(i), y = PP.getY(i), z = PP.getZ(i)
      if (y <= SP.yT) continue
      const r = Math.hypot(x, z)
      if (y <= capMidY(r, SP) + 1e-6) continue
      above++
      if (zoneAInterior([x - ROOM_CX, y, z], SP)) bad++
    }
    T(`[실기하] 갓 중립면 위 정점 ${above}기 중 '안' 판정 ${bad}기 = 0 (꼭지 바깥이 검어지지 않는다)`,
      above > 0 && bad === 0)
  }
  T(`노브 위생 — BAKE_TIP_CAP_ON(${BAKE_TIP_CAP_ON}) 불리언 · ⛔false = ★178 체제(반경만) 보존계`,
    typeof BAKE_TIP_CAP_ON === 'boolean')

  //  O-5. ★180 디스크 트인 틈 · ★181 상호반사 근사
  const DD = (await import('./discGeometry.js')).discSpec()
  const ZB2 = zoneABakeSpec()
  T(`디스크는 C자다 — 살 ${(DD.sweep * 180 / Math.PI).toFixed(1)}° + 트인 틈 ${(DD.gap * 180 / Math.PI).toFixed(1)}° = 360°`,
    DD.gap > 1e-3 && Math.abs(DD.sweep + DD.gap - Math.PI * 2) < 1e-9)
  //  표본당 면적이 두 공급지에서 같아야 단순 평균이 참 조사량에 비례한다(밀도 = 가중치)
  {
    const aPer = Math.PI * DISC_HOLE_R * DISC_HOLE_R / BAKE_N
    const aGap = (DD.gap / 2) * (DD.rOut * DD.rOut - DD.rIn * DD.rIn)
    const nGap = Math.max(1, Math.round(aGap / aPer))
    T(`하절 표본 = 구멍 ${BAKE_N} + 틈 ${nGap} (면적비 배분 — 좁은 구멍의 과대평가 방지)`,
      ZB2.lower.samples.length === (BAKE_DISC_GAP_ON ? BAKE_N + nGap : BAKE_N))
    T('틈 표본이 전부 고리 안(rIn~rOut)이고 디스크 밑면 높이에 있다',
      ZB2.lower.samples.slice(BAKE_N).every((s) => {
        const r = Math.hypot(s.p[0], s.p[2])
        return r >= DD.rIn - 1e-6 && r <= DD.rOut + 1e-6 && Math.abs(s.p[1] - DISC_Y_LO) < 1e-9
      }))
  }
  //  ★181 — 항등·단조·국소성
  const wallP = [63, 70, 0], wallN = [-1, 0, 0]
  const e0 = (p, n, sm) => bakeIrradianceAt(p, n, sm, { wrap: 0, amb: 0 })
  T('wrap=0·amb=0이면 ★176 원형 공식과 항등(보존계가 식 차원에서 성립)',
    Math.abs(e0([0, ROOM_FLOOR_Y, 0], [0, 1, 0], ZB2.lower.samples)
      - bakeIrradianceAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], ZB2.lower.samples, { wrap: 0, amb: 0 })) < 1e-15
    && e0(wallP, wallN, ZB2.lower.samples) > 0)
  //  스치는 면은 오르고, 정면으로 받는 면은 (상대적으로) 안 눌린다 — 국소성의 증명
  {
    const graze = [10, 110, 0], grazeN = [-1, 0, 0]           // 우물 안 수직면(챌면 대역)
    const face = [0, DISC_Y_HI, 0], faceN = [0, 1, 0]         // 축상 착지점(정면 수신)
    const rel = (p, n, w, a) => bakeIrradianceAt(p, n, ZB2.upper.samples, { wrap: w, amb: a })
      / bakeIrradianceAt(face, faceN, ZB2.upper.samples, { wrap: w, amb: a })
    const g0 = rel(graze, grazeN, 0, 0), g1 = rel(graze, grazeN, BAKE_WRAP, BAKE_AMB)
    T(`스치는 면의 상대 조사량이 오른다 (${g0.toExponential(2)} → ${g1.toExponential(2)}) — 칠흑 탈출의 근거`,
      BAKE_WRAP + BAKE_AMB > 0 ? g1 > g0 * 1.5 : true)
    {
    //  ★197 감마가 절마다 갈렸다 — 두 기준점은 각자의 감마로 재야 한다(상절 = 착지점 · 하절 = 방 바닥)
    const refUp = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(1, BAKE_TONE, BAKE_GAMMA_UP)
    const refLo = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(1, BAKE_TONE, BAKE_GAMMA)
    T('두 절의 축상 착지점은 정의상 기준점(t=1)이므로 각 절의 toneCurve(1) 자리 (기준이 함께 움직인다)',
      Math.abs(zoneAShadeAt(face, faceN, ZB2) - refUp) < 1e-9
      && Math.abs(zoneAShadeAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], ZB2) - refLo) < 1e-9)
  }
  }
  //  아래 보는 면은 amb만이 닿는다 — 두 항의 역할이 실제로 갈리는가(공허 방지)
  {
    const down = [10, 110, 0], downN = [0, -1, 0]
    const wOnly = bakeIrradianceAt(down, downN, ZB2.upper.samples, { wrap: 0.8, amb: 0 })
    const aOnly = bakeIrradianceAt(down, downN, ZB2.upper.samples, { wrap: 0, amb: 0.05 })
    T(`아래 보는 면: wrap만이면 ${wOnly.toExponential(1)}(=0) · amb가 있으면 ${aOnly.toExponential(1)}(>0) — 두 노브의 역할이 갈린다`,
      wOnly === 0 && aOnly > 0)
  }
  //  배선 — 기본 인자가 **상수를 읽는가**(값 단언이 아니다: wrap·amb는 FLOOR·GAMMA와 같은 튜닝 노브라
  //   값을 못 박지 않는다. 물어야 할 것은 "0으로 내리면 실제로 꺼지는가" = 파이프라인이 상수를 통과시키는가다)
  {
    const dp = [10, 110, 0], dn = [0, -1, 0]
    const live = bakeIrradianceAt(dp, dn, ZB2.upper.samples)
    const off = bakeIrradianceAt(dp, dn, ZB2.upper.samples, { wrap: 0, amb: 0 })
    T('산 배선 — 기본 인자가 상수를 읽는다(아래 보는 면에서 amb 유무가 정확히 갈린다)',
      (BAKE_AMB > 0) === (live > off))
  }
  //  O-6. ★183 2차 베이크 — 반사 공급지 + 톤 곡선
  {
    //  곡선 성질 — 사진2의 t=3.7이 clip에선 1로 잘리고 soft에선 계조가 남는다(증상의 재현과 해소를 한 항에)
    T(`톤 곡선: clip은 t=1과 t=3.7을 못 가른다(둘 다 1) · soft는 가른다(${toneCurve(1, 'soft', 1).toFixed(3)} < ${toneCurve(3.7, 'soft', 1).toFixed(3)} < 1)`,
      toneCurve(1, 'clip', 1) === 1 && toneCurve(3.7, 'clip', 1) === 1
      && toneCurve(1, 'soft', 1) < toneCurve(3.7, 'soft', 1) && toneCurve(3.7, 'soft', 1) < 1)
    T('clip 항등 — toneCurve(t,clip,γ) = min(1,t)^γ (★176 곡선 보존계)',
      [0.2, 0.7, 1, 2.5].every((t) => Math.abs(toneCurve(t, 'clip', BAKE_GAMMA) - Math.pow(Math.min(1, t), BAKE_GAMMA)) < 1e-15))
    //  반사 공급지 — 위로 발광 · 자기 평면 아래는 자동 0(cs 검사)
    T('반사 공급지는 전부 위로 발광(sn=[0,1,0]) — 하절 바닥·틈 투영 + 상절 디스크 살',
      ZB2.lower.bounce.every((x) => x.n[1] === 1) && ZB2.upper.bounce.every((x) => x.n[1] === 1)
      && ZB2.upper.bounce.length > 0 && ZB2.lower.bounce.length > 0)
    T('반사면 아래의 점에는 반사가 닿지 않는다(발광 반구 성질 — 차폐 없이도 아래로 새지 않음)',
      bakeIrradianceAt([0, ROOM_FLOOR_Y - 5, 0], [0, 1, 0], ZB2.lower.bounce) === 0)
    //  기계 실효(공허 방지) — 계단 챌면 대역의 수직면에 반사 E가 실제로 든다(노브 무관·집합 자체를 문다)
    const sideP = [11, 105, 0], sideN = [-1, 0, 0]
    const eB = bakeIrradianceAt(sideP, sideN, ZB2.upper.bounce)
    T(`반사 집합이 수직면(챌면 대역)에 실제로 조사량을 준다 (E=${eB.toExponential(2)} > 0) — ★176 직사는 여기서 ≈0이었다`,
      eB > 0)
    //  배선 — BOUNCE 노브가 산 파이프라인을 통과하는가([126]과 같은 어법 · 값 단언 아님)
    const dOnly = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(bakeIrradianceAt(sideP, sideN, ZB2.upper.samples) / ZB2.upper.eRef)
    T('산 배선 — (BAKE_BOUNCE>0) ⟺ 챌면 shade가 직사 단독 계산보다 밝다',
      (BAKE_BOUNCE > 0) === (zoneAShadeAt(sideP, sideN, ZB2) > dOnly + 1e-12))
    T(`노브 위생 — BAKE_BOUNCE(${BAKE_BOUNCE}) ∈ [0,2] · BAKE_TONE('${BAKE_TONE}') ∈ {clip,soft}`,
      Number.isFinite(BAKE_BOUNCE) && BAKE_BOUNCE >= 0 && BAKE_BOUNCE <= 2 && ['clip', 'soft'].includes(BAKE_TONE))
  }
  //  O-8. ★185 인스턴스 베이크 + 디스크 개구 절 배정
  {
    const DD2 = (await import('./discGeometry.js')).discSpec()
    const TAU = Math.PI * 2, ZB3 = zoneABakeSpec()
    const midGap = DD2.wA + DD2.gap / 2, midSolid = DD2.wB + DD2.sweep / 2
    const rr = (DD2.rIn + DD2.rOut) / 2, yBand = (DISC_Y_LO + ZB3.splitY) / 2   // 디스크 밑면~splitY 사이
    const pGap = [rr * Math.cos(midGap), yBand, rr * Math.sin(midGap)]
    const pSolid = [rr * Math.cos(midSolid), yBand, rr * Math.sin(midSolid)]
    //  같은 높이·같은 반경에서 **방위만** 다르다 — 개구 안이면 상절, 살 아래면 하절(치환으로 뒤집히는 짝)
    T('절 배정: 같은 높이·반경에서 틈 위 = 상절 ↔ 살 아래 = 하절 (방위만으로 갈린다)',
      zoneASegOf(pGap, ZB3) === ZB3.upper && zoneASegOf(pSolid, ZB3) === ZB3.lower)
    T('디스크 밑면보다 아래는 개구 안이라도 하절(방이다 — 규칙이 무한정 번지지 않는다)',
      zoneASegOf([pGap[0], DISC_Y_LO - 0.5, pGap[2]], ZB3) === ZB3.lower)
    T('중앙 구멍(r<rIn)도 상절 — 빛우물이 그대로 열린 자리',
      zoneASegOf([0, yBand, 0], ZB3) === ZB3.upper)
    //  실효: 개구 안의 점이 칠흑(FLOOR)을 벗어난다 — 구 규칙에선 하절 개구를 등져 E=0이었다
    const sGap = zoneAShadeAt(pGap, [0, 1, 0], ZB3)
    T(`틈 위 점이 칠흑을 벗어난다 (shade ${sGap.toFixed(3)} > FLOOR ${BAKE_FLOOR}) — 구 규칙에선 아래로 발광하는 개구를 등져 0이었다`,
      sGap > BAKE_FLOOR + 1e-6)
    //  배선 — 인스턴스 분기
    const rs = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')
    T('베이크 순회가 인스턴스 부재를 인스턴스 단위 색으로 굽는다(setColorAt · instanceColor 갱신)',
      /o\.isInstancedMesh/.test(rs) && /setColorAt\(/.test(rs) && /instanceColor\.needsUpdate = true/.test(rs))
    T('인스턴스 베이크 게이트 = BAKE_INST_ON (⛔false = 구 체제: isInstancedMesh 통째 제외)',
      /if \(!BAKE_INST_ON \|\| !o\.instanceMatrix\) return/.test(rs))
    T(`노브 위생 — BAKE_INST_ON(${BAKE_INST_ON})·BAKE_DISC_OPEN_SEG(${BAKE_DISC_OPEN_SEG}) 불리언`,
      typeof BAKE_INST_ON === 'boolean' && typeof BAKE_DISC_OPEN_SEG === 'boolean')
  }

  //  O-7. ★184 부재 베이크 하한(미학 제어 — 물리 한계 실측: 상절 챌·측면 t≈0.034 천장)
  {
    const roomSrc3 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf-8')
    T('베이크 루프가 부재 하한(userData.bakeMin)을 존중한다',
      /if \(o\.userData\.bakeMin > s\) s = o\.userData\.bakeMin/.test(roomSrc3))
    T('첨탑나선(계단·난간)에 bakeMin = BAKE_STAIR_MIN 태그가 실재한다',
      (roomSrc3.match(/bakeMin: BAKE_STAIR_MIN/g) || []).length >= 2)
    T(`노브 위생 — BAKE_STAIR_MIN(${BAKE_STAIR_MIN}) ∈ [0,1] · ⛔0 = 무효(순수 물리 체제 보존계)`,
      Number.isFinite(BAKE_STAIR_MIN) && BAKE_STAIR_MIN >= 0 && BAKE_STAIR_MIN <= 1)
  }
  T(`노브 위생 — BAKE_WRAP(${BAKE_WRAP})·BAKE_AMB(${BAKE_AMB}) ∈ [0,1] 유한`,
    Number.isFinite(BAKE_WRAP) && BAKE_WRAP >= 0 && BAKE_WRAP <= 1
    && Number.isFinite(BAKE_AMB) && BAKE_AMB >= 0 && BAKE_AMB <= 1)
}


// ══════ P. ★188 D구획(드럼 홀) 베이크 — 공급지 = 갓 링 슬릿 ══════
//  성질을 문다(현재값 단언 없음 — 튜닝 노브는 자유롭게 움직여야 한다).
{
  console.log('\n── P. ★188 D구획 베이크(갓 링 슬릿 = 수직 원통 띠) ──')
  const D = zoneDBakeSpec()
  const S = D.slit
  const cx = COR_CX, up = [0, 1, 0]

  //  ⑴ 실기하 정합 — 슬릿이 갓 정본(gatCap)에서 파생되는가(손 수치 0)
  const g = gatCap()
  T(`슬릿 수직 구간 = gatCap 파생(절단면 ${g.cutY.toFixed(3)} → 리드 밑 ${g.lidY.toFixed(3)} · 높이 = GAT_SLIT ${GAT_SLIT})`,
    S.y0 === g.cutY && S.y1 === g.lidY && Math.abs((S.y1 - S.y0) - GAT_SLIT) < 1e-9)
  T(`슬릿 반경 = GAT_CROWN_R(${GAT_CROWN_R}) · 축 = 드럼 중심 COR_CX(${COR_CX})`,
    S.R === GAT_CROWN_R && S.cx === COR_CX)

  //  ⑵ 기둥 잠식 — ★175-j ⑶의 23.5%가 **재유도되는가**(문서값을 베끼지 않고 기하에서 나온다)
  const occ = (2 * S.half * GAT_POSTS) / (Math.PI * 2)
  const openTotal = S.arcs.reduce((t, a) => t + a.da, 0)
  T(`기둥 ${GAT_POSTS}기 잠식률 ${(occ * 100).toFixed(1)}% = 1 − 트인각합/2π(${(1 - openTotal / (Math.PI * 2)) * 100 > 0 ? ((1 - openTotal / (Math.PI * 2)) * 100).toFixed(1) : '?'}%) — 두 경로가 일치`,
    Math.abs(occ - (1 - openTotal / (Math.PI * 2))) < 1e-12 && occ > 0 && occ < 1)
  T(`트인 구간 ${S.arcs.length}개 = 기둥 수 · 서로 겹치지 않는다(기둥이 사이를 가른다)`,
    S.arcs.length === GAT_POSTS && S.arcs.every((a, i) => i === 0 || a.a0 >= S.arcs[i - 1].a0 + S.arcs[i - 1].da - 1e-12))
  //  ⚠방위 규약(규율 32 — ★185가 살 구간을 틈이라 부른 전례): 기둥 **중심**은 트인 구간 **밖**이어야 한다
  T('방위 규약 — 기둥 중심(i·step)이 어느 트인 구간에도 들어가지 않는다(살/틈 뒤집힘 가드)',
    Array.from({ length: GAT_POSTS }, (_, i) => i * S.step).every((t) =>
      S.arcs.every((a) => { const TAU = Math.PI * 2; const rel = (((t - a.a0) % TAU) + TAU) % TAU; return !(rel < a.da) })))

  //  ⑶ 개구는 **수직 띠**다 — ★176-b 예측(수평 고리) 정정의 falsifiable 증거
  const flatN = D.seg.polys.every((q) => Math.abs(q.n[1]) < 1e-12)
  const spans = D.seg.polys.every((q) => q.v.some((v) => v[1] === S.y0) && q.v.some((v) => v[1] === S.y1))
  T('개구 조각의 발광 법선이 전부 **수평**(y성분 0) — 수평 고리가 아니라 수직 띠임의 증거', flatN)
  T('개구 조각마다 y가 슬릿 상·하단을 모두 품는다(두께 0 고리가 아니다)', spans)
  T('발광 법선이 **안쪽**을 향한다(빛이 통 안으로 들어온다 — 방향 뒤집힘 가드)',
    D.seg.polys.every((q) => {
      const c = [(q.v[0][0] + q.v[1][0]) / 2 - S.cx, 0, (q.v[0][2] + q.v[1][2]) / 2]
      return q.n[0] * c[0] + q.n[2] * c[2] < 0
    }))

  //  ⑷ 도구 검증 — 폴리곤 seg 수렴(곡면→현 근사의 유일한 오차원)
  const eSeg = (k) => polysIrradiance([cx, 0, 0], up, cylinderBandPolys({ ...S, seg: k }))
  const e3 = eSeg(3), e24 = eSeg(24)
  T(`seg 수렴 — seg3 대비 seg24 편차 ${(Math.abs(e3 / e24 - 1) * 100).toFixed(3)}% < 1%(현 근사가 충분히 촘촘)`,
    Math.abs(e3 / e24 - 1) < 0.01)
  T('seg를 키우면 조사량이 단조 증가해 수렴(현이 호에 안쪽에서 접근)', eSeg(1) < eSeg(2) && eSeg(2) < e3 && e3 < e24)

  //  ⑸ 베이커 무변경의 증명 — D는 **생성기만** 갈아 끼웠다(★176 ⑴의 약속)
  const lmSrc = readFileSync(new URL('./lightingModel.js', import.meta.url), 'utf8')
  T('베이커 본체(bakeIrradianceAt·polyIrradiance)에 D구획 좌표가 한 글자도 없다 — 일반화 약속 유지',
    !/function bakeIrradianceAt[\s\S]*?\n}/.exec(lmSrc)[0].match(/GAT_|COR_C?X|CROWN/)
    && !/function polyIrradiance[\s\S]*?\n}/.exec(lmSrc)[0].match(/GAT_|CROWN/))

  //  ⑹ 정규화 — 기준점은 **크라운 문턱**이고, 거기서 shade 1이다(A의 '착지점'과 갈리는 지점)
  //  ⚠불변식은 **t=1**이지 shade=1이 아니다(★183 A절 개정과 같은 이유 — 'soft' 곡선은 t=1에서 0.632).
  //   이 항목은 처음에 shade=1을 물었다가 붉어졌고, 검사가 아니라 **검사를 쓴 쪽**이 틀렸음이 규명됐다.
  T(`기준점 = 크라운 통 밑동 축상(y ${S.baseY.toFixed(3)} = gatCap.baseY 파생)에서 t = 1(정규화 항등)`,
    Math.abs(D.eAt([cx, S.baseY, 0], up, D.seg) / D.seg.eRef - 1) < 1e-9)
  T('기준점 shade가 톤 곡선의 t=1 값과 정확히 일치(감마·바닥이 같은 공식을 통과한다)',
    Math.abs(zoneDShadeAt([cx, S.baseY, 0], up, D)
      - (BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(1, BAKE_TONE, BAKE_D_GAMMA))) < 1e-12)
  //  ⚠왜 바닥이 아닌가의 근거를 검사가 **재유도**한다(문서 서술을 베끼지 않는다)
  const eFloor = polysIrradiance([cx, D.floorY, 0], up, D.seg.polys)
  const eNear = polysIrradiance([cx, S.baseY, 0], up, D.seg.polys)
  T(`바닥 중앙은 축상 **최소**다(문턱 대비 ${(eNear / eFloor).toFixed(0)}배 어둡다) — 바닥을 1로 잡으면 상부가 포화한다`,
    eNear > eFloor * 10)

  //  ⑺ 단조성 — 개구에 가까울수록 밝다(★186이 A에서 잡은 근거리 붕괴가 D에 없음의 확인)
  const axis = [0, 40, 80, 120, 160, 190].map((y) => polysIrradiance([cx, y, 0], up, D.seg.polys))
  T('축상 조도가 높이에 대해 단조 증가(개구에 가까울수록 밝다 — 점 표본 붕괴 없음)',
    axis.every((e, i) => i === 0 || e > axis[i - 1]))

  //  ⑻ 내부 판정 — 세 대역(홀·양태·크라운 통)과 그 **밖**
  T('내부 판정: 홀 바닥 중앙·홀 중간·크라운 통 안 = 안',
    zoneDInterior([cx, 0, 0], D) && zoneDInterior([cx, 80, 0], D) && zoneDInterior([cx, 196, 0], D))
  //  ⚠'천장 위 허공'으로 잡았던 축상 표본은 **갓 양태 깔때기 안**이었다(coneR 113.9 ≫ 0) — 항목을 정정했다.
  //   깔때기는 천장에서 크라운으로 좁아지는 실공간이므로 그 안이 '안'인 것이 옳다.
  T('내부 판정: 슬릿 위(리드 밑)·드럼 벽 밖 = 밖',
    !zoneDInterior([cx, S.y0 + 1, 0], D) && !zoneDInterior([cx + COR_R + 5, 40, 0], D))
  //  ⚠**양태 대역은 축대칭이 아니다** — 천장이 빗면(ceilY)이라 +x로 갈수록 높아져, 같은 y가 다시 홀 대역이 된다
  //   (실측: y167에서 r0은 양태 · r50은 이미 홀). 처음엔 이걸 놓치고 천장+5의 먼 표본으로 경계를 물었다가
  //   붉어졌다 — 또 한 번 **검사를 쓴 쪽이 틀린** 경우다. 경계 표본은 천장이 밑동을 안 넘는 축 근처에서 잡는다.
  const yCone = S.baseY - GAT_SLIT                       // 밑동 바로 아래(파생 — 손 수치 0)
  const cR = D.coneR(yCone)
  T(`양태 깔때기는 경계에서 갈린다 — y${yCone.toFixed(1)}에서 coneR ${cR.toFixed(1)} 안쪽 = 안 · 바깥 = 밖`,
    zoneDInterior([cx + cR - 1, yCone, 0], D) && !zoneDInterior([cx + cR + 1, yCone, 0], D)
    && yCone > ceilY(cx + cR + 1))                       // ⚠두 표본이 실제로 양태 대역에 있음을 함께 문다(공허 방지)
  T('양태 깔때기가 위로 좁아진다 — coneR(천장) > coneR(밑동) = 크라운 반경',
    D.coneR(S.baseY) === S.R && D.coneR(ceilY(cx)) > S.R)

  //  ⑼ **실효성**(공허 가드 방지 — 규율: 켜도 아무것도 안 굽는 구현은 무효다)
  //   홀 안 실부재의 실좌표를 빌더에서 가져와 '안' 판정을 받는지 본다.
  const bl = incaBladesSpec()
  const incaPts = [{ x: bl.ncx, y: bl.cutY, z: 0 }]
  for (const b of bl.blades) if (b.steps) for (const st of b.steps) {
    const sm = (st.s0 + st.s1) / 2
    incaPts.push({ x: bl.ncx + sm * Math.cos(b.az), y: st.yTop, z: sm * Math.sin(b.az) })
  }
  const inCnt = incaPts.filter((q) => zoneDInterior([q.x, q.y, q.z], D)).length
  T(`실효성 — 잉카 계단 실좌표 ${incaPts.length}점 중 ${inCnt}점이 '안'(두께 0 셸을 빼도 구울 부재가 실재한다)`,
    inCnt > 0 && inCnt === incaPts.length)
  const incaShades = incaPts.slice(0, 40).map((q) => zoneDShadeAt([q.x, q.y, q.z], up, D))
  T(`실효성 — 그 부재들의 shade가 1이 아니다(실제로 어두워진다 · 표본 최대 ${Math.max(...incaShades).toFixed(3)})`,
    incaShades.every((v) => v >= BAKE_FLOOR - 1e-9 && v <= 1) && Math.max(...incaShades) < 0.999)

  //  ⑽ 두께 0 셸 제외 — 배선이 실제로 그 태그를 읽는가
  const corSrc = readFileSync(new URL('./Corridor.jsx', import.meta.url), 'utf8')
  T('배선이 두께 0 셸을 건너뛴다(BAKE_D_SHELL 게이트 + bakeShell 태그를 함께 읽는다)',
    /!BAKE_D_SHELL\s*&&\s*o\.userData\.bakeShell/.test(corSrc))
  T('드럼 벽·천장·박스 3종이 bakeShell로 태그돼 있다(태그 없는 셸이 남으면 밖이 어두워진다)',
    (corSrc.match(/userData=\{\{ bakeShell: true \}\}/g) || []).length >= 5)
  T('배선이 수학 정본을 임포트한다(사본 금지 — 이 검사가 무는 함수와 같은 것을 쓴다)',
    /import \{ zoneDBakeSpec, zoneDShadeAt, zoneDInterior \} from '\.\/lightingModel\.js'/.test(corSrc))
  T('D는 월드 좌표를 그대로 쓴다(방과 달리 평행이동 없음 — ROOM_CX 감산이 섞이면 공급지가 어긋난다)',
    !/const p = \[v\.x - ROOM_CX[\s\S]{0,200}zoneDInterior/.test(corSrc))

  //  ⑾ 노브 위생 · 킬스위치
  T(`노브 위생 — BAKE_D_GAMMA(${BAKE_D_GAMMA}) > 0 유한 · BAKE_D_SEG(${BAKE_D_SEG}) ≥ 1 정수`,
    Number.isFinite(BAKE_D_GAMMA) && BAKE_D_GAMMA > 0 && Number.isInteger(BAKE_D_SEG) && BAKE_D_SEG >= 1)
  T('⛔킬스위치 BAKE_D_ON — false면 명세 생성 자체를 안 한다(한 줄 복귀 · 화면 완전 동일)',
    /BAKE_D_ON \? zoneDBakeSpec\(\) : null/.test(corSrc) && /if \(!BAKE_D_ON \|\| !bakeD/.test(corSrc))
  T('D는 A의 FLOOR·TONE·BOUNCE·POLY_ON을 공유한다(갈라진 것은 감마 하나뿐 — 노브 위생)',
    /toneCurve\(E \/ D\.seg\.eRef, BAKE_TONE, BAKE_D_GAMMA\)/.test(lmSrc)
    && /BAKE_FLOOR \+ \(1 - BAKE_FLOOR\) \* toneCurve\(E \/ D\.seg\.eRef/.test(lmSrc))
}


// ══════ Q. ★189 빛기둥 실루엣 경계 제거(원뿔대 눈속임의 대가) ══════
{
  console.log('\n── Q. ★189 빛기둥 실루엣 facing ──')
  const slopes = shaftSlopes()

  //  ⑴ 도구 검증 — 닫힌 식이 원기둥/원뿔의 알려진 성질을 재현하는가
  T('원기둥(기울기 0)은 구 체제에서도 실루엣 facing = 0 — 경계가 원래 안 생긴다',
    shaftSilhouetteFacing({ slope: 0, dh: 13.8, dy: 40, axial: false }) === 0)
  T('구 체제 facing은 기울기에 대해 단조 증가 — **원뿔대가 곧 원인**임의 재유도',
    [0, 0.05, 0.1, 0.2, 0.4].map((k) => shaftSilhouetteFacing({ slope: k, dh: 13.8, dy: 40, axial: false }))
      .every((v, i, a) => i === 0 || v > a[i - 1]))
  T('구 체제 facing은 시선이 수평일 때(dy=0) 0이고 기울수록 커진다(고개를 들면 선이 진해진다)',
    shaftSilhouetteFacing({ slope: 0.16, dh: 13.8, dy: 0, axial: false }) === 0
    && shaftSilhouetteFacing({ slope: 0.16, dh: 13.8, dy: 80, axial: false })
     > shaftSilhouetteFacing({ slope: 0.16, dh: 13.8, dy: 20, axial: false }))

  //  ⑵ 신체제 = 항등적 0(기하·시점 무관) — 이것이 ★189의 주장 전부다
  const grid = []
  for (const k of [0, 0.05, 0.16, 0.4, 1.0]) for (const dy of [-50, 0, 30, 100]) for (const dh of [5, 13.8, 60])
    grid.push(shaftSilhouetteFacing({ slope: k, dh, dy, axial: true }))
  T(`신체제 실루엣 facing = 0 (기울기×시점 격자 ${grid.length}조합 전부) — 원뿔 기울기가 식에서 사라진다`,
    grid.every((v) => v === 0))

  //  ⑶ 실기하 — 구 체제에서 현도가 본 그 값이 실제로 재현되는가(증상 재현 = 반증 가능성)
  const camDh = 13.81 - ROOM_CX, camY = 100.77
  const old189 = slopes.map((sg) => shaftSilhouetteFacing({
    slope: sg.slope, dh: Math.abs(camDh), dy: camY - (sg.yA + sg.yB) / 2, axial: false }))
  T(`실기하 사슬 ${slopes.length}구간이 구 체제에서 전부 0이 아니다(실측 ${old189.map((v) => v.toFixed(3)).join(' · ')}) — 현도가 본 선`,
    old189.every((v) => v > 0.01))
  T('빛기둥 사슬의 기울기가 전부 0이 아니다(전 구간이 원뿔대 — 원기둥이면 애초에 문제가 없다)',
    slopes.length >= 2 && slopes.every((sg) => Math.abs(sg.slope) > 1e-6))
  T('기울기는 shaftNodes 실기하에서 유도된다(손 수치 0 — 마디를 옮기면 따라온다)',
    slopes.every((sg) => Math.abs(sg.slope - (sg.rA - sg.rB) / (sg.yA - sg.yB)) < 1e-12))

  //  ⑷ 셰이더 배선 — ⚠GLSL은 노드에서 못 돌린다(★174 교훈). 여기서 무는 것은 **배선**이지 화면이 아니다.
  const roomSrc189 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
  T('셰이더가 축 기준 반경방향 varying을 만든다(vNr = normalMatrix * normalize(vec3(position.x, 0, position.z)))',
    /vNr\s*=\s*normalMatrix\s*\*\s*normalize\(vec3\(position\.x,\s*0\.0,\s*position\.z\)\)/.test(roomSrc189))
  T('프래그먼트가 uAxial로 두 법선을 섞어 facing을 만든다(mix — 보존계가 한 값으로 열린다)',
    /mix\(normalize\(vN\),\s*normalize\(vNr\),\s*uAxial\)/.test(roomSrc189)
    && /float facing = abs\(dot\(nrm, normalize\(vV\)\)\)/.test(roomSrc189))
  T('uAxial uniform이 노브 SHAFT_EDGE_AXIAL에 실제로 물려 있다(하드코딩 1.0이 아니다)',
    /uAxial:\s*\{\s*value:\s*SHAFT_EDGE_AXIAL\s*\?\s*1\.0\s*:\s*0\.0\s*\}/.test(roomSrc189))
  T('헤일로는 같은 셰이더의 사본이다 — uAxial이 헤일로에도 함께 걸린다(한쪽만 고치면 헤일로에 선이 남는다)',
    /haloMat\s*=\s*useMemo\(\(\)\s*=>\s*\{\s*const m = shaftMat\.clone\(\)/.test(roomSrc189)
    && /m\.uniforms = THREE\.UniformsUtils\.clone\(shaftMat\.uniforms\)/.test(roomSrc189))
  T('★189는 **기하를 안 건드린다** — 사슬 빌더의 CylinderGeometry 인자가 그대로다(셰이더만 바뀌었다)',
    /new THREE\.CylinderGeometry\(rA, rB, yA - yB, 40, 1, true\)/.test(roomSrc189))

  //  ⑸ 노브 위생 · 킬스위치
  T(`노브 위생 — SHAFT_EDGE_AXIAL(${SHAFT_EDGE_AXIAL}) 불리언 · ⛔false = 구 체제(경계선 복귀 · 보존계)`,
    typeof SHAFT_EDGE_AXIAL === 'boolean')
  T('순수 함수의 기본 인자가 노브를 따른다(검사와 화면이 같은 체제를 본다)',
    shaftSilhouetteFacing({ slope: 0.16, dh: 13.8, dy: 40 })
      === shaftSilhouetteFacing({ slope: 0.16, dh: 13.8, dy: 40, axial: SHAFT_EDGE_AXIAL }))

  //  ── ★190 상단 페이드(현도가 가리킨 그 모서리) ──
  console.log('\n── Q-2. ★190 빛기둥 상단 페이드 ──')
  //  ⑴ 병의 정체 — 구 체제는 사슬 **꼭대기에서 알파가 최대**다(하단만 깃털이었다)
  T('⛔구 체제(topFade=0): vY=1에서 len이 최대 1.000 — 알파가 최대인 채 기하가 끝난다(= 모서리)',
    Math.abs(shaftLenCurve(1, 0) - 1) < 1e-12
    && [0.8, 0.9, 0.99].every((v) => shaftLenCurve(v, 0) < shaftLenCurve(1, 0)))
  T('구 체제도 **하단은** 깃털이다(vY=0에서 0) — 위아래 비대칭이 병의 정체였다',
    shaftLenCurve(0, 0) === 0)
  //  ⑵ 신체제 — 상단도 0으로 수렴
  //  ⚠**체제 무관 형태**로 쓴다(★183 A절 개정과 같은 처리): 노브를 0으로 돌린 보존계 스윕에서도 green이어야 한다.
  //   초판은 `shaftLenCurve(1) === 0`이라 신체제를 전제했고 `SHAFT_TOP_FADE=0` 스윕에서 붉어졌다 — 검사 쪽 결함.
  T('페이드가 켜지면 꼭대기가 녹고, 꺼지면 구 체제로 열린다(노브 ↔ 곡선 일관성 — 배선이 끊기면 붉어진다)',
    shaftLenCurve(1) === (SHAFT_TOP_FADE > 0 ? 0 : 1))
  T('페이드 폭 0.10에서 꼭대기 len = 0(값을 명시로 넘겨 체제와 무관하게 성질을 문다)',
    shaftLenCurve(1, 0.10) === 0)
  T('상단 페이드는 위쪽 끝에서만 듣는다(vY ≤ 1−topFade 구간은 구 체제와 항등 — 기둥 몸통 불변)',
    [0, 0.3, 0.6, 0.90].every((v) => Math.abs(shaftLenCurve(v, 0.10) - shaftLenCurve(v, 0)) < 1e-12))
  T('페이드 구간에서 단조 감소한다(계단이 아니라 깃털 — 새 경계선을 만들지 않는다)',
    [0.92, 0.95, 0.97, 0.99, 1.0].map((v) => shaftLenCurve(v, 0.10)).every((v, i, a) => i === 0 || v < a[i - 1]))
  T('폭을 넓히면 더 일찍 녹는다(0.06 < 0.10 < 0.18에서 같은 높이의 len이 단조 감소 — 노브가 실제로 듣는다)',
    shaftLenCurve(0.96, 0.06) > shaftLenCurve(0.96, 0.10) && shaftLenCurve(0.96, 0.10) > shaftLenCurve(0.96, 0.18))
  //  ⑶ 배선 · 노브 위생
  T('셰이더가 상단 페이드 항을 len에 곱한다(uTopFade > 0일 때만 — 0이면 구 체제로 열린다)',
    /float top = uTopFade > 0\.0 \? 1\.0 - smoothstep\(1\.0 - uTopFade, 1\.0, vY\) : 1\.0/.test(roomSrc189)
    && /float len = smoothstep\(0\.0, 0\.18, vY\) \* \(0\.30 \+ 0\.70 \* vY\) \* top/.test(roomSrc189))
  T('uTopFade uniform이 노브 SHAFT_TOP_FADE에 물려 있다(하드코딩 아님)',
    /uTopFade:\s*\{\s*value:\s*SHAFT_TOP_FADE\s*\}/.test(roomSrc189))
  T(`노브 위생 — SHAFT_TOP_FADE(${SHAFT_TOP_FADE}) ∈ [0,1) 유한 · ⛔0 = 구 체제(보존계)`,
    Number.isFinite(SHAFT_TOP_FADE) && SHAFT_TOP_FADE >= 0 && SHAFT_TOP_FADE < 1)
  T('★190도 기하를 안 건드린다 — 사슬 uv 리맵(★175-g)이 그대로다(vY = 사슬 전체 비율이어야 꼭대기가 하나다)',
    /uv\.setY\(k, \(wy - yBot\) \/ span\)/.test(roomSrc189))
}


// ══════ R. ★191 해석적 입체각 — 죽어 있던 wrap·amb 복원 ══════
{
  console.log('\n── R. ★191 입체각(wrap·amb 실효성) ──')
  const Z = zoneABakeSpec()
  const up = [0, 1, 0]

  //  ⑴ 도구 검증 — 원판 축상 입체각 폐형해 Ω = 2π(1 − h/√(h²+R²)) 대조(★186이 조사량에 한 것과 같은 방식)
  const R0 = 6, cY = 100
  const dp = diskPolys({ c: [0, cY, 0], r: R0, sn: [0, -1, 0], seg: 64 })
  const errs = [1, 3, 10, 30, 100].map((h) => {
    const O = polysSolidAngle([0, cY - h, 0], dp)
    return Math.abs(O / (2 * Math.PI * (1 - h / Math.hypot(h, R0))) - 1)
  })
  T(`입체각이 원판 폐형해와 일치(최대 오차 ${(Math.max(...errs) * 100).toFixed(3)}% — 원을 64각형으로 근사한 몫)`,
    Math.max(...errs) < 0.005)
  T('개구에 붙을수록 입체각이 2π로 수렴한다(반구 전체가 개구로 덮인다)',
    polysSolidAngle([0, cY - 0.05, 0], dp) > 6.0 && polysSolidAngle([0, cY - 0.05, 0], dp) <= 2 * Math.PI + 1e-9)
  T('개구 뒤(발광 반구 밖)에서는 입체각 0 — polyIrradiance와 **같은 규약**',
    polysSolidAngle([0, cY + 5, 0], dp) === 0)
  T('거리가 멀수록 입체각은 단조 감소',
    [1, 3, 10, 30].map((h) => polysSolidAngle([0, cY - h, 0], dp)).every((v, i, a) => i === 0 || v < a[i - 1]))

  //  ⑵ 보존계 항등 — wrap=amb=0이면 polysIrradiance와 **한 글자도 안 달라진다**
  const pv = [7, 120, 0]
  T('wrap=0·amb=0에서 polysIrradianceW ≡ polysIrradiance(보존계가 정확히 열린다)',
    [[pv, [1, 0, 0]], [pv, up], [[-30, 70, 0], [1, 0, 0]]].every(([q, nn]) =>
      polysIrradianceW(q, nn, Z.upper.polys, { wrap: 0, amb: 0 }) === polysIrradiance(q, nn, Z.upper.polys)))

  //  ⑶ ★죽은 노브였음의 재현 — **이 항이 ★191의 존재 이유다**(공허참 방지)
  //   ⛔★186~★190 동안 wrap은 해석 경로에 안 넘어가 무효였다. 검사 [152]는 노브 위생만 물어 못 잡았다.
  T('wrap이 실제로 조사량을 바꾼다 — 수직면에서 wrap>0이 wrap=0보다 크다(무효 배선이면 같아진다)',
    polysIrradianceW(pv, [1, 0, 0], Z.upper.polys, { wrap: 0.5, amb: 0 })
      > polysIrradianceW(pv, [1, 0, 0], Z.upper.polys, { wrap: 0, amb: 0 }))
  T('amb도 실제로 듣는다(코사인이 죽은 면에 닿는 유일한 항)',
    polysIrradianceW(pv, [1, 0, 0], Z.upper.polys, { wrap: 0, amb: 0.1 })
      > polysIrradianceW(pv, [1, 0, 0], Z.upper.polys, { wrap: 0, amb: 0 }))
  T('★배선 실효성 — 베이크 명세의 eAt가 wrap 판을 쓴다(현행 노브에서 수직면 shade가 FLOOR를 벗어난다)',
    BAKE_WRAP <= 0 || zoneAShadeAt(pv, [1, 0, 0], Z) > BAKE_FLOOR + 1e-6)

  //  ⑷ 국소성 — 수직면만 들고 수평면은 안 건드린다(★181이 주장한 성질)
  const wOf = (nn, w) => {
    const seg = zoneASegOf(pv, Z)
    const e = polysIrradianceW(pv, nn, seg.polys, { wrap: w, amb: 0 }) + BAKE_BOUNCE * polysIrradiance(pv, nn, seg.bouncePolys)
    const rp = [0, DISC_Y_HI, 0]
    const eR = polysIrradianceW(rp, up, seg.polys, { wrap: w, amb: 0 }) + BAKE_BOUNCE * polysIrradiance(rp, up, seg.bouncePolys)
    return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(e / eR, BAKE_TONE, BAKE_GAMMA_UP)   // ★197 상절
  }
  T(`국소성 — wrap을 0→0.5로 올려도 **윗면**은 거의 안 변한다(Δ ${Math.abs(wOf(up, 0.5) - wOf(up, 0)).toFixed(4)} < 0.02)`,
    Math.abs(wOf(up, 0.5) - wOf(up, 0)) < 0.02)
  T(`효력 — 같은 변경이 **옆면**은 실제로 든다(${wOf([1, 0, 0], 0).toFixed(3)} → ${wOf([1, 0, 0], 0.5).toFixed(3)})`,
    wOf([1, 0, 0], 0.5) > wOf([1, 0, 0], 0) + 0.05)
  T('wrap이 커질수록 옆면이 단조 상승(노브가 방향을 갖는다)',
    [0, 0.2, 0.5, 0.8].map((w) => wOf([1, 0, 0], w)).every((v, i, a) => i === 0 || v > a[i - 1]))

  //  ⑸ ⚠wrap·amb는 **직사에만** 건다 — 반사에 걸면 폭주한다(실측 0.030 → 0.952)
  const lmSrcW = readFileSync(new URL('./lightingModel.js', import.meta.url), 'utf8')
  T('eAt가 직사에만 wrap 판을 쓰고 반사는 원식이다(이중 계산 금지 · 기준점 동일평면 폭주 방지)',
    /polysIrradianceW\(p, n, seg\.polys\) \+ BAKE_BOUNCE \* polysIrradiance\(p, n, seg\.bouncePolys\)/.test(lmSrcW)
    && !/BAKE_BOUNCE \* polysIrradianceW/.test(lmSrcW))
  T('상절 기준점이 반사면과 같은 평면에 앉아 반사를 못 받는다(폭주의 구조적 원인 — 상시 감시)',
    polysIrradiance([0, DISC_Y_HI, 0], up, Z.upper.bouncePolys) === 0)

  //  ⑹ 노브 위생
  T(`노브 위생 — BAKE_WRAP(${BAKE_WRAP})·BAKE_AMB(${BAKE_AMB}) ∈ [0,1] 유한 · ⛔둘 다 0 = ★176 원형(보존계)`,
    Number.isFinite(BAKE_WRAP) && BAKE_WRAP >= 0 && BAKE_WRAP <= 1
    && Number.isFinite(BAKE_AMB) && BAKE_AMB >= 0 && BAKE_AMB <= 1)
}


// ══════ S. ★192 우물 안벽 3차 광원 — 층별 세기 분포 ══════
{
  console.log('\n── S. ★192 우물 안벽(층별 3차 광원) ──')
  //  ⚠체제 항(⑷~⑺의 shade·eAt 항)은 ⛔BAKE_POLY_ON=false(점 표본 보존계)에서 비활성 — 우물 항은 해석 경로 전용이다(규율 13').
  const Z = zoneABakeSpec()
  const up = [0, 1, 0]
  const S1 = spireSpec(), D1 = discSpec192()
  //  ⚠검사 대상 판은 **독립 생성**한다 — 기본 스펙의 wellPolys는 ⛔BAKE_WELL=0 보존계에서 빈 배열이라
  //   (스펙이 판 자체를 안 만든다) 스펙 판을 들여다보면 보존계 스윕이 깨진다(규율 13' 실측).
  const W = wellWallBandPolys({ directPolys: Z.upper.polys, bouncePolys: Z.upper.bouncePolys,
    refP: [0, DISC_Y_HI, 0], refN: [0, 1, 0] })
  T('스펙 배선 = 같은 생성기(BAKE_WELL>0일 때 스펙 판과 독립 생성 판의 가중치가 일치 · 0이면 판 없음이 규약)',
    BAKE_WELL > 0
      ? Z.upper.wellPolys.length === W.length && Z.upper.wellPolys.every((q, i) => q.w === W[i].w)
      : Z.upper.wellPolys.length === 0)

  //  ⑴ 노브 위생 · 대역 피복(파생 — 손 수치 0)
  T(`노브 위생 — BAKE_WELL(${BAKE_WELL}) ≥ 0 유한 · BANDS(${BAKE_WELL_BANDS}) ≥ 2 정수 · SEG(${BAKE_WELL_SEG}) ≥ 4 정수 · ⛔0 = ★191 항등`,
    Number.isFinite(BAKE_WELL) && BAKE_WELL >= 0
    && Number.isInteger(BAKE_WELL_BANDS) && BAKE_WELL_BANDS >= 2
    && Number.isInteger(BAKE_WELL_SEG) && BAKE_WELL_SEG >= 4)
  const ys = W.map((q) => [Math.min(q.v[0][1], q.v[2][1]), Math.max(q.v[0][1], q.v[2][1])])
  const yMin = Math.min(...ys.map((a) => a[0])), yMax = Math.max(...ys.map((a) => a[1]))
  T('대역 하단 = 디스크 상면 · 상단 = 벽 꼭대기(전부 파생 — 그 아래 벽은 디스크 관입 봉합이라 발광면이 아니다)',
    Math.abs(yMin - D1.yTop) < 1e-9 && Math.abs(yMax - S1.yT) < 1e-9)
  const bandYs = [...new Set(ys.map((a) => a[0].toFixed(9)))].map(Number).sort((a, b) => a - b)
  T(`층이 빈틈없이 잇닿는다(${BAKE_WELL_BANDS}층 — 층 하단들이 등간격 격자)`,
    bandYs.length === BAKE_WELL_BANDS
    && bandYs.every((y, i) => Math.abs(y - (D1.yTop + (i / BAKE_WELL_BANDS) * (S1.yT - D1.yTop))) < 1e-9))

  //  ⑵ 발광 법선 = 안쪽 수평(D 링 슬릿과 같은 규약 — 뒤집히면 우물 밖으로 발광)
  T('모든 조각의 법선이 수평·안쪽(축을 향한다)', W.every((q) => {
    const m = q.v.reduce((t, p) => [t[0] + p[0] / 4, t[1] + p[1] / 4, t[2] + p[2] / 4], [0, 0, 0])
    return q.n[1] === 0 && (q.n[0] * m[0] + q.n[2] * m[2]) < -1e-9
  }))

  //  ⑶ 가중치 2경로 재유도 — 검사가 같은 정의를 **독립 구현**으로 다시 세운다(배선 오류 적발:
  //   반경을 wellWallR로 바꾸거나, 반사를 빼거나, 방위 평균을 깨면 여기서 어긋난다)
  //  ★196: 상절 재유도는 **상절 계수**(BAKE_BOUNCE_UP)를 써야 한다 — 하절 계수로 재면 절 분리 후 어긋난다(실제 red로 적발)
  const recv2 = (p, n) => polysIrradiance(p, n, Z.upper.polys) + BAKE_BOUNCE_UP * polysIrradiance(p, n, Z.upper.bouncePolys)
  const wSpec = []
  for (let i = 0; i < W.length; i += BAKE_WELL_SEG) wSpec.push(W[i].w)
  const wRe = []
  for (let k = 0; k < BAKE_WELL_BANDS; k++) {
    const yc = D1.yTop + ((k + 0.5) / BAKE_WELL_BANDS) * (S1.yT - D1.yTop)
    const r = wellInnerClear(yc, S1)
    const azs = [D1.wB + D1.sweep / 2, D1.wA + D1.gap / 2]
    wRe.push(azs.reduce((t, a) => t + recv2([r * Math.cos(a), yc, r * Math.sin(a)], [-Math.cos(a), 0, -Math.sin(a)]), 0) / azs.length)
  }
  T('층 가중치 = (그 층이 받는 직사+반사)의 방위 평균 — 재유도와 완전 일치(같은 데이터 규율)',
    wSpec.length === BAKE_WELL_BANDS && wSpec.every((w, k) => Math.abs(w - wRe[k]) < 1e-12 * Math.max(1, Math.abs(wRe[k]))))
  //  ⚠구판은 '최하층이 최대'를 물었다 — 그것은 BAKE_BOUNCE=0.25 체제에서만 참인 **그 시점 값**이었다
  //   (0.02에서는 꼭지 직사가 지배해 최상층이 최대로 뒤집힌다 — 2026.08.28 실측). 체제 무관한 성질은 U자,
  //   즉 **양 끝이 내부 골짜기보다 밝다**는 것뿐이다(아래 = 디스크 반사 · 위 = 꼭지 직사 · 가운데 = 둘 다 먼 곳).
  const wMin = Math.min(...wSpec), iMin = wSpec.indexOf(wMin)
  //  ⚠체제 조건: 아래 끝을 살리는 것은 **디스크 살 반사**다 — `BAKE_BOUNCE_UP=0`이면 U자가 아니라 단조(위만 밝다)가
  //   정답이고, 그 체제에서는 ★192 기제 자체가 무의미해진다(틈 끝면 상승 0 — [228]도 같은 게이트).
  T(`U자 프로파일 — 골짜기가 내부 층(${iMin + 1}/${wSpec.length})이고 양 끝이 그보다 밝다(아래 ${wSpec[0].toExponential(2)} · 위 ${wSpec[wSpec.length - 1].toExponential(2)} · 골 ${wMin.toExponential(2)})`,
    BAKE_BOUNCE_UP <= 0 || (iMin > 0 && iMin < wSpec.length - 1
    && wSpec[0] > wMin && wSpec[wSpec.length - 1] > wMin))

  //  ⑷ 비율 정규화 성질 — t = (t직반 + K·비율)/(1+K)
  const aMid = D1.wA + D1.gap / 2, rm = (D1.rIn + D1.rOut) / 2, aEnd = D1.wA + 0.01
  const pFace = [rm * Math.cos(aEnd), 100.4, rm * Math.sin(aEnd)], nFace = [-Math.sin(D1.wA), 0, Math.cos(D1.wA)]
  //  ⚠blendK:0 — S절은 ★192 기제의 격리 검증이다(표적점이 ★193 블렌드 대역 안이라 켜 두면 폐형 예측이 어긋난다)
  const shadeAt = (K, p, n) => zoneAShadeAt(p, n, zoneABakeSpec({ wellK: K, blendK: 0 }))
  T('★기준점 불변식 — 축상 착지점 t=1이 K와 무관하다(비율 정규화의 구조적 성질 · K 0↔2 비트 동일)',
    shadeAt(0, [0, DISC_Y_HI, 0], up) === shadeAt(2, [0, DISC_Y_HI, 0], up))
  T(`★실효성(공허 방지) — 틈 끝면이 실제로 든다(K0 ${shadeAt(0, pFace, nFace).toFixed(3)} → K0.5 ${shadeAt(0.5, pFace, nFace).toFixed(3)})`,
    //  ⚠상대 기준: 절대 폭(0.02)은 상절 감마에 달려 있다(★197에서 red — 감마 3이면 폭이 0.016으로 줄지만 비율은 그대로)
    !BAKE_POLY_ON || BAKE_BOUNCE_UP <= 0 || shadeAt(0.5, pFace, nFace) > shadeAt(0, pFace, nFace) * 1.2)
  T('노브가 방향을 갖는다 — K 0→0.2→0.5→1에서 틈 끝면 단조 상승',
    !BAKE_POLY_ON || [0, 0.2, 0.5, 1].map((K) => shadeAt(K, pFace, nFace)).every((v, i, a) => i === 0 || v > a[i - 1]))
  //  극한(K→∞) = 비율 지도: t → 우물(p)/우물(기준점)
  const wallP = polysIrradianceWtd(pFace, nFace, W), wallR = polysIrradianceWtd([0, DISC_Y_HI, 0], up, W)
  const limShade = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(wallP / wallR, BAKE_TONE, BAKE_GAMMA_UP)   // ★197 상절
  T(`극한 정직 — K=64에서 비율 지도에 수렴(상한 ${limShade.toFixed(3)} — 그 이상은 이 기제가 못 준다)`,
    !BAKE_POLY_ON || Math.abs(shadeAt(64, pFace, nFace) - limShade) < 0.01)

  //  ⑷+ 매개변수화 폐형 예측 — t = (t직반 + K·비율)/(1+K)를 검사가 **독립 계산**으로 예측한다.
  //   ⚠이 항의 존재 이유: 정규화(wellK·eRefDB/wallRef)를 소거해도 같은 함수족(K 재매개변수화 ×10⁵)이라
  //    위의 성질 항들이 전부 공허하게 통과한다(반증 실측). 노브 눈금의 **정의**를 물어야 잡힌다.
  const eDB = (p, n) => polysIrradianceW(p, n, Z.upper.polys) + BAKE_BOUNCE * polysIrradiance(p, n, Z.upper.bouncePolys)
  const eDBr = eDB([0, DISC_Y_HI, 0], up)
  const predict = (K, p, n) => {
    const t = (eDB(p, n) / eDBr + K * (polysIrradianceWtd(p, n, W) / wallR)) / (1 + K)
    return BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(t, BAKE_TONE, BAKE_GAMMA_UP)   // ★197 상절
  }
  T('★노브 눈금의 정의 — K = 기준점 조명에서 우물 몫. shade(K)가 폐형 예측과 일치(K 0.3·1에서 <1e-9)',
    !BAKE_POLY_ON || [0.3, 1].every((K) => Math.abs(shadeAt(K, pFace, nFace) - predict(K, pFace, nFace)) < 1e-9))

  //  ⑸ 국소성 — 하절(방)은 구조적으로 무접촉(wellPolys가 상절에만 배선)
  T('하절 3점(바닥·벽·중층)이 K 0↔2에서 비트 동일 — 방의 어둠은 안 풀린다',
    [[[5, ROOM_FLOOR_Y + 0.01, 3], up], [[14, 70, 2], [-1, 0, 0]], [[-10, 45, -8], up]]
      .every(([p, n]) => shadeAt(0, p, n) === shadeAt(2, p, n)))
  T('하절 명세에 우물 판이 없다(구조 확인 — 값 우연이 아니라 배선이 없다)',
    !Z.lower.wellPolys || Z.lower.wellPolys.length === 0)

  //  ⑹ 수렴 — 층·조각을 2배로 늘려도 결과가 안 움직인다(근사 오차가 격자 아래)
  const Wf = wellWallBandPolys({ directPolys: Z.upper.polys, bouncePolys: Z.upper.bouncePolys,
    refP: [0, DISC_Y_HI, 0], refN: up, bands: BAKE_WELL_BANDS * 2, seg: BAKE_WELL_SEG * 2 })
  const ratio = (Wx, p, n) => polysIrradianceWtd(p, n, Wx) / polysIrradianceWtd([0, DISC_Y_HI, 0], up, Wx)
  const rc = ratio(W, pFace, nFace), rf = ratio(Wf, pFace, nFace)
  //  ⚠체제 조건: 반사 소등(BAKE_BOUNCE_UP=0)이면 층 세기가 직사만 남아 하부가 거의 0 — 이산화 상대차가 커진다(분모 소실).
  T(`수렴 — 층×2·조각×2에서 비율 상대차 ${(Math.abs(rc - rf) / rf * 100).toFixed(2)}% < 2%`,
    BAKE_BOUNCE_UP <= 0 || Math.abs(rc - rf) / rf < 0.02)

  //  ⑺ 킬스위치 항등 — wellK=0의 eAt = ★191 합성 그대로(비트 동일)
  const Z0 = zoneABakeSpec({ wellK: 0 })
  const manual = (p, n, seg) => polysIrradianceW(p, n, seg.polys) + BAKE_BOUNCE * polysIrradiance(p, n, seg.bouncePolys)
  T('⛔wellK=0 항등 — eAt가 ★191 합성과 비트 동일(보존계가 정확히 열린다)',
    [[pFace, nFace], [[0, DISC_Y_HI, 0], up], [[7, 120, 0], [1, 0, 0]]]
      .every(([p, n]) => !BAKE_POLY_ON || Z0.eAt(p, n, Z0.upper) === manual(p, n, Z0.upper)))
}


// ══════ S-2. ★193 절 이음 블렌드 + 개구 허용오차 ══════
{
  console.log('\n── S-2. ★193 절 이음(블렌드·바코드) ──')
  const Z = zoneABakeSpec()
  const D2 = discSpec192(), up = [0, 1, 0]
  const azG = Math.atan2(0.3, 15.1)                                   // 현도 실증 좌표의 방위(틈 안)
  const pG = (y) => [15.1 * Math.cos(azG), y, 15.1 * Math.sin(azG)]
  const HB = Z.blendH

  //  ⑴ 노브 위생 · 대역 파생
  T(`노브 위생 — BAKE_SEG_BLEND(${BAKE_SEG_BLEND}) ≥ 0 유한 · ⛔0 = ★192 하드 경계(보존계)`,
    Number.isFinite(BAKE_SEG_BLEND) && BAKE_SEG_BLEND >= 0)
  T('블렌드 대역 = 디스크 두께 × 노브(파생 — 손 수치 0)',
    Math.abs(Z.blendH - BAKE_SEG_BLEND * (DISC_Y_HI - DISC_Y_LO)) < 1e-12)

  //  ⑵ 이음 연속(현도 실증 = 나선 최상단 하드 컷 1.000→0.373) — 개구 안 허구 평면에 반그늘
  T('허구 평면(DISC_Y_LO) 통과가 연속이다 — 틈 기둥 |Δshade| < 0.02',
    !BAKE_POLY_ON || BAKE_SEG_BLEND <= 0
    || Math.abs(zoneAShadeAt(pG(DISC_Y_LO - 1e-3), up, Z) - zoneAShadeAt(pG(DISC_Y_LO + 1e-3), up, Z)) < 0.02)
  const ysG = []
  for (let y = 98.7; y <= DISC_Y_LO + HB + 0.3; y += 0.1) ysG.push(zoneAShadeAt(pG(y), up, Z))
  const maxStep = Math.max(...ysG.map((v, i) => (i ? Math.abs(v - ysG[i - 1]) : 0)))
  T(`틈 기둥 전 구간(0.1 격자)이 매끄럽다 — 최대 인접 단차 ${maxStep.toFixed(3)} < 0.08`,
    !BAKE_POLY_ON || BAKE_SEG_BLEND <= 0 || maxStep < 0.08)
  //  ⚠**임계 개정(★206)**: 구판 '> 0.5'는 ★197 체제(상절 어두움)에서만 참인 **그 시점 값**이었다 —
  //   상절이 밝아지면 하절 1.000과의 낙차가 줄어 0.389가 되고(실측), 병이 그대로인데 검사가 빨개졌다.
  //   체제 무관한 성질은 **"눈에 보이는 단차가 남는다"**뿐이다 ⇒ 8비트 한 계단(1/255)의 4배를 임계로 쓴다.
  const cut0 = !BAKE_POLY_ON ? 0 : Math.abs(
    zoneAShadeAt(pG(DISC_Y_LO - 1e-3), up, zoneABakeSpec({ blendK: 0 }))
    - zoneAShadeAt(pG(DISC_Y_LO + 1e-3), up, zoneABakeSpec({ blendK: 0 })))
  T(`⛔blendK=0이 병을 그대로 재현한다(하드 컷 ${cut0.toFixed(3)} = 8비트 ${Math.round(cut0 * 255)}계단 — 현행 블렌드가 0으로 만드는 그 단차)`,
    !BAKE_POLY_ON || cut0 > 4 / 255)

  //  ⑶ 국소성 — 블렌드는 개구 안 대역만 만진다
  const azF = D2.wB + D2.sweep / 2                                    // 살 한가운데(비개구)
  const pF2 = [12 * Math.cos(azF), 101.5, 12 * Math.sin(azF)]
  const Zb0 = zoneABakeSpec({ blendK: 0 })
  T('살(비개구) 걷는면·방 바닥·대역 위 개구 점이 blendK 0↔현행에서 비트 동일',
    zoneAShadeAt(pF2, up, Z) === zoneAShadeAt(pF2, up, Zb0)
    && zoneAShadeAt([5, ROOM_FLOOR_Y + 0.01, 3], up, Z) === zoneAShadeAt([5, ROOM_FLOOR_Y + 0.01, 3], up, Zb0)
    && zoneAShadeAt(pG(DISC_Y_LO + HB + 0.1), up, Z) === zoneAShadeAt(pG(DISC_Y_LO + HB + 0.1), up, Zb0))

  //  ⑷ 바코드 소멸(현도 실증 2) — r=rIn 정확 위 정점 열의 절 교대 금지(허용오차 +1e-6)
  let flips = 0, prevSeg = null
  const ring = []
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const p = [D2.rIn * Math.cos(a), 100.4, D2.rIn * Math.sin(a)]
    const sg = zoneASegOf(p, Z)
    if (prevSeg !== null && sg !== prevSeg) flips++
    prevSeg = sg
    ring.push(zoneAShadeAt(p, [-Math.cos(a), 0, -Math.sin(a)], Z))
  }
  T('구멍 벽 정점 열(60방위)의 절 배정이 균일 — 인접 전환 0(⛔정확 비교 = 전환 22회 실측)', flips === 0)
  T(`구멍 벽 shade가 방위 균일 — 산포 ${(Math.max(...ring) - Math.min(...ring)).toFixed(4)} < 0.01`,
    !BAKE_POLY_ON || Math.max(...ring) - Math.min(...ring) < 0.01)

  //  ⑸ 개구 판정 = 단일 정본(zoneASegOf가 discOpenAt을 부른다 — 블렌드 조건과 사본 없이 공유)
  const lmSrc193 = readFileSync(new URL('./lightingModel.js', import.meta.url), 'utf8')
  T('절 배정 = discOpenAt(구멍+틈, 경계 포함) · 블렌드 = discGapInteriorAt(빈 공간 내부) — 판정 사본 없음',
    /pos\[1\] >= DISC_Y_LO && discOpenAt\(pos\)\) return Z\.upper/.test(lmSrc193)
    && /pos\[1\] < DISC_Y_LO \+ H && discGapInteriorAt\(pos\)/.test(lmSrc193)
    && /\|\| discGapAt\(pos\)/.test(lmSrc193))

  //  ⑹ ★194 — 블렌드가 개구 **경계 솔리드 면**에 새지 않는다(현도 실증: 끝면 전체가 램프로 칠해짐)
  const faces = [['틈 끝면 A', D2.wA, +1], ['틈 끝면 B', D2.wA + D2.gap, -1]]
  const faceRamp = faces.map(([, az, sg]) => {
    const nF = [-Math.sin(az) * sg, 0, Math.cos(az) * sg]
    const col = [DISC_Y_LO + 0.01, DISC_Y_LO + 0.6, DISC_Y_LO + 1.3, DISC_Y_HI - 0.01]
      .map((y) => zoneAShadeAt([12 * Math.cos(az), y, 12 * Math.sin(az)], nF, Z))
    return Math.max(...col) - Math.min(...col)
  })
  T(`틈 끝면 2장이 수직 램프를 안 입는다 — 높이 방향 폭 ${faceRamp.map((v) => v.toFixed(3)).join('/')} < 0.12(⛔블렌드 누출 시 0.8+)`,
    !BAKE_POLY_ON || BAKE_SEG_BLEND <= 0 || faceRamp.every((v) => v < 0.12))
  //  ⚠여유는 경계 **위** 정점만 걷어내야 한다 — 과대해지면 틈 가장자리 근처 빈 공간이 블렌드에서 빠져
  //   거기 하드 컷이 되살아난다(반증 ③이 이 항 없이는 공허 통과했다).
  const edgePts = [0.02, 0.05, 0.1].map((relv) => {
    const az = D2.wA + relv
    const q = (y) => [12 * Math.cos(az), y, 12 * Math.sin(az)]
    return Math.abs(zoneAShadeAt(q(DISC_Y_LO + 1e-3), up, Z) - zoneAShadeAt(q(DISC_Y_LO - 1e-3), up, Z))
  })
  T(`틈 가장자리 근처 빈 공간(rel 0.02~0.1)도 평면 통과 연속 — 최대 Δ ${Math.max(...edgePts).toFixed(4)} < 0.02`,
    !BAKE_POLY_ON || BAKE_SEG_BLEND <= 0 || Math.max(...edgePts) < 0.02)
  T('경계 솔리드는 블렌드 밖 · 틈 내부는 블렌드 안(판정 함수의 구조 — 값 우연이 아니다)',
    !discGapInteriorAt([12 * Math.cos(D2.wA), 100.4, 12 * Math.sin(D2.wA)])
    && !discGapInteriorAt([D2.rOut * Math.cos(D2.wA + D2.gap / 2), 100.4, D2.rOut * Math.sin(D2.wA + D2.gap / 2)])
    && !discGapInteriorAt([D2.rIn * Math.cos(D2.wA + D2.gap / 2), 100.4, D2.rIn * Math.sin(D2.wA + D2.gap / 2)])
    && discGapInteriorAt([15.1 * Math.cos(Math.atan2(0.31, 15.08)), 100.4, 15.1 * Math.sin(Math.atan2(0.31, 15.08))]))
  T('하절 몫은 평면 밑 클램프 점에서 잰다(위에서 그대로 재면 등 뒤 0 — 어둠을 섞는 병)',
    /shadeOf\(\[pos\[0\], DISC_Y_LO - 1e-3, pos\[2\]\], Z\.lower\)/.test(lmSrc193))
}


// ══════ S-3. ★195 벽 살 부재(문틀·테두리) 안쪽 향 면 ══════
{
  console.log('\n── S-3. ★195 벽 살 부재 베이크 ──')
  const SP = spireSpec(), rOutT = wellWallR(103, { spec: SP, forceSpire: true })
  const az = 0.7, cc = Math.cos(az), ss = Math.sin(az)
  const at = (r) => [r * cc, 103, r * ss]
  const nAz = [-ss, 0, cc], nUp = [0, 1, 0], nDn = [0, -1, 0], nOut = [cc, 0, ss], nIn = [-cc, 0, -ss]

  T(`노브 위생 — BAKE_WALL_FACE_ON(${BAKE_WALL_FACE_ON}) 불리언 · ⛔false = ★194 이전 거동(보존계)`,
    typeof BAKE_WALL_FACE_ON === 'boolean')

  //  ⑴ 살 대역에서 안쪽 향 면(방위·수평·안쪽)은 구획 안 — 문틀 옆면·상인방·디스크 윗면 테두리가 여기 산다
  const inBand = rOutT - SP.T / 4                                    // 구 판정선(rOut−T/2)과 벽 바깥면 사이
  T('살 대역의 안쪽 향 면 4종(방위·위·아래·안쪽)이 구획 안이다',
    !BAKE_WALL_FACE_ON || [nAz, nUp, nDn, nIn].every((n) => zoneAInterior(at(inBand), SP, n)))
  //  ⑵ 바깥 향 면(외벽)은 그대로 제외 — 밖에서 본 인상 불변(★177 원칙)
  T('살 대역의 바깥 향 면(외벽)은 구획 밖이다 — 밖에서 본 밝기 불변',
    !zoneAInterior(at(inBand), SP, nOut) && !zoneAInterior(at(rOutT), SP, nOut))
  //  ⑶ 벽 바깥면 너머는 법선과 무관하게 밖(대역이 벽 두께를 안 넘는다)
  T('벽 바깥면 너머는 법선과 무관하게 밖(대역 상한 = 벽 바깥면)',
    [nAz, nUp, nIn].every((n) => !zoneAInterior(at(rOutT + 0.05), SP, n)))
  //  ⑷ 구 판정선 안쪽은 법선 없이도 안(구 거동 보존 — 확장이 기존 판정을 안 뒤집는다)
  T('구 판정선 안쪽은 구 거동 그대로 안이다(확장이 기존 판정을 안 뒤집는다)',
    zoneAInterior(at(rOutT - SP.T / 2 - 0.05), SP) && zoneAInterior(at(rOutT - SP.T / 2 - 0.05), SP, nOut))
  //  ⑸ 법선을 안 주면 보수적으로 밖(인스턴스·분할 경로의 구 거동)
  T('법선 미제공 시 살 대역은 밖 — 인스턴스·분할 경로는 구 거동 그대로',
    !zoneAInterior(at(inBand), SP))
  //  ⑹ 실배선: Room.jsx가 법선을 판정에 넘긴다(안 넘기면 규칙이 죽는다 — 공허 방지)
  const roomSrc = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
  T('Room.jsx가 zoneAInterior에 법선을 넘긴다(정점 경로·인스턴스 경로 둘 다)',
    /zoneAInterior\(p, bakeZ\.spire, \[nm\.x, nm\.y, nm\.z\]\)/.test(roomSrc)
    && /zoneAInterior\(p, bakeZ\.spire, \[0, 1, 0\]\)/.test(roomSrc))
}


// ══════ S-4. ★196 반사 세기의 절 분리 — 방 고정 불변식 ══════
{
  console.log('\n── S-4. ★196 절별 반사 세기(방 고정) ──')
  const up = [0, 1, 0]
  //  방(하절) 표본 — 현도 지시: "방 내부 인상은 이제 고정". 상절 노브를 어떻게 밀어도 여기는 안 움직여야 한다.
  const ROOM = [
    [[0, ROOM_FLOOR_Y, 0], up], [[30, ROOM_FLOOR_Y + 0.01, 0], up],
    [[40, 60, 0], [-1, 0, 0]], [[30, 80, 0], [-1, 0, 0]],
    [[20, ROOM_CEIL_Y - 2, 0], [0, -1, 0]], [[25, 70, 0], [0, -1, 0]],
  ]
  const shadeUpK = (K, p, n) => zoneAShadeAt(p, n, zoneABakeSpec({ bounceUpK: K }))

  T(`노브 위생 — BAKE_BOUNCE_UP(${BAKE_BOUNCE_UP}) ≥ 0 유한 · ⛔BAKE_BOUNCE(${BAKE_BOUNCE})와 같으면 ★195 이전과 항등`,
    Number.isFinite(BAKE_BOUNCE_UP) && BAKE_BOUNCE_UP >= 0)
  //  ★핵심 불변식 — 방은 상절 노브에 대해 **비트 동일**
  T('★방(하절) 6표본이 상절 노브 0↔0.25↔현행에서 비트 동일 — 첨탑을 고쳐도 방은 안 움직인다',
    ROOM.every(([p, n]) => {
      const a = shadeUpK(0, p, n)
      return a === shadeUpK(0.25, p, n) && a === shadeUpK(BAKE_BOUNCE_UP, p, n)
    }))
  //  구조 확인 — 값 우연이 아니라 배선이 갈려 있다
  T('하절 계수 = BAKE_BOUNCE · 상절 계수 = BAKE_BOUNCE_UP(스펙에 실재)',
    zoneABakeSpec().lower.bounceK === BAKE_BOUNCE
    && zoneABakeSpec().upper.bounceK === BAKE_BOUNCE_UP
    && zoneABakeSpec({ bounceUpK: 0.07 }).upper.bounceK === 0.07
    && zoneABakeSpec({ bounceUpK: 0.07 }).lower.bounceK === BAKE_BOUNCE)
  //  실효성(공허 방지) — 상절은 실제로 듣는다
  T('★실효성 — 상절 노브가 첨탑 벽을 실제로 움직인다(0.25에서 포화 ↔ 0.002에서 계조)',
    !BAKE_POLY_ON || shadeUpK(0.25, [16.8 * Math.cos(0.9), 103, 16.8 * Math.sin(0.9)], [-Math.cos(0.9), 0, -Math.sin(0.9)])
      - shadeUpK(0.002, [16.8 * Math.cos(0.9), 103, 16.8 * Math.sin(0.9)], [-Math.cos(0.9), 0, -Math.sin(0.9)]) > 0.1)
  //  ⚠임계 0.1: ⛔BAKE_WELL=0 보존계에서도 성립해야 한다(우물 없으면 Δ 0.274 → 0.152 — 실측). 구 0.2는 그 체제를 놓쳤다.
  //  자기일관 — ★192 층 가중치 유도도 상절 계수를 쓴다(하절 계수로 재면 [225]가 적발한다)
  const lmSrc196 = readFileSync(new URL('./lightingModel.js', import.meta.url), 'utf8')
  T('★192 층 가중치 유도가 상절 계수를 쓴다(공급지가 상절이므로 — 사본·불일치 금지)',
    /bounceK = BAKE_BOUNCE_UP/.test(lmSrc196)
    && /bounceK \* polysIrradiance\(p, n, bouncePolys\)/.test(lmSrc196)
    && /bounceK: bounceUpK/.test(lmSrc196))
  //  ── ★197 상절 전용 톤 감마 ──
  const shadeGm = (G, p, n) => zoneAShadeAt(p, n, zoneABakeSpec({ gammaUpK: G }))
  T(`노브 위생 — BAKE_GAMMA_UP(${BAKE_GAMMA_UP}) > 0 유한 · ⛔BAKE_GAMMA(${BAKE_GAMMA})와 같으면 ★196 이전과 항등`,
    Number.isFinite(BAKE_GAMMA_UP) && BAKE_GAMMA_UP > 0)
  T('★방(하절) 6표본이 상절 감마 2↔3↔9에서 비트 동일 — 톤을 눌러도 방은 안 움직인다',
    ROOM.every(([p, n]) => {
      const a = shadeGm(2, p, n)
      return a === shadeGm(3, p, n) && a === shadeGm(9, p, n)
    }))
  T('하절 감마 = BAKE_GAMMA · 상절 감마 = BAKE_GAMMA_UP(스펙에 실재)',
    zoneABakeSpec().lower.gamma === BAKE_GAMMA
    && zoneABakeSpec().upper.gamma === BAKE_GAMMA_UP
    && zoneABakeSpec({ gammaUpK: 5 }).upper.gamma === 5
    && zoneABakeSpec({ gammaUpK: 5 }).lower.gamma === BAKE_GAMMA)
  //  ★두 노브가 **다른 자리**를 문다 — ★197 규명의 핵심(하나로는 인상이 안 바뀌었다)
  const vWallHi = [[16.8 * Math.cos(0.9), 123, 16.8 * Math.sin(0.9)], [-Math.cos(0.9), 0.8, -Math.sin(0.9)]]
  const vWallLo = [[16.8 * Math.cos(0.9), 106, 16.8 * Math.sin(0.9)], [-Math.cos(0.9), 0, -Math.sin(0.9)]]
  T('★감마는 벽 상부를 누르고(우물 지배) 반사 노브는 벽 하부를 누른다(반사 지배) — 서로 다른 자리',
    !BAKE_POLY_ON || (
      shadeGm(2, vWallHi[0], vWallHi[1]) - shadeGm(4, vWallHi[0], vWallHi[1]) > 0.1
      && zoneAShadeAt(vWallLo[0], vWallLo[1], zoneABakeSpec({ bounceUpK: 0.25 }))
       - zoneAShadeAt(vWallLo[0], vWallLo[1], zoneABakeSpec({ bounceUpK: 0.002 })) > 0.1))
  T('⛔보존계 — BAKE_BOUNCE_UP = BAKE_BOUNCE이면 상절도 구 체제와 비트 동일',
    [[[12, 100.4, 0], up], [[0, DISC_Y_HI, 0], up]].every(([p, n]) =>
      shadeUpK(BAKE_BOUNCE, p, n) === zoneAShadeAt(p, n, zoneABakeSpec({ bounceUpK: BAKE_BOUNCE }))))
}


// ══════ S-5. ★198 조도 구배 분할 — 얼룩의 구조 수리 ══════
{
  console.log('\n── S-5. ★198 조도 구배 분할 ──')
  const SP = spireSpec(), Zg = zoneABakeSpec()
  const shadeOf = (c) => (zoneAInterior(c.position, SP, c.normal) ? zoneAShadeAt(c.position, c.normal, Zg) : 1)
  //  표적 = 첨탑 벽(증상이 난 부재). 비인덱스 수프로 만들어 함수에 그대로 먹인다.
  const wall = buildSpire()
  const src = wall.index ? wall.toNonIndexed() : wall
  const attrs = { position: { array: src.attributes.position.array, itemSize: 3 },
                  normal: { array: src.attributes.normal.array, itemSize: 3 } }
  const nBase = attrs.position.array.length / 9
  const res = splitSoupByGradient(attrs, shadeOf, BAKE_GRAD_TOL, BAKE_GRAD_MIN)

  T(`노브 위생 — ON(${BAKE_GRAD_ON}) 불리언 · TOL(${BAKE_GRAD_TOL}) ∈ (0,1] · MIN(${BAKE_GRAD_MIN}) > 0`,
    typeof BAKE_GRAD_ON === 'boolean' && BAKE_GRAD_TOL > 0 && BAKE_GRAD_TOL <= 1 && BAKE_GRAD_MIN > 0)
  //  ★실효성(공허 방지) — 쪼갤 삼각형이 실제로 있었다(현도 실증의 근거)
  T(`★실효성 — 첨탑 벽에 구배 초과 삼각형이 실재했다(${res.rough}장 · ${nBase} → ${res.tris}, +${res.added})`,
    res.rough > 0 && res.added > 0)
  //  ★위치 불변 — 새 정점은 전부 부모 변의 중점이므로 실루엣·면이 안 바뀐다(★178과 같은 근거)
  //  ⚠경계상자는 약한 검사다(원본 정점이 상자를 정의하므로 중점을 옮겨도 안 변한다 — 반증이 통과했다).
  //   **면적 합**이 옳은 불변식이다: 4분할은 부모 면적을 정확히 나눠 가지므로 합이 보존된다.
  const areaOf = (arr) => { let a = 0
    for (let t = 0; t < arr.length / 9; t++) {
      const p = (k) => [arr[t*9+k*3], arr[t*9+k*3+1], arr[t*9+k*3+2]]
      const A = p(0), B = p(1), C = p(2)
      const e1 = [B[0]-A[0], B[1]-A[1], B[2]-A[2]], e2 = [C[0]-A[0], C[1]-A[1], C[2]-A[2]]
      a += Math.hypot(e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]) / 2
    }
    return a }
  const a0 = areaOf(attrs.position.array), a1 = areaOf(res.attrs.position)
  T(`★위치 이동 0 — 분할 전후 총 면적이 같다(${a0.toFixed(1)} vs ${a1.toFixed(1)} · 새 정점 = 부모 변 중점)`,
    Math.abs(a1 - a0) / a0 < 1e-4)
  //  ★결과 보장 — 남은 삼각형은 tol 이내이거나 변 하한에 닿았다(둘 중 하나)
  let bad = 0
  const Pn = res.attrs.position, Nn = res.attrs.normal
  for (let t = 0; t < Pn.length / 9; t++) {
    const V = [0,1,2].map(k => ({ position: [Pn[t*9+k*3], Pn[t*9+k*3+1], Pn[t*9+k*3+2]],
                                  normal: [Nn[t*9+k*3], Nn[t*9+k*3+1], Nn[t*9+k*3+2]] }))
    const ss = V.map(shadeOf)
    if (Math.max(...ss) - Math.min(...ss) <= BAKE_GRAD_TOL) continue
    const e = [[0,1],[1,2],[2,0]].map(([a,b]) => Math.hypot(
      V[a].position[0]-V[b].position[0], V[a].position[1]-V[b].position[1], V[a].position[2]-V[b].position[2]))
    if (Math.max(...e) <= BAKE_GRAD_MIN + 1e-6) continue
    bad++
  }
  T(`★결과 보장 — 남은 삼각형은 전부 구배 ≤ TOL 이거나 변 ≤ MIN(위반 ${bad}장)`, bad === 0)
  //  ⛔보존계 — TOL을 1로 올리면 분할이 0(끈 것과 항등)
  T('⛔TOL=1(무한 허용)이면 분할 0 — 노브를 끄면 ★197 이전과 항등',
    splitSoupByGradient(attrs, shadeOf, 1, BAKE_GRAD_MIN).added === 0)
  //  ★202 회귀 — 세로 검은 줄무늬의 형태학적 근원: **세로로 긴 삼각형이 큰 값차를 품는 것**.
  //   TOL 0.3에서 산포 0.300짜리(정점 y122.5 0.340 ↔ y99.2 0.040)가 경계에 걸려 통과해 9줄이 생겼다(현도 실증).
  //   ⇒ 분할 후 벽에 '세로 폭 큰 + 산포 큰' 삼각형이 남지 않아야 한다.
  let tall = 0
  for (let t = 0; t < Pn.length / 9; t++) {
    const ys = [0,1,2].map(k => Pn[t*9+k*3+1])
    if (Math.max(...ys) - Math.min(...ys) < 8) continue                 // 세로 8m 미만은 줄무늬가 안 된다
    const V = [0,1,2].map(k => ({ position: [Pn[t*9+k*3], Pn[t*9+k*3+1], Pn[t*9+k*3+2]],
                                  normal: [Nn[t*9+k*3], Nn[t*9+k*3+1], Nn[t*9+k*3+2]] }))
    const ss = V.map(shadeOf)
    if (Math.max(...ss) - Math.min(...ss) > 0.25) tall++       // ⚠고정 임계 — TOL을 쓰면 노브를 따라가 항상 통과한다(공허)
  }
  T(`★★202 회귀 — 세로 8m↑ 삼각형 중 산포 > 0.25인 것이 없다(줄무늬의 근원 · 위반 ${tall}장)`, tall === 0)

  //  배선(공허 방지) — Room.jsx가 굽기와 **같은 식**으로 판정하고 실제로 호출한다
  const roomSrc198 = readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8')
  T('Room.jsx가 splitSoupByGradient를 호출하고 판정에 zoneAInterior/zoneAShadeAt을 그대로 쓴다(사본 금지)',
    /splitSoupByGradient\(attrs, shadeOf, BAKE_GRAD_TOL, BAKE_GRAD_MIN\)/.test(roomSrc198)
    && /zoneAInterior\(p, Z\.spire, n\) \? zoneAShadeAt\(p, n, Z\) : 1/.test(roomSrc198)
    && /BAKE_GRAD_ON && !g\.userData\.bakeGrad/.test(roomSrc198))
}

// ══════ S-6. ★206 상절 반사 소등 — 방위 이음선 제거 + 밝기 다이얼 ══════
{
  console.log('\n── S-6. ★206 상절 반사 소등 ──')
  const SP6 = spireSpec(), D6 = discSpec192()
  //  벽 = 첨탑 내벽(살 한가운데 바로 안쪽 · 법선 안쪽 수평) — 현도가 실증한 그 면이다.
  const wallPt6 = (y, az) => {
    const rOut = y <= SP6.yT ? wellWallR(y, { spec: SP6, forceSpire: true }) : SP6.rTopOut
    const r = rOut - SP6.T / 2 - 1e-3
    return [[r * Math.cos(az), y, r * Math.sin(az)], [-Math.cos(az), 0, -Math.sin(az)]]
  }
  const shadeIn6 = (p, n, Z) => (zoneAInterior(p, SP6, n) ? zoneAShadeAt(p, n, Z) : NaN)
  //  ⚠blendK:0 — 이 절의 표적은 벽면이고 y101 부근은 ★193 블렌드 대역이라 켜 두면 대역 안 값이 섞인다.
  const specOf = (b, g) => zoneABakeSpec({ bounceUpK: b, gammaUpK: g, blendK: 0 })
  const spreadAt = (y, Z) => {
    const v = []
    for (let i = 0; i < 36; i++) { const [p, n] = wallPt6(y, i / 36 * 2 * Math.PI); const s6 = shadeIn6(p, n, Z); if (Number.isFinite(s6)) v.push(s6) }
    return Math.max(...v) - Math.min(...v)
  }
  const YS6 = [102.5, 106, 112, 120, 130, 145, 160]
  const profOf = (Z) => YS6.map((y) => shadeIn6(...wallPt6(y, D6.wB + D6.sweep / 2), Z))

  T(`노브 위생 — BAKE_BOUNCE_UP(${BAKE_BOUNCE_UP}) ≥ 0 유한 · BAKE_GAMMA_UP(${BAKE_GAMMA_UP}) > 0 유한`,
    Number.isFinite(BAKE_BOUNCE_UP) && BAKE_BOUNCE_UP >= 0 && Number.isFinite(BAKE_GAMMA_UP) && BAKE_GAMMA_UP > 0)

  //  ★★이 절의 존재 이유 — 상절의 **비축대칭 공급지는 반사판(디스크 상면 C자)뿐**이다.
  //   꼭지 원판·우물 안벽은 둘 다 축대칭이므로, 반사를 끄면 방위 산포가 **구조적으로 0**이 된다.
  //   ⛔반증 = 반사를 되켜면 정확히 현도가 본 세로 이음선이 재현된다(틈 0.125 ↔ 살 0.737).
  const spr0 = spreadAt(102.5, specOf(0, BAKE_GAMMA_UP))
  const sprB = spreadAt(102.5, specOf(0.002, BAKE_GAMMA_UP))
  //  ⚠**정확히 0은 아니다**(측정으로 정정): 공급지가 다각형 근사라 12·24주기 잔물결이 남는다.
  //   실측 1.1e-3 = **8비트 한 계단(1/255 = 3.9e-3)의 3분의 1** — 화면에서 색이 갈릴 수 없는 크기다.
  T(`★반사 소등 ⟹ 방위 이음선 소멸 — y102.5 36방위 산포 ${spr0.toExponential(2)} < 8비트 한 계단(${(1 / 255).toExponential(2)})`,
    spr0 < 1 / 255)
  T(`★공허 방지(병 재현) — 반사를 되켜면(0.002) 같은 자리 산포가 ${sprB.toFixed(3)}로 되살아난다(${Math.round(sprB / Math.max(spr0, 1e-12))}배)`,
    sprB > 50 * spr0 && sprB > 0.2)

  //  ★프로파일이 바로 선다 — 빛은 꼭지에서 내려오므로 **위로 갈수록 밝아야** 한다.
  //   ⛔반사를 켜면 발치 근거리 폭격 탓에 역전(비단조)이 생긴다 — 그 성질도 함께 문다.
  const pr0 = profOf(specOf(0, BAKE_GAMMA_UP))
  const prB = profOf(specOf(0.002, BAKE_GAMMA_UP))
  T(`★수직 단조 상승 — y102.5→160 (${pr0.map((v) => v.toFixed(2)).join('<')})`,
    pr0.every((v, i) => i === 0 || v > pr0[i - 1]))
  T(`★공허 방지 — 반사 체제(0.002)에서는 같은 프로파일이 비단조다(${prB.map((v) => v.toFixed(2)).join('/')})`,
    !prB.every((v, i) => i === 0 || v > prB[i - 1]))

  //  ★방 불변 — 상절 노브 둘을 어떻게 밀어도 하절(방)은 비트 동일이다(★196·★197 계승 · ★206 값에서 재확인)
  const LOW6 = [[[0, ROOM_FLOOR_Y, 0], [0, 1, 0]], [[30, ROOM_FLOOR_Y, 0], [0, 1, 0]],
                [[10, 95, 0], [-1, 0, 0]], [[0, 90, 20], [0, 1, 0]]]
  const Za = specOf(0, 0.9), Zb = specOf(0.002, 3.0), Zc = specOf(0.25, 2.0)
  const allLow = LOW6.every(([p]) => zoneASegOf(p, Za) === Za.lower)
  T('★방 불변 — 하절 4표본이 (0,0.9)↔(0.002,3.0)↔(0.25,2.0)에서 비트 동일(표본이 실제로 하절이다)',
    allLow && LOW6.every(([p, n]) => {
      const v = zoneAShadeAt(p, n, Za)
      return v === zoneAShadeAt(p, n, Zb) && v === zoneAShadeAt(p, n, Zc)
    }))

  //  ★퇴행 방지 — ★191·★192에서 현도가 얻은 자리들이 ★197 체제보다 어두워지지 않는다.
  const rmG = (D6.rIn + D6.rOut) / 2, azF6 = D6.wB + D6.sweep / 2, aEnd6 = D6.wA + 0.01
  const KEEP = [
    ['나선 옆면·챌면', [10, 110, 0], [-1, 0, 0]],
    ['걷는 살', [12 * Math.cos(azF6), DISC_Y_HI + 0.01, 12 * Math.sin(azF6)], [0, 1, 0]],
    ['틈 끝면', [rmG * Math.cos(aEnd6), 100.4, rmG * Math.sin(aEnd6)], [-Math.sin(D6.wA), 0, Math.cos(D6.wA)]],
    ['구멍 벽', [D6.rIn * Math.cos(azF6), 100.4, D6.rIn * Math.sin(azF6)], [-Math.cos(azF6), 0, -Math.sin(azF6)]],
  ]
  const now6 = zoneABakeSpec({ blendK: 0 })
  const rep = KEEP.map(([l, p, n]) => `${l} ${shadeIn6(p, n, Zb).toFixed(3)}→${shadeIn6(p, n, now6).toFixed(3)}`)
  T(`★퇴행 방지 — ★191·★192 판정점 넷이 ★197 체제보다 안 어둡다(${rep.join(' · ')})`,
    KEEP.every(([, p, n]) => shadeIn6(p, n, now6) >= shadeIn6(p, n, Zb) - 1e-9))

  //  ★다이얼이 방향을 갖는다 — 감마를 내리면 벽이 단조로 밝아진다(현도의 한 줄 사다리가 실제로 듣는다)
  const dial = [2.0, 1.5, 1.2, 0.9, 0.7].map((g) => shadeIn6(...wallPt6(112, azF6), specOf(0, g)))
  T(`★밝기 다이얼 — BAKE_GAMMA_UP 2.0→0.7에서 벽 y112가 단조 상승(${dial.map((v) => v.toFixed(3)).join('<')})`,
    dial.every((v, i) => i === 0 || v > dial[i - 1]))

  //  ★일관성(★190 어법) — 위 항들은 성질을 **명시 인자**로 물어 보존계에서도 green이다.
  //   현행 노브가 실제로 그 체제 안에 있는지는 **함의**로 따로 문다(양 체제에서 참 · 배선이 틀리면 깨진다).
  const sprNow = spreadAt(102.5, zoneABakeSpec({ blendK: 0 }))
  T(`★현행 체제 일관성 — (BAKE_BOUNCE_UP ≤ 0) ⟺ (현행 방위 산포 ${sprNow.toExponential(2)} < 8비트 한 계단)`,
    (BAKE_BOUNCE_UP <= 0) === (sprNow < 1 / 255))
}

// ══════ S-7. ★207 방위 허용오차 — 디스크 단면 줄무늬(★193 바코드의 방위판) ══════
{
  console.log('\n── S-7. ★207 방위 허용오차 ──')
  const D7 = discSpec192(), S7 = spireSpec(), Z7 = zoneABakeSpec(), TAU7 = Math.PI * 2
  //  ⚠**실기하 정점으로 잰다.** 합성 좌표(`[r·cos(wA), y, r·sin(wA)]`)는 atan2가 정확히 wA를 되돌려
  //   병을 **재현하지 못했다**(2026.08.28 도구 자책 — 합성 프로브가 '교대 0회'라고 거짓 보고했다).
  //   빌더가 낸 정점만이 ULP 흔들림을 갖는다.
  let dg = buildDisc(); if (dg.index) dg = dg.toNonIndexed()
  const DP = dg.attributes.position.array
  const relOf7 = (p) => (((Math.atan2(p[2], p[0]) - D7.wA) % TAU7) + TAU7) % TAU7
  const face = { A: [], B: [], IN: [], OUT: [] }
  const relsA = []
  for (let i = 0; i < DP.length / 3; i++) {
    const p = [DP[i*3], DP[i*3+1], DP[i*3+2]]
    if (p[1] < DISC_Y_LO - 1e-9 || p[1] > Z7.splitY) continue
    const rel = relOf7(p), r = Math.hypot(p[0], p[2])
    const dA = Math.min(rel, TAU7 - rel), dB = Math.abs(rel - D7.gap)
    if (dA < 1e-4) { face.A.push(p); relsA.push(rel) }
    else if (dB < 1e-4) face.B.push(p)
    else if (Math.abs(r - D7.rOut) < 1e-4) face.OUT.push(p)
    else if (Math.abs(r - D7.rIn) < 1e-4) face.IN.push(p)
  }
  //  ⑴ 배선 지문 — 반경 두 끝과 방위 두 끝 **넷 다** 허용오차를 갖는다(★193은 rIn 하나뿐이었다)
  const lm7 = readFileSync(new URL('./lightingModel.js', import.meta.url), 'utf8')
  T('discGapAt이 반경·방위 **네 경계** 전부에 허용오차를 갖는다(rIn·rOut·wA·wA+gap)',
    /r >= D\.rIn \+ 1e-6 && r <= D\.rOut \+ 1e-6/.test(lm7)
    && /if \(rel > TAU - 1e-6\) rel = 0/.test(lm7)
    && /if \(rel <= D\.gap \+ 1e-6\) return true/.test(lm7))

  //  ⑵ ★실효성(공허 방지) — 끝면 A 정점의 rel이 **경계 양쪽에 실재**한다.
  //   즉 허용오차가 없었다면 같은 평면 위에서 rel≈0(안)과 rel≈2π(밖)로 갈렸을 것이다 = 병의 물증.
  const nZero = relsA.filter((v) => v < 1e-6).length, nWrap = relsA.filter((v) => v > TAU7 - 1e-6).length
  T(`★실효성 — 끝면A 정점 ${relsA.length}개의 rel이 경계 양쪽에 실재한다(rel≈0 ${nZero}개 · rel≈2π ${nWrap}개 — 허용오차가 없으면 여기서 갈린다)`,
    face.A.length > 0 && nZero > 0 && nWrap > 0)

  //  ⑶ ★결과 — 틈 경계 네 부재 **각각** 안에서 절 교대가 없다(교대 = 화면 줄무늬)
  const segsOf = (arr) => new Set(arr.map((p) => (zoneASegOf(p, Z7) === Z7.upper ? 'U' : 'L')))
  const rep7 = Object.entries(face).map(([k, v]) => `${k}:${v.length}/${[...segsOf(v)].join('')}`).join(' ')
  T(`★절 배정 일관 — 끝면A·끝면B·구멍벽·바깥테두리 각각 안에서 교대 0 (${rep7})`,
    Object.values(face).every((v) => v.length === 0 || segsOf(v).size === 1))

  //  ⑷ 국소성 — 허용오차는 1e-6을 안 넘는다(틈 안/밖 판정이 안 번진다)
  const at7 = (rel, r) => { const a = D7.wA + rel; return [r * Math.cos(a), 100.0, r * Math.sin(a)] }
  T('국소성 — 틈 한가운데는 안 · 틈 밖 0.01rad은 밖 · rOut 밖 0.01m은 밖(허용오차가 1e-6을 안 넘는다)',
    discOpenAt(at7(D7.gap / 2, 12)) && !discOpenAt(at7(D7.gap + 0.01, 12)) && !discOpenAt(at7(-0.01, 12))
    && !discOpenAt(at7(D7.gap / 2, D7.rOut + 0.01)))
}

console.log(`\n전체 ${pass + fail}항 중 ${pass}항 통과 ${fail ? '❌ ' + fail + '항 실패' : '✅'}`)
process.exit(fail ? 1 : 0)
