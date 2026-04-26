import { createClient } from '@supabase/supabase-js'
import { INITIAL_FEN } from './chess'
import { getTimeControlConfig } from './time-controls'
import type {
  AuthUser,
  ChessMove,
  GameRecord,
  GameResult,
  GameRoomRecord,
  MoveAnalysis,
  ProfileRecord,
  RoomChatMessage,
  RoomStatus,
  TimeControlKey,
} from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or .env.local.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured in this environment.')
  }
}

function normalizeProfile(record: Record<string, unknown>): ProfileRecord {
  return {
    id: String(record.id),
    email: typeof record.email === 'string' ? record.email : null,
    username: typeof record.username === 'string' ? record.username : null,
    country: typeof record.country === 'string' ? record.country : null,
    city: typeof record.city === 'string' ? record.city : null,
    rating: typeof record.rating === 'number' ? record.rating : 1200,
    games_won: typeof record.games_won === 'number' ? record.games_won : 0,
    games_lost: typeof record.games_lost === 'number' ? record.games_lost : 0,
    games_drawn: typeof record.games_drawn === 'number' ? record.games_drawn : 0,
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
  }
}

function normalizeRoomRecord(record: Record<string, unknown>): GameRoomRecord {
  return {
    id: String(record.id),
    created_by: String(record.created_by),
    white_player_id: typeof record.white_player_id === 'string' ? record.white_player_id : null,
    black_player_id: typeof record.black_player_id === 'string' ? record.black_player_id : null,
    white_player_email:
      typeof record.white_player_email === 'string' ? record.white_player_email : null,
    black_player_email:
      typeof record.black_player_email === 'string' ? record.black_player_email : null,
    fen: typeof record.fen === 'string' ? record.fen : INITIAL_FEN,
    pgn: typeof record.pgn === 'string' ? record.pgn : '',
    moves: Array.isArray(record.moves) ? (record.moves as ChessMove[]) : [],
    status: (record.status as RoomStatus) ?? 'waiting',
    turn: record.turn === 'black' ? 'black' : 'white',
    result: (record.result as GameResult) ?? null,
    winner_id: typeof record.winner_id === 'string' ? record.winner_id : null,
    time_control: (record.time_control as TimeControlKey) ?? 'blitz',
    white_time_ms: typeof record.white_time_ms === 'number' ? record.white_time_ms : null,
    black_time_ms: typeof record.black_time_ms === 'number' ? record.black_time_ms : null,
    last_move_at: typeof record.last_move_at === 'string' ? record.last_move_at : null,
    chat_messages: Array.isArray(record.chat_messages)
      ? (record.chat_messages as RoomChatMessage[])
      : [],
    created_at: typeof record.created_at === 'string' ? record.created_at : '',
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : '',
  }
}

function normalizeGameRecord(record: Record<string, unknown>): GameRecord {
  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    user_id: typeof record.user_id === 'string' ? record.user_id : null,
    room_id: typeof record.room_id === 'string' ? record.room_id : null,
    mode: (record.mode as GameRecord['mode']) ?? 'ai',
    pgn: typeof record.pgn === 'string' ? record.pgn : '',
    moves: Array.isArray(record.moves)
      ? (record.moves as string[] | ChessMove[])
      : [],
    result: (record.result as GameResult) ?? null,
    analysis: Array.isArray(record.analysis) ? (record.analysis as MoveAnalysis[]) : null,
    winner_id: typeof record.winner_id === 'string' ? record.winner_id : null,
    loser_id: typeof record.loser_id === 'string' ? record.loser_id : null,
    white_player_id:
      typeof record.white_player_id === 'string' ? record.white_player_id : null,
    black_player_id:
      typeof record.black_player_id === 'string' ? record.black_player_id : null,
    white_player_email:
      typeof record.white_player_email === 'string' ? record.white_player_email : null,
    black_player_email:
      typeof record.black_player_email === 'string' ? record.black_player_email : null,
    metadata:
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as Record<string, unknown>)
        : null,
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
  }
}

