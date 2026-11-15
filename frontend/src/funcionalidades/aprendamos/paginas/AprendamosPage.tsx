import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useIdioma } from '../../../configuracion/idiomaContexto'
import { proyecto } from '../../../configuracion/proyecto'
import { MiniTutorial } from '../../../componentes/ui/MiniTutorial'

export function AprendamosPage() {
  const { t } = useIdioma()
  const [respuesta, setRespuesta] = useState<string>()

  const lecciones = [
    {
      titulo: t('Qué muestran los datos satelitales', 'What satellite data shows'),
      texto: t(
        'Satélites como GPM, MODIS y GLDAS miden lluvia, temperatura del suelo y humedad cada mes en todo México. TerraSync agrupa esas mediciones por estado para detectar condiciones fuera de lo normal.',
        'Satellites like GPM, MODIS, and GLDAS measure rainfall, land temperature, and soil moisture every month across Mexico. TerraSync groups these readings by state to spot unusual conditions.',
      ),
    },
    {
      titulo: t('Diferencia entre observación y predicción', 'Observation vs. prediction'),
      texto: t(
        'Un registro "Observado" corresponde a un evento confirmado en el terreno o por satélite (por ejemplo un sismo del USGS, un huracán o un foco de calor). Una "Predicción" estima la probabilidad mensual de riesgo a partir de patrones climáticos, incluyendo pronósticos para 2027.',
        'An "Observed" record is an event confirmed on the ground or by satellite (such as a USGS earthquake, a cyclone, or a fire hotspot). A "Forecast" estimates monthly hazard probability from climate patterns, including 2027 projections.',
      ),
    },
    {
      titulo: t('Qué significa cada etiqueta de evidencia', 'Understanding evidence labels'),
      texto: t(
        'En TerraSync verás tres niveles claros: Observada (evento medido directamente), Supervisada (predicción calibrada con historial real de incendios o ciclones) e Indicador indirecto (señal física preventiva del suelo o radar).',
        'In TerraSync you will see three clear levels: Observed (directly measured event), Supervised (forecast calibrated with historical fire or cyclone records), and Proxy indicator (preventive soil or radar signal).',
      ),
    },
    {
      titulo: t('Cómo explorar, escuchar y exportar', 'How to explore, listen, and export'),
      texto: t(
        'En Explorar puedes filtrar por estado y mover la línea del tiempo (2010–2027) o pulsar "Escuchar quintas" para oír los cambios en música. En Observaciones puedes revisar las predicciones mes por mes y descargar la tabla en Excel.',
        'In Explore you can filter by state, scrub the timeline (2010–2027), or press "Listen (5ths)" to hear hazard activity in music. In Observations you can browse monthly forecasts and export results to Excel.',
      ),
    },
  ]

  const guiasModelo = [
    {
      titulo: t('Lluvias e inundaciones', 'Rainfall & floods'),
      resumen: t(
        'Compara cuánta lluvia y humedad superficial se acumulan en cada estado frente al historial de ciclones tropicales para calcular qué regiones tienen mayor probabilidad de inundación.',
        'Compares accumulated rainfall and soil runoff per state against historical tropical cyclone tracks to estimate which regions face higher flood risk.',
      ),
    },
    {
      titulo: t('Incendios y sequía', 'Wildfires & drought'),
      resumen: t(
        'Revisa el calor acumulado en la superficie, la falta de lluvia y la sequedad del suelo para anticipar temporadas secas con mayor riesgo de incendio o estrés hídrico.',
        'Checks surface heat buildup, rainfall deficits, and soil dryness to anticipate dry seasons with higher wildfire or drought risk.',
      ),
    },
    {
      titulo: t('Radar y sismos', 'Radar & earthquakes'),
      resumen: t(
        'Cruza el catálogo sísmico histórico con mediciones de radar satelital para identificar cambios del terreno y zonas sísmicamente activas sin reemplazar alertas oficiales.',
        'Cross-checks historical earthquake catalogs with radar backscatter measurements to highlight ground changes and seismically active areas without replacing official alerts.',
      ),
    },
  ]

  return (
    <section className="content-page learn-page">
      <div className="page-heading">
        <span className="section-kicker">03 / {t('Aprende', 'Learn')}</span>
        <h1>{t('Guía rápida para interpretar el mapa y las predicciones.', 'Quick guide to reading the map and forecasts.')}</h1>
        <p>
          {t(
            'Explicaciones breves y sencillas sobre de dónde salen los indicadores de TerraSync y cómo leerlos con criterio.',
            'Short, friendly explanations on where TerraSync indicators come from and how to interpret them clearly.',
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
            </div>
          </details>
        ))}
      </div>

      <section className="mining-section" aria-label={t('Cómo estima los riesgos TerraSync', 'How TerraSync estimates risk')}>
        <div className="mining-header">
          <span className="section-kicker">{t('Funcionamiento sencillo', 'Simple overview')}</span>
          <h2>{t('¿Cómo genera sus predicciones el sistema?', 'How does the system make predictions?')}</h2>
          <p>
            {t(
              'El sistema revisa más de 16 años de mediciones satelitales en los 32 estados de México y busca similitudes con eventos pasados para estimar riesgos mensuales actuales y para 2027.',
              'The system reviews over 16 years of satellite readings across all 32 Mexican states and matches patterns against past events to estimate current and 2027 monthly risk levels.',
            )}
          </p>
        </div>

        <div className="model-cards-grid">
          {guiasModelo.map(guia => (
            <article key={guia.titulo} className="model-card">
              <h3>{guia.titulo}</h3>
              <p className="model-calibration">{guia.resumen}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="knowledge-check">
        <span className="section-kicker">{t('Ponlo a prueba', 'Quick check')}</span>
        <h2>{t('Si ves una predicción alta en el mapa, ¿qué significa?', 'If you see a high forecast on the map, what does it mean?')}</h2>
        <div>
          {[
            [t('Que el desastre ya ocurrió con certeza', 'That the disaster is already confirmed'), 'confirmado'],
            [t('Que hay condiciones favorables y conviene revisar el contexto', 'That conditions are favorable and worth monitoring'), 'contexto'],
          ].map(([texto, valor]) => (
            <button key={valor} aria-pressed={respuesta === valor} onClick={() => setRespuesta(valor)}>{texto}</button>
          ))}
        </div>
        {respuesta && (
          <p role="status">
            {respuesta === 'contexto'
              ? t('Correcto. Las predicciones ayudan a anticipar y vigilar zonas prioritarias, complementando siempre la información oficial.', 'Correct. Forecasts help anticipate and monitor priority areas while always complementing official alerts.')
              : t('No necesariamente ha ocurrido: una predicción indica probabilidad elevada según patrones satelitales e históricos.', 'Not necessarily confirmed yet: a forecast shows elevated likelihood based on satellite and historical patterns.')}
          </p>
        )}
      </section>

      <section className="team-section">
        <div className="team-brand-col">
          <span className="section-kicker">{t('El proyecto', 'The project')}</span>
          <h2>{proyecto.nombreCorto}</h2>
          <img className="team-logo" src={proyecto.logoEquipo} width="200" height="200" alt={t('Logo del equipo 404 Gravity Not Found', '404 Gravity Not Found team logo')} loading="lazy" />
        </div>
        <div>
          <p>
            {t(
              'Plataforma geoespacial desarrollada por el equipo 404 Gravity Not Found para explorar observaciones satelitales, pronósticos por entidad federativa y sonificación histórica en México.',
              'Geospatial platform built by Team 404 Gravity Not Found to explore satellite observations, state-level forecasts, and historical sonification across Mexico.',
            )}
          </p>
          {proyecto.integrantes.length > 0 && (
            <ul>{proyecto.integrantes.map(nombre => <li key={nombre}>{nombre}</li>)}</ul>
          )}
          <a href={proyecto.github} target="_blank" rel="noreferrer">{t('Código en GitHub', 'Source on GitHub')} ↗</a>
          <Link to="/explorar">{t('Ir al mapa', 'Open the map')} →</Link>
        </div>
      </section>

      <details className="source-credits" open>
        <summary>{t('Fuentes y créditos de datos', 'Data sources and credits')}</summary>
        <ul>
          <li><a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer">NASA GPM IMERG v07B</a> — {t('precipitación satelital mensual en México.', 'monthly satellite precipitation in Mexico.')}</li>
          <li><a href="https://ldas.gsfc.nasa.gov/gldas" target="_blank" rel="noreferrer">NASA GLDAS Noah v2.1</a> — {t('humedad del suelo, escurrimiento superficial y variables climáticas.', 'soil moisture, surface runoff, and climate variables.')}</li>
          <li><a href="https://modis.gsfc.nasa.gov/data/dataprod/mod11.php" target="_blank" rel="noreferrer">NASA Terra MODIS (MOD11C3)</a> — {t('temperatura superficial terrestre diurna y nocturna.', 'daytime and nighttime land surface temperature.')}</li>
          <li><a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noreferrer">NASA FIRMS (VIIRS) y EONET v3</a> — {t('focos de calor activos e incendios forestales históricos.', 'active fire hotspots and historical wildfires.')}</li>
          <li><a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">JAXA ALOS PALSAR y NASA-ISRO NISAR</a> — {t('mediciones de radar polarimétrico SAR.', 'polarimetric SAR radar measurements.')}</li>
          <li><a href="https://earthquake.usgs.gov/earthquakes/search/" target="_blank" rel="noreferrer">USGS Earthquake Catalog</a> — {t('catálogo histórico de sismos en México.', 'historical earthquake catalog for Mexico.')}</li>
          <li><a href="https://www.ncei.noaa.gov/products/international-best-track-archive" target="_blank" rel="noreferrer">NOAA IBTrACS v04r01</a> — {t('trayectorias de ciclones tropicales en Atlántico y Pacífico.', 'North Atlantic and Eastern Pacific tropical cyclone tracks.')}</li>
          <li><a href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noreferrer">INEGI · Marco Geoestadístico</a> — {t('división política estatal y municipal de México.', 'state and municipal boundaries of Mexico.')}</li>
        </ul>
      </details>
    </section>
  )
}
