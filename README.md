# AlgoChess

AlgoChess is a chess platform that uses computer science as a lens for game analysis. It is built for students, developers, and competitive players who want to understand not just what mistake they made, but what algorithmic failure caused it — greedy local optimization, failure to evaluate the opponent's best reply (minimax), premature search pruning, or structural positional neglect.

The system runs a real-time Stockfish evaluation engine in the browser, a multi-agent LangGraph pipeline for post-game debrief, a retrieval-augmented generation (RAG) historian that maps your play to historical grandmaster games, and a full multiplayer suite built on Supabase Realtime.

---

## Live Deployment

| | |
|---|---|
| **Production URL** | https://nfac-chess.vercel.app |
| **Repository** | https://github.com/n6s8/nfac-chess |
| **Hosting** | Vercel (static, auto-deploy on push to main) |
| **Database** | Supabase PostgreSQL — live, connected, RLS enabled |
| **Backend API** | Supabase Edge Functions (Secure API proxy, Stripe Webhooks) |
| **Auth** | Supabase Auth — email/password, session-based |
| **Monetization** | Stripe Checkout & Webhooks (Test Mode) |
| **AI Inference** | Groq API — llama-3.1-8b-instant, live |
| **Chess Engine** | Stockfish 16 WASM — runs in browser Web Worker, no server |

All external services (Vercel, Supabase, Groq, Stripe) are fully connected and operational in production. The multiplayer rooms, ELO updates, game history, virtual economy, and AI debriefs all write to and read from the live Supabase database. Server-side secrets are securely managed in Supabase Edge Functions.

---

## What Was Built

| Area | Description |
|---|---|
| Single-player vs Engine | Play against Stockfish at 4 difficulty levels (Beginner to Master). Each move is classified in real time using a heuristic algorithm. |
| Post-game Analysis | Full Stockfish re-analysis of every move. Blunders and mistakes are explained through CS theory by a Groq LLM. |
| Multi-agent Debrief | A 5-node LangGraph graph runs in sequence: Engine Analyst, CS Professor, Historian (RAG), Emotional Coach, Synthesizer. Produces a short, honest text debrief. |
| Multiplayer | Real-time rooms via Supabase Realtime. Clock, draw negotiations, chat, and ELO updates persist to PostgreSQL. |
| Friends and Challenges | Friend request system with search by username. Accepted friends can be challenged directly from the profile page, which creates a room and sends a notification. |
| Rating System | ELO-style rating adjustments after every game, shown as a delta chip on the board after the result. |
| Profile and History | Full game history with replay support. Country/city-based leaderboard. |
| Economy & Store | Server-side coin economy (earn coins by playing). Purchase board themes in the Store. |
| Monetization (Pro) | Fully integrated Stripe Checkout to upgrade to Pro, unlocking the Master Council debrief and exclusive themes. |

---

## Architecture

### System Overview

```mermaid
flowchart TD
    subgraph Browser["Browser (React 18 + Vite)"]
        UI["Game UI\n(React Components)"]
        Hook_SP["useGame.ts\n(single-player state machine)"]
        Hook_MP["useGameRoom.ts\n(multiplayer state machine)"]
        ChessJS["chess.js\n(move validation, FEN/PGN)"]
        Board["react-chessboard\n(SVG rendering)"]

        subgraph Worker["Web Worker"]
            SF["Stockfish 16 (WASM)\nUCI protocol"]
        end

        subgraph Analysis["Post-game Analysis"]
            AP["analyzeGame()\nStockfish per-move scoring"]
            LLM1["Groq LLM\nCS-framed explanations"]
            Council["LangGraph\nMaster Council (5 agents)"]
        end
    end

    subgraph Supabase["Supabase (Backend)"]
        Auth["Auth\n(email/password)"]
        DB["PostgreSQL\n(profiles, games, game_rooms)"]
        RT["Realtime\n(WebSocket per room)"]
        RPC["Stored Procedures\n(economy, transactions)"]
        Edge["Edge Functions\n(AI Proxy, Stripe Webhook)"]
    end

    UI --> Hook_SP
    UI --> Hook_MP
    Hook_SP --> ChessJS
    Hook_MP --> ChessJS
    ChessJS --> Board
    Hook_SP -- "evaluate(fen, depth)" --> SF
    Hook_MP -- "evaluate(fen, depth)" --> SF
    SF -- "bestmove + score" --> Hook_SP
    SF -- "bestmove + score" --> Hook_MP
    Hook_SP --> AP
    Hook_MP --> AP
    AP --> SF
    AP --> LLM1
    LLM1 --> Council
    Hook_SP -- "read/write" --> DB
    Hook_MP -- "read/write" --> DB
    Hook_MP -- "subscribe" --> RT
    RT -- "postgres_changes" --> Hook_MP
    DB --> RPC
    UI --> Auth
```

