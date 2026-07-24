// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(71) / ExplorationRib(CSG 문+아치) / Apex /
//            RibStair(문→무릎길 나선 + 절단 폴) / KneeWalk / RibJunction / Lookout(1p8) /
//            RevealPassage(회랑판: 방 → +z 회랑 → 스텁 → 문 = 1p11 공개) / Terrace
//  ★1-③B(2026.07.05): 상부 구간 구현 — 관내 잔류(§1) 완성. LandingPad·StraightFlight 폐기 제거.
//  ★1-③A(2026.07.04): 탐험 리브 분리(72→71+1) + −x면 CSG 문 + 나선 재정의 + 폴 절단(1p7)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION, SUBTRACTION } from 'three-bvh-csg'
import {
  rOf, uOfX, spiralPoint, SCALE, H, R_BASE, MERIDIANS, SHELL_RIB_R, RIB_RADIAL_SEG,
  STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R, Y_POLE_CUT, U_DOOR,
  DOOR_W, DOOR_H, DOOR_SILL_Y, HALL_DOORS_ON,
  U_SPIRAL_END, U_KNEE_END, KW_STEPS, KW_GO, KW_TREAD_D, KW_TREAD_W, KW_FLATTEN, PANEL_DX, PANEL_Z0, PANEL_Z1, LAND_R, LAND_T, X_LAND_LO, X_LAND_HI, Z_LAND,
  JCT_UP_Z, JCT_DN_Z, LOOKOUT_MAX_SLOPE, U_LOOKOUT_END, LK_STEPS, LK_PLAT_R, LK_DISC_LIFT,
  LK_DISC_HALF, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_ROT,
  DESC_SLOPE, DESC_STEPS, X_DESC0, PASS_FLOOR_Y,
  PASS_HW, PASS_T, PASS_X_DEEP, PASS_X_CHEEK, CHEEK_TOP_NZ, CHEEK_TOP_PZ,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1,
  PASS_DOOR_W, PASS_DOOR_H,
  PASS_X_END, CL_R, CL_HW, CL_PHI0, CL_PHI1, CL_ROOF, CL_SILL, CL_HEAD, CL_OP_P0, CL_OP_P1,
  RM_X0, RM_X1, RM_Z0, RM_Z1, RM_ROOF, RM_MOUTH_H,
  ST_PHI, ST_HW, ST_ROOF,
  LAMP_RIBS, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LAMP_TOP_Y, LAMP_MOUTH_Y0, LAMP_MOUTH_Y1, LAMP_FUNNEL_H, LAMP_MOUTH_R, LAMP_POOL_R,
  TERRACE_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_ARC,
  RIB_TINT_COL, RIB_TINT_AMT, RIB_TINT_EMIS, RIB_TINT_Y0, RIB_TINT_Y1,
  RIB_CUT_ON, RIB_CUT_MODE, RIB_CUT_BOX_HW, RIB_CUT_CAP_T,   // ★56 리브 절단(1p7)
  RIB_WALL_ON, RIB_WALL_T, RIB_WALL_SCOPE,                   // ★57 리브 벽 두께
  RIB_VICE_ON, RIB_NEWEL_R, RIB_POLE_ON, ribCenter, spiralU,  // ★58 중세 나선(vice)
} from './constants'
import { hallDoors, ribCutSpec } from './corridorStairsGeometry'
import { buildRibShell, buildViceWedge, viceSplitIndex, newelSpec } from './ribGeometry'

export function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// 공유 리브 곡선 — 탐험 리브·나머지 71개가 반드시 같은 곡선·같은 해상도(형태 동일 LOCKED §1).
// φ=0(+x) 평면에 정의; 나머지는 y축 회전 인스턴스로 복제.
function makeRibCurve() {
  const pts = []; const SEG = 160
  for (let i = 0; i <= SEG; i++) { const u = i / SEG; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) }
  return new THREE.CatmullRomCurve3(pts)
}
const RIB_MAT = { color: '#bb8a4e', roughness: 0.7, metalness: 0 }   // 두 컴포넌트 공유(재질 동일 LOCKED)

