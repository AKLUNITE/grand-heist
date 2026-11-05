/* =====================================================================
   TITLE / CREW SETUP
   ===================================================================== */
const SEATS=[
  {on:true,name:'プレイヤー1',job:'phantom',cpu:false},
  {on:true,name:'団員2',job:'cracker',cpu:true},
  {on:true,name:'団員3',job:'hacker',cpu:true},
  {on:true,name:'団員4',job:'driver',cpu:true},
  {on:false,name:'団員5',job:'disguise',cpu:true}];
const jobOf=id=>JOBS.find(j=>j.id===id);
function fixJobs(){const used=new Set();SEATS.forEach(s=>{if(!s.on)return;if(used.has(s.job))s.job=JOBS.find(j=>!used.has(j.id)).id;used.add(s.job)})}
function seatCan(s){return!NET.on||s.owner===CID||(NET.host&&!s.owner)}
function seatNetCtl(s,i){const dis=s.on?'':'disabled';const mem=s.owner&&NET.lobby&&NET.lobby.members[s.owner];
  if(s.owner===CID)return`<div class="pc"><button class="sel" disabled>あなたが操作</button><button data-sop="${i}:cpu" ${dis}>CPUに戻す</button></div>`;
  if(s.owner)return`<div class="pc"><button class="sel other" disabled>${esc(mem?mem.name:'ゲスト')}${mem&&!mem.online?'（切断中）':''}</button>${NET.host?`<button data-sop="${i}:cpu" ${dis}>CPUにする</button>`:'<button disabled>操作中</button>'}</div>`;
  return`<div class="pc"><button class="sit" data-sop="${i}:sit" ${dis}>ここに座る</button><button class="sel" disabled>CPU</button></div>`}
function renderSeats(){if(!NET.on)fixJobs();const used=SEATS.filter(s=>s.on).map(s=>s.job);
  $('#seats').innerHTML=SEATS.map((s,i)=>{const j=jobOf(s.job);
    return`<div class="seat ${s.on?'on':'off'}" style="--c:${j.css}">
      <div class="shead"><span class="eyebrow" style="color:var(--c)">Crew ${i+1}</span><button class="tog" data-tog="${i}" ${NET.on&&!NET.host?'disabled':''}>${s.on?'参加中':'空席'}</button></div>
      <input id="nm${i}" maxlength="10" value="${esc(s.name)}" aria-label="団員${i+1}の名前" ${s.on&&seatCan(s)?'':'disabled'}>
      <select id="jb${i}" aria-label="団員${i+1}の職業" ${s.on&&seatCan(s)?'':'disabled'}>${JOBS.map(x=>`<option value="${x.id}" ${x.id===s.job?'selected':''} ${x.id!==s.job&&used.includes(x.id)&&s.on?'disabled':''}>${x.job}</option>`).join('')}</select>
      ${NET.on?seatNetCtl(s,i):`<div class="pc"><button class="${!s.cpu?'sel':''}" data-pc="${i}:0" ${s.on?'':'disabled'}>プレイヤー</button><button class="${s.cpu?'sel':''}" data-pc="${i}:1" ${s.on?'':'disabled'}>CPU</button></div>`}
      <div class="d"><b>★${j.skill}</b>　${j.ability}</div><div class="wk">▼弱み　${j.weak}</div>
      <div class="s"><span>突破<b>${j.bat}</b></span><span>潜入<b>${j.scn}</b></span><span>技術<b>${j.hck}</b></span><span>スタミナ<b>${j.life}</b></span><span>移動<b>${j.move}</b></span><span>小仕事<b>${j.adv.join('/')}</b></span></div>
      <div class="r">${j.res.name}：${j.res.type==='boost'?'ダイス追加':'ダメージ軽減'} ×${j.res.max}</div></div>`}).join('');
  if(NET.on){document.querySelectorAll('[data-tog]').forEach(b=>b.onclick=()=>{if(AU.ctx)SFX.click();seatReq(+b.dataset.tog,'on')});
    document.querySelectorAll('[data-sop]').forEach(b=>b.onclick=()=>{if(AU.ctx)SFX.click();const [i,op]=b.dataset.sop.split(':');seatReq(+i,op)});
    SEATS.forEach((s,i)=>{$('#nm'+i).onchange=e=>seatReq(i,'name',e.target.value);$('#jb'+i).onchange=e=>{if(AU.ctx)SFX.whoosh();seatReq(i,'job',e.target.value)}});
    stageBuild();return}
  document.querySelectorAll('[data-tog]').forEach(b=>b.onclick=()=>{const i=+b.dataset.tog;SEATS[i].on=!SEATS[i].on;if(AU.ctx)SFX.click();renderSeats()});
  document.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>{const [i,v]=b.dataset.pc.split(':');SEATS[+i].cpu=v==='1';if(AU.ctx)SFX.click();renderSeats()});
  SEATS.forEach((s,i)=>{$('#nm'+i).oninput=e=>{s.name=e.target.value};$('#jb'+i).onchange=e=>{s.job=e.target.value;if(AU.ctx)SFX.whoosh();renderSeats()}});
  stageBuild()}

