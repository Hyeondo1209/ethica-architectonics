// FirstPersonControls.jsx — 1인칭 컨트롤(걷기·비행 Q/E·시선 드래그). FREE_WALK 임시 노브는 함수 안.
//  ★2026.07.13: 스폰 하드코딩(SPAWN 문자열 4갈래) 폐기 → 웨이포인트 표(waypoints.js) 단일 소스.
//   스폰 = SPAWN_ID · 텔레포트 = App 패널/[ ] 키가 쏘는 CustomEvent('ethica:teleport'). 좌표 정본은 waypoints.js.
import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { SCALE, H, DOWN } from './constants'
import { WAYPOINTS, wpById, SPAWN_ID, EYE } from './waypoints'

// ── ① 1인칭 컨트롤 ──
export function FirstPersonControls() {
  const { camera, gl, scene } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const look = useRef({ yaw: Math.PI, pitch: 0 })
  const ray  = useRef(new THREE.Raycaster())
  const walkables = useRef([])

  useEffect(() => {
    camera.rotation.order = 'YXZ'

    // ── 착지(스폰·텔레포트 공용) ──
    //  웨이포인트 y = '발 딛는 면'(walkable 윗면) → 눈높이 EYE를 여기서 더한다.
    //  ★스냅: 착지 직전 '위에서 아래로' 레이를 한 번 쏴 실제 walkable 윗면에 맞춘다. 계산치는 파생이라
    //   정확하지만, 방 사건(1p1 융기 등)·노브 드리프트를 흡수한다.
    //   ⚠'위에서' 쏘는 것이 핵심 — 매 프레임 probe()는 발+STEP_UP(0.8)에서 쏘므로, 융기(최대 1.5) 위에
    //    평바닥 y로 떨어뜨리면 레이 시작점이 이미 융기 안이라 원판을 맞고 '파묻힌 채 걷는다'(07-12 실측 버그).
    const SNAP_UP = 2.5, SNAP_DOWN = 6
    const goTo = (w) => {
      if (!w) return
      let y = w.y
      if (walkables.current.length) {            // 첫 프레임 전(=스폰)엔 아직 비어 있음 → 계산치 그대로
        ray.current.set(new THREE.Vector3(w.x, w.y + SNAP_UP, w.z), DOWN)
        ray.current.far = SNAP_UP + SNAP_DOWN
        const hits = ray.current.intersectObjects(walkables.current, false)
        if (hits.length) y = hits[0].point.y
      }
      camera.position.set(w.x, y + EYE, w.z)
      look.current.yaw = w.yaw
      look.current.pitch = w.pitch
    }
    goTo(wpById(SPAWN_ID) || WAYPOINTS[0])
    const onTeleport = (e) => goTo(wpById(e.detail))
    window.addEventListener('ethica:teleport', onTeleport)

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
      window.removeEventListener('ethica:teleport', onTeleport)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [camera, gl])

  // ★리그 임시(2026.07.04): 걷기 = '사람 고정'(스케일 무관) + Shift 달리기 — 판정의 전제.
  //   구판 3.5×SCALE은 프리셋을 키울수록 같이 빨라져 스케일 체감을 상쇄(판정 무효화).
  //   최종 보행속도(사람 고정 vs ×SCALE)는 열린 결정(§7) — 리그 판정 후.
  const WALK_SPEED = 6         // 사람 걷기(고정). 느리면 이 값만 ↑
  const RUN_MULT   = 3         // Shift 달리기 배수(6 → 18)
  const STEP_UP   = 0.8        // ※눈높이 EYE는 waypoints.js가 정본(웨이포인트 y와 어긋나면 안 됨)
  const STEP_DOWN = 2.2
  const FALL      = 5
  const FREE_WALK = true    // 편집 중: 자유부양(벽 통과)으로 구멍 확인. 걷기 검증할 땐 false(바닥 있는 칸으로만 이동, Q/E는 항상 비행).

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

    const FLY_SPEED = 6 * SCALE   // 비행(Q/E) — 살펴보기용, 공간 비례 유지. 프리셋 라이브 반영 위해 매 프레임 계산
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
      const spd = (k['ShiftLeft'] || k['ShiftRight']) ? WALK_SPEED * RUN_MULT : WALK_SPEED
      move.normalize().multiplyScalar(spd * d)
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