---

### Post-game Analysis Pipeline

After a game ends, `analyzeGame()` iterates over every move and evaluates each resulting position with Stockfish. Then `enrichAnalysisWithExplanations()` sends the flagged mistakes to Groq for CS-framed explanations.

```mermaid
flowchart LR
    Moves["moves[]"]
    Loop["For each move:\nReconstruct board with chess.js"]
    SF2["Stockfish.evaluate\nfen, depth=16"]
    Delta["Compute evaluationDiff\n(centipawns)"]
    Flag{"Flag move"}
    Blunder["Blunder\ndiff <= -150cp"]
    Mistake["Mistake\ndiff <= -50cp"]
    Good["Inaccuracy / Good\nno flag"]
    Enrich["enrichAnalysisWithExplanations\nbatch Groq calls"]
    LLM2["Groq LLM\nllama-3.1-8b-instant\nClassify as Greedy / Minimax /\nPruning / Positional"]
    Profile["ThinkingStyle Profile\ngreedy% minimax% tradeoff% positional%"]

    Moves --> Loop --> SF2 --> Delta --> Flag
    Flag --> Blunder
    Flag --> Mistake
    Flag --> Good
    Blunder --> Enrich
    Mistake --> Enrich
    Enrich --> LLM2 --> Profile
```

---

### LangGraph Multi-agent Pipeline (Master Council)

Five agents run in a strict sequential directed acyclic graph. No branching. Each node reads the full state produced so far, adds its own report, and passes the enriched state to the next node.

```mermaid
flowchart TD
    START(["START\nmoves[] + analysis[]"])

    subgraph A["Node 1: engineAnalyst"]
        A1["Count blunders, mistakes, inaccuracies\nfrom analysis[]"]
        A2["Produce factual engine report\n(no LLM, deterministic)"]
        A1 --> A2
    end

    subgraph B["Node 2: csProfessor"]
        B1{"Are there\nblunders or mistakes?"}
        B2["Call Groq LLM\nClassify root cause:\nGreedy / Minimax Failure / Pruning Error"]
        B3["Return static:\n'Sound algorithmic execution'"]
        B1 -->|yes| B2
        B1 -->|no| B3
    end

    subgraph C["Node 3: historianRag (RAG)"]
        C1["Retrieve from knowledge base\n4 canonical grandmaster games\ntied to CS failure types"]
        C2["Call Groq LLM\nMap csReport to best matching game\nExplain the parallel in 2 sentences"]
        C1 --> C2
    end

    subgraph D["Node 4: emotionalCoach"]
        D1{"Errors\nexist?"}
        D2["Call Groq LLM\nDiagnose cognitive pattern\n(tunnel vision, time pressure, etc.)"]
        D3["Return static:\n'Consistent and composed'"]
        D1 -->|yes| D2
        D1 -->|no| D3
    end

    subgraph E["Node 5: synthesizer"]
        E1["Call Groq LLM\nCombine all 4 reports\ninto 3 plain paragraphs"]
        E2["Output finalDebrief\nNo emojis / No headers / Direct prose"]
        E1 --> E2
    end

    END_(["END\nfinalDebrief string"])

    START --> A --> B --> C --> D --> E --> END_
```

---

### RAG: How the Historian Agent Retrieves

The RAG in this system is prompt-based retrieval, not vector search. The knowledge base is a fixed set of 4 annotated games injected directly into the Groq prompt. The LLM performs the semantic matching.

