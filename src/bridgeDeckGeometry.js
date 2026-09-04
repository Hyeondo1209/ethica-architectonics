//  ══════════════════════════════════════════════════════════════════════════
//   ★★★147 접속 통로 — 테라스(y127) → ★54 월대(y101.30) · 방위 0°
//   (2026.08.19 현도 스케치 실측 + 합의 도면 + z 위젯 확정)
//
//   ★147-a 산출물 = **걸어서 통과되는 동선**: 관(민짜 측벽) · 기둥 · 직각나선 · 직선 계단.
//    -b = 양면 아케이드 8베이(측벽 교체) · -c = 서·동 아치 + 개구 셋 + 빗천장 컷 마감.
//
//   ⚠규율(DESIGN.md §1 말미):
//    · 좌표 하드코딩 0 — 전부 constants 파생. 이 파일에 리터럴 치수가 있으면 그건 버그다.
//    · 감김은 손으로 맞추지 않는다 → 전 빌더가 `orientOutward`를 통과한다(규율 9).
//    · 구멍 뚫린 판은 **구멍 바깥 띠 상자들**로 분해한다 — 각 조각이 그 자체로 닫힌 육면체라
//      watertight가 조각별로 보장되고, 리빌(구멍 측면)이 저절로 생긴다. 겹침 0·틈 0.
//    · 빌더와 검사는 **같은 spec 배열**을 읽는다(★144 규칙) — 사본 금지.
//  ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import {
  BRD_ON, BRD_HW, BRD_PIER_HW, BRD_STAIR_HW, BRD_SPI_W, BRD_T,
  BRD_CLEAR, BRD_PORT_W, BRD_SIDE,
  BRD_YW, BRD_DECK_BOT, BRD_ROOF_BOT, BRD_ROOF_TOP,
  BRD_X0, BRD_DECK_E, BRD_ROOF_E, ceilXAt,
  BRD_PX0, BRD_PX1, BRD_PIER_FOOT, BRD_PIER_HEAD, BRD_PORT_TOP,
  BRD_SPI_Y1, BRD_SPI_MIDX0, BRD_SPI_MIDX1, BRD_SPI_MIDZ, BRD_SPI_LOOP,
  BRD_SPI_TURNS, BRD_SPI_N, BRD_SPI_RISE, BRD_SPI_GOING, BRD_SPI_SLAB,
  BRD_STAIR_X0, BRD_STAIR_Y0, BRD_STAIR_X1, BRD_STAIR_Y1,
  BRD_STAIR_N, BRD_STAIR_RISE, BRD_STAIR_GOING, BRD_STAIR_SLAB,
  //  ★147-b 아케이드
  BRD_ARC_ON, BRD_ARC_Y0, BRD_ARC_APEX, BRD_ARC_O, BRD_ARC_NW, BRD_ARC_NE,
  BRD_ARC_E, BRD_ARC_TOP, BRD_ARC_BAYW, BRD_ARC_BAYE, BRD_ARC_RW, BRD_ARC_RE,
  BRD_ARC_SPRW, BRD_ARC_SPRE, BRD_ARC_SEG, BRD_ARC_MASS,
  //  ★147-c 큰 아치(노브만 — 파생은 bridgeArchSpec이 계산한다)
  BRA_ON, BRA_H, BRA_T, BRA_HW, BRA_WT, BRA_SEG, BRA_SPAN_ON, BRA_MASS, BRD_ARC_FLR,
  BRD_SPI_ON, BRD_STAIR_ON, BRD_VLT_ON,
  BRD_VLT_OPEN, BRD_VLT_CAP_X, BRD_VLT_CAP_K, BRD_VLT_SEG, brdVaultTopY, BRD_TRP_ON, BRD_TRP_NOTCH_TOP, BRD_TRP_NOTCH_BANDS,
  BRD_SFT_ON, BRD_SFT_W, BRD_SFT_TURNS, COR_CYL_X0, ROOM_STAIR_RISE, ROOM_STAIR_SLAB, BRD_SFT_TOPSINK,
  BRD_SFT_HAND, BRD_SFT_LAND_ON, BRD_SFT_LAND_Z,
  BRD_EAST, BRD_EAST_X, BRD_CEIL_LAP, BRD_SFT_DOOR_ON, DESC_HW,
} from './constants.js'
import { bridgeSpec } from './bridgeComplexGeometry.js'
import { spireSpec } from './spireGeometry.js'
import { woldaeSpec, descentSpec } from './corridorStairsGeometry.js'

//  ── 공용 쿼드 빌더(도메인 관례 — 감김은 orientOutward가 보증) ──
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

//  ── 축평행 육면체 한 덩이 ──
//   ⚠**퇴화 가드**(2026.08.19 ★147-a 적발): 어느 축이든 폭이 0 이하면 **아무것도 만들지 않는다**.
//    퇴화 상자를 그대로 흘리면 `orientOutward`가 법선 없는 면을 임의 방향으로 정렬해
//    **없는 부피를 만들어낸다**(실측: 폭 0 띠 하나가 87.66을 지어냄 — 해석 부피 대조가 잡았다).
//    폭 0은 오류가 아니라 정상 상황이다(계단 출구 개구가 기둥 내부 전폭을 차지하면 옆 띠가 소멸한다).
function box(q, x0, x1, y0, y1, z0, z1) {
  if (!(x1 - x0 > 0) || !(y1 - y0 > 0) || !(z1 - z0 > 0)) return
  const P = [
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],   // 0..3 밑
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],   // 4..7 위
  ]
  q(P[0], P[1], P[2], P[3])   // 밑면
  q(P[4], P[7], P[6], P[5])   // 윗면
  q(P[0], P[4], P[5], P[1])   // z0
  q(P[3], P[2], P[6], P[7])   // z1
  q(P[0], P[3], P[7], P[4])   // x0
  q(P[1], P[5], P[6], P[2])   // x1
}

//  ── 동쪽 끝이 y에 따라 밀리는 프리즘(드럼 빗천장 컷 — ⑦ 확정) ──
//   서단은 수직, 동단은 ceilXAt(y)를 따라 기울어진다. 밑/위 두 y에서 각각 x를 받는다.
function boxSlantE(q, x0, y0, y1, z0, z1, xE0, xE1) {
  if (!(y1 - y0 > 0) || !(z1 - z0 > 0) || !(xE0 - x0 > 0) || !(xE1 - x0 > 0)) return
  const P = [
    [x0, y0, z0], [xE0, y0, z0], [xE0, y0, z1], [x0, y0, z1],
    [x0, y1, z0], [xE1, y1, z0], [xE1, y1, z1], [x0, y1, z1],
  ]
  q(P[0], P[1], P[2], P[3])
  q(P[4], P[7], P[6], P[5])
  q(P[0], P[4], P[5], P[1])
  q(P[3], P[2], P[6], P[7])
  q(P[0], P[3], P[7], P[4])
  q(P[1], P[5], P[6], P[2])   // 동쪽 사면
}

