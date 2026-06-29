import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import GraphScaffold from './GraphScaffold'

// ============================================================
//  Ethica Architectonics — 1부 (1~15) · 셸 B · 수직축
//  ★ 깨끗한 복구본: 립 온전(72개 전부) + 단순 나선 계단(꺾임/직각 직선계단 없음)
//    다음 단계에서 '나선 → 정사각 계단참 → 직선 오르막'(방식 a)을 여기에 얹는다.
// ============================================================

const R_BASE = 60, R_TOP = 35, H = 200, KNEE = 0.25, WIDTH = 0.02
const MERIDIANS = 72
const SHELL_RIB_R = 1.1

const RIB_PHI = 0
const SHAFT_R = 5        // 등반 기둥 반지름 (= PILLAR_R, 다른 기둥과 동일 굵기)
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
  const walkables = useRef([])          // 걸을 수 있는 면만 모아두는 통(매 프레임 갱신)

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

  const SPEED    = 4.5
  const EYE      = 1.6      // 눈높이(발에서 머리까지)
  const STEP_UP  = 0.8      // 한 번에 오를 수 있는 턱 높이
  const STEP_DOWN = 2.2     // 한 번에 내려설 수 있는 낙차(이 이상은 '낭떠러지')
  const FALL     = 5        // 디딜 곳 없을 때 떨어지는 속도
  const FREE_WALK = true    // ★ 임시: 벽/가장자리 충돌 끔(자유 이동). 원래대로면 false.

  // (x,z) 발밑에 '걸을 수 있는 면'이 STEP 범위 안에 있으면 그 높이를, 없으면 null
  const probe = (x, z) => {
    const feet = camera.position.y - EYE
    ray.current.set(new THREE.Vector3(x, feet + STEP_UP, z), DOWN)
    ray.current.far = STEP_UP + STEP_DOWN
    const hits = ray.current.intersectObjects(walkables.current, false)
    return hits.length ? hits[0].point.y : null
  }

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const { yaw, pitch } = look.current
    camera.rotation.y = yaw
    camera.rotation.x = pitch

    // 매 프레임 'walkable' 면만 추려둔다 (무거운 립/셸은 검사 제외 → 성능)
    const arr = []
    scene.traverse(o => { if (o.userData && o.userData.walkable) arr.push(o) })
    walkables.current = arr

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
    const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw))
    const move = new THREE.Vector3()
    const k = keys.current
    if (k['KeyW'] || k['ArrowUp'])    move.add(forward)
    if (k['KeyS'] || k['ArrowDown'])  move.sub(forward)
    if (k['KeyD'] || k['ArrowRight']) move.add(right)
    if (k['KeyA'] || k['ArrowLeft'])  move.sub(right)

    const flying = k['KeyQ'] || k['KeyE']

    if (flying) {
      // 미리보기 비행: 충돌·바닥 무시하고 자유 이동 (끼었을 때 탈출용)
      if (move.lengthSq() > 0) { move.normalize().multiplyScalar(SPEED * d); camera.position.add(move) }
      let dy = 0
      if (k['KeyE']) dy += 1
      if (k['KeyQ']) dy -= 1
      camera.position.y += dy * SPEED * d
      camera.position.y = Math.max(EYE, Math.min(H - 4, camera.position.y))
      return
    }

    // ── 걷기: 가장자리에서 멈추고(edge-stop), 막히면 벽 따라 미끄러진다(slide) ──
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * d)
      const px = camera.position.x, pz = camera.position.z
      const nx = px + move.x, nz = pz + move.z
      if (FREE_WALK) {                          // ★ 자유 이동: 벽/가장자리 무시하고 그대로 이동
        camera.position.x = nx; camera.position.z = nz
      } else if (probe(nx, nz) !== null) {     // 목적지에 디딜 면 있음 → 그대로 이동
        camera.position.x = nx; camera.position.z = nz
      } else if (probe(nx, pz) !== null) {     // x쪽만 가능 → 벽 따라 미끄러짐
        camera.position.x = nx
      } else if (probe(px, nz) !== null) {     // z쪽만 가능
        camera.position.z = nz
      }                                        // 셋 다 없으면 제자리 (낭떠러지 차단)
    }

    // ── 시작~등반 구간: 샤프트 벽 밖으로 못 나가게 (반경 제약) ──
    //   낮은 높이에선 원통 안에 가둬 벽 통과를 막고, 테라스 높이(Y_LAND) 근처에서 풀어
    //   참·테라스로 나갈 수 있게 한다.
    if (!FREE_WALK && camera.position.y < Y_LAND - 1) {
      const ax = axisPoint(0)                 // 샤프트 중심축 (47.5, *, 0)
      const dx = camera.position.x - ax.x, dz = camera.position.z - ax.z
      const dist = Math.hypot(dx, dz)
      const R_WALL = SHAFT_R - 0.2
      if (dist > R_WALL) {
        camera.position.x = ax.x + (dx / dist) * R_WALL
        camera.position.z = ax.z + (dz / dist) * R_WALL
      }
    }

    // 발밑 높이에 맞춰 부드럽게 오르내림 / 디딜 곳 없으면 낙하
    const groundY = probe(camera.position.x, camera.position.z)
    if (groundY !== null) {
      const targetY = groundY + EYE
      camera.position.y += (targetY - camera.position.y) * Math.min(1, d * 14)
    } else if (!FREE_WALK) {
      camera.position.y = Math.max(EYE, camera.position.y - FALL * d)
    }                                          // ★ FREE_WALK: 디딜 곳 없으면 낙하 없이 그 자리 높이 유지
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
      <tubeGeometry args={[curve, 160, SHAFT_R, 24, false]} />
      <meshStandardMaterial color="#cda368" roughness={0.8} metalness={0} side={THREE.DoubleSide} transparent opacity={0.5} />
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
      // 첫 단(k=0)을 큰 참 위에 겹쳐 시작 → 참↔계단 사이 틈 제거. 마지막 단이 테라스(y=H*KNEE)에 닿음.
      dum.position.set(FLIGHT_X0 - k * RUN, Y_LAND + (k + 1) * RISER, 0)
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

