//  ══════════════════════════════════════════════════════════════════════════
//  axiomVaultGeometry.js — ★★★111 공리 볼트(문) (2026.08.04 현도 스케치)
//  ══════════════════════════════════════════════════════════════════════════
//  공리 = **걷는 사람이 통과하는 문**. 받침(보·기둥) 위에 볼트가 서고 나선이 아치를 관통한다.
//  ★단면 좌표계는 `frameAt`(★109 마이터+윈더의 단일 정본)을 그대로 쓴다 — **사본 금지**.
//   그래서 볼트가 코너에 걸쳐도 코일과 똑같이 꺾인다(다만 스펙이 코너를 비켜 앉힌다 — 아래).
//  ★구조 이야기(§2-D 뿌리 선언): 뿌리 = 그 자리의 받침(보 또는 기둥). 옆구리·잼브는 코일 곁
//   허공에 떠 있고 밑끝은 깎는다(코일 자신이 그렇게 떠 있는 건물이다). 보 자리에는 보 윗면과
//   볼트 바깥면 사이 **코브**를 채운다(현도: 코끝 립 같은 종잇장 금지).
//  ★실내 어법 = 총안(embrasure): 두꺼운 안쪽 벽(잼브) + 작은 바깥 개구 + 안쪽 사면.
//   창은 하운치(어깨 위 곡면부)를 수평 관통한다 — 개구가 안쪽으로 벌어져 빛 깔때기가 된다.
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import {
  AX_VAULT_ON, AX_VAULT_LAYOUT, AX_VAULT_LEN, AX_VAULT_ARCH_W, AX_VAULT_SPRING,
  AX_VAULT_SHELL, AX_VAULT_JAMB, AX_VAULT_CHAMF,
  AX_VAULT_WIN_Y, AX_VAULT_WIN_W, AX_VAULT_WIN_SPLAY,
  AX_VAULT_NICHE_W, AX_VAULT_NICHE_H, AX_VAULT_NICHE_D, AX_VAULT_NICHE_SILL,
  AX_VAULT_COVE, AX_VAULT_GRIP, AX_VAULT_DROP, AX_VAULT_END_TILT, SPIRAL_MASS_T,
  AX_VAULT_CORNER_MIN,
} from './constants.js'
import { spiralSpec, stationList, frameAt, beamSpec, columnSpec } from './axiomSpiralGeometry.js'

//  ── 배치 스펙 ──────────────────────────────────────────────────────────────
//  ⚠보7(맨 위)은 **어느 배치에서도 빈 보**(현도 2026.08.04 확정 — 디스크 밑 여유 3.70뿐이기도 하다).
//  ★코너 회피: 볼트가 코너를 물면(발자국 안에 코너가 들어오면) 꺾인 탑이 된다. 스펙이 중심을
//   같은 변 안으로 **밀어낸다** — 단, 받침이 발자국 안에 남아야 뿌리 이야기가 산다(검사 항).
const TILT_K = Math.tan(AX_VAULT_END_TILT * Math.PI / 180)

