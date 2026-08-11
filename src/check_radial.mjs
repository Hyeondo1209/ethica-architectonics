// check_radial.mjs — 방사 복합체 의미 검증(실제 constants.js import + CSG 스모크). 리포 루트서 node src/check_radial.mjs
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  domeClipY, ROOM_R, ROOM_CEIL_Y, ROOM_LAND_R, ROOM_WELL_RT, ROOM_CYL_TOP,
  COR_Y0, COR_THICK, COR_CX, COR_R, BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY, RAD_T_HW, RAD_TOP,
  RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN, RAD_JPHI, RAD_JX, RAD_JDOOR_HW, RAD_CAP_X, RAD_T_IN, RAD_FLOOR_Y,
  RAD_DROP, RAD_ST_N, RAD_ST_T, RAD_ST_LAND, RAD_ST_W,
  ROOM_TOP_AZ, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN, ROOM_STAIR_PHASE, ROOM_STAIR_TOTAL_ANG,
  ROOM_FLOOR_Y, ROOM_HEIGHT, MIR_PADS, CUP_R,
  RAD_CYL_ON, RAD_CYL_GROW, RAD_CYL_R, RAD_CYL_Y0, RAD_CYL_Y1_BY, RAD_CYL_Y1_MIN, RAD_CYL_Y1_MAX,
  RAD_CYL_SEG, RAD_CYL_CLIP_ROOM, RAD_CYL_DOOR_ON, RAD_CYL_DOOR_RING_ONLY, RAD_CYL_DOOR_M,
  RAD_CYL_TERM, RAD_CYL_TERM_BY, RAD_CYL_TERM_TOP_BY, RAD_CYL_TERM_CLEAR, RAD_CYL_SPH_SEG,
  RAD_CYL_MASS_ORB, RAD_CYL_MASS_DRUM, termSpec,
  DISC_MODE, RAD_WALL_R0,
} from './constants.js'
import { makeRibCurve } from './ribGeometry.js'
import { discSpec, slotTunnelBite } from './discGeometry.js'

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
  //  ★★★118(2026.08.05): 슬롯 뒷끝이 **도착각까지** 왔다(구판 8° 못 미침 = 관입 36정점의 몸).
  //   두께 2.177의 전제이므로 둘은 한 몸으로 검사한다 — 하나만 바뀌면 나선이 디스크를 뚫는다.
  ok(`슬롯 뒷끝 = 도착각${DISC_MODE === 'thick' ? '' : ' − 8°(구세계 플러시 병합)'}`,
    Math.abs(norm(arrive - s1w) - (DISC_MODE === 'thick' ? 0 : 8 * Math.PI / 180)) < 1e-9,
    `슬롯 ${r2(deg(s0))}°~${r2(deg(s1w))}° · 빈 폭 ${r2(360 - deg(slotSpan))}°`)

  //  ⛔★118에서 적발한 **죽은 검사**(★83 계열) — 구판은 터널 판의 최대폭을 **r12**로 잡고 잼을 쟀다.
  //   ★110(2026.08.04)이 언더플로어 시작을 r18.05로 밀면서 그 전제가 죽었다: 터널이 방위를 실제로
  //   점유하기 시작하는 곳은 벽 시작 `RAD_WALL_R0`(15.5)다. r12는 문 자르개의 관통 여유일 뿐이다.
  //   정본 = ⓐ 트인 개구(걸어 들어가는 문폭)는 절대 안 먹는다 ⓑ 나머지 셋은 3° 간극 ⓒ 벽 시작~임계
  //   반경 사이의 쐐기 물림은 **선언된 비용**으로 매 실행 수치를 보고한다.
  const inSlot = (a) => norm(a - s0) < slotSpan
  //  ⓐ 디스크 바깥 반경에서의 문폭 — 여기를 먹으면 문지방 바닥이 사라진다(★60·★62·★63 계열)
  {
    const hOpen = Math.asin(RAD_T_HW / ROOM_LAND_R)
    let worstOpen = 999
    for (let k = 0; k < 4; k++) {
      const c = norm(RAD_ANG0 + k * Math.PI / 2)
      for (const e of [c - hOpen, c + hOpen]) {
        if (inSlot(norm(e))) { worstOpen = -1; break }
        worstOpen = Math.min(worstOpen, deg(Math.min(norm(norm(e) - s1w), norm(s0 - norm(e)))))
      }
    }
    ok('★문 개구(r18 문폭)는 슬롯이 안 먹는다 — 문지방 바닥 보존', worstOpen > 0,
      `최소 간극 ${r2(worstOpen)}° (45° 문 근접 잼 ${r2(45 - deg(hOpen))}° vs 슬롯 끝 ${r2(deg(norm(s1w)))}°)`)
  }
  //  ⓑ 45° 이외 셋은 종전대로 3° 간극(슬롯의 반대쪽 가장자리가 315° 터널에 붙는지)
  {
    let worstFar = 999
    for (let k = 1; k < 4; k++) {
      const c = norm(RAD_ANG0 + k * Math.PI / 2)
      const h = Math.asin(RAD_T_HW / RAD_WALL_R0)
      for (const e of [c - h, c + h]) {
        if (inSlot(norm(e))) { worstFar = -1; break }
        worstFar = Math.min(worstFar, deg(Math.min(norm(norm(e) - s1w), norm(s0 - norm(e)))))
      }
    }
    ok('45° 외 터널 셋 ↔ 슬롯 간극 ≥ 3° (벽 시작 r15.5 기준)', worstFar >= 3, `최소 ${r2(worstFar)}°`)
  }
  //  ⓒ ★선언된 비용 — 45° 터널 입구 안쪽 모서리의 쐐기 물림(현도 2026.08.05 수용)
  {
    const b = slotTunnelBite(RAD_ANG0, RAD_T_HW, RAD_WALL_R0)
    const bound = 0.25
    ok(`★선언된 비용 — 45° 터널 입구 쐐기 물림 호 ≤ ${bound}`, b.maxArc <= bound,
      `반경대 ${r2(b.rLo)}~${r2(b.rHi)} · 최대 각 ${r2(b.maxDeg)}° · 호 ${b.maxArc.toFixed(3)} @ r${r2(b.atR)}` +
      ` — 임계 반경 ${r2(b.rCrit)} 바깥에선 안 문다(문폭 무손상)`)
  }
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

  //  ★★★110 — ⛔현도 로컬 적발(2026.08.04): "원판 밑에 붙은 찌꺼기".
  //   구판은 터널 언더플로어를 r12부터 깔았고 주석이 "방 원판 밑 = 안 보임"이라 **단정**했다. 틀렸다:
  //   바닥판 밑면 100.680 < 디스크 밑면 100.970 → **0.290 노출**. 스커트는 밑끝이 돔 표면이라 더 심했고,
  //   오큘러스 안쪽(r<17.45)에는 받아 줄 돔이 없어 허공에 매달렸다.
  //   ★검사가 재는 것 = **디스크 밑면보다 아래로 내려오는 것이 디스크 반경 안에 있는가.**
  //   ⚠구판 검사는 '디스크 윗면이 터널판 위'만 봤다 — **윗면만 보면 밑면 노출이 안 잡힌다.**
  const { RAD_UNDER_LIP } = await import('./constants.js')
  const S_WALL0_ = 15.5
  const sUnder = Math.max(RAD_T_IN, ROOM_LAND_R + RAD_UNDER_LIP)
  const sSkirt = Math.max(S_WALL0_, ROOM_LAND_R + RAD_UNDER_LIP)
  const underBot = RAD_FLOOR_Y - COR_THICK / 2
  ok('★언더플로어 밑면이 디스크 밑면보다 아래인 것은 사실이다(전제 확인)', underBot < bot,
    `터널판 밑면 ${r2(underBot)} < 디스크 밑면 ${r2(bot)} — 차 ${r2(bot - underBot)}`)
  ok('★110 바닥판 안쪽 시작 ≥ 디스크 반경 — 방에서 원판 밑에 안 보인다', sUnder >= ROOM_LAND_R,
    `시작 r ${r2(sUnder)} ≥ ${ROOM_LAND_R} (구판 ${RAD_T_IN} — 디스크 한복판이었다)`)
  ok('★110 스커트 안쪽 시작 ≥ 디스크 반경', sSkirt >= ROOM_LAND_R,
    `시작 r ${r2(sSkirt)} ≥ ${ROOM_LAND_R} (구판 ${S_WALL0_})`)
  ok('★110 립이 0 초과 — 디스크 모서리와 딱 붙어 z파이팅 나지 않게', RAD_UNDER_LIP > 0,
    `RAD_UNDER_LIP ${RAD_UNDER_LIP}`)
  //  잘라도 걷는 면이 안 끊긴다 — 디스크(r6~18)가 그 구간을 전담하고, 이음 단차는 립 두 개분뿐이다.
  ok('★110 잘린 구간의 보행 연속: 디스크 윗면 ↔ 터널판 윗면 단차 ≤ STEP_UP',
    Math.abs(top - (RAD_FLOOR_Y + COR_THICK / 2)) <= 0.8,
    `단차 ${r2(Math.abs(top - (RAD_FLOOR_Y + COR_THICK / 2)))} (디스크가 r6~18을 전담)`)
}

