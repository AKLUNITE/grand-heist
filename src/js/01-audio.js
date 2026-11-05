/* =====================================================================
   AUDIO — WebAudioで合成（BGMはシーケンサー、スウィング対応）
   ===================================================================== */
const AU={ctx:null,on:{bgm:true,sfx:true},duck:()=>{}};
function audioInit(){
  if(AU.ctx)return;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();AU.ctx=ctx;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.connect(ctx.destination);
  AU.master=ctx.createGain();AU.master.gain.value=.9;AU.master.connect(comp);
  AU.bgm=ctx.createGain();AU.bgm.gain.value=.38;AU.bgm.connect(AU.master);
  AU.sfx=ctx.createGain();AU.sfx.gain.value=.8;AU.sfx.connect(AU.master);
  const len=ctx.sampleRate*2.4,ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
  AU.rev=ctx.createConvolver();AU.rev.buffer=ir;const rg=ctx.createGain();rg.gain.value=.34;AU.rev.connect(rg);rg.connect(AU.master);
  AU.dly=ctx.createDelay(1);AU.dly.delayTime.value=.3;const fb=ctx.createGain();fb.gain.value=.3;const dg=ctx.createGain();dg.gain.value=.26;
  AU.dly.connect(fb);fb.connect(AU.dly);AU.dly.connect(dg);dg.connect(AU.bgm);
  const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;AU.noise=nb;
  // 効果音が鳴る瞬間だけBGMを下げる
  AU.duck=t=>{const g=AU.bgm.gain,n=ctx.currentTime;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(.14,n+.05);g.linearRampToValueAtTime(.38,n+t)};
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function osc({type='sine',f=440,f2=null,t=0,dur=.2,vol=.3,a=.005,dest,filt=null,q=1,ff2=null,rev=0,det=0,vib=0}){
  const ctx=AU.ctx;if(!ctx)return;const T=t||ctx.currentTime;
  const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,T);if(det)o.detune.value=det;
  if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),T+dur);
  if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=5.5;lg.gain.value=vib;l.connect(lg);lg.connect(o.frequency);l.start(T);l.stop(T+dur+.05)}
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,T);g.gain.exponentialRampToValueAtTime(vol,T+a);g.gain.exponentialRampToValueAtTime(0.0001,T+dur);
  let n=o;if(filt){const bq=ctx.createBiquadFilter();bq.type='lowpass';bq.frequency.setValueAtTime(filt,T);bq.Q.value=q;if(ff2)bq.frequency.exponentialRampToValueAtTime(ff2,T+dur);o.connect(bq);n=bq}
  n.connect(g);g.connect(dest||AU.sfx);if(rev){const s=ctx.createGain();s.gain.value=rev;g.connect(s);s.connect(AU.rev)}
  o.start(T);o.stop(T+dur+.05);
}
function noise({t=0,dur=.2,vol=.3,type='bandpass',f=1000,f2=null,q=1,dest,a=.002,rev=0}){
  const ctx=AU.ctx;if(!ctx)return;const T=t||ctx.currentTime;
  const s=ctx.createBufferSource();s.buffer=AU.noise;const bq=ctx.createBiquadFilter();bq.type=type;bq.frequency.setValueAtTime(f,T);bq.Q.value=q;
  if(f2)bq.frequency.exponentialRampToValueAtTime(f2,T+dur);
  const g=ctx.createGain();g.gain.setValueAtTime(0.0001,T);g.gain.exponentialRampToValueAtTime(vol,T+a);g.gain.exponentialRampToValueAtTime(0.0001,T+dur);
  s.connect(bq);bq.connect(g);g.connect(dest||AU.sfx);if(rev){const r=AU.ctx.createGain();r.gain.value=rev;g.connect(r);r.connect(AU.rev)}
  s.start(T,Math.random()*1.5);s.stop(T+dur+.05);
}
const SFX={
  ok:()=>AU.on.sfx&&AU.ctx,
  click(){if(!this.ok())return;osc({type:'triangle',f:1600,f2:1100,dur:.05,vol:.08})},
  clack(){if(!this.ok())return;noise({f:2600+Math.random()*1500,q:3,dur:.05,vol:.4});osc({f:180,f2:90,dur:.07,vol:.25})},
  rattle(){if(!this.ok())return;const t=AU.ctx.currentTime;for(let i=0;i<10;i++)noise({t:t+i*.045+Math.random()*.02,f:3000+Math.random()*2000,q:4,dur:.03,vol:.18})},
  good(i=0){if(!this.ok())return;osc({type:'triangle',f:mtof(84+Math.min(i,12)),dur:.3,vol:.18,rev:.35});osc({type:'sine',f:mtof(96+Math.min(i,12)),dur:.22,vol:.07})},
  zero(){if(!this.ok())return;osc({type:'sine',f:330,dur:.14,vol:.09})},
  coins(n=14,dur=1){if(!this.ok())return;const t=AU.ctx.currentTime;for(let i=0;i<n;i++){const tt=t+Math.random()*dur;osc({type:'triangle',f:2200+Math.random()*2400,t:tt,dur:.18,vol:.06,rev:.3});osc({type:'sine',f:4200+Math.random()*1600,t:tt+.02,dur:.12,vol:.035})}},
  kaching(){if(!this.ok())return;const t=AU.ctx.currentTime;noise({t,f:5000,q:5,dur:.06,vol:.4});osc({type:'triangle',f:2637,t:t+.04,dur:.5,vol:.16,rev:.4});osc({type:'triangle',f:3136,t:t+.1,dur:.7,vol:.16,rev:.5})},
  cymbal(t0=0,dur=1.6,v=.22){if(!this.ok())return;const t=t0||AU.ctx.currentTime;noise({t,type:'highpass',f:5500,dur,vol:v,a:.01,rev:.5})},
  swell(){if(!this.ok())return;noise({type:'highpass',f:3000,f2:9000,dur:.7,vol:.18,a:.6})},
  timp(t0=0,f=98,v=.8){if(!this.ok())return;const t=t0||AU.ctx.currentTime;osc({f,f2:f*.55,t,dur:.9,vol:v});noise({t,type:'lowpass',f:300,dur:.25,vol:.4})},
  crit(){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(1);
    [72,76,79,84,88,91].forEach((m,i)=>osc({type:'square',f:mtof(m),t:t+i*.045,dur:.25,vol:.11,filt:5200,rev:.4}));
    this.kaching();this.coins(12,.7);osc({type:'sine',f:mtof(96),t:t+.28,dur:1.4,vol:.11,rev:.9});noise({t,type:'bandpass',f:800,f2:6000,q:1.5,dur:.35,vol:.2})},
  fumble(){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(.8);
    osc({type:'square',f:110,t,dur:.5,vol:.18,filt:900});osc({type:'square',f:116.5,t,dur:.5,vol:.18,filt:900});
    osc({type:'sawtooth',f:300,f2:60,t:t+.05,dur:.6,vol:.2,filt:1200});noise({t,type:'lowpass',f:900,dur:.3,vol:.35})},
  // 大成功：金管スタブ＋ティンパニ＋シンバル＋上昇アルペジオ＋金貨＋歓声
  win(big=false){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(big?3:2);
    this.swell();const T=t+.12;this.timp(T,98);this.timp(T+.18,131,.6);
    [[60,64,67,72],[65,69,72,77],[67,71,74,79]].slice(0,big?3:1).forEach((ch,k)=>ch.forEach(m=>{osc({type:'sawtooth',f:mtof(m),t:T+k*.32,dur:big&&k===2?1.6:.5,vol:.075,a:.015,filt:3600,ff2:1600,q:2,rev:.5});osc({type:'square',f:mtof(m+12),t:T+k*.32,dur:.25,vol:.03,filt:4000})}));
    [72,76,79,84,88,91,96].forEach((m,i)=>osc({type:'triangle',f:mtof(m),t:T+.08+i*.05,dur:.35,vol:.08,rev:.5}));
    this.cymbal(T,big?2.4:1.4,.25);this.coins(big?36:18,big?1.8:1);this.kaching();
    const crowd=big?1.8:1;for(let i=0;i<(big?26:12);i++)noise({t:T+.1+Math.random()*crowd,type:'bandpass',f:700+Math.random()*1600,q:1.2,dur:.18+Math.random()*.25,vol:.06,a:.04,rev:.6})},
  // 大失敗：不協和の金管スタブ＋ティンパニ＋サブベース落下＋ブザー
  lose(big=false){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(big?2.4:1.6);
    [48,49,54,55,61].forEach(m=>osc({type:'sawtooth',f:mtof(m),t,dur:big?1.4:.8,vol:.08,a:.01,filt:1800,ff2:400,q:3,rev:.6}));
    this.timp(t,73,.9);osc({type:'sine',f:90,f2:28,t,dur:1.2,vol:.7});noise({t,type:'lowpass',f:1800,f2:80,dur:1,vol:.5});
    if(big){osc({type:'square',f:220,t:t+.25,dur:.5,vol:.1,filt:1200,vib:12});noise({t:t+.05,type:'highpass',f:6000,q:6,dur:.25,vol:.3})}},
  hurt(n=1){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(.8);noise({t,type:'lowpass',f:4000,f2:150,dur:.45,vol:.7});osc({type:'square',f:180,f2:40,t,dur:.35,vol:.32,filt:1400});
    osc({type:'sine',f:70,f2:30,t,dur:.5,vol:.6});if(n>=2)noise({t:t+.02,type:'highpass',f:5200,q:7,dur:.2,vol:.25})},
  alarm(){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(2);for(let i=0;i<8;i++)osc({type:'square',f:i%2?415:554,t:t+i*.17,dur:.16,vol:.1,filt:2600,rev:.25});
    osc({type:'sine',f:600,f2:1300,t,dur:.6,vol:.12,rev:.4});osc({type:'sine',f:1300,f2:600,t:t+.6,dur:.6,vol:.12,rev:.4});this.timp(t,82,.6)},
  tick(i){if(!this.ok())return;osc({type:'square',f:mtof(72+Math.min(i,24)),dur:.07,vol:.09,filt:4000})},
  gauge(){if(!this.ok())return;osc({type:'square',f:mtof(81),dur:.12,vol:.11});osc({type:'square',f:mtof(76),t:AU.ctx.currentTime+.13,dur:.15,vol:.11});osc({type:'sine',f:70,f2:40,dur:.3,vol:.4})},
  boom(){if(!this.ok())return;const t=AU.ctx.currentTime;noise({t,type:'lowpass',f:2400,f2:60,dur:1.4,vol:.8,rev:.5});osc({f:110,f2:28,t,dur:.9,vol:.7})},
  clank(){if(!this.ok())return;const t=AU.ctx.currentTime;noise({t,f:3200,q:8,dur:.25,vol:.5});[220,347,513,701].forEach((f,i)=>osc({type:'sine',f,t,dur:.7-i*.08,vol:.12,rev:.5}));osc({f:90,f2:50,t,dur:.25,vol:.5})},
  laser(){if(!this.ok())return;osc({type:'sawtooth',f:2200,f2:180,dur:.5,vol:.25,filt:4000,rev:.3});noise({type:'bandpass',f:3000,f2:400,q:4,dur:.5,vol:.25})},
  heal(){if(!this.ok())return;const t=AU.ctx.currentTime;[64,68,71,76].forEach((m,i)=>osc({type:'sine',f:mtof(m+12),t:t+i*.09,dur:.7,vol:.1,rev:.7}))},
  reveal(){if(!this.ok())return;noise({type:'bandpass',f:400,f2:5000,q:2,dur:.6,vol:.3});osc({type:'triangle',f:mtof(86),t:AU.ctx.currentTime+.4,dur:.9,vol:.12,rev:.7})},
  escape(){if(!this.ok())return;const t=AU.ctx.currentTime;[72,79,84,88,91,96].forEach((m,i)=>osc({type:'sine',f:mtof(m),t:t+i*.09,dur:1.4,vol:.1,rev:.9}))},
  whoosh(){if(!this.ok())return;noise({type:'bandpass',f:300,f2:2400,q:1.5,dur:.35,vol:.22})},
  ability(){if(!this.ok())return;const t=AU.ctx.currentTime;AU.duck(1.2);noise({t,type:'bandpass',f:500,f2:4000,q:1.4,dur:.35,vol:.22});
    [79,83,86,91,95].forEach((m,i)=>osc({type:'triangle',f:mtof(m),t:t+.08+i*.055,dur:.4,vol:.1,rev:.6}));osc({type:'sine',f:mtof(98),t:t+.36,dur:1,vol:.08,rev:.9})},
  weak(){if(!this.ok())return;const t=AU.ctx.currentTime;osc({type:'triangle',f:mtof(64),t,dur:.25,vol:.12});osc({type:'triangle',f:mtof(60),t:t+.14,dur:.4,vol:.12,rev:.4})},
  tok(){if(!this.ok())return;const t=AU.ctx.currentTime;noise({t,f:2300,q:7,dur:.045,vol:.55});osc({type:'triangle',f:760,f2:430,t,dur:.07,vol:.28});osc({f:160,f2:90,t,dur:.06,vol:.25})},
  flip(){if(!this.ok())return;const t=AU.ctx.currentTime;noise({t,type:'bandpass',f:1200,f2:4200,q:1.3,dur:.2,vol:.32});noise({t:t+.17,f:900,q:2,dur:.05,vol:.3});osc({f:200,f2:120,t:t+.17,dur:.06,vol:.2})},
  slide(){if(!this.ok())return;noise({type:'lowpass',f:900,f2:500,dur:.4,vol:.18,a:.05})},
  deal(){if(!this.ok())return;noise({type:'bandpass',f:2400,f2:800,q:1.5,dur:.25,vol:.25})},
  turn(){if(!this.ok())return;const t=AU.ctx.currentTime;osc({type:'triangle',f:mtof(79),t,dur:.25,vol:.07,rev:.4});osc({type:'triangle',f:mtof(86),t:t+.09,dur:.35,vol:.07,rev:.4})}
};