export function vaultSpec() {
  const s = spiralSpec()
  const B = beamSpec(), C = columnSpec()
  const picks = AX_VAULT_LAYOUT === 'B'
    ? [C[0], C[2], C[4], B[0], B[2], B[4], B[6]].map((sup, i) => ({ sup, isBeam: i >= 3 }))
    : [B[0], B[1], B[2], B[3], B[4], B[5], B[6]].map((sup) => ({ sup, isBeam: true }))
  const half = AX_VAULT_LEN / 2
  const out = []
  picks.forEach(({ sup, isBeam }, i) => {
    const Ls = sup.L
    const cap = half - 0.6
    //  ★칼라(v3) — 받침을 무는 깊이는 받침 몸통이 허락하는 만큼만(§안전: 기둥0은 높이 1.61뿐)
    //   ⚠Lc와 무관하므로 코너 반복 **앞에서** 정한다(밑동 계산이 이 값을 쓴다).
    const supDepth = isBeam ? sup.depth : sup.h              // 보 춤 4.0 / 기둥 높이 1.61~13.93
    const drop = Math.min(AX_VAULT_DROP, Math.max(0.6, supDepth - 0.4))
    const supHW = 0.6                                        // 받침 폭(경로 방향)의 절반 — 보폭 1.2 기준

    //  ★★★112 코너 밑동 규칙(구 '끝 1.2 안쪽' 규칙 폐기) ──────────────────────────
    //  ⛔구판의 병: 코너를 볼트 끝에서 1.20 안쪽에 고정했는데 **끝면 기울기를 안 셌다**.
    //   기울기가 칼라 밑을 1.28 뒤로 당기므로 코너 너머 토막의 밑동이 1.20−1.28 = **−0.08**,
    //   즉 밑에서 0으로 사라지는 쐐기가 됐다(현도 로컬: "너무 얇아 절단면이 이상하다").
    //  ★정본 = **밑동 길이로 잰다.** 목표 `AX_VAULT_CORNER_MIN`이되 산술 상한에 물린다 —
    //   두 밑동의 합은 (LEN − bIn − bOut)로 고정이므로 min은 그 절반을 못 넘는다. 상한이면
    //   두 밑동이 **같아지는** 자리(균형점)에 앉힌다 = 코너를 걸터앉은 대칭 탑.
    //  ⚠기울기 몫(bIn·bOut)은 밟는 면 높이에 딸리고 그 높이는 Lc에 딸린다 → **반복 수렴**.
    //  ⚠코너가 애초에 몸통 밖이면 아무것도 안 한다(끌어들이지 않는다). 밖으로 미는 편이
    //   싸면 그쪽을 고른다 — 꺾임이 아예 없는 편이 언제나 낫다.
    let Lc = Ls, corner = null
    for (let it = 0; it < 8; it++) {
      const yF0i = s.yTread(Math.max(Lc - half, 1e-6) + 1e-6)
      const yF1i = s.yTread(Math.min(Lc + half, s.pathLen - 1e-6))
      const colBoti = yF0i - SPIRAL_MASS_T - drop
      const yCrowni = yF0i + AX_VAULT_SPRING + AX_VAULT_ARCH_W / 2
      const bIn  = (yF0i - colBoti) * TILT_K      // 입구 칼라 밑이 안으로 물러난 양
      const bOut = (yF1i - colBoti) * TILT_K      // 진출 칼라 밑이 안으로 물러난 양
      const aIn  = (yCrowni - yF0i) * TILT_K      // 입구 크라운이 밖으로 내민 양
      const aOut = (yCrowni - yF1i) * TILT_K      // 진출 크라운이 밖으로 내민 양
      //  몸통 실제 범위(크라운 내밀기 포함) 안의 코너 — 가장 가까운 하나
      let c = null
      for (let k = 1; k < s.N_SEG; k++) {
        const cc = s.cum[k]
        if (cc <= Lc - half - aIn || cc >= Lc + half + aOut) continue
        if (c === null || Math.abs(cc - Lc) < Math.abs(c - Lc)) c = cc
      }
      if (c === null) { corner = null; break }
      const dBal    = (2 * half + bIn - bOut) / 2            // 두 밑동이 같아지는 코너 위치(L0 기준)
      const stubMax = dBal - bIn
      const T   = Math.min(AX_VAULT_CORNER_MIN, Math.max(0, stubMax))
      const dLo = T + bIn, dHi = 2 * half - bOut - T
      const d0  = c - (Lc - half)
      const dWant = dLo <= dHi ? Math.min(Math.max(d0, dLo), dHi) : dBal
      //  후보 셋 — 코너를 몸 안 목표 깊이에 두거나, 몸 밖(앞/뒤)으로 내보내거나
      const cands = [c - dWant + half, c + half + aIn + 0.05, c - half - aOut - 0.05]
        .map((L) => Math.min(Math.max(L, Ls - cap), Ls + cap))
        .map((L) => Math.min(Math.max(L, half + 0.2), s.pathLen - half - 0.2))
      let next = cands[0]
      for (const L of cands) if (Math.abs(L - Ls) < Math.abs(next - Ls) - 1e-9) next = L
      corner = { c, stubIn: (c - (next - half)) - bIn, stubOut: ((next + half) - c) - bOut, stubMax }
      if (Math.abs(next - Lc) < 1e-6) break
      Lc = next
    }

    const L0 = Lc - half, L1 = Lc + half
    const yF0 = s.yTread(Math.max(L0, 1e-6) + 1e-6)          // 진입 바닥(밟는 면)
    const yF1 = s.yTread(Math.min(L1, s.pathLen - 1e-6))     // 진출 바닥
    const ySpring = yF0 + AX_VAULT_SPRING                    // 아치 어깨(진입 기준 — 크라운 수평)
    const yCrownI = ySpring + AX_VAULT_ARCH_W / 2            // 반원 아치 안쪽 정점
    const yBot    = yF0 - SPIRAL_MASS_T                      // 옆구리 밑끝 = 진입 코일 밑면(전 구간 옆면을 덮음)
    out.push({ id: `AX${i + 1}`, Ls, Lc, L0, L1, isBeam, sup,
      yF0, yF1, ySpring, yCrownI, yBot, corner,
      head: yCrownI - yF1,                                   // 진출 지점 실측 머리 여유
      collar: { drop, half: supHW + AX_VAULT_GRIP, ease: AX_VAULT_COVE } })
  })
  return { s, list: out }
}

