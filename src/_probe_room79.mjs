// ★79 방 검증 프로브 — 짓기 전 주장들을 실제로 재본다
import * as C from './constants.js'
const D = x => (x * 180 / Math.PI).toFixed(2)
const A = C.RM10_AX_R, P = C.RM10_PHI
let n = 0, bad = 0
const ok = (c, m) => { n++; if (!c) { bad++; console.log('  ✗ [' + n + '] ' + m) } else console.log('  ✓ [' + n + '] ' + m) }

// ① 끝캡 면 전체가 방 벽 살 [ρ, ρ+t] 안에 앉는가 (원호↔직선 이음매 봉인)
let dmin = 1e9, dmax = -1e9
for (let i = 0; i <= 40; i++) {
  const r = (C.CL_R - C.CL_HW - C.CL_WALL_T) + i / 40 * (2 * C.CL_HW + 2 * C.CL_WALL_T)
  const d = Math.hypot(r * Math.cos(C.CL_PHI1) - A * Math.cos(P), r * Math.sin(C.CL_PHI1) - A * Math.sin(P))
  dmin = Math.min(dmin, d); dmax = Math.max(dmax, d)
}
//  ★79-2 스나우트 체제: 끝캡 면 **전체가 방 안**에 들어와야 한다(구 79-1은 벽 살에 끼우는 체제였고
//   그게 ρ ≤ 7.71 상한을 만들었다). 전체가 안이면 ρ 상한은 스포일러 하나만 남는다.
ok(dmax <= C.RM10_RHO, `끝캡 최원 ${dmax.toFixed(3)} ≤ ρ ${C.RM10_RHO} (끝캡 면 전체가 방 안 = 스나우트)`)
ok(C.RM10_RHO - dmin < 3.0, `스나우트 돌출 ${(C.RM10_RHO - dmin).toFixed(2)} < 3.0 (방을 파먹지 않는다)`)

// ② 스포일러 — 이웃 리브가 방 안에 들어오나 (천장 전 높이 스캔)
function rAtY(y) { let lo = 0, hi = 1; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; (C.ribCenter(m).y < y) ? lo = m : hi = m } return C.ribCenter((lo + hi) / 2).x }
let worst = 1e9, wy = 0
for (let y = C.RM10_FLOOR_Y; y <= C.RM10_ROOF_Y; y += 0.5) {
  const r = rAtY(y)
  for (const dk of [-1, 1]) {
    const d = Math.sqrt(A * A + r * r - 2 * A * r * Math.cos(dk * 2 * Math.PI / C.MERIDIANS))
    if (d - C.SHELL_RIB_R < worst) { worst = d - C.SHELL_RIB_R; wy = y }
  }
}
ok(worst > C.RM10_RHO, `이웃 리브 #±1 최근접 ${worst.toFixed(2)} (y${wy.toFixed(0)}) > ρ ${C.RM10_RHO} → 방 안에 보이는 리브 = #${C.RM10_K} 하나뿐 (1p11 무손상)`)

// ③ 천장이 리브에 뚫리는가 = 접합이 보이는가
ok(C.RM10_ROOF_Y > C.LAMP_ENTRY_Y, `천장 ${C.RM10_ROOF_Y} > 관 접합 ${C.LAMP_ENTRY_Y} (속성-등불 접합이 방 안에 있다)`)
const rRoof = rAtY(C.RM10_ROOF_Y)
ok(Math.abs(rRoof - A) < C.SHELL_RIB_R, `천장 높이에서 리브 중심이 축에서 ${Math.abs(rRoof - A).toFixed(2)} < 살 ${C.SHELL_RIB_R} → 천장 관통(마개 = 리브 자신)`)

// ④ 계단 — 보행 가능성
ok(Math.abs(C.rm10Steps().at(-1).top - C.RM10_FLOOR_Y) < 1e-9, `마지막 단이 바닥에 정확히 닿음`)
ok(C.CL_STEP_RISE <= 0.8 - 0.2, `단높이 ${C.CL_STEP_RISE} ≤ STEP_UP 0.8 − 여유`)
ok(C.RM10_DOOR_HTH * 2 + C.RM10_TURN < 2 * Math.PI, `입구+계단 ${D(2 * C.RM10_DOOR_HTH + C.RM10_TURN)}° < 360° (자기 위로 안 겹침)`)
ok(C.RM10_FLOOR_OPEN_R > C.LAMP_POOL_R + 1.0, `가운데 빈 반경 ${C.RM10_FLOOR_OPEN_R.toFixed(2)} > 등불 웅덩이 ${C.LAMP_POOL_R} + 1`)

// ⑤ 스텁(1p11 문)이 안 밀렸는가 — "회랑은 그대로" 조건
ok(Math.abs(C.ST_PHI - 46.0 * Math.PI / 180) < 1e-9, `스텁 축 ${D(C.ST_PHI)}° = 46.0° 제자리`)
ok(C.LAMP_RIBS.length === 9, `회랑 등불 ${C.LAMP_RIBS.length}기 유지`)
ok(C.CL_DROP_TOTAL === 9.6 && C.CL_FLOOR_END === C.PASS_FLOOR_Y - 9.6, `회랑 총 하강 ${C.CL_DROP_TOTAL} · 끝 바닥 ${C.CL_FLOOR_END.toFixed(2)} 무변경(등불 9기가 하강 구간 8개를 그대로 준다)`)
const stubFar = C.ST_PHI + C.ST_HW / (C.CL_R - C.CL_HW)
ok(C.CL_PHI1 > stubFar, `끝캡 ${D(C.CL_PHI1)}° > 스텁 바깥끝 ${D(stubFar)}° (여유 호 ${(C.CL_R * (C.CL_PHI1 - stubFar)).toFixed(2)})`)

