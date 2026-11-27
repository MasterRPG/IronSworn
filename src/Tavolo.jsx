import { useEffect, useState } from 'react';
import Lightbox from './Lightbox.jsx';
import { Info } from './Layer.jsx';
import { ACTION_MOVES, STATS } from './rules/moves.js';
import { LIMITS, clamp, effectiveStats } from './rules/character.js';
import { OUTCOMES, d } from './rules/dice.js';
import { MOVE_TEXTS, MOVE_TRIGGERS, FINISH_TEXTS, TABLES, TABLE_INFO } from './rules/texts.js';
import { KINDS, RANK_STEP, THREAT_SIZE, completeClocks, markProgress, setThreat } from './rules/progress.js';
import { trackText } from './rules/diario.js';

// Un tiro appena arrivato mostra i dadi che rotolano per un attimo, per tutti al tavolo.
export const SUSPENSE_MS = 1500;

export const Segs = ({ n, size = 6, threat }) => (
  <span className={`segs${threat ? ' threat' : ''}`} role="img" aria-label={`${n} su ${size}`}>
    {Array.from({ length: size }, (_, i) => <span key={i} className={i < n ? 'seg f' : 'seg'} />)}
  </span>
);

// Una minaccia: segmenti gialli e n/6; con onSet anche i pulsanti − e +.
export function ThreatMeter({ m, onSet }) {
  return <>
    <div className="meter"><span>Minaccia</span><Segs n={m.segmenti} threat /><span>{m.segmenti}/6</span>
      {onSet && <span className="row push"><button className="ghost small" aria-label={`Abbassa la minaccia ${m.nome}`} onClick={() => onSet(m.segmenti - 1)} disabled={m.segmenti <= 0}>−</button>
        <button className="ghost small" aria-label={`Avanza la minaccia ${m.nome}`} onClick={() => onSet(m.segmenti + 1)} disabled={m.segmenti >= THREAT_SIZE}>+</button></span>}</div>
    {m.segmenti >= THREAT_SIZE && <p className="warn">La minaccia si compie: raccontatela, poi alzate il grado del voto o rinunciate.</p>}
  </>;
}

// 10 orologi da 4 segmenti.
export const Boxes = ({ segmenti }) => (
  <span className="progress" role="img" aria-label={`${segmenti} segmenti, ${completeClocks(segmenti)} orologi completi su 10`}>
    {Array.from({ length: 10 }, (_, b) => (
      <span key={b} className="box">{[0, 1, 3, 2].map((q) => <span key={q} className={b * 4 + q < segmenti ? 'f' : ''} />)}</span>
    ))}
  </span>
);

// Un dado che gira mostrando numeri a caso finché "spin" è vero.
function Die({ value, sides = 6, spin, cls = '' }) {
  const [shown, setShown] = useState(value ?? 1);
  useEffect(() => {
    if (!spin) return setShown(value);
    const t = setInterval(() => setShown(d(sides)), 80);
    return () => clearInterval(t);
  }, [spin, value, sides]);
  const face = <span>{shown}</span>;
  return <span className={`die${sides === 10 ? ' d10' : ''}${spin ? ' spin' : ''} ${cls}`} aria-hidden={spin}>{face}</span>;
}

// "d6" mentre rotola il d6, "sfida" mentre rotolano i dadi sfida, poi null.
function usePhase(row) {
  const key = row ? `${row.id}:${row.result.pending ? 'p' : 'c'}` : '';
  const [last, setLast] = useState(key);
  const [phase, setPhase] = useState(null);
  if (key !== last) {
    setLast(key);
    setPhase(row?.fresh ? (row.result.pending ? 'd6' : 'sfida') : null);
  }
  useEffect(() => {
    if (!phase) return;
    const t = setTimeout(() => setPhase(null), SUSPENSE_MS);
    return () => clearTimeout(t);
  }, [phase, last]);
  return phase;
}

const BONUS = ['Asset', 'Legame', 'Aiutato da un compagno', "Preparato l'azione"];
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const pendingScore = (r) => Math.min(10, (r.momentum < 0 && r.d6 === -r.momentum ? 0 : r.d6) + r.stat + (r.adds || 0));