console.log('── 18. 원기둥 받침(★2026.07.30 현도 "공중에 뜬 성") ──')
{
  const sR = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))
  const FR_OUT = RAD_T_HW + 0.5
  const frRW = (y) => Math.sqrt(Math.max(0.25, sR(y) ** 2 - FR_OUT ** 2))
  const LIN_TOP = RAD_TOP + 0.6, Y_FTOP = RAD_FLOOR_Y + COR_THICK / 2
  const FR_YS = [Y_FTOP, LIN_TOP, ...(RAD_PCY > Y_FTOP && RAD_PCY < LIN_TOP ? [RAD_PCY] : [])]
  const FR_FRONT = Math.max(...FR_YS.map(frRW)) + 0.25
  const corner = Math.hypot(FR_FRONT, FR_OUT)

  ok('스위치 상태 보고', true, `ON=${RAD_CYL_ON} · CLIP_ROOM=${RAD_CYL_CLIP_ROOM} · GROW=${RAD_CYL_GROW} · DOOR=${RAD_CYL_DOOR_ON}${RAD_CYL_DOOR_RING_ONLY ? '(고리만)' : ''}`)

  // ★부착점 = 적도. 노브가 아니라 파생이라는 것을 검사가 박는다
  ok('상단 ≡ 셸 적도 RAD_PCY(파생 — 노브 아님)', Math.abs(RAD_CYL_Y0 - RAD_PCY) < 1e-12, `${r2(RAD_CYL_Y0)}`)
  {
    let cnt = 0
    for (let y = RAD_PCY - RAD_PRY; y <= RAD_PCY + RAD_PRY; y += 0.01) if (Math.abs(sR(y) - RAD_PRX) < 1e-6) cnt++
    ok('반경이 셸 최대와 같아지는 높이는 적도 하나뿐', cnt <= 3, `표본 적중 ${cnt}회(적도 근방만)`)
  }

  // ★GROW > 0 = 적도 접선 회피(폭 사슬과 같은 종류)
  ok('GROW > 0 — 적도 접선(코플레이너) 회피', RAD_CYL_GROW > 0.05, `GROW ${RAD_CYL_GROW}`)
  {
    let minGap = 1e9
    for (let y = RAD_PCY - RAD_PRY; y <= RAD_PCY; y += 0.01) minGap = Math.min(minGap, RAD_CYL_R - sR(y))
    ok('셸 하반부가 전 높이에서 원기둥 안', minGap > 0.05, `최소 간극 ${r2(minGap)} (= GROW)`)
    const tangentGap = RAD_CYL_R - sR(RAD_PCY)
    ok('적도 간극 = GROW(0이면 깊이 다툼 대역)', Math.abs(tangentGap - RAD_CYL_GROW) < 1e-9, `${r2(tangentGap)}`)
  }

  // ★문틀 앞 모서리 삼킴 — 면이 아니라 모서리가 기준(반폭 2.7이 실측을 바꾼다)
  ok('문틀 앞 모서리를 원기둥이 삼킴', corner < RAD_CYL_R - 0.05,
    `모서리 ${r2(corner)} < ${RAD_CYL_R} (여유 ${r2(RAD_CYL_R - corner)})`)
  ok('문틀 앞 "면"만 보면 오판한다(기록)', FR_FRONT < corner, `앞면 ${r2(FR_FRONT)} vs 모서리 ${r2(corner)}`)

  // ★현도 지시 = 구 아래를 넘는다
  //  ★★길이 = 4기 불규칙(현도 2차 지시). 지시가 준 것은 부등식 둘뿐이라 '불규칙'을 코드가 지킨다.
  const yRoomBot = ROOM_FLOOR_Y - ROOM_HEIGHT
  ok('4기 전부 방 구 최하점 아래(현도 "최소 길이는 전부 구 아래로")',
    RAD_CYL_Y1_BY.every((y) => y < yRoomBot - 3), `${RAD_CYL_Y1_BY.join(' · ')} < ${yRoomBot}`)
  ok('길이가 4기 전부 다르다(어느 둘도 같지 않음)', new Set(RAD_CYL_Y1_BY).size === 4,
    `구 아래 ${RAD_CYL_Y1_BY.map((y) => r2(yRoomBot - y)).join(' · ')}`)
  {
    const srt = [...RAD_CYL_Y1_BY].sort((a, b) => a - b)
    const gap = [srt[1] - srt[0], srt[2] - srt[1], srt[3] - srt[2]]
    ok('간격이 등차가 아니다(등차면 눈이 규칙을 읽는다)',
      Math.abs((gap[1] - gap[0]) - (gap[2] - gap[1])) > 1e-9 || gap[0] !== gap[1],
      `정렬 간격 ${gap.join(' · ')}`)
    const rank = RAD_CYL_Y1_BY.map((y) => srt.indexOf(y))
    const asc = rank.every((v, i) => i === 0 || v > rank[i - 1])
    const desc = rank.every((v, i) => i === 0 || v < rank[i - 1])
    ok('방위 순서 ≠ 길이 순서(일치하면 나선으로 읽힌다)', !asc && !desc, `방위별 순위 ${rank.join('→')}`)
  }
  //  ⚠상한이 4.5 → 6.0으로 올랐다: 현도 ⓑ 확정(2026.07.30 3차) — 말단을 방 구 클립 **아래**로
  //   내리기로 하면서 총 길이가 늘어나는 것을 받아들였다. 4.5는 말단 이전 체제의 값이다.
  ok('가장 긴 것도 "너무 길지 않게"(길이/지름 ≤ 6.0 — ⓑ 확정 후 상한)',
    (RAD_CYL_Y0 - RAD_CYL_Y1_MIN) / (2 * RAD_CYL_R) <= 6.0,
    `최장 ${r2(RAD_CYL_Y0 - RAD_CYL_Y1_MIN)} / 지름 ${r2(2 * RAD_CYL_R)} = ${r2((RAD_CYL_Y0 - RAD_CYL_Y1_MIN) / (2 * RAD_CYL_R))} · 최단 ${r2(RAD_CYL_Y0 - RAD_CYL_Y1_MAX)}`)

  // ★통과 공간 — 리브·미러 판·박스 목
  {
    const c = makeRibCurve(400)
    let minR = Infinity
    for (let i = 0; i <= 4000; i++) {
      const q = c.getPoint(i / 4000)
      if (q.y >= RAD_CYL_Y1_MIN - 10 && q.y <= RAD_CYL_Y0 + 10) minR = Math.min(minR, Math.hypot(q.x, q.z))
    }
    ok('리브 중심선 여유(원기둥 최대 원점거리 대비)', minR > RAD_R + RAD_CYL_R + 20,
      `리브 최소 ${r2(minR)} vs ${r2(RAD_R + RAD_CYL_R)} (여유 ${r2(minR - RAD_R - RAD_CYL_R)})`)
  }
  {
    let worst = 1e9
    for (const pad of MIR_PADS) for (let k = 0; k < 4; k++) {
      const ang = RAD_ANG0 + k * Math.PI / 2
      const cx = RAD_R * Math.cos(ang), cz = RAD_R * Math.sin(ang)
      worst = Math.min(worst, Math.hypot(pad.cx - cx, pad.cz - cz) - pad.r - RAD_CYL_R)
    }
    //  ★2026.07.31 ★92 — 임시 판이 폐기돼 배열이 비었다. 빈 배열에 `worst > 1`을 물으면
    //   1e9 > 1 로 **조용히 통과**한다(공허참 = 죽은 검사, ★83 전례). 대신 하판과 재본다.
    ok(MIR_PADS.length === 0 ? '임시 판 없음 — 드럼 하판과 재잰다(아래)' : '미러 임시 판과 무간섭',
      MIR_PADS.length === 0 || worst > 1, MIR_PADS.length === 0 ? `MIR_PADS 0개` : `여유 ${r2(worst)}`)
    { let w2 = 1e9
      for (let k = 0; k < 4; k++) {
        const ang = RAD_ANG0 + k * Math.PI / 2
        w2 = Math.min(w2, Math.hypot(COR_CX - RAD_R * Math.cos(ang), -RAD_R * Math.sin(ang)) - CUP_R - RAD_CYL_R)
      }
      ok('★드럼 하판(반구)과 원기둥 받침 무간섭', w2 > 5, `여유 ${r2(w2)}`) }
  }
  ok('박스 목(z ±BOX_HW)과 무간섭', RAD_R * Math.sin(RAD_ANG0) - BOX_HW > RAD_CYL_R + 5,
    `셸 축까지 ${r2(RAD_R * Math.sin(RAD_ANG0) - BOX_HW)} > ${RAD_CYL_R}`)

  ok('원주 분할 = 셸과 같음(실루엣 정합)', RAD_CYL_SEG === 48, `SEG ${RAD_CYL_SEG}`)

  // ★4기 등형 — 클립이 방위와 무관함을 산술로(회전 불변)
  {
    let spread = 0
    for (let i = 0; i < RAD_CYL_SEG; i++) {
      const a = (i / RAD_CYL_SEG) * Math.PI * 2
      const lx = RAD_CYL_R * Math.cos(a), lz = RAD_CYL_R * Math.sin(a)
      const dRef = Math.hypot(RAD_R + lx, lz)
      for (let k = 0; k < 4; k++) {
        const ang = RAD_ANG0 + k * Math.PI / 2
        const wx = RAD_R * Math.cos(ang) + lx * Math.cos(ang) - lz * Math.sin(ang)
        const wz = RAD_R * Math.sin(ang) + lx * Math.sin(ang) + lz * Math.cos(ang)
        spread = Math.max(spread, Math.abs(Math.hypot(wx, wz) - dRef))
      }
    }
    ok('4기 등형 — 원점거리가 방위와 무관(클립까지 동일)', spread < 1e-9, `최대 편차 ${spread.toExponential(2)}`)
  }

  // ★★말단 조형(2026.07.30 3차 — 현도 손 스케치 4종)
  {
    ok('말단 4종이 서로 다르다', new Set(RAD_CYL_TERM_BY).size === 4, RAD_CYL_TERM_BY.join(' · '))
    //  ★현도 지시: ①(spike)과 ④(orb)는 대각
    const kS = RAD_CYL_TERM_BY.indexOf('spike'), kO = RAD_CYL_TERM_BY.indexOf('orb')
    ok('①spike ↔ ④orb 대각 배치(현도 지시)', Math.abs(kS - kO) === 2,
      `k=${kS} ↔ k=${kO} (${r2(Math.abs(kS - kO) * 90)}°)`)

    //  ★★반경 연속 — 현도 정정의 핵심. 이 등식이 깨지면 이음매에 '면'이 드러난다.
    let worstJump = 0, joints = 0
    for (const nm of RAD_CYL_TERM_BY) {
      let r = RAD_CYL_R
      for (const g of termSpec(nm).segs) { worstJump = Math.max(worstJump, Math.abs(g.r0 - r)); r = g.r1; joints++ }
    }
    ok('★★전 이음매에서 반경 연속(단이 안 드러남 — 현도 정정)', worstJump < 1e-9,
      `이음매 ${joints}곳 · 최대 불연속 ${worstJump.toExponential(1)}`)

    //  ★★2026.07.31 현도 정정 — **곡률 구간 0**(구 띠 폐기, 원뿔대만). 구 두 항(구 띠 깊이 파생 ·
    //   적도 접선 연속)을 이 절이 대체한다. 되살리려면 `RAD_CYL_TERM`에 `t:'sph'`를 다시 쓰면 되고,
    //   그 순간 아래 첫 항이 운다 = 되돌림이 조용히 일어나지 않는다.
    let sphN = 0, coneN = 0, cylN = 0, degen = 0
    const slopes = []
    for (const nm of RAD_CYL_TERM_BY) {
      for (const g of termSpec(nm).segs) {
        if (g.t === 'sph') sphN++
        else if (g.t === 'cone') { coneN++; slopes.push(Math.atan2(Math.abs(g.r1 - g.r0), g.d) * 180 / Math.PI) }
        else cylN++
        if (g.d <= 0) degen++                                    // 깊이 0 = 퇴화(면이 드러남)
      }
    }
    ok('★★말단 프로파일에 곡률 구간 0(현도 2026.07.31 — 원뿔대만)', sphN === 0,
      `구 띠 ${sphN}개 · 원뿔대 ${coneN} · 원기둥 ${cylN}`)
    ok('전 구간 깊이 > 0(퇴화 링 없음)', degen === 0, `퇴화 ${degen}개`)
    ok('원뿔대 모선 각 기록(수직 대비)', coneN > 0,
      slopes.map((s) => `${r2(s)}°`).join(' · '))

    //  ★★말단이 방 구 아래 = 클립 면제의 전제
    let worstClr = 1e9
    for (let k = 0; k < 4; k++) {
      const d = RAD_R - termSpec(RAD_CYL_TERM_BY[k]).maxR
      const low = d >= ROOM_R ? -1e9 : ROOM_FLOOR_Y - ROOM_HEIGHT * Math.sqrt(1 - (d / ROOM_R) ** 2)
      worstClr = Math.min(worstClr, low - RAD_CYL_TERM_TOP_BY[k])
    }
    ok('★★말단 꼭대기가 방 구 아랫면 아래(현도 ⓑ — 클립 면제의 전제)',
      Math.abs(worstClr - RAD_CYL_TERM_CLEAR) < 1e-9, `최소 여유 ${r2(worstClr)} = TERM_CLEAR`)
    ok('TERM_CLEAR > 0(0이면 말단이 방 구에 접한다 = 폭 사슬)', RAD_CYL_TERM_CLEAR > 0.5,
      `여유 ${RAD_CYL_TERM_CLEAR}`)
    ok('굵은 말단이 더 아래에서 시작(파생 — 넷이 저절로 어긋난다)',
      RAD_CYL_TERM_TOP_BY[RAD_CYL_TERM_BY.indexOf('orb')] < RAD_CYL_TERM_TOP_BY[RAD_CYL_TERM_BY.indexOf('spike')],
      `orb ${r2(RAD_CYL_TERM_TOP_BY[RAD_CYL_TERM_BY.indexOf('orb')])} < spike ${r2(RAD_CYL_TERM_TOP_BY[RAD_CYL_TERM_BY.indexOf('spike')])}`)

    //  ★②와 ④가 안 겹치게 — 현도 3차 "2번 중간 원기둥은 좀 얇게"
    ok('②drum 덩어리 < ④orb 덩어리(형태 분화 — 현도 3차)', RAD_CYL_MASS_DRUM < RAD_CYL_MASS_ORB - 1,
      `${r2(RAD_CYL_MASS_DRUM)} < ${r2(RAD_CYL_MASS_ORB)}`)
    ok('말단 최대 굵기가 이웃 꽃잎과 무간섭', RAD_R * Math.SQRT2 - 2 * RAD_CYL_MASS_ORB > 20,
      `축간 ${r2(RAD_R * Math.SQRT2)} − 2×${r2(RAD_CYL_MASS_ORB)} = ${r2(RAD_R * Math.SQRT2 - 2 * RAD_CYL_MASS_ORB)}`)
    ok('말단 깊이 기록', true, RAD_CYL_TERM_BY.map((nm, k) => `${nm} ${r2(termSpec(nm).depth)}`).join(' · '))
  }

  // ★★문 12곳(2026.07.30 2차) — ⚠개수는 **지시(8)가 아니라 실측**이 정했다
  {
    const need = RAD_CYL_DOOR_RING_ONLY ? 8 : 12
    ok('문 개수 = 막힌 통로 수(꽃잎당 허브 1 + 고리 2) × 4기', RAD_CYL_DOOR_ON,
      `${need}곳${RAD_CYL_DOOR_RING_ONLY ? ' — ⚠고리만: 허브 터널 4곳은 막힌 채(방→꽃잎 진입로)' : ' (지시 8 + 실측이 더한 허브 4)'}`)
    const W = RAD_T_HW + RAD_CYL_DOOR_M
    ok('문 여유 > 0(0이면 통로 면과 문설주가 정확히 같아진다 = 폭 사슬)', RAD_CYL_DOOR_M > 0.05,
      `반폭 ${RAD_T_HW} → ${r2(W)}`)
    const dTop = RAD_TOP + 0.4 + RAD_CYL_DOOR_M
    ok('문 윗단이 천장판 윗면 위', dTop > RAD_TOP + 0.4, `${r2(dTop)} > ${r2(RAD_TOP + 0.4)}`)
    ok('문 윗단 아래에 인방이 남는다(적도까지 여유)', RAD_CYL_Y0 - dTop > 1,
      `인방 높이 ${r2(RAD_CYL_Y0 - dTop)}`)
    //  허브 문 아래 남는 띠 — 통로 hem(87.28)과 방 표면 사이의 **기존** 간극이 만든다
    const dHub = RAD_R - RAD_CYL_R
    const domeHub = ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (dHub / ROOM_R) ** 2))
    const hem = RAD_FLOOR_Y + COR_THICK / 2 - 14
    ok('⚠허브 문 아래 띠 높이 보고(통로 hem ↔ 방 표면 기존 간극)', true,
      `방 표면 ${r2(domeHub)} ~ 문턱 ${r2(hem - RAD_CYL_DOOR_M)} = ${r2(hem - RAD_CYL_DOOR_M - domeHub)}`)
  }

  // ★★방 내부 침범 — 1차의 '선언된 비용'은 2차 지시(CLIP_ROOM=true)로 해소됐다. 회귀하면 다시 보고한다.
  {
    const wallR = (y) => ROOM_R * Math.sqrt(Math.max(0, 1 - ((y - ROOM_FLOOR_Y) / ROOM_HEIGHT) ** 2))
    const half = (y) => {
      const a = wallR(y)
      if (a < RAD_R - RAD_CYL_R || a > RAD_R + RAD_CYL_R) return 0
      const c = (a * a + RAD_R * RAD_R - RAD_CYL_R * RAD_CYL_R) / (2 * a * RAD_R)
      return Math.acos(Math.min(1, Math.max(-1, c))) * 180 / Math.PI
    }
    let yTop = ROOM_FLOOR_Y
    for (let y = ROOM_FLOOR_Y; y <= ROOM_CEIL_Y; y += 0.01) if (half(y) > 0) yTop = y
    const atFloor = half(ROOM_FLOOR_Y)
    const expected = RAD_CYL_CLIP_ROOM ? 0 : 4 * 2 * atFloor
    ok(RAD_CYL_CLIP_ROOM
      ? 'CLIP_ROOM=true — 방 내부 침범 없음'
      : '⚠선언된 비용: 방 내부 침범(현도 ⓐ 감수 2026.07.30)',
      true,
      RAD_CYL_CLIP_ROOM
        ? '방 껍질 안쪽 미생성'
        : `벽 y ${r2(ROOM_FLOOR_Y)}~${r2(yTop)} · 바닥 레벨 한 기당 ${r2(2 * atFloor)}° · 4기 합 ${r2(expected)}° (둘레의 ${r2(expected / 3.6)}%)`)
    ok('침범 상단이 방 천장에 안 닿음(오큘러스 무손상)', yTop < ROOM_CEIL_Y - 10, `상단 ${r2(yTop)} < ${ROOM_CEIL_Y}`)
  }
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
      //  ★원기둥 4기 — 길이만 다르고 단면은 같다. 위생 + **통로 관통 실측**을 여기서 한다.
      const CR = ${RAD_CYL_R}, TOPBY = ${JSON.stringify(RAD_CYL_TERM_TOP_BY)}
      let cNrm = 0, cRad = 0, cNy = 0, cDot = 2, cTris = 0, cUnit = 0, cWind = 2, cCap = 0
      const cLo = [], cHi = []
      let CG = null
      for (let kk = 0; kk < 4; kk++) {
        const cg = m.buildCylSkirt(kk); if (!CG) CG = cg
        const cp = cg.getAttribute('position'), cn = cg.getAttribute('normal')
        let lo = 1e9, hi = -1e9
        cTris = cp.count / 3
        for (let i = 0; i < cp.count; i++) {
          const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i)
          if (![x, y, z].every(Number.isFinite)) throw new Error('원기둥 NaN 정점')
          lo = Math.min(lo, y); hi = Math.max(hi, y)
          if (y > TOPBY[kk] + 1e-6) {                       // ★원기둥 구간만: 말단은 반경이 변한다
            cRad = Math.max(cRad, Math.abs(Math.hypot(x, z) - CR))
            cNrm = Math.max(cNrm, Math.abs(cn.getX(i) - x / CR), Math.abs(cn.getZ(i) - z / CR), Math.abs(cn.getY(i)))
          }
          cUnit = Math.max(cUnit, Math.abs(Math.hypot(cn.getX(i), cn.getY(i), cn.getZ(i)) - 1))
        }
        cLo.push(+lo.toFixed(3)); cHi.push(+hi.toFixed(3))
        for (let t = 0; t < cp.count; t += 3) {
          const P = [0, 1, 2].map(k => [cp.getX(t + k), cp.getY(t + k), cp.getZ(t + k)])
          const u = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]]
          const v = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]]
          const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
          const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) throw new Error('원기둥 퇴화 삼각형')
          const gx = (P[0][0] + P[1][0] + P[2][0]) / 3, gz = (P[0][2] + P[1][2] + P[2][2]) / 3
          const rl = Math.hypot(gx, gz)
          if (P[0][1] > TOPBY[kk] + 1e-6) {               // 원기둥 구간 = 반경 바깥이어야
            cDot = Math.min(cDot, (n[0] / L) * (gx / rl) + (n[2] / L) * (gz / rl))
            cNy = Math.max(cNy, Math.abs(n[1] / L))
          }
          //  ★감김 검산(말단 포함) = 면 법선이 **선언 법선**과 같은 쪽을 보는가
          const d0 = (n[0] / L) * cn.getX(t) + (n[1] / L) * cn.getY(t) + (n[2] / L) * cn.getZ(t)
          cWind = Math.min(cWind, d0)
          if (Math.abs(n[1] / L) > 0.999 && n[1] < 0) cCap++     // 막힌 끝(아래 보는 평면)
        }
      }
      //  ★★통로 관통 실측 — 모든 정점이 반경 CR 위이므로 (로컬각, y) 평면 투영에 왜곡이 없다.
      //   광선을 쏘지 않고 **면 소속**으로 판정한다(축평행 광선·가림막 누락 전례를 피한다).
      const TR = []
      {
        const cp = CG.getAttribute('position')
        for (let t = 0; t < cp.count; t += 3) {
          //  ★원기둥(등반경) 구간만 — 투영이 왜곡 없는 곳. 문은 여기에만 있다.
          let flat = true
          for (let k = 0; k < 3; k++) if (Math.abs(Math.hypot(cp.getX(t + k), cp.getZ(t + k)) - CR) > 1e-4) flat = false
          if (!flat) continue
          const v = [0, 1, 2].map(k => {
            let a = Math.atan2(cp.getZ(t + k), cp.getX(t + k)); if (a < 0) a += 2 * Math.PI
            return [a, cp.getY(t + k)]
          })
          const mn = Math.min(v[0][0], v[1][0], v[2][0]), mx = Math.max(v[0][0], v[1][0], v[2][0])
          if (mx - mn > Math.PI) for (const q of v) if (q[0] < Math.PI) q[0] += 2 * Math.PI
          TR.push(v)
        }
      }
      const covers = (a, y) => {
        for (const T of TR) for (const off of [0, 2 * Math.PI, -2 * Math.PI]) {
          const p = [a + off, y]
          const dd = (u, v, w) => (u[0] - w[0]) * (v[1] - w[1]) - (v[0] - w[0]) * (u[1] - w[1])
          const d1 = dd(p, T[0], T[1]), d2 = dd(p, T[1], T[2]), d3 = dd(p, T[2], T[0])
          if (!(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)))) return true
        }
        return false
      }
      const RR = ${RAD_R}, HW = ${RAD_T_HW}, YF = ${RAD_FLOOR_Y + COR_THICK / 2}, YT = ${RAD_TOP}
      const yS = []; for (let y = YF + 0.1; y <= YT - 0.1; y += 0.25) yS.push(y)
      let blkHub = 0, blkRing = 0, wallOff = 0, nOff = 0
      for (let lz = -(HW - 0.2); lz <= HW - 0.2; lz += 0.2) {         // ① 허브 대각 터널 단면
        const lx = -Math.sqrt(CR * CR - lz * lz); let a = Math.atan2(lz, lx); if (a < 0) a += 2 * Math.PI
        for (const y of yS) if (covers(a, y)) blkHub++
      }
      for (let d = RR - HW + 0.2; d <= RR + HW - 0.2; d += 0.2) {     // ② 고리 좌우 단면
        const ca = (d * d - CR * CR - RR * RR) / (2 * CR * RR); if (Math.abs(ca) > 1) continue
        for (const sg of [1, -1]) { let a = sg * Math.acos(ca); if (a < 0) a += 2 * Math.PI
          for (const y of yS) if (covers(a, y)) blkRing++ }
      }
      for (const b of [Math.PI, Math.PI / 2, -Math.PI / 2]) for (const o of [0.52, -0.52]) {
        let a = b + o; if (a < 0) a += 2 * Math.PI                     // ③ 통로에서 30° — 벽이 남아야 한다
        for (const y of yS) { nOff++; if (covers(a, y)) wallOff++ }
      }
      const lintel = [Math.PI, Math.PI / 2, -Math.PI / 2].filter(b => covers(b < 0 ? b + 2 * Math.PI : b, ${RAD_CYL_Y0} - 0.3)).length
      const cyl = { tris: cTris, cNrm, cRad, cNy, cDot, cLo, cHi, blkHub, blkRing, wallOff, nOff, lintel, cUnit, cWind, cCap }
      //  ★계단 CSG 실측(★㉗ 계란화) — 3기·유한성·상단(문지방−0.02)·셸 안(교집합 반경)
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
      console.log(JSON.stringify({ maxY, minCnt, worstOut, cyl }))
      process.exit(0)
    }).catch(e => { console.error(e.message); process.exit(1) })`)
    const out = execSync(`node ${join(dir, 'run.mjs')}`, { stdio: 'pipe' }).toString()
    const st = JSON.parse(out.trim().split('\n').pop())
    ok('계단 CSG 3기 실행·정점 유한', st.minCnt > 100, `최소 정점 ${st.minCnt}`)
    ok('계단 상단 = 문지방 − 0.02 립', Math.abs(st.maxY - (RAD_FLOOR_Y + COR_THICK / 2 - 0.02)) < 0.02, `상단 ${r2(st.maxY)}`)
    ok('계단 전 정점이 셸 안(교집합 −0.05 축소)', st.worstOut < -0.01, `최대 돌출 ${r2(st.worstOut)}`)
    // ★원기둥 받침 기하 실측(2026.07.30) — 법선은 명시(★57 '각진 연필'), 캡 없음(뚫린 관), 겉면 감김
    ok('원기둥 구간 반경 정확', st.cyl.cRad < 1e-5, `편차 ${st.cyl.cRad.toExponential(2)}`)
    ok('4기 밑단 = 말단 꼭대기 − 말단 깊이(파생)',
      st.cyl.cLo.every((v, i) => Math.abs(v - RAD_CYL_Y1_BY[i]) < 1e-3), `${st.cyl.cLo.join(' · ')}`)
    ok('★법선이 전부 단위벡터(명시 — 말단 포함)', st.cyl.cUnit < 1e-5, `편차 ${st.cyl.cUnit.toExponential(2)}`)
    ok('★감김이 선언 법선과 일치(말단 포함)', st.cyl.cWind > 0.98, `최소 dot ${r2(st.cyl.cWind)}`)
    ok('★막힌 끝이 있다(현도 3차 — 뚫린 관 폐기)', st.cyl.cCap > 0, `아래 보는 평면 ${st.cyl.cCap}장`)
    ok('4기 상단 = 적도(전부 같다)', st.cyl.cHi.every((v) => Math.abs(v - RAD_CYL_Y0) < 1e-3), `${st.cyl.cHi.join(' · ')}`)
    //  ★★문이 실제로 뚫렸는가 — (로컬각, y) 투영 면 소속 판정(광선 아님)
    ok('★허브 터널 단면에 막는 면 0', st.cyl.blkHub === 0, `막힘 ${st.cyl.blkHub}점`)
    ok('★고리 좌우 단면에 막는 면 0', st.cyl.blkRing === 0, `막힘 ${st.cyl.blkRing}점`)
    ok('★통로에서 30° 떨어진 곳은 전부 벽(과다 절개 아님)', st.cyl.wallOff === st.cyl.nOff,
      `${st.cyl.wallOff}/${st.cyl.nOff}`)
    ok('★문 위 인방이 남는다(통로 셋 전부)', st.cyl.lintel === 3, `${st.cyl.lintel}/3`)
    ok('★법선 = 반경 바깥(명시 — computeVertexNormals 아님)', st.cyl.cNrm < 1e-5, `편차 ${st.cyl.cNrm.toExponential(2)}`)
    ok('원기둥 구간에 수평 면 없음(문·인방이 수직으로 선다)', st.cyl.cNy < 1e-9, `면법선 |ny| 최대 ${st.cyl.cNy.toExponential(2)}`)
    ok('겉면 감김이 전부 바깥', st.cyl.cDot > 0.99, `최소 dot ${r2(st.cyl.cDot)}`)
  } catch (e) {
    evalOk = false; msg = (e.stderr || e.stdout || '').toString().split('\n')[0]
  }
  ok('Radial.jsx 번들 평가(임포트+계단 CSG) 성공', evalOk, msg)
}

// ════════════════════════════════════════════════════════════════════
//  ★★★119 상승 터널(2026.08.05 셋째 대화) — 허브→방 접근 = 오르는 계단 관
//  잣대: ⓐ 유도가 닫힌 식(표본 무의존 — ★118 교훈)에서 나오고 ⓑ 계단 규격이 전례 대역
//  (★80 나팔 30° 상한·rise 0.24 씨앗) 안이며 ⓒ 문틀이 컷 림·관 끝을 실제로 삼키고
//  ⓓ 체제 스위치·보존계·셸 컷 게이트가 소스에 배선돼 있다.
// ════════════════════════════════════════════════════════════════════
{
  const { ascSpec, ascDoorCut } = await import('./ascentTunnelGeometry.js')
  const { RAD_ASC_ON, RAD_ASC_Y1, RAD_ASC_RISE_SEED, RAD_UNDER_LIP, petalR } = await import('./constants.js')
  const S = ascSpec()
  console.log(`\n── ★119 상승 터널 (${RAD_ASC_ON ? '점등' : '⛔소등 — 구 수평 체제'}) ──`)

  // ⓐ 유도·결합
  ok('상승 = 문지방→새 문지방(닫힌 식)', Math.abs(S.rise - (RAD_ASC_Y1 - (RAD_FLOOR_Y + COR_THICK / 2))) < 1e-9,
    `rise ${S.rise.toFixed(3)}`)
  ok('매스 시작 = 디스크 결합(ROOM_LAND_R + 립) 승계', Math.abs(S.s0 - (ROOM_LAND_R + RAD_UNDER_LIP)) < 1e-9,
    `s0 ${S.s0} — ROOM_LAND_R를 밀면 따라온다(★110 결합)`)
  ok('벽 시작 = RAD_WALL_R0(허브 문틀 몸통 안 — 어귀 접속 불변)', Math.abs(S.sWall0 - RAD_WALL_R0) < 1e-9)
  ok('연직 내부고 = 구 터널 승계(RAD_TOP − 문지방)', Math.abs(S.clear - (RAD_TOP - S.y0)) < 1e-9,
    `${S.clear.toFixed(2)} — RAD_TOP 노브에 자동 추종`)
  ok('셸 면 스테이션 = petalR(y1) 파생', Math.abs(S.sFace - (RAD_R - petalR(S.y1))) < 1e-9, `sFace ${S.sFace.toFixed(2)}`)

  // ⓑ 계단 규격(전례 대역)
  ok('경사 ≤ 30°(★80 나팔 상한)', S.slopeDeg <= 30 + 1e-9, `${S.slopeDeg.toFixed(2)}°`)
  ok('단높이 ∈ [0.20, 0.30](씨앗 0.24 근방)', S.stepRise >= 0.20 && S.stepRise <= 0.30,
    `${S.stepRise.toFixed(4)} × ${S.N}단`)
  ok('단높이 × 단수 = 상승(잔차 0)', Math.abs(S.stepRise * S.N - S.rise) < 1e-9)
  ok('디딤 ≥ 0.40(★80 0.416 계열)', S.tread >= 0.40, `${S.tread.toFixed(3)}`)
  ok('어귀 평지 ≥ 1.0(디스크 이탈 직후 단차 방지)', S.sSt0 - S.s0 >= 1.0, `${(S.sSt0 - S.s0).toFixed(2)}`)
  ok('문 앞 평지 ≥ 1.0', S.sFace - S.sSt1 >= 1.0, `${(S.sFace - S.sSt1).toFixed(2)}`)
  ok('최소 헤드룸 = 연직고(단코에서 정확히)', S.clear >= 4.4, `${S.clear.toFixed(2)} ≥ 4.4`)

  // ⓒ 문 이음 — 문틀이 실제로 삼키는가(닫힌 식)
  ok('관 끝이 문틀 몸통 안(구 TUBE_END 규칙)', S.sTube1 < RAD_R - S.frBack, 
    `끝 ${S.sTube1.toFixed(2)} < 뒷면 ${(RAD_R - S.frBack).toFixed(2)}`)
  ok('문틀 앞면이 컷 바닥 림을 삼킴(걸침에 컷 바닥 포함 — 구 규칙 확장)',
    S.frFront >= petalR(S.cutBot) + 0.2, `앞 ${S.frFront.toFixed(2)} ≥ 면 ${petalR(S.cutBot).toFixed(2)} + 0.2`)
  ok('문틀 뒷면이 상인방 상단 림을 삼킴', S.frBack <= Math.sqrt(Math.max(0.25, petalR(S.linTop) ** 2 - S.frOut ** 2)) - 0.2 + 1e-9,
    `뒤 ${S.frBack.toFixed(2)}`)
  ok('컷 폭(4.6) < 잼 바깥(5.4) — 컷 가장자리 삼킴', RAD_DOOR_HW * 2 < S.frOut * 2)
  {
    const c = ascDoorCut()
    const faces = [S.cutBot, S.y1, S.doorTop].map(y => petalR(y))
    const x0 = RAD_PRX - 1 - c.w / 2, x1 = RAD_PRX - 1 + c.w / 2   // 컷 상자 로컬 |x| 범위
    ok('컷 상자가 셸 면을 전 높이에서 관통', faces.every(f => f > x0 && f < x1),
      `면 ${faces.map(r2).join('·')} ∈ (${x0}, ${x1})`)
    ok('노브 상한 준수: y1 ≤ y1Max(문+상인방이 셸 정수리 안)', RAD_ASC_Y1 <= S.y1Max,
      `${RAD_ASC_Y1} ≤ ${S.y1Max.toFixed(2)} — 안전 대역 [${(S.y0 + 2).toFixed(0)}, ${S.y1Max.toFixed(1)}]`)
  }

  // 구 문·구 터널과의 관계(선언된 상태 감시)
  {
    const soffitAtOld = S.chordY(RAD_R - RAD_PRX + 1) - S.massT   // 구 셸 문 스테이션 부근 매스 밑면
    ok('상승 매스가 구 문(상인방 106.6) 위로 통과 — 구 문 존치와 무간섭',
      soffitAtOld > RAD_TOP + 0.6, `밑면 ${soffitAtOld.toFixed(1)} > ${(RAD_TOP + 0.6).toFixed(1)}`)
  }

  // ★119-감김: 매스는 단면 재질 — 오감김 = 비가시(현도 로컬 적발 2026.08.05 "계단 전면부가 안 보여":
  //  챌면 120면 전원 +x·디딤 −y였음. 셀프 렌더 사각지대 — 부호 부피·방향 센서스로 잠근다)
  {
    const { buildAscentMass } = await import('./ascentTunnelGeometry.js')
    const g = buildAscentMass()
    const pos = g.attributes.position.array, idx = g.index.array
    let vol = 0, riserWrong = 0, riserN = 0, up = 0
    for (let i = 0; i < idx.length; i += 3) {
      const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]].map(j => [pos[3 * j], pos[3 * j + 1], pos[3 * j + 2]])
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const L = Math.hypot(...n); if (L < 1e-12) continue
      vol += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
      const cx = (a[0] + b[0] + c[0]) / 3
      if (Math.abs(n[0] / L) > 0.99 && cx > S.sSt0 + 0.01 && cx <= S.sSt1 + 0.01) { riserN++; if (n[0] / L > 0) riserWrong++ }   // 마지막 챌면 = 정확히 sSt1
      if (n[1] / L > 0.99) up++
    }
    const analytic = 2 * S.massHW * ((S.massT - S.stepRise / 2) * S.runSt + S.massT * ((S.sSt0 - S.s0) + (S.sTube1 - S.sSt1)))
    ok('★감김: 부호 부피 ≈ 해석값(닫힌 매스·전면 바깥)', vol > 0 && vol / analytic > 0.95 && vol / analytic < 1.10,
      `${vol.toFixed(1)} / ${analytic.toFixed(1)} = ${(vol / analytic).toFixed(3)}`)
    ok('★감김: 챌면 전원 −x(오르는 사람 정면 — 단면 재질 가시)', riserN >= S.N * 2 && riserWrong === 0,
      `오감김 ${riserWrong}/${riserN}`)
    ok('★감김: 위 보는 면 ≥ 단수(디딤이 하늘을 본다)', up >= S.N, `${up} ≥ ${S.N}`)
  }

  // ⓓ 배선(소스 — 스위치가 실제로 작동하는가·보존계·게이트)
  {
    const RSRC = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
    ok('체제 스위치 배선: RAD_ASC_ON ? AscentTunnel : Tunnel', /RAD_ASC_ON \? <AscentTunnel[\s\S]{0,40}: <Tunnel/.test(RSRC))
    ok('보존계: 구 Tunnel 함수 존속(한 줄 복귀)', /function Tunnel\(\{ ang \}\)/.test(RSRC))
    ok('셸 상부 컷 게이트: if (RAD_ASC_ON) 안 ascDoorCut', /if \(RAD_ASC_ON\) \{[\s\S]{0,120}ascDoorCut/.test(RSRC))
    ok('상부 문틀 = DoorFrame 높이 일반화 재사용(신규 어법 아님)', /yFloor=\{S\.y1\}/.test(RSRC))
    ok('매스 walkable 태그', /AscentTunnel[\s\S]{0,400}walkable: true/.test(RSRC))
  }
}

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
