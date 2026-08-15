// bridgeComplexGeometry.js — ★★★133 1p4 방위 0° 복합체: 계단 관(참→테라스) + 참 + 기둥 1기 + 아치
//  (2026.08.15 현도 스케치 `1p4통로_드럼통로_복합체.jpg` + 도면 리드백 3왕복 →
//   ★133-b 같은 날 현도 로컬 판정: **윗층 관 완전 삭제 · 아치 단일 곡선화**)
//
//  ★그림(현도 — ★133-b 확정형):
//   · 방위 0°에 **참** 하나 — 높이 = 셸 나선 참 레벨(★130 통로가 출발하는 그 높이) · 반경 = 나선 참 바깥 끝과 같게.
//   · 참에서 첨탑 쪽으로 **계단 관 둘이 평행하게 적층**: 아래층 = 참 → 테라스(1p4 접속의 앞부분 — 셸행은 미룸) ·
//     윗층 = 참 위 → 새 층(★131). **윗층 바깥 끝 = 참 위에서 종단**(목적지 보류 — 캡으로 밀봉, 나중에 이어받는다).
//   · 참 밑에 **기둥 1기**가 정의·공리 방 돔에 접지.
//   · **아치**: 기둥에서 발원해 **첨탑 쪽 접합부 끝(아래층 소핏이 벽에 닿는 모서리)까지 한 곡선**으로 잇는다(★133-b).
//     옛 벽 밑동 발(돔 위 발 A)·크라운은 소멸 — 아치 밑은 벽 밑동까지 전부 트여 돔이 드러난다.
//     바깥 쪽 = 짧은 브래킷(기둥 → 참 바깥 밑 모서리 사분 아치 — 불변).
//
//  ★적층 산술(★131의 연속 — 우연이 아니라 파생이 강제한다):
//   층 차 = upperPlatformSpec().yWalk − SPT_Y = 6.30. 아래층 관 규격을 ★130 그대로(내부고 4.72 + 천장 0.40) 두면
//   천장 윗면 = 걷는 선 + 5.12 = 윗층 바닥 밑면(6.30 − 1.18)과 **정확히 공면**이다. → 윗층 바닥을
//   BRG_SINK만큼 아래층 천장 속으로 관입시켜(공면 z-fighting 방지) 두께 = 6.30 − 4.72 − 0.40 + SINK = 1.23.
//   ⚠§2-D 두께 위계('걷는 것' 1.5)를 윗층 바닥만 깬다 — ★131 ⓛ과 **같은 선언된 비용의 연속**이다.
//
//  ★아치 닫힌형(노브 0 — 두 접선 조건이 곡선을 결정한다):
//   2차 베지어 P0 = J(접합부 끝: xWall, yTerr−ft) · P1 = B(기둥 안 면, 돔+UPB) · 제어점 C.
//   ⓐ B에서 수직 발진 → C.x = B.x  ⓑ J에서 소핏과 나란히 합류(밑면에 녹아듦) → C.y = yJ − (rise/run)·(xB−xJ).
//   볼록포 논증: C가 소핏 연장선 위에 있으므로 곡선 전체가 {J, C, B} 삼각형 안 = 소핏선 아래 — 스팬드럴 두께 비음수.
//
//  ★계단: 상승 14.50 / 수평 22.76(벽 매몰면→참) → 걷는 선 **32.51°**(상한 35° 안).
//   단수 = ceil(rise/BRG_STEP − 1e-9) — ⛔★131·★130-g 부동소수점 계열: 파생 사슬 값에 허용오차 없이 ceil 금지.
//   단 경계는 k로 직접 생성(역산 없음 — ★131-b 교훈).
//
//  ⚠사본 금지: 참 반경·레벨 = linkSpec(). 층 차 = upperPlatformSpec() 사슬. 벽 = wellWallR().
//   돔 = LIFT_Y·ROOM_CEIL_Y·ROOM_R 파생. 44.61 · 112.50 · 133.30 · 6.30 따위를 적어 넣지 않는다.
//  ⚠밀봉: 이 판의 개구는 0이다(★130 어법 — 문 컷 = 다음 조각). 양 끝 캡 4기.
//  ⚠보존계: BRG_ON=false 한 줄이면 전부 소등.
import * as THREE from 'three'
import { linkSpec } from './linkPassageGeometry.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
import { upperPlatformSpec } from './upperPlatformGeometry.js'
import {
  SPT_Y, ROOM_R, LIFT_Y, ROOM_CEIL_Y, BOX_X0,
  BRG_ON, BRG_LAND_D, BRG_LAND_T, BRG_STEP, BRG_COL_W, BRG_COL_D,
  BRG_SINK, BRG_SEAT, BRG_EMB_TOP, BRG_ARCH_UPB, BRG_SEG, BRG_WALK_MAX, BRG_PORTAL_L,
} from './constants.js'

