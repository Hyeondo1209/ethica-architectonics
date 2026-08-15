// ⏱ 일회용 진단 프로브(2026.08.13) — 외부 전경 매싱 판독.
//  `render_views`는 room·p2·p3(Room/Radial 권역)를 안 그린다(COV_KNOWN) → 그 사각지대를 임시로 메운다.
//  ⚠판정용 아님: 조명·재질 무시, 순수 실루엣/매싱. 기하는 전부 **정본 빌더 호출**(사본 없음).
//  사용: node src/_probe_exterior.mjs free:x,y,z,yaw,pitch [free:...] ...
import fs from 'fs'
import { PNG } from 'pngjs'
import * as THREE from 'three'
import * as C from './constants.js'
import { buildPetalShell, buildCylSkirt, buildCylCollar } from './Radial.jsx'
import { buildExtSpiral, buildExtSpiralParapet, buildExtSpiralShell, buildExtSpiralSkirt, buildExtSpiralBridge, buildExtWindowFrame } from './extSpiralGeometry.js'
import { parseFree } from './poseFormat.js'
import { buildArm13 } from './armGeometry.js'
import { buildSpire } from './spireGeometry.js'   // ★127 첨탑 정본
import { buildLinkParts, linkSpec } from './linkPassageGeometry.js'   // ★130 접속 통로
import { buildBridgeComplex } from './bridgeComplexGeometry.js'   // ★133 1p4 복합체
import { buildLink4, link4Spec } from './link4Geometry.js'
import { buildLink3, link3Spec } from './link3Geometry.js'         // ★137 1p3 통로(정본 빌더 직결)        // ★136 1p4 접속 관(정본 빌더 직결)
import { ARM13_ON, ARM13_K } from './constants.js'

const W = 880, H = 495, BG = [18, 18, 20]
const ONLY13 = process.env.ONLY13 === '1'   // 1p3 권역만(방 + 그 꽃잎) — 첨탑·타 꽃잎이 시야를 막을 때
const tris = []
function addGeo(geo, color, mat) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const p = g.attributes.position.array
  const v = new THREE.Vector3()
  for (let i = 0; i < p.length; i += 9) {
    const t = []
    for (let j = 0; j < 9; j += 3) {
      v.set(p[i + j], p[i + j + 1], p[i + j + 2])
      if (mat) v.applyMatrix4(mat)
      t.push([v.x, v.y, v.z])
    }
    tris.push({ v: t, c: color })
  }
}

// ── 색: 요소 구분(매싱 판독용) ──
const COL = {
  room:  [196, 188, 170],   // 방 타원구(근사 — Room.jsx 내부 셸을 상수로 재현)
  well:  [222, 205, 150],   // 빛우물 첨탑
  shell: [150, 205, 225],   // 꽃잎 셸(정본)
  cyl:   [120, 160, 190],   // ★91 받침 원기둥 + 말단(정본)
  spiral:[240, 150, 110],   // ★122 외부 나선 계단(정본)
  encl:  [230, 120,  90],
  term:  [235, 235, 100],   // ★말단 4종(유일한 비대칭)
}

// ① 방 타원구 — ⚠근사(Room.jsx는 컴포넌트 내부라 import 불가). 매싱 판독용.
{
  const g = new THREE.SphereGeometry(1, 64, 40)
  g.scale(C.ROOM_R, C.ROOM_HEIGHT, C.ROOM_R)
  g.translate(0, C.ROOM_FLOOR_Y, 0)
  addGeo(g, COL.room)
  if (!ONLY13) {
    //  ★127: 구판은 원뿔대를 여기서 복제했다(사본) — 이제 정본 빌더 직결(첨탑 4단 + CSG 그대로)
    addGeo(buildSpire(), COL.well)
    COL.link = [225, 120, 70]; COL.tower = [150, 100, 200]
    for (const part of buildLinkParts(linkSpec())) {
      const m = new THREE.Matrix4().makeRotationY(-(part.k * Math.PI / 2))
      for (const g of part.walk) addGeo(g, COL.link, m)
      for (const g of part.solid) addGeo(g, COL.tower, m)
    }
    //  ★133 복합체(방위 0° — 회전 없음, 정본 빌더 직결)
    COL.brgW = [120, 220, 140]; COL.brgS = [90, 170, 200]
    const BP = buildBridgeComplex()
    if (BP) {
      for (const { geo } of BP.walk) addGeo(geo, COL.brgW)
      for (const { geo } of BP.solid) addGeo(geo, COL.brgS)
    }
    //  ★136 접속 관(방위 0°대 — 회전 없음). PROBE_LK4_MODE로 두 안을 갈아 끼운다.
    COL.lk4 = [230, 140, 80]
    const L4 = buildLink4(link4Spec({ on: true, mode: process.env.PROBE_LK4_MODE || undefined }))
    COL.lk4a = [150, 90, 190]                        // ★136-c 아치는 관과 다른 색으로(육안 분리)
    if (L4) {
      for (const { geo } of L4.walk) addGeo(geo, COL.lk4)
      for (const { geo } of L4.solid) addGeo(geo, COL.lk4a)   // ⛔누락 적발: solid(아치)를 안 그리고 있었다
    }
    //  ★137 1p3 통로 — 관/참 = 주황 · 기둥·아치 = 보라
    const L3 = buildLink3(link3Spec({ on: true }))
    if (L3) {
      for (const { geo } of L3.walk) addGeo(geo, COL.lk4)
      for (const { geo } of L3.solid) addGeo(geo, COL.lk4a)
    }
  }
}

