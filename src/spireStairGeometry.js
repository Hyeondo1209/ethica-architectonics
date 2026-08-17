// spireStairGeometry.js — ★★★★144-b 첨탑 **내벽에 건 나선 계단**(허브 → 테라스)
//  (2026.08.17 현도 그림 · 실측 2왕복 + 시각화 2장으로 값 확정)
//
//  ★한 줄: 착지 디스크(y101.28)에서 상승 관 초입 옆으로 들어가, 첨탑 내벽을 **반 바퀴** 감아
//   테라스(y127)로 올라온다. ★144-a로 셸→테라스 통로 넷을 전부 철거한 뒤 그 자리를 대신하는 **유일한 길**이다.
//
//  ★왜 벽 '속'이 아니라 벽 '면'인가 — 경위는 constants.js ★144-b 블록에 남겼다(요약: 벽 속 공간이 없다).
//
//  ⚠사본 금지 — 이 파일에 손 좌표는 **0개**다:
//    · 출발 레벨·관 반폭 = `ascSpec()`      · 내벽 반경 = `wellWallR()`(높이의 함수 — ★129 빗면 추종)
//    · 문 상인방 = `spireSpec().portal`      · 도착 = `SPT_Y`
//    · 꽃잎 방위 = `RAD_ANG0`               · 스윕 빌더 = `upperPlatformGeometry.sweepSeq`(★131 정본)
//
//  ⚠★131이 남긴 두 함정을 그대로 승계한다(같은 계열 버그를 다시 내지 않기 위해):
//    ① 단수는 `ceil(climb/step − 1e-9)` — 파생 사슬의 부동소수점 잔재가 ceil을 한 칸 튀게 한다.
//    ② 노드가 **자기 윗면·밑면을 들고 다닌다** — 방위로 높이를 역산하면 '이 나간 톱니'가 된다.
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
import { ascSpec } from './ascentTunnelGeometry.js'
import { sweepSeq } from './upperPlatformGeometry.js'
import {
  SPS_ON, SPS_LNK_K, SPS_TURNS, SPS_HAND, SPS_KIND, SPS_TOP, SPS_RAIL, SPS_RAIL_FORM, SPS_HOLE_ON,
  SPS_W, SPS_T, SPS_STEP, SPS_EMB, SPS_HEAD, SPS_LAP, SPS_TREAD_T,
  SPS_RAIL_H, SPS_RAIL_W, SPS_PARA_H, SPS_PARA_T,
  SPT_Y, SPT_T, RAD_ANG0, LNK_WALK_MAX,
} from './constants.js'

export const SPS_HANDS = ['right', 'left']
export const SPS_KINDS = ['slab', 'tread']
export const SPS_TOPS = ['hold', 'follow']
export const SPS_RAILS = ['curb', 'parapet', 'off']
export const SPS_RAIL_FORMS = ['smooth', 'stepped']

const TAU = Math.PI * 2