//  방 돔 표면(회전체 — 수평 반경 r의 함수). 전부 상수 파생(H = ROOM_CEIL_Y − LIFT_Y).
export const bridgeDomeY = r =>
  LIFT_Y + (ROOM_CEIL_Y - LIFT_Y) * Math.sqrt(Math.max(0, 1 - (r / ROOM_R) ** 2))

// ── 스펙(전부 파생 — 수치 하드코딩 금지) ──
export function bridgeSpec(o = {}) {
  const L = o.link ?? linkSpec()
  const S = o.spire ?? spireSpec()
  const U = o.upf ?? upperPlatformSpec()
  //  참: 반경 = 셸 나선 참 바깥 끝(★130 통로 시작점의 첨탑 중심 기준 반경) · 레벨 = 그 문지방
  const r0 = Math.hypot(L.P0[0], L.P0[1])
  const yLand = L.y0
  const yTerr = SPT_Y
  const gap = U.yWalk - SPT_Y                        // 층 차(★131 파생 사슬 그대로)
  const hw = L.hw, h = L.h, wt = L.wt, ft = L.ft, emb = L.emb
  const wOut = 2 * (hw + wt)                         // 관 외곽 전폭
  const rw = wellWallR(yTerr, { spec: S, forceSpire: true })
  const xWall = rw - emb                             // 벽 매몰면(★128 어법 — 틈 금지)
  const run = r0 - xWall
  const rise = yTerr - yLand
  const step = o.step ?? BRG_STEP
  const steps = Math.max(2, Math.ceil(rise / step - 1e-9))   // ⛔허용오차 — ★131 계열
  const riser = rise / steps
  const tread = run / steps
  const walkDeg = Math.atan2(riser, tread) * 180 / Math.PI
  const ftU = gap - h - wt + BRG_SINK                // 윗층 바닥(관입 포함 — 머리 주석)
  //  참 판
  const landD = o.landD ?? BRG_LAND_D
  const landT = o.landT ?? BRG_LAND_T
  const xL0 = r0, xL1 = r0 + landD
  const yLandU = yLand - landT                       // 참 밑면
  //  기둥(참 중앙 밑)
  const colW = o.colW ?? BRG_COL_W, colD = o.colD ?? BRG_COL_D
  const xCol = r0 + landD / 2
  const yLine = x => yTerr - (x - xWall) / run * rise          // 아래층 걷는 선(공칭)
  const soffit = x => (x <= xL0 ? yLine(x) - ft : yLandU)      // 밑면(관→참 — xL0에서 연속: yLand−ft = yLandU)
  //  ★133-b 아치 — 단일 곡선(닫힌형 유도 · 머리 주석): J = 접합부 끝 · B = 기둥 발원 · C = 제어점
  const xJ = xWall, yJ = soffit(xWall)               // 접합부 끝(소핏·벽 모서리 — 벽 속 emb 매몰)
  const xB = xCol - colW / 2                         // 기둥 안쪽 면
  const yB = bridgeDomeY(xCol) + BRG_ARCH_UPB        // 기둥 아래쪽에서 발원(현도 "기둥 그 아래에서")
  const yCt = yJ - (rise / run) * (xB - xJ)          // ⓑ소핏 나란 합류(C.x = xB가 ⓐ수직 발진)
  const xB2 = xCol + colW / 2                        // 브래킷 발(기둥 바깥 면)
  return {
    on: BRG_ON, r0, yLand, yTerr, gap, hw, h, wt, ft, ftU, wOut, rw, xWall, emb,
    run, rise, steps, riser, tread, walkDeg,
    landD, landT, xL0, xL1, yLandU, xCol, colW, colD,
    arch: { xJ, yJ, xB, yB, yCt, xB2 },
    yLine, soffit,
  }
}

