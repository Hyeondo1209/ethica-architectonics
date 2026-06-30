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
// ── 지하 정의·공리 방 (스케치: 묻힌 돔 + 내벽 따라 도는 나선계단) (×SCALE) ──
//  관람객: 바닥에서 시작 → 안쪽 벽을 따라(살짝 띄워) 도는 나선을 올라 → 꼭대기 박스로 나가 통로로.
//  ※ 비례는 렌더 보고 조절: ROOM_R(넓이) · ROOM_HEIGHT(깊이=높이) · ROOM_STAIR_TURNS(회전수).
const ROOM_CX      = 0                    // 방 중심 x = 큰 리브 돔의 열린 중심(원점). 복도 접합점이기도 함
const ROOM_R       = 26 * SCALE          // 바닥(=가장 넓은) 반지름. 스케치=납작·넓은 돔
const ROOM_CEIL_Y  = 14 * SCALE          // 돔 apex 높이 = 통로 접합 높이(변경 금지)
const ROOM_FLOOR_Y = 0                    // 바닥 = 지면(지상 배치 — 더는 아래로 안 팜)
const ROOM_DOME_APEX = 49                              // ★돔 정점 높이(파라미터). 기본=복도 49(원래). 키우면 돔이 위로 솟음
const ROOM_HEIGHT  = ROOM_DOME_APEX - ROOM_FLOOR_Y     // 돔 전체 높이(wallR·domeClipY·돔메시·조명이 사용)
const ROOM_OCULUS  = 0.193               // ★천장 구멍 반각(반지름≈17.4). 나선 상부가 이리로 올라와 돔천장 안닿음 + 빛우물(@정점17.3) 통과·디스크가 위 덮음. 구멍 크기 노브
// 안쪽 벽 수평 반지름(높이 y의 함수) — 돔 셸과 동일한 반구 프로파일을 공유(나선이 벽을 따라가게)
const wallR = (y) => ROOM_R * Math.sqrt(Math.max(0, 1 - ((y - ROOM_FLOOR_Y) / ROOM_HEIGHT) ** 2))
// 돔(반구/타원체) 윗면 높이: (x,z)에서 돔이 솟은 표면 y. 돔 밖이면 0(지면).
// → 통로 벽·박스의 아래 모서리를 여기에 맞춰 잘라 '돔 내부 교집합'만 제거(교선을 따라).
const domeClipY = (x, z) => {
  const dx = x - ROOM_CX, d2 = dx * dx + z * z, R2 = ROOM_R * ROOM_R
  return d2 < R2 ? Math.max(0, ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(1 - d2 / R2)) : 0
}
// 정의/공리 마커 — 바닥 동심 두 링(A안: 안쪽=정의, 바깥=공리, 가운데서 출발)
const DEF_RING_R   = 7 * SCALE
const AXIOM_RING_R = 12 * SCALE
const MARKER_R     = 0.9 * SCALE
// 내벽 나선계단(사람 스케일 고정 + 회전수만 튜닝)
const ROOM_STAIR_RISE  = 0.42                                  // 한 칸 높이(고정)
const ROOM_STAIR_INSET = 0.10                              // ★나선 반지름 = 벽반지름 × 이 비율. 튜닝 노브
const ROOM_STAIR_TURNS = 2.5                                   // 총 회전수(스케치 느낌; 핵심 튜닝 노브)
const ROOM_STAIR_WIDTH = 2.4                                   // 디딤판 폭(반지름 방향 = 걷는 길 폭)
const ROOM_STAIR_TOPR  = 12                                    // ★꼭대기 코일 반지름 — 디스크(6~18)에 닿게(↑=더 바깥서 착지). 연결 노브
const ROOM_LAND_R      = 18                              // 착지d디스크 = 빛우물(원뿔대) 바닥 반지름. (사용자 튜닝 18 — 박스 반폭과의 일치는 더는 강제 안 함)
const ROOM_DISC_SLOT_START = 67 * Math.PI / 180         // ★디스크 슬롯 시작각(비는 부채꼴=나선 진입쪽). 방향 노브(스샷서 반대면 조정)
const ROOM_DISC_SLOT_LEN   = 301 * Math.PI / 180        // ★슬롯 외 그리는 길이; 비는 52°(↑=슬롯 좁음)
const ROOM_DISC_HOLE   = 6                               // 디스크 가운데 구멍 반지름
const ROOM_CYL_TOP     = 110                               // 빛 우물 실린더 꼭대기 높이(다리 49 위로 솟음). 튜닝 노브
const ROOM_WELL_RT     = 2.5                           // 빛우물 '꼭대기' 반지름(원뿔대 위). ↓=위 좁음=리브 스포 차단↑. 바닥은 ROOM_LAND_R(현재 18)=디스크와 맞물려 봉합
const WELL_DOOR_HALF   = 0.5                           // 빛우물 +x(통로)쪽 출입문 반각(rad). ↑=문 넓음. 박스 폭(±6)을 덮게(현재 ≈±8)
const WELL_DOOR_TOP    = 70                            // 출입문 윗변 높이(=통로 낮은 천장 70). 이 아래만 트이고 위 벽은 남아 리브 시야 차단(스포)
const ROOM_CLIMB_H     = ROOM_CEIL_Y - ROOM_FLOOR_Y            // 총 상승(=ROOM_HEIGHT)
const ROOM_STAIR_STEPS = Math.max(60, Math.round(ROOM_CLIMB_H / ROOM_STAIR_RISE))
const ROOM_STAIR_PHASE = -ROOM_STAIR_TURNS * Math.PI * 2       // 꼭대기가 +x(박스)를 향하도록 위상