//  ── 단면 프로필(u = 중심선에서 바깥(+) · y 절대) — Π-아치, 단일 폐곡선 ──
//  바깥(왼) 옆구리: u ∈ [+wA/2, +wA/2+shell] · 안쪽(오른) 잼브: u ∈ [−wA/2−jamb, −wA/2]
//  지붕: 타원 아치(비대칭 폭을 한 곡선으로 덮는다 — 스케치의 둥근 통형)
//  ── ★감김 정본화 `orientSolid` — 추론이 아니라 구조로 못 박는다 ─────────────────
//  ⛔v1 사고(기록): 마구리 감김이 옆면과 반대(불일치 엣지 72)였다. 그 자체론 워터타이트라 셀프 렌더
//   (양면·무컬링)에는 안 보였지만, **방향 섞인 솔리드를 CSG에 먹이면 내부/외부 판정이 깨져** 결과에
//   구멍이 쏟아졌다(경계 엣지 0→179 실측). 앱(단면 렌더)에서 "채워질 곳이 빈" 그림의 근본 원인.
//   코브는 아예 통째 반전(부피 음수)이었다. → 부호를 손으로 고르는 대신: ① 공유 엣지 BFS로 전체
//   감김을 일관시키고 ② 부호 있는 부피로 전역 방향(겉=바깥)을 강제한다. 프로필을 어떻게 바꿔도 옳다.
function orientSolid(gIn) {
  //  ★퇴화 삼각 제거 — v6 절단 클램프가 끝에서 링을 겹치게 만들어 면적 0 삼각이 생긴다.
  //   그대로 두면 엣지 짝이 어긋나 감김 감사가 실패한다(실측 불일치 49). 위상 계산 전에 턴다.
  {
    const pa = gIn.getAttribute('position').array
    const keep = []
    for (let t = 0; t < pa.length / 9; t++) {
      const b = t * 9
      const e1 = [pa[b + 3] - pa[b], pa[b + 4] - pa[b + 1], pa[b + 5] - pa[b + 2]]
      const e2 = [pa[b + 6] - pa[b], pa[b + 7] - pa[b + 1], pa[b + 8] - pa[b + 2]]
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      if (Math.hypot(...cr) / 2 > 1e-9) for (let k = 0; k < 9; k++) keep.push(pa[b + k])
    }
    gIn = new THREE.BufferGeometry()
    gIn.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3))
  }
  const g = gIn
  const p = g.getAttribute('position').array
  const nT = p.length / 9
  const Q = 1e4
  const vk = (i) => Math.round(p[i] * Q) + ',' + Math.round(p[i + 1] * Q) + ',' + Math.round(p[i + 2] * Q)
  const tris = []
  const edgeMap = new Map()               // 무방향 엣지 키 → [{t, e, fwd키}]
  for (let t = 0; t < nT; t++) {
    const b = t * 9, ks = [vk(b), vk(b + 3), vk(b + 6)]
    tris.push({ ks, flip: false, seen: false })
    for (let e = 0; e < 3; e++) {
      const a = ks[e], c = ks[(e + 1) % 3]
      const und = a < c ? a + '|' + c : c + '|' + a
      if (!edgeMap.has(und)) edgeMap.set(und, [])
      edgeMap.get(und).push({ t, a, c })
    }
  }
  //  BFS — 이웃은 공유 엣지를 **반대 방향**으로 가져야 한다
  for (let seed = 0; seed < nT; seed++) {
    if (tris[seed].seen) continue
    tris[seed].seen = true
    const st = [seed]
    while (st.length) {
      const t = st.pop(), T = tris[t]
      for (let e = 0; e < 3; e++) {
        const a0 = T.ks[e], c0 = T.ks[(e + 1) % 3]
        const a = T.flip ? c0 : a0, c = T.flip ? a0 : c0     // 실제(뒤집힘 반영) 방향
        const und = a < c ? a + '|' + c : c + '|' + a
        for (const nb of edgeMap.get(und)) {
          if (nb.t === t || tris[nb.t].seen) continue
          const na = tris[nb.t].flip ? nb.c : nb.a, nc = tris[nb.t].flip ? nb.a : nb.c
          if (na === a && nc === c) tris[nb.t].flip = !tris[nb.t].flip   // 같은 방향 = 반전 필요
          tris[nb.t].seen = true
          st.push(nb.t)
        }
      }
    }
  }
  //  전역 부호 — 부호 있는 부피(원점 사면체 합)가 음수면 전체 뒤집기
  let vol = 0
  const cross = (b, f) => {
    const A = [p[b], p[b + 1], p[b + 2]], B = [p[b + 3], p[b + 4], p[b + 5]], C = [p[b + 6], p[b + 7], p[b + 8]]
    const [P1, P2] = f ? [C, B] : [B, C]
    return (A[0] * (P1[1] * P2[2] - P1[2] * P2[1]) - A[1] * (P1[0] * P2[2] - P1[2] * P2[0]) + A[2] * (P1[0] * P2[1] - P1[1] * P2[0])) / 6
  }
  for (let t = 0; t < nT; t++) vol += cross(t * 9, tris[t].flip)
  const globalFlip = vol < 0
  const out = new Float32Array(p.length)
  for (let t = 0; t < nT; t++) {
    const b = t * 9, f = tris[t].flip !== globalFlip
    for (let k = 0; k < 3; k++) out[b + k] = p[b + k]
    const [s1, s2] = f ? [6, 3] : [3, 6]
    for (let k = 0; k < 3; k++) { out[b + 3 + k] = p[b + s1 + k]; out[b + 6 + k] = p[b + s2 + k] }
  }
  const g2 = new THREE.BufferGeometry()
  g2.setAttribute('position', new THREE.BufferAttribute(out, 3))
  g2.computeVertexNormals()
  return g2
}

