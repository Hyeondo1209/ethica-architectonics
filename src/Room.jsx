// Room.jsx — 지상 정의·공리 방(DefAxiomRoom): 돔 껍질·내벽 나선·빛우물 CSG·판테온 빛(v2.2 암실)
//   + 주어진 것 배치: DefPrecinct(기단·각인) / DefOctagon(정의 8기) / AxiomStations(공리 7기)
import { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'   // ★174-c4 순서 무관 패치
import * as THREE from 'three'
import { Brush, Evaluator, HOLLOW_SUBTRACTION } from 'three-bvh-csg'
import { GivenMonolith } from './Steles'
import { buildDisc } from './discGeometry.js'
import { shaftNodes, zoneABakeSpec, zoneAShadeAt, zoneAInterior, splitSoupAtBoundary, splitSoupByGradient } from './lightingModel.js'   // ★175-e 빛기둥 마디 정본 + ★176 베이크 + ★178 경계 분할(사본 금지)
import { BAKE_A_ON, BAKE_N, BAKE_FLOOR, BAKE_SPLIT_ON, BAKE_SPLIT_EPS, BAKE_STAIR_MIN, BAKE_INST_ON, BAKE_GRAD_ON, BAKE_GRAD_TOL, BAKE_GRAD_MIN } from './constants.js'   // ★176 베이크 + ★178 분할 + ★184 부재 하한 + ★185 인스턴스
import {
  ROOM_CX, ROOM_FLOOR_Y, ROOM_R, ROOM_CEIL_Y, ROOM_HEIGHT, ROOM_OCULUS,
  ACH_INT_ON, ACH_INT_MUL, ACH_INT_R, ACH_INT_Y0, ACH_INT_Y1, ACH_INT_FEATHER, ACH_INT_SHELL_Q0, ACH_INT_FACE_W,   // ★174 방 암실
  ROOM_CYL_TOP, ROOM_WELL_RT, ROOM_LAND_R, ROOM_DISC_SLOT_START, ROOM_DISC_SLOT_LEN, ROOM_DISC_HOLE,
  ROOM_STAIR_SIDES, ROOM_STAIR_TURNS, ROOM_STAIR_WIDTH, ROOM_STAIR_TREAD, ROOM_STAIR_RISE,
  ROOM_STAIR_BIAS, ROOM_STAIR_SLAB, ROOM_STAIR_ROUT, ROOM_STAIR_RIN, ROOM_STAIR_PHASE, ROOM_STAIR_TOTAL_ANG,
  COR_Y0, COR_THICK, BOX_X0, BOX_X1, BOX_HW, BOX_TOP,
  RAD_ANG0, RAD_T_IN, RAD_T_HW, RAD_TOP, RAD_DOOR_HW,
  DAIS_R, DAIS_STEP_H, DAIS_STEP_IN, DAIS_STEPS, DAIS_H, DAIS_ON, POOL_R, SHAFT_TOP_Y, SHAFT_TOP_R, SPOT_I,
  SHAFT_WAIST_R, SHAFT_POOL_R, SHAFT_HALO_ON, SHAFT_HALO_OP, RM_SPOT_SHADOW, RM_SPOT_SHDW_MAP, RM_SPOT_SHDW_BIAS, RM_SPOT_SHDW_NBIAS, RM_SPOT_SHDW_NEAR,
  DEF_OCT_R, DEF_OCT_PHASE, AX_F0, AX_F1, AX_OFFSET, AX_PLAT_R, AX_MONO_SCALE,
  ROOM_FLOOR_LIFT,
  PIT_ON, PIT_SIDES, PIT_PHASE, PIT_MARK_MODE, PIT_MARK_GAP, PIT_SHAFT_DROP, DEF_OCT_ON,
  ROOM_DIM, ROOM_SHAFT_ON,
  NICHE_ON, NICHE_FLOOR, SLOT_ON, SLOT_STAIR,
  AX_ON, SPIRAL_BODY, SPIRAL_SUP,
  ROOT_CROSS_ON,
  RRIB_ON,
  EAVE_ON,
  WBASE_ON,
  ROOM_SHELL_SOLID, ROOM_DARK_ON, ROOM_DARK_AO, ROOM_DARK_SHELL, RM_SPOT_DECAY, SHDW_CAST_SCOPE, SPIRE_NOCAST,
  ROOM_PAL_LIT, ROOM_PAL_DIM, RM_SHAFT_COL, RM_SHAFT_OP, SHAFT_EDGE_AXIAL, SHAFT_TOP_FADE,   // ★172 조명·팔레트 정본 + ★189 실루엣 판정 + ★190 상단 페이드
  RM_LGT_CORE_COL, RM_LGT_CORE_I, RM_LGT_SPOT_COL, RM_LGT_DAIS_COL, RM_LGT_DAIS_I,
  RM_LGT_WELL_COL, RM_LGT_WELL_I, RM_SPOT_SPREAD_R, RM_SPOT_PEN, RM_AXSP_MASS_COL, RM_AXSP_SLAB_COL, RM_AXSP_SUP_COL,
  RM_AXSP_VAULT_COL, RM_PLATE_COL, RM_SPIRE_COL, RM_DAIS_DARK_COL, RM_MARK_COL,
  PAL_FLOOR, PAL_WALL, SHAFT_HALO_UP_ON } from './constants'
import { pitSpec, slotSpec, buildPitWalls, buildPitRim, buildPitFloor, buildHoledSlab,
  buildNiches, buildNicheStairs, buildPitSlot, buildSlotStairs, buildPitEaves } from './defPitGeometry'   // ★101 각뿔대 · ★102 감실(순수 기하 — 사본 금지)
import { buildSpiralMass, buildSpiralColumns, buildSpiralBeams, buildRootCrosses } from './axiomSpiralGeometry'   // ★107 나선 매스 + 지지(순수 기하 — 사본 금지)
import { buildAxiomVaults } from './axiomVaultGeometry'   // ★111 공리 볼트(문) — 총안 창 + 감실
import { buildWallBase } from './wallBaseGeometry'
import { buildSpire, buildSpireDoorFrame } from './spireGeometry.js'   // ★127 빛우물 첨탑(순수 기하 + CSG — 사본 금지·wellWallR 단일 정본) · ★★★154 az0° 문틀
import { buildSpireTerrace } from './spireTerraceGeometry.js'   // ★128 첨탑 테라스(고리 판 — 좌표는 전부 spireSpec 파생)
import { buildUpperPlatform } from './upperPlatformGeometry.js' // ★131 새 층 플랫폼 + 좌우 계단 2기(테라스 위 — 드럼행 문의 자리)
import { buildSpireStairParts, terraceHoleOf } from './spireStairGeometry.js' // ★★★★144-b 내벽 나선(허브→테라스) + 그 도착 구멍
import { buildBridgeComplex } from './bridgeComplexGeometry.js' // ★133 1p4 방위 0° 복합체(2층 계단 관 + 참 + 기둥 + 아치)
import { buildBridgeDeckParts } from './bridgeDeckGeometry.js'  // ★★★147 접속 통로(테라스 → ★54 월대) — 관·기둥·직각나선·직선 계단
import { buildBridgeVaultParts } from './bridgeVaultGeometry.js' // ★★★148 관 사변형 리브 볼트 + 벽앞 기둥 + 첨탑 대역 ⓚ′(보존계)
import { buildBridgeTrapParts } from './bridgeTrapGeometry.js'   // ★★★150 사다리꼴 관(현도 스케치) — ★148 대체
import { buildLink4 } from './link4Geometry.js'
import { buildLink3, link3Mounts } from './link3Geometry.js'
import { buildLink2, link2Mounts } from './link2Geometry.js'                    // ★143 1p2 통로의 기둥 + 아치 ①                   // ★137 1p3형 셸 → 테라스 통로(두 오르막 + 띄운 참) · ★141 다중 마운트                   // ★136 1p4 셸 나선 참 → ★133 참 수평 접속 관
//  ★141 이름표용 — LNK 인덱스 → 정리 번호(★132 규약: k0=1p4 · k1=1p1 · k2=1p2 · k3=1p3).
//  ⚠꽃잎 k와 45° 어긋난 다른 규약이다. CoordHud로 부재를 짚을 때 이 이름이 나온다.
const LK3_PROP = [4, 1, 2, 3]
import { buildDomeRingParts } from './domeRingGeometry.js'   // ★★★145 돔 리브·띠·기둥·고리 통로(2026.08.18 현도 스케치 블록아웃)
import { SPIRE_ON, SPT_ON, UPF_ON, BRG_ON, LK4_ON, LK3_ON, BRD_ON } from './constants.js'
import { buildRoomRibs } from './roomRibGeometry'   // ★116 방 돔 살 여덟(순수 기하 — 사본 금지)   // ★114 벽 밑동 팔각 각뿔대(순수 기하 — 사본 금지)
import { buildRoomShell } from './roomShellGeometry'   // ★★★169 방 껍질 솔리드(순수 기하 — 사본 금지)

// ════════ 지하 정의·공리 방 ════════
// ═══ ★174 방 암실 — 전역광 차단 셰이더 패치 (사진2 방향 1호기 · 2026.08.24) ═══
//  앵커 5점 = three 0.184 실문자열(check_render Q9가 node_modules 대조로 잠근다 — 버전 업 시 거기서 갈림).
//  실패 시 무해 강하: 앵커 실종이면 console.error 후 무패치(방이 밝게 남을 뿐 깨지지 않는다).
const ACH_V_ANCHOR = '#include <project_vertex>'
const ACH_F_NORM = 'vec3 geometryNormal = normal;'
const ACH_F_DIR = 'getDirectionalLightInfo( directionalLight, directLight );'
const ACH_F_AMB = 'vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );'
const ACH_F_HEMI = 'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );'
const ACH_C_Y = (ROOM_FLOOR_Y + ROOM_CEIL_Y) / 2
function achInteriorPatch(mat) {
  if (!ACH_INT_ON || !mat || !mat.isMeshStandardMaterial || mat.userData.achPatched) return
  mat.userData.achPatched = true
  //  ⚠★174-c2: three는 컴파일된 프로그램을 **캐시 키로** 재사용한다. onBeforeCompile을 나중에 붙여도
  //   키가 그대로면 구 프로그램이 그냥 재사용돼 패치가 통째로 무시된다(= ACH_INT_MUL을 바꿔도 화면 불변,
  //   현도 실증 2026.08.24). customProgramCacheKey로 키를 갈라야 비로소 재컴파일된다.
  //   ⚠키에 ACH_INT_MUL을 넣지 않는다 — 값은 유니폼이라 키와 무관하고, 넣으면 값마다 프로그램이 늘어난다.
  mat.customProgramCacheKey = () => 'ach174'
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAchMul = { value: ACH_INT_MUL }
    if (!sh.vertexShader.includes(ACH_V_ANCHOR)) return console.error('[★174] vertex 앵커 실종 — three 버전 확인')
    sh.vertexShader = 'varying vec3 vAchW;\n' + sh.vertexShader.replace(ACH_V_ANCHOR,
      'vec4 achWP4 = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\n  achWP4 = instanceMatrix * achWP4;\n#endif\nvAchW = ( modelMatrix * achWP4 ).xyz;\n' + ACH_V_ANCHOR)
    const f0 = sh.fragmentShader
    if (!(f0.includes(ACH_F_NORM) && f0.includes(ACH_F_DIR) && f0.includes(ACH_F_AMB) && f0.includes(ACH_F_HEMI)))
      return console.error('[★174] fragment 앵커 실종 — three 버전 확인')
    sh.fragmentShader = ('varying vec3 vAchW;\nuniform float uAchMul;\n' + f0)
      .replace(ACH_F_NORM, ACH_F_NORM + [
        '',
        '\tfloat achM;',
        '\t{ vec3 achC = vec3( ' + ROOM_CX.toFixed(1) + ', ' + ACH_C_Y.toFixed(1) + ', 0.0 );',
        '\t\tfloat achR = length( vAchW.xz - achC.xz );',
        '\t\tfloat achVol = ( 1.0 - smoothstep( ' + (ACH_INT_R - ACH_INT_FEATHER).toFixed(2) + ', ' + ACH_INT_R.toFixed(2) + ', achR ) )',
        '\t\t\t* smoothstep( ' + (ACH_INT_Y0 - ACH_INT_FEATHER).toFixed(2) + ', ' + ACH_INT_Y0.toFixed(2) + ', vAchW.y )',
        '\t\t\t* ( 1.0 - smoothstep( ' + ACH_INT_Y1.toFixed(2) + ', ' + (ACH_INT_Y1 + ACH_INT_FEATHER).toFixed(2) + ', vAchW.y ) );',
        '\t\tvec3 achE = ( vAchW - achC ) / vec3( ' + ROOM_R.toFixed(1) + ', ' + (ROOM_HEIGHT / 2).toFixed(1) + ', ' + ROOM_R.toFixed(1) + ' );',
        '\t\tfloat achShell = smoothstep( ' + ACH_INT_SHELL_Q0.toFixed(2) + ', ' + (ACH_INT_SHELL_Q0 + 0.1).toFixed(2) + ', length( achE ) );',
        '\t\tfloat achFace = smoothstep( -' + ACH_INT_FACE_W.toFixed(2) + ', ' + ACH_INT_FACE_W.toFixed(2) + ', dot( geometryNormal, normalize( achC - vAchW ) ) );',
        '\t\tachM = mix( 1.0, uAchMul, achVol * mix( 1.0, achFace, achShell ) ); }',
      ].join('\n'))
      .replace(ACH_F_DIR, ACH_F_DIR + '\n\t\tdirectLight.color *= achM;')
      .replace(ACH_F_AMB, 'vec3 irradiance = achM * getAmbientLightIrradiance( ambientLightColor );')
      .replace(ACH_F_HEMI, 'irradiance += achM * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );')
  }
  mat.needsUpdate = true
}