export default function Tavolo({ chars, uid, me, scorte, scene, tracks, rolls, act }) {
  const sceneVow = tracks.find((t) => t.id === scene.scena_voto);
  return (
    <div className="table-grid">
      <div className="party-col"><Party chars={chars} uid={uid} scorte={scorte} onScorte={(s) => act.saveParty({ scorte: clamp(s, LIMITS.scorte) })} /></div>
      <div><RollPanel me={me} uid={uid} scorte={scorte} scene={scene} sceneVow={sceneVow} tracks={tracks} rolls={rolls} act={act} /></div>
      <div>
        {sceneVow && <SceneVow t={sceneVow} />}
        <Log rolls={rolls} uid={uid} me={me} act={act} />
      </div>
    </div>
  );
}

function Party({ chars, uid, scorte, onScorte }) {
  return (
    <section aria-label="Compagnia">
      <h2 className="section-title">Compagnia</h2>
      <div className="stack">
        {chars.map(({ id, owner, data: c }) => {
          const eff = effectiveStats(c);
          const marks = (l) => l.filter((s) => s.trim()).length;
          return (
            <div key={id} className={`pc${owner === uid ? ' mine' : ''}${c.immagine ? ' with-img' : ''}`}>
              {c.immagine && <Lightbox className="pc-img" src={c.immagine} full={c.immagine_intera} alt={`Ritratto di ${c.nome}`} />}
              <div className="pc-body">
              <div className="pc-head"><b className="grow">{c.nome}</b><span className="muted small-text">{c.giocatore}</span></div>
              <div className="pc-stats"><span>Fisico <b>{eff.fisico}</b></span><span>Animo <b>{eff.animo}</b></span><span>Ingegno <b>{eff.ingegno}</b></span></div>
              <div className="meter"><span>Salute</span><Segs n={c.salute} /><span>{c.salute}/6</span></div>
              <div className="meter"><span>Spirito</span><Segs n={c.spirito} /><span>{c.spirito}/6</span></div>
              <div className="pc-stats"><span>Slancio <b>{signed(c.slancio)}</b></span><span>Cicatrici {marks(c.cicatrici)}/3 · Orrori {marks(c.orrori)}/3</span></div>
              {(c.salute >= 4 || c.spirito >= 4) && <p className="warn">Salute o Spirito a 4+: niente slancio guadagnato</p>}
              </div>
            </div>
          );
        })}
        <div className="pc scorte">
          <div className="grow"><p className="label">Scorte del gruppo</p><span className="big">{scorte}</span><span className="muted"> / 5</span></div>
          <button className="ghost" onClick={() => onScorte(scorte - 1)} aria-label="Togli una Scorta" disabled={scorte <= 0}>−</button>
          <button className="ghost" onClick={() => onScorte(scorte + 1)} aria-label="Aggiungi una Scorta" disabled={scorte >= 5}>+</button>
        </div>
      </div>
    </section>
  );
}