export function profilePts(v) {
  const hwA = AX_VAULT_ARCH_W / 2
  const uL = hwA + AX_VAULT_SHELL          // 바깥면 u
  const uR = -(hwA + AX_VAULT_JAMB)        // 안쪽면 u
  const ch = AX_VAULT_CHAMF
  const yShoulder = v.yCrownI - 0.5        // 겉 아치 시작 높이
  const yCrownE = v.yCrownI + AX_VAULT_SHELL   // 겉 정점(중앙 껍질 = SHELL)
  const uc = (uL + uR) / 2, ra = (uL - uR) / 2, rb = yCrownE - yShoulder
  const P = []
  //  바깥 밑끝(깎임) → 바깥면 위로
  P.push([uL - ch, v.yBot], [uL, v.yBot + ch], [uL, yShoulder])
  //  겉 타원 아치(왼→오른)
  const NE = 14
  for (let i = 1; i < NE; i++) {
    const th = Math.PI * (i / NE)
    P.push([uc + ra * Math.cos(th), yShoulder + rb * Math.sin(th)])
  }
  //  안쪽면 아래로 → 안쪽 밑끝(깎임)
  P.push([uR, yShoulder], [uR, v.yBot + ch], [uR + ch, v.yBot])
  //  잼브 안면(아치 오른 벽) 위로 → 안 반원 아치(오른→왼) → 옆구리 안면 아래로 → 닫힘
  P.push([-hwA, v.yBot], [-hwA, v.ySpring])
  //  ⛔v1 자가교차 사고(기록): 여기 부호가 뒤집혀 안반원이 왼→오른으로 돌며 프로필이 나비넥타이가 됐다.
  //   렌더는 아치처럼 보였지만 CSG·광선이 안에서 길을 잃었다(창 관통 검사 0/7이 잡았다).
  //   ★cos(π)=−1이므로 +hwA·cos(th), th π→0 이 '오른(−hwA)→왼(+hwA)' 순회다.
  const NA = 14
  for (let i = 1; i < NA; i++) {
    const th = Math.PI * (1 - i / NA)
    P.push([hwA * Math.cos(th), v.ySpring + hwA * Math.sin(th)])
  }
  P.push([hwA, v.ySpring], [hwA, v.yBot])
  //  ⛔v1 좌우 반전 사고(기록): +m = **안쪽(상승 시 오른쪽)**임을 실측(+m 이동 시 r 28.9→26.9)했는데
  //   프로필이 두꺼운 잼브(총안 벽)를 −u에 뒀다 — 창이 돔(바깥)을 보고 있었다. 셀프 렌더가 적발.
  //   ★미러(u→−u)만 하면 다각형 감김이 뒤집혀 앱(단면 렌더)에서 안 보인다 — **순서도 역전**해 감김 보존.
  return P.map(([u, y]) => [-u, y]).reverse()
}

