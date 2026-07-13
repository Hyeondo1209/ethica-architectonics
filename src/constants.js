// ============================================================
//  constants.js — 공간 모델의 모든 상수·공유 함수 (수치의 정본 = 이 파일의 주석)
//  ★ 1-③B판(2026.07.05): 상부 구간(무릎길·갈림·1p8 전망·연결 통로·테라스 파생) + 폐기 상수 제거.
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
export const ROOM_TOP_AZ = 37.5 * Math.PI / 180 // ★나선 도착 방위각(월드) — 나선·디스크 슬롯이 '함께' 도는 단일 노브(2026.07.11 ③).
//  37.5° = 빈 슬롯(도착각 뒤 8°~67° 부채꼴)이 +x(봉인된 구 출발축)에 정중앙 → 네 터널 판(45°+90k, r12서 각반폭 10.6°)과 여유 4.9°.
//  ⚠ RAD_ANG0 회전으로는 해소 불가(슬롯 59°+박스 금지대 = 93° > 사분 90° — 어느 위상에도 터널 하나가 걸림). 반드시 이 노브로 돌릴 것.
export const ROOM_DISC_SLOT_START = 67 * Math.PI / 180 - ROOM_TOP_AZ // ★파생: 링 θ=−월드 → 도착각과 함께 돎(슬롯=도착각 뒤 8°~67°)
export const ROOM_DISC_SLOT_LEN   = 301 * Math.PI / 180  // ★슬롯 외 그리는 길이; 비는 59°(↑=슬롯 좁음)
export const ROOM_DISC_HOLE   = 6    // 디스크 가운데 구멍 반지름
export const ROOM_CYL_TOP     = 110  // 빛 우물 실린더 꼭대기 높이(다리 49 위로 솟음). 튜닝 노브
export const ROOM_WELL_RT     = 2.5  // 빛우물 '꼭대기' 반지름(원뿔대 위). ↓=위 좁음=리브 스포 차단↑. 바닥은 ROOM_LAND_R(현재 18)=디스크와 맞물려 봉합
export const ROOM_STAIR_PHASE = -ROOM_STAIR_TURNS * Math.PI * 2 + ROOM_TOP_AZ // 꼭대기가 ROOM_TOP_AZ(37.5°)를 향하도록 위상(구: +x 고정 → 터널 문과 충돌해 회전)
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
// ★1-③E (가): 나선 끝은 이제 '경사'가 아니라 '각도'로 고정한다(STAIR_TURNS=9.75 → θ_end=90° = −x 접선, 아래 유도 참조). 구판 SPIRAL_END_SLOPE(경사 1.2 기반) 폐지 — 나선 나가는 각도가 무릎길(−x)과 안 맞으면 131° 급반전이 나서, '경사'보다 '나가는 각도'가 상위 제약이기 때문.
export const KNEE_WALK_MAX_SLOPE = 0.6     // ★무릎길 '위쪽' 끝(정션 인계) 경사(dy/dx ≈ 31°). ⚠1-③B′ 분리: 나선 끝은 별도 규칙(위 각도 고정), 이 값은 U_KNEE_END '이하' 하류(정션·전실·테라스·스포)만 지배(불변 보존).
                                           //   ⚠하한 주의: 중심선 최소 경사(무릎 정점) = 2·H·WIDTH/(R_BASE−R_TOP) = 0.32(스케일 불변) — 두 임계 모두 이보다 커야 해가 존재
export const TERRACE_ARC  = 2.4            // 테라스 호(라디안) — 형태 파라미터

// ════════ 탐험 통로(복도) — 단면 동결(★2026.07.03 밤 원칙) + 위치는 돔 따라 이동([C]) ════════
//  ① 바닥을 방 천장 꼭대기에 붙임(접합)  ② 벽+천장으로 시야 차단(무한 실체 숨김)
//  ③ ★1p5 재설계(2026.07.13): 바닥도 시야도 #0 하나만 — 슬릿 창이 '그 하나'를 프레임(구 파노라마 ±2 폐기)
export const COR_Y0       = ROOM_CEIL_Y    // 복도 바닥 높이 = 방 천장 꼭대기(49)
export const COR_X0       = ROOM_CX        // 안쪽 끝(방 천장 꼭대기, 접합점)
export const COR_R        = 84             // ★동결(구: (COR_X1−42)/2 파생을 역전). 원기둥 반지름 = 고정 공간감('항상 굵게')
export const CEIL_LO      = 70             // 천장 낮은 쪽(방, −x) 높이 — 단면 동결
export const CEIL_HI      = 150            // 천장 높은 쪽(리브, +x) 높이 ← 공간감 핵심 노브 — 단면 동결
export const CEIL_SLOPE   = (CEIL_HI - CEIL_LO) / (2 * COR_R)   // 빗면 기울기 — 구식 (COR_X1−COR_CYL_X0)와 항등(=2·COR_R). 단면 동결의 귀결로 상수
export const ceilY        = (x) => CEIL_LO + CEIL_SLOPE * (x - COR_CYL_X0)  // 천장 평면 y
export const COR_THICK    = 0.6            // 바닥·박스 판 두께
export const COR_WALL_SEG = 96             // 원통 벽 둘레 분할 수
// +x 벽 슬릿 창 — ★1p5 재설계 ㄱ안(2026.07.13): '하나의 프레임'. 구 파노라마(±2 보임/±3 가림,
//  WIN_COEF 간격비례 공식 2026.07.04)는 ⚠의도적 폐기(편차 아님) — 근거 3: ①공개 곡선 역전(통로 동시 5 >
//  회랑 1p9 누적 4 — 점층 1→여럿→∞가 첫 정거장에서 붕괴) ②열주 오독(창틀 없는 대개구 + 등간격 세로 =
//  이 건물의 콜로네이드로 읽힘) ③±2 스펙은 통로가 1p2·3의 집이던 시절 유산(골격 개정으로 실효).
//  슬릿은 스케일 무관 절대치(사람 프레이밍) → [B] 상수. 광학 밀폐 검증 = check_corridor.mjs.
export const SLIT_ZHW    = 10   // ★슬릿 z반폭 = 리브 반경(6) + 하늘 띠(4). 실개구는 벽 격자(96분할)에 스냅해 ≈±11
export const SLIT_JAMB_D = 5    // ★슬릿 측벽(리빌) 깊이 — 계단 상부 스침각에서 이웃 ±1 밀폐(분석 하한 ≈4.2). 화살창 원리
export const SLIT_SILL_Y = 0    // 슬릿 아래턱(0 = 리브 밑동부터 통째로 프레임)
export const SLIT_TOP_Y  = 150  // 슬릿 위턱(=CEIL_HI. 천장이 이보다 낮은 구간은 개구가 천장까지 — 리브가 하늘까지)
export const SLIT_HALF   = Math.asin(SLIT_ZHW / COR_R)   // 반각 ≈6.84° — 슬릿·원기둥 둘 다 동결이라 상수
// 방쪽(−x) 문 + 직육면체 박스(짧은 닫힌 터널) — 반폭 동결 · ★천장은 ㄷ′ 압축(2026.07.13)
export const BOX_HW       = 6              // ★박스 반폭(z) — 실폭 = 2배(12). **폭 노브**. ⚠안전 범위 5.5~8.2(실측 스윕):
                                           //   −x 문 트임이 벽 격자(COR_WALL_SEG=96 → 3.75°)에 양자화돼 z반폭이 5.49로 고정됨 →
                                           //   (a) BOX_HW<5.5면 트임(5.49)이 박스보다 넓어져 옆벽 옆으로 슬롯 누출(스포) (b) 8.3부터 트임이 10.96으로 점프해 또 초과.
                                           //   더 좁히려면(관 비례 지향) Corridor.jsx wallGeo의 −x 문을 격자 대신 **z=±BOX_HW 정확 컷**(경계 세그 분할)으로 교체 —
                                           //   그때 하한 = 다리(폭 5) 통과 조건 ≈3.0. 검증 = check_corridor B절. 파생 자동 추종: DOOR_HALF·RAD_JPHI·RAD_JX·고리 z클립·접합 패드·천장 슬랩·캡
