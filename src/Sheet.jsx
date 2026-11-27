import { useEffect, useState } from 'react';
import { ASSET_TYPES, LIMITS, clamp, effectiveStats } from './rules/character.js';

// Campo di testo che salva quando lo lasci, non a ogni tasto.
export function Text({ value, onSave, area, ...rest }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const Tag = area ? 'textarea' : 'input';
  return <Tag value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} {...rest} />;
}

function Num({ value, limits, onSave, label }) {
  return <input type="number" aria-label={label} min={limits[0]} max={limits[1]} value={value}
    onChange={(e) => onSave(clamp(e.target.value, limits))} />;
}

// Tracciato a caselle (esperienza 0-20): un clic segna fino a lì, un clic sull'ultima segnata la cancella.
function Track({ value, size, onSave, label }) {
  return (
    <span className="track" role="group" aria-label={`${label}: ${value} su ${size}`}>
      {Array.from({ length: size }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} aria-label={`${label} ${n}`}
          onClick={() => onSave(n === value ? n - 1 : n)} />
      ))}
    </span>
  );
}

// Dati salvati con la fase 2: legami come frasi, asset con "rotto".
const legameOf = (l) => (typeof l === 'string' ? { con: '', testo: l } : l);
const statoOf = (a) => a.stato ?? (a.rotto ? 'Rotto' : 'OK');
export const STATI = ['OK', 'Rotto', 'Perso'];

// Orologio da 6 segmenti: un clic segna fino a lì, un clic sull'ultimo segnato lo toglie.
function Clock({ value, onSave, label }) {
  return (
    <span className="clock" role="group" aria-label={`${label}: ${value} su 6`}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} aria-label={`${label} ${n}`}
          onClick={() => onSave(n === value ? n - 1 : n)} />
      ))}
    </span>
  );
}

