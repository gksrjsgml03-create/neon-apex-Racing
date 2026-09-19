import * as THREE from '../../node_modules/three/build/three.module.js';
import { SURFACES } from '../terrain.js';

export function surfaceMaterials() {
  return Object.fromEntries(Object.entries(SURFACES).map(([id,surface])=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d');c.fillStyle=surface.color;c.fillRect(0,0,256,256);
    let seed=71;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<1100;i++){
      c.fillStyle=i%2?'#ffffff16':'#44332212';
      c.fillRect(random()*256,random()*256,1+random()*3,1+random()*2);
    }
    c.lineWidth=id==='wood'?5:2;c.strokeStyle=id==='water'?'#ffffff55':id==='ice'?'#ffffff88':'#77583324';
    if(['sand','water','wood','ice'].includes(id))for(let y=0;y<256;y+=id==='wood'?32:24){
      c.beginPath();for(let x=0;x<=256;x+=8){const v=y+(id==='wood'?0:Math.sin(x/256*Math.PI*4)*4);x?c.lineTo(x,v):c.moveTo(x,v);}c.stroke();
    }
    const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;
    return [id,new THREE.MeshStandardMaterial({map,roughness:['water','ice'].includes(id)?.22:.94,metalness:id==='water'?.15:0})];
  }));
}
