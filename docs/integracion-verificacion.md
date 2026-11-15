# Verificación de integración local

Front actual → proxy Vite `/api` → Django de `404-Gravity-Not-Found-integration` → PostgreSQL. `404-Gravity-Not-Found-back` es la implementación anterior con simulaciones y se conserva como referencia.

## Validación funcional

- `pnpm typecheck`, `pnpm lint` y `pnpm build`: correctos. Vite conserva el aviso de bundles de más de 500 kB.
- `python manage.py check`: sin incidencias.
- `python manage.py test nasa_api.test_catalog --noinput`: tres pruebas correctas en una base temporal. Se corrigió el uso de `unittest.TestCase`, que permitía sincronizar los datos de prueba sobre la base de desarrollo; ahora usa `django.test.TestCase`.
- API y PostgreSQL saludables; API expuesta en `127.0.0.1:8000`, PostgreSQL dentro de la red Docker.
- API accesible desde `127.0.0.1:5173/api`: 3,290 registros, 203 meses y 32 entidades. Noviembre de 2026 devuelve 43 puntos.
- Chrome con mapa y TimeMap cargados a 1440, 1024, 768 y 390 píxeles, sin desbordamiento horizontal. Prueba de interacción a 390: octubre de 2026 devuelve ocho indicadores; filtro de incendio selecciona noviembre, último mes disponible para ese filtro, y devuelve 29 indicadores.
- Créditos del mapa visibles, controles separados del aviso de indicadores en móvil. Capturas temporales en `.taste-skill/integration-*.png`.

## Revisión visual de la skill

GATE: QUICK, sin aprobación visual general.

Se aplicó `design-taste-frontend` conservando la composición y paleta existentes. Su revisión rápida inicial detectó 17 hallazgos: incluye requisitos de landing page (márgenes, hero visible, secciones y momentos) que no corresponden al alcance de conectar este explorador, además de superposiciones y contraste. Se corrigieron los créditos tapados por TimeMap, el contraste de los créditos y la superposición del texto de estado con los controles móviles. Las capturas funcionales se repitieron después de esos cambios; no se completó un gate general ni se añadieron excepciones al verificador. Quedan pendientes la revisión completa de accesibilidad y los objetivos táctiles individuales de la tira histórica, que cuenta con botones anterior/siguiente adicionales. No se certificó rendimiento en GPU física.

Los datos son los artefactos incluidos en integration. Estas comprobaciones verifican la conexión y la interfaz; no validan científicamente la procedencia ni la calibración del catálogo.
