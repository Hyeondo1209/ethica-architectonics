// ── 정점 렌즈(ApexLens) — Apex(광원+구)의 구체화. '세공 중인 렌즈' 2026.07.12 ──
//  존재론·스포 판정·수치 정본 = constants.js LENS 블록 주석. 기하 = lensGeometry.js(검증 공유).
//  Apex 컴포넌트(Dome.jsx)는 보존 — App 마운트만 교체(복원 = 마운트 한 줄).
//  재질 3모드(LENS_MODE): glass = 물리 투과·굴절(진짜 렌즈, 뒤 하늘이 굴절되어 비침 — 시야 비차단)
//                        / alpha = 단순 반투명(성능 폴백) / solid = 불투명(구판).
import * as THREE from 'three'
import { useMemo } from 'react'
import { buildLensGeometry } from './lensGeometry.js'
import {
  LENS_Y, LENS_FOG, LENS_COL, LENS_EMIS_C, LENS_EMIS,
  LENS_MODE, LENS_TRANSMIT, LENS_IOR, LENS_ROUGH_G, LENS_THICK, LENS_OPACITY,
} from './constants.js'

export function ApexLens() {
  const geo = useMemo(() => buildLensGeometry(), [])
  return (
    <group position={[0, LENS_Y, 0]}>
      {/* 구 Apex의 점광 계승(색·강도 동일) — 위치만 렌즈 높이로. 전역 톤 재조정 = Phase 3 */}
      <pointLight color="#ffe3b0" intensity={2.2} distance={0} decay={0} />
      <mesh geometry={geo}>
        {LENS_MODE === 'glass' ? (
          <meshPhysicalMaterial
            color={LENS_COL}
            emissive={LENS_EMIS_C}
            emissiveIntensity={LENS_EMIS * 0.5}
            transmission={LENS_TRANSMIT}
            ior={LENS_IOR}
            thickness={LENS_THICK}
            roughness={LENS_ROUGH_G}
            metalness={0}
            flatShading
            side={THREE.DoubleSide}
            fog={LENS_FOG}
          />
        ) : LENS_MODE === 'alpha' ? (
          <meshStandardMaterial
            color={LENS_COL}
            emissive={LENS_EMIS_C}
            emissiveIntensity={LENS_EMIS}
            transparent
            opacity={LENS_OPACITY}
            depthWrite={false}
            roughness={0.35}
            metalness={0}
            flatShading
            side={THREE.DoubleSide}
            fog={LENS_FOG}
          />
        ) : (
          <meshStandardMaterial
            color={LENS_COL}
            emissive={LENS_EMIS_C}
            emissiveIntensity={LENS_EMIS}
            roughness={0.35}
            metalness={0}
            flatShading
            side={THREE.DoubleSide}
            fog={LENS_FOG}
          />
        )}
      </mesh>
    </group>
  )
}
