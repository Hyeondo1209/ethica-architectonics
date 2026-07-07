// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(71) / ExplorationRib(CSG 문+아치) / Apex /
//            RibStair(문→무릎길 나선 + 절단 폴) / KneeWalk / RibJunction / Lookout(1p8) /
//            RevealPassage(연결 통로 — 끝 문 = 1p11 공개) / Terrace
//  ★1-③B(2026.07.05): 상부 구간 구현 — 관내 잔류(§1) 완성. LandingPad·StraightFlight 폐기 제거.
//  ★1-③A(2026.07.04): 탐험 리브 분리(72→71+1) + −x면 CSG 문 + 나선 재정의 + 폴 절단(1p7)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  rOf, uOfX, spiralPoint, SCALE, H, R_BASE, MERIDIANS, SHELL_RIB_R, RIB_RADIAL_SEG,
  STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R, Y_POLE_CUT, U_DOOR,
  DOOR_W, DOOR_H, DOOR_SILL_Y,
  U_SPIRAL_END, U_KNEE_END, KW_STEPS, KW_GO, KW_TREAD_D, KW_TREAD_W, KW_FLATTEN, PANEL_DX, PANEL_Z0, PANEL_Z1, LAND_R, LAND_T, X_LAND_LO, X_LAND_HI, Z_LAND,
  JCT_UP_Z, JCT_DN_Z, LOOKOUT_MAX_SLOPE, U_LOOKOUT_END, LK_STEPS, LK_PLAT_R, LK_DISC_LIFT,
  LK_DISC_HALF, LK_DISC_DX, LK_DISC_DY, LK_DISC_DZ, LK_DISC_ROT,
  DESC_SLOPE, DESC_STEPS, X_DESC0, X_DESC_END, PASS_FLOOR_Y,
  PASS_HW, PASS_T, PASS_ROOF_H, PASS_X_DEEP, PASS_X_END,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1,
  PASS_DOOR_W, PASS_DOOR_H,
  P9_STEPS, P9_HW0, P9_HW1, P9_ROOF0, P9_ROOF1, P9_X0, P9_X1,
  P10_HW, P10_ROOF, P10_X1, NICHE_D, NICHE_H, NICHES, PC_STEPS,
  TERRACE_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_ARC,
} from './constants'

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
// 디딤판·판(부양 요소) / 통로 외피 — Corridor 어휘 공유
const TREAD_MAT = { color: '#d6ab68', roughness: 0.8 }
const SHELL_MAT = { color: '#c2a062', roughness: 0.9 }
const FLOOR_MAT = { color: '#a98f5e', roughness: 0.95 }

