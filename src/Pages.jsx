import { useEffect, useRef, useState } from 'react';
import { Segs } from './Tavolo.jsx';

// Pagine condivise, divise per tipo: groups = [[tipo, etichetta, testo del pulsante "nuovo"], …].
export default function Pages({ pages, groups, onSave, onCreate, onDelete, onUpload }) {
  const mine = pages.filter((p) => groups.some(([tipo]) => tipo === p.tipo));
  const [sel, setSel] = useState(mine[0]?.id);
  const [form, setForm] = useState(null); // { id?, tipo, titolo, testo }
  const [del, setDel] = useState(false);
  const page = mine.find((p) => p.id === sel) ?? mine[0];
  const save = async () => {
    const row = { tipo: form.tipo, titolo: form.titolo.trim(), testo: form.testo };
    if (form.id) onSave(form.id, row);
    else setSel(await onCreate(row));
    setForm(null);
  };
  return (
    <section>
      {groups.map(([tipo, title, add]) => (
        <div key={tipo} className="stack">
          <p className="label">{title}</p>
          <div className="row">
            {mine.filter((p) => p.tipo === tipo).map((p) => <button key={p.id} className="chip" aria-pressed={p.id === page?.id && !form} onClick={() => { setSel(p.id); setForm(null); setDel(false); }}>{p.titolo}</button>)}
            <button className="ghost small" onClick={() => { setForm({ tipo, titolo: '', testo: '' }); setDel(false); }}>{add}</button>
          </div>
        </div>
      ))}
      {form ? (
        <div className="form group">
          <b>{form.id ? 'Modifica' : add(groups, form.tipo)}</b>
          {groups.length > 1 && <div className="chips">{groups.map(([tipo, title]) => <button key={tipo} className="chip" aria-pressed={form.tipo === tipo} onClick={() => setForm({ ...form, tipo })}>{title}</button>)}</div>}
          <label>Nome<input value={form.titolo} placeholder={form.tipo === 'png' ? 'es. Godfried, il locandiere' : 'es. La torre nel bosco'} onChange={(e) => setForm({ ...form, titolo: e.target.value })} /></label>
          <label>Testo<textarea rows={14} value={form.testo} placeholder={form.tipo === 'png' ? 'Chi è, cosa vuole, cosa sa…' : 'Com\'è, chi ci vive, indizi…'} onChange={(e) => setForm({ ...form, testo: e.target.value })} /></label>
          <div className="actions"><button className="ghost" onClick={() => setForm(null)}>Annulla</button><button onClick={save} disabled={!form.titolo.trim()}>Salva</button></div>
        </div>
      ) : page ? (
        <div className="stack group">
          <div className="row"><h2 className="vow-title grow">{page.titolo}</h2>
            <span className="muted small-text">Modificabile da tutti{page.updated_at ? ` · ultima modifica ${new Date(page.updated_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</span></div>
          <p className="page-text">{page.testo || <span className="muted">Pagina vuota.</span>}</p>
          {onUpload && <Media page={page} onSave={onSave} onUpload={onUpload} />}
          {!del && <div className="row group"><button className="ghost small" onClick={() => setForm({ id: page.id, tipo: page.tipo, titolo: page.titolo, testo: page.testo ?? '' })}>Modifica</button>
            <button className="link danger" onClick={() => setDel(true)}>Elimina</button></div>}
          {del && <div className="offer"><span>Eliminare {page.tipo === 'png' ? 'il PNG' : 'la pagina'} "{page.titolo}"?</span><button className="ghost small" onClick={() => setDel(false)}>No</button>
            <button className="small" onClick={() => { onDelete(page.id); setDel(false); setSel(undefined); }}>Elimina</button></div>}
        </div>
      ) : <p className="muted group">Ancora niente qui.</p>}
    </section>
  );
}

// Foto (trascinate o scelte) e disegni a mano di una nota.
// shortcut: due persone che aggiungono immagini nello stesso istante possono sovrascriversi, se succede serve una tabella a parte.
function Media({ page, onSave, onUpload }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sketch, setSketch] = useState(false);
  const [del, setDel] = useState(null);
  const file = useRef(null);
  const imgs = page.immagini ?? [];
  const add = async (files) => {
    setBusy(true);
    const urls = (await Promise.all([...files].filter((f) => f.type.startsWith('image/')).map(onUpload))).filter(Boolean);
    if (urls.length) onSave(page.id, { immagini: [...imgs, ...urls] });
    setBusy(false);
  };
  return (
    <div className="stack group">
      {imgs.length > 0 && <div className="gallery">{imgs.map((u) => (
        <figure key={u}><a href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>
          {del === u
            ? <div className="row small-text"><span>Togliere?</span><button className="link" onClick={() => setDel(null)}>No</button><button className="link danger" onClick={() => { onSave(page.id, { immagini: imgs.filter((x) => x !== u) }); setDel(null); }}>Togli</button></div>
            : <button className="link danger small-text" onClick={() => setDel(u)}>Togli</button>}
        </figure>
      ))}</div>}
      {sketch ? <Sketch onCancel={() => setSketch(false)} onSave={async (blob) => { setSketch(false); await add([blob]); }} /> : (
        <div className={`drop${drag ? ' over' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
          <span className="muted">{busy ? 'Carico…' : 'Trascina qui le foto, oppure'}</span>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
          <button className="ghost small" onClick={() => file.current.click()}>Scegli foto</button>
          <button className="ghost small" onClick={() => setSketch(true)}>Disegna</button>
        </div>
      )}
    </div>
  );
}

const INK = ['#ECE8E1', '#E8954A', '#8DB4D9', '#E07A6C'];

// Disegno a mano libera su una tela; il risultato è un PNG come una foto.
function Sketch({ onCancel, onSave }) {
  const ref = useRef(null);
  const [ink, setInk] = useState(INK[0]);
  const last = useRef(null);
  const at = (e) => { const r = ref.current.getBoundingClientRect(); return [(e.clientX - r.left) * (ref.current.width / r.width), (e.clientY - r.top) * (ref.current.height / r.height)]; };
  const down = (e) => { ref.current.setPointerCapture(e.pointerId); last.current = at(e); };
  const move = (e) => {
    if (!last.current) return;
    const ctx = ref.current.getContext('2d'); const p = at(e);
    Object.assign(ctx, { strokeStyle: ink, lineWidth: 4, lineCap: 'round', lineJoin: 'round' });
    ctx.beginPath(); ctx.moveTo(...last.current); ctx.lineTo(...p); ctx.stroke(); last.current = p;
  };
  const clear = () => { const ctx = ref.current.getContext('2d'); ctx.fillStyle = '#191b1f'; ctx.fillRect(0, 0, ref.current.width, ref.current.height); };
  useEffect(clear, []);
  return (
    <div className="form">
      <b>Disegno</b>
      <canvas ref={ref} className="sketch" width={1000} height={600} aria-label="Tela per disegnare" onPointerDown={down} onPointerMove={move} onPointerUp={() => { last.current = null; }} onPointerCancel={() => { last.current = null; }} />
      <div className="row">
        {INK.map((c) => <button key={c} className="chip swatch" aria-label={`Colore ${c}`} aria-pressed={ink === c} style={{ '--ink': c }} onClick={() => setInk(c)} />)}
        <button className="link" onClick={clear}>Cancella tutto</button>
      </div>
      <div className="actions"><button className="ghost" onClick={onCancel}>Annulla</button><button onClick={() => ref.current.toBlob((b) => onSave(b), 'image/png')}>Salva disegno</button></div>
    </div>
  );
}

const add = (groups, tipo) => groups.find(([t]) => t === tipo)[2].replace('+ ', '');

export function Threats({ tracks, onTrack, onNewVow }) {
  const [form, setForm] = useState(null); // { nome, voto }
  const vows = tracks.filter((t) => t.tipo === 'voto' && !t.chiuso);
  const threats = vows.filter((t) => t.minaccia !== null);
  const target = form && vows.find((v) => v.id === form.voto);
  return (
    <section>
      <div className="row"><h2 className="section-title grow">Minacce</h2>
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
          <p className="vow-title">{t.minaccia}</p>
          <div className="meter"><span>Minaccia</span><Segs n={t.minaccia_segmenti} threat /><span>{t.minaccia_segmenti}/6</span></div>
          <p className="muted small-text">Legata al voto: {t.nome}</p>
        </div>
      ))}
      {threats.length === 0 && !form && <p className="muted">Nessuna minaccia sui voti aperti.</p>}
    </section>
  );
}
