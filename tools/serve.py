"""Local development server with a larger request queue for ES module graphs."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse
class Server(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4173);parser.add_argument('--dist',action='store_true');args=parser.parse_args()
    root=Path(__file__).resolve().parent.parent
    if args.dist: root=root/'dist'
    server=Server(('127.0.0.1',args.port),partial(Handler,directory=str(root)))
    print(f'Nightshift is running at http://127.0.0.1:{args.port} — Ctrl+C to stop.',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
