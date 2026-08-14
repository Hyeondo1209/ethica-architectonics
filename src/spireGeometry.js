// spireGeometry.js — ★127 빛우물 첨탑 (2026.08.14 현도 스케치 2장: 입체 + 실루엣 비교)
//  구 단일 원뿔대(두께 0 DoubleSide 관 = 종잇장) → 4단 적층 첨탑:
//    ① 원기둥(디스크 봉합 r18) → ② 팔각뿔대(어깨) → ③ 팔각기둥(드럼) → ④ 원뿔대(첨두 · 꼭대기 개구 r2.5)
//  레퍼런스 = 중세 첨탑(세고비아 알카사르 탑 · 첨탑 일러스트) — 이번 세션 = 매싱만, 디테일(띠·슬릿·랜턴 살)은 이후.
//
//  ★현도 결정(2026.08.14 — 리드백 Q1~Q6 답):
//   Q1 전체 높이 y98~162 유지 · 4단 비례 = 스케치 실측 초안(0.35/0.30/0.14/잔여 0.21) + 노브
//   Q2 밑 = 디스크와 봉합(외반경 ROOM_LAND_R 18)
//   Q3 3단 = 팔각기둥("팔육면체"는 말실수)
//   Q4 팔각 방위 두 체제 병존('pit' 지하 정의 각뿔대 라임 / 'tunnel' 터널 정렬) — 로컬 비교 후 확정
//   Q5 꼭대기 개구 = ROOM_WELL_RT 2.5 유지(샤프트 출처 어휘 보존) · **종잇장 금지 = 벽 두께 SPIRE_T**
//      (개구 마감 = 열린 결정 — 지금은 두께가 드러나는 환형 림. §7)
//   Q6 하부 CSG 무변경(대각 터널 문 4 + 방 돔 감산 + 디스크 상호관입 봉합)
//
//  ★★단일 정본: 벽 사면 공식 = 이 파일의 `wellWallR()` 하나.
//   구 사본 3곳(Radial.jsx 허브 문틀 coneR · check_radial coneR/coneR2)과 _probe_exterior의 원뿔 복제는
//   전부 이 모듈을 부르도록 교체됐다(★79-7 사본 금지 규율 · SPIRE_ON=false면 구 원뿔 공식을 이 함수가 반환).
//
//  ★접합 문법(§1 접합·틈 수리 규율 적용):
//   · J1(원기둥→팔각뿔대): 팔각 모서리 = 원기둥 외반경 18 **정확히 접촉**(규율 ⑦ 관입 0 · 돌출 0).
//     면 중앙은 현이 안으로 들어와(내접 16.63 < 내벽 16.8) 원기둥 위가 **환형 슬릿**으로 열린다 →
//     원기둥 상단을 **L-턱**(안 반경을 팔각 밑 내접 아래까지 넓힌 두꺼운 턱)으로 만들어 바닥을 깐다(규율 ⑤ 덮는 판).
//     팔각 밑단은 수직 스텁(0.5)으로 그 턱 속에 **침강**(동일평면 z-파이팅 금지 — ★64 "여유는 틈이 된다").
//   · J3(팔각기둥→원뿔대): 원뿔 밑 원 = 팔각 **외접**(모서리 접촉 = 관입 0 · 면 중앙 처마 rMid(1−cos22.5°)≈0.40).
//     원뿔 밑단도 0.5 침강 — 밑단이 자연 연장돼 모서리에서도 ~0.06 나온다(전방위 균일 미세 처마 = 의도 수용).
//   · 감김 = 성분별 orientOutward(규율 ⑨) — CSG **전**에 각 솔리드를 정렬(CSG는 닫힌 입력의 감김을 보존).
//
//  ★샤프트 클리어런스(닫힌 식 — 규율: 격자 탐색 대신 꼭짓점 검사):
//   빛 샤프트 상절 r(y) = (WELL_RT−0.3) + (SHAFT_TOP_R−WELL_RT)·(yT−y)/(yT−SHAFT_TOP_Y) 는 선형,
//   내벽 최소 수평 거리(wellInnerClear)도 구간별 선형 → 위반 최대는 구간 경계에만 생긴다.
//   SPIRE_R_MID 하한이 여기서 나온다: 내접(rMid−T/cos22.5°)·cos22.5° > 샤프트 r(y2). 검사 [★127]이 상시 잰다.
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import { orientOutward } from './orientGeo.js'
import { ascSpec } from './ascentTunnelGeometry.js'   // ★127-e 포털 지붕 클리어 파생(어귀 실측 결합 — 사본 금지)
import {
  SPIRE_ON, SPIRE_T, SPIRE_H1_F, SPIRE_H2_F, SPIRE_H3_F, SPIRE_R_MID, SPIRE_OCT_MODE,
  SPIRE_SINK, SPIRE_LEDGE_H,
  SPIRE_FIN_ON, SPIRE_FIN_COL_H, SPIRE_FIN_COL_W, SPIRE_FIN_CAP_R, SPIRE_FIN_CAP_H,
  SPIRE_FIN_HOLE_R, SPIRE_FIN_CAP_T, SPIRE_MOLD_ON, SPIRE_M1_OCT, SPIRE_M1_OV, SPIRE_M1_H, SPIRE_M3_OV, SPIRE_M3_H,
  SPW_ON, SPW_D, SPW_Y0, SPW_H, SPW_J1, SPW_TOP_F, SPW_TOP_MOLD,
  LNK_ON, LNK_DOOR_ON, LNK_ASSIGN, LNK_DOOR_H, LNK_DOOR_HW, LNK_DOOR_MARG, SPT_R, SPT_Y,
  SPIRE_PORTAL_ON, SP_FR_SPAN, SP_FR_W, SP_FR_SPRING, SP_FR_APEX, SP_FR_POINT,
  SP_FR_PROJ_TOP, SP_FR_PROJ_FOOT, SP_FR_PROJ_P, SP_FR_TILT, SP_FR_EMB, SP_FR_CLR,
  SP_FR_MESH, SP_FR_MESH_GAP, SP_FR_MESH_PROJ, SP_FR_MESH_TIP, SP_FR_MESH_TIP_P,
  ROOM_LAND_R, ROOM_WELL_RT, ROOM_CEIL_Y, ROOM_CYL_TOP,
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_CX,
  RAD_ANG0, RAD_T_IN, RAD_TOP, RAD_DOOR_HW, COR_Y0,
} from './constants.js'

