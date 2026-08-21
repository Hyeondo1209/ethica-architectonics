// bridgeVaultGeometry.js — ★★★148 관 사변형 리브 볼트 + 벽앞 기둥 + 첨탑 대역 상향 ⓚ′
//  (2026.08.20 현도 확정 9건 — 결정 이력은 constants.js ★148 절 머리에)
//
//  ★볼트 모델(교차 볼트의 정의): 인트라도스 높이 = 스프링 + max(H1(z), H2(ξ)).
//   H1 = 횡단 배럴(스팬 = 내부 폭 7.80) · H2 = 종단 배럴(스팬 = 베이 7.675, ξ = 베이 중심 기준 x).
//   교차 볼트 = 두 배럴 **공동의 합집합**이므로 천장은 max다(min이면 배럴 하나짜리 — 오답).
//   그로인(대각 능선) = H1 = H2 인 궤적. 대각 리브가 그 밑을 따라간다.
//  ★첨두 아치 프로파일: 스팬 S · 라이즈 R(> S/2 = 첨두). 원 중심이 스프링선 위 c = (S²/4 − R²)/S < 0,
//   반지름 ρ = S/2 − c. 발(±S/2)에서 0, 정점(0)에서 정확히 R.
//  ★봉인 어법(전부 기존 승계):
//   · 웹 z 연장 = 벽 살 속 lap(0.625) — 잘린 변 불가시(★147-f 노치와 같은 근거)
//   · 웹 엑스트라도스 크라운 돌출 145.096 = 지붕판(144.471~145.721) 살 속
//   · 리브 상단 = 인트라도스 + SPIRE_SINK(0.5) — 웹 살(0.625) **속**에서 끝남(공면 금지)
//   · 대역 밑면 = 첨탑 위 빗면 시작 yTop0 — 곧은 벽 살의 수평 단면이라 불가시(연속 살)
//  ⚠감김: 모든 부재는 닫힌 솔리드로 짓고 orientOutward가 바깥을 보증(★122-d 도구).
//  ⚠임포트 방향: 이 파일 → bridgeDeckGeometry(shaftSpec) → constants. 역방향 금지(순환).
//   렌더 배선은 Room.jsx가 buildBridgeVaultParts를 **따로** 부른다(deck 파츠에 안 끼움 — 순환 회피).
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import {
  BRD_VLT_ON, BRD_VLT_N, BRD_VLT_BAY, BRD_VLT_W, BRD_VLT_RISE,
  BRD_VLT_SPR, BRD_VLT_CROWN, BRD_VLT_WEB_T, BRD_VLT_RIB, BRD_VLT_COL_W, BRD_VLT_SEG,
  BRD_BAND_ON, BRD_BAND_SEGS, BRD_VLT_OPEN, BRD_VLT_CAP_K, brdVaultTopY,
  BRD_X0, BRD_EAST_X, BRD_HW, BRD_T, BRD_YW, BRD_CEIL_LAP, BRD_ROOF_TOP, BRD_SFT_ON,
  SPIRE_SINK,
} from './constants.js'
import { shaftSpec } from './bridgeDeckGeometry.js'
import { spireSpec } from './spireGeometry.js'

//  ── 공용 쿼드 빌더(bridgeDeckGeometry와 같은 관례 — 감김은 orientOutward가 보증) ──
function quadGeo(build) {
  const pos = [], idx = []
  const q = (a, b, c, d) => {
    const n = pos.length / 3
    for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]) }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  const tri = (a, b, c) => {
    const n = pos.length / 3
    for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]) }
    idx.push(n, n + 1, n + 2)
  }
  build(q, tri)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return orientOutward(g)
}

function box(q, x0, x1, y0, y1, z0, z1) {
  if (!(x1 - x0 > 0) || !(y1 - y0 > 0) || !(z1 - z0 > 0)) return   // 퇴화 가드(★147-a 교훈)
  const P = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
  ]
  q(P[0], P[1], P[2], P[3]); q(P[4], P[7], P[6], P[5])
  q(P[0], P[4], P[5], P[1]); q(P[3], P[2], P[6], P[7])
  q(P[0], P[3], P[7], P[4]); q(P[1], P[5], P[6], P[2])
}

