/* =====================================================================
   オンライン（P2P）
   全員が同じ種（シード）から同じゲームを動かし、プレイヤーの「入力」だけを送り合う。
   入力は部屋を作った人（ホスト）が順番を決めて全員に配る。接続の仲介には無料の PeerJS サーバーを使う
   ===================================================================== */
const NET={on:false,host:false,me:null,code:null,sig:null,hb:null,peers:{},hostPeer:null,lobby:null,log:[],n:0,start:null,hashes:{},replaying:false,status:'',inGame:false};
const ICE=window.__ICE||[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478']},
  // 直接つながらない回線（モバイル回線など）向けの無料中継サーバー
  {urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp','turns:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}];
// 公式の PeerJS ライブラリ（接続サーバーと確実に話せる）。読めなければ自前の実装で代用
let PJ_LOAD=null;
function loadPJ(){if(window.Peer)return Promise.resolve(true);if(window.__NOPJ)return Promise.resolve(false);if(PJ_LOAD)return PJ_LOAD;
  const tryU=u=>new Promise(r=>{const sc=document.createElement('script');sc.src=u;sc.onload=()=>r(!!window.Peer);sc.onerror=()=>r(false);document.head.appendChild(sc);setTimeout(()=>r(!!window.Peer),9000)});
  PJ_LOAD=(async()=>{for(const u of['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js']){if(await tryU(u))return true}return false})();return PJ_LOAD}
const PJ_URL='wss://0.peerjs.com/peerjs',PJ_KEY='peerjs',ROOM_PFX='grandheist-r1-';
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function ssGet(k){try{return JSON.parse(sessionStorage.getItem(k)||'null')}catch(e){return null}}
function ssSet(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}
const CID=(()=>{let c=lsGet('gh_cid','');if(!c){c='c'+Math.random().toString(36).slice(2,10);lsSet('gh_cid',c)}return c})();
function mine(ch){if(!ch||ch.cpu)return false;return NET.on?ch.owner===NET.me:true}
const memberName=cid=>(NET.lobby&&NET.lobby.members[cid]&&NET.lobby.members[cid].name)||'ゲスト';

/* ---------- 入力の流れ（オフラインでも同じ経路を通る） ---------- */
const INQ=[];const ANS={};let ASKW=null;let pumpT=null;
function tagCmp(d){return (d.tn-S.stats.turns)||(d.ip-(S.ip||0))}
function sendIn(d){if(!S||NET.replaying)return;d.tn=S.stats.turns;d.ip=S.ip||0;if(d.k!=='trump'&&cur())d.who=cur().id;
  if(!NET.on){deliverIn(d);return}
  if(NET.host)hostIn(d,NET.me);else if(NET.hostPeer)netSend(NET.hostPeer,{t:'in',d});else netToast('ホストとの接続が切れています')}
function hostIn(d,from){if(d.k==='ans'&&from===NET.me&&NET.log.some(x=>x.k==='ans'&&x.seq===d.seq))return;d.from=from;d.n=++NET.n;NET.log.push(d);netBroadcast({t:'in',d});deliverIn(d)}
function deliverIn(d){if(d.k==='ans'){ANS[d.seq]=d.v;if(ASKW&&ASKW.seq===d.seq){const w=ASKW;ASKW=null;(w.waitUI||askWaitUI)(null);w.res(d.v)}return}INQ.push(d);pump()}
function schedPump(ms=120){clearTimeout(pumpT);pumpT=setTimeout(pump,ms)}
function pump(){if(!S||S.phase==='end')return;
  while(INQ.length){if(BUSY||S.step==='intro'||S.lockIn){schedPump();return}
    const d=INQ[0];const c=tagCmp(d);if(c>0){schedPump();return}
    INQ.shift();if(c<0||!cmdOK(d))continue;
    S.ip=(S.ip||0)+1;execCmd(d);return}}
function cmdOK(d){const ch=cur();if(!ch||ch.dead)return false;if(d.who&&d.who!==ch.id)return false;const adv=S.phase==='adventure',fin=S.phase==='final';
  switch(d.k){
    case'roll':return adv&&S.step==='roll'&&!ch.cpu;
    case'move':return adv&&S.step==='move'&&!ch.cpu&&reachable(ch).some(([a,b])=>a===d.r&&b===d.c);
    case'warp':return adv&&S.step==='warp'&&!ch.cpu&&warpTargets(ch).some(([a,b])=>a===d.r&&b===d.c);
    case'end':return adv&&S.step==='move'&&!ch.cpu;
    case'act':{if(!adv||S.step!=='action'||ch.cpu)return false;if(d.i==='wait')return true;const c=actionCards(ch)[d.i];return!!(c&&c.ok)}
    case'bag':return adv&&(S.step==='roll'||S.step==='action')&&!ch.cpu&&ch.bag.length>0;
    case'trump':{const c=S.chars.find(x=>x.id===d.id);if(!c||c.cpu||c.dead)return false;
      if(fin)return!ch.cpu&&trumpOK(c,'final');return adv&&c===ch&&(S.step==='roll'||S.step==='action')&&trumpOK(c,S.step==='roll'?'roll':'turn')}
    case'attack':return fin&&!ch.cpu&&vOptions(ch,!!d.push).some(x=>x.t===d.t&&x.stat===d.stat);
    case'stall':return fin&&!ch.cpu&&S.plan>=STALL_COST}
  return false}
function execCmd(d){const ch=cur();const bst=v=>Math.max(0,Math.min(ch.resv||0,v|0));
  switch(d.k){
    case'roll':guard(doRoll);break;
    case'move':guard(()=>moveStep(ch,d.r,d.c));break;
    case'warp':guard(()=>warpTo(ch,d.r,d.c));break;
    case'end':S.step='action';S.boost=0;renderAll();schedPump(0);break;
    case'act':{S.boost=bst(d.boost);const a=d.i==='wait'?{k:'wait'}:actionCards(ch)[d.i];guard(async()=>{await doAction(a);await finishAction()});break}
    case'bag':guard(()=>bagMenu(ch));break;
    case'trump':{const c=S.chars.find(x=>x.id===d.id);guard(async()=>{await useTrump(c)});break}
    case'attack':{S.boost=bst(d.boost);S.push=!!d.push;S.pushSel=false;S.vsel=vOptions(ch,!!d.push).find(x=>x.t===d.t&&x.stat===d.stat)||null;guard(finalAttack);break}
    case'stall':guard(()=>stall(ch));break}}
