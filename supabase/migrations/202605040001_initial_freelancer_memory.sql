create extension if not exists pgcrypto;

create table if not exists public.fm_generation_events (
  id uuid primary key default gen_random_uuid(),
  install_id text,
  source text not null default 'web',
  forced_intent text not null default 'auto',
  detected_intent text not null,
  risk_level text not null,
  input_chars integer not null default 0,
  prompt_chars integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fm_generation_events_source_check
    check (source in ('web', 'gmail', 'linkedin', 'upwork', 'fiverr', 'generic', 'x', 'whatsapp')),
  constraint fm_generation_events_risk_level_check
    check (risk_level in ('none', 'low', 'medium', 'high')),
  constraint fm_generation_events_non_negative_check
    check (
      input_chars >= 0
      and prompt_chars >= 0
      and input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
    )
);

create index if not exists fm_generation_events_created_at_idx
  on public.fm_generation_events (created_at desc);

create index if not exists fm_generation_events_install_id_idx
  on public.fm_generation_events (install_id)
  where install_id is not null;

alter table public.fm_generation_events enable row level security;

drop policy if exists "Service role can manage generation events" on public.fm_generation_events;

create policy "Service role can manage generation events"
  on public.fm_generation_events
  for all
  to service_role
  using (true)
  with check (true);