//  ══ ① 정본 스펙 — 빌더도 검사도 이것만 읽는다(★144 규칙) ══
export function bridgeVaultSpec() {
  const w2 = BRD_VLT_W / 2                       // 3.90 내부 반폭
  const lap = BRD_CEIL_LAP                       // 0.625
  //  첨두 아치 공장: h(t) — 발 밖(|t| ≥ S/2)은 0으로 클램프(웹 살속 연장이 이 성질을 쓴다)
  const arch = (S, R) => {
    const c = (S * S / 4 - R * R) / S, rho = S / 2 - c
    return (t) => {
      const a = Math.abs(t)
      if (a >= S / 2) return 0
      return Math.sqrt(Math.max(0, rho * rho - (a - c) * (a - c)))
    }
  }
  const H1 = arch(BRD_VLT_W, BRD_VLT_RISE)       // 횡단(z) — 벽에서 벽
  const H2 = arch(BRD_VLT_BAY, BRD_VLT_RISE)     // 종단(베이 내 ξ) — 경계에서 경계
  const bayX0 = (k) => BRD_X0 + k * BRD_VLT_BAY
  //  ★★★149 웹의 바깥 z 한계 — 개방 구간은 벽 바깥면 flush, 캡 구간은 구대로 살 속.
  const zOut = (k) => (BRD_VLT_OPEN && k < BRD_VLT_CAP_K) ? BRD_HW : w2 + lap
  //  인트라도스 y — x로 베이를 자동 판별. 경계 위에서는 양쪽 베이가 같은 값(H2 = 0)이라 연속.
  const surf = (x, z) => {
    const k = Math.min(BRD_VLT_N - 1, Math.max(0, Math.floor((x - BRD_X0) / BRD_VLT_BAY)))
    const xi = x - (bayX0(k) + BRD_VLT_BAY / 2)
    return BRD_VLT_SPR + Math.max(H1(z), H2(xi))
  }

  //  ── 횡단 아치 띠 17기: 경계 중심 정렬, 양끝(0·16)만 안으로 붙임(관 범위 밖 돌출 금지) ──
  const rib = BRD_VLT_RIB
  const bands = []
  for (let k = 0; k <= BRD_VLT_N; k++) {
    const xb = bayX0(k)
    const x0 = k === 0 ? BRD_X0 : k === BRD_VLT_N ? BRD_EAST_X - rib : xb - rib / 2
    bands.push({ k, xb, x0, x1: x0 + rib })
  }

  //  ── 벽앞 기둥: 경계 × 양벽. 샤프트 구멍(전폭 관통)과 x가 겹치면 발 디딜 데크가 없다 → 생략 + 선언 ──
  const S = BRD_SFT_ON ? shaftSpec() : null
  const cw = BRD_VLT_COL_W
  const columns = [], omitted = []
  for (let k = 0; k <= BRD_VLT_N; k++) {
    const xb = bayX0(k)
    const x0 = k === 0 ? BRD_X0 : k === BRD_VLT_N ? BRD_EAST_X - cw : xb - cw / 2
    const x1 = x0 + cw
    const overShaft = S ? (x1 > S.inX0 && x0 < S.inX1) : false
    for (const s of [1, -1]) {
      const zIn = s * (w2 - cw), zWall = s * w2       // 벽 안쪽면에 붙어 cw만큼 돌출
      const col = { k, x0, x1, z0: Math.min(zIn, zWall), z1: Math.max(zIn, zWall), side: s }
      if (overShaft) omitted.push(col)
      else columns.push(col)
    }
  }

  //  ── 첨탑 대역 상향 ⓚ′ — 세그 96 스냅. 반경·기준 y는 첨탑 정본 파생(사본 금지) ──
  const SP = spireSpec()
  const segW = 2 * Math.PI / 96                   // 첨탑 lathe SEG=96과 같은 분할(검사가 커버리지로 잠근다)
  const band = {
    on: BRD_BAND_ON, segs: BRD_BAND_SEGS, segW,
    half: BRD_BAND_SEGS * segW,                   // 반각 11.25°
    rIn: SP.rCylTopIn, rOut: SP.rCylTop,          // 21.0 / 22.2
    //  ★149: 지붕판을 걷으면 서단에서 가장 높은 것은 **웹 엑스트라도스 크라운**(145.096)이다.
    //   구 체제(통짜 지붕)에서는 지붕 상면(145.721). 둘 다 파생 — 손 수치 0.
    y0: SP.yTop0, y1: BRD_VLT_OPEN ? BRD_VLT_CROWN + BRD_VLT_WEB_T : BRD_ROOF_TOP,
  }

  return {
    on: BRD_VLT_ON, n: BRD_VLT_N, bay: BRD_VLT_BAY, w: BRD_VLT_W, w2, lap,
    rise: BRD_VLT_RISE, spr: BRD_VLT_SPR, crown: BRD_VLT_CROWN,
    webT: BRD_VLT_WEB_T, rib, cw, seg: BRD_VLT_SEG, sink: SPIRE_SINK,
    open: BRD_VLT_OPEN, capK: BRD_VLT_CAP_K, zOut, topY: brdVaultTopY,
    H1, H2, surf, bayX0, bands, columns, omitted, band,
  }
}