//  ★174-b(현도 지적): 차단 범위 = 컴포넌트가 아니라 **공간**. 방 부피를 관통하는 디스크·박스 관·방사
//  진입부(Corridor/Radial 소속)가 방 subtree 패치에선 빠져 어둠 속에 하얗게 떠 있었다. 장면 전체 표준
//  재질에 패치를 깔되, 마스크 자체가 방 부피에서만 작동하므로 밖은 무변화(achM=1). App가 마운트한다.
export function AchRoomDarkness() {
  const { scene, invalidate } = useThree()
  //  ⚠★174-c4 (현도 실증: 값을 바꿔도 화면 불변 — 3차): 근본 원인 = **형제 effect 실행 순서**.
  //   React는 형제의 effect를 위→아래로 돌린다. AchRoomDarkness가 DefAxiomRoom보다 위에 있으니
  //   패치가 도는 시점엔 방 메시가 아직 씬에 없다 → 빈 씬을 훑고 0개 패치하고 끝났다.
  //   [scene] 의존성은 씬 객체가 불변이라 재실행도 없다(그래서 영구히 미패치).
  //   → 순서 의존을 없앤다: 매 프레임 **아직 안 본 메시만** 훑어 패치한다(패치 완료 표시로 재방문 0).
  //   비용: 프레임당 traverse 1회(수만 메시 순회는 가볍다 — 무거운 건 복제·재컴파일이고 그건 1회뿐).
  useFrame(() => {
    if (!ACH_INT_ON) return
    let touched = 0
    const box = new THREE.Box3()
    scene.traverse((o) => {
      if (!o.isMesh || !o.material || !o.geometry || o.userData.achSeen) return
      o.userData.achSeen = true            // 이 메시는 다시 보지 않는다(판정 결과와 무관)
      box.setFromObject(o)
      if (!box.isEmpty()) {
        const dx = Math.max(0, Math.max(ROOM_CX - box.max.x, box.min.x - ROOM_CX))
        const dz = Math.max(0, Math.max(0 - box.max.z, box.min.z - 0))
        const outR = Math.hypot(dx, dz) > ACH_INT_R + ACH_INT_FEATHER
        const outY = box.min.y > ACH_INT_Y1 + ACH_INT_FEATHER || box.max.y < ACH_INT_Y0 - ACH_INT_FEATHER
        if (outR || outY) return           // 차단 부피와 무교차 — 패치 불필요(화면 동일·비용 0)
      }
      if (Array.isArray(o.material)) o.material = o.material.map((m) => (m.userData.achPatched ? m : m.clone()))
      else if (!o.material.userData.achPatched) o.material = o.material.clone()
      ;[].concat(o.material).forEach(achInteriorPatch)
      touched++
    })
    if (touched) invalidate()              // on-demand 렌더 체제에서도 새 셰이더가 화면에 반영되게
  })
  return null
}

