// ★75 시야 지도 프로브 — 방 안에 눈을 두고 부채꼴 광선을 쏴 "무엇에 먼저 맞는지" 이름표를 찍는다.
//  ★2026.07.29 ★83: 캐스터 정본이 `viewProbe.js`로 승격됐다. 이 파일은 **인쇄기**일 뿐이고,
//   판정은 `check_corridor` U절이 매 실행 자동으로 한다(구 수동 프로브 → 회귀 방어).
import { castDoorFan, doorArch } from './viewProbe.js'

const f = (x, n = 2) => Number(x).toFixed(n)
const R = castDoorFan()
const A = doorArch()

console.log(`눈 x${f(R.eye[0])} y${f(R.eye[1])} z${f(R.eye[2])} → 동쪽. 문 아치 = floor ${f(A.floor)} · 크라운 ${f(A.crown)} · 반폭 ${f(A.hw)}`)
console.log('  R=리브살  S=계단매스  t=계단판  d=하강판  C=볼벽  p=정션판  W=방벽  _=슬랩  ·=끝까지 없음')
for (const row of R.rows) console.log('  ' + f(row.ey) + ' ' + row.cells.join(''))

console.log(`\n표본 ${R.samples} · 문 개구 안 ${R.aperture} · **개구 안 리브 살 ${R.ribHits.length}점**`)
if (R.ribHits.length) {
  const xs = R.ribHits.map((p) => p[0]), ys = R.ribHits.map((p) => p[1]), zs = R.ribHits.map((p) => Math.abs(p[2]))
  console.log(`   x ${f(Math.min(...xs))}~${f(Math.max(...xs))}  y ${f(Math.min(...ys))}~${f(Math.max(...ys))}  |z| ${f(Math.min(...zs))}~${f(Math.max(...zs))}`)
  for (const p of R.ribHits.slice(0, 6)) console.log(`   x${f(p[0])} y${f(p[1])} z${f(p[2])}`)
} else {
  console.log('   ⇒ 문으로 보이는 범위에 리브 살 없음 (U절이 매 실행 이것을 강제한다)')
}
