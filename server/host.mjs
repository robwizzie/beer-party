// Beer Party — Local-LAN host server.
//
// Run on the laptop that's casting to the TV (`npm run host`). It does two jobs
// on a single port so phones have one origin to hit (no CORS, no cloud):
//   1. Serves the built web app from dist/ (with SPA fallback).
//   2. Runs a WebSocket "room hub" so phones can join the party as companions.
//
// The hub is a DUMB RELAY. The board (the laptop/TV) is the single source of
// truth: it pushes the authoritative session state, phones send "intents"
// (claim a mission, tick a side quest, cast a vote). The hub just routes
// state→phones and intents→board. This keeps scoring/stats correct (one brain)
// and works fully offline on a local network.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;
const ROOT = join(fileURLToPath(new URL("../dist", import.meta.url)));

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

// best LAN IPv4 so the QR points phones at this machine, not localhost
export function lanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) return ni.address;
    }
  }
  return "localhost";
}

// ── static file serving (with SPA fallback to index.html) ──────────────────────
async function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  if (urlPath === "/lan-ip") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ip: lanIP(), port: PORT }));
  }
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(ROOT, safe);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(ROOT, "index.html"); // SPA fallback so /?room=CODE works
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found. Did you run `npm run build` first?");
  }
}

// ── room hub ────────────────────────────────────────────────────────────────
const rooms = new Map(); // code -> { host, clients:Set, state, timer }
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
const newCode = () => {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(""); }
  while (rooms.has(c));
  return c;
};
const send = (ws, obj) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {} };
const broadcastPhones = (room, obj) => room.clients.forEach((c) => send(c, obj));

export function attachHub(wss) {
  wss.on("connection", (ws) => {
    ws.meta = { role: null, code: null };
    ws.on("message", (raw) => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }

      if (msg.t === "host") {
        // board claims/creates a room and becomes the source of truth
        const code = (msg.code && rooms.has(msg.code)) ? msg.code : (msg.code || newCode());
        const room = rooms.get(code) || { host: null, clients: new Set(), state: null, timer: null };
        if (room.timer) { clearTimeout(room.timer); room.timer = null; }
        room.host = ws;
        rooms.set(code, room);
        ws.meta = { role: "host", code };
        send(ws, { t: "hosted", code, ip: lanIP(), port: PORT });
        if (msg.state) { room.state = msg.state; }
        return;
      }

      if (msg.t === "join") {
        const room = rooms.get(msg.code);
        if (!room) return send(ws, { t: "error", code: "no_room", msg: "That room code isn't live." });
        room.clients.add(ws);
        ws.meta = { role: "phone", code: msg.code };
        send(ws, { t: "joined", code: msg.code });
        if (room.state) send(ws, { t: "state", state: room.state });
        send(room.host, { t: "presence", count: room.clients.size });
        return;
      }

      if (msg.t === "state" && ws.meta.role === "host") {
        const room = rooms.get(ws.meta.code);
        if (room) { room.state = msg.state; broadcastPhones(room, { t: "state", state: msg.state }); }
        return;
      }

      if (msg.t === "intent" && ws.meta.role === "phone") {
        const room = rooms.get(ws.meta.code);
        if (room) send(room.host, { t: "intent", intent: msg.intent });
        return;
      }
    });

    ws.on("close", () => {
      const { role, code } = ws.meta;
      const room = rooms.get(code);
      if (!room) return;
      if (role === "host") {
        room.host = null;
        broadcastPhones(room, { t: "host_gone" });
        // keep the room (and its state) briefly so the board can reconnect
        room.timer = setTimeout(() => { if (!room.host) rooms.delete(code); }, 2 * 60 * 1000);
      } else if (role === "phone") {
        room.clients.delete(ws);
        send(room.host, { t: "presence", count: room.clients.size });
      }
    });
  });
}

// ── boot (skipped when imported by tests) ──────────────────────────────────────
export function startServer(port = PORT) {
  const server = createServer(serveStatic);
  const wss = new WebSocketServer({ server, path: "/ws" });
  attachHub(wss);
  return new Promise((resolve) => server.listen(port, () => resolve({ server, wss })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().then(() => {
    const ip = lanIP();
    console.log(`\n🍻  Beer Party host is LIVE\n`);
    console.log(`   On this laptop (the board / TV):  http://localhost:${PORT}`);
    console.log(`   Phones on the same wifi join at:  http://${ip}:${PORT}\n`);
    console.log(`   Tip: open the board, start a party, then tap "Go Live" to show the join QR.\n`);
  });
}
