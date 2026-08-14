// upperPlatformGeometry.js — ★★★131 첨탑 새 층: 플랫폼 + 좌우 계단 2기
//  (2026.08.14 셋째 대화 · 현도 그림 + 리드백 도면 `platform_stairs_readback_knobs`에서 값 확정)
//
//  ★왜 층을 하나 더 두는가(규명 경위 — 다음 세션이 이 자리를 의심하지 않도록):
//   테라스(y127)에서 1p5 드럼으로 나가려면 방위 0°(+x)로 나가야 한다(진출 박스 = BOX_X0 54 · z±6).
//   그런데 ★130 접속 통로 4기는 셸 k → 첨탑 정방위 90°k 문으로 들어오고, **넷 다 놓기로 확정**(현도:
//   셸 사이 빈 공간을 채우고 대칭을 깨는 조형 목적)이라 0° 문이 반드시 나간다. 게다가 ① 통로는
//   진입 접선이 반경 방향(T1=[-1,0])이라 **+x 축 위에 누워** r21.85~40을 17.8 점유한다(실측:
//   x22~38에서 순 여유 −5.25~−0.60). 층으로도 못 피한다 — 통로 끝이 y125.50~132.12로 테라스와 같은 층.
//   → **한 층 올린다.** 통로 4기의 최고점이 정확히 y132.12에서 끝나므로, 그 위 층은 **방위 점유가 0**이고
//     막혔던 0° 문을 그대로 쓸 수 있다.
//
//  ★층 높이가 산술로 잠겨 있다(움직일 여지가 0.32뿐이었다):
//    바닥 밑면 하한 = 132.12(통로 4기 천장 위) · 천장 상한 = 138.02(첨탑 팔각 밑) → 틈 **5.90**.
//    통로 한 벌 규격(바닥 1.5 + 내부고 4.72 = 6.22)이 **0.32 초과**.
//    현도 확정 = **바닥을 얇게**(1.5 → 1.18, ⓛ) — 통로 4기는 무손상이고 서 있을 때가 넓다.
//    ⚠대가: §2-D 두께 위계('걷는 것' 1.5 매스 승계)를 **이 층만 깬다**. 선언된 비용.
//    천장 = **팔각 밑면을 그대로 쓴다**(판을 짓지 않는다 — 여유 0.00이라 판을 두면 공면 z-fighting).
//
//  ★새 층은 고리가 **아니다**(현도 08.14: "테라스처럼 원형이 아니라 통로 입구에만 있는 아주 작은
//   직사각형 플랫폼"). 고리 판이면 우물 단면의 71%를 덮지만 플랫폼+계단은 **5.8%**만 덮는다(실측).
//
//  ★상승 = 좌우 대칭 계단 2기(현도). 반경 방향 직선은 **기하가 막는다** — 상승 6.30을 계단으로 풀면
//   평면 길이 10.5~12.0인데 테라스 고리 폭은 9.70뿐이다(안으로 더 뻗으면 빛우물을 덮고 밖은 벽).
//   → 고리 둘레를 **감는다**. 두 기가 플랫폼 양 끝에 접선으로 닿는다.
//
//  ★현도 확정값(리드백 도면): 폭 7.6 · 깊이(=계단 폭) 2.8 · 단높이 0.300 · 디딤 0.50 · **벽에 붙임**
//    → 21단 · 걷는 선 31.0° · 한 기 30.7° · 끝 방위 ±41.8° · 90° 문까지 여유 41.9° · 옆 통행 6.90
//
//  ⚠사본 금지: 첨탑 좌표는 전부 `spireSpec()`·`wellWallR()` 파생. 테라스 레벨은 `SPT_Y` 파생.
//   층 높이를 정한 두 경계(통로 천장 132.12 · 팔각 밑 138.02)도 **정본에서 받는다** — 도수로 적어 넣지 않는다
//   (★130-g 교훈: 파생값을 반올림해 상수에 적으면 그 상수가 조건을 깬다).
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
import { linkSpec } from './linkPassageGeometry.js'
import {
  UPF_ON, UPF_T, UPF_W, UPF_D, UPF_RISE, UPF_TREAD, UPF_SIDE,
  UPF_SOFFIT, UPF_ST, UPF_EMB, UPF_SINK, UPF_SEG, UPF_HEAD_MIN,
  SPT_Y, SPT_R,
} from './constants.js'

export const UPF_SIDES = ['wall', 'mid', 'inner']
export const UPF_SOFFITS = ['ramp', 'saw', 'flat']

