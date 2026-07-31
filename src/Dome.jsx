// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(71) / ExplorationRib(CSG 문+아치) / Apex /
//            RibStair(문→무릎길 나선 + 절단 폴) / KneeWalk / RibJunction / Lookout(1p8) /
//            RevealPassage(회랑판: 방 → +z 회랑 → 스텁 → 문 = 1p11 공개) / Terrace
//  ★1-③B(2026.07.05): 상부 구간 구현 — 관내 잔류(§1) 완성. LandingPad·StraightFlight 폐기 제거.
//  ★1-③A(2026.07.04): 탐험 리브 분리(72→71+1) + −x면 CSG 문 + 나선 재정의 + 폴 절단(1p7)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION, SUBTRACTION } from 'three-bvh-csg'
import {
  rOf, spiralPoint, SCALE, H, R_BASE, MERIDIANS, SHELL_RIB_R, RIB_RADIAL_SEG,
  STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R, Y_POLE_CUT, U_DOOR,
  DESC_STEP_R, DESC_TREAD_D,   // ★75 하강 규격 재유도(블롱델)
  DOOR_W, DOOR_H, DOOR_SILL_Y, HALL_DOORS_ON,
  U_KNEE_END, KW_TREAD_W, LAND_R, LAND_T, X_LAND_LO, X_LAND_HI, Z_LAND,
  JCT_UP_Z, JCT_DN_Z, LOOKOUT_MAX_SLOPE, U_LOOKOUT_END, LK_STEPS, LK_PLAT_R, LK_DISC_LIFT,
  LK_DISC_HALF, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_ROT, LK_DISC_T, SHAFT_ON,
  DESC_SLOPE, DESC_STEPS, X_DESC0, PASS_FLOOR_Y,
  PASS_HW, PASS_T, PASS_X_DEEP, PASS_X_CHEEK, CHEEK_TOP_NZ, CHEEK_TOP_PZ, RM_ROOF_OV_PX,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1,
  PASS_DOOR_W, PASS_DOOR_H,
  PASS_X_END, CL_R, CL_HW, CL_PHI0, CL_PHI1, CL_ROOF, CL_SILL, CL_HEAD, CL_OP_P0, CL_OP_P1,
  CL_ROOF_Y, CL_HEAD_Y, CL_WALL_BOT, CL_FLOOR_END, CL_STAIR_MID, CL_STAIR_HPHI,   // ★78-2 계단 바닥
  CL_STEP_RISE, clLandingY, clFloorSegments, clSillBands, CL_WIN_MODE, clSillSlopeY,   // ★78-3
  CL_WALL_T, CL_R_IN2, CL_R_OUT2, CL_SEG_DROP, clSillY,   // ★78-4 벽 두께
  RM_X0, RM_X1, RM_Z0, RM_Z1, RM_ROOF, RM_MOUTH_H, PASS_FUSE,
  ST_ON, ST_PHI, ST_HW, ST_ROOF,
  LAMP_RIBS, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LAMP_TOP_Y, LAMP_MOUTH_Y0, LAMP_MOUTH_Y1, LAMP_FUNNEL_H, LAMP_MOUTH_R, LAMP_POOL_R,
  TERRACE_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_ARC,   // ⚠구 링(보존계 — ★80이 폐기, 그리지 않는다)
  RM10_ON, RM10_K, RM10_PHI, RM10_AX_R, RM10_RHO, RM10_WALL_T, RM10_FLOOR_Y, RM10_ROOF_Y,   // ★79 등불 방
  RM10_DOOR_H, RM10_ENTRY_TH, RM10_DOOR_HTH, RM10_FLOOR_OPEN_R, rm10Steps,
  RM10_CONE_DEG, RM10_CONE_Y, rm10R, RM10_FLOOR_R, RM10_BOT_Y, RM10_CENTER_Y,   // ★79-3 원뿔대
  RM10_TIER_N, RM10_TIER_RISE, RM10_TIER_SIGN, rm10Tiers, RM10_LAND_RIN, RM10_LAND_Y,
  RM10_EXIT_TH, RM10_EXIT_DHTH, RM10_EXIT_TH0, RM10_EXIT_TH1, RM10_EXIT_RIN, RM10_EXIT_ROUT,   // ★79-5 출구 통로
  RM10_EXIT_FLOOR_Y, RM10_EXIT_ROOF_Y, RM10_TERR_TH, RM10_TERR_DHTH,
  RM10_EXIT_W, RM10_EXIT_DOOR_W, RM10_STR_L, RM10_STR_END, RM10_TERR_DOOR_W, RM10_CONE_T,   // ★79-6/7
  RM10_FLARE_ON, RM10_ARC_TH1,                                                                // ★80 나팔 · 반원호 연장
  RIB_TINT_COL, RIB_TINT_AMT, RIB_TINT_EMIS, RIB_TINT_Y0, RIB_TINT_Y1,
  RIB_CUT_ON, RIB_CUT_MODE, RIB_CUT_BOX_HW, RIB_CUT_CAP_T,   // ★56 리브 절단(1p7)
  RIB_WALL_ON, RIB_WALL_T, RIB_WALL_SCOPE,                   // ★57 리브 벽 두께
  RIB_VICE_ON, RIB_NEWEL_R, RIB_POLE_ON, ribCenter, spiralU,  // ★58 중세 나선(vice)
  FR_SILL_MAT, TEMPLE_COLOR,                                  // ★60 문지방(나선↔프리즈 방 매듭)
  RIB_XFER_ON, RIB_DEST_K, RIB_DEST_PHI, RIB_FREE_MODE, FR_FLOOR_Y,          // ★61 리브 갈아타기
  STELE7_ON, STELE7_F, STELE7_OFF,
  MIR_ON, MIR_PADS,          // ★87 돔 거울 확장 — 지면 폐기·임시 판(★92로 비움 = 보존계)
  CUP_ON,                    // ★92 드럼 하판 = 반구 + 감싸는 기둥
  TR_LINK_ON,   // ★90 참 → 갓 리드 연결 계단
} from './constants'
import { hallDoors, ribCutSpec } from './corridorStairsGeometry'
import { buildRibShell, makeRibCurve, RIB_TUB_SEG, buildViceWedge, viceSplitIndex, newelSpec, buildSill, buildFloorCollar, buildFloorLanding, freeNewelSpec, freeSplitRange, buildOpenRim, isOpenRib , ribHoleSolid } from './ribGeometry'
import { buildKneeBody, buildKneePlinth } from './kneeBodyGeometry'
import { buildTerrace, buildTerraceLink } from './terraceGeometry'   // ★85 부채꼴 · ★89 계단화 · ★90 리드 연결
import { buildCupBowl, buildCupStraps } from './drumCupGeometry'   // ★92 드럼 하판(반구 + 기둥)
import { buildJunctionKnot, buildLightShaft, shaftCutSolid, lightShaftSpec, buildShaftGrate, discSolid, buildJunctionPlate, buildPzCheek, buildWideStair, wideStairTreads, apronSteps, buildRoomMouthWall, ribArchCutSolid, radialPlate } from './junctionGeometry'   // ★70 매듭 · ★71 빛 기둥 · ★75 넓은 계단
import { kneeTreads, kneeStairSpec } from './kneeStair'   // ★66 계단 규격·참
import { buildFlareShell } from './exitFlareGeometry'   // ★80 S자 나팔
import { PropStele } from './Steles'

