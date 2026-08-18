// domeRingGeometry.js — ★★★145 돔 리브 · 띠 · 기둥 · 고리 통로 (2026.08.18 현도 스케치 · 블록아웃)
//  사슬(현도 설명 그대로): 첨탑 벽의 리브 → 돔을 타고 흘러내림 → 팔 접촉 최하점의 띠 → 기둥 → 고리 통로.
//  수치 정본 = constants `DRG_*`. 돔 표면식은 `armGeometry`의 domeY/domeDY를 **그대로 쓴다**(사본 금지 — 규율).
//
//  ★어법 승계: 리브는 팔(`armGeometry.buildArm13`)과 **같은 구조**다 — (s, y) 평면의 다각형 하나를
//   접선 방향으로 ±HW 압출한다. 그래서 리브가 돔에 얹히는 방식(밑변 = 표면 −EMB · 윗변 = 표면 +T)이
//   팔과 소수점까지 같은 식에서 나온다.
//  ⚠리브는 L자다: 첨탑 벽 구간(r18~22.2 · y98~122.5)에서는 세로 슬래브이고, 돔에 닿는 순간
//   두께 T의 얇은 띠가 되어 흘러내린다. 두 구간이 **한 다각형**이라 이음선이 원리적으로 없다.
import * as THREE from 'three'
import {
  DRG_ON, DRG_KS, DRG_HW, DRG_T, DRG_EMB, DRG_T_SPIRE, DRG_Y_TOP,
  DRG_S_BAND, DRG_COL_S0, DRG_R_IN, DRG_W, DRG_Y, DRG_H, DRG_SEG, DRG_LAP, DRG_PLAN,
  DRG_SECT, DRG_ARC_MODE, DRG_ARC, DRG_FLR, DRG_ROOF, DRG_SPRING, DRG_WALL_T, DRG_RAIL_H, DRG_RAIL_W,
  DRG_IN, DRG_IN_DIV, DRG_IN_W, DRG_IN_LINT,
} from './constants.js'
import { domeY, domeDY } from './armGeometry.js'
import { spireSpec } from './spireGeometry.js'
import { orientOutward } from './orientGeo.js'

//  ── 돔 표면 호길이 도구(띠 폭의 정본) ──
//   ★폭은 **반경 차가 아니라 표면을 따라 잰 길이**여야 팔 폭과 같다(돔이 62° 기울어 있어 둘이 두 배 넘게 다르다).
const arcLen = (a, b, N = 64) => {           // ∫ √(1+y′²) ds — 심프슨
  const f = (s) => Math.hypot(1, domeDY(s))
  const h = (b - a) / N
  let acc = f(a) + f(b)
  for (let i = 1; i < N; i++) acc += f(a + h * i) * (i % 2 ? 4 : 2)
  return acc * h / 3
}
//  ★호길이 L만큼 떨어진 s를 이분법으로(닫힌 역함수가 없다 — 도구를 먼저 믿지 말고 수렴을 확인한다)
const sAtArc = (s0, L, dir) => {
  let lo = s0, hi = s0 + dir * 12
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2
    if (arcLen(Math.min(s0, m), Math.max(s0, m)) < Math.abs(L)) lo = m; else hi = m
  }
  return (lo + hi) / 2
}

