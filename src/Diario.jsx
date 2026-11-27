import { useState } from 'react';
import { LogEntry } from './Tavolo.jsx';
import Lightbox from './Lightbox.jsx';
import { splitScenes, summary, trackText } from './rules/diario.js';

const ESITI = { strong: ['successo pieno', 'successi pieni'], weak: ['successo parziale', 'successi parziali'], miss: ['fallimento', 'fallimenti'] };
const when = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

// Esiti delle mosse e avanzamenti di un gruppo di righe del registro.
function Recap({ rows }) {
  const { esiti, avanzamenti } = summary(rows);
  const schede = rows.filter((r) => r.result.kind === 'char');
  const immagini = rows.flatMap((r) => (r.result.kind === 'image' ? r.result.urls : r.result.url ? [r.result.url] : []));
  const mosse = Object.entries(esiti).filter(([, n]) => n).map(([k, n]) => `${n} ${ESITI[k][n === 1 ? 0 : 1]}`);
  return <>
    {mosse.length > 0 && <p className="small-text muted">Mosse: {mosse.join(' · ')}</p>}
    {avanzamenti.length > 0 && <ul className="choices">{avanzamenti.map((c, i) => <li key={i}>{trackText(c)}</li>)}</ul>}
    {schede.length > 0 && <ul className="choices sheet-changes">{schede.map(({ id, result: c }) => <li key={id}><b>{c.pg}</b> {c.testo}</li>)}</ul>}
    {immagini.length > 0 && <div className="log-imgs">{immagini.map((u) => <Lightbox key={u} className="log-img" src={u} />)}</div>}
  </>;
}

// Le sessioni chiuse, dalla più recente: il recap è diviso per scena.
export default function Diario({ sessions, onDelete }) {
  const [sel, setSel] = useState(sessions[0]?.id);
  const [del, setDel] = useState(null); // 'elimina' | 'riapri'
  const s = sessions.find((x) => x.id === sel) ?? sessions[0];
  if (!s) return <section><h2 className="section-title">Diario</h2><p className="muted">Ancora nessuna sessione chiusa. Alla fine di una serata, l'amministratore la chiude dal registro del Tavolo.</p></section>;
  const scenes = splitScenes(s.righe);
  return (
    <div className="page">
      <div className="row">{sessions.map((x) => (
        <button key={x.id} className="chip" aria-pressed={x.id === s.id} onClick={() => { setSel(x.id); setDel(null); }}>{x.titolo} · {new Date(x.created_at).toLocaleDateString('it-IT')}</button>
      ))}</div>
      <section>
        <div className="row"><h2 className="section-title grow">{s.titolo}</h2>
          <span className="muted small-text">{when(s.created_at)} · {scenes.filter((x) => x.scena).length} scene · {s.righe.length} righe</span></div>
        <p className="label">Tutta la sessione</p>
        <Recap rows={s.righe} />
        {scenes.map((x, i) => (
          <div key={i} className="item group">
            <p className="vow-title">{x.scena ?? 'Prima della prima scena'}</p>
            {x.voto && <p className="muted small-text">Per il voto {x.voto}</p>}
            <Recap rows={x.rows} />
            {x.rows.length > 0
              ? <details><summary className="small-text muted">Registro della scena ({x.rows.length})</summary>
                  <ol className="log full">{x.rows.map((r) => <LogEntry key={r.id} row={r} mine />)}</ol></details>
              : <p className="muted small-text">Niente nel registro in questa scena.</p>}
          </div>
        ))}
        {onDelete && !del && <div className="row group"><span className="grow" />
          {s.id === sessions[0].id && <button className="link" onClick={() => setDel('riapri')}>Riapri</button>}
          <button className="link danger" onClick={() => setDel('elimina')}>Elimina</button></div>}
        {del && <div className="offer group"><span>{del === 'riapri'
          ? `Riaprire "${s.titolo}"? Esce dal Diario e le sue righe tornano nel registro del Tavolo, se non è stato pulito.`
          : `Eliminare per sempre "${s.titolo}" e le sue righe del registro? Non si può annullare.`}</span>
          <button className="ghost small" onClick={() => setDel(null)}>No</button>
          <button className="small" onClick={() => { onDelete(s, del === 'elimina'); setDel(null); setSel(undefined); }}>{del === 'riapri' ? 'Riapri' : 'Elimina'}</button></div>}
      </section>
    </div>
  );
}
