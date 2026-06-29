import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import GraphScaffold from './GraphScaffold'

// ============================================================
//  Ethica Architectonics — 1부 (1~15) · 돔 씬
//  ★ 전환본: "두꺼운 기둥 → 얇은 경선 리브 = 단일 속성 실체" + 비율유지 스케일업
//    - Pillars(두꺼운 원기둥) 삭제 · 별도 ClimbShaft 삭제
//    - 단일 속성 실체 = DomeRibs(얇은 리브) 그 자체. 72개 전부 '균일'(특별한 리브 없음).
//    - 탐험 = φ=0 리브 '안'의 나선(리브 중심선 ribCenter를 따라 오름).
//    - SCALE 배수를 모든 '건축 치수'에만 곱함. 사람 치수(EYE/SPEED/계단)는 고정.
// ============================================================

// ── 공간 전체 배수 (건축 치수 전용; 사람 치수 제외) ──────────────
//   비율 유지: 가로(반지름)·높이(H)·리브 굵기에 같은 배수 →
//   '빽빽한 72개' 룩은 그대로, 사람만 상대적으로 작아져 리브 '안'에 들어갈 수 있게 된다.
//   ※ 등반이 길게 느껴지면 이 값만 낮추면 된다(룩 동일, 돔만 작아짐).
//     높이만 따로 줄여 '낮고 넓은' 돔으로 가고 싶으면 다음 단계에서 높이 전용 배수를 분리.
const SCALE = 3.5

// ── 돔/리브 (×SCALE) ──
const R_BASE = 60 * SCALE          // 지표 반지름
const R_TOP  = 35 * SCALE          // 천장 개구부 반지름
const H      = 200 * SCALE         // 전체 높이
const KNEE = 0.25, WIDTH = 0.02    // 무릎 위치/날카로움 — u(0~1)공간이라 스케일 무관(고정)
const MERIDIANS = 72               // 리브 수(밀도 유지)
const SHELL_RIB_R = 1.1 * SCALE    // 리브 굵기 — 같이 커져 사람이 들어갈 만큼(룩은 동일 비율)
const RIB_PHI = 0                  // 탐험에 쓰는 리브의 각도(+x). 단, 모든 리브는 동일함.

const DOWN = new THREE.Vector3(0, -1, 0)

function rOf(u) {
  const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
  return R_TOP + (R_BASE - R_TOP) * f
}

// 리브(=단일 속성 실체) 중심선 위의 점. 탐험 나선은 이 선을 따라 '리브 안'을 오른다.
function ribCenter(u) {
  const r = rOf(u)
  return new THREE.Vector3(r * Math.cos(RIB_PHI), H * u, r * Math.sin(RIB_PHI))
}

// ── 나선 계단 (리브 안, 사람 스케일) ──────────────────────────
const U_LAND   = 0.22                         // 나선 끝 높이(무릎 0.25 살짝 아래) — u공간(고정)
const Y_LAND   = H * U_LAND                    // 그 절대 높이(스케일 따라감)
const STEP_RISE   = 0.32                        // 한 칸 높이(사람 스케일, 고정)
const STAIR_STEPS = Math.max(40, Math.round(Y_LAND / STEP_RISE))   // 칸 수 자동(높이÷보폭)
const STEPS_PER_TURN = 30                       // 한 바퀴 칸 수(나선 촘촘함)
const STAIR_TURNS = STAIR_STEPS / STEPS_PER_TURN
const STAIR_R     = SHELL_RIB_R * 0.55          // 헬릭스 반지름 — 리브 내부에 들도록 굵기에 비례
const TREAD_DEPTH = 1.5                          // 디딤판(사람 스케일, 고정)
const TREAD_WIDTH = 1.0
const TREAD_THICK = 0.20
const POLE_R      = 0.35

// ── 테라스(중앙, 도착) (×SCALE) ──
const TERRACE_Y    = H * KNEE
const TERRACE_RIN  = 27 * SCALE
const TERRACE_ROUT = 33 * SCALE
const TERRACE_ARC  = 2.4

