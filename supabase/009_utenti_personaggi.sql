-- Ogni giocatore trova già sua la scheda importata: il nome con cui entra (Teo, Emi, Matteo)
-- corrisponde al campo "giocatore" della scheda, normalizzato come fa l'app per l'email.

create or replace function public.assegna_schede() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.characters set owner = new.id
  where owner is null
    and regexp_replace(lower(data->>'giocatore'), '[^a-z0-9]', '', 'g') || '@ironsworn.example.com' = new.email;
  return new;
end $$;

create trigger assegna_schede after insert on auth.users
  for each row execute function public.assegna_schede();

-- Per chi è già entrato prima di questo file.
update public.characters c set owner = u.id
from auth.users u
where c.owner is null
  and regexp_replace(lower(c.data->>'giocatore'), '[^a-z0-9]', '', 'g') || '@ironsworn.example.com' = u.email;
