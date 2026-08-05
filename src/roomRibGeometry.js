// ════════════════════════════════════════════════════════════════════
//  roomRibGeometry.js — ★116 방 돔 살 여덟 (2026.08.05 현도 지시)
//   현도: *"쉘-바닥 경계에 있는 8각단의 각 꼭짓점에서 천장인 원까지 올라오는 돔 살."*
//
//  ★★§2-C 예외 선언(현도 2026.08.05 — "ⓐbcd 전부 근거가 될 수 있어").
//   이 살은 §2-C가 리브에만 허용한 표지 셋(**얇음·곡선·배열**)을 다 갖는다. 그럼에도 유효한 근거 넷:
//    ⓐ 대상이 **큰 리브 돔이 아니라 방 셸**이다(다른 물건).
//    ⓑ **여덟뿐**이고 72와 혼동될 수 없다.
//    ⓒ 방은 **밀폐**라 바깥 어느 시점에서도 안 보인다.
//    ⓓ **정의 여덟과 1:1**이라 의미가 다르다 — 팔각 모서리에서 나 오큘러스로 모인다.
//   ⚠경계: 이 넷 중 하나라도 깨지면 예외가 무효다. 특히 ⓒ(밀폐)와 ⓑ(수 8)는 검사가 지킨다.
//
//  ★형상 = 팔각 단 윗면의 여덟 모서리 → 셸 자오선 → 오큘러스. 단면은 폭 × 굵기의 각재.
//   · 바깥면 = **셸 곡면 그대로**(틈 0 — ★115와 같은 규약. 평면으로 두면 √(r²+u²) 렌즈 틈)
//   · 굵기는 **셸 법선 방향**으로 잰다. ⛔수평으로 재면 꼭대기(벽 기울기 77.8°)에서 법선 두께가
//     굵기×cos77.8 = 0.21배로 납작해져 살이 사라진다. 법선으로 재면 전 구간 균일하다.
//   · 발은 단 윗면에 앉는다 — 법선 오프셋 때문에 안쪽 모서리가 단 속으로 살짝 묻혀 봉합된다.
//
//  ⚠**보4 관통은 선언된 것이다**(현도 2026.08.05). 135° 살과 보4 뿌리의 각차가 0.3°라
//   살이 ★115 장부를 정면으로 지나간다. 피하지 않고 **짜맞춤의 연장으로 읽는다.**
//   살 방위는 균등 45°(팔각 파생)이고 보 방위는 나선이 정한 불규칙이라 **동시 만족은 불가능**하다.
//
//  ⚠수치 정본 = constants.js ★116 블록 주석. 여기엔 '어떻게'만 둔다.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_Y, ROOM_OCULUS_R, wallR, SUP_WALL_CLR,
  RRIB_ON, RRIB_W, RRIB_T, RRIB_SEGS, RRIB_CLR,
  RRIB_HEAD, RRIB_HEAD_IN, RRIB_HEAD_W, ROOM_LAND_R, COR_Y0, ROOM_STAIR_SLAB,
} from './constants.js'
import { wallBaseSpec } from './wallBaseGeometry.js'
import { spiralSpec } from './axiomSpiralGeometry.js'

//  그 높이·그 접선오프셋에서 셸이 허용하는 최대 반경 = 틈 0의 수학적 형태(★115와 공유하는 규약)
const rLim = (y, u) => {
  const R = wallR(y) - SUP_WALL_CLR
  return Math.sqrt(Math.max(0, R * R - u * u))
}

//  셸(타원구) 안쪽 법선 — 굵기를 이 방향으로 잰다
const inwardNormal = (r, y) => {
  let nx = r / (ROOM_R * ROOM_R), ny = (y - ROOM_FLOOR_Y) / (ROOM_HEIGHT * ROOM_HEIGHT)
  const L = Math.hypot(nx, ny) || 1
  return [-nx / L, -ny / L]           // [반경 성분, 높이 성분]
}

