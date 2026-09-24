// check_lamps.mjs — 1p10 등불(CloisterLamps) 기하 의미 검증 (2026.07.11, v2: 두 체제 + 하강 램프)
//  실행: node src/check_lamps.mjs   (repo 루트에서)
//  패턴: 소스 모듈 직접 import(번들 아님) — check_radial.mjs와 동일.
//  v2: CL_ROOF 상향(관입 체제) 대응 — 지붕 위 노출 검사를 두 체제로, 리브 관입의 보행 무침범 신설,
//      하강 램프(Y0→Y1)·갓/관 비례(≥2.1) 검사 신설.
import {
  rOf, H, SHELL_RIB_R, MERIDIANS, R_TOP,
  CL_R, CL_HW, CL_ROOF, CL_SILL, CL_HEAD, CL_PHI0, CL_PHI1, ST_ON, ST_PHI, ST_HW, PASS_FLOOR_Y,
  LAMP_RIBS, LAMP_R, LAMP_TUBE_R, LAMP_ENTRY_Y, LAMP_TOP_Y,
  LAMP_MOUTH_Y0, LAMP_MOUTH_Y1, LAMP_FUNNEL_H, LAMP_MOUTH_R, LAMP_POOL_R,
  CL_ROOF_Y, CL_FLOOR_END, clLandingY,   // ★78-2 계단 바닥
} from './constants.js'

let n = 0, fail = 0
const ok = (cond, msg) => { n++; if (!cond) { fail++; console.error(`  ✗ [${n}] ${msg}`) } else console.log(`  ✓ [${n}] ${msg}`) }

//  ★78-2: 바닥이 계단으로 내려가므로 '바닥' 하나로 못 쓴다. 지붕은 절대 고정(CL_ROOF_Y),
//   등불별 바닥은 제 층계참(clLandingY). 헤드룸·갓 검사는 **가장 불리한 쪽**(첫 층계참 = 가장 높은 바닥)으로 잰다.
const floor = PASS_FLOOR_Y, roofTop = CL_ROOF_Y
const rIn = CL_R - CL_HW, rOut = CL_R + CL_HW

// 리브 중심선까지 최단거리 — 리브 로컬 평면(반경 r, 높이 y). 모든 리브 동형(LOCKED).
function distToCenterline(pr, py) {
  let best = 1e9
  for (let i = 0; i <= 6000; i++) {
    const u = (i / 6000) * 0.5
    const d = Math.hypot(rOf(u) - pr, H * u - py)
    if (d < best) best = d
  }
  return best
}
// 3D: 점(월드) → 리브 k 중심선 최단거리 (이웃 리브 검사용)
function dist3(px, py, pz, phiK) {
  let b = 1e9
  for (let i = 0; i <= 3000; i++) {
    const u = i / 3000 * 0.45
    const r = rOf(u), y = H * u
    const d = Math.hypot(px - r * Math.cos(phiK), py - y, pz - r * Math.sin(phiK))
    if (d < b) b = d
  }
  return b
}

console.log('— A. 관↔리브 관계 (리브 로컬 1회 검증) —')
// [1] 진입고 재도출
let yEntry = null
for (let y = Math.min(roofTop, LAMP_ENTRY_Y - 6); y < 400; y += 0.005) {
  if (distToCenterline(LAMP_R, y) <= SHELL_RIB_R) { yEntry = y; break }
}
ok(yEntry !== null && Math.abs(yEntry - LAMP_ENTRY_Y) < 0.15,
  `진입고 스캔 ${yEntry?.toFixed(2)} ≈ LAMP_ENTRY_Y(${LAMP_ENTRY_Y}) (오차<0.15)`)
// [2] ★두 체제: (a) 지붕 위 노출 체제(노출>3, 테라스 뷰) 또는 (b) 실내 진입 체제(지붕이 진입고보다 1.5+ 위)
const expo = LAMP_ENTRY_Y - roofTop
const regime = expo > 3 ? 'a(지붕 위 노출)' : (roofTop - LAMP_ENTRY_Y > 1.5 ? 'b(실내 진입)' : null)
ok(regime !== null, `체제 판정 = ${regime ?? '모호(노출 ' + expo.toFixed(1) + ' — 지붕고 재조정 필요)'} — 지붕 상면 ${roofTop.toFixed(2)}, 진입고 ${LAMP_ENTRY_Y}`)
// [3] 진입 후 영구 잔류(보어 안)
let stays = true
for (let y = yEntry + 0.25; y < LAMP_TOP_Y + 30; y += 0.25)
  if (distToCenterline(LAMP_R, y) > SHELL_RIB_R) { stays = false; break }