// 選択肢の問い合わせ（協力するか・割り込み・保釈など）。担当者の画面だけに出し、答えを全員に配る
// 進行の同期点：決める人（手番の人、CPUや共通の画面はホスト）だけが操作でき、全員がその合図で一緒に進む
function decides(who){if(!NET.on)return true;if(!who||who==='host'||who.cpu)return!!NET.host;return mine(who)}
const waitName=w=>(!w||w==='host'||w.cpu)?'ホスト':w.name;
async function askRaw(ch,ui,waitUI){S.aq=(S.aq||0)+1;const seq=S.aq;
  if(!NET.on)return await ui();
  if(seq in ANS)return ANS[seq];
  if(decides(ch)){const v=await ui();sendAns(seq,v);return v}
  (waitUI||askWaitUI)(ch);return await new Promise(res=>{ASKW={seq,ch,ui,res,waitUI}})}
function sendAns(seq,v){const d={k:'ans',seq,v};if(NET.host)hostIn(d,NET.me);else if(NET.hostPeer)netSend(NET.hostPeer,{t:'in',d})}
async function askModal(ch,html,buttons,wide){const i=await askRaw(ch,()=>modalI(html,buttons,wide));return(buttons[i]||buttons[buttons.length-1]).v}
async function askModal2(ch,html,choices,wide){const i=await askRaw(ch,()=>modal2I(html,choices,wide));return i==null?null:choices[i]}
function askWaitUI(ch){const el=$('#netwait');if(!el)return;if(!ch){el.classList.remove('show');return}
  const col=ch&&ch.css&&!ch.cpu?ch.css:'var(--gold)';el.innerHTML=`<i style="background:${col}"></i><b style="color:${col}">${esc(waitName(ch))}</b>が選んでいます…`;el.classList.add('show')}
// 同期ずれの検出：手番の始まりごとに状態の要約を比べる
function stateHash(){const o=[RSEED,S.ip||0,S.aq||0,S.turn,S.round,S.gauge,S.plan,S.locks,S.phase,S.eta||0,S.chars.map(c=>[c.id,c.r,c.c,c.life,c.resv,c.xp,c.lv,c.dead?1:0,c.bag.length]),S.quests.map(q=>[q.progress,q.done?1:0,q.revealed?1:0,q.q.diff]),S.loot.map(l=>l.taken?1:0)];
  const str=JSON.stringify(o);let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function netTurnHash(){if(!NET.on||NET.replaying||!S)return;const k=S.stats.turns,h=stateHash();
  if(NET.host){NET.hashes[k]=Object.assign(NET.hashes[k]||{},{_host:h});checkHash(k)}else if(NET.hostPeer)netSend(NET.hostPeer,{t:'h',k,h})}
function checkHash(k){const e=NET.hashes[k];if(!e||!e._host)return;for(const [cid,h] of Object.entries(e)){if(cid==='_host'||h===e._host)continue;
  window.__DESYNC=(window.__DESYNC||0)+1;console.warn('desync',k,cid,h,e._host);log(`<span class="r">⚠ ${esc(memberName(cid))}の画面と進行がずれた可能性があります（手番${k}）</span>`);delete e[cid]}}

/* ---------- 接続（PeerJS サーバーで相手を見つけ、WebRTC で直接つなぐ） ---------- */
function sigOpen(id){return new Promise((res,rej)=>{const tok=(NET.tokId===id&&NET.tok)||Math.random().toString(36).slice(2);NET.tok=tok;NET.tokId=id;NET.myId=id;
  const url=(window.__SIGURL||PJ_URL)+`?key=${PJ_KEY}&id=${encodeURIComponent(id)}&token=${tok}&version=1.5.4`;
  let ws,done=false;const fail=e=>{if(done)return;done=true;clearTimeout(to);try{ws&&ws.close()}catch(_){}rej(e)};
  const to=setTimeout(()=>fail(new Error('timeout')),15000);
  try{ws=new WebSocket(url)}catch(e){fail(e);return}
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}NET.rx=(NET.rx||0)+1;NET.rxT=(NET.rxT||'')+(m.type||'?')[0];
    if(m.type==='OPEN'){if(done)return;done=true;clearTimeout(to);NET.sig=ws;clearInterval(NET.hb);NET.hb=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'HEARTBEAT'}))},5000);res(ws);return}
    if(m.type==='ID-TAKEN'){fail(new Error('taken'));return}
    if(m.type==='ERROR'||m.type==='INVALID-KEY'){fail(new Error((m.payload&&m.payload.msg)||m.type));return}
    sigMsg(m)};
  ws.onerror=()=>fail(new Error('ws'));
  ws.onclose=()=>{if(!done){fail(new Error('closed'));return}if(NET.sig===ws){NET.sig=null;clearInterval(NET.hb);sigRevive()}}})}
async function sigRevive(){if(!NET.on||!NET.host||!NET.code||NET.reviving)return;NET.reviving=true;renderNetPanel();
  for(let k=0;k<20&&NET.on&&NET.host&&!NET.sig;k++){try{await sigOpen(ROOM_PFX+NET.code);break}catch(e){await new Promise(r=>setTimeout(r,k<3?2000:5000))}}
  NET.reviving=false;renderNetPanel()}
// 受付の死活確認：自分宛てに合図を送り、返ってこなければつなぎ直す
setInterval(()=>{if(!NET.on||!NET.host||!NET.code||NET.reviving||NET.peer)return;const ws=NET.sig;
  if(!ws||ws.readyState!==1){if(ws){try{ws.onclose=null;ws.close()}catch(_){}}NET.sig=null;clearInterval(NET.hb);sigRevive();return}
  const t=Date.now();NET.pingT=t;ws.send(JSON.stringify({type:'CANDIDATE',dst:NET.myId,payload:{ping:t}}));
  setTimeout(()=>{if(NET.sig===ws&&NET.pingT===t&&NET.pong!==t&&!NET.reviving){try{ws.onclose=null;ws.close()}catch(_){}NET.sig=null;clearInterval(NET.hb);sigRevive()}},8000)},12000);
