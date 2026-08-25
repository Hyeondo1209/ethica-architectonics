import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCallback, useEffect, useRef, useState } from 'react'
import GraphScaffold from './GraphScaffold'
import { SCALE, RIB_XFER_ON, RIB_DEST_PHI, TERRACE_ON, SURVEY_START,
  LGT_BG, LGT_FOG_COL, LGT_FOG_NEAR, LGT_FOG_FAR, LGT_HEMI_SKY, LGT_HEMI_GND, LGT_HEMI_I,
  LGT_AMB_I, LGT_DIR_COL, LGT_DIR_I, RND_TONEMAP, RND_EXPOSURE, RND_SHADOWS, RND_LINEAR,
  ACH_ON, LGT_FOG_ON, LGT_DIR2_I, LGT_DIR3_I,
  RND_SHDW_RANGE, RND_SHDW_DIST, RND_SHDW_MAP, RND_SHDW_BIAS, RND_SHDW_NBIAS,
  LGT_DIR_POS, LGT_DIR2_POS, LGT_DIR3_POS, LGT_DIR23_SHADOW, RND_SHDW_MAP23, SHDW_CAST_SCOPE } from './constants'   // ★173 무채 재편 · ★173-c 그림자 리그 · ★175 dir 정본화
import { FirstPersonControls } from './FirstPersonControls'
import { WAYPOINTS, WP_GROUPS, SPAWN_ID, DEV_TELEPORT, wpIndexOf } from './waypoints'
import { Ground, MirrorPads, DrumCup, DomeRibs, ExplorationRib, HallDoorRibs, RibStair, KneeWalk, RibJunction, Lookout, RevealPassage, CloisterLamps, Terrace, LampRoom, FriezeCrossing } from './Dome'
import { ApexLens } from './Lens'
import { DefAxiomRoom } from './Room'
import { Corridor } from './Corridor'
import { RadialRooms } from './Radial'
import { RadialEvents } from './RadialEvents'
import { PoseProbe, CoordHud } from './CoordHud'   // ★99 좌표 HUD(개발 도구 — DEV_TELEPORT로 일괄 차단)
import { SurveyRig, SurveyLights, SURVEY_ORDER } from './Survey'   // ★108 조형 검토 모드(⚠조명 아님)

// ============================================================
//  App.jsx — 조립만 담당 (파일 분할 2026.07.03 · 스케일 리그 철거 2026.07.04 — ③ 고정)
//  모듈 지도: constants(상수·공유 함수) · FirstPersonControls(조작) · Dome(리브 세계)
//            · Room(정의·공리 방) · Corridor(통로) · Steles(비석·선돌 담체)
//            · GraphScaffold/ethica1(데이터 그래프 — 기존 그대로)
// ============================================================

// ★172 톤 매핑 문자열 → three 상수 (정본 노브 RND_TONEMAP의 해석기)
const TONEMAP = {
  aces: THREE.ACESFilmicToneMapping, none: THREE.NoToneMapping, linear: THREE.LinearToneMapping,
  reinhard: THREE.ReinhardToneMapping, cineon: THREE.CineonToneMapping,
  agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping,
}

