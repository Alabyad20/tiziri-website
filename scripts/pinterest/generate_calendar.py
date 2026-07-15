"""One-time (re-runnable) generator for scripts/pinterest/calendar.json.

Reads data/rugs.json and lays out one pin per rug, one per day, starting
tomorrow. Re-running preserves any rug that's already in the existing
calendar (same date) and only appends newly added rugs at the end — it
will not reshuffle or re-date pins that were already scheduled.
"""
import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUGS_FILE = ROOT / "data" / "rugs.json"
CALENDAR_FILE = Path(__file__).parent / "calendar.json"


def main():
    rugs = json.loads(RUGS_FILE.read_text(encoding="utf-8"))
    slugs = [r["slug"] for r in rugs]

    existing = {"posts": []}
    if CALENDAR_FILE.exists():
        existing = json.loads(CALENDAR_FILE.read_text(encoding="utf-8"))

    scheduled_slugs = {p["slug"] for p in existing["posts"]}
    dates_used = {p["date"] for p in existing["posts"]}

    next_date = date.today() + timedelta(days=1)

    def free_date():
        nonlocal next_date
        while next_date.isoformat() in dates_used:
            next_date += timedelta(days=1)
        d = next_date
        dates_used.add(d.isoformat())
        next_date += timedelta(days=1)
        return d

    new_posts = list(existing["posts"])
    for slug in slugs:
        if slug in scheduled_slugs:
            continue
        d = free_date()
        new_posts.append({"id": f"pin_{slug}", "date": d.isoformat(), "slug": slug})

    new_posts.sort(key=lambda p: p["date"])
    CALENDAR_FILE.write_text(
        json.dumps({"posts": new_posts}, indent=1), encoding="utf-8")
    added = len(new_posts) - len(existing["posts"])
    print(f"{added} new pin(s) scheduled. {len(new_posts)} total in calendar.")


if __name__ == "__main__":
    main()
