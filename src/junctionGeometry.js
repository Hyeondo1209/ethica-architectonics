// ════════════════════════════════════════════════════════════════════════════
//  junctionGeometry.js — 정션(무릎길 끝 · 갈림길) 권역의 기하 정본  ★70 (2026.07.25)
// ════════════════════════════════════════════════════════════════════════════
//  이 권역은 2026.07.05~07 기하라 §2-D 건축 마감 문법(07.23)보다 **앞서 있다** —
//  무릎길이 ★65~★69-2로 문법을 받은 지금, 판 하나 건너 옛 어휘가 그대로 남아 있는 구간.
//
//  ★이 파일이 맡는 것: 착지장 밑의 **매듭 매스**(§2-D ③ 두께 위계).
//   하강 23칸·전망 32칸의 몸은 **규격 재유도(경사) 결정 뒤**에 여기 붙는다 —
//   순서가 반대면 ★65가 저지른 실수(잘못된 보행선을 몸이 그대로 따라감)의 재발이다.
//
//  ⚠실측이 DESIGN §6의 전제 하나를 뒤집었다(2026.07.25):
//   §6은 "하강·전망은 관 밖이라 깊이 제약이 없다 → ㊿ 어휘 곧바로 이식 가능"이라 적었지만,
//   · 하강은 칸 0~11이 관 **안**(아래 여유 3.73 → 0.15)이고 칸 12부터 밖이다.
//   · 전망 램프는 32칸 **전부** 관 안이며 끝은 축거리 0.06 = 리브 중심선 위다.
//   → ㊿ 등단면 스트링거를 그대로 이식하면 하강 앞부분에서 관 바닥을 뚫는다.

import * as THREE from 'three'
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg'
import {
  X_LAND_LO, X_LAND_HI, JCT_PLATE_XHI, Z_LAND, LAND_T, U_KNEE_END, H,
  JCT_KNOT_ON, JCT_KNOT_MODE, JCT_KNOT_D, JCT_KNOT_TOP, JCT_KNOT_INSET,
  JCT_PLATE_MODE, JCT_PLATE_FUSE, JCT_PLATE_SEG, rOf as rOfC,
  SHELL_RIB_R, RIB_WALL_ON, RIB_WALL_T,
  SHAFT_ON, SHAFT_MODE, SHAFT_R, SHAFT_R_TOP, SHAFT_HOLLOW, SHAFT_WALL_T, SHAFT_FUSE,
  SHAFT_GRATE_ON, SHAFT_GRATE_BAR, SHAFT_GRATE_GAP, SHAFT_GRATE_T,
  SHAFT_X, SHAFT_Z, LK_DISC_T, LK_DISC_LIFT, LK_DISC_DY, LK_PLAT_R, LK_DISC_DZ,
  U_LOOKOUT_END, rOf, PASS_FLOOR_Y, RM_ROOF, PASS_T,
  JCT_DN_Z, PASS_HW, RM_X1, PASS_X_DEEP, PASS_X_CHEEK, CHEEK_TOP_PZ, CHEEK_TOP_PZ_HI, CHEEK_PZ_RAKE_X0, CHEEK_PZ_RAKE_X1,
  uOfX, WSTAIR_ON, WSTAIR_X0, WSTAIR_X1, WSTAIR_Y0, WSTAIR_Y1, WSTAIR_RUN, WSTAIR_RISE,
  WSTAIR_N, WSTAIR_R, WSTAIR_G, WSTAIR_BODY_D, WSTAIR_FUSE, WSTAIR_SEG,
  ARCH_X0, ARCH_X1, ARCH_Y0, ARCH_Y1, ARCH_Z0, ARCH_Z1, ARCH_HEAD, ARCH_ROOM_CROWN,
  WARCH_ON, WARCH_HW, WARCH_FUSE, JCT_SLOT_MARGIN, CHANNEL_HW, VAULT_HW, CLEAR_HW, WARCH_HEAD, WARCH_CLEAR, WARCH_DROP, WARCH_H_MAX, WARCH_RISE_ABOVE,
  X_DESC0, X_DESC_END, DESC_SLOPE, PASS_FLOOR_Y as PASS_FLOOR_Y2, TREAD_THICK, KW_BODY_TOP,
  RM_X1 as RM_X1_G, RM_MOUTH_H, RM_ROOF as RM_ROOF_G, PASS_FUSE, RM_MOUTH_REVEAL,
} from './constants.js'
import { kneeStairSpec } from './kneeStair.js'
import { innerTubeSolid } from './kneeBodyGeometry.js'

//  판 윗면 = JunctionLanding이 쓰는 값과 **같은 식**(사본 금지 — 판을 옮기면 매듭이 따라온다)
export const JCT_PLATE_TOP = U_KNEE_END * H + 0.1

// ── 매듭 매스의 스펙 한 벌 — 렌더·검증·진단이 같은 정본을 소비한다 ──
export function junctionKnotSpec() {
  const i = JCT_KNOT_INSET
  return {
    on: JCT_KNOT_ON,
    mode: JCT_KNOT_MODE,
    x0: X_LAND_LO + i, x1: JCT_PLATE_XHI - i,   // ★75: 매듭도 늘어난 판을 따라간다(판이 뜨지 않게)
    z0: -Z_LAND + i, z1: Z_LAND - i,
    plateTop: JCT_PLATE_TOP,
    plateBot: JCT_PLATE_TOP - LAND_T,
    //  상면이 판 밑면보다 JCT_KNOT_TOP 높다 = 판이 그만큼 파묻힌다(판 밑 틈이 구조적으로 없다)
    yTop: JCT_PLATE_TOP - LAND_T + JCT_KNOT_TOP,
    yBot: JCT_PLATE_TOP - JCT_KNOT_D,
    depth: JCT_KNOT_D,
    innerR: RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R,
  }
}

// ── ① 발자국 각기둥(닫힌 상자) ──
//  BoxGeometry를 쓰는 이유 = 감김이 바깥으로 보장돼 있다(★53·★64가 손으로 짠 브러시에서 겪은 파탄의 회피).
//  ⚠그래도 **재서** 확인한다 — 짐작하면 CSG가 조용히 뒤집힌다.
export function knotPrism() {
  const s = junctionKnotSpec()
  //  ★72: 'bore'면 매듭도 판과 **같은 윤곽 폭**까지 벌린다 — 관과의 교차가 정확히 깎아 주므로
  //   각기둥은 넉넉하기만 하면 되고, 판보다 좁으면 판 밑에 그늘진 턱이 생긴다.
  const zh = JCT_PLATE_MODE === 'bore' ? plateMaxHalf() : Z_LAND
  const w = s.x1 - s.x0, h = s.yTop - s.yBot, d = 2 * zh
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate((s.x0 + s.x1) / 2, (s.yTop + s.yBot) / 2, 0)
  return g.toNonIndexed()
}

