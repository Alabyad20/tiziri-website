"""Pinterest Standard-access review demo — designed to be SCREEN-RECORDED.

Built 2026-07-21 after Pinterest (Eloise, API Ops) denied app 1589762 because:
    "Full OAuth process is not visible in the video demo"
    "API usage is not visible in the video demo"

This script walks the reviewer through EXACTLY what they asked to see, in order,
with large labelled banners so each step is legible on video:

    STEP 1  Authorization URL  -> Pinterest login page -> "Give access to your app"
            -> redirect to https://tizirirugs.com/?code=...  (code visible in URL bar)
    STEP 2  Token exchange     -> POST /v5/oauth/token with Basic auth
                                  (app_id:app_secret, base64) -> access_token
    STEP 3  GET  /user_account -> proves the token authenticates
    STEP 4  POST /boards       -> proves write scope
    STEP 5  POST /pins         -> the actual use case: create a Pin
    STEP 6  GET  /pins/{id}    -> displays the newly created Pin back from Pinterest

Everything runs against the SANDBOX (api-sandbox.pinterest.com), which is what
Pinterest's own denial email recommends for the demo.

The app secret is never printed. The Authorization header is shown structurally
so the reviewer can see Basic auth is used, with the payload masked.

Run:
    python scripts/pinterest/demo_standard_access.py
"""
import base64
import json
import sys

try:  # keep console output legible on Windows (cp1252 mangles em dashes)
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HOME = Path.home()
APP_ID = (HOME / ".pin-app-id.txt").read_text().strip()
APP_SECRET = (HOME / ".pin-app-secret.txt").read_text().strip()

# Must exactly match a redirect URI registered on the app in the Pinterest
# developer platform. Using the live site (not localhost) so the reviewer can
# see the ?code=... appear in the browser's URL bar, which is what they asked for.
REDIRECT_URI = "https://tizirirugs.com/"
SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"

AUTH_HOST = "https://www.pinterest.com/oauth/"
SANDBOX = "https://api-sandbox.pinterest.com/v5"

IMAGE_URL = "https://tizirirugs.com/rug-photos/Newly%20taken%20photos/itto/itto-01.webp"
PIN_LINK = "https://tizirirugs.com/rugs/itto.html"

PAUSE = 1.4  # breathing room so each step is readable on video


def banner(n, title):
    print("\n" + "=" * 78)
    print("  STEP %s  --  %s" % (n, title))
    print("=" * 78)
    time.sleep(PAUSE)


def show(label, value):
    print("  %-22s %s" % (label + ":", value))


