# Presentación y documento técnico

- `presentacion.tex`: 13 diapositivas, formato 16:9, con captura de la aplicación.
- `documento-tecnico.tex`: arquitectura, contratos, filtros, exportación, interpretación, ejecución y límites de validación.
- Los PDF se generan junto a las fuentes. Los nombres personales están pendientes de confirmación; no se inventaron integrantes.

Con MiKTeX o TeX Live instalados, desde esta carpeta (la presentación usa `article` en formato panorámico y no requiere Beamer):

```sh
pdflatex -interaction=nonstopmode -halt-on-error documento-tecnico.tex
pdflatex -interaction=nonstopmode -halt-on-error documento-tecnico.tex
pdflatex -interaction=nonstopmode -halt-on-error presentacion.tex
pdflatex -interaction=nonstopmode -halt-on-error presentacion.tex
```

El documento describe las capacidades del código y distingue comprobación informática de validación científica. Actualiza las cifras si sustituyes el catálogo. Para personalizar nombre, integrantes y GitHub en la aplicación, edita `src/configuracion/proyecto.ts`; actualiza también los autores de los archivos LaTeX.
