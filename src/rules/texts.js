// Testi delle mosse e tabelle, copiati dal Google Doc "Ironsworn" del gruppo.

// Ogni esito: testo, quante opzioni si scelgono ("tutte" = si applicano tutte) e le opzioni a elenco.
// Un'opzione è [testo, effetto]: l'effetto somma ai campi della scheda (salute/spirito = danni) o alle Scorte;
// null = solo racconto; 'prezzo' = Pagare il prezzo; 'perdita' = Subire una perdita (1, o 2 se il grado è Formidabile o Leggendario).
const PAY = { pick: 'Scegli uno', options: [['Tira la tabella Pagare il prezzo', 'prezzo'], ['Subire una perdita di Salute', { salute: 'perdita' }], ['Subire una perdita di Spirito', { spirito: 'perdita' }]] };
const COMBAT = [['Segna progresso', null], ['Colpo terribile: segna progresso una seconda volta', null], ['Gli prendi qualcosa', null], ['Lo sposti', null], ['Lo spaventi: un compagno ha +1', null], ['Proteggi un compagno', null]];
const WILD = [['−1 Salute', { salute: -1 }], ['−1 Spirito', { spirito: -1 }], ['+1 slancio', { slancio: 1 }], ['+1 al prossimo viaggio', null], ['+1 Scorte', { scorte: 1 }]];
const TOWN = [['−2 Salute', { salute: -2 }], ['−2 Spirito', { spirito: -2 }], ['+2 Scorte', { scorte: 2 }], ['Sostituire o aggiustare un asset', null], ['+2 slancio', { slancio: 2 }]];

