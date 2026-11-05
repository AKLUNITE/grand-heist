/* =====================================================================
   UI
   ===================================================================== */
function renderTop(pop){const g=$('#gauge');if(!g.children.length){for(let i=1;i<=GAUGE_MAX;i++){const e=document.createElement('div');e.className='gs'+(FIRE.includes(i)?' fire':'')+(i===GAUGE_MAX?' max':'');g.appendChild(e)}}
  [...g.children].forEach((e,i)=>{e.classList.toggle('on',i<S.gauge);if(pop&&i===S.gauge-1){e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump')}});
  $('#gnum').textContent=S.gauge+' / '+GAUGE_MAX;$('#pnum').textContent=S.plan;{const t=$('#rwtray');if(t)t.parentNode.classList.toggle('has',S.rewardsGot.length>0);if(t)t.innerHTML=S.rewardsGot.length?S.rewardsGot.map(id=>{const r=REWARDS.find(x=>x.id===id);return`<i data-rw="${id}" title="${r.name}：${r.text}">${RWSHORT[id]}</i>`}).join(''):'<span>―</span>'}{const V=vaultOf();$('#vtype').innerHTML=`${V.short}<small>${LTYPES.map(t=>`<i style="color:${LT[t].col}">${LT[t].short}${V.counts[t]}</i>`).join('')}</small>`}$('#ptok').innerHTML=Array.from({length:PLAN_MAX},(_,k)=>`<i class="${k<S.plan?'on':''}"></i>`).join('');$('#qnum').textContent=S.quests.filter(q=>q.done).length+'/5';$('#rnum').textContent=S.round;
  $('#vaulthp').hidden=S.phase==='adventure';
  const hc=$('#hpcells');if(!hc.children.length){for(let i=1;i<=LOCKS;i++){const e=document.createElement('i');if(ALARMS.includes(i-1))e.className='claw';hc.appendChild(e)}}
  [...hc.children].forEach((e,i)=>e.classList.toggle('gone',i>=S.locks));$('#khpn').textContent=S.locks+' / '+LOCKS;renderVhud()}
const SC=(v,hi,lo)=>v>=hi?'hi':v<=lo?'lo':'';
function statCell(lbl,v,cls){return`<span>${lbl}<b class="${cls}">${v}</b>${cls==='hi'?'<em class="hi">得意</em>':cls==='lo'?'<em class="lo">苦手</em>':''}</span>`}
function statCells(ch){return statCell('移動',ch.move,SC(ch.move,4,2))+statCell('小仕事',`${ch.adv[0]}/${ch.adv[1]}`,SC(ch.adv[0],3,0))+statCell('突破',ch.bat,SC(ch.bat,4,2))+statCell('潜入',ch.scn,SC(ch.scn,3,1))+statCell('技術',ch.hck,SC(ch.hck,3,1))}
function sheetHTML(ch,i,isMe){const next=XP_LV[ch.lv+1];
  const xpBoxes=Array.from({length:15},(_,k)=>{const th=XP_LV.includes(k)&&k>0;return`<i class="${th?'th':''} ${k<ch.xp?'got':''} ${k===Math.min(ch.xp,14)?'cur':''}">${th?XP_LV.indexOf(k):''}</i>`}).join('');
  return`<div class="card sheet full ${i===S.turn&&S.phase!=='end'?'active':''} ${ch.dead?'dead':''}" style="--c:${ch.css}" ${isMe?`id="card-${ch.id}"`:''}>
   <img class="av" src="${AV[ch.id]||''}" alt="">
   <div class="chead"><span class="cname">${esc(ch.name)}</span>${ch.cpu?'<span class="cpu">CPU</span>':''}<span class="clv">Lv${ch.lv}</span></div>
   <div class="ccls">${ch.job}<span class="sk">★${ch.skill}</span>${ch.dead?'　— 確保':''}</div>
   <div class="trk"><span class="tl">スタミナ</span><div class="boxes ${ch.life<=2?'low':''}">${Array.from({length:ch.maxLife},(_,k)=>`<i class="${k<ch.life?'on':''}">${k+1}</i>`).join('')}</div></div>
   <div class="crow">${statCells(ch)}</div>
   <div class="abl"><b>★${ch.skill}</b>　${ch.ability}</div><div class="wk">▼弱み　${ch.weak}</div>
   ${(()=>{const T=TRUMP[ch.id];const ok=S.phase!=='end'&&!ch.dead&&S.plan>=T.cost;return`<div class="trp ${ok?'ok':''}"><b>✦${T.name}</b><span>段取り${T.cost}</span><em>${T.text}</em></div>`})()}
   ${ch.bag.length?`<div class="bag">${ch.bag.map(x=>`<i class="g${x.t}" title="${esc(x.name)}"></i>`).join('')}<span>名誉 <b>${valOf(ch)}</b>・重さ <b class="${wtOf(ch)>=4?'hv':''}">${wtOf(ch)}</b></span></div>`:''}
   ${S.phase==='adventure'&&!ch.dead?comboReady(ch).filter(x=>x.near).map(x=>`<div class="cmb">⚡ 連携可：${x.cb.name}<span>×${esc(x.p.name)}</span></div>`).join(''):''}
   <div class="ctr ${ch.cpu||!isMe?'cpu':''} ${isMe&&S.ctOpen===ch.id?'open':''}" ${isMe?`data-ct="${ch.id}"`:''}>${(()=>{const ct=CONTRACTS.find(x=>x.id===ch.contract);if(!isMe&&!ch.cpu)return'裏の依頼：本人だけが確認できる';if(ch.cpu)return'裏の依頼：？？？（表彰式で公開）';return S.ctOpen===ch.id?`<b>裏の依頼：${ct.name}</b>　${ct.text}（+${ct.pts}）`:'裏の依頼（タップで確認・他の人は見ないで）'})()}</div>
   <div class="trk xpt-row"><span class="tl">経験</span><div class="boxes xpt">${xpBoxes}</div><span class="xpn">${next?`Lv${ch.lv+1}まで${next-ch.xp}`:'MAX'}</span></div>
   <div class="res">${ch.res.name}${Array.from({length:ch.resMax},(_,k)=>`<i class="${k<ch.resv?'on':''}"></i>`).join('')}<span style="margin-left:auto">${ch.res.type==='boost'?'ダイス追加':'ダメージ軽減'}</span></div>
  </div>`}
function meIdx(){if(!S)return 0;if(NET.on){if(mine(cur()))return S.turn;const j=S.chars.findIndex(mine);return j>=0?j:S.turn}const c=S.chars[S.turn];if(c&&!c.cpu)S.meIdx=S.turn;if(S.meIdx==null){const h=S.chars.findIndex(x=>!x.cpu);S.meIdx=h>=0?h:S.turn}return S.chars.every(x=>x.cpu)?S.turn:S.meIdx}
function renderSquad(){const i=meIdx(),ch=S.chars[i];$('#squad').innerHTML=`<div class="melbl"><span class="eyebrow">${mine(ch)?'あなたのシート':'観戦中'}</span></div>`+sheetHTML(ch,i,NET.on?mine(ch):true);renderCrew();
  document.querySelectorAll('.ctr[data-ct]').forEach(el=>el.onclick=e=>{e.stopPropagation();const id=el.dataset.ct;const c=S.chars.find(x=>x.id===id);if(!c||!mine(c))return;S.ctOpen=S.ctOpen===id?null:id;SFX.flip();renderSquad()})}
function log(html){const p=document.createElement('p');p.innerHTML=html;const L=$('#log');L.appendChild(p);while(L.children.length>200)L.firstChild.remove();L.scrollTop=L.scrollHeight;
  if(!$('#logdrawer').classList.contains('open')){LOGN++;const b=$('#logn');if(b)b.textContent=LOGN>99?'99+':LOGN}
  const t=$('#ticker');if(t&&!html.includes('class="rd"')){t.innerHTML=`<span>${html}</span>`;t.classList.remove('go');void t.offsetWidth;t.classList.add('go')}}
let LOGN=0;
function openLog(on){const d=$('#logdrawer');d.classList.toggle('open',on);if(on){LOGN=0;$('#logn').textContent='';const L=$('#log');L.scrollTop=L.scrollHeight}}
function stText(){if(S.phase==='final')return'金庫に挑戦中';if(S.phase==='escape')return'逃走中';if(DICE.on)return'判定中';return{roll:'移動ダイスを振る',move:'移動中',warp:'なりすまし移動',action:'行動を選択中',done:'手番終了'}[S.step]||''}
function renderCrew(){const el=$('#crew');if(!el||!S)return;const me=meIdx();
  el.innerHTML=S.chars.map((c,i)=>{const now=i===S.turn&&S.phase!=='end';const T=TRUMP[c.id];const tr=!c.dead&&S.plan>=T.cost&&S.phase!=='end';const cb=S.phase==='adventure'&&!c.dead&&comboReady(c).some(x=>x.near);
    return`<button class="cc ${now?'now':''} ${c.dead?'dead':''} ${mine(c)&&(i===me||NET.on)?'me':''}" id="chip-${c.id}" data-ci="${i}" style="--c:${c.css}"><img src="${AV[c.id]||''}" alt=""><span class="ci"><b>${esc(c.name)}</b><small>Lv${c.lv}${c.cpu?'・CPU':i===me?'・あなた':''}</small><i class="lf"><em style="width:${Math.max(0,c.life/c.maxLife*100)}%"></em></i></span>${cb?'<span class="bd cbd" title="連携技が使える">⚡</span>':''}${tr?'<span class="bd tbd" title="切り札が使える">✦</span>':''}${now?`<span class="st">${c.dead?'確保':stText()}</span>`:''}</button>`}).join('<i class="carr"></i>');
  el.querySelectorAll('[data-ci]').forEach(b=>{b.onclick=e=>{e.stopPropagation();showCrewPop(+b.dataset.ci,b)}})}
function showCrewPop(i,anchor){const pop=$('#crewpop');if(pop.dataset.i==String(i)&&pop.classList.contains('show')){pop.classList.remove('show');pop.dataset.i='';return}
  const ch=S.chars[i];pop.innerHTML=sheetHTML(ch,i,mine(ch));pop.dataset.i=i;const r=anchor.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(innerWidth-288,r.left+r.width/2-140))+'px';const tp=Math.min(r.bottom+8,innerHeight-160);pop.style.top=tp+'px';pop.style.maxHeight=(innerHeight-tp-10)+'px';pop.classList.add('show');SFX.flip()}
document.addEventListener('pointerdown',e=>{const pop=$('#crewpop');if(pop&&pop.classList.contains('show')&&!pop.contains(e.target)&&!e.target.closest('#crew'))pop.classList.remove('show')});
function renderAll(){renderTop();renderSquad();renderPanel();renderHL();renderEhud()}
const nm=ch=>`<b style="color:${ch.css}">${esc(ch.name)}</b>`;
function toast(ch,label){const t=$('#toast');t.innerHTML=`<small>${label}</small><span style="color:${ch.css}">${esc(ch.name)}</span>の番`;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2400*TEMPO)}

function boostUI(ch){if(ch.res.type!=='boost'||ch.resv<=0)return'';return`<div class="boost"><span>${ch.res.name}でダイス追加</span><button id="bm" aria-label="減らす">−</button><b>${S.boost}</b><button id="bp" aria-label="増やす">＋</button><span style="color:var(--mute)">残り${ch.resv}</span></div>`}
function bindBoost(ch){const bm=$('#bm'),bp=$('#bp');if(bm){bm.onclick=()=>{S.boost=Math.max(0,S.boost-1);SFX.click();renderPanel()};bp.onclick=()=>{S.boost=Math.min(ch.resv,S.boost+1);SFX.click();renderPanel()}}}
// 2つの能力値を使う下準備は「参加者ごとに得意なほう1つ」を数える
const qStat=q=>q.q.stats.map(s=>STATN[s]).join('か');
const bestSt=(c,q)=>q.q.stats.reduce((a,s)=>c[s]>c[a]?s:a,q.q.stats[0]);
function dicePool(ch,q,helpers){let n=0;const party=[ch,...helpers];party.forEach(c=>n+=c[bestSt(c,q)]);
  if(q.q.stats.includes('hck')&&party.some(c=>c.id==='hacker'))n+=1;if(helpers.length&&party.some(c=>c.id==='phantom'))n+=2;if(S.noticeRound===S.round)n+=party.length;party.forEach(c=>n+=c.buff.dice);return n}
function availActions(ch){const t=terr(ch.r,ch.c),A=[];
  const aq=adjQuests(ch),hid=aq.filter(i=>!S.quests[i].revealed),rev=aq.filter(i=>S.quests[i].revealed);
  rev.forEach(i=>{const q=S.quests[i];const helpers=S.chars.filter(o=>o!==ch&&!o.dead&&isAdj(o,i));A.push({k:'challenge',qi:i,label:`下準備：${q.q.name}`,sub:`${qStat(q)}判定　ダイス${dicePool(ch,q,[])}個　必要${Math.max(0,q.q.diff-q.progress)}${helpers.length?'　協力可（'+helpers.length+'人）':''}`})});
  if(hid.length)A.push({k:'investigate',qi:hid[0],label:'下見：標的を調べる',sub:'下準備の内容と難しさが分かる'});
  if(t==='C'||t==='X'){const n=ch.adv[t==='C'?0:1];A.push({k:'adventure',label:'小仕事でひと稼ぎ',sub:`${TERRAIN[t].name}　ダイス${n}個　2成功で経験+1`})}
  if((t==='B'||t==='S')&&!isBurned(ch.r,ch.c))A.push({k:'rest',label:'休息する',sub:`スタミナ+${2+(ch.id==='bouncer'?1:0)}${t==='B'?'　リソース全回復':''}`});
  return A}
const T_ADV=[{k:'2+',t:'経験+1',c:'g',test:s=>s>=2},{k:'1',t:'経験+1、ただし1ダメージ',c:'y',test:s=>s===1},{k:'0',t:'何も起きない',test:s=>s===0},{k:'−',t:'追われて1ダメージ',c:'r',test:s=>s<0}];
function T_CH(need,rw){const r=[{k:need+'+',t:`達成！「${rw}」を入手、経験`,c:'g',test:s=>s>=need}];if(need>1)r.push({k:`1〜${need-1}`,t:'あと一歩：成功数ぶん達成マーカー',c:'y',test:s=>s>0&&s<need});
  r.push({k:'0',t:'成果なし',test:s=>s===0},{k:'−',t:'失敗：マーカー消失、参加者全員1ダメージ',c:'r',test:s=>s<0});return r}
// 金庫は外側から内側へ硬くなる：残りロック9〜7＝外周（1段に成功数4）／6〜4＝中層（5）／3〜1＝最深部（6）
const VSTAGE=[{name:'外周',base:5},{name:'中層',base:6},{name:'最深部',base:7}];
const vStage=()=>S.locks>6?0:S.locks>3?1:2;
const vBase=()=>VSTAGE[vStage()].base;
// ロックの種類と、キャラごとの適性（◎得意＝必要−1／○普通＝そのまま／×苦手＝必要+1。苦手なら一番高い能力で代用して必要+1）
const LT={bat:{name:'物理錠',short:'物',col:'#f0954a',verb:'力ずくで外す'},hck:{name:'電子錠',short:'電',col:'#52d4c6',verb:'回路を解析する'},scn:{name:'センサー錠',short:'セ',col:'#ff7fd0',verb:'センサーをかいくぐる'}};
const LTYPES=['bat','hck','scn'];
const vJob=(ch,stat)=>(ch.id==='cracker'&&stat==='bat')||(ch.id==='hacker'&&stat==='hck')||(ch.id==='informant'&&stat==='hck')||(ch.id==='pickpocket'&&stat==='scn')?1:0;
function vDice(ch,stat,push=false){return ch[stat]+(stat==='bat'?S.bonus.bat:0)+vJob(ch,stat)+(S.bonus.scan?2:0)+ch.buff.dice+S.boost+(push?3:0)}
const APTL=['×苦手','○普通','◎得意'],APTM=[1,0,-1];
function vApt(ch,t){const e=ch[t]+vJob(ch,t);return e>=3?2:e>=2?1:0}
// 錠前の性格
const LTRAIT={bat:{short:'成功で+1段／失敗ダメージ+1',long:'力ずくの錠前。成功すると解除が1段多い。ただし失敗のダメージも+1'},
  hck:{short:'しくじっても連携+3',long:'解析の錠前。届かなくても次の団員に+3を引き継げる（通常は+2）'},
  scn:{short:'成功数1以下で警備−1手番',long:'センサーの錠前。成功数1以下だと警報で警備隊の到着が1手番早まる'}};
function vOptions(ch,push=false){const li=vStage(),b=VSTAGE[li].base;const bonus=(S.chain||0)+(S.crackerBonus||0);const out=[];
  [...new Set(S.vlocks[li]||[])].forEach(t=>{const apt=vApt(ch,t);const off=LTYPES.filter(x=>x!==t).sort((x,y)=>ch[y]-ch[x])[0];
    const A={t,stat:t,n:vDice(ch,t,push),need:b+APTM[apt],spec:true,apt};const B={t,stat:off,n:vDice(ch,off,push),need:b+1,spec:false,apt};
    [A,B].forEach(o=>o.p=odds(o.n,o.need-bonus));out.push(apt===0&&B.p>A.p?B:A)});return out}
const vaultOf=()=>VAULTS.find(v=>v.id===(S&&S.vault))||VAULTS[0];
function vLayout(){if(!S.vlayout){const V=vaultOf();const bag=[];LTYPES.forEach(t=>{for(let i=0;i<V.counts[t];i++)bag.push(t)});
    shuffle(bag);S.vlayout=[bag.slice(0,3),bag.slice(3,6),bag.slice(6,9)]}return S.vlayout}
function removeLocks(t,k){for(let i=0;i<k;i++){const li=S.vlocks.findIndex(l=>l.length);if(li<0)return;const L=S.vlocks[li];const j=i===0&&t?L.indexOf(t):-1;L.splice(j>=0?j:0,1)}}
function finalRows(b=vBase(),t=''){const x=t==='bat'?1:0,ch=t==='hck'?3:2,sc=t==='scn'?'・警備−1手番':'';
  return[[`${b+2}+`,`神業：ロックを${3}段解除`,'g',s=>s>=b+2],[`${b+1}`,`ロックを${2+x}段解除`,'g',s=>s===b+1],[`${b}`,`ロックを${1+x}段解除`,'g',s=>s===b],[`${b-1}`,`1段解除、警報で自分に${1+x}ダメージ`,'y',s=>s===b-1],
  [b-2>2?`2〜${b-2}`:'2',`連携：次の団員の判定に+${ch}`,'y',s=>s>=2&&s<=b-2],['1',`センサーに触れた：自分に${1+x}ダメージ${sc}`,'r',s=>s===1],['0',`警備員と鉢合わせ：自分に${2+x}ダメージ${sc}`,'r',s=>s===0],['−',`包囲された：自分に${3+x}ダメージ${sc}`,'r',s=>s<0]]}
const T_FINALf=(b,lt)=>finalRows(b,lt).map(([k,t,c,test])=>({k,t,c,test}));
function renderPanel(){const el=$('#cmd');if(!S)return;el.dataset.step=S.phase==='adventure'?S.step:S.phase;el.dataset.mine=cur()&&mine(cur())?'1':'0';const mt=$('#myturn');mt.classList.remove('show');renderCrew();
  if(S.phase==='end'){el.innerHTML='';el.classList.add('empty');return}
  const ch=cur();el.style.setProperty('--c',ch.css);el.classList.remove('empty');
  let h=`<div class="dockhead"><span class="eyebrow">${S.phase==='escape'?'Phase III — 逃走':S.phase==='final'?'Phase II — 本番':'Phase I — 下見'}</span><b style="color:${ch.css}">${esc(ch.name)}</b><span class="eyebrow" style="color:var(--mute);margin-left:auto">Round ${S.round}</span></div>`;
  if(S.phase==='escape'){el.innerHTML=h+`<p class="hint">逃走中。関門ごとに1人ずつ判定し、成功すれば通過、失敗するとスタミナ−1（2回で逮捕）。</p><div class="esl">${S.chars.map(c=>`<div style="--c:${c.css}" class="${c.caught?'out':''}"><b>${esc(c.name)}</b><span>${c.caught?'逮捕':c.escHome?'アジト到着':`失敗 ${c.escFail||0}/2　重さ${wtOf(c)}${S.showOdds!==false&&!c.dead?`　逃げ切り 約${pct(escOdds(c))}`:''}`}</span></div>`).join('')}</div>`;return}
  if(S.step==='intro'){el.innerHTML=`<div class="dockhead"><span class="eyebrow">Phase I — 下見</span><b>作戦準備中</b><small>金庫・裏の依頼・手番の順番を決めています</small></div>`;return}
  if(BUSY&&mine(ch)){el.innerHTML=h+`<p class="hint">処理中…</p>`;return}
  if(!ch.cpu&&!mine(ch)){el.innerHTML=`<div class="cpuline" style="--c:${ch.css}"><img src="${AV[ch.id]||''}" alt=""><span><b>${esc(ch.name)}</b>の番です。${esc(memberName(ch.owner))}が操作しています…</span></div>`;return}
  if(ch.cpu){el.innerHTML=`<div class="cpuline" style="--c:${ch.css}"><img src="${AV[ch.id]||''}" alt=""><span><b>${esc(ch.name)}</b>が${stText()}…</span><button class="btn ghost" id="bFast">${SPEED<1?'通常速度に戻す':'CPUの番を早送り'}</button></div>`;$('#bFast').onclick=()=>{SPEED=SPEED<1?1:.45;renderPanel()};return}
  if(S.phase==='final'){const push=!!S.pushSel;
    const thr=ALARMS.filter(a=>!S.alarmsHit.includes(a)&&a<S.locks)[0];
    const chips=[`<span class="fc"><b>${VSTAGE[vStage()].name}</b> 必要 ◎${vBase()-1}・○${vBase()}・×${vBase()+1}${vStage()<2?`（次の層は+1）`:''}</span>`,
      `<span class="fc ${S.eta<=3?'warn':''}">${S.eta>0?`警備隊まで <b>${S.eta}</b>手番`:'<b>包囲中</b>：毎手番巡回'}</span>`];
    if(thr!=null)chips.push(`<span class="fc warn">あと<b>${S.locks-thr}</b>段で巡回</span>`);
    if(S.chain)chips.push(`<span class="fc gold">連携 +${S.chain}</span>`);if(S.crackerBonus)chips.push(`<span class="fc gold">金庫の声 +${S.crackerBonus}</span>`);if(S.bonus.scan)chips.push(`<span class="fc gold">金庫解析 ダイス+2</span>`);
    h+=`<div class="fchips">${chips.join('')}</div>`;
    const ops=vOptions(ch,push);const li=vStage();
    const crewApt=t=>S.chars.filter(c=>!c.dead&&vApt(c,t)===2).map(c=>`<em style="color:${c.css}">${esc(c.name)}</em>`).join('・')||'<s>なし</s>';
    h+=`<div class="lockops">${[...new Set(S.vlocks[li])].map(t=>{const o=ops.find(x=>x.t===t);const cnt=S.vlocks[li].filter(x=>x===t).length;
      return`<div class="lop" style="--lc:${LT[t].col}"><div class="lh"><b>${LT[t].name}${cnt>1?` ×${cnt}`:''}</b><span>${LTRAIT[t].short}</span></div>
      <div class="lcrew">◎担当：${crewApt(t)}</div>
      <button class="lb apt${o.apt} ${o.spec?'sp':'off'}" data-lt="${o.t}" data-ls="${o.stat}" title="${LTRAIT[t].long}"><span><u>${APTL[o.apt]}</u>${STATN2[o.stat]}×${o.n}${o.spec?'':'で代用'}</span><i>必要${o.need}${S.showOdds!==false?`　1段以上 ${pct(odds(o.n,o.need-1-(S.chain||0)-(S.crackerBonus||0)))}`:''}</i></button></div>`}).join('')}</div>`;
    h+=`<div class="util">${boostUI(ch)}<button class="btn push ${push?'on':''}" id="bPushT" title="ONで全ダイス+3。代わりに警備隊の到着が1手番早まり、成功数1以下なら巡回も呼ぶ">強引にこじ開ける：<b>${push?'ON':'OFF'}</b><em>ダイス+3／警備−1手番</em></button>${trumpBar('final',true)}${S.plan>=STALL_COST?`<button class="btn ghost" id="bStall" title="警備隊の到着を1手番遅らせる">段取り${STALL_COST}で足止め</button>`:''}</div>`;
    h+=`<details class="ftab"><summary>結果表（成功数ごとの結果）</summary><table class="table sm">${finalRows(vBase()).map(([a,b,c],i)=>`<tr class="${c}"><td>${['必要+2','必要+1','必要','必要−1','それ未満','1','0','−'][i]}</td><td>${b}</td></tr>`).join('')}</table></details>`;
    el.innerHTML=h;bindBoost(ch);bindTrump();$('#bPushT').onclick=()=>{S.pushSel=!S.pushSel;SFX.click();renderPanel()};
    el.querySelectorAll('[data-lt]').forEach(bt=>bt.onclick=()=>{SFX.click();sendIn({k:'attack',push:!!S.pushSel,t:bt.dataset.lt,stat:bt.dataset.ls,boost:S.boost})});
    const st=$('#bStall');if(st)st.onclick=()=>{SFX.click();sendIn({k:'stall'})};return}
  if(S.step==='warp'){h+=`<p class="hint" style="color:#ff7fd0">✦ なりすまし入館：光っている3マス以内のマスをタップして移動（警戒は上がらない）</p>`;el.innerHTML=h;return}
  if(S.step==='roll'){const mv=ch.id==='disguise'?'<span class="tag ab" style="--c:'+ch.css+'">★なりすまし：6を1つ無視</span>':ch.id==='driver'?'<span class="tag ab" style="--c:'+ch.css+'">★抜け道：裏路地4+'+(terr(ch.r,ch.c)==='X'?'・裏路地にいるので6で目撃されない':'')+'</span>':ch.move<=2?'<span class="tag wk">▼足が遅い：移動ダイス2個</span>':ch.move>=4?'<span class="tag ab" style="--c:'+ch.css+'">★俊足：移動ダイス4個</span>':'';
    let m=`<div class="mt-in" style="--c:${ch.css}"><img src="${AV[ch.id]||''}" alt=""><div class="mt-k">YOUR TURN</div><div class="mt-t"><b>${esc(ch.name)}</b>　<span class="nb">あなたの番です</span></div><div class="mt-tags">${mv||'<span class="ax">標準の移動力（ダイス3個）</span>'}</div><p class="hint">移動ダイスを<b>${ch.move}個</b>振ります。<br><b style="color:#ff8a9a">6の目1つにつき警戒レベル+1</b>${ch.id==='disguise'?'（変装師は1つまで無視）':''}。<br>出目1つで隣へ1マス：大通り<b>2+</b>／繁華街<b>3+</b>／裏路地<b>${ch.id==='driver'?4:5}+</b></p><button class="btn big" id="bRoll">移動ダイスを振る ×${moveN(ch)}</button>${moveN(ch)<ch.move?'<p class="hint" style="color:#ff8a9a">荷物が重い（重さ4以上）：移動ダイス−1</p>':''}`+trumpBar('roll')+bagBtn(ch)+'</div>';mt.innerHTML=m;mt.classList.add('show');el.innerHTML=h+`<p class="hint" style="margin:4px 0">画面中央の「移動ダイスを振る」から手番を始めよう</p>`;$('#bRoll').onclick=()=>{SFX.click();sendIn({k:'roll'})};bindTrump();bindBag(ch);return}
  if(S.step==='move'){const left=S.moveDice.filter(d=>!d.used).length;
    h+=`<div class="pool">${S.moveDice.map(d=>dieHTML(d.v,(d.v===6?' six':'')+(d.used?' used':''))).join('')}</div>
    <p class="hint">${left?'光っているマスをタップして進む。マスの数字が必要な出目で、足りる出目のうち一番小さいダイスを使います。':'ダイスを使い切りました。'}</p>
    <button class="btn" id="bEnd">ここで行動する<small>現在地：${TERRAIN[terr(ch.r,ch.c)].name}</small></button>`;el.innerHTML=h;$('#bEnd').onclick=()=>{SFX.click();sendIn({k:'end'})};return}
  if(S.step==='action'){const C=actionCards(ch);const loc=`<span class="loc">現在地：${TERRAIN[terr(ch.r,ch.c)].name}${isBurned(ch.r,ch.c)?'（ガサ入れ済み）':''}</span>`;
    h=h.replace('<span class="eyebrow" style="color:var(--mute);margin-left:auto">',loc+'<span class="eyebrow" style="color:var(--mute);margin-left:auto">');
    const ng=C.filter(c=>!c.ok);
    h+=`<div class="hand">${C.map((c,i)=>c.ok?`<button class="acard ${c.wide?'wide':''}" data-c="${i}" title="${c.txt}">${ICON[c.ic]}<span class="an">${c.name}</span><span class="at">${c.title}</span><span class="ax">${c.txt}</span>${(c.tags||[]).map(([k,t])=>`<span class="tag ${k}" style="--c:${ch.css}">${t}</span>`).join('')}<span class="am">${c.meta}</span></button>`:'').join('')}</div>`;
    if(ng.length)h+=`<div class="ngline">使えない行動：${ng.map(c=>`<span>${c.name}<i>（${c.why}）</i></span>`).join('　')}</div>`;
    h+=`<div class="util">${boostUI(ch)}${trumpBar('turn',true)}${bagBtn(ch)}<button class="btn ghost" id="bWait">何もせず手番を終える</button></div>`;
    el.innerHTML=h;bindBoost(ch);bindTrump();bindBag(ch);
    el.querySelectorAll('.acard').forEach(b=>b.onclick=()=>{const c=C[+b.dataset.c];if(!c.ok){SFX.zero();return}
      b.classList.add('play');SFX.deal();const i=+b.dataset.c,bo=S.boost;setTimeout(()=>sendIn({k:'act',i,boost:bo}),260)});
    $('#bWait').onclick=()=>{SFX.click();sendIn({k:'act',i:'wait'})};return}
  el.innerHTML=h+`<p class="hint">…</p>`;
}
function trumpBar(ctx,cp=false){const ch=cur();const list=[];
  if(ctx==='final'){['cracker','hacker'].forEach(id=>{const c=S.chars.find(o=>o.id===id&&!o.dead&&mine(o));if(c&&trumpOK(c,'final'))list.push(c)})}
  else if(mine(ch)&&trumpOK(ch,ctx))list.push(ch);
  let h=list.map(c=>`<button class="btn trump" data-tr="${c.id}" style="--c:${c.css}" title="${TRUMP[c.id].text}">✦ ${cp?'':'切り札：'}${TRUMP[c.id].name}${cp?`<em>段取り${TRUMP[c.id].cost}</em>`:''}<small>段取り${TRUMP[c.id].cost}を払う（いま${S.plan}）　${TRUMP[c.id].text}</small></button>`).join('');
  const T=TRUMP[ch.id];if(!list.length&&mine(ch)&&ctx!=='final'&&T&&(T.when===ctx||(ctx==='roll'&&T.when==='turn'))&&S.plan<T.cost)h+=cp?`<span class="tw" title="${T.text}">✦${T.name}：段取り${T.cost}で使える（いま${S.plan}）</span>`:`<p class="hint trp-wait" style="--c:${ch.css}">✦ 切り札「${T.name}」は段取り${T.cost}で使える（いま${S.plan}）</p>`;
  return h}
function bindTrump(){document.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{SFX.click();sendIn({k:'trump',id:b.dataset.tr})})}
function bagBtn(ch){return ch.bag.length?`<button class="btn ghost" id="bBag" title="換金・買収・仲間に渡す（行動は使わない）">持ち物 ${ch.bag.length}点　<small>換金・買収・仲間に渡す（行動は使わない）</small></button>`:''}
function bindBag(ch){const b=$('#bBag');if(b)b.onclick=()=>{SFX.click();sendIn({k:'bag'})}}
const moveN=ch=>Math.max(1,ch.move-(wtOf(ch)>=4?1:0));
const ICON={
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  coin:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.8 9.3c-.5-.8-1.5-1.3-2.8-1.3-1.7 0-2.8.9-2.8 2s1 1.7 2.8 2 2.8.9 2.8 2-1.2 2-2.8 2c-1.3 0-2.4-.5-2.9-1.4"/></svg>',
  cup:'<svg viewBox="0 0 24 24"><path d="M6 4h12l-1.2 7.5a4.8 4.8 0 0 1-9.6 0z"/><path d="M12 16v4M8.5 20h7"/></svg>',
  card:'<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8l3-2 3 2-3 2z"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/></svg>'};
