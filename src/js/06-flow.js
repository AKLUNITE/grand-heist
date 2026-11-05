/* =====================================================================
   GAME FLOW
   ===================================================================== */
let BUSY=false;
async function guard(fn){if(BUSY)return;BUSY=true;renderPanel();try{await fn()}catch(e){console.error(e);log('<span class="r">エラー: '+esc(e.message)+'</span>')}BUSY=false;if(S&&S.phase!=='end')renderAll();if(typeof schedPump==='function')schedPump(0)}

function beginTurn(){if(S.phase!=='adventure')return;const ch=cur();if(ch.dead){nextTurn();return}
  S.step='roll';S.moveDice=[];S.boost=0;S.stats.turns++;focusOn(ch);renderAll();log(`▶ ${nm(ch)}の手番`);SFX.turn();toast(ch,'NEXT');
  if(ch.cpu)setTimeout(()=>runGuard(cpuTurn),1100*SPEED*TEMPO);netTurnHash();schedPump(0)}
function nextTurn(){if(S.phase!=='adventure')return;S.turn=(S.turn+1)%S.chars.length;if(S.turn===0){S.round++;log(`<span class="rd">ROUND ${S.round}</span>`)}beginTurn()}

function cmdRoll(){SFX.click();guard(doRoll)}
async function doRoll(){const ch=cur();
  const vals=await plainRoll(moveN(ch),{purpose:'移動ダイス',title:`${ch.name}`,sub:'出た目を1つずつ使って隣のマスへ進む。<b>6は誰かに目撃される</b>',mark:v=>v===6?'r':'g',label:v=>v===6?'目撃！':String(v),
    breakTxt:v=>v===6?'警戒+1':'移動用',
    legend:legendHTML([{f:[1,2,3,4,5],c:'g',t:'移動に使える'},{f:[6],c:'r',t:'警戒レベル+1（移動にも使える）'}],'出目の見方',`<div class="pt sm">1マス進むのに必要な出目</div><div class="lg">大通り ${md('2+')}　繁華街 ${md('3+')}　裏路地 ${md((ch.id==='driver'?4:5)+'+')}</div>`),
    table:[{k:'6なし',t:'目撃なし。そのまま移動へ',c:'g',test:v=>!v.includes(6)},{k:'6あり',t:`6の数だけ警戒レベル上昇${ch.id==='disguise'?'（変装師は1つ無視）':ch.id==='driver'?'（運び屋は裏路地にいれば無視）':''}`,c:'r',test:v=>v.includes(6)}],
    explain:vals=>{const k=vals.filter(v=>v===6).length;const dis=ch.id==='disguise'&&k>0;const alley=ch.id==='driver'&&terr(ch.r,ch.c)==='X';const up=alley?0:k-(dis?1:0);
      return up>0?{kind:'bad',level:up>=2?2:1,stamp:'SPOTTED',head:`警戒レベル +${up}`,text:`6が${k}個出た${dis?'（変装で1つごまかした）':''}。使える出目：${vals.join('・')}`}
        :{kind:'meh',stamp:'CLEAR',head:'目撃なし',text:`${dis?'変装で目撃をごまかした。':''}使える出目：${vals.join('・')}`}}});
  S.moveDice=vals.map(v=>({v,used:false}));log(`移動ダイス [${vals.join(' ')}]`);
  let six=vals.filter(v=>v===6).length;
  if(six&&ch.id==='disguise'){six--;abilityFire(ch,'目撃をごまかし、警戒+1を無効にした',{u:'防いだ警戒',v:1});await wait(700)}
  if(six&&ch.id==='driver'&&terr(ch.r,ch.c)==='X'){abilityFire(ch,`裏路地に潜んでいたので6が${six}つ出ても目撃されない`,{u:'防いだ警戒',v:six});six=0;await wait(700)}
  if(six){const fin=await raiseGauge(six);if(fin)return'final'}
  if(!(await resolveDeaths()))return'over';
  if(S.phase!=='adventure')return'final';
  S.step='move';renderAll();
}
function cmdMoveTo(r,c){const ch=cur();if(!reachable(ch).some(([a,b])=>a===r&&b===c))return;guard(()=>moveStep(ch,r,c))}
async function moveStep(ch,r,c){const need=needFor(ch,terr(r,c));const d=S.moveDice.filter(x=>!x.used&&x.v>=need).sort((a,b)=>a.v-b.v)[0];if(!d)return;d.used=true;
  ch.r=r;ch.c=c;await placePiece(ch);reflowAll();focusOn(ch);renderAll();
  if(ch.id==='driver'&&terr(r,c)==='X'&&d.v<5)abilityFire(ch,`出目${d.v}で裏路地に入った（通常は5+）`,{u:'抜け道を使った',v:1})}
function cmdEndMove(){SFX.click();S.step='action';S.boost=0;renderAll()}

