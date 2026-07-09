// Radial.jsx — ★방사 복합체(1p1~4 네 방·고리) 매싱 드래프트 2026.07.09
//  골격: 허브(기존 랜딩+빛우물, Room.jsx가 원뿔대에 대각 문 4개를 뚫음) → 대각 터널 4(박스 어휘: 돔 표면 스커트+평천장)
//        → 유선형 꽃잎 방 4(납작 타원구 셸 — ★한 기하를 4회 회전 배치 = '등형'의 문자적 실현)
//        → 고리(원호 통로, 회랑 어휘) → 동측에서 박스 옆벽 접합문으로 통로(=1p5)에 인계.
//  방 내부 표현은 전부 미정(빈 셸) — 이 모듈은 덩어리·동선·밀폐만 책임진다. 수치 정본 = constants.js RAD 블록.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  domeClipY, COR_Y0, COR_THICK, BOX_HW,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY,
  RAD_T_HW, RAD_TOP, RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN,
  RAD_JPHI, RAD_JX, RAD_FLOOR_Y, RAD_T_IN,
} from './constants'

const MAT_WALL  = '#b89a6a'   // 터널·고리(통로 외피와 같은 가족)
const MAT_SHELL = '#c3ae7f'   // 꽃잎 셸(살짝 밝게 — 매싱 구분용, 재질은 Phase 3에서)
const MAT_FLOOR = '#c2a062'   // 바닥(길 연속)
const DSILL = COR_Y0                             // 문 밑선(바닥판 아래 걸침)
const DTOP  = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H // 문 상단 54.3

