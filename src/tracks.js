// Each closed spline is the source for both road curvature and the course map.
export const SEGMENT = 160;
const definitions = [
  { id:'coast', level:1, name:'코랄 코스트', english:'CORAL COAST', subtitle:'바닷바람을 가르는 첫 번째 코너', difficulty:'입문', feature:'해안 대로 · 모래사장 · 얕은 물', width:1.48, count:900, hill:110, turn:76, bpm:116,
    points:[[15,75],[15,40],[28,16],[60,12],[86,24],[91,54],[77,79],[48,87]],
    theme:{kind:'coast',sky:'#57bde0',horizon:'#d7f2e8',ground:'#e7d29b',groundAlt:'#ddc88d',road:'#546476',roadAlt:'#506071',accent:'#ffd873',curb:'#f57071',mountain:'#82c9bf',foliage:'#2a9470'} },
  { id:'forest', level:2, name:'포레스트 리본', english:'FOREST RIBBON', subtitle:'숲속을 엮는 리드미컬한 S커브', difficulty:'초급', feature:'숲속 흙길 · 나무 다리 · S커브', width:1.32, count:1020, hill:380, turn:102, bpm:124,
    points:[[13,78],[12,40],[26,15],[51,13],[57,31],[42,46],[56,59],[80,42],[91,57],[83,83],[48,88]],
    theme:{kind:'forest',sky:'#8cbecd',horizon:'#e8edc8',ground:'#74a96d',groundAlt:'#699e61',road:'#535e5a',roadAlt:'#4e5955',accent:'#b9f885',curb:'#eee6c2',mountain:'#62958b',foliage:'#255f50'} },
  { id:'canyon', level:3, name:'레드록 헤어핀', english:'REDROCK HAIRPIN', subtitle:'붉은 협곡, 깊게 꺾어야 살아나는 라인', difficulty:'중급', feature:'사막 모래 · 자갈길 · 헤어핀', width:1.28, count:1120, hill:530, turn:125, bpm:132,
    points:[[10,84],[10,22],[23,12],[37,20],[37,57],[48,66],[57,55],[57,23],[72,13],[88,25],[90,70],[74,87],[42,88]],
    theme:{kind:'canyon',sky:'#e6a47c',horizon:'#ffe3b5',ground:'#b57851',groundAlt:'#aa6b47',road:'#685651',roadAlt:'#62514d',accent:'#ffcf74',curb:'#f5e2b6',mountain:'#a85f48',foliage:'#73976b'} },
  { id:'alpine', level:4, name:'알파인 스위치백', english:'ALPINE SWITCHBACK', subtitle:'설산의 오르막 끝에 기다리는 급커브', difficulty:'고급', feature:'눈길 · 빙판 · 스위치백', width:1.12, count:1200, hill:740, turn:151, bpm:140,
    points:[[10,85],[10,54],[24,42],[12,26],[24,11],[48,14],[50,34],[38,51],[52,63],[64,45],[65,18],[82,13],[92,33],[86,69],[68,86],[39,90]],
    theme:{kind:'alpine',sky:'#688fbf',horizon:'#e3efff',ground:'#e3edf2',groundAlt:'#d6e4ef',road:'#697b90',roadAlt:'#63758a',accent:'#a5f3ff',curb:'#df6685',mountain:'#a8c4dd',foliage:'#387885'} },
  { id:'metro', level:5, name:'네온 오버패스', english:'NEON OVERPASS', subtitle:'밤의 도시를 잇는 마지막 테크니컬 코스', difficulty:'마스터', feature:'넓은 4차로 · 시케인 · 고가도로', width:1.08, count:1300, hill:380, turn:180, bpm:148,
    points:[[10,84],[9,43],[23,32],[13,16],[31,9],[44,25],[36,45],[48,57],[60,42],[57,19],[75,10],[92,23],[81,41],[92,57],[82,80],[64,87],[50,74],[33,87]],
    theme:{kind:'metro',sky:'#141c43',horizon:'#725a8e',ground:'#222941',groundAlt:'#1e263d',road:'#34415b',roadAlt:'#303c56',accent:'#cfff69',curb:'#b388ff',mountain:'#303655',foliage:'#638baf'} },
];

function spline(points, index, t) {
  const n=points.length, a=points[(index+n-1)%n], b=points[index], c=points[(index+1)%n], d=points[(index+2)%n];
  return [0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t));
}
function buildTrack(def) {
  const dense=[];
  for(let i=0;i<def.points.length;i++) for(let j=0;j<80;j++) dense.push(spline(def.points,i,j/80));
  dense.push(dense[0]);
  const cumulative=[0];
  for(let i=1;i<dense.length;i++) cumulative.push(cumulative[i-1]+Math.hypot(dense[i][0]-dense[i-1][0],dense[i][1]-dense[i-1][1]));
  const points=[];let cursor=1;
  for(let i=0;i<def.count;i++) {
    const target=i/def.count*cumulative.at(-1);
    while(cumulative[cursor]<target) cursor++;
    const fraction=(target-cumulative[cursor-1])/(cumulative[cursor]-cumulative[cursor-1]);
    points.push(dense[cursor-1].map((v,k)=>v+(dense[cursor][k]-v)*fraction));
  }
  const curves=points.map((p,i)=>{
    const before=points[(i+def.count-4)%def.count],after=points[(i+4)%def.count];
    const a=Math.atan2(p[1]-before[1],p[0]-before[0]),b=Math.atan2(after[1]-p[1],after[0]-p[0]);
    return Math.max(-3.8,Math.min(3.8,Math.atan2(Math.sin(b-a),Math.cos(b-a))/4*def.turn));
  });
  const segments=points.map((point,i)=>{
    const curve=Array.from({length:9},(_,j)=>curves[(i+j-4+def.count)%def.count]).reduce((a,b)=>a+b)/9;
    return {index:i,point,curve,hill:Math.sin(i/def.count*Math.PI*4)*def.hill,
      fluxZone:Math.abs(curve)<.6&&i%180>80&&i%180<135,
      tunnel:def.id==='metro'&&i>def.count*.38&&i<def.count*.47};
  });
  return {...def,segments,length:segments.length*SEGMENT};
}
export const TRACKS=definitions.map(buildTrack);
export function getTrack(id){return TRACKS.find(track=>track.id===id)||TRACKS[0];}
export function segmentAt(distance,track=TRACKS[0]) {
  return track.segments[Math.floor(((distance%track.length)+track.length)%track.length/SEGMENT)];
}
export function routePath(track) {
  return track.segments.filter((_,i)=>i%6===0).map((seg,i)=>`${i?'L':'M'}${seg.point[0].toFixed(2)},${seg.point[1].toFixed(2)}`).join(' ')+' Z';
}
