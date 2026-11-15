import type { Observacion } from '../tipos/observacion'
export function ObservationMetadata({ observacion }: { observacion?: Observacion }) {
  return <aside className="panel"><p className="eyebrow">METADATOS</p><h2>El contexto de cada imagen.</h2>{observacion ? <dl>{Object.entries(observacion.metadatos).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : <p>Selecciona una futura observación para consultar su fecha, polarizaciones y metadatos de origen.</p>}</aside>
}
