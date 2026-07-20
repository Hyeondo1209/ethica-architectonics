// Room.jsx — 지상 정의·공리 방(DefAxiomRoom): 돔 껍질·내벽 나선·빛우물 CSG·판테온 빛(v2.2 암실)
//   + 주어진 것 배치: DefPrecinct(기단·각인) / DefOctagon(정의 8기) / AxiomStations(공리 7기)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import { GivenMonolith } from './Steles'
import {
  ROOM_CX, ROOM_FLOOR_Y, ROOM_R, ROOM_CEIL_Y, ROOM_HEIGHT, ROOM_OCULUS,
  ROOM_CYL_TOP, ROOM_WELL_RT, ROOM_LAND_R, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN, ROOM_DISC_HOLE,
  ROOM_STAIR_SIDES, ROOM_STAIR_TURNS, ROOM_STAIR_WIDTH, ROOM_STAIR_TREAD, ROOM_STAIR_RISE,
  ROOM_STAIR_BIAS, ROOM_STAIR_SLAB, ROOM_STAIR_ROUT, ROOM_STAIR_RIN, ROOM_STAIR_PHASE, ROOM_STAIR_TOTAL_ANG,
  COR_Y0, COR_THICK, BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  RAD_ANG0, RAD_T_IN, RAD_T_HW, RAD_TOP, RAD_DOOR_HW,
  DAIS_R, DAIS_STEP_H, DAIS_STEP_IN, DAIS_STEPS, DAIS_H, POOL_R, SHAFT_TOP_Y, SHAFT_TOP_R, SPOT_I,
  DEF_OCT_R, DEF_OCT_PHASE, AX_F0, AX_F1, AX_OFFSET, AX_PLAT_R, AX_MONO_SCALE,
} from './constants'