const COS_O = Math.cos(Math.PI / 8)                 // 팔각 내접/외접 비 0.9239

//  ★129-b: 원기둥 솔리드의 단면 프로파일 = **정본 하나**. 빌더가 돌리고 검사가 같은 배열을 적분한다
//   (손유도 부피식이 위 빗면 추가에서 288 어긋났다 — 손으로 다시 세는 대신 프로파일을 정본으로 올렸다).
function cylProfile(S) {
  return [
    [S.rCyl, S.yB], [S.rCyl, S.wY0], [S.rCylTop, S.wY1],                      // 바깥벽(아래 빗면)
    [S.rCylTop, S.yTop0], [S.octBase, S.y1],                                  // ★129-b 위 빗면 → 팔각 밑에 정확히 착지
    [S.ledgeIn, S.y1],                               // 상면(팔각 밑 → 턱 안. 팔각이 덮는 좁은 띠)
    [S.ledgeIn, S.y1 - S.ledgeH],                    // 턱 안벽
    [S.octBase - S.T + (S.rCylTop - S.octBase) * S.ledgeH / Math.max(S.topH, 1e-9), S.y1 - S.ledgeH],  // 턱 소핏 = 그 높이 내벽
    [S.rCylTopIn, S.yTop0],                          // 내벽(위 빗면 — 바깥과 같은 각·두께 T 유지)
    [S.rCylTopIn, S.wY1], [S.rCylIn, S.wY0],         // 내벽(아래 빗면)
    [S.rCylIn, S.yB],                                // 내벽
  ]
}

