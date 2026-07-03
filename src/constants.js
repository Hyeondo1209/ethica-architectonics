// ============================================================
//  constants.js — 공간 모델의 모든 상수·공유 함수 (수치의 정본 = 이 파일의 주석)
//  ※ 파일 분할(2026.07.03): 구 App.jsx L17~180을 글자 그대로 옮기고 export만 추가.
// ============================================================
import * as THREE from 'three'

// ============================================================
//  Ethica Architectonics — 1부 (1~15) · 돔 씬
//  ★ 전환본: "두꺼운 기둥 → 얇은 경선 리브 = 단일 속성 실체" + 비율유지 스케일업
//    - Pillars(두꺼운 원기둥) 삭제 · 별도 ClimbShaft 삭제
//    - 단일 속성 실체 = DomeRibs(얇은 리브) 그 자체. 72개 전부 '균일'(특별한 리브 없음).
//    - 탐험 = φ=0 리브 '안'의 나선(리브 중심선 ribCenter를 따라 오름).
//    - SCALE 배수를 모든 '건축 치수'에만 곱함. 사람 치수(EYE/SPEED/계단)는 고정.
// ============================================================

// ── 공간 전체 배수 (건축 치수 전용; 사람 치수 제외) ──────────────
//   비율 유지: 가로(반지름)·높이(H)·리브 굵기에 같은 배수 →
//   '빽빽한 72개' 룩은 그대로, 사람만 상대적으로 작아져 리브 '안'에 들어갈 수 있게 된다.
//   ※ 등반이 길게 느껴지면 이 값만 낮추면 된다(룩 동일, 돔만 작아짐).
//     높이만 따로 줄여 '낮고 넓은' 돔으로 가고 싶으면 다음 단계에서 높이 전용 배수를 분리.
export const SCALE = 3.5

// ── 돔/리브 (×SCALE) ──
export const R_BASE = 60 * SCALE          // 지표 반지름
export const R_TOP  = 35 * SCALE          // 천장 개구부 반지름
export const H      = 200 * SCALE         // 전체 높이
export const KNEE = 0.25, WIDTH = 0.02    // 무릎 위치/날카로움 — u(0~1)공간이라 스케일 무관(고정)
export const MERIDIANS = 72               // 리브 수(밀도 유지)
export const SHELL_RIB_R = 1.1 * SCALE    // 리브 굵기 — 같이 커져 사람이 들어갈 만큼(룩은 동일 비율)
export const RIB_PHI = 0                  // 탐험에 쓰는 리브의 각도(+x). 단, 모든 리브는 동일함.

export const DOWN = new THREE.Vector3(0, -1, 0)

export function rOf(u) {
  const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
  return R_TOP + (R_BASE - R_TOP) * f
}

// 리브(=단일 속성 실체) 중심선 위의 점. 탐험 나선은 이 선을 따라 '리브 안'을 오른다.
export function ribCenter(u) {
  const r = rOf(u)
  return new THREE.Vector3(r * Math.cos(RIB_PHI), H * u, r * Math.sin(RIB_PHI))
}

// ── 나선 계단 (리브 안, 사람 스케일) ──────────────────────────
export const U_LAND   = 0.22                         // 나선 끝 높이(무릎 0.25 살짝 아래) — u공간(고정)
export const Y_LAND   = H * U_LAND                    // 그 절대 높이(스케일 따라감)
export const STEP_RISE   = 0.32                        // 한 칸 높이(사람 스케일, 고정)
export const STAIR_STEPS = Math.max(40, Math.round(Y_LAND / STEP_RISE))   // 칸 수 자동(높이÷보폭)
export const STEPS_PER_TURN = 30                       // 한 바퀴 칸 수(나선 촘촘함)
export const STAIR_TURNS = STAIR_STEPS / STEPS_PER_TURN
export const STAIR_R     = SHELL_RIB_R * 0.55          // 헬릭스 반지름 — 리브 내부에 들도록 굵기에 비례
export const TREAD_DEPTH = 1.5                          // 디딤판(사람 스케일, 고정)
export const TREAD_WIDTH = 1.0
export const TREAD_THICK = 0.20
export const POLE_R      = 0.35

// ── 테라스(중앙, 도착) (×SCALE) ──
export const TERRACE_Y    = H * KNEE
export const TERRACE_RIN  = 27 * SCALE
export const TERRACE_ROUT = 33 * SCALE
export const TERRACE_ARC  = 2.4

