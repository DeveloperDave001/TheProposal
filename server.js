/*
  IKD 2026 Christmas Carol — report-based performance backend
  Zero-dependency Node server: static site + JSON API + admin console.
  Start:  npm start   (or: node server.js)
  Config via env vars:
    PORT             default 3000
    ADMIN_PASSWORD   default "carol2026"
    DATA_FILE        default ./data.json
*/

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, "data.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "carol2026";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const DEFAULT_DATA = {
  units: [
    {
      code: "UNIT A.01", name: "CCW", sub: "The Central Coordinating Wing",
      assignments: [
        { name: "General Oversight", pct: 90 },
        { name: "Resource Allocation", pct: 75 },
        { name: "Strategic Planning", pct: 85 }
      ]
    },
    {
      code: "UNIT A.02", name: "Celeb Teen", sub: "Youth & Creativity",
      assignments: [
        { name: "Youth Performance", pct: 60 },
        { name: "Creative Content", pct: 45 },
        { name: "Youth Engagement", pct: 55 }
      ]
    },
    {
      code: "UNIT A.03", name: "Ambience", sub: "Atmosphere & Design",
      assignments: [
        { name: "Venue Decoration", pct: 70 },
        { name: "Lighting Setup", pct: 40 },
        { name: "Stage Design", pct: 55 }
      ]
    },
    {
      code: "UNIT A.04", name: "Sound Department", sub: "Audio Excellence",
      assignments: [
        { name: "Audio Mixing", pct: 80 },
        { name: "Equipment Setup", pct: 85 },
        { name: "Technical Support", pct: 70 }
      ]
    },
    {
      code: "UNIT A.05", name: "Comms Department", sub: "Internal Coordination",
      assignments: [
        { name: "Internal Coordination", pct: 30 },
        { name: "Event Communication", pct: 35 },
        { name: "Information Desk", pct: 20 }
      ]
    },
    {
      code: "UNIT A.06", name: "Social Media Department", sub: "Online Amplification",
      assignments: [
        { name: "Content Creation", pct: 85 },
        { name: "Live Coverage", pct: 25 },
        { name: "Community Engagement", pct: 60 }
      ]
    }
  ],
  reports: [
    {
      id: 1, department: "CCW", reporter: "Grace A.", date: "02.08.26", time: "09:20:15 AM",
      description: "Contingency plan ratified for the main auditorium."
    },
    {
      id: 2, department: "Celeb Teen", reporter: "Joshua E.", date: "02.08.26", time: "10:12:08 AM",
      description: "Rehearsal schedule confirmed with the drama lead."
    },
    {
      id: 3, department: "Ambience", reporter: "David O.", date: "02.08.26", time: "11:34:52 AM",
      description: "Decor palette approved; stage build starts next week."
    },
    {
      id: 4, department: "Sound Department", reporter: "Michael T.", date: "02.08.26", time: "12:05:37 PM",
      description: "PA system audited; two spare microphones ordered."
    },
    {
      id: 5, department: "Comms Department", reporter: "Blessing N.", date: "02.08.26", time: "08:41:20 AM",
      description: "Radio channel plan drafted for event day."
    },
    {
      id: 6, department: "Social Media Department", reporter: "Emmanuel K.", date: "02.08.26", time: "11:58:44 AM",
      description: "First promo teaser published across all platforms."
    }
  ]
};

let data = null;

function loadData() {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") { console.error("Could not read " + DATA_FILE, err.message); }
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    saveData();
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function validateData(d) {
  if (!d || typeof d !== "object") return false;
  if (!Array.isArray(d.units) || d.units.length === 0) return false;
  for (const u of d.units) {
    if (!u || typeof u !== "object") return false;
    if (typeof u.name !== "string") return false;
    if (!Array.isArray(u.assignments) || u.assignments.length === 0) return false;
    for (const a of u.assignments) {
      if (!a || typeof a.pct !== "number") return false;
      if (a.pct < 0 || a.pct > 100) return false;
    }
  }
  if (d.reports !== undefined) {
    if (!Array.isArray(d.reports)) return false;
    for (const r of d.reports) {
      if (!r || typeof r !== "object") return false;
      if (typeof r.department !== "string") return false;
      if (typeof r.reporter !== "string") return false;
      if (typeof r.date !== "string") return false;
      if (typeof r.time !== "string") return false;
      if (typeof r.description !== "string") return false;
    }
  }
  return true;
}

function normalizeData(d) {
  if (!Array.isArray(d.reports)) d.reports = [];
  let nextId = 1;
  for (const r of d.reports) {
    if (typeof r.id !== "number" || r.id <= 0) r.id = nextId;
    nextId = Math.max(nextId, r.id + 1);
  }
  return d;
}

/* --- auth --- */
const sessions = new Set();

function token() {
  return crypto.randomBytes(24).toString("hex");
}

function isAuthed(req) {
  const h = req.headers["authorization"] || "";
  const m = /^Bearer\s+(.+)$/.exec(h);
  return !!(m && sessions.has(m[1]));
}

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let chunks = [];
    let size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

/* --- static files --- */
function serveStatic(req, res, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch (e) { decoded = urlPath; }
  let rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  let file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

/* --- routes --- */
function route(req, res) {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;

  if (p === "/api/login" && req.method === "POST") {
    readBody(req).then(function (raw) {
      let pw = "";
      try { pw = JSON.parse(raw).password || ""; } catch (e) { /* ignore */ }
      if (pw !== ADMIN_PASSWORD) { sendJSON(res, 401, { error: "invalid credentials" }); return; }
      const t = token();
      sessions.add(t);
      sendJSON(res, 200, { token: t });
    }).catch(function (e) { sendJSON(res, 400, { error: e.message }); });
    return;
  }

  if (p === "/api/status" && req.method === "GET") {
    sendJSON(res, 200, data);
    return;
  }

  if (p === "/api/progress" && req.method === "POST") {
    readBody(req).then(function (raw) {
      let next;
      try { next = JSON.parse(raw); } catch (e) { sendJSON(res, 400, { error: "invalid json" }); return; }
      if (!validateData(next)) { sendJSON(res, 400, { error: "invalid data shape" }); return; }
      data = normalizeData(next);
      saveData();
      sendJSON(res, 200, { ok: true, data: data });
    }).catch(function (e) { sendJSON(res, 400, { error: e.message }); });
    return;
  }

  if (p === "/admin") {
    serveStatic(req, res, "/admin.html");
    return;
  }

  if (p.startsWith("/api/")) {
    sendJSON(res, 404, { error: "unknown endpoint" });
    return;
  }

  serveStatic(req, res, p);
}

loadData();

const server = http.createServer(route);

server.listen(PORT, function () {
  console.log("Christmas Carol proposal running at http://localhost:" + PORT);
  console.log("Admin console:      http://localhost:" + PORT + "/admin");
  console.log("Admin password:     " + ADMIN_PASSWORD + "   (override with ADMIN_PASSWORD env var)");
});
