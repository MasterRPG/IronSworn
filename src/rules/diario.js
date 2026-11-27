// Diario delle sessioni: eventi dei tracciati nel registro, divisione per scena e riepilogo.
import { KINDS, completeClocks } from './progress.js';

// Le modifiche di un tracciato che finiscono nel registro (non i nomi né le posizioni dello scontro).
export function trackEvents(t, patch) {
  const ev = (cosa, da, a) => ({ kind: 'track', trackId: t.id, tipo: t.tipo, nome: patch.nome ?? t.nome, minaccia: patch.minaccia ?? t.minaccia, cosa, da, a });
  const out = [];
  const has = (k) => k in patch && patch[k] !== t[k];
  if (has('segmenti')) out.push(ev('progresso', t.segmenti, patch.segmenti));
  if (has('grado')) out.push(ev('grado', t.grado, patch.grado));
  if (has('minaccia')) out.push(ev(patch.minaccia === null ? 'minaccia tolta' : 'nuova minaccia'));
  else if (has('minaccia_segmenti')) out.push(ev('minaccia', t.minaccia_segmenti, patch.minaccia_segmenti));
  if (has('chiuso')) out.push(ev(patch.chiuso ? 'chiuso' : 'riaperto'));
  return out;
}

const of = (r) => `${KINDS[r.tipo] ?? 'Tracciato'} «${r.nome}»`;
export function trackText(r) {
  switch (r.cosa) {
    case 'progresso': return `${of(r)}: progresso da ${r.da} a ${r.a} segmenti (${completeClocks(r.a) === 1 ? '1 orologio completo' : `${completeClocks(r.a)} orologi completi`})`;
    case 'minaccia': return `Minaccia «${r.minaccia}» del voto «${r.nome}»: da ${r.da}/6 a ${r.a}/6`;
    case 'nuova minaccia': return `Nuova minaccia sul voto «${r.nome}»: ${r.minaccia}`;
    case 'minaccia tolta': return `Tolta la minaccia «${r.minaccia}» dal voto «${r.nome}»`;
    case 'grado': return `${of(r)}: grado da ${r.da} a ${r.a}`;
    case 'nuovo': return `Nuovo: ${of(r)}, ${r.a}`;
    case 'chiuso': return `${of(r)}: chiuso`;
    case 'riaperto': return `${of(r)}: riaperto`;
    case 'eliminato': return `${of(r)}: eliminato`;
    default: return of(r);
  }
}

// Righe del registro in ordine di tempo → scene: [{ scena, voto, rows }]. Prima del primo segno di scena: scena null.
export function splitScenes(rows) {
  const scenes = [];
  let cur = { scena: null, voto: null, rows: [] };
  for (const row of rows) {
    if (row.result.kind !== 'scene') { cur.rows.push(row); continue; }
    if (cur.scena || cur.rows.length) scenes.push(cur);
    cur = { scena: row.result.scena, voto: row.result.voto ?? null, rows: [] };
  }
  if (cur.scena || cur.rows.length) scenes.push(cur);
  return scenes;
}

// Esiti delle mosse (contando lo slancio usato) e avanzamenti, sommati: da com'era la prima volta a com'è l'ultima.
export function summary(rows) {
  const esiti = { strong: 0, weak: 0, miss: 0 };
  const burns = new Map(rows.filter((r) => r.result.kind === 'burn').map((r) => [r.result.of, r.result.outcome]));
  const changes = new Map();
  rows.forEach(({ id, result: r }, i) => {
    if ((r.kind === 'action' || r.kind === 'progress') && !r.pending && r.outcome) esiti[burns.get(id) ?? r.outcome]++;
    if (r.kind !== 'track') return;
    const key = r.cosa === 'progresso' || r.cosa === 'minaccia' ? `${r.trackId}:${r.cosa}` : i;
    const prev = changes.get(key);
    changes.set(key, prev ? { ...r, da: prev.da } : r);
  });
  return { esiti, avanzamenti: [...changes.values()].filter((c) => c.da === undefined || c.da !== c.a) };
}
