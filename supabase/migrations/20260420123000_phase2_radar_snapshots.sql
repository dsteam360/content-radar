create extension if not exists pgcrypto;

create table if not exists public.radar_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null,
  creator_count integer not null default 0,
  video_count integer not null default 0,
  run_type text not null check (run_type in ('manual', 'scheduled')),
  status text not null check (status in ('success', 'partial', 'failed')),
  summary_json jsonb not null default '{}'::jsonb
);

create index if not exists radar_snapshots_created_at_idx
  on public.radar_snapshots (created_at desc);

create table if not exists public.creator_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  radar_snapshot_id uuid not null references public.radar_snapshots(id) on delete cascade,
  creator_id bigint,
  creator_name text not null,
  platform text not null,
  videos_analyzed integer not null default 0,
  total_recent_views bigint not null default 0,
  average_breakout_score numeric not null default 0,
  breakout_rate numeric not null default 0,
  avg_views_per_hour numeric not null default 0,
  avg_engagement_rate numeric not null default 0,
  top_video_breakout_score numeric not null default 0,
  consistency_score numeric not null default 0,
  momentum_label text not null default 'Stable',
  metadata_json jsonb not null default '{}'::jsonb
);

create index if not exists creator_snapshots_radar_snapshot_id_idx
  on public.creator_snapshots (radar_snapshot_id);

create index if not exists creator_snapshots_creator_id_idx
  on public.creator_snapshots (creator_id);

create table if not exists public.video_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  radar_snapshot_id uuid not null references public.radar_snapshots(id) on delete cascade,
  creator_id bigint,
  youtube_video_id text not null,
  title text not null,
  channel_title text,
  published_at timestamptz not null,
  thumbnail text,
  view_count bigint not null default 0,
  like_count bigint not null default 0,
  comment_count bigint not null default 0,
  breakout_score numeric not null default 0,
  breakout_reason text not null,
  current_timestamp timestamptz not null default now()
);

create index if not exists video_snapshots_radar_snapshot_id_idx
  on public.video_snapshots (radar_snapshot_id);

create index if not exists video_snapshots_creator_id_idx
  on public.video_snapshots (creator_id);

create index if not exists video_snapshots_youtube_video_id_idx
  on public.video_snapshots (youtube_video_id);