export const MOVE_TEXTS = {
  'Giurare sul Ferro': {
    strong: { text: 'Parti con un vantaggio concreto. Raccontalo.', pick: 'tutte', options: [['+2 slancio', { slancio: 2 }], ['Segna progresso sul voto', null]] },
    weak: { text: 'Sei determinato ma non sai bene come procedere. Racconta cosa fai per trovare la prima pista e scrivi una minaccia: cosa succede se ci metti troppo tempo.', pick: 'tutte', options: [['+1 slancio', { slancio: 1 }]] },
    miss: { text: 'Un ostacolo serio ti blocca prima ancora di partire. Racconta qual è e scrivi una minaccia con un segmento già pieno.' },
  },
  'Sfidare il pericolo': {
    strong: { text: 'Ce la fai.', pick: 'tutte', options: [['+1 slancio', { slancio: 1 }]] },
    weak: { text: 'Ce la fai, ma paghi un costo.', pick: 'Scegli uno', options: [['−1 slancio', { slancio: -1 }], ['Subire una perdita di Salute', { salute: 'perdita' }], ['Subire una perdita di Spirito', { spirito: 'perdita' }], ['Subire una perdita di Scorte', { scorte: 'perdita' }]] },
    miss: { text: 'Non ce la fai, o ce la fai con una conseguenza grave.', ...PAY },
  },
  "Preparare l'azione": {
    strong: { text: 'Ti prepari bene.', pick: 'Scegli uno', options: [['Tu o un compagno avete +1 alla prossima mossa', null], ['+2 slancio', { slancio: 2 }]] },
    weak: { text: 'Ti prepari, ma meno di quanto speravi.', pick: 'tutte', options: [['+1 slancio', { slancio: 1 }]] },
    miss: { text: 'Il tentativo fallisce o ti espone.', ...PAY },
  },
  'Raccogliere informazioni': {
    strong: { text: 'Scopri qualcosa di utile e preciso, e sai cosa fare dopo.', pick: 'tutte', options: [['+2 slancio', { slancio: 2 }]] },
    weak: { text: 'Scopri qualcosa, ma complica le cose o rivela un nuovo pericolo.', pick: 'tutte', options: [['+1 slancio', { slancio: 1 }]] },
    miss: { text: 'Scopri qualcosa di terribile, o la ricerca ti mette nei guai.', ...PAY },
  },
  Parlamentare: {
    strong: { text: 'Accetta, o ti dà quello che chiedi.', pick: 'tutte', options: [['+1 slancio', { slancio: 1 }]] },
    weak: { text: 'Accetta, ma vuole qualcosa in cambio. Decidi tu se accettare.' },
    miss: { text: 'Rifiuta, o chiede qualcosa che ti costa caro.', ...PAY },
  },
  'Intraprendere un viaggio': {
    strong: { text: 'Raggiungete un punto di sosta o una nuova area.', pick: 'Scegli uno', options: [['Usate bene le risorse: segna progresso', null], ['Andate veloci: segna progresso, +1 slancio e Subire una perdita di Scorte', { slancio: 1, scorte: 'perdita' }]] },
    weak: { text: 'Segnate progresso, ma consumate risorse.', pick: 'tutte', options: [['Subire una perdita di Scorte', { scorte: 'perdita' }]] },
    miss: { text: 'Il percorso si complica (strada sbagliata, maltempo, un incontro, un crollo).', ...PAY },
  },
  'Stringere un legame': {
    strong: { text: 'Scrivi il legame come una frase.', pick: 'Scegli uno', options: [['−1 Spirito (cancella un segmento)', { spirito: -1 }], ['+2 slancio', { slancio: 2 }]] },
    weak: { text: 'Prima chiedono qualcosa in più. Se lo fai (o giuri un voto per farlo), scrivi il legame.' },
    miss: { text: 'Rifiutano o vieni frainteso.', ...PAY },
  },
  Combattere: {
    strong: { text: 'Hai la meglio.', pick: 'Scegli due', options: COMBAT },
    weak: { text: 'Il nemico fa una mossa leggera.', pick: 'Scegli uno', options: COMBAT },
    miss: { text: 'Il nemico fa una mossa dura, e sei in difficoltà.' },
  },
  'Riposare (luogo selvaggio)': {
    strong: { text: 'Il riposo vi fa bene. Ogni personaggio sceglie per sé.', pick: 'Scegli due', options: WILD },
    weak: { text: 'Il riposo aiuta poco. Ogni personaggio sceglie per sé.', pick: 'Scegli uno', options: WILD },
    miss: { text: 'Il riposo viene interrotto o non porta sollievo.', ...PAY },
  },
  'Riposare (insediamento)': {
    strong: { text: 'Il soggiorno vi fa bene. Ogni personaggio sceglie per sé.', pick: 'Scegli due', options: TOWN },
    weak: { text: 'La comunità ha un problema e vi chiede aiuto. Ogni personaggio sceglie per sé.', pick: 'Scegli uno', options: TOWN },
    miss: { text: 'Succede qualcosa di grave durante il soggiorno.', ...PAY },
  },
  'Compiere un rito': {
    strong: { text: 'La magia funziona come volevi o comunque a tuo favore.' },
    weak: { text: 'La magia funziona, ma c\'è un costo.', pick: 'Scegli uno', options: [['Effetto più debole o più breve', null], ['Subire una perdita di Spirito', { spirito: 'perdita' }], ['Qualcosa di oscuro si accorge di te', null], ['Un effetto collaterale', null]] },
    miss: { text: 'La magia ti sfugge di mano, e il prezzo è strano o soprannaturale.', ...PAY },
  },
};

