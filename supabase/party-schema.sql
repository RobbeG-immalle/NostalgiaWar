-- ============================================================
-- Nostalgia War – Party Mode Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Lobbies
create table if not exists lobbies (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  status     text not null default 'waiting'
               check (status in ('waiting', 'playing', 'finished')),
  max_players int not null default 8,
  max_score  int not null default 5,
  created_at timestamptz not null default now()
);

-- Players
create table if not exists players (
  id         uuid primary key default gen_random_uuid(),
  lobby_id   uuid not null references lobbies(id) on delete cascade,
  name       text not null,
  score      int not null default 0,
  is_host    boolean not null default false,
  is_bot     boolean not null default false,
  joined_at  timestamptz not null default now()
);

-- Migration: add is_bot column if upgrading an existing database
-- alter table players add column if not exists is_bot boolean not null default false;

-- Rounds
create table if not exists rounds (
  id           uuid primary key default gen_random_uuid(),
  lobby_id     uuid not null references lobbies(id) on delete cascade,
  president_id uuid not null references players(id) on delete cascade,
  prompt       text not null,
  status       text not null default 'submitting'
                 check (status in ('submitting', 'judging', 'finished')),
  created_at   timestamptz not null default now()
);

-- Submissions (unique per player per round)
create table if not exists submissions (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  youtube_url text not null,
  created_at  timestamptz not null default now(),
  unique(round_id, player_id)
);

-- Enable Realtime for all party mode tables
alter publication supabase_realtime add table lobbies;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table submissions;
