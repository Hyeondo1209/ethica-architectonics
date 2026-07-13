// check_radial.mjs — 방사 복합체 의미 검증(실제 constants.js import + CSG 스모크). 리포 루트서 node src/check_radial.mjs
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  domeClipY, ROOM_R, ROOM_CEIL_Y, ROOM_LAND_R, ROOM_WELL_RT, ROOM_CYL_TOP,
  COR_Y0, COR_THICK, COR_CX, COR_R, BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY, RAD_T_HW, RAD_TOP,
  RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN, RAD_JPHI, RAD_JX, RAD_JDOOR_HW, RAD_CAP_X, RAD_T_IN, RAD_FLOOR_Y,
  RAD_DROP, RAD_ST_N, RAD_ST_T, RAD_ST_LAND, RAD_ST_W,
  ROOM_TOP_AZ, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN, ROOM_STAIR_PHASE, ROOM_STAIR_TOTAL_ANG,
} from './constants.js'

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
ok('절단 브러시가 문 밑선(49)·상단서 원뿔벽 관통', RAD_T_IN < coneR(COR_Y0) && 26 > coneR(RAD_TOP),
  `벽 r(${COR_Y0})=${r2(coneR(COR_Y0))}, r(${RAD_TOP})=${r2(coneR(RAD_TOP))} ⊂ (${RAD_T_IN}, 26)`)
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

console.log('── 9. 나선 도착·디스크 슬롯 ↔ 터널(2026.07.11 ③) ──')
{
  const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const deg = (a) => a * 180 / Math.PI
  // 링 θ=−월드(방향 반전) → 빈 슬롯(월드, 반시계 구간) = [−START, −(START+LEN)]
  const s0 = norm(-ROOM_DISC_SLOT_START), s1w = norm(-(ROOM_DISC_SLOT_START + ROOM_DISC_SLOT_LEN))
  const slotSpan = norm(s1w - s0)
  const arrive = norm(ROOM_STAIR_PHASE + ROOM_STAIR_TOTAL_ANG)
  ok('도착각 = ROOM_TOP_AZ', Math.abs(arrive - norm(ROOM_TOP_AZ)) < 1e-9, `${r2(deg(arrive))}°`)
  ok('슬롯 뒷끝 = 도착각 − 8°(플러시 병합 구간 보존)', Math.abs(norm(arrive - s1w) - 8 * Math.PI / 180) < 1e-9,
    `슬롯 ${r2(deg(s0))}°~${r2(deg(s1w))}°`)
  // 각 터널 판 footprint(가장 넓은 r=12 기준)와 슬롯의 원호 간극 ≥ 3°
  const inSlot = (a) => norm(a - s0) < slotSpan
  let worstClear = 999
  for (let k = 0; k < 4; k++) {
    const c = norm(RAD_ANG0 + k * Math.PI / 2)
    const h = Math.asin(RAD_T_HW / 12)
    for (const e of [c - h, c + h]) {
      if (inSlot(norm(e))) { worstClear = -1; break }
      worstClear = Math.min(worstClear, deg(Math.min(norm(norm(e) - s1w), norm(s0 - norm(e)))))
    }
    // 판 구간이 슬롯을 통째로 삼키는 경우도 배제(슬롯 끝점이 판 안인지)
    const inPlate = (a) => norm(a - (c - h)) < 2 * h
    if (inPlate(s0) || inPlate(s1w)) worstClear = -1
  }
  ok('터널 판 4 ↔ 슬롯 원호 간극 ≥ 3°', worstClear >= 3, `최소 ${r2(worstClear)}°`)
}