def call(method, url, token=None, body=None, basic=None):
    """Make the call, printing request and response so both are on camera."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
        shown = "Bearer %s...%s" % (token[:8], token[-4:])
    elif basic:
        headers["Authorization"] = "Basic " + basic
        shown = "Basic <base64 of app_id:app_secret>"
    else:
        shown = "(none)"
    print("\n  REQUEST")
    show("method", method)
    show("url", url)
    show("Authorization", shown)
    if body is not None:
        print("  body:")
        print("    " + json.dumps(body, indent=2).replace("\n", "\n    "))
    data = None
    if body is not None:
        if headers.get("Content-Type") == "application/x-www-form-urlencoded":
            data = urllib.parse.urlencode(body).encode()
        else:
            data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        payload = json.loads(resp.read().decode() or "{}")
        print("\n  RESPONSE  %s %s" % (resp.status, resp.reason))
        print("    " + json.dumps(payload, indent=2)[:1400].replace("\n", "\n    "))
        time.sleep(PAUSE)
        return payload
    except urllib.error.HTTPError as e:
        print("\n  RESPONSE  %s" % e.code)
        print("    " + e.read().decode()[:600])
        raise


def form_call(url, basic, fields):
    """Token exchange uses form encoding, not JSON."""
    print("\n  REQUEST")
    show("method", "POST")
    show("url", url)
    show("Authorization", "Basic <base64 of app_id:app_secret>")
    print("  form body:")
    for k, v in fields.items():
        show("  " + k, v if k != "code" else v[:14] + "...")
    req = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(fields).encode(),
        headers={
            "Authorization": "Basic " + basic,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=60)
    payload = json.loads(resp.read().decode())
    print("\n  RESPONSE  %s %s" % (resp.status, resp.reason))
    safe = dict(payload)
    for k in ("access_token", "refresh_token"):
        if safe.get(k):
            safe[k] = safe[k][:10] + "..." + safe[k][-4:] + "   (masked for the recording)"
    print("    " + json.dumps(safe, indent=2).replace("\n", "\n    "))
    time.sleep(PAUSE)
    return payload


def main():
    print("\nPinterest API - Standard access demonstration")
    print("Tiziri Rugs  |  app id %s  |  SANDBOX environment" % APP_ID)

    banner(1, "OAuth - authorize the app")
    auth_url = AUTH_HOST + "?" + urllib.parse.urlencode({
        "client_id": APP_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
    })
    show("client_id", APP_ID)
    show("redirect_uri", REDIRECT_URI)
    show("scope", SCOPES)
    print("\n  Open this URL in the browser:\n")
    print("  " + auth_url + "\n")
    print("  You will see: the Pinterest login page, then the screen asking you to")
    print("  give access to the app, then a redirect back to tizirirugs.com with")
    print("  ?code=... visible in the URL bar.\n")
    code = input("  Paste the FULL redirect URL (or just the code) here: ").strip()
    if "code=" in code:
        code = urllib.parse.parse_qs(urllib.parse.urlparse(code).query).get("code", [""])[0]
    code = code.split("#")[0].strip()
    if not code:
        print("  No code supplied - stopping.")
        return 1
    show("code received", code[:16] + "...")

    banner(2, "Exchange the authorization code for an access token")
    basic = base64.b64encode(("%s:%s" % (APP_ID, APP_SECRET)).encode()).decode()
    tok = form_call(SANDBOX + "/oauth/token", basic, {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    })
    token = tok["access_token"]
    (HOME / ".pin-sandbox-token.txt").write_text(token)
    if tok.get("refresh_token"):
        (HOME / ".pin-sandbox-refresh-token.txt").write_text(tok["refresh_token"])
    print("\n  Access token obtained and stored locally.")

    banner(3, "GET /user_account - the token authenticates")
    call("GET", SANDBOX + "/user_account", token=token)

    banner(4, "POST /boards - write access")
    board = call("POST", SANDBOX + "/boards", token=token, body={
        "name": "Tiziri Rugs - API Demo %s" % time.strftime("%H%M%S"),
        "description": "Board created live via the Pinterest API to demonstrate "
                       "write access for the Standard access review.",
        "privacy": "PUBLIC",
    })

    banner(5, "POST /pins - create a Pin (our actual use case)")
    pin = call("POST", SANDBOX + "/pins", token=token, body={
        "board_id": board["id"],
        "title": "Itto — Ivory Beni Ourain Moroccan Rug 9'10\" x 6'7\"",
        "description": "Hand-knotted ivory Beni Ourain rug with carved stepped "
                       "channels, 300 x 200 cm of pure Moroccan highland wool. "
                       "One of one. In stock in the USA.",
        "link": PIN_LINK,
        "media_source": {"source_type": "image_url", "url": IMAGE_URL},
    })

    banner(6, "GET /pins/{id} - read the new Pin back from Pinterest")
    call("GET", SANDBOX + "/pins/" + pin["id"], token=token)

    print("\n" + "=" * 78)
    print("  DEMONSTRATION COMPLETE")
    print("  OAuth flow -> access token -> authenticated read -> board created")
    print("  -> Pin created -> Pin read back. Pin id: %s" % pin["id"])
    print("=" * 78 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
