import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionRoll, progressRoll, oracle } from './dice.js';

test("esempio del regolamento: Fisico 2, d6 4, sfida 3 e 8 = successo parziale", () => {
  const r = actionRoll({ stat: 2 }, { d6: 4, c1: 3, c2: 8 });
  assert.equal(r.score, 6);
  assert.equal(r.outcome, 'weak');
});

test('il pareggio non batte il dado sfida', () => {
  assert.equal(actionRoll({ stat: 2 }, { d6: 4, c1: 6, c2: 6 }).outcome, 'miss');
});

test('il punteggio azione non supera 10', () => {
  const r = actionRoll({ stat: 4, adds: 3 }, { d6: 6, c1: 10, c2: 9 });
  assert.equal(r.score, 10);
  assert.equal(r.outcome, 'weak');
});

test('slancio -3 e d6 che fa 3: il d6 vale 0', () => {
  const r = actionRoll({ stat: 2, momentum: -3 }, { d6: 3, c1: 1, c2: 5 });
  assert.equal(r.d6Value, 0);
  assert.equal(r.score, 2);
  assert.equal(r.outcome, 'weak');
});

test('doppio sui dadi sfida', () => {
  assert.equal(actionRoll({ stat: 1 }, { d6: 1, c1: 7, c2: 7 }).match, true);
});

test('bruciare lo slancio conta battuti i dadi più bassi dello slancio, poi torna a +2', () => {
  const r = actionRoll({ stat: 1, momentum: 8 }, { d6: 2, c1: 5, c2: 7 });
  assert.equal(r.outcome, 'miss');
  assert.deepEqual(r.burn, { outcome: 'strong', newMomentum: 2 });
});

test('niente proposta di bruciare se non migliora o se lo slancio non è positivo', () => {
  assert.equal(actionRoll({ stat: 1, momentum: 5 }, { d6: 2, c1: 5, c2: 9 }).burn, null);
  assert.equal(actionRoll({ stat: 1, momentum: 0 }, { d6: 1, c1: 1, c2: 9 }).burn, null);
});

test('Portare a termine conta solo gli orologi completi', () => {
  assert.equal(progressRoll({ clocks: 6 }, { c1: 3, c2: 8 }).outcome, 'weak');
  assert.equal(progressRoll({ clocks: 6 }, { c1: 6, c2: 2 }).outcome, 'weak');
});

test('oracolo: 00 vale 100, soglie e doppi', () => {
  const r = oracle({ odds: 'quasiImpossibile' }, { tens: 0, units: 0 });
  assert.equal(r.value, 100);
  assert.equal(r.yes, true);
  assert.equal(r.match, true);
  assert.equal(oracle({ odds: 'probabile' }, { tens: 3, units: 4 }).yes, true); // esempio del regolamento
  assert.equal(oracle({ odds: 'probabile' }, { tens: 2, units: 5 }).yes, false);
});