const PIPMAP={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function dieHTML(v,cls=''){return`<span class="pdie${cls}" aria-label="${v}">${Array.from({length:9},(_,k)=>PIPMAP[v].includes(k)?'<i></i>':'<span></span>').join('')}</span>`}
function actionCards(ch){const t=terr(ch.r,ch.c),aq=adjQuests(ch),hid=aq.filter(i=>!S.quests[i].revealed),rev=aq.filter(i=>S.quests[i].revealed),C=[];
  rev.forEach(i=>{const q=S.quests[i];const helpers=S.chars.filter(o=>o!==ch&&!o.dead&&isAdj(o,i));const need=Math.max(0,q.q.diff-q.progress);
    const solo=[ch];const tags=[];if(q.q.stats.includes('hck')&&ch.id==='hacker')tags.push(['ab','★ハッキング +1']);if(helpers.length&&[ch,...helpers].some(c=>c.id==='phantom'))tags.push(['ab','★指揮 協力+2']);
    if(ch[bestSt(ch,q)]<=1)tags.push(['wk','▼苦手 '+STATN[bestSt(ch,q)]+ch[bestSt(ch,q)]]);
    C.push({k:'challenge',qi:i,ic:'lock',name:'下準備',title:q.q.name,txt:`${qStat(q)}判定。成功数${need}で達成し報酬カードを入手`,meta:`ダイス${dicePool(ch,q,[])}個${S.showOdds!==false?`（${pct(odds(dicePool(ch,q,[])+S.boost,need))}）`:''}${helpers.length?`／協力で${dicePool(ch,q,helpers)}個${S.showOdds!==false?`（${pct(odds(dicePool(ch,q,helpers)+S.boost,need))}）`:''}`:''}`,ok:true,tags})});
  if(!rev.length)C.push({k:'challenge',ic:'lock',name:'下準備',title:'標的に挑む',txt:'判定に成功すると報酬カードを入手',ok:false,why:'公開済みの標的に隣接していない'});
  C.push({k:'investigate',qi:hid[0],ic:'eye',name:'下見',title:'標的を調べる',txt:'伏せた標的カードをめくり、内容を公開する。段取り+1',meta:'判定なし',tags:ch.id==='informant'?[['ab','★情報網 経験+1']]:[],ok:hid.length>0,why:'伏せた標的に隣接していない'});
  const advOk=t==='C'||t==='X';C.push({k:'adventure',ic:'coin',name:'小仕事',title:'ひと稼ぎ',txt:'成功数2以上で経験+1。失敗すると1ダメージ',meta:advOk?`ダイス${ch.adv[t==='C'?0:1]}個`:'',tags:ch.id==='pickpocket'?[['ab','★器用な指先 1が無効']]:[],ok:advOk,why:'繁華街・裏路地でのみ'});
  const L=lootHere(ch);if(L){const n=ch.scn+S.boost+ch.buff.dice;C.unshift({k:'loot',L,ic:'coin',name:'お宝',title:L.name,txt:`潜入${L.diff}以上で静かに盗む。足りなくても手に入るが警戒+1`,meta:`価値${L.val}・重さ${L.wt}　ダイス${n}個${S.showOdds!==false?`（静かに ${pct(odds(n,L.diff))}）`:''}`,ok:true,wide:true,
    tags:[...(ch.scn>=3?[['ab','★潜入'+ch.scn+' 盗みが得意']]:[]),...(ch.scn<=1?[['wk','▼潜入'+ch.scn+' 警報を鳴らしやすい']]:[])]})}
  combosFor(ch).forEach(({cb,p})=>C.unshift({k:'combo',id:cb.id,ic:'star',name:'連携技',title:cb.name,txt:cb.text,meta:`×${p.name}　1ゲーム1回`,ok:true,wide:true,tags:[['ab','⚡COMBO']]}));
  const restOk=(t==='B'||t==='S')&&!isBurned(ch.r,ch.c);C.push({k:'rest',ic:'cup',name:'休息',title:'ひと息つく',txt:`スタミナ+${2+(ch.id==='bouncer'?1:0)}${t==='B'?'。アジトならリソースも全回復':''}`,meta:`スタミナ ${ch.life}/${ch.maxLife}`,tags:ch.id==='bouncer'?[['ab','★タフネス 回復+1']]:[],ok:restOk,why:isBurned(ch.r,ch.c)?'ガサ入れされて使えない':'アジト・バーでのみ'});
  return C}
function renderHL(){if(S&&S.phase==='escape')return;clearHL();if(!S||S.phase!=='adventure')return;const ch=cur();
  if(S.step==='move'&&mine(ch))reachable(ch).forEach(([r,c])=>addHL(r,c,0x52d4c6,needFor(ch,terr(r,c))+'+'));
  if(S.step==='warp'&&mine(ch))warpTargets(ch).forEach(([r,c])=>addHL(r,c,0xff7fd0));
  if(S.step==='action')adjQuests(ch).forEach(i=>addHL(S.quests[i].r,S.quests[i].c,0xd9b46a))}
function reachable(ch){const left=S.moveDice.filter(d=>!d.used).map(d=>d.v);if(!left.length)return[];const mx=Math.max(...left);
  return nbrs(ch.r,ch.c).filter(([r,c])=>{const t=terr(r,c);if(t==='N')return false;if(occupied(r,c,ch)&&t!=='B'&&t!=='S')return false;return mx>=needFor(ch,t)})}

const BC={gold:'#f4dc9f',red:'#ff6a80',teal:'#7ee8dc',blue:'#8fb0ff',green:'#8cf0be',white:'#f2ece0'};
function banner(t,s='',color=BC.gold,ms=2300){const b=$('#banner .band');b.style.setProperty('--bc',color);b.style.setProperty('--bd',(ms*TEMPO*SPEED)+'ms');
  b.innerHTML=`<div class="t">${t}</div>${s?`<div class="s">${s}</div>`:''}`;b.classList.remove('go');void b.offsetWidth;b.classList.add('go');return wait(ms)}
function flash(color){const f=$('#flash');f.style.background=color;f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}
// 共通ウインドウ：本文だけスクロールし、ボタン行は常に下に見えている。閉じるボタンがあれば右上×・Esc・背景タップでも閉じる
let MODAL_CLOSE=null;
function modalFrame(m,box,html,foot){box.innerHTML=`<div class="mbody">${html}</div>${foot?`<div class="mfoot">${foot}</div>`:''}`;
  const body=box.querySelector('.mbody');
  if(!foot){const last=body.lastElementChild;if(last&&last.tagName==='DIV'&&last.children.length&&[...last.children].every(c=>c.classList.contains('btn'))){const f=document.createElement('div');f.className='mfoot';f.append(...last.childNodes);last.remove();box.appendChild(f)}}
  body.scrollTop=0;
  const close=[...box.querySelectorAll('.mfoot [data-i]')].find(b=>/閉じる|戻る/.test(b.textContent));
  MODAL_CLOSE=close?()=>close.click():null;
  if(close){const x=document.createElement('button');x.className='mx';x.title='閉じる（Esc）';x.textContent='×';x.onclick=e=>{e.stopPropagation();close.click()};box.appendChild(x)}}
async function modal(html,buttons,wide=false){const i=await modalI(html,buttons,wide);return buttons[i].v}
function modalI(html,buttons,wide=false){return new Promise(res=>{const m=$('#modal');const box=m.querySelector('.box');box.classList.toggle('wide',wide);
  modalFrame(m,box,html,buttons.map((b,i)=>`<button class="btn ${b.cls||''}" data-i="${i}">${b.label}${b.sub?`<small>${b.sub}</small>`:''}</button>`).join(''));
  m.classList.add('show');m.querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>{SFX.click();m.classList.remove('show');MODAL_CLOSE=null;res(+el.dataset.i)})})}