// ════════ 지하 정의·공리 방 ════════
export function DefAxiomRoom({ stairKind }) {
  const treadRef = useRef()
  const helixRef = useRef()

  // 나선 치수 — 꼭대기 칸 윗면 = 디스크 고리 윗면(49.3). 낱장 디딤판이 중심 반지름 RIN(=14, 고리 6~18 위)에 내려서고, 거기서 고리를 밟아 슬롯으로 나감.
  const TOP_SURFACE = COR_Y0 + COR_THICK / 2                       // 맨 윗 칸 윗면 = 착지 디스크 고리 윗면(49.3)
  const CLIMB       = TOP_SURFACE - ROOM_FLOOR_Y                   // 바닥 → 디스크 총 상승

  // ── 8각형 안쪽 나선 계단(공중에 뜬 낱장 디딤판) ────────────────────
  //  8등분 원을 따라 45°씩 꺾이며 중심으로 감기는 경로 위에, 얇은 디딤판을 PITCH
  //  간격으로 띄엄띄엄 얹는다. 깊이<간격이라 사이가 뜬다. 바깥(ROUT)=바닥 · 중심(RIN)=꼭대기.
  const N_SEG     = Math.max(3, Math.round(ROOM_STAIR_TURNS * ROOM_STAIR_SIDES))  // 조각(변) 수 = 회전수×변수
  const SEG_ANG   = (Math.PI * 2) / ROOM_STAIR_SIDES                              // 한 조각이 도는 각(45°)
  const TOTAL_ANG = N_SEG * SEG_ANG                                               // 누적 회전각(= TURNS×2π)
  // 코너 k(0=바닥·바깥 … N_SEG=꼭대기·중심): 반지름은 k에 선형, 각은 45°씩.
  const corner = (k) => {
    const f   = k / N_SEG
    const ang = ROOM_STAIR_PHASE + f * TOTAL_ANG                 // f=1 → ang=ROOM_TOP_AZ(37.5° — 터널 문 사이 도착)
    const r   = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f
    return { x: r * Math.cos(ang), z: r * Math.sin(ang) }
  }

  // 높이 기준 배치 — 칸마다 같은 높이(RISE)만 오른다. 경사(BIAS) 따라 간격이 자동:
  // 가파른 안쪽=촘촘(단수↑, 오르기 쉬움) · 완만한 바깥=성김. 위치는 그 높이의 8각형 경로점.
  const insts = useMemo(() => {
    const cs = []
    for (let k = 0; k <= N_SEG; k++) cs.push(corner(k))
    const cy = []                                              // 코너 누적 높이 — 안쪽일수록 가파르게(BIAS>1: 후반 급경사 → 돔 천장 회피)
    for (let k = 0; k <= N_SEG; k++) cy.push(CLIMB * Math.pow(k / N_SEG, ROOM_STAIR_BIAS))
    const nStep = Math.max(1, Math.round(CLIMB / ROOM_STAIR_RISE))  // 칸 수 = 총상승 ÷ 칸높이
    const rise  = CLIMB / nStep                               // 실제 칸높이(총상승에 딱 맞게 보정)
    const arr = []
    let seg = 0
    for (let m = 0; m < nStep; m++) {
      const yTop = (m + 1) * rise                             // 이 칸 윗면 높이(균일 상승)
      while (seg < N_SEG - 1 && yTop > cy[seg + 1]) seg++     // 이 높이에 해당하는 조각
      const span = cy[seg + 1] - cy[seg]
      const t = span > 1e-6 ? (yTop - cy[seg]) / span : 0     // 조각 내 위치(높이=위치, 둘 다 t에 선형)
      const a = cs[seg], b = cs[seg + 1]
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t
      const yRot = Math.PI / 2 - Math.atan2(b.z - a.z, b.x - a.x)  // 깊이축(z)을 진행방향에
      arr.push({ p: [x, ROOM_FLOOR_Y + yTop - ROOM_STAIR_SLAB / 2, z], ry: yRot })  // 윗면 = yTop
    }
    return arr
  }, [])
  const INST_COUNT = insts.length

  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    insts.forEach((it, i) => {
      dum.position.set(it.p[0], it.p[1], it.p[2])
      dum.rotation.set(0, it.ry, 0)
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    })
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [insts])

  // ── 비교용: 원형(매끈한) 나선 계단 — 같은 파라미터, 경로만 연속 원 ──────
  //  8각형 대신 연속 원. 같은 반지름·높이·회전·낱장 디딤판 → 형태(각짐 vs 매끈)만 비교(T키).
  const helixInsts = useMemo(() => {
    const nStep = Math.max(1, Math.round(CLIMB / ROOM_STAIR_RISE))
    const rise  = CLIMB / nStep
    const pt = (yy) => {                                        // 높이 yy에서의 원형 나선 점(각 연속)
      const f = ROOM_STAIR_BIAS === 1 ? yy / CLIMB : Math.pow(yy / CLIMB, 1 / ROOM_STAIR_BIAS)
      const ang = ROOM_STAIR_PHASE + f * TOTAL_ANG
      const r = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f
      return { x: r * Math.cos(ang), z: r * Math.sin(ang) }
    }
    const arr = []
    for (let m = 0; m < nStep; m++) {
      const yTop = (m + 1) * rise
      const cur = pt(yTop), prev = pt(Math.max(1e-4, yTop - rise * 0.5))   // 접선용 아래쪽 이웃
      const yRot = Math.PI / 2 - Math.atan2(cur.z - prev.z, cur.x - prev.x)
      arr.push({ p: [cur.x, ROOM_FLOOR_Y + yTop - ROOM_STAIR_SLAB / 2, cur.z], ry: yRot })
    }
    return arr
  }, [])

  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    helixInsts.forEach((it, i) => {
      dum.position.set(it.p[0], it.p[1], it.p[2])
      dum.rotation.set(0, it.ry, 0)
      dum.updateMatrix()
      helixRef.current.setMatrixAt(i, dum.matrix)
    })
    helixRef.current.instanceMatrix.needsUpdate = true
  }, [helixInsts])

  // 빛우물 원뿔대 벽(빗면) — ★방사 개편(2026.07.09): 동쪽 박스 문 → 대각 터널 문 4개(45°+90°k).
  //  BOX_X0=54로 단축돼 박스는 더는 원뿔대에 안 닿음(동쪽 자동 봉인). 디스크 아래·문 위 벽은 남겨 가짜 구멍 방지 + 리브 시야 차단(스포).
  // === 원뿔대(빛우물) 벽: 대각 터널 구멍 4 + 돔(구)과 겹친 부분을 CSG로 정확히 빼기 (three-bvh-csg) ===
  // ★착지 디스크 슬랩 지오(2026.07.11): 링 부채꼴(슬롯 유지)을 ROOM_STAIR_SLAB 두께로 압출. Shape θ = ring θ와 동일 규약(월드 = −θ)
  const discGeo = useMemo(() => {
    const t0 = ROOM_DISC_SLOT_START, t1 = ROOM_DISC_SLOT_START + ROOM_DISC_SLOT_LEN
    const sh = new THREE.Shape()
    sh.absarc(0, 0, ROOM_LAND_R, t0, t1, false)
    sh.absarc(0, 0, ROOM_DISC_HOLE, t1, t0, true)
    return new THREE.ExtrudeGeometry(sh, { depth: ROOM_STAIR_SLAB, bevelEnabled: false, curveSegments: 64 })
  }, [])
  const wellCut = useMemo(() => {
    const ev = new Evaluator()
    ev.attributes = ['position', 'normal']
    const rBot = ROOM_LAND_R, rTop = ROOM_WELL_RT
    const yBot = ROOM_CEIL_Y - 3, yTop = ROOM_CYL_TOP
    // 자르개 1: 대각 터널 solid ×4 — 원뿔대 벽(r18@y46)을 관통(RAD_T_IN=12 → r26)해 문을 낸다
    const doorLo = COR_Y0        // ★컷 바닥 49(구 46): 바닥판(48.68~49.28) 안 — 판 밑 원뿔벽 구멍 4곳 봉합(2026.07.11, 셸 CUT_BOT과 동일 근거)
    const cutters = []
    for (let k = 0; k < 4; k++) {
      const ang = RAD_ANG0 + k * Math.PI / 2
      const g = new THREE.BoxGeometry(26 - RAD_T_IN, RAD_TOP - doorLo, RAD_DOOR_HW * 2)  // ★폭 4.6(구 4.4): 컷 림(±2.3)이 허브 문틀 잼(2.2~2.7) 안에 삼켜짐(셸 문과 동일)
      g.translate((RAD_T_IN + 26) / 2, (RAD_TOP + doorLo) / 2, 0)
      g.rotateY(-ang)                                     // 로컬 +x → (cos ang, 0, sin ang) 방사 방향
      const b = new Brush(g); b.updateMatrixWorld()
      cutters.push(b)
    }
    // 자르개 2: 돔 solid(타원체=실제 돔 메시와 동일: 단위구 scale) — 원뿔대가 구를 파고든 부분만 제거
    const domeSolid = new THREE.SphereGeometry(1, 64, 40)
    domeSolid.scale(ROOM_R, ROOM_HEIGHT, ROOM_R)
    domeSolid.translate(ROOM_CX, ROOM_FLOOR_Y, 0)
    const domeBrush = new Brush(domeSolid); domeBrush.updateMatrixWorld()
    // 원뿔대 통벽 껍질
    const coneWall = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 96, 40, true)
    coneWall.translate(0, (yBot + yTop) / 2, 0)
    const coneWallBrush = new Brush(coneWall); coneWallBrush.updateMatrixWorld()
    // 원뿔대 − 터널×4 − 돔 (겹친 부분만 잘라냄)
    let acc = coneWallBrush
    for (const b of cutters) { acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld() }
    return ev.evaluate(acc, domeBrush, HOLLOW_SUBTRACTION).geometry
  }, [])

  // 빛 샤프트 재질(가짜 볼륨) — 표준 트릭: 시선이 기둥 중심을 관통하면(법선∥시선) 진하게, 실루엣(법선⊥시선)으로 갈수록 투명.
  // 진짜 빛기둥이 중심에서 가장 두꺼운 공기를 지나는 것과 같은 원리. + 위→아래 감쇠, 바닥 접점은 깃털(smoothstep).
  // three 내장 ShaderMaterial — 의존성 추가 없음. 원기둥 옆면 uv.y: 1=위, 0=아래. ⚠ 세기 노브 = uOpacity(0.30).
  const shaftMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffdf9e') }, uOpacity: { value: 0.30 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vN = normalMatrix * normal;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz; vY = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float edge = pow(facing, 1.6);
        float len = smoothstep(0.0, 0.18, vY) * (0.30 + 0.70 * vY);
        gl_FragColor = vec4(uColor, uOpacity * edge * len);
      }`,
  }), [])

  return (
    <group position={[ROOM_CX, 0, 0]}>
      {/* 지상 돔 껍질(불투명) + 작은 오큘러스(박스 폭 안 → 박스+디스크가 리브 시야 차단) */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_R, ROOM_HEIGHT, ROOM_R]}>
        <sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, ROOM_OCULUS, Math.PI / 2 - ROOM_OCULUS]} />
        <meshStandardMaterial color="#221b10" roughness={0.95} side={THREE.DoubleSide} fog={false} />   {/* v2.2 암실화(노브) */}
      </mesh>
      {/* ★㊵ 구화: 아랫반 셸(윗반의 거울 — 수직 반축 동일) → 반타원 돔이 완전한 타원구가 되어 공중 부양.
          내부에서는 수평 주 바닥(아래 circle)이 아랫반을 가림 — 아랫반은 바깥에서 '떠 있는 구'로만 읽힌다 */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_R, ROOM_HEIGHT, ROOM_R]}>
        <sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#221b10" roughness={0.95} side={THREE.DoubleSide} fog={false} />
      </mesh>
      {/* ★㊵ 주 바닥(수평 유지) — 구 내부를 반으로 가르는 수평 판 = 관람 레벨. 부양으로 지면(y0)과 분리돼
          구 z-fighting 근거는 소멸했으나 0.05 리프트는 벽 밑선 봉합 여유로 유지 */}
      <mesh position={[0, ROOM_FLOOR_Y + 0.05, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <circleGeometry args={[ROOM_R, 64]} />
        <meshStandardMaterial color="#241d12" roughness={0.95} side={THREE.DoubleSide} fog={false} />   {/* v2.2 암실화: 전역광은 못 꺼도 알베도×빛 곱셈으로 어둠을 만든다. fog=false: 밀폐 공간에 크림색 대기 미적용(먼 벽 뿌염 방지) */}
      </mesh>
      {/* 내부 채움광 — v2 감광(1.05→0.55): 판테온 무브의 상대 어둑함. 중앙에서 퍼지므로 선돌의 '중심을 보는 앞면'을 비추는 방향 */}
      <pointLight position={[0, ROOM_FLOOR_Y + ROOM_HEIGHT * 0.45, 0]} intensity={0.12} distance={ROOM_R * 4} decay={1.4} color="#ffe2b0" />   {/* v2.2: 거의 소등 — 어둠은 여기서 나온다 */}
      {/* 판테온 스포트 — 빛우물 위에서 원점으로 수직 낙하. three의 spotLight.target 기본값이 월드 원점(씬 밖 Object3D=항등행렬)이라 타깃 배선 불필요 */}
      <spotLight position={[0, ROOM_CYL_TOP - 6, 0]} angle={Math.atan(POOL_R / (ROOM_CYL_TOP - 6)) * 1.2}
        penumbra={0.85} intensity={SPOT_I} distance={170} decay={1.1} color="#ffe8bd" />   {/* v2.1: 웅덩이 가장자리 녹임 */}
      {/* 웅덩이 반사광 — 낮은 포인트: 선돌 앞면(r26) 가독용. 벽(r91)에 닿기 전 감쇠 */}
      <pointLight position={[0, ROOM_FLOOR_Y + DAIS_H + 2.5, 0]} intensity={1.4} distance={42} decay={1.7} color="#ffdf9e" />
      {/* 빛 샤프트 2절 — 출처 = 원뿔대 '꼭대기 구멍'(y=CYL_TOP, r=WELL_RT). 상절: 우물 안 낙하 · 하절: 디스크 구멍→웅덩이.
          두 절의 이음(디스크 높이)에서 하절 상단이 다시 밝아지는 건 의도 — 아래에서 보면 '구멍에서 빛이 나온다'로 읽힘 */}
      <mesh material={shaftMat} position={[0, (ROOM_CYL_TOP + SHAFT_TOP_Y) / 2, 0]}>
        <cylinderGeometry args={[ROOM_WELL_RT - 0.3, SHAFT_TOP_R - 0.3, ROOM_CYL_TOP - SHAFT_TOP_Y, 40, 1, true]} />
      </mesh>
      <mesh material={shaftMat} position={[0, (SHAFT_TOP_Y + ROOM_FLOOR_Y + DAIS_H) / 2, 0]}>
        <cylinderGeometry args={[SHAFT_TOP_R, POOL_R, SHAFT_TOP_Y - (ROOM_FLOOR_Y + DAIS_H), 40, 1, true]} />
      </mesh>
      {/* 계단 — T키로 8각형(각짐) ↔ 원형(매끈) 전환 비교. 둘 다 같은 파라미터·낱장 디딤판. */}
      <instancedMesh ref={treadRef} args={[undefined, undefined, INST_COUNT]} visible={stairKind === 'octagon'} userData={{ walkable: stairKind === 'octagon' }}>
        <boxGeometry args={[ROOM_STAIR_WIDTH, ROOM_STAIR_SLAB, ROOM_STAIR_TREAD]} />
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={helixRef} args={[undefined, undefined, helixInsts.length]} visible={stairKind === 'circle'} userData={{ walkable: stairKind === 'circle' }}>
        <boxGeometry args={[ROOM_STAIR_WIDTH, ROOM_STAIR_SLAB, ROOM_STAIR_TREAD]} />
        <meshStandardMaterial color="#d6ab68" roughness={0.8} />
      </instancedMesh>
      {/* 주어진 것들 — 성역 기단·각인 + 정의 옥타곤 + 공리 스테이션(나선 왼쪽 동행). 형태 = 선돌(잠정) */}
      <DefPrecinct />
      <DefOctagon />
      <AxiomStations />
      {/* 꼭대기 착지 디스크(고리) — 가운데를 뚫어(천장 개방) 나선이 그 구멍으로 올라오고 빛우물이 위로 트임. 바깥 고리(6~18)는 걷는 발판.
          ★두께 슬랩화(2026.07.11): 두께 0 ring 판이 슬롯 가장자리에서 종잇장으로 보임 → 부양 판 어휘(ROOM_STAIR_SLAB=0.35)로 압출.
          윗면 49.32(디딤판 꼭대기 49.3보다 +0.02 — 병합 구간 코플레이너 z파이팅 방지, 보행 단차 무감), 밑면 48.97 */}
      <mesh geometry={discGeo} position={[0, COR_Y0 + COR_THICK / 2 + 0.02 - ROOM_STAIR_SLAB, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 솟은 원뿔대(빛 우물) — 위는 막혀 리브 가림(스포), +x(통로)쪽 아래는 출입문으로 트여 통로로 나감.
          올려다보면 좁은 꼭대기로 빛만 보이고, 정면(통로쪽)으론 걸어 나갈 문이 있음. */}
      <mesh geometry={wellCut}>
        <meshStandardMaterial color="#97784e" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, ROOM_CYL_TOP - 8, 0]} intensity={2.4} distance={ROOM_CYL_TOP * 1.6} decay={1.1} color="#fff1d2" />
    </group>
  )
}

// ── 성역 기단(dais) + 바닥 각인: 땅이 선돌을 등록한다 (v2, 2026.07.03) ──
//  기단 = '받침'이 아니라 '지형' — 넓고(r34) 낮게(h0.7). 선돌은 그 표면에서 여전히 직접 솟는다(받침 없음 유지).
//  각인은 동심 어휘만: 팔각선(선돌 8기를 꿰는 고리) + 상단 가장자리 링. ⚠ 방사선(중심→선돌)은 금지 — 별자리 의존선 어휘와 충돌(정의끼리 연결된 듯 오독).
function DefPrecinct() {
  const DAIS_TOP_R = DAIS_R - DAIS_STEP_IN * (DAIS_STEPS - 1)
  return (
    <group>
      {Array.from({ length: DAIS_STEPS }, (_, k) => (
        <mesh key={k} position={[0, ROOM_FLOOR_Y + DAIS_STEP_H * (k + 0.5), 0]} userData={{ walkable: true }}>
          <cylinderGeometry args={[DAIS_R - DAIS_STEP_IN * k, DAIS_R - DAIS_STEP_IN * k, DAIS_STEP_H, 96]} />
          <meshStandardMaterial color="#322817" roughness={0.95} fog={false} />   {/* v2.2 암실화 — 여전히 바닥보다 한 단 위(성역) */}
        </mesh>
      ))}
      {/* 팔각 각인선 — ringGeometry의 thetaSegments=8이면 8각 고리. 꼭짓점 각 집합이 좌우대칭이라 rotation-x 뒤집힘과 무관하게 선돌 각과 일치 */}
      <mesh position={[0, ROOM_FLOOR_Y + DAIS_H + 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[DEF_OCT_R - 0.28, DEF_OCT_R + 0.28, 8, 1, DEF_OCT_PHASE]} />
        <meshStandardMaterial color="#6b5942" roughness={1} side={THREE.DoubleSide} fog={false} />   {/* v2.2 반전: 암실에선 각인이 밝은 쪽 */}
      </mesh>
      {/* 상단 가장자리 링 */}
      <mesh position={[0, ROOM_FLOOR_Y + DAIS_H + 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[DAIS_TOP_R - 1.6, DAIS_TOP_R - 1.0, 96]} />
        <meshStandardMaterial color="#6b5942" roughness={1} side={THREE.DoubleSide} fog={false} />   {/* v2.2 반전: 암실에선 각인이 밝은 쪽 */}
      </mesh>
    </group>
  )
}

// ── 정의 옥타곤: 기단 위 정팔각형 선돌 8기 ──
//  D1 = +22.5°(전방 우측 첫 자리) → D1→D8 시계방향(위에서 — 계단 감김과 같은 손방향). +x는 틈 = 출발 축.
const DEF_IDS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
function DefOctagon() {
  return (
    <group>
      {DEF_IDS.map((id, i) => {
        const a = DEF_OCT_PHASE + i * (Math.PI / 4)
        return <GivenMonolith key={id} id={id} baseY={ROOM_FLOOR_Y + DAIS_H}
          x={DEF_OCT_R * Math.cos(a)} z={DEF_OCT_R * Math.sin(a)} yRot={-a} />
      })}
    </group>
  )
}

// ── 공리 스테이션: 나선 등반에 동행하는 7기 ──
//  각 스테이션 = 그 지점 '발높이'에 부양하는 플랫폼 + 미니 선돌(기둥 제거 2026.07.03). 발높이 = CLIMB·f^BIAS(원형 계단 높이식의 역함수).
//  글자면은 안쪽(등반자) 향함. 확정형 = 원형 나선 기준 — T키 옥타곤 비교 모드에선 미세 어긋남(비교용이라 무시).
const AX_IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']
function AxiomStations() {
  const CLIMB = COR_Y0 + COR_THICK / 2 - ROOM_FLOOR_Y          // 총 상승 — DefAxiomRoom과 동일 기준(디스크 고리 윗면)
  return (
    <group>
      {AX_IDS.map((id, i) => {
        const f = AX_F0 + (AX_F1 - AX_F0) * (i / (AX_IDS.length - 1))
        const ang = ROOM_STAIR_PHASE + f * ROOM_STAIR_TOTAL_ANG
        const r = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f + AX_OFFSET   // 등반 시야 왼쪽 = 바깥(+radial)
        const x = r * Math.cos(ang), z = r * Math.sin(ang)
        const platTop = ROOM_FLOOR_Y + CLIMB * Math.pow(f, ROOM_STAIR_BIAS)              // 그 f의 디딤판 윗면 높이
        return (
          <group key={id}>
            <mesh position={[x, platTop - ROOM_STAIR_SLAB / 2, z]}>
              <cylinderGeometry args={[AX_PLAT_R, AX_PLAT_R, ROOM_STAIR_SLAB, 24]} />
              <meshStandardMaterial color="#d6ab68" roughness={0.8} />
            </mesh>
            <GivenMonolith id={id} x={x} z={z} baseY={platTop} yRot={-ang}
              s={AX_MONO_SCALE} near={4} far={13} />
          </group>
        )
      })}
    </group>
  )
}