//  ══ ① 정본 스펙 — 빌더도 검사도 이것만 읽는다 ══
export function bridgeDeckSpec() {
  //  기둥 내부(벽 안쪽) 사각 — 데크판 구멍·나선이 여기서 나온다
  const inX0 = BRD_PX0 + BRD_T, inX1 = BRD_PX1 - BRD_T
  const inZ = BRD_PIER_HW - BRD_T
  //  회랑 옥상 관통 개구(x 범위) — 기둥 중심 대칭
  const pcx = (BRD_PX0 + BRD_PX1) / 2
  const port = { x0: pcx - BRD_PORT_W / 2, x1: pcx + BRD_PORT_W / 2, top: BRD_PORT_TOP }
  //  계단 출구 개구(기둥 동면).
  //   ⚠**선언된 충돌 1**: W3(3.00) > W2−T(2.75) — 계단이 기둥 **내부보다 0.25씩 넓다**.
  //    벽 안쪽 면보다 넓은 개구는 기하적으로 뚫을 자리가 없으므로 개구를 내부 폭으로 **클램프**한다.
  //    결과: 계단 전폭 6.00 중 5.50만 문으로 드러나고 양쪽 0.25는 벽 뒤로 들어간다(보행 지장 없음).
  //    ⚠이건 Claude의 기하 처리이지 설계 변경이 아니다 — 현도 판정 대상(W3를 2.75로 내리거나
  //     기둥을 넓히면 클램프가 저절로 풀린다. `clamped` 플래그를 검사가 읽는다).
  const ezRaw = BRD_STAIR_HW, ez = Math.min(ezRaw, inZ)
  //   하단 = 계단 **매스 밑면**(디딤 밑까지) — 여기를 나선 끝 높이로 두면 계단 첫 단이 벽에 막힌다.
  const exit = {
    z0: -ez, z1: ez, y0: BRD_STAIR_Y0 - BRD_STAIR_SLAB, y1: BRD_SPI_Y1 + BRD_CLEAR,
    clamped: ezRaw > inZ, clampBy: Math.max(0, ezRaw - inZ),
  }

  //  ── 나선 30단: 중심선 사각을 s로 순회한다. 서변 중앙에서 시작 → 1.5바퀴 → 동변 중앙 종료.
  //   ⚠ 이 배열이 정본이다. 빌더도 검사도 이걸 읽는다(사본 금지).
  const steps = []
  const s0 = spiralS0()
  for (let k = 1; k <= BRD_SPI_N; k++) {
    const sMid = s0 + (k - 0.5) * BRD_SPI_GOING          // 디딤 중앙의 호 좌표
    const c = spiralAt(sMid)
    steps.push({
      k, s: sMid, cx: c.x, cz: c.z, dir: c.dir,
      yTop: BRD_YW - BRD_SPI_RISE * k,                    // 디딤 윗면
    })
  }

  //  ── 계단 43단 ──
  const sSteps = []
  for (let k = 1; k <= BRD_STAIR_N; k++) {
    sSteps.push({
      k,
      x0: BRD_STAIR_X0 + (k - 1) * BRD_STAIR_GOING,
      x1: BRD_STAIR_X0 + k * BRD_STAIR_GOING,
      yTop: BRD_STAIR_Y0 - BRD_STAIR_RISE * k,
    })
  }

  return {
    on: BRD_ON, side: BRD_SIDE,
    hw: BRD_HW, t: BRD_T,
    x0: BRD_X0, deckE: BRD_DECK_E, roofE: BRD_ROOF_E,
    yWalk: BRD_YW, yDeckBot: BRD_DECK_BOT, yRoofBot: BRD_ROOF_BOT, yRoofTop: BRD_ROOF_TOP,
    pier: {
      x0: BRD_PX0, x1: BRD_PX1, hw: BRD_PIER_HW,
      foot: BRD_PIER_FOOT, head: BRD_PIER_HEAD,
      inX0, inX1, inZ, port, exit,
    },
    //  ⚠s0·sEnd를 spec에 넣는다 — 검사가 이 값을 **재도출하면** 정본과 갈릴 수 있다(★144 규칙).
    spiral: { n: BRD_SPI_N, rise: BRD_SPI_RISE, going: BRD_SPI_GOING, w: BRD_SPI_W,
              loop: BRD_SPI_LOOP, turns: BRD_SPI_TURNS, y1: BRD_SPI_Y1, slab: BRD_SPI_SLAB,
              s0, sEnd: s0 + BRD_SPI_TURNS * BRD_SPI_LOOP, steps },
    stair: { n: BRD_STAIR_N, rise: BRD_STAIR_RISE, going: BRD_STAIR_GOING, hw: BRD_STAIR_HW,
             x0: BRD_STAIR_X0, x1: BRD_STAIR_X1, y0: BRD_STAIR_Y0, y1: BRD_STAIR_Y1,
             slab: BRD_STAIR_SLAB, steps: sSteps },
  }
}

//  ── 나선 중심선 사각 위의 호 좌표 s → (x, z) + 진행 방향 ──
//   변 순서: 서변(−z→+z) → 북변(+z에서 x 증가) → 동변(+z→−z) → 남변(x 감소). 둘레 = BRD_SPI_LOOP.
//   ⚠ 시작이 **서변 중앙**이어야 한다(통로가 서쪽에서 온다) → s0 = 서변 절반.
const sideX = () => BRD_SPI_MIDX1 - BRD_SPI_MIDX0     // 사각 x 변 길이
const sideZ = () => 2 * BRD_SPI_MIDZ                  // 사각 z 변 길이
function spiralS0() { return sideZ() / 2 }            // 서변 중앙

export function spiralAt(s) {
  const LX = sideX(), LZ = sideZ(), L = BRD_SPI_LOOP
  let u = ((s % L) + L) % L
  if (u < LZ) return { x: BRD_SPI_MIDX0, z: -BRD_SPI_MIDZ + u, dir: 'z+' }
  u -= LZ
  if (u < LX) return { x: BRD_SPI_MIDX0 + u, z: BRD_SPI_MIDZ, dir: 'x+' }
  u -= LX
  if (u < LZ) return { x: BRD_SPI_MIDX1, z: BRD_SPI_MIDZ - u, dir: 'z-' }
  u -= LZ
  return { x: BRD_SPI_MIDX1 - u, z: -BRD_SPI_MIDZ, dir: 'x-' }
}

//  ══ ② 관 — 데크판(구멍 있음) + 측벽 둘 + 지붕판 ══
//   ⚠ 데크판 구멍 = 기둥 내부 사각. 나선이 이 구멍으로 내려간다.
export function buildBridgeDeck(A = bridgeDeckSpec()) {
  const { hw, x0, yDeckBot, yWalk } = A
  const { inX0, inX1, inZ } = A.pier
  const xEb = ceilXAt(yDeckBot), xEt = ceilXAt(yWalk)
  //  ★★★147-f ②: 'portal' 체제면 동단은 **수직 절단**이다(천장을 관통해 드럼 안에서 끝난다).
  //   'ceilcut'(구 -a)면 종전대로 빗천장 면을 따라 잘린다. 조각 생성은 한 함수로 갈린다.
  const PORTAL = BRD_EAST === 'portal'
  const eastPiece = (q, xa, y0, y1, za, zb) =>
    PORTAL ? box(q, xa, BRD_EAST_X, y0, y1, za, zb)
           : boxSlantE(q, xa, y0, y1, za, zb, ceilXAt(y0), ceilXAt(y1))
  //  ⚠나선이 소등되면 데크 구멍은 **함정**이 된다 → 통짜 판으로 덮는다(현도 판정 2차).
  if (!BRD_SPI_ON) {
    //  ⚠샤프트가 켜지면 그 자리에 **구멍**이 있어야 나선이 내려간다(없으면 막힌 바닥).
    if (!BRD_SFT_ON) return quadGeo((q) => { eastPiece(q, x0, yDeckBot, yWalk, -hw, hw) })
    const S = shaftSpec()
    return quadGeo((q) => {
      box(q, x0, S.inX0, yDeckBot, yWalk, -hw, hw)                        // 구멍 서쪽
      eastPiece(q, S.inX1, yDeckBot, yWalk, -hw, hw)                      // 구멍 동쪽(→ 전망대 바닥)
      // ⚠inX1 < 동단 이므로 이 조각이 실제로 생긴다(틀 x1 = 밑면 컷 파생의 귀결)
      box(q, S.inX0, S.inX1, yDeckBot, yWalk, -hw, -S.inZ)                // 남 띠
      box(q, S.inX0, S.inX1, yDeckBot, yWalk, S.inZ, hw)                  // 북 띠
    })
  }
  return quadGeo((q) => {
    //  서 띠 (구멍 서쪽)
    box(q, x0, inX0, yDeckBot, yWalk, -hw, hw)
    //  동 띠 (구멍 동쪽 → 전망대 바닥 / 구 체제면 빗천장 컷)
    eastPiece(q, inX1, yDeckBot, yWalk, -hw, hw)
    //  남·북 띠 (구멍 옆)
    box(q, inX0, inX1, yDeckBot, yWalk, -hw, -inZ)
    box(q, inX0, inX1, yDeckBot, yWalk, inZ, hw)
  })
}

