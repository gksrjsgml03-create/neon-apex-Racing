import { SEGMENT, segmentAt } from './tracks.js';
import { background, landmark } from './scenery.js';
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.resize();window.addEventListener('resize',()=>this.resize());}
 resize(){this.w=window.innerWidth;this.h=window.innerHeight;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*d;this.canvas.height=this.h*d;this.ctx.setTransform(d,0,0,d,0,0);}
 poly(points,color){const c=this.ctx;c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.strokeStyle=color;c.lineWidth=.7;c.stroke();}
 kart(x,y,s,color,steer=0,boost=false,drift=false){
  const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);c.rotate(steer*(drift?.24:.085));
  c.fillStyle='#02071588';c.beginPath();c.ellipse(0,3,60,14,0,0,7);c.fill();
  if(boost){this.poly([[-33,-9],[-20,70+Math.random()*45],[-8,-9]],'#67fff1aa');this.poly([[8,-9],[20,70+Math.random()*45],[33,-9]],'#b8ff63bb');}
  c.fillStyle='#080d19';c.fillRect(-58,-48,22,49);c.fillRect(36,-48,22,49);c.fillRect(-48,-76,16,28);c.fillRect(32,-76,16,28);
  c.fillStyle='#405267';c.fillRect(-55,-45,5,30);c.fillRect(50,-45,5,30);
  const paint=c.createLinearGradient(-45,-70,45,0);paint.addColorStop(0,'#f3ffdf');paint.addColorStop(.25,color);paint.addColorStop(1,'#50898a');
  this.poly([[-42,-63],[42,-63],[48,-16],[30,-3],[-30,-3],[-48,-16]],paint);
  this.poly([[-36,-62],[-21,-84],[21,-84],[36,-62],[23,-39],[-23,-39]],'#26334c');
  c.fillStyle='#111827';c.fillRect(-24,-53,48,24);
  c.fillStyle=color;c.beginPath();c.ellipse(0,-77,23,26,0,0,7);c.fill();
  c.fillStyle='#e7faff';c.beginPath();c.ellipse(-4,-86,9,6,-.5,0,7);c.fill();
  this.poly([[-21,-74],[21,-74],[17,-63],[-17,-63]],'#122335');
  c.fillStyle='#11192c';c.fillRect(-47,-24,94,10);c.fillStyle=color;c.fillRect(-53,-30,106,8);
  c.fillStyle='#ffffff80';c.fillRect(-48,-30,96,2);c.fillStyle='#1b3441';c.fillRect(-5,-27,10,13);
  c.fillStyle='#ff537e';c.fillRect(-36,-15,16,5);c.fillRect(20,-15,16,5);c.fillStyle='#d9edff';c.fillRect(-10,-15,20,6);
  if(drift){for(let i=0;i<7;i++){c.fillStyle=i%2?'#ffbd5a':'#df89ff';c.fillRect((steer>0?-58:58)+(Math.random()-.5)*30,Math.random()*35-10,4,10);}for(let i=0;i<4;i++){c.fillStyle='#effaff22';c.beginPath();c.ellipse(-steer*(65+i*14),15+i*9,12+i*5,9+i*3,0,0,7);c.fill();}}
  c.restore();
 }
 draw(r,menu=false){
  const c=this.ctx,w=this.w,h=this.h,flux=r.flux,track=r.track,theme=track.theme,accent=flux?'#82fff0':theme.accent;
  const TRACK=track.segments,LENGTH=track.length;
  const horizon=background(c,w,h,track,r.distance,r.time,flux);
  const cameraDistance=r.distance-1000;
  const wrapped=((cameraDistance%LENGTH)+LENGTH)%LENGTH;
  const base=Math.floor(wrapped/SEGMENT),fraction=(wrapped%SEGMENT)/SEGMENT;
  const camHeight=1000,depth=.85,roadWidth=1800;
  let curveX=0,curveDelta=0;const projected=[];
  for(let n=0;n<180;n++){
   const seg=TRACK[(base+n)%TRACK.length],z=(n-fraction)*SEGMENT+350;
   curveX+=curveDelta;curveDelta+=seg.curve*1.15;
   const scale=depth/z;
   const y=horizon+scale*(camHeight-(seg.hill-segmentAt(r.distance,track).hill)*.38)*h*.67;
   projected.push({x:w*.5+scale*(curveX-r.x*roadWidth)*w*.5,y,half:scale*roadWidth*w*.5*track.width*(flux?.81:1),scale,seg,n,z});
  }
  // Far-to-near painter ordering keeps the road, scenery and rival karts together.
  for(let n=projected.length-2;n>=0;n--){
   const a=projected[n],b=projected[n+1];if(a.y<horizon-60||b.y>h+100)continue;
   const alt=Math.floor(a.seg.index/3)%2;
   this.poly([[a.x-a.half*2.8,a.y],[a.x+a.half*2.8,a.y],[b.x+b.half*2.8,b.y],[b.x-b.half*2.8,b.y]],alt?theme.ground:theme.groundAlt);
   this.poly([[a.x-a.half*1.06,a.y],[a.x+a.half*1.06,a.y],[b.x+b.half*1.06,b.y],[b.x-b.half*1.06,b.y]],alt?theme.curb:'#f5f5e5');
   this.poly([[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y],[b.x-b.half,b.y]],flux?(alt?'#285766':'#245260'):(alt?theme.road:theme.roadAlt));
   for(const side of [-1,1]){
    this.poly([[a.x+side*a.half*.97,a.y],[a.x+side*a.half*.955,a.y],[b.x+side*b.half*.955,b.y],[b.x+side*b.half*.97,b.y]],'#edf1de');
    const rail=a.half*.10,backRail=b.half*.10;
    this.poly([[a.x+side*a.half*1.1,a.y-rail],[a.x+side*a.half*1.1,a.y-rail*.5],[b.x+side*b.half*1.1,b.y-backRail*.5],[b.x+side*b.half*1.1,b.y-backRail]],alt?'#cad7d9':'#94acb3');
   }
   if(alt)for(const lane of [-1/3,1/3])this.poly([[a.x+a.half*(lane-.007),a.y],[a.x+a.half*(lane+.007),a.y],[b.x+b.half*(lane+.007),b.y],[b.x+b.half*(lane-.007),b.y]],flux?'#80fff06a':'#b6c8d14a');
   if(a.seg.fluxZone){this.poly([[a.x-a.half*.27,a.y],[a.x+a.half*.27,a.y],[b.x+b.half*.27,b.y],[b.x-b.half*.27,b.y]],flux?'#73ffe67a':'#71999616');if(a.seg.index%6===0){c.fillStyle=flux?'#b4fff4':'#52717a';c.font=`bold ${Math.max(3,a.half*.13)}px sans-serif`;c.textAlign='center';c.fillText('» » »',a.x,a.y);}}
   if(a.seg.index<3){for(let k=0;k<14;k++)this.poly([[a.x+a.half*(-1+k/7),a.y],[a.x+a.half*(-1+(k+1)/7),a.y],[b.x+b.half*(-1+(k+1)/7),b.y],[b.x+b.half*(-1+k/7),b.y]],(k+a.seg.index)%2?'#eaf2eb':'#15212c');}
   if(a.seg.index%18===0){
    for(const side of [-1,1])landmark(c,a.x+side*a.half*(1.65+(a.seg.index%3)*.16),a.y,a.half*.58,theme,Math.floor(a.seg.index/18)+side);
   }
   if(a.seg.index%24===0&&theme.kind==='metro'){
    const poleH=a.scale*2100*h*.6;
    for(const side of [-1,1]){const px=a.x+side*a.half*1.2;c.strokeStyle='#3b5368';c.lineWidth=Math.max(1,a.half*.013);c.beginPath();c.moveTo(px,a.y);c.lineTo(px,a.y-poleH);c.lineTo(px-side*a.half*.17,a.y-poleH);c.stroke();c.strokeStyle=accent;c.lineWidth=Math.max(1,a.half*.018);c.beginPath();c.moveTo(px,a.y-poleH);c.lineTo(px-side*a.half*.17,a.y-poleH);c.stroke();}
   }
   if(a.seg.index%16===0&&Math.abs(a.seg.curve)>1.05){
    const side=a.seg.curve>0?-1:1,px=a.x+side*a.half*1.21,pw=a.half*.26,py=a.y-a.half*.28;
    c.fillStyle='#233c4b';c.fillRect(px-pw/2,py-pw*.6,pw,pw*.6);c.strokeStyle=accent;c.lineWidth=Math.max(1,pw*.025);c.strokeRect(px-pw/2,py-pw*.6,pw,pw*.6);c.fillStyle=accent;c.textAlign='center';c.font=`900 ${Math.max(3,pw*.6)}px sans-serif`;c.fillText(a.seg.curve>0?'»':'«',px,py-pw*.07);
   }
   if(a.seg.tunnel&&a.seg.index%8===0){
    const roof=a.y-a.half*.95;c.strokeStyle='#343c63';c.lineWidth=Math.max(2,a.half*.055);c.beginPath();c.moveTo(a.x-a.half*1.1,a.y);c.lineTo(a.x-a.half*1.1,roof);c.lineTo(a.x+a.half*1.1,roof);c.lineTo(a.x+a.half*1.1,a.y);c.stroke();c.strokeStyle=accent;c.lineWidth=Math.max(1,a.half*.008);c.beginPath();c.moveTo(a.x-a.half*.95,roof+5);c.lineTo(a.x+a.half*.95,roof+5);c.stroke();
   }
   if(a.seg.index===8){
    const top=a.y-a.half*.95;c.fillStyle='#20374c';c.fillRect(a.x-a.half*1.12,top,a.half*.075,a.half*.95);c.fillRect(a.x+a.half*1.04,top,a.half*.075,a.half*.95);c.fillStyle=accent;c.fillRect(a.x-a.half*1.12,top,a.half*2.24,a.half*.18);c.fillStyle='#213045';c.textAlign='center';c.font=`900 ${Math.max(5,a.half*.095)}px sans-serif`;c.fillText('NEON APEX  /  START',a.x,top+a.half*.12);
   }
   if(a.seg.index%90===40){const px=a.x+a.half*1.55,pw=a.half*.55,ph=a.half*.3;c.fillStyle='#111e33';c.fillRect(px-pw/2,a.y-ph*2,pw,ph);c.strokeStyle=accent;c.lineWidth=1;c.strokeRect(px-pw/2,a.y-ph*2,pw,ph);c.fillStyle=accent;c.textAlign='center';c.font=`800 ${Math.max(4,pw*.16)}px sans-serif`;c.fillText('SHIFT ↗',px,a.y-ph*1.4);}
   for(const rival of r.rivals){const ahead=((rival.distance-cameraDistance)%LENGTH+LENGTH)%LENGTH;if(ahead>=n*SEGMENT&&ahead<(n+1)*SEGMENT){c.globalAlpha=flux?.4:1;this.kart(a.x+rival.x/track.width*a.half,a.y,a.half/(650*track.width),rival.color);c.globalAlpha=1;}}
  }
  const playerScale=Math.min(w/850,h/540)*.95;
  if(menu){this.kart(w*.64,h*.82,playerScale*1.3,'#d7ff61',-.4,false,false);}else{this.kart(w*.5+Math.sin(r.time*40)*(r.drifting?3:0),h*.87,playerScale,flux?'#86fff0':'#d7ff61',r.visualSteer||0,r.boostTime>0,r.drifting);}
  if(r.boostTime>0&&!menu){c.strokeStyle='#bdffe955';c.lineWidth=2;for(let i=0;i<20;i++){const angle=i/20*Math.PI*2,rad=w*(.3+(i%4)*.08);c.beginPath();c.moveTo(w/2+Math.cos(angle)*rad,h/2+Math.sin(angle)*rad);c.lineTo(w/2+Math.cos(angle)*rad*1.3,h/2+Math.sin(angle)*rad*1.3);c.stroke();}}
  const fog=c.createLinearGradient(0,horizon-20,0,horizon+100);fog.addColorStop(0,'#66808e22');fog.addColorStop(1,'#66808e00');c.fillStyle=fog;c.fillRect(0,horizon-20,w,120);
 }
 map(canvas,r){const c=canvas.getContext('2d'),track=r.track;c.clearRect(0,0,160,110);const point=d=>segmentAt(d,track).point.map((v,i)=>i?v*.95+6:v*1.35+12);c.strokeStyle='#06152988';c.lineWidth=9;c.lineJoin='round';c.beginPath();for(let i=0;i<=180;i++){const [x,y]=point(i/180*track.length);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.strokeStyle='#effbff99';c.lineWidth=4;c.stroke();for(const rival of r.rivals){const [x,y]=point(rival.distance);c.fillStyle=rival.color;c.beginPath();c.arc(x,y,3,0,7);c.fill();}const [x,y]=point(r.distance);c.fillStyle=r.flux?'#86fff0':track.theme.accent;c.beginPath();c.arc(x,y,5,0,7);c.fill();}
}
