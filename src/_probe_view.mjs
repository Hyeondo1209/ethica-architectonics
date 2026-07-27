// ★75 시야 지도 프로브 — 방 안에 눈을 두고 부채꼴 광선을 쏴 "무엇에 먼저 맞는지" 이름표를 찍는다.
//  ⚠이 도구를 만들고 나서야 리브 찌꺼기가 잡혔다. 그 전 진단 세 벌이 전부 틀렸다:
//   ① 축평행 광선만 씀 → 0점(원근 시야는 각도가 있다)  ② 볼벽·디딤판·슬랩 미포함 → 가려진 살까지 셈
//   ③ 방 +x벽 미포함 → 벽 뒤 살까지 셈. **가림막 대장이 비면 시야 진단은 전부 거짓말이다.**
import * as C from './constants.js'
import { axisDistAt, inRibArchCut, roomMouthArch, cheekTopPzAt, pzCheekProfile, ribArchCrownAt,
         wideStairSpec, wideStairOutline, wstairTopAt, archCutProfile, tubeInnerBottomAt,
         junctionPlateOutline, JCT_PLATE_TOP, wideStairTreads } from './junctionGeometry.js'
const f=(x,n=2)=>Number(x).toFixed(n)
const {SHELL_RIB_R,RIB_WALL_T,RIB_WALL_ON,RM_X0,RM_X1,RM_ROOF,PASS_FLOOR_Y,PASS_T,PASS_HW,PASS_FUSE,
 JCT_DN_Z,CHEEK_TOP_NZ,PASS_X_CHEEK,DESC_STEPS,DESC_STEP_R,DESC_TREAD_D,X_DESC0,DESC_SLOPE,
 U_KNEE_END,H,TREAD_THICK,LAND_T,X_LAND_LO,JCT_PLATE_XHI,CLEAR_HW,WARCH_HW,WARCH_FUSE}=C
