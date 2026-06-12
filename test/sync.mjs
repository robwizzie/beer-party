// Protocol test for the Local-LAN host server. Boots the real server on a test
// port, then drives a "board" client and a "phone" client through the full
// handshake: host a room → phone joins → board pushes state → phone receives it
// → phone sends an intent → board receives it. No browser needed.
import { startServer } from "../server/host.mjs";
import { WebSocket } from "ws";

const PORT = 8199;
const errors = [];
const checks = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Buffer every message per socket so back-to-back messages (joined+state) can't
// be missed by a late listener. `next` consumes from the buffer or waits.
const bufs = new WeakMap();
const track = (ws) => {
  const q = []; const waiters = [];
  bufs.set(ws, { q, waiters });
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    const i = waiters.findIndex((w) => w.t === m.t);
    if (i >= 0) { const w = waiters.splice(i, 1)[0]; clearTimeout(w.to); w.resolve(m); }
    else q.push(m);
  });
  return ws;
};
const next = (ws, t, timeout = 2000) => {
  const { q, waiters } = bufs.get(ws);
  const i = q.findIndex((m) => m.t === t);
  if (i >= 0) return Promise.resolve(q.splice(i, 1)[0]);
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`timeout waiting for "${t}"`)), timeout);
    waiters.push({ t, resolve, to });
  });
};
const open = (ws) => new Promise((res) => ws.on("open", res));

const { server } = await startServer(PORT);
const URL = `ws://localhost:${PORT}/ws`;

try {
  // board hosts a room
  const board = track(new WebSocket(URL));
  await open(board);
  board.send(JSON.stringify({ t: "host" }));
  const hosted = await next(board, "hosted");
  checks.push(["board gets a room code", /^[A-Z0-9]{4}$/.test(hosted.code)]);
  checks.push(["server reports a LAN ip", typeof hosted.ip === "string" && hosted.ip.length > 0]);

  // board publishes initial authoritative state
  const session1 = { id: "s1", players: [{ id: "p1", name: "Ava" }], secretTasks: [{ playerId: "p1", taskId: "ice_cube", status: "pending" }] };
  board.send(JSON.stringify({ t: "state", state: session1 }));
  await wait(50);

  // phone joins with the code
  const phone = track(new WebSocket(URL));
  await open(phone);
  phone.send(JSON.stringify({ t: "join", code: hosted.code }));
  await next(phone, "joined");
  const gotState = await next(phone, "state");
  checks.push(["phone receives current state on join", gotState.state?.players?.[0]?.name === "Ava"]);

  // board sees presence bump
  const presence = await next(board, "presence");
  checks.push(["board notified of phone presence", presence.count === 1]);

  // phone sends an intent → board receives it
  phone.send(JSON.stringify({ t: "intent", intent: { type: "claimMission", playerId: "p1" } }));
  const intent = await next(board, "intent");
  checks.push(["board receives phone intent", intent.intent?.type === "claimMission" && intent.intent?.playerId === "p1"]);

  // board applies + rebroadcasts new state → phone sees it
  const session2 = { ...session1, secretTasks: [{ playerId: "p1", taskId: "ice_cube", status: "done" }] };
  board.send(JSON.stringify({ t: "state", state: session2 }));
  const updated = await next(phone, "state");
  checks.push(["phone sees rebroadcast state", updated.state?.secretTasks?.[0]?.status === "done"]);

  // joining a bogus room errors cleanly
  const stray = track(new WebSocket(URL));
  await open(stray);
  stray.send(JSON.stringify({ t: "join", code: "ZZZZ" }));
  const err = await next(stray, "error");
  checks.push(["bad room code errors gracefully", err.code === "no_room"]);

  board.close(); phone.close(); stray.close();
} catch (e) {
  checks.push(["protocol walk completed", false]);
  errors.push(String(e && e.stack ? e.stack : e));
}

await wait(50);
server.close();

let ok = true;
for (const [label, pass] of checks) { console.log(`${pass ? "✓" : "✗"} ${label}`); if (!pass) ok = false; }
if (errors.length) { ok = false; console.log("\n✗ errors:"); errors.forEach((e) => console.log("  " + e.slice(0, 300))); }
console.log(ok ? "\nSYNC PROTOCOL TEST PASSED" : "\nSYNC PROTOCOL TEST FAILED");
process.exit(ok ? 0 : 1);
