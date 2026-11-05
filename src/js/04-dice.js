/* =====================================================================
   DICE — 黒漆に金の目のダイス。結果を先に決め、その目で着地させる
   ===================================================================== */
const DICE={on:false,r:new THREE.WebGLRenderer({canvas:$('#diceCanvas'),antialias:true,alpha:true}),scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(38,1,.1,100),dice:[],fast:false,phase:'idle',resolve:null,shownAt:0};
DICE.r.setPixelRatio(Math.min(devicePixelRatio,2));DICE.r.toneMapping=THREE.ACESFilmicToneMapping;DICE.r.shadowMap.enabled=true;DICE.r.shadowMap.type=THREE.PCFSoftShadowMap;
DICE.cam.position.set(0,15.5,9.6);DICE.cam.lookAt(0,0,.3);
DICE.scene.add(new THREE.HemisphereLight(0xd8d0ff,0x1a1408,.55));
const dl=new THREE.DirectionalLight(0xfff0d8,1.3);dl.position.set(-3,10,5);dl.castShadow=true;dl.shadow.mapSize.set(1024,1024);Object.assign(dl.shadow.camera,{left:-8,right:8,top:8,bottom:-8});DICE.scene.add(dl);
const dRim=new THREE.PointLight(0xd9b46a,1.2,20);dRim.position.set(5,3,-3);DICE.scene.add(dRim);
const feltTex=canvasTex(1024,1024,(g,w)=>{const gr=g.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);gr.addColorStop(0,'#0f3a2e');gr.addColorStop(1,'#061a14');g.fillStyle=gr;g.fillRect(0,0,w,w);
  for(let i=0;i<9000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.15})`;g.fillRect(Math.random()*w,Math.random()*w,2,2)}
  g.strokeStyle='rgba(217,180,106,.35)';g.lineWidth=3;g.beginPath();g.arc(w/2,w/2,w*.44,0,Math.PI*2);g.stroke();g.lineWidth=1.5;g.beginPath();g.arc(w/2,w/2,w*.42,0,Math.PI*2);g.stroke()});
const tray=new THREE.Mesh(new THREE.CircleGeometry(6.4,96),new THREE.MeshStandardMaterial({map:feltTex,roughness:.97}));tray.rotation.x=-Math.PI/2;tray.receiveShadow=true;DICE.scene.add(tray);
const trayRing=new THREE.Mesh(new THREE.TorusGeometry(6.45,.16,16,128),new THREE.MeshStandardMaterial({color:0x2a1a0e,metalness:.4,roughness:.35}));trayRing.rotation.x=Math.PI/2;DICE.scene.add(trayRing);
const trayGold=new THREE.Mesh(new THREE.TorusGeometry(6.28,.03,8,128),GOLD);trayGold.rotation.x=Math.PI/2;trayGold.position.y=.05;DICE.scene.add(trayGold);
const FACEV=[3,4,1,6,2,5];const FACEN=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const PIPS={1:[[.5,.5]],2:[[.28,.28],[.72,.72]],3:[[.28,.28],[.5,.5],[.72,.72]],4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],6:[[.28,.25],[.72,.25],[.28,.5],[.72,.5],[.28,.75],[.72,.75]]};
// 角を丸めたダイス形状
function roundedBox(s=1,r=.13,seg=6){const geo=new THREE.BoxGeometry(s,s,s,seg,seg,seg);const p=geo.attributes.position,v=new THREE.Vector3(),inner=new THREE.Vector3(),h=s/2-r;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);inner.set(Math.max(-h,Math.min(h,v.x)),Math.max(-h,Math.min(h,v.y)),Math.max(-h,Math.min(h,v.z)));v.sub(inner).normalize().multiplyScalar(r).add(inner);p.setXYZ(i,v.x,v.y,v.z)}
  geo.computeVertexNormals();return geo}
const dieGeo=roundedBox(1,.14,6);
// dark=黒漆＋金の目／gold=振り足し用の金のダイス／tint=団員色の縁
function faceTex(v,style,tint){return canvasTex(256,256,(g,w)=>{
  const bg=style==='gold'?['#f4dc9f','#c9a052']:['#1c1c24','#0b0b10'];const gr=g.createLinearGradient(0,0,w,w);gr.addColorStop(0,bg[0]);gr.addColorStop(1,bg[1]);g.fillStyle=gr;g.fillRect(0,0,w,w);
  if(tint){g.strokeStyle=tint;g.lineWidth=14;g.strokeRect(14,14,w-28,w-28)}
  const pc=style==='gold'?(v===1?'#8a0e22':'#1b1206'):(v===1?'#ee3a54':v===6?'#f4dc9f':'#d9b46a');
  PIPS[v].forEach(([x,y])=>{const R=v===1?30:21;
    if(style==='gold'){g.fillStyle=pc}else{const pg=g.createRadialGradient(x*w-R*.3,y*w-R*.3,R*.1,x*w,y*w,R);pg.addColorStop(0,'#fff8e0');pg.addColorStop(.35,pc);pg.addColorStop(1,pc);g.fillStyle=pg}
    g.beginPath();g.arc(x*w,y*w,R,0,Math.PI*2);g.fill();g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;g.stroke()})})}
const dieMatCache={};
function dieMats(style='dark',tint=null){const k=style+(tint||'');if(!dieMatCache[k])dieMatCache[k]=FACEV.map(v=>new THREE.MeshStandardMaterial({map:faceTex(v,style,tint),roughness:style==='gold'?.25:.18,metalness:style==='gold'?.7:.25}));return dieMatCache[k].map(m=>m.clone())}
function finalQuat(v){const n=new THREE.Vector3(...FACEN[FACEV.indexOf(v)]);const q=new THREE.Quaternion().setFromUnitVectors(n,new THREE.Vector3(0,1,0));return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(Math.random()-.5)*.6).multiply(q)}
function diceFrame(dt,t){DICE.dice.forEach(d=>{if(d.halo){d.halo.material.opacity=.55+Math.sin(t*7)*.3;d.halo.rotation.z+=dt*1.5}if(d.glowL)d.glowL.intensity=1.6+Math.sin(t*8)*.4});DICE.r.render(DICE.scene,DICE.cam)}
function diceClear(){const ds=$('#diceSrc');if(ds)ds.innerHTML='';DICE.dice.forEach(d=>{DICE.scene.remove(d.m);if(d.halo)DICE.scene.remove(d.halo);if(d.glowL)DICE.scene.remove(d.glowL)});DICE.dice=[];$('#pops').innerHTML='';$('#diceTally').innerHTML='';$('#diceBreak').innerHTML='';
  const r=$('#diceResult');r.className='';r.innerHTML='';$('#diceNext').classList.remove('show')}
// ダイス画面：目的（何のための判定か）／出目の見方（左）／結果表（右、いまの値の行が光る）／出目の内訳／結果カード
const md=(v,c='')=>`<span class="md ${c}">${v}</span>`;
function legendHTML(rows,title='出目の見方',extra=''){return`<div class="pt">${title}</div>`+rows.map(r=>`<div class="lg">${r.f.map(v=>md(v,r.c||'')).join('')}<span>${r.t}</span></div>`).join('')+extra}
function peakLegend(noF){return legendHTML([{f:[1],c:noF?'z':'r',t:noF?'±0（ファンブル無効）':'−1　ファンブル'},{f:[2,3],c:'z',t:'±0'},{f:[4,5],c:'g',t:'+1'},{f:[6],c:'y',t:'+1　もう1個振る'}],'出目の見方',
  `<div class="pt sm">振り足し（金のダイス）</div><div class="lg">${md(1,'gold')}<span>−1</span></div><div class="lg">${md('2〜5','gold')}<span>+1</span></div><div class="lg">${md(6,'gold')}<span>+1　さらに振る</span></div>`)}
function diceOpen({purpose='',pc='',title='',sub='',legend='',table=null,tableTitle='結果表'}){DICE.on=true;DICE.fast=false;DICE.phase='rolling';$('#diceLayer').classList.add('show');diceClear();
  sub=String(sub||'').replace(/。<b>/,'。<br><b>');const pe=$('#dicePurpose');pe.textContent=purpose;pe.className='purpose '+pc;pe.hidden=!purpose;$('#diceTitle').innerHTML=title;$('#diceSub').innerHTML=sub;
  const lg=$('#diceLegend');lg.innerHTML=legend;lg.hidden=!legend;
  DICE.table=table;const tb=$('#diceTable');tb.hidden=!table;tb.innerHTML=table?`<div class="pt">${tableTitle}</div>`+table.map(r=>`<div class="tb ${r.c||''}"><b>${r.k}</b><span>${r.t}</span></div>`).join(''):''}
function tableHL(v){if(!DICE.table)return null;let hit=null;document.querySelectorAll('#diceTable .tb').forEach((el,i)=>{const on=DICE.table[i].test(v);el.classList.toggle('on',on);if(on&&!hit)hit=DICE.table[i]});return hit}
function addBreak(v,txt,cls,gold){const el=document.createElement('span');el.className='bk '+cls;el.innerHTML=`${v!==''?md(v,gold?'gold':cls==='z'?'z':''):''}<em>${txt}</em>`;const bb=$('#diceBreak');bb.appendChild(el);bb.scrollLeft=bb.scrollWidth}
function diceClose(){DICE.on=false;DICE.phase='idle';$('#diceLayer').classList.remove('show');diceClear()}
$('#diceLayer').addEventListener('pointerdown',()=>{if(DICE.phase==='rolling')DICE.fast=true;else if(DICE.phase==='result'&&DICE.resolve&&performance.now()-DICE.shownAt>500){const r=DICE.resolve;DICE.resolve=null;r()}});
// 結果カードを出して、タップか一定時間で閉じる（プレイヤーの手番は長め）
function showResult(out){if(!out)return;const el=$('#diceResult');el.className=out.kind;
  el.innerHTML=`<div class="stamp">${out.stamp||({good:'SUCCESS',bad:'FAILURE',meh:'RESULT'}[out.kind])}</div><div class="head">${out.head}</div>${out.text?`<div class="txt">${out.text}</div>`:''}`;void el.offsetWidth;el.classList.add('show')}
function holdResult(quick=false){DICE.phase='result';DICE.shownAt=performance.now();const c=cur(),who=c&&!c.cpu?c:'host';
  return askRaw(who,()=>{const ms=(isHuman()?(quick?3800:6500):(quick?2000:3200))*SPEED*TEMPO;
    const nx=$('#diceNext');nx.classList.remove('wt');nx.querySelector('span').textContent='タップで次へ';nx.style.setProperty('--dur',ms+'ms');nx.classList.remove('show');void nx.offsetWidth;nx.classList.add('show');
    return new Promise(res=>{const f=()=>res(1);DICE.resolve=f;setTimeout(()=>{if(DICE.resolve===f){DICE.resolve=null;res(1)}},ms)})},
  w=>{const nx=$('#diceNext');if(w){nx.querySelector('span').textContent=`${waitName(w)}の確認を待っています…`;nx.classList.add('show','wt')}else{nx.classList.remove('wt');nx.querySelector('span').textContent='タップで次へ'}})}
function slotXZ(i,n,rowZ){const rw=Math.floor(i/7),col=i%7,inRow=Math.min(7,n-rw*7);return[(col-(inRow-1)/2)*1.4,rowZ+rw*1.4]}
// ダイスの数に合わせてカメラを引き、横一列が必ず画面に収まるようにする
function diceFit(cols){if(cols)DICE.cols=cols;const c=Math.max(3,DICE.cols||3),a=DICE.cam.aspect||1;const half=c*.7+.9;
  const df=Math.max(1,half/(6.27*a));DICE.cam.position.set(0,15.5*df,9.6*df);DICE.cam.lookAt(0,0,.3);
  const w=innerWidth,h=innerHeight;if(w<=860)DICE.cam.setViewOffset(w,h,0,-h*.07,w,h);else DICE.cam.clearViewOffset();DICE.cam.updateProjectionMatrix()}
// ---- ダイスを握って、タップで振る（桃鉄のサイコロ感覚）----
function hoverDice(n,styles){const arr=[];const cols=Math.min(n,7);const gap=1.25,scl=1.12;
  for(let i=0;i<n;i++){const st=styles?styles[i]||{}:{};const m=new THREE.Mesh(dieGeo,dieMats(st.style||'dark',st.tint||null));m.castShadow=true;
    const row=Math.floor(i/7),col=i%7,inRow=Math.min(7,n-row*7);m.position.set((col-(inRow-1)/2)*gap,3.4-row*.2,1.2+row*1.1);m.scale.setScalar(scl);
    DICE.scene.add(m);arr.push({m,ax:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),sp:11+Math.random()*7,ph:Math.random()*6,y:m.position.y})}
  let run=true,last=performance.now();const t0=last;
  const tick=()=>{if(!run)return;const now=performance.now(),dt=Math.min(.05,(now-last)/1000),t=(now-t0)/1000;last=now;
    arr.forEach(d=>{d.m.rotateOnAxis(d.ax,dt*d.sp);d.m.position.y=d.y+Math.sin(t*5+d.ph)*.18})
    ;requestAnimationFrame(tick)};tick();
  const snd=setInterval(()=>{if(AU.ctx)SFX.rattle()},560);if(AU.ctx)SFX.rattle();
  return{stop(){run=false;clearInterval(snd);const fr=arr.map(d=>d.m.position.clone());arr.forEach(d=>DICE.scene.remove(d.m));return fr}}}
async function readyThrow(n,styles){if(n>0)diceFit(Math.min(n,7));if(!S||n<=0)return;const ch=cur();if(!ch)return;const fast=!!window.__FAST;
  if(ch.cpu){if(fast)return;DICE.phase='ready';const H=hoverDice(n,styles);goUI(ch,'cpu');await wait(700);goUI(null);DICE.hoverFrom=H.stop();DICE.phase='rolling';return}
  const H=fast?null:hoverDice(n,styles);if(!fast){DICE.phase='ready';goUI(ch,mine(ch)?'me':'wait')}
  await askRaw(ch,()=>new Promise(res=>{if(window.__FAST){res(1);return}goUI(ch,'me');const L=$('#diceLayer'),b=$('#bGo');let done=false;
    const fin=e=>{if(done)return;done=true;if(e&&e.stopPropagation)e.stopPropagation();L.removeEventListener('pointerdown',fin);removeEventListener('keydown',kf);res(1)};
    const kf=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();fin()}};
    setTimeout(()=>{if(done)return;b&&(b.onclick=fin);L.addEventListener('pointerdown',fin);addEventListener('keydown',kf)},250)}));
  goUI(null);if(H){DICE.hoverFrom=H.stop();if(AU.ctx){SFX.whoosh()}}setTimeout(()=>{if(DICE.phase==='ready')DICE.phase='rolling'},0)}
function goUI(ch,mode){const el=$('#diceGo');if(!el)return;$('#diceLayer').classList.toggle('ready',!!ch);if(!ch){el.className='';el.innerHTML='';return}
  el.style.setProperty('--c',ch.css);
  el.innerHTML=mode==='me'?`<button class="btn big" id="bGo">ダイスを振る！</button><small>画面のどこをタップしてもOK${isPhone()?'':'（スペースキーでも）'}</small>`
    :mode==='cpu'?`<span class="gw"><b>${esc(ch.name)}</b>がダイスを振る…</span>`
    :`<span class="gw"><b>${esc(ch.name)}</b>がダイスを振るのを待っています…</span>`;
  el.className='show m-'+mode}
async function throwDice(vals,rowZ=-1.3,styles){
  const ds=vals.map((v,i)=>{const st=styles?styles[i]:{};const m=new THREE.Mesh(dieGeo,dieMats(st.style||'dark',st.tint||null));m.castShadow=true;const [x,z]=slotXZ(i,vals.length,rowZ);
    const hf=DICE.hoverFrom&&DICE.hoverFrom[i];const from=hf?hf.clone():new THREE.Vector3(x+(Math.random()-.5)*6,7+Math.random()*3,z-7-Math.random()*2);m.position.copy(from);
    const axis=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize();DICE.scene.add(m);
    const d={m,v,from,to:new THREE.Vector3(x,.5,z),axis,q1:finalQuat(v),spin:14+Math.random()*10,delay:i*70};DICE.dice.push(d);return d});
  DICE.hoverFrom=null;SFX.rattle();
  await Promise.all(ds.map(d=>new Promise(res=>setTimeout(()=>{let landed=false;
    tween(DICE.fast?240:1050,k=>{const p=d.m.position;p.x=d.from.x+(d.to.x-d.from.x)*easeOut(k);p.z=d.from.z+(d.to.z-d.from.z)*easeOut(k);
      const b=k<.55?1-(k/.55)**2:k<.8?.28*Math.sin((k-.55)/.25*Math.PI):.07*Math.sin((k-.8)/.2*Math.PI);p.y=d.to.y+Math.max(0,b)*(k<.55?d.from.y:3);
      if(!landed&&k>.55){landed=true;SFX.clack()}
      const spinQ=new THREE.Quaternion().setFromAxisAngle(d.axis,(1-k)*(1-k)*d.spin);const blend=Math.min(1,Math.max(0,(k-.45)/.5));
      d.m.quaternion.copy(spinQ.multiply(d.q1.clone())).slerp(d.q1,easeInOut(blend))}).then(res)},DICE.fast?0:d.delay*SPEED*TEMPO))));
  return ds;
}
function dieScreen(d){const v=d.m.position.clone();v.project(DICE.cam);return{x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}}
function glowDie(d,kind){const col=kind==='y'?0xf4dc9f:kind==='g'?0x62e3a4:kind==='r'?0xff4a62:0x000000;
  if(kind!=='z'){d.m.material.forEach(m=>{m.emissive.setHex(col);m.emissiveIntensity=kind==='y'?.22:.12});
    const h=new THREE.Mesh(new THREE.RingGeometry(.72,.86,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));h.rotation.x=-Math.PI/2;h.position.copy(d.m.position);h.position.y=.02;DICE.scene.add(h);d.halo=h}
  else d.m.material.forEach(m=>m.color.setHex(0x8a8a90));
  if(kind==='y'){const L=new THREE.PointLight(0xffd890,1.8,3);L.position.copy(d.m.position).add(new THREE.Vector3(0,1.2,0));DICE.scene.add(L);d.glowL=L;
    tween(420,k=>{d.m.position.y=.5+Math.sin(k*Math.PI)*1.1});const s=dieScreen(d);fxShock(s.x,s.y,'#f4dc9f',180);fxSparks(s.x,s.y,'#f4dc9f',40,520)}
  if(kind==='r'){const s=dieScreen(d);fxShock(s.x,s.y,'#ff4a62',140);fxSparks(s.x,s.y,'#ff4a62',22,320);tween(260,k=>{d.m.position.x=d.to.x+Math.sin(k*Math.PI*6)*.08*(1-k)})}}
function popAt(d,text,cls){const s=dieScreen(d);const el=document.createElement('div');el.className='pop '+cls;el.textContent=text;
  el.style.left=s.x+'px';el.style.top=(s.y-46)+'px';$('#pops').appendChild(el);setTimeout(()=>el.remove(),1300)}
function tallyHTML(n,need,hit,label='成功数'){const cls=n<0?'cold':(need!=null&&n>=need)||n>=5?'hot':'';const nx=DICE.ladder?DICE.ladder.find(([k])=>k>n):null;
  return`<div class="lbl">${label}</div><div class="num ${cls}">${n>0?'+':''}${n}</div>${need!=null?`<div class="need">必要 ${need}</div>`:''}<div class="now">${hit?`いまの成功数なら → <span>${hit.t}</span>`:''}</div>${nx?`<div class="nx">あと <b>+${nx[0]-n}</b> で「${nx[1]}」</div>`:''}`}
// ピークロール: 1=-1(ファンブル) 2-3=0 4-5=+1 6=+1&振り足し / 振り足しは 1=-1 2-5=+1 6=+1&さらに振り足し
async function peakRoll(n,{purpose='',pc='',title,sub='',need=null,bonus=0,bonusLabel='連携',noFumble=false,explain=null,table=null,src=null,onNoFumble=null,quick=false,ladder=null,tense=false,noFumbleOne=false}={}){let nf1=noFumbleOne?1:0;
  S.stats.rolls++;DICE.need=need;DICE.ladder=ladder;DICE.tense=tense;const od=need!=null&&S.showOdds!==false?`<span class="odds">成功率 約${pct(odds(n,need-bonus))}</span>`:'';diceOpen({purpose,pc,title:`${esc(title)}　<span class="nb">ダイス×${n}</span>`,sub:sub+od,legend:peakLegend(noFumble),table});let total=bonus;const tally=$('#diceTally');tally.innerHTML=tallyHTML(total,need,tableHL(total));
  $('#diceSrc').innerHTML=srcHTML(src);
  if(bonus)addBreak('',bonusLabel+' +'+bonus,'y');
  if(n>0){
    const vals=Array.from({length:n},d6);await readyThrow(n,src?srcStyles(src):undefined);const ds=await throwDice(vals,-1.3,src?srcStyles(src):undefined);await wait(260);
    let tick=0,extra=0,wave=0;
    const score=async(arr,isExtra)=>{for(const d of arr){let add=0,cls='z',txt='±0';
        if(d.v===6){add=1;cls='y';txt='JACKPOT +1';extra++;S.stats.crit++;SFX.crit()}
        else if(d.v===1){if((noFumble||nf1>0)&&!isExtra){if(!noFumble)nf1--;txt='無効';onNoFumble&&onNoFumble()}else{add=-1;cls='r';txt='FUMBLE −1';if(!isExtra)d.neg=true;S.stats.fumble++;SFX.fumble()}}
        else if(isExtra||d.v>=4){add=1;cls='g';txt='+1';SFX.good(tick)}else SFX.zero();
        glowDie(d,cls);popAt(d,txt,cls);total+=add;if(add>0)tick++;addBreak(d.v,add>0?(d.v===6?'+1 振り足し':'+1'):add<0?'−1':'±0',cls,isExtra);tally.innerHTML=tallyHTML(total,need,tableHL(total));await wait((DICE.fast?50:cls==='y'?720:cls==='r'?520:300)*(DICE.tense&&!DICE.fast?1.6:1));if(DICE.tense&&!DICE.fast)SFX.heart()}};
    await score(ds,false);
    // すり替え（スリ師の切り札）：1の目を1つ振り直す
    const ones=ds.filter(d=>d.neg);let swapped=0;
    if(ones.length&&await pickSwap()){swapped=1;const pp=S.chars.find(o=>o.id==='pickpocket');spendPlan(TRUMP.pickpocket.cost);S.abil=S.abil||{};const a=S.abil.pickpocket||(S.abil.pickpocket={n:0,sum:0,u:'切り札'});a.n++;
      const d=ones[0];total+=1;d.m.material.forEach(m=>{m.color.setHex(0x8a8a90)});addBreak(1,'すり替え（取り消し）','z');SFX.whoosh();log(`<span style="color:${pp.css}">✦ ${esc(pp.name)}の切り札「すり替え」：1の目を振り直す</span>`);
      const ab=document.createElement('div');ab.className='abil';ab.style.setProperty('--c',pp.css);ab.innerHTML=`<img src="${AV.pickpocket||''}" alt=""><div><span>切り札　段取り−2</span><b>すり替え</b><em>1の目を振り直す</em></div>`;$('#abils').appendChild(ab);setTimeout(()=>ab.remove(),2600*TEMPO);
      const nd=await throwDice([d6()],-1.3+1.4*Math.ceil(n/7),[{tint:pp.css}]);await wait(200);await score(nd,false);tally.innerHTML=tallyHTML(total,need,tableHL(total))}
    let rowZ=-1.3+1.4*(Math.ceil(n/7)+swapped);
    while(extra>0&&wave<6){const k=extra;extra=0;wave++;addBreak('',`振り足し ×${k}${wave>1?'（連鎖'+wave+'）':''}　金は2以上で+1`,'y');
      flash('rgba(244,220,159,.3)');SFX.swell();await wait(420);const ev=Array.from({length:k},d6);const eds=await throwDice(ev,rowZ,ev.map(()=>({style:'gold'})));rowZ+=1.4*Math.ceil(k/7);await wait(220);await score(eds,true)}
  }else await wait(500);
  addBreak('','合計 '+(total>0?'+':'')+total,'sum');
  await wait(DICE.fast?120:420);
  const out=explain?explain(total):null;if(out){showResult(out);if(out.kind==='good')celebrate(out.level||1);else if(out.kind==='bad')disaster(out.level||1)}
  await holdResult(quick);diceClose();return total;
}
async function plainRoll(n,{purpose='',pc='',title,sub='',styles,mark=v=>v===6?'y':'z',label,explain=null,legend='',table=null,tableTitle='結果表',breakTxt=null}={}){
  diceOpen({purpose,pc,title:`${esc(title)}　<span class="nb">ダイス×${n}</span>`,sub,legend,table,tableTitle});const vals=Array.from({length:n},d6);await readyThrow(n,styles);const ds=await throwDice(vals,-.7,styles);await wait(260);
  for(const [i,d] of ds.entries()){const k=mark(d.v,i);glowDie(d,k);if(label)popAt(d,label(d.v,i),k);else if(k==='y')popAt(d,'6!','y');if(k==='y')SFX.crit();else if(k==='r')SFX.zero();
    addBreak(d.v,breakTxt?breakTxt(d.v,i):(label?label(d.v,i):''),k);await wait(DICE.fast?30:220)}
  const hit=tableHL(vals);if(hit)$('#diceTally').innerHTML=`<div class="now">結果 → <span>${hit.t}</span></div>`;
  await wait(DICE.fast?120:380);
  const out=explain?explain(vals):null;if(out){showResult(out);if(out.kind==='good'&&out.level)celebrate(out.level);else if(out.kind==='bad'&&out.level)disaster(out.level)}
  await holdResult();diceClose();return vals;
}