// ════════ 탐험 통로(복도) — 방 천장 꼭대기 ↔ 탐험경선 #0 ════════
//  ① 바닥을 방 천장 꼭대기에 붙임(접합)  ② 벽+천장으로 시야 차단(무한 실체 숨김)
//  ③ 바닥은 #0에만 닿고, 이웃 ±2는 벌어진 개구부로 '보이되 안 닿음'(정리 2·3·4)
const COR_Y0       = ROOM_CEIL_Y         // 복도 바닥 높이 = 방 천장 꼭대기
const COR_X0       = ROOM_CX             // 안쪽 끝(방 천장 꼭대기, 접합점)
const COR_X1       = R_BASE              // 바깥 끝(탐험경선 #0)
const COR_CYL_X0   = 42                  // 거대 원기둥(공간감 통로) 안쪽 시작 = 박스 연결부 바깥 끝. 튜닝 노브(↓일수록 원기둥 큼)
const COR_FLOOR_HW = 2.5                   // 다리·계단 반폭(길 폭의 절반). ↓일수록 길이 좁아짐
// 외피: 빗면으로 자른 원기둥 + 방쪽 직육면체 박스
//  원통 벽이 먼 리브 밭을 가림(스포 방지). 천장은 솔리드 빗면(방쪽 낮고 리브쪽 높음)으로 솟아 공간감.
//  +x 벽의 창으로 리브 #0·±1·±2만 액자처럼 보임(정리 2·3·4), ±3+는 벽이 가림.
const COR_CX       = (COR_CYL_X0 + COR_X1) / 2   // 원통 중심 x(=126). 바닥 원은 지면(0)에 앉음
const COR_R        = (COR_X1 - COR_CYL_X0) / 2    // 원통 반지름 = (리브 − 원기둥시작)/2 = 84(고정 공간감, 방 위치 무관)
const CEIL_LO      = 70                        // 천장 낮은 쪽(방, −x) 높이
const CEIL_HI      = 150                       // 천장 높은 쪽(리브, +x) 높이 ← 공간감 핵심 노브
const CEIL_SLOPE   = (CEIL_HI - CEIL_LO) / (COR_X1 - COR_CYL_X0)    // 빗면 기울기(원기둥 구간)
const ceilY        = (x) => CEIL_LO + CEIL_SLOPE * (x - COR_CYL_X0)  // 천장 평면 y = LO + slope·(x−42)
const COR_THICK    = 0.6                       // 바닥·박스 판 두께
const COR_WALL_SEG = 96                        // 원통 벽 둘레 분할 수
// +x 벽 창(이웃 ±2 프레이밍)
const WIN_HALF     = Math.asin(42 / COR_R)   // 창 반각: 물리 z폭 42 유지(±2 보임/±3 가림). COR_R 84면 30°, 105면 ≈23.6°
const WIN_SILL_Y   = 0                        // 창 아래턱(길 y≈49 눈높이 바로 아래)
const WIN_TOP_Y    = 150                        // 창 위턱
// 방쪽(−x) 문 + 직육면체 박스(짧은 닫힌 터널)
const BOX_HW       = 6                         // 박스 반폭(z)
const DOOR_HALF    = Math.asin(BOX_HW / COR_R)  // 문 반각(박스 폭과 일치)
const BOX_X0       = COR_X0                    // 박스(연결부) 방쪽 끝 = 방 중심(원점)
const BOX_X1       = COR_CYL_X0 + 4             // 박스 안쪽 끝 = 원기둥 시작 + 살짝 물림
const BOX_TOP      = CEIL_LO                   // 박스 천장 높이(낮은 천장과 맞춤)

