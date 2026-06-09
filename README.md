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
npm run dev      # solo / single-device dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
npm test         # headless tests: board flow + phone companion + sync protocol
```

It's a single-page React app (Vite). All state lives in `localStorage`, so a
party persists across reloads. Sound is synthesized live with the Web Audio
API — no asset downloads.

### 📺 Phone companions (Local-LAN host)

Want everyone on their own phone? Run the **host** on the laptop you're casting
to the TV:

```bash
npm run host     # builds, then serves the app + a WebSocket room hub on :8080
```

- Open the printed `http://localhost:8080` on the **laptop/TV** — that's the
  **board** (the single source of truth for scores and state).
- Start a party, then tap **📺 Go Live**. A **room code + QR** appears.
- Everyone on the **same wifi** scans the QR (or visits `http://<laptop-ip>:8080`
  and enters the code) to open their **own card** on their phone — their game
  this round, their **secret mission** (reveal-gated), and their side quests.
- Phones send *intents*; the board decides and re-broadcasts state. No cloud, no
  accounts, works offline on the local network. The app still runs fully
  single-device if you never go live.

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
src/BeerParty.jsx   # the whole app (board engine + UI + phone companion)
src/sync.js         # tiny WebSocket client (auto-reconnect, role announce)
src/index.css       # base reset (the app injects its themed stylesheet at runtime)
server/host.mjs     # Local-LAN host: serves dist/ + WebSocket room hub
test/smoke.mjs      # board flow test (jsdom)
test/phone.mjs      # phone companion test (jsdom + mock socket)
test/sync.mjs       # host server / sync protocol test
```

Drink responsibly. 🍺
