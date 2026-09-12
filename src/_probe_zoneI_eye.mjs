// ★219-p _probe_zoneI --eye — 무릎길 **눈-가시성** 실측 (개발 도구 — 배포·번들 무관)
//  왜: ★219-i~o Ⅵ "무릎길 얼룩" — 부재 안/밖 판정은 실내 대표점(zoneIInteriorPoints) 가시성인데 무릎길 복도에 대표점이 없다.
//   지난 세션 시험(중심선 31점)은 화면 미확인·미전달로 끝났고, 눈-가시성 프로브는 두 번 틀렸다(① 제 소프를 따로 짜서 디딤판 인스턴스 누락 ② 타임아웃).
//   ⇒ 이번엔 **베이크가 쓴 광선 함수(rayFn · 인스턴스 포함 소프)와 기록(records)을 그대로** 받아 잰다 — 소프를 다시 짜지 않는다.
//  무엇을 묻나:
//   Ⓔ0 눈 경로 자기검사 — 눈(보행면 + EYE · z=0·±zOff) 아래로 쏘면 EYE±0.6 안에 걷는 면(tread/body)이 있고, 위로 쏘면 몸이 있다(관 속). 하나라도 어긋나면 경로가 틀린 것 — 그 뒤 수치는 안 믿는다.
//   Ⓔ1 판정 '바깥면(0)'인데 눈에서 보이는 삼각형 (= 얼룩 후보 · 흰색 복원값 1.0으로 남는 면) — 개수·면적·y 분포·부재별.
//   Ⓔ2 판정 '안면(±1)'인데 어느 눈에서도 안 보이는 삼각형 (정보 — 관 축 대표점으로만 보이는 면 · 병 아님).
//   Ⓔ3 눈에 보이는 삼각형 중 판정 안면 비율 = 현재 판정이 보행자 시야를 얼마나 덮는가.
//  가시성 어법 = lightingModel.zoneIVisibleFromInside와 **같은 식**(면 중심 양쪽 ε · 등진 점 제외 · 막힘 없이 닿으면 보임) — 표적만 대표점 → 눈.
import { zoneIVisibleFromInside, ziToLocal } from './lightingModel.js'
import { kneeSurfaceY, KNEE_XA, KNEE_XB } from './kneeStair.js'
import { EYE } from './waypoints.js'

export function eyePathLocal({ step = 1.0, zOff = 0.5 } = {}) {
  const eyes = []
  for (let x = KNEE_XB; x <= KNEE_XA + 1e-9; x += step) { const y = kneeSurfaceY(x) + EYE; for (const z of [0, -zOff, zOff]) eyes.push([x, y, z]) }
  return eyes
}

export function eyeProbe(THREE, H, { comps = ['KneeWalk', 'JunctionLanding', 'Lookout', 'RibJunction'], step = 1.0, zOff = 0.5, yBucket = 5 } = {}) {
  const { records, rayFn, B } = H
  const eyes = eyePathLocal({ step, zOff })
  //  Ⓔ0 자기검사
  const self = { n: eyes.length, badDown: [], badUp: [] }
  for (const e of eyes) {
    const hd = rayFn(e, [0, -1, 0], EYE + 0.6)
    if (!hd || Math.abs(hd.dist - EYE) > 0.6) self.badDown.push({ e: e.map((x) => +x.toFixed(2)), hit: hd ? { d: +hd.dist.toFixed(2), k: hd.kind } : null })
    const hu = rayFn(e, [0, 1, 0], 30)
    if (!hu) self.badUp.push({ e: e.map((x) => +x.toFixed(2)) })
  }
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const rows = [], E1 = [], byY = {}
  let nE1 = 0, arE1 = 0, nE2 = 0, arE2 = 0, nVis = 0, nVisIn = 0
  for (const { o, triSide } of records) {
    const comp = o.userData.__comp || o.name || '?'
    if (!comps.includes(comp)) continue
    if (o.userData.walkable === true) continue   // 걷는 면(참)은 이미 1.0 — 벽·몸만
    const g = o.geometry, P = g.attributes.position, I = g.index
    const idx = (i) => (I ? I.getX(i) : i), nn = I ? I.count : P.count
    let mVis = 0, mVisIn = 0, mE1 = 0, mE2 = 0, arM1 = 0
    for (let t = 0, i = 0; i + 2 < nn; i += 3, t++) {
      const s = triSide[t]; if (s === 2) continue
      a.fromBufferAttribute(P, idx(i)).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(P, idx(i + 1)).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(P, idx(i + 2)).applyMatrix4(o.matrixWorld)
      const n = b.clone().sub(a).cross(c.clone().sub(a)), ar = n.length() / 2; if (ar < 1e-9) continue; n.normalize()
      const cw = [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3]
      const vis = zoneIVisibleFromInside(cw, [n.x, n.y, n.z], rayFn, eyes, B.spec)
      if (vis.inward) { mVis++; if (s !== 0) mVisIn++ }
      if (s === 0 && vis.inward) { mE1++; arM1 += ar; const yb = Math.floor(cw[1] / yBucket) * yBucket; byY[yb] = (byY[yb] || 0) + ar
        if (E1.length < 4000) E1.push({ comp, ar: +ar.toFixed(2), c: cw.map((x) => +x.toFixed(2)), cl: ziToLocal(cw).map((x) => +x.toFixed(2)), n: [n.x, n.y, n.z].map((x) => +x.toFixed(2)), side: vis.side }) }
      if (s !== 0 && !vis.inward) { mE2++; arE2 += ar }
    }
    rows.push({ comp, tris: nn / 3, vis: mVis, visIn: mVisIn, E1: mE1, arE1: +arM1.toFixed(1), E2: mE2 })
    nE1 += mE1; arE1 += arM1; nE2 += mE2; nVis += mVis; nVisIn += mVisIn
  }
  const byYRows = Object.entries(byY).map(([y, ar]) => ({ y: +y, ar: +ar.toFixed(1) })).sort((p, q) => p.y - q.y)
  return { eyes: eyes.length, step, zOff, self, rows, nE1, arE1: +arE1.toFixed(1), nE2, arE2: +arE2.toFixed(1), nVis, nVisIn, byY: byYRows, E1 }
}
