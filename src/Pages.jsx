import { useState } from 'react';
import { Segs } from './Tavolo.jsx';

// "Luoghi e minacce": pagine di note condivise a sinistra, le minacce dei voti a destra.
export default function Pages({ pages, tracks, onSave, onCreate, onDelete, onTrack, onNewVow }) {
  const [sel, setSel] = useState(pages[0]?.id);
  const [form, setForm] = useState(null); // { id?, titolo, testo }
  const [del, setDel] = useState(false);
  const page = pages.find((p) => p.id === sel) ?? pages[0];
  const save = async () => {
    const row = { titolo: form.titolo.trim(), testo: form.testo };
    if (form.id) onSave(form.id, row);
    else setSel(await onCreate(row));
    setForm(null);
  };
  return (
    <div className="two-col">
      <section>
        <div className="row" style={{ marginBottom: 10 }}>
          {pages.map((p) => <button key={p.id} className="chip" aria-pressed={p.id === page?.id && !form} onClick={() => { setSel(p.id); setForm(null); setDel(false); }}>{p.titolo}</button>)}
          <button className="ghost small" onClick={() => setForm({ titolo: '', testo: '' })}>+ Nuova pagina di note</button>
        </div>
        {form ? (
          <div className="form">
            <b>{form.id ? 'Modifica pagina' : 'Nuova pagina'}</b>
            <label>Titolo<input value={form.titolo} placeholder="es. La torre nel bosco" onChange={(e) => setForm({ ...form, titolo: e.target.value })} /></label>
            <label>Testo<textarea rows={14} value={form.testo} placeholder="Luoghi, persone, indizi…" onChange={(e) => setForm({ ...form, testo: e.target.value })} /></label>
            <div className="actions"><button className="ghost" onClick={() => setForm(null)}>Annulla</button><button onClick={save} disabled={!form.titolo.trim()}>Salva</button></div>
          </div>
        ) : page ? (
          <div>
            <div className="row"><h2 className="vow-title grow">{page.titolo}</h2>
              <span className="muted small-text">Modificabile da tutti{page.updated_at ? ` · ultima modifica ${new Date(page.updated_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</span></div>
            <p className="page-text">{page.testo || <span className="muted">Pagina vuota.</span>}</p>
            {!del && <div className="row"><button className="ghost small" onClick={() => setForm({ id: page.id, titolo: page.titolo, testo: page.testo ?? '' })}>Modifica pagina</button>
              <button className="link danger" onClick={() => setDel(true)}>Elimina pagina</button></div>}
            {del && <div className="offer"><span>Eliminare la pagina "{page.titolo}"?</span><button className="ghost small" onClick={() => setDel(false)}>No</button>
              <button className="small" onClick={() => { onDelete(page.id); setDel(false); setSel(undefined); }}>Elimina</button></div>}
          </div>
        ) : <p className="muted">Nessuna pagina.</p>}
      </section>
      <Threats tracks={tracks} onTrack={onTrack} onNewVow={onNewVow} />
    </div>
  );
}

function Threats({ tracks, onTrack, onNewVow }) {
  const [form, setForm] = useState(null); // { nome, voto }
  const vows = tracks.filter((t) => t.tipo === 'voto' && !t.chiuso);
  const threats = vows.filter((t) => t.minaccia !== null);
  const target = form && vows.find((v) => v.id === form.voto);
  return (
    <section>
      <div className="row" style={{ marginBottom: 10 }}><h2 className="section-title grow" style={{ margin: 0 }}>Minacce</h2>
        <button className="ghost small" onClick={() => setForm({ nome: '', voto: null })}>+ Nuova minaccia</button></div>
      {form && (
        <div className="form">
          <b>Nuova minaccia</b>
          <label>Minaccia<input value={form.nome} placeholder="es. Il bosco reclama altri bambini" onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
          <p className="label">Collegata al voto</p>
          <div className="chips">
            {vows.map((v) => <button key={v.id} className="chip" aria-pressed={form.voto === v.id} onClick={() => setForm({ ...form, voto: v.id })}>{v.nome}</button>)}
            <button className="link" onClick={onNewVow}>+ Giura un nuovo voto</button>
          </div>
          {target?.minaccia && <p className="warn">Questo voto ha già la minaccia "{target.minaccia}": la nuova la sostituisce e riparte da 0/6.</p>}
          <div className="actions"><button className="ghost" onClick={() => setForm(null)}>Annulla</button>
            <button disabled={!form.nome.trim() || !target} onClick={() => { onTrack(target.id, { minaccia: form.nome.trim(), minaccia_segmenti: 0 }); setForm(null); }}>Salva</button></div>
        </div>
      )}
      {threats.map((t) => (
        <div key={t.id} className="item">
          <p style={{ margin: 0 }}><b>{t.minaccia}</b></p>
          <div className="meter"><Segs n={t.minaccia_segmenti} threat /><span>{t.minaccia_segmenti}/6</span></div>
          <p className="muted small-text" style={{ margin: 0 }}>Legata al voto: {t.nome}</p>
        </div>
      ))}
      {threats.length === 0 && !form && <p className="muted">Nessuna minaccia sui voti aperti.</p>}
    </section>
  );
}
