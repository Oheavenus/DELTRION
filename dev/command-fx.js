// Shared data transfer primitives. Original geometric 0/1 glyphs, no font dependency.
// The source positions are visual only; no selected hand values enter this module.
(function (g) {
 "use strict";
 const glyphs=Object.freeze({
  triangle:"M0 -5 L4.33 2.5 L-4.33 2.5 Z",
  zero:"M-2 -5 H2 L4 -3 V3 L2 5 H-2 L-4 3 V-3 Z M-1 -2.8 L1 2.8",
  one:"M-3 -2 L0 -5 H2 V3.5 H4 V5 H-3 V3.5 H0 V-2.5 L-2 -1 Z"
 });
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>x*x*(3-2*x);
 function seeded(seed){let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)}
 function makeParticles(sources,target,rng=seeded(1234)){
  return sources.flatMap((r,index)=>Array.from({length:18},(_,j)=>{
   const row=Math.floor(j/6),col=j%6;
   const x=r.left+r.width*(.12+(col+rng()*.7)*.125),y=r.top+r.height*(.18+(row+rng()*.7)*.21);
   return {x,y,tx:target.x,ty:target.y,delay:index*.035+rng()*.07,bend:(rng()-.5)*52,size:.45+rng()*.42,bit:rng()<.5?"zero":"one",rotation:(j%2?Math.PI:0)+(rng()-.5)*.45};
  }));
 }
 function sample(p,t){
  const q=clamp((t-p.delay)/(1-p.delay)),z=ease(q),m=Math.sin(Math.PI*q);
  return {x:p.x+(p.tx-p.x)*z+p.bend*m,y:p.y+(p.ty-p.y)*z-14*m,
   size:p.size*(1-.48*z),rotation:p.rotation*(1-z),triangle:1-clamp((q-.12)/.26),bit:clamp((q-.12)/.26),alpha:clamp((1-q)*5)};
 }
 function capture(root,side){
  const doc=root.ownerDocument,win=doc?.defaultView;
  if(!win||!root.querySelectorAll)return null;
  const sources=[...root.querySelectorAll(".sequence > *")].map(el=>(el.querySelector(".lab-hand")||el).getBoundingClientRect());
  const pilot=root.querySelectorAll(".arena .pilot")[side];
  const model=pilot?.querySelector(".mech-info-trigger,.lab14-model,.echo-model,.mech");
  if(sources.length!==3||!model)return null;
  const r=model.getBoundingClientRect();
  return {doc,win,sources,target:{x:r.left+r.width/2,y:r.top+r.height/2},scrollX:win.scrollX,scrollY:win.scrollY};
 }
 function snapshot(root){
  const doc=root.ownerDocument,win=doc?.defaultView;
  return win?{doc,win,scrollX:win.scrollX,scrollY:win.scrollY}:null;
 }
 function captureDeal(root){
  const base=snapshot(root),deck=root.querySelector(".deck-count"),sources=[...root.querySelectorAll(".hand-option:not(.hex)")].map(el=>el.getBoundingClientRect());
  if(!base||!deck||sources.length!==5)return null;
  const r=deck.getBoundingClientRect();
  return {...base,sources,target:{x:r.left+r.width/2,y:r.top+r.height/2},kind:"deal"};
 }
 function captureScatter(root){
  const base=snapshot(root),sources=[...root.querySelectorAll(".hand-option:not(.hex)")].map(el=>el.getBoundingClientRect());
  return base&&sources.length===5?{...base,sources,target:{x:0,y:0},kind:"scatter"}:null;
 }
 function offerPositions(root){return new Map([...root.querySelectorAll(".hand-option:not(.hex)")].map(el=>[el.dataset.cardId,el.getBoundingClientRect()]))}
 function animateSort(root,previous,duration=200){
  if(!previous)return;
  for(const el of root.querySelectorAll(".hand-option:not(.hex)")){
   const old=previous.get(el.dataset.cardId),r=el.getBoundingClientRect();if(!old)continue;
   const dx=old.left-r.left,dy=old.top-r.top;
   if(dx||dy)el.animate?.([{transform:`translate(${dx}px,${dy}px)`,opacity:.75},{transform:"none",opacity:1}],{duration,easing:"cubic-bezier(.2,.8,.2,1)"});
  }
 }
 function play(snapshot,duration=420){
  const {doc,win,sources,target}=snapshot;
  const canvas=doc.createElement("canvas");canvas.setAttribute("aria-hidden","true");
  canvas.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:50;pointer-events:none";
  const dpr=Math.min(1.5,win.devicePixelRatio||1),w=win.innerWidth,h=win.innerHeight;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const ctx=canvas.getContext("2d");if(!ctx||typeof win.Path2D!=="function")return ()=>{};
  const paths=Object.fromEntries(Object.entries(glyphs).map(([k,v])=>[k,new win.Path2D(v)]));
  const rng=seeded(Math.floor(win.performance.now()*1000));
  const particles=makeParticles(sources,target,rng);
  if(snapshot.kind==="scatter")for(const p of particles){p.tx=p.x+(rng()-.5)*100;p.ty=p.y-18-rng()*75;p.bend=(rng()-.5)*28;}
  doc.body.appendChild(canvas);let frame=0,start=null,dead=false;
  const clear=()=>{dead=true;win.cancelAnimationFrame(frame);canvas.remove()};
  function draw(now){
   if(dead)return;
   if(start===null)start=now;
   const t=clamp((now-start)/duration);
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   ctx.strokeStyle="#e9fbff";ctx.shadowColor="#73ddff";ctx.shadowBlur=6;ctx.lineWidth=1.25;ctx.lineJoin="round";
   for(const p of particles){const s=sample(p,snapshot.kind==="deal"?1-t:t);ctx.save();ctx.translate(s.x+snapshot.scrollX-win.scrollX,s.y+snapshot.scrollY-win.scrollY);ctx.rotate(s.rotation);ctx.scale(s.size,s.size);
    const alpha=snapshot.kind==="deal"?Math.min(1,t*5,(1-t)*5):s.alpha;
    ctx.globalAlpha=alpha*s.triangle;ctx.stroke(paths.triangle);ctx.globalAlpha=alpha*s.bit;ctx.stroke(paths[p.bit]);ctx.restore();}
   if(t<1)frame=win.requestAnimationFrame(draw);else clear();
  }
  frame=win.requestAnimationFrame(draw);return clear;
 }
 const api=Object.freeze({glyphs,makeParticles,sample,capture,captureDeal,captureScatter,offerPositions,animateSort,play});
 g.DataParticleFX=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(globalThis);