// ★173-c 그림자 판정 리그 — RND_SHADOWS=true일 때만 마운트. 두 가지 일을 한다:
//  ①전 메시 그림자 참여(투명 재질은 캐스트 제외 — 렌즈·웅덩이·샤프트가 판을 검게 찍는 것 방지)
//  ②dir1을 '추적 방향광'으로 대체: 방향광 조명은 **방향만** 쓰므로 광원을 플레이어 곁으로 옮겨도
//    조도는 한 픽셀도 안 변하고, 그림자 절두체(±RND_SHDW_RANGE)만 플레이어를 따라간다
//    (월드 실규모 반경 1382·높이 4608 — 전역 맵 하나는 텍셀이 1실단위를 넘어 화질 불가, 실측).
//  ★175 일반화: 방향·세기·맵 크기를 받는다(구 dir1 전용 → dir2·dir3도 같은 리그를 쓴다).
//  ⚠dir2·dir3에 castShadow만 켜면 안 된다 — three 기본 shadow camera는 정사영 ±5라
//   반경 64의 방조차 못 덮는다. 절두체·추적이 이 리그의 본체다.
//  primary = 씬 메시에 castShadow/receiveShadow를 켜는 부수효과 담당(한 번만 — 세 리그가 중복 수행할 일 아님).
function ShadowRig({ dirPos, intensity, map, primary = false }) {
  const { scene, camera } = useThree()
  const light = useRef(); const tgt = useRef()
  const dir = dirPos
  const n = Math.hypot(...dir); const d = dir.map((v) => v / n * RND_SHDW_DIST)
  useEffect(() => {   // 그림자 참여는 마운트 때 1회 일괄 — 씬 구성은 정적(스위치 변경 = 전체 리로드)
    if (!primary) return
    //  ★175-b: **받기는 전부 · 던지기는 범위대로**(현도 지시 — 리브는 그림자를 만들지 않는다).
    //   'room'이면 여기서는 castShadow를 켜지 않는다 — 방 그룹의 주입 루프(Room.jsx)가 자기 메시에만 켠다.
    //   ⚠받기(receiveShadow)를 전역으로 두는 것은 안전하다: 캐스터가 방뿐이면 방이 던진 그림자만 존재한다.
    const castAll = SHDW_CAST_SCOPE === 'all'
    scene.traverse((o) => {
      if (o.isMesh) { o.castShadow = castAll ? !(o.material && o.material.transparent) : false; o.receiveShadow = true }
    })
    return () => scene.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
  }, [scene, primary])
  useFrame(() => {
    if (!light.current || !tgt.current) return
    tgt.current.position.copy(camera.position)
    light.current.position.set(camera.position.x + d[0], camera.position.y + d[1], camera.position.z + d[2])
    light.current.target = tgt.current
  })
  return (
    <>
      <directionalLight ref={light} castShadow intensity={intensity} color={LGT_DIR_COL}
        shadow-mapSize-width={map} shadow-mapSize-height={map}
        shadow-camera-left={-RND_SHDW_RANGE} shadow-camera-right={RND_SHDW_RANGE}
        shadow-camera-top={RND_SHDW_RANGE} shadow-camera-bottom={-RND_SHDW_RANGE}
        shadow-camera-near={1} shadow-camera-far={RND_SHDW_DIST * 2}
        shadow-bias={RND_SHDW_BIAS} shadow-normalBias={RND_SHDW_NBIAS} />
      <object3D ref={tgt} />
    </>
  )
}

