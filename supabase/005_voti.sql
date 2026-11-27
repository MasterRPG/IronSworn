-- Voti, viaggi, scontri e luoghi pericolosi con il loro tracciato; la minaccia sta sul voto.
create table public.tracks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('voto', 'viaggio', 'scontro', 'luogo')),
  nome text not null,
  grado text not null check (grado in ('Pericoloso', 'Formidabile', 'Leggendario')),
  segmenti int not null default 0 check (segmenti between 0 and 40),
  personaggio bigint references public.characters (id) on delete cascade, -- voto personale; vuoto = di gruppo
  ferro text,
  minaccia text,
  minaccia_segmenti int not null default 0 check (minaccia_segmenti between 0 and 6),
  posizioni jsonb not null default '{}', -- scontro: id personaggio -> 'vantaggio' | 'difficolta'
  chiuso boolean not null default false
);

-- La scena in corso, collegata a un voto: una per il tavolo.
alter table public.party add column scena text, add column scena_voto bigint references public.tracks (id) on delete set null;

alter table public.tracks enable row level security;
grant select, insert, update, delete on public.tracks to authenticated;
-- shortcut: i tracciati sono del gruppo e tutti li modificano; limitare i voti personali al loro giocatore se serve.
create policy "il tavolo legge i tracciati" on public.tracks for select to authenticated using (true);
create policy "il tavolo crea i tracciati" on public.tracks for insert to authenticated with check (true);
create policy "il tavolo modifica i tracciati" on public.tracks for update to authenticated using (true);
create policy "il tavolo elimina i tracciati" on public.tracks for delete to authenticated using (true);

alter publication supabase_realtime add table public.tracks;
