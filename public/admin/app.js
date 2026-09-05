const API = ""; // same origin; change if hosting admin separately, e.g. "https://api.example.com"

let TOKEN = localStorage.getItem("admin_token") || "";
let currentPage = "dashboard";

// ---- Resource definitions: must mirror routes/admin.js RESOURCES ----
const RESOURCES = {
  companies: { label: "Companies", fields: [
    { key: "slug", label: "Slug", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { key: "tag", label: "Tag", type: "text" },
    { key: "tagline", label: "Tagline", type: "textarea" },
  ]},
  divisions: { label: "Divisions", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "desc", label: "Short description", type: "text" },
    { key: "icon", label: "Icon (symbol)", type: "text" },
    { key: "images", label: "Images (comma-separated filenames)", type: "list" },
    { key: "detailed_desc", label: "Detailed description", type: "textarea" },
  ]},
  "solution-sectors": { label: "Solution Sectors", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "desc", label: "Description", type: "text" },
  ]},
    "product-categories": { label: "Product Categories", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "image", label: "Image URL", type: "text" },
  ]},
  team: { label: "Team", fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "role", label: "Role", type: "text" },
    { key: "dept", label: "Department", type: "text" },
    { key: "bio", label: "Bio", type: "textarea" },
    { key: "image", label: "Photo URL (e.g. an Imgur/Google Drive link)", type: "text" },
  ]},
  news: { label: "News", fields: [
    { key: "slug", label: "Slug", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "category", label: "Category", type: "text" },
    { key: "date", label: "Date (YYYY-MM-DD)", type: "text" },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "body", label: "Full body", type: "textarea" },
  ]},
  jobs: { label: "Jobs", fields: [
    { key: "slug", label: "Slug", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "type", label: "Type", type: "text" },
    { key: "team", label: "Team", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "is_open", label: "Open? (1 or 0)", type: "text" },
  ]},
  partners: { label: "Partners", fields: [
    { key: "name", label: "Name", type: "text" },
  ]},
  timeline: { label: "Timeline", fields: [
    { key: "year", label: "Year", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "desc", label: "Description", type: "textarea" },
  ]},
  stats: { label: "Stats", fields: [
    { key: "value", label: "Value (number)", type: "text" },
    { key: "suffix", label: "Suffix (e.g. +)", type: "text" },
    { key: "label", label: "Label", type: "text" },
  ]},
};

const NAV_GROUPS = [
  { label: "Overview", items: [{ key: "dashboard", label: "Dashboard" }] },
  { label: "Content", items: Object.keys(RESOURCES).map((k) => ({ key: k, label: RESOURCES[k].label })) },
  { label: "Inbox", items: [
    { key: "contact-submissions", label: "Contact Messages" },
    { key: "job-applications", label: "Job Applications" },
  ]},
  { label: "Account", items: [{ key: "settings", label: "Settings" }] },
];

// ---------- API helper ----------
async function api(path, opts = {}) {
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: {
      ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired, please log in again");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------- Auth ----------
const loginScreen = document.getElementById("login-screen");
const appEl = document.getElementById("app");

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";
  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    TOKEN = data.token;
    localStorage.setItem("admin_token", TOKEN);
    localStorage.setItem("admin_username", data.username);
    boot();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

function logout() {
  TOKEN = "";
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_username");
  appEl.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

async function boot() {
  try {
    const me = await api("/me");
    document.getElementById("whoami").textContent = me.username;
    loginScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    renderNav();
    navigate("dashboard");
  } catch {
    logout();
  }
}

// ---------- Nav ----------
function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  NAV_GROUPS.forEach((group) => {
    const label = document.createElement("div");
    label.className = "nav-group-label";
    label.textContent = group.label;
    nav.appendChild(label);
    group.items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.dataset.key = item.key;
      btn.textContent = item.label;
      btn.addEventListener("click", () => navigate(item.key));
      nav.appendChild(btn);
    });
  });
}

function setActiveNav(key) {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.key === key));
}

function navigate(key) {
  currentPage = key;
  setActiveNav(key);
  const titles = { dashboard: "Dashboard", "contact-submissions": "Contact Messages", "job-applications": "Job Applications", settings: "Settings" };
  document.getElementById("page-title").textContent = titles[key] || RESOURCES[key]?.label || key;

  if (key === "dashboard") return renderDashboard();
  if (key === "contact-submissions") return renderSubmissions();
  if (key === "job-applications") return renderApplications();
  if (key === "settings") return renderSettings();
  if (RESOURCES[key]) return renderResource(key);
}

