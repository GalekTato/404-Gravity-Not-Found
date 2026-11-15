# Revisión de paleta con Taste Skill

Este informe corresponde a la revisión anterior de salvia y morado. La paleta actual se refinó a carbón y verde grisáceo oscuro por petición del usuario; sus tokens están en `paleta.md`. No se ha repetido el gate general sobre ese último ajuste.

GATE: FAIL 33 (round 1 of 3)

El alcance solicitado es el color del frontend. El gate completo también exige cambios de composición, navegación, textos y efectos. No se presenta como una aprobación general. No se añadieron waivers ni se modificó el verificador.

Contraste: contrast=PASS, text-contrast=PASS, button-contrast=PASS.

Relaciones calculadas: texto/panel 15.08:1; texto secundario/superficie elevada 6.89:1; acento/selección 5.17:1; texto/botón principal 9.06:1; detalle/superficie elevada 6.70:1.

TypeScript, Oxlint y compilación PWA pasan. Sigue el aviso previo de bundles grandes. Se revisaron capturas de Inicio a 1440 y 390, Observaciones a 1440 y Aprendamos a 390. No se ejecutó perf.mjs ni la matriz de tamaños 1024/820/768. No se certifica rendimiento en GPU física.

Se conservan tipografía, textos, Solar Icons, navegación inferior y fondo espacial. No se añadieron fotografías, contactos ni datos científicos. La paleta propia se adaptó mediante start.mjs brand. Los detalles morados responden a la preferencia expresa del usuario, que prevalece sobre la regla de la skill contra ese matiz.

## Hallazgos abiertos

Los ocho avisos shader-lint corresponden a JavaScript y shaders internos de Three.js, incluidos identificadores de la propia biblioteca. Se consideran posibles falsos positivos y se conservan en el informe; el globo se dibuja en las capturas. Las demás observaciones se mantienen abiertas porque corregirlas ampliaría el cambio de color a estructura, textos, tamaños o comportamiento.