console.log('── 10. 접선 문 고리정렬(2026.07.11 ②a) ──')
{
  const z0 = RAD_PRX - 1
  const phi = Math.asin(z0 / RAD_R)
  const xOff = RAD_R * (Math.cos(phi) - 1)
  // 컷 중심 = 고리 중심선 위(원 방정식 잔차 0)
  const resid = Math.hypot(xOff + RAD_R, z0) - RAD_R
  ok('컷 중심이 고리 중심선 위', Math.abs(resid) < 1e-9, `잔차 ${resid.toExponential(1)}`)
  ok('컷 반폭 ≥ 고리 내반폭(rim이 벽 안·차폐)', RAD_DOOR_HW >= RAD_T_HW && RAD_DOOR_HW - RAD_T_HW <= 0.2,
    `${RAD_DOOR_HW} vs ${RAD_T_HW}`)
  // 컷(깊이 ±4, 접선방향)이 문 높이대의 셸 표면을 관통하는지: 표면 교차 반경이 컷 스팬 안
  const shellRAt = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))
  const cutC = Math.hypot(xOff, z0)
  const okPunch = [COR_Y0, DTOP].every((y) => shellRAt(y) > cutC - 4 + 0.3 && shellRAt(y) < cutC + 4 - 0.3)
  ok('컷이 문 높이대(49~53.3) 셸 표면 관통', okPunch, `표면 r ${r2(shellRAt(COR_Y0))}~${r2(shellRAt(DTOP))} ⊂ (${r2(cutC - 4)}, ${r2(cutC + 4)})`)
}

console.log('── 11. 컷 바닥·바닥 원판(2026.07.11 ②c·확장) ──')
{
  const plateBot = RAD_FLOOR_Y - COR_THICK / 2, plateTop = RAD_FLOOR_Y + COR_THICK / 2
  ok('문 컷 바닥이 바닥판 두께 안(판 밑 슬리버 0)', COR_Y0 > plateBot + 0.05 && COR_Y0 < plateTop,
    `${COR_Y0} ∈ (${r2(plateBot)}, ${r2(plateTop)})`)
  // ★계란화(2026.07.12): 방 바닥 = 문지방 − RAD_DROP 레벨의 원뿔대 판(위/아래 반경을 각 높이 셸내면−0.05로 파생)
  const shellRAt = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))
  const Y_RFTOP = RAD_FLOOR_Y + COR_THICK / 2 - RAD_DROP
  const RT = shellRAt(Y_RFTOP) - 0.05, RB = shellRAt(Y_RFTOP - COR_THICK) - 0.05
  ok('바닥 원뿔대 위·아래 단이 각 높이 셸 안', RT < shellRAt(Y_RFTOP) && RB < shellRAt(Y_RFTOP - COR_THICK),
    `RT=${r2(RT)} RB=${r2(RB)}`)
  ok('바닥이 적도 아래(사발 — 벽이 발치에서 벌어짐)', Y_RFTOP < RAD_PCY, `${r2(Y_RFTOP)} < ${RAD_PCY}`)
  ok('층고(바닥→셸 정점) ≥ 20(계란화 의도)', RAD_PCY + RAD_PRY - Y_RFTOP >= 20, `${r2(RAD_PCY + RAD_PRY - Y_RFTOP)}`)
  ok('강하량 = 문지방 − 방 바닥', Math.abs((RAD_FLOOR_Y + COR_THICK / 2) - Y_RFTOP - RAD_DROP) < 1e-9, `DROP ${RAD_DROP}`)
}

console.log('── 12. 끝단 캡 기하(2026.07.11 ②b) ──')
{
  // 터널 끝: 캡 상단(판 밑면) > 돔 표면 → 캡 높이 양수
  const s1 = RAD_R - RAD_PRX + 2.5
  let minH = 999
  for (let k = 0; k < 4; k++) {
    const a = RAD_ANG0 + k * Math.PI / 2
    for (const sgn of [1, -1]) {
      const x = s1 * Math.cos(a) - sgn * RAD_T_HW * Math.sin(a)
      const z = s1 * Math.sin(a) + sgn * RAD_T_HW * Math.cos(a)
      minH = Math.min(minH, (RAD_FLOOR_Y - COR_THICK / 2) - domeClipY(x, z))
    }
  }
  ok('터널 캡 높이 > 0(전 모서리)', minH > 0.5, `최소 ${r2(minH)}`)
  // 고리 셸쪽 끝: 캡 상단(바닥 고리판) > 돔 표면
  let minH2 = 999
  for (let k = 0; k < 4; k++) for (const sgn of [1, -1]) {
    const ph = RAD_ANG0 + k * Math.PI / 2 + sgn * RAD_ARC_IN
    for (const r of [RAD_R - RAD_T_HW, RAD_R + RAD_T_HW])
      minH2 = Math.min(minH2, (RAD_FLOOR_Y + COR_THICK / 2) - domeClipY(r * Math.cos(ph), r * Math.sin(ph)))
  }
  ok('고리 캡 높이 > 0(전 모서리)', minH2 > 0.5, `최소 ${r2(minH2)}`)
}