export function roomRibSpec() {
  const wb = wallBaseSpec()
  const y0 = wb.yTop                                   // 단 윗면(현도 ⓸ = 출발점)
  const yOc = ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(Math.max(0, 1 - (ROOM_OCULUS_R / ROOM_R) ** 2))
  //  ★★머리 높이는 **파생이다**(고정하면 조용히 죽는다 — ★109 easeFor·★112 CORNER_MIN 계열).
  //   오큘러스까지 그대로 올리면 꼭대기에서 **나선 바깥끝과 −0.02로 물린다**(구현 전 실측).
  //   셸이 급히 닫히는데 나선도 그리로 도착하기 때문 — 여유를 지키는 높이에서 스스로 끊는다.
  const SP = spiralSpec()
  const innerRAt = (y) => {
    const rO = rLim(y, RRIB_W / 2)
    return rO + inwardNormal(rO, y)[0] * RRIB_T
  }
  //  ★★나선 점유는 **방위별**이다(구판은 높이만 봐서 여덟을 다 낮췄다 — 현도 지시로 정정).
  //   그 높이에 나선이 있어도 **다른 방위**면 이 살과는 상관이 없다.
  const angDist = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d }
  const spiralClash = (az, y, rInner, halfW) => {
    for (let i = 0; i <= 1200; i++) {
      const f = i / 1200
      if (Math.abs(SP.yAt(f) - y) > 0.30) continue
      const r = SP.rAt(f), rOut = r + SP.W / 2
      const halfSp = Math.atan((SP.W / 2) / Math.max(1e-6, r))
      const halfRb = Math.atan(halfW / Math.max(1e-6, rInner))
      if (angDist(SP.azAt(f), az) > halfSp + halfRb) continue      // 방위가 다르면 무관
      if (rInner - rOut < RRIB_CLR) return true
    }
    return false
  }
  const yDisc = COR_Y0 + 0.02 - ROOM_STAIR_SLAB                     // 착지 디스크 **밑면**
  //  살마다: ⓐ 아가리까지 올라갈 수 있나 ⓑ 단차(아가리~디스크 밑면)에 머리를 놓을 수 있나
  const per = wb.edgeAz.map((az) => {
    let top = yOc
    for (let i = 0; i <= 300; i++) {
      const y = yOc - (yOc - ROOM_FLOOR_Y) * (i / 300)
      if (!spiralClash(az, y, innerRAt(y), RRIB_W / 2)) { top = y; break }
    }
    //  머리 = 아가리까지 온전히 올라온 살에만. 단차 구간에서도 나선을 안 만나야 한다.
    let head = RRIB_HEAD && top > yOc - 1e-6
    if (head) {
      for (let i = 0; i <= 20; i++) {
        const y = yOc + (yDisc - yOc) * (i / 20)
        if (spiralClash(az, y, RRIB_HEAD_IN, (RRIB_W * RRIB_HEAD_W) / 2)) { head = false; break }
      }
    }
    return { az, y1: top, head }
  })
  const y1 = Math.max(...per.map(r => r.y1))
  //  자오선 길이(실측 — 검사·문서 공용). 가장 높이 오르는 살 기준.
  let len = 0
  for (let i = 0; i < 2000; i++) {
    const a = y0 + (y1 - y0) * (i / 2000), b = y0 + (y1 - y0) * ((i + 1) / 2000)
    len += Math.hypot(wallR(b) - wallR(a), b - a)
  }

  return {
    N: wb.N, az: wb.edgeAz, y0, y1, yOc, len, cut: yOc - y1, per, yDisc,
    nHead: per.filter(r => r.head).length, headIn: RRIB_HEAD_IN, headW: RRIB_W * RRIB_HEAD_W,
    w: RRIB_W, t: RRIB_T,
    rFoot: rLim(y0, RRIB_W / 2), rTop: rLim(y1, RRIB_W / 2),
    //  같은 높이에서 이웃 살까지의 호길이 — 위로 갈수록 좁아진다
    gapAt: (y) => 2 * Math.PI * wallR(y) / wb.N - RRIB_W,
  }
}

