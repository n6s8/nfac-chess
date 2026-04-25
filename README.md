# ♞ AlgoChess

> **Learn algorithmic thinking through chess.**
> AI-powered move analysis using concepts like minimax, greedy algorithms, and strategic trade-offs.

---

## ✨ Features

| Feature | Status |
|---|---|
| Chess game vs Stockfish AI | ✅ |
| Move validation (chess.js) | ✅ |
| Stockfish engine integration | ✅ |
| Post-game blunder detection | ✅ |
| OpenAI algorithmic explanations | ✅ |
| Supabase auth (email/password) | ✅ |
| Game history saved to Supabase | ✅ |
| Dark mode, responsive UI | ✅ |

---

## 🚀 Quick Start

### 1. Clone & install dependencies

```bash
git clone <your-repo>
cd algochess
npm install
```

### 2. Copy Stockfish engine to public/

```bash
npm run setup:stockfish
```

This copies `stockfish.js` from `node_modules/stockfish/` into `public/` so the browser can load it as a Web Worker.

### 3. Set environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Supabase (required for auth + game saving)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (required for AI explanations)
VITE_OPENAI_API_KEY=sk-...

# Optional tuning
VITE_STOCKFISH_DEPTH=15
VITE_BLUNDER_THRESHOLD=150
```

### 4. Set up Supabase database

1. Go to [supabase.com](https://supabase.com) → your project
2. Open **SQL Editor** → New query
3. Paste contents of `supabase/schema.sql` → **Run**

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏗 Project Structure

```
algochess/
├── public/
│   └── stockfish.js          # Copied by setup:stockfish script
├── scripts/
│   └── setup-stockfish.mjs   # Stockfish copy script
├── supabase/
│   └── schema.sql            # Database schema + RLS policies
├── src/
│   ├── types/
│   │   └── index.ts          # All TypeScript types
│   ├── lib/
│   │   ├── chess.ts          # chess.js wrapper utilities
│   │   ├── stockfish.ts      # Stockfish engine singleton (Web Worker)
│   │   ├── supabase.ts       # Supabase client + DB helpers
│   │   └── ai.ts             # analyzeGame() + explainMove() (OpenAI)
│   ├── hooks/
│   │   └── useGame.ts        # Core game state management hook
│   ├── components/
│   │   ├── ChessBoard.tsx    # react-chessboard wrapper
│   │   ├── MoveHistory.tsx   # Move list with quality badges
│   │   └── AnalysisPanel.tsx # Post-game analysis + AI explanations
│   ├── pages/
│   │   ├── Game.tsx          # Main game page (root route)
│   │   └── Auth.tsx          # Standalone auth page
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 🧠 How AlgoChess Works

### Move Analysis Pipeline

```
Game ends
    │
    ▼
analyzeGame(moves)                     [src/lib/ai.ts]
    │  • Replays every position via chess.js
    │  • Evaluates each with Stockfish (depth 12)
    │  • Computes evaluation drop per move
    │  • Flags blunders (>150cp) and mistakes (>50cp)
    │
    ▼
enrichAnalysisWithExplanations()       [src/lib/ai.ts]
    │  • For each blunder/mistake:
    │    calls OpenAI GPT-4o-mini with algorithmic prompt
    │  • Fallback rule-based explanation if no API key
    │
    ▼
AnalysisPanel renders results          [src/components/AnalysisPanel.tsx]
    │  • Click any blunder to see:
    │    - Move played vs best move
    │    - Evaluation drop bar
    │    - Algorithmic concept tag (Greedy/Minimax/Trade-off/Pruning)
    │    - AI explanation text
```

### Stockfish Integration

The engine runs in a **Web Worker** via the UCI protocol:

```
Browser → Worker: "position fen <fen>"
Browser → Worker: "go depth 15"
Worker  → Browser: "info score cp 42 pv e2e4 ..."
Worker  → Browser: "bestmove e2e4"
```

The `StockfishEngine` class in `src/lib/stockfish.ts` wraps this into a clean Promise-based API:

```ts
const { bestMove, score } = await engine.evaluate(fen)
```

### OpenAI Prompt Design

The prompt is engineered to tie chess mistakes to specific CS concepts:

```
"A chess player played Nxf7 but the engine recommends Nf3 (a 2.3-pawn blunder).
Explain this chess mistake in 2-3 sentences using ONE of:
- Greedy algorithm: choosing locally optimal over globally optimal
- Minimax: failing to anticipate opponent's best response
- Trade-offs: incorrectly valuing the exchange
- Pruning: missing that this line leads to a forced loss"
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | For auth | — | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For auth | — | Your Supabase anon key |
| `VITE_OPENAI_API_KEY` | For AI explanations | — | OpenAI API key |
| `VITE_STOCKFISH_DEPTH` | No | `15` | Engine search depth |
| `VITE_BLUNDER_THRESHOLD` | No | `150` | Centipawn drop for blunder |

> ⚠️ **Security**: The OpenAI key is exposed in the browser bundle. For production, proxy OpenAI calls through a serverless function (Supabase Edge Functions, Vercel, etc.).

---

## 🔒 Production Security

1. **OpenAI key**: Move to a Supabase Edge Function or Vercel serverless route
2. **Supabase RLS**: Already configured in `schema.sql`
3. **Rate limiting**: Add `pg_net` or API Gateway rate limits on analysis endpoints

---

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (custom chess theme)
- **Chess logic**: chess.js
- **Board UI**: react-chessboard
- **Engine**: Stockfish 16 (WASM via Web Worker)
- **Backend**: Supabase (auth + PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Fonts**: Cinzel (display) + IBM Plex Mono + Crimson Pro

---

## 📦 Build for Production

```bash
npm run build
npm run preview
```

The output is in `dist/`. Deploy to Vercel, Netlify, or any static host.

---

## 🧩 Extending AlgoChess

- **Puzzle mode**: Load tactical puzzles from lichess.org's free API
- **Multiplayer**: Use Supabase Realtime for live games
- **ELO rating**: Update `profiles.rating` after each game
- **Opening book**: Detect openings with `chess.js` PGN parsing
- **Lesson mode**: Teach specific algorithm concepts through curated positions