//  측벽 — ★147-a는 민짜('solid'). -b에서 아케이드로 교체(BRD_SIDE 한 줄).
export function buildBridgeSides(A = bridgeDeckSpec()) {
  if (BRD_TRP_ON) return null          // ★150: 사다리꼴 빌더가 외피 담당 — 직사각 측벽 미생성
  if (A.side !== 'solid') return null
  const { hw, t, x0, yWalk, yRoofBot } = A
  const xEb = ceilXAt(yWalk), xEt = ceilXAt(yRoofBot)
  //  ★'portal'이면 측벽도 데크와 **같은 x**에서 수직으로 끊긴다 → 개구 = 데크 끝 × 내부고 7.00의 직사각.
  //   ⚠구 'ceilcut'은 측벽이 빗천장을 따라 130.50~145.20으로 비스듬히 잘렸다(쐐기의 정체).
  //  ★★★149: 개방 체제면 **서쪽 구간 벽 윗변이 볼트 인트라도스를 따라간다**(brdVaultTopY 정본).
  //   x 스테이션 = 베이당 BRD_VLT_SEG — 웹 격자와 같은 분할이라 두 면의 모서리가 정확히 만난다.
  //   ⛔**칸별 상자 금지**(2026.08.20 자가 적발): 칸을 이어 붙이면 맞닿은 내부면이 중복돼
  //    `orientOutward`가 없는 부피를 지어낸다(해석 5021 vs 메시 531593 — 부피 대조가 잡았다.
  //    ★147-a 퇴화 상자 87.66과 같은 계열). → **닫힌 스윕 프리즘 하나**로 짓는다.
  return quadGeo((q) => {
    for (const [za, zb] of [[-hw, -hw + t], [hw - t, hw]]) {
      if (BRD_VLT_ON && BRD_VLT_OPEN) {
        const nx = BRD_VLT_CAP_K * BRD_VLT_SEG
        const xs = [], ys = []
        for (let i = 0; i <= nx; i++) {
          const x = x0 + (BRD_VLT_CAP_X - x0) * i / nx
          xs.push(x); ys.push(brdVaultTopY(x))
        }
        const yS = ys[nx]                      // 단차 밑 = 캡 경계의 마루(= 스프링, 경계이므로)
        //  ⓐ 개방 구간: 칸마다 볼벽(za·zb) + 밑면 + 윗면
        for (let i = 0; i < nx; i++) {
          const xa = xs[i], xb2 = xs[i + 1], ya = ys[i], yb2 = ys[i + 1]
          q([xa, yWalk, za], [xa, ya, za], [xb2, yb2, za], [xb2, yWalk, za])           // 볼벽 za
          q([xa, yWalk, zb], [xb2, yWalk, zb], [xb2, yb2, zb], [xa, ya, zb])           // 볼벽 zb
          q([xa, yWalk, za], [xb2, yWalk, za], [xb2, yWalk, zb], [xa, yWalk, zb])      // 밑면
          q([xa, ya, za], [xb2, yb2, za], [xb2, yb2, zb], [xa, ya, zb])                // 윗면(마루 추종)
        }
        //  ⓑ 캡 구간 = 상자 **하나**. 쪼개는 것은 볼벽·동단뿐 — 안 쪼개면 단차 양쪽 세로 변이 1:2로
        //    어긋나 T-접합이 난다(에지 12건). ⚠단 yS에 **가로면을 두면 안 된다**: 내부면이 중복돼
        //    없는 부피를 지어낸다(실측 12126 vs 해석 5014 — 같은 세션에서 두 번째로 밟은 함정).
        const xC = BRD_VLT_CAP_X, xE = BRD_EAST_X
        for (const [yl, yh] of [[yWalk, yS], [yS, yRoofBot]]) {
          q([xC, yl, za], [xC, yh, za], [xE, yh, za], [xE, yl, za])                    // 볼벽 za
          q([xC, yl, zb], [xE, yl, zb], [xE, yh, zb], [xC, yh, zb])                    // 볼벽 zb
          q([xE, yl, zb], [xE, yh, zb], [xE, yh, za], [xE, yl, za])                    // 동 마구리
        }
        q([xC, yWalk, za], [xE, yWalk, za], [xE, yWalk, zb], [xC, yWalk, zb])          // 밑면(통짜)
        q([xC, yRoofBot, za], [xC, yRoofBot, zb], [xE, yRoofBot, zb], [xE, yRoofBot, za])  // 윗면(통짜)
        //  ⓒ 마구리 둘: 서단 · 단차 수직면
        q([x0, yWalk, za], [x0, ys[0], za], [x0, ys[0], zb], [x0, yWalk, zb])
        q([xC, yS, za], [xC, yRoofBot, za], [xC, yRoofBot, zb], [xC, yS, zb])
      } else if (BRD_EAST === 'portal') box(q, x0, BRD_EAST_X, yWalk, yRoofBot, za, zb)
      else boxSlantE(q, x0, yWalk, yRoofBot, za, zb, xEb, xEt)
    }
  })
}

export function buildBridgeRoof(A = bridgeDeckSpec()) {
  if (BRD_TRP_ON) return null          // ★150: 갓이 지붕 — 판 미생성
  const { hw, x0, yRoofBot, yRoofTop } = A
  //  ★★★148: 볼트 체제의 동단 = 포털면 수직 컷(데크·측벽과 동일). 구 빗천장 컷(ceilXAt)은
  //   상향 후 처마가 2.8 → 24.8로 폭주하고, 근거였던 ceilY 모델은 ★147-f에서 폐기됐다.
  //   BRD_VLT_ON=false면 구 빗천장 컷 그대로(보존계).
  return quadGeo((q) => {
    if (BRD_VLT_ON && BRD_VLT_OPEN) box(q, BRD_VLT_CAP_X, BRD_EAST_X, yRoofBot, yRoofTop, -hw, hw)
    else if (BRD_VLT_ON) box(q, x0, BRD_EAST_X, yRoofBot, yRoofTop, -hw, hw)
    else boxSlantE(q, x0, yRoofBot, yRoofTop, -hw, hw, ceilXAt(yRoofBot), ceilXAt(yRoofTop))
  })
}

//  ══ ③ 기둥 — 네 벽. z 양면에 회랑 관통 개구, 동면에 계단 출구 개구 ══
export function buildBridgePier(A = bridgeDeckSpec()) {
  const P = A.pier, t = A.t
  const { x0, x1, hw, foot, head, port, exit } = P
  return quadGeo((q) => {
    //  ── z = −hw 벽(두께 t 안쪽으로) : 관통 개구가 바닥까지 뚫려 있어 아래 띠 없음 ──
    for (const [za, zb] of [[-hw, -hw + t], [hw - t, hw]]) {
      box(q, x0, port.x0, foot, head, za, zb)            // 서 띠
      box(q, port.x1, x1, foot, head, za, zb)            // 동 띠
      box(q, port.x0, port.x1, port.top, head, za, zb)   // 개구 위 띠
    }
    //  ── 서면 벽(통짜 — 진입은 데크판 구멍으로 한다) ──
    box(q, x0, x0 + t, foot, head, -hw + t, hw - t)
    //  ── 동면 벽 : 계단 출구 개구 ──
    const xa = x1 - t, xb = x1
    if (BRD_STAIR_ON) {
      box(q, xa, xb, foot, head, -hw + t, exit.z0)       // 남 띠
      box(q, xa, xb, foot, head, exit.z1, hw - t)        // 북 띠
      box(q, xa, xb, foot, exit.y0, exit.z0, exit.z1)    // 개구 아래 띠
      box(q, xa, xb, exit.y1, head, exit.z0, exit.z1)    // 개구 위 띠
    } else box(q, xa, xb, foot, head, -hw + t, hw - t)   // ⛔계단 소등 → 통짜 동면
  })
}