function cmdAction(a){SFX.click();guard(async()=>{await doAction(a);await finishAction()})}
async function doAction(a){const ch=cur();const boost=S.boost;S.boost=0;
  if(a.k==='wait'){log(`${nm(ch)}は様子を見た`);return}
  if(a.k==='rest'){const t=terr(ch.r,ch.c);const amt=2+(ch.id==='bouncer'?1:0);const before=ch.life;ch.life=Math.min(ch.maxLife,ch.life+amt);if(t==='B')ch.resv=ch.resMax;
    SFX.heal();burst(pieceWorld(ch),0x62e3a4,40,2,.3,1.2,1.5);if(ch.id==='bouncer'&&ch.life-before>2)abilityFire(ch,'休息の回復+1',{u:'追加回復',v:1});log(`<span class="g">${esc(ch.name)}は休息（スタミナ+${ch.life-before}${t==='B'?'・リソース全回復':''}）</span>`);renderSquad();cardFx(ch,'good');
    await banner('休息',`${esc(ch.name)}　スタミナ +${ch.life-before}${t==='B'?'　リソース全回復':''}`,BC.green,1600);return}
  if(a.k==='investigate'){const q=S.quests[a.qi];q.revealed=true;drawHolo(a.qi);await flipCard(a.qi,true);SFX.reveal();burst(cardWorld(a.qi),0xd9b46a,60,3,.4,1.3);
    log(`<span class="y">下見：「${q.q.name}」（${qStat(q)}／必要${q.q.diff}）</span>`);
    await dealCard({kicker:'TARGET CARD　標的カード',icon:'eye',title:q.q.name,text:`${qStat(q)}で判定\n隣接して「下準備」で挑める`,meta:`必要成功数 ${q.q.diff}`});
    gainPlan(ch.id==='informant'?2:1,ch,'下見');
    if(ch.id==='informant'){abilityFire(ch,'下見で経験+1・段取り+1',{u:'得た経験',v:1});await gainXP(ch,1)}return}
  if(a.k==='adventure'){await adventure(ch,boost);return}
  if(a.k==='loot'){await lootAction(ch,a.L,boost);return}
  if(a.k==='combo'){await doCombo(ch,a.id);return}
  if(a.k==='challenge'){await challenge(ch,a.qi,boost);return}
}
function spendBoost(ch,b){if(b>0&&ch.res.type==='boost'){b=Math.min(b,ch.resv);ch.resv-=b;log(`${nm(ch)}：${ch.res.name}でダイス+${b}`);renderSquad();return b}return 0}
async function adventure(ch,boost){const t=terr(ch.r,ch.c);const base=ch.adv[t==='C'?0:1];const b=spendBoost(ch,boost);const bf=takeBuff([ch]);const n=base+b+bf.dice;
  const src=[{t:`小仕事${base}`,who:ch.name,n:base,c:base<=1?'weak':'',col:ch.css},...bf.src];if(b)src.push({t:`${ch.res.name}+${b}`,n:b,c:'boost'});
  const s=await peakRoll(n,{purpose:'小仕事の判定',title:`${ch.name}`,sub:`${TERRAIN[t].name}でひと稼ぎ。<b>成功数2以上で経験+1</b>`,need:2,noFumble:ch.id==='pickpocket'||bf.noF,table:T_ADV,src,onNoFumble:()=>abilityFire(ch,'1の目をファンブルにしなかった',{u:'防いだファンブル',v:1}),
    explain:s=>s<=-1?{kind:'bad',head:'追われた！',text:'1ダメージを受ける'}:s===0?{kind:'meh',head:'収穫なし',text:'何も起きなかった'}:s===1?{kind:'meh',stamp:'CLOSE CALL',head:'ギリギリ成功',text:'経験+1、ただし1ダメージ'}:{kind:'good',level:1,head:'小仕事 成功',text:'経験+1'}});
  if(s<=-1){log(`<span class="r">小仕事失敗（成功${s}）：追われて1ダメージ</span>`);await hurt(ch,1)}
  else if(s===0)log('小仕事：収穫なし');
  else if(s===1){log(`<span class="y">小仕事：ギリギリ成功（経験+1・1ダメージ）</span>`);await gainXP(ch,1);await hurt(ch,1)}
  else{log(`<span class="g">小仕事成功！（成功${s}）経験+1</span>`);await gainXP(ch,1)}
}
async function challenge(ch,qi,boost){const q=S.quests[qi];let helpers=S.chars.filter(o=>o!==ch&&!o.dead&&isAdj(o,qi));
  if(helpers.length&&!ch.cpu){const v=await askModal(ch,`<h3>協力して下準備する？</h3><p>同じ標的に隣接している団員：${helpers.map(nm).join('、')}</p><p>協力すると全員のダイスを合わせて振れます。成功時の経験は参加者それぞれ<b>+1</b>（単独なら<b>+2</b>）。</p>`,
    [{label:`全員で協力する`,sub:`ダイス ${dicePool(ch,q,helpers)}個`,v:true},{label:`単独で挑む（ダイス ${dicePool(ch,q,[])}個）`,v:false,cls:'ghost'}]);if(!v)helpers=[]}
  const b=spendBoost(ch,boost);const party=[ch,...helpers];const n=dicePool(ch,q,helpers)+b;const need=Math.max(0,q.q.diff-q.progress);const bf=takeBuff(party);
  const src=[];party.forEach(c=>{const st=bestSt(c,q);src.push({t:`${STATN[st]}${c[st]}`,who:c.name,n:c[st],c:c[st]<=1?'weak':'',col:c.css})});
  const hk=party.find(c=>c.id==='hacker'),ph=party.find(c=>c.id==='phantom');
  if(q.q.stats.includes('hck')&&hk)src.push({t:'ハッキング+1',who:'ハッカー',n:1,c:'ability',col:hk.css});
  if(helpers.length&&ph)src.push({t:'指揮+2',who:'怪盗',n:2,c:'ability',col:ph.css});
  if(S.noticeRound===S.round){const ph2=S.chars.find(c=>c.id==='phantom');src.push({t:`予告状+${party.length}`,who:'切り札',n:party.length,c:'ability',col:ph2?ph2.css:'#b99cff'})}
  src.push(...bf.src);
  if(b)src.push({t:`${ch.res.name}+${b}`,n:b,c:'boost'});
  await banner('下準備',q.q.name,BC.gold,1500);
  if(q.q.stats.includes('hck')&&hk){abilityFire(hk,'技術の下準備でダイス+1',{u:'追加ダイス',v:1});await wait(500)}
  if(helpers.length&&ph){abilityFire(ph,'協力でダイス+2',{u:'追加ダイス',v:2});await wait(500)}
  const weakC=party.filter(c=>c[bestSt(c,q)]<=1);if(!helpers.length&&weakC.length){abilityFire(ch,`${STATN[bestSt(ch,q)]}${ch[bestSt(ch,q)]}で挑む（ダイスが少ない）`,{weak:true});await wait(500)}
  const s=await peakRoll(n,{purpose:'下準備の判定',title:q.q.name,sub:`${party.map(c=>esc(c.name)).join('＋')}が${qStat(q)}で挑む。<b>成功数${need}以上で達成</b>`,need,table:T_CH(need,q.reward.name),src,noFumble:bf.noF,
    explain:s=>s>=need?{kind:'good',level:2,stamp:'COMPLETE',head:'下準備 達成！',text:`報酬「${q.reward.name}」を入手`}:s>0?{kind:'meh',stamp:'PROGRESS',head:'あと一歩',text:`達成マーカー+${s}　残り${Math.max(1,need-s)}`}:s===0?{kind:'meh',head:'成果なし',text:'もう一度挑戦できる'}:{kind:'bad',level:1,head:'失敗！',text:'達成マーカーが消え、参加者全員1ダメージ'}});
  if(s>=need){q.done=true;await spinCard(qi,()=>drawHolo(qi));const T=tiles[key(q.r,q.c)];T.tl.color.setHex(0x62e3a4);T.mark.material.color.setHex(0x62e3a4);T.mark.material.emissive.setHex(0x2a8a5a);holos[qi].beam.material.color.setHex(0x62e3a4);
    const wp=new THREE.Vector3(T.p.x,1.2,T.p.z);burst(wp,0xf4dc9f,110,6,.5,1.6,4);coinShower(wp,40,4);shake(400,.3);
    log(`<span class="g">★ 下準備「${q.q.name}」完了！</span>`);gainPlan(1,ch,'下準備達成');
    for(const c of party)await gainXP(c,helpers.length?1:2);
    await revealReward(q.reward,cardWorld(qi));renderTop();
    if(S.quests.every(x=>x.done)){await banner('準備は整った','今夜、金庫を破る――',BC.gold,2600);await enterFinal(false,S.turn)}}
  else{if(s>0){q.progress=Math.min(q.q.diff-1,q.progress+s);log(`<span class="y">あと一歩…達成マーカー+${s}（残り${q.q.diff-q.progress}）</span>`)}
    else if(s<0){q.progress=0;log('<span class="r">失敗！達成マーカー消失、参加者全員1ダメージ</span>');for(const c of party)await hurt(c,1)}
    else log('下準備失敗（成果なし）');drawHolo(qi)}
}
async function revealReward(rw,from){SFX.reveal();await wait(200);celebrate(2);
  await dealCard({kicker:'REWARD CARD　報酬カード',icon:'star',title:rw.name,text:rw.text,meta:'全員に効果',color:'#f4dc9f'});log(`<span class="y">入手：${rw.name} ― ${rw.text}</span>`);
  await placeRewardTile(rw,from||new THREE.Vector3(0,3,4));
  if(rw.id==='rail')S.bonus.bat+=1;
  if(rw.id==='med')S.chars.forEach(c=>{if(!c.dead){c.maxLife++;c.life=c.maxLife}});
  if(rw.id==='sat')S.bonus.sat=true;
  if(rw.id==='exo')S.chars.forEach(c=>{c.resMax++;c.resv=c.resMax});
  if(rw.id==='weak')S.bonus.noFumble=true;renderAll();
  const chip=document.querySelector(`#rwtray [data-rw="${rw.id}"]`);if(chip&&chip.animate)chip.animate([{transform:'scale(2.2)',boxShadow:'0 0 30px #f4dc9f'},{transform:'none'}],{duration:900,easing:'cubic-bezier(.2,1.4,.4,1)'});
  await banner('報酬カードを獲得',`${rw.name}：${RWNOW[rw.id]||rw.text}`,BC.gold,2400)}
