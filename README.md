# 🍻 Beer Party

The **Mario-Party-style real-life party game** — auto-dealt rounds, random
formats, side quests, bonus stars, and a champion's podium. Drinking optional.

Pick a mode, add your crew (each becomes a little character token 🦊🐸🐲),
tell it what gear you've got, and it deals balanced concurrent mini-games every
round so **nobody ever sits out**. ~30 games built in, from Beer Pong to
zero-equipment social games that anyone can join.

## Run it

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
npm test         # headless smoke test (mounts the app, walks the core flow)
```

It's a single-page React app (Vite). All state lives in `localStorage`, so a
party persists across reloads. Sound is synthesized live with the Web Audio
API — no asset downloads.

## What's inside

- **Three modes** — Party (free-for-all), Team (persistent squads), Free Play
  (hand-pick any game).
- **Smart round engine** — gear-aware dealing (never more table games than you
  have tables), fair team balancing that avoids repeat pairings, and
  least-played weighting so everyone plays everything.
- **Pick the round** — auto-deal, vote it out loud, or **spin the wheel** 🎡.
- **Customize everything** — edit any round with drag-and-drop teams, swap
  games/formats, recolor and re-character players.
- **Secret Missions** 🎭 — each player gets one hidden, Among-Us-style mission
  for the whole night (e.g. *"drop an ice cube in someone's drink unnoticed,"*
  *"start a chant 3 people join"*). Pull it off without getting caught to bank
  +2–4 bonus points at the end. Harder missions pay more.
- **My Card** — a private, pass-the-phone hub where each player sees *their*
  current game/team, *their* secret mission (reveal-gated so neighbors can't
  peek), and *their* optional side quests as a tappable checklist.
- **Mission Debrief** — at the finish, every secret mission is revealed and the
  group rules "nailed it" or "caught" before the champion is crowned.
- **Rewards & replay** — side quests, randomized end-of-night bonus stars, an
  animated standings reveal each round, a confetti podium, party history, and an
  all-time leaderboard across every party you've thrown.

## Project layout

```
index.html          # app entry
src/main.jsx        # React mount
src/BeerParty.jsx   # the whole app (engine + UI)
src/index.css       # base reset (the app injects its themed stylesheet at runtime)
test/smoke.mjs      # jsdom smoke/flow test
```

Drink responsibly. 🍺
