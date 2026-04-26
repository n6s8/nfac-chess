export type PlayerColor = 'white' | 'black'
export type GameMode = 'ai' | 'multiplayer' | 'replay'
export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type MistakeType = 'greedy' | 'minimax' | 'tradeoff' | 'positional'
export type BoardTheme = 'classic' | 'neon' | 'minimal'
export type ColorMode = 'dark' | 'light'
export type EngineLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master'
export type TimeControlKey = 'bullet' | 'blitz' | 'rapid' | 'classical'

export interface RoomChatMessage {
  id: string
  sender_id: string
  sender_label: string
  message: string
  created_at: string
}

export interface ChessMove {
  san: string
  from: string
  to: string
  fen: string
  promotion?: string
  color?: PlayerColor
  uci?: string
  insight?: MoveInsight | null
}

export interface Evaluation {
  score: number
  mate?: number
  bestMove: string
  bestMoveSan?: string
}

export interface MoveInsight {
  move: string
  type: MistakeType
  explanation: string
  severity: number
  bestMove?: string
  evaluationDiff?: number
  moveIndex?: number
}

export interface MoveAnalysis extends MoveInsight {
  moveIndex: number
  fen: string
  scoreBefore: number
  scoreAfter: number
  evaluationDiff: number
  bestMove: string
  bestMoveUci: string
  mistake: boolean
  blunder: boolean
}

export interface LiveMovePreview {
  fen: string
  evaluation: Evaluation
}

export type GameResult = PlayerColor | 'draw' | null

export type GameStatus =
  | 'idle'
  | 'waiting'
  | 'playing'
  | 'checking'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'analyzing'
  | 'analyzed'

export interface GameState {
  fen: string
  moves: ChessMove[]
  status: GameStatus
  result: GameResult
  playerColor: PlayerColor
  isAiThinking: boolean
  analysis: MoveAnalysis[]
  isAnalyzing: boolean
  analysisProgress: number
  currentEval: number
  liveInsight: MoveInsight | null
  mode: GameMode
}

export interface ProfileRecord {
  id: string
  email?: string | null
  username?: string | null
  country?: string | null
  city?: string | null
  rating: number
  games_won: number
  games_lost: number
  games_drawn: number
  is_pro?: boolean
  coins?: number
  owned_themes?: string[]
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  created_at?: string
}

export interface AuthUser extends ProfileRecord {
  email: string
}

export interface GameRecord {
  id?: string
  user_id?: string | null
  room_id?: string | null
  mode: GameMode
  pgn: string
  moves: string[] | ChessMove[]
  result: GameResult
  analysis?: MoveAnalysis[] | null
  winner_id?: string | null
  loser_id?: string | null
  white_player_id?: string | null
  black_player_id?: string | null
  white_player_email?: string | null
  black_player_email?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string
}

export interface GameRoomRecord {
  id: string
  created_by: string
  white_player_id: string | null
  black_player_id: string | null
  white_player_email?: string | null
  black_player_email?: string | null
  fen: string
  pgn: string
  moves: ChessMove[]
  status: RoomStatus
  turn: PlayerColor
  result: GameResult
  winner_id: string | null
  time_control?: TimeControlKey
  white_time_ms?: number | null
  black_time_ms?: number | null
  last_move_at?: string | null
  chat_messages?: RoomChatMessage[]
  created_at: string
  updated_at: string
}

export interface ThemePreferences {
  boardTheme: BoardTheme
  colorMode: ColorMode
  algorithmicMode: boolean
  sidebarCollapsed: boolean
  focusMode: boolean
  engineLevel: EngineLevel
}