//  ★87(2026.07.29): 지면 폐기 — 미러가 켜지면 세계에 '바닥'이 없다(브리프: 바닥이 보이면 '끝'을 연상한다 —
//   기댈 곳은 이 공간뿐 = 그것이 곧 실체. 1p8 무한 · 1p15 내재성). 코드는 스위치 뒤 보존(봉인 차분·복원).
export function Ground() {
  if (MIR_ON) return null
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

//  ★87 접지 임시 판(Ground 대체 — 브리프 결정 5) — **전부 잠정·블록아웃**(형태·재질 = Claude 임의값,
//   조형 판정 = 현도 로컬 순회). 명단·반경의 근거 = constants.MIR_PADS 주석(전수 스캔 실측 124.7 + 여유).
//   ⚠판은 구 지면과 달리 **떠 있다** — 지지 조형은 추후 건축 어휘로(브리프 결정 4, 이번에 안 만든다).
//   ⚠홀 권역 리브 관 6기가 판을 꿰고 지난다(구멍 없이 관입) — 블록아웃 한계, 현도 판정 항목.
export function MirrorPads() {
  if (!MIR_ON) return null
  return (
    <>
      {MIR_PADS.map((p) => (
        <mesh key={p.id} position={[p.cx, -p.t / 2, p.cz]} userData={{ walkable: true }}>
          <cylinderGeometry args={[p.r, p.r, p.t, 96]} />
          <meshStandardMaterial color="#6f5e44" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

//  ★★92 드럼 하판(2026.07.31 현도 스케치) — 반구 + 그것을 감싸는 기둥.
//   ⚠**walkable 아님**: 현도가 바닥을 "우선 없게" 하기로 했다 — 밟는 면이 아니라 밑에서 보는 외피다.
//   ⚠반구는 두께 0이고 뚜껑이 없다 → 홀에서 내려다보면 **안쪽 면**을 본다. 그래서 DoubleSide.
//   기하·탈락 판정 전부 `drumCupGeometry.js`(순수 모듈 — 검증이 같은 함수를 부른다).
export function DrumCup() {
  if (!MIR_ON || !CUP_ON) return null
  const bowl = buildCupBowl(), straps = buildCupStraps()
  return (
    <>
      <mesh geometry={bowl} userData={{ walkable: false }}>
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={straps} userData={{ walkable: false }}>
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// 공유 리브 곡선 — 탐험 리브·나머지 71개가 반드시 같은 곡선·같은 해상도(형태 동일 LOCKED §1).
// φ=0(+x) 평면에 정의; 나머지는 y축 회전 인스턴스로 복제.
//  ★65(2026.07.25): 정의를 ribGeometry로 이관 — 무릎길 몸이 관 내벽에 맞물리려면 클립 솔리드가
//   리브와 **같은 곡선 객체**를 써야 한다. 사본 두 벌은 언젠가 어긋난다(§1 LOCKED의 실질).
const RIB_MAT = { color: '#bb8a4e', roughness: 0.7, metalness: 0 }   // 두 컴포넌트 공유(재질 동일 LOCKED)

// ── ★56 리브 절단(1p7) 공용 — 탐험 리브(#0)와 홀 문 리브 4기가 같은 수법을 쓴다(형태 동일 LOCKED 유지) ──
//  ①끊기 = 수평 슬래브 브러시 HOLLOW_SUBTRACTION. 관은 두께 0 셸이라 '겹치는 면만 제거'가 맞는 연산이다.
//   ⚠수평으로 자르는 이유: 리브는 이 높이대에서 거의 수직(기울기 0.3~7.9° 실측)이라 수평 절단면이
//    거의 정원이 되고, 다섯이 같은 어법으로 잘린 것이 읽힌다. 법선 절단은 다섯이 제각각 기울어 어수선하다.
//  ②막기 = 절단면 캡(구 폴 절단 '평면 캡' 어휘). 안 막으면 뚫린 파이프 아가리 = 보어가 통째로 열린다.
//   캡은 남는 쪽으로 두께만큼 뻗고 간극 쪽으로 0.02만 물린다 → 경계 일치로 인한 헤어라인 없이 봉인.
//  ★★여정 리브 둘(#0·#+2)에는 캡을 달지 않는다 — ★61로 근거가 갱신됨(2026.07.24):
//   · #+2(목적지): **보어가 길이다.** 아가리 평면을 얇은 판 1~2칸이 실제로 꿰고 지나므로 캡은 나선을
//     정면으로 막는다(1-③C '뚜껑' 사고와 같은 사고 — 검증 R10이 수치로 못박음).
//   · #0: 나선이 문지방(★60)에서 방으로 나가므로 윗 절단면을 지나는 판은 이제 없다. 그래도 안 막는
//     이유 = ★57 살 있는 관의 절단면은 저절로 고리(annulus)고, 그 열린 고리가 '들고 나는 관'의
//     서명이기 때문(우연이 아니라 동선의 표식). ⚠맹관 보어가 방에서 올려다보임 — 열린 판정(현도).
//   ⚠LOCKED 안전: 이 비대칭은 형태 차별화가 아니라 **문·아치와 같은 기능 배당**이다(§1 "문 = 형태가
//   아니라 접근 지점"). #0은 걸어 지나는 관이라 막을 수 없고, 나머지 넷은 보어가 죽은 공간이라 막는다.
//   그리고 이 차이는 프리즈 방 안에서만 보인다 = LOCKED 예외 #2의 조건(다른 시점 불가시)을 벗어나지 않는다.
// ── ★57 리브 벽 두께 — 이 리브가 '살 있는 몸'인가(§1 LOCKED: 바깥면은 절대 불변) ──
//  두께가 있으면 관이 **닫힌 솔리드**가 되므로 개구는 HOLLOW_SUBTRACTION이 아니라 **SUBTRACTION**으로 뚫는다.
//  그래야 문·아치·절단면에 벽의 살이 인방·문선(reveal)으로 드러난다 — 종잇장 모서리가 사라지는 지점이 여기다.
//  ★61: 'explore' = 여정 리브 = #0 + 목적지(#+2). 살 있는 관의 절단면 = 고리 = 아가리(캡 불요).
const wallOf = (k) => (RIB_WALL_ON && (RIB_WALL_SCOPE === 'cut5' || k === 0 || (RIB_XFER_ON && k === RIB_DEST_K))) ? RIB_WALL_T : 0
const ribCutBrush = (c) => {
  const g = new THREE.BoxGeometry(RIB_CUT_BOX_HW * 2, c.gap, RIB_CUT_BOX_HW * 2)
  const yM = (c.yBot + c.yTop) / 2, rM = rOf(yM / H)
  g.translate(rM * Math.cos(c.phi), yM, rM * Math.sin(c.phi))
  return g
}
//  캡 두 장(아래 = 아랫토막을 막음 · 위 = 떠 있는 윗토막을 막음). 재질은 리브와 완전 동일.
function RibCutCaps({ cuts }) {
  //  ★61: 윗캡은 리브별 — 살 있는 관은 절단면이 저절로 고리라 캡 불요(= 아가리), 살 없는 관만 막는다.
  //  ★63(2026.07.24): `RIB_WALL_SCOPE='cut5'`로 다섯 다 살이 붙으면서 **윗캡이 전부 사라진다**
  //   — 셋이 위로 뚫린다(현도 "위아래가 막혀 있다"의 절반). 조건식은 안 고쳤다: 규칙이 이미 옳았다.
  //  ★63 아래: 셋(#−2·#−1·#+1)은 원판 대신 **우물 발코니**(난간+단)를 두른다. 난간의 발이
  //   바닥 관통 구멍(r6.4)의 마개를 넘겨받으므로 봉인은 유지된다. #+2는 발판이라 원판 유지(현도 명시).
  const rim = useMemo(() => buildOpenRim(), [])
  return (
    <>
      {cuts.flatMap((c, i) => ([
        //  ★60: 'floor' 모드에서 아랫캡은 **밟는 면**이다 — walkable을 안 달면 1-④에서 구멍이 열린다.
        isOpenRib(c.k) ? null : (
          <mesh key={`b${i}`} position={[c.bx, c.yBot + 0.02 - RIB_CUT_CAP_T / 2, c.bz]} userData={{ walkable: true }}>
            <cylinderGeometry args={[c.capB, c.capB, RIB_CUT_CAP_T, 32]} />
            <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
          </mesh>
        ),
        //  ★63 우물 발코니 — ① 난간(발이 바닥 살에 묻혀 봉인 겸함) ② 한 단 올라선 발코니 판.
        //   ⚠속 찬 고리다(난간 동자 금지 = §2-C) · 윗토막에 안 닿는다(1p7 '받쳐지지 않음' 보존).
        (rim && isOpenRib(c.k)) ? (
          <group key={`r${i}`} position={[c.bx, 0, c.bz]}>
            <mesh position={[0, rim.spec.rimY1, 0]} userData={{ walkable: false }}>
              <primitive object={rim.rim.geometry} attach="geometry" />
              <meshStandardMaterial color={TEMPLE_COLOR} roughness={0.9} />
            </mesh>
            <mesh position={[0, rim.spec.balY1, 0]} userData={{ walkable: true }}>
              <primitive object={rim.bal.geometry} attach="geometry" />
              <meshStandardMaterial color={TEMPLE_COLOR} roughness={0.9} />
            </mesh>
          </group>
        ) : null,
        wallOf(c.k) === 0 ? (
          <mesh key={`t${i}`} position={[c.tx, c.yTop - 0.02 + RIB_CUT_CAP_T / 2, c.tz]}>
            <cylinderGeometry args={[c.capT, c.capT, RIB_CUT_CAP_T, 32]} />
            <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
          </mesh>
        ) : null,
      ]))}
    </>
  )
}
// ★리브 굴절 그라데이션(2026.07.12 — 정점 렌즈와 한 몸. 수치 정본 = constants.js LENS 블록):
//  세계 y로 알베도 워시 + 미발광 — '위(렌즈)에서 내려온 굴절광이 무릎으로 잦아듦'.
//  셰이더 패치라 기하·CSG 무접촉 → 탐험 리브 #0(CSG 2컷)과 나머지 71(인스턴스)이 자동 동일(형태·재질 LOCKED 안전).
//  두 재질 인스턴스에 같은 함수를 걸어 시각 동일 보장. 끄기 = constants에서 AMT·EMIS 0.
const ribTintOBC = (RIB_TINT_AMT > 0 || RIB_TINT_EMIS > 0) ? (shader) => {
  shader.uniforms.uEthTintCol = { value: new THREE.Color(RIB_TINT_COL) }
  shader.uniforms.uEthTintY0  = { value: RIB_TINT_Y0 }
  shader.uniforms.uEthTintY1  = { value: RIB_TINT_Y1 }
  shader.uniforms.uEthTintAmt = { value: RIB_TINT_AMT }
  shader.uniforms.uEthTintEms = { value: RIB_TINT_EMIS }
  shader.vertexShader = 'varying float vEthWY;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    { vec3 ethP = transformed;
      #ifdef USE_INSTANCING
        ethP = (instanceMatrix * vec4(ethP, 1.0)).xyz;
      #endif
      vEthWY = (modelMatrix * vec4(ethP, 1.0)).y; }`
  )
  shader.fragmentShader = ('varying float vEthWY;\n' +
    'uniform vec3 uEthTintCol; uniform float uEthTintY0; uniform float uEthTintY1; uniform float uEthTintAmt; uniform float uEthTintEms;\n' +
    shader.fragmentShader
      .replace('#include <color_fragment>',
        `#include <color_fragment>
        float ethG = smoothstep(uEthTintY0, uEthTintY1, vEthWY);
        diffuseColor.rgb = mix(diffuseColor.rgb, uEthTintCol, ethG * uEthTintAmt);`)
      .replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEthTintCol * ethG * uEthTintEms;`))
} : undefined
// 디딤판·판(부양 요소) / 통로 외피 — Corridor 어휘 공유
const TREAD_MAT = { color: '#d6ab68', roughness: 0.8 }
const SHELL_MAT = { color: '#c2a062', roughness: 0.9 }
const FLOOR_MAT = { color: '#a98f5e', roughness: 0.95 }
//  ★65 무릎길 몸 — ㊿ 하강로 보(#b89a6a)와 같은 돌. 판(#d6ab68)보다 어두워 두께 위계가 눈에 읽힌다(§2-D ③)
const KNEE_BODY_MAT = { color: '#b89a6a', roughness: 0.92 }
//  ★66 참 — 디딤(밝음)과 몸(어두움) 사이 톤. '멈춰 서는 바닥'이 디딤과 다른 것임을 균질광에서도 읽히게 한다
const KNEE_LAND_MAT = { color: '#c8a578', roughness: 0.9 }
//  ★68-3 난간 — 몸보다 한 톤 어둡게. 바닥 가장자리를 감싸는 선으로 읽혀야 한다
const KNEE_RAIL_MAT = { color: '#a8895c', roughness: 0.95 }

// ── 셸: 경선 리브 67개 (= 단일 속성 실체, 전부 균일) — 문 뚫린 다섯(#0·#±1·#±2)은 별도 컴포넌트 담당 ──
//  ★㊳(2026.07.14): 인스턴스는 회전 복제라 개별 CSG 불가 → 문 리브 4기(#±1·#±2)를 HallDoorRibs로 분리
//  (탐험 리브 #0 분리의 전례 확장). ⚠좌표 규약: rotation.set(0, a, 0)은 관을 방위각 −a에 놓는다
//  (rotateY: z' = −x·sin a) → '방위각 +k·5°의 리브' = 인스턴스 i ≡ −k (mod 72). 제외 = i ∈ {1, 2, 70, 71}.
const HALL_SKIP = new Set([1, 2, MERIDIANS - 2, MERIDIANS - 1])   // 방위각 −5°·−10°·+10°·+5°
export function DomeRibs() {
  const ribRef = useRef()
  const curve = useMemo(() => makeRibCurve(), [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    let n = 0
    for (let i = 1; i < MERIDIANS; i++) {            // i=0(φ=0, 탐험 리브) + HALL_SKIP 제외 → 67개, 각도 체계 불변
      if (HALL_SKIP.has(i)) continue
      dummy.rotation.set(0, (i / MERIDIANS) * Math.PI * 2, 0)
      dummy.updateMatrix()
      ribRef.current.setMatrixAt(n++, dummy.matrix)
    }
    ribRef.current.instanceMatrix.needsUpdate = true
  }, [curve])
  return (
    <instancedMesh ref={ribRef} args={[undefined, undefined, MERIDIANS - 1 - HALL_SKIP.size]}>
      <tubeGeometry args={[curve, RIB_TUB_SEG, SHELL_RIB_R, RIB_RADIAL_SEG, false]} />{/* ★87: 분할수 정본 소비 — 미러 연장분만큼 늘어 상반부 밀도 보존 */}
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} onBeforeCompile={ribTintOBC} />
    </instancedMesh>
  )
}

// ── 탐험 리브(#0, φ=0): 형태·재질은 나머지와 완전 동일(LOCKED) — 유일한 차이 = CSG 개구 2곳 ──
//  ① 문(−x면, 1-③A): 통로쪽만 관통, +x(바깥) 불투명 보존 = 스포 3중 차단의 ①.
//  ② 아치(하부 벽, 1-③B): 갈림 하강로가 관 하부 벽을 지나는 대각 띠. ★입은 '외부'가 아니라
//     보어와 통로 내부를 잇는다 — 뚫린 면의 바깥은 RevealPassage 외피가 전부 봉함(누출 검증 = 스크립트).
//  둘 다 HOLLOW_SUBTRACTION(열린 껍질 — 겹치는 면만 제거, 뚜껑 없음) 체이닝.
export function ExplorationRib() {
  const geo = useMemo(() => {
    //  ★57: 두께가 있으면 닫힌 셸(솔리드), 없으면 구판 그대로의 열린 관. 바깥면은 두 경우 모두 동일.
    const t = wallOf(0)
    const { geometry: tube } = buildRibShell(makeRibCurve(), t)
    const OP = t > 0 ? SUBTRACTION : HOLLOW_SUBTRACTION   // 솔리드면 정식 감산 = 개구에 살이 드러난다
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    // ① 문 자르개: 세로 슬롯 상자 — x중심을 −x벽(rOf(U_DOOR)−SHELL_RIB_R ≈ 282)에, 깊이 = SHELL_RIB_R(6)
    //   → x∈[279,285]: −x면(≈282)만 관통, 중심(288)·+x벽(294)에는 못 미침.
    const wallX = rOf(U_DOOR) - SHELL_RIB_R
    const doorCut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
    doorCut.translate(wallX, DOOR_SILL_Y + DOOR_H / 2, 0)
    // ② 아치 자르개: 축정렬 상자(constants ARCH_*) — 하강 보행자 발–머리 대각 띠를 덮는 최소 창.
    //   y 상한(갈림+0.2)을 넘기면 남은 벽이 줄어 '지붕 위 시선' 누출 — 채널 측벽 상단(CHEEK_TOP_*)·정션 판과 짝(검증 21·22항).
    //  ★75-i 상자 → **아치 단면**(현도: 방에서 돌아보면 껍질 잔재가 각지게 잘려 보였다)
    const archCut = ribArchCutSolid()
    const ribBrush = new Brush(tube); ribBrush.updateMatrixWorld()
    let step1 = ribBrush
    if (HALL_DOORS_ON) {                                          // ★㊶-3: 문 개구만 스위치 — 끄면 문 컷 skip(아치는 아래서 유지)
      const b1 = new Brush(doorCut); b1.updateMatrixWorld()
      step1 = ev.evaluate(ribBrush, b1, OP)
    }
    //  ★61: 아치(갈림 하강로 출구)는 상부 여정과 함께 **목적지 리브(#+2)로 이관** — #0 상부 보어는
    //   이제 아무도 안 지나는 맹관(blind shaft)이라 뚫을 이유가 없다(뚫린 채 두면 누출 검증 대상만 는다).
    let acc = step1
    if (!RIB_XFER_ON) {
      const b2 = new Brush(archCut); b2.updateMatrixWorld()
      acc = ev.evaluate(step1, b2, OP)                         // ⚠㊴: 구 entablature 클립 제거(프리즈가 가림)
    }
    // ③ ★56 절단(1p7) — 프리즈 방 안에서 끊는다. 나선은 그대로 간극을 건넌다(현도 ⓔ).
    if (RIB_CUT_ON) {
      const c = ribCutSpec().find(v => v.k === 0)
      if (c) { const b3 = new Brush(ribCutBrush(c)); b3.updateMatrixWorld(); acc = ev.evaluate(acc, b3, OP) }
    }
    return acc.geometry
  }, [])
  //  ⚠캡 없음 — 위 ribCutBrush 주석 ★★ 참조. #0의 보어는 나선이 지나는 길이라 막으면 뚫고 못 간다.
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} onBeforeCompile={ribTintOBC} />
    </mesh>
  )
}

// ── ★홀 문 리브 4기(#±1·#±2, ㊳ 2026.07.14): 형태·재질 = 나머지와 완전 동일(같은 곡선·같은 관 파라미터) ──
//  유일한 차이 = CSG 문 1개(제각각 높이 — 수치 정본 = constants.HALL_DOORS). LOCKED §1의 첫 공식 예외:
//  문 = 형태가 아니라 '접근 지점'. 문 법선 = 플랫폼(계단이 오는 방향). 근처 벽만 관통(깊이 SHELL_RIB_R,
//  중심·반대벽 무접촉 — ExplorationRib 문과 같은 수법). 예외 조건(다른 시점 불가시) = check_corridor K절.
export function HallDoorRibs() {
  const geos = useMemo(() => {
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    return hallDoors().filter(d => d.k !== 0).map(d => {
      const t = wallOf(d.k)                            // ★57 — 'cut5'면 넷도 살을 갖는다 · ★61: 목적지도 살
      const { geometry: tube } = buildRibShell(makeRibCurve(), t)
      tube.rotateY(-d.phi)                             // rotateY(a) → 방위각 −a. 방위각 +φ에 놓으려면 −φ
      const OP = t > 0 ? SUBTRACTION : HOLLOW_SUBTRACTION
      let acc = tube
      //  ★61 목적지 리브(#+2): 아치(갈림 하강로 출구)가 #0에서 이관돼 온다 — 상부 여정 그룹이
      //   rotation-y=−RIB_DEST_PHI로 돌므로 아치 자르개도 같은 회전으로 놓는다(translate 후 rotateY —
      //   원점 기준 회전이라 순서가 곧 '월드 위치를 돌린다'가 된다).
      if (RIB_XFER_ON && d.k === RIB_DEST_K) {
        const archCut = ribArchCutSolid()
        archCut.rotateY(-RIB_DEST_PHI)
        const rb0 = new Brush(acc); rb0.updateMatrixWorld()
        const ab = new Brush(archCut); ab.updateMatrixWorld()
        acc = ev.evaluate(rb0, ab, OP).geometry
        //  ★★71 LOCKED 예외 #4 — 빛 기둥이 목적지 리브 껍질을 뚫는다(현도 승인 2026.07.25).
        //   근거 = 예외 #1·#2와 **같은 형식**: "갈림길 권역의 리브는 1p11 공개 이전 어느 시점에서도
        //   밖에서 보이지 않는다"(현도). ⚠★59에서 '리브 창'이 폐기된 지점과 같으므로, 이 예외는
        //   **불가시가 실측으로 유지되는 한에서만** 유효하다 — 검증 U절이 상시 확인한다.
        //   자르개는 상부 여정 그룹과 같은 −RIB_DEST_PHI 회전으로 놓는다(아치와 동일 수법).
        if (SHAFT_ON) {
          const s = lightShaftSpec()
          //  범위 = 껍질을 지나는 대역만(★64-5: 넘치면 관벽이 유령 구조로 남는다)
          const shaftCut = shaftCutSolid(s.roofTop, s.discBot)
          shaftCut.rotateY(-RIB_DEST_PHI)
          const rb1 = new Brush(acc); rb1.updateMatrixWorld()
          const sb = new Brush(shaftCut); sb.updateMatrixWorld()
          acc = ev.evaluate(rb1, sb, OP).geometry
        }
      }
      if (!HALL_DOORS_ON) return acc                   // ★㊶-3 임시 소등: 문 컷 없이(아치는 위에서 유지 — ★61)
      const cut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
      cut.rotateY(Math.atan2(-d.dhat[1], d.dhat[0]))   // 로컬 +x(깊이축)를 문 법선 d̂에 정렬
      cut.translate(d.cx + d.dhat[0] * SHELL_RIB_R, d.sill + DOOR_H / 2, d.cz + d.dhat[1] * SHELL_RIB_R)
      const rb = new Brush(acc); rb.updateMatrixWorld()
      const cb = new Brush(cut); cb.updateMatrixWorld()
      return ev.evaluate(rb, cb, OP).geometry          // ⚠㊴: entablature 클립 제거
    })
  }, [])
  // ★56 절단(1p7) — 문 소등 여부와 무관하게 적용(문은 '접근 지점', 절단은 '존재의 진술'로 서로 독립).
  const cut = useMemo(() => {
    if (!RIB_CUT_ON) return geos
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const spec = ribCutSpec()
    return geos.map((g, i) => {
      const c = spec.filter(v => v.k !== 0)[i]
      if (!c) return g
      const rb = new Brush(g); rb.updateMatrixWorld()
      const cb = new Brush(ribCutBrush(c)); cb.updateMatrixWorld()
      return ev.evaluate(rb, cb, wallOf(c.k) > 0 ? SUBTRACTION : HOLLOW_SUBTRACTION).geometry
    })
  }, [geos])
  //  ★57·61: 살이 있으면 절단면이 저절로 '고리 단면' → 윗캡(원판)은 끈다(리브별 — RibCutCaps 내부 판정).
  //   ⚠아랫캡은 유지 — 'floor' 모드에서 그건 리브 부재가 아니라 **바닥 관통 구멍의 마개**다(R6 [128]).
  const cuts = useMemo(() => (RIB_CUT_ON ? ribCutSpec().filter(v => v.k !== 0) : []), [])
  return (
    <group>
      {cut.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} onBeforeCompile={ribTintOBC} />
        </mesh>
      ))}
      <RibCutCaps cuts={cuts} />
    </group>
  )
}