// ── 스펙(전부 파생 — 수치 하드코딩 금지) ──
export function upperPlatformSpec(opts = {}) {
  const S = opts.spec ?? spireSpec()
  const L = opts.link ?? linkSpec()
  //  ★층 바닥의 하한 = ★130 통로 천장 위(정본에서 받는다)
  const yUnder = L.y1 + L.h + L.wt
  //  ★층 천장의 상한 = 첨탑 팔각 밑(= L-턱 위 = spireSpec 정본)
  const yCeil = S.y1
  const t = opts.t ?? UPF_T
  const yWalk = yUnder + t                            // 걷는 면 = 바닥 밑면 + 두께(파생 — y를 직접 적지 않는다)
  const headroom = yCeil - yWalk                      // 머리 위(천장 = 팔각 밑면 그대로)

  //  내벽은 높이의 함수다(★129 하단 2단 확장) — 사본 금지
  const wallInAt = y => wellWallR(y, { spec: S, forceSpire: true }) - S.T
  const rWall = wallInAt(yWalk)                       // 걷는 면 높이의 내벽 = 21.00
  const d = opts.d ?? UPF_D
  const w = opts.w ?? UPF_W
  const side = opts.side ?? UPF_SIDE
  const rTerrIn = SPT_R                               // 테라스 구멍 = 안쪽 한계(넘으면 빛우물을 덮는다)

  //  반경대: 'wall' 벽에 붙임(현도 확정) / 'mid' 고리 가운데 / 'inner' 우물 쪽 — 뒤 둘은 보존계
  let ri, ro
  if (side === 'inner') { ri = rTerrIn; ro = rTerrIn + d }
  else if (side === 'mid') { const c = (rWall + rTerrIn) / 2; ri = c - d / 2; ro = c + d / 2 }
  else { ri = rWall - d; ro = rWall }                 // 'wall'
  const roEmb = side === 'wall' ? rWall + UPF_EMB : ro // 벽에 붙을 때만 벽 속으로 묻는다(틈 금지 — ★128 어휘)
  const rMid = (ri + ro) / 2

  //  상승·계단 산술(닫힌 식 — 표본 없음)
  const yTerr = opts.yTerr ?? SPT_Y
  const climb = yWalk - yTerr
  const rise0 = opts.rise ?? UPF_RISE
  const tread = opts.tread ?? UPF_TREAD
  //  ⛔부동소수점 함정(★131 구현 중 스모크가 적발): climb은 파생 사슬(L.y1+L.h+L.wt+t−SPT_Y)을 타고
  //   6.300000000000011이 되므로 `ceil(climb/0.300)`이 **22**로 튄다(리드백 도면은 21). 나눗셈이 정수에
  //   맞아떨어지는 것이 정상 설계인 값들이라 **허용오차 없이 ceil을 쓰면 도면과 코드가 다른 답을 낸다.**
  //   ★130-g '반올림 상수' 함정과 같은 계열 — 검사가 이 동치를 박는다.
  const steps = Math.max(2, Math.ceil(climb / rise0 - 1e-9))
  const rise = climb / steps                          // 실제 단높이(나머지 0으로 닫는다)
  const run = steps * tread
  const sweep = run / rMid                            // rad — 한 기가 먹는 방위
  const halfPlat = (w / 2) / rMid                     // 플랫폼 반각
  const azEnd = halfPlat + sweep                      // 계단 시작(가장 낮은 끝)의 방위
  const walkDeg = Math.atan2(rise, tread) * 180 / Math.PI

  //  이웃 문(90°·270°)까지의 여유 — 계단이 먹으면 옆 셸 통로를 침범한다
  const doorHalf = Math.asin(L.hw / rWall)
  const clearNext = Math.PI / 2 - doorHalf - azEnd

  //  옆으로 지나갈 폭(테라스 고리 r11.3~21.00 중 계단이 안 먹은 쪽)
  const passOut = rWall - ro
  const passIn = ri - rTerrIn
  const pass = Math.max(passOut, passIn)

  //  빛우물 잠식(단면 면적비)
  const wellA = Math.PI * rWall * rWall
  const occ = (w * d + 2 * run * d) / wellA

  return {
    on: UPF_ON, side, soffit: opts.soffit ?? UPF_SOFFIT, seg: UPF_SEG,
    yUnder, yWalk, yCeil, t, headroom, wallInAt, rWall, ri, ro, roEmb, rMid, d, w,
    yTerr, climb, steps, rise, tread, run, sweep, halfPlat, azEnd, walkDeg,
    doorHalf, clearNext, passOut, passIn, pass, occ, rTerrIn,
    st: UPF_ST, sink: UPF_SINK, emb: UPF_EMB, headMin: UPF_HEAD_MIN,
    spec: S, link: L,
  }
}