// Portare a termine, per tipo di tracciato.
export const FINISH_TEXTS = {
  voto: {
    strong: 'Il voto è compiuto. Guadagna esperienza (Pericoloso 1, Formidabile 2, Leggendario 3).',
    weak: "Il voto è compiuto, ma c'è dell'altro o la verità è diversa. Esperienza: 1 punto in meno.",
    miss: 'Il voto va in pezzi per un imprevisto. Riprovare (tieni il primo orologio, alza il grado) o Rinunciare (Subire una perdita di Spirito).',
  },
  viaggio: {
    strong: 'Arrivate e la situazione vi è favorevole. Scegli uno: subito un\'altra mossa con +1, +1 slancio, o un nuovo asset.',
    weak: "Arrivate, ma c'è un problema imprevisto.",
    miss: 'Vi siete persi, o la meta non è come pensavate. Riprovate o cambiate meta.',
  },
  scontro: {
    strong: "L'obiettivo è raggiunto. Decidete il destino dell'avversario.",
    weak: "L'obiettivo è raggiunto, ma scegli uno: qualcosa che volevi proteggere è perduto; il nemico fugge e tornerà; Subire una perdita di Salute; perdi o rompi un asset.",
    miss: 'Avete perso lo scontro. Pagare il prezzo con una conseguenza grave.',
  },
};
FINISH_TEXTS.luogo = FINISH_TEXTS.viaggio;

const PREZZO = [
  [2, 'Tira di nuovo e applica il risultato, peggiorato. Se esce ancora questo, succede qualcosa di terribile che cambia il corso del voto.'],
  [5, 'Una persona o una comunità di cui ti fidavi perde fiducia in te, o agisce contro di te.'],
  [9, 'Una persona o una comunità a cui tieni finisce in pericolo.'],
  [16, 'Vieni separato da qualcosa o da qualcuno.'],
  [23, 'La tua azione ha un effetto che non volevi.'],
  [32, 'Qualcosa di valore va perso o distrutto (anche un asset).'],
  [41, 'La situazione attuale peggiora.'],
  [50, 'Si rivela un nuovo pericolo o un nuovo nemico.'],
  [59, 'Perdi tempo o ti ritrovi in svantaggio.'],
  [68, 'Ti ferisci: Subire una perdita di Salute.'],
  [76, 'Ti spaventi o ti abbatti: Subire una perdita di Spirito.'],
  [85, 'Uno sviluppo inatteso complica il voto.'],
  [90, 'Sprechi risorse: Subire una perdita di Scorte.'],
  [94, 'Sei costretto ad agire contro le tue intenzioni.'],
  [98, 'Un amico o un alleato viene messo in pericolo.'],
  [100, 'Tira altre due volte: succedono entrambe le cose. Se esce lo stesso risultato, peggioralo.'],
];

const NEMICO = ['colpisce: devi Subire una perdita di Salute.', "ti disarma o spezza l'arma.", 'si gira contro un altro personaggio.',
  'ti spinge in un posto pericoloso: fuoco, bordo del burrone, acqua gelata.', "chiama aiuto: arriva un altro nemico. Cancellate l'ultimo orologio del tracciato.",
  'ti separa dal gruppo: nessuno può aiutarti finché non torni.', 'prende un ostaggio o qualcosa di prezioso.', 'ti terrorizza: devi Subire una perdita di Spirito.',
  'distrugge le vostre cose: devi Subire una perdita di Scorte.', 'cerca di fuggire: se nessuno lo ferma subito, lo scontro finisce senza un vincitore.'];
const MESTIERI = ['Cacciatore', 'Fabbro', 'Novizio di un tempio', 'Soldato disertore', 'Mercante ambulante', 'Guaritore', 'Contadino', 'Ladro', 'Cantastorie', 'Marinaio'];
const LEGAMI = ["___ mi ha salvato la vita, e non l'ho ancora ripagato.", '___ conosce un mio segreto.', 'Ho un debito con ___.', '___ e io veniamo dallo stesso villaggio.',
  'Non mi fido del tutto di ___, ma so che mi serve.', 'Ho giurato di proteggere ___.', '___ mi ha insegnato quello che so.', 'Ho tradito ___ una volta, e non lo sa.',
  'Ho promesso di riportare ___ a casa.', '___ mi ha visto piangere.'];