// ── ② 매듭 = 각기둥 ∩ 관 안쪽 솔리드 ──
//  ★★한 연산이 두 형태를 다 낸다(★65와 같은 설계, 분기 없음):
//   'knot'(2.60) — 관 바닥이 판 발자국 최악 모서리에서 2.83이라 관은 **거의 닿지 않는다** = 사각 매스.
//   'fill'(9.0)  — 최대 가용 8.53보다 깊어 관이 밑면을 **통째로** 깎는다 = 갈림이 리브에 뿌리내린 매스.
//  ⚠교차이므로 어느 쪽이든 관 밖으로 새는 일이 **원리적으로** 불가능하다
//   (검사로 막는 게 아니라 구성으로 보장 — ★56 이격 처리와 같은 사고).
export function buildJunctionKnot() {
  if (!JCT_KNOT_ON) return null
  const s = junctionKnotSpec()
  const prism = knotPrism()
  //  ★70: 관 솔리드 범위를 **명시**한다. 구판은 무릎길 표본(188.01~285.19)에서 나온 범위를
  //   링 격자 스냅의 우연으로 정션까지 덮고 있었다 — 무릎길 노브 한 번이면 벗어난다.
  const tube = innerTubeSolid(s.x0 - 2, s.x1 + 2)
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const a = new Brush(prism), b = new Brush(tube)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  const out = ev.evaluate(a, b, INTERSECTION)
  prism.dispose(); tube.dispose()
  return WSTAIR_ON ? cutWithSlot(out.geometry) : out.geometry    // ★75: 하강 계단우물
}

// ════════════════════════════════════════════════════════════════════════════
//  ★71 빛 기둥 — 전망 반원 판 → 전실 방 (2026.07.25 현도 아이디어)
// ════════════════════════════════════════════════════════════════════════════
//  ⚠**빛나는 장치는 짓지 않는다**(현도 명시). 기하는 '뚫린 관'까지고 빛은 P2 몫이다.
//  ★한 부재가 세 가지 구멍을 요구한다: ① 목적지 리브 껍질(LOCKED 예외 #4) ② 방 지붕 ③ 반원 판.
//   셋 다 **같은 자르개**(`shaftCutSolid`)로 뚫는다 — 따로 만들면 여유가 어긋나 틈이 생긴다.

export function lightShaftSpec() {
  //  판 윗면·밑면 — Lookout(Dome.jsx)과 **같은 식**(사본 금지)
  const discTop = U_LOOKOUT_END * H + LK_DISC_LIFT + LK_DISC_DY
  const discBot = discTop - LK_DISC_T
  return {
    on: SHAFT_ON, mode: SHAFT_MODE, hollow: SHAFT_HOLLOW,
    x: SHAFT_X, z: SHAFT_Z,
    rBot: SHAFT_R,
    //  'capital' = 원뿔대(위가 넓음 = 받침머리) / 'column' = 원기둥
    rTop: SHAFT_MODE === 'capital' ? SHAFT_R_TOP : SHAFT_R,
    wallT: SHAFT_WALL_T, fuse: SHAFT_FUSE,
    discTop, discBot, discR: LK_PLAT_R, discZ: LK_DISC_DZ,
    //  ★윗끝 = 판 **윗면**까지 올린다(현도 "윗면이 판에 딱 맞도록"). 판이 뚫려 있으므로
    //   관이 판 두께를 관통해 판 윗면에서 끝난다 = 발을 딛는 면에 관 아가리가 드러난다.
    yTop: discTop,
    //  ★71-3 아랫끝 = **방 천장 아랫면**(현도 로컬 판정: "바닥까지 내려갈 게 아니라 천장에 닿게").
    //   관은 지붕 두께(PASS_T)만 관통해 실내 천장면에서 끝난다 = 방에서는 **천장에 뚫린 눈(oculus)**으로 보인다.
    //   ⚠구판은 바닥(PASS_FLOOR_Y)까지 내려가 방 한가운데 기둥이 서 있었다.
    yBot: PASS_FLOOR_Y + RM_ROOF,
    roofBot: PASS_FLOOR_Y + RM_ROOF, roofTop: PASS_FLOOR_Y + RM_ROOF + PASS_T,
    ribOuterR: SHELL_RIB_R,
    ribInnerR: RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R,
  }
}

//  단면이 위아래로 다르므로 원뿔대 한 방으로 만든다(CylinderGeometry는 위/아래 반경을 따로 받는다).
//  ⚠반경 보간은 y 선형이다 — 자르개도 **같은 보간**을 써야 구멍이 관을 정확히 따라간다.
function frustum(rTop, rBot, y0, y1, x, z, seg = 48) {
  const g = new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg)
  g.translate(x, (y0 + y1) / 2, z)
  return g
}

// ── 관통 자르개 — 세 구멍(리브 껍질·방 지붕·반원 판)이 **공유**한다 ──
//  ★71-3 **부호가 반전됐다**: 구멍을 관보다 `SHAFT_FUSE`만큼 **작게** 뚫는다 → 관이 파고들어 융착.
//   여유를 두면 헤어라인이라도 **틈으로 보인다**(현도 로컬 적발). 겹치면 이음매가 원리적으로 없다.
//  ⚠범위는 딱 필요한 만큼만(★64-5 교훈: 넘치면 관벽이 유령 구조로 남는다) — 인자로 받는다.
export function shaftCutSolid(y0, y1) {
  const s = lightShaftSpec()
  const c = s.fuse
  //  y0~y1 구간에서의 반경을 원래 관의 선형 보간으로 되찾아 여유만 얹는다
  const at = (y) => {
    const t = (y - s.yBot) / (s.yTop - s.yBot)
    return s.rBot + (s.rTop - s.rBot) * Math.max(0, Math.min(1, t)) - c
  }
  return frustum(at(y1), at(y0), y0, y1, s.x, s.z)
}

// ── 관 본체 ──
//  HOLLOW = 바깥 원뿔대 − 안쪽 원뿔대(정식 SUBTRACTION). 안쪽이 뚫려 있어 위아래로 시선·빛이 통한다.
//  ⚠안쪽 관은 위아래로 **더 뻗어야** 한다 — 같은 길이면 마구리가 공면이 되어 CSG가 살얼음판이 된다.
export function buildLightShaft() {
  if (!SHAFT_ON) return null
  const s = lightShaftSpec()
  const outer = frustum(s.rTop, s.rBot, s.yBot, s.yTop, s.x, s.z)
  if (!s.hollow) return outer.toNonIndexed()
  const iTop = Math.max(0.1, s.rTop - s.wallT), iBot = Math.max(0.1, s.rBot - s.wallT)
  const inner = frustum(iTop, iBot, s.yBot - 2, s.yTop + 2, s.x, s.z)
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const a = new Brush(outer), b = new Brush(inner)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  const out = ev.evaluate(a, b, SUBTRACTION)
  outer.dispose(); inner.dispose()
  return out.geometry
}