// ── 길(path): 다리 → 원형 플랫폼(기둥 받침) → 다리 ──  (막힌 깔때기는 그대로, 길만 이 형태)
const PLAT_X       = (COR_X0 + COR_X1) / 2  // 플랫폼 x = 통로 중간(=126; 방 footprint 끝 x≈119 밖 → 기둥이 지면까지)
const PLAT_R       = 11                      // 원형 플랫폼 반지름(중간 깔때기 반폭 ±23 안)
const PILLAR_R     = 4                       // 받침 기둥 반지름
const COR_RISE     = 0.43                     // 계단 한 칸 높이(=두께). 작을수록 얇음
const COR_CLIMB    = 25                       // 계단(다리2) 총 상승. ↑일수록 가파름(현재 run 73 → ≈9.3°)
const COR_STEPS    = Math.max(2, Math.round(COR_CLIMB / COR_RISE))  // 칸 수 = 총상승÷칸높이(자동)
const PLAT_Y       = COR_Y0                   // 플랫폼 높이 = 방 천장 높이(다리1은 평면, 상승 없음)
const RIB_Y        = PLAT_Y + COR_CLIMB       // 리브 접합 높이(다리2=계단만 상승)

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
    // 시작 = 방 바닥(스케치 동선의 출발점). 나선을 올라 꼭대기 박스 → 통로 → 리브.
    camera.position.set(ROOM_CX, ROOM_FLOOR_Y + 1.6, 0)
    look.current.yaw = Math.PI / 2                    // -x(나선 바닥) 방향
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
  const treadRef = useRef()

  // 나선 치수 — 꼭대기 디딤판 윗면 = 디스크(고리) 윗면(49.3)과 같은 높이. 나선은 고리 가운데 구멍으로 올라와, 그 면에서 고리로 평평히 걸어 나감(구멍 덕에 코일 관통 없음).
  const TREAD_VERT = ROOM_STAIR_RISE * 3.5                         // 수직 두께(아래 칸과 겹쳐 '속찬' 계단)
  const TOP_Y      = COR_Y0 + COR_THICK / 2 - TREAD_VERT / 2       // 맨 윗 디딤판 윗면 = 디스크 고리 윗면(COR_Y0+두께/2=49.3). 가운데 구멍이라 코일과 안 겹침
  const CLIMB      = TOP_Y - ROOM_FLOOR_Y

  // 나선 한 점(t: 0=바닥, 1=꼭대기). 반지름 = 벽 반지름 × INSET(위로 갈수록 좁아짐, 최소 코일).
  const helixPt = (t) => {
    const y = ROOM_FLOOR_Y + t * CLIMB
    const r = Math.max(ROOM_STAIR_TOPR, wallR(y) * ROOM_STAIR_INSET)
    const ang = ROOM_STAIR_PHASE + t * ROOM_STAIR_TURNS * Math.PI * 2   // t=1 → ang=0(+x, 다리 쪽)
    return { x: r * Math.cos(ang), y, z: r * Math.sin(ang), r, ang }
  }

  const baseArc    = (ROOM_R * ROOM_STAIR_INSET) * (ROOM_STAIR_TURNS * Math.PI * 2) / ROOM_STAIR_STEPS
  const TREAD_TAN  = Math.max(0.8, baseArc * 1.8)                  // 접선 길이(이웃과 겹쳐 빈틈 없게)

  // 트레드 인스턴스
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < ROOM_STAIR_STEPS; i++) {
      const t = i / (ROOM_STAIR_STEPS - 1)
      const p = helixPt(t)
      const localArc = p.r * (ROOM_STAIR_TURNS * Math.PI * 2) / ROOM_STAIR_STEPS   // 그 높이의 호 간격
      const sz = Math.max(0.25, (localArc * 1.8) / TREAD_TAN)                      // 위로 갈수록 접선 길이 축소
      dum.position.set(p.x, p.y, p.z)
      dum.rotation.set(0, -p.ang, 0)            // 로컬 x=반지름 방향, z=접선 방향
      dum.scale.set(1, 1, sz)
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    }
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [])

  // 나선 밑 스트링거(연속 튜브) — 남는 빈틈 메우고 가장자리 선을 줌
  const stringer = useMemo(() => {
    const pts = []
    for (let j = 0; j <= 240; j++) {
      const p = helixPt(j / 240)
      pts.push(new THREE.Vector3(p.x, p.y - 0.3, p.z))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])

  // 빛우물 원뿔대 벽(빗면) — +x(통로)쪽에 출입문(디스크 바닥~문높이만 트임). 디스크 아래·문 위 벽은 남겨 가짜 구멍 방지 + 리브 시야 차단(스포).
  const wellGeo = useMemo(() => {
    const rBot = ROOM_LAND_R, rTop = ROOM_WELL_RT
    const yBot = ROOM_CEIL_Y - 3, yTop = ROOM_CYL_TOP
    const doorBot = COR_Y0 + COR_THICK / 2          // 문 아래턱 = 디스크 윗면(걷는 바닥). 그 아래는 벽이 남음(디스크에 가려 안 보임)
    const rAt = (y) => rBot + (rTop - rBot) * ((y - yBot) / (yTop - yBot))
    const SEG = 48, pos = [], idx = []
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      const n = pos.length / 3
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const strip = (a0, a1, ylo, yhi) => {           // 한 각도 구간의 벽 띠(ylo~yhi)
      const rl = rAt(ylo), rh = rAt(yhi)
      quad(
        rl * Math.cos(a0), ylo, rl * Math.sin(a0),
        rl * Math.cos(a1), ylo, rl * Math.sin(a1),
        rh * Math.cos(a1), yhi, rh * Math.sin(a1),
        rh * Math.cos(a0), yhi, rh * Math.sin(a0)
      )
    }
    for (let i = 0; i < SEG; i++) {
      const a0 = -Math.PI + (i / SEG) * Math.PI * 2
      const a1 = -Math.PI + ((i + 1) / SEG) * Math.PI * 2
      const am = (a0 + a1) / 2
      if (Math.abs(am) <= WELL_DOOR_HALF) {          // +x 문 구간: 디스크 아래 스커트 + 문 위 벽(가운데 doorBot~문높이만 트임)
        strip(a0, a1, yBot, doorBot)
        strip(a0, a1, WELL_DOOR_TOP, yTop)
      } else {
        strip(a0, a1, yBot, yTop)                    // 그 외: 통벽
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <group position={[ROOM_CX, 0, 0]}>
      {/* 지상 돔 껍질(불투명) + 작은 오큘러스(박스 폭 안 → 박스+디스크가 리브 시야 차단) */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_R, ROOM_HEIGHT, ROOM_R]}>
        <sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, ROOM_OCULUS, Math.PI / 2 - ROOM_OCULUS]} />
        <meshStandardMaterial color="#7a6342" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* 바닥 */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <circleGeometry args={[ROOM_R, 64]} />
        <meshStandardMaterial color="#7d674a" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* 내부 빛(불투명 돔이라) */}
      <pointLight position={[0, ROOM_FLOOR_Y + ROOM_HEIGHT * 0.45, 0]} intensity={1.05} distance={ROOM_R * 4} decay={1.4} color="#ffe2b0" />
      {/* 내벽 나선계단 — 트레드(속찬·겹침) + 스트링거. ※ 정의·공리 마커는 나중에(현재 미표시). */}
      <instancedMesh ref={treadRef} args={[undefined, undefined, ROOM_STAIR_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[ROOM_STAIR_WIDTH, TREAD_VERT, TREAD_TAN]} />
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      {/* 꼭대기 착지 디스크(고리) — 가운데를 뚫어(천장 개방) 나선이 그 구멍으로 올라오고 빛우물이 위로 트임. 바깥 고리(6~18)는 걷는 발판, 윗면 49.3(다리와 동일). */}
      <mesh position={[0, COR_Y0 + COR_THICK / 2, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <ringGeometry args={[ROOM_DISC_HOLE, ROOM_LAND_R, 48, 1, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN]} />
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 솟은 원뿔대(빛 우물) — 위는 막혀 리브 가림(스포), +x(통로)쪽 아래는 출입문으로 트여 통로로 나감.
          올려다보면 좁은 꼭대기로 빛만 보이고, 정면(통로쪽)으론 걸어 나갈 문이 있음. */}
      <mesh geometry={wellGeo}>
        <meshStandardMaterial color="#97784e" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, ROOM_CYL_TOP - 8, 0]} intensity={2.4} distance={ROOM_CYL_TOP * 1.6} decay={1.1} color="#fff1d2" />
    </group>
  )
}

