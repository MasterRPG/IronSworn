import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { actionRoll, progressRoll, oracle, rollDice, ODDS } from './rules/dice.js';
import { emptyCharacter } from './rules/character.js';
import Sheet from './Sheet.jsx';
import Tavolo, { Oracolo } from './Tavolo.jsx';
import Tracks from './Tracks.jsx';
import Pages, { Threats } from './Pages.jsx';
import { completeClocks } from './rules/progress.js';
import { trackEvents } from './rules/diario.js';
import Diario from './Diario.jsx';

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
// Matteo è l'amministratore: modifica tutte le schede e solo lui archivia (stessa regola in supabase/012_admin.sql).
const ADMIN_EMAIL = 'matteo@ironsworn.example.com';
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
      <form onSubmit={send} className="login card">
        <h1 className="brand">Ironsworn<small>Giuriamo sul ferro. Paghiamo il prezzo.</small></h1>
        <label>Nome <input required autoComplete="username" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label>Password <input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button>Entra</button>
        <p role="status" className="muted small-text">{state}</p>
      </form>
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
  const [pages, setPages] = useLive('pages', (q) => q.order('id'), setError);
  const [sessions] = useLive('sessions', (q) => q.order('id', { ascending: false }), setError);
  // La sessione in corso parte dopo l'ultima riga del registro finita nel Diario.
  const since = sessions.reduce((m, x) => Math.max(m, x.fino_a), 0);
  const [tab, setTab] = useState('tavolo');
  const scene = party[0] ?? { id: 1, scorte: 5, scena: '', scena_voto: null };
  const uid = session.user.id;
  // Personaggio archiviato (morte o ritiro): resta in fondo alle schede, fuori dal gioco.
  const active = chars.filter((c) => !c.data.archiviato);
  const archived = chars.filter((c) => c.data.archiviato);
  const me = active.find((c) => c.owner === uid);
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
    const old = tracks.find((t) => t.id === id);
    if (old) log(trackEvents(old, patch));
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('tracks').update(patch).eq('id', id);
    if (error) setError(error.message);
  };
  const createTrack = async (row) => {
    const { data, error } = await supabase.from('tracks').insert(row).select().single();
    if (error) return setError(error.message);
    setTracks((ts) => [...ts.filter((t) => t.id !== data.id), data]);
    log([{ kind: 'track', trackId: data.id, tipo: data.tipo, nome: data.nome, cosa: 'nuovo', a: data.grado }]);
  };
  const deleteTrack = async (id) => {
    const old = tracks.find((t) => t.id === id);
    if (old) log([{ kind: 'track', trackId: id, tipo: old.tipo, nome: old.nome, cosa: 'eliminato' }]);
    setTracks((ts) => ts.filter((t) => t.id !== id));
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (error) setError(error.message);
  };
  const savePage = async (id, patch) => {
    setPages((ps) => ps.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('pages').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setError(error.message);
  };
  const createPage = async (row) => {
    const { data, error } = await supabase.from('pages').insert(row).select().single();
    if (error) return setError(error.message);
    setPages((ps) => [...ps.filter((x) => x.id !== data.id), data]);
    return data.id;
  };
  const deletePage = async (id) => {
    setPages((ps) => ps.filter((x) => x.id !== id));
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) setError(error.message);
  };
  // Foto o disegno di una nota: file nello Storage, indirizzo pubblico nella pagina.
  const uploadImage = async (file) => {
    const path = `${crypto.randomUUID()}.${file.type === 'image/png' ? 'png' : file.name?.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('note').upload(path, file, { contentType: file.type });
    if (error) { setError(error.message); return null; }
    return supabase.storage.from('note').getPublicUrl(path).data.publicUrl;
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

  // Righe del registro che non sono tiri (scene, tracciati): le scrive chiunque, anche senza personaggio scelto.
  const log = async (results) => {
    if (!results.length) return;
    const player_name = me?.data.nome || session.user.user_metadata?.nome || 'qualcuno';
    const { data, error } = await supabase.from('rolls').insert(results.map((result) => ({ player_name, move: result.kind === 'scene' ? 'Scena' : 'Tracciato', result }))).select();
    if (error) return setError(error.message);
    data.forEach((row) => setRolls((rs) => upsert(rs, row)));
  };
  const newScene = (patch) => {
    saveParty(patch);
    log([{ kind: 'scene', scena: patch.scena, voto: tracks.find((t) => t.id === patch.scena_voto)?.nome ?? null }]);
  };
  // Chiudere la sessione: copia nel Diario tutto il registro dalla sessione precedente; la scena in corso continua nella prossima.
  const closeSession = async (titolo) => {
    const { data: righe, error } = await supabase.from('rolls').select('*').gt('id', since).order('id');
    if (error) return setError(error.message);
    if (!righe.length) return setError('Il registro di questa sessione è vuoto.');
    const { error: e2 } = await supabase.from('sessions').insert({ titolo, fino_a: righe.at(-1).id, righe });
    if (e2) return setError(e2.message);
    if (scene.scena) log([{ kind: 'scene', scena: scene.scena, voto: tracks.find((t) => t.id === scene.scena_voto)?.nome ?? null, continua: true }]);
  };
  const deleteSession = async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) setError(error.message);
  };
  const note = (testo) => save('Racconto', { kind: 'note', testo });
  const ask = (odds, question) => save("Chiedere all'oracolo", oracle({ odds, question }, rollDice.oracle()));
  const clearLog = async () => {
    const { error } = await supabase.from('rolls').delete().gt('id', 0);
    if (error) return setError(error.message);
    setRolls([]);
  };
  const admin = session.user.email === ADMIN_EMAIL;
  const act = { save, note, ask, challenge, burn, saveChar, saveParty, newScene, saveTrack, scorte, ODDS, since, sessionNumber: sessions.length + 1,
    clearLog: admin ? clearLog : null, closeSession: admin ? closeSession : null };
  const online = usePresence(session, me);

  return (
    <main>
      <header className="topbar">
        <h1 className="brand">Ironsworn<small>Campagna di Oxenfurt</small></h1>
        <div className="online" aria-label="Giocatori collegati">{online.map((p) => <span key={p.key}>{p.nome}{p.pg ? ` · ${p.pg}` : ''}</span>)}</div>
        <div className="me">
          {me
            ? <span>Sono <b>{me.data.nome}</b> <button className="link" onClick={() => setOwner(me.id, null)}>cambia</button></span>
            : <label>Sono <select value="" onChange={(e) => setOwner(Number(e.target.value), uid)}>
                <option value="" disabled>scegli…</option>
                {active.filter((c) => !c.owner).map((c) => <option key={c.id} value={c.id}>{c.data.nome}</option>)}</select></label>}
          <button className="link" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </header>
      <nav className="tabs" aria-label="Sezioni">
        {[['tavolo', 'Tavolo'], ['schede', 'Schede'], ['voti', 'Voti'], ['oracolo', 'Oracolo e tabelle'], ['mondo', 'Il mondo'], ['note', 'Note'], ['diario', 'Diario']].map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} aria-current={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
      {error && <p role="alert" className="error">{error} <button className="link" onClick={() => setError('')}>chiudi</button></p>}
      {tab === 'tavolo' && <Tavolo chars={active} uid={uid} me={me} scorte={scorte} scene={scene} tracks={tracks} rolls={rolls} act={act} />}
      {tab === 'oracolo' && <Oracolo rolls={rolls} me={me} act={act} />}
      {tab === 'voti' && <Tracks tracks={tracks} chars={chars} me={me} scene={scene} onSave={saveTrack} onCreate={createTrack} onDelete={deleteTrack} onFinish={finish} />}
      {tab === 'mondo' && <div className="two-col">
        <Pages pages={pages} groups={[['luogo', 'Luoghi', '+ Nuovo luogo'], ['png', 'PNG', '+ Nuovo PNG']]} onSave={savePage} onCreate={createPage} onDelete={deletePage} />
        <Threats tracks={tracks} onTrack={saveTrack} onNewVow={() => setTab('voti')} />
      </div>}
      {tab === 'note' && <Pages pages={pages} groups={[['nota', 'Note', '+ Nuova nota']]} onSave={savePage} onCreate={createPage} onDelete={deletePage} onUpload={uploadImage} />}
      {tab === 'diario' && <Diario sessions={sessions} onDelete={admin ? deleteSession : null} />}
      {tab === 'schede' && <Schede chars={chars} uid={uid} admin={admin} me={me} tracks={tracks} onSave={saveChar} onAdd={addChar} onUpload={uploadImage} />}
    </main>
  );
}

// Una scheda alla volta, con le linguette dei personaggi; gli archiviati in fondo.
function Schede({ chars, uid, admin, me, tracks, onSave, onAdd, onUpload }) {
  const [sel, setSel] = useState(me?.id ?? chars[0]?.id);
  const c = chars.find((x) => x.id === sel) ?? chars[0];
  const live = chars.filter((x) => !x.data.archiviato);
  const gone = chars.filter((x) => x.data.archiviato);
  const vow = c && tracks.find((t) => t.tipo === 'voto' && t.personaggio === c.id && !t.chiuso);
  const mine = c?.owner === uid;
  const ed = mine || admin;
  return (
    <div className="page">
      <div className="row">
        {live.map((x) => <button key={x.id} className="chip" aria-pressed={x.id === c?.id} onClick={() => setSel(x.id)}>{x.data.nome} · {x.data.giocatore}</button>)}
        <button className="link" onClick={onAdd}>+ nuovo personaggio</button>
        {gone.length > 0 && <select aria-label="Archiviati" value="" onChange={(e) => setSel(Number(e.target.value))}>
          <option value="" disabled>Archiviati ({gone.length})</option>
          {gone.map((x) => <option key={x.id} value={x.id}>{x.data.nome}</option>)}</select>}
        {c && <span className="muted small-text push">{mine ? 'È il tuo personaggio: puoi modificarlo.' : admin ? 'Sei l\'amministratore: puoi modificarlo.' : 'Solo chi gioca questo personaggio può modificarne la scheda.'}</span>}
      </div>
      {c && <Sheet key={c.id} c={c.data} readOnly={!ed || !!c.data.archiviato} vow={vow} onUpload={onUpload} onChange={(data) => onSave(c.id, data)} onArchive={admin && (() => onSave(c.id, { ...c.data, archiviato: new Date().toISOString().slice(0, 10) }))} />}
      {c?.data.archiviato && admin && <button className="link" onClick={() => confirm(`Riportare in gioco ${c.data.nome}?`) && onSave(c.id, { ...c.data, archiviato: undefined })}>Riporta in gioco</button>}
    </div>
  );
}

// Chi è collegato adesso, con Supabase Realtime Presence.
function usePresence(session, me) {
  const [online, setOnline] = useState([]);
  const nome = session.user.user_metadata?.nome || session.user.email.split('@')[0];
  const pg = me?.data.nome ?? '';
  useEffect(() => {
    const channel = supabase.channel('presenze', { config: { presence: { key: session.user.id } } });
    channel
      .on('presence', { event: 'sync' }, () => setOnline(Object.entries(channel.presenceState()).map(([key, [p]]) => ({ key, ...p }))))
      .subscribe((status) => { if (status === 'SUBSCRIBED') channel.track({ nome, pg }); });
    return () => { supabase.removeChannel(channel); };
  }, [session.user.id, nome, pg]);
  return online;
}
