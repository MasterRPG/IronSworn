import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markProgress, completeClocks, retry } from './progress.js';

test('progresso per grado: 8, 4, 2 segmenti, massimo 10 orologi', () => {
  assert.equal(markProgress(0, 'Pericoloso'), 8);
  assert.equal(markProgress(3, 'Formidabile'), 7);
  assert.equal(markProgress(39, 'Leggendario'), 40);
});

test('contano solo gli orologi completi', () => {
  assert.equal(completeClocks(7), 1);
  assert.equal(completeClocks(24), 6);
});

test('Riprovare tiene il primo orologio e alza il grado, non oltre Leggendario', () => {
  assert.deepEqual(retry({ segmenti: 22, grado: 'Formidabile' }), { segmenti: 4, grado: 'Leggendario' });
  assert.deepEqual(retry({ segmenti: 2, grado: 'Leggendario' }), { segmenti: 2, grado: 'Leggendario' });
});
