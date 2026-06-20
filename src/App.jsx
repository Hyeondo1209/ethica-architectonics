import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'

// ── 1인칭 컨트롤 (슬라이스 1과 동일) ──
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
    camera.position.y = 1.6
  })
  return null
}

// ── 바닥 (동일) ──
function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color="#b7b2a6" roughness={1} />
    </mesh>
  )
}

// ── 구조 A 무한 반복 (슬라이스 2와 동일) ──
function Structures() {
  const baseRef = useRef(), colRef = useRef(), roofRef = useRef()
  const GRID = 21, SPACING = 16
  const offset = (GRID - 1) * SPACING / 2
  const total = GRID * GRID
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const colOffsets = [[-2.4, -2.4], [2.4, -2.4], [2.4, 2.4], [-2.4, 2.4]]
    let bi = 0, ci = 0, ri = 0
    for (let gx = 0; gx < GRID; gx++) {
      for (let gz = 0; gz < GRID; gz++) {
        const cx = gx * SPACING - offset, cz = gz * SPACING - offset
        dummy.position.set(cx, 0.15, cz); dummy.updateMatrix(); baseRef.current.setMatrixAt(bi++, dummy.matrix)
        dummy.position.set(cx, 4.5,  cz); dummy.updateMatrix(); roofRef.current.setMatrixAt(ri++, dummy.matrix)
        for (const [ox, oz] of colOffsets) {
          dummy.position.set(cx + ox, 2.3, cz + oz); dummy.updateMatrix()
          colRef.current.setMatrixAt(ci++, dummy.matrix)
        }
      }
    }
    baseRef.current.instanceMatrix.needsUpdate = true
    colRef.current.instanceMatrix.needsUpdate  = true
    roofRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={baseRef} args={[undefined, undefined, total]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.3, 6]} /><meshStandardMaterial color="#ece8df" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={colRef} args={[undefined, undefined, total * 4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.36, 4, 20]} /><meshStandardMaterial color="#ece8df" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, total]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.4, 6.4]} /><meshStandardMaterial color="#ece8df" roughness={0.85} />
      </instancedMesh>
    </>
  )
}

// ── 표시할 정리 (노션/구획 문서 본문 그대로 — 해석은 안 건드림) ──
const PROPS = [
  ['1p1', '실체는 본성상 자신의 변용에 앞선다.'],
  ['1p2', '서로 다른 속성을 소유하는 두 실체는 공통되는 것을 갖지 않는다.'],
  ['1p3', '공통점 없는 사물들은 하나가 다른 것의 원인이 될 수 없다.'],
  ['1p4', '둘 또는 다수의 사물은 속성 또는 변용에 의해 구분된다.'],
  ['1p5', '동일한 본성·속성을 가지는 둘 이상의 실체는 존재할 수 없다.'],
  ['1p6', '하나의 실체는 다른 실체에서 산출될 수 없다.'],
  ['1p7', '실체의 본성에는 존재가 속한다.'],
  ['1p8', '모든 실체는 필연적으로 무한하다.'],
]

// 캔버스에 글씨를 그려 텍스처 하나를 만드는 공장 함수 (POC와 동일)
const FONT = '"Helvetica Neue", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
function makeTextTexture(tag, text) {
  const cw = 1024, ch = 448
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.shadowColor = 'rgba(255,255,255,0.65)'; ctx.shadowBlur = 10
  ctx.fillStyle = '#6b6658'; ctx.font = `600 40px ${FONT}`
  ctx.fillText(tag, 60, 92)
  ctx.fillStyle = '#2a2a28'; ctx.font = `600 58px ${FONT}`
  const maxW = cw - 120, lineH = 74
  let line = '', y = 200
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, 60, y); line = word; y += lineH }
    else line = test
  }
  ctx.fillText(line, 60, y)
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  return tex
}

// ★ 새로 추가: 원점 구조물 둘레에 정리 8장을 두르고, 거리로 선명도 조절 ★
function Propositions() {
  const { gl } = useThree()
  const matRefs = useRef([])

  // 텍스처·위치는 한 번만 계산해 둔다
  const panels = useMemo(() => {
    const R = 4.3
    return PROPS.map(([tag, text], i) => {
      const tex = makeTextTexture(tag, text)
      tex.anisotropy = gl.capabilities.getMaxAnisotropy()  // 비스듬히 봐도 또렷
      const a = (i / PROPS.length) * Math.PI * 2
      const pos = new THREE.Vector3(Math.sin(a) * R, 1.85, Math.cos(a) * R)
      return { tex, a, pos }
    })
  }, [gl])

  // 매 프레임: 카메라와의 거리로 투명도(=선명도) 조절
  useFrame(({ camera }) => {
    const NEAR = 6, FAR = 18
    for (let i = 0; i < panels.length; i++) {
      const mat = matRefs.current[i]
      if (!mat) continue
      const d = camera.position.distanceTo(panels[i].pos)
      let o = (FAR - d) / (FAR - NEAR)
      o = Math.max(0, Math.min(1, o))
      o = o * o * (3 - 2 * o)               // smoothstep: 부드럽게
      mat.opacity = o
    }
  })

  return (
    <>
      {panels.map((p, i) => (
        <mesh key={i} position={p.pos.toArray()} rotation-y={p.a}>
          <planeGeometry args={[2.9, 2.9 * 448 / 1024]} />
          <meshBasicMaterial
            ref={(el) => (matRefs.current[i] = el)}
            map={p.tex} transparent side={THREE.DoubleSide} alphaTest={0.04}
          />
        </mesh>
      ))}
    </>
  )
}

export default function App() {
  return (
    <Canvas shadows camera={{ fov: 70, near: 0.1, far: 300, position: [0, 1.6, 0] }}>
      <color attach="background" args={['#d8d3c8']} />
      <fog attach="fog" args={['#d8d3c8', 24, 90]} />
      <hemisphereLight args={['#ffffff', '#9a937f', 0.85]} />
      <directionalLight position={[14, 22, 8]} intensity={0.9} color="#fff3e0" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}>
        <orthographicCamera attach="shadow-camera" args={[-25, 25, 25, -25, 0.5, 80]} />
      </directionalLight>
      <Ground />
      <Structures />
      <Propositions />
      <FirstPersonControls />
    </Canvas>
  )
}