// ② 꽃잎 4 — RadialRooms와 같은 마운트(로컬 → 방위 배치)
//  ★MOCK13=1 — 1p3(k=2·225°) 목업: ★91 원기둥·말단·칼라 제거, 팔(열린 C) + 가는 각기둥.
//  ⚠리드백용 가짜 기하 — 구현 아님. 경로는 방 표면·셸 하면 실측 위 회랑에 놓음.
COL.arm = [200, 130, 210]
COL.col = [235, 235, 100]
function catmull(P, n) {
  const out = []
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t
      out.push([0, 1].map(a =>
        0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)))
    }
  }
  out.push([...P[P.length - 1]])
  return out
}
//  ★126 실기하: 목업 폐기 — armGeometry 정본 빌더를 그대로 부른다(MOCK13 환경변수도 폐기)
const petal = buildPetalShell()
const collar = buildCylCollar()
const sp = { mass: buildExtSpiral(), encl: C.RSP_ENCL === 'tube' ? buildExtSpiralShell() : buildExtSpiralParapet(),
             wfr: buildExtWindowFrame(), skirt: buildExtSpiralSkirt(), bridge: buildExtSpiralBridge() }
const sp13 = { mass: buildExtSpiral({ noCyl: true }), encl: C.RSP_ENCL === 'tube' ? buildExtSpiralShell({ noCyl: true }) : buildExtSpiralParapet({ noCyl: true }),
             wfr: buildExtWindowFrame({ noCyl: true }), skirt: buildExtSpiralSkirt({ noCyl: true }), bridge: buildExtSpiralBridge({ noCyl: true }) }
for (let k = 0; k < 4; k++) {
  if (ONLY13 && k !== ARM13_K) continue
  const ang = C.RAD_ANG0 + k * Math.PI / 2
  const m = new THREE.Matrix4()
    .makeTranslation(C.RAD_R * Math.cos(ang), 0, C.RAD_R * Math.sin(ang))
    .multiply(new THREE.Matrix4().makeRotationY(-ang))
  addGeo(petal, COL.shell, m)
  if (ARM13_ON && k === ARM13_K) addGeo(buildArm13(), COL.arm, m)
  if (C.RAD_CYL_ON && !(ARM13_ON && k === ARM13_K)) {
    //  말단(= 4방의 **유일한** 차별 요소)만 별색으로 분리 — 삼각형 무게중심 y가 말단 꼭대기 아래면 말단
    const g = buildCylSkirt(k).toNonIndexed(), p = g.attributes.position.array
    const top = C.RAD_CYL_TERM_TOP_BY[k]
    const v = new THREE.Vector3()
    for (let i = 0; i < p.length; i += 9) {
      const t = []
      for (let j = 0; j < 9; j += 3) { v.set(p[i + j], p[i + j + 1], p[i + j + 2]).applyMatrix4(m); t.push([v.x, v.y, v.z]) }
      const cy = (t[0][1] + t[1][1] + t[2][1]) / 3
      tris.push({ v: t, c: cy < top ? COL.term : COL.cyl })
    }
  }
  if (C.RAD_CYL_ON && C.RAD_CYL_COLLAR_ON && !(ARM13_ON && k === ARM13_K)) addGeo(collar, COL.cyl, m)
  if (C.RSP_ON) {
    const G = (ARM13_ON && k === ARM13_K) ? sp13 : sp
    addGeo(G.mass, COL.spiral, m); addGeo(G.bridge, COL.spiral, m)
    addGeo(G.encl, COL.encl, m); addGeo(G.wfr, COL.encl, m); addGeo(G.skirt, COL.encl, m)
  }
}
console.log(`삼각형 ${tris.length}`)

