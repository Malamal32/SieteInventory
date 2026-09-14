// POST /api/change — apply one change and return the fresh shared state.
// Body: { ops: [...], log: { who, id, part, changes } | null }
//   ops: { t: "ov-set", id, patch } | { t: "ov-clear" }
//        { t: "add-put", record }   | { t: "add-del", id }
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

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "The D1 database is not bound. Bind it as DB." }, 503);
  const db = env.DB;

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ error: "Bad request body." }, 400); }

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
      String(log.who || "\u2014").slice(0, 24),
      String(log.id || ""),
      String(log.part || "").slice(0, 300),
      JSON.stringify(log.changes)
    ));
  }

  try {
    if (stmts.length) await db.batch(stmts);
    return json(await readAll(db));
  } catch (e) {
    return json({ error: "Write failed: " + e.message }, 500);
  }
}
