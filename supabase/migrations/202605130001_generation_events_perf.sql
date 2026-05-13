alter table public.fm_generation_events
  add column if not exists duration_ms integer,
  add column if not exists output_chars integer,
  add column if not exists status text,
  add column if not exists error_category text;

alter table public.fm_generation_events
  drop constraint if exists fm_generation_events_non_negative_check;

alter table public.fm_generation_events
  add constraint fm_generation_events_non_negative_check
    check (
      input_chars >= 0
      and prompt_chars >= 0
      and input_tokens >= 0
      and output_tokens >= 0
      and total_tokens >= 0
      and (duration_ms is null or duration_ms >= 0)
      and (output_chars is null or output_chars >= 0)
    );

alter table public.fm_generation_events
  drop constraint if exists fm_generation_events_status_check;

alter table public.fm_generation_events
  add constraint fm_generation_events_status_check
    check (status is null or status in ('ok', 'error'));