const ARMI = [['Spada', 'Ascia', 'Lancia', 'Arco', 'Pugnale', 'Mazza', 'Martello da guerra', 'Fionda', 'Falcetto', 'Bastone ferrato'],
  ['di metallo nero', "con l'impugnatura d'osso", 'con rune incise', 'di bronzo antico', 'con un nastro rosso legato', 'dal corpo di un nemico', 'di fattura straniera', 'con un nome inciso', 'dei tuoi antenati', 'con macchie che non vanno via']];
const STRUMENTI = [['Corda', 'Lanterna', 'Rampino', 'Mappa', 'Acciarino', 'Borsa del guaritore', 'Grimaldelli', 'Pala', 'Cannocchiale', 'Trappola da caccia'],
  ['di qualità eccellente', 'di un mercante straniero', "con le iniziali di qualcun altro", 'disegnata da te', 'con un difetto che conosci solo tu', 'del tuo vecchio maestro', 'da una tomba antica', 'da campo militare', 'in un astuccio di cuoio consumato', 'con un segno di riconoscimento']];
const RICORDI = [['Anello', 'Lettera', 'Ciocca di capelli', 'Moneta', 'Pendente', 'Bambola di stoffa', 'Libro di preghiere', 'Fischietto', 'Dente di lupo', 'Chiave'],
  ['di tua madre', 'di un amore perduto', 'di un compagno caduto', 'di un villaggio bruciato', 'di un nemico che ti ha risparmiato', 'del tuo primo voto', 'di qualcuno che stai cercando', 'di un debito mai pagato', 'di un luogo che non esiste più', "di cui non ricordi l'origine"]];
const PROBLEMI = ['Un bambino del villaggio è sparito nel bosco durante la notte.', 'Il pozzo è stato avvelenato e due persone sono già morte. (mistero)',
  "Un messaggero arriva ferito con una lettera per qualcuno che non c'è più.", 'I banditi chiedono un tributo entro tre giorni.',
  'Una luce si accende ogni notte nella torre abbandonata sulla collina.', 'Il guaritore del villaggio è stato trovato morto, senza ferite. (mistero)',
  'Il ponte è crollato e qualcosa ha attraversato il fiume prima che cadesse.', 'Ogni mattina troviamo una pecora sgozzata, sempre una sola. (mistero)',
  'Uno straniero offre molto oro a chi lo guida in un luogo che tutti evitano.', 'Il capo del villaggio è tornato dalla caccia, ma non sembra più lui. (mistero)'];
const AMBIENTI = ['Tumulo: tombe, ossa, corridoi stretti di pietra', 'Caverna: buio, acqua che gocciola, passaggi che si dividono', 'Miniera: gallerie puntellate, carrelli, attrezzi abbandonati',
  'Rovina: muri crollati, stanze senza tetto, iscrizioni consumate', 'Fortezza: mura, torri, porte sbarrate, camminamenti', 'Palude: fango, nebbia, isolotti, acqua ferma',
  'Bosco fitto: rovi, alberi enormi, sentieri che spariscono', 'Passo di montagna: vento, strapiombi, neve, rocce instabili', 'Grotta sul mare: marea che sale, alghe, relitti',
  'Sotterranei: celle, cantine, scale che scendono sotto un castello'];
const TEMI = ['Antico: trappole, meccanismi, segreti dimenticati', 'Corrotto: magia oscura, malattia, cose che non dovrebbero vivere', 'Presidiato: guardie, sentinelle, qualcuno che lo difende',
  'Sacro: riti, guardiani, la collera di un dio', 'Stregato: spiriti, voci, cose che si muovono da sole', 'Brulicante: insetti, ratti, nidi di bestie',
  'Devastato: crolli, incendi, i resti di una battaglia', 'Selvaggio: animali feroci, la natura che si riprende tutto', 'Allagato: acqua che sale, correnti, cose sommerse',
  'Abbandonato: qualcuno è andato via in fretta, e non sappiamo perché'];

