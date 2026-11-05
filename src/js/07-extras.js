/* =====================================================================
   拡張：段取り・切り札・連携技・お宝・逃走
   ===================================================================== */
const STATN2={bat:'突破',scn:'潜入',hck:'技術',move:'移動'};
function planFly(n){const tg=$('#pnum');if(!tg||window.__FAST)return;const r=tg.getBoundingClientRect();const el=document.createElement('div');el.className='pfly';el.innerHTML=`<b>◆</b> 段取り +${n}`;document.body.appendChild(el);
  const x0=innerWidth/2,y0=innerHeight*.42;el.style.left=x0+'px';el.style.top=y0+'px';
  el.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-50%) scale(1.25)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.55},{transform:`translate(${r.left+r.width/2-x0}px,${r.top+r.height/2-y0}px) translate(-50%,-50%) scale(.4)`,opacity:.2}],{duration:1500*TEMPO,easing:'cubic-bezier(.5,0,.3,1)'}).onfinish=()=>el.remove()}
function gainPlan(n,by,why=''){const b=S.plan;S.plan=Math.min(PLAN_MAX,S.plan+n);const got=S.plan-b;if(!got)return;planFly(got);if(by)by.st.plan+=got;renderTop();SFX.kaching();
  const el=$('#pnum');if(el&&el.animate)el.animate([{transform:'scale(1.6)',color:'#fff'},{transform:'none'}],{duration:600});log(`<span class="y">段取り +${got}${why?`（${why}）`:''}　→ ${S.plan}</span>`)}
function spendPlan(n){S.plan=Math.max(0,S.plan-n);renderTop()}
// セリフの吹き出し（CPUの一言・切り札など）
function say(ch,text){return;const box=$('#says');if(!box)return;const el=document.createElement('div');el.className='say';el.style.setProperty('--c',ch.css);
  el.innerHTML=`<img src="${AV[ch.id]||''}" alt=""><span><b>${esc(ch.name)}</b>${esc(text)}</span>`;box.appendChild(el);while(box.children.length>2)box.firstChild.remove();
  setTimeout(()=>el.classList.add('out'),3000*TEMPO);setTimeout(()=>el.remove(),3600*TEMPO);log(`<span style="color:${ch.css}">「${esc(text)}」— ${esc(ch.name)}</span>`)}
// 切り札・連携技のカットイン（職業色の斜めの帯にアバター）
function cutin(chs,kicker,title,text,color){return new Promise(res=>{const el=$('#cutin');const c0=color||chs[0].css;el.style.setProperty('--c',c0);el.style.setProperty('--c2',(chs[1]||chs[0]).css);
  el.innerHTML=`<div class="ci-band"></div><div class="ci-in">${chs.map(c=>`<img src="${AV[c.id]||''}" alt="">`).join('')}<div class="ci-t"><span>${kicker}</span><b>${title}</b><em>${text}</em></div></div>`;
  el.classList.remove('go');void el.offsetWidth;el.classList.add('go');SFX.swell();setTimeout(()=>SFX.crit(),260);
  chs.forEach(c=>{const P=pieces[c.id];if(P&&P.g.visible)burst(P.g.position.clone().add(new THREE.Vector3(0,.8,0)),c.col,70,3.4,.45,1.3,2.8)});
  fxRays(c0,2);setTimeout(res,1900*TEMPO*SPEED)})}

/* ---------- 切り札 ---------- */
function freeAdj(c){return nbrs(c.r,c.c).filter(([r,cc])=>terr(r,cc)!=='N'&&(!occupied(r,cc,null)||'BS'.includes(terr(r,cc))))}
function warpTargets(ch){const out=[];const seen={[key(ch.r,ch.c)]:0};const q=[[ch.r,ch.c]];
  while(q.length){const [r,c]=q.shift();const d=seen[key(r,c)];if(d>=3)continue;nbrs(r,c).forEach(([a,b])=>{const k=key(a,b);if(seen[k]!=null||terr(a,b)==='N')return;seen[k]=d+1;q.push([a,b]);if(!occupied(a,b,ch)||'BS'.includes(terr(a,b)))out.push([a,b])})}return out}
function trumpOK(c,ctx){const T=TRUMP[c.id];if(!T||c.dead||S.plan<T.cost)return false;
  if(ctx==='turn'&&!['turn'].includes(T.when))return false;if(ctx==='roll'&&!['turn','roll'].includes(T.when))return false;if(ctx==='final'&&T.when!=='final'&&c.id!=='hacker')return false;if(ctx==='final'&&c.id==='hacker')return true;
  if(c.id==='hacker')return S.gauge>1;
  if(c.id==='informant')return S.quests.some(q=>!q.done&&(!q.revealed||q.q.diff-q.progress>1));
  if(c.id==='driver')return freeAdj(c).length>0&&S.chars.some(o=>o!==c&&!o.dead&&hexDist(o.r,o.c,c.r,c.c)>1);
  if(c.id==='phantom')return S.noticeRound!==S.round;
  if(c.id==='cracker')return !S.crackerBonus;
  if(c.id==='disguise')return S.step==='roll'&&warpTargets(c).length>0;
  return true}
