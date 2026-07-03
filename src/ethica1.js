// ============================================================
//  에티카 1부 — 정리 1~8 의존 그래프 데이터  (src/ethica1.js)
//
//  이 파일은 '데이터'만 담는다. 3D 모양·배치·색·립 개수 같은
//  어떤 미적/건축 결정도 여기서 정하지 않는다.
//  → 네 1~4 스케치가 A-1이든 A-2든(DD-03), 립이 둘이든 무한이든(DD-05),
//    그 위에 무엇이든 올릴 수 있는 '바닥'.
//
//  출처: Design Log DD-01 (상태: 확정) 의 의존표를 그대로 전사.
//  원칙: 에티카 본문에 '명시적으로 인용된 노드'만 간선으로 넣는다.
//        숨은 인용(점선)·보충(corollary) 별도 노드는 만들지 않는다.
// ============================================================

// 노드 종류 ---------------------------------------------------
export const KIND = {
  DEF:  'definition',   // 정의 D*
  AX:   'axiom',        // 공리 A*
  PROP: 'proposition',  // 정리 1p*
}

// 논리 위계 (DD-01에서 확정한 구조 — 미적 분류 아님) -----------
//   ground     : 정의·공리 (토대 아래 바탕)
//   foundation : 1~4  평행한 네 토대 (서로 미인용, 정의·공리에서 직접)
//   braid      : 5~8  수렴 땋임 (가닥이 위로 모임)
export const TIER = {
  GROUND: 'ground',
  FOUNDATION: 'foundation',
  BRAID: 'braid',
}

// 각 노드의 공통 형태:
//   { id, kind, text, deps, tier, anchor, note?, provisional? }
//     id    : '1p1' | 'D3' | 'A5' ...        (고유 식별자)
//     kind  : KIND.*                          (정의/공리/정리)
//     text  : 본문 한 줄                       (정리는 DD-01의 '한 줄' 그대로)
//     deps  : 이 노드가 '인용하는' 노드 id 배열  (= 의존 간선, 위→아래로 향함)
//     tier  : TIER.*                          (논리 위계)
//     anchor: null                            (공간상 위치 — 미결, 의도적으로 비움)
//     note  : 데이터에 남길 주석 (선택)
//     provisional: true 이면 text가 '표준 요약'이며 네 번역으로 교체 가능

// --- 정의 D1~D8 (전체) -----------------------------------------
//   ⚠ 아래 text는 표준 요약(provisional). 네 번역·독해로 바꿔도 그래프는 안 깨짐.
//   D6~D8은 1~8 구간 미인용(D6은 9~15 데이터 입력 시 연결, D7·D8은 1~15 미인용).
//   그래도 전부 싣는다 — 방의 '정의 옥타곤' 8기가 완전성을 요구(쓰임은 별자리가 밝힘).
export const DEFINITIONS = [
  { id: 'D1', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '자기원인: 그 본질이 존재를 포함하는 것(존재한다고만 파악될 수 있는 것).', deps: [] },
  { id: 'D2', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '자기 유에서 유한: 같은 본성의 다른 것에 의해 한정될 수 있는 것.', deps: [] },
  { id: 'D3', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '실체: 자기 안에 있고 자기를 통해 파악되는 것.', deps: [] },
  { id: 'D4', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '속성: 지성이 실체의 본질을 구성하는 것으로 지각하는 것.', deps: [] },
  { id: 'D5', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '양태: 실체의 변용. 다른 것 안에 있고 다른 것을 통해 파악되는 것.', deps: [] },
  { id: 'D6', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '신: 절대적으로 무한한 존재, 즉 각각이 영원하고 무한한 본질을 표현하는 무한한 속성들로 이루어진 실체.', deps: [],
    note: '1p1~8에는 부재 — 신은 전제가 아니라 구성된다(발생적 방법). 9~15 의존 데이터 입력 시 연결.' },
  { id: 'D7', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '자유로운 것: 자기 본성의 필연성만으로 존재하고 자기에 의해서만 행동이 결정되는 것. 강제된 것: 다른 것에 의해 정해진 방식으로 존재·작용하도록 결정되는 것.', deps: [],
    note: '1부 1~15 미인용 — 옥타곤 완전성을 위해 전시.' },
  { id: 'D8', kind: KIND.DEF, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '영원성: 영원한 것의 정의만으로부터 필연적으로 따라 나온다고 파악되는 존재 그 자체.', deps: [],
    note: '1부 1~15 미인용 — 옥타곤 완전성을 위해 전시.' },
]

