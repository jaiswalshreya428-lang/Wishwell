"""
WishWell Website Preview Runner
Serves the full interactive website preview on http://localhost:3000 and opens your browser.
Works out-of-the-box using standard Python with ZERO npm or Node.js dependencies!
"""

import os
import sys
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Default to standalone_preview.html if visiting root
        if self.path == "/" or self.path == "/index.html":
            self.path = "/standalone_preview.html"
        return super().do_GET()

def main():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    url = f"http://localhost:{PORT}/standalone_preview.html"
    print("=" * 60)
    print(" WishWell - Verified Wish-Matching Platform (Live Website)")
    print("=" * 60)
    print(f" [OK] Serving website at: {url}")
    print(" [OK] Opening in your default web browser...")
    print(" Press Ctrl+C to stop the server.")
    print("=" * 60)
    try:
        webbrowser.open(url)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()

