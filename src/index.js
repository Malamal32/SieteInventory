// Siete Parts Locator — Worker entry.
// API requests are handled here. Static files come from the ASSETS binding.
// The app shell is lightly transformed so PWA metadata and the navy UI accent
// can be injected without rewriting the generated index.html file.

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

async function readAll(db) {
  const ov = await db.prepare("SELECT id, data FROM overrides").all();
  const ad = await db.prepare("SELECT data FROM added ORDER BY created DESC").all();
  const hi = await db.prepare(
    "SELECT ts, who, part_id, part, changes FROM history ORDER BY seq DESC LIMIT 400"
  ).all();
  const overrides = {};
  for (const r of ov.results || []) overrides[r.id] = JSON.parse(r.data);
  return {
    overrides,
    added: (ad.results || []).map(r => JSON.parse(r.data)),
    history: (hi.results || []).map(r => ({
      ts: r.ts, who: r.who, id: r.part_id, part: r.part, changes: JSON.parse(r.changes)
    }))
  };
}

async function applyChange(db, body) {
  const ops = Array.isArray(body.ops) ? body.ops : [];
  const log = body.log || null;
  if (!ops.length && !log) return json({ error: "Nothing to do." }, 400);

  const now = Date.now();
  const stmts = [];

  for (const op of ops) {
    if (op.t === "ov-set") {
      const id = String(op.id || "");
      const patch = op.patch && typeof op.patch === "object" ? op.patch : {};
      if (!id) continue;
      if (Object.keys(patch).length) {
        stmts.push(db.prepare(
          "INSERT INTO overrides (id, data, updated) VALUES (?1, ?2, ?3) " +
          "ON CONFLICT(id) DO UPDATE SET data = ?2, updated = ?3"
        ).bind(id, JSON.stringify(patch), now));
      } else {
        stmts.push(db.prepare("DELETE FROM overrides WHERE id = ?1").bind(id));
      }
    } else if (op.t === "ov-clear") {
      stmts.push(db.prepare("DELETE FROM overrides"));
    } else if (op.t === "add-put") {
      const rec = op.record;
      if (!rec || !rec.id) continue;
      stmts.push(db.prepare(
        "INSERT INTO added (id, data, created) VALUES (?1, ?2, ?3) " +
        "ON CONFLICT(id) DO UPDATE SET data = ?2"
      ).bind(String(rec.id), JSON.stringify(rec), now));
    } else if (op.t === "add-del") {
      if (!op.id) continue;
      stmts.push(db.prepare("DELETE FROM added WHERE id = ?1").bind(String(op.id)));
    }
  }

  if (log && Array.isArray(log.changes) && log.changes.length) {
    stmts.push(db.prepare(
      "INSERT INTO history (ts, who, part_id, part, changes) VALUES (?1, ?2, ?3, ?4, ?5)"
    ).bind(
      now,
      String(log.who || "—").slice(0, 24),
      String(log.id || ""),
      String(log.part || "").slice(0, 300),
      JSON.stringify(log.changes)
    ));
  }

  if (stmts.length) await db.batch(stmts);
  return json(await readAll(db));
}

const PWA_HEAD = `
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f4f2ee">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Siete Parts">
<style>:root{--color-royal:#0b1f4d !important}</style>
`;

const PWA_SCRIPT = `
<script>
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  navigator.serviceWorker.register('/sw.js').catch(function () {});
}
</script>
`;

function transformApp(response) {
  return new HTMLRewriter()
    .on("head", { element(el) { el.append(PWA_HEAD, { html: true }); } })
    .on("body", { element(el) { el.append(PWA_SCRIPT, { html: true }); } })
    .transform(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state" || url.pathname === "/api/change") {
      if (!env.DB) return json({ error: "The D1 database is not bound. Bind it as DB." }, 503);
      try {
        if (url.pathname === "/api/state") {
          if (request.method !== "GET") return json({ error: "Use GET." }, 405);
          return json(await readAll(env.DB));
        }
        if (request.method !== "POST") return json({ error: "Use POST." }, 405);
        let body;
        try { body = await request.json(); }
        catch (e) { return json({ error: "Bad request body." }, 400); }
        return await applyChange(env.DB, body);
      } catch (e) {
        return json({ error: e.message + " — has schema.sql been run?" }, 500);
      }
    }

    if (!env.ASSETS) return new Response("Not found", { status: 404 });

    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === "GET") {
      const acceptsHtml = (request.headers.get("Accept") || "").includes("text/html");
      if (acceptsHtml) {
        response = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
      }
    }

    const type = response.headers.get("Content-Type") || "";
    if (request.method === "GET" && type.includes("text/html")) return transformApp(response);
    return response;
  }
};