export function buildRoomRibs() {
  const g = new THREE.BufferGeometry()
  const P = [], Nn = []
  if (!RRIB_ON) {
    g.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    g.setAttribute('normal',   new THREE.Float32BufferAttribute([], 3))
    return g
  }
  const s = roomRibSpec()
  const NS = Math.max(8, RRIB_SEGS), hw = s.w / 2

  const tri = (A, B, C, ref) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2]
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const L = Math.hypot(nx, ny, nz)
    if (!(L > 1e-12)) return
    nx /= L; ny /= L; nz /= L
    const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, cz = (A[2] + B[2] + C[2]) / 3
    let a = A, b = B, c = C
    if (nx * (cx - ref[0]) + ny * (cy - ref[1]) + nz * (cz - ref[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; b = C; c = B }
    for (const p of [a, b, c]) { P.push(p[0], p[1], p[2]); Nn.push(nx, ny, nz) }
  }
  const quad = (A, B, C, D, ref) => { tri(A, B, C, ref); tri(A, C, D, ref) }

  for (const R of s.per) {
    const az = R.az
    const pt = (r, u, y) => [r * Math.cos(az) - u * Math.sin(az), y, r * Math.sin(az) + u * Math.cos(az)]
    const cols = []
    for (let i = 0; i <= NS; i++) {
      const y = s.y0 + (R.y1 - s.y0) * (i / NS)
      const rO = rLim(y, hw)
      const n = inwardNormal(rO, y)
      cols.push({ y, rO, rI: rO + n[0] * s.t, yI: y + n[1] * s.t })
    }
    //  ⛔**기준점은 구간마다 새로 잡아야 한다**(현도 2026.08.05 적발: "중심쪽 면이 안 보여").
    //   구판은 **살 전체의 무게중심 하나**를 썼는데, 이 살은 반경이 61.5 → 18로 크게 줄어든다.
    //   그러면 아랫구간(r≈60)의 안쪽면 중심이 전역 기준점(r≈40)보다 **바깥**에 놓여 법선이 뒤집히고,
    //   방 안에서 보면 그 면이 컬링돼 사라진다. 정본 = **그 구간 자신의 무게중심**.
    //   ⚠★115 장부·★114 밑동은 짧아서 이 병이 안 났다 — 길이가 길어질 때만 드러나는 계열이다.
    const segRef = (A, B) => {
      const rm = (A.rO + A.rI + B.rO + B.rI) / 4
      const ym = (A.y + A.yI + B.y + B.yI) / 4
      return [rm * Math.cos(az), ym, rm * Math.sin(az)]
    }

    for (let i = 0; i + 1 < cols.length; i++) {
      const A = cols[i], B = cols[i + 1]
      const ref = segRef(A, B)
      quad(pt(A.rO, -hw, A.y), pt(B.rO, -hw, B.y), pt(B.rO, hw, B.y), pt(A.rO, hw, A.y), ref)          // 바깥(셸에 밀착)
      quad(pt(A.rI, hw, A.yI), pt(B.rI, hw, B.yI), pt(B.rI, -hw, B.yI), pt(A.rI, -hw, A.yI), ref)      // 안쪽
      quad(pt(A.rO, hw, A.y), pt(B.rO, hw, B.y), pt(B.rI, hw, B.yI), pt(A.rI, hw, A.yI), ref)          // 옆 +
      quad(pt(A.rI, -hw, A.yI), pt(B.rI, -hw, B.yI), pt(B.rO, -hw, B.y), pt(A.rO, -hw, A.y), ref)      // 옆 −
    }
    const F = cols[0], L = cols[cols.length - 1]
    const refF = segRef(F, cols[1]), refL = segRef(cols[cols.length - 2], L)
    quad(pt(F.rO, -hw, F.y), pt(F.rO, hw, F.y), pt(F.rI, hw, F.yI), pt(F.rI, -hw, F.yI), refF)         // 발(단 윗면에 앉는다)

    //  ── ★머리 마감 — 아가리를 딛고 단차로 올라가 디스크 밑면을 받는다(현도 2026.08.05) ──
    //   ⚠나선이 그 방위·그 높이대를 지나면 머리를 놓지 않는다(살마다 따로 판정 — spec의 head).
    if (!R.head) {
      quad(pt(L.rI, -hw, L.yI), pt(L.rI, hw, L.yI), pt(L.rO, hw, L.y), pt(L.rO, -hw, L.y), refL)      // 민 마구리(막힌 살)
    } else {
      const hwH = s.headW / 2, rBout = ROOM_LAND_R, rBin = s.headIn, yB = s.yDisc
      //  기준점 = 머리 자신의 무게중심(★116 감김 사고의 교훈 — 전역 기준점 금지)
      const rm = (L.rO + L.rI + rBout + rBin) / 4, ym = (L.y + L.yI + yB + yB) / 2 / 2 + (L.y + L.yI) / 4
      const refH = [rm * Math.cos(az), (L.y + L.yI + 2 * yB) / 4, rm * Math.sin(az)]
      const A0 = pt(L.rO, -hw, L.y),  A1 = pt(L.rO, hw, L.y)      // 아래 바깥(아가리)
      const B0 = pt(L.rI, -hw, L.yI), B1 = pt(L.rI, hw, L.yI)     // 아래 안쪽
      const C0 = pt(rBout, -hwH, yB), C1 = pt(rBout, hwH, yB)     // 위 바깥(디스크 바깥 림)
      const D0 = pt(rBin, -hwH, yB),  D1 = pt(rBin, hwH, yB)      // 위 안쪽(디스크 밑으로 파고든 끝)
      quad(A0, A1, C1, C0, refH)      // 바깥면(아가리 → 디스크 림)
      quad(D0, D1, B1, B0, refH)      // 안쪽면
      quad(C0, C1, D1, D0, refH)      // ★윗면 = 디스크 밑면을 받는 면(수평)
      quad(A0, C0, D0, B0, refH)      // 옆 −
      quad(B1, D1, C1, A1, refH)      // 옆 +
    }
  }

  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(Nn, 3))
  return g
}
