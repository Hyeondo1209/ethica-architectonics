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
export const ROOM_R       = 64    // ★★㊵-2 구형화(2026.07.20 현도 소견 1): 91→64 — 종횡비 91/49=1.86 → 1.31(구에 근접).
                                  //  노브 안전범위 [62, 91]: 하한 62 = 나선 상부(오큘러스 림 부근)↔돔벽 여유 1.0 실측
                                  //  (64에서 1.14 · 60은 0.89로 위험) + 목 봉합 하한 √(54²+BOX_HW²)=54.3 + 여유.
                                  //  ⚠82 미만 = 방사 꽃잎 발자국(반경 78)이 구 밖 — 스커트는 지면 낙하 대신
                                  //  밑단(hem) 폐합(RAD_SKIRT_MAX, Radial.jsx clipY)으로 우아하게 닫힘. 구형화의 파생 판정 = 현도.
// ── ★㊵ 구화·부양(2026.07.19 결정 · 티켓 1/3): 방 복합체(반타원 돔+허브+페탈4+첨탑) → 완전한 타원구, 공중 부양 ──
//  Δ = LIFT_Y. 접합 레벨 = 49 + Δ (구 49 동결 공식 ⚠해제 — ㊵ (3)). 구 내부 주 바닥은 수평 유지(㊵ (1)).
//  구 아랫반 = 윗반의 거울(수직 반축 동일) → 구 바닥 y = LIFT_Y − 49. Δ=52 → 바닥 3 = 지면 위 부양 간극.
export const LIFT_Y       = 52     // ★㊵ 부양 Δ(노브) — 단면 시각화 5왕복 확정값. 접합 49→101. ⚠나팔 결합 전제(칼끝 립·박스 담김) — 올리려면 통로 재설계 동반(07.20 상향 시도 100 → 현도 원복)
export const ROOM_FLOOR_Y = LIFT_Y // 구 내부 주 바닥(수평) — 구 0(지상). 방 안 모든 y가 이 값에서 파생
export const ROOM_CEIL_Y  = LIFT_Y + 49   // 돔 apex = 통로 접합 높이 — ★㊵ (3): 구 '49 동결'을 파생으로 전환(Δ=52 → 101)
export const ROOM_DOME_APEX = ROOM_CEIL_Y                     // ★돔 정점 높이 — ★㊵ 파생 전환(구 절대 49 = 접합 레벨). 키우면 돔이 위로 솟음
export const ROOM_HEIGHT  = ROOM_DOME_APEX - ROOM_FLOOR_Y     // 돔 전체 높이(wallR·domeClipY·돔메시·조명이 사용)
export const ROOM_OCULUS_R = 17.45 // ★㊵-2 파생 전환: 천장 구멍의 '평면 반지름'이 기능 절대치(사람 가구) — 나선 도착 고리(RIN 14) 통과 + 빛우물(@정점17.3) 통과 + 디스크가 위 덮음
export const ROOM_OCULUS  = Math.asin(ROOM_OCULUS_R / ROOM_R)  // 반각 = 반지름에서 파생(구 절대 0.193은 ROOM_R=91 전용이었음 — 축소 시 구멍이 14 밑으로 좁아져 나선·빛우물 위반)
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
export const ROOM_CYL_TOP     = ROOM_CEIL_Y + 61  // 빛 우물(첨탑) 꼭대기 높이 — ★㊵ 부양 동반 상승(구 절대 110 = 49+61을 파생으로). 튜닝 노브
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
export const SHAFT_TOP_Y  = ROOM_CEIL_Y    // 샤프트 '허리' 높이(디스크 구멍 = 접합 레벨) — ★㊵ 파생 전환(구 절대 49) — v2.1: 출처를 원뿔대 꼭대기 구멍(ROOM_CYL_TOP·WELL_RT)으로 올리며 2절 구성
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
//  ③ ★1p5 재재설계 ㊳(2026.07.14): 창 ±43° 복원 — 다섯을 세워 놓고 무너뜨린다(문 다섯·계단 다섯·#0만 도달)
export const COR_Y0       = ROOM_CEIL_Y    // 복도(접합) 레벨 = 구 apex — ★㊵ (3): 49→101 (LIFT_Y 파생)
export const COR_X0       = ROOM_CX        // 안쪽 끝(구 꼭대기, 접합점)
export const COR_R        = 84             // ⚠㊵ 임시 앵커: 구 수직 드럼 반지름 — 드럼 메시는 폐기, 계단 다섯(polar 원호·문 축)이 아직 참조(홀 재설계 때 소거)
export const COR_THICK    = 0.6            // 바닥·박스 판 두께
// ⚠㊵(2026.07.19): 구 수직 드럼(벽·빗면 천장·창 ±43°)·신전 프리즈 폐기 — 통로 외피는 [C]의 '나팔'(TRUM_*)로 교체.
//  창의 '다섯 프레임' 역할은 나팔 동쪽 입(원 단면 개구)이 승계 — 프레이밍 판정은 로컬(홀 내부 재설계와 한 묶음).

// ── ★리브 문 다섯(㊳) — 다섯 리브에 제각각 높이의 입구. 문 폭·높이(DOOR_W/H)는 현행 계승 ──
export const HALL_DOORS_ON = false   // ★㊶-3 임시 소등(현도) — 리브 문 다섯 개구를 끈다(true=복원). 리브는 매끈한 관으로.
                                     //  ⚠구조 아닌 '스위치'다: HALL_DOORS 배열·문턱 5값·법선·계단 유도는 전부 보존.
                                     //  끄면 (a) Dome의 문 CSG 컷 skip(#0 아치는 유지 — 갈림 하강로가 지남) (b) 셀라·프리즈
                                     //  관통 구멍은 유지(리브 pierce는 문과 무관) (c) check_corridor D·K·O절이 자동 가드.
                                     //  ⚠계단·플랫폼·제단은 여전히 렌더(A안 = '문 개구만'). 1p5 신체 좌절 표현은 복원 시 부활.
//  ⚠높이 배치의 의도(바꾸지 말 것): 좌우 비대칭 · 등간격 없음 · #0을 일부러 평범하게(위쪽 넷 중 3위).
//  #0이 닿는 유일한 이유는 "거기 계단이 실제로 이어져 있어서"여야 한다 — "높이가 적당해서"가 아니라.
//  ⚠#0 문턱 72 = DOOR_SILL_Y = RIB_Y−2 고정(불변식의 귀결) — 불규칙성은 나머지 넷이 진다.
//  ⚠LOCKED §1 첫 공식 예외: 문 = 형태가 아니라 '접근 지점'. 문 뚫린 리브 = 보이는 다섯뿐(나머지 67 무문).
//   조건 = 다른 시점(회랑 CL_SILL·테라스 y≈248)에서 문 불가시 → 1p11 반전 무손상(check_corridor K절 강제).
export const HALL_DOORS = [
  { k: -2, sill: 9 },              // 보행면(49.3) 아래 40.3 — 유일한 하강(하부 44.5% 공백을 여정으로)
  { k: -1, sill: 91 },             // 위 41.7 — 가파른 갈래
  { k: 0, sill: DOOR_SILL_Y },     // ★72 고정 — 유일하게 닿는 것
  { k: 1, sill: 60 },              // 위 10.7 — 거의 평평한 갈래
  { k: 2, sill: 99 },              // 위 49.7 — 가장 높은 갈래
]

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
export const COR_RISE     = 0.43           // 계단 판 두께(=구 한 칸 높이). ㊳ 곡선 계단이 판 두께로 계승
// ── ★㊵ 하강 = 나팔 바닥(구 ㊴-5 하강 계단 42단 폐기): "통로 자체가 홀로의 하강 시작" ──
//  PLAT_Y(제단 높이)는 나팔 바닥 컷 평면에 물려 파생 — 정의는 나팔 블록 뒤([C] 하단, trumFloorY 필요).
export const RIB_Y        = 74             // ★리브 접합(문) 높이 — 불변식 그 자체(㊴ 역전 유지 · ㊵ 무변)

