// lampBeam.js — ★★★225 등불 빛기둥(2026.09.24 현도 "원뿔 형태로 퍼져나가는 · 은은히")
//  볼륨 = 원뿔대 옆면 하나(위 = 갓 입 · 아래 = 바닥 웅덩이 반경). 재질 = 첨탑 빛기둥 셰이더(Room.jsx) 사본.
//  ⚠사본 사유(★212-h와 동일): Room.jsx의 셰이더는 컴포넌트 안 인라인이라 모듈로 못 빼면 방 코드를 흔든다(구역 D 동결 지문 근처).
//   ★189 축 기준 실루엣(uAxial=1) · ★190 상단 깃털은 그대로. ★225-b: 실루엣 지수만 노브(uEdgePow)로 갈라진다 · 색은 채도 빼기(lampBeamColor). 세로 감쇠 len = 하단 깃털(18%)·(0.30+0.70·vY)·top — 위(갓 입) 밝음 → 아래 옅음.
//  수치는 전부 constants LB_*(파생). 등불 로컬 프레임(관 축 원점 · 월드 y)에 그대로 얹는다.
import * as THREE from 'three'
import { LAMP_MOUTH_R, LB_ON, LB_COL, LB_OP, LB_FOOT_R, LB_TOP_FADE, LB_EDGE_POW, LB_DESAT, LB_BLEND, SHAFT_EDGE_AXIAL } from './constants.js'

export const lampBeamColor = () => new THREE.Color(LB_COL).lerp(new THREE.Color('#ffffff'), LB_DESAT)   // ★225-b 채도 빼기(점광 색 → 백색 보간)

export function lampBeamSpec(mouthY, floorY) {
  const h = mouthY - floorY
  return { rTop: LAMP_MOUTH_R, rBot: LB_FOOT_R, h, cy: (mouthY + floorY) / 2, halfDeg: Math.atan2(LB_FOOT_R - LAMP_MOUTH_R, h) * 180 / Math.PI }
}

export function buildLampBeam(mouthY, floorY) {
  if (!LB_ON) return null
  const S = lampBeamSpec(mouthY, floorY)
  if (!(S.h > 0)) return null
  const g = new THREE.CylinderGeometry(S.rTop, S.rBot, S.h, 40, 1, true)   // uv.y: 1=위(갓 입) · 0=아래(바닥)
  g.translate(0, S.cy, 0)
  return g
}

let _mat = null
export function lampBeamMaterial() {                 // 모듈 캐시 — 등불 10기가 재질 하나를 공유
  if (_mat) return _mat
  _mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: LB_BLEND === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,   // ★225-c 포화 합성(겹침이 더해지지 않는다)
    uniforms: { uColor: { value: lampBeamColor() }, uOpacity: { value: LB_OP },
      uAxial: { value: SHAFT_EDGE_AXIAL ? 1.0 : 0.0 }, uTopFade: { value: LB_TOP_FADE }, uEdgePow: { value: LB_EDGE_POW } },
    vertexShader: `
      varying vec3 vN; varying vec3 vNr; varying vec3 vV; varying float vY;
      void main() {
        vN = normalMatrix * normal;
        vNr = normalMatrix * normalize(vec3(position.x, 0.0, position.z));   // ★189 축 기준 반경방향(원뿔 기울기 제거)
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz; vY = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uAxial; uniform float uTopFade; uniform float uEdgePow;
      varying vec3 vN; varying vec3 vNr; varying vec3 vV; varying float vY;
      void main() {
        vec3 nrm = normalize(mix(normalize(vN), normalize(vNr), uAxial));
        float facing = abs(dot(nrm, normalize(vV)));
        float edge = pow(facing, uEdgePow);   // ★225-b 첨탑(1.6)과 갈라지는 유일한 줄 — 넓은 실루엣 감쇠
        float top = uTopFade > 0.0 ? 1.0 - smoothstep(1.0 - uTopFade, 1.0, vY) : 1.0;   // ★190 상단 깃털
        float len = smoothstep(0.0, 0.18, vY) * (0.30 + 0.70 * vY) * top;
        gl_FragColor = vec4(uColor, uOpacity * edge * len);
      }`,
  })
  return _mat
}
