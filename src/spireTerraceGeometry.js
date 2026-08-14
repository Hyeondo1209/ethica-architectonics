// spireTerraceGeometry.js — ★★★128 첨탑 테라스(2026.08.14 현도 스케치 + 리드백 도면 확정)
//  원기둥(빛우물) 안쪽에 걸리는 **고리 판 한 장**. 바깥 끝은 내벽 속에 묻히고, 가운데가 뚫린다.
//
//  ★현도 확정값(리드백 도면 `spire_terrace_readback.html`에서 노브를 밀어 확정):
//    윗면 y 127.0 · 두께 1.5 · 구멍 11.3 · 문 높이 가정 4.6 · 보는 곳 = 디스크 바깥 끝 16.8
//    구멍 형태 = **세 체제 전부 구현**(원형 / 팔각 pit / 팔각 tunnel) — 로컬 비교 후 확정.
//
//  ★구멍 크기의 근거 = 현도의 **시선 조건**:
//    "착지 디스크 한쪽 끝에서 반대편을 내다보면 테라스로 들어오는 문이 보일 것."
//    ⚠닫힌 식으로 풀면 막는 것은 **구멍의 반대편 *윗* 모서리 하나**다 →
//      h₀ = (yTop − yEye)·(rWall − R실효)/(R실효 + rEye)     ← 문이 보이기 시작하는 높이
//    **두께는 이 식에 안 들어간다**(두께는 밑에서 올려다본 인상에만 관여).
//    h₀ = 0은 R = rWall일 때뿐 → **문지방은 어떤 구멍으로도 안 보인다**. 언제나 문의 윗부분만 보인다.
//
//  ★팔각의 실효 반경은 방위에 따라 다르다(같은 아포템이라도 체제가 결과를 가른다):
//    'pit'    = 모서리가 0°+45°k  → 문 방위 45°가 **모서리** → 실효 = A/cos22.5°(시선에 유리·보행 폭 손해)
//    'tunnel' = 모서리가 22.5°+45°k → 문 방위가 **면 정중앙** → 실효 = A(원형과 동일)
//    (방위 규약은 첨탑 `SPIRE_OCT_MODE`와 같은 어휘 — spireSpec의 cornerAz0 규칙 그대로.)
//
//  ★분할 = SPT_SEG(96, 8의 배수): 팔각 모서리가 정점에 **정확히** 얹힌다(면 위 점은 공선이라
//   96각 다각형이 곧 정팔각형 — 부피 해석식이 근사가 아니라 정확식이 된다). 검사가 박는다.
//
//  ⚠사본 금지: 첨탑 좌표는 전부 `spireSpec()` 파생. 눈 좌표(디스크 윗면·EYE)는 **호출자가 준다**
//   (기하 모듈이 waypoints를 임포트하면 순환이 된다 — ㉒ TDZ 전례).
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import { spireSpec, wellWallR } from './spireGeometry.js'
import {
  SPT_ON, SPT_Y, SPT_T, SPT_R, SPT_HOLE, SPT_EMB, SPT_DOOR_H, SPT_EYE_R, SPT_SEG,
} from './constants.js'

const COS8 = Math.cos(Math.PI / 8)
export const SPT_MODES = ['circle', 'pit', 'tunnel']

// ── 스펙(전부 파생 — 수치 하드코딩 금지) ──
export function spireTerraceSpec(opts = {}) {
  const S = opts.spec ?? spireSpec()
  const mode = opts.holeMode ?? SPT_HOLE
  const oct = mode !== 'circle'
  const yTop = opts.y ?? SPT_Y
  const t = opts.t ?? SPT_T
  const A = opts.r ?? SPT_R                          // 원형 = 반경 / 팔각 = 아포템(면까지)
  const yBot = yTop - t
  //  ★★129: 내벽은 이제 높이의 함수다(하단 2단 확장). 사본 금지 — `wellWallR` 정본에서 받는다.
  const wallInAt = y => wellWallR(y, { spec: S, forceSpire: true }) - S.T
  const rWall = wallInAt(yTop)                       // 걷는 면 높이의 내벽 = 테라스 바깥 끝의 얼굴
  const rOut = rWall + SPT_EMB                       // 벽 속으로 묻힌다(틈 금지 — 벽 두께 T 안에서 끝난다)
  //  ★슬래브가 빗면을 가로지르면 **높이별로 좇는다**(★125 규율: 긴 부재에 최대값 하나를 쓰면 반대편에 틈).
  //   경계(빗면 아래·윗끝)를 슬래브 범위 안에서만 뽑아 표본 사슬을 만든다 → 편차 0.
  const brk = [yBot, yTop]
  for (const b of [S.wY0, S.wY1]) if (b > yBot + 1e-9 && b < yTop - 1e-9) brk.push(b)
  const ys = [...new Set(brk)].sort((a, b) => a - b)
  const crossSlope = ys.length > 2
  //  팔각 방위: spireSpec과 **같은 규약**('pit' = 모서리 0°+45°k / 'tunnel' = 모서리 22.5°+45°k)
  const cornerAz0 = mode === 'pit' ? 0 : Math.PI / 8
  const rHoleMax = oct ? A / COS8 : A                // 모서리 = 보행 폭의 최악점
  const seg = SPT_SEG
  return {
    on: SPT_ON, mode, oct, yTop, yBot, t, A, rOut, rWall, rCyl: S.rCyl, wallT: S.T,
    wallInAt, ys, crossSlope, emb: SPT_EMB, rCylTop: S.rCylTop, wD: S.wD,
    cornerAz0, rHoleMax, rHoleMin: A, seg,
    walkFace: rWall - A, walk: rWall - rHoleMax,     // 보행 폭(면 / 모서리 = 최악)
    ledgeSoffit: S.y1 - S.ledgeH,                    // 머리 위 천장(L-턱 소핏)
    head: (S.y1 - S.ledgeH) - yTop,
    doorH: SPT_DOOR_H, eyeR: SPT_EYE_R, spec: S,
  }
}

