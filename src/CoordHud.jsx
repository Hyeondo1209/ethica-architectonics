//  ════════ ★99 좌표 HUD — 개발 도구 (2026.08.01, 현도 요청) ════════
//  "로컬에서 어느 지점의 좌표를 직접 알 수 있다면 그 좌표를 전달해 빠르게 교류할 수 있겠지"(현도).
//  ㉟ 웨이포인트 텔레포트와 같은 계열 — 작품 요소가 아니라 **왕복 비용을 깎는 도구**다.
//
//  구성 둘:
//   · <PoseProbe/>  — Canvas 안. 매 프레임 카메라를 window.__ethicaPose에 적는다(React state 미사용:
//                     60fps setState는 씬 전체를 리렌더시킨다 — 도구가 작품을 느리게 만들면 안 된다).
//   · <CoordHud/>   — Canvas 밖 DOM 패널. 100ms마다 ref.textContent만 갱신(역시 리렌더 0).
//
//  ⛔★135 조준 픽커 = **폐기**(2026.08.15 같은 날 현도 실측: "렉이 너무 심하다"). 되돌림 완료 — 이 파일에 잔재 0.
//   시도: 크로스헤어 레이캐스트로 부재 이름을 HUD에 띄우려 했다(6프레임마다 픽·레이캐스터 1회 생성으로 아꼈으나
//   씬 전체 재귀 intersectObjects 자체가 이 규모에선 감당이 안 됐다 — 메시 수백 + 리브 72기 + CSG 결과물).
//   ⚠교훈: **도구가 작품을 느리게 만들면 그 도구는 실패다**(★99가 React state를 피한 것과 같은 원칙, 더 센 형태).
//   대체: 부재 지목은 **현도가 그 앞에 서서 `free:` 좌표 한 줄**(C 키). ★134-b에서 좌표 셋으로 즉시 특정된 방식.
//   ⚠부재 name 부여는 **존치**한다(픽커와 무관하게 코드 가독성·검사 대상으로 유용 — 런타임 비용 0).
//
//  키: C = free: 줄 복사(렌더 도구에 그대로 붙음) · Shift+C = 웨이포인트 줄 복사 · V = HUD 접기/펴기
//  ⚠배포: waypoints.js `DEV_TELEPORT=false` 한 줄로 통째 사라진다(텔레포트 패널과 같은 스위치).
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { EYE, WAYPOINTS, DEV_TELEPORT } from './waypoints'
import { formatFree, formatWaypoint, formatHuman } from './poseFormat'

//  ── Canvas 안: 카메라 실값을 전역 슬롯에 적는다 ──
export function PoseProbe() {
  const { camera } = useThree()
  useFrame(() => {
    window.__ethicaPose = {
      x: camera.position.x, y: camera.position.y, z: camera.position.z,
      yaw: camera.rotation.y, pitch: camera.rotation.x,
    }
  })
  return null
}

//  ── 가장 가까운 웨이포인트(맥락 표시 — "내가 지금 어느 권역인가") ──
function nearestWp(p) {
  let best = null, bd = Infinity
  for (const w of WAYPOINTS) {
    const d = Math.hypot(w.x - p.x, (w.y + EYE) - p.y, w.z - p.z)
    if (d < bd) { bd = d; best = w }
  }
  return best ? { label: best.label, d: bd } : null
}

export function CoordHud() {
  const lineRef = useRef(null), wpRef = useRef(null), freeRef = useRef(null)
  const boxRef = useRef(null), flashRef = useRef(null)
  const openRef = useRef(true)

  useEffect(() => {
    if (!DEV_TELEPORT) return
    const flash = (msg) => {
      if (!flashRef.current) return
      flashRef.current.textContent = msg
      clearTimeout(flashRef.current._t)
      flashRef.current._t = setTimeout(() => { if (flashRef.current) flashRef.current.textContent = '' }, 1400)
    }
    const copy = (text, msg) => {
      //  ⚠localhost는 secure context라 clipboard API가 동작한다. 그래도 실패 대비 폴백을 둔다
      //   (실패해도 화면에 문자열이 떠 있으니 손으로 옮길 수 있다 — 도구가 막다른 길이 되면 안 됨).
      const done = () => flash(msg)
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => flash('복사 실패 — 화면 문자열을 직접 긁으세요'))
      else flash('복사 불가 — 화면 문자열을 직접 긁으세요')
    }
    const onKey = (e) => {
      if (e.repeat) return
      const p = window.__ethicaPose
      if (e.code === 'KeyV') {
        openRef.current = !openRef.current
        if (boxRef.current) boxRef.current.style.display = openRef.current ? 'block' : 'none'
      }
      if (e.code === 'KeyC' && p) {
        if (e.shiftKey) copy(formatWaypoint(p), '웨이포인트 줄 복사됨')
        else copy(formatFree(p), 'free: 줄 복사됨')
      }
    }
    window.addEventListener('keydown', onKey)
    const t = setInterval(() => {
      const p = window.__ethicaPose
      if (!p || !lineRef.current) return
      lineRef.current.textContent = formatHuman(p, p.y - EYE)
      freeRef.current.textContent = formatFree(p)
      const n = nearestWp(p)
      wpRef.current.textContent = n ? `가장 가까운 지점: ${n.label} (${Math.round(n.d)}m)` : ''
    }, 100)
    return () => { window.removeEventListener('keydown', onKey); clearInterval(t) }
  }, [])

  if (!DEV_TELEPORT) return null
  return (
    <div ref={boxRef} style={{
      position: 'fixed', left: 24, top: 20, maxWidth: 560, pointerEvents: 'none',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12,
      color: '#2a2a28', background: 'rgba(255,255,255,0.42)', padding: '8px 12px',
      borderRadius: 6, lineHeight: 1.75, letterSpacing: '0.01em',
    }}>
      <div ref={lineRef} style={{ fontWeight: 600 }} />
      <div ref={freeRef} style={{ color: '#5a5648', userSelect: 'text', pointerEvents: 'auto' }} />
      <div ref={wpRef} style={{ color: '#6b6658' }} />
      <div style={{ color: '#8a8578', marginTop: 4 }}>
        C 복사 · Shift+C 웨이포인트 줄 · V 접기
        <span ref={flashRef} style={{ color: '#1d6b4a', marginLeft: 10, fontWeight: 600 }} />
      </div>
    </div>
  )
}
