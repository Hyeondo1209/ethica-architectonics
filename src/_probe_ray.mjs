//  ══ ★★★163 광선 프로브 — 현도 HUD `free:x,y,z,yaw,pitch`로 그 시점에서 보이는 부재를 센다 ══
//   ⛔이 도구가 ★161의 도면·이지선다 왕복 4회를 ★162·★163에서 0회로 만들었다(규율 30).
//   ★사용: 아래 `const o=[...]` 와 yaw/pit 을 HUD 값으로 바꿔 실행. 삼각형 교차 실측이라
//    정본 프로브의 아핀 z 한계(★148 선언)와 무관하다.
const B='./'   // repo 루트에서 `node src/_probe_ray.mjs` 로 실행
const T=await import('./bridgeTrapGeometry.js')
const G=await import('./gatEaveGeometry.js')
const {ceilNotchSpec}=await import('./bridgeDeckGeometry.js')
const surf=G.gatCutSpec().surf, N=ceilNotchSpec()
const holeAt=(x,z)=>{const y=surf(x,z)
  for(const b of N.bands) if(y>=b.y0-1e-9&&y<=b.y1+1e-9) return Math.abs(z) <= b.a*y+b.b
  return false}
const P=T.buildBridgeTrapParts(), tris=[]
for(const {id,geo} of P.solid){const p=geo.getAttribute('position'),ix=geo.index,n=ix?ix.count:p.count
 for(let k=0;k<n;k+=3){const g=j=>{const i=ix?ix.getX(j):j;return [p.getX(i),p.getY(i),p.getZ(i)]};tris.push([g(k),g(k+1),g(k+2),id])}}
function hit(o,d){let best=Infinity,bid=null
 for(const [a,b,c,id] of tris){const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]
  const h=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]]
  const det=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2]; if(Math.abs(det)<1e-12)continue
  const f=1/det,s=[o[0]-a[0],o[1]-a[1],o[2]-a[2]]
  const u=f*(s[0]*h[0]+s[1]*h[1]+s[2]*h[2]); if(u<0||u>1)continue
  const q=[s[1]*e1[2]-s[2]*e1[1],s[2]*e1[0]-s[0]*e1[2],s[0]*e1[1]-s[1]*e1[0]]
  const v=f*(d[0]*q[0]+d[1]*q[1]+d[2]*q[2]); if(v<0||u+v>1)continue
  const t=f*(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2]); if(t>1e-6&&t<best){best=t;bid=id}}
 return {t:best,id:bid}}
const o=[135.88,143.48,0.25], yaw=(-989.9)*Math.PI/180, pit=(-12.8)*Math.PI/180
const fw=[-Math.sin(yaw)*Math.cos(pit), Math.sin(pit), -Math.cos(yaw)*Math.cos(pit)]
const rt=[Math.cos(yaw),0,-Math.sin(yaw)]
const up=[fw[1]*rt[2]-fw[2]*rt[1], fw[2]*rt[0]-fw[0]*rt[2], fw[0]*rt[1]-fw[1]*rt[0]]
const tan=Math.tan(35*Math.PI/180)
const seen={}; let escape=0; const esc=[]
for(let iy=-8;iy<=8;iy++)for(let ix=-12;ix<=12;ix++){
 const sx=ix/12*tan*1.6, sy=iy/8*tan
 const d=[fw[0]+rt[0]*sx-up[0]*sy, fw[1]+rt[1]*sx-up[1]*sy, fw[2]+rt[2]*sx-up[2]*sy]
 const L=Math.hypot(...d); d[0]/=L;d[1]/=L;d[2]/=L
 const h=hit(o,d)
 //  광선이 천장 평면을 지나는 지점
 let cross=null
 const f=(t)=>{const p=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];return p[1]-surf(p[0],p[2])}
 if(f(0)*f(400)<0){let lo=0,hi=400; for(let i=0;i<70;i++){const m=(lo+hi)/2; if(f(lo)*f(m)<=0)hi=m; else lo=m}
   const t=(lo+hi)/2; cross={t,p:[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t]}}
 if(h.id){ seen[h.id]=(seen[h.id]||0)+1
   if(cross && cross.t < h.t && holeAt(cross.p[0],cross.p[2])) { /* 관 뒤에 구멍 */ } }
 else if(cross && holeAt(cross.p[0],cross.p[2])){ escape++
   const az=Math.abs(cross.p[2]); esc.push({z:az, kind: az<1.525?'관 내부(필수 개구)':(az<2.775?'슬릿':'관 밖')})  }
}
console.log('총 광선 25×17 = 425')
console.log('=== 부재에 맞은 광선 ===')
for(const [k,v] of Object.entries(seen).sort((a,b)=>b[1]-a[1])) console.log(`  ${k.padEnd(8)} ${v}`)
console.log(`\n=== ⛔ 아무것도 안 맞고 천장 구멍으로 빠져나간 광선 = ${escape} ===`)
const g={}; for(const e of esc) g[e.kind]=(g[e.kind]||0)+1; console.log('  분류:', JSON.stringify(g)); console.log('  |z| 목록:', esc.map(e=>e.z.toFixed(2)).join(' '))
