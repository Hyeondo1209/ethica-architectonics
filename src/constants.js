// ============================================================
//  constants.js — 공간 모델의 모든 상수·공유 함수 (수치의 정본 = 이 파일의 주석)
//  ★ 1-③A판(2026.07.04): 스케일 리그 철거 — 판정 결과 프리셋 ③(S4.8·k1.25)을 작업 기준값으로
//    고정(let→const 복원). ② 기각 · ④ 예비(되돌리려면 아래 SCALE·RIB_K 두 줄만 교체).
//    최종 잠금은 1-③ 상부 실공간(무릎길·갈림)에서 재확인(DESIGN.md §7).
//  ★ 나선 정의역 재정의(1-③A): 구판 'u=0(지면)→U_LAND' 폐기 → '문(RIB_Y)→무릎길 진입(U_SPIRAL_END)'.
//    f-매개변수(0=문, 1=나선 끝)를 export — 폴 절단·비석 배치 공용(칸수·바퀴를 튜닝해도 f 불변).
//  파일 구조: [B]동결 구역(방·주어진 것·통로 단면·길·사람 치수 = 절대치)
//             → [C]돔 세계(스케일 의존 — SCALE·RIB_K에서 전부 파생)
// ============================================================
import * as THREE from 'three'

// ── 스케일(★2026.07.04 판정 확정: ③ 하이브리드 = 작업 기준값) ──
//  하이브리드 채택 근거(DESIGN.md §3): 정션 내부폭 목표 10~13 / 두께 단독(k1.7)은 꼭대기 융합(틈 −1.2)으로
//  물리 불가·기각 / 순수 확대(S5.5)는 통로 330·등반 과다·기각 / 하이브리드 = 내부폭 12.0·통로 288·꼭대기 틈 +2.7.
//  내부폭 = 2·k·S(리브 지름) · 꼭대기 틈 = 2π·35S/72 − 2kS. 예비 ④ = S4.6·k1.30(교체는 이 두 줄만).
export const SCALE = 4.8   // ★돔 세계 '전용' 배수(R_BASE·R_TOP·H·SHELL_RIB_R·TERRACE_*). 방·통로 단면은 동결([B]).
export const RIB_K = 1.25  // ★리브 굵기 계수(SHELL_RIB_R = RIB_K×SCALE). k 상향 = ★★'얇고 우아하게' 잠금(§1)의
                           //   미세 완화 잠정 수용(2026.07.04 눈 판정) — 최종 잠금은 ③B 상부 실공간 재확인.

export const DOWN = new THREE.Vector3(0, -1, 0)

// ════════ [B] 동결 구역 — 스케일 무관 절대치 (★2026.07.03 밤 원칙: 방·통로 단면 동결) ════════