ok(stays, `진입(${yEntry.toFixed(1)}) 후 관은 보어 내 잔류 (캡 ${LAMP_TOP_Y}+30까지)`)
// [4] 캡이 진입고보다 충분히 위(관통이 분명히 읽힘 + 캡 불가시)
ok(LAMP_TOP_Y > yEntry + 1.0, `캡(${LAMP_TOP_Y}) > 진입고+1.0`)
// [5] 관이 보어를 벗어나지 않음(해석적 근거)
ok(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R < SHELL_RIB_R,
  `|LAMP_R−R_TOP|+관굵기 = ${(Math.abs(LAMP_R - R_TOP) + LAMP_TUBE_R).toFixed(2)} < 보어 반경 ${SHELL_RIB_R}`)

console.log('— B. 관입 체제(현행 CL_ROOF=' + CL_ROOF + ') 보행·개구 안전 —')
// [6] 리브 밑면의 실내 최저 진입 y — 보행 헤드룸(바닥 위 ≥4.5) 확보
let yLow = 1e9
if (roofTop > 259) {  // 관입 체제에서만 의미
  for (const k of LAMP_RIBS) {
    const phiK = (k / MERIDIANS) * Math.PI * 2
    for (let y = 250; y < roofTop; y += 0.1) {
      let hit = false
      for (let r = rIn; r <= rOut + 0.01; r += 0.65)
        if (dist3(r * Math.cos(phiK), y, r * Math.sin(phiK), phiK) <= SHELL_RIB_R) { hit = true; break }
      if (hit) { if (y < yLow) yLow = y; break }
    }
  }
  //  ★78-2: 등불 k의 국소 바닥은 제 층계참 — 리브 진입고는 절대치라 뒤로 갈수록 헤드룸이 커진다.
  //   최악은 첫 층계참(가장 높은 바닥)이므로 그것으로 잰다.
  ok(yLow - floor >= 4.5, `리브 실내 최저 진입 = 첫 층계참 위 ${(yLow - floor).toFixed(1)} ≥ 4.5 (보행 무침범)`)
  ok(yLow - clLandingY(LAMP_RIBS.length - 1) >= 4.5,
    `마지막 층계참 기준 헤드룸 ${(yLow - clLandingY(LAMP_RIBS.length - 1)).toFixed(1)} (바닥이 ${(floor - CL_FLOOR_END).toFixed(1)} 내려가 여유가 커진다)`)
} else ok(true, '비관입 체제(지붕 ≤ 259) — 실내 진입 없음')
// [7] 개구 띠(SILL~HEAD) 리브 무접촉 — 1p9 누적 문법 보존
let openClean = true
for (const k of LAMP_RIBS) {
  const phiK = (k / MERIDIANS) * Math.PI * 2
  for (let y = floor + CL_SILL; y <= floor + CL_HEAD; y += 0.3)
    if (dist3(rOut * Math.cos(phiK), y, rOut * Math.sin(phiK), phiK) <= SHELL_RIB_R) { openClean = false; break }
}
ok(openClean, `개구 띠(${CL_SILL}~${CL_HEAD}) 리브 무접촉`)

console.log('— C. 대상 리브 선정 —')
// [8] LAMP_RIBS 각 φ가 회랑 호 안
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi > CL_PHI0 && phi < CL_PHI1,
    `#${k}(φ=${(phi * 180 / Math.PI).toFixed(1)}°)가 회랑 호(${(CL_PHI0 * 180 / Math.PI).toFixed(1)}~${(CL_PHI1 * 180 / Math.PI).toFixed(1)}°) 안`)
}
// [9] #0(탐험 리브) 제외 — 1p8 보어 시야 보호
ok(!LAMP_RIBS.includes(0), '#0(탐험 리브) 제외 — 보어 내 잔류 관이 1p8 전망 시야를 오염시키므로')
// [10] 관의 반경 위치가 회랑 폭 안
ok(LAMP_R > rIn && LAMP_R < rOut, `LAMP_R(${LAMP_R})이 회랑 폭(${rIn}~${rOut}) 안`)

