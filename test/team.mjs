// Team mode end-to-end: setup → auto-balance teams → deal → record → mission
// debrief → team podium. Exercises team scoring + team-aware screens.
import { boot } from "./_harness.mjs";

const checks = [];
const h = await boot();
const input = () => h.doc.querySelector('input[placeholder*="Player"]');

try {
  await h.clickText(/Start a Party/i);
  await h.clickText(/Team Mode/i);
  checks.push(["team setup opened", /Team size|Player name/i.test(h.root.innerHTML)]);

  for (const n of ["Ann", "Bo", "Cy", "Di"]) { await h.typeInto(input(), n); await h.click(h.byText(/^Add$/), "Add"); }
  checks.push(["4 players added", /#4 Di/.test(h.root.innerHTML)]);

  await h.clickText(/Next →/);            // → Teams
  await h.clickText(/Auto-Balance/i);
  checks.push(["auto-balanced (everyone assigned)", !/Unassigned:/i.test(h.root.innerHTML)]);
  await h.clickText(/Next →/);            // → Gear
  await h.clickText(/Next →/);            // → Go
  for (let i = 0; i < 7; i++) { const m = h.byText(/^−$/); if (m) await h.click(m, "rounds-"); }
  await h.clickText(/Start the Party/i);
  await h.tick(120);
  checks.push(["team session started", /Teams/i.test(h.root.innerHTML)]);

  await h.clickText(/Auto-Deal Round 1/i);
  await h.tick(1300);
  const lp = h.byText(/Let's Play/i); if (lp) await h.click(lp, "Let's Play");
  checks.push(["round dealt", /Record result/i.test(h.root.innerHTML)]);

  await h.recordAll();
  checks.push(["all results recorded", !h.byText(/Record result/i)]);

  await h.clickText(/Finish Party/i);
  await h.tick(150);
  if (h.byText(/MISSION DEBRIEF/i)) { await h.click(h.byText(/Nailed it/i), "verdict"); await h.clickText(/Lock it in/i); await h.tick(120); }
  await h.advanceStars();
  checks.push(["team podium reached", /CHAMPION/i.test(h.root.innerHTML)]);
} catch (e) {
  checks.push(["team flow completed", false]);
  h.errors.push("FLOW ERROR: " + (e && e.stack ? e.stack : e));
}

let ok = true;
for (const [l, p] of checks) { console.log(`${p ? "✓" : "✗"} ${l}`); if (!p) ok = false; }
if (h.errors.length) { ok = false; console.log(`\n✗ ${h.errors.length} console.error/throw:`); h.errors.slice(0, 6).forEach((e) => console.log("  " + e.slice(0, 300))); }
console.log(ok ? "\nTEAM MODE TEST PASSED" : "\nTEAM MODE TEST FAILED");
process.exit(ok ? 0 : 1);
