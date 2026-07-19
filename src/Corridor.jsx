// Corridor.jsx — 탐험 통로(1p5의 집): 거대 원기둥 홀(벽+빗면 천장+창 ±43°) + 압축 박스 연결부
//   + 길(다리·플랫폼) + ★계단 다섯(㊳ 곡선 — #0만 리브 문에 닿음) + ★신전 대들보(TEMPLE_MODE).
//   ★1p5 재재설계 ㊳(2026.07.14): 슬릿·피어·리빌 잼 폐기 → 구 파노라마 창 ±43° 복원(다섯을 세워 무너뜨림).
//   유지: 박스 ㄷ′ 압축(BOX_IN_H=7) · 헤더 봉인 · 단면 동결 · PLAT_F 노브.
//   계단 기하의 정본 = corridorStairsGeometry.js(순수 빌더 — 판·참·간극 전부 저기서 파생).
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import {
  COR_WALL_SEG, DOOR_HALF, COR_CX, COR_R, ceilY, domeClipY,
  WIN_HALF, WIN_SILL_Y, WIN_TOP_Y,
  RAD_JX, RAD_JDOOR_HW, RAD_DOOR_H,
  BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  COR_Y0, COR_THICK, COR_FLOOR_HW,
  PLAT_X, PLAT_R, PLAT_Y, PILLAR_R,
  STAIR_TD, STAIR_W, COR_RISE,
  TEMPLE_MODE, TEMPLE_Y0, TEMPLE_X0, TEMPLE_X1, TEMPLE_HZ, TEMPLE_CLR,
  PLAT_DROP, DESC_X0, DESC_X1,
  SHELL_RIB_R,
} from './constants'
import { buildHallStairs, hallDoors } from './corridorStairsGeometry'