// ── 지상 정의·공리 방 — v2.2 성역 튜닝은 '사람 가구'(절대치). SCALE에서 졸업(★동결 2026.07.04). ──
//  관람객: 바닥에서 시작 → 안쪽 벽을 따라(살짝 띄워) 도는 나선을 올라 → 꼭대기 박스로 나가 통로로.
export const ROOM_CX      = 0      // 방 중심 x = 큰 리브 돔의 열린 중심(원점). 복도 접합점이기도 함
export const ROOM_R       = 91    // ★동결(구 26×3.5). 바닥(=가장 넓은) 반지름. 스케치=납작·넓은 돔
export const ROOM_CEIL_Y  = 49    // ★동결(구 14×3.5). 돔 apex 높이 = 통로 접합 높이(불변식 — 변경 금지)
export const ROOM_FLOOR_Y = 0      // 바닥 = 지면(지상 배치 — 더는 아래로 안 팜)
export const ROOM_DOME_APEX = 49                              // ★돔 정점 높이(파라미터). 기본=복도 49(원래). 키우면 돔이 위로 솟음
export const ROOM_HEIGHT  = ROOM_DOME_APEX - ROOM_FLOOR_Y     // 돔 전체 높이(wallR·domeClipY·돔메시·조명이 사용)
export const ROOM_OCULUS  = 0.193  // ★천장 구멍 반각(반지름≈17.4). 나선 상부가 이리로 올라와 돔천장 안닿음 + 빛우물(@정점17.3) 통과·디스크가 위 덮음. 구멍 크기 노브
// 안쪽 벽 수평 반지름(높이 y의 함수) — 돔 셸과 동일한 반구 프로파일을 공유(나선이 벽을 따라가게)
export const wallR = (y) => ROOM_R * Math.sqrt(Math.max(0, 1 - ((y - ROOM_FLOOR_Y) / ROOM_HEIGHT) ** 2))
// 돔(반구/타원체) 윗면 높이: (x,z)에서 돔이 솟은 표면 y. 돔 밖이면 0(지면).
// → 통로 벽·박스의 아래 모서리를 여기에 맞춰 잘라 '돔 내부 교집합'만 제거(교선을 따라).
export const domeClipY = (x, z) => {
  const dx = x - ROOM_CX, d2 = dx * dx + z * z, R2 = ROOM_R * ROOM_R
  return d2 < R2 ? Math.max(0, ROOM_FLOOR_Y + ROOM_HEIGHT * Math.sqrt(1 - d2 / R2)) : 0
}
// 8각형 안쪽 나선 계단 · 공중에 뜬 낱장 디딤판(간격 PITCH · 두께 SLAB · 깊이 TREAD)
export const ROOM_STAIR_SIDES = 8    // ★변 수(8=8각형). 스케치=8등분. 한 변=직선 계단 한 조각
export const ROOM_STAIR_TURNS = 2    // ★총 회전수(스케치=약 2.5~3바퀴). ↓일수록 경사↑·단높이↑
export const ROOM_STAIR_WIDTH = 2.4  // 디딤판 좌우 폭(걷는 방향에 수직 = 밟고 서는 너비)
export const ROOM_STAIR_TREAD = 4.0  // ★디딜판 앞뒷 깊이(발 딛는 길이). 간격보다 작으면 사이가 뜸(가파른 안쪽은 촘촘해 붙기도)
export const ROOM_STAIR_RISE  = 0.35 // ★한 칸 높이(균일). ↓=칸 많아짐·더 오르기 쉬움. 간격은 경사 따라 자동(가파른 데=촘촘)
export const ROOM_STAIR_BIAS  = 1.0  // ★후반(안쪽) 가파름. 1=조각마다 등높이, ↑=안쪽일수록 급경사(돔 천장 안 닿게·헤드룸↑)
export const ROOM_STAIR_SLAB  = 0.35 // ★디딤판 두께(얇은 부양 판)
export const ROOM_STAIR_ROUT  = 45   // ★시작(바닥·바깥) 반지름 — 벽(ROOM_R=91) 안쪽. ↑=벽에 붙음. ↓일수록 경사↑
export const ROOM_STAIR_RIN   = 14   // ★도착(꼭대기·중심) 반지름 — 디스크 고리(6~18)에 내려섬. 오큘러스(≈17.5)보다 작아야 관통
export const ROOM_LAND_R      = 18   // 착지 디스크 = 빛우물(원뿔대) 바닥 반지름. (사용자 튜닝 18 — 박스 반폭과의 일치는 더는 강제 안 함)
export const ROOM_DISC_SLOT_START = 67 * Math.PI / 180   // ★디스크 슬롯 시작각(비는 부채꼴=나선 진입쪽). 방향 노브(스샷서 반대면 조정)
export const ROOM_DISC_SLOT_LEN   = 301 * Math.PI / 180  // ★슬롯 외 그리는 길이; 비는 52°(↑=슬롯 좁음)
export const ROOM_DISC_HOLE   = 6    // 디스크 가운데 구멍 반지름
export const ROOM_CYL_TOP     = 110  // 빛 우물 실린더 꼭대기 높이(다리 49 위로 솟음). 튜닝 노브
export const ROOM_WELL_RT     = 2.5  // 빛우물 '꼭대기' 반지름(원뿔대 위). ↓=위 좁음=리브 스포 차단↑. 바닥은 ROOM_LAND_R(현재 18)=디스크와 맞물려 봉합
export const ROOM_STAIR_PHASE = -ROOM_STAIR_TURNS * Math.PI * 2      // 꼭대기가 +x(박스)를 향하도록 위상
export const ROOM_STAIR_TOTAL_ANG = ROOM_STAIR_TURNS * Math.PI * 2   // 총 회전각. ⚠ DefAxiomRoom 원형 계단 pt()와 같은 식(TURNS 정수일 때 동일) — 파일 분할 때 통합

