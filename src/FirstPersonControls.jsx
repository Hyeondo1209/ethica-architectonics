// FirstPersonControls.jsx — 1인칭 컨트롤(걷기·비행 Q/E·시선 드래그). FREE_WALK 임시 노브는 함수 안.
import { useThree, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { SCALE, H, ROOM_CX, ROOM_FLOOR_Y, DAIS_H, DOWN, RM_X0, RM_X1, PASS_FLOOR_Y, RAD_ANG0, RAD_R, COR_Y0, COR_THICK, TERRACE_RIN, TERRACE_ROUT, TERRACE_Y } from './constants'

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
    // 시작 = 방 바닥(스케치 동선의 출발점). 나선을 올라 꼭대기 박스 → 통로 → 리브.
    // ★임시(개발용) 스폰 선택: 'terrace'(테라스 — 2026.07.12 렌즈 검수) / 'radial'(NE 꽃잎 방) / 'cloister'(회랑) / 'room'(원래 지상 방)
    const SPAWN = 'terrace'
    if (SPAWN === 'terrace') {
      camera.position.set((TERRACE_RIN + TERRACE_ROUT) / 2, TERRACE_Y + 1.6, 0)  // 호 중앙(φ=0, 탐험 리브 쪽) ③≈(144, 249.6, 0)
      look.current.yaw = Math.PI / 2                  // −x(돔 중심) 향해 — 올려보면 렌즈
    } else if (SPAWN === 'radial') {
      const px = RAD_R * Math.cos(RAD_ANG0), pz = RAD_R * Math.sin(RAD_ANG0)
      camera.position.set(px, COR_Y0 + COR_THICK / 2 + 1.6, pz)      // NE 꽃잎 방 중앙 눈높이 ≈(43.8, 50.9, 43.8)
      look.current.yaw = Math.PI / 4                  // 허브(방사 문) 방향
    } else if (SPAWN === 'cloister') {
      camera.position.set((RM_X0 + RM_X1) / 2, PASS_FLOOR_Y + 1.6, 1)  // 방 중앙(눈높이) ③≈(168.1, 249.6, 1)
      look.current.yaw = Math.PI                      // +z(회랑 쪽) 향해
    } else {
      camera.position.set(ROOM_CX, ROOM_FLOOR_Y + DAIS_H + 1.6, 0)   // 원래: 방 기단 위(v2)
      look.current.yaw = Math.PI / 2                  // -x(나선 바닥) 방향
    }
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

  // ★리그 임시(2026.07.04): 걷기 = '사람 고정'(스케일 무관) + Shift 달리기 — 판정의 전제.
  //   구판 3.5×SCALE은 프리셋을 키울수록 같이 빨라져 스케일 체감을 상쇄(판정 무효화).
  //   최종 보행속도(사람 고정 vs ×SCALE)는 열린 결정(§7) — 리그 판정 후.
  const WALK_SPEED = 6         // 사람 걷기(고정). 느리면 이 값만 ↑
  const RUN_MULT   = 3         // Shift 달리기 배수(6 → 18)
  const EYE       = 1.6
  const STEP_UP   = 0.8
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