export default function Sheet({ c, readOnly, onChange }) {
  const set = (patch) => onChange({ ...c, ...patch });
  const eff = effectiveStats(c);
  const setList = (key, i, val) => set({ [key]: c[key].map((x, j) => (j === i ? val : x)) });
  const setAsset = (i, patch) => set({ asset: c.asset.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const legami = c.legami.map(legameOf);
  const setLegame = (i, patch) => set({ legami: legami.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  // Le statistiche cambiano di rado: si chiede conferma per evitare clic per sbaglio.
  const setStat = (s, v) => v !== c.stats[s] && confirm(`Cambiare ${s} da ${c.stats[s]} a ${v}?`) && set({ stats: { ...c.stats, [s]: v } });
  const sure = (what) => confirm(`Eliminare ${what}?`);

  return (
    <details className="sheet">
      <summary>
        <b>{c.nome || 'Senza nome'}</b> {c.archiviato && <span className="muted">archiviato il {c.archiviato}</span>} {c.giocatore && <span className="muted">({c.giocatore})</span>}
        <span className="summary-stats">
          Fis {eff.fisico} · Ani {eff.animo} · Ing {eff.ingegno} · Slancio {c.slancio > 0 ? '+' : ''}{c.slancio} · Salute {c.salute}/6 · Spirito {c.spirito}/6
        </span>
      </summary>
      {readOnly && <p className="muted">Solo chi gioca questo personaggio può modificarne la scheda.</p>}
      <fieldset className="sheet-fields" disabled={readOnly}>
      <div className="sheet-grid">
        <div>
          <label>Nome <Text value={c.nome} onSave={(nome) => set({ nome })} /></label>
          <label>Giocatore <Text value={c.giocatore} onSave={(giocatore) => set({ giocatore })} /></label>
          <label>Mestiere <Text value={c.mestiere} onSave={(mestiere) => set({ mestiere })} /></label>
          <label className="col">Aspetto <Text area rows={2} value={c.aspetto} onSave={(aspetto) => set({ aspetto })} /></label>
          <label className="col">Perché ho lasciato quella vita <Text area rows={3} value={c.passato} onSave={(passato) => set({ passato })} /></label>
        </div>
        <div>
          {['fisico', 'animo', 'ingegno'].map((s) => (
            <label key={s}>{s[0].toUpperCase() + s.slice(1)}
              <span>{eff[s] !== c.stats[s] && <span className="muted">vale {eff[s]} </span>}
                <Num label={s} value={c.stats[s]} limits={LIMITS.stat} onSave={(v) => setStat(s, v)} /></span>
            </label>
          ))}
          <label>Salute <Clock label="Salute" value={c.salute} onSave={(salute) => set({ salute })} /></label>
          <label>Spirito <Clock label="Spirito" value={c.spirito} onSave={(spirito) => set({ spirito })} /></label>
          <label>Slancio <Num label="Slancio" value={c.slancio} limits={LIMITS.slancio} onSave={(slancio) => set({ slancio })} /></label>
          <label className="col">Esperienza ({c.esperienza}/20)
            <Track label="Esperienza" size={20} value={Math.min(20, c.esperienza)} onSave={(esperienza) => set({ esperienza })} /></label>
          {(c.salute >= 4 || c.spirito >= 4) && <p className="warn">Salute o Spirito a 4 o più: non puoi guadagnare slancio.</p>}
        </div>
        <div>
          <h4>Cicatrici <small className="muted">(la seconda: −1 Fisico)</small></h4>
          {c.cicatrici.map((s, i) => <Text key={i} value={s} placeholder="—" onSave={(v) => setList('cicatrici', i, v)} />)}
          <h4>Orrori <small className="muted">(il secondo: −1 Animo)</small></h4>
          {c.orrori.map((s, i) => <Text key={i} value={s} placeholder="—" onSave={(v) => setList('orrori', i, v)} />)}
        </div>
        <div>
          <h4>Legami</h4>
          {legami.map((l, i) => (
            <div key={i} className="legame">
              <Text value={l.con} placeholder="con chi" aria-label="Con chi" onSave={(con) => setLegame(i, { con })} />
              <Text area rows={2} value={l.testo} placeholder="il legame" aria-label="Legame" onSave={(testo) => setLegame(i, { testo })} />
              <button type="button" className="link" onClick={() => sure('questo legame') && set({ legami: legami.filter((_, j) => j !== i) })}>elimina</button>
            </div>
          ))}
          <button type="button" className="link" onClick={() => set({ legami: [...legami, { con: '', testo: '' }] })}>+ legame</button>
          <h4>Voto personale</h4>
          <p className="muted">I voti, personali e di gruppo, con tracciato e minaccia sono in "Voti e tracciati".</p>
        </div>
        <div className="wide">
          <h4>Asset</h4>
          {c.asset.map((a, i) => (
            <div key={i} className={`asset${statoOf(a) !== 'OK' ? ' broken' : ''}`}>
              <select value={a.tipo} aria-label="Tipo" onChange={(e) => setAsset(i, { tipo: e.target.value })}>
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <Text area rows={2} value={a.testo} aria-label="Asset" onSave={(testo) => setAsset(i, { testo })} />
              <select value={statoOf(a)} aria-label="Stato" onChange={(e) => setAsset(i, { stato: e.target.value, rotto: undefined })}>
                {STATI.map((t) => <option key={t}>{t}</option>)}</select>
              <button type="button" className="link" onClick={() => sure('questo asset') && set({ asset: c.asset.filter((_, j) => j !== i) })}>elimina</button>
            </div>
          ))}
          <button type="button" className="link" onClick={() => set({ asset: [...c.asset, { tipo: 'Altro', testo: '', stato: 'OK' }] })}>+ asset</button>
        </div>
      </div>
      {!c.archiviato && (
        <button type="button" className="link danger" onClick={() => confirm(`Archiviare ${c.nome || 'questo personaggio'}?\n\nUsalo per morte o ritiro: il personaggio esce dal gioco e finisce tra gli archiviati, in sola lettura. Potrai riportarlo in gioco.`) && set({ archiviato: new Date().toISOString().slice(0, 10) })}>
          Archivia il personaggio (morte o ritiro)</button>
      )}
      </fieldset>
    </details>
  );
}