//  ── 스윕: 프로필을 frameAt 좌표계로 L0→L1 (코너·윈더는 frameAt이 처리) ──
//  ★★공유 링 L 집합 — 스윕과 칼라가 **같은 L에서** 링을 떠야 두 겉면이 정확히 한 면이 된다.
//   ⛔v3 사고(현도 로컬 적발): 칼라가 자기 16등분 L을 썼다. 코너·윈더에서 마이터 배율이 1.000→1.083으로
//   급변하는데(실측), 그 사이 L에 앉은 칼라 링이 스윕의 **현(chord) 바깥**으로 튀어나왔다(최악 0.95).
//   면 일치는 값이 아니라 **표본점 일치**의 문제다 — 그래서 집합 자체를 공유한다.
export function ringLs(s, v) {
  const { half } = v.collar
  const ins = endInset(v)
  const lo = v.L0 + ins, hi = v.L1 - ins          // ★내부 링 구간 = 끝면이 파고든 뒤부터
  const set = [lo, hi]
  for (const b of [v.Ls - half, v.Ls + half])
    if (b > lo + 1e-6 && b < hi - 1e-6) set.push(b)
  for (const a of stationList(s)) if (a.L > lo + 1e-6 && a.L < hi - 1e-6) set.push(a.L)
  set.sort((a, b) => a - b)
  const out = []
  for (const L of set) if (!out.length || L - out[out.length - 1] > 1e-6) out.push(L)
  return out
}

//  ★★★끝면 기울기 v6 — 입구·출구가 **기울어진 한 평면**이 된다(현도 2026.08.04).
//   높이 y의 점은 밟는 면(yRef)에서 벗어난 만큼 경로 방향으로 밀린다: 위는 앞으로, 아래는 뒤로.
//   ⚠볼트와 칼라가 **이 함수 하나**를 공유하는 것이 도장 도형이 닫히는 근거다(v5 규약을 기운 면으로 확장).
export function endL(v, which, y) {
  const k = Math.tan(AX_VAULT_END_TILT * Math.PI / 180)
  return which === 'entry' ? v.L0 - k * (y - v.yF0) : v.L1 + k * (y - v.yF1)
}
//  ★★★v7 끝면 = **진짜 평면**. ⛔v6 사고(현도 로컬 적발 — "지우개를 커터칼로 난도질한 절삭면"):
//   점마다 `frameAt(L−kΔy)`를 다시 불러 배치했더니 경로가 휘어서 결과가 **휜 면**이 됐다. 게다가
//   크라운은 바깥(−)으로, 칼라 밑은 안쪽(+)으로 밀리는데 그 사이 링이 제자리라 **뒤집힌 사각형**이 났다.
//   ★정본 = 끝 프레임 **하나**를 기준으로 t 방향 평행이동 → 정의상 평면. 내부 링은 끝면이 파고드는
//   깊이(`endInset`)만큼 안쪽에서 시작해 뒤집힘을 없앤다. 볼트·칼라가 이 두 함수를 공유한다.
export function capRing(s, v, which, pts2d) {
  const k = Math.tan(AX_VAULT_END_TILT * Math.PI / 180)
  const F = frameAt(s, which === 'entry' ? v.L0 : v.L1)
  const yRef = which === 'entry' ? v.yF0 : v.yF1
  const sg = which === 'entry' ? -1 : 1
  return pts2d.map(([u, y]) => {
    const d = sg * k * (y - yRef)                    // 위는 바깥, 아래는 안쪽 — 한 평면 위
    return [F.x + F.m[0] * u * F.scale + F.t[0] * d, y, F.z + F.m[1] * u * F.scale + F.t[1] * d]
  })
}
export function endInset(v) {
  const k = Math.tan(AX_VAULT_END_TILT * Math.PI / 180)
  return k * (Math.max(v.yF0, v.yF1) - (v.yBot - v.collar.drop)) + 0.05
}