function renderNetPanel(){const el=$('#netpanel');if(!el)return;const st=NET.status;
  const bs=$('#bStart');if(bs){bs.textContent=NET.on&&!NET.host?'ホストの開始を待っています':'決行する';bs.classList.toggle('waiting',NET.on&&!NET.host)}
  if(!NET.on){el.innerHTML=`<div class="np"><div class="np-h"><b>オンラインで遊ぶ</b><span>各自の端末から同じ部屋に入って遊べます（Discordで話しながら）。1人で遊ぶときはこのまま下の編成から決行</span></div>
    <div class="np-row"><label>あなたの名前<input id="npName" maxlength="10" value="${esc(lsGet('gh_name',''))}" placeholder="例：ルパン"></label></div>
    <div class="np-row np-go"><button class="btn" id="npCreate">部屋を作る<small>あなたがホストになる</small></button>
      <div class="np-join"><input id="npCode" maxlength="6" placeholder="部屋のコード" autocomplete="off"><button class="btn" id="npJoin">入る</button></div></div></div>`;
    const nm=$('#npName');nm.oninput=()=>lsSet('gh_name',nm.value.trim());
    $('#npCreate').onclick=()=>{if(AU.ctx)SFX.click();lsSet('gh_name',nm.value.trim());netCreate()};
    const jn=()=>{if(AU.ctx)SFX.click();lsSet('gh_name',nm.value.trim());netJoin($('#npCode').value)};$('#npJoin').onclick=jn;$('#npCode').onkeydown=e=>{if(e.key==='Enter')jn()};return}
  if(st==='opening'||st==='joining'){el.innerHTML=`<div class="np"><div class="np-h"><b>${st==='opening'?'部屋を作っています…':'部屋に接続しています…'}</b><span>${NET.code?`コード ${NET.code}`:''}</span></div><div class="np-row"><button class="btn ghost" id="npLeave">やめる</button></div></div>`;$('#npLeave').onclick=netLeave;return}
  const L=NET.lobby||{members:{}};const mem=Object.entries(L.members).map(([cid,m])=>`<span class="mb ${m.online===false?'off':''}"><i></i>${esc(m.name)}${m.host?'<em>ホスト</em>':''}${cid===CID?'<em>あなた</em>':''}</span>`).join('');
  el.innerHTML=`<div class="np in"><div class="np-code"><small>部屋のコード</small><b>${NET.code||'—'}</b>${NET.host?`<button class="btn ghost" id="npCopy">コピー</button>`:''}</div>
    <div class="np-h"><b>${NET.host?'あなたはホストです':'部屋に入りました'}${NET.host?((NET.peer?(NET.peer.open&&!NET.peer.disconnected):(NET.sig&&NET.sig.readyState===1))?'<em class="sg ok">受付中</em>':'<em class="sg ng">再接続中…</em>'):''}</b><span>${NET.host?'このページを開いた友達に、上のコードを伝えてください（Discordに貼るのが簡単）。下の席で「ここに座る」を押した人がその団員を操作し、空いた席はCPUが動かします。全員そろったら「決行する」':'下の席から「ここに座る」で操作する団員を選び、職業を決めてください。開始はホストが行います'}</span></div>
    <div class="np-mem">${mem}</div><div class="np-row"><button class="btn ghost" id="npLeave">部屋を出る</button></div></div>`;
  $('#npLeave').onclick=()=>{if(AU.ctx)SFX.click();netLeave()};const cp=$('#npCopy');if(cp)cp.onclick=()=>{try{navigator.clipboard.writeText(NET.code);netToast('コードをコピーしました')}catch(e){netToast('コピーできませんでした。手で伝えてください')}}}