// ── ★71-4 격자 체(현도 제안 2026.07.25) ──
//  판에 뚫린 지름 3 구멍을 **밟을 수 있게** 덮으면서 빛은 통과시킨다.
//  ⚠§2-C '수직 립 배열 금지'와 무관하다 — 그 금지는 세로 요소가 리브(실체)와 혼동되는 것을 막는 장치이고,
//   이건 수평 부재라 리브와 나란히 설 일이 없다(§2-C '기둥(newel)' 항목의 비-혼동 논법과 같은 형식).
//  구성 = 직교 살 두 벌. 길이는 원의 현으로 **해석적으로** 자른다(CSG 불필요 = 싸고 안 깨진다).
export function buildShaftGrate() {
  if (!SHAFT_ON || !SHAFT_GRATE_ON) return null
  const s = lightShaftSpec()
  //  덮을 반경 = 관 **안쪽** 보어(살 안쪽까지 살이 받으므로 그 안만 막으면 된다)
  const R = Math.max(0.2, s.rTop - s.wallT)
  const yTop = s.yTop, yBot = yTop - SHAFT_GRATE_T
  const step = SHAFT_GRATE_BAR + SHAFT_GRATE_GAP
  const geos = []
  //  d = 중심에서의 오프셋. 살 중심이 원 안에 있는 것만 세운다.
  for (let d = -Math.floor(R / step) * step; d <= R + 1e-9; d += step) {
    const half = Math.sqrt(Math.max(0, R * R - d * d))
    if (half < SHAFT_GRATE_BAR) continue
    //  ① x방향 살 (z = d 에 놓임)
    const gx = new THREE.BoxGeometry(2 * half, SHAFT_GRATE_T, SHAFT_GRATE_BAR)
    gx.translate(s.x, (yTop + yBot) / 2, s.z + d)
    geos.push(gx)
    //  ② z방향 살 (x = d 에 놓임)
    const gz = new THREE.BoxGeometry(SHAFT_GRATE_BAR, SHAFT_GRATE_T, 2 * half)
    gz.translate(s.x + d, (yTop + yBot) / 2, s.z)
    geos.push(gz)
  }
  if (!geos.length) return null
  //  ⚠살끼리 교차하는 지점은 겹친다 — 같은 재질의 한 부재이므로 무해하다(CSG로 합칠 이유가 없다).
  const pos = []
  for (const g of geos) {
    const p = g.toNonIndexed().attributes.position
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i))
    g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.computeVertexNormals()
  return out
}

// ── ★71-2b 반원 판 = **옆면이 채워진** 솔리드 ──
//  ⚠현도 로컬 적발: *"반원이 두께를 가진 것처럼 안 보여, 옆면이 하나도 안 채워지고 윗면과 밑면만 채워져서."*
//  ★원인 = `CylinderGeometry`는 `thetaLength < 2π`일 때 **부채꼴의 두 평면(반지름 면)을 만들지 않는다.**
//   위·아래 캡만 생기므로 옆에서 보면 두 장의 종이가 된다. 두께를 키워도 영영 두꺼워 보이지 않는다.
//  → `Shape` + `ExtrudeGeometry`로 **닫힌 솔리드**를 만든다(현·호가 윤곽이므로 옆면이 저절로 생긴다).
//  ⚠좌표: rotateX(−π/2)는 (x,y,z)→(x, z, −y). 즉 shape의 y가 월드 −z, 압출 깊이가 월드 +y가 된다.
export function discSolid(r, t, half) {
  const sh = new THREE.Shape()
  if (half) sh.absarc(0, 0, r, Math.PI / 2, 3 * Math.PI / 2, false)  // x ≤ 0 절반(곡면 −x · 지름변 +x)
  else sh.absarc(0, 0, r, 0, Math.PI * 2, false)
  sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 48 })
  g.rotateX(-Math.PI / 2)          // shape 평면 → 수평, 압출 방향 → +y
  return g
}

// ════════════════════════════════════════════════════════════════════════════
//  ★72 정션 판 윤곽 — 사각에서 **관 단면 추종**으로 (2026.07.25 현도 지시)
// ════════════════════════════════════════════════════════════════════════════
//  ★핵심은 한 줄이다: **z 반폭을 상수(Z_LAND)에서 관의 함수로 바꾼다.**
//   x 범위·높이·세 갈래 z는 전부 그대로 — 판이 옆으로 벌어져 벽에 닿을 뿐이다.
//   그래서 무릎길 도착(X_LAND_HI)·하강 시작(X_DESC0)·전망 시작(X_LAND_LO) 커플링이 무손상이다.

//  판 높이에서 리브 중심선까지의 거리(관 안쪽 판정용) — 검증·렌더가 같은 식을 소비한다
export function axisDistAt(x, y, z) {   // ★75: 검사가 리브 구멍 정합을 재려면 필요
  let best = 1e9
  for (let u = 0.15; u < 0.40; u += 0.0002) best = Math.min(best, Math.hypot(rOfC(u) - x, u * H - y, z))
  return best
}

// ── 윤곽: x마다 관 내벽까지의 z 반폭(+융착) ──
export function junctionPlateOutline() {
  const yP = JCT_PLATE_TOP
  const innerR = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
  const pts = []
  for (let i = 0; i <= JCT_PLATE_SEG; i++) {
    const x = X_LAND_LO + (JCT_PLATE_XHI - X_LAND_LO) * i / JCT_PLATE_SEG   // ★75: 판 끝은 무릎길 도착과 분리
    if (JCT_PLATE_MODE !== 'bore') { pts.push({ x, h: Z_LAND }); continue }
    //  이분법으로 관 내벽 z를 찾는다(스캔보다 정확·빠름)
    let lo = 0, hi = 14
    for (let k = 0; k < 40; k++) {
      const m = (lo + hi) / 2
      if (axisDistAt(x, yP, m) <= innerR) lo = m; else hi = m
    }
    //  ⚠벽에 정확히 맞추면 z파이팅 → 살 속으로 JCT_PLATE_FUSE만큼 파고든다(★71-3 어법)
    pts.push({ x, h: lo + JCT_PLATE_FUSE })
  }
  return pts
}

//  판·매듭이 **같은 윤곽**을 쓴다 — 따로 계산하면 옆면이 어긋나 계단이 생긴다
export function plateMaxHalf() {
  return Math.max(...junctionPlateOutline().map(p => p.h))
}

// ── 판 솔리드 = 윤곽 압출 ──
//  ⚠좌표: rotateX(−π/2)는 (x,y,z)→(x, z, −y). shape의 y가 월드 −z, 압출 깊이가 월드 +y.
//   윤곽이 z에 대칭이라 부호 반전은 무해하다.
// ── ★75-b 하강 슬롯 — 판·매듭을 관통하는 계단우물 ──
//  ⚠★75가 하강 시작을 판 −x변(184.71)에서 **판 위**(188.05)로 옮겼다. 계단 발치 밑으로 지나가려면
//   거기서부터 내려가 있어야 하기 때문이다. 그런데 판에 구멍이 없으면 **하강 첫 구간이 판 속에 파묻힌다**
//   (실측: x186에서 판 밑면까지 머리 1.24 — 못 지나간다).
//  → 판·매듭을 같은 자르개로 뚫는다. 여정으로 읽으면: 무릎길에서 올라서면 **발 앞에 계단우물이 열려 있고**,
//   그 너머로 큰 계단이 솟는다 — 갈림이 위·아래가 된다는 것의 물리적 형태다.
//  ⚠자르개는 딱 필요한 범위만(★64-5): x는 하강 시작~판 −x변, 폭은 채널 정합(2×PASS_HW).
export function descSlotSolid() {
  //  ★75-k 볼트보다 JCT_SLOT_MARGIN만큼 넓게 — 같으면 판이 볼트 안에 날개로 남는다(실측 0.04 두께)
  const hw = CLEAR_HW
  const x0 = X_LAND_LO - 0.5, x1 = X_DESC0 + 0.05      // 판 −x변 너머까지(마구리가 판 밖에서 닫히게)
  const yTop = JCT_PLATE_TOP + 1.0
  const yBot = JCT_PLATE_TOP - JCT_KNOT_D - 1.0        // 매듭 밑면 아래까지
  const g = new THREE.BoxGeometry(x1 - x0, yTop - yBot, 2 * hw)
  g.translate((x0 + x1) / 2, (yTop + yBot) / 2, JCT_DN_Z)
  return g.toNonIndexed()
}
function cutWithSlot(geo) {
  const slot = descSlotSolid()
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const a = new Brush(geo.index ? geo.toNonIndexed() : geo), b = new Brush(slot)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  const out = ev.evaluate(a, b, SUBTRACTION).geometry
  slot.dispose()
  return out
}

