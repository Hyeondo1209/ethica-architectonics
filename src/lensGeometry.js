// ── 정점 렌즈 기하(순수 모듈) — Lens.jsx(렌더)와 check_lens.mjs(검증)가 같은 코드를 import ──
//  형태: 양볼록 렌즈(가장자리 얇음 = '기둥·구'가 아니라 렌즈로 읽히는 결정타) + 방사 패싯.
//  '세공 중' = 패싯이 매끈한 곡면으로 아직 안 다듬어진 상태 그 자체(별도 장치 없음).
//  불규칙(원석): 반경·높이만 지터, 방위각 θ는 정확히 유지 → 패싯 k 중심 = 리브 k 방위각(1:1)이
//  어떤 LENS_IRREG 값에서도 '증명 가능'하게 보존된다. 경계 정점은 이웃 패싯이 공유 → watertight.
import * as THREE from 'three'
import {
  LENS_R, LENS_T, LENS_MID_T, LENS_MID_F, LENS_FACETS, LENS_IRREG, LENS_SEED,
} from './constants.js'

// 결정론 PRNG(mulberry32) — 시드 고정 = 항상 같은 원석
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 지터 진폭(×LENS_IRREG): 반경 ±10%R · 중간링 두께 ±35% · 림 상하 ±30%T · 정점 ±20%T
const J_R = 0.10, J_MT = 0.35, J_RIM = 0.30, J_APEX = 0.20

export function buildLensGeometry(opts = {}) {
  const F    = opts.facets ?? LENS_FACETS
  const R    = opts.r      ?? LENS_R
  const T    = opts.t      ?? LENS_T
  const MT   = opts.midT   ?? LENS_MID_T
  const MF   = opts.midF   ?? LENS_MID_F
  const irr  = opts.irreg  ?? LENS_IRREG
  const rnd  = mulberry32(opts.seed ?? LENS_SEED)
  const d    = (2 * Math.PI) / F

  // 경계 링(패싯 경계 = 이웃 공유 → watertight). 경계 k의 각 = (k−0.5)·d → 패싯 k 중심 = k·d = 리브 k 방위각.
  const rim = [], midT_ = [], midB_ = []
  for (let k = 0; k < F; k++) {
    const a = (k - 0.5) * d
    const c = Math.cos(a), s = Math.sin(a)
    const rRim  = R * (1 + (rnd() * 2 - 1) * irr * J_R)
    const yRim  = (rnd() * 2 - 1) * irr * J_RIM * T          // 림은 얇음 — y만 흔들림(칼날 가장자리)
    const rMid  = MF * R * (1 + (rnd() * 2 - 1) * irr * J_R)
    const yMidT = MT * (1 + (rnd() * 2 - 1) * irr * J_MT)
    const yMidB = -MT * (1 + (rnd() * 2 - 1) * irr * J_MT)
    rim.push([rRim * c, yRim, rRim * s])
    midT_.push([rMid * c, yMidT, rMid * s])
    midB_.push([rMid * c, yMidB, rMid * s])
  }
  const apexT = [0,  T * (1 + (rnd() * 2 - 1) * irr * J_APEX), 0]
  const apexB = [0, -T * (1 + (rnd() * 2 - 1) * irr * J_APEX), 0]

  // 비인덱스 삼각형(플랫 노멀 = 패싯 절삭면). 패싯 k = 경계 k ↔ k+1 사이. 6tri/패싯.
  const pos = []
  const tri = (p, q, r) => pos.push(...p, ...q, ...r)
  for (let k = 0; k < F; k++) {
    const k1 = (k + 1) % F
    tri(apexT, midT_[k], midT_[k1])                 // 상면 부채꼴
    tri(midT_[k], rim[k], rim[k1])                  // 상면 림 쿼드 ×2
    tri(midT_[k], rim[k1], midT_[k1])
    tri(apexB, midB_[k1], midB_[k])                 // 하면(반대 감김)
    tri(midB_[k], rim[k1], rim[k])
    tri(midB_[k], midB_[k1], rim[k1])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()                        // 비인덱스 → 면 단위 노멀(플랫 패싯)
  return geo
}
