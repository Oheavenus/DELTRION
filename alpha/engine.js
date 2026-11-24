// ROBOT JANKEN local alpha: DOM-independent rules; docs/04 and v2 apply_hand.
const createGame = function createGame({rng=Math.random,now=()=>Date.now(),id="local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}={}){
 const version="alpha-local-0.1", colors=["red","blue","yellow","green","purple"],hands=["rock","scissors","paper","rainbow"];
 const clone=x=>JSON.parse(JSON.stringify(x)), check=(ok,msg)=>{if(!ok)throw Error(msg)}, pair=()=>[null,null], counts=a=>hands.slice(0,3).map(h=>a.filter(x=>x===h).length);
 const s={phase:"roster",rosters:pair(),used:[[],[]],wins:[0,0],rainbow:["locked","locked"],battle:0,round:0,step:0,colors:pair(),hp:[5,5],hyper:[false,false],greenUsed:[false,false],offer:[],remaining:[5,5,5],last:null,battleResult:null,result:null};
 let pending=pair(),deck=[],sequences=null;
 const log={schema:1,version,id,mode:"local",startedAt:now(),events:[],status:"active"};
 let phaseAt=now();
 function event(type,data={}){log.events.push(clone({type,at:now(),battle:s.battle,round:s.round,...data}))}
 function phase(p){s.phase=p;phaseAt=now()}
 function view(player=null){
   check(player===null||player===0||player===1,"invalid player");
   const v=clone(s);
   if(s.phase==="roster")v.rosters=pair();
   v.submitted=pending.map(x=>x!==null);
   v.ownSubmission=player===null?null:clone(pending[player]);
   return v;
 }
 function shuffle(){const a=hands.slice(0,3).flatMap(h=>Array(5).fill(h));for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));check(j>=0&&j<=i,"invalid rng");[a[i],a[j]]=[a[j],a[i]]}return a}
 function openRound(){s.round++;s.step=0;s.last=null;s.offer=deck.splice(0,5);s.remaining=counts(deck);pending=pair();sequences=null;phase("hands");event("offer",{offer:s.offer,remaining:s.remaining})}
 function startBattle(picks){s.battle++;s.round=0;s.colors=picks.slice();s.hp=[5,5];s.hyper=[false,false];s.greenUsed=[false,false];s.battleResult=null;deck=shuffle();event("battle_start",{colors:s.colors,mirror:picks[0]===picks[1],rainbow:s.rainbow,remainingRoster:s.rosters.map((a,i)=>a.filter(c=>!s.used[i].includes(c)))});openRound()}
 function legal(player,value){
   if((player!==0&&player!==1)||pending[player]!==null)return false;
   if(s.phase==="roster")return Array.isArray(value)&&value.length===3&&new Set(value).size===3&&value.every(c=>colors.includes(c));
   if(s.phase==="deploy")return s.rosters[player].includes(value)&&!s.used[player].includes(value);
   if(s.phase==="hands"){
     if(!Array.isArray(value)||value.length!==3||!value.every(h=>hands.includes(h)))return false;
     const r=value.filter(h=>h==="rainbow").length;
     return r<2&&(r===0||s.rainbow[player]==="ready")&&counts(value).every((n,i)=>n<=counts(s.offer)[i]);
   }
   return false;
 }
 function submit(player,value,metadata=null){
   check(legal(player,value),"illegal submission");
   if(metadata?.timeout===true){
     check(Number.isInteger(metadata.limitSeconds)&&metadata.limitSeconds>0,"invalid timer limit");
     check(Number.isInteger(metadata.alreadySelected)&&metadata.alreadySelected>=0&&metadata.alreadySelected<=3,"invalid partial selection count");
     event("selection_timeout",{player,phase:s.phase,limitSeconds:metadata.limitSeconds,alreadySelected:metadata.alreadySelected,autoFilled:metadata.autoFilled,selection:clone(value)});
   }
   pending[player]=clone(value);
   // Phase elapsed time includes hand-off pauses. Precise active input time belongs to the UI timer metadata.
   event("commit",{player,phase:s.phase,elapsedMs:Math.max(0,now()-phaseAt),timeout:metadata?.timeout===true});
   if(pending.some(x=>x===null))return;
   const both=clone(pending);pending=pair();
   if(s.phase==="roster"){s.rosters=both;event("rosters",{rosters:both,notSelected:both.map(a=>colors.filter(c=>!a.includes(c)))});phase("deploy")}
   else if(s.phase==="deploy"){startBattle(both)}
   else {sequences=both;event("hands_registered",{sequences:both});phase("resolve")}
 }
 function finishBattle(){
   const winner=s.hp[0]===s.hp[1]?null:s.hp[0]>s.hp[1]?0:1;
   if(winner!==null)s.wins[winner]++;
   s.colors.forEach((c,i)=>s.used[i].push(c));
   const terminal=s.battle>=3||Math.max(...s.wins)>=2;
   s.battleResult={winner,reason:s.hp.includes(0)?"KO":"hp",hp:s.hp.slice()};
   event("battle_end",{...s.battleResult,wins:s.wins,used:s.used,rainbow:s.rainbow,unresolved:sequences.map(a=>a.slice(s.step))});
   if(terminal){
     s.result=s.wins[0]===s.wins[1]?null:s.wins[0]>s.wins[1]?0:1;
     event("match_end",{winner:s.result,wins:s.wins,rainbowBeforeDiscard:s.rainbow});
     s.rainbow=s.rainbow.map(r=>r==="ready"?"locked":r);log.status="complete";log.endedAt=now();phase("complete");
   }else{
     if(winner!==null&&s.rainbow[1-winner]==="locked"){s.rainbow[1-winner]="ready";event("rainbow_unlock",{player:1-winner,availableFromBattle:s.battle+1})}
     phase("battle_result");
   }
 }
 function advance(){
   if(s.phase==="battle_result"){s.colors=pair();s.last=null;s.offer=[];phase("deploy");return}
   if(s.phase==="round_result"){openRound();return}
   check(s.phase==="resolve","cannot resolve");const k=s.step, h=sequences.map(a=>a[k]), before=s.hp.slice(), beforeHyper=s.hyper.slice(), beforeRainbow=s.rainbow.slice(), damage=[0,0], heal=[0,0], triggers=[], outcome=h[0]===h[1]?null:null;
   let winner=null;
   if(h.includes("rainbow")){
     h.forEach((x,i)=>{if(x==="rainbow"){check(s.rainbow[i]==="ready","illegal rainbow resolution");s.rainbow[i]="spent";triggers.push({player:i,ability:"rainbow_use"})}});
     if(h[0]!==h[1]){winner=h[0]==="rainbow"?0:1;damage[winner]=s.colors[winner]==="blue"?2:1}
   }else if(h[0]===h[1]){
     damage.fill(1);s.colors.forEach((c,i)=>{if(c==="green"&&!s.greenUsed[i]){damage[i]++;s.greenUsed[i]=true;triggers.push({player:i,ability:"green_tie"})}})
   }else{
     winner=(hands.indexOf(h[0])-hands.indexOf(h[1])+3)%3===2?0:1;
     const c=s.colors[winner];damage[winner]=1;
     if(c==="red"||(c==="blue"&&h[winner]==="paper")||(c==="purple"&&s.hyper[winner]))damage[winner]=2;
     if(c==="yellow"&&k===0)damage[winner]=3;
     if(c==="purple"||(c==="blue"&&h[winner]==="rock"))heal[winner]=1;
     if(damage[winner]>1)triggers.push({player:winner,ability:"strong_attack"});
     if(heal[winner])triggers.push({player:winner,ability:"heal"});
   }
   s.hp=before.map((hp,i)=>Math.max(0,Math.min(5,hp-damage[1-i]+heal[i])));
   s.colors.forEach((c,i)=>{if(c==="purple"&&s.hp[i]<=3&&!s.hyper[i]){s.hyper[i]=true;triggers.push({player:i,ability:"hyper"})}});
   s.step++;s.last={hands:h,winner,before,hp:s.hp.slice(),damage,heal,actualHeal:heal.map((n,i)=>Math.min(n,5-before[i])),triggers,step:s.step,beforeHyper,hyper:s.hyper.slice(),beforeRainbow,rainbow:s.rainbow.slice()};event("hand_resolved",s.last);
   if(s.hp.includes(0)||(s.round===3&&s.step===3))finishBattle();
   else if(s.step===3)phase("round_result");
 }
 function exportLog(){check(log.status!=="active","finish or abandon before exporting");return clone(log)}
 function abandon(){if(log.status==="active"){event("abandon",{phase:s.phase,wins:s.wins});log.status="abandoned";log.endedAt=now();phase("abandoned")}return exportLog()}
 return {view,legal,submit,advance,exportLog,abandon,version};
};
if (typeof module !== 'undefined' && module.exports) module.exports = {createGame};
