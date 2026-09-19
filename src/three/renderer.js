import * as THREE from '../../node_modules/three/build/three.module.js';
import { roadPose } from './road-space.js';
import { createWorld, disposeWorld } from './world.js';
import { CHARACTERS, KARTS, makeKart, makeCharacter } from './models.js';
import { segmentAt } from '../tracks.js';
import { terrainAt } from '../terrain.js';

export class Renderer {
  constructor(canvas) {
    this.canvas=canvas;
    this.gpu=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.gpu.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.gpu.shadowMap.enabled=true;this.gpu.shadowMap.type=THREE.PCFSoftShadowMap;
    this.gpu.outputColorSpace=THREE.SRGBColorSpace;this.gpu.toneMapping=THREE.ACESFilmicToneMapping;this.gpu.toneMappingExposure=.96;
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(58,1,.1,1400);
    this.scene.add(new THREE.HemisphereLight('#d3edff','#c0ab88',1.8));
    this.sun=new THREE.DirectionalLight('#fff4dd',2.5);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:170});this.sun.shadow.normalBias=.055;this.sun.shadow.bias=-.00015;
    this.scene.add(this.sun,this.sun.target);
    this.fill=new THREE.DirectionalLight('#a6c9ff',.6);this.fill.position.set(-60,30,-70);this.scene.add(this.fill);
    this.characterId='ace';this.kartId='bolt';this.look=new THREE.Vector3();this.lastTime=performance.now();
    this.cameraMode='chase';this.fleet=new THREE.Group();this.scene.add(this.fleet);this.createFleet();
    this.effects=new THREE.Group();this.scene.add(this.effects);this.particles=[];
    this.shield=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:'#65eeff',transparent:true,opacity:.18,wireframe:true,depthWrite:false}));
    this.shield.scale.set(1.65,1.8,2.05);this.effects.add(this.shield);this.shield.visible=false;
    const smokeGeometry=new THREE.SphereGeometry(.12,7,5);
    for(let i=0;i<48;i++){const mat=new THREE.MeshBasicMaterial({color:i%2?'#b5eaff':'#ffdf83',transparent:true,opacity:0,depthWrite:false});const p=new THREE.Mesh(smokeGeometry,mat);p.visible=false;p.userData={life:0,velocity:new THREE.Vector3()};this.effects.add(p);this.particles.push(p);}
    this.particleCursor=0;this.resize();window.addEventListener('resize',()=>this.resize());
    document.documentElement.dataset.renderer='webgl-3d';
  }
  resize(){this.gpu.setSize(window.innerWidth,window.innerHeight,false);this.camera.aspect=window.innerWidth/window.innerHeight;this.camera.updateProjectionMatrix();}
  createFleet(){
    if(this.cars){for(const car of this.cars)disposeWorld(car);this.fleet.clear();}
    this.cars=[makeKart(this.kartId,this.characterId),...Array.from({length:5},(_,i)=>makeKart(KARTS[(i+1)%5].id,CHARACTERS[(i+1)%6].id))];
    this.cars.forEach(car=>this.fleet.add(car));
  }
  setAppearance(character,kart){if(character===this.characterId&&kart===this.kartId)return;this.characterId=character;this.kartId=kart;this.createFleet();}
  toggleCamera(){this.cameraMode=this.cameraMode==='chase'?'wide':'chase';return this.cameraMode;}
  portrait(id,kart=false){
    const scene=new THREE.Scene();scene.background=new THREE.Color('#eaf3ff');scene.add(new THREE.HemisphereLight('#ffffff','#a0b3c9',2));
    const light=new THREE.DirectionalLight('#ffffff',2.5);light.position.set(-3,5,-5);scene.add(light);
    const model=kart?makeKart(id,'ace'):makeCharacter(id);scene.add(model);
    const camera=new THREE.PerspectiveCamera(35,1,.1,50);camera.position.set(kart?3:1.5,kart?3.2:2.0,kart?-5.8:-4);camera.lookAt(0,kart?1:1.45,0);
    const size=128,target=new THREE.WebGLRenderTarget(size,size);target.texture.colorSpace=THREE.SRGBColorSpace;
    this.gpu.setRenderTarget(target);this.gpu.render(scene,camera);
    const pixels=new Uint8Array(size*size*4);this.gpu.readRenderTargetPixels(target,0,0,size,size,pixels);this.gpu.setRenderTarget(null);
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const context=canvas.getContext('2d'),data=context.createImageData(size,size);
    for(let y=0;y<size;y++)data.data.set(pixels.subarray((size-y-1)*size*4,(size-y)*size*4),y*size*4);
    context.putImageData(data,0,0);target.dispose();disposeWorld(model);return canvas.toDataURL('image/png');
  }
  loadTrack(track){
    if(this.world){this.scene.remove(this.world.root);disposeWorld(this.world.root);}
    this.track=track;this.world=createWorld(track);this.scene.add(this.world.root);
    const sky=track.id==='metro'?'#7798d0':'#87c8f1';this.scene.background=new THREE.Color(sky);this.scene.fog=new THREE.Fog(sky,190,750);
    this.snap=true;this.particles.forEach(p=>{p.visible=false;p.userData.life=0;});
  }
  placeCar(car,distance,lane,race,dt,player=false){
    const p=roadPose(race.track,distance,lane);
    const roll=player?(race.impactRoll||0):0;
    const bump=terrainAt(race.track,distance).bump*Math.sin(distance*.04)*Math.min(1,Math.abs(race.speed)/3000);
    car.position.set(p.x,p.y+.10+(player?(race.airHeight||0)+1.2*(1-Math.cos(roll)):0)+bump,p.z);
    const steer=player&&!race.overturned?(race.visualSteer||0):0;
    const slip=player?(race.drifting?.52:.10)*steer:0;
    const desired=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch,p.yaw-slip,roll+(player?-steer*(race.drifting?.055:.025):0),'YXZ'));
    if(this.snap)car.quaternion.copy(desired);else car.quaternion.slerp(desired,1-Math.exp(-dt*12));
    for(const wheel of car.userData.wheels){wheel.pivot.rotation.x-=race.speed*dt*.013;wheel.pivot.rotation.y=wheel.front?-steer*.28:0;}
    for(const fire of car.userData.flames){fire.visible=player&&race.boostTime>0;fire.scale.y=.75+Math.sin(race.time*47)*.22;}
    car.userData.driver.rotation.z=Math.sin(race.time*2)*.012-steer*.045;
    return p;
  }
  draw(race,menu=false){
    const now=performance.now(),dt=Math.max(.001,Math.min(.05,(now-this.lastTime)/1000));this.lastTime=now;
    if(this.track!==race.track)this.loadTrack(race.track);
    if(menu!==this.wasMenu){this.snap=true;this.wasMenu=menu;}
    if(this.respawnSerial!==race.respawnSerial){this.snap=true;this.respawnSerial=race.respawnSerial;this.particles.forEach(p=>{p.visible=false;p.userData.life=0;});}
    const p=this.placeCar(this.cars[0],race.distance,race.x,race,dt,true),position=new THREE.Vector3(p.x,p.y,p.z),tangent=new THREE.Vector3(p.tx,0,p.tz),right=new THREE.Vector3(p.nx,0,p.nz);
    this.shield.visible=!menu&&race.invulnerable>0;this.shield.position.copy(this.cars[0].position).add(new THREE.Vector3(0,1,0));this.shield.material.opacity=.14+Math.sin(race.time*24)*.06;
    for(let i=0;i<race.rivals.length;i++){
      const rival=race.rivals[i],car=this.cars[i+1];
      if(menu){
        car.visible=i<2;const offset=(i?1:-1)*3.4;
        this.placeCar(car,race.distance-450,offset/8,race,dt);car.position.y+=.02;
      }else{this.placeCar(car,rival.distance,rival.x,race,dt);car.visible=car.position.distanceToSquared(position)<180*180;}
    }
    let cameraPosition,target;
    if(menu){
      const orbit=Math.sin(race.time*.13)*.6;
      cameraPosition=position.clone().addScaledVector(tangent,5.8).addScaledVector(right,3.8+orbit*.3).add(new THREE.Vector3(0,3,0));
      target=position.clone().add(new THREE.Vector3(0,1.2,0));
    }else{
      const wide=this.cameraMode==='wide',boost=race.boostTime>0;
      cameraPosition=position.clone().addScaledVector(tangent,-(wide?11.5:8.5)-(boost?.65:0)).add(new THREE.Vector3(0,wide?6.1:4.8,0));
      target=position.clone().addScaledVector(tangent,6.5).add(new THREE.Vector3(0,.9,0));
      cameraPosition.y=Math.max(cameraPosition.y,roadPose(race.track,race.distance-1100).y+2.5);
    }
    const lerp=1-Math.exp(-dt*(menu?4:9));
    // Follow translation immediately; damp only the camera's relative orbit.
    // Otherwise high speed adds a growing camera lag and shrinks the kart.
    if(!this.snap&&this.previousPlayer){const movement=position.clone().sub(this.previousPlayer);this.camera.position.add(movement);this.look.add(movement);}
    if(this.snap){this.camera.position.copy(cameraPosition);this.look.copy(target);}else{this.camera.position.lerp(cameraPosition,lerp);this.look.lerp(target,lerp);}
    this.previousPlayer=position.clone();
    this.camera.lookAt(this.look);
    const w=window.innerWidth,h=window.innerHeight,heroHeight=h*(h<=800?.4:.43);
    if(menu){this.gpu.setViewport(0,h-heroHeight,w,heroHeight);this.camera.aspect=w/heroHeight;this.camera.setViewOffset(w,heroHeight,-w*.19,-heroHeight*.1,w,heroHeight);}
    else{this.gpu.setViewport(0,0,w,h);this.camera.aspect=w/h;this.camera.clearViewOffset();}
    const fov=menu?40:race.boostTime>0?66:58;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,1-Math.exp(-dt*5));this.camera.updateProjectionMatrix();
    this.sun.position.copy(position).add(new THREE.Vector3(-30,65,25));this.sun.target.position.copy(position);this.sun.target.updateMatrixWorld();
    for(const prop of this.world.props)prop.visible=prop.position.distanceToSquared(this.camera.position)<240*240;
    for(const item of this.world.animated){if(item.type==='blimp'){item.object.position.x=35+Math.sin(race.time*.06)*20;item.object.rotation.y=Math.sin(race.time*.04)*.2;}else item.object.material.opacity=.68+Math.sin(race.time*5)*.1;}
    this.world.padMat.emissiveIntensity=race.flux?1.5:.35;
    if(!menu&&race.drifting&&race.speed>0){
      for(const side of [-1,1]){
        const particle=this.particles[this.particleCursor++%this.particles.length];particle.position.copy(position).addScaledVector(right,side*.94).addScaledVector(tangent,-.85);particle.position.y+=.25;particle.userData.life=.55;particle.userData.velocity.copy(tangent).multiplyScalar(-4).addScaledVector(right,side*.7);particle.visible=true;
      }
    }
    for(const particle of this.particles){const data=particle.userData;if(data.life<=0)continue;data.life-=dt;particle.position.addScaledVector(data.velocity,dt);particle.position.y+=dt*.8;particle.scale.setScalar(1+(1-data.life/.55)*2.5);particle.material.opacity=Math.max(0,data.life/.55)*.65;particle.visible=data.life>0;}
    this.gpu.render(this.scene,this.camera);this.snap=false;
  }
  map(canvas,race){
    const c=canvas.getContext('2d'),track=race.track; c.clearRect(0,0,160,110);
    const point=d=>segmentAt(d,track).point.map((v,i)=>i?v*.95+6:v*1.35+12);
    c.lineJoin='round';c.beginPath();for(let i=0;i<=180;i++){const [x,y]=point(i/180*track.length);i?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle='#163c6688';c.lineWidth=8;c.stroke();c.strokeStyle='#ffffff';c.lineWidth=4;c.stroke();
    for(const rival of race.rivals){const [x,y]=point(rival.distance);c.fillStyle=rival.color;c.beginPath();c.arc(x,y,3,0,7);c.fill();}
    const [x,y]=point(race.distance);c.fillStyle='#ffd35b';c.strokeStyle='#285cac';c.lineWidth=2;c.beginPath();c.arc(x,y,5,0,7);c.fill();c.stroke();
  }
}
