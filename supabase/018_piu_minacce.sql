-- Un voto può avere più minacce: lista [{ id, nome, segmenti }] al posto di minaccia + minaccia_segmenti.
alter table public.tracks add column minacce jsonb not null default '[]';
update public.tracks set minacce = jsonb_build_array(jsonb_build_object('id', 1, 'nome', minaccia, 'segmenti', minaccia_segmenti))
  where minaccia is not null;
alter table public.tracks drop column minaccia, drop column minaccia_segmenti;