//  ══ ② 웹 셸 — 인트라도스 + 엑스트라도스(+0.625 연직) + 가장자리 띠 4곳 = 닫힌 솔리드 하나 ══
//   격자: 베이마다 x는 seg 분할 · z는 [−w2, w2] seg 분할 + 양쪽 살속 연장 스테이션(±(w2+lap)).
//   ⚠쿼드 분할 방향 = 사분면 거울(그로인 |u|=|v| 방향으로 대각선을 눕힘) — ★64-7 ⓒ(대각선 하나로
//    쪼개면 좌우 비대칭)의 교훈을 격자 규칙으로 선제 차단. 경계·벽선·중심이 전부 격자 노드라
//    아치 발·크라운이 보간 오차 없이 정확히 실린다.
export function buildVaultWebs(A = bridgeVaultSpec()) {
  if (!A.on) return null
  const { n, bay, w2, lap, seg, surf, webT, bayX0, zOut } = A
  //  ★★★149: 베이마다 바깥 z 스테이션이 다르다 — 개방 구간은 벽 **바깥면**(5.15)까지 나와
  //   벽 윗변(인트라도스)과 마구리가 같은 평면으로 이어지고, 캡 구간은 구대로 살 속(4.525)에서 끝난다.
  //   ⚠**4.525는 항상 스테이션으로 둔다**: 안 두면 개방 베이의 3.90→5.15 한 변이 캡 베이의
  //    3.90→4.525 + 단차 4.525→5.15 두 변과 만나 **T-접합**이 생긴다(에지 감사 12건 적발 → 이 한 줄이 근인).
  const zsOf = (k) => {
    const zo = zOut(k)
    const outs = [w2 + lap]
    if (zo > w2 + lap + 1e-12) outs.push(zo)
    const out = outs.slice().reverse().map(v => -v)
    for (let j = 0; j <= seg; j++) out.push(-w2 + (2 * w2) * j / seg)
    for (const v of outs) out.push(v)
    return out
  }
  return quadGeo((q, tri) => {
    for (let k = 0; k < n; k++) {
      const xA = bayX0(k), zs = zsOf(k), M = zs.length - 1
      const xsK = []
      for (let i = 0; i <= seg; i++) xsK.push(xA + bay * i / seg)
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < M; j++) {
          const x0 = xsK[i], x1 = xsK[i + 1], z0 = zs[j], z1 = zs[j + 1]
          const P = (x, z, up) => [x, surf(x, z) + (up ? webT : 0), z]
          //  사분면 거울 분할: u·v > 0 이면 (00)-(11) 대각, 아니면 (10)-(01) 대각
          const uc = (x0 + x1) / 2 - (xA + bay / 2), vc = (z0 + z1) / 2
          const d1 = uc * vc > 0
          const [a, b, c, d] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
          const T = (p1, p2, p3, up) => up
            ? tri(P(...p1, 1), P(...p2, 1), P(...p3, 1))
            : tri(P(...p1, 0), P(...p3, 0), P(...p2, 0))    // 인트라도스는 감김 반대(아래를 본다)
          if (d1) { T(a, b, c, 0); T(a, c, d, 0); T(a, b, c, 1); T(a, c, d, 1) }
          else    { T(b, c, d, 0); T(b, d, a, 0); T(b, c, d, 1); T(b, d, a, 1) }
        }
      }
    }
    //  가장자리 띠 ①: 서(x=BRD_X0)·동(x=BRD_EAST_X) 끝 — 그 베이의 z 스테이션을 그대로 따라 닫는다.
    for (const [x, k, flip] of [[BRD_X0, 0, false], [BRD_EAST_X, n - 1, true]]) {
      const zs = zsOf(k)
      for (let j = 0; j < zs.length - 1; j++) {
        const z0 = zs[j], z1 = zs[j + 1]
        const a = [x, surf(x, z0), z0], b = [x, surf(x, z1), z1]
        const a2 = [x, surf(x, z0) + webT, z0], b2 = [x, surf(x, z1) + webT, z1]
        flip ? q(a, b, b2, a2) : q(a, a2, b2, b)
      }
    }
    //  가장자리 띠 ②: 남·북 옆면 — 베이마다 자기 zOut을 따라간다.
    for (let k = 0; k < n; k++) {
      const zo = zOut(k)
      for (const zEdge of [-zo, zo]) {
        for (let i = 0; i < seg; i++) {
          const x0 = bayX0(k) + bay * i / seg, x1 = bayX0(k) + bay * (i + 1) / seg
          const a = [x0, surf(x0, zEdge), zEdge], b = [x1, surf(x1, zEdge), zEdge]
          const a2 = [x0, surf(x0, zEdge) + webT, zEdge], b2 = [x1, surf(x1, zEdge) + webT, zEdge]
          zEdge > 0 ? q(a, b, b2, a2) : q(a, a2, b2, b)
        }
      }
    }
    //  가장자리 띠 ③ ★149: zOut이 바뀌는 내부 경계의 **단차 마구리**. 없으면 0.625 폭 구멍이 남는다.
    //   |z| > w2 이므로 그 대역에서 surf는 z에 무관 → 정확한 직사각(네 점 공면).
    for (let k = 1; k < n; k++) {
      const zPrev = zOut(k - 1), zCur = zOut(k)
      if (Math.abs(zPrev - zCur) < 1e-12) continue
      const x = bayX0(k), lo = Math.min(zPrev, zCur), hi = Math.max(zPrev, zCur)
      const y0 = surf(x, hi), y1 = y0 + webT
      const west = zPrev > zCur              // 서쪽이 더 넓다 = 마구리가 동쪽을 본다
      for (const s of [1, -1]) {
        const A0 = [x, y0, s * lo], B0 = [x, y0, s * hi]
        const A1 = [x, y1, s * lo], B1 = [x, y1, s * hi]
        ;(west === (s > 0)) ? q(A0, B0, B1, A1) : q(A0, A1, B1, B0)
      }
    }
  })
}

