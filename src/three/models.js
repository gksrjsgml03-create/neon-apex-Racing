import * as THREE from '../../node_modules/three/build/three.module.js';

export const CHARACTERS = [
  {id:'ace',name:'에이스',color:'#2870ee',kind:'human'},
  {id:'rosie',name:'로지',color:'#f36ea5',kind:'human'},
  {id:'shadow',name:'쉐도우',color:'#303e59',kind:'human'},
  {id:'fox',name:'루키',color:'#f4b338',kind:'fox'},
  {id:'panda',name:'바오',color:'#65a152',kind:'panda'},
  {id:'robot',name:'비트',color:'#79d5ed',kind:'robot'},
];
export const KARTS = [
  {id:'bolt',name:'블루 볼트',color:'#2876ed',trim:'#eaf4ff'},
  {id:'petal',name:'핑크 팝',color:'#f16c9d',trim:'#fff2f8'},
  {id:'ember',name:'블랙 엠버',color:'#e7573e',trim:'#253044'},
  {id:'sunny',name:'썬샤인',color:'#ffc13c',trim:'#fff3d5'},
  {id:'ranger',name:'그린 레인저',color:'#62a64e',trim:'#dce8cd'},
];
export function material(color, extra={}) {return new THREE.MeshStandardMaterial({color,roughness:.42,metalness:.12,...extra});}
export function mesh(parent, geometry, mat, position=[0,0,0], scale=[1,1,1]) {
  const m=new THREE.Mesh(geometry,mat);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function roundBox(parent,mat,size,pos,radius=.15) {
  const [w,h,d]=size,shape=new THREE.Shape(),x=-w/2,y=-h/2,r=Math.min(radius,w/3,h/3);
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.01,d-.12),bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06,curveSegments:4});geometry.translate(0,0,-(d-.12)/2);
  return mesh(parent,geometry,mat,pos);
}
function sphere(parent,mat,pos,scale){return mesh(parent,new THREE.SphereGeometry(1,24,16),mat,pos,scale);}

export function makeCharacter(id='ace') {
  const def=CHARACTERS.find(c=>c.id===id)||CHARACTERS[0],g=new THREE.Group();
  const suit=material(def.color),white=material('#f4f7ff'),black=material('#14243b'),skin=material('#ffd6b5'),light=material('#56dfff',{emissive:'#23befe',emissiveIntensity:1});
  sphere(g,suit,[0,1.07,.12],[.39,.46,.30]);
  for(const side of [-1,1]) {
    sphere(g,suit,[side*.40,1.09,-.09],[.17,.24,.18]);
    sphere(g,white,[side*.37,1,-.36],[.16,.15,.16]);
    sphere(g,black,[side*.22,.70,-.29],[.19,.16,.30]);
  }
  const head=new THREE.Group();head.position.set(0,1.80,.02);g.add(head);
  if(def.kind==='human') {
    sphere(head,def.id==='shadow'?black:white,[0,0,0],[.65,.65,.60]);
    sphere(head,skin,[0,-.12,-.40],[.50,.43,.27]);
    // Helmet crown, cheek guards and back stripe give the driver a silhouette from behind.
    sphere(head,suit,[0,.19,.07],[.17,.50,.55]);
    for(const side of [-1,1]) {
      sphere(head,suit,[side*.57,-.02,0],[.11,.29,.34]);
      sphere(head,light,[side*.42,.16,-.44],[.12,.14,.065]);
    }
    if(def.id==='rosie')for(const side of [-1,1])sphere(head,suit,[side*.64,-.05,.19],[.24,.29,.24]);
    if(def.id==='ace')mesh(head,new THREE.ConeGeometry(.13,.43,4),suit,[0,.73,.13]);
    roundBox(head,black,[.88,.11,.12],[0,.12,-.64],.04);
  } else if(def.kind==='robot') {
    sphere(head,white,[0,0,0],[.66,.57,.57]);
    sphere(head,black,[0,-.01,-.39],[.54,.40,.22]);
    mesh(head,new THREE.CylinderGeometry(.035,.035,.3,8),black,[0,.67,0]);sphere(head,light,[0,.85,0],[.11,.11,.11]);
  } else {
    const fur=def.kind==='fox'?material('#f2b241'):white;
    sphere(head,fur,[0,0,0],[.64,.59,.55]);sphere(head,white,[0,-.24,-.32],[.52,.32,.32]);
    for(const side of [-1,1]) {
      if(def.kind==='panda') {
        sphere(head,black,[side*.47,.46,0],[.23,.24,.20]);sphere(head,black,[side*.25,.0,-.49],[.23,.25,.065]);
      } else {
        const ear=mesh(head,new THREE.ConeGeometry(.24,.48,3),fur,[side*.44,.57,0]);ear.rotation.z=-side*.2;
        sphere(head,white,[side*.44,.56,-.12],[.10,.16,.06]);
      }
    }
    sphere(head,black,[0,-.21,-.63],[.10,.075,.05]);
  }
  for(const side of [-1,1]) {
    const eyeMat=def.kind==='robot'?light:black;
    sphere(head,eyeMat,[side*.22,-.07,-.655],[.115,.17,.055]);
    if(def.kind!=='robot')sphere(head,white,[side*.22-.025,-.015,-.70],[.035,.046,.023]);
  }
  if(def.kind==='human')roundBox(head,black,[.13,.035,.035],[0,-.31,-.65],.012);
  g.userData.head=head;
  return g;
}

