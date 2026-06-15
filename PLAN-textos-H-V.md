# PLAN · TEXTO HORIZONTAL / TEXTO VERTICAL

> Responde al **Capítulo 1** del feedback: *"Se necesitan dos campos de texto diferenciados (texto_vertical y texto_horizontal)"*.
> Carpeta de trabajo: `00 PROYECTO AUTOMATICO JUNIO`.

---

## 1. Objetivo y diagnóstico

Hoy `MUX4 TXT` hace **dos papeles a la vez**: es el texto del mockup MUX4 **y** el maestro universal que se propaga a casi todo. Eso provoca que tocar el texto de MUX4 altere Carátulas, Carteles, etc. (Capítulo 3 del feedback).

**Solución:** desacoplar. Crear dos maestros genéricos —**TEXTO HORIZONTAL** y **TEXTO VERTICAL**— y dejar `MUX4 TXT` / `MOVIL TXT` como texto propio de su mockup.

Además, **se unifican los dos mecanismos de título actuales** (copia horneada `COMPOSICIÓN TÍTULO` + "imagen de título suelta") en **uno solo**: cada formato muestra la composición H o V que le corresponda. Esto simplifica el sistema.

---

## 2. Modelo final

- **TEXTO HORIZONTAL** = maestro universal (hereda la propagación que tenía `MUX4 TXT`).
- **TEXTO VERTICAL** = maestro alternativo.
- **Default por aspect ratio:** formatos horizontales → H; formatos verticales → V.
- **Lapicero por capa:** en cada formato se puede cambiar H↔V a gusto.
- **`MUX4 TXT` / `MOVIL TXT`** → solo alimentan su propio FONDO.
- Las dos composiciones nuevas **sustituyen** tanto la copia horneada como la capa de título suelta.
- Los dos nuevos formatos tienen la **misma lógica de texto automático** que MUX4 TXT / MOVIL TXT (texto editable + auto-ajuste a zona + generación de composición).

---

## 3. Tabla de enrutado (38 formatos)

| Maestro | Formatos (default) |
|---|---|
| **TEXTO HORIZONTAL** (22) | 199 PUBLI, AD PAUSE, APPLE TV, IPLUS PUBLI, MOD DEST 1, MOD DEST 1 SIL, MOD DEST 2, MOD DEST 2 SIL, MOD DEST 3, MOD DEST 3 SIL, WEB PUBLI, WOW PUBLI, TÍTULO FICHA, CARÁTULA H, CARTEL COM. H, DEST. DOBLE 1, DEST. DOBLE 1 SIL, DEST. DOBLE 2, DEST. DOBLE 2 SIL, MOD N, MOD N SIL, XIAOMI BANNER |
| **TEXTO VERTICAL** (5) | CARÁTULA V, CARTEL COM. V, DEST. DOBLE 4, DEST. DOBLE 4 SIL, SONY |
| **Propio — sin tocar** (3) | MUX4 FONDO ← MUX4 TXT · MOVIL MUX FONDO ← MOVIL TXT · AMAZON BG ← AMAZON LOGO |
| **Maestros (editores)** (5) | MUX4 TXT, MOVIL TXT, AMAZON LOGO, **TEXTO HORIZONTAL**, **TEXTO VERTICAL** |
| **Sin texto** (5) | FANART, FANART MÓVIL, FANART DEST., FANART MOD N, PERFIL |

> El default es solo el punto de partida; el lapicero permite override por formato.

---

## 4. Tamaños y zonas de seguridad

| Formato nuevo | Tamaño | Ratio base |
|---|---|---|
| **TEXTO HORIZONTAL** | **1920 × 779** | de `MUX4 TXT` (784:318) |
| **TEXTO VERTICAL** | **1080 × 350** | de `MOVIL TXT` (1440:466) |

- ⚠️ TEXTO VERTICAL queda en lienzo apaisado (1080×350) porque replica la tira de `MOVIL TXT`. "Vertical" = contexto de uso, no forma del lienzo.
- **Checkers (ZONA DE SEGURIDAD):** reutilizar los de `MUX4 TXT` / `MOVIL TXT` escalados. Si quedan mal → el usuario genera PNGs limpios al tamaño indicado.