//  ══ ③ 횡단 아치 띠 17기 — 프로파일 H1(z)을 따라가는 닫힌 프리즘(단면 1.25 × 아래 1.25·위 0.5 물림) ══
export function buildVaultBands(A = bridgeVaultSpec()) {
  if (!A.on) return null
  const { w2, seg, spr, H1, rib, sink } = A
  //  ⚠단면은 곡선 **수직**으로 잰다(연직 리본이면 발 근처(접선 수직)에서 종잇장 — 스모크 부피 대조가
  //   290 vs 해석 ~500으로 적발). 법선 N = (−y′, 1)/√(1+y′²): 크라운에서 연직↑, 발에서 수평(벽 쪽)→
  //   위 물림 +sink가 발에서는 벽 살 속으로 들어간다(springer 매몰 — 부수 효과가 봉인 어법과 일치).
  return quadGeo((q) => {
    for (const B of A.bands) {
      const zAt = (j) => -w2 + 2 * w2 * j / seg
      const st = []
      for (let j = 0; j <= seg; j++) {
        const z = zAt(j), yS = spr + H1(z)
        const dz = 2 * w2 / seg
        const yp = (H1(Math.min(w2, z + dz / 2)) - H1(Math.max(-w2, z - dz / 2)))
          / (Math.min(w2, z + dz / 2) - Math.max(-w2, z - dz / 2))
        const nl = Math.hypot(yp, 1)
        const nz = -yp / nl, ny = 1 / nl          // 바깥(위·벽 쪽) 법선
        st.push({
          zT: z + nz * sink, yT: yS + ny * sink,
          zB: z - nz * rib, yB: yS - ny * rib,
        })
      }
      for (let j = 0; j < seg; j++) {
        const a = st[j], b = st[j + 1]
        q([B.x0, a.yT, a.zT], [B.x0, b.yT, b.zT], [B.x1, b.yT, b.zT], [B.x1, a.yT, a.zT])
        q([B.x0, a.yB, a.zB], [B.x1, a.yB, a.zB], [B.x1, b.yB, b.zB], [B.x0, b.yB, b.zB])
        q([B.x0, a.yT, a.zT], [B.x0, a.yB, a.zB], [B.x0, b.yB, b.zB], [B.x0, b.yT, b.zT])
        q([B.x1, a.yT, a.zT], [B.x1, b.yT, b.zT], [B.x1, b.yB, b.zB], [B.x1, a.yB, a.zB])
      }
      for (const jj of [0, seg]) {
        const s = st[jj], sgn = jj === 0 ? 1 : -1
        const quad = [[B.x0, s.yT, s.zT], [B.x1, s.yT, s.zT], [B.x1, s.yB, s.zB], [B.x0, s.yB, s.zB]]
        sgn > 0 ? q(...quad) : q(quad[0], quad[3], quad[2], quad[1])
      }
    }
  })
}

