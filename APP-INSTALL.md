# Installable app files — upload these to the repo root

Seven files. Nothing to configure, nothing to delete.

```
index.html                 ← REPLACES the one in the repo (manifest + icon tags added)
manifest.webmanifest       app name, icon, full-screen launch
sw.js                      offline cache
icon-192.png
icon-512.png
icon-maskable-512.png      Android's rounded/squircle crop
apple-touch-icon.png       iOS home-screen icon
```

Upload all seven at once: repo → **Add file → Upload files** → drag them in →
**Commit changes**. Cloudflare redeploys on the push.

## What changes on a phone

- **Android** — the install prompt now installs a real app entry: Siete logo,
  named "Parts", no browser chrome at all.
- **iPhone** — Add to Home Screen now uses the logo instead of a page
  screenshot, and launches full screen with no address bar.
- **Both** — the app opens instantly even on bad signal, because the page, the
  styles and all 1,745 parts are cached on the device. Search works fully offline.

## What still needs signal

Stock counts, edits and history come from the server every time — they're shared,
so they're never cached. Offline, the app opens and searches; the footer will say
"This browser only" and changes made then stay local. Back on signal, reload to
resync.

## Already installed on a phone?

Installed copies update themselves, but a service worker takes one extra launch:
open the app, close it fully, open it again. If someone's phone looks stuck on the
old version, have them delete the icon and re-add it.
