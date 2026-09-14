// GET /api/state — the whole shared layer: overrides, added parts, history.
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "The D1 database is not bound. Bind it as DB." }, 503);
  const db = env.DB;
  try {
    const ov = await db.prepare("SELECT id, data FROM overrides").all();
    const ad = await db.prepare("SELECT data FROM added ORDER BY created DESC").all();
    const hi = await db.prepare(
      "SELECT ts, who, part_id, part, changes FROM history ORDER BY seq DESC LIMIT 400"
    ).all();

    const overrides = {};
    for (const r of ov.results || []) overrides[r.id] = JSON.parse(r.data);

    return json({
      overrides,
      added: (ad.results || []).map(r => JSON.parse(r.data)),
      history: (hi.results || []).map(r => ({
        ts: r.ts, who: r.who, id: r.part_id, part: r.part, changes: JSON.parse(r.changes)
      }))
    });
  } catch (e) {
    return json({ error: "Read failed: " + e.message + " — has schema.sql been run?" }, 500);
  }
}
