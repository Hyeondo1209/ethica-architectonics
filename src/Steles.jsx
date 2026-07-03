// Steles.jsx — 글자 기계(makeSteleTexture, 거리 페이드) + 담체 2종:
//   비석 PropStele(받침 위 “세워짐” = 증명된 정리) · 선돌 GivenMonolith(직접 “솟음” = 주어진 정의·공리)
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NODE_BY_ID } from './ethica1'
import {
  PLAT_X, PLAT_Y, COR_THICK,
  MONO_W, MONO_H, MONO_THICK, MONO_TAPER, MONO_TEXT_MARGIN, MONO_TEXT_H, MONO_TEXT_CY,
} from './constants'

// ── 정리 비석(stele): 석재 슬랩(늘 보임) + 앞면 각인 텍스트(거리별 페이드) ──
//  · 본문은 ethica1.js에서 그대로 읽는다(텍스트=데이터, 여기선 '표시'만 담당).
//  · 비석 자체는 늘 보이고, 글자만 다가갈수록 선명해진다(디자인 C-2 거리별 가시성).
//  · 지금은 원형 플랫폼 중앙의 비석 하나(1p1). 나중에 플랫폼 사슬(1p1~1p4)로 확장.
const LABEL_FONT = '"Helvetica Neue", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

// 비석 치수(튜닝 노브) — 사람 스케일(×SCALE 아님)
const STELE_W         = 4.4     // 비석 가로(z폭)
const STELE_H         = 5.0     // 비석 세로(플랫폼 위 높이)
const STELE_THICK     = 0.5     // 두께(x)
const STELE_BASE_H    = 0.5     // 받침(plinth) 높이
const STELE_BASE_OVER = 0.45    // 받침이 슬랩보다 사방으로 튀어나온 양
const STELE_TEXT_MARGIN = 0.82  // 글자 패널이 슬랩 면에서 차지하는 비율(테두리 여백)

