-- L'amministratore può eliminare per sempre un personaggio (con i suoi voti personali, per la cascata su tracks).
grant delete on public.characters to authenticated;
create policy "solo l'admin elimina un personaggio" on public.characters
  for delete to authenticated using (public.is_admin());