// ── 헬퍼: (x,y) 닫힌 프로파일 → z 압출 솔리드(ShapeUtils 삼각분할 — 비볼록 계단 프로파일 안전) ──
function extrude(profile, z0, z1) {
  const sh = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 })
  g.translate(0, 0, z0)
  return g
}
const quad = (P0, C, P1, n) => {                     // 2차 베지어 샘플(아치 인트라도스)
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    out.push([u * u * P0[0] + 2 * u * t * C[0] + t * t * P1[0],
              u * u * P0[1] + 2 * u * t * C[1] + t * t * P1[1]])
  }
  return out
}

// ── 계단 관 한 벌: 계단 매스(walk) + 벽 2 + 지붕 + 캡 2(solid) ──
//  yTop0 = 첨탑 쪽 문지방 · ftHere = 바닥 두께. 단 경계는 k로 직접 생성(역산 없음 — ★131-b).
function buildTube(B, yTop0, ftHere) {
  const { xWall, r0, steps, riser, tread, hw, wt, h } = B
  const line = x => yTop0 - (x - xWall) / B.run * B.rise
  //  계단 매스: 위 = 계단 폴리라인(노드가 자기 높이를 들고 다닌다) · 아래 = 소핏 직선
  const top = [[xWall, yTop0]]
  for (let k = 1; k <= steps; k++) {
    const y = yTop0 - k * riser
    top.push([xWall + (k - 1) * tread, y], [xWall + k * tread, y])
  }
  const prof = [...top, [r0, yTop0 - B.rise - ftHere], [xWall, yTop0 - ftHere]]
  const mass = extrude(prof, -hw, hw)
  //  벽 2(소핏 → 지붕 윗선) · 지붕(걷는 선 + h 위 wt)
  const wallProf = [[xWall, line(xWall) - ftHere], [r0, line(r0) - ftHere],
                    [r0, line(r0) + h + wt], [xWall, line(xWall) + h + wt]]
  const wallL = extrude(wallProf, -hw - wt, -hw)
  const wallR = extrude(wallProf, hw, hw + wt)
  const roofProf = [[xWall, line(xWall) + h], [r0, line(r0) + h],
                    [r0, line(r0) + h + wt], [xWall, line(xWall) + h + wt]]
  const roof = extrude(roofProf, -hw - wt, hw + wt)
  //  캡 2(밀봉 — 문 컷 = 다음 조각): 첨탑 끝(벽 두께 안에 숨음) · 참 끝
  const capIn = extrude([[xWall, line(xWall) - ftHere], [xWall + wt, line(xWall + wt) - ftHere],
                         [xWall + wt, line(xWall + wt) + h + wt], [xWall, line(xWall) + h + wt]], -hw - wt, hw + wt)
  const capOut = extrude([[r0 - wt, line(r0 - wt) - ftHere], [r0, line(r0) - ftHere],
                          [r0, line(r0) + h + wt], [r0 - wt, line(r0 - wt) + h + wt]], -hw - wt, hw + wt)
  return { mass, solid: [wallL, wallR, roof, capIn, capOut] }
}

