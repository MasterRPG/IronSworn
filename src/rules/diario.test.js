import test from 'node:test';
import assert from 'node:assert/strict';
import { trackEvents, splitScenes, summary, trackText, charEvents } from './diario.js';

const vow = { id: 7, tipo: 'voto', nome: 'Il pozzo', segmenti: 8, grado: 'Pericoloso', minaccia: 'Il bosco', minaccia_segmenti: 2, chiuso: false };

test('solo le modifiche che contano finiscono nel registro', () => {
  assert.deepEqual(trackEvents(vow, { posizioni: {} }), []);
  assert.deepEqual(trackEvents(vow, { segmenti: 16 }).map((e) => [e.cosa, e.da, e.a]), [['progresso', 8, 16]]);
  assert.deepEqual(trackEvents(vow, { minaccia: null, minaccia_segmenti: 0 }).map((e) => e.cosa), ['minaccia tolta']);
  assert.equal(trackEvents(vow, { minaccia_segmenti: 3 })[0].minaccia, 'Il bosco');
});

const row = (id, result) => ({ id, result });
test('divide per scena e somma gli avanzamenti', () => {
  const rows = [
    row(1, { kind: 'note', testo: 'prima' }),
    row(2, { kind: 'scene', scena: 'Al pozzo' }),
    row(3, { kind: 'action', outcome: 'miss' }),
    row(4, { kind: 'burn', of: 3, outcome: 'weak' }),
    row(5, { kind: 'track', trackId: 7, cosa: 'progresso', da: 8, a: 16 }),
    row(6, { kind: 'track', trackId: 7, cosa: 'progresso', da: 16, a: 24 }),
    row(7, { kind: 'track', trackId: 7, cosa: 'minaccia', da: 2, a: 3 }),
    row(8, { kind: 'track', trackId: 7, cosa: 'minaccia', da: 3, a: 2 }),
    row(9, { kind: 'scene', scena: 'Nel bosco' }),
  ];
  const scenes = splitScenes(rows);
  assert.deepEqual(scenes.map((s) => [s.scena, s.rows.length]), [[null, 1], ['Al pozzo', 6], ['Nel bosco', 0]]);
  const s = summary(scenes[1].rows);
  assert.deepEqual(s.esiti, { strong: 0, weak: 1, miss: 0 });
  assert.deepEqual(s.avanzamenti.map((c) => [c.cosa, c.da, c.a]), [['progresso', 8, 24]]);
  assert.match(trackText({ ...vow, ...s.avanzamenti[0] }), /da 8 a 24 segmenti \(6 orologi/);
});

test('i cambi alla scheda diventano righe leggibili', () => {
  const o = { nome: 'Karsa', salute: 1, spirito: 0, slancio: 2, esperienza: 3, stats: { fisico: 2, animo: 1, ingegno: 1 },
    cicatrici: ['', '', ''], orrori: ['', '', ''], legami: [{ con: 'Cassandra', testo: 'Le devo la vita' }], asset: [{ testo: 'Arco', stato: 'OK' }] };
  assert.deepEqual(charEvents(o, { ...o, aspetto: 'alto' }), []);
  const n = { ...o, salute: 2, esperienza: 4, cicatrici: ['Occhio sfregiato', '', ''], legami: [], asset: [{ testo: 'Arco', stato: 'Rotto' }, { testo: 'Lancia' }] };
  assert.deepEqual(charEvents(o, n).map((e) => e.testo), [
    'Salute da 1/6 a 2/6 (danno)', 'Esperienza da 3 a 4', 'Nuova cicatrice: Occhio sfregiato',
    'Legame tolto: Cassandra: Le devo la vita', 'Nuovo asset: Lancia', 'Asset «Arco»: Rotto',
  ]);
});