export async function signUp(email: string, password: string, country?: string, city?: string) {
  requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        country: country ?? null,
        city: city ?? null,
      },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  requireSupabase()
  let resolvedEmail = email

  if (!email.includes('@')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', email)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile?.email) {
      throw new Error('No account was found for that username.')
    }

    resolvedEmail = profile.email
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  requireSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  if (!isSupabaseConfigured) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ? normalizeProfile(data) : null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) return null

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) return null

  const profile = await getProfile(user.id).catch(() => null)

  return {
    id: user.id,
    email: user.email ?? '',
    username: profile?.username ?? null,
    country: profile?.country ?? null,
    city: profile?.city ?? null,
    rating: profile?.rating ?? 1200,
    games_won: profile?.games_won ?? 0,
    games_lost: profile?.games_lost ?? 0,
    games_drawn: profile?.games_drawn ?? 0,
    created_at: profile?.created_at,
  }
}

export async function upsertProfile(
  profile: Pick<ProfileRecord, 'id'> & Partial<ProfileRecord>
): Promise<ProfileRecord> {
  requireSupabase()

  const payload: Record<string, unknown> = {
    id: profile.id,
    email: profile.email ?? null,
    username: profile.username ?? null,
    country: profile.country ?? null,
    city: profile.city ?? null,
  }

  // Include rating and game stats if provided
  if (profile.rating !== undefined) payload.rating = profile.rating
  if (profile.games_won !== undefined) payload.games_won = profile.games_won
  if (profile.games_lost !== undefined) payload.games_lost = profile.games_lost
  if (profile.games_drawn !== undefined) payload.games_drawn = profile.games_drawn

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select('*')
    .single()

  if (error) throw error
  return normalizeProfile(data)
}

export async function listLeaderboard(
  country?: string | null,
  city?: string | null
): Promise<ProfileRecord[]> {
  if (!isSupabaseConfigured) return []

  let query = supabase.from('profiles').select('*').order('rating', { ascending: false }).limit(50)

  if (country && country !== 'All') {
    query = query.eq('country', country)
  }

  if (city && city !== 'All') {
    query = query.eq('city', city)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((item) => normalizeProfile(item))
}

export async function listCountries(): Promise<string[]> {
  if (!isSupabaseConfigured) return ['All', 'Kazakhstan']

  const { data, error } = await supabase.from('profiles').select('country')
  if (error) throw error

  const countries = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.country)
        .filter((country): country is string => Boolean(country))
    )
  ).sort((left, right) => left.localeCompare(right))

  return ['All', ...countries]
}

export async function listCities(country?: string | null): Promise<string[]> {
  if (!isSupabaseConfigured) return ['All']

  let query = supabase.from('profiles').select('city')

  if (country && country !== 'All') {
    query = query.eq('country', country)
  }

  const { data, error } = await query
  if (error) throw error

  const cities = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.city)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  return ['All', ...cities]
}

export async function saveGame(record: Partial<GameRecord> & Omit<GameRecord, 'id' | 'created_at'>) {
  requireSupabase()

  let query
  if (record.id) {
    query = supabase.from('games').update(record).eq('id', record.id)
  } else {
    query = supabase.from('games').insert(record)
  }

  const { data, error } = await query.select('*').single()
  if (error) throw error

  return normalizeGameRecord(data)
}

export async function getUserGames(userId: string): Promise<GameRecord[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .or(
      `user_id.eq.${userId},winner_id.eq.${userId},loser_id.eq.${userId},white_player_id.eq.${userId},black_player_id.eq.${userId}`
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []).map((item) => normalizeGameRecord(item))
}

export async function getGameById(gameId: string): Promise<GameRecord | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase.from('games').select('*').eq('id', gameId).maybeSingle()
  if (error) throw error

  return data ? normalizeGameRecord(data) : null
}

