// Dome.jsx — 돔·리브 세계: Ground / DomeRibs(71) / ExplorationRib(CSG 문+아치) / Apex /
//            RibStair(문→무릎길 나선 + 절단 폴) / KneeWalk / RibJunction / Lookout(1p8) /
//            RevealPassage(연결 통로 — 끝 문 = 1p11 공개) / Terrace
//  ★1-③B(2026.07.05): 상부 구간 구현 — 관내 잔류(§1) 완성. LandingPad·StraightFlight 폐기 제거.
//  ★1-③A(2026.07.04): 탐험 리브 분리(72→71+1) + −x면 CSG 문 + 나선 재정의 + 폴 절단(1p7)
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  rOf, uOfX, spiralPoint, SCALE, H, R_BASE, MERIDIANS, SHELL_RIB_R, RIB_RADIAL_SEG,
  STAIR_STEPS, STEP_RISE, TREAD_DEPTH, TREAD_WIDTH, TREAD_THICK, POLE_R, Y_POLE_CUT, U_DOOR,
  DOOR_W, DOOR_H, DOOR_SILL_Y,
  U_SPIRAL_END, U_KNEE_END, KW_STEPS, KW_GO, KW_TREAD_D, KW_TREAD_W, KW_FLATTEN, PANEL_DX, PANEL_Z0, PANEL_Z1, LAND_R, LAND_T, X_LAND_LO, X_LAND_HI, Z_LAND,
  JCT_UP_Z, JCT_DN_Z, LOOKOUT_MAX_SLOPE, U_LOOKOUT_END, LK_STEPS, LK_PLAT_R, LK_DISC_LIFT,
  DESC_SLOPE, DESC_STEPS, X_DESC0, X_DESC_END, PASS_FLOOR_Y,
  PASS_HW, PASS_T, PASS_ROOF_H, PASS_X_DEEP, PASS_X_CHEEK, CHEEK_TOP_NZ, CHEEK_TOP_PZ, PASS_X_END,
  LINTEL_X, LINTEL_Y0, LINTEL_Y1,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1,
  PASS_DOOR_W, PASS_DOOR_H,
  TERRACE_Y, TERRACE_RIN, TERRACE_ROUT, TERRACE_ARC,
} from './constants'

export function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial color="#6f5e44" roughness={1} />
    </mesh>
  )
}

// 공유 리브 곡선 — 탐험 리브·나머지 71개가 반드시 같은 곡선·같은 해상도(형태 동일 LOCKED §1).
// φ=0(+x) 평면에 정의; 나머지는 y축 회전 인스턴스로 복제.
function makeRibCurve() {
  const pts = []; const SEG = 160
  for (let i = 0; i <= SEG; i++) { const u = i / SEG; pts.push(new THREE.Vector3(rOf(u), H * u, 0)) }
  return new THREE.CatmullRomCurve3(pts)
}
const RIB_MAT = { color: '#bb8a4e', roughness: 0.7, metalness: 0 }   // 두 컴포넌트 공유(재질 동일 LOCKED)
// 디딤판·판(부양 요소) / 통로 외피 — Corridor 어휘 공유
const TREAD_MAT = { color: '#d6ab68', roughness: 0.8 }
const SHELL_MAT = { color: '#c2a062', roughness: 0.9 }
const FLOOR_MAT = { color: '#a98f5e', roughness: 0.95 }