// ── 스펙(전부 파생 — 수치 하드코딩 금지 규율 ⑪) ──
export function spireSpec(opts = {}) {
  const octMode = opts.octMode ?? SPIRE_OCT_MODE
  const yB = ROOM_CEIL_Y - 3, yT = ROOM_CYL_TOP     // 구 원뿔대와 동일 대역(98~162 — 현도 Q1 "높이 유지")
  const Htot = yT - yB
  const h1 = Htot * SPIRE_H1_F                      // ① 원기둥
  const h2 = Htot * SPIRE_H2_F                      // ② 팔각뿔대
  const h3 = Htot * SPIRE_H3_F                      // ③ 팔각기둥
  const h4 = Htot - h1 - h2 - h3                    // ④ 원뿔대 = 잔여(파생 — 합이 항상 닫힘)
  const y1 = yB + h1, y2 = y1 + h2, y3 = y2 + h3
  const T = SPIRE_T
  const rCyl = ROOM_LAND_R                          // 외반경 = 디스크 봉합(Q2) — **밑(y98)은 절대 안 움직인다**
  const rCylIn = rCyl - T
  //  ★★129 하단 2단 확장(현도 08.14): 아래 r18 / 빗면 / 위 r18+Δ. 넓힐 수 있는 쪽은 **위뿐**(디스크 봉합·어귀 액자).
  const wOn = opts.widen ?? SPW_ON
  const wD = wOn ? SPW_D : 0
  const wY0 = SPW_Y0, wY1 = SPW_Y0 + SPW_H        // 빗면 아래끝 · 윗끝
  const rCylTop = rCyl + wD                       // 위 원기둥 외반경
  const rCylTopIn = rCylTop - T
  const octInOff = T / COS_O                        // 팔각 안 오프셋: 면 수직 −T → 외접 −T/cos22.5°
  const rMid = SPIRE_R_MID                          // ②꼭대기·③ 팔각 외접 = ④ 밑 원 반경(모서리 접촉)
  const rMidIn = rMid - octInOff
  const rTopIn = ROOM_WELL_RT                       // 꼭대기 개구(샤프트 출처 불변 — Q5)
  const rTopOut = rTopIn + T
  //  ★129 팔각 밑 반경 = J1 체제 파생. 'eave'(현도 확정) = 18 그대로 → y138.02 상면이 폭 Δ의 **처마**가 된다.
  //   'follow' = 팔각도 18+Δ로 따라 넓힘(첨탑 위쪽 비례가 같이 움직인다).
  const octBase = SPW_J1 === 'follow' ? rCylTop : rCyl
  //  ★129-b 위 빗면: 아래 빗면과 **같은 각**을 기본으로 높이를 파생한다(각이 노브가 아니라 커플링 —
  //   Δ를 바꾸면 위·아래가 함께 따라간다). 'follow'면 좁힐 것이 없어 높이 0으로 퇴화.
  const topH = wD > 1e-9 ? (rCylTop - octBase) * (SPW_H / wD) * SPW_TOP_F : 0
  const yTop0 = y1 - topH                          // 위 빗면 아래끝
  //  L-턱: 안 반경 = 팔각 밑 내접(어느 방위 체제든 동일) − 0.25 여유 (파생 — 슬릿 바닥을 항상 덮음)
  const ledgeIn = (octBase - octInOff) * COS_O - 0.25
  //  팔각 방위: 첫 모서리 방위각. 'pit' = 면 중심 22.5°+45°k(★101 정의 각뿔대와 동일 — +x·터널각 45°가 모서리)
  //             'tunnel' = 면 중심 0°+45°k(대각 터널 45°+90°k가 면 정중앙 — +x도 면)
  const cornerAz0 = octMode === 'pit' ? 0 : Math.PI / 8
  //  ★127-b 피니얼(랜턴+갓) 파생: 기둥 링 = 개구 림 폭 정중앙(발자국이 림 안 — 검사가 박음) · 꼭지 = 갓 첨두
  const finColRing = (rTopIn + rTopOut) / 2
  const finColTop = yT + SPIRE_FIN_COL_H
  const tipY = SPIRE_FIN_ON ? finColTop + SPIRE_FIN_CAP_H : yT
  //  ★127-c 갓 셸(센터 구멍 — 현도 2차): 사면 평행 오프셋 폐곡 4점. 구멍 림 = 수직 세그(r=holeR)
  const holeR = SPIRE_FIN_HOLE_R, capT = SPIRE_FIN_CAP_T
  const capSlope = SPIRE_FIN_CAP_H / (SPIRE_FIN_CAP_R - holeR)          // 사면 기울기(dy/dr)
  const capTw = capT * Math.sqrt(1 + capSlope * capSlope) / capSlope     // 평행 오프셋의 수평 성분(밑 림 폭)
  const capProf = [
    [holeR, tipY], [SPIRE_FIN_CAP_R, finColTop],                         // 바깥 사면
    [SPIRE_FIN_CAP_R - capTw, finColTop],                                // 밑 림
    [holeR, tipY - capTw * capSlope],                                    // 안 사면(평행) → 구멍 림(수직)으로 폐곡
  ]
  //  ★127-c 접합 몰딩 프로파일(팔각 lathe · 외접 기준 · 몸통에 0.5 물림 — 빌더·검사 공용 정본)
  //  ★129-b: 위 빗면이 서면 구 위치(y1 위)의 플린스는 빗면 밖에 뜬 고리가 된다 → 'foot'이면 빗면 **아래끝**으로 내려 감고,
  //   'off'면 빌더가 안 짓는다(빗면 자체가 마감 — 현도 "화분 같다"의 원인 제거).
  const m1Top = topH > 1e-9 ? yTop0 : y1 + SPIRE_SINK + 0.1             // 플린스 상면(구: 팔각 침강 스텁 위 = 크레센트 은폐)
  //  ★★127-d: 오버행 노브 = **표면 기준**. 팔각 모드면 외접 = 표면/cos22.5°로 파생 —
  //   구판은 노브를 외접에 그대로 써서 면이 원기둥 안으로 0.54 들어갔다(⛔N각 아포템 실패 재발 · 현도 3차 적발).
  const m1Seg = SPIRE_M1_OCT ? 8 : SEG
  //  ★★129: 몸통이 넓어지면 몰딩도 그 몸통을 따른다(★127-d 규칙 그대로 — 노브는 **표면 기준**).
  //   안 따라가면 플린스(18.9)가 새 벽(22.2) 속에 통째로 먹혀 '우아한 마감'이 사라진다(실측).
  const m1Body = m1Top - SPIRE_M1_H >= wY1 ? rCylTop : rCyl
  const m1On = SPIRE_MOLD_ON && (topH <= 1e-9 || SPW_TOP_MOLD === 'foot')
  const m1Out = SPIRE_M1_OCT ? (m1Body + SPIRE_M1_OV) / COS_O : m1Body + SPIRE_M1_OV
  const m1In = SPIRE_M1_OCT ? (m1Body - 0.5) / COS_O : m1Body - 0.5    // 물림 정점도 같은 규약(면이 벽 안)
  const m1Prof = [
    [m1In, m1Top - SPIRE_M1_H],                                          // 챔퍼 밑(원기둥에 물림)
    [m1Out, m1Top - SPIRE_M1_H + 0.8],                                   // 챔퍼 → 벌어짐
    [m1Out, m1Top],                                                      // 수직 몸통
    [m1In, m1Top],                                                       // 상면 → 안 수직으로 폐곡
  ]
  const m3Bot = y3 - SPIRE_M3_H + 0.2
  const m3Prof = [
    [rMid - 0.5, m3Bot],                                                 // 밑면(드럼에 물림)
    [rMid + SPIRE_M3_OV, m3Bot],
    [rMid + SPIRE_M3_OV, m3Bot + 0.8],                                   // 수직 몸통
    [rMid - 0.2, y3 + 0.2],                                              // 위 챔퍼 → 원뿔면 **안**으로 수렴(실측: +0.1이면 모서리가 원뿔 사면 밖 0.17 돌출 — 이음선을 원뿔이 삼키게 안으로)
    [rMid - 0.5, y3 + 0.2],                                              // 상면 → 안 수직 폐곡
  ]
  const spec0 = { yB, y1, y2, y3, yT, h1, h2, h3, h4, T, rCyl, rCylIn, octInOff, rMid, rMidIn,
           wOn, wD, wY0, wY1, rCylTop, rCylTopIn, j1: SPW_J1, octBase, topH, yTop0,
           topMold: SPW_TOP_MOLD,
           rTopIn, rTopOut, ledgeIn, cornerAz0, octMode, sink: SPIRE_SINK, ledgeH: SPIRE_LEDGE_H,
           finOn: SPIRE_FIN_ON, finColRing, finColTop, finColW: SPIRE_FIN_COL_W,
           finCapR: SPIRE_FIN_CAP_R, finCapH: SPIRE_FIN_CAP_H, tipY,
           holeR, capT, capProf, moldOn: SPIRE_MOLD_ON, m1On, m1Prof, m3Prof, m1Seg, m1Oct: SPIRE_M1_OCT,
           portal: portalSpec({ rCyl }) }
  spec0.cylProf = cylProfile(spec0)      // ★129-b 단면 정본(빌더·검사 공용 — 사본 금지)
  return spec0
}

