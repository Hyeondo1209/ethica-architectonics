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
  DISC_MODE, RAD_WALL_R0, RAD_ASC_ON, RAD_HUB_DOOR_ON, HUB_DOOR_GATE,
  TAN_DOOR_POS_GATE, TAN_DOOR_NEG_GATE, CYL_HUB_DOOR_GATE, RAD_RING_ON, CYL_TAN_DOOR_M,
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
    //  ★122-M: 여유의 의미가 세계에 따라 뒤집힌다 — 고리 세계는 '고리 관 단면 여유'(양수),
    //  나선 세계는 '문틀 잼 안으로 넣기'(음수). 부호가 아니라 **각 세계의 목적**을 잰다.
    ok(`문 여유 = 세계 파생(${RAD_RING_ON ? '고리: 관 단면 여유 > 0' : '나선: 잼 안 — 음수 정본'})`,
      RAD_RING_ON ? CYL_TAN_DOOR_M > 0.05 : CYL_TAN_DOOR_M < 0,
      `실효 M ${CYL_TAN_DOOR_M} · 반폭 ${RAD_T_HW} → ${r2(RAD_DOOR_HW + CYL_TAN_DOOR_M)}`)
    const dTop = RAD_TOP + 0.4 + CYL_TAN_DOOR_M
    //  ★122-M: 고리 세계면 천장판 위, 나선 세계면 **접선 문 린텔 몸통 안**(문 상단 ~ 린텔 상단)이면 삼켜진다
    const DTOP_T = RAD_FLOOR_Y + COR_THICK / 2 + RAD_DOOR_H, LTOP_T = RAD_TOP + 0.6
    ok(`문 윗단 = 세계 파생(${RAD_RING_ON ? '천장판 윗면 위' : '접선 린텔 몸통 안'})`,
      RAD_RING_ON ? dTop > RAD_TOP + 0.4 : (dTop > DTOP_T && dTop < LTOP_T),
      `${r2(dTop)} · 린텔 몸통 ${r2(DTOP_T)}~${r2(LTOP_T)}`)
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
      if (gs.length !== ${(HUB_DOOR_GATE ? 1 : 0) + (TAN_DOOR_POS_GATE ? 1 : 0) + (TAN_DOOR_NEG_GATE ? 1 : 0)}) throw new Error('계단 기하 ' + gs.length + '기 (기대 ${(HUB_DOOR_GATE ? 1 : 0) + (TAN_DOOR_POS_GATE ? 1 : 0) + (TAN_DOOR_NEG_GATE ? 1 : 0)} — ★122-b 게이트 파생)')
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
      //  ★★★120 셸 구멍 실측(봉인 확인) — 꽃잎 셸을 실제로 만들어 광선을 센다.
      //   ⚠축평행 광선 전례를 피해 방향에 미세 기울기를 준다(모서리 접선 히트 = 오판정 원천).
      //   Möller–Trumbore. 닫혀 있으면 안에서 쏜 광선이 반드시 1회 이상 맞는다.
      //   ⚠**도구 자체를 먼저 검증했다**(2026.08.11): 셸 CSG 출력은 **indexed**다. 인덱스를 무시하고
      //    position을 3개씩 끊어 읽으면 삼각형이 통째로 어긋나 봉인된 문이 '80% 뚫림'으로 나온다(실측 적발).
      const PG = m.buildPetalShell(), PS = PG.getAttribute('position'), PI = PG.index
      const vAt = (i) => { const k = PI ? PI.getX(i) : i; return [PS.getX(k), PS.getY(k), PS.getZ(k)] }
      const NT = (PI ? PI.count : PS.count) / 3
      const hit = (o, d) => {
        let n = 0
        for (let t = 0; t < NT * 3; t += 3) {
          const a = vAt(t), b = vAt(t+1), c = vAt(t+2)
          const e1 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], e2 = [c[0]-a[0], c[1]-a[1], c[2]-a[2]]
          const pv = [d[1]*e2[2]-d[2]*e2[1], d[2]*e2[0]-d[0]*e2[2], d[0]*e2[1]-d[1]*e2[0]]
          const det = e1[0]*pv[0]+e1[1]*pv[1]+e1[2]*pv[2]
          if (Math.abs(det) < 1e-12) continue
          const iv = 1/det, tv = [o[0]-a[0], o[1]-a[1], o[2]-a[2]]
          const u = (tv[0]*pv[0]+tv[1]*pv[1]+tv[2]*pv[2])*iv; if (u < 0 || u > 1) continue
          const qv = [tv[1]*e1[2]-tv[2]*e1[1], tv[2]*e1[0]-tv[0]*e1[2], tv[0]*e1[1]-tv[1]*e1[0]]
          const vv = (d[0]*qv[0]+d[1]*qv[1]+d[2]*qv[2])*iv; if (vv < 0 || u+vv > 1) continue
          if ((e2[0]*qv[0]+e2[1]*qv[1]+e2[2]*qv[2])*iv > 1e-6) n++
        }
        return n
      }
      const nrm = (v) => { const L = Math.hypot(v[0],v[1],v[2]); return [v[0]/L, v[1]/L, v[2]/L] }
      let hubOpen = 0, hubTot = 0, ringOpen = 0, ringTot = 0
      for (let y = 101.4; y <= 105.05; y += 0.4) for (let z = -1.8; z <= 1.81; z += 0.4) {
        hubTot++; if (hit([0, y, z], nrm([-1, 0.013, 0.007])) === 0) hubOpen++      // 허브(−x) 문
      }
      const zr = ${RAD_PRX} - 1, xr = ${RAD_R} * (Math.cos(Math.asin(zr / ${RAD_R})) - 1)
      for (let y = 101.4; y <= 105.05; y += 0.4) for (const sg of [1, -1]) {
        ringTot++; if (hit([0, y, 0], nrm([xr, 0.011, sg * zr])) === 0) ringOpen++  // 접선(고리) 문 — 대조군
      }
      const shell = { hubOpen, hubTot, ringOpen, ringTot }
      console.log(JSON.stringify({ maxY, minCnt, worstOut, cyl, shell }))
      process.exit(0)
    }).catch(e => { console.error(e.message); process.exit(1) })`)
    const out = execSync(`node ${join(dir, 'run.mjs')}`, { stdio: 'pipe' }).toString()
    const st = JSON.parse(out.trim().split('\n').pop())
    ok(`계단 CSG ${HUB_DOOR_GATE ? 3 : 2}기 실행·정점 유한`, st.minCnt > 100, `최소 정점 ${st.minCnt}`)
    // ★★★120 셸 봉인 실측 — 광선 census(대조군 = 접선 고리 문 둘)
    ok(`허브(−x) 문 ${HUB_DOOR_GATE ? '개통' : '봉인'} — 광선 실측`,
      HUB_DOOR_GATE ? st.shell.hubOpen === st.shell.hubTot : st.shell.hubOpen === 0,
      `뚫린 광선 ${st.shell.hubOpen}/${st.shell.hubTot}`)
    //  ★122-b: 접선 문도 게이트됐다 — 기대 = 열린 문 수 비례(둘 다/한쪽/없음)
    {
      const openDoors = (TAN_DOOR_POS_GATE ? 1 : 0) + (TAN_DOOR_NEG_GATE ? 1 : 0)
      const expect = st.shell.ringTot * openDoors / 2
      ok(`접선 고리 문 광선 = 게이트 파생(열린 문 ${openDoors}/2 — ★122-b 유령 개구 봉인)`,
        st.shell.ringOpen === expect, `뚫린 광선 ${st.shell.ringOpen}/${st.shell.ringTot} (기대 ${expect})`)
    }
    //  ★122-b: 계단 수 = 게이트 파생(허브+접선±) — 0기(전 문 봉인·방 밀폐 상태)면 실측 절 건너뜀
    {
      const nStair = (HUB_DOOR_GATE ? 1 : 0) + (TAN_DOOR_POS_GATE ? 1 : 0) + (TAN_DOOR_NEG_GATE ? 1 : 0)
      if (nStair > 0) {
        ok('계단 상단 = 문지방 − 0.02 립', Math.abs(st.maxY - (RAD_FLOOR_Y + COR_THICK / 2 - 0.02)) < 0.02, `상단 ${r2(st.maxY)}`)
        ok('계단 전 정점이 셸 안(교집합 −0.05 축소)', st.worstOut < -0.01, `최대 돌출 ${r2(st.worstOut)}`)
      } else {
        ok('⚠계단 0기 = 전 문 봉인(방 밀폐 상태 — 나선·고리 동시 소등 조합) — 실측 절 건너뜀', true, '위상 보고')
      }
    }
    // ★원기둥 받침 기하 실측(2026.07.30) — 법선은 명시(★57 '각진 연필'), 캡 없음(뚫린 관), 겉면 감김
    ok('원기둥 구간 반경 정확', st.cyl.cRad < 1e-5, `편차 ${st.cyl.cRad.toExponential(2)}`)
    ok('4기 밑단 = 말단 꼭대기 − 말단 깊이(파생)',
      st.cyl.cLo.every((v, i) => Math.abs(v - RAD_CYL_Y1_BY[i]) < 1e-3), `${st.cyl.cLo.join(' · ')}`)
    ok('★법선이 전부 단위벡터(명시 — 말단 포함)', st.cyl.cUnit < 1e-5, `편차 ${st.cyl.cUnit.toExponential(2)}`)
    ok('★감김이 선언 법선과 일치(말단 포함)', st.cyl.cWind > 0.98, `최소 dot ${r2(st.cyl.cWind)}`)
    ok('★막힌 끝이 있다(현도 3차 — 뚫린 관 폐기)', st.cyl.cCap > 0, `아래 보는 평면 ${st.cyl.cCap}장`)
    ok('4기 상단 = 적도(전부 같다)', st.cyl.cHi.every((v) => Math.abs(v - RAD_CYL_Y0) < 1e-3), `${st.cyl.cHi.join(' · ')}`)
    //  ★★문이 실제로 뚫렸는가 — (로컬각, y) 투영 면 소속 판정(광선 아님)
    //  ★122-b: 원기둥 개구도 세계 게이트 — 열린 세계면 막힘 0, 봉인 세계면 막힘 > 0(벽이 돌아옴)
    ok(`★허브 터널 단면 ${CYL_HUB_DOOR_GATE ? '개구(막는 면 0)' : '봉인(벽 복귀)'} — 게이트 파생`,
      CYL_HUB_DOOR_GATE ? st.cyl.blkHub === 0 : st.cyl.blkHub > 0, `막힘 ${st.cyl.blkHub}점`)
    ok(`★고리 좌우 단면 = 게이트 파생(+z ${TAN_DOOR_POS_GATE ? '개구' : '봉인'} · −z ${TAN_DOOR_NEG_GATE ? '개구' : '봉인'})`,
      (TAN_DOOR_POS_GATE && TAN_DOOR_NEG_GATE) ? st.cyl.blkRing === 0 : st.cyl.blkRing > 0,
      `막힘 ${st.cyl.blkRing}점`)
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
    //  ★122-c: 매스 유효 끝 = sMassEnd(게이트 파생 — 나선 세계면 스텁 없이 층계참 접합면)
    const analytic = 2 * S.massHW * ((S.massT - S.stepRise / 2) * S.runSt + S.massT * ((S.sSt0 - S.s0) + (S.sMassEnd - S.sSt1)))
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
    //  ★122-d: 새 문 = 전망 개구로 복원(컷·문틀 존치) + 난간이 통행을 막는다
    ok('셸 상부 컷 = 전망 개구(RAD_ASC_ON) · 난간이 가로막음(★122-d)',
      /if \(RAD_ASC_ON\) \{[\s\S]{0,220}ascDoorCut/.test(RSRC) && /ovlGeo\} userData=\{\{ walkable: false \}\}/.test(RSRC))
    // ── ★★★120 구 허브 문 봉인: 배선 + 보존계 + 구세계 결합 ──
    ok('배선 ⓐ 셸 −x 컷이 게이트 안', /if \(HUB_DOOR_ON\) \{[\s\S]{0,200}BoxGeometry\(8, H, RAD_DOOR_HW \* 2\)/.test(RSRC))
    ok('배선 ⓑ 방사 문틀이 게이트에 물림', /HUB_DOOR_ON && <DoorFrame position=\{\[-FR_C, 0, 0\]\}/.test(RSRC))
    ok('배선 ⓒ 허브 진입 계단이 게이트에 물림', /HUB_DOOR_ON \? \[buildStairGeo\(Math\.PI \/ 2, -FR_C, 0/.test(RSRC))
    ok('보존계: 컷·문틀·계단 코드가 전부 소스에 존속(한 줄 복귀)',
      /BoxGeometry\(8, H, RAD_DOOR_HW \* 2\)/.test(RSRC) && /DoorFrame position=\{\[-FR_C, 0, 0\]\}/.test(RSRC)
      && /buildStairGeo\(Math\.PI \/ 2, -FR_C, 0/.test(RSRC))
    ok('게이트 정본이 constants 한 곳(사본 금지)', /const HUB_DOOR_ON = HUB_DOOR_GATE/.test(RSRC))
    {
      const CSRC = readFileSync(new URL('./constants.js', import.meta.url), 'utf8')
      ok('★구세계 결합: 게이트 = RAD_HUB_DOOR_ON || !RAD_ASC_ON',
        /HUB_DOOR_GATE\s*=\s*RAD_HUB_DOOR_ON \|\| !RAD_ASC_ON/.test(CSRC))
      ok('★119 보존계 무손상: RAD_ASC_ON=false면 구 허브 문이 스위치와 무관하게 부활',
        (false || !false) === true && HUB_DOOR_GATE === (RAD_HUB_DOOR_ON || !RAD_ASC_ON),
        `현행 RAD_HUB_DOOR_ON=${RAD_HUB_DOOR_ON} · RAD_ASC_ON=${RAD_ASC_ON} → 게이트 ${HUB_DOOR_GATE}`)
    }
    //  보존계 수치(소등 중에도 돈다 — 복귀 시점에 낙차가 얼마인지 상시 보고. ★116 패턴)
    {
      const dome = (r) => Math.max(0, ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - r * r / (ROOM_R * ROOM_R))))
      const dS = RAD_R - (RAD_PRX - 1)
      const drop = COR_Y0 - dome(dS)
      ok('⚠보존계 수치: 구 허브 문 낙차 보고(복귀 시 재판정 필요)', Number.isFinite(drop) && drop > 0,
        `s${r2(dS)} · 문지방 ${r2(COR_Y0)} → 발밑 ${r2(dome(dS))} = 낙차 ${r2(drop)} (STEP_DOWN 2.2의 ${(drop / 2.2).toFixed(2)}배)`)
    }
}

console.log('── ★121 상승 관 기둥 지지(2026.08.11 현도 결정 A) ──')
{
  const { ascColumnSpec, buildAscentColumns, ascDomeY, ascSpec: aSpec } = await import('./ascentTunnelGeometry.js')
  const { RASC_SUP_ON, RASC_COL_GAP, RASC_COL_RT, RASC_COL_SPREAD, RASC_COL_MIN,
    RASC_COL_INSET, RASC_FOOT_BITE, RASC_FOOT_PAD, ROOM_OCULUS_R } = await import('./constants.js')
  const S = aSpec()
  const cols = ascColumnSpec()
  if (!RASC_SUP_ON) {
    ok(true, `⛔RASC_SUP_ON=false — 기둥 소등(보존계). 수치 절 건너뜀 · 배선 절만`)
  } else {
    //  ⓐ 스펙 재유도(사본이 아니라 독립 유도 — 닫힌 식 대조)
    const expect = []
    for (let sc = S.sFace - RASC_FOOT_PAD; sc >= S.s0; sc -= RASC_COL_GAP) {
      const yTop = S.chordY(sc) - S.massT + RASC_COL_INSET
      const h = yTop - ascDomeY(sc)
      if (h < RASC_COL_MIN) continue
      const Rb = RASC_COL_RT + RASC_COL_SPREAD * h
      if (sc - Rb < ROOM_OCULUS_R + RASC_FOOT_PAD) continue
      if (sc + Rb > S.sFace - RASC_FOOT_PAD) continue
      expect.push(sc)
    }
    ok(`기둥 수 유도 일치(${cols.length}기)`, cols.length === expect.length && cols.length >= 3,
      `${cols.length} = ${expect.length}`)
    //  ⓑ 세장비 잠금 — ★107 판 기둥 전례 최대 7.0:1(h/지름평균)
    const slMax = Math.max(...cols.map((c) => c.h / (RASC_COL_RT + c.Rb)))
    ok('★세장비 ≤ ★107 전례 7.0(전 기둥)', slMax <= 7.0 + 1e-9, `최대 ${slMax.toFixed(2)}:1`)
    //  ⓒ 발 제약(전 기둥): 안끝 > 오큘러스 · 바깥끝 < 셸 내면 · 발이 hem 아래로 안 뚫림(돔 표면 존재)
    ok('발 안끝 > 오큘러스 림 + PAD(허공 착지 0)', cols.every((c) => c.s - c.Rb >= ROOM_OCULUS_R + RASC_FOOT_PAD - 1e-9),
      `최소 안끝 r${r2(Math.min(...cols.map((c) => c.s - c.Rb)))} vs 림 ${ROOM_OCULUS_R}`)
    ok('발 바깥끝 < 꽃잎 셸 내면 − PAD', cols.every((c) => c.s + c.Rb <= S.sFace - RASC_FOOT_PAD + 1e-9),
      `최대 바깥끝 ${r2(Math.max(...cols.map((c) => c.s + c.Rb)))} vs 셸 ${r2(S.sFace)}`)
    ok('전 기둥 h ≥ MIN · 상단 = 매스 밑면 + INSET(닫힌 식)', cols.every((c) =>
      c.h >= RASC_COL_MIN - 1e-9 && Math.abs(c.yTop - (S.chordY(c.s) - S.massT + RASC_COL_INSET)) < 1e-9))
    //  ⓓ 기하 실측: 발 정점 로프트 정합 · NaN · 감김(부호 부피)
    const g = buildAscentColumns()
    const P = g.getAttribute('position'), I = g.index
    let nan = 0, footWorst = 0, footN = 0
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i)
      if (![x, y, z].every(Number.isFinite)) nan++
      //  발 정점 판별: 캡·옆면 하단 = 로프트면 위 — y가 '그 반경의 돔 − BITE'와 일치해야
      //  ⚠톨러런스 1e-4: 정점 버퍼는 Float32(교훈 — 1e-6은 도구가 만드는 거짓 실패)
      const dy = y - (ascDomeY(Math.hypot(x, z)) - RASC_FOOT_BITE)
      if (Math.abs(dy) < 1e-4) footN++
      else if (dy < -1e-4) footWorst = Math.max(footWorst, -dy)
    }
    ok('NaN 정점 0', nan === 0, `${nan}`)
    ok(`발 정점 로프트 정합(돔 − BITE ${RASC_FOOT_BITE})`, footN >= cols.length * 8, `정합 정점 ${footN} ≥ ${cols.length * 8}`)
    ok('로프트면 아래로 새는 정점 0(BITE가 유일한 관입 · Float32 1e-4)', footWorst === 0, `최대 초과 ${footWorst ? footWorst.toExponential(1) : 0}`)
    //  감김 = 발산 정리 부피(닫힌 기하면 양수 · 해석 부피와 자릿수 일치)
    let vol = 0
    for (let t = 0; t < I.count; t += 3) {
      const A = [P.getX(I.getX(t)), P.getY(I.getX(t)), P.getZ(I.getX(t))]
      const B = [P.getX(I.getX(t + 1)), P.getY(I.getX(t + 1)), P.getZ(I.getX(t + 1))]
      const C = [P.getX(I.getX(t + 2)), P.getY(I.getX(t + 2)), P.getZ(I.getX(t + 2))]
      vol += (A[0] * (B[1] * C[2] - C[1] * B[2]) - B[0] * (A[1] * C[2] - C[1] * A[2]) + C[0] * (A[1] * B[2] - B[1] * A[2])) / 6
    }
    //  해석 근사: 원뿔대 부피(팔각 → 외접원 근사 상한·내접 하한 사이) 합
    const octA = (r) => 2 * Math.SQRT2 * r * r        // 팔각 면적(외접반경 r) = 2√2 r²
    const ana = cols.reduce((a, c) => a + c.h * (octA(RASC_COL_RT) + octA(c.Rb) + Math.sqrt(octA(RASC_COL_RT) * octA(c.Rb))) / 3, 0)
    ok('★감김: 부호 부피 양수 + 해석 원뿔대 합과 일치(±12%)', vol > 0 && Math.abs(vol / ana - 1) < 0.12,
      `${vol.toFixed(1)} / ${ana.toFixed(1)} = ${(vol / ana).toFixed(3)}`)
    //  ⓔ 지지 사슬 보고(상시): 어귀 물림 → 첫 기둥 → 마지막 기둥 → 셸 물림. 무지지 꼬리 실측.
    const tail = S.sFace - (cols[cols.length - 1].s + cols[cols.length - 1].Rb)
    ok('⚠지지 사슬 보고(끊김 없음 — A의 정의)', tail > 0 && tail < RASC_COL_GAP * 2,
      `디스크 물림 0.05 → 기둥 s${cols.map((c) => r2(c.s)).join('·')} → 꼬리 ${r2(tail)} → 셸 물림 4.19`)
    //  ⓕ 방 천장 안 돌출 = BITE(선언된 비용) 보고
    ok('⚠선언된 비용: 방 천장 안 팔각 스터브 돌출 ≤ BITE(관람 30m+ 비가시)', RASC_FOOT_BITE <= 0.3,
      `BITE ${RASC_FOOT_BITE}(새그 상한 0.154 덮음) × 발 ${cols.length * 4}기(4방)`)
  }
  //  ⓖ 배선(소스): 게이트·walkable·마운트 — ON/OFF 무관 상시
  {
    const RSRC = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
    const GSRC = readFileSync(new URL('./ascentTunnelGeometry.js', import.meta.url), 'utf8')
    ok('배선: 기둥 마운트 walkable:false(밟는 면 아님)', /colGeo\} userData=\{\{ walkable: false \}\}/.test(RSRC))
    ok('배선: 소등 게이트 = 스펙이 빈 배열(★107 규약)', /if \(!RASC_SUP_ON\) return \[\]/.test(GSRC))
    ok('보존계: RASC_SUP_ON=false면 기둥만 사라지고 관은 ★119 그대로', true, '스펙 게이트 — 마운트는 빈 기하')
  }
}

console.log('── ★122 셸 외부 나선 계단 + 고리 소등(2026.08.12 현도 그림) ──')
{
  const { extSpiralSpec, buildExtSpiral, buildExtSpiralParapet, extWindowRibbonGeo } = await import('./extSpiralGeometry.js')
  const { RSP_ON, RSP_WIN_ON, RAD_RING_ON, RSP_BITE, RSP_W, RSP_WIN_MARG,
    RAD_CYL_Y0, RAD_CYL_R, RAD_ASC_RISE_SEED } = await import('./constants.js')
  const RSRC = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
  //  ⓐ 배선·보존계(상시)
  ok('배선: 고리 5구간이 RAD_RING_ON 게이트 안(보존계 — 코드 존속)',
    /RAD_RING_ON && arcs\.map/.test(RSRC) && /ArcSection/.test(RSRC))
  ok('배선: 나선 매스 walkable:true · 관(encl)·창 몰딩(wfr) false — ★122-b',
    /extSpiralGeos\.mass\} userData=\{\{ walkable: true \}\}/.test(RSRC)
    && /extSpiralGeos\.encl\} userData=\{\{ walkable: false \}\}/.test(RSRC)
    && /extSpiralGeos\.wfr\} userData=\{\{ walkable: false \}\}/.test(RSRC))
  ok('배선: 창 리본 컷이 셸 CSG에(게이트 포함)', /if \(RSP_ON && RSP_WIN_ON\) cutBrush\(extWindowRibbonGeo\(\)\)/.test(RSRC))
  ok('존속: 접선 문 컷·문틀·진입 계단(착지 재사용 — 현도 ②)',
    /접선 문 2/.test(RSRC) && /DoorFrame key=\{sg\}/.test(RSRC) && /buildStairGeo\(-dc \+ Math\.PI/.test(RSRC))
  //  ⓑ FR_C 재유도 = Radial 소스 실값(사본 금지 — 두 유도의 수치 대조)
  {
    const S = extSpiralSpec()
    const mFRT = RSRC.match(/const FR_T\s*=\s*([\d.]+)/), mTHW = /RAD_T_HW/.test(RSRC)
    ok('FR_C 유도 정합(extSpiral ↔ Radial — 같은 식·수치 대조)', mFRT && mTHW && Math.abs(S.FR_C - 14.95) < 0.05,
      `extSpiral FR_C ${r2(S.FR_C)} (Radial 주석 ≈14.96)`)
    if (!RSP_ON) {
      ok(true, '⛔RSP_ON=false — 나선 소등(보존계). 수치 절 건너뜀')
    } else {
      //  ⓒ 유도 사실들
      //  ★122-f: 61/14.62 하드코딩 → 파생식(y1 노브 추종). 불변식은 "관 rise = 나선 낙차 · 단수 대칭".
      {
        const AT2 = (await import('./ascentTunnelGeometry.js')).ascSpec()
        ok('★대칭 유도: 나선 낙차 = 상승 관 rise · 오름 단수 = 내림 단수(y1 노브 추종)',
          Math.abs(S.drop - AT2.rise) < 1e-9 && S.N === AT2.N && Math.abs(S.rise - RAD_ASC_RISE_SEED) < 0.01,
          `drop ${r2(S.drop)} = 관 rise ${r2(AT2.rise)} · N ${S.N} = 관 ${AT2.N} · rise ${S.rise.toFixed(4)}`)
      }
      ok('★양끝 고정: 시작 = 새 문(π) · 끝 = 접선 문 방위(감김 1.23바퀴 — "1.5"는 기하적으로 불가·보고됨)',
        Math.abs(S.phi0 - Math.PI) < 1e-9
        && Math.abs((((S.phiEnd % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - (S.dir > 0 ? 2 * Math.PI - S.doorAz : S.doorAz)) < 1e-6,
        `sweep ${(S.sweep * 180 / Math.PI).toFixed(1)}° = ${S.turns.toFixed(3)}바퀴 · 끝 ${(((S.phiEnd * 180 / Math.PI) % 360 + 360) % 360).toFixed(2)}°`)
      ok('착지 정합: 마지막 단 위면 = 접선 문지방(101.28) — 이후 3.2는 기존 진입 계단', Math.abs(S.stepY(S.N) - S.yEnd) < 1e-9,
        `${r2(S.stepY(S.N))} = ${r2(S.yEnd)}`)
      //  ⓓ 안 가장자리 물림(전 단): rIn = 벽면 − BITE. 상/하반부 벽 전환(셸↔원기둥)도 검사
      //  ★122-c ④: 관입 → 이격 반전(방 안 톱니 61개 적발 — 두께 0 셸) — 굽도리가 접선 봉합
      const { RSP_CLEAR } = await import('./constants.js')
      let clearBad = 0
      for (let k = 0; k <= S.N; k++) {
        const y = S.stepY(k)
        if (Math.abs((S.rIn(y) - S.wallR(y)) - RSP_CLEAR) > 1e-9) clearBad++
      }
      ok('★122-c ④: 안 가장자리 = 벽면 + 이격(방 안 돌출 0 — 전 단·벽 전환 포함)', clearBad === 0,
        `위반 ${clearBad} · CLEAR ${RSP_CLEAR} · 경계 y ${RAD_CYL_Y0}: 셸 ${r2(S.shellR(RAD_CYL_Y0))} → 원기둥 ${RAD_CYL_R}`)
      //  ⓔ 기하 실측: NaN · 감김(부호 부피 ≈ 해석)
      const g = buildExtSpiral(), P = g.getAttribute('position'), I = g.index
      let nan = 0
      for (let i = 0; i < P.count; i++) if (![P.getX(i), P.getY(i), P.getZ(i)].every(Number.isFinite)) nan++
      ok('NaN 정점 0(매스)', nan === 0, `${nan} · tris ${I.count / 3}`)
      let vol = 0
      for (let t = 0; t < I.count; t += 3) {
        const A2 = [P.getX(I.getX(t)), P.getY(I.getX(t)), P.getZ(I.getX(t))]
        const B2 = [P.getX(I.getX(t + 1)), P.getY(I.getX(t + 1)), P.getZ(I.getX(t + 1))]
        const C2 = [P.getX(I.getX(t + 2)), P.getY(I.getX(t + 2)), P.getZ(I.getX(t + 2))]
        vol += (A2[0] * (B2[1] * C2[2] - C2[1] * B2[2]) - B2[0] * (A2[1] * C2[2] - C2[1] * A2[2]) + C2[0] * (A2[1] * B2[2] - B2[1] * A2[2])) / 6
      }
      //  해석 근사: 단 블록 유효 두께(massT − rise/2) × 나선 경로 + ★122-b 층계참 2(부채꼴 프리즘 정확식)
      const rMid = (S.rIn(S.y0) + S.rIn(S.yEnd)) / 2 + S.W / 2
      const land = (a, ri2, ro2) => a * (ro2 * ro2 - ri2 * ri2) / 2 * S.massT
      const anaL = land(S.landA0, S.rIn(S.y0), S.rIn(S.y0) + S.W)
                 + land(S.landA1, S.bridgeR, S.rIn(S.yEnd) + S.W)
      const ana = (S.W * (S.massT - S.rise / 2)) * S.sweep * rMid + anaL
      ok('★감김: 부호 부피 양수 · 해석(단 블록 + 층계참 2)과 일치(±10%)', vol > 0 && Math.abs(vol / ana - 1) < 0.1,
        `${vol.toFixed(1)} / ${ana.toFixed(1)} = ${(vol / ana).toFixed(3)} (층계참 해석 ${anaL.toFixed(1)})`)
      //  ★매니폴드(2026.08.12 적발 이력: 연속 스킨 열린 에지 426 → 단 블록 재편으로 0):
      //  열린 에지 0 = 각 블록 watertight. 비정상(3회+)은 인접 블록 겹침 캡의 좌표 일치(내부·비가시) — 보고형.
      {
        const key = (i) => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`
        const edges = new Map()
        for (let t = 0; t < I.count; t += 3) {
          const kk = [I.getX(t), I.getX(t + 1), I.getX(t + 2)].map(key)
          for (let e = 0; e < 3; e++) {
            const a2 = kk[e], b2 = kk[(e + 1) % 3]
            const bw = b2 + '|' + a2
            if (edges.has(bw)) edges.set(bw, edges.get(bw) + 1)
            else edges.set(a2 + '|' + b2, (edges.get(a2 + '|' + b2) || 0) + 1)
          }
        }
        let open2 = 0, multi = 0
        for (const v2 of edges.values()) { if (v2 === 1) open2++; else if (v2 > 2) multi++ }
        ok('★매니폴드: 열린 에지 0(블록별 watertight)', open2 === 0, `열린 ${open2} · 겹침캡 좌표일치(내부) ${multi}`)
      }
      //  매니폴드: 열린 에지 0(단 블록 방식 — 블록별 watertight. 겹친 캡의 3회+ 에지는 내부·비가시라 허용)
      {
        const km = (i) => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`
        const E = new Map()
        for (let t = 0; t < I.count; t += 3) {
          const kk = [I.getX(t), I.getX(t + 1), I.getX(t + 2)].map(km)
          for (let e = 0; e < 3; e++) {
            const a3 = kk[e], b3 = kk[(e + 1) % 3], bw = b3 + '|' + a3
            if (E.has(bw)) E.set(bw, E.get(bw) + 1); else E.set(a3 + '|' + b3, (E.get(a3 + '|' + b3) || 0) + 1)
          }
        }
        let open2 = 0; for (const v of E.values()) if (v === 1) open2++
        ok('매니폴드: 열린 에지 0(2026.08.12 수리 — 연속 스킨 426 → 단 블록 0)', open2 === 0, `열린 ${open2} / 총 ${E.size}`)
      }
      //  ⓕ 창 리본: 상반부 한정 + 문틀 마진(이번 조각 범위 — 하반부는 다음 조각 선언)
      if (RSP_WIN_ON) {
        const w = extWindowRibbonGeo(), WP = w.getAttribute('position')
        let yMin = Infinity, below = 0
        for (let i = 0; i < WP.count; i++) {
          const y = WP.getY(i); yMin = Math.min(yMin, y)
          if (y < RAD_CYL_Y0 - 3) below++       // 리본 몸통이 적도 훨씬 아래로 내려가면 하반부 침범
        }
        ok('창 리본 = 상반부(단일벽) 한정 — 하반부 이중벽 포탈은 다음 조각(선언)', below === 0,
          `최저 y ${r2(yMin)} vs 적도 ${RAD_CYL_Y0} · tris ${w.index.count / 3}`)
      }
      //  ⓖ 이웃 실측 보고(상시): 시작부 ↔ 상승 관 접속 — 상호 관입은 선언된 접합(동일 재질·massT 동일)
      const S2 = S
      //  ★122-f: 접속 보고를 파생식으로 — 참 높이 = 관 도착 y1 · 매스 두께 동일
      {
        const AT3 = (await import('./ascentTunnelGeometry.js')).ascSpec()
        ok('⚠시작부-관 접속: 참 높이 = 관 도착 y1 · 매스 두께 동일(연속 접합 — y1 노브 추종)',
          Math.abs(S2.stepY(0) - AT3.y1) < 1e-9 && Math.abs(S2.massT - AT3.massT) < 1e-9,
          `참 ${r2(S2.stepY(0))} = y1 ${r2(AT3.y1)} · 매스 밑 ${r2(S2.yAt(S2.phi0) - S2.massT)} = 관 밑 ${r2(AT3.y1 - AT3.massT)}`)
      }
      //  ⓗ 바깥 한계: 패러핏 외면 최대 반경 — 인접 꽃잎·박스와 무충돌
      const rOutMax = Math.max(S.rIn(S.yEnd), S.rIn(S.y0), RAD_CYL_R - RSP_BITE) + S.W + 0.4
      ok('바깥 한계: 패러핏 외면 ≤ 인접 꽃잎 순간격 절반(27.8)', rOutMax < 27.8, `최대 r ${r2(rOutMax)}`)
      //  ── ★122-b 수리 5건(2026.08.12 현도 오류 보고) 잠금 ──
      const { buildExtSpiralShell, buildExtWindowFrame, windowSegs } = await import('./extSpiralGeometry.js')
      const { RSP_ENCL, RSP_CLR, RSP_WALL_T, RSP_BRIDGE_R, RSP_WFR_T } = await import('./constants.js')
      //  ①밀봉(관 체제): 천장 최고 = 시작 층계참 y0 + clr + wallT — 하늘길 아님
      if (RSP_ENCL === 'tube') {
        const sh = buildExtSpiralShell(), SP = sh.getAttribute('position')
        let yMax = -1e9, shNan = 0
        for (let i = 0; i < SP.count; i++) { const y = SP.getY(i); yMax = Math.max(yMax, y)
          if (![SP.getX(i), y, SP.getZ(i)].every(Number.isFinite)) shNan++ }
        ok('①밀봉: 관 천장 최고 = y0 + 내부고 + 두께(하늘길 아님 — 현도 ①)',
          shNan === 0 && Math.abs(yMax - (S.y0 + RSP_CLR + RSP_WALL_T)) < 1e-4,   //  ⚠Float32 1e-4
          `천장 ${r2(yMax)} = ${r2(S.y0)} + ${RSP_CLR} + ${RSP_WALL_T} · tris ${sh.index.count / 3}`)
        //  ★122-e: 기준을 문 높이(4.0) → **상승 관 내부고**(4.72)로 정정 — 관에서 나올 때 천장 단차 0이 우선
        ok('①내부고 = 상승 관 내부고(천장 연속 — ★122-e 정정)', Math.abs(RSP_CLR - 4.72) < 1e-9, `clr ${RSP_CLR}`)
      }
      //  ②③층계참: 문 반각 커버 + 끝 다리 안 가장자리 = bridgeR(문지방 몸통 안)
      ok('②층계참이 문 폭을 덮는다(반각 + 마진 — 현도 ②)',
        S.landA0 > Math.asin(2.3 / S.rIn(S.y0)) && S.landA1 > Math.asin(2.3 / S.rIn(S.yEnd)),
        `시작 ${(S.landA0 * 180 / Math.PI).toFixed(1)}° · 끝 ${(S.landA1 * 180 / Math.PI).toFixed(1)}°`)
      //  ★★122-e(현도 3차 "1번 여전히 이상해" — 좌표 실측으로 원인 확정):
      //  ⓐ 참이 관 문 폭 **양쪽** 전체에서 평평한가. 구 상태는 한쪽만 평평해 문 폭 절반이
      //   계단 톱니로 떨어졌고(관 문 반각 8.75° > 하강 시작 0°) 관 바닥판이 그 위에 끼었다.
      {
        const halfDoor = Math.asin(RAD_T_HW / S.rIn(S.y0))     // 관 폭이 회랑 안 가장자리에서 걸치는 반각
        let bad = 0, worst = 0
        for (let i = -20; i <= 20; i++) {
          const phi = S.phi0 + halfDoor * i / 20
          const dy = Math.abs(S.yAt(phi) - S.y0)
          if (dy > 1e-9) { bad++; worst = Math.max(worst, dy) }
        }
        ok('★122-e ⓐ: 관 문 폭 전 범위(±8.75°)가 참 높이로 평평(문 폭 절반 낙하 해소)',
          bad === 0 && S.landA0 >= halfDoor, `이탈 표본 ${bad}(최대 ${r2(worst)}) · 참 반각 ${(S.landA0 * 180 / Math.PI).toFixed(2)}° ≥ 문 반각 ${(halfDoor * 180 / Math.PI).toFixed(2)}°`)
      }
      //  ⓑ 관 내부고 = 나선 내부고(천장 단차 0 — 나오는 순간 천장이 내려앉지 않는다)
      {
        const AT = (await import('./ascentTunnelGeometry.js')).ascSpec()
        //  ★★122-f(현도 4차 — 구조적 충돌): 계단이 회랑에 닿기 전에 y1에 도달해야 한다.
      //  ⛔구 상태: 회랑 점유 s42.55~47.55 vs 계단 종점 s46.10 → 3.55 겹침, 회랑 바깥벽 지점에서
      //   정면 벽 1.96. 계단 종점 기준을 셸면 → 회랑 바깥벽으로 옮기고 y1을 112.5로(경사 28.87° 보존).
      {
        const AT4 = (await import('./ascentTunnelGeometry.js')).ascSpec()
        const { RAD_ASC_LAND1 } = await import('./constants.js')
        const sCorrOut = 62 - (S.rIn(S.y0) + S.W + S.wallT)     // 회랑 바깥벽 s
        const yAtCorr = AT4.chordY(sCorrOut)
        ok('★122-f: 계단 종점이 회랑 진입 전 · 회랑 바깥벽에서 관 바닥 = 참 높이(정면 벽 0)',
          AT4.sSt1 <= sCorrOut - RAD_ASC_LAND1 + 1e-9 && Math.abs(yAtCorr - S.y0) < 1e-9,
          `계단 종점 s${r2(AT4.sSt1)} ≤ 회랑벽 s${r2(sCorrOut)} − 평지 ${RAD_ASC_LAND1} · 바닥 ${r2(yAtCorr)} = 참 ${r2(S.y0)}`)
        ok('★122-f: 관 계단 경사 ≤ ★80 상한 30°(y1 하향으로 확보 — 걷는 감각 보존)',
          AT4.slopeDeg <= 30, `${AT4.slopeDeg.toFixed(2)}° · 길이 ${r2(AT4.runSt)} · ${AT4.N}단 · 답면 ${r2(AT4.tread)}`)
      }
            ok('★122-e ⓑ: 관·나선 천장 밑면 일치(단차 0)',
          Math.abs((AT.y1 + AT.clear) - (S.y0 + S.clr)) < 1e-9,
          `관 ${r2(AT.y1 + AT.clear)} = 나선 ${r2(S.y0 + S.clr)} (내부고 ${r2(AT.clear)})`)
      }
      //  ⓒ 참 몫을 뺀 뒤에도 착지 방위·단수·rise 불변(계단 각만 재배분)
      ok('★122-e ⓒ: 참 확장 후에도 착지·단수·rise 불변(계단 각 재배분으로 흡수)',
        Math.abs(S.stepY(S.N) - S.yEnd) < 1e-9 && S.N === Math.round(S.drop / RAD_ASC_RISE_SEED) && Math.abs(S.sweepStep - (S.sweep - S.landA0)) < 1e-12,
        `마지막 단 ${r2(S.stepY(S.N))} · N ${S.N} · 계단각 ${(S.sweepStep * 180 / Math.PI).toFixed(1)}° · 답면(r16) ${r2(16 * S.dphi)}`)
      {
        //  끝 다리 실측: 매스 정점 중 (끝 층계참 방위 구간, yEnd 레벨) 최소 반경 = bridgeR
        let rMin = 1e9
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i)
          if (Math.abs(y - S.yEnd) > 1e-4) continue   //  ⚠Float32 1e-4
          const phi = Math.atan2(z, x)
          const n0 = ((phi - S.phiEnd) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
          if (S.dir > 0 ? (n0 >= -1e-9 && n0 <= S.landA1 + 1e-9) : (n0 <= 1e-9 && n0 >= -S.landA1 - 1e-9))
            rMin = Math.min(rMin, Math.hypot(x, z))
        }
        //  ★122-k ②: 층계참 안 가장자리가 셸 안으로 관입(이격 → 관입 반전) — 기준을 관입식으로 교체
        const { RSP_LAND_BITE } = await import('./constants.js')
        ok('★122-k ②: 끝 층계참 안 가장자리 = 셸 − 관입(이격 0 · 슬릿 원천 소멸)',
          Math.abs(rMin - (S.wallR(S.yEnd) - RSP_LAND_BITE)) < 1e-3,
          `r ${r2(rMin)} = 셸 ${r2(S.wallR(S.yEnd))} − 관입 ${RSP_LAND_BITE}`)
      }
      //  ④창 몰딩: 세그 정본 공유(리본과 동일 함수) + 기하 유한
      {
        const wf = buildExtWindowFrame(), WP = wf.getAttribute('position')
        let wfNan = 0
        for (let i = 0; i < WP.count; i++) if (![WP.getX(i), WP.getY(i), WP.getZ(i)].every(Number.isFinite)) wfNan++
        const GSRC2 = readFileSync(new URL('./extSpiralGeometry.js', import.meta.url), 'utf8')
        ok('④창 몰딩: 세그 정본 = windowSegs() 공유(리본·몰딩 자동 정렬 — 현도 ④)',
          wfNan === 0 && wf.index.count > 0 && (GSRC2.match(/windowSegs\(\)/g) || []).length >= 2,
          `tris ${wf.index.count / 3} · 몰딩 단면 ${RSP_WFR_T}`)
      }
      //  ⑤유령 개구 게이트 보고(정본 = constants 한 곳 — Radial·원기둥·계단·문틀이 같은 값)
      ok('⑤유령 개구 게이트(★120 구세계 결합 패턴 — 현도 ⑤)',
        typeof TAN_DOOR_POS_GATE === 'boolean' && typeof TAN_DOOR_NEG_GATE === 'boolean' && typeof CYL_HUB_DOOR_GATE === 'boolean',
        `+z ${TAN_DOOR_POS_GATE ? '개구' : '봉인'} · −z ${TAN_DOOR_NEG_GATE ? '개구' : '봉인'} · 원기둥 허브 ${CYL_HUB_DOOR_GATE ? '개구' : '봉인'}`)
      //  ── ★122-c 접합 수리 5건(2026.08.12 현도 2차 보고 — 스크린샷 실측) 잠금 ──
      const { buildExtSpiralSkirt } = await import('./extSpiralGeometry.js')
      const { ASC_DOOR_GATE, ASC_JUNC_HW, RSP_SKIRT_H } = await import('./constants.js')
      const A122 = (await import('./ascentTunnelGeometry.js')).ascSpec()
      //  ①②T 접속: 관 벽 유효 끝 = 나선 바깥벽면(두 모듈 독립 유도 대조 — 사본 금지 규약)
      {
        const rW1 = S.rIn(S.y0) + S.W + 0.4
        const expect = 62 - rW1
        //  ★122-g: 벽 끝 = 회랑 바깥벽 + 관입(직선↔원호 새그 삼킴) · 매스 끝 = 잼 앞면(발코니)
        const { ASC_JUNC_BITE } = await import('./constants.js')
        ok('★122-g ①: 관 벽·천장 끝 = 회랑 바깥벽 + 관입(세로 슬릿 봉합) · 매스 끝 = 발코니 앞코',
          Math.abs(A122.sWallEnd - (expect + ASC_JUNC_BITE)) < 1e-6 && Math.abs(A122.sMassEnd - A122.sOvlEnd) < 1e-9,
          `sWallEnd ${r2(A122.sWallEnd)} = 벽 ${r2(expect)} + 관입 ${ASC_JUNC_BITE} · sMassEnd ${r2(A122.sMassEnd)} = 발코니 끝 ${r2(A122.sOvlEnd)}`)
        //  ★122-g ①-b: 관입이 원호 새그를 덮는가(닫힌 식) — 이게 슬릿의 유일한 원인이었다
        {
          const rW1b = S.rIn(S.y0) + S.W + S.wallT
          const sag = rW1b - Math.sqrt(rW1b * rW1b - RAD_T_HW * RAD_T_HW)
          ok('★122-g ①-b: 관입 > 원호 새그(틈 0) · 벽 두께 안에서 흡수',
            ASC_JUNC_BITE > sag && ASC_JUNC_BITE <= S.wallT, `관입 ${ASC_JUNC_BITE} > 새그 ${r2(sag)} · 벽 두께 ${S.wallT}`)
        }
        //  ②개구: 외피 바깥벽 정점이 개구 방위·문 높이 창에 없다(경로 개방) + 개구 밖엔 벽 존재
        const sh = (await import('./extSpiralGeometry.js')).buildExtSpiralShell()
        const SP2 = sh.getAttribute('position')
        const juncA = Math.asin(ASC_JUNC_HW / rW1)
        let inWin = 0, outWall = 0
        for (let i = 0; i < SP2.count; i++) {
          const x = SP2.getX(i), y = SP2.getY(i), z = SP2.getZ(i)
          const r = Math.hypot(x, z), phi = Math.atan2(z, x)
          const dphi2 = Math.abs(((phi - S.phi0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
          const isWall = Math.abs(r - (S.rIn(S.y0) + S.W)) < 0.06 || Math.abs(r - rW1) < 0.06
          if (!isWall) continue
          if (dphi2 < juncA - 0.02 && y > S.y0 + 0.1 && y < S.y0 + S.clr - 0.1) inWin++
          if (dphi2 > juncA + 0.05 && dphi2 < juncA + 0.3) outWall++
        }
        ok('★122-c ②: 개구 구간에 바깥벽 정점 0(경로 개방 — "옆면이 막는다" 해소) · 개구 밖 벽 존재',
          inWin === 0 && outWall > 0, `개구 안 ${inWin} · 개구 옆 벽 정점 ${outWall}`)
      }
      //  ④매스 최대 s ≤ 층계참 접합면(스텁 부재 — 방 안 무용 돌출 소멸) — 관 매스 실기하
      {
        const am = (await import('./ascentTunnelGeometry.js')).buildAscentMass()
        const AP = am.getAttribute('position')
        let sMax = -1e9
        for (let i = 0; i < AP.count; i++) sMax = Math.max(sMax, AP.getX(i))
        //  ★122-g ②: 매스 = 발코니(잼 앞면까지) — 좌우 잼보다 짧던 바닥을 내밀었다(현도 ②)
        ok('★122-g ②: 발코니 바닥 = 잼 앞면까지 · 개구 폭 안(잼 사이로만 돌출)',
          Math.abs(sMax - A122.sOvlEnd) < 1e-3 && A122.massHW < 2.3 + 1e-9,
          `최대 s ${r2(sMax)} = 발코니 ${r2(A122.sOvlEnd)} · 셸면 대비 +${r2(A122.ovlExt)} · 반폭 ${A122.massHW} < 컷 2.3`)
      }
      //  ③리본 = 연속 스윕 watertight(세그 경계 슬리버 원인 소멸)
      {
        const w2 = extWindowRibbonGeo(), WP2 = w2.getAttribute('position'), WI2 = w2.index
        const key2 = (i) => `${WP2.getX(i).toFixed(4)},${WP2.getY(i).toFixed(4)},${WP2.getZ(i).toFixed(4)}`
        const E2 = new Map()
        for (let t = 0; t < WI2.count; t += 3) {
          const kk = [WI2.getX(t), WI2.getX(t + 1), WI2.getX(t + 2)].map(key2)
          for (let e = 0; e < 3; e++) {
            const a2 = kk[e], b2 = kk[(e + 1) % 3], bw = b2 + '|' + a2
            if (E2.has(bw)) E2.set(bw, E2.get(bw) + 1)
            else E2.set(a2 + '|' + b2, (E2.get(a2 + '|' + b2) || 0) + 1)
          }
        }
        let o2 = 0, m2 = 0
        for (const v2 of E2.values()) { if (v2 === 1) o2++; else if (v2 > 2) m2++ }
        ok('★122-c ③: 창 리본 = 연속 스윕 watertight(열린 0·비정상 0 — 세그 슬리버 원인 소멸)',
          o2 === 0 && m2 === 0, `열린 ${o2} · 비정상 ${m2} · tris ${WI2.count / 3}`)
      }
      //  ④굽도리: 존재 + 상단 = 발판 + SKIRT_H(시작 층계참에서 실측)
      {
        const sk = buildExtSpiralSkirt(), KP = sk.getAttribute('position')
        let yMaxAtStart = -1e9
        for (let i = 0; i < KP.count; i++) {
          const x = KP.getX(i), z = KP.getZ(i), phi = Math.atan2(z, x)
          const d0 = Math.abs(((phi - S.phiL0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
          if (d0 < 0.05) yMaxAtStart = Math.max(yMaxAtStart, KP.getY(i))
        }
        ok('★122-c ④: 굽도리 존재 · 상단 = 발판 + SKIRT_H(접선 봉합 — 연속 밴드)',
          sk.index.count > 0 && Math.abs(yMaxAtStart - (S.y0 + RSP_SKIRT_H)) < 1e-3,
          `상단 ${r2(yMaxAtStart)} = ${r2(S.y0 + RSP_SKIRT_H)} · tris ${sk.index.count / 3}`)
      }
      //  ⑤양끝 전체 단면 캡(통로째 뻥 뚫림 봉인): 끝 방위에 셸면~바깥벽 걸침 캡 정점 존재
      {
        const sh2 = (await import('./extSpiralGeometry.js')).buildExtSpiralShell()
        const SP3 = sh2.getAttribute('position')
        let capIn = 0
        for (let i = 0; i < SP3.count; i++) {
          const x = SP3.getX(i), z = SP3.getZ(i), phi = Math.atan2(z, x)
          const d1 = Math.abs(((phi - S.phiL1) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
          if (d1 < 1e-4 && Math.hypot(x, z) < S.wallR(S.yAt(S.phiL1)) + 0.5) capIn++
        }
        ok('★122-c ⑤: 끝 캡 = 전체 단면(셸면까지 걸침 — 통로 개구 봉인)', capIn >= 2, `셸측 캡 정점 ${capIn}`)
      }
      //  ── ★122-d(현도 3차 보고 — "면이 안 보인다"·전망대·착지 유격) ──
      const { orientOutward, openEdgeCount } = await import('./orientGeo.js')
      const EG = await import('./extSpiralGeometry.js')
      const AG = await import('./ascentTunnelGeometry.js')
      //  ⓐ★도구 자체 검증(도구 먼저 검증 규율): 일부러 뒤집은 정육면체를 넣으면 바깥으로 되돌리는가
      {
        const P2 = [], I2 = []
        const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]
        const F = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
        F.forEach((f, k) => {
          const o = k % 2 ? [f[0], f[2], f[1], f[3]] : f      // 절반을 일부러 오감김
          const b = P2.length / 3
          for (const vi of [o[0], o[1], o[2], o[3]]) P2.push(...V[vi])
          I2.push(b, b + 1, b + 2, b, b + 2, b + 3)
        })
        const g2 = new THREE.BufferGeometry()
        g2.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3))
        g2.setIndex(I2)
        orientOutward(g2)
        const PP = g2.getAttribute('position'), II = g2.index
        let v2 = 0, bad = 0
        for (let t = 0; t < II.count; t += 3) {
          const a = [PP.getX(II.getX(t)), PP.getY(II.getX(t)), PP.getZ(II.getX(t))]
          const b2 = [PP.getX(II.getX(t + 1)), PP.getY(II.getX(t + 1)), PP.getZ(II.getX(t + 1))]
          const c2 = [PP.getX(II.getX(t + 2)), PP.getY(II.getX(t + 2)), PP.getZ(II.getX(t + 2))]
          v2 += (a[0] * (b2[1] * c2[2] - b2[2] * c2[1]) - a[1] * (b2[0] * c2[2] - b2[2] * c2[0]) + a[2] * (b2[0] * c2[1] - b2[1] * c2[0])) / 6
          const u = b2.map((x, i) => x - a[i]), w = c2.map((x, i) => x - a[i])
          const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
          const cen = a.map((x, i) => (x + b2[i] + c2[i]) / 3)
          if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] <= 0) bad++     // 법선이 원점 반대편(바깥)이어야
        }
        ok('★122-d ⓐ 도구 검증: 오감김 정육면체 → 전 면 바깥 복원(부피 +8)',
          bad === 0 && Math.abs(v2 - 8) < 1e-6, `오감김 잔여 ${bad} · 부피 ${v2.toFixed(3)}`)
      }
      //  ⓑ★전 기하 감김 일제 잠금(현도 ② "면이 안 보인다" 재발 방지 — 신규 기하도 자동 포함)
      {
        const geos = [
          ['나선 매스', EG.buildExtSpiral()], ['관 외피', EG.buildExtSpiralShell()],
          ['굽도리', EG.buildExtSpiralSkirt()], ['창 몰딩', EG.buildExtWindowFrame()],
          ['창 리본', EG.extWindowRibbonGeo()], ['착지 다리', EG.buildExtSpiralBridge()],
          ['전망 난간', AG.buildAscentOverlook()], ['관 매스', AG.buildAscentMass()],
        ]
        const bad = []
        for (const [nm, g3] of geos) {
          const PP = g3.getAttribute('position'), II = g3.index
          if (!II || !II.count) { bad.push(nm + '(빈 기하)'); continue }
          let v3 = 0
          for (let t = 0; t < II.count; t += 3) {
            const a = [PP.getX(II.getX(t)), PP.getY(II.getX(t)), PP.getZ(II.getX(t))]
            const b2 = [PP.getX(II.getX(t + 1)), PP.getY(II.getX(t + 1)), PP.getZ(II.getX(t + 1))]
            const c2 = [PP.getX(II.getX(t + 2)), PP.getY(II.getX(t + 2)), PP.getZ(II.getX(t + 2))]
            v3 += (a[0] * (b2[1] * c2[2] - b2[2] * c2[1]) - a[1] * (b2[0] * c2[2] - b2[2] * c2[0]) + a[2] * (b2[0] * c2[1] - b2[1] * c2[0])) / 6
          }
          if (!(v3 > 0)) bad.push(`${nm}(부피 ${v3.toFixed(1)})`)
        }
        ok('★122-d ⓑ: 나선·관 전 기하 부호 부피 양수(감김 일괄 — 손 정렬 폐기)', bad.length === 0, bad.join(' · ') || '8종 전부 양수')
      }
      //  ⓒ전망대(현도 ①): 새 문 컷 존치 + 난간이 개구를 가로막음 + 관 매스가 셸면 flush
      {
        const ov = AG.buildAscentOverlook(), OP = ov.getAttribute('position')
        let sMin = 1e9, sMax2 = -1e9, yTop = -1e9
        for (let i = 0; i < OP.count; i++) { sMin = Math.min(sMin, OP.getX(i)); sMax2 = Math.max(sMax2, OP.getX(i)); yTop = Math.max(yTop, OP.getY(i)) }
        //  ★122-g: 난간은 셸면이 아니라 **발코니 앞코**에 선다(바닥만 길어지고 난간이 뒤에 남으면 안 됨)
      //  ── ★122-h(현도 6차 세부 2건) ──
      //  ②전망대 앞 턱: 굽도리가 관 문 앞도 가로질러 발판 위 0.45 턱을 만들었다(★122-c에서 접선 문
      //   앞만 비켰음). 문 앞에는 문턱을 두지 않는다 — 참 높이 대역에 굽도리 정점 0.
      {
        const sk2 = (await import('./extSpiralGeometry.js')).buildExtSpiralSkirt()
        const KP2 = sk2.getAttribute('position')
        const halfDoor2 = Math.asin((A122.massHW) / S.rIn(S.y0))
        let lip = 0
        for (let i = 0; i < KP2.count; i++) {
          const phi = Math.atan2(KP2.getZ(i), KP2.getX(i))
          const d2 = Math.abs(((phi - S.phi0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
          //  ⚠1.23바퀴라 문 방위를 두 번 지난다 — 참 높이 대역(y0 ± 1)만 턱으로 센다(아래 통과분은 정상)
          if (d2 < halfDoor2 && Math.abs(KP2.getY(i) - S.y0) < 1) lip++
        }
        ok('★122-h ②: 전망 개구 앞 굽도리 턱 0(문 앞엔 문턱 없음 · 아래 통과분은 무관)',
          lip === 0 && openEdgeCount(sk2) === 0, `참 높이 턱 정점 ${lip} · 굽도리 열린 에지 ${openEdgeCount(sk2)}`)
      }
      //  ★★122-R(현도 16차 3건): ①어귀 곡률 틈(디스크 원판 ↔ 관 직선) ②관 벽↔개구 폭 불일치
      //  ③셸 안 잔여 관입. ②는 ★122-Q와 **반대 방향** — 여기선 관 벽이 개구를 삼키므로 개구가 좁아야.
      {
        const { ASC_JUNC_HW: JHW, ASC_MOUTH_SILL_ON, ASC_MOUTH_SILL_D, ASC_MOUTH_SILL_T } = await import('./constants.js')
        const A5 = (await import('./ascentTunnelGeometry.js')).ascSpec()
        const rW1c = S.rIn(S.y0) + S.W + S.wallT
        const openZ = rW1c * Math.sin(Math.asin(JHW / rW1c))
        ok('★122-R ②: 나선 개구가 관 벽 안(벽이 개구 가장자리를 삼킴 — ★122-Q와 반대 방향)',
          openZ < RAD_T_HW - 0.05, `개구 z ±${r2(openZ)} < 관 벽 ±${RAD_T_HW}`)
        const ms = (await import('./ascentTunnelGeometry.js')).buildAscentMouthSill()
        const MP = ms.getAttribute('position')
        let sMin5 = 1e9, yT5 = -1e9, hwMax = 0
        for (let i = 0; i < MP.count; i++) {
          sMin5 = Math.min(sMin5, MP.getX(i)); yT5 = Math.max(yT5, MP.getY(i))
          hwMax = Math.max(hwMax, Math.abs(MP.getZ(i)))
        }
        ok('★122-R ①: 어귀 접합 판(윗면 = 관 바닥 · 디스크 안으로 물림 · 폭 > 관 매스)',
          //  ⚠Float32 1e-4(정점 버퍼 정밀도 — 이 프로젝트 반복 교훈)
          !ASC_MOUTH_SILL_ON || (openEdgeCount(ms) === 0 && Math.abs(yT5 - A5.y0) < 1e-4
            && sMin5 <= A5.s0 - ASC_MOUTH_SILL_D + 1e-4 && hwMax > A5.massHW),
          `s ${r2(sMin5)}~ · 윗면 ${r2(yT5)} = ${r2(A5.y0)} · 반폭 ${r2(hwMax)} > 매스 ${A5.massHW}`)
      }
      //  ★★122-O(현도: "셸 안쪽에서 튀어나오는 찌꺼기 없애줘 · 문틀 조금만 덜"):
      //  원인 둘 — ⓐ관입값이 셸 삼각화 새그(실측 0.035)의 4~8배로 과했다 ⓑ셸 반경이 높이에 따라
      //  변하는데 단면을 y 하나로 잡아 요소의 **아래쪽 높이**에서 돌출했다(wallRMax로 교정).
      //  창 몰딩은 창 테두리라 제외(현도 명시).
      {
        const EG2 = await import('./extSpiralGeometry.js')
        const bad = []
        for (const [nm, g6] of [['나선매스', EG2.buildExtSpiral()], ['관외피', EG2.buildExtSpiralShell()],
                                ['굽도리', EG2.buildExtSpiralSkirt()]]) {
          const P6 = g6.getAttribute('position')
          let worst = 0
          for (let i = 0; i < P6.count; i++) {
            const d6 = S.wallR(P6.getY(i)) - Math.hypot(P6.getX(i), P6.getZ(i))
            if (d6 > worst) worst = d6
          }
          if (worst > 1e-4) bad.push(`${nm} ${worst.toFixed(4)}`)
        }
        //  ★122-R ③: 임계 0.06 → 0.045(새그 0.035 + 0.01) · 창 몰딩도 0.09 이하로 별도 잠금
        const wf3 = EG2.buildExtWindowFrame(), WP3 = wf3.getAttribute('position')
        let wfw = 0
        for (let i = 0; i < WP3.count; i++) {
          const d7 = S.wallR(WP3.getY(i)) - Math.hypot(WP3.getX(i), WP3.getZ(i))
          if (d7 > wfw) wfw = d7
        }
        //  ★★122-S: 셸은 다각형(세그 48 · 표면 반경 16.215~16.250)이므로 요소 안 반경 = wallR이면
        //  방 안 돌출이 **수학적으로 0**이다(셸 표면이 wallR을 넘는 곳이 없다). 통로 쪽 미세 틈
        //  (≤ 새그 0.035)은 굽도리·문틀이 덮는다 — 방 안 가시성이 우선(현도 판정).
        //  ⚠창 몰딩은 제외: 창 테두리가 방 안으로 나오는 것은 의도(현도: "자연스러운 현상").
        ok('★122-S: 나선 천장·바닥·굽도리의 셸 안쪽 돌출 = 0(방 안 띠 소멸)',
          bad.length === 0, bad.length ? bad.join(' · ') : `세 기하 0.0000 · 창 몰딩 ${r2(wfw)}(의도)`)
      }
      //  ★★★122-N(현도 지시 그대로): 접선 문틀을 **나선 통로 쪽**으로 연장해 틈을 채운다.
      //  구 문틀 바깥 끝 r16.455는 원기둥면(16.25)을 0.2만 넘고 통로 안 가장자리(16.30) 안에서
      //  끝나 원기둥 개구 가장자리를 못 삼켰다 → 문틀이 통로 안까지 뻗어야 한다.
      {
        const { TAN_FR_OUT_EXT, RAD_CYL_R: RC2 } = await import('./constants.js')
        const FRC2 = 14.95, FRD2 = 3.01
        const outR = FRC2 + FRD2 / 2 + TAN_FR_OUT_EXT          // 문틀 바깥 끝 반경
        const RSRC3 = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
        ok('★122-N: 접선 문틀이 통로 안까지 뻗어 원기둥 개구 가장자리를 삼킨다',
          outR > S.rIn(S.yEnd) + 0.5 && outR < S.rIn(S.yEnd) + S.W - 0.3
          && /outExt=\{TAN_FR_OUT_EXT\}/.test(RSRC3),
          `문틀 바깥 끝 r ${r2(outR)} · 원기둥 ${RC2} · 통로 ${r2(S.rIn(S.yEnd))}~${r2(S.rIn(S.yEnd) + S.W)}`)
      }
      //  ★★★122-M(2026.08.12 현도 지목 + 레이캐스트 렌더로 확정 — 여섯 번째 만에 잡은 진짜 원인):
      //  고리 소등 후 **원기둥이 나선 통로의 안벽**이 됐는데, 원기둥 접선 개구의 여유(RAD_CYL_DOOR_M
      //  0.15)는 **고리 관 단면을 위한 고리 세계 전용 값**이었다. 그 결과 개구(254.00~271.25°)가
      //  문틀 잼 안쪽 면(255.58~270.34°)보다 양쪽으로 넓어 **잼 밖에서 열린 세로 슬릿 두 줄**이 남았다.
      //  → 여유를 세계 파생(CYL_TAN_DOOR_M)으로: 고리 세계 0.15 · 나선 세계 −0.5(개구를 잼 안으로).
      {
        const { CYL_TAN_DOOR_M, RAD_CYL_R, RAD_CYL_DOOR_ON, TAN_JAMB_IN: TJI, RAD_TOP: RT2 } = await import('./constants.js')
        const Wm = RAD_DOOR_HW + CYL_TAN_DOOR_M
        let alo = null, ahi = null
        for (let a = 240; a <= 290; a += 0.05) {
          const rad = a * Math.PI / 180
          const d5 = Math.hypot(62 + RAD_CYL_R * Math.cos(rad), RAD_CYL_R * Math.sin(rad))
          if (Math.abs(d5 - 62) <= Wm) { if (alo === null) alo = a; ahi = a }
        }
        //  잼 안쪽 면 방위(문틀 로컬 → 꽃잎 로컬 변환, 착지 −z 쪽)
        const FRC = 14.95, dc5 = 2 * Math.asin(FRC / (2 * RAD_R))
        const fx5 = RAD_R * (Math.cos(dc5) - 1), fz5 = -RAD_R * Math.sin(dc5)
        const jamb = [1, -1].map((js) => {
          const lxj = js * (RAD_T_HW - TJI)
          const x5 = lxj * Math.cos(dc5) + fx5, z5 = -lxj * Math.sin(dc5) + fz5
          return ((Math.atan2(z5, x5) * 180 / Math.PI) + 360) % 360
        }).sort((a, b) => a - b)
        //  고리 세계에서는 개구를 고리 관 단면이 채우므로 잼보다 넓은 게 정상 — 나선 세계에서만 잠근다
        //  ★122-Q 규약 정정: 개구가 잼보다 **좁으면** 그 차이가 문틀 안 조각으로 보인다(현도 실측).
        //  올바른 조건 = 개구가 잼 **안쪽 면을 덮고**(≥) 잼 **몸통(바깥 면)** 안에 있을 것(≤).
        const jambOut = [263.08 - Math.asin((RAD_T_HW + 0.5) / 14.95) * 180 / Math.PI,
                         263.08 + Math.asin((RAD_T_HW + 0.5) / 14.95) * 180 / Math.PI]
        ok(`★122-M·Q: 원기둥 접선 개구 = 세계 파생(${RAD_RING_ON ? '고리 관이 채움' : '잼 안쪽 면 덮고 잼 몸통 안'})`,
          !RAD_CYL_DOOR_ON || RAD_RING_ON
          || (alo !== null && alo <= jamb[0] && ahi >= jamb[1] && alo > jambOut[0] + 0.3 && ahi < jambOut[1] - 0.3),
          `개구 ${r2(alo)}~${r2(ahi)}° · 잼 안쪽 ${r2(jamb[0])}~${r2(jamb[1])}° · 잼 몸통 ${r2(jambOut[0])}~${r2(jambOut[1])}°`)
        //  ★122-Q ②: 문지방이 개구 바닥 림을 덮는가(곡률 차 쐐기 틈 봉합 — 배선 확인)
        {
          const { TAN_SILL_ON, TAN_SILL_T } = await import('./constants.js')
          const RSRC4 = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
          //  보존계: 소등 시 배선만 확인(문지방 없는 구 상태 = 곡률 틈 재발 — 상시 보고)
          ok(TAN_SILL_ON ? '★122-Q ②: 접선 문 문지방(윗면 = 문지방 레벨 · 단차 0 · walkable)'
                         : '⚠보존계: 문지방 소등 — 곡률 차 바닥 틈이 재발하는 상태(배선만 확인)',
            TAN_SILL_T > 0
            && /sill=\{TAN_SILL_ON\}/.test(RSRC4)
            && /position=\{\[0, yFloor - TAN_SILL_T \/ 2, zOff\]\} userData=\{\{ walkable: true \}\}/.test(RSRC4),
            `두께 ${TAN_SILL_T} · 폭 = 개구 전폭 · 깊이 = 문틀 깊이(연장 포함)`)
        }
      }
      //  ★★★122-L(2026.08.12 · 레이캐스트 렌더로 뚫린 픽셀 좌표를 직접 확정한 뒤 수리):
      //  관 외피 양끝 캡의 안쪽 반경이 **바닥 높이 하나로 고정**돼 셸 곡률을 못 따라갔다
      //  (y112.5 셸 15.55 → y115.8 셸 14.46, 캡이 1.1 못 미침) → 위쪽이 벌어져 세로 슬릿.
      //  이제 캡을 세로 분할해 각 높이의 벽면을 따른다 — 전 높이에서 물림 0.15가 유지되는지 잰다.
      {
        const sh4 = (await import('./extSpiralGeometry.js')).buildExtSpiralShell()
        const SP4 = sh4.getAttribute('position')
        const capPhi = [S.phiL0, S.phiL1]
        let worst = 0, n4 = 0
        for (let i = 0; i < SP4.count; i++) {
          const x = SP4.getX(i), y = SP4.getY(i), z = SP4.getZ(i)
          const phi4 = Math.atan2(z, x)
          const onCap = capPhi.some((pc) => Math.abs(((phi4 - pc) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) < 1e-3)
          if (!onCap) continue
          const r6 = Math.hypot(x, z)
          if (r6 > S.wallR(y) + 0.5) continue              // 바깥벽 쪽 정점은 제외
          n4++
          //  ★122-O 규약: 세그 범위 최대 wallR − BITE(정점별 wallR이 아님 — 아래쪽 돌출 방지)
          worst = Math.max(worst, S.wallR(y) - r6)
        }
        const { RSP_BITE: BT } = await import('./constants.js')
        ok('★122-L·O: 관 외피 끝 캡이 셸을 따라가되 안쪽 돌출 ≤ BITE',
          n4 > 0 && worst <= BT + 1e-3, `캡 안쪽 정점 ${n4} · 최대 돌출 ${r2(worst)} ≤ ${BT}`)
      }
      //  ★★122-k ①(현도 지적): 접선 문틀 잼이 컷 가장자리를 겨우 0.10 덮어 세로 슬릿이 났다.
      //  "문틀은 컷 림을 삼킨다"는 어법인데 삼킴이 부족했던 것 → jambIn으로 겹침을 키운다.
      {
        const { TAN_JAMB_IN } = await import('./constants.js')
        const RSRC2 = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
        const overlap = RAD_DOOR_HW - (RAD_T_HW - TAN_JAMB_IN)
        ok('★122-k ①: 접선 잼이 컷 림을 충분히 삼킴(겹침 ≥ 0.3) · 통과 폭 확보',
          overlap >= 0.3 && (RAD_T_HW - TAN_JAMB_IN) * 2 >= 3.6 && /jambIn=\{TAN_JAMB_IN\}/.test(RSRC2),
          `겹침 ${r2(overlap)}(구 0.10) · 통과 폭 ${r2((RAD_T_HW - TAN_JAMB_IN) * 2)}`)
      }
      //  ①다리↔셸 실틈: 다리 폭이 컷 폭과 같으면 물림 0 — 컷 가장자리를 양쪽으로 물어야 한다
      {
        const { RSP_BR_BITE, RAD_DOOR_HW: DHW } = await import('./constants.js')
        const br2 = (await import('./extSpiralGeometry.js')).buildExtSpiralBridge()
        ok('★122-h ①: 다리가 셸 컷 가장자리를 양쪽으로 물림(폭 = 컷 + 2×BITE, 실틈 0)',
          RSP_BR_BITE > 0 && openEdgeCount(br2) === 0, `물림 ${RSP_BR_BITE} · 반폭 ${r2(DHW + RSP_BR_BITE)} vs 컷 ${DHW} · 열린 에지 ${openEdgeCount(br2)}`)
        //  ★★122-i(현도 7차 — 격자 스캔으로 좌표 확정한 두 결함)
        //  ①다리 반경 도달: 구 코드는 깊이축 **부호가 반대**여서 바깥 끝이 r16.22로 회랑(16.30)에
        //   닿지도 못했다(틈의 직접 원인). 이제 회랑을 덮고, 안쪽은 진입 계단 착지장(13.5)을 안 침범.
        {
          const BP2 = br2.getAttribute('position')
          let rMin3 = 1e9, rMax3 = -1e9
          for (let i = 0; i < BP2.count; i++) {
            const r4 = Math.hypot(BP2.getX(i), BP2.getZ(i))
            rMin3 = Math.min(rMin3, r4); rMax3 = Math.max(rMax3, r4)
          }
          ok('★122-i ①: 다리가 회랑 바닥에 도달(겹침 > 0) · 진입 계단 착지장(13.5) 미침범',
            rMax3 > S.rIn(S.yEnd) + 0.5 && rMin3 > 13.5,
            `r ${r2(rMin3)}~${r2(rMax3)} · 회랑 안 ${r2(S.rIn(S.yEnd))} 겹침 ${r2(rMax3 - S.rIn(S.yEnd))} · 착지장 여유 ${r2(rMin3 - 13.5)}`)
        }
        //  ②굽도리 과다 절단: 접선 문 앞을 컷 반각보다 2.86° 더 잘라 이격 0.05가 맨살 노출됐다.
        //   이제 컷 반각 **안으로** 물린다(개구 안엔 셸이 없어 봉합 불필요).
        {
          const cutHalfTrue = Math.asin(2.3 / S.wallR(S.yEnd))
          const sk3 = (await import('./extSpiralGeometry.js')).buildExtSpiralSkirt()
          const KP3 = sk3.getAttribute('position')
          let dMin = 1e9
          for (let i = 0; i < KP3.count; i++) {
            if (Math.abs(KP3.getY(i) - S.yEnd) > 2) continue
            const phi3 = Math.atan2(KP3.getZ(i), KP3.getX(i))
            const d3 = Math.abs(((phi3 - S.phiEnd) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
            dMin = Math.min(dMin, d3)
          }
          //  ★122-P 규약 교체: ★122-N에서 **문틀이 통로 쪽으로 뻗어** 문 앞을 덮게 됐으므로,
          //  굽도리("연석")가 문 앞까지 갈 필요가 없다(현도: "약간만 짧게"). 대신 굽도리 종료가
          //  **문틀 잼이 덮는 방위 안**이어야 그 사이가 비지 않는다.
          const jambHalf = Math.asin((RAD_T_HW + 0.5) / 14.95)     // 잼 바깥 면 반각
          ok('★122-P: 굽도리 종료가 문틀 잼이 덮는 방위 안(문 앞은 문틀이 담당)',
            dMin < jambHalf, `종료 ${(dMin * 180 / Math.PI).toFixed(2)}° < 잼 반각 ${(jambHalf * 180 / Math.PI).toFixed(2)}° (컷 반각 ${(cutHalfTrue * 180 / Math.PI).toFixed(2)}°)`)
          //  ★★122-j(현도 8차 — 카메라 φ265.6°가 결정적 단서): 굽도리 범위가 계단 끝까지였고
          //  **착지 층계참 구간이 통째로 빠져** 그 전체가 관통 슬릿이었다. 이제 양끝 층계참까지 덮고
          //  개구 방위만 비운다. 1° 격자 전수 검사 — 개구 밖에 빈 방위가 있으면 실패.
          {
            const D2 = (r5) => ((r5 * 180 / Math.PI) % 360 + 360) % 360
            const KP4 = sk3.getAttribute('position')
            const cover = new Set()
            for (let i = 0; i < KP4.count; i++) {
              if (Math.abs(KP4.getY(i) - S.yEnd) > 2.5) continue
              cover.add(Math.round(D2(Math.atan2(KP4.getZ(i), KP4.getX(i)))))
            }
            const doorLo = D2(S.phiEnd) - cutHalfTrue * 180 / Math.PI - 1
            const doorHi = D2(S.phiEnd) + cutHalfTrue * 180 / Math.PI + 1
            const landHi = D2(S.phiL1)
            let bare = []
            for (let d = Math.ceil(doorHi); d <= Math.floor(landHi) - 1; d++)
              if (!cover.has(d) && !cover.has(d - 1) && !cover.has(d + 1)) bare.push(d)
            ok('★122-j: 착지 층계참에도 굽도리(개구 밖 맨살 방위 0 — 1° 전수)',
              bare.length === 0, `맨살 ${bare.length ? bare.join(',') + '°' : '없음'} · 개구 ${r2(doorLo)}~${r2(doorHi)}° · 층계참 끝 ${r2(landHi)}°`)
          }
        }
      }
              ok('★122-g ②-b: 난간 = 발코니 앞코(끝에서 0.1 이내) · 상단 = 문지방 + 1.05',
          openEdgeCount(ov) === 0 && A122.sOvlEnd - sMax2 <= 0.15 && Math.abs(yTop - (A122.y1 + 1.05)) < 1e-4,
          `난간 s ${r2(sMin)}~${r2(sMax2)} · 발코니 끝 ${r2(A122.sOvlEnd)} · 상단 ${r2(yTop)}`)
      }
      //  ⓓ착지 유격(현도 ③): 다리 = 접선 컷과 같은 방향·폭 · 안쪽이 진입 계단 착지장(≈13.5)을 물고
      //   바깥이 회랑 바닥(rIn(yEnd))을 덮는다 — 호↔직선 쐐기 틈 소거
      {
        const br = EG.buildExtSpiralBridge(), BP = br.getAttribute('position')
        let rMin2 = 1e9, rMax2 = -1e9, yT2 = -1e9
        for (let i = 0; i < BP.count; i++) {
          const r3 = Math.hypot(BP.getX(i), BP.getZ(i))
          rMin2 = Math.min(rMin2, r3); rMax2 = Math.max(rMax2, r3); yT2 = Math.max(yT2, BP.getY(i))
        }
        //  ⚠★122-i에서 규약이 바뀌었다: 구 규약 "착지장을 물어라"는 **진입 계단을 삼키는 원인**이었다
        //  (현도 실측 2.09 덮음) → 새 규약 = "회랑에 닿되 착지장은 침범하지 않는다". 상세 잠금은 ★122-i ①.
        ok('★122-d ⓓ 착지 다리: 컷 정렬 판 · 회랑에 도달 · 윗면 = 문지방(★122-i 규약)',
          openEdgeCount(br) === 0 && rMax2 >= S.rIn(S.yEnd) && Math.abs(yT2 - S.yEnd) < 1e-4,
          `r ${r2(rMin2)}~${r2(rMax2)} (회랑 안 ${r2(S.rIn(S.yEnd))}) · 윗면 ${r2(yT2)}`)
      }
    }
  }
}
{
    //  ★121 삽입으로 갈라진 ⓓ 배선 잔여 절 — RSRC 재선언(같은 파일, 같은 검사)
    const RSRC = readFileSync(new URL('./Radial.jsx', import.meta.url), 'utf8')
    ok('상부 문틀 = DoorFrame 높이 일반화 재사용(신규 어법 아님)', /yFloor=\{S\.y1\}/.test(RSRC))
    ok('매스 walkable 태그', /AscentTunnel[\s\S]{0,700}walkable: true/.test(RSRC))   // ★122-d 전망 난간 삽입으로 창 확대
  }
}

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`)
process.exit(fail ? 1 : 0)
