// ★219-h _probe_zoneI --verify — 구역 I **전 삼각형** 안팎 판정 ↔ 구운 값 전수 대조 (개발 도구 — 배포·번들 무관)
//  왜: check_lux [520]·[521]이 못 박은 한계 — 가시성 판정은 실제 가림에 전적으로 의존하므로 장면 없는 검사는 기계적 성질만 문다.
//   "어느 면이 실제로 안이고, 안면이면 정말 빛을 받았는가"는 조립된 장면에서 삼각형마다 재야 한다. ★219-g 전까지 이 역할은
//   "면적 ≥4㎡ 검은 면 목록"(사람 눈)이 대신했다 — 여기서 기계 검사로 바꾼다.
//  무엇을 묻나(각 항이 치환으로 반증됨 — 아래 ⛔):
//   Ⓐ 안면인데 어둠(판정은 안면(±1)인데 세 정점 값이 전부 DIM 이하이고, 같은 면 중심을 판정 방향으로 다시 재면 밝다) → 면적 = 0.
//      ⛔반증: ZoneI.jsx bakeMesh의 want 부호를 뒤집으면 ★219-g 이전의 병(70㎡ 벽)이 되살아나 Ⓐ가 붉는다(실측 09.10).
//   Ⓑ 바깥면인데 칠함(판정은 바깥면(0)인데 안면 삼각형과 **정점을 나누지 않는** 정점의 값이 1이 아니다) → 개수 = 0.
//      ⛔반증: 바깥면 복원값(col=1)을 DIM으로 바꾸면 Ⓑ가 붉는다.
//   Ⓒ 안면 정점 값 ↔ 면 중심 재계산 값의 차 분포(정보 — 정점 법선·위치 차이로 0이 아닌 게 정상. 문턱 없음, 보고만).
//  ⚠정직한 경계: 이 대조는 **베이크와 같은 광선 함수·같은 모델**을 쓴다. 광선 함수 자체가 틀리면 둘이 같이 틀린다 — 그 축은 광선 검증(★219 Ⅲ ⓑⓒ 실측)과
//   현도 화면 판정이 맡는다. 여기가 잡는 것은 "판정과 칠이 서로 다른 방향을 본다"는 종류의 병이다.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { ZI_DIM, ZI_UNDER_TREAD_ON, ZI_UNDER_TREAD_D, ZI_RAY_EPS } from './constants.js'
import { zoneIShadeAt, zoneIWallTri, zoneIInteriorPoints, ziToLocal, zoneIPathA, zoneIHoleProfileAt } from './lightingModel.js'