export const DOOR_HALF    = Math.asin(BOX_HW / COR_R)   // 문 반각(박스 폭과 일치) — 둘 다 동결이라 상수
export const BOX_X0       = 54             // ★방사 개편(2026.07.09): 구 COR_X0(0) → 54(=RAD_CAP_X와 동치·정의 순서상 리터럴). 서쪽 단축 → 원뿔대 동쪽 문 자동 봉인(절단 브러시가 안 닿음)
export const BOX_IN_H     = 7              // ★박스 내부고(다리 상면 49.3 기준) — ㄷ′ 압축 노브. 하한 ≈5.2(접합문 상단 53.3+헤더 1.5)·상한 ≈9(압축감 소멸)
export const BOX_TOP      = COR_Y0 + COR_THICK / 2 + BOX_IN_H   // ≈56.3 — ⚠구 CEIL_LO(70) 폐기(ㄷ′ 2026.07.13): 박스 21m '어중간한 통' → 사람 스케일 압축.
                                           //   진입 순간 7→21(즉시)→101(정점) 수직 해방 = 포르티코→로툰다. 원기둥 −x 개구의 BOX_TOP 위는 헤더로 봉인(Corridor.jsx — 스포 구멍 방지)

// ── 길(path) 단면·상승 — 사람 치수(동결) ──
export const COR_FLOOR_HW = 2.5            // 다리·계단 반폭(길 폭의 절반). ↓일수록 길이 좁아짐. ⚠DOOR_W(=×2+공차)와 연동
export const PLAT_R       = 8             // 원형 플랫폼 반지름
export const PILLAR_R     = 2              // 받침 기둥 반지름
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
// rOf 역함수: 반지름 x → u. 무릎길을 '수평 균일 간격'으로 놓을 때 각 x의 리브 높이(y=H·u) 계산에 씀.
//  atanh 인자는 리브 반지름 범위(R_TOP~R_BASE) 안에서만 유효 → 안전 클램프.
export function uOfX(x) {
  const a = Math.max(-0.999, Math.min(0.999, 1 - 2 * (x - R_TOP) / (R_BASE - R_TOP)))
  return KNEE + WIDTH * Math.atanh(a)
}
// 리브(=단일 속성 실체) 중심선 위의 점. 탐험 나선은 이 선을 따라 '리브 안'을 오른다.
export function ribCenter(u) {
  const r = rOf(u)
  return new THREE.Vector3(r * Math.cos(RIB_PHI), H * u, r * Math.sin(RIB_PHI))
}

// ── 나선 정의역(★1-③A 재정의): 문(RIB_Y) → 무릎길 진입 ──
//  끝점 유도(수치의 정본): ★1-③E (가) — 나선이 무릎길로 '급반전 없이' 흐르려면 나선 나가는
//  접선이 무릎길 방향(−x)과 정렬돼야 한다. 헬릭스 접선은 θ_end≡90°에서 −x가 되므로
//  θ_end = SPIRAL_PHASE(π) + STAIR_TURNS·2π ≡ π/2 → STAIR_TURNS = 정수+0.75.
//  ⚠θ=90°에 닿는 값은 9.75(일찍 끝=곧은구간=나선 깨끗)와 10.75(늦게=굽힘진입=상부 전단)뿐. 반드시
//  9.75 — 10.75는 1-③B′가 고친 나선 전단(경사 18~65°)을 되살림. 결과: 나선끝 리브경사 62°(무릎길 시작이 그만큼 가파름).
const SLOPE_KNEE_MIN = 2 * H * WIDTH / (R_BASE - R_TOP)
export const U_DOOR       = RIB_Y / H                                  // ③에서 74/960 ≈ 0.0771
export const STAIR_TURNS  = 9.75                                       // ★θ_end=90°(−x 접선)·곧은구간 유지(전단 회피). 9바퀴+¾ = 마지막에 −x로 나감
export const STAIR_STEPS  = Math.round(STAIR_TURNS * STEPS_PER_TURN)   // ③에서 390
export const U_SPIRAL_END = U_DOOR + STAIR_STEPS * STEP_RISE / H       // 파생: 나선 끝 높이 ③에서 ≈0.2193 (리브경사 62°)
export const SPIRAL_CLIMB = (U_SPIRAL_END - U_DOOR) * H                // ③에서 ≈136.5
export const STAIR_R      = SHELL_RIB_R * 0.55                         // 헬릭스 반지름 — 리브 내부에 들도록(③에서 3.3)

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

// ── 테라스 반지름(×SCALE — 상부 통로가 참조하므로 먼저 정의. y는 상부 블록 끝에서 파생) ──
export const TERRACE_RIN  = 27 * SCALE
export const TERRACE_ROUT = 33 * SCALE

// ════════ 상부 구간(★1-③B 2026.07.05): 무릎길 → 갈림 → {1p8 전망 ↑ / 아치 ↓ → 연결 통로} → 테라스 문(1p11) ════════
//  전 구간 관내 잔류(§1) — 아래 전부 φ=0 평면(z는 로컬 오프셋). 수치는 전부 여기서 파생(튜닝 노브 명시).

// ── 무릎길: 나선 끝(U_SPIRAL_END) → 정션(U_KNEE_END). ★1-③B′ 분리: 두 끝이 다른 임계 → 비대칭.
//    아래끝 = SPIRAL_END_SLOPE(1.2, 코르크 인계) · 위끝 = KNEE_WALK_MAX_SLOPE(0.6, 정션 인계). 경사(u)=0.32·cosh²((u−KNEE)/WIDTH).
//    ③에서 u 0.2244→0.2667 · y 215→256 · ≈116칸(1.2→0.32→0.6, 계단이라 가변 경사 흡수). ⚠위끝(0.2667)·이하 하류는 구값과 동일(불변) ──
export const U_KNEE_END   = KNEE + WIDTH * Math.acosh(Math.sqrt(KNEE_WALK_MAX_SLOPE / SLOPE_KNEE_MIN))  // ★분리: 자체 임계(0.6) → 값=구 대칭값 0.2667, 정션 이하 전부 불변
export const KW_CLIMB     = (U_KNEE_END - U_SPIRAL_END) * H                 // 무릎길 세로 등반고 ③≈40.6
// ★1-③D: 무릎길 배치를 '높이 균일(Δy)'→'수평 균일(Δx=KW_GO)'로 교체.
//  이유: 리브가 시작(50°)~무릎(18°)~끝(31°)로 경사가 크게 변해, 높이 균일이면 가파른 시작에서 Δx가
//  디딤판 깊이보다 훨씬 작아 판이 4~5겹 무더기(사진). 수평 균일이면 깊이=1.2·Δx로 고정 → 항상 1.2겹
//  = 무더기·틈 없음. 대가 = 시작 단높이가 경사만큼 커짐(Δx·slope) — KW_GO로 조절.
export const KW_GO        = 0.22           // ★무릎길 수평 간격(=깊이/1.2). 나선끝 62°라 시작 단높이=KW_GO·tan62°≈0.41(나선급 유지). ↓=완만·칸↑ / ↑=성큼·칸↓. ③에서 x폭≈96 → ≈435칸
export const KW_STEPS     = Math.max(8, Math.round((rOf(U_SPIRAL_END) - rOf(U_KNEE_END)) / KW_GO))  // 수평 균일 칸수 ③≈264
export const KW_TREAD_D   = KW_GO * 1.2    // 디딤판 깊이(x) = 수평간격의 1.2배 → 겹쳐 틈 없되 무더기 아님
export const KW_TREAD_W   = 2.0            // ★무릎길 디딤판 z폭(4.5→2.0, 1-③D). 갈래(전망·하강)와 동일 폭 — 길이 전체에서 갈래 안 덮음(전 4.5는 둘 다 덮어 갈림 무의미). 하강측 접점 겹침은 정션 디스크가 덮음(정션은 다음 조각)
// ★1-③F 경사 완화(방향=ㄱ) · ★1-③G 드리프트 폐기: 계단 높이를 '가파른 리브 중심선'과 '나선끝→정션 곧은 현(chord)' 사이 블렌드.
//  0=리브 hug(시작 62°) · 1=곧은 현(시작 25°). 1-③G에서 무릎길 z 드리프트를 판넬로 폐기(중앙 정렬) → 옆쏠림 없어져 관 여유↑ → 시작 35°(F=0.84)까지 관 안(모서리 5.7<6).
//  대가: 계단이 리브 중심축에서 아래로 뜸(현도 승인). ↑=완만하나 리브 밖 삐질 위험 — 로컬 보행 노브.
export const KW_FLATTEN   = 0.84           // 시작 ≈35°(62°에서) · 모서리 관 거리 5.7<6 (드리프트 폐기 전제)
// ★1-③G 착지 판넬(LandingPanel): 나선 옆끝(z=+STAIR_R)에서 무릎길 중앙(z=0)으로 가로지르는 솔리드 착지판.
//  나선 도착 → 판넬 건너 중앙 → 중앙 계단. 무릎길 z 드리프트 폐기(비스듬함 소멸) + 계단 옆쏠림 없어져 관 이탈도 해소.
export const PANEL_DX = 1.6                 // 판넬 x깊이(나선 도착 착지)
export const PANEL_Z0 = -KW_TREAD_W / 2     // z 시작(무릎길 중앙 가장자리)
export const PANEL_Z1 = STAIR_R + 0.7       // z 끝(나선 옆끝 너머)