console.log('— D. 하강 램프·갓 비례·회랑 내부 치수 —')
// [11] 하강 방향(걷는 방향으로 내려옴) + 마지막 등불 보행 헤드룸
ok(LAMP_MOUTH_Y0 >= LAMP_MOUTH_Y1, `하강 램프 Y0(${LAMP_MOUTH_Y0}) ≥ Y1(${LAMP_MOUTH_Y1})`)
ok(LAMP_MOUTH_Y1 >= 2.1, `마지막 갓 입 ${LAMP_MOUTH_Y1} ≥ 2.1 (머리 위 통과) — 몸 높이 하강은 별도 결정`)
// [13] 첫 등불(가장 높음)의 갓 목이 천장 아래 + 관 구간이 남아 있음(목 < 진입고)
ok(floor + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H < roofTop - 0.5, `첫 갓 목(${(LAMP_MOUTH_Y0 + LAMP_FUNNEL_H).toFixed(1)}) < 천장 ${CL_ROOF}−0.5`)
ok(floor + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H < LAMP_ENTRY_Y - 2, `첫 갓 목 < 진입고−2 (관이 잘려 보이지 않게)`)
// [15] 갓 두 모드(★2026.07.11 갓 유무 = 열린 결정): 봉 모드(MOUTH_R≈TUBE_R, 갓 없음 — 원통 퇴화)
//      또는 깔때기 모드(비례 ≥2.1). 그 사이(1.05~2.1배) = 어정쩡한 플랜지 — 실패
const ratio = LAMP_MOUTH_R / LAMP_TUBE_R
ok(ratio <= 1.05 || ratio >= 2.1,
  `갓 모드 = ${ratio <= 1.05 ? '봉(갓 없음)' : '깔때기'} — 비례 ${ratio.toFixed(2)} (1.05~2.1 사이 금지)`)
// [16] 갓 지름이 통로에서 통행 시각 여유(≥0.8) 확보
ok(2 * LAMP_MOUTH_R <= 2 * CL_HW - 0.8, `갓 지름 ${(2 * LAMP_MOUTH_R).toFixed(2)} ≤ 통로 폭−0.8 (${(2 * CL_HW - 0.8).toFixed(1)})`)
// [17] 웅덩이가 통로 폭 안
ok(LAMP_POOL_R < CL_HW, `웅덩이 반지름 ${LAMP_POOL_R} < 반폭 ${CL_HW}`)

console.log('— E. 스텁(1p11 진입) 무간섭 —')
const mPhi = ST_HW / rIn
for (const k of LAMP_RIBS) {
  const phi = (k / MERIDIANS) * Math.PI * 2
  ok(phi < ST_PHI - mPhi || phi > ST_PHI + mPhi,
    `#${k}(${(phi * 180 / Math.PI).toFixed(1)}°) ∉ 스텁 입(${((ST_PHI - mPhi) * 180 / Math.PI).toFixed(2)}~${((ST_PHI + mPhi) * 180 / Math.PI).toFixed(2)}°)`)
}

