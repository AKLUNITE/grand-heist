import json,sys
for f in sys.argv[1:]:
    rs=[json.loads(l) for l in open(f)]
    n=len(rs);w=sum(r['type']=='win' for r in rs);prep=[r for r in rs if not r['forced']];pw=sum(r['type']=='win' for r in prep);fw=sum(r['type']=='win' for r in rs if r['forced'])
    vt=[r.get('vt',0) for r in rs]
    print(f"{f}: n={n} win={w/n*100:.0f}% prep={len(prep)/n*100:.0f}% prepWin={pw/max(1,len(prep))*100:.0f}% forcedWin={fw/max(1,n-len(prep))*100:.0f}% avgVaultTurns={sum(vt)/n:.1f}")
