"""Pinterest SANDBOX demo for the Trial -> Standard access video review.

Runs three real Pinterest API calls against the sandbox environment
(api-sandbox.pinterest.com) using the sandbox access token, and prints clean,
labeled output. Screen-record a run of this (right after re-running the OAuth
flow) and upload it as the "video demonstration" the upgrade review requires.

  Step 1  GET  /user_account         -> proves authenticated read via OAuth token
  Step 2  POST /boards               -> proves write access (creates a demo board)
  Step 3  POST /pins                 -> proves the core use case (creates a Pin)

No secrets are hardcoded: the sandbox token is read from
    C:\\Users\\nigel\\.pin-sandbox-token.txt   (created by oauth_setup_sandbox.py)

Run:
    python scripts/pinterest/demo_sandbox_pin.py
"""
import json
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://api-sandbox.pinterest.com/v5"
HOME = Path.home()
TOKEN = (HOME / ".pin-sandbox-token.txt").read_text().strip()

# A real, public Tiziri rug hero image + link (first-party product content).
IMAGE_URL = "https://tizirirugs.com/rug-photos/Newly%20taken%20photos/itto/itto-01.webp"
PIN_LINK = "https://tizirirugs.com/rugs/itto.html"


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def main():
    print("=" * 60)
    print("TIZIRI RUGS - Pinterest API sandbox demo")
    print("Environment:", BASE)
    print("=" * 60)

    print("\n[Step 1] GET /user_account  (authenticated read)")
    status, acct = call("GET", "/user_account")
    print("  HTTP", status)
    print("  username:", acct.get("username"), "| type:", acct.get("account_type"))

    board_name = "Tiziri Moroccan Rugs - API Demo"
    print("\n[Step 2] Board (reuse if it exists, else create)")
    # Reuse an existing board of the same name so the demo is idempotent.
    _, boards = call("GET", "/boards?page_size=100")
    board_id = next((b["id"] for b in boards.get("items", []) if b.get("name") == board_name), None)
    if board_id:
        print("  reusing existing board_id:", board_id)
    else:
        status, board = call("POST", "/boards", {
            "name": board_name,
            "description": "Handwoven one-of-a-kind Moroccan rugs from tizirirugs.com",
        })
        print("  POST /boards HTTP", status)
        board_id = board.get("id")
        print("  board_id:", board_id, "| name:", board.get("name"))
        if not board_id:
            print("  response:", json.dumps(board, indent=2))
            return

    print("\n[Step 3] POST /pins  (create Pin - the core use case)")
    status, pin = call("POST", "/pins", {
        "board_id": board_id,
        "title": "Itto - Ivory Carved Stepped Channels Beni Ourain Rug",
        "description": "Handwoven 100% wool Moroccan rug, one of a kind. Made to order in any size.",
        "link": PIN_LINK,
        "media_source": {"source_type": "image_url", "url": IMAGE_URL},
    })
    print("  HTTP", status)
    if pin.get("id"):
        print("  SUCCESS - pin_id:", pin.get("id"))
        print("  A Pin was created via the Pinterest API using an OAuth token.")
    else:
        print("  response:", json.dumps(pin, indent=2))


if __name__ == "__main__":
    main()
