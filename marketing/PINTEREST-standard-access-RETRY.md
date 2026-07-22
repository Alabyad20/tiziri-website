# Pinterest Standard access — retry after denial (21 July 2026)

## Why it was denied

Eloise, Pinterest API Ops, on app **1589762**:

> Full OAuth process is not visible in the video demo
> API usage is not visible in the video demo

Both are fixable. The previous video showed the *result* of the integration but not the **OAuth flow happening on camera**, and not an **API call with its response**. That's all they want.

## What's already been done for you

- ✅ **`https://tizirirugs.com/` registered as a redirect URI** on the app (it wasn't before — only `localhost:8901` and `localhost:8910` were). This matters because Eloise asks to see *"being redirected to your website"*, and a localhost redirect shows a browser connection-error page, which looks broken on camera.
- ✅ **New purpose-built demo script:** `scripts/pinterest/demo_standard_access.py`. It prints large labelled banners for each step, shows every request and response, pauses between steps so they're readable, and never prints the app secret.
- ✅ Runs entirely against the **sandbox** (`api-sandbox.pinterest.com`), which the denial email explicitly recommends.

## The recording — 6 shots, about 3 minutes

Record the **whole screen** (Win + G, or OBS). One continuous take is ideal — cuts make reviewers suspicious that something was skipped. **Must be under 5 minutes.**

**Before you start:** close anything with the app secret visible, and have a terminal open at the project folder.

---

### Shot 1 — start the script
```bash
python scripts/pinterest/demo_standard_access.py
```
It prints the app id, the redirect URI, the scopes, and a long authorization URL. Let it sit on screen for two seconds so it's legible.

### Shot 2 — the Pinterest login page  ← *they said this was missing*
Copy the printed authorization URL into the browser. **Film the Pinterest login page itself.** If you're already logged in, log out first — the reviewer needs to see the login screen.

### Shot 3 — the "give access" screen  ← *they said this was missing*
The consent screen listing the scopes your app is requesting. **Pause on it** — this is the exact screen Eloise pasted a picture of in the denial. Then click **Allow / Give access**.

### Shot 4 — the redirect, with the code in the URL bar  ← *they said this was missing*
You'll land on **tizirirugs.com** with `?code=...` in the address bar. **Zoom or pause on the URL bar** so the code is clearly readable. This is the single most important frame in the video.

Copy the whole URL, paste it back into the terminal, press Enter.

### Shot 5 — the token exchange  ← *they said this was missing*
The script prints the `POST /v5/oauth/token` request (showing `Authorization: Basic <base64 of app_id:app_secret>`) and then the response containing the `access_token`. Let both stay on screen.

### Shot 6 — the API doing real work  ← *"API usage is not visible"*
The script then runs, printing each request and response:

| | |
|---|---|
| `GET /user_account` | proves the token authenticates |
| `POST /boards` | proves write scope |
| `POST /pins` | **the actual use case — creates a Pin** |
| `GET /pins/{id}` | reads the new Pin back from Pinterest |

Let the final "DEMONSTRATION COMPLETE" banner sit for a couple of seconds, then stop recording.

---

## Then resubmit

developers.pinterest.com → **My apps** → *Tiziri Rugs Marketing* → **Upgrade access** → attach the new video → submit.

## Things that will get it denied again

- **Skipping the login screen** because you were already signed in. Log out first.
- **Cutting between the consent screen and the redirect.** They want the chain unbroken.
- **The URL bar not readable** at the redirect step.
- **Over 5 minutes.**
- Showing only the script's final summary rather than the individual request/response pairs.

## Don't film

Your **app secret**. The script reads it from `~/.pin-app-secret.txt` and prints only `Basic <base64 of app_id:app_secret>` — the structure, not the value. Don't open the Configure tab of the developer dashboard on camera; the secret field lives there.

## Note

The script writes the sandbox token to `~/.pin-sandbox-token.txt`. It does **not** touch the production token at `~/.pin-token.txt`, so the live read-only integration keeps working regardless.
