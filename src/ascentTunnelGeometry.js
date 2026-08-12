// ════════════════════════════════════════════════════════════════════
//  ascentTunnelGeometry.js — ★119 상승 터널(허브→방) 기하 정본 (2026.08.05)
//  분리 패턴(lensGeometry·terraceGeometry 계열): 순수 모듈 — Radial.jsx가 그리고
//  check_radial.mjs가 같은 유도를 잰다. 사본 금지(★79-7·★118 REPLICA 전례).
//
//  현도 그림: 디스크(문지방 101.28)에서 각 방으로 가는 길이 '오르는 계단 관'이 되고,
//  셸 상부(발밑 RAD_ASC_Y1)의 새 문으로 들어서며 방 사건을 내려다본다. 고리·구 문·내부 무손상.
//
//  로컬 프레임: +x = 방사 바깥(s = 허브 중심거리), y = 월드 높이, z = 접선(±반폭).
//  마운트 = <group rotation-y={-ang}> — 셸·문틀과 같은 등형 배치(한 기하 4회 회전).
//
//  단면 어휘 = 구 수평 터널 승계: 내부 반폭 RAD_T_HW(2.2) · 연직 내부고 = RAD_TOP − 문지방(4.72,
//  RAD_TOP 노브에 자동 추종) · 벽 시작 = RAD_WALL_R0(허브 문틀 몸통 안 — 어귀 접속 불변).
//  계단 어법 = ★107-2 계승: 매스에 단을 새김(단높이 씨앗 0.24 = 회랑·나팔 리듬).
//  문 이음 = 기존 문틀 어법의 높이 일반화: 곡면 이음선·컷 림·관 끝을 문틀 몸통이 삼킨다.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  RAD_R, RAD_PCY, RAD_PRY, petalR,
  RAD_T_HW, RAD_TOP, RAD_DOOR_H, RAD_DOOR_HW, RAD_WALL_R0,
  RAD_FLOOR_Y, COR_THICK, ROOM_LAND_R, RAD_UNDER_LIP,
  RAD_ASC_Y1, RAD_ASC_RISE_SEED, RAD_ASC_LAND0, RAD_ASC_LAND1, RAD_ASC_MASS_T,
  ASC_DOOR_GATE, RSP_CLEAR, RSP_W, RSP_WALL_T, RSP_ON, RAD_DOOR_HW as DOOR_HW,
  ASC_JUNC_BITE, ASC_OVL_EXT, ASC_MOUTH_SILL_ON, ASC_MOUTH_SILL_D, ASC_MOUTH_SILL_T,
  RASC_SUP_ON, RASC_COL_GAP, RASC_COL_RT, RASC_COL_SPREAD, RASC_COL_MIN,
  RASC_COL_INSET, RASC_FOOT_BITE, RASC_FOOT_PAD,
  ROOM_OCULUS_R, ROOM_FLOOR_Y, ROOM_HEIGHT, ROOM_R,
} from './constants.js'
import { orientOutward } from './orientGeo.js'   // ★122-d

export const ASC_FR_T = 0.5   // 문틀 두께(Radial.jsx FR_T와 같은 값 — 상부 문틀 파생이 검사에서 읽혀야 해 여기 선언)

