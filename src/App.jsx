import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

// ============================================================
//  Ethica Architectonics — 1부 (1~15) 경선-돔 기하 코어
//  설계 명세 v0.2 §6 한 조각:
//    "속 빈 경선 기둥 1개 → 회전 복제로 돔 골격 → 광원 apex 자리표시"
//  경선 = 짧은 수직 바닥 → 수평 셸프 → 긴 수직 상승(빛 속으로 끊김).
// ============================================================

// ── 돔 치수 ──
const R_BASE    = 60      // 바닥 경선 반지름
const R_TOP     = 35       // 꼭대기(수직 기둥) 반지름 — 0이 아니라 작게 → 중앙 빛기둥
const H         = 200     // ▶ 총 높이. 키우면 '수직 상승'이 길어짐
const MERIDIANS = 72      // ▶ 경선 개수(시각 밀도). 24·48·72로 바꿔보며 판단

// ── 셸프(전환) 조절 — 이 둘이 '변곡' 손잡이 ──
const KNEE      = 0.25    // ▶ 셸프가 앉는 높이(0~1). 낮출수록 셸프가 아래로, 위 수직이 길어짐
const WIDTH     = 0.02    // ▶ 셸프 펼침. 작을수록 더 납작·수평한 셸프 / 클수록 비스듬

const RIB_R     = 3.5     // 경선 굵기(반지름, m)

// ── 1인칭 컨트롤 (기존 그대로 재활용) ──
function FirstPersonControls() {
  const { camera, gl } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    camera.position.set(0, 1.6, 0)
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
    // ★ Q/E로 위아래 비행 (테라스 높이 미리보기). 1.6m ~ 꼭대기 사이로 제한
    let dy = 0
    if (k['KeyE']) dy += 1
    if (k['KeyQ']) dy -= 1
    camera.position.y += dy * SPEED * d
    camera.position.y = Math.max(1.6, Math.min(H - 4, camera.position.y))
  })
  return null
}

// ── 바닥 (따뜻한 톤) ──
function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// ── ① 경선 한 줄 — 반지름을 '높이의 함수'로 정의 ──
//   u = 정규화 높이(0~1).  f(u) = 0.5*(1 - tanh((u-KNEE)/WIDTH))  → R_BASE에서 R_TOP로 부드러운 계단.
//   · u 작음(바닥): f≈1 → r≈R_BASE, 거의 변화 없음 = 짧은 수직 바닥
//   · u≈KNEE      : f가 1→0으로 빠르게 = 수평 셸프(안쪽으로 휨). WIDTH가 작을수록 더 납작
//   · u 큼(꼭대기): f≈0 → r≈R_TOP 고정 = 긴 수직 상승
function useMeridianCurve() {
  return useMemo(() => {
    const pts = []
    const SEG = 160
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG
      const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
      const r = R_TOP + (R_BASE - R_TOP) * f
      const y = H * u
      pts.push(new THREE.Vector3(r, y, 0))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])
}

// ── ② 경선 1개를 회전 복제 → 돔 골격 (InstancedMesh 재활용) ──
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
      {/* (곡선, 길이방향 분할, 굵기, 단면 분할, 닫힘여부) */}
      <tubeGeometry args={[curve, 200, RIB_R, 8, false]} />
      <meshStandardMaterial color="#bb8a4e" roughness={0.7} metalness={0} />
    </instancedMesh>
  )
}

// ── ③ 광원 apex 자리표시 (수직 기둥 끝을 빛으로 덮음) ──
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

export default function App() {
  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 600, position: [0, 1.6, 0] }}>
        {/* 따뜻한 대기 — 위로 갈수록 안개+빛에 녹아들어 끝이 사라짐 */}
        <color attach="background" args={['#e7d6ad']} />
        <fog attach="fog" args={['#e7d6ad', 30, 150]} />

        <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
        <directionalLight position={[30, 120, 20]} intensity={0.3} color="#ffe6bf" />

        <Ground />
        <Dome />
        <Apex />
        <FirstPersonControls />
      </Canvas>

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 320, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#3a3324',
        textShadow: '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a6a48', marginBottom: 8 }}>
          Ethica · 1p1–1p15 · 경선-돔 기하 코어
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <b>W A S D</b> 이동 · 화면 <b>드래그</b>로 둘러보기<br />
          위를 올려다보면 경선들이 빛 속으로 무한히 솟아오릅니다.
        </div>
      </div>
    </>
  )
}