async function useTrump(c,opt={}){const T=TRUMP[c.id];spendPlan(T.cost);S.trumps=(S.trumps||0)+1;
  S.abil=S.abil||{};const a=S.abil[c.id]||(S.abil[c.id]={n:0,sum:0,u:'切り札'});a.n++;
  log(`<span style="color:${c.css}">✦ ${esc(c.name)}の切り札「${T.name}」（段取り−${T.cost}）</span>`);
  await cutin([c],`切り札　段取り −${T.cost}`,T.name,T.text);
  if(c.id==='phantom'){S.noticeRound=S.round;say(c,'今夜の主役は私たちだ。予告状を出しておいた')}
  if(c.id==='hacker'&&S.phase==='final'){S.eta+=2;renderVhud();say(c,'警備会社の無線に偽の通報を流した。時間を稼ぐ');log(`<span class="g">警備隊の到着が2手番遅れた（あと${S.eta}）</span>`)}
  else if(c.id==='hacker'){const b=S.gauge;S.gauge=Math.max(1,S.gauge-2);renderTop(true);await moveTrackToken();say(c,'カメラ、ループ映像に差し替えた');log(`<span class="g">警戒レベル ${b} → ${S.gauge}</span>`)}
  if(c.id==='cracker'){S.crackerBonus=2;say(c,'……聴こえた。次のダイヤルは任せろ')}
  if(c.id==='informant'){let qi=opt.qi;if(qi==null){const cand=S.quests.map((q,i)=>({q,i})).filter(x=>!x.q.done&&(!x.q.revealed||x.q.q.diff-x.q.progress>1));
      if(!c.cpu&&cand.length>1)qi=await askModal(c,`<h3>裏ルート：どの標的？</h3><p>公開して、必要成功数を1減らします。</p>`,cand.map(x=>({label:x.q.revealed?x.q.q.name:`伏せた標的 0${x.i+1}`,sub:x.q.revealed?`必要 ${x.q.q.diff-x.q.progress} → ${x.q.q.diff-x.q.progress-1}`:'めくって公開',v:x.i})));
      else{cand.sort((a,b)=>(a.q.revealed-b.q.revealed)||hexDist(c.r,c.c,a.q.r,a.q.c)-hexDist(c.r,c.c,b.q.r,b.q.c));qi=cand[0].i}}
    const q=S.quests[qi];if(!q.revealed){q.revealed=true;drawHolo(qi);await flipCard(qi,true);SFX.reveal()}q.q.diff=Math.max(1,q.q.diff-1);drawHolo(qi);burst(cardWorld(qi),0x7ea6ff,60,3,.4,1.3);
    say(c,`「${q.q.name}」の裏口を掴んだ`);log(`<span class="y">裏ルート：「${q.q.name}」必要成功数−1</span>`)}
  if(c.id==='driver'){let mate=opt.mate;const cand=S.chars.filter(o=>o!==c&&!o.dead&&hexDist(o.r,o.c,c.r,c.c)>1);
    if(!mate){if(!c.cpu&&cand.length>1){const v=await askModal(c,`<h3>逃走車待機：誰を呼ぶ？</h3><p>選んだ仲間を自分の隣のマスへ運びます。</p>`,cand.map((o,i)=>({label:`${esc(o.name)}`,v:i})));mate=cand[v]}else mate=cand[0]}
    const spots=opt.spot?[opt.spot]:freeAdj(c);const [r,cc]=spots.sort((a,b)=>('BS'.includes(terr(b[0],b[1]))?1:0)-('BS'.includes(terr(a[0],a[1]))?1:0))[0];mate.r=r;mate.c=cc;await placePiece(mate);reflowAll();say(c,`${mate.name}、乗れ！`)}
  if(c.id==='disguise'){S.step='warp';say(c,'制服ならいくらでもある')}
  renderAll()}
async function warpTo(ch,r,c){ch.r=r;ch.c=c;await placePiece(ch);reflowAll();focusOn(ch);S.step='action';S.boost=0;renderAll()}
function cmdTrump(c){SFX.click();guard(async()=>{await useTrump(c)})}
// 身代わり（用心棒）：hurt の手前で呼ぶ。肩代わりするなら用心棒を返す
async function bodyguard(target,amt){const bo=S.chars.find(o=>o.id==='bouncer'&&!o.dead);if(!bo||bo===target||S.plan<TRUMP.bouncer.cost||amt<2||bo.life<=amt)return null;
  let use;if(bo.cpu)use=amt>=target.life||(S.phase!=='adventure'&&amt>=2);
  else use=await askModal(bo,`<h3 style="color:${bo.css}">割り込み：身代わり</h3><p>${nm(target)}が <b>${amt}ダメージ</b> を受けます（スタミナ${target.life}）。<br>段取りを${TRUMP.bouncer.cost}払って、${nm(bo)}（スタミナ${bo.life}）が代わりに受けますか？</p>`,[{label:'身代わりになる',sub:`段取り ${S.plan} → ${S.plan-TRUMP.bouncer.cost}`,v:true},{label:'見送る',v:false,cls:'ghost'}]);
  if(!use)return null;spendPlan(TRUMP.bouncer.cost);S.abil=S.abil||{};const a=S.abil.bouncer||(S.abil.bouncer={n:0,sum:0,u:'切り札'});a.n++;
  await cutin([bo],'切り札　割り込み','身代わり',`${target.name}の盾になる`);say(bo,`下がってろ、${target.name}`);return bo}
// すり替え（スリ師）：判定で出た1の目を振り直すか
async function pickSwap(roller){const pp=S.chars.find(o=>o.id==='pickpocket'&&!o.dead);if(!pp||S.plan<TRUMP.pickpocket.cost)return false;
  const important=S.phase!=='adventure'||DICE.need!=null;if(pp.cpu)return important&&S.plan>=3;
  return await askModal(pp,`<h3 style="color:${pp.css}">割り込み：すり替え</h3><p>1の目（ファンブル）が出ました。段取りを${TRUMP.pickpocket.cost}払って、${nm(pp)}が1つ振り直しますか？</p>`,[{label:'すり替える',sub:`段取り ${S.plan} → ${S.plan-TRUMP.pickpocket.cost}`,v:true},{label:'見送る',v:false,cls:'ghost'}])}

/* ---------- 連携技 ---------- */
function partnerOf(cb,ch){const pid=cb.a===ch.id?cb.b:cb.b===ch.id?cb.a:null;return pid?S.chars.find(o=>o.id===pid&&!o.dead):null}
function lootNear(ch,d=3){return S.loot.filter(L=>!L.taken&&hexDist(ch.r,ch.c,L.r,L.c)<=d).sort((a,b)=>b.val-a.val||hexDist(ch.r,ch.c,a.r,a.c)-hexDist(ch.r,ch.c,b.r,b.c))}
function combosFor(ch){return COMBOS.filter(cb=>!S.combos[cb.id]).map(cb=>{const p=partnerOf(cb,ch);if(!p||hexDist(ch.r,ch.c,p.r,p.c)>1)return null;
  if(cb.id==='leak'&&!S.quests.some(q=>!q.revealed))return null;if(cb.id==='keys'&&!lootNear(ch).length)return null;if(cb.id==='shadow'&&S.gauge<=1&&0)return null;return{cb,p}}).filter(Boolean)}