// ── ★127-e 어귀 포털 파생(필라스터 굽 + 린텔 + 처마 후드 — 로컬 s=방사·z=접선) ──
export function portalSpec({ rCyl = ROOM_LAND_R } = {}) {
  if (!SPIRE_PORTAL_ON) return { on: false }
  const A = ascSpec()
  const roofTopAt = (sx) => (A.y0 + A.clear + 0.4) + Math.max(0, sx - A.sSt0) * (A.rise / A.runSt)
  const domeYat = (r) => ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (r / ROOM_R) ** 2))
  const MESH = SP_FR_MESH
  const ROOF_K = A.rise / A.runSt                     // 관 지붕 기울기(s당 0.551)
  const PROJ_TOP = MESH ? SP_FR_MESH_PROJ : SP_FR_PROJ_TOP
  const spanO = SP_FR_SPAN, spanI = spanO - SP_FR_W
  //  발 = 돔 곡면 아래 매몰(닫힌 식 — 가장 먼 모서리 기준)
  const sFar = rCyl + PROJ_TOP
  const foot = domeYat(Math.hypot(rCyl + SP_FR_PROJ_FOOT, spanO)) - 0.3
  //  ★내밀기 = 높이의 함수(측면 도면): 꼭대기 최대 → 발치값으로 오목하게 수렴(0 아님)
  const projAt = (y) => {
    const t = Math.min(1, Math.max(0, (y - foot) / (apexY - foot)))
    return SP_FR_PROJ_FOOT + (PROJ_TOP - SP_FR_PROJ_FOOT) * t ** SP_FR_PROJ_P
  }
  //  ★기울기 두 체제 — 둘 다 **하강**이 기본형이고, 차이는 얼마나 내려앉느냐다:
  //   ⓐ 틈 체제(127-l): 하강량 = 노브 `SP_FR_TILT`(0.65) · 관 지붕과 틈 `SP_FR_CLR` 유지
  //   ⓑ 물림 체제(127-m): 하강량 = **파생** — 처마 끝이 오르는 관 지붕 위 `MESH_GAP`에 정확히 내려앉도록 역산.
  //     ⚠"관 지붕과 나란히(상승)"로 만들면 틈이 y−106.4로 고정돼 **한 점에서만 스친다**(실측 물린 대역 0.23) —
  //      관은 오르고 처마는 내려가야 두 면이 마주 오며 물린다.
  //  ⚠하강량을 내밀기에 **비례**로 깔면 중간 높이가 관을 문다(실측 −1.38): 관 지붕은 s에 선형인데
  //   처마 밑면은 y의 곡선이라 두 선이 어긋난다. → 물림에서는 하강량을 **각 높이마다 개별 파생**한다:
  //   밑면 = 그 높이 내밀기 지점의 관 지붕 + MESH_GAP. 그러면 처마 전 길이가 관을 따라 나란히 문다.
  //   (관보다 낮은 다리 구간은 clamp 0 — 문틀은 수직으로 선다)
  //  ★127-n 틈 프로파일: 중간대 = MESH_GAP(물림) · 꼭대기로 갈수록 +TIP(첨두 보존 — 하강을 그만큼 덜 준다)
  const gapAt = (y, springY0, apexY0) => {
    const t = Math.min(1, Math.max(0, (y - springY0) / Math.max(1e-6, apexY0 - springY0)))
    return SP_FR_MESH_GAP + SP_FR_MESH_TIP * t ** SP_FR_MESH_TIP_P
  }
  const tiltAtFor = (springY0, apexY0) => MESH
    ? (y) => Math.max(0, y - roofTopAt(rCyl + projAt(y)) - gapAt(y, springY0, apexY0))
    : (y) => SP_FR_TILT * (projAt(y) - SP_FR_PROJ_FOOT) / Math.max(1e-6, PROJ_TOP - SP_FR_PROJ_FOOT)
  //  ⚠★스프링·꼭대기는 노브 그대로가 아니라 **관 지붕 틈에서 역산한 리프트**를 더한다(닫힌 식 반복 1회):
  //   아치가 관 폭 대역(|z|≤massHW)으로 들어오는 구간에서 내밀기가 커지며 오르는 관 지붕을 만난다
  //   (실측: 노브값 그대로면 −0.03로 문다). 리프트는 전 윤곽 최악점 기준 — 노브를 어떻게 밀어도 틈이 지켜진다.
  const liftFor = (spring0, apex0) => {
    const projA = (y, footY) => { const t = Math.min(1, Math.max(0, (y - footY) / (apex0 - footY)))
      return SP_FR_PROJ_FOOT + (PROJ_TOP - SP_FR_PROJ_FOOT) * t ** SP_FR_PROJ_P }
    const tiltA = MESH
      ? (y, footY) => Math.max(0, y - roofTopAt(rCyl + projA(y, footY)) - gapAt(y, spring0, apex0))
      : (y, footY) => SP_FR_TILT * (projA(y, footY) - SP_FR_PROJ_FOOT) / Math.max(1e-6, PROJ_TOP - SP_FR_PROJ_FOOT)
    let worst = 1e9
    for (let i = 0; i <= 2000; i++) {   // ⚠검사(2000)와 동일 해상도: 400이면 최악점을 놓쳐 0.005 모자랐다(실측)
      const u = i / 2000
      for (const inner of [true, false]) {
        const span = inner ? spanI : spanO, apx = inner ? apex0 - SP_FR_W : apex0
        const legF = (spring0 - foot) / ((spring0 - foot) + (apx - spring0))
        let z, y
        if (u <= legF) { z = -span; y = foot + (spring0 - foot) * (u / legF) }
        else { const v = (u - legF) / (1 - legF), cy = spring0 + (apx - spring0) * SP_FR_POINT
          z = (1 - v) ** 2 * (-span) + 2 * (1 - v) * v * (-span)
          y = (1 - v) ** 2 * spring0 + 2 * (1 - v) * v * cy + v * v * apx }
        if (Math.abs(z) > A.massHW) continue
        const d = projA(y, foot), t = tiltA(y, foot)
        worst = Math.min(worst, (y - t) - roofTopAt(rCyl + d))
      }
    }
    //  ⚠물림 체제에서는 **음의 리프트(하강)**를 허용해야 한다 — 안 그러면 액자가 관 위에 떠서(실측 1.324)
    //   "딱 물림"이 성립하지 않는다. 틈 체제는 상승만(0 하한 — 관을 물면 안 되므로).
    //  두 체제 모두 **상승 보정**: 물림에서도 안쪽 아치 모서리가 관 상단 모서리를 스치므로(실측 −0.12) 리프트가 필요하다.
    //  ⚠물림의 밑면은 높이별 파생이라 리프트를 줘도 "관을 따라 나란히"는 유지된다(리프트는 윤곽만 올린다).
    return Math.max(0, (MESH ? SP_FR_MESH_GAP : SP_FR_CLR) - worst)
  }
  //  ⚠1회 역산으론 안 닫힌다(리프트가 형상을 바꿔 최악점이 이동 — 실측 0.533 < 0.6). 고정점까지 반복.
  let lift = 0
  for (let it = 0; it < 40; it++) {
    const add = liftFor(SP_FR_SPRING + lift, SP_FR_APEX + lift)
    if (Math.abs(add) < 1e-4) break   // ⚠절댓값: 물림 체제의 음의 리프트(하강)에서 즉시 끊기던 버그
    lift += add
  }
  const springY = SP_FR_SPRING + lift, apexY = SP_FR_APEX + lift
  const tiltAt = tiltAtFor(springY, apexY)
  //  ★액자 윤곽(정면 z-y): 곧은 다리 → 스프링부터 뾰족 아치. u∈[0,1] : 발치 → 꼭대기(왼쪽 절반)
  const outline = (u, inner) => {
    const span = inner ? spanI : spanO
    const apex = inner ? apexY - SP_FR_W : apexY
    const legF = (springY - foot) / ((springY - foot) + (apex - springY))                  // 다리 구간 비
    if (u <= legF) return [-span, foot + (springY - foot) * (u / legF)]                    // 곧은 다리
    const v = (u - legF) / (1 - legF)                                                       // 아치 구간
    const cz = -span, cy = springY + (apex - springY) * SP_FR_POINT
    return [(1 - v) ** 2 * (-span) + 2 * (1 - v) * v * cz,
            (1 - v) ** 2 * springY + 2 * (1 - v) * v * cy + v * v * apex]
  }
  return { on: true, spanO, spanI, foot, roofTopAt, domeYat, projAt, tiltAt, outline,
           apex: apexY, spring: springY, lift, tiltTop: tiltAt(apexY), gapAt: (y) => gapAt(y, springY, apexY), w: SP_FR_W, mesh: MESH, roofK: ROOF_K, emb: SP_FR_EMB, clr: MESH ? SP_FR_MESH_GAP : SP_FR_CLR,
           rCyl, sFar, massHW: A.massHW, hubLinTop: RAD_TOP + 0.6, projTop: PROJ_TOP }
}

