"""Run the local game and open it in the default browser."""
from serve import Server, Handler
from functools import partial
from pathlib import Path
from urllib.request import urlopen
import webbrowser
root=Path(__file__).resolve().parent.parent
for port in range(4173,4184):
    url=f'http://127.0.0.1:{port}'
    try:
        with urlopen(url,timeout=.4) as response:
            if b'NIGHTSHIFT' in response.read(4096):
                print('Opening the running Nightshift server:',url)
                webbrowser.open(url)
                raise SystemExit(0)
    except (OSError,TimeoutError):pass
    try:
        server=Server(('127.0.0.1',port),partial(Handler,directory=str(root)))
        break
    except OSError:continue
else:raise SystemExit('No local port available between 4173 and 4183.')
print(f'Nightshift: {url}\nKeep this window open while playing. Ctrl+C stops the server.',flush=True)
webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
