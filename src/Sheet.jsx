import { useEffect, useState } from 'react';
import { ASSET_TYPES, LIMITS, clamp, effectiveStats } from './rules/character.js';
import { completeClocks } from './rules/progress.js';
import { Boxes, Segs } from './Tavolo.jsx';

// Campo di testo che salva quando lo lasci, non a ogni tasto.
export function Text({ value, onSave, area, ...rest }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const Tag = area ? 'textarea' : 'input';
  return <Tag value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} {...rest} />;
}

// Dati salvati con la fase 2: legami come frasi, asset con "rotto".
const legameOf = (l) => (typeof l === 'string' ? { con: '', testo: l } : l);
const statoOf = (a) => a.stato ?? (a.rotto ? 'Rotto' : 'OK');
export const STATI = ['OK', 'Rotto', 'Perso'];
const STAT_NAMES = { fisico: 'Fisico', animo: 'Animo', ingegno: 'Ingegno' };
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

export default function Sheet({ c, readOnly, onChange, vow, onArchive }) {
  const set = (patch) => onChange({ ...c, ...patch });
  const eff = effectiveStats(c);
  const legami = c.legami.map(legameOf);
  const [statAsk, setStatAsk] = useState(null); // { s, v }: le statistiche cambiano di rado, si chiede conferma
  const [ask, setAsk] = useState(null); // eliminazione da confermare: 'a3', 'l1'
  const [assetForm, setAssetForm] = useState(null); // { i, tipo, testo, nota }
  const [bondForm, setBondForm] = useState(null); // { i, con, testo }
  const ed = !readOnly;
  const setStat = (s, v) => v !== c.stats[s] && setStatAsk({ s, v: clamp(v, LIMITS.stat) });

  const saveAsset = () => {
    const a = { tipo: assetForm.tipo, testo: assetForm.testo.trim(), nota: assetForm.nota.trim() };
    if (!a.testo) return;
    set({ asset: assetForm.i == null ? [...c.asset, { ...a, stato: 'OK' }] : c.asset.map((x, j) => (j === assetForm.i ? { ...x, ...a } : x)) });
    setAssetForm(null);
  };
  const saveBond = () => {
    const l = { con: bondForm.con.trim(), testo: bondForm.testo.trim() };
    if (!l.testo) return;
    set({ legami: bondForm.i == null ? [...legami, l] : legami.map((x, j) => (j === bondForm.i ? l : x)) });
    setBondForm(null);
  };

  return (
    <div className="sheet-cols">
      <section>
        <div className="sheet-head">
          {ed ? <Text className="sheet-name" value={c.nome} aria-label="Nome" onSave={(nome) => nome.trim() && set({ nome })} /> : <h2 className="sheet-name">{c.nome}</h2>}
          <p className="muted small-text">{c.mestiere || 'mestiere?'} · giocato da {c.giocatore || '?'}{c.archiviato ? ` · archiviato il ${c.archiviato}` : ''}</p>
        </div>
        {statAsk && (
          <div className="offer" role="alertdialog" aria-label="Conferma modifica statistica">
            <span><b>{STAT_NAMES[statAsk.s]} da {c.stats[statAsk.s]} a {statAsk.v}?</b> Le statistiche cambiano di rado: controlla che non sia un clic per sbaglio.</span>
            <button className="ghost small" onClick={() => setStatAsk(null)}>Annulla</button>
            <button className="small" onClick={() => { set({ stats: { ...c.stats, [statAsk.s]: statAsk.v } }); setStatAsk(null); }}>Conferma</button>
          </div>
        )}
        <div className="stat-grid block">
          {Object.keys(STAT_NAMES).map((s) => (
            <div key={s} className="stat">
              <p className="label">{STAT_NAMES[s]}</p>
              <p className="stat-val">{eff[s]}</p>
              <p className="muted small-text">{eff[s] !== c.stats[s] ? `base ${c.stats[s]}, −1 per ${s === 'fisico' ? 'le cicatrici' : 'gli orrori'}` : ' '}</p>
              {ed && <div className="row"><button className="ghost small" aria-label={`Abbassa ${STAT_NAMES[s]}`} onClick={() => setStat(s, c.stats[s] - 1)} disabled={c.stats[s] <= 0}>−</button>
                <button className="ghost small" aria-label={`Alza ${STAT_NAMES[s]}`} onClick={() => setStat(s, c.stats[s] + 1)} disabled={c.stats[s] >= 4}>+</button></div>}
            </div>
          ))}
        </div>
        <div className="block">
        {[['salute', 'Salute'], ['spirito', 'Spirito']].map(([k, label]) => (
          <div key={k} className="meter">
            <span>{label}</span>
            <Segs n={c[k]} /><span>{c[k]}/6</span>
            {ed && <span className="row push"><button className="ghost small" aria-label={`Cura ${label}`} onClick={() => set({ [k]: clamp(c[k] - 1, LIMITS.clock) })} disabled={c[k] <= 0}>−</button>
              <button className="ghost small" aria-label={`Danno a ${label}`} onClick={() => set({ [k]: clamp(c[k] + 1, LIMITS.clock) })} disabled={c[k] >= 6}>+</button></span>}
          </div>
        ))}
        {(c.salute >= 4 || c.spirito >= 4) && <p className="warn">Salute o Spirito a 4 o più: non puoi guadagnare slancio.</p>}
        </div>
        <div className="block">
        <p className="label">Slancio <span className="hint">(da −6 a +10 · reset +2)</span></p>
        <div className="momentum" role="img" aria-label={`Slancio ${signed(c.slancio)}`}>
          {Array.from({ length: 17 }, (_, i) => i - 6).map((n) => <span key={n} className={n === c.slancio ? 'on' : ''}>{signed(n)}</span>)}
        </div>
        {ed && <div className="row"><button className="ghost small" onClick={() => set({ slancio: clamp(c.slancio - 1, LIMITS.slancio) })}>−1 slancio</button>
          <button className="ghost small" onClick={() => set({ slancio: clamp(c.slancio + 1, LIMITS.slancio) })}>+1 slancio</button>
          <button className="link" onClick={() => set({ slancio: 2 })}>torna a +2</button></div>}
        </div>
      </section>

      <section>
        {[['cicatrici', 'Cicatrici', 'proteggono la Salute · la 2ª dà −1 Fisico', 'Nuova cicatrice, es. zoppo da una gamba'],
          ['orrori', 'Orrori', 'proteggono lo Spirito · il 2° dà −1 Animo', 'Nuovo orrore, es. teme il buio']].map(([k, label, hint, ph]) => {
          const filled = c[k].filter((s) => s.trim());
          return (
            <div key={k} className="block">
              <p className="label">{label} <span className="hint">({hint})</span></p>
              {filled.map((s, i) => <div key={i} className="mark"><span className="n">{i + 1}</span><span>{s}</span><span className="muted small-text">{i === 1 ? `−1 ${k === 'cicatrici' ? 'Fisico' : 'Animo'}` : ''}</span></div>)}
              {filled.length === 0 && <p className="muted small-text">Nessuna.</p>}
              {ed && filled.length < 3 && <AddLine placeholder={ph} label={`Nuov${k === 'cicatrici' ? 'a cicatrice' : 'o orrore'}`}
                onAdd={(t) => confirm(`Segnare "${t}"? ${label} non si tolgono mai.`) && set({ [k]: [...filled, t, '', ''].slice(0, 3) })} />}
              {filled.length === 3 && <p className="muted small-text">Tutte e tre le caselle sono segnate.</p>}
            </div>
          );
        })}
        <div className="block">
          <p className="label">Esperienza</p>
          <p><b>{c.esperienza}</b> / 20 <span className="muted small-text">· asset 3 punti, statistica 6 punti</span></p>
          <div className="xp" role="img" aria-label={`Esperienza ${c.esperienza} su 20`}>{Array.from({ length: 20 }, (_, i) => <span key={i} className={i < c.esperienza ? 'on' : ''} />)}</div>
          {ed && <div className="row"><button className="ghost small" onClick={() => set({ esperienza: Math.min(20, c.esperienza + 1) })} disabled={c.esperienza >= 20}>+ Segna esperienza</button>
            <button className="ghost small" onClick={() => set({ esperienza: Math.max(0, c.esperienza - 1) })} disabled={c.esperienza <= 0}>− Cancella esperienza</button></div>}
        </div>
        <details className="block">
          <summary className="label">Chi è</summary>
          <fieldset className="plain" disabled={!ed}>
            <label className="col">Giocatore <Text value={c.giocatore} onSave={(giocatore) => set({ giocatore })} /></label>
            <label className="col">Mestiere <Text value={c.mestiere} onSave={(mestiere) => set({ mestiere })} /></label>
            <label className="col">Aspetto <Text area rows={2} value={c.aspetto} onSave={(aspetto) => set({ aspetto })} /></label>
            <label className="col">Perché ho lasciato quella vita <Text area rows={3} value={c.passato} onSave={(passato) => set({ passato })} /></label>
          </fieldset>
        </details>
      </section>

      <section>
        <div className="block">
          <p className="label">Asset <span className="hint">(nessun limite)</span></p>
          {c.asset.map((a, i) => (
            <div key={i} className={`item${statoOf(a) !== 'OK' ? ' broken' : ''}`}>
              <div className="row"><span className="tag">{a.tipo}</span><span className="grow asset-text">{a.testo}</span><span className={`state s-${statoOf(a)}`}>{statoOf(a)}</span></div>
              {a.nota && <p className="muted small-text">{a.nota}</p>}
              {ed && ask !== `a${i}` && (
                <div className="row">
                  <span className="muted small-text">Stato</span>
                  {STATI.map((st) => <button key={st} className="chip" aria-pressed={statoOf(a) === st} onClick={() => set({ asset: c.asset.map((x, j) => (j === i ? { ...x, stato: st, rotto: undefined } : x)) })}>{st}</button>)}
                  <span className="grow" />
                  <button className="link" onClick={() => setAssetForm({ i, tipo: a.tipo, testo: a.testo, nota: a.nota ?? '' })}>Modifica</button>
                  <button className="link danger" onClick={() => setAsk(`a${i}`)}>Elimina</button>
                </div>
              )}
              {ask === `a${i}` && <Confirm text={`Eliminare "${a.testo}"?`} onNo={() => setAsk(null)} onYes={() => { set({ asset: c.asset.filter((_, j) => j !== i) }); setAsk(null); }} />}
            </div>
          ))}
          {assetForm && (
            <div className="form">
              <b>{assetForm.i == null ? 'Nuovo asset' : 'Modifica asset'}</b>
              <div className="chips">{ASSET_TYPES.map((t) => <button key={t} className="chip" aria-pressed={assetForm.tipo === t} onClick={() => setAssetForm({ ...assetForm, tipo: t })}>{t}</button>)}</div>
              <label>Nome<input value={assetForm.testo} placeholder="es. Arco" onChange={(e) => setAssetForm({ ...assetForm, testo: e.target.value })} /></label>
              <label>Nota (facoltativa)<input value={assetForm.nota} placeholder="es. corda rotta" onChange={(e) => setAssetForm({ ...assetForm, nota: e.target.value })} /></label>
              <div className="actions"><button className="ghost" onClick={() => setAssetForm(null)}>Annulla</button><button onClick={saveAsset} disabled={!assetForm.testo.trim()}>Salva</button></div>
            </div>
          )}
          {ed && !assetForm && <button className="ghost small" onClick={() => setAssetForm({ i: null, tipo: 'Arma', testo: '', nota: '' })}>+ Aggiungi asset</button>}
        </div>
        <div className="block">
          <p className="label">Legami</p>
          {legami.map((l, i) => (
            <div key={i} className="item">
              <p>{l.con && <b>{l.con}: </b>}{l.testo}</p>
              {ed && ask !== `l${i}` && <div className="row"><span className="grow" /><button className="link" onClick={() => setBondForm({ i, ...l })}>Modifica</button><button className="link danger" onClick={() => setAsk(`l${i}`)}>Elimina</button></div>}
              {ask === `l${i}` && <Confirm text={`Eliminare il legame${l.con ? ` con ${l.con}` : ''}?`} onNo={() => setAsk(null)} onYes={() => { set({ legami: legami.filter((_, j) => j !== i) }); setAsk(null); }} />}
            </div>
          ))}
          {bondForm && (
            <div className="form">
              <b>{bondForm.i == null ? 'Nuovo legame' : 'Modifica legame'}</b>
              <label>Con chi o con cosa<input value={bondForm.con} placeholder="es. Cassandra, Oxenfurt" onChange={(e) => setBondForm({ ...bondForm, con: e.target.value })} /></label>
              <label>Il legame<input value={bondForm.testo} placeholder="es. Le devo la vita" onChange={(e) => setBondForm({ ...bondForm, testo: e.target.value })} /></label>
              <div className="actions"><button className="ghost" onClick={() => setBondForm(null)}>Annulla</button><button onClick={saveBond} disabled={!bondForm.testo.trim()}>Salva</button></div>
            </div>
          )}
          {ed && !bondForm && <button className="ghost small" onClick={() => setBondForm({ i: null, con: '', testo: '' })}>+ Nuovo legame</button>}
        </div>
        <div className="block">
          <p className="label">Voto personale</p>
          {vow ? <>
            <p className="vow-title">{vow.nome}</p>
            <p className="muted small-text">{vow.grado}{vow.ferro ? ` · giurato su ${vow.ferro}` : ''}</p>
            <Boxes segmenti={vow.segmenti} />
            <p className="muted small-text">{completeClocks(vow.segmenti)} orologi completi su 10 · il progresso si segna da "Voti"</p>
          </> : <p className="muted">Nessuno: si giura da "Voti".</p>}
        </div>
        {ed && onArchive && !c.archiviato && (
          <button type="button" className="link danger group" onClick={() => confirm(`Archiviare ${c.nome || 'questo personaggio'}?\n\nUsalo per morte o ritiro: il personaggio esce dal gioco e finisce tra gli archiviati, in sola lettura. Potrai riportarlo in gioco.`) && onArchive()}>
            Archivia il personaggio (morte o ritiro)</button>
        )}
      </section>
    </div>
  );
}

function AddLine({ placeholder, label, onAdd }) {
  const [t, setT] = useState('');
  return (
    <form className="story" onSubmit={(e) => { e.preventDefault(); if (t.trim() && onAdd(t.trim()) !== false) setT(''); }}>
      <input value={t} placeholder={placeholder} aria-label={label} onChange={(e) => setT(e.target.value)} />
      <button className="ghost" disabled={!t.trim()}>Aggiungi</button>
    </form>
  );
}

function Confirm({ text, onNo, onYes }) {
  return <div className="offer"><span>{text}</span><button className="ghost small" onClick={onNo}>No</button><button className="small" onClick={onYes}>Elimina</button></div>;
}
