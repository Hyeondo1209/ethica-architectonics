import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

// ============================================================
//  Ethica Architectonics — 1부 (1~15) · 셸 B · 수직축
//  ★ 깨끗한 복구본: 립 온전(72개 전부) + 단순 나선 계단(꺾임/직각 직선계단 없음)
//    다음 단계에서 '나선 → 정사각 계단참 → 직선 오르막'(방식 a)을 여기에 얹는다.
// ============================================================

const R_BASE = 60, R_TOP = 35, H = 200, KNEE = 0.25, WIDTH = 0.02
const MERIDIANS = 72
const SHELL_RIB_R = 1.1

const RIB_PHI = 0
const SHAFT_R = 4.5
const SHAFT_TOP_U = 0.235

// ── 나선 계단 (테라스보다 살짝 아래 Y_LAND에서 끝남) ──
const STAIR_STEPS = 150
const STAIR_TURNS = 4.5             // 도착이 안쪽(θ=π, '12시' 방향)
const STAIR_R     = 2.8
const Y_LAND      = 47              // 나선 도착 = 계단참 높이 (테라스 y50보다 3 아래)
const U_LAND      = Y_LAND / H
const TREAD_DEPTH = 2.0             // 디딤판 깊이(부채형 완화: 2.8→2.0)
const TREAD_WIDTH = 1.0
const TREAD_THICK = 0.22
const POLE_R      = 0.4

// ── 정사각 계단참(landing) — 나선↔직선 전환을 받아주는 평평한 판 ──
const PAD_CX   = 40.2               // 중심 x (나선 도착 44.7을 확실히 받도록 키우고 안쪽으로)
const PAD_SIZE = 7.0

// ── 작은 계단참 — 나선 도착점 −z 옆에 (나선 진행방향을 받는 발판) ──
const SMALL_PAD_CX   = 44.2         // 나선 도착 x(≈44.7) 근처
const SMALL_PAD_CZ   = -2.0         // 도착점에서 −z 옆 (나선 진행방향)
const SMALL_PAD_SIZE = 3.0

// ── 직선 오르막 계단 (계단참 → 테라스), 안쪽(-x)으로 곧게 ──
const FLIGHT_STEPS = 8
const FLIGHT_WIDTH = 4.0
const FLIGHT_X0    = PAD_CX - PAD_SIZE / 2   // 계단참 안쪽 끝에서 시작

// ── 테라스 (직선 계단 착지 ≈35 를 받도록 안쪽으로) ──
const TERRACE_Y    = H * KNEE
const TERRACE_RIN  = 27
const TERRACE_ROUT = 33
const TERRACE_ARC  = 2.4

const DOWN = new THREE.Vector3(0, -1, 0)

function rOf(u) {
  const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
  return R_TOP + (R_BASE - R_TOP) * f
}
const ARRIVAL_R = rOf(KNEE)        // = 47.5

// 계단/샤프트 중심축 — 수직 고정
function axisPoint(u) {
  return new THREE.Vector3(ARRIVAL_R * Math.cos(RIB_PHI), H * u, ARRIVAL_R * Math.sin(RIB_PHI))
}

// ── ① 1인칭 컨트롤 ──
function FirstPersonControls() {
  const { camera, gl, scene } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: Math.PI, pitch: 0 })
  const ray  = useRef(new THREE.Raycaster())

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    const start = axisPoint(0)
    camera.position.set(start.x + STAIR_R, 1.6, start.z)
    look.current.yaw = Math.PI
    look.current.pitch = 0
    const down = (e) => (keys.current[e.code] = true)
    const up   = (e) => (keys.current[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    const el = gl.domElement
    const onDown = (e) => { drag.current = { active: true, lastX: e.clientX, lastY: e.clientY } }
    const onUp   = () => (drag.current.active = false)
    const onMove = (e) => {
      if (!drag.current.active) return
      look.current.yaw   -= (e.clientX - drag.current.lastX) * 0.0026
      look.current.pitch -= (e.clientY - drag.current.lastY) * 0.0026
      look.current.pitch = Math.max(-1.3, Math.min(1.3, look.current.pitch))
      drag.current.lastX = e.clientX
      drag.current.lastY = e.clientY
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [camera, gl])

  const SPEED = 4.5
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const { yaw, pitch } = look.current
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw))
    const move = new THREE.Vector3()
    const k = keys.current
    if (k['KeyW'] || k['ArrowUp'])    move.add(forward)
    if (k['KeyS'] || k['ArrowDown'])  move.sub(forward)
    if (k['KeyD'] || k['ArrowRight']) move.add(right)
    if (k['KeyA'] || k['ArrowLeft'])  move.sub(right)
    if (move.lengthSq() > 0) { move.normalize().multiplyScalar(SPEED * d); camera.position.add(move) }

    const flying = k['KeyQ'] || k['KeyE']
    if (flying) {
      let dy = 0
      if (k['KeyE']) dy += 1
      if (k['KeyQ']) dy -= 1
      camera.position.y += dy * SPEED * d
      camera.position.y = Math.max(1.6, Math.min(H - 4, camera.position.y))
    } else {
      const STEP_UP = 0.8, REACH = 2.6
      const origin = new THREE.Vector3(camera.position.x, camera.position.y + STEP_UP, camera.position.z)
      ray.current.set(origin, DOWN)
      ray.current.far = STEP_UP + REACH
      const hits = ray.current.intersectObjects(scene.children, true)
      let hitY = null
      for (const h of hits) {
        if (h.object.userData && h.object.userData.walkable) { hitY = h.point.y; break }
      }
      if (hitY !== null) {
        const targetY = hitY + 1.6
        camera.position.y += (targetY - camera.position.y) * Math.min(1, d * 14)
      } else {
        camera.position.y = Math.max(1.6, camera.position.y - 5 * d)
      }
    }
  })
  return null
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// ── 셸 B: 얇은 립 72개 (전부 온전) ──
function DomeRibs() {
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
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, 6, false]} />
      <meshStandardMaterial color="#bb8a4e" roughness={0.7} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

