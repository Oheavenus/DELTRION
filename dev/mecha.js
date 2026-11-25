// Reused SVG art from game/robot_janken_mecha.html; original preserved.
function headParts(def,hp){
 const c=def.hex,d=def.shade,dead=hp===0;
 const deadEyes='<g stroke="#ff7586" stroke-width="4" stroke-linecap="round"><path d="M55 59l13 13m0-13L55 72M92 59l13 13m0-13L92 72"/></g>';
 const legs={
  mono:[`<path d="M53 135h23l-2 23-7 5H46l4-13Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M49 153h26l1 10H43Z" fill="${d}"/>`,`<path d="M84 135h23l4 24 6 4H94l-9-6Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M86 153h27l4 10H87Z" fill="${d}"/>`],
  hero:[`<path d="M54 133h22l-3 25-8 6H45l10-12Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M56 143l13-3-3 17-16 4Z" fill="#e9f6ff"/>`,`<path d="M84 133h22l4 19 8 12H96l-9-6Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M92 141l13 3 5 17-16-4Z" fill="#e9f6ff"/>`],
  blade:[`<path d="M52 135h22l-5 24-12 6H44l10-14Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M46 161l20-6" stroke="#c9ffeb" stroke-width="3"/>`,`<path d="M86 135h22l3 16 10 14h-18l-12-8Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M96 155l19 6" stroke="#c9ffeb" stroke-width="3"/>`],
  brave:[`<path d="M49 137h29l-4 21-6 6H40l8-12Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M45 155h29" stroke="#fff5c9" stroke-width="4"/>`,`<path d="M82 137h29l2 15 8 12H94l-9-6Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M89 155h29" stroke="#fff5c9" stroke-width="4"/>`],
  cute:[`<path d="M59 136h16l-2 19-7 6H55l4-11Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M52 158h22v6H50Z" fill="#f7e5ff" stroke="${d}" stroke-width="2"/>`,`<path d="M85 136h16l1 14 6 11H95l-9-6Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M87 158h22v6H86Z" fill="#f7e5ff" stroke="${d}" stroke-width="2"/>`]
 };
 const sharedLegs=legs[def.style]||legs.mono;
 if(def.style==='mono')return {
  head:`<path d="M33 51q1-21 23-23h48q25 3 25 26v26q-2 17-19 19H50q-18-2-18-19Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M39 38l-14 11-5 19 13-3M121 38l14 11 5 19-13-3" fill="${d}" stroke="${d}" stroke-width="3"/><path d="M45 39h70" stroke="#ffdce2" stroke-opacity=".7" stroke-width="4"/>`,
  eyes:dead?`<path d="M63 65l34 0M80 51v28" stroke="#ff7586" stroke-width="5"/>`:`<rect x="47" y="52" width="66" height="28" rx="14" fill="#0a192b" stroke="${d}" stroke-width="3"/><circle class="eye-light" cx="80" cy="66" r="13" fill="#ffe4ec"/><circle class="eye-light" cx="80" cy="66" r="8" fill="#ff526d"/><circle cx="77" cy="63" r="3" fill="white"/>`,
  top:`<path d="M80 30V15" stroke="${d}" stroke-width="6"/><circle class="status-led" cx="80" cy="13" r="7" fill="#ffc6d2" stroke="${d}" stroke-width="3"/>`,
  shoulders:`<path d="M25 101l-8 17 5 20 28-3 8-28-12-9Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M135 101l8 17-5 20-28-3-8-28 12-9Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M25 117h22m66 0h22" stroke="#ffe6ea" stroke-width="3" opacity=".7"/>`,
  body:`<path d="M49 99h62l9 42-18 8H58l-18-8Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M57 105h46l-5 36H62Z" fill="${d}" opacity=".45"/>`,
  chest:`<circle cx="80" cy="123" r="15" fill="#142539" stroke="#ffb4c5" stroke-width="3"/><circle class="status-led" cx="80" cy="123" r="8" fill="#ffe0e9"/><path d="M52 141h17m22 0h17" stroke="#ffdce4" stroke-width="3"/>`,
  arms:[`<path d="M28 104h22l-4 43H23l-4-15Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M22 134h24v13H22Z" fill="${d}"/>`,`<path d="M110 104h22l9 28-4 15h-23Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M114 134h24v13h-24Z" fill="${d}"/>`],legs:sharedLegs};
 if(def.style==='hero')return {
  head:`<path d="M43 43l15-13h44l15 13-1 39-17 16H61L44 82Z" fill="#edf7ff" stroke="${d}" stroke-width="5"/><path d="M44 49l-9-12 13-7 17 6h30l17-6 13 7-9 12-13-5H57Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M57 77h46l-9 17H66Z" fill="#c9e4f8" stroke="${d}" stroke-width="3"/><path d="M70 79h20l-3 10H73Z" fill="${d}"/>`,
  eyes:dead?deadEyes:`<path class="eye-light" d="M48 60l26 4-7 10-17-5ZM112 60l-26 4 7 10 17-5Z" fill="#6cfff2" stroke="#218aa5" stroke-width="2"/><path d="M68 76h24" stroke="${d}" stroke-width="3"/>`,
  top:`<path d="M80 43L65 17 48 7l12 29-29-11 14 17 27 5 8 11 8-11 27-5 14-17-29 11 12-29-17 10Z" fill="#f8df8b" stroke="${d}" stroke-width="3" stroke-linejoin="round"/><path d="M75 27h10l-5 23Z" fill="${c}"/><path d="M35 49l-13 11 13 4M125 49l13 11-13 4" fill="${c}" stroke="${d}" stroke-width="3"/>`,
  shoulders:`<path d="M19 111l24-19 16 6-10 28-25 5-11-10Z" fill="#eaf6ff" stroke="${d}" stroke-width="4"/><path d="M141 111l-24-19-16 6 10 28 25 5 11-10Z" fill="#eaf6ff" stroke="${d}" stroke-width="4"/><path d="M19 116l27-15-5 22H23ZM141 116l-27-15 5 22h18Z" fill="${c}"/>`,
  body:`<path d="M51 98h58l12 16-10 30-24 9H73l-24-9-10-30Z" fill="#eef7ff" stroke="${d}" stroke-width="4"/><path d="M52 100l27 12-11 27-22-10ZM108 100l-27 12 11 27 22-10Z" fill="${c}" stroke="${d}" stroke-width="2"/>`,
  chest:`<path d="M80 111l12 10-12 18-12-18Z" fill="#122a41" stroke="${d}" stroke-width="2"/><path class="status-led" d="M80 115l7 7-7 12-7-12Z" fill="#73ffde"/>`,
  arms:[`<path d="M29 104l18-1-3 23-9 23-18-3 5-25Z" fill="#e9f6ff" stroke="${d}" stroke-width="4"/><path d="M20 129l24 5-3 12-24-1Z" fill="${c}"/>`,`<path d="M113 103l18 1 7 17-5 25-18 3-9-23Z" fill="#e9f6ff" stroke="${d}" stroke-width="4"/><path d="M116 134l24-5 3 16-24 1Z" fill="${c}"/>`],legs:sharedLegs};
 if(def.style==='blade')return {
  head:`<path d="M41 90V51l21-19h36l21 19v39l-22 11H62Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M48 43l-14-15 17 3 16 8M112 43l14-15-17 3-16 8" fill="#c1ffeb" stroke="${d}" stroke-width="3"/><path d="M51 83l28 15 29-15-12 6H64Z" fill="${d}"/>`,
  eyes:dead?deadEyes:`<path class="eye-light" d="M43 62l33-6-12 15-20 2ZM117 62l-33-6 12 15 20 2Z" fill="#e8fff2"/><path d="M72 80h16" stroke="${d}" stroke-width="4"/>`,
  top:`<path d="M57 36L40 8l28 24M103 36l17-28-28 24" fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"/><path d="M78 35l2-22 6 22" fill="#e1fff2" stroke="${d}" stroke-width="3"/>`,
  shoulders:`<path d="M17 112l29-22 14 17-17 19-30-3Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M143 112l-29-22-14 17 17 19 30-3Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M19 118l-10 13 23-5M141 118l10 13-23-5" fill="#ccffee" stroke="${d}" stroke-width="2"/>`,
  body:`<path d="M53 98h54l8 14-9 35-27 7-27-7-9-35Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M55 104l24 9-10 28-16-11M105 104l-24 9 10 28 16-11" fill="none" stroke="#c8ffec" stroke-width="3"/>`,
  chest:`<path d="M80 114l6 11 10 6-10 5-6 11-6-11-10-5 10-6Z" fill="#e3fff4" stroke="${d}" stroke-width="2"/>`,
  arms:[`<path d="M32 103h17l-5 31-11 16-15-7 8-20Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M17 143l-9 8 19-3Z" fill="#e2fff2"/>`,`<path d="M111 103h17l7 20 8 20-15 7-11-16Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M143 143l9 8-19-3Z" fill="#e2fff2"/>`],legs:sharedLegs};
 if(def.style==='brave')return {
  head:`<path d="M36 48l17-20h54l17 20 2 31-15 21H49L34 79Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M44 45l15-10h42l15 10" stroke="#fff6cf" stroke-width="5" fill="none"/><path d="M54 80h52l-8 12H62Z" fill="#fff2cc" stroke="${d}" stroke-width="3"/>`,
  eyes:dead?deadEyes:`<rect x="46" y="56" width="27" height="17" rx="5" fill="#17283d"/><rect x="87" y="56" width="27" height="17" rx="5" fill="#17283d"/><path class="eye-light" d="M50 61h18l-6 8H50ZM110 61H92l6 8h12Z" fill="#fffce7"/><path d="M68 80h24" stroke="${d}" stroke-width="3"/>`,
  top:`<path d="M79 35L64 12 49 19l17 20M81 35l15-23 15 7-17 20" fill="#fff5c8" stroke="${d}" stroke-width="4"/><path d="M80 35V5" stroke="${d}" stroke-width="7"/><path d="M74 11h12" stroke="${c}" stroke-width="6"/>`,
  shoulders:`<path d="M20 101h37l7 22-11 13H19l-8-18Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M140 101h-37l-7 22 11 13h34l8-18Z" fill="${c}" stroke="${d}" stroke-width="5"/><circle cx="30" cy="116" r="9" fill="#fff0c4" stroke="${d}" stroke-width="3"/><circle cx="130" cy="116" r="9" fill="#fff0c4" stroke="${d}" stroke-width="3"/>`,
  body:`<path d="M45 97h70l8 18-9 32-34 9-34-9-9-32Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M52 106h56l5 12-9 23H56l-9-23Z" fill="#fff1c7" stroke="${d}" stroke-width="3"/>`,
  chest:`<path d="M80 109l12 11-4 16H72l-4-16Z" fill="${d}"/><path class="status-led" d="M80 116l7 7-3 9h-8l-3-9Z" fill="#ffe47d"/>`,
  arms:[`<path d="M27 103h25l-4 39-5 8H17l4-25Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M17 135h29l-4 13H17Z" fill="#fff1c3"/>`,`<path d="M108 103h25l6 22 4 25h-26l-5-8Z" fill="${c}" stroke="${d}" stroke-width="5"/><path d="M114 135h29v13h-25Z" fill="#fff1c3"/>`],legs:sharedLegs};
 // The cute chassis is intentionally humanlike: ribbon fins, big twin eyes,
 // rounded cheeks, slim wrists and a flared waist, without losing the robot joints.
 return {
  head:`<path d="M44 54q0-27 36-29 36 2 36 29v20q0 24-36 27-36-3-36-27Z" fill="#f9eaff" stroke="${d}" stroke-width="4"/><path d="M46 58q-10-26 12-33 22-11 44 0 22 7 12 33l-6-15q-28-17-56 0Z" fill="${c}" stroke="${d}" stroke-width="3"/><path d="M55 89q25 14 50 0" fill="none" stroke="${d}" stroke-width="2" opacity=".5"/>`,
  eyes:dead?deadEyes:`<ellipse cx="65" cy="65" rx="13" ry="15" fill="#fff"/><ellipse cx="95" cy="65" rx="13" ry="15" fill="#fff"/><ellipse class="eye-light" cx="66" cy="67" rx="7" ry="11" fill="#8653c7"/><ellipse class="eye-light" cx="94" cy="67" rx="7" ry="11" fill="#8653c7"/><circle cx="68" cy="62" r="3.4" fill="white"/><circle cx="96" cy="62" r="3.4" fill="white"/><ellipse cx="51" cy="79" rx="7" ry="3" fill="#ffa1c9" opacity=".75"/><ellipse cx="109" cy="79" rx="7" ry="3" fill="#ffa1c9" opacity=".75"/><path d="M75 85q5 5 10 0" stroke="${d}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  top:`<path d="M51 34L30 12 31 41 16 47q8 14 26 3l12-11M109 34l21-22-1 29 15 6q-8 14-26 3l-12-11" fill="${c}" stroke="${d}" stroke-width="3" stroke-linejoin="round"/><path d="M59 27l21-17 21 17-21-2Z" fill="#ffe9fb" stroke="${d}" stroke-width="3"/><path d="M76 24l4-13 4 13" fill="#ffb0da"/>`,
  shoulders:`<circle cx="43" cy="109" r="14" fill="${c}" stroke="${d}" stroke-width="4"/><circle cx="117" cy="109" r="14" fill="${c}" stroke="${d}" stroke-width="4"/><circle cx="43" cy="109" r="5" fill="#fae6ff"/><circle cx="117" cy="109" r="5" fill="#fae6ff"/>`,
  body:`<path d="M62 98h36l9 32-7 16H60l-7-16Z" fill="${c}" stroke="${d}" stroke-width="4"/><path d="M56 133l-13 22 37-7 37 7-13-22Z" fill="#f0d6ff" stroke="${d}" stroke-width="3"/><path d="M57 145h47" stroke="#fff7ff" stroke-width="3"/>`,
  chest:`<path d="M80 112q-12-12-15 0-3 11 15 22 18-11 15-22-3-12-15 0Z" fill="#fff7ff" stroke="${d}" stroke-width="2"/><path class="status-led" d="M80 118q-6-7-8 0 0 4 8 9 8-5 8-9-2-7-8 0Z" fill="#ff9acd"/>`,
  arms:[`<path d="M35 110l14 1-6 28-10 11-10-7 9-21Z" fill="${c}" stroke="${d}" stroke-width="3"/><circle cx="27" cy="143" r="7" fill="#fae6ff" stroke="${d}" stroke-width="3"/>`,`<path d="M111 111l14-1 3 12 9 21-10 7-10-11Z" fill="${c}" stroke="${d}" stroke-width="3"/><circle cx="133" cy="143" r="7" fill="#fae6ff" stroke="${d}" stroke-width="3"/>`],legs:sharedLegs};
}
function silhouetteSVG(){
 // A neutral, fixed mystery silhouette; independent of both player's previews.
 return `<svg class="mech mystery-mech" viewBox="0 0 160 170" aria-hidden="true">
 <ellipse cx="80" cy="165" rx="43" ry="5" fill="#030917" opacity=".6"/>
 <g fill="#344257" stroke="#71829b" stroke-width="3" opacity=".77">
 <path d="M55 133h20l-3 29H49ZM85 133h20l6 29H88Z"/>
 <path d="M34 104h22l-8 42H23ZM104 104h22l11 42h-25Z"/>
 <path d="M55 100h50l9 44H47Z"/>
 <path d="M43 49q2-21 37-22 35 1 37 22v31q-5 20-37 20-32 0-37-20Z"/>
 <path d="M61 29 52 12l23 15M99 29l9-17-23 15"/>
 </g><path d="M60 66h40" stroke="#8d9cb1" stroke-width="3" opacity=".25"/>
 <text x="80" y="81" text-anchor="middle" font-size="32" font-weight="900" fill="#bbd1e9">?</text>
 </svg>`;
}
function robotSVG(def,hp,mode={}){
 const {pose='idle',side=0}=mode;
 const parts=headParts(def,hp),facing=side===0?1:-1;
 const isWin=pose==='win',isDown=pose==='lose',isHit=pose==='hit',isAttack=pose==='attack',isCharge=pose==='charge',isHeal=pose==='heal';
 let left=0,right=0,legsL=0,legsR=0,bodyTurn='',headTurn='';
 if(isCharge){left=65;right=-65;bodyTurn=`translate(${3*facing} -1) rotate(${3*facing} 80 120)`}
 if(isAttack){left=side===0?115:94;right=side===0?-97:-115;bodyTurn=`translate(${7*facing} -4) rotate(${7*facing} 80 118)`;legsL=-9;legsR=7}
 if(isHit){left=132;right=-132;bodyTurn=`translate(${-8*facing} 5) rotate(${-15*facing} 80 118)`;headTurn=`rotate(${-10*facing} 80 65)`;legsL=15;legsR=-15}
 if(isHeal){left=70;right=-70;bodyTurn='translate(0 -5)';headTurn='translate(0 -3)'}
 if(isWin){left=155;right=-155;legsL=-11;legsR=11;bodyTurn='translate(0 -10)';headTurn='translate(0 -3)'}
 if(isDown){left=12;right=-12;legsL=17;legsR=-19;bodyTurn=`translate(${-11*facing} 15) rotate(${-19*facing} 80 118)`;headTurn=`translate(${-7*facing} 9) rotate(${-14*facing} 80 72)`}
 const winHalo=isWin?`<g stroke="#fff6ba" stroke-width="4" stroke-linecap="round" opacity=".95"><path d="M80 0v10M49 7l-6 10M111 7l6 10M24 35l11 5M136 35l-11 5"/></g><g fill="#fff3a6"><path d="M26 23l4 7 8 2-8 3-4 7-3-7-8-3 8-2Z"/><path d="M137 18l3 7 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g>`:'';
 const downSmoke=isDown?`<g stroke="#9da4b3" stroke-width="5" stroke-linecap="round" opacity=".75" fill="none"><path d="M17 43Q7 32 21 25Q9 17 22 8"/><path d="M138 60q19-14 7-25"/></g>`:'';
 const effectHalo=isHeal?`<g fill="none" stroke="#67ffaf" stroke-width="4" opacity=".9"><circle cx="80" cy="83" r="65" stroke-dasharray="8 15"/><path d="M70 8h20M80 -2v20"/></g>`:'';
 return `<svg class="mech mech-${def.style}" viewBox="0 0 160 170" role="img" aria-label="${def.name}のロボット、ライフ${hp}、${{idle:'待機',charge:'攻撃準備',attack:'攻撃',hit:'被弾',heal:'修理',win:'勝利',lose:'敗北'}[pose]||'待機'}">
 <ellipse cx="80" cy="165" rx="44" ry="5" fill="#070b16" opacity=".65"/>
 ${winHalo}${downSmoke}${effectHalo}
 <g class="idle-shell">
 <g transform="rotate(${legsL} 61 144)">${parts.legs[0]}</g>
 <g transform="rotate(${legsR} 97 144)">${parts.legs[1]}</g>
 <g transform="${bodyTurn}">
   <g class="idle-arm-left"><g transform="rotate(${left} 41 110)">${parts.arms[0]}</g></g>
   <g class="idle-arm-right"><g transform="rotate(${right} 119 110)">${parts.arms[1]}</g></g>
   ${parts.shoulders}
   ${parts.body}
   <g class="idle-head"><g transform="${headTurn}">${parts.head}${parts.eyes}${parts.top}</g></g>
   ${hp<=4?'<path d="M119 40l-12 14 9 7-12 10" fill="none" stroke="#203040" stroke-width="3"/>':''}
   ${hp<=3?'<path d="M55 102l14 13-9 11 14 13" fill="none" stroke="#25313e" stroke-width="3"/>':''}
   ${hp<=2?'<path d="M130 92l17-14-10 19 12-4" fill="none" stroke="#ffae4a" stroke-width="4"/>':''}
   ${hp<=1?'<path d="M27 25q-18-19-13 3-9 8 7 16" fill="none" stroke="#9da4b3" stroke-width="5"/>':''}
   ${hp===0?'<path d="M62 91h36" stroke="#7f8a98" stroke-width="4"/>':''}
 </g></g></svg>`;
}
