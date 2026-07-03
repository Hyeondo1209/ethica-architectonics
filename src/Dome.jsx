// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(경선 리브 = 단일 속성 실체) / Apex /
//            RibStair(리브 안 나선+폴) / LandingPad / StraightFlight / Terrace
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import {
  rOf, ribCenter, SCALE, H, MERIDIANS, SHELL_RIB_R,
  U_LAND, STAIR_STEPS, STAIR_TURNS, STAIR_R, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R,
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

// ── 셸: 얇은 경선 리브 72개 (= 단일 속성 실체, 전부 균일) ──
export function DomeRibs() {
  const ribRef = useRef()
  const curve = useMemo(() => {
    const pts = []; const SEG = 160
    for (let i = 0; i <= SEG; i++) { const u = i / SEG; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) }
    return new THREE.CatmullRomCurve3(pts)
  }, [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < MERIDIANS; i++) {
      dummy.rotation.set(0, (i / MERIDIANS) * Math.PI * 2, 0)
      dummy.updateMatrix()
      ribRef.current.setMatrixAt(i, dummy.matrix)
    }
    ribRef.current.instanceMatrix.needsUpdate = true
  }, [curve])
  return (
    <instancedMesh ref={ribRef} args={[undefined, undefined, MERIDIANS]}>
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, 10, false]} />
      <meshStandardMaterial color="#bb8a4e" roughness={0.7} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
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

// ── 나선 계단: φ=0 리브 '안'을 따라 오름 (리브 중심선 ribCenter 기준) + 중앙 폴 ──
export function RibStair() {
  const treadRef = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const t = i / (STAIR_STEPS - 1)
      const u = t * U_LAND
      const c = ribCenter(u)                          // 높이별 리브 중심
      const th = t * STAIR_TURNS * Math.PI * 2
      dum.position.set(c.x + STAIR_R * Math.cos(th), c.y, c.z + STAIR_R * Math.sin(th))
      dum.rotation.set(0, -th, 0)
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    }
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [])

  const poleCurve = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 80; i++) pts.push(ribCenter((i / 80) * U_LAND))
    return new THREE.CatmullRomCurve3(pts)
  }, [])

  return (
    <>
      <instancedMesh ref={treadRef} args={[undefined, undefined, STAIR_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      <mesh>
        <tubeGeometry args={[poleCurve, 100, POLE_R, 12, false]} />
        <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
      </mesh>
    </>
  )
}

// ── 계단참 — 나선 도착 발판(리브 위) ──
export function LandingPad() {
  return (
    <mesh position={[CLIMB_TOP.x, CLIMB_TOP.y, CLIMB_TOP.z]} userData={{ walkable: true }}>
      <boxGeometry args={[PAD_SIZE, TREAD_THICK, PAD_SIZE]} />
      <meshStandardMaterial color="#cfa765" roughness={0.82} />
    </mesh>
  )
}

// ── 직선 다리 — 나선 top → 중앙 테라스. z=0 평면에서 보간(완만한 직선계단) ──
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