// ── 주어진 것들: 정의 옥타곤 + 공리 스테이션 (★배치 확정 2026.07.02 · 형태 '선돌' 잠정) — 전부 사람 스케일(동결) ──
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

// ── 돔/리브 형태 파라미터 — u(0~1)공간·개수·각도라 스케일 무관(동결) ──
export const KNEE = 0.25, WIDTH = 0.02     // 무릎 위치/날카로움
export const MERIDIANS = 72                // 리브 수(밀도 유지)
export const RIB_PHI = 0                   // 탐험에 쓰는 리브의 각도(+x). 단, 모든 리브는 동일함(LOCKED).
export const RIB_RADIAL_SEG = 10           // ★리브 관 단면 분할 수 — 탐험 리브·나머지 71개가 반드시 공유(형태 동일 LOCKED).
                                           //   올리면(예: 16) 관 내부가 매끈해지나 전 리브에 일괄 적용할 것(폴리싱 = Phase 3)

// ── 리브 문(1-③A) — 사람 가구(동결 절대치). 탐험 리브 −x면(통로쪽)에만 CSG로 뚫는 개구부 ──
//  ★LOCKED §1: 문 = 형태 차별화가 아니라 '합의된 기능'. −x면만 뚫어 +x(바깥) 불투명 유지 = 스포 3중 차단의 ①.
export const DOOR_W      = 6.0             // ★문 폭 = 통로 계단 폭(COR_FLOOR_HW×2 = 5.0) + 공차 1.0(양쪽 0.5 — 문설주 z-파이팅 방지).
                                           //   '계단 폭 일치' 스펙의 구현값. COR_FLOOR_HW를 바꾸면 여기도 함께.
export const DOOR_H      = 11              // ★문 높이 — 계단 정상(RIB_Y=74) 위 헤드룸 = 문턱+11−74 = 9. 관 내부폭 12 안의 세로 슬롯
export const DOOR_SILL_Y = 72.0            // ★문턱 높이 = RIB_Y − 2.0. ⚠근거: 통로 계단이 리브 −x벽(x≈282)을 지나는 표면고 ≈72.9,
                                           //   블록 밑면 ≈72.44 — 문턱이 이보다 높으면 계단이 벽을 뚫는다(72.0 → 여유 0.44). RIB_Y 노브와 연동 주의

// ── 나선·디딤판 — 사람 치수(동결) ──
//  ★바퀴 완화(1-③A 적용): STEP_RISE 0.32→0.35 · STEPS_PER_TURN 30→40 (구 검토안 §3 채택)
//  → ③ 스케일에서 등반고 150 ÷ 0.35 = 429칸 ÷ 40 = 10.7바퀴 (목표 9~11 적중). 정본 = 이 두 노브
export const STEP_RISE   = 0.35            // 한 칸 높이(사람 스케일)
export const STEPS_PER_TURN = 40           // 한 바퀴 칸 수(나선 촘촘함) — ↑=바퀴당 상승↑(=총 바퀴↓)·디딤판 간격↓
export const TREAD_DEPTH = 1.5             // 디딤판(사람 스케일)
export const TREAD_WIDTH = 1.0
export const TREAD_THICK = 0.20
export const POLE_R      = 0.35
export const SPIRAL_PHASE = Math.PI        // ★나선 시작 위상 π = 첫 디딤판이 문 안쪽(−x, 통로를 등짐). 감김 방향은 구판 유지(th 증가)
export const POLE_CUT_F  = 0.30            // ★폴 절단 위치(f: 0=문, 1=나선 끝) — 1p6 지점에서 종단(1p7 device).
                                           //   ⚠구 스케치값 0.30은 옛 정의역('문→참') 기준 — 새 정의역('문→무릎길 진입')으로 전이해 잠정 유지, 로컬 보행으로 재판정.
                                           //   1p6 비석(절단 안전핀) 배치도 같은 f축 사용 예정(Phase 2). 캡 = 평면(뭉툭) 기본형
