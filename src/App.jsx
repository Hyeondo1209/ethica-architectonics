import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import GraphScaffold from './GraphScaffold'
import { SCALE, PLAT_X } from './constants'
import { FirstPersonControls } from './FirstPersonControls'
import { WAYPOINTS, WP_GROUPS, SPAWN_ID, DEV_TELEPORT, wpIndexOf } from './waypoints'
import { Ground, DomeRibs, ExplorationRib, RibStair, KneeWalk, RibJunction, Lookout, RevealPassage, CloisterLamps, Terrace } from './Dome'
import { ApexLens } from './Lens'
import { DefAxiomRoom } from './Room'
import { Corridor } from './Corridor'
import { RadialRooms } from './Radial'
import { RadialEvents } from './RadialEvents'
import { PropStele } from './Steles'

// ============================================================
//  App.jsx — 조립만 담당 (파일 분할 2026.07.03 · 스케일 리그 철거 2026.07.04 — ③ 고정)
//  모듈 지도: constants(상수·공유 함수) · FirstPersonControls(조작) · Dome(리브 세계)
//            · Room(정의·공리 방) · Corridor(통로) · Steles(비석·선돌 담체)
//            · GraphScaffold/ethica1(데이터 그래프 — 기존 그대로)
// ============================================================

export default function App() {
  const [view, setView] = useState('dome')
  const [stair, setStair] = useState('circle')       // 원형 확정(기본). T키로 옥타곤 A/B 비교

  // ── 텔레포트(개발 도구, ★2026.07.13 — waypoints.js DEV_TELEPORT로 일괄 차단) ──
  //  좌표·시선은 전부 waypoints.js가 정본. 여기는 '어디로 갈지'만 고르고 CustomEvent로 쏜다
  //  (FirstPersonControls가 받아 착지 — Canvas 안팎을 잇는 배선을 이벤트 하나로 끝냄).
  const wpRef = useRef(Math.max(0, wpIndexOf(SPAWN_ID)))   // 키 핸들러용(state는 stale해짐)
  const [wpAt, setWpAt] = useState(wpRef.current)
  const [wpOpen, setWpOpen] = useState(false)
  const goWp = useCallback((i) => {
    const n = WAYPOINTS.length
    const j = ((i % n) + n) % n                            // 순환(끝 → 처음)
    wpRef.current = j
    setWpAt(j)
    window.dispatchEvent(new CustomEvent('ethica:teleport', { detail: WAYPOINTS[j].id }))
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyG') setView(v => (v === 'dome' ? 'graph' : 'dome'))
      if (e.code === 'KeyT') setStair(s => (s === 'octagon' ? 'circle' : 'octagon'))
      if (!DEV_TELEPORT || e.repeat) return                              // ⚠오토리피트 차단(누르고 있으면 연속 순간이동)
      if (e.code === 'Tab') { e.preventDefault(); setWpOpen(o => !o) }   // 브라우저 포커스 이동 차단
      if (e.code === 'BracketLeft')  goWp(wpRef.current - 1)             // [ 이전 지점
      if (e.code === 'BracketRight') goWp(wpRef.current + 1)             // ] 다음 지점
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goWp])

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

            <group>
              <Ground />
              <DomeRibs />
              <ExplorationRib />
              <DefAxiomRoom stairKind={stair} />
              <Corridor />
              <RadialRooms />
              <RadialEvents />
              <PropStele id="1p1" x={PLAT_X} z={0} near={8} far={55} />
              <ApexLens />
              <RibStair />
              <KneeWalk />
              <RibJunction />
              <Lookout />
              <RevealPassage />
              <CloisterLamps />
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
          {view === 'graph' ? 'Ethica · 데이터 그래프 (1부 의존, 30노드)' : 'Ethica · 1부 — 신의 구성'}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          {view === 'graph' ? (
            <>
              <b>드래그</b> 회전 · <b>휠</b> 줌 · 점=노드, 선=의존<br />
              <b>G</b> 키로 돔 씬으로 돌아가기.
            </>
          ) : (
            <>
              <b>W A S D</b> 걷기 · <b>Shift</b> 달리기 · <b>Q / E</b> 상하<br />
              <b>T</b> 계단 {stair === 'octagon' ? '8각형' : '원형'} · <b>G</b> 그래프 · 임시: 벽 통과.
              {DEV_TELEPORT && (
                <><br /><b>Tab</b> 텔레포트 목록 · <b>[ ]</b> 이전/다음 지점 ({wpAt + 1}/{WAYPOINTS.length})</>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 텔레포트 패널(개발 도구 — 배포 전 waypoints.js의 DEV_TELEPORT=false로 통째 제거) ── */}
      {DEV_TELEPORT && view === 'dome' && wpOpen && (
        <div style={{
          position: 'fixed', right: 20, top: 20, bottom: 20, width: 286,
          overflowY: 'auto', pointerEvents: 'auto',
          background: 'rgba(32,27,17,0.90)', border: '1px solid rgba(201,175,116,0.35)',
          borderRadius: 6, padding: '14px 6px 14px 14px', boxSizing: 'border-box',
          fontFamily: '"Helvetica Neue", Arial, sans-serif', color: '#e8ddc4', userSelect: 'none',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b9a36f', marginBottom: 10, paddingRight: 8 }}>
            텔레포트 · 여정 순서 &nbsp;<span style={{ color: '#7a6a48' }}>Tab 닫기</span>
          </div>
          {WP_GROUPS.map((g) => (
            <div key={g.name} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#8e7c52', margin: '8px 0 4px', letterSpacing: '0.05em' }}>{g.name}</div>
              {g.items.map(({ w, i }) => {
                const on = i === wpAt
                return (
                  <div key={w.id} onClick={() => goWp(i)} title={w.id}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer',
                      padding: '5px 8px', marginRight: 6, borderRadius: 4,
                      background: on ? 'rgba(201,175,116,0.22)' : 'transparent',
                      borderLeft: on ? '2px solid #d8bd7e' : '2px solid transparent',
                    }}>
                    <span style={{ fontSize: 10, color: '#7a6a48', minWidth: 15, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.35, color: on ? '#fff3d6' : '#d6c9a8', flex: 1 }}>{w.label}</span>
                    <span style={{ fontSize: 10, color: '#a8925f', whiteSpace: 'nowrap' }}>{w.prop !== '—' ? w.prop : ''}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