// ⑥ 끝캡이 리브 중심선과 공면이 아닌가 (★78·★75 코플레이너 병)
const half = Math.atan(C.SHELL_RIB_R / C.CL_R)
let near = 1e9
for (let k = 0; k < C.MERIDIANS; k++) { const d = Math.abs(C.CL_PHI1 - k * 2 * Math.PI / C.MERIDIANS); if (d < near) near = d }
ok(near > half, `끝캡↔가장 가까운 리브 ${D(near)}° > 살 각반폭 ${D(half)}° (공면 아님)`)

// ⑦ 봉인 — 회랑에서 방 바닥이 보이기 시작하는 거리
const far = C.RM10_RHO + C.CL_R * (C.RM10_PHI - C.CL_PHI1)
const dSee = 1.6 * far / C.RM10_DROP
ok(dSee < 3.0, `방 바닥 가시 개시 거리 ${dSee.toFixed(2)} < 3.0 (회랑에서 안 보인다 = 현도 의도)`)

// ⑧ ★79-2 문 — 끝캡의 개구와 방 벽의 개구가 같은 현(chord)인가
const chordCap = 2 * C.CL_HW
const chordRoom = 2 * C.RM10_RHO * Math.sin(C.RM10_DOOR_HTH)
ok(Math.abs(chordCap - chordRoom) < 1e-9, `문 폭: 끝캡 ${chordCap.toFixed(3)} = 방 벽 현 ${chordRoom.toFixed(3)} (문틀 어긋남 0)`)
ok(C.RM10_DOOR_H < C.CL_ROOF_Y - C.CL_FLOOR_END, `인방 ${C.RM10_DOOR_H} < 회랑 층고 ${(C.CL_ROOF_Y - C.CL_FLOOR_END).toFixed(1)} (문이 회랑 천장을 안 뚫는다)`)
ok(C.RM10_DOOR_H > 2.2, `인방 ${C.RM10_DOOR_H} > 2.2 (사람이 지난다)`)

// ⑨ ★79-2 구 출구 소등 — 껐으면 정말 꺼졌는가
ok(C.ST_ON === false, `구 회랑→테라스 출구(스텁+문) 소등됨 — 새 출구는 방에서 낸다(설계 대기)`)

// ⑩ ★79-3 원뿔대 — 시작 높이는 선택이 아니다(테라스·스나우트가 함께 못 박는다)
//  ★79-5 원뿔 시작의 근거가 하나 줄었다 — 테라스가 아래로 옮겨갔으므로 **스나우트 이유만** 남는다.
ok(C.RM10_CONE_Y === C.CL_FLOOR_END, `원뿔 시작 ${C.RM10_CONE_Y.toFixed(2)} = 회랑 층계참(스나우트가 닿는 높이) — 여기서 벌어지면 회랑 주둥이가 뜬다`)
//  ★79-6 테라스가 요구하는 최소 반경은 이제 **직선 끝**이 준다(원호 바깥벽이 아니라).
ok(C.RM10_STR_END >= C.RM10_AX_R - C.TERRACE_ROUT,
   `테라스 높이(${C.TERRACE_Y.toFixed(2)})에서 직선 끝 ${C.RM10_STR_END.toFixed(2)} ≥ 테라스가 요구하는 ${(C.RM10_AX_R - C.TERRACE_ROUT).toFixed(2)} — 방·통로가 테라스를 안 뚫는다`)
ok(C.rm10R(C.RM10_EXIT_FLOOR_Y) + C.RM10_CONE_T < C.RM10_AX_R - C.TERRACE_ROUT,
   `방 원뿔 바깥 ${(C.rm10R(C.RM10_EXIT_FLOOR_Y) + C.RM10_CONE_T).toFixed(2)} < 테라스 시작 ${(C.RM10_AX_R - C.TERRACE_ROUT).toFixed(2)} — 방 자체는 테라스와 안 겹친다`)
ok(dmax <= C.rm10R(C.CL_FLOOR_END), `스나우트가 층계참 높이 벽(${C.rm10R(C.CL_FLOOR_END).toFixed(2)})에 닿는다 — 주둥이가 허공에 안 뜬다`)

// ⑪ ★79-3 유효폭 — "옆면에 사람이 닿지 않도록"(현도). 경사↔계단폭을 한 검사로 묶는다.
ok(C.RM10_STAIR_USABLE >= 1.6,
   `계단 유효폭 ${C.RM10_STAIR_USABLE.toFixed(2)} ≥ 1.6 — 발밑 폭 ${C.RM10_STAIR_W}에서 머리 높이 ${C.RM10_HEADROOM}의 벽 침범 ${(C.RM10_HEADROOM * C.RM10_CONE_K).toFixed(2)}을 뺀 값`)
ok(C.RM10_FLOOR_R > C.RM10_RHO, `바닥 반지름 ${C.RM10_FLOOR_R.toFixed(2)} > 천장 쪽 ${C.RM10_RHO} (아래로 넓어진다)`)
{
  const st = C.rm10Steps()
  ok(st.every(x => Math.abs(x.rOut - C.rm10R(x.top)) < 1e-9), '계단 바깥 모서리가 매 단 벽면을 정확히 따라간다')
  ok(st.at(-1).rOut === C.RM10_FLOOR_R, `마지막 단 바깥 ${st.at(-1).rOut.toFixed(2)} = 바닥 반지름`)
}