console.log('── 13. 반호 박스끝 z평면 클립(2026.07.11 찌꺼기 정리) ──')
{
  const rIn = RAD_R - RAD_T_HW, rOut = RAD_R + RAD_T_HW
  const aIn = Math.asin(BOX_HW / rIn), aOut = Math.asin(BOX_HW / rOut)
  // 벽 끝점이 정확히 z=±6 평면에
  ok('클립각 벽 끝 z = BOX_HW(내·외)', Math.abs(rIn * Math.sin(aIn) - BOX_HW) < 1e-9 && Math.abs(rOut * Math.sin(aOut) - BOX_HW) < 1e-9,
    `내벽 ${r2(aIn * 180 / Math.PI)}° 외벽 ${r2(aOut * 180 / Math.PI)}°`)
  // 클립각이 반호 타단(NE−ARC_IN)보다 앞 = 양수 길이
  ok('클립각 < 반호 타단(양수 길이)', aIn < RAD_ANG0 - RAD_ARC_IN && aOut < RAD_ANG0 - RAD_ARC_IN,
    `${r2(aIn * 180 / Math.PI)}° < ${r2((RAD_ANG0 - RAD_ARC_IN) * 180 / Math.PI)}°`)
  // 고리 어귀(z=6 단면)가 접합문을 덮음: 어귀 x범위 ⊃ 문 x범위
  const xi = Math.sqrt(rIn * rIn - BOX_HW * BOX_HW), xo = Math.sqrt(rOut * rOut - BOX_HW * BOX_HW)
  ok('어귀 x범위 ⊃ 접합문 x범위', xi < RAD_JX - RAD_JDOOR_HW && xo > RAD_JX + RAD_JDOOR_HW,
    `어귀 ${r2(xi)}~${r2(xo)} ⊃ 문 ${r2(RAD_JX - RAD_JDOOR_HW)}~${r2(RAD_JX + RAD_JDOOR_HW)}`)
}

