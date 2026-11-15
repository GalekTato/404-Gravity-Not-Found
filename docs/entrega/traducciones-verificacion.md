# Verificación de traducciones de las fichas

Fecha: 15 de noviembre de 2026.

Se centralizó el contenido de las fichas en `fichaIndicador.ts`. Los títulos del catálogo se traducen mediante `textosIndicadores.ts`, compartido por el mapa y Observaciones. Los datos originales, nombres geográficos y siglas de las fuentes se conservan.

Se renderizaron las 3,290 fichas del catálogo espacial en español e inglés (6,580 comprobaciones), revisando las etiquetas y la ausencia de valores `undefined`. También se comprobó la conversión de los títulos de español a inglés y de vuelta a español.

Los 706 registros de incendios abarcan focos activos VIIRS, incendios forestales observados y riesgo de incendio. Ninguno conservó las etiquetas inglesas revisadas al renderizarse en español.

En Chrome se verificó el cambio de idioma con una ficha abierta, sin volver a solicitar el catálogo, y las etiquetas de evidencia de Observaciones. Se comprobó también la ficha de Aguascalientes tanto en desarrollo como en Docker local: severidad 3.5/10, 2 detecciones, radio 75 km, fecha 2026-11-11, evidencia Observada, probabilidad 100% y puntuación 1.13.

La revisión posterior incluye una aserción específica para el título de Sinaloa: `Focos activos VIIRS (32 detecciones) · Sinaloa` debe convertirse en `VIIRS active fires (32 detections) · Sinaloa` con EN, y volver al título español con ES sin cerrar la ficha. También se probaron espacios no separables y una sola detección. La barra del mapa y la cabecera general usan ahora el logo original de 404 Gravity Not Found; el favicon apunta al mismo recurso.

La PWA utiliza el registro de actualización automática de Workbox, con comprobación al recuperar visibilidad o conexión y cada minuto mientras está visible. Una pestaña que ejecuta la versión anterior necesita una primera recarga para incorporar este código. Se verificó el registro de la PWA en Docker; la actualización entre dos versiones futuras no se simuló.

Al retirar los rótulos de Inicio, se verificó también `http://localhost:8080/`, además de `127.0.0.1`. El HTML de navegación ahora utiliza NetworkFirst con respaldo sin conexión, en lugar de recuperarse del precache. Se conserva `registerSW.js` como compatibilidad para versiones antiguas y se evita almacenar el HTML en la caché HTTP sin validación. Chrome confirmó la ausencia de ambos rótulos, el control del service worker, la caché de navegación actual y la recarga sin conexión. Una pestaña que todavía presenta la interfaz antigua requiere una recarga completa inicial.

Validación técnica: TypeScript y lint sin errores; compilación de producción correcta; contenedores locales saludables. La compilación mantiene el aviso existente de tamaño de los paquetes JavaScript.