// ── 착지 디스크: 이제 갈림(정션·U_KNEE_END) '한 곳'만. r=4.0 > 헬릭스 3.3.
//    ⚠1-③C: 나선끝(U_SPIRAL_END)에서는 폐기 — 축 위 솔리드 판이 나선(r3.3)을 덮어(r4.0) 위로 못 나가는
//    '뚜껑' 문제 → 나선끝은 아래 '부양 다리'로 교체(캡 없음). 정션 디스크도 같은 구조라 다음 조각 대상. ──
export const LAND_R = 4.0
export const LAND_T = ROOM_STAIR_SLAB      // 디스크 두께 = 방 디딤판(부양 판 어휘 공유)
// ★②-착지장(2026.07.06 재설계 v3, 스케치 확정): 사각 판. 세 계단이 판 가장자리에서 시작(관통 없음):
//  무릎길은 +x 변에 도착, 전망·하강은 −x 변에서 밖으로(−x) 나감(전망 위·하강 아래, 각자 제 z 그대로).
//  전망은 리브곡면 대신 '곧은 램프'로 바꿔 판 위로 가로지르지 않음. z 안 뒤집음 — 전망 −2.4·하강 +1.75·통로 그대로.
// ★x-커플링(2026.07.07): 이 두 변이 판의 정본 — 세 계단의 판쪽 끝이 전부 여기서 파생되어, 판을 넓혀도 계단이 항상 변에 붙는다.
//   · 무릎길 도착 = X_LAND_HI (Dome.jsx KneeWalk xB) · 하강 시작 = X_LAND_LO+0.2 (X_DESC0) · 전망 램프 시작 = X_LAND_LO (Dome.jsx Lookout).
//   넓히려면: X_LAND_HI ↑(+x 바깥) / X_LAND_LO ↓(−x 바깥). ⚠ X_LAND_LO엔 하강이 물려 있어, 움직이면 통로(하강→아치→전실→문) 전체가 −x로 같이 밀린다(테라스 높이는 y파생이라 무관).
//   X_LAND_HI는 무릎길 도착만 늘고 줄어 자기완결 — 착지 깊이만 넓히고 싶으면 이쪽을 권장.
export const X_LAND_LO = rOf(U_KNEE_END) - LAND_R + 1.5     // 판 −x 가장자리 = 전망·하강 출발 (기본값; 넓히려면 이 식에서 빼기)
export const X_LAND_HI = rOf(U_KNEE_END) + 3.5                   // 판 +x 가장자리 = 무릎길 도착 (기본값; 넓히려면 이 식에서 더하기)
export const Z_LAND    = 4.5                                // 판 z 반폭 — 전망(−2.4)·하강(+1.75) 둘 다 판 위에 담게

// ── 부양 다리(1-③C): 나선 마지막 칸 → 무릎길 첫 칸을 잇는 떠 있는 디딤판 몇 개(캡 디스크 대체).
//    나선 자리에 솔리드 판을 두지 않아 '뚜껑' 소멸 + 1p7 '증명된 뜸' 어휘 일관(전부 부양 디딤판).
//    개수 = 수평간격/BRIDGE_STEP 자동(θ_end 튜닝에 적응). Dome.jsx LandingBridge가 spiralPoint(끝)↔무릎첫칸 보간. ──
export const BRIDGE_STEP  = 1.0            // ★다리 디딤판 수평 간격 목표. ↓=디딤판 많아짐(더 촘촘·완만) / ↑=적어짐. ③에서 간격≈2.9 → 3개
export const BRIDGE_DEPTH = 1.6            // 다리 디딤판 진행방향 깊이(≥간격이라 겹쳐 끊김 없음)
export const BRIDGE_W     = 2.4            // 다리 디딤판 폭(나선 1.0 ↔ 무릎길 4.5 사이)

// ── 갈림(정션·u=U_KNEE_END): 디스크에서 두 갈래 — z 분리로 겹침 방지(관 중심선 현폭 12 안) ──
//  ★갈림 = 논증: 위로 무한히 올라도(1p8) 신에 닿지 않고, 되돌아 내려가(아치) 이행(1p9·10)을 거쳐야 1p11.
export const JCT_UP_Z  = -2.4              // 상행(1p8 전망) 갈래 z 오프셋 — 등반자 오른쪽(웨지 볼벽과 간극 0.25)
export const JCT_DN_Z  = +1.75             // 하강(아치→통로) 갈래 z 오프셋 — 등반자 왼쪽. 통로 전체가 이 z를 따름

// ── 1p8 전망(막다름): 갈림에서 관축을 따라 계속 상행, 경사 1.2(가파른 계단 한계)에서 종단 + 플랫폼.
//    ③에서 u≈0.2756 · y≈264.6 · 등반 8.5 · 24칸. 플랫폼에서 올려다보는 보어 ≈ 695 = 눈높이 435배(suo genere) ──
export const LOOKOUT_MAX_SLOPE = 1.2
export const U_LOOKOUT_END = KNEE + WIDTH * Math.acosh(Math.sqrt(LOOKOUT_MAX_SLOPE / SLOPE_KNEE_MIN))
export const LK_STEPS  = Math.max(6, Math.round((U_LOOKOUT_END - U_KNEE_END) * H / STEP_RISE))
export const LK_PLAT_R = 5.5               // 전망 플랫폼 반지름(중심선 위) — 1p8 비석 자리(Phase 2)
// ★②(2026.07.06) 전망 디스크 뚜껑 해소(A 방향): 디스크를 살짝 띄워 밑면이 '끝 전망 스텝' 위를 지나게 →
//  스텝(z=−2.4)이 디스크(z=0, r3.2) 밑으로 들어가 24칸 중 6칸이 판 밑에 깔리고 끝 스텝이 판을 뚫던 겹침 소멸.
//  판 z=0 유지(보어 올려다보기 = 중심에서 위 보기). 올라서기 = 끝스텝 top → 판 top ≈0.40 (STEP_UP 0.8 안).
export const LK_TOPSTEP_TOP = U_KNEE_END * H + LK_STEPS * STEP_RISE + TREAD_THICK / 2   // 끝 전망 스텝 윗면 ③≈264.5
export const LK_DISC_LIFT   = Math.max(0.1, LK_TOPSTEP_TOP + 0.05 + LAND_T - U_LOOKOUT_END * H)  // 디스크 밑면 = 끝스텝+0.05 ③≈0.36
// ★전망 디스크 반원화·이동(2026.07.07, 현도 손튜닝): 반원 여부 + 앞뒤(−x)·위(+y)·옆(z)·회전. 램프가 디스크의 램프쪽 가장자리(지름변)에 맞닿아 따라옴(Lookout 재작성).
export const LK_DISC_HALF = true    // true=반원(평평한 변에 램프 닿음) / false=온전한 원
export const LK_DISC_DX   = -2.0       // 앞뒤: − = 돔 중심(앞)으로 / + = 뒤로 (디스크 x = rOf(U_LOOKOUT_END) + 이 값)
export const LK_DISC_DY   = +2.5       // 위아래: + = 위(높이)
export const LK_DISC_DZ   = 0       // 옆(수평 z): 램프(z=−2.4)에 붙이려면 음수 쪽으로
export const LK_DISC_ROT  = 0       // 반원 평평한 변 회전(rad): 지름변을 램프 쪽으로 돌려 맞춤