// ── 단일 유도점: 모든 수치가 여기서 나온다(★118 교훈 — 닫힌 식, 표본 의존 없음) ──
export function ascSpec() {
  const y0 = RAD_FLOOR_Y + COR_THICK / 2            // 문지방(디스크·통로 레벨) 101.28
  const y1 = RAD_ASC_Y1                             // 새 문지방(진입 바닥)
  const rise = y1 - y0
  const clear = RAD_TOP - y0                        // 연직 내부고 4.72 — 구 터널 승계(RAD_TOP 추종)
  const s0 = ROOM_LAND_R + RAD_UNDER_LIP            // 매스 시작 18.05 — ★110 결합 승계(ROOM_LAND_R 밀면 따라옴)
  const sWall0 = RAD_WALL_R0                        // 벽·천장 시작 15.5 — 허브 문틀 몸통 안(어귀 불변)
  const sFace = RAD_R - petalR(y1)                  // 셸 허브쪽 내면(진입 바닥 높이) ≈47.60
  const sSt0 = s0 + RAD_ASC_LAND0                   // 첫 단코
  //  ★★★122-f 구조 정정(2026.08.12 현도 4차 — 좌표 실측으로 확정한 구조적 충돌):
  //  ⛔구 상태: 계단이 셸면(sFace)까지 올라갔는데, **나선 회랑이 s42.55~47.55를 이미 점유**한다.
  //   겹치는 3.55 구간에서 회랑 바닥(y1)이 관 바닥보다 최대 1.96 높아 **관 정면에 벽**이 섰다
  //   (현도: "나선 시작부가 너무 높고 상승계단이 그 높이를 제공하지 않는다" — 정확한 진단).
  //  → 계단의 종점 기준을 셸면이 아니라 **회랑 바깥벽(sJuncWall)**으로 옮긴다. 관은 회랑에 닿기
  //   전에 이미 y1에 도달하고, 거기서부터 참·전망대·회랑이 전부 같은 평면이 된다.
  //  ⚠자기참조 주의: sJuncWall은 petalR(y1)에서 파생 — 아래에서 같은 식을 여기서 먼저 푼다(사본 아님, 동일 유도).
  const sStEnd = RSP_ON ? (RAD_R - (petalR(y1) + RSP_CLEAR + RSP_W + RSP_WALL_T)) : sFace
  const sSt1 = sStEnd - RAD_ASC_LAND1               // 마지막 단코(평지 시작) — 회랑 진입 전 도달
  const runSt = sSt1 - sSt0
  const N = Math.max(1, Math.round(rise / RAD_ASC_RISE_SEED))
  const stepRise = rise / N
  const tread = runSt / N
  const slopeDeg = Math.atan2(rise, runSt) * 180 / Math.PI

  // ── 상부 문틀(높이 일반화): 컷 바닥은 평지 매스 안(슬리버 0), 걸침은 컷 바닥까지 포함해 잰다
  //  (⚠y1 높이 셸은 위로 갈수록 좁아지므로 최전방 = 컷 바닥 높이 — 구 문틀의 FR_YS 규칙에 컷 바닥을 추가) ──
  const cutBot = y1 - 0.3                           // 컷 바닥 — 평지 매스(두께 1.5) 안 = 문턱 없음
  const doorTop = y1 + RAD_DOOR_H                   // 문 상단
  const ceilTop = y1 + clear + 0.4                  // 천장판 윗면(문 지점)
  const linTop = ceilTop + 0.2                      // 상인방 상단(구 LIN_TOP = 지붕 위 0.2 규칙 승계)
  const frOut = RAD_T_HW + ASC_FR_T                 // 잼 바깥 반폭 2.7 — 컷 가장자리(±2.3) 삼킴
  const frRW = (y) => Math.sqrt(Math.max(0.25, petalR(y) ** 2 - frOut ** 2))
  const frYs = [cutBot, y1, doorTop, linTop]        // 걸침 표본 4(단조 구간이라 이 넷이 극값을 덮는다)
  const frBack = Math.min(...frYs.map(frRW)) - 0.25 // 뒷면(방쪽 — 셸이 좁아지는 위쪽이 최심). 잼 선 기준이 최심측
  //  ⚠앞면은 잼 선(frRW)이 아니라 **중심선(petalR)** 기준 — 컷 림의 최전방은 z=0에서 나온다.
  //  구 문틀은 두 값 차 0.23이 +0.25 여유에 우연히 덮였지만 일반화하면 깨진다(검사 [★119]가 적발).
  const frFront = Math.max(...frYs.map(petalR)) + 0.25
  const frD = frFront - frBack
  const frC = (frFront + frBack) / 2
  const sTube1 = RAD_R - (frBack + 0.2)             // 벽·천장·매스 끝 — 문틀 몸통 안 평면 종료(구 TUBE_END 규칙)
  //  ★★122-c ①② T 접속 파생(ASC_DOOR_GATE=false — 나선 세계): 관은 나선 바깥벽에서 끝난다.
  //  나선 안 가장자리 = petalR(y1) + RSP_CLEAR(extSpiral rIn과 같은 식 — 검사가 수치 대조로 잠금).
  const sJuncWall = RAD_R - (petalR(y1) + RSP_CLEAR + RSP_W + RSP_WALL_T)   // 벽·천장 끝 = 나선 바깥벽 바깥면 ≈42.55
  const sJuncMass = RAD_R - (petalR(y1) + RSP_CLEAR) + 0.3                  // 매스 끝 = 층계참 안 가장자리 + 0.3 관입(동일면 접합)

  // 바닥 사슬 폴리라인(단코 기준선): 어귀 평지 → 경사 → 문 앞 평지(관 끝까지)
  const chordY = (s) => s <= sSt0 ? y0 : s >= sSt1 ? y1 : y0 + rise * (s - sSt0) / runSt
  return {
    y0, y1, rise, clear, s0, sWall0, sFace, sSt0, sSt1, runSt, N, stepRise, tread, slopeDeg,
    cutBot, doorTop, ceilTop, linTop, frOut, frBack, frFront, frD, frC, sTube1, chordY,
    sJuncWall, sJuncMass,
    //  ★122-c 유효 끝(게이트 파생): 구세계(문 있음) = 문틀 몸통 안 / 나선 세계 = T 접속면
    //  ★122-d(현도 2차): 새 문 = **전망대**(참에서 셸 내부를 내려다봄) — 컷·문틀 복원, 난간으로 막는다.
    //  벽·천장은 회랑 바깥벽에서 종료(T 접속 유지) · 매스는 셸면까지 flush(방 안 돌출 0 — 스텁 폐기).
    //  ★122-g ①: 벽·천장을 회랑 바깥벽 두께 안으로 관입(직선↔원호 새그 0.118 삼킴)
    sWallEnd: RSP_ON ? sJuncWall + ASC_JUNC_BITE : sFace,
    //  ★122-g ②: 전망대 바닥 = 셸면 → **잼 앞면**까지 내민 발코니(닫힌 식 재유도, 상수는 상한 확인용)
    sOvlEnd: RSP_ON ? (RAD_R - frC + frD / 2) : sTube1,
    sMassEnd: RSP_ON ? (RAD_R - frC + frD / 2) : sTube1,
    ovlY: y1, ovlTop: y1 + 1.05, ovlExt: (RAD_R - frC + frD / 2) - sFace,
    massHW: RAD_T_HW + 0.05,                        // 매스 반폭 — 벽면보다 0.05 넓게(동일면 z파이팅 회피, 굽도리 리빌)
    massT: RAD_ASC_MASS_T,
    // 노브 안전 상한(닫힌 식): 상인방 상단이 셸 안에 들려면 petalR(linTop) > frOut
    y1Max: RAD_PCY + RAD_PRY * Math.sqrt(1 - (frOut / petalR(RAD_PCY)) ** 2) - (clear + 0.6),
  }
}

