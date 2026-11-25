// Run: node alpha/tests/rainbow-presentation.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGame} = require("../engine.js");
const source=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
const boot=new Function(source.slice(0,source.lastIndexOf("\nboot({"))+"\nreturn boot;")();
const real=createGame({rng:()=>0.37,now:()=>0,id:"test"});
assert.equal(real.currentHands(),null);
const roster=["red","blue","yellow"];real.submit(0,roster);real.submit(1,roster);real.submit(0,"red");real.submit(1,"blue");
const offer=real.view().offer;real.submit(0,offer.slice(0,3));assert.equal(real.currentHands(),null);real.submit(1,offer.slice(1,4));
assert.deepEqual(real.currentHands(),[offer[0],offer[1]]);real.currentHands()[0]="rainbow";assert.equal(real.currentHands()[0],offer[0]);real.advance();assert.deepEqual(real.currentHands(),[offer[1],offer[2]]);
let count=0;
for(const c0 of ["red","blue","yellow","green","purple"])for(const c1 of ["red","blue","yellow","green","purple"])for(const pair of [["rainbow","rock"],["rainbow","scissors"],["rainbow","paper"],["rock","rainbow"],["scissors","rainbow"],["paper","rainbow"],["rainbow","rainbow"],["rock","scissors"],["paper","paper"]]){
 const rw=pair[0]===pair[1]?null:pair.includes("rainbow")?pair.indexOf("rainbow"):0;
 const dmg=rw===null?(pair[0]==="rainbow"?[0,0]:[1,1]):rw===0?[1,0]:[0,1];
 const v={phase:"resolve",colors:[c0,c1],hp:[5,5],hyper:[false,false],wins:[0,0],rainbow:pair.map(x=>x==="rainbow"?"ready":"locked"),rosters:[[c0,"red","blue"],[c1,"red","blue"]],used:[[],[]],step:0,battle:2,round:1,remaining:[3,3,4],offer:["rock","scissors","paper","rock","paper"],last:null};
 let state=v,handler,queue=[],root={innerHTML:"",addEventListener:(name,fn)=>handler=fn};
 const game={view:()=>state,currentHands:()=>pair.slice(),advance:()=>{state={...v,phase:"round_result",hp:v.hp.map((h,i)=>h-dmg[1-i]),rainbow:v.rainbow.map((r,i)=>pair[i]==="rainbow"?"spent":r),last:{hands:pair,winner:rw,damage:dmg,actualHeal:[0,0],beforeHyper:[false,false],triggers:[],rainbow:pair.map(x=>x==="rainbow"?"spent":"locked")}}}};
 boot({root,createGame:()=>game,robotSVG:(c,h,o)=>'<i data-fallback-pose="'+o.pose+'"></i>',storage:{getItem:()=>null},download:()=>{},confirmReset:()=>true,makeId:()=>"test",schedule:fn=>queue.push(fn),timerSchedule:()=>{},clock:()=>0});
 const click=(action,value="")=>handler({target:{closest:()=>({dataset:{action,value},disabled:false})}});
 click("start","no");click("show");click("fight");
 const poses=()=>[...root.innerHTML.matchAll(/class="pilot [^"]*pose-(\w+)"/g)].map(m=>m[1]);
 assert.deepEqual(poses(),pair.map((h,i)=>pair[1-i]==="rainbow"&&h!=="rainbow"?"idle":"charge"));
 if(pair.includes("rainbow"))assert.equal((root.innerHTML.match(/battle-slot current revealed/g)||[]).length,2);
 assert.equal(state.phase,"resolve");
 queue.shift()();assert.deepEqual(poses(),[0,1].map(i=>rw===null||rw===i?"attack":"hit"));
 assert.equal((root.innerHTML.match(/rainbow-beam/g)||[]).length,pair.includes("rainbow")?1:0);
 queue.shift()();assert.deepEqual(poses(),[0,1].map(i=>dmg[1-i]>0?"hit":"idle"));count++;
}
console.log("PASS: "+count+" presentation cases; currentHands privacy and copy checks.");
