// _probe_ceiling.mjs — ★110 진단: 방에서 **위를 볼 때 원판 앞을 가리는 것이 무엇인가**를 광선으로 센다.
//  ⚠눈(셀프 렌더 이미지) 없이 판정하기 위한 도구다. 카메라에서 위쪽 반구로 광선을 쏘고,
//   착지 디스크보다 **가까이서** 맞는 물체를 출처별로 집계한다 = 화면에서 원판 위에 얹혀 보이는 것들.
import * as THREE from 'three'
import { buildSpiralMass, buildSpiralColumns, buildSpiralBeams, beamSpec } from './axiomSpiralGeometry.js'
import {
  ROOM_LAND_R, ROOM_DISC_HOLE, ROOM_STAIR_SLAB, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN,
  COR_Y0, COR_THICK,
} from './constants.js'

const arg = (process.argv[2] || '0.4,75.2,-5.8').split(',').map(Number)
const eye = new THREE.Vector3(arg[0], arg[1], arg[2])

const mk = (g, name) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial()); m.name = name; m.updateMatrixWorld(); return m }
const objs = [
  mk(buildSpiralMass(), '나선 매스'),
  mk(buildSpiralColumns(), '판 기둥'),
  mk(buildSpiralBeams(), '벽 보'),
]
{ // 착지 디스크(REPLICA — Room.jsx 인자 복제)
  const t0 = ROOM_DISC_SLOT_START, t1 = ROOM_DISC_SLOT_START + ROOM_DISC_SLOT_LEN
  const sh = new THREE.Shape()
  sh.absarc(0, 0, ROOM_LAND_R, t0, t1, false)
  sh.absarc(0, 0, ROOM_DISC_HOLE, t1, t0, true)
  const g = new THREE.ExtrudeGeometry(sh, { depth: ROOM_STAIR_SLAB, bevelEnabled: false, curveSegments: 64 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, COR_Y0 + COR_THICK / 2 + 0.02 - ROOM_STAIR_SLAB, 0)
  objs.push(mk(g, '착지 디스크'))
}
for (const o of objs) o.geometry.computeBoundingSphere()

const rc = new THREE.Raycaster()
const dir = new THREE.Vector3()
//  위쪽 반구를 고도 40°~89°에서 조밀하게 훑는다(원판이 보이는 각도대)
const hits = new Map()          // name -> 픽셀 수
const beamAz = []
let discOnly = 0, total = 0
for (let el = 40; el <= 89; el += 0.5) {
  const ce = Math.cos(el * Math.PI / 180), se = Math.sin(el * Math.PI / 180)
  for (let az = 0; az < 360; az += 0.5) {
    dir.set(ce * Math.cos(az * Math.PI / 180), se, ce * Math.sin(az * Math.PI / 180)).normalize()
    rc.set(eye, dir)
    let best = null, bestD = Infinity
    for (const o of objs) {
      const r = rc.intersectObject(o, false)
      if (r.length && r[0].distance < bestD) { bestD = r[0].distance; best = o.name }
    }
    if (!best) continue
    total++
    hits.set(best, (hits.get(best) || 0) + 1)
    if (best === '벽 보') beamAz.push({ az, el })
    if (best === '착지 디스크') discOnly++
  }
}
console.log(`시점 (${eye.x}, ${eye.y}, ${eye.z}) — 고도 40~89° 전방위 광선 ${total}발이 무언가에 맞았다`)
console.log('맨 앞에서 맞은 것(= 화면에서 위에 얹혀 보이는 것):')
for (const [k, v] of [...hits].sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(6)}발  (${(v / total * 100).toFixed(1)}%)`)

//  ★벽 보가 몇 '조각'으로 흩어져 보이는가 — 방위각 군집을 센다
if (beamAz.length) {
  const az = [...new Set(beamAz.map(b => Math.round(b.az)))].sort((a, b) => a - b)
  const groups = []
  let cur = [az[0]]
  for (let i = 1; i < az.length; i++) {
    if (az[i] - az[i - 1] <= 3) cur.push(az[i]); else { groups.push(cur); cur = [az[i]] }
  }
  groups.push(cur)
  if (groups.length > 1 && (360 - groups[groups.length - 1][groups[groups.length - 1].length - 1]) + groups[0][0] <= 3) {
    groups[0] = groups.pop().concat(groups[0])
  }
  console.log(`\n★벽 보가 하늘에 흩어져 보이는 방위 군집: **${groups.length}조각**`)
  groups.forEach((g, i) => console.log(`   ${i + 1}) 방위 ${g[0]}°~${g[g.length - 1]}° (폭 ${g[g.length - 1] - g[0] + 1}°)`))
  console.log(`   ⚠참고: 실제 보 개수 = ${beamSpec().length}`)
}