export function Apex() {
  return (
    <group position={[0, H, 0]}>
      <pointLight color="#ffe3b0" intensity={2.2} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[5 * SCALE, 28, 28]} />
        <meshBasicMaterial color="#fff1d4" />
      </mesh>
    </group>
  )
}

// ── 나선 계단(1-③A): 문(RIB_Y) → 무릎길 진입. f축(constants.spiralPoint) 위에 디딤판 배치 ──
//  · 폴(1p7 device): 외부 지지의 '가설' — 지면(y=0)에서 올라 1p6 지점(Y_POLE_CUT)에서 종단·평면 캡.
//  ── 나선 ★58 중세 vice: 기둥(newel) + 부채꼴 쐐기 / 기둥 위로는 구판 얇은 판 ──
//   ★한 줄 규칙: **판 종류는 기둥의 유무로 갈린다.** 기둥이 끝나는 y(=프리즈 방 바닥=★56 절단 아랫끝)
//    위로는 받치는 게 아무것도 없으므로 계단도 얇은 판으로 되돌아간다(§2-B '부양 판 라임' = 1p7 증명된 뜸).
//   ⚠쐐기는 축을 중심으로 놓는다(구 디딤판은 헬릭스 위에 놓였다) — 부채의 각중심이 로컬 +x,
//    rotation.y=−θ가 그걸 진행 방위로 돌린다(구판과 같은 규약). 상면은 판 상면과 같은 높이로 맞춘다.
//  ★61 재편(2026.07.24) + ★62-2 어휘 통일(같은 날, 현도 판정 "2개가 섞여 있잖아?"):
//   [0, split)      #0 vice — 문(74)→방 바닥(166). 기둥+쐐기, ★62 바닥 매듭이 출구.
//   [split, END)    ★부양 판 하나로 — 방 허공(받치는 것 없음) → 아가리를 꿰고 → 목적지 보어 안까지
//                   **끊김 없는 한 어휘**. `RIB_FREE_MODE='vice'`로 되돌리면 ★61 원안(기둥+쐐기) 복귀.
//   ★한 줄 규칙이 그대로 산다: 판 종류는 **기둥의 유무**로 갈린다 — 자립 구간엔 기둥이 없으므로 판이다.
//  회전 = 방위각 +RIB_DEST_PHI: 위치 (x,z)→(x·cosφ−z·sinφ, x·sinφ+z·cosφ) · 자세 −θ→−θ−φ
//  (상부 여정 그룹의 rotation-y=−RIB_DEST_PHI와 같은 변환을 인스턴스 행렬에 직접 편입).
export function RibStair() {
  const wedgeRef = useRef(), plateRef = useRef()
  const split = RIB_VICE_ON ? viceSplitIndex() : 0
  const freeR = useMemo(() => (RIB_XFER_ON ? freeSplitRange() : null), [])
  //  ★62-2: 쐐기는 기둥이 있는 구간까지만. 'plate'면 자립 구간도 판이므로 쐐기는 #0에서 끝난다.
  const freeEnd = (freeR && RIB_FREE_MODE === 'vice') ? freeR.end : split
  const nWedge = freeEnd                                         // #0 쐐기 + 자립 쐐기(같은 지오메트리 인스턴싱)
  const nPlate = STAIR_STEPS - freeEnd
  const wedge = useMemo(() => (nWedge > 0 ? buildViceWedge().geometry : null), [nWedge])
  const newel = useMemo(() => (RIB_VICE_ON ? newelSpec() : null), [])
  const freeNewel = useMemo(() => (RIB_XFER_ON ? freeNewelSpec() : null), [])
  const sill  = useMemo(() => buildSill(), [])
  const collar = useMemo(() => buildFloorCollar(), [])    // ★62 고리 칼라(봉인)
  const landing = useMemo(() => buildFloorLanding(), [])  // ★62 반원 착지판(착지)
  const newelC = useMemo(() => (newel ? ribCenter(newel.cy / H) : null), [newel])
  const freeNewelC = useMemo(() => {                             // 자립 기둥 축 = 목적지 리브 중심(회전)
    if (!freeNewel) return null
    const c = ribCenter(freeNewel.cy / H)
    const cs = Math.cos(RIB_DEST_PHI), sn = Math.sin(RIB_DEST_PHI)
    return { x: c.x * cs - c.z * sn, z: c.x * sn + c.z * cs }
  }, [freeNewel])
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const cs = Math.cos(RIB_DEST_PHI), sn = Math.sin(RIB_DEST_PHI)
    const toDest = (x, z) => [x * cs - z * sn, x * sn + z * cs]
    for (let i = 0; i < STAIR_STEPS; i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const { pos, theta } = spiralPoint(f)
      const onDest = RIB_XFER_ON && i >= split                   // 자립 나선·관내 판 = 목적지 방위
      if (i < freeEnd) {
        const c = ribCenter(spiralU(f))                          // 쐐기 = 축 중심
        const [px, pz] = onDest ? toDest(c.x, c.z) : [c.x, c.z]
        dum.position.set(px, c.y + TREAD_THICK / 2, pz)          // 상면을 판 상면과 정렬
        dum.rotation.set(0, -theta - (onDest ? RIB_DEST_PHI : 0), 0)
        dum.updateMatrix()
        wedgeRef.current.setMatrixAt(i, dum.matrix)
      } else {
        const [px, pz] = onDest ? toDest(pos.x, pos.z) : [pos.x, pos.z]
        dum.position.set(px, pos.y, pz)
        dum.rotation.set(0, -theta - (onDest ? RIB_DEST_PHI : 0), 0)   // 장축 방사 방향 — 구판 문법 유지
        dum.updateMatrix()
        plateRef.current.setMatrixAt(i - freeEnd, dum.matrix)
      }
    }
    if (wedgeRef.current) wedgeRef.current.instanceMatrix.needsUpdate = true
    plateRef.current.instanceMatrix.needsUpdate = true
  }, [split, freeEnd])
  return (
    <>
      {newel && (
        <mesh position={[newelC.x, newel.cy, newelC.z]} userData={{ walkable: false }}>
          <cylinderGeometry args={[RIB_NEWEL_R, RIB_NEWEL_R, newel.h, 24]} />
          <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
        </mesh>
      )}
      {wedge && (
        <instancedMesh ref={wedgeRef} args={[undefined, undefined, nWedge]} userData={{ walkable: true }}>
          <primitive object={wedge} attach="geometry" />
          <meshStandardMaterial {...TREAD_MAT} />
        </instancedMesh>
      )}
      {/* ★61 자립 나선 기둥 — 방 바닥(목적지 절단면 캡 위)에 접지, 아가리 직전(−FREE_MOUTH_CLR)에서 끝.
          ★58과 같은 어휘(곧음·고립·접지·같은 반경) — 이 위로 판이 아가리를 꿰고 들어간다(한 줄 규칙). */}
      {freeNewel && freeNewelC && (
        <mesh position={[freeNewelC.x, freeNewel.cy, freeNewelC.z]} userData={{ walkable: false }}>
          <cylinderGeometry args={[freeNewel.r, freeNewel.r, freeNewel.h, 24]} />
          <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
        </mesh>
      )}
      {/* ★62 고리 칼라 — 관 바깥면(6.00)~바닥 구멍(6.40)의 링 슬롯을 360° 봉인한다.
          #0만 아랫캡이 없어(나선이 지난다) 이 링이 홀까지 뚫려 있었다 = 현도 "리브와 방 사이 틈". */}
      {collar && (
        <mesh
          geometry={collar.geometry}
          position={[collar.spec.cx, collar.spec.yTop, collar.spec.cz]}
          userData={{ walkable: true }}
        >
          {FR_SILL_MAT === 'floor'
            ? <meshStandardMaterial color={TEMPLE_COLOR} roughness={0.9} />
            : <meshStandardMaterial {...TREAD_MAT} />}
        </mesh>
      )}
      {/* ★62 반원 착지판 — 우물의 절반(도착 쪽)을 덮는다. 나머지 반은 열어 두어 올라온 나선이
          그대로 내려다보인다(현도 확정). 방향은 기하가 정함 = 마지막 쐐기의 진행 쪽 모서리부터. */}
      {landing && (
        <mesh
          geometry={landing.geometry}
          position={[landing.spec.cx, landing.spec.yTop, landing.spec.cz]}
          rotation-y={-landing.spec.land.thMid}
          userData={{ walkable: true }}
        >
          {FR_SILL_MAT === 'floor'
            ? <meshStandardMaterial color={TEMPLE_COLOR} roughness={0.9} />
            : <meshStandardMaterial {...TREAD_MAT} />}
        </mesh>
      )}
      {/* ★60 문지방(⚠★62가 흡수 — FR_SILL_ON=false, 되돌릴 때만 산다) */}
      {sill && (
        <mesh
          geometry={sill.geometry}
          position={[sill.spec.cx, sill.spec.yTop, sill.spec.cz]}
          rotation-y={-sill.spec.theta}
          userData={{ walkable: true }}
        >
          {FR_SILL_MAT === 'floor'
            ? <meshStandardMaterial color={TEMPLE_COLOR} roughness={0.9} />
            : <meshStandardMaterial {...TREAD_MAT} />}
        </mesh>
      )}
      <instancedMesh ref={plateRef} args={[undefined, undefined, nPlate]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      {/* ★58 폴 철거(현도 2026.07.24) — 기둥이 그 자리를 삼킨다. 상수는 보존(웨이포인트·검증 참조) */}
      {RIB_POLE_ON && (
        <mesh position={[R_BASE, Y_POLE_CUT / 2, 0]}>
          <cylinderGeometry args={[POLE_R, POLE_R, Y_POLE_CUT, 12]} />
          <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
        </mesh>
      )}
    </>
  )
}

