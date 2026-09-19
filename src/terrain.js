export const SURFACES = {
  asphalt:{id:'asphalt',name:'아스팔트',color:'#647587',grip:1,speed:1,bump:0},
  sand:{id:'sand',name:'모래',color:'#e4c08a',grip:.82,speed:.88,bump:.018},
  dirt:{id:'dirt',name:'숲속 흙길',color:'#aa835a',grip:.91,speed:.94,bump:.022},
  gravel:{id:'gravel',name:'자갈길',color:'#a6a097',grip:.86,speed:.92,bump:.03},
  water:{id:'water',name:'해변 얕은 물',color:'#77d6df',grip:.76,speed:.76,bump:.012},
  snow:{id:'snow',name:'눈길',color:'#e6effa',grip:.81,speed:.92,bump:.012},
  ice:{id:'ice',name:'빙판',color:'#b1e0ef',grip:.59,speed:.97,bump:0},
  wood:{id:'wood',name:'나무 다리',color:'#af8455',grip:.95,speed:.96,bump:.012},
};
const routes = {
  coast:[[.18,'asphalt'],[.43,'sand'],[.57,'water'],[.79,'sand'],[1,'asphalt']],
  forest:[[.30,'dirt'],[.38,'wood'],[.70,'dirt'],[.79,'wood'],[1,'dirt']],
  canyon:[[.43,'sand'],[.60,'gravel'],[1,'sand']],
  alpine:[[.28,'snow'],[.46,'ice'],[.74,'snow'],[.86,'ice'],[1,'snow']],
  metro:[[1,'asphalt']],
};
export function surfaceIdAt(trackId, progress) {
  const wrapped=((progress%1)+1)%1;
  return (routes[trackId]||routes.metro).find(([end])=>wrapped<end)?.[1]||'asphalt';
}
export function terrainAt(track,distance) {return SURFACES[surfaceIdAt(track.id,distance/track.length)];}