// ── 하강 + 연결 통로(공개 전실): 디스크 가장자리(x=rOf(U_KNEE_END)−LAND_R)에서 −x로 경사 1.15, 8.0 하강.
//    ★아치 입은 '외부'가 아니라 보어를 향한다(하부 벽 관통) → 후드 불필요, 상자 외피가 바깥을 봉함.
//    ★TERRACE_Y = 통로 바닥에서 '파생'(자유 요소 확정 — 접속 경사 문제가 정의상 소멸, 구 H·KNEE=240 → ≈248) ──
export const DESC_SLOPE   = 1.15           // 하강 경사(가파름 = 압축의 시작). 로컬 체감 노브
export const DESC_DROP    = 8.0            // 하강고 — 전실 지붕(바닥+5.5)이 갈림 디스크(y256) 아래로 깔리는 최소치
export const X_DESC0      = X_LAND_LO + 0.2                                 // ★하강 시작 = 판 −x변(X_LAND_LO)에서 0.2 안쪽(첫 판 물림). 판 −x변에 커플링(2026.07.07): X_LAND_LO 움직이면 하강·통로 전체가 따라옴. 기본 = 구값(rOf(U_KNEE_END)−LAND_R+1.2) ③≈184.2
export const PASS_FLOOR_Y = U_KNEE_END * H - DESC_DROP                      // 통로 바닥(슬랩 윗면) ③≈248.0
export const DESC_STEPS   = Math.max(6, Math.round(DESC_DROP / STEP_RISE))  // ③에서 23
export const X_DESC_END   = X_DESC0 - DESC_DROP / DESC_SLOPE                // 바닥 도달 x ③≈176.0
// 하강 채널 단면(z중심 = JCT_DN_Z, 내부 반폭 PASS_HW): 봉인 슬랩 + 측벽(구 볼벽) — 회랑판이 계승
export const PASS_HW      = 2.3            // 내부 반폭(폭 4.6 — 전실은 좁게)
export const PASS_T       = COR_THICK      // 판 두께 0.6(통로 외피 어휘 공유)
export const PASS_X_CHEEK = X_DESC0 + 0.5  // 볼벽(웨지) 깊은 끝 — 갈림 디스크 하면(y+0.1−0.35)과 교차 금지 ③≈184.7
// 바닥 슬랩 깊은 끝 = 리브 하부면이 바닥 높이(PASS_FLOOR_Y)와 만나는 x + 0.5(벽 물림) — ★디스크 아래 봉인
//  (스포 누출 지점: 슬랩이 짧으면 디스크 밑 웨지(슬랩 끝↔벽)로 시선이 빠짐 — 검증 ㉙에서 실측 발견)
export const PASS_X_DEEP = (() => {
  for (let uu = KNEE; uu < 0.32; uu += 0.0002) {
    const sl = SLOPE_KNEE_MIN * Math.cosh((uu - KNEE) / WIDTH) ** 2, nn = Math.hypot(1, sl)
    if (uu * H - SHELL_RIB_R / nn >= PASS_FLOOR_Y) return rOf(uu) - SHELL_RIB_R * sl / nn + 0.5
  }
  return X_DESC0 + 5.5
})()                                         // ③≈189.5
export const PASS_X_END   = TERRACE_ROUT + 0.5                              // 테라스 림 물림 반경(회랑판: 스텁 끝벽의 원점거리) ③≈158.9
//  볼벽 상단(비대칭): −z쪽은 갈림 디스크 하면(y+0.1−0.35) 아래로 제한, +z쪽은 디스크가 닿지 않아(r4 < z4.35)
//  높게 올려 입 상단 너머 +z 측면 시선을 봉쇄(검증 ㉙ 2차 누출 지점 — 커터 축소와 짝).
export const CHEEK_TOP_NZ = U_KNEE_END * H - 0.6                            // −z(상행 쪽) ③≈255.4
export const CHEEK_TOP_PZ = U_KNEE_END * H + 1.5                            // +z(바깥 쪽) ③≈257.5
// 아치 CSG 커터(탐험 리브 2차 컷, 축정렬 상자) — ★'필요 포락선'으로 최소화(검증 ㉙에서 넓은 컷의
//  상단·+z 코너로 시선 누출 실측 → 축소). 필요 = 보행자 몸통(발−0.3~머리+0.4)이 벽면과 겹치는 대각 띠:
//  발 교차 x≈181.3(y 252.7)·머리 교차 x≈180.3(y 253.3) → 벽 제거 필수 대역 x∈[179.9,181.7]·y∈[251.8,254.2].
//  아래 컷은 그 대역에 사방 ~1의 여유를 더한 값(수식 앵커 = X_DESC0). 이보다 키우면 누출 재발 주의.
export const ARCH_X0 = X_DESC0 - 5.6,         ARCH_X1 = X_DESC0 - 1.8       // ③에서 178.6 ~ 182.4
export const ARCH_Y0 = PASS_FLOOR_Y + 2.4,    ARCH_Y1 = U_KNEE_END * H - 1.4 // ③에서 250.4 ~ 254.6
export const ARCH_Z0 = JCT_DN_Z - 1.4,        ARCH_Z1 = JCT_DN_Z + 1.4      // ③에서 0.35 ~ 3.15(몸통 폭+0.4)
// 끝벽 문(1p11 공개의 물리 지점) — 4박스 조립(CSG 불필요)
export const PASS_DOOR_W = 3.2
export const PASS_DOOR_H = 4.6

// ════════ 회랑(Cloister) 1p9 — ★신규 기하 2026.07.07 (통로 8세그 재구성 폐기·대체, (a)안 · 원호판) ════════
//  하강 착지 → 방(직사각형) → 방 +z변에서 회랑이 +z '접선'으로 출발해 껍질과 나란히 도는 원호 →
//  바깥벽(원통면)의 큰 개구(기둥 없음) → 창밖 = DomeRibs. '실재성↑→속성↑'(1p9)를 '누적'으로 공간화:
//  걷는 동안 정면 리브가 #0→#4로 순차 교체(총 5개). 1p8(하나 안) → 1p9(여럿 조짐) → 1p11(무한) 점층.
//  ★원호 채택 근거(2026.07.07 스캔+레이캐스트 실측): 직선(px 일정)은 두 제약이 배타 —
//   ① px≥164는 외피 상단이 리브 #3(z44~51)·#4(z58~69) 무릎 굽힘부 관통(px≤163만 무충돌),
//   ② 동시 2~3은 껍질거리 14~20 필요(px≥167 상당) — 직선 px162는 거리 25→12 요동·동시 6~8·간극 누출 58.
//   원호(중심선 r=CL_R)는 거리 ≈17.4 '일정'(안전권 중앙) + 리브 무릎(r≤174 잠입은 y≥265, 지붕 위 10+)과
//   전 구간 무충돌 — 유일해. 좌표: φ = atan2(z,x) (+x=0, +z로 증가). 실린더 θ = π/2 − φ 변환.
export const CL_R     = 170.0                // ★회랑 중심선 반경 — 껍질 r≈187.4와 거리 ≈17.4 일정
export const CL_HW    = 2.6                  // 회랑 내부 반폭(반경 방향, 폭 5.2)
export const CL_Z_START = 5.0                // 방 +z벽 z(= RM_Z1) — 원호는 이 벽 두께 안에서 시작
export const CL_PHI0  = Math.asin((CL_Z_START + 0.3) / CL_R)   // 시작 φ ≈1.79°(벽 중앙에 캡 물림)
export const CL_PHI1  = 23.6 * Math.PI / 180   // ★끝 φ=22° → 끝점 z≈63.7·정면 리브 #4(20°) 도달. 23.6°(z68)는 #5 진입 — 노브
export const CL_ROOF  = 20.0                 // ★회랑 내부고(2026.07.11 상향 9→20) — 11.6 초과 = 리브 상부 관입 체제:
                                             //   리브 밑면이 실내 y≈260.1(바닥 위 12.1)부터 내려옴(보행·개구 띠 1.6~7 무침범, 누수 없음
                                             //   = 상호관입 봉합). 관 진입 장면(y263.4)이 실내화 — 근거·재검: check_lamps.mjs
