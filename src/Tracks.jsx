import { useState } from 'react';
import { KINDS, RANKS, RANK_STEP, MAX_SEGMENTS, markProgress, completeClocks, retry, addThreat, setThreat } from './rules/progress.js';
import { Boxes, ThreatMeter } from './Tavolo.jsx';

// Le scelte del modulo: un voto è di gruppo o personale; gli altri tracciati sono di tutti.
const FORM_KINDS = [['gruppo', 'Voto di gruppo'], ['personale', 'Voto personale'], ['viaggio', 'Viaggio'], ['scontro', 'Scontro'], ['luogo', 'Luogo pericoloso']];
const kindOf = (t) => (t.tipo === 'voto' ? (t.personaggio ? 'personale' : 'gruppo') : t.tipo);

function TrackForm({ form, setForm, chars, me, onSave }) {
  const isVow = form.kind === 'gruppo' || form.kind === 'personale';
  const ok = form.nome.trim() && (!isVow || form.ferro.trim()) && (form.kind !== 'personale' || form.personaggio);
  return (
    <div className="form">
      <b>{form.id ? 'Modifica' : 'Nuovo tracciato'}</b>
      {!form.id && <div className="chips">{FORM_KINDS.map(([k, l]) => (
        <button key={k} className="chip" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k, personaggio: k === 'personale' ? form.personaggio || me?.id || null : null })}>{l}</button>
      ))}</div>}
      <label>Titolo<input value={form.nome} placeholder={isVow ? 'es. Trovare chi ha avvelenato il pozzo' : 'es. Sconfiggere il lupo'} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
      <p className="label">Grado</p>
      <div className="chips">{RANKS.map((r) => <button key={r} className="chip" aria-pressed={form.grado === r} onClick={() => setForm({ ...form, grado: r })}>{r} ({RANK_STEP[r]})</button>)}</div>
      {form.kind === 'personale' && <>
        <p className="label">Di chi</p>
        <div className="chips">{chars.map((c) => <button key={c.id} className="chip" aria-pressed={form.personaggio === c.id} onClick={() => setForm({ ...form, personaggio: c.id })}>{c.data.nome}</button>)}</div>
      </>}
      {isVow && <>
        <label>Oggetto di ferro su cui giurate<input value={form.ferro} placeholder="es. l'Ancora" onChange={(e) => setForm({ ...form, ferro: e.target.value })} /></label>
        {!form.id && <label>Minaccia (facoltativa)<input value={form.minaccia} placeholder="es. Il bosco reclama altri bambini" onChange={(e) => setForm({ ...form, minaccia: e.target.value })} /></label>}
      </>}
      <div className="actions"><button className="ghost" onClick={() => setForm(null)}>Annulla</button><button disabled={!ok} onClick={() => { onSave(form); setForm(null); }}>Salva</button></div>
    </div>
  );
}