function showJobs(){modal(`<h3>職業一覧</h3><p>経験が2・5・9・14たまるとレベル2〜5に上がり、職業ごとに決まった能力が伸びます。</p><div class="jobgrid">${JOBS.map(j=>`<div class="jobcard" style="--c:${j.css}">
  <img src="${AV[j.id]||''}" alt=""><div><span class="eyebrow" style="color:var(--mute)">${j.en}</span><div class="jn">${j.job}</div></div><p>${j.role}</p>
  <p style="grid-column:1/3"><b>★${j.skill}：</b>${j.ability}</p><p style="grid-column:1/3;color:#ffb3bd">▼弱み：${j.weak}</p>
  <div class="js" style="grid-column:1/3">突破 ${j.bat}　潜入 ${j.scn}　技術 ${j.hck}　スタミナ ${j.life}　移動 ${j.move}　小仕事 ${j.adv.join('/')}　${j.res.name}×${j.res.max}</div>
  <p style="grid-column:1/3;color:var(--mute)">成長：${j.gains.slice(2).map((g,k)=>`Lv${k+2} ${Object.entries(g).map(([a,v])=>GAINN[a]+'+'+v).join(' ')}`).join(' ／ ')}</p></div>`).join('')}</div>`,[{label:'閉じる',v:0,cls:'ghost'}],true)}