// 공용 쿼드 빌더(Radial.jsx quadGeo와 동일 관례 — 반시계 감김·법선 자동)
function quadGeo(build) {
  const pos = [], idx = []
  const q = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
    const n = pos.length / 3
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  build(q)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return orientOutward(g)   // ★122-d: 감김 보증은 도구가(빌더는 면을 빠짐없이 만들 뿐)
}

// ── 계단 매스(보행): 윗면 = 어귀 평지 + 단 N + 문 앞 평지(관 끝까지) · 밑면 = 사슬 −massT 램프 ──
//  ★107-2 어법: 단은 매스에 새겨진 것 — 단코가 사슬 위에 앉고 디딤이 뒤(낮은 쪽)로 수평.
export function buildAscentMass() {
  const S = ascSpec()
  const hw = S.massHW
  return quadGeo((q) => {
    // 윗면 스테이션 사슬: [s, y] 꼭짓점 나열(어귀 평지 → 톱니 → 상부 평지)
    const top = [[S.s0, S.y0], [S.sSt0, S.y0]]
    for (let i = 0; i < S.N; i++) {
      const sN = S.sSt0 + S.tread * (i + 1)         // 단코 스테이션
      top.push([sN, S.y0 + S.stepRise * i])          // 디딤 끝(수평)
      top.push([sN, S.y0 + S.stepRise * (i + 1)])    // 챌면(수직)
    }
    top.push([S.sMassEnd, S.y1])                     // 상부 평지 → 관 끝(★122-c: 나선 세계면 층계참 접합면)
    for (let i = 0; i < top.length - 1; i++) {
      const [a, ya] = top[i], [b, yb] = top[i + 1]
      if (a === b && ya === yb) continue
      //  ⚠감김: 디딤 = +y(위) · 챌면 = −x(허브쪽 = 오르는 사람 정면). 매스는 단면 재질이라
      //  오감김 = 비가시(2026.08.05 현도 적발 "계단 전면부가 안 보여" — 챌면 120면 전원 +x였음).
      //  검사 [★119-감김]이 부호 부피·챌면 방향으로 잠근다.
      q(a, ya, hw, b, yb, hw, b, yb, -hw, a, ya, -hw)
    }
    // 밑면 램프(사슬 −massT) + 옆면 2 + 앞뒤 캡
    const bot = [[S.s0, S.y0 - S.massT], [S.sSt0, S.y0 - S.massT], [S.sSt1, S.y1 - S.massT], [S.sMassEnd, S.y1 - S.massT]]
    for (let i = 0; i < bot.length - 1; i++) {
      const [a, ya] = bot[i], [b, yb] = bot[i + 1]
      q(a, ya, -hw, b, yb, -hw, b, yb, hw, a, ya, hw)             // 밑면 — 감김 = −y(바깥)
    }
    for (const sgn of [1, -1]) {                                   // 옆면: 윗사슬↔밑사슬 세로 쿼드
      const seg = 24
      for (let i = 0; i < seg; i++) {
        const a = S.s0 + (S.sMassEnd - S.s0) * (i / seg)
        const b = S.s0 + (S.sMassEnd - S.s0) * ((i + 1) / seg)
        const yaT = S.chordY(a), ybT = S.chordY(b)   // 옆면 상단 = 단코 사슬(디딤은 그 아래 — 정확히 덮임)
        const yaB = S.chordY(a) - S.massT
        const ybB = S.chordY(b) - S.massT
        if (sgn > 0) q(a, yaB, hw, b, ybB, hw, b, ybT, hw, a, yaT, hw)
        else q(b, ybB, -hw, a, yaB, -hw, a, yaT, -hw, b, ybT, -hw)
      }
    }
    q(S.s0, S.y0 - S.massT, -hw, S.s0, S.y0 - S.massT, hw, S.s0, S.y0, hw, S.s0, S.y0, -hw)          // 어귀 캡(−x)
    q(S.sMassEnd, S.y1 - S.massT, hw, S.sMassEnd, S.y1 - S.massT, -hw, S.sMassEnd, S.y1, -hw, S.sMassEnd, S.y1, hw) // 끝 캡(+x — ★122-c: 층계참 몸통 안 관입 종료)
  })
}