// 공용 쿼드 빌더
function quadGeo(build) {
  const pos = [], idx = []
  const q = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
    const n = pos.length / 3
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  build(q)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

// ── 꽃잎 셸(로컬 프레임: +x = 방사 바깥, 문 = 안쪽 −x 1 + 접선 ±z 2) — 한 번 만들어 4회 배치 ──
function buildPetalShell() {
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const shell = new THREE.SphereGeometry(1, 48, 32)
  shell.scale(RAD_PRX, RAD_PRY, RAD_PRX)
  shell.translate(0, RAD_PCY, 0)
  let acc = new Brush(shell); acc.updateMatrixWorld()
  const doorCut = (cx, cz, alongX) => {
    // alongX: 문이 x축 방향으로 관통(안쪽 문) / 아니면 z축 방향(접선 고리 문)
    const g = alongX
      ? new THREE.BoxGeometry(8, DTOP - (DSILL - 0.5), RAD_DOOR_HW * 2)
      : new THREE.BoxGeometry(RAD_DOOR_HW * 2, DTOP - (DSILL - 0.5), 8)
    g.translate(cx, (DTOP + DSILL - 0.5) / 2, cz)
    const b = new Brush(g); b.updateMatrixWorld()
    acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld()
    return acc
  }
  doorCut(-RAD_PRX + 1, 0, true)     // 안쪽 문(허브 터널)
  doorCut(0, RAD_PRX - 1, false)     // 접선 문(고리 +)
  doorCut(0, -(RAD_PRX - 1), false)  // 접선 문(고리 −)
  return acc.geometry
}

// ── 대각 터널(월드 좌표: 각 ang, 반경 s0→s1): 바닥판 + 스커트 벽 2 + 천장판 ──
function Tunnel({ ang }) {
  const d = [Math.cos(ang), Math.sin(ang)]
  const n = [-Math.sin(ang), Math.cos(ang)]
  const sWall0 = 15.5                       // 원뿔벽(r≈16~17@문높이) 관통 시작
  const s1 = RAD_R - RAD_PRX + 2.5          // 꽃잎 셸 2.5 관입(봉합 — 진입점 셸 내부고가 RAD_TOP 위: 폐합 검증)
  const wallGeo = useMemo(() => quadGeo((q) => {
    for (const sgn of [1, -1]) {
      const off = sgn * RAD_T_HW
      const seg = Math.max(3, Math.ceil((s1 - sWall0) / 4))
      for (let i = 0; i < seg; i++) {
        const sa = sWall0 + (s1 - sWall0) * (i / seg)
        const sb = sWall0 + (s1 - sWall0) * ((i + 1) / seg)
        const ax = sa * d[0] + off * n[0], az = sa * d[1] + off * n[1]
        const bx = sb * d[0] + off * n[0], bz = sb * d[1] + off * n[1]
        q(ax, domeClipY(ax, az), az, bx, domeClipY(bx, bz), bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
    }
  }), [ang])
  const midF = (RAD_T_IN + s1) / 2, lenF = s1 - RAD_T_IN
  const midC = (sWall0 + s1) / 2, lenC = s1 - sWall0
  return (
    <group>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 바닥판(디스크 r6~18 밑을 지나 꽃잎까지 — 디스크가 위를 덮음, 0.02 립) */}
      <mesh position={[midF * d[0], RAD_FLOOR_Y, midF * d[1]]} rotation-y={-ang} userData={{ walkable: true }}>
        <boxGeometry args={[lenF, COR_THICK, RAD_T_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 천장판 */}
      <mesh position={[midC * d[0], RAD_TOP + 0.2, midC * d[1]]} rotation-y={-ang}>
        <boxGeometry args={[lenC, 0.4, RAD_T_HW * 2 + 0.4]} />
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── 고리 원호 구간(월드, phi0→phi1): 바닥 고리판(보행) + 안/밖 스커트 벽 + 지붕 고리판 ──
function ArcSection({ phi0, phi1 }) {
  const rIn = RAD_R - RAD_T_HW, rOut = RAD_R + RAD_T_HW
  const seg = Math.max(4, Math.ceil((phi1 - phi0) * RAD_R / 4))
  const p = (r, phi) => [r * Math.cos(phi), r * Math.sin(phi)]
  const wallRoofGeo = useMemo(() => quadGeo((q) => {
    for (let i = 0; i < seg; i++) {
      const a = phi0 + (phi1 - phi0) * (i / seg)
      const b = phi0 + (phi1 - phi0) * ((i + 1) / seg)
      for (const r of [rIn, rOut]) {                       // 벽 2(스커트 → RAD_TOP)
        const [ax, az] = p(r, a), [bx, bz] = p(r, b)
        q(ax, domeClipY(ax, az), az, bx, domeClipY(bx, bz), bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
      {                                                     // 지붕(평판 고리)
        const [ia, iza] = p(rIn, a), [ib, izb] = p(rIn, b)
        const [oa, oza] = p(rOut, a), [ob, ozb] = p(rOut, b)
        q(ia, RAD_TOP, iza, ib, RAD_TOP, izb, ob, RAD_TOP, ozb, oa, RAD_TOP, oza)
      }
    }
  }), [phi0, phi1])
  const floorGeo = useMemo(() => quadGeo((q) => {
    const yT = RAD_FLOOR_Y + COR_THICK / 2
    for (let i = 0; i < seg; i++) {
      const a = phi0 + (phi1 - phi0) * (i / seg)
      const b = phi0 + (phi1 - phi0) * ((i + 1) / seg)
      const [ia, iza] = p(rIn - 0.2, a), [ib, izb] = p(rIn - 0.2, b)
      const [oa, oza] = p(rOut + 0.2, a), [ob, ozb] = p(rOut + 0.2, b)
      q(ia, yT, iza, ib, yT, izb, ob, yT, ozb, oa, yT, oza)
    }
  }), [phi0, phi1])
  return (
    <group>
      <mesh geometry={wallRoofGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={floorGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function RadialRooms() {
  const petalGeo = useMemo(buildPetalShell, [])
  const angs = [0, 1, 2, 3].map(k => RAD_ANG0 + k * Math.PI / 2)
  // 고리: 온호 3(꽃잎 사이) + 동측 반호 2(박스 옆벽 z=±6에서 종단 — 접합문)
  const A = RAD_ARC_IN
  const arcs = [
    [angs[0] + A, angs[1] - A],          // NE→NW
    [angs[1] + A, angs[2] - A],          // NW→SW
    [angs[2] + A, angs[3] - A],          // SW→SE
    [RAD_JPHI, angs[0] - A],             // 박스 북벽 → NE
    [angs[3] + A, Math.PI * 2 - RAD_JPHI], // SE → 박스 남벽
  ]
  return (
    <group>
      {/* 꽃잎 4 — 같은 셸 기하의 회전 배치(등형). 로컬 +x = 방사 바깥 */}
      {angs.map((ang, k) => (
        <group key={k} position={[RAD_R * Math.cos(ang), 0, RAD_R * Math.sin(ang)]} rotation-y={-ang}>
          <mesh geometry={petalGeo}>
            <meshStandardMaterial color={MAT_SHELL} roughness={0.88} side={THREE.DoubleSide} />
          </mesh>
          {/* 내부 바닥 원판(셸에 살짝 관입 = 봉합) */}
          <mesh position={[0, COR_Y0, 0]} userData={{ walkable: true }}>
            <cylinderGeometry args={[RAD_PRX - 0.2, RAD_PRX - 0.2, COR_THICK, 48]} />
            <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* 대각 터널 4 */}
      {angs.map((ang, k) => <Tunnel key={k} ang={ang} />)}
      {/* 고리 5구간 */}
      {arcs.map(([a, b], i) => <ArcSection key={i} phi0={a} phi1={b} />)}
      {/* 접합 패드(박스 내부, 문 2 ↔ 다리): 다리판 밑 0.02 립 */}
      <mesh position={[RAD_JX, RAD_FLOOR_Y, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[7, COR_THICK, BOX_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