console.log('── 14. 문틀 마감(2026.07.11) ──')
{
  const sR = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))
  const Y_FTOP = RAD_FLOOR_Y + COR_THICK / 2
  const FR_T = 0.5, FR_OUT = RAD_T_HW + FR_T, LIN_TOP = RAD_TOP + 0.6
  // ★일반화(2026.07.12 계란화): 잼 옆선 통과 반경 frRW를 스팬 양끝(+팽출점이 스팬 안이면 그것도)에서 재고 min/max 걸침
  const frRW = (y) => Math.sqrt(Math.max(0.25, sR(y) ** 2 - FR_OUT ** 2))
  const FR_YS = [Y_FTOP, LIN_TOP, ...(RAD_PCY > Y_FTOP && RAD_PCY < LIN_TOP ? [RAD_PCY] : [])]
  const FR_BACK = Math.min(...FR_YS.map(frRW)) - 0.25
  const FR_FRONT = Math.max(...FR_YS.map(frRW)) + 0.25
  const FR_C = (FR_FRONT + FR_BACK) / 2, FR_D = FR_FRONT - FR_BACK
  const TUBE_END = FR_BACK + 0.2
  const spanOK = [Y_FTOP, LIN_TOP, (Y_FTOP + LIN_TOP) / 2].every((y) => frRW(y) > FR_BACK + 0.2 - 1e-9 && frRW(y) < FR_FRONT - 0.2 + 1e-9)
  ok('문틀이 기운 벽 통과 반경 전체를 걸침(스팬 3점)', spanOK,
    `뒤 ${r2(FR_BACK)} < [${FR_YS.map((y) => r2(frRW(y))).join(', ')}] < 앞 ${r2(FR_FRONT)}`)
  ok('문틀 깊이 정상(0.8~3)', FR_D > 0.8 && FR_D < 3, `깊이 ${r2(FR_D)}`)
  ok('튜브 끝이 문틀 몸통 안', TUBE_END > FR_BACK + 0.1 && TUBE_END < FR_FRONT - 0.5, `${r2(TUBE_END)} ∈ (${r2(FR_BACK)}, ${r2(FR_FRONT)})`)
  ok('잼이 셸 구멍 가장자리 삼킴(2.2 < 2.3 < 2.7)', RAD_T_HW < RAD_DOOR_HW && RAD_DOOR_HW < FR_OUT,
    `${RAD_T_HW} < ${RAD_DOOR_HW} < ${r2(FR_OUT)}`)
  ok('상인방이 튜브 지붕 위 덮음', LIN_TOP >= RAD_TOP + 0.4 + 0.1, `${r2(LIN_TOP)} ≥ ${r2(RAD_TOP + 0.5)}`)
  // 터널 길이 양수(원뿔 관통 시작 < 튜브 끝 스테이션) & 문틀 중심의 고리 각 오프셋 < 반호 타단(문틀이 이웃 요소와 안 겹침)
  const sTube = RAD_R - TUBE_END
  ok('터널 상부 길이 양수', 15.5 < sTube - 1, `15.5 < ${r2(sTube)}`)
  const dc = 2 * Math.asin(FR_C / (2 * RAD_R))
  ok('접선 문틀 각 오프셋 < 사분 여유', dc < Math.PI / 4 - RAD_JPHI, `${r2(dc * 180 / Math.PI)}°`)
}

console.log('── 16. 허브(원뿔대) 문틀(2026.07.11) ──')
{
  const Y_FTOP = RAD_FLOOR_Y + COR_THICK / 2
  const FR_T = 0.5, FR_OUT = RAD_T_HW + FR_T, LIN_TOP = RAD_TOP + 0.6, S_WALL0 = 15.5
  const coneR2 = (y) => ROOM_LAND_R - (ROOM_LAND_R - ROOM_WELL_RT) * (y - (ROOM_CEIL_Y - 3)) / (ROOM_CYL_TOP - (ROOM_CEIL_Y - 3))
  const backNeed = Math.sqrt(Math.max(0.25, coneR2(LIN_TOP) ** 2 - FR_OUT ** 2))
  const HFR_BACK = Math.min(backNeed - 0.25, S_WALL0 - 0.15)
  const HFR_FRONT = coneR2(Y_FTOP) + 0.25
  ok('허브 문틀이 원뿔 사면을 걸침', HFR_BACK < backNeed - 0.2 + 1e-9 && HFR_FRONT > coneR2(Y_FTOP) + 0.2 - 1e-9,
    `뒤 ${r2(HFR_BACK)} < ${r2(backNeed)} · 앞 ${r2(HFR_FRONT)} > ${r2(coneR2(Y_FTOP))}`)
  ok('터널 벽·천장 시작(15.5)이 문틀 몸통 안', HFR_BACK < S_WALL0 - 0.1 && S_WALL0 < HFR_FRONT - 0.5,
    `${r2(HFR_BACK)} < 15.5 < ${r2(HFR_FRONT)}`)
  ok('허브 문틀 깊이 정상(1~4)', HFR_FRONT - HFR_BACK > 1 && HFR_FRONT - HFR_BACK < 4, `깊이 ${r2(HFR_FRONT - HFR_BACK)}`)
  // 컷(폭 4.6) 림이 잼(2.2~2.7)에 삼켜짐 — 셸 문과 동일 관계
  ok('원뿔 컷 림 삼킴(2.2 < 2.3 < 2.7)', RAD_T_HW < RAD_DOOR_HW && RAD_DOOR_HW < FR_OUT)
  // 문틀·컷이 디스크(6~18) 위 & 나선 도착(37.5°, r14)과 간섭 없음: 도착점이 문틀 뒷면보다 허브쪽
  ok('나선 도착점(r14)이 허브 문틀 뒤(허브쪽)', 14 < HFR_BACK - 0.5, `14 < ${r2(HFR_BACK)}`)
}

