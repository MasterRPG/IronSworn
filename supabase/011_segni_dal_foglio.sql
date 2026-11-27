-- Pallini del foglio "IronSworn - Personaggi" (27 novembre 2026): 0 = vuoto, altro = pieno.
-- Salute e Spirito: tutti vuoti tranne 1 di Spirito per Karsa. Voti: solo quello di gruppo ha 16 segmenti.
update public.characters set data = jsonb_set(data, '{spirito}', '1'), updated_at = now()
where data->>'nome' = 'Karsa' and coalesce((data->>'spirito')::int, 0) = 0;
update public.tracks set segmenti = 16
where tipo = 'voto' and personaggio is null and segmenti = 0
  and nome like 'Giuriamo di scoprire cosa ha fatto impazzire il capo di Oxenfurt%';