export function buildJunctionPlate() {
  const O = junctionPlateOutline()
  const sh = new THREE.Shape()
  sh.moveTo(O[0].x, O[0].h)
  for (let i = 1; i < O.length; i++) sh.lineTo(O[i].x, O[i].h)
  for (let i = O.length - 1; i >= 0; i--) sh.lineTo(O[i].x, -O[i].h)
  sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: LAND_T, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, JCT_PLATE_TOP - LAND_T, 0)
  return WSTAIR_ON ? cutWithSlot(g) : g            // ★75: 하강 계단우물
}

// ── ★74 +z 볼벽 = 레이크(경사) 상단 프로파일 (2026.07.25 현도 "파란색이 가장 튀어나온 벽") ──
//  ⚠구판은 상단이 **수평 257.53** 한 값이라 갈림판 윗면(256.13)을 1.4 뚫고 올라와 있었다.
//  ★그 높이의 근거(주석)는 *"디스크가 닿지 않아(r4 < z4.35)"* 였고 ★72가 그 전제를 없앴다 —
//   판이 |z| 5.58~5.88까지 나가 볼벽(z 4.35)을 덮는다. 다만 **관을 벗어나는 구간(x ≲ 181)에서는
//   이 벽이 여전히 유일한 차폐**라(실측: 전체를 낮추면 고도 60° 광선 3개 누출) 거기만 남긴다.
//  → 단차 대신 **레이크**. x0에서 구 높이 → x1(판 −x변)에서 판 윗면. 누출 Δ0 실측(방위 120 × 고도 13).
export function pzCheekProfile() {
  return {
    z: JCT_DN_Z + PASS_HW + PASS_T / 2, t: PASS_T,
    x0: RM_X1, x1: PASS_X_CHEEK,
    yBot: PASS_FLOOR_Y,
    hi: CHEEK_TOP_PZ_HI, lo: CHEEK_TOP_PZ,
    rx0: CHEEK_PZ_RAKE_X0, rx1: CHEEK_PZ_RAKE_X1,
  }
}
export function cheekTopPzAt(x) {
  const p = pzCheekProfile()
  if (x <= p.rx0) return p.hi
  if (x >= p.rx1) return p.lo
  return p.hi + (p.lo - p.hi) * (x - p.rx0) / (p.rx1 - p.rx0)
}
export function buildPzCheek() {
  const p = pzCheekProfile()
  const sh = new THREE.Shape()
  sh.moveTo(p.x0, p.yBot)
  sh.lineTo(p.x1, p.yBot)
  sh.lineTo(p.x1, p.lo)
  sh.lineTo(p.rx1, p.lo)
  sh.lineTo(p.rx0, p.hi)
  sh.lineTo(p.x0, p.hi)
  sh.closePath()
  //  ⚠ExtrudeGeometry는 +z로 밀어낸다 — 벽 두께 방향이 곧 z라 회전이 필요 없다.
  const g = new THREE.ExtrudeGeometry(sh, { depth: p.t, bevelEnabled: false })
  g.translate(0, 0, p.z - p.t / 2)
  return g
}


// ════════════════════════════════════════════════════════════════════════════
//  ★75 넓은 상승 계단 + 중앙 아치 (2026.07.26 · 현도 스케치 `갈림길_스케치.jpg`)
// ════════════════════════════════════════════════════════════════════════════
//  구 전망 램프는 폭 2짜리 **허공 판 35장**이었다(관이 허용하는 11.4의 17%). ★65가 무릎길에서
//  걷어낸 435장과 같은 종류의 부채다. 여기서는 처음부터 **한 덩어리 솔리드**로 짓는다:
//   옆면 프로파일(53단 톱니 상면 + 깎인 밑면)을 z로 압출 → 관 안쪽과 **교차** → 아치를 **감산**.
//  ★교차이므로 관 밖으로 새는 일이 원리적으로 불가능하고(검사가 아니라 구성으로 보장 — ★56 어법),
//   옆면·밑면이 관 곡면에 저절로 정합한다(§2-D ② 매스 + 깎인 밑면). 밑면이 곧 터널 천장이다.
//
//  ⚠좌표: ExtrudeGeometry는 x–y 평면의 Shape를 **+z로** 밀어낸다 → 옆면 프로파일에는 회전이 필요 없다
//   (buildPzCheek과 같은 어법). 압출 뒤 z를 반만큼 되돌려 중심을 z=0에 맞춘다.

//  계단 상면(코 끝을 잇는 선) — x는 서쪽(작을수록)이 높다
export function wstairTopAt(x) {
  const xx = Math.max(WSTAIR_X1, Math.min(WSTAIR_X0, x))
  return WSTAIR_Y0 + (WSTAIR_X0 - xx) * (WSTAIR_RISE / WSTAIR_RUN)
}
//  하강 보행선(밟는 면) — 계단 밑을 지나는 터널의 바닥
export function descFloorAt(x) {
  if (x >= X_DESC0) return WSTAIR_Y0                      // 아직 판 위(평지)
  if (x <= X_DESC_END) return PASS_FLOOR_Y2
  return WSTAIR_Y0 - (X_DESC0 - x) * DESC_SLOPE
}

export function wideStairSpec() {
  return {
    on: WSTAIR_ON, x0: WSTAIR_X0, x1: WSTAIR_X1, y0: WSTAIR_Y0, y1: WSTAIR_Y1,
    n: WSTAIR_N, r: WSTAIR_R, g: WSTAIR_G, depth: WSTAIR_BODY_D,
    slopeDeg: Math.atan2(WSTAIR_RISE, WSTAIR_RUN) * 180 / Math.PI,
    blondel: 2 * WSTAIR_R + WSTAIR_G,
    innerR: RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R,
  }
}

// ── 폭 = 관의 함수(★72 수법 그대로) ──
//  ⚠판(수평)과 달리 계단은 **높이가 x마다 다르다** → 각 x에서 그 자리의 몸 중심 높이로 재야 한다.
export function wideStairOutline() {
  const S = wideStairSpec()
  const pts = []
  for (let i = 0; i <= WSTAIR_SEG; i++) {
    const x = S.x0 + (S.x1 - S.x0) * i / WSTAIR_SEG
    const y = wstairTopAt(x) - S.depth / 2            // 몸 단면의 한가운데에서 잰다
    let lo = 0, hi = 14
    for (let k = 0; k < 40; k++) {
      const m = (lo + hi) / 2
      if (axisDistAt(x, y, m) <= S.innerR) lo = m; else hi = m
    }
    pts.push({ x, h: lo + WSTAIR_FUSE })              // 살 속으로 융착(★71-3 어법)
  }
  return pts
}
export function wideStairMaxHalf() { return Math.max(...wideStairOutline().map(p => p.h)) }