//  ══ ④ 직각나선 — 낱장 디딤판 30장(방 내벽 나선 어법 승계) ══
export function buildBridgeSpiral(A = bridgeDeckSpec()) {
  if (!BRD_SPI_ON) return null
  const S = A.spiral, w = S.w, half = w / 2, g = S.going / 2
  return quadGeo((q) => {
    for (const st of S.steps) {
      //  진행 방향이 x축이면 디딤은 x로 going·z로 w, z축이면 반대
      const alongX = st.dir === 'x+' || st.dir === 'x-'
      const x0 = alongX ? st.cx - g : st.cx - half
      const x1 = alongX ? st.cx + g : st.cx + half
      const z0 = alongX ? st.cz - half : st.cz - g
      const z1 = alongX ? st.cz + half : st.cz + g
      box(q, x0, x1, st.yTop - S.slab, st.yTop, z0, z1)
    }
  })
}

//  ══ ⑤ 직선 계단 — 디딤 43단 + 밑을 받는 경사 매스 ══
export function buildBridgeStair(A = bridgeDeckSpec()) {
  if (!BRD_STAIR_ON) return null
  const S = A.stair, hw = S.hw
  return quadGeo((q) => {
    for (const st of S.steps) box(q, st.x0, st.x1, st.yTop - S.rise, st.yTop, -hw, hw)
    //  밑면 경사 매스 — 디딤 코를 잇는 사면 아래 두께 slab(연직). 계단이 공중에 뜨지 않게.
    const yA0 = S.y0 - S.slab, yA1 = S.y1 - S.slab
    const P = [
      [S.x0, S.y0, -hw], [S.x1, S.y1, -hw], [S.x1, yA1, -hw], [S.x0, yA0, -hw],
      [S.x0, S.y0, hw], [S.x1, S.y1, hw], [S.x1, yA1, hw], [S.x0, yA0, hw],
    ]
    q(P[0], P[1], P[2], P[3])
    q(P[4], P[7], P[6], P[5])
    q(P[0], P[3], P[7], P[4])
    q(P[1], P[5], P[6], P[2])
    q(P[0], P[4], P[5], P[1])
    q(P[3], P[2], P[6], P[7])
  })
}


//  ══ ⑤-b ★147-b 양면 아케이드 — 데크 **아래**에 매달려 관을 떠받친다 ══
//   ⚠-a 오독 정정: 이것은 측벽(y127~134)의 교체가 아니라 **별개 층**(y115.30~125.50)이다.
//   ★어법 = ★145 회랑 아케이드 승계: 발 → spring까지 **수직 문설주**, 그 위 **반원**.
//    (현도 ⓑ 확정 — 3안 중 실측 잔차는 가장 크지만 기존 어휘와의 정합을 골랐다.)
//   ★정점은 서·동 공통(BRD_ARC_APEX)이고 반지름은 베이 파생이라 **spring 높이가 베이별로 갈린다**.
export function arcadeBaySpec() {
  //  ⚠이 배열이 정본이다 — 빌더도 검사도 이것만 읽는다(사본 금지 · ★144 규칙).
  const bays = []
  const push = (x0, bay, R, spr, side) => {
    const wOp = 2 * R, uL = x0 + (bay - wOp) / 2, uR = uL + wOp
    bays.push({ side, x0, x1: x0 + bay, bay, wOp, R, cx: (uL + uR) / 2,
                uL, uR, springY: BRD_ARC_Y0 + spr, apex: BRD_ARC_Y0 + spr + R })
  }
  for (let b = 0; b < BRD_ARC_NW; b++) push(BRD_X0 + b * BRD_ARC_BAYW, BRD_ARC_BAYW, BRD_ARC_RW, BRD_ARC_SPRW, 'W')
  for (let b = 0; b < BRD_ARC_NE; b++) push(BRD_PX1 + b * BRD_ARC_BAYE, BRD_ARC_BAYE, BRD_ARC_RE, BRD_ARC_SPRE, 'E')
  return bays
}

//  벽 살의 **아래 경계** yBot(x) 스테이션 사슬. 피어에서는 발(Y0), 개구에서는 아치 인트라도스.
//   ⚠문설주(수직 리빌)는 **같은 x의 이중 스테이션**으로 낸다(★145 어법) — 사슬 하나로 네 면을 다 짠다.
export function arcadeStations(bays, x0, x1) {
  const st = [[x0, BRD_ARC_Y0]]
  for (const B of bays) {
    st.push([B.uL, BRD_ARC_Y0])          // 피어 끝
    st.push([B.uL, B.springY])           // ↑ 수직 리빌(이중 스테이션)
    for (let i = 1; i < BRD_ARC_SEG; i++) {
      const t = i / BRD_ARC_SEG, x = B.uL + t * B.wOp
      st.push([x, B.springY + Math.sqrt(Math.max(0, B.R * B.R - (x - B.cx) ** 2))])
    }
    st.push([B.uR, B.springY])
    st.push([B.uR, BRD_ARC_Y0])          // ↓ 수직 리빌
  }
  st.push([x1, BRD_ARC_Y0])
  return st
}

//  한 구간(서 또는 동)의 벽 한 장 — 옆면 둘(폴리곤 삼각화) + 인트라도스 스트립 + 상단·끝 캡.
//   ⚠**T-접합 적발(2026.08.19)**: 옆면을 사다리꼴 스트립으로 짜면 문설주에서 `yBot`이 Y0→springY로
//    점프하는데 이웃 쿼드의 수직 변에는 그 중간점이 **정점으로 없다** → 에지 일관성 위반 1008.
//    → 옆면을 **닫힌 폴리곤 하나로 모아 삼각화**한다. 경계 정점이 전부 사슬 정점이라 T-접합이 원천 소멸한다.
function arcadeSlab(q, tri, st, zA, zB) {
  const T = BRD_ARC_TOP
  //  ── 옆면 폴리곤: 아래 경계(사슬) → 오른쪽 끝 위 → 상단(역순) ──
  const poly = st.map(([x, y]) => new THREE.Vector2(x, y))
  poly.push(new THREE.Vector2(st[st.length - 1][0], T))
  poly.push(new THREE.Vector2(st[0][0], T))
  const faces = THREE.ShapeUtils.triangulateShape(poly, [])
  const P = poly.map(v => [v.x, v.y])
  for (const [i, j, k] of faces) {
    tri([P[i][0], P[i][1], zB], [P[j][0], P[j][1], zB], [P[k][0], P[k][1], zB])   // 바깥면
    tri([P[k][0], P[k][1], zA], [P[j][0], P[j][1], zA], [P[i][0], P[i][1], zA])   // 안쪽면
  }
  //  ── 인트라도스 · 문설주 리빌(사슬을 따라가는 스트립) ──
  for (let i = 0; i < st.length - 1; i++) {
    const [xa, ya] = st[i], [xb, yb] = st[i + 1]
    if (Math.abs(xb - xa) < 1e-12 && Math.abs(yb - ya) < 1e-12) continue
    q([xa, ya, zA], [xb, yb, zA], [xb, yb, zB], [xa, ya, zB])
  }
  //  ── 상단 캡 · 끝 캡 둘 ──
  const e0 = st[0], e1 = st[st.length - 1]
  q([e0[0], T, zA], [e0[0], T, zB], [e1[0], T, zB], [e1[0], T, zA])
  q([e0[0], e0[1], zA], [e0[0], e0[1], zB], [e0[0], T, zB], [e0[0], T, zA])
  q([e1[0], e1[1], zB], [e1[0], e1[1], zA], [e1[0], T, zA], [e1[0], T, zB])
}

export function buildBridgeArcade() {
  if (!BRD_ON || !BRD_ARC_ON) return null
  const bays = arcadeBaySpec()
  const stW = arcadeStations(bays.filter(b => b.side === 'W'), BRD_X0, BRD_PX0)
  const stE = arcadeStations(bays.filter(b => b.side === 'E'), BRD_PX1, BRD_ARC_E)
  //  ★★★147-h(현도 5차): 'solid'면 **한 덩어리**로 짠다 — 같은 사슬, z대역만 바뀐다.
  //   판 둘의 바깥면을 그대로 이어 두께 2·HW(10.30). 개구는 그 깊이를 **관통**하므로 두꺼운 아치가 된다.
  const zBands = BRD_ARC_MASS === 'solid'
    ? [[-BRD_HW, BRD_HW]]
    : [[BRD_HW - BRD_T, BRD_HW], [-BRD_HW, -BRD_HW + BRD_T]]
  return quadGeo((q, tri) => {
    for (const st of [stW, stE]) for (const [zA, zB] of zBands) arcadeSlab(q, tri, st, zA, zB)
  })
}


