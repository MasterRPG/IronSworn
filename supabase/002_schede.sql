-- Fase 2: schede dei personaggi e Scorte di gruppo. Da eseguire una volta nel SQL Editor, dopo schema.sql.

create table public.characters (
  id bigint generated always as identity primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

-- Le Scorte sono del gruppo: una sola riga.
create table public.party (
  id int primary key default 1 check (id = 1),
  scorte int not null default 5 check (scorte between 0 and 5)
);
insert into public.party default values;

alter table public.characters enable row level security;
alter table public.party enable row level security;
grant select, insert, update on public.characters to authenticated;
grant select, update on public.party to authenticated;

-- shortcut: tra amici ognuno può modificare tutte le schede; legare una scheda al suo giocatore se serve.
create policy "il tavolo legge le schede" on public.characters for select to authenticated using (true);
create policy "il tavolo crea le schede" on public.characters for insert to authenticated with check (true);
create policy "il tavolo modifica le schede" on public.characters for update to authenticated using (true);
create policy "il tavolo legge le scorte" on public.party for select to authenticated using (true);
create policy "il tavolo modifica le scorte" on public.party for update to authenticated using (true);

alter publication supabase_realtime add table public.characters, public.party;