//  ══ ④ 대각 리브 — 베이마다 2기, 그로인(surf 위 |u|=|v| 궤적)을 따라가는 닫힌 프리즘 ══
//   단면: 평면 진행 방향의 수직 폭 1.25 · 연직 아래 1.25 · 위 물림 0.5(웹 살 속).
export function buildVaultRibs(A = bridgeVaultSpec()) {
  if (!A.on) return null
  const { n, bay, w2, seg, surf, rib, sink, bayX0 } = A
  const hw = rib / 2
  return quadGeo((q) => {
    for (let k = 0; k < n; k++) {
      const cx = bayX0(k) + bay / 2
      for (const m of [1, -1]) {                  // 두 대각(거울)
        //  진행 방향(평면)과 그 수직 — 대각선은 직선이라 상수
        const dx = bay / 2, dz = m * w2
        const L = Math.hypot(dx, dz)
        const px = -dz / L * hw, pz = dx / L * hw
        //  ⚠단면은 주행 연직면 안에서 곡선 **수직**으로(횡단 아치와 같은 근거 — 발 종잇장 금지).
        //   s = 평면 주행 거리, y′ = dy/ds 유한차분. 법선 성분: 연직 ny = 1/√(1+y′²) ·
        //   주행 방향 후퇴 ns = −y′/√(1+y′²) (u 방향으로 투영).
        const st = []
        const ux = dx / L, uz = dz / L
        for (let i = 0; i <= seg; i++) {
          const t = -1 + 2 * i / seg
          const x = cx + t * dx, z = t * dz
          const yS = surf(x, z)
          const tp = Math.min(1, t + 1 / seg), tm = Math.max(-1, t - 1 / seg)
          const yp = (surf(cx + tp * dx, tp * dz) - surf(cx + tm * dx, tm * dz)) / ((tp - tm) * L)
          const nl = Math.hypot(yp, 1)
          const ns = -yp / nl, ny = 1 / nl
          st.push({
            xT: x + ns * ux * sink, zT: z + ns * uz * sink, yT: yS + ny * sink,
            xB: x - ns * ux * rib, zB: z - ns * uz * rib, yB: yS - ny * rib,
          })
        }
        for (let i = 0; i < seg; i++) {
          const a = st[i], b = st[i + 1]
          const A4 = [a.xT + px, a.yT, a.zT + pz], B4 = [b.xT + px, b.yT, b.zT + pz]
          const C4 = [b.xT - px, b.yT, b.zT - pz], D4 = [a.xT - px, a.yT, a.zT - pz]
          const A0 = [a.xB + px, a.yB, a.zB + pz], B0 = [b.xB + px, b.yB, b.zB + pz]
          const C0 = [b.xB - px, b.yB, b.zB - pz], D0 = [a.xB - px, a.yB, a.zB - pz]
          q(A4, B4, C4, D4)                       // 윗면
          q(A0, D0, C0, B0)                       // 밑면
          q(A4, A0, B0, B4)                       // +측
          q(D4, C4, C0, D0)                       // −측
        }
        //  끝 단면 둘(모서리 발 — 기둥 머리 부근 살 속)
        const s0 = st[0], s1 = st[seg]
        q([s0.xT + px, s0.yT, s0.zT + pz], [s0.xT - px, s0.yT, s0.zT - pz],
          [s0.xB - px, s0.yB, s0.zB - pz], [s0.xB + px, s0.yB, s0.zB + pz])
        q([s1.xT + px, s1.yT, s1.zT + pz], [s1.xB + px, s1.yB, s1.zB + pz],
          [s1.xB - px, s1.yB, s1.zB - pz], [s1.xT - px, s1.yT, s1.zT - pz])
      }
    }
  })
}

