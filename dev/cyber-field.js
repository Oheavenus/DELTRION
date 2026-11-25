/* CYBER FIELD 06 speed 6.0; BUTTON LAB 01.1; main 4821ad8. */

(() => {
  const cv = document.getElementById('cyber-field');
  if(!cv)return;
  const ctx = cv.getContext('2d');
  const speedEl={value:6},densityEl={value:1},mistEl={value:1.5};
  const lens=document.getElementById('cyber-lenses'),lg=lens?.getContext('2d');
  if(!ctx||!lg)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');

  let paused = false, t = 0, last = null, W = 0, H = 0, dpr = 1;
  const particles = [];
  const S = 38;
  const TRI_H = S * Math.sqrt(3) / 2;
  const dirs = [[S,0],[S/2,TRI_H],[-S/2,TRI_H],[-S,0],[-S/2,-TRI_H],[S/2,-TRI_H]];
  const clouds = [];

  function hsh(a,b,c=0){ const n = Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453123; return n - Math.floor(n); }
  function lerp(a,b,p){ return a+(b-a)*p; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  function resize(){
    const w = Math.max(1, cv.clientWidth), h = Math.max(1, cv.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w !== W || h !== H) {
      W = w; H = h;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      lens.width=cv.width;lens.height=cv.height;
      buildClouds();
    }
  }

  function buildClouds(){
    clouds.length = 0;
    const count = 6;
    for(let i=0;i<count;i++){
      const pts = [];
      const ptCount = 8 + Math.floor(Math.random()*6);
      const baseR = 70 + Math.random()*90;
      for(let j=0;j<ptCount;j++){
        const ang = (Math.PI*2*j/ptCount) + Math.random()*0.35;
        const rr = baseR * (0.55 + Math.random()*0.65);
        pts.push([Math.cos(ang)*rr, Math.sin(ang)*rr]);
      }
      clouds.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: baseR,
        pts,
        driftX: (Math.random()*2-1)*0.18,
        driftY: (Math.random()*2-1)*0.14,
        rot: Math.random()*Math.PI*2,
        rotV: (Math.random()*2-1)*0.015,
        pulse: Math.random()*Math.PI*2,
        scale: 0.9 + Math.random()*0.35
      });
    }
  }

  function spawnParticle(){
    const row = Math.floor(Math.random()*(H/TRI_H+2))-1;
    const col = Math.floor(Math.random()*(W/S+3))-1;
    return {
      x: col*S + (row%2 ? S/2 : 0),
      y: row*TRI_H,
      d: Math.floor(Math.random()*6),
      p: Math.random(),
      v: 1.35 + Math.random()*0.9,
      life: 3.2 + Math.random()*2.2,
      fade: 0,
      state: 'live',
      trail: []
    };
  }

  function ensureParticles(){
    const target = Math.round(2 * Number(densityEl.value));
    while (particles.length < target) particles.push(spawnParticle());
    while (particles.length > target) particles.pop();
  }

  function drawLine(x1,y1,x2,y2,a,w){
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.strokeStyle = `rgba(98,205,242,${clamp(a,0,1)})`;
    ctx.lineWidth = w;
    ctx.stroke();
  }

  function drawTriangles(){
    for(let r=-2;r<=H/TRI_H+2;r++){
      for(let c=-2;c<=W/S+2;c++){
        const x = c*S + (r%2 ? S/2 : 0);
        const y = r*TRI_H;
        for(let u=0;u<2;u++){
          const n = hsh(c,r,u);
          const freq = 0.04 + n*0.14; // varied speed, slower overall
          const phase = n*20.0;
          const pulse = Math.sin(t*freq*6.283 + phase)*0.5 + 0.5;
          const shimmer = Math.sin(t*(0.015+n*0.05)*6.283 + phase*0.7)*0.5 + 0.5;
          const a = 0.008 + pulse*0.018 + shimmer*0.012;
          if (n < 0.46) continue;
          ctx.beginPath();
          if (u===0){
            ctx.moveTo(x,y); ctx.lineTo(x+S,y); ctx.lineTo(x+S/2,y+TRI_H);
          } else {
            ctx.moveTo(x,y); ctx.lineTo(x-S/2,y+TRI_H); ctx.lineTo(x+S/2,y+TRI_H);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(34,145,205,${a})`;
          ctx.fill();
        }
      }
    }
  }

  function drawGrid(){
    ctx.lineCap = 'butt';
    for(let r=-2;r<=H/TRI_H+2;r++){
      for(let c=-2;c<=W/S+2;c++){
        const x = c*S + (r%2 ? S/2 : 0);
        const y = r*TRI_H;
        for(let k=0;k<3;k++){
          const n = hsh(c,r,k+4);
          const f = 0.05 + n*0.16;
          const pulse = Math.sin(t*f*6.283 + n*22)*0.5 + 0.5;
          let a = 0.055 + pulse*0.085;
          if (n > 0.72 && pulse < 0.23) a *= 0.16;
          drawLine(x,y,x+dirs[k][0],y+dirs[k][1],a,0.48);
        }
      }
    }
  }

  function drawMist(dt){
    const mist = Number(mistEl.value);
    if (mist <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for(const c of clouds){
      c.x = (c.x + c.driftX * dt * 60 + W) % W;
      c.y = (c.y + c.driftY * dt * 60 + H) % H;
      c.rot += c.rotV * dt * 60;
      c.pulse += 0.004 * dt * 60;
      const amp = (0.08 + (Math.sin(c.pulse)+1)*0.04) * mist;
      ctx.save();
      ctx.translate(c.x,c.y);
      ctx.rotate(c.rot);
      ctx.scale(c.scale*(1+Math.sin(c.pulse)*0.03), c.scale*(1+Math.cos(c.pulse*0.9)*0.03));
      ctx.filter = 'blur(20px)';
      const grad = ctx.createRadialGradient(0,0,0,0,0,c.r*1.15);
      grad.addColorStop(0, `rgba(22,92,158,${amp})`);
      grad.addColorStop(0.45, `rgba(16,70,132,${amp*0.42})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(c.pts[0][0], c.pts[0][1]);
      for(let i=1;i<c.pts.length;i++) ctx.lineTo(c.pts[i][0], c.pts[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.filter = 'none';
  }

  function updateParticle(p, dt){
    // Fade changes brightness only. Travel continues at the same speed.
    if (p.state === 'live') {
      p.life -= dt;
      if (p.life <= 0) {
        p.state = 'fade';
        p.fade = 1.6;
      }
    } else {
      p.fade = Math.max(0, p.fade - dt);
    }
    const alpha = p.state === 'live' ? 1 : clamp(p.fade/1.6, 0, 1);
    const advance = dt * Number(speedEl.value) * p.v;
    p.p += advance;
    while (p.p >= 1) {
      p.p -= 1;
      p.x += dirs[p.d][0];
      p.y += dirs[p.d][1];
      // Keep trail corners on the actual lattice vertices.
      p.trail.push({x:p.x,y:p.y,a:alpha,t:advance>0?t-dt*p.p/advance:t});
      const choices = [p.d, (p.d+1)%6, (p.d+5)%6];
      p.d = choices[Math.floor(Math.random()*3)];
    }
    if (alpha <= 0) {
      Object.assign(p, spawnParticle());
      return;
    }
    const x = p.x + dirs[p.d][0]*p.p;
    const y = p.y + dirs[p.d][1]*p.p;
    if (dt > 0 || p.trail.length === 0) p.trail.push({x,y,a:alpha,t:t});
    p.trail = p.trail.filter(v => t - v.t < 0.8 && v.a > 0.01);

    for(let i=1;i<p.trail.length;i++){
      const a = p.trail[i-1], b = p.trail[i];
      const fade = Math.pow(clamp(1 - (t - b.t)/0.8, 0, 1), 1.7) * Math.min(b.a, alpha);
      drawLine(a.x,a.y,b.x,b.y,0.13*fade,1.35);
      drawLine(a.x,a.y,b.x,b.y,0.56*fade,0.42);
    }

    const core = 0.95;
    const glow = ctx.createRadialGradient(x,y,0,x,y,3.2);
    glow.addColorStop(0, `rgba(228,255,255,${0.95*alpha})`);
    glow.addColorStop(0.35, `rgba(110,235,255,${0.55*alpha})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x,y,3.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(240,255,255,${0.95*alpha})`;
    ctx.beginPath(); ctx.arc(x,y,core,0,Math.PI*2); ctx.fill();
  }

  // BUTTON LAB 01 integration: sample the actual background into the button polygon.
  const cfg={tint:.10,blur:1,warp:.06,rim:1.2,brightness:.35,period:10,trail:.20};
  function lensPolygon(points,color,off,selected,now,idx,outline,danger=false){
    const x=points.reduce((n,p)=>n+p[0],0)/points.length,y=points.reduce((n,p)=>n+p[1],0)/points.length;
    lg.save();lg.beginPath();points.forEach((p,i)=>i?lg.lineTo(...p):lg.moveTo(...p));lg.closePath();lg.clip();
    lg.save();lg.translate(x,y);lg.scale(1+cfg.warp,1+cfg.warp*.65);lg.transform(1,0,cfg.warp*.16,1,0,0);lg.translate(-x,-y);
    lg.filter='blur('+cfg.blur*dpr+'px)';
    const sx=Math.max(0,Math.min(...points.map(p=>p[0]))-20),sy=Math.max(0,Math.min(...points.map(p=>p[1]))-20),ex=Math.min(W,Math.max(...points.map(p=>p[0]))+20),ey=Math.min(H,Math.max(...points.map(p=>p[1]))+20);
    if(ex>sx&&ey>sy)lg.drawImage(cv,sx*dpr,sy*dpr,(ex-sx)*dpr,(ey-sy)*dpr,sx,sy,ex-sx,ey-sy);lg.restore();
    lg.globalAlpha=off?.05:cfg.tint+(selected?.035:0);lg.fillStyle=color;lg.fillRect(0,0,W,H);lg.restore();
    if(!outline)return;
    const segments=points.map((p,i)=>{let q=points[(i+1)%points.length];return {p,q,len:Math.hypot(q[0]-p[0],q[1]-p[1])}}),len=segments.reduce((n,p)=>n+p.len,0);
    lg.save();lg.lineWidth=cfg.rim;lg.lineJoin='miter';lg.strokeStyle=color;lg.globalAlpha=off?.34:selected?.95:.65;
    lg.beginPath();points.forEach((p,i)=>i?lg.lineTo(...p):lg.moveTo(...p));lg.closePath();
    if(danger){lg.shadowColor='#d9576770';lg.shadowBlur=4}
    lg.stroke();lg.shadowBlur=0;
    if(!off&&!motion.matches&&len>0){
      const phase=(now/1000/(cfg.period*[.73,1.17,.88,1.29,.96,1.43][idx%6])+idx*.197)%1;
      for(let j=0;j<18;j++){const part=cfg.trail/18;lg.setLineDash([len*part*1.07,len-len*part*1.07]);lg.lineDashOffset=-len*((phase-j*part+1)%1);lg.globalAlpha=cfg.brightness*Math.pow(1-j/18,1.7);lg.strokeStyle=danger?'#ffc9ce':'#d6f7ff';lg.stroke()}
    }lg.restore();
  }
  // All sloping sides use the same equilateral-triangle angle. Rectangular
  // selection panels and impossibly narrow controls are not skewed.
  function glassPoints(x,y,w,h,inverse,rectangular=false,edge="none"){
    const cut=rectangular||w<=2*h/Math.sqrt(3)+4?0:h/Math.sqrt(3);
    const left=edge==="first"?0:cut,right=edge==="last"?0:cut;
    return inverse?[[x,y],[x+w,y],[x+w-right,y+h],[x+left,y+h]]:[[x+left,y],[x+w-right,y],[x+w,y+h],[x,y+h]];
  }
  function glassRule(action,wide,rowIndex,rowCount){
    if(action==="abandon"||action==="advance")return {rectangular:false,edge:"last"};
    if(["export","fight","show"].includes(action)&&rowCount===1)return {rectangular:false,edge:"first"};
    if(action==="select"||(wide&&rowCount<=1))return {rectangular:true,edge:"none"};
    return {rectangular:false,edge:rowCount>1?(rowIndex===0?"first":rowIndex===rowCount-1?"last":"none"):"none"};
  }
  function drawLenses(now){
    lg.setTransform(dpr,0,0,dpr,0,0);lg.clearRect(0,0,W,H);
    let idx=0;const buttons=[...document.querySelectorAll('#app button[data-action]')];
    for(const b of buttons){
      const action=b.dataset.action;if(['skill','deck-info','close-info','home'].includes(action))continue;
      const r=b.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;
      const group=b.closest?.('.start-actions,.mech-select,.register-actions,footer');
      const row=group?buttons.filter(other=>other.closest?.('.start-actions,.mech-select,.register-actions,footer')===group&&Math.abs(other.getBoundingClientRect().top-r.top)<=2):[b];
      const rowIndex=row.indexOf(b),inverse=row.length>1?rowIndex%2===1:action==='submit'||action==='abandon'||action==='advance';
      const wide=b.classList.contains('confirm-wide')||!!group?.classList?.contains('start-actions');
      const rule=glassRule(action,wide,rowIndex,row.length);
      if(r.bottom<0||r.top>H)continue;
      const svg=(b.closest('.hand-option')||b).querySelector('.lab-frame');
      if(svg){const rect=svg.getBoundingClientRect(),p=svg.querySelector('.lab-field');if(!p)continue;
        const box=svg.viewBox.baseVal,scale=Math.min(rect.width/box.width,rect.height/box.height);
        const ox=rect.x+(rect.width-box.width*scale)/2-box.x*scale,oy=rect.y+(rect.height-box.height*scale)/2-box.y*scale;
        const pts=[...p.points].map(({x,y})=>[ox+x*scale,oy+y*scale]);
        const color=getComputedStyle(svg).getPropertyValue('--rim').trim()||'#78bfd5';
        lensPolygon(pts,b.disabled?'#89939d':color,b.disabled,false,now,idx++,false);
      }else{
        const x=r.x+1,y=r.y+1,w=r.width-2,h=r.height-2;
        // A trapezoid always has 60-degree sides. Tall mech panels remain rectangular;
        // if a control is exceptionally narrow, use a rectangle rather than a distorted slope.
        const pts=glassPoints(x,y,w,h,inverse,rule.rectangular,rule.edge);
        const selected=b.classList.contains('selected'),danger=action==='abandon';
        const color=b.disabled?'#89939d':danger?'#db7c87':selected?'#d3f4ff':'#78bfd5';
        lensPolygon(pts,color,b.disabled,selected,now,idx++,true,danger);
      }
    }
    document.documentElement.classList.add('field-ready');
  }
  let paintedAt=-Infinity,dirty=true;
  function frame(now){
    if(document.hidden||now-paintedAt<1000/30){requestAnimationFrame(frame);return}
    if(motion.matches&&!dirty){requestAnimationFrame(frame);return}
    dirty=false;paintedAt=now;resize();
    const dt = motion.matches ? 0 : Math.min(((now - (last ?? now))/1000), 0.05);
    last = now;
    t += dt;

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#040b16';
    ctx.fillRect(0,0,W,H);

    drawTriangles();
    drawGrid();
    drawMist(dt);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ensureParticles();
    for (const p of particles) updateParticle(p, dt);
    ctx.restore();

    const vignette = ctx.createRadialGradient(W*0.5,H*0.5,Math.min(W,H)*0.15,W*0.5,H*0.5,Math.max(W,H)*0.82);
    vignette.addColorStop(0,'rgba(0,0,0,0)');
    vignette.addColorStop(1,'rgba(0,5,14,.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0,0,W,H);

    drawLenses(now);
    requestAnimationFrame(frame);
  }
  new MutationObserver(()=>{dirty=true}).observe(document.getElementById('app'),{childList:true,subtree:true});
  window.addEventListener('resize',()=>{dirty=true;resize()});
  window.addEventListener('scroll',()=>{dirty=true},{passive:true});
  motion.addEventListener?.('change',()=>{dirty=true;last=null});
  requestAnimationFrame(frame);
})();
