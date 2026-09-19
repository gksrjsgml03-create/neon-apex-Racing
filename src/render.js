import { TRACK, SEGMENT, LENGTH, segmentAt } from './track.js';
const mix=(a,b,t)=>a+(b-a)*t;
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.resize();window.addEventListener('resize',()=>this.resize());}
 resize(){this.w=window.innerWidth;this.h=window.innerHeight;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
 kart(x,y,s,color,steer=0,boost=false,drift=false){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);c.rotate(steer*.07);
  c.fillStyle='#02071588';c.beginPath();c.ellipse(0,3,60,14,0,0,7);c.fill();
  if(boost){this.poly([[-33,-9],[-20,70+Math.random()*45],[-8,-9]],'#67fff1aa');this.poly([[8,-9],[20,70+Math.random()*45],[33,-9]],'#b8ff63bb');}
  c.fillStyle='#080d19';c.fillRect(-58,-48,22,49);c.fillRect(36,-48,22,49);c.fillRect(-48,-76,16,28);c.fillRect(32,-76,16,28);
  c.fillStyle='#405267';c.fillRect(-55,-45,5,30);c.fillRect(50,-45,5,30);
  this.poly([[-42,-63],[42,-63],[48,-16],[30,-3],[-30,-3],[-48,-16]],color);
  this.poly([[-36,-62],[-21,-84],[21,-84],[36,-62],[23,-39],[-23,-39]],'#26334c');
  c.fillStyle='#111827';c.fillRect(-24,-53,48,24);
  c.fillStyle=color;c.beginPath();c.ellipse(0,-77,23,26,0,0,7);c.fill();
  c.fillStyle='#e7faff';c.beginPath();c.ellipse(-4,-86,9,6,-.5,0,7);c.fill();
  this.poly([[-21,-74],[21,-74],[17,-63],[-17,-63]],'#122335');
  c.fillStyle='#11192c';c.fillRect(-47,-24,94,10);c.fillStyle=color;c.fillRect(-53,-30,106,8);
  c.fillStyle='#ff537e';c.fillRect(-36,-15,16,5);c.fillRect(20,-15,16,5);c.fillStyle='#d9edff';c.fillRect(-10,-15,20,6);
  if(drift){for(let i=0;i<7;i++){c.fillStyle=i%2?'#ffbd5a':'#df89ff';c.fillRect((steer>0?-58:58)+(Math.random()-.5)*30,Math.random()*35-10,4,10);}}
  c.restore();
 }
 draw(r,menu=false){
  const c=this.ctx,w=this.w,h=this.h,flux=r.flux,accent=flux?'#82fff0':'#d7ff61';
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,flux?'#101335':'#0a152d');sky.addColorStop(.48,flux?'#244664':'#374055');sky.addColorStop(1,'#091422');c.fillStyle=sky;c.fillRect(0,0,w,h);
  const horizon=h*.43;
  c.fillStyle='#bdd7c8';c.shadowColor='#b5f9e6';c.shadowBlur=40;c.beginPath();c.arc(w*.7,h*.21,35,0,7);c.fill();c.shadowBlur=0;
  const bend=segmentAt(r.distance).curve;
  for(let layer=0;layer<2;layer++)for(let i=-2;i<32;i++){
   const bw=w/24,bx=i*bw+Math.sin(r.distance/LENGTH*6)*40*(layer+1),bh=35+((i*71+layer*53+3000)%150)*(layer?.9:1.3);
   c.fillStyle=layer?'#0b172a':'#1d2b40';c.fillRect(bx,horizon-bh,bw*.85,bh+30);
   if(layer){for(let j=0;j<5;j++)for(let k=0;k<8;k++){if((i+j+k)%3===0){c.fillStyle=(i+k)%4?'#57afc83a':'#d7ff6166';c.fillRect(bx+8+j*bw*.13,horizon-bh+12+k*16,3,5);}}if(i%4===0){c.fillStyle=flux?'#65eeff':'#ad85da';c.fillRect(bx+3,horizon-bh+4,bw*.7,2);}}
  }
  c.fillStyle='#101e2a';c.fillRect(0,horizon,w,h-horizon);
  const wrapped=((r.distance%LENGTH)+LENGTH)%LENGTH;
  const base=Math.floor(wrapped/SEGMENT),fraction=(wrapped%SEGMENT)/SEGMENT;
  const camHeight=1000,depth=.85,roadWidth=1800;
  let curveX=0,curveDelta=0;const projected=[];
  for(let n=0;n<180;n++){
   const seg=TRACK[(base+n)%TRACK.length],z=(n-fraction)*SEGMENT+350;
   curveX+=curveDelta;curveDelta+=seg.curve*.55;
   const scale=depth/z;
   const y=horizon+scale*(camHeight-(seg.hill-segmentAt(r.distance).hill)*.28)*h*.67;
   projected.push({x:w*.5+scale*(curveX-r.x*roadWidth)*w*.5,y,half:scale*roadWidth*w*.5*(flux?.81:1),scale,seg,n,z});
  }
  // Far-to-near painter ordering keeps the road, scenery and rival karts together.
  for(let n=projected.length-2;n>=0;n--){
   const a=projected[n],b=projected[n+1];if(a.y<horizon-60||b.y>h+100)continue;
   const alt=Math.floor(a.seg.index/3)%2;
   this.poly([[a.x-a.half*1.32,a.y],[a.x+a.half*1.32,a.y],[b.x+b.half*1.32,b.y],[b.x-b.half*1.32,b.y]],alt?'#142635':'#12222e');
   this.poly([[a.x-a.half*1.04,a.y],[a.x+a.half*1.04,a.y],[b.x+b.half*1.04,b.y],[b.x-b.half*1.04,b.y]],alt?accent:'#263c4b');
   this.poly([[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y],[b.x-b.half,b.y]],flux?(alt?'#183c4b':'#173846'):(alt?'#283542':'#26323e'));
   if(alt)for(const lane of [-1/3,1/3])this.poly([[a.x+a.half*(lane-.007),a.y],[a.x+a.half*(lane+.007),a.y],[b.x+b.half*(lane+.007),b.y],[b.x+b.half*(lane-.007),b.y]],flux?'#80fff06a':'#b6c8d14a');
   if(a.seg.fluxZone){this.poly([[a.x-a.half*.27,a.y],[a.x+a.half*.27,a.y],[b.x+b.half*.27,b.y],[b.x-b.half*.27,b.y]],flux?'#73ffe67a':'#71999616');if(a.seg.index%6===0){c.fillStyle=flux?'#b4fff4':'#52717a';c.font=`bold ${Math.max(3,a.half*.13)}px sans-serif`;c.textAlign='center';c.fillText('» » »',a.x,a.y);}}
   if(a.seg.index<3){for(let k=0;k<14;k++)this.poly([[a.x+a.half*(-1+k/7),a.y],[a.x+a.half*(-1+(k+1)/7),a.y],[b.x+b.half*(-1+(k+1)/7),b.y],[b.x+b.half*(-1+k/7),b.y]],(k+a.seg.index)%2?'#eaf2eb':'#15212c');}
   if(a.seg.index%12===0){
    const poleH=a.scale*2100*h*.6;
    for(const side of [-1,1]){const px=a.x+side*a.half*1.2;c.strokeStyle='#3b5368';c.lineWidth=Math.max(1,a.half*.013);c.beginPath();c.moveTo(px,a.y);c.lineTo(px,a.y-poleH);c.lineTo(px-side*a.half*.17,a.y-poleH);c.stroke();c.strokeStyle=accent;c.lineWidth=Math.max(1,a.half*.018);c.beginPath();c.moveTo(px,a.y-poleH);c.lineTo(px-side*a.half*.17,a.y-poleH);c.stroke();}
   }
   if(a.seg.index%90===40){const px=a.x+a.half*1.55,pw=a.half*.55,ph=a.half*.3;c.fillStyle='#111e33';c.fillRect(px-pw/2,a.y-ph*2,pw,ph);c.strokeStyle=accent;c.lineWidth=1;c.strokeRect(px-pw/2,a.y-ph*2,pw,ph);c.fillStyle=accent;c.textAlign='center';c.font=`800 ${Math.max(4,pw*.16)}px sans-serif`;c.fillText('SHIFT ↗',px,a.y-ph*1.4);}
   for(const rival of r.rivals){const ahead=((rival.distance-r.distance)%LENGTH+LENGTH)%LENGTH;if(ahead>=n*SEGMENT&&ahead<(n+1)*SEGMENT){c.globalAlpha=flux?.4:1;this.kart(a.x+rival.x*a.half,a.y,a.half/400,rival.color);c.globalAlpha=1;}}
  }
  const playerScale=Math.min(w/850,h/540)*.95;
  if(menu){this.kart(w*.64,h*.82,playerScale*1.3,'#d7ff61',-.4,false,false);}else{this.kart(w*.5+Math.sin(r.time*40)*(r.drifting?3:0),h*.87,playerScale,flux?'#86fff0':'#d7ff61',r.visualSteer||0,r.boostTime>0,r.drifting);}
  if(r.boostTime>0&&!menu){c.strokeStyle='#bdffe955';c.lineWidth=2;for(let i=0;i<20;i++){const angle=i/20*Math.PI*2,rad=w*(.3+(i%4)*.08);c.beginPath();c.moveTo(w/2+Math.cos(angle)*rad,h/2+Math.sin(angle)*rad);c.lineTo(w/2+Math.cos(angle)*rad*1.3,h/2+Math.sin(angle)*rad*1.3);c.stroke();}}
  const fog=c.createLinearGradient(0,horizon-20,0,horizon+100);fog.addColorStop(0,'#66808e22');fog.addColorStop(1,'#66808e00');c.fillStyle=fog;c.fillRect(0,horizon-20,w,120);
 }
 map(canvas,r){const c=canvas.getContext('2d');c.clearRect(0,0,160,110);const point=d=>{const t=d/LENGTH*Math.PI*2;return [80+Math.cos(t)*61,55+Math.sin(t)*34+Math.sin(t*2)*9];};c.strokeStyle='#93acbe55';c.lineWidth=5;c.beginPath();for(let i=0;i<=120;i++){const [x,y]=point(i/120*LENGTH);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();for(const rival of r.rivals){const [x,y]=point(rival.distance);c.fillStyle=rival.color;c.beginPath();c.arc(x,y,3,0,7);c.fill();}const [x,y]=point(r.distance);c.fillStyle=r.flux?'#86fff0':'#d7ff61';c.beginPath();c.arc(x,y,5,0,7);c.fill();}
}