// ── 계단참 + 직선 다리: 나선 top ↔ 테라스를 '구성으로' 잇는다(좌표 자동) ──
export const CLIMB_TOP    = ribCenter(U_LAND)          // 나선이 끝나는 지점(리브 위)
export const TERRACE_EDGE = new THREE.Vector3(         // 테라스 바깥 가장자리(+x쪽)
  TERRACE_ROUT * Math.cos(RIB_PHI), TERRACE_Y, TERRACE_ROUT * Math.sin(RIB_PHI))
export const PAD_SIZE     = 6.0
export const FLIGHT_LEN   = Math.hypot(TERRACE_EDGE.x - CLIMB_TOP.x, TERRACE_EDGE.y - CLIMB_TOP.y)
export const FLIGHT_STEPS = Math.max(6, Math.round(FLIGHT_LEN / TREAD_DEPTH))   // 다리 칸 수 자동
export const FLIGHT_WIDTH = 3.5

// 지하 방 (×SCALE) ──
// ── 지하 정의·공리 방 (스케치: 묻힌 돔 + 내벽 따라 도는 나선계단) (×SCALE) ──
//  관람객: 바닥에서 시작 → 안쪽 벽을 따라(살짝 띄워) 도는 나선을 올라 → 꼭대기 박스로 나가 통로로.
//  ※ 비례는 렌더 보고 조절: ROOM_R(넓이) · ROOM_HEIGHT(깊이=높이) · ROOM_STAIR_TURNS(회전수).
export const ROOM_CX      = 0                    // 방 중심 x = 큰 리브 돔의 열린 중심(원점). 복도 접합점이기도 함
export const ROOM_R       = 26 * SCALE          // 바닥(=가장 넓은) 반지름. 스케치=납작·넓은 돔
export const ROOM_CEIL_Y  = 14 * SCALE          // 돔 apex 높이 = 통로 접합 높이(변경 금지)
export const ROOM_FLOOR_Y = 0                    // 바닥 = 지면(지상 배치 — 더는 아래로 안 팜)
export const ROOM_DOME_APEX = 49                              // ★돔 정점 높이(파라미터). 기본=복도 49(원래). 키우면 돔이 위로 솟음
export const ROOM_HEIGHT  = ROOM_DOME_APEX - ROOM_FLOOR_Y     // 돔 전체 높이(wallR·domeClipY·돔메시·조명이 사용)
export const ROOM_OCULUS  = 0.193               // ★천장 구멍 반각(반지름≈17.4). 나선 상부가 이리로 올라와 돔천장 안닿음 + 빛우물(@정점17.3) 통과·디스크가 위 덮음. 구멍 크기 노브
// 안쪽 벽 수평 반지름(높이 y의 함수) — 돔 셸과 동일한 반구 프로파일을 공유(나선이 벽을 따라가게)
export const wallR = (y) => ROOM_R * Math.sqrt(Math.max(0, 1 - ((y - ROOM_FLOOR_Y) / ROOM_HEIGHT) ** 2))
// 돔(반구/타원체) 윗면 높이: (x,z)에서 돔이 솟은 표면 y. 돔 밖이면 0(지면).
// → 통로 벽·박스의 아래 모서리를 여기에 맞춰 잘라 '돔 내부 교집합'만 제거(교선을 따라).
export const domeClipY = (x, z) => {
  const dx = x - ROOM_CX, d2 = dx * dx + z * z, R2 = ROOM_R * ROOM_R
  return d2 < R2 ? Math.max(0, ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(1 - d2 / R2)) : 0
}
// 8각형 안쪽 나선 계단 · 공중에 뜬 낱장 디딤판(간격 PITCH · 두께 SLAB · 깊이 TREAD)
export const ROOM_STAIR_SIDES = 8                    // ★변 수(8=8각형). 스케치=8등분. 한 변=직선 계단 한 조각
export const ROOM_STAIR_TURNS = 2                  // ★총 회전수(스케치=약 2.5~3바퀴). ↓일수록 경사↑·단높이↑
export const ROOM_STAIR_WIDTH = 2.4                  // 디딤판 좌우 폭(걷는 방향에 수직 = 밟고 서는 너비)
export const ROOM_STAIR_TREAD = 4.0                  // ★디딜판 앞뒷 깊이(발 딛는 길이). 간격보다 작으면 사이가 뜼(가파른 안쪽은 초초해 붙기도)
export const ROOM_STAIR_RISE  = 0.35                 // ★한 칸 높이(균일). ↓=칸 많아짐·더 오르기 쉬움. 간격은 경사 따라 자동(가파른 데=초초)
export const ROOM_STAIR_BIAS  = 1.0                  // ★후반(안쪽) 가파름. 1=조각마다 등높이, ↑=안쪽일수록 급경사(돔 천장 안 닿게·헤드룸↑)
export const ROOM_STAIR_SLAB  = 0.35                 // ★디딤판 두께(얇은 부양 판)
export const ROOM_STAIR_ROUT  = 45                   // ★시작(바닥·바깥) 반지름 — 벽(ROOM_R=91) 안쪽. ↑=벽에 붙음. ↓일수록 경사↑
export const ROOM_STAIR_RIN   = 14                   // ★도착(꼭대기·중심) 반지름 — 디스크 고리(6~18)에 내려섬. 오큘러스(≈17.5)보다 작아야 관통
export const ROOM_LAND_R      = 18                              // 착지d디스크 = 빛우물(원뿔대) 바닥 반지름. (사용자 튜닝 18 — 박스 반폭과의 일치는 더는 강제 안 함)
export const ROOM_DISC_SLOT_START = 67 * Math.PI / 180         // ★디스크 슬롯 시작각(비는 부채꼴=나선 진입쪽). 방향 노브(스샷서 반대면 조정)
export const ROOM_DISC_SLOT_LEN   = 301 * Math.PI / 180        // ★슬롯 외 그리는 길이; 비는 52°(↑=슬롯 좁음)
export const ROOM_DISC_HOLE   = 6                               // 디스크 가운데 구멍 반지름
export const ROOM_CYL_TOP     = 110                               // 빛 우물 실린더 꼭대기 높이(다리 49 위로 솟음). 튜닝 노브
export const ROOM_WELL_RT     = 2.5                           // 빛우물 '꼭대기' 반지름(원뿔대 위). ↓=위 좁음=리브 스포 차단↑. 바닥은 ROOM_LAND_R(현재 18)=디스크와 맞물려 봉합
export const ROOM_STAIR_PHASE = -ROOM_STAIR_TURNS * Math.PI * 2       // 꼭대기가 +x(박스)를 향하도록 위상
export const ROOM_STAIR_TOTAL_ANG = ROOM_STAIR_TURNS * Math.PI * 2   // 총 회전각. ⚠ DefAxiomRoom 원형 계단 pt()와 같은 식(TURNS 정수일 때 동일) — 파일 분할 때 통합