// ── 계단참 + 직선 다리: 나선 top ↔ 테라스를 '구성으로' 잇는다(좌표 자동) ──
const CLIMB_TOP    = ribCenter(U_LAND)          // 나선이 끝나는 지점(리브 위)
const TERRACE_EDGE = new THREE.Vector3(         // 테라스 바깥 가장자리(+x쪽)
  TERRACE_ROUT * Math.cos(RIB_PHI), TERRACE_Y, TERRACE_ROUT * Math.sin(RIB_PHI))
const PAD_SIZE     = 6.0
const FLIGHT_LEN   = Math.hypot(TERRACE_EDGE.x - CLIMB_TOP.x, TERRACE_EDGE.y - CLIMB_TOP.y)
const FLIGHT_STEPS = Math.max(6, Math.round(FLIGHT_LEN / TREAD_DEPTH))   // 다리 칸 수 자동
const FLIGHT_WIDTH = 3.5

// 지하 방 (×SCALE) ──
const ROOM_CX      = R_BASE * 0.2     // 방 위치 = 리브까지 거리의 비율(0=중앙, 1=리브)
// 방 b버전(깊게 판 돔): footprint 유지, 바닥을 아래로 파 층고 확보, 천장은 낮게(리브와 안 부딪힘)
const ROOM_FLOOR_R = 22 * SCALE          // 바닥 반지름 = footprint
const ROOM_CEIL_Y  = 5 * SCALE           // 천장 apex(지표 위로 솟는 높이) = 통로 접합 높이
const ROOM_HEIGHT  = 24 * SCALE          // 층고(아래로 팜). ↑면 방이 깊고 높아짐
const ROOM_FLOOR_Y = ROOM_CEIL_Y - ROOM_HEIGHT
const DEF_RING_R   = 7 * SCALE
const AXIOM_RING_R = 12 * SCALE
const MARKER_R     = 0.9 * SCALE

// ════════ 탐험 통로(복도) — 방 천장 꼭대기 ↔ 탐험경선 #0 ════════
//  ① 바닥을 방 천장 꼭대기에 붙임(접합)  ② 벽+천장으로 시야 차단(무한 실체 숨김)
//  ③ 바닥은 #0에만 닿고, 이웃 ±2는 벌어진 개구부로 '보이되 안 닿음'(정리 2·3·4)
const COR_Y0       = ROOM_CEIL_Y         // 복도 바닥 높이 = 방 천장 꼭대기
const COR_X0       = ROOM_CX             // 안쪽 끝(방 천장 꼭대기, 접합점)
const COR_X1       = R_BASE              // 바깥 끝(탐험경선 #0)
const COR_FLOOR_HW = 7                   // 바닥 반폭(좁게 → #0만 닿음; 이웃 z≈18 > 안 닿음)
const COR_WALL_H   = 60                  // 벽/천장 높이. 액자로 #0이 보이는 양 + '무한'이 드러나는 상승 높이
const COR_WALL_TOP = COR_Y0 + COR_WALL_H // 천장(=벽 위) 절대 높이. 날개벽은 이 높이~지면(0)까지 한 장
const COR_FLARE_X  = COR_X0 + (COR_X1 - COR_X0) * 0.2  // 날개 시작 x(통로 시작쪽으로 당김; ↓일수록 더 일찍·완만히 벌어짐)
const COR_MOUTH_HW = 45                  // 개구부 반폭(이웃 ±2=36.5 보임, ±3=54.4 가림)
const COR_THICK    = 0.6                 // 바닥/벽/천장 두께
const COR_FLARE_LEN = Math.hypot(COR_X1 - COR_FLARE_X, COR_MOUTH_HW - COR_FLOOR_HW)
const COR_FLARE_ANG = Math.atan2(COR_MOUTH_HW - COR_FLOOR_HW, COR_X1 - COR_FLARE_X)