//  ★스펙 — 빌더와 검사가 같은 함수를 부른다(단일 진실).
export function domeRingSpec(opts = {}) {
  const S = opts.spire ?? spireSpec()
  const rIn = S.rCyl                       // 첨탑 벽(리브 안쪽 면)
  const rOut = rIn + DRG_T_SPIRE           // 리브 바깥 면 — S.rCylTop과 **항등**(검사가 박음)
  const sB = DRG_S_BAND, yB = domeY(sB)    // 띠 중심(돔 표면 위)
  const s0 = DRG_COL_S0, y0 = domeY(s0)    // 기둥 출발(돔 표면 위)
  //  ★두 안 병존: opts.plan을 주면 그 안으로 짓는다(검사가 A·B를 나란히 재려면 필요하다 — 값 사본 금지).
  const pl = opts.plan ? DRG_PLAN[opts.plan] : { rIn: DRG_R_IN, w: DRG_W, y: DRG_Y, h: DRG_H }
  const cr0 = pl.rIn, cr1 = pl.rIn + pl.w, cy0 = pl.y, cy1 = pl.y + pl.h
  const theta = Math.atan2(cy0 - y0, cr0 - s0)
  //  돔 표면 접선·법선(해석해 — 수치미분 아님). 접선은 s 증가(바깥·아래) 방향.
  const dy = domeDY(sB), nn = Math.hypot(1, dy)
  const tan = [1 / nn, dy / nn]
  const nor = [-dy / nn, 1 / nn]           // 바깥·위(표면에서 멀어지는 쪽)
  //  ★띠 폭의 정본 = **표면 호길이** 2·HW가 걸치는 [sLo, sHi]. 빌더도 검사도 이 둘만 읽는다(사본 금지).
  const sLo = sAtArc(sB, DRG_HW, -1), sHi = sAtArc(sB, DRG_HW, +1)
  return {
    on: DRG_ON, ks: DRG_KS, S, rIn, rOut, yTop: DRG_Y_TOP,
    sB, yB, sLo, sHi, tan, nor, s0, y0, theta,
    corr: { r0: cr0, r1: cr1, y0: cy0, y1: cy1 },
    //  기둥 길이(물림 포함) — 양 끝을 DRG_LAP만큼 각각 파묻는다
    colLen: Math.hypot(cr0 - s0, cy0 - y0) + 2 * DRG_LAP,
  }
}

//  ── 공용 쿼드 빌더(다른 모듈과 동일 관례 — 감김은 orientOutward가 보증) ──
function quadGeo(build) {
  const pos = [], idx = []
  const q = (a, b, c, d) => {
    const n = pos.length / 3
    pos.push(...a, ...b, ...c, ...d)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  build(q)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return orientOutward(g)
}

//  ── ① 리브 프로파일 — (s, y) 평면의 폐다각형 하나(팔 어법) ──
//   ⓐ 밑변 = 돔 표면 −EMB (첨탑 벽 → 띠)
//   ⓑ 띠 자리에서 표면 위 T까지 올라섬
//   ⓒ 윗변 = 돔 표면 +T (띠 → 첨탑 벽 바깥면)
//   ⓓ 첨탑 벽 바깥면을 타고 상단까지 → 안쪽 면으로 건너가 폐합
export function ribProfile(A = domeRingSpec(), N = 24) {
  const P = []
  P.push([A.rIn, domeY(A.rIn) - DRG_EMB])
  for (let i = 1; i <= N; i++) {
    const s = A.rIn + (A.sB - A.rIn) * i / N
    P.push([s, domeY(s) - DRG_EMB])
  }
  P.push([A.sB, domeY(A.sB) + DRG_T])
  for (let i = 1; i <= N; i++) {
    const s = A.sB + (A.rOut - A.sB) * i / N
    P.push([s, domeY(s) + DRG_T])
  }
  P.push([A.rOut, A.yTop])
  P.push([A.rIn, A.yTop])
  return P
}

export function buildDomeRib(A = domeRingSpec()) {
  const P = ribProfile(A)
  const pos = []
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c) }
  const V = (p, w) => [p[0], p[1], w]
  const faces = THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), [])
  for (const [i, j, k] of faces) {
    tri(V(P[i], DRG_HW), V(P[j], DRG_HW), V(P[k], DRG_HW))
    tri(V(P[k], -DRG_HW), V(P[j], -DRG_HW), V(P[i], -DRG_HW))
  }
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length
    tri(V(P[i], DRG_HW), V(P[i], -DRG_HW), V(P[j], -DRG_HW))
    tri(V(P[i], DRG_HW), V(P[j], -DRG_HW), V(P[j], DRG_HW))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}

