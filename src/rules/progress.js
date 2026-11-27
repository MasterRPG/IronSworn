// Tracciati e minacce, dal Google Doc "Ironsworn": orologi da 4 segmenti, al massimo 10.
export const RANK_STEP = { Pericoloso: 8, Formidabile: 4, Leggendario: 2 };
export const RANKS = Object.keys(RANK_STEP);
export const MAX_SEGMENTS = 40;
export const THREAT_SIZE = 6;

export const KINDS = { voto: 'Voto', viaggio: 'Viaggio', scontro: 'Scontro', luogo: 'Luogo pericoloso' };

// "Segna progresso" o "Raggiungere una tappa": riempie i segmenti secondo il grado.
export const markProgress = (segments, grado) => Math.min(MAX_SEGMENTS, segments + RANK_STEP[grado]);

// Portare a termine conta solo gli orologi completi.
export const completeClocks = (segments) => Math.floor(segments / 4);

// Riprovare dopo un fallimento: tieni solo il primo orologio e alza il grado di uno.
export const retry = ({ segmenti, grado }) => ({
  segmenti: Math.min(segmenti, 4),
  grado: RANKS[Math.min(RANKS.length - 1, RANKS.indexOf(grado) + 1)],
});

// Minacce di un voto: [{ id, nome, segmenti }], ognuna da 0 a 6.
export const addThreat = (minacce, nome, segmenti = 0) => [...minacce, { id: Math.max(0, ...minacce.map((m) => m.id)) + 1, nome, segmenti }];
export const setThreat = (minacce, id, segmenti) => minacce.map((m) => (m.id === id ? { ...m, segmenti: Math.max(0, Math.min(THREAT_SIZE, segmenti)) } : m));
