// Headless smoke test: bundle the app, mount it in jsdom, drive a few key
// interactions, and fail loudly on any console.error / thrown error.
// This catches runtime issues the production build cannot (the build only
// type-checks/transpiles; it never executes the component tree).
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const errors = [];

// --- bundle the app (with React) into a single ESM file we can import ---
const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  loader: { ".js": "jsx", ".css": "empty" },
});
const code = result.outputFiles[0].text;

// --- jsdom DOM + browser API shims the app touches ---
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const { window } = dom;
const store = {};
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
});
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
class FakeAudioCtx {
  constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createOscillator() { return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0 }, connect() {} }; }
  resume() {}
}
window.AudioContext = FakeAudioCtx;
window.webkitAudioContext = FakeAudioCtx;

// install globals expected by React/DOM code (some are getter-only in Node 22)
const setGlobal = (k, v) => {
  try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { configurable: true, value: v }); }
};
for (const k of ["window", "document", "HTMLElement", "Node", "getComputedStyle"]) {
  if (window[k] !== undefined) setGlobal(k, window[k]);
}
setGlobal("window", window);
setGlobal("document", window.document);
setGlobal("requestAnimationFrame", (cb) => setTimeout(() => cb(Date.now()), 0));
setGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
setGlobal("performance", { now: () => Date.now() });

const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(" ")); origError(...a); };

// --- import the bundle and let it mount into #root ---
const dir = mkdtempSync(join(tmpdir(), "bp-"));
const file = join(dir, "bundle.mjs");
writeFileSync(file, code);
await import("file://" + file);

// give React a tick to mount + run effects
await new Promise((r) => setTimeout(r, 400));

const root = window.document.getElementById("root");
const doc = window.document;
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

// --- interaction helpers (drive React via real bubbling DOM events) ---
const allEls = (sel = "*") => [...doc.querySelectorAll(sel)];
// Find the smallest (deepest) element whose text matches — that's the real label.
const byText = (re) => {
  const matches = allEls("button,div,span,a,h1,h2,h3,li,p")
    .filter((el) => re.test((el.textContent || "").trim()));
  matches.sort((a, b) => a.getElementsByTagName("*").length - b.getElementsByTagName("*").length);
  return matches[0];
};
const interactive = (el) => (el && (el.closest("button, .bp-card, .bp-tap, [role=button]") || el)) || el;
const click = async (el, label) => {
  if (!el) throw new Error("click target not found: " + label);
  interactive(el).dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  await tick();
};
const clickText = async (re) => { await click(byText(re), re.toString()); };
const typeInto = async (input, value) => {
  input.value = value;
  // defeat React 18's value tracker so onChange fires for the controlled input
  if (input._valueTracker) input._valueTracker.setValue("");
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await tick();
};

const checks = [];
const html0 = root.innerHTML;
checks.push(["app mounted", html0.length > 500]);
checks.push(["hero title rendered", html0.includes("BEER") && html0.includes("PARTY")]);
checks.push(["start CTA rendered", /Start a Party/i.test(html0)]);
checks.push(["bottom nav rendered", html0.includes("Home") && html0.includes("Stats")]);

// --- walk the full new-party → deal → record flow ---
try {
  await clickText(/Start a Party/i);
  checks.push(["mode select opened", /Party Mode/i.test(root.innerHTML)]);
  await clickText(/Party Mode/i);
  checks.push(["setup opened", /Player name|Min \d/i.test(root.innerHTML)]);

  // add 4 players via the name input + Add button
  const nameInput = () => doc.querySelector('input[placeholder*="Player"]');
  for (const nm of ["Ava", "Ben", "Cleo", "Dex"]) {
    await typeInto(nameInput(), nm);
    await click(byText(/^Add$/), "Add");
  }
  checks.push(["4 players added", /#4 Dex/.test(root.innerHTML)]);

  // exercise the new character picker
  const charBtn = doc.querySelector('button[title="Change character"]');
  await click(charBtn, "character avatar");
  checks.push(["character picker opens", /Change character/i.test(root.innerHTML)]);

  // Players -> Gear -> Go
  await clickText(/Next →/);
  await clickText(/Next →/);
  checks.push(["reached ready screen", /Ready to Party/i.test(root.innerHTML)]);
  await clickText(/Start the Party/i);
  await tick(120);
  checks.push(["session started", /Standings|Play|Quests/i.test(root.innerHTML)]);

  // deal round one
  await clickText(/Auto-Deal Round 1/i);
  await tick(1300); // wait out the dice-roll splash
  const dealt = root.innerHTML;
  checks.push(["round dealt (reveal/match shown)", /Round 1|Let's Play|Record result/i.test(dealt)]);

  // dismiss the reveal overlay if present
  const letsPlay = byText(/Let's Play/i);
  if (letsPlay) { await click(letsPlay, "Let's Play"); await tick(120); }
  checks.push(["match cards visible", /Record result/i.test(root.innerHTML)]);
} catch (e) {
  checks.push(["flow walk completed", false]);
  errors.push("FLOW ERROR: " + (e && e.stack ? e.stack : e));
}

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "✓" : "✗"} ${label}`);
  if (!pass) ok = false;
}
if (errors.length) {
  ok = false;
  console.log(`\n✗ ${errors.length} console.error during render:`);
  errors.slice(0, 8).forEach((e) => console.log("   " + e.slice(0, 300)));
}
console.log(ok ? "\nSMOKE TEST PASSED" : "\nSMOKE TEST FAILED");
process.exit(ok ? 0 : 1);