// ── ① 몸(매스) 각기둥 — **매끈한 사다리꼴 단면** ──
//  ⚠1차 구현은 53단 톱니를 통째로 압출해 관과 교차시켰다 → 교차 결과가 **열린 변 1455개**(실측).
//   106개 얇은 면이 십각 관 면과 만나며 CSG가 감당을 못 했고, 감산까지 가서 부피가 음수로 뒤집혔다.
//  ★해법은 새 어휘가 아니라 **이미 있는 어휘**다 — 무릎길이 ★65·★66에서 쓰는 **몸 + 디딤판**:
//   매끈한 몸만 CSG로 깎고(면 수가 두 자릿수), 계단은 그 위에 얹는다(걷는 면은 안 건드린다).
//   판이 몸에 KW_BODY_TOP만큼 파묻혀 판 밑 틈이 구조적으로 없다(㊿ ②).
export function wideStairPrism() {
  const S = wideStairSpec()
  const half = wideStairMaxHalf() + 0.5               // 관이 깎을 것이므로 넉넉하게(교차가 정리한다)
  const top = TREAD_THICK - KW_BODY_TOP               // 몸 상면 = 코 선에서 이만큼 아래(판이 파묻힌다)
  //  ★★몸은 **관 바닥까지 채운다**(2026.07.26 현도 소견 "정면에서 아치로 뚫린 모습이 안 보인다").
  //   ⛔구현 1차의 두께 1.6짜리 얇은 스트링거는 발치에 **아치를 뚫을 벽면이 없어서**, 아치가 보 밑 슬롯으로만
  //    보였다. 채우면 발치에서 몸 높이 5.35 · 아치 2.22 · 그 양옆 스팬드럴 2.30씩이 서고,
  //    안쪽은 x179까지 이어지는 진짜 볼트 터널이 된다(거기서 관을 벗어나며 봉인 채널로 인계).
  //   ⚠깊이는 관이 정한다 — 여기서는 관 바닥 아래까지 넉넉히 내린 뒤 **교차가 깎게** 둔다(★65 어법).
  const deep = S.y0 - 9
  const sh = new THREE.Shape()
  sh.moveTo(S.x0, S.y0 - top)
  sh.lineTo(S.x1, S.y1 - top)
  sh.lineTo(S.x1, deep)
  sh.lineTo(S.x0, deep)
  sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: 2 * half, bevelEnabled: false })
  g.translate(0, 0, -half)                            // 압출은 +z로만 나가므로 중심을 z=0에
  return g.toNonIndexed()
}

// ── ①' 디딤판 53장 — 폭은 x마다 관을 따른다(★72 수법) ──
//  ⚠허공 판이 아니다: 바로 밑이 몸이다(구 램프 35장은 진짜 허공 판이었다 — ★65가 걷어낸 부채와 같은 종류).
export function wideStairTreads() {
  const S = wideStairSpec()
  const O = wideStairOutline()
  const halfAt = (x) => {
    let best = O[0].h, bd = 1e9
    for (const q of O) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; best = q.h } }
    return best
  }
  const AP = archCutProfile().filter(q => q.open)
  const archTopAt = (x) => { let b = null, bd = 1e9
    for (const q of AP) { const d = Math.abs(q.x - x); if (d < bd) { bd = d; b = q } }
    return (b && bd < 0.25) ? b.crown : null }
  const T = []
  for (let i = 0; i < S.n; i++) {
    //  i번째 코 = (x0 − (i+1)·G, y0 + (i+1)·R). 판은 그 디딤을 덮는다.
    const xN = S.x0 - (i + 1) * S.g, yN = S.y0 + (i + 1) * S.r
    const xc = xN + S.g / 2                            // 디딤 한가운데
    //  ⚠아치가 그 단의 중앙을 먹었으면 **판을 둘로 쪼갠다** — 안 쪼개면 허공에 뜬 판이 아치를 가로막는다.
    const ac = archTopAt(xc)
    const split = ac != null && ac >= yN - TREAD_THICK
    if (split) {
      //  ★75-l 안쪽 모서리는 **CLEAR_HW**다. 볼트 반폭과 같게 두면 두께 0.20짜리 날개가 볼트 옆에
      //   튀어나온다(현도 적발 2026.07.26 — 오늘 같은 병 세 번째).
      const outer = halfAt(xc), inner = CLEAR_HW
      if (outer > inner + 0.1) {
        const w = outer - inner, zc = (outer + inner) / 2
        T.push({ x: xc, y: yN - TREAD_THICK / 2, d: S.g * 1.17, w, z: +zc })
        T.push({ x: xc, y: yN - TREAD_THICK / 2, d: S.g * 1.17, w, z: -zc })
      }
    } else {
      T.push({ x: xc, y: yN - TREAD_THICK / 2, d: S.g * 1.17, w: 2 * halfAt(xc), z: 0 })   // 코 비 1.17(★66 계승)
    }
  }
  return T
}

//  그 x에서 관 안쪽 바닥(축거리 = 내반경이 되는 가장 낮은 y)
//  ★75-f 하강이 관 살을 **실제로 뚫고 나가는 x** — 리브 구멍(ARCH)의 정본 좌표.
//   보행선이 관 바닥 아래로 내려가는 지점. 하강 경사·시작이 바뀌면 여기가 따라 움직인다.
export function descPierceX() {
  let lo = 176, hi = 191                       // hi = 관 안 · lo = 관 밖
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2
    if (descFloorAt(m) < tubeBottomAt(m)) lo = m; else hi = m }
  return (lo + hi) / 2
}

//  그 x·z에서 관 **안쪽** 바닥(살을 다 걷어내려면 여기까지 파야 한다)
export function tubeInnerBottomAt(x, z = 0) {
  const R0 = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
  const rr = Math.sqrt(Math.max(0, R0 * R0 - z * z))
  const yc = H * uOfX(x)
  let lo = yc - 9, hi = yc
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (axisDistAt(x, m, 0) <= rr) hi = m; else lo = m }
  return hi
}

//  ★75-j 리브 구멍의 크라운은 **x마다 다르다**(2026.07.26 현도: "윗부분 좀만 더 막아주면
//   안으로 파인 부분이 안 보일 것 같다"). 구판은 전 구간 상수 255.03이었는데 그 값은 **동쪽 끝**
//   (바닥이 높은 곳)의 통과 높이에서 나온 것이라, 바닥이 4.3 낮은 방 쪽에서 그만큼 과하게 파여
//   껍질 안쪽이 드러났다. → 통과 높이와 살 제거 높이 **둘 중 큰 쪽**을 x마다 따로 구한다.
export function ribArchCrownAt(x) {
  const hw = (ARCH_Z1 - ARCH_Z0) / 2 + 0.25
  //  ⚠**아치의 곡률까지 계산에 넣어야 한다.** 최악 z 하나만 보고 크라운을 잡으면, 아치는 z가 커질수록
  //   천장이 낮아지므로 중간 z에서 살이 남는다(실측: z=−1.6에서 0.026 모자라 막 48점 잔존).
  //   각 z에서 아치 천장 = crown − hw(1−√(1−(z/hw)²)) 이므로, 필요한 crown = T(z) + hw(1−√…)의 최댓값.
  //   ⚠|z|는 볼벽 안쪽(PASS_HW)까지만 본다 — 그 바깥은 볼벽이 가려 보이지 않는다.
  let need = descFloorAt(x) + ARCH_HEAD
  for (let z = 0; z <= PASS_HW + 0.1; z += 0.1) {
    const sq = Math.sqrt(Math.max(0, 1 - (z / hw) * (z / hw)))
    need = Math.max(need, tubeInnerBottomAt(x, z) + 0.1 + hw * (1 - sq))
  }
  const c = need
  //  ★★방 **안쪽**에서는 문 크라운을 안 넘는다(현도 2026.07.26: "윗부분 좀만 더 막아주면
  //   안으로 파인 부분이 안 보일 것 같다"). 그 구간은 통행이 아니라 **보이는 면**이고,
  //   문 위로 더 판 만큼이 그대로 파인 자국으로 드러난다.
  //  ⚠서쪽에서도 크라운이 높았던 이유는 거기서 관이 위로 올라와 **살을 걷으려면 그만큼 파야** 해서다.
  //   그 요구는 통행 구간(벽 동쪽)에만 적용한다 — 방 안쪽 살은 어차피 방 지붕 아래 숨는다.
  //  ⛔문 크라운 클램프 **철회**(2026.07.26). 그 클램프는 "문 위 파인 자국"을 막으려던 것인데,
  //   ★75-n에서 창의 서쪽 끝을 **문틀 서쪽 면**까지로 당기면서 그 구간을 문틀이 통째로 덮는다.
  //   → 파인 자국은 애초에 안 보이고, 클램프가 있으면 오히려 살이 0.02~0.11 남아 입술이 된다.
  //   ⚠교훈: 가림(문틀)으로 풀 문제를 치수(크라운)로 풀려다 두 요구가 0.1 폭에서 충돌했다.
  return c
}

