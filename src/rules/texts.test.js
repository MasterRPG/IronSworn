import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOVE_TEXTS, TABLES } from './texts.js';
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