export default function App() {
  const [view, setView] = useState('dome')
  const [stair, setStair] = useState('circle')       // 원형 확정(기본). T키로 옥타곤 A/B 비교
  const [survey, setSurvey] = useState(SURVEY_START) // ★108 조형 검토 모드(M키 순환 — ⚠조명 개편 아님)

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
      if (e.code === 'KeyM') setSurvey(s => SURVEY_ORDER[(SURVEY_ORDER.indexOf(s) + 1) % SURVEY_ORDER.length])
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
      <Canvas shadows={RND_SHADOWS} linear={RND_LINEAR} flat={RND_TONEMAP === 'none'}
        gl={{ toneMapping: TONEMAP[RND_TONEMAP], toneMappingExposure: RND_EXPOSURE }}   /* ★172 현행 = R3F 기본값 핀 고정(ACES·sRGB·무그림자·노출 1) */
        camera={{ fov: 70, near: 0.1, far: 3000, position: [0, 1.6, 0] }}>
        {view === 'dome' && (
          <>
            {/* ★108: 검토 모드에서는 실제 대기·조명을 물린다. SurveyRig가 fog·background·overrideMaterial을
                쥐었다 놓으므로 여기 값들은 정본 그대로 남는다(끄면 원상 복귀). */}
            {survey === 'off' && <>
              <color attach="background" args={[LGT_BG]} />
              {LGT_FOG_ON && <fog attach="fog" args={[LGT_FOG_COL, LGT_FOG_NEAR * SCALE, LGT_FOG_FAR * SCALE]} />}{/* ★173: MONO 기본 = fog 끔(CLAY) — 재점등·거리 절충은 현도 */}

              <hemisphereLight args={[LGT_HEMI_SKY, LGT_HEMI_GND, LGT_HEMI_I]} />
              <ambientLight intensity={LGT_AMB_I} />
              {/* ★173-c: 그림자 켜면 dir1을 ShadowRig로 대체 — 같은 방향·색·세기, 그림자 절두체만 플레이어 추적 */}
              {RND_SHADOWS
                ? <ShadowRig dirPos={LGT_DIR_POS} intensity={LGT_DIR_I} map={RND_SHDW_MAP} primary />
                : <directionalLight position={LGT_DIR_POS} intensity={LGT_DIR_I} color={LGT_DIR_COL} />}
              {ACH_ON && <>{/* ★173 CLAY 4방향 리그 둘째·셋째(Survey 실측 위치 그대로) — 어느 면도 검게 안 죽는 중립광 */}
                {/* ★175: 이 둘이 그림자를 안 지면 방 안에 조도 0.180이 남는다 = 화면 밝기 0.55(중간 회색).
                    ROOM_DARK가 amb+hemi를 끊어도 여기서 새면 '칠흑'은 성립하지 않는다. ⛔LGT_DIR23_SHADOW=false = 구 체제 복귀 */}
                {RND_SHADOWS && LGT_DIR23_SHADOW ? (<>
                  <ShadowRig dirPos={LGT_DIR2_POS} intensity={LGT_DIR2_I} map={RND_SHDW_MAP23} />
                  <ShadowRig dirPos={LGT_DIR3_POS} intensity={LGT_DIR3_I} map={RND_SHDW_MAP23} />
                </>) : (<>
                  <directionalLight position={LGT_DIR2_POS} intensity={LGT_DIR2_I} color={LGT_DIR_COL} />
                  <directionalLight position={LGT_DIR3_POS} intensity={LGT_DIR3_I} color={LGT_DIR_COL} />
                </>)}
              </>}
            </>}
            <SurveyRig mode={survey} />
            <SurveyLights mode={survey} />

            <group>
              <Ground />
              <MirrorPads />{/* ★87 임시 판 — ★92로 배열이 비어 아무것도 안 낸다(보존계) */}
              <DrumCup />{/* ★92 드럼 하판 = 반구 R63 + 감싸는 기둥(두 체제) */}
              <DomeRibs />
              <ExplorationRib />
              <HallDoorRibs />
              <DefAxiomRoom stairKind={stair} />
              <Corridor />
              <RadialRooms />
              <RadialEvents />
              <ApexLens />
              <RibStair />
              <FriezeCrossing />
              {/* ★61 상부 여정 그룹 — 목적지 리브(#+2, +10°)로 통째 회전. 10° = 리브 간격의 정확히
                  2배라 리브 격자가 자기 위로 겹침(회랑↔리브 상대기하 불변 · k 라벨만 +2).
                  RibStair는 자립·판 인스턴스에 같은 회전을 행렬로 편입하므로 이 그룹 밖(§Dome 주석). */}
              <group rotation-y={RIB_XFER_ON ? -RIB_DEST_PHI : 0}>
                <KneeWalk />
                <RibJunction />
                <Lookout />
                <RevealPassage />
                <CloisterLamps />
                <LampRoom />{/* ★79 1p10의 집 */}
                {TERRACE_ON && <Terrace />}
              </group>
            </group>
            <FirstPersonControls />
            <PoseProbe />{/* ★99 카메라 실값 → window.__ethicaPose (리렌더 0) */}
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

      <CoordHud />{/* ★99 좌표 HUD — C 복사 · Shift+C 웨이포인트 줄 · V 접기 */}

      <div style={{
        position: 'fixed', left: 24, bottom: 22, maxWidth: 380, pointerEvents: 'none',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        color: view === 'graph' ? '#e8ddc4' : '#3a3324',
        textShadow: view === 'graph' ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.4)'
      }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: view === 'graph' ? '#b9a36f' : '#7a6a48', marginBottom: 8 }}>
          {view === 'graph' ? 'Ethica · 데이터 그래프 (1부 의존, 30노드)'
            : survey === 'off' ? 'Ethica · 1부 — 신의 구성'
            : `Ethica · 1부 — 조형 검토 모드 [${survey}] · M키 전환`}
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
