// Corridor.jsx — 탐험 통로: 거대 원기둥(벽+빗면 천장+창±2) + 박스 연결부 CSG + 길(다리·플랫폼·계단)
//   Stairs = 범용 완만 계단(현재 통로 전용, 리브 입구 작업에서 재사용 후보라 export)
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  COR_WALL_SEG, DOOR_HALF, COR_CX, COR_R, ceilY, domeClipY,
  WIN_HALF, WIN_SILL_Y, WIN_TOP_Y,
  ROOM_LAND_R, ROOM_WELL_RT, ROOM_CEIL_Y, ROOM_CYL_TOP,
  BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  COR_Y0, COR_THICK, COR_FLOOR_HW, COR_X1, COR_STEPS,
  PLAT_X, PLAT_R, PLAT_Y, PILLAR_R, RIB_Y,
} from './constants'

// ════════ 탐험 통로(복도) — 바닥(#0 전용) + 양벽 + 천장 ════════
// 완만한 오름 계단: (x0,y0)→(x1,y1), 폭 ±hw, steps칸. 각 칸=속찬 블록이 서로 붙어 빈틈 없음.
// 칸 수(steps)가 많을수록 한 칸 높이(rise)가 작아져 '얇은' 계단이 된다.
export function Stairs({ x0, x1, y0, y1, hw, steps }) {
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

export function Corridor() {
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
  // === 박스(직육면체 통로) 벽·천장: 원뿔대(빛우물)와 겹친 부분을 CSG로 정확히 빼기 (three-bvh-csg) ===
  const { boxWallCut, boxCeilCut } = useMemo(() => {
    const ev = new Evaluator()
    ev.attributes = ['position', 'normal']
    const rBot = ROOM_LAND_R, rTop = ROOM_WELL_RT
    const yBot = ROOM_CEIL_Y - 3, yTop = ROOM_CYL_TOP
    // 자르개: 원뿔대 solid(닫힌 실린더)
    const coneSolid = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 96, 1, false)
    coneSolid.translate(0, (yBot + yTop) / 2, 0)
    const coneBrush = new Brush(coneSolid); coneBrush.updateMatrixWorld()
    // 박스 측벽 껍질(아래 모서리는 돔 표면까지) → 원뿔대로 자름
    const wp = [], wi = []
    const wq = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      const n = wp.length / 3
      wp.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
      wi.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const WSEG = 24
    for (const sgn of [1, -1]) {
      const z = sgn * BOX_HW
      for (let i = 0; i < WSEG; i++) {
        const xx0 = BOX_X0 + (BOX_X1 - BOX_X0) * (i / WSEG)
        const xx1 = BOX_X0 + (BOX_X1 - BOX_X0) * ((i + 1) / WSEG)
        wq(xx0, domeClipY(xx0, z), z, xx1, domeClipY(xx1, z), z, xx1, BOX_TOP, z, xx0, BOX_TOP, z)
      }
    }
    const wallG = new THREE.BufferGeometry()
    wallG.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3))
    wallG.setIndex(wi); wallG.computeVertexNormals()
    const wallBrush = new Brush(wallG); wallBrush.updateMatrixWorld()
    const boxWallCut = ev.evaluate(wallBrush, coneBrush, HOLLOW_SUBTRACTION).geometry
    // 박스 천장(평판) → 원뿔대로 자름
    const ceilG = new THREE.BoxGeometry(BOX_X1 - BOX_X0, COR_THICK, BOX_HW * 2)
    ceilG.translate((BOX_X0 + BOX_X1) / 2, BOX_TOP, 0)
    const ceilBrush = new Brush(ceilG); ceilBrush.updateMatrixWorld()
    const boxCeilCut = ev.evaluate(ceilBrush, coneBrush, HOLLOW_SUBTRACTION).geometry
    return { boxWallCut, boxCeilCut }
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
      <mesh geometry={boxWallCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={boxCeilCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