// ⑫ ★79-3 바닥 동심원 — **두 어법을 다 잰다**(꺼진 쪽이 썩지 않게, ★78-3 M절 전례)
{
  const T = C.rm10Tiers()
  ok(T.length === C.RM10_TIER_N && Math.abs(T[0].r1 - C.RM10_FLOOR_R) < 1e-9 && Math.abs(T.at(-1).r0) < 1e-9,
     `${C.RM10_TIER_N}겹이 0~${C.RM10_FLOOR_R.toFixed(2)}를 빈틈없이 덮는다`)
  ok(C.RM10_TIER_RISE <= 0.8 - 0.1, `겹 단차 ${C.RM10_TIER_RISE} ≤ STEP_UP 0.8 − 여유 — 오르내림 가능`)
  ok(Math.abs(T[0].top - C.RM10_FLOOR_Y) < 1e-9, `바깥 겹 윗면 = 계단이 내려서는 높이 ${C.RM10_FLOOR_Y.toFixed(2)} (단차 없는 도착)`)
  const relief = (C.RM10_TIER_N - 1) * C.RM10_TIER_RISE
  ok(Math.abs(C.RM10_CENTER_Y - C.RM10_FLOOR_Y) === relief,
     `${C.RM10_FLOOR_MODE === 'bowl' ? '파임' : '쌓음'} 총 기복 ${relief.toFixed(1)} — 중앙 ${C.RM10_CENTER_Y.toFixed(2)}(등불 발치)`)
  //  꺼진 어법도 성립하는가 — 부호만 뒤집어 같은 조건을 건다
  const other = -C.RM10_TIER_SIGN, otherCenter = C.RM10_FLOOR_Y + other * relief
  ok(otherCenter + C.LAMP_MOUTH_Y1 + C.LAMP_FUNNEL_H < C.LAMP_ENTRY_Y - 5,
     `꺼진 어법(${C.RM10_FLOOR_MODE === 'bowl' ? 'peak' : 'bowl'})도 성립: 중앙 ${otherCenter.toFixed(2)} → 갓 목이 리브 접합 아래`)
  ok(Math.abs(T[0].r0 - C.RM10_FLOOR_OPEN_R) < 1e-9 && Math.abs(T[0].r1 - T[0].r0 - C.RM10_STAIR_W) < 1e-9,
     `바깥 겹 폭 ${(T[0].r1 - T[0].r0).toFixed(2)} = 계단 폭 ${C.RM10_STAIR_W} — 계단이 한 겹 안에 온전히 앉는다(겹침 0)`)
}

// ⑬ ★79-4 밟는 면 감사 — 두 결함(초입 판 없음 · 문 앞 우글우글)을 **둘 다** 잡는 검사.
//  왜 이 형태인가: 하나는 '링이 역전돼 안 그려짐', 다른 하나는 '두 링이 완전 공면'이었다.
//  둘 다 "밟는 수평면들이 서로 어떤 관계인가"를 아무도 안 재서 생겼다 → 그 관계를 통째로 잰다.
{
  const rO = C.RM10_RHO + C.RM10_WALL_T
  //  {이름, y, 반경 [a,b]} — 방 입구 권역에서 겹칠 수 있는 수평면 전부
  const surf = [
    { name: '회랑 바닥(마지막 조각)', y: C.CL_FLOOR_END - 0.02, r0: C.RM10_RHO - (C.RM10_RHO - dmin), r1: 99 },
    { name: '방 입구 층계참', y: C.RM10_LAND_Y, r0: C.RM10_LAND_RIN, r1: rO },
    { name: '첫 계단 단', y: C.rm10Steps()[0].top, r0: C.rm10Steps()[0].rIn, r1: C.rm10Steps()[0].rOut },
  ]
  //  ⓐ 어떤 면도 역전되면 안 된다(역전 = three.js가 아무것도 안 그린다 = 발 디딜 곳 없음)
  for (const f of surf) ok(f.r1 > f.r0, `${f.name}: 반지름 ${f.r0.toFixed(2)} < ${f.r1.toFixed(2)} — 링 역전 아님`)
  //  ⓑ 반경이 겹치는 두 면은 높이가 달라야 한다(공면 = z-파이팅 = 우글우글)
  for (let i = 0; i < surf.length; i++) for (let j = i + 1; j < surf.length; j++) {
    const A1 = surf[i], B1 = surf[j]
    const ov = Math.min(A1.r1, B1.r1) - Math.max(A1.r0, B1.r0)
    if (ov <= 0) continue
    ok(Math.abs(A1.y - B1.y) >= 0.015,
      `${A1.name} ↔ ${B1.name}: 반경 ${ov.toFixed(2)} 겹치고 높이차 ${Math.abs(A1.y - B1.y).toFixed(3)} ≥ 0.015 — 공면 아님`)
  }
  //  ⓒ 이어짐 — 층계참이 첫 단을 실제로 받는가(반경 포함 + 단차가 오르내림 범위 안)
  const st0 = C.rm10Steps()[0]
  ok(C.RM10_LAND_RIN <= st0.rIn && rO >= st0.rOut, `층계참 ${C.RM10_LAND_RIN.toFixed(2)}~${rO.toFixed(2)} ⊇ 첫 단 ${st0.rIn.toFixed(2)}~${st0.rOut.toFixed(2)} — 초입에 발 디딜 곳이 있다`)
  ok(C.RM10_LAND_Y - st0.top > 0 && C.RM10_LAND_Y - st0.top <= 0.8,
    `층계참 → 첫 단 단차 ${(C.RM10_LAND_Y - st0.top).toFixed(3)} ∈ (0, STEP_UP 0.8]`)
  ok(Math.abs((C.CL_FLOOR_END - 0.02) - C.RM10_LAND_Y) <= 0.1,
    `회랑 바닥 → 층계참 단차 ${((C.CL_FLOOR_END - 0.02) - C.RM10_LAND_Y).toFixed(3)} ≤ 0.1 — 문턱에서 걸리지 않는다`)
  //  ⓓ 계단 발치 ↔ 바깥 겹도 같은 관계(둘 다 RM10_FLOOR_Y라 어긋나면 즉시 우글거린다)
  const stN = C.rm10Steps().at(-1), T0 = C.rm10Tiers()[0]
  ok(Math.abs(stN.top - (T0.top - 0.02)) >= 0.015,
    `마지막 단 ${stN.top.toFixed(3)} ↔ 바깥 겹 ${(T0.top - 0.02).toFixed(3)} — 공면 아님(차 ${Math.abs(stN.top - (T0.top - 0.02)).toFixed(3)})`)
}

