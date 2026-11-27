-- Diario: ogni sessione chiusa conserva una copia delle righe del registro, così resta anche se il registro viene pulito.
create table public.sessions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  titolo text not null check (char_length(titolo) between 1 and 80),
  fino_a bigint not null, -- ultima riga del registro compresa: la sessione dopo parte da qui
  righe jsonb not null
);

alter table public.sessions enable row level security;
grant select, insert, update, delete on public.sessions to authenticated;
create policy "il tavolo legge il diario" on public.sessions for select to authenticated using (true);
create policy "solo l'admin chiude una sessione" on public.sessions for insert to authenticated with check (public.is_admin());
create policy "solo l'admin modifica il diario" on public.sessions for update to authenticated using (public.is_admin());
create policy "solo l'admin elimina una sessione" on public.sessions for delete to authenticated using (public.is_admin());

alter publication supabase_realtime add table public.sessions;