function comboReady(ch){return COMBOS.filter(cb=>!S.combos[cb.id]).map(cb=>{const p=partnerOf(cb,ch);return p?{cb,p,near:hexDist(ch.r,ch.c,p.r,p.c)<=1,d:hexDist(ch.r,ch.c,p.r,p.c)}:null}).filter(Boolean)}
async function doCombo(ch,id){const cb=COMBOS.find(x=>x.id===id),p=partnerOf(cb,ch);S.combos[id]=true;ch.st.combo++;p.st.combo++;
  log(`<span class="y">⚡ 連携技「${cb.name}」 ${nm(ch)} × ${nm(p)}</span>`);celebrate(2);await cutin([ch,p],'連携技　COMBO',cb.name,cb.text);
  if(id==='scan'){S.bonus.scan=true;say(p,'金庫の型番、割れたよ。本番は任せて')}
  if(id==='force'){ch.buff.noF=p.buff.noF=true;say(p,'力ずくで開ける。小細工は要らない')}
  if(id==='leak'){for(const [i,q] of S.quests.entries()){if(!q.revealed){q.revealed=true;drawHolo(i);await flipCard(i,true);SFX.reveal();burst(cardWorld(i),0x52d4c6,50,3,.4,1.2)}}gainPlan(2,ch,'データ流出');say(p,'警備会社のサーバー、全部抜いた')}
  if(id==='keys'){const L=lootNear(ch)[0];if(L){await takeLoot(ch,L,true)}gainPlan(1,ch,'鍵束の拝借');say(p,'合鍵ならここに')}
  if(id==='shadow'){const b=S.gauge;S.gauge=Math.max(1,S.gauge-1);if(b!==S.gauge){renderTop(true);await moveTrackToken()}ch.buff.dice+=1;p.buff.dice+=1;say(ch,'影が二つ。誰も気づかない')}
  if(id==='notice'){for(const c of [ch,p]){c.bag.push({t:'n',name:'予告状の品',val:1,wt:0});burst(pieceWorld(c),0xf4dc9f,50,3,.4,1.2)}SFX.kaching();say(ch,'予告どおり、頂いていく')}
  if(id==='rush'){ch.buff.dice+=2;p.buff.dice+=2;say(p,'道は俺が開ける')}
  if(id==='slip'){ch.buff.slip=p.buff.slip=true;say(ch,'逃げ道はもう用意してある')}
  renderAll()}
// 「次の判定」に乗るバフをまとめて消費する
function takeBuff(chs){let dice=0,noF=false;const src=[];chs.forEach(c=>{if(c.buff.dice){dice+=c.buff.dice;src.push({t:`連携+${c.buff.dice}`,who:c.name,n:c.buff.dice,c:'ability',col:'#f4dc9f'});c.buff.dice=0}if(c.buff.noF){noF=true;c.buff.noF=false}});return{dice,noF,src}}

/* ---------- お宝 ---------- */
const LOOTM={};
function gemMesh(L){const T=LOOT_T[L.t]||LOOT_T.s;const g=new THREE.Group();
  const geo=L.t==='x'?new THREE.OctahedronGeometry(.24,0):L.t==='m'?new THREE.DodecahedronGeometry(.17,0):new THREE.IcosahedronGeometry(.12,0);
  const gem=mk(geo,new THREE.MeshStandardMaterial({color:T.col,emissive:T.col,emissiveIntensity:.55,metalness:.3,roughness:.15}),0,.55,0);g.add(gem);
  const ring=mk(new THREE.RingGeometry(.28,.34,32),new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:.6,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}),0,.03,0,-Math.PI/2);g.add(ring);
  g.add(mk(new THREE.CylinderGeometry(.16,.2,.08,6),M(0x14100a,0,0,{m:.7,r:.3}),0,.04,0));
  if(L.t!=='s'){const pl=new THREE.PointLight(T.col,L.t==='x'?.8:.4,2.2);pl.position.y=.7;g.add(pl)}
  g.userData={gem,ring};return g}
function buildLoot(){Object.values(LOOTM).forEach(g=>world.remove(g));S.loot.forEach(L=>{const T=tiles[key(L.r,L.c)];const g=gemMesh(L);g.position.set(T.p.x+.42,T.top,T.p.z-.25);world.add(g);LOOTM[L.id]=g})}
anims.push(t=>{Object.entries(LOOTM).forEach(([id,g])=>{if(!g.visible)return;const u=g.userData;u.gem.rotation.y=t*1.4+ +id;u.gem.position.y=.55+Math.sin(t*2.2+ +id)*.06;u.ring.material.opacity=.35+Math.sin(t*3+ +id)*.2})});
function lootHere(ch){return S.loot.find(L=>!L.taken&&L.r===ch.r&&L.c===ch.c)}
async function takeLoot(ch,L,free=false){L.taken=true;const T=LOOT_T[L.t];ch.bag.push({t:L.t,name:L.name,val:L.val,wt:L.wt});if(S.gauge>=12)ch.st.bold=true;
  const g=LOOTM[L.id];if(g){const f=g.position.clone(),to=pieceWorld(ch);await tween(520,k=>{g.position.lerpVectors(f,to,k);g.position.y+=Math.sin(k*Math.PI)*1.2;g.scale.setScalar(1-k*.7)});g.visible=false}
  SFX.kaching();burst(pieceWorld(ch),T.col,L.t==='x'?140:70,L.t==='x'?5:3,.45,1.4,3);coinShower(pieceWorld(ch),L.val*12,4);if(L.t==='x'){celebrate(3);flash('rgba(255,231,160,.5)')}else celebrate(L.t==='m'?2:1);
  log(`<span class="y">💎 ${esc(ch.name)}が「${esc(L.name)}」を手に入れた（価値${L.val}・重さ${L.wt}）</span>`);renderSquad();
  if(ch.cpu)say(ch,L.t==='x'?'……これが「オーロラの涙」か':pick(['ついでに頂いておく','いい拾い物だ','ポケットに入れておこう']));
  await dealCard({kicker:`LOOT ${T.name}　お宝`,icon:'coin',title:L.name,text:`持ち帰れば名誉点 ${L.val}\n重さ ${L.wt}（4以上で移動ダイス−1）`,meta:'換金・買収・仲間に渡すこともできる',color:T.css})}
