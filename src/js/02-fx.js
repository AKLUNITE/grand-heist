/* =====================================================================
   SCREEN FX（2Dオーバーレイ：金貨・紙吹雪・光条・衝撃波）
   ===================================================================== */
const FX={cv:$('#fxCanvas'),parts:[],rays:[],shocks:[],dpr:Math.min(devicePixelRatio,2)};
FX.ctx=FX.cv.getContext('2d');
function fxResize(){FX.cv.width=innerWidth*FX.dpr;FX.cv.height=innerHeight*FX.dpr}
const CONF=['#f4dc9f','#d9b46a','#fff8e4','#52d4c6','#ee3a54','#b99cff'];
function fxCoins(n=40,from='top'){for(let i=0;i<n;i++){const top=from==='top';FX.parts.push({k:'coin',x:top?Math.random()*innerWidth:innerWidth*(.3+Math.random()*.4),y:top?-20-Math.random()*innerHeight*.5:innerHeight*.55,
  vx:(Math.random()-.5)*(top?60:620),vy:top?80+Math.random()*120:-520-Math.random()*420,r:9+Math.random()*7,rot:Math.random()*6,vr:4+Math.random()*8,life:3.4})}}
function fxConfetti(n=80){for(let i=0;i<n;i++){const left=i%2;FX.parts.push({k:'conf',x:left?-10:innerWidth+10,y:innerHeight*(.55+Math.random()*.35),vx:(left?1:-1)*(300+Math.random()*520),vy:-620-Math.random()*520,w:6+Math.random()*6,h:3+Math.random()*5,c:pick(CONF),rot:Math.random()*6,vr:(Math.random()-.5)*14,life:3.2})}}
function fxSparks(x,y,c='#f4dc9f',n=30,sp=420){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=sp*(.3+Math.random());FX.parts.push({k:'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c,life:.6+Math.random()*.5})}}
function fxShock(x,y,c='#f4dc9f',maxR=260){FX.shocks.push({x,y,c,maxR,age:0,life:.75})}
function fxRays(c='#f4dc9f',life=2.2){FX.rays.push({c,age:0,life})}
function fxFrame(dt){const g=FX.ctx,d=FX.dpr;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,innerWidth,innerHeight);
  if(!FX.parts.length&&!FX.rays.length&&!FX.shocks.length)return;
  for(let i=FX.rays.length-1;i>=0;i--){const r=FX.rays[i];r.age+=dt;const k=r.age/r.life;if(k>=1){FX.rays.splice(i,1);continue}
    const cx=innerWidth/2,cy=innerHeight*.45,R=Math.hypot(innerWidth,innerHeight);g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.sin(k*Math.PI)*.22;g.translate(cx,cy);g.rotate(r.age*.35);
    const gr=g.createRadialGradient(0,0,0,0,0,R*.6);gr.addColorStop(0,r.c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;
    for(let j=0;j<14;j++){g.rotate(Math.PI*2/14);g.beginPath();g.moveTo(0,0);g.lineTo(R,-R*.07);g.lineTo(R,R*.07);g.closePath();g.fill()}g.restore()}
  for(let i=FX.shocks.length-1;i>=0;i--){const s=FX.shocks[i];s.age+=dt;const k=s.age/s.life;if(k>=1){FX.shocks.splice(i,1);continue}
    g.save();g.globalCompositeOperation='lighter';g.strokeStyle=s.c;g.globalAlpha=1-k;g.lineWidth=10*(1-k)+1;g.beginPath();g.arc(s.x,s.y,10+s.maxR*(1-Math.pow(1-k,3)),0,Math.PI*2);g.stroke();g.restore()}
  for(let i=FX.parts.length-1;i>=0;i--){const p=FX.parts[i];p.life-=dt;if(p.life<=0||p.y>innerHeight+60){FX.parts.splice(i,1);continue}
    if(p.k==='coin'){p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;const sx=Math.abs(Math.cos(p.rot));g.save();g.translate(p.x,p.y);g.scale(Math.max(.15,sx),1);
      const gr=g.createLinearGradient(-p.r,-p.r,p.r,p.r);gr.addColorStop(0,'#fff3c4');gr.addColorStop(.45,'#e0b44e');gr.addColorStop(1,'#8a5f12');g.fillStyle=gr;g.beginPath();g.arc(0,0,p.r,0,Math.PI*2);g.fill();
      g.strokeStyle='rgba(120,80,10,.8)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,p.r*.68,0,Math.PI*2);g.stroke();g.restore()}
    else if(p.k==='conf'){p.vy+=900*dt;p.vx*=.985;p.vy=Math.min(p.vy,220);p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.scale(1,Math.cos(p.rot*1.7));g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h);g.restore()}
    else{p.vx*=.93;p.vy=p.vy*.93+260*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,p.life*1.6);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,2.4,0,Math.PI*2);g.fill();g.restore()}}}
function vignette(kind='hit'){const v=$('#vignette');v.className='';void v.offsetWidth;v.className=kind==='alarm'?'alarm':'go'}
// 演出のまとめ
function celebrate(level=1){ // 1:成功 2:大成功 3:最大
  flash(level>=2?'rgba(255,236,190,.55)':'rgba(255,236,190,.3)');fxShock(innerWidth/2,innerHeight*.45,'#f4dc9f',level>=2?520:320);
  if(level>=2){fxRays('#f4dc9f',level>=3?3:2.2);fxCoins(level>=3?110:60);fxConfetti(level>=3?160:90)}else fxCoins(18,'burst');
  SFX.win(level>=2)}
function disaster(level=1){flash(level>=2?'rgba(255,30,60,.55)':'rgba(255,30,60,.35)');vignette('hit');shake(600,level>=2?.7:.4);fxShock(innerWidth/2,innerHeight*.45,'#ff4a62',level>=2?520:300);SFX.lose(level>=2)}