export function sweepVault(s, v) {
  const P2 = profilePts(v)
  const Ls = ringLs(s, v)
  const mk = (L) => { const F = frameAt(s, L)
    return P2.map(([u, y]) => [F.x + F.m[0] * u * F.scale, y, F.z + F.m[1] * u * F.scale]) }
  const rings = [capRing(s, v, 'entry', P2), ...Ls.map(mk), capRing(s, v, 'exit', P2)]
  const pos = []
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c) }
  //  옆면 — 프로필 방향이 겉 CCW가 되도록 감김: (i,j)→(i+1,j)→(i+1,j+1) / (i,j)→(i+1,j+1)→(i,j+1)
  const n = P2.length
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1]
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n
      tri(A[j], B[j], B[j2]); tri(A[j], B[j2], A[j2])
    }
  }
  //  마구리 — 프로필 삼각분할(ShapeUtils). 진입면 법선 = −t, 진출면 = +t
  const shp = P2.map(([u, y]) => new THREE.Vector2(u, y))
  const faces = THREE.ShapeUtils.triangulateShape(shp, [])
  const F0 = rings[0], F1 = rings[rings.length - 1]
  for (const [a, b, c] of faces) { tri(F0[a], F0[c], F0[b]); tri(F1[a], F1[b], F1[c]) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return orientSolid(g)   // ★감김 정본화 — CSG 입력은 방향 일관 필수
}

//  ── 창(총안) + 감실 브러시 — 볼트 중앙 단면 좌표계에 앉힌다 ──
//  창 = 절두 사각뿔(안이 넓다 — splay). 안쪽 개구가 하운치 곡면(intrados)에 열린다.
export function frustumBrush(F, v, kind) {
  const dirIn = [-F.m[0], -F.m[1]]                     // 안쪽(−u) = 방 중심 방향
  const mkWH = (u, y, w, h) => {
    //  단면 u에서 폭 w(경로 방향 t)·높이 h의 사각 — 네 꼭짓점
    const cx = F.x + F.m[0] * u, cz = F.z + F.m[1] * u
    const tx = F.t[0], tz = F.t[1]
    return [
      [cx - tx * w / 2, y - h / 2, cz - tz * w / 2], [cx + tx * w / 2, y - h / 2, cz + tz * w / 2],
      [cx + tx * w / 2, y + h / 2, cz + tz * w / 2], [cx - tx * w / 2, y + h / 2, cz - tz * w / 2],
    ]
  }
  let A, B
  const hwA = AX_VAULT_ARCH_W / 2
  if (kind === 'window') {
    const yW = v.yF0 + AX_VAULT_WIN_Y
    const sp = Math.tan(AX_VAULT_WIN_SPLAY * Math.PI / 180)
    //  ⛔셀프 렌더 적발(★111 v1): 뿔을 아치 안까지 6.1 밀며 사면이 계속 벌어져 안 개구가 6.1×9.8 —
    //   크라운을 통째로 물었다. ★사면은 **잼브 두께에서만** 벌어진다. 관통 여유는 ±0.4(각도 동결 연장).
    const wIn = AX_VAULT_WIN_W + 2 * AX_VAULT_JAMB * sp
    const hEx = AX_VAULT_WIN_W * 1.6, hIn = hEx + 2 * AX_VAULT_JAMB * sp
    //  ★잼브는 +u(안쪽 — 좌우 반전 사고 후 정본). 브러시 규칙: **A→B 축이 항상 +u**(감김 불변 — 감실 사고의 교훈).
    A = mkWH(hwA - 0.4, yW, wIn, hIn)                                  // 실내 개구(벌어짐)
    B = mkWH(hwA + AX_VAULT_JAMB + 0.4, yW, AX_VAULT_WIN_W, hEx)       // 바깥 개구(작다 — 총안)
  } else {
    //  감실 — 잼브 수직면(u=−hwA)에서 D만큼 파고 들어감. 관통 금지(등벽 1.6 남음 — 검사 항)
    //  ⛔v1 뒤집힌 브러시 사고(기록): A(안)→B(바깥) 순서로 만들어 옆면 감김이 창과 반대 = inside-out.
    //   뒤집힌 브러시는 빼기가 안 먹는다(광선 검사 0/7이 잡았다). ★A=깊은 면, B=허공 면 — 창과 같은 축 순서.
    const yN = v.yF0 + AX_VAULT_NICHE_SILL + AX_VAULT_NICHE_H / 2
    A = mkWH(hwA - 0.5, yN, AX_VAULT_NICHE_W, AX_VAULT_NICHE_H)        // 허공 쪽
    B = mkWH(hwA + AX_VAULT_NICHE_D, yN, AX_VAULT_NICHE_W, AX_VAULT_NICHE_H)  // 깊은 면
  }
  const pos = []
  const quad = (p, q, r, sPt) => { pos.push(...p, ...q, ...r, ...p, ...r, ...sPt) }
  quad(A[0], A[3], A[2], A[1])                          // 앞 마구리
  quad(B[0], B[1], B[2], B[3])                          // 뒤 마구리
  for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; quad(A[j], A[j2], B[j2], B[j]) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  const br = new Brush(g); br.updateMatrixWorld()
  return br
}

