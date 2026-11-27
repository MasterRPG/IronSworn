-- Pagine di note condivise (luoghi, persone, villaggio...).
create table public.pages (
  id bigint generated always as identity primary key,
  updated_at timestamptz not null default now(),
  titolo text not null,
  testo text not null default ''
);
alter table public.pages enable row level security;
grant select, insert, update, delete on public.pages to authenticated;
create policy "il tavolo legge le note" on public.pages for select to authenticated using (true);
create policy "il tavolo crea le note" on public.pages for insert to authenticated with check (true);
create policy "il tavolo modifica le note" on public.pages for update to authenticated using (true);
create policy "il tavolo elimina le note" on public.pages for delete to authenticated using (true);
alter publication supabase_realtime add table public.pages;

-- Import dei tab Luoghi e Minacce del foglio "IronSworn - Personaggi" (27 novembre 2026).
insert into public.pages (titolo, testo) values
('Oxenfurt', $t$Villaggio iniziale.

Per raggiungerlo si percorre una strada lastricata di croci con i corpi dei criminali giustiziati ed esposti come monito.

Personaggio importante: Godfried, gestore della locanda. Conosce tutto di tutti, ogni informazione passa prima o poi per la sua locanda. Tutti si fidano di lui.

Personaggio importante: Cassandra, erborista che sa ricavare pozioni e rimedi da ogni tipo di pianta.

Problema: Il capo del villaggio è tornato dalla caccia, ma non sembra più lui. Un tempo coraggioso e carismatico, adesso è impaurito, si è chiuso in casa e non esce più. Dice che nella foresta c'è qualcosa che sta arrivando.$t$),
('Minacce dal foglio', $t$Dal tab Minacce del foglio, da collegare ai voti in "Voti e tracciati":

- Membri della setta ottengono ciò che vogliono dal villaggio
- Tra due giorni i cultisti uccideranno tutti nel villaggio$t$);
