#!/usr/bin/env python3
"""Static server for local development.

Identical to `python3 -m http.server`, except it tells the browser never to
cache. Without this, edits to app.js/styles.css keep serving stale copies.
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Drop the validators that let a browser fall back to a cached copy.
        if keyword.lower() in ("last-modified", "etag"):
            return
        super().send_header(keyword, value)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(NoCacheHandler, directory=".")
    print(f"Serving http://localhost:{port} (no-cache)")
    ThreadingHTTPServer(("", port), handler).serve_forever()