// Ogni tabella: (d) => { dice, text }, dove d(n) tira un dado da n facce.
const d10 = (list) => (d) => { const n = d(10); return { dice: `d10 ${n}`, text: list[n - 1] }; };
const pair = ([a, b]) => (d) => { const x = d(10), y = d(10); return { dice: `d10 ${x} + ${y}`, text: `${a[x - 1]} ${b[y - 1]}` }; };

export const TABLES = {
  'Pagare il prezzo': (d) => { const n = d(100); return { dice: `d100 ${n}`, text: PREZZO.find(([max]) => n <= max)[1] }; },
  'Mosse del nemico': (d) => { const n = d(10); return { dice: `d10 ${n}`, text: `Il nemico ${NEMICO[n - 1]}` }; },
  Mestieri: d10(MESTIERI),
  'Legami iniziali': d10(LEGAMI),
  Armi: pair(ARMI),
  Strumenti: pair(STRUMENTI),
  Ricordi: pair(RICORDI),
  'Il problema': d10(PROBLEMI),
  'Luogo pericoloso': (d) => { const x = d(10), y = d(10); return { dice: `d10 ${x} + ${y}`, text: `${AMBIENTI[x - 1]}. ${TEMI[y - 1]}.` }; },
};

// Le tabelle per intero, come nel Google Doc: ogni tabella ha intestazioni e righe [dado, …celle].
const d10rows = (...cols) => cols[0].map((_, i) => [String(i + 1), ...cols.map((c) => c[i])]);
const split = (list) => [list.map((t) => t.split(': ')[0]), list.map((t) => { const r = t.split(': ')[1]; return r[0].toUpperCase() + r.slice(1); })];
export const TABLE_INFO = {
  'Pagare il prezzo': [{ cols: ['d100', 'Il prezzo'], rows: PREZZO.map(([max, t], i) => [`${i ? PREZZO[i - 1][0] + 1 : 1}–${max}`, t]) }],
  'Mosse del nemico': [{ cols: ['d10', 'Il nemico…'], rows: d10rows(NEMICO) }],
  Mestieri: [{ cols: ['d10', 'Mestiere'], rows: d10rows(MESTIERI) }],
  'Legami iniziali': [{ cols: ['d10', 'Legame'], rows: d10rows(LEGAMI) }],
  Armi: [{ cols: ['d10', 'Oggetto', 'Dettaglio'], rows: d10rows(...ARMI) }],
  Strumenti: [{ cols: ['d10', 'Oggetto', 'Dettaglio'], rows: d10rows(...STRUMENTI) }],
  Ricordi: [{ cols: ['d10', 'Oggetto', 'Dettaglio'], rows: d10rows(...RICORDI) }],
  'Il problema': [{ cols: ['d10', 'Il problema'], rows: d10rows(PROBLEMI) }],
  'Luogo pericoloso': [
    { cols: ['d10', 'Ambiente', 'Cosa troviamo'], rows: d10rows(...split(AMBIENTI)) },
    { cols: ['d10', 'Tema', 'Il pericolo'], rows: d10rows(...split(TEMI)) },
  ],
};

