# 🏈 Pick'em Pool — Ryan vs Catherine

A confidence-based NFL picks pool for two players. Pick the winner of each game, assign confidence points (1–N where N = number of games that week), and track scores as results come in.

## How it works

1. **Make Picks** — Select your name, tap the team you think wins each game, then assign a confidence value. Higher number = more confident. Each number can only be used once per week.
2. **Standings** — See the running score. Correct picks earn the confidence points you assigned. Incorrect picks earn nothing.
3. **Score Games** — Mark the actual winner of each game. Scores update instantly.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy to Vercel

### Option A: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option B: GitHub
1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repo
4. Vercel auto-detects Vite — click Deploy

That's it. Vercel handles the build (`vite build`) automatically.

## Adding more weeks

Edit `src/App.jsx` and add entries to the `WEEKS` object following the same format as Week 1. The app structure supports multiple weeks — you'd just need to add a week selector UI.

## Data storage

Picks and results are saved to `localStorage` in the browser. This means:
- Data persists across page reloads
- Each browser/device has its own independent data
- If both players use the **same device**, picks are shared naturally
- If on **different devices**, you'd need to coordinate (e.g. one person makes all picks, or add a backend later)
