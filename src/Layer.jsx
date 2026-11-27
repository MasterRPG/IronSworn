import { useEffect, useRef, useState } from 'react';

// Riquadro sopra la pagina: si trascina dalla testata, si chiude con la X o con Esc. La pagina sotto resta usabile.
export default function Layer({ title, onClose, wide, children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const down = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => drag.current && setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  return (
    <div className={`layer${wide ? ' wide' : ''}`} role="dialog" aria-label={title} style={{ '--x': `${pos.x}px`, '--y': `${pos.y}px` }}>
      <div className="layer-head" onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }}>
        <b className="grow">{title}</b>
        <button className="ghost small" aria-label="Chiudi" autoFocus onClick={onClose}>✕</button>
      </div>
      <div className="layer-body">{children}</div>
    </div>
  );
}

// Il pulsante "i" che apre un riquadro con il testo completo.
export function Info({ title, children }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="info" aria-label={`Testo completo: ${title}`} aria-expanded={open} onClick={() => setOpen(!open)}>i</button>
    {open && <Layer title={title} onClose={() => setOpen(false)}>{children}</Layer>}
  </>;
}