// ── ★계단 다섯(㊳ 2026.07.14) — 스페이스워크식 자유곡선. 곡선 표(STAIR5)의 정본 = corridorStairsGeometry.js ──
export const STAIR_GAP   = 6     // ★못 닿음의 거리(계단 끝 ↔ 문, m) — 열린 결정 노브. 4~8 제안(작으면 버그로, 크면 미완성으로 읽힘)
export const STAIR_DS    = 1.05  // 판 간격(호길이 균일 — KneeWalk 교훈: 높이 균일은 무더기)
export const STAIR_TD    = 1.35  // 판 깊이(접선 방향) — 간격×1.29 겹침(틈 없음, 곡선 바깥귀 커버는 곡률 검사로)
// ── ★㊴-7 계단 체계 스위치(2026.07.19) — 곡선 리본 두 스킴(mirror·arc) 기각 후 어휘 교체 ──
//  현도 판정: "둘 다 이상함" — 진단 = 연속 곡률 리본 자체가 비건축적. 대가 문법 = 곧은 비행 + 참.
//  'flight' = 절곡 문법(봉 제수스·가르니에): 지그재그 직선 비행 + 참. 법칙 셋(꺾임 60° 균일·비행
//             등장·쌍 미러 + a0 좌우 대칭 부채 등차 45°)이 다섯을 전부 결정.
//  'polar'  = 극좌표 문법(에피다우로스·계단우물): 상승 = 드럼 벽 동심 원호(반경 공유 = 동심 보장),
//             결절 = 평탄 스포크 다리(반경 방향 = 시도, 원호 방향 = 오름). 중앙 공역이 빈다.
//  ⚠판정 = 이 값 교체 + 하드 리로드. 두 스킴 모두 check_corridor가 상시 검증(M절).
export const STAIR_SCHEME = 'polar'
export const STAIR_W     = 3.4   // ★판 폭(㊴ 축소, 현도 소견 4: "지나치게 넓음"). 구 5(=길 폭 계승) → 3.4. DOOR_W 6 안 통과 유지
export const STAIR_RAD0  = 7     // ★결절 정렬(㊴ 소견 6): 곡선 첫 제어점 = 출발점의 반경 방향 이만큼 앞 —
                                 //  판이 플랫폼 림에 '수직으로' 물려 나감(비스듬한 물림 = 엉성함의 원인 제거)
export const STAIR_MAX_SLOPE = Math.tan(35 * Math.PI / 180)   // ★경사 상한 — 전 구간(검증 강제)
export const STAIR_PARA_ON    = false  // ★㊴-3 현도 판정: 파라펫 제거(계단 = 맨 판 — 부양 판 어휘가 벽 없이 더 순수). 코드는 보존(스위치)
export const STAIR_PARA_H     = 1.05   // 파라펫 높이
export const STAIR_PARA_STOP  = 5      // ★끝에서 이만큼 앞에서 소멸 — 끝을 감싸면 '전망대'로 읽혀 도달 실패가 죽음
export const STAIR_PARA_TAPER = 6      // 소멸 구간 길이(높이가 0으로 잦아드는 길이)

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
// ── ★㊵-4 드럼 복원(2026.07.20 현도: "통로 = 원래 형태(원기둥+빗면 절단)로, 부양은 유지") ──
//  구 드럼 체제(수직 원기둥 벽 + 빗면 천장 + 창 ±43°) 복원. ★단 천장은 절대치(70/150)를
//  '보행 기준 파생'으로 전환 — 부양(+52) 시 보행 단면(낮은쪽 +20.7 / 높은쪽 +100.7)이 구값과 동일하게
//  보존된다. 부산물: 높은 끝 = COR_Y0+101 = 202 ≈ 리브 시각적 휨 시작(㊵ 나팔 발견의 계승 — 천장이
//  리브 꺾임에서 끝난다). 벽·창 하단은 지면·리브 앵커 그대로(문 다섯 9~99가 창 안에 있어야 하므로).
export const CEIL_LO      = COR_Y0 + 21    // 천장 낮은 쪽(방, −x) — 구 70 = 49+21의 파생화(보행 기준 단면 동결)
export const CEIL_HI      = COR_Y0 + 101   // 천장 높은 쪽(리브, +x) — 구 150 = 49+101의 파생화 → 202 ≈ 리브 꺾임
export const CEIL_SLOPE   = (CEIL_HI - CEIL_LO) / (2 * COR_R)   // 빗면 기울기(=구식 (COR_X1−COR_CYL_X0) 항등)
export const ceilY        = (x) => CEIL_LO + CEIL_SLOPE * (x - COR_CYL_X0)  // 천장 평면 y
export const COR_WALL_SEG = 96             // 원통 벽 둘레 분할 수
// +x 벽 창(㊳ ±43° — 다섯의 프레임) — 하단·상단은 ★절대/천장 앵커(문 다섯이 지면 기준이므로 부양과 무관)
export const WIN_HALF   = 43 * Math.PI / 180   // ★창 반각 — #±2 포함(32.1°)·#±3 배제(45.1°)의 기하 근거
export const WIN_SILL_Y = 0            // 아래턱 0 = 리브를 발끝(지면)까지 (문 #−2 문턱 9 노출 필수)
export const WIN_TOP_Y  = CEIL_HI      // 위턱 = 천장
// ── 창·문·계단(㊳): [B] 절대치 블록 참조(WIN_*·HALL_DOORS·STAIR_*). ⚠구 슬릿(SLIT_*)·피어(PIER_*·
//  corWallR)는 ㊳으로 폐기 — 슬릿은 '다섯을 보인다'로 반대 요구가 됐고, 피어는 이웃 리브를 가릴 이유가
//  사라져 동반 소멸(벽 = 순수 원통 COR_R 복귀. 리브 ±1의 벽면 관통 3.4는 이제 개구 안이라 무해 — 구 파노라마와 동일). ──

// ── ★신전 프리즈(㊳→㊴) 복원 — 창 상부(y=TEMPLE_Y0~빗면 천장) 수평 부재. 리브 무절단 가림 ──
export const TEMPLE_MODE = 'beam'
// ── ★㊺ 엔타블러쳐 밑면 개구(2026.07.21 현도 — "리브가 짧게 느껴짐 → 밑면을 삼각/아치로 열어 가운데 리브 드러냄") ──
//  프리즈 밑면(y=TEMPLE_Y0)을 평평 대신 삼각(페디먼트)/아치로 파 가운데 리브(#0)가 위로 더 드러나게 한다.
//  = 그리스 신전 박공·개선문 어휘. 신전 파사드감↑ + "다섯이 같은 선에서 잘림"의 단조 해소.
//  ⚠개구는 z방향(리브 열)으로 열림 — 가운데(z=0) 최고, 양끝(z±HZ) 0. 배경(셀라)이 그 뒤를 받쳐 봉인 유지(R4절).
//  ⚠개구 하한 = 문 위(최고 문 상단 110 + 여유) — 문 다섯 온전.
export const TEMPLE_PEDIMENT = 'arch'   // ★밑면 어법 — 'flat'(평평·구 상태) / 'tri'(삼각 페디먼트) / 'arch'(아치)
export const TEMPLE_OPEN     = 50      // ★가운데(#0) 개구 높이(현도 "삼각 30 근처") — 밑면 114 → 가운데 144까지 열림
export const TEMPLE_Y0   = 114              // ★부재 하단 y — 최고 문 상단(110) 위 4(지면 앵커 — 문과 함께 불변)
export const TEMPLE_X0   = COR_CX + COR_R * Math.cos(43 * Math.PI / 180) - 1.5   // 앞면 ≈263.9 = 창 모서리 − 1.5
export const TEMPLE_X1   = 295              // 뒷면 — 리브 관 단면(x≤294) 포함 여유 1
export const TEMPLE_HZ   = 62               // z반길이 — 창 전폭(±57.3) + 리브 #±2 관 여유
export const TEMPLE_CLR  = 0.4              // 관통 구멍 반경 여유

