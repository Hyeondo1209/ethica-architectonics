// Radial.jsx — ★방사 복합체(1p1~4 네 방·고리) 매싱 드래프트 2026.07.09
//  ★매싱 수정 2026.07.11: ①셸 확장(16/10.5/51.5, constants) ②봉합 — a.접선 문 고리정렬 컷 b.끝단 캡 12곳 c.컷 바닥 49.0 ③나선·슬롯 회전은 ROOM_TOP_AZ(constants)
//  ★문틀 마감 2026.07.11(현도 지정): 셸 문 12곳 잼+상인방 문틀 — 곡면 이음선을 문틀이 삼키고, 통로 벽·지붕은 문틀 안 평면 종료(TUBE_END)
//  골격: 허브(기존 랜딩+빛우물, Room.jsx가 원뿔대에 대각 문 4개를 뚫음) → 대각 터널 4(박스 어휘: 돔 표면 스커트+평천장)
//        → 유선형 꽃잎 방 4(납작 타원구 셸 — ★한 기하를 4회 회전 배치 = '등형'의 문자적 실현)
//        → 고리(원호 통로, 회랑 어휘) → 동측에서 박스 옆벽 접합문으로 통로(=1p5)에 인계.
//  방 내부 표현은 전부 미정(빈 셸) — 이 모듈은 덩어리·동선·밀폐만 책임진다. 수치 정본 = constants.js RAD 블록.
import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import {
  domeClipY, COR_Y0, COR_THICK, BOX_HW,
  ROOM_LAND_R, ROOM_WELL_RT, ROOM_CEIL_Y, ROOM_CYL_TOP,
  RAD_ANG0, RAD_R, RAD_PRX, RAD_PRY, RAD_PCY,
  RAD_T_HW, RAD_TOP, RAD_DOOR_H, RAD_DOOR_HW, RAD_ARC_IN,
  RAD_JPHI, RAD_JX, RAD_FLOOR_Y, RAD_T_IN,
} from './constants'

