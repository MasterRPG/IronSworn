// Regole dei tiri, dal Google Doc "Ironsworn" del gruppo.
// Funzioni pure: i dadi arrivano da fuori, così si possono testare.

export const d = (sides, rng = Math.random) => 1 + Math.floor(rng() * sides);

export const OUTCOMES = {
  strong: 'Successo pieno',
  weak: 'Successo parziale',
  miss: 'Fallimento',
};

const outcomeOf = (beaten) => (beaten === 2 ? 'strong' : beaten === 1 ? 'weak' : 'miss');

// Tiro azione: d6 + statistica + bonus, massimo 10; batte un dado sfida solo se è più alto.
export function actionRoll({ stat, adds = 0, momentum = 2 }, dice) {
  const { d6, c1, c2 } = dice;
  // Slancio negativo: se il d6 fa lo stesso numero (senza segno), vale 0.
  const d6Value = momentum < 0 && d6 === -momentum ? 0 : d6;
  const score = Math.min(10, d6Value + stat + adds);
  const beaten = (score > c1) + (score > c2);
  const result = {
    kind: 'action',
    stat, adds, momentum, d6, d6Value, score, c1, c2,
    match: c1 === c2,
    outcome: outcomeOf(beaten),
    burn: null,
  };
  // Usare lo slancio (sempre possibile se positivo): ogni dado sfida più basso dello slancio conta come battuto.
  if (momentum > 0) {
    const burned = (score > c1 || momentum > c1) + (score > c2 || momentum > c2);
    result.burn = { outcome: outcomeOf(burned), newMomentum: 2 };
  }
  return result;
}

// Portare a termine: conta solo gli orologi completi, niente d6, niente bonus, niente slancio.
export function progressRoll({ clocks }, dice) {
  const { c1, c2 } = dice;
  const score = Math.max(0, Math.min(10, clocks));
  return {
    kind: 'progress',
    score, c1, c2,
    match: c1 === c2,
    outcome: outcomeOf((score > c1) + (score > c2)),
  };
}

export const ODDS = [
  { key: 'quasiCerto', label: 'Quasi certo', min: 11 },
  { key: 'probabile', label: 'Probabile', min: 26 },
  { key: 'cinquanta', label: '50 e 50', min: 51 },
  { key: 'improbabile', label: 'Improbabile', min: 76 },
  { key: 'quasiImpossibile', label: 'Quasi impossibile', min: 91 },
];

// Oracolo: due d10 come d100 (decine e unità, 00 = 100); doppio = risposta estrema.
export function oracle({ odds, question = '' }, dice) {
  const { tens, units } = dice; // 0-9 ciascuno
  const value = tens * 10 + units || 100;
  const { min, label } = ODDS.find((o) => o.key === odds);
  return { kind: 'oracle', question, odds, oddsLabel: label, value, yes: value >= min, match: tens === units };
}

export const rollDice = {
  action: (rng) => ({ d6: d(6, rng), c1: d(10, rng), c2: d(10, rng) }),
  progress: (rng) => ({ c1: d(10, rng), c2: d(10, rng) }),
  oracle: (rng) => ({ tens: d(10, rng) - 1, units: d(10, rng) - 1 }),
};