// ── ★56 리브 절단(1p7) 공용 — 탐험 리브(#0)와 홀 문 리브 4기가 같은 수법을 쓴다(형태 동일 LOCKED 유지) ──
//  ①끊기 = 수평 슬래브 브러시 HOLLOW_SUBTRACTION. 관은 두께 0 셸이라 '겹치는 면만 제거'가 맞는 연산이다.
//   ⚠수평으로 자르는 이유: 리브는 이 높이대에서 거의 수직(기울기 0.3~7.9° 실측)이라 수평 절단면이
//    거의 정원이 되고, 다섯이 같은 어법으로 잘린 것이 읽힌다. 법선 절단은 다섯이 제각각 기울어 어수선하다.
//  ②막기 = 절단면 캡(구 폴 절단 '평면 캡' 어휘). 안 막으면 뚫린 파이프 아가리 = 보어가 통째로 열린다.
//   캡은 남는 쪽으로 두께만큼 뻗고 간극 쪽으로 0.02만 물린다 → 경계 일치로 인한 헤어라인 없이 봉인.
//  ★★#0에는 캡을 달지 않는다 — **보어가 길이다.** 실측(2026.07.24): 윗 절단면 y184.05에 디딤판
//   i313~315가 축거리 3.3으로 지나므로 반경 6.12 캡은 나선을 정면으로 막는다. 이건 1-③C에서
//   '착지 디스크가 나선 꼭대기를 덮은 뚜껑' 사고와 **같은 사고**다(그때 디스크를 폐치해 해결했다).
//   ⚠LOCKED 안전: 이 비대칭은 형태 차별화가 아니라 **문·아치와 같은 기능 배당**이다(§1 "문 = 형태가
//   아니라 접근 지점"). #0은 걸어 지나는 관이라 막을 수 없고, 나머지 넷은 보어가 죽은 공간이라 막는다.
//   그리고 이 차이는 프리즈 방 안에서만 보인다 = LOCKED 예외 #2의 조건(다른 시점 불가시)을 벗어나지 않는다.
// ── ★57 리브 벽 두께 — 이 리브가 '살 있는 몸'인가(§1 LOCKED: 바깥면은 절대 불변) ──
//  두께가 있으면 관이 **닫힌 솔리드**가 되므로 개구는 HOLLOW_SUBTRACTION이 아니라 **SUBTRACTION**으로 뚫는다.
//  그래야 문·아치·절단면에 벽의 살이 인방·문선(reveal)으로 드러난다 — 종잇장 모서리가 사라지는 지점이 여기다.
const wallOf = (k) => (RIB_WALL_ON && (RIB_WALL_SCOPE === 'cut5' || k === 0)) ? RIB_WALL_T : 0
const ribCutBrush = (c) => {
  const g = new THREE.BoxGeometry(RIB_CUT_BOX_HW * 2, c.gap, RIB_CUT_BOX_HW * 2)
  const yM = (c.yBot + c.yTop) / 2, rM = rOf(yM / H)
  g.translate(rM * Math.cos(c.phi), yM, rM * Math.sin(c.phi))
  return g
}
//  캡 두 장(아래 = 아랫토막을 막음 · 위 = 떠 있는 윗토막을 막음). 재질은 리브와 완전 동일.
function RibCutCaps({ cuts, top = true }) {
  return (
    <>
      {cuts.flatMap((c, i) => ([
        <mesh key={`b${i}`} position={[c.bx, c.yBot + 0.02 - RIB_CUT_CAP_T / 2, c.bz]}>
          <cylinderGeometry args={[c.capB, c.capB, RIB_CUT_CAP_T, 32]} />
          <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
        </mesh>,
        top ? (
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
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, RIB_RADIAL_SEG, false]} />
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
    const archCut = new THREE.BoxGeometry(ARCH_X1 - ARCH_X0, ARCH_Y1 - ARCH_Y0, ARCH_Z1 - ARCH_Z0)
    archCut.translate((ARCH_X0 + ARCH_X1) / 2, (ARCH_Y0 + ARCH_Y1) / 2, (ARCH_Z0 + ARCH_Z1) / 2)
    const ribBrush = new Brush(tube); ribBrush.updateMatrixWorld()
    let step1 = ribBrush
    if (HALL_DOORS_ON) {                                          // ★㊶-3: 문 개구만 스위치 — 끄면 문 컷 skip(아치는 아래서 유지)
      const b1 = new Brush(doorCut); b1.updateMatrixWorld()
      step1 = ev.evaluate(ribBrush, b1, OP)
    }
    const b2 = new Brush(archCut); b2.updateMatrixWorld()
    let acc = ev.evaluate(step1, b2, OP)                       // ⚠㊴: 구 entablature 클립 제거(프리즈가 가림)
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
      const t = wallOf(d.k)                            // ★57 — 'cut5'면 넷도 살을 갖는다
      const { geometry: tube } = buildRibShell(makeRibCurve(), t)
      tube.rotateY(-d.phi)                             // rotateY(a) → 방위각 −a. 방위각 +φ에 놓으려면 −φ
      if (!HALL_DOORS_ON) return tube                  // ★㊶-3 임시 소등: 문 컷 없이 매끈한 관(형태 = 나머지 리브와 동일)
      const cut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
      cut.rotateY(Math.atan2(-d.dhat[1], d.dhat[0]))   // 로컬 +x(깊이축)를 문 법선 d̂에 정렬
      cut.translate(d.cx + d.dhat[0] * SHELL_RIB_R, d.sill + DOOR_H / 2, d.cz + d.dhat[1] * SHELL_RIB_R)
      const rb = new Brush(tube); rb.updateMatrixWorld()
      const cb = new Brush(cut); cb.updateMatrixWorld()
      return ev.evaluate(rb, cb, t > 0 ? SUBTRACTION : HOLLOW_SUBTRACTION).geometry   // ⚠㊴: entablature 클립 제거
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
  //  ★57: 살이 있으면 절단면이 저절로 '고리 단면'이 된다 → 윗캡(원판)은 끈다.
  //   ⚠아랫캡은 유지 — 'floor' 모드에서 그건 리브 부재가 아니라 **바닥 관통 구멍의 마개**다(R6 [128]).
  const cuts = useMemo(() => (RIB_CUT_ON ? ribCutSpec().filter(v => v.k !== 0) : []), [])
  const capTop = wallOf(1) === 0
  return (
    <group>
      {cut.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} onBeforeCompile={ribTintOBC} />
        </mesh>
      ))}
      <RibCutCaps cuts={cuts} top={capTop} />
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
export function RibStair() {
  const wedgeRef = useRef(), plateRef = useRef()
  const split = RIB_VICE_ON ? viceSplitIndex() : 0
  const nPlate = STAIR_STEPS - split
  const wedge = useMemo(() => (split > 0 ? buildViceWedge().geometry : null), [split])
  const newel = useMemo(() => (RIB_VICE_ON ? newelSpec() : null), [])
  const newelC = useMemo(() => (newel ? ribCenter(newel.cy / H) : null), [newel])
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const { pos, theta } = spiralPoint(f)
      if (i < split) {
        const c = ribCenter(spiralU(f))                          // 쐐기 = 축 중심
        dum.position.set(c.x, c.y + TREAD_THICK / 2, c.z)        // 상면을 판 상면과 정렬
        dum.rotation.set(0, -theta, 0)
        dum.updateMatrix()
        wedgeRef.current.setMatrixAt(i, dum.matrix)
      } else {
        dum.position.copy(pos)
        dum.rotation.set(0, -theta, 0)                           // 디딤판 장축(x=TREAD_DEPTH)이 방사 방향 — 구판 문법 유지
        dum.updateMatrix()
        plateRef.current.setMatrixAt(i - split, dum.matrix)
      }
    }
    if (wedgeRef.current) wedgeRef.current.instanceMatrix.needsUpdate = true
    plateRef.current.instanceMatrix.needsUpdate = true
  }, [split])
  return (
    <>
      {newel && (
        <mesh position={[newelC.x, newel.cy, newelC.z]} userData={{ walkable: false }}>
          <cylinderGeometry args={[RIB_NEWEL_R, RIB_NEWEL_R, newel.h, 24]} />
          <meshStandardMaterial {...RIB_MAT} onBeforeCompile={ribTintOBC} />
        </mesh>
      )}
      {wedge && (
        <instancedMesh ref={wedgeRef} args={[undefined, undefined, split]} userData={{ walkable: true }}>
          <primitive object={wedge} attach="geometry" />
          <meshStandardMaterial {...TREAD_MAT} />
        </instancedMesh>
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

// ── 착지 디스크(전망 플랫폼): 부양 판(방 디딤판 어휘). 온전한 원판, topLift로 높이 조정 ──
//  (갈림 디스크는 무릎길 슬롯이 필요해 아래 JunctionDisc가 따로 담당.)
function LandingDisc({ u, topLift = 0.1, r = LAND_R, dx = 0, dz = 0, half = false, rotY = 0 }) {
  const cx = rOf(u) + dx, topY = u * H + topLift
  const geoArgs = half ? [r, r, LAND_T, 40, 1, false, Math.PI, Math.PI] : [r, r, LAND_T, 40]  // 반원 = thetaLength π · thetaStart π → 평평한 면(지름변)이 +x 향(램프 쪽), 곡면은 −x(돔 중심)쪽
  return (
    <mesh position={[cx, topY - LAND_T / 2, dz]} rotation-y={rotY} userData={{ walkable: true }}>
      <cylinderGeometry args={geoArgs} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 갈림 착지장(JunctionLanding, ★②-재설계 v3 2026.07.06): 사각 판. 세 계단이 판 가장자리에서 시작(관통 없음).
//  무릎길은 +x 변(X_LAND_HI=xB)에 도착 · 전망(z−2.4)·하강(z+1.75)은 −x 변(X_LAND_LO)에서 밖으로 나감(위/아래).
//  전망을 '곧은 램프'로 바꾼 것과 짝(리브곡면 따라 판 위로 가로지르던 문제 소멸). 단순 박스.
function JunctionLanding() {
  const w = X_LAND_HI - X_LAND_LO
  return (
    <mesh position={[(X_LAND_LO + X_LAND_HI) / 2, U_KNEE_END * H + 0.1 - LAND_T / 2, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[w, LAND_T, 2 * Z_LAND]} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 착지 판넬(LandingPanel, ★1-③G): 나선 옆끝(z=+STAIR_R)에서 무릎길 중앙(z=0)으로 가로지르는 솔리드 착지판 ──
//  나선 도착 → 판넬 건너 중앙 → 중앙 계단. 무릎길 z 드리프트 폐기(비스듬함 소멸) + 계단 옆쏠림 없어져 관 이탈도 해소.
//  상면 = 계단 상면보다 살짝 아래(−TREAD_THICK/2−0.03) → 계단이 판넬 위에 떠(z파이팅 없음), 착지판은 얕게 파인 랜딩.
function LandingPanel() {
  const xC = rOf(U_SPIRAL_END)                                     // 나선 도착 x
  const yTop = H * U_SPIRAL_END - TREAD_THICK / 2 - 0.03           // 판넬 상면(계단 밑면보다 살짝 아래)
  const zC = (PANEL_Z0 + PANEL_Z1) / 2
  return (
    <mesh position={[xC, yTop - LAND_T / 2, zC]} userData={{ walkable: true }}>
      <boxGeometry args={[PANEL_DX, LAND_T, PANEL_Z1 - PANEL_Z0]} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 무릎길(KneeWalk, ★1-③B · 재작성 ★1-③E · 경사완화 ★1-③F · 중앙정렬 ★1-③G): 나선 나감 → 갈림 디스크 ──
//  ★1-③E (가): 나선이 −x로 나가므로 무릎길이 그대로 이어짐(평면 급반전 131°→9° 소멸) — 다리 폐기.
//  ★1-③F (ㄱ): 높이 = 리브 중심선과 곧은 현 KW_FLATTEN 블렌드 → 시작 62°→35°(관 안). 수평 균일(Δx=KW_GO) → 무더기·틈 없음(1-③D).
//  ★1-③G: z=0 중앙 정렬(드리프트 폐기) → 비스듬함 소멸. 나선 옆끝(z+STAIR_R)↔중앙(z=0)은 판넬(LandingPanel)이 이음.
export function KneeWalk() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const xA = rOf(U_SPIRAL_END), xB = X_LAND_HI                          // ★도착 x = 판 +x변(X_LAND_HI, 커플링 2026.07.07). 기본 = rOf(U_KNEE_END). 나선 끝 x → 판 +x변
    //  ⚠칸수(KW_STEPS)는 나선끝 기준이라, X_LAND_HI를 크게 넓히면 디딤판이 살짝 촘촘해짐(틈은 안 생김). 넓히는 방향이라 무해 — 필요 시 칸수도 커플링.
    const yA = H * U_SPIRAL_END, yB = H * U_KNEE_END                      // 현(chord) 양끝 높이 (나선끝·정션)
    for (let i = 0; i < KW_STEPS; i++) {
      const x = xA - (i + 0.5) * (xA - xB) / KW_STEPS                     // 수평 균일 간격
      const yCen = H * uOfX(x)                                            // 리브 중심선 높이(가파름)
      const yChord = yA + (yB - yA) * (xA - x) / (xA - xB)                // 곧은 현 높이(완만 ~25°)
      const y = (1 - KW_FLATTEN) * yCen + KW_FLATTEN * yChord             // 블렌드 → 완만화(중심축서 아래로 뜸)
      dum.position.set(x, y, 0)                                           // z=0 중앙 (드리프트 폐기, 1-③G)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <LandingPanel />
      <instancedMesh ref={ref} args={[undefined, undefined, KW_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[KW_TREAD_D, TREAD_THICK, KW_TREAD_W]} />
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
    for (let i = 0; i < DESC_STEPS; i++) {
      const y = yTop - (i + 0.5) * STEP_RISE
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
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH * 2]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
    </>
  )
}

// ── 1p8 전망(Lookout, ★1-③B · ②-재설계 v3): 갈림 착지장 −x 변에서 '곧은 램프'로 상행(z=JCT_UP_Z) → 플랫폼(막다름).
//  ★②v3: 리브곡면 따라(x=rOf) 상행하던 걸 곧은 램프(X_LAND_LO서 −x·경사 LOOKOUT_MAX_SLOPE)로 교체 —
//  곡면 상행은 첫 칸이 리브 중심선(x≈186)서 시작해 사각 판 위로 가로질렀음. 곧은 램프는 판 −x 가장자리서
//  밖으로 곧게 올라가 판을 안 지남. 플랫폼(z=0 보어 올려다보기)·높이·칸수는 그대로.
export function Lookout() {
  const ref = useRef()
  // 디스크 위치(노브 반영). discY = 디스크 윗면
  const discX = rOf(U_LOOKOUT_END) + LK_DISC_DX
  const discY = U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY
  const discZ = LK_DISC_DZ
  // 램프 도착 = 디스크 '중심' = 반원 지름변의 중점. 지름변은 반원 회전(LK_DISC_ROT)과 무관하게 항상 중심을 지나므로,
  //  어떤 튜닝값(위치·회전)이든 램프가 항상 지름변에 닿는다(불변식 — 튜닝값 무관하게 일정).
  const endX = discX, endZ = discZ
  const endY = discY - TREAD_THICK / 2                            // 램프 끝 윗면 ≈ 디스크 윗면(나란히 올라섬)
  const startX = X_LAND_LO, startY = U_KNEE_END * H, startZ = JCT_UP_Z
  const nSteps = Math.max(6, Math.round((endY - startY) / STEP_RISE))
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < nSteps; i++) {
      const t = (i + 1) / nSteps                                  // 판(시작) → 디스크 지름변(도착) 3D 직선 계단
      dum.position.set(startX + (endX - startX) * t, startY + (endY - startY) * t, startZ + (endZ - startZ) * t)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [nSteps, endX, endY, endZ])
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, nSteps]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH * 2]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      {/* ★반원 디스크 + 노브(2026.07.07): 램프가 지름변에 맞닿게 LK_DISC_ROT로 평평한 변을 램프 쪽으로 돌려 맞춤. */}
      <LandingDisc u={U_LOOKOUT_END} r={LK_PLAT_R} topLift={LK_DISC_LIFT + LK_DISC_DY}
        dx={LK_DISC_DX} dz={LK_DISC_DZ} half={LK_DISC_HALF} rotY={LK_DISC_ROT} />
    </>
  )
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
  slab((RM_X1 + PASS_X_DEEP) / 2, floor - t / 2, zc, PASS_X_DEEP - RM_X1, t, 2 * PASS_HW + 2 * t)
  wall((RM_X1 + PASS_X_CHEEK) / 2, (floor + CHEEK_TOP_NZ) / 2, zc - zw, PASS_X_CHEEK - RM_X1, CHEEK_TOP_NZ - floor, t)
  wall((RM_X1 + PASS_X_DEEP) / 2, (floor + CHEEK_TOP_PZ) / 2, zc + zw, PASS_X_DEEP - RM_X1, CHEEK_TOP_PZ - floor, t)

  // B. 방: 바닥 + 4벽 + 지붕. +x벽 입(하강 — 구 린텔 개구 치수 2zw×5.2) · +z벽 입(회랑 폭×CL_ROOF)
  //  ★바닥은 +z로 0.6 더 뻗어 회랑 바닥 링 시작(z≈5.2~5.4, φ0 방사변)에 겹침 — 직육면체↔원호 이음매 바닥 틈(줄무늬) 봉인.
  //   회랑 바닥이 0.02 아래라 z파이팅 없이 방 바닥이 위에 덮임. 걸을 때 0.02 단차(무시).
  slab((RM_X0 + RM_X1) / 2, floor - t / 2, (RM_Z0 + RM_Z1 + 0.6) / 2, RM_X1 - RM_X0, t, RM_Z1 - RM_Z0 + 0.6)
  wall(RM_X0 - t / 2, floor + RM_ROOF / 2, (RM_Z0 + RM_Z1) / 2, t, RM_ROOF + 2 * t, RM_Z1 - RM_Z0 + 2 * t)
  wall((RM_X0 + RM_X1) / 2, floor + RM_ROOF / 2, RM_Z0 - t / 2, RM_X1 - RM_X0 + 2 * t, RM_ROOF + 2 * t, t)
  wall(RM_X1 + t / 2, floor + RM_ROOF / 2, (RM_Z0 - t + zc - zw) / 2, t, RM_ROOF + 2 * t, (zc - zw) - (RM_Z0 - t))
  wall(RM_X1 + t / 2, floor + RM_ROOF / 2, (zc + zw + RM_Z1 + t) / 2, t, RM_ROOF + 2 * t, (RM_Z1 + t) - (zc + zw))
  wall(RM_X1 + t / 2, (2 * floor + RM_MOUTH_H + RM_ROOF + t) / 2, zc, t, RM_ROOF + t - RM_MOUTH_H, 2 * zw)
  // ★입(mouth) x경계 = 회랑 단면보다 0.3 안쪽(rIn+0.3 ~ rOut−0.3) — 방 벽(좌우 조각)이 회랑 벽 시작(rIn/rOut, φ0)을
  //  0.3씩 덮어 직육면체↔원호 옆 이음매 봉인. 구 −0.4(입이 더 넓음)는 벽 너머 빈 공간 노출 → 반전. 통행폭 4.6(회랑 5.2보다 좁은 문틀).
  const mX0 = CL_R - CL_HW + 0.3, mX1 = CL_R + CL_HW - 0.3
  wall((RM_X0 - t + mX0) / 2, floor + RM_ROOF / 2, RM_Z1 + t / 2, mX0 - (RM_X0 - t), RM_ROOF + 2 * t, t)
  wall((mX1 + RM_X1 + t) / 2, floor + RM_ROOF / 2, RM_Z1 + t / 2, (RM_X1 + t) - mX1, RM_ROOF + 2 * t, t)
  // 회랑 입 위 트랜섬/소핏: 방 천장(RM_ROOF)↔회랑 천장(CL_ROOF) 단차를 막음. ★CL_ROOF>RM_ROOF면 상승 소핏,
  //  반대면 구 헤더 — Math.abs로 양쪽 안전(음수 붕괴 방지). 낮은 천장서 시작해 높은 천장 위로 +t 물림(틈 봉인).
  wall((mX0 + mX1) / 2, floor + (RM_ROOF + CL_ROOF + t) / 2, RM_Z1 + t / 2, mX1 - mX0, Math.abs(CL_ROOF - RM_ROOF) + t, t)
  wall((RM_X0 + RM_X1) / 2, floor + RM_ROOF + t / 2, (RM_Z0 + RM_Z1) / 2, RM_X1 - RM_X0 + 2 * t, t, RM_Z1 - RM_Z0 + 2 * t)

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
  return (
    <group>
      {ring('fl', rIn - t, rOut + t, floor - 0.02, CL_PHI0, CL_PHI1, true)}
      {ring('rf', rIn - t, rOut + t, floor + CL_ROOF, CL_PHI0, CL_PHI1, false)}
      {cyl('i0', rIn, floor - t, floor + CL_ROOF, CL_PHI0, ST_PHI - mPhi)}
      {cyl('i1', rIn, floor - t, floor + CL_ROOF, ST_PHI + mPhi, CL_PHI1)}
      {cyl('ih', rIn, floor + ST_ROOF, floor + CL_ROOF, ST_PHI - mPhi, ST_PHI + mPhi)}
      {cyl('o0', rOut, floor - t, floor + CL_ROOF, CL_PHI0, CL_OP_P0)}
      {cyl('o1', rOut, floor - t, floor + CL_ROOF, CL_OP_P1, CL_PHI1)}
      {cyl('op', rOut, floor - t, floor + CL_SILL, CL_OP_P0, CL_OP_P1)}
      {cyl('oh', rOut, floor + CL_HEAD, floor + CL_ROOF, CL_OP_P0, CL_OP_P1)}
      {/* 끝캡(φ1 방사 평면) — 로컬 x = 반경 방향(rotation-y = −φ) */}
      <mesh position={[CL_R * Math.cos(CL_PHI1), floor + CL_ROOF / 2, CL_R * Math.sin(CL_PHI1)]} rotation-y={-CL_PHI1}>
        <boxGeometry args={[2 * CL_HW + 2 * t, CL_ROOF + 2 * t, t]} />
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
      {/* D. 스텁(1p10 자리표시자, φ=ST_PHI 방사 방향): 바닥(top −0.05)·측벽·지붕·문벽(문 = 1p11 물리 지점) */}
      <group rotation-y={-ST_PHI}>
        <mesh position={[(PASS_X_END - 0.6 + stX1) / 2, floor - 0.05 - t / 2, 0]} userData={{ walkable: true }}>
          <boxGeometry args={[stL + 1.0, t, 2 * ST_HW + 2 * t]} />
          <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={'sw' + s} position={[(PASS_X_END + stX1) / 2, floor + ST_ROOF / 2, s * (ST_HW + t / 2)]}>
            <boxGeometry args={[stL, ST_ROOF + 2 * t, t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[(PASS_X_END + stX1) / 2, floor + ST_ROOF + t / 2, 0]}>
          <boxGeometry args={[stL + t, t, 2 * ST_HW + 2 * t]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={'dj' + s} position={[PASS_X_END, floor + ST_ROOF / 2, s * (doorHW2 + sideW / 2)]}>
            <boxGeometry args={[t, ST_ROOF + 2 * t, sideW]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[PASS_X_END, (2 * floor + PASS_DOOR_H + ST_ROOF + t) / 2, 0]}>
          <boxGeometry args={[t, ST_ROOF + t - PASS_DOOR_H, PASS_DOOR_W]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* A(하강 채널) + B(방) 박스 대장 — 위 수식으로 채워진 B[] 일괄 렌더 */}
      {B.map((b, i) => (
        <mesh key={i} position={b.p} userData={b.walk ? { walkable: true } : undefined}>
          <boxGeometry args={b.s} />
          <meshStandardMaterial {...(b.walk ? FLOOR_MAT : SHELL_MAT)} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
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
  const floor = PASS_FLOOR_Y
  const n = LAMP_RIBS.length
  return (
    <group>
      {LAMP_RIBS.map((k, i) => {
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

// ── 테라스(1p12~15의 집 · 문 밖 = 1p11 공개) — y는 통로 바닥 파생(constants), 무단차 도착 ──
export function Terrace() {
  return (
    <mesh position={[0, TERRACE_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <ringGeometry args={[TERRACE_RIN, TERRACE_ROUT, 64, 1, -TERRACE_ARC / 2, TERRACE_ARC]} />
      <meshStandardMaterial color="#caa161" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}