//  ── ② 띠 — 돔을 두르는 고리. 단면은 **표면을 따라간다** ──
//   ⛔평면 단면(접선 프레임의 사각형)은 기각됐다: 돔이 볼록해 접선이 표면 **밖**에 있으므로 폭 4.5의
//    양 끝에서 밑면이 최대 0.13 뜬다(실측). 규율 ⑥ — 곡면에 붙는 부재는 단면 하나로 잡지 않는다.
//   ★해법 = 밑변·윗변을 **각 s의 표면 법선 위**에 얹는다. 그러면 물림 EMB·두께 T가 폭 전 구간에서 항등이다.
//   폭은 **호길이 기준**(2·HW)으로 잡는다 — 반경 차가 아니라 표면을 따라 잰 폭이 팔과 같아야 한다.
export function bandSection(A = domeRingSpec(), N = 10) {
  const { sLo, sHi } = A
  const at = (s, v) => {
    const dy = domeDY(s), nn = Math.hypot(1, dy)
    return [s + (-dy / nn) * v, domeY(s) + (1 / nn) * v]
  }
  const bot = [], top = []
  for (let i = 0; i <= N; i++) {
    const s = sLo + (sHi - sLo) * i / N
    bot.push(at(s, -DRG_EMB))
    top.push(at(s, DRG_T))
  }
  return bot.concat(top.reverse())            // 밑변(안→바깥) + 윗변(바깥→안) = 폐다각형
}

export function buildDomeBand(A = domeRingSpec()) {
  const sec = bandSection(A)
  return quadGeo((q) => {
    const p = (i, a) => [sec[i][0] * Math.cos(a), sec[i][1], sec[i][0] * Math.sin(a)]
    for (let i = 0; i < DRG_SEG; i++) {
      const a0 = i / DRG_SEG * Math.PI * 2, a1 = (i + 1) / DRG_SEG * Math.PI * 2
      for (let j = 0; j < sec.length; j++) {
        const k = (j + 1) % sec.length
        q(p(j, a0), p(k, a0), p(k, a1), p(j, a1))
      }
    }
  })
}

//  ── ③ 기둥 — 띠 접합부에서 통로 안쪽 밑까지. 단면 = 폭 2·HW × 두께 T(자기 축에 수직) ──
//   로컬 프레임: x = 방위 반경 · y = 위 · z = 접선. 방위 배치는 rotation-y가 한다(기하 사본 0).
export function buildDomeColumn(A = domeRingSpec()) {
  const d = [Math.cos(A.theta), Math.sin(A.theta)]        // 축 방향
  const p = [-d[1], d[0]]                                  // 축에 수직(단면 두께 방향)
  const base = [A.s0 - DRG_LAP * d[0], A.y0 - DRG_LAP * d[1]]   // 띠 속으로 물림
  const h = DRG_T / 2
  const C = []
  for (const t of [0, 1]) {
    for (const sp of [-h, h]) {
      for (const z of [-DRG_HW, DRG_HW]) {
        C.push([
          base[0] + d[0] * (t * A.colLen) + p[0] * sp,
          base[1] + d[1] * (t * A.colLen) + p[1] * sp,
          z,
        ])
      }
    }
  }
  //  인덱스: t*4 + sp*2 + z  →  0..3 = 시작면, 4..7 = 끝면
  return quadGeo((q) => {
    q(C[0], C[1], C[3], C[2])   // 시작 캡
    q(C[4], C[6], C[7], C[5])   // 끝 캡
    q(C[0], C[2], C[6], C[4])   // 옆 z−
    q(C[1], C[5], C[7], C[3])   // 옆 z+
    q(C[0], C[4], C[5], C[1])   // 밑
    q(C[2], C[3], C[7], C[6])   // 위
  })
}

//  ── ④ 고리 통로 ──
//   ★145 초판 = 민짜 닫힌 상자(블록아웃 — `DRG_SECT='block'` 보존계로 존치).
//   ★145-d = **회랑**: 바닥판·지붕판(보행) + 안벽(민짜) + 바깥벽 아케이드. CSG 없이 면 단위 직조 —
//    아치의 **인트라도스·문설주 리빌**을 명시적 면으로 만들어 §2-D 종잇장 금지를 기하로 보증한다.
export function buildCorridorRing(A = domeRingSpec()) {
  const { r0, r1, y0, y1 } = A.corr
  return ringBox(r0, r1, y0, y1)
}