document.addEventListener('visibilitychange',()=>{if(document.hidden||!NET.on)return;if(NET.peer){if(NET.peer.disconnected&&!NET.peer.destroyed)try{NET.peer.reconnect()}catch(_){}return}if(NET.host&&(!NET.sig||NET.sig.readyState>1))sigRevive()});
function sigSend(type,dst,payload){if(NET.sig&&NET.sig.readyState===1)NET.sig.send(JSON.stringify({type,dst,payload}))}
function newPeer(id){const pc=new RTCPeerConnection({iceServers:ICE});const P={id,pc,dc:null,cands:[],remote:false,cid:null,open:false,ct:{}};NET.peers[id]=P;
  pc.addEventListener('icecandidate',e=>{if(e.candidate){const t=(/ typ (\w+)/.exec(e.candidate.candidate)||[])[1]||'?';P.ct[t]=(P.ct[t]||0)+1}});
  pc.onicecandidate=e=>{if(e.candidate)sigSend('CANDIDATE',id,{candidate:e.candidate,connectionId:'gh',type:'data'})};
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))peerGone(P)};return P}
function bindDc(P,dc){P.dc=dc;dc.onopen=()=>{P.open=true;if(!NET.host)netSend(P,{t:'hello',cid:CID,name:myName()})};
  dc.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}netMsg(P,m)};dc.onclose=()=>peerGone(P)}
async function addCands(P){for(const c of P.cands.splice(0)){try{await P.pc.addIceCandidate(c)}catch(_){}}}
async function sigMsg(m){try{await sigMsg2(m)}catch(e){console.error(e);netToast('接続処理でエラー：'+(e&&e.message||e),true)}}
async function sigMsg2(m){const src=m.src,pl=m.payload||{};
  if(m.type==='CANDIDATE'&&pl.ping){NET.pong=pl.ping;return}
  if(m.type==='OFFER'&&NET.host){const old=NET.peers[src];if(old&&old.lastOffer===pl.sdp.sdp&&old.answer){sigSend('ANSWER',src,{sdp:old.answer,connectionId:'gh',type:'data'});return}
    if(old)try{old.gone=true;old.pc.close()}catch(_){}
    netToast('参加リクエストを受信。接続しています…');
    const P=newPeer(src);P.lastOffer=pl.sdp.sdp;P.pc.ondatachannel=e=>bindDc(P,e.channel);
    await P.pc.setRemoteDescription(pl.sdp);P.remote=true;await addCands(P);const a=await P.pc.createAnswer();await P.pc.setLocalDescription(a);P.answer=a;sigSend('ANSWER',src,{sdp:a,connectionId:'gh',type:'data'});return}
  const P=NET.peers[src];if(!P)return;
  if(m.type==='ANSWER'){NET.stage='answer';if(P.pc.signalingState!=='have-local-offer')return;await P.pc.setRemoteDescription(pl.sdp);P.remote=true;await addCands(P);return}
  if(m.type==='CANDIDATE'&&pl.candidate){if(P.remote){try{await P.pc.addIceCandidate(pl.candidate)}catch(_){}}else P.cands.push(pl.candidate);return}
  if(m.type==='EXPIRE'&&!NET.host&&src===NET.code&&!NET.hostPeer){lobbyFail('部屋が見つかりません。コードを確かめてください')}}
function netSend(P,msg){if(typeof P==='string')P=NET.peers[P];if(!P)return;if(P.conn){if(P.conn.open)try{P.conn.send(msg)}catch(_){}return}if(P.dc&&P.dc.readyState==='open')P.dc.send(JSON.stringify(msg))}
function netBroadcast(msg){Object.values(NET.peers).forEach(P=>{if(P.cid)netSend(P,msg)})}
function peerGone(P){if(P.gone)return;P.gone=true;if(NET.peers[P.id]===P)delete NET.peers[P.id];try{P.conn?P.conn.close():P.pc.close()}catch(_){}
  if(NET.host){if(P.cid&&NET.lobby.members[P.cid]){NET.lobby.members[P.cid].online=false;lobbyPush();if(NET.inGame&&S)takeOver(P.cid);if(S)log(`<span class="r">${esc(memberName(P.cid))}の接続が切れました</span>`)}}
  else if(P===NET.hostPeer){NET.hostPeer=null;netToast('ホストとの接続が切れました。ホストが部屋を作り直したら、同じコードで入り直せます',true);renderNetPanel()}}
// 切断した人の団員はホストが代わりに操作する（戻ってきたら返す）
function takeOver(cid){if(!S)return;let ch=false;S.chars.forEach(c=>{if(c.owner===cid){c.owner=NET.me;c.lent=cid;ch=true}});if(!ch)return;
  netBroadcast({t:'own',m:S.chars.map(c=>[c.id,c.owner])});ownChanged()}
function ownChanged(){if(ASKW&&decides(ASKW.ch)){const w=ASKW;ASKW=null;(w.waitUI||askWaitUI)(null);w.ui().then(v=>{sendAns(w.seq,v);w.res(v)})}renderAll()}

/* ---------- メッセージ ---------- */
function netMsg(P,m){
  if(NET.host){
    if(m.t==='hello'){P.cid=m.cid;const mem=NET.lobby.members[m.cid]=NET.lobby.members[m.cid]||{name:m.name};mem.name=String(m.name||'ゲスト').slice(0,10);mem.online=true;
      netSend(P,{t:'welcome',code:NET.code});lobbyPush();
      if(NET.inGame&&S){netSend(P,{t:'sync',start:NET.start,log:NET.log,at:{turns:S.stats.turns,ip:S.ip||0}});
        let back=false;S.chars.forEach(c=>{if(c.lent===m.cid){c.owner=m.cid;delete c.lent;back=true}});if(back){netBroadcast({t:'own',m:S.chars.map(c=>[c.id,c.owner])});ownChanged()}
        log(`<span class="g">${esc(mem.name)}が戻ってきました</span>`)}
      return}
    if(!P.cid)return;
    if(m.t==='seat'){lobbyReq(P.cid,m);return}
    if(m.t==='in'){const d=m.d;if(!d)return;
      if(d.k==='ans'){if(!ASKW_OWNER_OK(d,P.cid))return;hostIn(d,P.cid);return}
      if(!S||!cmdOwnerOK(d,P.cid))return;hostIn(d,P.cid);return}
    if(m.t==='h'){const e=NET.hashes[m.k]=NET.hashes[m.k]||{};e[P.cid]=m.h;checkHash(m.k);return}
    return}
  // ゲスト側
  if(m.t==='welcome'){NET.status='in';renderNetPanel();return}
  if(m.t==='lobby'){NET.lobby=m.lobby;lobbyApply();return}
  if(m.t==='start'){netStartGame(m.start);return}
  if(m.t==='sync'){netReplay(m.start,m.log,m.at);return}
  if(m.t==='in'){if(NET.replaying){NET.pend.push(m.d);return}deliverIn(m.d);return}
  if(m.t==='own'){if(!S)return;m.m.forEach(([id,o])=>{const c=S.chars.find(x=>x.id===id);if(c)c.owner=o});ownChanged();return}
  if(m.t==='lobbyback'){backToLobby();return}}
