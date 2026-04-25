/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GROQ_API_KEY?: string
  readonly VITE_OPENAI_API_KEY?: string
  readonly VITE_STOCKFISH_DEPTH: string
  readonly VITE_BLUNDER_THRESHOLD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