const RWSHORT={rail:'ツール',med:'差し入れ',sat:'暗証番号',exo:'装備',weak:'死角'};
const RWNOW={rail:'本番の物理錠・突破のダイスが全員+1になった',med:'全員のスタミナ上限+1、いま全回復した',sat:'本番開始時にロックが1段外れる',exo:'全員のリソース上限+1、いま全回復した',weak:'本番の判定ごとに1の目を1つ無効にできる'};
const GAINN={life:'スタミナ',res:'リソース',adv:'小仕事',bat:'突破',scn:'潜入',hck:'技術',move:'移動'};
async function gainXP(ch,n){ch.xp+=n;while(ch.lv<5&&ch.xp>=XP_LV[ch.lv+1]){ch.lv++;const g=ch.gains[ch.lv]||{};
    Object.entries(g).forEach(([k,v])=>{if(k==='life'){ch.maxLife+=v;ch.life+=v}else if(k==='res'){ch.resMax+=v;ch.resv+=v}else if(k==='adv'){ch.adv=ch.adv.map(x=>x+v)}else ch[k]+=v});
    const desc=Object.entries(g).map(([k,v])=>GAINN[k]+'+'+v).join('　');
    burst(pieceWorld(ch),0xf4dc9f,80,4,.45,1.4,3);log(`<span class="y">${esc(ch.name)} レベル${ch.lv}！ ${desc}</span>`);renderSquad();cardFx(ch,'good');celebrate(2);
    await banner('LEVEL UP',`${esc(ch.name)}Lv${ch.lv}　${desc}`,BC.gold,2400)}
  renderSquad()}
async function hurt(ch,amt,{instant=false,noGuard=false}={}){if(ch.dead||amt<=0)return;
  if(!noGuard&&S.phase!=='end'){const bo=await bodyguard(ch,instant?ch.life:amt);if(bo){log(`<span style="color:${bo.css}">✦ ${esc(bo.name)}が${esc(ch.name)}の身代わりになった</span>`);return hurt(bo,instant?Math.min(ch.life,bo.life-1):amt,{noGuard:true})}}
  if(!instant&&ch.res.type==='guard'&&ch.resv>0){let g;
    if(ch.cpu)g=(amt>=ch.life||amt>=2)?Math.min(ch.resv,amt):0;
    else g=await askModal(ch,`<h3 style="color:${ch.css}">${esc(ch.name)}に ${amt} ダメージ</h3><p>${ch.res.name}を使うと、1つにつき1ダメージ軽減できます。（残り${ch.resv}・スタミナ${ch.life}）</p>`,
      Array.from({length:Math.min(ch.resv,amt)+1},(_,i)=>({label:i?`${ch.res.name}を${i}使う`:'使わない',sub:`受けるダメージ ${amt-i}`,v:i,cls:i?'':'ghost'})));
    if(g){ch.resv-=g;amt-=g;log(`${nm(ch)}：${ch.res.name}で${g}軽減`)}}
  if(amt<=0){SFX.click();renderSquad();return}
  ch.life=Math.max(0,ch.life-amt);if(instant)ch.life=0;SFX.hurt(amt);vignette('hit');shake(420,amt>=2?.5:.3);
  const P=pieces[ch.id];if(P)burst(P.g.position.clone().add(new THREE.Vector3(0,.4,0)),0xff4a62,40,3,.35,.9);
  log(`<span class="r">${esc(ch.name)}に${instant?'致命的な失敗':amt+'ダメージ'}（スタミナ${ch.life}）</span>`);renderSquad();cardFx(ch,'hurt');
  if(ch.life<=0){ch.dead=true;ch.st.down=true;disaster(2);if(P&&S.phase==='adventure')P.g.visible=false;if(P&&S.phase!=='adventure')tween(500,k=>P.fig.rotation.z=k*1.4);log(`<span class="r">✖ ${esc(ch.name)} 確保された</span>`);renderSquad();await banner(`${esc(ch.name)} 確保`,'警察に捕まった',BC.red,2600)}
  else await wait(500);
  renderSquad()}
