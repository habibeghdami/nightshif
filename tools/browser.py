"""Small stdlib Chrome DevTools client; no external test dependency."""
import socket, json, struct, os, base64, urllib.request, time, argparse
class Browser:
    def __init__(self):
        targets=json.load(urllib.request.urlopen('http://127.0.0.1:9222/json'))
        target=next(t for t in targets if t['type']=='page')
        from urllib.parse import urlparse
        u=urlparse(target['webSocketDebuggerUrl']);self.s=socket.create_connection((u.hostname,u.port));self.s.settimeout(30);self.seq=0;self.events=[]
        key=base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'.encode())
        header=b''
        while not header.endswith(b'\r\n\r\n'): header+=self.s.recv(1)
        if b'101' not in header: raise RuntimeError(header)
        self.call('Runtime.enable');self.call('Page.enable');self.call('Network.enable');self.call('Network.setCacheDisabled',{'cacheDisabled':True})
    def read(self,n):
        b=b''
        while len(b)<n:
            chunk=self.s.recv(n-len(b))
            if not chunk: raise ConnectionError('Browser closed')
            b+=chunk
        return b
    def call(self,method,params=None):
        self.seq+=1;data=json.dumps({'id':self.seq,'method':method,'params':params or {}}).encode();mask=os.urandom(4);n=len(data)
        header=bytes([129,128|n]) if n<126 else bytes([129,254])+struct.pack('!H',n) if n<65536 else bytes([129,255])+struct.pack('!Q',n)
        self.s.sendall(header+mask+bytes(c^mask[i%4] for i,c in enumerate(data)))
        while True:
            a,b=self.read(2);size=b&127
            if size==126:size=struct.unpack('!H',self.read(2))[0]
            elif size==127:size=struct.unpack('!Q',self.read(8))[0]
            payload=self.read(size)
            if a&15==8:raise ConnectionError('Closed')
            result=json.loads(payload)
            if result.get('id')==self.seq:
                if 'error' in result:raise RuntimeError(result['error'])
                return result.get('result',{})
            self.events.append(result)
    def evaluate(self,expression):
        r=self.call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
        if 'exceptionDetails' in r:raise RuntimeError(r['exceptionDetails'])
        return r.get('result',{}).get('value')
    def navigate(self,url):
        self.call('Page.navigate',{'url':url})
        for _ in range(100):
            time.sleep(.1)
            if self.evaluate('document.readyState')=='complete':break
    def screenshot(self,path):
        r=self.call('Page.captureScreenshot',{'format':'png'});open(path,'wb').write(base64.b64decode(r['data']))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--url');p.add_argument('--eval');p.add_argument('--screenshot');a=p.parse_args();b=Browser()
    b.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':900,'deviceScaleFactor':1,'mobile':False})
    if a.url:b.navigate(a.url)
    if a.eval:print(json.dumps(b.evaluate(a.eval),indent=2))
    if a.screenshot:b.screenshot(a.screenshot)
    errors=[e for e in b.events if e.get('method') in ['Runtime.exceptionThrown','Network.loadingFailed']]
    print('Runtime errors:',json.dumps(errors))
