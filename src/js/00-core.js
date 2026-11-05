"use strict";
/* =====================================================================
   GRAND HEIST — 怪盗団テーマの協力ボードゲーム（モック）
   ゲーム状態 S は直列化可能なオブジェクト。オンライン化時はサーバー権威に移せる構造
   ===================================================================== */
const $=s=>document.querySelector(s);
let SPEED=1;          // テスト用の早送り倍率
let TEMPO=1.35;       // 全体のテンポ（大きいほどゆっくり）。演出速度の設定で変わる
const wait=ms=>window.__FAST?Promise.resolve():new Promise(r=>setTimeout(r,ms*SPEED*TEMPO));
// ゲーム進行用の乱数は種（シード）付き。オンラインでは全員が同じ種から同じ結果を再現する（演出用の乱数は Math.random のまま）
let RSEED=1;
function setSeed(n){RSEED=(n>>>0)||1}
function rng(){RSEED=(RSEED+0x6D2B79F5)>>>0;let t=RSEED;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
const d6=()=>1+Math.floor(rng()*6);
const vd6=()=>1+Math.floor(Math.random()*6);
const pick=a=>a[Math.floor(Math.random()*a.length)];   // 演出用
const rpick=a=>a[Math.floor(rng()*a.length)];          // ゲーム進行用
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- DATA ---------------- */
// 地形：大通り=街道(2+)／繁華街=平地(3+)／裏路地=森(5+)／アジト=街／協力者のバー=村／標的=山
const TERRAIN={
  R:{name:'大通り',need:2,top:0x24252e,side:0x111218,h:.24,css:'#3a3b46'},
  C:{name:'繁華街',need:3,top:0x1d2236,side:0x0e1019,h:.3,css:'#2b3352'},
  X:{name:'裏路地',need:5,top:0x2e1c1b,side:0x130c0c,h:.34,css:'#4a2826'},
  B:{name:'アジト',need:2,top:0x143430,side:0x0a1716,h:.4,css:'#1e5a52'},
  S:{name:'協力者のバー',need:2,top:0x15301f,side:0x09150e,h:.36,css:'#1f5233'},
  N:{name:'標的',need:99,top:0x2c2311,side:0x141008,h:.44,css:'#5a4519'}
};
const MAP=[
  "XXCNCCXXCXX",
  "XCCCRCCXCCX",
  "CCSRRCXXCSC",
  "NCCRCCCRRCC",
  "CCRRBRRRCXN",
  "CXCRCCRCCXC",
  "XXCSCXRCSCC",
  "CNCCCXCCRCX",
  "XXCXXXCXCNX"
];
const STATN={bat:'突破',scn:'潜入',hck:'技術'};
const JOBS=[
 {id:'phantom',job:'怪盗',en:'Phantom',css:'#b99cff',col:0xb99cff,life:6,move:3,adv:[2,1],bat:3,scn:2,hck:2,res:{type:'boost',name:'華麗な手並み',max:2},
  ability:'協力して下準備をするとき、全体のダイス+2',role:'リーダー。協力プレイの要',gains:[null,null,{bat:1},{scn:1},{bat:1,life:1},{bat:1,res:1}]},
 {id:'cracker',job:'金庫破り',en:'Safecracker',css:'#f0954a',col:0xf0954a,life:7,move:2,adv:[2,2],bat:4,scn:1,hck:2,res:{type:'boost',name:'集中',max:2},
  ability:'本番の物理錠（突破）でダイス+1',role:'物理錠のエース。足は遅い',gains:[null,null,{bat:1},{life:1,res:1},{bat:1},{bat:1,adv:1}]},
 {id:'hacker',job:'ハッカー',en:'Hacker',css:'#52d4c6',col:0x52d4c6,life:5,move:3,adv:[2,1],bat:2,scn:1,hck:4,res:{type:'boost',name:'スクリプト',max:3},
  ability:'技術を使う下準備と、本番の電子錠でダイス+1',role:'技術の下準備と電子錠を一手に担う',gains:[null,null,{hck:1},{bat:1},{bat:1,res:1},{bat:1}]},
 {id:'driver',job:'運び屋',en:'Driver',css:'#ff5c74',col:0xff5c74,life:5,move:4,adv:[2,1],bat:2,scn:3,hck:1,res:{type:'guard',name:'ドリフト回避',max:2},
  ability:'裏路地に出目4以上で進入でき、裏路地にいる間は移動の6で目撃されない。本番では逃走ルートを確保し、警備隊の到着+1手番',role:'機動力No.1。遠くの標的へ',gains:[null,null,{scn:1},{bat:1},{adv:1},{bat:1,life:1}]},
 {id:'disguise',job:'変装師',en:'Disguise',css:'#ff7fd0',col:0xff7fd0,life:5,move:3,adv:[2,2],bat:2,scn:4,hck:1,res:{type:'guard',name:'早着替え',max:2},
  ability:'自分の移動で出た6を1つまで無視（警戒レベルが上がらない）',role:'警戒を抑え、センサー錠を外す潜入役',gains:[null,null,{scn:1},{bat:1},{bat:1,res:1},{bat:1,life:1}]},
 {id:'bouncer',job:'用心棒',en:'Bouncer',css:'#62e3a4',col:0x62e3a4,life:8,move:2,adv:[2,1],bat:3,scn:1,hck:1,res:{type:'guard',name:'防弾スーツ',max:3},
  ability:'休息の回復量+1',role:'タフな壁役。本番で倒れにくい',gains:[null,null,{life:1},{bat:1},{res:1,adv:1},{bat:1,life:1}]},
 {id:'pickpocket',job:'スリ師',en:'Pickpocket',css:'#f2cf55',col:0xf2cf55,life:5,move:3,adv:[3,2],bat:2,scn:3,hck:1,res:{type:'boost',name:'早業',max:2},
  ability:'小仕事で1の目がファンブルにならない。本番のセンサー錠でダイス+1',role:'小仕事で経験を稼ぐ育成役',gains:[null,null,{adv:1},{bat:1},{scn:1,bat:1},{bat:1,res:1}]},
 {id:'informant',job:'情報屋',en:'Informant',css:'#7ea6ff',col:0x7ea6ff,life:6,move:3,adv:[2,1],bat:2,scn:2,hck:3,res:{type:'boost',name:'コネ',max:2},
  ability:'下見するたびに経験+1。本番の電子錠でダイス+1',role:'標的を暴いて回る斥候',gains:[null,null,{hck:1},{bat:1},{bat:1,life:1},{bat:1,scn:1}]}
];
const JOBX={
  phantom:{skill:'指揮',weak:'飛び抜けた能力がない。単独より協力向き'},
  cracker:{skill:'金庫破りの勘',weak:'移動2で足が遅い。潜入1で隠密は苦手'},
  hacker:{skill:'ハッキング',weak:'スタミナ5・突破2。荒事に弱い'},
  driver:{skill:'抜け道',weak:'技術1で電子錠は苦手。物理錠も決め手に欠ける。移動ダイスが多い分、大通りでは6が出やすい'},
  disguise:{skill:'なりすまし',weak:'突破2・技術1。物理錠と電子錠は苦手'},
  bouncer:{skill:'タフネス',weak:'移動2で足が遅い。潜入1・技術1'},
  pickpocket:{skill:'器用な指先',weak:'技術1で電子錠は苦手。物理錠も決め手に欠ける'},
  informant:{skill:'情報網',weak:'突破2で物理錠は苦手'}};
JOBS.forEach(j=>Object.assign(j,JOBX[j.id]));
const XP_LV=[0,0,2,5,9,14];
const QUESTS=[
 {name:'警備シフト表を盗む',stats:['scn'],diff:4},
 {name:'金庫の設計図',stats:['hck'],diff:4},
 {name:'逃走車の調達',stats:['bat'],diff:3},
 {name:'内通者の買収',stats:['scn'],diff:3},
 {name:'偽造IDの作成',stats:['hck','scn'],diff:4},
 {name:'監視カメラ網の掌握',stats:['hck','bat'],diff:5},
 {name:'警備主任の足止め',stats:['bat','scn'],diff:5}
];
const REWARDS=[
 {id:'rail',name:'特注ピッキングツール',text:'本番で全員の突破ダイス+1'},
 {id:'med',name:'アジトの差し入れ',text:'全員のスタミナ上限+1、全回復'},
 {id:'sat',name:'暗証番号の断片',text:'本番開始時、ロックを1段解除（電子錠を優先）'},
 {id:'exo',name:'装備の新調',text:'全員のリソース上限+1、全回復'},
 {id:'weak',name:'警備の死角',text:'本番の判定ごとに、1の目を1つだけファンブルにしない'}
];
const FIRE=[4,8,12];
const GAUGE_MAX=15;
const LOCKS=9, ALARMS=[6,3];
// 今夜の金庫：毎回ランダム。ロック9つの種類の内訳が変わる（編成を決めた後に公開）
const VAULTS=[
 {id:'std',short:'標準',name:'オーロラ標準型',counts:{bat:3,hck:3,scn:3},text:'物理錠・電子錠・センサー錠が3つずつ'},
 {id:'old',short:'旧式',name:'旧式の大金庫',counts:{bat:5,hck:2,scn:2},text:'物理錠が5つ。腕っぷしが頼り'},
 {id:'cyber',short:'電子',name:'最新の電子金庫',counts:{bat:2,hck:5,scn:2},text:'電子錠が5つ。技術者が鍵を握る'},
 {id:'laser',short:'センサー',name:'センサー網の金庫',counts:{bat:2,hck:2,scn:5},text:'センサー錠が5つ。忍び込みの腕が試される'}];

/* ---------------- 拡張：段取り・切り札・連携技・お宝・裏の依頼 ---------------- */
const PLAN_START=2, PLAN_MAX=8;
// 切り札：段取りを払って使う。when=turn(自分の手番)/roll(移動の代わり)/final(本番)/auto(割り込み)
const TRUMP={
 phantom:{name:'華麗なる予告状',cost:3,when:'turn',text:'このラウンドの間、下準備の判定で参加者1人につきダイス+1'},
 cracker:{name:'金庫の声を聴く',cost:3,when:'final',text:'本番：この手番の金庫判定に成功数+2（どのロックでも）'},
 hacker:{name:'監視カメラ停止',cost:3,when:'turn',text:'警戒レベルを2下げる（本番では警備隊の到着を2手番遅らせる）'},
 driver:{name:'逃走車待機',cost:2,when:'turn',text:'仲間1人を自分の隣のマスへ呼び寄せる。逃走では全員のダイス+1'},
 disguise:{name:'なりすまし入館',cost:2,when:'roll',text:'移動ダイスを振らず、3マス以内の好きなマスへ（警戒は上がらない）'},
 bouncer:{name:'身代わり',cost:2,when:'auto',text:'【割り込み】仲間が受ける2以上のダメージを肩代わりする'},
 pickpocket:{name:'すり替え',cost:2,when:'auto',text:'【割り込み】誰かの判定で出た1の目を1つ振り直す'},
 informant:{name:'裏ルート',cost:2,when:'turn',text:'標的1つを公開し、その必要成功数を1減らす'}};
// 連携技：2人が隣接（または同じマス）にいるとアクションとして使える。各1ゲーム1回
const COMBOS=[
 {id:'scan',a:'cracker',b:'hacker',name:'金庫解析',text:'本番の金庫判定ダイスが全員+2'},
 {id:'force',a:'cracker',b:'bouncer',name:'力業',text:'2人の次の判定で1の目がファンブルにならない'},
 {id:'leak',a:'hacker',b:'informant',name:'データ流出',text:'伏せた標的をすべて公開し、段取り+2'},
 {id:'keys',a:'pickpocket',b:'informant',name:'鍵束の拝借',text:'3マス以内のお宝1つを判定なしで入手し、段取り+1'},
 {id:'shadow',a:'phantom',b:'disguise',name:'二重の影',text:'警戒レベル-1。2人の次の判定でダイス+1'},
 {id:'notice',a:'phantom',b:'pickpocket',name:'予告どおり',text:'2人とも「予告状の品」（価値1・重さ0）を入手'},
 {id:'rush',a:'driver',b:'bouncer',name:'強行突破',text:'2人の次の判定でダイス+2'},
 {id:'slip',a:'driver',b:'disguise',name:'すり抜け',text:'逃走で2人とも1回だけ失敗を成功にする'}];
// お宝：拾った本人のもの。持ち帰れば名誉点、使えばチームの力
const LOOT_T={
 s:{name:'小粒',val:1,wt:1,diff:1,col:0x9fe8ff,css:'#9fe8ff',items:['金の懐中時計','ルビーの指輪','真珠の首飾り','金貨の袋']},
 m:{name:'上物',val:2,wt:2,diff:2,col:0xc8a6ff,css:'#c8a6ff',items:['名画「夜の踊り子」','宝石箱','古代の黄金像']},
 x:{name:'至宝',val:4,wt:3,diff:3,col:0xffe7a0,css:'#ffe7a0',items:['伝説のダイヤ「オーロラの涙」']}};
const wtOf=c=>c.bag.reduce((a,x)=>a+x.wt,0), valOf=c=>c.bag.reduce((a,x)=>a+x.val,0);
// 裏の依頼：非公開の個人目標。達成で名誉点ボーナス（勝敗には無関係）
const CONTRACTS=[
 {id:'art',name:'美術品コレクター',text:'上物以上のお宝を2つ持ち帰る',pts:3,chk:c=>c.escaped&&c.bag.filter(x=>x.val>=2).length>=2},
 {id:'gem',name:'至宝狙い',text:'伝説のダイヤを持ち帰る',pts:3,chk:c=>c.escaped&&c.bag.some(x=>x.t==='x')},
 {id:'bold',name:'大胆不敵',text:'警戒レベル12以上のときにお宝を拾う',pts:3,chk:c=>c.st.bold},
 {id:'clean',name:'無傷の美学',text:'一度も確保されずに逃げ切る',pts:2,chk:c=>c.escaped&&!c.st.down},
 {id:'light',name:'身軽主義',text:'重さ0で逃げ切る',pts:2,chk:c=>c.escaped&&wtOf(c)===0},
 {id:'shade',name:'影の功労者',text:'自分の行動で段取りを合計4個以上稼ぐ',pts:2,chk:c=>c.st.plan>=4},
 {id:'boss',name:'気前のいい親分',text:'仲間にお宝を2回以上渡す',pts:2,chk:c=>c.st.give>=2},
 {id:'bribe',name:'買収の達人',text:'お宝の「買収」を2回使う',pts:2,chk:c=>c.st.bribe>=2},
 {id:'duo',name:'名コンビ',text:'連携技に2回以上参加する',pts:2,chk:c=>c.st.combo>=2},
 {id:'first',name:'一番乗り',text:'金庫のロックを自分の判定で最初に外す',pts:2,chk:c=>c.st.firstLock}];
const ESC_CP=[{name:'裏口',stat:'scn',base:1},{name:'路地裏',stat:'move',base:1},{name:'検問突破',stat:'bat',base:2}];
// ピークロールの成功率表（モンテカルロで起動時に作る）。PK[n][k]=成功数k以上になる確率
const PK=(()=>{let ps=20251030;const pd6=()=>{ps=(ps+0x6D2B79F5)>>>0;let t=ps;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return 1+Math.floor((((t^(t>>>14))>>>0)/4294967296)*6)};const T=[];for(let n=0;n<=22;n++){const cnt={};const N=3000;for(let i=0;i<N;i++){let s=0;for(let d=0;d<n;d++){const v=pd6();if(v===1)s--;else if(v>=4)s++;if(v===6){for(let w=0;w<8;w++){const e=pd6();if(e===1){s--;break}s++;if(e!==6)break}}}cnt[s]=(cnt[s]||0)+1}
  const row={};for(let k=-6;k<=16;k++){let a=0;for(const [v,c] of Object.entries(cnt))if(+v>=k)a+=c;row[k]=a/N}T.push(row)}return T})();
const odds=(n,need)=>{n=Math.max(0,Math.min(22,n));need=Math.max(-6,Math.min(16,need));return PK[n][need]};
const pct=p=>Math.round(p*100)+'%';

/* ---------------- STATE ---------------- */
let S=null;
function newState(seats){
  const nests=[];MAP.forEach((row,r)=>[...row].forEach((t,c)=>{if(t==='N')nests.push([r,c])}));
  const qs=shuffle(QUESTS.slice()).slice(0,5), rw=shuffle(REWARDS.slice());
  const base=findTile('B');
  const quests=nests.map((n,i)=>({r:n[0],c:n[1],q:{...qs[i]},reward:rw[i],revealed:false,done:false,progress:0}));
  let far=0,fd=-1;quests.forEach((q,i)=>{const d=hexDist(base[0],base[1],q.r,q.c);if(d>fd){fd=d;far=i}});quests[far].revealed=true;
  const chars=seats.map(s=>{const d=JOBS.find(j=>j.id===s.job);const c=JSON.parse(JSON.stringify(d));
    return{...c,name:(s.name||'').trim()||d.job,cpu:s.cpu,owner:s.owner||null,lv:1,xp:0,maxLife:d.life,life:d.life,resMax:d.res.max,resv:d.res.max,r:base[0],c:base[1],dead:false,
      bag:[],buff:{dice:0,noF:false,slip:false},st:{plan:0,give:0,bribe:0,combo:0,drop:0,lost:0,bold:false,firstLock:false,down:false},greedy:rng()<.5}});
  const ct=shuffle(CONTRACTS.map(x=>x.id));chars.forEach((c,i)=>{c.contract=ct[i];if(['art','gem','bold'].includes(c.contract))c.greedy=true;if(['light','clean'].includes(c.contract))c.greedy=false});
  // お宝の配置：アジトから2マス以上離れた大通り・繁華街・裏路地。至宝はいちばん遠い候補から
  const cand=[];MAP.forEach((row,r)=>[...row].forEach((t,c)=>{if('RCX'.includes(t)){const d=hexDist(base[0],base[1],r,c);if(d>=2&&!quests.some(q=>q.r===r&&q.c===c))cand.push({r,c,d})}}));
  shuffle(cand);const used=[];const farC=cand.slice().sort((a,b)=>b.d-a.d);const loot=[];
  const put=(t,pool)=>{const p=pool.find(x=>!used.some(u=>hexDist(u.r,u.c,x.r,x.c)<2));if(!p)return;used.push(p);const T=LOOT_T[t];const nameList=T.items;
    loot.push({id:loot.length,r:p.r,c:p.c,t,name:nameList[loot.filter(x=>x.t===t).length%nameList.length],val:T.val,wt:T.wt,diff:T.diff,taken:false})};
  put('x',farC.slice(0,6));['m','m','m','s','s','s','s'].forEach(t=>put(t,cand));
  return {vlayout:null,phase:'adventure',chars,turn:0,round:1,step:'roll',moveDice:[],gauge:1,quests,burned:[],locks:LOCKS,chain:0,boost:0,
    plan:PLAN_START,loot,combos:{},vault:(()=>{const V=rpick(VAULTS);return V.id})(),noticeRound:0,crackerBonus:0,escBonus:0,
    bonus:{bat:0,sat:false,noFumble:false,scan:false},rewardsGot:[],alarmsHit:[],t0:Date.now(),stats:{rolls:0,crit:0,fumble:0,turns:0}};
}
const cur=()=>S.chars[S.turn];
const isHuman=()=>!!(S&&cur()&&mine(cur()));

/* ---------------- HEX ---------------- */
const ROWS=MAP.length, COLS=MAP[0].length;
function hexPos(r,c){return{x:Math.sqrt(3)*(c+0.5*(r&1)-(COLS-1)/2-0.25),z:1.5*(r-(ROWS-1)/2)}}
const DE=[[0,1],[0,-1],[-1,-1],[-1,0],[1,-1],[1,0]], DO=[[0,1],[0,-1],[-1,0],[-1,1],[1,0],[1,1]];
function nbrs(r,c){return(r&1?DO:DE).map(([dr,dc])=>[r+dr,c+dc]).filter(([a,b])=>a>=0&&a<ROWS&&b>=0&&b<COLS)}
function cube(r,c){const x=c-(r-(r&1))/2,z=r;return[x,-x-z,z]}
function hexDist(r1,c1,r2,c2){const a=cube(r1,c1),b=cube(r2,c2);return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]))}
function findTile(t){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(MAP[r][c]===t)return[r,c]}
const terr=(r,c)=>MAP[r][c];
const isBurned=(r,c)=>S.burned.some(b=>b[0]===r&&b[1]===c);
function needFor(ch,t){if(ch.id==='driver'&&t==='X')return 4;return TERRAIN[t].need}
function occupied(r,c,except){return S.chars.some(ch=>ch!==except&&!ch.dead&&ch.r===r&&ch.c===c)}
function questAt(r,c){return S.quests.findIndex(q=>q.r===r&&q.c===c)}
function adjQuests(ch){return nbrs(ch.r,ch.c).map(([r,c])=>questAt(r,c)).filter(i=>i>=0&&!S.quests[i].done)}
function isAdj(ch,qi){const q=S.quests[qi];return nbrs(ch.r,ch.c).some(([r,c])=>r===q.r&&c===q.c)}
