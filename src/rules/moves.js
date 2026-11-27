// Mosse con tiro azione e statistiche ammesse, dal Google Doc "Ironsworn".
// Gli esiti con i pulsanti arrivano nella fase 3.
export const STATS = { fisico: 'Fisico', animo: 'Animo', ingegno: 'Ingegno', scorte: 'Scorte' };

const ALL = ['fisico', 'animo', 'ingegno'];

export const ACTION_MOVES = [
  { name: 'Giurare sul Ferro', stats: ['animo'] },
  { name: 'Sfidare il pericolo', stats: ALL },
  { name: "Preparare l'azione", stats: ALL },
  { name: 'Raccogliere informazioni', stats: ['ingegno', 'animo'] },
  { name: 'Parlamentare', stats: ALL },
  { name: 'Intraprendere un viaggio', stats: ['ingegno'] },
  { name: 'Stringere un legame', stats: ['animo'] },
  { name: 'Combattere', stats: ['fisico'] },
  { name: 'Riposare (luogo selvaggio)', stats: ['scorte'] },
  { name: 'Riposare (insediamento)', stats: ['animo'] },
  { name: 'Compiere un rito', stats: ['animo'] },
];