// ホストでの検証：その団員の持ち主からの入力か
function cmdOwnerOK(d,cid){const ch=S.chars.find(x=>x.id===(d.k==='trump'?d.id:d.who));return!!ch&&ch.owner===cid}
function ASKW_OWNER_OK(d,cid){return!(d.seq in ANS)}

/* ---------- ロビー ---------- */
function myName(){return(lsGet('gh_name','')||'').trim()||'ゲスト'}
function lobbyInit(){NET.lobby={members:{[CID]:{name:myName(),online:true,host:true}},seats:SEATS.map((s,i)=>({on:s.on,job:s.job,name:i===0?myName():s.name,owner:i===0?CID:null}))}}
function lobbyPush(){if(!NET.host)return;netBroadcast({t:'lobby',lobby:NET.lobby});lobbyApply()}
function lobbyApply(){const L=NET.lobby;if(!L)return;L.seats.forEach((x,i)=>{Object.assign(SEATS[i],{on:x.on,job:x.job,name:x.name,owner:x.owner,cpu:!x.owner})});renderSeats();renderNetPanel()}
function lobbyReq(cid,m){const L=NET.lobby,s=L.seats[m.i];if(!s||NET.inGame)return;const isHost=cid===CID;
  const used=L.seats.filter((x,j)=>x.on&&j!==m.i).map(x=>x.job);
  if(m.op==='on'&&isHost){s.on=!s.on;if(s.on&&used.includes(s.job))s.job=JOBS.find(j=>!used.includes(j.id)).id}
  else if(m.op==='sit'&&s.on&&(!s.owner||s.owner===cid)){s.owner=cid;s.name=memberName(cid)}
  else if(m.op==='cpu'&&(s.owner===cid||isHost)){s.owner=null;s.name='団員'+(m.i+1)}
  else if(m.op==='job'&&(s.owner===cid||(isHost&&!s.owner))&&JOBS.some(j=>j.id===m.v)&&!used.includes(m.v))s.job=m.v;
  else if(m.op==='name'&&(s.owner===cid||(isHost&&!s.owner)))s.name=String(m.v||'').slice(0,10);
  else return;lobbyPush()}
function seatReq(i,op,v){if(NET.host)lobbyReq(CID,{i,op,v});else if(NET.hostPeer)netSend(NET.hostPeer,{t:'seat',i,op,v})}
function genCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<5;i++)c+=A[Math.floor(Math.random()*A.length)];return c}
function pjNew(id){return new Promise((res,rej)=>{let done=false;const pr=new Peer(id,{config:{iceServers:ICE},debug:1});
  const to=setTimeout(()=>{if(!done){done=true;try{pr.destroy()}catch(_){}rej(new Error('timeout'))}},15000);
  pr.on('open',()=>{if(done)return;done=true;clearTimeout(to);res(pr)});
  pr.on('error',e=>{if(done){pjErr(pr,e);return}done=true;clearTimeout(to);try{pr.destroy()}catch(_){}rej(new Error(e.type==='unavailable-id'?'taken':(e.type||'error')))})})}