/* ---- BGM sequencer ---- */
const SEQ={track:null,step:0,next:0,timer:null,gain:null,want:null};
function seqStart(track){
  if(!AU.ctx)return;seqStop();SEQ.track=track;SEQ.step=0;SEQ.next=AU.ctx.currentTime+.08;
  SEQ.gain=AU.ctx.createGain();SEQ.gain.gain.value=0.0001;SEQ.gain.gain.exponentialRampToValueAtTime(1,AU.ctx.currentTime+1.2);SEQ.gain.connect(AU.bgm);
  SEQ.timer=setInterval(seqTick,25);
}
function seqStop(){if(SEQ.timer){clearInterval(SEQ.timer);SEQ.timer=null}if(SEQ.gain&&AU.ctx){const g=SEQ.gain;g.gain.cancelScheduledValues(AU.ctx.currentTime);g.gain.setValueAtTime(Math.max(.0001,g.gain.value),AU.ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,AU.ctx.currentTime+.6);setTimeout(()=>g.disconnect(),900);SEQ.gain=null}}
function seqTick(){const tr=SEQ.track,sp=60/tr.bpm/4;while(SEQ.next<AU.ctx.currentTime+.15){tr.play(SEQ.step,SEQ.next,sp);SEQ.next+=sp;SEQ.step++}}
const D=()=>SEQ.gain;
SFX.heart=function(){if(!SFX.ok())return;const t=AU.ctx.currentTime;osc({f:62,f2:40,t,dur:.18,vol:.32});osc({f:58,f2:38,t:t+.2,dur:.16,vol:.22})};
SFX.siren=function(n=3){if(!SFX.ok())return;const t=AU.ctx.currentTime;for(let i=0;i<n;i++){osc({type:'square',f:660,f2:990,t:t+i*.9,dur:.45,vol:.06,filt:2400,rev:.3});osc({type:'square',f:990,f2:660,t:t+i*.9+.45,dur:.45,vol:.06,filt:2400,rev:.3})}};
const TRACK_CHASE={bpm:166,play(st,t,sp){TRACK_VAULT.play(st,t,sp);if(st%64===0)osc({type:'square',f:700,f2:1000,t,dur:sp*6,vol:.025,filt:2000,dest:D()})}};
const kick=(t,v=.9)=>osc({f:150,f2:38,t,dur:.32,vol:v,dest:D()});
const snare=(t,v=.45)=>{noise({t,f:1800,q:.8,dur:.16,vol:v,dest:D(),rev:.2});osc({type:'triangle',f:220,f2:150,t,dur:.1,vol:v*.55,dest:D()})};
const brush=(t,v=.12)=>noise({t,f:2600,q:.7,dur:.2,vol:v,dest:D(),a:.03});
const hat=(t,v=.12,l=.04)=>noise({t,type:'highpass',f:8000,dur:l,vol:v,dest:D()});
const ride=(t,v=.06)=>{noise({t,type:'highpass',f:6500,dur:.32,vol:v,dest:D()});osc({type:'sine',f:5200,t,dur:.3,vol:.012,dest:D()})};
const upright=(m,t,d)=>{osc({type:'triangle',f:mtof(m),t,dur:d,vol:.42,filt:900,ff2:300,dest:D()});osc({type:'sine',f:mtof(m),t,dur:d*.8,vol:.25,dest:D()})};
const bassN=(m,t,d,c=900)=>{osc({type:'sawtooth',f:mtof(m),t,dur:d,vol:.3,filt:c,ff2:c*.35,q:6,dest:D()});osc({type:'square',f:mtof(m-12),t,dur:d,vol:.15,filt:500,dest:D()})};
const vibe=(m,t,d,v=.07)=>{osc({type:'sine',f:mtof(m),t,dur:d,vol:v,a:.004,dest:D(),rev:.45});osc({type:'sine',f:mtof(m)*1.003,t,dur:d,vol:v*.6,dest:D()});osc({type:'triangle',f:mtof(m+12),t,dur:d*.4,vol:v*.25,dest:D()})};
const comp=(ms,t,v=.035)=>ms.forEach(m=>osc({type:'triangle',f:mtof(m),t,dur:.35,vol:v,filt:2400,dest:D(),rev:.25}));
const pad=(ms,t,d,v=.03)=>ms.forEach(m=>{osc({type:'sawtooth',f:mtof(m),t,dur:d,vol:v,a:d*.3,filt:1200,det:-7,dest:D(),rev:.25});osc({type:'sawtooth',f:mtof(m),t,dur:d,vol:v,a:d*.3,filt:1200,det:7,dest:D()})});
const surf=(m,t,d,v=.07)=>{osc({type:'square',f:mtof(m),t,dur:d,vol:v,filt:2600,q:3,dest:D(),rev:.4,vib:4});osc({type:'sawtooth',f:mtof(m-12),t,dur:d*.7,vol:v*.4,filt:1600,dest:D()})};
const brass=(ms,t,d,v=.06)=>ms.forEach(m=>osc({type:'sawtooth',f:mtof(m),t,dur:d,vol:v,a:.02,filt:2600,ff2:800,q:3,dest:D(),rev:.2}));
const pluck=(m,t,v=.06)=>{osc({type:'square',f:mtof(m),t,dur:.18,vol:v,filt:2400,ff2:600,dest:D()});osc({type:'square',f:mtof(m),t,dur:.15,vol:v*.4,filt:2000,dest:AU.dly})};
const MEL1=[74,null,null,77,null,76,null,74, null,null,72,null,69,null,null,null, 70,null,null,74,null,72,null,70, 69,null,null,null,null,null,null,null,
            77,null,null,81,null,79,null,77, null,null,76,null,74,null,null,null, 73,null,76,null,79,null,77,null, 74,null,null,null,null,null,null,null];