// ── 스펙(전부 파생 — 수치 하드코딩 금지 규율 ⑪) ──
export function spireStairSpec(opts = {}) {
  const S = opts.spec ?? spireSpec()
  const A = opts.asc ?? ascSpec()
  const P = S.portal
  //  내벽은 높이의 함수다(★129 하단 2단 확장) — 사본 금지, 정본에서 받는다
  const wallInAt = y => wellWallR(y, { spec: S, forceSpire: true }) - S.T

  const kind = opts.kind ?? SPS_KIND
  const topMode = opts.top ?? SPS_TOP
  const rail = opts.rail ?? SPS_RAIL
  const railForm = opts.railForm ?? SPS_RAIL_FORM
  const hand = (opts.hand ?? SPS_HAND) === 'left' ? -1 : +1

  const y0 = opts.y0 ?? A.y0                       // 첫 단 걷는 면 = 상승 관 바닥(같은 레벨에서 갈라진다)
  const yTop = opts.yTop ?? SPT_Y                  // 도착 = 테라스 걷는 면
  const climb = yTop - y0
  const w = opts.w ?? SPS_W
  const t = opts.t ?? SPS_T

  //  띠: 바깥 끝 = 출발 높이의 내벽 · 안쪽 끝 = 폭만큼 안으로
  const rOut0 = wallInAt(y0)
  const rIn0 = rOut0 - w
  const rMid = (rIn0 + rOut0) / 2

  const turns = opts.turns ?? SPS_TURNS
  const sweep = turns * TAU

  //  ★꽃잎 인덱스 = LNK 인덱스에서 파생(45° 어긋남 — `ARM13_BR_K`와 **같은 식**, 사본 아님)
  const petal = ((opts.lnkK ?? SPS_LNK_K) + 3) % 4
  const azTunnel = RAD_ANG0 + petal * Math.PI / 2
  //  관이 평균 반경에서 먹는 반각 — 문은 그 옆벽에 난다
  const doorHalf = Math.asin(Math.min(1, A.massHW / rMid))
  const az0 = azTunnel + hand * doorHalf

  //  ★단수: ceil의 부동소수점 함정 회피(★131 ①)
  //  걷는 선(램프) — 난간 'smooth' 형·소핏·도착 구멍이 같은 직선을 쓴다(정본 하나).
  //  ⚠㉒ TDZ: 아래 crossings·soffitRampAt이 부르므로 그들보다 **앞에** 선다
  const rampAt = travel => y0 + climb * travel / sweep

  const steps = Math.max(2, Math.ceil(climb / (opts.step ?? SPS_STEP) - 1e-9))
  const rise = climb / steps
  const tread = sweep * rMid / steps                // 평균 반경에서의 디딤 호길이
  const walkDeg = Math.atan2(rise, tread) * 180 / Math.PI

  //  ── 반경(높이의 함수) ──
  //   'hold'  = 출발 반경에 머문다(현도 확정). 벽이 물러선 뒤로는 틈이 벌어진다.
  //   'follow'= 바깥 끝이 내벽을 좇는다(보존계). 폭은 유지되므로 안쪽 끝이 함께 밀려난다.
  const rOutAt = y => (topMode === 'follow' ? wallInAt(y) : rOut0)
  const rInAt = y => rOutAt(y) - w
  //  물림은 **벽이 실제로 거기 있을 때만** 더한다(허공에 묻을 수는 없다 — 'hold'의 위쪽)
  const touches = y => Math.abs(wallInAt(y) - rOutAt(y)) < 1e-9
  const rEmbAt = y => rOutAt(y) + (touches(y) ? SPS_EMB : 0)

  //  ★벽이 물러서기 시작하는 지점(★129 빗면 아래끝 y122.5)
  const yGap0 = S.wY0
  const aGap = climb > 1e-9 ? sweep * Math.max(0, Math.min(1, (yGap0 - y0) / climb)) : 0
  const gapMax = topMode === 'follow' ? 0 : Math.max(0, wallInAt(yTop) - rOut0)

  //  ── 문 앞 통과(닫힌 식) ──
  //   기준 = **허브 쪽 상인방 윗면**(`portal.hubLinTop`). ⛔바깥 문 린텔(y1+clear+0.4)이 아니다.
  const travelOf = az => ((hand * (az - az0)) % TAU + TAU) % TAU
  const soffitRampAt = travel => rampAt(travel) - t
  const crossings = []
  for (let j = 0; j < 4; j++) {
    const azT = RAD_ANG0 + j * Math.PI / 2
    const c = travelOf(azT)
    const near = c - doorHalf
    if (near <= 1e-9 || near >= sweep - 1e-9) continue    // 출발 관 자신·범위 밖
    crossings.push({
      petal: j, azT, travelNear: near,
      soffit: soffitRampAt(near),
      clear: soffitRampAt(near) - P.hubLinTop,
    })
  }
  crossings.sort((a, b) => a.travelNear - b.travelNear)

  //  ── 테라스 구멍: 판 밑면과 걷는 면 사이가 `SPS_HEAD`보다 좁아지는 지점부터 끝까지 ──
  const yPlateBot = SPT_Y - SPT_T
  const yOpen = yPlateBot - SPS_HEAD
  const aHole = climb > 1e-9 ? sweep * Math.max(0, Math.min(1, (yOpen - y0) / climb)) : 0
  const hole = (opts.holeOn ?? SPS_HOLE_ON) && SPS_ON ? {
    hand, az0, a0: az0 + hand * aHole, a1: az0 + hand * sweep,
    //  구멍은 나선보다 `SPS_LAP`만큼 **작다** → 판이 계단을 그만큼 물어 공면·틈이 동시에 사라진다
    rIn: rInAt(yTop) + SPS_LAP, rOut: rOutAt(yTop) - SPS_LAP,
    travel0: aHole, travel1: sweep,
  } : null

  return {
    on: SPS_ON, kind, topMode, rail, railForm, rampAt, hand, handName: hand > 0 ? 'right' : 'left',
    spec: S, asc: A, portal: P, wallInAt,
    y0, yTop, climb, w, t, rOut0, rIn0, rMid, rOutAt, rInAt, rEmbAt, touches,
    turns, sweep, petal, azTunnel, doorHalf, az0, travelOf,
    steps, rise, tread, walkDeg, walkMax: LNK_WALK_MAX,
    yGap0, aGap, gapMax, crossings, hole, soffitRampAt,
    emb: SPS_EMB, lap: SPS_LAP, head: SPS_HEAD, yPlateBot, yOpen,
    railH: SPS_RAIL_H, railW: SPS_RAIL_W, paraH: SPS_PARA_H, paraT: SPS_PARA_T,
    treadT: SPS_TREAD_T,
  }
}

