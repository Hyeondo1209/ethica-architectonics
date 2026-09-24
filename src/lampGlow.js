// lampGlow.js — ★★★239-d 등불 방 조명 기둥 빛 안개(2026.09.24 셋째 대화 · 현도 "은은히 빛나는 조명기둥")
//  기둥 = 관(갓 목 y0 ~ 뿌리 목 아래끝) + 뿌리 목(★221-d 방 전용 나팔 · buildLampRoot와 **같은 기하**의 셸 부분).
//  볼륨 = 그 표면을 법선으로 uW만큼 부풀린 얇은 셸(정점 셰이더가 민다 — 튜너가 두께를 즉시 바꾼다).
//   셸 법선은 해석적(smoothShellNormals)이라 같은 위치의 정점은 같은 법선 → 부풀려도 갈라지지 않는다(검사가 잰다) · 목 아래끝 법선 = 수평(dr/dt = 0) = 관 법선 → 이음 연속.
//  조각 셰이더 = ★225 빛기둥 재질(lampBeamMaterial)의 문자열에서 **두 곳만 치환**(선언 한 줄 추가 · 세로 감쇠 줄 교체) — 실루엣(facing^pow)·포화 합성·★190 깃털 줄은 같은 문자열.
//  세로 분포 = ★239-b 관 발광과 같은 표시 그러데이션(rm10lTubeSpec().prof — 아래 0.554 · 진입고 위 1) · 갓 쪽 아래끝 깃털 · 리브 쪽 위끝 깃털(모선마다 그 목이 리브에 닿는 높이에서).
import * as THREE from 'three'
import { lampBeamMaterial, lampBeamColor } from './lampBeam.js'
import { buildLampRoot, lampRootSpec, LR_M } from './lampRootGeometry.js'
import { LR_SEG, LR_LAP, LAMP_ENTRY_Y, LB_BLEND,
  RM10L_GLOW_ON, RM10L_GLOW_W, RM10L_GLOW_OP, RM10L_GLOW_POW, RM10L_GLOW_LO_M, RM10L_GLOW_TOP_M } from './constants.js'
import { rm10lTubeSpec } from './lightingModel.js'

const BEAM_LEN = 'float len = smoothstep(0.0, 0.18, vY) * (0.30 + 0.70 * vY) * top;'
const GLOW_LEN = 'float len = smoothstep(0.0, uLo, vY) * mix(uB0, 1.0, min(1.0, vY / uYe)) * smoothstep(0.0, uTopM, vTopD);'
const BEAM_DECL = 'varying float vY;'
const GLOW_DECL = 'varying float vY; varying float vTopD; uniform float uLo; uniform float uB0; uniform float uYe; uniform float uTopM;'
const once = (s, a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`★239-d: 빛기둥 셰이더에 치환 대상이 ${n}곳(기대 1) — ${a.slice(0, 30)}`); return s.replace(a, b) }
/** 조각 셰이더(★225 문자열에서 파생 · 검사가 "치환된 두 곳 외 전부 같다"를 문다) */
export function lampGlowFrag() { return once(once(lampBeamMaterial().fragmentShader, BEAM_DECL, GLOW_DECL), BEAM_LEN, GLOW_LEN) }
export const LAMP_GLOW_VERT = `
      attribute float aTopY;
      uniform float uW; uniform float uY0; uniform float uY1;
      varying vec3 vN; varying vec3 vNr; varying vec3 vV; varying float vY; varying float vTopD;
      void main() {
        vec3 p = position + normal * uW;
        vN = normalMatrix * normal;
        vNr = normalMatrix * normalize(vec3(p.x, 0.0, p.z));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = -mv.xyz; vY = (p.y - uY0) / (uY1 - uY0); vTopD = aTopY - p.y;
        gl_Position = projectionMatrix * mv;
      }`

