/* =====================================================================
   3D WORLD
   ===================================================================== */
const canvas=$('#world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x070508);scene.fog=new THREE.FogExp2(0x080609,.018);
const camera=new THREE.PerspectiveCamera(40,1,.1,400);
scene.add(new THREE.HemisphereLight(0x9c94c8,0x2a1808,.36));
const keyL=new THREE.DirectionalLight(0xffe6c0,.95);keyL.position.set(-8,16,10);keyL.castShadow=true;
keyL.shadow.mapSize.set(2048,2048);Object.assign(keyL.shadow.camera,{left:-15,right:15,top:14,bottom:-12,near:1,far:60});keyL.shadow.bias=-.0006;scene.add(keyL);
const fillL=new THREE.DirectionalLight(0x6a78c8,.35);fillL.position.set(10,8,-6);scene.add(fillL);
let composer=null,bloom=null;
try{composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));
  bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),.55,.5,.38);composer.addPass(bloom)}catch(e){composer=null}

function canvasTex(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t}
function makeWinTex(pal,density=.4){const t=canvasTex(64,128,(g,w,h)=>{g.fillStyle='#08080d';g.fillRect(0,0,w,h);for(let y=6;y<h-4;y+=9)for(let x=5;x<w-4;x+=9){if(Math.random()<density){g.fillStyle=pick(pal);g.globalAlpha=.35+Math.random()*.55;g.fillRect(x,y,5,4)}}g.globalAlpha=1});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
const sparkTex=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)});
const winTex=makeWinTex(['#ffd9a0','#ffe9c8','#fff4e0','#ffc070'],.38);
const goldWin=makeWinTex(['#f4dc9f','#e6c070','#fff2c8'],.55);
function M(col,em=0,ei=0,o={}){return new THREE.MeshStandardMaterial({color:col,emissive:em,emissiveIntensity:ei,roughness:o.r??.45,metalness:o.m??.3,side:o.side??THREE.FrontSide,transparent:!!o.op,opacity:o.op??1})}
const G=c=>new THREE.MeshBasicMaterial({color:c});
function mk(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);return m}
const GOLD=M(0xd9b46a,0x6a4a10,.25,{m:.9,r:.28}),GOLDG=M(0xf4dc9f,0xd9a440,.9,{m:.6,r:.3});
function shadowize(o,cast=true,recv=false){o.traverse(m=>{if(m.isMesh){m.castShadow=cast;m.receiveShadow=recv}})}

const world=new THREE.Group();scene.add(world);
const pickables=[];const tiles={};const anims=[];
const key=(r,c)=>r+','+c;
const clock=new THREE.Clock();

// 卓（木のテーブル）と印刷されたゲームボード
const BOARD={W:25,D:19.5,cz:1.6};
const TRACK_X=i=>-9.1+i*1.3, TRACK_Z=8.6, SLOT_X=i=>-5.2+i*2.6, SLOT_Z=10.15;
let boardMat=null;
function boardTex(){return canvasTex(2500,1950,(g,w,h)=>{const U=100,X=x=>(x+BOARD.W/2)*U,Z=z=>(z-(BOARD.cz-BOARD.D/2))*U;
  const bg=g.createRadialGradient(w/2,h*.45,100,w/2,h/2,w*.7);bg.addColorStop(0,'#141824');bg.addColorStop(1,'#0a0c12');g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.save();g.globalAlpha=.05;g.strokeStyle='#d9b46a';g.lineWidth=2;for(let i=-h;i<w;i+=28){g.beginPath();g.moveTo(i,0);g.lineTo(i+h,h);g.stroke();g.beginPath();g.moveTo(i+h,0);g.lineTo(i,h);g.stroke()}g.restore();
  g.strokeStyle='#d9b46a';g.lineWidth=12;g.strokeRect(34,34,w-68,h-68);g.lineWidth=3;g.strokeRect(60,60,w-120,h-120);
  [[60,60],[w-60,60],[60,h-60],[w-60,h-60]].forEach(([x,y])=>{g.save();g.translate(x,y);g.rotate(Math.PI/4);g.fillStyle='#d9b46a';g.fillRect(-16,-16,32,32);g.fillStyle='#0a0c12';g.fillRect(-7,-7,14,14);g.restore()});
  // マップの枠
  g.save();g.strokeStyle='rgba(217,180,106,.45)';g.lineWidth=3;g.strokeRect(X(-10.25),Z(-7.25),20.5*U,14.5*U);g.restore();
  // 警戒トラック
  g.textBaseline='middle';g.fillStyle='#f2ece0';g.font='800 46px "Shippori Mincho B1", serif';g.textAlign='left';g.fillText('警戒レベル',X(-9.7),Z(7.72));
  g.fillStyle='#b3adbd';g.font='700 30px "Zen Kaku Gothic New", sans-serif';g.fillText('移動で6が出ると1つ進む　◆で警察が動く　15で強行突入',X(-6.4),Z(7.74));
  for(let i=0;i<15;i++){const cx=X(TRACK_X(i)),cy=Z(TRACK_Z),s=108;const n=i+1,heat=i/14;
    g.fillStyle=`rgba(238,58,84,${.05+heat*.16})`;g.fillRect(cx-s/2,cy-s/2,s,s);g.strokeStyle=n===15?'#ee3a54':'rgba(217,180,106,.8)';g.lineWidth=n===15?6:3;g.strokeRect(cx-s/2,cy-s/2,s,s);
    g.fillStyle='#f2ece0';g.textAlign='center';g.font='700 40px "Barlow Condensed", sans-serif';g.fillText(n===15?'MAX':n,cx,cy-(FIRE.includes(n)?14:0));
    if(FIRE.includes(n)){g.save();g.translate(cx,cy+28);g.rotate(Math.PI/4);g.fillStyle='#d9b46a';g.fillRect(-9,-9,18,18);g.restore()}}
  // 報酬スロット
  g.textAlign='left';g.fillStyle='#f2ece0';g.font='800 46px "Shippori Mincho B1", serif';g.fillText('報酬',X(-9.7),Z(SLOT_Z)-22);
  g.fillStyle='#b3adbd';g.font='700 28px "Zen Kaku Gothic New", sans-serif';g.fillText('全員に効果',X(-9.7),Z(SLOT_Z)+28);
  for(let i=0;i<5;i++){const cx=X(SLOT_X(i)),cy=Z(SLOT_Z);g.setLineDash([14,10]);g.strokeStyle='rgba(217,180,106,.55)';g.lineWidth=3;g.strokeRect(cx-118,cy-64,236,128);g.setLineDash([]);
    g.fillStyle='rgba(217,180,106,.35)';g.textAlign='center';g.font='700 34px "Barlow Condensed", sans-serif';g.fillText('REWARD '+(i+1),cx,cy)}
  g.textAlign='right';g.fillStyle='#d9b46a';g.font='72px Limelight, serif';g.fillText('GRAND HEIST',X(12.2)-40,Z(SLOT_Z)-14);
  g.fillStyle='#857f90';g.font='600 26px "Barlow Condensed", sans-serif';g.fillText('THE AURORA JOB  ·  2–5 PLAYERS',X(12.2)-44,Z(SLOT_Z)+44);
})}
function woodTex(){const t=canvasTex(1024,1024,(g,w)=>{g.fillStyle='#3a2414';g.fillRect(0,0,w,w);
  for(let y=0;y<w;y+=2){const v=Math.sin(y*.045)*.5+Math.sin(y*.013+1)*.5;g.fillStyle=`rgba(${v>0?'90,55,30':'20,10,5'},${Math.abs(v)*.35})`;g.fillRect(0,y,w,2)}
  for(let i=0;i<260;i++){g.strokeStyle=`rgba(15,8,3,${Math.random()*.25})`;g.lineWidth=1+Math.random()*2;const y=Math.random()*w;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=64)g.lineTo(x,y+Math.sin(x*.01+i)*8);g.stroke()}
  for(let k=0;k<4;k++){const x=Math.random()*w,y=Math.random()*w;for(let r=4;r<60;r+=5){g.strokeStyle=`rgba(20,10,4,${.25-r/300})`;g.beginPath();g.ellipse(x,y,r*2.4,r*.7,0,0,Math.PI*2);g.stroke()}}});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);return t}
(function env(){
  const table=mk(new THREE.BoxGeometry(70,1,46),new THREE.MeshStandardMaterial({map:woodTex(),roughness:.55,metalness:.05,color:0xb08a6a}),0,-.84,BOARD.cz);table.receiveShadow=true;scene.add(table);
  const slab=mk(new THREE.BoxGeometry(BOARD.W,.32,BOARD.D),M(0x0b0c11,0,0,{r:.4,m:.3}),0,-.17,BOARD.cz);slab.receiveShadow=true;slab.castShadow=true;scene.add(slab);
  const trim=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD.W,.32,BOARD.D)),new THREE.LineBasicMaterial({color:0xd9b46a,transparent:true,opacity:.5}));trim.position.set(0,-.17,BOARD.cz);scene.add(trim);
  boardMat=new THREE.MeshStandardMaterial({map:boardTex(),roughness:.85,metalness:.05,color:0xc8c8c8});
  const top=mk(new THREE.PlaneGeometry(BOARD.W,BOARD.D),boardMat,0,.0,BOARD.cz,-Math.PI/2);top.receiveShadow=true;scene.add(top);
  // 部屋の暗がりに浮かぶ灯り（ボケ）
  for(let i=0;i<16;i++){const a=Math.random()*Math.PI*2,r=40+Math.random()*30;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex,color:pick([0xffb860,0xff9040,0xffe0a0,0x6a90ff]),transparent:true,opacity:.18+Math.random()*.15,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    sp.position.set(Math.cos(a)*r,4+Math.random()*16,Math.sin(a)*r-10);sp.scale.setScalar(4+Math.random()*6);scene.add(sp)}
  const lamp=new THREE.SpotLight(0xffd6a0,.75,70,.62,.6,1.2);lamp.position.set(0,26,6);lamp.target.position.set(0,0,2);scene.add(lamp);scene.add(lamp.target);
})();

