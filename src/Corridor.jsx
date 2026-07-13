// Corridor.jsx — 탐험 통로(1p5의 방): 거대 원기둥(벽+빗면 천장+슬릿 창) + 압축 박스 연결부 + 길(다리·플랫폼·계단)
//   ★1p5 재설계(2026.07.13): 창 = '하나의 프레임'(슬릿+리빌 잼, 리브 #0만) · 박스 = ㄷ′ 압축(내부고 7, 진입 수직 해방)
//   Stairs = 범용 완만 계단(현재 통로 전용, 리브 입구 작업에서 재사용 후보라 export)
import { useMemo } from 'react'
import * as THREE from 'three'
import {
  COR_WALL_SEG, DOOR_HALF, COR_CX, COR_R, ceilY, domeClipY,
  SLIT_HALF, SLIT_SILL_Y, SLIT_TOP_Y, SLIT_JAMB_D, corWallR,
  RAD_JX, RAD_JDOOR_HW, RAD_DOOR_H,
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
      const ra = corWallR(t0), rb = corWallR(t1)                    // 슬릿 양옆 피어(스웰) — 이웃 리브 ±1을 벽 뒤로(constants 주석)
      const xa = COR_CX + ra * Math.cos(t0), za = ra * Math.sin(t0)
      const xb = COR_CX + rb * Math.cos(t1), zb = rb * Math.sin(t1)
      const ya = ceilY(xa), yb = ceilY(xb)
      if (Math.abs(tm - Math.PI) <= DOOR_HALF) {                    // 방쪽 문(박스 접속): BOX_TOP 아래만 트고
        quad(xa,BOX_TOP,za, xb,BOX_TOP,zb, xb,yb,zb, xa,ya,za)      //  위는 헤더 봉인(ㄷ′ 압축 후 스포 구멍 방지 — check_corridor B)
        continue
      }
      const dZero = Math.min(tm, Math.PI * 2 - tm)
      if (dZero <= SLIT_HALF) {                                     // +x 슬릿(1p5 '하나의 프레임'): SILL~TOP 비움
        quad(xa,0,za, xb,0,zb, xb,SLIT_SILL_Y,zb, xa,SLIT_SILL_Y,za)
        if (Math.min(ya, yb) > SLIT_TOP_Y + 0.05)                   //  천장이 위턱보다 낮으면 개구가 천장까지(잉여 슬리버 방지)
          quad(xa,SLIT_TOP_Y,za, xb,SLIT_TOP_Y,zb, xb,yb,zb, xa,ya,za)
      } else {
        quad(xa, domeClipY(xa,za), za, xb, domeClipY(xb,zb), zb, xb,yb,zb, xa,ya,za)
      }
    }
    // 슬릿 측벽(리빌 잼) — 개구 모서리(격자 스냅선)에서 +x 바깥으로 SLIT_JAMB_D. 화살창 원리:
    //  개구 폭은 그대로 두고 '스침각'만 잘라 계단 상부에서 이웃 리브 ±1이 새는 시선을 밀폐(check_corridor C).
    //  부수 효과: 벽이 두께를 얻어 슬릿이 '뚫린 종이'가 아니라 '파낸 개구'로 읽힘.
    {
      const segW = Math.PI * 2 / COR_WALL_SEG
      const tEdge = Math.floor(SLIT_HALF / segW + 0.5) * segW       // 개구 실모서리(격자 스냅 — 검증식과 동일)
      const zE = COR_R * Math.sin(tEdge), xE = COR_CX + COR_R * Math.cos(tEdge)
      for (const s of [1, -1]) {
        const z = s * zE
        quad(xE, SLIT_SILL_Y, z, xE + SLIT_JAMB_D, SLIT_SILL_Y, z,
             xE + SLIT_JAMB_D, SLIT_TOP_Y, z, xE, SLIT_TOP_Y, z)
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
      {/* === 길(path): 다리(★방사 개편: 시작 = 박스 서쪽 캡 54 — 랜딩 직행은 폐지, 진입은 고리 접합문) === */}
      <mesh position={[(BOX_X0 + (PLAT_X - PLAT_R)) / 2, COR_Y0, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[(PLAT_X - PLAT_R) - BOX_X0, COR_THICK, COR_FLOOR_HW * 2]} />
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
      <mesh geometry={boxCap}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