// ── 셸: 경선 리브 71개 (= 단일 속성 실체, 전부 균일) — 탐험 리브(#0)는 ExplorationRib가 담당 ──
export function DomeRibs() {
  const ribRef = useRef()
  const curve = useMemo(() => makeRibCurve(), [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 1; i < MERIDIANS; i++) {            // i=0(φ=0) 제외 → 인스턴스 71개, 각도 체계는 불변
      dummy.rotation.set(0, (i / MERIDIANS) * Math.PI * 2, 0)
      dummy.updateMatrix()
      ribRef.current.setMatrixAt(i - 1, dummy.matrix)
    }
    ribRef.current.instanceMatrix.needsUpdate = true
  }, [curve])
  return (
    <instancedMesh ref={ribRef} args={[undefined, undefined, MERIDIANS - 1]}>
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, RIB_RADIAL_SEG, false]} />
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} />
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
    const tube = new THREE.TubeGeometry(makeRibCurve(), 200, SHELL_RIB_R, RIB_RADIAL_SEG, false)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    // ① 문 자르개: 세로 슬롯 상자 — x중심을 −x벽(rOf(U_DOOR)−SHELL_RIB_R ≈ 282)에, 깊이 = SHELL_RIB_R(6)
    //   → x∈[279,285]: −x면(≈282)만 관통, 중심(288)·+x벽(294)에는 못 미침.
    const wallX = rOf(U_DOOR) - SHELL_RIB_R
    const doorCut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
    doorCut.translate(wallX, DOOR_SILL_Y + DOOR_H / 2, 0)
    // ② 아치 자르개: 축정렬 상자(constants ARCH_*) — 하강 보행자 발–머리 대각 띠를 덮는 최소 창.
    //   y 상한(갈림+0.2)을 넘기면 남은 벽이 줄어 '지붕 위 시선' 누출 — 린텔(LINTEL_Y1)과 짝(검증 21·22항).
    const archCut = new THREE.BoxGeometry(ARCH_X1 - ARCH_X0, ARCH_Y1 - ARCH_Y0, ARCH_Z1 - ARCH_Z0)
    archCut.translate((ARCH_X0 + ARCH_X1) / 2, (ARCH_Y0 + ARCH_Y1) / 2, (ARCH_Z0 + ARCH_Z1) / 2)
    const ribBrush = new Brush(tube); ribBrush.updateMatrixWorld()
    const b1 = new Brush(doorCut); b1.updateMatrixWorld()
    const step1 = ev.evaluate(ribBrush, b1, HOLLOW_SUBTRACTION)
    const b2 = new Brush(archCut); b2.updateMatrixWorld()
    return ev.evaluate(step1, b2, HOLLOW_SUBTRACTION).geometry
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} />
    </mesh>
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
export function RibStair() {
  const treadRef = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const { pos, theta } = spiralPoint(f)
      dum.position.copy(pos)
      dum.rotation.set(0, -theta, 0)                 // 디딤판 장축(x=TREAD_DEPTH)이 방사 방향 — 구판 문법 유지
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    }
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={treadRef} args={[undefined, undefined, STAIR_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      <mesh position={[R_BASE, Y_POLE_CUT / 2, 0]}>
        <cylinderGeometry args={[POLE_R, POLE_R, Y_POLE_CUT, 12]} />
        <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
      </mesh>
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

// ── 연결 통로(RevealPassage, ★재구성 2026.07.07): 아치 밑 하강 후, 리브 밖 통로 본체를 3구간으로 ──
//  '하나에서 여럿으로'(게루 9·10 이행): 1p9 = 폭·천장 계단식으로 '더해짐'(실재성↑→속성↑) →
//  1p10 = 넓은 방 + 흩어진 독립 벽감(각 속성은 자기 통해 파악) → 문 압축(폭·천장 수축) → 문 = 1p11 공개.
//  z중심 = JCT_DN_Z. 밀폐(스포 3중 ③): 바닥·볼벽·지붕이 폭 따라 넓어져 유지 + 디스크 밑 봉인 슬랩(PASS_X_DEEP).
//  ⚠수직 립 배열 금지(리브 전용 서명 §2-C). 통로 본체는 리브 밖이라 폭·천장 자유(검증 = 리브/이웃 무충돌).
export function RevealPassage() {
  const zc = JCT_DN_Z
  const t = PASS_T
  const floor = PASS_FLOOR_Y
  const doorHW = PASS_DOOR_W / 2
  const maxHW = P10_HW + NICHE_D                       // 바닥·1p10 지붕이 벽감 깊이까지 덮음(밀폐)
  const zWall = (hw) => hw + t / 2                     // 볼벽 중심 z 오프셋

  // ── 세그먼트: 1p9 증가 단(폭·천장↑) → 1p10 방(벽감) → 압축 단(폭·천장↓ → 문목=문) ──
  const segs = []
  for (let i = 0; i < P9_STEPS; i++) {                                   // 1p9: 이산 계단(첫 단=시작값 → '더해짐')
    const a = i / P9_STEPS, b = (i + 1) / P9_STEPS, f = P9_STEPS > 1 ? i / (P9_STEPS - 1) : 1
    segs.push({ xHi: P9_X0 - a * (P9_X0 - P9_X1), xLo: P9_X0 - b * (P9_X0 - P9_X1),
      hw: P9_HW0 + (P9_HW1 - P9_HW0) * f, roof: P9_ROOF0 + (P9_ROOF1 - P9_ROOF0) * f, niche: false })
  }
  segs.push({ xHi: P9_X1, xLo: P10_X1, hw: P10_HW, roof: P10_ROOF, niche: true })   // 1p10 독립 방
  for (let i = 0; i < PC_STEPS; i++) {
    const a = i / PC_STEPS, b = (i + 1) / PC_STEPS
    segs.push({ xHi: P10_X1 - a * (P10_X1 - PASS_X_END), xLo: P10_X1 - b * (P10_X1 - PASS_X_END),
      hw: P10_HW + (doorHW - P10_HW) * b, roof: P10_ROOF + (PASS_DOOR_H - P10_ROOF) * b, niche: false })
  }

  return (
    <group>
      {/* 디스크 밑 봉인 슬랩 — 리브 하부면 물림점(PASS_X_DEEP)까지(갈림 디스크 아래 스포 봉인, 유지) */}
      <mesh position={[(P9_X0 + PASS_X_DEEP) / 2, floor - t / 2, zc]} userData={{ walkable: true }}>
        <boxGeometry args={[PASS_X_DEEP - P9_X0, t, 2 * PASS_HW + 2 * t]} />
        <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
      </mesh>

      {/* 각 세그먼트: 바닥(walkable) + 볼벽(니치 세그 제외 — 아래 벽감 로직이 담당) + 지붕 */}
      {segs.map((s, k) => {
        const len = s.xHi - s.xLo, xc = (s.xHi + s.xLo) / 2
        const wallH = s.roof + t
        const zw = s.niche ? maxHW : s.hw
        return (
          <group key={'sg' + k}>
            <mesh position={[xc, floor - t / 2, zc]} userData={{ walkable: true }}>
              <boxGeometry args={[len, t, 2 * zw + 2 * t]} />
              <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
            </mesh>
            {!s.niche && [-1, 1].map((sd) => (
              <mesh key={'w' + sd} position={[xc, floor + wallH / 2, zc + sd * zWall(s.hw)]}>
                <boxGeometry args={[len, wallH, t]} />
                <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
              </mesh>
            ))}
            <mesh position={[xc, floor + s.roof + t / 2, zc]}>
              <boxGeometry args={[len, t, 2 * zw + 2 * t]} />
              <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      })}

      {/* 천장 라이저 — 세그 경계 천장 높이차를 수직으로 막음(위 틈·누출 방지) */}
      {segs.slice(0, -1).map((s, k) => {
        const n = segs[k + 1]
        const lo = Math.min(s.roof, n.roof), hi = Math.max(s.roof, n.roof)
        if (hi - lo < 0.05) return null
        const zw = (s.niche || n.niche) ? maxHW : Math.max(s.hw, n.hw)
        return (
          <mesh key={'rz' + k} position={[s.xLo, floor + (lo + hi) / 2 + t / 2, zc]}>
            <boxGeometry args={[t, hi - lo, 2 * zw + 2 * t]} />
            <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
          </mesh>
        )
      })}

      {/* 1p10 독립 벽감(니치) — 볼벽 오목: side별 볼벽을 니치 x구간 빼고 조각 + 오목 뒷벽·어깨·상단·위 인방 */}
      {[-1, 1].map((side) => {
        const ns = NICHES.filter((nn) => nn[1] === side).map((nn) => ({ xc: nn[0], w: nn[2] })).sort((a, b) => b.xc - a.xc)
        const zBase = side * zWall(P10_HW)
        const zBack = side * (P10_HW + NICHE_D + t / 2)
        const zMid = side * (P10_HW + NICHE_D / 2 + t / 2)
        const wallH = P10_ROOF + t
        const P = []
        let xCur = P9_X1
        ns.forEach((nn, i) => {
          const nHi = nn.xc + nn.w / 2, nLo = nn.xc - nn.w / 2
          if (xCur - nHi > 0.02) P.push(<mesh key={`p${side}_${i}a`} position={[(xCur + nHi) / 2, floor + wallH / 2, zc + zBase]}><boxGeometry args={[xCur - nHi, wallH, t]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>)
          P.push(<mesh key={`p${side}_${i}b`} position={[nn.xc, floor + NICHE_H / 2, zc + zBack]}><boxGeometry args={[nn.w, NICHE_H, t]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>)
          ;[nHi, nLo].forEach((xe, j) => P.push(<mesh key={`p${side}_${i}c${j}`} position={[xe, floor + NICHE_H / 2, zc + zMid]}><boxGeometry args={[t, NICHE_H, NICHE_D]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>))
          P.push(<mesh key={`p${side}_${i}d`} position={[nn.xc, floor + NICHE_H + t / 2, zc + zMid]}><boxGeometry args={[nn.w, t, NICHE_D]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>)
          P.push(<mesh key={`p${side}_${i}e`} position={[nn.xc, floor + (NICHE_H + P10_ROOF + t) / 2, zc + zBase]}><boxGeometry args={[nn.w, P10_ROOF + t - NICHE_H, t]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>)
          xCur = nLo
        })
        if (xCur - P10_X1 > 0.02) P.push(<mesh key={`p${side}_last`} position={[(xCur + P10_X1) / 2, floor + wallH / 2, zc + zBase]}><boxGeometry args={[xCur - P10_X1, wallH, t]} /><meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} /></mesh>)
        return <group key={'nw' + side}>{P}</group>
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
