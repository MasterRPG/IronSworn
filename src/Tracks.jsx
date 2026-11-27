import { useState } from 'react';
import { Text } from './Sheet.jsx';
import { KINDS, RANKS, RANK_STEP, MAX_SEGMENTS, THREAT_SIZE, markProgress, completeClocks, retry } from './rules/progress.js';

// 10 orologi da 4 segmenti: ognuno si riempie a spicchi.
function Progress({ segmenti }) {
  return (
    <span className="progress" role="img" aria-label={`${segmenti} segmenti, ${completeClocks(segmenti)} orologi completi su 10`}>
      {Array.from({ length: 10 }, (_, i) => {
        const filled = Math.max(0, Math.min(4, segmenti - i * 4));
        return <span key={i} className="pclock" style={{ '--p': `${filled * 25}%` }} />;
      })}
    </span>
  );
}

function Threat({ value, onSave }) {
  return (
    <span className="clock threat" role="group" aria-label={`Minaccia: ${value} su ${THREAT_SIZE}`}>
      {Array.from({ length: THREAT_SIZE }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} aria-label={`Minaccia ${n}`}
          onClick={() => onSave(n === value ? n - 1 : n)} />
      ))}
    </span>
  );
}

function Track({ t, chars, onSave, onDelete, onFinish }) {
  const owner = chars.find((c) => c.id === t.personaggio);
  const set = (patch) => onSave(t.id, patch);
  return (
    <article className={`track-card${t.chiuso ? ' closed' : ''}`}>
      <header>
        <span className="muted">{KINDS[t.tipo]}{t.tipo === 'voto' && (owner ? ` personale di ${owner.data.nome}` : ' di gruppo')}</span>
        <Text className="track-name" value={t.nome} aria-label="Nome" onSave={(nome) => nome.trim() && set({ nome })} />
        <select value={t.grado} aria-label="Grado" onChange={(e) => set({ grado: e.target.value })}>
          {RANKS.map((r) => <option key={r} value={r}>{r} ({RANK_STEP[r]})</option>)}</select>
      </header>
      <div className="track-row">
        <Progress segmenti={t.segmenti} />
        <span className="muted">{completeClocks(t.segmenti)}/10</span>
        <button type="button" onClick={() => set({ segmenti: markProgress(t.segmenti, t.grado) })} disabled={t.segmenti >= MAX_SEGMENTS}>
          {t.tipo === 'voto' ? 'Raggiungere una tappa' : 'Segna progresso'} (+{RANK_STEP[t.grado]})</button>
        <button type="button" className="link" onClick={() => set({ segmenti: Math.max(0, t.segmenti - 1) })} aria-label="Togli un segmento">−1</button>
        <button type="button" onClick={() => onFinish(t)}>Portare a termine</button>
      </div>
      {t.tipo === 'voto' && (
        <div className="track-row">
          <label>Giurato su <Text value={t.ferro ?? ''} onSave={(ferro) => set({ ferro })} /></label>
        </div>
      )}
      {t.tipo === 'voto' && (t.minaccia === null
        ? <button type="button" className="link" onClick={() => set({ minaccia: '' })}>+ minaccia</button>
        : (
          <div className="track-row threat-row">
            <label>Minaccia <Text value={t.minaccia} placeholder="cosa succede se ci mettiamo troppo" onSave={(minaccia) => set({ minaccia })} /></label>
            <Threat value={t.minaccia_segmenti} onSave={(minaccia_segmenti) => set({ minaccia_segmenti })} />
            <button type="button" onClick={() => set({ minaccia_segmenti: Math.min(THREAT_SIZE, t.minaccia_segmenti + 1) })}>+1 minaccia</button>
            {t.minaccia_segmenti >= THREAT_SIZE && <span className="warn">La minaccia si compie: raccontatela, poi alzate il grado del voto o rinunciate.</span>}
            <button type="button" className="link" onClick={() => confirm('Togliere la minaccia da questo voto?') && set({ minaccia: null, minaccia_segmenti: 0 })}>togli minaccia</button>
          </div>
        ))}
      {t.tipo === 'scontro' && (
        <div className="track-row">
          {chars.map((c) => {
            const pos = t.posizioni[c.id] ?? 'vantaggio';
            return (
              <button key={c.id} type="button" className={`pos ${pos}`}
                onClick={() => set({ posizioni: { ...t.posizioni, [c.id]: pos === 'vantaggio' ? 'difficolta' : 'vantaggio' } })}>
                {c.data.nome}: {pos === 'vantaggio' ? 'In vantaggio' : 'In difficoltà'}
              </button>
            );
          })}
        </div>
      )}
      <div className="track-row small-actions">
        <button type="button" className="link" onClick={() => confirm('Riprovare: tieni solo il primo orologio e alza il grado?') && set(retry(t))}>Riprovare</button>
        <button type="button" className="link" onClick={() => set({ chiuso: !t.chiuso })}>{t.chiuso ? 'Riapri' : 'Chiudi'}</button>
        <button type="button" className="link" onClick={() => confirm(`Eliminare "${t.nome}"?`) && onDelete(t.id)}>Elimina</button>
      </div>
    </article>
  );
}

