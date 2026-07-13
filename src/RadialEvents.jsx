// ════════════════════════════════════════════════════════════════════
//  RadialEvents.jsx — 1p1~4 방별 사건 + 방사 비석 4기 (2026.07.12)
//  마운트 전용 박층: 실기하는 radialEventsGeometry.js(순수 모듈 — check_rooms 공유).
//  대응(㉕ 확정): NE=1p1 볼록 바닥 · NW=1p2 두 볼트 천장 · SW=1p3 두 팔 · SE=1p4 분류표.
//  방 단위 독립: Pn_ON(constants) = 폐기 스위치. 비석은 사건과 무관하게 항상 4기(상수층).
//  재질 = 각 사건이 속한 매체의 색 그대로(§10: 색으로 사건을 구분하지 않음 —
//  Radial.jsx MAT_FLOOR/MAT_SHELL/MAT_WALL과 동일 헥사).
// ════════════════════════════════════════════════════════════════════
import { useMemo } from 'react'
import * as THREE from 'three'
import {
  RAD_R, RAD_ANG0, P_ROOM, P_FLOOR_TOP,
  P1_ON, P2_ON, P3_ON, P4_ON, P2_SHEAR_AZ, P3_AZ,
  P_ST_X, P_ST_NEAR, P_ST_FAR,
} from './constants.js'
import { buildP1Swells, buildP2Shear, buildP3Pulls, buildP4A, p1HeightAt } from './radialEventsGeometry.js'
import { PropStele } from './Steles.jsx'

const MAT_FLOOR = { color: '#c2a062', roughness: 0.9 }   // = Radial.jsx MAT_FLOOR
const MAT_SHELL = { color: '#c3ae7f', roughness: 0.9 }   // = Radial.jsx MAT_SHELL
const MAT_WALL  = { color: '#b89a6a', roughness: 0.9 }   // = Radial.jsx MAT_WALL

function PetalFrame({ k, children }) {                   // Radial.jsx 꽃잎 배치와 동일 변환
  const ang = RAD_ANG0 + k * Math.PI / 2
  return (
    <group position={[RAD_R * Math.cos(ang), 0, RAD_R * Math.sin(ang)]} rotation-y={-ang}>
      {children}
    </group>
  )
}

// ── 1p1(NE) 볼록 바닥: 방 전체의 완만한 융기 — 유일하게 '요소를 더하지 않은' 방 ──
// ── 1p1(NE) 아직 떨어지지 않은 것들(★㉞ A 확정): 미분리 융기 4. 재질 = 바닥(연속·미분리가 직독) ──
function P1Event() {
  const items = useMemo(() => buildP1Swells().geos, [])
  return (
    <group>
      {items.map((g, i) => (
        <mesh key={i} geometry={g} userData={{ walkable: true }}>
          <meshStandardMaterial {...MAT_FLOOR} />
        </mesh>
      ))}
    </group>
  )
}

// ── 1p2(NW) 어긋난 두 천장(전단): 다른 높이의 두 천장 + 수직 절벽면 ──
//  ★재작업 ㉘(구 능선 공유 기각 — 균질광에서 안 읽힘). 메시 3장 분리 = 법선 독립
//  (절벽면은 옆을 향해 균질광에서 중간톤 — 이 방의 유일한 '보이는' 면).
function P2ShearCeilings() {
  const { geoA, geoB, geoFace } = useMemo(() => buildP2Shear(), [])
  return (
    <group rotation-y={P2_SHEAR_AZ}>
      <mesh geometry={geoA}><meshStandardMaterial {...MAT_SHELL} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geoB}><meshStandardMaterial {...MAT_SHELL} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geoFace}><meshStandardMaterial {...MAT_SHELL} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

// ── 1p3(SW) 천장 인발 4기: 근접 출발 → 발산, 한 쌍만 스침(★재작업 ㉙) ──
//  재질 = 셸 동일("같은 점토에서 뽑힘"이 직독 — 이질성은 재질이 아니라 형태 어휘가 담당).
function P3CeilingPulls() {
  const { geos } = useMemo(() => buildP3Pulls(), [])
  return (
    <group rotation-y={P3_AZ}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}><meshStandardMaterial {...MAT_SHELL} side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  )
}

// ── 1p4(SE) 뚫린 것과 막힌 것(★㉜ A 확정 — 무어 군집): 관통 = 속성 · 기욺 = 변용 ──
//  재질 = 셸(바닥 융기로 오독 방지 — 바닥 어휘는 1p1 소유). 크기 = P4_SCALE.
function P4Event() {
  const { geos } = useMemo(() => buildP4A(), [])
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}><meshStandardMaterial {...MAT_SHELL} /></mesh>
      ))}
    </group>
  )
}

// ── 조립: 사건 4종 + 비석 4기 ──
//  비석: 전 방 로컬 +x 벽 앞·허브 문(−x) 정면·어휘 4방 동일(PropStele 무수정 재사용 —
//  글자 페이드는 월드좌표라 회전 그룹 안에서도 정상). NE만 볼록 바닥 위 base 보정(살짝 매몰).
export function RadialEvents() {
  const p1Lift = P1_ON ? p1HeightAt(P_ST_X, 0) - 0.08 : 0
  return (
    <group>
      {P1_ON && <PetalFrame k={P_ROOM.p1}><P1Event /></PetalFrame>}
      {P2_ON && <PetalFrame k={P_ROOM.p2}><P2ShearCeilings /></PetalFrame>}
      {P3_ON && <PetalFrame k={P_ROOM.p3}><P3CeilingPulls /></PetalFrame>}
      {P4_ON && <PetalFrame k={P_ROOM.p4}><P4Event /></PetalFrame>}
      {[['1p1', P_ROOM.p1, p1Lift], ['1p2', P_ROOM.p2, 0], ['1p3', P_ROOM.p3, 0], ['1p4', P_ROOM.p4, 0]].map(([id, k, lift]) => (
        <PetalFrame key={id} k={k}>
          <PropStele id={id} x={P_ST_X} z={0} faceY={P_FLOOR_TOP + lift} near={P_ST_NEAR} far={P_ST_FAR} />
        </PetalFrame>
      ))}
    </group>
  )
}
