//  ══════════════════════════════════════════════════════════════════════════
//   ★★★147-g 갓 서쪽 처마 — 문제 하나, 해법 두 벌 (2026.08.19)
//
//   ⛔v1 살(EAVE · 아래 gatEaveSpec/buildGatEave · 소등): 처마 밑 렌즈 프리즘. 현도 4차 판정에서 반려 —
//    "다리가 드럼 통로에 파묻힌 것 같은 비주얼. 아케이드가 침범당한다." 덩어리를 더 키운 셈이었다.
//    ⚠부재끼리 교차는 0이었다(노치가 |z|≤4.525를 비움) — 문제는 **겹쳐 보임**: 데크는 처마 위를 넘는데
//    (밑 125.50 vs 처마 최고 124.15) 아케이드(115.30~125.50)는 처마와 **같은 높이대**라 처마가 앞을 가린다.
//   ★v2 절단+벽 상향(CUT · gatCutSpec · 현행): 현도 확정 ⓑ. 상세는 gatCutSpec 주석.
//
//   ── 이하 v1 원 헤더(보존계 문서) ──
//
//   현도: *"옆에서 보았을 때 아주 종잇장처럼 느껴지고, 지금 다리에 파고든 것처럼 보이지?
//    이 문제를 해결해야 해. 드럼 통로의 옆부분인 원기둥과 천장에 틈이 생기지 않는 선에서."*
//   현도 확정: **ⓑ 서쪽 방위 대역만 살**(ⓐ 전 고리 = 리브 구멍에서 소매 재현 · ⓒ 패싯 증가 = '각기둥 느낌' 훼손).
//   두께·끝면 형태 = **현도가 Claude에게 위임**(⚠규율 12 — 아래 값들은 전부 Claude 판단이다. 노브 한 줄로 뒤집힌다).
//
//   ── 왜 종잇장이었나(실측) ──
//   갓 = 두께 0 면. 바깥 10각형이 벽 원에 **외접**하므로 꼭짓점 방위에서 벽보다 4.32 바깥까지 나오고,
//   그 끝은 벽 top보다 2.06 아래로 처진다. **다리 방위 180°가 정확히 그 최대 돌출 꼭짓점**이다.
//   ⚠그리고 같은 자리에 **쐐기 주머니**가 있었다: 벽 원(r84) 위에서 갓 표면이 벽 top보다 **2.97 위**다
//    (꼭짓점 최대 · 접점 0). 갓이 비스듬해 밖에서 새지는 않지만, 벽과 천장이 **안 닿는다**.
//
//   ── 이 부재가 하는 일 ──
//   ① 처마 끝에 **끝면**을 준다(종잇장 소멸) ② 그 쐐기 주머니를 **메운다**(현도 조건 '틈 0').
//   범위 = 180° 꼭짓점을 낀 **렌즈**(접점 162° ↔ 198° — 돌출이 0에서 4.32로 부풀었다 다시 0이 되는 구간).
//   ★끝이 접점에서 폭 0으로 **스스로 닫힌다** → 잘린 끝면이 없다(그루터기 0).
//
//   ── 파생 사슬(새 숫자 0) ──
//   · 두께 `GAT_EAVE_T = GAT_LID_T`(3.5 — 갓 자신의 판 두께). **하한 = 쐐기 주머니 최대 2.97**을 넘어야
//     주머니가 닫힌다(검사가 이 부등식을 박는다). 3.5는 그 하한을 0.53 넘긴 첫 in-family 값이다.
//   · 안쪽 반경 = `COR_R·cos(π/COR_WALL_SEG)`(벽 다각형 **최소** 반경) → 어느 방위에서도 벽 살에 닿는다(규율 ⑦).
//   · 바깥 = 갓 다각형 변(접선) 그대로 · 윗면 = **갓 삼각형의 평면 그대로**(렌즈는 전부 (o0,o1,i1) 삼각형 안에 있다).
//   · 다리 대역은 `ceilNotchSpec().hz`로 **비운다** — 끝면이 아케이드 벽 살 속(3.90~5.15)에서 끝난다.
//  ══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import {
  GAT_EAVE_ON, GAT_EAVE_T, GAT_FACETS, GAT_CROWN_R, GAT_CX, GAT_SEAT,
  GAT_CUT_ON,
  COR_R, COR_CX, COR_WALL_SEG, PIER_TOP_OVER, ceilY,
} from './constants.js'
import { gatSeal } from './corridorStairsGeometry.js'
import { ceilNotchSpec } from './bridgeDeckGeometry.js'

