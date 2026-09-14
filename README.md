# Siete Parts Locator — two files to add

Your repo already has the app. It's missing the two files Cloudflare's Worker
build needs. Add them and it deploys.

```
wrangler.jsonc   ← add to the repo root (one line to fill in first)
src/index.js     ← add as src/index.js
```

Nothing has to be deleted. `functions/` can stay; the Worker ignores it.

---

## Step 1 — Create the database

Cloudflare dashboard → **Storage & Databases → D1 SQL Database → Create**.
Name it exactly `parts`.

Open it → **Console** tab → paste the whole contents of `schema.sql` (already in
your repo) → run. Three tables appear: `overrides`, `added`, `history`.

On that database's page, copy the **Database ID** — a long
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` string.

## Step 2 — Put the ID in wrangler.jsonc

Open `wrangler.jsonc` (in this package) and replace
`PASTE_YOUR_DATABASE_ID_HERE` with that ID. Keep the quotes:

```jsonc
{ "binding": "DB", "database_name": "parts", "database_id": "a1b2c3d4-…" }
```

This is what connects the database to the app. Because the config lives in the
repo, do **not** add a binding in the dashboard — the file wins, and a dashboard
binding gets overwritten on the next deploy.

## Step 3 — Add both files to GitHub

On the repo page: **Add file → Upload files**, drag in `wrangler.jsonc` and the
`src` folder, commit to `main`.

Cloudflare sees the push and redeploys on its own — no dashboard visit needed.

## Step 4 — Check it

Open **`your-worker.workers.dev/api/state`**.

| What you see | What it means |
| --- | --- |
| `{"overrides":{},"added":[],"history":[]}` | Correct. Done. |
| `{"error":"The D1 database is not bound…"}` | `database_id` is still the placeholder, or the deploy ran before the edit. |
| An error mentioning `no such table` | `schema.sql` hasn't been run — step 1. |

Then open the app. The footer must read **"Shared · live"**. If it reads
**"This browser only"**, the API isn't answering and everyone's changes are
staying in their own browser.

---

## If the build fails

The log will name it. The two likely ones:

- **"Missing entry-point"** or **"no config file found"** — `wrangler.jsonc`
  isn't at the same level Cloudflare's **Path** setting points to. Path should be
  `/` since your files are at the repo root.
- **"Couldn't find a D1 DB with the name or binding"** — the database isn't
  named `parts`, or the ID is wrong.

## Free tier

Well inside it. Workers free: 100,000 requests/day (static file requests don't
count). D1 free: 5 GB, 5 million row reads and 100,000 row writes per day. Your
data is under 1 MB; a busy shift is a few hundred writes.

## Updating later

Every push to `main` redeploys.

**New Excel data** — regenerate `inventory-data.js` and commit it. Edits and
history in D1 are keyed by Item number, so they survive a data refresh.

**App changes** — `index.html` is a copy of `Parts Locator Shared.dc.html` from
the design project. Design changes don't reach production on their own; ask for a
refreshed file and commit it.

## Two things to know

**Anyone with the URL can edit.** No login, by choice. Keep the URL internal.
Every change is confirmed and initialled, so mistakes are traceable and undoable
rather than prevented.

**Last save wins.** Two people editing the same part seconds apart: the later
save sticks, and both appear in the history with initials and timestamps.
