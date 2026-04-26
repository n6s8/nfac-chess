# Objective: Achieve 'Великий' Level & Impress Judges

This plan addresses the direct feedback provided to elevate AlgoChess from a strong "Level 3" to a definitive "Level 4" (Великий) for the hackathon, while adding "wow" factors to impress the judges.

## User Review Required

> [!IMPORTANT]
> To implement the Stripe integration, you will need a Stripe account (free to create). We will use Stripe Test Mode keys so no real money is involved, but the flow will be 100% real. Do you have a Stripe account ready, or should we implement a "mock" checkout flow that visually simulates it without a backend?

> [!TIP]
> The feedback mentioned the git history looks "vibe-coded" (only 9 commits). Going forward, I will make sure we create smaller, atomic commits for every feature we add to build a healthier commit graph before the deadline.

## Proposed Changes

### 1. Monetization: "Upgrade to Pro" (Stripe)
The most critical missing piece for "Великий" is the business mindset/monetization layer.
- **Frontend**: Add an eye-catching "Upgrade to Pro" button in the navigation header.
- **Stripe Checkout**: Create a Stripe Checkout session (for a $5/mo subscription or one-time $10 unlock).
- **Backend (Supabase)**: Add an `is_pro` boolean to the `PROFILES` table.
- **Features**: Pro users get an exclusive "Pro" badge next to their name in multiplayer, an exclusive Pro-only board theme in the shop, and unlimited AI debriefs (free tier limited to 3/day).

### 2. Security & Architecture: Supabase Edge Functions
Moving the LLM key out of the frontend bundle shows senior-level architectural maturity.
- **Edge Function**: Create a Deno-based Supabase Edge Function (`analyze-game`).
- **Secret Management**: Store the `GROQ_API_KEY` securely in Supabase Secrets.
- **Frontend Refactor**: Update `src/lib/ai.ts` and LangGraph to send the game state to our Edge Function instead of calling the Groq API directly from the browser.

### 3. Server-Side Economy Migration
The Shop exists, but coins are currently stored in `localStorage`. To make it a "real" product:
- **Database**: Add `coins` (int) and `owned_themes` (text[]) to the `PROFILES` table in Supabase.
- **RPC/Triggers**: Update the `record_multiplayer_result` stored procedure so winning a match automatically credits coins directly in the database securely.
- **Frontend**: Connect `Shop.tsx` to read/write from Supabase instead of local storage.

### 4. Visual Polish & README Updates
- **README**: Add screenshots of the AI Master Council, the Shop, and the Multiplayer room.
- **UI Aesthetics**: Add subtle micro-animations (framer-motion or CSS transitions) to the Shop cards and the post-game AI debrief panel to ensure the app looks incredibly premium.

---

## Verification Plan

### Automated/Manual Testing
1. **Stripe**: Click "Upgrade", enter Stripe test card (`4242 4242...`), verify redirection back to app, and verify `is_pro` updates in Supabase.
2. **Edge Function**: Play a game against the engine, trigger analysis, verify the Network tab shows a call to `my-project.supabase.co/functions/v1/analyze-game` instead of `api.groq.com`, ensuring the key is completely hidden.
3. **Economy**: Win a multiplayer game against a second tab, verify coins increase in the database and unlock a premium theme in the Shop.