function NewTrack({ chars, onCreate }) {
  const [f, setF] = useState({ tipo: 'voto', nome: '', grado: 'Pericoloso', personaggio: '', ferro: '', minaccia: '' });
  const set = (patch) => setF({ ...f, ...patch });
  const submit = (e) => {
    e.preventDefault();
    const voto = f.tipo === 'voto';
    onCreate({
      tipo: f.tipo, nome: f.nome.trim(), grado: f.grado,
      personaggio: voto && f.personaggio ? Number(f.personaggio) : null,
      ferro: voto ? f.ferro.trim() : null,
      minaccia: voto && f.minaccia.trim() ? f.minaccia.trim() : null,
    });
    setF({ ...f, nome: '', ferro: '', minaccia: '' });
  };
  return (
    <form className="new-track" onSubmit={submit}>
      <h3>Nuovo</h3>
      <label>Tipo <select value={f.tipo} onChange={(e) => set({ tipo: e.target.value })}>
        {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>{f.tipo === 'voto' ? 'Voto' : 'Nome'} <input required value={f.nome} onChange={(e) => set({ nome: e.target.value })} /></label>
      <label>Grado <select value={f.grado} onChange={(e) => set({ grado: e.target.value })}>
        {RANKS.map((r) => <option key={r}>{r}</option>)}</select></label>
      {f.tipo === 'voto' && <>
        <label>Di chi <select value={f.personaggio} onChange={(e) => set({ personaggio: e.target.value })}>
          <option value="">del gruppo</option>
          {chars.map((c) => <option key={c.id} value={c.id}>{c.data.nome}</option>)}</select></label>
        <label>Giurato su <input required value={f.ferro} placeholder="la lama, un anello, un chiodo…" onChange={(e) => set({ ferro: e.target.value })} /></label>
        <label>Minaccia <input value={f.minaccia} placeholder="facoltativa" onChange={(e) => set({ minaccia: e.target.value })} /></label>
      </>}
      <button>{f.tipo === 'voto' ? 'Giura sul ferro' : 'Crea'}</button>
    </form>
  );
}

export default function Tracks({ tracks, chars, onSave, onCreate, onDelete, onFinish }) {
  const open = tracks.filter((t) => !t.chiuso);
  const closed = tracks.filter((t) => t.chiuso);
  const props = { chars, onSave, onDelete, onFinish };
  return (
    <div className="tracks">
      <NewTrack chars={chars} onCreate={onCreate} />
      {open.map((t) => <Track key={t.id} t={t} {...props} />)}
      {closed.length > 0 && <details><summary>Chiusi ({closed.length})</summary>{closed.map((t) => <Track key={t.id} t={t} {...props} />)}</details>}
    </div>
  );
}