// 세로형 캔버스에 머리표+본문을 새겨 텍스처로. 슬랩 면 비율에 맞춤(왜곡 방지). 글자는 밝게(어두운 슬랩 위 각인).
export function makeSteleTexture(tag, text, aspectWH) {
  const ch = 1024
  const cw = Math.max(64, Math.round(ch * aspectWH))
  const canvas = document.createElement('canvas')
  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2   // 살짝 새김 느낌
  // 머리표(정리 번호)
  ctx.fillStyle = '#ece0c6'; ctx.font = `700 ${Math.round(cw * 0.11)}px ${LABEL_FONT}`
  ctx.fillText(tag, cw / 2, ch * 0.15)
  // 구분선(짧은 중앙선)
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(236,224,198,0.5)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(cw * 0.28, ch * 0.20); ctx.lineTo(cw * 0.72, ch * 0.20); ctx.stroke()
  // 본문(단어 줄바꿈 → 구분선 아래 영역에 세로 중앙정렬)
  ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2
  ctx.fillStyle = '#f4ecd9'
  const bodyPx = Math.round(cw * 0.10)
  ctx.font = `600 ${bodyPx}px ${LABEL_FONT}`
  const maxW = cw * 0.82, lineH = bodyPx * 1.42
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  const regionTop = ch * 0.26, regionBot = ch * 0.94
  const blockH = lines.length * lineH
  let y = regionTop + Math.max(0, (regionBot - regionTop - blockH) / 2) + bodyPx * 0.85
  for (const ln of lines) { ctx.fillText(ln, cw / 2, y); y += lineH }
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// 비석 하나 = 한 정리. x/z/near/far 튜닝 노브. 비석 앞면은 −x(접근 방향)을 향함.
export function PropStele({ id, x = PLAT_X, z = 0, faceY = PLAT_Y + COR_THICK / 2, near = 8, far = 55 }) {
  const node = NODE_BY_ID[id] || { text: id }
  const matRef   = useRef()
  const panelRef = useRef()
  const aspectWH = STELE_W / STELE_H
  const tex = useMemo(() => makeSteleTexture(id, node.text, aspectWH), [id, node.text, aspectWH])
  const slabCY = faceY + STELE_BASE_H + STELE_H / 2       // 슬랩 중앙 높이(받침 위)
  const baseCY = faceY + STELE_BASE_H / 2                 // 받침 중앙 높이
  const textW  = STELE_W * STELE_TEXT_MARGIN
  const textH  = STELE_H * STELE_TEXT_MARGIN
  const panelX = x - STELE_THICK / 2 - 0.03               // 슬랩 앞면(−x) 바로 앞(z-파이팅 방지)
  useFrame(({ camera }) => {
    const p = panelRef.current; if (!p) return
    const d = camera.position.distanceTo(p.position)
    let o = (far - d) / (far - near)
    o = Math.max(0, Math.min(1, o)); o = o * o * (3 - 2 * o)     // smoothstep
    if (matRef.current) matRef.current.opacity = o
    p.visible = o > 0.001
  })
  return (
    <group>
      {/* 받침(plinth) — 늘 보임 */}
      <mesh position={[x, baseCY, z]}>
        <boxGeometry args={[STELE_THICK + STELE_BASE_OVER * 2, STELE_BASE_H, STELE_W + STELE_BASE_OVER * 2]} />
        <meshStandardMaterial color="#5b5344" roughness={0.96} />
      </mesh>
      {/* 비석 슬랩 — 늘 보임 */}
      <mesh position={[x, slabCY, z]}>
        <boxGeometry args={[STELE_THICK, STELE_H, STELE_W]} />
        <meshStandardMaterial color="#6a6152" roughness={0.9} />
      </mesh>
      {/* 앞면 각인 텍스트(−x 향함) — 비석은 늘 보이고, 이 글자만 거리별로 선명해짐 */}
      <mesh ref={panelRef} position={[panelX, slabCY, z]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[textW, textH]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent depthWrite={false}
          side={THREE.DoubleSide} alphaTest={0.02} />
      </mesh>
    </group>
  )
}

// ═══════ 주어진 것(선돌) — 정의 D1~D8 · 공리 A1~A7 ═══════
//  비석(PropStele)과의 어휘 분리: 받침 없음 + 테이퍼 + 어두운 재질 = '세워진 것'이 아니라 '서 있는 것'.
//  글자는 비석과 같은 기계(makeSteleTexture + smoothstep 거리 페이드) — 구분은 담체 형태가 맡는다.

// 선돌 공유 기하: 4각 원기둥(=사각 프리즘)을 위로 좁힘. thetaStart=-3π/4 → 평면 법선이 ±x·±z 정렬(정면 = 로컬 -x).
// 단위 단면의 면간 폭 = √2 → 메시 scale [두께/√2, 높이, 폭/√2]로 환산.
const MONO_GEO = new THREE.CylinderGeometry(MONO_TAPER, 1, 1, 4, 1, false, -Math.PI * 0.75)
const MONO_TMP = new THREE.Vector3()   // useFrame 월드좌표 스크래치(전 인스턴스 공유 — 콜백은 순차 실행이라 안전)

// 선돌 하나 = 정의/공리 하나. 그룹이 회전하므로 정면(로컬 -x)은 yRot=-a로 중심(-radial)을 향하게 한다.
export function GivenMonolith({ id, x, z, baseY = 0, yRot = 0, s = 1, near = 5, far = 16 }) {
  const node = NODE_BY_ID[id] || { text: id }
  const matRef = useRef()
  const panelRef = useRef()
  const W = MONO_W * s, H = MONO_H * s, TH = MONO_THICK * s
  const textW = W * MONO_TEXT_MARGIN, textH = H * MONO_TEXT_H
  const aspectWH = textW / textH
  const tex = useMemo(() => makeSteleTexture(id, node.text, aspectWH), [id, node.text, aspectWH])
  useFrame(({ camera }) => {
    const p = panelRef.current; if (!p) return
    p.getWorldPosition(MONO_TMP)                    // ⚠ 로컬 position이 아니라 월드 — 그룹이 이동·회전돼 있음(비석과 다른 점)
    const d = camera.position.distanceTo(MONO_TMP)
    let o = (far - d) / (far - near)
    o = Math.max(0, Math.min(1, o)); o = o * o * (3 - 2 * o)   // smoothstep(비석과 동일)
    if (matRef.current) matRef.current.opacity = o
    p.visible = o > 0.001
  })
  return (
    <group position={[x, baseY, z]} rotation-y={yRot}>
      {/* 몸돌 — 받침 없이 지반/플랫폼에서 직접 솟음(주어짐) */}
      <mesh geometry={MONO_GEO} position={[0, H / 2, 0]} scale={[TH / Math.SQRT2, H, W / Math.SQRT2]}>
        <meshStandardMaterial color="#57503f" roughness={0.97} />
      </mesh>
      {/* 정면 각인(밑동 면보다 0.05 앞) — 테이퍼로 위쪽 면이 물러나므로 패널은 수직 고정, 폭은 실루엣 안 */}
      <mesh ref={panelRef} position={[-TH / 2 - 0.05, H * MONO_TEXT_CY, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[textW, textH]} />
        <meshBasicMaterial ref={matRef} map={tex} transparent depthWrite={false}
          side={THREE.DoubleSide} alphaTest={0.02} />
      </mesh>
    </group>
  )
}