const MAT_WALL  = '#b89a6a'   // 터널·고리(통로 외피와 같은 가족)
const MAT_SHELL = '#c3ae7f'   // 꽃잎 셸(살짝 밝게 — 매싱 구분용, 재질은 Phase 3에서)
const MAT_FLOOR = '#c2a062'   // 바닥(길 연속)
const CUT_BOT = COR_Y0                            // ★문 컷 바닥 49.0(2026.07.11 ②c) — 바닥판(48.68~49.28) 안 = 판 밑 노출 슬리버 0. 문턱도 없음(판 윗면이 문지방)
const DTOP  = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H // 문 상단 53.3(터널 천장 54 아래 헤더 0.7) — ⚠아래 문틀 상수(JAMB_H 등)가 참조: 선언 순서 유지
// 꽃잎 바닥 원판 반경(파생) — 판의 가장 낮은 모서리(밑면 y=COR_Y0−THICK/2)가 셸 안에 머무는 최대 반경 − 0.1
const FLOOR_R = RAD_PRX * Math.sqrt(Math.max(0, 1 - ((RAD_PCY - (COR_Y0 - COR_THICK / 2)) / RAD_PRY) ** 2)) - 0.1
// ★문틀 마감(2026.07.11, 현도 지정): 곡면 셸×직선 통로 접합부는 어떻게 깎아도 어중간 → 직사각 문틀이 이음선을 통째로 삼킨다.
//  구도 1(균일 관입 2.5): 방 안 스터브 2.35 / 구도 2(높이별 정합 밴드): 계단 실루엣 — 둘 다 기각.
const sR = (y) => RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))  // 셸 수평 반경(높이 y)
const Y_FTOP = RAD_FLOOR_Y + COR_THICK / 2  // 바닥판 윗면 49.28 — 이 아래(스커트·바닥판·캡)는 안 보여 깊은 관입 유지
const FR_T    = 0.5                          // 문틀 두께(잼·상인방 공통) — 노브
const FR_OUT  = RAD_T_HW + FR_T              // 잼 바깥 반폭 2.7 — 셸 구멍 가장자리(RAD_DOOR_HW 2.3)를 삼킴
const LIN_TOP = RAD_TOP + 0.6                // 상인방 상단 54.6(튜브 지붕 54.4 위 0.2)
const FR_BACK  = Math.sqrt(Math.max(0.25, sR(LIN_TOP) ** 2 - FR_OUT ** 2)) - 0.25  // 뒷면(방쪽) 중심거리 ≈14.79 — 최심 요구 코너보다 0.25 깊게
const FR_FRONT = sR(RAD_PCY) + 0.25          // 앞면(바깥) ≈16.25 — 최대 팽출(y=중심고)보다 0.25 앞
const FR_D    = FR_FRONT - FR_BACK           // 문틀 깊이(통로축) ≈1.46 — 셸 표면이 이 안을 통과
const FR_C    = (FR_FRONT + FR_BACK) / 2     // 문틀 중심의 꽃잎 중심거리 ≈15.52
const TUBE_END = FR_BACK + 0.2               // 바닥 위 벽·지붕의 끝(중심거리) — 문틀 몸통 안에서 평면 종료
const JAMB_H  = DTOP - Y_FTOP                // 잼 높이(바닥판 윗면 → 문 상단)
const S_WALL0 = 15.5                         // 터널 벽·천장 시작(원뿔벽 관통) — 허브 문틀 파생이 참조
// ★허브(원뿔대) 문틀(2026.07.11): 같은 문틀을 빛우물 원뿔벽 문 4곳에. 원뿔이 위로 좁아지는 사면이라 걸침 깊이만 다르게 파생.
const coneR = (y) => ROOM_LAND_R - (ROOM_LAND_R - ROOM_WELL_RT) * (y - (ROOM_CEIL_Y - 3)) / (ROOM_CYL_TOP - (ROOM_CEIL_Y - 3))
const HFR_BACK  = Math.min(Math.sqrt(Math.max(0.25, coneR(LIN_TOP) ** 2 - FR_OUT ** 2)) - 0.25, S_WALL0 - 0.15) // 뒷면(허브쪽) — 최심 요구 코너보다 깊게 & 벽 시작(15.5)도 몸통 안에 숨김
const HFR_FRONT = coneR(Y_FTOP) + 0.25       // 앞면(터널쪽) ≈17.46 — 문 밑선 높이 원뿔 반경보다 앞
const HFR_D = HFR_FRONT - HFR_BACK           // 허브 문틀 깊이 ≈2.1(사면 걸침이라 셸보다 깊음)
const HFR_C = (HFR_FRONT + HFR_BACK) / 2     // 허브 문틀 중심 반경 ≈16.4

// 공용 쿼드 빌더
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

// ── 꽃잎 셸(로컬 프레임: +x = 방사 바깥, 문 = 안쪽 −x 1 + 접선 ±z 2) — 한 번 만들어 4회 배치 ──
function buildPetalShell() {
  const ev = new Evaluator()
  ev.attributes = ['position', 'normal']
  const shell = new THREE.SphereGeometry(1, 48, 32)
  shell.scale(RAD_PRX, RAD_PRY, RAD_PRX)
  shell.translate(0, RAD_PCY, 0)
  let acc = new Brush(shell); acc.updateMatrixWorld()
  const H = DTOP - CUT_BOT, YMID = (DTOP + CUT_BOT) / 2
  const cutBrush = (g) => {
    const b = new Brush(g); b.updateMatrixWorld()
    acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld()
  }
  // 안쪽 문(허브 터널, −x): 터널이 정확히 방사축 위 → 축정렬 컷 그대로
  {
    const g = new THREE.BoxGeometry(8, H, RAD_DOOR_HW * 2)
    g.translate(-RAD_PRX + 1, YMID, 0)
    cutBrush(g)
  }
  // ★접선 문 2(고리 ±z) — 고리 정렬 컷(2026.07.11 ②a). 고리 중심선은 로컬 원(중심 (−R,0), 반경 R):
  //  z₀=PRX−1에서 중심선 x = R(cosφ−1)(φ=asin(z₀/R)), 진행방향도 φ만큼 기움.
  //  구(舊) 축정렬 컷은 x오프셋 1.17·각 11.2° 어긋나 구멍이 고리 바깥벽 너머로 1.27 노출(셸 옆구리 슬릿 8곳) → 컷을 중심선에 놓고 돌려 구멍=고리 단면.
  {
    const z0 = RAD_PRX - 1
    const phi = Math.asin(z0 / RAD_R)
    const xOff = RAD_R * (Math.cos(phi) - 1)
    for (const sgn of [1, -1]) {
      const g = new THREE.BoxGeometry(RAD_DOOR_HW * 2, H, 8)
      g.rotateY(-sgn * phi)                 // 컷 깊이축(z) → 그 지점 고리 접선 방향
      g.translate(xOff, YMID, sgn * z0)
      cutBrush(g)
    }
  }
  return acc.geometry
}

