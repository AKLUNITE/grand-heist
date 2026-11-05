import asyncio, os, sys, json
from playwright.async_api import async_playwright
SRC=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','heist.html');W,H,DPR=390,844,3
PAGE="<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'></head><body>"+open(SRC).read()+"</body></html>"
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),"vendor","three")
BENCH=r"""(n)=>__K.ev(`(()=>{const gl=renderer.getContext();renderer.info.autoReset=false;renderer.info.reset();
 const one=()=>{updateCam();if(composer&&(typeof bloom==='undefined'||!bloom||bloom.enabled))composer.render();else renderer.render(scene,camera)};one();gl.finish();renderer.info.reset();
 const a=performance.now();for(let i=0;i<${n};i++){one()}gl.finish();const ms=(performance.now()-a)/${n};
 const r={ms:+ms.toFixed(1),calls:renderer.info.render.calls/${n},tris:renderer.info.render.triangles/${n}|0,pr:renderer.getPixelRatio(),bloom:!!(composer&&bloom&&bloom.enabled),shadow:renderer.shadowMap.enabled,w:renderer.domElement.width,h:renderer.domElement.height};renderer.info.autoReset=true;return JSON.stringify(r)})()`)"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":W,"height":H},device_scale_factor=DPR,is_mobile=True,has_touch=True)
        async def route(rt):
            u=rt.request.url
            if "kaisure.test" in u: return await rt.fulfill(body=PAGE,content_type="text/html; charset=utf-8")
            if "three.min.js" in u: return await rt.fulfill(path=base+"/build/three.min.js",content_type="application/javascript")
            if "jsdelivr" in u and "three@" in u: return await rt.fulfill(path=base+u.split("three@0.128.0")[1],content_type="application/javascript")
            await rt.abort()
        await pg.route("**/*",route)
        await pg.add_init_script("window.__NOPJ=true;")
        await pg.goto("https://kaisure.test/",wait_until="load");await pg.wait_for_timeout(1000)
        await pg.evaluate("__K.SEATS.forEach((s,i)=>{s.on=i<4;s.cpu=false});window.__FAST=true;document.querySelector('#bStart').click()")
        await pg.wait_for_function("__K.S&&__K.S.step==='roll'",timeout=30000)
        await pg.evaluate("window.__NR=true;document.querySelector('#myturn').classList.remove('show')")
        await pg.wait_for_timeout(500)
        print('current',await pg.evaluate(BENCH,8))
        import os as _o
        if 'QMODE' in open(SRC).read():
            for m in ['high','std','eco']:
                await pg.evaluate("m=>__K.ev(`QMODE='${m}';applyQuality()`)",m);await pg.wait_for_timeout(300)
                print(m,await pg.evaluate(BENCH,8))
        print('lights',await pg.evaluate("__K.ev('(()=>{let n={};scene.traverse(o=>{if(o.isLight)n[o.type]=(n[o.type]||0)+1});let m=0;scene.traverse(o=>{if(o.isMesh)m++});return JSON.stringify({n,m})})()')"))
asyncio.run(main())
