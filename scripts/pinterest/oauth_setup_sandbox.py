"""Pinterest SANDBOX OAuth setup for the TIZIRI Rugs Marketing app.

Same authorization flow as oauth_setup.py, but the code is exchanged against
the sandbox token endpoint (api-sandbox.pinterest.com) instead of production.
This is required to demo real pin creation while the app is still on Trial
(production-write-blocked) access -- Pinterest's own upgrade review asks for
a video showing exactly this.

Saves to separate files so the real production tokens aren't touched:
    C:\\Users\\nigel\\.pin-sandbox-token.txt
    C:\\Users\\nigel\\.pin-sandbox-refresh-token.txt
"""
import base64
import http.server
import secrets
import threading
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

HOME = Path.home()
APP_ID = (HOME / ".pin-app-id.txt").read_text().strip()
APP_SECRET = (HOME / ".pin-app-secret.txt").read_text().strip()
REDIRECT_URI = "http://localhost:8910/callback"
SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"
STATE = secrets.token_urlsafe(16)

TOKEN_FILE = HOME / ".pin-sandbox-token.txt"
REFRESH_FILE = HOME / ".pin-sandbox-refresh-token.txt"

result = {}


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        code = params.get("code", [None])[0]
        state = params.get("state", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        if code and state == STATE:
            result["code"] = code
            self.wfile.write(b"<html><body><h2>Pinterest sandbox connected. You can close this tab.</h2></body></html>")
        else:
            self.wfile.write(b"<html><body><h2>Something went wrong. Check the terminal.</h2></body></html>")

    def log_message(self, fmt, *args):
        pass


def exchange_code(code):
    auth = base64.b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    body = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode()
    req = urllib.request.Request(
        "https://api-sandbox.pinterest.com/v5/oauth/token",
        data=body,
        headers={
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    import json
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())


def main():
    server = http.server.HTTPServer(("localhost", 8910), CallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    auth_url = "https://www.pinterest.com/oauth/?" + urllib.parse.urlencode({
        "client_id": APP_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": STATE,
    })
    print("Opening authorization URL:")
    print(auth_url, flush=True)
    (HOME / ".pin-auth-url.txt").write_text(auth_url)
    webbrowser.open(auth_url)

    thread.join(timeout=180)
    if "code" not in result:
        print("Timed out waiting for authorization.")
        return

    token_data = exchange_code(result["code"])
    if "access_token" not in token_data:
        print("Token exchange failed:", token_data)
        return

    TOKEN_FILE.write_text(token_data["access_token"])
    REFRESH_FILE.write_text(token_data.get("refresh_token", ""))
    print("Success. Sandbox access token saved.")
    print("Scopes granted:", token_data.get("scope"))


if __name__ == "__main__":
    main()
