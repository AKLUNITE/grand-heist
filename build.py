#!/usr/bin/env python3
"""src/ を1枚のHTMLに組み立てる。
  dist/heist.html … Claudeのページ（アーティファクト）用。<head>なし
  index.html      … GitHub Pages用（doctype・viewport付き）
使い方: python3 build.py"""
import os
R=os.path.dirname(os.path.abspath(__file__));S=os.path.join(R,'src')
rd=lambda p:open(os.path.join(S,p),encoding='utf-8').read()
order=[l.strip() for l in open(os.path.join(S,'order.txt')) if l.strip()]
css='\n'.join(rd(p) for p in order if p.startswith('css/'))
js='\n'.join(rd(p) for p in order if p.startswith('js/'))
page='\n'.join([rd('head.html'),'<style>',css,'</style>',rd('body.html'),'<script>',js,'</script>',rd('tail.html')])
os.makedirs(os.path.join(R,'dist'),exist_ok=True)
open(os.path.join(R,'dist','heist.html'),'w',encoding='utf-8').write(page)
wrap='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"></head><body>\n'+page+'\n</body></html>\n'
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(wrap)
print('built',len(page),'chars')