// カジノタワーとサーチライト
let alarmT=-9;
(function buildCasino(){
  const g=new THREE.Group();g.position.set(0,-.34,-12.6);g.scale.setScalar(.48);scene.add(g);
  g.add(mk(new THREE.CylinderGeometry(7.6,8,.4,64),M(0x0e0c08,0,0,{r:.3,m:.6}),0,.2,0));g.add(mk(new THREE.TorusGeometry(7.7,.08,8,96),GOLDG,0,.4,0,Math.PI/2));
  for(let i=0;i<6;i++){const w=9-i*1.15,h=3.4,d=5.5-i*.6;const t=goldWin.clone();t.needsUpdate=true;t.repeat.set(w/1.4,h/2.2);
    g.add(mk(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:0x100c06,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.7,roughness:.5,metalness:.5}),0,i*h+h/2,0));
    g.add(mk(new THREE.BoxGeometry(w+.15,.1,d+.15),GOLDG,0,i*h+h,0))}
  for(let i=-2;i<=2;i++)g.add(mk(new THREE.BoxGeometry(.08,20,.08),GOLDG,i*1.6,10,2.8));
  const crown=mk(new THREE.TorusGeometry(1.6,.1,8,48),GOLDG,0,21.4,0,Math.PI/2);g.add(crown);
  const gem=mk(new THREE.OctahedronGeometry(.9,0),M(0xffe7b0,0xd9a440,1.1,{m:.9,r:.2}),0,22.6,0);g.add(gem);
  const sign=canvasTex(1024,256,(c,w,h)=>{c.clearRect(0,0,w,h);c.font='150px Limelight, serif';c.textAlign='center';c.shadowColor='#ffcc70';c.shadowBlur=24;c.fillStyle='#fff3d6';c.fillText('AURORA',w/2,186)});
  g.add(mk(new THREE.PlaneGeometry(8,2),new THREE.MeshBasicMaterial({map:sign,transparent:true,depthWrite:false}),0,8.2,2.86));
  const cl=new THREE.PointLight(0xffb840,1.2,22);cl.position.set(0,8,6);g.add(cl);
  const beams=[];[-1,1].forEach(s=>{const piv=new THREE.Group();piv.position.set(s*3,20.5,0);g.add(piv);
    const cone=mk(new THREE.ConeGeometry(2.4,34,24,1,true),new THREE.MeshBasicMaterial({color:0xffd890,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,17,0);
    piv.add(cone);beams.push({piv,cone,s})});
  const cGold=new THREE.Color(0xffd890),cRed=new THREE.Color(0xee3a54);
  anims.push(t=>{gem.rotation.y=t;crown.rotation.z=t*.4;const heat=S&&S.phase==='adventure'?S.gauge/GAUGE_MAX:S&&S.phase!=='adventure'?1:0;const al=Math.max(0,1-(t-alarmT)/2.5);
    beams.forEach(b=>{b.piv.rotation.z=b.s*(.35+Math.sin(t*.5+b.s)*.35);b.piv.rotation.x=.3+Math.sin(t*.37*b.s)*.25;
      b.cone.material.color.copy(cGold).lerp(cRed,Math.min(1,heat*.8+al));b.cone.material.opacity=.05+heat*.05+al*.12})});
})();

// 警備ドローン
const drones=[];
(function buildDrones(){for(let i=0;i<2;i++){const g=new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(.3,.36,.1,20),M(0x16161c,0,0,{m:.85,r:.25})));
  g.add(mk(new THREE.TorusGeometry(.34,.015,6,32),GOLDG,0,0,0,Math.PI/2));
  [[.4,.4],[-.4,.4],[.4,-.4],[-.4,-.4]].forEach(([x,z])=>{g.add(mk(new THREE.TorusGeometry(.16,.015,6,20),M(0x2a2a32,0,0,{m:.8}),x,.05,z,Math.PI/2));const p=mk(new THREE.BoxGeometry(.42,.01,.03),M(0x8a8a96,0,0,{m:.8}),x,.06,z);p.userData.prop=1;g.add(p)});
  const eye=mk(new THREE.SphereGeometry(.08,12,12),G(0xee3a54),0,-.07,.2);g.add(eye);
  const cone=mk(new THREE.ConeGeometry(1.1,5,24,1,true),new THREE.MeshBasicMaterial({color:0xfff2d0,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),0,-2.5,0);g.add(cone);
  g.position.set(0,5,0);scene.add(g);drones.push({g,cone,eye,phase:i*Math.PI,busy:false})}
  const tmp=new THREE.Vector3();
  anims.push((t)=>drones.forEach((d,i)=>{d.g.children.forEach((c,k)=>{if(c.userData.prop)c.rotation.y=t*30+k});
    if(d.busy)return;const fin=S&&S.phase!=='adventure';const R=fin?5:6.5,H=fin?7:5;
    tmp.set(Math.cos(t*.22+d.phase)*R,H+Math.sin(t*1.3+i)*.3,Math.sin(t*.22+d.phase)*R*.8+(fin?-1:0));d.g.position.lerp(tmp,.04);
    const heat=S&&S.phase==='adventure'?S.gauge/GAUGE_MAX:fin?1:0;d.cone.material.opacity=.02+heat*.035;d.eye.material.color.setHSL(0.98,1,.45+Math.sin(t*8)*.1)}));
})();

/* ---------------- 盤面タイル ---------------- */
const geoCache={};
function hexGeo(r,h){const k=r+'_'+h;if(!geoCache[k])geoCache[k]=new THREE.CylinderGeometry(r,r,h,6);return geoCache[k]}
const goldEdgeMat=new THREE.LineBasicMaterial({color:0xd9b46a,transparent:true,opacity:.28});
const targetMarks=[];
function decoTower(h,w,matBody,crown=true){const g=new THREE.Group();let y=0;const tiers=[[w,h*.62],[w*.78,h*.25],[w*.55,h*.13]];
  tiers.forEach(([tw,th])=>{g.add(mk(new THREE.BoxGeometry(tw,th,tw),matBody,0,y+th/2,0));y+=th;g.add(mk(new THREE.BoxGeometry(tw+.02,.012,tw+.02),GOLDG,0,y,0))});
  if(crown)g.add(mk(new THREE.ConeGeometry(.02,.16,4),GOLDG,0,y+.08,0));return g}
function buildMap(){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=MAP[r][c],T=TERRAIN[t],p=hexPos(r,c),h=T.h;
    const m=new THREE.Mesh(hexGeo(.97,h),M(T.side,0,0,{r:.6,m:.35}));m.position.set(p.x,h/2,p.z);m.userData={r,c};m.receiveShadow=true;world.add(m);pickables.push(m);
    const topM=M(T.top,0,0,{r:.55,m:.25});const top=mk(hexGeo(.9,.02),topM,p.x,h+.01,p.z);top.receiveShadow=true;top.userData={r,c};world.add(top);pickables.push(top);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(hexGeo(.97,h)),goldEdgeMat);e.position.copy(m.position);world.add(e);
    const deco=new THREE.Group();deco.position.set(p.x,h+.02,p.z);world.add(deco);
    const tile={r,c,t,mesh:m,topM,edge:e,deco,top:h+.02,p};tiles[key(r,c)]=tile;
    const ang=Math.random()*Math.PI*2;
    if(t==='C'){const n=1+(Math.random()<.55?1:0);for(let i=0;i<n;i++){const bh=.42+Math.random()*.5,bw=.26+Math.random()*.1;const a=ang+i*Math.PI;
      const tx=winTex.clone();tx.needsUpdate=true;tx.repeat.set(.6,bh*1.3);
      const tw=decoTower(bh,bw,new THREE.MeshStandardMaterial({color:0x101219,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.55,roughness:.5,metalness:.4}));tw.position.set(Math.cos(a)*.5,0,Math.sin(a)*.5);deco.add(tw)}
      deco.add(mk(new THREE.CylinderGeometry(.012,.012,.32,6),M(0x1a1a20,0,0,{m:.8}),Math.cos(ang+1.6)*.55,.16,Math.sin(ang+1.6)*.55));
      deco.add(mk(new THREE.SphereGeometry(.035,8,8),G(0xffd9a0),Math.cos(ang+1.6)*.55,.33,Math.sin(ang+1.6)*.55))}
    if(t==='R'){for(let k=-2;k<=2;k++)deco.add(mk(new THREE.PlaneGeometry(.04,.18),new THREE.MeshBasicMaterial({color:0xf2ece0,transparent:true,opacity:.55}),Math.cos(ang)*k*.3,.003,Math.sin(ang)*k*.3,-Math.PI/2,0,-ang+Math.PI/2));
      if(Math.random()<.4){const lx=Math.cos(ang+Math.PI/2)*.62,lz=Math.sin(ang+Math.PI/2)*.62;deco.add(mk(new THREE.CylinderGeometry(.012,.015,.42,6),M(0x18181e,0,0,{m:.8}),lx,.21,lz));deco.add(mk(new THREE.SphereGeometry(.04,8,8),G(0xffd9a0),lx,.43,lz))}}
    if(t==='X'){deco.add(mk(new THREE.BoxGeometry(.5,.55,.22),M(0x2a1a18,0,0,{r:.95,m:0}),Math.cos(ang)*.5,.275,Math.sin(ang)*.5,0,-ang+Math.PI/2));
      deco.add(mk(new THREE.BoxGeometry(.2,.16,.14),M(0x1f2a24,0,0,{r:.7,m:.4}),Math.cos(ang+2.2)*.45,.08,Math.sin(ang+2.2)*.45,0,ang));
      deco.add(mk(new THREE.BoxGeometry(.14,.14,.14),M(0x3a2c1c,0,0,{r:.9,m:0}),Math.cos(ang+3.5)*.4,.07,Math.sin(ang+3.5)*.4,0,ang*2));
      if(Math.random()<.35)deco.add(mk(new THREE.BoxGeometry(.2,.05,.01),G(pick([0xee3a54,0xff7fd0])),Math.cos(ang)*.38,.45,Math.sin(ang)*.38,0,-ang+Math.PI/2))}
    if(t==='B'){const hq=new THREE.Group();deco.add(hq);
      hq.add(mk(new THREE.BoxGeometry(.95,.5,.7),M(0x0f1c1b,0,0,{r:.5,m:.4}),0,.25,-.1));
      hq.add(mk(new THREE.BoxGeometry(.6,.32,.02),M(0x0a1110,0x52d4c6,.35,{m:.6}),0,.17,.26));
      hq.add(mk(new THREE.BoxGeometry(.97,.02,.72),GOLDG,0,.5,-.1));
      const sgn=mk(new THREE.TorusGeometry(.12,.018,8,32),G(0x52d4c6),0,.68,.06);sgn.userData.dyn=1;hq.add(sgn);
      const ring=mk(new THREE.TorusGeometry(.83,.015,6,64),G(0x52d4c6),0,.01,0,Math.PI/2);ring.userData.dyn=1;deco.add(ring);
      const pl=new THREE.PointLight(0x52d4c6,.9,4.5);pl.position.set(0,1,.5);deco.add(pl);tile.hql=pl;anims.push(t=>{ring.rotation.z=t*.4;sgn.rotation.y=t*1.2})}
    if(t==='S'){const bar=mk(new THREE.BoxGeometry(.75,.38,.55),M(0x0f1a12,0x62e3a4,.06,{r:.5,m:.3}),0,.19,0);bar.userData.dyn=1;deco.add(bar);
      deco.add(mk(new THREE.BoxGeometry(.77,.02,.57),GOLDG,0,.38,0));
      const glass=new THREE.Group();glass.userData.dyn=1;glass.position.set(0,.6,0);deco.add(glass);
      const neon=mk(new THREE.ConeGeometry(.11,.12,16,1,true),new THREE.MeshBasicMaterial({color:0x62e3a4,side:THREE.DoubleSide}),0,0,0,Math.PI);glass.add(neon);
      glass.add(mk(new THREE.CylinderGeometry(.008,.008,.12,6),G(0x62e3a4),0,-.12,0));glass.add(mk(new THREE.SphereGeometry(.018,8,8),G(0xee3a54),.03,.02,0));
      tile.neon=neon;tile.bar=bar;anims.push(t=>{glass.rotation.y=t*.8})}
    if(t==='N'){const bmat=new THREE.MeshStandardMaterial({color:0x14100a,emissive:0xffffff,emissiveMap:goldWin,emissiveIntensity:.55,roughness:.35,metalness:.6});
      deco.add(decoTower(1.25,.7,bmat,false));
      const mark=mk(new THREE.OctahedronGeometry(.16,0),M(0xffe7b0,0xd9a440,1.2,{m:.8,r:.2}),0,1.55,0);mark.userData.dyn=1;deco.add(mark);targetMarks.push(mark);tile.mark=mark;
      const pl=new THREE.PointLight(0xffb840,.45,2.6);pl.position.y=1.5;deco.add(pl);tile.tl=pl}
    shadowize(deco,true,false);
  }
  anims.push(t=>targetMarks.forEach((m,i)=>{m.rotation.y=t*1.6;m.position.y=1.55+Math.sin(t*2+i)*.06}));
}