// ════════ 단일속성 기둥 (무한 반복 암시) — 덩어리 ① ════════
// 스케치의 '단일 속성 실체' = 기둥. 손그림의 셋은 축약, 실제론 링을 따라 여럿.
// 스케치 반지름 50 → 기존 돔의 지표 둘레 R_BASE(60)에 매핑(약 ×1.2).
// (돔은 지표 r=60 → 무릎 y=50에서 r=35로 좁아져 천장이 열림 ⇒ 기둥은 무릎 아래까지만.)
const PILLAR_RING_R = ARRIVAL_R      // 기둥 링 반지름 = 등반축 반지름(47.5) → 등반 기둥도 같은 링 위에
const PILLAR_COUNT  = 24             // 링을 도는 기둥 수 (많을수록 '무한' 느낌 ↑)
const PILLAR_R      = 5              // 기둥 굵기(반지름)
const PILLAR_H      = TERRACE_Y - 2  // 기둥 높이: 무릎/테라스(50) 살짝 아래 = 48 (드럼 벽 안에 머무름)

function Pillars() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const a = (i / PILLAR_COUNT) * Math.PI * 2          // 링을 한 바퀴 균등 분할
      dummy.position.set(
        PILLAR_RING_R * Math.cos(a),
        PILLAR_H / 2,                                      // 원기둥 중심 = 높이의 절반(바닥~PILLAR_H)
        PILLAR_RING_R * Math.sin(a)
      )
      dummy.scale.setScalar(i === 0 ? 0 : 1)              // +x(i=0) 자리는 등반 기둥(ClimbShaft)이 대신 → 비움
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, PILLAR_COUNT]}>
      <cylinderGeometry args={[PILLAR_R, PILLAR_R, PILLAR_H, 24]} />
      <meshStandardMaterial color="#cda368" roughness={0.8} metalness={0} />
    </instancedMesh>
  )
}

// ════════ 지하 정의·공리 방 — 덩어리 ② ════════
// 뒤집힌 깔때기(열린 돔) 한가운데, 지표 아래에 묻힌 돔 = 정의·공리 방.
// 스케치: 구 중심 (0,0,-8)·지표단면 r=10 → 돔 스케일(×1.2)로 매핑.
// 안쪽 링 = 정의 8(1d1~8), 바깥 링 = 공리 7(1a1~7), 가운데가 출발점.
// (지표 입구·하강 동선·번호 라벨은 다음 단계. 지금은 FREE_WALK로 Q눌러 내려가 확인.)
const ROOM_CY      = -18     // 방 돔 중심 깊이(지표 아래) — 더 깊고 크게
const ROOM_R       = 22      // 방 돔 반지름 (키움: 15 → 22)
const ROOM_FLOOR_Y = -14     // 마커가 놓이는 바닥 높이
const ROOM_FLOOR_R = Math.sqrt(Math.max(0, ROOM_R * ROOM_R - (ROOM_FLOOR_Y - ROOM_CY) ** 2))  // 그 높이의 바닥 원판 반지름
const DEF_RING_R   = 7       // 정의(안쪽) 링 반지름 — 마커 8
const AXIOM_RING_R = 12      // 공리(바깥) 링 반지름 — 마커 7
const MARKER_R     = 0.9     // 마커 구 반지름

