# Adaptator

Herramienta interna de Movistar+ que adapta grafismo audiovisual a ~49 formatos de
entrega. El diseñador aporta los assets, la herramienta los automaquetea formato a
formato y exporta. Es **determinista a propósito**: siempre deja margen a la
intervención humana, nunca intenta adivinar.

Tiene botón en **Aplicativo**, la herramienta oficial de asignación de tareas: abre
con los assets de la tarea ya cargados, asigna roles y autorecorta.

## Arquitectura

**Sitio estático sin paso de compilación.** Etiquetas `<script src>` planas en
`index.html`, sin bundler, sin npm. **El fuente ES el artefacto desplegable**: lo que
se edita es exactamente lo que sirve GitHub Pages. No hay build que olvidar.

El orden de los 25 scripts en `index.html` importa (`state.js` primero, `app.js` casi
al final). Si añades un fichero, va en ese orden, no al final por comodidad.

| Fichero | Papel |
|---|---|
| `assets/js/auto-layout.js` | El motor de maquetación. `FORMAT_CONFIG`, `BIG_LAYOUT`, colocación de sujeto y título. **Casi todo el trabajo cae aquí.** |
| `assets/js/state.js` | Estado global: capas, roles, parámetros por formato |
| `assets/js/formats.js` | Catálogo de formatos, modalidades, visibilidad por rol |
| `assets/js/focal-frames.js` | Recortes focales por banda de proporción |
| `assets/js/layers.js` | Capas, ajuste de títulos a zonas |
| `assets/js/canvas.js` | Pintado y edición en viewport |
| `assets/js/export.js` | Exportación: entregable + `_MOCKUP` aparte |
| `assets/js/composicion.js` | Composiciones (p. ej. `COM. TITULO H`) |
| `assets/js/import-psd.js` + `ag-psd.js` | Carga de PSD |

## Convenciones que NO son evidentes

Equivocarse en una de estas cuesta horas. Están aquí porque ya costaron.

**Coordenadas.** `State.formatParams[formatId][layerId]` = `{scaleX, scaleY, rotation,
x, y}`. **`x` e `y` son desplazamientos desde el CENTRO del formato**, no desde la
esquina. Por eso salen negativos y parecen raros.

**Escala.** `scale` es porcentaje del tamaño **natural** de la capa, no del formato ni
del contenido opaco.

**`focusZone` es el rectángulo de la PIEZA que la imagen debe LLENAR.** No es la
ventana de seguridad donde debe caer lo importante. Confundir las dos cosas encoge la
imagen dentro del hueco pequeño del área de seguridad, y el síntoma es sutil: parece
que "se ha roto la automaquetación". Pista de diagnóstico: en una tabla sana, casi
todos los formatos tienen `h: 1.000`.

**Zona simétrica.** Para centrar sobre una guía descentrada Y seguir cubriendo la
pieza, la zona debe ser simétrica respecto a la guía y llegar al borde más lejano. Su
`w` puede pasar de 1. No es un error: es la técnica.

**Las zonas se despejan, no se estiman.** Cuando el diseñador da "escala 140 %, X=623,
Y=-393", eso es un *resultado*, no una regla. Lo que se guarda en `FORMAT_CONFIG` es la
ZONA que reproduce ese resultado, porque el porcentaje dependía del tamaño en píxeles
de *ese* asset y con otro material se va de madre.

## Las dos vías de maquetación

Son **excluyentes por definición**. Un proyecto es de una o de la otra.

**`_TRAD` (Multi-Asset).** La clásica: varios assets con roles (`subject`,
`background`, `title_h`, `title_v`, `fanart`). Cada formato tiene su `textZone`,
`focusZone`, `anchorPoint`, `crop`/`fit` con `fill` y `anchorFraction`, variantes
A/B/C/D. Validada formato a formato con los diseñadores.

**`_BIG` (Imagen BIG).** Una sola imagen ya compuesta por el diseñador, que se coloca
con valores medidos a mano formato a formato en la tabla `BIG_LAYOUT`
(`{ img: {scale, x, y} }`). Un formato ausente de la tabla cae a ajuste automático.
En `_BIG` los títulos **van siempre a la izquierda**, reaprovechando las zonas ya
afinadas de `_TRAD`. Tabla completa: 35 de 35.

