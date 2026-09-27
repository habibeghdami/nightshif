"""Phone viewport/GPU workload profile (emulation, not physical-phone timing)."""
from browser import Browser
from pathlib import Path
import json, time, argparse
p=argparse.ArgumentParser();p.add_argument('--baseline',action='store_true');a=p.parse_args()
b=Browser();root=Path(__file__).resolve().parent.parent
b.call('Emulation.setDeviceMetricsOverride',{'width':844,'height':390,'deviceScaleFactor':3,'mobile':True})
b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
b.navigate('http://127.0.0.1:4173/?test=1&mobileprofile='+str(time.time()))
for _ in range(100):
    if b.evaluate('!!window.__game'):break
    time.sleep(.1)
quality='high' if a.baseline else 'auto'
report=b.evaluate(f'''(()=>{{const g=__game;g.races.cancel();g.vehicle.teleport(6,65,0);g.vehicle.damage.repair();g.setting('quality','{quality}');g.setMode('drive');return new Promise(r=>setTimeout(r,1000)).then(()=>g.profiler.benchmark(240)).then(profile=>({{profile,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,pixelRatio:g.renderer.getPixelRatio(),buffer:[g.renderer.domElement.width,g.renderer.domElement.height],triangles:g.renderer.info.render.triangles,traffic:g.traffic.cars.length,mobile:g.device?.mobile,quality:g.effectiveQuality||g.profile.settings.quality}}));}})()''')
name='mobile-baseline' if a.baseline else 'mobile-profile'
(root/f'docs/{name}.json').write_text(json.dumps(report,indent=2)+'\n');b.screenshot(str(root/f'docs/{name}.png'));print(json.dumps(report,indent=2));b.evaluate('__game.setMode("pause")')
print('Errors:',json.dumps([e for e in b.events if e.get('method') in ['Runtime.exceptionThrown','Network.loadingFailed']]))