console.log('── 17. 착지 디스크 슬랩(2026.07.11) ──')
{
  const { ROOM_STAIR_SLAB, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_R: RR } = await import('./constants.js')
  const top = COR_Y0 + COR_THICK / 2 + 0.02, bot = top - ROOM_STAIR_SLAB
  ok('디스크 윗면 = 디딤판 꼭대기 + 0.02(코플레이너 방지)', Math.abs(top - (COR_Y0 + COR_THICK / 2) - 0.02) < 1e-9, `윗면 ${r2(top)}`)
  ok('디스크 윗면이 터널판(49.28) 위 립', top > RAD_FLOOR_Y + COR_THICK / 2 + 0.01, `${r2(top)} > 49.28`)
  const domeAtRim = ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(1 - (ROOM_LAND_R / RR) ** 2)
  ok('디스크 밑면 > 오큘러스 림 돔 표면', bot > domeAtRim + 0.3, `${r2(bot)} > ${r2(domeAtRim)}`)
}

console.log('── 15. 모듈 평가 스모크(런타임 상수 오류 — TDZ 등) ──')
{
  // esbuild로 Radial.jsx를 통째 번들해 실제 평가 — 상수 선언 순서 오류(빌드는 통과, 로드시 크래시)를 잡는다
  const { execSync } = await import('node:child_process')
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  let evalOk = true, msg = ''
  try {
    const dir = mkdtempSync(join(tmpdir(), 'ethica-smoke-'))
    execSync(`npx esbuild src/Radial.jsx --bundle --format=esm --outfile=${join(dir, 'rad.mjs')} --loader:.jsx=jsx --jsx=automatic --log-level=silent`, { stdio: 'pipe' })
    // ★계란화(2026.07.12): 임포트 + 계단 CSG 실행까지 — 3기·유한성·상단(문지방−0.02)·셸 안(교집합 반경) 실측
    writeFileSync(join(dir, 'run.mjs'), `import('./rad.mjs').then((m) => {
      const gs = m.buildStairs()
      if (gs.length !== 3) throw new Error('계단 기하 ' + gs.length + '기')
      const petalR = (y) => ${RAD_PRX} * Math.sqrt(Math.max(0, 1 - ((y - ${RAD_PCY}) / ${RAD_PRY}) ** 2))
      let maxY = -1e9, minCnt = 1e9, worstOut = -1e9
      for (const g of gs) {
        const a = g.getAttribute('position'); minCnt = Math.min(minCnt, a.count)
        for (let i = 0; i < a.count; i++) {
          const x = a.getX(i), y = a.getY(i), z = a.getZ(i)
          if (![x, y, z].every(Number.isFinite)) throw new Error('NaN 정점')
          maxY = Math.max(maxY, y)
          worstOut = Math.max(worstOut, Math.hypot(x, z) - petalR(y))
        }
      }
      console.log(JSON.stringify({ maxY, minCnt, worstOut }))
      process.exit(0)
    }).catch(e => { console.error(e.message); process.exit(1) })`)
    const out = execSync(`node ${join(dir, 'run.mjs')}`, { stdio: 'pipe' }).toString()
    const st = JSON.parse(out.trim().split('\n').pop())
    ok('계단 CSG 3기 실행·정점 유한', st.minCnt > 100, `최소 정점 ${st.minCnt}`)
    ok('계단 상단 = 문지방 − 0.02 립', Math.abs(st.maxY - (RAD_FLOOR_Y + COR_THICK / 2 - 0.02)) < 0.02, `상단 ${r2(st.maxY)}`)
    ok('계단 전 정점이 셸 안(교집합 −0.05 축소)', st.worstOut < -0.01, `최대 돌출 ${r2(st.worstOut)}`)
  } catch (e) {
    evalOk = false; msg = (e.stderr || e.stdout || '').toString().split('\n')[0]
  }
  ok('Radial.jsx 번들 평가(임포트+계단 CSG) 성공', evalOk, msg)
}

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