async function lootAction(ch,L,boost){const b=spendBoost(ch,boost);const bf=takeBuff([ch]);const n=ch.scn+b+bf.dice;
  const src=[{t:`潜入${ch.scn}`,who:ch.name,n:ch.scn,c:ch.scn<=1?'weak':'',col:ch.css},...bf.src];if(b)src.push({t:`${ch.res.name}+${b}`,n:b,c:'boost'});
  if(ch.scn<=1){abilityFire(ch,`潜入${ch.scn}でお宝を狙う（警報を鳴らしやすい）`,{weak:true});await wait(400)}
  const s=await peakRoll(n,{purpose:'お宝を盗む判定',title:L.name,sub:`潜入で判定。<b>成功数${L.diff}以上なら静かに盗める</b>。足りなくてもお宝は手に入るが、<b style="color:#ff8a9a">警戒レベル+1</b>`,need:L.diff,src,noFumble:bf.noF,
    table:[{k:L.diff+'+',t:'静かに盗み出す',c:'g',test:s=>s>=L.diff},{k:'それ未満',t:'手に入るが、警報が鳴る（警戒+1）',c:'r',test:s=>s<L.diff}],
    explain:s=>s>=L.diff?{kind:'good',level:L.t==='x'?3:2,stamp:'STOLEN',head:'静かに盗み出した',text:L.name}:{kind:'bad',level:1,stamp:'ALARM',head:'盗んだ……が、警報が鳴った',text:'警戒レベル+1'}});
  await takeLoot(ch,L);
  if(s<L.diff){log(`<span class="r">お宝の警報：警戒+1（${esc(ch.name)}の欲のせい）</span>`);if(ch.cpu)say(ch,'……すまん、鳴らした');const fin=await raiseGauge(1);if(fin)return}}
// 持ち物：換金・買収・渡す（手番中いつでも、行動を使わない）
async function modal2(html,choices,wide=false){const i=await modal2I(html,choices,wide);return choices[i]}
function modal2I(html,choices,wide=false){return new Promise(res=>{const m=$('#modal');const box=m.querySelector('.box');box.classList.toggle('wide',wide);modalFrame(m,box,html,'');m.classList.add('show');
  m.querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>{SFX.click();m.classList.remove('show');MODAL_CLOSE=null;res(+el.dataset.i)})})}
async function bagMenu(ch){while(true){if(!ch.bag.length)return;const mates=S.chars.filter(o=>o!==ch&&!o.dead&&hexDist(o.r,o.c,ch.r,ch.c)<=1);
  const ch_=[];const add=v=>{ch_.push(v);return ch_.length-1};
  const rows=ch.bag.map((x,i)=>`<div class="bagrow"><div class="bn"><b>${esc(x.name)}</b><small>価値${x.val}・重さ${x.wt}</small></div><div class="bb">
    <button class="mini" data-i="${add({k:'cash',i})}" title="段取り+${x.val}（名誉点−${x.val}）">換金 <em>段取り+${x.val}</em></button>
    ${S.gauge>1?`<button class="mini" data-i="${add({k:'bribe',i})}" title="警戒レベル−${Math.min(2,x.val)}（名誉点−${x.val}）">買収 <em>警戒−${Math.min(2,x.val)}</em></button>`:''}
    ${mates.map(m=>`<button class="mini" style="--c:${m.css}" data-i="${add({k:'give',i,m:S.chars.indexOf(m)})}">${esc(m.name)}に渡す</button>`).join('')}</div></div>`).join('');
  const v=await askModal2(ch,`<h3>${esc(ch.name)}の持ち物</h3><p>重さ <b>${wtOf(ch)}</b>${wtOf(ch)>=4?'（移動ダイス−1）':''}　名誉点 <b>${valOf(ch)}</b>。使ったお宝は消え、名誉点も消えます。${mates.length?'':'<br><span style="color:var(--mute)">渡せる仲間が隣にいません</span>'}</p>${rows}<div><button class="btn ghost" data-i="${add(null)}">閉じる</button></div>`,ch_,true);
  if(!v)return;await bagAct(ch,v)}}
async function bagAct(ch,v){const x=ch.bag[v.i];if(!x)return;
  if(v.k==='cash'){ch.bag.splice(v.i,1);gainPlan(x.val,ch,`${x.name}を換金`);burst(pieceWorld(ch),0xf4dc9f,40,2.5,.35,1)}
  if(v.k==='bribe'){ch.bag.splice(v.i,1);ch.st.bribe++;const b=S.gauge;S.gauge=Math.max(1,S.gauge-Math.min(2,x.val));renderTop(true);await moveTrackToken();log(`<span class="g">${esc(ch.name)}が${esc(x.name)}で買収：警戒レベル ${b} → ${S.gauge}</span>`);SFX.heal()}
  if(v.k==='give'){const m=S.chars[v.m];ch.bag.splice(v.i,1);m.bag.push(x);ch.st.give++;log(`<span class="y">${esc(ch.name)}が${esc(x.name)}を${esc(m.name)}に渡した</span>`);SFX.deal();
    const f=pieceWorld(ch),t=pieceWorld(m);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex,color:0xf4dc9f,transparent:true,blending:THREE.AdditiveBlending}));s.scale.setScalar(.6);scene.add(s);await tween(500,k=>{s.position.lerpVectors(f,t,k);s.position.y+=Math.sin(k*Math.PI)})
    ;scene.remove(s)}
  renderAll()}
function loseBag(c){if(!c.bag.length)return;c.st.lost+=c.bag.reduce((a,x)=>a+x.val,0);c.lostBag=(c.lostBag||[]).concat(c.bag);c.bag=[]}

/* ---------- 逃走 ---------- */
function escNeed(c,cp){return cp.base+Math.floor(wtOf(c)/2)}
function escDice(c,cp){return c[cp.stat]+2+S.escBonus}
function escOdds(c){const q=ESC_CP.map(cp=>odds(escDice(c,cp),escNeed(c,cp)));const f=c.escFail||0;
  // 2回失敗で逮捕：残り関門で（2−f）回以上失敗しない確率
  let dist=[1];q.slice(c.escAt||0).forEach(s=>{const nd=Array(dist.length+1).fill(0);dist.forEach((v,k)=>{nd[k]+=v*s;nd[k+1]+=v*(1-s)});dist=nd});return dist.slice(0,Math.max(0,2-f)).reduce((a,b)=>a+b,0)}
