import asyncio, os, sys
from playwright.async_api import async_playwright
SRC=os.environ.get('SRC',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','heist.html'));W=int(sys.argv[1]);H=int(sys.argv[2]);P=sys.argv[3]
PAGE="<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>"+open(SRC).read()+"</body></html>"
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),"vendor","three");AUD=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'audit.js')).read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":W,"height":H},device_scale_factor=1,is_mobile=True,has_touch=True)
        async def route(rt):
            u=rt.request.url
            if "kaisure.test" in u: return await rt.fulfill(body=PAGE,content_type="text/html; charset=utf-8")
            if "three.min.js" in u: return await rt.fulfill(path=base+"/build/three.min.js",content_type="application/javascript")
            if "jsdelivr" in u and "three@" in u: return await rt.fulfill(path=base+u.split("three@0.128.0")[1],content_type="application/javascript")
            await rt.abort()
        await pg.route("**/*",route);await pg.add_init_script(AUD+";window.__NOPJ=true;")
        await pg.goto("https://kaisure.test/",wait_until="load");await pg.wait_for_timeout(900)
        async def shot(name,pre=None):
            if pre: await pg.evaluate(pre)
            await pg.wait_for_timeout(700)
            r=await pg.evaluate("__AUDIT()");print(f'[{name}]',r if r else 'OK')
            await pg.screenshot(path=f"{P}_{name}.png")
        await shot('title')
        await shot('title_bottom',"document.querySelector('#title').scrollTop=99999")
        await pg.evaluate("__K.SEATS.forEach((s,i)=>{s.on=i<4;s.cpu=false});window.__FAST=true;document.querySelector('#bStart').click()")
        await pg.wait_for_function("__K.S&&__K.S.step==='roll'",timeout=30000)
        await pg.evaluate("window.__FAST=false;__K.ev('renderAll()')")
        await shot('myturn')
        await shot('action',"document.querySelector('#myturn').classList.remove('show');__K.ev(`S.step='action';renderAll()`)")
        await shot('crewpop',"document.querySelectorAll('#crew .cc')[1].click()")
        await shot('menu',"document.querySelector('#crewpop').classList.remove('show');document.querySelector('#bMenu').click()")
        await shot('ref',"document.querySelector('#top').classList.remove('menu');document.querySelector('#bRef').click()")
        await shot('rules',"document.querySelector('#modal .mx').click();document.querySelector('#bRule').click()")
        await shot('rules_d',"document.querySelector('.rtab[data-t=d]').click()")
        await pg.evaluate("document.querySelector('#modal .mx').click()")
        # final
        await pg.evaluate("window.__FAST=true;__K.ev(`S.chars.forEach(c=>c.cpu=false);enterFinal(false,0)`)")
        await pg.wait_for_function("__K.S.phase==='final'&&!__K.ev('BUSY')",timeout=30000)
        await pg.evaluate("window.__FAST=false;__K.ev('renderAll()')")
        await shot('final')
        # escape
        await pg.evaluate("void __K.ev(`runGuard(escapePhase)`)")
        for k in range(40):
            await pg.wait_for_timeout(1500)
            st=await pg.evaluate("[!!document.querySelector('#diceGo.show'),document.querySelector('#modal').className,__K.S.phase,document.querySelector('#banner .band').innerText.slice(0,20)]")
            if st[0]:break
            if 'show' in st[1]: await pg.evaluate("(document.querySelector('#modal .mfoot [data-i]')||document.querySelector('#modal [data-i]')).click()")
        print('esc state',st)
        await shot('esc_dice')
        await shot('esc_board',"document.querySelector('#diceLayer').style.display='none'")
        print('done')
asyncio.run(main())