// ── 벽 바깥 반경 단일 정본(팔각 구간 = 외접 — 면 표면은 ×cos22.5°) ──
//  ⚠보존계: SPIRE_ON=false면 구 단일 원뿔대 사면을 반환(구 coneR 사본 3곳이 이 함수로 통일됨).
export function wellWallR(y, opts = {}) {
  if (!SPIRE_ON && !opts.forceSpire)
    return ROOM_LAND_R - (ROOM_LAND_R - ROOM_WELL_RT) * (y - (ROOM_CEIL_Y - 3)) / (ROOM_CYL_TOP - (ROOM_CEIL_Y - 3))
  const S = opts.spec ?? spireSpec(opts)
  //  ★129: 원기둥 구간 = 아래 rCyl / 빗면 / 위 rCylTop(선형)
  if (y <= S.y1) return y <= S.wY0 ? S.rCyl
    : y < S.wY1 ? S.rCyl + S.wD * (y - S.wY0) / (S.wY1 - S.wY0)
    : y <= S.yTop0 ? S.rCylTop
    : S.rCylTop + (S.octBase - S.rCylTop) * (y - S.yTop0) / S.topH     // ★129-b 위 빗면(두 면 같은 각)
  if (y <= S.y2) return S.rCyl + (S.rMid - S.rCyl) * (y - S.y1) / S.h2
  if (y <= S.y3) return S.rMid
  return S.rMid + (S.rTopOut - S.rMid) * (y - S.y3) / S.h4
}