// ── ★계단 프로파일 정본 = **명시 노드 배열**(방위, 걷는 면 높이) ──
//  ⛔현도 로컬 반려(08.14 "계단이 이 나간 톱니 같다")의 근본 수리.
//   구판은 방위 → 단 인덱스를 `ceil((azEnd−a)/sweep · steps)`로 **역산**했는데, 그 몫이 정확한 정수가
//   못 된다(실측: k=3에서 3.000000000000001 → ceil이 **4**를 준다 · k=6에서 6.000000000000002 → **7**).
//   결과로 어떤 단은 두 배 높이가 되고 어떤 단은 사라져 **이가 빠진 톱니**가 됐다.
//   ★★교훈: 이 세션에서 단수 산출의 같은 함정(ceil 22 vs 21)을 이미 한 번 잡고도 **프로파일 쪽 역산을
//   놓쳤다** — 부동소수점 역산은 허용오차로 덧대는 게 아니라 **역산 자체를 없애야** 한다.
//   → 단 경계를 k로 **직접 생성**한다. 인덱스가 입력이므로 되돌아갈 나눗셈이 없다.
//
//  노드 순서(방위 감소 = 낮은 끝 → 플랫폼): 시작면 → [챌판 위 · 디딤 끝] × steps
//  · 챌판 = 같은 방위에서 y가 뛴다(수직면) · 디딤 = 방위가 진행하고 y가 같다(수평면)
export function stairNodes(U = upperPlatformSpec()) {
  const out = [{ a: U.azEnd, y: U.yTerr }]
  for (let k = 0; k < U.steps; k++) {
    const a0 = U.azEnd - U.sweep * k / U.steps
    const a1 = U.azEnd - U.sweep * (k + 1) / U.steps
    const y = U.yTerr + (k + 1) * U.rise
    out.push({ a: a0, y })      // 챌판 위
    out.push({ a: a1, y })      // 디딤 끝(같은 높이로 도착 — 여기가 평평해야 한다)
  }
  return out
}

// ── 계단 윗면: 노드 정본에서 조회(역산 없음) ──
export function stairYAt(aAbs, U = upperPlatformSpec()) {
  const N = stairNodes(U)
  for (let i = 0; i + 1 < N.length; i++) {
    const a0 = N[i].a, a1 = N[i + 1].a
    if (Math.abs(a0 - a1) < 1e-12) continue                    // 챌판(폭 0)
    if (aAbs <= a0 + 1e-9 && aAbs >= a1 - 1e-9) return N[i + 1].y
  }
  return aAbs > U.azEnd ? U.yTerr : U.yWalk
}

// ── 계단 밑면 정본: **노드가 자기 윗면을 들고 오므로 그 값을 쓴다**(방위 역조회 금지) ──
//  ⛔스윕이 잡은 잔재: 윗면은 노드가 명시로 들고 다니는데 밑면만 `stairSoffitAt(a)`로 되물었더니
//   'saw' 체제에서 **경계 노드의 밑면이 한 칸 낮게** 잡혀 부피가 8.7% 어긋났다(메시 49.56 vs 해석 45.61).
//   윗면과 밑면은 **같은 정본(노드)에서** 나와야 한다.
export function stairSoffitOf(node, U = upperPlatformSpec()) {
  const base = U.yTerr - U.sink                        // 테라스 판에 살짝 잠긴다(공면 z-fighting 방지)
  if (U.soffit === 'flat') return base
  const top = U.soffit === 'saw'
    ? node.y                                            // 톱니 = 그 노드의 윗면과 평행
    : U.yTerr + (U.azEnd - node.a) / U.sweep * U.climb  // 'ramp' = 곧은 경사면
  return Math.min(node.y - 1e-6, Math.max(base, top - U.st))
}

// ── 임의 방위의 밑면(검사·조회용 — 노드 정본을 거쳐 간다) ──
export function stairSoffitAt(aAbs, U = upperPlatformSpec()) {
  return stairSoffitOf({ a: aAbs, y: stairYAt(aAbs, U) }, U)
}