export function verifyZoneI(THREE, H) {
  const { records, rayFn, B } = H
  const EPS = 1e-3, LIT = ZI_DIM + 0.1   // "밝다" = 어둠 바닥에서 0.1 이상 위(안면 최저 채움 0.52·관 속 gl≥0.1 대역과 DIM 0.04 사이)
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const rows = [], Aface = [], Bvert = [], Cface = [], diffs = []; let nSeam = 0
  let nTri = 0, nIn = 0, nOut = 0, nDeg = 0, areaIn = 0, areaOut = 0, areaA = 0, nSwap = 0
  //  ★219-w Ⓗ 판 밑 바닥면 오판 재현 — 위 향 면(감김 법선 y > 0.5 · ziUnderTread 태그 몸)인데 판정이 '아래 실내(−1)' 또는 바깥(0)이고, 위로 쏜 광선이 'tread'에 판 두께 안(수직 ≤ ZI_UNDER_TREAD_D)에서 막히는 삼각형 = 0이어야.
  //   수리 전 실측 = Lookout 램프 59장 177㎡(그 정점 0.04↔1.0 보간 = 아치 둘레 검은 얼룩). 보존계(ZI_UNDER_TREAD_ON=false)에서는 보류(규율 13').
  const Hface = []; let areaH = 0; const ipts = zoneIInteriorPoints(B.spec)   // ★219-p nSwap = 베이크 당시 지오메트리(records.g)와 지금 o.geometry가 다른 메시 수(기대 0 — ★219-o Ⅵ '23s 재생성' 의심의 계측)
  for (const { o, g: g0, triSide } of records) {
    if (g0 && g0 !== o.geometry) nSwap++
    const g = o.geometry, P = g.attributes.position, C = g.attributes.color, I = g.index
    const comp = o.userData.__comp || o.name || '?'
    const idx = (i) => (I ? I.getX(i) : i), nn = I ? I.count : P.count
    //  정점이 안면 삼각형에 속하는가(공유 정점은 Ⓑ에서 제외 — 안면이 그 정점을 칠하는 것이 정상)
    const vIn = new Uint8Array(P.count)
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) if (triSide[t] === 1 || triSide[t] === -1) { vIn[idx(i)] = 1; vIn[idx(i + 1)] = 1; vIn[idx(i + 2)] = 1 }
    //  ★227 명시 예외: 회랑 이음매 패스(CloisterLight)가 쓴 정점 = 회랑 쪽 면(구역 I 기준 바깥면이지만 회랑 실내) — 센다(nSeam)
    const seamSet = new Set(g.userData.clfSeam || [])
    let mIn = 0, mOut = 0, mA = 0, mB = 0, arA = 0
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) {
      nTri++
      const s = triSide[t]
      const ia = idx(i), ib = idx(i + 1), ic = idx(i + 2)
      a.fromBufferAttribute(P, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, ib).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, ic).applyMatrix4(o.matrixWorld)
      const n = b.clone().sub(a).cross(c.clone().sub(a)), ar = n.length() / 2
      if (s === 2) { nDeg++; continue }
      //  ★229 **유효값** = 셰이더와 같은 식(aZiPath 1: 값 × A(u) · 2: DIM+(1−DIM)·min(1, a + 구운 직사)) — 저장값만 읽으면 걷는 판(직사만 구움)이 DIM으로 보여 Ⓐ가 오판한다
      const AZ = g.attributes.aZiPath, eff = (id) => { const c0 = C.getX(id); if (!AZ) return c0; const wW = AZ.getX(id), wT = AZ.getY(id); if (!(wW + wT > 1e-4)) return c0   // ★230 vec3 가중(셰이더와 같은 식)
        const pl = ziToLocal(v.fromBufferAttribute(P, id).applyMatrix4(o.matrixWorld).toArray()), h = zoneIHoleProfileAt(pl), A = zoneIPathA(pl), c1 = c0 * (1 + (A - 1) * Math.min(1, wW)), tT = ZI_DIM + (1 - ZI_DIM) * Math.min(1, (A - ZI_DIM) / (1 - ZI_DIM) + h)
        return c1 + (tT - c1) * Math.min(1, wT) }
      const cols = [eff(ia), eff(ib), eff(ic)]
      if (ZI_UNDER_TREAD_ON && s !== 1 && o.userData.ziUnderTread === true) { const fn = n.clone().normalize(); if (fn.y > 0.5) {   // 감김 법선 위 향인데 위가 실내로 안 잡힘
          const cl = ziToLocal(a.clone().add(b).add(c).multiplyScalar(1 / 3).toArray()), nl = ziToLocal(fn.toArray()), oo = [cl[0] + nl[0] * ZI_RAY_EPS, cl[1] + nl[1] * ZI_RAY_EPS, cl[2] + nl[2] * ZI_RAY_EPS]; let under = false
          for (const q of ipts) { const dx = q[0] - oo[0], dy = q[1] - oo[1], dz = q[2] - oo[2], L = Math.hypot(dx, dy, dz); if (nl[0] * dx + nl[1] * dy + nl[2] * dz <= 0) continue; const h = rayFn(oo, [dx / L, dy / L, dz / L], L - ZI_RAY_EPS); if (h && h.kind === 'tread' && h.dist * (dy / L) <= ZI_UNDER_TREAD_D) { under = true; break } }
          if (under) { areaH += ar; Hface.push({ comp, ar: +ar.toFixed(2), side: s, c: a.clone().add(b).add(c).multiplyScalar(1 / 3).toArray().map((x) => +x.toFixed(2)) }) } } }
      if (s === 0) {
        nOut++; mOut++; areaOut += ar
        for (const [id, col] of [[ia, cols[0]], [ib, cols[1]], [ic, cols[2]]]) { if (!vIn[id] && seamSet.has(id)) { nSeam++; continue } if (!vIn[id] && Math.abs(col - 1) > EPS) { mB++; Bvert.push({ comp, id, col: +col.toFixed(3), p: v.fromBufferAttribute(P, id).applyMatrix4(o.matrixWorld).toArray().map((x) => +x.toFixed(2)) }) } }
        continue
      }
      nIn++; mIn++; areaIn += ar
      n.normalize().multiplyScalar(s)
      const ctr = a.clone().add(b).add(c).multiplyScalar(1 / 3)
      const cw = ctr.toArray(), nw = n.toArray()
      const wall = zoneIWallTri(cw, nw, B.spec) || zoneIWallTri(cw, [-nw[0], -nw[1], -nw[2]], B.spec)
      const ref = wall ? 1 : zoneIShadeAt(cw, nw, rayFn, B)
      const mean = (cols[0] + cols[1] + cols[2]) / 3
      diffs.push(mean - ref)
      if (mean - ref < -0.3 && ar >= 1) Cface.push({ comp, ar: +ar.toFixed(2), mean: +mean.toFixed(3), ref: +ref.toFixed(3), cols: cols.map((x) => +x.toFixed(2)), c: cw.map((x) => +x.toFixed(2)), n: nw.map((x) => +x.toFixed(2)) })
      if (cols.every((x) => x <= ZI_DIM + EPS) && ref > LIT) { if (process.env.ZI_DBG) { const N = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld)
          for (const id of [ia, ib, ic]) { const pw = v.fromBufferAttribute(P, id).applyMatrix4(o.matrixWorld).toArray(), nv = new THREE.Vector3().fromBufferAttribute(N, id).applyMatrix3(nm).normalize().multiplyScalar(s).toArray()
            console.error('  dbg', comp, 'wall', wall, 'v', pw.map((x) => +x.toFixed(2)), 'n', nv.map((x) => +x.toFixed(2)), 'col', +C.getX(id).toFixed(3), 'shade(vtx)', +zoneIShadeAt(pw, nv, rayFn, B).toFixed(3), 'shade(vtx,triN)', +zoneIShadeAt(pw, nw, rayFn, B).toFixed(3)) }
          console.error('  dbg ctr', cw.map((x) => +x.toFixed(2)), 'shade', +zoneIShadeAt(cw, nw, rayFn, B).toFixed(3), 'wall', wall) }
        mA++; arA += ar; areaA += ar; Aface.push({ comp, ar: +ar.toFixed(2), ref: +ref.toFixed(3), c: cw.map((x) => +x.toFixed(2)), n: nw.map((x) => +x.toFixed(2)), side: s }) }
    }
    rows.push({ comp, indexed: !!I, tris: triSide.length, in: mIn, out: mOut, A: mA, arA: +arA.toFixed(2), B: mB })
  }
  if (process.env.ZI_DUMP) { const D = {}; for (const { o } of records) { const g = o.geometry, P = g.attributes.position, C = g.attributes.color, N = g.attributes.normal, nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld)
      const key = (o.userData.__comp || '?') + '|' + P.count + '|' + o.id; const arr = []
      for (let i = 0; i < P.count; i++) { const pw = v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld).toArray().map((x) => +x.toFixed(3)); const nv = new THREE.Vector3().fromBufferAttribute(N, i).applyMatrix3(nm).normalize().toArray().map((x) => +x.toFixed(2)); arr.push([+C.getX(i).toFixed(4), pw, nv]) }
      D[key] = arr }
    require('fs').writeFileSync(process.env.ZI_DUMP, JSON.stringify(D)) }
  diffs.sort((x, y) => x - y)
  const q = (p) => (diffs.length ? +diffs[Math.min(diffs.length - 1, Math.floor(p * diffs.length))].toFixed(3) : null)
  return { nSeam, nH: Hface.length, areaH: +areaH.toFixed(1), Hface: Hface.sort((x, y) => y.ar - x.ar).slice(0, 12), nSwap, nTri, nIn, nOut, nDeg, areaIn: +areaIn.toFixed(1), areaOut: +areaOut.toFixed(1), areaA: +areaA.toFixed(3), nA: Aface.length, nB: Bvert.length,
    diff: { n: diffs.length, p01: q(0.01), p10: q(0.1), p50: q(0.5), p90: q(0.9), p99: q(0.99), min: q(0), max: q(0.999999) }, rows, Aface: Aface.sort((x, y) => y.ar - x.ar).slice(0, 20), Bvert: Bvert.slice(0, 20), Cface: Cface.sort((x, y) => y.ar - x.ar).slice(0, 12), nC: Cface.length }
}
