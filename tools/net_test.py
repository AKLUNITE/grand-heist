import asyncio, os, sys, json, time
from playwright.async_api import async_playwright
PAGE="<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>"+open(os.environ.get('SRC',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','heist.html'))).read()+"</body></html>"
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),"vendor","three");BOT=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'bot.js')).read()+(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'mockpj.js')).read() if os.environ.get('PJ') else ';window.__NOPJ=true;')
BOT_=BOT
NP=int(sys.argv[1]) if len(sys.argv)>1 else 2      # 人間プレイヤー数
FAST=(sys.argv[2]=='fast') if len(sys.argv)>2 else True
LIMIT=int(sys.argv[3]) if len(sys.argv)>3 else 240
RC=len(sys.argv)>4 and sys.argv[4]=='rc'
clients={};toks={}
async def ws_handler(ws):
    from urllib.parse import urlparse, parse_qs
    q=parse_qs(urlparse(ws.url).query);pid=q['id'][0];tok=q['token'][0]
    if pid in clients and toks.get(pid)!=tok: ws.send(json.dumps({'type':'ID-TAKEN'}));return
    toks[pid]=tok
    clients[pid]=ws;ws.send(json.dumps({'type':'OPEN'}))
    def on_msg(msg):
        try:m=json.loads(msg)
        except: return
        if m.get('type')=='HEARTBEAT':return
        d=m.get('dst')
        if d in clients: clients[d].send(json.dumps({'type':m['type'],'src':pid,'dst':d,'payload':m.get('payload')}))
        elif m.get('type') in ('OFFER','C'): ws.send(json.dumps({'type':'EXPIRE','src':d}))
    ws.on_message(on_msg)
    ws.on_close(lambda *a: clients.pop(pid,None) if clients.get(pid) is ws else None)
async def route(rt):
    u=rt.request.url
    if "kaisure.test" in u: return await rt.fulfill(body=PAGE,content_type="text/html; charset=utf-8")
    if "three.min.js" in u: return await rt.fulfill(path=base+"/build/three.min.js",content_type="application/javascript")
    if "jsdelivr" in u and "three@" in u: return await rt.fulfill(path=base+u.split("three@0.128.0")[1],content_type="application/javascript")
    await rt.abort()
