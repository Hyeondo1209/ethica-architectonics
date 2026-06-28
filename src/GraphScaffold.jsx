// ============================================================
//  데이터 그래프 뷰 (src/GraphScaffold.jsx)
//  src/ethica1.js 를 읽어, 정리 1~8 의존 그래프를 '임시 와이어프레임'으로 띄운다.
//
//  ⚠ 이건 '건축'이 아니라 '데이터 점검용 다이어그램'이다.
//     배치는 anchor가 아니라 '그래프 깊이'로 자동 계산 → 어떤 미적 결정과도 무관.
//     점 = 노드, 선 = 의존(인용). 위로 갈수록 가닥이 모이는 '땋임'이 보이면 정상.
//     조작: 마우스 드래그 = 회전, 휠 = 줌.
// ============================================================
import { useRef, useMemo, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NODES, EDGES, NODE_BY_ID, KIND, TIER } from './ethica1'

// 레이아웃 상수 (다이어그램용 — 건축 치수 아님) -----------------
const LAYER_H = 6      // 깊이 한 칸의 세로 간격
const X_GAP   = 6      // 같은 층 노드 가로 간격
const NODE_R  = 1.1    // 노드 와이어프레임 반지름

// 노드 깊이 = (의존하는 노드들의 깊이 최댓값) + 1, 토대(deps 없음) = 0 ----
//   1~4는 정의·공리만 인용 → 같은 층(평행 토대). 5~8은 위로 쌓이며 수렴(땋임).
function computeDepths() {
  const depth = {}
  const visiting = new Set()
  function d(id) {
    if (depth[id] != null) return depth[id]
    const node = NODE_BY_ID[id]
    if (!node || node.deps.length === 0) { depth[id] = 0; return 0 }
    if (visiting.has(id)) return 0          // 혹시 모를 순환 방어
    visiting.add(id)
    const v = 1 + Math.max(...node.deps.map(d))
    visiting.delete(id)
    depth[id] = v
    return v
  }
  NODES.forEach(n => d(n.id))
  return depth
}

// 종류·위계별 색 ----------------------------------------------
function colorOf(node) {
  if (node.kind === KIND.DEF) return '#6f9bd6'   // 정의 = 파랑
  if (node.kind === KIND.AX)  return '#7bb88f'   // 공리 = 초록
  return node.tier === TIER.FOUNDATION ? '#e0b46e' : '#c98f47'  // 정리: 토대 / 땋임
}

// id 라벨 → 캔버스 텍스처(스프라이트, 항상 카메라를 향함) ----------
function makeLabel(text) {
  const cw = 256, ch = 128
  const c = document.createElement('canvas'); c.width = cw; c.height = ch
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f3e8cf'
  ctx.font = '600 64px "Helvetica Neue", Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text, cw / 2, ch / 2)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  return tex
}

// 그래프 중심을 도는 가벼운 궤도 카메라 (드래그 회전 / 휠 줌) --------
function OrbitLite({ target }) {
  const { camera, gl } = useThree()
  const st = useRef({ az: 0.6, pol: 1.15, dist: 52, dragging: false, lx: 0, ly: 0 })
  useEffect(() => {
    const el = gl.domElement
    const down = (e) => { const s = st.current; s.dragging = true; s.lx = e.clientX; s.ly = e.clientY }
    const up   = () => { st.current.dragging = false }
    const move = (e) => {
      const s = st.current; if (!s.dragging) return
      s.az -= (e.clientX - s.lx) * 0.005
      s.pol = Math.max(0.2, Math.min(Math.PI - 0.2, s.pol - (e.clientY - s.ly) * 0.005))
      s.lx = e.clientX; s.ly = e.clientY
    }
    const wheel = (e) => { const s = st.current; s.dist = Math.max(14, Math.min(120, s.dist + e.deltaY * 0.05)) }
    el.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    window.addEventListener('mousemove', move)
    el.addEventListener('wheel', wheel, { passive: true })
    return () => {
      el.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('mousemove', move)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])
  useFrame(() => {
    const s = st.current, sinp = Math.sin(s.pol)
    camera.position.set(
      target.x + s.dist * sinp * Math.sin(s.az),
      target.y + s.dist * Math.cos(s.pol),
      target.z + s.dist * sinp * Math.cos(s.az),
    )
    camera.lookAt(target)
  })
  return null
}

export default function GraphScaffold() {
  // 노드 좌표를 '깊이'로 자동 계산 (anchor 안 씀) ---------------
  const { positions, center } = useMemo(() => {
    const depth = computeDepths()
    const layers = {}
    NODES.forEach(n => {
      const dep = depth[n.id]
      if (!layers[dep]) layers[dep] = []
      layers[dep].push(n)
    })
    const positions = {}
    let maxY = 0
    Object.keys(layers).forEach(dStr => {
      const dep = Number(dStr), arr = layers[dStr], y = dep * LAYER_H
      maxY = Math.max(maxY, y)
      arr.forEach((node, i) => {
        const x = (i - (arr.length - 1) / 2) * X_GAP
        positions[node.id] = new THREE.Vector3(x, y, 0)
      })
    })
    return { positions, center: new THREE.Vector3(0, maxY / 2, 0) }
  }, [])

  // 모든 의존 간선을 하나의 LineSegments로 -----------------------
  const lineGeo = useMemo(() => {
    const pts = []
    EDGES.forEach(([from, to]) => {
      const a = positions[from], b = positions[to]
      if (a && b) { pts.push(a, b) }
    })
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [positions])

  // id 라벨 텍스처 캐시 ----------------------------------------
  const labels = useMemo(() => {
    const m = {}
    NODES.forEach(n => { m[n.id] = makeLabel(n.id) })
    return m
  }, [])

  return (
    <>
      <OrbitLite target={center} />

      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#8a7c5e" transparent opacity={0.55} />
      </lineSegments>

      {NODES.map(n => (
        <group key={n.id} position={positions[n.id].toArray()}>
          <mesh>
            <icosahedronGeometry args={[NODE_R, 1]} />
            <meshBasicMaterial color={colorOf(n)} wireframe />
          </mesh>
          <sprite position={[0, NODE_R + 1.1, 0]} scale={[4, 2, 1]}>
            <spriteMaterial map={labels[n.id]} transparent />
          </sprite>
        </group>
      ))}
    </>
  )
}
