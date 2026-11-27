import { useState } from 'react';

// Un'immagine cliccabile: apre "full" intera in sovraimpressione, un altro clic la chiude.
export default function Lightbox({ src, full, className, alt = '' }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="img-button" aria-label="Vedi l'immagine intera" onClick={() => setOpen(true)}><img className={className} src={src} alt={alt} /></button>
    {open && <div className="lightbox" role="dialog" aria-label="Immagine intera" onClick={() => setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} tabIndex={-1} ref={(el) => el?.focus()}>
      <img src={full || src} alt={alt} />
    </div>}
  </>;
}
