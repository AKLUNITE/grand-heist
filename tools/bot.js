// テスト用ボット：自分の番・自分への問い合わせ・各種「次へ」を自動で押す
window.__BOTLOG=[];
setInterval(()=>{try{if(!window.__BOT)return;const q=s=>document.querySelector(s);const K=window.__K;
  const vis=el=>el&&el.offsetParent!==null;
  if(K&&K.S&&K.S.phase==='end')return;
  const m=q('#modal.show');if(m){const b=m.querySelector('.mfoot [data-i]')||m.querySelector('[data-i]');if(b){window.__BOTLOG.push('modal');b.click()}return}
  const go=q('#diceGo.show.m-me #bGo');if(go){window.__BOTLOG.push('go');go.click();return}
  // 抽選演出・カード・ダイス結果
  const dw=q('#draw.show');if(dw){const ok=q('#dwOk')||q('#odOk');if(ok&&ok.style.visibility!=='hidden'){ok.click();return}if(dw.onclick){dw.click();return}}
  const deal=q('#deal');if(deal&&deal.classList.contains('show')){deal.click()}
  const dl=q('#diceLayer.show');if(dl&&!q('#diceGo.show')){dl.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));return}
  // 問い合わせ（モーダル）

  if(!K||!K.S)return;const S=K.S;if(S.phase==='end')return;
  const r=K.ev(`(()=>{if(BUSY||!S)return'busy';const ch=cur();if(!ch||!mine(ch))return'notmine';
    if(S.phase==='adventure'){
      if(S.step==='roll'){sendIn({k:'roll'});return'roll'}
      if(S.step==='move'){const rs=reachable(ch);const qs=S.quests.filter(x=>!x.done);let best=null,bd=1e9;
        if(qs.some(x=>isAdj(ch,S.quests.indexOf(x)))){sendIn({k:'end'});return'end0'}
        rs.forEach(([a,b])=>{const d=Math.min(...qs.map(x=>hexDist(a,b,x.r,x.c)));if(d<bd){bd=d;best=[a,b]}});
        if(best){sendIn({k:'move',r:best[0],c:best[1]});return'move'}sendIn({k:'end'});return'end'}
      if(S.step==='warp'){const w=warpTargets(ch)[0];sendIn({k:'warp',r:w[0],c:w[1]});return'warp'}
      if(S.step==='action'){const C=actionCards(ch);let i=C.findIndex(c=>c.ok&&c.k==='challenge');if(i<0)i=C.findIndex(c=>c.ok&&c.k==='investigate');if(i<0)i=C.findIndex(c=>c.ok);
        sendIn(i<0?{k:'act',i:'wait'}:{k:'act',i,boost:0});return'act'}}
    if(S.phase==='final'){const o=vOptions(ch,false).sort((a,b)=>b.p-a.p)[0];if(o){sendIn({k:'attack',push:false,t:o.t,stat:o.stat,boost:0});return'atk'}}
    return'idle'})()`);
  if(r&&r!=='busy'&&r!=='notmine'&&r!=='idle')window.__BOTLOG.push(r)}catch(e){window.__BOTERR=String(e)}},250);
window.__DBG=()=>{try{return window.__K.ev(`JSON.stringify({busy:BUSY,step:S.step,ph:S.phase,cur:cur().id,cpu:cur().cpu,aq:S.aq,ans:Object.keys(ANS).length,askw:ASKW&&[ASKW.seq,ASKW.ch&&ASKW.ch.id||String(ASKW.ch)],dp:DICE.phase,dr:!!DICE.resolve,deal:$('#deal').className,mod:$('#modal').className,dl:$('#diceLayer').className,draw:$('#draw').className,host:NET.host})`)}catch(e){return String(e)}};