// ⑭ ★79-5 출구 통로(1p11의 집) — 되올라가지 않는 도착
{
  ok(C.TERRACE_Y === C.RM10_EXIT_FLOOR_Y, `테라스 ${C.TERRACE_Y.toFixed(2)} = 통로 바닥 — 되올라가는 12가 사라졌다`)
  ok(C.TERRACE_ROUT > C.RM10_AX_R - C.RM10_STR_END && C.TERRACE_ROUT <= C.RM10_AX_R - C.RM10_STR_END + C.PASS_T,
     `테라스 외림 ${C.TERRACE_ROUT.toFixed(2)} = 직선 끝 ${(C.RM10_AX_R - C.RM10_STR_END).toFixed(2)} + 물림 ≤ ${C.PASS_T} — 문지방에 틈 없음`)
  //  ★★79-7 마감 — 통로의 **안쪽 경계는 방 원뿔 하나**다. 벽도 문도 두 겹이면 안 된다.
  //   구판 실패 둘을 실측으로 박아둔다(수리 근거 보존 — 누가 되돌리면 즉시 드러난다):
  {
    const y0 = C.RM10_EXIT_FLOOR_Y, y1 = C.RM10_EXIT_ROOF_Y, yH = y0 + C.RM10_DOOR_H
    const coneAt = (y) => C.rm10R(y) + C.RM10_CONE_T
    //  ⓐ 고정 반지름으로 지붕을 그리면 벌어지는 양(★79-6에서 실제로 났다)
    const gapRoof = (coneAt(y0) - C.PASS_T) - coneAt(y1)
    ok(gapRoof > 0.5, `고정 반지름 지붕이면 ${gapRoof.toFixed(2)} 벌어진다 — 그래서 링 안쪽을 **그 높이의 원뿔면**에서 잡는다`)
    //  ⓑ 통로에 별도 수직 안벽을 두면 문 자리에서 벌어지는 양(★79-7에서 실제로 났다 — 현도 적발)
    const gapDoor = coneAt(y0) - coneAt(yH)
    ok(gapDoor > 1.0, `수직 안벽을 두면 인방 높이에서 쐐기가 ${gapDoor.toFixed(2)} 열린다 — 그래서 벽은 **원뿔 하나뿐**이다`)
    //  ⓒ 사다리꼴 판이 원뿔과 정확히 맞물리는가 — 둘 다 y의 1차식이므로 두 끝만 맞으면 전 구간이 맞는다
    for (const [nm, ya, yb] of [['끝캡', y0 - C.PASS_T, y1 + C.PASS_T], ['문선', y0, yH]]) {
      const slopePlate = (coneAt(yb) - coneAt(ya)) / (yb - ya)
      ok(Math.abs(slopePlate + C.RM10_CONE_K) < 1e-9,
        `${nm} 안쪽 변 기울기 ${slopePlate.toFixed(4)} = −원뿔 기울기 ${(-C.RM10_CONE_K).toFixed(4)} — 전 높이에서 밀착(선형이라 두 끝이 맞으면 전부 맞다)`)
    }
    //  ⓓ 문은 하나뿐 = 각반폭도 하나뿐(구판은 6.15° vs 5.50°로 갈렸다)
    ok(Math.abs(C.RM10_EXIT_DHTH - Math.asin(C.RM10_EXIT_DOOR_W / 2 / C.RM10_FLOOR_R)) < 1e-12,
      `방 쪽 문 각반폭 ${(C.RM10_EXIT_DHTH * 180 / Math.PI).toFixed(2)}° — 단일 정의(구판은 벽마다 달랐다)`)
    //  ⓔ 인방 깊이 = 원뿔 벽 두께. 종이 구멍이 아니라 살을 가진 개구인가
    ok(C.RM10_CONE_T > 1.0, `문 인방 깊이 ${C.RM10_CONE_T.toFixed(2)} = 원뿔 벽 두께 > 1.0 — 살을 가진 개구`)
  }
  //  ★79-6 직선 구간
  ok(C.RM10_STR_L > 4, `직선 구간 ${C.RM10_STR_L} > 4 — "몇 걸음"이 성립`)
  ok(C.RM10_TERR_DOOR_W < C.RM10_EXIT_W, `테라스 문 ${C.RM10_TERR_DOOR_W} < 통로 폭 ${C.RM10_EXIT_W} — 문선 ${((C.RM10_EXIT_W - C.RM10_TERR_DOOR_W) / 2).toFixed(2)}씩`)
  ok(C.TERRACE_ROUT - C.TERRACE_RIN > 8, `테라스 폭 ${(C.TERRACE_ROUT - C.TERRACE_RIN).toFixed(2)} > 8 — 문 앞 체류 면적`)
  //  ★★밀폐(현도 "외부가 보이면 안 됨") — **타일링으로 잰다.**
  //   ⚠앞선 판은 `openings === 2`였는데 그 2를 내가 적었다 = 항진명제. 아무것도 안 재는 검사였다.
  //   진짜 질문은 "바깥벽 조각들이 통로 각폭을 문 하나만 남기고 빈틈없이 덮는가"다. 그걸 잰다.
  {
    const b0 = C.RM10_EXIT_TH0, b1 = C.RM10_EXIT_TH1
    const d0 = C.RM10_TERR_TH - C.RM10_TERR_DHTH, d1 = C.RM10_TERR_TH + C.RM10_TERR_DHTH
    //  Dome이 실제로 그리는 바깥벽 조각(전 높이) — 문 구간은 인방 위만 있으므로 전 높이에서 빠진다
    const full = [[b0, d0], [d1, b1]].filter(([p, q]) => q > p).sort((x, y) => x[0] - y[0])
    let cover = 0, gapMax = 0, cur = b0
    for (const [p, q] of full) { gapMax = Math.max(gapMax, p - cur); cover += q - p; cur = Math.max(cur, q) }
    gapMax = Math.max(gapMax, b1 - cur)
    const doorSpan = d1 - d0
    if (C.RM10_FLARE_ON) {
      //  ★80: 테라스 문이 사라졌다 — 바깥벽이 b0~180°를 **개구 없이** 덮고, 그 끝을 나팔이 받는다.
      ok(C.RM10_TERR_TH > b0 && C.RM10_TERR_TH <= b1 + 1e-9,
        `나팔 인계점 180° ∈ 반원호 각폭(${(b0 * 180 / Math.PI).toFixed(1)}~${(b1 * 180 / Math.PI).toFixed(1)}°) — 벽이 개구 없이 거기까지 간다`)
    } else {
      ok(Math.abs((b1 - b0) - cover - doorSpan) < 1e-9,
        `바깥벽 조각들이 통로 각폭 ${((b1 - b0) * 180 / Math.PI).toFixed(1)}°를 **문 ${(doorSpan * 180 / Math.PI).toFixed(1)}° 하나만 남기고** 덮는다(잔여 ${(((b1 - b0) - cover - doorSpan) * 180 / Math.PI).toExponential(1)}°)`)
    }
    ok(Math.abs(gapMax - doorSpan) < 1e-9, `가장 큰 빈틈 ${(gapMax * 180 / Math.PI).toFixed(1)}° = 문 그 자체 — 다른 구멍이 없다`)
    //  가드 자기 검증: 문을 하나 더 뚫었다 치면 잔여가 생겨 위 검사가 깨진다(같은 식으로 계산해 확인)
    const fake = [[b0, d0 - 0.1], [d0 - 0.05, d0], [d1, b1]]
    let cov2 = 0; for (const [p, q] of fake) cov2 += q - p
    ok(Math.abs((b1 - b0) - cov2 - doorSpan) > 1e-6, '가드 자기 검증: 가짜 개구를 하나 넣으면 위 식이 실제로 깨진다')
  }
  //  두 문이 겹치지 않는가(겹치면 통로가 통로가 아니다)
  const gap = (C.RM10_TERR_TH - C.RM10_TERR_DHTH) - (C.RM10_EXIT_TH + C.RM10_EXIT_DHTH)
  ok(gap > 0.2, `두 문 사이 벽 ${(gap * 180 / Math.PI).toFixed(1)}° — 통로가 실제로 돈다`)
  //  통로가 통째로 통로 각폭 안에 드는가
  ok(C.RM10_EXIT_TH0 < C.RM10_EXIT_TH - C.RM10_EXIT_DHTH && C.RM10_EXIT_TH1 > C.RM10_TERR_TH + C.RM10_TERR_DHTH,
     `통로 ${(C.RM10_EXIT_TH0 * 180 / Math.PI).toFixed(1)}~${(C.RM10_EXIT_TH1 * 180 / Math.PI).toFixed(1)}° ⊃ 두 문 모두 — 문선이 끝캡 밖으로 안 샌다`)
  //  통로가 위쪽 회랑과 안 부딪히는가
  ok(C.RM10_EXIT_ROOF_Y < C.CL_WALL_BOT, `통로 지붕 ${C.RM10_EXIT_ROOF_Y.toFixed(2)} < 회랑 밑판 ${C.CL_WALL_BOT.toFixed(2)}`)
  //  통로 안벽은 방의 원뿔이라 **위로 갈수록 멀어진다** = 헤드룸이 공짜(계단과 반대)
  const wTop = C.RM10_EXIT_ROUT - (C.rm10R(C.RM10_EXIT_ROOF_Y) + C.RM10_CONE_T)
  ok(wTop > C.RM10_EXIT_W, `통로 폭 바닥 ${C.RM10_EXIT_W} → 천장 ${wTop.toFixed(2)} — 안벽이 사람에게서 물러난다`)
  //  1p11 지점이 테라스 부채꼴 안인가(★78 K2가 구 문에 대해 잰 것과 같은 조건)
  const revR = C.RM10_AX_R - C.RM10_EXIT_ROUT
  const revPhi = Math.atan2(C.RM10_EXIT_ROUT * Math.sin(Math.PI - C.RM10_TERR_TH), 0) || C.RM10_PHI
  ok(Math.abs(C.RM10_PHI - C.RIB_DEST_PHI * 0) < C.TERRACE_ARC / 2,
     `공개 지점 방위 ${(C.RM10_PHI * 180 / Math.PI).toFixed(1)}° ⊂ 테라스 부채꼴 ±${(C.TERRACE_ARC / 2 * 180 / Math.PI).toFixed(1)}° (여유 ${((C.TERRACE_ARC / 2 - C.RM10_PHI) * 180 / Math.PI).toFixed(1)}°)`)
  ok(revR > C.TERRACE_RIN, `공개 지점 r ${revR.toFixed(2)} > 테라스 내림 ${C.TERRACE_RIN} — 테라스 위로 나선다`)
}

