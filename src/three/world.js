import * as THREE from '../../node_modules/three/build/three.module.js';
import { SEGMENT } from '../tracks.js';
import { roadPose, ROAD_HALF } from './road-space.js';
import { material, mesh, roundBox } from './models.js';

const point=(p,offset,y=0)=>[p.x+p.nx*offset,p.y+y,p.z+p.nz*offset];
function ribbon(track,left,right,height,mat,filter=()=>true,colors=false) {
  const positions=[],colorValues=[];
  for(let i=0;i<track.segments.length;i++) {
    if(!filter(i))continue;
    const a=roadPose(track,i*SEGMENT),b=roadPose(track,(i+1)*SEGMENT);
    const elevation=(pose,offset)=>typeof height==='function'?height(pose,offset):height;
    const vertices=[point(a,left,elevation(a,left)),point(a,right,elevation(a,right)),point(b,left,elevation(b,left)),point(b,right,elevation(b,right))];
    const color=new THREE.Color(Math.floor(i/4)%2?'#fbfbf0':'#f16c6d');
    for(const j of [0,1,2,1,3,2]){positions.push(...vertices[j]);if(colors)colorValues.push(color.r,color.g,color.b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colorValues,3));
  geometry.computeVertexNormals();const object=new THREE.Mesh(geometry,mat);object.receiveShadow=true;return object;
}
function wall(track,offset,mat) {
  const positions=[];
  for(let i=0;i<track.segments.length;i++) {
    const a=roadPose(track,i*SEGMENT),b=roadPose(track,(i+1)*SEGMENT);
    const topA=point(a,offset,-.25),topB=point(b,offset,-.25);
    topA[1]=3;topB[1]=3;
    for(const v of [topA,[topA[0],-9,topA[2]],topB,topB,[topA[0],-9,topA[2]],[topB[0],-9,topB[2]]])positions.push(...v);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return new THREE.Mesh(geo,mat);
}
function label(text,color='#203e73',background='#fff7dc',width=512,height=128) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,width,height);c.fillStyle=color;c.font=`900 ${Math.floor(height*.56)}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,width/2,height*.54,width*.91);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:texture,roughness:.7,side:THREE.DoubleSide});
}
function seeded(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

export function createWorld(track) {
  const root=new THREE.Group(),props=[],animated=[];const kind=track.theme.kind,rnd=seeded(track.level*319);
  const mats={
    grass:material(kind==='alpine'?'#ebf4ff':kind==='canyon'?'#e9b877':'#83c85d',{roughness:.95,metalness:0}),
    rock:material(kind==='alpine'?'#9bb8dc':kind==='canyon'?'#c98a5b':'#cfceab',{roughness:.9,side:THREE.DoubleSide,metalness:0,flatShading:true}),
    road:material(kind==='metro'?'#354762':'#687787',{roughness:.94,metalness:0}),
    white:material('#f9fcfa',{roughness:.7}),blue:material('#3b86dc'),wood:material('#9f7854'),
    leaf:material(kind==='alpine'?'#558f90':'#70b54c',{roughness:.85}),leafLight:material(kind==='alpine'?'#eef8ff':'#a3cf55',{roughness:.9}),
    red:material('#ef7b5f'),gold:material('#ffd573'),dark:material('#263d5c'),metal:material('#b3c8df',{metalness:.5,roughness:.4}),
  };
  const half=ROAD_HALF*track.width;
  const terrainHeight=(pose,offset)=>-.12-Math.max(0,Math.abs(offset)-half)/24*(pose.y-3);
  root.add(ribbon(track,-half-24,-half,terrainHeight,mats.grass),ribbon(track,-half,half,-.10,mats.grass),ribbon(track,half,half+24,terrainHeight,mats.grass));
  root.add(wall(track,-half-24,mats.rock),wall(track,half+24,mats.rock));
  root.add(ribbon(track,-half,half,.04,mats.road));
  const curb=material('#ffffff',{vertexColors:true,roughness:.8});
  root.add(ribbon(track,-half-.65,-half,.07,curb,()=>true,true),ribbon(track,half,half+.65,.07,curb,()=>true,true));
  for(const side of [-1,1]) {
    root.add(ribbon(track,side*(half-.18)-.05,side*(half-.18)+.05,.065,mats.white));
    root.add(ribbon(track,side*half*.33-.055,side*half*.33+.055,.068,mats.white,i=>i%20<7));
  }
  const padMat=material('#79f1ed',{emissive:'#2ec7df',emissiveIntensity:.35,transparent:true,opacity:.78});
  root.add(ribbon(track,-half*.22,half*.22,.083,padMat,i=>track.segments[i].fluxZone&&i%4<2));
  const water=mesh(root,new THREE.PlaneGeometry(2400,2400),material(kind==='metro'?'#467eb4':'#46b8d2',{roughness:.22,metalness:.24}),[0,-7,0]);water.rotation.x=-Math.PI/2;water.castShadow=false;

  function prop(distance,lateral,onGround=false) {
    const pose=roadPose(track,distance,lateral/ROAD_HALF),group=new THREE.Group();group.position.set(pose.x,pose.y+(onGround?terrainHeight(pose,lateral):0),pose.z);group.rotation.y=pose.yaw;root.add(group);props.push(group);return group;
  }
  function tree(g,s=1) {
    mesh(g,new THREE.CylinderGeometry(.28*s,.40*s,2.8*s,7),mats.wood,[0,1.4*s,0]);
    if(kind==='alpine') {
      for(let j=0;j<3;j++)mesh(g,new THREE.ConeGeometry((2.1-j*.4)*s,2.8*s,8),j%2?mats.leaf:mats.leafLight,[0,(2.6+j*1.3)*s,0]);
    }else {
      for(const [x,y,z,r] of [[0,4,0,2.25],[-1.2,3.5,.2,1.7],[1.1,4.1,.3,1.7],[0,5.1,0,1.7]])mesh(g,new THREE.IcosahedronGeometry(r*s,1),y>4?mats.leafLight:mats.leaf,[x*s,y*s,z*s]);
    }
  }
  function palm(g,s=1) {
    const trunk=mesh(g,new THREE.CylinderGeometry(.16*s,.32*s,5.5*s,9),mats.wood,[0,2.7*s,0]);trunk.rotation.z=.12;
    for(let j=0;j<7;j++) {
      const a=j/7*Math.PI*2,leaf=mesh(g,new THREE.SphereGeometry(1,12,7),j%2?mats.leafLight:mats.leaf,[Math.sin(a)*1.35*s,5.3*s,Math.cos(a)*1.35*s],[.50*s,.16*s,2.1*s]);leaf.rotation.y=a;leaf.rotation.x=.15;
    }
  }
  function house(g,index) {
    const h=3+(index%3)*1.3,w=3.8;
    roundBox(g,mats.white,[w,h,3.8],[0,h/2,0],.18);
    const roof=mesh(g,new THREE.ConeGeometry(3.15,1.8,4),index%2?mats.red:mats.blue,[0,h+.75,0]);roof.rotation.y=Math.PI/4;
    for(const x of [-1.05,1.05])for(let floor=0;floor<Math.floor(h/1.4);floor++){
      roundBox(g,mats.blue,[.74,.85,.1],[x,1.1+floor*1.35,-1.98],.06);
      mesh(g,new THREE.BoxGeometry(.08,.85,.08),mats.white,[x,1.1+floor*1.35,-2.05]);
    }
    roundBox(g,mats.wood,[.83,1.45,.13],[0,.75,-1.99],.12);
    const awning=mesh(g,new THREE.BoxGeometry(1.7,.16,1),index%2?mats.gold:mats.red,[0,2,-2.32]);awning.rotation.x=.14;
  }
  function rock(g,s=1) {
    for(let j=0;j<3;j++)mesh(g,new THREE.CylinderGeometry((1.5-j*.25)*s,(1.8-j*.20)*s,(2.1-j*.2)*s,7),j%2?mats.rock:mats.red,[0,(1+j*1.7)*s,0]);
  }
  const arrowMat=label('› › ›','#ffffff','#287bd5');
  for(let i=0;i<track.segments.length;i+=16) {
    const pose=roadPose(track,i*SEGMENT);
    for(const side of [-1,1]) {
      const barrier=prop(i*SEGMENT,side*(half+1));
      // Continuous low safety wall, visible from the chase camera without hiding turns.
      const next=roadPose(track,(i+16)*SEGMENT,side*(half+1)/ROAD_HALF),length=Math.hypot(next.x-barrier.position.x,next.z-barrier.position.z),rise=next.y-barrier.position.y;
      barrier.rotation.y=Math.atan2(-(next.x-barrier.position.x),-(next.z-barrier.position.z));
      const rail=mesh(barrier,new THREE.BoxGeometry(.35,.65,Math.hypot(length,rise)+.25),i%32?mats.white:mats.blue,[0,.62+rise/2,-length/2]);rail.rotation.x=Math.atan2(rise,length);rail.castShadow=false;
      mesh(barrier,new THREE.BoxGeometry(.42,1,.42),mats.white,[0,.5,0]).castShadow=false;
    }
    if(i%32===0&&Math.abs(track.segments[i].curve)>1.1) {
      const sign=prop(i*SEGMENT,(track.segments[i].curve>0?-1:1)*(half+2.5));
      mesh(sign,new THREE.CylinderGeometry(.09,.09,2.6,8),mats.metal,[0,1.3,0]);
      const board=mesh(sign,new THREE.PlaneGeometry(2.4,.95),arrowMat,[0,2.6,0]);if(track.segments[i].curve<0)board.rotation.z=Math.PI;
    }
  }
  for(let i=0;i<track.segments.length;i+=24)for(const side of [-1,1]) {
    const g=prop(i*SEGMENT,side*(half+5+rnd()*13),true);
    const index=Math.floor(i/24),scale=.8+rnd()*.7;g.rotation.y+=rnd()*.6;
    if(kind==='coast') {if(index%4===0)house(g,index);else if(index%3===0)palm(g,scale);else tree(g,scale*.8);}
    else if(kind==='forest') {if(index%9===0)house(g,index);else tree(g,scale*1.25);}
    else if(kind==='alpine') {if(index%8===0)house(g,index);else tree(g,scale);}
    else if(kind==='canyon') {
      if(index%3){rock(g,scale);}
      else {mesh(g,new THREE.CylinderGeometry(.4,.5,4.6,9),mats.leaf,[0,2.3,0]);for(const arm of [-1,1]){mesh(g,new THREE.BoxGeometry(1.4,.6,.6),mats.leaf,[arm*.7,2.3,0]);mesh(g,new THREE.CylinderGeometry(.3,.3,1.8,8),mats.leaf,[arm*1.3,3,0]);}}
    }else {
      const height=7+(index%6)*3.5;
      mesh(g,new THREE.BoxGeometry(5,height,5),index%2?mats.white:mats.blue,[0,height/2,0]);
      const windowMat=material(index%2?'#64d6f9':'#ffb4d1',{emissive:index%2?'#49b8f5':'#db709d',emissiveIntensity:.5});
      for(let row=0;row<Math.min(7,height/2);row++)mesh(g,new THREE.BoxGeometry(3.9,.72,5.06),windowMat,[0,1.8+row*2,0]);
    }
  }
  // Start gantry and chequered line.
  const gate=prop(2400,0),gateLabel=label('APEX  /  LET’S RACE!','#244a83','#ffdd67');
  for(const side of [-1,1]) {
    mesh(gate,new THREE.CylinderGeometry(.30,.43,6.5,10),mats.white,[side*(half+1.1),3.25,0]);
    mesh(gate,new THREE.BoxGeometry(1.1,1.1,1.1),mats.blue,[side*(half+1.1),.55,0]);
  }
  roundBox(gate,mats.blue,[half*2+3,1.65,.65],[0,6.35,0],.25);
  mesh(gate,new THREE.PlaneGeometry(half*1.7,1.2),gateLabel,[0,6.38,.34]);
  const line=prop(0,0);
  for(let row=0;row<3;row++)for(let col=0;col<20;col++){
    const tile=mesh(line,new THREE.PlaneGeometry(half/10,.65),((row+col)%2)?mats.white:mats.dark,[-half+(col+.5)*half/10,.085,(row-1)*.65]);tile.rotation.x=-Math.PI/2;tile.castShadow=false;
  }
  // Distant scenic plateaus, waterfalls and fluffy clouds.
  for(let i=0;i<20;i++) {
    const angle=i/20*Math.PI*2,radius=400+rnd()*100,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,height=35+rnd()*70;
    const mountain=new THREE.Group();mountain.position.set(x,-8,z);mountain.rotation.y=Math.atan2(-x,-z);root.add(mountain);
    mesh(mountain,new THREE.CylinderGeometry(18+rnd()*20,32+rnd()*25,height,7),mats.rock,[0,height/2,0]);
    mesh(mountain,new THREE.CylinderGeometry(28,30,3,8),mats.grass,[0,height,0]);
    for(const fraction of [.3,.65])mesh(mountain,new THREE.CylinderGeometry(29,30,1.3,7),mats.rock,[0,height*fraction,0]);
    if(kind==='coast'||kind==='forest') {
      const falls=mesh(mountain,new THREE.PlaneGeometry(8,height),material('#a4e9f4',{emissive:'#58bcd8',emissiveIntensity:.2,transparent:true,opacity:.78,side:THREE.DoubleSide}),[0,height/2,34]);animated.push({type:'fall',object:falls});
      const crown=new THREE.Group();crown.position.y=height;mountain.add(crown);tree(crown,3);
    }
    if(kind==='alpine')mesh(mountain,new THREE.ConeGeometry(33,height*.45,7),mats.white,[0,height,0]);
  }
  const cloudMat=material('#ffffff',{roughness:1});
  for(let i=0;i<18;i++) {
    const g=new THREE.Group();g.position.set((rnd()-.5)*1200,75+rnd()*80,(rnd()-.5)*1200);root.add(g);
    for(let j=0;j<4;j++) {const p=mesh(g,new THREE.SphereGeometry(1,12,8),cloudMat,[(j-1.5)*9,(j%2)*3,0],[12,6,7]);p.castShadow=false;p.receiveShadow=false;}
  }
  const blimp=new THREE.Group();blimp.position.set(35,65,-80);root.add(blimp);
  mesh(blimp,new THREE.SphereGeometry(1,24,14),mats.white,[0,0,0],[14,5.3,5.3]);
  roundBox(blimp,mats.blue,[6,2,3],[0,-5.5,0],.5);
  mesh(blimp,new THREE.PlaneGeometry(13,3.1),label('GOOD RACES!','#3377ce','#ffffff'),[0,.1,5.31]);
  animated.push({type:'blimp',object:blimp});
  return {root,props,animated,padMat};
}

export function disposeWorld(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of Array.isArray(object.material)?object.material:[object.material]){materials.add(m);if(m.map)textures.add(m.map);}});
  for(const geometry of geometries)geometry.dispose();for(const mat of materials)mat.dispose();for(const texture of textures)texture.dispose();
}