export function tubeBottomAt(x) {
  const R = RIB_WALL_ON ? SHELL_RIB_R - RIB_WALL_T : SHELL_RIB_R
  //  ⚠구간을 **중심선에서부터** 잡아야 한다. 위쪽 아무 데서나 시작하면 거기도 관 밖이라
  //   이분법의 불변식이 깨져 상한으로 수렴한다(실측 사고: 볼트가 1.2만 뚫렸다).
  const yc = H * uOfX(x)
  let lo = yc - 9, hi = yc                    // lo = 관 밖(아래) · hi = 관 안(중심)
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (axisDistAt(x, m, 0) <= R) hi = m; else lo = m }
  return hi
}

export function archCutProfile() {
  const P = []
  //  ⚠★64-5: 자르개는 **딱 필요한 범위만**. 서쪽 끝은 하강이 방으로 들어가는 지점까지면 충분하다 —
  //   거기서 더 가면 계단 매스 아래 허공만 긁는다(구현 1차에서 174.22까지 나갔던 것을 적발·축소).
  const x0 = WSTAIR_X0 + 0.6                          // 동쪽: 계단 동쪽 면을 확실히 관통
  //  서쪽: **크라운이 계단 밑면 아래로 내려가는 곳**에서 끝난다 — 그 서쪽은 계단을 안 건드리므로
  //   더 파봐야 허공만 긁는다(★64-5). 1차 구현은 176.76까지 나가 부피 5626짜리 자르개를 만들었다.
  //  ⚠몸을 관 바닥까지 채운 뒤로는 기준이 '밑면'이 아니라 **관 바닥**이다.
  //   하강 보행선이 관을 벗어나면(관 바닥이 보행선 위로 올라오면) 거기서 볼트가 끝나고
  //   봉인 채널(슬랩 + 볼벽 둘)이 인계한다 — 그보다 서쪽을 더 파면 허공만 긁는다(★64-5).
  let x1 = WSTAIR_X1
  for (let x = WSTAIR_X0; x >= WSTAIR_X1; x -= 0.02) {
    const cr = Math.min(wstairTopAt(x) - WARCH_HEAD, descFloorAt(x) + WARCH_H_MAX)
    if (cr < tubeBottomAt(x) + 0.1) { x1 = x - 0.6; break }   // 0.6 = 마구리가 매스 밖에서 닫히도록
  }
  const NSEG = 96
  for (let i = 0; i <= NSEG; i++) {
    const x = x0 + (x1 - x0) * i / NSEG
    const floor = descFloorAt(x) - WARCH_DROP
    //  ★크라운은 계단을 따라 오르되, **판 위 WARCH_RISE_ABOVE 아래로는 안 내려간다.**
    //   발치 근처에서는 이 하한이 계단 상면을 넘어서므로 첫 단들의 중앙이 실제로 깎여 나간다 =
    //   정면에서 아치로 읽히는 유일한 방법이다(그러지 않으면 아치가 판 밑에만 존재한다 — 실측).
    const crown = Math.min(
      Math.max(wstairTopAt(x) - WARCH_HEAD, WSTAIR_Y0 + WARCH_RISE_ABOVE),
      descFloorAt(x) + WARCH_H_MAX)
    P.push({ x, floor, crown, open: crown > floor + 0.05 })
  }
  return P
}

// ── 아치 단면 = 반원 볼트 ──
//  ⚠1차 구현은 x–y 프로파일을 z로 압출했다 → 단면이 **사각형**이라 아치가 아니었다.
//   아치는 z–y 단면의 성질이므로 **수평 단면을 적층(로프트)** 해야 한다(★64-2 `ribHoleSolid`와 같은 수법 —
//   로프트로 처음부터 watertight하게 짓는다. 열린 셸을 이어 붙이면 비다양체가 되어 감산이 파탄한다 ★64-1).
//  스프링라인 = 크라운 − 반폭. 크라운이 낮은 구간에서는 스프링라인이 바닥으로 눌려 **세그멘탈 아치**가 된다.
const ARCH_RING_N = 18
function archRing(q, hw) {
  //  ⚠**최소 직선부를 강제한다.** spring이 floor와 같아지면 고리 첫 점과 아치 첫 점이 겹쳐 퇴화 삼각형이
  //   생기고, 그 변이 4~6회 공유되는 **비다양체**가 된다(★64-1과 같은 병 — 실측 4개 링).
  const spring = Math.max(q.floor + 0.05, q.crown - hw)
  //  ★고리는 **닫힌 폴리곤**이다(바닥 현까지 포함) — 옆면 루프 하나가 전부를 덮게 해서
  //   '바닥 띠'를 따로 짜다 감김이 어긋나는 것을 원천 차단한다.
  const pts = [[-hw, q.floor]]
  for (let k = 0; k <= ARCH_RING_N; k++) {            // 반원 볼트: 좌 스프링 → 정수리 → 우 스프링
    const th = Math.PI - Math.PI * k / ARCH_RING_N
    pts.push([hw * Math.cos(th), spring + (q.crown - spring) * Math.sin(th)])
  }
  pts.push([hw, q.floor])
  return pts
}
export function archCutSolid() {
  const P = archCutProfile().filter(q => q.open)
  if (P.length < 2) return null
  const hw = WARCH_HW + WARCH_FUSE
  const R = P.map(q => archRing(q, hw))
  const M = R[0].length
  //  각 고리의 도심(단면 평면 안) — 면마다 바깥쪽을 판정하는 기준점
  const C = R.map(r => {
    let z = 0, y = 0
    for (const q of r) { z += q[0]; y += q[1] }
    return [z / r.length, y / r.length]
  })
  const V = (i, j) => [P[i].x, R[i][j][1], JCT_DN_Z + R[i][j][0]]
  const pos = []
  //  ★면마다 개별 정렬(★53 교훈). 전역 반전은 감김이 **이미 일관될 때만** 통한다 —
  //   스윕 솔리드는 볼록이 아니므로 전역 중심 기준 정렬도 못 쓴다. 단면 도심 기준이 정확하다.
  const push = (A, B2, Cc, outward) => {
    const ux = B2[0]-A[0], uy = B2[1]-A[1], uz = B2[2]-A[2]
    const vx = Cc[0]-A[0], vy = Cc[1]-A[1], vz = Cc[2]-A[2]
    const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx
    const flip = (nx*outward[0] + ny*outward[1] + nz*outward[2]) < 0
    const T = flip ? [A, Cc, B2] : [A, B2, Cc]
    for (const q of T) pos.push(q[0], q[1], q[2])
  }
  //  옆면 — 바깥 = 단면 도심에서 면 중점으로(진행축 성분 제거)
  for (let i = 0; i < P.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const j2 = (j + 1) % M
      const A = V(i, j), B2 = V(i + 1, j), Cc = V(i + 1, j2), D = V(i, j2)
      const cy = (C[i][1] + C[i+1][1]) / 2, cz = JCT_DN_Z + (C[i][0] + C[i+1][0]) / 2
      const mid = [0, (A[1]+B2[1]+Cc[1]+D[1])/4, (A[2]+B2[2]+Cc[2]+D[2])/4]
      const out = [0, mid[1] - cy, mid[2] - cz]
      push(A, B2, Cc, out); push(A, Cc, D, out)
    }
  }
  //  마구리 두 장 — 바깥은 진행축 방향(동쪽 끝 = +x · 서쪽 끝 = −x)
  for (const [i, ax] of [[0, +1], [P.length - 1, -1]])
    for (let j = 1; j < M - 1; j++) push(V(i, 0), V(i, j), V(i, j + 1), [ax, 0, 0])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