function Track({ t, chars, scene, onSave, onDelete, onFinish, onEdit }) {
  const [del, setDel] = useState(false);
  const [adding, setAdding] = useState(null); // testo della nuova minaccia
  const owner = chars.find((c) => c.id === t.personaggio);
  const set = (patch) => onSave(t.id, patch);
  const isScene = scene.scena_voto === t.id;
  return (
    <article className={`card track-card${t.chiuso ? ' closed' : ''}`}>
      <div className="row">
        <span className="tag">{t.tipo === 'voto' ? (owner ? 'Voto personale' : 'Voto di gruppo') : KINDS[t.tipo]}</span>
        <span className="muted small-text">{t.grado} · {RANK_STEP[t.grado]} segmenti</span>
        {owner && <span className="muted small-text push">{owner.data.nome}</span>}
      </div>
      <p className="vow-title">{t.nome}</p>
      {t.tipo === 'voto' && t.ferro && <p className="muted small-text">Giurato su: {t.ferro}</p>}
      <Boxes segmenti={t.segmenti} />
      <p className="muted small-text">{completeClocks(t.segmenti)} orologi completi su 10</p>
      {t.tipo === 'voto' && t.minacce.map((m) => (
        <div key={m.id} className="threat-box">
          <div className="row"><p className="grow">{m.nome}</p>
            <button className="link" onClick={() => confirm(`Togliere la minaccia "${m.nome}" da questo voto?`) && set({ minacce: t.minacce.filter((x) => x.id !== m.id) })}>togli</button></div>
          <ThreatMeter m={m} onSet={(n) => set({ minacce: setThreat(t.minacce, m.id, n) })} />
        </div>
      ))}
      {t.tipo === 'voto' && (adding === null
        ? <button className="link" onClick={() => setAdding('')}>+ aggiungi minaccia</button>
        : <div className="story"><input value={adding} autoFocus placeholder="es. Il bosco reclama altri bambini" aria-label="Nuova minaccia" onChange={(e) => setAdding(e.target.value)} />
            <button className="ghost small" onClick={() => setAdding(null)}>Annulla</button>
            <button className="small" disabled={!adding.trim()} onClick={() => { set({ minacce: addThreat(t.minacce, adding.trim()) }); setAdding(null); }}>Aggiungi</button></div>)}
      {t.tipo === 'scontro' && (
        <div className="row">
          {chars.map((c) => {
            const pos = t.posizioni[c.id] ?? 'vantaggio';
            return (
              <button key={c.id} type="button" className={`chip pos ${pos}`} onClick={() => set({ posizioni: { ...t.posizioni, [c.id]: pos === 'vantaggio' ? 'difficolta' : 'vantaggio' } })}>
                {c.data.nome}: {pos === 'vantaggio' ? 'In vantaggio' : 'In difficoltà'}
              </button>
            );
          })}
          <span className="muted small-text">clic per cambiare</span>
        </div>
      )}
      {isScene && <p className="small-text accent-text">Collegato alla scena in corso</p>}
      <div className="row group">
        <button className="small" onClick={() => set({ segmenti: markProgress(t.segmenti, t.grado) })} disabled={t.segmenti >= MAX_SEGMENTS}>Segna progresso (+{RANK_STEP[t.grado]})</button>
        <button className="ghost small" onClick={() => onFinish(t)}>Portare a termine</button>
      </div>
      {!del && (
        <div className="row">
          <button className="link" onClick={() => set({ segmenti: Math.max(0, t.segmenti - 1) })}>−1 segmento</button>
          <button className="link" onClick={() => confirm('Riprovare: tieni solo il primo orologio e alza il grado?') && set(retry(t))}>Riprovare</button>
          <span className="grow" />
          <button className="link" onClick={onEdit}>Modifica</button>
          <button className="link" onClick={() => set({ chiuso: !t.chiuso })}>{t.chiuso ? 'Riapri' : 'Chiudi'}</button>
          <button className="link danger" onClick={() => setDel(true)} disabled={isScene} title={isScene ? 'È il voto della scena in corso' : ''}>Elimina</button>
        </div>
      )}
      {del && <div className="offer"><span>Eliminare "{t.nome}" con il suo progresso?</span><button className="ghost small" onClick={() => setDel(false)}>No</button><button className="small" onClick={() => onDelete(t.id)}>Elimina</button></div>}
    </article>
  );
}

export default function Tracks({ tracks, chars, me, scene, onSave, onCreate, onDelete, onFinish }) {
  const [form, setForm] = useState(null);
  const live = chars.filter((c) => !c.data.archiviato);
  const open = tracks.filter((t) => !t.chiuso);
  const closed = tracks.filter((t) => t.chiuso);
  const start = (kind) => setForm({ kind, nome: '', grado: 'Pericoloso', personaggio: kind === 'personale' ? me?.id ?? null : null, ferro: '', minaccia: '' });
  const edit = (t) => setForm({ id: t.id, kind: kindOf(t), nome: t.nome, grado: t.grado, personaggio: t.personaggio, ferro: t.ferro ?? '' });
  const save = (f) => {
    const voto = f.kind === 'gruppo' || f.kind === 'personale';
    const row = {
      nome: f.nome.trim(), grado: f.grado,
      personaggio: f.kind === 'personale' ? f.personaggio : null,
      ferro: voto ? f.ferro.trim() : null,
    };
    if (f.id) onSave(f.id, row);
    else onCreate({ ...row, tipo: voto ? 'voto' : f.kind, minacce: voto && f.minaccia.trim() ? addThreat([], f.minaccia.trim()) : [] });
  };
  const props = { chars: live, scene, onSave, onDelete, onFinish };
  return (
    <div className="page">
      <div className="row">
        <h2 className="section-title grow">Voti, viaggi e scontri</h2>
        <button className="small" onClick={() => start('gruppo')}>+ Giura un nuovo voto</button>
        <button className="ghost small" onClick={() => start('viaggio')}>+ Nuovo viaggio</button>
        <button className="ghost small" onClick={() => start('scontro')}>+ Nuovo scontro</button>
        <button className="ghost small" onClick={() => start('luogo')}>+ Luogo pericoloso</button>
      </div>
      {form && <TrackForm form={form} setForm={setForm} chars={live} me={me} onSave={save} />}
      <div className="track-grid">{open.map((t) => <Track key={t.id} t={t} {...props} onEdit={() => edit(t)} />)}</div>
      {open.length === 0 && <p className="muted">Nessun tracciato aperto.</p>}
      {closed.length > 0 && <details><summary className="label">Chiusi ({closed.length})</summary>
        <div className="track-grid">{closed.map((t) => <Track key={t.id} t={t} {...props} onEdit={() => edit(t)} />)}</div></details>}
    </div>
  );
}