// ── 내벽 최소 수평 거리(축→내벽 — 샤프트 상한. 팔각 구간 = 내접이 최소) ──
export function wellInnerClear(y, S = spireSpec()) {
  if (y <= S.y1) return y > S.y1 - S.ledgeH ? S.ledgeIn                 // L-턱 구간은 턱 안 반경
    : wellWallR(y, { spec: S, forceSpire: true }) - S.T                  // ★129 확장 추종(사본 금지)
  if (y <= S.y2) return ((S.rCyl - S.octInOff) + (S.rMidIn - (S.rCyl - S.octInOff)) * (y - S.y1) / S.h2) * COS_O
  if (y <= S.y3) return S.rMidIn * COS_O
  return (S.rMid - S.T) + (S.rTopIn - (S.rMid - S.T)) * (y - S.y3) / S.h4
}

// ── 회전체 헬퍼: (r,y) 폐곡 프로파일 → N각 회전 솔리드(비인덱스 tri 배열에 push) ──
function lathe(pos, prof, N, az0 = 0) {
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const P = (i, k) => {
    //  ⚠k % N: 이음매(k=N)를 k=0과 **비트 동일** 좌표로 — sin(2π)=−2.4e-16이 '-0.0000' 키를 만들어
    //  orientGeo 용접이 깨지는 음의 영 함정(★127 실측: 열린 에지 36 = 프로파일 점수 합 ×2)
    const a = az0 + (k % N) / N * Math.PI * 2
    return [prof[i][0] * Math.cos(a), prof[i][1], prof[i][0] * Math.sin(a)]
  }
  const M = prof.length
  for (let k = 0; k < N; k++) for (let i = 0; i < M; i++) {
    const j = (i + 1) % M
    if (Math.abs(prof[i][0]) < 1e-9 && Math.abs(prof[j][0]) < 1e-9) continue
    tri(P(i, k), P(j, k), P(j, k + 1)); tri(P(i, k), P(j, k + 1), P(i, k + 1))
  }
}

function toGeo(pos) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)
}

const SEG = 96                                       // 원형 구간 분할(구 원뿔대와 동급)

// ── ① 원기둥 + L-턱(한 회전체 — 규율 ⑤: 턱이 J1 슬릿의 바닥을 깐다) ──
function buildCylSolid(S) {
  const pos = []
  //  프로파일(반시계 폐곡): 바깥↑ → 상면 안으로 → 턱 안벽↓ → 턱 소핏 밖으로 → 내벽↓ → 바닥 밖으로
  //  ★129: 바깥·안 모두 [아래 통 → 빗면 → 위 통]. 확장 0이면 두 점이 겹쳐 구 프로파일과 **동일**(퇴화 삼각형은 lathe가 만들되 부피 0).
  lathe(pos, S.cylProf, SEG)
  return toGeo(pos)
}

// ── ②+③ 팔각뿔대 + 팔각기둥(한 솔리드 — 같은 팔각이라 이음 자체가 없음) ──
function buildOctSolid(S) {
  const pos = []
  //  프로파일: 밑 수직 스텁(침강 0.5 — 규율: 자연 연장하면 모서리가 18 밖으로 0.33 돌출)
  lathe(pos, [
    [S.octBase, S.y1 - S.sink], [S.octBase, S.y1],   // 스텁(L-턱 속 매몰) — ★129 J1 체제 파생
    [S.rMid, S.y2], [S.rMid, S.y3],                  // 뿔대 → 기둥
    [S.rMidIn, S.y3],                                // 상면 링
    [S.rMidIn, S.y2],                                // 안 기둥
    [S.octBase - S.octInOff, S.y1],                  // 안 뿔대
    [S.octBase - S.octInOff, S.y1 - S.sink],         // 안 스텁
  ], 8, S.cornerAz0)
  return toGeo(pos)
}