export const KNEE_WALK_MAX_SLOPE = 0.6     // ★보행 가능 경사 임계(dy/dx ≈ 31°) — 나선이 끝나고 '무릎길(계단길)'이 시작되는 기준.
                                           //   ⚠하한 주의: 중심선 최소 경사(무릎 정점) = 2·H·WIDTH/(R_BASE−R_TOP) = 0.32(스케일 불변) — 이보다 커야 해가 존재
export const TERRACE_ARC  = 2.4            // 테라스 호(라디안) — 형태 파라미터
export const PAD_SIZE     = 6.0            // ⚠️폐기 예정(1-③B) — 참
export const FLIGHT_WIDTH = 3.5            // ⚠️폐기 예정(1-③B) — 직선계단

// ════════ 탐험 통로(복도) — 단면 동결(★2026.07.03 밤 원칙) + 위치는 돔 따라 이동([C]) ════════
//  ① 바닥을 방 천장 꼭대기에 붙임(접합)  ② 벽+천장으로 시야 차단(무한 실체 숨김)
//  ③ 바닥은 #0에만 닿고, 이웃 ±2는 창으로 '보이되 안 닿음'(정리 2·3·4)
export const COR_Y0       = ROOM_CEIL_Y    // 복도 바닥 높이 = 방 천장 꼭대기(49)
export const COR_X0       = ROOM_CX        // 안쪽 끝(방 천장 꼭대기, 접합점)
export const COR_R        = 84             // ★동결(구: (COR_X1−42)/2 파생을 역전). 원기둥 반지름 = 고정 공간감('항상 굵게')
export const CEIL_LO      = 70             // 천장 낮은 쪽(방, −x) 높이 — 단면 동결
export const CEIL_HI      = 150            // 천장 높은 쪽(리브, +x) 높이 ← 공간감 핵심 노브 — 단면 동결
export const CEIL_SLOPE   = (CEIL_HI - CEIL_LO) / (2 * COR_R)   // 빗면 기울기 — 구식 (COR_X1−COR_CYL_X0)와 항등(=2·COR_R). 단면 동결의 귀결로 상수
export const ceilY        = (x) => CEIL_LO + CEIL_SLOPE * (x - COR_CYL_X0)  // 천장 평면 y
export const COR_THICK    = 0.6            // 바닥·박스 판 두께
export const COR_WALL_SEG = 96             // 원통 벽 둘레 분할 수
// +x 벽 창(이웃 ±2 프레이밍) — ★간격 비례 공식화(2026.07.04): 물리 z반폭 = WIN_COEF × 리브 밑동 간격.
//  계수는 S3.5의 검증값 42를 '정확 재현'하도록 역산(≈2.292). 스케일 불변성 증명:
//  창반폭 = 0.200·R_BASE vs ±2 리브 z = sin10°·R_BASE = 0.174·R_BASE vs ±3 = sin15°·R_BASE = 0.259·R_BASE
//  → 어느 S에서든 ±2 보임/±3 가림. asin 정의역 가드: 0.200·R_BASE < COR_R ⟺ S < 7 (현 4.8 ✓)
export const WIN_COEF     = 42 / (2 * Math.PI * (60 * 3.5) / MERIDIANS)
export const WIN_SILL_Y   = 0              // 창 아래턱(길 y≈49 눈높이 바로 아래)
export const WIN_TOP_Y    = 150            // 창 위턱
// 방쪽(−x) 문 + 직육면체 박스(짧은 닫힌 터널) — 단면 동결
export const BOX_HW       = 6              // 박스 반폭(z)
export const DOOR_HALF    = Math.asin(BOX_HW / COR_R)   // 문 반각(박스 폭과 일치) — 둘 다 동결이라 상수
export const BOX_X0       = COR_X0         // 박스(연결부) 방쪽 끝 = 방 중심(원점)
export const BOX_TOP      = CEIL_LO        // 박스 천장 높이(낮은 천장과 맞춤)

