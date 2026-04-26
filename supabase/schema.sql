create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  country text,
  city text,
  rating integer not null default 1200,
  games_won integer not null default 0,
  games_lost integer not null default 0,
  games_drawn integer not null default 0,
  is_pro boolean not null default false,
  coins integer not null default 0,
  owned_themes text[] not null default '{classic}',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists rating integer not null default 1200;
alter table public.profiles add column if not exists games_won integer not null default 0;
alter table public.profiles add column if not exists games_lost integer not null default 0;
alter table public.profiles add column if not exists games_drawn integer not null default 0;
alter table public.profiles add column if not exists is_pro boolean not null default false;
alter table public.profiles add column if not exists coins integer not null default 0;
alter table public.profiles add column if not exists owned_themes text[] not null default '{classic}';
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  white_player_id uuid references auth.users(id) on delete set null,
  black_player_id uuid references auth.users(id) on delete set null,
  white_player_email text,
  black_player_email text,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  moves jsonb not null default '[]'::jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  turn text not null default 'white' check (turn in ('white', 'black')),
  result text check (result in ('white', 'black', 'draw')),
  winner_id uuid references auth.users(id) on delete set null,
  time_control text not null default 'blitz' check (time_control in ('bullet', 'blitz', 'rapid', 'classical')),
  white_time_ms bigint,
  black_time_ms bigint,
  last_move_at timestamptz,
  chat_messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_rooms add column if not exists white_player_email text;
alter table public.game_rooms add column if not exists black_player_email text;
alter table public.game_rooms add column if not exists fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
alter table public.game_rooms add column if not exists pgn text not null default '';
alter table public.game_rooms add column if not exists moves jsonb not null default '[]'::jsonb;
alter table public.game_rooms add column if not exists status text not null default 'waiting';
alter table public.game_rooms add column if not exists turn text not null default 'white';
alter table public.game_rooms add column if not exists result text;
alter table public.game_rooms add column if not exists winner_id uuid references auth.users(id) on delete set null;
alter table public.game_rooms add column if not exists time_control text not null default 'blitz';
alter table public.game_rooms add column if not exists white_time_ms bigint;
alter table public.game_rooms add column if not exists black_time_ms bigint;
alter table public.game_rooms add column if not exists last_move_at timestamptz;
alter table public.game_rooms add column if not exists chat_messages jsonb not null default '[]'::jsonb;
alter table public.game_rooms add column if not exists created_at timestamptz not null default now();
alter table public.game_rooms add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter publication supabase_realtime add table public.game_rooms;
exception
  when duplicate_object then null;
end $$;

drop trigger if exists game_rooms_set_updated_at on public.game_rooms;
create trigger game_rooms_set_updated_at
before update on public.game_rooms
for each row execute procedure public.set_updated_at();

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  room_id uuid references public.game_rooms(id) on delete set null,
  mode text not null default 'ai' check (mode in ('ai', 'multiplayer', 'replay')),
  pgn text not null default '',
  moves jsonb not null default '[]'::jsonb,
  result text check (result in ('white', 'black', 'draw')),
  analysis jsonb,
  winner_id uuid references auth.users(id) on delete set null,
  loser_id uuid references auth.users(id) on delete set null,
  white_player_id uuid references auth.users(id) on delete set null,
  black_player_id uuid references auth.users(id) on delete set null,
  white_player_email text,
  black_player_email text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.games add column if not exists room_id uuid references public.game_rooms(id) on delete set null;
alter table public.games add column if not exists mode text not null default 'ai';
alter table public.games add column if not exists winner_id uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists loser_id uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists white_player_id uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists black_player_id uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists white_player_email text;
alter table public.games add column if not exists black_player_email text;
alter table public.games add column if not exists metadata jsonb;

create index if not exists profiles_rating_idx on public.profiles(rating desc);
create index if not exists profiles_country_idx on public.profiles(country);
create unique index if not exists profiles_username_unique on public.profiles(username) where username is not null;
create index if not exists games_created_at_idx on public.games(created_at desc);
create index if not exists games_user_id_idx on public.games(user_id);
create unique index if not exists games_room_id_unique on public.games(room_id) where room_id is not null;

alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.games enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
on public.profiles
for select
using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists room_read_authenticated on public.game_rooms;
create policy room_read_authenticated
on public.game_rooms
for select
using (auth.uid() is not null);

drop policy if exists room_insert_authenticated on public.game_rooms;
create policy room_insert_authenticated
on public.game_rooms
for insert
with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists room_update_authenticated on public.game_rooms;
create policy room_update_authenticated
on public.game_rooms
for update
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists games_read_related on public.games;
create policy games_read_related
on public.games
for select
using (
  auth.uid() = user_id
  or auth.uid() = winner_id
  or auth.uid() = loser_id
  or auth.uid() = white_player_id
  or auth.uid() = black_player_id
);

drop policy if exists games_insert_related on public.games;
create policy games_insert_related
on public.games
for insert
with check (
  auth.uid() = user_id
  or auth.uid() = winner_id
  or auth.uid() = loser_id
  or auth.uid() = white_player_id
  or auth.uid() = black_player_id
);