//  공용 환형 상자(단면 사각형의 회전체 — 닫힌 고리)
function ringBox(r0, r1, y0, y1, seg = DRG_SEG) {
  return quadGeo((q) => {
    const p = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)]
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2
      q(p(r0, y1, a0), p(r1, y1, a0), p(r1, y1, a1), p(r0, y1, a1))   // 윗면
      q(p(r0, y0, a0), p(r0, y0, a1), p(r1, y0, a1), p(r1, y0, a0))   // 밑면
      q(p(r0, y0, a0), p(r0, y1, a0), p(r0, y1, a1), p(r0, y0, a1))   // 안벽
      q(p(r1, y0, a0), p(r1, y0, a1), p(r1, y1, a1), p(r1, y1, a0))   // 바깥벽
    }
  })
}

//  ★아케이드 스펙 — 빌더·검사 공용(사본 금지). 개구 폭은 **바깥면(rOut) 호길이** 기준(위젯과 동일 정의).
export function arcadeSpec(A = domeRingSpec()) {
  const M = DRG_ARC[DRG_ARC_MODE]
  const { r1: rOut, y0, y1 } = A.corr
  const fT = y0 + DRG_FLR                       // 바닥판 상면 = 아치 발
  const roofBot = y1 - DRG_ROOF                 // 지붕판 밑면 = 벽 상단
  const bay = 2 * Math.PI * rOut / M.N
  const wOp = bay * M.O
  return {
    mode: DRG_ARC_MODE, N: M.N, O: M.O, rOut, rW: rOut - DRG_WALL_T,
    fT, roofBot, clear: roofBot - fT,
    bay, wOp, pier: bay - wOp, spring: DRG_SPRING, apex: DRG_SPRING + wOp / 2,
  }
}

//  ★바깥벽 아케이드 — 베이마다 (u, yBot) 스테이션 사슬을 만들고 네 면(바깥·안·인트라도스·상단 캡)을 짠다.
//   u = rOut 호길이 좌표. yBot = 피어에서 바닥판 상면 · 개구 위에서 아치 곡선(스팬드럴 밑) — 문설주는
//   같은 u의 이중 스테이션(fT→spring)으로, 그 사이가 **수직 리빌 면**이 된다. 인트라도스 = yBot을 잇는 밑면.
export function buildArcadeWall(A = domeRingSpec(), S = arcadeSpec(A)) {
  const { rOut, rW, fT, roofBot, bay, wOp, N } = S
  const uL = (bay - wOp) / 2, uR = (bay + wOp) / 2, uc = bay / 2, R = wOp / 2
  const spr = fT + S.spring                                  // ⚠스프링은 **바닥판 상면 기준 상대값** — 절대 y로 환산해 쓴다
  //  베이 하나의 스테이션(u, yBot). 문설주 = 같은 u 두 번(수직 리빌 신호).
  const st = []
  const pierStep = Math.max(1, Math.ceil(uL / 2))
  for (let i = 0; i <= pierStep; i++) st.push([uL * i / pierStep, fT])
  st.push([uL, spr])                                         // ← 문설주(왼) 수직 리빌
  const M2 = 14
  for (let i = 1; i < M2; i++) {
    const u = uL + wOp * i / M2
    st.push([u, spr + Math.sqrt(Math.max(0, R * R - (u - uc) ** 2))])
  }
  st.push([uR, spr])
  st.push([uR, fT])                                          // ← 문설주(오른) 수직 리빌
  for (let i = 1; i <= pierStep; i++) st.push([uR + (bay - uR) * i / pierStep, fT])
  return quadGeo((q) => {
    const P = (u, y, r, k) => {
      const a = (k * bay + u) / rOut                          // 호길이 → 방위각
      return [r * Math.cos(a), y, r * Math.sin(a)]
    }
    for (let k = 0; k < N; k++) {
      for (let i = 0; i < st.length - 1; i++) {
        const [u0, b0] = st[i], [u1, b1] = st[i + 1]
        if (u0 === u1) {                                     // 문설주 — 리빌은 **방사 수직 면**(두께 1.2가 보이는 면)
          const lo = Math.min(b0, b1), hi = Math.max(b0, b1)
          q(P(u0, lo, rW, k), P(u0, hi, rW, k), P(u0, hi, rOut, k), P(u0, lo, rOut, k))
          continue
        }
        //  ⚠피어 면(fT에서 시작)은 **스프링 높이에서 수평 분할**한다 — 문설주에서 이웃 면들의 변이
        //   스프링에서 갈라지므로, 분할하지 않으면 T-정션(변 불일치 576개 실측)이 된다.
        if (b0 === fT && b1 === fT) {
          q(P(u0, fT, rOut, k), P(u1, fT, rOut, k), P(u1, spr, rOut, k), P(u0, spr, rOut, k))         // 바깥 아래띠
          q(P(u0, spr, rOut, k), P(u1, spr, rOut, k), P(u1, roofBot, rOut, k), P(u0, roofBot, rOut, k)) // 바깥 위띠
          q(P(u0, fT, rW, k), P(u0, spr, rW, k), P(u1, spr, rW, k), P(u1, fT, rW, k))                 // 안 아래띠
          q(P(u0, spr, rW, k), P(u0, roofBot, rW, k), P(u1, roofBot, rW, k), P(u1, spr, rW, k))       // 안 위띠
          q(P(u0, fT, rW, k), P(u1, fT, rW, k), P(u1, fT, rOut, k), P(u0, fT, rOut, k))               // 밑면
          q(P(u0, roofBot, rW, k), P(u0, roofBot, rOut, k), P(u1, roofBot, rOut, k), P(u1, roofBot, rW, k)) // 상단 캡
          continue
        }
        q(P(u0, b0, rOut, k), P(u1, b1, rOut, k), P(u1, roofBot, rOut, k), P(u0, roofBot, rOut, k))   // 바깥면
        q(P(u0, b0, rW, k), P(u0, roofBot, rW, k), P(u1, roofBot, rW, k), P(u1, b1, rW, k))           // 안면
        q(P(u0, b0, rW, k), P(u1, b1, rW, k), P(u1, b1, rOut, k), P(u0, b0, rOut, k))                 // 밑면 = 인트라도스 리빌
        q(P(u0, roofBot, rW, k), P(u0, roofBot, rOut, k), P(u1, roofBot, rOut, k), P(u1, roofBot, rW, k)) // 상단 캡
      }
    }
  })
}