// ── 길(path) 단면·상승 — 사람 치수(동결) ──
export const COR_FLOOR_HW = 2.5            // 다리·계단 반폭(길 폭의 절반). ↓일수록 길이 좁아짐. ⚠DOOR_W(=×2+공차)와 연동
export const PLAT_R       = 11             // 원형 플랫폼 반지름
export const PILLAR_R     = 4              // 받침 기둥 반지름
export const COR_RISE     = 0.43           // 계단 한 칸 높이(=두께). 작을수록 얇음
export const COR_CLIMB    = 25             // 계단(다리2) 총 상승 — 동결(RIB_Y=74 불변식의 반쪽)
export const COR_STEPS    = Math.max(2, Math.round(COR_CLIMB / COR_RISE))  // 칸 수 = 총상승÷칸높이(자동)
export const PLAT_Y       = COR_Y0         // 플랫폼 높이 = 방 천장 높이(다리1은 평면, 상승 없음)
export const RIB_Y        = PLAT_Y + COR_CLIMB   // ★리브 접합(문) 높이 = 49+25 = 74 — 방·통로 동결의 귀결(불변식, 문 높이 불변)

// ════════ [C] 돔 세계 — 스케일 의존(★1-③A: 리그 철거로 let→const 복원, recompute 폐지) ════════
// ── 돔/리브 (×SCALE) — ③에서 R_BASE 288 · R_TOP 168 · H 960 · SHELL_RIB_R 6.0(내부폭 12.0) ──
export const R_BASE = 60 * SCALE           // 지표 반지름
export const R_TOP  = 35 * SCALE           // 천장 개구부 반지름
export const H      = 200 * SCALE          // 전체 높이
export const SHELL_RIB_R = RIB_K * SCALE   // 리브 굵기(내부폭 = 2×이 값)

export function rOf(u) {   // 리브 프로파일: tanh — 무릎(KNEE) 아래는 거의 수직(원통)
  const f = 0.5 * (1 - Math.tanh((u - KNEE) / WIDTH))
  return R_TOP + (R_BASE - R_TOP) * f
}
// 리브(=단일 속성 실체) 중심선 위의 점. 탐험 나선은 이 선을 따라 '리브 안'을 오른다.
export function ribCenter(u) {
  const r = rOf(u)
  return new THREE.Vector3(r * Math.cos(RIB_PHI), H * u, r * Math.sin(RIB_PHI))
}

// ── 나선 정의역(★1-③A 재정의): 문(RIB_Y) → 무릎길 진입 ──
//  끝점 유도(수치의 정본): 중심선 경사 dy/dx(u) = 최소경사 / sech²((u−KNEE)/WIDTH),
//  최소경사(무릎 정점) = 2·H·WIDTH/(R_BASE−R_TOP) = 2·200·0.02/25 = 0.32 — H·ΔR 모두 ×SCALE이라 스케일 불변.
//  경사 = KNEE_WALK_MAX_SLOPE(0.6)를 무릎 '아래쪽'에서 풀면:
//  U_SPIRAL_END = KNEE − WIDTH·acosh(√(0.6/0.32)) ≈ 0.25 − 0.0166 = 0.2334 (③에서 y≈224 · 등반고≈150)
const SLOPE_KNEE_MIN = 2 * H * WIDTH / (R_BASE - R_TOP)
export const U_DOOR       = RIB_Y / H                                  // ③에서 74/960 ≈ 0.0771
export const U_SPIRAL_END = KNEE - WIDTH * Math.acosh(Math.sqrt(KNEE_WALK_MAX_SLOPE / SLOPE_KNEE_MIN))
export const SPIRAL_CLIMB = (U_SPIRAL_END - U_DOOR) * H                // ③에서 ≈150.0
export const STAIR_STEPS  = Math.max(40, Math.round(SPIRAL_CLIMB / STEP_RISE))   // ③에서 429
export const STAIR_TURNS  = STAIR_STEPS / STEPS_PER_TURN               // ③에서 10.7 (목표 9~11)
export const STAIR_R      = SHELL_RIB_R * 0.55                         // 헬릭스 반지름 — 리브 내부에 들도록 굵기 비례(③에서 3.3)