$('#modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal'&&MODAL_CLOSE)MODAL_CLOSE()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#modal').classList.contains('show')&&MODAL_CLOSE)MODAL_CLOSE()});
// 配られるカード（報酬・標的の公開）。裏向きで飛んできて、めくれて、盤へ戻っていく
function dealCard(o){const cc=cur(),who=cc&&!cc.cpu?cc:'host';let h=null;
  return askRaw(who,()=>dealUI(o,true).done,w=>{if(w){h=dealUI(o,false);$('#deal .dhint').textContent=`${waitName(w)}の確認を待っています…`}else if(h)h.close()}).then(()=>h&&h.done)}
function dealUI(o,inter){let close;const done=dealUI2(o,inter,f=>close=f);return{done,close:()=>close&&close()}}
function dealUI2({kicker='',title='',text='',meta='',color='#d9b46a',icon='card'},inter,reg){return new Promise(res=>{const D=$('#deal'),c=D.querySelector('.dcard');D.querySelector('.dhint').textContent='タップで次へ';
  c.className='dcard';c.querySelector('.fr').innerHTML=`<div class="dk">${kicker}</div>${ICON[icon].replace('<svg','<svg class="dicon"')}<div class="dt">${title}</div><div class="dx">${text}</div>${meta?`<div class="dm">${meta}</div>`:''}`;
  c.style.setProperty('--dc',color);D.classList.add('show');void c.offsetWidth;c.classList.add('in');SFX.deal();
  let closed=false;const close=()=>{if(closed)return;closed=true;D.onclick=null;c.classList.add('out');SFX.deal();setTimeout(()=>{D.classList.remove('show');c.className='dcard';res(1)},520)};reg(close);
  setTimeout(()=>{c.classList.remove('in');c.classList.add('front');SFX.flip()},620*SPEED);
  if(inter){setTimeout(()=>{if(!closed)D.onclick=close},1100*SPEED);setTimeout(close,(isHuman()?6000:3000)*SPEED*TEMPO)}})}