// ── ★계단 프로파일 정본 = 명시 노드 배열(★131 ② 승계 — 역산 없음) ──
//  노드 순서(주행 증가 = 낮은 끝 → 테라스): 시작면 → [챌판 위 · 디딤 끝] × steps
export function stairNodes(K = spireStairSpec()) {
  const out = [{ travel: 0, y: K.y0 }]
  for (let k = 0; k < K.steps; k++) {
    const t0 = K.sweep * k / K.steps
    const t1 = K.sweep * (k + 1) / K.steps
    const y = K.y0 + (k + 1) * K.rise
    out.push({ travel: t0, y })      // 챌판 위(같은 방위에서 y가 뛴다)
    out.push({ travel: t1, y })      // 디딤 끝(방위가 진행하고 y는 같다 — 여기가 평평해야 한다)
  }
  return out
}

//  월드 방위 = 출발 방위 + 손 방향 × 주행
export const azOf = (travel, K) => K.az0 + K.hand * travel

// ── 밑면 정본: 노드가 자기 윗면을 들고 오므로 그것에서 낸다(방위 역조회 금지 — ★131 교훈) ──
export function stairSoffitOf(node, K = spireStairSpec()) {
  if (K.kind === 'tread') return node.y - K.treadT           // 낱장 = 얇은 판(방 나선 어휘)
  return Math.min(node.y - 1e-6, K.soffitRampAt(node.travel)) // 연속 판 = 곧은 나선 밑면
}