// ── 벽 2(수직) + 천장판: 바닥 사슬 → +clear. 시작 = RAD_WALL_R0(허브 문틀 안) · 끝 = 문틀 안(sTube1) ──
export function buildAscentWalls() {
  const S = ascSpec()
  return quadGeo((q) => {
    const seg = Math.max(6, Math.ceil((S.sWallEnd - S.sWall0) / 2))
    for (const sgn of [1, -1]) {
      const z = sgn * RAD_T_HW
      for (let i = 0; i < seg; i++) {
        const a = S.sWall0 + (S.sWallEnd - S.sWall0) * (i / seg)
        const b = S.sWall0 + (S.sWallEnd - S.sWall0) * ((i + 1) / seg)
        //  ⚠밑선 = 사슬 − 단높이: 디딤 표면은 단코 사슬 '아래'에 눕는다(뒤로 수평) — 사슬에서 시작하면
        //  챌면 뒤 슬릿(≤0.24) 누수. 내린 몫은 매스 몸통(어귀는 디스크 몸통)에 묻힌다.
        const ya = S.chordY(a) - S.stepRise, yb = S.chordY(b) - S.stepRise
        const yaT = S.chordY(a) + S.clear, ybT = S.chordY(b) + S.clear
        if (sgn > 0) q(a, ya, z, b, yb, z, b, ybT, z, a, yaT, z)
        else q(b, yb, z, a, ya, z, a, yaT, z, b, ybT, z)
      }
    }
  })
}

