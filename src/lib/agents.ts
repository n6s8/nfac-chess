import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import type { ChessMove } from "@/types";

export const CouncilStateAnnotation = Annotation.Root({
  moves: Annotation<ChessMove[]>({ reducer: (x, y) => y, default: () => [] }),
  analysis: Annotation<any[]>({ reducer: (x, y) => y, default: () => [] }),
  engineReport: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  csReport: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  historicalGame: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  emotionalReport: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  finalDebrief: Annotation<string>({ reducer: (x, y) => y, default: () => "" }),
  status: Annotation<string>({ reducer: (x, y) => y, default: () => "starting" }),
});

export type CouncilState = typeof CouncilStateAnnotation.State;

const getLlm = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing LLM API Key");
  return new ChatGroq({
    apiKey,
    model: "llama-3.1-8b-instant",
    temperature: 0.5,
  });
};

const engineAnalyst = async (state: CouncilState) => {
  const totalMoves = state.moves.filter((_, i) => i % 2 === 0).length;
  const blunders = state.analysis.filter(a => a.blunder === true);
  const mistakes = state.analysis.filter(a => a.mistake === true && !a.blunder);
  const inaccuracies = state.analysis.filter(
    a => !a.blunder && !a.mistake && a.evaluationDiff <= -20
  );

  let report = `The player made ${totalMoves} moves in this game. `;

  if (blunders.length === 0 && mistakes.length === 0) {
    report += `There were ${inaccuracies.length} inaccuracy(s) but no outright blunders or mistakes detected. `;
    if (inaccuracies.length > 0) {
      const worst = [...inaccuracies].sort((a, b) => a.evaluationDiff - b.evaluationDiff)[0];
      report += `The most costly inaccuracy was on move ${worst.moveIndex + 1} (${worst.move}), losing approximately ${Math.abs(worst.evaluationDiff / 100).toFixed(1)} pawns.`;
    } else {
      report += `Overall accuracy was high throughout the game.`;
    }
  } else {
    const worst = [...blunders, ...mistakes].sort((a, b) => a.evaluationDiff - b.evaluationDiff)[0];
    report += `There were ${blunders.length} blunder(s) and ${mistakes.length} mistake(s). `;
    report += `The worst was move ${worst.moveIndex + 1} (${worst.move}), dropping approximately ${Math.abs(worst.evaluationDiff / 100).toFixed(1)} pawns. `;
    if (worst.bestMove) report += `The engine recommended ${worst.bestMove} instead.`;
  }

  return { engineReport: report, status: "Engine Analyst complete" };
};

const csProfessor = async (state: CouncilState) => {
  const hasErrors = state.engineReport.includes("blunder") || state.engineReport.includes("mistake");

  if (!hasErrors) {
    return {
      csReport: "The moves followed sound algorithmic principles: prioritizing long-term structural gains over short-term tactics and correctly minimizing the opponent's best responses.",
      status: "CS Professor complete",
    };
  }

  const llm = getLlm();
  const prompt = `You are a Computer Science Professor reviewing a chess game. Read this engine report: "${state.engineReport}".
Classify the player's core mistake using exactly one of these CS concepts:
- Greedy Algorithm (took material but ignored global board state)
- Minimax Failure (did not account for the opponent's strongest reply)
- Pruning Error (stopped calculating moves too early)
Write 2 direct sentences. No emojis. No filler praise.`;

  const response = await llm.invoke(prompt);
  return { csReport: response.content as string, status: "CS Professor complete" };
};

const historianRag = async (state: CouncilState) => {
  const llm = getLlm();
  const db = `
1. Kasparov vs Deep Blue (1997, Game 6) - Pruning Error — paralyzed calculation under pressure.
2. Spassky vs Fischer (1972, Game 3) - Minimax Failure — underestimated opponent's aggression.
3. Tal vs Botvinnik (1960) - Greedy Algorithm — Botvinnik grabbed material and lost dynamic compensation.
4. Carlsen vs Caruana (2018) - Precise execution — controlled trade-offs under equal pressure.
`;

  const prompt = `You are a Chess Historian using Retrieval-Augmented Generation. 
Given this analysis: "${state.csReport}"
Select the single most relevant historical game from this database:
${db}
Write exactly 2 sentences explaining the parallel. Be specific. No emojis. No filler.`;

  const response = await llm.invoke(prompt);
  return { historicalGame: response.content as string, status: "Historian complete" };
};

const emotionalCoach = async (state: CouncilState) => {
  const hasErrors = state.engineReport.includes("blunder") || state.engineReport.includes("mistake");

  if (!hasErrors) {
    return {
      emotionalReport: "Decision-making was consistent and composed throughout the game. No signs of tunnel vision or time pressure errors.",
      status: "Emotional Coach complete",
    };
  }

  const llm = getLlm();
  const prompt = `You are a chess performance coach. Based on this analysis: "${state.csReport}"
Write one direct sentence diagnosing the mental pattern behind the error. Examples: "You suffered from tunnel vision on the kingside" or "Time pressure led to shallow calculation." No emojis. No praise.`;

  const response = await llm.invoke(prompt);
  return { emotionalReport: response.content as string, status: "Emotional Coach complete" };
};

const synthesizer = async (state: CouncilState) => {
  const llm = getLlm();
  const prompt = `You are a lead chess coach writing a post-game debrief. Combine these 4 reports into a concise review of 3 paragraphs written directly to the player:

Engine Report: ${state.engineReport}
CS Analysis: ${state.csReport}
Historical Reference: ${state.historicalGame}
Mental Pattern: ${state.emotionalReport}

Rules:
- No emojis, no markdown headers, no bullet points
- Each paragraph must be under 4 sentences
- Be honest and direct — do not add generic praise if the player made mistakes
- Do not repeat the same information across paragraphs
- Write in plain prose`;

  const response = await llm.invoke(prompt);
  return { finalDebrief: response.content as string, status: "Synthesizer complete" };
};

export function createCouncilGraph() {
  const builder = new StateGraph(CouncilStateAnnotation)
    .addNode("engineAnalyst", engineAnalyst)
    .addNode("csProfessor", csProfessor)
    .addNode("historianRag", historianRag)
    .addNode("emotionalCoach", emotionalCoach)
    .addNode("synthesizer", synthesizer)
    .addEdge(START, "engineAnalyst")
    .addEdge("engineAnalyst", "csProfessor")
    .addEdge("csProfessor", "historianRag")
    .addEdge("historianRag", "emotionalCoach")
    .addEdge("emotionalCoach", "synthesizer")
    .addEdge("synthesizer", END);

  return builder.compile();
}
