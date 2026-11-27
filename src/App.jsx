import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { actionRoll, progressRoll, oracle, rollDice, ODDS, OUTCOMES } from './rules/dice.js';
import { ACTION_MOVES, STATS } from './rules/moves.js';

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

function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const send = async (e) => {
    e.preventDefault();
    setState('invio…');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
    setState(error ? `Errore: ${error.message}` : 'Controlla la posta: ti ho mandato il link per entrare.');
  };
  return (
    <main>
      <h1>Ironsworn</h1>
      <form onSubmit={send}>
        <label>Email <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button>Entra</button>
      </form>
      <p role="status">{state}</p>
    </main>
  );
}

function Table({ session }) {
  const [rolls, setRolls] = useState([]);
  const [name, setName] = useState(() => localStorage.getItem('nome') || '');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('rolls').select('*').order('id', { ascending: false }).limit(100)
      .then(({ data, error }) => (error ? setError(error.message) : setRolls(data)));
    const channel = supabase.channel('rolls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls' },
        ({ new: row }) => setRolls((rs) => (rs.some((r) => r.id === row.id) ? rs : [row, ...rs])))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // shortcut: i dadi si tirano nel browser di chi tira; spostarli sul server se tra voi serve garanzia contro i trucchi.
  const save = async (move, result) => {
    if (!name.trim()) return setError('Scrivi il nome del tuo personaggio prima di tirare.');
    localStorage.setItem('nome', name.trim());
    const { data, error } = await supabase.from('rolls').insert({ player_name: name.trim(), move, result }).select().single();
    if (error) return setError(error.message);
    setError('');
    setRolls((rs) => (rs.some((r) => r.id === data.id) ? rs : [data, ...rs]));
  };

  const burned = new Set(rolls.filter((r) => r.result.kind === 'burn').map((r) => r.result.of));
  // Lo slancio si brucia solo subito dopo il tiro: quindi solo sull'ultimo tiro proprio.
  const lastMine = rolls.find((r) => r.user_id === session.user.id && r.result.kind !== 'burn')?.id;

  return (
    <main>
      <header>
        <h1>Ironsworn</h1>
        <label>Personaggio <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
        <button className="link" onClick={() => supabase.auth.signOut()}>Esci</button>
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="panels">
        <ActionPanel onRoll={save} />
        <ProgressPanel onRoll={save} />
        <OraclePanel onRoll={save} />
      </div>
      <h2>Registro</h2>
      <ol className="log">
        {rolls.map((r) => (
          <LogEntry key={r.id} row={r} canBurn={r.id === lastMine && !burned.has(r.id)}
            onBurn={() => save(r.move, { kind: 'burn', of: r.id, outcome: r.result.burn.outcome })} />
        ))}
      </ol>
    </main>
  );
}

const num = (set) => (e) => set(Number(e.target.value));

function ActionPanel({ onRoll }) {
  const [move, setMove] = useState(ACTION_MOVES[1].name);
  const [statKey, setStatKey] = useState('fisico');
  const [stat, setStat] = useState(2);
  const [adds, setAdds] = useState(0);
  const [momentum, setMomentum] = useState(2);
  const stats = ACTION_MOVES.find((m) => m.name === move).stats;
  const pickMove = (e) => {
    setMove(e.target.value);
    const allowed = ACTION_MOVES.find((m) => m.name === e.target.value).stats;
    if (!allowed.includes(statKey)) setStatKey(allowed[0]);
  };
  const roll = () => onRoll(move, { ...actionRoll({ stat, adds, momentum }, rollDice.action()), statName: STATS[statKey] });
  return (
    <section>
      <h2>Tiro azione</h2>
      <label>Mossa <select value={move} onChange={pickMove}>{ACTION_MOVES.map((m) => <option key={m.name}>{m.name}</option>)}</select></label>
      <label>Statistica <select value={statKey} onChange={(e) => setStatKey(e.target.value)}>
        {stats.map((s) => <option key={s} value={s}>{STATS[s]}</option>)}</select>
        <input type="number" min={0} max={statKey === 'scorte' ? 5 : 4} value={stat} onChange={num(setStat)} aria-label="Valore" />
      </label>
      <label>Bonus <input type="number" min={0} max={9} value={adds} onChange={num(setAdds)} /></label>
      <label>Slancio <input type="number" min={-6} max={10} value={momentum} onChange={num(setMomentum)} /></label>
      <button onClick={roll}>Tira</button>
    </section>
  );
}

function ProgressPanel({ onRoll }) {
  const [what, setWhat] = useState('');
  const [clocks, setClocks] = useState(0);
  return (
    <section>
      <h2>Portare a termine</h2>
      <label>Cosa <input value={what} placeholder="voto, viaggio o scontro" onChange={(e) => setWhat(e.target.value)} /></label>
      <label>Orologi completi <input type="number" min={0} max={10} value={clocks} onChange={num(setClocks)} /></label>
      <button onClick={() => onRoll(`Portare a termine${what ? `: ${what}` : ''}`, progressRoll({ clocks }, rollDice.progress()))}>Tira</button>
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

function LogEntry({ row, canBurn, onBurn }) {
  const r = row.result;
  const time = new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const who = <><time>{time}</time> <b>{row.player_name}</b> · {row.move}</>;
  const match = r.match && <em> Doppio!</em>;
  if (r.kind === 'burn') return <li className="burn">{who}: brucia lo slancio, ora è <b>{OUTCOMES[r.outcome]}</b>. Slancio a +2.</li>;
  if (r.kind === 'oracle') {
    return <li>{who}{r.question && <>: «{r.question}»</>} ({r.oddsLabel}) → {r.value}: <b>{r.yes ? 'Sì' : 'No'}</b>{match}</li>;
  }
  const detail = r.kind === 'action'
    ? <>d6 {r.d6}{r.d6Value !== r.d6 && ' (vale 0)'} + {r.statName} {r.stat}{r.adds ? ` + ${r.adds}` : ''} = {r.score}</>
    : <>orologi {r.score}</>;
  return (
    <li className={r.outcome}>
      {who}: {detail} contro {r.c1} e {r.c2} → <b>{OUTCOMES[r.outcome]}</b>{match}
      {r.burn && canBurn && <button className="small" onClick={onBurn}>Brucia lo slancio ({OUTCOMES[r.burn.outcome]})</button>}
    </li>
  );
}
