const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const PUBLIC = path.join(__dirname, "public");
const DB_PATH = path.join(__dirname, "data.json");

let VULNERABLE = process.env.SAFE !== "true";

function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ comments: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function saveDB(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

const GAMES = [
  { id: "minecraft", title: "Minecraft", price: "$29.99", img: "https://placehold.co/300x180/3a7d44/fff?text=Minecraft", review: "Endless creativity. A decade on, still peerless." },
  { id: "eldenring", title: "Elden Ring", price: "$59.99", img: "https://placehold.co/300x180/8b6b3e/fff?text=Elden+Ring", review: "Brutal, beautiful, and enormous." },
  { id: "hades", title: "Hades", price: "$24.99", img: "https://placehold.co/300x180/5a3a7d/fff?text=Hades", review: "Roguelike perfection." },
  { id: "stardew", title: "Stardew Valley", price: "$14.99", img: "https://placehold.co/300x180/3e6b8b/fff?text=Stardew", review: "The coziest farm sim ever made." }
];

function readBody(req) {
  return new Promise(resolve => {
    let d = "";
    req.on("data", c => d += c);
    req.on("end", () => resolve(d));
  });
}
function parseForm(body) {
  const out = {};
  if (!body) return out;
  for (const pair of body.split("&")) {
    if (!pair) continue;
    const i = pair.indexOf("=");
    const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, " "));
    const v = decodeURIComponent((i < 0 ? "" : pair.slice(i + 1)).replace(/\+/g, " "));
    out[k] = v;
  }
  return out;
}
function sendJSON(res, obj, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".json": "application/json" };
  const headers = { "Content-Type": types[ext] || "application/octet-stream" };
  if (!VULNERABLE && ext === ".html") {
    headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:;";
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost:" + PORT);
  const p = u.pathname;

  if (p === "/api/mode") return sendJSON(res, { vulnerable: VULNERABLE });
  if (p === "/api/toggle" && req.method === "POST") {
    VULNERABLE = !VULNERABLE;
    return sendJSON(res, { vulnerable: VULNERABLE });
  }
  if (p === "/api/games") return sendJSON(res, GAMES);

  const gMatch = p.match(/^\/api\/games\/([^/]+)$/);
  if (gMatch && req.method === "GET") {
    const game = GAMES.find(g => g.id === gMatch[1]);
    if (!game) return sendJSON(res, { error: "not found" }, 404);
    const db = loadDB();
    const comments = db.comments.filter(c => c.gameId === game.id);
    return sendJSON(res, { game, comments });
  }

  const cMatch = p.match(/^\/api\/games\/([^/]+)\/comments$/);
  if (cMatch && req.method === "POST") {
    const body = await readBody(req);
    const form = parseForm(body);
    const db = loadDB();
    db.comments.push({ gameId: cMatch[1], name: (form.name || "Anonymous").slice(0, 50), text: form.text || "", ts: Date.now() });
    saveDB(db);
    return sendJSON(res, { ok: true }, 201);
  }
  
  // === API: Fake Login for Demo ==================================
  if (p === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    const form = parseForm(body);
    
    // Hardcoded credentials for the victim
    if (form.username === "john.doe@example.com" && form.password === "password123") {
      return sendJSON(res, { success: true, name: "John Doe" });
    } else {
      return sendJSON(res, { success: false, error: "Invalid credentials" }, 401);
    }
  }

  let filePath = p === "/" ? "/index.html" : p;
  filePath = path.join(PUBLIC, filePath);
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); }
  return sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`GameStore -> http://localhost:${PORT}`);
  console.log(`Mode: ${VULNERABLE ? "VULNERABLE" : "SAFE"}`);
});