// --- 공리 A1~A7 (전체) ------------------------------------------
//   A2·A3·A7은 1~8 구간 미인용 — 방의 '공리 스테이션' 7기가 완전성을 요구.
export const AXIOMS = [
  { id: 'A1', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '존재하는 모든 것은 자기 안에 있거나 다른 것 안에 있다.', deps: [] },
  { id: 'A2', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '다른 것을 통해 파악될 수 없는 것은 자기를 통해 파악되어야 한다.', deps: [] },
  { id: 'A3', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '주어진 일정한 원인에서 필연적으로 결과가 따른다. 반대로 일정한 원인이 없으면 결과가 따르는 것은 불가능하다.', deps: [] },
  { id: 'A4', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '결과의 인식은 원인의 인식에 의존하며 그것을 포함한다.', deps: [] },
  { id: 'A5', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '공통점이 없는 것들은 서로를 통해 파악될 수 없다.', deps: [] },
  { id: 'A6', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '참된 관념은 그 대상과 일치해야 한다.', deps: [] },
  { id: 'A7', kind: KIND.AX, tier: TIER.GROUND, anchor: null, provisional: true,
    text: '존재하지 않는 것으로 파악될 수 있는 모든 것의 본질은 존재를 포함하지 않는다.', deps: [] },
]

// --- 정리 1~8 (text·deps는 DD-01 그대로) ----------------------
export const PROPOSITIONS = [
  { id: '1p1', kind: KIND.PROP, tier: TIER.FOUNDATION, anchor: null,
    text: '실체는 본성상 자신의 변용에 앞선다.',
    deps: ['D3', 'D5'] },

  { id: '1p2', kind: KIND.PROP, tier: TIER.FOUNDATION, anchor: null,
    text: '서로 다른 속성을 소유하는 두 실체는 공통되는 것을 갖지 않는다.',
    deps: ['D3'] },

  { id: '1p3', kind: KIND.PROP, tier: TIER.FOUNDATION, anchor: null,
    text: '공통점 없는 사물들은 하나가 다른 것의 원인이 될 수 없다.',
    deps: ['A5', 'A4'] },

  { id: '1p4', kind: KIND.PROP, tier: TIER.FOUNDATION, anchor: null,
    text: '둘 또는 다수의 사물은 속성 또는 변용에 의해 구분된다.',
    deps: ['A1', 'D3', 'D4', 'D5'] },

  { id: '1p5', kind: KIND.PROP, tier: TIER.BRAID, anchor: null,
    text: '동일한 본성·속성을 가지는 둘 이상의 실체는 존재할 수 없다.',
    deps: ['1p4', '1p1', 'D3', 'A6'] },

  { id: '1p6', kind: KIND.PROP, tier: TIER.BRAID, anchor: null,
    text: '하나의 실체는 다른 실체에서 산출될 수 없다.',
    deps: ['1p5', '1p2', '1p3'] },

  { id: '1p7', kind: KIND.PROP, tier: TIER.BRAID, anchor: null,
    text: '실체의 본성에는 존재가 속한다.',
    deps: ['1p6', 'D1'],
    // DD-01 주석: 본문은 '1p6의 보충에 의해'라 명시. 화살표 대상은 1p6으로 두되,
    // '본문이 가리키는 것 = 1p6 보충'임을 기억. D1은 자기원인→본질이 존재 포함의 다리.
    note: '본문 표면 인용은 1p6의 보충(corollary). 노드 화살표는 1p6으로 둠.' },

  { id: '1p8', kind: KIND.PROP, tier: TIER.BRAID, anchor: null,
    text: '모든 실체는 필연적으로 무한하다.',
    deps: ['1p5', '1p7', 'D2'],
    // 1p8의 '무한'은 자기 유 안에서 무한(infinite in suo genere)이지
    // D6의 절대적 무한이 아니다. → 1~8 구간엔 신(D6) 부재 (DD-02).
    note: "여기서 '무한'은 자기 유 안에서 무한. D6(절대적 무한)이 아님." },
]

// --- 전체 노드를 한 배열로 / id로 빠르게 찾기 ------------------
export const NODES = [...DEFINITIONS, ...AXIOMS, ...PROPOSITIONS]

export const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]))

// --- 간선을 [from, to] 쌍 목록으로 (from이 to를 인용/의존) -----
//   그래프 뷰가 선을 그릴 때 이 목록을 쓴다.
export const EDGES = NODES.flatMap(n => n.deps.map(to => [n.id, to]))

// --- 자기검사: deps가 가리키는 id가 전부 실재하는지 확인 --------
//   (오타·누락 잡기용. 문제 있으면 배열로 돌려준다. 없으면 빈 배열.)
export function validateGraph() {
  const problems = []
  for (const n of NODES) {
    for (const d of n.deps) {
      if (!NODE_BY_ID[d]) problems.push(`${n.id} → '${d}' (없는 노드)`)
    }
  }
  return problems
}