// ── ★셀라(CELLA, 내진) ㊶ 2026.07.20 — 창 밖 다섯 리브 구역을 '서면(창 쪽)만 뚫린 직육면체'로 감싼다(현도 안) ──
//  §7 ⑦(리브 틈 하늘 비침 — 신전 파사드 희석)의 후보 (b) 실현. 덤 = 창가 근호 노출(구 동시 최대 15)이
//  옆벽·동벽에 기하로 차단돼 '다섯'으로 떨어진다(O절 봉인). 이름 = 신전 어휘의 연장: 파사드(프리즈) 뒤에서
//  신상(다섯 실체)을 모시는 내진(cella). 리브 다섯은 지붕을 '관통'해 위로 계속 = TempleBeam pierce 어휘
//  ("실체는 아무것도 이지 않는다" — LOCKED 무결. 구멍은 프리즈 구멍과 동축·동반경이라 한 구멍으로 이어짐).
//  ⚠구축 원리(Corridor.Cella): 드럼 벽 = 두께 0 셸(r=COR_R)이라 직선 슬랩이 곡벽을 지나면 홀 안쪽으로
//  지느러미가 삐진다 → 슬랩 유니온에서 드럼 내부 원기둥(CELLA_BITE_R)을 CSG로 절제(안쪽 돌출 ≤ 0.2 =
//  셸에 붙은 불가시 슬리버·곡벽 물림 봉인을 한 수로).
export const CELLA_ON      = true                 // 스위치(폐기 = 한 줄)
export const CELLA_ZHW     = TEMPLE_HZ            // 옆벽 안쪽면 |z| = 62 — 프리즈와 정렬. #±2 외곽(56)+여유 6 · #±3(74.5)부터 차단
export const CELLA_X1      = 300                  // 동벽 안쪽면 x — 리브 #0 바깥면(294)+여유 6. ★깊이 노브(배경까지의 숨)
export const CELLA_T       = 2.0                  // 벽·지붕 두께
export const CELLA_ROOF_T  = 2.0                  // 지붕 두께
export const CELLA_ROOF_Y0 = TEMPLE_Y0            // ★㊶-2 지붕 밑면 = 프리즈 밑면과 '같은 평면'(114) — 구 112.2(−1.8 단차)는
                                                  //  바이트 원호 모서리 + 단차 그늘이 창 위 '곡선 띠'로 노출(현도 반려). 동일 평면
                                                  //  + 프리즈 발자국 절제(Cella 주석)로 원호가 프리즈 안에 숨는다
export const CELLA_ROOF_Y1 = TEMPLE_Y0 + CELLA_ROOF_T   // 상면 116 — 프리즈 밑면 '위' = x 295~300 띠 상향 누출 봉인 유지
export const CELLA_CLR     = TEMPLE_CLR           // 리브 관통 구멍 반경 여유(프리즈와 동일 → 구멍 연속)
export const CELLA_BITE_R  = COR_R - 0.2          // 드럼 내부 절제 반경 — 셸(84)을 0.2만 넘어 물림
export const CELLA_XW      = COR_CX + Math.sqrt(CELLA_BITE_R ** 2 - (CELLA_ZHW + CELLA_T) ** 2) - 2
// ── ★㊻ 개구 배경 봉인(2026.07.21 현도 — 아치 개구 50으로 키우니 개구 위 뒤 뚫림 + 배경벽 단차) ──
//  ⚠단차 교훈: 배경을 '별도 슬래브로 올리면' 동벽과 이음선(단차)이 생긴다(현도 지적). 대신
//  동벽 y상단 자체를 개구 위까지 직접 올린다(한 박스 = 이음선 0 = "원래 벽 위에 그냥 올린" 연속면).
//  옆벽·벽감·지붕 무변(현도 "벽 무늬 그대로"). 리브(x288<300)보다 뒤라 리브 구멍 불요.
export const CELLA_BACK_ON = true                 // 개구 배경 봉인(동벽 상단 상향)
export const CELLA_BACK_Y1 = TEMPLE_Y0 + TEMPLE_OPEN + 6   // 동벽 상단 = 개구 최고점(TEMPLE_Y0+OPEN) + 여유 6(개구 높이 자동 추종)
                                                  // 슬랩 서단(파생 ≈256.1) — 바이트가 안쪽을 절제하므로 여유 −2
export const CELLA_COLOR   = '#b89a6a'            // ★톤 노브 — 기본 = 드럼·프리즈와 동일(한 몸통·이음선 소거). 어둡게(예 #a9905f)면 감실감 — P2 조명 때 재판정 후보
// ── ★㊸ 셀라 배경 깊이(2026.07.21 현도 — 리드백 ③: 리브 너머 배경에 사건) ──
//  왜: 창(±43°)으로 보이는 셀라 안쪽이 텅 빈 평벽 = 공간이 밋밋(현도 로컬 소견). 동벽(x=300)
//  안쪽면에 감산 브러시로 '깊이'를 파 리브 기둥 사이로 배경 사건이 보이게 한다. 셸·구멍·프리즈
//  봉인은 무변(감산만 추가 — O절 근호 차단 무영향: 벽감은 셀라 벽 '안쪽면'을 파는 것이라 |k|≥3
//  차단 벽체는 그대로 선다). 세 어법을 스위치로 로컬 비교(현도 "여러가지 구현해서 선택").
//   'trapezoid' — 사다리꼴 벽감열(잉카·마야 사원 어법 — 위로 좁아지는 감실). 리브 사이 4곳 정렬.
//   'rect'      — 직사각 벽감열(브루탈 모더니즘 리듬 — 잉카 계단과 동계). 리브 사이 4곳 정렬.
//   'strata'    — 수평 지층(벽감 대신 깊이 다른 수평 띠 3층 — 차분한 지층감).
//   'off'       — 벽감 없음(구 평벽 복원).
// ── ★㊸ 셀라 배경 어법 스위치(2026.07.21 현도) ──
//  'intaglio' — 사다리꼴 음각(안 뚫는 얕은 파임 — 동벽 안쪽면에서 DEPTH만 우묵, 벽 두께 CELLA_T 안).
//  'relief'   — 사다리꼴 양각(벽면에서 안쪽으로 튀어나온 부조 — 파는 게 아니라 더한다).
//  'rect'     — 직사각 음각열 · 'strata' — 수평 지층 3층 · 'off' — 평벽.
//  ⚠음각 DEPTH는 벽 두께(CELLA_T=2) 미만이라 뒤로 안 뚫는다(현도 "벽을 뚫지 말고"). 구 5(관통)는 폐기.
export const CELLA_NICHE      = 'intaglio'        // ★어법 스위치 — intaglio(음각) / relief(양각) / rect / strata / off
export const CELLA_NICHE_DEPTH = 2              // 음각 파임 깊이(< 벽 두께 2 = 뒤로 안 뚫음. 현도 요청)
export const CELLA_RELIEF_OUT  = 3.0              // 양각 돌출 깊이(벽 안쪽면에서 홀 방향으로 튀어나옴)
export const CELLA_NICHE_Y0    = 14               // 벽감 하단 y(바닥에서 띄움 — 기단 어법)
export const CELLA_NICHE_Y1    = 96               // 벽감 상단 y(지붕 밑 114 아래 여유 18)
export const CELLA_NICHE_WBOT  = 11               // 벽감 하부 폭(z방향) — 최외곽 벽감(z±37.6)이 리브 #±2 구멍(z±50, r6.4)과 무병합(가장자리 43.1 < 43.6, 검증 R절)
export const CELLA_NICHE_WTOP  = 6                // 벽감 상부 폭(사다리꼴 — 위로 좁아짐. rect는 WBOT 사용)
export const CELLA_STRATA_N    = 3                // strata 전용 — 수평 층 수
// ── ★㊸ 리브 받침 제단(2026.07.21 현도 — "경선리브 받치는 제단, 직사각 계단 2장, 신전 입구같이") ──
//  다섯 리브 밑동을 가로지르는 넓은 신전 기단. 직사각 계단 2장(하단 넓음·상단 좁음 = 물러남).
//  리브 열 전체 폭(z ±56 커버) · 서쪽(진입로)으로 계단이 펼쳐져 관람자가 오르는 신전 정면.
//  ⚠높이 낮게(총 8) — 넥서스(38.2)·다섯 날 뿌리보다 한참 아래라 무간섭(검증 R2절).
//  두 받침 범위 스위치: 'ribs'(다섯 리브 밑동만) / 'unified'(넥서스까지 서진 = 구조물 전체 기단).
export const ALTAR_ON       = true                // 제단 스위치
export const ALTAR_SCOPE    = 'ribs'              // 'ribs'(리브 열만) / 'unified'(넥서스까지 통합)
export const ALTAR_ZHW      = 58                  // 제단 z 반폭(리브 열 ±56 + 여유 2 = 다섯 다 덮음)
export const ALTAR_X_BACK   = 296                 // 제단 동쪽 끝(리브 밑동 뒤 x — 리브 #0 바깥 294 + 2)
export const ALTAR_STEP1_X  = 268                 // 하단(넓은) 계단 서쪽 끝 x — 진입로 쪽
export const ALTAR_STEP2_X  = 276                 // 상단(좁은) 계단 서쪽 끝 x(하단보다 물러남 = 2장 단차)
export const ALTAR_STEP1_H  = 4                   // 하단 계단 높이(y 0~4)
export const ALTAR_STEP2_H  = 4                   // 상단 계단 높이(y 4~8) — 총 8 < 넥서스 38.2
export const ALTAR_UNI_XW   = 208                 // unified 시 서쪽 끝(넥서스 214.6 살짝 서쪽 = 구조물 전체 받침)
export const ALTAR_COLOR    = '#c2a062'           // 톤 노브(계단 어휘 공유 — 잉카 판 색)
// ── ★㊹ 바닥 동심 기단(2026.07.21 현도 — 공간 완성도 갈래 ②: 넥서스 중심 낮은 원형 단으로 바닥에 결) ──
//  드럼 바닥(반경 84)을 여러 겹 낮은 동심 원형 단으로 → 다섯 날이 '기단 위에 선' 인상. 잉카 기단 어법.
//  두 스위치(현도 "둘 다 구현"): 중심 = 'drum'(204, 공간 정렬) / 'nexus'(214.6, 구조물 정렬).
//  단면 = 'peak'(중앙 높고 밖 낮음 = 봉우리) / 'ring'(중앙 평평·테두리만 계단). 겹·반경·높이 = 노브.
//  ⚠총 높이 < 넥서스(38.2)·제단(8) — 다섯 날 뿌리 한참 아래(R3절). walkable.
export const TIER_ON        = true                // 스위치
export const TIER_CENTER    = 'drum'              // 'drum'(204) / 'nexus'(214.6)
export const TIER_PROFILE   = 'peak'              // 'peak'(중앙 높음) / 'ring'(중앙 평평)
export const TIER_N         = 7                   // 겹 수(노브 — 현도 "3개보다 많이", 촘촘히)
export const TIER_RMAX      = 46                  // 최외곽 반경(노브 — 드럼 절반 ~46, 벽 84 안 넉넉)
export const TIER_RISE      = 0.7                 // 단당 높이(노브 — peak: 안쪽부터 누적, 총 = N×RISE)
export const TIER_COLOR     = '#c2a062'           // 톤 노브(잉카 판·제단 어휘 공유)

