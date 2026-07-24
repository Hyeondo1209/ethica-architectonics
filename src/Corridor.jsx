// Corridor.jsx — 탐험 통로(1p5의 집): 거대 원기둥 홀(벽+빗면 천장+창 ±43°) + 압축 박스 연결부
//   + 길(다리·플랫폼) + ★계단 다섯(㊳ 곡선 — #0만 리브 문에 닿음) + ★신전 대들보(TEMPLE_MODE).
//   ★1p5 재재설계 ㊳(2026.07.14): 슬릿·피어·리빌 잼 폐기 → 구 파노라마 창 ±43° 복원(다섯을 세워 무너뜨림).
//   유지: 박스 ㄷ′ 압축(BOX_IN_H=7) · 헤더 봉인 · 단면 동결 · PLAT_F 노브.
//   계단 기하의 정본 = corridorStairsGeometry.js(순수 빌더 — 판·참·간극 전부 저기서 파생).
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg'
import {
  COR_WALL_SEG, DOOR_HALF, COR_CX, COR_R, ceilY, domeClipY,
  neckBottomY, SKIRT_X0, SKIRT_X1,
  WIN_HALF, WIN_SILL_Y, WIN_TOP_Y,
  RAD_JX, RAD_JDOOR_HW, RAD_DOOR_H,
  BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  COR_Y0, COR_THICK, COR_FLOOR_HW,
  PLAT_X, PLAT_R, PLAT_Y, PILLAR_R,
  STAIR_TD, STAIR_W, COR_RISE,
  TEMPLE_MODE, TEMPLE_Y0, TEMPLE_X0, TEMPLE_X1, TEMPLE_HZ, TEMPLE_CLR, TEMPLE_PEDIMENT, TEMPLE_OPEN,
  FRIEZE_ROOM_ON, FR_FLOOR_T, FR_WALL_T, FR_BACK_T, FR_CEIL_T, FR_FLOOR_Y, FR_ANNEX,   // ★55 프리즈 방(1p7)
  CELLA_ON, CELLA_ZHW, CELLA_X1, CELLA_T, CELLA_ROOF_Y0, CELLA_ROOF_Y1, CELLA_ROOF_T, CELLA_BACK_ON, CELLA_BACK_Y1,
  INCA_ON, INCA_COLOR, INCA_W0, INCA_CHAMF, INCA_PANEL_T,
  CELLA_CLR, CELLA_BITE_R, CELLA_XW, CELLA_COLOR,
  CELLA_NICHE, CELLA_NICHE_DEPTH, CELLA_RELIEF_OUT, CELLA_NICHE_Y0, CELLA_NICHE_Y1,
  CELLA_NICHE_WBOT, CELLA_NICHE_WTOP, CELLA_STRATA_N,
  ALTAR_ON, ALTAR_SCOPE, ALTAR_ZHW, ALTAR_X_BACK, ALTAR_STEP1_X, ALTAR_STEP2_X,
  ALTAR_STEP1_H, ALTAR_STEP2_H, ALTAR_UNI_XW, ALTAR_COLOR,
  TIER_ON, TIER_CENTER, TIER_PROFILE, TIER_N, TIER_RMAX, TIER_RISE, TIER_COLOR,
  PIER_ON, PIER_N, PIER_HW, PIER_DEPTH, PIER_OUT, PIER_Y0, PIER_TOP_OVER, PIER_COLOR,
  INTAKE_ON, INTAKE_FORM, INTAKE_CX, INTAKE_HOLE_HW, INTAKE_LAYERS, INTAKE_RISE, INTAKE_SETBACK, INTAKE_WALL_T,
  INTAKE_FUNNEL_DROP, INTAKE_FUNNEL_RB, INTAKE_COLOR, INTAKE_GLOW,
  GAT_SEAT, GAT_CX, GAT_CROWN_R, GAT_CONE_H, GAT_CROWN_H, GAT_SLIT, GAT_FACETS, GAT_POSTS, GAT_POST_R, GAT_LID_T,
  PLAT_DROP, DESC_X0, DESC_X1,
  SHELL_RIB_R,
} from './constants'
import { buildHallStairs, hallDoors, incaStairSpec, incaBladesSpec, intakeSpec, INTAKE_IS_SLIT, gatSeal, descentSpec, woldaeSpec, drumPierAzimuths, descentPortSpec, portPrismTris, outwardTris } from './corridorStairsGeometry'
import {
  HALL_ENTRY, ASC_RISE, ASC_X0, ASC_X1, ASC_SLOPE, BOX_IN_H,
  DESC_HW, DESC_GIRDER, DESC_GIRDER_TOP, DESC_GIRDER_BWF,   // ★㊾·㊿·51 하강로
  WOLDAE_COLOR,                                             // ★54 월대
  COR_CYL_X0,
  ORB_R, ORB_CX, ORB_CY, ORB_T, ORB_FLOOR_Y, ORB_FLOOR_R, ORB_WEST_X, ORB_DOOR_W, ORB_DOOR_H,
  ORB_OPEN_X, ORB_RING_R, ORB_RING_T, ASC_TUN_T, ASC_TUN_UNDER,
} from './constants'

// ════════ ★진입 시퀀스(㊴): 수평 다리 → 하강 계단 → 낮은 플랫폼 ════════

