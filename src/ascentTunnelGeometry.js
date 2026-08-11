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
} from './constants.js'

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
  const sSt1 = sFace - RAD_ASC_LAND1                // 마지막 단코(문 앞 평지 시작)
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

  // 바닥 사슬 폴리라인(단코 기준선): 어귀 평지 → 경사 → 문 앞 평지(관 끝까지)
  const chordY = (s) => s <= sSt0 ? y0 : s >= sSt1 ? y1 : y0 + rise * (s - sSt0) / runSt
  return {
    y0, y1, rise, clear, s0, sWall0, sFace, sSt0, sSt1, runSt, N, stepRise, tread, slopeDeg,
    cutBot, doorTop, ceilTop, linTop, frOut, frBack, frFront, frD, frC, sTube1, chordY,
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
  g.setIndex(idx); g.computeVertexNormals()
  return g
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
    top.push([S.sTube1, S.y1])                       // 상부 평지 → 관 끝
    for (let i = 0; i < top.length - 1; i++) {
      const [a, ya] = top[i], [b, yb] = top[i + 1]
      if (a === b && ya === yb) continue
      //  ⚠감김: 디딤 = +y(위) · 챌면 = −x(허브쪽 = 오르는 사람 정면). 매스는 단면 재질이라
      //  오감김 = 비가시(2026.08.05 현도 적발 "계단 전면부가 안 보여" — 챌면 120면 전원 +x였음).
      //  검사 [★119-감김]이 부호 부피·챌면 방향으로 잠근다.
      q(a, ya, hw, b, yb, hw, b, yb, -hw, a, ya, -hw)
    }
    // 밑면 램프(사슬 −massT) + 옆면 2 + 앞뒤 캡
    const bot = [[S.s0, S.y0 - S.massT], [S.sSt0, S.y0 - S.massT], [S.sSt1, S.y1 - S.massT], [S.sTube1, S.y1 - S.massT]]
    for (let i = 0; i < bot.length - 1; i++) {
      const [a, ya] = bot[i], [b, yb] = bot[i + 1]
      q(a, ya, -hw, b, yb, -hw, b, yb, hw, a, ya, hw)             // 밑면 — 감김 = −y(바깥)
    }
    for (const sgn of [1, -1]) {                                   // 옆면: 윗사슬↔밑사슬 세로 쿼드
      const seg = 24
      for (let i = 0; i < seg; i++) {
        const a = S.s0 + (S.sTube1 - S.s0) * (i / seg)
        const b = S.s0 + (S.sTube1 - S.s0) * ((i + 1) / seg)
        const yaT = S.chordY(a), ybT = S.chordY(b)   // 옆면 상단 = 단코 사슬(디딤은 그 아래 — 정확히 덮임)
        const yaB = S.chordY(a) - S.massT
        const ybB = S.chordY(b) - S.massT
        if (sgn > 0) q(a, yaB, hw, b, ybB, hw, b, ybT, hw, a, yaT, hw)
        else q(b, ybB, -hw, a, yaB, -hw, a, yaT, -hw, b, ybT, -hw)
      }
    }
    q(S.s0, S.y0 - S.massT, -hw, S.s0, S.y0 - S.massT, hw, S.s0, S.y0, hw, S.s0, S.y0, -hw)          // 어귀 캡(−x)
    q(S.sTube1, S.y1 - S.massT, hw, S.sTube1, S.y1 - S.massT, -hw, S.sTube1, S.y1, -hw, S.sTube1, S.y1, hw) // 끝 캡(+x, 문틀 안)
  })
}

// ── 벽 2(수직) + 천장판: 바닥 사슬 → +clear. 시작 = RAD_WALL_R0(허브 문틀 안) · 끝 = 문틀 안(sTube1) ──
export function buildAscentWalls() {
  const S = ascSpec()
  return quadGeo((q) => {
    const seg = Math.max(6, Math.ceil((S.sTube1 - S.sWall0) / 2))
    for (const sgn of [1, -1]) {
      const z = sgn * RAD_T_HW
      for (let i = 0; i < seg; i++) {
        const a = S.sWall0 + (S.sTube1 - S.sWall0) * (i / seg)
        const b = S.sWall0 + (S.sTube1 - S.sWall0) * ((i + 1) / seg)
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
    const seg = Math.max(6, Math.ceil((S.sTube1 - S.sWall0) / 2))
    const pts = []
    for (let i = 0; i <= seg; i++) {
      const s = S.sWall0 + (S.sTube1 - S.sWall0) * (i / seg)
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
export function ascDoorCut() {
  const S = ascSpec()
  return { w: 10, h: S.doorTop - S.cutBot, d: RAD_DOOR_HW * 2, cy: (S.doorTop + S.cutBot) / 2 }
}