// ── ★ 큰 홀 곡면 벽 — 기어형 피어(전략 4, 2026.07.21 결정 → 현도 "그나마 4번" → 07.22 "반지름으로 돌출 = 기어") ──
//  드럼 측벽·뒷벽(창 ±43°·박스 문 회피)에 수직 슬래브가 벽을 '가로질러' 안팎으로 돌출:
//   안쪽(PIER_DEPTH) = 홀에서 보는 피어/베이 · 바깥쪽(PIER_OUT) = 드럼 밖으로 튀어나온 톱니 → 위에서 보면 기어(cog).
//  슬래브 = 곧은 수직 매스(리브 아님 — 굵고 곧고 접지 = ㉯). 지면 → 천장(+OVER, 무틈)까지 = 전고 톱니.
//  ⚠기어 = 기계 어법(신전 언어와 톤 다름) + 바깥 돌출이 창 근처 리브에 닿을 수 있음 — 현도 조감 판정·P2 재판정.
//  ⚠형태 미확정. 전부 노브(폐기 = PIER_ON). 안쪽만 원하면 PIER_OUT=0, 바깥만(순수 기어) 원하면 PIER_DEPTH=0.
export const PIER_ON      = true
export const PIER_N       = 8      // 톱니 수(짝수 — 뒤 180° 기준 좌우 대칭 쌍). 창(±43°)·문(180°) 회피
export const PIER_HW      = 7      // 톱니 반폭(접선, 유닛) — 전폭 14
export const PIER_DEPTH   = 9      // ★안쪽(홀 방향) 돌출 깊이 — 내부 피어/베이. 0이면 안쪽 없음
export const PIER_OUT     = 10     // ★바깥쪽(드럼 밖) 돌출 깊이 — 기어 톱니. 0이면 바깥 없음. ⚠크면 창 근처 리브에 닿을 수 있음
export const PIER_Y0      = 0      // 밑동 = 지면(벽 기립선). 전고 톱니(대안: 판 레벨로 올림)
export const PIER_TOP_OVER = 4     // 상단을 천장 위로 살짝 넘겨 내부 무틈(우뚝 솟는 기둥 아님 = 지붕 높이 톱니). 조감 P2
export const PIER_COLOR   = '#a98f5e'  // 톤 — 제단·소구 셸과 동일 계열(한 어휘, P2 재판정)

// ── ★ 빛 흡입구(Light Intake, 2026.07.22 — 티켓 1장 소모: 잔여 2→1) ──
//  빗면 천장 중앙부(INTAKE_CX) 개구 + 그 위 흡입 구조물. 5갈래 계단에서 올려다볼 때 외부 리브(스포)가
//  안 보여야 함(조건 1) → 상단 캡으로 위상 폐쇄: 어느 각도든 시선이 구조물 내벽·캡에서 끝난다.
//  진짜 빛 = P2. 지금은 캡 밑 발광면(임시 광원 = 빛을 약속하는 기구). 어휘 = 정점 렌즈의 사촌(광학기구).
//  ⚠구조물이 지붕 위로 솟아 리브에 닿을 수 있음(RISE·LAYERS로 조절) — 캡 봉인은 높이와 무관하게 성립.
//  형태 스위치(로컬 비교 — 현도 "구현 보고 판정"):
//   [기구형] 'b1' 사각 겹칼라 · 'b2' 원형 겹칼라(현도 잠정 선호) · 'b3' 회전 겹칼라 · 'funnel' 깔때기
//   [슬릿형] 'slit' 직선 한 줄 · 'slits' 평행 여러 줄 · 'arc' 원호(반원) · 'ring' 완전한 고리
//   [갓]     'gat' — ★현도 스케치(07.22): 원뿔 양태 + 크라운 + 얇은 기둥 + 리드, 그 사이 링 슬릿(천장 대체)
//  ★슬릿형 = 좁고 긴 개구 → 빛이 띠로 길게 퍼진다. 챔버(벽+뚜껑)는 지붕면에 평행 오프셋으로 얹혀
//   높이 일정(기구형의 수직벽·평뚜껑과 달리 홀 안으로 처지는 립이 없음). 봉인 원리는 동일 = 뚜껑.
export const INTAKE_ON      = true
export const INTAKE_FORM    = 'gat'     // 'gat'|'b1'|'b2'|'b3'|'funnel'|'slit'|'slits'|'arc'|'ring'
export const INTAKE_CX      = COR_CX    // 개구 중심 x(빗면 중앙 204. 넥서스 위 정렬 원하면 incaBladesSpec().ncx≈214.6로)
export const INTAKE_HOLE_HW = 13        // 천장 개구 반폭(b1/b3 사각) · 반경(b2/funnel 원). 구조물 base가 이 가장자리를 덮음
export const INTAKE_LAYERS  = 3         // 겹칼라 켜 수(b1/b2/b3)
export const INTAKE_RISE    = 10        // 켜당 높이(지붕 위로 오름)
export const INTAKE_SETBACK = 3.2       // 켜당 후퇴(위로 좁아짐 — 지구라트). ⚠ < WALL_T 여야 켜가 이어져 솔리드
export const INTAKE_WALL_T  = 3.4       // 켜 벽 두께(굵게 = ㉯ 준수, 얇은 살 금지)
export const INTAKE_FUNNEL_DROP = 34    // 깔때기 홀 낙하 깊이(나팔 입 y = 천장−이만큼. 잉카 정상 77 위 여유)
export const INTAKE_FUNNEL_RB   = 24    // 나팔 입(아래) 반경 — 크게 벌어짐
export const INTAKE_COLOR   = '#a98f5e' // 톤(기어·제단 동계)
export const INTAKE_GLOW    = '#ffe9b8' // 임시 발광면(캡 밑 — P2 진짜 빛으로 승격)

// ── 슬릿형 노브('slit'|'slits'|'arc'|'ring') ──
//  챔버 깊이 = INTAKE_RISE(지붕면에 평행). 좁을수록 빛이 '금 간 틈'처럼, 넓을수록 '띠'처럼 읽힌다.
export const SLIT_W       = 8      // 슬릿 폭(직선형 = x폭 · 원호/고리형 = 반경 방향 폭)
export const SLIT_LEN_F   = 0.72   // 직선 슬릿 길이 = 그 x에서 드럼 현 길이의 이 비율(1이면 벽까지)
export const SLIT_N       = 3      // 'slits' 줄 수(홀수면 중앙 정렬)
export const SLIT_GAP     = 26     // 'slits' 줄 간격(중심거리 — SLIT_W보다 충분히 커야 띠가 분리)
export const SLIT_R       = 44     // 'arc'|'ring' 중심 반경(드럼 반경 84 안. 클수록 벽 가까이 = 빛이 벽을 씻음)
export const SLIT_ARC_DEG = 180    // 'arc' 벌림각(180 = 반원). 중심 방위는 아래
export const SLIT_ARC_MID = 0      // 'arc' 중심 방위(도, 0 = +x 리브 쪽 = 다섯 날 위를 지나는 호)

