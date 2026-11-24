// Local hot-seat UI; approved PNG hand sprites and timed combat presentation.
const boot = function boot({root,createGame,robotSVG,storage,download,confirmReset,makeId,schedule=(fn,ms)=>setTimeout(fn,ms),reducedMotion=()=>false,clock=()=>Date.now(),timerSchedule=(fn,ms)=>setTimeout(fn,ms),botChoose=null,botPolicy="practice-v1",botRng=Math.random}){
 const colors={red:{name:"赤",hex:"#f86c71",shade:"#733043",style:"mono",ability:"通常勝利：2ダメージ"},blue:{name:"青",hex:"#57baff",shade:"#244e79",style:"hero",ability:"パー・虹勝利：2、グー勝利：回復1"},yellow:{name:"黄",hex:"#ffd369",shade:"#8f6721",style:"brave",ability:"各ラウンド初手勝利：3ダメージ"},green:{name:"緑",hex:"#56e1a5",shade:"#296851",style:"blade",ability:"機体戦最初の通常あいこ：追加1ダメージ"},purple:{name:"紫",hex:"#c192ff",shade:"#5a3780",style:"cute",ability:"通常勝利：回復1、HP3以下でハイパー"}};
 const names={rock:"グー",scissors:"チョキ",paper:"パー",rainbow:"虹"};
 const skills={
  red:["正義の心","通常の手で勝つと、相手に2ダメージ。"],
  blue:["今だ！","パー・虹で勝つと2ダメージ。グーで勝つとHPを1回復。"],
  yellow:["スピードスター","各ラウンドの1手目に通常の手で勝つと、相手に3ダメージ。"],
  green:["俺が守る…","機体戦で最初の通常あいこ時、相手へのダメージが1増える（相手2、自分1が基本）。"],
  purple:["ハートフルモード","通常の手で勝つとHPを1回復。HP3以下でハイパー化し、その機体戦中の通常勝利は2ダメージ。"]
 };
 const key="robot-janken-alpha-logs-v1";let game=null,who=0,cover=false,draft=[],draftSlots=[],saved=[],storageWarning="",consent=false,recorded=false;
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
   game.submit(1,choice);startTimer();
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
     for(let k=0;k<v.offer.length&&chosen.length<3;k++){
       if(!slots.includes(k)){chosen.push(v.offer[k]);slots.push(k)}
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
   game.submit(who,value,metadata&&{timeout:true,limitSeconds:limits[p],alreadySelected:metadata.alreadySelected,autoFilled:metadata.filled.length});
   draft=[];draftSlots=[];
   if(game.view().phase===p){who=1-who;cover=true}else{who=0;cover=false;if(selectPhase() in limits)enterSelection()}
   render();
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
 function handIcon(h,color=null,k=0,state="normal"){
  const shape=h==="rainbow"?"hex":k%2?"up":"down",id="hand-rim-"+(++handId);
  const poly={down:"10,15 110,15 60,101.60254",up:"60,15 10,101.60254 110,101.60254",hex:"35,15 85,15 110,58.30127 85,101.60254 35,101.60254 10,58.30127"}[shape];
  const tint=handPalettes[color]||["#d6dce8","#58e9ff"],c=handRims[state]||handRims.normal;
  const rim=shape==="hex"?"url(#"+id+")":c;
  const fill=shape==="hex"?"#29223f":state==="gold"?"#392e1d":state==="strong"?"#352331":state==="heal"?"#173b32":"#122a3d";
  return `<span aria-hidden="true" class="hand-icon hand-sprite hand-${h} lab-hand ${shape} lab-${state}" style="--armor:${tint[0]};--light:${tint[1]};--rim:${c}"><svg class="lab-frame" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ff4566"/><stop offset=".22" stop-color="#ffdc55"/><stop offset=".45" stop-color="#64ff98"/><stop offset=".68" stop-color="#4adfff"/><stop offset="1" stop-color="#b878ff"/></linearGradient></defs><polygon points="${poly}" fill="none" stroke="${rim}" stroke-width="9" opacity=".15"/><polygon points="${poly}" fill="${fill}" stroke="#07131f" stroke-width="5" stroke-linejoin="round"/><polygon class="lab-field" points="${poly}" fill="${rim}" opacity=".08"/><polygon class="lab-glow" points="${poly}" fill="none" stroke="${rim}" stroke-width="5" stroke-linejoin="round"/><polygon points="${poly}" fill="none" stroke="${rim}" stroke-width="1.8" stroke-linejoin="round"/><polygon class="lab-trace" points="${poly}" fill="none" stroke="${rim}" stroke-width="2.8" pathLength="100"/></svg><span class="lab-art"><span class="lab-armor"></span><span class="lab-light"></span></span></span>`;
 }
 function tone(v,i,h,k){
  if(h==="rainbow")return ["rainbow","必勝"];
  const c=v.colors[i];if(c==="purple"&&v.hyper[i])return ["gold","HYPER ＋"];
  if(c==="red"||(c==="blue"&&h==="paper")||(c==="yellow"&&k===0))return ["strong","強攻撃"];
  if(c==="purple"||(c==="blue"&&h==="rock"))return ["heal","回復 ＋"];
  if(c==="green"&&!v.greenUsed[i])return ["normal","あいこ強化"];
  return ["normal","通常"];
 }
 function battleHeader(v){
  return `<div class="arena-info-wrap"><div class="arena">${[0,1].map(i=>{const c=colors[v.colors[i]],l=playback?.after?.last,stage=playback?.stage,pose=stage==="charge"?"charge":stage==="blast"?(l?.winner===i||l?.winner===null?"attack":"hit"):stage==="repair"?(l?.actualHeal[i]>0?"heal":v.hp[i]===0?"lose":l?.damage[1-i]>0?"hit":"idle"):v.hp[i]===0?"lose":"idle";return `<section class="pilot ${v.hyper[i]?"hyper":""} pose-${pose}" style="--chassis:${c?.hex||"#78899b"}"><b>${playerLabel(i)} ・ ${c?.name||"出撃待ち"}</b><div class="score" aria-label="${v.wins[i]}勝">${[0,1].map(k=>`<i class="win-pip ${k<v.wins[i]?"won":""}" aria-hidden="true"></i>`).join("")}</div>${c?(playback?robotSVG(c,v.hp[i],{side:i,pose}):`<button type="button" class="mech-info-trigger" data-action="skill" data-value="${i}" aria-label="${playerLabel(i)} ${c.name}のスキル" aria-expanded="${info==="skill-"+i}">${robotSVG(c,v.hp[i],{side:i,pose})}</button>`):""}<div class="hp" aria-label="HP ${v.hp[i]}">${Array.from({length:5},(_,k)=>`<span class="${k<v.hp[i]?"on":""}"></span>`).join("")}</div><div class="rights">${v.rainbow[i]==="ready"?'<span class="rainbow-dot" role="img" aria-label="虹の使用権あり" title="虹の使用権あり"></span>':""}${v.hyper[i]?"<span class='gold-label' role='img' aria-label='ハイパー化' title='ハイパー化'>✦</span>":""}</div></section>`}).join('<span class="vs">VS</span>')}${combatFX()}</div>${[0,1].map(i=>!playback&&info==="skill-"+i&&v.colors[i]?skillWindow(v.colors[i],i):"").join("")}</div>`;
 }
 function skillWindow(color,i){
  const [name,desc]=skills[color],c=colors[color];
  return `<button type="button" data-action="close-info" class="info-window skill-window side-${i}" style="--info-accent:${c.hex}" aria-label="${name}。 ${desc}。閉じる"><span class="skill-name">${name}</span><span class="skill-desc">${desc}</span></button>`;
 }
 function deckInfo(v){
  const total=v.remaining.reduce((a,b)=>a+b,0);
  return `<div class="deck-info-wrap"><button type="button" data-action="deck-info" class="deck-count" aria-label="残りデッキ ${total}枚の内訳" aria-expanded="${info==="deck"}"><span class="deck-symbol" aria-hidden="true"></span>${total}</button>${info==="deck"?`<button type="button" data-action="close-info" class="info-window deck-window" aria-label="${["rock","scissors","paper"].map((h,i)=>names[h]+" 残り"+v.remaining[i]+"/5").join("、")}。閉じる">${["rock","scissors","paper"].map((h,i)=>`<span class="deck-item" data-hand="${h}">${handIcon(h)}<span class="deck-fraction">${v.remaining[i]}/5</span></span>`).join("")}</button>`:""}</div>`;
 }
 function combatFX(){
  if(!playback?.after)return "";
  const l=playback.after.last,stage=playback.stage;
  if(stage==="blast"){
   const tie=l.winner===null,side=l.winner??0,c=colors[playback.after.colors[side]],isRainbow=l.hands.includes("rainbow");
   const beam=isRainbow?"#e8b9ff":tie?"#fff":c.hex,back=side===1?" back":"",kind=({red:"slashfx",blue:"beam",green:"arcfx",yellow:"boltfx",purple:"orbfx"})[playback.after.colors[side]];
   const fx=tie||isRainbow?`<div class="beam${tie?" tie":back} ${isRainbow?"rainbow-beam":""}" style="--beam:${beam}"></div>`:kind==="orbfx"?`<div class="orbfx ${side===0?"right":"left"}" style="--beam:${beam};--orb-move:${side===0?"52px":"-52px"};--orb-move-end:${side===0?"80px":"-80px"}"></div>`:`<div class="${kind}${back}" style="--beam:${beam}"></div>`;
   return `<div class="fxfield" aria-hidden="true"><div class="flash" style="--beam:${beam}"></div>${fx}${[0,1].filter(i=>l.damage[1-i]>0).map(i=>`<span class="starburst ${i===0?"left":"right"}">✴</span><span class="blast ${i===0?"left":"right"}">💥</span>`).join("")}</div>`;
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
    },580);
   },600);
  },220);
 }
 function beginCombat(){
  if(cover||playback||game.view().phase!=="resolve")return;
  epoch++;revealed=[];info=null;runHand();
 }
 function roster(v){return `<div class="rosters">${v.rosters.map((r,i)=>`<div>${playerLabel(i)}：${r.map(c=>`<span style="color:${colors[c].hex};${v.used[i].includes(c)?"text-decoration:line-through;opacity:.5":""}">${colors[c].name}</span>`).join(" / ")}</div>`).join("")}</div>`}
 function cards(v){return `<div class="caption">共有カード（全員同じ）</div><div class="offer">${v.offer.map(h=>`<div class="card">${handIcon(h)}<small>${names[h]}</small></div>`).join("")}</div><div class="caption">残りデッキ ${v.remaining.reduce((a,b)=>a+b,0)}枚</div>`}
 function selectableCards(v){
  return `<span class="sr-only">公開された5枚から、使う順に札をタップ</span><div class="offer selectable-offer">${v.offer.map((h,i)=>{
   const selected=draftSlots.indexOf(i),[t,label]=tone(v,who,h,selected<0?draft.length:selected);
   return button("card",`${handIcon(h,v.colors[who],i,t)}<span class="sr-only">${names[h]}・${label}${selected>=0?"・"+(selected+1)+"手目":""}</span>${t==="heal"||t==="gold"?'<span class="ability-mark heal-mark" aria-hidden="true">+</span>':t==="strong"?'<span class="ability-mark strong-mark" aria-hidden="true">✦</span>':label==="あいこ強化"?'<span class="ability-mark tie-mark" aria-hidden="true">Ⅱ</span>':""}${selected>=0?`<span class="slot-order" aria-hidden="true">${selected+1}</span>`:""}`,i,selected>=0||draft.length>=3,"card choice "+t+(selected>=0?" picked":""));
  }).join("")}</div>${deckInfo(v)}`;
 }
 function rainbowChoice(v){
  const selected=draftSlots.includes(-1),status=v.rainbow[who],off=draft.length>=3||status!=="ready"||selected;
  const label=selected?"登録済み":status==="ready"?"使用可能":status==="spent"?"使用済み":"未解禁";
  return `<div class="rainbow-row">${button("rainbow",`${handIcon("rainbow",v.colors[who],0,"rainbow")}<span class="sr-only">虹・${label}</span>${selected?`<span class="slot-order" aria-hidden="true">${draftSlots.indexOf(-1)+1}</span>`:""}`,"",off,"choice rainbow"+(selected?" picked":""))}</div>`;
 }
 function resultLabel(w){return w===null?"DRAW":`${playerLabel(w)} WIN`}
 function persist(){if(recorded||!game)return;recorded=true;if(!consent)return;const l=game.exportLog();saved.push(l);try{storage.setItem(key,JSON.stringify(saved))}catch{storageWarning="保存容量・設定の制約があります。JSONを今すぐ保存してください。"}}
 function render(){
  handId=0;
  let body="";
  if(!game){body=`<h2>ローカル対戦 α</h2><p>5機から3機、BO3、共有デッキ。</p><p class="caption">検証用の暫定性能。対戦記録は匿名の試合ID、編成、手順、勝敗、時刻等をこの端末に保存できます。自動送信はしません。JSONを渡す場合は両者の同意を確認してください。</p>${botChoose?`<h3>BOT対戦（1人）</h3>${button("start-bot","ログ保存に同意して開始","yes",false,"primary")}${button("start-bot","ログなしで開始","no")}`:""}<h3>2人対戦（1台）</h3>${button("start","ログ保存に同意して開始","yes")}${button("start","ログなしで開始","no")}`;}
  else{
   const v=game.view(who);
   if(playback){
    const p=presentationView(v),stage=playback.stage,l=stage==="reveal"?revealed.at(-1):null;
    body=`${battleHeader(p)}${roster(p)}<div class="stage-line" role="status">${playback.before.step+1} / 3 <span class="sr-only">${({charge:"攻撃準備",blast:"交戦",repair:"ダメージ・修理",reveal:"手札公開"})[stage]}</span></div>${roundBoard(p)}${readout(l)}`;
   }else if(v.phase==="complete"||v.phase==="abandoned"){body=`${battleHeader(v)}<h2>${v.phase==="complete"?resultLabel(v.result):"対戦中断"}</h2>${v.phase==="complete"&&revealed.length?roundBoard(v)+readout(revealed.at(-1)):""}<p>${consent?"ログの保存対象です。":"ログなしでプレイしました。"}</p>${button("home","タイトルへ")}`}
   else if(cover){body=`<div class="handoff"><h2>${playerLabel(who)} に端末を渡す</h2><p>前のプレイヤーは画面を見ないでください。</p>${button("show","準備完了")}</div>`}
   else if(v.phase==="roster"||v.phase==="deploy"){
    const isRoster=v.phase==="roster",avail=isRoster?Object.keys(colors):v.rosters[who].filter(c=>!v.used[who].includes(c));
    body=`${isRoster?"":roster(v)+battleHeader(v)}<h2>${playerLabel(who)}：${isRoster?"3機編成":"出撃機体を選択"}</h2><p class="caption">${isRoster?`${draft.length}/3 機を選択`:"両者の確定後に公開"}</p><div class="mech-select">${avail.map(c=>button("select",`${robotSVG(colors[c],5)}<b>${colors[c].name}</b><small>${colors[c].ability}</small>`,c,false,draft.includes(c)?"selected":"")).join("")}</div>${button("submit","OK","",!game.legal(who,isRoster?draft:draft[0]),"primary confirm-wide")}`;
   }else if(v.phase==="hands"){
    body=`${battleHeader(v)}${roster(v)}<h2 class="selection-title">${playerLabel(who)} <span class="sr-only">3手を登録</span> <span>（${draft.length}/3）</span></h2>${selectableCards(v)}<span class="sr-only">登録順（左から解決）</span><div class="register-row"><div class="sequence">${[0,1,2].map(k=>draft[k]?`<div class="card ${tone(v,who,draft[k],k)[0]}">${handIcon(draft[k],v.colors[who],k,tone(v,who,draft[k],k)[0])}<span class="sr-only">${k+1}手目 ${names[draft[k]]}</span></div>`:`<div class="empty">${k+1}</div>`).join("")}</div>${rainbowChoice(v)}</div><div class="register-actions">${button("undo",'<span aria-hidden="true" class="undo-arrow">↶</span><span class="sr-only">1手戻す</span>',"",!draft.length,"undo-compact")}${button("submit","OK","",!game.legal(who,draft),"primary confirm-wide")}</div>`;
   }else{
    body=`${battleHeader(v)}${roster(v)}<h2>${v.phase==="battle_result"?"機体戦 "+resultLabel(v.battleResult.winner):v.phase==="round_result"?"ROUND "+v.round+" 完了":"両者の登録完了"}</h2>${roundBoard(v)}${readout(revealed.at(-1))}${v.phase==="resolve"?button("fight","戦闘開始","","","primary"):button("advance",v.phase==="battle_result"?"次の機体戦":"次のラウンド","","","primary")}`;
   }
  }
  const v=game?.view();root.innerHTML=`<header><strong class="deltrion-title"><span>電脳拳士</span> DELTRION</strong><small>LOCAL α 0.1.10</small>${timerVisual()}</header>${v&&v.battle?`<div class="caption">機体戦 ${v.battle}/3 ・ ROUND ${v.round}/3</div>`:""}${body}<footer>${game&&!playback&&!["complete","abandoned"].includes(v.phase)?button("abandon","対戦中断"):""}${!playback&&(!game||["complete","abandoned"].includes(v?.phase))?button("export",`ログJSON保存 (${saved.length})`,"",!saved.length):""}${storageWarning?`<p>${storageWarning}</p>`:""}</footer>`;
 }
 root.addEventListener("click",e=>{
  const b=e.target.closest("button[data-action]");if(!b||b.disabled)return;const {action,value}=b.dataset;
  if(playback)return;
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
   case "home":stopTimer();epoch++;revealed=[];game=null;break;
   case "show":if(!cover)return;cover=false;startTimer();break;
   case "select":if(game.view().phase==="roster"){if(draft.includes(value))draft=draft.filter(c=>c!==value);else if(draft.length<3)draft.push(value)}else draft=[value];break;
   case "card":{
    const v=game.view(who),i=Number(value);
    if(!cover&&v.phase==="hands"&&draft.length<3&&Number.isInteger(i)&&i>=0&&i<v.offer.length&&!draftSlots.includes(i)){draft.push(v.offer[i]);draftSlots.push(i)}
    break;
   }
   case "rainbow":{
    const v=game.view(who);
    if(!cover&&v.phase==="hands"&&draft.length<3&&v.rainbow[who]==="ready"&&!draftSlots.includes(-1)){draft.push("rainbow");draftSlots.push(-1)}
    break;
   }
   case "undo":draft.pop();draftSlots.pop();break;
   case "submit":submitCurrent();return;
   case "fight":beginCombat();return;
   case "advance":if(!["battle_result","round_result"].includes(game.view().phase))return;game.advance();revealed=[];if(["deploy","hands"].includes(game.view().phase))enterSelection();break;
   case "abandon":if(confirmReset()){stopTimer();game.abandon();persist()}break;
   case "export":download(JSON.stringify(saved,null,2));break;
  }
  render();
 });
 render();
};
boot({root:document.getElementById("app"),createGame,robotSVG,botChoose:chooseBot,botPolicy:BOT_POLICY,storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},download:data=>{const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="robot-janken-alpha-"+Date.now()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},confirmReset:()=>confirm("この対戦を中断しますか？"),reducedMotion:()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false,makeId:()=>globalThis.crypto?.randomUUID?.()||"local-"+Date.now()+"-"+Math.random().toString(36).slice(2)});
