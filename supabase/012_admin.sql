-- Matteo è l'amministratore: modifica tutte le schede, e solo lui archivia o riporta in gioco un personaggio.
create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'matteo@ironsworn.example.com'
$$;

drop policy "ognuno modifica solo la sua scheda" on public.characters;
create policy "ognuno modifica la sua scheda, l'admin tutte" on public.characters
  for update to authenticated
  using (owner = auth.uid() or owner is null or public.is_admin())
  with check (owner = auth.uid() or owner is null or public.is_admin());

create or replace function public.solo_admin_archivia() returns trigger language plpgsql as $$
begin
  if (new.data ->> 'archiviato') is distinct from (old.data ->> 'archiviato') and not public.is_admin() then
    raise exception 'Solo l''amministratore può archiviare o riportare in gioco un personaggio';
  end if;
  return new;
end $$;
create trigger solo_admin_archivia before update on public.characters
  for each row execute function public.solo_admin_archivia();