// ── ★ 갓 지붕(GAT — 현도 스케치 2026.07.22 + 수정 5건) ──
//  기존 평평한 빗면 천장을 '갓'이 대체한다(현도 확정 ①): 드럼 림에서 ★각진 양태(각뿔대)가 올라가 중앙
//  크라운(수직 원기둥)에 닿고, 크라운 위를 ★원기둥 얇은 기둥들이 ★수평 리드를 떠받쳐 그 틈이 빛 개구.
//  빛: 링 슬릿 → 크라운 통 → 홀. 홀에서 올려다보면 각진 천장이 밝은 원(크라운 우물)으로 수렴한다.
//  ★수정 반영(07.22): ①기둥 = 원기둥 ②리드·처마 = 지면과 평행(수평) → 절단면은 빗면 평행이라 기둥 길이가
//   방위마다 다름 ③양태 = 각뿔대(패싯) ④크라운을 서쪽(정의·공리 방 방향 = 낮은 쪽)으로 이동 ⑤크라운 낮춤.
//  ★밸런스 재조정(현도 07.22 "균형감이 무너졌다"): 원인 = 수평 리드 + 기울어진 절단면이면 서쪽 틈이
//   크게 벌어져(쐐기) 얕은 시선이 새고, 그걸 막느라 처마가 크라운의 2.6배(리드 46.7 : 크라운 18)까지
//   커져 '접시 얹은 꼴'이 됨. → 절단면도 수평('level')으로 통일하니 요구 처마가 4.7로 떨어져
//   크라운 26 / 리드 31.4 = 비율 1.21(갓 비례)로 회복. 기둥 길이도 전 방위 균일해져 정렬이 맞는다.
export const GAT_SEAT     = 'wall'  // 양태 안착: 'wall'(벽 top=천장 — 틈 0, 피어가 지붕 관통) | 'pier'(피어 top — 벽 상향 필요)
export const GAT_CX       = COR_CX - 16  // ★크라운 중심 x(서쪽 = 정의·공리 방 방향 — 현도 ④). 이동량 < 크라운 반경 = 치우침이 과하지 않게(밸런스)
export const GAT_CROWN_R  = 26      // 크라운 반경 — 지붕 반경 84의 31%(스케치 비례 회복). 수평 절단면이라 이 크기로도 봉인됨
export const GAT_CONE_H   = 18      // 양태 상승: 림(천장) → 크라운 밑동. 'level'에선 '크라운 링 최고 지붕점' 기준(밑동이 수평 링)
export const GAT_CROWN_H  = 10       // ★크라운 벽 높이 — 밑동·절단면이 모두 수평이라 전 방위 균일(현도 07.22 판정값 10 — 갓 정수리 y203.3 = 동쪽 림 202 위로 솟음)
export const GAT_SLIT     = 5       // 링 슬릿 높이 = 기둥 길이('level'이면 전 방위 균일)
//  ⛔폐기: 밑동·절단면을 빗면 평행으로 두는 안('tilt', 현도 ② 최초 해석) — 수평 리드와 어긋나 슬릿이
//   쐐기(동 4 ~ 서 21)가 되고, 그걸 막을 처마가 리드/크라운 2.68까지 커져 '접시 얹은 꼴' + 양태와 충돌.
//   현도 07.22 반려 → 밑동·절단면·리드를 전부 수평으로 통일(아래). 되살리려면 이 수치부터 다시 풀 것.
export const GAT_FACETS   = 10      // ★양태 패싯 수(각뿔대 — 원뿔 아님, 현도 ③). 적을수록 각짐이 뚜렷. 모서리가 벽·크라운 원에 외접해 틈 0
export const GAT_POSTS    = 16      // 얇은 기둥 수
export const GAT_POST_R   = 1.2     // ★기둥 반경(원기둥 — 현도 ①)
export const GAT_LID_T    = 3.5     // 리드(갓 윗면) 두께
export const GAT_EAVE_MIN = 4       // 처마 최소치(미적 하한)
export const GAT_EAVE_SF  = 1.15    // 봉인 안전계수(수치해 위에 얹는 여유)

// ── ★잉카 계단(INCA, ㊶-5 2026.07.20 현도 스케치) — 통로 재건축의 첫 조각: 드럼 바닥 → 리브 #0 ──
//  반지름 방향(z=0, +x) 단일 계단. 잉카·마야 사원 어법 = 바닥까지 꽉 찬 계단식 돌 매스(각 단이 지면까지
//  내려가는 상자 적층 — 디딤·삼각 지지벽이 한 몸). 난간 없음. 구 진입계(다리·제단·계단 다섯)는 'descent'
//  스위치 뒤 보존 그대로 — 이 계단이 그 역할을 '대체'(1p5 재배치의 새 담지체 후보, 여정 접속은 열린 결정).
//  높이 원안 = 창에 보이는 리브(CEIL_HI 202)의 3/5 ≈ 121 → 프리즈 하단(114) 충돌 발견 →
//  ★현도 결정 (b): 정상 = 프리즈 밑 −4 = 110. 정상에 서면 머리 위 여유 2.2 — 박스 압축이 정점에서 재현된다.
//  경사 = 35°(현도: "사람이 올라갈 수 있을 정도" = 보행 상한). 이보다 눕히면 발치가 드럼 서벽(120) 밖 → 35°가 유일해.
//  ★㊶-6 수정(현도): ① 정상 30% 감(110→77 — (b) 프리즈 앵커 폐기, 직접 노브화. 우연히 구 RIB_Y 74 근방 복귀)
//  ② 하부 수직 절단 — 절단 높이 아래(서쪽) 단 전부 제거 → 옆면 = 지면에 선 '사다리꼴'(동쪽 매스는 접지 유지,
//  서쪽 끝 = 평평한 수직 절단면). 계단은 공중에서 시작 = 지면에서 오를 수 없다. ③ 절단부에 '수평 부양 판'
//  (구 계단 다섯의 판 어휘 계승) — 진입 판. 부수 귀결: 발치 동진(x≈172)으로 소구 밑 통과 사건은 소멸.
export const INCA_ON      = true                                 // 스위치
export const INCA_TOP_Y   = 77                                   // ★정상 높이 노브(㊶-6: 110의 70%) — 프리즈(114) 아래 넉넉
export const INCA_SLOPE   = Math.tan(35 * Math.PI / 180)         // 경사 35° — "사람이 올라갈 수 있을 정도"(현도) 유지
export const INCA_END_X   = R_BASE - SHELL_RIB_R                 // 동단 = #0 서면 282 (닿는 리브는 #0 하나 — 1p5 불변)
export const INCA_BITE    = 0.3                                  // 리브 물림(이음 슬리버 방지)
export const INCA_X0      = INCA_END_X - INCA_TOP_Y / INCA_SLOPE // 가상 발치 ≈172.0 (절단 전 삼각형 꼭짓점 — 파생)
export const INCA_CUT_Y   = 38                                   // ★절단 높이 노브(㊶-6 현도 "더 높게" — 정상의 약 절반. 실절단은 단 격자 스냅)
export const INCA_W0      = 3.4                                  // 발치 폭(구 STAIR_W 계승 — 좁게)
export const INCA_W1      = 3.4                                  // ★정상 폭 노브 — 현도 "점점 넓게 생각 중": W1>W0이면 사다리꼴 평면
export const INCA_TD      = 0.8                                  // 디딤 깊이 목표 — 단수·실치수는 빌더 파생(정상 정확 도달)
//  ★㊶-7(현도 스케치 2): ① 매스 하부를 '위로 볼록' 곡선으로 파냄 — 접지 스트립 뒤 곡선이 리브 서면
//  높은 접점(ARCH_Y1)까지 상승 = 아치 보이드. 리브 밑동이 자유로워진다(계단은 위에서만 리브를 만남 —
//  LOCKED 우호). 곡선 어휘 = ㊵ 목 스커트와 동일(위로 볼록). ② 판 6배(48×10×2) — 밑면도 폭 전체를
//  가진 곡면(코벨 아님, 현도)이 서면으로 흘러듦. ③ 브루탈리즘 터치: 곡면을 굵은 다면(FACETS)으로
//  각지게(균질광 아래 음영 판 분절 — 노출콘크리트 껍질 어법) + 판 서단 모따기(CHAMF).
export const INCA_ARCH_X0 = 240                                  // ★곡선 발 x(노브) — 절단면(≈226.6)과의 사이 = 접지 스트립
export const INCA_ARCH_Y1 = 65                                   // ★리브 접점 높이(노브) — 정상(77) 아래 웨브 12
export const INCA_FACETS  = 6                                    // ★브루탈 다면 분할(노브) — ↑부드러움 ↓각짐(4 하한)
export const INCA_CHAMF   = 0.6                                  // ★판 서단 모따기(노브, 0 = 끔)
export const INCA_PANEL_L = 20                                   // ★진입 판 길이(㊶-8 재정정: 48→20 — "크기 줄이고 가로 우세로")
export const INCA_PANEL_W = 5                                    // ★판 폭(㊶-8: 10→5 — 가로:세로 4:1, 계단 폭 3.4보다 한 뼘)
export const INCA_PANEL_T = 2                                    // ★판 서단 두께(육중한 슬라브 유지)
//  ⚠㊶-8(현도): 판 밑곡면은 서면 중턱(구 ROOT_F)이 아니라 '바닥까지' — 곡선 종점 = 절단면 발(지면).
//  판 = 접지 곡면 콘솔이 된다(ROOT_F 노브 폐기).
// ── ★㊷ 다섯 날(2026.07.21 현도 스케치 — 반십각 넥서스 + #±1·±2 날 4) ──
//  1p5 귀류의 완성: 다섯 갈래가 다섯 리브로 뻗지만 #0 하나만 닿는다. 넷은 밑곡선이 '끝까지' 이어져
//  칼끝으로 소멸 — 리브 면 INCA_GAP 앞 허공에서 끊긴다("갈 곳이 없어서"의 직역, 문은 소등 유지).
//  넥서스 = 반십각 부채: 서쪽 폐합 = 중심 지름(문자 그대로 '절반'), 다섯 변의 법선 = 리브 방위 스냅
//  (현도 확정 ㊷ — 정십각 등각 36°는 리브 실방위 스팬 ±35.9°와 어긋나 기각). 중심 x = 절단면 − R(파생)
//  → 동변이 곧 #0 절단면 = 현행 잉카 계단이 무수정으로 중앙 변에서 출발.
export const INCA_NEXUS_R = 12     // ★넥서스 반지름 노브 — 다섯 날 폭(3.4)이 변마다 앉을 하한 ≈11
export const INCA_TIP_Y1  = 60     // ★#±1 팁 높이(현도 승인 — 삼각형 중간. #0 정상 77이 꼭짓점)
export const INCA_TIP_Y2  = 45     // ★#±2 팁 높이(현도 승인 — 최저. 45<60<77 = 팁 삼각형 단조)
export const INCA_GAP     = 5      // ★팁 ↔ 리브 면 간극("대략 5" 현도) — 못 닿음의 거리(1p5)
export const INCA_TIP_T   = 0.15   // 팁 최소 두께 — 0이면 퇴화 폴리곤. 밑곡선은 두께 프로파일로 구성돼
                                   //  전 구간 (디딤 − 밑곡선) ≥ 이 값이 수학적으로 보장된다(빌더 주석)