---

## 5. Modelo de datos (cambios en `State`)

- `formatSizes` (`state.js:38`): añadir `TEXTO HORIZONTAL` (1920×779) y `TEXTO VERTICAL` (1080×350).
- `systemLayers` (`state.js:98`): añadir checker de cada uno.
- `modalities.dispositivos` (`state.js:164`): añadir ambos **al principio** de la lista.
- **NUEVO** `State.formatTextVariant`: `{ formatId: 'H' | 'V' }` — variante elegida por formato (lapicero). Defaults precargados según la tabla §3.

---

## 6. Mecanismo (composiciones)

Extender el patrón que ya existe 3 veces (`Composicion`, `ComposicionMovil`, `ComposicionAmazon` en `composicion.js`):

- **NUEVO** `ComposicionTextoH` → genera `COMPOSICIÓN TEXTO HORIZONTAL` desde el maestro TEXTO HORIZONTAL.
- **NUEVO** `ComposicionTextoV` → genera `COMPOSICIÓN TEXTO VERTICAL` desde TEXTO VERTICAL.
- En el render (`canvas.js:717,829`) y export (`export.js`), cada formato muestra la composición H **o** V según `State.formatTextVariant[formato]`.
- Reescribir la propagación `_propagateTitleParam` (`formats.js:213`): MUX4 TXT → solo MUX4 FONDO; MOVIL TXT → solo MOVIL MUX FONDO; los maestros H/V → según tabla.
- Retirar/neutralizar la whitelist de "capa de título suelta" (`layers.js:1012`) — su función la asumen las composiciones H/V.

---

## 7. UI

- **Rejilla de formatos** (`formats.js:72`, `panel.css:104`): pasar a 6 columnas; botones normales `span 2` (3/fila), los dos de texto `span 3` (2 en la primera fila).
- **Lapicero en la capa de texto**: selector H↔V que escribe en `State.formatTextVariant[formato]` y re-renderiza.

---

## 8. Migración de proyectos antiguos (`project.js`)

Al cargar un `.json` previo: mapear el título existente (composición horneada + capas de título sueltas con sus `formatParams`) a las nuevas capas de composición H/V, preservando el transform relativo de cada formato para que nada "salte".

---

## 9. Orden de implementación

1. ✅ Datos: `formatSizes`, `systemLayers`, `modalities`, `formatTextVariant` + grid 2+3.
2. ✅ Maestros con auto-texto: `SPECIAL_FORMATS`, derivación de presets por escala, visibilidad (solo título), **maquetación INDEPENDIENTE por formato** (`State.layoutConfig` por formato + `_sourceFormat`).
3. ✅ Composiciones: módulo genérico `ComposicionTexto(master, nombre, flag)` + disparadores al salir de TEXTO HORIZONTAL/VERTICAL. Genera `COMPOSICIÓN TEXTO HORIZONTAL` (1920×779) y `COMPOSICIÓN TEXTO VERTICAL` (1080×350). Ocultas hasta el enrutado.
4. 🟡 **(CASI — 2 bugs pendientes)** Re-enrutar propagación + render/export por variante. Hecho: tabla de variante (`Formats.getTextVariant`), reposicionamiento por auto-layout (`AutoLayout.repositionTextComp`), swap visible en canvas + panel + ver-todas + export. Editor se ve bien; faltan 2 cosas (abajo).