// 標的カード：スタンドに立った厚紙のカード。伏せた状態から下見でめくれる
const holos=[];
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function decoFrame(g,W,H,col){g.fillStyle='#0d0c12';g.fillRect(0,0,W,H);g.strokeStyle=col;g.lineWidth=6;g.strokeRect(10,10,W-20,H-20);g.globalAlpha=.5;g.lineWidth=2;g.strokeRect(24,24,W-48,H-48);g.globalAlpha=1;
  [[24,24],[W-24,24],[24,H-24],[W-24,H-24]].forEach(([x,y])=>{g.save();g.translate(x,y);g.rotate(Math.PI/4);g.fillStyle=col;g.fillRect(-8,-8,16,16);g.restore()})}
let cardBackTex=null;
function makeCardBack(){return canvasTex(1024,600,(g,W,H)=>{g.fillStyle='#14121a';g.fillRect(0,0,W,H);g.save();g.globalAlpha=.18;g.strokeStyle='#d9b46a';g.lineWidth=3;
  for(let i=-H;i<W+H;i+=40){g.beginPath();g.moveTo(i,0);g.lineTo(i+H,H);g.stroke();g.beginPath();g.moveTo(i+H,0);g.lineTo(i,H);g.stroke()}g.restore();
  g.strokeStyle='#d9b46a';g.lineWidth=8;g.strokeRect(14,14,W-28,H-28);g.lineWidth=2;g.strokeRect(32,32,W-64,H-64);
  g.fillStyle='#0d0c12';g.beginPath();g.arc(W/2,H/2-10,150,0,Math.PI*2);g.fill();g.strokeStyle='#d9b46a';g.lineWidth=4;g.stroke();
  g.fillStyle='#f4dc9f';g.textAlign='center';g.textBaseline='middle';g.font='800 200px "Shippori Mincho B1", serif';g.fillText('?',W/2,H/2);
  g.fillStyle='#d9b46a';g.font='700 40px "Barlow Condensed", sans-serif';g.fillText('T A R G E T',W/2,90);
  g.fillStyle='#f2ece0';g.font='700 40px "Zen Kaku Gothic New", sans-serif';g.fillText('隣接して「下見」でめくる',W/2,H-90)})}
function drawHolo(i){
  const q=S.quests[i],h=holos[i];if(!h)return;const g=h.ctx,W=1024,H=600;g.clearRect(0,0,W,H);
  const col=q.done?'#62e3a4':'#d9b46a';decoFrame(g,W,H,col);
  g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle=col;g.font='600 36px "Barlow Condensed", sans-serif';
  g.fillText(q.done?'P R E P A R E D':'T A R G E T   0'+(i+1),64,98);
  if(q.done){g.fillStyle='#f2ece0';g.font='800 92px "Shippori Mincho B1", serif';g.fillText('準備完了',64,260);
    g.fillStyle='#f4dc9f';g.font='700 46px "Zen Kaku Gothic New", sans-serif';g.fillText('入手：'+q.reward.name,64,370);
    g.fillStyle='#62e3a4';g.font='700 160px "Barlow Condensed", sans-serif';g.fillText('✓',W-190,530)}
  else{g.fillStyle='#f2ece0';g.font='800 72px "Shippori Mincho B1", serif';g.fillText(q.q.name,64,226);
    g.fillStyle='#52d4c6';g.font='700 48px "Zen Kaku Gothic New", sans-serif';g.fillText(qStat(q)+' 判定',64,322);
    if(q.progress){g.fillStyle='#62e3a4';g.font='700 40px "Zen Kaku Gothic New", sans-serif';g.fillText('達成マーカー ×'+q.progress,64,412)}
    g.fillStyle='#b3adbd';g.font='700 36px "Zen Kaku Gothic New", sans-serif';g.textAlign='right';g.fillText('必要成功数',W-64,412);
    g.fillStyle='#f4dc9f';g.font='700 190px "Barlow Condensed", sans-serif';g.fillText(Math.max(0,q.q.diff-q.progress),W-64,560);g.textAlign='left'}
  h.tex.needsUpdate=true;drawMini(i);
}
// 縮小時に出すマーク（説明文なし）
function drawMini(i){const q=S.quests[i],h=holos[i];if(!h||!h.mctx)return;const g=h.mctx,W=256;g.clearRect(0,0,W,W);
  const col=q.done?'#62e3a4':q.revealed?'#f4dc9f':'#d9b46a';
  g.beginPath();g.arc(W/2,W/2,112,0,Math.PI*2);g.fillStyle='rgba(13,12,18,.92)';g.fill();g.lineWidth=10;g.strokeStyle=col;g.stroke();
  g.beginPath();g.arc(W/2,W/2,94,0,Math.PI*2);g.lineWidth=3;g.globalAlpha=.5;g.stroke();g.globalAlpha=1;
  g.textAlign='center';g.textBaseline='middle';g.fillStyle=col;
  if(q.done){g.font='700 150px "Barlow Condensed", sans-serif';g.fillText('✓',W/2,W/2+8)}
  else if(!q.revealed){g.font='800 150px "Shippori Mincho B1", serif';g.fillText('?',W/2,W/2+6)}
  else{const st=qStat(q);g.fillStyle='#52d4c6';g.font=`700 ${st.length>2?30:38}px "Zen Kaku Gothic New", sans-serif`;g.fillText(st,W/2,W/2-56);
    g.fillStyle='#f4dc9f';g.font='700 132px "Barlow Condensed", sans-serif';g.fillText(Math.max(0,q.q.diff-q.progress),W/2,W/2+30)}
  h.mtex.needsUpdate=true}
function buildHolos(){
  if(!cardBackTex)cardBackTex=makeCardBack();
  holos.forEach(h=>{world.remove(h.pivot);world.remove(h.beam)});holos.length=0;
  S.quests.forEach((q,i)=>{const cv=document.createElement('canvas');cv.width=1024;cv.height=600;const tex=new THREE.CanvasTexture(cv);tex.anisotropy=8;
    const side=M(0x2a2312,0,0,{r:.6,m:.3});
    const front=new THREE.MeshStandardMaterial({map:tex,roughness:.5,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.42});
    const back=new THREE.MeshStandardMaterial({map:cardBackTex,roughness:.5,emissive:0xffffff,emissiveMap:cardBackTex,emissiveIntensity:.38});
    const card=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.46,.05),[side,side,side,side,front,back]);card.castShadow=true;
    const inner=new THREE.Group();inner.add(card);inner.rotation.y=q.revealed?0:Math.PI;
    const pivot=new THREE.Group();pivot.rotation.order='YXZ';pivot.add(inner);const p=hexPos(q.r,q.c);pivot.position.set(p.x,2.9,p.z);world.add(pivot);
    const rod=mk(new THREE.CylinderGeometry(.018,.018,1.0,8),GOLD.clone(),p.x,2.05,p.z);world.add(rod);
    const mc=document.createElement('canvas');mc.width=mc.height=256;const mtex=new THREE.CanvasTexture(mc);
    const mini=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:mtex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));mini.scale.setScalar(.001);pivot.add(mini);
    holos.push({pivot,inner,tex,ctx:cv.getContext('2d'),beam:rod,base:2.9,card,mini,mtex,mctx:mc.getContext('2d')});drawHolo(i)});
}
// 下見カードの表示モード：auto=近くだけ大きく / big=常に大きく / off=めくる時だけ表示
let HOLO_MODE='auto';try{HOLO_MODE=localStorage.getItem('gh_holo')||'auto'}catch(e){}
const HOLO_LABEL={auto:'カード 自動',big:'カード 大',off:'カード 隠す'};
function holoTarget(h,i){const q=S&&S.quests[i];if(h.busy||!q)return[1,0];
  if(h.hover||h.pin)return[1,0];if(HOLO_MODE==='off')return[0,0];if(HOLO_MODE==='big')return[q.done?.6:1,0];
  return[0,q.done?.7:1]}