// ── ★㊵-4 목 스커트(㊵ (4) 유지·동단 재앵커): 부양된 구 ↔ 지상 드럼 사이 목 밑 앞치마(위로 볼록) ──
export function NeckSkirt() {
  const geo = useMemo(() => {
    const N = 36, pos = [], idx = []
    for (let i = 0; i <= N; i++) {
      const x = SKIRT_X0 + (SKIRT_X1 - SKIRT_X0) * (i / N)
      const y = neckBottomY(x, BOX_HW)
      pos.push(x, y, -BOX_HW, x, y, BOX_HW)
      if (i < N) { const n = i * 2; idx.push(n, n + 1, n + 3, n, n + 3, n + 2) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx); g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#b89a6a" roughness={0.92} side={THREE.DoubleSide} />
    </mesh>
  )
}

//  ★㊴-5: 짧은 다리(입구 직후 끝) → **긴 하강 계단** → 깊은 결절 착지(DESC_X0/X1 정본은 constants).
export function Bridge() {
  //  ★㊾: 새 하강 두 체제는 박스 출구(BOX_X1 = ASC_X0)에서 곧장 시작 — 다리는 거기서 0.5 물려 끝난다.
  const xEnd = HALL_ENTRY === 'descent' ? DESC_X0 : ASC_X0 + 0.5
  return (
    <mesh position={[(BOX_X0 + xEnd) / 2, COR_Y0, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[xEnd - BOX_X0, COR_THICK, COR_FLOOR_HW * 2]} />
      <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}
export function DescentStairs() {
  const steps = useMemo(() => {
    const N = Math.max(2, Math.ceil(PLAT_DROP / COR_RISE))          // 단수(㊴-5 기본 42 — 단높이 ≈0.43)
    const dw = (DESC_X1 - DESC_X0) / N, rise = PLAT_DROP / N
    const arr = []
    for (let i = 0; i < N; i++) {
      // i번째 단: 상면 = 다리(49.3)에서 i+1단 내려감. 판 두께 COR_THICK(어휘 공유)
      arr.push({ x: DESC_X0 + (i + 0.5) * dw, yTop: COR_Y0 + COR_THICK / 2 - (i + 1) * rise, w: dw })
    }
    return arr
  }, [])
  return (
    <group>
      {steps.map((st, i) => (
        <mesh key={i} position={[st.x, st.yTop - COR_THICK / 2, 0]} userData={{ walkable: true }}>
          <boxGeometry args={[st.w + 0.06, COR_THICK, COR_FLOOR_HW * 2]} />
          <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ══ ★★㊵-5 진입 개편: 상승 계단 + 착지 + 부양 소구(막다른 방) — 구 하강계는 HALL_ENTRY 스위치로 잠금 ══
export function AscentStairs() {
  const steps = useMemo(() => {
    const N = Math.max(2, Math.ceil(ASC_RISE / COR_RISE))            // ≈24단(단높이 ≈0.42 — 하강 어휘 공유)
    const dw = (ASC_X1 - ASC_X0) / N, rise = ASC_RISE / N
    const arr = []   // ★㊵-5d: 디딤 = 통로 전폭(BOX_HW×2) — 밀폐 통로 바닥 틈 봉합
    for (let i = 0; i < N; i++) {
      arr.push({ x: ASC_X0 + (i + 0.5) * dw, yTop: COR_Y0 + COR_THICK / 2 + (i + 1) * rise, w: dw })
    }
    return arr
  }, [])
  return (
    <group>
      {steps.map((st, i) => (
        <mesh key={i} position={[st.x, st.yTop - COR_THICK / 2, 0]} userData={{ walkable: true }}>
          <boxGeometry args={[st.w + 0.06, COR_THICK, BOX_HW * 2 - 0.2]}  />
          <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
//  소구(★㊵-5b → ★㊶-4 개구화): 셸 = (외구 − 내구 − 서쪽 아치 문) 을 컷 평면(x=ORB_OPEN_X)으로 이분한 뒤
//  서쪽만 남긴다 — 동쪽(리브 방향)은 셸을 만들지 않아 '뻥 뚫린 개구'(구 유리 캐노피 = 렉 → 폐기). 경계 = 원형 테(토러스, 축 x)가 창틀.
//  창살 배제 의도: 곡면 세로 살 = 리브 어휘 혼동 위험(§ LOCKED). CSG 정공법. 바닥 = 중심 아래 현 원반.
//  ★★㊵-5f 상승 덕트 → ★㊵-5g 뿌리 연장(현도 "아직 틈"): 한 덩어리 기울어진 각관, 서단을 드럼 벽에 박음.
//  진단: 덕트가 123.5에서 시작해 벽(120.2)까지 안 닿아 — 그 사이는 박스 얇은 판뿐이라 다리 옆 띠(z 2.5~6)·
//  입 아래 슬롯으로 밑이 노출. 해법 = 서단을 벽면 −0.5 물림까지 연장: 벽 트임([101,108.6]×±5.49)이 덕트
//  입(±6.1×[보행−0.55,+7.05])보다 '작아서' 벽이 입 사방을 액자처럼 덮는다. 박스 동단·다리·계단 시작은 관 속.
//  보이드 단면은 박스(±6·내부고 7)보다 0.1 크게 — 박스 판이 관 속 라이너가 되어 z-파이팅 없음.
export function AscentTunnel() {
  const geo = useMemo(() => {
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const ang = Math.atan(ASC_SLOPE)
    const x0 = COR_CYL_X0 - 0.5, x1 = ORB_CX          // ★㊵-5g 서단 = 드럼 벽 −0.5 물림(소켓)
    const midX = (x0 + x1) / 2
    const midW = COR_Y0 + COR_THICK / 2 + (midX - ASC_X0) * ASC_SLOPE   // 경사선상 보행고(중점 — ASC_X0 서쪽은 연장선)
    const box = (len, h, w, yOff) => {
      const g = new THREE.BoxGeometry(len, h, w)
      g.rotateZ(ang)
      g.translate(midX, midW + yOff, 0)
      const b = new Brush(g); b.updateMatrixWorld(); return b
    }
    const L = (x1 - x0) / Math.cos(ang)
    const IN_EPS = 0.1, IN_UP = BOX_IN_H + 0.05       // 라이너 여유(폭 +0.1 · 천장 +0.05)
    const hOut = ASC_TUN_UNDER + IN_UP + ASC_TUN_T
    const hIn = IN_UP + 0.55                          // 보이드 밑 = 보행선 −0.55(디딤 하부 0.05 매몰 = 융착)
    let acc = box(L, hOut, (BOX_HW + IN_EPS + ASC_TUN_T) * 2, (IN_UP + ASC_TUN_T - ASC_TUN_UNDER) / 2)
    acc = ev.evaluate(acc, box(L + 8, hIn, (BOX_HW + IN_EPS) * 2, (IN_UP - 0.55) / 2), SUBTRACTION)   // 양끝 관통
    const orb = new Brush(new THREE.SphereGeometry(ORB_R - 0.05, 48, 32).translate(ORB_CX, ORB_CY, 0))
    orb.updateMatrixWorld()
    acc = ev.evaluate(acc, orb, SUBTRACTION)
    return acc.geometry
  }, [])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#b89a6a" roughness={0.92} side={THREE.DoubleSide} />
    </mesh>
  )
}

export function OrbRoom() {
  const { shellGeo, ringGeo, floorGeo } = useMemo(() => {
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const mk = (g, x, y, z) => { g.translate(x, y, z); const b = new Brush(g); b.updateMatrixWorld(); return b }
    const hollow = () => {
      let a = mk(new THREE.SphereGeometry(ORB_R, 48, 32), ORB_CX, ORB_CY, 0)
      return ev.evaluate(a, mk(new THREE.SphereGeometry(ORB_R - ORB_T, 48, 32), ORB_CX, ORB_CY, 0), SUBTRACTION)
    }
    const BIG = ORB_R * 2 + 4
    //  ★㊶-4 서쪽 셸만: 중공구 − 아치 − (동쪽 반공간). 동쪽 캡은 '만들지 않음' = 뻥 뚫린 개구(유리 없음 = 렉 0).
    let west = hollow()
    const rectH = ORB_DOOR_H - ORB_DOOR_W / 2
    const box = new THREE.BoxGeometry(8, rectH, ORB_DOOR_W)
    west = ev.evaluate(west, mk(box, ORB_WEST_X, ORB_FLOOR_Y + rectH / 2, 0), SUBTRACTION)
    const cylv = new THREE.CylinderGeometry(ORB_DOOR_W / 2, ORB_DOOR_W / 2, 8, 24)
    cylv.rotateZ(Math.PI / 2)
    west = ev.evaluate(west, mk(cylv, ORB_WEST_X, ORB_FLOOR_Y + rectH, 0), SUBTRACTION)
    west = ev.evaluate(west, mk(new THREE.BoxGeometry(BIG, BIG, BIG), ORB_OPEN_X + BIG / 2, ORB_CY, 0), SUBTRACTION)
    const shellGeo = west.geometry
    //  경계 테: 토러스(축 x — rotateY로 눕힘), 뚫린 컷 원둘레에 물려 셸 단면(두께)을 감싸는 프레임(조종석 창틀)
    const ringGeo = new THREE.TorusGeometry(ORB_RING_R, ORB_RING_T, 12, 64)
    ringGeo.rotateY(Math.PI / 2)
    ringGeo.translate(ORB_OPEN_X, ORB_CY, 0)
    //  바닥 원반: 셸 중간살까지 물림(r = √((R−T/2)² − DROP²))
    const fr = Math.sqrt((ORB_R - ORB_T / 2) ** 2 - (ORB_CY - ORB_FLOOR_Y) ** 2)
    const floorGeo = new THREE.CylinderGeometry(fr, fr, COR_THICK, 48)
    floorGeo.translate(ORB_CX, ORB_FLOOR_Y - COR_THICK / 2, 0)
    return { shellGeo, ringGeo, floorGeo }
  }, [])
  return (
    <group>
      <mesh geometry={shellGeo}>
        <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ringGeo}>
        <meshStandardMaterial color="#a98f5e" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={floorGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ════════ ★계단 다섯(㊴-7) — 절곡(flight) / 극좌표(polar) 문법. 판 = 얇은 부양 판 · 참 = 넓은 판 ════════
// ══ ★★㊾→㊿ 하강로 렌더러 — 'axial' / 'lateral' 공용 ══
//  ㊿(2026.07.23): ㊾ 판-만 체제를 셀프 렌더 검수로 자가 반려("색종이 행렬" — 현도 지적과 일치) →
//  §2-D 문법의 첫 시범작으로 **몸**을 입힘. 구성 3층(두께 위계 = 걷는 것 < 받치는 것 < 매듭):
//   ① 디딤 판(COR_RISE 0.43·보행 정본 — ㊾ 그대로, 충돌·검증 무변경)
//   ② **보(스트링거)**: 폴리패스 표본을 따라 사다리꼴 단면(상폭 2HW·하폭 ×BWF)을 스윕한 한 덩어리.
//      상면 = 보행선 − TOP(0.30)이라 판(0.43)이 0.13 파묻혀 융착 — 판 밑 틈이 구조적으로 없다.
//   ③ ★51: 참 블록 폐지(현도 07.23 — "기하와 안 맞물리는 투박한 매듭") → 경로가 전 구간 접선
//      연속(진입·꼬리 쌍원호)이 되어 매듭 자체가 불필요. 판 + 보 두 층만 남는다.
export function DescentPath() {
  const d = useMemo(() => descentSpec(HALL_ENTRY), [])
  const girderGeo = useMemo(() => {
    const sec = [                                     // 단면(로컬 u=횡, v=보행선 기준 종): 사다리꼴 배
      [-DESC_HW, -DESC_GIRDER_TOP], [DESC_HW, -DESC_GIRDER_TOP],
      [DESC_HW * DESC_GIRDER_BWF, -DESC_GIRDER], [-DESC_HW * DESC_GIRDER_BWF, -DESC_GIRDER],
    ]
    const S = d.samples
    const pt = (i, j) => {                            // 표본 i의 단면점 j — 횡벡터 = 수평 법선(-tz, 0, tx)
      const q = S[i], [u, v] = sec[j]
      return [q.x + u * -q.tz, q.y + v, q.z + u * q.tx]
    }
    const pos = []
    const push = (a, b, c) => pos.push(...a, ...b, ...c)
    for (let i = 0; i < S.length - 1; i++)
      for (let j = 0; j < 4; j++) {
        const a = pt(i, j), b = pt(i, (j + 1) % 4), c = pt(i + 1, (j + 1) % 4), e = pt(i + 1, j)
        push(a, b, c); push(a, c, e)
      }
    for (const [i, flip] of [[0, 0], [S.length - 1, 1]]) {   // 양끝 캡(시작 = 박스 목 소켓 · 끝 = 잉카 판 물림)
      const p4 = [0, 1, 2, 3].map(j => pt(i, j))
      if (flip) { push(p4[0], p4[1], p4[2]); push(p4[0], p4[2], p4[3]) }
      else { push(p4[2], p4[1], p4[0]); push(p4[3], p4[2], p4[0]) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()                          // 비공유 정점 = 면 법선(플랫) — 브루탈 어휘
    return g
  }, [d])
  return (
    <group>
      <mesh geometry={girderGeo}>
        <meshStandardMaterial color="#b89a6a" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {d.plates.filter(p => !p.onWoldae).map((p, i) => (
        <mesh key={i} position={[p.x, p.yTop - COR_RISE / 2, p.z]} rotation-y={p.rotY}
          userData={{ walkable: true }}>
          <boxGeometry args={[d.ds * 1.3, COR_RISE, DESC_HW * 2]} />
          <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

//  ★54 월대(月臺) — 박스 목의 전경 단. 벽에서 뻗은 **한 덩어리 코벨 매스**(낱개 까치발 금지 = §2-C).
//   단면(x–y) 압출: 상면 평평 → 동단 수직면 → 위로 볼록한 다면 밑면 → 벽 안쪽 뿌리.
//   ⚠판(하강로)은 월대 발자국 안에서 생략된다(위 filter) — 월대 상면이 이미 걷는 면이다.
export function Woldae() {
  const w = useMemo(() => woldaeSpec(), [])
  //  ★54-2 노치 도입으로 구축 전환: 정거장 잇기 → **평면 윤곽 삼각분할 + 옆면 스윕**.
  //   윤곽 하나가 상면·밑면·옆면·립·발자국 판정의 공통 정본이라, 노치 형상을 바꿔도 전부 따라온다.
  const geo = useMemo(() => {
    if (!w.on) return null
    const C2 = w.contour
    const v2 = C2.map(p => new THREE.Vector2(p.x, p.z))
    const faces = THREE.ShapeUtils.triangulateShape(v2, [])
    const top = C2.map(p => [p.x, w.yTop, p.z])
    const bot = C2.map(p => [p.x, w.underY(p.x), p.z])
    const pos = []
    const tri = (a, b, c) => pos.push(...a, ...b, ...c)
    for (const [i, j, k] of faces) { tri(top[i], top[j], top[k]); tri(bot[k], bot[j], bot[i]) }
    for (let i = 0; i < C2.length; i++) {                       // 옆면(뿌리 캡 포함 — 윤곽이 한 바퀴라 자동)
      const j = (i + 1) % C2.length
      tri(top[i], bot[i], bot[j]); tri(top[i], bot[j], top[j])
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()                                    // 비공유 정점 = 면 법선(플랫) — 보와 같은 브루탈 어휘
    return g
  }, [w])
  //  립 = 동단·노치 폴리라인을 따라 스윕(노치를 파도 립이 그 곡선을 그대로 돈다).
  //   ⚠안쪽 방향 = 진행 방향의 오른쪽(윤곽이 시계 방향이라 오른쪽이 매스 쪽) — 직선·원호 공통.
  const rimGeo = useMemo(() => {
    if (!w.on || w.rim <= 0) return null
    const E = w.contour.slice(w.eastFrom, w.eastTo + 1)
    if (E.length < 2) return null
    const d = w.rim * 2, y0 = w.yTop - 0.05, y1 = w.yTop + w.rim
    const nrm = E.map((_, i) => {                               // 정점별 평균 법선(코너 미터 근사)
      const a = E[Math.max(0, i - 1)], b = E[Math.min(E.length - 1, i + 1)]
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1
      return [dz / L, -dx / L]
    })
    const ring = (i) => {
      const p = E[i], n = nrm[i]
      return [[p.x, y0, p.z], [p.x, y1, p.z],
              [p.x + n[0] * d, y1, p.z + n[1] * d], [p.x + n[0] * d, y0, p.z + n[1] * d]]
    }
    const pos = []
    const tri = (a, b, c) => pos.push(...a, ...b, ...c)
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e) }
    for (let i = 0; i < E.length - 1; i++) {
      const A = ring(i), B = ring(i + 1)
      for (let j = 0; j < 4; j++) quad(A[j], A[(j + 1) % 4], B[(j + 1) % 4], B[j])
    }
    for (const i of [0, E.length - 1]) {                        // 양끝 마구리
      const A = ring(i)
      quad(A[0], A[1], A[2], A[3])
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }, [w])
  //  ★54-3 상승단 — 하단(월대) 위에 얹는 상단 + 계단. 얹기 구성이라 하단 기하를 안 건드린다.
  const riseGeo = useMemo(() => {
    const r = w.rise
    if (!w.on || !r) return null
    const pos = []
    const tri = (a, b, c) => pos.push(...a, ...b, ...c)
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e) }
    //  상단 판: 'all'은 윤곽을 x≥podWest로 잘라 쓰고(사다리꼴·노치 그대로 따라감), 그 외엔 직사각
    let poly
    if (r.form === 'all') {
      const out = []                                    // 반평면 x ≥ c 클립(Sutherland–Hodgman)
      const C3 = w.contour, c = r.podWest
      for (let i = 0; i < C3.length; i++) {
        const A = C3[i], B = C3[(i + 1) % C3.length]
        const inA = A.x >= c, inB = B.x >= c
        if (inA) out.push(A)
        if (inA !== inB) { const t = (c - A.x) / (B.x - A.x); out.push({ x: c, z: A.z + (B.z - A.z) * t }) }
      }
      poly = out
    } else {
      poly = [{ x: r.podWest, z: -r.podW }, { x: r.podEast, z: -r.podW },
              { x: r.podEast, z: r.podW }, { x: r.podWest, z: r.podW }]
    }
    if (poly.length >= 3) {
      const v2 = poly.map(p => new THREE.Vector2(p.x, p.z))
      const fcs = THREE.ShapeUtils.triangulateShape(v2, [])
      const top = poly.map(p => [p.x, r.top, p.z]), bot = poly.map(p => [p.x, w.yTop, p.z])
      for (const [i, j, k] of fcs) { tri(top[i], top[j], top[k]); tri(bot[k], bot[j], bot[i]) }
      for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length
        quad(top[i], bot[i], bot[j], top[j]) }
    }
    for (let k = 1; k <= r.n; k++) {                    // 계단 — 단마다 한 켜씩 쌓아 올린다
      const xa = r.stairW + (k - 1) * r.run, xb = xa + r.run
      const zw = Math.min(r.podW, w.hwAt((xa + xb) / 2))
      const yt = w.yTop + r.stepH * k
      const P = [[xa, yt, -zw], [xb, yt, -zw], [xb, yt, zw], [xa, yt, zw]]
      const Q = P.map(q => [q[0], w.yTop, q[2]])
      tri(P[0], P[1], P[2]); tri(P[0], P[2], P[3])      // 디딤면
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(P[i], Q[i], Q[j], P[j]) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }, [w])
  if (!geo) return null
  return (
    <group>
      <mesh geometry={geo} userData={{ walkable: true }}>
        <meshStandardMaterial color={WOLDAE_COLOR} roughness={0.93} side={THREE.DoubleSide} />
      </mesh>
      {riseGeo && (
        <mesh geometry={riseGeo} userData={{ walkable: true }}>
          <meshStandardMaterial color={WOLDAE_COLOR} roughness={0.93} side={THREE.DoubleSide} />
        </mesh>
      )}
      {rimGeo && (
        <mesh geometry={rimGeo}>
          <meshStandardMaterial color={WOLDAE_COLOR} roughness={0.93} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

export function CorridorStairs() {
  const { stairs } = useMemo(() => buildHallStairs(), [])
  return (
    <group>
      {stairs.map((st) => (
        <group key={st.k}>
          {st.plates.map((p, i) => (
            <mesh key={i} position={[p.x, p.yTop - COR_RISE / 2, p.z]} rotation-y={p.rotY}
              userData={{ walkable: true }}>
              <boxGeometry args={[STAIR_TD, COR_RISE, STAIR_W]} />
              <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {st.landings.map((ld, i) => (
            <mesh key={'ld' + i} position={[ld.x, ld.yTop - COR_RISE / 2, ld.z]} rotation-y={ld.rotY}
              userData={{ walkable: true }}>
              <boxGeometry args={[2.4, COR_RISE, STAIR_W + 0.8]} />
              <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ════════ ★신전 프리즈(㊳ 대들보 → ㊴ 확장) — 창 상부(y=TEMPLE_Y0~빗면 천장)를 통째로 채우는 수평 부재 ════════
//  ㊴ 현도 소견 3: 부재 위로 리브가 드러나면 신전 느낌이 죽는다 → 부재를 천장까지 채워 '가림'(리브 무절단 = LOCKED 무결).
//  상면 = 빗면 천장 정합(ceilY(x) − 0.02 — 천장 위 돌출 없음 = 회랑·테라스 조감 무오염). 리브 다섯 관통 구멍 유지(부재 안 = 불가시).
export function TempleBeam() {
  const geo = useMemo(() => {
    if (TEMPLE_MODE === 'off') return null
    // 상면이 x방향 경사인 육면체 — BoxGeometry를 만들어 상면 4정점만 빗면으로 이동
    const beam = new THREE.BoxGeometry(TEMPLE_X1 - TEMPLE_X0, 1, TEMPLE_HZ * 2)
    beam.translate((TEMPLE_X0 + TEMPLE_X1) / 2, TEMPLE_Y0 + 0.5, 0)
    const pos = beam.attributes.position
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > TEMPLE_Y0 + 0.5) pos.setY(i, ceilY(pos.getX(i)) - 0.02)   // 상면 → 빗면 천장 밑
    }
    beam.computeVertexNormals()
    // 리브 다섯 관통 구멍(CSG SUBTRACTION — 리브가 물리적으로 지나간다. 부재 안이라 보이지 않을 뿐)
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    let acc = new Brush(beam); acc.updateMatrixWorld()
    // ── ★㊺ 밑면 개구(삼각/아치) — 가운데(z=0) 위로 파 리브 #0 드러냄 ──
    //  삼각: z–y 삼각 단면(가운데 y=Y0+OPEN 꼭짓점, 양끝 y=Y0)을 x로 압출한 프리즘을 밑에서 감산.
    //  아치: x축 원기둥(반경 조정 = 가운데 OPEN·양끝 0에 맞춤)을 감산. 둘 다 밑면 아래로 넉넉히 뻗어 확실히 뚫음.
    if (TEMPLE_PEDIMENT !== 'flat' && TEMPLE_OPEN > 0) {
      const xMid = (TEMPLE_X0 + TEMPLE_X1) / 2, xLen = TEMPLE_X1 - TEMPLE_X0 + 4
      if (TEMPLE_PEDIMENT === 'tri') {
        // 삼각 프리즘: 단면(z,y) = 밑변(z −HZ~HZ, y=Y0−4 아래로) + 꼭짓점(z=0, y=Y0+OPEN)
        const sh = new THREE.Shape()
        sh.moveTo(-TEMPLE_HZ, TEMPLE_Y0 - 6); sh.lineTo(TEMPLE_HZ, TEMPLE_Y0 - 6)
        sh.lineTo(TEMPLE_HZ, TEMPLE_Y0); sh.lineTo(0, TEMPLE_Y0 + TEMPLE_OPEN); sh.lineTo(-TEMPLE_HZ, TEMPLE_Y0)
        sh.closePath()
        const g = new THREE.ExtrudeGeometry(sh, { depth: xLen, bevelEnabled: false })
        g.rotateY(Math.PI / 2); g.translate(xMid - xLen / 2, 0, 0)   // 압출 z→x, 중앙 정렬(rotateY 후 x=0~xLen이므로 −xLen/2)
        const b = new Brush(g); b.updateMatrixWorld()
        acc = ev.evaluate(acc, b, SUBTRACTION)
      } else {
        // 아치: 반원 단면(z,y) — 가운데 y=Y0+OPEN, 양끝(z=±HZ) y=Y0. 타원 반원을 폴리곤으로.
        const sh = new THREE.Shape()
        sh.moveTo(-TEMPLE_HZ, TEMPLE_Y0 - 6); sh.lineTo(TEMPLE_HZ, TEMPLE_Y0 - 6); sh.lineTo(TEMPLE_HZ, TEMPLE_Y0)
        const NA = 40
        for (let i = 0; i <= NA; i++) {
          const z = TEMPLE_HZ - 2 * TEMPLE_HZ * (i / NA), t = z / TEMPLE_HZ
          sh.lineTo(z, TEMPLE_Y0 + TEMPLE_OPEN * Math.sqrt(Math.max(0, 1 - t * t)))
        }
        sh.closePath()
        const g = new THREE.ExtrudeGeometry(sh, { depth: xLen, bevelEnabled: false })
        g.rotateY(Math.PI / 2); g.translate(xMid - xLen / 2, 0, 0)
        const b = new Brush(g); b.updateMatrixWorld()
        acc = ev.evaluate(acc, b, SUBTRACTION)
      }
    }
    // ── ★55-3 뒤 별채 — 아치 크라운 위에만 얹어 동쪽으로 채운다(아치 터널·배경벽 무변경) ──
    if (FRIEZE_ROOM_ON && FR_ANNEX > 0) {
      const ax0 = TEMPLE_X1, ax1 = TEMPLE_X1 + FR_ANNEX, ay0 = TEMPLE_Y0 + TEMPLE_OPEN
      const an = new THREE.BoxGeometry(ax1 - ax0, 1, TEMPLE_HZ * 2)
      an.translate((ax0 + ax1) / 2, ay0 + 0.5, 0)
      const ap = an.attributes.position
      for (let i = 0; i < ap.count; i++) if (ap.getY(i) > ay0 + 0.5) ap.setY(i, ceilY(ap.getX(i)) - 0.02)
      an.computeVertexNormals()
      const b = new Brush(an); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, ADDITION)
    }
    // ── ★55 프리즈 방(1p7) — 부재 속을 파낸다. 아치·리브 구멍과 같은 감산 패턴 ──
    //  바닥 = 파낸 자리의 아래에 남는 재료 → **밑면이 아치 등 그대로**(§2-D ② 매스+깎인 밑면, 공짜로 얻는다).
    //  천장 = 빗면 추종(부재 상면과 같은 방식으로 상면 4정점만 이동) → 동쪽이 높은 방.
    //  ⚠앞벽(홀 쪽)·옆벽·뒷벽을 FR_WALL_T 남겨 밀폐. 바닥은 FR_FLOOR_T가 봉인을 담당(검증 강제).
    if (FRIEZE_ROOM_ON) {
      const rx0 = TEMPLE_X0 + FR_WALL_T, rx1 = TEMPLE_X1 + FR_ANNEX - FR_BACK_T   // ★55-2·3 뒷벽 따로 + 별채
      const rzh = TEMPLE_HZ - FR_WALL_T, ry0 = FR_FLOOR_Y
      const room = new THREE.BoxGeometry(rx1 - rx0, 1, rzh * 2)
      room.translate((rx0 + rx1) / 2, ry0 + 0.5, 0)
      const rp = room.attributes.position
      for (let i = 0; i < rp.count; i++) {
        if (rp.getY(i) > ry0 + 0.5) rp.setY(i, ceilY(rp.getX(i)) - 0.02 - FR_CEIL_T)   // 상면 → 빗면 천장 밑 −두께
      }
      room.computeVertexNormals()
      const b = new Brush(room); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    const holeTop = ceilY(TEMPLE_X1) + 2
    for (const d of hallDoors()) {
      const hole = new THREE.CylinderGeometry(SHELL_RIB_R + TEMPLE_CLR, SHELL_RIB_R + TEMPLE_CLR, holeTop - TEMPLE_Y0 + 4, 24)
      hole.translate(d.cx, (TEMPLE_Y0 + holeTop) / 2, d.cz)
      const b = new Brush(hole); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    return acc.geometry
  }, [])
  if (!geo) return null
  return (
    <mesh geometry={geo} userData={{ walkable: true }}>
      <meshStandardMaterial color="#b89a6a" roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ════════ ★셀라(CELLA, ㊶ 2026.07.20 현도 안) — 창 밖 배경 상자: 서면(창 쪽)만 뚫린 직육면체가 다섯 리브를 감싼다 ════════
//  왜: 창 너머 리브 틈으로 하늘이 비쳐 신전 파사드가 희석(§7 ⑦) + 계단 창가 끝단에서 먼 리브 동시 15 노출.
//  상자 내벽이 배경이 되면 둘 다 기하로 소멸(보이는 리브 = 다섯뿐 — check_corridor O절 봉인).
//  구축 = CSG 한 덩어리: (옆벽 2 + 동벽 + 지붕) 유니온
//         − 드럼 내부 원기둥(CELLA_BITE_R — 곡벽 물림 봉인 + 홀 안쪽 지느러미 절제를 한 수로)
//         − 리브 구멍 5(프리즈 구멍과 동축·동반경 → 리브가 지붕을 '관통', pierce 어휘 = LOCKED 무결).
//  시선 봉인 논리(O절 주석과 쌍): y<지붕은 옆벽·동벽·지붕이, y≥TEMPLE_Y0는 기존 프리즈가 막는다 —
//  지붕 상면을 프리즈 밑면에 0.2 매몰시켜 그 사이 띠(x 295~300 위)로 새던 상향 시선까지 닫는다.
export function Cella() {
  const geo = useMemo(() => {
    if (!CELLA_ON) return null
    const ev = new Evaluator(); ev.attributes = ['position', 'normal']
    const xOut = CELLA_X1 + CELLA_T, zOut = CELLA_ZHW + CELLA_T
    const yTop = CELLA_ROOF_Y1, yBot = -0.5                       // 밑단은 지면에 살짝 매몰(바닥 이음 봉인)
    const slab = (x0, x1, y0, y1, z0, z1) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
      const b = new Brush(g); b.updateMatrixWorld(); return b
    }
    let acc = slab(CELLA_XW, xOut, yBot, yTop, CELLA_ZHW, zOut)                    // 옆벽 +z
    acc = ev.evaluate(acc, slab(CELLA_XW, xOut, yBot, yTop, -zOut, -CELLA_ZHW), ADDITION)  // 옆벽 −z
    acc = ev.evaluate(acc, slab(CELLA_X1, xOut, yBot, yTop, -zOut, zOut), ADDITION)        // 동벽(원래 — 옆벽과 ±zOut 봉합)
    // ★㊻ 개구 배경 봉인: 개구는 프리즈에 뚫려 있고 프리즈 뒷면 = TEMPLE_X1(295). 배경벽을 셀라 동벽(300)에
    //  두면 개구 뒷면(295)과 5 떨어져 그 사이로 배경이 비친다(현도 지적 "개구에 벽이 밀착 안 됨").
    //  → 배경벽 앞면을 프리즈 뒷면(TEMPLE_X1)에 밀착(−1 겹침)시켜 개구 바로 뒤를 막는다. z는 옆벽 안쪽(±CELLA_ZHW).
    if (CELLA_BACK_ON && CELLA_BACK_Y1 > yTop) {
      acc = ev.evaluate(acc, slab(TEMPLE_X1 - 0.5, xOut, yTop - 0.5, CELLA_BACK_Y1, -CELLA_ZHW, CELLA_ZHW), ADDITION)
    }
    acc = ev.evaluate(acc, slab(CELLA_XW, xOut, CELLA_ROOF_Y0, yTop, -zOut, zOut), ADDITION) // 지붕(밑면 = 프리즈 밑면 114)
    { // 드럼 내부 절제 — 곡벽(두께 0 셸) 물림·안쪽 지느러미 소거
      const bite = new THREE.CylinderGeometry(CELLA_BITE_R, CELLA_BITE_R, 300, 96)
      bite.translate(COR_CX, 140, 0)
      const b = new Brush(bite); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    if (TEMPLE_MODE !== 'off') {
      // ★㊶-2 프리즈 발자국 절제 — 지붕 밑면(114)이 프리즈 밑면과 동일 평면이 되면서 발자국이 겹치면
      //  z파이팅. 프리즈가 덮는 곳엔 지붕을 두지 않는다(밑면이 서로 '이어 붙는' 타일링) → 바이트 원호
      //  모서리는 전부 프리즈 발자국 안 = 불가시(㊶-1의 '곡선 띠' 소거). ⚠프리즈 off면 절제도 끈다
      //  (단 상부 봉인 자체가 프리즈 전제 — 셀라는 TEMPLE_MODE 'beam'과 한 세트, O절이 강제).
      const fz = new THREE.BoxGeometry(TEMPLE_X1 - TEMPLE_X0, CELLA_ROOF_T + 2, TEMPLE_HZ * 2)
      fz.translate((TEMPLE_X0 + TEMPLE_X1) / 2, CELLA_ROOF_Y0 + CELLA_ROOF_T / 2, 0)
      const b = new Brush(fz); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    // ── ★㊸ 배경 깊이: 음각(안 뚫는 얕은 파임) / 양각(벽면 돌출) — 현도 "벽을 뚫지 말고" ──
    //  리브 사이 중점 z(±12.6, ±37.6)에 정렬 → 리브 기둥 사이로 배경 사건이 보인다.
    //  음각(intaglio) = 동벽 안쪽면에서 DEPTH(<벽두께)만 감산(뒤로 안 뚫음). 양각(relief) = 안쪽면에서
    //  홀 방향으로 OUT만 가산(부조 = 튀어나옴). strata = 수평 띠 감산. ⚠구멍·프리즈 봉인 무변.
    const nichePoly = (wb, wt, y0, y1) => {                     // 사다리꼴 단면 폴리곤(z–y)
      const sh = new THREE.Shape()
      sh.moveTo(-wb, y0); sh.lineTo(wb, y0); sh.lineTo(wt, y1); sh.lineTo(-wt, y1); sh.closePath()
      return sh
    }
    if (CELLA_NICHE === 'intaglio' || CELLA_NICHE === 'relief') {
      const slots = [-37.6, -12.6, 12.6, 37.6]
      const wb = CELLA_NICHE_WBOT / 2, wt = CELLA_NICHE_WTOP / 2
      for (const z of slots) {
        const sh = nichePoly(wb, wt, CELLA_NICHE_Y0, CELLA_NICHE_Y1)
        if (CELLA_NICHE === 'intaglio') {
          // 음각: 안쪽면(CELLA_X1)에서 동쪽으로 DEPTH만 파기 — 벽 두께(CELLA_T=2) 안이라 뒤로 안 뚫림
          const g = new THREE.ExtrudeGeometry(sh, { depth: CELLA_NICHE_DEPTH, bevelEnabled: false })
          g.rotateY(Math.PI / 2)                                // 압출 z(0~DEPTH) → 월드 x
          g.translate(CELLA_X1 - 0.02, 0, z)                    // 안쪽면 −0.02(면 겹침)에서 동쪽으로
          const b = new Brush(g); b.updateMatrixWorld()
          acc = ev.evaluate(acc, b, SUBTRACTION)
        } else {
          // 양각: 안쪽면에서 홀 방향(서쪽)으로 OUT만 돌출 — 가산(리브 구멍보다 먼저 = 구멍이 부조도 뚫음)
          const g = new THREE.ExtrudeGeometry(sh, { depth: CELLA_RELIEF_OUT, bevelEnabled: false })
          g.rotateY(-Math.PI / 2)                               // 압출 z → 월드 −x(홀 방향)
          g.translate(CELLA_X1 + 0.02, 0, z)                    // 안쪽면 +0.02에서 서쪽으로 튀어나옴
          const b = new Brush(g); b.updateMatrixWorld()
          acc = ev.evaluate(acc, b, ADDITION)
        }
      }
    } else if (CELLA_NICHE === 'rect') {
      const slots = [-37.6, -12.6, 12.6, 37.6]
      const cy = (CELLA_NICHE_Y0 + CELLA_NICHE_Y1) / 2, hy = CELLA_NICHE_Y1 - CELLA_NICHE_Y0
      for (const z of slots) {
        const g = new THREE.BoxGeometry(CELLA_NICHE_DEPTH, hy, CELLA_NICHE_WBOT)
        g.translate(CELLA_X1 - 0.02 + CELLA_NICHE_DEPTH / 2, cy, z)
        const b = new Brush(g); b.updateMatrixWorld()
        acc = ev.evaluate(acc, b, SUBTRACTION)
      }
    } else if (CELLA_NICHE === 'strata') {
      const hy = CELLA_NICHE_Y1 - CELLA_NICHE_Y0, gap = hy / (CELLA_STRATA_N * 2 - 1)
      for (let i = 0; i < CELLA_STRATA_N; i++) {
        const y0 = CELLA_NICHE_Y0 + i * 2 * gap, dep = CELLA_NICHE_DEPTH * (1 - i * 0.18)
        const g = new THREE.BoxGeometry(dep, gap, CELLA_ZHW * 2 - 6)
        g.translate(CELLA_X1 - 0.02 + dep / 2, y0 + gap / 2, 0)
        const b = new Brush(g); b.updateMatrixWorld()
        acc = ev.evaluate(acc, b, SUBTRACTION)
      }
    }
    for (const d of hallDoors()) {                                 // 리브 관통 구멍 5(지붕만 실질 절제)
      const hole = new THREE.CylinderGeometry(SHELL_RIB_R + CELLA_CLR, SHELL_RIB_R + CELLA_CLR, yTop + 8, 24)
      hole.translate(d.cx, (yTop + 4 - 2) / 2, d.cz)
      const b = new Brush(hole); b.updateMatrixWorld()
      acc = ev.evaluate(acc, b, SUBTRACTION)
    }
    return acc.geometry
  }, [])
  if (!geo) return null
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={CELLA_COLOR} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ════════ ★리브 받침 제단(ALTAR, ㊸ 2026.07.21 현도 — "경선리브 받치는 제단, 직사각 계단 2장, 신전 입구") ════════
//  다섯 리브 밑동을 가로지르는 넓은 신전 기단. 직사각 계단 2장(하단 넓음〔서쪽으로 더 뻗음〕·상단 좁음 = 물러남).
//  리브 열 전체 폭(z ±ALTAR_ZHW = 다섯 다 덮음). 서쪽(진입로)으로 계단이 펼쳐져 관람자가 오르는 신전 정면.
//  ⚠총 높이 8 < 넥서스(38.2) — 다섯 날 뿌리보다 한참 아래라 무간섭(R2절). walkable.
//  범위 스위치: 'ribs'(리브 밑동만 — 서쪽 끝 ALTAR_STEP1_X) / 'unified'(넥서스까지 서진 = 구조물 전체 기단).
export function RibAltar() {
  if (!ALTAR_ON) return null
  const xBack = ALTAR_X_BACK
  const x1West = ALTAR_SCOPE === 'unified' ? ALTAR_UNI_XW : ALTAR_STEP1_X   // 하단 서쪽 끝
  const x2West = ALTAR_SCOPE === 'unified' ? ALTAR_UNI_XW + 10 : ALTAR_STEP2_X
  // 계단 2장: 하단(y 0~H1, x1West~xBack 전폭) + 상단(y H1~H1+H2, x2West~xBack 물러남)
  const step1 = { x0: x1West, x1: xBack, y0: 0, y1: ALTAR_STEP1_H }
  const step2 = { x0: x2West, x1: xBack, y0: ALTAR_STEP1_H, y1: ALTAR_STEP1_H + ALTAR_STEP2_H }
  const mk = (s) => (
    <mesh position={[(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0]} userData={{ walkable: true }}>
      <boxGeometry args={[s.x1 - s.x0, s.y1 - s.y0, ALTAR_ZHW * 2]} />
      <meshStandardMaterial color={ALTAR_COLOR} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
  return (<group>{mk(step1)}{mk(step2)}</group>)
}

// ════════ ★바닥 동심 기단(FloorTiers, ㊹ 2026.07.21 현도 — 공간 완성도 갈래 ②) ════════
//  드럼 바닥을 여러 겹 낮은 동심 원형 단으로 → 다섯 날이 '기단 위에 선' 인상. 잉카 기단 어법.
//  구축 = 각 겹 = 원기둥(CylinderGeometry) 낮게 적층. peak = 안쪽부터 높이 누적(중앙 봉우리) /
//  ring = 전 겹 동일 높이 1단(중앙 평평·테두리 링만). 중심 = 드럼(COR_CX) 또는 넥서스(파생).
//  ⚠총 높이 < 넥서스(38.2) — 다섯 날 뿌리 아래 무간섭(R3절). 안쪽이 위에 오도록 큰 겹부터 그림.
export function FloorTiers() {
  const rings = useMemo(() => {
    if (!TIER_ON) return null
    const cx = TIER_CENTER === 'nexus' ? incaBladesSpec().ncx : COR_CX
    const arr = []
    for (let i = 0; i < TIER_N; i++) {
      // i=0 = 최외곽(반경 큼·낮음) → i=N−1 = 최내곽(반경 작음·높음)
      const r = TIER_RMAX * (1 - i / TIER_N)                    // 바깥→안쪽으로 반경 감소
      // peak = 안쪽부터 높이 누적(중앙 봉우리) / ring = 바깥 겹만 낮은 테두리 계단, 안쪽은 공통 높이(중앙 평평)
      //  ring: 최외곽 2겹만 층지고 나머지(안쪽)는 전부 같은 높이 = 평지 + 테두리 계단
      let h
      if (TIER_PROFILE === 'peak') h = (i + 1) * TIER_RISE
      else h = Math.min(i + 1, 3) * TIER_RISE                   // ring: 바깥 3겹만 0.7·1.4·2.1로 층지고 그 안은 2.1 공통(평지)
      arr.push({ r, h, cx })
    }
    return arr
  }, [])
  if (!rings) return null
  return (
    <group>
      {rings.map((t, i) => (
        <mesh key={i} position={[t.cx, t.h / 2, 0]} userData={{ walkable: true }}>
          <cylinderGeometry args={[t.r, t.r, t.h, 96]} />
          <meshStandardMaterial color={TIER_COLOR} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
//  ⚠설계 노트: 각 겹 = 바닥(y=0)부터 높이 h까지 선 원기둥(position.y = h/2). peak에선 안쪽 겹이
//   더 높아(누적) 바깥 겹 위로 솟아 계단이 보인다(안쪽이 바깥을 덮지만, 덮인 부분은 어차피 안쪽 겹
//   아래 = 안 보임 · 노출되는 건 각 겹의 '테두리 링'뿐 = 동심 계단). ring에선 전부 h 동일 = 단 하나.
//  ㊶-6: 정상 77 · 하부 수직 절단 · 진입 판. ★㊶-7~8: ① 매스 하부 = 접지 스트립 + '위로 볼록' 다면 곡선
//  → 아치 보이드(리브 밑동 자유 — 계단은 위 접점에서만 리브를 만남). ② 판 20×5×2(가로 우세 4:1), 밑면 = 폭 전체
//  곡면이 '바닥까지' 흘러듦(㊶-8 현도 — 접지 곡면 콘솔). ③ 브루탈: 곡면 다면화(FACETS)·판 서단 챔퍼(CHAMF).
//  구축 = 단면 폴리곤(x–y) → ExtrudeGeometry 압출(z, 폭). ⚠폭 사다리꼴(W1≠W0)을 쓰려면 압출로는 안 되고
//  수제 쿼드로 회귀 필요 — 현재 W0=W1 전제(P절이 강제하진 않음, 노브 사용 시 이 주석 볼 것).
//  수치 정본 = corridorStairsGeometry.incaStairSpec() — 검증(check_corridor P절)과 공유.
export function IncaStair() {
  const { massGeo, panelGeo, nexusGeo, bladeGeos } = useMemo(() => {
    if (!INCA_ON) return { massGeo: null, panelGeo: null, nexusGeo: null, bladeGeos: [] }
    const spec = incaStairSpec()
    const { steps, arch, panel, cutX } = spec
    const Y0 = -0.3
    // ── 매스: 서면 → 디딤 지그재그 → 동면(웨브) → 아치 다면(역순) → 접지 스트립 ──
    const ms = new THREE.Shape()
    ms.moveTo(cutX, Y0)
    ms.lineTo(cutX, steps[0].yTop)
    for (const st of steps) { ms.lineTo(st.x0, st.yTop); ms.lineTo(st.x1, st.yTop) }
    const last = steps[steps.length - 1]
    ms.lineTo(last.x1, arch[arch.length - 1].y)                  // 동면: 정상 → 리브 접점(웨브)
    for (let i = arch.length - 1; i >= 0; i--) ms.lineTo(arch[i].x, arch[i].y)
    ms.lineTo(arch[0].x, Y0)                                     // 발 매몰
    ms.closePath()                                               // 접지 스트립(발 → 절단면)
    const massGeo = new THREE.ExtrudeGeometry(ms, { depth: INCA_W0, bevelEnabled: false })
    massGeo.translate(0, 0, -INCA_W0 / 2)
    // ── 판: 상면 평판 → 동단 물림 → 밑곡면(역순, 다면) → 서단 챔퍼 ──
    const ps = new THREE.Shape()
    ps.moveTo(panel.x0, panel.yTop)
    ps.lineTo(panel.x1, panel.yTop)
    ps.lineTo(panel.x1, -0.3)                                    // 동단: 지면까지(㊶-8 — 곡선 종점 = 절단면 발)
    for (let i = panel.under.length - 1; i >= 1; i--) ps.lineTo(panel.under[i].x, panel.under[i].y)
    ps.lineTo(panel.x0 + INCA_CHAMF, panel.yTop - panel.t)       // ★브루탈 챔퍼(서단 모따기)
    ps.lineTo(panel.x0, panel.yTop - panel.t + INCA_CHAMF)
    ps.closePath()
    const panelGeo = new THREE.ExtrudeGeometry(ps, { depth: panel.w, bevelEnabled: false })
    panelGeo.translate(0, 0, -panel.w / 2)
    // ══ ★㊷ 반십각 넥서스 + 날 4(#±1·±2) — 수치 정본 = incaBladesSpec() ══
    //  넥서스: 부채 폴리곤(x,z) → 압출 두께 = 판 두께(어휘 공유) → 눕힘. 상면 = 절단 높이 +0.04
    //  (판 상면 cutY와의 동일평면 회피 — §3 동일평면 금지. 판은 넥서스 밑을 지나 중앙 접지 콘솔이 된다).
    const bs = incaBladesSpec()
    const nsh = new THREE.Shape()
    nsh.moveTo(bs.nexus[0].x, bs.nexus[0].z)
    for (let i = 1; i < bs.nexus.length; i++) nsh.lineTo(bs.nexus[i].x, bs.nexus[i].z)
    nsh.closePath()
    const nexusGeo = new THREE.ExtrudeGeometry(nsh, { depth: INCA_PANEL_T, bevelEnabled: false })
    nexusGeo.rotateX(Math.PI / 2)                                // (x, sy, d) → (x, −d, sy): 압출이 아래로
    nexusGeo.translate(0, bs.cutY + 0.04, 0)
    //  날: 단면 폴리곤(s,y — 서면 수직 → 디딤 지그재그 → 팁(두께 TIP_T) → 밑곡선 역순·접지 뿌리)
    //  → 압출 폭 = #0 발치 폭(어휘 공유) → 방위 회전·넥서스 중심 이동을 기하에 굽는다(변환 베이크).
    //  뿌리(s < 넥서스 림)끼리의 상호 관입은 의도(손가락이 손목에서 합류 — ㊳ '결절 다발 면제' 전례).
    const bladeGeos = bs.blades.filter(b => !b.reach).map(b => {
      const sh = new THREE.Shape()
      sh.moveTo(b.s0, Y0)
      sh.lineTo(b.s0, bs.cutY)
      for (const st of b.steps) { sh.lineTo(st.s0, st.yTop); sh.lineTo(st.s1, st.yTop) }
      for (let i = b.under.length - 1; i >= 1; i--) sh.lineTo(b.under[i].s, b.under[i].y)
      sh.closePath()                                             // under[0] = (s0, −0.3) = 시작점
      const g = new THREE.ExtrudeGeometry(sh, { depth: INCA_W0, bevelEnabled: false })
      g.translate(0, 0, -INCA_W0 / 2)
      g.rotateY(-b.az)                                           // 로컬 +s → 월드 (cos az, 0, sin az)
      g.translate(bs.ncx, 0, 0)
      return g
    })
    return { massGeo, panelGeo, nexusGeo, bladeGeos }
  }, [])
  if (!massGeo) return null
  return (
    <group>
      <mesh geometry={massGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={INCA_COLOR} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={panelGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color="#c2a062" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={nexusGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {bladeGeos.map((g, i) => (
        <mesh key={'bl' + i} geometry={g} userData={{ walkable: true }}>
          <meshStandardMaterial color={INCA_COLOR} roughness={0.92} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ════════ ★ 드럼 곡면 벽 기어 피어(전략 4, 2026.07.21 → 07.22 기어화) ════════
//  큰 홀 곡면 벽(창·문 제외)에 수직 슬래브가 벽(COR_R)을 가로질러 안팎으로 돌출:
//   안쪽 = 홀에서 보는 피어/베이(PIER_DEPTH) · 바깥쪽 = 드럼 밖 톱니(PIER_OUT) → 위에서 보면 기어(cog).
//  슬래브 = 곧은 수직 매스(리브 아님 — ㉯). 상단 = 각 모서리가 자기 x의 ceilY + OVER 추종(빗면) → 내부 무틈, 지붕 높이 톱니.
//  ⚠기계 어법(신전 톤과 다름)·바깥 돌출이 창 근처 리브에 닿을 수 있음 — 현도 조감 판정. 전부 노브(폐기 = PIER_ON).
export function DrumPiers() {
  const geos = useMemo(() => {
    if (!PIER_ON) return null
    //  ★53(2026.07.23, 현도): 하강로가 관통하는 피어(자동 검출)는 **높은 입구(관문)**를 CSG로 뚫는다 —
    //   위 = 문(아치/사각·보행선 위 DESC_PORT_H), 아래 = 피어 몸이 남아 보를 2.25 파묻어 받침(교각).
    //   방위 정본은 drumPierAzimuths()로 이관(검출·검증과 공유) — 여기 인라인 공식은 폐지.
    const rOut = COR_R + PIER_OUT       // 바깥면 = 드럼 밖으로 PIER_OUT 돌출(기어 톱니)
    const rIn = COR_R - PIER_DEPTH      // 안쪽면 = 홀 안으로 PIER_DEPTH 돌출(피어/베이) — 슬래브가 벽(COR_R)을 가로지름
    const ports = descentPortSpec(HALL_ENTRY)
    const ev = new Evaluator(); ev.attributes = ['position']   // 커스텀 몸 = uv·normal 없음(뒤에서 computeVertexNormals)
    const arr = []
    for (const th of drumPierAzimuths()) {
      const c = Math.cos(th), sn = Math.sin(th)
      // 4 수직 모서리 = (반경 rOut/rIn) × (접선 ±HW). 상단 = 그 모서리 x의 천장 + OVER(빗면 추종·무틈).
      const corner = (r, w) => {
        const X = COR_CX + r * c - w * sn, Z = r * sn + w * c
        return { X, Z, topY: ceilY(X) + PIER_TOP_OVER }
      }
      const V = [corner(rOut, -PIER_HW), corner(rOut, PIER_HW), corner(rIn, PIER_HW), corner(rIn, -PIER_HW)]
      const pos = []
      for (const p of V) pos.push(p.X, PIER_Y0 - 0.5, p.Z)  // 0..3 바닥(관문 피어 CSG 위해 살짝 매몰 = 닫힌 몸)
      for (const p of V) pos.push(p.X, p.topY, p.Z)         // 4..7 상단(빗면 — 지붕 추종)
      const idx = [
        4, 5, 6, 4, 6, 7,        // 상단(빗면)
        0, 1, 5, 0, 5, 4,        // 바깥면(벽 쪽)
        1, 2, 6, 1, 6, 5,        // +접선 옆면
        2, 3, 7, 2, 7, 6,        // 안쪽 면(홀에서 보임)
        3, 0, 4, 3, 4, 7,        // −접선 옆면
        1, 0, 3, 1, 3, 2,        // ★53 바닥면(지면 매몰이나 CSG 닫힘에 필요)
      ]
      //  ★53-2: 인덱스를 펼쳐 **겉면 감김 강제** — 원본 감김이 안쪽이라 CSG가 파탄났었다(부호 부피 검산).
      const flat = []
      for (const i of idx) flat.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
      let g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(outwardTris(flat), 3))
      const port = ports.find(p => Math.abs(((p.az - th + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1e-6)
      if (port) {
        const cut = new THREE.BufferGeometry()
        cut.setAttribute('position', new THREE.Float32BufferAttribute(portPrismTris(port), 3))
        const bA = new Brush(g); bA.updateMatrixWorld()
        const bB = new Brush(cut); bB.updateMatrixWorld()
        g = ev.evaluate(bA, bB, SUBTRACTION).geometry
      }
      g.computeVertexNormals()
      arr.push(g)
    }
    return arr
  }, [])
  if (!geos) return null
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={PIER_COLOR} roughness={0.95} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
    </group>
  )
}

// ════════ ★ 빛 흡입구(Light Intake — 2026.07.22, 티켓 1장) ════════
//  빗면 천장 중앙 개구 위 흡입 구조물 4종. 상단 캡 = 위상 폐쇄 → 5갈래 계단에서 외부 리브 불가시(조건 1).
//  발광면 = 임시(진짜 빛 P2). 굵은 각/원 켜(㉯ — 얇은 살 없음). 폐기 = INTAKE_ON. 형태 = INTAKE_FORM.
export function LightIntake() {
  const parts = useMemo(() => {
    if (!INTAKE_ON) return null
    const cx = INTAKE_CX, T = INTAKE_WALL_T
    const out = []
    const add = (geo, glow = false) => out.push({ geo, glow })
    const boxAt = (x0, x1, y0, y1, z0, z1) => { const g = new THREE.BoxGeometry(x1-x0, y1-y0, z1-z0); g.translate((x0+x1)/2, (y0+y1)/2, (z0+z1)/2); return g }
    const sqRing = (hw, y0, y1, rot) => {     // 사각 링 4벽(중심 cx,0). rot이면 y축 회전(회전 스택)
      const gs = [
        boxAt(cx-hw, cx-hw+T, y0, y1, -hw, hw), boxAt(cx+hw-T, cx+hw, y0, y1, -hw, hw),
        boxAt(cx-hw, cx+hw, y0, y1, hw-T, hw),  boxAt(cx-hw, cx+hw, y0, y1, -hw, -hw+T),
      ]
      if (rot) for (const g of gs) { g.translate(-cx, 0, 0); g.rotateY(rot); g.translate(cx, 0, 0) }
      gs.forEach(g => add(g))
    }
    // ── ★갓(현도 스케치 07.22 + 수정 5건): 크라운 + ★원기둥 기둥 + ★수평 리드 + 발광 ──
    //  양태(각뿔대)는 천장 자리를 대신하므로 ceilGeo가 그린다. 여기선 그 위 구조만.
    //  ①기둥 = 원기둥 ②리드·처마 = 수평(지면 평행) → 절단면이 빗면 평행이면 기둥 길이가 방위마다 다름
    //  ④크라운 중심 = GAT_CX(서쪽) ⑤크라운 높이 = GAT_CROWN_H(낮춤).
    //  처마 = gatSeal() 수치해 파생 → 조건 1(외부 리브 불가시) 자동 보장.
    if (INTAKE_FORM === 'gat') {
      const SEG = 64, R = GAT_CROWN_R, gx = GAT_CX
      const seal = gatSeal(), lidY = seal.lidY, lidR = seal.lidR
      { // 크라운 벽(수직 통) — 밑동 → 절단면. 'level'이면 둘 다 수평이라 높이 균일(현도 07.22)
        const pos = [], idx = []
        for (let i = 0; i <= SEG; i++) {
          const t = (i/SEG)*Math.PI*2, x = gx + R*Math.cos(t), z = R*Math.sin(t)
          pos.push(x, seal.baseY - 0.6, z, x, seal.cutY, z)   // 밑단 −0.6 = 양태에 살짝 묻어 이음 봉인
        }
        for (let i = 0; i < SEG; i++) { const a=2*i, b=2*i+1, c=2*i+3, d=2*i+2; idx.push(a,b,c, a,c,d) }
        const g2 = new THREE.BufferGeometry()
        g2.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g2.setIndex(idx); g2.computeVertexNormals(); add(g2)
      }
      for (let i = 0; i < GAT_POSTS; i++) {          // ★원기둥 기둥 — 길이는 절단면↔수평 리드 간격(방위마다 다름)
        const t = (i/GAT_POSTS)*Math.PI*2, x = gx + R*Math.cos(t), z = R*Math.sin(t)
        const y0 = seal.cutY, h = lidY - y0
        if (h <= 0.05) continue
        const c2 = new THREE.CylinderGeometry(GAT_POST_R, GAT_POST_R, h, 14)
        c2.translate(x, y0 + h/2, z); add(c2)
      }
      const lid = new THREE.CylinderGeometry(lidR, lidR, GAT_LID_T, 96)   // ★수평 리드 + 처마(한 몸)
      lid.translate(gx, lidY + GAT_LID_T/2, 0); add(lid)
      const gl = new THREE.CylinderGeometry(R - 1.5, R - 1.5, 0.8, 48)    // 발광(리드 밑 — 진짜 빛 P2)
      gl.translate(gx, lidY - 0.6, 0); add(gl, true)
      return out
    }

    const yBase = ceilY(cx - INTAKE_HOLE_HW) - 2         // 서쪽(낮은) 개구변 −2 = 경사 지붕 매몰(밑단 봉인)
    const OUT0 = INTAKE_HOLE_HW + T + 2                  // 켜0 바깥 반폭/반경 = 개구 가장자리 덮음

    // ── ★슬릿형 챔버(2026.07.22): 지붕면에 '평행 오프셋'으로 얹은 좁고 긴 상자 ──
    //  벽 밑단 = ceilY(x)−0.5(지붕 따라감 → 홀 안으로 처지는 립 없음) · 상단·뚜껑 = ceilY(x)+RISE.
    //  뚜껑이 개구를 T만큼 덮어 위상 폐쇄 = 조건 1(어느 각도든 시선이 챔버 내벽·뚜껑에서 종료).
    if (INTAKE_IS_SLIT) {
      const yB = x => ceilY(x) - 0.5, yT = x => ceilY(x) + INTAKE_RISE
      const quad = (a, b, c, d, glow) => {
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3))
        g.setIndex([0,1,2, 0,2,3]); g.computeVertexNormals(); add(g, glow)
      }
      const strip = (A, B, glow) => {                    // 두 폴리라인 사이 사각 띠(원호 벽·뚜껑)
        const pos = [], idx = []
        for (let i = 0; i < A.length; i++) { pos.push(...A[i], ...B[i]) }
        for (let i = 0; i < A.length-1; i++) { const a=2*i, b=2*i+1, c=2*i+3, d=2*i+2; idx.push(a,b,c, a,c,d) }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3))
        g.setIndex(idx); g.computeVertexNormals(); add(g, glow)
      }
      for (const h of intakeSpec().holes) {
        if (h.type === 'rect') {
          const { x0, x1, z0, z1 } = h
          for (const x of [x0, x1])                      // 긴 벽 둘(z를 따라 달림)
            quad([x,yB(x),z0], [x,yB(x),z1], [x,yT(x),z1], [x,yT(x),z0])
          for (const z of [z0, z1])                      // 짧은 끝벽 둘
            quad([x0,yB(x0),z], [x1,yB(x1),z], [x1,yT(x1),z], [x0,yT(x0),z])
          const a0 = x0-T, a1 = x1+T, b0 = z0-T, b1 = z1+T
          quad([a0,yT(a0),b0], [a1,yT(a1),b0], [a1,yT(a1),b1], [a0,yT(a0),b1])   // 뚜껑(개구를 T만큼 덮음)
          const gx0 = x0+0.5, gx1 = x1-0.5, gz0 = z0+0.5, gz1 = z1-0.5
          quad([gx0,yT(gx0)-1.5,gz0], [gx1,yT(gx1)-1.5,gz0], [gx1,yT(gx1)-1.5,gz1], [gx0,yT(gx0)-1.5,gz1], true)  // 발광(뚜껑 밑)
        } else {
          const SEG = Math.max(16, Math.round(Math.abs(h.phi1-h.phi0) / (Math.PI*2) * 96))
          const ring = (r, fy) => {                      // 반경 r 위 폴리라인(높이 함수 fy)
            const pts = []
            for (let i = 0; i <= SEG; i++) {
              const p = h.phi0 + (h.phi1-h.phi0) * i/SEG
              const x = COR_CX + r*Math.cos(p)
              pts.push([x, fy(x), r*Math.sin(p)])
            }
            return pts
          }
          strip(ring(h.r0, yB), ring(h.r0, yT))          // 안쪽 벽(고리형에선 천장 섬을 매다는 벽)
          strip(ring(h.r1, yB), ring(h.r1, yT))          // 바깥 벽
          strip(ring(h.r0-T, yT), ring(h.r1+T, yT))      // 뚜껑(양쪽 T 덮음)
          strip(ring(h.r0+0.5, x => yT(x)-1.5), ring(h.r1-0.5, x => yT(x)-1.5), true)  // 발광
          if (!h.closed) for (const p of [h.phi0, h.phi1]) {   // 끝벽 둘(호가 열린 경우)
            const P = r => [COR_CX + r*Math.cos(p), 0, r*Math.sin(p)]
            const A = P(h.r0), B = P(h.r1)
            quad([A[0],yB(A[0]),A[2]], [B[0],yB(B[0]),B[2]], [B[0],yT(B[0]),B[2]], [A[0],yT(A[0]),A[2]])
          }
        }
      }
      return out
    }

    if (INTAKE_FORM === 'b1' || INTAKE_FORM === 'b3') {
      let y = yBase
      for (let i = 0; i < INTAKE_LAYERS; i++) {
        sqRing(OUT0 - i*INTAKE_SETBACK, y, y + INTAKE_RISE, INTAKE_FORM === 'b3' ? i*Math.PI/8 : 0)
        y += INTAKE_RISE
      }
      const capHw = OUT0 - (INTAKE_LAYERS-1)*INTAKE_SETBACK + 1
      add(boxAt(cx-capHw, cx+capHw, y, y+2.6, -capHw, capHw))          // 캡(위상 폐쇄)
      const gw = OUT0 - (INTAKE_LAYERS-1)*INTAKE_SETBACK - T
      add(boxAt(cx-gw, cx+gw, y-2, y-0.5, -gw, gw), true)             // 발광(캡 밑 = 목구멍 속 광원)
    } else if (INTAKE_FORM === 'b2') {
      let y = yBase
      for (let i = 0; i < INTAKE_LAYERS; i++) {
        const r = OUT0 - i*INTAKE_SETBACK, y1 = y + INTAKE_RISE
        const cyl = new THREE.CylinderGeometry(r, r, y1-y, 64, 1, true); cyl.translate(cx, (y+y1)/2, 0); add(cyl)
        const lid = new THREE.RingGeometry(Math.max(r-T, 2), r, 64); lid.rotateX(-Math.PI/2); lid.translate(cx, y1, 0); add(lid)
        y = y1
      }
      const capR = OUT0 - (INTAKE_LAYERS-1)*INTAKE_SETBACK + 1
      const cap = new THREE.CylinderGeometry(capR, capR, 2.6, 64); cap.translate(cx, y+1.3, 0); add(cap)
      const gr = capR - T - 1
      const gl = new THREE.CylinderGeometry(gr, gr, 1.6, 48); gl.translate(cx, y-2, 0); add(gl, true)
    } else if (INTAKE_FORM === 'funnel') {
      const yC = ceilY(cx), RT = INTAKE_HOLE_HW + 1, CH = 10          // 목 = 개구+1(가장자리 물림), 굴뚝 높이 CH
      const chim = new THREE.CylinderGeometry(RT, RT, CH, 64, 1, true); chim.translate(cx, yC + CH/2, 0); add(chim)
      const cap = new THREE.CylinderGeometry(RT+1, RT+1, 2.6, 64); cap.translate(cx, yC + CH + 1.3, 0); add(cap)
      const gl = new THREE.CylinderGeometry(RT-2, RT-2, 1.6, 48); gl.translate(cx, yC + CH - 2, 0); add(gl, true)
      const fun = new THREE.CylinderGeometry(RT, INTAKE_FUNNEL_RB, INTAKE_FUNNEL_DROP, 64, 1, true)
      fun.translate(cx, yC - INTAKE_FUNNEL_DROP/2, 0); add(fun)        // 홀로 내려오는 나팔(트럼펫)
    }
    return out
  }, [])
  if (!parts) return null
  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo}>
          {p.glow
            ? <meshBasicMaterial color={INTAKE_GLOW} side={THREE.DoubleSide} />
            : <meshStandardMaterial color={INTAKE_COLOR} roughness={0.95} side={THREE.DoubleSide} />}
        </mesh>
      ))}
    </group>
  )
}

export function Corridor() {
  const wallMat = '#b89a6a'

  // 거대 원기둥 벽: 바닥(돔 표면/0)→빗면 천장. +x에 ★창 ±43°(㊳ 복원), −x(θ=π)에 박스 연결부 문(트임).
  const wallGeo = useMemo(() => {
    const pos = [], idx = []
    const quad = (ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz) => {
      const n = pos.length / 3
      pos.push(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz)
      idx.push(n, n+1, n+2, n, n+2, n+3)
    }
    for (let i = 0; i < COR_WALL_SEG; i++) {
      const t0 = (i / COR_WALL_SEG) * Math.PI * 2
      const t1 = ((i + 1) / COR_WALL_SEG) * Math.PI * 2
      const tm = (t0 + t1) / 2
      const xa = COR_CX + COR_R * Math.cos(t0), za = COR_R * Math.sin(t0)
      const xb = COR_CX + COR_R * Math.cos(t1), zb = COR_R * Math.sin(t1)
      const ya = ceilY(xa), yb = ceilY(xb)
      if (Math.abs(tm - Math.PI) <= DOOR_HALF) {                    // 방쪽 문(박스 접속): BOX_TOP 아래만 트고
        //  ★㊵-5e 하부 봉인(2026.07.20 현도): 구 설계는 박스 측벽이 지면까지 내려와 트임 아래를 밖에서
        //  막았으나, ㊵-4 목 밑선(neckBottomY) 전환으로 y 0~박스 밑 띠가 열림 → 벽 쪽에서 복원.
        //  트임 = [COR_Y0, BOX_TOP]만(박스 단면). 상한 COR_Y0 = 박스 바닥판(하면 100.7) 두께 안 물림.
        quad(xa,0,za, xb,0,zb, xb,COR_Y0,zb, xa,COR_Y0,za)
        quad(xa,BOX_TOP,za, xb,BOX_TOP,zb, xb,yb,zb, xa,ya,za)      //  위는 헤더 봉인(ㄷ′ 압축 후 스포 구멍 방지 — check_corridor B)
        continue
      }
      const dZero = Math.min(tm, Math.PI * 2 - tm)
      if (dZero <= WIN_HALF) {                                      // ★+x 창(㊳): SILL~TOP 비움 — 다섯 리브 프레임
        if (WIN_SILL_Y > 0)
          quad(xa,0,za, xb,0,zb, xb,WIN_SILL_Y,zb, xa,WIN_SILL_Y,za)
        if (Math.min(ya, yb) > WIN_TOP_Y + 0.05)                    //  천장이 위턱보다 낮으면 개구가 천장까지(잉여 슬리버 방지)
          quad(xa,WIN_TOP_Y,za, xb,WIN_TOP_Y,zb, xb,yb,zb, xa,ya,za)
      } else {
        quad(xa, domeClipY(xa,za), za, xb, domeClipY(xb,zb), zb, xb,yb,zb, xa,ya,za)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])

  // 빗면 천장 덮개: INTAKE_ON이면 중앙 개구 뚫린 고리(annulus), 아니면 부채꼴(닫힘)
  const ceilGeo = useMemo(() => {
    const N = COR_WALL_SEG
    const g = new THREE.BufferGeometry()
    if (!INTAKE_ON) {
      const pos = [COR_CX, ceilY(COR_CX), 0], idx = []
      for (let i = 0; i <= N; i++) { const t=(i/N)*Math.PI*2, x=COR_CX+COR_R*Math.cos(t); pos.push(x, ceilY(x), COR_R*Math.sin(t)) }
      for (let i = 1; i <= N; i++) idx.push(0, i, i+1)
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g
    }
    // ★갓 양태(현도 스케치 07.22 + 수정 ③ '각기둥 느낌'): 평평한 빗면 대신 ★각뿔대(패싯 GAT_FACETS).
    //  바깥 다각형 = 드럼 벽 원에 '외접'(모서리가 접점, 코너는 살짝 밖) → 벽 top을 덮어 틈 0.
    //  ★안쪽 다각형 = 크라운 원에 '내접'(정점이 원 위, 모서리는 원 안) → 크라운 벽과 겹쳐 틈 0.
    //   (07.22 현도 "크라운과 양태 사이 틈" = 안쪽을 외접으로 짜서 크라운보다 최대 R(1/cos−1) 바깥에서
    //    끝나 링 모양 틈이 생긴 것. 내접으로 뒤집어 물린다.)
    //  안쪽 링 높이: 'level'이면 수평(크라운이 수직 원통 = 벽 높이 균일) · 'tilt'면 빗면 평행.
    if (INTAKE_FORM === 'gat') {
      const seat = GAT_SEAT === 'pier' ? PIER_TOP_OVER : 0
      const seal = gatSeal()
      const F = GAT_FACETS, kOut = 1 / Math.cos(Math.PI / F)
      const rOut = COR_R * kOut, rIn = GAT_CROWN_R          // 안쪽 = 내접(정점 반경 = 크라운 반경)
      const pos = [], idx = []
      const PO = (t) => { const x = COR_CX + rOut*Math.cos(t); return [x, ceilY(x) + seat, rOut*Math.sin(t)] }
      const PI_ = (t) => { const x = GAT_CX + rIn*Math.cos(t)
        return [x, seal.baseY, rIn*Math.sin(t)] }
      for (let i = 0; i < F; i++) {
        const t0 = (i/F)*Math.PI*2, t1 = ((i+1)/F)*Math.PI*2
        const v = [PO(t0), PO(t1), PI_(t1), PI_(t0)]
        const b = pos.length/3
        for (const q of v) pos.push(...q)
        idx.push(b, b+1, b+2, b, b+2, b+3)
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g
    }
    // ★슬릿형: 원판(림) − 구멍들을 삼각분할(ShapeGeometry) 후 빗면으로 올림 — 직선/원호/고리 개구가 정확.
    //  shape 좌표 (X,Y) = 세계 (x,z), y는 ceilY(x)로 파생(천장은 평면이라 어떤 삼각분할도 정합).
    if (INTAKE_IS_SLIT) {
      const spec = intakeSpec()
      const shape = new THREE.Shape(); shape.absarc(COR_CX, 0, COR_R, 0, Math.PI*2, false)
      for (const h of spec.holes) {
        const p = new THREE.Path()
        if (h.type === 'rect') { p.moveTo(h.x0,h.z0); p.lineTo(h.x1,h.z0); p.lineTo(h.x1,h.z1); p.lineTo(h.x0,h.z1); p.closePath() }
        else if (h.closed)     { p.absarc(COR_CX, 0, h.r1, 0, Math.PI*2, false) }        // 고리 = 바깥원 구멍(+아래 섬)
        else { p.absarc(COR_CX, 0, h.r1, h.phi0, h.phi1, false); p.absarc(COR_CX, 0, h.r0, h.phi1, h.phi0, true); p.closePath() }
        shape.holes.push(p)
      }
      const shapes = [shape]
      if (spec.island) { const isl = new THREE.Shape(); isl.absarc(COR_CX, 0, spec.island.r, 0, Math.PI*2, false); shapes.push(isl) }
      const sg = new THREE.ShapeGeometry(shapes, Math.max(24, Math.round(N/2)))
      const a = sg.attributes.position, out = new Float32Array(a.count*3)
      for (let i = 0; i < a.count; i++) { const X = a.getX(i), Z = a.getY(i); out[3*i] = X; out[3*i+1] = ceilY(X); out[3*i+2] = Z }
      const gg = new THREE.BufferGeometry()
      gg.setAttribute('position', new THREE.BufferAttribute(out,3))
      gg.setIndex(sg.getIndex()); gg.computeVertexNormals(); sg.dispose(); return gg
    }
    // 개구 뚫린 고리: 안쪽 경계(형태별 사각/원 — 개구 가장자리) → 바깥 림. 안쪽=2i, 바깥=2i+1.
    const round = INTAKE_FORM === 'b2' || INTAKE_FORM === 'funnel'
    const pos = [], idx = []
    for (let i = 0; i <= N; i++) {
      const t = (i/N)*Math.PI*2, cs = Math.cos(t), sn = Math.sin(t)
      const ir = round ? INTAKE_HOLE_HW : INTAKE_HOLE_HW / Math.max(Math.abs(cs), Math.abs(sn))
      const ix = INTAKE_CX + ir*cs, iz = ir*sn
      pos.push(ix, ceilY(ix), iz)                                     // 안쪽(개구 가장자리) 2i
      const rx = COR_CX + COR_R*cs, rz = COR_R*sn
      pos.push(rx, ceilY(rx), rz)                                     // 바깥(림) 2i+1
    }
    for (let i = 0; i < N; i++) { const a=2*i, b=2*i+1, c=2*i+3, d=2*i+2; idx.push(a,b,c, a,c,d) }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx); g.computeVertexNormals(); return g
  }, [])

  // === 박스(직육면체 통로) — ★방사 개편(2026.07.09): 서쪽 단축(BOX_X0=54, 원뿔대에 안 닿음 → CSG 불요)
  //  + 옆벽 접합문 2(고리가 z=±6에서 진입, x=RAD_JX±RAD_JDOOR_HW · 문 위 헤더/아래 스커트 유지) + 서쪽 캡(막힘). ===
  const { boxWallCut, boxCeilCut, boxCap } = useMemo(() => {
    const wp = [], wi = []
    const wq = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
      const n = wp.length / 3
      wp.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz)
      wi.push(n, n + 1, n + 2, n, n + 2, n + 3)
    }
    const D0 = RAD_JX - RAD_JDOOR_HW, D1 = RAD_JX + RAD_JDOOR_HW
    const DSILL = COR_Y0, DTOP = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H
    // 벽 런(xa→xb, 바닥 스커트=돔 표면): full=전체 높이 / 아니면 문 구간(스커트+헤더만)
    const run = (z, xa, xb, full) => {
      const n = Math.max(2, Math.ceil((xb - xa) / 2.5))   // ★㊵-4: 밑선이 스커트 곡선이라 촘촘히
      for (let i = 0; i < n; i++) {
        const x0 = xa + (xb - xa) * (i / n), x1 = xa + (xb - xa) * ((i + 1) / n)
        if (full) {
          wq(x0, neckBottomY(x0, z), z, x1, neckBottomY(x1, z), z, x1, BOX_TOP, z, x0, BOX_TOP, z)
        } else {
          wq(x0, neckBottomY(x0, z), z, x1, neckBottomY(x1, z), z, x1, DSILL, z, x0, DSILL, z)
          wq(x0, DTOP, z, x1, DTOP, z, x1, BOX_TOP, z, x0, BOX_TOP, z)
        }
      }
    }
    for (const sgn of [1, -1]) {
      const z = sgn * BOX_HW
      run(z, BOX_X0, D0, true)
      run(z, D0, D1, false)          // 접합문(고리 진입)
      run(z, D1, BOX_X1, true)
    }
    const wallG = new THREE.BufferGeometry()
    wallG.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3))
    wallG.setIndex(wi); wallG.computeVertexNormals()
    // 천장(평판) — CSG 불요(원뿔대 밖)
    const ceilG = new THREE.BoxGeometry(BOX_X1 - BOX_X0, COR_THICK, BOX_HW * 2)
    ceilG.translate((BOX_X0 + BOX_X1) / 2, BOX_TOP, 0)
    // 서쪽 캡(막힌 끝벽): 바닥선은 돔이 위로 덮으므로 평평하게 낮춰 잡아도 봉합됨
    const capLo = Math.min(domeClipY(BOX_X0, -BOX_HW), domeClipY(BOX_X0, BOX_HW)) - 0.5
    const cp = [BOX_X0, capLo, -BOX_HW, BOX_X0, capLo, BOX_HW, BOX_X0, BOX_TOP, BOX_HW, BOX_X0, BOX_TOP, -BOX_HW]
    const capG = new THREE.BufferGeometry()
    capG.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3))
    capG.setIndex([0, 1, 2, 0, 2, 3]); capG.computeVertexNormals()
    return { boxWallCut: wallG, boxCeilCut: ceilG, boxCap: capG }
  }, [])


  return (
    <group>
      {/* === 길(path): ★㊴ 시퀀스 = 수평 다리 → 하강 계단 → 낮은 플랫폼(결절) — "플랫폼을 내려다보는" 진입 === */}
      <Bridge />
      {HALL_ENTRY === 'descent' && (<>
        <DescentStairs />
        <mesh position={[PLAT_X, PLAT_Y, 0]} userData={{ walkable: true }}>
          <cylinderGeometry args={[PLAT_R, PLAT_R, COR_THICK, 48]} />
          <meshStandardMaterial color="#cdb074" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[PLAT_X, (PLAT_Y - COR_THICK / 2) / 2, 0]}>
          <cylinderGeometry args={[PILLAR_R, PILLAR_R, PLAT_Y - COR_THICK / 2, 24]} />
          <meshStandardMaterial color="#a98f5e" roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
        <CorridorStairs />
      </>)}
      {HALL_ENTRY === 'asc-sphere' && (<>
        <AscentStairs />
        <AscentTunnel />
        <OrbRoom />
      </>)}
      {/* ★㊾ 소구 폐기 → 하강로 두 체제(현도 로컬 판정 스위치) */}
      {(HALL_ENTRY === 'axial' || HALL_ENTRY === 'lateral') && <DescentPath />}
      {(HALL_ENTRY === 'axial' || HALL_ENTRY === 'lateral') && <Woldae />}
      <TempleBeam />
      <Cella />
      <FloorTiers />
      <RibAltar />
      <IncaStair />
      <DrumPiers />
      <LightIntake />
      <NeckSkirt />

      {/* === 외피: 거대 원기둥(벽 + 닫힌 빗면 천장) — 공간감 통로 === */}
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={ceilGeo}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* === 박스 연결부(방 ↔ 원기둥): 측벽(돔 표면까지 클립) + 천장, 양끝 트임 === */}
      <mesh geometry={boxWallCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={boxCeilCut}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={boxCap}>
        <meshStandardMaterial color={wallMat} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