const TRACK_EXPLORE={bpm:112,play(st,t,sp){
  const bar=Math.floor(st/16)%4,s=st%16,loop=Math.floor(st/64);const T=t+((s%4===2)?sp*.33:0);
  const CH=[[62,65,69,71],[62,65,69,71],[58,62,65,69],[57,61,64,67]][bar];
  const WALK=[[38,41,45,47],[48,45,41,40],[34,38,41,45],[33,37,40,43]][bar];
  const inten=S&&S.phase==='adventure'?S.gauge/GAUGE_MAX:0;
  if(s%4===0)upright(WALK[s/4],t,sp*3.6);
  if(s%4===0)ride(t);if(s%4===2)ride(T,.045);if(s===4||s===12){hat(t,.08,.03);brush(t)}
  if(s===0)kick(t,.35);if(s===10&&bar%2)kick(T,.25);
  if(s===2||s===10)comp(CH.map(m=>m+12),T);
  if(loop%2===1){const m=MEL1[st%64];if(m)vibe(m,(st%2)?T:t,sp*3)}
  if(inten>.4&&s%2===0){const R=[50,51,52,51];surf(R[(s/2)%4]+(bar===2?-4:bar===3?-5:0),t,sp*1.6,.035+inten*.03)}
  if(inten>.7&&(s===14||s===15))osc({type:'sine',f:mtof(s===14?45:43),f2:mtof(40),t,dur:.25,vol:.25,dest:D()});
}};
const MEL2=[74,null,null,74,77,null,74,null, 72,null,70,null,69,null,null,null, 70,null,null,70,74,null,70,null, 72,null,null,null,74,null,72,null,
            77,null,null,77,81,null,77,null, 79,null,77,null,76,null,null,null, 73,null,76,null,79,null,81,null, 79,null,77,null,76,null,73,null];