async function resolveDeaths(){if(S.phase!=='adventure')return true;const dead=S.chars.filter(c=>c.dead);if(!dead.length)return true;
  await banner('奇跡の脱出','全員でダイスを1個ずつ。6が1つでも出れば脱出成功',BC.white,2600);
  const vals=await plainRoll(S.chars.length,{purpose:'奇跡の脱出',pc:'red',title:'全員で1個ずつ',sub:'<b>6が1つでも出れば脱出成功</b>。出なければ計画失敗（ゲームオーバー）',styles:S.chars.map(c=>({tint:c.css})),mark:v=>v===6?'y':'z',label:(v,i)=>S.chars[i].name+' '+v,
    breakTxt:(v,i)=>S.chars[i].name,legend:legendHTML([{f:[6],c:'y',t:'当たり'},{f:[1,2,3,4,5],c:'z',t:'はずれ'}]),
    table:[{k:'6あり',t:'確保された団員がアジトに復帰（全員のリソースは0）',c:'g',test:v=>v.includes(6)},{k:'6なし',t:'計画失敗（ゲームオーバー）',c:'r',test:v=>!v.includes(6)}],
    explain:v=>v.includes(6)?{kind:'good',level:3,stamp:'ESCAPED',head:'脱出成功！',text:'護送車から消えた団員がアジトに帰還'}:{kind:'bad',level:2,stamp:'BUSTED',head:'脱出失敗',text:'計画が露見した……'}});
  if(vals.includes(6)){const base=findTile('B');dead.forEach(c=>{c.dead=false;c.life=c.maxLife;c.r=base[0];c.c=base[1];pieces[c.id].g.visible=true;placePiece(c,false)});S.chars.forEach(c=>c.resv=0);reflowAll();
    SFX.escape();log(`<span class="g">奇跡の脱出！ ${dead.map(c=>esc(c.name)).join('・')}がアジトに戻った</span>`);renderSquad();return true}
  log('<span class="r">脱出ならず……計画は頓挫した</span>');await endGame(false,'下見中に団員が捕まり、計画が露見した');return false}
async function finishAction(){if(S.phase!=='adventure')return;if(!(await resolveDeaths()))return;if(S.phase!=='adventure')return;S.step='done';renderAll();setTimeout(nextTurn,900*SPEED*TEMPO)}

async function raiseGauge(n){for(let i=0;i<n;i++){if(S.phase!=='adventure')return true;S.gauge=Math.min(GAUGE_MAX,S.gauge+1);renderTop(true);SFX.gauge();vignette('hit');log(`<span class="p">警戒レベル ${S.gauge}/${GAUGE_MAX}</span>`);await moveTrackToken();await wait(300);
    if(S.gauge>=GAUGE_MAX){alarm();disaster(2);await banner('警戒レベル MAX','もう待てない――強行突入',BC.red,2800);await enterFinal(true,S.turn);return true}
    if(FIRE.includes(S.gauge)){const r=await policeAction();if(r==='final')return true}}return false}
const KACT=[null,
 {n:'パトカー通過',d:'今回は何も起きない'},
 {n:'職務質問',d:'手番の団員に2ダメージ'},
 {n:'一斉検問',d:'全団員に1ダメージ'},
 {n:'ガサ入れ',d:'協力者のバー1つが使えなくなる（休息不可）'},
 {n:'情報漏洩',d:'公開中の標的の達成マーカーが全て消える'},
 {n:'警戒強化',d:'警戒レベル+1'}];
async function policeAction(){alarm();spawnPolice();await banner('POLICE','警察が動いた',BC.blue,2200);
  const [v]=await plainRoll(1,{purpose:'警察の動き',pc:'blue',title:'警察のダイス',sub:'警戒レベルが◆に達した。<b>出た目の行動が起きる</b>',mark:v=>v===1?'g':'r',styles:[{tint:'#5b8cff'}],
    breakTxt:v=>KACT[v].n,table:KACT.slice(1).map((k,i)=>({k:String(i+1),t:`${k.n}：${k.d}`,c:i===0?'g':'r',test:v=>v[0]===i+1})),tableTitle:'警察の行動表',
    explain:([v])=>({kind:v===1?'good':'bad',level:1,stamp:'POLICE',head:`${v}：${KACT[v].n}`,text:KACT[v].d})});
  const A=KACT[v];log(`<span class="p">警察【${v}:${A.n}】${A.d}</span>`);
  const ch=cur();
  if(v===2){await laserTo(pieceWorld(ch),0x5b8cff);await hurt(ch,2)}
  if(v===3){shake(700,.4);for(const c of S.chars)await hurt(c,1)}
  if(v===4){const cand=[];MAP.forEach((row,r)=>[...row].forEach((t,c)=>{if(t==='S'&&!isBurned(r,c))cand.push([r,c])}));
    if(cand.length){const [r,c]=rpick(cand);S.burned.push([r,c]);const T=tiles[key(r,c)];await laserTo(new THREE.Vector3(T.p.x,.6,T.p.z),0x5b8cff);
      T.neon.material.color.setHex(0xee3a54);T.bar.material.emissive.setHex(0xee3a54);T.topM.color.setHex(0x3a1416);
      T.deco.add(mk(new THREE.TorusGeometry(.62,.02,4,6),G(0xf2cf55),0,.25,0,Math.PI/2))}}
  if(v===5)S.quests.forEach((q,i)=>{if(q.revealed&&!q.done&&q.progress){q.progress=0;drawHolo(i)}});
  if(v===6){if(await raiseGauge(1))return'final'}
  renderAll()}