let holoT=null;
anims.push(t=>{const dt=holoT==null?0:Math.min(.5,Math.max(0,t-holoT));holoT=t;const kk=1-Math.exp(-dt*9);holos.forEach((h,i)=>{const adv=!S||S.phase==='adventure';
  const [tc,tm]=adv?holoTarget(h,i):[h.sc==null?1:h.sc,0];
  h.sc=h.sc==null?tc:h.sc+(tc-h.sc)*kk;h.ms=h.ms==null?tm:h.ms+(tm-h.ms)*kk;const sc=Math.max(.001,h.sc),ms=Math.max(.001,h.ms);
  if(adv){const vis=sc>.03||ms>.03;h.pivot.visible=vis;h.beam.visible=vis}
  h.inner.scale.setScalar(sc);h.inner.visible=sc>.02;h.mini.scale.setScalar(ms);h.mini.visible=ms>.02;
  if(!h.busy){h.base=1.7+Math.max(1.25*sc,.62*ms);h.pivot.position.y=h.base+Math.sin(t*1.4+i)*.05}
  const L=Math.max(.05,h.base-Math.max(.73*sc,.48*ms)-1.55);h.beam.scale.y=L;h.beam.position.y=1.55+L/2;
  h.pivot.rotation.y=cam.theta;h.pivot.rotation.x=-.32})});
async function flipCard(i,toFront=true){const h=holos[i];h.busy=true;SFX.flip();const f=h.inner.rotation.y,to=toFront?0:Math.PI;
  await tween(700,k=>{h.inner.rotation.y=f+(to-f)*k;h.pivot.position.y=h.base+Math.sin(k*Math.PI)*.8},easeInOut);h.busy=false}
async function spinCard(i,mid){const h=holos[i];h.busy=true;SFX.flip();let done=false;
  await tween(900,k=>{h.inner.rotation.y=k*Math.PI*2;h.pivot.position.y=h.base+Math.sin(k*Math.PI)*1;if(!done&&k>.5){done=true;mid&&mid()}},easeInOut);h.inner.rotation.y=0;h.busy=false}
function cardWorld(i){const v=new THREE.Vector3();holos[i].pivot.getWorldPosition(v);return v}

// 警戒トラックのトークン（盤に印刷されたトラックの上を進む）
const TRK={};
function trackPos(v){const i=Math.max(1,Math.min(15,v))-1;return new THREE.Vector3(TRACK_X(i),.02,TRACK_Z)}
(function buildTrackToken(){const g=new THREE.Group();
  g.add(mk(new THREE.CylinderGeometry(.34,.38,.14,36),M(0x6a0a1a,0,0,{r:.35,m:.25}),0,.07,0));
  g.add(mk(new THREE.TorusGeometry(.35,.02,8,40),GOLD,0,.14,0,Math.PI/2));
  g.add(mk(new THREE.CylinderGeometry(.18,.24,.24,28),M(0x18181e,0,0,{r:.3,m:.6}),0,.26,0));
  const dome=mk(new THREE.SphereGeometry(.17,24,14,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xff6a80,emissive:0xff2040,emissiveIntensity:1,roughness:.2,transparent:true,opacity:.92}),0,.38,0);g.add(dome);
  shadowize(g);g.position.copy(trackPos(1));scene.add(g);TRK.token=g;
  anims.push(t=>{dome.material.emissiveIntensity=.7+Math.sin(t*6)*.5})})();
async function moveTrackToken(){const to=trackPos(S.gauge),f=TRK.token.position.clone();if(f.distanceTo(to)<.01)return;SFX.slide();
  await tween(520,k=>{TRK.token.position.lerpVectors(f,to,k);TRK.token.position.y=.02+Math.sin(k*Math.PI)*.7;TRK.token.rotation.y=k*Math.PI},easeInOut);SFX.tok();
  burst(to.clone().add(new THREE.Vector3(0,.3,0)),0xff4060,24,2,.25,.7,1)}
// 報酬タイル（カードから盤の報酬スロットへ飛んでいく）
function wrapText(g,txt,x,y,maxW,lh){let line='';const out=[];for(const ch of txt){if(g.measureText(line+ch).width>maxW){out.push(line);line=ch}else line+=ch}out.push(line);out.forEach((l,i)=>g.fillText(l,x,y+i*lh))}
function rewardTex(rw){return canvasTex(472,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2a2312');gr.addColorStop(1,'#130f07');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='#d9b46a';g.lineWidth=8;g.strokeRect(6,6,w-12,h-12);g.lineWidth=2;g.strokeRect(18,18,w-36,h-36);
  g.fillStyle='#f4dc9f';g.textAlign='center';g.textBaseline='middle';g.font='800 40px "Shippori Mincho B1", serif';g.fillText(rw.name,w/2,86);
  g.fillStyle='#ece6da';g.font='700 25px "Zen Kaku Gothic New", sans-serif';wrapText(g,rw.text,w/2,150,w-70,34)})}
async function placeRewardTile(rw,from){const i=S.rewardsGot.length;S.rewardsGot.push(rw.id);const tex=rewardTex(rw);
  const side=M(0x2a2312,0,0,{r:.5,m:.4}),topM=new THREE.MeshStandardMaterial({map:tex,roughness:.45,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.25});
  const m=new THREE.Mesh(new THREE.BoxGeometry(2.3,.06,1.25),[side,side,topM,side,side,side]);m.castShadow=true;m.position.copy(from);scene.add(m);
  const to=new THREE.Vector3(SLOT_X(i),.04,SLOT_Z);const f=from.clone();SFX.deal();
  await tween(900,k=>{m.position.lerpVectors(f,to,k);m.position.y+=Math.sin(k*Math.PI)*3.5;m.rotation.x=(1-k)*Math.PI*2;m.rotation.z=Math.sin(k*Math.PI)*.4},easeInOut);
  m.rotation.set(0,0,0);SFX.tok();burst(to.clone().add(new THREE.Vector3(0,.2,0)),0xf4dc9f,40,2.5,.3,.8,1)}

// 移動可能マスのハイライト（必要な出目も表示）
const hlFill=new THREE.CircleGeometry(.86,6),hlRing=new THREE.RingGeometry(.8,.9,6,1);
const hlPool=[];
function needLabel(text){const tex=canvasTex(128,128,(g)=>{g.fillStyle='rgba(8,8,12,.88)';g.beginPath();g.arc(64,64,52,0,Math.PI*2);g.fill();g.strokeStyle='#52d4c6';g.lineWidth=5;g.stroke();
  g.fillStyle='#f2ece0';g.font='700 56px "Barlow Condensed", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,68)});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.5,.5,1);s.renderOrder=12;return s}
const needSprites={};
function clearHL(){hlPool.forEach(h=>h.g.visible=false)}
function addHL(r,c,color=0x52d4c6,label=null){let h=hlPool.find(x=>!x.g.visible);if(!h){const g=new THREE.Group();
    const f=mk(hlFill,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.14,depthWrite:false}),0,0,0,-Math.PI/2,0,Math.PI/6);
    const rg=mk(hlRing,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),0,.002,0,-Math.PI/2,0,Math.PI/6);
    g.add(f);g.add(rg);world.add(g);h={g,f,rg,lb:null};hlPool.push(h)}
  const T=tiles[key(r,c)];h.f.material.color.setHex(color);h.rg.material.color.setHex(color);h.g.position.set(T.p.x,T.top+.02,T.p.z);h.g.visible=true;
  h.f.userData={r,c};h.rg.userData={r,c};
  if(h.lb){h.g.remove(h.lb);h.lb=null}if(label){if(!needSprites[label])needSprites[label]=needLabel(label);const s=needSprites[label].clone();s.position.y=1.0;h.g.add(s);h.lb=s}}
anims.push(t=>hlPool.forEach(h=>{if(h.g.visible){h.f.material.opacity=.1+Math.sin(t*5)*.05;if(h.lb)h.lb.position.y=1.0+Math.sin(t*3)*.04}}));