// ── ★61 횡단 + 1p7 비석 — 프리즈 방 바닥, #0 출구 → 목적지(#+2) 발치의 길 위 ──
//  ⚠자리 미정(현도 07.24): STELE7_F 노브로 세 자리(출발 곁 0 / 한가운데 0.5 / 도착 발치 1)를 로컬 왕복.
//  비석은 경로 중심선에서 서쪽(−x 안쪽)으로 STELE7_OFF 비켜 서고, 얼굴은 경로를 향한다(걷다 읽는다).
//  담체 = 기존 PropStele 기계 그대로(P3 비석 11기 확장 때 디자인 재작업 — ★59 유보 묶음 ①).
export function FriezeCrossing() {
  const spec = useMemo(() => {
    if (!RIB_XFER_ON || !STELE7_ON) return null
    const c0 = ribCenter(FR_FLOOR_Y / H)                          // #0 발치(방 바닥 높이의 리브 축)
    const cs = Math.cos(RIB_DEST_PHI), sn = Math.sin(RIB_DEST_PHI)
    const p0 = [c0.x, c0.z], p2 = [c0.x * cs - c0.z * sn, c0.x * sn + c0.z * cs]
    const dx = p2[0] - p0[0], dz = p2[1] - p0[1], L = Math.hypot(dx, dz)
    const ch = [dx / L, dz / L]                                   // 횡단 방향
    let nx = ch[1], nz = -ch[0]                                   // 법선 후보 — 안쪽(서·돔 중심)을 고른다
    const mx = p0[0] + dx * 0.5, mz = p0[1] + dz * 0.5
    if (nx * mx + nz * mz > 0) { nx = -nx; nz = -nz }
    const px = p0[0] + dx * STELE7_F + nx * STELE7_OFF
    const pz = p0[1] + dz * STELE7_F + nz * STELE7_OFF
    //  PropStele 얼굴 = 로컬 −x. 로컬 +x가 n̂(비켜선 방향)을 향하게 → 얼굴이 경로 쪽(−n̂).
    //  rotY(a): +x → (cos a, −sin a) ⇒ a = atan2(−nz, nx)
    return { px, pz, yRot: Math.atan2(-nz, nx), L }
  }, [])
  if (!spec) return null
  return (
    <group position={[spec.px, 0, spec.pz]} rotation-y={spec.yRot}>
      <PropStele id="1p7" x={0} z={0} faceY={FR_FLOOR_Y} near={7} far={42} />
    </group>
  )
}

