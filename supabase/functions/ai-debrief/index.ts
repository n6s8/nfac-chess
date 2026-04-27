/**
 * supabase/functions/ai-debrief/index.ts
 *
 * Runs the 5-node LangGraph Master Council pipeline server-side.
 * The GROQ_API_KEY secret never leaves Supabase — not exposed in the browser bundle.
 *
 * Deploy:
 *   supabase functions deploy ai-debrief
 *   supabase secrets set GROQ_API_KEY=gsk_...
 *
 * Called from the frontend via supabase.functions.invoke('ai-debrief', { body: { moves, analysis } })
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function groqChat(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  return (data.choices?.[0]?.message?.content as string) ?? ''
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) throw new Error('GROQ_API_KEY secret not set')

    const { mode, moves, analysis, move, bestMove } = await req.json()

    // ── Single Move Explanation Mode ──────────────────────────────────────────
    if (mode === 'explain-move') {
      const explanation = await groqChat(
        apiKey,
        'You are AlgoChess AI, a chess tutor who explains mistakes through algorithmic thinking. Focus on greedy choices, minimax, trade-offs, and positional consequences. Answer in no more than 2 short sentences.',
        `Explain why playing ${move} instead of ${bestMove} may be weaker. Keep it concise and use algorithmic thinking language.`
      )
      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Node 1: Engine Analyst (deterministic, no LLM) ────────────────────────
    const blunders = analysis.filter((a: any) => a.blunder === true)
    const mistakes = analysis.filter((a: any) => a.mistake === true && !a.blunder)
    const inaccuracies = analysis.filter((a: any) => !a.blunder && !a.mistake && a.evaluationDiff <= -20)
    const totalMoves = Math.ceil(moves.length / 2)

    let engineReport = `The player made ${totalMoves} moves. `
    if (blunders.length === 0 && mistakes.length === 0) {
      engineReport += `${inaccuracies.length} inaccuracy(s) detected but no blunders. `
      if (inaccuracies.length > 0) {
        const worst = [...inaccuracies].sort((a: any, b: any) => a.evaluationDiff - b.evaluationDiff)[0]
        engineReport += `Costliest: move ${worst.moveIndex + 1} (${worst.move}), losing ~${Math.abs(worst.evaluationDiff / 100).toFixed(1)} pawns.`
      } else {
        engineReport += 'Overall accuracy was high.'
      }
    } else {
      const worst = [...blunders, ...mistakes].sort((a: any, b: any) => a.evaluationDiff - b.evaluationDiff)[0]
      engineReport += `${blunders.length} blunder(s), ${mistakes.length} mistake(s). `
      engineReport += `Worst: move ${worst.moveIndex + 1} (${worst.move}), dropping ~${Math.abs(worst.evaluationDiff / 100).toFixed(1)} pawns. `
      if (worst.bestMove) engineReport += `Engine recommended ${worst.bestMove} instead.`
    }

    // ── Node 2: CS Professor ──────────────────────────────────────────────────
    const hasErrors = blunders.length > 0 || mistakes.length > 0
    let csReport: string
    if (!hasErrors) {
      csReport = 'The moves followed sound algorithmic principles: long-term structural gains and correct opponent response minimisation.'
    } else {
      csReport = await groqChat(
        apiKey,
        'You are a Computer Science Professor reviewing a chess game.',
        `Engine report: "${engineReport}"\nClassify the core mistake using one CS concept: Greedy Algorithm, Minimax Failure, or Pruning Error. Write 2 direct sentences. No emojis.`
      )
    }

    // ── Node 3: Historian RAG ─────────────────────────────────────────────────
    const knowledgeBase = `
1. Kasparov vs Deep Blue (1997, Game 6) — Pruning Error: paralyzed calculation under pressure.
2. Spassky vs Fischer (1972, Game 3) — Minimax Failure: underestimated opponent's aggression.
3. Tal vs Botvinnik (1960) — Greedy Algorithm: Botvinnik grabbed material and lost dynamic compensation.
4. Carlsen vs Caruana (2018) — Precise execution: controlled trade-offs under equal pressure.`

    const historicalGame = await groqChat(
      apiKey,
      'You are a Chess Historian using Retrieval-Augmented Generation.',
      `Analysis: "${csReport}"\nKnowledge base:${knowledgeBase}\nSelect the most relevant game. Write exactly 2 sentences explaining the parallel. Be specific. No emojis.`
    )

    // ── Node 4: Emotional Coach ───────────────────────────────────────────────
    let emotionalReport: string
    if (!hasErrors) {
      emotionalReport = 'Decision-making was consistent and composed. No signs of tunnel vision or time pressure errors.'
    } else {
      emotionalReport = await groqChat(
        apiKey,
        'You are a chess performance coach.',
        `Analysis: "${csReport}"\nWrite one direct sentence diagnosing the mental pattern. No emojis. No praise.`
      )
    }

    // ── Node 5: Synthesizer ───────────────────────────────────────────────────
    const finalDebrief = await groqChat(
      apiKey,
      'You are a lead chess coach writing a post-game debrief.',
      `Combine these 4 reports into 3 concise paragraphs written directly to the player:\n\nEngine: ${engineReport}\nCS Analysis: ${csReport}\nHistorical: ${historicalGame}\nMental: ${emotionalReport}\n\nRules: no emojis, no markdown headers, no bullets. Each paragraph under 4 sentences. Be honest. Plain prose.`
    )

    return new Response(
      JSON.stringify({ finalDebrief, engineReport, csReport, historicalGame, emotionalReport }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[ai-debrief]', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
