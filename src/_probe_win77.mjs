// _probe_win77.mjs — ★77 서벽 창 CSG 차분 검사 (실제 불리언을 node에서 돌린다)
//  왜: 검사 V절은 파라미터·불변식만 잰다. "정말 뚫렸는가"는 불리언을 실제로 돌려야 안다.
//  방법: TempleBeam과 **같은 순서**의 축소 모델(부재 → 방 감산 → 창 감산 → 살 유니온)을 세우고,
//   서벽 두께 구간을 점으로 훑어 재료 유무를 센다(포함 판정 · 표본 간격 0.1 — ★75 모델 규율 계승).
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'
import {
  TEMPLE_X0, TEMPLE_X1, TEMPLE_Y0, TEMPLE_HZ, ceilY,
  FR_WALL_T, FR_BACK_T, FR_CEIL_T, FR_FLOOR_Y, FR_ANNEX,
  FR_WIN_ON, FR_WIN_SILL, FR_WIN_HEAD, FR_WIN_HZ,
  FR_WIN_BAR_ON, FR_WIN_BAR_W, FR_WIN_BAR_SET, FR_WIN_BAR_IN, FR_WIN_BAR_BITE,
} from './constants.js'
import { friezeWinBarZ } from './corridorStairsGeometry.js'

const f = (v) => v.toFixed(3)
const ev = new Evaluator(); ev.attributes = ['position', 'normal']

function build(withWin) {
  const beam = new THREE.BoxGeometry(TEMPLE_X1 - TEMPLE_X0, 1, TEMPLE_HZ * 2)
  beam.translate((TEMPLE_X0 + TEMPLE_X1) / 2, TEMPLE_Y0 + 0.5, 0)
  const pos = beam.attributes.position
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > TEMPLE_Y0 + 0.5) pos.setY(i, ceilY(pos.getX(i)) - 0.02)
  beam.computeVertexNormals()
  let acc = new Brush(beam); acc.updateMatrixWorld()

  const rx0 = TEMPLE_X0 + FR_WALL_T, rx1 = TEMPLE_X1 + FR_ANNEX - FR_BACK_T
  const rzh = TEMPLE_HZ - FR_WALL_T
  const room = new THREE.BoxGeometry(rx1 - rx0, 1, rzh * 2)
  room.translate((rx0 + rx1) / 2, FR_FLOOR_Y + 0.5, 0)
  const rp = room.attributes.position
  for (let i = 0; i < rp.count; i++) if (rp.getY(i) > FR_FLOOR_Y + 0.5) rp.setY(i, ceilY(rp.getX(i)) - 0.02 - FR_CEIL_T)
  room.computeVertexNormals()
  let b = new Brush(room); b.updateMatrixWorld()
  acc = ev.evaluate(acc, b, SUBTRACTION)

  if (withWin && FR_WIN_ON) {
    const wx0 = TEMPLE_X0 - 1, wx1 = TEMPLE_X0 + FR_WALL_T + 1
    const cut = new THREE.BoxGeometry(wx1 - wx0, FR_WIN_HEAD - FR_WIN_SILL, FR_WIN_HZ * 2)
    cut.translate((wx0 + wx1) / 2, (FR_WIN_SILL + FR_WIN_HEAD) / 2, 0)
    const bw = new Brush(cut); bw.updateMatrixWorld()
    acc = ev.evaluate(acc, bw, SUBTRACTION)
    if (FR_WIN_BAR_ON) {
      const bx0 = TEMPLE_X0 + FR_WIN_BAR_SET, bx1 = TEMPLE_X0 + FR_WALL_T + FR_WIN_BAR_IN
      const bh = (FR_WIN_HEAD - FR_WIN_SILL) + 2 * FR_WIN_BAR_BITE
      for (const bz of friezeWinBarZ()) {
        const bar = new THREE.BoxGeometry(bx1 - bx0, bh, FR_WIN_BAR_W)
        bar.translate((bx0 + bx1) / 2, (FR_WIN_SILL + FR_WIN_HEAD) / 2, bz)
        const bb = new Brush(bar); bb.updateMatrixWorld()
        acc = ev.evaluate(acc, bb, ADDITION)
      }
    }
  }
  return acc.geometry
}