//  ── ★기단 칼라(v3) — "접합부가 하나의 덩어리로"(현도) ─────────────────────────
//  ⛔v2의 쐐기 코브(바깥면·폭 1.2)는 밑에서 보면 '대충 얹은' 그림이었다(현도 로컬 적발 — NORMAL 모드
//   스크린샷). 볼트 옆구리 밑끝이 평평하게 끝나고 보가 그 밑을 그냥 지나가 관입 이음선이 다 드러났다.
//  ★칼라 = 볼트 **전폭**(바깥면~안쪽면) 밴드가 받침 자리에서 drop만큼 내려가 받침 몸통을 물고,
//   경로 방향 양옆으로는 ease 길이의 **오목 사분원 경사**로 볼트 밑면에 되붙는다. 밑에서 올려다보면
//   볼트 밑동이 받침을 움켜쥔 한 덩어리로 읽힌다. 보·기둥 공통(§2-D 뿌리 선언은 자리의 받침).
//   윗면은 볼트 밑끝보다 0.4 **안으로 관입**시켜 이음선을 몸속에 숨긴다(깊은 관입 패턴).
//  칼라 단면(u,y) — 검사가 캡 평면성을 재려면 이 단면이 필요하다(사본 금지)
export function collarSection(v, L) {
  const { drop, half } = v.collar
  const hwA = AX_VAULT_ARCH_W / 2
  const uOut = -(hwA + AX_VAULT_SHELL), uIn = hwA + AX_VAULT_JAMB
  const yTop = v.yBot + 0.4, ch = AX_VAULT_CHAMF
  const easeL = Math.max(0, (v.Ls - half) - v.L0), easeR = Math.max(0, v.L1 - (v.Ls + half))
  const d = L - v.Ls
  let dep = drop
  if (Math.abs(d) > half) {
    const [ease, over] = d < 0 ? [easeL, -d - half] : [easeR, d - half]
    dep = ease <= 1e-9 ? drop : drop * Math.sqrt(Math.max(0, 1 - Math.min(1, over / ease) ** 2))
  }
  const yB = yTop - 0.4 - dep
  return [[uOut, yTop], [uOut, yB + ch], [uOut + ch, yB],
          [uIn - ch, yB], [uIn, yB + ch], [uIn, yTop]]
}

