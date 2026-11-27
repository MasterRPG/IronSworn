// Scheda del personaggio, dalle regole del Google Doc "Ironsworn" (con la correzione sugli orrori).

export const RANKS = ['Pericoloso', 'Formidabile', 'Leggendario'];
export const ASSET_TYPES = ['Arma', 'Strumento', 'Ricordo', 'Altro'];

export const LIMITS = { stat: [0, 4], clock: [0, 6], slancio: [-6, 10], scorte: [0, 5] };
export const clamp = (v, [min, max]) => Math.max(min, Math.min(max, Number(v) || 0));

export const emptyCharacter = () => ({
  nome: '', giocatore: '', aspetto: '', mestiere: '', passato: '',
  stats: { fisico: 1, animo: 2, ingegno: 3 },
  salute: 0, spirito: 0, slancio: 2, esperienza: 0,
  cicatrici: ['', '', ''], orrori: ['', '', ''],
  legami: [], asset: [],
  voto: { testo: '', grado: 'Leggendario', ferro: '' },
});

// Cicatrici e orrori non si tolgono mai: dal secondo, −1 a Fisico (cicatrici) o Animo (orrori). Mai sotto 0.
export function effectiveStats(c) {
  const marked = (list) => list.filter((s) => s.trim()).length;
  return {
    fisico: Math.max(0, c.stats.fisico - (marked(c.cicatrici) >= 2 ? 1 : 0)),
    animo: Math.max(0, c.stats.animo - (marked(c.orrori) >= 2 ? 1 : 0)),
    ingegno: c.stats.ingegno,
  };
}
