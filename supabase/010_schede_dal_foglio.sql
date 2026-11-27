-- Il file 003 era stato segnato come già eseguito ma non lo era: su Supabase c'era solo una scheda di Karsa quasi vuota.
-- Importa ora le tre schede dal foglio. Una scheda con lo stesso nome viene completata (tiene il proprietario).
create temp table foglio (data jsonb) on commit drop;
insert into foglio (data) values
($j${"nome": "Zamal L'Assorto", "giocatore": "Teo", "aspetto": "Ampio cappuccio scuro con bavero e sciarpa che cela il mio volto.", "mestiere": "Mercante ambulante di coltelleria", "passato": "Giunto in un villaggio fuori dal mio solito giro, hanno rinvenuto il mattino seguente tutti gli ospiti della locanda morti trafitti dalla mia merce, da quel giorno sono ricercato e rinominato Il Mercante di Morte.", "stats": {"fisico": 2, "animo": 3, "ingegno": 1}, "salute": 0, "spirito": 0, "slancio": 5, "esperienza": 0, "cicatrici": ["", "", ""], "orrori": ["", "", ""], "legami": ["Vanka sa che sono un assassino"], "asset": [{"tipo": "Ricordo", "testo": "Bambola di stoffa di un compagno caduto. La bambola è appartenuta al mio amico e primo compagno di avventura, prima di esalare l’ultimo respiro mi ha chiesto di prendermene cura.", "rotto": false}, {"tipo": "Arma", "testo": "Arco in metallo nero", "rotto": true}, {"tipo": "Strumento", "testo": "Corda progettata da me", "rotto": false}, {"tipo": "Altro", "testo": "Lacrima di spirito", "rotto": false}], "voto": {"testo": "Uccidere 12 assassini", "grado": "Leggendario", "ferro": "la chiave della valigetta portapunte per frecce"}}$j$::jsonb),
($j${"nome": "Vanka Khitry", "giocatore": "Emi", "aspetto": "Capelli bianchi.", "mestiere": "Ladro", "passato": "Per amore. Lo avevo promesso alla donna che poi è diventata mia moglie.", "stats": {"fisico": 2, "animo": 1, "ingegno": 3}, "salute": 0, "spirito": 0, "slancio": 4, "esperienza": 0, "cicatrici": ["", "", ""], "orrori": ["", "", ""], "legami": ["Ho giurato di proteggere Karsa"], "asset": [{"tipo": "Ricordo", "testo": "Moneta di un amore perduto. La moneta è presa dal sacchetto di denaro che mia moglie aveva guadagnato prostituendosi con il nobile del villaggio. Ho preso la moneta e me ne sono andato abbandonando tutti.", "rotto": false}, {"tipo": "Arma", "testo": "Martello di fattura straniera", "rotto": false}, {"tipo": "Strumento", "testo": "Borsa del guaritore, in un astuccio consumato", "rotto": false}], "voto": {"testo": "Uccidere il nobile per vendicarmi", "grado": "Leggendario", "ferro": "la moneta"}}$j$::jsonb),
($j${"nome": "Karsa", "giocatore": "Matteo", "aspetto": "Fisico possente, barba incolta, grosso ventre. Gamba di legno.", "mestiere": "Marinaio", "passato": "Per vendetta. Ho abbandonato il mio mestiere per cercare la strega.", "stats": {"fisico": 3, "animo": 2, "ingegno": 1}, "salute": 0, "spirito": 0, "slancio": 2, "esperienza": 0, "cicatrici": ["", "", ""], "orrori": ["", "", ""], "legami": ["Zamal mi ha insegnato tutto quello che so."], "asset": [{"tipo": "Ricordo", "testo": "Ciocca di capelli di qualcuno che sto cercando. La ciocca appartiene a una strega che ha trasformato i miei compagni marinai in statue di pietra la notte in cui le abbiamo dato asilo (era sotto mentite spoglie).", "rotto": false}, {"tipo": "Arma", "testo": "Ancora (adattata ad arma), con un nome inciso: Lucilla.", "rotto": false}, {"tipo": "Strumento", "testo": "Cannocchiale di un leggendario pirata, rubato dalla sua tomba.", "rotto": false}], "voto": {"testo": "Troverò la strega e la obbligherò a riportare normali tutti i miei compagni", "grado": "Leggendario", "ferro": "l'Ancora"}}$j$::jsonb);

update public.characters c set data = f.data, updated_at = now()
from foglio f where c.data->>'nome' = f.data->>'nome';

insert into public.characters (data)
select f.data from foglio f
where not exists (select 1 from public.characters c where c.data->>'nome' = f.data->>'nome');

-- Ognuno trova sua la scheda (come in 009, per chi è già entrato).
update public.characters c set owner = u.id
from auth.users u
where c.owner is null
  and regexp_replace(lower(c.data->>'giocatore'), '[^a-z0-9]', '', 'g') || '@ironsworn.example.com' = u.email;

-- I voti personali importati con 006 quando le schede non c'erano ancora.
update public.tracks t set personaggio = c.id
from public.characters c, (values
  ('Uccidere 12 assassini', 'Zamal L''Assorto'),
  ('Uccidere il nobile per vendicarmi', 'Vanka Khitry'),
  ('Troverò la strega e la obbligherò a riportare normali tutti i miei compagni', 'Karsa')
) as v(voto, chi)
where t.tipo = 'voto' and t.personaggio is null and t.nome = v.voto and c.data->>'nome' = v.chi;