/* ---------- 本番フェイズ ---------- */
async function enterFinal(byGauge,starter){if(S.phase!=='adventure')return;if(window.__STOPFINAL){window.__RES={type:byGauge?'forced':'prepared',round:S.round,quests:S.quests.filter(q=>q.done).length,gauge:S.gauge};S.phase='done';return}S.forced=byGauge;S.finalRound=S.round;S.eta=byGauge?ETA_FORCED:ETA_PREP;S.swat=false;S.vlocks=vLayout().map(l=>[...l]);TRACK_VAULT.bpm=148;S.phase='final';S.step='final';clearHL();music(TRACK_VAULT);
  S.chars.forEach(c=>{pieces[c.id].g.visible=!c.dead});
  setCamFree(false);cam.want.set(0,4.3,1.5);cam.wantRad=innerWidth<700?28:21;cam.phi=1.0;cam.theta=0;
  VAULT.g.visible=true;SFX.boom();shake(1600,.5);Object.values(tiles).forEach(T=>{if(T.hql)T.hql.intensity=0});
  await tween(2000,k=>{VAULT.g.position.y=-14+14*k;if(Math.random()<.3)burst(new THREE.Vector3((Math.random()-.5)*10,.3,-2.6),0xc0a070,4,3,.5,1,1)},easeOut);
  SFX.clank();SFX.timp(0,82);burst(new THREE.Vector3(0,.5,-2),0xf4dc9f,90,6,.5,1.4,2);
  S.chars.forEach((c,i)=>{const a=(i-(S.chars.length-1)/2)*.3;const P=pieces[c.id];const to=new THREE.Vector3(Math.sin(a)*6.5,.45,Math.cos(a)*6.5+1);const f=P.g.position.clone();
    tween(800,k=>{P.g.position.lerpVectors(f,to,k);P.g.position.y+=Math.sin(k*Math.PI)*1.5});P.fig.rotation.y=0;P.g.lookAt(0,.45,-3.4)});
  await banner('本番','オーロラ地下金庫　ロック9段',BC.gold,2800);renderAll();
  {const dv=S.chars.find(c=>c.id==='driver'&&!c.dead);if(dv){S.eta+=1;abilityFire(dv,'逃走ルートを確保：警備隊の到着+1手番',{u:'稼いだ手番',v:1})}}
  await banner(`警備隊の到着まで ${S.eta}手番`,byGauge?'強行突入：時間がない':'時間内にロックを外しきれ。過ぎると毎手番、巡回が来る',BC.red,2600);
  if(S.bonus.sat){await banner('暗証番号入力','ロックを1段解除',BC.teal,2000);removeLocks('hck',1);await unlock(1,false)}
  if(byGauge){log('<span class="r">準備不足の強行突入：警備ドローン巡回×2</span>');await patrol();if(S.phase!=='final')return;await patrol();if(S.phase!=='final')return}
  S.turn=starter;if(S.chars[S.turn].dead)advanceFinal(false);
  S.lockIn=true;setTimeout(beginFinalTurn,700*SPEED*TEMPO)}
function beginFinalTurn(){if(S.phase!=='final')return;const ch=cur();if(ch.dead){advanceFinal(true);return}S.vt=(S.vt||0)+1;S.boost=0;S.push=false;S.stats.turns++;renderAll();log(`▶ ${nm(ch)}の番`);SFX.turn();toast(ch,'NEXT');
  cam.want.set(pieces[ch.id].g.position.x*.3,4.3,1.5);
  S.lockIn=true;runGuard(etaTick).then(()=>{S.lockIn=false;if(S.phase!=='final')return;if(ch.dead){advanceFinal(true);return}renderAll();
    if(ch.cpu)setTimeout(()=>runGuard(cpuFinal),1200*SPEED*TEMPO);netTurnHash();schedPump(0)})}
function runGuard(fn){return new Promise(res=>{const go=()=>{if(BUSY){setTimeout(go,40);return}guard(fn).then(res)};go()})}
async function cpuFinal(){const ch=cur();if(S.phase!=='final'||ch.dead)return;if(ch.res.type==='boost'&&ch.resv>0)S.boost=ch.resv;
  const cr=S.chars.find(o=>o.id==='cracker'&&!o.dead&&o.cpu);if(cr&&trumpOK(cr,'final')&&(cr===ch||S.locks<=4))await useTrump(cr);
  const hk=S.chars.find(o=>o.id==='hacker'&&!o.dead&&o.cpu);if(hk&&S.eta<=3&&trumpOK(hk,'final'))await useTrump(hk);
  if(S.eta<=2&&S.plan>=STALL_COST){await stall(ch)}
  S.push=ch.life>=3&&(S.eta<=4||S.locks<=3);S.vsel=vOptions(ch,S.push).sort((x,y)=>y.p-x.p||(y.spec-x.spec))[0];if(S.push&&Math.random()<.5)say(ch,pick(['時間がない、こじ開ける！','力ずくでいく','一気に行くぞ']));
  await finalAttack()}
function advanceFinal(go=true){for(let i=0;i<S.chars.length;i++){S.turn=(S.turn+1)%S.chars.length;if(S.turn===0)S.round++;if(!S.chars[S.turn].dead)break}if(go)beginFinalTurn()}
function cmdAttack(push=false,t=null,stat=null){SFX.click();S.push=push;S.pushSel=false;if(t){const o=vOptions(cur(),push).find(x=>x.t===t&&x.stat===stat);S.vsel=o||null}guard(finalAttack)}
function finalExplain(s,b=vBase(),t=''){const x=t==='bat'?1:0,cn=t==='hck'?3:2,sc=t==='scn'?'。警報で警備隊が1手番早まる':'';
  if(s<0)return{kind:'bad',level:2,stamp:'SURROUNDED',head:'包囲された！',text:`自分に${3+x}ダメージ${sc}`};if(s===0)return{kind:'bad',level:2,stamp:'GUARD',head:'警備員と鉢合わせ',text:`自分に${2+x}ダメージ${sc}`};
  if(s===1)return{kind:'bad',level:1,stamp:'SENSOR',head:'センサーに触れた',text:`自分に${1+x}ダメージ${sc}`};if(s<=b-2)return{kind:'meh',stamp:'LINK',head:'連携プレー',text:`次の団員の判定に+${cn}${t==='hck'?'（解析を引き継ぐ）':''}`};
  if(s===b-1)return{kind:'meh',stamp:'ALARM',head:'1段解除…しかし警報',text:`ロック1段解除、自分に${1+x}ダメージ`};if(s===b)return{kind:'good',level:1+x,stamp:x?'BREAK':'UNLOCK',head:`ロック${1+x}段解除`,text:x?'力ずくでもう1段':''};
  if(s===b+1)return{kind:'good',level:2,stamp:'PERFECT',head:'完璧な手際',text:`ロック${2+x}段解除`};
  return{kind:'good',level:3,stamp:'MASTERPIECE',head:'神業！',text:'ロック3段解除'}}