// ── f-매개변수 공용축(export): f=0 문 · f=1 나선 끝. 폴 절단·1p6/1p7 비석 배치가 공유 —
//    칸수(STAIR_STEPS)·바퀴(STAIR_TURNS)를 튜닝해도 f→공간 매핑은 불변(높이 기준). ──
export function spiralU(f) { return U_DOOR + f * (U_SPIRAL_END - U_DOOR) }
export function spiralPoint(f) {           // 디딤판 경로(헬릭스) 위의 점 + 접선각. 비석은 pos에서 안/밖 오프셋해 배치
  const c = ribCenter(spiralU(f))
  const theta = SPIRAL_PHASE + f * STAIR_TURNS * Math.PI * 2
  return { pos: new THREE.Vector3(c.x + STAIR_R * Math.cos(theta), c.y, c.z + STAIR_R * Math.sin(theta)), theta }
}
// 폴 절단 y(1p7 device): 절단점이 무릎보다 충분히 아래(u < KNEE−4·WIDTH)면 중심선이 수직(오차 <1e-3)
//  → 폴 = 수직 닫힌 원기둥(x=R_BASE)으로 정확 + 윗면 = 평면 캡(뭉툭) 공짜. ③에서 u≈0.124 ✓ (한계 0.17)
export const Y_POLE_CUT = spiralU(POLE_CUT_F) * H                      // ③에서 ≈119.0
if (spiralU(POLE_CUT_F) > KNEE - 4 * WIDTH)
  console.warn('[constants] POLE_CUT_F가 무릎 곡선부에 진입 — 수직 폴 근사가 깨짐. Dome.jsx 폴을 곡선 tube로 교체 필요')

// ── 테라스(중앙, 도착) (×SCALE) — 자유 요소(y·반지름 노브, ③B에서 접속 조정) ──
export const TERRACE_Y    = H * KNEE
export const TERRACE_RIN  = 27 * SCALE
export const TERRACE_ROUT = 33 * SCALE

// ── (⚠️폐기 예정 1-③B) 계단참 + 직선 다리 — 임시 착지로만 존치(CLIMB_TOP을 새 나선 끝으로 재지정) ──
export const CLIMB_TOP    = ribCenter(U_SPIRAL_END)   // 새 나선 정상(③B에서 KneeWalk로 대체)
export const TERRACE_EDGE = new THREE.Vector3(TERRACE_ROUT * Math.cos(RIB_PHI), TERRACE_Y, TERRACE_ROUT * Math.sin(RIB_PHI))
export const FLIGHT_LEN   = Math.hypot(TERRACE_EDGE.x - CLIMB_TOP.x, TERRACE_EDGE.y - CLIMB_TOP.y)
export const FLIGHT_STEPS = Math.max(6, Math.round(FLIGHT_LEN / TREAD_DEPTH))

// ── 통로 위치: 단면(COR_R·천장)은 동결, 원기둥이 크기 유지한 채 돔 따라 바깥으로 이동 ──
export const COR_X1     = R_BASE                    // 바깥 끝 = 탐험경선 #0 밑동(③에서 288)
export const COR_CYL_X0 = R_BASE - 2 * COR_R        // ③에서 120 (⚠맨 박스 노출 ~29 = §7 열린 결정 — 통로 만질 때)
export const COR_CX     = (COR_CYL_X0 + COR_X1) / 2 // 원통 중심 x = R_BASE − COR_R (③에서 204)
export const BOX_X1     = COR_CYL_X0 + 4            // 박스 안쪽 끝 = 원기둥 시작 + 살짝 물림
// ── 창: 간격 비례(±2 보임/±3 가림 스케일 불변 — 근거는 WIN_COEF 주석) ──
export const WIN_ZHW  = WIN_COEF * (2 * Math.PI * R_BASE / MERIDIANS)   // ③에서 57.6
export const WIN_HALF = Math.asin(WIN_ZHW / COR_R)                      // ③에서 ≈43.3°
// ── 길 ──
export const PLAT_X = (COR_X0 + COR_X1) / 2         // 플랫폼 x = 통로 중간(③에서 144)
