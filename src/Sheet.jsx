import { useEffect, useState } from 'react';
import { ASSET_TYPES, LIMITS, RANKS, clamp, effectiveStats } from './rules/character.js';

// Campo di testo che salva quando lo lasci, non a ogni tasto.
function Text({ value, onSave, area, ...rest }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const Tag = area ? 'textarea' : 'input';
  return <Tag value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} {...rest} />;
}

function Num({ value, limits, onSave, label }) {
  return <input type="number" aria-label={label} min={limits[0]} max={limits[1]} value={value}
    onChange={(e) => onSave(clamp(e.target.value, limits))} />;
}

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

export default function Sheet({ c, onChange }) {
  const set = (patch) => onChange({ ...c, ...patch });
  const eff = effectiveStats(c);
  const setList = (key, i, val) => set({ [key]: c[key].map((x, j) => (j === i ? val : x)) });
  const setAsset = (i, patch) => set({ asset: c.asset.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  return (
    <details className="sheet">
      <summary>
        <b>{c.nome || 'Senza nome'}</b> {c.giocatore && <span className="muted">({c.giocatore})</span>}
        <span className="summary-stats">
          Fis {eff.fisico} · Ani {eff.animo} · Ing {eff.ingegno} · Slancio {c.slancio > 0 ? '+' : ''}{c.slancio} · Salute {c.salute}/6 · Spirito {c.spirito}/6
        </span>
      </summary>
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
                <Num label={s} value={c.stats[s]} limits={LIMITS.stat} onSave={(v) => set({ stats: { ...c.stats, [s]: v } })} /></span>
            </label>
          ))}
          <label>Salute <Clock label="Salute" value={c.salute} onSave={(salute) => set({ salute })} /></label>
          <label>Spirito <Clock label="Spirito" value={c.spirito} onSave={(spirito) => set({ spirito })} /></label>
          <label>Slancio <Num label="Slancio" value={c.slancio} limits={LIMITS.slancio} onSave={(slancio) => set({ slancio })} /></label>
          <label>Esperienza <Num label="Esperienza" value={c.esperienza} limits={[0, 99]} onSave={(esperienza) => set({ esperienza })} /></label>
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
          {c.legami.map((s, i) => <Text key={i} value={s} onSave={(v) => set({ legami: v.trim() ? c.legami.map((x, j) => (j === i ? v : x)) : c.legami.filter((_, j) => j !== i) })} />)}
          <button type="button" className="link" onClick={() => set({ legami: [...c.legami, 'Nuovo legame'] })}>+ legame</button>
          <h4>Voto personale</h4>
          <Text area rows={2} value={c.voto.testo} onSave={(testo) => set({ voto: { ...c.voto, testo } })} />
          <label>Grado <select value={c.voto.grado} onChange={(e) => set({ voto: { ...c.voto, grado: e.target.value } })}>
            {RANKS.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Giurato su <Text value={c.voto.ferro} onSave={(ferro) => set({ voto: { ...c.voto, ferro } })} /></label>
        </div>
        <div className="wide">
          <h4>Asset</h4>
          {c.asset.map((a, i) => (
            <div key={i} className={`asset${a.rotto ? ' broken' : ''}`}>
              <select value={a.tipo} aria-label="Tipo" onChange={(e) => setAsset(i, { tipo: e.target.value })}>
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <Text area rows={2} value={a.testo} aria-label="Asset" onSave={(testo) => setAsset(i, { testo })} />
              <label className="inline"><input type="checkbox" checked={a.rotto} onChange={(e) => setAsset(i, { rotto: e.target.checked })} /> rotto o perso</label>
              <button type="button" className="link" onClick={() => set({ asset: c.asset.filter((_, j) => j !== i) })}>togli</button>
            </div>
          ))}
          <button type="button" className="link" onClick={() => set({ asset: [...c.asset, { tipo: 'Altro', testo: '', rotto: false }] })}>+ asset</button>
        </div>
      </div>
    </details>
  );
}
