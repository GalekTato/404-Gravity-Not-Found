import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { proyecto } from '../../../configuracion/proyecto'
import { MiniTutorial } from '../../../componentes/ui/MiniTutorial'
import {
  COLORES_DESASTRE,
  etiquetaAmenaza,
  etiquetaEvidencia,
  obtenerMetricasModelo,
  obtenerPredicciones,
  obtenerTimeMap,
  type PropiedadesDesastre,
  type ResumenMetricasModelo,
} from '../../explorar/servicios/predicciones'
import { nombreIndicador } from '../../explorar/servicios/textosIndicadores'

export function AprendamosPage() {
  const { t, idioma } = useIdioma()
  const [respuesta, setRespuesta] = useState<string>()
  const [metricas, setMetricas] = useState<ResumenMetricasModelo>()
  const [prediccionesRecientes, setPrediccionesRecientes] = useState<Array<{ props: PropiedadesDesastre; coords: [number, number] }>>([])
  const [periodoMuestra, setPeriodoMuestra] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()
    obtenerMetricasModelo(controller.signal)
      .then(data => { if (!controller.signal.aborted) setMetricas(data) })
      .catch(() => {})
    obtenerTimeMap(undefined, controller.signal)
      .then(async res => {
        if (controller.signal.aborted || !res.markers.length) return
        const ultimo = res.markers[res.markers.length - 1]!.period
        setPeriodoMuestra(ultimo)
        const geojson = await obtenerPredicciones(ultimo, controller.signal)
        if (controller.signal.aborted) return
        const top = [...geojson.features]
          .sort((a, b) => (b.properties.probability ?? 0) - (a.properties.probability ?? 0) || b.properties.severity - a.properties.severity)
          .slice(0, 6)
          .map(f => ({ props: f.properties, coords: f.geometry.coordinates as [number, number] }))
        setPrediccionesRecientes(top)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const lecciones = [
    { titulo: t('El radar mide el eco', 'Radar measures echoes'), texto: t('Un radar emite microondas y registra el eco que vuelve de la superficie. SAR combina mediciones a lo largo del recorrido del instrumento para formar imágenes. La respuesta depende de la geometría, la humedad y la estructura del terreno.', 'Radar emits microwaves and records the echo returned by the surface. SAR combines measurements along the instrument’s path to form images. The response depends on geometry, moisture and surface structure.'), url: 'https://science.nasa.gov/mission/nisar/get-to-know-sar/', fuente: 'NASA · Get to know SAR' },
    { titulo: t('Una señal no explica todo', 'One signal is not the whole story'), texto: t('Un cambio de intensidad puede tener varias causas. Interpretar una imagen exige revisar fechas, geometría de adquisición, polarización y contexto. Una diferencia visual, por sí sola, no confirma un sismo, una inundación o un incendio.', 'A change in intensity can have several causes. Interpretation requires acquisition dates, geometry, polarization and context. A visual difference alone does not confirm an earthquake, flood or fire.'), url: 'https://science.nasa.gov/mission/nisar/get-to-know-sar/', fuente: 'NASA · SAR' },
    { titulo: t('Lee primero la evidencia', 'Read the evidence first'), texto: t('En TerraSync / EarthSync, observed identifica registros marcados como observados por el catálogo; supervised indica una salida etiquetada como supervisada calibrada con datos reales; proxy es un indicador indirecto físico; no_confirmable señala que la evidencia no permite confirmación.', 'In TerraSync / EarthSync, observed identifies catalog-verified observations; supervised denotes calibrated supervised ensemble outputs; proxy is a physical indirect indicator; no_confirmable means confirmation is not supported.'), fuente: t('Contrato del catálogo EarthSync', 'EarthSync catalog contract') },
    { titulo: t('Consulta, compara, escucha y exporta', 'Inspect, compare, listen and export'), texto: t('Selecciona un estado, recorre los meses en el TimeMap, escucha la progresión por círculo de quintas y elige un fenómeno. Observaciones presenta las interpretaciones por sensor y Excel exporta los filtros activos.', 'Select a state, scrub months on the TimeMap, listen to the circle-of-fifths progression and filter hazards. Observations presents sensor-level interpretations and Excel exports your active filters.'), fuente: t('Guía de uso', 'User guide') },
  ]

  const resultadosBacktest = metricas?.backtest?.results ?? []
  const omitidosBacktest = metricas?.backtest?.skipped ?? []

  return (
    <section className="content-page learn-page">
      <div className="page-heading">
        <span className="section-kicker">03 / {t('Aprendizaje y Minería de Datos', 'Learning & Data Mining')}</span>
        <h1>{t('Antes de leer el mapa y sus predicciones.', 'Before you read the map and predictions.')}</h1>
        <p>
          {t(
            'Comprende el funcionamiento del radar SAR, la jerarquía de evidencia, los 6 modelos de minería de datos y las métricas reales de backtesting que respaldan cada predicción.',
            'Understand how SAR radar works, the evidence hierarchy, the 6 data-mining models, and the chronological backtesting metrics behind every prediction.',
          )}
        </p>
        <MiniTutorial />
      </div>

      <div className="lesson-list">
        {lecciones.map((item, index) => (
          <details key={index} className="lesson" open={index === 0 ? true : undefined}>
            <summary><span>0{index + 1}</span><h2>{item.titulo}</h2><span aria-hidden="true">+</span></summary>
            <div>
              <p>{item.texto}</p>
              {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.fuente} ↗</a> : <small>{item.fuente}</small>}
            </div>
          </details>
        ))}
      </div>

      {metricas && (
        <section className="mining-section" aria-label={t('Modelos de minería de datos y validación', 'Data mining models and validation')}>
          <div className="mining-header">
            <span className="section-kicker">{t('Arquitectura Predictiva', 'Predictive Architecture')}</span>
            <h2>{t('Modelos de minería de datos y calibración', 'Data-mining models & calibration')}</h2>
            <p>
              {t(
                'Combinamos índices físicos compuestos con un ensamble supervisado (Logistic Regression, Random Forest, Extra Trees), fusión log-odds calibrada a tasa base y detección de anomalías multivariadas (Isolation Forest + Autoencoder en PyTorch CUDA).',
                'We combine composite physical indices with a supervised ensemble (Logistic Regression, Random Forest, Extra Trees), base-rate log-odds calibration, and multivariate anomaly detection (Isolation Forest + PyTorch CUDA Autoencoder).',
              )}
            </p>
          </div>

          <div className="model-cards-grid">
            {metricas.models.map(mod => (
              <article key={mod.id} className="model-card">
                <h3>{idioma === 'es' ? mod.name_es : mod.name_en}</h3>
                <p className="model-algos">{mod.algorithms.join(' · ')}</p>
                <p className="model-calibration">{mod.calibration}</p>
                <code className="model-formula">{mod.formula}</code>
              </article>
            ))}
          </div>

          {resultadosBacktest.length > 0 && (
            <div className="backtest-panel">
              <h3>{t('Validación cronológica estricta (Backtesting Temporal)', 'Strict chronological backtesting')}</h3>
              <div className="table-scroll" tabIndex={0} role="region" aria-label={t('Métricas de backtesting', 'Backtesting metrics')}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('Amenaza', 'Hazard')}</th>
                      <th>{t('Verdad terreno', 'Ground truth source')}</th>
                      <th>{t('Ventana (Train / Test)', 'Split (Train / Test)')}</th>
                      <th>ROC-AUC</th>
                      <th>F1</th>
                      <th>{t('Precisión', 'Precision')}</th>
                      <th>Recall</th>
                      <th>Brier Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosBacktest.map(row => (
                      <tr key={row.hazard_type}>
                        <td><strong>{etiquetaAmenaza(row.hazard_type as PropiedadesDesastre['type'], idioma)}</strong></td>
                        <td>{row.source}</td>
                        <td>{row.train_months} / {row.test_months} {t('meses', 'mo')}</td>
                        <td><strong>{row.roc_auc.toFixed(4)}</strong></td>
                        <td>{row.f1.toFixed(4)}</td>
                        <td>{row.precision.toFixed(4)}</td>
                        <td>{row.recall.toFixed(4)}</td>
                        <td>{row.brier_score.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {omitidosBacktest.length > 0 && (
                <ul className="backtest-skipped-notes">
                  {omitidosBacktest.map(sk => (
                    <li key={sk.hazard_type}>
                      <strong>{etiquetaAmenaza(sk.hazard_type as PropiedadesDesastre['type'], idioma)}:</strong> {sk.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {prediccionesRecientes.length > 0 && (
        <section className="predictions-showcase" aria-label={t('Predicciones recientes del modelo', 'Recent model predictions')}>
          <div className="mining-header">
            <span className="section-kicker">{t('Inferencia en vivo', 'Live inference')} · {periodoMuestra}</span>
            <h2>{t('Cómo explica el modelo las predicciones activas', 'How the model explains active predictions')}</h2>
            <p>
              {t(
                'Cada punto combina probabilidad calibrada (0–100%), severidad escalada (0–10) y radio de influencia espacial asignado a la entidad federativa correspondiente.',
                'Each point combines calibrated probability (0–100%), scaled severity (0–10), and spatial radius assigned to its corresponding Mexican federal entity.',
              )}
            </p>
          </div>
          <div className="prediction-cards-grid">
            {prediccionesRecientes.map(({ props, coords }) => (
              <article key={props.id} className="prediction-explain-card">
                <div className="prediction-card-top">
                  <span style={{ color: COLORES_DESASTRE[props.type] }}>{etiquetaAmenaza(props.type, idioma)}</span>
                  <span className={`evidence-tag evidence-${props.evidence}`}>{etiquetaEvidencia(props.evidence, idioma)}</span>
                </div>
                <h3>{props.state_name ?? 'México'}</h3>
                <p className="prediction-card-title">{nombreIndicador(props.name, idioma)}</p>
                <dl className="prediction-card-stats">
                  <div>
                    <dt>{t('Probabilidad', 'Probability')}</dt>
                    <dd>{typeof props.probability === 'number' ? `${(props.probability * 100).toFixed(0)}%` : '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('Severidad', 'Severity')}</dt>
                    <dd>{props.severity.toFixed(1)}/10</dd>
                  </div>
                  <div>
                    <dt>{t('Coords', 'Coords')}</dt>
                    <dd>{coords[1].toFixed(2)}°, {coords[0].toFixed(2)}°</dd>
                  </div>
                </dl>
                <Link className="text-link" to={`/explorar?period=${props.month ?? props.date.slice(0, 7)}${props.state_clave ? `&state=${props.state_clave}` : ''}&type=${props.type}`}>
                  {t('Ver en el mapa', 'Inspect on map')} ↗
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="knowledge-check">
        <span className="section-kicker">{t('Ponlo a prueba', 'Try it')}</span>
        <h2>{t('Un indicador proxy aumenta. ¿Qué puedes concluir?', 'A proxy indicator increases. What can you conclude?')}</h2>
        <div>
          {[
            [t('El fenómeno está confirmado', 'The event is confirmed'), 'confirmado'],
            [t('Hay una señal que requiere contexto', 'There is a signal that needs context'), 'contexto'],
          ].map(([texto, valor]) => (
            <button key={valor} aria-pressed={respuesta === valor} onClick={() => setRespuesta(valor)}>{texto}</button>
          ))}
        </div>
        {respuesta && (
          <p role="status">
            {respuesta === 'contexto'
              ? t('Correcto. Revisa la fuente, la cobertura y otras evidencias antes de interpretar la señal.', 'Correct. Check the source, coverage and other evidence before interpreting the signal.')
              : t('Un proxy no confirma un evento. Es una señal indirecta que necesita contexto y corroboración.', 'A proxy does not confirm an event. It is an indirect signal that needs context and corroboration.')}
          </p>
        )}
      </section>

      <section className="team-section">
        <div>
          <span className="section-kicker">{t('El proyecto', 'The project')}</span>
          <h2>{proyecto.nombreCorto}</h2>
          <img className="team-logo" src={proyecto.logoEquipo} width="200" height="200" alt={t('Logo del equipo 404 Gravity Not Found', '404 Gravity Not Found team logo')} loading="lazy" />
        </div>
        <div>
          <p>
            {t(
              'Atlas geoespacial y sistema de minería de datos de México (Equipo 404 Gravity Not Found) para explorar observaciones multisensor, interpretar evidencia física y sonificar series históricas.',
              'Geospatial atlas and data-mining system for Mexico (Team 404 Gravity Not Found) to explore multisensor observations, interpret physical evidence, and sonify historical series.',
            )}
          </p>
          {proyecto.integrantes.length > 0 && (
            <ul>{proyecto.integrantes.map(nombre => <li key={nombre}>{nombre}</li>)}</ul>
          )}
          <a href={proyecto.github} target="_blank" rel="noreferrer">{t('Código en GitHub', 'Source on GitHub')} ↗</a>
          <Link to="/explorar">{t('Ir al mapa', 'Open the map')} →</Link>
        </div>
      </section>

      <details className="source-credits">
        <summary>{t('Fuentes y créditos', 'Sources and credits')}</summary>
        <ul>
          <li><a href="https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/" target="_blank" rel="noreferrer">NASA · Blue Marble</a> — {t('textura del globo; la órbita es ilustrativa.', 'globe texture; the orbit is illustrative.')}</li>
          <li><a href={`${import.meta.env.BASE_URL}creditos-iconos.txt`} target="_blank" rel="noreferrer">Solar Icons · 480 Design</a></li>
          <li><a href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noreferrer">INEGI · Marco Geoestadístico</a></li>
        </ul>
      </details>
    </section>
  )
}