/* ---------------- 職業ごとのコマ ---------------- */
// 職業色の漆塗りフィギュア＋黒と金のアクセサリー。台座は黒大理石に金の縁
function lathe(pts,seg=32,start=0,len=Math.PI*2){return new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)),seg,start,len)}
function buildJobPiece(job){
  const g=new THREE.Group();const col=job.col;
  const body=M(col,col,.08,{r:.32,m:.15}),dark=M(0x121217,0,0,{r:.25,m:.6}),ivory=M(0xf2ece0,0,0,{r:.35,m:.05}),glow=G(col);
  g.add(mk(new THREE.CylinderGeometry(.27,.3,.07,40),M(0x0d0d12,0,0,{r:.18,m:.7}),0,.035,0));
  g.add(mk(new THREE.TorusGeometry(.27,.012,8,48),GOLD,0,.072,0,Math.PI/2));
  g.add(mk(new THREE.TorusGeometry(.3,.008,8,48),glow,0,.01,0,Math.PI/2));
  const head=(y,r=.085,mat=body)=>{const h=mk(new THREE.SphereGeometry(r,24,18),mat,0,y,0);g.add(h);return h};
  const spin=[];
  switch(job.id){
  case 'phantom':{ // 白いスーツにマント、シルクハット、片眼鏡、ステッキ
    g.add(mk(lathe([[0,.07],[.13,.07],[.11,.2],[.085,.36],[.1,.42],[.06,.47],[0,.48]]),ivory));
    g.add(mk(lathe([[.21,.07],[.18,.2],[.125,.36],[.135,.43]],32,Math.PI*.55,Math.PI*.9),M(col,col,.1,{r:.3,m:.15,side:THREE.DoubleSide})));
    g.add(mk(new THREE.ConeGeometry(.035,.07,4),M(0x9a1028,0,0,{r:.3}),0,.42,.085,Math.PI));
    head(.55,.082,ivory);
    g.add(mk(new THREE.CylinderGeometry(.15,.15,.012,32),dark,0,.625,0));
    g.add(mk(new THREE.CylinderGeometry(.075,.08,.17,28),dark,0,.715,0));
    g.add(mk(new THREE.CylinderGeometry(.081,.081,.03,28),M(col,col,.2,{r:.3}),0,.65,0));
    g.add(mk(new THREE.TorusGeometry(.028,.006,8,20),GOLD,.032,.565,.075));
    g.add(mk(new THREE.CylinderGeometry(.008,.008,.42,8),GOLD,.19,.27,.06,0,0,-.08));
    g.add(mk(new THREE.SphereGeometry(.022,12,12),GOLD,.207,.48,.06));
    break}
  case 'cracker':{ // がっしり体型、ニット帽とヘッドライト、ドリル
    g.add(mk(lathe([[0,.07],[.17,.07],[.18,.14],[.15,.3],[.16,.38],[.1,.45],[0,.46]]),body));
    g.add(mk(new THREE.TorusGeometry(.155,.02,8,32),dark,0,.3,0,Math.PI/2));
    head(.54,.085);
    g.add(mk(new THREE.SphereGeometry(.092,20,12,0,Math.PI*2,0,Math.PI/2),dark,0,.555,0));
    g.add(mk(new THREE.CylinderGeometry(.094,.094,.03,24),GOLD,0,.565,0));
    g.add(mk(new THREE.SphereGeometry(.022,10,10),G(0xfff2c8),0,.585,.09));
    const drill=new THREE.Group();drill.position.set(.21,.3,.07);g.add(drill);
    drill.add(mk(new THREE.BoxGeometry(.07,.12,.06),dark,0,-.03,0));
    drill.add(mk(new THREE.CylinderGeometry(.04,.04,.12,16),GOLD,0,.03,.05,Math.PI/2));
    const bit=mk(new THREE.ConeGeometry(.022,.11,10),M(0xe8e8f0,0,0,{m:.9,r:.2}),0,.03,.16,Math.PI/2);drill.add(bit);spin.push(bit);
    break}
  case 'hacker':{ // フード、光るバイザー、ノートPC、周回するデータ片
    g.add(mk(lathe([[0,.07],[.19,.07],[.16,.2],[.12,.34],[.13,.42],[0,.44]]),body));
    g.add(mk(new THREE.SphereGeometry(.11,24,18),body,0,.54,-.01));
    g.add(mk(new THREE.CircleGeometry(.075,24),M(0x050507,0,0,{r:.2}),0,.54,.098));
    g.add(mk(new THREE.BoxGeometry(.11,.016,.006),G(0x9ffff4),0,.552,.1));
    const lap=new THREE.Group();lap.position.set(0,.36,.16);g.add(lap);
    lap.add(mk(new THREE.BoxGeometry(.2,.012,.13),dark));lap.add(mk(new THREE.BoxGeometry(.2,.13,.01),dark,0,.065,-.06,-.3));
    lap.add(mk(new THREE.PlaneGeometry(.18,.11),G(0x7ff2e6),0,.066,-.054,-.3));
    for(let i=0;i<3;i++){const b=mk(new THREE.BoxGeometry(.03,.03,.03),G(0x9ffff4));b.userData.orbit=i;g.add(b);spin.push(b)}
    break}
  case 'driver':{ // レーシングジャケット、キャップ、ゴーグル、ハンドル
    g.add(mk(lathe([[0,.07],[.14,.07],[.11,.2],[.09,.35],[.11,.42],[.06,.46],[0,.47]]),body));
    g.add(mk(new THREE.BoxGeometry(.025,.36,.01),ivory,0,.26,.098,-.18));
    head(.54,.082);
    g.add(mk(new THREE.SphereGeometry(.087,20,10,0,Math.PI*2,0,Math.PI/2),dark,0,.56,0));
    g.add(mk(new THREE.BoxGeometry(.13,.012,.09),dark,0,.565,.1));
    [-.04,.04].forEach(x=>g.add(mk(new THREE.TorusGeometry(.024,.008,8,16),GOLD,x,.6,.075)));
    g.add(mk(new THREE.BoxGeometry(.1,.008,.008),GOLD,0,.6,.075));
    const wheel=mk(new THREE.TorusGeometry(.09,.014,10,32),GOLD,0,.33,.17);g.add(wheel);spin.push(wheel);
    wheel.add(mk(new THREE.BoxGeometry(.17,.012,.012),GOLD));wheel.add(mk(new THREE.BoxGeometry(.012,.09,.012),GOLD,0,-.045,0));
    break}
  case 'disguise':{ // ドレス、羽根付きの仮面、手持ちの仮面
    g.add(mk(lathe([[0,.07],[.22,.07],[.18,.14],[.1,.3],[.085,.38],[.1,.43],[.05,.47],[0,.48]]),body));
    head(.55,.08,ivory);
    g.add(mk(new THREE.SphereGeometry(.086,20,10,0,Math.PI*2,0,Math.PI/2.2),dark,0,.565,-.01));
    const mask=new THREE.Group();mask.position.set(0,.56,.07);g.add(mask);
    mask.add(mk(new THREE.BoxGeometry(.16,.042,.012),GOLD));
    [-1,1].forEach(s=>{mask.add(mk(new THREE.TorusGeometry(.022,.006,6,16),dark,s*.04,0,.008));mask.add(mk(new THREE.ConeGeometry(.012,.13,6),M(col,col,.3),s*.09,.05,-.01,0,0,s*-.6))});
    g.add(mk(new THREE.CylinderGeometry(.006,.006,.3,6),GOLD,.2,.3,.06));
    const hm=mk(new THREE.CircleGeometry(.065,24),new THREE.MeshStandardMaterial({color:0xf2ece0,side:THREE.DoubleSide,roughness:.3}),.2,.48,.06);g.add(hm);spin.push(hm);
    break}
  case 'bouncer':{ // 肩幅の広い黒スーツ、サングラス、イヤホン
    g.add(mk(lathe([[0,.07],[.16,.07],[.15,.2],[.2,.36],[.21,.4],[.14,.44],[0,.45]],6),dark));
    g.add(mk(new THREE.BoxGeometry(.05,.16,.01),ivory,0,.34,.13));
    g.add(mk(new THREE.BoxGeometry(.025,.13,.012),M(col,col,.3),0,.33,.135));
    head(.52,.078);
    g.add(mk(new THREE.BoxGeometry(.14,.032,.02),M(0x050507,0,0,{r:.1,m:.8}),0,.535,.07));
    g.add(mk(new THREE.SphereGeometry(.013,8,8),GOLD,.078,.52,0));
    g.add(mk(new THREE.CylinderGeometry(.004,.004,.1,6),GOLD,.078,.47,-.02));
    break}
  case 'pickpocket':{ // 小柄な猫背、ハンチング帽、袋、指先の金貨
    const b=mk(lathe([[0,.07],[.13,.07],[.11,.18],[.09,.3],[.1,.36],[0,.38]]),body);b.rotation.x=.16;g.add(b);
    head(.45,.08).position.z=.05;
    g.add(mk(new THREE.CylinderGeometry(.09,.095,.03,24),dark,0,.515,.04));
    g.add(mk(new THREE.BoxGeometry(.11,.01,.07),dark,0,.505,.12));
    g.add(mk(new THREE.SphereGeometry(.12,20,16),ivory,-.1,.34,-.12));
    g.add(mk(new THREE.TorusGeometry(.04,.01,6,16),GOLD,-.08,.46,-.1,Math.PI/2));
    const coin=mk(new THREE.CylinderGeometry(.04,.04,.01,24),GOLD,.12,.3,.1,Math.PI/2);g.add(coin);spin.push(coin);
    break}
  case 'informant':{ // トレンチコート、中折れ帽、新聞
    g.add(mk(lathe([[0,.07],[.19,.07],[.15,.2],[.11,.36],[.13,.44],[.07,.49],[0,.5]]),body));
    g.add(mk(lathe([[.13,.42],[.15,.46],[.11,.5]]),M(col,col,.08,{r:.3,side:THREE.DoubleSide})));
    head(.57,.08,ivory);
    g.add(mk(new THREE.CylinderGeometry(.14,.14,.012,32),dark,0,.63,0));
    g.add(mk(new THREE.CylinderGeometry(.068,.08,.1,24),dark,0,.685,0));
    g.add(mk(new THREE.CylinderGeometry(.081,.081,.022,24),GOLD,0,.645,0));
    const paper=new THREE.Group();paper.position.set(.14,.33,.12);paper.rotation.y=-.5;g.add(paper);
    paper.add(mk(new THREE.BoxGeometry(.15,.19,.008),ivory));
    for(let i=0;i<4;i++)paper.add(mk(new THREE.BoxGeometry(.11,.008,.002),dark,0,.05-i*.03,.005));
    break}
  }
  shadowize(g,true,false);g.userData.spin=spin;g.userData.job=job.id;return g;
}
function animatePiece(g,t){(g.userData.spin||[]).forEach((o)=>{
  if(o.userData.orbit!=null){const a=t*1.6+o.userData.orbit*2.1;o.position.set(Math.cos(a)*.21,.48+Math.sin(t*3+o.userData.orbit)*.04,Math.sin(a)*.21);o.rotation.set(t,t*1.3,0)}
  else if(g.userData.job==='cracker')o.rotation.z=t*18;
  else if(g.userData.job==='pickpocket')o.rotation.z=t*3;
  else if(g.userData.job==='driver')o.rotation.z=Math.sin(t*1.6)*.5;
  else o.rotation.y=Math.sin(t*1.4)*.6})}

