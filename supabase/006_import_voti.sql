-- Import dei voti dal foglio "IronSworn - Personaggi" (27 novembre 2026). Il foglio non segna il progresso: partono da 0.
insert into public.tracks (tipo, nome, grado, ferro, personaggio)
select 'voto', v.nome, v.grado, v.ferro, (select id from public.characters where data->>'nome' = v.chi)
from (values
  ('Giuriamo di scoprire cosa ha fatto impazzire il capo di Oxenfurt', 'Pericoloso', 'il battente della porta del villaggio', null),
  ('Uccidere 12 assassini', 'Leggendario', 'la chiave della valigetta portapunte per frecce', 'Zamal L''Assorto'),
  ('Uccidere il nobile per vendicarmi', 'Leggendario', 'la moneta', 'Vanka Khitry'),
  ('Troverò la strega e la obbligherò a riportare normali tutti i miei compagni', 'Leggendario', 'l''Ancora', 'Karsa')
) as v(nome, grado, ferro, chi);
