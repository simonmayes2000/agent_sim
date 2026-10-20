/* Deterministic aerial terrain. Rendering never consumes simulation randomness. */
(function (root) {
  'use strict';
  const hash = (x,y) => { const n=Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); };
  const smooth = v => v*v*(3-2*v);
  function noise(x,y) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
    const a=hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx;
    const b=hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx;
    return a*(1-fy)+b*fy;
  }
  const rgb = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  let cachedKey='',cachedLand=null;
  function render(state,canvas,size,art,mode='satellite') {
    const width=state.width*size,height=state.height*size;
    const key=JSON.stringify([state.width,state.height,state.day,state.weather,mode,art,state.tiles.map(t=>[t.type,t.color,t.food,t.wood,t.visits,t.structures.length])]);
    canvas.width=width;canvas.height=height;canvas.style.width=width+'px';canvas.style.height=height+'px';
    const ctx=canvas.getContext('2d'); if(!ctx)return;
    if(cachedKey===key&&cachedLand){ctx.drawImage(cachedLand,0,0);return;}
    const p=art.palette,colors={grass:rgb(p.ground),forest:rgb(p.forest),berry:rgb(p.vegetation),rock:rgb(p.rock),water:rgb(p.water)};
    const step=3,w=Math.ceil(width/step),h=Math.ceil(height/step),raster=document.createElement('canvas');raster.width=w;raster.height=h;
    const rc=raster.getContext('2d'),pixels=rc.createImageData(w,h),data=pixels.data;
    const regions=new Map();for(const r of art.regions||[])for(const i of r.tiles)regions.set(i,r);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const wx=x*step,wy=y*step;
      const gx=(wx+(noise(wx/100,wy/100)-.5)*45)/size-.5,gy=(wy+(noise(wx/105+70,wy/105)-.5)*45)/size-.5;
      const ix=Math.floor(gx),iy=Math.floor(gy),fx=smooth(gx-ix),fy=smooth(gy-iy),mix=[0,0,0];
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
        const tx=Math.max(0,Math.min(state.width-1,ix+dx)),ty=Math.max(0,Math.min(state.height-1,iy+dy)),t=state.tiles[ty*state.width+tx];
        const weight=(dx?fx:1-fx)*(dy?fy:1-fy),c=/^#[0-9a-f]{6}$/i.test(t.color||'')?rgb(t.color):colors[t.type]||colors.grass;
        for(let k=0;k<3;k++)mix[k]+=c[k]*weight;
      }
      const fine=noise(wx/12,wy/12),medium=noise(wx/46,wy/46),broad=noise(wx/260,wy/260);
      const hill=(noise(wx/170+0.04,wy/170-0.04)-noise(wx/170-.04,wy/170+.04))*110;
      const grain=(hash(x,y)-.5)*13,light=(fine-.5)*15+(medium-.5)*28+(broad-.5)*22+hill+grain;
      const index=(y*w+x)*4;
      for(let k=0;k<3;k++)data[index+k]=Math.max(0,Math.min(255,mix[k]+light));
      data[index+3]=255;
    }
    rc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(raster,0,0,width,height);
    state.tiles.forEach((t,i)=>{
      const tx=i%state.width*size,ty=Math.floor(i/state.width)*size,region=regions.get(i);
      if(region){ctx.globalAlpha=.07+region.moisture*.06;ctx.fillStyle=region.tint;ctx.beginPath();ctx.ellipse(tx+size/2,ty+size/2,size*.6,size*.52,hash(i,2),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      if(t.type==='water'){
        for(let n=0;n<55;n++){const x=tx+hash(i,n)*size,y=ty+hash(i,n+80)*size;ctx.strokeStyle=n%3?'#b4d9d319':'#173f4c22';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,3+hash(i,n+9)*18,1, -.22,0,Math.PI);ctx.stroke();}return;
      }
      if(t.visits>2||t.structures.length){const a=Math.min(.5,.07+t.visits*.012);ctx.fillStyle=`rgba(159,137,95,${a})`;ctx.beginPath();ctx.ellipse(tx+size*.5,ty+size*.53,size*.19,size*.13,-.2,0,Math.PI*2);ctx.fill();}
      if(mode==='terrain')return;
      if(t.type==='forest'||t.type==='berry'){
        const density=Math.round((t.type==='forest'?Math.max(15,t.wood*13):Math.max(8,t.food*8))*(region?.canopy!=null?.6+region.canopy*.7:1));
        for(let n=0;n<density;n++){
          const x=tx+hash(i*9,n)*size,y=ty+hash(i*9+1,n)*size,r=3+hash(i+8,n)*8;
          if(t.structures.length&&Math.hypot(x-tx-size*.5,y-ty-size*.5)<size*.24)continue;
          ctx.fillStyle='#12241950';ctx.beginPath();ctx.ellipse(x+5,y+7,r*1.15,r*.72,-.65,0,Math.PI*2);ctx.fill();
          const crown=ctx.createRadialGradient(x-r*.3,y-r*.4,0,x,y,r);crown.addColorStop(0,n%3?'#73845b':'#87946b');crown.addColorStop(.45,p.vegetation);crown.addColorStop(1,p.forest);ctx.fillStyle=crown;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
          for(let j=0;j<4;j++){ctx.fillStyle=j%2?'#c6cd8f15':'#102b241c';ctx.beginPath();ctx.arc(x+(hash(n,j)-.5)*r,y+(hash(n+1,j)-.5)*r,r*.4,0,Math.PI*2);ctx.fill();}
        }
      }
      if(t.type==='rock')for(let n=0;n<32;n++){const x=tx+hash(i,n)*size,y=ty+hash(i+9,n)*size,r=2+hash(i+3,n)*9;ctx.fillStyle='#262d2a45';ctx.fillRect(x+3,y+4,r*1.5,r);ctx.fillStyle=n%2?'#a4a494':'#747d70';ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x,y-r*.65);ctx.lineTo(x+r,y-r*.2);ctx.lineTo(x+r*.7,y+r*.5);ctx.lineTo(x-r*.7,y+r*.6);ctx.closePath();ctx.fill();}
    });
    if(art.atmosphere.haze){ctx.fillStyle=`rgba(218,224,202,${art.atmosphere.haze*.45})`;ctx.fillRect(0,0,width,height);}
    if(art.atmosphere.warmth){ctx.fillStyle=art.atmosphere.warmth>0?`rgba(177,119,55,${art.atmosphere.warmth*.09})`:`rgba(64,114,148,${Math.abs(art.atmosphere.warmth)*.09})`;ctx.fillRect(0,0,width,height);}
    cachedLand=document.createElement('canvas');cachedLand.width=width;cachedLand.height=height;cachedLand.getContext('2d').drawImage(canvas,0,0);cachedKey=key;
  }
  root.SatelliteMap={render,noise};
})(window);
