// Free Play end-to-end: setup → session → pick a game → spin a format → record.
// Exercises the hand-pick / random-spin path (no auto-deal, no secret missions).
import { boot } from "./_harness.mjs";

const checks = [];
const h = await boot();
const input = () => h.doc.querySelector('input[placeholder*="Player"]');

try {
  await h.clickText(/Start a Party/i);
  await h.clickText(/Free Play/i);
  checks.push(["free play setup opened", /Player name/i.test(h.root.innerHTML)]);

  for (const n of ["Eve", "Fin", "Gus"]) { await h.typeInto(input(), n); await h.click(h.byText(/^Add$/), "Add"); }
  checks.push(["3 players added", /#3 Gus/.test(h.root.innerHTML)]);

  await h.clickText(/Next →/);   // → Gear
  await h.clickText(/Next →/);   // → Go
  // free play shows no secret-missions toggle and no round count
  checks.push(["no secret toggle in free play", !/Secret Missions/i.test(h.root.innerHTML)]);
  await h.clickText(/Start the Party/i);
  await h.tick(120);
  checks.push(["free play session (pick a game)", /Pick a Game/i.test(h.root.innerHTML)]);
  checks.push(["no My Card / Go Live in free play", !/My Card/i.test(h.root.innerHTML) && !/Go Live/i.test(h.root.innerHTML)]);

  // pick a no-gear social game so it's always eligible
  const game = h.byText(/Most Likely|Paranoia|RPS|Trivia|Coin Flip/i);
  await h.click(game, "game card");
  checks.push(["game selected (format options + spin)", /Random Spin/i.test(h.root.innerHTML)]);

  await h.clickText(/Random Spin/i);
  await h.tick(5500); // the format spinner decelerates over ~4.5s
  checks.push(["spin produced a match (record or pick)", /Record result|Pick different game/i.test(h.root.innerHTML)]);
} catch (e) {
  checks.push(["free play flow completed", false]);
  h.errors.push("FLOW ERROR: " + (e && e.stack ? e.stack : e));
}

let ok = true;
for (const [l, p] of checks) { console.log(`${p ? "✓" : "✗"} ${l}`); if (!p) ok = false; }
if (h.errors.length) { ok = false; console.log(`\n✗ ${h.errors.length} console.error/throw:`); h.errors.slice(0, 6).forEach((e) => console.log("  " + e.slice(0, 300))); }
console.log(ok ? "\nFREE PLAY TEST PASSED" : "\nFREE PLAY TEST FAILED");
process.exit(ok ? 0 : 1);