//  ── 회랑 파츠 묶음 — walk(보행 상면) / solid(벽·난간) ──
export function buildCorridorParts(A = domeRingSpec()) {
  const { r0, r1, y0, y1 } = A.corr
  if (DRG_SECT === 'block') {
    return { walk: [{ id: '블록', geo: buildCorridorRing(A) }], solid: [] }
  }
  const S = arcadeSpec(A)
  return {
    walk: [
      { id: '바닥판', geo: ringBox(r0, r1, y0, y0 + DRG_FLR) },
      { id: '지붕판', geo: ringBox(r0, r1, y1 - DRG_ROOF, y1) },
    ],
    solid: DRG_IN === 'colonnade'
      ? [
          //  ★145-e 안벽 = 통창 + 열주: 상인방(고리 한 줄) + 기둥 N기. 그 사이가 통째로 개구다.
          { id: '상인방', geo: ringBox(r0, r0 + DRG_WALL_T, S.roofBot - DRG_IN_LINT, S.roofBot) },
          { id: '안열주', geo: buildInnerColonnade(A, S) },
          { id: '아케이드', geo: buildArcadeWall(A, S) },
          { id: '난간', geo: mergeCurbs(r0, r1, y1) },
        ]
      : [
          { id: '안벽', geo: ringBox(r0, r0 + DRG_WALL_T, S.fT, S.roofBot) },
          { id: '아케이드', geo: buildArcadeWall(A, S) },
          { id: '난간', geo: mergeCurbs(r0, r1, y1) },
        ],
  }
}