// ── ★★★221 뿌리 목(2026.09.14) — 리브 밑면 → 관 수렴 셸. 등불 9기 공통 기하(로컬 프레임 동일) ──
console.log('— F. ★221 뿌리 목 —')
{
  const K = await import('./constants.js')
  const { buildLampRoot, lampRootSpec } = await import('./lampRootGeometry.js')
  if (!K.LR_ON) ok(buildLampRoot() === null, '⏸ ★221 보존계(LR_ON=false) — 뿌리 목 미생성 · 관만 꽂힌다')
  else {
    const S = lampRootSpec(), g = buildLampRoot(), P = g.attributes.position
    ok(S.tops.every(t => t !== null), `★221 모선 ${S.tops.length}개 전부 리브 밑면을 찾았다(반경 ${S.r0.toFixed(2)} 원 위)`)
    //  위끝은 전부 리브 살 속(LR_LAP만큼 박힘) — 틈 봉인(규율 6)
    let inside = 0
    for (let i = 0; i < S.tops.length; i++) {
      const th = i / S.tops.length * Math.PI * 2, px = LAMP_R + Math.cos(th) * S.r0, pz = Math.sin(th) * S.r0
      if (distToCenterline3(px, S.tops[i] + K.LR_LAP, pz) < SHELL_RIB_R - 0.05) inside++
    }
    ok(inside === S.tops.length, `★221 모선 위끝 ${inside}/${S.tops.length} 리브 살 속(중심선 거리 < ${SHELL_RIB_R}−0.05)`)
    const tMin = Math.min(...S.tops), tMax = Math.max(...S.tops)
    ok(tMax - tMin > 3, `★221 긴 꼬리 = 기하에서 나온다: 밑면 높이 편차 ${(tMax - tMin).toFixed(2)}m(안쪽 r<${LAMP_R} 높음 ${tMax.toFixed(1)} / 바깥 낮음 ${tMin.toFixed(1)}) — 현도 "비대칭 의도"`)
    ok(tMax + K.LR_LAP < roofTop - 0.3, `★221 셸 최고점 ${(tMax + K.LR_LAP).toFixed(2)} < 회랑 지붕 ${roofTop.toFixed(2)}−0.3 — 지붕을 안 뚫는다`)
    //  아래끝 = 관 밖 여유 · 가장 짧은 관(등불 #1 · 첫 층계참)의 갓 목보다 위
    const neck1 = clLandingY(0) + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H
    ok(S.yEnd > neck1 + 0.3, `★221 목 끝 ${S.yEnd.toFixed(2)} > 등불#1 갓 목 ${neck1.toFixed(2)}+0.3 — 가장 짧은 관에서도 맨 관이 ${(S.yEnd - neck1).toFixed(2)}m 보인다 ⚠판정 대상`)
    ok(Math.abs(S.rEnd - (LAMP_TUBE_R + K.LR_FUSE)) < 1e-9 && K.LR_FUSE > 0, `★221 목 끝 반경 ${S.rEnd} = 관 ${LAMP_TUBE_R} + ${K.LR_FUSE}(공면 회피)`)
    ok(S.r0 < CL_HW - 0.2, `★221 목 시작 반경 ${S.r0.toFixed(2)} < 회랑 반폭 ${CL_HW}−0.2 — 벽에 안 닿는다`)
    let v = 0
    for (let i = 0; i < P.count; i += 3) {
      const a = [P.getX(i), P.getY(i), P.getZ(i)], b = [P.getX(i + 1), P.getY(i + 1), P.getZ(i + 1)], c = [P.getX(i + 2), P.getY(i + 2), P.getZ(i + 2)]
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    }
    ok(v > 0, `★221 부호부피 +${v.toFixed(1)} — 감김 바깥 향함`)
    const Nn = g.attributes.normal; let bad = 0
    for (let k = 0; k < K.LR_SEG * 16 * 6; k++) { const x = P.getX(k), z = P.getZ(k); if (Nn.getX(k) * x + Nn.getZ(k) * z < 0) bad++ }
    ok(bad === 0, `★221 셸 법선 안쪽 향함 0 (${K.LR_SEG * 16 * 6}개 중)`)
    //  ★221-b 등불 방(1p10) 중앙 등불에도 같은 기하: 로컬 프레임 동일 조건(방 축 반경 = LAMP_R · 관 진입고 공통)을 잠근다
    ok(Math.abs(K.RM10_AX_R - LAMP_R) < 1e-9, `★221-b 등불 방 축 반경 ${K.RM10_AX_R} = LAMP_R — 리브 #${K.RM10_K} 밑면 기하가 회랑 등불과 동일`)
    //  ★221-c 방 전용 배율 스펙(현도 09.18 "너무 작게 읽혀 — 따로 늘려라")
    const R = lampRootSpec(K.LR_RM10_R0K, K.LR_RM10_LENK), gR = buildLampRoot(K.LR_RM10_R0K, K.LR_RM10_LENK)
    ok(R.tops.every(t => t !== null) && gR.attributes.position.count > 0, `★221-c 등불 방 목(반경 ${R.r0.toFixed(2)} · 끝 ${R.yEnd.toFixed(1)}) 모선 ${R.tops.length}개 전부 리브 밑면 확보`)
    ok(R.r0 >= S.r0 - 1e-9 && R.yEnd < S.yEnd, `★221-c 방 목: 반경 ${R.r0.toFixed(2)}(회랑 ${S.r0.toFixed(2)}) · 길이 ${(LAMP_ENTRY_Y - R.yEnd).toFixed(1)} > 회랑 ${(LAMP_ENTRY_Y - S.yEnd).toFixed(1)} — ★221-d 튜너 확정값(현도 09.18)`)
    ok(R.r0 < K.RM10_RHO - 1.0, `★221-c 방 목 반경 ${R.r0.toFixed(2)} < 방 반지름 ${K.RM10_RHO}−1`)
    let insR = 0
    for (let i = 0; i < R.tops.length; i++) { const th = i / R.tops.length * Math.PI * 2; if (distToCenterline3(LAMP_R + Math.cos(th) * R.r0, R.tops[i] + K.LR_LAP, Math.sin(th) * R.r0) < SHELL_RIB_R - 0.05) insR++ }
    ok(insR === R.tops.length, `★221-c 방 목 위끝 ${insR}/${R.tops.length} 리브 살 속`)
    const neckRm = K.RM10_CENTER_Y + LAMP_MOUTH_Y1 + LAMP_FUNNEL_H
    ok(R.yEnd > neckRm + 0.2, `★221-c 목 끝 ${R.yEnd.toFixed(2)} > 등불 방 갓 목 ${neckRm.toFixed(2)}+0.2 — 목이 갓에 닿지 않는다(여유 ${(R.yEnd - neckRm).toFixed(2)}m)`)
    ok(Math.max(...R.tops) + K.LR_LAP < K.RM10_ROOF_Y, `★221-c 셸 최고점 ${(Math.max(...R.tops) + K.LR_LAP).toFixed(2)} < 등불 방 천장 ${K.RM10_ROOF_Y}`)
  }
}
function distToCenterline3(pr, py, pz) {
  let best = 1e9
  for (let i = 0; i <= 3000; i++) { const u = i / 3000 * 0.5; const d = Math.hypot(rOf(u) - pr, H * u - py, pz); if (d < best) best = d }
  return best
}