//  ── 갓 표면 = 패싯의 바깥 삼각형 (o0, o1, i1) 평면. 렌즈는 전부 이 삼각형 안이다 ──
//   ★★★161: `bridgeTrapGeometry`가 **관 갓의 절단면**으로 이 평면을 읽는다(정본 하나 — ★144 규칙).
//    ⚠임포트 방향: bridgeTrap → gatEave → bridgeDeck → constants. 역방향 금지(순환).
export function gatPlane() {
  const seat = GAT_SEAT === 'pier' ? PIER_TOP_OVER : 0
  const seal = gatSeal()
  const F = GAT_FACETS, rOut = COR_R / Math.cos(Math.PI / F)
  const PO = (t) => [COR_CX + rOut * Math.cos(t), ceilY(COR_CX + rOut * Math.cos(t)) + seat, rOut * Math.sin(t)]
  const PI_ = (t) => [GAT_CX + GAT_CROWN_R * Math.cos(t), seal.baseY, GAT_CROWN_R * Math.sin(t)]
  //  다리 쪽 패싯 = 방위 [π−2π/F, π] (거울 절반이 나머지를 맡는다)
  const t0 = Math.PI - 2 * Math.PI / F, t1 = Math.PI
  const A = PO(t0), B = PO(t1), C = PI_(t1)
  //  평면 y = a·x + b·z + c (세 점으로 결정 — 갓 삼각형과 **같은 평면**)
  const d1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]
  const d2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
  const n = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]]
  //  n·(P−A)=0 → y = A.y − (n.x(x−A.x) + n.z(z−A.z)) / n.y
  return (x, z) => A[1] - (n[0] * (x - A[0]) + n[2] * (z - A[2])) / n[1]
}

//  ══ ★★★147-g v2 — 절단 + 벽 상향 (현도 확정 ⓑ · 2026.08.19 4차) ══
//   갓의 벽-밖 돌출을 다리 대역에서 **잘라내고**, 그 대역의 벽을 갓 표면까지 **올린다**.
//   ★'틈 0'의 새 근거 = **공유 에지**: 절단선과 벽 새 top이 **같은 두 평면의 교선**이다
//    (벽 세그 수직 평면 ∩ 갓 패싯 평면). 두 평면이 선형이므로 세그 경계 정점을 공유하면 전 구간 일치.
//   ★대역 = 벽 세그 경계 스냅: z≥0 절반에서 세그 43~47(161.25°~180°) — 접점 162°가 세그 경계가 아니라서
//    (162/3.75 = 43.2) 경계 43(161.25°)로 내렸다. 초과분의 절단량 0.052 · 상향 0.005 = 사실상 0으로 소멸(그루터기 0).
//    거울(z<0)이 180°~198.75°를 맡는다 — 갓·벽 다 z 거울 대칭이라 절반 정의로 충분하다.
//   ★surf(x,z) = 다리 패싯(방위 144~180°)의 평면을 (x,|z|)로 평가 — 패싯 4·5가 z 거울쌍이므로 하나로 통일.
export function gatCutSpec() {
  const segW = 2 * Math.PI / COR_WALL_SEG
  const F = GAT_FACETS
  const azTan = Math.PI - Math.PI / F                  // 접점 162°
  const segA = Math.floor(azTan / segW)                // 43 — 대역 첫 세그(경계 스냅)
  const segB = COR_WALL_SEG / 2                        // 48 — z≥0 절반의 끝(=180°)
  const chord = COR_R * Math.cos(Math.PI / COR_WALL_SEG)  // 83.955 — 세그 현의 중심 거리
  const surfHalf = gatPlane()
  const surf = (x, z) => surfHalf(x, Math.abs(z))
  //  세그 i의 현-바깥 부호함수(≥0 = 벽 밖) · 방위 반평면 부호함수(≥0 = az ≥ θ, 대역이 반원 안이라 유효)
  const segOut = (i) => { const tm = (i + 0.5) * segW, c = Math.cos(tm), sn = Math.sin(tm)
    return (P) => (P[0] - COR_CX) * c + P[2] * sn - chord }
  const azGE = (th) => { const c = Math.cos(th), sn = Math.sin(th)
    return (P) => c * P[2] - sn * (P[0] - COR_CX) }
  return { on: GAT_CUT_ON, segA, segB, segW, chord, azTan, surf, segOut, azGE }
}

