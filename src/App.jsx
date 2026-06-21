import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

// ============================================================
//  Ethica Architectonics — 1부 (1~15)
//  · 경선-돔 기하 코어 (확정)
//  · ★ 이번 조각(재작업): 경선 립 '하나의 튜브 속' 나선 계단
//    명세 §3 ①상승 — "좁은 기둥(=립) 내부 나선 상승 → 셸프 높이로"
//    립이 외피(셸), 그 안에 단 있는 계단이 휘감아 오른다.
// ============================================================

// ── 돔 치수 (확정) ──
const R_BASE    = 60
const R_TOP     = 35
const H         = 200
const MERIDIANS = 72
const KNEE      = 0.25
const WIDTH     = 0.02
const RIB_R     = 3.5     // 립(튜브) 반지름 → 계단이 들어갈 '외피'의 안지름

// ── ★ 립 속 나선 계단 치수 ──
const STAIR_TOP_U  = KNEE          // 도착 높이: u=0.25 → y=50 (셸프)
const STAIR_STEPS  = 140           // ▶ 계단 수(=매끄러움/완만함). 리저 = 50/STEPS
const STAIR_TURNS  = 7.5           // ▶ 나선 회전 수
const STAIR_R      = 1.8           // ▶ 헬릭스 반지름(립 중심선 → 디딤판 중심). RIB_R(3.5)보다 작게
const TREAD_DEPTH  = 2.6           // 디딤판 깊이(반지름 방향) — 깊게 잡아 단 사이 빈틈 방지
const TREAD_WIDTH  = 0.9           // 디딤판 폭(접선 방향)
const TREAD_THICK  = 0.22
const POLE_R       = 0.35          // 중앙 뉴얼 폴 굵기

const RIB_PHI = 0                  // ▶ 계단이 들어갈 립의 각도(0 = +x 방향 립)
const DOWN = new THREE.Vector3(0, -1, 0)

// 선택된 립(φ=RIB_PHI)의 중심선 한 점 — u(0~1) → (x,y,z)
//   r(u)=35+25·f(u),  f(u)=0.5(1−tanh((u−KNEE)/WIDTH)),  y=H·u
function ribCenter(u) {
  const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
  const r = R_TOP + (R_BASE - R_TOP) * f
  const x = r * Math.cos(RIB_PHI)
  const z = r * Math.sin(RIB_PHI)
  return new THREE.Vector3(x, H * u, z)
}

// ── ① 1인칭 컨트롤 — '발밑 짧은 레이캐스트'로 계단 한 단씩 오름 ──
function FirstPersonControls() {
  const { camera, gl, scene } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: 0, pitch: 0 })
  const ray  = useRef(new THREE.Raycaster())

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    // ★ 시작점 = 선택된 립의 계단 입구(첫 디딤판 위), 나선 오르는 방향을 향함
    const start = ribCenter(0)
    camera.position.set(start.x + STAIR_R, 1.6, start.z)
    look.current.yaw = Math.PI
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

    // 수평 이동 (y성분 0)
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
      // Q/E 누르는 동안만 자유 수직 비행(미리보기)
      let dy = 0
      if (k['KeyE']) dy += 1
      if (k['KeyQ']) dy -= 1
      camera.position.y += dy * SPEED * d
      camera.position.y = Math.max(1.6, Math.min(H - 4, camera.position.y))
    } else {
      // ★ 텔레포트 버그 해결: '발 바로 위(+0.8m)'에서 짧은 거리만 아래로 탐지.
      //   → 위쪽 코일이 아니라, 지금 딛고 있는/한 단 위의 면만 잡힌다.
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
        // 발밑에 아무 것도 없으면(계단 끝에서 벗어남) 부드럽게 하강
        camera.position.y = Math.max(1.6, camera.position.y - 5 * d)
      }
    }
  })
  return null
}

// ── 바닥 (walkable) ──
function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// ── 경선 곡선 ──
function useMeridianCurve() {
  return useMemo(() => {
    const pts = []
    const SEG = 160
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG
      const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
      const r = R_TOP + (R_BASE - R_TOP) * f
      pts.push(new THREE.Vector3(r, H * u, 0))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])
}

// ── 경선 1개 → 회전 복제 → 돔 골격 (★ DoubleSide: 립 안쪽에서도 외피로 보이게) ──
function Dome() {
  const ribRef = useRef()
  const curve = useMeridianCurve()
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < MERIDIANS; i++) {
      dummy.rotation.set(0, (i / MERIDIANS) * Math.PI * 2, 0)
      dummy.updateMatrix()
      ribRef.current.setMatrixAt(i, dummy.matrix)
    }
    ribRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ribRef} args={[undefined, undefined, MERIDIANS]}>
      <tubeGeometry args={[curve, 200, RIB_R, 8, false]} />
      <meshStandardMaterial color="#bb8a4e" roughness={0.7} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

// ── 광원 apex ──
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

// ── ★ 립 속 나선 계단 — 디딤판(InstancedMesh) + 중앙 뉴얼 폴 ──
function RibStair() {
  const treadRef = useRef()

  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const t = i / STAIR_STEPS
      const u = t * STAIR_TOP_U          // 0 → 0.25
      const c = ribCenter(u)             // 립 중심선(살짝 안쪽으로 휨)
      const th = t * STAIR_TURNS * Math.PI * 2
      // 중심선 둘레에 디딤판 배치 (수평 단면 근사)
      dum.position.set(c.x + STAIR_R * Math.cos(th), c.y, c.z + STAIR_R * Math.sin(th))
      dum.rotation.set(0, -th, 0)        // 디딤판 깊이축을 반지름 방향으로
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    }
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [])

  // 중앙 뉴얼 폴 (립 중심선을 따라가는 가는 튜브)
  const poleCurve = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 48; i++) pts.push(ribCenter((i / 48) * STAIR_TOP_U))
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

export default function App() {
  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 600, position: [0, 1.6, 0] }}>
        <color attach="background" args={['#e7d6ad']} />
        <fog attach="fog" args={['#e7d6ad', 30, 150]} />

        <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
        <directionalLight position={[30, 120, 20]} intensity={0.3} color="#ffe6bf" />

        <Ground />
        <Dome />
        <Apex />
        <RibStair />
        <FirstPersonControls />
      </Canvas>

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 340, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#3a3324',
        textShadow: '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a6a48', marginBottom: 8 }}>
          Ethica · 1p1–1p15 · 립 속 나선 계단
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          한 경선 립 안에서 시작합니다. <b>W A S D</b> 걷기 · <b>드래그</b>로 둘러보기<br />
          나선 계단을 따라 한 단씩 올라 셸프 높이에 닿습니다.<br />
          <b>Q / E</b> 누르는 동안만 위아래 비행(미리보기).
        </div>
      </div>
    </>
  )
}
