import { Text } from './Sheet.jsx';

export default function Pages({ pages, onSave, onCreate, onDelete }) {
  return (
    <div className="pages">
      {pages.map((p) => (
        <details key={p.id} className="page">
          <summary><b>{p.titolo}</b></summary>
          <Text value={p.titolo} aria-label="Titolo" onSave={(titolo) => titolo.trim() && onSave(p.id, { titolo })} />
          <Text area rows={10} value={p.testo} aria-label="Testo" onSave={(testo) => onSave(p.id, { testo })} />
          <button type="button" className="link" onClick={() => confirm(`Eliminare la pagina "${p.titolo}"?`) && onDelete(p.id)}>Elimina pagina</button>
        </details>
      ))}
      <button className="link" onClick={() => onCreate({ titolo: 'Nuova pagina' })}>+ nuova pagina</button>
    </div>
  );
}
