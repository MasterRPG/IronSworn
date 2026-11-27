import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE_TEXTS, MOVE_TRIGGERS, TABLES, TABLE_INFO } from './texts.js';
import { ACTION_MOVES } from './moves.js';

test('ogni mossa con tiro azione ha i tre esiti', () => {
  for (const m of ACTION_MOVES) for (const o of ['strong', 'weak', 'miss']) {
    const e = MOVE_TEXTS[m.name]?.[o];
    assert.ok(e?.text, `${m.name} ${o}`);
    for (const [label, fx] of e.options ?? []) assert.ok(label && fx !== undefined && e.pick, `${m.name} ${o} ${label}`);
  }
});

test('ogni tabella dà un testo anche ai bordi del dado', () => {
  for (const [name, roll] of Object.entries(TABLES)) {
    for (const edge of [1, 'max']) {
      const r = roll((n) => (edge === 1 ? 1 : n));
      assert.ok(r.text && !r.text.includes('undefined'), `${name} ${edge}`);
    }
  }
  assert.equal(TABLES['Pagare il prezzo'](() => 33).text, 'La situazione attuale peggiora.');
});

test('ogni tabella si può leggere per intero', () => {
  for (const name of Object.keys(TABLES)) {
    for (const t of TABLE_INFO[name]) assert.ok(t.rows.length >= 10 && t.rows.every((r) => r.length === t.cols.length && r.every(Boolean)), name);
  }
  assert.deepEqual(TABLE_INFO['Pagare il prezzo'][0].rows[1], ['3–5', 'Una persona o una comunità di cui ti fidavi perde fiducia in te, o agisce contro di te.']);
  assert.deepEqual(TABLE_INFO['Luogo pericoloso'][0].rows[0], ['1', 'Tumulo', 'Tombe, ossa, corridoi stretti di pietra']);
});

test('ogni mossa dice quando si usa', () => {
  for (const m of ACTION_MOVES) {
    const t = MOVE_TRIGGERS[m.name];
    assert.ok(t?.when.startsWith('Quando ') && t.text.startsWith(t.when), m.name);
  }
});