async function dropMenu(c,when){if(!c.bag.length||c.dead)return;
  if(c.cpu){const keepContract=c.contract==='gem'||c.contract==='art';let changed=false;
    while(c.bag.length&&escOdds(c)<(when==='fail'?.6:.45)){const order=c.bag.map((x,i)=>({x,i})).filter(o=>o.x.wt>0&&!(keepContract&&o.x.val>=2)).sort((a,b)=>a.x.val/a.x.wt-b.x.val/b.x.wt);if(!order.length)break;const o=order[0];c.bag.splice(o.i,1);c.st.drop+=o.x.val;changed=true;log(`<span class="r">${esc(c.name)}は${esc(o.x.name)}を投げ捨てた</span>`)}
    if(changed){say(c,'欲張りすぎた。少し置いていく');SFX.zero();renderSquad()}return}
  while(c.bag.some(x=>x.wt>0)){const p=escOdds(c);const opts=c.bag.map((x,i)=>({x,i})).filter(o=>o.x.wt>0).map(o=>({label:`${o.x.name}を捨てる`,sub:`重さ−${o.x.wt}・名誉点−${o.x.val}`,v:o.i}));
    const v=await askModal(c,`<h3 style="color:${c.css}">${esc(c.name)}：荷物はこのままでいい？</h3><p>重さ <b>${wtOf(c)}</b>　持ち帰れば名誉点 <b>${valOf(c)}</b><br>このまま逃げ切れる確率 <b style="font-size:1.3em;color:${p>=.7?'#8cf0be':p>=.45?'#f4dc9f':'#ff8a9a'}">約${pct(p)}</b>${when==='fail'?'<br><span style="color:#ff8a9a">あと1回失敗すると逮捕され、お宝は全部没収</span>':''}</p>`,
      [{label:'このまま行く',v:-1,cls:'big'},...opts],true);
    if(v<0)return;const x=c.bag.splice(v,1)[0];c.st.drop+=x.val;SFX.zero();log(`<span class="r">${esc(c.name)}は${esc(x.name)}を投げ捨てた</span>`);renderSquad()}}
/* 逃走：街の端からアジトまでの逃走ルートを盤上に引き、3つの関門をコマが駆け抜ける */
const ESC={path:[],cps:[],objs:[],car:null};
const ESC_FX=[
 {desc:'赤外線レーザーの隙間をくぐり抜ける',ok:'レーザーをすり抜けた',ng:'レーザーに触れた！警報が鳴る',ico:'laser'},
 {desc:'サーチライトをかわして路地を駆け抜ける',ok:'ライトをかわして闇に消えた',ng:'サーチライトに照らされた！',ico:'light'},
 {desc:'パトカーのバリケードを突破する',ok:'バリケードを飛び越えた',ng:'警官ともみ合いになった！',ico:'block'}];
function escRoute(){const base=findTile('B');const dist=bfsFrom([base]);const cands=[];
  MAP.forEach((row,r)=>[...row].forEach((t,c)=>{const d=dist[key(r,c)];if(t!=='N'&&d!=null&&d>=6&&d<=8)cands.push([r,c,d])}));
  cands.sort((a,b)=>b[0]-a[0]||b[2]-a[2]);const st=cands[0]||[base[0],base[1],0];const path=[[st[0],st[1]]];let cur=[st[0],st[1]];
  for(let g=0;g<20&&dist[key(cur[0],cur[1])]>0;g++){const d0=dist[key(cur[0],cur[1])];const nx=nbrs(cur[0],cur[1]).filter(([a,b])=>terr(a,b)!=='N'&&dist[key(a,b)]===d0-1).sort((a,b)=>(terr(a[0],a[1])==='R'?-1:0)-(terr(b[0],b[1])==='R'?-1:0))[0];if(!nx)break;path.push(nx);cur=nx}
  return path}
function escPos(idx,slot,n){const [r,c]=ESC.path[Math.max(0,Math.min(ESC.path.length-1,idx))];const T=tiles[key(r,c)];let x=T.p.x,z=T.p.z;if(n>1){const a=slot/n*Math.PI*2+.4;x+=Math.cos(a)*.4;z+=Math.sin(a)*.4}return new THREE.Vector3(x,T.top,z)}
function makeCar(){const g=new THREE.Group();
  g.add(mk(new THREE.BoxGeometry(.3,.1,.58),M(0xf2ece0,0,0,{r:.25,m:.4}),0,.09,0));g.add(mk(new THREE.BoxGeometry(.31,.05,.6),M(0x101014,0,0,{r:.3,m:.5}),0,.04,0));
  g.add(mk(new THREE.BoxGeometry(.25,.09,.28),M(0x14141c,0,0,{r:.15,m:.7}),0,.18,-.03));
  const red=mk(new THREE.BoxGeometry(.09,.035,.05),G(0xff2040),-.055,.24,-.03),blue=mk(new THREE.BoxGeometry(.09,.035,.05),G(0x3a70ff),.055,.24,-.03);g.add(red);g.add(blue);
  const pl=new THREE.PointLight(0xff2040,1.1,2.6);pl.position.y=.6;g.add(pl);shadowize(g);
  anims.push(t=>{const on=Math.sin(t*14)>0;red.visible=on;blue.visible=!on;pl.color.setHex(on?0xff2040:0x3a70ff)});return g}
function gateMesh(k){const g=new THREE.Group();const post=x=>mk(new THREE.BoxGeometry(.07,.95,.07),M(0x1a1a22,0,0,{m:.8,r:.3}),x,.47,0);
  if(k===0){g.add(post(-.6));g.add(post(.6));const ls=[];for(let i=0;i<5;i++){const l=mk(new THREE.BoxGeometry(1.2,.014,.014),G(0xff2040),0,.14+i*.16,0,0,0,(i%2?.25:-.25));g.add(l);ls.push(l)}
    const pl=new THREE.PointLight(0xff2040,.9,2.4);pl.position.y=.5;g.add(pl);anims.push(t=>ls.forEach((l,i)=>{l.visible=Math.sin(t*3+i*1.7)>-.55}))}
  if(k===1){const pole=mk(new THREE.CylinderGeometry(.03,.04,1.5,8),M(0x18181e,0,0,{m:.8}),.62,.75,0);g.add(pole);
    const pv=new THREE.Group();pv.position.set(.62,1.5,0);g.add(pv);pv.add(mk(new THREE.CylinderGeometry(.09,.12,.18,12),M(0x202028,0,0,{m:.9}),0,0,0,0,0,Math.PI/2));
    const cone=mk(new THREE.ConeGeometry(.55,1.6,24,1,true),new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.2,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}),0,-.8,0);pv.add(cone);
    const sl=new THREE.SpotLight(0xfff2c0,1.6,4,.5,.6);sl.position.set(0,0,0);pv.add(sl);const tg=new THREE.Object3D();tg.position.set(0,-2,0);pv.add(tg);sl.target=tg;
    anims.push(t=>{pv.rotation.z=Math.sin(t*1.2)*.75+.2;pv.rotation.x=Math.cos(t*.8)*.35})}
  if(k===2){for(let i=-2;i<=2;i++)g.add(mk(new THREE.BoxGeometry(.24,.09,.06),M(i%2?0xee3a54:0xf2ece0,0,0,{r:.5}),i*.24,.32,0));g.add(post(-.62));g.add(post(.62));
    const c1=makeCar();c1.position.set(-.55,0,.35);c1.rotation.y=.9;g.add(c1);const c2=makeCar();c2.position.set(.55,0,.35);c2.rotation.y=-.9;g.add(c2)}
  return g}
