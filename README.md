# Ironsworn

L'app con cui giochiamo la nostra versione di Ironsworn: tiri condivisi in tempo reale, e poi schede, voti e note.
Le regole stanno nel Google Doc "Ironsworn"; la logica dei tiri è in `src/rules/`.

## Fase 1: tiri condivisi

- Tiro azione con le nostre regole: punteggio massimo 10, il pareggio non batte, doppi, slancio negativo, bruciare lo slancio.
- Portare a termine (solo orologi completi) e Chiedere all'oracolo.
- Registro dei tiri che tutti vedono subito.

## Fase 2: schede

- Schede di tutti i personaggi, modificabili da tutti e aggiornate in tempo reale.
- Salute e Spirito come orologi da 6; cicatrici e orrori con il −1 a Fisico o Animo dal secondo.
- Scorte del gruppo in alto; i tiri prendono statistiche (con i malus) e slancio dalla scheda del tuo personaggio, e bruciare lo slancio lo riporta a +2.

Per attivarla su un progetto già in linea: nel SQL Editor esegui `supabase/002_schede.sql`, poi `supabase/003_import_foglio.sql` per importare le schede dal foglio.

## Schede proprie

- Ognuno modifica solo la propria scheda: scegli il tuo personaggio da "Sono…" in alto e diventa tuo; "cambia" lo lascia libero.
- Conferma prima di cambiare una statistica; esperienza come tracciato da 0 a 20; asset con stato OK, Rotto o Perso; legami con "con chi" e il testo.
- Un attimo di suspense prima di vedere il risultato di un tiro, per tutti al tavolo.

Per attivarla: nel SQL Editor esegui `supabase/004_proprietari.sql`.

## Messa in linea (una volta sola)

1. **Supabase.** Crea un account e un progetto gratuito su supabase.com.
   Nel progetto apri *SQL Editor*, incolla `supabase/schema.sql` e premi *Run*; poi fai lo stesso con `supabase/002_schede.sql`.
   In *Authentication → URL Configuration* metti come *Site URL* l'indirizzo del sito (punto 3).
2. **Chiavi.** In Supabase, *Project Settings → API*: copia *Project URL* e la chiave *anon public*.
   Su GitHub, nel repository: *Settings → Secrets and variables → Actions → Variables*, crea
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con quei due valori. La chiave anon è pubblica per costruzione: la protezione la fanno le regole in `schema.sql`.
3. **GitHub Pages.** *Settings → Pages → Source: GitHub Actions*. A ogni modifica su `main` il sito si aggiorna da solo,
   all'indirizzo `https://masterrpg.github.io/IronSworn/`.

Si entra con un nome e la password comune del gruppo (almeno 6 caratteri). Il primo accesso con un nome crea l'account.
Su Supabase, in *Authentication → Sign In / Providers → Email*, va spento **Confirm email**. Quando tutti hanno fatto il primo accesso, spegnete
**Allow new users to sign up** (stessa pagina): da quel momento nessun altro può creare account.

## Sviluppo

```
cp .env.example .env.local   # e metti URL e chiave anon
npm install
npm run dev
npm test
```
