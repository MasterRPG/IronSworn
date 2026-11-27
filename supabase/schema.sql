-- Da incollare una volta nel SQL Editor del progetto Supabase.
-- Registro dei tiri: ogni riga è un tiro (o una bruciata di slancio) visto da tutto il tavolo.

create table public.rolls (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id),
  player_name text not null check (char_length(player_name) between 1 and 40),
  move text,
  result jsonb not null
);

alter table public.rolls enable row level security;

-- shortcut: un solo tavolo per tutti gli utenti registrati; aggiungere i tavoli quando servono più gruppi.
create policy "chi è registrato legge i tiri" on public.rolls
  for select to authenticated using (true);

create policy "ognuno scrive solo i propri tiri" on public.rolls
  for insert to authenticated with check (user_id = auth.uid());

alter publication supabase_realtime add table public.rolls;
