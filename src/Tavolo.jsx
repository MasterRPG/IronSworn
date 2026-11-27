import { useEffect, useState } from 'react';
import { ACTION_MOVES, STATS } from './rules/moves.js';
import { LIMITS, clamp, effectiveStats } from './rules/character.js';
import { OUTCOMES, d } from './rules/dice.js';
import { MOVE_TEXTS, FINISH_TEXTS, TABLES } from './rules/texts.js';
import { KINDS, RANK_STEP, THREAT_SIZE, completeClocks, markProgress } from './rules/progress.js';

// Un tiro appena arrivato mostra i dadi che rotolano per un attimo, per tutti al tavolo.
export const SUSPENSE_MS = 1500;

export const Segs = ({ n, size = 6, threat }) => (
  <span className={`segs${threat ? ' threat' : ''}`} role="img" aria-label={`${n} su ${size}`}>
    {Array.from({ length: size }, (_, i) => <span key={i} className={i < n ? 'seg f' : 'seg'} />)}
  </span>
);

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
            <div key={id} className={`pc${owner === uid ? ' mine' : ''}`}>
              <div className="pc-head"><b>{c.nome}</b><span className="muted small-text">{c.giocatore}</span></div>
              <div className="pc-stats"><span>Fisico <b>{eff.fisico}</b></span><span>Animo <b>{eff.animo}</b></span><span>Ingegno <b>{eff.ingegno}</b></span></div>
              <div className="meter"><span>Salute</span><Segs n={c.salute} /><span>{c.salute}/6</span></div>
              <div className="meter"><span>Spirito</span><Segs n={c.spirito} /><span>{c.spirito}/6</span></div>
              <div className="pc-stats"><span>Slancio <b>{signed(c.slancio)}</b></span><span>Cicatrici {marks(c.cicatrici)}/3 · Orrori {marks(c.orrori)}/3</span></div>
              {(c.salute >= 4 || c.spirito >= 4) && <p className="warn">Salute o Spirito a 4+: niente slancio guadagnato</p>}
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