// ════════ ★진입 시퀀스(㊴): 수평 다리 → 하강 계단 → 낮은 플랫폼 ════════
//  ★㊴-5: 짧은 다리(입구 직후 끝) → **긴 하강 계단** → 깊은 결절 착지(DESC_X0/X1 정본은 constants).
export function Bridge() {
  return (
    <mesh position={[(BOX_X0 + DESC_X0) / 2, COR_Y0, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[DESC_X0 - BOX_X0, COR_THICK, COR_FLOOR_HW * 2]} />
      <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}
export function DescentStairs() {
  const steps = useMemo(() => {
    const N = Math.max(2, Math.ceil(PLAT_DROP / COR_RISE))          // 단수(㊴-5 기본 42 — 단높이 ≈0.43)
    const dw = (DESC_X1 - DESC_X0) / N, rise = PLAT_DROP / N
    const arr = []
    for (let i = 0; i < N; i++) {
      // i번째 단: 상면 = 다리(49.3)에서 i+1단 내려감. 판 두께 COR_THICK(어휘 공유)
      arr.push({ x: DESC_X0 + (i + 0.5) * dw, yTop: COR_Y0 + COR_THICK / 2 - (i + 1) * rise, w: dw })
    }
    return arr
  }, [])
  return (
    <group>
      {steps.map((st, i) => (
        <mesh key={i} position={[st.x, st.yTop - COR_THICK / 2, 0]} userData={{ walkable: true }}>
          <boxGeometry args={[st.w + 0.06, COR_THICK, COR_FLOOR_HW * 2]} />
          <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ════════ ★계단 다섯(㊴-7) — 절곡(flight) / 극좌표(polar) 문법. 판 = 얇은 부양 판 · 참 = 넓은 판 ════════
export function CorridorStairs() {
  const { stairs } = useMemo(() => buildHallStairs(), [])
  return (
    <group>
      {stairs.map((st) => (
        <group key={st.k}>
          {st.plates.map((p, i) => (
            <mesh key={i} position={[p.x, p.yTop - COR_RISE / 2, p.z]} rotation-y={p.rotY}
              userData={{ walkable: true }}>
              <boxGeometry args={[STAIR_TD, COR_RISE, STAIR_W]} />
              <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {st.landings.map((ld, i) => (
            <mesh key={'ld' + i} position={[ld.x, ld.yTop - COR_RISE / 2, ld.z]} rotation-y={ld.rotY}
              userData={{ walkable: true }}>
              <boxGeometry args={[2.4, COR_RISE, STAIR_W + 0.8]} />
              <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ════════ ★신전 프리즈(㊳ 대들보 → ㊴ 확장) — 창 상부(y=TEMPLE_Y0~빗면 천장)를 통째로 채우는 수평 부재 ════════
//  ㊴ 현도 소견 3: 부재 위로 리브가 드러나면 신전 느낌이 죽는다 → 부재를 천장까지 채워 '가림'(리브 무절단 = LOCKED 무결).
//  상면 = 빗면 천장 정합(ceilY(x) − 0.02 — 천장 위 돌출 없음 = 회랑·테라스 조감 무오염). 리브 다섯 관통 구멍 유지(부재 안 = 불가시).
export function TempleBeam() {
  const geo = useMemo(() => {
    if (TEMPLE_MODE === 'off') return null
    // 상면이 x방향 경사인 육면체 — BoxGeometry를 만들어 상면 4정점만 빗면으로 이동
    const beam = new THREE.BoxGeometry(TEMPLE_X1 - TEMPLE_X0, 1, TEMPLE_HZ * 2)
    beam.translate((TEMPLE_X0 + TEMPLE_X1) / 2, TEMPLE_Y0 + 0.5, 0)
    const pos = beam.attributes.position
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > TEMPLE_Y0 + 0.5) pos.setY(i, ceilY(pos.getX(i)) - 0.02)   // 상면 → 빗면 천장 밑
    }
    beam.computeVertexNormals()
    // 리브 다섯 관통 구멍(CSG SUBTRACTION — 리브가 물리적으로 지나간다. 부재 안이라 보이지 않을 뿐)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    let acc = new Brush(beam); acc.updateMatrixWorld()
    const holeTop = ceilY(TEMPLE_X1) + 2
    for (const d of hallDoors()) {
      const hole = new THREE.CylinderGeometry(SHELL_RIB_R + TEMPLE_CLR, SHELL_RIB_R + TEMPLE_CLR, holeTop - TEMPLE_Y0 + 4, 24)
      hole.translate(d.cx, (TEMPLE_Y0 + holeTop) / 2, d.cz)
      const b = new Brush(hole); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    return acc.geometry
  }, [])
  if (!geo) return null
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#b89a6a" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Corridor() {
  const wallMat = '#b89a6a'

  // 거대 원기둥 벽: 바닥(돔 표면/0)→빗면 천장. +x에 ★창 ±43°(㊳ 복원), −x(θ=π)에 박스 연결부 문(트임).
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
      const xa = COR_CX + COR_R * Math.cos(t0), za = COR_R * Math.sin(t0)
      const xb = COR_CX + COR_R * Math.cos(t1), zb = COR_R * Math.sin(t1)
      const ya = ceilY(xa), yb = ceilY(xb)
      if (Math.abs(tm - Math.PI) <= DOOR_HALF) {                    // 방쪽 문(박스 접속): BOX_TOP 아래만 트고
        quad(xa,BOX_TOP,za, xb,BOX_TOP,zb, xb,yb,zb, xa,ya,za)      //  위는 헤더 봉인(ㄷ′ 압축 후 스포 구멍 방지 — check_corridor B)
        continue
      }
      const dZero = Math.min(tm, Math.PI * 2 - tm)
      if (dZero <= WIN_HALF) {                                      // ★+x 창(㊳): SILL~TOP 비움 — 다섯 리브 프레임
        if (WIN_SILL_Y > 0)
          quad(xa,0,za, xb,0,zb, xb,WIN_SILL_Y,zb, xa,WIN_SILL_Y,za)
        if (Math.min(ya, yb) > WIN_TOP_Y + 0.05)                    //  천장이 위턱보다 낮으면 개구가 천장까지(잉여 슬리버 방지)
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

  // === 박스(직육면체 통로) — ★방사 개편(2026.07.09): 서쪽 단축(BOX_X0=54, 원뿔대에 안 닿음 → CSG 불요)
  //  + 옆벽 접합문 2(고리가 z=±6에서 진입, x=RAD_JX±RAD_JDOOR_HW · 문 위 헤더/아래 스커트 유지) + 서쪽 캡(막힘). ===
  const { boxWallCut, boxCeilCut, boxCap } = useMemo(() => {
    const wp = [], wi = []
    const wq = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      const n = wp.length / 3
      wp.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
      wi.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const D0 = RAD_JX - RAD_JDOOR_HW, D1 = RAD_JX + RAD_JDOOR_HW
    const DSILL = COR_Y0, DTOP = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H
    // 벽 런(xa→xb, 바닥 스커트=돔 표면): full=전체 높이 / 아니면 문 구간(스커트+헤더만)
    const run = (z, xa, xb, full) => {
      const n = Math.max(2, Math.ceil((xb - xa) / 5))
      for (let i = 0; i < n; i++) {
        const x0 = xa + (xb - xa) * (i / n), x1 = xa + (xb - xa) * ((i + 1) / n)
        if (full) {
          wq(x0, domeClipY(x0, z), z, x1, domeClipY(x1, z), z, x1, BOX_TOP, z, x0, BOX_TOP, z)
        } else {
          wq(x0, domeClipY(x0, z), z, x1, domeClipY(x1, z), z, x1, DSILL, z, x0, DSILL, z)
          wq(x0, DTOP, z, x1, DTOP, z, x1, BOX_TOP, z, x0, BOX_TOP, z)
        }
      }
    }
    for (const sgn of [1, -1]) {
      const z = sgn * BOX_HW
      run(z, BOX_X0, D0, true)
      run(z, D0, D1, false)          // 접합문(고리 진입)
      run(z, D1, BOX_X1, true)
    }
    const wallG = new THREE.BufferGeometry()
    wallG.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3))
    wallG.setIndex(wi); wallG.computeVertexNormals()
    // 천장(평판) — CSG 불요(원뿔대 밖)
    const ceilG = new THREE.BoxGeometry(BOX_X1 - BOX_X0, COR_THICK, BOX_HW * 2)
    ceilG.translate((BOX_X0 + BOX_X1) / 2, BOX_TOP, 0)
    // 서쪽 캡(막힌 끝벽): 바닥선은 돔이 위로 덮으므로 평평하게 낮춰 잡아도 봉합됨
    const capLo = Math.min(domeClipY(BOX_X0, -BOX_HW), domeClipY(BOX_X0, BOX_HW)) - 0.5
    const cp = [BOX_X0, capLo, -BOX_HW, BOX_X0, capLo, BOX_HW, BOX_X0, BOX_TOP, BOX_HW, BOX_X0, BOX_TOP, -BOX_HW]
    const capG = new THREE.BufferGeometry()
    capG.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3))
    capG.setIndex([0, 1, 2, 0, 2, 3]); capG.computeVertexNormals()
    return { boxWallCut: wallG, boxCeilCut: ceilG, boxCap: capG }
  }, [])


  return (
    <group>
      {/* === 길(path): ★㊴ 시퀀스 = 수평 다리 → 하강 계단 → 낮은 플랫폼(결절) — "플랫폼을 내려다보는" 진입 === */}
      <Bridge />
      <DescentStairs />
      <mesh position={[PLAT_X, PLAT_Y, 0]} userData={{ walkable: true }}>
        <cylinderGeometry args={[PLAT_R, PLAT_R, COR_THICK, 48]} />
        <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[PLAT_X, (PLAT_Y - COR_THICK / 2) / 2, 0]}>
        <cylinderGeometry args={[PILLAR_R, PILLAR_R, PLAT_Y - COR_THICK / 2, 24]} />
        <meshStandardMaterial color="#a98f5e" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* ★㊳: 구 직선 계단(Stairs 단일) 폐기 → 다섯 갈래 곡선 계단(플랫폼 = 결절 = '사물') */}
      <CorridorStairs />
      <TempleBeam />

      {/* === 외피: 거대 원기둥(벽 + 닫힌 빗면 천장) — 공간감 통로 === */}
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ceilGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* === 박스 연결부(방 ↔ 원기둥): 측벽(돔 표면까지 클립) + 천장, 양끝 트임 === */}
      <mesh geometry={boxWallCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={boxCeilCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={boxCap}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