// ── ① 1인칭 컨트롤 ──
function FirstPersonControls() {
  const { camera, gl, scene } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: Math.PI, pitch: 0 })
  const ray  = useRef(new THREE.Raycaster())
  const walkables = useRef([])

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    // 시작 = 복도 안쪽(방 천장 꼭대기)에서 탐험경선(+x)을 바라봄 → 시야 제한이 작동
    camera.position.set(COR_X0 + 3, COR_Y0 + 1.6, 0)
    look.current.yaw = -Math.PI / 2                  // +x(탐험경선) 방향
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

  const WALK_SPEED = 3.5 * SCALE   // 보행 속도(공간 비례). 답답하면 계수(3.5)↑
  const FLY_SPEED  = 6   * SCALE   // 비행(Q/E) 속도 — 살펴보기용, 더 빠름
  const EYE       = 1.6
  const STEP_UP   = 0.8
  const STEP_DOWN = 2.2
  const FALL      = 5
  const FREE_WALK = true    // ★ 임시: 벽/가장자리/낙하 충돌 끔(공중에서 살펴보기). 편집 끝나면 false.

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
      if (move.lengthSq() > 0) { move.normalize().multiplyScalar(FLY_SPEED * d); camera.position.add(move) }
      let dy = 0
      if (k['KeyE']) dy += 1
      if (k['KeyQ']) dy -= 1
      camera.position.y += dy * FLY_SPEED * d
      camera.position.y = Math.max(EYE, Math.min(H - 4, camera.position.y))
      return
    }

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(WALK_SPEED * d)
      const px = camera.position.x, pz = camera.position.z
      const nx = px + move.x, nz = pz + move.z
      if (FREE_WALK) {
        camera.position.x = nx; camera.position.z = nz
      } else if (probe(nx, nz) !== null) {
        camera.position.x = nx; camera.position.z = nz
      } else if (probe(nx, pz) !== null) {
        camera.position.x = nx
      } else if (probe(px, nz) !== null) {
        camera.position.z = nz
      }
    }

    const groundY = probe(camera.position.x, camera.position.z)
    if (groundY !== null) {
      const targetY = groundY + EYE
      camera.position.y += (targetY - camera.position.y) * Math.min(1, d * 14)
    } else if (!FREE_WALK) {
      camera.position.y = Math.max(EYE, camera.position.y - FALL * d)
    }
  })
  return null
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// ── 셸: 얇은 경선 리브 72개 (= 단일 속성 실체, 전부 균일) ──
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
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, 10, false]} />
      <meshStandardMaterial color="#bb8a4e" roughness={0.7} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

