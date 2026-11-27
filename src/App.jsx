import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { actionRoll, progressRoll, oracle, rollDice, d, ODDS, OUTCOMES } from './rules/dice.js';
import { ACTION_MOVES, STATS } from './rules/moves.js';
import { LIMITS, clamp, effectiveStats, emptyCharacter } from './rules/character.js';
import Sheet, { Text } from './Sheet.jsx';
import Tracks from './Tracks.jsx';
import { completeClocks, markProgress } from './rules/progress.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) return <main><h1>Ironsworn</h1><p>Manca la configurazione di Supabase: vedi il README.</p></main>;
  if (!session) return <Login />;
  return <Table session={session} />;
}

// Si entra con un nome e la password comune del gruppo. Supabase vuole un'email: la ricaviamo dal nome.
// shortcut: chi conosce la password può entrare con qualunque nome; dopo aver creato gli account, chiudere le iscrizioni su Supabase.
const emailOf = (nome) => `${nome.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')}@ironsworn.example.com`;

function Login() {
  const [nome, setNome] = useState(() => localStorage.getItem('nome') || '');
  const [password, setPassword] = useState('');
  const [state, setState] = useState('');
  const send = async (e) => {
    e.preventDefault();
    if (!emailOf(nome).split('@')[0]) return setState('Il nome deve contenere almeno una lettera.');
    setState('un attimo…');
    localStorage.setItem('nome', nome.trim());
    const credentials = { email: emailOf(nome), password };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (!error) return setState('');
    // Primo accesso con questo nome: crea l'account (funziona finché le iscrizioni sono aperte).
    const { data, error: signUpError } = await supabase.auth.signUp({ ...credentials, options: { data: { nome: nome.trim() } } });
    if (signUpError || !data.session) return setState('Nome o password sbagliati.');
    setState('');
  };
  return (
    <main>
      <h1>Ironsworn</h1>
      <form onSubmit={send} className="login">
        <label>Nome <input required autoComplete="username" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label>Password <input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button>Entra</button>
      </form>
      <p role="status">{state}</p>
    </main>
  );
}

// Tiene una tabella Supabase sincronizzata in tempo reale (insert e update).
function useLive(table, query, setError) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    query(supabase.from(table).select('*')).then(({ data, error }) => (error ? setError(error.message) : setRows(data)));
    const channel = supabase.channel(table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, ({ eventType, new: row, old }) =>
        setRows((rs) => (eventType === 'DELETE' ? rs.filter((r) => r.id !== old.id) : upsert(rs, { ...row, fresh: true }))))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table]);
  return [rows, setRows];
}
const upsert = (rs, row) => (rs.some((r) => r.id === row.id) ? rs.map((r) => (r.id === row.id ? row : r)) : [row, ...rs]);

