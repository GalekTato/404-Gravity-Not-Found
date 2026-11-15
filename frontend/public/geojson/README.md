# Cartografía del INEGI

Fuente: [Servicio Web del Catálogo Único de Claves Geoestadísticas del INEGI](https://www.inegi.org.mx/servicios/catalogounico/).

- Entidades: `https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/`.
- Municipios por entidad: `https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/{clave}`.
- Condiciones de uso: https://www.inegi.org.mx/inegi/terminos.html.
- Metadatos vectoriales recibidos: **INEGI. Marco Geoestadístico, diciembre de 2025**.

Se incluyen 32 entidades y 2,478 municipios o demarcaciones. `procedencia.json` registra por archivo el endpoint, la fecha de descarga, los metadatos originales, el conteo, tamaño y SHA-256. Los metadatos originales también nombran el Censo 2020 para sus atributos estadísticos; esos atributos se descartan y no se presentan en la interfaz.

Transformaciones: selección de claves y nombres, asignación de IDs GeoJSON y redondeo de coordenadas a seis decimales. No se simplifican vértices. Las coordenadas GeoJSON están en longitud y latitud WGS84. Los puntos para etiquetas se calculan dentro del polígono principal de cada entidad; son posiciones de rótulo, no capitales ni ubicaciones de estudio.

Estas áreas geoestadísticas permiten referenciar información estadística y **no determinan límites político-administrativos con valor legal**. No contienen observaciones NISAR.

Desde la raíz, `pnpm datos:verificar` audita la copia sin red. `pnpm datos:geografia` vuelve a generar los archivos a partir del servicio, usando una caché de originales en el directorio temporal `front404-inegi`. Los cortes futuros pueden modificar conteos y metadatos; revisar la importación antes de cambiar la cartografía de la aplicación.