```mermaid
flowchart LR
    subgraph KB["Knowledge Base (in-memory)"]
        G1["Kasparov vs Deep Blue 1997\nPruning Error"]
        G2["Spassky vs Fischer 1972\nMinimax Failure"]
        G3["Tal vs Botvinnik 1960\nGreedy Algorithm"]
        G4["Carlsen vs Caruana 2018\nOptimal Execution"]
    end

    csReport["csReport\n(CS failure classification)"]
    Prompt["Construct prompt:\ncsReport + full knowledge base"]
    Groq["Groq LLM\nSelect most relevant game\nExplain parallel in 2 sentences"]
    Out["historicalGame\n(2 sentence comparison)"]

    csReport --> Prompt
    KB --> Prompt
    Prompt --> Groq --> Out
```

> The knowledge base is injected wholesale. The LLM acts as the retriever and ranker. For production scale (hundreds of games), replace with pgvector semantic search and an embedding model.

---

### Stockfish Concurrency Model

Stockfish runs in a Web Worker and speaks UCI. Evaluations are serialized — only one evaluation runs at a time.

```mermaid
sequenceDiagram
    participant Hook as useGame / useGameRoom
    participant Engine as StockfishEngine
    participant Worker as Web Worker (Stockfish WASM)

    Hook->>Engine: evaluate(fen, depth, skill?, elo?)
    Engine->>Worker: postMessage("stop")
    Worker-->>Engine: (search halts)
    Engine->>Worker: postMessage("isready")
    Worker-->>Engine: postMessage("readyok")
    Engine->>Worker: postMessage("position fen <fen>")
    Engine->>Worker: postMessage("setoption Skill Level <n>")
    Engine->>Worker: postMessage("go depth <n>")
    Worker-->>Engine: postMessage("info depth ... score cp ...")
    Worker-->>Engine: postMessage("bestmove <uci>")
    Engine-->>Hook: resolve({ score, bestMove })
```

---

### Multiplayer State and Clock

```mermaid
stateDiagram-v2
    [*] --> waiting: Room created\nlast_move_at = null\nclock frozen

    waiting --> lobby: Second player joins\nboth profiles visible

    lobby --> playing: White makes first move\nlast_move_at set\nclock starts

    lobby --> abandoned: 5s grace period expires\nno move made

    playing --> playing: Each move\ndeducts elapsed from active clock\nupdates last_move_at

    playing --> finished: Checkmate / Resign / Draw / Time flag

    finished --> [*]
    abandoned --> [*]
```

---