function rulesHTML(){const t=(id,label)=>`<button class="rtab" data-t="${id}">${label}</button>`;
return`<h3>遊び方</h3>
<div class="rtabs">${t('a','① はじめに')}${t('b','② 手番の進め方')}${t('c','③ ダイス判定')}${t('d','④ 本番と逃走')}${t('e','⑤ 応用ルール')}</div>
<div class="rpage" data-p="a">
  <p class="rlead">全員で力を合わせて、カジノの地下金庫を破る<b>協力ゲーム</b>です。チーム全員で勝つか、全員で負けるかのどちらかです。</p>
  <div class="rflow">
    <div><em>1</em><b>下見</b><span>街を歩き回り、金庫破りの準備（下準備）を5つ揃える</span></div><i>→</i>
    <div><em>2</em><b>本番</b><span>金庫のロック9段を順番に外す。警備隊が来る前に！</span></div><i>→</i>
    <div><em>3</em><b>逃走</b><span>お宝を抱えて3つの関門を抜け、逃げ切る</span></div>
  </div>
  <div class="rbox"><b>勝ち</b>：本番で金庫のロックを全部外す。　<b>負け</b>：全員が警察に捕まる。</div>
  <div class="rbox"><b>名誉点</b>：勝ち負けとは別に、各自が持ち帰ったお宝と「裏の依頼」の達成で名誉点を競い、最後に表彰式でMVPを決めます。</div>
  <h4>最初に覚えるのはこれだけ</h4>
  <ul><li>自分の番が来たら<b>「移動ダイスを振る」</b>を押す → 光ったマスを選んで移動 → 下に出るボタンから<b>行動を1つ</b>選ぶ。</li>
  <li>ボタンにはそれぞれ<b>成功率</b>が出ます。迷ったら成功率の高いものを。</li>
  <li>細かい数字は、ゲーム中の上部の<b>「早見表」</b>でいつでも確認できます。</li>
  <li><b>友達と遊ぶ</b>：タイトルの「オンラインで遊ぶ」で1人が部屋を作り、出てきたコードを他の人に伝えます。各自が自分の端末で入り、「ここに座る」で操作する団員を選びます。</li></ul>
  <button class="rnext" data-t="b">次へ：② 手番の進め方 →</button>
</div>
<div class="rpage" data-p="b">
  <h4>1. 移動ダイスを振る</h4>
  <p>移動力の数だけダイスを振り、<b>出目1つで隣のマスに1歩</b>進みます。マスごとに必要な出目が違います。</p>
  <div class="rrow">大通り・アジト・バー ${md('2+')}　繁華街 ${md('3+')}　裏路地 ${md('5+')}</div>
  <div class="rwarn">${md(6,'r')} が出るたびに誰かに目撃され、<b>警戒レベルが1上がる</b>（6も移動には使えます）</div>
  <h4>2. 行動を1つ選ぶ</h4>
  <div class="rgrid">
    <div><b>下見</b><span>隣にある「？」の標的カードをめくり、中身（何の判定で、何回成功が必要か）を知る</span></div>
    <div><b>下準備</b><span>めくった標的の隣で判定。成功で<b>報酬カード</b>（全員に効く強化）が手に入る。5つ揃えば本番へ</span></div>
    <div><b>小仕事</b><span>繁華街・裏路地で軽く稼いで経験を積む。経験がたまるとレベルアップ</span></div>
    <div><b>休息</b><span>アジトかバーでスタミナを回復</span></div>
  </div>
  <p>同じ標的の隣にいる仲間がいれば<b>協力</b>でき、全員のダイスを合わせて判定できます。</p>
  <h4>警戒レベル（画面上部のゲージ）</h4>
  <p>6の目などで上がっていきます。<b>◆の位置（4・8・12）</b>で警察が動き、<b>15まで行くと強行突入</b>になり、準備が途中でも本番が始まってしまいます（不利な状態から）。</p>
  <button class="rnext" data-t="c">次へ：③ ダイス判定 →</button>
</div>
<div class="rpage" data-p="c">
  <p class="rlead">判定では、能力値（突破・潜入・技術など）の数だけダイスを振り、出目を合計して<b>成功数</b>を出します。成功数が<b>必要成功数</b>に届けば成功です。</p>
  <div class="rdice">
    <div>${md(1,'r')}<span>−1（ファンブル）</span></div>
    <div>${md(2,'z')}${md(3,'z')}<span>±0</span></div>
    <div>${md(4,'g')}${md(5,'g')}<span>+1</span></div>
    <div>${md(6,'y')}<span>+1　さらに1個振り足す</span></div>
  </div>
  <p>振り足したダイスは <b>2以上なら+1</b>、1なら−1。6ならさらに振り足せます。</p>
  <div class="rbox"><b>例</b>：潜入3で ${md(6,'y')} ${md(4,'g')} ${md(1,'r')} が出た → 6で振り足して ${md(3,'gold')}<br>＝ 6（+1）＋ 振り足し3（+1）＋ 4（+1）＋ 1（−1）＝ <b>成功数2</b></div>
  <p>判定の前に、スタミナとは別の<b>リソース</b>（職業ごとに名前が違う）を使ってダイスを増やしたり、ダメージを減らしたりできます。</p>
  <button class="rnext" data-t="d">次へ：④ 本番と逃走 →</button>
</div>
<div class="rpage" data-p="d">
  <h4>本番：金庫のロック9段</h4>
  <p>ロックは<b>外周・中層・最深部</b>の3層に3つずつ。手番ごとに今の層のロックを1つ選んで判定します。ロックの種類で使う能力値が決まります。</p>
  <div class="rrow"><span class="lk" style="--lc:#f0954a">物理錠＝突破</span><span class="lk" style="--lc:#52d4c6">電子錠＝技術</span><span class="lk" style="--lc:#ff7fd0">センサー錠＝潜入</span></div>
  <p>団員ごとに、錠前の種類への<b>適性</b>があります（その能力値が3以上なら◎、2なら○、1なら×。担当職業のダイス+1も含む）。</p>
  <div class="rgrid">
    <div><b>◎得意</b><span>必要成功数 −1</span></div><div><b>○普通</b><span>そのまま</span></div>
    <div><b>×苦手</b><span>必要成功数 +1。一番高い能力値で代用して挑むこともできる（必要+1）。ボタンには有利な方が自動で出ます</span></div>
    <div><b>必要成功数</b><span>○で 外周${md(VSTAGE[0].base)} 中層${md(VSTAGE[1].base)} 最深部${md(VSTAGE[2].base)}</span></div>
  </div>
  <h4>錠前の性格</h4>
  <div class="rgrid">
    <div><b style="color:#f0954a">物理錠</b><span>${LTRAIT.bat.long}</span></div>
    <div><b style="color:#52d4c6">電子錠</b><span>${LTRAIT.hck.long}</span></div>
    <div><b style="color:#ff7fd0">センサー錠</b><span>${LTRAIT.scn.long}</span></div>
    <div><b>作戦</b><span>各錠前の「◎担当」が画面に出ます。誰がどの錠前を開けるか、どの順に開けるかを相談しよう</span></div>
  </div>
  <p>どの種類が多いかは毎回「今夜の金庫」の抽選で変わります。</p>
  <div class="rgrid">
    <div><b>ぴったり成功</b><span>1段外れる。+1なら2段、+2以上なら3段まとめて外れる</span></div>
    <div><b>あと1つ足りない</b><span>1段外れるが、自分が1ダメージ</span></div>
    <div><b>足りない（成功数2以上）</b><span>外れないが、次の仲間のダイス+2（連携）</span></div>
    <div><b>成功数1以下</b><span>しくじって自分がダメージ（1なら1、0なら2、マイナスなら3）</span></div>
  </div>
  <div class="rwarn"><b>時間制限</b>：本番開始から8手番（強行突入なら5手番）で警備隊が到着し、以後は毎手番巡回ダメージ。<b>「強引にこじ開ける」</b>を選ぶとダイス+3の代わりに警備隊が早く来ます。</div>
  <h4>逃走：3つの関門</h4>
  <p>金庫を破ったら、<b>裏口（潜入）→ 路地裏（移動）→ 検問（突破）</b>を1人ずつ抜けます。お宝が重いほど難しくなり、2回失敗するとその団員は逮捕（お宝は没収）。逃げ切った仲間は、お宝を差し出して捕まった仲間を保釈できます。</p>
  <button class="rnext" data-t="e">次へ：⑤ 応用ルール →</button>
</div>
<div class="rpage" data-p="e">
  <details open><summary>段取りと切り札</summary><p>段取りはチーム共有のポイント（最初2・最大8）。下見・下準備の達成・お宝の換金で増えます。各職業は段取りを払って<b>切り札</b>（職業ごとの必殺技）を使えます。「割り込み」と書かれた切り札は他の人の番でも使えます。</p></details>
  <details><summary>連携技</summary><p>決まった2職業が隣同士（同じマスも可）にいるとき、行動として使える合わせ技。それぞれ1ゲームに1回だけ。使えるときはシートに ⚡ が出ます。</p></details>
  <details><summary>お宝</summary><p>マスに置かれたお宝は「お宝を盗む」（潜入の判定）で手に入ります。失敗しても手に入りますが警戒レベル+1。お宝は拾った人のもので、持ち帰れば名誉点。重さの合計が4以上だと移動ダイス−1。手番中いつでも、換金（段取り+）・買収（警戒−）・隣の仲間に渡すことができます。</p></details>
  <details><summary>裏の依頼</summary><p>ゲーム開始時に1人1枚ずつ配られる秘密の目標。達成すると表彰式で名誉点ボーナス。他の人には見せないのがお約束です。</p></details>
  <details><summary>スタミナ・確保・奇跡の脱出</summary><p>スタミナが0になるとその団員は確保されます。下見の間に誰かが確保されたら全員がダイスを1個ずつ振り、6が1つでもあれば全員アジトで復活（失敗で敗北）。本番では全員確保で敗北です。</p></details>
  <details><summary>小仕事の結果</summary><p>成功数 −1以下＝1ダメージ／0＝何もなし／1＝経験+1と1ダメージ／2以上＝経験+1。</p></details>
  <details><summary>表彰式</summary><p>勝ち負けに関係なく、持ち帰ったお宝の価値＋裏の依頼のボーナスが名誉点。MVPのほか縁の下賞・名コンビ賞・強欲賞を発表し、チームには怪盗ランク（S〜D）が付きます。</p></details>
</div>`}
function showRules(){modal(rulesHTML(),[{label:'閉じる',v:0,cls:'ghost'}],true);const box=$('#modal .box');
  const go=id=>{box.querySelectorAll('.rtab').forEach(b=>b.classList.toggle('on',b.dataset.t===id));box.querySelectorAll('.rpage').forEach(p=>p.hidden=p.dataset.p!==id);const mb=box.querySelector('.mbody');if(mb)mb.scrollTop=0};
  box.querySelectorAll('.rtab,.rnext').forEach(b=>b.onclick=()=>{SFX.click();go(b.dataset.t)});go('a')}