function escClear(){ESC.objs.forEach(o=>world.remove(o));ESC.objs=[];clearHL()}
function escBuild(){escClear();ESC.path=escRoute();const L=ESC.path.length-1;ESC.cps=[Math.max(1,Math.round(L*.3)),Math.max(2,Math.round(L*.62)),Math.max(3,L-1)];
  ESC.path.forEach(([r,c],i)=>{if(i===0)return;const isCp=ESC.cps.includes(i);addHL(r,c,i===L?0x62e3a4:isCp?0xff6a80:0x52d4c6,i===L?'アジト':isCp?['裏口','路地裏','検問'][ESC.cps.indexOf(i)]:null)});
  ESC.cps.forEach((ci,k)=>{const [r,c]=ESC.path[ci],[pr,pc]=ESC.path[ci-1];const T=tiles[key(r,c)],P0=tiles[key(pr,pc)];const g=gateMesh(k);
    const mx=(T.p.x+P0.p.x)/2,mz=(T.p.z+P0.p.z)/2;g.position.set(mx,Math.max(T.top,P0.top),mz);g.rotation.y=Math.atan2(T.p.x-P0.p.x,T.p.z-P0.p.z)+Math.PI/2;world.add(g);ESC.objs.push(g)});
  const car=makeCar();const T0=tiles[key(...ESC.path[0])];car.position.set(T0.p.x,T0.top,T0.p.z);world.add(car);ESC.objs.push(car);ESC.car=car;car.visible=false}
function escFocus(idx){if(cam.free)return;const p=escPos(idx,0,1);cam.want.set(p.x*.85,0,p.z*.85+.6);cam.wantRad=innerWidth<700?18:14.5}
async function escRun(crew,toIdx){const live=crew.filter(c=>!c.caught&&!c.dead);await Promise.all(live.map((c,slot)=>new Promise(async res=>{const P=pieces[c.id];
    for(let i=(c.escIdx||0)+1;i<=toIdx;i++){const f=P.g.position.clone(),to=escPos(i,slot,live.length);P.fig.rotation.y=Math.atan2(to.x-f.x,to.z-f.z);
      await tween(300,k=>{P.g.position.lerpVectors(f,to,k);P.g.position.y+=Math.sin(k*Math.PI)*.5});if(slot===0)SFX.tok()}
    c.escIdx=Math.max(c.escIdx||0,toIdx);res()})));escFocus(toIdx)}
async function escChase(idx){const car=ESC.car;if(!car)return;car.visible=true;const to=escPos(Math.max(0,idx),0,1);const f=car.position.clone();car.rotation.y=Math.atan2(to.x-f.x,to.z-f.z);
  if(f.distanceTo(to)>.05){SFX.siren(1);await tween(700,k=>car.position.lerpVectors(f,to,k),easeInOut)}}
async function escAnim(c,k,res,live){const P=pieces[c.id];const slot=Math.max(0,live.indexOf(c));
  if(res==='pass'||res==='slip'){const to=escPos(ESC.cps[k],slot,live.length);const f=P.g.position.clone();SFX.whoosh();
    await tween(520,k2=>{P.g.position.lerpVectors(f,to,k2);P.g.position.y+=Math.sin(k2*Math.PI)*1.1;P.fig.rotation.y+=.2});burst(to.clone().add(new THREE.Vector3(0,.4,0)),res==='slip'?0xff7fd0:0x62e3a4,50,3,.4,1.1,2);SFX.good(3);c.escIdx=ESC.cps[k]}
  else if(res==='fail'){const p=P.g.position.clone();burst(p.clone().add(new THREE.Vector3(0,.6,0)),0xff4a62,60,3,.4,1.1,2);k===0?SFX.laser():SFX.alarm();shake(400,.35);
    await tween(420,k2=>{P.g.position.x=p.x+Math.sin(k2*Math.PI*8)*.06*(1-k2)})}
  else if(res==='arrest'){SFX.siren(2);const car=ESC.car;const p=P.g.position.clone();if(car){car.visible=true;const f=car.position.clone();const to=p.clone().add(new THREE.Vector3(.45,0,.3));car.rotation.y=Math.atan2(to.x-f.x,to.z-f.z);await tween(650,k2=>car.position.lerpVectors(f,to,k2),easeOut)}
    burst(p.clone().add(new THREE.Vector3(0,.6,0)),0x5b8cff,80,4,.45,1.3,2.5);await tween(500,k2=>{P.fig.rotation.z=k2*1.45});const tag=nameTag('逮捕','#ff4a62');tag.position.copy(p).add(new THREE.Vector3(0,1.1,0));world.add(tag);ESC.objs.push(tag)}}
function renderEhud(){const el=$('#ehud');if(!el)return;if(!S||S.phase!=='escape'||!ESC.path.length){el.hidden=true;return}el.hidden=false;
  const cols=['スタート','裏口','路地裏','検問','アジト'];const stage=c=>c.caught?-1:c.escHome?4:ESC.cps.filter(ci=>(c.escIdx||0)>=ci).length;
  const chip=c=>`<span class="ec ${c.caught?'out':''} ${S.chars.indexOf(c)===S.turn&&!c.caught?'now':''}" style="--c:${c.css}"><img src="${AV[c.id]||''}" alt=""><b>${esc(c.name)}</b><i class="st">${[0,1].map(k=>`<em class="${k<(c.escFail||0)?'x':''}"></em>`).join('')}</i>${wtOf(c)?`<small>重${wtOf(c)}</small>`:''}</span>`;
  const crew=S.chars.filter(c=>!c.dead||c.caught);
  el.innerHTML=`<div class="er">${cols.map((n,i)=>`<div class="en ${i===4?'home':''}"><em class="lab">${n}</em>${crew.filter(c=>stage(c)===i).map(chip).join('')}</div>`).join('<i class="ea"></i>')}</div>${crew.some(c=>c.caught)?`<div class="eout"><em class="lab">逮捕</em>${crew.filter(c=>c.caught).map(chip).join('')}</div>`:''}`}