// 能力の発動を見せる：左上にカードが滑り込み、コマが職業色に光り、ログに残る。回数は最後に集計
function abilityFire(ch,effect,{u='',v=1,weak=false}={}){if(!weak){S.abil=S.abil||{};const a=S.abil[ch.id]||(S.abil[ch.id]={n:0,sum:0,u});a.n++;a.sum+=v;if(u)a.u=u}
  weak?SFX.weak():SFX.ability();const P=pieces[ch.id];if(P&&P.g.visible&&!weak)burst(P.g.position.clone().add(new THREE.Vector3(0,.8,0)),ch.col,50,2.6,.4,1.1,2.2);
  const el=document.createElement('div');el.className='abil'+(weak?' weak':'');el.style.setProperty('--c',weak?'#ff6a80':ch.css);
  el.innerHTML=`<img src="${AV[ch.id]||''}" alt=""><div><span>${weak?`${ch.job}の弱み`:`${ch.job}の能力`}</span><b>${weak?'苦手':ch.skill}</b><em>${effect}</em></div>`;
  $('#abils').appendChild(el);while($('#abils').children.length>3)$('#abils').firstChild.remove();
  setTimeout(()=>el.classList.add('out'),2800*TEMPO*SPEED);setTimeout(()=>el.remove(),3400*TEMPO*SPEED);
  if(!weak)cardFx(ch,'good');log(`<span style="color:${weak?'#ff9aa8':ch.css}">${weak?'▼':'★'} ${esc(ch.name)}${weak?'の弱み':'の'+ch.skill}：${effect}</span>`)}