- **shader-lint** — deps/three.module-DPL99mAF.js "static": a shader uses "static" as a name (line 6: static fill(texture) {): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "__THREE_DEVTOOLS__": a shader uses "__THREE_DEVTOOLS__" as a name (line 22: if (typeof __THREE_DEVTOOLS__ !== "undefined") __THREE_DEVTOOLS__.dispatchEvent(new Custom): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "__THREE__": a shader uses "__THREE__" as a name (line 24: if (window.__THREE__) warn("WARNING: Multiple instances of Three.js being imported.");): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "gl_DrawID": a shader uses "gl_DrawID" as a name (line 166: batching_pars_vertex: "#ifdef USE_BATCHING\n	#if ! defined( GL_ANGLE_multi_draw )\n	#defin): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "common": a shader uses "common" as a name (line 181: common: "#define PI 3.141592653589793\n#define PI2 6.283185307179586\n#define PI_HALF 1.57): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "sampler3D": a shader uses "sampler3D" as a name (line 213: lightprobes_pars_fragment: "#if NUM_LIGHT_PROBE_GRIDS > 0\nuniform highp sampler3D probesS): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "sampler2DShadow": a shader uses "sampler2DShadow" as a name (line 247: shadowmap_pars_fragment: "#if NUM_SPOT_LIGHT_COORDS > 0\n	varying vec4 vSpotLightCoord[ NU): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **shader-lint** — deps/three.module-DPL99mAF.js "this": a shader uses "this" as a name (line 822: this.matrixWorld.copyPosition(camera.matrixWorld);): GLSL ES reserves it, so a strict GPU rejects the whole shader and the picture stays empty
- **hero-fill** — main#contenido > div.home-space > section.discovery-section "Acércate a lo que nos rodea.": the next section shows on the first screen: it starts at 780px on a 900px screen (the hero ends at 780px)
- **nav** — (the first screen): no nav bar across the top of the first screen (a header with the brand, the section links and the main action)
- **overlap-text** — section.hero-section.space-hero > div.space-experience > div.space-canvas > canvas: lies over the text "TerraSync Millones de historias. Una nue" (div.hero-copy > h1)
- **cta** — main#contenido > div.home-space > section.mission-strip "Una mirada al futuro con NISAR.": the last section before the footer ends with no button
- **copy-headline** — div.home-space > section.hero-section.space-hero > div.hero-copy > h1 "TerraSync Millones de historias. Una nue": "TerraSync Millones de historias. Una nueva mirada." does not name what is sold (exploracion geografica de mexico, exploracion, geografica, mexico, from flags); only the line under it does
- **copy-fact** — div.home-space > section.hero-section.space-hero > div.hero-copy > h1 "TerraSync Millones de historias. Una nue": the first screen holds no number, price, date, place, platform or genre
- **section-tile** — main#contenido > div.home-space > section.hero-section.space-hero "TerraSync Millones de historias. Una nue": the first section is 780px tall (0.87 screens at 1440x900), shorter than the screen: the first screen shows 780px of it and 120px of the next section, its heading "Acércate a lo que nos rodea." on screen
- **section-tile** — main#contenido > div.home-space > section.discovery-section "Acércate a lo que nos rodea.": the section is 411px tall (0.46 screens at 1440x900), shorter than the screen: its tile, held at the page's end (scroll 613px) shows 411px of it and 167px of the section above ("TerraSync Millones de historia"), its text "Órbita y modelo ilustrativos, " on screen
- **section-tile** — main#contenido > div.home-space > section.mission-strip "Una mirada al futuro con NISAR.": the section is 125px tall (0.14 screens at 1440x900), shorter than the screen: its tile, held at the page's end (scroll 613px) shows 125px of it and 411px of the section above, its heading "Acércate a lo que nos rodea." on screen
- **moment-none** — (the page): a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **hero-screen** — main#contenido > div.home-space "TerraSync Millones de historias.Una nuev": the hero ends at 1316px on a 900px screen, 416px below the fold: it ends at the fold, 1px either way (SR-1)
- **section-height** — div#root > div.app-shell.app-shell-space > footer.footer "La Tierra tiene mucho que contarnos.Icon": the section is 60px tall (0.1 screens), 841px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **one-section** — div#root > div.app-shell.app-shell-space > footer.footer "La Tierra tiene mucho que contarnos.Icon": the screen at scroll 613px (the top of section 2) shows 60px of section 2 beside section 1: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** — main#contenido > div.home-space "TerraSync Millones de historias.Una nuev": a <div> sits directly in <main>: every part of <main> is a <section> (SR-4)
- **one-heading** — section.discovery-section > div.section-heading > div > h2 "Acércate a lo que nos rodea.": the hero holds an h2 (2): its heading is the h1, and an h2 opens the next section (SR-5)
- **container-edges** — div#root "Saltar al contenido TerraSync Millones d": a <div> at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges** — main#contenido > div.home-space "TerraSync Millones de historias.Una nuev": the section needs exactly one in-flow child .wrap (it has 3 in-flow children, 0 .wrap) (SR-6)
- **container-edges** — div#root > div.app-shell.app-shell-space > footer.footer "La Tierra tiene mucho que contarnos.Icon": the section needs exactly one in-flow child .wrap (it has 3 in-flow children, 0 .wrap) (SR-6)
- **container-edges** — section.hero-section.space-hero > div.space-experience > div.space-interface > p.space-disclaimer "Órbita y modelo ilustrativos, sin escala": 1 text block starts on a left line at x 882, 807px from the container's left: text starts on the container's left, or on one split line (x 622, 732, 842) (SR-6)
- **container-edges** — section.hero-section.space-hero > div.space-experience > div.space-interface > div.space-interaction-hint "ARRASTRA PARA GIRAR · ACÉRCATE PARA EXPL": 1 text block starts on a left line at x 875, 800px from the container's left: text starts on the container's left, or on one split line (x 622, 732, 842) (SR-6)
- **container-edges** — div.home-space > section.mission-strip > div > p.eyebrow "UNA MISIÓN. MUCHAS POSIBILIDADES.": 3 text blocks start on a left line at x 191, 116px from the container's left: text starts on the container's left, or on one split line (x 622, 732, 842) (also "Una mirada al futuro con NISAR.", "Preparamos un espacio para acerc") (and 1 more like it: "Una mirada al futuro con") (SR-6)
- **split-pair** — main#contenido > div.home-space > section.hero-section.space-hero "TerraSync Millones de historias.Una nuev": the two columns of the split start 201px apart at the top: a split's columns are top-aligned, 8px either way (SR-8)
- **tap-size** — div#root > div.app-shell.app-shell-space > footer.footer > a.underline.underline-offset-4 "Iconos: Solar · 480 Design": a 343x11px tap target: 0px from the next one ("Inicio"), so a thumb lands on the wrong one
- **heading-scale** — section.discovery-section > div.module-grid > a.module-card:nth-of-type(1) > h3 "México, en perspectiva": an h3 at 21px, as large as the smallest h2 (19px) or larger (and 2 more like it: "Las huellas del cambio", "La ciencia, más cerca")
- **container** — page: no .wrap

## Advertencias conservadas

- **flush** — div.home-space > section.mission-strip > div > p.eyebrow: its first line sits 27px under the top edge of section.mission-strip, where the ground changes
- **copy-headings** — div.home-space > section.mission-strip > div > h2: "Una mirada al futuro con NISAR." names no product, part, place or section (the one brand line a page may have)
- **copy-headings** — section.discovery-section > div.module-grid > a.module-card:nth-of-type(2) > h3: the card title "Las huellas del cambio" names no product, part, place or section (2 card titles like it) (and 1 more like it: "La ciencia, más cerca")
- **copy-actions** — (the page): the main action "Explorar México" does not read word for word the same in the closing section
- **heading-scale** — section.discovery-section > div.section-heading > div > h2: h2 headings in 2 sizes, 20px ("Una mirada al futuro con") to 26px (x1.30)
- **off-grid** — div.home-space > section.mission-strip > div > h2: the section's heading starts at 191px, 116px off the page margin (75px), and no other section starts there
- **one-screen** — main#contenido > div.home-space > section.discovery-section: 1 section is shorter than the screen, so the next one's heading or picture shows with it: "Acércate a lo que nos rodea." is 411px of the 900px under the nav, and "Una mirada al futuro con NISAR" shows below it
- **visual-caption** — section.hero-section.space-hero > div.space-experience > div.space-interface > p.space-disclaimer: a small 8px line is laid over the lower half of the canvas: "Órbita y modelo ilustrativos, sin escala..."; no caption or description under any image, render or visual (house rule)
- **effect-kind** — section.hero-section.space-hero > div.space-experience > div.space-canvas > canvas: particle code or heavy canvas 2D drawing on a software page (4312 shapes a second): check it is a deliberate scene
- **moment-none** — (the page): a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **focus-hidden** — div.home-space > section.discovery-section:nth-of-type(2) > div.module-grid:nth-of-type(2) > a.module-card:nth-of-type(1): Tab stop 10, "01 / EXPLORAR México, en perspectiva Un punto de p" is partly under div#root > div.app-shell.app-shell-space > nav.bottom-navigation: a keyboard user cannot see where they are
- **focus-hidden** — div.home-space > section.discovery-section:nth-of-type(2) > div.module-grid:nth-of-type(2) > a.module-card:nth-of-type(2): Tab stop 11, "02 / OBSERVAR Las huellas del cambio El futuro esp" is partly under div#root > div.app-shell.app-shell-space > nav.bottom-navigation: a keyboard user cannot see where they are
- **focus-hidden** — div.home-space > section.discovery-section:nth-of-type(2) > div.module-grid:nth-of-type(2) > a.module-card:nth-of-type(3): Tab stop 12, "03 / APRENDER La ciencia, más cerca Descubre las i" is partly under div#root > div.app-shell.app-shell-space > nav.bottom-navigation: a keyboard user cannot see where they are
- **share-meta** — head: the head lacks og:title, og:description, og:image, twitter:card, an icon: a shared link shows no picture or title of its own
- **tap-size** — section.hero-section.space-hero > div.hero-copy > div.hero-actions > a.text-link: a 115x17px tap target: under the 44px a phone needs
- **tap-size** — div.space-experience > div.space-interface > div.space-controls > button.space-play: a 98x32px tap target: under the 44px a phone needs
- **tap-size** — div.space-experience > div.space-interface > div.space-controls > button.icon-button:nth-of-type(2): a 32x32px tap target (and 2 more like it on this screen): under the 44px a phone needs
- **tap-size** — main#contenido > div.home-space > section.mission-strip > a.text-link: a 109x18px tap target: under the 44px a phone needs
- **fold-cut** — section.hero-section.space-hero > div.space-experience > div.space-interface > p.space-disclaimer: a line of the hero text is sliced by the bottom of the first screen
- **heading-scale** — section.discovery-section > div.section-heading > div > h2: h2 headings in 2 sizes, 19px ("Una mirada al futuro con") to 24px (x1.26)
- **heading-scale** — section.discovery-section > div.module-grid > a.module-card:nth-of-type(1) > h3: the h3s (21px) are only 1.02x smaller than the h2s (21.5px): one level a clear step (1.3x or more) below the other
- **off-grid** — div.home-space > section.mission-strip > div > h2: the section's heading starts at 120px, 96px off the page margin (24px), and no other section starts there
- **visual-caption** — section.hero-section.space-hero > div.space-experience > div.space-interface > p.space-disclaimer: a small 7px line is laid over the lower half of the canvas: "Órbita y modelo ilustrativos, sin escala..."; no caption or description under any image, render or visual (house rule)

Las advertencias se conservan por el mismo límite de alcance. Informes originales y capturas: .taste-skill/, excluida de Git por contener archivos temporales de verificación.
