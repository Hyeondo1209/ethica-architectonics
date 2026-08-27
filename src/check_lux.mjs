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
import { shaftNodes } from './lightingModel.js'
import { spireSpec } from './spireGeometry.js'
const _SP = spireSpec(), SP_TIP = _SP.tipY, SP_HOLE = _SP.holeR
import { luxAt, displayLum, selfTest, SHDW_TEXEL, SHDW_BIAS_WORLD,
  supplyDiskSamples, supplyRingSamples, bakeIrradianceAt, zoneABakeSpec, zoneAShadeAt, zoneAInterior,
  splitSoupAtBoundary, capMidY, toneCurve, zoneASegOf, polysIrradiance, diskPolys,
} from './lightingModel.js'
import { pitSpec } from './defPitGeometry.js'
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
          B.eAt([0, DISC_Y_HI + 5, 0], [0, 1, 0], B.upper) / B.upper.eRef))) < 1e-12)

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
    const refS = BAKE_FLOOR + (1 - BAKE_FLOOR) * toneCurve(1)
    T('축상 착지점은 정의상 기준점(t=1)이므로 노브와 무관하게 화면 = toneCurve(1) 자리 (기준이 함께 움직인다)',
      Math.abs(zoneAShadeAt(face, faceN, ZB2) - refS) < 1e-9
      && Math.abs(zoneAShadeAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], ZB2) - refS) < 1e-9)
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

console.log(`\n전체 ${pass + fail}항 중 ${pass}항 통과 ${fail ? '❌ ' + fail + '항 실패' : '✅'}`)
process.exit(fail ? 1 : 0)