// ── 호 프리즘 빌더: 노드 열(방위 + 윗면 + 밑면)을 그대로 스윕한 닫힌 몸 ──
//  ★노드가 **자기 높이를 들고 다닌다** — 빌더가 방위로 높이를 되묻지 않는다.
//   구판은 세그먼트 양 끝에서 `stairYAt(a)`를 다시 불렀고, 그 함수가 방위를 인덱스로 역산하다
//   경계에서 한 칸씩 튀어 **디딤이 경사면으로 그려졌다**(현도 "이 나간 톱니").
function sweepSeq(seq, ri, ro) {
  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  const P = (a, r, y) => [r * Math.cos(a), y, r * Math.sin(a)]
  for (let i = 0; i + 1 < seq.length; i++) {
    const s0 = seq[i], s1 = seq[i + 1]
    quad(P(s0.a, ri, s0.top), P(s0.a, ro, s0.top), P(s1.a, ro, s1.top), P(s1.a, ri, s1.top))   // 윗면
    quad(P(s0.a, ri, s0.bot), P(s1.a, ri, s1.bot), P(s1.a, ro, s1.bot), P(s0.a, ro, s0.bot))   // 밑면
    quad(P(s0.a, ro, s0.top), P(s0.a, ro, s0.bot), P(s1.a, ro, s1.bot), P(s1.a, ro, s1.top))   // 바깥 옆면
    quad(P(s0.a, ri, s0.top), P(s1.a, ri, s1.top), P(s1.a, ri, s1.bot), P(s0.a, ri, s0.bot))   // 안쪽 옆면
  }
  const f = seq[0], l = seq[seq.length - 1]
  quad(P(f.a, ri, f.top), P(f.a, ri, f.bot), P(f.a, ro, f.bot), P(f.a, ro, f.top))             // 시작 캡
  quad(P(l.a, ri, l.top), P(l.a, ro, l.top), P(l.a, ro, l.bot), P(l.a, ri, l.bot))             // 끝 캡
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}

// ── 플랫폼 판(직사각 — 방위 ±halfPlat · 반경 ri~roEmb) ──
export function buildUpperSlab(U = upperPlatformSpec()) {
  const n = Math.max(4, Math.round(U.seg * (2 * U.halfPlat) / (Math.PI * 2)))
  const seq = Array.from({ length: n + 1 }, (_, i) => ({
    a: -U.halfPlat + (2 * U.halfPlat) * i / n, top: U.yWalk, bot: U.yUnder,
  }))
  return sweepSeq(seq, U.ri, U.roEmb)
}

// ── 계단 한 기(sign = +1 / −1) ──
//  ★노드 정본을 **그대로** 스윕한다 — 방위를 다시 인덱스로 되돌리지 않는다(톱니 버그의 근본 수리).
export function buildUpperStair(sign, U = upperPlatformSpec()) {
  const N = stairNodes(U)
  const seq = N.map(nd => ({ a: sign * nd.a, top: nd.y, bot: stairSoffitOf(nd, U) }))
  if (sign < 0) seq.reverse()
  return sweepSeq(seq, U.ri, U.roEmb)
}

// ── 전체(마운트용) ──
export function buildUpperPlatform(opts = {}) {
  const U = opts.U ?? upperPlatformSpec(opts)
  if (!U.on) return []
  //  ⚠세 부재 **전부 밟는 면**이다 → 마운트는 `walkable: true` 리터럴을 쓴다.
  //   축약형 `userData={{ walkable }}`은 check_waypoints 메시 센서스(소스 파싱)가 못 읽어 밟는 면 수를
  //   놓친다(구현 중 적발). 밟지 않는 부재(난간 등)가 생기면 그때 갈래를 나눈다.
  return [
    { id: 'slab', geo: buildUpperSlab(U) },
    { id: 'stair+', geo: buildUpperStair(+1, U) },
    { id: 'stair-', geo: buildUpperStair(-1, U) },
  ]
}

// ── 부피 해석식(검사 대조용 — 프리즘 사슬이라 정확식) ──
export function upperVolume(U = upperPlatformSpec()) {
  const ringA = (a, ri, ro) => a / 2 * (ro * ro - ri * ri)   // 부채꼴 고리 면적
  const slab = ringA(2 * U.halfPlat, U.ri, U.roEmb) * U.t
  //  ★노드 정본에서 적분한다(디딤 구간마다 실제 윗면·밑면 — 역산 없음)
  let stair = 0
  const N = stairNodes(U)
  for (let i = 0; i + 1 < N.length; i++) {
    const da = Math.abs(N[i].a - N[i + 1].a)
    if (da < 1e-12) continue                                  // 챌판(폭 0)
    //  윗면·밑면 둘 다 **노드에서** 온다(구간 양 끝 밑면의 평균 = 사다리꼴 정확식)
    const b0 = stairSoffitOf(N[i], U), b1 = stairSoffitOf(N[i + 1], U)
    stair += ringA(da, U.ri, U.roEmb) * (N[i + 1].y - (b0 + b1) / 2)
  }
  return { slab, stair, total: slab + 2 * stair }
}
