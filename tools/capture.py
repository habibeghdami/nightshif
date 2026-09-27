"""Capture the playable production build using an isolated test save."""
from browser import Browser
from pathlib import Path
import time,json
b=Browser();root=Path(__file__).resolve().parent.parent
b.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':900,'deviceScaleFactor':1,'mobile':False})
b.evaluate("if(window.__game)__game.persist=()=>true;localStorage.removeItem('test.nightshift.save.v1');localStorage.removeItem('test.nightshift.save.v1.backup');")
b.navigate('http://127.0.0.1:4173/dist/?test=1&capture='+str(time.time()))
for _ in range(100):
    if b.evaluate('!!window.__game'):break
    time.sleep(.1)
time.sleep(.5);b.screenshot(str(root/'docs/title.png'))
button=b.evaluate("(()=>{const r=document.querySelector('[data-action=drive]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()")
for kind in ['mousePressed','mouseReleased']:b.call('Input.dispatchMouseEvent',{'type':kind,**button,'button':'left','clickCount':1})
b.evaluate("__game.navigation.set({...__game.races.events[0].start,name:'Harbor Run'},__game.vehicle)")
b.call('Input.dispatchKeyEvent',{'type':'keyDown','code':'KeyW','key':'w','windowsVirtualKeyCode':87})
time.sleep(4.5);b.screenshot(str(root/'docs/gameplay.png'))
b.call('Input.dispatchKeyEvent',{'type':'keyUp','code':'KeyW','key':'w','windowsVirtualKeyCode':87})
print(json.dumps(b.evaluate("({productionBuild:location.pathname,mode:__game.mode,speed:__game.vehicle.speed,audio:__game.audio.ctx?.state,health:__game.vehicle.damage.health})"),indent=2))
b.evaluate("__game.vehicle.stop();__game.recover();__game.repair();__game.ui.tab='tune';__game.ui.garage();__game.ui.$('toast').classList.remove('show')")
time.sleep(.2);b.screenshot(str(root/'docs/garage.png'))
b.evaluate('__game.setMode("map")');time.sleep(.2);b.screenshot(str(root/'docs/map.png'))
# Keep the test browser on the clean title screen; do not mutate real player saves.
b.evaluate('__game.setMode("title")')
errors=[e for e in b.events if e.get('method') in ['Runtime.exceptionThrown','Network.loadingFailed']]
print('Production-build errors:',json.dumps(errors))
if errors:raise SystemExit(1)