export const INCA_EMBED   = 0.6    // 날 뿌리(서면)가 넥서스 발자국 안으로 파고드는 깊이(이음 슬리버 방지)
export const INCA_COLOR   = '#b89a6a'                            // 톤 노브(기본 = 드럼 석재)
// ── 길 ──
// ★플랫폼 위치 노브(㊲) — f = 홀 안 위치(0=홀 진입 120 · 1=리브 밑동 288). 안전범위·경사표는 구 주석(로그) 참조.
export const PLAT_F = 0.4                           // ★위치 노브 — 0.4 → x187.2
export const PLAT_X = COR_CYL_X0 + PLAT_F * (COR_X1 - COR_CYL_X0)   // f=0.4 → 187.2
// ── ★㊴-5 진입 시퀀스 복원(드럼 복원의 귀결): 짧은 다리 → 긴 하강 계단 → 깊은 제단 ──
//  ★㊵-4 재앵커: PLAT_DROP은 보행 기준 상대치라 부양과 무관하게 살아남는다 — 제단 상면 = COR_Y0−18+0.3 = 83.5.
//  ⚠구 나팔의 '사면 플러시 매몰' 제단은 드럼과 함께 소멸. 계단 다섯 경사는 새 제단고(83.5)로 재유도(빌더 스펙).
export const PLAT_DROP    = 18             // ★제단 강하 깊이(㊴-5) — 노브
export const PLAT_Y       = COR_Y0 - PLAT_DROP   // 판 중심 y = 83
export const COR_CLIMB    = RIB_Y - PLAT_Y // #0 총 '상승'(파생) = −9 — ★㊵-4: 제단(83)이 문턱 위라 다섯 중 셋(−2·0·+1)은 하강
export const DESC_X1 = PLAT_X - PLAT_R + 1.0        // 하강 끝 = 플랫폼 서쪽 림 +1 물림(f=0.4 ≈180.2)
export const DESC_X0 = BOX_X1 + 5                   // ★㊴-5 하강 시작 = 박스 출구 +5(=129) — 다리는 입구 직후 끝
// ══ ★★㊵-5 진입 개편(2026.07.20 현도 스케치 '접합부 신설'): 상승 +10 → 부양 소구(막다른 방) ══
//  스위치: 'asc-sphere'(신 — 다리 → 상승 계단 → 착지 → 소구) / 'descent'(구 ㊴-5 하강·제단·계단 다섯 복귀).
//  구 하강계는 제거가 아니라 잠금 — 코드·빌더·검사 전부 보존("잠깐 치워 둠", 현도).
// ══ ★★㊾ 하강로(2026.07.23) — 소구 폐기 + 두 체제 비교 구현(현도 ⓑ "둘 다") ══
//  배경: ㊵가 방 복합체를 +52 띄우며 접합 레벨을 49→101로 올렸으나 **드럼 바닥은 지면(0)에 남았다**.
//   홀의 사건은 전부 하반부(잉카 판 38.2·리브 문 74)에 있고 진입만 상반부로 들어와, 그 사이 수직 63이
//   비어 있었다. 소구(x150 부양 구)는 "도착은 했다"를 만든 임시 정합이자 막다른 방이었다 → 폐기.
//  ⚠폐기 = **경로에서 제거**이지 코드 삭제가 아니다(구 'descent' 전례). HALL_ENTRY를 되돌리면 복원된다.
//  두 체제(현도가 로컬 보행으로 판정):
//   'axial'   — 축(z=0) 곧은 계단 하나. 짧고 가파르고 정면. 다섯 갈래가 정면으로 펼쳐진다.
//   'lateral' — 남/북 벽을 따라 도는 호 + 대각 진입. 길고 완만하고 측면. 홀 크기를 걸음으로 재게 된다.
export const HALL_ENTRY   = 'lateral'   // 'lateral' | 'axial' | 'asc-sphere'(구·소구) | 'descent'(구)
export const DESC_HW      = 2.5    // ★보행로 반폭(판 폭 = 2×) — ★현도 07.23 조정(3.0→2.5)
export const DESC_SIDE    = 1      // ★도는 방향: −1 = 남 / +1 = 북 — ★현도 07.23 조정(남→북)
export const DESC_R       = 76     // ★반경(노브) 56~78 — 벽에서 뗀 거리 = COR_R − 이 값. 작을수록 가파르고 벽을 덜 쓴다
export const DESC_SWEEP   = 60     // ★★회전량(노브, °) 40~110 — ★현도 07.23 조정(90→60). 상한 주석 필수 확인
//  (웨이포인트 `view` = 벽 호 중간 자동 추종 — 회전량·방향을 바꾸면 구도점도 따라 움직인다.)
//  ★회전량 안전 범위 = 40°~110°(실측). 넘으면 대각선이 다섯 날 밑으로 파고든다:
//    45°→날 여유 8.0 · 70°→8.0 · 90°→8.0 · 110°→7.6 ✔ | 135°→5.8 · 160°→0.2 ✗
//   경사(등경사 분할)는 45°→24.5° · 70°→20.3° · 90°→17.8° · 110°→15.9° — 전 구간 35° 이하.
//   리브 #0·#±1은 벽 안으로 6·3.4 침입하지만 방위 0°·±5°라 110°까지는 호가 만나지 않는다.
export const DESC_SWEEP_MAX = 110  // 하드 상한(검증이 강제 — 여기 넘기면 스위트가 실패한다)
//  ⚠★51 꼬리별 실용 범위(스윕 실측 07.23): 'chord' = 40~110 전부 green / 'sweep' = **40~90**.
//   90 초과 시 벽 호 끝 B가 판 서단보다 동쪽으로 넘어가(경계: cos ph₁ < 2.6/76 → sweep ≈ 92°)
//   쌍원호가 되감는 갈고리(R≈2, 표본 꺾임 20°)가 되며 C2 [접선 연속] 검사가 잡는다.
export const DESC_SWEEP_MIN = 40   // 하한(이하면 호가 '도는 몸짓'이 아니라 꺾임 한 번)
// ══ ★51 접선화(2026.07.23 — 현도: "참 블록 투박·의미 없음" + "대각 직선 별로") ══
//  참(블록·평탄) 전면 폐지 — 매듭을 다듬는 게 아니라 **꺾임 자체를 없앤다**(§2-D ③ 예외의 실현:
//  기하와 맞물리지 않는 매듭은 매듭이 아니라 혹이다). 전 구간 접선 연속:
//   진입·꼬리 둘 다 쌍원호(biarc — S자 두 원호)가 방향 전환을 흡수. C2절이 표본 단위 연속성을 강제.
//   ⚠단일 접원(필렛) 진입은 성립 불가(★51-2 실측): 북행 궤도 = 시계 방향인데 동진→좌회전 접원은
//    반시계라 내접 회전 방향이 어긋나 263° 장회전(전장 560) 버그 — 쌍원호만이 반전을 담는다.
export const DESC_TAIL    = 'sweep'  // ★★'sweep' = 쌍원호 S — 벽 호 접선 그대로 갈라져(안쪽 감김 → 반전 펴짐)
                                     //   판 서단에 +x 정렬로 도착. 'chord' = 구 대각 직선(비교 보존 — 코너 1).