function Apex() {
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
function RibStair() {
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
function LandingPad() {
  return (
    <mesh position={[CLIMB_TOP.x, CLIMB_TOP.y, CLIMB_TOP.z]} userData={{ walkable: true }}>
      <boxGeometry args={[PAD_SIZE, TREAD_THICK, PAD_SIZE]} />
      <meshStandardMaterial color="#cfa765" roughness={0.82} />
    </mesh>
  )
}

// ── 직선 다리 — 나선 top → 중앙 테라스. z=0 평면에서 보간(완만한 직선계단) ──
function StraightFlight() {
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
function Terrace() {
  return (
    <mesh position={[0, TERRACE_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <ringGeometry args={[TERRACE_RIN, TERRACE_ROUT, 64, 1, -TERRACE_ARC / 2, TERRACE_ARC]} />
      <meshStandardMaterial color="#caa161" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ════════ 지하 정의·공리 방 ════════
function DefAxiomRoom() {
  const defRef = useRef()
  const axRef  = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      dum.position.set(DEF_RING_R * Math.cos(a), ROOM_FLOOR_Y, DEF_RING_R * Math.sin(a))
      dum.updateMatrix(); defRef.current.setMatrixAt(i, dum.matrix)
    }
    defRef.current.instanceMatrix.needsUpdate = true
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      dum.position.set(AXIOM_RING_R * Math.cos(a), ROOM_FLOOR_Y, AXIOM_RING_R * Math.sin(a))
      dum.updateMatrix(); axRef.current.setMatrixAt(i, dum.matrix)
    }
    axRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group position={[ROOM_CX, 0, 0]}>
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_FLOOR_R, ROOM_HEIGHT, ROOM_FLOOR_R]}>
        <sphereGeometry args={[1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6f5a3c" roughness={0.95} side={THREE.DoubleSide} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, ROOM_FLOOR_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <circleGeometry args={[ROOM_FLOOR_R, 48]} />
        <meshStandardMaterial color="#7d674a" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={defRef} args={[undefined, undefined, 8]}>
        <sphereGeometry args={[MARKER_R, 16, 16]} />
        <meshStandardMaterial color="#e6c98a" roughness={0.6} emissive="#3a2e14" />
      </instancedMesh>
      <instancedMesh ref={axRef} args={[undefined, undefined, 7]}>
        <sphereGeometry args={[MARKER_R, 16, 16]} />
        <meshStandardMaterial color="#b9c6dd" roughness={0.6} emissive="#16202e" />
      </instancedMesh>
    </group>
  )
}

// ════════ 탐험 통로(복도) — 바닥(#0 전용) + 양벽 + 천장 ════════
function Corridor() {
  const wallMat = '#b89a6a'
  return (
    <group>
      {/* 바닥(브리지): 방 천장 꼭대기 → #0, 좁게(=#0에만 닿음) */}
      <mesh position={[(COR_X0 + COR_X1) / 2, COR_Y0, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[COR_X1 - COR_X0, COR_THICK, COR_FLOOR_HW * 2]} />
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 좁은 구간 양벽 (방 쪽 → 개구부 시작) */}
      {[1, -1].map((sgn) => (
        <mesh key={'nw' + sgn} position={[(COR_X0 + COR_FLARE_X) / 2, COR_Y0 + COR_WALL_H / 2, sgn * COR_FLOOR_HW]}>
          <boxGeometry args={[COR_FLARE_X - COR_X0, COR_WALL_H, COR_THICK]} />
          <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* 좁은 구간 천장 (위 가림) */}
      <mesh position={[(COR_X0 + COR_FLARE_X) / 2, COR_Y0 + COR_WALL_H, 0]}>
        <boxGeometry args={[COR_FLARE_X - COR_X0, COR_THICK, COR_FLOOR_HW * 2]} />
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 날개벽 — 지면(y=0)~천장까지 한 장으로 내려 옆·아래 시야 차단(±2만 보이고 먼 리브 가림). 벽이라 '길' 아님 */}
      {[1, -1].map((sgn) => (
        <mesh
          key={'fw' + sgn}
          position={[(COR_FLARE_X + COR_X1) / 2, COR_WALL_TOP / 2, sgn * (COR_FLOOR_HW + COR_MOUTH_HW) / 2]}
          rotation={[0, -sgn * COR_FLARE_ANG, 0]}
        >
          <boxGeometry args={[COR_FLARE_LEN, COR_WALL_TOP, COR_THICK]} />
          <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* 개구부 천장(덮개): 위로 새던 먼 리브를 막음 — 정면(+x)만 액자처럼 열림 */}
      <mesh position={[(COR_FLARE_X + COR_X1) / 2, COR_Y0 + COR_WALL_H, 0]}>
        <boxGeometry args={[COR_X1 - COR_FLARE_X, COR_THICK, COR_MOUTH_HW * 2]} />
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function App() {
  const [view, setView] = useState('dome')
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyG') setView(v => (v === 'dome' ? 'graph' : 'dome'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 3000, position: [0, 1.6, 0] }}>
        {view === 'dome' && (
          <>
            <color attach="background" args={['#e7d6ad']} />
            <fog attach="fog" args={['#e7d6ad', 30 * SCALE, 150 * SCALE]} />

            <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
            <ambientLight intensity={0.25} />
            <directionalLight position={[30 * SCALE, 120 * SCALE, 20 * SCALE]} intensity={0.3} color="#ffe6bf" />

            <Ground />
            <DomeRibs />
            <DefAxiomRoom />
            <Corridor />
            <Apex />
            <RibStair />
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
          {view === 'graph' ? 'Ethica · 데이터 그래프 (1p1~1p8 의존)' : 'Ethica · 리브 안 나선 · 비율유지 스케일업'}
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