export function buildAscentCeiling() {
  const S = ascSpec()
  return quadGeo((q) => {
    const seg = Math.max(6, Math.ceil((S.sWallEnd - S.sWall0) / 2))
    const pts = []
    for (let i = 0; i <= seg; i++) {
      const s = S.sWall0 + (S.sWallEnd - S.sWall0) * (i / seg)
      pts.push([s, S.chordY(s) + S.clear])
    }
    for (let i = 0; i < seg; i++) {
      const [a, ya] = pts[i], [b, yb] = pts[i + 1]
      q(a, ya, -RAD_T_HW, b, yb, -RAD_T_HW, b, yb, RAD_T_HW, a, ya, RAD_T_HW)                 // 밑면(내부 천장)
      q(a, ya + 0.4, RAD_T_HW, b, yb + 0.4, RAD_T_HW, b, yb + 0.4, -RAD_T_HW, a, ya + 0.4, -RAD_T_HW) // 윗면
    }
    const [e0, ey0] = pts[0], [e1, ey1] = pts[pts.length - 1]
    q(e0, ey0, RAD_T_HW, e0, ey0, -RAD_T_HW, e0, ey0 + 0.4, -RAD_T_HW, e0, ey0 + 0.4, RAD_T_HW)
    q(e1, ey1, -RAD_T_HW, e1, ey1, RAD_T_HW, e1, ey1 + 0.4, RAD_T_HW, e1, ey1 + 0.4, -RAD_T_HW)
    for (const sgn of [1, -1]) {                                    // 판 옆면(두께 0.4)
      const z = sgn * RAD_T_HW
      for (let i = 0; i < seg; i++) {
        const [a, ya] = pts[i], [b, yb] = pts[i + 1]
        if (sgn > 0) q(a, ya, z, b, yb, z, b, yb + 0.4, z, a, ya + 0.4, z)
        else q(b, yb, z, a, ya, z, a, ya + 0.4, z, b, yb + 0.4, z)
      }
    }
  })
}

// 셸 상부 문 컷 상자 스펙(buildPetalShell이 사용 — 로컬 −x 허브면, 높이 = 컷 바닥~문 상단)
//  ★★122-d 전망 난간(현도: "참에서 전망대처럼 셸 내부를 내려다볼 수 있어"):
//  새 문 개구를 가로지르는 난간 — 문은 통과하는 문이 아니라 **조망 개구**가 된다.
//  어법 = ★118 랜딩 디스크 L자 패러핏·★75 STAIR_PARA 계열(높이 1.05 · 두께 0.4 · 문 폭).
//  위치: 셸면(sFace) 안쪽 — 문틀 잼 사이를 정확히 막는다(폭 = 문 폭, 잼 몸통에 양끝 물림).
export function buildAscentOverlook() {
  if (!RSP_ON) return quadGeo(() => {})            // 구세계(나선 없음)에서는 문이 통행로 — 난간 없음
  const S = ascSpec()
  const T = 0.4, H = 1.05
  //  ★122-g ②: 난간을 발코니 **끝**으로(구 위치 = 셸면 바로 안 → 바닥만 길어지고 난간은 뒤에 남았다)
  const s1 = S.sOvlEnd - 0.1, s0 = s1 - T          // 난간 몸통(발코니 앞코 안쪽)
  const hw = DOOR_HW + 0.25                        // 잼 몸통에 0.25씩 물림(틈 0)
  const yB = S.y1 - 0.3, yT = S.y1 + H
  return quadGeo((q) => {
    q(s0, yB, -hw, s0, yT, -hw, s0, yT, hw, s0, yB, hw)   // 안면(방 쪽)
    q(s1, yB, hw, s1, yT, hw, s1, yT, -hw, s1, yB, -hw)   // 바깥면(참 쪽)
    q(s0, yT, -hw, s1, yT, -hw, s1, yT, hw, s0, yT, hw)   // 윗면(기대는 면)
    q(s0, yB, hw, s1, yB, hw, s1, yB, -hw, s0, yB, -hw)   // 밑면
    q(s0, yB, -hw, s0, yT, -hw, s1, yT, -hw, s1, yB, -hw) // 마구리 −z
    q(s0, yB, hw, s1, yB, hw, s1, yT, hw, s0, yT, hw)     // 마구리 +z
  })
}