function pjErr(pr,e){if(pr!==NET.peer)return;const t=e&&e.type;console.warn('peer error',t,e);
  if(t==='peer-unavailable'&&NET.status==='joining'){lobbyFail('部屋が見つかりません：コードが違うか、ホストが部屋を閉じています');return}
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed'){renderNetPanel();setTimeout(()=>{if(NET.peer===pr&&pr.disconnected&&!pr.destroyed)try{pr.reconnect()}catch(_){}},2000)}}
function pjWatch(pr){pr.on('disconnected',()=>{if(NET.peer!==pr)return;renderNetPanel();setTimeout(()=>{if(NET.peer===pr&&pr.disconnected&&!pr.destroyed)try{pr.reconnect()}catch(_){}},1000)});
  pr.on('open',()=>{if(NET.peer===pr)renderNetPanel()});pr.on('error',e=>pjErr(pr,e))}
function pjBind(conn,P){P.conn=conn;conn.on('data',m=>{if(m&&typeof m==='object')netMsg(P,m)});conn.on('close',()=>peerGone(P));conn.on('error',e=>console.warn('conn error',e))}
async function netCreate(code){if(await loadPJ())return pjCreate(code);netReset();NET.on=true;NET.host=true;NET.me=CID;NET.status='opening';renderNetPanel();
  for(let tries=0;tries<5;tries++){const c=code||genCode();try{await sigOpen(ROOM_PFX+c);NET.code=c;break}catch(e){if(e.message==='taken'&&!code)continue;if(e.message==='taken'&&code){await new Promise(r=>setTimeout(r,2500));continue}lobbyFail(netErrText(e));return}}
  if(!NET.code){lobbyFail('部屋を作れませんでした。少し待ってからもう一度試してください');return}
  lobbyInit();NET.status='in';ssSet('gh_net',{code:NET.code,host:true});lobbyApply();netToast(`部屋を作りました：${NET.code}`)}
async function pjCreate(code){netReset();NET.on=true;NET.host=true;NET.me=CID;NET.status='opening';renderNetPanel();
  let pr=null;for(let tries=0;tries<6;tries++){const c=code||genCode();try{pr=await pjNew(ROOM_PFX+c);NET.code=c;break}catch(e){if(e.message==='taken'){if(code)await new Promise(r=>setTimeout(r,3000));continue}lobbyFail(netErrText(e));return}}
  if(!pr){lobbyFail('部屋を作れませんでした。少し待ってからもう一度試してください');return}
  NET.peer=pr;pjWatch(pr);
  pr.on('connection',conn=>{const old=NET.peers[conn.peer];if(old)peerGone(old);const P={id:conn.peer,cid:null,open:false};NET.peers[conn.peer]=P;pjBind(conn,P);
    conn.on('open',()=>{P.open=true});netToast('参加リクエストを受信。接続しています…')});
  lobbyInit();NET.status='in';ssSet('gh_net',{code:NET.code,host:true});lobbyApply();netToast(`部屋を作りました：${NET.code}`)}
async function pjJoin(code){netReset();NET.on=true;NET.host=false;NET.me=CID;NET.code=code;NET.status='joining';renderNetPanel();
  let pr;try{pr=await pjNew(ROOM_PFX+'g'+Math.random().toString(36).slice(2,10))}catch(e){lobbyFail(netErrText(e));return}
  NET.peer=pr;pjWatch(pr);ssSet('gh_net',{code,host:false});
  const hid=ROOM_PFX+code;const P={id:hid,cid:null,open:false};NET.peers[hid]=P;NET.hostPeer=P;NET.stage='connect';
  const conn=pr.connect(hid,{reliable:true,serialization:'json'});pjBind(conn,P);
  conn.on('open',()=>{P.open=true;NET.stage='open';netSend(P,{t:'hello',cid:CID,name:myName()})});
  setTimeout(()=>{if(NET.status!=='joining'||NET.code!==code)return;const pc=conn.peerConnection;const ice=pc?pc.iceConnectionState:'-';
    const why=ice==='new'||ice==='-'?'ホストから応答がありません（コード違い、またはホストのページが閉じている／スリープ中）':ice==='checking'||ice==='failed'?'端末どうしを直接つなげませんでした（回線の制限）':'接続後の応答がありません';
    lobbyFail(`部屋につながりませんでした：${why}［診断：PJ／${NET.stage}／${ice}／${pr.disconnected?'切断':'接続'}］`)},35000)}
async function netJoin(code){code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length<4){netToast('部屋のコードを入力してください');return}
  if(await loadPJ())return pjJoin(code);
  netReset();NET.on=true;NET.host=false;NET.me=CID;NET.code=code;NET.status='joining';renderNetPanel();
  try{await sigOpen(ROOM_PFX+'g'+Math.random().toString(36).slice(2,10))}catch(e){lobbyFail(netErrText(e));return}
  const hid=ROOM_PFX+code;const P=newPeer(hid);NET.hostPeer=P;const dc=P.pc.createDataChannel('gh',{ordered:true});bindDc(P,dc);
  const off=await P.pc.createOffer();await P.pc.setLocalDescription(off);const sendOff=()=>sigSend('OFFER',hid,{sdp:P.pc.localDescription||off,connectionId:'gh',type:'data'});sendOff();NET.stage='offer';NET.rx=0;NET.rxT='';
  let tries=0;const rs=setInterval(()=>{if(NET.stage!=='offer'||NET.code!==code||NET.status!=='joining'||++tries>4){clearInterval(rs);return}sendOff()},6000);
  ssSet('gh_net',{code,host:false});
  setTimeout(()=>{if(NET.status!=='joining'||NET.code!==code)return;const pc=P.pc,ct=P.ct||{};
    const why=NET.stage!=='answer'?'ホストから応答がありません（コード違い、またはホストのページが閉じている／スリープ中）'
      :pc.iceConnectionState==='failed'||pc.iceConnectionState==='checking'||pc.iceConnectionState==='new'?`端末どうしを直接つなげませんでした（回線の制限。Wi-Fiどうしで試してください）`
      :'接続後の応答がありません';
    const diag=`［診断：${NET.stage||'-'}／${pc.iceConnectionState}／受信${NET.rx||0}${NET.rxT?'('+NET.rxT+')':''}／ws${NET.sig?NET.sig.readyState:'x'}／候補 ${['host','srflx','relay'].map(k=>k+(ct[k]||0)).join(' ')}］`;
    console.warn('join fail',diag);lobbyFail('部屋につながりませんでした：'+why+' '+diag)},35000)}
function netErrText(e){const m=e&&e.message||'';if(m==='ws'||m==='closed'||m==='timeout')return'接続サーバーにつながりませんでした（この環境では通信が制限されている可能性があります）';return'接続できませんでした：'+m}
function netReset(){Object.values(NET.peers).forEach(P=>{P.gone=true;try{P.conn?P.conn.close():P.pc.close()}catch(_){}});if(NET.peer){const pr=NET.peer;NET.peer=null;try{pr.destroy()}catch(_){}}NET.peers={};NET.hostPeer=null;if(NET.sig)try{NET.sig.close()}catch(_){}NET.sig=null;clearInterval(NET.hb);
  Object.assign(NET,{on:false,host:false,code:null,lobby:null,log:[],n:0,start:null,hashes:{},status:'',inGame:false})}
function netLeave(){netReset();ssSet('gh_net',null);SEATS.forEach(s=>{delete s.owner});renderSeats();renderNetPanel()}
function lobbyFail(t){netReset();ssSet('gh_net',null);NET.status='';renderNetPanel();netToast(t,true)}
function netToast(t,bad){const el=$('#nettoast');if(!el)return;el.textContent=t;el.className='show'+(bad?' bad':'');clearTimeout(el._h);el._h=setTimeout(()=>el.className='',bad?15000:3500)}

/* ---------- 開始・途中参加 ---------- */
function netHostStart(){const L=NET.lobby;const sel=L.seats.filter(s=>s.on);if(sel.length<2){modal('<h3>団員が足りません</h3><p>2人以上を「参加中」にしてください。</p>',[{label:'OK',v:0}]);return}
  const offline=sel.filter(s=>s.owner&&!(L.members[s.owner]||{}).online);if(offline.length){netToast('接続が切れているメンバーの席があります');return}
  const start={seed:(Math.random()*4294967296)>>>0,seats:sel.map(s=>({job:s.job,name:s.name,owner:s.owner,cpu:!s.owner}))};
  NET.start=start;NET.log=[];NET.n=0;NET.hashes={};netBroadcast({t:'start',start});netStartGame(start)}
function netStartGame(start){NET.start=start;NET.inGame=true;INQ.length=0;for(const k in ANS)delete ANS[k];ASKW=null;startGame(start.seats.map(s=>({...s})),start.seed)}
function netReplay(start,logArr,at){NET.replaying=true;NET.pend=[];window.__FAST=true;const sp=SPEED;SPEED=.02;$('#netcatch').classList.add('show');
  netStartGame(start);logArr.forEach(d=>deliverIn(d));
  const chk=setInterval(()=>{if(!S)return;if(S.stats.turns>=at.turns&&(S.ip||0)>=at.ip&&!BUSY&&INQ.length===0){clearInterval(chk);window.__FAST=false;SPEED=sp;NET.replaying=false;
    $('#netcatch').classList.remove('show');const p=NET.pend;NET.pend=[];p.forEach(d=>deliverIn(d));renderAll();netToast('ゲームに復帰しました')}},150)}