export const CL_SILL  = 1.6                  // 개구 아래턱(파라펫) — 지면 시선 차단(레이캐스트) + 추락 방지
export const CL_HEAD  = 7.0                  // 개구 위턱 높이
export const CL_OP_P0 = CL_PHI0 + 0.030      // 개구 φ 시작(시작 캡 직후 — #0이 초반에 보이게). 레이캐스트 far=0 튜닝 노브
export const CL_OP_P1 = CL_PHI1 - 0.021      // 개구 φ 끝(끝캡 앞 여백 ≈3.5칸)
// ── 방(하강 착지 + 회랑 진입): +x벽 입 = 구 린텔 개구 검증치 계승(높이 5.2·폭 2×볼벽 오프셋) ──
export const RM_X0    = 165.0                // 방 −x벽 (크기 = 미적 노브 — 회랑 입 x≈167.0보다 안쪽이면 됨)
export const RM_X1    = X_DESC_END - 0.1     // 방 +x벽 = 하강 끝 직전(구 LINTEL_X 자리) ③≈177.6
export const RM_Z0    = -3.2                 // 방 −z벽
export const RM_Z1    = CL_Z_START           // 방 +z벽 = 회랑 시작
export const RM_ROOF  = 7.0                  // 방 내부고(지붕 상단 ③≈255.6 < 전망 램프 최저 256 — 무간섭)
export const RM_MOUTH_H = 5.2                // 하강 입 높이(구 린텔 개구 5.2, 머리 여유 검증치 계승)
// ── 연결 스텁(1p10 자리·잠정): 회랑 안벽 입(φ=ST_PHI)에서 반경 안쪽으로 → 테라스 림 문(1p11 공개점) ──
//  ⚠1p10 표현은 미정(별도 결정 — DESIGN §7). 스텁 = 완주 보장 자리표시자. 문 치수 = PASS_DOOR_*.
//  문벽 반경 = PASS_X_END(테라스 림 물림) — 도착 문법은 구판과 동일(TERRACE_Y 공면·림 0.5 물림).
export const ST_PHI   = CL_PHI1 - 2.6 * Math.PI / 180   // 스텁 축 φ(끝캡 앞) ≈19.4°
export const ST_HW    = 1.9                  // 스텁 내부 반폭(접선 방향)
export const ST_ROOF  = 5.0                  // 스텁 내부고(압축 유지, 문 4.6보다 0.4 위)

// ── ★1p10 등불(2026.07.11): 회랑 위를 지나는 리브마다 얇은 관이 리브 몸통·회랑 지붕을 수직 관통해
//  내려와 회랑 안 깔때기 갓으로 끝남 — '각 속성은 그 자체를 통해 파악되어야 한다'.
//  리브(빛의 관로)의 빛을 제 관으로 따와 제 웅덩이를 만든다: 등불 하나 = 리브 하나 = 자기완결.
//  1p8의 바깥 짝(안에서 본 무한한 빛 ↔ 그 빛이 회랑으로 새어 내려옴) · 1p9 누적 위에 겹침.
//  ⚠#0(탐험 리브) 제외 — 관이 진입 후 보어 안을 계속 달림(상부 수직부에서 중심선 r168과 2.0 이격
//   평행 = 영구 잔류). 1p8 전망대(y≈264.5)가 그 보어를 올려다보므로 이물 노출. #1~4는 보어 밀폐 = 무해.
//  §2-C 등재: 등불 관 = 리브에 물린 '합의된 기능물'(탐험 문·나선과 동급) — 곧음·매달림(비접지),
//   리브 어휘(S자·72배열)와 혼동 없음. 근거·재검: check_lamps.mjs
export const LAMP_RIBS    = [1, 2, 3, 4]           // 대상 리브 인덱스(φ = k·5°) — 회랑 호(1.79~23.6°) 통과분 전부
export const LAMP_R       = CL_R                   // 관의 반경 위치 = 회랑 중심선(리브 상부 수직 기둥 r=168±6 안)
export const LAMP_TUBE_R  = 0.7                   // 관 굵기(반지름) — 미적 노브
export const LAMP_ENTRY_Y = 263.4                  // 관이 리브 표면(중심선 거리 6.0)을 뚫는 높이 — 도출: check_lamps.mjs 스캔.
                                                   //   ★두 체제(지붕고 의존): 지붕 상면 < 263.4−3 = 관이 지붕 위로 노출(테라스 뷰 '꽂힌 관')
                                                   //   지붕 상면 > 263.4+1.5 = 진입 장면이 실내화(현행 CL_ROOF 20 → 상면 268.03,
                                                   //   관이 바닥 위 15.4에서 실내로 내려온 리브 밑면에 꽂히는 게 회랑 안에서 보임)
export const LAMP_TOP_Y   = LAMP_ENTRY_Y + 2.5     // 관 상단 캡(보어 내부 — 불가시). 진입 후 잔류는 check_lamps.mjs가 검증
export const LAMP_MOUTH_Y0 = 10.0                   // ★첫 등불(#1) 갓 입 높이 — 하강 램프 시작(2026.07.11 현도 튜닝값 계승)
export const LAMP_MOUTH_Y1 = 2.7                   // ★마지막 등불(#4) 갓 입 높이 — 하강 램프 끝. 걸을수록 등불이 내려와
                                                   //   끝에서 몸 가까이: 올려다보면 관이 시선을 리브까지 안내(1p10 체감점, 비석 자리 후보).
                                                   //   2.2 = 머리 위 통과 유지. 몸 높이(≈1.5) 하강은 로컬 보행 확인 후 별도 결정(동선 반차단)
export const LAMP_FUNNEL_H = 0.9                   // 갓 높이(입→목)
export const LAMP_MOUTH_R  = 0.7                  // 갓 입 반지름(목 반지름 = LAMP_TUBE_R)
export const LAMP_POOL_R   = 1.7                   // 바닥 빛 웅덩이 반지름(코어 0.55배 + 헤일로)

// ── 테라스(중앙, 도착) (반지름 ×SCALE · y는 통로에서 파생 — 자유 요소의 접속 해소) ──
export const TERRACE_Y    = PASS_FLOOR_Y   // ★1-③B: H·KNEE(240) → 통로 바닥(≈248). 문턱 없는 도착(반지름은 위 참조)