const TRACK_VAULT={bpm:148,play(st,t,sp){
  const bar=Math.floor(st/16)%4,s=st%16,loop=Math.floor(st/64);
  const CH=[[62,65,69],[62,65,69],[58,62,65],[57,61,64]][bar], RT=[38,38,34,33][bar];
  const OST=[0,0,3,0,5,0,3,2];if(s%2===0)bassN(RT+OST[(s/2)%8],t,sp*1.7,1200);
  if(s%4===0)kick(t);if(s===4||s===12)snare(t);if(bar===3&&s>=12)snare(t+sp*.5,.3);
  hat(t,s%2?.05:.09);
  if([0,3,6,10].includes(s))brass(CH.map(m=>m+12),t,sp*1.4,.045);
  const m=MEL2[st%64];if(m&&loop%2===1)surf(m,t,sp*2.4,.07);
  if(loop%2===0&&s%2===0)pluck(CH[(s/2)%3]+24,t,.045);
  if(S&&S.phase==='final'&&S.locks<=3&&s%8===0)osc({type:'sawtooth',f:mtof(86),t,dur:sp*3,vol:.03,filt:3000,dest:D(),vib:8});
}};
const TRACK_TITLE={bpm:84,play(st,t,sp){
  const bar=Math.floor(st/16)%4,s=st%16;const T=t+((s%4===2)?sp*.33:0);
  const CH=[[62,65,69,72,76],[55,58,62,65,69],[58,62,65,69,72],[57,61,64,67,70]][bar];const RT=[38,31,34,33][bar];
  if(s===0)pad(CH.slice(0,4),t,sp*16,.025);if(s%8===0)upright(RT+(s?7:0),t,sp*7);
  if(s%4===0)ride(t,.04);if(s===4||s===12)brush(t,.08);
  if(s%4===2)vibe(CH[(Math.floor(s/4)+bar)%5]+12,T,sp*4,.05);
}};
function music(tr){if(!AU.ctx)return;SEQ.want=tr;if(!AU.on.bgm){seqStop();return}if(SEQ.track!==tr||!SEQ.timer)seqStart(tr)}
function jingle(win){if(!AU.ctx)return;seqStop();SEQ.track=null;const t=AU.ctx.currentTime+.2;
  if(win){[[72,0],[72,.18],[72,.36],[76,.54],[79,.9],[77,1.26],[79,1.44],[84,1.8]].forEach(([m,d])=>{osc({type:'sawtooth',f:mtof(m),t:t+d,dur:.5,vol:.13,filt:3000,rev:.5,dest:AU.bgm});osc({type:'square',f:mtof(m-12),t:t+d,dur:.4,vol:.06,dest:AU.bgm})});
    [60,64,67,72,76].forEach(m=>osc({type:'sawtooth',f:mtof(m),t:t+1.8,dur:3,vol:.04,a:.1,filt:2400,rev:.8,dest:AU.bgm}));}
  else{[[63,0,.45],[62,.5,.45],[61,1,.45],[60,1.5,1.6]].forEach(([m,d,l])=>osc({type:'sawtooth',f:mtof(m-12),t:t+d,dur:l,vol:.16,filt:900,rev:.6,dest:AU.bgm,vib:d>1.2?9:0}))}
}