const pieces={};
function nameTag(text,css){const tex=canvasTex(512,112,(g,w)=>{g.font='900 46px "Zen Kaku Gothic New", sans-serif';const tw=Math.min(w-40,g.measureText(text).width+56);const x=(w-tw)/2;
  g.fillStyle='rgba(8,8,12,.88)';roundRect(g,x,14,tw,80,40);g.fill();g.strokeStyle=css;g.lineWidth=5;roundRect(g,x,14,tw,80,40);g.stroke();
  g.fillStyle='#f2ece0';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,57)});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(1.3,.285,1);s.renderOrder=10;return s}
function buildPieces(){
  Object.values(pieces).forEach(p=>world.remove(p.g));
  S.chars.forEach(ch=>{const g=new THREE.Group();const fig=buildJobPiece(ch);fig.scale.setScalar(1.25);g.add(fig);
    const ring=mk(new THREE.RingGeometry(.4,.5,40),new THREE.MeshBasicMaterial({color:ch.col,transparent:true,opacity:.7,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}),0,.015,0,-Math.PI/2);g.add(ring);
    const lb=nameTag(ch.name,ch.css);lb.position.y=1.18;g.add(lb);
    world.add(g);pieces[ch.id]={g,fig,ring,lb};placePiece(ch,false)});
}
function slotPos(ch){const T=tiles[key(ch.r,ch.c)];let x=T.p.x,z=T.p.z;
  if(T.t==='B'||T.t==='S'){const here=S.chars.filter(o=>!o.dead&&o.r===ch.r&&o.c===ch.c);const i=here.indexOf(ch);if(here.length>1){const a=i/here.length*Math.PI*2+.5;x+=Math.cos(a)*.42;z+=Math.sin(a)*.42}}
  return new THREE.Vector3(x,T.top,z)}
function placePiece(ch,anim=true){const P=pieces[ch.id];if(!P)return;P.g.visible=!ch.dead||S.phase==='final';
  if(S.phase!=='adventure')return;
  const to=slotPos(ch);if(!anim){P.g.position.copy(to);return}
  const from=P.g.position.clone();SFX.whoosh();return tween(460,k=>{P.g.position.lerpVectors(from,to,k);P.g.position.y+=Math.sin(k*Math.PI)*.9;P.fig.rotation.y=Math.atan2(to.x-from.x,to.z-from.z)},easeInOut).then(()=>{SFX.tok()})}
function reflowAll(){S.chars.forEach(ch=>{if(!ch.dead)pieces[ch.id].g.position.copy(slotPos(ch))})}

// パトカー（警察が動くたびに増える）
function spawnPolice(){const roads=[];MAP.forEach((row,r)=>[...row].forEach((t,c)=>{if(t==='R')roads.push([r,c])}));if(!roads.length)return;
  const [r,c]=pick(roads);const T=tiles[key(r,c)];const g=new THREE.Group();
  g.add(mk(new THREE.BoxGeometry(.3,.1,.58),M(0xf2ece0,0,0,{r:.25,m:.4}),0,.09,0));g.add(mk(new THREE.BoxGeometry(.31,.05,.6),M(0x101014,0,0,{r:.3,m:.5}),0,.04,0));
  g.add(mk(new THREE.BoxGeometry(.25,.09,.28),M(0x14141c,0,0,{r:.15,m:.7}),0,.18,-.03));
  const red=mk(new THREE.BoxGeometry(.09,.035,.05),G(0xff2040),-.055,.24,-.03),blue=mk(new THREE.BoxGeometry(.09,.035,.05),G(0x3a70ff),.055,.24,-.03);g.add(red);g.add(blue);
  const pl=new THREE.PointLight(0xff2040,1,2.4);pl.position.y=.6;g.add(pl);shadowize(g);
  const a=Math.random()*Math.PI*2;g.position.set(T.p.x+Math.cos(a)*.48,T.top,T.p.z+Math.sin(a)*.48);g.rotation.y=a+Math.PI/2;world.add(g);
  burst(g.position.clone().add(new THREE.Vector3(0,.3,0)),0xff2040,30,2,.3,.8);
  anims.push(t=>{const on=Math.sin(t*14)>0;red.visible=on;blue.visible=!on;pl.color.setHex(on?0xff2040:0x3a70ff)})}

// 金庫扉（本番で地面からせり上がる）
const VAULT={};
(function buildVault(){
  const g=new THREE.Group();g.position.set(0,-14,-3.4);g.visible=false;scene.add(g);
  const steel=M(0x5a606c,0,0,{m:.95,r:.22}),dark=M(0x0b0b10,0x1a1208,.25,{m:.6,r:.5});
  g.add(mk(new THREE.BoxGeometry(11,10,1),dark,0,5,0));
  for(let i=-1;i<=1;i+=2)g.add(mk(new THREE.BoxGeometry(.12,10,.1),GOLDG,i*5.2,5,.52));
  g.add(mk(new THREE.BoxGeometry(10.5,.12,.1),GOLDG,0,9.6,.52));
  g.add(mk(new THREE.TorusGeometry(3.95,.26,16,96),GOLD,0,4.7,.55));
  g.add(mk(new THREE.TorusGeometry(4.35,.04,8,96),GOLDG,0,4.7,.6));
  const glowPlane=mk(new THREE.CircleGeometry(3.7,64),new THREE.MeshBasicMaterial({color:0xffe0a0}),0,4.7,.52);glowPlane.visible=false;g.add(glowPlane);
  const inner=new THREE.PointLight(0xffc860,0,28);inner.position.set(0,4.7,2);g.add(inner);
  const pivot=new THREE.Group();pivot.position.set(-3.7,4.7,.7);g.add(pivot);
  const door=new THREE.Group();door.position.set(3.7,0,0);pivot.add(door);
  door.add(mk(new THREE.CylinderGeometry(3.65,3.65,.6,96),steel,0,0,0,Math.PI/2));
  [3.1,2.3].forEach(r=>door.add(mk(new THREE.TorusGeometry(r,.06,8,96),GOLD,0,0,.32)));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;door.add(mk(new THREE.BoxGeometry(.06,.6,.02),GOLD,Math.cos(a)*2.7,Math.sin(a)*2.7,.31,0,0,a+Math.PI/2))}
  const dial=new THREE.Group();dial.position.z=.42;door.add(dial);
  dial.add(mk(new THREE.CylinderGeometry(1,1,.2,64),GOLD,0,0,0,Math.PI/2));
  dial.add(mk(new THREE.CylinderGeometry(.35,.35,.3,32),steel,0,0,.05,Math.PI/2));
  for(let i=0;i<3;i++)dial.add(mk(new THREE.CylinderGeometry(.07,.07,2.8,16),steel,0,0,.2,0,0,i*Math.PI/3));
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2;dial.add(mk(new THREE.BoxGeometry(.03,i%5?.08:.16,.02),G(0x2a1a00),Math.cos(a)*.88,Math.sin(a)*.88,.11,0,0,a+Math.PI/2))}
  const bolts=[],lights=[];
  for(let i=0;i<LOCKS;i++){const a=Math.PI/2-i*Math.PI*2/LOCKS;
    const b=mk(new THREE.CylinderGeometry(.2,.2,1,20),M(0xdfe2ea,0,0,{m:.95,r:.18}),Math.cos(a)*3.7,Math.sin(a)*3.7,0,0,0,a-Math.PI/2);b.userData.a=a;door.add(b);bolts.push(b);
    const L=mk(new THREE.SphereGeometry(.15,16,16),G(0xff2040),Math.cos(a)*4.7,4.7+Math.sin(a)*4.7,.62);g.add(L);lights.push(L)}
  Object.assign(VAULT,{g,pivot,door,dial,bolts,lights,glowPlane,inner});
})();

// 3Dパーティクルと金貨
const parts=[];
function burst(pos,color=0xffaa33,n=40,speed=4,size=.35,life=1,up=2){for(let i=0;i<n;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  sp.position.copy(pos);const v=new THREE.Vector3((Math.random()-.5),Math.random()*.8+.2,(Math.random()-.5)).normalize().multiplyScalar(speed*(.4+Math.random()*.8));v.y+=up*Math.random();
  sp.scale.setScalar(size*(.5+Math.random()));scene.add(sp);parts.push({sp,v,life:life*(.6+Math.random()*.6),age:0,s0:sp.scale.x})}}
const coinGeo=new THREE.CylinderGeometry(.12,.12,.025,20);const coins=[];
function coinShower(pos,n=40,speed=6){for(let i=0;i<n;i++){const m=new THREE.Mesh(coinGeo,GOLD);m.position.copy(pos);m.castShadow=true;scene.add(m);
  const v=new THREE.Vector3((Math.random()-.5)*speed,Math.random()*speed*.8+2,Math.random()*speed*.7+1);coins.push({m,v,w:new THREE.Vector3(Math.random()*12,Math.random()*12,0),age:0})}}
anims.push((t,dt)=>{for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;const k=p.age/p.life;if(k>=1){scene.remove(p.sp);p.sp.material.dispose();parts.splice(i,1);continue}
  p.v.y-=dt*4;p.sp.position.addScaledVector(p.v,dt);p.sp.material.opacity=1-k;p.sp.scale.setScalar(p.s0*(1-k*.5))}
  for(let i=coins.length-1;i>=0;i--){const c=coins[i];c.age+=dt;c.v.y-=dt*9;c.m.position.addScaledVector(c.v,dt);c.m.rotation.x+=c.w.x*dt;c.m.rotation.y+=c.w.y*dt;
    if(c.m.position.y<.05){c.m.position.y=.05;c.v.y*=-.3;c.v.x*=.6;c.v.z*=.6}if(c.age>7){scene.remove(c.m);coins.splice(i,1)}}});