// ---------- Dashboard ----------
async function renderDashboard() {
  const content = document.getElementById("content");
  content.innerHTML = `<p class="muted">Loading…</p>`;
  try {
    const s = await api("/summary");
    content.innerHTML = `
      <div class="cards">
        ${statCard(s.news, "News articles")}
        ${statCard(s.jobs, "Open job listings")}
        ${statCard(s.team, "Team members")}
        ${statCard(s.companies, "Companies")}
        ${statCard(s.newContacts, "New contact messages", s.totalContacts)}
        ${statCard(s.newApplications, "New job applications", s.totalApplications)}
      </div>
      <p class="muted">Welcome back. Use the sidebar to manage site content, or check the Inbox for new enquiries and applications.</p>
    `;
  } catch (e) {
    content.innerHTML = `<p class="error">${e.message}</p>`;
  }
}
function statCard(num, label, total) {
  return `<div class="stat-card"><div class="num">${num}${total !== undefined ? ` <span class="muted" style="font-size:14px">/ ${total}</span>` : ""}</div><div class="label">${label}</div></div>`;
}

// ---------- Generic resource CRUD ----------
async function renderResource(key) {
  const def = RESOURCES[key];
  const content = document.getElementById("content");
  content.innerHTML = `<p class="muted">Loading…</p>`;
  let rows;
  try {
    rows = await api(`/${key}`);
  } catch (e) {
    content.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }

  const cols = def.fields.map((f) => f.key);
  content.innerHTML = `
    <div class="toolbar">
      <span class="muted">${rows.length} item${rows.length === 1 ? "" : "s"}</span>
      <button class="primary" id="add-btn">+ Add ${def.label.replace(/s$/, "")}</button>
    </div>
    ${rows.length === 0 ? `<div class="empty">No items yet. Click "Add" to create one.</div>` : `
    <table>
      <thead><tr>${cols.map((c) => `<th>${def.fields.find((f) => f.key === c).label}</th>`).join("")}<th></th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr data-id="${row.id}">
            ${cols.map((c) => `<td>${escapeHtml(cellPreview(row[c]))}</td>`).join("")}
            <td class="actions">
              <button class="icon-btn edit-btn">Edit</button>
              <button class="icon-btn danger delete-btn">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`}
  `;

  document.getElementById("add-btn").addEventListener("click", () => openResourceModal(key, null));
  content.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const id = e.target.closest("tr").dataset.id;
      const row = rows.find((r) => String(r.id) === id);
      openResourceModal(key, row);
    })
  );
  content.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      if (!confirm("Delete this item? This cannot be undone.")) return;
      try {
        await api(`/${key}/${id}`, { method: "DELETE" });
        renderResource(key);
      } catch (err) {
        alert(err.message);
      }
    })
  );
}

