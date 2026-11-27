-- Solo l'amministratore può svuotare il registro dei tiri.
grant delete on public.rolls to authenticated;
create policy "solo l'admin pulisce il registro" on public.rolls
  for delete to authenticated using (public.is_admin());