async def main():
    async with async_playwright() as p:
        pages=[];errs=[]
        for i in range(NP):
            b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--disable-features=WebRtcHideLocalIpsWithMdns","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"])
            ctx=await b.new_context(viewport={"width":1280,"height":800})
            await ctx.route_web_socket("wss://0.peerjs.com/**",ws_handler)
            await ctx.route("**/*",route)
            pg=await ctx.new_page()
            pg.on("pageerror",lambda e,i=i: errs.append(f"P{i} PAGEERR: {e}"))
            pg.on("console",lambda m,i=i: errs.append(f"P{i} {m.type}: {m.text}") if m.type in("error","warning") and 'ERR_FAILED' not in m.text and 'GPU' not in m.text else None)
            await pg.add_init_script("const _wc=WebSocket.prototype.close;WebSocket.prototype.close=function(...a){console.warn('WSCLOSE '+new Error().stack.replace(/\\n/g,' | ').slice(0,600));return _wc.apply(this,a.length?a:[1000,'bye'])};"+BOT+(";window.__FAST=true;" if FAST else "")+";window.__ICE=[];window.__NR=(location.search.indexOf('r')<0);")
            await pg.goto("https://kaisure.test/",wait_until="load",timeout=60000)
            await pg.evaluate(f"localStorage.setItem('gh_name','P{i}')")
            pages.append(pg)
        await asyncio.sleep(1.5)
        h=pages[0]
        await h.evaluate("document.querySelector('#npName').value='P0';localStorage.setItem('gh_name','P0');document.querySelector('#npCreate').click()")
        for k in range(20):
            await asyncio.sleep(1)
            st=await h.evaluate("JSON.stringify({st:NET.status,code:NET.code,on:NET.on,sig:NET.sig&&NET.sig.readyState})")
            if '"st":"in"' in st:break
        print('host',st,'clients',list(clients.keys()));print('\n'.join(errs[:10]))
        code=await h.evaluate("NET.code");print('room',code)
        for i,g in enumerate(pages[1:],1):
            await g.evaluate(f"document.querySelector('#npName').value='P{i}';localStorage.setItem('gh_name','P{i}');document.querySelector('#npCode').value='{code}';document.querySelector('#npJoin').click()")
        for k in range(12):
            await asyncio.sleep(2)
            for i,g in enumerate(pages):
                print(k,i,await g.evaluate("JSON.stringify({st:NET.status,sig:NET.sig&&NET.sig.readyState,peers:Object.values(NET.peers).map(P=>[P.id.slice(-6),P.pc?P.pc.connectionState:(P.conn&&P.conn.open?'open':'-'),P.cid])})"))
            if all([await g.evaluate("NET.status==='in'&&!!NET.lobby") for g in pages[1:]]):break
        print('clients',list(clients.keys()))
        print('joined')
        # 職業：割り込み系を混ぜる
        await h.evaluate("seatReq(1,'job','pickpocket');seatReq(2,'job','bouncer');seatReq(3,'job','informant')")
        await asyncio.sleep(1)
        # 席：P0=seat0, Pi=seat i ; 残りはCPU
        for i,g in enumerate(pages[1:],1):
            for k in range(30):
                ok=await g.evaluate(f"(()=>{{const b=document.querySelector('[data-sop=\"{i}:sit\"]');if(b){{b.click();return true}}return false}})()")
                if ok:break
                await asyncio.sleep(.5)
            print('sat',i,ok)
        await asyncio.sleep(1.5)
        print('seats',await h.evaluate("NET.lobby.seats.map(s=>(s.on?'on':'off')+':'+s.job+':'+(s.owner||'cpu')).join(' | ')"))
        await h.screenshot(path=f"net_lobby.png")
        if NP>1:
            await pages[1].evaluate("document.querySelector('#seats').scrollIntoView()")
            await pages[1].screenshot(path=f"net_lobby_g.png")
        for pg in pages: await pg.evaluate("window.__BOT=true")
        await h.evaluate("document.querySelector('#bStart').click()")
        t0=time.time();shot=0;done_rc=False
        while time.time()-t0<LIMIT:
            await asyncio.sleep(3)
            st=[]
            for pg in pages:
                st.append(await pg.evaluate("window.__K&&__K.S?[__K.S.phase,__K.S.stats.turns,__K.S.ip||0,__K.S.aq||0,(window.__DESYNC||0)]:null"))
            print(int(time.time()-t0),st)
            if time.time()-t0>20 and shot==0:
                shot=1
                for i,pg in enumerate(pages): await pg.screenshot(path=f"net_mid{i}.png")
            if all(s and s[0]=='end' for s in st): break
            if RC and not done_rc and time.time()-t0>45:
                done_rc=True;print('>>> reload guest1');await pages[1].reload(wait_until='load')
                await asyncio.sleep(1)
                for k in range(40):
                    await asyncio.sleep(1.5)
                    r=await pages[1].evaluate("JSON.stringify({st:NET.status,rep:NET.replaying,S:!!(window.__K&&__K.S),t:window.__K&&__K.S&&__K.S.stats.turns,own:window.__K&&__K.S&&__K.S.chars.map(c=>c.owner&&c.owner.slice(-3)).join(',')})")
                    print('  rc',r)
                    if '"rep":false' in r and '"S":true' in r: break
                print('host own',await h.evaluate("__K.S.chars.map(c=>c.owner&&c.owner.slice(-3)).join(',')"))
                await pages[1].evaluate("window.__BOT=true")
            if int(time.time()-t0)%15<3:
                for pg in pages: print('  dbg',await pg.evaluate("window.__DBG&&__DBG()"))
        hs=[]
        for pg in pages: hs.append(await pg.evaluate("__K.S?[__K.ev('stateHash()'),__K.S.phase,__K.S.chars.map(c=>c.escaped?1:0).join('')]:null"))
        print('final hashes',hs,'desync',await h.evaluate("window.__DESYNC||0"))
        for i,pg in enumerate(pages):
            print(i,'botlog',(await pg.evaluate("(()=>{const c={};window.__BOTLOG.forEach(x=>c[x]=(c[x]||0)+1);return JSON.stringify(c)})()")),await pg.evaluate("window.__BOTERR||''"))
            await pg.screenshot(path=f"net_end{i}.png")
        print('\n'.join(errs[:30]))
asyncio.run(main())