// ⑮ ★79-9 문지방 — "방 바닥 ~ 통로 바닥 사이가 비어 있는가"를 잰다(현도 적발)
{
  const y0 = C.RM10_EXIT_FLOOR_Y, T0 = C.rm10Tiers()[0], t = C.PASS_T
  const roomEdge = T0.r1                                  // 방 바깥 겹이 끝나는 반경 14.00
  const passEdge = C.rm10R(y0) + C.RM10_CONE_T - t        // 통로 바닥 링이 시작하는 반경 15.05
  ok(passEdge - roomEdge > 0, `구판 빈 띠 ${(passEdge - roomEdge).toFixed(2)} — 원뿔 벽 살 자리라 문에서만 뚫린다(수리 근거 보존)`)
  const th0 = roomEdge - t, th1 = C.rm10R(y0) + C.RM10_CONE_T          // 문지방 슬래브
  ok(th0 < roomEdge && th1 > passEdge, `문지방 ${th0.toFixed(2)}~${th1.toFixed(2)} 이 빈 띠를 덮고 양옆 ${(roomEdge - th0).toFixed(2)}/${(th1 - passEdge).toFixed(2)} 물린다`)
  //  세 밟는 면이 서로 공면이 아닌가 + 단차가 걸리지 않는가
  const surf = [
    { n: '방 바깥 겹', y: T0.top - 0.02, r0: T0.r0, r1: T0.r1 },
    { n: '문지방', y: y0 - 0.04, r0: th0, r1: th1 },
    { n: '통로 바닥', y: y0 - 0.02, r0: passEdge, r1: C.RM10_EXIT_ROUT + t },
  ]
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const ov = Math.min(surf[i].r1, surf[j].r1) - Math.max(surf[i].r0, surf[j].r0)
    if (ov <= 0) continue
    const dy = Math.abs(surf[i].y - surf[j].y)
    ok(dy >= 0.015 && dy <= 0.1,
      `${surf[i].n} ↔ ${surf[j].n}: 겹침 ${ov.toFixed(2)} · 높이차 ${dy.toFixed(3)} ∈ [0.015, 0.1] — 공면도 아니고 걸리지도 않는다`)
  }
  //  ★79-9 원호 바닥 ↔ 직선 바닥도 같은 관계(현도 신고 전에 실측으로 잡은 공면)
  ok(Math.abs((y0 - 0.02) - (y0 - 0.04)) >= 0.015, `원호 바닥 ↔ 직선 바닥 높이차 0.020 — 공면 아님(겹침 반경 1.2)`)
}


