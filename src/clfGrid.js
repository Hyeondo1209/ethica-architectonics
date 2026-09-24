// ★★★226 clfGrid.js — 빛 구획 F(회랑) 정점색용 **원시 재격자**(순수 모듈 · three만 의존). CloisterLight가 쓰고 check_lux가 자기검증한다.
//  왜 세분이 아니라 재격자인가(실측 2026.09.24): 회랑 수광 면은 원시 기하의 가늘고 긴 조각이다(안벽 조각 2.09×30.3 · 디딤판 조각 0.006×6.4).
//   변 분할(적록 ★219-w‴ · 최장변 이분 둘 다 시험)은 조각의 나쁜 모양을 물려받아 안벽 한 장이 128 → 165,888 / 231,568장이 됐다.
//   ⇒ geometry.parameters(원통·고리·상자)에서 **같은 면을 규칙 격자로 다시 짓는다**:
//    · 높이·반경 방향 = 평면 방향이라 균등 분할해도 면이 같다(위치 이동 0).
//    · 둘레(θ) 방향 = 원래 조각 폭 > L이면 **현 위에서** 나눈다(면 동일) · 폭 < L이면 원래 θ 점의 부분집합만 쓴다
//      (합쳐진 현의 처짐 = 면 이동 → SAG_MAX 이하일 때만 · 넘으면 원래 조각 그대로).
//  반환 = 색인 BufferGeometry(position·normal) 또는 null(모르는 기하 — 호출자가 대체 경로).
import * as THREE from 'three'

export const CLF_SAG_MAX = 1e-3   // 둘레 성김 허용 처짐(m) — 1mm

//  θ 표본 목록(라디안) — 원래 조각 경계 θ_j에서 출발
function thetaList(t0, tl, segs, r, L) {
  const w = r * tl / segs                                  // 원래 조각 호폭
  const out = []
  if (w > L) { const k = Math.ceil(w / L)                  // 조각마다 k칸 — 현 위 보간이므로 θ가 아니라 **현 매개변수**로 적는다
    for (let j = 0; j < segs; j++) for (let q = 0; q < k; q++) out.push({ j, t: q / k })
    out.push({ j: segs, t: 0 })
    return out }
  let m = Math.max(1, Math.floor(L / w))
  while (m > 1 && r * (1 - Math.cos((m * tl / segs) / 2)) > CLF_SAG_MAX) m--   // 처짐 한도
  for (let j = 0; j < segs; j += m) out.push({ j, t: 0 })
  if (out[out.length - 1].j !== segs) out.push({ j: segs, t: 0 })
  return out
}
//  원래 θ 점 j와 j+1 사이의 현 위 점(매개변수 t) — 반경 r · 좌표 함수 f(θ, r) → [x,y,z]
const chordAt = (f, t0, tl, segs, r, e) => { const a = f(t0 + tl * e.j / segs, r); if (e.t === 0) return a
  const b = f(t0 + tl * (e.j + 1) / segs, r); return [a[0] + (b[0] - a[0]) * e.t, a[1] + (b[1] - a[1]) * e.t, a[2] + (b[2] - a[2]) * e.t] }

function gridGeo(cols, rows, posOf, nrmOf) {
  const P = [], N = [], I = []
  for (let v = 0; v < rows; v++) for (let u = 0; u < cols; u++) { P.push(...posOf(u, v)); N.push(...nrmOf(u, v)) }
  for (let v = 0; v + 1 < rows; v++) for (let u = 0; u + 1 < cols; u++) { const a = v * cols + u, b = a + 1, c = a + cols, d = c + 1; I.push(a, c, b, b, c, d) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setIndex(I); return g
}

export function regridPrimitive(g, L) {
  const p = g.parameters || {}
  if (g.type === 'CylinderGeometry' && p.radiusTop === p.radiusBottom && p.openEnded) {
    const r = p.radiusTop, h = p.height, t0 = p.thetaStart, tl = p.thetaLength, segs = p.radialSegments
    const f = (th, rr) => [rr * Math.sin(th), 0, rr * Math.cos(th)]                   // three CylinderGeometry 규약(x = r·sinθ · z = r·cosθ)
    const th = thetaList(t0, tl, segs, r, L), rows = Math.max(2, Math.ceil(h / L) + 1)
    return gridGeo(th.length, rows, (u, v) => { const q = chordAt(f, t0, tl, segs, r, th[u]); return [q[0], h / 2 - h * v / (rows - 1), q[2]] },
      (u) => { const e = th[u], a = t0 + tl * (e.j + e.t) / segs; return [Math.sin(a), 0, Math.cos(a)] })
  }
  if (g.type === 'RingGeometry') {
    const r0 = p.innerRadius, r1 = p.outerRadius, t0 = p.thetaStart, tl = p.thetaLength, segs = p.thetaSegments
    const f = (th, rr) => [rr * Math.cos(th), rr * Math.sin(th), 0]                  // three RingGeometry 규약(xy 평면 · 법선 +z)
    const th = thetaList(t0, tl, segs, r1, L), rows = Math.max(2, Math.ceil((r1 - r0) / L) + 1)
    //  반경 방향: 같은 θ 줄 위에서 안·바깥 **현 점** 사이를 선형 보간(원래 면의 사다리꼴 안 — 면 동일)
    return gridGeo(th.length, rows, (u, v) => { const a = chordAt(f, t0, tl, segs, r0, th[u]), b = chordAt(f, t0, tl, segs, r1, th[u]), s = v / (rows - 1)
      return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, 0] }, () => [0, 0, 1])
  }
  if (g.type === 'BoxGeometry') {
    const n = (d) => Math.max(1, Math.ceil(d / L))
    return new THREE.BoxGeometry(p.width, p.height, p.depth, n(p.width), n(p.height), n(p.depth))
  }
  return null
}