// ── 여러 조각을 한 몸으로(three 유틸 의존 없이 — 위치 배열 이어붙이기) ──
function mergeGeos(list) {
  const pos = []
  for (const g of list) {
    const a = g.getAttribute('position')
    for (let i = 0; i < a.count; i++) pos.push(a.getX(i), a.getY(i), a.getZ(i))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return g
}

//  노드 → 스윕 시퀀스 항목(반경까지 노드가 들고 간다 — 'follow'에서 높이마다 달라진다)
const seqItem = (nd, K, rInF, rOutF) => ({
  a: azOf(nd.travel, K), top: nd.y, bot: stairSoffitOf(nd, K),
  ri: rInF(nd), ro: rOutF(nd),
})

// ── 시퀀스 정본 — 빌더와 부피식이 **이것 하나**를 나눠 쓴다(분할이 갈릴 여지를 없앤다) ──
export function stairSeqs(K = spireStairSpec()) {
  const N = stairNodes(K)
  const rI = nd => K.rInAt(nd.y), rO = nd => K.rEmbAt(nd.y)
  if (K.kind === 'slab') {
    const seq = N.map(nd => seqItem(nd, K, rI, rO))
    if (K.hand < 0) seq.reverse()                    // 감김 일관성: 방위 감소면 순서를 뒤집는다
    return [seq]
  }
  //  'tread' = 낱장 디딤판 — 디딤 구간(챌판 폭 0 구간은 건너뛴다)마다 독립 프리즘
  const out = []
  for (let i = 0; i + 1 < N.length; i++) {
    if (Math.abs(N[i].travel - N[i + 1].travel) < 1e-12) continue
    const seq = [seqItem(N[i], K, rI, rO), seqItem(N[i + 1], K, rI, rO)]
    if (K.hand < 0) seq.reverse()
    out.push(seq)
  }
  return out
}

export function railSeqs(K = spireStairSpec()) {
  if (K.rail === 'off') return []
  const h = K.rail === 'parapet' ? K.paraH : K.railH
  const wRail = K.rail === 'parapet' ? K.paraT : K.railW
  //  ★★'smooth'(현도 판정 — 기본): 난간이 계단이 아니라 **걷는 선(램프)**을 탄다.
  //   윗변 = 램프 + h(곧은 나선 띠) · 밑변 = 램프 − lap. 램프는 각 디딤의 **먼 끝**에서 윗면과 정확히
  //   만나고 가까운 끝에서는 +단높이 위에 있으므로(노드 산술의 귀결 — 표본 아님), 밑변이 모든 디딤에
  //   최소 lap 물린다 = 틈 0. 챌판 노드(폭 0)는 굳이 넣지 않는다 — 직선 위 중복점일 뿐이다.
  if ((K.railForm ?? 'smooth') === 'smooth') {
    const item = tr => {
      const y = K.rampAt(tr)
      return { a: azOf(tr, K), top: y + h, bot: y - K.lap, ri: K.rInAt(y), ro: K.rInAt(y) + wRail }
    }
    //  ★★현도 판정(넷째 "난간 끝이 테라스 위로 삐쭉"): 윗변이 **테라스 걷는 면에 닿는 지점에서 끝낸다**.
    //   닫힌 식: 램프(t)+h = yTop ⟺ tEnd = sweep·(상승−h)/상승. 그 뒤 구간은 판 두께 속 슬롯 안이라
    //   난간 없이도 양옆이 판이다. ⚠끝 노드가 정확히 tEnd에 서므로(스냅 아님) 'smooth' 불변식
    //   (윗변 = 램프+h)은 그대로 성립한다 — 검사 무수정 통과가 그 증거다.
    const tEnd = K.sweep * Math.max(0, K.climb - h) / K.climb
    const seq = []
    for (let k = 0; k <= K.steps; k++) {
      const tr = K.sweep * k / K.steps
      if (tr >= tEnd - 1e-12) break
      seq.push(item(tr))
    }
    seq.push(item(tEnd))
    if (K.hand < 0) seq.reverse()
    return [seq]
  }
  //  'stepped' = 구판(계단 노드 추종 — 톱니) · 보존계. ★넷째 판정의 상한 = **조기 종단**(smooth와 같은 처방):
  //   윗변이 테라스 면을 넘는 노드부터 난간을 끊는다. ⛔클램프(top=min(…, yTop))는 기각 —
  //   'tread' 낱장 체제에서 이웃 조각들의 클램프된 캡이 y127에서 같은 윗변을 공유해
  //   **겹면(비매니폴드)**이 된다(스윕 적발 · 조각별 감사는 전부 무결 → 병합에서만 나는 병).
  const N = stairNodes(K).filter(nd => nd.y + h <= K.yTop + 1e-9)
  const item = nd => ({
    a: azOf(nd.travel, K), top: nd.y + h, bot: nd.y - K.lap,   // 밑을 판 속에 물린다(공면 방지)
    ri: K.rInAt(nd.y), ro: K.rInAt(nd.y) + wRail,
  })
  if (K.kind === 'slab') {
    const seq = N.map(item)
    if (K.hand < 0) seq.reverse()
    return [seq]
  }
  const out = []
  for (let i = 0; i + 1 < N.length; i++) {
    if (Math.abs(N[i].travel - N[i + 1].travel) < 1e-12) continue
    const seq = [item(N[i]), item(N[i + 1])]
    if (K.hand < 0) seq.reverse()
    out.push(seq)
  }
  return out
}

// ── 계단 본체 ──
export function buildSpireStair(K = spireStairSpec()) {
  const sq = stairSeqs(K)
  return orientOutward(sq.length === 1 ? sweepSeq(sq[0], K.rIn0, K.rOut0)
    : mergeGeos(sq.map(s => sweepSeq(s, K.rIn0, K.rOut0))))
}

// ── 난간(안쪽 모서리) — 'curb' 낮은 턱 / 'parapet' 벽식 / 'off' 없음 ──
export function buildSpireStairRail(K = spireStairSpec()) {
  const sq = railSeqs(K)
  if (!sq.length) return null
  return orientOutward(sq.length === 1 ? sweepSeq(sq[0], K.rIn0, K.rIn0 + 1)
    : mergeGeos(sq.map(s => sweepSeq(s, K.rIn0, K.rIn0 + 1))))
}

// ── 테라스에 넘길 구멍 제원(정규화) — 호출자(Room·검사)가 이 하나만 쓴다(사본 금지) ──
export function terraceHoleOf(K = spireStairSpec()) {
  if (!K.on || !K.hole) return null
  const { a0, a1, rIn, rOut } = K.hole
  return { aLo: Math.min(a0, a1), width: Math.abs(a1 - a0), rIn, rOut }
}

// ── 전체(마운트용) ──
export function buildSpireStairParts(opts = {}) {
  const K = opts.K ?? spireStairSpec(opts)
  if (!K.on) return []
  const out = [{ id: 'stair', geo: buildSpireStair(K), walk: true }]
  const rl = buildSpireStairRail(K)
  if (rl) out.push({ id: 'rail', geo: rl, walk: false })
  return out
}

// ── 부피 해석식 — ★메시와 **같은 삼각분할**로 적분한다(정확식) ──
//  ⛔구현 중 적발한 병(편차 1.44): 사다리꼴(윗면−밑면 평균) 공식은 밑면이 기울면 메시와 갈린다.
//   메시의 사각 면은 대각선 (a₀,안)–(a₁,밖)으로 두 삼각형이 되고, 삼각형 위의 평균 높이는
//   **세 꼭짓점의 평균**이지 네 꼭짓점의 평균이 아니다. 편차는 닫힌 식으로 (b₁−b₀)(o−i)²·sinΔ/12.
//   ⚠같은 병이 ★131 `upperVolume`에도 있었다(편차 0.097) — 같은 세션에서 함께 고쳤다.
//  분할 정본(sweepSeq와 동일): Ta = (a₀,i₀)(a₀,o₀)(a₁,o₁) · Tb = (a₀,i₀)(a₁,o₁)(a₁,i₁)
//  ⚠a0·a1은 **시퀀스 순서**다(작은 방위가 아니다) — 대각선이 순서로 정해지므로 정렬하면 틀린다.
export function prismVol(a0, a1, i0, o0, i1, o1, t0, t1, b0, b1) {
  const d = a1 - a0
  if (Math.abs(d) < 1e-12) return 0
  const sd = Math.sin(Math.abs(d))
  const Aa = 0.5 * o1 * (o0 - i0) * sd          // 삼각형 Ta
  const Ab = 0.5 * i0 * (o1 - i1) * sd          // 삼각형 Tb
  return Aa * ((2 * t0 + t1) - (2 * b0 + b1)) / 3
       + Ab * ((t0 + 2 * t1) - (b0 + 2 * b1)) / 3
}

//  ★★시퀀스 부피 = **빌더가 받는 바로 그 배열**을 적분한다. 이 한 함수 덕에 '해석식이 메시와
//   다른 분해를 썼다'는 계열의 병이 원리적으로 못 생긴다(같은 입력 → 같은 조각).
export function seqVolume(seq, ri, ro) {
  const RI = s => s.ri ?? ri, RO = s => s.ro ?? ro
  let v = 0
  for (let i = 0; i + 1 < seq.length; i++) {
    const a = seq[i], b = seq[i + 1]
    v += prismVol(a.a, b.a, RI(a), RO(a), RI(b), RO(b), a.top, b.top, a.bot, b.bot)
  }
  return v
}

export function spireStairVolume(K = spireStairSpec()) {
  const body = stairSeqs(K).reduce((a, sq) => a + seqVolume(sq, K.rIn0, K.rOut0), 0)
  const rl = railSeqs(K)
  const rail = rl.reduce((a, sq) => a + seqVolume(sq, K.rIn0, K.rIn0 + 1), 0)
  return { body, rail, total: body + rail }
}