// ── ④ 원뿔대(첨두 — 밑 = 팔각 외접 원 · 꼭대기 = 개구 림 2.5→3.7) ──
function buildConeSolid(S) {
  const pos = []
  const yb = S.y3 - S.sink
  //  밑단 자연 연장(침강분): 반경이 밑으로 살짝 벌어져 모서리 포함 전방위 미세 처마
  const rb = S.rMid + (S.rMid - S.rTopOut) / S.h4 * S.sink
  const rbIn = (S.rMid - S.T) + ((S.rMid - S.T) - S.rTopIn) / S.h4 * S.sink
  lathe(pos, [
    [rb, yb], [S.rTopOut, S.yT],                     // 바깥 사면
    [S.rTopIn, S.yT],                                // 꼭대기 림(두께의 얼굴 — Q5 종잇장 방지)
    [rbIn, yb],                                      // 안 사면
  ], SEG)
  return toGeo(pos)
}

// ── ★127-b 피니얼: 랜턴 기둥 8(팔각 모서리 라임) + 속 찬 갓 원뿔(끝 r0 수렴 — 실루엣 완성) ──
//  갓 = 속 찬 솔리드(밑면 포함): 랜턴 옆은 뚫려 빛 어휘 유지, 갓 소핏이 축상 시야를 덮는다(스포 차단 강화).
//  속 찬 선택 이유 = 셸이면 두께 방향 해석·z파이팅 문제가 생기는데 여기선 안이 안 보인다(부피 해석도 πr²h/3 정확).
function buildFinial(S) {
  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  //  기둥 8 — 방위 = 팔각 모서리(cornerAz0 + 45°k) 라임. 발 = 개구 림 위 · 머리 = 갓 밑
  const h = S.finColW / 2
  for (let k = 0; k < 8; k++) {
    const a = S.cornerAz0 + k * Math.PI / 4
    const cx = S.finColRing * Math.cos(a), cz = S.finColRing * Math.sin(a)
    const y0 = S.yT, y1 = S.finColTop
    const c = [[-h, y0, -h], [h, y0, -h], [h, y0, h], [-h, y0, h], [-h, y1, -h], [h, y1, -h], [h, y1, h], [-h, y1, h]]
      .map(([x, y, z]) => [cx + x * Math.cos(a) - z * Math.sin(a), y, cz + x * Math.sin(a) + z * Math.cos(a)])  // 방사 정렬 회전
    for (const [i0, i1, i2, i3] of [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]]) {
      tri(c[i0], c[i1], c[i2]); tri(c[i0], c[i2], c[i3])
    }
  }
  const g1 = toGeo(pos)
  //  ★127-c 갓 = 셸(센터 구멍 holeR — "위가 뚫려야 빛이 쏟아진다" 현도 2차). 프로파일 정본 = spec.capProf
  const pos2 = []
  lathe(pos2, S.capProf, SEG)
  const g2 = toGeo(pos2)
  return [g1, g2]
}

// ── ★127-c 접합 몰딩 2기(팔각 lathe — J1 플린스 · J3 캡 코니스). 프로파일 정본 = spec ──
function buildMoldings(S) {
  const out = []
  if (S.m1On) { const a = []; lathe(a, S.m1Prof, S.m1Seg, S.m1Seg === 8 ? S.cornerAz0 : 0); out.push(toGeo(a)) }
  const b = []; lathe(b, S.m3Prof, 8, S.cornerAz0); out.push(toGeo(b))
  return out
}

