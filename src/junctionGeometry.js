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
  X_LAND_LO, X_LAND_HI, Z_LAND, LAND_T, U_KNEE_END, H,
  JCT_KNOT_ON, JCT_KNOT_MODE, JCT_KNOT_D, JCT_KNOT_TOP, JCT_KNOT_INSET,
  JCT_PLATE_MODE, JCT_PLATE_FUSE, JCT_PLATE_SEG, rOf as rOfC,
  SHELL_RIB_R, RIB_WALL_ON, RIB_WALL_T,
  SHAFT_ON, SHAFT_MODE, SHAFT_R, SHAFT_R_TOP, SHAFT_HOLLOW, SHAFT_WALL_T, SHAFT_FUSE,
  SHAFT_GRATE_ON, SHAFT_GRATE_BAR, SHAFT_GRATE_GAP, SHAFT_GRATE_T,
  SHAFT_X, SHAFT_Z, LK_DISC_T, LK_DISC_LIFT, LK_DISC_DY, LK_PLAT_R, LK_DISC_DZ,
  U_LOOKOUT_END, rOf, PASS_FLOOR_Y, RM_ROOF, PASS_T,
  JCT_DN_Z, PASS_HW, RM_X1, PASS_X_DEEP, CHEEK_TOP_PZ, CHEEK_TOP_PZ_HI, CHEEK_PZ_RAKE_X0, CHEEK_PZ_RAKE_X1,
} from './constants.js'
import { innerTubeSolid } from './kneeBodyGeometry.js'

//  판 윗면 = JunctionLanding이 쓰는 값과 **같은 식**(사본 금지 — 판을 옮기면 매듭이 따라온다)
export const JCT_PLATE_TOP = U_KNEE_END * H + 0.1

// ── 매듭 매스의 스펙 한 벌 — 렌더·검증·진단이 같은 정본을 소비한다 ──
export function junctionKnotSpec() {
  const i = JCT_KNOT_INSET
  return {
    on: JCT_KNOT_ON,
    mode: JCT_KNOT_MODE,
    x0: X_LAND_LO + i, x1: X_LAND_HI - i,
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
  return out.geometry
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
function axisDistAt(x, y, z) {
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
    const x = X_LAND_LO + (X_LAND_HI - X_LAND_LO) * i / JCT_PLATE_SEG
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
  return g
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
    x0: RM_X1, x1: PASS_X_DEEP,
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
