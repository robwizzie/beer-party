# 🕵️ Imposter Mode — design notes (NOT built yet)

A parking-lot design doc for a future Among-Us-style mode. This is thinking-out-loud
so we don't lose the idea — nothing here is implemented. The goal: a hidden-role,
social-deduction layer where 1–2 players are secretly working *against* the group.

## The core fun we're chasing

Among Us works because of three things, and we want all three:
1. **Hidden roles** — you don't know who the imposter is.
2. **Plausible deniability** — the imposter's sabotage looks like normal play / bad luck.
3. **Accusation drama** — meetings, finger-pointing, and votes where being *confident
   and wrong* is as funny as being right.

The trap to avoid: "try to lose" is only fun if losing is **subtle and risky**. If the
imposter can just openly throw, there's no tension. The whole game is *hiding* that
you're throwing.

## Two ways to ship it (recommend doing them in this order)

### Tier 1 — "Imposter Twist" (a *setting* on Party/Team mode) ✅ cheap, reuses everything

The lowest-cost version, and probably the most replayable. Layer a hidden role on top
of the normal round loop we already have.

- At setup, a toggle: **"Imposter Twist."** Secretly assign 1–2 imposters (see scaling).
- Roles are delivered **privately on phones** (we already have per-phone secret delivery
  from Secret Missions — same mechanism, same reveal-cover).
- **Crew goal:** win your games normally *and* correctly vote out the imposter(s).
- **Imposter goal:** quietly drag down outcomes (lose/throw your matches, finish last)
  **without getting voted out.** Bank points for every round you survive undetected.
- Every couple of rounds the app calls a **Meeting**: everyone anonymously votes (on their
  phone) for who they think the imposter is. The board reveals the tally with drama.
  - Majority hits an imposter → crew bonus, that imposter is "exposed" (revealed, still
    plays but can't score imposter points anymore).
  - Majority hits a crewmate → that crewmate takes a forfeit (a sip / silly dare), and the
    imposter quietly celebrates.
- **End:** imposters who were never caught score a big payout; crew scores for correct
  ejections. Folds into the existing final-standings/podium flow like bonus stars.

Why this first: it reuses the round engine, the phone companion, private role delivery,
and the standings/podium. The only new primitives are **role assignment**, an **anonymous
phone vote**, and a **meeting/reveal screen**.

### Tier 2 — "Saboteur" (a full, separate mode) 🚀 the real Among Us translation

A different loop from Party Mode. Higher build cost; do it once Tier 1 proves people love
the hidden-role tension.

- **Shared task bar.** The crew has a communal list of **drink-tasks / challenges**
  (e.g. "finish a beer," "win a flip-cup," "land a quarter"). Completing tasks fills a
  big progress bar on the TV. Crew wins by **filling the bar before time/rounds run out.**
- **Imposters fake tasks.** They pretend to do tasks but don't advance the bar, and they
  **sabotage** to slow the crew.
- **Sabotages** (imposter taps it on their phone; board announces it):
  - *Power outage / "lights":* everyone must drink before tasks can resume.
  - *Reactor:* two specific people must "cheers" within 30s or the whole group drinks.
  - *Comms down:* hide the task bar for a round so crew loses track of progress.
- **"Kills," reimagined safely as "spikes."** An imposter secretly *spikes* a crewmate:
  the victim gets a forfeit on their phone (a chug / shot / dare) and is **"downed"**
  (sits the next round, or loses points). No one is ever actually removed from the party —
  this is the bit to handle most carefully (see Safety).
- **Emergency meetings.** Anyone can call one (or one is forced after a spike is reported).
  Discussion, then an anonymous phone vote → eject the top suspect (they sit a round /
  take a forfeit; not permanent).
- **Win conditions:**
  - Crew: fill the task bar **or** correctly eject all imposters.
  - Imposters: run out the clock with the bar unfilled **or** rack up enough spikes/sabotage
    to flip a "chaos meter."
  - (Deliberately **not** Among-Us "reduce crew to parity by killing" — you can't remove
    real people, so we win/lose on **objectives and votes**, not headcount.)

## Imposter count scaling (Among-Us-ish)

| Players | Imposters |
|--------:|:---------:|
| 3–5     | 1         |
| 6–9     | 1 (option for 2) |
| 10–14   | 2         |
| 15+     | 2 (option for 3) |

Roughly one imposter per ~5 players. Always let the host override.

## Scoring sketch (Tier 1)

- Imposter survives a meeting undetected: **+2 / round** (the risk premium).
- Imposter never caught all game: **big bonus** (e.g. +6) at the reveal.
- Crew correctly votes out an imposter: **+2 each** to everyone who voted them.
- Crew wrongly ejects a crewmate: the ejected one sips / loses a couple points.
- Keep imposter payouts tuned so a great imposter run rivals winning the night straight-up —
  that's what makes people *want* to be the imposter.

## How it maps to what we've already built

- **Private role delivery** → reuse the Secret Missions per-phone reveal-cover. A role is
  just a special card: "🕵️ You're the Imposter. Throw games. Don't get caught."
- **Voting** → we have a vote modal already; add an **anonymous per-phone vote** (phones
  send a `vote` intent, board tallies — the board is already the source of truth).
- **Meetings/reveals** → reuse the animated reveal screens (RoundReveal / StandingsReveal
  style) for "🚨 EMERGENCY MEETING" and the vote tally.
- **Sabotage / spike / down state** → new fields on the session, new intents
  (`sabotage`, `spike`, `callMeeting`, `vote`) handled by `applyIntent` on the board.
- **Task bar (Tier 2)** → a new shared structure + a "tasks" screen on the TV; tasks are
  basically today's Side Quests promoted into a shared objective.

So Tier 1 is mostly: role assignment + anonymous vote intent + a meeting screen +
end-game scoring. Tier 2 adds the task bar and sabotage system.

## Safety / vibe guardrails (important — it's a drinking game)

- **Drinking always optional.** "Tasks," "spikes," and forfeits should each have a
  non-alcoholic equivalent (a silly dare, a push-up, a shot of water). Make this a setting.
- **"Spikes" are never mean.** Cap them, keep them light, and never target the same person
  twice in a row. No "everyone pick on one person."
- **No real elimination.** Ejected/downed players sit *one round* or take a small forfeit,
  then rotate right back in — the whole app's promise is "nobody waits."
- **Imposter actions are bounded** so the night can't spiral (limited sabotages, cooldowns).
- **Keep it short.** Hidden-role tension is best in 15–25 min bursts; tie it to a round cap.

## Open questions for later (your call)

1. **Setting vs. mode?** Start as a *toggle on Party Mode* (Tier 1), then graduate to a
   full *Saboteur mode* (Tier 2)? (Recommended.)
2. **Win on objectives or on votes?** I'm leaning **both** matter, but which dominates?
3. **How adversarial should "spikes" feel?** Playful-only, or genuinely punishing?
4. **Anonymous votes?** Anonymous is funnier and safer for feelings; public is more chaotic.
   (Leaning anonymous, revealed dramatically.)
5. **Does the imposter know the other imposter?** Among Us: yes. Two imposters who can
   coordinate (privately) is more fun at 10+ players.

When you're ready, Tier 1 is a comfortable next build on top of the phone companion.
