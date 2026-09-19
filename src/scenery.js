function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}

export function background(c,w,h,track,distance,time,flux) {
  const t=track.theme,horizon=h*.43;
  const sky=c.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,flux?'#303360':t.sky);sky.addColorStop(1,flux?'#a4c7ce':t.horizon);
  c.fillStyle=sky;c.fillRect(0,0,w,h);
  c.fillStyle=t.kind==='metro'?'#fff0d0':'#fff5ca';c.globalAlpha=.85;
  c.beginPath();c.arc(w*.76,h*.17,t.kind==='metro'?25:38,0,Math.PI*2);c.fill();c.globalAlpha=1;
  if(t.kind!=='metro')for(let i=0;i<7;i++){
    const x=((i*w*.19+time*3)%(w+180))-90,y=h*.1+(i%3)*23;
    c.fillStyle='#ffffff75';c.beginPath();c.ellipse(x,y,60+(i%2)*30,12,0,0,7);c.fill();
  }
  const offset=Math.sin(distance/track.length*Math.PI*2)*w*.035;
  for(let layer=0;layer<2;layer++) {
    if(t.kind==='metro') {
      for(let i=-1;i<27;i++) {
        const bw=w/23,x=i*bw+offset*(layer+1),bh=45+((i*71+layer*53+3000)%135)*(layer?.9:1.3);
        c.fillStyle=layer?'#1c2644':'#484465';c.fillRect(x,horizon-bh,bw*.84,bh+20);
        c.fillStyle=i%2?'#94dbe568':'#f6a4d690';
        for(let row=0;row<7;row++)for(let col=0;col<4;col++)if((row+col+i)%3) c.fillRect(x+8+col*bw*.16,horizon-bh+15+row*16,4,5);
        c.fillStyle=t.accent;c.fillRect(x+5,horizon-bh+3,bw*.65,2);
      }
    } else {
      for(let i=-1;i<9;i++) {
        const x=i*w/6+offset*(layer+1),height=(50+(i*71+3000)%115)*(t.kind==='coast'?.48:1);
        const color=layer?t.mountain:t.mountain+'88';
        if(t.kind==='canyon') polygon(c,[[x-w*.13,horizon+10],[x-w*.10,horizon-height],[x+w*.015,horizon-height],[x+w*.1,horizon-height*.5],[x+w*.14,horizon+10]],color);
        else polygon(c,[[x-w*.15,horizon+10],[x,horizon-height],[x+w*.19,horizon+10]],color);
        if(t.kind==='alpine') polygon(c,[[x-w*.032,horizon-height*.75],[x,horizon-height],[x+w*.04,horizon-height*.77],[x+w*.015,horizon-height*.82],[x,horizon-height*.73]],'#f3f7ff');
      }
    }
  }
  c.fillStyle=t.ground;c.fillRect(0,horizon,w,h-horizon);
  if(t.kind==='coast') {
    c.fillStyle='#39b5ce';c.fillRect(0,horizon,w,h*.08);
    for(let i=0;i<7;i++){c.strokeStyle='#e1ffff70';c.lineWidth=2;c.beginPath();const y=horizon+i*9;c.moveTo(0,y);for(let x=0;x<w;x+=30)c.lineTo(x,y+Math.sin(x*.02+time+i)*2);c.stroke();}
  }
  return horizon;
}

export function landmark(c,x,y,size,theme,index) {
  if(size<2)return;
  c.save();c.translate(x,y);c.scale(size/100,size/100);
  const kind=theme.kind;
  c.fillStyle='#142b3324';c.beginPath();c.ellipse(0,0,46,8,0,0,7);c.fill();
  if(kind==='coast') {
    c.strokeStyle='#9e7049';c.lineWidth=10;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-15,-70,7,-140);c.stroke();
    for(let i=0;i<6;i++){const angle=i/6*Math.PI*2;polygon(c,[[7,-140],[7+Math.cos(angle)*60,-137+Math.sin(angle)*28],[7+Math.cos(angle+.7)*37,-145+Math.sin(angle+.7)*22]],i%2?'#27855e':'#38a66b');}
    if(index%3===0){c.fillStyle='#fff0cd';c.fillRect(-50,-15,32,5);polygon(c,[[-61,-48],[-32,-64],[-4,-48]],'#f87e74');c.strokeStyle='#805849';c.lineWidth=3;c.beginPath();c.moveTo(-32,-64);c.lineTo(-32,0);c.stroke();}
  } else if(kind==='forest'||kind==='alpine') {
    c.fillStyle='#745b44';c.fillRect(-7,-68,14,68);
    for(let i=0;i<3;i++){
      const top=-145+i*35,bottom=-50+i*25,spread=34+i*12;
      polygon(c,[[-spread,bottom],[0,top],[spread,bottom]],i%2?theme.foliage:'#317b62');
      if(kind==='alpine')polygon(c,[[-spread*.64,top+(bottom-top)*.64],[0,top],[spread*.65,top+(bottom-top)*.65]],'#eff8ff');
    }
    if(kind==='forest'&&index%2===0){c.fillStyle='#f9d079';c.beginPath();c.arc(30,-7,7,0,7);c.fill();}
  } else if(kind==='canyon') {
    polygon(c,[[-46,0],[-37,-80],[-17,-132],[28,-120],[46,-48],[41,0]],'#af6446');
    polygon(c,[[-17,-132],[28,-120],[46,-48],[4,-60]],'#d08c58');
    c.fillStyle='#e2a36a';c.fillRect(-31,-72,56,8);c.fillRect(-34,-40,74,6);
    if(index%2===0){c.strokeStyle='#558768';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(65,0);c.lineTo(65,-60);c.moveTo(65,-27);c.lineTo(48,-27);c.lineTo(48,-44);c.stroke();}
  } else {
    c.fillStyle='#222a47';c.fillRect(-20,-150,40,150);c.fillStyle='#6178a4';c.fillRect(-22,-150,44,5);
    c.fillStyle=index%2?'#94e9ff':'#e1a1ff';c.fillRect(-11,-128,22,75);
    c.save();c.translate(0,-112);c.fillStyle='#242c49';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('N',0,0);c.fillText('A',0,22);c.fillText('↗',0,44);c.restore();
    c.strokeStyle='#d6f5ff';c.lineWidth=3;c.beginPath();c.moveTo(-35,0);c.lineTo(-35,-177);c.lineTo(8,-177);c.stroke();
  }
  c.restore();
}