//  ══ ⑦ ★★★147-c 큰 아치 3기 — ★133 기둥과 접속 기둥을 교각 삼는다 ══
//   ②③ = 반원(두 발 같은 높이 → 반지름 = 스팬/2, 파생)
//   ①  = **정점 공유 비대칭 아치**: 동쪽 호(R1 = R2 — 현도 "②와 같게") + 서쪽 호(r)
//        두 호가 정점에서 접선 수평을 공유하고 **양쪽으로 내려간다**(둘 다 위로 볼록).
//        ★r은 노브가 아니다 — "서쪽 발이 첨탑 아래 외벽에 닿는다"가 r을 정한다.
export function bridgeArchSpec() {
  const B = bridgeSpec(), S = spireSpec(), W = woldaeSpec()
  const p1a = B.xL0, p1b = B.xL1                      // ★133 기둥 두 면(정본 — bbox 유도 금지)
  const woldW = W.contour.reduce((m, q) => Math.min(m, q.x), Infinity)   // 월대 서단
  const H = BRA_H
  const R2 = (BRD_PX0 - p1b) / 2                      // ② 반원
  const R3 = (woldW - BRD_PX1) / 2                    // ③ 반원
  const R1 = R2                                       // ① 동쪽 호 = ②와 같게(현도)
  const apex = { x: p1a - R1, y: H + R1 }
  const r = apex.x - S.rCyl                           // ★파생: 서쪽 발이 첨탑 아래 외벽에 닿는 조건
  const wFoot = { x: S.rCyl, y: apex.y - r }
  return {
    on: BRA_ON, H, t: BRA_T, hw: BRA_HW, wt: BRA_WT, seg: BRA_SEG,
    p1a, p1b, woldW, rCyl: S.rCyl,
    a1: { kind: 'twin', eFoot: { x: p1a, y: H }, apex, R1, r, wFoot },
    a2: { kind: 'semi', x0: p1b, x1: BRD_PX0, y: H, R: R2, cx: (p1b + BRD_PX0) / 2 },
    a3: { kind: 'semi', x0: BRD_PX1, x1: woldW, y: H, R: R3, cx: (BRD_PX1 + woldW) / 2 },
  }
}

//  중심선 폴리라인 — 서쪽 발 → 정점 → 동쪽 발 순서(x 오름차순이 아님에 주의: ①은 서→동)
export function archCenterline(A, n = BRA_SEG) {
  if (A.kind === 'semi') {
    const P = []
    for (let i = 0; i <= 2 * n; i++) { const th = Math.PI - Math.PI * i / (2 * n)
      P.push([A.cx + A.R * Math.cos(th), A.y + A.R * Math.sin(th)]) }
    return P
  }
  const P = []
  //  서쪽 호: 중심 (apex.x, apex.y − r) · 서쪽 발(θ=π, 접선 수직) → 정점(θ=π/2, 접선 수평)
  for (let i = 0; i <= n; i++) { const th = Math.PI - (Math.PI / 2) * i / n
    P.push([A.apex.x + A.r * Math.cos(th), (A.apex.y - A.r) + A.r * Math.sin(th)]) }
  //  동쪽 호: 중심 (apex.x, H) · 정점(θ=π/2) → 동쪽 발(θ=0, 접선 수직)
  for (let i = 1; i <= n; i++) { const th = (Math.PI / 2) * (1 - i / n)
    P.push([A.apex.x + A.R1 * Math.cos(th), A.eFoot.y + A.R1 * Math.sin(th)]) }
  return P
}

//  아치 한 기의 벽 한 장 — 중심선 ±t/2 폴리곤 삼각화 + 인트라도스·엑스트라도스 스트립 + 끝 캡.
//   ⚠아케이드에서 겪은 T-접합을 피하려고 여기서도 **닫힌 폴리곤 하나**로 옆면을 만든다.
function archSlab(q, tri, C, t, zA, zB) {
  const n = C.normals
  const poly = []
  for (let i = 0; i < C.pts.length; i++) poly.push([C.pts[i][0] + n[i][0] * t / 2, C.pts[i][1] + n[i][1] * t / 2])
  for (let i = C.pts.length - 1; i >= 0; i--) poly.push([C.pts[i][0] - n[i][0] * t / 2, C.pts[i][1] - n[i][1] * t / 2])
  const v2 = poly.map(p => new THREE.Vector2(p[0], p[1]))
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(v2, [])) {
    tri([poly[i][0], poly[i][1], zB], [poly[j][0], poly[j][1], zB], [poly[k][0], poly[k][1], zB])
    tri([poly[k][0], poly[k][1], zA], [poly[j][0], poly[j][1], zA], [poly[i][0], poly[i][1], zA])
  }
  //  둘레 스트립(엑스트라도스 → 끝 캡 → 인트라도스 → 끝 캡) — 폴리곤 경계를 그대로 돈다
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    if (Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12) continue
    q([a[0], a[1], zA], [b[0], b[1], zA], [b[0], b[1], zB], [a[0], a[1], zB])
  }
}

//  중심선 + 각 점의 법선(단위) — 살 두께를 곡선에 직교로 붙인다
function centerlineWithNormals(A, seg) {
  const pts = archCenterline(A, seg), normals = []
  for (let i = 0; i < pts.length; i++) {
    const p = pts[Math.max(0, i - 1)], q2 = pts[Math.min(pts.length - 1, i + 1)]
    const dx = q2[0] - p[0], dy = q2[1] - p[1], L = Math.hypot(dx, dy) || 1
    normals.push([-dy / L, dx / L])          // 좌법선(중심선 진행 방향 기준 위쪽)
  }
  return { pts, normals }
}

//  ★147-i 살 z대역 정본 — 아치도 스팬드럴도 **이것만** 읽는다(사본 금지 · ★144 규칙)
export function braZBands() {
  return BRA_MASS === 'solid'
    ? [[-BRA_HW, BRA_HW]]
    : [[BRA_HW - BRA_WT, BRA_HW], [-BRA_HW, -BRA_HW + BRA_WT]]
}

export function buildBridgeArches() {
  if (!BRD_ON || !BRA_ON) return null
  const A = bridgeArchSpec()
  const Cs = [A.a1, A.a2, A.a3].map(a => centerlineWithNormals(a, A.seg))
  //  ★★★147-i(현도 6차 · 가역 시험): 'solid'면 한 덩어리 — 같은 중심선·같은 살두께, z대역만 바뀐다.
  return quadGeo((q, tri) => {
    for (const C of Cs) for (const [zA, zB] of braZBands()) archSlab(q, tri, C, A.t, zA, zB)
  })
}


//  ══ ⑦-b 스팬드럴 — 아치 위 빈 공간을 아케이드 바닥판 밑까지 채운다 ══
//   (현도 로컬 판정: "아치는 위의 빈공간이 채워져야 한다 — 지금은 테두리만 있음")
//   ★상단 = 아케이드 바닥판 **밑면**. 좌우 = 각 아치의 두 발 x(교각 면).
//   ⚠아치 살과 t/2 겹치게 둔다 — 인트라도스는 그대로 드러나고, 겹침은 같은 재료라 무해하다.
//  ★★★147-f ④ 파급: 월대 서단이 벽까지 물러나며 ③ 아치 스팬이 1.26 늘어 엑스트라도스가 0.63 올라왔다
//   (114.08 → 114.71). 구 두께 1.00은 아치를 0.41 뚫는다 → **바닥판 두께를 파생으로 돌린다**:
//   "아치 위에 남는 만큼, 상한은 벽 두께" = min(BRD_ARC_FLR, 하현 − 엑스트라도스 최고). 손 수치 0.
//   ⚠얇아지는 방향이므로 §2-D 종잇장 하한을 검사가 지킨다(현 값 0.590 — 현도 판정 대상).
export function arcadeFloorT() {
  const A = bridgeArchSpec()
  const ext = Math.max(A.a1.apex.y, A.a2.y + A.a2.R, A.a3.y + A.a3.R) + A.t / 2
  return Math.min(BRD_ARC_FLR, BRD_ARC_Y0 - ext)
}
export function spandrelTop() { return BRD_ARC_Y0 - arcadeFloorT() }