//  ★안열주 — 기둥 N기(= 아치 수 ÷ DRG_IN_DIV). 방위는 **바깥 피어 중심과 같은 격자**(2π·k/N_arch의 부분집합)라
//   두 리듬이 3:1로 정합한다. 단면 = 방사 DRG_WALL_T × 접선 DRG_IN_W의 정사각(1.2×1.2) — 종잇장 금지 승계.
export function colonnadeSpec(A = domeRingSpec(), S = arcadeSpec(A)) {
  const N = S.N / DRG_IN_DIV
  const rIn = A.corr.r0, rOut = rIn + DRG_WALL_T
  const yBot = S.fT, yTop = S.roofBot - DRG_IN_LINT
  return { N, rIn, rOut, yBot, yTop, w: DRG_IN_W, hOpen: yTop - yBot,
    bay: 2 * Math.PI * rIn / N, wOpen: 2 * Math.PI * rIn / N - DRG_IN_W }
}

export function buildInnerColonnade(A = domeRingSpec(), S = arcadeSpec(A)) {
  const K = colonnadeSpec(A, S)
  const half = K.w / 2 / K.rIn                      // 접선 반폭 → 각반폭(안쪽 면 기준)
  return quadGeo((q) => {
    for (let k = 0; k < K.N; k++) {
      const a = k * Math.PI * 2 / K.N
      const p = (r, y, da) => [r * Math.cos(a + da), y, r * Math.sin(a + da)]
      const C = []
      for (const y of [K.yBot, K.yTop]) for (const r of [K.rIn, K.rOut]) for (const d of [-half, half]) C.push(p(r, y, d))
      //  C: 0..3 = 아래(안−,안+,밖−,밖+) · 4..7 = 위
      q(C[0], C[1], C[3], C[2])   // 밑면
      q(C[4], C[6], C[7], C[5])   // 윗면
      q(C[0], C[4], C[5], C[1])   // 안쪽 면(중심을 보는 면)
      q(C[2], C[3], C[7], C[6])   // 바깥 면(회랑 안을 보는 면)
      q(C[0], C[2], C[6], C[4])   // 옆 −
      q(C[1], C[5], C[7], C[3])   // 옆 +
    }
  })
}

//  옥상 난간 두 줄(안·바깥 가장자리) — 한 기하 두 성분(orientOutward가 성분별로 감김을 잡는다)
function mergeCurbs(r0, r1, yTop) {
  return quadGeo((q) => {
    const p = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)]
    for (const [c0, c1] of [[r0, r0 + DRG_RAIL_W], [r1 - DRG_RAIL_W, r1]]) {
      for (let i = 0; i < DRG_SEG; i++) {
        const a0 = i / DRG_SEG * Math.PI * 2, a1 = (i + 1) / DRG_SEG * Math.PI * 2
        q(p(c0, yTop + DRG_RAIL_H, a0), p(c1, yTop + DRG_RAIL_H, a0), p(c1, yTop + DRG_RAIL_H, a1), p(c0, yTop + DRG_RAIL_H, a1))
        q(p(c0, yTop, a0), p(c0, yTop, a1), p(c1, yTop, a1), p(c1, yTop, a0))
        q(p(c0, yTop, a0), p(c0, yTop + DRG_RAIL_H, a0), p(c0, yTop + DRG_RAIL_H, a1), p(c0, yTop, a1))
        q(p(c1, yTop, a0), p(c1, yTop, a1), p(c1, yTop + DRG_RAIL_H, a1), p(c1, yTop + DRG_RAIL_H, a0))
      }
    }
  })
}

//  ── 마운트 묶음 — Room.jsx가 이것만 받는다(스위치 인식: 소등이면 null) ──
export function buildDomeRingParts() {
  if (!DRG_ON) return null
  const A = domeRingSpec()
  return {
    spec: A,
    rib: buildDomeRib(A),
    col: buildDomeColumn(A),
    band: buildDomeBand(A),
    corrParts: buildCorridorParts(A),   // ★145-d: walk(바닥판·지붕판) / solid(안벽·아케이드·난간). 'block'이면 블록 하나
    //  방위 = 90°·k. 로컬 +x가 그 방위를 보게 rotation-y = −a(꽃잎·LNK 가족과 같은 규약).
    mounts: DRG_KS.map(k => ({ k, az: k * Math.PI / 2, rotY: -k * Math.PI / 2 })),
  }
}
