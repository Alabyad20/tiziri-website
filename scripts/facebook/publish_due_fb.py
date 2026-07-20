"""TIZIRI Facebook Page auto-publisher.

Mirrors the Instagram calendar to the "Tiziri Rugs" Facebook Page. Runs daily
via Windows Task Scheduler (18:30 local), reuses scripts/instagram/calendar.json,
publishes at most ONE due post per run, and records progress in its own state
file (independent of the Instagram publisher, so the two never collide).

Uses the Facebook Graph API (graph.facebook.com) + a long-lived Page token.
No external dependencies (stdlib only). No secrets in this file:
  page token   C:\\Users\\nigel\\.fb-page-token.txt   (long-lived Page access token)
  page id      C:\\Users\\nigel\\.fb-page-id.txt       (the Tiziri Rugs Page ID)
  state        C:\\Users\\nigel\\.fb-post-state.json
  log          C:\\Users\\nigel\\.fb-post-log.txt

Run manually to test:  python scripts/facebook/publish_due_fb.py
"""
import json
import time
import urllib.request
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path

HOME = Path.home()
HERE = Path(__file__).parent
CALENDAR_FILE = HERE.parent / "instagram" / "calendar.json"   # reuse the IG calendar
TOKEN_FILE = HOME / ".fb-page-token.txt"
PAGEID_FILE = HOME / ".fb-page-id.txt"
STATE_FILE = HOME / ".fb-post-state.json"
LOG_FILE = HOME / ".fb-post-log.txt"

API = "https://graph.facebook.com/v23.0"
POST_HOUR = 18  # never publish before 6 PM local (mirror the IG rule)


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
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def post_photo(page, image_url, caption, token):
    r = api(f"{page}/photos",
            {"url": image_url, "caption": caption, "access_token": token}, post=True)
    return r.get("post_id") or r.get("id")


def post_carousel(page, image_urls, caption, token):
    # upload each photo unpublished, then attach them all to one feed post
    fbids = []
    for u in image_urls:
        r = api(f"{page}/photos",
                {"url": u, "published": "false", "access_token": token}, post=True)
        fbids.append(r["id"])
    attached = json.dumps([{"media_fbid": m} for m in fbids])
    r = api(f"{page}/feed",
            {"message": caption, "attached_media": attached, "access_token": token}, post=True)
    return r.get("id")


def post_reel(page, video_url, caption, token):
    # FB Page Reels = 3-phase hosted upload (start -> upload by file_url -> finish)
    start = api(f"{page}/video_reels", {"upload_phase": "start", "access_token": token}, post=True)
    video_id = start["video_id"]
    upload_url = start["upload_url"]
    req = urllib.request.Request(upload_url, data=b"", method="POST")
    req.add_header("Authorization", f"OAuth {token}")
    req.add_header("file_url", video_url)
    with urllib.request.urlopen(req, timeout=600) as resp:
        json.loads(resp.read().decode("utf-8"))  # {"success": true}
    api(f"{page}/video_reels", {
        "upload_phase": "finish",
        "video_id": video_id,
        "video_state": "PUBLISHED",
        "description": caption,
        "access_token": token}, post=True)
    return video_id


def publish(post, base, page, token):
    t = post["type"]
    if t == "image":
        return post_photo(page, base + post["media"], post["caption"], token)
    if t == "reel":
        return post_reel(page, base + post["media"], post["caption"], token)
    if t == "carousel":
        return post_carousel(page, [base + m for m in post["media"]], post["caption"], token)
    raise ValueError(f"unknown post type {t}")


def main():
    token = TOKEN_FILE.read_text(encoding="utf-8").strip()
    page = PAGEID_FILE.read_text(encoding="utf-8").strip()

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
        log(f"{len(due)} posts overdue; publishing oldest only (one per run, catches up daily).")

    post = sorted(due, key=lambda p: p["date"])[0]
    log(f"Publishing {post['id']} ({post['type']}) to FB Page {page}...")
    pid = publish(post, cal["media_base"], page, token)
    state[post["id"]] = {"published": datetime.now().isoformat(), "fb_id": pid}
    STATE_FILE.write_text(json.dumps(state, indent=1), encoding="utf-8")
    log(f"PUBLISHED {post['id']} -> FB id {pid}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"ERROR: {e}")
        raise