async function escapePhase(){setCamFree(false);S.phase='escape';S.escBonus=0;clearHL();renderVhud();
  S.chars.forEach(c=>{if(c.dead){c.caught=true;c.st.down=true;loseBag(c)}});const crew=S.chars.filter(c=>!c.dead);if(!crew.length)return;
  // 金庫から街へ：金庫を沈め、コマを逃走ルートのスタートへ
  await tween(1300,k=>{VAULT.g.position.y=-14*k*k});VAULT.g.visible=false;holos.forEach(h=>{h.pivot.visible=false;h.beam.visible=false});escBuild();
  S.chars.forEach((c,i)=>{const P=pieces[c.id];P.fig.rotation.z=0;P.g.visible=!c.caught;c.escIdx=0;c.escFail=0;c.escHome=false});
  crew.forEach((c,slot)=>{pieces[c.id].g.position.copy(escPos(0,slot,crew.length))});escFocus(0);cam.phi=.95;
  music(TRACK_CHASE);SFX.siren(3);renderAll();renderEhud();
  await banner('ESCAPE　逃走','金庫は開いた。街を抜けてアジトへ戻れ',BC.teal,2800);
  log('<span class="y">― 逃走開始 ―　関門：裏口（潜入）／路地裏（移動）／検問（突破）。2回失敗で逮捕</span>');
  const dv=crew.find(c=>c.id==='driver');
  if(dv&&S.plan>=TRUMP.driver.cost){const use=dv.cpu?true:await askModal(dv,`<h3 style="color:${dv.css}">切り札：逃走車待機</h3><p>段取りを${TRUMP.driver.cost}払うと、逃走の判定で全員のダイスが+1されます。</p>`,[{label:'逃走車を回す',sub:`段取り ${S.plan} → ${S.plan-2}`,v:true},{label:'使わない',v:false,cls:'ghost'}]);
    if(use){spendPlan(TRUMP.driver.cost);S.escBonus=1;await cutin([dv],'切り札　段取り −2','逃走車待機','逃走の判定で全員のダイス+1');say(dv,'エンジンは温めてある。全員乗れ！')}}
  for(const c of crew)await dropMenu(c,'start');
  for(const [k,cp] of ESC_CP.entries()){
    await escRun(crew,ESC.cps[k]-1);renderEhud();escChase(ESC.cps[k]-3);
    await banner(`関門 ${k+1}／3　${cp.name}`,`${ESC_FX[k].desc}（${STATN2[cp.stat]}で判定）`,BC.blue,2000);
    const live=crew.filter(c=>!c.caught&&!c.dead);
    for(const c of live){if(c.caught||c.dead)continue;S.turn=S.chars.indexOf(c);c.escAt=k;renderAll();renderEhud();
      const need=escNeed(c,cp);const bf=takeBuff([c]);const base=c[cp.stat];const n=base+2+S.escBonus+bf.dice;
      const src=[{t:`${STATN2[cp.stat]}${base}`,who:c.name,n:base,col:c.css},{t:'全力疾走+2',n:2,c:'reward'},...bf.src];if(S.escBonus)src.push({t:'逃走車+1',who:'運び屋',n:1,c:'ability',col:'#ff5c74'});
      const w=wtOf(c);const last=(c.escFail||0)>=1;
      const s=await peakRoll(n,{purpose:`逃走　関門${k+1}　${cp.name}`,pc:'blue',title:`${c.name}`,sub:`${ESC_FX[k].desc}。<b>成功数${need}以上で通過</b>${w>=2?`（荷物の重さ${w}で必要+${Math.floor(w/2)}）`:''}。${last?'<b style="color:#ff8a9a">次に失敗したら逮捕</b>':'失敗するとスタミナ−1、2回失敗で逮捕'}`,need,src,noFumble:bf.noF,quick:true,
        table:[{k:need+'+',t:'通過',c:'g',test:s=>s>=need},{k:need>0?(need-1)+'以下':'−',t:last?'逮捕（お宝は没収）':'失敗：スタミナ−1',c:'r',test:s=>s<need}],
        explain:s=>s>=need?{kind:'good',level:1,stamp:'CLEAR',head:ESC_FX[k].ok,text:`${cp.name}を通過`}:c.buff.slip?{kind:'meh',stamp:'SLIP',head:'すり抜け！',text:'連携技で失敗を帳消し'}:{kind:'bad',level:last?2:1,stamp:last?'BUSTED':'SPOTTED',head:last?'逮捕……':ESC_FX[k].ng,text:last?'お宝は没収された':'スタミナ−1。あと1回失敗すると逮捕'}});
      if(s>=need){log(`<span class="g">${esc(c.name)}：${ESC_FX[k].ok}（${cp.name}通過）</span>`);await escAnim(c,k,'pass',live);renderEhud();if(Math.random()<.35)say(c,pick([['ここは俺の庭だ','レーザーの隙間なんて見え見えだ'],['影から影へ。誰にも見られてない','ライトの癖は読めてる'],['どけ！通らせてもらう','バリケードなんて飾りだ']][k]));continue}
      if(c.buff.slip){c.buff.slip=false;log(`<span class="y">${esc(c.name)}：すり抜け（連携技）で失敗を帳消し</span>`);await escAnim(c,k,'slip',live);renderEhud();continue}
      c.escFail=(c.escFail||0)+1;await escAnim(c,k,'fail',live);await hurt(c,1);
      if(c.escFail>=2||c.dead){c.caught=true;c.st.down=true;const lost=valOf(c);loseBag(c);log(`<span class="r">✖ ${esc(c.name)} 逮捕${lost?`（お宝${lost}点ぶん没収）`:''}</span>`);await escAnim(c,k,'arrest',live);renderEhud();disaster(2);await banner(`${esc(c.name)} 逮捕`,lost?`抱えていたお宝 ${lost}点ぶんが没収された`:'逃げ遅れた',BC.red,2200)}
      else{renderEhud();c.escAt=k+1;if(c.bag.length)await dropMenu(c,'fail');
        // 失敗しても関門は抜ける（スタミナを削って強行突破）
        await escAnim(c,k,'pass',live);renderEhud()}}}
  // アジトへ
  const home=crew.filter(c=>!c.caught&&!c.dead);if(home.length){await escRun(crew,ESC.path.length-1);home.forEach(c=>c.escHome=true);renderEhud();SFX.escape();celebrate(2);
    await banner('アジト到着',`${home.length}人が逃げ切った`,BC.green,2200)}
  // 保釈：逃げ切った団員が価値2以上のお宝で仲間を1人助けられる
  for(const c of S.chars.filter(x=>x.caught)){const helpers=S.chars.filter(o=>!o.caught&&!o.dead&&o.bag.some(x=>x.val>=2));for(const h of helpers){const items=h.bag.map((x,i)=>({x,i})).filter(o=>o.x.val>=2);
      let v;if(h.cpu)v=(h.contract==='gem'||h.contract==='art')?null:items.sort((a,b)=>a.x.val-b.x.val)[0];
      else{const r=await askModal(h,`<h3>保釈：${esc(c.name)}を助ける？</h3><p>${nm(h)}のお宝（価値2以上）を1つ手放すと、捕まった${nm(c)}が釈放されて逃げ切った扱いになります。</p>`,[...items.map(o=>({label:`${o.x.name}を差し出す`,sub:`名誉点−${o.x.val}`,v:o.i})),{label:'助けない',v:-1,cls:'ghost'}]);v=r>=0?{i:r}:null}
      if(v){const x=h.bag.splice(v.i,1)[0];c.caught=false;c.bailed=true;log(`<span class="g">${esc(h.name)}が${esc(x.name)}で${esc(c.name)}を保釈した</span>`);SFX.escape();celebrate(2);say(h,`${c.name}、迎えに来たぞ`);break}}}
  S.chars.forEach(c=>{c.escaped=!c.caught&&!c.dead||!!c.bailed});renderSquad();renderEhud()}
