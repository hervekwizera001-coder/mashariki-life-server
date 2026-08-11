const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads", "resumes"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [".pdf", ".doc", ".docx"].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only PDF/DOC/DOCX resumes are allowed"), ok);
  },
});

function isEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// POST /api/contact
router.post("/contact", async (req, res) => {
  const { name, email, company, phone, enquiryType, message } = req.body || {};
  if (!name || !isEmail(email) || !message) {
    return res.status(400).json({ error: "name, valid email and message are required" });
  }
  const info = await db
    .prepare(`INSERT INTO contact_submissions (name, email, company, phone, enquiry_type, message) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, email, company || null, phone || null, enquiryType || "General", message);
  res.status(201).json({ id: info.lastInsertRowid, ok: true });
});

// POST /api/careers/:slug/apply  (multipart/form-data, field name: resume)
// NOTE: uploaded resume files are saved to local disk, which does NOT persist
// on most free hosts (the server's filesystem resets on restart/redeploy).
// This works fine for local dev; for production, point this at S3/Cloudinary/etc.
router.post("/careers/:slug/apply", upload.single("resume"), async (req, res) => {
  const { slug } = req.params;
  const { name, email, phone, coverLetter } = req.body || {};
  const job = await db.prepare("SELECT slug FROM jobs WHERE slug = ?").get(slug);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (!name || !isEmail(email)) {
    return res.status(400).json({ error: "name and valid email are required" });
  }
  const resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : null;
  const info = await db
    .prepare(`INSERT INTO job_applications (job_slug, name, email, phone, cover_letter, resume_path) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(slug, name, email, phone || null, coverLetter || null, resumePath);
  res.status(201).json({ id: info.lastInsertRowid, ok: true });
});

module.exports = router;
