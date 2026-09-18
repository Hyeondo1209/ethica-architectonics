//  ★221-d 뿌리 목 화면 튜너 — 개발 도구(2026.09.18 현도: "반경이랑 길이 화면 내에서 조절할 수 있는 거 만들어주면 안돼?")
//  등불 방(1p10) 중앙 등불의 뿌리 목만 다룬다. 슬라이더를 놓으면 그 mesh 하나만 다시 짓는다(0.3s쯤 · 씬 리렌더 0).
//  키 없음 · 패널만. "복사"를 누르면 constants.js에 붙일 세 줄이 클립보드에 간다.
//  ⚠배포: waypoints.js `DEV_TELEPORT=false`면 통째 사라진다(HUD·텔레포트와 같은 스위치).
import { useSyncExternalStore, useState } from 'react'
import { lampRootTune } from './lampRootGeometry'
import { LR_R0, LR_LEN, LAMP_TUBE_R, LAMP_ENTRY_Y, RM10_CENTER_Y, LAMP_MOUTH_Y1, LAMP_FUNNEL_H } from './constants'
import { DEV_TELEPORT } from './waypoints'

const neck = RM10_CENTER_Y + LAMP_MOUTH_Y1 + LAMP_FUNNEL_H
const LEN_MAX = LAMP_ENTRY_Y - neck - 0.2      // 목 끝이 갓 목에 닿기 직전까지

export function LampRootTuner() {
  const t = useSyncExternalStore(lampRootTune.subscribe, lampRootTune.get)
  const [open, setOpen] = useState(true)
  const [pending, setPending] = useState(t)   // 드래그 중 표시값(놓을 때만 기하 재생성)
  if (!DEV_TELEPORT) return null
  const row = (label, key, min, max, step, fmt) => (
    <label style={{ display: 'grid', gridTemplateColumns: '64px 1fr 58px', gap: 8, alignItems: 'center', margin: '4px 0' }}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={pending[key]}
        onChange={(e) => setPending({ ...pending, [key]: +e.target.value })}
        onPointerUp={(e) => lampRootTune.set({ [key]: +e.target.value })}
        onKeyUp={(e) => lampRootTune.set({ [key]: +e.target.value })} />
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(pending[key])}</span>
    </label>
  )
  const copy = () => {
    const s = `export const LR_RM10_R0K  = ${(t.r0 / LR_R0).toFixed(3)}   // ★221-d 튜너: 반경 ${t.r0.toFixed(2)}m\n`
            + `export const LR_RM10_LENK = ${(t.len / LR_LEN).toFixed(3)}   // ★221-d 튜너: 길이 ${t.len.toFixed(1)}m\n`
            + `export const LR_RM10_POW  = ${t.pow.toFixed(2)}   // ★221-d 튜너\n`
    navigator.clipboard?.writeText(s)
  }
  return (
    <div style={{
      position: 'fixed', right: 20, top: 20, width: 300, padding: '10px 12px', borderRadius: 8,
      background: 'rgba(250,247,240,0.88)', color: '#3a3324', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.12)', pointerEvents: 'auto', userSelect: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <b>등불 방 뿌리 목 튜너 (★221-d)</b>
        <button onClick={() => setOpen(!open)} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>{open ? '접기' : '펴기'}</button>
      </div>
      {open && (
        <>
          {row('반경 m', 'r0', LAMP_TUBE_R + 0.1, 7.0, 0.05, (v) => v.toFixed(2) + ' (' + (v / LAMP_TUBE_R).toFixed(1) + '×관)')}
          {row('길이 m', 'len', 1.0, LEN_MAX, 0.5, (v) => v.toFixed(1))}
          {row('오목 지수', 'pow', 1.0, 6.0, 0.1, (v) => v.toFixed(1))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button onClick={copy} style={{ cursor: 'pointer' }}>constants 세 줄 복사</button>
            <span style={{ opacity: 0.6 }}>놓을 때 재생성(≈0.3s)</span>
          </div>
        </>
      )}
    </div>
  )
}