// ── ★127-e 포털 4기(어귀 45°+90°k — 로컬 박스·쐐기를 방위 회전 배치) ──
function buildPortals(S, opts = {}) {
  const P = S.portal
  if (!P.on || opts.noFrame) return []   // noFrame = 검사용 차분 빌드(액자 부피 실측)
  const pos = []
  const tri = (a2, b2, c2) => pos.push(...a2, ...b2, ...c2)
  const R = (ang, [x, y, z]) => [x * Math.cos(ang) - z * Math.sin(ang), y, x * Math.sin(ang) + z * Math.cos(ang)]
  const NU = 34                                        // 윤곽 분할(반쪽)
  for (let k = 0; k < 4; k++) {
    const a = RAD_ANG0 + k * Math.PI / 2
    //  링 = 바깥 윤곽(왼→꼭대기→오른) + 안 윤곽. 각 점마다 뒤(벽 물림)·앞(내밀기·기울기) 두 정점.
    const ring = []
    const push = (zy, inner) => {
      const [z, y] = zy
      const d = P.projAt(y), t = P.tiltAt(y)
      ring.push({
        back: R(a, [P.rCyl - P.emb, y, z]),             // 벽 속
        front: R(a, [P.rCyl + d, y - t, z]),            // 처마 앞(기울어 내려감)
        inner,
      })
    }
    const outs = [], inns = []
    for (let i = 0; i <= NU; i++) outs.push(P.outline(i / NU, false))
    for (let i = NU - 1; i >= 0; i--) outs.push([-outs[i][0], outs[i][1]])
    for (let i = 0; i <= NU; i++) inns.push(P.outline(i / NU, true))
    for (let i = NU - 1; i >= 0; i--) inns.push([-inns[i][0], inns[i][1]])
    const O = outs.map(q => { const [z, y] = q, d = P.projAt(y), t = P.tiltAt(y)
      return { b: R(a, [P.rCyl - P.emb, y, z]), f: R(a, [P.rCyl + d, y - t, z]) } })
    const I = inns.map(q => { const [z, y] = q, d = P.projAt(y), t = P.tiltAt(y)
      return { b: R(a, [P.rCyl - P.emb, y, z]), f: R(a, [P.rCyl + d, y - t, z]) } })
    const Q = (p1, p2, p3, p4) => { tri(p1, p2, p3); tri(p1, p3, p4) }
    for (let i = 0; i < O.length - 1; i++) {
      Q(O[i].f, O[i + 1].f, I[i + 1].f, I[i].f)          // 앞면(액자 얼굴 — 처마 윗면 포함)
      Q(I[i].b, I[i + 1].b, O[i + 1].b, O[i].b)          // 뒷면(벽 속)
      Q(O[i].b, O[i + 1].b, O[i + 1].f, O[i].f)          // 바깥 옆면
      Q(I[i].f, I[i + 1].f, I[i + 1].b, I[i].b)          // 안 옆면(개구 리빌)
    }
    //  발치 캡(다리 두 밑면 — 돔 속에 매몰)
    const L = O.length - 1
    Q(O[0].b, O[0].f, I[0].f, I[0].b)
    Q(I[L].b, I[L].f, O[L].f, O[L].b)
  }
  return [toGeo(pos)]
}

// ── CSG 자르개(구 wellCut과 동일 — Q6 무변경): 대각 터널 문 4 + 방 돔 감산 ──
function cutSolids() {
  const cutters = []
  for (let k = 0; k < 4; k++) {
    const ang = RAD_ANG0 + k * Math.PI / 2
    const g = new THREE.BoxGeometry(26 - RAD_T_IN, RAD_TOP - COR_Y0, RAD_DOOR_HW * 2)
    g.translate((RAD_T_IN + 26) / 2, (RAD_TOP + COR_Y0) / 2, 0)
    g.rotateY(-ang)
    cutters.push(g)
  }
  //  ★★★130-f 접속 통로 문: 배정된 셸의 **정방위**(대각을 45° 돌린 0/90/180/270)에서 테라스 레벨을 뚫는다.
  //   ⚠자르개는 벽보다 크게(여유 MARG) — 공면이면 z-fighting이 난다.
  if (LNK_ON && LNK_DOOR_ON) {
    LNK_ASSIGN.forEach((mode, k) => {
      if (!mode) return
      const g2 = new THREE.BoxGeometry(12, LNK_DOOR_H, (LNK_DOOR_HW + LNK_DOOR_MARG) * 2)
      g2.translate(SPT_R + 6, SPT_Y + LNK_DOOR_H / 2, 0)          // 안쪽(구멍 밖)부터 벽 너머까지
      g2.rotateY(-(k * Math.PI / 2))
      cutters.push(g2)
    })
  }
  const dome = new THREE.SphereGeometry(1, 64, 40)
  dome.scale(ROOM_R, ROOM_HEIGHT, ROOM_R)
  dome.translate(ROOM_CX, ROOM_FLOOR_Y, 0)
  cutters.push(dome)
  return cutters
}

// ── 조립: ①에만 CSG(문 상단 105.72·돔 정점 101 < y1 — 검사가 박음), ②③④는 순수 기하 ──
//  ⚠구판은 두께 0 관이라 HOLLOW_SUBTRACTION이었다 — 신판은 닫힌 솔리드라 **SUBTRACTION**:
//   절단면이 캡으로 닫혀 문 개구에 벽 두께(잼 단면 T)가 그대로 드러난다(Q5 종잇장 방지의 얼굴 둘째).
export function buildSpire(opts = {}) {
  const S = opts.spec ?? spireSpec(opts)
  let cylGeo = buildCylSolid(S)
  if (opts.cut !== false) {
    const ev = new Evaluator()
    ev.attributes = ['position', 'normal']
    let acc = new Brush(cylGeo); acc.updateMatrixWorld()
    for (const g of cutSolids()) {
      const b = new Brush(g); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION); acc.updateMatrixWorld()
    }
    cylGeo = acc.geometry
  }
  const parts = [cylGeo, buildOctSolid(S), buildConeSolid(S)]
  if (S.finOn) parts.push(...buildFinial(S))
  if (S.moldOn) parts.push(...buildMoldings(S))
  parts.push(...buildPortals(S, opts))
  const pos = []
  for (const g of parts) {
    const ng = g.index ? g.toNonIndexed() : g
    const arr = ng.getAttribute('position').array
    for (let i = 0; i < arr.length; i++) pos.push(arr[i])   // ⚠spread 금지: 볼트 이후 정점 수가 인자 한계 초과(★127-k 실측)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()                           // 감김은 성분별 orientOutward가 CSG 전에 확정 — 여기선 법선만
  return g
}