### Resueltos en sesión 2026-06-09 (mañana)
- ✅ **Independencia total de los 4 maestros de texto:** eliminada la sincronización "mirror" de texto (`canvas.js`) y de logos (`logos.js`) — cada formato es independiente.
- ✅ **Fondo verde "chivato":** los nuevos formatos no estaban registrados como PNG, así que `isPngFormat` daba false y el editor les ponía fondo verde. Resuelto añadiéndolos a `Export.FORMAT_CONFIG` con `type:'png'` (ahora exportan PNG transparente, sufijos `TEXTO_HORIZONTAL`/`TEXTO_VERTICAL`).
- ✅ **Modalidad "Textos":** nueva modalidad (la primera) con los 4 maestros (TEXTO HORIZONTAL, TEXTO VERTICAL, MUX4 TXT, MOVIL TXT), sacados de "Dispositivos". Layout 2×2 (los 4 anchos).
- ✅ **Etiquetas globales:** `Formats.displayLabel()` — MUX4 TXT→"MUX4 TEXT", MOVIL TXT→"Smartphone TEXT" en botón, miniaturas "Ver todas" y diálogos de export (clave interna y sufijos de archivo intactos).
- ✅ **Auto-regeneración de composiciones H/V:** no hay persistencia (recargar vacía el estado). Las H/V no se auto-regeneraban como MUX4/MOVIL/Amazon. Añadido en `canvas.js` el regenerado en vivo al estar en TEXTO HORIZONTAL/VERTICAL.

### Resueltos en sesión 2026-06-09 (cont.)
- ✅ **Paso 5 — lápiz H/V/MUX4/MOVIL:** `getTextVariant` admite 4 valores; visibilidad de las 4 composiciones por variante (canvas/panel/ver-todas/export, sin tocar los FONDO); reposicionado vía `repositionTextComp`; lápiz en la capa de composición (panel) con menú de 4 opciones (`_openTextVariantMenu`); al elegir una variante sin contenido se genera vacía para que la capa no desaparezca.
- ✅ **Bug dropdown de versión:** el `<span>` quedaba huérfano al clonar el trigger → no mostraba la versión elegida (la maquetación sí se aplicaba). Arreglado re-buscando el span vivo.
- ✅ **Capítulo 7 — copiar atributos entre pares de texto:** `Formats.propagateTextAttributes()` (HORIZONTAL⇄MUX4, VERTICAL⇄MOVIL) copia maquetación + capas exclusivas + params del título, reescalado. Botón contextual `#canvas-attrs-btn` "ATRIBUTOS A <pareja>" arriba-izquierda del lienzo, con confirmación.

### ⏳ PENDIENTE
1. 🔴 **Auto-maquetación de los textos se ve MAL** (lo del "199", pero el usuario confirma que pasa en TODOS los formatos): título pequeño + pastilla freemium solapando. Hipótesis: (a) el fit mete el lienzo completo 1920×779 (con márgenes vacíos) en la textZone → título pequeño; debería usar `contentBounds`. (b) la pastilla freemium horneada en la composición viaja y solapa; quizá deba ser elemento per-formato. **El usuario reproducirá y explicará mejor antes de tocar.**
2. ✏️ **Paso 5:** lapicero H↔V por formato (`State.formatTextVariant` ya existe; falta UI).
3. 💡 Opcional: auto-generar la composición H/V también al detectarla ausente en un formato receptor (100% automático sin visitar el maestro).
5. UI: lapicero H↔V por formato (`State.formatTextVariant`).
6. Migración de proyectos.
7. QA por formato (las 38 adaptaciones).

> Decisión cerrada en paso 2: maquetación **4 totalmente independientes** (MUX4 TXT, MOVIL TXT, TEXTO HORIZONTAL, TEXTO VERTICAL, cada uno con su tipología). Elegir tipología en uno ya no afecta a los demás.

---

## 10. Fase 2 (no bloquea)

- **Botón "propagar a MUX4 TXT / MOVIL TXT"** desde los maestros nuevos. Ojo: como los lienzos difieren (1920×779 vs 784×318), es un **re-ajuste**, no copia literal de parámetros.

---

## Decisiones cerradas
- MUX4 FONDO ← MUX4 TXT · MOVIL MUX FONDO ← MOVIL TXT (propios).
- Default por aspect ratio, override con lapicero.
- Tamaños 1920×779 / 1080×350.
- Checkers reutilizados y escalados.
- Ninguna FANART lleva título. PERFIL tampoco.
- Auto-texto también en los dos formatos nuevos.
