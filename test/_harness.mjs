// Shared headless harness: bundle the app, mount it in a fresh jsdom, and return
// DOM-driving helpers. Each boot() is an isolated app instance.
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let cached = null;
async function bundle() {
  if (cached) return cached;
  const r = await build({
    entryPoints: ["src/main.jsx"], bundle: true, format: "esm", platform: "browser",
    write: false, jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' },
    loader: { ".js": "jsx", ".css": "empty" },
  });
  cached = r.outputFiles[0].text;
  return cached;
}

class FakeAudioCtx {
  constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createOscillator() { return { type: "", frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(8) }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0 }, connect() {} }; }
  resume() {}
}

export async function boot({ url = "http://localhost/" } = {}) {
  const code = await bundle();
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, { url, pretendToBeVisual: true });
  const { window } = dom;
  const store = {};
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.AudioContext = FakeAudioCtx; window.webkitAudioContext = FakeAudioCtx;
  const setGlobal = (k, v) => { try { globalThis[k] = v; } catch {} Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: v }); };
  for (const k of ["window", "document", "HTMLElement", "Node", "getComputedStyle"]) if (window[k] !== undefined) setGlobal(k, window[k]);
  setGlobal("window", window); setGlobal("document", window.document); setGlobal("location", window.location);
  setGlobal("AudioContext", FakeAudioCtx);
  setGlobal("requestAnimationFrame", (cb) => setTimeout(() => cb(Date.now()), 0));
  setGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
  setGlobal("performance", { now: () => Date.now() });

  const errors = [];
  console.error = (...a) => { errors.push(a.map(String).join(" ")); };

  const dir = mkdtempSync(join(tmpdir(), "bp-"));
  const f = join(dir, "b.mjs"); writeFileSync(f, code);
  await import("file://" + f);

  const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
  await tick(400);

  const doc = window.document;
  const root = doc.getElementById("root");
  const allEls = (sel = "*") => [...doc.querySelectorAll(sel)];
  const byText = (re) => {
    const m = allEls("button,div,span,a,h1,h2,h3,li,p").filter((el) => re.test((el.textContent || "").trim()));
    m.sort((a, b) => a.getElementsByTagName("*").length - b.getElementsByTagName("*").length);
    return m[0];
  };
  const interactive = (el) => (el && (el.closest("button,.bp-card,.bp-tap,[role=button]") || el)) || el;
  const click = async (el, label) => { if (!el) throw new Error("click target not found: " + label); interactive(el).dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); await tick(); };
  const clickText = async (re) => { await click(byText(re), re.toString()); };
  const typeInto = async (input, value) => { input.value = value; if (input._valueTracker) input._valueTracker.setValue(""); input.dispatchEvent(new window.Event("input", { bubbles: true })); await tick(); };
  // winner control inside an open Recorder modal (avoids match cards behind it)
  const inModal = (re) => {
    const save = byText(/Save & Award/i); if (!save) return null;
    let p = save; while (p.parentElement && !/Who won|assign places/i.test(p.textContent || "")) p = p.parentElement;
    return [...p.querySelectorAll("button,div,span")].filter((el) => re.test((el.textContent || "").trim()))
      .sort((a, b) => a.getElementsByTagName("*").length - b.getElementsByTagName("*").length)[0];
  };
  // record every match in the current round (winner control varies by format)
  const recordAll = async () => {
    let g = 0;
    while (byText(/Record result/i) && g++ < 12) {
      await clickText(/Record result/i);
      const w = inModal(/🥇/) || inModal(/^✓?\s*Team A$/) || inModal(/The One/);
      if (w) await click(w);
      await clickText(/Save & Award/i);
      await tick(80);
    }
  };
  // click through the bonus-star reveals to the podium
  const advanceStars = async () => {
    let s = 0;
    while ((byText(/Next Star/i) || byText(/See Final Standings/i)) && s++ < 10) {
      await click(byText(/Next Star/i) || byText(/See Final Standings/i), "star");
      await tick(120);
    }
  };

  return { window, doc, root, errors, tick, allEls, byText, interactive, click, clickText, typeInto, inModal, recordAll, advanceStars };
}