export function buildBridgeSpandrels() {
  if (!BRD_ON || !BRA_ON || !BRA_SPAN_ON) return null
  const A = bridgeArchSpec(), top = spandrelTop()
  return quadGeo((q, tri) => {
    for (const a of [A.a1, A.a2, A.a3]) {
      const P = archCenterline(a, A.seg)
      const poly = P.map(p => [p[0], p[1]])
      poly.push([P[P.length - 1][0], top], [P[0][0], top])
      const v2 = poly.map(p => new THREE.Vector2(p[0], p[1]))
      const faces = THREE.ShapeUtils.triangulateShape(v2, [])
      for (const [zA, zB] of braZBands()) {
        for (const [i, j, k] of faces) {
          tri([poly[i][0], poly[i][1], zB], [poly[j][0], poly[j][1], zB], [poly[k][0], poly[k][1], zB])
          tri([poly[k][0], poly[k][1], zA], [poly[j][0], poly[j][1], zA], [poly[i][0], poly[i][1], zA])
        }
        for (let i = 0; i < poly.length; i++) {
          const u = poly[i], w = poly[(i + 1) % poly.length]
          if (Math.abs(u[0] - w[0]) < 1e-12 && Math.abs(u[1] - w[1]) < 1e-12) continue
          q([u[0], u[1], zA], [w[0], w[1], zA], [w[0], w[1], zB], [u[0], u[1], zB])
        }
      }
    }
  })
}

//  ══ ⑤-c 아케이드 바닥판 — 아케이드 벽 두 장을 받치는 판(관 전폭) ══
//   (현도 로컬 판정: "아케이드 부분은 바닥 부분이 아직 없는데?")
//   상면 = 아케이드 하현 BRD_ARC_Y0 **항등**(벽이 이 판 위에 선다).
export function buildArcadeFloor() {
  if (!BRD_ON || !BRD_ARC_ON) return null
  return quadGeo((q) => {
    box(q, BRD_X0, BRD_ARC_E, spandrelTop(), BRD_ARC_Y0, -BRD_HW, BRD_HW)
  })
}


//  ══ ⑧ ★★★147-e 월대 샤프트 — 직육면체 틀 + 그 속 직각나선 ══
//   ★위상: 전망대(관이 드럼 안에서 끝나는 자리)가 도착지 · 월대는 **참**이 된다(현도).
export function shaftSpec() {
  const W = woldaeSpec()
  //  ⚠**자가 적발**: 처음엔 x1을 `ceilXAt(BRD_YW)`(130.50)로 잡았는데 그건 보행면 컷이고,
  //   데크 **밑면** 컷은 `ceilXAt(BRD_DECK_BOT)`(127.35)이다 → 틀 동벽이 받쳐지지 않는 자리에 섰다
  //   (데크판 부피 검사가 5.02 차이로 적발). 서단도 드럼 벽(120)이 아니라 **월대 서단**까지 쓴다.
  const x0 = W.contour.reduce((m, q) => Math.min(m, q.x), Infinity)   // 월대 서단 119
  const x1 = ceilXAt(BRD_DECK_BOT)                                     // 데크 밑면 빗천장 컷 127.35
  const hw = BRD_HW, t = BRD_T
  const y0 = W.yTop, y1 = BRD_YW                    // 월대 상면 → 전망대 보행면
  const inX0 = x0 + t, inX1 = x1 - t, inZ = hw - t
  const drop = y1 - y0
  const n = Math.round(drop / ROOM_STAIR_RISE)
  const rise = drop / n
  //  중심선 사각 = 내부 − 답면 폭/2
  const mx0 = inX0 + BRD_SFT_W / 2, mx1 = inX1 - BRD_SFT_W / 2, mz = inZ - BRD_SFT_W / 2
  const loop = 2 * ((mx1 - mx0) + 2 * mz)
  const going = BRD_SFT_TURNS * loop / n
  //  s → (x, z): 서변 → 북/남변 → 동변 → 남/북변. s0 = 서변 중앙(전망대가 서쪽에서 온다).
  //  ★★★160: `mir`는 z를 통째로 뒤집는 **거울**이다. 경로 길이·모서리 s·단 배분은 거울에 불변이므로
  //   73단·2.5바퀴·답면·하단 도착 x가 전부 그대로다(바뀌는 것은 도는 손 방향과 z 부호뿐).
  const mir = BRD_SFT_HAND === 'ccw' ? -1 : 1
  const at = (s) => {
    const LX = mx1 - mx0, LZ = 2 * mz, L = loop
    let u = ((s % L) + L) % L
    if (u < LZ) return { x: mx0, z: mir * (-mz + u), dir: mir > 0 ? 'z+' : 'z-' }
    u -= LZ
    if (u < LX) return { x: mx0 + u, z: mir * mz, dir: 'x+' }
    u -= LX
    if (u < LZ) return { x: mx1, z: mir * (mz - u), dir: mir > 0 ? 'z-' : 'z+' }
    u -= LZ
    return { x: mx1 - u, z: mir * -mz, dir: 'x-' }
  }
  const s0 = mz          // 서변 중앙
  //  ★★★147-f ①(2026.08.19 현도: "직각나선 코너에 정사각형 참 — 방향 전환이 부자연스럽다"):
  //   나열을 **직선 구간 + 코너 참**으로 재편한다. 참 = 중심선 사각의 모서리에 놓인 한 변 `w`의 정사각형
  //   (= 답면 폭과 같은 변 — 새 숫자 0). 참은 경로를 따라 `w`(모서리 앞뒤 w/2씩)를 먹고, **한 단**을 차지한다
  //   (걸어 올라서서 방향을 바꾸는 자리). 남은 길이를 디딤들이 나눠 갖는다.
  //   ⚠단수 n은 그대로다(리듬 = ROOM_STAIR_RISE) — 바뀌는 것은 **그 n을 무엇이 나눠 갖는가**뿐이다.
  const cornerS = []
  for (let c = 0; ; c++) {                       // 모서리 s = 0, LZ, LZ+LX, 2LZ+LX, … (loop 주기)
    const base = Math.floor(c / 2) * (2 * mz + (mx1 - mx0)) + (c % 2 ? 2 * mz : 0)
    void base
    break
  }
  {
    const LX = mx1 - mx0, LZ = 2 * mz
    const marks = [0, LZ, LZ + LX, 2 * LZ + LX]  // 한 바퀴 안의 모서리 네 곳
    for (let turn = 0; turn <= Math.ceil(BRD_SFT_TURNS) + 1; turn++)
      for (const m of marks) { const sv = m + turn * loop; if (sv > s0 + 1e-9 && sv < s0 + BRD_SFT_TURNS * loop - 1e-9) cornerS.push(sv) }
    cornerS.sort((a, b) => a - b)
  }
  const bounds = [s0, ...cornerS, s0 + BRD_SFT_TURNS * loop]
  //  구간별 '디딤이 쓸 수 있는 길이' = 구간 길이 − 양 끝 참이 먹는 w/2
  const usable = []
  for (let i = 0; i + 1 < bounds.length; i++) {
    const isC0 = i > 0, isC1 = i + 2 < bounds.length
    usable.push((bounds[i + 1] - bounds[i]) - (isC0 ? BRD_SFT_W / 2 : 0) - (isC1 ? BRD_SFT_W / 2 : 0))
  }
  const nLand = cornerS.length
  const nTread = n - nLand
  const totUse = usable.reduce((a, b) => a + b, 0)
  //  구간별 디딤 수 = 누적 비례 배분(합이 정확히 nTread)
  const perSeg = []
  { let acc = 0, placed = 0
    for (let i = 0; i < usable.length; i++) {
      acc += usable[i]
      const target = i === usable.length - 1 ? nTread : Math.round(acc / totUse * nTread)
      perSeg.push(target - placed); placed = target
    } }
  const steps = []
  let k = 0
  for (let i = 0; i < usable.length; i++) {
    const sA = bounds[i] + (i > 0 ? BRD_SFT_W / 2 : 0)
    const g = perSeg[i] > 0 ? usable[i] / perSeg[i] : 0
    for (let j = 0; j < perSeg[i]; j++) {
      const c = at(sA + (j + 0.5) * g); k++
      steps.push({ k, kind: 'tread', cx: c.x, cz: c.z, dir: c.dir, going: g, yTop: y1 - rise * k })
    }
    if (i + 2 < bounds.length) {                 // 이 구간 끝에 모서리 참
      const c = at(bounds[i + 1]); k++
      steps.push({ k, kind: 'landing', cx: c.x, cz: c.z, dir: c.dir, going: BRD_SFT_W, yTop: y1 - rise * k })
    }
  }
  //  ★★★147-f ③ 하단 출구(현도 판정 2차 ③: "샤프트 하단 출구가 없다 — 하강로가 동쪽으로 뻗으려면
  //   틀 벽을 뚫어야 한다"). ★위치·폭은 **하강로가 실제로 지나는 자리**에서 파생한다(손 수치 0):
  //   틀 바깥면 x1을 지나는 하강로 중심선의 z를 풀고, 거기에 하강로 반폭 DESC_HW를 더한다.
  //   높이 = `BRD_CLEAR`(관 내부고 7.00) 승계 — 같은 여정의 같은 통행 높이.
  let zCross = 0
  {
    const D = descentSpec()
    for (let i = 1; i < D.samples.length; i++) {
      const a = D.samples[i - 1], b = D.samples[i]
      if ((a.x - x1) * (b.x - x1) < 0) { const u = (x1 - a.x) / (b.x - a.x); zCross = a.z + u * (b.z - a.z); break }
    }
  }
  const doorHz = Math.min(inZ, DESC_HW + Math.abs(zCross))
  const door = BRD_SFT_DOOR_ON
    ? { hz: doorHz, y0, y1: y0 + BRD_CLEAR, zCross, clamped: DESC_HW + Math.abs(zCross) > inZ }
    : null
  //  ★★★160 ㄴ자 참 판 — 전부 파생(새 숫자 0):
  //   폭 = 답면 폭 · 두께 = 디딤판 두께 · 상면 = 전망대 보행면. 이 판은 곧 아주 큰 디딤판 한 장이다.
  //   ★poly는 (x, |z|)로 **CCW 고정**해 두고 방출할 때만 부호를 곱한다 — 그래야 LAND_Z를 뒤집어도
  //    삼각화가 퇴화하지 않는다(감김은 orientOutward가 보증).
  //   세로 획 = 초입(z 0) → 변(|z| = inZ) · 가로 획 = 그 변을 타고 동단 데크(x = inX1)까지.
  const lw = BRD_SFT_W
  const land = BRD_SFT_LAND_ON ? {
    on: true, w: lw, zSign: BRD_SFT_LAND_Z,
    yTop: y1, slab: ROOM_STAIR_SLAB, yBot: y1 - ROOM_STAIR_SLAB,
    x0: inX0, x1: inX1, xLeg: inX0 + lw,     // 세로 획 동단
    zNear: 0, zFar: inZ, zLeg: inZ - lw,     // 가로 획 남단(|z| 기준)
    poly: [[inX0, 0], [inX0 + lw, 0], [inX0 + lw, inZ - lw],
           [inX1, inZ - lw], [inX1, inZ], [inX0, inZ]],
    area: lw * inZ + (inX1 - inX0 - lw) * lw,
  } : null
  return { on: BRD_SFT_ON, x0, x1, hw, t, y0, y1, inX0, inX1, inZ, drop, n, rise, going,
           nLand, nTread, cornerS, perSeg, usable, hand: BRD_SFT_HAND, mir,
           loop, turns: BRD_SFT_TURNS, w: BRD_SFT_W, slab: ROOM_STAIR_SLAB,
           mx0, mx1, mz, s0, sEnd: s0 + BRD_SFT_TURNS * loop, at, steps, door, land }
}

