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
  BAKE_A_ON, BAKE_N, BAKE_FLOOR, BAKE_GAMMA,
} from './constants.js'
import { shaftNodes } from './lightingModel.js'
import { spireSpec } from './spireGeometry.js'
const _SP = spireSpec(), SP_TIP = _SP.tipY, SP_HOLE = _SP.holeR
import { luxAt, displayLum, selfTest, SHDW_TEXEL, SHDW_BIAS_WORLD,
  supplyDiskSamples, supplyRingSamples, bakeIrradianceAt, zoneABakeSpec, zoneAShadeAt, zoneAInterior,
} from './lightingModel.js'
import { pitSpec } from './defPitGeometry.js'
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

console.log('\n── D. 실내 어둠(ROOM_DARK + 그림자) ──')
const c = FLOOR(0), edge = FLOOR(60)
T('ROOM_DARK 점등', ROOM_DARK_ON === true)
//  ★175-b: '완전 차단'이 아니라 '억제 + 잔광 보존'이 그림이다. aoMap 공식(indirect × (1−AO))이 옳게 적용되는지를 문다.
const rawInd = luxAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], { indoor: true, roomDark: false }).indirect
T(`실내 간접광 = 원값 × (1−AO) — aoMap 공식이 그대로 적용된다 (${rawInd.toFixed(3)} → ${c.indirect.toFixed(4)})`,
  Math.abs(c.indirect - rawInd * (1 - ROOM_DARK_AO)) < 1e-9)
T(`실내 간접광이 전역광의 5% 이하로 억제된다 (실측 ${(c.indirect / rawInd * 100).toFixed(1)}%)`,
  c.indirect <= rawInd * 0.05)
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
const OUTF = luxAt([0, 0, 0], [0, 1, 0], { indoor: false, roomDark: false })
T(`⑴어두운 방: 실내(${c.total.toFixed(2)}) < 실외(${OUTF.total.toFixed(2)}) — aoMap이 간접광을 끊은 결과`,
  c.total < OUTF.total)
T(`⑵빛을 공급받는다: 배경 화면밝기 > 0.05 (실측 ${edge.display.toFixed(3)}) — 벽이 형태로 읽힐 것`,
  edge.display > 0.05)

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
T(RND_SHADOWS
  ? `[그림자 ON] 중심 − 가장자리 화면밝기 차 > 0.5 (${(c.display - edge.display).toFixed(3)})`
  : `[그림자 OFF] 중심이 가장자리보다 밝다 (${c.display.toFixed(3)} > ${edge.display.toFixed(3)})`,
  RND_SHADOWS ? c.display - edge.display > 0.5 : c.display > edge.display,
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
  T('표면 등 뒤(법선이 공급지 반대) → E = 0', bakeIrradianceAt([0, 60, 0], [0, -1, 0], d1) === 0)
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
  T('정규화 항등 — 하절 기준점(방 바닥 중앙·상향)의 shade = 1',
    Math.abs(zoneAShadeAt([0, ROOM_FLOOR_Y, 0], [0, 1, 0], B) - 1) < 1e-12)
  //  ⑺ 두 절 분리 — 경계·공급지 대응이 전부 파생(디스크 상하면·첨탑 꼭지)
  T('절 경계 = 디스크 중간 높이(파생)', Math.abs(B.splitY - (DISC_Y_LO + DISC_Y_HI) / 2) < 1e-12)
  T('상절 공급지 = 첨탑 꼭지 구멍(y=tipY · r=holeR — 파생 대조)',
    B.upper.samples.every((s) => s.p[1] === SP_TIP && Math.hypot(s.p[0], s.p[2]) <= SP_HOLE + 1e-9))
  T('우물 안 점(경계 위)은 상절로 계산된다 — 함수 자기일관',
    Math.abs(zoneAShadeAt([0, DISC_Y_HI + 5, 0], [0, 1, 0], B)
      - (BAKE_FLOOR + (1 - BAKE_FLOOR) * Math.pow(Math.min(1,
          bakeIrradianceAt([0, DISC_Y_HI + 5, 0], [0, 1, 0], B.upper.samples) / B.upper.eRef), BAKE_GAMMA))) < 1e-12)
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

console.log(`\n전체 ${pass + fail}항 중 ${pass}항 통과 ${fail ? '❌ ' + fail + '항 실패' : '✅'}`)
process.exit(fail ? 1 : 0)