async function finalAttack(){const ch=cur();const sel=S.vsel||vOptions(ch).sort((x,y)=>y.p-x.p)[0];S.vsel=null;const t=sel.t,stat=sel.stat,spec=stat===t;const apt=vApt(ch,t),xb=t==='bat'?1:0;
  const b=spendBoost(ch,S.boost);S.boost=0;const bf=takeBuff([ch]);const scan=S.bonus.scan?2:0;const push=!!S.push;S.push=false;
  const base=ch[stat],tool=stat==='bat'?S.bonus.bat:0,crk=ch.id==='cracker'&&stat==='bat'?1:0,hk=vJob(ch,stat)&&!crk?1:0;
  const n=base+tool+crk+hk+b+scan+bf.dice+(push?3:0);const chain=S.chain;S.chain=0;const cb=S.crackerBonus||0;S.crackerBonus=0;
  const need=spec?vBase()+APTM[apt]:vBase()+1;
  const src=[{t:`${STATN2[stat]}${base}`,who:ch.name,n:base,c:base<=2?'weak':'',col:ch.css}];if(tool)src.push({t:`ツール+${tool}`,who:'報酬',n:tool,c:'reward'});
  if(crk)src.push({t:'金庫破りの勘+1',who:'金庫破り',n:1,c:'ability',col:ch.css});if(hk)src.push({t:`${ch.skill}+1`,who:ch.name,n:1,c:'ability',col:ch.css});if(scan)src.push({t:'金庫解析+2',who:'連携技',n:2,c:'ability',col:'#f4dc9f'});src.push(...bf.src);if(b)src.push({t:`${ch.res.name}+${b}`,n:b,c:'boost'});if(push)src.push({t:'こじ開け+3',who:'強引',n:3,c:'weak'});
  if(push){if(S.eta>0){S.eta--;renderVhud()}await banner('強引にこじ開ける','ダイス+3。物音で警備隊の到着が1手番早まる',BC.red,1600)}
  await banner(LT[t].name,`${esc(ch.name)}が${STATN2[stat]}で${LT[t].verb}　${spec?APTL[apt]:'×苦手：'+STATN2[stat]+'で代用'}`,LT[t].col,1300);
  if(crk){abilityFire(ch,'物理錠の判定でダイス+1',{u:'追加ダイス',v:1});await wait(400)}if(hk){abilityFire(ch,`${LT[stat].name}の判定でダイス+1`,{u:'追加ダイス',v:1});await wait(400)}
  if(!spec){abilityFire(ch,`苦手な${LT[t].name}：${STATN2[stat]}で代用（必要+1）`,{weak:true});await wait(400)}
  else if(apt===2){abilityFire(ch,`得意な${LT[t].name}：必要成功数−1`,{u:'得意',v:1});await wait(400)}
  else if(apt===0){abilityFire(ch,`苦手な${LT[t].name}：必要成功数+1`,{weak:true});await wait(400)}
  const P=pieces[ch.id];const from=P.g.position.clone();const front=new THREE.Vector3(from.x*.45,.45,from.z*.45-1.2);
  await tween(420,k=>{P.g.position.lerpVectors(from,front,k);P.g.position.y+=Math.sin(k*Math.PI)*.8});
  const bonus=chain+cb;const bl=chain&&cb?'連携+金庫の声':cb?'金庫の声':'連携';
  const s=await peakRoll(n,{purpose:`金庫破り　${LT[t].name}`,title:`${ch.name}`,ladder:[[2,`連携+${t==='hck'?3:2}`],[need-1,`1段解除（${1+xb}ダメージ）`],[need,`${1+xb}段解除`],[need+1,`${2+xb}段解除`],[need+2,'3段解除']].filter((x,i,a)=>i===0||x[0]>a[0][0]),tense:true,
    sub:`${push?'<b style="color:#ff8a9a">強引にこじ開ける：成功数1以下で巡回を呼ぶ</b>。':''}${VSTAGE[vStage()].name}の<b style="color:${LT[t].col}">${LT[t].name}</b>に${STATN2[stat]}で挑む（${spec?APTL[apt]:'×苦手・代用'}）。<b>成功数${need}で${1+xb}段、${need+1}で${2+xb}段、${need+2}以上で3段解除</b>　${LTRAIT[t].short}（残りロック${S.locks}）${bonus?`　${bl}+${bonus}込み`:''}`,bonus,bonusLabel:bl,need,noFumble:bf.noF,noFumbleOne:S.bonus.noFumble,explain:x=>finalExplain(x,need,t),table:T_FINALf(need,t),src});
  const back=()=>tween(420,k=>P.g.position.lerpVectors(front,from,k));
  const first=()=>{if(!S.chars.some(c=>c.st.firstLock))ch.st.firstLock=true};
  const st0=vStage();const open=async k=>{first();const before=S.locks;removeLocks(t,Math.min(k,S.locks));await unlock(Math.min(k,before))};
  const sensor=async()=>{if(t==='scn'&&S.phase==='final'){if(S.eta>0){S.eta--;renderVhud()}log('<span class="r">センサーの警報：警備隊の到着が1手番早まった</span>');await banner('センサー警報','警備隊の到着 −1手番',BC.red,1400)}};
  if(s<0){log(`<span class="r">成功${s}：包囲された（${3+xb}ダメージ）</span>`);await laserTo(pieceWorld(ch));await hurt(ch,3+xb);await sensor()}
  else if(s===0){log(`<span class="r">成功0：警備員と鉢合わせ（${2+xb}ダメージ）</span>`);await laserTo(pieceWorld(ch));await hurt(ch,2+xb);await sensor()}
  else if(s===1){log(`<span class="r">成功1：センサーに触れた（${1+xb}ダメージ）</span>`);SFX.laser();await hurt(ch,1+xb);await sensor()}
  else if(s<=need-2){S.chain=t==='hck'?3:2;log(`<span class="y">成功${s}：連携！次の団員に+${S.chain}成功を引き継ぐ</span>`)}
  else if(s===need-1){log(`<span class="y">成功${s}：${LT[t].name}を解除、しかし警報（自分に${1+xb}ダメージ）</span>`);await open(1);if(S.phase!=='final')return;alarm();await hurt(ch,1+xb)}
  else if(s===need){log(`<span class="g">成功${s}：${LT[t].name}を解除${xb?'（力ずくでもう1段）':''}</span>`);await open(1+xb)}
  else if(s===need+1){log(`<span class="g">成功${s}：完璧な手際！ロック${2+xb}段解除</span>`);await open(2+xb)}
  else{log(`<span class="g">成功${s}：神業！ロック3段解除</span>`);await open(3)}
  if(push&&s<=1&&S.phase==='final'){log('<span class="r">強引にこじ開けた音で警備ドローンが来た</span>');await patrol()}
  if(S.phase==='final'&&vStage()>st0){const V=VSTAGE[vStage()];SFX.boom();shake(700,.4);await banner(`${V.name}へ`,`ロックが硬くなった：必要成功数 ◎${V.base-1}／○${V.base}／×${V.base+1}`,BC.gold,2200)}
  if(S.phase!=='final')return;await back();
  if(S.chars.every(c=>c.dead)){await endGame(false,'本番で全員が確保された');return}
  renderAll();S.lockIn=true;setTimeout(()=>advanceFinal(true),800*SPEED*TEMPO)}