// ── 주어진 것들: 정의 옥타곤 + 공리 스테이션 (★배치 확정 2026.07.02 · 형태 '선돌' = 같은 날 정의·공리 세션 잠정) ──
//  어휘 문법: 비석(받침 위에 '세워짐')=증명된 정리 ↔ 선돌(받침 없이 직접 '솟음')=주어진 정의·공리.
//  차이 채널: ①받침 유무 ②테이퍼 ③재질 톤(어둡고 거칢, 보조). 글자 기계는 비석과 동일(makeSteleTexture+거리 페이드).
export const DEF_OCT_R     = 26            // ★옥타곤 반지름(사람 스케일). v2: 18→26 — '가구 무더기'가 아니라 '들어가 있는 공간'. 인접 현≈19.9 · 기단 상단(r31.8) 안 여유 5+
export const DEF_OCT_PHASE = Math.PI / 8   // ★위상. π/8 → +x가 '틈'(D8|D1 사이 = 출발 문, 계단 발치 +x·r45와 축 정렬). 0이면 D1이 +x 정면(대안 ①-b)
export const MONO_W        = 3.4           // 선돌 정면 폭(밑동)
export const MONO_H        = 7.0           // 선돌 높이(비석 5.0보다 큼 — 시작점을 두르는 존재감. v2: 6→7)
export const MONO_THICK    = 1.1           // 밑동 두께
export const MONO_TAPER    = 0.72          // ★꼭대기/밑동 비율(<1 = 위가 좁음). 1이면 비석과 같은 직육면체가 돼 어휘가 무너짐
export const MONO_TEXT_MARGIN = 0.62       // 글자 패널 폭(밑동 폭 대비) — 꼭대기 폭(×0.72) 실루엣 안에 들어가게 좁힘
export const MONO_TEXT_H   = 0.60          // 글자 패널 높이(H 대비)
export const MONO_TEXT_CY  = 0.55          // 글자 패널 세로 중심(H 대비)
// 공리 스테이션 — 내벽 나선(원형 확정형)의 등반 시야 왼쪽(=바깥, 코드 판정 2026.07.02)에 A1(최하)~A7(최상).
// 기둥 제거(2026.07.03 로컬 판정: 가는 수직선 7개가 어수선) — 플랫폼은 '부양'(방의 낱장 디딤판과 같은 문법).
// ㉮ 기둥 장부는 통로 1p1~4 기둥 건으로 이월. '부양 = 주어진 것은 지지를 증명받지 않는다' 재독해 = 열린 결정.
export const AX_F0 = 0.05, AX_F1 = 0.85    // ★분포 구간(경로 매개변수 f, 균등 7개). 상한 85% = 정상부 간섭 회피 — 검증: f=.85 → 경로 r≈18.7·스테이션 r≈22.5·발높이 y≈41.9 → 원뿔대 기부(r18·y≥46)·착지 디스크(r6~18·y49.3)·그 높이 벽(r≈47) 모두 회피
export const AX_OFFSET     = 3.8           // ★경로 중심선→바깥 오프셋. 디딤판 바깥끝(+1.2)↔플랫폼 안끝(3.8−2.2) 틈 = 0.4
export const AX_PLAT_R     = 2.2           // 플랫폼 반지름. 두께는 ROOM_STAIR_SLAB(디딤판과 같은 판 = '디딤판 하나가 곁에 뿌리내림' 라임)
export const AX_MONO_SCALE = 0.6           // 미니 선돌 스케일(정의 선돌 대비)
// ── v2 성역 패키지(2026.07.03): 기단 + 판테온 빛 + 각인 — '대충 올려놓은' 3원인(땅 무인지·빛 무사건·수직 노이즈) 교정 ──
export const DAIS_R       = 34             // ★기단 1단(바깥) 반지름 — '받침'이 아니라 '지형'으로 읽히게 넓게. 최하 디딤판(r≈43.5)·스테이션 플랫폼 안끝(r≈45)과 여유 9+
export const DAIS_STEP_H  = 0.35           // 단 높이 = ROOM_STAIR_SLAB(디딤판과 같은 판 어휘)
export const DAIS_STEP_IN = 2.2            // 단마다 좁아지는 폭 → 상단 반지름 = 31.8
export const DAIS_STEPS   = 2
export const DAIS_H       = DAIS_STEPS * DAIS_STEP_H   // 기단 총높이 0.7 — 선돌 baseY·시작 눈높이 기준
export const POOL_R       = 13             // ★빛 웅덩이 반지름(스포트 각·샤프트 밑반지름). 선돌(r26)은 웅덩이 밖 그늘가에 선다
export const SHAFT_TOP_Y  = 49             // 샤프트 '허리' 높이(디스크 구멍) — v2.1: 출처를 원뿔대 꼭대기 구멍(ROOM_CYL_TOP·WELL_RT)으로 올리며 2절 구성
export const SHAFT_TOP_R  = 5.5            // 허리 반지름 — 디스크 구멍(r6) 바로 안. 직선 1절이면 이 높이서 r≈8.4가 되어 고체 디스크를 뚫고 빛나는 오류
export const SPOT_I       = 8.0            // ★판테온 스포트 세기 — v2.2: 알베도가 ~2.4배 어두워진 만큼 증폭(웅덩이 밝기 보존). 렌더 보며 튜닝

