import { useState } from 'react';
import Layer from './Layer.jsx';

// Un'immagine cliccabile: apre "full" intera in un riquadro trascinabile.
export default function Lightbox({ src, full, className, alt = '' }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="img-button" aria-label="Vedi l'immagine intera" onClick={() => setOpen(true)}><img className={className} src={src} alt={alt} /></button>
    {open && <Layer wide title={alt || 'Immagine'} onClose={() => setOpen(false)}><img className="layer-img" src={full || src} alt={alt} /></Layer>}
  </>;
}
