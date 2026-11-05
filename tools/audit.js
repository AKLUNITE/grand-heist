window.__AUDIT=(tag)=>{const vw=innerWidth,vh=innerHeight;const out=[];
 document.querySelectorAll('body *').forEach(e=>{if(e.closest('svg')&&e.tagName!=='svg')return;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0)return;
  const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return;if(r.left>=vw-1||r.right<=1||r.top>=vh||r.bottom<=0)return;
  if(!(r.right>vw+1.5||r.left<-1.5))return;
  let p=e.parentElement,clip=false;while(p&&p!==document.documentElement){const ps=getComputedStyle(p);if(ps.overflowX!=='visible'||ps.overflow==='hidden'){const pr=p.getBoundingClientRect();if(pr.right<=vw+1.5&&pr.left>=-1.5){clip=true;break}}p=p.parentElement}
  if(clip)return;if(['CANVAS'].includes(e.tagName))return;
  out.push(e)});
 const top=out.filter(e=>!out.some(o=>o!==e&&o.contains(e)));
 return top.map(e=>{const r=e.getBoundingClientRect();return (e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+'<'+e.tagName.toLowerCase()+'> ['+Math.round(r.left)+'..'+Math.round(r.right)+'] "'+(e.innerText||'').replace(/\s+/g,' ').slice(0,24)+'"'})};
