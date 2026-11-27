-- Regola della casa: i due dadi sfida li tira un altro giocatore, completando il tiro rimasto in attesa.
grant update on public.rolls to authenticated;
create policy "chiunque completa un tiro in attesa della sfida" on public.rolls
  for update to authenticated
  using (result->>'pending' = 'true')
  with check (true);
