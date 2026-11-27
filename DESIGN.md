# Regole di design

La "bibbia" del sito. Ogni valore vive come token in cima a `src/style.css`: nel resto del CSS si usano solo i token, mai numeri sciolti. Niente `style={{…}}` nel JSX per margini, colori o dimensioni.

## 1. Caratteri

- **Inter** per tutto il testo. **Cinzel** solo per il logo "Ironsworn", mai altrove.
- Niente testo tutto maiuscolo, tranne le etichette di gruppo (vedi sotto).
- Tre pesi: 400 testo, 600 titoli e testo in evidenza, 700 solo per i numeri grandi.
- Corsivo solo per i trigger delle mosse ("Quando…", 600 come nel manuale) e per le righe di racconto nel registro.

| Token | Misura | Uso |
|---|---|---|
| `--fs-xs` | 12 px | meta (ora, autore, "giocato da…"), etichette, tag, aiuti sotto i campi |
| `--fs-sm` | 14 px | testo normale, pulsanti, chip, campi, registro, asset, legami |
| `--fs-md` | 16 px | titolo di un elemento: nome di voto, minaccia, pagina, personaggio nella compagnia |
| `--fs-lg` | 18 px | titolo di riquadro ("Compagnia", "Registro"), nome nella scheda, esito del tiro |
| `--fs-xl` | 28 px | numeri grandi (statistiche, Scorte, oracolo) e logo |

Nessun'altra misura. Interlinea 1.45 per il testo, 1.2 per titoli e numeri.

## 2. Etichette

- **Etichetta di gruppo** (`.label`): 12 px, maiuscolo, spaziata, grigia. Dà il nome a un gruppo di controlli o di contenuti dentro un riquadro: "Mossa", "Asset", "Slancio".
- **Etichetta di campo** (`label`): 12 px, grigia, frase normale, sopra il campo, a 4 px.

## 3. Spaziature

Scala a passi di 4: `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24.

- Lo spazio verticale lo decide **il contenitore** con `gap`, non i margini dei figli (i paragrafi hanno margine 0).
- **8 px** tra cose che stanno insieme: testo e controlli sotto, titolo e descrizione, elementi di una lista, chip, pulsanti affiancati.
- **16 px** tra gruppi diversi dentro un riquadro: un'etichetta di gruppo ha sempre 16 px sopra e 8 px sotto (vicinanza: l'etichetta "appartiene" a ciò che segue).
- **16 px** di padding nei riquadri e di distanza tra riquadri e colonne; **12 px** di padding negli elementi.
- **4 px** solo dentro un controllo composto (etichetta e campo, segmenti di un orologio).

## 4. Superfici

| Livello | Sfondo | Bordo | Raggio | Esempi |
|---|---|---|---|---|
| Pagina | `--bg` | – | – | |
| Riquadro | `--card` | `--line` | 12 px | colonne del Tavolo, voti, sezioni della scheda |
| Elemento | `--card2` | `--line` | 8 px | asset, legame, personaggio nella compagnia, modulo, risultato |
| Avviso/conferma | `--bg` | – | 8 px | "Eliminare…?", proposte dopo il tiro |

Mai un elemento dentro un elemento.

## 5. Controlli

La forma dice cosa fa: **rettangolo = azione**, **pillola = scelta**, **testo sottolineato = azione secondaria**.

| Tipo | Aspetto | Quando |
|---|---|---|
| Primario | arancio pieno | l'azione principale di un riquadro (al massimo una visibile per riquadro o modulo) |
| Secondario (`.ghost`) | bordo, sfondo scuro | altre azioni: + Nuovo…, −/+, Annulla |
| Testo (`.link`) | grigio sottolineato | azioni rare o di gestione: Modifica, Chiudi, −1 segmento |
| Pericolo (`.danger`) | testo rosso sottolineato | Elimina, Archivia. Chiede sempre conferma |
| Chip (`.chip`) | pillola; scelta = bordo e testo arancio | scegliere tra opzioni (mossa, statistica, grado, stato). Mai per un'azione |

- Altezze: pulsanti e campi 36 px, chip 32 px, `.small` 28 px (dentro gli elementi e nelle barre di azioni). Testo sempre 14 px.
- Nei moduli: Annulla e Salva in basso a destra, Salva per ultimo e primario.
- Tutto ciò che si clicca cambia al passaggio del mouse e ha il contorno arancio da tastiera; ciò che non si clicca non cambia mai.
- Pulsanti affiancati a 8 px, azioni di testo affiancate a 12 px.
- Un gruppo di azioni sta sotto il contenuto a cui si riferisce: primario e secondari a sinistra, azioni di testo a destra.

## 6. Colori con significato

- **Arancio** (`--accent`): azione principale, selezione, "è tuo".
- **Blu** (`--strong`): progresso e successo pieno (tracciati, esperienza, dadi battuti).
- **Giallo** (`--weak`): minaccia, avvisi, successo parziale.
- **Rosso** (`--miss`): danno e fallimento (Salute, Spirito), eliminare.
- **Verde** (`--online`): collegato, asset OK.
- **Viola** (`--sheet`): cambi alla scheda nel registro (danni, esperienza, legami, asset).
- **Tracciati** (pagina Voti): bordo sinistro, etichetta e caselle piene del colore del tipo. Voto di gruppo blu, voto personale viola, viaggio verde, scontro rosso, luogo pericoloso terra (`--place`).
- **Registro**: ogni riga ha un'etichetta del tipo (Mossa, Scena, Avanzamento, Minaccia, Scheda, Immagine, Oracolo, Racconto) e un bordo sinistro del colore che le spetta.

## 7. Tracciati

- **Orologio** (Salute, Spirito, Minaccia): 6 segmenti rettangolari da 18 × 10 px, ovunque uguali. Si legge "etichetta · segmenti · n/6". Dove si modifica a clic, i segmenti sono pulsanti con lo stesso aspetto.
- **Tracciato di progresso** (voti, viaggi, scontri): 10 caselle da 22 px con 4 segmenti, blu.
- **Esperienza**: 20 quadratini da 14 px, blu.
- Sotto un tracciato, una riga meta (12 px) con il conteggio.

## 8. Tabelle e testi di regole

Regola fissa: ogni riquadro va impaginato con cura, non solo "funzionante".

- Le tabelle sono tabelle vere (`.ref-table`): intestazione piccola e grigia, righe separate da un filetto, niente righe a capo incolonnate a mano.
- La colonna del dado è stretta, allineata a destra, con numeri tabulari (`tabular-nums`), separata dal testo.
- Più tabelle nello stesso riquadro hanno le colonne alla stessa larghezza.
- I rimandi alle mosse e alle statistiche nel testo (`.ref`) sono in grassetto.
- Prima di pubblicare: screenshot reale a misura desktop, guardato con occhio critico.