export function gatEaveSpec() {
  const F = GAT_FACETS
  const rOut = COR_R / Math.cos(Math.PI / F)          // 88.323 — 꼭짓점 반경
  const rIn = COR_R * Math.cos(Math.PI / COR_WALL_SEG) // 83.955 — 벽 다각형 최소 반경(규율 ⑦)
  const azV = Math.PI                                  // 다리 방위 꼭짓점
  const halfF = Math.PI / F                            // 꼭짓점 ↔ 접점 18°
  const azTan = azV - halfF                            // 162° 접점(+z 쪽)
  const N = ceilNotchSpec()
  //  다리 대역은 비운다 — 안쪽 반경에서 |z| = hz가 되는 방위까지만 짓는다(끝면이 아케이드 벽 살 속에 든다)
  const cutHalf = N.on ? Math.asin(Math.min(1, N.hz / rIn)) : 0
  const azEnd = azV - cutHalf
  const surf = gatPlane()
  //  분할 = 벽 다각형 반각(π/COR_WALL_SEG) 기준 — 안쪽 변이 벽 면을 그대로 좇는다
  const span = azEnd - azTan
  const n = Math.max(2, Math.round(span / (Math.PI / COR_WALL_SEG)))
  const stations = []
  for (let i = 0; i <= n; i++) {
    const az = azTan + span * (i / n)
    const rE = COR_R / Math.cos(az - azTan)            // 접선 변 위의 반경
    const P = (r) => [COR_CX + r * Math.cos(az), r * Math.sin(az)]
    const [xi, zi] = P(rIn), [xe, ze] = P(rE)
    stations.push({ az, rIn, rE, xi, zi, xe, ze,
      yTopIn: surf(xi, zi), yTopEx: surf(xe, ze), width: rE - rIn })
  }
  //  쐐기 주머니(벽 top ↔ 갓) 최대 — 두께 하한의 근거
  let pocket = 0
  for (const s of stations) pocket = Math.max(pocket, s.yTopIn - ceilY(s.xi))
  return { on: GAT_EAVE_ON, t: GAT_EAVE_T, rIn, rOut, azTan, azV, azEnd, cutHalf, n, stations, pocket, surf }
}

//  ── 살 = 렌즈 프리즘. 윗면 = 갓 평면 · 밑면 = 그 −T · 안쪽 = 벽 면 · 바깥 = 접선 변의 수직 끝면 ──
//   ⚠+z 절반만 만들고 거울 복사한다(좌우 대칭을 구조적으로 보장 — 갓 본체와 같은 수법).
export function buildGatEave() {
  const S = gatEaveSpec()
  if (!S.on) return null
  //  ⚠★147-g 자기 적발: `orientOutward`는 **인덱스 없는 지오메트리를 그대로 되돌려준다**(조기 return).
  //   비인덱스로 만들었다가 감김이 안 잡혀 부호 부피가 음수로 나왔다(검사가 아니라 프로브가 잡았다).
  //   → `quadGeo` 어법과 같이 **인덱스**로 만든다. 도구를 쓰려면 도구가 요구하는 형식을 지켜야 한다.
  const tri = []
  const push = (a, b, c) => tri.push([a, b, c])
  const quad = (a, b, c, d) => { push(a, b, c); push(a, c, d) }
  const T = S.t
  for (let i = 0; i + 1 < S.stations.length; i++) {
    const A = S.stations[i], B = S.stations[i + 1]
    //  네 모서리(윗면) / 그 밑 −T
    const AiT = [A.xi, A.yTopIn, A.zi], AeT = [A.xe, A.yTopEx, A.ze]
    const BiT = [B.xi, B.yTopIn, B.zi], BeT = [B.xe, B.yTopEx, B.ze]
    const AiB = [A.xi, A.yTopIn - T, A.zi], AeB = [A.xe, A.yTopEx - T, A.ze]
    const BiB = [B.xi, B.yTopIn - T, B.zi], BeB = [B.xe, B.yTopEx - T, B.ze]
    quad(AiT, AeT, BeT, BiT)      // 윗면(갓 평면과 공면)
    quad(AiB, BiB, BeB, AeB)      // 밑면(소핏)
    quad(AeT, AeB, BeB, BeT)      // 바깥 끝면(수직 — 종잇장을 죽이는 면)
    quad(AiT, BiT, BiB, AiB)      // 안쪽 면(벽에 붙는다)
    if (i === 0) quad(AiT, AiB, AeB, AeT)                                   // 접점 쪽 마구리(폭 0.045)
    if (i + 2 === S.stations.length) quad(BiT, BeT, BeB, BiB)               // 다리 쪽 마구리(아케이드 벽 살 속)
  }
  //  거울 복사(−z)
  const all = tri.slice()
  for (const t of tri) { const m = t.map(v => [v[0], v[1], -v[2]]); all.push([m[0], m[2], m[1]]) }
  const pos = new Float32Array(all.length * 9)
  const idx = new Array(all.length * 3)
  let k = 0
  for (let i = 0; i < all.length; i++) {
    for (const v of all[i]) { pos[k++] = v[0]; pos[k++] = v[1]; pos[k++] = v[2] }
    idx[3 * i] = 3 * i; idx[3 * i + 1] = 3 * i + 1; idx[3 * i + 2] = 3 * i + 2
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return orientOutward(g)
}