// ── 착지 디스크(전망 플랫폼): 부양 판(방 디딤판 어휘). 온전한 원판, topLift로 높이 조정 ──
//  (갈림 디스크는 무릎길 슬롯이 필요해 아래 JunctionDisc가 따로 담당.)
function LandingDisc({ u, topLift = 0.1, r = LAND_R, dx = 0, dz = 0, half = false, rotY = 0, t = LAND_T, bore = false }) {
  const cx = rOf(u) + dx, topY = u * H + topLift
  //  ★71: 빛 기둥이 판을 뚫는다 — 판 윗면에 관 아가리가 드러난다(현도 "윗면이 판에 딱 맞도록").
  //   ⚠자르개는 회전 **전** 로컬 좌표에서 빼고, 결과를 mesh의 rotation-y가 함께 돌린다(구멍도 같이 돈다).
  const geo = useMemo(() => {
    //  ★71-2b(현도 적발): `cylinderGeometry`는 thetaLength<2π일 때 **부채꼴 평면을 안 만든다** →
    //   위·아래 캡만 있는 종잇장으로 보인다. `discSolid`(Shape+Extrude)는 윤곽이 닫혀 옆면이 생긴다.
    const g = discSolid(r, t, half)
    g.translate(cx, topY - t, dz)
    if (!(bore && SHAFT_ON)) return g
    const cut = shaftCutSolid(topY - t - 0.5, topY + 0.5)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const a = new Brush(g), b = new Brush(cut)
    a.updateMatrixWorld(); b.updateMatrixWorld()
    const out = ev.evaluate(a, b, SUBTRACTION)
    g.dispose(); cut.dispose()
    return out.geometry
  }, [cx, topY, t, r, half, dz, bore])
  return (
    <mesh geometry={geo} rotation-y={rotY} userData={{ walkable: true }}>
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 갈림 착지장(JunctionLanding, ★②-재설계 v3 2026.07.06): 사각 판. 세 계단이 판 가장자리에서 시작(관통 없음).
//  무릎길은 +x 변(X_LAND_HI=xB)에 도착 · 전망(z−2.4)·하강(z+1.75)은 −x 변(X_LAND_LO)에서 밖으로 나감(위/아래).
//  전망을 '곧은 램프'로 바꾼 것과 짝(리브곡면 따라 판 위로 가로지르던 문제 소멸). 단순 박스.
//  ★70(2026.07.25) 매듭 부착 — §2-D ③ 두께 위계를 정션에서 세운다.
//   무릎길이 0.20 < 1.60 < 2.60 세 단을 세워 놓았는데 판 하나 건너 여기가 **0.35**였다:
//   여정에서 세 갈래가 만나는 가장 큰 마디가 가장 얇았던 것.
//   ★67 수법 그대로 — 걷는 면(LAND_T)은 손대지 않고 **밑에** 매스를 단다.
//   (LAND_T를 키우면 LK_DISC_LIFT가 물려 있어 1p8 전망 디스크가 따라 올라간다.)
function JunctionLanding() {
  const knotGeo = useMemo(() => buildJunctionKnot(), [])
  const plateGeo = useMemo(() => buildJunctionPlate(), [])
  //  ★75-d 판의 **동쪽 문턱** — 무릎길 참(폭 2)에서 늘어난 판(폭 10.2)으로 오르는 0.48, 한 자리만.
  //   ⛔아래 단(두 단 구성)은 폐기됐다 — 현도: "왜 하나의 판이 아니며 단차가 있는가".
  const apronT   = useMemo(() => apronSteps(), [])
  const apronRef = useRef()
  useLayoutEffect(() => {
    if (!apronRef.current || !apronT.length) return
    const dum = new THREE.Object3D()
    apronT.forEach((t, i) => {
      dum.position.set(t.x, t.y, 0)
      dum.scale.set(t.d, TREAD_THICK, t.w)
      dum.updateMatrix()
      apronRef.current.setMatrixAt(i, dum.matrix)
    })
    apronRef.current.instanceMatrix.needsUpdate = true
  }, [apronT])
  return (
    <>
      {knotGeo && (
        <mesh geometry={knotGeo}>
          <meshStandardMaterial {...KNEE_BODY_MAT} />
        </mesh>
      )}
      {/* ★72 판 윤곽 — 'bore'면 관 단면을 따라 벽에 닿는다(뜬 모서리 소멸) · 'rect'면 구판 사각 */}
      <mesh geometry={plateGeo} userData={{ walkable: true }}>
        <meshStandardMaterial {...TREAD_MAT} />
      </mesh>
      {/* ★75-d 동쪽 문턱 — 판이 하나의 평면(8.39)이 되고, 오르는 단차는 여기 한 곳만 남는다 */}
      {apronT.length > 0 && (
        <instancedMesh ref={apronRef} args={[undefined, undefined, apronT.length]} userData={{ walkable: true }}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...TREAD_MAT} />
        </instancedMesh>
      )}
    </>
  )
}

// ── 착지 판넬(LandingPanel, ★1-③G): 나선 옆끝(z=+STAIR_R)에서 무릎길 중앙(z=0)으로 가로지르는 솔리드 착지판 ──
//  나선 도착 → 판넬 건너 중앙 → 중앙 계단. 무릎길 z 드리프트 폐기(비스듬함 소멸) + 계단 옆쏠림 없어져 관 이탈도 해소.
//  상면 = 계단 상면보다 살짝 아래(−TREAD_THICK/2−0.03) → 계단이 판넬 위에 떠(z파이팅 없음), 착지판은 얕게 파인 랜딩.
//  ⛔★67(2026.07.25) `LandingPanel` 폐기 — 무릎길의 **첫 참**이 그 일을 대신한다.
//   구판은 1.6×5.0×두께 0.35 판이 (a)나선 도착을 받고 (b)z+3.3→0을 건너고 (c)회전을 받아냈다.
//   현도 로컬 소견: "착지 판넬이 너무 작은데 거대한 구조물로서의 무릎길 도입이 이렇게 놓여 있다."
//   → 부재를 더하지 않고 **뺐다**. ㊾6이 이미 참 13개를 깔았으므로 도입 참은 열넷째일 뿐 새 어휘가 아니다.

// ── 무릎길(KneeWalk, ★1-③B · 재작성 ★1-③E · 경사완화 ★1-③F · 중앙정렬 ★1-③G): 나선 나감 → 갈림 디스크 ──
//  ★1-③E (가): 나선이 −x로 나가므로 무릎길이 그대로 이어짐(평면 급반전 131°→9° 소멸) — 다리 폐기.
//  ★1-③F (ㄱ): 높이 = 리브 중심선과 곧은 현 KW_FLATTEN 블렌드 → 시작 62°→35°(관 안). 수평 균일(Δx=KW_GO) → 무더기·틈 없음(1-③D).
//  ★1-③G: z=0 중앙 정렬(드리프트 폐기) → 비스듬함 소멸. 나선 옆끝(z+STAIR_R)↔중앙(z=0)은 판넬(LandingPanel)이 이음.
export function KneeWalk() {
  //  ★66(2026.07.25) 계단 규격 개정 — 골판 435칸 → 진짜 계단 + 참. 배치 정본은 `kneeStair.js`.
  //   여기서 좌표를 다시 계산하지 않는다(사본 금지) — 렌더·검증·웨이포인트가 같은 배열을 소비한다.
  const treads = useMemo(() => kneeTreads(), [])
  const spec = useMemo(() => kneeStairSpec(), [])
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    treads.forEach((t, i) => {
      dum.position.set(t.x, t.y, t.z ?? 0)                                     // z=0 중앙(드리프트 폐기, 1-③G)
      dum.scale.set(t.d / spec.G, 1, t.w / KW_TREAD_W)                  // 깊이 = G×코 · z폭 = ★67-3 폭 전이
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [treads, spec])
  //  ★65 몸 — 판·참 밑에 깔리는 한 덩어리. 판(TREAD_MAT)보다 어두운 KNEE_BODY_MAT로 두께 위계를 눈에 보이게 한다
  //   (§2-D ③ 걷는 것 < 받치는 것). 상면이 판 밑면보다 KW_BODY_TOP 높아 판이 파묻히므로 z파이팅 없음.
  const bodyGeo = useMemo(() => buildKneeBody(), [])
  //  ★68-3 난간 — 바닥 **가장자리**를 감싸되 전 구간 연속(현도 "텍스트를 읽기 힘들 것 같다 → 다시 복원하되 끊김만 없게")
  const railGeo = useMemo(() => buildKneePlinth(), [])
  return (
    <>
      {bodyGeo && (
        <mesh geometry={bodyGeo}>
          <meshStandardMaterial {...KNEE_BODY_MAT} />
        </mesh>
      )}
      {railGeo && (
        <mesh geometry={railGeo}>
          <meshStandardMaterial {...KNEE_RAIL_MAT} />
        </mesh>
      )}
      {/* ★66 참 — 멈춰 서는 자리(13개). 색만 갈라 두고 두께는 디딤과 **같다**:
          참도 §2-D ③에서 '걷는 것'이고, 받치는 것은 밑의 몸이다.
          ⚠구현 초기에 LAND_T(0.35)로 깔았더니 참 밑면이 관 바닥에 더 가까워져 보어 상한을 깨뜨렸다(R7이 잡음). */}
      {spec.landings.map((L, i) => {
        //  ★67 도입 참만 z 범위가 다르다 — 나선 옆끝(z+STAIR_R)까지 뻗어 도착을 직접 받는다.
        const z0 = L.z0 ?? -KW_TREAD_W / 2, z1 = L.z1 ?? KW_TREAD_W / 2
        return (
          <mesh key={i} position={[(L.x0 + L.x1) / 2, L.y, (z0 + z1) / 2]} userData={{ walkable: true }}>
            <boxGeometry args={[L.x1 - L.x0, TREAD_THICK, z1 - z0]} />
            <meshStandardMaterial {...KNEE_LAND_MAT} />
          </mesh>
        )
      })}
      <instancedMesh ref={ref} args={[undefined, undefined, treads.length]} userData={{ walkable: true }}>
        <boxGeometry args={[spec.G, TREAD_THICK, KW_TREAD_W]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
    </>
  )
}

// ── 갈림(RibJunction, ★1-③B): 무릎길 끝 디스크 + 하강 갈래(아치로) ──
//  ★갈림 = 논증(§3): 위로 계속 올라도(Lookout·1p8) 막다름 — 되돌아 내려가(이 하강) 이행(1p9·10)을
//  거쳐야 1p11(공개)에 이른다. 하강 = z=JCT_DN_Z, 경사 DESC_SLOPE, 디스크 가장자리(X_DESC0)에서 −x로.
export function RibJunction() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const yTop = U_KNEE_END * H
    //  ★75 규격 재유도: 구판은 `STEP_RISE` 0.35(폐기 기하의 유산)로 23칸 · 2R+G = 1.00 = 통례의 157%였고,
    //   디딤 1.5가 G 0.30씩 전진해 판이 **4.93배 겹친** 톱니 경사면이었다. 이제 블롱델에서 유도한다.
    for (let i = 0; i < DESC_STEPS; i++) {
      const y = yTop - (i + 0.5) * DESC_STEP_R
      dum.position.set(X_DESC0 - (yTop - y) / DESC_SLOPE, y, JCT_DN_Z)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      {/* ★②-재설계: 타원 착지장(JunctionLanding). 무릎길이 +x끝에 닿음(도랑 폐기) + 전망·하강은 판 위/가장자리서 갈라짐. */}
      <JunctionLanding />
      <instancedMesh ref={ref} args={[undefined, undefined, DESC_STEPS]} userData={{ walkable: true }}>
        {/* ★75 디딤 깊이도 G의 파생(코 비 1.17, ★66 계승) — 구 1.5는 6배 겹침 = 톱니의 정체 */}
        {/* ⚠반폭을 정확히 PASS_HW(1.70)로 두면 볼벽 안쪽 면과 **동일 평면**이라 z-fighting이 난다
            (현도 적발 2026.07.26 "판 겹침으로 인한 우글우글"). 살 속으로 물려 면을 겹치지 않게 한다. */}
        <boxGeometry args={[DESC_TREAD_D, TREAD_THICK, (PASS_HW + PASS_FUSE) * 2]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
    </>
  )
}

// ── 1p8 전망(Lookout) — ★75 넓은 상승 계단(2026.07.26) ──
//  연혁: ★1-③B 리브곡면 상행 → ②v3 곧은 램프(폭 2·허공 판) → **★75 관 폭을 채우는 계단 매스**.
export function Lookout() {
  //  ★75(2026.07.26): 폭 2짜리 **허공 판 35장**의 곧은 램프를 폐기하고,
  //   관 폭을 채우는 **넓은 상승 계단**(53단 · 전폭 11.8)으로 교체한다.
  //   ★65가 무릎길에서 걷어낸 435장과 같은 종류의 부채였다.
  //  ★구성은 새 어휘가 아니라 무릎길의 것(★65·★66) — **몸(매스) + 디딤판**:
  //   몸 = 매끈한 사다리꼴 각기둥 ∩ 관 안쪽 − 중앙 아치. 디딤판은 그 위에 0.06 파묻혀 앉는다.
  //   ⚠53단 톱니를 통째로 압출해 관과 교차시킨 1차 구현은 CSG가 파탄했다(열린 변 1455·부피 음수).
  //  ★그 밑을 하강이 아치로 뚫고 지나간다 = 갈림이 좌우(z 분리)에서 **위·아래**로 바뀐다.
  //   크고 당당한 계단이 막다름(1p8)이고, 갈 길은 그 바닥에 뚫린 문이다(현도 스케치 2026.07.25).
  //  ⚠경사 50.85°는 튜닝이 아니라 **리브가 정한 바닥**이다(판을 물리거나 낮추면 관 밖으로 나간다 — 실측).
  const geo = useMemo(() => buildWideStair(), [])
  const T = useMemo(() => wideStairTreads(), [])
  const ref = useRef()
  useLayoutEffect(() => {
    if (!ref.current) return
    const dum = new THREE.Object3D()
    T.forEach((t, i) => {
      //  단위 상자를 인스턴스마다 **비율로** 늘린다 — 폭이 x마다 관을 따르므로(★72 수법) 형상이 다르다
      dum.position.set(t.x, t.y, t.z ?? 0)
      dum.scale.set(t.d, TREAD_THICK, t.w)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [T])
  return (
    <>
      {geo && (
        <mesh geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial {...SHELL_MAT} />
        </mesh>
      )}
      <instancedMesh ref={ref} args={[undefined, undefined, T.length]} userData={{ walkable: true }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      {/* ★반원 디스크 = 1p8 도달점(막다름). ★75에서도 위치·크기·두께 무변경(브리프 ⑤ · 현도 확정) */}
      <LandingDisc u={U_LOOKOUT_END} r={LK_PLAT_R} topLift={LK_DISC_LIFT + LK_DISC_DY}
        dx={LK_DISC_DX} dz={LK_DISC_DZ} half={LK_DISC_HALF} rotY={LK_DISC_ROT}
        t={LK_DISC_T} bore />{/* ★71 두께 분리 + 빛 기둥 관통 */}
    </>
  )
}

// ── ★78-3 경사 창턱(`CL_WIN_MODE='slope'`): 원통 위의 한 줄 = 실제로는 나선 ──
//  실린더 섹터로는 못 만든다(위끝이 φ에 따라 변함) → 띠 하나를 직접 짠다.
//  ⚠**법선을 직접 준다.** computeVertexNormals를 부르면 인덱스 없는 삼각형 수프에서 평면 법선이 나와
//   '각진 연필' 음영이 된다(전례). 원통 띠의 법선은 해석적으로 (cosφ, 0, sinφ)로 정확하다.
function SlopedParapet({ p0, p1 }) {
  //  ★78-4: 두께가 생겨 면이 셋이다 — 안면(rOut) · 바깥면(rOut2) · **윗면(인방 창턱)**.
  //   윗면이 곧 현도가 말한 "자연스러운 창"의 실체다(종이 구멍 ↔ 살을 가진 개구).
  const geo = useMemo(() => {
    const N = 256, rA = CL_R + CL_HW, rB = CL_R_OUT2
    const pos = [], nor = [], idx = []
    const strip = (rs, re, yFn0, yFn1, nx) => {         // 두 줄 정점 × N 구간
      const base = pos.length / 3
      for (let i = 0; i <= N; i++) {
        const phi = p0 + (p1 - p0) * (i / N), c = Math.cos(phi), z = Math.sin(phi)
        pos.push(rs * c, yFn0(phi), rs * z, re * c, yFn1(phi), re * z)
        if (nx) { nor.push(c, 0, z, c, 0, z) } else { nor.push(0, 1, 0, 0, 1, 0) }
      }
      for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    strip(rA, rA, () => CL_WALL_BOT, clSillSlopeY, true)   // 안면
    strip(rB, rB, () => CL_WALL_BOT, clSillSlopeY, true)   // 바깥면
    strip(rA, rB, clSillSlopeY, clSillSlopeY, false)       // 윗면 = 인방 창턱
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setIndex(idx)
    return g
  }, [p0, p1])
  return <mesh geometry={geo}><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>
}

// ── 회랑판(RevealPassage, ★신규 기하 2026.07.07): 하강 채널 → 방 → +z 회랑(클로이스터 개구) → 스텁 → 문 ──
//  '하나에서 여럿으로'(게루 1p9·10 이행): 회랑을 걷는 동안 개구 밖 정면 리브가 #0→#4로 순차 교체(누적 5),
//  동시 노출 ≤3(스포 안전 — 레이캐스트 검증). 1p8(하나 안) → 1p9(여럿 조짐) → 1p11(무한) 점층.
//  1p10 표현 미정(§7) — 스텁은 밀폐·완주만 보장하는 자리표시자(문 = 기존 PASS_DOOR_* 치수).
//  밀폐(스포 3중 ③): 하강 채널(봉인 슬랩+측벽 = 구 볼벽 검증치 계승, 위 = 정션 판) → 방·회랑·스텁 외피.
//  ⚠수직 립 배열 금지(§2-C): 개구 = 기둥 없는 단일 큰 창(파라펫 CL_SILL·위턱 CL_HEAD·z경계 CL_OP_*만).
export function RevealPassage() {
  const t = PASS_T, floor = PASS_FLOOR_Y, zc = JCT_DN_Z
  const zw = PASS_HW + t / 2                       // 하강 채널 측벽 중심 z 오프셋(구 볼벽 치수)
  const doorHW = PASS_DOOR_W / 2
  const B = []                                     // 박스 대장 {p, s, walk} — 아래서 일괄 렌더
  const wall = (x, y, z, sx, sy, sz) => B.push({ p: [x, y, z], s: [sx, sy, sz], walk: false })
  const slab = (x, y, z, sx, sy, sz) => B.push({ p: [x, y, z], s: [sx, sy, sz], walk: true })

  // A. 하강 채널(검증치 계승 — 불변): 봉인 슬랩(리브 하부 물림 PASS_X_DEEP까지, 검증 ㉙) +
  //    측벽 2(구 볼벽: −z 상단 255.4 = 정션 판 하면 아래 · +z 상단 257.5/깊이 PASS_X_DEEP — 검증 ㉛)
  //  ★75: 슬랩도 볼벽과 같은 깊은 끝을 쓴다(구판은 슬랩 189.54 / −z벽 190.41로 어긋나 홈이 보였다)
  slab((RM_X1 + PASS_X_CHEEK) / 2, floor - t / 2, zc, PASS_X_CHEEK - RM_X1, t, 2 * PASS_HW + 2 * t)
  wall((RM_X1 + PASS_X_CHEEK) / 2, (floor + CHEEK_TOP_NZ) / 2, zc - zw, PASS_X_CHEEK - RM_X1, CHEEK_TOP_NZ - floor, t)
  //  ★74 +z 볼벽은 박스가 아니라 **레이크 프로파일**(정본 = junctionGeometry.buildPzCheek).
  //   상단이 x에 따라 변하므로 박스로는 못 만든다 — 아래 렌더에서 별도 mesh로 나간다.

  // B. 방: 바닥 + 4벽 + 지붕. +x벽 입(하강 — 구 린텔 개구 치수 2zw×5.2) · +z벽 입(회랑 폭×CL_ROOF)
  //  ★바닥은 +z로 0.6 더 뻗어 회랑 바닥 링 시작(z≈5.2~5.4, φ0 방사변)에 겹침 — 직육면체↔원호 이음매 바닥 틈(줄무늬) 봉인.
  //   회랑 바닥이 0.02 아래라 z파이팅 없이 방 바닥이 위에 덮임. 걸을 때 0.02 단차(무시).
  slab((RM_X0 + RM_X1) / 2, floor - t / 2, (RM_Z0 + RM_Z1 + 0.6) / 2, RM_X1 - RM_X0, t, RM_Z1 - RM_Z0 + 0.6)
  wall(RM_X0 - t / 2, floor + RM_ROOF / 2, (RM_Z0 + RM_Z1) / 2, t, RM_ROOF + 2 * t, RM_Z1 - RM_Z0 + 2 * t)
  wall((RM_X0 + RM_X1) / 2, floor + RM_ROOF / 2, RM_Z0 - t / 2, RM_X1 - RM_X0 + 2 * t, RM_ROOF + 2 * t, t)
  wall(RM_X1 + t / 2, floor + RM_ROOF / 2, (RM_Z0 - t + zc - zw) / 2, t, RM_ROOF + 2 * t, (zc - zw) - (RM_Z0 - t))
  wall(RM_X1 + t / 2, floor + RM_ROOF / 2, (zc + zw + RM_Z1 + t) / 2, t, RM_ROOF + 2 * t, (RM_Z1 + t) - (zc + zw))
  //  ⛔★75-h 구 직사각 린텔 폐기(2026.07.26 현도: "아치 끝 출구가 아치와 달리 직사각형이라 어색하다").
  //   → 입 구간 +x벽을 **한 장으로 짓고 아치를 감산**한다(정본 = junctionGeometry.buildRoomMouthWall).
  //   ★모양이 어긋날 수 없게 볼트와 **같은 `archRing`**을 쓴다 — 치수를 따로 적으면 한쪽만 고쳐진다
  //    (오늘 리브 구멍이 정확히 그렇게 어긋났다).
  // ★입(mouth) x경계 = 회랑 단면보다 0.3 안쪽(rIn+0.3 ~ rOut−0.3) — 방 벽(좌우 조각)이 회랑 벽 시작(rIn/rOut, φ0)을
  //  0.3씩 덮어 직육면체↔원호 옆 이음매 봉인. 구 −0.4(입이 더 넓음)는 벽 너머 빈 공간 노출 → 반전. 통행폭 4.6(회랑 5.2보다 좁은 문틀).
  const mX0 = CL_R - CL_HW + 0.3, mX1 = CL_R + CL_HW - 0.3
  wall((RM_X0 - t + mX0) / 2, floor + RM_ROOF / 2, RM_Z1 + t / 2, mX0 - (RM_X0 - t), RM_ROOF + 2 * t, t)
  wall((mX1 + RM_X1 + t) / 2, floor + RM_ROOF / 2, RM_Z1 + t / 2, (RM_X1 + t) - mX1, RM_ROOF + 2 * t, t)
  // 회랑 입 위 트랜섬/소핏: 방 천장(RM_ROOF)↔회랑 천장(CL_ROOF) 단차를 막음. ★CL_ROOF>RM_ROOF면 상승 소핏,
  //  반대면 구 헤더 — Math.abs로 양쪽 안전(음수 붕괴 방지). 낮은 천장서 시작해 높은 천장 위로 +t 물림(틈 봉인).
  wall((mX0 + mX1) / 2, floor + (RM_ROOF + CL_ROOF + t) / 2, RM_Z1 + t / 2, mX1 - mX0, Math.abs(CL_ROOF - RM_ROOF) + t, t)
  //  ★75-h 입 구간 +x벽 = 아치 감산 패널(박스 배열 B가 아니라 별도 mesh — CSG가 필요하다)
  //  ★71 지붕 = 빛 기둥이 뚫고 지나는 유일한 면 → 자르개로 구멍을 낸다(아래 렌더에서 CSG).
  //   ⚠밀폐(스포 3중 ③)는 **관 자신이 마개를 겸해** 유지된다 — 구멍이 관보다 SHAFT_FUSE만큼 작아 융착된다.
  //  ★73 +x 오버행 절삭 — 벽 바깥면에 맞춘다(구판은 0.3 더 나와 하강 도중 보였다).
  //   ⚠다른 세 변(−x·±z)은 그대로 — 거긴 안 보이고 봉인에 기여한다.
  {
    const rx0 = RM_X0 - t, rx1 = RM_X1 + RM_ROOF_OV_PX
    B.push({ p: [(rx0 + rx1) / 2, floor + RM_ROOF + t / 2, (RM_Z0 + RM_Z1) / 2],
             s: [rx1 - rx0, t, RM_Z1 - RM_Z0 + 2 * t], walk: false, bore: true })
  }

  // C. 회랑(원호, ★스캔·레이캐스트 판정 — constants 주석): 바닥·지붕 = 링 섹터 / 벽 = 실린더 섹터 / 끝캡·스텁 = 회전 박스.
  //   좌표 변환: φ = atan2(z,x). ringGeometry(rot-x −π/2): θ = −φ → thetaStart −φ1. cylinderGeometry: θ = π/2 − φ.
  //   바닥은 −0.02 내림(방 바닥과 공면 z파이팅 회피 — 스텁 바닥은 −0.05, 테라스 진입은 +0.05 올라섬).
  const rIn = CL_R - CL_HW, rOut = CL_R + CL_HW
  const mPhi = ST_HW / rIn                          // 스텁 입 각반폭
  const doorHW2 = PASS_DOOR_W / 2, sideW = ST_HW - doorHW2
  const stX1 = rIn + 0.4, stL = stX1 - PASS_X_END   // 스텁 반경 구간(안벽 물림 0.4)
  const ring = (key, r0, r1, y, p0, p1, walk) => (
    <mesh key={key} position={[0, y, 0]} rotation-x={-Math.PI / 2} userData={walk ? { walkable: true } : undefined}>
      <ringGeometry args={[r0, r1, 64, 1, -p1, p1 - p0]} />
      <meshStandardMaterial {...(walk ? FLOOR_MAT : SHELL_MAT)} side={THREE.DoubleSide} />
    </mesh>
  )
  const cyl = (key, r, y0, y1, p0, p1) => (
    <mesh key={key} position={[0, (y0 + y1) / 2, 0]}>
      <cylinderGeometry args={[r, r, y1 - y0, 64, 1, true, Math.PI / 2 - p1, p1 - p0]} />
      <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
    </mesh>
  )
  // ★78-2 바닥·파라펫 조각 = constants의 정본 생성기(검사와 같은 출처)
  const { segs: clFloorSegs, risers: clRisers } = clFloorSegments()
  const clSillBandList = clSillBands()
  return (
    <group>
      {/* ★78-2 바닥 = 층계참 9 + 계단 8(각 5단) — 평평한 링 하나를 계단 프로필로 교체 */}
      {clFloorSegs.map((f, i) => ring('fl' + i, rIn - t, rOut + t, f.y - 0.02, f.p0, f.p1, true))}
      {/* 챌판(riser): φ 고정 방사면 = 끝캡과 같은 어휘(회전 박스). 윗면은 디딤판과 같은 높이,
          밑으로 t 더 뻗어 두께 0 디딤판과의 이음매를 봉인한다(★75 폭 사슬: 같은 평면 금지) */}
      {clRisers.map((r, i) => (
        <mesh key={'rs' + i} position={[CL_R * Math.cos(r.phi), r.top - (CL_STEP_RISE + t) / 2, CL_R * Math.sin(r.phi)]} rotation-y={-r.phi}>
          <boxGeometry args={[2 * CL_HW + 2 * t, CL_STEP_RISE + t, t]} />
          <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* ★78-2 밑판(soffit): 벽이 최저 바닥까지 내려오면서 **계단 밑에 공동이 생긴다** — 한 장으로 닫는다.
          구판은 바닥 링 자체가 밑면이라 공동이 없었다. 봉인 규율: 새 볼륨을 만들었으면 그 밑을 막는다. */}
      {ring('sf', CL_R_IN2, CL_R_OUT2, CL_WALL_BOT, CL_PHI0, CL_PHI1, false)}
      {/* ★78-2 지붕·창 위턱은 절대 높이(CL_ROOF_Y·CL_HEAD_Y) — 바닥만 내려가고 천장은 안 움직인다 */}
      {ring('rf', CL_R_IN2, CL_R_OUT2, CL_ROOF_Y, CL_PHI0, CL_PHI1, false)}
      {/* ⛔★79-2 ST_ON=false면 스텁 입이 없다 → 안벽은 끊김 없는 한 장(구 i0/i1/ih 대체) */}
      {ST_ON ? <>
        {cyl('i0', rIn, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, ST_PHI - mPhi)}
        {cyl('i1', rIn, CL_WALL_BOT, CL_ROOF_Y, ST_PHI + mPhi, CL_PHI1)}
        {cyl('ih', rIn, CL_FLOOR_END + ST_ROOF, CL_ROOF_Y, ST_PHI - mPhi, ST_PHI + mPhi)}
      </> : cyl('i0', rIn, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, CL_PHI1)}
      {cyl('o0', rOut, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, CL_OP_P0)}
      {cyl('o1', rOut, CL_WALL_BOT, CL_ROOF_Y, CL_OP_P1, CL_PHI1)}
      {/* ★78-2 파라펫 = **계단식 띠**. 창턱이 국소 바닥 +CL_SILL을 따라가되 계단 밑에서 강하한다 */}
      {CL_WIN_MODE === 'slope'
        ? <SlopedParapet p0={CL_OP_P0} p1={CL_OP_P1} />
        : <>
            {clSillBandList.map((b, i) => (
              <group key={'ob' + i}>
                {cyl('op' + i, rOut, CL_WALL_BOT, b.y, b.p0, b.p1)}
                {cyl('oP' + i, CL_R_OUT2, CL_WALL_BOT, b.y, b.p0, b.p1)}
                {ring('ot' + i, rOut, CL_R_OUT2, b.y, b.p0, b.p1, false)}
                {/* 창턱이 한 칸 내려앉는 자리의 세로 면(인방 안의 단) */}
                {i > 0 && (
                  <mesh position={[(rOut + CL_R_OUT2) / 2 * Math.cos(b.p0), b.y + CL_SEG_DROP / 2, (rOut + CL_R_OUT2) / 2 * Math.sin(b.p0)]} rotation-y={-b.p0}>
                    <boxGeometry args={[CL_WALL_T, CL_SEG_DROP, t]} />
                    <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
                  </mesh>
                )}
              </group>
            ))}
          </>}
      {cyl('oh', rOut, CL_HEAD_Y, CL_ROOF_Y, CL_OP_P0, CL_OP_P1)}
      {/* ★78-4 벽 두께: 바깥면(rOut2)·안벽 안쪽면(rIn2) 한 겹씩 더. 지붕·밑판이 위아래를 덮는다. */}
      {ST_ON ? <>
        {cyl('I0', CL_R_IN2, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, ST_PHI - mPhi)}
        {cyl('I1', CL_R_IN2, CL_WALL_BOT, CL_ROOF_Y, ST_PHI + mPhi, CL_PHI1)}
        {cyl('Ih', CL_R_IN2, CL_FLOOR_END + ST_ROOF, CL_ROOF_Y, ST_PHI - mPhi, ST_PHI + mPhi)}
      </> : cyl('I0', CL_R_IN2, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, CL_PHI1)}
      {cyl('O0', CL_R_OUT2, CL_WALL_BOT, CL_ROOF_Y, CL_PHI0, CL_OP_P0)}
      {cyl('O1', CL_R_OUT2, CL_WALL_BOT, CL_ROOF_Y, CL_OP_P1, CL_PHI1)}
      {cyl('Oh', CL_R_OUT2, CL_HEAD_Y, CL_ROOF_Y, CL_OP_P0, CL_OP_P1)}
      {/* ★78-4 창 인방(reveal): 위턱 밑면 + 좌우 문선. 창턱 윗면은 어법별로 아래에서. */}
      {ring('rvh', rOut, CL_R_OUT2, CL_HEAD_Y, CL_OP_P0, CL_OP_P1, false)}
      {[CL_OP_P0, CL_OP_P1].map((ph, i) => {
        const sy = CL_WIN_MODE === 'slope' ? clSillSlopeY(ph) : clSillY(ph)
        return (
          <mesh key={'rvj' + i} position={[(rOut + CL_R_OUT2) / 2 * Math.cos(ph), (sy + CL_HEAD_Y) / 2, (rOut + CL_R_OUT2) / 2 * Math.sin(ph)]} rotation-y={-ph}>
            <boxGeometry args={[CL_WALL_T, CL_HEAD_Y - sy, t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      {/* ★79-2 끝캡 = **문 뚫린 네 조각**(현도 적발: "방으로 들어가는 문이 안 뚫려 있음").
          구판은 통짜 방사 평면이라 방 벽을 비워도 여기가 막고 있었다 — 방 벽만 보고 뚫었다고 착각한 것.
          문 = 통행폭 5.2 × RM10_DOOR_H, 문턱 = 회랑 최저 바닥. 방 쪽 개구(각반폭 asin(CL_HW/ρ))와
          현(chord)이 정확히 같아 문틀이 어긋나지 않는다 — 2ρ·sin(asin(CL_HW/ρ)) = 2·CL_HW 항등. */}
      {(() => {
        const dR0 = CL_R - CL_HW, dR1 = CL_R + CL_HW
        const dY0 = CL_FLOOR_END, dY1 = CL_FLOOR_END + RM10_DOOR_H
        const cap = (key, rc, rw, y0, y1) => (rw > 1e-6 && y1 - y0 > 1e-6) && (
          <mesh key={key} position={[rc * Math.cos(CL_PHI1), (y0 + y1) / 2, rc * Math.sin(CL_PHI1)]} rotation-y={-CL_PHI1}>
            <boxGeometry args={[rw, y1 - y0, t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        )
        const yA = CL_WALL_BOT - t, yB = CL_ROOF_Y + t
        return RM10_ON ? [
          cap('cpI', (CL_R_IN2 + dR0) / 2, dR0 - CL_R_IN2, yA, yB),      // 안쪽 문선
          cap('cpO', (dR1 + CL_R_OUT2) / 2, CL_R_OUT2 - dR1, yA, yB),    // 바깥 문선
          cap('cpU', CL_R, dR1 - dR0, yA, dY0),                          // 문턱 밑
          cap('cpA', CL_R, dR1 - dR0, dY1, yB),                          // 인방 위
        ] : cap('cp', CL_R, CL_R_OUT2 - CL_R_IN2, yA, yB)
      })()}
      {/* D. 스텁 — ⛔★79-2 소등(ST_ON=false). 1p10은 등불 방이 가져갔고, 테라스 출구는 방에서 새로 낸다.
          지우지 않고 스위치 뒤에 둔다(치수·검증절 보존). */}
      {ST_ON && <group rotation-y={-ST_PHI}>
        <mesh position={[(PASS_X_END - 0.6 + stX1) / 2, CL_FLOOR_END - 0.05 - t / 2, 0]} userData={{ walkable: true }}>
          <boxGeometry args={[stL + 1.0, t, 2 * ST_HW + 2 * t]} />
          <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={'sw' + s} position={[(PASS_X_END + stX1) / 2, CL_FLOOR_END + ST_ROOF / 2, s * (ST_HW + t / 2)]}>
            <boxGeometry args={[stL, ST_ROOF + 2 * t, t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[(PASS_X_END + stX1) / 2, CL_FLOOR_END + ST_ROOF + t / 2, 0]}>
          <boxGeometry args={[stL + t, t, 2 * ST_HW + 2 * t]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={'dj' + s} position={[PASS_X_END, CL_FLOOR_END + ST_ROOF / 2, s * (doorHW2 + sideW / 2)]}>
            <boxGeometry args={[t, ST_ROOF + 2 * t, sideW]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[PASS_X_END, (2 * CL_FLOOR_END + PASS_DOOR_H + ST_ROOF + t) / 2, 0]}>
          <boxGeometry args={[t, ST_ROOF + t - PASS_DOOR_H, PASS_DOOR_W]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      </group>}
      {/* A(하강 채널) + B(방) 박스 대장 — 위 수식으로 채워진 B[] 일괄 렌더 */}
      {B.map((b, i) => (
        b.bore && SHAFT_ON ? (
          <BoredBox key={i} p={b.p} s={b.s} />
        ) : (
        <mesh key={i} position={b.p} userData={b.walk ? { walkable: true } : undefined}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial {...(b.walk ? FLOOR_MAT : SHELL_MAT)} side={THREE.DoubleSide} />
        </mesh>
        )
      ))}
      {/* ★75-h 방 입구 = **아치** — 볼트를 지나온 몸이 각진 문틀을 만나지 않게(현도 2026.07.26) */}
      <MouthWall />
      {/* ★74 +z 볼벽 — ★75에서 레이크를 걷어내고 −z와 같은 높이로 대칭화했다 */}
      <PzCheek />
      {/* ★71 빛 기둥 — 전망 반원 판 → 이 방. 리브 껍질·지붕·판 셋을 같은 자르개로 뚫는다. */}
      <LightShaft />
    </group>
  )
}

// ── ★71 지붕 구멍: 상자에서 관 자르개를 뺀다 ──
//  ⚠상자를 두께 0 셸로 두면 감산이 안 먹는다(★64-4 전례) — boxGeometry는 닫힌 솔리드라 정식 SUBTRACTION이 통한다.
function BoredBox({ p, s }) {
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(...s)
    box.translate(...p)
    //  자르개 범위 = 지붕 두께 ± 여유만(★64-5 교훈: 넘치면 관벽이 유령으로 남는다)
    const cut = shaftCutSolid(p[1] - s[1] / 2 - 0.5, p[1] + s[1] / 2 + 0.5)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const a = new Brush(box), b = new Brush(cut)
    a.updateMatrixWorld(); b.updateMatrixWorld()
    const out = ev.evaluate(a, b, SUBTRACTION)
    box.dispose(); cut.dispose()
    return out.geometry
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── ★74 +z 볼벽(레이크 상단) ──
function MouthWall() {
  //  ⚠박스 배열 B가 아니라 별도 mesh다 — CSG(아치 감산)가 필요하기 때문.
  const geo = useMemo(() => buildRoomMouthWall(), [])
  return geo ? (
    <mesh geometry={geo}>
      <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
    </mesh>
  ) : null
}

function PzCheek() {
  const geo = useMemo(() => buildPzCheek(), [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── ★71 빛 기둥 본체 ──
function LightShaft() {
  const geo = useMemo(() => buildLightShaft(), [])
  //  ★71-4 격자 체 — 판의 구멍을 덮어 **밟을 수 있게** 하면서 빛은 통과시킨다(현도 제안).
  const grate = useMemo(() => buildShaftGrate(), [])
  return (
    <>
      {geo && (
        <mesh geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      )}
      {grate && (
        <mesh geometry={grate} userData={{ walkable: true }}>
          <meshStandardMaterial {...TREAD_MAT} />
        </mesh>
      )}
    </>
  )
}

// ── 등불(1p10, ★신규 기하 2026.07.11): 회랑 위 리브(#1~#4)마다 — 관이 실내로 내려온 리브 밑면에
//  수직으로 꽂혀(진입 y263.4 = 바닥 위 15.4, CL_ROOF 20 관입 체제) 회랑 안 깔때기 갓으로 종단.
//  관 상단 캡 = 리브 보어 내부(LAMP_TOP_Y, 불가시). 리브(빛의 관로)의 빛을 제 관으로 따옴.
//  ★하강 램프(2026.07.11): 갓 높이 Y0(#1)→Y1(#4) 선형 하강 — 걸을수록 등불이 내려와 마지막에서
//   몸 가까이. 올려다보면 관 = 리브까지의 시선 안내선(1p10 체감점 · 비석 자리 후보 · 1p11 문 직전).
//  각 등불 = 발광 관 + 깔때기 갓 + 갓 입 발광면 + 바닥 웅덩이 2겹 + 하향 점광(무그림자).
//  ⚠광량·색은 Phase 3 전면 재조정 전제(전부 노브). 1p10 정리 텍스트(비석/각인)는 별도 세션.
// 등불 봉: 정점 색 세로 기울기(진입고에서 목까지 밝음→어둠 보간, 진입고 위 = 상단색 고정) — 튜닝 노브 = 아래 두 색
function LampRod({ y0, y1 }) {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(LAMP_TUBE_R, LAMP_TUBE_R, y1 - y0, 12, 24)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const cTop = new THREE.Color('#ffedc4')   // 진입고(리브 쪽) — 밝음
    const cBot = new THREE.Color('#c08a48')   // 목(아래끝) — 어두움
    const mid = (y0 + y1) / 2, c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const wy = pos.getY(i) + mid                                   // 월드 y
      const t = Math.min(1, Math.max(0, (LAMP_ENTRY_Y - wy) / (LAMP_ENTRY_Y - y0)))
      c.copy(cTop).lerp(cBot, t)
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [y0, y1])
  return (
    <mesh geometry={geo} position={[0, (y0 + y1) / 2, 0]}>
      <meshBasicMaterial vertexColors />
    </mesh>
  )
}

export function CloisterLamps() {
  //  ★78-2: 바닥이 계단으로 내려가므로 **등불마다 제 층계참을 딛는다**(구판은 전부 PASS_FLOOR_Y).
  //   갓 입 높이·웅덩이가 그 층계참 기준 → '걸을수록 등불이 내려온다'는 국소 관계로 보존된다.
  //   ⚠부작용(의도됨): 리브 진입고 LAMP_ENTRY_Y는 절대치라 관이 뒤로 갈수록 길어진다(4.5 → 21.4).
  const n = LAMP_RIBS.length
  return (
    <group>
      {LAMP_RIBS.map((k, i) => {
        const floor = clLandingY(i)                                        // ★78-2 그 등불의 층계참
        const fr = n > 1 ? i / (n - 1) : 0                                  // 진행률(걷는 방향 = 배열 순)
        const mouthY = floor + LAMP_MOUTH_Y0 + (LAMP_MOUTH_Y1 - LAMP_MOUTH_Y0) * fr  // 갓 입(아래끝) — 하강 램프
        const neckY = mouthY + LAMP_FUNNEL_H                                // 갓 목 = 관 시작
        return (
        <group key={k} rotation-y={-(k / MERIDIANS) * Math.PI * 2}>
          <group position={[LAMP_R, 0, 0]}>
            {/* 관: 갓 목 → 보어 내 상단 캡 — 리브의 빛을 따오는 도관.
                ★연속 발광 기울기(2026.07.11 v2): 원통 하나 + 정점 색 보간(위=리브 쪽 밝음 → 아래 어두움).
                구 3분절 스택은 발광값이 분절 상수라 경계 띠가 노출 — 정점 색은 정점 간 보간 = 이음매 없음.
                unlit(meshBasicMaterial) = 조명 안 받는 자체 발광체로 읽힘. 색 2값 = LampRod 안 노브 */}
            <LampRod y0={neckY} y1={LAMP_TOP_Y} />
            {/* ★접합부 점광(2026.07.11): 관이 리브 밑면에 꽂히는 자리를 밝힘 — 리브 밑면·상부 벽에
                후광이 생겨 광원이 '리브'로 읽히게(현행 하향 점광만으로는 봉 끝이 광원으로 오독).
                강도·거리 = 튜닝 노브 */}
            <pointLight position={[0, LAMP_ENTRY_Y - 1.2, 0]} color="#ffc27a" intensity={22} distance={15} decay={2} />
            {/* 갓: 뒤집힌 깔때기(위 좁음 → 아래 벌어짐), 열린 원뿔대 */}
            <mesh position={[0, (mouthY + neckY) / 2, 0]}>
              <cylinderGeometry args={[LAMP_TUBE_R, LAMP_MOUTH_R, LAMP_FUNNEL_H, 24, 1, true]} />
              <meshStandardMaterial color="#caa161" roughness={0.6} emissive="#ffb45c" emissiveIntensity={0.55} side={THREE.DoubleSide} />
            </mesh>
            {/* 갓 입 발광면 — 광원으로 읽히는 면 */}
            <mesh position={[0, mouthY + 0.02, 0]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[LAMP_MOUTH_R * 0.82, 24]} />
              <meshBasicMaterial color="#fff1d4" side={THREE.DoubleSide} />
            </mesh>
            {/* 바닥 웅덩이(코어+헤일로) — 바닥 링(floor−0.02) 위 0.015 부양(z파이팅 회피 전례) */}
            <mesh position={[0, floor - 0.005, 0]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[LAMP_POOL_R * 0.55, 32]} />
              <meshBasicMaterial color="#ffdc9a" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, floor - 0.004, 0]} rotation-x={-Math.PI / 2}>
              <circleGeometry args={[LAMP_POOL_R, 32]} />
              <meshBasicMaterial color="#ffce7d" transparent opacity={0.22} />
            </mesh>
            {/* 하향 점광 — 무그림자(성능). 강도·거리 = 로컬 튜닝 노브 */}
            <pointLight position={[0, mouthY - 0.25, 0]} color="#ffce8a" intensity={14} distance={11} decay={2} />
          </group>
        </group>
        )
      })}
    </group>
  )
}

// ── ★85 테라스(1p12~15의 집 · 아가리 밖 = 1p11 공개 직후) ─────────────────────
//  현도 2026.07.29: 나팔 아가리 끝에 **딱 맞게** 붙는 환형 부채꼴, 리브 #0 반지름선까지.
//  ⚠구판은 `ringGeometry` **두께 0 한 장**이었다(판떼기). 지금은 두께 1.50 슬래브다.
//  기하·법선의 정본 = `terraceGeometry.js`, 수치의 정본 = constants ★85 블록. 여기는 마운트만 한다.
//  ★89(07.30) 계단화 · ★90(07.30) 참 → 갓 리드 연결 계단이 여기 함께 마운트된다.
export function Terrace() {
  const geo = useMemo(() => buildTerrace(), [])
  const link = useMemo(() => (TR_LINK_ON ? buildTerraceLink() : null), [])
  return (
    <>
      <mesh geometry={geo} userData={{ walkable: true }}>
        <meshStandardMaterial color="#caa161" roughness={0.85} />
      </mesh>
      {link && (
        <mesh geometry={link} userData={{ walkable: true }}>
          <meshStandardMaterial color="#caa161" roughness={0.85} />
        </mesh>
      )}
    </>
  )
}

// ── ★79 등불 방(1p10의 집, 2026.07.28 현도 스케치) ────────────────────────────────
//  회랑 끝에 붙는 원통 방. 중앙에 열 번째 등불, 그 관이 리브 #10(월드 #12) 밑면에 꽂힌다.
//  ★유도의 근거·불변식은 전부 constants.js RM10_* 블록 머리에 적혀 있다(왜 계단이 벽을 돌고,
//   왜 바닥을 내리고, 왜 천장이 리브인지). 여기는 그 규칙을 그리기만 한다.
//  ⚠좌표: 이 컴포넌트는 App의 −RIB_DEST_PHI 그룹 **안**에 있다. 그래서 방 로컬 50°가 월드 60°이고,
//   천장을 뚫는 리브는 월드 #(RM10_K + RIB_DEST_K) = #12다. ribHoleSolid는 월드 방위로 만들므로
//   그룹 회전을 되돌리는 rotateY(+XPHI)를 한 번 건다. 이 한 줄을 빠뜨리면 구멍이 10° 어긋난다.
export function LampRoom() {
  const XPHI = RIB_XFER_ON ? RIB_DEST_PHI : 0
  const AX = RM10_AX_R * Math.cos(RM10_PHI), AZ = RM10_AX_R * Math.sin(RM10_PHI)
  const t = PASS_T, rO = RM10_RHO + RM10_WALL_T
  //  ★79-3 원뿔 구간의 바깥 살 = 반경으로 t/cosα 만큼 밀어야 **수직 두께**가 t가 된다(비스듬한 면의 두께 함정)
  const coneT = RM10_WALL_T / Math.cos(RM10_CONE_DEG * Math.PI / 180)
  const dth = RM10_DOOR_HTH, th0 = RM10_ENTRY_TH - dth, th1 = RM10_ENTRY_TH + dth
  const doorTop = CL_FLOOR_END + RM10_DOOR_H
  const steps = rm10Steps()

  //  ★천장 = 원판 − 리브. 구멍의 마개는 리브 자신(★71과 같은 봉인) → 하늘 누출 0.
  //   자르개 범위는 천장 두께 ±여유만(★64-5 교훈: 넘치면 관벽이 유령으로 남는다).
  const roofGeo = useMemo(() => {
    const disc = discSolid(rO, t, false)
    disc.translate(AX, RM10_ROOF_Y, AZ)
    const cut = ribHoleSolid(RM10_K + RIB_DEST_K, RM10_ROOF_Y - 1.0, RM10_ROOF_Y + t + 1.0, 0.04)
    cut.rotateY(XPHI)                                   // ⚠그룹 회전 되돌리기
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const a = new Brush(disc), b = new Brush(cut)
    a.updateMatrixWorld(); b.updateMatrixWorld()
    const out = ev.evaluate(a, b, SUBTRACTION)
    disc.dispose(); cut.dispose()
    return out.geometry
  }, [AX, AZ, rO, t, XPHI])

  //  로컬 극좌표 헬퍼 — 원점 = 방 축, θ는 +x(반경 바깥)에서 +z(회랑 진행) 쪽으로.
  //  ringGeometry(rot-x −π/2): θ_ring = −th → thetaStart −thB.  cylinderGeometry: θ_cyl = π/2 − th.
  const ring = (key, r0, r1, y, a0, a1, walk) => (
    <mesh key={key} position={[0, y, 0]} rotation-x={-Math.PI / 2} userData={walk ? { walkable: true } : undefined}>
      <ringGeometry args={[r0, r1, 64, 1, -a1, a1 - a0]} />
      <meshStandardMaterial {...(walk ? FLOOR_MAT : SHELL_MAT)} side={THREE.DoubleSide} />
    </mesh>
  )
  const cyl = (key, r, y0, y1, a0, a1) => (
    <mesh key={key} position={[0, (y0 + y1) / 2, 0]}>
      <cylinderGeometry args={[r, r, y1 - y0, 64, 1, true, Math.PI / 2 - a1, a1 - a0]} />
      <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
    </mesh>
  )

  return (
    <>
      {/* 방 본체 — 로컬 프레임(원점 = 축, x = 반경 바깥, z = 회랑 진행) */}
      <group position={[AX, 0, AZ]} rotation-y={-RM10_PHI}>
        {/* ★79-3 바닥 = 동심원 여러 겹(두 어법 스위치). 정본 = rm10Tiers() */}
        {rm10Tiers().map((g) => (
          <group key={'tr' + g.i}>
            {ring('trt' + g.i, g.r0, g.r1, g.top - 0.02, 0, 2 * Math.PI, true)}
            {/* 겹 사이 수직면(챌판) — 안쪽 경계 r0에서 이웃 겹까지 */}
            {g.i < RM10_TIER_N - 1 && (
              <mesh position={[0, g.top + RM10_TIER_SIGN * RM10_TIER_RISE / 2, 0]}>
                <cylinderGeometry args={[g.r0, g.r0, RM10_TIER_RISE, 64, 1, true]} />
                <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        ))}
        {/* 밑판 — 방은 허공에 매달린 볼륨이다(테라스보다 12 아래, r170은 테라스 밖) */}
        {ring('sf', 0, RM10_FLOOR_R + coneT, RM10_BOT_Y, 0, 2 * Math.PI, false)}
        {/* 벽 안팎 두 겹 — ★79-3 층계참 위는 원기둥, 아래는 원뿔대(cylinderGeometry의 위/아래 반지름 차이) */}
        {[[RM10_RHO, 0], [rO, coneT]].map(([r, off], j) => (
          <group key={'w' + j}>
            {/* 원기둥 구간(층계참 → 천장) — 입구 각폭만 비우고 인방 위는 다시 채운다 */}
            {cyl('wa' + j, r, RM10_CONE_Y, RM10_ROOF_Y, th1, th0 + 2 * Math.PI)}
            {cyl('wc' + j, r, doorTop, RM10_ROOF_Y, th0, th1)}
            {/* 원뿔 구간(밑면 → 층계참) — ★79-5 출구 문 각폭만 비우고 문 위·아래는 다시 채운다.
                cylinderGeometry는 위/아래 반지름이 달라도 되므로 원뿔 섹터가 그대로 나온다. */}
            {(() => {
              const cone = (key, y0, y1, b0, b1) => (b1 > b0 && y1 - y0 > 1e-6) && (
                <mesh key={key} position={[0, (y0 + y1) / 2, 0]}>
                  <cylinderGeometry args={[rm10R(y1) + off, rm10R(y0) + off, y1 - y0, 64, 1, true, Math.PI / 2 - b1, b1 - b0]} />
                  <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
                </mesh>
              )
              const e0 = RM10_EXIT_TH - RM10_EXIT_DHTH, e1 = RM10_EXIT_TH + RM10_EXIT_DHTH
              const dY0 = RM10_FLOOR_Y, dY1 = RM10_FLOOR_Y + RM10_DOOR_H
              return [
                cone('wk' + j, RM10_BOT_Y, RM10_CONE_Y, e1, e0 + 2 * Math.PI),   // 문 밖 전 둘레
                cone('wkU' + j, RM10_BOT_Y, dY0, e0, e1),                         // 문턱 밑
                cone('wkA' + j, dY1, RM10_CONE_Y, e0, e1),                        // 인방 위
              ]
            })()}
          </group>
        ))}
        {/* 입구 인방 밑면 + 좌우 문선(★78-4 회랑 인방과 같은 어법 — 살을 가진 개구) */}
        {ring('lin', RM10_RHO, rO, doorTop, th0, th1, false)}
        {[th0, th1].map((a, i) => (
          <mesh key={'jm' + i} position={[(RM10_RHO + rO) / 2 * Math.cos(a), (CL_FLOOR_END + doorTop) / 2, (RM10_RHO + rO) / 2 * Math.sin(a)]} rotation-y={-a}>
            <boxGeometry args={[RM10_WALL_T, RM10_DOOR_H, t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* ★79-4 입구 층계참 = **회랑 바닥과 첫 계단을 잇는 판**(현도 적발: 초입에 발 디딜 곳이 없었다).
            안쪽 반지름은 원기둥 기준 RM10_LAND_RIN(5.4) — 첫 단 띠 5.51~8.51을 온전히 받는다.
            높이는 회랑 바닥보다 0.02 아래(RM10_LAND_Y) — 겹치는 띠 2.78에서 회랑이 위를 덮어 z-파이팅이 없다. */}
        {ring('ld', RM10_LAND_RIN, rO, RM10_LAND_Y, th0, th1, true)}
        {/* 하강 계단 50단 — 정본 = rm10Steps(). 디딤판 = 링 섹터 / 챌판 = 방사 회전 박스 */}
        {steps.map((s) => {
          const [a0, a1] = s.thA < s.thB ? [s.thA, s.thB] : [s.thB, s.thA]
          return (
            <group key={'st' + s.i}>
              {ring('t' + s.i, s.rIn, s.rOut, s.top, a0, a1, true)}
              <mesh position={[(s.rIn + s.rOut) / 2 * Math.cos(s.thA), s.top - (CL_STEP_RISE + t) / 2, (s.rIn + s.rOut) / 2 * Math.sin(s.thA)]} rotation-y={-s.thA}>
                <boxGeometry args={[s.rOut - s.rIn, CL_STEP_RISE + t, t]} />
                <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )
        })}
        {/* ★79-5/6 출구 통로(1p11의 집) — 방 벽 바깥을 90° 돌고, 좌회전해 직선 몇 걸음 뒤 테라스로.
            ⚠**밀폐**가 요구다(현도 "외부가 보이면 안 됨"): 개구는 둘 — 방 쪽 문, 테라스 쪽 문.
            ★★79-6 마감 수리(현도 "틈이 너무 많다"): 구판은 **방의 원뿔을 통로 안쪽 벽으로 삼았다.**
             원뿔은 위로 갈수록 물러나므로(바닥 15.65 → 지붕 13.32) 고정 반지름 지붕·끝캡이 **1.73 벌어졌다.**
             → 통로에 **자기 수직 안벽**을 준다. 그 뒤(원뿔과 안벽 사이)는 닫힌 쐐기 공동이 되어 안 보인다.
             바깥벽에도 두께를 줘 문이 '종이 구멍'이 아니라 살을 가진 개구가 되게 한다(★78-4 어법). */}
        {(() => {
          const t2 = PASS_T, y0 = RM10_EXIT_FLOOR_Y, y1 = RM10_EXIT_ROOF_Y
          const FL = RM10_FLARE_ON                                  // ★80 나팔이 뒤를 이어받는가
          //  ★80 5차: 반원호를 230°까지 **더 감는다**(현도) — 그래야 통로가 회랑 외벽까지 나간다
          const b0 = RM10_EXIT_TH0, b1 = FL ? RM10_ARC_TH1 : RM10_EXIT_TH1
          const RI = RM10_EXIT_RIN, RO = RM10_EXIT_ROUT
          const iH = RM10_EXIT_DHTH                                 // ★79-7 방 쪽 문 = 원뿔 벽의 그 문 하나(각반폭 공유)
          const i0 = RM10_EXIT_TH - iH, i1 = RM10_EXIT_TH + iH
          const o0 = RM10_TERR_TH - RM10_TERR_DHTH, o1 = RM10_TERR_TH + RM10_TERR_DHTH
          const box = (key, cx, cy, cz, sx, sy, sz) => (
            <mesh key={key} position={[cx, cy, cz]}>
              <boxGeometry args={[sx, sy, sz]} />
              <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
            </mesh>
          )
          const rbx = (key, r, th, y, sr, sy, st) => (
            <mesh key={key} position={[r * Math.cos(th), y, r * Math.sin(th)]} rotation-y={-th}>
              <boxGeometry args={[sr, sy, st]} />
              <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
            </mesh>
          )
          const xs = -(RO - t2), xe = -(RO + RM10_STR_L)           // 직선 구간(로컬 −x 방향 = 돔 중심 쪽)
          const hw = RM10_EXIT_W / 2, dw = RM10_TERR_DOOR_W / 2
          return (
            <group>
              {/* ── 원호 구간 ── */}
              {/* ★79-7 링의 안쪽 반지름은 **그 높이의 원뿔면**에서 t만큼 물려 잡는다(고정값이 틈의 원인이었다) */}
              {ring('xf', rm10R(y0) + RM10_CONE_T - t2, RO + t2, y0 - 0.02, b0, b1, true)}
              {ring('xr', rm10R(y1) + RM10_CONE_T - t2, RO + t2, y1, b0, b1, false)}
              {/* ★★79-7 안벽을 **없앴다**(현도 "문 틈으로 다 보인다"). 구판은 문이 두 겹이었다 —
                  방 원뿔에 하나, 통로 수직 안벽에 하나. 각반폭도 6.15° vs 5.50°로 달랐고, 그 사이
                  쐐기 공동이 인방 높이에서 **2.15 열려** 있었다. 문 위로 그게 통째로 보였다.
                  → 통로의 안쪽 경계 = **방 원뿔 그 자체**. 벽 하나, 문 하나, 두께(1.66)가 곧 인방 깊이다. */}
              {/* 문선 둘 + 인방 밑면 — 원뿔이므로 **사다리꼴 판**이다(박스로 하면 위가 벌어진다) */}
              {[i0, i1].map((th, k) => (
                <mesh key={'xij' + k} geometry={radialPlate([
                  [rm10R(y0) + RM10_CONE_T, y0], [rm10R(y0), y0],
                  [rm10R(y0 + RM10_DOOR_H), y0 + RM10_DOOR_H], [rm10R(y0 + RM10_DOOR_H) + RM10_CONE_T, y0 + RM10_DOOR_H],
                ], t2, th)}>
                  <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
                </mesh>
              ))}
              {ring('xih', rm10R(y0 + RM10_DOOR_H), rm10R(y0 + RM10_DOOR_H) + RM10_CONE_T, y0 + RM10_DOOR_H, i0, i1, false)}
              {/* ★★79-8 바깥벽 — ⚠★79-7 편집에서 **이 블록이 통째로 지워졌다**(현도 적발: "통로 왼쪽 벽이 사라졌다").
                  안벽을 걷어내는 수술의 슬라이스 범위가 이웃 블록까지 먹었고, 검사는 하나도 안 잡았다 —
                  셀프 렌더는 **제 사본**에 벽이 남아 있어서 0% 누출로 보고했다. 두 벌로 적힌 기하의 대가. */}
              {[RO, RO + t2].map((r, k) => (
                <group key={'xo' + k}>
                  {/* ★80 나팔이면 테라스 문이 없다 — 벽이 b0~180°까지 통째로 이어지고, 그 끝에서 나팔이 받는다 */}
                  {FL ? cyl('xoa' + k, r, y0 - t2, y1, b0, b1)
                      : <>{cyl('xoa' + k, r, y0 - t2, y1, b0, o0)}{cyl('xob' + k, r, y0 - t2, y1, o1, b1)}</>}
                </group>
              ))}
              {/* 직선 구간이 지나는 개구의 문선 둘 */}
              {FL ? null : [o0, o1].map((th, k) => rbx('xoj' + k, RO + t2 / 2, th, (y0 + y1) / 2, t2, y1 - y0, t2))}
              {/* 끝캡 둘 — 여기가 뚫리면 밖이 보인다. 안쪽 변이 원뿔을 따르는 **사다리꼴** */}
              {(FL ? [b0] : [b0, b1]).map((th, k) => (
                <mesh key={'xc' + k} geometry={radialPlate([
                  [rm10R(y0 - t2) + RM10_CONE_T - t2, y0 - t2], [RO + t2, y0 - t2],
                  [RO + t2, y1 + t2], [rm10R(y1 + t2) + RM10_CONE_T - t2, y1 + t2],
                ], t2, th)}>
                  <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
                </mesh>
              ))}

              {/* ★★79-9 문지방(현도 적발 "문틀 바닥이 뚫려 있다") — 방 바닥과 통로 바닥 **사이**에
                  아무것도 없었다. 방 바깥 겹은 r14.00에서 끝나고 통로 바닥 링은 r15.05에서 시작하는데,
                  그 사이 1.06은 **원뿔 벽의 살 자리**다. 벽이 선 곳에서는 안 보이지만 **문 자리에서는 뚫린다**
                  (밑은 3.60 아래 밑판). → 문 각폭에만 슬래브를 깐다. 양옆 0.6씩 물려 이음매를 봉인하고,
                  높이는 두 이웃보다 0.02 아래 — 위에서 덮이므로 z-파이팅이 없다(방↔회랑 이음매와 같은 규약). */}
              {ring('xth', rm10Tiers()[0].r1 - t2, rm10R(y0) + RM10_CONE_T, y0 - 0.04, i0, i1, true)}

              {/* ── ★80 S자 나팔 ─────────────────────────────────────────────────
                  구 ★79-6 직선 8(좌회전 뒤 몇 걸음)을 **이 곡선이 흡수했다.**
                  현도 진단: 클라이막스가 싱겁다 — 반전에 빌드업이 없다.
                  · 곡률을 뒤집어 안쪽으로 휘고, 걷는 내내 단면이 커진다(3→24 · 5→15).
                  · 회전각은 노브가 아니라 **정조준 조건이 정한다**(cos s = R/(rCL+R−AX) → 110.8°).
                    구 직선이 하던 '나서는 방향 못 박기'를 곡선의 마지막 20°가 대신한다.
                  · 총 39.5 → 108.8(6.6초 → 18.1초). 회랑 22.7초에 준하는 다리가 생긴다. */}
              {FL ? buildFlareShell().map((m) => (
                <mesh key={m.key} geometry={m.geo} userData={m.walk ? { walkable: true } : undefined}>
                  <meshStandardMaterial {...(m.walk ? FLOOR_MAT : SHELL_MAT)} side={THREE.DoubleSide} />
                </mesh>
              )) : (
                <>
                  {box('sf', (xs + xe) / 2, y0 - 0.04 - t2 / 2, 0, xs - xe, t2, RM10_EXIT_W + 2 * t2)}
                  {box('sr', (xs + xe) / 2, y1 + 0.02 + t2 / 2, 0, xs - xe, t2, RM10_EXIT_W + 2 * t2)}
                  {[-1, 1].map((sg) => box('sw' + sg, (xs + xe) / 2, (y0 + y1) / 2, sg * (hw + t2 / 2), xs - xe, y1 - y0 + 2 * t2, t2))}
                  {[-1, 1].map((sg) => box('se' + sg, xe + t2 / 2, (y0 + y1) / 2, sg * (dw + (hw - dw) / 2), t2, y1 - y0 + 2 * t2, hw - dw))}
                  {box('sl', xe + t2 / 2, (y0 + PASS_DOOR_H + y1) / 2, 0, t2, y1 - (y0 + PASS_DOOR_H), 2 * dw)}
                </>
              )}
            </group>
          )
        })()}
        {/* 중앙 등불 — 회랑 등불과 **같은 어법**(관 + 깔때기 갓 + 웅덩이). 다른 건 관이 훨씬 길다는 것뿐 */}
        <group>
          <LampRod y0={RM10_CENTER_Y + LAMP_MOUTH_Y1 + LAMP_FUNNEL_H} y1={LAMP_TOP_Y} />
          <pointLight position={[0, LAMP_ENTRY_Y - 1.2, 0]} color="#ffc27a" intensity={22} distance={15} decay={2} />
          <mesh position={[0, RM10_CENTER_Y + LAMP_MOUTH_Y1 + LAMP_FUNNEL_H / 2, 0]}>
            <cylinderGeometry args={[LAMP_TUBE_R, LAMP_MOUTH_R, LAMP_FUNNEL_H, 24, 1, true]} />
            <meshStandardMaterial color="#caa161" roughness={0.6} emissive="#ffb45c" emissiveIntensity={0.55} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, RM10_CENTER_Y + LAMP_MOUTH_Y1 + 0.02, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[LAMP_MOUTH_R * 0.82, 24]} />
            <meshBasicMaterial color="#fff1d4" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, RM10_CENTER_Y - 0.005, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[LAMP_POOL_R, 32]} />
            <meshBasicMaterial color="#ffce7d" transparent opacity={0.22} />
          </mesh>
          <pointLight position={[0, RM10_CENTER_Y + LAMP_MOUTH_Y1 - 0.25, 0]} color="#ffce8a" intensity={14} distance={11} decay={2} />
        </group>
      </group>
      {/* 천장(월드 좌표로 만든 CSG 결과 — 그룹 밖에서 그대로 놓는다) */}
      <mesh geometry={roofGeo}>
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}