// ── 통로 위치: 단면(COR_R·천장)은 동결, 원기둥이 크기 유지한 채 돔 따라 바깥으로 이동 ──
export const COR_X1     = R_BASE                    // 바깥 끝 = 탐험경선 #0 밑동(③에서 288)
export const COR_CYL_X0 = R_BASE - 2 * COR_R        // ③에서 120 (⚠맨 박스 노출 ~29 = §7 열린 결정 — 통로 만질 때)
export const COR_CX     = (COR_CYL_X0 + COR_X1) / 2 // 원통 중심 x = R_BASE − COR_R (③에서 204)
export const BOX_X1     = COR_CYL_X0 + 4            // 박스 안쪽 끝 = 원기둥 시작 + 살짝 물림
// ── 창(구 WIN_*): 1p5 재설계(2026.07.13)로 [B] 슬릿 상수(SLIT_*)로 이전 — 스케일 무관 절대치라 [C] 파생 불요 ──
// ── 슬릿 양옆 피어(벽 스웰) — ★기하 사실의 해소(check_corridor 최초 실행이 적발): 이웃 리브 ±1(원통
//  중심 거리 ≈86.6·관반경 6)의 안쪽 몸통이 벽면(r=84)을 ≈3.4 관통. 구 파노라마에선 그 방위가 전부
//  개구라 무해했으나 슬릿화로 벽이 생기며 실내 돌출(스포+버그). 벽을 리브 앞에서 '안쪽으로' 부풀려
//  감춤(바깥 부풀림은 천장 림 r=84와 틈 → 기각). 대역·깊이는 리브 ±1 상대 기하에서 파생. ──
const PIER_DC   = Math.hypot(R_BASE * Math.cos(2 * Math.PI / MERIDIANS) - (R_BASE - COR_R), R_BASE * Math.sin(2 * Math.PI / MERIDIANS))  // 원통중심→리브±1 거리 ≈86.6
const PIER_TC   = Math.atan2(R_BASE * Math.sin(2 * Math.PI / MERIDIANS), R_BASE * Math.cos(2 * Math.PI / MERIDIANS) - (R_BASE - COR_R)) // 리브±1 방위각 ≈16.85°
export const PIER_CLEAR = 1.6                                    // 피어 표면↔리브 표면 여유(노브)
export const PIER_B  = COR_R - (PIER_DC - SHELL_RIB_R) + PIER_CLEAR  // 피어 최대 깊이 ≈5.0 (관통 3.4 + 여유)
export const PIER_T0 = PIER_TC - Math.asin(SHELL_RIB_R / PIER_DC) - 4 * Math.PI / 180  // 대역 시작 ≈8.9° (⚠슬릿 모서리 ~7.5°보다 커야 — check_corridor D)
export const PIER_T1 = PIER_TC + Math.asin(SHELL_RIB_R / PIER_DC) + 4 * Math.PI / 180  // 대역 끝 ≈24.8°
// 벽 반지름 프로파일(z대칭·+x측만): 대역 밖 = COR_R, 대역 안 = sin² 스웰. Corridor.jsx·check_corridor 공용(단일 정본)
export const corWallR = (theta) => {
  const t = Math.atan2(Math.abs(Math.sin(theta)), Math.cos(theta))   // 0~π로 접기(z대칭)
  if (t <= PIER_T0 || t >= PIER_T1) return COR_R
  const s = Math.sin(Math.PI * (t - PIER_T0) / (PIER_T1 - PIER_T0))
  return COR_R - PIER_B * s * s
}
// ── 길 ──
// ★플랫폼 위치 노브(2026.07.13 ㊲) — f = 홀 안 위치(0 = 홀 진입 COR_CYL_X0=120 · 1 = 리브 밑동 COR_X1=288).
//  구판 `PLAT_X = (COR_X0+COR_X1)/2 = 144`는 **방 중심(0) 기준 중간**이라 홀 기준으로는 f=0.14 — 박스를 나오자마자
//  9m 만에 원판이 나와 '홀의 입구 마개'로 읽혔다(현도 지적). f는 홀 안 위치를 직접 말한다.
//  ⚠대가: 계단 수평길이 = COR_X1 − (PLAT_X+PLAT_R)가 줄어 **경사가 오른다**(총상승 COR_CLIMB=25는 RIB_Y=74 불변식이라 동결).
//    f 0.14→10.6° · 0.3→13.2° · 0.4→15.6° · 0.5→18.9° · 0.6→24.0° · 0.7→32.4° · 0.72→34.8°(상한).
//  실측 안전 범위 = **f 0.10 ~ 0.72**(스윕). 상한은 **오직 계단 경사(35°)** — ★광학 밀폐는 f=0.8에서도 무누출
//    (리빌 잼 SLIT_JAMB_D의 배당: 플랫폼이 슬릿에 붙어도 이웃 리브가 안 샌다. C절이 플랫폼 림 16점을 눈 표본으로 쓰므로 자동 재검증).
//    하한 0.10 = 원판이 박스 옆벽을 뚫는 지점. 검사 = check_corridor G절 5항.
export const PLAT_F = 0.4                           // ★위치 노브. 0.5 = 홀 정중앙(x=204·계단 18.9°). 로컬 보행으로 재판정
export const PLAT_X = COR_CYL_X0 + PLAT_F * (COR_X1 - COR_CYL_X0)   // ③에서 f=0.5 → 204

// ════════════════════════════════════════════════════════════════════
// ── ★방사 복합체(RAD — 1p1~4 네 방·고리) 매싱 드래프트 2026.07.09 ──
//  골격 개정: 허브(기존 랜딩+빛우물) → 대각 터널 4 → 유선형 꽃잎 방 4(등형 = 같은 기하 4회 회전 배치)
//  → 고리(순환) → 동측에서 박스 옆벽 접합 → 통로(=1p5의 방으로 인계) → 리브. 방 내부 표현은 전부 미정(빈 셸).
//  밀폐: 원뿔대 문 4(대각) · 꽃잎 문 3(방사1+접선2) · 박스 접합문 2 · 박스 서쪽 캡 — 그 외 개구 없음(스포 안전).
export const RAD_ANG0    = Math.PI / 4        // 첫 꽃잎 각(45° NE). 4방 = +90°씩. ⚠나선 슬롯과의 충돌은 ROOM_TOP_AZ로 푼다(RAD_ANG0 회전으론 불가 — 위 주석)
export const RAD_R       = 62                 // 꽃잎 중심 반경 = 고리 중심선 반경(돔 사면 위 부양. 표면고 35.9 대 바닥 49.3)
export const RAD_PRX     = 16                 // ★꽃잎 타원구 수평 반축(13→16, 2026.07.11 ①확장). 노브 — 변경 시 check_radial 재검
export const RAD_PRY     = 17                 // ★★꽃잎 수직 반축(10.5→17, 2026.07.12 셸 계란화 — 현도 스케치). 셸 39.5~73.5: 세로로 긴 계란 = 층고 27.4
export const RAD_PCY     = 56.5               // ★★꽃잎 중심고(51.5→56.5, 2026.07.12). 하단 39.5 = 돔 간극 ≈3.6 · 적도(최대폭 16)가 바닥 위 10.4 — 벽이 발치에서 벌어지며 상승(사발)
export const RAD_T_HW    = 2.2                // 터널·고리 내부 반폭(폭 4.4)
export const RAD_TOP     = 54                 // 터널·고리 천장 높이(내부고 ≈4.7 — 친밀 스케일·꽃잎 셸(≈54.3@진입점) 아래로 폐합=밀폐. 노브⚠셸 폐합 검사 연동)
export const RAD_DOOR_H  = 4.0                // 문 높이(바닥 49.3 기준 → 상단 53.3 — 천장 54 아래 헤더 0.7, 셸 내부고 여유 1.2 검증)
export const RAD_DOOR_HW = 2.3                // 문 반폭(4.6 — 터널·고리 폭 4.4를 덮음 = 상호관입 봉합)
export const RAD_ARC_IN  = 2 * Math.asin((RAD_PRX - 2.5) / (2 * RAD_R)) // ★파생(2026.07.11): 고리 끝 = 꽃잎 중심서 PRX−2.5(터널과 같은 관입 2.5) ≈12.53°
export const RAD_JPHI    = Math.asin(BOX_HW / RAD_R)        // 고리가 박스 옆벽(z=±6)과 만나는 각 ≈5.55°
export const RAD_JX      = RAD_R * Math.cos(RAD_JPHI)       // 접합문 중심 x ≈61.71 (박스 옆벽 위)
export const RAD_JDOOR_HW = 2.0               // 접합문 반폭
export const RAD_CAP_X   = 54                 // ★박스 서쪽 캡 x — BOX_X0가 이 값으로 단축(아래) → 원뿔대 동쪽 문 자동 봉인
export const RAD_T_IN    = 12                 // 터널 안쪽 끝 반경(원뿔벽 r18@y46 관통, 디스크 r6~18에 물림)
export const RAD_FLOOR_Y = COR_Y0 - 0.02      // 터널·고리·접합 패드 바닥 중심 y(다리 49와 0.02 립 — z파이팅 방지 전례). ⚠통로 레벨은 강하와 무관하게 불변
// ── ★방 바닥 강하 + 진입 계단(2026.07.12 셸 계란화 — 현도 스케치 3항: 층고↑·바닥<허브 디스크·전 문 계단) ──
export const RAD_DROP    = 3.2                // ★방 바닥 강하량(문지방 49.28 → 46.08). 문·터널·고리·문틀 = 전부 문지방 레벨 유지(불변)
export const RAD_ST_N    = 10                 // 계단 단수 → 단높이 = DROP/N = 0.32
export const RAD_ST_T    = 0.34               // 디딤 깊이 — 진출 3.4
export const RAD_ST_LAND = 1.9                // 문틀 중심(FR_C)부터 첫 단코까지 착지장 깊이 — 통로 바닥판 혀끝(중심거리 13.5)을 0.4 이상 지나 관입으로 삼킴
export const RAD_ST_W    = RAD_DOOR_HW * 2    // 계단 폭 = 문폭 4.6