function showRef(){modal(`<h3>早見表</h3><div class="ref">
  <section><h4>手番の流れ</h4><ol><li>移動ダイスを振る（6の数だけ警戒+1）</li><li>出目を1つずつ使って移動</li><li>アクションカードを1枚出す</li></ol></section>
  <section><h4>1マス進むのに必要な出目</h4><div class="row">大通り・アジト・バー ${md('2+')}</div><div class="row">繁華街 ${md('3+')}</div><div class="row">裏路地 ${md('5+')}（運び屋は${md('4+')}）</div></section>
  <section><h4>判定（ピークロール）</h4><div class="row">${md(1,'r')} −1</div><div class="row">${md(2,'z')}${md(3,'z')} ±0</div><div class="row">${md(4,'g')}${md(5,'g')} +1</div><div class="row">${md(6,'y')} +1、もう1個振る（2以上で+1）</div></section>
  <section><h4>アクション</h4><ul><li>下見：伏せた標的をめくる</li><li>下準備：判定で報酬カード入手</li><li>小仕事：成功数2以上で経験+1</li><li>休息：スタミナ+2（アジトはリソースも回復）</li></ul></section>
  <section><h4>警戒トラック</h4><ul><li>◆（4・8・12）で警察が動く</li><li>15で強行突入（巡回2回から本番）</li></ul></section>
  <section><h4>本番（金庫のロック）</h4><div class="row">物理錠＝突破　電子錠＝技術　センサー錠＝潜入</div><div class="row">適性　◎得意 必要−1　○普通　×苦手 必要+1</div><div class="row">○の必要数　外周${md(VSTAGE[0].base)}　中層${md(VSTAGE[1].base)}　最深部${md(VSTAGE[2].base)}</div><div class="row">物理：成功で+1段・失敗ダメ+1／電子：連携+3／センサー：1以下で警備−1手番</div><div class="row">ちょうど＝1段　+1＝2段　+2＝3段</div><div class="row">1足りない＝1段＋1ダメージ　それ未満＝連携+2</div><div class="row">${md(1,'r')} 1ダメージ　${md(0,'r')} 2ダメージ　${md('−','r')} 3ダメージ</div><ul><li>警備隊到着まで8手番（強行5）。過ぎると毎手番巡回</li><li>強引にこじ開ける：+3ダイス、警備到着−1、1以下で巡回</li></ul></section>
  <section><h4>段取り・切り札・連携技</h4><ul><li>段取り：下見+1／下準備達成+1／換金</li><li>切り札：段取りを払って職業ごとの技</li><li>連携技：決まった2人が隣接で発動（各1回）</li></ul></section>
  <section><h4>お宝と逃走</h4><ul><li>小粒 価値1・重さ1／上物 2・2／至宝 4・3</li><li>盗む判定に失敗すると警戒+1（お宝は入手）</li><li>逃走：重さ2ごとに必要成功数+1、2回失敗で逮捕</li></ul></section>
</div>`,[{label:'閉じる',v:0,cls:'ghost'}],true)}
$('#bMenu').onclick=e=>{e.stopPropagation();SFX.click();$('#top').classList.toggle('menu')};
document.addEventListener('pointerdown',e=>{const t=$('#top');if(t&&t.classList.contains('menu')&&!e.target.closest('#toolbar')&&!e.target.closest('#bMenu')&&!e.target.closest('#fabMenu'))t.classList.remove('menu')});
$('#toolbar').addEventListener('click',e=>{if(e.target.closest('button')&&isPhone())setTimeout(()=>$('#top').classList.remove('menu'),150)});
$('#bFollow').onclick=()=>{$('#bCam').click()};
$('#fabMenu').onclick=e=>{e.stopPropagation();SFX.click();$('#top').classList.toggle('menu')};
$('#bMe').onclick=e=>{e.stopPropagation();$('#top').classList.remove('menu');if(!S)return;const i=S.chars.findIndex(mine);showCrewPop(i>=0?i:meIdx(),$('#bMenu'))};
$('#bQ').onclick=()=>{const o=['high','std','eco'];QMODE=o[(o.indexOf(QMODE)+1)%3];try{localStorage.setItem('gh_q',QMODE)}catch(e){}applyQuality();SFX.click()};
$('#bRef').onclick=showRef;$('#bCam').onclick=()=>{SFX.click();setCamFree(false);cam.wantRad=innerWidth<700?24:19;cam.wantTheta=0;cam.phi=1;if(S&&S.phase==='adventure')focusOn(cur(),true);else cam.want.set(0,S&&S.phase!=='adventure'?4.3:0,S&&S.phase!=='adventure'?1.5:2)};
$('#bLog').onclick=()=>{SFX.click();openLog(!$('#logdrawer').classList.contains('open'))};$('#bLogX').onclick=()=>openLog(false);
$('#bRule2').onclick=showRules;$('#bRule').onclick=showRules;$('#bJobs').onclick=showJobs;
$('#bBgm').onclick=()=>{AU.on.bgm=!AU.on.bgm;$('#bBgm').classList.toggle('off',!AU.on.bgm);if(AU.on.bgm)music(SEQ.want||TRACK_EXPLORE);else seqStop()};
let SHOW_ODDS=true;const SPD=[['遅め',1.35],['標準',1.0],['速い',.65]];let spdI=0;
$('#bSpd').onclick=()=>{spdI=(spdI+1)%SPD.length;TEMPO=SPD[spdI][1];$('#bSpd').textContent='演出 '+SPD[spdI][0];SFX.click()};
$('#bHolo').textContent=HOLO_LABEL[HOLO_MODE]||HOLO_LABEL.auto;
$('#bHolo').onclick=()=>{const o=['auto','big','off'];HOLO_MODE=o[(o.indexOf(HOLO_MODE)+1)%3];try{localStorage.setItem('gh_holo',HOLO_MODE)}catch(e){}$('#bHolo').textContent=HOLO_LABEL[HOLO_MODE];SFX.click()};
$('#bOdds').onclick=()=>{SHOW_ODDS=!SHOW_ODDS;if(S)S.showOdds=SHOW_ODDS;$('#bOdds').textContent='確率 '+(SHOW_ODDS?'表示':'隠す');SFX.click();if(S)renderPanel()};
$('#bSfx').onclick=()=>{AU.on.sfx=!AU.on.sfx;$('#bSfx').classList.toggle('off',!AU.on.sfx)};
function legend(){const el=document.createElement('div');el.id='legend';el.innerHTML=['R','C','X','B','S','N'].map(k=>`<span><i style="background:${TERRAIN[k].css}"></i>${TERRAIN[k].name}${TERRAIN[k].need<99?` ${TERRAIN[k].need}+`:''}</span>`).join('');$('.gaugebox').appendChild(el)}

