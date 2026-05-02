-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Items table
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  category text not null default 'all',
  created_at timestamptz default now()
);

-- Votes table
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  item_a_id uuid not null references items(id),
  item_b_id uuid not null references items(id),
  voted_item_id uuid not null references items(id),
  session_id text,
  created_at timestamptz default now()
);

-- Reports table
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  session_id text,
  reason text not null default 'broken_or_incorrect',
  created_at timestamptz default now()
);

create index if not exists idx_reports_item_id on reports(item_id);

-- Indexes
create index if not exists idx_votes_items on votes(item_a_id, item_b_id);
create index if not exists idx_items_category on items(category);

-- Sample data
insert into items (title, youtube_url, category) values
  ('Super Mario 64 - Bob-omb Battlefield', 'https://www.youtube.com/watch?v=6f0gCkJg-Xk', 'video_games'),
  ('The Legend of Zelda: Ocarina of Time', 'https://www.youtube.com/watch?v=BGsITEsxjRo', 'video_games'),
  ('Pokemon Red & Blue - Pallet Town', 'https://www.youtube.com/watch?v=5V8bkDgYZns', 'video_games'),
  ('Dragon Ball Z - Bruce Faulconer Medley', 'https://www.youtube.com/watch?v=vFxPNZfmLDo', 'cartoons'),
  ('Tom and Jerry - Classic Theme', 'https://www.youtube.com/watch?v=7EqSb7HI_as', 'cartoons'),
  ('Toy Story - You''ve Got a Friend in Me', 'https://www.youtube.com/watch?v=or-HgEITsHI', 'movies'),
  ('The Lion King - Circle of Life', 'https://www.youtube.com/watch?v=GibiNy4d4gc', 'movies'),
  ('Backstreet Boys - I Want It That Way', 'https://www.youtube.com/watch?v=4fndeDfaWCg', 'music'),
  ('Spice Girls - Wannabe', 'https://www.youtube.com/watch?v=gJLIiF15wjQ', 'music')
on conflict do nothing;