// 포함 판정 — 축평행 광선 +x 교차 횟수 홀짝 (인덱스 존중: ★64 교훈)
function makeTris(g) {
  const p = g.attributes.position, idx = g.index
  const n = idx ? idx.count : p.count, tris = []
  for (let i = 0; i < n; i += 3) {
    const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2
    tris.push([[p.getX(a), p.getY(a), p.getZ(a)], [p.getX(b), p.getY(b), p.getZ(b)], [p.getX(c), p.getY(c), p.getZ(c)]])
  }
  return tris
}
function inside(tris, P) {
  let cnt = 0
  for (const [A, B, C] of tris) {
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]]
    const hx = 0 * e2[2] - 0 * e2[1], hy = 0 * e2[0] - 1 * e2[2], hz = 1 * e2[1] - 0 * e2[0]
    const a = e1[0] * hx + e1[1] * hy + e1[2] * hz
    if (Math.abs(a) < 1e-12) continue
    const fI = 1 / a, sx = P[0] - A[0], sy = P[1] - A[1], sz = P[2] - A[2]
    const u = fI * (sx * hx + sy * hy + sz * hz)
    if (u < 0 || u > 1) continue
    const qx = sy * e1[2] - sz * e1[1], qy = sz * e1[0] - sx * e1[2], qz = sx * e1[1] - sy * e1[0]
    const v = fI * (1 * qx + 0 * qy + 0 * qz)
    if (v < 0 || u + v > 1) continue
    const t = fI * (e2[0] * qx + e2[1] * qy + e2[2] * qz)
    if (t > 1e-9) cnt++
  }
  return (cnt % 2) === 1
}

const gNo = build(false), gYes = build(true)
const tNo = makeTris(gNo), tYes = makeTris(gYes)
console.log('삼각형 수  창 없음', tNo.length, ' 창 있음', tYes.length)
console.log('NaN 정점   창 있음', [...gYes.attributes.position.array].filter(v => !isFinite(v)).length)

// 서벽 두께 구간(x 264.4 / 265.4 / 266.4)을 창 높이대에서 훑는다
const XS = [TEMPLE_X0 + 0.7, TEMPLE_X0 + 1.5, TEMPLE_X0 + 2.4]   // 살 경계에 정확히 얹히지 않게
let solidNo = 0, solidYes = 0, tot = 0, barHit = 0
const barZ = friezeWinBarZ()
for (const x of XS) {
  for (let y = FR_WIN_SILL + 0.2; y <= FR_WIN_HEAD - 0.2; y += 0.5) {
    for (let z = -FR_WIN_HZ + 0.2; z <= FR_WIN_HZ - 0.2; z += 0.5) {
      tot++
      const onBar = barZ.some(bz => Math.abs(z - bz) <= FR_WIN_BAR_W / 2)
      if (inside(tNo, [x, y, z])) solidNo++
      if (inside(tYes, [x, y, z])) { solidYes++; if (onBar) barHit++ }
    }
  }
}
console.log('\n창 개구 영역 표본', tot)
console.log('  창 없음 → 재료 있음', solidNo, '(' + f(100 * solidNo / tot) + '%)  ← 통째로 벽이라야 정상')
console.log('  창 있음 → 재료 있음', solidYes, '(' + f(100 * solidYes / tot) + '%)  ← 창살 몫만 남아야 정상')
console.log('  그중 창살 자리', barHit, '/', solidYes)
const barSamples = tot * (barZ.length * FR_WIN_BAR_W) / (2 * FR_WIN_HZ)
console.log('  창살 예상 표본 ≈', f(barSamples))
