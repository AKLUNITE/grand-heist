(()=>{class E{constructor(){this.h={}}on(e,f){(this.h[e]=this.h[e]||[]).push(f);return this}emit(e,...a){(this.h[e]||[]).slice().forEach(f=>{try{f(...a)}catch(err){console.error(err)}})}}
class Conn extends E{constructor(p,peer){super();this.p=p;this.peer=peer;this.open=false;this.peerConnection={iceConnectionState:'new'}}
  send(d){this.p._send({type:'D',dst:this.peer,payload:d})}close(){if(!this.open)return;this.open=false;this.p._send({type:'CL',dst:this.peer});this.emit('close')}}
class Peer extends E{constructor(id,opts){super();this.id=id||'p'+Math.random().toString(36).slice(2);this.conns={};this.open=false;this.disconnected=false;this.destroyed=false;
  const ws=new WebSocket('wss://0.peerjs.com/peerjs?key=peerjs&id='+encodeURIComponent(this.id)+'&token=t'+Math.random());this.ws=ws;
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==='OPEN'){this.open=true;this.emit('open',this.id);return}
    if(m.type==='ID-TAKEN'){this.emit('error',{type:'unavailable-id'});return}
    if(m.type==='EXPIRE'){this.emit('error',{type:'peer-unavailable'});return}
    if(m.type==='C'){const c=new Conn(this,m.src);this.conns[m.src]=c;this.emit('connection',c);c.open=true;this._send({type:'CA',dst:m.src});setTimeout(()=>c.emit('open'),0);return}
    if(m.type==='CA'){const c=this.conns[m.src];if(c){c.open=true;c.peerConnection.iceConnectionState='connected';c.emit('open')}return}
    if(m.type==='D'){const c=this.conns[m.src];if(c&&c.open)c.emit('data',m.payload);return}
    if(m.type==='CL'){const c=this.conns[m.src];if(c&&c.open){c.open=false;c.emit('close')}return}};
  ws.onclose=()=>{if(!this.destroyed){this.disconnected=true;this.emit('disconnected')}}}
  connect(id){const c=new Conn(this,id);this.conns[id]=c;this._send({type:'C',dst:id});return c}
  _send(m){if(this.ws.readyState===1)this.ws.send(JSON.stringify(m))}
  reconnect(){}destroy(){this.destroyed=true;Object.values(this.conns).forEach(c=>c.close());try{this.ws.close()}catch(_){}}}
window.Peer=Peer})();