// ── 대각 터널(월드 좌표: 각 ang): 바닥판 + 스커트 벽 2 + 천장판 — 셸 끝은 문틀 몸통 안 평면 종료 ──
function Tunnel({ ang }) {
  const d = [Math.cos(ang), Math.sin(ang)]
  const n = [-Math.sin(ang), Math.cos(ang)]
  const sWall0 = S_WALL0                    // 원뿔벽(r≈16~17@문높이) 관통 시작 — 허브 문틀 몸통 안(HFR_BACK<15.5) 시작
  const s1 = RAD_R - RAD_PRX + 2.5          // 언더플로어(바닥판·스커트 하부·캡) 끝 — 깊은 관입(안 보임·밀폐 담당)
  const sTube = RAD_R - TUBE_END            // ★바닥 위 벽·지붕 끝 스테이션 ≈47.0 — 문틀 안
  const wallGeo = useMemo(() => quadGeo((q) => {
    for (const sgn of [1, -1]) {
      const off = sgn * RAD_T_HW
      const X = (sv) => [sv * d[0] + off * n[0], sv * d[1] + off * n[1]]
      // 바닥 위(49.28→RAD_TOP): sWall0→sTube — 문틀 몸통 안에서 평면 종료
      const seg = Math.max(3, Math.ceil((sTube - sWall0) / 4))
      for (let i = 0; i < seg; i++) {
        const [ax, az] = X(sWall0 + (sTube - sWall0) * (i / seg))
        const [bx, bz] = X(sWall0 + (sTube - sWall0) * ((i + 1) / seg))
        q(ax, Y_FTOP, az, bx, Y_FTOP, bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
      // 바닥 밑 스커트(돔 표면→49.28): sWall0→s1 깊은 관입
      const segB = Math.max(3, Math.ceil((s1 - sWall0) / 4))
      for (let i = 0; i < segB; i++) {
        const [ax, az] = X(sWall0 + (s1 - sWall0) * (i / segB))
        const [bx, bz] = X(sWall0 + (s1 - sWall0) * ((i + 1) / segB))
        q(ax, domeClipY(ax, az), az, bx, domeClipY(bx, bz), bz, bx, Y_FTOP, bz, ax, Y_FTOP, az)
      }
    }
    // ★끝단 캡(②b): 언더플로어 개방 단면(돔 표면 → 바닥판 밑면 48.68) 봉합 — 판 옆면(48.68~49.28)은 판이 스스로 덮음
    const yCap = RAD_FLOOR_Y - COR_THICK / 2
    const cax = s1 * d[0] + RAD_T_HW * n[0], caz = s1 * d[1] + RAD_T_HW * n[1]
    const cbx = s1 * d[0] - RAD_T_HW * n[0], cbz = s1 * d[1] - RAD_T_HW * n[1]
    q(cax, domeClipY(cax, caz), caz, cbx, domeClipY(cbx, cbz), cbz, cbx, yCap, cbz, cax, yCap, caz)
  }), [ang])
  const midF = (RAD_T_IN + s1) / 2, lenF = s1 - RAD_T_IN
  const midC = (sWall0 + sTube) / 2, lenC = sTube - sWall0   // 천장판도 문틀 안 종료
  return (
    <group>
      <mesh geometry={wallGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 바닥판(디스크 r6~18 밑을 지나 꽃잎까지 — 디스크가 위를 덮음, 0.02 립. 방 안 부분은 방 원판 밑 = 안 보임) */}
      <mesh position={[midF * d[0], RAD_FLOOR_Y, midF * d[1]]} rotation-y={-ang} userData={{ walkable: true }}>
        <boxGeometry args={[lenF, COR_THICK, RAD_T_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* 천장판 — 폭 = 벽과 플러시 */}
      <mesh position={[midC * d[0], RAD_TOP + 0.2, midC * d[1]]} rotation-y={-ang}>
        <boxGeometry args={[lenC, 0.4, RAD_T_HW * 2]} />
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── 고리 원호 구간(월드): 바닥 고리판(보행) + 안/밖 스커트 벽 + 지붕 고리판 ──
//  boxStart/boxEnd = 그 끝이 박스 옆벽(z=±BOX_HW) 접합 → 반경별 각 asin(BOX_HW/r)로 z평면에 정확히 착지(지느러미·슬릿 제거).
//  셸쪽 끝: 바닥 위 벽·지붕은 문틀 몸통 안(TUBE_END)에서 평면 종료, 언더플로어(바닥판·스커트 하부·캡)만 깊은 관입(ARC_IN).
function ArcSection({ phi0, phi1, boxStart = false, boxEnd = false }) {
  const rIn = RAD_R - RAD_T_HW, rOut = RAD_R + RAD_T_HW
  const p = (r, phi) => [r * Math.cos(phi), r * Math.sin(phi)]
  // 깊은 끝: 박스 끝 = z평면 클립 / 셸 끝 = ARC_IN 광선
  const clipAng = (r, ph) => (Math.sin(ph) >= 0 ? Math.asin(BOX_HW / r) : Math.PI * 2 - Math.asin(BOX_HW / r))
  const aDeep = (r) => (boxStart ? clipAng(r, phi0) : phi0)
  const bDeep = (r) => (boxEnd ? clipAng(r, phi1) : phi1)
  // 셸 끝의 꽃잎 중심 방위각과, 반경 r에서 중심거리 TUBE_END가 되는 각 오프셋(문틀 안 종료각)
  const P0 = phi0 - RAD_ARC_IN, P1 = phi1 + RAD_ARC_IN
  const dTube = (r) => Math.acos(Math.min(1, Math.max(-1, (r * r + RAD_R * RAD_R - TUBE_END ** 2) / (2 * r * RAD_R))))
  const aUp = (r) => (boxStart ? aDeep(r) : P0 + dTube(r))   // 바닥 위 벽의 시작·끝각
  const bUp = (r) => (boxEnd ? bDeep(r) : P1 - dTube(r))
  const wallRoofGeo = useMemo(() => quadGeo((q) => {
    const segN = Math.max(4, Math.ceil((phi1 - phi0) * RAD_R / 4))
    for (const r of [rIn, rOut]) {
      // 바닥 위 벽(49.28→RAD_TOP): 문틀 안 종료각까지
      const A0 = aUp(r), B0 = bUp(r)
      for (let i = 0; i < segN; i++) {
        const a = A0 + (B0 - A0) * (i / segN), b = A0 + (B0 - A0) * ((i + 1) / segN)
        const [ax, az] = p(r, a), [bx, bz] = p(r, b)
        q(ax, Y_FTOP, az, bx, Y_FTOP, bz, bx, RAD_TOP, bz, ax, RAD_TOP, az)
      }
      // 바닥 밑 스커트(돔 표면→49.28): 깊은 끝까지
      const AD = aDeep(r), BD = bDeep(r)
      for (let i = 0; i < segN; i++) {
        const a = AD + (BD - AD) * (i / segN), b = AD + (BD - AD) * ((i + 1) / segN)
        const [ax, az] = p(r, a), [bx, bz] = p(r, b)
        q(ax, domeClipY(ax, az), az, bx, domeClipY(bx, bz), bz, bx, Y_FTOP, bz, ax, Y_FTOP, az)
      }
    }
    // 지붕(평판 고리, y=RAD_TOP): 모서리를 각 반경의 바닥 위 종료각에 물림
    for (let i = 0; i < segN; i++) {
      const t0 = i / segN, t1 = (i + 1) / segN
      const [ia, iza] = p(rIn, aUp(rIn) + (bUp(rIn) - aUp(rIn)) * t0)
      const [ib, izb] = p(rIn, aUp(rIn) + (bUp(rIn) - aUp(rIn)) * t1)
      const [oa, oza] = p(rOut, aUp(rOut) + (bUp(rOut) - aUp(rOut)) * t0)
      const [ob, ozb] = p(rOut, aUp(rOut) + (bUp(rOut) - aUp(rOut)) * t1)
      q(ia, RAD_TOP, iza, ib, RAD_TOP, izb, ob, RAD_TOP, ozb, oa, RAD_TOP, oza)
    }
    // ★끝단 캡(②b — 셸쪽 깊은 끝만): 언더플로어 개방 단면(돔 표면 → 바닥 고리판 윗면) 봉합
    for (const [isBox, ph] of [[boxStart, phi0], [boxEnd, phi1]]) {
      if (isBox) continue
      const [ix, iz] = p(rIn, ph), [ox, oz] = p(rOut, ph)
      q(ix, domeClipY(ix, iz), iz, ox, domeClipY(ox, oz), oz, ox, Y_FTOP, oz, ix, Y_FTOP, iz)
    }
  }), [phi0, phi1, boxStart, boxEnd])
  const floorGeo = useMemo(() => quadGeo((q) => {
    const segN = Math.max(4, Math.ceil((phi1 - phi0) * RAD_R / 4))
    for (let i = 0; i < segN; i++) {
      const t0 = i / segN, t1 = (i + 1) / segN
      // 벽과 플러시 폭·깊은 끝까지(방 안 부분은 방 원판 0.02 립 아래 = 안 보임)
      const [ia, iza] = p(rIn, aDeep(rIn) + (bDeep(rIn) - aDeep(rIn)) * t0)
      const [ib, izb] = p(rIn, aDeep(rIn) + (bDeep(rIn) - aDeep(rIn)) * t1)
      const [oa, oza] = p(rOut, aDeep(rOut) + (bDeep(rOut) - aDeep(rOut)) * t0)
      const [ob, ozb] = p(rOut, aDeep(rOut) + (bDeep(rOut) - aDeep(rOut)) * t1)
      q(ia, Y_FTOP, iza, ib, Y_FTOP, izb, ob, Y_FTOP, ozb, oa, Y_FTOP, oza)
    }
  }), [phi0, phi1, boxStart, boxEnd])
  return (
    <group>
      <mesh geometry={wallRoofGeo}>
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={floorGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── ★문틀(2026.07.11, 현도 지정): 잼 2 + 상인방 1. 꽃잎 로컬 프레임에서 문 3곳에 배치(등형 — 4방 동일) ──
//  문틀이 셸 표면을 앞뒤로 걸쳐(깊이 FR_D) 곡면 이음선·구멍 가장자리(±2.3)·튜브 끝을 전부 몸통 안에 삼킨다.
//  로컬: 깊이축 = group z / 좌우 = group x. 문지방(단차)은 안 올림 — 바닥판 윗면이 그대로 문지방(보행 무단차).
function DoorFrame({ position, rotY, depth = FR_D }) {
  return (
    <group position={position} rotation-y={rotY}>
      {[1, -1].map((sg) => (
        <mesh key={sg} position={[sg * (RAD_T_HW + FR_T / 2), (Y_FTOP + DTOP) / 2, 0]}>
          <boxGeometry args={[FR_T, JAMB_H, depth]} />
          <meshStandardMaterial color={MAT_WALL} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, (DTOP + LIN_TOP) / 2, 0]}>
        <boxGeometry args={[FR_OUT * 2, LIN_TOP - DTOP, depth]} />
        <meshStandardMaterial color={MAT_WALL} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function RadialRooms() {
  const petalGeo = useMemo(buildPetalShell, [])
  const angs = [0, 1, 2, 3].map(k => RAD_ANG0 + k * Math.PI / 2)
  // 고리: 온호 3(꽃잎 사이) + 동측 반호 2(박스 옆벽 z=±6에서 종단 — 접합문)
  const A = RAD_ARC_IN
  const arcs = [                                             // [phi0, phi1, boxStart, boxEnd] — 박스 끝은 z평면 클립, 셸 끝은 배 밑 캡
    [angs[0] + A, angs[1] - A, false, false],                // NE→NW
    [angs[1] + A, angs[2] - A, false, false],                // NW→SW
    [angs[2] + A, angs[3] - A, false, false],                // SW→SE
    [RAD_JPHI, angs[0] - A, true, false],                    // 박스 북벽(z=+6 클립) → NE
    [angs[3] + A, Math.PI * 2 - RAD_JPHI, false, true],      // SE → 박스 남벽(z=−6 클립)
  ]
  return (
    <group>
      {/* 꽃잎 4 — 같은 셸 기하의 회전 배치(등형). 로컬 +x = 방사 바깥 */}
      {angs.map((ang, k) => (
        <group key={k} position={[RAD_R * Math.cos(ang), 0, RAD_R * Math.sin(ang)]} rotation-y={-ang}>
          <mesh geometry={petalGeo}>
            <meshStandardMaterial color={MAT_SHELL} roughness={0.88} side={THREE.DoubleSide} />
          </mesh>
          {/* 내부 바닥 원판 — ★반경 파생(2026.07.11): 판 밑면 높이(48.68)의 셸 수평반경 − 0.1 = 판이 셸 밖으로 안 삐져나오는 최대(구 PRX−0.2는 확장 후 0.15 돌출) */}
          <mesh position={[0, COR_Y0, 0]} userData={{ walkable: true }}>
            <cylinderGeometry args={[FLOOR_R, FLOOR_R, COR_THICK, 48]} />
            <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          {/* ★문틀 3(방사 1 + 접선 2) — 접선은 고리 중심선 위(FR_C 지점)·접선 방향 회전 */}
          <DoorFrame position={[-FR_C, 0, 0]} rotY={Math.PI / 2} />
          {(() => {
            const dc = 2 * Math.asin(FR_C / (2 * RAD_R))            // 중심거리 FR_C가 되는 고리 각 오프셋
            const fx = RAD_R * (Math.cos(dc) - 1), fz = RAD_R * Math.sin(dc)
            return [1, -1].map((sg) => (
              <DoorFrame key={sg} position={[fx, 0, sg * fz]} rotY={-sg * dc} />
            ))
          })()}
        </group>
      ))}
      {/* 대각 터널 4 */}
      {angs.map((ang, k) => <Tunnel key={k} ang={ang} />)}
      {/* ★허브 문틀 4(원뿔대 문, 2026.07.11) — 사면 걸침 깊이(HFR_D)로 원뿔 이음선·벽 시작 모서리·컷 림을 삼킴 */}
      {angs.map((ang, k) => (
        <DoorFrame key={'h' + k} position={[HFR_C * Math.cos(ang), 0, HFR_C * Math.sin(ang)]}
          rotY={Math.PI / 2 - ang} depth={HFR_D} />
      ))}
      {/* 고리 5구간 */}
      {arcs.map(([a, b, bs, be], i) => <ArcSection key={i} phi0={a} phi1={b} boxStart={bs} boxEnd={be} />)}
      {/* 접합 패드(박스 내부, 문 2 ↔ 다리): 다리판 밑 0.02 립 */}
      <mesh position={[RAD_JX, RAD_FLOOR_Y, 0]} userData={{ walkable: true }}>
        <boxGeometry args={[7, COR_THICK, BOX_HW * 2]} />
        <meshStandardMaterial color={MAT_FLOOR} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