// ════════ 탐험 통로(복도) — 바닥(#0 전용) + 양벽 + 천장 ════════
// 완만한 오름 계단: (x0,y0)→(x1,y1), 폭 ±hw, steps칸. 각 칸=속찬 블록이 서로 붙어 빈틈 없음.
// 칸 수(steps)가 많을수록 한 칸 높이(rise)가 작아져 '얇은' 계단이 된다.
function Stairs({ x0, x1, y0, y1, hw, steps }) {
  const run = (x1 - x0) / steps
  const rise = (y1 - y0) / steps
  const items = []
  for (let i = 0; i < steps; i++) {
    const cx = x0 + run * (i + 0.5)
    const topY = y0 + rise * (i + 1)
    items.push(
      <mesh key={i} position={[cx, topY - rise / 2, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[run + 0.05, rise, hw * 2]} />
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    )
  }
  return <group>{items}</group>
}

function Corridor() {
  const wallMat = '#b89a6a'

  // 거대 원기둥 벽(공간감 통로): 바닥(돔 표면/0)→빗면 천장. +x에 창(±2), −x(θ=π)에 박스 연결부 문(트임).
  const wallGeo = useMemo(() => {
    const pos = [], idx = []
    const quad = (ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz) => {
      const n = pos.length / 3
      pos.push(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz)
      idx.push(n, n+1, n+2, n, n+2, n+3)
    }
    for (let i = 0; i < COR_WALL_SEG; i++) {
      const t0 = (i / COR_WALL_SEG) * Math.PI * 2
      const t1 = ((i + 1) / COR_WALL_SEG) * Math.PI * 2
      const tm = (t0 + t1) / 2
      if (Math.abs(tm - Math.PI) <= DOOR_HALF) continue            // 방쪽 문(트임)
      const xa = COR_CX + COR_R * Math.cos(t0), za = COR_R * Math.sin(t0)
      const xb = COR_CX + COR_R * Math.cos(t1), zb = COR_R * Math.sin(t1)
      const ya = ceilY(xa), yb = ceilY(xb)
      const dZero = Math.min(tm, Math.PI * 2 - tm)
      if (dZero <= WIN_HALF) {                                      // +x 창: 가운데(SILL~TOP) 비움
        quad(xa,0,za, xb,0,zb, xb,WIN_SILL_Y,zb, xa,WIN_SILL_Y,za)
        quad(xa,WIN_TOP_Y,za, xb,WIN_TOP_Y,zb, xb,yb,zb, xa,ya,za)
      } else {
        quad(xa, domeClipY(xa,za), za, xb, domeClipY(xb,zb), zb, xb,yb,zb, xa,ya,za)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  // 빗면 천장 덮개(닫힘): 중심에서 림으로 삼각 부채 = 기울어진 타원 평면
  const ceilGeo = useMemo(() => {
    const pos = [], idx = []
    pos.push(COR_CX, ceilY(COR_CX), 0)                              // 중심 = 0번
    for (let i = 0; i <= COR_WALL_SEG; i++) {
      const t = (i / COR_WALL_SEG) * Math.PI * 2
      const x = COR_CX + COR_R * Math.cos(t)
      pos.push(x, ceilY(x), COR_R * Math.sin(t))
    }
    for (let i = 1; i <= COR_WALL_SEG; i++) idx.push(0, i, i + 1)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  // 박스 연결부 측벽(2장): 방(원점) ↔ 원기둥 문. 아래를 돔 표면까지 잘라 교집합 제거.
  const boxWallGeo = useMemo(() => {
    const pos = [], idx = []
    const quad = (ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz) => {
      const n = pos.length / 3
      pos.push(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz)
      idx.push(n, n+1, n+2, n, n+2, n+3)
    }
    const SEG = 20
    for (const sgn of [1, -1]) {
      const z = sgn * BOX_HW
      for (let i = 0; i < SEG; i++) {
        const xx0 = BOX_X0 + (BOX_X1 - BOX_X0) * (i / SEG)
        const xx1 = BOX_X0 + (BOX_X1 - BOX_X0) * ((i + 1) / SEG)
        quad(xx0, domeClipY(xx0, z), z, xx1, domeClipY(xx1, z), z, xx1, BOX_TOP, z, xx0, BOX_TOP, z)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])


  return (
    <group>
      {/* === 길(path): 평면 다리 → 원형 플랫폼(기둥 받침) → 완만한 계단(리브까지) === */}
      <mesh position={[(ROOM_LAND_R + (PLAT_X - PLAT_R)) / 2, COR_Y0, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[(PLAT_X - PLAT_R) - ROOM_LAND_R, COR_THICK, COR_FLOOR_HW * 2]} />
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[PLAT_X, PLAT_Y, 0]} userData={{ walkable: true }}>
        <cylinderGeometry args={[PLAT_R, PLAT_R, COR_THICK, 48]} />
        <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[PLAT_X, (PLAT_Y - COR_THICK / 2) / 2, 0]}>
        <cylinderGeometry args={[PILLAR_R, PILLAR_R, PLAT_Y - COR_THICK / 2, 24]} />
        <meshStandardMaterial color="#a98f5e" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <Stairs x0={PLAT_X + PLAT_R} x1={COR_X1} y0={PLAT_Y} y1={RIB_Y} hw={COR_FLOOR_HW} steps={COR_STEPS} />

      {/* === 외피: 거대 원기둥(벽 + 닫힌 빗면 천장) — 공간감 통로 === */}
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ceilGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* === 박스 연결부(방 ↔ 원기둥): 측벽(돔 표면까지 클립) + 천장, 양끝 트임 === */}
      <mesh geometry={boxWallGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(BOX_X0 + BOX_X1) / 2, BOX_TOP, 0]}>
        <boxGeometry args={[BOX_X1 - BOX_X0, COR_THICK, BOX_HW * 2]} />
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