export function collarGeo(s, v) {
  const { drop, half } = v.collar
  const hwA = AX_VAULT_ARCH_W / 2
  const uOut = -(hwA + AX_VAULT_SHELL), uIn = hwA + AX_VAULT_JAMB
  const yTop = v.yBot + 0.4                       // 볼트 밑끝 위로 관입 — 이음선을 몸속에 숨긴다
  const ch = AX_VAULT_CHAMF
  //  ★★★v5 정본 — "입구면을 도장 찍으면 닫힌 도형"(현도 2026.08.04).
  //   ⛔v3·v4 사고: 볼트는 `Lc`(코너 회피로 밀린 중심), 칼라는 `Ls`(받침) 중심이라 **최대 2.17 어긋났다**.
  //   그래서 한쪽 끝은 입구면 **밖으로 튀어나오고** 반대쪽은 **안으로 들어갔다**. 현도가 본 그 결함이다.
  //   ★칼라 구간 = **볼트 구간 [L0, L1] 그 자체**. 양 끝 마구리가 볼트 마구리와 같은 평면에 앉으므로
  //   입구·출구 단면이 볼트 Π + 칼라 밴드로 **하나의 닫힌 도형**이 된다.
  //   무는 자리(깊이 최대)는 받침 위에 그대로 두고, **이징 길이만 좌우 비대칭**으로 잡아 양 끝에 닿게 한다.
  //   ★가운데(아치 통로 밑)도 채운다(현도 확정) — 전폭 밴드 하나. 아래에서 보면 한 덩어리다.
  const easeL = Math.max(0, (v.Ls - half) - v.L0)
  const easeR = Math.max(0, v.L1 - (v.Ls + half))
  const depthAt = (L) => {
    const d = L - v.Ls
    if (Math.abs(d) <= half) return drop
    const [ease, over] = d < 0 ? [easeL, -d - half] : [easeR, d - half]
    if (ease <= 1e-9) return drop                 // 끝까지 붙는다(받침이 끝에 가까운 자리)
    const q = Math.min(1, over / ease)
    return drop * Math.sqrt(Math.max(0, 1 - q * q))   // 오목 사분원(코브 문법)
  }
  const Ls = ringLs(s, v)                          // ★스윕과 **같은** 집합 — 겉면이 한 면이 된다
  const sec2d = (L) => collarSection(v, L)
  const _unused = (L) => {
    const yB = yTop - 0.4 - depthAt(L)
    return [[uOut, yTop], [uOut, yB + ch], [uOut + ch, yB],
            [uIn - ch, yB], [uIn, yB + ch], [uIn, yTop]]
  }
  //  ★스윕과 **같은 캡 함수**를 탄다 — 도장 도형이 닫힌 채로 유지된다
  const mk = (L) => { const F = frameAt(s, L)
    return sec2d(L).map(([u, y]) => [F.x + F.m[0] * u * F.scale, y, F.z + F.m[1] * u * F.scale]) }
  const rings = [capRing(s, v, 'entry', sec2d(v.L0)), ...Ls.map(mk), capRing(s, v, 'exit', sec2d(v.L1))]
  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const n = rings[0].length
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1]
    for (let j = 0; j < n; j++) { const j2 = (j + 1) % n; tri(A[j], B[j], B[j2]); tri(A[j], B[j2], A[j2]) }
  }
  const F0 = rings[0], F1 = rings[rings.length - 1]
  for (let k = 1; k + 1 < n; k++) { tri(F0[0], F0[k + 1], F0[k]); tri(F1[0], F1[k], F1[k + 1]) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return orientSolid(g)
}

//  ── 전체 빌드 — 볼트 7기(스윕 − 창 − 감실) + 코브 ──
export function buildAxiomVaults() {
  if (!AX_VAULT_ON) return null
  const { s, list } = vaultSpec()
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const parts = []
  for (const v of list) {
    let acc = new Brush(sweepVault(s, v)); acc.updateMatrixWorld()
    const F = frameAt(s, v.Lc)
    acc = ev.evaluate(acc, frustumBrush(F, v, 'window'), SUBTRACTION); acc.updateMatrixWorld()
    acc = ev.evaluate(acc, frustumBrush(F, v, 'niche'), SUBTRACTION)
    acc.geometry.computeVertexNormals()
    parts.push(acc.geometry)
    parts.push(collarGeo(s, v))   // ★v3 기단 칼라 — 보·기둥 공통
  }
  //  병합
  const tot = parts.reduce((a, g) => a + g.getAttribute('position').count, 0)
  const pos = new Float32Array(tot * 3), nor = new Float32Array(tot * 3)
  let o = 0
  for (const g of parts) {
    pos.set(g.getAttribute('position').array, o); nor.set(g.getAttribute('normal').array, o)
    o += g.getAttribute('position').count * 3
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  return g
}