async function retreatPhase(){S.chars.forEach(c=>{if(c.dead){c.caught=true;c.st.down=true;loseBag(c)}});
  const crew=S.chars.filter(c=>!c.dead);crew.forEach(c=>{if(!c.bag.length)c.escaped=true});const rs=crew.filter(c=>c.bag.length);if(!rs.length)return;
  S.phase='escape';renderAll();await banner('撤収','お宝を抱えて裏口から逃げる',BC.blue,2200);
  for(const c of rs){S.turn=S.chars.indexOf(c);const need=Math.floor(wtOf(c)/2);const n=c.scn+2;
    const s=await peakRoll(n,{purpose:'撤収の判定',title:`${c.name}`,sub:`潜入で判定。<b>成功数${need}以上でお宝を持って逃げ切る</b>`,need,quick:true,src:[{t:`潜入${c.scn}`,who:c.name,n:c.scn,col:c.css},{t:'全力疾走+2',n:2,c:'reward'}],
      explain:s=>s>=need?{kind:'good',level:1,head:'撤収成功',text:'お宝は守った'}:{kind:'bad',level:1,head:'逮捕',text:'お宝は没収'}});
    if(s>=need)c.escaped=true;else{c.caught=true;c.st.down=true;loseBag(c)}}}

/* ---------- 表彰式 ---------- */
function rankOf(win){const home=S.chars.filter(c=>c.escaped);const tot=home.reduce((a,c)=>a+valOf(c),0);
  if(win){if(home.length===S.chars.length&&tot>=8)return{r:'S',t:'伝説の大怪盗団'};if(tot>=4)return{r:'A',t:'一流の怪盗団'};return{r:'B',t:'金庫破り成功'}}
  return tot>0?{r:'C',t:'計画は失敗、だが手ぶらではない'}:{r:'D',t:'完全なる失敗'}}
function honorOf(c){const ct=CONTRACTS.find(x=>x.id===c.contract);const okc=ct&&ct.chk(c);return{loot:c.escaped?valOf(c):0,ct,okc,pts:(c.escaped?valOf(c):0)+(okc?ct.pts:0)}}

/* ---------- 本番の緊迫感：警備到着タイマー・足止め・金庫HUD ---------- */
const ETA_PREP=8, ETA_FORCED=5, STALL_COST=3;
async function etaTick(){if(S.phase!=='final')return;
  if(S.eta>0){S.eta--;renderVhud();SFX.tick(S.eta<=3?20:8);const el=document.querySelector('#vhud .eta b');if(el&&el.animate)el.animate([{transform:'scale(1.5)',color:'#fff'},{transform:'none'}],{duration:500});
    TRACK_VAULT.bpm=S.eta<=3?172:148;
    if(S.eta===3){vignette('hit');SFX.alarm();await banner('残り3手番','警備隊のサイレンが近づいてくる――急げ',BC.red,1900)}
    else if(S.eta===0){vignette('hit');await banner('次の手番、警備隊が到着する','この手番がラストチャンス',BC.red,1900)}}
  else{if(!S.swat){S.swat=true;alarm();disaster(2);await banner('警備隊 到着','包囲された。毎手番のはじめに巡回が来る',BC.red,2400)}await patrol()}}
async function stall(ch){if(S.plan<STALL_COST)return;spendPlan(STALL_COST);S.eta+=1;renderVhud();SFX.heal();log(`<span class="g">${esc(ch.name)}：段取り${STALL_COST}で足止め。警備隊の到着が1手番遅れた（あと${S.eta}）</span>`);
  if(ch.cpu)say(ch,'仕込んでおいた渋滞が効いてる。もう少し粘れる');await banner('足止め','警備隊の到着 +1手番',BC.green,1400)}
function renderVhud(){const el=$('#vhud');if(!el)return;if(!S||S.phase!=='final'){el.hidden=true;return}el.hidden=false;
  const done=LOCKS-S.locks;let pips='';(S.vlocks||[]).forEach((L,li)=>{if(li>0){const a=li===1?ALARMS[0]:ALARMS[1];const hit=S.alarmsHit.includes(a);pips+=`<span class="pm ${hit?'hit':''}" title="ここで警備ドローンが巡回">巡回</span>`}
    const rem={};L.forEach(t=>rem[t]=(rem[t]||0)+1);vLayout()[li].forEach(t=>{const closed=rem[t]>0;if(closed)rem[t]--;pips+=`<i class="${closed?'':'on'} ${li===vStage()?'cur':''}" style="--lc:${LT[t].col}">${LT[t].short}</i>`})});
  const lv=S.eta<=0?'crit':S.eta<=3?'warn':'';
  el.innerHTML=`<div class="lk"><span>${vaultOf().name}<br><em>${VSTAGE[vStage()].name}・必要${vBase()}</em></span><div class="pips">${pips}</div><b>${done}<small>/${LOCKS}</small></b></div><div class="eta ${lv}"><span>${S.eta>0?'警備隊の到着まで':'警備隊'}</span><b>${S.eta>0?S.eta:'包囲'}</b><small>${S.eta>0?'手番':'毎手番 巡回'}</small></div>`}