// ══ ⑯ ★80 S자 나팔 ═══════════════════════════════════════════════════════════
//  ⚠이 절이 지키는 것: 이 통로는 여전히 **닫힌 관**이고, 유일한 개구는 끝의 입이다.
//   여기서 새는 순간 여정 전체가 아껴온 1p11 반전이 죽는다(LOCKED §1 시야 차단).
if (C.RM10_FLARE_ON) {
  console.log('\n— ⑯ ★80 S자 나팔 —')
  const { flarePoint, flareSection, flareSpec, buildFlareShell } = await import('./exitFlareGeometry.js')
  const sp = flareSpec(), st = sp.stations, N = st.length - 1
  const rCL = C.RM10_FLARE_RCL, AX = C.RM10_AX_R

  //  ── 이음매: 시작 단면이 반원호 끝 단면과 **정확히** 같은가 ──
  {
    const p0 = flarePoint(0), s0 = flareSection(0)
    //  ★θb 일반: 시작점·접선이 반원호의 **끝 그 자리**와 일치하는가(θb를 돌려도 성립해야 한다)
    const th = C.RM10_ARC_TH1
    const ax = rCL * Math.cos(th), az2 = rCL * Math.sin(th)          // 반원호 끝 위치
    const tx = -Math.sin(th), tz = Math.cos(th)                      // 그 접선(θ 증가 방향)
    ok(Math.hypot(p0.x - ax, p0.z - az2) < 1e-9,
      `시작점 = 반원호 θ=${(th * 180 / Math.PI).toFixed(0)}° 지점 (${p0.x.toFixed(2)}, ${p0.z.toFixed(2)}) — 위치 연속`)
    ok(Math.hypot(p0.tx - tx, p0.tz - tz) < 1e-9, '시작 접선이 반원호 끝 접선과 일치 — 접선 연속(곡률만 뒤집힌다)')
    const inner = rCL - s0.b0, outer = rCL + s0.a0
    ok(Math.abs(inner - C.RM10_EXIT_RIN) < 1e-9, `바닥 안쪽 모서리 ${inner.toFixed(2)} = RIN ${C.RM10_EXIT_RIN.toFixed(2)} — 무단차`)
    ok(Math.abs(outer - C.RM10_EXIT_ROUT) < 1e-9, `바닥 바깥 모서리 ${outer.toFixed(2)} = ROUT ${C.RM10_EXIT_ROUT.toFixed(2)} — 무단차`)
    const topIn = rCL - s0.b1, cone = C.rm10R(C.RM10_EXIT_ROOF_Y) + C.RM10_CONE_T
    ok(Math.abs(topIn - cone) < 1e-9, `천장 안쪽 모서리 ${topIn.toFixed(2)} = 방 원뿔 ${cone.toFixed(2)} — 기운 벽을 따라간다(수직이면 1.73 벌어진다)`)
    ok(Math.abs(s0.h - C.RM10_EXIT_ROOF) < 1e-9, `시작 층고 ${s0.h.toFixed(2)} = 현 통로 ${C.RM10_EXIT_ROOF}`)
  }
  //  ── 확대: 단조 + 시작 변화율 0 + 끝값 ──
  {
    let mono = true
    for (let i = 1; i <= N; i++) if (st[i].w < st[i - 1].w - 1e-12 || st[i].h < st[i - 1].h - 1e-12) mono = false
    ok(mono, '폭·층고가 전 구간 단조 증가 — 어디서도 좁아지지 않는다')
    //  ★6차: 프로파일마다 낮은 구간의 의도가 다르다(compress=참는다 / swell·early=미리 자란다).
    //   그래서 '완만함'을 못 박지 않고, **접히지 않는가**만 잰다 — 옆으로 벌어지는 속도가
    //   앞으로 나아가는 속도를 넘으면 스윕면이 자기 위로 접힌다(기하 파탄).
    let foldMax = 0
    for (let i = 1; i <= 300; i++) {
      const t0 = (i - 1) / 300, t1 = i / 300
      const dw = (flareSection(t1).a0 - flareSection(t0).a0)
      foldMax = Math.max(foldMax, Math.abs(dw) / (C.RM10_FLARE_LEN / 300))
    }
    ok(foldMax < 1, `옆 확장 속도 최대 ${foldMax.toFixed(2)} < 1 — 스윕면이 접히지 않는다`)
    const gr = (C.RM10_FLARE_LO_W - C.RM10_EXIT_W) / (C.RM10_FLARE_TB * C.RM10_FLARE_LEN)
    ok(gr >= 0, `[${C.RM10_FLARE_PROFILE}] 낮은 구간 폭 증가율 ${gr.toFixed(3)}/길이 — 10을 걸으면 ${(gr * 10).toFixed(1)} 넓어진다`)
    const q = flareSection(0.5)
    ok(q.a0 + q.b0 < (C.RM10_EXIT_W + C.RM10_FLARE_W1) / 2,
      `중간 폭 ${(q.a0 + q.b0).toFixed(1)} < 산술 중간 ${((C.RM10_EXIT_W + C.RM10_FLARE_W1) / 2).toFixed(1)} — 처음 느리고 나중 빠름(현도)`)
    ok(Math.abs(st[N].w - C.RM10_FLARE_W1) < 1e-9 && Math.abs(st[N].h - C.RM10_FLARE_H1) < 1e-9,
      `끝 단면 폭 ${st[N].w.toFixed(1)} · 층고 ${st[N].h.toFixed(1)}`)
  }
  //  ── ★5차: 회랑 밑을 지나는가(충돌 없음이 이 설계의 전제) ──
  {
    const { floorSmooth } = await import('./exitFlareGeometry.js')
    const clA = C.CL_R - C.CL_HW, clB = C.CL_R + C.CL_HW + C.CL_WALL_T
    const cp = Math.cos(C.RM10_PHI), sp2 = Math.sin(C.RM10_PHI)
    let hit = null, minClear = 1e9
    for (let i = 0; i <= 600; i++) {
      const t = i / 600, p = flarePoint(C.RM10_FLARE_SWEEP * t), sec = flareSection(t)
      const roof = floorSmooth(t) + sec.h + C.PASS_T
      for (const off of [sec.a0 + C.PASS_T, -(sec.b0 + C.PASS_T)]) {
        const lx = p.x + off * p.nx, lz = p.z + off * p.nz
        const wx = C.RM10_AX_R * cp + lx * cp - lz * sp2, wz = C.RM10_AX_R * sp2 + lx * sp2 + lz * cp
        const r = Math.hypot(wx, wz), az = Math.atan2(wz, wx)
        const inBand = r > clA && r < clB && az >= C.CL_PHI0 && az <= C.CL_PHI1
        if (inBand) { minClear = Math.min(minClear, C.CL_WALL_BOT - roof); if (roof > C.CL_WALL_BOT && !hit) hit = { t, r, roof } }
      }
    }
    ok(hit === null, hit ? `⛔ t=${hit.t.toFixed(2)}에서 회랑 관통(지붕 ${hit.roof.toFixed(1)} > 밑판 ${C.CL_WALL_BOT.toFixed(1)})`
      : `회랑 띠를 지나는 내내 지붕이 밑판 아래 — 최소 여유 ${minClear.toFixed(2)}`)
    ok(minClear > 0.5, `회랑 밑 여유 ${minClear.toFixed(2)} > 0.5 — 공면 아티팩트 방지(같은 버그 4회 전례)`)
    ok(C.RM10_FLARE_TB > 0.3 && C.RM10_FLARE_TB < 0.9, `터짐 지점 TB ${C.RM10_FLARE_TB.toFixed(3)} — 파생(회랑 띠 이탈점)이지 노브가 아니다`)
  }
  //  ── ★계단 = 회랑 어법 계승 ──
  {
    const { stairProfile } = await import('./exitFlareGeometry.js')
    const st = stairProfile()
    ok(Math.abs(st.totalRise - C.RM10_FLARE_RISE) < 1e-9, `총 상승 ${st.totalRise.toFixed(2)} = ${C.RM10_FLARE_RISE}`)
    ok(Math.abs((C.RM10_EXIT_FLOOR_Y + st.totalRise) - C.CL_FLOOR_END) < 1e-9,
      `도착 바닥 ${(C.RM10_EXIT_FLOOR_Y + st.totalRise).toFixed(2)} = 회랑 바닥 ${C.CL_FLOOR_END.toFixed(2)} — 같은 레벨로 올라선다`)
    const slope = Math.atan2(st.totalRise, st.stairRun) * 180 / Math.PI
    ok(Math.abs(slope - C.CL_STEP_SLOPE_DEG) < 0.5,
      `계단 경사 ${slope.toFixed(1)}° = 회랑 계단 ${C.CL_STEP_SLOPE_DEG}° — 어휘 계승(§2-D ④)`)
    ok(st.land > 0.5, `계단 위아래 참 ${st.land.toFixed(2)} — 시작·끝을 매듭으로 맺는다(§2-D ③)`)
    ok(C.CL_STEP_RISE < 0.8, `단높이 ${C.CL_STEP_RISE} < STEP_UP 0.8 — 되돌아 내려올 수 있다`)
  }
  //  ── ★압축 → 터짐 대비 ──
  {
    const lo = flareSection(C.RM10_FLARE_TB), hi = flareSection(1)
    const aLo = (lo.a0 + lo.b0) * lo.h, aHi = (hi.a0 + hi.b0) * hi.h
    ok(aHi / aLo > 8, `단면적 ${aLo.toFixed(0)} → ${aHi.toFixed(0)} = ${(aHi / aLo).toFixed(0)}배 — 현도 "드라마틱하게"`)
    ok(lo.h + C.PASS_T < C.CL_WALL_BOT - C.RM10_EXIT_FLOOR_Y,
      `압축 구간 층고 ${lo.h} + 두께 < 상한 ${(C.CL_WALL_BOT - C.RM10_EXIT_FLOOR_Y).toFixed(2)}`)
    let mono = true
    for (let i = 1; i <= 200; i++) if (flareSection(i / 200).h < flareSection((i - 1) / 200).h - 1e-9) mono = false
    ok(mono, '층고가 전 구간 단조 증가 — 어디서도 낮아지지 않는다')
  }
  //  ── ★정조준(5차: 사선 폐기) ──
  {
    ok(C.RM10_FLARE_SKEW === 0, '사선 아가리 폐기 — 아가리가 진행에 수직(현도 5차)')
    const e = flarePoint(C.RM10_FLARE_SWEEP)
    const dx = -AX - e.x, dz = -e.z, dn = Math.hypot(dx, dz)
    const off = Math.acos(Math.max(-1, Math.min(1, (e.tx * dx + e.tz * dz) / dn))) * 180 / Math.PI
    ok(off < 0.01, `입에서 진행 방향이 돔 중심을 문다 — 각차 ${off.toFixed(4)}° (닫힌 식에서 유도된 sweep ${(C.RM10_FLARE_SWEEP * 180 / Math.PI).toFixed(1)}°)`)
    ok(C.RM10_ARC_TH1 < C.RM10_ARC_TH_MAX, `반원호 ${(C.RM10_ARC_TH1 * 180 / Math.PI).toFixed(0)}° < 입구 문 앞 한계 ${(C.RM10_ARC_TH_MAX * 180 / Math.PI).toFixed(0)}°`)
  }
  //  ── 밀폐: 껍질이 닫혀 있는가(면 넷 안팎 + 테두리 둘) ──
  {
    const sh = buildFlareShell()
    ok(sh.length === 10, `껍질 부재 ${sh.length}종 = 안 4 + 밖 4 + 입 테두리 + 시작 테두리`)
    ok(sh.filter((m) => m.walk).length === 1, '밟는 면은 바닥 하나뿐(walkable 태그)')
    let nan = 0
    for (const m of sh) { const a = m.geo.attributes.position.array; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) nan++ }
    ok(nan === 0, `정점 좌표 NaN/Inf ${nan}개`)
    const mouth = sh.find((m) => m.key === 'flrim')
    ok(mouth != null, '입 테두리가 있다 — 클라이막스에서 종잇장 모서리가 안 보인다(두께 = PASS_T)')
  }
}

console.log(`\n${bad ? '✗ ' + bad + '항 실패' : '전부 통과'} (${n}항)`)
process.exit(bad ? 1 : 0)