// ── ★★★224 등불 = 도관 (2026.09.20 현도 "리브의 빛이 관을 통해 닿는다 — 올려다볼 수 있게") ──
//  ① 관 셸(살 = 리브 벽 두께 승계) ② 입 개방(발광면 게이트) ③ 리브 껍질 구멍 9기 — **실제 CSG 메시에 광선**을 쏴 잰다(규율 18).
//  봉인 = 관 상단이 구멍 안 껍질 최고점보다 위(관이 마개) · 불가시 = 구멍이 회랑 실내 포락(벽 사이·천장 아래) 안.
{
  console.log('— ★224. 등불 = 도관 (관 셸 · 입 개방 · 리브 껍질 구멍) —')
  const THREE = await import('three')
  const K = await import('./constants.js')
  const { buildLampRib, lampHoleSolid } = await import('./lampRootGeometry.js')
  const { buildRibShell, makeRibCurve } = await import('./ribGeometry.js')
  const src = (await import('node:fs')).readFileSync(new URL('./Dome.jsx', import.meta.url), 'utf8')
  if (!K.LAMP_CONDUIT_ON) {
    ok(true, '★224 소등(LAMP_CONDUIT_ON=false) — 구 체제(속 찬 봉·입 발광면·리브 무결) 검사 생략')
  } else {
    ok(Math.abs(K.LAMP_TUBE_T - K.RIB_WALL_T) < 1e-12 && K.LAMP_TUBE_T > 0 && K.LAMP_TUBE_T < LAMP_TUBE_R,
      `★224 관 살 ${K.LAMP_TUBE_T} = RIB_WALL_T 승계 · 안반경 ${(LAMP_TUBE_R - K.LAMP_TUBE_T).toFixed(2)} > 0`)
    ok(Math.abs(K.LAMP_HOLE_CLR - K.RIB_HOLE_CLR) < 1e-12 && Math.abs(K.LAMP_HOLE_Y1 - LAMP_TOP_Y) < 1e-12,
      `★224 구멍 여유 ${K.LAMP_HOLE_CLR} = RIB_HOLE_CLR 승계 · 자르개 상한 = 관 상단 항등(${LAMP_TOP_Y})`)
    const expect = [...LAMP_RIBS, K.RM10_K].map(k => k + (K.RIB_XFER_ON ? K.RIB_DEST_K : 0))   // ★224-b 등불 방 포함
    ok(K.LAMP_WORLD_KS.length === expect.length && K.LAMP_WORLD_KS.every((k, i) => k === expect[i]),
      `★224 월드 리브 [${K.LAMP_WORLD_KS.join(',')}] = 등불 k + ${K.RIB_XFER_ON ? K.RIB_DEST_K : 0} + 등불 방 #${K.RM10_K + (K.RIB_XFER_ON ? K.RIB_DEST_K : 0)} (LampRoom 규약 재유도)`)
    const hallKs = new Set([0, 1, 2, MERIDIANS - 1, MERIDIANS - 2]), rm10 = K.RM10_K + (K.RIB_XFER_ON ? K.RIB_DEST_K : 0)
    ok(K.LAMP_WORLD_KS.every(k => !hallKs.has(k)) && K.LAMP_WORLD_KS.filter(k => k === rm10).length === 1 && new Set(K.LAMP_WORLD_KS).size === K.LAMP_WORLD_KS.length,
      `★224 등불 리브가 홀 다섯(#0·±1·±2)과 겹치지 않음 · 등불 방 리브 #${rm10} 정확히 1회 · 중복 0 — 인스턴스 회계 무충돌`)
    ok(72 - 1 - 4 - K.LAMP_WORLD_KS.length + K.LAMP_WORLD_KS.length + 4 + 1 === MERIDIANS,
      `★224 리브 총수 불변: DomeRibs ${72 - 5 - K.LAMP_WORLD_KS.length} + LampRibs ${K.LAMP_WORLD_KS.length} + 홀 4 + 탐험 1 = ${MERIDIANS}`)
    // 실기하 광선(구멍 존재 · 밖 무손상 · 마개)
    const cut = buildLampRib(), base = buildRibShell(makeRibCurve(), 0).geometry
    const mk = g => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    const mc = mk(cut), mb = mk(base), rc = new THREE.Raycaster()
    const ys = (m, x, z) => { rc.set(new THREE.Vector3(x, LAMP_ENTRY_Y - 25, z), new THREE.Vector3(0, 1, 0)); rc.far = 60; return rc.intersectObject(m).map(h => +h.point.y.toFixed(3)) }
    const rH = LAMP_TUBE_R + K.LAMP_HOLE_CLR
    let inHit = 0, inN = 0, outDiff = 0, outN = 0, skinMax = -1e9, skinMin = 1e9
    for (let a = 0; a < 360; a += 10) for (const rr of [0, 0.25, 0.5, rH - 0.02, rH + 0.05, rH + 0.3, 1.5]) {
      const x = LAMP_R + rr * Math.cos(a * Math.PI / 180), z = rr * Math.sin(a * Math.PI / 180)
      const yc = ys(mc, x, z), yb = ys(mb, x, z)
      if (rr < rH) { inN++; if (yc.length) inHit++; if (yb.length) { skinMax = Math.max(skinMax, yb[0]); skinMin = Math.min(skinMin, yb[0]) } }
      else { outN++; if (yc.join() !== yb.join()) outDiff++ }
    }
    ok(inHit === 0 && inN > 0, `★224 구멍 존재: 관 단면 안 광선 ${inN}발 중 껍질 피격 ${inHit} (구 껍질은 ${skinMin.toFixed(2)}~${skinMax.toFixed(2)})`)
    ok(outDiff === 0, `★224 구멍 밖 무손상: 반경 ${rH.toFixed(2)} 밖 ${outN}발 전/후 동일(차이 ${outDiff})`)
    ok(skinMax < LAMP_TOP_Y - 0.1 && skinMin > K.LAMP_HOLE_Y0 + 0.1,
      `★224 마개: 구멍 안 껍질 최고 ${skinMax.toFixed(2)} < 관 상단 ${LAMP_TOP_Y}(여유 ${(LAMP_TOP_Y - skinMax).toFixed(2)}) · 최저 ${skinMin.toFixed(2)} > 자르개 하한 ${K.LAMP_HOLE_Y0}`)
    // 불가시: 구멍(관 단면 × 껍질 y대역)이 회랑 실내 포락 안
    ok(LAMP_R - rH > rIn && LAMP_R + rH < rOut && skinMin > PASS_FLOOR_Y && skinMax < roofTop,
      `★224 불가시: 구멍 r ${(LAMP_R - rH).toFixed(2)}~${(LAMP_R + rH).toFixed(2)} ⊂ 벽 사이(${rIn}~${rOut}) · y ${skinMin.toFixed(1)}~${skinMax.toFixed(1)} ⊂ 바닥~천장(${floor.toFixed(1)}~${roofTop.toFixed(1)}) — 밖에서 안 보인다(LOCKED 예외 #4 형식)`)
    //  ★224-b 등불 방(09.24): 같은 구멍 기하(축 반경 = LAMP_R · 진입고 공통 — [★221-b]에서 잠김)가 방 실내에 있는가 — 방 벽 반지름 안 · 천장 아래 · 관 상단도 천장 아래
    ok(rH < K.RM10_RHO - 1 && skinMax < K.RM10_ROOF_Y && LAMP_TOP_Y < K.RM10_ROOF_Y && skinMin > K.RM10_CENTER_Y,
      `★224-b 등불 방 구멍: 반경 ${rH.toFixed(2)} < 방 반지름 ${K.RM10_RHO}−1 · y ${skinMin.toFixed(1)}~${skinMax.toFixed(1)} · 관 상단 ${LAMP_TOP_Y} < 방 천장 ${K.RM10_ROOF_Y} — 방 실내(불가시)`)
    ok(/\{!LAMP_CONDUIT_ON && \(\s*<mesh position=\{\[0, RM10_CENTER_Y \+ LAMP_MOUTH_Y1 \+ 0\.02, 0\]\}/.test(src), '★224-b 배선: 등불 방 갓 입 발광면 = 구 체제에서만(입 개방)')
    // 소스 지문
    ok(/LatheGeometry/.test(src) && /LAMP_CONDUIT_ON\s*\?/.test(src), '★224 배선: LampRod = 회전체 셸(LatheGeometry) · 체제 삼항')
    ok(/\{!LAMP_CONDUIT_ON && \(\s*<mesh position=\{\[0, mouthY \+ 0\.02, 0\]\}/.test(src), '★224 배선: 회랑 갓 입 발광면 = 구 체제에서만(입 개방)')
    ok(/export function LampRibs/.test(src) && /LAMP_SKIP\.has\(i\)/.test(src), '★224 배선: LampRibs 신설 · DomeRibs 인스턴스에서 등불 리브 제외')
    ok(!(await import('node:fs')).existsSync(new URL('./LampRootTuner.jsx', import.meta.url)) && !/<LampRootTuned|lampRootTune\./.test(src),
      '★224 튜너 철거: LampRootTuner.jsx 없음 · Dome에 구독판 잔재 0(현도 09.20 "철거")')
  }
}


// ── ★★★225 등불 빛기둥 (2026.09.24 현도 "원뿔 형태로 퍼져나가는 · 은은히") ──
//  파생 잠금(색 = 하향 점광 · 발 = 웅덩이 · 깃털 = ★190) · 등불마다 원뿔대 스펙(높이>0 · 반각 파생) · 셰이더 사본 동기(Room.jsx 핵심 3줄 일치).
{
  console.log('— ★225. 등불 빛기둥 (원뿔대 볼륨 · 첨탑 셰이더 사본) —')
  const K = await import('./constants.js')
  const { lampBeamSpec, buildLampBeam, lampBeamMaterial } = await import('./lampBeam.js')
  const fs = await import('node:fs')
  const src = fs.readFileSync(new URL('./Dome.jsx', import.meta.url), 'utf8'), room = fs.readFileSync(new URL('./Room.jsx', import.meta.url), 'utf8'), beam = fs.readFileSync(new URL('./lampBeam.js', import.meta.url), 'utf8')
  if (!K.LB_ON) {
    ok(true, '★225 소등(LB_ON=false) — 빛기둥 없음 · 검사 생략')
  } else {
    ok(K.LB_COL === K.LAMP_LGT_MOUTH_COL && Math.abs(K.LB_FOOT_R - LAMP_POOL_R) < 1e-12 && Math.abs(K.LB_TOP_FADE - K.SHAFT_TOP_FADE) < 1e-12,
      `★225 파생: 색 = 하향 점광(${K.LB_COL}) · 발 반경 = 웅덩이(${K.LB_FOOT_R}) · 상단 깃털 = ★190(${K.LB_TOP_FADE})`)
    ok(K.LB_OP > 0 && K.LB_OP <= K.RM_SHAFT_OP, `★225 세기 ${K.LB_OP.toFixed(3)} ≤ 첨탑 빛기둥 ${K.RM_SHAFT_OP} — "은은히"(Claude 초기값 · 현도 판정 노브)`)
    const n = LAMP_RIBS.length, specs = LAMP_RIBS.map((k, i) => { const f = clLandingY(i); const m = f + LAMP_MOUTH_Y0 + (LAMP_MOUTH_Y1 - LAMP_MOUTH_Y0) * (n > 1 ? i / (n - 1) : 0); return lampBeamSpec(m, f) })
    ok(specs.every(S => S.h > 0 && S.rBot > S.rTop && Math.abs(S.rTop - LAMP_MOUTH_R) < 1e-12),
      `★225 회랑 ${n}기 원뿔대: 높이 ${specs[0].h.toFixed(1)}→${specs[n - 1].h.toFixed(1)} · 반각 ${specs[0].halfDeg.toFixed(1)}°→${specs[n - 1].halfDeg.toFixed(1)}° (위 = 갓 입 ${LAMP_MOUTH_R} · 아래 = 발 ${K.LB_FOOT_R})`)
    const R = lampBeamSpec(K.RM10_CENTER_Y + LAMP_MOUTH_Y1, K.RM10_CENTER_Y)
    ok(R.h > 0 && K.LB_FOOT_R < K.RM10_RHO - 1, `★225 등불 방 원뿔대: 높이 ${R.h.toFixed(1)} · 반각 ${R.halfDeg.toFixed(1)}° · 발 ${K.LB_FOOT_R} < 방 반지름 ${K.RM10_RHO}−1`)
    const g = buildLampBeam(specs[0].cy + specs[0].h / 2, specs[0].cy - specs[0].h / 2)
    ok(g && g.attributes.uv && g.attributes.position.count > 0, `★225 기하 생성(정점 ${g?.attributes.position.count}) · uv 보유(세로 페이드 재료)`)
    const m = lampBeamMaterial()
    ok(m.blending === (K.LB_BLEND === 'additive' ? 2 : 1) && m.transparent && !m.depthWrite && m.uniforms.uAxial.value === (K.SHAFT_EDGE_AXIAL ? 1 : 0),
      `★225 재질: ${K.LB_BLEND === 'additive' ? 'additive(첨탑 어법)' : 'normal 포화 합성(★225-c — 겹침 상한 = 빛기둥 색)'} · 무깊이쓰기 · ★189 축 실루엣 승계`)
    //  사본 동기 — Room.jsx 첨탑 셰이더의 핵심 3줄이 사본에 그대로 있는가(Room이 바뀌면 여기가 운다 = 사본 규율의 신호)
    const core = ['float facing = abs(dot(nrm, normalize(vV)));', 'float len = smoothstep(0.0, 0.18, vY) * (0.30 + 0.70 * vY) * top;']
    ok(core.every(l => room.includes(l) && beam.includes(l)) && room.includes('float edge = pow(facing, 1.6);') && beam.includes('float edge = pow(facing, uEdgePow);'),
      '★225 셰이더 사본 동기: Room.jsx 핵심 2줄(facing·len) = lampBeam.js · edge 줄만 노브(uEdgePow)로 갈라짐(★225-b)')
    const { lampBeamColor } = await import('./lampBeam.js'); const c = lampBeamColor(), c0 = new (await import('three')).Color(K.LB_COL)
    ok(K.LB_EDGE_POW > 1.6 && m.uniforms.uEdgePow.value === K.LB_EDGE_POW && K.LB_DESAT > 0 && K.LB_DESAT < 1 && c.r >= c0.r - 1e-6 && c.g > c0.g && c.b > c0.b,
      `★225-b 실루엣 지수 ${K.LB_EDGE_POW} > 첨탑 1.6(넓은 감쇠) · 채도 ${K.LB_DESAT}: ${K.LB_COL} → #${c.getHexString()}(백색 쪽 · 새 색 아님)`)
    ok(/<LampBeam mouthY=\{mouthY\} floorY=\{floor\} \/>/.test(src) && /<LampBeam mouthY=\{RM10_CENTER_Y \+ LAMP_MOUTH_Y1\} floorY=\{RM10_CENTER_Y\} \/>/.test(src),
      '★225 배선: 회랑 9기(갓 입→층계참) · 등불 방(갓 입→방 바닥) 마운트')
  }
}

console.log(fail === 0 ? `\n전부 통과 (${n}항)` : `\n실패 ${fail}/${n}`)
process.exit(fail === 0 ? 0 : 1)