async function unlock(n,alarmOK=true){const before=S.locks;
  for(let i=0;i<n&&S.locks>0;i++){const idx=LOCKS-S.locks;S.locks--;const b=VAULT.bolts[idx],L=VAULT.lights[idx];const a=b.userData.a;
    tween(600,k=>{VAULT.dial.rotation.z+=.22*(1-k)});SFX.clank();
    await tween(460,k=>{b.position.set(Math.cos(a)*(3.7-k*.9),Math.sin(a)*(3.7-k*.9),0)},easeOut);
    L.material.color.setHex(0x62e3a4);const wp=new THREE.Vector3();L.getWorldPosition(wp);burst(wp,0x62e3a4,40,3,.4,1);burst(wp,0xf4dc9f,30,4,.35,.8);SFX.kaching();shake(260,.2);renderTop();await wait(260)}
  log(`<span class="g">ロック解除（残り${S.locks}）</span>`);
  if(S.locks<=0){await victory();return}
  if(alarmOK)for(const al of ALARMS){if(before>al&&S.locks<=al&&!S.alarmsHit.includes(al)){S.alarmsHit.push(al);await patrol();if(S.phase!=='final')return}}}
async function patrol(){alarm();await banner('PATROL','警備ドローン巡回',BC.red,2200);
  const [v]=await plainRoll(1,{purpose:'警備ドローン巡回',pc:'red',title:'巡回のダイス',sub:'ロックを外した音で警備が動いた。<b>出た目の行動が起きる</b>',styles:[{tint:'#ee3a54'}],mark:v=>v===1?'g':'r',
    breakTxt:v=>v===1?'やり過ごす':v<=3?'レーザー網':'捕捉',tableTitle:'巡回の行動表',
    table:[{k:'1',t:'物陰でやり過ごす（被害なし）',c:'g',test:v=>v[0]===1},{k:'2・3',t:'レーザー網：全員1ダメージ',c:'r',test:v=>v[0]>=2&&v[0]<=3},{k:'4〜6',t:'捕捉：全員でダイスを振り、最も低い目の団員が2ダメージ',c:'r',test:v=>v[0]>=4}],
    explain:([v])=>v===1?{kind:'good',level:1,stamp:'HIDDEN',head:'やり過ごした',text:'被害なし'}:v<=3?{kind:'bad',level:1,stamp:'LASER',head:'レーザー網',text:'全員1ダメージ'}:{kind:'bad',level:1,stamp:'TARGET',head:'ドローンの捕捉',text:'全員でダイスを振り、最も低い目の団員が2ダメージ'}});
  if(v===1){log('巡回：物陰でやり過ごした');return}
  if(v<=3){log('<span class="r">巡回：レーザー網（全員1ダメージ）</span>');SFX.laser();shake(600,.4);for(const c of S.chars)await hurt(c,1)}
  else{const alive=S.chars.filter(c=>!c.dead);let tg=[];await plainRoll(alive.length,{purpose:'ドローンの捕捉',pc:'red',title:'全員で1個ずつ',sub:'<b>最も低い目を出した団員が2ダメージ</b>（同点なら全員）',styles:alive.map(c=>({tint:c.css})),mark:()=>'z',label:(v,i)=>alive[i].name+' '+v,
      breakTxt:(v,i)=>alive[i].name,legend:legendHTML([{f:['最低'],c:'r',t:'その団員が2ダメージ'}]),
      explain:r=>{const mn=Math.min(...r);tg=alive.filter((c,i)=>r[i]===mn);return{kind:'bad',level:1,stamp:'LOCKED ON',head:`${tg.map(c=>esc(c.name)).join('・')}が捕捉された`,text:'2ダメージ'}}});
    log(`<span class="r">巡回：捕捉 → ${tg.map(c=>esc(c.name)).join('・')}に2ダメージ</span>`);
    for(const c of tg){await laserTo(pieceWorld(c));await hurt(c,2)}}
  if(S.chars.every(c=>c.dead))await endGame(false,'本番で全員が確保された')}
async function victory(){S.phase='end';clearHL();
  await tween(1000,k=>{VAULT.dial.rotation.z+=k*.6});SFX.clank();await wait(300);
  VAULT.glowPlane.visible=true;SFX.boom();flash('rgba(255,236,190,.85)');
  await tween(2000,k=>{VAULT.pivot.rotation.y=-1.9*k;VAULT.inner.intensity=k*6},easeInOut);
  celebrate(3);const c=new THREE.Vector3(0,4.4,-2.2);for(let i=0;i<7;i++){coinShower(c,40,7);burst(c,pick([0xf4dc9f,0xffffff,0xd9b46a]),80,8,.6,1.6,3);if(i===3)celebrate(3);await wait(380)}
  await endGame(true,'金庫破り成功')}
