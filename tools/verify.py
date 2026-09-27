"""Run isolated browser tests and save reproducible reports. Chrome CDP: port 9222."""
from browser import Browser
from pathlib import Path
import json, time, argparse
parser=argparse.ArgumentParser();parser.add_argument('--profile',action='store_true');args=parser.parse_args()
b=Browser();root=Path(__file__).resolve().parent.parent
b.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':900,'deviceScaleFactor':1,'mobile':False})
b.evaluate("if(window.__game){__game.persist=()=>true;} localStorage.removeItem('test.nightshift.save.v1');localStorage.removeItem('test.nightshift.save.v1.backup');")
b.navigate('http://127.0.0.1:4173/?test=1&run='+str(time.time()))
for _ in range(100):
    if b.evaluate('!!window.__game'):break
    time.sleep(.1)
else:raise SystemExit('Game did not initialize')
results=b.evaluate('import("./tests/integration.test.js").then(m=>m.runIntegrationTests(__game))')
(root/'docs/test-results.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:print(('PASS ' if r['pass'] else 'FAIL ')+r['name'])
# Verify persisted state survives an actual page reload, beyond in-memory serialization.
b.navigate('http://127.0.0.1:4173/?test=1&reload='+str(time.time()))
for _ in range(100):
    if b.evaluate('!!window.__game'):break
    time.sleep(.1)
reload=b.evaluate('({id:__game.vehicle.data.id,health:__game.vehicle.damage.health,tune:__game.vehicle.custom.tune,spoiler:__game.vehicle.custom.spoiler,quality:__game.profile.settings.quality,infiniteMoney:__game.profile.settings.infiniteMoney})')
passed=reload['id']=='solace' and reload['health']==42 and reload['tune']['engine']==76 and reload['spoiler']==False and reload['quality']=='low' and reload['infiniteMoney']==True
results.append({'name':'Actual browser reload restores saved progression and setup','pass':passed})
print(('PASS ' if passed else 'FAIL ')+'Actual browser reload restores saved progression and setup')
if args.profile:
    profiles={}
    for quality in ['high','low']:
        profiles[quality]=b.evaluate(f'''(()=>{{const g=__game;g.vehicle.teleport(6,65,0);g.vehicle.damage.repair();g.setting('quality','{quality}');g.setMode('drive');return new Promise(r=>setTimeout(r,1000)).then(()=>g.profiler.benchmark(360));}})()''')
    profiles['context']=b.evaluate("(()=>{const gl=__game.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),userAgent:navigator.userAgent};})()")
    (root/'docs/performance.json').write_text(json.dumps(profiles,indent=2)+'\n');print(json.dumps(profiles,indent=2))
b.evaluate('__game.setMode("pause")')
errors=[e for e in b.events if e.get('method') in ['Runtime.exceptionThrown','Network.loadingFailed']]
(root/'docs/test-results.json').write_text(json.dumps({'results':results,'runtimeErrors':errors},indent=2)+'\n')
print(f'{sum(r["pass"] for r in results)}/{len(results)} passed; {len(errors)} runtime/network errors')
if not all(r['pass'] for r in results) or errors:raise SystemExit(1)
