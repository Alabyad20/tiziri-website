# -*- coding: utf-8 -*-
"""Local CORS file server for the FB Marketplace photo pipeline (port 8765).
Serves rug photos + fb_helper.html. Run from anywhere:
    python marketing/fb-pipeline/fb_server.py
Then the helper tab is  http://localhost:8765/fb_helper.html?rug=<slug>&n=<count>
"""
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PHOTOS = os.path.join(REPO, "rug-photos", "Newly taken photos")
HERE = os.path.dirname(os.path.abspath(__file__))


class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = path.split("?", 1)[0]
        if path.startswith("/photos/"):
            rel = path[len("/photos/"):]
            return os.path.join(PHOTOS, *rel.split("/"))
        return os.path.join(HERE, path.lstrip("/"))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if __name__ == "__main__":
    print("FB pipeline server on http://localhost:8765  (photos from", PHOTOS + ")")
    HTTPServer(("127.0.0.1", 8765), H).serve_forever()
