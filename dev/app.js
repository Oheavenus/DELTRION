// Local hot-seat UI; approved PNG hand sprites and timed combat presentation.
const boot = function boot({root,createGame,robotSVG,storage,download,confirmReset,makeId,schedule=(fn,ms)=>setTimeout(fn,ms),reducedMotion=()=>false,clock=()=>Date.now(),timerSchedule=(fn,ms)=>setTimeout(fn,ms),botChoose=null,botPolicy="practice-v1",botRng=Math.random,commandFX=null}){
 const colors={red:{name:"赤",hex:"#f86c71",shade:"#733043",style:"mono",ability:"通常勝利：2ダメージ"},blue:{name:"青",hex:"#57baff",shade:"#244e79",style:"hero",ability:"パー・虹勝利：2、グー勝利：回復1"},yellow:{name:"黄",hex:"#ffd369",shade:"#8f6721",style:"brave",ability:"各ラウンド初手勝利：3ダメージ"},green:{name:"緑",hex:"#56e1a5",shade:"#296851",style:"blade",ability:"機体戦最初の通常あいこ：追加1ダメージ"},purple:{name:"紫",hex:"#c192ff",shade:"#5a3780",style:"cute",ability:"通常勝利：回復1、HP3以下でハートフルモード"}};
 const mechNames={red:["ACE","エース"],blue:["BRAZE","ブレイズ"],yellow:["CHASE","チェイス"],green:["DEL-17","デル・セブンティーン"],purple:["ECHO","エコー"]};
 function mechName(c){return `<span class="mech-name name-${c}" style="--name-color:${colors[c].hex}"><strong>${mechNames[c][0]}</strong><small>${mechNames[c][1]}</small></span>`}
 const names={rock:"グー",scissors:"チョキ",paper:"パー",rainbow:"虹"};
 const skills={
  red:["正義の心","通常の手で勝つと、相手に2ダメージ。"],
  blue:["今だ！","パー・虹で勝つと2ダメージ。グーで勝つとHPを1回復。"],
  yellow:["スピードスター","各ラウンドの1手目に通常の手で勝つと、相手に3ダメージ。"],
  green:["俺が守る…","機体戦で最初の通常あいこ時、相手へのダメージが1増える（相手2、自分1が基本）。"],
  purple:["ハートフルモード","通常の手で勝つとHPを1回復。HP3以下でハートフルモードに移行し、その機体戦中の通常勝利は2ダメージ。"]
 };
 const key="robot-janken-dev-logs-v1";let game=null,who=0,cover=false,draft=[],draftSlots=[],saved=[],storageWarning="",consent=false,recorded=false;
 let playback=null,revealed=[],epoch=0,mode="local",info=null;
 const playerLabel=i=>mode==="local-bot"?(i===0?"YOU":"BOT"):"P"+(i+1);
 const limits={roster:30,deploy:30,hands:30};let timer=null,timerToken=0;
 try{const prev=JSON.parse(storage.getItem(key)||"[]");if(Array.isArray(prev))saved=prev}catch{storageWarning="ブラウザ保存が利用できません。終了時にJSONを保存してください。"}
 const button=(action,label,value="",disabled=false,cls="")=>`<button type="button" data-action="${action}" data-value="${value}" class="${cls}" ${disabled?"disabled":""}>${label}</button>`;
 function selectPhase(){return game?.view().phase}
 function enterSelection(){
   who=0;draft=[];draftSlots=[];cover=mode!=="local-bot";
   if(cover)return;
   const v=game.view(1);
   if(!(v.phase in limits)||v.submitted.some(Boolean))throw Error("BOT selection phase out of sync");
   // Commit before the human sees the selection screen; the strategy cannot inspect the human draft.
   const choice=botChoose(v,botRng);
   if(!game.legal(1,choice))throw Error("BOT produced an illegal choice");
   game.submit(1,choice);startInput();
 }
 function offerOrder(v,raw=false){
  const rank={rock:0,scissors:1,paper:2},items=v.offer.map((hand,id)=>({hand,id}));
  return raw?items:items.sort((a,b)=>rank[a.hand]-rank[b.hand]||a.id-b.id);
 }
 function startInput(){
  if(selectPhase()!=="hands"||reducedMotion()||!commandFX?.captureDeal){startTimer();return}
  epoch++;playback={stage:"deal",before:game.view(who),after:null,player:who};render();
  let clear=()=>{};
  try{const shot=commandFX.captureDeal(root);if(shot)clear=commandFX.play(shot,450)||clear}catch{}
  later(()=>{
   try{clear()}catch{}
   let previous;try{previous=commandFX.offerPositions?.(root)}catch{}
   playback.stage="sort";render();
   try{commandFX.animateSort?.(root,previous,200)}catch{}
   later(()=>{
    playback.stage="focus";render();
    later(()=>{playback=null;startTimer();render()},250);
   },200);
  },450);
 }
 function stopTimer(){timerToken++;timer=null}
 function timerVisual(){
   if(!timer||cover||playback)return "";
   const remaining=Math.max(0,Math.ceil((timer.deadline-clock())/1000));
   const warn=remaining<=5?"critical":remaining<=10?"warning":"normal";
   return `<div class="countdown ${warn}" role="timer" aria-label="残り${remaining}秒" data-remaining="${remaining}" style="--progress:${Math.max(0,remaining/timer.limit*100)}%"><span class="countdown-num">${remaining}</span></div>`;
 }
 function refreshTimer(){
   const el=typeof root.querySelector==="function"?root.querySelector(".countdown"):null;
   if(!el||!timer)return;
   const remaining=Math.max(0,Math.ceil((timer.deadline-clock())/1000));
   el.className="countdown "+(remaining<=5?"critical":remaining<=10?"warning":"normal");
   el.setAttribute("data-remaining",String(remaining));el.setAttribute("aria-label","残り"+remaining+"秒");
   el.style.setProperty("--progress",Math.max(0,remaining/timer.limit*100)+"%");
   const num=el.querySelector(".countdown-num");if(num)num.textContent=String(remaining);
 }
 function leftFill(){
   const v=game.view(who),p=v.phase;
   if(p==="roster"){
     const chosen=draft.slice();
     for(const c of Object.keys(colors))if(chosen.length<3&&!chosen.includes(c))chosen.push(c);
     return {value:chosen,filled:chosen.slice(draft.length)};
   }
   if(p==="deploy"){
     const choices=v.rosters[who].filter(c=>!v.used[who].includes(c));
     return {value:draft[0]??choices[0],filled:draft.length?[]:choices.slice(0,1)};
   }
   if(p==="hands"){
     const slots=draftSlots.slice(),chosen=draft.slice();
     for(const {id:k,hand} of offerOrder(v)){
       if(chosen.length>=3)break;
       if(!slots.includes(k)){chosen.push(hand);slots.push(k)}
     }
     return {value:chosen,filled:chosen.slice(draft.length)};
   }
   throw Error("no selectable phase for timeout");
 }
 function submitCurrent(metadata=null){
   if(!game||cover||playback)return;
   const p=selectPhase();if(!(p in limits))return;
   if(!metadata&&timer&&clock()>=timer.deadline){timeoutCurrent();return}
   const value=metadata?.value??(p==="deploy"?draft[0]:draft);
   if(!game.legal(who,value))return;
   stopTimer();info=null;
   const player=who,before=game.view(who),motionReduced=reducedMotion();
   let transfer=null,scatter=null;
   if(p==="hands"&&commandFX)try{transfer=commandFX.capture(root,player);scatter=commandFX.captureScatter?.(root)}catch{}
   game.submit(who,value,metadata&&{timeout:true,limitSeconds:limits[p],alreadySelected:metadata.alreadySelected,autoFilled:metadata.filled.length});
   draft=[];draftSlots=[];
   const finish=()=>{
    playback=null;
    if(game.view().phase===p){who=1-player;cover=true}else{who=0;cover=false;if(selectPhase() in limits)enterSelection()}
    if(mode==="local-bot"&&game.view().phase==="resolve"){beginCombat();return}
    render();
   };
   if(transfer||scatter){
    epoch++;playback={stage:"transfer",before,after:null,player};render();
    const duration=motionReduced?180:420;
    let clear=()=>{};
    if(!motionReduced){const clears=[];for(const shot of [transfer,scatter])if(shot)try{clears.push(commandFX.play(shot,duration))}catch{}clear=()=>clears.forEach(fn=>fn?.())}
    later(()=>{try{clear()}finally{finish()}},duration);
   }else finish();
 }
 function timeoutCurrent(){
   if(!timer||cover||playback)return;
   const p=selectPhase();
   if(p!==timer.phase||timer.player!==who){stopTimer();return}
   if(clock()<timer.deadline)return;
   const {value,filled}=leftFill(),alreadySelected=draft.length;
   submitCurrent({value,filled,alreadySelected});
 }
 function startTimer(){
   stopTimer();
   if(!game||cover||playback||!(selectPhase() in limits))return;
   const phase=selectPhase(),limit=limits[phase],token=timerToken,player=who;
   timer={phase,limit,player,deadline:clock()+limit*1000};
   const tick=()=>{
     if(token!==timerToken||!timer||cover||playback)return;
     if(clock()>=timer.deadline){timeoutCurrent();return}
     refreshTimer();
     timerSchedule(tick,200);
   };
   timerSchedule(tick,200);
 }
 // HAND UI LAB 01 geometry and separate draft artwork / mask layers.
 let handId=0;
 const handPalettes={red:["#e64544","#ffd259"],blue:["#417eea","#57e9ff"],yellow:["#eac044","#5fc9ff"],green:["#779859","#80ff92"],purple:["#a77bdd","#f89afa"]};
 const handRims={normal:"#50ddfa",strong:"#ff4c55",heal:"#53ef96",gold:"#ffd26b",rainbow:"#d7a2ff"};
 const handArt='<span class="lab-art"><span class="lab-armor"></span><span class="lab-light"></span></span>';
 function handTint(color){
  const [armor,light]=handPalettes[color]||["#d6dce8","#58e9ff"];
  return `--armor:${armor};--light:${light};--hand-halo:${color?armor:"#a9d8ff"}`;
 }
 function abilityDescription(text,color){
  const hands={"グー":"rock","チョキ":"scissors","パー":"paper","虹":"rainbow"};
  return text.replace(/ハイパー(?:化)?|グー|チョキ|パー|虹色ピストル|虹/g,label=>{
   if(label.startsWith("ハイパー"))return label;
   const hand=hands[label]||"rainbow";
   const accessibleLabel=hand==="rainbow"?"虹色ピストル":label;
   return `<span class="inline-hand hand-sprite hand-${hand} lab-hand" role="img" aria-label="${accessibleLabel}" style="${handTint(color)}">${handArt}</span>`;
  });
 }
 function handIcon(h,color=null,k=0,state="normal",tight=false){
  const shape=h==="rainbow"?"hex":k%2?"up":"down",id="hand-rim-"+(++handId);
  const poly={down:"10,15 110,15 60,101.60254",up:"60,15 10,101.60254 110,101.60254",hex:"35,15 85,15 110,58.30127 85,101.60254 35,101.60254 10,58.30127"}[shape];
  const c=handRims[state]||handRims.normal;
  const rim=shape==="hex"?"url(#"+id+")":c;
  return `<span aria-hidden="true" class="hand-icon hand-sprite hand-${h} lab-hand ${shape} lab-${state}" style="${handTint(color)};--rim:${c}"><svg class="lab-frame" viewBox="${tight ? "10 15 100 86.60254" : "0 0 120 120"}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ff4566"/><stop offset=".22" stop-color="#ffdc55"/><stop offset=".45" stop-color="#64ff98"/><stop offset=".68" stop-color="#4adfff"/><stop offset="1" stop-color="#b878ff"/></linearGradient></defs><polygon class="lab-field" points="${poly}" fill="${rim}" opacity=".1"/><polygon class="lab-glow" points="${poly}" fill="none" stroke="${rim}" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="miter"/>${Array.from({length:18},(_,j)=>{const period=[7.3,11.7,8.8,12.9,9.6,14.3][k%6];return `<polygon class="lab-trace" points="${poly}" fill="none" stroke="${rim}" stroke-width="1.2" vector-effect="non-scaling-stroke" pathLength="100" style="--orbit:${period}s;--orbit-delay:${-(k*.197+.13-j*.20/18+1)*period}s;--trace-opacity:${.35*Math.pow(1-j/18,1.7)}"/>`}).join("")}</svg>${handArt}</span>`;
 }
 function tone(v,i,h,k){
  if(h==="rainbow")return ["rainbow","必勝"];
  const c=v.colors[i];if(c==="purple"&&v.hyper[i])return ["gold","ハートフルモード ＋"];
  if(c==="red"||(c==="blue"&&h==="paper")||(c==="yellow"&&k===0))return ["strong","強攻撃"];
  if(c==="purple"||(c==="blue"&&h==="rock"))return ["heal","回復 ＋"];
  if(c==="green"&&!v.greenUsed[i])return ["normal","あいこ強化"];
  return ["normal","通常"];
 }
 const echoTimes={rock:1050,scissors:1450,paper:1700,rainbow:2200,hit:900,repair:1600,ko:1100,win:2450,lose:2200};
 function mechGraphic(color,hp,side=0,pose="idle",hyper=false,motion=pose,flash=false,hand=""){
  const fallback=robotSVG(colors[color],hp,{side,pose});
  if(color!=="purple")return globalThis.LAB14?.graphic?.({color,hp,side,pose,hand,fallback})||fallback;
  return `<span class="echo-model">${fallback}<canvas class="mech mech-canvas echo-canvas" width="48" height="48" data-color="purple" data-motion="${motion}" data-side="${side}" data-gold="${hyper}" data-flash="${flash}" aria-label="ECHO" hidden></canvas></span>`;
 }
 function echoMotion(v,i,pose){
  if(v.colors[i]!=="purple")return pose;
  const l=playback?.after?.last,stage=playback?.stage;
  if(stage==="blast")return l.winner===i||l.winner===null?l.hands[i]:"hit";
  if(stage==="repair")return v.hp[i]===0?"ko":l.actualHeal[i]>0?"repair":l.damage[1-i]>0?"hit":"idle";
  if(!playback&&["battle_result","complete"].includes(v.phase)&&v.battleResult?.winner!==null)return v.battleResult?.winner===i?"win":v.hp[i]===0?"ko":"lose";
  return v.hp[i]===0?"ko":"idle";
 }
 // Contact markers measured from the current LAB14 CSS / LAB19 keyframes.
 // Presentation-only estimates; no engine damage or action order changes.
 function impactDelay(l,colors,i){
  if(!l||l.winner===null||l.winner===i||!l.damage[1-i])return 0;
  const color=colors[l.winner],hand=l.hands[l.winner];
  if(color==="purple")return ({rock:483,scissors:1189,paper:1000,rainbow:1716})[hand]||0;
  if(hand==="rainbow")return 220;
  if(color==="green")return ({rock:220,scissors:300,paper:125})[hand]||0;
  if(color==="yellow"&&hand==="rock")return 220;
  return ({rock:115,scissors:115,paper:110})[hand]||0;
 }
 function echoStageTime(stage,base){
  const v=playback?.after,l=v?.last;if(!l)return base;
  let time=base;
  for(let i=0;i<2;i++)if(v.colors[i]==="purple"){
   const m=stage==="blast"?(l.winner===i||l.winner===null?l.hands[i]:"hit"):v.hp[i]===0?"ko":l.actualHeal[i]>0?"repair":l.damage[1-i]>0?"hit":"idle";
   time=Math.max(time,echoTimes[m]||0,stage==="repair"&&!l.beforeHyper[i]&&v.hyper[i]?900:0);
  }
  if(stage==="blast"){
   if(l.triggers.some(t=>t.ability==="green_tie"))time=Math.max(time,1500);
   for(let i=0;i<2;i++)if(l.winner!==null&&l.winner!==i&&l.damage[1-i])
    time=Math.max(time,impactDelay(l,v.colors,i)+(v.colors[i]==="purple"?echoTimes.hit:420));
  }
  return time;
 }
 function battleHeader(v){
  const commandSide=["transfer","focus"].includes(playback?.stage)?playback.player:!playback&&v.phase==="hands"?who:null;
  return `<div class="arena-info-wrap"><div class="arena"${commandSide===null?"":' data-command-side="'+commandSide+'"'}>${[0,1].map(i=>{const c=colors[v.colors[i]],l=playback?.after?.last,stage=playback?.stage,pose=stage==="charge"?"charge":stage==="blast"?(l?.winner===i||l?.winner===null?"attack":"hit"):stage==="repair"?(l?.actualHeal[i]>0?"heal":v.hp[i]===0?"lose":l?.damage[1-i]>0?"hit":"idle"):v.hp[i]===0?"lose":"idle",hand=l?.hands[i]||"",delay=stage==="blast"&&pose==="hit"?impactDelay(l,v.colors,i):0,hitAlready=stage==="repair"&&l?.winner!==null&&l?.winner!==i&&pose==="hit";return `<section data-hit-delay="${delay}"${hitAlready?' data-hit-already="true"':""} class="pilot ${v.hyper[i]?"hyper":""} pose-${pose}" style="--chassis:${c?.hex||"#78899b"};--impact-delay:${delay}ms"><span class="sr-only">${playerLabel(i)}</span><div class="pilot-hud"><div class="hud-logo">${c?mechName(v.colors[i]):"<small>出撃待ち</small>"}</div><div class="hp" role="img" aria-label="HP ${v.hp[i]} / 5">${Array.from({length:5},(_,k)=>`<span class="hp-triangle ${(k+i)%2?"down":"up"} ${k<v.hp[i]?"on":""}"></span>`).join("")}</div><div class="score" aria-label="${v.wins[i]}勝">${[0,1].map(k=>`<i class="win-pip ${k<v.wins[i]?"won":""}" aria-hidden="true"></i>`).join("")}</div><div class="rights">${v.rainbow[i]==="ready"?'<span class="rainbow-dot" role="img" aria-label="虹の使用権あり" title="虹の使用権あり"></span>':""}${v.hyper[i]?"<span class='gold-label' role='img' aria-label='ハートフルモード' title='ハートフルモード'>✦</span>":""}</div></div>${c?(playback?mechGraphic(v.colors[i],v.hp[i],i,pose,v.hyper[i],echoMotion(v,i,pose),stage==="repair"&&!!l&&!l.beforeHyper[i]&&v.hyper[i],hand):`<button type="button" class="mech-info-trigger" data-action="skill" data-value="${i}" aria-label="${playerLabel(i)} ${c.name}のスキル" aria-expanded="${info==="skill-"+i}">${mechGraphic(v.colors[i],v.hp[i],i,pose,v.hyper[i],echoMotion(v,i,pose),stage==="repair"&&!!l&&!l.beforeHyper[i]&&v.hyper[i],hand)}</button>`):""}</section>`}).join("")}${combatFX()}</div>${[0,1].map(i=>!playback&&info==="skill-"+i&&v.colors[i]?skillWindow(v.colors[i],i):"").join("")}</div>`;
 }
 function skillWindow(color,i){
  const [name,desc]=skills[color],c=colors[color];
  return `<button type="button" data-action="close-info" class="info-window skill-window side-${i}" style="--info-accent:${c.hex}" aria-label="${name}。 ${desc} 閉じる"><span class="skill-name">${name}</span><span class="skill-desc">${abilityDescription(desc,color)}</span></button>`;
 }
 function deckInfo(v){
  const total=v.remaining.reduce((a,b)=>a+b,0);
  return `<div class="deck-info-wrap"><button type="button" data-action="deck-info" class="deck-count" aria-label="残りデッキ ${total}枚の内訳" aria-expanded="${info==="deck"}"><span class="deck-symbol" aria-hidden="true"></span>${total}</button>${info==="deck"?`<button type="button" data-action="close-info" class="info-window deck-window" aria-label="${["rock","scissors","paper"].map((h,i)=>names[h]+" 残り"+v.remaining[i]+"/5").join("、")}。閉じる">${["rock","scissors","paper"].map((h,i)=>`<span class="deck-item" data-hand="${h}">${handIcon(h)}<span class="deck-fraction">${v.remaining[i]}/5</span></span>`).join("")}</button>`:""}</div>`;
 }
 function combatFX(){
  if(!playback?.after)return "";
  const l=playback.after.last,stage=playback.stage;
  if(stage==="blast"){
   // No generic beams, emoji explosions, or duplicate ECHO overlay. Native
   // ECHO effects come from its own canvas; LAB14 normal attacks from its renderer.
   const sides=l.winner===null?[0,1]:[l.winner];
   const fx=sides.map(side=>l.hands[side]==="rainbow"||playback.after.colors[side]==="purple"?"":globalThis.LAB14?.attackEffect?.({color:playback.after.colors[side],hand:l.hands[side],side})||"").join("");
   const allies=l.triggers.filter(t=>t.ability==="green_tie").map(t=>globalThis.LAB14?.allyEffect?.(t.player)||"").join("");
   return fx||allies?`<div class="fxfield" aria-hidden="true">${fx}${allies}</div>`:"";
  }
  if(stage==="repair")return `<div class="fxfield" aria-hidden="true">${[0,1].map(i=>`${l.damage[1-i]?`<span class="damagefx ${i===0?"left":"right"}">−${l.damage[1-i]}</span>`:""}${l.actualHeal[i]?`<span class="repairfx ${i===0?"left":"right"}">✚ +${l.actualHeal[i]}</span>`:""}`).join("")}</div>`;
  return "";
 }
 function presentationView(v){
  if(!playback)return v;
  const before=playback.before,after=playback.after,l=after?.last;
  if(!l)return before;
  // Unlocks and win count only appear on the result screen, not in the attack animation.
  return {...before,hp:playback.stage==="blast"?before.hp:after.hp,hyper:playback.stage==="blast"?before.hyper:after.hyper,rainbow:l.rainbow};
 }
 function roundBoard(v){
  const active=playback?.before.step??(v.phase==="resolve"?v.step:-1),done=!playback&&["battle_result","complete","abandoned"].includes(v.phase);
  return `<div class="round-board">${[0,1].map(i=>`<div class="battle-row"><b>${playerLabel(i)}</b>${[0,1,2].map(k=>{
    const l=revealed[k],h=l?.hands[i],cls=k===active?" current":"";
    return `<div class="battle-slot${cls}${h?" revealed":""}" aria-label="${h?names[h]:done?"未解決":"未公開"}">${h?handIcon(h,v.colors[i],k,h==="rainbow"?"rainbow":l.beforeHyper[i]?"gold":l.triggers.some(t=>t.player===i&&t.ability==="strong_attack")?"strong":l.triggers.some(t=>t.player===i&&t.ability==="heal")?"heal":"normal"):done?"—":"?"}</div>`;
   }).join("")}</div>`).join("")}</div>`;
 }
 function readout(l){
  if(!l)return "";
  return `<div class="combat-readout"><b>${l.winner===null?(l.hands[0]==="rainbow"?"虹 相殺":"DRAW"):`${playerLabel(l.winner)} WIN`}</b><div class="delta-row">${[0,1].map(i=>`<span aria-label="${playerLabel(i)} ダメージ ${l.damage[1-i]} 回復 ${l.actualHeal[i]}">${l.damage[1-i]?`<em class="damage-value">−${l.damage[1-i]}</em>`:""}${l.actualHeal[i]?`<em class="heal-value">＋${l.actualHeal[i]}</em>`:""}${!l.damage[1-i]&&!l.actualHeal[i]?"—":""}</span>`).join("")}</div></div>`;
 }
 function later(fn,ms){
  const token=epoch;schedule(()=>{if(token===epoch&&playback)fn()},reducedMotion()?Math.min(ms,180):ms);
 }
 function runHand(){
  const before=game.view();if(before.phase!=="resolve")return;
  playback={stage:"charge",before,after:null};render();
  later(()=>{
   game.advance();playback.after=game.view();playback.stage="blast";render();
   later(()=>{
    playback.stage="repair";render();
    later(()=>{
     playback.stage="reveal";revealed.push(playback.after.last);render();
     later(()=>{
      if(game.view().phase==="resolve")runHand();
      else{playback=null;if(game.view().phase==="complete")persist();render()}
     },740);
    },echoStageTime("repair",580));
   },echoStageTime("blast",600));
  },220);
 }
 function beginCombat(){
  if(cover||playback||game.view().phase!=="resolve")return;
  epoch++;revealed=[];info=null;
  // Hotseat still requires the shared manual start. Both modes get a short cue.
  playback={stage:"intro",before:game.view(),after:null};render();
  later(runHand,580);
 }
 function roster(v){return `<div class="rosters">${v.rosters.map((r,i)=>`<div>${playerLabel(i)}：${r.map(c=>`<span style="color:${colors[c].hex};${v.used[i].includes(c)?"text-decoration:line-through;opacity:.5":""}">${mechNames[c][0]}</span>`).join(" / ")}</div>`).join("")}</div>`}
 function cards(v){return `<div class="caption">共有カード（全員同じ）</div><div class="offer">${v.offer.map(h=>`<div class="card">${handIcon(h)}<small>${names[h]}</small></div>`).join("")}</div><div class="caption">残りデッキ ${v.remaining.reduce((a,b)=>a+b,0)}枚</div>`}
 function selectableCards(v){
  const locked=!!playback,raw=playback?.stage==="deal";
  const cards=offerOrder(v,raw).map(({hand,id},index)=>{
   const selected=draftSlots.indexOf(id);
   const [state,label]=tone(v,who,hand,selected<0?draft.length:selected);
   const mark=state==="heal"||state==="gold"?"+":state==="strong"?"✦":label==="あいこ強化"?"Ⅱ":"";
   return handChoice({hand,color:v.colors[who],index,state,selected,mark,label:names[hand]+"・"+label,
    disabled:locked||(selected<0&&draft.length>=3),action:"card",value:id});
  });
  return `<span class="sr-only">使う順に札をタップ</span><div class="selectable-offer">${cards.join("")}${rainbowChoice(v)}</div>${deckInfo(v)}`;
 }
 function handChoice({hand,color,index,state,selected,mark,label,disabled,action,value}){
  const shape=hand==="rainbow"?"hex":index%2===1?"up":"down";
  const picked=selected>=0;
  const accessibleLabel=label+(picked?"・"+(selected+1)+"手目・再タップで解除":"");
  const order=picked?`<span class="slot-order" aria-hidden="true">${selected+1}</span>`:"";
  const target=button(action,`<span class="sr-only">${accessibleLabel}</span>${order}`,value,disabled,
   "card choice "+state+(picked?" picked":""));
  const ability=mark?`<span class="ability-mark${mark==="Ⅱ"?" tie-mark":""}" aria-hidden="true">${mark}</span>`:"";
  return `<div class="hand-option ${shape} ${state}" data-card-id="${action==="rainbow"?"rainbow":value}">${target}${handIcon(hand,color,index,state,true)}${ability}</div>`;
 }
 function rainbowChoice(v){
  const selected=draftSlots.indexOf(-1),status=v.rainbow[who],full=draft.length>=3;
  const label=selected>=0?"登録済み":status==="ready"?(full?"登録枠が満杯":"使用可能"):status==="spent"?"使用済み":"未解禁";
  return handChoice({hand:"rainbow",color:v.colors[who],index:5,state:"rainbow",selected,
   label:"虹色ピストル・"+label,disabled:!!playback||status!=="ready"||(full&&selected<0),action:"rainbow",value:""});
 }
 function resultLabel(w){return w===null?"DRAW":`${playerLabel(w)} WIN`}
 function persist(){if(recorded||!game)return;recorded=true;if(!consent)return;const l=game.exportLog();saved.push(l);try{storage.setItem(key,JSON.stringify(saved))}catch{storageWarning="保存容量・設定の制約があります。タイトルに戻り、JSONを保存してください。"}}
 // Preserve unchanged screen regions and every production canvas bitmap on draft/skill taps.
 let previousMarkup=[];
 function renderStable(html){
  if(!root.ownerDocument?.createElement||typeof root.insertBefore!=="function"){root.innerHTML=html;return}
  const template=root.ownerDocument.createElement("template");template.innerHTML=html;
  const fresh=[...template.content.children],old=[...root.children],markup=fresh.map(n=>n.outerHTML);
  const key=cv=>cv.closest(".mech-select")?"selection-"+cv.dataset.color:"battle-"+cv.dataset.side+"-"+cv.dataset.color;
  const canvases=new Map([...root.querySelectorAll(".mech-canvas")].map(cv=>[key(cv),cv]));
  // Keys on detached template nodes still have their local ancestor groups.
  const nodes=fresh.map((n,i)=>{
   if(old[i]&&previousMarkup[i]===markup[i])return old[i];
   for(const cv of n.querySelectorAll(".mech-canvas")){
    const prior=canvases.get(key(cv));if(!prior)continue;
    for(const name of ["color","motion","pose","hand","hp","side","gold","flash"])if(name in cv.dataset)prior.dataset[name]=cv.dataset[name];
    const parent=cv.parentElement;cv.replaceWith(prior);if(!prior.hidden)parent.classList.add(prior.classList.contains("echo-canvas")?"echo-ready":"lab14-ready");
   }
   return n;
  });
  for(let i=0;i<nodes.length;i++)if(root.children[i]!==nodes[i])root.insertBefore(nodes[i],root.children[i]||null);
  const keep=new Set(nodes);for(const child of [...root.children])if(!keep.has(child))child.remove();
  previousMarkup=markup;
  positionGreenShots();positionLab14Effects();
 }
 // Measure stable model containers, not animated canvas transforms, in arena coordinates.
 function positionGreenShots(){
  const fx=root.querySelector?.(".fxfield");if(!fx)return;
  const arena=fx.closest(".arena"),pilots=[...arena.querySelectorAll(".pilot")];
  if(pilots.length!==2)return;
  const shots=[...fx.querySelectorAll(".lab14-green-shot")];if(!shots.length)return;
  const bounds=fx.getBoundingClientRect(),centers=pilots.map(p=>{
   const box=(p.querySelector(".lab14-model,.echo-model,.mech")||p).getBoundingClientRect();
   return [box.left-bounds.left+box.width/2,box.top-bounds.top+box.height/2];
  });
  for(const shot of shots){
   const side=shot.classList.contains("side-1")?1:0,a=centers[side],b=centers[1-side];
   shot.style.setProperty("--shot-x",a[0]+"px");shot.style.setProperty("--shot-y",a[1]+"px");
   shot.style.setProperty("--shot-span",Math.abs(b[0]-a[0])+"px");
   shot.style.setProperty("--shot-dy",(b[1]-a[1])+"px");
  }
 }
 // Keep non-green attack paths and the ally explosion tied to measured model
 // centers after the viewport is narrowed; do not use window-width travel.
 function positionLab14Effects(){
  const fx=root.querySelector?.(".fxfield");if(!fx)return;
  const pilots=[...fx.closest(".arena").querySelectorAll(".pilot")];if(pilots.length!==2)return;
  const bounds=fx.getBoundingClientRect();
  const centers=pilots.map(p=>{
   const r=(p.querySelector(".lab14-model,.echo-model,.mech")||p).getBoundingClientRect();
   return [r.left-bounds.left+r.width/2,r.top-bounds.top+r.height/2];
  });
  for(const el of fx.querySelectorAll(".lab14-attack:not(.lab14-green-shot),.lab14-ally")){
   const side=el.classList.contains("side-1")?1:0,[x,y]=centers[side],[tx,ty]=centers[1-side];
   if(el.classList.contains("lab14-ally")){
    el.style.left=tx+"px";el.style.top=ty+"px";el.style.setProperty("--ally-start",(x-tx)+"px");continue;
   }
   el.style.setProperty("--lab14-shift",(tx-x)+"px");
   if(el.classList.contains("lab14-beam")){
    el.style.left=Math.min(x,tx)+"px";el.style.width=Math.abs(tx-x)+"px";el.style.top=((y+ty)/2)+"px";
   }else if(el.classList.contains("lab14-slash")){
    el.style.left=x+"px";el.style.top=y+"px";
   }else{el.style.left=x+"px";el.style.top=y+"px"}
  }
 }
 root.ownerDocument?.defaultView?.addEventListener("resize",()=>{positionGreenShots();positionLab14Effects()});
 function handInput(v){
  const stage=playback?.stage||"ready";
  return `${battleHeader(v)}${roster(v)}<div class="command-input" data-input-stage="${stage}"><span class="sr-only">登録順（左から解決）</span><div class="register-row"><div class="sequence">${[0,1,2].map(k=>draft[k]?`<div class="card ${tone(v,who,draft[k],k)[0]}">${handIcon(draft[k],v.colors[who],k,tone(v,who,draft[k],k)[0])}<span class="sr-only">${k+1}手目 ${names[draft[k]]}</span></div>`:`<div class="empty">${k+1}</div>`).join("")}</div></div>${selectableCards(v)}<div class="register-actions">${button("submit","OK","",!!playback||!game.legal(who,draft),"primary confirm-wide")}</div></div>`;
 }
 function render(){
  handId=0;
  let body="";
  if(!game){body=`<h2>ローカル対戦 α</h2><p>5機から3機、BO3、共有デッキ。</p><p class="caption">検証用の暫定性能。対戦記録は匿名の試合ID、編成、手順、勝敗、時刻等をこの端末に保存できます。自動送信はしません。JSONを渡す場合は両者の同意を確認してください。</p>${botChoose?`<h3>BOT対戦（1人）</h3><div class="start-actions">${button("start-bot","ログ保存に同意して開始","yes",false,"primary")}${button("start-bot","ログなしで開始","no")}</div>`:""}<h3>2人対戦（1台）</h3><div class="start-actions">${button("start","ログ保存に同意して開始","yes")}${button("start","ログなしで開始","no")}</div>`;}
  else{
   const v=game.view(who);
   if(playback){
    const p=presentationView(v),stage=playback.stage,l=stage==="reveal"?revealed.at(-1):null;
    if(["deal","sort","focus"].includes(stage))body=handInput(p);
    else if(stage==="transfer")body=`${battleHeader(p)}${roster(p)}<div class="command-receipt" role="status">COMMAND TRANSFER<span>コマンド転送中</span></div>`;
    else if(stage==="intro")body=`${battleHeader(p)}${roster(p)}<div class="combat-intro" role="status" aria-label="ラウンド ${p.round} 戦闘開始"><span class="intro-round" aria-hidden="true">ROUND ${String(p.round).padStart(2,"0")}</span><strong class="intro-fight" aria-hidden="true">FIGHT</strong></div>${roundBoard(p)}`;
    else body=`${battleHeader(p)}${roster(p)}<div class="stage-line" role="status">${playback.before.step+1} / 3 <span class="sr-only">${({charge:"攻撃準備",blast:"交戦",repair:"ダメージ・修理",reveal:"手札公開"})[stage]}</span></div>${roundBoard(p)}${readout(l)}`;
   }else if(v.phase==="complete"||v.phase==="abandoned"){body=`${battleHeader(v)}<h2>${v.phase==="complete"?resultLabel(v.result):"対戦中断"}</h2>${v.phase==="complete"&&revealed.length?roundBoard(v)+readout(revealed.at(-1)):""}<p>${consent?"ログの保存対象です。":"ログなしでプレイしました。"}</p>${button("home","タップするとタイトルへ","","", "tap-title")}`}
   else if(cover){body=`<div class="handoff"><h2>${playerLabel(who)} に端末を渡す</h2><p>前のプレイヤーは画面を見ないでください。</p>${button("show","準備完了")}</div>`}
   else if(v.phase==="roster"||v.phase==="deploy"){
    const isRoster=v.phase==="roster",avail=isRoster?Object.keys(colors):v.rosters[who].filter(c=>!v.used[who].includes(c));
    body=`${isRoster?"":roster(v)+battleHeader(v)}<h2>${playerLabel(who)}：${isRoster?"3機編成":"出撃機体を選択"}</h2><p class="caption">${isRoster?`${draft.length}/3 機を選択`:"両者の確定後に公開"}</p><div class="mech-select">${avail.map(c=>button("select",`${mechGraphic(c,5)}${mechName(c)}<small>${abilityDescription(colors[c].ability,c)}</small>`,c,false,draft.includes(c)?"selected":"")).join("")}</div>${button("submit","OK","",!game.legal(who,isRoster?draft:draft[0]),"primary confirm-wide")}`;
   }else if(v.phase==="hands"){
    body=handInput(v);
   }else{
    body=`${battleHeader(v)}${roster(v)}<h2>${v.phase==="battle_result"?"機体戦 "+resultLabel(v.battleResult.winner):v.phase==="round_result"?"ROUND "+v.round+" 完了":"両者の登録完了"}</h2>${roundBoard(v)}${readout(revealed.at(-1))}${v.phase==="resolve"?button("fight","戦闘開始","","","primary"):button("advance",`<svg aria-hidden="true" viewBox="0 0 36 20" class="fast-forward"><path d="M2 1L16 10 2 19Z M19 1L33 10 19 19Z" fill="currentColor"/></svg><span class="sr-only">${v.phase==="battle_result"?"次の機体戦":"次のラウンド"}</span>`,"",false,"primary")}`;
   }
  }
  const v=game?.view();renderStable(`<header><strong class="deltrion-title"><span>電脳拳士</span> DELTRION</strong><small>DEV α 0.1.20</small>${timerVisual()}</header>${v&&v.battle?`<div class="caption">機体戦 ${v.battle}/3 ・ ROUND ${v.round}/3</div>`:""}${body}<footer>${game&&!playback&&!["complete","abandoned"].includes(v.phase)?button("abandon","対戦中断"):""}${!playback&&!game?button("export",`ログJSON保存 (${saved.length})`,"",!saved.length):""}${storageWarning?`<p>${storageWarning}</p>`:""}</footer>`);
 }
 root.addEventListener("click",e=>{
  const b=e.target.closest("button[data-action]");
  if(playback)return;
  if(!b){if(game&&["complete","abandoned"].includes(game.view().phase)){stopTimer();epoch++;revealed=[];info=null;game=null;render()}return}
  if(b.disabled)return;const {action,value}=b.dataset;
  if(timer&&clock()>=timer.deadline){timeoutCurrent();return}
  if(action==="deck-info"||action==="skill"||action==="close-info"){
   if(!game||cover)return;
   const v=game.view(who);
   if(action==="deck-info"&&v.phase==="hands")info=info==="deck"?null:"deck";
   else if(action==="skill"&&["0","1"].includes(value)&&v.colors[Number(value)])info=info==="skill-"+value?null:"skill-"+value;
   else if(action==="close-info")info=null;
   render();return;
  }
  info=null;
  switch(action){
   case "start-bot":if(!botChoose)return;
   case "start":stopTimer();epoch++;revealed=[];mode=action==="start-bot"?"local-bot":"local";consent=value==="yes";game=createGame({id:makeId(),mode,botPolicy:mode==="local-bot"?botPolicy:null});recorded=false;enterSelection();break;
   case "home":if(!game||!["complete","abandoned"].includes(game.view().phase))return;stopTimer();epoch++;revealed=[];game=null;break;
   case "show":if(!cover)return;cover=false;startInput();break;
   case "select":if(game.view().phase==="roster"){if(draft.includes(value))draft=draft.filter(c=>c!==value);else if(draft.length<3)draft.push(value)}else draft=[value];break;
   case "card":{
    const v=game.view(who),i=Number(value);
    if(!cover&&v.phase==="hands"&&Number.isInteger(i)&&i>=0&&i<v.offer.length){
     const at=draftSlots.indexOf(i);if(at>=0){draft.splice(at,1);draftSlots.splice(at,1)}
     else if(draft.length<3){draft.push(v.offer[i]);draftSlots.push(i)}
    }
    break;
   }
   case "rainbow":{
    const v=game.view(who);
    if(!cover&&v.phase==="hands"&&v.rainbow[who]==="ready"){
     const at=draftSlots.indexOf(-1);if(at>=0){draft.splice(at,1);draftSlots.splice(at,1)}
     else if(draft.length<3){draft.push("rainbow");draftSlots.push(-1)}
    }
    break;
   }
   case "submit":submitCurrent();return;
   case "fight":beginCombat();return;
   case "advance":if(!["battle_result","round_result"].includes(game.view().phase))return;game.advance();revealed=[];if(["deploy","hands"].includes(game.view().phase))enterSelection();break;
   case "abandon":if(confirmReset()){stopTimer();game.abandon();persist()}break;
   case "export":if(game||!saved.length)return;download(JSON.stringify(saved,null,2));break;
  }
  render();
 });
 render();
};
boot({root:document.getElementById("app"),createGame,robotSVG,commandFX:globalThis.DataParticleFX,botChoose:chooseBot,botPolicy:BOT_POLICY,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},download:data=>{const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="robot-janken-alpha-"+Date.now()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},confirmReset:()=>confirm("この対戦を中断しますか？"),reducedMotion:()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false,makeId:()=>globalThis.crypto?.randomUUID?.()||"local-"+Date.now()+"-"+Math.random().toString(36).slice(2)});
