import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import GraphScaffold from './GraphScaffold'
import { SCALE, PLAT_X, PRESETS, applyPreset } from './constants'
import { FirstPersonControls } from './FirstPersonControls'
import { Ground, DomeRibs, Apex, RibStair, LandingPad, StraightFlight, Terrace } from './Dome'
import { DefAxiomRoom } from './Room'
import { Corridor } from './Corridor'
import { PropStele } from './Steles'

// ============================================================
//  App.jsx — 조립만 담당 (파일 분할 2026.07.03, 화면 동일 원칙)
//  모듈 지도: constants(상수·공유 함수) · FirstPersonControls(조작) · Dome(리브 세계)
//            · Room(정의·공리 방) · Corridor(통로) · Steles(비석·선돌 담체)
//            · GraphScaffold/ethica1(데이터 그래프 — 기존 그대로)
// ============================================================

export default function App() {
  const [view, setView] = useState('dome')
  const [stair, setStair] = useState('circle')       // 원형 확정(기본). T키로 옥타곤 A/B 비교
  const [preset, setPreset] = useState(0)            // ★스케일 리그(2026.07.04): 숫자키 1~4 — T키 전환의 전례
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyG') setView(v => (v === 'dome' ? 'graph' : 'dome'))
      if (e.code === 'KeyT') setStair(s => (s === 'octagon' ? 'circle' : 'octagon'))
      const m = e.code.match(/^Digit([1-4])$/)       // 프리셋 전환: 상수 재계산 → key 변경 → 씬 리마운트
      if (m) { const i = Number(m[1]) - 1; applyPreset(i); setPreset(i) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Canvas camera={{ fov: 70, near: 0.1, far: 3000, position: [0, 1.6, 0] }}>
        {view === 'dome' && (
          <>
            <color attach="background" args={['#e7d6ad']} />
            <fog attach="fog" args={['#e7d6ad', 30 * SCALE, 150 * SCALE]} />

            <hemisphereLight args={['#ffeccb', '#2e2618', 0.85]} />
            <ambientLight intensity={0.25} />
            <directionalLight position={[30 * SCALE, 120 * SCALE, 20 * SCALE]} intensity={0.3} color="#ffe6bf" />

            {/* ★리그: key 변경 = 서브트리 리마운트 → 모든 지오메트리가 새 상수로 재생성.
                (모듈 최상위 스케일 파생 없음 — 2026.07.04 전수 스캔. useMemo는 리마운트 시 재계산.)
                FirstPersonControls는 밖 — 프리셋을 바꿔도 카메라 위치·시선이 유지되게. */}
            <group key={'preset-' + preset}>
              <Ground />
              <DomeRibs />
              <DefAxiomRoom stairKind={stair} />
              <Corridor />
              <PropStele id="1p1" x={PLAT_X} z={0} near={8} far={55} />
              <Apex />
              <RibStair />
              <LandingPad />
              <StraightFlight />
              <Terrace />
            </group>
            <FirstPersonControls />
          </>
        )}

        {view === 'graph' && (
          <>
            <color attach="background" args={['#171511']} />
            <ambientLight intensity={0.8} />
            <GraphScaffold />
          </>
        )}
      </Canvas>

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 380, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: view === 'graph' ? '#e8ddc4' : '#3a3324',
        textShadow: view === 'graph' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: view === 'graph' ? '#b9a36f' : '#7a6a48', marginBottom: 8 }}>
          {view === 'graph' ? 'Ethica · 데이터 그래프 (1부 의존, 30노드)' : 'Ethica · 스케일 리그'}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          {view === 'graph' ? (
            <>
              <b>드래그</b> 회전 · <b>휠</b> 줌 · 점=노드, 선=의존<br />
              <b>G</b> 키로 돔 씬으로 돌아가기.
            </>
          ) : (
            <>
              <b>1–4</b> 스케일 프리셋 · <b>Shift</b> 달리기 · <b>W A S D</b> 걷기 · <b>Q / E</b> 상하<br />
              <b>T</b> 계단 {stair === 'octagon' ? '8각형' : '원형'} · <b>G</b> 그래프 · 임시: 벽 통과.<br />
              <span style={{ color: '#8a6d2f', fontWeight: 600 }}>
                {PRESETS[preset].name} — S {PRESETS[preset].S} · k {PRESETS[preset].k} ·
                내부폭 {(2 * PRESETS[preset].S * PRESETS[preset].k).toFixed(1)} · 통로 {Math.round(60 * PRESETS[preset].S)}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  )
}