// ════════════════════════════════════════════════════════════════════
// ── ★정점 렌즈(LENS — '세공 중인 렌즈' 2026.07.12) ──
//  존재론(현도 확정): Apex(신·무한의 빛)의 '구체화' — 외부 추가물이 아니라 정점 그 자체.
//  하나의 빛이 렌즈(패싯=속성별 굴절면)를 거쳐 72 리브에 굴절 = 표현(expression)의 장치.
//  §2-C 무충돌: 세로 아님·얇음/S자/배열 아님 — 리브=실체 잠금과 경쟁하지 않는 새 어휘(부양 원반).
//  ⚠스포 판정(계산 근거):
//   · 물리 비침투: LENS_R + 여유 < R_TOP − SHELL_RIB_R(=162) → 리브 관과 교차 없음.
//   · 보어(1p8) 불가시: LENS_Y ≤ H면 렌즈가 샤프트 '안'이라 불투명 관벽이 가림(자동).
//     LENS_Y > H로 올리면 관 시야콘(반각 ≈ atan(2·SHELL_RIB_R/보어길이) ≈1.0°) 재검 필요 — check_lens가 두 체제 자동 판정.
//   · 테라스 완전 노출: 테라스 외연(158.4) < 개구 내경(162) → 시선이 관벽 반경에 안 듦.
//   · fog(App: near 144·far 720): 테라스(y≈248)→렌즈 거리 < far 필수. y=960이면 710(≈전소멸) —
//     기본 LENS_Y 640(거리 ≈390, 시직경 ≈34°)이 그 귀결. LENS_FOG=false면 안개 면제(암실화 shaftMat 전례).
export const LENS_R      = 100                // 렌즈 반경 — 상한: R_TOP−SHELL_RIB_R−여유(162−4). 개구와의 틈 = 하늘 고리
export const LENS_Y      = 330                // 렌즈 중심 높이 — 노브(테라스 웅장함 ↔ 답답함, 현도 로컬 판정). ≤H(960)이면 보어 자동 안전
export const LENS_T      = 24                 // 중심 반두께(양볼록 정점)
export const LENS_MID_T  = 15                 // 중간 링 반두께
export const LENS_MID_F  = 0.55               // 중간 링 반경 비율(×LENS_R)
export const LENS_FACETS = MERIDIANS          // ★패싯 수 = 리브 1:1(현도 확정) — 패싯 k 중심각 = 리브 k 방위각
export const LENS_IRREG  = 0.65               // ★0=정규(대칭 세공) ↔ 1=원석(비대칭). 하나의 노브로 연속 조절(현도: 원석 지향)
export const LENS_SEED   = 7                  // 결정론 시드 — 같은 값이면 항상 같은 원석
export const LENS_FOG    = false              // 렌즈 재질 fog 면제(안개 속 유일하게 또렷한 보석). true면 거리 워시
export const LENS_COL    = '#efe3c6'          // 몸체(옅은 세공석) — 진짜 색·빛 연출은 Phase 3에서 논의(현도)
export const LENS_EMIS_C = '#ffd98f'          // 발광색(웜 플레이스홀더)
export const LENS_EMIS   = 0.35               // 발광 강도
// ── 리브 굴절 그라데이션(렌즈와 한 몸 — 위에서 내려오는 굴절광이 무릎으로 잦아듦) ──
//  구현 = 셰이더 패치(Dome.jsx ribTintOBC): 기하·CSG 무접촉 → #0과 71개 자동 동일(LOCKED 안전). 끄기 = AMT·EMIS 0.
export const RIB_TINT_COL  = '#f3ddb0'        // 워시 색(웜 플레이스홀더 — 팔레트는 Phase 3)
export const RIB_TINT_AMT  = 0.15             // 알베도 혼합 최대치(정점에서)
export const RIB_TINT_EMIS = 0.10            // 발광 성분(안개 관통 보조)
export const RIB_TINT_Y0   = 320              // 그라데이션 시작(무릎 위 — 여기 아래는 순수 석재)
export const RIB_TINT_Y1   = LENS_Y           // 그라데이션 만개(렌즈 높이에서 최대 — LENS_Y 노브에 자동 연동)
// ── 렌즈 투명도(2026.07.12 로컬 1차 — 불투명은 돌 천장으로 읽힘·시야 차단) ──
//  glass = meshPhysicalMaterial transmission: 뒤 장면이 '굴절되어' 비침(진짜 렌즈) — ⚠렌즈 가시 시 장면 1회 추가 렌더(성능).
//  alpha = 단순 반투명(가벼움·유리감 덜함·DoubleSide 정렬 아티팩트 가능성). solid = 구판.
export const LENS_MODE     = 'alpha'          // 'glass' | 'alpha' | 'solid' — FPS 떨어지면 alpha로
export const LENS_TRANSMIT = 0.85             // glass 투과율(0~1)
export const LENS_IOR      = 1.5              // 굴절률(유리 1.5·수정 1.55)
export const LENS_ROUGH_G  = 0.18             // glass 표면 거칠기(패싯 하이라이트 — 낮을수록 유리)
export const LENS_THICK    = 20               // glass 굴절 두께감(왜곡 강도)
export const LENS_OPACITY  = 0.8             // alpha 모드 불투명도

// ════════════════════════════════════════════════════════════════════
// ── ★1p1~4 방별 사건(P1~P4) + 방사 비석(P_ST) — 2026.07.12 브리프 구현 ──
//  원리·판정 = DESIGN.md §5 + BRIEF_radial_room_events.md. 전부 잠정("노브 달린 골격 4개").
//  공통 구속: 개구 무추가 · 셸 외곽 불변(전 정점 r ≤ 셸내면−0.01) · 부착 금지(방 자신의 변형) · 정적.
//  방 단위 독립: Pn_ON 스위치 = 폐기 한 줄. 기하 빌더 = radialEventsGeometry.js(순수 모듈 — 렌즈 전례).
export const petalR = (y) =>                    // 꽃잎 셸 '내면' 수평 반경(높이 y) — 셸은 수직축 회전체라 원(스포·봉합 판정 공용)
  RAD_PRX * Math.sqrt(Math.max(0, 1 - ((y - RAD_PCY) / RAD_PRY) ** 2))
export const P_FLOOR_TOP = RAD_FLOOR_Y + COR_THICK / 2 - RAD_DROP  // ★방 바닥판 윗면 46.08 = 문지방 Y_FTOP(49.28) − 강하(2026.07.12 계란화. 통로 레벨과 분리)
export const P_FLOOR_R   = petalR(P_FLOOR_TOP) - 0.15          // ★가용 바닥 반경 ≈12.49 — 적도 아래 절단이라 구판(15.3)보다 좁음 = 사발의 대가(스케치 확정)
export const P_DOOR_TOP  = COR_Y0 + COR_THICK / 2 + RAD_DOOR_H  // 문 상단 ≈53.3 — 천장 사건의 하한 근거
export const P_ROOM = { p1: 0, p2: 1, p3: 2, p4: 3 }     // 꽃잎 인덱스(angs[k]=RAD_ANG0+k·90°): NE 1p1·NW 1p2·SW 1p3·SE 1p4(㉕ 확정)