// ── ③ 조립: (각기둥 ∩ 관 안쪽) − 아치 ──
export function buildWideStair() {
  if (!WSTAIR_ON) return null
  const S = wideStairSpec()
  const prism = wideStairPrism()
  const tube = innerTubeSolid(S.x1 - 3, S.x0 + 3)
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const a = new Brush(prism), b = new Brush(tube)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  let out = ev.evaluate(a, b, INTERSECTION).geometry
  prism.dispose(); tube.dispose()
  if (WARCH_ON) {
    const cut = archCutSolid()
    if (cut) {
      //  ⚠CSG 결과는 indexed다(★64 교훈 ⓐ) — 다음 브러시에 넣기 전에 풀어 준다
      const bo = new Brush(out.index ? out.toNonIndexed() : out), bc = new Brush(cut)
      bo.updateMatrixWorld(); bc.updateMatrixWorld()
      const ev2 = new Evaluator(); ev2.attributes = ['position', 'normal']
      out = ev2.evaluate(bo, bc, SUBTRACTION).geometry
      cut.dispose()
    }
  }
  return out
}

//  ── 터널 머리 여유 프로파일 — 검증·진단이 같은 정본을 소비한다 ──
//  천장 = 아치가 뚫린 구간에선 아치 크라운, 그 밖에선 계단 밑면.
export function tunnelHeadroom() {
  //  ⚠계단이 **있는 구간만** 잰다. 자르개는 발치보다 0.6 동쪽까지 나가지만 거기엔 계단이 없다
  //   (하강은 발치 동쪽 3.54를 하늘 아래 평지·계단으로 내려온다) — 그 구간을 '천장'으로 세면 허위 실패다.
  const P = archCutProfile().filter(q => q.x <= WSTAIR_X0 + 1e-9)
  return P.map(q => {
    const ceil = q.open ? q.crown : wstairTopAt(q.x)   // 안 뚫린 곳은 매스가 꽉 찼다(= 통행 불가)
    return { x: q.x, floor: descFloorAt(q.x), ceil, head: ceil - descFloorAt(q.x) }
  })
}


// ⛔★75-c 갈림판 '아래 단(段)'은 **폐기**(2026.07.26 현도: "왜 하나의 판이 아니며 단차가 있는가").
//  무릎길 마지막 참을 관 폭으로 넓혀 두 단으로 만들었으나, 단차 자체가 거슬린다는 판정.
//  → 대신 판(`JCT_PLATE_XHI`)을 동쪽으로 2.39 늘려 **하나의 평면 8.39**로 만들었다.
//  ⚠늘릴 수 있는 근거: `X_LAND_HI`(무릎길 목표)를 안 건드리므로 무릎길이 재유도되지 않는다.
//   상한은 판 위 층고 — x192.90에서 2.23, x193.50에서 1.94(실측).
//  ★무릎길에서 판으로 오르는 0.48은 판의 **동쪽 문턱**에 한 곳만 남는다(㊄-d).
export function apronSpec() {
  const K = kneeStairSpec()
  const L = K.landings[K.landings.length - 1]
  return { y: L.y, rise: JCT_PLATE_TOP - L.y, xThresh: JCT_PLATE_XHI }
}
//  문턱 계단 — 무릎길 참(폭 2)에서 판(폭 11)으로 오르는 한 자리. 폭은 판을 따른다.
export function apronSteps() {
  const A = apronSpec()
  if (A.rise <= 0.05) return []
  const n = Math.max(1, Math.round(A.rise / 0.19))          // R ≈ 무릎길과 같은 단높이
  const O = junctionPlateOutline()
  const half = O[O.length - 1].h
  const run = n * 0.24
  const T = []
  for (let i = 0; i < n; i++) {
    T.push({ x: A.xThresh + run - (i + 0.5) * (run / n), y: A.y + (i + 1) * (A.rise / n) - TREAD_THICK / 2,
             d: (run / n) * 1.17, w: 2 * half })
  }
  return T
}
export function buildJunctionApron() { return null }        // ⛔폐기 — 판이 흡수했다