//  ── ★★★160 ㄴ자 판 발자국(빌더·검사 공용 — 사본 금지, ★144 규칙) ──
//   한 단의 (x0,x1,z0,z1) 발자국. 나선 빌더가 쓰는 것과 **같은 산술**이다.
export function shaftStepFoot(S, st) {
  const aX = st.dir === 'x+' || st.dir === 'x-', h = S.w / 2
  const g = st.kind === 'landing' ? S.w / 2 : st.going / 2
  return aX ? [st.cx - g, st.cx + g, st.cz - h, st.cz + h]
            : [st.cx - h, st.cx + h, st.cz - g, st.cz + g]
}
//  판 발자국(부호 적용 후)과 겹치는 단들 중 **가장 높은 상면**. 없으면 −Infinity.
//   ⛔이것이 ★160의 핵심 가드다 — 구 감김이면 126.648이 나와 판 밑면 126.65와 0.002로 붙는다.
export function shaftLandTopUnder(S) {
  const L = S.land
  if (!L) return -Infinity
  const rects = [
    [L.x0, L.xLeg, 0, L.zFar],          // 세로 획
    [L.x0, L.x1, L.zLeg, L.zFar],       // 가로 획
  ].map(([a, b, c, d]) => L.zSign > 0 ? [a, b, c, d] : [a, b, -d, -c])
  let top = -Infinity
  for (const st of S.steps) {
    const [x0, x1, z0, z1] = shaftStepFoot(S, st)
    for (const [a, b, c, d] of rects)
      if (x0 < b - 1e-9 && x1 > a + 1e-9 && z0 < d - 1e-9 && z1 > c + 1e-9)
        top = Math.max(top, st.yTop)
  }
  return top
}

