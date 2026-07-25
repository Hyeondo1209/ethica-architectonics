//  R7과 **완전히 같은 자**(해석식 중심선 + 조밀탐색·황금분할)로 보어 최대 축거리를 잰다.
import { rOf, uOfX, H, U_SPIRAL_END, U_KNEE_END, X_LAND_HI, KW_STEPS, KW_FLATTEN,
         KW_TREAD_D, KW_TREAD_W, TREAD_THICK, spiralPoint, STAIR_STEPS, TREAD_DEPTH, TREAD_WIDTH,
         KW_BODY_MODE, KW_BODY_HW, KW_BODY_D, KW_BODY_BWF, KW_BODY_TOP, SHELL_RIB_R, RIB_RADIAL_SEG } from './constants.js'
import { kneeBodySamples } from './kneeBodyGeometry.js'
import { kneeTreads, kneeStairSpec } from './kneeStair.js'
const dAt=(u,px,py,pz)=>Math.hypot(px-rOf(u),py-H*u,pz)
const axDist=(px,py,pz)=>{let bu=0,best=1e9
  for(let i=0;i<=3000;i++){const u=i/3000,d=dAt(u,px,py,pz);if(d<best){best=d;bu=u}}
  let lo=Math.max(0,bu-1/3000),hi=Math.min(1,bu+1/3000),gr=(Math.sqrt(5)-1)/2
  for(let it=0;it<60;it++){const a=hi-gr*(hi-lo),b=lo+gr*(hi-lo)
    if(dAt(a,px,py,pz)<dAt(b,px,py,pz))hi=b;else lo=a}
  return dAt((lo+hi)/2,px,py,pz)}
const xA=rOf(U_SPIRAL_END),xB=X_LAND_HI,yA=H*U_SPIRAL_END,yB=H*U_KNEE_END
const wy=(x)=>(1-KW_FLATTEN)*(H*uOfX(x))+KW_FLATTEN*(yA+(yB-yA)*(xA-x)/(xA-xB))
let maxAx=0, who=''
for(const tr of kneeTreads()) for(const sx of[-1,1]) for(const sz of[-1,1]){
  const d=axDist(tr.x+sx*tr.d/2, tr.y-TREAD_THICK/2, sz*tr.w/2)
  if(d>maxAx){maxAx=d;who='무릎길 디딤'}
}
for(const L of kneeStairSpec().landings) for(const sx of[-1,1]) for(const sz of[-1,1]){
  const d=axDist(sx<0?L.x0:L.x1, L.y-TREAD_THICK/2, sz*KW_TREAD_W/2)
  if(d>maxAx){maxAx=d;who='무릎길 참'}
}
for(let i=0;i<STAIR_STEPS;i+=2){
  const {pos,theta}=spiralPoint((i+0.5)/STAIR_STEPS)
  for(const sx of[-1,1])for(const sz of[-1,1]){
    const lx=sx*TREAD_DEPTH/2,lz=sz*TREAD_WIDTH/2
    const d=axDist(pos.x+lx*Math.cos(-theta)+lz*Math.sin(-theta),pos.y,pos.z-lx*Math.sin(-theta)+lz*Math.cos(-theta))
    if(d>maxAx){maxAx=d;who='나선'}}
}
const before=maxAx, beforeWho=who
// 몸 밑변 두 모서리(자립일 때만 유효)
const vBot=-TREAD_THICK/2+KW_BODY_TOP-KW_BODY_D
for(const s of kneeBodySamples()){
  for(const sz of[-1,1]){
    const d=axDist(s.x,s.y+vBot,sz*KW_BODY_HW*KW_BODY_BWF)
    if(d>maxAx){maxAx=d;who='★65 몸 밑변'}}
}
const kF=Math.cos(Math.PI/RIB_RADIAL_SEG)
console.log(`모드 ${KW_BODY_MODE} · KW_FLATTEN ${KW_FLATTEN}`)
console.log(`  몸 제외: ${before.toFixed(4)} (${beforeWho})  → 벽 상한 ${(SHELL_RIB_R-before/kF).toFixed(4)}`)
console.log(`  몸 포함: ${maxAx.toFixed(4)} (${who})  → 벽 상한 ${(SHELL_RIB_R-maxAx/kF).toFixed(4)}`)