$('#bStart').onclick=async()=>{if(NET.on){if(NET.host)netHostStart();else netToast('ホストが開始するのを待っています');return}
  const sel=SEATS.filter(s=>s.on);if(sel.length<2){modal('<h3>団員が足りません</h3><p>2人以上を「参加中」にしてください。</p>',[{label:'OK',v:0}]);return}
  startGame(sel.map(s=>({job:s.job,name:s.name,cpu:s.cpu})),(Math.random()*4294967296)>>>0)};
async function startGame(sel,seed){setSeed(seed);
  audioInit();if(AU.ctx.state==='suspended')AU.ctx.resume();SFX.win(false);
  S=newState(sel);S.step='intro';S.ip=0;S.aq=0;S.showOdds=SHOW_ODDS;buildHolos();buildPieces();buildLoot();
  $('#title').style.transition='opacity .9s';$('#title').style.opacity=0;setTimeout(()=>{$('#title').hidden=true;STAGE.on=false},900);$('#hud').hidden=false;
  music(TRACK_EXPLORE);setCamFree(false);renderAll();cam.wantRad=innerWidth<700?24:null;cam.theta=0;cam.phi=1;
  alarmT=clock.elapsedTime-1.5;await banner('作戦開始','標的を下見し、5つの下準備を揃えろ。寄り道のお宝はお好みで',BC.teal,2600);
  await vaultDraw();await contractDraw();await orderDraw();
  log('<span class="y">作戦開始。いちばん遠い標的の情報だけは掴んでいる。</span>');beginTurn()}