//  ══ ⑧-b ★★★147-f ② 드럼 빗천장 노치 — 관·샤프트가 지나는 만큼만 천장을 비운다 ══
//   ★정본은 여기 하나다 — `Corridor.jsx`(천장 빌더)도 `check_*`도 이 함수를 읽는다(사본 금지 · ★144 규칙).
//   ★네 변이 전부 **부재 살 속**에서 끝난다(규율 5 — 두께 0 면의 잘린 변은 반드시 덮는다):
//     서 = 샤프트 서벽 살 속 · 동 = 지붕판 살 속 · 남북 = 측벽/샤프트 벽 살 속.
//   ⚠따라서 노치 폭은 '관 외폭'이 아니라 **내부 유효폭 + 물림**이다(외폭으로 뚫으면 변이 노출된다).
//   ⛔⛔**Claude 자기 적발(2026.08.19 ★147-f)** — 노치를 x 구간으로 잡으려다 실측이 막았다:
//    **실제 천장은 `ceilY` 평면이 아니다.** `INTAKE_FORM='gat'`이므로 천장은 림(바깥 10각형, 그 변만
//    y=ceilY)에서 크라운(y192.38)까지 올라가는 **각뿔대**다. 방위 180°에서 실측:
//      x120 → y124.85 · x124 → 129.50 · x130.5 → 137.06 · x145 → 154.15   (ceilY 모델은 각각 122·123.9·127·134)
//    → ★147-a/-e가 "동단 = 빗천장 컷"·"머리 공간 음수"라 적은 것은 **평면 모델의 산물**이다.
//      현도가 본 증상(관이 지붕을 뚫고 나옴 · 밀봉 안 됨)은 사실이지만 원인은 달랐다:
//      관은 x**120.5~129.8**에서 진짜 천장을 관통하고, 그 동쪽은 이미 드럼 **안**이다.
//      -a의 절단면(ceilY 면)은 천장이 아닌 **허공에 뜬 평면**이라 관 끝이 드럼 안에서 열려 있었다.
//   ★그래서 노치는 x가 아니라 **관 단면**으로 정의한다 — 자르는 면이 전부 축평행 전역 평면이라
//    천장 기하가 무엇이든(각뿔대든 평면이든) 교차 구간이 **저절로** 나온다. 손 x값 0.
export function ceilNotchSpec() {
  const on = BRD_ON && BRD_EAST === 'portal'
  const S = shaftSpec()
  const lap = BRD_CEIL_LAP
  return {
    on,
    hz:  BRD_HW - lap,            // 4.525   — 잘린 변이 측벽(3.90~5.15) 살 속에서 끝난다
    yLo: BRD_DECK_BOT + lap,      // 126.125 — 데크판(125.50~127.00) 살 속
    //  ★150: yHi = 동결선(벽 중심선이 hz를 지나는 높이 135.651 — constants ★150 절). ROOF_TOP−lap을 쓰면
    //   좁아진 상부(±2.8)보다 노치가 넓어져 드럼에서 슬롯이 보인다(실측 2026.08.20). 다른 체제는 구식 그대로.
    yHi: BRD_TRP_ON ? BRD_TRP_NOTCH_TOP : BRD_ROOF_TOP - lap,
    //  ★★★152: 사다리꼴 체제면 **밴드**가 상자를 대체한다(단면 중심선 추종 — constants ★152 절).
    //   구 상자는 y127에서 3.903의 천장 살을 관 안에 남겼다(현도 사진의 그 쐐기).
    bands: BRD_TRP_ON ? BRD_TRP_NOTCH_BANDS : null,
    //  ⑤ 처마 몫 — ★147-f ⑤(현도 "드럼 천장↔아케이드 겹침이 밖에서 종잇장처럼 보인다").
    //   실측: 갓 바깥 10각형이 방위 180°에서 벽보다 **4.32 바깥**(x115.68)까지 나오고 y119.94~122로 처져
    //   **아케이드 대역(y115.30~125.50) 한복판을 두께 0 면이 가른다**. 관 밑도 사정이 같다.
    //   → 관/아케이드가 덮는 z 대역에서는 **데크 밑까지 통째로** 비운다. 서쪽 경계는 두지 않는다
    //     (천장 자체가 x115.68에서 끝나므로 새 잘린 변이 안 생긴다). 남는 잘린 변 = 아케이드 벽 살 속.
    //   ⚠이건 '덮개'가 아니라 **교차 자체의 제거**다 — 규율 5의 판을 대기 전에 먼저 볼 것이었다.
    well: BRD_SFT_ON ? { x1: S.inX1 + lap, yTop: BRD_DECK_BOT + lap } : null,
    lap,
  }
}

//  직육면체 틀 — 벽 넷(위는 데크 구멍으로 열리고, 아래는 월대 상면으로 열린다)
export function buildShaftFrame() {
  if (!BRD_ON || !BRD_SFT_ON) return null
  const S = shaftSpec()
  const D = S.door
  const yT = S.y1 - BRD_SFT_TOPSINK   //  ★212-f 벽 상단 = 데크 살 속(공면 파이팅 봉인 · 나선·참판 높이 불변)
  return quadGeo((q) => {
    box(q, S.x0, S.inX0, S.y0, yT, -S.hw, S.hw)                 // 서벽
    if (!D) box(q, S.inX1, S.x1, S.y0, yT, -S.hw, S.hw)         // 동벽(통짜 — 구 체제)
    else {                                                        // ★147-f ③ 동벽 = 문설주 둘 + 인방
      box(q, S.inX1, S.x1, S.y0, yT, -S.hw, -D.hz)              //   남 문설주
      box(q, S.inX1, S.x1, S.y0, yT, D.hz, S.hw)                //   북 문설주
      box(q, S.inX1, S.x1, D.y1, yT, -D.hz, D.hz)               //   인방 위
    }
    box(q, S.inX0, S.inX1, S.y0, yT, -S.hw, -S.inZ)             // 남벽
    box(q, S.inX0, S.inX1, S.y0, yT, S.inZ, S.hw)               // 북벽
  })
}

export function buildShaftSpiral() {
  if (!BRD_ON || !BRD_SFT_ON) return null
  const S = shaftSpec(), half = S.w / 2
  return quadGeo((q) => {
    for (const st of S.steps) {
      //  ★참은 정사각(w×w) · 디딤은 자기 구간의 going × w. 둘 다 중심선 위에 놓인다.
      const gx = st.kind === 'landing' ? half : (st.dir === 'x+' || st.dir === 'x-' ? st.going / 2 : half)
      const gz = st.kind === 'landing' ? half : (st.dir === 'x+' || st.dir === 'x-' ? half : st.going / 2)
      box(q, st.cx - gx, st.cx + gx, st.yTop - S.slab, st.yTop, st.cz - gz, st.cz + gz)
    }
  })
}

//  ══ ⑧-c ★★★160 ㄴ자 참 판 — 초입의 참 + 동단으로 건너가는 다리 ══
//   ⛔**상자 둘을 겹쳐 붙이지 않는다**(★149·★158 자책 계열): 맞닿은 내부면이 중복되면
//    `orientOutward`가 없는 부피를 지어낸다. → **닫힌 ㄴ 프리즘 하나**로 짓는다
//    (윗면·밑면 = 삼각화된 ㄴ · 옆면 = 여섯 변의 쿼드. 스팬드럴과 같은 어법).
export function buildShaftLanding() {
  if (!BRD_ON || !BRD_SFT_ON) return null
  const S = shaftSpec(), L = S.land
  if (!L) return null
  const sg = L.zSign
  return quadGeo((q, tri) => {
    const P = L.poly
    const v2 = P.map(p => new THREE.Vector2(p[0], p[1]))
    const faces = THREE.ShapeUtils.triangulateShape(v2, [])
    for (const [i, j, k] of faces) {
      tri([P[i][0], L.yTop, sg * P[i][1]], [P[j][0], L.yTop, sg * P[j][1]], [P[k][0], L.yTop, sg * P[k][1]])
      tri([P[k][0], L.yBot, sg * P[k][1]], [P[j][0], L.yBot, sg * P[j][1]], [P[i][0], L.yBot, sg * P[i][1]])
    }
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length]
      q([a[0], L.yBot, sg * a[1]], [b[0], L.yBot, sg * b[1]],
        [b[0], L.yTop, sg * b[1]], [a[0], L.yTop, sg * a[1]])
    }
  })
}

//  ══ ⑥ 묶음 ══
export function buildBridgeDeckParts() {
  if (!BRD_ON) return null
  const A = bridgeDeckSpec()
  const sides = buildBridgeSides(A)
  const arcade = buildBridgeArcade()
  const arches = buildBridgeArches()
  const spandrels = buildBridgeSpandrels()
  const arcFloor = buildArcadeFloor()
  const spi = buildBridgeSpiral(A), stair = buildBridgeStair(A)
  const sftF = buildShaftFrame(), sftS = buildShaftSpiral(), sftL = buildShaftLanding()
  return {
    spec: A,
    //  walk = 밟는 면(데크판 윗면 · 디딤판) · solid = 그 외
    walk: [
      { id: '데크판', geo: buildBridgeDeck(A) },
      ...(spi ? [{ id: '직각나선', geo: spi }] : []),
      ...(stair ? [{ id: '직선계단', geo: stair }] : []),
      ...(sftS ? [{ id: '월대나선', geo: sftS }] : []),
      ...(sftL ? [{ id: '샤프트참판', geo: sftL }] : []),
    ],
    solid: [
      ...(sides ? [{ id: '측벽', geo: sides }] : []),
      ...(arcade ? [{ id: '아케이드', geo: arcade }] : []),
      ...(arches ? [{ id: '큰아치', geo: arches }] : []),
      ...(spandrels ? [{ id: '스팬드럴', geo: spandrels }] : []),
      ...(arcFloor ? [{ id: '아케이드바닥판', geo: arcFloor }] : []),
      ...(sftF ? [{ id: '월대샤프트', geo: sftF }] : []),
      ...((r => r ? [{ id: '지붕판', geo: r }] : [])(buildBridgeRoof(A))),   // ★150: TRP면 null(갓이 지붕)
      { id: '기둥', geo: buildBridgePier(A) },
    ],
  }
}