// ════════════════════════════════════════════════════════════════════════════
//  ★75-h 방 입구를 **아치**로 (2026.07.26 현도: "아치 끝 출구가 직사각형이라 어색하다")
// ════════════════════════════════════════════════════════════════════════════
//  ⚠구판은 +x벽을 좌·우 조각 + 린텔 세 박스로 짜서 개구가 직사각이었다. 볼트를 지나온 몸이
//   마지막에 각진 문틀을 만나 어휘가 끊긴다.
//  ★모양이 어긋날 수 없게 **볼트와 같은 `archRing`을 쓴다** — 반지름·스프링라인 규칙이 한 곳에만 있다.
//   (치수를 따로 적어 두면 한쪽만 고쳐져 또 어긋난다 — 오늘 리브 구멍이 그렇게 어긋났다.)
export function roomMouthArch() {
  const floor = PASS_FLOOR_Y2
  //  ★75-m 문 크라운은 **살 밑면보다 낮을 수 없다.** 낮으면 그 차이만큼 살이 안 잘려
  //   문 안쪽 상단 모서리에 날개로 남는다(현도 적발 2026.07.26 — 실측 0.01~0.11).
  //   ⚠`RM_MOUTH_H`는 하한이지 확정값이 아니다. 기하가 더 요구하면 기하를 따른다.
  const crown = Math.max(floor + RM_MOUTH_H, ARCH_ROOM_CROWN)
  return { floor, crown, hw: PASS_HW + PASS_FUSE }
}
//  개구 자르개 — +x벽을 관통하는 아치 프리즘
export function roomMouthCutSolid() {
  const A = roomMouthArch()
  const ring = archRing({ floor: A.floor - 0.4, crown: A.crown }, A.hw)   // 바닥은 슬랩 속으로 물린다
  //  ⚠rotateY(+90°)는 (x,y,z) → (z, y, −x). 즉 **압출 깊이축이 새 x**가 되고 **Shape의 x가 새 z(부호 반전)**다.
  //   그래서 Shape에는 원하는 world z의 **음수**를 넣어야 한다. 1차 구현은 이걸 놓쳐 자르개가 벽에서
  //   1.2 벗어났고 감산이 아무것도 안 했다(결과 정점 36 = 순수 박스 — 부피만 보면 못 잡는다).
  const sh = new THREE.Shape()
  sh.moveTo(-(JCT_DN_Z + ring[0][0]), ring[0][1])
  for (const q of ring) sh.lineTo(-(JCT_DN_Z + q[0]), q[1])
  sh.closePath()
  const depth = (PASS_T + RM_MOUTH_REVEAL) * 3
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false })
  g.rotateY(Math.PI / 2)
  g.translate(RM_X1_G - PASS_T - RM_MOUTH_REVEAL, 0, 0)          // x ∈ [RM_X1−t, RM_X1−t+4t] → 벽(RM_X1~RM_X1+t)을 확실히 관통
  return g.toNonIndexed()
}
//  +x벽(입 구간 패널) — 한 장으로 짓고 아치를 감산한다
export function buildRoomMouthWall() {
  const A = roomMouthArch()
  const floor = PASS_FLOOR_Y2
  const zw = PASS_HW + PASS_T
  //  ★75-n 서쪽으로 RM_MOUTH_REVEAL만큼 두꺼워진다 — 문 위 리브 입술을 벽 안에 넣기 위함
  const th = PASS_T + RM_MOUTH_REVEAL
  const g = new THREE.BoxGeometry(th, RM_ROOF_G + 2 * PASS_T, 2 * zw)
  g.translate(RM_X1_G + PASS_T / 2 - RM_MOUTH_REVEAL / 2, floor + RM_ROOF_G / 2, JCT_DN_Z)
  const cut = roomMouthCutSolid()
  const ev = new Evaluator(); ev.attributes = ['position', 'normal']
  const a = new Brush(g.toNonIndexed()), b = new Brush(cut)
  a.updateMatrixWorld(); b.updateMatrixWorld()
  const out = ev.evaluate(a, b, SUBTRACTION).geometry
  g.dispose(); cut.dispose()
  return out
}


// ════════════════════════════════════════════════════════════════════════════
//  ★75-i 리브 구멍을 **아치 단면**으로 (2026.07.26 현도)
// ════════════════════════════════════════════════════════════════════════════
//  ⚠구판은 축정렬 **상자**였다. 곡면 껍질에 각진 사각 구멍이 남아, 방에서 돌아보면 껍질 잔재가
//   이상하게 잘린 판때기로 보였다(현도: "리브가 저 이상하게 잘린 부분을 감쌀 정도로만 뚫렸으면").
//  ★같은 `archRing`으로 자른다 — 남는 껍질 가장자리가 **문과 동심인 아치**가 된다.
//   ⚠상자보다 덜 파므로 살 막이 되살아날 수 있다 → `ARCH_*` 상한을 그대로 크라운으로 쓰고,
//    반폭에 여유(`ARCH_MARGIN`)를 준 뒤 **막 검사([413])로 확인**한다.
//  ★자르개의 **포함 판정** — 검사는 반드시 이걸 써야 한다. 박스로 재면 아치가 덜 파는데도 통과한다
//   (실제로 ★75-i에서 상자→아치로 바꾼 뒤 막 검사가 무효가 될 뻔했다).
export function inRibArchCut(x, y, z) {
  if (x < ARCH_X0 || x > ARCH_X1) return false
  const hw = (ARCH_Z1 - ARCH_Z0) / 2 + 0.25
  const crown = ribArchCrownAt(x)                    // ★x마다 다르다(★75-j)
  const spring = Math.max(ARCH_Y0 + 0.05, crown - hw)
  const zz = (z - JCT_DN_Z) / hw
  if (Math.abs(zz) > 1) return false
  if (y < ARCH_Y0) return false
  if (y <= spring) return true                       // 수직 벽 구간
  const yy = (y - spring) / (crown - spring)
  return yy <= 1 && zz * zz + yy * yy <= 1           // 볼트 구간(타원)
}

export function ribArchCutSolid() {
  const hw = (ARCH_Z1 - ARCH_Z0) / 2 + 0.25          // 창 반폭 + 여유
  const N = 40
  const P = []
  for (let i = 0; i <= N; i++) {
    const x = ARCH_X0 + (ARCH_X1 - ARCH_X0) * i / N
    P.push({ x, floor: ARCH_Y0, crown: ribArchCrownAt(x) })   // ★크라운이 x마다 내려온다(★75-j)
  }
  const R = P.map(q => archRing(q, hw))
  const M = R[0].length
  const C0 = R.map(r => { let z = 0, y = 0; for (const q of r) { z += q[0]; y += q[1] } return [z / r.length, y / r.length] })
  const V = (i, j) => [P[i].x, R[i][j][1], JCT_DN_Z + R[i][j][0]]
  const pos = []
  const push = (A, B2, Cc, out) => {
    const ux = B2[0]-A[0], uy = B2[1]-A[1], uz = B2[2]-A[2]
    const vx = Cc[0]-A[0], vy = Cc[1]-A[1], vz = Cc[2]-A[2]
    const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx
    const T = (nx*out[0] + ny*out[1] + nz*out[2]) < 0 ? [A, Cc, B2] : [A, B2, Cc]
    for (const q of T) pos.push(q[0], q[1], q[2])
  }
  for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < M; j++) {
    const j2 = (j + 1) % M
    const A = V(i, j), B2 = V(i + 1, j), Cc = V(i + 1, j2), D = V(i, j2)
    const cy = (C0[i][1] + C0[i+1][1]) / 2, cz = JCT_DN_Z + (C0[i][0] + C0[i+1][0]) / 2
    const mid = [0, (A[1]+B2[1]+Cc[1]+D[1])/4, (A[2]+B2[2]+Cc[2]+D[2])/4]
    const out = [0, mid[1] - cy, mid[2] - cz]
    push(A, B2, Cc, out); push(A, Cc, D, out)
  }
  for (const [i, ax] of [[0, -1], [P.length - 1, +1]])
    for (let j = 1; j < M - 1; j++) push(V(i, 0), V(i, j), V(i, j + 1), [ax, 0, 0])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

// ── ★79-7 방사 사다리꼴 판(2026.07.28) ─────────────────────────────────────────
//  왜 필요한가: 등불 방 벽이 **원뿔**이라, 그에 붙는 끝캡·문선이 직사각형이 아니라 **사다리꼴**이다.
//  박스로 만들면 위쪽 안쪽 모서리가 원뿔과 벌어진다(★79-6에서 실제로 1.73 벌어졌고, 문 자리에선 2.15였다).
//  corners = [[r,y], …] 을 방위 theta의 방사 평면에 놓고 접선 방향으로 thick 만큼 두껍게 뽑는다.
export function radialPlate(corners, thick, theta) {
  const sh = new THREE.Shape()
  sh.moveTo(corners[0][0], corners[0][1])
  for (let i = 1; i < corners.length; i++) sh.lineTo(corners[i][0], corners[i][1])
  sh.closePath()
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false })
  g.translate(0, 0, -thick / 2)          // 접선 방향으로 중심 맞춤
  g.rotateY(-theta)                      // 로컬 x = 방위 theta의 반경 방향
  return g
}