function pieceWorld(ch){return pieces[ch.id].g.position.clone().add(new THREE.Vector3(0,.5,0))}
async function laserTo(target,color=0xff2040){
  let d=drones[0];if(drones[1]&&drones[1].g.position.distanceTo(target)<d.g.position.distanceTo(target))d=drones[1];
  d.busy=true;const f=d.g.position.clone(),dest=target.clone().add(new THREE.Vector3(0,3.2,.6));SFX.whoosh();
  await tween(500,k=>d.g.position.lerpVectors(f,dest,k),easeInOut);
  const from=d.g.position.clone().add(new THREE.Vector3(0,-.1,.2));const dir=target.clone().sub(from),len=dir.length();
  const m=mk(new THREE.CylinderGeometry(.05,.11,len,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.copy(from).addScaledVector(dir,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());scene.add(m);SFX.laser();
  await tween(600,k=>{m.material.opacity=1-k;m.scale.x=m.scale.z=1+k*2});scene.remove(m);burst(target,color,60,4,.45,1);d.busy=false}
function alarm(){alarmT=clock.elapsedTime;SFX.alarm();vignette('alarm');shake(500,.25)}

// カメラ
const cam={theta:.25,phi:1,rad:19,tgt:new THREE.Vector3(0,0,2),want:new THREE.Vector3(0,0,2),shakeA:0,wantRad:null};
function updateCam(){if(cam.wantTheta!=null){cam.theta+=(cam.wantTheta-cam.theta)*.04;if(Math.abs(cam.wantTheta-cam.theta)<.002)cam.wantTheta=null}cam.tgt.lerp(cam.want,.05);if(cam.wantRad!=null)cam.rad+=(cam.wantRad-cam.rad)*.04;
  const sx=(Math.random()-.5)*cam.shakeA,sy=(Math.random()-.5)*cam.shakeA;
  camera.position.set(cam.tgt.x+cam.rad*Math.sin(cam.phi)*Math.sin(cam.theta)+sx,cam.tgt.y+cam.rad*Math.cos(cam.phi)+sy,cam.tgt.z+cam.rad*Math.sin(cam.phi)*Math.cos(cam.theta));
  camera.lookAt(cam.tgt);cam.shakeA*=.9;viewGap()}
let VG={t:0,shift:0,cur:0};
function viewGap(){const now=performance.now();if(now-VG.t>300){VG.t=now;let top=0,bot=0;
    if(S&&!$('#hud').hidden&&isPhone()){const c=$('#crew'),tp=$('#top'),cm=$('#cmd');const r1=(c&&c.offsetParent?c:tp).getBoundingClientRect();top=r1.bottom;
      if(cm&&cm.offsetParent&&!cm.classList.contains('empty')){bot=innerHeight-cm.getBoundingClientRect().top}}
    VG.shift=Math.max(-innerHeight*.3,Math.min(innerHeight*.3,(top-bot)/2));document.documentElement.style.setProperty('--dockh',bot+'px')}
  VG.cur+=(VG.shift-VG.cur)*.15;if(Math.abs(VG.cur)<.5&&VG.shift===0){if(camera.view&&camera.view.enabled){camera.clearViewOffset()}return}
  camera.setViewOffset(innerWidth,innerHeight,0,-VG.cur,innerWidth,innerHeight)}
function shake(ms,a=.3){cam.shakeA=a;const h=$('#hud');h.classList.remove('shake');void h.offsetWidth;h.classList.add('shake')}
function focusOn(ch,force){if(!ch||S.phase!=='adventure')return;if(cam.free&&!force)return;const p=slotPos(ch);const k=isPhone()?.95:.65;cam.want.set(p.x*k,0,p.z*k+(isPhone()?.6:1.8))}
const isPhone=()=>innerWidth<=860;
const ptrs=new Map();let dragMoved=0,pinch0=0;
// 盤面のスライド（平行移動）：右ドラッグ／中ドラッグ／Shift+ドラッグ／2本指ドラッグ／WASD・矢印キー
let panMode=false;
function camPing(){const f=$('#bFollow');if(!f||!cam.free)return;f.classList.remove('idle');clearTimeout(f._t);f._t=setTimeout(()=>f.classList.add('idle'),2500)}
function setCamFree(on){if(cam.free===on)return;cam.free=on;const b=$('#bCam');if(b){b.classList.toggle('free',!!on);b.textContent=on?'手番を追う':'視点'}const f=$('#bFollow');if(f){f.classList.toggle('show',!!on);if(on)camPing()}const m=$('#bMenu');if(m)m.classList.toggle('dot',!!on);cam.autoRad=null}
function camPan(dx,dy){setCamFree(true);camPing();const k=cam.rad*.0017,ct=Math.cos(cam.theta),st=Math.sin(cam.theta);
  const mx=(-dx*ct-dy*st)*k,mz=(dx*st-dy*ct)*k;
  [cam.tgt,cam.want].forEach(v=>{v.x=Math.min(13,Math.max(-13,v.x+mx));v.z=Math.min(13,Math.max(-9,v.z+mz))})}
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('input,textarea'))return;e.preventDefault()},true);
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});dragMoved=0;panMode=e.pointerType==='mouse'&&(e.button===2||e.button===1||e.shiftKey);if(e.button===1)e.preventDefault();if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y)}canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;
  camPing();if(ptrs.size===1){if(panMode)camPan(dx,dy);else{cam.wantTheta=null;cam.theta-=dx*.006;cam.phi=Math.min(1.35,Math.max(.25,cam.phi-dy*.005))}dragMoved+=Math.abs(dx)+Math.abs(dy)}
  if(ptrs.size===2){const [a0,b0]=[...ptrs.values()];const mx0=(a0.x+b0.x)/2,my0=(a0.y+b0.y)/2;p.x=e.clientX;p.y=e.clientY;const [a,b]=[...ptrs.values()];
    camPan((a.x+b.x)/2-mx0,(a.y+b.y)/2-my0);const d=Math.hypot(a.x-b.x,a.y-b.y);cam.wantRad=null;cam.rad=Math.min(34,Math.max(7,cam.rad*pinch0/d));pinch0=d;dragMoved=99}
  else{p.x=e.clientX;p.y=e.clientY}});
const panKeys={};addEventListener('keydown',e=>{if(/INPUT|TEXTAREA/.test(document.activeElement&&document.activeElement.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){panKeys[k]=1;if(k.startsWith('arrow'))e.preventDefault()}});
addEventListener('keyup',e=>{delete panKeys[e.key.toLowerCase()]});addEventListener('blur',()=>{for(const k in panKeys)delete panKeys[k]});
anims.push((t,dt)=>{let x=0,y=0;if(panKeys.a||panKeys.arrowleft)x+=1;if(panKeys.d||panKeys.arrowright)x-=1;if(panKeys.w||panKeys.arrowup)y+=1;if(panKeys.s||panKeys.arrowdown)y-=1;if(x||y)camPan(x*560*Math.min(.1,dt||.016),y*560*Math.min(.1,dt||.016))});
const endPtr=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);canvas.classList.remove('dragging');if(dragMoved<6&&ptrs.size===0){
  if(e.pointerType!=='mouse'&&S&&holos.length){const hq=holoHit(e);holos.forEach((h,i)=>h.pin=i===hq&&!h.pin);if(hq>=0)return}
  onWorldClick(e)}};
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',e=>ptrs.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{e.preventDefault();camPing();cam.wantRad=null;cam.rad=Math.min(34,Math.max(7,cam.rad*(1+e.deltaY*.001)))},{passive:false});
const ray=new THREE.Raycaster(),mv=new THREE.Vector2();
function holoHit(e){const r=canvas.getBoundingClientRect();const v=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(v,camera);
  const hits=ray.intersectObjects(holos.filter(h=>h.pivot.visible).flatMap(h=>[h.inner.visible?h.card:null,h.mini.visible?h.mini:null]).filter(Boolean));
  return hits.length?holos.findIndex(h=>h.card===hits[0].object||h.mini===hits[0].object):-1}
let hovT=0;canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||e.buttons||!S||!holos.length)return;const now=performance.now();if(now-hovT<60)return;hovT=now;
  const hq=holoHit(e);holos.forEach((h,i)=>h.hover=i===hq)});
const holoUnhover=()=>holos.forEach(h=>h.hover=false);canvas.addEventListener('pointerleave',holoUnhover);
document.addEventListener('pointermove',e=>{if(e.target!==canvas&&holos.some(h=>h.hover))holoUnhover()},true);
function onWorldClick(e){if(!S||S.phase!=='adventure'||BUSY||(S.step!=='move'&&S.step!=='warp')||!mine(cur()))return;const r=canvas.getBoundingClientRect();mv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mv,camera);
  const hl=[];hlPool.forEach(h=>{if(h.g.visible)hl.push(h.f,h.rg)});
  const hits=ray.intersectObjects(hl.concat(pickables));if(!hits.length)return;const ud=hits[0].object.userData;if(ud.r==null)return;
  if(S.step==='warp'){const ch=cur();if(warpTargets(ch).some(([a,b])=>a===ud.r&&b===ud.c))sendIn({k:'warp',r:ud.r,c:ud.c});return}
  if(reachable(cur()).some(([a,b])=>a===ud.r&&b===ud.c))sendIn({k:'move',r:ud.r,c:ud.c})}