function backToLobby(){ssSet('gh_net',NET.on?{code:NET.code,host:NET.host}:null);location.reload()}

/* ---------- 開始時の抽選演出：今夜の金庫・裏の依頼 ---------- */
const JOBFOR={bat:['cracker','phantom','bouncer'],hck:['hacker','informant'],scn:['disguise','driver','pickpocket']};
function vaultCardHTML(v){return`<div class="vcard"><div class="vn">${v.name}</div><div class="vb">${LTYPES.map(t=>`<span style="--lc:${LT[t].col}">${Array.from({length:v.counts[t]},()=>`<i>${LT[t].short}</i>`).join('')}</span>`).join('')}</div><div class="vt">${v.text}</div></div>`}
function drawWait(el,ms){return new Promise(res=>{let done=false;const fin=()=>{if(done)return;done=true;el.onclick=null;res()};setTimeout(()=>{el.onclick=fin},700);if(ms)setTimeout(fin,ms)})}
async function vaultDraw(){if(window.__FAST){await askRaw('host',async()=>1);return}const el=$('#draw');const V=vaultOf();const seq=[];for(let k=0;k<4;k++)VAULTS.forEach(v=>seq.push(v));seq.push(V);
  el.innerHTML=`<div class="dw-box"><div class="dw-k">TONIGHT'S VAULT</div><div class="dw-t">今夜の金庫を抽選</div><div class="dw-slot"><div class="dw-reel">${seq.map(vaultCardHTML).join('')}</div></div><div class="dw-d"></div><div class="dw-h">タップで次へ</div></div>`;
  el.className='show';const reel=el.querySelector('.dw-reel');const H=el.querySelector('.vcard').offsetHeight||150;let last=-1;SFX.rattle();
  await tween(3000,k=>{const pos=k*(seq.length-1);reel.style.transform=`translateY(${-pos*H}px)`;const i=Math.round(pos);if(i!==last){last=i;SFX.tick(i)}},x=>1-Math.pow(1-x,3));
  SFX.clank();setTimeout(()=>SFX.win(true),150);el.querySelector('.dw-slot').classList.add('hit');fxRays('#f4dc9f',2);
  const major=LTYPES.filter(t=>V.counts[t]>=4)[0];const crew=S.chars;
  const lines=LTYPES.map(t=>{const js=JOBFOR[t];const ours=crew.filter(c=>js.includes(c.id));return`<div class="dw-row" style="--lc:${LT[t].col}"><b>${LT[t].name} ×${V.counts[t]}</b><span>${STATN2[t]}が得意：${js.map(id=>{const c=crew.find(x=>x.id===id);return c?`<em style="color:${c.css}">${JOBS.find(j=>j.id===id).job}</em>`:`<s>${JOBS.find(j=>j.id===id).job}</s>`}).join('・')}</span>${ours.length?'':`<i>チームに得意な職業がいない</i>`}</div>`}).join('');
  el.querySelector('.dw-d').innerHTML=`<div class="dw-name">${V.name}</div>${major?`<div class="dw-hl">${LT[major].name}が多い。<b>${STATN2[major]}</b>が得意な団員が本番の主役</div>`:'<div class="dw-hl">3種類が均等。チーム全員に出番がある</div>'}${lines}`;
  log(`<span class="y">今夜の金庫：${V.name}（物理${V.counts.bat}・電子${V.counts.hck}・センサー${V.counts.scn}）</span>`);
  await askRaw('host',()=>drawWait(el,NET.on||isHuman()?0:6000).then(()=>1),w=>{const hh=el.querySelector('.dw-h');if(hh)hh.textContent=w?'ホストが進めるのを待っています…':'タップで次へ'});el.className=''}
async function contractDraw(){if(window.__FAST){await askRaw('host',async()=>1);return}const el=$('#draw');const humans=S.chars.filter(mine);
  el.innerHTML=`<div class="dw-box wide"><div class="dw-k">SECRET CONTRACT</div><div class="dw-t">裏の依頼を配ります</div><div class="dw-s">達成すると表彰式で名誉点ボーナス。<b>自分のカードだけ</b>をめくってください（他の人は見ないで）</div>
    <div class="dw-cards">${S.chars.map((c,i)=>{const ct=CONTRACTS.find(x=>x.id===c.contract);return`<div class="ctc ${mine(c)?'':'cpu'}" data-ci="${i}" style="--c:${c.css};animation-delay:${i*.18}s"><div class="ctc-in"><div class="ctc-b"><img src="${AV[c.id]||''}" alt=""><b>${esc(c.name)}</b><span>${c.cpu?'CPU：抽選済み':mine(c)?'タップでめくる':esc(memberName(c.owner))+'が確認中'}</span></div>
      <div class="ctc-f"><small>裏の依頼</small><b>${ct.name}</b><p>${ct.text}</p><em>達成で +${ct.pts}</em><span>もう一度タップで伏せる</span></div></div></div>`}).join('')}</div>
    <button class="btn big" id="dwOk">${humans.length?'確認した。作戦開始':'作戦開始'}</button></div>`;
  el.className='show';SFX.deal();S.chars.forEach((c,i)=>setTimeout(()=>SFX.deal(),i*180));
  el.querySelectorAll('.ctc:not(.cpu)').forEach(card=>card.onclick=e=>{e.stopPropagation();card.classList.toggle('flip');card.classList.add('seen');SFX.flip()});
  await askRaw('host',()=>new Promise(res=>{$('#dwOk').onclick=e=>{e.stopPropagation();SFX.click();res(1)};if(!humans.length)setTimeout(()=>res(1),3500)}),w=>{const b=$('#dwOk');if(b&&w){b.disabled=true;b.textContent='ホストの開始を待っています…'}});el.className=''}
const OPIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const dieFace=v=>`<span class="od-die">${Array.from({length:9},(_,k)=>`<i class="${OPIPS[v].includes(k)?'on':''}"></i>`).join('')}</span>`;
async function orderDraw(){const n=S.chars.length;let vals;do{vals=S.chars.map(()=>d6())}while(new Set(vals).size<n);
  const order=S.chars.map((c,i)=>i).sort((a,b)=>vals[b]-vals[a]);
  const apply=()=>{S.chars=order.map(i=>S.chars[i]);S.turn=0;S.meIdx=null;reflowAll()};
  if(window.__FAST){await askRaw('host',async()=>1);apply();return}
  const el=$('#draw');const humans=S.chars.some(mine);
  el.innerHTML=`<div class="dw-box wide"><div class="dw-k">TURN ORDER</div><div class="dw-t">手番の順番を決める</div><div class="dw-s">全員でダイスを1個ずつ振り、<b>大きい目の人から</b>手番を行います</div>
    <div class="od-row">${S.chars.map((c,i)=>`<div class="od" data-i="${i}" style="--c:${c.css}"><img src="${AV[c.id]||''}" alt=""><b>${esc(c.name)}</b><small>${c.cpu?'CPU':''}</small><div class="od-dw">${dieFace(1)}</div><em class="od-rk"></em></div>`).join('')}</div>
    <div class="od-seq"></div><button class="btn big" id="odOk" style="visibility:hidden">作戦開始</button></div>`;
  el.className='show';const cards=[...el.querySelectorAll('.od')];SFX.rattle();
  const stopAt=cards.map((_,i)=>900+i*450);const t0=performance.now();let last={};
  await new Promise(res=>{const tick=()=>{const t=performance.now()-t0;let all=true;
    cards.forEach((cd,i)=>{if(cd._done)return;if(t>=stopAt[i]*TEMPO){cd._done=true;cd.querySelector('.od-dw').innerHTML=dieFace(vals[i]);cd.classList.add('hit');SFX.clack();return}
      all=false;const f=Math.floor(t/70);if(last[i]!==f){last[i]=f;cd.querySelector('.od-dw').innerHTML=dieFace(1+((f*7+i*3)%6))}});
    if(all)res();else requestAnimationFrame(tick)};tick()});
  await wait(350);SFX.reveal();
  order.forEach((ci,rk)=>{const cd=cards[ci];cd.querySelector('.od-rk').textContent=['1st','2nd','3rd','4th','5th'][rk];cd.classList.add('rk'+rk);cd.style.order=rk});
  const seq=el.querySelector('.od-seq');seq.innerHTML=order.map((ci,rk)=>{const c=S.chars[ci];return`<span style="--c:${c.css};animation-delay:${.15*rk}s"><i>${rk+1}</i>${esc(c.name)}</span>`}).join('<u>→</u>');
  log(`手番の順番：${order.map(ci=>nm(S.chars[ci])).join(' → ')}`);
  const ok=$('#odOk');ok.style.visibility='visible';
  await askRaw('host',()=>new Promise(res=>{ok.onclick=e=>{e.stopPropagation();SFX.click();res(1)};if(!humans)setTimeout(()=>res(1),3000)}),w=>{if(w){ok.disabled=true;ok.textContent='ホストの開始を待っています…'}});
  el.className='';apply();renderAll()}
/* ---------- CPU ---------- */
function bfsFrom(goals){const dist={};const q=[];goals.forEach(([r,c])=>{dist[key(r,c)]=0;q.push([r,c])});
  while(q.length){const [r,c]=q.shift();const d=dist[key(r,c)];nbrs(r,c).forEach(([a,b])=>{if(terr(a,b)==='N')return;const k=key(a,b);if(dist[k]==null){dist[k]=d+1;q.push([a,b])}})}return dist}
/* 人らしく動くAI（計測用の「人の代役」。ch.smart=true の団員だけ）：
   チームで「どの標的を誰と誰で攻めるか」を決め、協力できる位置に集まってから挑む */
function smartPlan(){const alive=S.chars.filter(c=>!c.dead);const plan={};const free=new Set(alive.map(c=>c.id));
  const contrib=(c,q)=>c[bestSt(c,q)]+(q.q.stats.includes('hck')&&c.id==='hacker'?1:0)+(c.id==='phantom'?1:0);
  S.quests.map((q,i)=>({q,i})).filter(x=>x.q.revealed&&!x.q.done).sort((a,b)=>(a.q.q.diff-a.q.progress)-(b.q.q.diff-b.q.progress)).forEach(x=>{
    const cands=alive.filter(c=>free.has(c.id)).sort((a,b)=>(contrib(b,x.q)-contrib(a,x.q))+.35*(hexDist(a.r,a.c,x.q.r,x.q.c)-hexDist(b.r,b.c,x.q.r,x.q.c)));
    cands.slice(0,2).forEach(c=>{plan[c.id]=x.i;free.delete(c.id)})});
  const hid=S.quests.map((q,i)=>({q,i})).filter(x=>!x.q.revealed&&!x.q.done);
  alive.filter(c=>free.has(c.id)).forEach(c=>{const h=hid.slice().sort((a,b)=>hexDist(c.r,c.c,a.q.r,a.q.c)-hexDist(c.r,c.c,b.q.r,b.q.c))[0];if(h)plan[c.id]=h.i});
  return plan}
function adjFree(qi,ch){const q=S.quests[qi];return nbrs(q.r,q.c).filter(([r,c])=>terr(r,c)!=='N'&&(!occupied(r,c,ch)||'BS'.includes(terr(r,c))))}
function cpuGoals(ch){
  if(ch.smart&&ch.life>2){const qi=smartPlan()[ch.id];if(qi!=null){if(isAdj(ch,qi))return[[ch.r,ch.c]];const g=adjFree(qi,ch);if(g.length)return g}}
  if(ch.life<=2){const g=[];MAP.forEach((row,r)=>[...row].forEach((t,c)=>{if((t==='B'||t==='S')&&!isBurned(r,c))g.push([r,c])}));return g}
  if(adjQuests(ch).length)return[[ch.r,ch.c]];
  if(ch.greedy&&ch.life>=3&&(S.gauge<10||(ch.contract==='bold'&&S.gauge<14))&&wtOf(ch)<5){const L=S.loot.filter(L=>!L.taken&&hexDist(ch.r,ch.c,L.r,L.c)<=2&&(!occupied(L.r,L.c,ch))).sort((a,b)=>b.val-a.val)[0];if(L)return[[L.r,L.c]]}
  let best=null,bd=99;S.quests.forEach(q=>{if(q.done)return;const d=hexDist(ch.r,ch.c,q.r,q.c);if(d<bd){bd=d;best=q}});
  return best?nbrs(best.r,best.c).filter(([r,c])=>terr(r,c)!=='N'&&(!occupied(r,c,ch)||terr(r,c)==='B'||terr(r,c)==='S')):[[ch.r,ch.c]]}
