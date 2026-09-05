const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAdmin, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// ---------- Auth ----------
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = await db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, username: user.username });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.post("/change-password", requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = await db.prepare("SELECT * FROM admin_users WHERE id = ?").get(req.admin.sub);
  if (!user || !bcrypt.compareSync(currentPassword || "", user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

// ---------- Generic CRUD factory ----------
// Defines editable fields per resource; id and sort_order handled automatically.
const RESOURCES = {
  companies: { table: "companies", fields: ["slug", "name", "tag", "tagline"] },
  divisions: { table: "divisions", fields: ["name", "desc", "icon", "images", "detailed_desc"], json: ["images"] },
  "solution-sectors": { table: "solution_sectors", fields: ["name", "desc"] },
  "product-categories": { table: "product_categories", fields: ["name", "image"] },
  team: { table: "team_members", fields: ["name", "role", "dept", "bio", "image"] },
  news: { table: "news", fields: ["slug", "title", "category", "date", "excerpt", "body"] },
  jobs: { table: "jobs", fields: ["slug", "title", "location", "type", "team", "description", "is_open"] },
  partners: { table: "partners", fields: ["name"] },
  timeline: { table: "timeline", fields: ["year", "title", "desc"] },
  stats: { table: "stats", fields: ["value", "suffix", "label"] },
};

function buildCrud(key, def) {
  const r = express.Router();

  r.get("/", requireAdmin, async (req, res) => {
    try {
      const rows = await db.prepare(`SELECT * FROM ${def.table} ORDER BY sort_order, id`).all();
      if (def.json) {
        rows.forEach((row) => def.json.forEach((f) => {
          try { row[f] = JSON.parse(row[f] || "[]"); } catch { row[f] = []; }
        }));
      }
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post("/", requireAdmin, async (req, res) => {
    const body = req.body || {};
    const cols = def.fields.filter((f) => f in body);
    if (cols.length === 0) return res.status(400).json({ error: "No valid fields provided" });
    try {
      const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), -1) m FROM ${def.table}`).get();
      const values = cols.map((f) => (def.json?.includes(f) ? JSON.stringify(body[f]) : body[f]));
      const placeholders = cols.map(() => "?").join(", ");
      const info = await db
        .prepare(`INSERT INTO ${def.table} (${cols.join(", ")}, sort_order) VALUES (${placeholders}, ?)`)
        .run(...values, maxRow.m + 1);
      res.status(201).json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put("/:id", requireAdmin, async (req, res) => {
    const body = req.body || {};
    const cols = def.fields.filter((f) => f in body);
    if (cols.length === 0) return res.status(400).json({ error: "No valid fields provided" });
    const values = cols.map((f) => (def.json?.includes(f) ? JSON.stringify(body[f]) : body[f]));
    const setClause = cols.map((f) => `${f} = ?`).join(", ");
    try {
      const info = await db.prepare(`UPDATE ${def.table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
      if (info.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.delete("/:id", requireAdmin, async (req, res) => {
    try {
      const info = await db.prepare(`DELETE FROM ${def.table} WHERE id = ?`).run(req.params.id);
      if (info.changes === 0) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // reorder: expects { order: [id1, id2, ...] } in desired order
  r.post("/reorder", requireAdmin, async (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).json({ error: "order must be an array of ids" });
    try {
      await db.batch(
        order.map((id, i) => ({
          sql: `UPDATE ${def.table} SET sort_order = ? WHERE id = ?`,
          args: [i, id],
        }))
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return r;
}

Object.entries(RESOURCES).forEach(([key, def]) => {
  router.use(`/${key}`, buildCrud(key, def));
});

// ---------- Submissions (read-only + status update) ----------
router.get("/contact-submissions", requireAdmin, async (req, res) => {
  res.json(await db.prepare("SELECT * FROM contact_submissions ORDER BY created_at DESC").all());
});
router.put("/contact-submissions/:id", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const info = await db.prepare("UPDATE contact_submissions SET status = ? WHERE id = ?").run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});
router.delete("/contact-submissions/:id", requireAdmin, async (req, res) => {
  await db.prepare("DELETE FROM contact_submissions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/job-applications", requireAdmin, async (req, res) => {
  res.json(await db.prepare("SELECT * FROM job_applications ORDER BY created_at DESC").all());
});
router.put("/job-applications/:id", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const info = await db.prepare("UPDATE job_applications SET status = ? WHERE id = ?").run(status, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});
router.delete("/job-applications/:id", requireAdmin, async (req, res) => {
  await db.prepare("DELETE FROM job_applications WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- Dashboard summary ----------
router.get("/summary", requireAdmin, async (req, res) => {
  const count = async (t) => (await db.prepare(`SELECT COUNT(*) c FROM ${t}`).get()).c;
  res.json({
    news: await count("news"),
    jobs: await count("jobs"),
    team: await count("team_members"),
    companies: await count("companies"),
    newContacts: (await db.prepare("SELECT COUNT(*) c FROM contact_submissions WHERE status = 'new'").get()).c,
    totalContacts: await count("contact_submissions"),
    newApplications: (await db.prepare("SELECT COUNT(*) c FROM job_applications WHERE status = 'new'").get()).c,
    totalApplications: await count("job_applications"),
  });
});

module.exports = router;