// ダイスの内訳（誰の何から何個）をチップで並べる
function srcHTML(src){if(!src||!src.length)return'';const tot=src.reduce((a,x)=>a+x.n,0);
  return src.map((x,i)=>`${i?'<span class="src-op">+</span>':''}<span class="src ${x.c||''}" style="--sc:${x.col||'#d9b46a'}"><b>${x.t}</b>${x.who?`<i>${x.who}</i>`:''}</span>`).join('')+`<span class="src-op">=</span><span class="src-tot">${tot}個</span>`}
function srcStyles(src){const st=[];(src||[]).forEach(x=>{for(let k=0;k<x.n;k++)st.push(x.c==='ability'?{tint:x.col}:x.c==='weak'?{tint:'#ee3a54'}:{})});return st}
function cardFx(ch,kind){const c=document.getElementById('card-'+ch.id)||document.getElementById('chip-'+ch.id);if(!c||!c.animate)return;c.animate(kind==='hurt'?[{transform:'translateX(-8px)',boxShadow:'0 0 0 2px #ff4a62'},{transform:'translateX(6px)'},{transform:'none',boxShadow:'none'}]:[{boxShadow:'0 0 0 2px #f4dc9f, 0 0 40px #f4dc9f'},{boxShadow:'none'}],{duration:700})}
