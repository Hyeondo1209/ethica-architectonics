// _probe_spiralview.mjs — ★109 진단 3: 공리 나선 권역 전용 셀프 렌더
//  ★render_views.mjs의 사각지대(room)를 우회한다 — 이 도구는 사본을 두지 않고
//   axiomSpiralGeometry의 **실제 BufferGeometry를 그대로** 래스터한다.
//  사용: node src/_probe_spiralview.mjs x,y,z,yawDeg,pitchDeg [out.png]
import fs from 'fs'
import { PNG } from 'pngjs'
import { buildSpiralMass, buildSpiralColumns, buildSpiralBeams } from './axiomSpiralGeometry.js'

const arg = (process.argv[2] || '-5.8,92.6,-16.3,-422.9,-1.5').split(',').map(Number)
const [ex, ey, ez, yawD, pitchD] = arg
const out = process.argv[3] || '_spiralview.png'
const W = 1100, H = 700
const yaw = yawD * Math.PI / 180, pitch = pitchD * Math.PI / 180
const eye = [ex, ey, ez]

const tris = []
const push = (g, c) => {
  const p = g.getAttribute('position').array
  for (let t = 0; t < p.length / 9; t++) {
    const b = t * 9
    tris.push({ v: [[p[b],p[b+1],p[b+2]],[p[b+3],p[b+4],p[b+5]],[p[b+6],p[b+7],p[b+8]]], c })
  }
}
push(buildSpiralMass(),    [206, 178, 118])
push(buildSpiralColumns(), [176, 150,  98])
push(buildSpiralBeams(),   [150, 128,  84])

const f  = [-Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)]
const zA = [-f[0], -f[1], -f[2]]
let xA = [zA[2], 0, -zA[0]]; const xl = Math.hypot(...xA); xA = xA.map(v => v/(xl||1))
const yA = [zA[1]*xA[2]-zA[2]*xA[1], zA[2]*xA[0]-zA[0]*xA[2], zA[0]*xA[1]-zA[1]*xA[0]]
const focal = (H/2)/Math.tan(35*Math.PI/180), NEAR = 0.3
const zbuf = new Float32Array(W*H).fill(Infinity)
const img = Buffer.alloc(W*H*4)
for (let i = 0; i < W*H; i++) { img[i*4]=14; img[i*4+1]=12; img[i*4+2]=9; img[i*4+3]=255 }
const Lg = (() => { const v=[0.45,1,0.3], l=Math.hypot(...v); return v.map(x=>x/l) })()
const cam = (p) => { const r=[p[0]-eye[0],p[1]-eye[1],p[2]-eye[2]]
  return [r[0]*xA[0]+r[1]*xA[1]+r[2]*xA[2], r[0]*yA[0]+r[1]*yA[1]+r[2]*yA[2], r[0]*zA[0]+r[1]*zA[1]+r[2]*zA[2]] }

for (const t of tris) {
  const e1=[t.v[1][0]-t.v[0][0],t.v[1][1]-t.v[0][1],t.v[1][2]-t.v[0][2]]
  const e2=[t.v[2][0]-t.v[0][0],t.v[2][1]-t.v[0][1],t.v[2][2]-t.v[0][2]]
  let n=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
  const nl=Math.hypot(...n); if (nl<1e-9) continue; n=n.map(v=>v/nl)
  const sh=Math.min(1, 0.30+0.75*Math.abs(n[0]*Lg[0]+n[1]*Lg[1]+n[2]*Lg[2]))
  const col=[t.c[0]*sh, t.c[1]*sh, t.c[2]*sh]
  let poly=t.v.map(cam), o=[]
  for (let i=0;i<poly.length;i++){ const a=poly[i], b=poly[(i+1)%poly.length]
    const ain=a[2]<=-NEAR, bin=b[2]<=-NEAR
    if (ain) o.push(a)
    if (ain!==bin){ const s=(-NEAR-a[2])/(b[2]-a[2]); o.push([a[0]+s*(b[0]-a[0]),a[1]+s*(b[1]-a[1]),-NEAR]) } }
  if (o.length<3) continue
  for (let k=1;k<o.length-1;k++){
    const P=[o[0],o[k],o[k+1]].map(p=>[W/2+p[0]*focal/(-p[2]), H/2-p[1]*focal/(-p[2]), -p[2]])
    const area=(P[1][0]-P[0][0])*(P[2][1]-P[0][1])-(P[2][0]-P[0][0])*(P[1][1]-P[0][1])
    if (Math.abs(area)<1e-6) continue
    const x0=Math.max(0,Math.floor(Math.min(P[0][0],P[1][0],P[2][0]))), x1=Math.min(W-1,Math.ceil(Math.max(P[0][0],P[1][0],P[2][0])))
    const y0=Math.max(0,Math.floor(Math.min(P[0][1],P[1][1],P[2][1]))), y1=Math.min(H-1,Math.ceil(Math.max(P[0][1],P[1][1],P[2][1])))
    for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++){
      const w0=((P[1][0]-x)*(P[2][1]-y)-(P[2][0]-x)*(P[1][1]-y))/area
      const w1=((P[2][0]-x)*(P[0][1]-y)-(P[0][0]-x)*(P[2][1]-y))/area
      const w2=1-w0-w1
      if (w0<0||w1<0||w2<0) continue
      const z=w0*P[0][2]+w1*P[1][2]+w2*P[2][2], idx=y*W+x
      if (z<zbuf[idx]){ zbuf[idx]=z; img[idx*4]=col[0]; img[idx*4+1]=col[1]; img[idx*4+2]=col[2] }
    }
  }
}
const png=new PNG({width:W,height:H}); img.copy(png.data)
fs.writeFileSync(out, PNG.sync.write(png))
console.log('wrote', out, `(${tris.length} tris)  eye ${eye} yaw ${yawD} pitch ${pitchD}`)
