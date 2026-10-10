"""
Lightweight HTTP Server for TrustLens Test Fixtures.
Serves synthetic benign and phishing test pages locally.
"""

import http.server
import socketserver
import os
import sys

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[TestServer] {self.address_string()} - {format%args}\n")

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"[TestServer] Serving fixtures at http://127.0.0.1:{PORT}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("[TestServer] Stopped.")

if __name__ == "__main__":
    run_server()
