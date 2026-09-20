//  ★221-d/e 뿌리 목 화면 튜너 — 개발 도구(2026.09.18 현도: "반경이랑 길이 화면 내에서 조절할 수 있는 거 만들어주면 안돼?")
//  표적 둘(★221-e 09.18 현도 "회랑 뿌리 튜너로 일단 잡아보자"): 등불 방(1p10) 중앙 등불 / 회랑 등불 9기(공통값 — 9기 동일 기하).
//  슬라이더를 놓으면 그 표적의 mesh만 다시 짓는다(방 1기 0.3s쯤 · 회랑은 스펙 캐시 공유 + 9기 기하 재생성 · 씬 리렌더 0).
//  키 없음 · 패널만. "복사"를 누르면 constants.js에 붙일 세 줄이 클립보드에 간다(표적별 상수 이름).
//  ⚠배포: waypoints.js `DEV_TELEPORT=false`면 통째 사라진다(HUD·텔레포트와 같은 스위치).
import { useSyncExternalStore, useState } from 'react'
import { lampRootTune } from './lampRootGeometry'
import { LR_R0, LR_LEN, LAMP_TUBE_R, LAMP_ENTRY_Y, RM10_CENTER_Y, LAMP_MOUTH_Y0, LAMP_MOUTH_Y1, LAMP_FUNNEL_H, clLandingY, CL_HW } from './constants'
import { DEV_TELEPORT } from './waypoints'

//  길이 상한 = 목 끝이 갓 목(관 시작)에 닿기 직전. 전부 파생(손 수치 = 여유 0.2뿐).
//   등불 방: 갓 목 하나. 회랑: 갓 목이 가장 높은 등불 = #1(첫 층계참 · 갓 입 LAMP_MOUTH_Y0 · 관 4.5m)이 병목.
const NECK_RM10 = RM10_CENTER_Y + LAMP_MOUTH_Y1 + LAMP_FUNNEL_H
const NECK_CL1  = clLandingY(0) + LAMP_MOUTH_Y0 + LAMP_FUNNEL_H
const TARGETS = {
  rm10: { label: '등불 방(1p10)', lenMax: LAMP_ENTRY_Y - NECK_RM10 - 0.2, r0Max: 7.0,
          copy: (t) => `export const LR_RM10_R0K  = ${(t.r0 / LR_R0).toFixed(3)}   // ★221-d 튜너: 반경 ${t.r0.toFixed(2)}m\n`
                     + `export const LR_RM10_LENK = ${(t.len / LR_LEN).toFixed(3)}   // ★221-d 튜너: 길이 ${t.len.toFixed(1)}m\n`
                     + `export const LR_RM10_POW  = ${t.pow.toFixed(2)}   // ★221-d 튜너\n` },
  //  회랑 반경 상한 = 회랑 반폭 CL_HW(2.6): 목이 벽 두께 안으로 파고들지 않게(뿌리는 천장 대역 y≈259~263 = 벽 위지만 안전 쪽).
  cl:   { label: '회랑 등불 9기', lenMax: LAMP_ENTRY_Y - NECK_CL1 - 0.2, r0Max: CL_HW,
          copy: (t) => `export const LR_R0     = LAMP_TUBE_R * ${(t.r0 / LAMP_TUBE_R).toFixed(2)}   // ★221-e 튜너: 반경 ${t.r0.toFixed(2)}m\n`
                     + `export const LR_LEN    = ${t.len.toFixed(1)}   // ★221-e 튜너\n`
                     + `export const LR_POW    = ${t.pow.toFixed(2)}   // ★221-e 튜너\n` },
}

export function LampRootTuner() {
  const all = useSyncExternalStore(lampRootTune.subscribe, lampRootTune.get)
  const [target, setTarget] = useState('rm10')
  const [open, setOpen] = useState(true)
  const [pending, setPending] = useState(all)   // 드래그 중 표시값(놓을 때만 기하 재생성) — 표적별로 들고 있는다
  if (!DEV_TELEPORT) return null
  const T = TARGETS[target], t = all[target], p = pending[target] ?? t
  const setP = (key, v) => setPending({ ...pending, [target]: { ...p, [key]: v } })
  const row = (label, key, min, max, step, fmt) => (
    <label style={{ display: 'grid', gridTemplateColumns: '64px 1fr 58px', gap: 8, alignItems: 'center', margin: '4px 0' }}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={Math.min(p[key], max)}
        onChange={(e) => setP(key, +e.target.value)}
        onPointerUp={(e) => lampRootTune.set(target, { [key]: +e.target.value })}
        onKeyUp={(e) => lampRootTune.set(target, { [key]: +e.target.value })} />
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p[key])}</span>
    </label>
  )
  const copy = () => navigator.clipboard?.writeText(T.copy(t))
  const tab = (k) => (
    <button key={k} onClick={() => setTarget(k)}
      style={{ cursor: 'pointer', padding: '2px 8px', border: '1px solid #b8ad96', borderRadius: 4,
               background: target === k ? '#3a3324' : 'transparent', color: target === k ? '#faf7f0' : '#3a3324' }}>
      {TARGETS[k].label}
    </button>
  )
  return (
    <div style={{
      position: 'fixed', right: 20, top: 20, width: 300, padding: '10px 12px', borderRadius: 8,
      background: 'rgba(250,247,240,0.88)', color: '#3a3324', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.12)', pointerEvents: 'auto', userSelect: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <b>뿌리 목 튜너 (★221-d/e)</b>
        <button onClick={() => setOpen(!open)} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>{open ? '접기' : '펴기'}</button>
      </div>
      {open && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>{Object.keys(TARGETS).map(tab)}</div>
          {row('반경 m', 'r0', LAMP_TUBE_R + 0.1, T.r0Max, 0.05, (v) => v.toFixed(2) + ' (' + (v / LAMP_TUBE_R).toFixed(1) + '×관)')}
          {row('길이 m', 'len', 1.0, T.lenMax, target === 'cl' ? 0.1 : 0.5, (v) => v.toFixed(1))}
          {row('오목 지수', 'pow', 1.0, 6.0, 0.1, (v) => v.toFixed(1))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button onClick={copy} style={{ cursor: 'pointer' }}>constants 세 줄 복사</button>
            <span style={{ opacity: 0.6 }}>놓을 때 재생성{target === 'cl' ? ' (9기)' : ' (≈0.3s)'}</span>
          </div>
          {target === 'cl' && <div style={{ opacity: 0.6, marginTop: 4 }}>길이 상한 {T.lenMax.toFixed(2)}m = 등불 #1 갓 목까지</div>}
        </>
      )}
    </div>
  )
}
