// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(리브 71 — #0 제외) / ExplorationRib(탐험 리브 = CSG 문) /
//            Apex / RibStair(문→무릎길 나선 + 절단 폴) / LandingPad·StraightFlight(⚠️폐기 예정 ③B) / Terrace
//  ★1-③A(2026.07.04): 탐험 리브 분리(72→71+1) + −x면 CSG 문 + 나선 재정의(문 시작·위상 π·f축) + 폴 절단(1p7)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  rOf, spiralPoint, SCALE, H, R_BASE, MERIDIANS, SHELL_RIB_R, RIB_RADIAL_SEG,
  STAIR_STEPS, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R, Y_POLE_CUT, U_DOOR,
  DOOR_W, DOOR_H, DOOR_SILL_Y,
  CLIMB_TOP, PAD_SIZE, TERRACE_EDGE, FLIGHT_STEPS, FLIGHT_WIDTH,
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

// ── 탐험 리브(#0, φ=0): 형태·재질은 나머지와 완전 동일(LOCKED) — 유일한 차이 = −x면(통로쪽) CSG 문 ──
//  문은 '합의된 기능'이지 형태 차별화가 아니다(§1). +x(바깥)면은 그대로 → 리브 불투명 = 스포 3중 차단의 ①.
export function ExplorationRib() {
  const geo = useMemo(() => {
    const tube = new THREE.TubeGeometry(makeRibCurve(), 200, SHELL_RIB_R, RIB_RADIAL_SEG, false)
    // 자르개: 세로 슬롯 상자 — x중심을 −x벽(rOf(U_DOOR)−SHELL_RIB_R ≈ 282)에, 깊이 = SHELL_RIB_R(6)
    //  → x∈[벽−3, 벽+3]=[279,285]: −x면(≈282)만 관통, 중심(288)·+x벽(294)에는 못 미침(바깥 불투명 보존).
    //  관은 열린 껍질(두께 0)이므로 HOLLOW_SUBTRACTION — 겹치는 면만 제거, 뚜껑 안 생김(Corridor 박스벽 전례).
    const wallX = rOf(U_DOOR) - SHELL_RIB_R
    const cutter = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
    cutter.translate(wallX, DOOR_SILL_Y + DOOR_H / 2, 0)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const ribBrush = new Brush(tube); ribBrush.updateMatrixWorld()
    const cutBrush = new Brush(cutter); cutBrush.updateMatrixWorld()
    return ev.evaluate(ribBrush, cutBrush, HOLLOW_SUBTRACTION).geometry
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

// ── 나선 계단(★1-③A 재정의): 문(RIB_Y) → 무릎길 진입. f축(constants.spiralPoint) 위에 디딤판 배치 ──
//  · 시작 위상 π(SPIRAL_PHASE) = 첫 디딤판이 문 안쪽 −x → 통로 계단 정상(y74·x→288)에서 바로 밟힘
//    (f=(i+0.5)/N 반 칸 오프셋: 첫 판이 계단 윗면 위 ≈0.08 부양 — 교차 없이 인접)
//  · 폴(1p7 device): 외부 지지의 '가설' — 지면(y=0) 뿌리에서 올라 1p6 지점(Y_POLE_CUT)에서 종단,
//    평면 캡(뭉툭·기본형). 이후 디딤판 무지지 = 실체의 자기원인(1p7 deps=[1p6,D1] 전사).
//    절단점이 무릎 아래 수직 구간이므로 폴 = 닫힌 수직 원기둥(x=R_BASE)이 정확(가드 = constants).
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
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      <mesh position={[R_BASE, Y_POLE_CUT / 2, 0]}>
        <cylinderGeometry args={[POLE_R, POLE_R, Y_POLE_CUT, 12]} />
        <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
      </mesh>
    </>
  )
}

// ── 계단참 — ⚠️폐기 예정(1-③B: KneeWalk로 대체). 임시 착지(새 나선 끝 CLIMB_TOP) ──
export function LandingPad() {
  return (
    <mesh position={[CLIMB_TOP.x, CLIMB_TOP.y, CLIMB_TOP.z]} userData={{ walkable: true }}>
      <boxGeometry args={[PAD_SIZE, TREAD_THICK, PAD_SIZE]} />
      <meshStandardMaterial color="#cfa765" roughness={0.82} />
    </mesh>
  )
}

// ── 직선 다리 — ⚠️폐기 예정(1-③B: 무릎길·연결 통로로 대체). 관외 노출 = 옛 세계의 잔재 ──
export function StraightFlight() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const dx = TERRACE_EDGE.x - CLIMB_TOP.x
    const dy = TERRACE_EDGE.y - CLIMB_TOP.y
    const rotZ = Math.atan2(dy, dx)
    for (let k = 0; k < FLIGHT_STEPS; k++) {
      const t = (k + 0.5) / FLIGHT_STEPS
      dum.position.set(CLIMB_TOP.x + dx * t, CLIMB_TOP.y + dy * t, 0)
      dum.rotation.set(0, 0, rotZ)
      dum.scale.set(1, 1, FLIGHT_WIDTH / TREAD_WIDTH)
      dum.updateMatrix()
      ref.current.setMatrixAt(k, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, FLIGHT_STEPS]} userData={{ walkable: true }}>
      <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
      <meshStandardMaterial color="#d6ab68" roughness={0.8} />
    </instancedMesh>
  )
}

// ── 테라스 ──
export function Terrace() {
  return (
    <mesh position={[0, TERRACE_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <ringGeometry args={[TERRACE_RIN, TERRACE_ROUT, 64, 1, -TERRACE_ARC / 2, TERRACE_ARC]} />
      <meshStandardMaterial color="#caa161" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}