document.addEventListener('pointerdown',function once(){audioInit();if(AU.ctx.state==='suspended')AU.ctx.resume();if(!S)music(TRACK_TITLE);document.removeEventListener('pointerdown',once)},{once:true});

// boot
// スマホでの勝手な拡大を防ぐ：入力欄タップ時の自動ズームとダブルタップズームを止める
(()=>{let m=document.querySelector('meta[name=viewport]');if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}
  m.content='width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover'})();

/* ---------- 日本語の改行：文節の区切りでだけ折り返し、見出しは1行に収める ---------- */
const JB=(()=>{const HIRA=/[ぁ-ゟ]/,SMALL=/[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮー々ゝゞヽヾ]/,
    AFTER=/[、。，．,.!！?？）」』】〕〉》：:／・…　 ）\]]/,BEFORE=/[（「『【〔〈《(\[]/,CLOSE=/[、。，．,.!！?？）」』】〕〉》：:・…）\]]/,AN=/[0-9A-Za-z+\-×%％]/;
  function can(a,b){if(!a||!b)return false;if(CLOSE.test(b)||SMALL.test(b))return false;if(AFTER.test(a))return true;if(BEFORE.test(b))return!BEFORE.test(a);
    if(AN.test(a)&&AN.test(b))return false;if(HIRA.test(a)&&!HIRA.test(b))return true;return false}
  const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|CANVAS|svg|text|tspan|title)$/;
  function proc(t){const v=t.nodeValue;if(!v||v.length<4||!/\S/.test(v))return;const p=t.parentNode;if(!p||p.nodeType!==1||SKIP.test(p.nodeName)||p.closest('[data-nowbr],svg'))return;
    const d=getComputedStyle(p).display;if(/flex|grid/.test(d)||getComputedStyle(p).whiteSpace==='nowrap')return;
    const cut=[];for(let i=1;i<v.length;i++)if(can(v[i-1],v[i]))cut.push(i);if(!cut.length)return;
    const f=document.createDocumentFragment();let st=0;cut.forEach(i=>{f.appendChild(document.createTextNode(v.slice(st,i)));f.appendChild(document.createElement('wbr'));st=i});f.appendChild(document.createTextNode(v.slice(st)));p.replaceChild(f,t)}
  function walk(n){if(n.nodeType===3){proc(n);return}if(n.nodeType!==1||SKIP.test(n.nodeName)||n.hasAttribute&&n.hasAttribute('data-nowbr'))return;
    const tw=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);const arr=[];while(tw.nextNode())arr.push(tw.currentNode);arr.forEach(proc)}
  const FIT='#diceSub,#diceTitle,#myturn .mt-t,.dw-t,#diceResult .head,#banner .t,#cutin .ci-t b,#deal .dt';
  function fit(el){if(!el||!el.isConnected)return;el.style.removeProperty('font-size');el.style.whiteSpace='nowrap';const w=el.clientWidth;if(!w){el.style.whiteSpace='';return}
    let fs=parseFloat(getComputedStyle(el).fontSize),min=el.id==='diceSub'?Math.min(fs,10.5):Math.max(13,fs*.62);while(el.scrollWidth>w+1&&fs>min){fs=Math.max(min,fs-.5);el.style.setProperty('font-size',fs+'px','important')}
    if(el.scrollWidth>w+1)el.style.whiteSpace=''}
  let pend=new Set(),raf=0;
  function flush(){raf=0;obs.disconnect();pend.forEach(walk);pend.clear();document.querySelectorAll(FIT).forEach(fit);obs.observe(document.body,{childList:true,subtree:true})}
  const obs=new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(n=>pend.add(n)));if(!raf)raf=requestAnimationFrame(flush)});
  addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(flush)});
  walk(document.body);obs.observe(document.body,{childList:true,subtree:true});return{fit,walk}})();
