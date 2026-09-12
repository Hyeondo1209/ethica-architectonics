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
import { ZI_DIM } from './constants.js'
import { zoneIShadeAt, zoneIWallTri } from './lightingModel.js'

export function verifyZoneI(THREE, H) {
  const { records, rayFn, B } = H
  const EPS = 1e-3, LIT = ZI_DIM + 0.1   // "밝다" = 어둠 바닥에서 0.1 이상 위(안면 최저 채움 0.52·관 속 gl≥0.1 대역과 DIM 0.04 사이)
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const rows = [], Aface = [], Bvert = [], Cface = [], diffs = []
  let nTri = 0, nIn = 0, nOut = 0, nDeg = 0, areaIn = 0, areaOut = 0, areaA = 0, nSwap = 0   // ★219-p nSwap = 베이크 당시 지오메트리(records.g)와 지금 o.geometry가 다른 메시 수(기대 0 — ★219-o Ⅵ '23s 재생성' 의심의 계측)
  for (const { o, g: g0, triSide } of records) {
    if (g0 && g0 !== o.geometry) nSwap++
    const g = o.geometry, P = g.attributes.position, C = g.attributes.color, I = g.index
    const comp = o.userData.__comp || o.name || '?'
    const idx = (i) => (I ? I.getX(i) : i), nn = I ? I.count : P.count
    //  정점이 안면 삼각형에 속하는가(공유 정점은 Ⓑ에서 제외 — 안면이 그 정점을 칠하는 것이 정상)
    const vIn = new Uint8Array(P.count)
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) if (triSide[t] === 1 || triSide[t] === -1) { vIn[idx(i)] = 1; vIn[idx(i + 1)] = 1; vIn[idx(i + 2)] = 1 }
    let mIn = 0, mOut = 0, mA = 0, mB = 0, arA = 0
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) {
      nTri++
      const s = triSide[t]
      const ia = idx(i), ib = idx(i + 1), ic = idx(i + 2)
      a.fromBufferAttribute(P, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, ib).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, ic).applyMatrix4(o.matrixWorld)
      const n = b.clone().sub(a).cross(c.clone().sub(a)), ar = n.length() / 2
      if (s === 2) { nDeg++; continue }
      const cols = [C.getX(ia), C.getX(ib), C.getX(ic)]
      if (s === 0) {
        nOut++; mOut++; areaOut += ar
        for (const [id, col] of [[ia, cols[0]], [ib, cols[1]], [ic, cols[2]]]) if (!vIn[id] && Math.abs(col - 1) > EPS) { mB++; Bvert.push({ comp, id, col: +col.toFixed(3), p: v.fromBufferAttribute(P, id).applyMatrix4(o.matrixWorld).toArray().map((x) => +x.toFixed(2)) }) }
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
  return { nSwap, nTri, nIn, nOut, nDeg, areaIn: +areaIn.toFixed(1), areaOut: +areaOut.toFixed(1), areaA: +areaA.toFixed(3), nA: Aface.length, nB: Bvert.length,
    diff: { n: diffs.length, p01: q(0.01), p10: q(0.1), p50: q(0.5), p90: q(0.9), p99: q(0.99), min: q(0), max: q(0.999999) }, rows, Aface: Aface.sort((x, y) => y.ar - x.ar).slice(0, 20), Bvert: Bvert.slice(0, 20), Cface: Cface.sort((x, y) => y.ar - x.ar).slice(0, 12), nC: Cface.length }
}