/* ---------------- 編成画面のステージと職業アバター ---------------- */
const STAGE={r:new THREE.WebGLRenderer({canvas:$('#stage'),antialias:true,alpha:true,preserveDrawingBuffer:true}),scene:new THREE.Scene(),cam:new THREE.PerspectiveCamera(30,2,.1,50),group:new THREE.Group(),on:true};
STAGE.r.setPixelRatio(Math.min(devicePixelRatio,2));STAGE.r.toneMapping=THREE.ACESFilmicToneMapping;STAGE.r.shadowMap.enabled=true;STAGE.r.shadowMap.type=THREE.PCFSoftShadowMap;
STAGE.scene.add(new THREE.HemisphereLight(0xc0b8e8,0x2a1c0a,.75));
const sKey=new THREE.SpotLight(0xffe8c0,2.4,24,.75,.6);sKey.position.set(-1.5,6,4.5);sKey.castShadow=true;sKey.shadow.mapSize.set(1024,1024);STAGE.scene.add(sKey);STAGE.scene.add(sKey.target);
const sRim=new THREE.DirectionalLight(0x8a7cff,.7);sRim.position.set(3,3,-4);STAGE.scene.add(sRim);
STAGE.scene.add(STAGE.group);
const stFloor=mk(new THREE.CylinderGeometry(4.2,4.3,.1,96),M(0x0c0c12,0,0,{m:.6,r:.22}),0,-.05,0);stFloor.receiveShadow=true;stFloor.scale.set(1.4,1,.42);STAGE.scene.add(stFloor);
const stRing=mk(new THREE.TorusGeometry(4.25,.018,6,128),GOLDG,0,.002,0,Math.PI/2);stRing.scale.set(1.4,.42,1);STAGE.scene.add(stRing);
const ST_D=3.9,ST_TAN=Math.tan(15*Math.PI/180);
function stageBuild(){stageResize()}
function stageResize(){const w=$('#stageWrap').clientWidth,h=$('#stageWrap').clientHeight;if(!w||!h)return;STAGE.r.setSize(w,h,false);STAGE.cam.aspect=w/h;
  const on=SEATS.map((s,i)=>({s,i})).filter(o=>o.s.on);const wide=STAGE.cam.aspect>3;
  const n=Math.max(1,on.length);const sp=1.2;const need=wide?0:sp*n+.4;const dist=Math.max(ST_D,need/2/ST_TAN/STAGE.cam.aspect);
  const W=2*dist*ST_TAN*STAGE.cam.aspect;
  STAGE.cam.position.set(0,1.0+dist*.1,dist);STAGE.cam.lookAt(0,.6,0);STAGE.cam.updateProjectionMatrix();
  STAGE.group.clear();
  on.forEach((o,k)=>{const j=jobOf(o.s.job);const p=buildJobPiece(j);p.scale.setScalar(1.5);
    const x=wide?((o.i+.5)/SEATS.length-.5)*W:(k-(n-1)/2)*sp;p.position.set(x,0,0);p.userData.ph=k;STAGE.group.add(p);
    })}
function stageFrame(t){STAGE.group.children.forEach(p=>{if(p.userData.job){p.rotation.y=Math.sin(t*.7+p.userData.ph)*.55;animatePiece(p,t)}});STAGE.r.render(STAGE.scene,STAGE.cam)}
// 職業アバター画像（カードと一覧で使う）
const AV={};
function makeAvatars(){const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xd0c8f0,0x2a1c0a,.9));const l=new THREE.DirectionalLight(0xffe8c0,1.4);l.position.set(-1,3,3);sc.add(l);
  const c=new THREE.PerspectiveCamera(26,1,.1,20);c.position.set(0,.62,1.55);c.lookAt(0,.42,0);const r=STAGE.r;r.setSize(160,160,false);
  JOBS.forEach(j=>{const p=buildJobPiece(j);p.rotation.y=-.45;sc.add(p);r.render(sc,c);try{AV[j.id]=r.domElement.toDataURL('image/png')}catch(e){AV[j.id]=''}sc.remove(p)})}

/* ---------------- tween + loop ---------------- */
const tweens=[];
function tween(ms,fn,ease=x=>x){if(window.__FAST){fn(ease(1));return Promise.resolve()}ms*=SPEED*TEMPO;return new Promise(res=>tweens.push({t0:performance.now(),ms:Math.max(1,ms),fn,ease,res}))}
const easeOut=x=>1-Math.pow(1-x,3), easeInOut=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
/* ---------- 描画の軽量化：動かない街の部品をまとめる・画質プロファイル ---------- */
function matSig(m){if(m.map||m.emissiveMap||m.alphaMap)return'u'+m.uuid;const e=m.emissive?m.emissive.getHex():-1;
  return[m.type,m.color.getHex(),e,m.emissiveIntensity,m.roughness,m.metalness,m.transparent,m.opacity,m.side,m.depthWrite].join('|')}
function isDyn(o,stop){for(let x=o;x&&x!==stop;x=x.parent)if(x.userData&&x.userData.dyn)return true;return false}
function mergeGeos(list,withUV){let n=0;const parts=list.map(([g,mx])=>{let q=g.index?g.toNonIndexed():g.clone();q.applyMatrix4(mx);n+=q.attributes.position.count;return q});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=withUV?new Float32Array(n*2):null;let o=0;
  parts.forEach(q=>{const c=q.attributes.position.count;pos.set(q.attributes.position.array,o*3);if(q.attributes.normal)nor.set(q.attributes.normal.array,o*3);if(uv&&q.attributes.uv)uv.set(q.attributes.uv.array,o*2);o+=c;q.dispose()});
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));G.setAttribute('normal',new THREE.BufferAttribute(nor,3));if(uv)G.setAttribute('uv',new THREE.BufferAttribute(uv,2));G.computeBoundingSphere();return G}
function mergeStatic(){world.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(world.matrixWorld).invert();const groups=new Map();
  Object.values(tiles).forEach(T=>T.deco.traverse(o=>{if(!o.isMesh||isDyn(o,T.deco.parent))return;const k=matSig(o.material);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o)}));
  let before=0,after=0;
  groups.forEach(list=>{before+=list.length;if(list.length<2){after++;return}const m0=list[0];
    const G=mergeGeos(list.map(o=>[o.geometry,new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)]),!!(m0.material.map||m0.material.emissiveMap));
    const mm=new THREE.Mesh(G,m0.material);mm.castShadow=m0.castShadow;mm.receiveShadow=m0.receiveShadow;world.add(mm);list.forEach(o=>{o.parent.remove(o);o.geometry.dispose()});after++});
  // 六角マスの側面（色が変わらない）をまとめる。クリック判定用に元のメッシュは見えない状態で残す
  {const sg=new Map();Object.values(tiles).forEach(T=>{const k=matSig(T.mesh.material);if(!sg.has(k))sg.set(k,[]);sg.get(k).push(T.mesh)});
   sg.forEach(list=>{const G=mergeGeos(list.map(o=>{o.updateMatrixWorld(true);return[o.geometry,new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld)]}),false);
     const mm=new THREE.Mesh(G,list[0].material);mm.receiveShadow=true;world.add(mm);list.forEach(o=>{o.visible=false})})}
  // 六角マスの金の縁取りも1本に
  const edges=Object.values(tiles).map(T=>T.edge).filter(Boolean);if(edges.length>1){const arr=[];edges.forEach(e=>{e.updateMatrixWorld(true);const g=e.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,e.matrixWorld));arr.push(g)});
    let n=0;arr.forEach(g=>n+=g.attributes.position.count);const pos=new Float32Array(n*3);let o=0;arr.forEach(g=>{pos.set(g.attributes.position.array,o*3);o+=g.attributes.position.count;g.dispose()});
    const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));const L=new THREE.LineSegments(G,edges[0].material);world.add(L);edges.forEach(e=>{e.parent.remove(e);e.geometry.dispose()});Object.values(tiles).forEach(T=>T.edge=L)}
  console.log('mergeStatic',before,'->',after)}
// 画質：high（PC）/ std（スマホ標準）/ eco（省電力）
const QL={high:{pr:2,fps:60,bloom:1,plights:1,shadow:1},std:{pr:1.5,fps:30,bloom:1,plights:0,shadow:1},eco:{pr:1,fps:30,bloom:0,plights:0,shadow:0}};
const QLABEL={high:'画質 高',std:'画質 標準',eco:'省電力'};
let QMODE=(()=>{try{const v=localStorage.getItem('gh_q');if(v&&QL[v])return v}catch(e){}return(matchMedia('(pointer:coarse)').matches||innerWidth<=860)?'std':'high'})();
let bloomPass=null;
function applyQuality(){const q=QL[QMODE];renderer.setPixelRatio(Math.min(devicePixelRatio,q.pr));
  [DICE&&DICE.r,STAGE&&STAGE.r].forEach(r=>{if(r)r.setPixelRatio(Math.min(devicePixelRatio,q.pr))});
  if(composer&&bloom){bloom.enabled=!!q.bloom}
  renderer.shadowMap.enabled=!!q.shadow;renderer.shadowMap.needsUpdate=true;
  scene.traverse(o=>{if(o.isPointLight)o.visible=!!q.plights});
  scene.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.needsUpdate=true)}});
  const b=$('#bQ');if(b)b.textContent=QLABEL[QMODE];resize()}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(composer){composer.setSize(w,h);const bf=QMODE==='high'?1:.5;bloom.resolution.set(w*bf,h*bf)}
  DICE.r.setSize(w,h,false);DICE.cam.aspect=w/h;diceFit();if(w<=860)DICE.cam.setViewOffset(w,h,0,-h*.07,w,h);else DICE.cam.clearViewOffset();DICE.cam.updateProjectionMatrix();
  fxResize();if(!S)cam.rad=w<700?24:19;if(STAGE.on)stageResize()}
let lastF=0,frameN=0,fxDirty=true;
function loop(){const now0=performance.now();const q=QL[QMODE];if(q.fps<60&&now0-lastF<1000/q.fps-3){requestAnimationFrame(loop);return}lastF=now0;frameN++;
  const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime,now=performance.now();
  for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i];const k=Math.min(1,(now-tw.t0)/tw.ms);tw.fn(tw.ease(k));if(k>=1){tweens.splice(i,1);tw.res()}}
  anims.forEach(f=>f(t,dt));
  if(S){const act=S.chars[S.turn]?.id;Object.entries(pieces).forEach(([id,P])=>{const a=act===id&&S.phase!=='end';P.ring.material.opacity=a?.55+Math.sin(t*5)*.35:.22;P.ring.scale.setScalar(a?1+Math.sin(t*5)*.06:1);P.fig.position.y=a?Math.abs(Math.sin(t*3))*.06:0;animatePiece(P.fig,t)})}
  updateCam();const covered=DICE.on||document.getElementById('draw').classList.contains('show');
  renderer.shadowMap.needsUpdate=tweens.length>0||frameN%20===0;
  if(!window.__NR){if(!covered||frameN%30===0){if(composer&&bloom&&bloom.enabled)composer.render();else renderer.render(scene,camera)}if(STAGE.on)stageFrame(t)}
  if(DICE.on&&!window.__NR)diceFrame(dt,t);if(!window.__NR){const fxa=FX.parts.length||FX.rays.length||FX.shocks.length;if(fxa||fxDirty){fxFrame(dt);fxDirty=!!(FX.parts.length||FX.rays.length||FX.shocks.length)}}else{FX.parts.length=0}requestAnimationFrame(loop)}
