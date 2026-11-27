import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveStats, emptyCharacter } from './character.js';

const with_ = (patch) => ({ ...emptyCharacter(), stats: { fisico: 2, animo: 1, ingegno: 3 }, ...patch });

test('nessun malus con una sola cicatrice o un solo orrore', () => {
  assert.deepEqual(effectiveStats(with_({ cicatrici: ['zoppo', '', ''], orrori: ['buio', '', ''] })), { fisico: 2, animo: 1, ingegno: 3 });
});

test('seconda cicatrice −1 Fisico, secondo orrore −1 Animo; la terza non aggiunge altro', () => {
  const c = with_({ cicatrici: ['a', 'b', 'c'], orrori: ['x', 'y', ''] });
  assert.deepEqual(effectiveStats(c), { fisico: 1, animo: 0, ingegno: 3 });
});

test('una statistica non scende sotto 0', () => {
  const c = with_({ stats: { fisico: 0, animo: 0, ingegno: 1 }, cicatrici: ['a', 'b', ''], orrori: ['x', 'y', ''] });
  assert.deepEqual(effectiveStats(c), { fisico: 0, animo: 0, ingegno: 1 });
});