// ════════ 탐험 통로(복도) — 방 천장 꼭대기 ↔ 탐험경선 #0 ════════
//  ① 바닥을 방 천장 꼭대기에 붙임(접합)  ② 벽+천장으로 시야 차단(무한 실체 숨김)
//  ③ 바닥은 #0에만 닿고, 이웃 ±2는 벌어진 개구부로 '보이되 안 닿음'(정리 2·3·4)
export const COR_Y0       = ROOM_CEIL_Y         // 복도 바닥 높이 = 방 천장 꼭대기
export const COR_X0       = ROOM_CX             // 안쪽 끝(방 천장 꼭대기, 접합점)
export const COR_X1       = R_BASE              // 바깥 끝(탐험경선 #0)
export const COR_CYL_X0   = 42                  // 거대 원기둥(공간감 통로) 안쪽 시작 = 박스 연결부 바깥 끝. 튜닝 노브(↓일수록 원기둥 큼)
export const COR_FLOOR_HW = 2.5                   // 다리·계단 반폭(길 폭의 절반). ↓일수록 길이 좁아짐
// 외피: 빗면으로 자른 원기둥 + 방쪽 직육면체 박스
//  원통 벽이 먼 리브 밭을 가림(스포 방지). 천장은 솔리드 빗면(방쪽 낮고 리브쪽 높음)으로 솟아 공간감.
//  +x 벽의 창으로 리브 #0·±1·±2만 액자처럼 보임(정리 2·3·4), ±3+는 벽이 가림.
export const COR_CX       = (COR_CYL_X0 + COR_X1) / 2   // 원통 중심 x(=126). 바닥 원은 지면(0)에 앉음
export const COR_R        = (COR_X1 - COR_CYL_X0) / 2    // 원통 반지름 = (리브 − 원기둥시작)/2 = 84(고정 공간감, 방 위치 무관)
export const CEIL_LO      = 70                        // 천장 낮은 쪽(방, −x) 높이
export const CEIL_HI      = 150                       // 천장 높은 쪽(리브, +x) 높이 ← 공간감 핵심 노브
export const CEIL_SLOPE   = (CEIL_HI - CEIL_LO) / (COR_X1 - COR_CYL_X0)    // 빗면 기울기(원기둥 구간)
export const ceilY        = (x) => CEIL_LO + CEIL_SLOPE * (x - COR_CYL_X0)  // 천장 평면 y = LO + slope·(x−42)
export const COR_THICK    = 0.6                       // 바닥·박스 판 두께
export const COR_WALL_SEG = 96                        // 원통 벽 둘레 분할 수
// +x 벽 창(이웃 ±2 프레이밍)
export const WIN_HALF     = Math.asin(42 / COR_R)   // 창 반각: 물리 z폭 42 유지(±2 보임/±3 가림). COR_R 84면 30°, 105면 ≈23.6°
export const WIN_SILL_Y   = 0                        // 창 아래턱(길 y≈49 눈높이 바로 아래)
export const WIN_TOP_Y    = 150                        // 창 위턱
// 방쪽(−x) 문 + 직육면체 박스(짧은 닫힌 터널)
export const BOX_HW       = 6                         // 박스 반폭(z)
export const DOOR_HALF    = Math.asin(BOX_HW / COR_R)  // 문 반각(박스 폭과 일치)
export const BOX_X0       = COR_X0                    // 박스(연결부) 방쪽 끝 = 방 중심(원점)
export const BOX_X1       = COR_CYL_X0 + 4             // 박스 안쪽 끝 = 원기둥 시작 + 살짝 물림
export const BOX_TOP      = CEIL_LO                   // 박스 천장 높이(낮은 천장과 맞춤)

// ── 길(path): 다리 → 원형 플랫폼(기둥 받침) → 다리 ──  (막힌 깔때기는 그대로, 길만 이 형태)
export const PLAT_X       = (COR_X0 + COR_X1) / 2  // 플랫폼 x = 통로 중간(=126; 방 footprint 끝 x≈119 밖 → 기둥이 지면까지)
export const PLAT_R       = 11                      // 원형 플랫폼 반지름(중간 깔때기 반폭 ±23 안)
export const PILLAR_R     = 4                       // 받침 기둥 반지름
export const COR_RISE     = 0.43                     // 계단 한 칸 높이(=두께). 작을수록 얇음
export const COR_CLIMB    = 25                       // 계단(다리2) 총 상승. ↑일수록 가파름(현재 run 73 → ≈9.3°)
export const COR_STEPS    = Math.max(2, Math.round(COR_CLIMB / COR_RISE))  // 칸 수 = 총상승÷칸높이(자동)
export const PLAT_Y       = COR_Y0                   // 플랫폼 높이 = 방 천장 높이(다리1은 평면, 상승 없음)
export const RIB_Y        = PLAT_Y + COR_CLIMB       // 리브 접합 높이(다리2=계단만 상승)