export function makeKart(kartId='bolt',characterId='ace') {
  const def=KARTS.find(k=>k.id===kartId)||KARTS[0],g=new THREE.Group();
  const paint=material(def.color,{metalness:.26,roughness:.27}),shell=material(def.trim,{roughness:.29,metalness:.2}),dark=material('#19273c'),rubber=material('#1b2230',{roughness:.88,metalness:0}),rim=material('#b9cde4',{metalness:.7,roughness:.24});
  const glow=material('#8eeaff',{emissive:'#39b8ff',emissiveIntensity:1.2}),tail=material('#fa777b',{emissive:'#ff3434',emissiveIntensity:.65});
  roundBox(g,dark,[1.8,.22,2.9],[0,.41,0],.1);
  roundBox(g,paint,[1.65,.38,2.50],[0,.64,0],.2);
  sphere(g,shell,[0,.73,-.99],[.91,.40,.85]);
  sphere(g,paint,[0,.91,-1.05],[.40,.17,.63]);
  roundBox(g,dark,[.76,.20,.10],[0,.58,-1.69],.05);
  for(const side of [-1,1]) {
    const fender=sphere(g,shell,[side*.86,.63,-.25],[.25,.24,1.29]);
    fender.rotation.y=side*.05;
    const lamp=roundBox(g,glow,[.49,.12,.12],[side*.54,.73,-1.57],.04);lamp.rotation.z=-side*.12;
    roundBox(g,paint,[.24,.20,1.1],[side*.90,.52,.42],.08);
    roundBox(g,tail,[.38,.10,.10],[side*.56,.66,1.29],.03);
    mesh(g,new THREE.CylinderGeometry(.065,.065,.5,8),dark,[side*.56,1,1.02]);
  }
  roundBox(g,shell,[2.05,.13,.43],[0,1.25,1.08],.06);
  roundBox(g,paint,[1.77,.045,.22],[0,1.34,1.06],.02);
  roundBox(g,dark,[.79,.62,.23],[0,.97,.43],.11);
  const steering=mesh(g,new THREE.TorusGeometry(.28,.04,8,24),dark,[0,1.11,-.36]);steering.rotation.x=-.5;
  const driver=makeCharacter(characterId);driver.position.y=.04;g.add(driver);
  const wheels=[];
  for(const side of [-1,1])for(const z of [-.86,.90]) {
    const pivot=new THREE.Group();pivot.position.set(side*1.02,.44,z);g.add(pivot);
    const tire=mesh(pivot,new THREE.CylinderGeometry(.44,.44,.37,20),rubber);tire.rotation.z=Math.PI/2;
    const disc=mesh(pivot,new THREE.CylinderGeometry(.28,.28,.39,16),rim);disc.rotation.z=Math.PI/2;
    const hub=mesh(pivot,new THREE.CylinderGeometry(.11,.11,.405,12),paint);hub.rotation.z=Math.PI/2;
    for(let j=0;j<6;j++){const spoke=mesh(pivot,new THREE.BoxGeometry(.40,.035,.49),dark);spoke.rotation.x=j*Math.PI/3;}
    wheels.push({pivot,tire,front:z<0});
  }
  const flames=[];
  for(const side of [-1,1]) {
    const exhaust=mesh(g,new THREE.CylinderGeometry(.14,.14,.30,12),rim,[side*.47,.47,1.48]);exhaust.rotation.x=Math.PI/2;
    const fire=mesh(g,new THREE.ConeGeometry(.20,1.6,14),new THREE.MeshBasicMaterial({color:'#48d8ff',transparent:true,opacity:.8}),[side*.47,.48,2.25]);fire.rotation.x=Math.PI/2;fire.visible=false;flames.push(fire);
  }
  g.userData={wheels,flames,driver,paint};
  return g;
}