// ── 구멍 경계 반경(방위 φ rad) — 원형이면 상수, 팔각이면 면까지 거리 ──
export function holeRAt(phi, T = spireTerraceSpec()) {
  if (!T.oct) return T.A
  const Q = Math.PI / 4, H = Math.PI / 8
  //  면 중심 = cornerAz0 + 22.5° + 45°k. 그로부터의 편차 δ ∈ [−22.5°, 22.5°]
  const d = ((phi - T.cornerAz0 - H) % Q + Q + H) % Q - H
  return T.A / Math.cos(d)
}

// ── 시선(닫힌 식) — 눈 좌표는 호출자가 준다 ──
//  반환: 실효 반경 · h₀(문이 보이기 시작하는 높이) · 보이는 문 높이 · 문 전체가 보이려면 필요한 반경
export function sightSpec({ yEye, rEye, doorAz = Math.PI / 4, doorH, T = spireTerraceSpec() }) {
  const Reff = holeRAt(doorAz, T)
  const a = rEye ?? T.eyeR, h = doorH ?? T.doorH, D = T.yTop - yEye, W = T.rWall
  const h0 = D * (W - Reff) / (Reff + a)
  return { Reff, D, h0, seen: h - h0, needR: (D * W - h * a) / (D + h) }
}

// ── 빌드: 고리 프리즘(윗면·밑면·안벽·바깥벽) ──
//  ⚠k % N: 이음매를 비트 동일 좌표로(★127 '음의 영' 함정 — orientGeo 용접이 깨진다)
export function buildSpireTerrace(opts = {}) {
  const T = opts.terr ?? spireTerraceSpec(opts)
  const N = T.seg
  const az = k => T.cornerAz0 + (k % N) / N * Math.PI * 2
  //  ★129: 바깥 반경 = 그 높이의 내벽 + 매몰(빗면을 가로질러도 편차 0)
  const rO = y => T.wallInAt(y) + T.emb
  const OUT = (k, y) => [rO(y) * Math.cos(az(k)), y, rO(y) * Math.sin(az(k))]
  const IN = (k, y) => { const a = az(k), r = holeRAt(a, T); return [r * Math.cos(a), y, r * Math.sin(a)] }

  const pos = []
  const tri = (a, b, c) => pos.push(...a, ...b, ...c)
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d) }
  for (let k = 0; k < N; k++) {
    quad(OUT(k, T.yTop), OUT(k + 1, T.yTop), IN(k + 1, T.yTop), IN(k, T.yTop))   // 윗면(걷는 면)
    quad(OUT(k, T.yBot), OUT(k + 1, T.yBot), IN(k + 1, T.yBot), IN(k, T.yBot))   // 밑면
    quad(IN(k, T.yTop), IN(k + 1, T.yTop), IN(k + 1, T.yBot), IN(k, T.yBot))     // 구멍 안벽(두께의 얼굴)
    for (let m = 0; m + 1 < T.ys.length; m++)                                     // 바깥벽(벽 속에 묻힘 — 빗면 추종)
      quad(OUT(k, T.ys[m + 1]), OUT(k + 1, T.ys[m + 1]), OUT(k + 1, T.ys[m]), OUT(k, T.ys[m]))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(Array.from({ length: pos.length / 3 }, (_, i) => i))
  g.computeVertexNormals()
  return orientOutward(g)                            // 감김은 도구가 보증(규율 ⑨)
}

// ── 부피 해석식(프리즘이라 **정확식**) — 검사 대조용 ──
export function terraceVolume(T = spireTerraceSpec()) {
  const N = T.seg
  const polyK = 0.5 * N * Math.sin(Math.PI * 2 / N)                // 정N각형 면적 = polyK·r²
  const aIn = T.oct ? 8 * T.A * T.A * Math.tan(Math.PI / 8)        // 정팔각형(아포템 A)
                    : polyK * T.A * T.A
  //  ★129: 바깥이 빗면을 타면 각뿔대 정확식 사슬 V = (h/3)·k·(r₁²+r₂²+r₁r₂). 수직이면 이 식이 원기둥으로 퇴화한다.
  let vOut = 0
  for (let m = 0; m + 1 < T.ys.length; m++) {
    const y0 = T.ys[m], y1 = T.ys[m + 1]
    const r0 = T.wallInAt(y0) + T.emb, r1 = T.wallInAt(y1) + T.emb
    vOut += (y1 - y0) / 3 * polyK * (r0 * r0 + r1 * r1 + r0 * r1)
  }
  return vOut - aIn * T.t
}