/** 명세 — y0 = 갓 목(관 아래끝) · yEnd = 뿌리 목 아래끝 · y1 = 셸 최고점 · 분포(관 발광과 같은 표시 그러데이션) */
export function lampGlowSpec(y0, r0K, lenK) {
  const S = lampRootSpec(r0K, lenK), T = rm10lTubeSpec(), y1 = Math.max(...S.tops) + LR_LAP
  return { y0, yEnd: S.yEnd, y1, rEnd: S.rEnd, b0: T.prof(y0), yE: (LAMP_ENTRY_Y - y0) / (y1 - y0), lo: RM10L_GLOW_LO_M / (y1 - y0) }
}
/** 기하(등불 로컬 — LampRoot와 같은 프레임) — 뿌리 목 셸(buildLampRoot 앞 N·M·6 정점 · 뚜껑 제외) + 관 원통(rEnd · y0 ~ yEnd). aTopY = 그 모선이 리브에 닿는 높이(관 = 먼 값) */
export function buildLampGlow(y0, r0K, lenK, pow) {
  if (!RM10L_GLOW_ON) return null
  const root = buildLampRoot(r0K, lenK, pow); if (!root) return null
  const S = lampRootSpec(r0K, lenK), nS = LR_SEG * LR_M * 6, RP = root.attributes.position, RN = root.attributes.normal
  const pos = [], nrm = [], top = []
  for (let k = 0; k < nS; k++) { const x = RP.getX(k), z = RP.getZ(k); pos.push(x, RP.getY(k), z); nrm.push(RN.getX(k), RN.getY(k), RN.getZ(k))
    const th = Math.atan2(z, x), i = Math.round(((th < 0 ? th + 2 * Math.PI : th) / (2 * Math.PI)) * LR_SEG) % LR_SEG; top.push(S.tops[i]) }   // smoothShellNormals와 같은 모선 역산
  root.dispose()
  const h = S.yEnd - y0
  if (h > 1e-6) { const c = new THREE.CylinderGeometry(S.rEnd, S.rEnd, h, LR_SEG, Math.max(1, Math.ceil(h / 2)), true).toNonIndexed(); c.translate(0, (y0 + S.yEnd) / 2, 0)
    const CP = c.attributes.position, CN = c.attributes.normal
    for (let k = 0; k < CP.count; k++) { pos.push(CP.getX(k), CP.getY(k), CP.getZ(k)); nrm.push(CN.getX(k), CN.getY(k), CN.getZ(k)); top.push(1e4) }
    c.dispose() }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('aTopY', new THREE.Float32BufferAttribute(top, 1))
  g.userData.glowShellCount = nS
  return g
}
const _mats = new Map()
/** 재질(키 = 기둥 명세 · 모듈 캐시 — J 튜너가 유니폼을 고쳐 쓴다) */
export function lampGlowMaterial(y0, r0K, lenK) {
  const key = y0 + '|' + r0K + '|' + lenK; if (_mats.has(key)) return _mats.get(key)
  const G = lampGlowSpec(y0, r0K, lenK)
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: LB_BLEND === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,   // ★225-c 포화 합성 승계
    uniforms: { uColor: { value: lampBeamColor() }, uOpacity: { value: RM10L_GLOW_OP }, uAxial: { value: 0.0 }, uTopFade: { value: 0.0 }, uEdgePow: { value: RM10L_GLOW_POW },
      uW: { value: RM10L_GLOW_W }, uY0: { value: G.y0 }, uY1: { value: G.y1 }, uLo: { value: G.lo }, uB0: { value: G.b0 }, uYe: { value: G.yE }, uTopM: { value: RM10L_GLOW_TOP_M } },
    vertexShader: LAMP_GLOW_VERT, fragmentShader: lampGlowFrag() })
  _mats.set(key, m)
  return m
}
/** 튜너용 — 만들어진 안개 재질 전부 */
export const lampGlowMaterials = () => [..._mats.values()]