// ── 등반 샤프트 (수직 튜브) ──
function ClimbShaft() {
  const curve = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 80; i++) pts.push(axisPoint((i / 80) * SHAFT_TOP_U))
    return new THREE.CatmullRomCurve3(pts)
  }, [])
  return (
    <mesh>
      <tubeGeometry args={[curve, 160, SHAFT_R, 20, false]} />
      <meshStandardMaterial color="#a87c45" roughness={0.8} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Apex() {
  return (
    <group position={[0, H, 0]}>
      <pointLight color="#ffe3b0" intensity={2.2} distance={0} decay={0} />
      <mesh>
        <sphereGeometry args={[5, 28, 28]} />
        <meshBasicMaterial color="#fff1d4" />
      </mesh>
    </group>
  )
}

// ── 나선 계단 (단순 나선, Y_LAND에서 끝남) + 중앙 폴 ──
function RibStair() {
  const treadRef = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const t = i / (STAIR_STEPS - 1)
      const u = t * U_LAND
      const c = axisPoint(u)
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
    for (let i = 0; i <= 48; i++) pts.push(axisPoint((i / 48) * U_LAND))
    return new THREE.CatmullRomCurve3(pts)
  }, [])

  return (
    <>
      <instancedMesh ref={treadRef} args={[undefined, undefined, STAIR_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      <mesh>
        <tubeGeometry args={[poleCurve, 80, POLE_R, 12, false]} />
        <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
      </mesh>
    </>
  )
}

// ── 작은 계단참 — 나선 도착 발판 (나선 → 작은 참 → 큰 참) ──
function SmallLandingPad() {
  return (
    <mesh position={[SMALL_PAD_CX, Y_LAND, SMALL_PAD_CZ]} userData={{ walkable: true }}>
      <boxGeometry args={[SMALL_PAD_SIZE, TREAD_THICK, SMALL_PAD_SIZE]} />
      <meshStandardMaterial color="#d2aa68" roughness={0.82} />
    </mesh>
  )
}

// ── 정사각 계단참 — 나선 도착점의 평평한 판(방향 전환을 받아줌) ──
function LandingPad() {
  return (
    <mesh position={[PAD_CX, Y_LAND, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[PAD_SIZE, TREAD_THICK, PAD_SIZE]} />
      <meshStandardMaterial color="#cfa765" roughness={0.82} />
    </mesh>
  )
}

// ── 직선 오르막 계단 — 계단참 안쪽 끝에서 -x로 곧게 + 위로, 테라스에 착지 ──
function StraightFlight() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const RISER = (H * KNEE - Y_LAND) / FLIGHT_STEPS
    const RUN   = RISER / Math.tan(Math.PI / 6)            // 30° 경사
    for (let k = 0; k < FLIGHT_STEPS; k++) {
      const s = k + 1
      dum.position.set(FLIGHT_X0 - s * RUN, Y_LAND + s * RISER, 0)
      dum.rotation.set(0, 0, 0)                            // 회전 없음 = 곧은 계단
      dum.scale.set(0.5, 1, FLIGHT_WIDTH / TREAD_WIDTH)    // 깊이 살짝 줄이고 가로폭 넓힘
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
function Terrace() {
  return (
    <mesh position={[0, TERRACE_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <ringGeometry args={[TERRACE_RIN, TERRACE_ROUT, 64, 1, -TERRACE_ARC / 2, TERRACE_ARC]} />
      <meshStandardMaterial color="#caa161" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function App() {
  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 600, position: [0, 1.6, 0] }}>
        <color attach="background" args={['#e7d6ad']} />
        <fog attach="fog" args={['#e7d6ad', 30, 150]} />

        <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[30, 120, 20]} intensity={0.3} color="#ffe6bf" />

        <Ground />
        <DomeRibs />
        <ClimbShaft />
        <Apex />
        <RibStair />
        <SmallLandingPad />
        <LandingPad />
        <StraightFlight />
        <Terrace />
        <FirstPersonControls />
      </Canvas>

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 380, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#3a3324',
        textShadow: '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a6a48', marginBottom: 8 }}>
          Ethica · 수직축 · 나선→계단참→직선(방식 a)
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <b>W A S D</b> 걷기 · <b>드래그</b> 둘러보기 · 나선으로 테라스까지<br />
          <b>Q / E</b> 누르는 동안만 위아래 비행(미리보기).
        </div>
      </div>
    </>
  )
}
