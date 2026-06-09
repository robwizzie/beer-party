// Phone-companion smoke test. Loads the app with ?room=CODE (which routes to
// PhoneApp), mocks the WebSocket, feeds it an authoritative session, and drives
// join → pick player → reveal & claim secret mission, asserting the right intent
// goes out over the wire. Catches client-side runtime errors no build can.
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const errors = [];
const result = await build({
  entryPoints: ["src/main.jsx"], bundle: true, format: "esm", platform: "browser",
  write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
  loader: { ".js": "jsx", ".css": "empty" },
});
const code = result.outputFiles[0].text;

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "http://localhost/?room=TEST", pretendToBeVisual: true,
});
const { window } = dom;
const store = {};
Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } });
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

// fake WebSocket the phone client will use
class FakeWS {
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeWS.last = this; setTimeout(() => { this.readyState = 1; this.onopen && this.onopen(); }, 0); }
  send(d) { this.sent.push(JSON.parse(d)); }
  close() { this.readyState = 3; this.onclose && this.onclose(); }
  push(obj) { this.onmessage && this.onmessage({ data: JSON.stringify(obj) }); }
}
const setGlobal = (k, v) => { try { globalThis[k] = v; } catch {} Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: v }); };
for (const k of ["window", "document", "HTMLElement", "Node", "getComputedStyle"]) if (window[k] !== undefined) setGlobal(k, window[k]);
setGlobal("window", window); setGlobal("document", window.document);
// override the built-in Node 22 global WebSocket + the `location` the client reads
Object.defineProperty(window, "WebSocket", { configurable: true, writable: true, value: FakeWS });
setGlobal("WebSocket", FakeWS);
setGlobal("location", window.location);
setGlobal("requestAnimationFrame", (cb) => setTimeout(() => cb(Date.now()), 0));
setGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
setGlobal("performance", { now: () => Date.now() });
const origErr = console.error; console.error = (...a) => { errors.push(a.map(String).join(" ")); origErr(...a); };

const dir = mkdtempSync(join(tmpdir(), "bp-phone-"));
const file = join(dir, "b.mjs"); writeFileSync(file, code);
await import("file://" + file);
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
await tick(400);

const root = window.document.getElementById("root");
const doc = window.document;
const checks = [];
const byText = (re) => {
  const m = [...doc.querySelectorAll("button,div,span,a,h1,h2,h3,li,p")].filter((el) => re.test((el.textContent || "").trim()));
  m.sort((a, b) => a.getElementsByTagName("*").length - b.getElementsByTagName("*").length);
  return m[0];
};
const interactive = (el) => (el && (el.closest("button,.bp-card,.bp-tap,[role=button]") || el)) || el;
const click = async (el) => { interactive(el).dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); await tick(); };

try {
  const ws = FakeWS.last;
  checks.push(["phone opened a socket", !!ws]);
  checks.push(["phone sent join with the code", ws.sent.some((m) => m.t === "join" && m.code === "TEST")]);
  checks.push(["shows connecting state", /Connecting|Joining/i.test(root.textContent)]);

  // board pushes authoritative session
  const session = {
    id: "s1", mode: "party", secretTasksOn: true, bonusTypes: [],
    players: [{ id: "p1", name: "Ava", color: "#FF566F", emoji: "🦊" }, { id: "p2", name: "Ben", color: "#3FA9FF", emoji: "🐸" }],
    bonus: [], secretTasks: [{ playerId: "p1", taskId: "ice_cube", status: "pending" }, { playerId: "p2", taskId: "high_fives", status: "pending" }],
    rounds: [{ id: "r1", n: 1, matches: [{ id: "m1", gameId: "flip_cup", formatId: "split", playerIds: ["p1", "p2"], teams: { p1: "A", p2: "B" }, result: null }], benched: [] }],
  };
  ws.push({ t: "joined", code: "TEST" });
  ws.push({ t: "state", state: session });
  await tick(80);
  checks.push(["name picker shown after state", /Who are you/i.test(root.textContent)]);

  await click(byText(/^Ava$/));
  checks.push(["card shows this-round assignment", /This round/i.test(root.textContent) && /Flip Cup/i.test(root.textContent)]);
  checks.push(["card shows secret mission section", /secret mission/i.test(root.textContent)]);

  await click(byText(/Tap to reveal/i));
  checks.push(["mission revealed", /pulled it off/i.test(root.textContent)]);

  const before = ws.sent.length;
  await click(byText(/pulled it off/i));
  const claim = ws.sent.slice(before).find((m) => m.t === "intent" && m.intent?.type === "claimMission");
  checks.push(["claim sent the right intent over the wire", !!claim && claim.intent.playerId === "p1"]);
} catch (e) {
  checks.push(["phone flow completed", false]);
  errors.push("FLOW ERROR: " + (e && e.stack ? e.stack : e));
}

let ok = true;
for (const [label, pass] of checks) { console.log(`${pass ? "✓" : "✗"} ${label}`); if (!pass) ok = false; }
if (errors.length) { ok = false; console.log(`\n✗ ${errors.length} error(s):`); errors.slice(0, 6).forEach((e) => console.log("  " + e.slice(0, 300))); }
console.log(ok ? "\nPHONE TEST PASSED" : "\nPHONE TEST FAILED");
process.exit(ok ? 0 : 1);
