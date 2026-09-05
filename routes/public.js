const express = require("express");
const db = require("../db");

const router = express.Router();

function parseImages(row) {
  if (!row) return row;
  if ("images" in row) {
    try { row.images = JSON.parse(row.images || "[]"); } catch { row.images = []; }
  }
  return row;
}

router.get("/stats", async (req, res) => {
  res.json(await db.prepare("SELECT value, suffix, label FROM stats ORDER BY sort_order").all());
});

router.get("/divisions", async (req, res) => {
  const rows = await db.prepare("SELECT * FROM divisions ORDER BY sort_order").all();
  res.json(rows.map(parseImages));
});

router.get("/companies", async (req, res) => {
  res.json(await db.prepare("SELECT slug, name, tag, tagline FROM companies ORDER BY sort_order").all());
});

router.get("/companies/:slug", async (req, res) => {
  const row = await db.prepare("SELECT slug, name, tag, tagline FROM companies WHERE slug = ?").get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/solution-sectors", async (req, res) => {
  res.json(await db.prepare("SELECT name, desc FROM solution_sectors ORDER BY sort_order").all());
});

router.get("/product-categories", async (req, res) => {
  res.json(await db.prepare("SELECT name, image FROM product_categories ORDER BY sort_order").all());
});

router.get("/team", async (req, res) => {
  res.json(await db.prepare("SELECT name, role, dept, bio, image FROM team_members ORDER BY sort_order").all());
});

router.get("/news", async (req, res) => {
  res.json(await db.prepare("SELECT slug, title, category, date, excerpt FROM news ORDER BY date DESC, sort_order").all());
});

router.get("/news/:slug", async (req, res) => {
  const row = await db.prepare("SELECT * FROM news WHERE slug = ?").get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/jobs", async (req, res) => {
  res.json(await db.prepare("SELECT slug, title, location, type, team FROM jobs WHERE is_open = 1 ORDER BY sort_order").all());
});

router.get("/jobs/:slug", async (req, res) => {
  const row = await db.prepare("SELECT * FROM jobs WHERE slug = ?").get(req.params.slug);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

router.get("/partners", async (req, res) => {
  const rows = await db.prepare("SELECT name FROM partners ORDER BY sort_order").all();
  res.json(rows.map((r) => r.name));
});

router.get("/timeline", async (req, res) => {
  res.json(await db.prepare("SELECT year, title, desc FROM timeline ORDER BY sort_order").all());
});

module.exports = router;
