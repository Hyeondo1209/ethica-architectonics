// Survey.jsx — ★108 조형 검토 모드 (2026.08.03)
//  현도: *"지금 실내가 까만색 구로 되어있잖아? 이것 때문에 제대로된 판단이 어렵거든?
//         조명 이런거 빼고, 그냥 조형만 볼 수 있게 해보자."*
//
//  ⚠**이것은 P2 조명 개편이 아니다.** 실제 조명 체제(§3 ⑩ 균질광 · 방 암실화 `#221b10`)는
//   한 줄도 안 건드린다. 스위치를 끄면 원상 복귀한다 — **조형을 재는 자**이지 조명이 아니다.
//   P2(8/11)의 조명 판정은 이 모드가 **아니라** 실제 빛 아래에서 해야 한다.
//
//  ★왜 필요한가: 방 셸이 암실화(`#221b10`, 알베도 0.13)라 조형이 검은 데 묻힌다. 지금은 조형 예산
//   기간(P1′)인데 **조형을 볼 수가 없다** — 판정 도구가 없으면 ★107 계열의 로컬 반려도 근거를 못 댄다.
//
//  체제 셋 (M키 순환):
//   · 'off'    — 실제 체제(정본). 배포·P2 판정은 반드시 이 상태.
//   · 'clay'   — 점토 렌더: 전 메시를 무채색 균일 재질로 덮고 중립광 4방향. **실루엣·비례·두께 위계**용.
//   · 'normal' — 법선 컬러: 조명과 무관하게 면 방향이 색으로 나온다. **꺾임·마이터·감김**용.
//
//  ★구현이 침습적이지 않은 이유 = `scene.overrideMaterial`. 개별 재질을 하나도 안 고친다.
//   ⚠단 셋: ⓐ `side: DoubleSide` 필수 — 이 프로젝트의 셸·감실이 전부 DoubleSide라 FrontSide로
//   덮으면 안에서 셸이 사라진다. ⓑ `fog`를 끈다(안개는 재질 속성이라 override가 삼킨다).
//   ⓒ 해제 시 fog·background를 **원값으로** 되돌린다(복사본이 아니라 참조를 쥐고 있어야 한다).
// ════════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SURVEY_CLAY, SURVEY_BG_CLAY, SURVEY_BG_NORMAL, SURVEY_ROUGH } from './constants'

export const SURVEY_ORDER = ['off', 'clay', 'normal']

export function SurveyRig({ mode }) {
  const { scene } = useThree()
  useEffect(() => {
    if (mode === 'off') return undefined
    const prevFog = scene.fog
    const prevBg = scene.background
    const mat = mode === 'normal'
      ? new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, flatShading: true })
      : new THREE.MeshStandardMaterial({
          color: SURVEY_CLAY, roughness: SURVEY_ROUGH, metalness: 0,
          side: THREE.DoubleSide, fog: false,
        })
    scene.fog = null                                   // 안개 = 조형 판정의 적(먼 벽이 뿌예진다)
    scene.background = new THREE.Color(mode === 'normal' ? SURVEY_BG_NORMAL : SURVEY_BG_CLAY)
    scene.overrideMaterial = mat
    return () => {
      scene.overrideMaterial = null
      scene.fog = prevFog
      scene.background = prevBg
      mat.dispose()
    }
  }, [mode, scene])
  return null
}

//  중립 4방향 — 그림자 없음. "예쁜 빛"이 아니라 **어느 면도 검게 안 죽는 빛**이 목적이다.
//  ⚠그림자를 켜면 안 된다: 그림자는 조형이 아니라 조명의 산물이고, 그걸 보려면 P2로 가야 한다.
export function SurveyLights({ mode }) {
  if (mode === 'off' || mode === 'normal') return null   // normal은 조명 무관(법선 컬러)
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8d8f94', 1.15]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[400, 700, 300]} intensity={0.55} castShadow={false} />
      <directionalLight position={[-500, 300, -250]} intensity={0.38} castShadow={false} />
      <directionalLight position={[250, -400, -500]} intensity={0.26} castShadow={false} />
    </>
  )
}