// Quando si usa ogni mossa, alla lettera dal Google Doc (sezione 4); "when" = la frase in corsivo nel Doc, "note" = le righe dopo gli esiti.
export const MOVE_TRIGGERS = {
  'Giurare sul Ferro': { when: "Quando giuri di portare a termine un'impresa", text: "Quando giuri di portare a termine un'impresa, tocca un pezzo di ferro (la lama della tua arma, un anello, un chiodo, il ferro di cavallo sopra una porta) e pronuncia il voto ad alta voce, in prima persona. Decidi il grado (Pericoloso, Formidabile, Leggendario), disegna il primo orologio del tracciato e tira +Animo." },
  'Sfidare il pericolo': { when: "Quando tenti qualcosa di rischioso o reagisci a una minaccia imminente", text: 'Quando tenti qualcosa di rischioso o reagisci a una minaccia imminente, descrivi come e tira:', list: ['+Fisico con forza, velocità, precisione o resistenza;', '+Animo con coraggio, volontà o empatia;', '+Ingegno con astuzia, conoscenza o osservazione.'] },
  "Preparare l'azione": { when: "Quando ti prepari prima di agire", text: "Quando ti prepari prima di agire (studi la situazione, tendi una trappola o ti metti in posizione), descrivi come e tira:", list: ['+Fisico con forza, velocità, precisione o resistenza;', '+Animo con coraggio, volontà o empatia;', '+Ingegno con astuzia, conoscenza o osservazione.'],
    note: "Armi da tiro. In uno scontro, tirare con l'arco o con la fionda è questa mossa con +Fisico: copri un alleato e il +1 va a lui." },
  'Raccogliere informazioni': { when: "Quando cerchi di capire qualcosa del mondo", text: 'Quando cerchi di capire qualcosa del mondo (esamini un luogo, fai domande, segui una traccia, indaghi su un fatto), descrivi come e tira:', list: ['+Ingegno se osservi, esplori o studi;', '+Animo se chiedi in giro.'],
    note: 'Se quello che scopri è un passo avanti importante nel voto, possiamo Raggiungere una tappa.' },
  Parlamentare: { when: "Quando cerchi di convincere qualcuno a fare qualcosa", text: 'Quando cerchi di convincere qualcuno a fare qualcosa tira in base a come lo fai:', list: ['+Fisico se lo fai ricorrendo a minacce o violenza;', '+Animo se interagisci in maniera amichevole;', '+Ingegno se lo fai ricorrendo ad astuzia, fascino o dialettica.'] },
  'Intraprendere un viaggio': { when: "Quando viaggi verso un luogo lontano o esplori un luogo pericoloso", text: 'Quando viaggi verso un luogo lontano o esplori un luogo pericoloso (una rovina, una caverna, una fortezza), decidi il grado e disegna il primo orologio del tracciato. Per ogni tratto di strada o area da attraversare, un giocatore guida il gruppo e tira +Ingegno.',
    note: 'Quando pensate di essere vicini alla meta, potete Portare a termine.' },
  'Stringere un legame': { when: "Quando passi del tempo con una persona o una comunità", text: 'Quando passi del tempo con una persona o una comunità, la aiuti o condividi con lei un momento importante, tira +Animo.' },
  Combattere: { when: "Quando sei in vantaggio e attacchi un avversario corpo a corpo", text: 'Quando sei in vantaggio e attacchi un avversario corpo a corpo, tira +Fisico.', note: 'Quando pensi di avere il nemico in pugno, puoi Portare a termine.' },
  'Riposare (luogo selvaggio)': { when: "Quando vi fermate a riposare", text: 'Quando vi fermate a riposare, e siete in… …un luogo selvaggio. Un giocatore tira +Scorte.' },
  'Riposare (insediamento)': { when: "Quando vi fermate a riposare", text: 'Quando vi fermate a riposare, e siete in… …un insediamento. Un giocatore tira +Animo; se qualcuno ha un legame con quella comunità, tira lui e aggiunge +1.' },
  'Compiere un rito': { when: "Quando cerchi di piegare il mondo con la magia", text: "Quando cerchi di piegare il mondo con la magia (leggere un presagio, parlare con un morto, sciogliere una maledizione minore, chiamare la nebbia), spiega cosa vuoi ottenere e cosa usi: un oggetto, delle parole, un'offerta, il tuo sangue. Tira +Animo.",
    note: "Grande magia. Se quello che vuoi è troppo grande per una scena (riportare in vita qualcuno, spezzare la maledizione di un villaggio, chiudere un passaggio tra i mondi), non si tira. Giuri sul Ferro un voto Formidabile o Leggendario. Poi scegliete insieme da 1 a 3 requisiti, oppure chiedete all'oracolo: un luogo dove compiere il rito, qualcosa da procurarsi, un prezzo da pagare. Non potete tentare Portare a termine finché tutti i requisiti non sono soddisfatti. Quando il rito riesce, la magia accade." },
};
