alter table public.circuit_reports
  add column if not exists issues jsonb default '[]'::jsonb;
