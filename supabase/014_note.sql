-- Tab "Note": foto e disegni sulle pagine di tipo nota, salvati nello Storage di Supabase (bucket pubblico "note").
alter table public.pages add column immagini text[] not null default '{}';

insert into storage.buckets (id, name, public) values ('note', 'note', true) on conflict (id) do nothing;
create policy "il tavolo carica immagini nelle note" on storage.objects
  for insert to authenticated with check (bucket_id = 'note');
create policy "il tavolo elimina immagini dalle note" on storage.objects
  for delete to authenticated using (bucket_id = 'note');
