export const SEGMENT = 160;
export const TRACK = Array.from({length:1200},(_,i)=>{
 const t=i/1200*Math.PI*2;
 return {index:i,curve:Math.sin(t*3)*1.1+Math.sin(t*5)*.45,hill:Math.sin(t*2)*800+Math.sin(t*5)*200,gate:i%120<4,fluxZone:i%240>155&&i%240<210};
});
export const LENGTH = TRACK.length*SEGMENT;
export function segmentAt(distance){return TRACK[Math.floor(((distance%LENGTH)+LENGTH)%LENGTH/SEGMENT)];}
