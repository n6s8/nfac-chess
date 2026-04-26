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
    temperature: 0.7 
  });
};

const engineAnalyst = async (state: CouncilState) => {
  const blunders = state.analysis.filter(a => a.evaluationDiff <= -50);
  if (blunders.length === 0) {
    return { engineReport: "The player played flawlessly with no major centipawn drops. A masterpiece.", status: "Engine Analyst complete" };
  }
  
  const worst = blunders.sort((a, b) => a.evaluationDiff - b.evaluationDiff)[0];
  const report = `The player made ${blunders.length} mistakes. The worst was on move ${worst.move}, causing a ${worst.evaluationDiff} centipawn drop. The engine recommended ${worst.bestMove}.`;
  return { engineReport: report, status: "Engine Analyst complete" };
};

const csProfessor = async (state: CouncilState) => {
  if (!state.engineReport.includes("mistakes")) return { csReport: "Optimal algorithmic execution.", status: "CS Professor complete" };
  
  const llm = getLlm();
  const prompt = `You are a Computer Science Professor. Read this chess engine report: "${state.engineReport}".
  Classify the player's core mistake using strictly one of these algorithmic concepts:
  - Greedy Algorithm (taking material but ignoring global state)
  - Minimax Failure (ignoring the opponent's best response)
  - Pruning Error (cutting off calculation too early)
  Explain why in 2 sentences.`;
  
  const response = await llm.invoke(prompt);
  return { csReport: response.content as string, status: "CS Professor complete" };
};

const historianRag = async (state: CouncilState) => {
  const llm = getLlm();
  const db = `
  1. Kasparov vs Deep Blue (1997, Game 6) - Pruning Error / Paralyzed calculation.
  2. Spassky vs Fischer (1972, Game 3) - Minimax Failure / Miscalculated opponent aggression.
  3. Tal vs Botvinnik (1960) - Greedy Algorithm / Botvinnik took material but Tal got infinite dynamic compensation.
  4. Carlsen vs Caruana (2018) - Perfect execution / Unbreakable trade-offs.
  `;
  
  const prompt = `You are a Chess Historian performing Retrieval-Augmented Generation (RAG). 
  Look at this CS analysis of a player: "${state.csReport}".
  Find the ONE historical game from this database that perfectly matches the CS concept:
  ${db}
  Return exactly two sentences explaining the historical comparison.`;
  
  const response = await llm.invoke(prompt);
  return { historicalGame: response.content as string, status: "Historian complete" };
};

const emotionalCoach = async (state: CouncilState) => {
  if (!state.engineReport.includes("mistakes")) return { emotionalReport: "Ice in your veins. Absolute clarity.", status: "Emotional Coach complete" };
  const llm = getLlm();
  const prompt = `You are a psychological performance coach. Read this: "${state.csReport}". 
  Provide one dramatic, encouraging sentence diagnosing the player's mental state causing this error (e.g. "You suffered from tunnel vision").`;
  
  const response = await llm.invoke(prompt);
  return { emotionalReport: response.content as string, status: "Emotional Coach complete" };
};

const synthesizer = async (state: CouncilState) => {
  const llm = getLlm();
  const prompt = `You are the Lead Coach Synthesizer. Combine these 4 reports into a cohesive 3-paragraph markdown breakdown of the player's game:
  1. Engine Math: ${state.engineReport}
  2. Algorithmic Breakdown: ${state.csReport}
  3. Historical Match (RAG): ${state.historicalGame}
  4. Psychology: ${state.emotionalReport}
  
  Format it nicely with emojis and bolding. Write directly to the player.`;
  
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