function DefAxiomRoom() {
  const defRef = useRef()
  const axRef  = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < 8; i++) {                       // 정의 8 — 안쪽 링
      const a = (i / 8) * Math.PI * 2
      dum.position.set(DEF_RING_R * Math.cos(a), ROOM_FLOOR_Y, DEF_RING_R * Math.sin(a))
      dum.updateMatrix(); defRef.current.setMatrixAt(i, dum.matrix)
    }
    defRef.current.instanceMatrix.needsUpdate = true
    for (let i = 0; i < 7; i++) {                       // 공리 7 — 바깥 링
      const a = (i / 7) * Math.PI * 2
      dum.position.set(AXIOM_RING_R * Math.cos(a), ROOM_FLOOR_Y, AXIOM_RING_R * Math.sin(a))
      dum.updateMatrix(); axRef.current.setMatrixAt(i, dum.matrix)
    }
    axRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      {/* 방 돔 껍질 (반투명 — 안팎으로 보이게) */}
      <mesh position={[0, ROOM_CY, 0]}>
        <sphereGeometry args={[ROOM_R, 40, 32]} />
        <meshStandardMaterial color="#6f5a3c" roughness={0.95} side={THREE.DoubleSide} transparent opacity={0.45} />
      </mesh>
      {/* 바닥 원판 */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <circleGeometry args={[ROOM_FLOOR_R, 48]} />
        <meshStandardMaterial color="#7d674a" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* 정의 마커 8 (안쪽, 따뜻한 색) */}
      <instancedMesh ref={defRef} args={[undefined, undefined, 8]}>
        <sphereGeometry args={[MARKER_R, 16, 16]} />
        <meshStandardMaterial color="#e6c98a" roughness={0.6} emissive="#3a2e14" />
      </instancedMesh>
      {/* 공리 마커 7 (바깥, 차가운 색) */}
      <instancedMesh ref={axRef} args={[undefined, undefined, 7]}>
        <sphereGeometry args={[MARKER_R, 16, 16]} />
        <meshStandardMaterial color="#b9c6dd" roughness={0.6} emissive="#16202e" />
      </instancedMesh>
    </group>
  )
}

// ════════ 수평 통로 + 정리 1~4 — 덩어리 ③ ════════
// 지하 방(중앙) → 가장자리 경선기둥으로 이어지는 공중 통로(타원 platform).
// 스케치: z=4 평면, 타원 중심 (-25.4,0)·반축 30.4×12.1 → 돔 스케일(×1.2).
// 1p1(방 쪽)~1p4(기둥 쪽)을 통로 중심선에 임시 균등 배치(정확 위치·번호 라벨은 추후).
const WALK_Y   = 5                    // 통로 높이(지표보다 살짝 위)
const WALK_CX  = 25                   // 통로 타원 중심 x (방 0 ↔ 등반기둥 +47.5 쪽)
const WALK_RX  = 30                   // 타원 반축(긴쪽, x) — 중심에서 등반기둥까지
const WALK_RZ  = 14.5                 // 타원 반축(짧은쪽, z)

function Walkway() {
  // 통로 바닥(타원 platform)만. 정리 1~4 마커(주황 구)는 임시 제거 — 추후 번호 라벨로 대체.
  return (
    <mesh position={[WALK_CX, WALK_Y, 0]} rotation-x={-Math.PI / 2} scale={[WALK_RX, WALK_RZ, 1]} userData={{ walkable: true }}>
      <circleGeometry args={[1, 64]} />
      <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function App() {
  const [view, setView] = useState('dome')   // 'dome' = 돔 씬, 'graph' = 데이터 그래프
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyG') setView(v => (v === 'dome' ? 'graph' : 'dome'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 600, position: [0, 1.6, 0] }}>
        {view === 'dome' && (
          <>
            <color attach="background" args={['#e7d6ad']} />
            <fog attach="fog" args={['#e7d6ad', 30, 150]} />

            <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
            <ambientLight intensity={0.25} />
            <directionalLight position={[30, 120, 20]} intensity={0.3} color="#ffe6bf" />

            <Ground />
            <DomeRibs />
            <Pillars />
            <DefAxiomRoom />
            <Walkway />
            <ClimbShaft />
            <Apex />
            <RibStair />
            <SmallLandingPad />
            <LandingPad />
            <StraightFlight />
            <Terrace />
            <FirstPersonControls />
          </>
        )}

        {view === 'graph' && (
          <>
            <color attach="background" args={['#171511']} />
            <ambientLight intensity={0.8} />
            <GraphScaffold />
          </>
        )}
      </Canvas>

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 380, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: view === 'graph' ? '#e8ddc4' : '#3a3324',
        textShadow: view === 'graph' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: view === 'graph' ? '#b9a36f' : '#7a6a48', marginBottom: 8 }}>
          {view === 'graph' ? 'Ethica · 데이터 그래프 (1p1~1p8 의존)' : 'Ethica · 수직축 · 나선→계단참→직선(방식 a)'}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          {view === 'graph' ? (
            <>
              <b>드래그</b> 회전 · <b>휠</b> 줌 · 점=노드, 선=의존<br />
              <b>G</b> 키로 돔 씬으로 돌아가기.
            </>
          ) : (
            <>
              <b>W A S D</b> 걷기 · <b>드래그</b> 둘러보기 · 나선으로 테라스까지<br />
              임시: 벽 통과(자유 이동) · 상하 <b>Q / E</b> · <b>G</b> 데이터 그래프 보기.
            </>
          )}
        </div>
      </div>
    </>
  )
}