export function DefAxiomRoom({ stairKind }) {
  const treadRef = useRef()
  const helixRef = useRef()

  //  ═══════════ ★175 ROOM_DARK — 방 안에서만 간접광(amb+hemi)을 끊는다 ═══════════
  //  three 0.184 aomap_fragment: `reflectedLight.indirectDiffuse *= ambientOcclusion`
  //    → aoMap은 ★간접확산광에만★ 곱해진다. directional·point·spot은 무영향(directDiffuse).
  //  1×1 검은 텍스처 + aoMapIntensity=1 → 그 재질의 amb+hemi 응답이 0.
  //  방 재질은 전부 JSX 인라인 <meshStandardMaterial>이라 mesh마다 별 인스턴스 = 바깥과 공유 없음.
  //  ⚠★174와 다른 점 셋: ①셰이더 문자열 무접촉(표준 재질 속성) ②순회 범위 = 방 그룹 한정
  //   ③적용 개수를 콘솔에 찍는다 — '먹었는지'를 F12로 1초에 확인할 수 있다(무반응 오진 재발 방지).
  const darkRef = useRef()
  const { invalidate } = useThree()
  const aoTex = useMemo(() => {
    if (!ROOM_DARK_ON) return null
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat)
    t.needsUpdate = true                 // DataTexture는 명시 업로드 필요
    return t                             // colorSpace 기본 = NoColorSpace(비색 데이터) — aoMap의 요구와 일치
  }, [])
  //  형제 effect 순서에 기대지 않는다(★174-c4가 지목한 함정): 매 프레임 '아직 안 본' 메시만 훑는다.
  //  방 그룹 하위만 순회하므로 비용은 무시할 수준이고, 재방문은 표식으로 0이 된다.
  //  ⚠게이트 둘은 독립이다: `ROOM_DARK_ON=false`(어둠 복귀)로 되돌려도 그림자 캐스터 주입은 계속돼야 한다 —
  //   한 게이트로 묶으면 킬스위치 한 줄이 씬 전체의 그림자를 통째로 끄는 숨은 결합이 된다.
  useFrame(() => {
    if (!darkRef.current) return
    const wantDark = ROOM_DARK_ON && !!aoTex
    const wantCast = SHDW_CAST_SCOPE === 'room'
    if (!wantDark && !wantCast) return
    let n = 0
    darkRef.current.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.rdSeen) return
      o.userData.rdSeen = true                                  // 판정 결과와 무관하게 재방문 안 함
      //  ★175-b 그림자 캐스터 = 방 그룹만(현도 지시: 리브는 그림자를 만들지 않는다).
      //   실내 어둠은 **방 껍질 자신**이 dir을 막아 만든다 — 멀리 있는 리브가 던질 필요가 없다.
      //   ⚠투명 재질은 캐스터에서 제외(구 ShadowRig 규칙 승계 — 유리·샤프트가 검은 덩어리를 던지지 않게).
      //  ★175-g 첨탑은 캐스터에서 뺀다 — 조리개는 디스크(r6)이고 첨탑 벽(16.8)은 아무것도 막지 않는다.
      if (wantCast) o.castShadow = !(o.material && o.material.transparent) && !(SPIRE_NOCAST && o.userData.spireShell)
      if (!wantDark) return
      if (!ROOM_DARK_SHELL && o.userData.roomShell) return       // 껍질 제외 체제(aoMap 한정 — 그림자는 위에서 이미 켰다)
      for (const m of [].concat(o.material)) {
        if (!m || !m.isMeshStandardMaterial || m.userData.roomDark) continue
        m.aoMap = aoTex
        m.aoMapIntensity = ROOM_DARK_AO
        m.userData.roomDark = true
        m.needsUpdate = true      // ★USE_AOMAP define 재컴파일 — 이 한 줄이 없으면 화면은 그대로다
        n++
      }
    })
    if (n) { console.info(`[ROOM_DARK] aoMap 주입 재질 ${n}개 (AO=${ROOM_DARK_AO} · 껍질포함=${ROOM_DARK_SHELL})`); invalidate() }
  })

  //  ★178 분할 어댑터 — 수학 정본 = lightingModel.splitSoupAtBoundary(사본 금지). 여기는 마샬링만:
  //   ⑴걸침 선판정(무접촉이면 기하 원형 보존 — index·groups 그대로) ⑵toNonIndexed ⑶속성 수프 → 분할 → 재장착.
  //   새 정점 = 부모 변 중점뿐(위치 이동 0) → 보행 레이캐스트 무해(표면 동일 · boundingSphere 재계산).
  //   ⚠interleaved 속성은 건너뛴다(수프 마샬링 불가 — 스미어 존치가 크래시보다 낫다).
  const splitGeoAtZone = (g, matrixWorld, Z) => {
    const w = new THREE.Vector3()
    const inside = (x, y, z) => { w.set(x, y, z).applyMatrix4(matrixWorld); return zoneAInterior([w.x - ROOM_CX, w.y, w.z], Z.spire) }
    const posA = g.attributes.position, idx = g.index
    const flagAt = (i) => inside(posA.getX(i), posA.getY(i), posA.getZ(i))
    const nCorner = idx ? idx.count : posA.count
    let any = false
    for (let t = 0; t < nCorner; t += 3) {
      const s = (flagAt(idx ? idx.getX(t) : t) ? 1 : 0) + (flagAt(idx ? idx.getX(t + 1) : t + 1) ? 1 : 0) + (flagAt(idx ? idx.getX(t + 2) : t + 2) ? 1 : 0)
      if (s > 0 && s < 3) { any = true; break }
    }
    if (!any) return 0
    if (Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) { console.warn('[BAKE_A] interleaved 속성 — 분할 건너뜀'); return 0 }
    const src = g.index ? g.toNonIndexed() : g
    const attrs = {}
    for (const nm of Object.keys(src.attributes)) attrs[nm] = { array: src.attributes[nm].array, itemSize: src.attributes[nm].itemSize }
    const res = splitSoupAtBoundary(attrs, inside, BAKE_SPLIT_EPS)
    g.setIndex(null)
    g.clearGroups()
    for (const nm of Object.keys(res.attrs)) g.setAttribute(nm, new THREE.BufferAttribute(res.attrs[nm], attrs[nm].itemSize))
    g.computeBoundingSphere()
    return res.added
  }

  //  ★198 조도 구배 분할 — 급변 구간에 정점을 넣는다(★178과 같은 4분할 · 위치 이동 0).
  //   ⚠판정은 굽기와 **같은 식**이어야 한다: 월드 변환 + 법선 + zoneAInterior/zoneAShadeAt(사본 금지).
  const splitGeoByGradient = (g, matrixWorld, Z) => {
    if (Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return 0
    if (!g.attributes.normal) return 0
    const w = new THREE.Vector3(), nw = new THREE.Vector3()
    const nMat2 = new THREE.Matrix3().getNormalMatrix(matrixWorld)
    const shadeOf = (c) => {
      w.set(c.position[0], c.position[1], c.position[2]).applyMatrix4(matrixWorld)
      nw.set(c.normal[0], c.normal[1], c.normal[2]).applyMatrix3(nMat2).normalize()
      const p = [w.x - ROOM_CX, w.y, w.z], n = [nw.x, nw.y, nw.z]
      return zoneAInterior(p, Z.spire, n) ? zoneAShadeAt(p, n, Z) : 1
    }
    const src = g.index ? g.toNonIndexed() : g
    const attrs = {}
    for (const nm of Object.keys(src.attributes)) attrs[nm] = { array: src.attributes[nm].array, itemSize: src.attributes[nm].itemSize }
    const res = splitSoupByGradient(attrs, shadeOf, BAKE_GRAD_TOL, BAKE_GRAD_MIN)
    if (!res.added) return 0
    g.setIndex(null)
    g.clearGroups()
    for (const nm of Object.keys(res.attrs)) g.setAttribute(nm, new THREE.BufferAttribute(res.attrs[nm], attrs[nm].itemSize))
    g.computeBoundingSphere()
    return res.added
  }

  //  ═══════════ ★176 베이크 1차 — A구획 정점색(조명 헌장 Ⅱ · 2026.08.27) ═══════════
  //  공급지(표본점 집합)와의 방향·거리·코사인에서 정점별 밝기 배율을 유도해 color 속성에 굽는다.
  //  ⚠안팎 구분 = 제1 원칙: 구획 밖·바깥면 정점은 색 1(백) → 화면 불변. aoMap과 달리 안팎이 갈린다.
  //  ⚠수학 정본 = lightingModel(zoneAShadeAt — 사본 금지, check_lux N절이 같은 함수를 문다).
  //  ⚠순회 방식 = ROOM_DARK와 동일(매 프레임 '아직 안 본' 메시만 — ★174-c4 형제 effect 순서 함정 회피).
  //   순회 범위도 동일하게 방 그룹 한정(★175 ② 근거 승계). 재질 무접촉 — vertexColors 한 비트만 켠다.
  const bakeZ = useMemo(() => (BAKE_A_ON ? zoneABakeSpec() : null), [])
  useFrame(() => {
    if (!BAKE_A_ON || !bakeZ || !darkRef.current) return
    let n = 0, nSplitTri = 0, msSplit = 0, nGradTri = 0, msGrad = 0
    const tmpCol = new THREE.Color()
    const v = new THREE.Vector3(), nm = new THREE.Vector3(), nMat = new THREE.Matrix3()
    darkRef.current.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.userData.bakeSeen) return
      o.userData.bakeSeen = true                                // 판정 결과와 무관하게 재방문 안 함
      //  ★185 인스턴스 부재(낱장 디딤판 등)는 정점색을 쓸 수 없다 — 기하가 모든 인스턴스에 공유되기 때문.
      //   → **인스턴스 단위 색**(setColorAt)으로 굽는다. 표본점 = 그 인스턴스의 밟는 면 중심(윗면 법선).
      //   ⚠구 순회는 isInstancedMesh를 통째로 건너뛰었다 — 방 8각 나선(현도가 디스크 틈으로 올라오는 계단)이
      //    베이크를 한 번도 못 받아 검게 남은 원인(현도 실증 2026.08.27 free:14.49,100.06,-1.65).
      if (o.isInstancedMesh) {
        if (!BAKE_INST_ON || !o.instanceMatrix) return
        const mats0 = [].concat(o.material)
        if (!mats0.every((m) => m && m.isMeshStandardMaterial)) return
        o.geometry.computeBoundingBox()
        const bb = o.geometry.boundingBox
        const top = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2)  // 밟는 면 중심(로컬)
        const im = new THREE.Matrix4(), wp = new THREE.Vector3()
        let nInst = 0
        o.updateWorldMatrix(true, false)
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, im)
          wp.copy(top).applyMatrix4(im).applyMatrix4(o.matrixWorld)
          const p = [wp.x - ROOM_CX, wp.y, wp.z]
          let s = 1
          if (zoneAInterior(p, bakeZ.spire, [0, 1, 0])) { s = zoneAShadeAt(p, [0, 1, 0], bakeZ); nInst++ }   // ★195 표본 법선 = 밟는 면
          if (o.userData.bakeMin > s) s = o.userData.bakeMin
          o.setColorAt(i, tmpCol.setScalar(s))
        }
        if (!nInst) return                                      // 전 인스턴스가 구획 밖 — 무접촉
        if (o.instanceColor) o.instanceColor.needsUpdate = true
        n++
        return
      }
      const mats = [].concat(o.material)
      if (!mats.length || !mats.every((m) => m && m.isMeshStandardMaterial)) return   // 샤프트 ShaderMaterial 등 제외
      const g = o.geometry
      if (g.userData.bakedA || !g.attributes.position || !g.attributes.normal) return
      o.updateWorldMatrix(true, false)
      //  ★178: 굽기 전에 경계를 걸친 삼각형을 이분(스미어 소거). 재방문은 표식으로 0. 공유 기하는 첫 메시가 처리.
      if (BAKE_SPLIT_ON && !g.userData.bakeSplit) { g.userData.bakeSplit = true; const t0 = performance.now(); nSplitTri += splitGeoAtZone(g, o.matrixWorld, bakeZ); msSplit += performance.now() - t0 }
      //  ★198 조도 구배 분할(경계 분할 뒤에 — 경계는 이미 정점 해상도로 근사됐다)
      if (BAKE_GRAD_ON && !g.userData.bakeGrad) { g.userData.bakeGrad = true; const t1 = performance.now(); nGradTri += splitGeoByGradient(g, o.matrixWorld, bakeZ); msGrad += performance.now() - t1 }
      nMat.getNormalMatrix(o.matrixWorld)
      const P = g.attributes.position, N = g.attributes.normal
      const col = new Float32Array(P.count * 3)
      let touched = false
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld)
        const p = [v.x - ROOM_CX, v.y, v.z]                     // 방 로컬(베이크 좌표계 — 표본이 이 좌표)
        let s = 1
        //  ★195: 법선을 **판정 전에** 세운다 — 벽 살 대역의 안쪽 향 면 구제가 법선을 본다(문틀·상인방·디스크 테두리).
        nm.fromBufferAttribute(N, i).applyMatrix3(nMat).normalize()
        if (zoneAInterior(p, bakeZ.spire, [nm.x, nm.y, nm.z])) {
          s = zoneAShadeAt(p, [nm.x, nm.y, nm.z], bakeZ)
          //  ★184 부재 베이크 하한(미학 제어): 조명이 물리적으로 못 주는 밝기(챌·측면 t≈0.03 천장)는 부재가 갖는다
          if (o.userData.bakeMin > s) s = o.userData.bakeMin
          touched = true
        }
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s
      }
      if (!touched) return                                      // 전 정점이 구획 밖 — 색·재질 무접촉(화면 동일·비용 0)
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      g.userData.bakedA = true
      mats.forEach((m) => { m.vertexColors = true; m.needsUpdate = true })
      n++
    })
    if (n) { console.info(`[BAKE_A] 정점색 베이크 메시 ${n}개 (N=${BAKE_N} · floor=${BAKE_FLOOR} · 경계분할 +${nSplitTri}tri ${msSplit.toFixed(0)}ms · 구배분할 +${nGradTri}tri ${msGrad.toFixed(0)}ms)`); invalidate() }
  })

  // 나선 치수 — 꼭대기 칸 윗면 = 디스크 고리 윗면(49.3). 낱장 디딤판이 중심 반지름 RIN(=14, 고리 6~18 위)에 내려서고, 거기서 고리를 밟아 슬롯으로 나감.
  const TOP_SURFACE = COR_Y0 + COR_THICK / 2                       // 맨 윗 칸 윗면 = 착지 디스크 고리 윗면(49.3)
  const CLIMB       = TOP_SURFACE - ROOM_FLOOR_Y                   // 바닥 → 디스크 총 상승

  // ── 8각형 안쪽 나선 계단(공중에 뜬 낱장 디딤판) ────────────────────
  //  8등분 원을 따라 45°씩 꺾이며 중심으로 감기는 경로 위에, 얇은 디딤판을 PITCH
  //  간격으로 띄엄띄엄 얹는다. 깊이<간격이라 사이가 뜬다. 바깥(ROUT)=바닥 · 중심(RIN)=꼭대기.
  const N_SEG     = Math.max(3, Math.round(ROOM_STAIR_TURNS * ROOM_STAIR_SIDES))  // 조각(변) 수 = 회전수×변수
  const SEG_ANG   = (Math.PI * 2) / ROOM_STAIR_SIDES                              // 한 조각이 도는 각(45°)
  const TOTAL_ANG = N_SEG * SEG_ANG                                               // 누적 회전각(= TURNS×2π)
  // 코너 k(0=바닥·바깥 … N_SEG=꼭대기·중심): 반지름은 k에 선형, 각은 45°씩.
  const corner = (k) => {
    const f   = k / N_SEG
    const ang = ROOM_STAIR_PHASE + f * TOTAL_ANG                 // f=1 → ang=ROOM_TOP_AZ(37.5° — 터널 문 사이 도착)
    const r   = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f
    return { x: r * Math.cos(ang), z: r * Math.sin(ang) }
  }

  // 높이 기준 배치 — 칸마다 같은 높이(RISE)만 오른다. 경사(BIAS) 따라 간격이 자동:
  // 가파른 안쪽=촘촘(단수↑, 오르기 쉬움) · 완만한 바깥=성김. 위치는 그 높이의 8각형 경로점.
  const insts = useMemo(() => {
    const cs = []
    for (let k = 0; k <= N_SEG; k++) cs.push(corner(k))
    const cy = []                                              // 코너 누적 높이 — 안쪽일수록 가파르게(BIAS>1: 후반 급경사 → 돔 천장 회피)
    for (let k = 0; k <= N_SEG; k++) cy.push(CLIMB * Math.pow(k / N_SEG, ROOM_STAIR_BIAS))
    const nStep = Math.max(1, Math.round(CLIMB / ROOM_STAIR_RISE))  // 칸 수 = 총상승 ÷ 칸높이
    const rise  = CLIMB / nStep                               // 실제 칸높이(총상승에 딱 맞게 보정)
    const arr = []
    let seg = 0
    for (let m = 0; m < nStep; m++) {
      const yTop = (m + 1) * rise                             // 이 칸 윗면 높이(균일 상승)
      while (seg < N_SEG - 1 && yTop > cy[seg + 1]) seg++     // 이 높이에 해당하는 조각
      const span = cy[seg + 1] - cy[seg]
      const t = span > 1e-6 ? (yTop - cy[seg]) / span : 0     // 조각 내 위치(높이=위치, 둘 다 t에 선형)
      const a = cs[seg], b = cs[seg + 1]
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t
      const yRot = Math.PI / 2 - Math.atan2(b.z - a.z, b.x - a.x)  // 깊이축(z)을 진행방향에
      arr.push({ p: [x, ROOM_FLOOR_Y + yTop - ROOM_STAIR_SLAB / 2, z], ry: yRot })  // 윗면 = yTop
    }
    return arr
  }, [])
  const INST_COUNT = insts.length

  useLayoutEffect(() => {
    if (!treadRef.current) return              // ★107: SPIRAL_BODY='mass'면 낱장 메시가 아예 없다
    const dum = new THREE.Object3D()
    insts.forEach((it, i) => {
      dum.position.set(it.p[0], it.p[1], it.p[2])
      dum.rotation.set(0, it.ry, 0)
      dum.updateMatrix()
      treadRef.current.setMatrixAt(i, dum.matrix)
    })
    treadRef.current.instanceMatrix.needsUpdate = true
  }, [insts])

  // ── 비교용: 원형(매끈한) 나선 계단 — 같은 파라미터, 경로만 연속 원 ──────
  //  8각형 대신 연속 원. 같은 반지름·높이·회전·낱장 디딤판 → 형태(각짐 vs 매끈)만 비교(T키).
  const helixInsts = useMemo(() => {
    const nStep = Math.max(1, Math.round(CLIMB / ROOM_STAIR_RISE))
    const rise  = CLIMB / nStep
    const pt = (yy) => {                                        // 높이 yy에서의 원형 나선 점(각 연속)
      const f = ROOM_STAIR_BIAS === 1 ? yy / CLIMB : Math.pow(yy / CLIMB, 1 / ROOM_STAIR_BIAS)
      const ang = ROOM_STAIR_PHASE + f * TOTAL_ANG
      const r = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f
      return { x: r * Math.cos(ang), z: r * Math.sin(ang) }
    }
    const arr = []
    for (let m = 0; m < nStep; m++) {
      const yTop = (m + 1) * rise
      const cur = pt(yTop), prev = pt(Math.max(1e-4, yTop - rise * 0.5))   // 접선용 아래쪽 이웃
      const yRot = Math.PI / 2 - Math.atan2(cur.z - prev.z, cur.x - prev.x)
      arr.push({ p: [cur.x, ROOM_FLOOR_Y + yTop - ROOM_STAIR_SLAB / 2, cur.z], ry: yRot })
    }
    return arr
  }, [])

  useLayoutEffect(() => {
    if (!helixRef.current) return
    const dum = new THREE.Object3D()
    helixInsts.forEach((it, i) => {
      dum.position.set(it.p[0], it.p[1], it.p[2])
      dum.rotation.set(0, it.ry, 0)
      dum.updateMatrix()
      helixRef.current.setMatrixAt(i, dum.matrix)
    })
    helixRef.current.instanceMatrix.needsUpdate = true
  }, [helixInsts])

  // 빛우물 원뿔대 벽(빗면) — ★방사 개편(2026.07.09): 동쪽 박스 문 → 대각 터널 문 4개(45°+90°k).
  //  BOX_X0=54로 단축돼 박스는 더는 원뿔대에 안 닿음(동쪽 자동 봉인). 디스크 아래·문 위 벽은 남겨 가짜 구멍 방지 + 리브 시야 차단(스포).
  // === 원뿔대(빛우물) 벽: 대각 터널 구멍 4 + 돔(구)과 겹친 부분을 CSG로 정확히 빼기 (three-bvh-csg) ===
  // ★★★118 착지 디스크(2026.08.05 현도) — 얇은 압출 판 폐기, 정본 = `discGeometry.js`.
  //  두께는 노브가 아니라 **파생**(윗면 − 오큘러스 림 = 2.177)이고, 밑모서리는 §2-D 2대로 깎인다.
  //  ⚠구판은 `ExtrudeGeometry` + `position`으로 높이를 맞췄다 — 신판은 **월드 좌표로 직접** 짓는다
  //   (두께가 파생이라 position 보정식이 두 곳에 흩어지면 반드시 어긋난다).
  const discGeo = useMemo(() => buildDisc(), [])
  // ★★★127 첨탑(2026.08.14): SPIRE_ON이면 spireGeometry 정본 호출. 아래 구 wellCut(단일 원뿔대)은
  //  ⛔보존계 — SPIRE_ON=false 한 줄로 복귀(코드·CSG 로직 무손상 보존, 삭제 금지 규율).
  // ★★★128 첨탑 테라스(2026.08.14 현도) — 첨탑 본체와 **별개 메시**다:
  //  ⓐ 보존계가 독립(SPT_ON 한 줄) ⓑ 부피·watertight 검사가 본체와 섞이지 않는다 ⓒ CSG 대상이 아니다(문·돔 대역 위).
  //  ★★★★144-b: 테라스 판은 이제 나선의 **도착 구멍**을 안다. 구멍 제원은 `spireStairGeometry`가 계산해 주고
  //   이 파일이 넘긴다 — 테라스 모듈이 나선 모듈을 임포트하면 upperPlatform→linkPassage 사슬로 순환이 된다(㉒ TDZ 계열).
  const terrGeo = useMemo(() => (SPIRE_ON && SPT_ON ? buildSpireTerrace({ hole: terraceHoleOf() }) : null), [])
  //  ★★★★144-b 내벽 나선 — 첨탑·테라스와 **별개 메시**(보존계 독립 SPS_ON · CSG 대상 아님).
  //   ★144-a로 셸→테라스 통로 넷을 철거한 뒤 테라스로 오르는 **유일한 길**이다.
  const stairParts = useMemo(() => (SPIRE_ON && SPT_ON ? buildSpireStairParts() : []), [])
  // ★★★131 새 층(2026.08.14): 테라스 위 한 층. 테라스·첨탑과 **또 별개 메시**다 —
  //  ⓐ 보존계 독립(UPF_ON 한 줄) ⓑ 부피·watertight 검사 분리 ⓒ CSG 대상 아님(문은 아직 안 뚫는다 = 밀봉 유지).
  const upperParts = useMemo(() => (SPIRE_ON && SPT_ON && UPF_ON ? buildUpperPlatform() : []), [])
  //  ★133 복합체 — 첨탑·테라스가 있어야 문이 생길 자리가 있다(참·기둥은 방 돔 위 자립이지만 접합 대상이 첨탑)
  const bridgeParts = useMemo(() => (SPIRE_ON && SPT_ON && BRG_ON ? buildBridgeComplex() : null), [])
  //  ★★★147 접속 통로 — 첨탑 테라스(SPT)와 회랑 옥상(DRG)에 동시에 매인다.
  //   ⚠BRD_ON 한 줄이 보존계. ★133과의 점유 충돌은 check_bridge가 선언된 빚으로 들고 있다.
  const bridgeDeckParts = useMemo(() => (SPIRE_ON && SPT_ON && BRD_ON ? buildBridgeDeckParts() : null), [])
  //  ★★★148 볼트 — 관이 있어야 그 속이 있다(BRD_ON 종속). BRD_VLT_ON 한 줄이 보존계.
  const bridgeVaultParts = useMemo(() => (SPIRE_ON && SPT_ON && BRD_ON ? buildBridgeVaultParts() : null), [])
  //  ★★★150 사다리꼴 관 — BRD_TRP_ON 한 줄이 보존계(끄면 ★148 볼트 또는 구 평지붕)
  const bridgeTrapParts = useMemo(() => (SPIRE_ON && SPT_ON && BRD_ON ? buildBridgeTrapParts() : null), [])
  //  ★★★154 첨탑 az0° 문틀 — 개구는 buildSpire의 CSG가 뚫고, 이 메시는 그 둘레 띠다
  const spireDoorGeo = useMemo(() => (SPIRE_ON ? buildSpireDoorFrame() : null), [])
  //  ★136 — ★133 참이 도착지이므로 BRG_ON에 종속(복합체가 없으면 갈 곳이 없다)
  const link4Parts = useMemo(() => (SPIRE_ON && SPT_ON && BRG_ON && LK4_ON ? buildLink4() : null), [])
  //  ★137 — ★133 복합체와 무관(다른 셸·다른 방위)이라 BRG_ON에 매지 않는다
  const link3Parts = useMemo(() => (SPIRE_ON && SPT_ON && LK3_ON ? buildLink3() : null), [])
  //  ★★★143 1p2: 관 둘·첨탑·나선은 Radial의 LinkPassages가 짓는다. 여기서 더하는 것은 기둥 1기 + 아치 ① 뿐.
  const link2Parts = useMemo(() => (SPIRE_ON && SPT_ON ? buildLink2() : null), [])
  //  ★★★145 돔 리브·띠·기둥·고리 통로 — 첨탑(리브 상단)과 돔(띠)에 동시에 매인다.
  //   ⚠SPT_ON에 매지 않는다: 리브 상단은 **빗면 아래끝**(SPW_Y0)이지 테라스 판이 아니다.
  const ringParts = useMemo(() => (SPIRE_ON ? buildDomeRingParts() : null), [])
  const wellCut = useMemo(() => {
    if (SPIRE_ON) return buildSpire()
    const ev = new Evaluator()
    ev.attributes = ['position', 'normal']
    const rBot = ROOM_LAND_R, rTop = ROOM_WELL_RT
    const yBot = ROOM_CEIL_Y - 3, yTop = ROOM_CYL_TOP
    // 자르개 1: 대각 터널 solid ×4 — 원뿔대 벽(r18@y46)을 관통(RAD_T_IN=12 → r26)해 문을 낸다
    const doorLo = COR_Y0        // ★컷 바닥 49(구 46): 바닥판(48.68~49.28) 안 — 판 밑 원뿔벽 구멍 4곳 봉합(2026.07.11, 셸 CUT_BOT과 동일 근거)
    const cutters = []
    for (let k = 0; k < 4; k++) {
      const ang = RAD_ANG0 + k * Math.PI / 2
      const g = new THREE.BoxGeometry(26 - RAD_T_IN, RAD_TOP - doorLo, RAD_DOOR_HW * 2)  // ★폭 4.6(구 4.4): 컷 림(±2.3)이 허브 문틀 잼(2.2~2.7) 안에 삼켜짐(셸 문과 동일)
      g.translate((RAD_T_IN + 26) / 2, (RAD_TOP + doorLo) / 2, 0)
      g.rotateY(-ang)                                     // 로컬 +x → (cos ang, 0, sin ang) 방사 방향
      const b = new Brush(g); b.updateMatrixWorld()
      cutters.push(b)
    }
    // 자르개 2: 돔 solid(타원체=실제 돔 메시와 동일: 단위구 scale) — 원뿔대가 구를 파고든 부분만 제거
    const domeSolid = new THREE.SphereGeometry(1, 64, 40)
    domeSolid.scale(ROOM_R, ROOM_HEIGHT, ROOM_R)
    domeSolid.translate(ROOM_CX, ROOM_FLOOR_Y, 0)
    const domeBrush = new Brush(domeSolid); domeBrush.updateMatrixWorld()
    // 원뿔대 통벽 껍질
    const coneWall = new THREE.CylinderGeometry(rTop, rBot, yTop - yBot, 96, 40, true)
    coneWall.translate(0, (yBot + yTop) / 2, 0)
    const coneWallBrush = new Brush(coneWall); coneWallBrush.updateMatrixWorld()
    // 원뿔대 − 터널×4 − 돔 (겹친 부분만 잘라냄)
    let acc = coneWallBrush
    for (const b of cutters) { acc = ev.evaluate(acc, b, HOLLOW_SUBTRACTION); acc.updateMatrixWorld() }
    return ev.evaluate(acc, domeBrush, HOLLOW_SUBTRACTION).geometry
  }, [])

  // 빛 샤프트 재질(가짜 볼륨) — 표준 트릭: 시선이 기둥 중심을 관통하면(법선∥시선) 진하게, 실루엣(법선⊥시선)으로 갈수록 투명.
  // 진짜 빛기둥이 중심에서 가장 두꺼운 공기를 지나는 것과 같은 원리. + 위→아래 감쇠, 바닥 접점은 깃털(smoothstep).
  // three 내장 ShaderMaterial — 의존성 추가 없음. 원기둥 옆면 uv.y: 1=위, 0=아래. ⚠ 세기 노브 = uOpacity(0.30).
  const shaftMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(RM_SHAFT_COL) }, uOpacity: { value: RM_SHAFT_OP },
      uAxial: { value: SHAFT_EDGE_AXIAL ? 1.0 : 0.0 }, uTopFade: { value: SHAFT_TOP_FADE } },
    vertexShader: `
      varying vec3 vN; varying vec3 vNr; varying vec3 vV; varying float vY;
      void main() {
        vN = normalMatrix * normal;
        //  ★189 축 기준 반경방향 — 원기둥 로컬 원점이 곧 축이므로 (x,0,z)가 그대로 반경 방향이다.
        //   면 법선과 달리 **원뿔 기울기가 들어 있지 않아** 실루엣에서 정확히 시선과 수직이 된다.
        vNr = normalMatrix * normalize(vec3(position.x, 0.0, position.z));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz; vY = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uAxial; uniform float uTopFade;
      varying vec3 vN; varying vec3 vNr; varying vec3 vV; varying float vY;
      void main() {
        //  ★189 uAxial=1이면 축 기준 반경방향으로 실루엣을 판정한다(원뿔대의 경계선 소거).
        //   ⛔uAxial=0 = 구 체제(면 법선) — SHAFT_EDGE_AXIAL 보존계.
        vec3 nrm = normalize(mix(normalize(vN), normalize(vNr), uAxial));
        float facing = abs(dot(nrm, normalize(vV)));
        float edge = pow(facing, 1.6);
        //  ★190 상단 페이드 — 하단 깃털(smoothstep(0,0.18,vY))의 짝. 없으면 사슬 꼭대기에서 알파가
        //   최대인 채 끊겨 원형 모서리가 보인다(현도 실증). ⛔uTopFade=0 = 구 체제(보존계).
        float top = uTopFade > 0.0 ? 1.0 - smoothstep(1.0 - uTopFade, 1.0, vY) : 1.0;
        float len = smoothstep(0.0, 0.18, vY) * (0.30 + 0.70 * vY) * top;
        gl_FragColor = vec4(uColor, uOpacity * edge * len);
      }`,
  }), [])
  //  ★175-e 헤일로 = 같은 셰이더의 흐린 사본(색은 공유, 불투명도만 낮춘다 — 새 색을 만들지 않는다).
  const haloMat = useMemo(() => { const m = shaftMat.clone(); m.uniforms = THREE.UniformsUtils.clone(shaftMat.uniforms); m.uniforms.uOpacity.value = SHAFT_HALO_OP; return m }, [shaftMat])
  const SHAFT = useMemo(() => shaftNodes(), [])
  //  ★175-g 세그먼트 uv 리맵 — 셰이더의 세로 페이드(`len = smoothstep(0,0.18,vY)·(0.30+0.70·vY)`)는
  //   uv.y를 쓴다. 마디 사슬로 쪼개면 **세그먼트마다 자기 하단에서 0으로 꺼져** 이음매에 밝기 점프가 생긴다
  //   (현도 실증: "빛이 연결되는 부분에 미세하게 원형의 빛 경계" — 정확히 y52 마디 높이).
  //   ⇒ 각 세그먼트의 uv.y를 **사슬 전체에서의 높이 비율**로 다시 쓴다. 셰이더는 손대지 않는다.
  const SHAFT_CHAINS = useMemo(() => {
    //  ★209-d `spanY`(선택) = uv 리맵에 쓸 **원래** 사슬 높이. 하절 헤일로는 상단을 잘라내지만,
    //   페이드를 자른 사슬로 다시 재면 방 안 밝기가 바뀐다 ⇒ 자르기 전 span으로 계산한다.
    const build = (tag, nodes, mat, spanY = null) => {
      if (!nodes || nodes.length < 2) return null
      const yTop = spanY ? spanY[0] : nodes[0][0]
      const yBot = spanY ? spanY[1] : nodes[nodes.length - 1][0]
      const span = yTop - yBot
      const segs = nodes.slice(0, -1).map(([yA, rA], i) => {
        const [yB, rB] = nodes[i + 1]
        const geo = new THREE.CylinderGeometry(rA, rB, yA - yB, 40, 1, true)
        const uv = geo.getAttribute('uv'), pos = geo.getAttribute('position')
        for (let k = 0; k < uv.count; k++) {
          //  로컬 y(±h/2) → 월드 y → 사슬 비율. 정점 위치에서 직접 읽으므로 세그먼트 순서에 의존하지 않는다.
          const wy = (yA + yB) / 2 + pos.getY(k)
          uv.setY(k, (wy - yBot) / span)
        }
        uv.needsUpdate = true
        return { geo, cy: (yA + yB) / 2 }
      })
      return { tag, mat, segs }
    }
    return [
      build('u', SHAFT.upper, shaftMat), build('l', SHAFT.lower, shaftMat),
      //  ★209-c 상절 헤일로는 마운트하지 않는다 — 우물 안에선 전 구간 벽 밖이라 화면 기여 0이고,
      //   첨탑 **바깥**으로는 최대 14m 돌출해 탑을 빛으로 감쌌다(현도 실증). 하절(방 번짐)은 게이트 밖.
      ...(SHAFT_HALO_ON && SHAFT_HALO_UP_ON ? [build('hu', SHAFT.haloUp, haloMat)] : []),
      ...(SHAFT_HALO_ON ? [build('hl', SHAFT.haloLo, haloMat, SHAFT.haloLoSpan)] : []),
    ].filter(Boolean)
  }, [SHAFT, shaftMat, haloMat])

  // ── ★101 정의 각뿔대(2026.08.02 현도 그림) — 기하는 전부 defPitGeometry가 만든다(사본 금지) ──
  //  판 = 팔각 구멍 뚫린 고리 · 각뿔대 = 옆벽 껍질 + 바닥 슬래브. 셋 다 노브(깊이·상면·하면) 자동 추종.
  const PIT = useMemo(() => pitSpec(), [])
  //  ★103 모서리 슬롯 — 뒷벽이 판 구멍(rRim)을 넘으면 판·기단에 **노치**를 판다(현도 08.02 승인).
  //   같은 구멍 함수를 판과 기단이 공유해야 노치가 어긋나지 않는다(사본 금지).
  const SLOTOPT = useMemo(() => {
    if (!PIT_ON || !SLOT_ON) return {}
    const g = slotSpec()
    return g.slabBite > 0 ? { holeRAt: g.holeRAt, extraTh: g.extraTh } : {}
  }, [])
  const floorRingGeo = useMemo(() => buildHoledSlab(ROOM_R, 96, PIT.rRim, PIT_SIDES, PIT_PHASE, 0, SLOTOPT), [PIT, SLOTOPT])
  const pitWallGeo   = useMemo(() => buildPitWalls(), [])
  const pitRimGeo    = useMemo(() => buildPitRim(), [])
  const pitFloorGeo  = useMemo(() => buildPitFloor(), [])
  //  ★102 감실 — 밟는 면(바닥)과 안 밟는 면(천장·옆·뒤)을 **다른 메시로** 뗀다.
  const nicheWalkGeo = useMemo(() => buildNiches(true), [])
  const nicheWallGeo = useMemo(() => buildNiches(false), [])
  const nicheStepGeo = useMemo(() => buildNicheStairs(), [])
  //  ★103 슬롯 — 감실과 같은 분리 규약(밟는 바닥 ↔ 안 밟는 옆·뒤).
  const slotWalkGeo  = useMemo(() => buildPitSlot(true), [])
  const slotWallGeo  = useMemo(() => buildPitSlot(false), [])
  const slotStepGeo  = useMemo(() => buildSlotStairs(), [])   // ★104 A/B 체제 — 'off'면 빈 기하
  //  ★107 공리 나선 — 매스 몸통 + 지지 둘. 체제가 'off'면 빈 기하가 나온다(스위치가 기하 안에 있다).
  const spiralMassGeo = useMemo(() => (SPIRAL_BODY === 'mass' ? buildSpiralMass() : null), [])
  const spiralColGeo  = useMemo(() => (SPIRAL_BODY === 'mass' ? buildSpiralColumns() : null), [])
  const spiralBeamGeo = useMemo(() => (SPIRAL_BODY === 'mass' ? buildSpiralBeams() : null), [])
  //  ★111 공리 볼트 — 걷는 사람이 통과하는 문 7기(AX_VAULT_ON/LAYOUT은 기하 안의 스위치)
  const axVaultGeo = useMemo(() => (SPIRAL_BODY === 'mass' ? buildAxiomVaults() : null), [])
  //  ★114 벽 밑동 — 셸 안쪽 − 팔각 각뿔대. 윗면 없음(셸이 잘라 아치 여덟을 만든다). 위상 두 체제.
  const wallBaseGeo = useMemo(() => (WBASE_ON ? buildWallBase() : null), [])
  const shellGeo = useMemo(() => (ROOM_SHELL_SOLID ? buildRoomShell() : null), [])   // ★169
  //  ★115 뿌리 십자 마구리 — 아래 헌치를 세 방향으로 인용. 보와 상호 관입(불리언 없음).
  const rootCrossGeo = useMemo(() => ((SPIRAL_BODY === 'mass' && ROOT_CROSS_ON) ? buildRootCrosses() : null), [])
  //  ★116 방 돔 살 — 팔각 단 모서리 여덟에서 오큘러스까지. §2-C 예외(현도 승인 근거 ⓐbcd).
  const roomRibGeo = useMemo(() => (RRIB_ON ? buildRoomRibs() : null), [])
  //  ★117 감실 처마 — 입술에 앉아 아가리 위로 내밀며 솟는 패널 여덟(0° 모서리 = 슬롯이라 끊김)
  const eaveGeo = useMemo(() => ((PIT_ON && EAVE_ON) ? buildPitEaves() : null), [])
  //  빛 하절의 밑끝 — 기본은 구세계(기단 위)에서 그대로 끊는다. 각뿔대가 뚫리면 '허공에서 잘린 빛'이
  //  보이는데, 그것을 **보고 판정하는 것**이 이번 조각의 목적 중 하나다(현도 지시). PIT_SHAFT_DROP로 전환.
  const SHAFT_BOT_Y = (PIT_ON && PIT_SHAFT_DROP) ? PIT.yBot : ROOM_FLOOR_Y + DAIS_H

  //  ★★★113 팔레트 — v2.2 암실은 알베도 눈속임이었다(현도 2026.08.05). ROOM_DIM=false면 방이
  //   **건물 나머지와 같은 석재**가 된다. 밝은 값은 전부 Corridor.jsx(드럼)에서 **역할별로 인용**했다 —
  //   새 색을 만들지 않았다: 벽 #b89a6a · 걷는 면 #c2a062 · 디딤 #cdb074 · 움푹한 면 #a98f5e.
  const P = ROOM_DIM ? ROOM_PAL_DIM : ROOM_PAL_LIT   // ★172 정본화 — 값 동일(constants ⑷)
  //  fog 제외도 암실 패키지의 일부였다("밀폐 공간에 크림색 대기 미적용 — 먼 벽 뿌염 방지").
  //  눈속임을 걷으면 방도 건물과 같은 대기를 쓴다. ⚠분리하고 싶으면 이 한 줄만 false로 고정하면 된다.
  const RFOG = !ROOM_DIM

  return (
    <group position={[ROOM_CX, 0, 0]} ref={darkRef}>
      {/* ★★★169 방 껍질 솔리드(2026.08.22 현도 ⓒ) — 종잇장 두 장을 법선 오프셋 껍질 하나로.
          두께 = 봉합(T_OUT 0.187 · T_IN 0.300 — 전부 오차 파생, constants ★169 주석이 정본).
          닫힌 솔리드라 DoubleSide 불필요. ⛔ROOM_SHELL_SOLID=false = 아래 구 종잇장 복귀(보존계) */}
      {ROOM_SHELL_SOLID ? (
        <mesh geometry={shellGeo} userData={{ walkable: false, roomShell: true }}>   {/* 벽 — 밟는 면 아님. ★175 roomShell = ROOM_DARK_SHELL 제외 표식 */}
          <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />   {/* ★113 ROOM_DIM 노브 */}
        </mesh>
      ) : (<>
      {/* 지상 돔 껍질(불투명) + 작은 오큘러스(박스 폭 안 → 박스+디스크가 리브 시야 차단) */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_R, ROOM_HEIGHT, ROOM_R]}>
        <sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, ROOM_OCULUS, Math.PI / 2 - ROOM_OCULUS]} />
        <meshStandardMaterial color={P.shell} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />   {/* ★113 ROOM_DIM 노브 */}
      </mesh>
      {/* ★㊵ 구화: 아랫반 셸(윗반의 거울 — 수직 반축 동일) → 반타원 돔이 완전한 타원구가 되어 공중 부양.
          내부에서는 수평 주 바닥(아래 circle)이 아랫반을 가림 — 아랫반은 바깥에서 '떠 있는 구'로만 읽힌다 */}
      <mesh position={[0, ROOM_FLOOR_Y, 0]} scale={[ROOM_R, ROOM_HEIGHT, ROOM_R]}>
        <sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={P.shell} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />
      </mesh>
      </>)}
      {/* ★114 벽 밑동 팔각 각뿔대(2026.08.05) — 셸과 바닥이 만나는 곳을 여덟 기운 평면으로 받는다.
          윗면은 만들지 않는다: 셸이 잘라 가며 생기는 교선이 위로 볼록한 **아치 여덟**이 된다.
          ⚠밟는 면 아님. ⚠새 색 없음 — 셸과 같은 석재(★113 원칙). 면이 수직에 가까워 셸보다 밝게 읽힌다. */}
      {wallBaseGeo && (
        <mesh geometry={wallBaseGeo} userData={{ walkable: false }}>
          <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
        </mesh>
      )}
      {/* ★116 방 돔 살 여덟(2026.08.05) — 팔각 단 모서리 → 셸 자오선 → 오큘러스.
          바깥면은 셸 곡면 그대로(틈 0) · 굵기는 셸 법선 방향. ⚠밟는 면 아님. */}
      {roomRibGeo && (
        <mesh geometry={roomRibGeo} userData={{ walkable: false }}>
          <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
        </mesh>
      )}
      {/* ★㊵ 주 바닥(수평 유지) — 구 내부를 반으로 가르는 수평 판 = 관람 레벨. 부양으로 지면(y0)과 분리돼
          구 z-fighting 근거는 소멸했으나 ROOM_FLOOR_LIFT(0.05)는 벽 밑선 봉합 여유로 유지.
          ★101(2026.08.02): PIT_ON이면 가운데에 팔각 구멍이 뚫린 **고리**가 된다(구멍 = 각뿔대 입술 바깥면). */}
      {PIT_ON ? (
        <mesh geometry={floorRingGeo} position={[0, ROOM_FLOOR_Y + ROOM_FLOOR_LIFT, 0]} userData={{ walkable: true }}>
          <meshStandardMaterial color={P.floor} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />
        </mesh>
      ) : (
        <mesh position={[0, ROOM_FLOOR_Y + ROOM_FLOOR_LIFT, 0]} rotation-x={-Math.PI / 2} userData={{ walkable: true }}>
          <circleGeometry args={[ROOM_R, 64]} />
          <meshStandardMaterial color={P.floor} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />
        </mesh>
      )}
      {/* ★101 정의 각뿔대 — 옆벽(닫힌 껍질·입술 띠 포함) + 바닥 슬래브. 감실·계단은 다음 조각. */}
      {PIT_ON && (<>
        <mesh geometry={pitWallGeo} userData={{ walkable: false }}>   {/* 62° 빗면 — 밟는 면 아님 */}
          <meshStandardMaterial color={P.pitWall} roughness={0.95} fog={RFOG} />
        </mesh>
        <mesh geometry={pitRimGeo} userData={{ walkable: true }}>       {/* 입술 띠 — 판과 같은 높이 */}
          <meshStandardMaterial color={P.pitRim} roughness={0.95} fog={RFOG} />
        </mesh>
        {/* ★117 감실 처마(2026.08.05) — 입술에 앉아 아가리 위로 내밀며 솟는다.
            뿌리 팔각과 끝 팔각이 닮음이라 모서리 마이터가 저절로 맞는다. ⚠밟는 면 아님. */}
        {eaveGeo && (
          <mesh geometry={eaveGeo} userData={{ walkable: false }}>
            <meshStandardMaterial color={P.pitRim} roughness={0.95} fog={RFOG} />
          </mesh>
        )}
        <mesh geometry={pitFloorGeo} userData={{ walkable: true }}>
          <meshStandardMaterial color={P.pitFloor} roughness={0.95} fog={RFOG} />
        </mesh>
        {NICHE_ON && (<>
          <mesh geometry={nicheWallGeo} userData={{ walkable: false }}>   {/* 천장·옆벽·뒷벽 */}
            <meshStandardMaterial color={P.nicheWall} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />
          </mesh>
          <mesh geometry={nicheWalkGeo} userData={{ walkable: true }}>    {/* 감실 바닥 */}
            <meshStandardMaterial color={P.nicheFloor} roughness={0.95} fog={RFOG} />
          </mesh>
          {NICHE_FLOOR === 'stair' && (
            <mesh geometry={nicheStepGeo} userData={{ walkable: true }}>  {/* ⓑ 바닥→감실 안 계단 */}
              <meshStandardMaterial color={P.nicheStep} roughness={0.9} fog={RFOG} />
            </mesh>
          )}
        </>)}
        {SLOT_ON && (<>
          <mesh geometry={slotWallGeo} userData={{ walkable: false }}>   {/* 슬롯 옆벽 둘 · 뒷벽 */}
            <meshStandardMaterial color={P.slotWall} roughness={0.95} side={THREE.DoubleSide} fog={RFOG} />
          </mesh>
          <mesh geometry={slotWalkGeo} userData={{ walkable: true }}>    {/* 슬롯 바닥(턱 높이) */}
            <meshStandardMaterial color={P.slotFloor} roughness={0.92} fog={RFOG} />
          </mesh>
          {SLOT_STAIR !== 'off' && (
            <mesh geometry={slotStepGeo} userData={{ walkable: true }}>  {/* ★104 꺾인 상승 계단 */}
              <meshStandardMaterial color={P.slotStep} roughness={0.9} fog={RFOG} />
            </mesh>
          )}
        </>)}
      </>)}
      {/* 내부 채움광 — v2 감광(1.05→0.55): 판테온 무브의 상대 어둑함. 중앙에서 퍼지므로 선돌의 '중심을 보는 앞면'을 비추는 방향 */}
      <pointLight position={[0, ROOM_FLOOR_Y + ROOM_HEIGHT * 0.45, 0]} intensity={RM_LGT_CORE_I} distance={ROOM_R * 4} decay={1.4} color={RM_LGT_CORE_COL} />   {/* v2.2: 거의 소등 — 어둠은 여기서 나온다 */}
      {/* 판테온 스포트 — 빛우물 위에서 원점으로 수직 낙하. three의 spotLight.target 기본값이 월드 원점(씬 밖 Object3D=항등행렬)이라 타깃 배선 불필요 */}
      <spotLight position={[0, ROOM_CYL_TOP - 6, 0]} angle={Math.atan(RM_SPOT_SPREAD_R / (ROOM_CYL_TOP - 6))}
        penumbra={RM_SPOT_PEN} intensity={SPOT_I} distance={170} decay={RM_SPOT_DECAY} color={RM_LGT_SPOT_COL}
        castShadow={RM_SPOT_SHADOW}
        shadow-mapSize-width={RM_SPOT_SHDW_MAP} shadow-mapSize-height={RM_SPOT_SHDW_MAP}
        shadow-bias={RM_SPOT_SHDW_BIAS} shadow-normalBias={RM_SPOT_SHDW_NBIAS}
        shadow-camera-near={RM_SPOT_SHDW_NEAR} shadow-camera-far={180} />
        {/* ★174-c: 퍼짐 = 바닥 도달 반경 노브 · ★175-c castShadow = 빛을 **개구 모양으로 자른다**
            (없으면 원뿔이 천장을 뚫어 웅덩이 반경이 40으로 벌어지고 빛기둥과 어긋난다) */}
      {/* 웅덩이 반사광 — 낮은 포인트: 선돌 앞면(r26) 가독용. 벽(r91)에 닿기 전 감쇠 */}
      <pointLight position={[0, ROOM_FLOOR_Y + DAIS_H + 2.5, 0]} intensity={RM_LGT_DAIS_I} distance={42} decay={1.7} color={RM_LGT_DAIS_COL} />
      {/* 빛 샤프트 2절 — 출처 = 원뿔대 '꼭대기 구멍'(y=CYL_TOP, r=WELL_RT). 상절: 우물 안 낙하 · 하절: 디스크 구멍→웅덩이.
          두 절의 이음(디스크 높이)에서 하절 상단이 다시 밝아지는 건 의도 — 아래에서 보면 '구멍에서 빛이 나온다'로 읽힘 */}
      {/*  ★★★113 소등(현도 2026.08.05) — 이 둘은 빛이 아니라 **빛처럼 보이는 물체**다(가짜 볼륨).
           `ROOM_SHAFT_ON=true` 한 줄로 복원된다 — 셰이더·상수·기하 전부 보존. */}
      {ROOM_SHAFT_ON && (<>
        {/* ★175-e 현도 스케치: 갓 꼭지에서 시작해 각뿔대 바닥까지 관통하는 기둥 + 그 2배 폭의 헤일로.
            마디는 lightingModel.shaftNodes()가 기하에서 유도한다(사본 금지 — check_lux가 같은 함수를 문다).
            ⚠조리개·바닥 두 마디는 실제 스포트 원뿔 위의 점이라 기둥과 빛 자국이 어긋나지 않는다. */}
        {SHAFT_CHAINS.map(({ tag, mat, segs }) => segs.map((g, i) => (
          <mesh key={`${tag}${i}`} geometry={g.geo} material={mat} position={[0, g.cy, 0]} />
        )))}
      </>)}
      {/* ★107 공리 나선 — 'mass'(속 찬 매스 + 지지) ↔ 'treads'(구세계 낱장 141칸 · 보존계).
          ⚠매스는 윗면이 램프다 — 경사 7.74°가 평면 나선에 잠겨 있어 계단이 성립하지 않는다(constants 주석). */}
      {SPIRAL_BODY === 'mass' ? (<>
        <mesh geometry={spiralMassGeo} userData={{ walkable: true }}>      {/* 몸통 — 윗면이 밟는 면 */}
          <meshStandardMaterial color={RM_AXSP_MASS_COL} roughness={0.82} />
        </mesh>
        {(SPIRAL_SUP === 'both' || SPIRAL_SUP === 'slab') && (
          <mesh geometry={spiralColGeo} userData={{ walkable: false }}>   {/* ② 판 기둥 — 하부 37% */}
            <meshStandardMaterial color={RM_AXSP_SLAB_COL} roughness={0.9} />
          </mesh>
        )}
        {(SPIRAL_SUP === 'both' || SPIRAL_SUP === 'wall') && (
          <mesh geometry={spiralBeamGeo} userData={{ walkable: false }}>  {/* ① 벽 보 — 상부 63% */}
            <meshStandardMaterial color={RM_AXSP_SUP_COL} roughness={0.88} />
          </mesh>
        )}
        {/* ★115 뿌리 십자 마구리(2026.08.05) — 위·좌·우 세 팔. 아래 팔(헌치)은 보가 그대로 갖고 있다.
            보와 같은 석재·같은 색. 상호 관입이라 불리언 없음(㊷ 날 뿌리·★92 극점 전례). */}
        {(SPIRAL_SUP === 'both' || SPIRAL_SUP === 'wall') && rootCrossGeo && (
          <mesh geometry={rootCrossGeo} userData={{ walkable: false }}>
            <meshStandardMaterial color={RM_AXSP_SUP_COL} roughness={0.88} />
          </mesh>
        )}
        {axVaultGeo && (
          <mesh geometry={axVaultGeo} userData={{ walkable: false }}>    {/* ★111 공리 볼트(문) 7기 */}
            <meshStandardMaterial color={RM_AXSP_VAULT_COL} roughness={0.86} />
          </mesh>
        )}
      </>) : (<>
        {/* 구세계 낱장 — T키로 8각형(각짐) ↔ 원형(매끈) 비교. 둘 다 같은 파라미터. */}
        <instancedMesh ref={treadRef} args={[undefined, undefined, INST_COUNT]} visible={stairKind === 'octagon'} userData={{ walkable: stairKind === 'octagon' }}>
          <boxGeometry args={[ROOM_STAIR_WIDTH, ROOM_STAIR_SLAB, ROOM_STAIR_TREAD]} />
          <meshStandardMaterial color={RM_PLATE_COL} roughness={0.8} />
        </instancedMesh>
        <instancedMesh ref={helixRef} args={[undefined, undefined, helixInsts.length]} visible={stairKind === 'circle'} userData={{ walkable: stairKind === 'circle' }}>
          <boxGeometry args={[ROOM_STAIR_WIDTH, ROOM_STAIR_SLAB, ROOM_STAIR_TREAD]} />
          <meshStandardMaterial color={RM_PLATE_COL} roughness={0.8} />
        </instancedMesh>
      </>)}
      {/* 주어진 것들 — 성역 기단·각인 + 정의 옥타곤 + 공리 스테이션(나선 왼쪽 동행). 형태 = 선돌(잠정) */}
      <DefPrecinct />
      {DEF_OCT_ON && <DefOctagon />}   {/* ★101: 각뿔대가 서면 r26은 구멍 위 허공 — 정의는 감실로 간다(다음 조각) */}
      {AX_ON && <AxiomStations />}   {/* ★107: 어휘 재검토 중 소등(현도 08.03). 좌표·형태는 보존 — AX_ON 한 줄로 복귀 */}
      {/* 꼭대기 착지 디스크(고리) — 가운데를 뚫어(천장 개방) 나선이 그 구멍으로 올라오고 빛우물이 위로 트임. 바깥 고리(6~18)는 걷는 발판.
          ★★118(2026.08.05 현도): 두께 0.35 압출 판 → **속 찬 매스 2.177**. 밑면이 오큘러스 림 평면에 앉아
          구판의 "디스크가 림 위 1.827 허공에 뜬" 단차가 소멸한다. 윗면 101.320은 불변(걷는 면·문지방 물림).
          ⚠이제 닫힌 솔리드라 `side`는 FrontSide다(구판 DoubleSide는 종잇장이라 필요했던 것). */}
      <mesh geometry={discGeo} userData={{ walkable: true }}>
        <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} />
      </mesh>
      {/* 솟은 원뿔대(빛 우물) — 위는 막혀 리브 가림(스포), +x(통로)쪽 아래는 출입문으로 트여 통로로 나감.
          올려다보면 좁은 꼭대기로 빛만 보이고, 정면(통로쪽)으론 걸어 나갈 문이 있음. */}
      {/* ★127: 첨탑 = 닫힌 솔리드 → FrontSide(★118 디스크와 같은 근거 — 구 DoubleSide는 종잇장 관이라 필요했던 것) */}
      <mesh geometry={wellCut} userData={{ spireShell: true }}>   {/* ★175-g 캐스터 제외 표식 — 조리개는 디스크(r6)이지 첨탑 벽(16.8)이 아니다 */}
        <meshStandardMaterial color={RM_SPIRE_COL} roughness={0.92} side={SPIRE_ON ? THREE.FrontSide : THREE.DoubleSide} />
      </mesh>
      {/* ★128 첨탑 테라스 — 원기둥 안에 걸리는 고리 판(바깥 끝은 내벽 속에 묻힘 = 틈 없음).
          가운데 구멍은 세 체제(SPT_HOLE: 'circle'/'pit'/'tunnel') — 한 줄 교체로 로컬 비교. */}
      {terrGeo && (
        <mesh geometry={terrGeo} userData={{ walkable: true }}>
          <meshStandardMaterial color={RM_SPIRE_COL} roughness={0.92} side={THREE.FrontSide} />
        </mesh>
      )}
      {upperParts.map(({ id, geo }) => (
        <mesh key={id} geometry={geo} userData={{ walkable: true }}>
          <meshStandardMaterial color={RM_SPIRE_COL} roughness={0.92} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★★144-b 내벽 나선 계단 — 본체는 밟는 면, 난간(턱)은 아니다.
          ⚠walkable은 리터럴로 적는다(check_waypoints 메시 센서스가 소스를 파싱한다 — ★131 교훈). */}
      {stairParts.map(({ id, geo, walk }) => (
        walk
          ? <mesh key={'sps-' + id} name={'첨탑나선/' + id} geometry={geo} userData={{ walkable: true, bakeMin: BAKE_STAIR_MIN }}>
              <meshStandardMaterial color={RM_SPIRE_COL} roughness={0.92} side={THREE.FrontSide} />
            </mesh>
          : <mesh key={'sps-' + id} name={'첨탑나선/' + id} geometry={geo} userData={{ walkable: false, bakeMin: BAKE_STAIR_MIN }}>
              <meshStandardMaterial color={RM_SPIRE_COL} roughness={0.92} side={THREE.FrontSide} />
            </mesh>
      ))}
      {/* ★★★133 1p4 방위 0° 복합체(2026.08.15) — 2층 계단 관(참→테라스 · 참 위→새 층) + 참 + 기둥 + 아치.
          별개 메시(보존계 독립 · CSG 대상 아님 — 밀봉: 문 컷 = 다음 조각). 재질 = ★130 통로 가족(길 연속). */}
      {bridgeParts && bridgeParts.walk.map(({ id, geo }) => (
        <mesh key={'brg-' + id} name={'1p4복합체/' + id} geometry={geo} userData={{ walkable: true }}>
          <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {bridgeParts && bridgeParts.solid.map(({ id, geo }) => (
        <mesh key={'brg-' + id} name={'1p4복합체/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★147 접속 통로(2026.08.19 현도 스케치 — 블록아웃 -a): 테라스 y127에서 수평 밀폐관으로 나가
          회랑 옥상 위 기둥에 닿고, 기둥 속 직각나선으로 10.66 내려가 직선 계단으로 ★54 월대에 착지.
          측벽은 -a에서 민짜(`BRD_SIDE='solid'`) — -b에서 양면 아케이드 8베이로 교체(한 줄).
          재질 = ★130 통로 가족(길 연속 — walk/solid 두 톤). */}
      {bridgeDeckParts && bridgeDeckParts.walk.map(({ id, geo }) => (
        <mesh key={'brd-' + id} name={'1p12접속통로/' + id} geometry={geo} userData={{ walkable: true }}>
          <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {bridgeDeckParts && bridgeDeckParts.solid.map(({ id, geo }) => (
        <mesh key={'brds-' + id} name={'1p12접속통로/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★148 관 사변형 리브 볼트 + 벽앞 기둥 + 첨탑 대역 ⓚ′ — 재질 = ★130 통로 가족 solid 톤 */}
      {bridgeVaultParts && bridgeVaultParts.solid.map(({ id, geo }) => (
        <mesh key={'brdv-' + id} name={'1p12접속통로/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★154 첨탑 az0° 문틀 — 첨탑 살 가족(우물 톤) */}
      {spireDoorGeo && (
        <mesh name="첨탑/az0문틀" geometry={spireDoorGeo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      )}
      {/* ★★★150 사다리꼴 관 — 같은 재질 가족 */}
      {bridgeTrapParts && bridgeTrapParts.solid.map(({ id, geo }) => (
        <mesh key={'brdt-' + id} name={'1p12접속통로/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★136 1p4 셸 나선 참 → ★133 참 수평 접속 관(2026.08.15) — LNK 가족 최초의 rise 0 관.
          두 안 병존: LK4_MODE 'zigzag'(세 마디·마이터 꺾임) / 'smooth'(3차 베지어). 재질 = ★130 통로 가족. */}
      {link4Parts && link4Parts.walk.map(({ id, geo }) => (
        <mesh key={'lk4-' + id} name={'1p4접속관/' + id} geometry={geo} userData={{ walkable: true }}>
          <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★136-c 접합부 아치 — 관 곡선을 따라 휘는 스윕(걷는 면 아님). 재질 = ★133 solid 가족 */}
      {/* ★★★137 1p3형 셸 → 테라스 통로 — ① 오르막 직선 관 · 띄운 참 · ② 오르막 관 · 기둥 · 아치
          ★★★141(2026.08.16): **1p1에도 같은 형태**. 기하는 한 벌이고 `link3Mounts()`가 준 각도로 돌려 단다
          (꽃잎·LNK 통로 가족과 같은 어법 — 기하 사본 0. k3 = 0° · k1 = 180°). */}
      {link3Parts && link3Mounts().map(({ k, rotY }) => (
        <group key={'lk3g-' + k} rotation-y={rotY}>
          {link3Parts.walk.map(({ id, geo }) => (
            <mesh key={'lk3-' + k + '-' + id} name={'1p' + LK3_PROP[k] + '통로/' + id} geometry={geo} userData={{ walkable: true }}>
              <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} side={THREE.FrontSide} />
            </mesh>
          ))}
          {link3Parts.solid.map(({ id, geo }) => (
            <mesh key={'lk3s-' + k + '-' + id} name={'1p' + LK3_PROP[k] + '통로/' + id} geometry={geo} userData={{ walkable: false }}>
              <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
            </mesh>
          ))}
        </group>
      ))}
      {/* ★★★143 1p2 통로의 기둥 + 아치 ① — 경유지가 배정된 셸에만(파생 마운트 · 손 지정 0).
          ⛔아치 ②는 짓지 않는다(현도 2026.08.17): 기둥 면과 ② 관 사이 빈 구간 4.51 위에 첨탑 원통이
          서 있어 살이 계단실로 14.55 들어온다 — 곡률로 안 풀린다. 사유 전문 = constants.js LK2_* 절. */}
      {link2Parts && link2Mounts().map(({ k, rotY }) => (
        <group key={'lk2g-' + k} rotation-y={rotY}>
          {link2Parts.solid.map(({ id, geo }) => (
            <mesh key={'lk2s-' + k + '-' + id} name={'1p2통로/' + id} geometry={geo} userData={{ walkable: false }}>
              <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
            </mesh>
          ))}
        </group>
      ))}
      {link4Parts && link4Parts.solid.map(({ id, geo }) => (
        <mesh key={'lk4-' + id} name={'1p4접속관/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {/* ★★★145 돔 리브 · 띠 · 기둥 · 고리 통로(2026.08.18 현도 스케치 — 블록아웃).
          리브·기둥은 방위 90°k의 회전 마운트(기하 한 벌 — 사본 0), 띠·통로는 회전체라 그대로 한 번.
          ⚠k0(0°)은 ★133 복합체 자리라 `DRG_KS`에서 빠져 있다 — 넷째는 그 배열에 0을 넣는 한 줄. */}
      {ringParts && ringParts.mounts.map(({ k, rotY }) => (
        <group key={'drg-' + k} rotation-y={rotY}>
          <mesh name={'돔리브/' + k} geometry={ringParts.rib} userData={{ walkable: false }}>
            <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
          </mesh>
          {/* ★145 곧은 기둥 — ★146 접합부 체제(DRG_JP_ON)면 소등(보존계) */}
          {ringParts.col && (
            <mesh name={'통로기둥/' + k} geometry={ringParts.col} userData={{ walkable: false }}>
              <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
            </mesh>
          )}
          {/* ★★★146-b 접합부 팔각 앵커판 + ∩아치 기둥(상면이 회랑 밑면 전폭을 진다 — 머리 별도 부재 없음) */}
          {ringParts.joint && (
            <>
              <mesh name={'접합판/' + k} geometry={ringParts.joint.plate} userData={{ walkable: false }}>
                <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
              </mesh>
              <mesh name={'지지기둥/' + k} geometry={ringParts.joint.col} userData={{ walkable: false }}>
                <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {ringParts && (
        <mesh name="돔띠" geometry={ringParts.band} userData={{ walkable: false }}>
          <meshStandardMaterial color={P.shell} roughness={0.95} fog={RFOG} />
        </mesh>
      )}
      {/* ★145-d 고리 회랑 — walk(바닥판·지붕판 상면 = 회랑 바닥·옥상) / solid(안벽·아케이드·난간).
          아케이드 벽은 실두께 1.2(SPIRE_T 승계) + 인트라도스·문설주 리빌 면 = §2-D 종잇장 금지.
          'block' 체제(보존계)면 walk에 민짜 블록 하나만 온다 — 마운트 코드는 그대로다. */}
      {ringParts && ringParts.corrParts.walk.map(({ id, geo }) => (
        <mesh key={'drgc-' + id} name={'고리회랑/' + id} geometry={geo} userData={{ walkable: true }}>
          <meshStandardMaterial color={PAL_FLOOR} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      {ringParts && ringParts.corrParts.solid.map(({ id, geo }) => (
        <mesh key={'drgs-' + id} name={'고리회랑/' + id} geometry={geo} userData={{ walkable: false }}>
          <meshStandardMaterial color={PAL_WALL} roughness={0.9} side={THREE.FrontSide} />
        </mesh>
      ))}
      <pointLight position={[0, ROOM_CYL_TOP - 8, 0]} intensity={RM_LGT_WELL_I} distance={ROOM_CYL_TOP * 1.6} decay={1.1} color={RM_LGT_WELL_COL} />
    </group>
  )
}

// ── 성역 기단(dais) + 바닥 각인: 땅이 선돌을 등록한다 (v2, 2026.07.03) ──
//  기단 = '받침'이 아니라 '지형' — 넓고(r34) 낮게(h0.7). 선돌은 그 표면에서 여전히 직접 솟는다(받침 없음 유지).
//  각인은 동심 어휘만: 팔각선(선돌 8기를 꿰는 고리) + 상단 가장자리 링. ⚠ 방사선(중심→선돌)은 금지 — 별자리 의존선 어휘와 충돌(정의끼리 연결된 듯 오독).
function DefPrecinct() {
  const DAIS_TOP_R = DAIS_R - DAIS_STEP_IN * (DAIS_STEPS - 1)
  //  ★101(2026.08.02): 각뿔대가 서면 기단 2단(속 찬 원판 r34·r31.8)이 정통으로 뚫린다 → **고리**로 다시 잘린다.
  //   구멍은 판과 **같은 팔각**(같은 반경·위상)이라 입술이 두 번 그려지지 않는다.
  const PIT = useMemo(() => (PIT_ON ? pitSpec() : null), [])
  //  ⚠★102 가드(2026.08.02): 구멍이 커지면(상면 32 → 구멍 33.5) **단이 구멍보다 안쪽**이 된다.
  //   그 상태로 고리를 만들면 안반경 > 바깥반경이라 면이 뒤집혀 깜빡이는 띠가 된다(현도 로컬 목격).
  //   구멍 최대반경보다 작은 단은 **그리지 않는다** — 사라지는 것이 정직하다(검사가 수를 보고한다).
  const tierGeos = useMemo(() => (PIT_ON
    ? Array.from({ length: DAIS_STEPS }, (_, k) => {
        const R = DAIS_R - DAIS_STEP_IN * k
        return R > PIT.rRim + 0.05
          ? buildHoledSlab(R, 96, PIT.rRim, PIT_SIDES, PIT_PHASE, DAIS_STEP_H,
              (PIT_ON && SLOT_ON && slotSpec().slabBite > 0)
                ? { holeRAt: slotSpec().holeRAt, extraTh: slotSpec().extraTh } : {})
          : null
      })
    : null), [PIT])
  //  각인선 반경 — 'rim'이면 구멍 테두리 바깥으로 파생 이동(원위치 r26은 구멍 위 허공이다).
  const markR = PIT_ON && PIT_MARK_MODE === 'rim' ? PIT.rRim + PIT_MARK_GAP : DEF_OCT_R
  const markOn = !(PIT_ON && PIT_MARK_MODE === 'off')
  const markPhase = PIT_ON && PIT_MARK_MODE === 'rim' ? PIT_PHASE : DEF_OCT_PHASE
  return (
    <group>
      {!DAIS_ON ? null : Array.from({ length: DAIS_STEPS }, (_, k) => (PIT_ON ? (tierGeos[k] === null ? null : (
        <mesh key={k} geometry={tierGeos[k]} position={[0, ROOM_FLOOR_Y + DAIS_STEP_H * (k + 1), 0]} userData={{ walkable: true }}>
          <meshStandardMaterial color={RM_DAIS_DARK_COL} roughness={0.95} side={THREE.DoubleSide} fog={false} />
        </mesh>
      )) : (
        <mesh key={k} position={[0, ROOM_FLOOR_Y + DAIS_STEP_H * (k + 0.5), 0]} userData={{ walkable: true }}>
          <cylinderGeometry args={[DAIS_R - DAIS_STEP_IN * k, DAIS_R - DAIS_STEP_IN * k, DAIS_STEP_H, 96]} />
          <meshStandardMaterial color={RM_DAIS_DARK_COL} roughness={0.95} fog={false} />   {/* v2.2 암실화 — 여전히 바닥보다 한 단 위(성역) */}
        </mesh>
      )))}
      {/* 팔각 각인선 — ringGeometry의 thetaSegments=8이면 8각 고리. 꼭짓점 각 집합이 좌우대칭이라 rotation-x 뒤집힘과 무관하게 선돌 각과 일치 */}
      {markOn && (
      <mesh position={[0, ROOM_FLOOR_Y + DAIS_H + 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[markR - 0.28, markR + 0.28, 8, 1, markPhase]} />
        <meshStandardMaterial color={RM_MARK_COL} roughness={1} side={THREE.DoubleSide} fog={false} />   {/* v2.2 반전: 암실에선 각인이 밝은 쪽 */}
      </mesh>
      )}
      {/* 상단 가장자리 링 — ★106: 기단이 폐기되면 함께 사라진다(구세계 각인 어휘) */}
      {DAIS_ON && (
      <mesh position={[0, ROOM_FLOOR_Y + DAIS_H + 0.03, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[DAIS_TOP_R - 1.6, DAIS_TOP_R - 1.0, 96]} />
        <meshStandardMaterial color={RM_MARK_COL} roughness={1} side={THREE.DoubleSide} fog={false} />   {/* v2.2 반전: 암실에선 각인이 밝은 쪽 */}
      </mesh>
      )}
    </group>
  )
}

// ── 정의 옥타곤: 기단 위 정팔각형 선돌 8기 ──
//  D1 = +22.5°(전방 우측 첫 자리) → D1→D8 시계방향(위에서 — 계단 감김과 같은 손방향). +x는 틈 = 출발 축.
const DEF_IDS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']
function DefOctagon() {
  return (
    <group>
      {DEF_IDS.map((id, i) => {
        const a = DEF_OCT_PHASE + i * (Math.PI / 4)
        return <GivenMonolith key={id} id={id} baseY={ROOM_FLOOR_Y + DAIS_H}
          x={DEF_OCT_R * Math.cos(a)} z={DEF_OCT_R * Math.sin(a)} yRot={-a} />
      })}
    </group>
  )
}

// ── 공리 스테이션: 나선 등반에 동행하는 7기 ──
//  각 스테이션 = 그 지점 '발높이'에 부양하는 플랫폼 + 미니 선돌(기둥 제거 2026.07.03). 발높이 = CLIMB·f^BIAS(원형 계단 높이식의 역함수).
//  글자면은 안쪽(등반자) 향함. 확정형 = 원형 나선 기준 — T키 옥타곤 비교 모드에선 미세 어긋남(비교용이라 무시).
const AX_IDS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']
function AxiomStations() {
  const CLIMB = COR_Y0 + COR_THICK / 2 - ROOM_FLOOR_Y          // 총 상승 — DefAxiomRoom과 동일 기준(디스크 고리 윗면)
  return (
    <group>
      {AX_IDS.map((id, i) => {
        const f = AX_F0 + (AX_F1 - AX_F0) * (i / (AX_IDS.length - 1))
        const ang = ROOM_STAIR_PHASE + f * ROOM_STAIR_TOTAL_ANG
        const r = ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f + AX_OFFSET   // 등반 시야 왼쪽 = 바깥(+radial)
        const x = r * Math.cos(ang), z = r * Math.sin(ang)
        const platTop = ROOM_FLOOR_Y + CLIMB * Math.pow(f, ROOM_STAIR_BIAS)              // 그 f의 디딤판 윗면 높이
        return (
          <group key={id}>
            <mesh position={[x, platTop - ROOM_STAIR_SLAB / 2, z]}>
              <cylinderGeometry args={[AX_PLAT_R, AX_PLAT_R, ROOM_STAIR_SLAB, 24]} />
              <meshStandardMaterial color={RM_PLATE_COL} roughness={0.8} />
            </mesh>
            <GivenMonolith id={id} x={x} z={z} baseY={platTop} yRot={-ang}
              s={AX_MONO_SCALE} near={4} far={13} />
          </group>
        )
      })}
    </group>
  )
}