// ── 조립 — 반환 { walk:[{id,geo}], solid:[{id,geo}] } · BRG_ON=false → null ──
export function buildBridgeComplex(B = bridgeSpec()) {
  if (!B.on) return null
  const walk = [], solid = []
  //  ① 아래층(참 → 테라스) · ② 윗층(참 위 → 새 층 — 평행 적층, 바닥은 관입 두께 ftU)
  const lo = buildTube(B, B.yTerr, B.ft)
  const up = buildTube(B, B.yTerr + B.gap, B.ftU)
  walk.push({ id: 'lowMass', geo: lo.mass }, { id: 'upMass', geo: up.mass })
  lo.solid.forEach((g, i) => solid.push({ id: 'lo' + i, geo: g }))
  up.solid.forEach((g, i) => solid.push({ id: 'up' + i, geo: g }))
  //  ③ 참 판(걷는 것 — 매스 1.5)
  walk.push({ id: 'landing', geo: extrude(
    [[B.xL0, B.yLandU], [B.xL1, B.yLandU], [B.xL1, B.yLand], [B.xL0, B.yLand]], -B.wOut / 2, B.wOut / 2) })
  //  ④ 기둥 1기 — 바닥은 돔을 좇는다(폭 방향 반경차가 커서 평면 밑은 관통/들뜸 — 규율 6 '쪼개서 좇기').
  //   z 극단(±colD/2)의 반경이 최대이므로 그 r로 앉히면 반대편 관입 ≤ SEAT + 미소(z 반경차) — 관통 0 쪽으로 보수적.
  {
    const x0 = B.xCol - B.colW / 2, x1 = B.xCol + B.colW / 2
    const topY = B.yLandU + BRG_EMB_TOP              // 참 매스 속으로 매몰(틈 금지)
    const n = 8, bot = []
    for (let i = n; i >= 0; i--) {
      const x = x0 + (x1 - x0) * i / n
      bot.push([x, bridgeDomeY(Math.hypot(x, B.colD / 2)) - BRG_SEAT])
    }
    solid.push({ id: 'column', geo: extrude([[x0, topY], [x1, topY], ...bot], -B.colD / 2, B.colD / 2) })
  }
  //  ⑤ ★133-b 아치 스팬드럴: 인트라도스 = 단일 2차 베지어 J→B(닫힌형 — 머리 주석).
  //   위 경계 = 소핏 + SINK(공면 방지 관입). 참 밑 구간(xL0~xB)은 참 밑면 — 꺾임점 xL0을 명시 표본으로 박는다
  //   (표본 사이 현이 꺾임점을 비껴 매달리는 것 방지 — 관입 여유 안이지만 명시가 싸다).
  {
    const { xJ, yJ, xB, yB, yCt } = B.arch
    const intra = quad([xJ, yJ], [xB, yCt], [xB, yB], BRG_SEG)
    const back = [[xB, B.soffit(xB) + BRG_SINK], [B.xL0, B.soffit(B.xL0) + BRG_SINK]]
    for (let i = 1; i <= BRG_SEG; i++) {
      const x = B.xL0 + (xJ - B.xL0) * i / BRG_SEG
      back.push([x, B.soffit(x) + BRG_SINK])
    }
    solid.push({ id: 'spandrel', geo: extrude([...intra, ...back], -B.wOut / 2, B.wOut / 2) })
  }
  //  ⑥ 바깥 브래킷: 기둥 바깥 면 → 참 바깥 밑 모서리(수직 발진 · 수평 도착 — 사분 아치)
  {
    const { xB2, yB } = B.arch
    const arc = quad([xB2, yB], [xB2, B.yLandU], [B.xL1, B.yLandU], BRG_SEG)
    solid.push({ id: 'bracket', geo: extrude([...arc, [xB2, B.yLandU + BRG_SINK]], -B.wOut / 2, B.wOut / 2) })
  }
  //  ⑦ ⛔윗층 어귀 포털(규율 5·6 — 스모크 자가 적발의 답): 윗층 관 끝(y132.07~138.42)이 첨탑 **위 빗면**
  //   (★129-b: y134.92↑에서 벽이 22.2→18로 물러남)을 가로지른다. 수직 끝면은 빗면 위에서 허공에 뜨고(틈 1.1+),
  //   끝면을 벽에 좇게 하면 지붕 경사선과 빗면이 준평행이라 코가 첨탑을 30+ 기어오른다(발산 — 실측).
  //   → **덮는 판**: 어귀 블록 하나가 관 끝 단면 + 빗면 틈 쐐기를 통째로 삼킨다(★127 어귀 액자 어법 승계).
  //   왼 변 = wellWallR(y) − emb 샘플(수직벽·빗면·팔각을 높이별로 좇음 — 전부 벽 살 속) · 오른 변 = 관 끝에 겹침.
  //   z = ±(wOut/2 − SINK): 관 옆벽과 공면 금지. ⚠아래층은 전 구간 벽 22.2 수직 — 포털 불요(검사가 확인).
  {
    const yTopU = B.yTerr + B.gap
    const yBot = yTopU - B.ftU                       // 윗층 소핏(벽 자리)
    const yTop = yTopU + B.h + B.wt                  // 윗층 지붕 윗면(벽 자리)
    const xR = B.xWall + BRG_PORTAL_L
    const S2 = spireSpec()
    const N = 16, left = []
    for (let i = N; i >= 0; i--) {
      const y = yBot + (yTop - yBot) * i / N
      left.push([wellWallR(y, { spec: S2, forceSpire: true }) - B.emb, y])
    }                                                // left = yTop → yBot(내림차순 — 그대로 잇는다)
    solid.push({ id: 'portal', geo: extrude([[xR, yBot], [xR, yTop], ...left], -B.wOut / 2 + BRG_SINK, B.wOut / 2 - BRG_SINK) })
  }
  return { walk, solid }
}