function cellPreview(val) {
  if (Array.isArray(val)) return val.join(", ");
  if (val === null || val === undefined) return "";
  const s = String(val);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function openResourceModal(key, row) {
  const def = RESOURCES[key];
  const backdrop = document.getElementById("modal-backdrop");
  const form = document.getElementById("modal-form");
  document.getElementById("modal-title").textContent = row ? `Edit ${def.label.replace(/s$/, "")}` : `Add ${def.label.replace(/s$/, "")}`;

  form.innerHTML = def.fields.map((f) => {
    const raw = row ? row[f.key] : "";
    const val = f.type === "list" ? (Array.isArray(raw) ? raw.join(", ") : "") : (raw ?? "");
    if (f.type === "textarea") {
      return `<label>${f.label}</label><textarea name="${f.key}">${escapeHtml(val)}</textarea>`;
    }
    return `<label>${f.label}</label><input name="${f.key}" type="text" value="${escapeHtml(val)}" />`;
  }).join("");

  backdrop.classList.remove("hidden");

  const closeModal = () => backdrop.classList.add("hidden");
  document.getElementById("modal-cancel").onclick = closeModal;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {};
    def.fields.forEach((f) => {
      let v = fd.get(f.key);
      if (f.type === "list") v = v.split(",").map((s) => s.trim()).filter(Boolean);
      if (f.key === "value" || f.key === "is_open") v = Number(v) || 0;
      body[f.key] = v;
    });
    try {
      if (row) {
        await api(`/${key}/${row.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api(`/${key}`, { method: "POST", body: JSON.stringify(body) });
      }
      closeModal();
      renderResource(key);
    } catch (err) {
      alert(err.message);
    }
  };
}

// ---------- Contact submissions ----------
async function renderSubmissions() {
  const content = document.getElementById("content");
  content.innerHTML = `<p class="muted">Loading…</p>`;
  let rows;
  try {
    rows = await api("/contact-submissions");
  } catch (e) {
    content.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }
  content.innerHTML = rows.length === 0 ? `<div class="empty">No contact messages yet.</div>` : `
    <table>
      <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Type</th><th>Message</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr data-id="${r.id}">
            <td>${fmtDate(r.created_at)}</td>
            <td>${escapeHtml(r.name)}${r.company ? `<br><span class="muted">${escapeHtml(r.company)}</span>` : ""}</td>
            <td>${escapeHtml(r.email)}${r.phone ? `<br><span class="muted">${escapeHtml(r.phone)}</span>` : ""}</td>
            <td>${escapeHtml(r.enquiry_type || "")}</td>
            <td style="max-width:320px">${escapeHtml(r.message)}</td>
            <td><span class="badge ${r.status}">${r.status}</span></td>
            <td class="actions">
              ${r.status === "new" ? `<button class="icon-btn mark-read">Mark read</button>` : ""}
              <button class="icon-btn danger delete-btn">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;

  content.querySelectorAll(".mark-read").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      await api(`/contact-submissions/${id}`, { method: "PUT", body: JSON.stringify({ status: "read" }) });
      renderSubmissions();
    })
  );
  content.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (!confirm("Delete this message?")) return;
      const id = e.target.closest("tr").dataset.id;
      await api(`/contact-submissions/${id}`, { method: "DELETE" });
      renderSubmissions();
    })
  );
}

// ---------- Job applications ----------
async function renderApplications() {
  const content = document.getElementById("content");
  content.innerHTML = `<p class="muted">Loading…</p>`;
  let rows;
  try {
    rows = await api("/job-applications");
  } catch (e) {
    content.innerHTML = `<p class="error">${e.message}</p>`;
    return;
  }
  content.innerHTML = rows.length === 0 ? `<div class="empty">No job applications yet.</div>` : `
    <table>
      <thead><tr><th>Date</th><th>Job</th><th>Applicant</th><th>Contact</th><th>Resume</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr data-id="${r.id}">
            <td>${fmtDate(r.created_at)}</td>
            <td>${escapeHtml(r.job_slug)}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.email)}${r.phone ? `<br><span class="muted">${escapeHtml(r.phone)}</span>` : ""}</td>
            <td>${r.resume_path ? `<a href="${r.resume_path}" target="_blank" rel="noopener">Download</a>` : "—"}</td>
            <td><span class="badge ${r.status}">${r.status}</span></td>
            <td class="actions">
              ${r.status === "new" ? `<button class="icon-btn mark-read">Mark read</button>` : ""}
              <button class="icon-btn danger delete-btn">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;

  content.querySelectorAll(".mark-read").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      await api(`/job-applications/${id}`, { method: "PUT", body: JSON.stringify({ status: "read" }) });
      renderApplications();
    })
  );
  content.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      if (!confirm("Delete this application?")) return;
      const id = e.target.closest("tr").dataset.id;
      await api(`/job-applications/${id}`, { method: "DELETE" });
      renderApplications();
    })
  );
}

function fmtDate(s) {
  try { return new Date(s + "Z").toLocaleString(); } catch { return s; }
}

// ---------- Settings ----------
function renderSettings() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="modal" style="width:420px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin:0;">
      <h3>Change password</h3>
      <form id="pw-form">
        <label>Current password</label>
        <input type="password" name="currentPassword" required />
        <label>New password</label>
        <input type="password" name="newPassword" required minlength="8" />
        <div class="modal-actions"><button class="primary" type="submit">Update password</button></div>
        <p id="pw-msg" class="muted" style="margin-top:10px"></p>
      </form>
    </div>
  `;
  document.getElementById("pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = document.getElementById("pw-msg");
    try {
      await api("/change-password", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)) });
      msg.textContent = "Password updated.";
      msg.classList.remove("error");
      e.target.reset();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = "error";
    }
  });
}

// ---------- Boot ----------
if (TOKEN) boot(); else { loginScreen.classList.remove("hidden"); }