//  ══ ⑤ 벽앞 기둥 — 데크 위 y127 → 스프링 139. 샤프트 경계(13)는 생략(spec.omitted 선언) ══
export function buildVaultColumns(A = bridgeVaultSpec()) {
  if (!A.on || !A.columns.length) return null
  return quadGeo((q) => {
    for (const c of A.columns) box(q, c.x0, c.x1, BRD_YW, A.spr, c.z0, c.z1)
  })
}

//  ══ ⑥ 첨탑 대역 상향 ⓚ′ — 세그 스냅 호 셸(안·밖·양끝·위·아래 = 닫힌 솔리드) ══
//   스테이션 = 첨탑 lathe와 같은 각(±3세그 · 3.75° 간격) → 밑변 정점이 벽 정점과 일치(T-접합 0).
export function buildSpireBand(A = bridgeVaultSpec()) {
  const B = A.band
  //  ★150: 볼트가 꺼져도 대역은 산다(BRD_BAND_ON 파생) — 사다리꼴 관도 서단 입 덮개로 재사용
  if (!B.on) return null
  const st = []
  for (let k = -B.segs; k <= B.segs; k++) st.push(k * B.segW)
  const P = (r, az, y) => [r * Math.cos(az), y, r * Math.sin(az)]
  return quadGeo((q) => {
    for (let i = 0; i < st.length - 1; i++) {
      const a0 = st[i], a1 = st[i + 1]
      q(P(B.rOut, a0, B.y0), P(B.rOut, a0, B.y1), P(B.rOut, a1, B.y1), P(B.rOut, a1, B.y0))  // 밖
      q(P(B.rIn, a0, B.y0), P(B.rIn, a1, B.y0), P(B.rIn, a1, B.y1), P(B.rIn, a0, B.y1))      // 안
      q(P(B.rIn, a0, B.y1), P(B.rIn, a1, B.y1), P(B.rOut, a1, B.y1), P(B.rOut, a0, B.y1))    // 위(호 띠)
      q(P(B.rIn, a0, B.y0), P(B.rOut, a0, B.y0), P(B.rOut, a1, B.y0), P(B.rIn, a1, B.y0))    // 아래(살 속)
    }
    const e0 = st[0], e1 = st[st.length - 1]
    q(P(B.rIn, e0, B.y0), P(B.rIn, e0, B.y1), P(B.rOut, e0, B.y1), P(B.rOut, e0, B.y0))      // 끝면(날개 옆)
    q(P(B.rIn, e1, B.y0), P(B.rOut, e1, B.y0), P(B.rOut, e1, B.y1), P(B.rIn, e1, B.y1))
  })
}

//  ══ 파츠 목록 — Room.jsx가 이걸 부른다(전부 solid: 밟는 면 없음) ══
export function buildBridgeVaultParts() {
  if (!BRD_VLT_ON) return null
  const A = bridgeVaultSpec()
  const webs = buildVaultWebs(A), bands = buildVaultBands(A)
  const ribs = buildVaultRibs(A), cols = buildVaultColumns(A)
  const band = buildSpireBand(A)
  return {
    spec: A,
    solid: [
      ...(webs ? [{ id: '볼트웹', geo: webs }] : []),
      ...(bands ? [{ id: '횡단아치', geo: bands }] : []),
      ...(ribs ? [{ id: '대각리브', geo: ribs }] : []),
      ...(cols ? [{ id: '벽앞기둥', geo: cols }] : []),
      ...(band ? [{ id: '첨탑대역', geo: band }] : []),
    ],
  }
}