export const DESC_ENTRY_AZ = 16      // ★진입 쌍원호가 소모하는 벽 방위(°) — 회전량(DESC_SWEEP)보다 작아야 한다

// ══ ★53 피어 관문(2026.07.23 — 현도 아이디어: "겹침을 지지로 승격") ══
//  ㊼ 기어 피어(안쪽 돌출 9 → 안면 반경 75)와 하강로(바깥 모서리 78.5)는 반경 3.5 겹친다 — 우연이
//  아니라 기하의 귀결. 이를 버그가 아니라 장치로: 교차부 **위**는 피어를 높은 입구로 관통(문),
//  **아래**는 피어 몸이 남아 보를 파묻어 받친다(교각). 같은 피어가 문이자 교각 — 새 부재 없이
//  §2-D ①(뿌리)이 선다. 관통 피어는 자동 검출(descentPortSpec) — 회전량·방향을 돌리면 관문도
//  따라간다. 현행 기본(북·60°) = P0⁻(az160)·P1⁻(az125) 두 곳(현도 스크린샷의 그 둘).
export const DESC_PORT_ON  = true
export const DESC_PORT_H   = 9      // ★입구 높이(보행선 위 정점) — "높은 입구". 머리 1.8의 5배
export const DESC_PORT_TOP = 'arch' // ★상단: 'arch' 반원(스케치의 어깨 곡선) | 'flat' 사각 — 로컬 판정
export const DESC_PORT_CLR = 1.8    // 계단 바깥 모서리 너머 어깨 여유 — 입구 반폭 = DESC_HW + 이 값
//  ⚠컷 밑면 = 보행선 − 0.35(하드): 디딤 판(0.43)이 0.08 파묻혀 통과 = 문턱 틈 없음. 그 아래 피어는
//   보(깊이 2.6)를 2.25 파묻는다 = 받침의 물림(잉카 융착 어휘 — 이음새가 구조적으로 없다).
//  ★★단높이 천장. 디딤을 홀 어휘(STAIR_DS 1.05)로 고정하면 축 체제(37.4°)의 단높이가 **정확히 0.80**이 되어
//   FirstPersonControls의 `STEP_UP`(0.8)과 같아진다 = 내려는 가는데 **되돌아 올라올 수 없다**(㊾ 실측).
//   → 빌더가 디딤을 경사에서 역산해 단높이를 이 값 이하로 잠근다. 올리면 계단이 성큼해지고 0.6 넘으면 위험.
export const DESC_RISE_MAX = 0.55  // 단높이 상한(STEP_UP 0.8에 0.25 여유) — 검증 C2절이 강제
// ══ ★㊿ 하강로의 몸(2026.07.23 — 건축 마감 문법 §2-D의 첫 시범작) ══
//  ㊾의 판 183장은 셀프 렌더 검수에서 "색종이 행렬"로 자가 반려(현도 지적과 일치 — 몸·뿌리·매듭 부재).
//  몸 = 폴리패스를 따라 스윕한 **속 찬 굽은 보(스트링거)**: 상면 = 보행선 − TOP(판이 0.13 융착),
//  단면 = 사다리꼴(하면 좁힘 = 챔퍼 어휘). ★51: 참 블록 폐지(현도) — 접선 연속이 매듭을 대체.
//  ⚠㊴-7 리본 반려와 다름: 그때 죽은 건 CR 곡률의 얇은 보행면. 이건 확정 폴리패스 위의 구조 부재.
export const DESC_GIRDER     = 2.6   // ★보 깊이(노브) — 판(0.43)의 6배 = 멀리서도 '몸'으로 읽히는 하한
export const DESC_GIRDER_TOP = 0.30  // 보 상면 = 보행선 − 이 값. 판(두께 0.43)이 0.13 파묻힘 = 융착(틈·z파이팅 없음)
export const DESC_GIRDER_BWF = 0.62  // 하면 폭 비(0~1) — 사다리꼴 배. 1이면 각재(투박), 0.5 이하면 용골(과함)

export const ORB_OPEN     = true                     // ★㊶-4(현도): 동캡을 '유리'가 아니라 '뻥 뚫린 개구'로 — 반투명 재질(알파 블렌딩·오버드로우)이
                                                     //  렉 원인이라 재질을 얹지 않고 동쪽 셸을 CSG로 제거. 조종석 시야(다섯 리브)는 유지, 렉은 소멸.
                                                     //  ⚠구 ORB_GLASS(유리/불투명 스위치)는 폐기 — 유리 모드가 없어져 불필요. 개구는 상시(테가 경계 마감).
