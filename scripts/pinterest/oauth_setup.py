"""One-time Pinterest OAuth setup for the TIZIRI Rugs Marketing app.

Run this once to grant access and store a long-lived refresh token. It:
  1. Starts a temporary local server on http://localhost:8901/callback
  2. Opens the Pinterest authorization page in the default browser
  3. Waits for the redirect carrying the authorization code
  4. Exchanges the code for an access token + refresh token
  5. Saves everything next to the existing platform credential files:
       app id      C:\\Users\\nigel\\.pin-app-id.txt
       app secret  C:\\Users\\nigel\\.pin-app-secret.txt
       access tok  C:\\Users\\nigel\\.pin-token.txt
       refresh tok C:\\Users\\nigel\\.pin-refresh-token.txt
       token date  C:\\Users\\nigel\\.pin-token-date.txt
"""
import base64
import http.server
import secrets
import threading
import urllib.parse
import urllib.request
import webbrowser
from datetime import date
from pathlib import Path

HOME = Path.home()
APP_ID = (HOME / ".pin-app-id.txt").read_text().strip()
APP_SECRET = (HOME / ".pin-app-secret.txt").read_text().strip()
REDIRECT_URI = "http://localhost:8910/callback"
SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"
STATE = secrets.token_urlsafe(16)

TOKEN_FILE = HOME / ".pin-token.txt"
REFRESH_FILE = HOME / ".pin-refresh-token.txt"
DATE_FILE = HOME / ".pin-token-date.txt"

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
            self.wfile.write(b"<html><body><h2>Pinterest connected. You can close this tab.</h2></body></html>")
        else:
            self.wfile.write(b"<html><body><h2>Something went wrong. Check the terminal.</h2></body></html>")

    def log_message(self, fmt, *args):
        pass  # keep stdout clean


def exchange_code(code):
    auth = base64.b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    body = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode()
    req = urllib.request.Request(
        "https://api.pinterest.com/v5/oauth/token",
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

    thread.join(timeout=120)
    if "code" not in result:
        print("Timed out waiting for authorization.")
        return

    token_data = exchange_code(result["code"])
    if "access_token" not in token_data:
        print("Token exchange failed:", token_data)
        return

    TOKEN_FILE.write_text(token_data["access_token"])
    REFRESH_FILE.write_text(token_data.get("refresh_token", ""))
    DATE_FILE.write_text(date.today().isoformat())
    print("Success. Access token and refresh token saved.")
    print("Scopes granted:", token_data.get("scope"))


if __name__ == "__main__":
    main()
