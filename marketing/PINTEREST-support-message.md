# Pinterest support — Standard access status request

**App:** Tiziri Rugs Marketing · **App ID:** 1589762
**Submitted:** 16 July 2026 · **Status:** "Upgrade to Standard access pending"
**Business account:** Tizirirugs

⚠ **Do not resubmit the upgrade form** — only one open request is allowed, and resubmitting can reset the queue position. This is a support enquiry, which is separate and safe.

---

## Subject

```
Standard access upgrade pending — app 1589762 (Tiziri Rugs Marketing)
```

## Message

```
Hello,

I submitted a request to upgrade my app from Trial to Standard access on
16 July 2026, including the required screen recording of the OAuth flow and a
live API call. The app card still shows "Upgrade to Standard access pending"
and I have not yet received a decision.

Could you confirm the request is in the review queue, and let me know the
expected turnaround?

App name: Tiziri Rugs Marketing
App ID: 1589762
Business account: Tizirirugs

Some context in case it helps the review:

- Tiziri Rugs is a small US business based in Massachusetts, selling
  one-of-a-kind handwoven Moroccan rugs.
- We are already an approved Pinterest merchant. Our catalogue data source was
  approved on 14 July and uploads daily from
  https://tizirirugs.com/google-merchant-feed.xml
- The API app is used only to publish our own product Pins, from our own
  photography, to our own boards (Beni Ourain, Boujaad, Azilal, Moroccan Rugs),
  at roughly one Pin per day. It does not touch third-party data, does not
  handle other users' accounts, and does not post on anyone else's behalf.
- Every production call currently returns 403, code 29 ("Apps with Trial access
  may not create Pins in production"). The integration is built and verified in
  Sandbox but cannot go live until access is granted.

I am happy to resupply the demo recording or provide any further detail needed.

Thank you,
Abdelkebir Labyad
Tiziri Rugs — tizirirugs.com
```

---

## Notes before you send

**Set your expectations honestly:** it has been 5 days, and Pinterest's own guidance is "a few days." This is a reasonable nudge, not an escalation — a polite status request at this point is normal, but it is unlikely to jump the queue on its own. The value is mostly in confirming the request didn't silently fail.

**Two things the message deliberately does:**
- Leads with the app ID and submission date, because support triages on identifiers, not stories.
- States plainly that the app only posts our own content to our own boards. Standard-access reviews are largely about abuse risk, so removing that question early is the single most useful thing the message can do.

**Worth remembering:** the API app is *not* how your Pins currently flow. The approved catalogue feed is already auto-creating product Pins every 24h. Standard access only buys you custom captions and per-style board targeting on top of that. So if this drags on, it is not blocking Pinterest as a channel — it is blocking a refinement.

**When approval lands**, two things must happen or nothing publishes:
1. Review `scripts/pinterest/calendar.json` before the first run — pins go out unattended.
2. There is **no scheduled task** for the Pinterest publisher. Nothing auto-resumes; someone has to run `scripts/pinterest/publish_due.py` or create the task.
