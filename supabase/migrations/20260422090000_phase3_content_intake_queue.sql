create extension if not exists pgcrypto;

create table if not exists public.content_intake_items (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  source_platform text not null default 'unknown'
    check (source_platform in ('youtube', 'instagram', 'tiktok', 'x', 'facebook', 'unknown')),
  title text,
  source_creator_name text,
  thumbnail_url text,
  status text not null default 'new'
    check (status in ('new', 'analyzed', 'queued', 'archived', 'failed')),
  notes text,
  tags_json jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  analysis_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  analyzed_at timestamptz
);

create index if not exists content_intake_items_created_at_idx
  on public.content_intake_items (created_at desc);

create index if not exists content_intake_items_status_idx
  on public.content_intake_items (status);

create index if not exists content_intake_items_source_platform_idx
  on public.content_intake_items (source_platform);

create table if not exists public.content_queue_items (
  id uuid primary key default gen_random_uuid(),
  intake_item_id uuid not null references public.content_intake_items(id) on delete cascade,
  queue_status text not null default 'idea'
    check (queue_status in ('idea', 'drafting', 'ready', 'posted', 'archived')),
  target_platforms_json jsonb not null default '[]'::jsonb,
  remix_brief_json jsonb not null default '{}'::jsonb,
  music_supervisor_json jsonb not null default '{}'::jsonb,
  publish_assist_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_queue_items_intake_item_id_idx
  on public.content_queue_items (intake_item_id);

create index if not exists content_queue_items_queue_status_idx
  on public.content_queue_items (queue_status);
