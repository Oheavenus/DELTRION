// Local practice opponent. Only its own public/authorized view is accepted.
const BOT_POLICY="practice-v1";
function chooseBot(v,rng=Math.random){
 const colors=["red","blue","yellow","green","purple"],hands=["rock","scissors","paper"];
 const pick=a=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
 const sample=(options,score)=>{
  const scores=options.map(score),max=Math.max(...scores),weights=scores.map(s=>Math.exp((s-max)/1.2));
  let r=rng()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<options.length;i++){r-=weights[i];if(r<0)return options[i]}
  return options.at(-1);
 };
 if(v.phase==="roster"){
  const pool=colors.slice(),roster=[];
  while(roster.length<3){const c=pick(pool);roster.push(c);pool.splice(pool.indexOf(c),1)}
  return roster;
 }
 if(v.phase==="deploy"){
  const available=v.rosters[1].filter(c=>!v.used[1].includes(c));
  return sample(available,c=>c==="blue"&&v.rainbow[1]==="ready"?1.25:0);
 }
 if(v.phase!=="hands")throw Error("BOT cannot act in "+v.phase);
 // Enumerate physical slots, deduplicate equivalent sequences. Rainbow can replace one.
 const pool=v.offer.slice();if(v.rainbow[1]==="ready")pool.push("rainbow");
 const options=[],seen=new Set();
 for(let i=0;i<pool.length;i++)for(let j=0;j<pool.length;j++)for(let k=0;k<pool.length;k++){
  if(i===j||j===k||i===k)continue;
  const seq=[pool[i],pool[j],pool[k]],key=seq.join(",");
  if(!seen.has(key)){seen.add(key);options.push(seq)}
 }
 const c=v.colors[1],op=v.colors[0];
 const value=(h,k)=>{
  if(h==="rainbow"){
   const damage=c==="blue"?2:1;
   // Prefer saving it early, but not at imminent risk of KO or match loss.
   const urgency=v.hp[1]<=2||v.hp[0]<=damage||v.round===3||v.wins[0]===1;
   return damage-(urgency?0.25:1.25);
  }
  let sum=0;
  for(const enemy of v.offer){
   const result=(hands.indexOf(h)-hands.indexOf(enemy)+3)%3;
   if(result===2){
    const damage=c==="red"||(c==="blue"&&h==="paper")||(c==="purple"&&v.hyper[1])?2:c==="yellow"&&k===0?3:1;
    const heal=(c==="purple"||(c==="blue"&&h==="rock"))&&v.hp[1]<5?0.65:0;
    sum+=damage+heal;
   }else if(result===1){
    sum-=op==="red"||(op==="blue"&&enemy==="paper")||(op==="purple"&&v.hyper[0])?2:op==="yellow"&&k===0?3:1;
   }else{
    sum+=(c==="green"&&!v.greenUsed[1]?0.65:0)-(op==="green"&&!v.greenUsed[0]?0.65:0);
   }
  }
  return sum/v.offer.length;
 };
 // Stochastic approximate response, not an exact minimax search or full simulator.
 return sample(options,seq=>seq.reduce((score,h,k)=>score+value(h,k)*(1-k*.12),0));
}
if(typeof module!=="undefined"&&module.exports)module.exports={chooseBot,BOT_POLICY};