//  ★★122-R ① 관 어귀 접합 판(현도: 착지 디스크 ↔ 상승계단 사이에도 같은 곡률 틈):
//  디스크는 **허브 중심 원판**(원호 림), 관 매스는 **직선 폭** — ★122-Q 문지방과 같은 곡률 불일치다.
//  어귀를 덮는 판 하나로 처리한다: 윗면 = 관 바닥 레벨(단차 0) · 두께는 아래로(디스크 몸통에 묻힘) ·
//  깊이만큼 디스크 안쪽(s 감소)으로 물어 원호 림을 삼킨다. 폭은 관 매스보다 넓게(양옆 림도 삼킴).
export function buildAscentMouthSill() {
  if (!ASC_MOUTH_SILL_ON) return quadGeo(() => {})
  const S = ascSpec()
  const hw = S.massHW + 0.35                        // 관 폭보다 넓게 — 좌우 림까지 삼킨다
  const s1 = S.s0 + 0.25                            // 관 매스 몸통 안에서 끝남(슬리버 0)
  const s0 = S.s0 - ASC_MOUTH_SILL_D                // 디스크 안쪽으로 물림
  const yT = S.y0, yB = S.y0 - ASC_MOUTH_SILL_T
  return quadGeo((q) => {
    q(s0, yT, -hw, s1, yT, -hw, s1, yT, hw, s0, yT, hw)   // 윗면(밟는 면 · 디스크와 동일 레벨)
    q(s0, yB, hw, s1, yB, hw, s1, yB, -hw, s0, yB, -hw)   // 밑면
    q(s0, yB, -hw, s1, yB, -hw, s1, yT, -hw, s0, yT, -hw) // −z 옆면
    q(s0, yT, hw, s1, yT, hw, s1, yB, hw, s0, yB, hw)     // +z 옆면
    q(s0, yB, -hw, s0, yT, -hw, s0, yT, hw, s0, yB, hw)   // 어귀 캡(−x)
    q(s1, yB, hw, s1, yT, hw, s1, yT, -hw, s1, yB, -hw)   // 관 쪽 캡(+x)
  })
}

export function ascDoorCut() {
  const S = ascSpec()
  return { w: 10, h: S.doorTop - S.cutBot, d: RAD_DOOR_HW * 2, cy: (S.doorTop + S.cutBot) / 2 }
}

// ══════════════════════════════════════════════════════════════
//  ★★★121 상승 관 기둥 지지(2026.08.11 현도 결정 A) — 어법 파생은 constants ★121 주석 참조.
//  단일 유도점 규약(★118): 모든 수치가 ascColumnSpec()에서 나온다. Radial.jsx가 그리고
//  check_radial.mjs가 같은 유도를 잰다. 사본 금지.
//  로컬 프레임 = 관과 동일(+x = 방사 바깥, z = 접선). 돔은 회전체 + 중심 원점이라
//  domeY는 반경만의 함수 → 4회 회전 등형이 자동으로 성립(월드 좌표 불요).
// ══════════════════════════════════════════════════════════════
export const ascDomeY = (r) =>                       // 방 돔 해석 표면(반경 r) — domeClipY와 같은 식(회전 불변형)
  Math.max(0, ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (r / ROOM_R) ** 2)))