// ── P1(NE) 볼록 바닥 — "근거/앞섬": 방 전체가 완만한 볼록, 그 외 무사건 ──
export const P1_ON      = true
//  ★㉞ A(아직 떨어지지 않은 것들) 확정, B(볼록 극화) 폐기 — 현도 07-13. 융기 배치·치수 정본 = radialEventsGeometry.js P1A 표
//  (주 융기 = +x 통로 오르막·비석 어깨 / 부 3 = 사분면 포켓 / 이음새 0·바닥 재질 = 1p4와 대각 대구)

// ── P2(NW) 어긋난 두 천장(전단) — "공약불가(무관심)": 두 천장이 다른 높이라 아예 만나지 않음 ──
//  ★재작업 2026.07.12 ㉘(구 '능선 공유 두 볼트' 기각 — 로컬 실측: 계란화 후 12~22m 위 어두운 밑면
//  두 장은 균질광에서 한 덩어리, 능선은 희미한 선 = §3 ⑩ 위반. 구판은 능선 좌표를 아이러니하게 '공유').
//  전단 평면(로컬 z=SHEAR_Z)에 수직 절벽면: 낮은 천장(−z, 몸 가까이)과 높은 천장(+z, 계란 층고 유지)이
//  높이 JUMP(EDGE_B−EDGE_A ≈9.6)로 어긋남. 수직면 = 균질광에서도 중간톤(보임) · 점프 = 몸으로 읽힘.
//  각 천장 = 전단 모서리(EDGE)→제 벽 rim 2차 베지어(EDGE·RIM·BULGE·PEAK 각자 = 다른 중심·곡률 유지).
export const P2_ON         = true
export const P2_SHEAR_AZ   = -20 * Math.PI / 180  // ★전단선 방위 — 연속 노브(0~360 아무 각). 도(°)로 쓰려면 `n * Math.PI / 180`.
                                              //  0 = 진입축(허브 −x → 비석 +x)과 나란 · −20° = 현도 로컬 튜닝(07-12).
                                              //  ⚠수정 후 하드 리로드(useMemo 캐시 — HMR이 constants 변경을 못 잡을 수 있음)
export const P2_SHEAR_Z    = 0.5              // 전단 평면의 로컬 z(0 아니면 좌우 평면적도 달라짐 — 무관심 강화). 현도 튜닝
export const P2_EDGE_A     = 57               // 낮은 천장(−z) 전단 모서리 높이 = 절벽면 하단 — 바닥 위 10.9. 현도 튜닝
export const P2_EDGE_B     = 64.8             // 높은 천장(+z) 전단 모서리 높이 = 절벽면 상단 — 바닥 위 18.7. ★JUMP(=EDGE_B−EDGE_A) 7.8 = 핵심 노브
export const P2_RIM_A      = 62               // 낮은 천장 벽 rim — ★현도 튜닝: 모서리(57)보다 높아 벽 쪽으로 '들리는' 낮은 천장(구도 반전 수용)
export const P2_RIM_B      = 60.5             // 높은 천장 벽 rim
export const P2_BULGE_A    = 1.4              // 낮은 천장 불룩(모서리 위로) — 정점 ≈55.7(바닥 위 9.6)
export const P2_BULGE_B    = 3.2              // 높은 천장 불룩 — 정점 ≈65.8(바닥 위 19.7)
export const P2_PEAK_A     = 0.45             // 낮은 천장 정점 위치(전단 0→벽 1)
export const P2_PEAK_B     = 0.60             // 높은 천장 정점 위치 — 둘이 다르면 '중심이 다름' 유지

// ── P3(SW) 천장 인발 4기 — "공통 없는 사물들": 좌절된 인과 ↔ 무관심한 이질성 '사이'의 역동(★재작업 07-12 ㉙) ──
//  구 '두 팔' 폐기(현도: 미학 별로). "점토 천장을 쭉 당긴" 이질 조형 4기(나선/굽은 직육면체/타일 사슬/접힌 리본)
//  — 인발 플레어 + 목 모프 = 방 자신의 변형(부착 금지 구속 존치). 3층 구도: 근접 출발(중심부) → 발산(서로 안 향함)
//  → 스침 한 쌍(나선↔리본, "닿을 뻔"의 유산). 개별 조형 수치의 정본 = radialEventsGeometry.js P3S 스펙 표.
export const P3_ON        = true
export const P3_AZ        = 0                 // 구도 전체 방위(연속 노브 — 도(°)는 `n * Math.PI / 180`. 문·비석과의 각 관계 튜닝)
export const P3_GRAZE_GAP = 0.9               // ★스침 쌍 최근접 간극(0.4~2.0) — 가장 예민한 노브. 리본 접점이 나선 실측점에서 파생돼 자동 추종
export const P3_TIP_CLEAR = 2.3               // 전 조형 끝의 바닥 위 최소 여유 — "머리에 스칠 정도"(현도 07-12 2차: 눈높이 위 ≈0.7)
export const P3_TWIST     = 180 * Math.PI / 180  // ★비틀린 띠의 총 비틀림 — 도(°) 문법(`n * Math.PI / 180`). 180 = 반 바퀴. 권장 90~360.
                                              //  ⚠구 270°가 '나사송곳'으로 보인 건 값 탓이 아니라 스윕 프레임 버그(매 구간 180° 뒤집힘 — 07-12 수정).
                                              //  나선 turns·타일 개수 등 나머지 개별 수치의 정본 = radialEventsGeometry.js 상단 `P3S` 표
export const P3_REACH_MAX = 9.0               // 수평 도달 상한(문·계단 진출역·비석권 회피 — check_rooms 봉쇄)

// ── P4(SE) 뚫린 것과 막힌 것 — 무어 군집(★㉛→㉜ 확정, 구 '분류표' 폐기) ──
//  1p4 "속성 또는 변용에 의해 구분된다" — ★㉜ A(뚫린 것과 막힌 것) 확정, B(넘어짐 연작) 폐기(현도 07-13).
//  개별 조형 수치(배치·치수)의 정본 = radialEventsGeometry.js의 P4A 스펙 표.
export const P4_ON       = true
export const P4_SCALE    = 1.35               //  ★전체 크기 배율(치수만 — 배치 불변). 현도 "좀 키워줘"(07-13) 기본 1.35, 권장 1.0~1.6
                                              //  ⚠수정 후 하드 리로드(CSG + useMemo 캐시)
export const P4_TILT_MAX = 14 * Math.PI / 180 //  안 A 기울어짐 그라데이션 상한(x 단조 0→MAX)
export const P4_PATH_HW  = 2.6                //  십자 경로 반폭(보행 청정 검증 기준 — 계단 진출 동선)

// ── 방사 비석 4기(상수층 — DoD 보험): 전 방 로컬 +x 벽 앞, 허브 문(−x) 정면, 어휘·치수 4방 동일 ──
export const P_ST_X    = 11.4                 // 비석 로컬 x(+x 벽 앞) — ★바닥 반경 12.49에 맞춰 12.6→11.4(받침 뒷단 12.1 ≤ 바닥단)
export const P_ST_NEAR = 6                    // 글자 페이드 near(방 스케일)
export const P_ST_FAR  = 26                   // 글자 페이드 far — ★방 축소(지름 25)에 맞춤: 계단 착지에서 어렴풋, 다가가면 선명

// ── 검수 스폰(개발용 노브): NE(1p1) 방 허브 문 안쪽 — 방 안쪽(+x 비석)을 향해 선다 ──
//  ⚠y는 반드시 볼록 바닥(P1) 프로파일만큼 올려야 한다(FirstPersonControls가 p1ProfileAt으로 자동 추종):
//  파묻힌 채 스폰하면 probe 레이(feet+STEP_UP서 하향)가 볼록을 놓치고 그 밑 원판을 맞아 계속 파묻혀 걷는다.
export const P_SPAWN_LX = -7.5                // 스폰 로컬 x(−x = 허브 문 쪽). ★계란화: 허브 계단 진출(발치 ≈−9.7)보다 안쪽·비석까지 18.9 = far(26) 안