### Database Schema

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        text email
        text username
        text country
        text city
        int rating
        int games_won
        int games_lost
        int games_drawn
    }

    GAME_ROOMS {
        uuid id PK
        uuid created_by FK
        uuid white_player_id FK
        uuid black_player_id FK
        text fen
        text pgn
        jsonb moves
        text status
        text turn
        text result
        text time_control
        bigint white_time_ms
        bigint black_time_ms
        timestamptz last_move_at
        jsonb chat_messages
    }

    GAMES {
        uuid id PK
        uuid user_id FK
        uuid room_id FK
        text mode
        text pgn
        jsonb moves
        text result
        jsonb analysis
        uuid winner_id FK
        uuid loser_id FK
    }

    FRIENDSHIPS {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        text status
    }

    FRIEND_CHALLENGES {
        uuid id PK
        uuid from_user_id FK
        uuid to_user_id FK
        uuid room_id FK
        text status
    }

    PROFILES ||--o{ GAME_ROOMS : "creates / plays"
    PROFILES ||--o{ GAMES : "plays"
    GAME_ROOMS ||--o| GAMES : "produces"
    PROFILES ||--o{ FRIENDSHIPS : "has"
    PROFILES ||--o{ FRIEND_CHALLENGES : "sends / receives"
    FRIEND_CHALLENGES }o--|| GAME_ROOMS : "links to"
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v3, custom CSS variables for theming |
| Chess Engine | Stockfish 16 (WASM) via Web Worker, UCI protocol |
| Chess Logic | chess.js (move validation, FEN, PGN) |
| Board UI | react-chessboard |
| Database | Supabase (PostgreSQL, Row Level Security, Realtime) |
| Auth | Supabase Auth (email/password) |
| AI Inference | Groq API, llama-3.1-8b-instant |
| Multi-agent | LangChain LangGraph (StateGraph, sequential DAG) |
| Routing | React Router v6 |

---

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is sufficient)
- A Groq API key (free tier is sufficient for development)

### Steps

**1. Install dependencies**

```bash
npm install
```

**2. Copy the engine binary into the public directory**

```bash
npm run setup:stockfish
```

This copies Stockfish WASM files from `node_modules/stockfish` into `public/` so the Web Worker can load them at runtime.

**3. Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# For basic single-player move analysis
VITE_GROQ_API_KEY=gsk_...

# Stripe public keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRICE_ID=price_...
```

**Note on Security:** Sensitive keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the main `GROQ_API_KEY` for the Master Council) are stored securely in **Supabase Secrets** and are only accessed by Edge Functions. They are never exposed to the browser.

**4. Apply the database schema**

Open the Supabase SQL editor and run the contents of `supabase/schema.sql` in full. This creates all tables, indices, RLS policies, triggers, and the `record_multiplayer_result` stored procedure.

If you are updating an existing deployment, the schema uses `create table if not exists` and `alter table ... add column if not exists` throughout. It is safe to re-run.

**5. Start the development server**

```bash
npm run dev
```

The app runs on `http://localhost:5173` by default.

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `VITE_GROQ_API_KEY` | No* | Groq API key for LLM features |
| `VITE_OPENAI_API_KEY` | No* | OpenAI key (fallback for Groq) |

*At least one LLM key is required for move explanations and the multi-agent debrief.

---

## Project Structure

```
src/
├── components/
│   ├── AnalysisPanel.tsx       Post-game analysis UI, worst moves, master council trigger
│   ├── ChessBoard.tsx          Board rendering, move interaction, resign/draw controls
│   ├── MasterCouncilPanel.tsx  Multi-agent debrief UI and status display
│   ├── MoveHistory.tsx         Scrollable move list with analysis overlay
│   └── PreferenceToolbar.tsx   Board theme, engine level, focus mode controls
├── hooks/
│   ├── useGame.ts              Single-player state machine, Stockfish loop, rating updates
│   ├── useGameRoom.ts          Multiplayer state, clock, draw negotiations, Realtime sync
│   └── useFriends.ts           Friends list, pending requests, challenge notifications
├── lib/
│   ├── agents.ts               LangGraph graph definition (5-node sequential pipeline)
│   ├── ai.ts                   Move analysis orchestration, Groq enrichment
│   ├── chess.ts                chess.js wrappers (makeMove, getFen, getGameResult, etc.)
│   ├── stockfish.ts            StockfishEngine class, UCI protocol, Web Worker bridge
│   ├── supabase.ts             All database operations, auth, friends, challenges
│   └── time-controls.ts        Time control configs (bullet, blitz, rapid, classical)
├── pages/
│   ├── Game.tsx                Single-player layout, player cards, eval bar
│   ├── MultiplayerRoom.tsx     Multiplayer layout, lobby, countdown, clock bars
│   ├── Profile.tsx             User profile, game history, friends tab, challenges
│   ├── Friends.tsx             Friend search, requests, challenge flow
│   ├── Leaderboard.tsx         Country/city-filtered rating leaderboard
│   └── Replay.tsx              Move-by-move game replay from history
└── types/
    └── index.ts                All shared TypeScript interfaces and type aliases
```

---

## Known Limitations

**RAG knowledge base**: The historian agent uses a fixed 4-game knowledge base injected into the prompt. It is not a semantic vector search. Results are plausible but not verifiably accurate. Extending this to a real retrieval system would require a vector store and an embedding model.

**Clock authority**: Time enforcement runs on the room creator's browser. If the creator disconnects mid-game, the clock stops. A production implementation would move this to a server-side cron or Edge Function.

**ELO simplification**: The current rating system applies fixed deltas (+15 win, -15 loss, 0 draw for single-player; +16/-16/+4 for multiplayer via stored procedure). It does not account for opponent strength. Replace with a proper ELO formula if ranking fidelity is a requirement.
