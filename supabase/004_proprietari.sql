-- Ognuno modifica solo la propria scheda. Una scheda senza proprietario si può "prendere" scegliendola in alto ("Sono…").

alter table public.characters add column owner uuid references auth.users (id);
-- Il default si mette dopo, così le schede già importate restano senza proprietario.
alter table public.characters alter column owner set default auth.uid();

drop policy "il tavolo crea le schede" on public.characters;
drop policy "il tavolo modifica le schede" on public.characters;

create policy "ognuno crea schede sue" on public.characters
  for insert to authenticated with check (owner = auth.uid());
-- Si modifica la propria scheda, o se ne prende una libera; si può anche lasciarla libera.
create policy "ognuno modifica solo la sua scheda" on public.characters
  for update to authenticated
  using (owner = auth.uid() or owner is null)
  with check (owner = auth.uid() or owner is null);