drop policy if exists games_update_related on public.games;
create policy games_update_related
on public.games
for update
using (
  auth.uid() = user_id
  or auth.uid() = winner_id
  or auth.uid() = loser_id
  or auth.uid() = white_player_id
  or auth.uid() = black_player_id
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, country, city)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do update
    set email = excluded.email,
        country = coalesce(excluded.country, public.profiles.country),
        city = coalesce(excluded.city, public.profiles.city);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.record_multiplayer_result(
  p_room_id uuid,
  p_pgn text,
  p_moves jsonb,
  p_result text,
  p_winner_id uuid,
  p_loser_id uuid,
  p_analysis jsonb,
  p_white_player_id uuid,
  p_black_player_id uuid,
  p_white_player_email text,
  p_black_player_email text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_game_id uuid;
begin
  select id into v_game_id from public.games where room_id = p_room_id limit 1;

  if v_game_id is null then
    if p_result = 'draw' then
      if p_white_player_id is not null then
        update public.profiles
        set games_drawn = games_drawn + 1,
            rating = rating + 4,
            coins = coins + 5
        where id = p_white_player_id;
      end if;

      if p_black_player_id is not null then
        update public.profiles
        set games_drawn = games_drawn + 1,
            rating = rating + 4,
            coins = coins + 5
        where id = p_black_player_id;
      end if;
    else
      if p_winner_id is not null then
        update public.profiles
        set games_won = games_won + 1,
            rating = rating + 16,
            coins = coins + 10
        where id = p_winner_id;
      end if;

      if p_loser_id is not null then
        update public.profiles
        set games_lost = games_lost + 1,
            rating = greatest(100, rating - 16)
        where id = p_loser_id;
      end if;
    end if;
  end if;

  insert into public.games (
    room_id,
    mode,
    pgn,
    moves,
    result,
    analysis,
    winner_id,
    loser_id,
    white_player_id,
    black_player_id,
    white_player_email,
    black_player_email,
    metadata
  )
  values (
    p_room_id,
    'multiplayer',
    p_pgn,
    p_moves,
    p_result,
    p_analysis,
    p_winner_id,
    p_loser_id,
    p_white_player_id,
    p_black_player_id,
    p_white_player_email,
    p_black_player_email,
    jsonb_build_object('source', 'multiplayer')
  )
  on conflict (room_id) do update
    set pgn = excluded.pgn,
        moves = excluded.moves,
        result = excluded.result,
        analysis = excluded.analysis,
        winner_id = excluded.winner_id,
        loser_id = excluded.loser_id,
        white_player_id = excluded.white_player_id,
        black_player_id = excluded.black_player_id,
        white_player_email = excluded.white_player_email,
        black_player_email = excluded.black_player_email,
        metadata = excluded.metadata
  returning id into v_game_id;

  return v_game_id;
end;
$$;

-- ─── Friends System ───────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create table if not exists public.friend_challenges (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id   uuid not null references auth.users(id) on delete cascade,
  room_id      uuid references public.game_rooms(id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_addressee on public.friendships(addressee_id);
create index if not exists idx_friend_challenges_to  on public.friend_challenges(to_user_id);

-- RLS
alter table public.friendships       enable row level security;
alter table public.friend_challenges enable row level security;

-- Drop policies before recreating (CREATE POLICY IF NOT EXISTS requires PG17+)
drop policy if exists "friendships_select" on public.friendships;
drop policy if exists "friendships_insert" on public.friendships;
drop policy if exists "friendships_update" on public.friendships;
drop policy if exists "friendships_delete" on public.friendships;
drop policy if exists "challenges_select"  on public.friend_challenges;
drop policy if exists "challenges_insert"  on public.friend_challenges;
drop policy if exists "challenges_update"  on public.friend_challenges;

create policy "friendships_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert" on public.friendships for insert
  with check (auth.uid() = requester_id);
create policy "friendships_update" on public.friendships for update
  using (auth.uid() = addressee_id);
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "challenges_select" on public.friend_challenges for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "challenges_insert" on public.friend_challenges for insert
  with check (auth.uid() = from_user_id);
create policy "challenges_update" on public.friend_challenges for update
  using (auth.uid() = to_user_id);

-- ─── Shop RPC ────────────────────────────────────────────────────────────────

create or replace function public.purchase_theme(
  p_user_id uuid,
  p_theme_id text,
  p_price integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_coins integer;
  v_owned text[];
begin
  select coins, owned_themes
  into v_coins, v_owned
  from public.profiles
  where id = p_user_id
  for update;

  if v_coins is null then
    raise exception 'Profile not found';
  end if;

  if v_coins < p_price then
    raise exception 'Insufficient coins';
  end if;

  if p_theme_id = any(v_owned) then
    raise exception 'Theme already owned';
  end if;

  update public.profiles
  set coins = coins - p_price,
      owned_themes = array_append(owned_themes, p_theme_id)
  where id = p_user_id
  returning coins, owned_themes
  into v_coins, v_owned;

  return jsonb_build_object('coins', v_coins, 'owned_themes', v_owned);
end;
$$;

-- ─── Stripe webhook helper: activate Pro ─────────────────────────────────────

create or replace function public.activate_pro(
  p_user_id uuid,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set is_pro = true,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id)
  where id = p_user_id;
end;
$$;
