"""TIZIRI Instagram auto-publisher.

Runs daily via Windows Task Scheduler (18:30 local). Reads calendar.json,
publishes at most ONE due post per run via the Instagram Graph API
(instagram-login flavor, graph.instagram.com), records progress in a local
state file, and refreshes the long-lived token when it gets old.

No external dependencies (stdlib only). No secrets in this file:
  token         C:\\Users\\nigel\\.ig-token.txt
  token birthday C:\\Users\\nigel\\.ig-token-date.txt
  state         C:\\Users\\nigel\\.ig-post-state.json
  log           C:\\Users\\nigel\\.ig-post-log.txt
"""
import json
import time
import urllib.request
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path

HOME = Path.home()
HERE = Path(__file__).parent
TOKEN_FILE = HOME / ".ig-token.txt"
TOKEN_DATE_FILE = HOME / ".ig-token-date.txt"
STATE_FILE = HOME / ".ig-post-state.json"
LOG_FILE = HOME / ".ig-post-log.txt"
CALENDAR_FILE = HERE / "calendar.json"

IG_USER_ID = "17841419797677546"  # @tizirirugs
API = "https://graph.instagram.com/v23.0"
POST_HOUR = 18  # never publish before 6 PM local


def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def api(path, params=None, post=False):
    url = f"{API}/{path}"
    data = None
    if params and post:
        data = urllib.parse.urlencode(params).encode("utf-8")
    elif params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=data)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def refresh_token_if_old(token):
    try:
        born = date.fromisoformat(TOKEN_DATE_FILE.read_text().strip())
    except Exception:
        TOKEN_DATE_FILE.write_text(date.today().isoformat())
        return token
    if (date.today() - born).days < 30:
        return token
    try:
        r = api("refresh_access_token",
                {"grant_type": "ig_refresh_token", "access_token": token})
        TOKEN_FILE.write_text(r["access_token"])
        TOKEN_DATE_FILE.write_text(date.today().isoformat())
        log("Token refreshed (valid ~60 more days)")
        return r["access_token"]
    except Exception as e:
        log(f"WARNING: token refresh failed: {e}")
        return token


def wait_finished(container_id, token, tries=60, delay=10):
    for _ in range(tries):
        s = api(container_id, {"fields": "status_code,status", "access_token": token})
        code = s.get("status_code")
        if code == "FINISHED":
            return True
        if code == "ERROR":
            raise RuntimeError(f"container {container_id} errored: {s.get('status')}")
        time.sleep(delay)
    raise RuntimeError(f"container {container_id} not ready after {tries * delay}s")


def create_container(post, base, token):
    if post["type"] == "image":
        return api(f"{IG_USER_ID}/media", {
            "image_url": base + post["media"],
            "caption": post["caption"],
            "access_token": token}, post=True)["id"]
    if post["type"] == "reel":
        return api(f"{IG_USER_ID}/media", {
            "media_type": "REELS",
            "video_url": base + post["media"],
            "caption": post["caption"],
            "access_token": token}, post=True)["id"]
    if post["type"] == "carousel":
        children = []
        for item in post["media"]:
            cid = api(f"{IG_USER_ID}/media", {
                "image_url": base + item,
                "is_carousel_item": "true",
                "access_token": token}, post=True)["id"]
            wait_finished(cid, token)
            children.append(cid)
        return api(f"{IG_USER_ID}/media", {
            "media_type": "CAROUSEL",
            "children": ",".join(children),
            "caption": post["caption"],
            "access_token": token}, post=True)["id"]
    raise ValueError(f"unknown post type {post['type']}")


def main():
    token = TOKEN_FILE.read_text().strip()
    token = refresh_token_if_old(token)

    cal = json.loads(CALENDAR_FILE.read_text(encoding="utf-8"))
    state = {}
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))

    now = datetime.now()
    due = [p for p in cal["posts"]
           if p["id"] not in state
           and datetime.fromisoformat(p["date"]) + timedelta(hours=POST_HOUR) <= now]
    if not due:
        log("Nothing due.")
        return
    if len(due) > 1:
        log(f"{len(due)} posts overdue; publishing oldest only (one per run).")

    post = sorted(due, key=lambda p: p["date"])[0]
    log(f"Publishing {post['id']} ({post['type']})...")
    container = create_container(post, cal["media_base"], token)
    wait_finished(container, token)
    r = api(f"{IG_USER_ID}/media_publish",
            {"creation_id": container, "access_token": token}, post=True)
    state[post["id"]] = {"published": datetime.now().isoformat(),
                         "media_id": r["id"]}
    STATE_FILE.write_text(json.dumps(state, indent=1), encoding="utf-8")
    log(f"PUBLISHED {post['id']} -> media id {r['id']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"ERROR: {e}")
        raise
