# Siete Parts Locator — deploy package

Everything in this folder is what Cloudflare Pages serves. Commit the folder to
GitHub, point Pages at it, run the schema once, bind the database. No build step,
no npm install, no framework.

```
index.html          the app
support.js          runtime it needs
inventory-data.js   the 1,745 parts from the Excel sheet
siete-logo.png
_ds/…               stylesheet + component bundle
functions/api/      the two endpoints Pages runs for you
schema.sql          run once against D1
```

## 1. GitHub

Unzip this package and commit its **contents** to the repo root — so the repo
has `index.html`, `functions/`, `inventory-data.js` and the rest at its top
level. Do **not** commit the `deploy` folder itself; if the repo ends up with
`deploy/index.html`, Cloudflare won't find `functions/` and the sharing silently
won't work.

Correct:

```
your-repo/
  index.html
  functions/api/state.js
  inventory-data.js
  …
```

## 2. Create the database

Cloudflare dashboard → **Storage & Databases → D1 → Create database**.
Name it `parts`. Open it → **Console** tab → paste the contents of `schema.sql`
→ run. Three tables appear: `overrides`, `added`, `history`.

## 3. Create the Pages project

**Workers & Pages → Create → Pages → Connect to Git** → pick the repo.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Root directory *(advanced)* | *(leave empty)* |
| Production branch | `main` |

All four of those are the defaults for a root-level repo, so in practice you
pick the repo, set preset to None, and deploy.

**Why root directory matters:** Pages looks for `functions/` relative to it. It
only needs changing if you later move the files into a subfolder — then it must
name that folder.

## 4. Bind the database

Pages project → **Settings → Functions → D1 database bindings → Add binding**.

| Variable name | D1 database |
| --- | --- |
| `DB` | `parts` |

Add it for **Production** *and* **Preview**. Then **Deployments → Retry deployment**
(bindings only take effect on a new deployment).

## 5. Check it — don't skip this

Visit **`your-site.pages.dev/api/state`** directly in a browser.

| What you see | What it means |
| --- | --- |
| `{"overrides":{},"added":[],"history":[]}` | Correct. Done. |
| `{"error":"The D1 database is not bound…"}` | The API deployed; step 4 is incomplete or needs a redeploy. |
| A 404 page | **The API did not deploy.** `functions/` isn't at the repo root (or root directory in step 3 doesn't point at it) — fix and redeploy. |

A 404 here is the one failure that hides itself: the app still works, still
saves, still shows history — but each person's data stays in their own browser.
The only hint on the page is the footer reading **"This browser only"** instead
of **"Shared · live"**. Check the footer after every deploy.

## What "shared" means here

- Stock counts, detail edits, added parts and the change history live in D1 —
  everyone on the URL sees the same numbers.
- The page re-checks the server every 20 seconds, and immediately after any save,
  so one person's change shows up on everyone else's screen without a refresh.
- Polling pauses while someone has a dialog or an edit form open, so nothing
  gets yanked out from under them mid-edit.
- Every change is confirmed first and logged with initials. Nothing writes silently.
- If the server can't be reached the page still works, falls back to that browser's
  own storage, and says **"This browser only"** so nobody is misled.

## Free tier

Well inside it. Pages: unlimited static requests, 100,000 Function requests/day.
D1 free: 5 GB storage, 5 million row reads and 100,000 row writes per day. This
dataset is under 1 MB and a busy shift might make a few hundred writes.

## Updating it later

Pages redeploys on every push to `main`. Two kinds of update:

**New Excel data.** `inventory-data.js` is the sheet, baked in and never written
to. Regenerate that one file and commit it. Edits and history in D1 are keyed by
Item number, so they survive a data refresh as long as item numbers aren't
renumbered.

**Changes to the app itself.** `index.html` is a copy of
`Parts Locator Shared.dc.html` in the design project, taken at packaging time.
Design changes do **not** reach production on their own — ask for a refreshed
package after a round of changes, then commit the new `index.html`.

## Two things to know

**Anyone with the URL can edit.** No login, by choice — that's what you picked.
Keep the URL internal; a `.pages.dev` address isn't linked from anywhere and
won't be found by accident, but it isn't a secret either. Every change is
confirmed and initialled, so mistakes are traceable and undoable rather than
prevented. If you want a guard later, a shared PIN checked in
`functions/api/change.js` before the write is a small change — an environment
variable on the Pages project, not a user database.

**Last save wins.** If two people change the same part within seconds of each
other, the later save is what sticks. Both appear in the history with initials
and timestamps, so it's always visible who set what.