// ── 소구(ORB — 진행 경로 위 부양된 작은 구. 서쪽 아치 문 하나·내부 수평 바닥·막다른 방) ──
//  ★★㊵-5c(현도 확정): 소구를 접합부 쪽(150)으로 당김 + 다리 폐지(상승 계단이 박스 출구서 바로).
export const ORB_R        = 14                       // ★반지름(노브) — 방(64)의 1/4.6
export const ORB_CX       = 150                      // ★㊵-5c 접합부 쪽 이동: 168→150 — 구 서단 136(드럼 서벽 120 +16). 하한 ≈136
export const ORB_DROP     = 3.5                      // 구 중심이 바닥 위로 — 바닥 = 중심 아래 현(원반이 넓어짐)
export const ORB_FLOOR_R  = Math.sqrt(ORB_R * ORB_R - ORB_DROP * ORB_DROP)  // 바닥 현 반경 ≈13.55
export const ORB_WEST_X   = ORB_CX - ORB_FLOOR_R     // 문턱면(서쪽 외피가 바닥 높이를 지나는 x) ≈136.4
// ── 상승 계단(다리 없음 · 박스 출구 직결 · 보행 경사) — 상승고는 '주행 × 경사'로 파생 ──
export const ASC_SLOPE    = 0.50                     // ★보행 경사 목표(노브) ≈26.6° — 상한 35° 안. 작을수록 완만
export const ASC_X0       = BOX_X1                   // ★상승 시작 = 박스 출구(다리 없음 — 현도). 주행 = 문턱면 − 여기
export const ASC_RISE     = (ORB_WEST_X - ASC_X0) * ASC_SLOPE   // 상승고 파생 ≈6.2 (구 노브 10은 소구 서진으로 자리 부족)
export const ASC_X1       = ORB_WEST_X + 1.2         // 상승 끝 = 문턱면 +1.2 물림(착지 없음 — 계단이 문에 꽂힘)
// ── ★㊵-5d 상승 밀폐 통로(현도: "접합부→소구 입구, 외부 안 보이게"): 박스 ㄷ′ 압축의 연장 = 오르는 목구멍 ──
//  측벽(z=±BOX_HW, 디딤 아래 ASC_TUN_DEPTH 내려 측면 시선 봉합) + 경사 천장(디딤 위 내부고 BOX_IN_H 유지 —
//  압축이 소구 문까지 이어져 구 안에서 해방) + 동단 = 소구 외구면으로 CSG 절단(아치 문만 열림) + 서단 = 박스에 1 물림.
//  디딤판은 통로 전폭(BOX_HW×2)으로 — 디딤 옆 바닥 틈(구 반폭 2.5)으로 드럼 허공이 보이던 것을 막음.
export const ASC_TUN_T     = COR_THICK               // 셸 두께(박스 어휘 공유)
export const ASC_TUN_UNDER = 2.0                     // ★㊵-5f 배 두께: 보행선 아래 솔리드(디딤 0.6 + 배 1.4) — 밑면까지 닫힌 각관
export const ASC_TUN_DEPTH = ASC_TUN_UNDER           // (구 명칭 호환 — 검사 참조)
// ── 소구 나머지(상승고 파생 뒤 정의) ──
export const ORB_FLOOR_Y  = COR_Y0 + COR_THICK / 2 + ASC_RISE   // 바닥=문턱=착지(같은 높이, 현도) — 상승고만큼만 오름
export const ORB_CY       = ORB_FLOOR_Y + ORB_DROP   // 중심 y — 저점 = CY−R (허공 — 드럼 안 부양)
export const ORB_T        = 0.8                      // 셸 두께
export const ORB_DOOR_W   = 5                        // 아치 문 폭(다리 폭 = COR_FLOOR_HW×2와 동치)
export const ORB_DOOR_H   = 7                        // 아치 문 높이(문턱 기준 — 상부 반원 포함)
// ── 유리 캐노피(조종석): 경선리브 방향(+x) 구면 캡 = 유리. 창살 배제(리브 어휘 보호), 경계 원형 테 하나 ──
export const ORB_OPEN_F   = 0.28                     // ★컷 위치(노브, 0~1) — 작을수록 개구가 넓어짐. 0.28 → 캡 반각 ≈73.7°
export const ORB_OPEN_X   = ORB_CX + ORB_R * ORB_OPEN_F    // 컷 평면 x — 아치 보이드 동단과 무간섭(검증 강제)
export const ORB_RING_R   = Math.sqrt(ORB_R * ORB_R - (ORB_R * ORB_OPEN_F) ** 2)  // 테 고리 반경 ≈13.44 — 뚫린 테두리를 감싸는 프레임(셸 단면 은닉)
export const ORB_RING_T   = 0.55                     // 테 관 두께(구조 테 — 얇게)
// ── ★㊵ (4) 목 스커트 유지 · ★㊵-4 동단 재앵커: 나팔 바닥 컷 → 드럼 서벽 물림 ──
//  부양된 구 ↔ 지상 드럼 사이 목(박스) 아랫부분의 봉합. 위로 볼록(현도 확정 조형) 불변.
//  구 코드의 '측벽 밑선 = domeClipY'는 부양+구형화에서 지면(0)으로 떨어져 60m 장막이 되므로 스커트가 필수.
export const SKIRT_X0    = Math.min(80, Math.sqrt(ROOM_R * ROOM_R - BOX_HW * BOX_HW) - 3)  // 구 표면 위 시작(㊵-2 파생)
export const SKIRT_X1    = COR_CX - Math.sqrt(COR_R * COR_R - BOX_HW * BOX_HW) + 1.8       // ★동단 = 드럼 서벽(z=±BOX_HW 면) +1.8 물림 ≈122.0
export const SKIRT_Y1    = COR_Y0 - 26              // ★동단 y(노브) — 드럼 벽에 닿는 높이. 벽은 지면~천장 전체라 어느 y든 물림
export const SKIRT_BULGE = 6                        // ★위로 볼록 정도(노브 — 0 = 곧은 현)
export const skirtY = (x) => {
  const y0 = domeClipY(SKIRT_X0, BOX_HW), y1 = SKIRT_Y1
  const t = Math.min(1, Math.max(0, (x - SKIRT_X0) / (SKIRT_X1 - SKIRT_X0)))
  const ym = (y0 + y1) / 2 + SKIRT_BULGE
  return (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * ym + t * t * y1
}
//  목 밑선(박스 옆벽·앞치마 공유): 구 표면 → 스커트 → (드럼 안) 박스 바닥판 밑
export const neckBottomY = (x, z) => (x <= SKIRT_X0 ? domeClipY(x, z)
  : x <= SKIRT_X1 ? skirtY(x) : COR_Y0 - COR_THICK / 2)

// ════════════════════════════════════════════════════════════════════
// ── ★방사 복합체(RAD — 1p1~4 네 방·고리) 매싱 드래프트 2026.07.09 ──
//  골격 개정: 허브(기존 랜딩+빛우물) → 대각 터널 4 → 유선형 꽃잎 방 4(등형 = 같은 기하 4회 회전 배치)
//  → 고리(순환) → 동측에서 박스 옆벽 접합 → 통로(=1p5의 방으로 인계) → 리브. 방 내부 표현은 전부 미정(빈 셸).
//  밀폐: 원뿔대 문 4(대각) · 꽃잎 문 3(방사1+접선2) · 박스 접합문 2 · 박스 서쪽 캡 — 그 외 개구 없음(스포 안전).
export const RAD_ANG0    = Math.PI / 4        // 첫 꽃잎 각(45° NE). 4방 = +90°씩. ⚠나선 슬롯과의 충돌은 ROOM_TOP_AZ로 푼다(RAD_ANG0 회전으론 불가 — 위 주석)
export const RAD_R       = 62                 // 꽃잎 중심 반경 = 고리 중심선 반경(돔 사면 위 부양. 표면고 35.9 대 바닥 49.3)
export const RAD_PRX     = 16                 // ★꽃잎 타원구 수평 반축(13→16, 2026.07.11 ①확장). 노브 — 변경 시 check_radial 재검
export const RAD_PRY     = 17                 // ★★꽃잎 수직 반축(10.5→17, 2026.07.12 셸 계란화 — 현도 스케치). 셸 39.5~73.5: 세로로 긴 계란 = 층고 27.4
export const RAD_PCY     = COR_Y0 + 7.5       // ★★꽃잎 중심고 — ★㊵ 파생 전환(구 절대 56.5 = 49+7.5 · 부양 동반 상승). 하단 = 구 표면 간극 ≈3.6 불변(강체 이동)
export const RAD_T_HW    = 2.2                // 터널·고리 내부 반폭(폭 4.4)
export const RAD_TOP     = COR_Y0 + 5         // 터널·고리 천장 높이 — ★㊵ 파생 전환(구 절대 54 = 49+5). 내부고 ≈4.7 불변. 노브⚠셸 폐합 검사 연동
export const RAD_DOOR_H  = 4.0                // 문 높이(바닥 49.3 기준 → 상단 53.3 — 천장 54 아래 헤더 0.7, 셸 내부고 여유 1.2 검증)
export const RAD_SKIRT_MAX = 14               // ★㊵-2 스커트 최대 드리움(노브): 언더플로어 커튼 밑단 = 문지방 − 이 값. 구 표면이 그보다 높으면 표면에 물림(구 봉합 유지), 낮거나 없으면(구형화로 발자국이 구 밖) 밑단에서 수평 폐합 — 지면 낙하 방지
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
export const LENS_Y      = 330//330                // 렌즈 중심 높이 — 노브(테라스 웅장함 ↔ 답답함, 현도 로컬 판정). ≤H(960)이면 보어 자동 안전
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
export const RIB_TINT_AMT  = 0.15             // 알베도 혼합 최대치(정점에서) — ★복구(2026.07.19, 렌즈 검수용 임시 소등 해제)
export const RIB_TINT_EMIS = 0.10             // 발광 성분(안개 관통 보조) — ★복구(2026.07.19)
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
export const P2_EDGE_A     = LIFT_Y + 57      // 낮은 천장(−z) 전단 모서리 = 절벽면 하단 — 바닥 위 10.9(★㊵ 부양 동반 +Δ). 현도 튜닝
export const P2_EDGE_B     = LIFT_Y + 64.8    // 높은 천장(+z) 전단 모서리 = 절벽면 상단 — 바닥 위 18.7(★㊵ +Δ). ★JUMP 7.8 = 핵심 노브
export const P2_RIM_A      = LIFT_Y + 62      // 낮은 천장 벽 rim(★㊵ +Δ) — ★현도 튜닝: 모서리보다 높아 벽 쪽으로 '들리는' 낮은 천장(구도 반전 수용)
export const P2_RIM_B      = LIFT_Y + 60.5    // 높은 천장 벽 rim(★㊵ +Δ)
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
