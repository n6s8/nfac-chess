# AlgoChess Architecture & Implementation Guide

AlgoChess is an interactive application serving as a pedagogical bridge between chess strategy and core computer science concepts. It provides dynamic evaluation pipelines using AI and deterministic algorithms, emphasizing high-performance client state management and scalable backend synchronization.

## Core Engineering Capabilities

* **Asynchronous Move Evaluation Loop**: Stockfish 16 is compiled via WebAssembly and isolated within a dedicated Web Worker, preventing main thread blocking while executing deep heuristic searches.
* **Deterministic Real-time Synchronization**: Built on top of Supabase Realtime, the multiplayer environment relies on strict FEN and PGN payload broadcasts to ensure synchronization between clients without desynchronization drift.
* **Algorithmic Heuristic Feedback**: Each move is piped through a heuristic classification algorithm to label the human player's decisions immediately as Greedy, Minimax, Trade-off, or Positional.
* **Post-game Pipelining**: After a match concludes, an aggregated analysis loops over the moves to compute evaluation drop-offs and requests context-aware explanations for blunders via the Groq/OpenAI APIs.
* **Dynamic Rating adjustments**: Includes robust single-player and multiplayer triggers that process structured Elo distribution on the backend.

## Architecture Deep Dive

### Stockfish Concurrency Model
The integration of a chess engine in a browser context requires careful handling of race conditions. The `StockfishEngine` class (`src/lib/stockfish.ts`) orchestrates communication with the worker. 

Due to the asynchronous nature of the UCI protocol, interrupting an evaluation search requires a synchronization lock. When an evaluation request is interrupted by the user, the dispatcher explicitly blocks until the engine acknowledges the stop command via the final standard output payload. This guarantees the search tree respects deterministic behavior and never bleeds old depth evaluations into the succeeding board state.

### Move Analysis Pipeline
The analysis pipeline acts as a background processing job mapping over a `moves` array:
1. Reconstruct logical board iterations using `chess.js`.
2. Extract the evaluation metric from Stockfish.
3. Compute the evaluation delta to flag structural mistakes.
4. Issue parallel network requests to an LLM provider to frame these mistakes using algorithmic theory (e.g., explaining a blunder as a "failure to evaluate the Minimax tree correctly").
5. Aggregate the findings into an overall player profile mapping the user's primary "Thinking Style" percentage composition.

### State Management & Multiplayer
The core game loops (`useGame.ts` and `useGameRoom.ts`) rely heavily on React's `useReducer` and `useMemo` hooks. This design intentionally treats the game state (`status`, `result`, `turn`, `fen`) as a deterministic finite state machine, significantly reducing the surface area for logic bugs during rollback, draw negotiations, or real-time network latency.

When multiplayer is initialized, clients establish a WebSocket layer with PostgreSQL utilizing custom Row Level Security (RLS) policies.

## Infrastructure & Technology Stack

* **Frontend Framework**: React 18 with TypeScript compiled via Vite. 
* **Database & Auth**: PostgreSQL managed via Supabase, including identity brokering and Row Level Security.
* **UI Foundation**: Tailwind CSS with tailored constraints to strictly enforce layout overflow control and hierarchy focal points across varied viewport specifications.
* **Chess Dependencies**: `chess.js` for legal move generation and `react-chessboard` for SVG node painting.
* **Third Party APIs**: Open-source implementations of LLM routing via `groq-sdk`.

## Local Development Initialization

1. Clone the repository and install dependency graphs.
   ```bash
   npm install
   ```

2. Port the Stockfish engine into the public directory for Web Worker access.
   ```bash
   npm run setup:stockfish
   ```

3. Provision the local environment file.
   ```bash
   cp .env.example .env.local
   ```
   Define your required keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY` or `VITE_GROQ_API_KEY`).

4. Hydrate the remote database. Load `supabase/schema.sql` into the Supabase SQL editor to create the necessary tables, indices, and backend stored procedure functions (e.g., `record_multiplayer_result`).

5. Start the local Vite development server.
   ```bash
   npm run dev
   ```

## Design Considerations & Scalability

* **API Exposure**: The Large Language Model tokens require a proxy mechanism for enterprise production. Do not serve keys down to the client bundle without implementing intermediary Edge Functions.
* **Stateless Persistence**: The system writes entire match logs directly to the RDBMS only at finite termination points (Checkmate, Resignation, or Time Flag), heavily reducing the write loads compared to per-move persistence.
* **Memory Limits**: The analysis iteration bounds `max Retries` and delays concurrent network loops against rate limits to prevent out-of-memory or timeout faults on low-tier mobile hardware.
