require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const db = require("./db");
const { seedAll } = require("./db/seed");

const publicRoutes = require("./routes/public");
const submissionRoutes = require("./routes/submissions");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;

// Allow the frontend origin(s). Set FRONTEND_ORIGIN in .env, comma-separated for multiple.
const origins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file uploads (resumes) and admin dashboard UI
fs.mkdirSync(path.join(__dirname, "uploads", "resumes"), { recursive: true });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/admin", express.static(path.join(__dirname, "public", "admin")));

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api", publicRoutes);
app.use("/api", submissionRoutes);
app.use("/api/admin", adminRoutes);

// 404 for unmatched /api routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Basic error handler (e.g. multer file errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

db.init()
  .then(() => seedAll())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mashariki Life API running on http://localhost:${PORT}`);
      console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