export function ascColumnSpec() {
  if (!RASC_SUP_ON) return []                        // 보존계: 소등이면 빈 배열(★107 SPIRAL_SUP='off' 규약)
  const S = ascSpec()
  const out = []
  //  ★107 규약 "경계에서 아래로 센다" — 셸 쪽 경계에서 허브 쪽으로. 마지막(가장 바깥) 후보가
  //  경계에 붙되, 발 제약(오큘러스·셸 내면)이 걸러낸다. 걸러진 결과가 '물리적 끝'이다.
  for (let sc = S.sFace - RASC_FOOT_PAD; sc >= S.s0; sc -= RASC_COL_GAP) {
    const yTop = S.chordY(sc) - S.massT + RASC_COL_INSET   // 상단 = 매스 밑면 관입
    const yFoot = ascDomeY(sc)                             // 발 기준면(중심 반경)
    const h = yTop - yFoot
    if (h < RASC_COL_MIN) continue                         // 어귀 = 물림 0.77이 담당(★107 발치 규약)
    const Rb = RASC_COL_RT + RASC_COL_SPREAD * h           // ★114 뿔대 파생 — 세장비 지배
    if (sc - Rb < ROOM_OCULUS_R + RASC_FOOT_PAD) continue  // 발 안끝이 오큘러스 림 밖(허공 착지 금지)
    if (sc + Rb > S.sFace - RASC_FOOT_PAD) continue        // 발 바깥끝이 꽃잎 셸 내면 안쪽
    out.push({ s: sc, yTop, yFoot, h, Rb })
  }
  out.sort((a, b) => a.s - b.s)
  return out
}

//  팔각 뿔대 1기: 위 팔각(평면 · 매스 밑면) ↔ 아래 팔각(정점별 돔 로프트 − BITE · 비평면).
//  발 착지 = 스커트 clipY 어법: 밑 정점 y를 각자의 반경에서 파생 — 경사면(끝 46.5°)을 정확히 따라 앉는다.
//  감김: 옆면 = 바깥(축에서 멀어지는 방향) · 위 캡 = +y(매스에 묻혀 비가시·위생) · 아래 캡 = −y(돔에 묻힘·위생).
export function buildAscentColumns() {
  const cols = ascColumnSpec()
  return quadGeo((q) => {
    for (const c of cols) {
      const N = 8
      const top = [], bot = []
      for (let i = 0; i < N; i++) {
        //  ⚠감김(★119 전례 재발 방지): three.js에서 +y 위에서 내려다보면 (cos,sin) 증가 순회는
        //  **시계**다 — 바깥 감김이 되려면 순회를 음으로 돈다. 검사가 부호 부피로 잠근다.
        const a = -(i + 0.5) * (Math.PI * 2 / N)           // ★107 위상 규약(면이 방사 방향을 본다) · 음 = CCW
        const tx = c.s + RASC_COL_RT * Math.cos(a), tz = RASC_COL_RT * Math.sin(a)
        const bx = c.s + c.Rb * Math.cos(a), bz = c.Rb * Math.sin(a)
        top.push([tx, c.yTop, tz])
        bot.push([bx, ascDomeY(Math.hypot(bx, bz)) - RASC_FOOT_BITE, bz])
      }
      for (let i = 0; i < N; i++) {                        // 옆면 8 — 위에서 볼 때 CCW 순회 → 바깥 감김
        const j = (i + 1) % N
        q(top[i][0], top[i][1], top[i][2], bot[i][0], bot[i][1], bot[i][2],
          bot[j][0], bot[j][1], bot[j][2], top[j][0], top[j][1], top[j][2])
      }
      for (const [ring, up] of [[top, true], [bot, false]]) {  // 캡 = 쿼드 3장(0123·0345·0567)
        for (const [a, b, d] of [[0, 1, 3], [0, 3, 5], [0, 5, 7]]) {
          const quad = up ? [ring[a], ring[b], ring[b + 1], ring[d]] : [ring[d], ring[b + 1], ring[b], ring[a]]
          q(quad[0][0], quad[0][1], quad[0][2], quad[1][0], quad[1][1], quad[1][2],
            quad[2][0], quad[2][1], quad[2][2], quad[3][0], quad[3][1], quad[3][2])
        }
      }
    }
  })
}