function SceneBar({ scene, sceneVow, tracks, onSave }) {
  const [form, setForm] = useState(null);
  // La scena si collega a un voto con minaccia: i fallimenti la fanno avanzare, le tappe segnano progresso.
  const vows = tracks.filter((t) => t.tipo === 'voto' && !t.chiuso && t.minaccia !== null);
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
        <p className="muted small-text">I fallimenti in questa scena propongono di avanzare la minaccia del voto, le tappe di segnarne il progresso.</p>
        <div className="actions">
          <button className="ghost" onClick={() => setForm(null)}>Annulla</button>
          <button onClick={() => { onSave({ scena: form.scena.trim(), scena_voto: form.voto }); setForm(null); }} disabled={!form.scena.trim()}>{form.nuova ? 'Inizia la scena' : 'Salva'}</button>
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
      <SceneBar scene={scene} sceneVow={sceneVow} tracks={tracks} onSave={act.saveParty} />
      <p className="label">Mossa</p>
      <div className="chips">{ACTION_MOVES.map((m) => <button key={m.name} className="chip" aria-pressed={m.name === move} onClick={() => pickMove(m.name)}>{m.name}</button>)}</div>
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
      {!phase && current && !current.result.pending && <Result row={current} mine={current.user_id === uid} me={me} sceneVow={sceneVow} tracks={tracks} rolls={rolls} act={act} />}
    </section>
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

function Result({ row, mine, me, sceneVow, tracks, rolls, act }) {
  const r = row.result;
  const burnRow = rolls.find((x) => x.result.kind === 'burn' && x.result.of === row.id);
  const outcome = burnRow ? burnRow.result.outcome : r.outcome;
  const track = r.kind === 'progress' ? tracks.find((t) => t.id === r.trackId) : null;
  const entry = r.kind === 'action' ? MOVE_TEXTS[row.move]?.[outcome] : { text: FINISH_TEXTS[track?.tipo ?? 'voto'][outcome] };
  const [done, setDone] = useState([]);
  const c = me?.data;
  const noGain = c && (c.salute >= 4 || c.spirito >= 4);
  const canApply = mine && me && r.kind === 'action';
  const apply = (label, fx) => {
    let extra = '';
    if (fx === 'prezzo') { const t = TABLES['Pagare il prezzo'](d); extra = `, ${t.dice}: ${t.text}`; } else {
      const patch = {};
      for (const [k, v] of Object.entries(fx)) if (k !== 'scorte') patch[k] = clamp(c[k] + v, k === 'slancio' ? LIMITS.slancio : LIMITS.clock);
      if (Object.keys(patch).length) act.saveChar(me.id, { ...c, ...patch });
      if (fx.scorte) act.saveParty({ scorte: clamp(act.scorte + fx.scorte, LIMITS.scorte) });
    }
    act.note(`${me.data.nome}: ${label}${extra}`); setDone([...done, label]);
  };
  // Nella scena di un voto: fallimento → avanza la minaccia, successo pieno → tappa. Sempre su conferma.
  const [asked, setAsked] = useState(false);
  const offer = mine && sceneVow && r.kind === 'action' && !asked && (
    outcome === 'miss' && sceneVow.minaccia !== null && sceneVow.minaccia_segmenti < THREAT_SIZE ? 'threat' : outcome === 'strong' ? 'milestone' : null);
  const beat = (c) => r.score > c || (burnRow && r.momentum > c);
  return (
    <div className="result">
      <div className="result-head">
        <span>{row.player_name} · {row.move}{r.statName ? ` · ${r.statName}` : ''}{r.sfidante ? ` · sfida tirata da ${r.sfidante}` : ''}</span>
        {r.match && <span className="badge">DOPPIO</span>}
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
        <ul className="choices">{entry.options.map(([label, fx]) => (
          <li key={label}><span className="grow">{label}</span>
            {canApply && fx && <button className="ghost small" disabled={done.includes(label) || (noGain && fx.slancio > 0)} onClick={() => apply(label, fx)}>{done.includes(label) ? 'Segnato ✓' : fx === 'prezzo' ? 'Tira' : 'Segna sulla scheda'}</button>}</li>
        ))}</ul>
        {canApply && noGain && entry.options.some(([, fx]) => fx?.slancio > 0) && <p className="warn">Salute o Spirito a 4 o più: non puoi guadagnare slancio.</p>}
      </>}
      {offer === 'threat' && (
        <div className="offer">
          <span>Fallimento in una scena del voto. <b>Avanzo la minaccia "{sceneVow.minaccia || sceneVow.nome}"?</b> ({sceneVow.minaccia_segmenti}/6)</span>
          <button className="ghost small" onClick={() => setAsked(true)}>No</button>
          <button className="small" onClick={() => { act.saveTrack(sceneVow.id, { minaccia_segmenti: sceneVow.minaccia_segmenti + 1 }); setAsked(true); }}>Sì, avanza</button>
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
      {t.minaccia !== null && <>
        <div className="meter"><span>Minaccia</span><Segs n={t.minaccia_segmenti} threat /><span>{t.minaccia_segmenti}/6</span></div>
        <p>{t.minaccia}</p>
      </>}
    </section>
  );
}

function Log({ rolls, uid, me, act }) {
  const [story, setStory] = useState('');
  const tell = (e) => {
    e.preventDefault();
    if (!story.trim()) return;
    act.note(story.trim());
    setStory('');
  };
  return (
    <section aria-label="Registro">
      <h2 className="section-title">Registro</h2>
      <form className="story" onSubmit={tell}>
        <input value={story} placeholder="Scrivi una riga di racconto…" aria-label="Riga di racconto" onChange={(e) => setStory(e.target.value)} />
        <button disabled={!me}>Aggiungi</button>
      </form>
      <ol className="log">{rolls.slice(0, 40).map((r) => <LogEntry key={r.id} row={r} mine={r.user_id === uid} onChallenge={() => act.challenge(r)} />)}</ol>
    </section>
  );
}

function LogEntry({ row, mine, onChallenge }) {
  const r = row.result;
  const time = new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const meta = <span className="meta">{time} · {row.player_name}</span>;
  const match = r.match && <em> Doppio!</em>;
  if (r.kind === 'note') return <li className="note">{meta}{r.testo}</li>;
  if (r.kind === 'burn') return <li>{meta}Usa lo slancio: ora è <b>{OUTCOMES[r.outcome]}</b>. Slancio a +2.</li>;
  if (r.kind === 'table') return <li>{meta}{r.name}, {r.dice}: {r.text}</li>;
  if (r.kind === 'oracle') return <li>{meta}Oracolo{r.question && <>: «{r.question}»</>} ({r.oddsLabel}) → {r.value}: <b>{r.yes ? 'Sì' : 'No'}</b>{match}</li>;
  if (r.pending) {
    return (
      <li className="pending">{meta}{row.move}: {r.kind === 'action' ? `punteggio azione ${pendingScore(r)}` : `${r.clocks} orologi`}, in attesa della sfida.
        {!mine && <button className="small" onClick={onChallenge}>Tira la sfida</button>}
      </li>
    );
  }
  return (
    <li className={r.outcome}>{meta}{row.move}{r.statName ? ` (${r.statName})` : ''}: {r.score} contro {r.c1} e {r.c2} → <b className="out">{OUTCOMES[r.outcome]}</b>{match}
      {r.sfidante && <span className="muted"> · sfida di {r.sfidante}</span>}
    </li>
  );
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
          <button key={name} className="ghost small" disabled={!me} onClick={() => act.save(name, { kind: 'table', name, ...TABLES[name](d) })}>{name}</button>
        ))}</div>
        {lastTable && (
          <div className="answer">
            {tableSpin
              ? <div className="dice-row">{tableDice(lastTable.result.dice).map((sides, i) => <Die key={i} sides={sides} spin />)}</div>
              : <div><p className="muted small-text">{lastTable.player_name} · {lastTable.result.name} · {lastTable.result.dice}</p><p>{lastTable.result.text}</p></div>}
          </div>
        )}
        <p className="muted small-text">Le tabelle vengono dal Google Doc. Ogni risultato finisce anche nel registro, visibile a tutti.</p>
      </section>
    </div>
  );
}