function Table({ session }) {
  const [error, setError] = useState('');
  const [rolls, setRolls] = useLive('rolls', (q) => q.order('id', { ascending: false }).limit(100), setError);
  const [chars, setChars] = useLive('characters', (q) => q.order('id'), setError);
  const [party, setParty] = useLive('party', (q) => q, setError);
  const [tracks, setTracks] = useLive('tracks', (q) => q.order('id'), setError);
  const [tab, setTab] = useState('tavolo');
  const scene = party[0] ?? { id: 1, scorte: 5, scena: '', scena_voto: null };
  const sceneVow = tracks.find((t) => t.id === scene.scena_voto);
  const uid = session.user.id;
  const me = chars.find((c) => c.owner === uid);
  const scorte = scene.scorte;

  // Scegliere un personaggio libero lo rende tuo; "cambia" lo lascia libero.
  const setOwner = async (id, owner) => {
    setChars((cs) => cs.map((c) => (c.id === id ? { ...c, owner } : c)));
    const { error } = await supabase.from('characters').update({ owner }).eq('id', id);
    if (error) setError(error.message);
  };

  // shortcut: ultima scrittura vince sull'intera scheda; se due persone modificano la stessa scheda nello stesso istante, una modifica si perde.
  const saveChar = async (id, data) => {
    setChars((cs) => cs.map((c) => (c.id === id ? { ...c, data } : c)));
    const { error } = await supabase.from('characters').update({ data, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setError(error.message);
  };
  const addChar = async () => {
    const { data, error } = await supabase.from('characters').insert({ data: { ...emptyCharacter(), nome: 'Nuovo personaggio' } }).select().single();
    if (error) return setError(error.message);
    setChars((cs) => upsert(cs, data));
  };
  const saveParty = async (patch) => {
    setParty([{ ...scene, ...patch }]);
    const { error } = await supabase.from('party').update(patch).eq('id', 1);
    if (error) setError(error.message);
  };
  const saveTrack = async (id, patch) => {
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('tracks').update(patch).eq('id', id);
    if (error) setError(error.message);
  };
  const createTrack = async (row) => {
    const { data, error } = await supabase.from('tracks').insert(row).select().single();
    if (error) return setError(error.message);
    setTracks((ts) => [...ts.filter((t) => t.id !== data.id), data]);
  };
  const deleteTrack = async (id) => {
    setTracks((ts) => ts.filter((t) => t.id !== id));
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (error) setError(error.message);
  };
  const finish = (t) => {
    save(`Portare a termine: ${t.nome}`, { kind: 'progress', pending: true, clocks: completeClocks(t.segmenti), trackId: t.id });
    setTab('tavolo');
  };

  // shortcut: i dadi si tirano nel browser di chi tira; spostarli sul server se tra voi serve garanzia contro i trucchi.
  const save = async (move, result) => {
    if (!me) return setError('Scegli il tuo personaggio in alto prima di tirare.');
    const { data, error } = await supabase.from('rolls').insert({ player_name: me.data.nome, move, result }).select().single();
    if (error) return setError(error.message);
    setError('');
    setRolls((rs) => upsert(rs, { ...data, fresh: true }));
  };
  // Regola della casa: chi fa la mossa tira il d6, un altro giocatore tira i due dadi sfida.
  const challenge = async (row) => {
    const r = row.result;
    const dice = rollDice.progress();
    const full = r.kind === 'action' ? actionRoll(r, { d6: r.d6, ...dice }) : progressRoll(r, dice);
    const result = { ...r, ...full, pending: false, sfidante: me?.data.nome ?? 'qualcuno' };
    // Solo se è ancora in attesa: se due persone cliccano insieme, vale il primo.
    const { data, error } = await supabase.from('rolls').update({ result }).eq('id', row.id).eq('result->>pending', 'true').select();
    if (error) return setError(error.message);
    if (data[0]) setRolls((rs) => upsert(rs, { ...data[0], fresh: true }));
  };
  const burn = async (r) => {
    await save(r.move, { kind: 'burn', of: r.id, outcome: r.result.burn.outcome });
    if (me) saveChar(me.id, { ...me.data, slancio: r.result.burn.newMomentum });
  };

  const burned = new Set(rolls.filter((r) => r.result.kind === 'burn').map((r) => r.result.of));
  // Lo slancio si brucia solo subito dopo il tiro: quindi solo sull'ultimo tiro proprio.
  const [dismissed, setDismissed] = useState(new Set());
  const lastMine = rolls.find((r) => r.user_id === session.user.id && r.result.kind !== 'burn')?.id;

  return (
    <main>
      <header>
        <h1>Ironsworn</h1>
        {me
          ? <span>Sono <b>{me.data.nome}</b> <button className="link" onClick={() => setOwner(me.id, null)}>cambia</button></span>
          : <label>Sono <select value="" onChange={(e) => setOwner(Number(e.target.value), uid)}>
              <option value="" disabled>scegli…</option>
              {chars.filter((c) => !c.owner).map((c) => <option key={c.id} value={c.id}>{c.data.nome}</option>)}</select></label>}
        <label>Scorte del gruppo <input type="number" min={0} max={5} value={scorte} onChange={(e) => saveParty({ scorte: clamp(e.target.value, LIMITS.scorte) })} /></label>
        <button className="link" onClick={() => supabase.auth.signOut()}>Esci</button>
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      <nav className="tabs">
        {[['tavolo', 'Tavolo'], ['voti', 'Voti e tracciati'], ['schede', 'Schede']].map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} aria-current={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      {tab === 'tavolo' && <>
        <div className="scene">
          <label>Scena <Text value={scene.scena ?? ''} placeholder="un luogo, un momento, una cosa da fare" onSave={(scena) => saveParty({ scena })} /></label>
          <label>Voto <select value={scene.scena_voto ?? ''} onChange={(e) => saveParty({ scena_voto: e.target.value ? Number(e.target.value) : null })}>
            <option value="">nessuno</option>
            {tracks.filter((t) => t.tipo === 'voto' && !t.chiuso).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
        </div>
        <div className="panels">
          <ActionPanel me={me} scorte={scorte} onRoll={save} />
          <OraclePanel onRoll={save} />
        </div>
        <h2>Registro</h2>
        <ol className="log">
          {rolls.slice(0, 20).map((r) => {
            const last = r.id === lastMine;
            // Nella scena di un voto: fallimento -> avanza la minaccia, successo pieno -> tappa. Sempre su conferma.
            const offers = last && sceneVow && r.result.kind === 'action' && !dismissed.has(r.id) ? [
              r.result.outcome === 'miss' && sceneVow.minaccia !== null && sceneVow.minaccia_segmenti < 6 &&
                { label: `+1 minaccia (${sceneVow.minaccia || sceneVow.nome})`, run: () => saveTrack(sceneVow.id, { minaccia_segmenti: sceneVow.minaccia_segmenti + 1 }) },
              r.result.outcome === 'strong' &&
                { label: `Raggiungere una tappa (${sceneVow.nome})`, run: () => saveTrack(sceneVow.id, { segmenti: markProgress(sceneVow.segmenti, sceneVow.grado) }) },
            ].filter(Boolean) : [];
            return <LogEntry key={r.id} row={r} mine={r.user_id === uid} onChallenge={() => challenge(r)} canBurn={last && !burned.has(r.id)} onBurn={() => burn(r)}
              offers={offers} onOffer={(o) => { if (o) o.run(); setDismissed(new Set(dismissed).add(r.id)); }} />;
          })}
        </ol>
      </>}
      {tab === 'voti' && <Tracks tracks={tracks} chars={chars} onSave={saveTrack} onCreate={createTrack} onDelete={deleteTrack} onFinish={finish} />}
      {tab === 'schede' && <>
        {chars.map((c) => <Sheet key={c.id} c={c.data} readOnly={c.owner !== uid} onChange={(data) => saveChar(c.id, data)} />)}
        <button className="link" onClick={addChar}>+ nuovo personaggio</button>
      </>}
    </main>
  );
}

const num = (set) => (e) => set(Number(e.target.value));

function ActionPanel({ me, scorte, onRoll }) {
  const [move, setMove] = useState(ACTION_MOVES[1].name);
  const [statKey, setStatKey] = useState('fisico');
  const [adds, setAdds] = useState(0);
  const stats = ACTION_MOVES.find((m) => m.name === move).stats;
  const values = me ? { ...effectiveStats(me.data), scorte } : null;
  const momentum = me?.data.slancio ?? 2;
  const pickMove = (e) => {
    setMove(e.target.value);
    const allowed = ACTION_MOVES.find((m) => m.name === e.target.value).stats;
    if (!allowed.includes(statKey)) setStatKey(allowed[0]);
  };
  const roll = () => onRoll(move, { kind: 'action', pending: true, stat: values[statKey], adds, momentum, d6: d(6), statName: STATS[statKey] });
  return (
    <section>
      <h2>Tiro azione</h2>
      <label>Mossa <select value={move} onChange={pickMove}>{ACTION_MOVES.map((m) => <option key={m.name}>{m.name}</option>)}</select></label>
      <label>Statistica <select value={statKey} onChange={(e) => setStatKey(e.target.value)}>
        {stats.map((s) => <option key={s} value={s}>{STATS[s]}{values ? ` (${values[s]})` : ''}</option>)}</select>
      </label>
      <label>Bonus <input type="number" min={0} max={9} value={adds} onChange={num(setAdds)} /></label>
      <p className="muted">Slancio {momentum > 0 ? '+' : ''}{momentum}, dalla scheda.</p>
      <button onClick={roll} disabled={!me}>Tira</button>
    </section>
  );
}

function OraclePanel({ onRoll }) {
  const [question, setQuestion] = useState('');
  const [odds, setOdds] = useState('cinquanta');
  return (
    <section>
      <h2>Chiedere all'oracolo</h2>
      <label>Domanda <input value={question} placeholder="Il ponte è ancora in piedi?" onChange={(e) => setQuestion(e.target.value)} /></label>
      <label>Probabilità <select value={odds} onChange={(e) => setOdds(e.target.value)}>
        {ODDS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
      <button onClick={() => onRoll("Chiedere all'oracolo", oracle({ odds, question }, rollDice.oracle()))}>Chiedi</button>
    </section>
  );
}

// Un tiro appena arrivato mostra i dadi che rotolano per un attimo, per tutti al tavolo.
const SUSPENSE_MS = 1500;

function LogEntry({ row, mine, onChallenge, canBurn, onBurn, offers = [], onOffer }) {
  const r = row.result;
  const [rolling, setRolling] = useState(() => row.fresh && r.kind !== 'burn');
  // Quando arriva la sfida, di nuovo un attimo di suspense prima del risultato.
  const [wasPending, setWasPending] = useState(r.pending);
  if (wasPending && !r.pending) { setWasPending(false); setRolling(true); }
  useEffect(() => {
    if (!rolling) return;
    const t = setTimeout(() => setRolling(false), SUSPENSE_MS);
    return () => clearTimeout(t);
  }, [rolling]);
  const time = new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const who = <><time>{time}</time> <b>{row.player_name}</b> · {row.move}</>;
  const match = r.match && <em> Doppio!</em>;
  if (rolling) return <li className="rolling">{who}: <span className="dice" aria-label="dadi in movimento">⚀ ⚄ ⚂</span></li>;
  if (r.kind === 'burn') return <li className="burn">{who}: brucia lo slancio, ora è <b>{OUTCOMES[r.outcome]}</b>. Slancio a +2.</li>;
  if (r.kind === 'oracle') {
    return <li>{who}{r.question && <>: «{r.question}»</>} ({r.oddsLabel}) → {r.value}: <b>{r.yes ? 'Sì' : 'No'}</b>{match}</li>;
  }
  if (r.pending) {
    const what = r.kind === 'action'
      ? <>d6 {r.d6} + {r.statName} {r.stat}{r.adds ? ` + ${r.adds}` : ''}</>
      : <>orologi completi {r.clocks}</>;
    return (
      <li className="pending">
        {who}: {what}. In attesa della sfida…
        {!mine && <button className="small" onClick={onChallenge}>Tira la sfida</button>}
        {mine && <button className="small link" onClick={onChallenge}>siete in uno? tirala tu</button>}
      </li>
    );
  }
  const detail = r.kind === 'action'
    ? <>d6 {r.d6}{r.d6Value !== r.d6 && ' (vale 0)'} + {r.statName} {r.stat}{r.adds ? ` + ${r.adds}` : ''} = {r.score}</>
    : <>orologi {r.score}</>;
  return (
    <li className={r.outcome}>
      {who}: {detail} contro {r.c1} e {r.c2}{r.sfidante && <span className="muted"> (sfida di {r.sfidante})</span>} → <b>{OUTCOMES[r.outcome]}</b>{match}
      {r.burn && canBurn && <button className="small" onClick={onBurn}>Brucia lo slancio ({OUTCOMES[r.burn.outcome]})</button>}
      {offers.map((o) => <button key={o.label} className="small" onClick={() => onOffer(o)}>{o.label}</button>)}
      {offers.length > 0 && <button className="small link" onClick={() => onOffer(null)}>no</button>}
    </li>
  );
}
