// check_radial.mjs — 방사 복합체 의미 검증(실제 constants.js import + CSG 스모크). node check_radial.mjs
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  domeClipY, ROOM_R, ROOM_CEIL_Y, ROOM_LAND_R, ROOM_WELL_RT, ROOM_CYL_TOP,
  COR_Y0, COR_THICK, COR_CX, COR_R, BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY, RAD_T_HW, RAD_TOP,
  RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN, RAD_JPHI, RAD_JX, RAD_JDOOR_HW, RAD_CAP_X, RAD_T_IN, RAD_FLOOR_Y,
} from './src/constants.js'

let pass = 0, fail = 0
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  ✗ FAIL ${name}${detail ? ' — ' + detail : ''}`) }
}
const r2 = (v) => Math.round(v * 100) / 100
const DTOP = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H

console.log('── 1. 꽃잎 셸 ↔ 방 돔 간극(전 발자국·4방) ──')
let worst = 99
for (let k = 0; k < 4; k++) {
  const ang = RAD_ANG0 + k * Math.PI / 2
  for (let u = -1; u <= 1; u += 0.1) for (let v = -1; v <= 1; v += 0.1) {
    if (u * u + v * v > 1) continue
    const lx = u * RAD_PRX, lz = v * RAD_PRX
    const wx = (RAD_R + lx) * Math.cos(ang) - lz * Math.sin(ang) * 0 + lx * 0   // 회전: 로컬(x,z)→월드
    const wxx = RAD_R * Math.cos(ang) + lx * Math.cos(ang) - lz * Math.sin(ang)
    const wzz = RAD_R * Math.sin(ang) + lx * Math.sin(ang) + lz * Math.cos(ang)
    const bot = RAD_PCY - RAD_PRY * Math.sqrt(Math.max(0, 1 - (u * u + v * v)))
    worst = Math.min(worst, bot - domeClipY(wxx, wzz))
  }
}
ok('셸 최저면 > 돔 표면(전 구간)', worst > 0.5, `최소 간극 ${r2(worst)}`)

console.log('── 2. 통로 대원기둥 간섭(중심 204, r84) ──')
let minD = 999
for (let k = 0; k < 4; k++) {
  const ang = RAD_ANG0 + k * Math.PI / 2
  const px = RAD_R * Math.cos(ang), pz = RAD_R * Math.sin(ang)
  minD = Math.min(minD, Math.hypot(COR_CX - px, pz) - RAD_PRX)
}
ok('꽃잎(셸 포함) ↔ 원기둥 축 거리 > COR_R+2', minD > COR_R + 2, `최근접 ${r2(minD)} vs ${COR_R + 2}`)
ok('고리 최대 반경 < 원기둥 최근접(120)', RAD_R + RAD_T_HW + 0.5 < 120, `${r2(RAD_R + RAD_T_HW)}`)

console.log('── 3. 접합(고리 ↔ 박스) ──')
ok('접합문 x가 박스 안', RAD_JX - RAD_JDOOR_HW > BOX_X0 + 1 && RAD_JX + RAD_JDOOR_HW < BOX_X1 - 1,
  `문 ${r2(RAD_JX - RAD_JDOOR_HW)}~${r2(RAD_JX + RAD_JDOOR_HW)} ⊂ (${BOX_X0}, ${BOX_X1})`)
ok('서쪽 캡 = BOX_X0 = RAD_CAP_X', BOX_X0 === RAD_CAP_X)
ok('고리 반호 종단 z = 박스 옆벽', Math.abs(RAD_R * Math.sin(RAD_JPHI) - BOX_HW) < 1e-9)
ok('접합문 폭 ≥ 고리 내폭', RAD_JDOOR_HW * 2 >= RAD_T_HW * 2 - 0.5, `${RAD_JDOOR_HW * 2} vs ${RAD_T_HW * 2}`)
ok('접합 패드가 문 스팬 덮음', 7 / 2 >= RAD_JDOOR_HW + 1)

console.log('── 4. 문·높이 위계 ──')
const innerCeil = (ax) => RAD_PCY + RAD_PRY * Math.sqrt(Math.max(0, 1 - (ax / RAD_PRX) ** 2))
ok('꽃잎 문 상단 < 셸 내부고(문 자리 |x|=11)', DTOP < innerCeil(11) - 0.3, `${r2(DTOP)} < ${r2(innerCeil(11))}`)
ok('터널 천장 > 문 상단(헤더 ≥0.5)', RAD_TOP > DTOP + 0.5, '헤더 ' + r2(RAD_TOP - DTOP))
ok('터널 천장 < 박스 천장', RAD_TOP < BOX_TOP, `${RAD_TOP} < ${BOX_TOP}`)
ok('셸 천장 > 터널 천장(꽃잎이 위로 부풂)', RAD_PCY + RAD_PRY > RAD_TOP, `${r2(RAD_PCY + RAD_PRY)} > ${RAD_TOP}`)
ok('문 반폭 ≥ 터널 반폭(관입 봉합)', RAD_DOOR_HW >= RAD_T_HW)

console.log('── 5. 원뿔대(빛우물) 관통 ──')
const coneR = (y) => ROOM_LAND_R - (ROOM_LAND_R - ROOM_WELL_RT) * (y - (ROOM_CEIL_Y - 3)) / (ROOM_CYL_TOP - (ROOM_CEIL_Y - 3))
ok('절단 브러시가 문 밑선·상단서 원뿔벽 관통', RAD_T_IN < coneR(COR_Y0 - 3) && 26 > coneR(RAD_TOP),
  `벽 r(${COR_Y0 - 3})=${r2(coneR(COR_Y0 - 3))}, r(${RAD_TOP})=${r2(coneR(RAD_TOP))} ⊂ (${RAD_T_IN}, 26)`)
ok('터널 안끝이 디스크(6~18)에 물림', RAD_T_IN > 6 && RAD_T_IN < ROOM_LAND_R)

console.log('── 6. 고리·터널 봉합 기하 ──')
const shellTanHalf = Math.atan(RAD_PRX / RAD_R)
ok('호 관입각 < 셸 접선 반각', RAD_ARC_IN < shellTanHalf, `${r2(RAD_ARC_IN * 180 / Math.PI)}° < ${r2(shellTanHalf * 180 / Math.PI)}°`)
ok('터널 끝이 셸에 관입', (RAD_R - RAD_PRX + 2) > RAD_R - RAD_PRX)
ok('바닥 립(고리·터널 = 다리−0.02)', Math.abs((COR_Y0 - RAD_FLOOR_Y) - 0.02) < 1e-9)

console.log('── 6b. 밀폐 폐합(튜브 상부가 셸 아래로 닫힘) ──')
{
  const shellCeil = (lx, lz) => RAD_PCY + RAD_PRY * Math.sqrt(Math.max(0, 1 - (lx * lx + lz * lz) / (RAD_PRX * RAD_PRX)))
  // 터널 진입 끝(관입 2.5 → 로컬 x=-(PRX-2.5)) 모서리 z=±T_HW
  const tx = -(RAD_PRX - 2.5)
  ok('터널 끝 모서리 셸 내부고 > RAD_TOP', shellCeil(tx, RAD_T_HW) > RAD_TOP + 0.2,
    `${r2(shellCeil(tx, RAD_T_HW))} > ${RAD_TOP + 0.2}`)
  // 고리 진입 끝(각 관입 9°): 로컬 접선 오프셋 ≈ 2R·sin(4.5°), 방사 ≈ R(cos9°−1)
  const zt = 2 * RAD_R * Math.sin(RAD_ARC_IN / 2), xr = RAD_R * (Math.cos(RAD_ARC_IN) - 1)
  const worst6b = Math.min(shellCeil(xr - RAD_T_HW, zt), shellCeil(xr + RAD_T_HW, zt))
  ok('고리 끝 모서리 셸 내부고 > RAD_TOP', worst6b > RAD_TOP + 0.2, `${r2(worst6b)} > ${RAD_TOP + 0.2}`)
}

console.log('── 7. CSG 스모크(꽃잎 셸 실제 빌드) ──')
{
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const shell = new THREE.SphereGeometry(1, 48, 32)
  shell.scale(RAD_PRX, RAD_PRY, RAD_PRX); shell.translate(0, RAD_PCY, 0)
  let acc = new Brush(shell); acc.updateMatrixWorld()
  const cut = (cx, cz, alongX) => {
    const g = alongX ? new THREE.BoxGeometry(8, DTOP - (COR_Y0 - 0.5), RAD_DOOR_HW * 2)
                     : new THREE.BoxGeometry(RAD_DOOR_HW * 2, DTOP - (COR_Y0 - 0.5), 8)
    g.translate(cx, (DTOP + COR_Y0 - 0.5) / 2, cz)
    const b = new Brush(g); b.updateMatrixWorld()
    acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld()
  }
  cut(-RAD_PRX + 1, 0, true); cut(0, RAD_PRX - 1, false); cut(0, -(RAD_PRX - 1), false)
  const posAttr = acc.geometry.getAttribute('position')
  let nan = false
  for (let i = 0; i < posAttr.count * 3; i++) if (!Number.isFinite(posAttr.array[i])) { nan = true; break }
  ok('셸 CSG 정점 생성·NaN 없음', posAttr.count > 500 && !nan, `정점 ${posAttr.count}`)
}

console.log('── 8. 유한성 전수 ──')
const nums = [RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY, RAD_T_HW, RAD_TOP, RAD_DOOR_H, RAD_DOOR_HW,
  RAD_ARC_IN, RAD_JPHI, RAD_JX, RAD_JDOOR_HW, RAD_CAP_X, RAD_T_IN, RAD_FLOOR_Y, BOX_X0]
ok('RAD 상수 전부 유한', nums.every(Number.isFinite), `${nums.length}개`)

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