buildMap();mergeStatic();makeAvatars();legend();applyQuality();renderSeats();renderNetPanel();addEventListener('load',()=>setTimeout(loadPJ,300));
{const sv=ssGet('gh_net');if(sv&&sv.code){if(sv.host)netCreate(sv.code);else setTimeout(()=>netJoin(sv.code),2500)}}
addEventListener('resize',resize);resize();loop();
anims.push(t=>{if(!S)cam.theta=.25+Math.sin(t*.07)*.5});
anims.push(()=>{if(!S||!isPhone()||S.phase!=='adventure'||cam.free)return;const ch=cur();const want=(S.step==='move'||S.step==='warp')&&mine(ch)?13:20;if(cam.autoRad!==want){cam.autoRad=want;cam.wantRad=want;focusOn(ch)}});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{boardMat.map=boardTex();boardMat.needsUpdate=true;cardBackTex=makeCardBack();holos.forEach(h=>{const m=h.card.material[5];m.map=cardBackTex;m.emissiveMap=cardBackTex;m.needsUpdate=true});if(S){S.quests.forEach((q,i)=>drawHolo(i))}});
window.__K={testStart:(jobs,smart=[])=>{SEATS.forEach((s,i)=>{s.on=i<jobs.length;s.cpu=true;if(i<jobs.length)s.job=jobs[i]});const sel=SEATS.filter(s=>s.on);holos.forEach(h=>{world.remove(h.pivot);world.remove(h.beam)});holos.length=0;S=newState(sel);S.chars.forEach((c,i)=>c.smart=!!smart[i]);S.showOdds=true;buildHolos();buildPieces();buildLoot();$('#title').hidden=true;$('#hud').hidden=false;BUSY=false;window.__RES=null;beginTurn()},ev:c=>eval(c),get S(){return S},SEATS,setSpeed:v=>SPEED=v,enterFinal,get dice(){return DICE.on},get dphase(){return DICE.phase}};