import asyncio, os, sys, json, itertools, time, random
from playwright.async_api import async_playwright
PAGE="<!doctype html><html><head><meta charset=utf-8></head><body>"+open(os.environ.get('SRC',os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','dist','heist.html'))).read()+"</body></html>"
base=os.path.join(os.path.dirname(os.path.abspath(__file__)),"vendor","three")
JOBS=['phantom','cracker','hacker','driver','disguise','bouncer','pickpocket','informant']
scen=sys.argv[1]; NPT=int(sys.argv[2]); NR=int(sys.argv[3]); tag=sys.argv[4]; seed=int(sys.argv[5])
SM={'cpu4':[0,0,0,0],'h1':[1,0,0,0],'h4':[1,1,1,1]}[scen]
async def main():
    random.seed(seed)
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":800,"height":600})
        errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        async def route(rt):
            u=rt.request.url
            if "kaisure.test" in u: return await rt.fulfill(body=PAGE,content_type="text/html; charset=utf-8")
            if "three.min.js" in u: return await rt.fulfill(path=base+"/build/three.min.js",content_type="application/javascript")
            if "jsdelivr" in u and "three@" in u: return await rt.fulfill(path=base+u.split("three@0.128.0")[1],content_type="application/javascript")
            await rt.abort()
        await pg.route("**/*", route)
        await pg.goto("https://kaisure.test/", wait_until="load", timeout=60000)
        await pg.wait_for_timeout(1000)
        await pg.evaluate("window.__FAST=true;window.__STOPEND=true;window.__NR=true;__K.setSpeed(0.001)")
        runs=[['phantom','cracker','hacker','driver']]*NPT+[random.sample(JOBS,4) for _ in range(NR)]
        out=open(os.path.join(os.environ.get("OUT","."),f"sc_{scen}_{tag}.jsonl"),"w")
        for jobs in runs:
            await pg.evaluate("([j,s])=>__K.testStart(j,s)",[jobs,SM])
            r=None
            for _ in range(2400):
                await pg.wait_for_timeout(50)
                r=await pg.evaluate("window.__RES")
                if r:break
            r=r or {"type":"timeout"};r["jobs"]=jobs;r["scen"]=scen
            if errs: r["errs"]=errs[:2];errs.clear()
            out.write(json.dumps(r,ensure_ascii=False)+"\n");out.flush()
            await pg.wait_for_timeout(30)
        await b.close()
asyncio.run(main())