// ── z-버퍼 래스터라이저(render_views와 같은 방식·독립 구현) ──
function render(eye, yaw, pitch, out) {
  const px = new Uint8Array(W * H * 3), zb = new Float32Array(W * H).fill(Infinity)
  for (let i = 0; i < W * H; i++) { px[i * 3] = BG[0]; px[i * 3 + 1] = BG[1]; px[i * 3 + 2] = BG[2] }
  const cam = new THREE.PerspectiveCamera(70, W / H, 0.5, 4000)
  cam.position.set(...eye); cam.rotation.order = 'YXZ'
  cam.rotation.set(pitch, yaw, 0); cam.updateMatrixWorld()
  const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
  const L = new THREE.Vector3(0.4, 0.8, 0.45).normalize()
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3()
  for (const t of tris) {
    a.fromArray(t.v[0]); b.fromArray(t.v[1]); c.fromArray(t.v[2])
    ab.subVectors(b, a); ac.subVectors(c, a); n.crossVectors(ab, ac).normalize()
    const sh = 0.42 + 0.58 * Math.abs(n.dot(L))
    //  ⛔★128 적발·수리(2026.08.14): 구판은 **Vector3**로 투영했다 — three의 Vector3.applyMatrix4는 w로 나눈 뒤
    //   w를 **버리므로** `p.w`가 undefined가 되고 아래 컬링이 **항상 false**였다. 기하가 전부 카메라 앞인
    //   외부 시점에선 무해했으나, 안에서 보는 시점에선 카메라 뒤 삼각형이 부호 반전으로 뒤집혀 찍혀
    //   화면을 덮는다(★128 실측: 테라스가 통째로 가려져 3체제 렌더가 바이트 동일했다).
    //   ⚠`render_views`(정본 자가 렌더)는 근평면 클리핑이 정상 — 이 결함은 이 프로브 계열에만 있었다.
    const P = [a, b, c].map(v => {
      const q = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(vp)
      return { x: (q.x / q.w * 0.5 + 0.5) * W, y: (0.5 - q.y / q.w * 0.5) * H, z: q.z / q.w, w: q.w }
    })
    if (P.some(p => p.w <= 1e-6)) continue
    const x0 = Math.max(0, Math.floor(Math.min(...P.map(p => p.x)))), x1 = Math.min(W - 1, Math.ceil(Math.max(...P.map(p => p.x))))
    const y0 = Math.max(0, Math.floor(Math.min(...P.map(p => p.y)))), y1 = Math.min(H - 1, Math.ceil(Math.max(...P.map(p => p.y))))
    const d = (P[1].x - P[0].x) * (P[2].y - P[0].y) - (P[2].x - P[0].x) * (P[1].y - P[0].y)
    if (Math.abs(d) < 1e-9) continue
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const l0 = ((P[1].x - x) * (P[2].y - y) - (P[2].x - x) * (P[1].y - y)) / d
      const l1 = ((P[2].x - x) * (P[0].y - y) - (P[0].x - x) * (P[2].y - y)) / d
      const l2 = 1 - l0 - l1
      if (l0 < 0 || l1 < 0 || l2 < 0) continue
      const z = l0 * P[0].z + l1 * P[1].z + l2 * P[2].z
      const i = y * W + x
      if (z >= zb[i]) continue
      zb[i] = z
      for (let ch = 0; ch < 3; ch++) px[i * 3 + ch] = Math.min(255, t.c[ch] * sh)
    }
  }
  const png = new PNG({ width: W, height: H })
  for (let i = 0; i < W * H; i++) { png.data[i * 4] = px[i * 3]; png.data[i * 4 + 1] = px[i * 3 + 1]; png.data[i * 4 + 2] = px[i * 3 + 2]; png.data[i * 4 + 3] = 255 }
  fs.writeFileSync(out, PNG.sync.write(png))
  let bg = 0; for (let i = 0; i < W * H; i++) if (zb[i] === Infinity) bg++
  console.log(`  ${out} — 배경 ${(bg / (W * H) * 100).toFixed(1)}%`)
}

for (const arg of process.argv.slice(2)) {
  const fp = parseFree(arg)
  if (!fp) { console.error('free: 형식 오류 —', arg); process.exit(1) }
  const dg = v => Math.round(v * 1800 / Math.PI) / 10
  render([fp.x, fp.y, fp.z], fp.yaw, fp.pitch, `_probe_ext_${dg(fp.yaw)}_${dg(fp.pitch)}.png`)
}