// ── 셸: 경선 리브 71개 (= 단일 속성 실체, 전부 균일) — 탐험 리브(#0)는 ExplorationRib가 담당 ──
export function DomeRibs() {
  const ribRef = useRef()
  const curve = useMemo(() => makeRibCurve(), [])
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 1; i < MERIDIANS; i++) {            // i=0(φ=0) 제외 → 인스턴스 71개, 각도 체계는 불변
      dummy.rotation.set(0, (i / MERIDIANS) * Math.PI * 2, 0)
      dummy.updateMatrix()
      ribRef.current.setMatrixAt(i - 1, dummy.matrix)
    }
    ribRef.current.instanceMatrix.needsUpdate = true
  }, [curve])
  return (
    <instancedMesh ref={ribRef} args={[undefined, undefined, MERIDIANS - 1]}>
      <tubeGeometry args={[curve, 200, SHELL_RIB_R, RIB_RADIAL_SEG, false]} />
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

// ── 탐험 리브(#0, φ=0): 형태·재질은 나머지와 완전 동일(LOCKED) — 유일한 차이 = CSG 개구 2곳 ──
//  ① 문(−x면, 1-③A): 통로쪽만 관통, +x(바깥) 불투명 보존 = 스포 3중 차단의 ①.
//  ② 아치(하부 벽, 1-③B): 갈림 하강로가 관 하부 벽을 지나는 대각 띠. ★입은 '외부'가 아니라
//     보어와 통로 내부를 잇는다 — 뚫린 면의 바깥은 RevealPassage 외피가 전부 봉함(누출 검증 = 스크립트).
//  둘 다 HOLLOW_SUBTRACTION(열린 껍질 — 겹치는 면만 제거, 뚜껑 없음) 체이닝.
export function ExplorationRib() {
  const geo = useMemo(() => {
    const tube = new THREE.TubeGeometry(makeRibCurve(), 200, SHELL_RIB_R, RIB_RADIAL_SEG, false)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    // ① 문 자르개: 세로 슬롯 상자 — x중심을 −x벽(rOf(U_DOOR)−SHELL_RIB_R ≈ 282)에, 깊이 = SHELL_RIB_R(6)
    //   → x∈[279,285]: −x면(≈282)만 관통, 중심(288)·+x벽(294)에는 못 미침.
    const wallX = rOf(U_DOOR) - SHELL_RIB_R
    const doorCut = new THREE.BoxGeometry(SHELL_RIB_R, DOOR_H, DOOR_W)
    doorCut.translate(wallX, DOOR_SILL_Y + DOOR_H / 2, 0)
    // ② 아치 자르개: 축정렬 상자(constants ARCH_*) — 하강 보행자 발–머리 대각 띠를 덮는 최소 창.
    //   y 상한(갈림+0.2)을 넘기면 남은 벽이 줄어 '지붕 위 시선' 누출 — 린텔(LINTEL_Y1)과 짝(검증 21·22항).
    const archCut = new THREE.BoxGeometry(ARCH_X1 - ARCH_X0, ARCH_Y1 - ARCH_Y0, ARCH_Z1 - ARCH_Z0)
    archCut.translate((ARCH_X0 + ARCH_X1) / 2, (ARCH_Y0 + ARCH_Y1) / 2, (ARCH_Z0 + ARCH_Z1) / 2)
    const ribBrush = new Brush(tube); ribBrush.updateMatrixWorld()
    const b1 = new Brush(doorCut); b1.updateMatrixWorld()
    const step1 = ev.evaluate(ribBrush, b1, HOLLOW_SUBTRACTION)
    const b2 = new Brush(archCut); b2.updateMatrixWorld()
    return ev.evaluate(step1, b2, HOLLOW_SUBTRACTION).geometry
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial {...RIB_MAT} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Apex() {
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

// ── 나선 계단(1-③A): 문(RIB_Y) → 무릎길 진입. f축(constants.spiralPoint) 위에 디딤판 배치 ──
//  · 폴(1p7 device): 외부 지지의 '가설' — 지면(y=0)에서 올라 1p6 지점(Y_POLE_CUT)에서 종단·평면 캡.
export function RibStair() {
  const treadRef = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    for (let i = 0; i < STAIR_STEPS; i++) {
      const f = (i + 0.5) / STAIR_STEPS
      const { pos, theta } = spiralPoint(f)
      dum.position.copy(pos)
      dum.rotation.set(0, -theta, 0)                 // 디딤판 장축(x=TREAD_DEPTH)이 방사 방향 — 구판 문법 유지
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    }
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={treadRef} args={[undefined, undefined, STAIR_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      <mesh position={[R_BASE, Y_POLE_CUT / 2, 0]}>
        <cylinderGeometry args={[POLE_R, POLE_R, Y_POLE_CUT, 12]} />
        <meshStandardMaterial color="#8f6c3e" roughness={0.85} />
      </mesh>
    </>
  )
}

// ── 착지 디스크(전망 플랫폼): 부양 판(방 디딤판 어휘). 온전한 원판, topLift로 높이 조정 ──
//  (갈림 디스크는 무릎길 슬롯이 필요해 아래 JunctionDisc가 따로 담당.)
function LandingDisc({ u, topLift = 0.1, r = LAND_R }) {
  const cx = rOf(u), topY = u * H + topLift
  return (
    <mesh position={[cx, topY - LAND_T / 2, 0]} userData={{ walkable: true }}>
      <cylinderGeometry args={[r, r, LAND_T, 40]} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 갈림 착지장(JunctionLanding, ★②-재설계 v3 2026.07.06): 사각 판. 세 계단이 판 가장자리에서 시작(관통 없음).
//  무릎길은 +x 변(X_LAND_HI=xB)에 도착 · 전망(z−2.4)·하강(z+1.75)은 −x 변(X_LAND_LO)에서 밖으로 나감(위/아래).
//  전망을 '곧은 램프'로 바꾼 것과 짝(리브곡면 따라 판 위로 가로지르던 문제 소멸). 단순 박스.
function JunctionLanding() {
  const w = X_LAND_HI - X_LAND_LO
  return (
    <mesh position={[(X_LAND_LO + X_LAND_HI) / 2, U_KNEE_END * H + 0.1 - LAND_T / 2, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[w, LAND_T, 2 * Z_LAND]} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 착지 판넬(LandingPanel, ★1-③G): 나선 옆끝(z=+STAIR_R)에서 무릎길 중앙(z=0)으로 가로지르는 솔리드 착지판 ──
//  나선 도착 → 판넬 건너 중앙 → 중앙 계단. 무릎길 z 드리프트 폐기(비스듬함 소멸) + 계단 옆쏠림 없어져 관 이탈도 해소.
//  상면 = 계단 상면보다 살짝 아래(−TREAD_THICK/2−0.03) → 계단이 판넬 위에 떠(z파이팅 없음), 착지판은 얕게 파인 랜딩.
function LandingPanel() {
  const xC = rOf(U_SPIRAL_END)                                     // 나선 도착 x
  const yTop = H * U_SPIRAL_END - TREAD_THICK / 2 - 0.03           // 판넬 상면(계단 밑면보다 살짝 아래)
  const zC = (PANEL_Z0 + PANEL_Z1) / 2
  return (
    <mesh position={[xC, yTop - LAND_T / 2, zC]} userData={{ walkable: true }}>
      <boxGeometry args={[PANEL_DX, LAND_T, PANEL_Z1 - PANEL_Z0]} />
      <meshStandardMaterial {...TREAD_MAT} />
    </mesh>
  )
}

// ── 무릎길(KneeWalk, ★1-③B · 재작성 ★1-③E · 경사완화 ★1-③F · 중앙정렬 ★1-③G): 나선 나감 → 갈림 디스크 ──
//  ★1-③E (가): 나선이 −x로 나가므로 무릎길이 그대로 이어짐(평면 급반전 131°→9° 소멸) — 다리 폐기.
//  ★1-③F (ㄱ): 높이 = 리브 중심선과 곧은 현 KW_FLATTEN 블렌드 → 시작 62°→35°(관 안). 수평 균일(Δx=KW_GO) → 무더기·틈 없음(1-③D).
//  ★1-③G: z=0 중앙 정렬(드리프트 폐기) → 비스듬함 소멸. 나선 옆끝(z+STAIR_R)↔중앙(z=0)은 판넬(LandingPanel)이 이음.
export function KneeWalk() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const xA = rOf(U_SPIRAL_END), xB = X_LAND_HI                          // ★도착 x = 판 +x변(X_LAND_HI, 커플링 2026.07.07). 기본 = rOf(U_KNEE_END). 나선 끝 x → 판 +x변
    //  ⚠칸수(KW_STEPS)는 나선끝 기준이라, X_LAND_HI를 크게 넓히면 디딤판이 살짝 촘촘해짐(틈은 안 생김). 넓히는 방향이라 무해 — 필요 시 칸수도 커플링.
    const yA = H * U_SPIRAL_END, yB = H * U_KNEE_END                      // 현(chord) 양끝 높이 (나선끝·정션)
    for (let i = 0; i < KW_STEPS; i++) {
      const x = xA - (i + 0.5) * (xA - xB) / KW_STEPS                     // 수평 균일 간격
      const yCen = H * uOfX(x)                                            // 리브 중심선 높이(가파름)
      const yChord = yA + (yB - yA) * (xA - x) / (xA - xB)                // 곧은 현 높이(완만 ~25°)
      const y = (1 - KW_FLATTEN) * yCen + KW_FLATTEN * yChord             // 블렌드 → 완만화(중심축서 아래로 뜸)
      dum.position.set(x, y, 0)                                           // z=0 중앙 (드리프트 폐기, 1-③G)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <LandingPanel />
      <instancedMesh ref={ref} args={[undefined, undefined, KW_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[KW_TREAD_D, TREAD_THICK, KW_TREAD_W]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
    </>
  )
}

// ── 갈림(RibJunction, ★1-③B): 무릎길 끝 디스크 + 하강 갈래(아치로) ──
//  ★갈림 = 논증(§3): 위로 계속 올라도(Lookout·1p8) 막다름 — 되돌아 내려가(이 하강) 이행(1p9·10)을
//  거쳐야 1p11(공개)에 이른다. 하강 = z=JCT_DN_Z, 경사 DESC_SLOPE, 디스크 가장자리(X_DESC0)에서 −x로.
export function RibJunction() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const yTop = U_KNEE_END * H
    for (let i = 0; i < DESC_STEPS; i++) {
      const y = yTop - (i + 0.5) * STEP_RISE
      dum.position.set(X_DESC0 - (yTop - y) / DESC_SLOPE, y, JCT_DN_Z)
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      {/* ★②-재설계: 타원 착지장(JunctionLanding). 무릎길이 +x끝에 닿음(도랑 폐기) + 전망·하강은 판 위/가장자리서 갈라짐. */}
      <JunctionLanding />
      <instancedMesh ref={ref} args={[undefined, undefined, DESC_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH * 2]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
    </>
  )
}

// ── 1p8 전망(Lookout, ★1-③B · ②-재설계 v3): 갈림 착지장 −x 변에서 '곧은 램프'로 상행(z=JCT_UP_Z) → 플랫폼(막다름).
//  ★②v3: 리브곡면 따라(x=rOf) 상행하던 걸 곧은 램프(X_LAND_LO서 −x·경사 LOOKOUT_MAX_SLOPE)로 교체 —
//  곡면 상행은 첫 칸이 리브 중심선(x≈186)서 시작해 사각 판 위로 가로질렀음. 곧은 램프는 판 −x 가장자리서
//  밖으로 곧게 올라가 판을 안 지남. 플랫폼(z=0 보어 올려다보기)·높이·칸수는 그대로.
export function Lookout() {
  const ref = useRef()
  useLayoutEffect(() => {
    const dum = new THREE.Object3D()
    const y0 = U_KNEE_END * H
    for (let i = 0; i < LK_STEPS; i++) {
      const y = y0 + (i + 1) * STEP_RISE           // (i+1): 착지장 상면과 관통 방지
      dum.position.set(X_LAND_LO - (i + 1) * STEP_RISE / LOOKOUT_MAX_SLOPE, y, JCT_UP_Z)  // 곧은 램프: −x 변서 −x·위로
      dum.updateMatrix()
      ref.current.setMatrixAt(i, dum.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, LK_STEPS]} userData={{ walkable: true }}>
        <boxGeometry args={[TREAD_DEPTH, TREAD_THICK, TREAD_WIDTH * 2]} />
        <meshStandardMaterial {...TREAD_MAT} />
      </instancedMesh>
      {/* ★②: 디스크를 LK_DISC_LIFT만큼 띄워 밑면이 끝 스텝 위로 → 끝 스텝이 판을 뚫던 겹침 소멸. 올라서기 ≈0.40. */}
      <LandingDisc u={U_LOOKOUT_END} r={LK_PLAT_R} topLift={LK_DISC_LIFT} />
    </>
  )
}

// ── 연결 통로(RevealPassage, ★1-③B): 아치 밑 하강 → 린텔 → 낮은 전실(1p9·10) → 끝벽 문 = 1p11 공개 ──
//  z중심 = JCT_DN_Z. 밀폐(스포 3중 차단의 ③): 바닥 슬랩 + 볼벽(웨지 구간은 높게 = 아치 뺨) + 전실 지붕 +
//  린텔 패널(웨지↔전실 상인방 — 입 상단 너머 시선 봉쇄 + '압축의 문턱') + 끝벽(문 개구 = 4박스 조립).
//  2절 압축: 높은 웨지(아치) → 린텔 밑 → 내부고 5.5 전실 → 문 → 공개(해방). TERRACE_Y = 바닥(파생) = 무단차.
export function RevealPassage() {
  const zc = JCT_DN_Z
  const zw = PASS_HW + PASS_T / 2                       // 볼벽 중심 z 오프셋
  const roofY = PASS_FLOOR_Y + PASS_ROOF_H              // 전실 지붕 밑면 ③≈253.5
  const lenB = LINTEL_X - PASS_X_END                    // 전실 길이 ③≈17.1
  const doorHW = PASS_DOOR_W / 2
  const sideW = PASS_HW - doorHW                        // 끝벽 좌우 패널 폭 ③=0.7
  return (
    <group>
      {/* 바닥 슬랩 — 리브 하부면 물림점(PASS_X_DEEP)까지 연장 = 갈림 디스크 아래 봉인(스포 차단, 검증 ㉙) */}
      <mesh position={[(PASS_X_END + PASS_X_DEEP) / 2, PASS_FLOOR_Y - PASS_T / 2, zc]} userData={{ walkable: true }}>
        <boxGeometry args={[PASS_X_DEEP - PASS_X_END, PASS_T, 2 * PASS_HW + 2 * PASS_T]} />
        <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
      </mesh>
      {/* 볼벽 — 전실 구간(바닥→지붕) */}
      {[-zw, zw].map((dz, k) => (
        <mesh key={'wb' + k} position={[(PASS_X_END + LINTEL_X) / 2, (PASS_FLOOR_Y + roofY + PASS_T) / 2, zc + dz]}>
          <boxGeometry args={[lenB, roofY + PASS_T - PASS_FLOOR_Y, PASS_T]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* 볼벽 — 웨지 구간(아치 뺨·비대칭): −z(상행 쪽)는 디스크 하면 아래(255.4)·볼끝 184.7로 짧게,
          +z(바깥 쪽)는 디스크 비교차(r4 < z4.35)라 257.5 높이 + 슬랩 물림점(189.5)까지 연장 —
          디스크 아래 포켓의 +z 측면 시선 봉쇄(검증 ㉛ 실측) + 디스크의 아치 쪽 난간(파라펫) 겸용 */}
      {[[-zw, CHEEK_TOP_NZ, PASS_X_CHEEK], [zw, CHEEK_TOP_PZ, PASS_X_DEEP]].map(([dz, top, xEnd], k) => (
        <mesh key={'ww' + k} position={[(LINTEL_X + xEnd) / 2, (PASS_FLOOR_Y + top) / 2, zc + dz]}>
          <boxGeometry args={[xEnd - LINTEL_X, top - PASS_FLOOR_Y, PASS_T]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* 전실 지붕(윗면 ≈254.1 — 리브 하부면 아래로 깔림, 검증 스크립트) */}
      <mesh position={[(PASS_X_END + LINTEL_X + PASS_T) / 2, roofY + PASS_T / 2, zc]}>
        <boxGeometry args={[lenB + PASS_T, PASS_T, 2 * PASS_HW + 2 * PASS_T]} />
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
      {/* 린텔 패널(상인방): 개구 y∈[바닥, LINTEL_Y0] — 위(LINTEL_Y0→Y1)를 막아 지붕 위 시선 봉쇄 */}
      <mesh position={[LINTEL_X + PASS_T / 2, (LINTEL_Y0 + LINTEL_Y1) / 2, zc]}>
        <boxGeometry args={[PASS_T, LINTEL_Y1 - LINTEL_Y0, 2 * PASS_HW + 2 * PASS_T]} />
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
      {/* 끝벽(문 = 1p11 공개의 물리 지점): 좌우 패널 + 상인방 — CSG 없이 조립 */}
      {[-1, 1].map((s) => (
        <mesh key={'dj' + s} position={[PASS_X_END, (PASS_FLOOR_Y + roofY + PASS_T) / 2, zc + s * (doorHW + sideW / 2)]}>
          <boxGeometry args={[PASS_T, roofY + PASS_T - PASS_FLOOR_Y, sideW]} />
          <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[PASS_X_END, (PASS_FLOOR_Y + PASS_DOOR_H + roofY + PASS_T) / 2, zc]}>
        <boxGeometry args={[PASS_T, roofY + PASS_T - PASS_FLOOR_Y - PASS_DOOR_H, PASS_DOOR_W]} />
        <meshStandardMaterial {...SHELL_MAT} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── 테라스(1p12~15의 집 · 문 밖 = 1p11 공개) — y는 통로 바닥 파생(constants), 무단차 도착 ──
export function Terrace() {
  return (
    <mesh position={[0, TERRACE_Y, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
      <ringGeometry args={[TERRACE_RIN, TERRACE_ROUT, 64, 1, -TERRACE_ARC / 2, TERRACE_ARC]} />
      <meshStandardMaterial color="#caa161" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  )
}