async function endGame(win,why){if(window.__STOPFINAL&&S.phase!=='final'){window.__RES={type:'lost',round:S.round,quests:S.quests.filter(q=>q.done).length,gauge:S.gauge};S.phase='done';return}if(S.ending)return;S.ending=true;clearHL();
  await banner(win?'金庫、突破！':'計画失敗',why,win?BC.gold:BC.red,2600);
  try{if(win)await escapePhase();else await retreatPhase()}catch(e){console.error(e)}
  await ceremony(win,why)}
async function ceremony(win,why){if(window.__STOPEND){window.__RES={type:win?'win':'loss',vault:S.vault,forced:!!S.forced,quests:S.quests.filter(q=>q.done).length,round:S.round,finalRound:S.finalRound,locks:S.locks,vt:S.vt||0};S.phase='done';BUSY=false;return}S.phase='end';BUSY=false;renderTop();renderSquad();$('#cmd').innerHTML='';jingle(win);
  const rk=rankOf(win);const home=S.chars.filter(c=>c.escaped);const tot=home.reduce((a,c)=>a+valOf(c),0);
  await banner(win?'HEIST COMPLETE':'MISSION FAILED',`怪盗ランク ${rk.r}　${rk.t}`,win?BC.gold:BC.red,2800);
  const H=S.chars.map(c=>({c,...honorOf(c)}));const mins=Math.max(1,Math.round((Date.now()-S.t0)/60000));
  const maxBy=f=>{const m=Math.max(...S.chars.map(f));return m>0?S.chars.filter(c=>f(c)===m):[]};
  const mvp=maxBy(c=>honorOf(c).pts),greed=maxBy(c=>c.st.drop+c.st.lost),shade=maxBy(c=>c.st.plan),duo=maxBy(c=>c.st.combo);
  const names=a=>a.map(c=>`<b style="color:${c.css}">${esc(c.name)}</b>`).join('・');
  let d=.5;const D=()=>{const v=d;d+=.55;return v};
  const ctHTML=H.map(h=>`<div class="ct rv ${h.okc?'ok':'ng'}" style="--d:${D()}s;--c:${h.c.css}"><img src="${AV[h.c.id]||''}" alt=""><div><b>${esc(h.c.name)}</b><em>${h.ct.name}</em><span>${h.ct.text}</span></div><i>${h.okc?'達成 +'+h.ct.pts:'未達成'}</i></div>`).join('');
  const abHTML=S.chars.map(c=>{const a=(S.abil||{})[c.id];return`<div style="--c:${c.css}"><img src="${AV[c.id]||''}" alt=""><span><b style="font-family:var(--f-body);font-size:13px;color:${c.css}">${esc(c.name)}</b><br>★${c.skill}${a?`：${a.u} ${a.sum}`:'：発動なし'}</span><b>${a?a.n:0}回</b></div>`}).join('');
  const aw=[];
  if(shade.length)aw.push(['縁の下賞','段取りをいちばん稼いだ',names(shade),`段取り ${shade[0].st.plan}`]);
  if(duo.length)aw.push(['名コンビ賞','連携技をいちばん決めた',names(duo),`連携 ${duo[0].st.combo}回`]);
  if(greed.length)aw.push(['強欲賞','欲張って失ったお宝がいちばん多い',names(greed),`失ったお宝 ${greed[0].st.drop+greed[0].st.lost}点`]);
  const awHTML=aw.map(([t,s2,n,v])=>`<div class="aw rv" style="--d:${D()}s"><span>${t}</span><em>${s2}</em><b>${n}</b><i>${v}</i></div>`).join('');
  const mvpD=D()+.3;
  const tbl=H.slice().sort((a,b)=>b.pts-a.pts).map(h=>`<tr style="--c:${h.c.css}"><td><b>${esc(h.c.name)}</b></td><td>${h.c.escaped?(h.c.bailed?'保釈':'逃げ切り'):'<span class="r">逮捕</span>'}</td><td>お宝 ${h.loot}</td><td>依頼 ${h.okc?'+'+h.ct.pts:'0'}</td><td class="pt">${h.pts}</td></tr>`).join('');
  const p=modal(`<div class="cer"><div class="eyebrow">The Aurora Job — ${win?'Complete':'Failed'}</div>
    <div class="rank r${rk.r}"><b>${rk.r}</b><span>怪盗ランク<br><em>${rk.t}</em></span></div>
    <p class="sum">${why}　／　逃げ切り ${home.length}/${S.chars.length}　／　持ち帰ったお宝 ${tot}点</p>
    <h4 class="rv" style="--d:.2s">裏の依頼　公開</h4><div class="cts">${ctHTML}</div>
    ${aw.length?`<h4 class="rv" style="--d:${d-.3}s">表彰</h4><div class="aws">${awHTML}</div>`:''}
    <div class="mvpbig rv" style="--d:${mvpD}s"><span>MVP　大怪盗</span><b>${mvp.length?names(mvp):'該当なし'}</b><em>${mvp.length?`名誉点 ${honorOf(mvp[0]).pts}（お宝＋裏の依頼）`:'今夜は誰も名を上げられなかった'}</em></div>
    <table class="honor rv" style="--d:${mvpD+.6}s"><tr><th>団員</th><th>結末</th><th></th><th></th><th>名誉点</th></tr>${tbl}</table>
    <h4 class="rv" style="--d:${mvpD+.9}s">能力の活躍</h4><div class="mvp rv" style="--d:${mvpD+1}s">${abHTML}</div>
    <p class="rv" style="--d:${mvpD+1.1}s;font-family:var(--f-num);font-size:15px;letter-spacing:.04em;color:var(--mute)">ROUND ${S.round}　／　警戒 ${S.gauge}/15　／　下準備 ${S.quests.filter(q=>q.done).length}/5　／　ロック残り ${S.locks}/9　／　段取り残り ${S.plan}<br>判定 ${S.stats.rolls}回　JACKPOT ${S.stats.crit}　FUMBLE ${S.stats.fumble}　プレイ時間 約${mins}分</p></div>`,
   [{label:'もう一度仕事をする',v:1,cls:'big'}],true);
  H.forEach((h,i)=>setTimeout(()=>{SFX.flip();if(h.okc)SFX.kaching()},(.5+i*.55)*1000));
  setTimeout(()=>{if(mvp.length){SFX.win(true);fxConfetti(140);fxCoins(80)}},mvpD*1000+200);
  await p;if(NET.on){if(NET.host)netBroadcast({t:'lobbyback'});backToLobby();return}location.reload()}