export async function createGameRoom(
  user: AuthUser,
  timeControl: TimeControlKey = 'blitz'
): Promise<GameRoomRecord> {
  requireSupabase()
  const config = getTimeControlConfig(timeControl)

  const { data, error } = await supabase
    .from('game_rooms')
    .insert({
      created_by: user.id,
      white_player_id: user.id,
      black_player_id: null,
      white_player_email: user.email,
      black_player_email: null,
      fen: INITIAL_FEN,
      pgn: '',
      moves: [],
      status: 'waiting',
      turn: 'white',
      result: null,
      winner_id: null,
      time_control: timeControl,
      white_time_ms: config.initialMs,
      black_time_ms: config.initialMs,
      last_move_at: new Date().toISOString(),
      chat_messages: [],
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return normalizeRoomRecord(data)
}

export async function getGameRoom(roomId: string): Promise<GameRoomRecord | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle()

  if (error) throw error
  return data ? normalizeRoomRecord(data) : null
}

export async function joinGameRoom(roomId: string, user: AuthUser): Promise<GameRoomRecord | null> {
  requireSupabase()

  const room = await getGameRoom(roomId)
  if (!room) return null

  if (room.white_player_id === user.id || room.black_player_id === user.id) {
    return room
  }

  const payload: Record<string, unknown> = {}

  if (!room.white_player_id) {
    payload.white_player_id = user.id
    payload.white_player_email = user.email
  } else if (!room.black_player_id) {
    payload.black_player_id = user.id
    payload.black_player_email = user.email
  } else {
    return room
  }

  const nextWhiteId =
    (typeof payload.white_player_id === 'string' ? payload.white_player_id : room.white_player_id) ?? null
  const nextBlackId =
    (typeof payload.black_player_id === 'string' ? payload.black_player_id : room.black_player_id) ?? null

  payload.status = nextWhiteId && nextBlackId ? 'playing' : 'waiting'
  payload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('game_rooms')
    .update(payload)
    .eq('id', roomId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeRoomRecord(data)
}

export async function updateGameRoomState(
  roomId: string,
  patch: Partial<GameRoomRecord> & {
    moves?: ChessMove[]
    analysis?: MoveAnalysis[]
  }
): Promise<GameRoomRecord> {
  requireSupabase()

  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      fen: patch.fen,
      pgn: patch.pgn,
      moves: patch.moves,
      status: patch.status,
      turn: patch.turn,
      result: patch.result,
      winner_id: patch.winner_id,
      white_time_ms: patch.white_time_ms,
      black_time_ms: patch.black_time_ms,
      last_move_at: patch.last_move_at,
      chat_messages: patch.chat_messages,
      updated_at: patch.updated_at ?? new Date().toISOString(),
    })
    .eq('id', roomId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeRoomRecord(data)
}

export async function sendRoomMessage(
  roomId: string,
  messages: RoomChatMessage[]
): Promise<GameRoomRecord> {
  requireSupabase()

  const { data, error } = await supabase
    .from('game_rooms')
    .update({
      chat_messages: messages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select('*')
    .single()

  if (error) throw error
  return normalizeRoomRecord(data)
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: GameRoomRecord) => void
) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(normalizeRoomRecord(payload.new as Record<string, unknown>))
        }
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function recordMultiplayerResult(params: {
  roomId: string
  pgn: string
  moves: ChessMove[]
  result: GameResult
  winnerId?: string | null
  loserId?: string | null
  analysis?: MoveAnalysis[]
  whitePlayerId?: string | null
  blackPlayerId?: string | null
  whitePlayerEmail?: string | null
  blackPlayerEmail?: string | null
}) {
  requireSupabase()

  const { error } = await supabase.rpc('record_multiplayer_result', {
    p_room_id: params.roomId,
    p_pgn: params.pgn,
    p_moves: params.moves,
    p_result: params.result,
    p_winner_id: params.winnerId ?? null,
    p_loser_id: params.loserId ?? null,
    p_analysis: params.analysis ?? [],
    p_white_player_id: params.whitePlayerId ?? null,
    p_black_player_id: params.blackPlayerId ?? null,
    p_white_player_email: params.whitePlayerEmail ?? null,
    p_black_player_email: params.blackPlayerEmail ?? null,
  })

  if (error) throw error
}