function SceneBar({ scene, sceneVow, tracks, onSave, onNew }) {
  const [form, setForm] = useState(null);
  // La scena si collega a un voto con minacce: i fallimenti ne fanno avanzare una, le tappe segnano progresso.
  const vows = tracks.filter((t) => t.tipo === 'voto' && !t.chiuso && t.minacce.length > 0);
  const open = (f) => setForm(f);
  if (form) {
    return (
      <div className="form">
        <b>{form.nuova ? 'Nuova scena' : 'Modifica la scena'}</b>
        <label>Dove siete, cosa succede<input value={form.scena} placeholder="es. Nella casa del capo, di notte" onChange={(e) => setForm({ ...form, scena: e.target.value })} /></label>
        <p className="label">Per quale voto</p>
        <div className="chips">
          <button className="chip" aria-pressed={form.voto === null} onClick={() => setForm({ ...form, voto: null })}>nessuno</button>
          {vows.map((v) => <button key={v.id} className="chip" aria-pressed={form.voto === v.id} onClick={() => setForm({ ...form, voto: v.id })}>{v.nome}</button>)}
        </div>
        {vows.length === 0 && <p className="muted small-text">Nessun voto ha una minaccia: aggiungila da "Voti".</p>}
        <div className="actions">
          <button className="ghost" onClick={() => setForm(null)}>Annulla</button>
          <button onClick={() => { (form.nuova ? onNew : onSave)({ scena: form.scena.trim(), scena_voto: form.voto }); setForm(null); }} disabled={!form.scena.trim()}>{form.nuova ? 'Inizia la scena' : 'Salva'}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="scene-bar">
      <span className="label">Scena</span>
      <span className="grow">{scene.scena || <span className="muted">nessuna scena</span>}{sceneVow && <> · collegata al voto <b>{sceneVow.nome}</b></>}</span>
      {scene.scena && <button className="link" onClick={() => open({ scena: scene.scena, voto: scene.scena_voto ?? null })}>Modifica</button>}
      <button className="ghost small" onClick={() => open({ nuova: true, scena: '', voto: null })}>+ Nuova scena</button>
    </div>
  );
}

function RollPanel({ me, uid, scorte, scene, sceneVow, tracks, rolls, act }) {
  const [move, setMove] = useState(ACTION_MOVES[1].name);
  const [statKey, setStatKey] = useState('fisico');
  const [bonus, setBonus] = useState([]);
  const allowed = ACTION_MOVES.find((m) => m.name === move).stats;
  const values = me ? { ...effectiveStats(me.data), scorte } : null;
  const momentum = me?.data.slancio ?? 2;
  const pickMove = (name) => {
    setMove(name);
    const ok = ACTION_MOVES.find((m) => m.name === name).stats;
    if (!ok.includes(statKey)) setStatKey(ok[0]);
  };
  const current = rolls.find((r) => r.result.kind === 'action' || r.result.kind === 'progress');
  const phase = usePhase(current);
  const roll = () => {
    act.save(move, { kind: 'action', pending: true, stat: values[statKey], adds: bonus.length, bonus, momentum, d6: d(6), statName: STATS[statKey] });
    setBonus([]);
  };
  const preview = me
    ? `${me.data.nome}: d6 + ${STATS[statKey]} ${values[statKey]}${bonus.length ? ` + ${bonus.length} bonus` : ''}, massimo 10 · slancio ${signed(momentum)}`
    : 'Scegli il tuo personaggio in alto per tirare.';

  return (
    <section aria-label="Tiro">
      <h2 className="section-title">Fai una mossa</h2>
      <SceneBar scene={scene} sceneVow={sceneVow} tracks={tracks} onSave={act.saveParty} onNew={act.newScene} />
      <p className="label">Mossa</p>
      <div className="chips">{ACTION_MOVES.map((m) => (
        <span key={m.name} className="with-info"><button className="chip" aria-pressed={m.name === move} onClick={() => pickMove(m.name)}>{m.name}</button>
          <Info title={m.name}><MoveInfo move={m} /></Info></span>
      ))}</div>
      <div className="cols">
        <div>
          <p className="label">Statistica</p>
          <div className="chips">{Object.keys(STATS).map((k) => (
            <button key={k} className="chip" aria-pressed={k === statKey} disabled={!allowed.includes(k)} onClick={() => setStatKey(k)}>{STATS[k]}{values ? ` ${values[k]}` : ''}</button>
          ))}</div>
        </div>
        <div>
          <p className="label">Bonus validi</p>
          <div className="chips">{BONUS.map((b) => (
            <button key={b} className="chip" aria-pressed={bonus.includes(b)} onClick={() => setBonus(bonus.includes(b) ? bonus.filter((x) => x !== b) : [...bonus, b])}>{b} +1</button>
          ))}</div>
        </div>
      </div>
      <div className="roll-actions">
        <button onClick={roll} disabled={!me || !!phase || current?.result.pending}>Tira il d6</button>
        <span className="preview">{preview}</span>
      </div>
      {phase === 'd6' && <div className="rolling-box" aria-live="polite"><Die spin /><span>Il d6 rotola…</span></div>}
      {phase === 'sfida' && <div className="rolling-box" aria-live="polite"><Die sides={10} spin /><Die sides={10} spin /><span>{current.result.sfidante} tira la sfida…</span></div>}
      {!phase && current?.result.pending && <Pending row={current} mine={current.user_id === uid} onChallenge={() => act.challenge(current)} />}
      {!phase && current && !current.result.pending && current.id !== act.closedRoll && <Result onClose={() => act.setClosedRoll(current.id)} row={current} mine={current.user_id === uid} me={me} sceneVow={sceneVow} tracks={tracks} rolls={rolls} act={act} />}
    </section>
  );
}

// Rimandi alle mosse e statistiche da tirare, in grassetto come nel manuale.
const REF = /(Subire una perdita|Pagare il prezzo|Portare a termine|Raggiungere una tappa|Giurare sul Ferro|Intraprendere un viaggio|Sfidare il pericolo|Aiutare un compagno|Riposare|\+(?:Fisico|Animo|Ingegno|Scorte))/;
const Rich = ({ text }) => text.split(REF).map((part, i) => (i % 2 ? <b key={i} className="ref">{part}</b> : part));

// Tutto il testo di una mossa: quando si usa, cosa si tira, i tre esiti con le scelte.
function MoveInfo({ move }) {
  const texts = MOVE_TEXTS[move.name];
  const when = MOVE_TRIGGERS[move.name];
  return <>
    <p className="info-lead"><em className="trigger">{when.when}</em><Rich text={when.text.slice(when.when.length)} /></p>
    {when.list && <ul className="info-list">{when.list.map((l) => <li key={l}><Rich text={l} /></li>)}</ul>}
    {['strong', 'weak', 'miss'].map((o) => (
      <div key={o} className="info-outcome">
        <p className={`info-outcome-title ${o}`}>{OUTCOMES[o]}</p>
        <p><Rich text={texts[o].text} /></p>
        {texts[o].options && <><p className="label">{texts[o].pick === 'tutte' ? 'Ottieni' : texts[o].pick}</p>
          <ul className="info-list">{texts[o].options.map(([label]) => <li key={label}><Rich text={label} /></li>)}</ul></>}
      </div>
    ))}
    {when.note && <p className="info-note"><Rich text={when.note} /></p>}
  </>;
}

// Una tabella del manuale: colonna del dado allineata a destra, filetti tra le righe.
function RefTable({ cols, rows }) {
  return (
    <table className={`ref-table cols-${cols.length}`}>
      <thead><tr>{cols.map((c, i) => <th key={c} className={i ? '' : 'n'} scope="col">{c}</th>)}</tr></thead>
      <tbody>{rows.map(([n, ...cells]) => <tr key={n}><td className="n">{n}</td>{cells.map((c, i) => <td key={i}><Rich text={c} /></td>)}</tr>)}</tbody>
    </table>
  );
}

function Pending({ row, mine, onChallenge }) {
  const r = row.result;
  return (
    <div className="pending-box" aria-live="polite">
      {r.kind === 'action'
        ? <p><b>{row.player_name}</b> · {row.move}: d6 {r.d6} + {r.statName} {r.stat}{r.adds ? ` + ${r.adds}` : ''}. Punteggio azione <b>{pendingScore(r)}</b>.</p>
        : <p><b>{row.player_name}</b> · {row.move}: <b>{r.clocks}</b> orologi completi, niente d6 né bonus.</p>}
      {mine
        ? <p className="muted">Ora un altro giocatore tira i dadi sfida: agli altri compare il pulsante. <button className="link" onClick={onChallenge}>Siete in uno? Tirala tu</button></p>
        : <button onClick={onChallenge}>Tira la sfida per {row.player_name}</button>}
    </div>
  );
}

function Result({ row, mine, me, sceneVow, tracks, rolls, act, onClose }) {
  const r = row.result;
  const burnRow = rolls.find((x) => x.result.kind === 'burn' && x.result.of === row.id);
  const outcome = burnRow ? burnRow.result.outcome : r.outcome;
  const track = r.kind === 'progress' ? tracks.find((t) => t.id === r.trackId) : null;
  const entry = r.kind === 'action' ? MOVE_TEXTS[row.move]?.[outcome] : { text: FINISH_TEXTS[track?.tipo ?? 'voto'][outcome] };
  const [done, setDone] = useState([]);
  const c = me?.data;
  const noGain = c && (c.salute >= 4 || c.spirito >= 4);
  const canApply = mine && me && r.kind === 'action';
  // Subire una perdita: 1, o 2 se il pericolo affrontato è Formidabile o Leggendario. Proposta dallo scontro o luogo aperto, si cambia a mano.
  const hard = (t) => t && t.grado !== 'Pericoloso';
  const danger = [...tracks].reverse().find((t) => !t.chiuso && (t.tipo === 'scontro' || t.tipo === 'luogo'));
  const [loss, setLoss] = useState(hard(danger) ? 2 : 1);
  const hasLoss = entry?.options?.some(([, fx]) => fx && Object.values(fx).includes('perdita'));
  const amount = (k, v) => (v === 'perdita' ? (k === 'scorte' ? -loss : loss) : v);
  const apply = (label, fx) => {
    let extra = '';
    if (fx === 'prezzo') { const t = TABLES['Pagare il prezzo'](d); extra = `, ${t.dice}: ${t.text}`; } else {
      const patch = {};
      for (const [k, v] of Object.entries(fx)) if (k !== 'scorte') patch[k] = clamp(c[k] + amount(k, v), k === 'slancio' ? LIMITS.slancio : LIMITS.clock);
      if (Object.keys(patch).length) act.saveChar(me.id, { ...c, ...patch }, true);
      if (fx.scorte) act.saveParty({ scorte: clamp(act.scorte + amount('scorte', fx.scorte), LIMITS.scorte) }, true);
    }
    act.note(`${me.data.nome}: ${label}${fx !== 'prezzo' && Object.values(fx).includes('perdita') ? ` (${loss})` : ''}${extra}`); setDone([...done, label]);
  };
  // Nella scena di un voto: fallimento → avanza la minaccia, successo pieno → tappa. Sempre su conferma.
  const [asked, setAsked] = useState(false);
  const offer = mine && sceneVow && r.kind === 'action' && !asked && (
    outcome === 'miss' && sceneVow.minacce.some((m) => m.segmenti < THREAT_SIZE) ? 'threat' : outcome === 'strong' ? 'milestone' : null);
  const beat = (c) => r.score > c || (burnRow && r.momentum > c);
  return (
    <div className="result">
      <div className="result-head">
        <span className="grow">{row.player_name} · {row.move}{r.statName ? ` · ${r.statName}` : ''}{r.sfidante ? ` · sfida tirata da ${r.sfidante}` : ''}</span>
        {r.match && <span className="badge">DOPPIO</span>}
        <button className="link" onClick={onClose}>Chiudi</button>
      </div>
      <div className="dice-row">
        {r.kind === 'action' && <><span className="die-col"><Die value={r.d6Value} />d6</span><span className="muted">+ {r.stat}{r.adds ? ` + ${r.adds}` : ''} =</span></>}
        <span className="die-col"><Die value={r.score} cls="score" />{r.kind === 'action' ? 'azione' : 'orologi'}</span>
        {burnRow && <span className="die-col"><Die value={r.momentum} cls="score" />slancio</span>}
        <span className="muted">contro</span>
        <span className="die-col"><Die value={r.c1} sides={10} cls={beat(r.c1) ? 'beat' : ''} />{beat(r.c1) ? 'battuto' : 'non battuto'}</span>
        <span className="die-col"><Die value={r.c2} sides={10} cls={beat(r.c2) ? 'beat' : ''} />{beat(r.c2) ? 'battuto' : 'non battuto'}</span>
      </div>
      {r.kind === 'action' && r.d6Value !== r.d6 && <p className="muted small-text">Slancio negativo: il d6 ha fatto {r.d6} e vale 0.</p>}
      <p className={`outcome ${outcome}`}>{OUTCOMES[outcome]}{burnRow && <span className="muted small-text"> (con lo slancio)</span>}</p>
      {entry?.text && <p>{entry.text}</p>}
      {r.match && <p className="muted small-text">Doppio: {outcome === 'miss' ? 'la situazione peggiora parecchio.' : 'un risultato migliore del previsto.'}</p>}
      {mine && r.burn && !burnRow && r.outcome !== 'strong' && (
        <div className="offer">
          <span>Usa lo slancio ({signed(r.momentum)}) al posto del tiro appena fatto: si confronta con i dadi sfida, poi lo slancio torna a +2.</span>
          <button className="small" onClick={() => act.burn(row)}>Usa lo slancio</button>
        </div>
      )}
      {burnRow && <p className="small-text">Slancio {signed(r.momentum)} contro i dadi sfida: {burnRow.result.outcome === r.outcome ? `il risultato resta ${OUTCOMES[r.outcome]}` : `da ${OUTCOMES[r.outcome]} diventa ${OUTCOMES[burnRow.result.outcome]}`}. Slancio tornato a +2.</p>}
      {entry?.options && <>
        <p className="label">{entry.pick === 'tutte' ? 'Ottieni' : entry.pick}</p>
        {hasLoss && <div className="row small-text"><span className="muted">Una perdita vale</span>
          {[1, 2].map((n) => <button key={n} className="chip" aria-pressed={loss === n} onClick={() => setLoss(n)}>{n}</button>)}
          <span className="muted">1 se il pericolo è Pericoloso, 2 se è Formidabile o Leggendario{danger ? ` · aperto: ${danger.nome} (${danger.grado})` : ''}</span></div>}
        <ul className="choices">{entry.options.map(([label, fx]) => (
          <li key={label}><span className="grow">{label}</span>
            {canApply && fx && <button className="ghost small" disabled={done.includes(label) || (noGain && fx.slancio > 0)} onClick={() => apply(label, fx)}>{done.includes(label) ? 'Segnato ✓' : fx === 'prezzo' ? 'Tira' : 'Segna sulla scheda'}</button>}</li>
        ))}</ul>
        {canApply && noGain && entry.options.some(([, fx]) => fx?.slancio > 0) && <p className="warn">Salute o Spirito a 4 o più: non puoi guadagnare slancio.</p>}
      </>}
      {offer === 'threat' && (
        <div className="offer">
          <span>Fallimento in una scena del voto. <b>Avanzo una minaccia?</b></span>
          <button className="ghost small" onClick={() => setAsked(true)}>No</button>
          {sceneVow.minacce.filter((m) => m.segmenti < THREAT_SIZE).map((m) => (
            <button key={m.id} className="small" onClick={() => { act.saveTrack(sceneVow.id, { minacce: setThreat(sceneVow.minacce, m.id, m.segmenti + 1) }); setAsked(true); }}>{m.nome} ({m.segmenti}/6)</button>
          ))}
        </div>
      )}
      {offer === 'milestone' && (
        <div className="offer">
          <span>È una tappa del voto "{sceneVow.nome}"? <b>Segno progresso</b> ({sceneVow.grado}: +{RANK_STEP[sceneVow.grado]} segmenti)</span>
          <button className="ghost small" onClick={() => setAsked(true)}>No</button>
          <button className="small" onClick={() => { act.saveTrack(sceneVow.id, { segmenti: markProgress(sceneVow.segmenti, sceneVow.grado) }); setAsked(true); }}>Sì, segna</button>
        </div>
      )}
    </div>
  );
}

function SceneVow({ t }) {
  return (
    <section aria-label="Voto della scena">
      <h2 className="section-title">Voto della scena</h2>
      <p className="vow-title">{t.nome}</p>
      <p className="muted small-text">{KINDS[t.tipo]} · {t.grado}{t.ferro ? ` · giurato su ${t.ferro}` : ''}</p>
      <Boxes segmenti={t.segmenti} />
      {t.minacce.map((m) => <div key={m.id} className="stack"><p>{m.nome}</p><ThreatMeter m={m} /></div>)}
    </section>
  );
}

function Log({ rolls, uid, me, act }) {
  const [story, setStory] = useState('');
  const [ask, setAsk] = useState(false);
  const [closing, setClosing] = useState(null); // titolo della sessione da chiudere
  const current = rolls.filter((r) => r.id > act.since);
  const tell = (e) => {
    e.preventDefault();
    if (!story.trim()) return;
    act.note(story.trim());
    setStory('');
  };
  return (
    <section aria-label="Registro">
      <div className="row"><h2 className="section-title grow">Registro</h2>
        {act.closeSession && current.length > 0 && !ask && closing === null && <button className="link" onClick={() => setClosing(`Sessione ${act.sessionNumber}`)}>Chiudi sessione</button>}
        {act.clearLog && rolls.length > 0 && !ask && closing === null && <button className="link danger" onClick={() => setAsk(true)}>Pulisci</button>}</div>
      {closing !== null && <div className="form">
        <b>Chiudi la sessione</b>
        <label>Titolo<input value={closing} maxLength={80} onChange={(e) => setClosing(e.target.value)} /></label>
        <div className="actions"><button className="ghost" onClick={() => setClosing(null)}>Annulla</button>
          <button disabled={!closing.trim()} onClick={() => { act.closeSession(closing.trim()); setClosing(null); }}>Chiudi sessione</button></div>
      </div>}
      {ask && <div className="offer"><span>Cancellare tutto il registro ({rolls.length > 99 ? 'almeno 100 righe' : rolls.length === 1 ? '1 riga' : `${rolls.length} righe`})? Non si può annullare.</span>
        <button className="ghost small" onClick={() => setAsk(false)}>No</button><button className="small" onClick={() => { act.clearLog(); setAsk(false); }}>Cancella tutto</button></div>}
      <form className="story" onSubmit={tell}>
        <input value={story} placeholder="Scrivi una riga di racconto…" aria-label="Riga di racconto" onChange={(e) => setStory(e.target.value)} />
        <button disabled={!me}>Aggiungi</button>
      </form>
      <ol className="log">{current.slice(0, 40).map((r) => <LogEntry key={r.id} row={r} mine={r.user_id === uid} onChallenge={() => act.challenge(r)} />)}</ol>
    </section>
  );
}

// Ogni tipo di riga ha la sua etichetta e il suo colore a sinistra, per leggere il registro a colpo d'occhio.
const KIND = { scene: ['Scena', 'k-scene'], track: ['Avanzamento', 'k-track'], char: ['Scheda', 'k-char'], image: ['Immagine', 'k-image'],
  note: ['Racconto', 'k-note'], burn: ['Slancio', 'k-move'], table: ['Tabella', 'k-oracle'], oracle: ['Oracolo', 'k-oracle'] };
export function LogEntry({ row, mine, onChallenge }) {
  const r = row.result;
  const time = new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const threat = r.kind === 'track' && r.cosa.includes('minaccia');
  const [label, cls] = threat ? ['Minaccia', 'k-threat'] : KIND[r.kind] ?? ['Mossa', 'k-move'];
  const meta = <span className="meta">{time} · {row.player_name} <span className="tag">{label}</span></span>;
  const li = (body, extra = '') => <li className={`${cls} ${extra}`}>{meta}{body}</li>;
  const match = r.match && <em> Doppio!</em>;
  if (r.kind === 'scene') return li(<>{r.continua ? 'Si riprende la scena' : 'Nuova scena'}: <b>{r.scena}</b>{r.voto && <span className="muted"> · voto {r.voto}</span>}</>);
  if (r.kind === 'track') return li(trackText(r));
  if (r.kind === 'char') return li(<><b>{r.pg}</b>: {r.testo}{r.url && <span className="log-imgs"><Lightbox className="log-img" src={r.url} alt={`Ritratto di ${r.pg}`} /></span>}</>);
  if (r.kind === 'image') return li(<>{r.urls.length === 1 ? 'Nuova immagine' : `${r.urls.length} nuove immagini`}{r.pagina && <> in «{r.pagina}»</>}
    <span className="log-imgs">{r.urls.map((u) => <Lightbox key={u} className="log-img" src={u} alt={r.pagina ?? ''} />)}</span></>);
  if (r.kind === 'note') return li(r.testo);
  if (r.kind === 'burn') return li(<>Usa lo slancio: ora è <b>{OUTCOMES[r.outcome]}</b>. Slancio a +2.</>);
  if (r.kind === 'table') return li(`${r.name}, ${r.dice}: ${r.text}`);
  if (r.kind === 'oracle') return li(<>Oracolo{r.question && <>: «{r.question}»</>} ({r.oddsLabel}) → {r.value}: <b>{r.yes ? 'Sì' : 'No'}</b>{match}</>);
  if (r.pending) {
    return li(<>{row.move}: {r.kind === 'action' ? `punteggio azione ${pendingScore(r)}` : `${r.clocks} orologi`}, in attesa della sfida.
      {!mine && <button className="small" onClick={onChallenge}>Tira la sfida</button>}</>, 'pending');
  }
  return li(<>{row.move}{r.statName ? ` (${r.statName})` : ''}: {r.score} contro {r.c1} e {r.c2} → <b className="out">{OUTCOMES[r.outcome]}</b>{match}
    {r.sfidante && <span className="muted"> · sfida di {r.sfidante}</span>}</>, r.outcome);
}

// "d10 3 + 7" → [10, 10]: i dadi da far rotolare per una tabella.
const tableDice = (dice) => { const [kind, ...rest] = dice.split(' '); return rest.filter((x) => x !== '+').map(() => Number(kind.slice(1))); };

export function Oracolo({ rolls, me, act }) {
  const [question, setQuestion] = useState('');
  const [odds, setOdds] = useState('cinquanta');
  const lastOracle = rolls.find((r) => r.result.kind === 'oracle');
  const lastTable = rolls.find((r) => r.result.kind === 'table');
  const oracleSpin = usePhase(lastOracle);
  const tableSpin = usePhase(lastTable);
  return (
    <div className="two-col">
      <section>
        <h2 className="section-title">Chiedi all'oracolo</h2>
        <label>Domanda
          <input value={question} placeholder="Il capo di Oxenfurt ha visto qualcosa nel bosco?" onChange={(e) => setQuestion(e.target.value)} /></label>
        <p className="label">Probabilità</p>
        <div className="chips">{act.ODDS.map((o) => <button key={o.key} className="chip" aria-pressed={o.key === odds} onClick={() => setOdds(o.key)}>{o.label}</button>)}</div>
        <div className="roll-actions"><button disabled={!me} onClick={() => { act.ask(odds, question.trim()); setQuestion(''); }}>Chiedi</button></div>
        {lastOracle && (
          <div className="answer">
            {oracleSpin ? <Die sides={100} spin /> : <span className={`num ${lastOracle.result.yes ? 'yes' : 'no'}`}>{lastOracle.result.value}</span>}
            {!oracleSpin && <div>
              {lastOracle.result.question && <p>«{lastOracle.result.question}»</p>}
              <p className={lastOracle.result.yes ? 'outcome strong' : 'outcome miss'}>{lastOracle.result.yes ? 'Sì' : 'No'}</p>
              <p className="muted small-text">{lastOracle.player_name} · {lastOracle.result.oddsLabel}: sì da {act.ODDS.find((o) => o.key === lastOracle.result.odds)?.min} in su{lastOracle.result.match ? ' · doppio: risposta estrema o colpo di scena' : ''}</p>
            </div>}
          </div>
        )}
      </section>
      <section>
        <h2 className="section-title">Tabelle</h2>
        <div className="row">{Object.keys(TABLES).map((name) => (
          <span key={name} className="with-info rect"><button className="ghost small" disabled={!me} onClick={() => act.save(name, { kind: 'table', name, ...TABLES[name](d) })}>{name}</button>
            <Info title={name}>{TABLE_INFO[name].map((t) => <RefTable key={t.cols[1]} {...t} />)}</Info></span>
        ))}</div>
        {lastTable && (
          <div className="answer">
            {tableSpin
              ? <div className="dice-row">{tableDice(lastTable.result.dice).map((sides, i) => <Die key={i} sides={sides} spin />)}</div>
              : <div><p className="muted small-text">{lastTable.player_name} · {lastTable.result.name} · {lastTable.result.dice}</p><p>{lastTable.result.text}</p></div>}
          </div>
        )}
      </section>
    </div>
  );
}