function smartAction(ch){const A=availActions(ch);const plan=smartPlan();const bst=ch.res.type==='boost'?ch.resv:0;
  const ch2=A.filter(x=>x.k==='challenge').map(x=>{const q=S.quests[x.qi];const helpers=S.chars.filter(o=>o!==ch&&!o.dead&&isAdj(o,x.qi));const need=q.q.diff-q.progress;
    return{x,p:odds(dicePool(ch,q,helpers)+bst,need),coming:S.chars.some(o=>o!==ch&&!o.dead&&!isAdj(o,x.qi)&&plan[o.id]===x.qi&&hexDist(o.r,o.c,q.r,q.c)<=o.move+1),helpers:helpers.length}}).sort((a,b)=>b.p-a.p);
  const best=ch2[0];
  if(best&&(best.p>=.5||S.gauge>=12||!best.coming))return best.x;
  const cmb=combosFor(ch);if(cmb.length)return{k:'combo',id:cmb[0].cb.id};
  const inv=A.find(x=>x.k==='investigate');if(inv)return inv;
  if(best&&best.coming){const rest=A.find(x=>x.k==='rest');if(rest&&ch.life<ch.maxLife)return rest;const adv=A.find(x=>x.k==='adventure');if(adv&&ch.life>=3)return adv;return{k:'wait'}}
  return null}
async function cpuTurn(){const ch=cur();
  // 手番はじめの切り札
  if(ch.id==='hacker'&&trumpOK(ch,'turn')&&(FIRE.includes(S.gauge+1)||S.gauge>=12)){await useTrump(ch)}
  if(ch.id==='informant'&&trumpOK(ch,'turn')&&S.plan>=4&&S.quests.some(q=>!q.revealed)){await useTrump(ch)}
  let warped=false;
  if(ch.id==='disguise'&&S.plan>=4&&trumpOK(ch,'roll')){const dist=bfsFrom(cpuGoals(ch));const here=dist[key(ch.r,ch.c)]??99;
    if(here>=3){let best=null,bd=here;warpTargets(ch).forEach(([r,c])=>{const d=dist[key(r,c)]??99;if(d<bd){bd=d;best=[r,c]}});if(best&&here-bd>=2){await useTrump(ch);await warpTo(ch,best[0],best[1]);warped=true}}}
  if(!warped){if(await doRoll())return;if(S.phase!=='adventure')return;await wait(500);
    const dist=bfsFrom(cpuGoals(ch));
    for(let k=0;k<8;k++){const opts=reachable(ch);const here=dist[key(ch.r,ch.c)]??99;let best=null,bd=here;
      opts.forEach(([r,c])=>{const d=dist[key(r,c)]??99;if(d<bd){bd=d;best=[r,c]}});if(!best)break;await moveStep(ch,best[0],best[1]);await wait(380)}}
  S.step='action';renderAll();await wait(900);
  // 持ち物の整理（買収・換金・渡す）
  if(ch.bag.length){const cheap=ch.bag.map((x,i)=>({x,i})).filter(o=>!(ch.greedy&&o.x.val>=2)).sort((a,b)=>a.x.val-b.x.val);
    if(S.gauge>=11&&cheap.length&&!['art','gem'].includes(ch.contract)){await bagAct(ch,{k:'bribe',i:cheap[0].i});say(ch,'警備員に少し握らせておいた')}
    else if(ch.contract==='boss'){const m=S.chars.find(o=>o!==ch&&!o.dead&&hexDist(o.r,o.c,ch.r,ch.c)<=1);if(m&&ch.bag.length){await bagAct(ch,{k:'give',i:0,m:S.chars.indexOf(m)});say(ch,'取っておけ、'+m.name)}}
    else if(S.plan<2&&cheap.length&&!ch.greedy){await bagAct(ch,{k:'cash',i:cheap[0].i})}}
  if(ch.smart){const a=smartAction(ch);if(a){if(a.k==='challenge'&&ch.res.type==='boost')S.boost=ch.resv;if(a.k==='challenge'&&ch.id==='phantom'&&trumpOK(ch,'turn')&&S.plan>=4)await useTrump(ch);await doAction(a);await finishAction();return}}
  const A=availActions(ch);const ok=x=>{const q=S.quests[x.qi];const bst=ch.res.type==='boost'?ch.resv:0;return dicePool(ch,q,S.chars.filter(o=>o!==ch&&!o.dead&&isAdj(o,x.qi)))+bst>=(q.q.diff-q.progress)*(S.gauge>=10?1.1:1.4)};
  const L=lootHere(ch);const lootA=L&&(ch.greedy||ch.scn>=3||L.diff<=1)&&(S.gauge<11||ch.contract==='bold'||ch.scn>=3)?{k:'loot',L}:null;
  // 運び屋：標的の前で仲間を呼び寄せて協力する
  if(ch.id==='driver'&&S.plan>=3&&trumpOK(ch,'turn')){const qi=adjQuests(ch).find(i=>S.quests[i].revealed);if(qi!=null&&!S.chars.some(o=>o!==ch&&!o.dead&&isAdj(o,qi))){const q=S.quests[qi];
      const spot=freeAdj(ch).find(([r,c])=>nbrs(r,c).some(([a,b])=>a===q.r&&b===q.c));const mate=S.chars.filter(o=>o!==ch&&!o.dead&&hexDist(o.r,o.c,ch.r,ch.c)>1).sort((a,b)=>q.q.stats.reduce((x,st)=>x+b[st],0)-q.q.stats.reduce((x,st)=>x+a[st],0))[0];
      if(spot&&mate){await useTrump(ch,{mate,spot});renderAll()}}}
  const cbs=combosFor(ch);const cmb=cbs.length?{k:'combo',id:cbs[0].cb.id}:null;
  const a=A.find(x=>x.k==='challenge'&&ok(x))||cmb||lootA||A.find(x=>x.k==='investigate')||(ch.life<ch.maxLife-1?A.find(x=>x.k==='rest'):null)||(ch.life>=3?A.find(x=>x.k==='adventure'):null)||A.find(x=>x.k==='challenge')||A.find(x=>x.k==='rest')||{k:'wait'};
  if(a.k==='challenge'&&ch.res.type==='boost')S.boost=ch.resv;
  if(a.k==='challenge'&&ch.id==='phantom'&&trumpOK(ch,'turn')&&S.plan>=4){await useTrump(ch)}
  if(a.k==='rest'&&ch.life<=2)say(ch,pick(['少し休ませてくれ','一度アジトで立て直す','息を整える']));
  if(a.k==='challenge'&&Math.random()<.4)say(ch,pick(['ここは任せてくれ','いける。やるぞ','段取りどおりにいく']));
  await doAction(a);await finishAction()}