const iR=RIB_WALL_ON?SHELL_RIB_R-RIB_WALL_T:SHELL_RIB_R, oR=SHELL_RIB_R
const zw=PASS_HW+PASS_T/2, P2=pzCheekProfile()
const A=roomMouthArch(), sp=Math.max(A.floor+0.05,A.crown-A.hw)
const DT=(()=>{const T=[],yT=U_KNEE_END*H;for(let i=0;i<DESC_STEPS;i++){const y=yT-(i+0.5)*DESC_STEP_R;T.push([X_DESC0-(yT-y)/DESC_SLOPE,y])}return T})()
const S=wideStairSpec(), WO=wideStairOutline()
const wsHalf=(x)=>{let b=WO[0].h,bd=1e9;for(const q of WO){const d=Math.abs(q.x-x);if(d<bd){bd=d;b=q.h}}return b}
const AP=archCutProfile().filter(q=>q.open)
const vAt=(x)=>{let b=null,bd=1e9;for(const q of AP){const d=Math.abs(q.x-x);if(d<bd){bd=d;b=q}}return bd<0.2?b:null}
const vhw=WARCH_HW+WARCH_FUSE
const OL=junctionPlateOutline()
const plateH=(x)=>{if(x<OL[0].x||x>OL[OL.length-1].x)return -1;let b=OL[0].h,bd=1e9;for(const q of OL){const d=Math.abs(q.x-x);if(d<bd){bd=d;b=q.h}}return b}
const WT=wideStairTreads()
function label(x,y,z){
  //  ★방 +x벽(아치 감산 패널) — 이게 빠져 있어 벽 뒤 살까지 '보인다'고 셌다(프로브 3차 결함)
  if(x>=RM_X1-C.RM_MOUTH_REVEAL&&x<=RM_X1+PASS_T&&y>=PASS_FLOOR_Y-PASS_T&&y<=PASS_FLOOR_Y+RM_ROOF+PASS_T&&Math.abs(z-JCT_DN_Z)<=PASS_HW+PASS_T){
    const zz=Math.abs(z-JCT_DN_Z)/A.hw
    let inDoor=false
    if(zz<=1){ if(y>=A.floor-0.4&&y<=sp) inDoor=true
      else if(y>sp&&y<=A.crown){const yy=(y-sp)/(A.crown-sp); inDoor=(zz*zz+yy*yy<=1)} }
    if(!inDoor) return 'W'
  }
  if(y>=PASS_FLOOR_Y-PASS_T&&y<=PASS_FLOOR_Y&&x>=RM_X1&&x<=PASS_X_CHEEK) return '_'          // 슬랩
  if(x>=RM_X1&&x<=PASS_X_CHEEK&&y>=PASS_FLOOR_Y&&y<=CHEEK_TOP_NZ&&Math.abs(z-(JCT_DN_Z-zw))<=PASS_T/2) return 'C'
  if(x>=P2.x0&&x<=P2.x1&&y>=P2.yBot&&y<=cheekTopPzAt(x)&&Math.abs(z-P2.z)<=P2.t/2) return 'C'
  for(const c of DT) if(Math.abs(x-c[0])<=DESC_TREAD_D/2&&Math.abs(y-c[1])<=TREAD_THICK/2&&Math.abs(z-JCT_DN_Z)<=PASS_HW+PASS_FUSE) return 'd'
  for(const t of WT) if(Math.abs(x-t.x)<=t.d/2&&Math.abs(y-t.y)<=TREAD_THICK/2&&Math.abs(z-(t.z??0))<=t.w/2) return 't'
  {const h=plateH(x); if(h>0&&Math.abs(z)<=h&&Math.abs(z-JCT_DN_Z)>CLEAR_HW&&y>=JCT_PLATE_TOP-LAND_T&&y<=JCT_PLATE_TOP) return 'p'}
  if(x>=S.x1&&x<=S.x0){const top=wstairTopAt(x)
    if(y<=top&&Math.abs(z)<=wsHalf(x)&&axisDistAt(x,y,z)<=iR){
      const V=vAt(x); let inV=false
      if(V&&Math.abs(z-JCT_DN_Z)<=vhw){const s2=Math.max(V.floor+0.05,V.crown-vhw),zz=(z-JCT_DN_Z)/vhw
        inV=(y>=V.floor&&y<=s2)||(y>s2&&y<=V.crown&&zz*zz+Math.pow((y-s2)/(V.crown-s2),2)<=1)}
      if(!inV) return 'S'}}
  {const d=axisDistAt(x,y,z); if(d>=iR&&d<=oR&&!inRibArchCut(x,y,z)) return 'R'}   // ★리브 살
  return null
}
const eye=[RM_X0+4, PASS_FLOOR_Y+1.6, 0]
console.log('눈 x'+f(eye[0])+' y'+f(eye[1])+' z0 → 동쪽. 문 아치 안쪽만 표시')
console.log('  R=리브살  S=계단매스  t=계단판  d=하강판  C=볼벽  p=정션판  _=슬랩  ·=끝까지 없음')
const RH=[]
for(let ey=A.crown+0.4;ey>=A.floor;ey-=0.28){
  let row=''
  for(let ez=-A.hw-0.3;ez<=A.hw+0.3;ez+=0.12){
    const dir=[1,(ey-eye[1])/(RM_X1-eye[0]),(ez-eye[2])/(RM_X1-eye[0])]
    const n=Math.hypot(...dir); const D=dir.map(v=>v/n)
    let lab='·', hp=null
    for(let s=0.2;s<=14;s+=0.05){const p=[eye[0]+D[0]*s,eye[1]+D[1]*s,eye[2]+D[2]*s]
      const L=label(p[0],p[1],p[2]); if(L){lab=L;hp=p;break}}
    row+=lab; if(lab==='R'&&ey<=A.crown) RH.push(hp)
  }
  console.log('  '+f(ey)+' '+row)
}

if(RH.length){const xs=RH.map(p=>p[0]),ys=RH.map(p=>p[1]),zs=RH.map(p=>Math.abs(p[2]))
console.log('\n★ 문 안쪽에서 보이는 리브 살: '+RH.length+'점')
console.log('   x '+f(Math.min(...xs))+'~'+f(Math.max(...xs))+'  y '+f(Math.min(...ys))+'~'+f(Math.max(...ys))+'  |z| '+f(Math.min(...zs))+'~'+f(Math.max(...zs)))
for(const p of RH.slice(0,6)) console.log('   x'+f(p[0])+' y'+f(p[1])+' z'+f(p[2])+'  자르개 크라운 '+f(ribArchCrownAt(p[0]))+'  살밑면(그 z) '+f(tubeInnerBottomAt(p[0],Math.abs(p[2]))))}