Asignar `imagen_big` en un proyecto ya maquetado `_TRAD` dispara un aviso, porque los
dos sistemas se anulan y el error era fácil de cometer (confundir IMAGEN BIG con
IMAGEN PRINCIPAL en el desplegable).

## Recortes focales: la regla de oro

El usuario define una vez por banda de proporción qué región del sujeto es la
importante (`FocalFrames`, bandas `VERTICAL · CUADRADO · 16:9 · PANO · ULTRA`,
deducidas por proporción).

> **El recorte manda en QUÉ se ve. El `fill` de cada formato manda en CUÁNTO y DÓNDE.**

El recorte entra como **referencia de tamaño** en la colocación normal
(`_applySubject`), **no como un algoritmo alternativo**. Hubo un segundo camino que, en
cuanto existía recorte, tiraba por la borda el `fill` afinado de cada formato y hacía
un cover genérico: medido, AD PAUSE pasaba de 145 % a 48 %. Si alguna vez vuelves a
ver dos caminos para colocar el sujeto, es un bug, no un diseño.

Consecuencia esperada: si recortas una figura de pecho para arriba, en un formato
ultra wide debe verse ese recorte ocupando el sitio que ocupaba la figura entera — no
la figura completa otra vez.

**No hay margen superior mínimo, y es deliberado.** Siluetas, FANART MÓVIL y PERFIL
colocan el sujeto a ras del borde porque ESE es el diseño. Está documentado en
`auto-layout.js` para que no se reponga por intuición.

## Cómo se prueba

No se prueba "a ojo" ni se pide al usuario que mire. Hay un runner que arranca un
servidor, inyecta un harness en la app, abre Chrome y recoge lo que el harness reporta.
Está en `.claude/tools/run.sh` (copia local, no versionada).

```bash
~/.adaptator/run.sh salida.txt harness.js
```

Dos cosas que están ahí porque costaron caras:

- **Token único por ejecución.** Una pestaña vieja contamina los resultados.
- **Rompecachés en todas las URL de `assets/`.** Sin él Chrome sirve el JS viejo de su
  caché heurística **sin revalidar**, y mides código que ya no existe.

Al medir, compara el mismo caso en dos estados; no compares dos casos que puedan estar
los dos atascados en el mismo modo cacheado.

## Publicar

`main` vive en el worktree **`00 PROYECTO SEPTIEMBRE`**; el desarrollo, en
**`00 PROYECTO NOVIEMBRE`**. Publicar es: fusionar en `main` *allí*, empujar, y Pages
reconstruye en ~15 s.

Se verifica **sobre el sitio en vivo**, no sobre el repo: descargar el JS publicado con
rompecachés y comprobar marcadores (número de formatos en `BIG_LAYOUT`, bandas,
ausencia de código que se quitó), y que coincida byte a byte con `main`.

URL pública: https://lesbeziers.github.io/ADAPTATOR/

## Modo de fallo recurrente

**Las listas enumeradas repetidas a mano.** Es el error que más veces ha vuelto: la
misma lista de formatos o la misma decisión escrita en dos sitios, que se desincronizan
y el síntoma aparece en un solo formato, el único donde los dos valores diferían. Si
te encuentras repitiendo una lista, **resuélvela en un único sitio** (así nació
`_resolverTextZone`, que unificó la elección de `textZone` entre `applyToFormat` y
`repositionTextComp`).

## Cómo trabajar aquí

- **Medir, no suponer.** Las dos veces que se dio por buena una hipótesis sin medirla,
  era falsa. Un cambio global basado en UN pantallazo rompió toda la automaquetación.
- **Un formato a la vez.** El diseñador describe y mide en lenguaje de diseño; se
  deriva la configuración y se verifica antes de pasar al siguiente.
- **Cambios acotados.** Nunca un cambio global por un caso observado.
- **Los comentarios son parte del código.** Aquí explican *por qué* un número es ese
  número y de qué medición sale. Si cambias el comportamiento, el comentario que lo
  justificaba miente: actualízalo o bórralo.
