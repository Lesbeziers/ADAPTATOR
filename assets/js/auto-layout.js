// ============================================================
// AUTO-LAYOUT.JS — Motor de maquetación automática
// ============================================================

const AutoLayout = (() => {

  // ── PALABRAS CLAVE PARA DETECCIÓN DE ROL ─────────────────
  // OJO con el orden: detectRole() devuelve la PRIMERA coincidencia, así que lo
  // más específico va arriba. '_BIG' es una convención explícita acordada con
  // producción (el asset llega ya nombrado así), por eso gana incluso ante
  // nombres tipo "FONDO_BIG" o "FANART_BIG".
  const ROLE_KEYWORDS = {
    imagen_big: ['_BIG'],     // creatividad completa, ya resuelta en Photoshop
    fanart:     ['FANART'],   // prioridad: si el nombre lleva FANART, gana sobre el resto
    background: ['FONDO', 'BACKGROUND', 'BG_'],
    subject:    ['MUJER', 'HOMBRE', 'PERSONA', 'SUBJECT', 'FIGURA',
                 'ACTOR', 'ACTRIZ', 'ARTISTA', 'PROTAGONISTA', 'IMAGEN', 'IMAGE'],
    // Roles de título: si no se distingue por nombre, el modal pregunta.
    title_h:    ['TITULO_H', 'TITLE_H', 'TITULO_HORIZONTAL'],
    title_v:    ['TITULO_V', 'TITLE_V', 'TITULO_VERTICAL'],
  };

  // ══════════════════════════════════════════════════════════
  // COLOCACIÓN FIJA DEL MODO IMAGEN BIG
  // ══════════════════════════════════════════════════════════
  //
  // Tabla viva: una línea por formato, agrupada por modalidad. La rellena el
  // diseñador midiendo a mano en la app (caja de coordenadas, Ctrl+Shift+C) y
  // pasando los valores. Cambiar un formato es tocar UNA línea; una tanda
  // entera se pega de golpe.
  //
  //   img → la capa con rol IMAGEN BIG
  //   txt → los valores del título, AGRUPADOS POR VARIANTE del lapicero:
  //           H / V              composición horneada horizontal / vertical
  //           TITLE_H / TITLE_V  imagen de título cruda
  //           MUX4 / MOVIL       composiciones de esos maestros
  //
  //         Agrupar por variante NO es un capricho: `scale` es un % del tamaño
  //         NATURAL de la capa, y cada variante apunta a una capa de tamaño
  //         distinto (la composición horizontal mide 1920×779 y la vertical
  //         1080×350). Un 75% medido sobre la vertical aplicado a la horizontal
  //         da un título casi el doble de grande. Pasó, y por eso está así.
  //
  //         Al maquetar se usa la variante que ese formato tenga por defecto,
  //         así que se respeta tal cual lo ya hardcodeado (CARÁTULA V, SONY,
  //         DEST. DOBLE 4… usan vertical). Y si el diseñador cambia la variante
  //         con el lápiz, se re-estampan solos los valores de esa variante.
  //         Variante sin medir → ese caso cae al encaje automático.
  //
  // Un formato AUSENTE no es un error: cae al encaje automático de siempre. Por
  // eso añadir formatos nuevos a la herramienta no obliga a medir nada.
  //
  // x/y son desplazamientos EN PÍXELES DESDE EL CENTRO del formato, no desde la
  // esquina.
  //
  // ⚠️ VALORES PROVISIONALES (medidos el 2026-10-20 para la demo del viernes).
  //    Los definitivos los fijarán los diseñadores en reunión y se sustituirán
  //    en bloque. No pulirlos ni construir nada que dependa de ellos.
  const BIG_LAYOUT = {
    // ── DISPOSITIVOS ───────────────────────────────────── COMPLETA
    // Los tres sin `txt` (FANART DEST., MUX4 FONDO, MOVIL MUX FONDO) no llevan
    // texto por diseño: el suyo viaja en otro asset y se edita en la modalidad
    // TEXTOS. No es que falte medirlos.
    'AD PAUSE':        { img: { scale: 36,   x:    0, y:  302 },
                         txt: { H: { scale: 39,   x: -240, y:   0 }, V: { scale: 100, x: -269, y:   0 } } },
    'FANART DEST.':    { img: { scale: 100,  x: -442, y: 1134 } },
    'MOD DEST 1':      { img: { scale: 36.6, x:   -2, y:  481 },
                         txt: { H: { scale: 30.4, x: -352, y:   0 }, V: { scale:  56, x: -352, y:   0 } } },
    'MOD DEST 2':      { img: { scale: 31,   x: -117, y:  392 },
                         txt: { H: { scale: 19.2, x: -170, y:   0 }, V: { scaleX: 54, scaleY: 55, x: -193, y: 0 } } },
    'MOD DEST 3':      { img: { scale: 35,   x: -168, y:  474 },
                         txt: { H: { scale: 12,   x: -108, y:   0 }, V: { scale:  46, x: -108, y:   0 } } },
    'MUX4 FONDO':      { img: { scale: 50,   x:  -20, y:  350 } },
    'MOVIL MUX FONDO': { img: { scale: 84,   x: -655, y:  253 } },
    'WEB PUBLI':       { img: { scale: 55,   x: -205, y:  698 },
                         txt: { H: { scale: 28,   x: -222, y: -23 }, V: { scaleX: 78, scaleY: 77, x: -250, y: -23 } } },
    'WOW PUBLI':       { img: { scale: 43,   x: -113, y:  590 },
                         txt: { H: { scale: 26.5, x: -199, y:   0 }, V: { scale:  60, x: -275, y:   0 } } },
    // TÍTULO FICHA no entra: es maestro de texto, no muestra la imagen BIG.

    // ── TEXTOS ─────────────────────────────────────────────
    // Los 4 maestros ocultan las capas normales: la imagen BIG no se dibuja ahí.

    // ── GRÁFICA OFICIAL ────────────────────────────────────
    // pendiente de medir

    // ── MÓDULOS DOBLES + N ─────────────────────────────────
    // pendiente de medir

    // ── COMERCIAL ──────────────────────────────────────────
    // El diseñador mide POR BANDA de encuadre, no por modalidad, así que esta
    // sección se va llenando en desorden. No pasa nada: un formato ausente cae
    // al encaje automático, de modo que las tandas parciales nunca rompen nada.
    // Se anota la banda de cada uno para poder seguir el avance por tandas.
    'Cabecera-Slider-Mediano-Movil': { img: { scale: 62, x: -193, y: 250 } },   // 1:1
    'Modulo-Movil':                  { img: { scale: 48, x: -401, y: 189 } },   // 1:1
    'Slider-Mediano-Movil':          { img: { scale: 62, x: -525, y: 250 } },   // 1:1 ← BANDA 1:1 COMPLETA
    // Nota: Slider-Mediano-Movil NO venía en la lista de ratios del equipo de
    // diseño, y le asignamos 1:1 por ser gemelo del Cabecera. Que SÍ exista
    // material 4500x4500 con marca para él lo confirma: fue un olvido al
    // listar, no un formato retirado. Y los valores lo corroboran — misma
    // escala (62 %) y misma Y (250) que su gemelo, solo cambia la X.
    'Cabecera-Detalle-Movil':        { img: { scale: 111, x: -546, y: -330 } },  // 9:16
    'Cabecera-Slider-Movil':         { img: { scale: 111, x: -432, y: -368 } },  // 9:16
    'CARÁTULA V':                    { img: { scale:  48, x: -402, y:  -99 } },  // 9:16
    'Carrusel-Vertical':             { img: { scale:  48, x: -402, y:  -99 } },  // 9:16 — idénticos
    // CARÁTULA V y Carrusel-Vertical comparten los tres valores. No es un
    // copiar-pegar: las dos piezas miden 1200x1800, así que misma forma y misma
    // colocación. Si algún día una de las dos cambia de tamaño, esto deja de
    // valer y hay que volver a medirla.
    'CARTEL COM. V':                 { img: { scale:  86, x: -721, y: -185 } },  // 9:16

    // ── OTROS ──────────────────────────────────────────────
    // pendiente de medir
  };

  // Traduce una entrada de la tabla a los params que entiende el motor.
  function _bigParams(v) {
    const p = { x: v.x ?? 0, y: v.y ?? 0 };
    if (v.scale  != null) { p.scaleX = v.scale; p.scaleY = v.scale; }
    if (v.scaleX != null) p.scaleX = v.scaleX;
    if (v.scaleY != null) p.scaleY = v.scaleY;
    return p;
  }

  // Resuelve la variante de título activa en un formato y la capa a la que
  // corresponde. No sirve Formats.getActiveTitleForFormat(): esa devuelve
  // siempre el título CRUDO, y la mayoría de formatos muestran la COMPOSICIÓN
  // horneada. Quien manda es la variante del lapicero, que apunta a un flag de
  // capa distinto en cada caso.
  function _tituloActivo(formatName) {
    if (typeof Formats === 'undefined' || !Formats.getTextVariant) return null;
    const variant = Formats.getTextVariant(formatName);
    if (!variant) return null;
    const opts = Formats.getTextVariantOptions ? Formats.getTextVariantOptions() : [];
    const opt  = opts.find(o => o.value === variant);
    if (!opt) return null;
    const layer = State.layers.find(l => l[opt.flag]) || null;
    return layer ? { variant, layer } : null;
  }

  // Estampa el título según la variante ACTIVA del formato. Es público porque
  // el lapicero lo llama al cambiar de variante: así, al pasar de horizontal a
  // vertical, el título se recoloca solo con los valores medidos para esa
  // variante, en vez de quedarse con los de la otra (que son de una capa de
  // distinto tamaño natural y salía desproporcionado).
  function applyBigTitle(formatName) {
    // SOLO en modo IMAGEN BIG. Sin esta guarda, _applyBigLayout estampaba las
    // coordenadas fijas de BIG_LAYOUT en proyectos NORMALES: la parte `img` sí
    // comprobaba que existiera la capa BIG antes de colocar, pero el título no.
    // Y como abajo se marca `titleManual` —el candado que impide recolocarlo—,
    // el título quedaba CLAVADO y las variantes A/B/C/D dejaban de moverlo.
    // Medido en AD PAUSE: salía siempre en x=400 (640−240) al 39 %, que son
    // exactamente los valores de BIG_LAYOUT, en vez de seguir a cada variante.
    //
    // La guarda va AQUÍ y no en el llamante para que proteja a todos: el otro
    // punto de entrada (formats.js, al cambiar la variante de texto) sí
    // comprobaba isBigMode, y por eso el fallo costó tanto de localizar.
    if (typeof Formats === 'undefined' || !Formats.isBigMode || !Formats.isBigMode()) return;

    const entry = BIG_LAYOUT[formatName];
    if (!entry || !entry.txt) return;
    const act = _tituloActivo(formatName);
    if (!act) return;
    const vals = entry.txt[act.variant];
    // Variante sin medir: se deja el encaje automático, no se inventa nada.
    if (!vals) return;
    // `titleManual` no es un adorno: sin él, repositionTextComp() —que corre
    // después de toda la maquetación y re-encaja el título en todos los
    // formatos de esa variante— pisaba la colocación medida. Es el candado que
    // esa función ya respeta, y encaja semánticamente: son valores colocados a
    // mano, solo que una vez. El botón AUTO lo suelta y se vuelve a estampar.
    _setParams(formatName, act.layer.id, Object.assign(_bigParams(vals), { titleManual: true }));
  }

  // Estampa la colocación fija. Se ejecuta DESPUÉS de la maquetación normal, a
  // modo de override: así un formato sin entrada —o con img pero sin la
  // variante de título medida— conserva el encaje automático y nunca queda
  // nada sin colocar.
  function _applyBigLayout(formatName, layers) {
    const entry = BIG_LAYOUT[formatName];
    if (!entry) return;

    if (entry.img) {
      const big = (layers || []).find(l => State.layerRoles?.[l.id] === 'imagen_big');
      if (big) _setParams(formatName, big.id, _bigParams(entry.img));
    }

    applyBigTitle(formatName);
  }

  // Aire mínimo sobre el sujeto, en proporción del alto de la pieza. Ver
  // _applySubjectFocal para el porqué. 5 % acordado con el diseñador como
  // punto de partida, a subir o bajar según se vea en material real.
  const MARGEN_SUPERIOR_MIN = 0.05;

  // ── CONFIGURACIÓN DE ZONAS POR FORMATO ───────────────────
  // textZone:    zona donde se coloca el TÍTULO (proporcional 0-1)
  // focusZone:   zona donde se ancla el SUJETO (proporcional 0-1)
  // anchorPoint: punto de interés del asset (cara, objeto principal) en el asset
  // crop:        parámetros de escala en modo CROP
  // fit:         parámetros de escala en modo FIT
  const FORMAT_CONFIG = {
    'AD PAUSE': {
      variants: {
        A: {
          label: 'Centro / Título abajo',
          textZone:  { x: 0.1615, y: 0.582, w: 0.677, h: 0.357 },
          focusZone: { x: 0.2025, y: 0.000, w: 0.595, h: 0.999 },
        },
        B: {
          label: 'Centro / Título arriba',
          textZone:  { x: 0.1615, y: 0.060, w: 0.677, h: 0.357 },
          focusZone: { x: 0.2025, y: 0.000, w: 0.595, h: 0.999 },
        },
        C: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.030, y: 0.200, w: 0.420, h: 0.600 },
          focusZone: { x: 0.480, y: 0.000, w: 0.500, h: 0.999 },
        },
        D: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.550, y: 0.200, w: 0.420, h: 0.600 },
          focusZone: { x: 0.020, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      // textZone y focusZone por defecto (variante A)
      //
      // Las variantes A y B dicen "Centro" pero estaban desviadas +2,65 % a la
      // derecha: las dos zonas tenían su centro en 0,5265, o sea 34 px sobre
      // una pieza de 1280. No era deliberado — el checker AD_PAUSE_Checker.png
      // tiene su zona libre de x=24 a x=1256, centro 640,0 EXACTO — así que
      // venía de una medición a ojo. Corregido a centro 0,5 clavado.
      textZone:    { x: 0.1615, y: 0.582, w: 0.677, h: 0.357 },
      focusZone:   { x: 0.2025, y: 0.000, w: 0.595, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: false,
    },
    'DEST. DOBLE 4': {
      variants: {
        A: {
          label: 'Texto arriba / Imagen abajo',
          textZone:  { x: 0.049, y: 0.037, w: 0.891, h: 0.144 },
          focusZone: { x: 0.030, y: 0.182, w: 0.940, h: 0.818 },
        },
      },
      textZone:    { x: 0.049, y: 0.037, w: 0.891, h: 0.144 },
      focusZone:   { x: 0.030, y: 0.182, w: 0.940, h: 0.818 },
      anchorPoint: { x: 0.50,  y: 0.20  },
      anchorEdge:  'top',
      crop: { fill: 1.30, anchorFraction: 0.10 },
      fit:  { fill: 1.00, anchorFraction: 0.15 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
    },

    'DEST. DOBLE 4 SIL': {
      headBottomFraction: 0.50,
      variants: {
        A: {
          label: 'Imagen centrada / Título abajo centrado',
          textZone:  { x: 0.049, y: 0.660, w: 0.891, h: 0.230 },
          focusZone: { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
        },
      },
      textZone:    { x: 0.049, y: 0.660, w: 0.891, h: 0.230 },
      focusZone:   { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
      useTitleLayer: true,
    },

    'DEST. DOBLE 2': {
      variants: {
        A: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.480, y: 0.200, w: 0.470, h: 0.500 },
          focusZone: { x: 0.010, y: 0.000, w: 0.480, h: 0.999 },
        },
        B: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.050, y: 0.200, w: 0.470, h: 0.500 },
          focusZone: { x: 0.510, y: 0.000, w: 0.480, h: 0.999 },
        },
      },
      textZone:    { x: 0.480, y: 0.200, w: 0.470, h: 0.500 },
      focusZone:   { x: 0.010, y: 0.000, w: 0.480, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 2.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: true,
      useTitleLayer: true,
    },

    'DEST. DOBLE 2 SIL': {
      headBottomFraction: 0.50,
      variants: {
        A: {
          label: 'Imagen centrada / Título abajo-izquierda',
          textZone:  { x: 0.020, y: 0.660, w: 0.960, h: 0.230 },
          focusZone: { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
        },
      },
      textZone:    { x: 0.020, y: 0.660, w: 0.960, h: 0.230 },
      focusZone:   { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
      useTitleLayer: true,
    },

    'DEST. DOBLE 1': {
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.056, y: 0.164, w: 0.419, h: 0.635 },
          focusZone: { x: 0.474, y: 0.000, w: 0.467, h: 0.998 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.525, y: 0.164, w: 0.419, h: 0.635 },
          focusZone: { x: 0.059, y: 0.000, w: 0.467, h: 0.998 },
        },
      },
      textZone:    { x: 0.056, y: 0.164, w: 0.419, h: 0.635 },
      focusZone:   { x: 0.474, y: 0.000, w: 0.467, h: 0.998 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 2.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: true,
      useTitleLayer: true,
    },

    'DEST. DOBLE 1 SIL': {
      headBottomFraction: 0.35,
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.056, y: 0.285, w: 0.419, h: 0.430 },
          focusZone: { x: 0.474, y: 0.000, w: 0.467, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.525, y: 0.285, w: 0.419, h: 0.430 },
          focusZone: { x: 0.059, y: 0.000, w: 0.467, h: 0.999 },
        },
      },
      textZone:    { x: 0.056, y: 0.285, w: 0.419, h: 0.430 },
      focusZone:   { x: 0.474, y: 0.000, w: 0.467, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
      useTitleLayer: true,
    },

    'FANART DEST.': {
      variants: {
        A: {
          label: 'Imagen derecha',
          // Centro focusZone en x=0.62 → cara centrada en zona derecha
          focusZone: { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda',
          // Espejo: centro focusZone en x=0.38
          focusZone: { x: 0.130, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },

    'FANART': {
      variants: {
        A: {
          label: 'Imagen derecha',
          focusZone: { x: 0.420, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },

    'FANART MÓVIL': {
      variants: {
        A: {
          label: 'Imagen centrada',
          focusZone: { x: 0.050, y: 0.000, w: 0.900, h: 0.800 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.050, y: 0.000, w: 0.900, h: 0.800 },
      anchorPoint: { x: 0.50,  y: 0.20  },
      crop: { fill: 1.20, anchorFraction: 0.15 },
      fit:  { fill: 1.00, anchorFraction: 0.20 },
      scaleModeDefault: 'crop',
    },
    'MOD DEST 1 SIL': {
      // headBottomFraction: fracción del asset donde termina la cabeza/cuello.
      // Con anchorEdge:'top', determina el zoom máximo que garantiza que la cara esté visible.
      headBottomFraction: 0.35,
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.100, y: 0.360, w: 0.410, h: 0.580 },
          focusZone: { x: 0.360, y: 0.000, w: 0.540, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.490, y: 0.360, w: 0.410, h: 0.580 },
          focusZone: { x: 0.030, y: 0.000, w: 0.540, h: 0.999 },
        },
      },
      textZone:    { x: 0.100, y: 0.360, w: 0.410, h: 0.580 },
      focusZone:   { x: 0.360, y: 0.000, w: 0.540, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top', // borde superior del asset alineado con el borde superior del formato
    },
    'MOD DEST 2': {
      headBottomFraction: 0.35,
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.030, y: 0.160, w: 0.460, h: 0.680 },
          focusZone: { x: 0.360, y: 0.000, w: 0.580, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.510, y: 0.160, w: 0.460, h: 0.680 },
          focusZone: { x: 0.030, y: 0.000, w: 0.580, h: 0.999 },
        },
      },
      textZone:    { x: 0.030, y: 0.160, w: 0.460, h: 0.680 },
      focusZone:   { x: 0.360, y: 0.000, w: 0.580, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
    },
    'MOD DEST 2 SIL': {
      headBottomFraction: 0.35,
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.070, y: 0.399, w: 0.400, h: 0.460 },
          focusZone: { x: 0.440, y: 0.000, w: 0.530, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.530, y: 0.399, w: 0.400, h: 0.460 },
          focusZone: { x: 0.030, y: 0.000, w: 0.530, h: 0.999 },
        },
      },
      textZone:    { x: 0.070, y: 0.399, w: 0.400, h: 0.460 },
      focusZone:   { x: 0.440, y: 0.000, w: 0.530, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
    },
    'MOD DEST 3': {
      variants: {
        A: {
          label: 'Imagen derecha / Título izquierda-centro',
          textZone:  { x: 0.075, y: 0.360, w: 0.440, h: 0.280 },
          focusZone: { x: 0.420, y: 0.000, w: 0.560, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Título derecha-centro',
          textZone:  { x: 0.485, y: 0.360, w: 0.440, h: 0.280 },
          focusZone: { x: 0.020, y: 0.000, w: 0.560, h: 0.999 },
        },
        C: {
          label: 'Imagen centrada / Título abajo-centro',
          textZone:  { x: 0.075, y: 0.620, w: 0.850, h: 0.240 },
          focusZone: { x: 0.150, y: 0.000, w: 0.700, h: 0.999 },
        },
        D: {
          label: 'Imagen centrada / Título arriba-centro',
          textZone:  { x: 0.075, y: 0.140, w: 0.850, h: 0.240 },
          focusZone: { x: 0.150, y: 0.000, w: 0.700, h: 0.999 },
        },
      },
      textZone:    { x: 0.075, y: 0.360, w: 0.440, h: 0.280 },
      focusZone:   { x: 0.420, y: 0.000, w: 0.560, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: true,
    },
    'MOD DEST 3 SIL': {
      headBottomFraction: 0.45,
      variants: {
        A: {
          label: 'Sujeto centrado / Título abajo-centro',
          textZone:  { x: 0.113, y: 0.680, w: 0.774, h: 0.200 },
          focusZone: { x: 0.150, y: 0.000, w: 0.700, h: 0.999 },
        },
        B: {
          label: 'Sujeto derecha / Título centro-izquierda',
          textZone:  { x: 0.070, y: 0.529, w: 0.420, h: 0.200 },
          focusZone: { x: 0.380, y: 0.000, w: 0.580, h: 0.999 },
        },
        C: {
          label: 'Sujeto izquierda / Título centro-derecha',
          textZone:  { x: 0.510, y: 0.529, w: 0.420, h: 0.200 },
          focusZone: { x: 0.040, y: 0.000, w: 0.580, h: 0.999 },
        },
      },
      textZone:    { x: 0.113, y: 0.680, w: 0.774, h: 0.200 },
      focusZone:   { x: 0.150, y: 0.000, w: 0.700, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
    },
    'MOD DEST 1': {
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.100, y: 0.100, w: 0.370, h: 0.800 },
          focusZone: { x: 0.420, y: 0.000, w: 0.490, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.530, y: 0.100, w: 0.370, h: 0.800 },
          focusZone: { x: 0.090, y: 0.000, w: 0.490, h: 0.999 },
        },
      },
      textZone:    { x: 0.100, y: 0.100, w: 0.370, h: 0.800 },
      focusZone:   { x: 0.420, y: 0.000, w: 0.490, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 4.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'MUX4 FONDO': {
      variants: {
        A: {
          label: 'Imagen derecha',
          focusZone: { x: 0.420, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },



    'PERFIL': {
      textZone:    null,
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.33  },
      crop: { fill: 1.80, anchorFraction: 0.33 },
      fit:  { fill: 1.00, anchorFraction: 0.33 },
      scaleModeDefault: 'crop',
    },


    'XIAOMI BANNER': {
      // 1280×360. Mismo layout que 199 PUBLI pero usando el PNG título importado
      // (sin COMPOSICION TITULO). Fracciones normalizadas — independientes de la resolución.
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.056, y: 0.164, w: 0.419, h: 0.635 },
          focusZone: { x: 0.474, y: 0.000, w: 0.467, h: 0.998 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.525, y: 0.164, w: 0.419, h: 0.635 },
          focusZone: { x: 0.059, y: 0.000, w: 0.467, h: 0.998 },
        },
      },
      textZone:    { x: 0.056, y: 0.164, w: 0.419, h: 0.635 },
      focusZone:   { x: 0.474, y: 0.000, w: 0.467, h: 0.998 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: true,
      useTitleLayer: true,
    },

    'MOVIL MUX FONDO': {
      // Zona visible en pantalla: y=0.000–0.577 (el resto lo tapa el mockup)
      // anchorEdge:'top' — imagen pegada al borde superior
      // headBottomFraction — zoom máximo que garantiza cara visible dentro de la zona visible
      headBottomFraction: 0.30,
      variants: {
        A: {
          label: 'Imagen centrada',
          focusZone: { x: 0.000, y: 0.099, w: 1.000, h: 0.478 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.000, y: 0.099, w: 1.000, h: 0.478 },
      anchorPoint: { x: 0.50,  y: 0.15  },
      crop: { fill: 1.55, anchorFraction: 0.00 },
      fit:  { fill: 1.26, anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      anchorEdge: 'top',
    },

    'WEB PUBLI': {
      // Fondo: cubre el formato completo
      // Sujeto: zona central x=0.256–0.742, alto completo
      // Texto: dentro del área negra, por encima del pastillero (y < 0.832)
      // Variante A: texto izquierda / sujeto derecha
      // Variante B: texto derecha / sujeto izquierda (espejo)
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.265, y: 0.100, w: 0.220, h: 0.700 },
          focusZone: { x: 0.420, y: 0.000, w: 0.320, h: 0.832 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.515, y: 0.100, w: 0.220, h: 0.700 },
          focusZone: { x: 0.260, y: 0.000, w: 0.320, h: 0.832 },
        },
      },
      textZone:    { x: 0.265, y: 0.100, w: 0.220, h: 0.700 },
      focusZone:   { x: 0.420, y: 0.000, w: 0.320, h: 0.832 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'WOW PUBLI': {
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.075, y: 0.100, w: 0.420, h: 0.800 },
          focusZone: { x: 0.370, y: 0.000, w: 0.480, h: 0.999 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.505, y: 0.100, w: 0.420, h: 0.800 },
          focusZone: { x: 0.080, y: 0.000, w: 0.480, h: 0.999 },
        },
      },
      textZone:    { x: 0.075, y: 0.100, w: 0.420, h: 0.800 },
      focusZone:   { x: 0.370, y: 0.000, w: 0.480, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'CARTEL COM. H': {
      variants: {
        A: {
          label: 'Sujeto centro / Título abajo',
          textZone:  { x: 0.189, y: 0.730, w: 0.578, h: 0.140 },
          focusZone: { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
        },
        B: {
          label: 'Sujeto centro / Título arriba',
          textZone:  { x: 0.189, y: 0.195, w: 0.578, h: 0.140 },
          focusZone: { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
        },
        C: {
          label: 'Sujeto izquierda / Título derecha',
          textZone:  { x: 0.530, y: 0.200, w: 0.420, h: 0.580 },
          focusZone: { x: 0.060, y: 0.000, w: 0.480, h: 0.880 },
        },
        D: {
          label: 'Sujeto derecha / Título izquierda',
          textZone:  { x: 0.050, y: 0.200, w: 0.420, h: 0.580 },
          focusZone: { x: 0.460, y: 0.000, w: 0.480, h: 0.880 },
        },
      },
      textZone:    { x: 0.189, y: 0.730, w: 0.578, h: 0.140 },
      focusZone:   { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
    },
    'CARÁTULA H': {
      variants: {
        A: {
          label: 'Sujeto centro / Título abajo',
          textZone:  { x: 0.189, y: 0.730, w: 0.578, h: 0.140 },
          focusZone: { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
        },
        B: {
          label: 'Sujeto centro / Título arriba',
          textZone:  { x: 0.189, y: 0.195, w: 0.578, h: 0.140 },
          focusZone: { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
        },
        C: {
          label: 'Sujeto izquierda / Título derecha',
          textZone:  { x: 0.530, y: 0.200, w: 0.420, h: 0.580 },
          focusZone: { x: 0.060, y: 0.000, w: 0.480, h: 0.880 },
        },
        D: {
          label: 'Sujeto derecha / Título izquierda',
          textZone:  { x: 0.050, y: 0.200, w: 0.420, h: 0.580 },
          focusZone: { x: 0.460, y: 0.000, w: 0.480, h: 0.880 },
        },
      },
      textZone:    { x: 0.189, y: 0.730, w: 0.578, h: 0.140 },
      focusZone:   { x: 0.189, y: 0.000, w: 0.578, h: 0.880 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
    },

    'CARÁTULA V': {
      variants: {
        A: {
          label: 'Sujeto centro / Título abajo',
          textZone:  { x: 0.030, y: 0.730, w: 0.940, h: 0.130 },
          focusZone: { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
        },
        B: {
          label: 'Sujeto centro / Título arriba',
          textZone:  { x: 0.030, y: 0.145, w: 0.940, h: 0.130 },
          focusZone: { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
        },
      },
      textZone:    { x: 0.030, y: 0.730, w: 0.940, h: 0.130 },
      focusZone:   { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
    },

    'CARTEL COM. V': {
      variants: {
        A: {
          label: 'Sujeto centro / Título abajo',
          textZone:  { x: 0.030, y: 0.730, w: 0.940, h: 0.130 },
          focusZone: { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
        },
        B: {
          label: 'Sujeto centro / Título arriba',
          textZone:  { x: 0.030, y: 0.145, w: 0.940, h: 0.130 },
          focusZone: { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
        },
      },
      textZone:    { x: 0.030, y: 0.730, w: 0.940, h: 0.130 },
      focusZone:   { x: 0.030, y: 0.000, w: 0.940, h: 0.870 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
    },

    'MOD N': {
      // Layout personalizado — la maquetación se hace en _applyModN()
      // (crea 8 capas auto-generadas con exclusiveFormat:'MOD N' + duplica el sujeto para blur).
      scaleModeDefault: 'crop',
      crop: { fill: 1.00, anchorFraction: 0.50 },
      fit:  { fill: 1.00, anchorFraction: 0.50 },
      isCustomLayout: true,
    },

    'FANART MOD N': {
      variants: {
        A: {
          label: 'Imagen derecha',
          focusZone: { x: 0.420, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },

    'MOD N SIL': {
      headBottomFraction: 0.55,
      variants: {
        A: {
          label: 'Imagen centrada / Título abajo',
          textZone:  { x: 0.150, y: 0.660, w: 0.700, h: 0.230 },
          focusZone: { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
        },
      },
      textZone:    { x: 0.150, y: 0.660, w: 0.700, h: 0.230 },
      focusZone:   { x: 0.010, y: 0.000, w: 0.980, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.10  },
      crop: { fill: 'auto', anchorFraction: 0.00 },
      fit:  { fill: 1.00,  anchorFraction: 0.00 },
      scaleModeDefault: 'crop',
      autoMaskBackground: true,
      anchorEdge: 'top',
      useTitleLayer: true,
    },

    // ══════════════════════════════════════════════════════════
    // COMERCIAL — punto de partida, pendiente de afinar
    // ══════════════════════════════════════════════════════════
    // Primera pasada: el sujeto CENTRADO en la pieza, sin zonas de texto. El
    // diseñador irá dando feedback formato a formato sobre esto.
    //
    //   focusZone  x:0 y:0 w:1 h:1  → toda la pieza, sin desplazar a un lado
    //                                 (los formatos antiguos la desplazan para
    //                                 dejar hueco al texto; aquí aún no hay).
    //   anchorPoint 0.50 / 0.22     → el criterio de la casa: la cara del
    //                                 sujeto al 22% desde arriba.
    //   crop.fill                   → cuánto desborda el sujeto. Se escala con
    //                                 lo apaisado que sea el formato, igual que
    //                                 en los existentes: ~1.2 en verticales,
    //                                 1.5 en 16:9, 3.0 en panorámicos.
    //
    // SIN textZone a propósito: los títulos se definen después. Mientras no
    // esté, el motor no coloca título en estos formatos.
    'Mosaico-Horizontal': {                                    // 1000x750  ar 1.33
      // AFINADO con el diseñador (1ª pasada). Una sola opción:
      //   título centrado, pegado por encima del área de seguridad, al 37%
      //   figura centrada (su tamaño lo fija el encuadre focal)
      //
      // La textZone sale de medir el checker SF_Mosaico_Horizontal.png: la
      // banda reservada empieza en y=608 de 750, o sea al 0.811 del alto.
      //
      // La zona encierra el TEXTO VISIBLE, no el lienzo de la composición (que
      // trae aire transparente alrededor), y va ANCLADA ABAJO: así el último
      // píxel del texto se apoya en la banda sea cual sea el título. Sin
      // `align`, el texto se centra en la zona y queda flotando en cuanto su
      // proporción no coincide con la de la caja — que es lo que pasaba.
      //
      // El ANCHO es lo que fija la escala: 0.592 del lienzo = 592 px, que es el
      // texto al 37% que pidió el diseñador. El ALTO va holgado a propósito,
      // para que quepan títulos más largos sin que la zona los encoja.
      textZone:    { x: 0.204, y: 0.461, w: 0.592, h: 0.350, align: 'bottom' },
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.40, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Mosaico-Vertical': {                                      // 1000x1580 ar 0.63
      // AFINADO con el diseñador. Una sola opción: el título se escala hasta
      // que sus laterales coinciden con los del área de seguridad, y su último
      // píxel se apoya en la banda inferior. Figura centrada.
      //
      // Medido del checker SF_Mosaico_Vertical.png: el área útil va de x=37 a
      // x=970 y la banda inferior empieza en y=1437 de 1580.
      //
      // OJO: el checker está DESCENTRADO 8 px (37 de margen izquierdo frente a
      // 29 del derecho, constante en todas las filas). La zona sigue al área
      // de seguridad, así que el título queda centrado respecto a ELLA y no
      // respecto al lienzo: su centro cae en x=503.5. Si algún día se corrige
      // el checker, esta zona se recalcula sola midiéndolo otra vez.
      //
      // El tamaño sale de la DOBLE CONDICIÓN que ya aplica _applyTitle:
      //     scale = min(ancho_zona / ancho_texto, alto_zona / alto_texto)
      // o sea, el título crece hasta tocar los laterales del área segura SALVO
      // que antes choque con el techo de altura. Sin ese techo, un título corto
      // y alto tipo "IT" se escalaría hasta llenar media creatividad.
      //
      // El TECHO lo puso el diseñador como guía en la propia app, en y=1093, y
      // la zona llega hasta el inicio de la banda inferior (y=1437): 344 px de
      // alto. Así, "hasta dónde puede crecer el título" deja de ser un número
      // inventado y pasa a ser una decisión visual que se ve en el lienzo.
      // Si se mueve la guía, este valor se recalcula: h = (1437 - pos) / 1580.
      textZone:    { x: 0.037, y: 0.692, w: 0.934, h: 0.218, align: 'bottom' },
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Modulo-Escritorio': {                                     // 2800x1575 ar 1.78
      // AFINADO con el diseñador. Tres composiciones.
      //
      // Este formato NO tiene checker SF_, así que no hay área de seguridad que
      // medir: las referencias las marcó el diseñador con sólidos y una guía
      // sobre la propia pieza.
      //   · sólido inferior de 151 px -> en la variante centrada el título se
      //     apoya en y=1425 (redondeando la banda a 150)
      //   · sólido lateral de 150 px  -> en las laterales el título arranca
      //     justo donde acaba, en x=150
      //   · guía vertical en x=2083   -> la figura se centra ahí (se usa 2080)
      //
      // El título va a ESCALA FIJA del 70%, no encajado: la composición de texto
      // es un lienzo fijo que el diseñador ya ha compuesto, y se quiere que el
      // título mida lo mismo venga el que venga. Por eso `scale: 70` y la zona
      // solo marca la POSICIÓN:
      //   A/B -> `alignH` pega el título al borde (x=150 o x=2650) y en
      //          vertical va centrado (la zona está centrada en la pieza)
      //   C   -> `align: 'bottom'` lo apoya en y=1425
      variants: {
        A: {
          label: 'Texto izquierda / Imagen derecha',
          textZone:  { x: 0.054, y: 0.180, w: 0.400, h: 0.640, scale: 116, alignH: 'left' },
          focusZone: { x: 0.493, y: 0.000, w: 0.500, h: 1.000 },
        },
        B: {
          label: 'Texto derecha / Imagen izquierda',
          textZone:  { x: 0.546, y: 0.180, w: 0.400, h: 0.640, scale: 116, alignH: 'right' },
          focusZone: { x: 0.007, y: 0.000, w: 0.500, h: 1.000 },
        },
        C: {
          label: 'Imagen centrada / Texto centrado abajo',
          textZone:  { x: 0.300, y: 0.665, w: 0.400, h: 0.240, scale: 116, align: 'bottom' },
          focusZone: { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
        },
      },
      textZone:    { x: 0.054, y: 0.180, w: 0.400, h: 0.640, scale: 116, alignH: 'left' },
      focusZone:   { x: 0.493, y: 0.000, w: 0.500, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Modulo-Movil': {                                          // 1200x1200 ar 1.00
      // AFINADO con el diseñador. Una sola opción: imagen centrada y título
      // centrado apoyado sobre la banda inferior.
      //
      // Sin checker, igual que Modulo-Escritorio: las referencias las marcó el
      // diseñador sobre la pieza.
      //   · sólidos verdes laterales de 60 px -> el título crece hasta ellos,
      //     así que el ancho útil va de x=60 a x=1140
      //   · sólido rojo inferior de 100 px    -> el título se apoya en y=1100
      //   · guía horizontal en y=760          -> techo de altura, para que un
      //     título corto y alto tipo "IT" no siga creciendo
      //
      // SIN `scale`: aquí interesa el ENCAJE, no una escala fija. El título
      // llena el ancho disponible salvo que antes choque con el techo, que es
      // la doble condición de _applyTitle. Mismo criterio que en Mosaico-Vertical.
      textZone:    { x: 0.050, y: 0.633, w: 0.900, h: 0.283, align: 'bottom' },
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.30, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Detalle-Escritorio': {                           // 3840x2160 ar 1.78
      // El título va PLANCHADO en esta pieza (confirmado con el pack entregado
      // de "El ser querido"), así que se maqueta por zona, se puede mover y se
      // exporta. Estuvo clavado por un malentendido.
      //
      // La zona reproduce EXACTAMENTE la colocación que ya estaba validada:
      // caja de 1706x514 en (180, 324) sobre 3840x2160. Apoyada abajo a la
      // izquierda, que es como se compone este título.
      textZone:    { x: 0.047, y: 0.150, w: 0.444, h: 0.238, align: 'bottom', alignH: 'left' },
      // El diseñador marcó una GUÍA VERTICAL en x=2650: la imagen va centrada
      // en ella. 2650/3840 = 0,690, así que la zona se hace simétrica respecto
      // a ese centro (0,380 + 0,620/2 = 0,690). Encaja con la pieza: el texto
      // ocupa la izquierda y el sujeto se va a la derecha.
      focusZone:   { x: 0.380, y: 0.000, w: 0.620, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Detalle-Movil': {                                // 2160x3840 ar 0.56
      // Título PLANCHADO. Dos reglas del diseñador, las dos MEDIDAS de sus
      // propios assets, no estimadas:
      //  · IZQUIERDA, a ras del titular HTML del mockup. La "E" de "El thriller"
      //    arranca en x=86 de MK_Cabecera_Detalle_Movil.png → 86/2160 = 0.040
      //  · CENTRADO en la franja libre del safe, que va de y=639 a y=1648
      //    (medida de SF_Cabecera_Detalle_Movil.png) → y 0.166, h 0.263.
      //    Sin `align`: centrar es el comportamiento por defecto.
      //
      // ESCALA FIJA 119 %, por decisión del diseñador: prefiere una maquetación
      // por defecto siempre válida y ajustarla a mano si hace falta. El número
      // sale de medir SU pieza colocada a ojo (el título ocupa 1375 px de ancho)
      // contra los 1156 del lienzo de COM TITULO H: 1375/1156 = 118,9 %.
      //
      // Contraste de que las reglas son las buenas: su colocación a mano cae a
      // 15 px del margen y 24 px del centro. Es afinar mucho a pulso.
      textZone:    { x: 0.040, y: 0.166, w: 0.920, h: 0.263, scale: 119, alignH: 'left' },

      // DOS OPCIONES DE IMAGEN. El título NO cambia entre ellas: va siempre a la
      // izquierda para coincidir con el texto HTML del mockup.
      //
      // Las zonas NO son un número a ojo: salen de despejar la referencia del
      // diseñador. Él colocó el sujeto al 140 % en x=623, y=-393, con un recorte
      // focal de w=0,8176 sobre un asset de 1049x1487. Como `_applySubjectFocal`
      // hace que el RECORTE llene la focusZone, la zona que produce ese resultado
      // mide 1201x2082 px (0,5559 x 0,5421) y se centra donde deba.
      //
      // Lo que se guarda es la ZONA, no el 140 %. El porcentaje era un resultado,
      // no una regla: dependía del tamaño en píxeles de ESE recorte, y con otro
      // material se habría ido de madre (ya nos pasó con el 70 % de Módulo
      // Escritorio). Guardando la zona, el encuadre focal sigue decidiendo QUÉ
      // parte del sujeto se ve, y el formato decide DÓNDE y DE QUÉ TAMAÑO queda.
      // La A es la que sale por defecto (así lo fija _variant[...] || 'A'), y el
      // diseñador quiere arrancar con la imagen a la derecha. Por eso van en
      // este orden y no al revés: es intercambiar dos letras en vez de añadir
      // un `defaultVariant` que habría que respetar en tres sitios.
      variants: {
        A: { label: 'Imagen a la derecha',
             focusZone: { x: 0.5105, y: 0.1266, w: 0.5559, h: 0.5421 } },
        B: { label: 'Imagen centrada',
             focusZone: { x: 0.2221, y: 0.1266, w: 0.5559, h: 0.5421 } },
      },
      focusZone:   { x: 0.5105, y: 0.1266, w: 0.5559, h: 0.5421 },   // = variante A
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Carrusel-Vertical': {                                     // 1200x1800 ar 0.67
      // AFINADO con el diseñador. Mismo comportamiento que Mosaico-Vertical:
      // una sola opción, imagen centrada y título en ENCAJE con TECHO.
      //
      // Sin checker: las referencias las marcó sobre la pieza y se han
      // contrastado midiendo su archivo (Maquetacion-carrusel-vertical.jpg).
      // Las tres coinciden al píxel con lo que dijo:
      //   · sólidos verdes laterales de 94 px  → hueco útil x 95 → 1105
      //   · sólido rojo inferior de 300 px     → el título se apoya en y=1500
      //   · guía horizontal en y=1120          → techo de altura
      //
      // La DOBLE CONDICIÓN es la gracia: el título crece hasta tocar los verdes,
      // salvo que antes choque con el techo. Sin ese tope, un título corto y
      // alto tipo "IT" se comería media pieza. Igual que en Mosaico-Vertical,
      // el techo no es un número inventado: lo marcó el diseñador con una guía.
      textZone:    { x: 0.079, y: 0.622, w: 0.843, h: 0.211, align: 'bottom' },
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Carrusel-Horizontal': {                                   // 800x450   ar 1.78
      // MISMAS REGLAS QUE MODULO-ESCRITORIO, y no por parecido: los dos tienen
      // EXACTAMENTE la misma proporción (2800/1575 y 800/450 son 1,7778).
      // Carrusel Horizontal es Módulo Escritorio al 28,6 %, así que las zonas,
      // que van en proporción, se copian TAL CUAL sin recalcular nada.
      //
      // La ESCALA FIJA sí cambia, y es la trampa de siempre: ese porcentaje es
      // del lienzo del TÍTULO (1156 px), que no encoge aunque la pieza sí. El
      // 116 % de Módulo Escritorio son 1341 px — sobre una pieza de 800 se
      // saldría al 168 % del ancho. La equivalencia exacta sería 33,1 %
      // (116 x 800/2800), pero el diseñador la sube a 40 % POR LEGIBILIDAD: en
      // una pieza tan pequeña el título necesita más peso relativo. Con 40 %
      // ocupa el 57,8 % del ancho frente al 47,9 % del formato grande.
      //
      // Regla que ya va por su tercera vez: las ZONAS viajan entre formatos,
      // los PORCENTAJES no.
      variants: {
        A: { label: 'Texto izquierda / Imagen derecha',
             textZone:  { x: 0.054, y: 0.180, w: 0.400, h: 0.640, scale: 40, alignH: 'left' },
             focusZone: { x: 0.493, y: 0.000, w: 0.500, h: 1.000 } },
        B: { label: 'Texto derecha / Imagen izquierda',
             textZone:  { x: 0.546, y: 0.180, w: 0.400, h: 0.640, scale: 40, alignH: 'right' },
             focusZone: { x: 0.007, y: 0.000, w: 0.500, h: 1.000 } },
        C: { label: 'Imagen centrada / Texto centrado abajo',
             textZone:  { x: 0.300, y: 0.665, w: 0.400, h: 0.240, scale: 40, align: 'bottom' },
             focusZone: { x: 0.000, y: 0.000, w: 1.000, h: 1.000 } },
      },
      textZone:    { x: 0.054, y: 0.180, w: 0.400, h: 0.640, scale: 40, alignH: 'left' },
      focusZone:   { x: 0.493, y: 0.000, w: 0.500, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Slider-Escritorio': {                            // 3840x2160 ar 1.78
      // La pieza es FULL-BLEED: la imagen llena el formato entero y la web
      // monta encima su cabecera, sus textos y el CTA. Por eso focusZone va a
      // toda la pieza, igual que en los otros cinco Slider.
      //
      // ⚠️ AQUÍ ME EQUIVOQUÉ (2026-10-29 → corregido el 30). Había puesto como
      // focusZone la VENTANA DE SEGURIDAD medida del safe del diseñador:
      //
      //   x 1641 → 3162  (ancho 1522)     y 163 → 1176  (alto 1014)
      //   normalizado: { x: 0.4273, y: 0.0755, w: 0.3964, h: 0.4694 }
      //
      // La medida es correcta y coincide al píxel con SF_Cabecera_Slider_
      // Escritorio.png, pero el CONCEPTO era otro. Son dos cosas distintas:
      //   · focusZone      = el rectángulo de la PIEZA que la imagen debe llenar
      //   · ventana segura = dónde debe CAER lo importante para que la interfaz
      //                      de la web no lo tape
      // Usar la segunda como la primera hace que el motor ENCOJA la imagen para
      // meterla dentro del hueco (se veía al 68,2 %, 715×1014 en una pieza de
      // 3840×2160) en vez de aplicarle su recorte. Síntoma que lo delata: el
      // alto dibujado coincidía exactamente con el alto de la ventana.
      // Pista de diagnóstico: TODOS los demás formatos llevan h: 1.000; los que
      // restringen algo (Modulo-Escritorio, Cabecera-Detalle-Escritorio) lo
      // hacen solo en ancho, porque ahí la imagen sí ocupa media pieza.
      //
      // CENTRADO EN LA GUÍA DEL DISEÑADOR, no en la pieza (2026-11-03).
      // La guía vertical de su proyecto está en x=2398 (+478 del centro), y
      // coincide con el centro de la ventana segura medida del safe (2401,5):
      // dos fuentes independientes, 3 px de diferencia.
      //
      // Para que el sujeto caiga sobre la guía Y la imagen siga llenando la
      // pieza, la zona tiene que ser SIMÉTRICA respecto a la guía y alcanzar el
      // borde más lejano — aquí el izquierdo, a 2398 px:
      //
      //   semiancho = max(2398, 3840-2398) = 2398  →  ancho 4796
      //   w = 4796 / 3840 = 1,249        x = (2398-2398) / 3840 = 0
      //   centro = (0 + 1,249/2) x 3840  = 2398,08 ✓
      //
      // Sí, w > 1: la zona SOBRESALE de la pieza por la derecha, y es correcto.
      // Es lo que obliga al motor a ampliar lo justo para que no asome hueco
      // por la izquierda. Coste: ~25 % más de zoom que a sangre (1,249x), y lo
      // que sobresale del recorte focal se pierde por la derecha.
      // La alternativa era no tocar la zona y pedir al diseñador que encuadrara
      // el sujeto a la derecha en CADA campaña; se descartó porque el sitio del
      // sujeto es una propiedad del FORMATO, no de la pieza de turno.
      //
      // El título NO se maqueta aquí: este formato lo entrega como asset suelto
      // y va clavado por TITULO_FIJO, que ya tiene sus coordenadas. No se
      // exporta en la pieza; solo se pinta en el JPG de MOCKUP.
      focusZone:   { x: 0.000, y: 0.000, w: 1.249, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Slider-Movil': {                                 // 2160x3840 ar 0.56
      // La imagen NO va a sangre aquí. El diseñador la quiere al 200 % y algo
      // alta: lo que queda sin tapar por abajo lo cubre el desarrollo HTML del
      // móvil (textos y CTA), así que no es un hueco, es sitio reservado.
      //
      // Zona despejada de SU colocación, no estimada. Dio escala 200 %, X=0 e
      // Y=-214 sobre el retrato de referencia (1049x1487).
      //
      // ⚠️ LA ZONA ES LA CAJA QUE LLENA EL RECORTE FOCAL, NO LA IMAGEN. Es la
      // distinción que más caro se paga en esta tabla. El recorte VERTICAL del
      // diseñador no es a todo el ancho: {x: 0.0980, w: 0.8039} → 843,3 px de
      // los 1049 naturales, y centrado en los dos ejes.
      //
      //   alto:  recorte = imagen (h: 1) → 1487 x 2 = 2974
      //          h = 2974/3840 = 0,7745    y = 219/3840 = 0,0570  (centro 1706)
      //   ancho: recorte al 200 % = 843,3 x 2 = 1686,7
      //          w = 1686,7/2160 = 0,7809   x = (1080-843,3)/2160 = 0,1096
      //
      // La primera versión usó 2098 (= 1049x2), como si el recorte fuera la
      // imagen entera. Medido: salía al 248,8 %, y de paso disparaba el margen
      // superior mínimo, que bajaba la imagen 336 px (Y=122 en vez de -214).
      //
      // Consecuencia a tener presente: si se reencuadra recortando MÁS por los
      // lados, la imagen se amplía para que el recorte siga llenando la caja.
      // Es lo correcto —el sujeto conserva su tamaño en la pieza— pero implica
      // que ese "200 %" no es una constante del formato, sino el valor que sale
      // con este encuadre.
      //
      // DOS VARIANTES, misma zona movida en X (como Cabecera-Detalle-Movil):
      // centrada en la pieza, o centrada en la guía vertical del diseñador.
      //   guía x=1556 (+476 del centro) → x = (1556-843,3)/2160 = 0,3299
      // La A es la que manda; cambiar el defecto es intercambiar las letras.
      variants: {
        A: { label: 'Imagen centrada',
             focusZone: { x: 0.1096, y: 0.0570, w: 0.7809, h: 0.7745 } },
        B: { label: 'Imagen a la derecha',
             focusZone: { x: 0.3299, y: 0.0570, w: 0.7809, h: 0.7745 } },
      },
      focusZone:   { x: 0.1096, y: 0.0570, w: 0.7809, h: 0.7745 },   // = variante A
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.20, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Slider-Mediano-Escritorio': {                    // 3840x1200 ar 3.20
      // UNA SOLA OPCIÓN: el safe deja un único sitio donde maquetar. Su banda
      // recomendada va de x=2059 a x=3362 (medida de
      // SF_Cabecera_Slider_Mediano_Escritorio.png) → centro 2710,5, y la guía
      // vertical del diseñador está en 2701. Nueve píxeles entre dos fuentes
      // independientes.
      //
      // Centrado en la guía, misma técnica que Cabecera-Slider-Escritorio: zona
      // SIMÉTRICA respecto a la guía, alcanzando el borde más lejano (el
      // izquierdo, a 2701 px):
      //
      //   semiancho = max(2701, 3840-2701) = 2701  →  ancho 5402
      //   w = 5402 / 3840 = 1,4068      x = (2701-2701) / 3840 = 0
      //   centro = (0 + 1,4068/2) x 3840 = 2701,06 ✓
      //
      // ⚠️ ESTO CAMBIA LA ESCALA, y el diseñador había dicho "la que pone ahora
      // mismo". No hay forma de evitarlo: a sangre la imagen mide justo 3840 de
      // ancho, así que moverla a la guía SIN ampliar abriría 781 px de hueco por
      // la izquierda (un 20 % de la pieza). Ampliar x1,4068 es el precio de
      // poner un punto descentrado en su sitio sin destapar el borde contrario.
      // Si se prefiere congelar la escala y asumir el hueco: w: 1.000, x: 0.2034.
      //
      // El título NO existe en esta pieza: está en TEXT_VARIANT_NONE
      // (formats.js), así que no se pinta ni se exporta. Tampoco entra en
      // TITULO_FIJO, que es para los Slider que SÍ lo enseñan en el mockup.
      focusZone:   { x: 0.000, y: 0.000, w: 1.4068, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Slider-Mediano-Escritorio': {                             // 3840x1200 ar 3.20
      // Gemelo de Cabecera-Slider-Mediano-Escritorio: misma medida, misma guía,
      // y tampoco lleva título. COMPROBADO antes de copiar, no asumido: los dos
      // checkers son archivos DISTINTOS (md5 distinto, cambia la rotulación)
      // pero su zona recomendada cae exactamente igual, x 2059→3362, centro
      // 2710,5. Por eso la guía del diseñador en 2701 vale para los dos.
      //
      //   semiancho = max(2701, 3840-2701) = 2701  →  ancho 5402
      //   w = 5402 / 3840 = 1,4068      x = 0      centro = 2701,06
      //
      // Sin título: está en TEXT_VARIANT_NONE (formats.js), así que la
      // composición no se pinta ni se exporta. Ver la nota larga del gemelo
      // para el porqué de ampliar x1,4068 en vez de dejar la escala a sangre.
      focusZone:   { x: 0.000, y: 0.000, w: 1.4068, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Cabecera-Slider-Mediano-Movil': {                         // 1536x1536 ar 1.00
      // La imagen NO va a sangre: se coloca al lado, dentro de la franja válida
      // del safe (y 433→1085 a todo el ancho). El recorte 1:1 de la banda
      // CUADRADO vale tal cual — lo confirmó el diseñador.
      //
      // Sus medidas: escala 125 %, Y=490 del panel, y la X sale de su guía
      // vertical en x=1089 (+321 del centro de 768). Sobre el retrato de
      // referencia 1049×1487:
      //
      // El motor centra el RECORTE FOCAL en la zona, NO la caja de la imagen.
      // Esa distinción es la clave aquí y conviene no olvidarla:
      //
      //  · En X da igual. El recorte de la banda CUADRADO solo cabe a todo el
      //    ancho del retrato, así que su centro ES el centro de la imagen. Por
      //    eso la guía vertical basta.
      //  · En Y NO da igual. Ese recorte puede deslizarse, y el diseñador lo
      //    dejó pegado arriba para coger la cara: {x:0, y:0, w:1, h:0.7381},
      //    o sea 1049x1097,5 px con su centro al 0,3691 de la altura.
      //
      // Primera versión de esta entrada asumió el recorte centrado y la imagen
      // salió 243 px baja — justo la diferencia: 1858,8 x (0,5 - 0,3691).
      //
      // Cuenta buena, con las dos guías del diseñador (1088, 1254) y 125 %:
      //
      //   lado de zona = 1049 x 1,25 = 1311,25    (cuadrada; manda el ancho,
      //     porque 1311,25/1049 = 1,250 > 1311,25/1097,5 = 1,195)
      //   w = h = 1311,25 / 1536     = 0,8537
      //   zonaX = 1088                            → x = (1088-655,6)/1536 = 0,2815
      //   zonaY = 1254 - 1858,8 x (0,5 - 0,3691)
      //         = 1254 - 243,3 = 1010,7           → y = (1010,7-655,6)/1536 = 0,2312
      //
      // Lo que queda clavado es que el RECORTE caiga con su centro en y≈1011.
      // Si en otra campaña se encuadra la cara más alta o más baja, el sujeto
      // seguirá ahí y será la caja la que se mueva — que es lo correcto.
      //
      // Sin título: está en TEXT_VARIANT_NONE (formats.js).
      focusZone:   { x: 0.2815, y: 0.2312, w: 0.8537, h: 0.8537 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.30, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },
    'Slider-Mediano-Movil': {                                  // 1536x1536 ar 1.00
      // Su safe lo dice con todas las letras: "IMAGEN CENTRADA · ZONA
      // RECOMENDADA PARA EL ELEMENTO MÁS IMPORTANTE". El bloque está centrado
      // en (767,5, 767,5), el centro exacto de la pieza.
      //
      // Centrada y al 100 %. Con el recorte CUADRADO del diseñador
      // {x:0, y:0, w:1, h:0.7760} (centro vertical 0,3880) sobre 1049×1487:
      //
      //   lado de zona = 1049 x 1,00 = 1049    (manda el ancho: 1049/1049 = 1,00
      //     frente a 1049/1153,8 = 0,909)
      //   w = h = 1049 / 1536        = 0,6829
      //   zonaX = 768                          → x = (768-524,5)/1536 = 0,1585
      //   zonaY = 768 - 1487 x (0,5 - 0,3880)
      //         = 768 - 166,5 = 601,5          → y = (601,5-524,5)/1536 = 0,0501
      //
      // margenSuperiorMin: 0 — AQUÍ LA REGLA GLOBAL ESTORBA. Al 100 % la imagen
      // mide 1487 de alto en una pieza de 1536: el borde superior cae en y=24,5
      // y el mínimo del 5 % (76,8) la empujaría 52,3 px hacia abajo, dejándola
      // descentrada justo en el formato que pide estar centrado. La regla existe
      // para que a un sujeto no se le pegue la cabeza al filo; cuando el diseño
      // pide centrado explícito, manda el diseño.
      focusZone:   { x: 0.1585, y: 0.0501, w: 0.6829, h: 0.6829 },
      margenSuperiorMin: 0,
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 1.30, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },

  };

  // Estado del motor
  let _rolesAssigned = false; // si ya se asignaron roles en esta sesión
  let _scaleMode     = {};    // { formatId: 'crop'|'fit' }
  let _mirrored      = {};    // { formatId: bool }
  let _variant       = {};    // { formatId: 'A'|'B'|'C'|'D' }

  // ── DETECCIÓN DE ROL POR NOMBRE DE FICHERO ───────────────
  function detectRole(filename) {
    const upper = filename.toUpperCase();
    for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
      if (keywords.some(k => upper.includes(k))) return role;
    }
    return null; // sin rol detectado
  }

  // ── MODAL DE ASIGNACIÓN DE ROLES ─────────────────────────
  // `preRoles` (opcional): { layerId: rol } ya decidido por quien llama. Si
  // viene, NO se muestra el modal y se continúa directo con esos roles. Lo usa
  // la importación de PSD, que pregunta el rol en su propio modal (árbol de
  // capas) y no debe encadenar un segundo modal al confirmar.
  function showRoleModal(layers, onConfirm, preRoles) {
    if (preRoles) { onConfirm(preRoles); return; }

    // Solo capas de imagen (no texto, sólido, degradado, sistema)
    const imageLayers = layers.filter(l =>
      !['text', 'solid', 'gradient'].includes(l.type) &&
      !esComposicionAuto(l) &&
      l.src
    );

    if (imageLayers.length === 0) return;

    // Detectar roles automáticamente
    const detectedRoles = {};
    imageLayers.forEach(l => {
      detectedRoles[l.id] = State.layerRoles?.[l.id] || detectRole(l.name) || null;
    });

    // Crear modal
    const overlay = document.createElement('div');
    overlay.id = 'auto-layout-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);
      z-index:99000;display:flex;align-items:center;justify-content:center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#1a1a1a;border:1px solid #333;border-radius:6px;
      padding:24px;min-width:480px;max-width:600px;
      font-family:var(--font);
    `;

    // Título
    const title = document.createElement('div');
    title.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--col-yellow);margin-bottom:6px;';
    title.textContent = 'Maquetación Automática';
    modal.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:11px;color:#888;margin-bottom:20px;letter-spacing:0.02em;';
    subtitle.textContent = 'Asigna un rol a cada capa para generar la maquetación automática.';
    modal.appendChild(subtitle);

    // Filas de capas
    const TODOS_LOS_ROLES = [
      { value: 'imagen_big', label: 'IMAGEN BIG' },
      { value: 'background', label: 'FONDO' },
      { value: 'subject',    label: 'IMAGEN PRINCIPAL' },
      { value: 'title_h',    label: 'TÍTULO HORIZONTAL' },
      { value: 'title_v',    label: 'TÍTULO VERTICAL' },
      { value: 'fanart',     label: 'FANART' },
      { value: null,         label: 'NINGUNO' },
    ];

    // ROLES ÚNICOS. Un rol describe lo que el asset ES, y de cada cosa solo hay
    // una: un fondo, una imagen principal, un título horizontal. Si ya está
    // ocupado por una capa VIVA, no se vuelve a ofrecer — para cambiar el asset
    // está "Reemplazar imagen" del botón derecho, que además conserva la
    // colocación en los 50 formatos. Mezclar las dos cosas en el modal invitaba
    // a crear dos fondos y a perder el encaje.
    //
    // NINGUNO nunca se filtra: es el rol de las imágenes secundarias (texturas,
    // elementos sueltos) y se puede repetir tantas veces como haga falta.
    //
    // Se mira sobre las capas VIVAS y no sobre State.layerRoles, por el mismo
    // motivo que isBigMode: al borrar una capa su rol queda libre, y la tabla
    // puede conservar entradas de capas que ya no existen.
    const _enEsteModal = new Set(imageLayers.map(l => l.id));
    const _ocupados = new Set(
      (State.layers || [])
        .filter(l => !_enEsteModal.has(l.id))
        .map(l => State.layerRoles?.[l.id])
        .filter(Boolean)
    );
    const roleOptions = TODOS_LOS_ROLES.filter(o => o.value === null || !_ocupados.has(o.value));

    const selects = {};
    imageLayers.forEach(layer => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';

      // Thumbnail
      const thumb = document.createElement('img');
      thumb.src = layer.src;
      thumb.style.cssText = 'width:48px;height:32px;object-fit:cover;border-radius:3px;border:1px solid #333;flex-shrink:0;';

      // Nombre
      const name = document.createElement('span');
      name.style.cssText = 'flex:1;font-size:11px;color:#ccc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      name.textContent = layer.name;

      // Selector de rol
      const select = document.createElement('select');
      select.style.cssText = `
        height:28px;background:#2a2a2a;border:1px solid #3a3a3a;border-radius:3px;
        color:#fff;font-family:var(--font);font-size:10px;font-weight:700;
        letter-spacing:0.06em;text-transform:uppercase;padding:0 8px;
        cursor:pointer;outline:none;flex-shrink:0;
      `;

      roleOptions.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value || '';
        o.textContent = opt.label;
        if ((detectedRoles[layer.id] || '') === (opt.value || '')) o.selected = true;
        select.appendChild(o);
      });

      selects[layer.id] = select;
      row.appendChild(thumb);
      row.appendChild(name);
      row.appendChild(select);
      modal.appendChild(row);
    });

    // Separador
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:#2a2a2a;margin:16px 0;';
    modal.appendChild(sep);

    // Botones
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.cssText = `
      height:28px;padding:0 16px;background:transparent;border:1px solid #444;
      border-radius:3px;color:#888;font-family:var(--font);font-size:10px;
      font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;
    `;
    btnCancel.addEventListener('click', () => overlay.remove());

    const btnApply = document.createElement('button');
    btnApply.textContent = 'Automatizar diseño';
    btnApply.style.cssText = `
      height:28px;padding:0 16px;background:var(--col-yellow);border:none;
      border-radius:3px;color:#000;font-family:var(--font);font-size:10px;
      font-weight:700;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;
    `;
    btnApply.addEventListener('click', () => {
      // Recoger roles asignados
      const roles = {};
      imageLayers.forEach(l => {
        const val = selects[l.id].value;
        roles[l.id] = val || null;
      });
      overlay.remove();
      onConfirm(roles);
    });

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnApply);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ── MOTOR DE MAQUETACIÓN ──────────────────────────────────
  function applyToFormat(formatName, roles, layers) {
    const cfg = FORMAT_CONFIG[formatName];
    if (!cfg) return;

    // PERFIL tiene lógica async especial con MediaPipe
    if (formatName === 'PERFIL') {
      _applyPerfil(layers);
      return;
    }

    // MOD N: layout custom que crea capas auto-generadas
    if (formatName === 'MOD N') {
      _applyModN(layers);
      return;
    }

    const fmtSize = State.formatSizes[formatName];
    if (!fmtSize) return;
    const W = fmtSize.w;
    const H = fmtSize.h;

    if (!State.formatParams[formatName]) State.formatParams[formatName] = {};

    // Inicializar estado de escala, espejo y variante.
    // Si el formato usará ENCUADRE FOCAL del sujeto, el modo natural es FIT
    // (contain): muestra la región encuadrada COMPLETA. Cover (crop) haría zoom
    // más allá del encuadre y recortaría justo lo que el usuario enmarcó. Los
    // formatos SIN encuadre conservan su default original (crop). El toggle
    // sigue disponible por si se quiere acercar.
    if (!_scaleMode[formatName]) {
      let _focalDefault = false;
      if (typeof FocalFrames !== 'undefined' && cfg.fit) {
        const _b = FocalFrames.bandForFormat(formatName);
        const _subj = _b ? (layers || []).find(l => roles[l.id] === 'subject') : null;
        if (_subj && FocalFrames.getFrame(_subj.id, _b)) _focalDefault = true;
      }
      _scaleMode[formatName] = _focalDefault ? 'fit' : cfg.scaleModeDefault;
    }
    if (_mirrored[formatName] === undefined) _mirrored[formatName] = false;
    if (!_variant[formatName]) _variant[formatName] = 'A';

    const scaleMode = _scaleMode[formatName];
    const mirrored  = _mirrored[formatName];
    const scaleCfg  = scaleMode === 'crop' ? cfg.crop : cfg.fit;

    // Resolver textZone y focusZone según variante activa — sin mutar cfg
    const variantKey = _variant[formatName];
    const activeVariant = cfg.variants?.[variantKey];
    const textZone  = activeVariant?.textZone  || cfg.textZone;
    const focusZone = activeVariant?.focusZone || cfg.focusZone;

    // FANART: si hay asset con rol 'fanart' y este es un formato FANART, se coloca SOLO el
    // fanart a sangre (cover); el subject/fondo no se colocan. Las capas manuales se respetan.
    const FANART_FORMATS = ['FANART', 'FANART MÓVIL', 'FANART DEST.', 'FANART MOD N'];
    const fanartLayer = State.layers.find(l => State.layerRoles?.[l.id] === 'fanart');
    const useFanart   = FANART_FORMATS.includes(formatName) && !!fanartLayer;
    if (useFanart) {
      _applyBackground(formatName, fanartLayer, W, H, mirrored);
    }

    layers.forEach(layer => {
      const role = roles[layer.id];
      if (!role) return;
      if (role === 'fanart') return; // el fanart se coloca aparte (y solo en formatos FANART)
      if (useFanart && (role === 'background' || role === 'subject' || role === 'imagen_big')) return; // tapados por el fanart

      // IMAGEN BIG se coloca POR AHORA igual que un fondo (encaje cover-fit).
      // Es el punto de partida mientras no exista la tabla de valores fijos por
      // formato (fase 4), que lo sobrescribirá donde haya medición. Sin esto el
      // rol caería por todas las ramas y la imagen se quedaría sin colocar.
      if (role === 'background' || role === 'imagen_big') {
        _applyBackground(formatName, layer, W, H, mirrored);
        // Enmascarar automáticamente si el formato lo requiere
        if (cfg.autoMaskBackground) {
          if (!State.formatMaskEnabled[formatName]) State.formatMaskEnabled[formatName] = {};
          State.formatMaskEnabled[formatName][layer.id] = true;
        }

      } else if (role === 'subject') {
        if (!scaleCfg) return; // formato sin crop/fit (ej. AMAZON LOGO — solo título)
        // Encuadre focal: si el usuario definió un rect para la banda de este
        // formato, derivar la colocación por cover-fit de ese rect. Si no, caer
        // a la colocación genérica de siempre (feature puramente aditiva).
        const _band = (typeof FocalFrames !== 'undefined') ? FocalFrames.bandForFormat(formatName) : null;
        const _fr   = _band ? FocalFrames.getFrame(layer.id, _band) : null;
        if (_fr) {
          _applySubjectFocal(formatName, layer, W, H, focusZone, mirrored, _fr, scaleMode);
        } else {
          _applySubject(formatName, layer, W, H, cfg, scaleCfg, mirrored, focusZone);
        }

      } else if (role === 'title_h' || role === 'title_v' || role === 'title') {
        // Si textZone es null, el formato no tiene zona de título (ej. FANART DEST.)
        if (textZone) {
          // Pre-posicionar TODAS las posibles capas de título en la textZone, así el
          // usuario puede cambiar la variante con el lápiz sin tener que reajustar.
          // La visibilidad real la decide Formats.getTextVariant(formatName).
          const candidates = [
            State.layers.find(l => l.isComposicion),       // composición MUX4 (vieja)
            State.layers.find(l => l.isComposicionMovil),  // composición MOVIL (vieja)
            State.layers.find(l => l.isComposicionTextoH),
            State.layers.find(l => l.isComposicionTextoV),
            State.layers.find(l => l.isComposicionComTituloH), // título de COMERCIAL
            State.layers.find(l => l.isTitleLayerH),       // imagen título cruda H
            State.layers.find(l => l.isTitleLayerV),       // imagen título cruda V
          ].filter(Boolean);
          // Respetar el candado manual: no re-encajar las composiciones que el
          // diseñador ajustó a mano en este formato (resetFormat ya lo ha
          // soltado antes si venimos del botón AUTO).
          candidates.forEach(c => {
            if (State.formatParams?.[formatName]?.[c.id]?.titleManual) return;
            _applyTitle(formatName, c, W, H, cfg, mirrored, textZone);
          });
          // Aditivo extra (mantenemos comportamiento anterior por compat):
          const variant = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(formatName) : null;
          const hvComp = variant === 'H' ? State.layers.find(l => l.isComposicionTextoH)
                       : variant === 'V' ? State.layers.find(l => l.isComposicionTextoV)
                       : null;
          if (hvComp && !State.formatParams?.[formatName]?.[hvComp.id]?.titleManual) {
            _applyTitle(formatName, hvComp, W, H, cfg, mirrored, textZone);
          }
        }
      }
    });

    // MODO IMAGEN BIG: la colocación fija se estampa AL FINAL, pisando lo que
    // acaba de calcular el encaje automático. Hacerlo así (override y no
    // sustitución) garantiza que un formato sin valores medidos —o con imagen
    // pero sin título— siga quedando colocado de forma razonable.
    _applyBigLayout(formatName, layers);
  }

  function _applyBackground(formatName, layer, W, H, mirrored) {
    const nw = layer.naturalWidth  || W;
    const nh = layer.naturalHeight || H;

    // Escalar para cubrir todo el formato (cover) con sobreescalado de
    // OVERSCAN px por lado, para evitar que el fondo verde "chivato" se
    // asome por errores de redondeo en los bordes.
    const OVERSCAN = 5;
    const targetW = W + OVERSCAN * 2;
    const targetH = H + OVERSCAN * 2;
    const scaleToFitX = targetW / nw;
    const scaleToFitY = targetH / nh;
    const scaleFactor = Math.max(scaleToFitX, scaleToFitY);
    const scaleXpct   = scaleFactor * 100;
    const scaleYpct   = scaleFactor * 100;

    // Centrado — x,y son offsets desde el centro del formato
    const drawW = nw * scaleFactor;
    const drawH = nh * scaleFactor;
    const x = 0; // centrado horizontal
    const y = 0; // centrado vertical

    _setParams(formatName, layer.id, {
      x: Math.round(x),
      y: Math.round(y),
      scaleX: Math.round(scaleXpct * 10) / 10,
      scaleY: Math.round(scaleYpct * 10) / 10,
      rotation: 0,
    });
  }

  function _applySubject(formatName, layer, W, H, cfg, scaleCfg, mirrored, focusZone) {
    const nw = layer.naturalWidth  || 200;
    const nh = layer.naturalHeight || 200;
    const fz  = focusZone || cfg.focusZone;
    const ap  = cfg.anchorPoint;

    // fill > 1 → más grande que la focusZone (CROP)
    // fill = 1 → llena exactamente el alto de la focusZone (FIT)
    // fill < 1 → más pequeño que la focusZone
    // fill puede ser 'auto' en formatos con anchorEdge:'top':
    // calcula el zoom máximo que garantiza que la cara esté completamente visible.
    let fill = scaleCfg.fill;
    if (fill === 'auto') {
      const hbf = cfg.headBottomFraction || 0.30;
      fill = 0.90 / (fz.h * hbf);
    }

    const fzH   = H * fz.h;
    const drawH = fzH * fill;
    const drawW = (nw / nh) * drawH;
    const scaleX = (drawW / nw) * 100;
    const scaleY = (drawH / nh) * 100;

    // Punto de anclaje en el asset
    // Si hay contentBounds, usar el centro del contenido real en lugar del centro del bounding box
    const cb = layer.contentBounds;
    const contentCxInDraw = cb ? (cb.x + cb.w / 2) * drawW : drawW / 2;
    const contentCyInDraw = cb ? (cb.y + cb.h / 2) * drawH : drawH / 2;

    // anchorOnDraw: punto de interés dentro del asset escalado
    const anchorOnDrawX = cb ? contentCxInDraw + (ap.x - 0.5) * cb.w * drawW
                             : drawW * ap.x;
    const anchorOnDrawY = cb ? contentCyInDraw + (ap.y - 0.5) * cb.h * drawH
                             : drawH * ap.y;

    // Centro X de la focusZone (normal o espejado)
    const fzCxNormal   = fz.x + fz.w / 2;
    const fzCxMirrored = 1 - fzCxNormal;
    const fzCx = mirrored ? fzCxMirrored : fzCxNormal;

    // Centro visual del asset en el formato
    const anchorX = W * fzCx;
    let anchorY;
    if (cfg.anchorEdge === 'top') {
      // Borde superior del CONTENIDO REAL pegado al borde superior de la focusZone
      const contentTopInDraw = cb ? cb.y * drawH : 0;
      anchorY = H * fz.y + drawH / 2 - contentTopInDraw;
    } else {
      const fzCy = fz.y + fz.h * scaleCfg.anchorFraction;
      anchorY = H * fzCy;
    }

    // Centro del asset
    // En anchorEdge:'top', anchorY ya ES el cy calculado directamente
    // En el caso normal, anchorY es el punto de anclaje en el formato y hay que deshacer el offset
    const cx = anchorX - anchorOnDrawX + drawW / 2;
    const cy = cfg.anchorEdge === 'top'
      ? anchorY
      : anchorY - anchorOnDrawY + drawH / 2;

    // Offset desde el centro del formato
    const x = cx - W / 2;
    const y = cy - H / 2;

    _setParams(formatName, layer.id, {
      x: Math.round(x),
      y: Math.round(y),
      scaleX: Math.round(scaleX * 10) / 10,
      scaleY: Math.round(scaleY * 10) / 10,
      rotation: 0,
    });
  }

  // Colocación del sujeto a partir de un RECTÁNGULO FOCAL definido por el
  // usuario (espacio normalizado de la imagen). Hace cover-fit del rect sobre
  // la focusZone del formato (no el frame completo): en formatos con texto la
  // focusZone es una sub-zona deliberada; en full-bleed ≈ {0,0,1,1}. Una regla.
  //   crop = cover (max)  ·  fit = contain (min)
  // No usa contentBounds ni heurísticas anchorEdge/fill: el encuadre del
  // usuario manda. Convención de salida idéntica a _applySubject (x,y = offset
  // del centro de la imagen respecto al centro del formato).
  function _applySubjectFocal(formatName, layer, W, H, fz, mirrored, fr, scaleMode) {
    const nw = layer.naturalWidth  || 200;
    const nh = layer.naturalHeight || 200;

    const fzWpx = W * fz.w;
    const fzHpx = H * fz.h;
    const frWpx = nw * fr.w;
    const frHpx = nh * fr.h;
    if (!(frWpx > 0) || !(frHpx > 0)) return;

    const s = (scaleMode === 'fit')
      ? Math.min(fzWpx / frWpx, fzHpx / frHpx)   // contain: se ve el rect entero
      : Math.max(fzWpx / frWpx, fzHpx / frHpx);  // cover: el rect llena la zona

    const scaleX = s * 100;
    const scaleY = s * 100;
    const drawW = nw * s;
    const drawH = nh * s;

    // Centro del rect focal dentro de la imagen dibujada (mirror voltea X).
    const frCxNorm = mirrored ? (1 - (fr.x + fr.w / 2)) : (fr.x + fr.w / 2);
    const frCyNorm = fr.y + fr.h / 2;
    // Centro de la focusZone en px del formato (mirror voltea X, igual que _applySubject).
    const zoneCx = W * (mirrored ? (1 - (fz.x + fz.w / 2)) : (fz.x + fz.w / 2));
    const zoneCy = H * (fz.y + fz.h / 2);

    // Colocar la imagen para que el centro del rect focal caiga en el centro de la zona.
    const cx = zoneCx - frCxNorm * drawW + drawW / 2;
    let   cy = zoneCy - frCyNorm * drawH + drawH / 2;

    // MARGEN SUPERIOR MÍNIMO. Cuando el recorte focal es más alto que la pieza
    // en proporción, la altura es la que manda y el recorte ENCAJA EXACTO: su
    // borde superior cae en y=0 y el sujeto queda pegado al borde. Con un
    // recorte de persona eso deja la cabeza tocando el filo.
    //
    // Se corrige BAJANDO la imagen, no reescalándola: reescalar tiraría por la
    // borda la precisión del encuadre que el diseñador eligió a mano.
    //
    // Y es un MÍNIMO GARANTIZADO, no un desplazamiento fijo: donde ya sobra
    // aire arriba no se toca nada. Aplicarlo siempre habría movido sin motivo
    // los formatos que ya estaban bien.
    //
    // Un formato puede rebajarlo o anularlo con `margenSuperiorMin` (fracción
    // del alto; 0 = sin mínimo). Hace falta donde el diseño pide la imagen
    // CENTRADA de verdad y el alto dibujado casi llena la pieza: ahí la regla
    // y la petición se contradicen, y manda la petición explícita del formato.
    const _cfgMargen = FORMAT_CONFIG[formatName]?.margenSuperiorMin;
    const margenMin = H * (_cfgMargen !== undefined ? _cfgMargen : MARGEN_SUPERIOR_MIN);
    const bordeArriba = cy - drawH / 2;
    if (bordeArriba < margenMin) cy += margenMin - bordeArriba;

    _setParams(formatName, layer.id, {
      x: Math.round(cx - W / 2),
      y: Math.round(cy - H / 2),
      scaleX: Math.round(scaleX * 10) / 10,
      scaleY: Math.round(scaleY * 10) / 10,
      rotation: 0,
    });
  }

  function _applyTitle(formatName, layer, W, H, cfg, mirrored, textZone) {
    const srcFormat = State.formatSizes['MUX4 TXT'];
    const nw = (layer.naturalWidth  > 0 ? layer.naturalWidth  : null) || srcFormat?.w || W * 0.40;
    const nh = (layer.naturalHeight > 0 ? layer.naturalHeight : null) || srcFormat?.h || H * 0.50;
    const tz = textZone || cfg.textZone;
    const cb = layer.contentBounds; // bounding box real del contenido opaco

    // Si hay contentBounds, usar las dimensiones reales del contenido para el fit
    const fitW = cb ? nw * cb.w : nw;
    const fitH = cb ? nh * cb.h : nh;

    const tzX = mirrored ? 1 - tz.x - tz.w : tz.x;
    const zoneW = W * tz.w;
    const zoneH = H * tz.h;
    const zoneX = W * tzX;
    const zoneY = H * tz.y;

    // ESCALA FIJA vs ENCAJE.
    //
    // Por defecto el título se ENCAJA en la zona: crece hasta tocar uno de sus
    // bordes. Eso hace que cada título salga de un tamaño distinto según su
    // forma, lo cual vale cuando la zona es un hueco físico que no se puede
    // invadir (una banda de seguridad, por ejemplo).
    //
    // Pero la composición de texto es un lienzo FIJO (1920x779) donde el
    // diseñador ya ha compuesto el título a su gusto. Para esos casos interesa
    // lo contrario: una escala constante, para que el título mida igual en
    // todas las campañas. Eso es `tz.scale` (en %), y entonces la zona solo
    // sirve de referencia de POSICIÓN, no de tamaño.
    const scale = tz.scale != null
      ? tz.scale / 100
      : Math.min(zoneW / fitW, zoneH / fitH);

    const drawW = nw * scale;
    const drawH = nh * scale;

    // Centro del contenido real dentro del asset escalado
    const contentCxInDraw = cb ? (cb.x + cb.w / 2) * drawW : drawW / 2;
    const contentCyInDraw = cb ? (cb.y + cb.h / 2) * drawH : drawH / 2;

    // Colocar el CONTENIDO REAL en la zona (no el bounding box).
    //
    // Por defecto se CENTRA, que es lo que quieren casi todos los formatos.
    // Pero centrar solo deja el borde inferior en su sitio si la zona tiene
    // exactamente la proporción del texto: en cuanto manda el ancho, en
    // vertical sobra holgura y el título queda flotando dentro de la zona.
    // Eso se nota cuando el diseñador pide "pegado justo encima del área de
    // seguridad": con centrado solo acierta por casualidad, y cambia con cada
    // título porque cada uno tiene su propia proporción.
    //
    // `align` en la textZone permite fijar el borde en vez del centro:
    //   'bottom' → el último píxel del texto toca el borde inferior de la zona
    //   'top'    → el primero toca el superior
    //   (ausente)→ centrado, comportamiento de siempre
    // `align` (vertical) y `alignH` (horizontal) fijan un BORDE en vez del
    // centro. Sin ellos se centra, que es el comportamiento de siempre.
    //   align : 'bottom' | 'top'    alignH: 'left' | 'right'
    // Igual que en vertical, centrar en horizontal solo deja el borde en su
    // sitio si la zona tiene justo el ancho del texto; en cuanto sobra espacio
    // el título flota y deja de arrancar donde el diseñador quería.
    // Con `mirrored` los bordes se intercambian, para que las variantes
    // espejadas no haya que escribirlas al revés a mano.
    const alignV = tz.align;
    let alignH = tz.alignH;
    if (mirrored) alignH = alignH === 'left' ? 'right' : alignH === 'right' ? 'left' : alignH;
    const contentW = cb ? cb.w * drawW : drawW;
    const contentH = cb ? cb.h * drawH : drawH;
    const contentDrawX =
        alignH === 'left'  ? zoneX + contentW / 2
      : alignH === 'right' ? zoneX + zoneW - contentW / 2
      :                      zoneX + zoneW / 2;
    const contentDrawY =
        alignV === 'bottom' ? zoneY + zoneH - contentH / 2
      : alignV === 'top'    ? zoneY + contentH / 2
      :                       zoneY + zoneH / 2;

    // Centro del bounding box del asset = contentDrawX/Y - offset del contenido dentro del asset
    const cx = contentDrawX - contentCxInDraw + drawW / 2;
    const cy = contentDrawY - contentCyInDraw + drawH / 2;

    const x = cx - W / 2;
    const y = cy - H / 2;

    const scaleX = (drawW / nw) * 100;
    const scaleY = (drawH / nh) * 100;

    _setParams(formatName, layer.id, {
      x: Math.round(x),
      y: Math.round(y),
      scaleX: Math.round(scaleX * 10) / 10,
      scaleY: Math.round(scaleY * 10) / 10,
      rotation: 0,
    });
  }

  // ── MEDIAPIPE FACE LANDMARKER (lazy load para PERFIL) ────
  // Una sola promesa compartida para todas las llamadas concurrentes — si la
  // carga falla, la promesa resuelve a null en lugar de quedar colgada.
  let _faceLandmarker        = null;
  let _faceLandmarkerPromise = null;

  async function _loadFaceLandmarker() {
    if (_faceLandmarker) return _faceLandmarker;
    if (_faceLandmarkerPromise) return _faceLandmarkerPromise;

    _faceLandmarkerPromise = (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('/assets/js/mediapipe/vision_bundle.mjs');
        const vision = await FilesetResolver.forVisionTasks('/assets/js/mediapipe/wasm/');
        _faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/assets/js/mediapipe/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numFaces: 1,
        });
        return _faceLandmarker;
      } catch (e) {
        console.warn('[AutoLayout] MediaPipe no disponible, usando anchorPoint por defecto', e);
        // Reset de la promesa para permitir reintento en una próxima invocación
        _faceLandmarkerPromise = null;
        return null;
      }
    })();

    return _faceLandmarkerPromise;
  }

  // Línea de ojos target en PERFIL (fracción del alto del formato)
  // maskCircle: { cx:0, cy:26, r:195 }, formato 425×479
  // Línea azul superior ≈ cy - r*0.55 desde centro = 26 - 107 = -81 → y = 479/2 - 81 = 159 → 159/479
  const _PERFIL_EYE_TARGET_Y = 159 / 479; // ≈ 0.332

  async function _applyPerfil(layers) {
    const formatName = 'PERFIL';
    const fmtSize = State.formatSizes[formatName];
    if (!fmtSize) return;
    const W = fmtSize.w; // 425
    const H = fmtSize.h; // 479

    // Buscar capa de sujeto
    const roles = State.layerRoles || {};
    const subjectLayer = layers.find(l => roles[l.id] === 'subject');
    if (!subjectLayer) return;

    const nw = subjectLayer.naturalWidth  || W;
    const nh = subjectLayer.naturalHeight || H;

    // ── 1. Detectar ojos con MediaPipe ───────────────────────
    let eyeYFraction = 0.25; // fallback: 25% desde arriba del asset
    try {
      const lm = await _loadFaceLandmarker();
      if (lm && subjectLayer.src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res; img.onerror = rej;
          img.src = subjectLayer.src;
        });
        const result = lm.detect(img);
        if (result?.faceLandmarks?.[0]) {
          const lms = result.faceLandmarks[0];
          // Landmarks de ojos: 159 (ojo izq superior) y 386 (ojo der superior)
          const eyeY = (lms[159].y + lms[386].y) / 2;
          // Guardar contra valores degenerados — un eyeY ≈ 0 daría drawH = Infinity
          // y reventaría el cálculo posterior.
          if (Number.isFinite(eyeY) && eyeY > 0.02) {
            eyeYFraction = eyeY;
          } else {
            console.warn('[AutoLayout] PERFIL ojos en posición inválida, usando fallback');
          }
        }
      }
    } catch (e) {
      console.warn('[AutoLayout] PERFIL detección de ojos fallida, usando fallback', e);
    }

    // Clamp de seguridad — incluso si por alguna razón el valor llega corrupto,
    // no permitimos divisiones que produzcan Infinity/NaN.
    eyeYFraction = Math.max(0.05, Math.min(0.95, eyeYFraction));

    // ── 2. Calcular escala para que los ojos queden en target ─
    // eyeYFraction * drawH = _PERFIL_EYE_TARGET_Y * H
    // drawH = (_PERFIL_EYE_TARGET_Y * H) / eyeYFraction
    const targetEyePx = _PERFIL_EYE_TARGET_Y * H;
    const drawH = targetEyePx / eyeYFraction;
    // No permitir que la imagen se corte por arriba (borde superior del asset ≥ 0)
    // cy = drawH/2 → top = 0 - drawH/2 → siempre ok porque centramos verticalmente
    const drawW = (nw / nh) * drawH;
    const scaleX = (drawW / nw) * 100;
    const scaleY = (drawH / nh) * 100;

    // ── 3. Centrar horizontalmente, alinear ojos verticalmente ─
    const cx = W / 2;
    const cy = targetEyePx - eyeYFraction * drawH + drawH / 2;
    const x  = Math.round(cx - W / 2);
    const y  = Math.round(cy - H / 2);

    _setParams(formatName, subjectLayer.id, {
      x, y,
      scaleX: Math.round(scaleX * 10) / 10,
      scaleY: Math.round(scaleY * 10) / 10,
      rotation: 0,
    });

    // ── 4. Asignar máscara circular al sujeto original ────────
    if (!State.formatMaskEnabled[formatName]) State.formatMaskEnabled[formatName] = {};
    State.formatMaskEnabled[formatName][subjectLayer.id] = 'circle';

    // Enmascarar fondo como circle también si existe
    const bgLayer = layers.find(l => roles[l.id] === 'background');
    if (bgLayer) {
      State.formatMaskEnabled[formatName][bgLayer.id] = 'circle';
    }

    // ── 5. Duplicar capa y asignar máscara rectangular ────────
    // Evitar duplicar si ya existe una capa _SIL para este sujeto
    const silName = subjectLayer.name + '_SIL';
    const existingSil = State.layers.find(l => l.name === silName);
    let silLayer;
    if (existingSil) {
      silLayer = existingSil;
    } else {
      silLayer = {
        ...subjectLayer,
        id:   'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name: silName,
        exclusiveFormat: 'PERFIL',
      };
      if (subjectLayer.params)  silLayer.params  = { ...subjectLayer.params };
      const idx = State.layers.findIndex(l => l.id === subjectLayer.id);
      State.layers.splice(idx, 0, silLayer);
      // Copiar formatParams a la capa SIL
      Object.keys(State.formatParams).forEach(fid => {
        if (State.formatParams[fid][subjectLayer.id])
          State.formatParams[fid][silLayer.id] = { ...State.formatParams[fid][subjectLayer.id] };
      });
    }

    // Mismos parámetros de posición que el original
    _setParams(formatName, silLayer.id, { x, y,
      scaleX: Math.round(scaleX * 10) / 10,
      scaleY: Math.round(scaleY * 10) / 10,
      rotation: 0,
    });
    State.formatMaskEnabled[formatName][silLayer.id] = 'rect';

    // ── 6. Enlazar las dos capas ──────────────────────────────
    Formats.linkLayers([subjectLayer.id, silLayer.id]);

    // ── 7. Renderizar ─────────────────────────────────────────
    if (typeof Canvas  !== 'undefined') Canvas.render();
    if (typeof Layers  !== 'undefined') Layers.render();
  }

  function _setParams(formatName, layerId, params) {
    if (!State.formatParams[formatName]) State.formatParams[formatName] = {};
    if (!State.formatParams[formatName][layerId]) State.formatParams[formatName][layerId] = {};
    Object.assign(State.formatParams[formatName][layerId], params);
    // Modelo "semilla única, luego independiente": las máscaras NO auto-siguen a
    // su cliente. Una vez sembradas (Formats.syncMaskAcrossFormats), cada formato
    // mantiene su máscara tal cual; el usuario la reajusta a mano donde quiera.
  }

  // ── MOD N ─────────────────────────────────────────────────
  // Formato 386×217 con layout custom: fondo sólido + 4 degradados radiales +
  // 1 lineal + sujeto + duplicado blur + título texto + logo coleccionM SVG.
  async function _applyModN(layers) {
    const formatName = 'MOD N';
    const fmtSize = State.formatSizes[formatName];
    if (!fmtSize) return;

    const roles = State.layerRoles || {};
    const subjectLayer = layers.find(l => roles[l.id] === 'subject');
    if (!subjectLayer) return;

    if (!State.formatParams[formatName]) State.formatParams[formatName] = {};

    // Crear capas auto-generadas (idempotente — respeta las que ya existan)
    const gen = await _ensureModNLayers(subjectLayer);

    // Posicionar sujeto (fijo)
    _setParams(formatName, subjectLayer.id, {
      x: 103, y: 126, scaleX: 40, scaleY: 40, rotation: 0,
    });

    // Posicionar IMAGEN BLUR (fijo)
    _setParams(formatName, gen.blur.id, {
      x: 109, y: 277, scaleX: 76, scaleY: 76, rotation: 0,
    });

    // Ocultar en MOD N: FONDO, composiciones y PNG título importado
    State.layers.forEach(l => {
      if (l.id === subjectLayer.id) return;
      if (l.exclusiveFormat === formatName) return;
      if (l.exclusiveFormat && l.exclusiveFormat !== formatName) return;
      if (l.isComposicion || l.isComposicionMovil  ||
          l.isTitleLayer || roles[l.id] === 'background') {
        _setParams(formatName, l.id, { visible: false });
      }
    });

    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof Layers !== 'undefined') Layers.render();
  }

  async function _ensureModNLayers(subjectLayer) {
    const fmt = 'MOD N';
    const W = 386, H = 217;
    const findByName = (name) => State.layers.find(l => l.name === name && l.exclusiveFormat === fmt);
    const mkId = (n) => 'layer_modn_' + Date.now() + '_' + n + '_' + Math.random().toString(36).slice(2);
    const bp = () => ({ opacity:100, blur:0, noise:0, brightness:0, contrast:0, saturation:0, tintAmount:0, tintColor:'#000000' });
    const result = {};

    // TÍTULO (texto editable)
    let titulo = findByName('TÍTULO');
    if (!titulo) {
      titulo = {
        id: mkId('titulo'), name: 'TÍTULO', type: 'text', visible: true,
        exclusiveFormat: fmt, naturalWidth: 192, naturalHeight: 107, params: bp(),
        textParams: {
          size: 36, align: 'left', leading: 95, tracking: 0,
          runs: [{ family:'Apercu Movistar', weight:'900', style:'normal', color:'#ffffff', text:'Título con\n2 o 3 líneas\nmáximo' }]
        },
      };
      _setParams(fmt, titulo.id, { x:-163, y:12, scaleX:100, scaleY:100, rotation:0 });
    }
    result.titulo = titulo;

    // coleccionM (SVG Colección M+)
    let coleccion = findByName('coleccionM');
    if (!coleccion) {
      const COLECCION_SVG = 'assets/img/coleccionM.svg';
      const svg = await _loadSvgAsDataUrl(COLECCION_SVG);
      coleccion = {
        id: mkId('coleccion'), name: 'coleccionM', type: 'image', visible: true,
        // systemPath: este asset es de la PROPIA herramienta, no del usuario.
        // Al guardar el proyecto se referencia por ruta en vez de copiarse a
        // imagenes/, igual que los logos (ver _serializeState en project.js).
        // En memoria sí va como dataURL, que es lo que el lienzo necesita.
        exclusiveFormat: fmt, src: svg.dataUrl, systemPath: COLECCION_SVG,
        naturalWidth: svg.naturalWidth, naturalHeight: svg.naturalHeight, params: bp(),
      };
      _setParams(fmt, coleccion.id, { x:-94, y:-67, scaleX:44, scaleY:44, rotation:0 });
    }
    result.coleccion = coleccion;

    // Degradados
    const gradSpecs = [
      ['DEG. INFERIOR', { type:'linear', angle:0,  color1:'#7b3a0e', alpha1:100, color2:'#7b3a0e', alpha2:0, cx:50,     cy:50,     radius:100 }],
      ['DEG 1',         { type:'radial', angle:90, color1:'#e70d2e', alpha1:100, color2:'#e70d2e', alpha2:0, cx:-13.47, cy:-24.88, radius:56  }],
      ['DEG CENTRAL',   { type:'radial', angle:90, color1:'#fff700', alpha1:100, color2:'#fff700', alpha2:0, cx:76.68,  cy:39.17,  radius:33  }],
      ['DEG 2',         { type:'radial', angle:90, color1:'#e70d2e', alpha1:100, color2:'#e70d2e', alpha2:0, cx:110.62, cy:51.15,  radius:56  }],
      ['DEG 3',         { type:'radial', angle:90, color1:'#7b3a0e', alpha1:100, color2:'#7b3a0e', alpha2:0, cx:8.29,   cy:83.41,  radius:100 }],
    ];
    const grads = {};
    gradSpecs.forEach(([name, gp]) => {
      let layer = findByName(name);
      if (!layer) {
        const baseParams = bp();
        if (name === 'DEG. INFERIOR') baseParams.opacity = 70;
        layer = {
          id: mkId(name.replace(/[^a-zA-Z0-9]/g,'')), name, type: 'gradient', visible: true,
          exclusiveFormat: fmt, naturalWidth: W, naturalHeight: H, params: baseParams,
          gradientParams: { ...gp },
        };
        _setParams(fmt, layer.id, { x:0, y:0, scaleX:100, scaleY:100, rotation:0 });
      }
      grads[name] = layer;
    });

    // SOLIDO (fondo)
    let solido = findByName('SOLIDO');
    if (!solido) {
      solido = {
        id: mkId('solido'), name: 'SOLIDO', type: 'solid', visible: true,
        exclusiveFormat: fmt, naturalWidth: W, naturalHeight: H, params: bp(),
        solidParams: { color:'#a27b11', width:W, height:H, radius:0 },
      };
      _setParams(fmt, solido.id, { x:0, y:0, scaleX:100, scaleY:100, rotation:0 });
    }
    result.solido = solido;
    result.degInferior = grads['DEG. INFERIOR'];
    result.deg1        = grads['DEG 1'];
    result.degCentral  = grads['DEG CENTRAL'];
    result.deg2        = grads['DEG 2'];
    result.deg3        = grads['DEG 3'];

    // IMAGEN BLUR (duplicado del sujeto con blur+opacity)
    let blur = State.layers.find(l => l.name === 'IMAGEN BLUR' && l.exclusiveFormat === fmt);
    if (!blur) {
      blur = {
        ...subjectLayer,
        id: mkId('blur'),
        name: 'IMAGEN BLUR',
        exclusiveFormat: fmt,
        params: { ...bp(), ...(subjectLayer.params||{}), blur:8, opacity:50 },
      };
    } else {
      // Mantener el blur en sync con el sujeto (por si cambió el src)
      blur.src = subjectLayer.src;
      blur.naturalWidth  = subjectLayer.naturalWidth;
      blur.naturalHeight = subjectLayer.naturalHeight;
    }
    result.blur = blur;

    // Orden en el array: coleccionM, TÍTULO, DEG. INFERIOR, [sujeto], IMAGEN BLUR, DEG 1, DEG CENTRAL, DEG 2, DEG 3, SOLIDO
    const newlyManaged = [result.coleccion, result.titulo, result.degInferior, result.blur, result.deg1, result.degCentral, result.deg2, result.deg3, result.solido];
    const managedIds = new Set(newlyManaged.map(l => l.id));
    State.layers = State.layers.filter(l => !managedIds.has(l.id));
    const sIdx = State.layers.indexOf(subjectLayer);
    if (sIdx < 0) {
      State.layers.push(...newlyManaged);
    } else {
      const front = [result.coleccion, result.titulo, result.degInferior];
      State.layers.splice(sIdx, 0, ...front);
      const sIdx2 = State.layers.indexOf(subjectLayer);
      const back  = [result.blur, result.deg1, result.degCentral, result.deg2, result.deg3, result.solido];
      State.layers.splice(sIdx2 + 1, 0, ...back);
    }

    return result;
  }

  // Carga un SVG y lo devuelve como dataURL SVG (mantiene calidad vectorial).
  // No lo rasteriza a PNG — el canvas lo escalará en cada render a la resolución
  // destino, por lo que se ve nítido en cualquier tamaño.
  async function _loadSvgAsDataUrl(url) {
    const res = await fetch(url);
    const text = await res.text();
    const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(text);
    // Medir dimensiones naturales cargando el SVG como Image
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 300, h: img.naturalHeight || 40 });
      img.onerror = () => resolve({ w: 300, h: 40 });
      img.src = dataUrl;
    });
    return { dataUrl, naturalWidth: dims.w, naturalHeight: dims.h };
  }

  // ── API PÚBLICA ───────────────────────────────────────────

  // Un asset CON ROL es del proyecto entero, no del formato donde se soltó.
  //
  // Al importar estando en un formato anfitrión de texto (COM TITULO H, TEXTO
  // HORIZONTAL…) la capa se marca `exclusiveFormat` de ese formato — ver
  // layers.js. Eso es correcto para lo que añades DENTRO del maestro (una
  // textura para la composición: rol NINGUNO), pero no para un fondo o un
  // título: quedarían clavados en el taller e invisibles en los 50 formatos,
  // y además se guarda en el proyecto, así que el fallo sobrevive al reabrir.
  // El usuario siempre puede volver a fijarla a mano (menú contextual de la capa).
  function _liberarExclusividadPorRol(layers, roles) {
    layers.forEach(l => { if (roles[l.id]) l.exclusiveFormat = null; });
  }

  // El rol ELEGIDO manda sobre la adivinanza por nombre de archivo.
  //
  // Al importar, layers.js marca isTitleLayer con /titulo|title|texto|text/i.
  // Eso convierte en título cualquier "fondo_textura_ciudad.jpg" — basta que el
  // nombre lleve "text" dentro — y los títulos se ocultan en los 50 formatos
  // reales (ver _isLayerVisible: solo se ven en los formatos de texto). El
  // resultado es un fondo que se importa, recibe su rol, se maqueta… y no se ve
  // en ninguna parte.
  // La modal solo sabía PROMOCIONAR a título, nunca degradar, así que el falso
  // positivo era irreversible desde la interfaz. Si el usuario (o el asistente
  // de PSD, que ofrece los dos roles de título) dice que esa imagen es un fondo,
  // deja de ser un título. Devuelve true si hubo que degradar alguna, para
  // regenerar las composiciones que se hubieran construido con ella.
  function _degradarFalsosTitulos(layers, roles) {
    let degradado = false;
    layers.forEach(l => {
      const r = roles[l.id];
      if (r === 'title_h' || r === 'title_v' || !l.isTitleLayer) return;
      l.isTitleLayer = l.isTitleLayerH = l.isTitleLayerV = false;
      degradado = true;
    });
    return degradado;
  }

  // Llamado al importar imágenes por primera vez.
  // `preRoles` (opcional) salta el modal de roles — ver showRoleModal.
  function onFirstImport(layers, preRoles) {
    if (_rolesAssigned) return;
    showRoleModal(layers, async roles => {
      // Guardar roles en State
      if (!State.layerRoles) State.layerRoles = {};
      Object.assign(State.layerRoles, roles);
      _liberarExclusividadPorRol(layers, roles);
      const _degradado = _degradarFalsosTitulos(layers, roles);

      // Solo la PRIMERA imagen con rol FANART cuenta; las demás pasan a imagen normal (sin rol)
      const _fanarts = layers.filter(l => roles[l.id] === 'fanart');
      _fanarts.slice(1).forEach(l => { roles[l.id] = null; State.layerRoles[l.id] = null; });

      _rolesAssigned = true;

      // Si el usuario marca una capa con rol 'title' desde el modal, la
      // promovemos a capa de título "real": isTitleLayer=true (para que sea
      // visible en MUX4 TXT / MOVIL TXT / TÍTULO FICHA y la encuentre
      // _applyTitle en formatos como 199 PUBLI) y aplicamos las TITLE_FIT_ZONES
      // — la misma lógica que se ejecuta cuando el upload detecta título por
      // nombre de archivo.
      let promotedTitle = false;
      layers.forEach(layer => {
        const r = roles[layer.id];
        if (r !== 'title_h' && r !== 'title_v') return;
        // Flag de orientación SIEMPRE (puede ya ser isTitleLayer por nombre)
        if (r === 'title_h') layer.isTitleLayerH = true;
        if (r === 'title_v') layer.isTitleLayerV = true;
        // Marcar como "hay título" SIEMPRE → fuerza regenerar composiciones y posicionar
        // en formatos receptores (199, MUX4 FONDO, etc.).
        promotedTitle = true;
        if (!layer.isTitleLayer) {
          layer.isTitleLayer = true;
          if (typeof Layers !== 'undefined' && Layers.applyTitleFitZones) {
            Layers.applyTitleFitZones(layer);
          }
        }
      });

      if (typeof History !== 'undefined') History.push();

      // Regenerar composiciones ANTES de applyToFormat: los formatos que usan
      // COMPOSICIÓN TÍTULO (199 PUBLI, AD PAUSE, etc. — los que no son
      // useTitleLayer) buscan `l.isComposicion` para aplicarle textZone. Si la
      // composición todavía no existe, _applyTitle no encuentra nada y la capa
      // queda en el centro hasta que se reposiciona manualmente.
      // `_degradado`: una capa dejó de ser título, así que las composiciones que
      // se generaron con ella al importarla ya no valen y hay que rehacerlas.
      if (promotedTitle || _degradado) {
        // Limpiar overrides del lápiz: al asignar título por primera vez no queremos
        // que se mantengan elecciones manuales viejas (de sesiones previas o pruebas).
        if (promotedTitle) State.formatTextVariant = {};

        if (typeof Composicion       !== 'undefined') await Composicion.generate();
        if (typeof ComposicionMovil  !== 'undefined') await ComposicionMovil.generate();
        // Generar TAMBIÉN las composiciones de texto H/V para que aparezcan en los
        // formatos receptores (199 PUBLI, etc.) sin tener que visitar el maestro.
        if (typeof ComposicionTexto !== 'undefined') {
          await ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH');
          await ComposicionTexto.generate('TEXTO VERTICAL',   'COMPOSICIÓN TEXTO VERTICAL',   'isComposicionTextoV');
          await ComposicionTexto.generate('COM TITULO H',    'COMPOSICIÓN COM TITULO H',    'isComposicionComTituloH');
          await ComposicionTexto.generate('COM TITULO H',    'COMPOSICIÓN COM TITULO H',    'isComposicionComTituloH');
        }
      }

      // Maquetación a todos los formatos + post-pasos. Se extrae a una
      // continuación para poder intercalar ANTES el encuadre focal del sujeto.
      const runLayoutLoop = () => {
        // Aplicar maquetación a todos los formatos configurados
        Object.keys(FORMAT_CONFIG).forEach(formatName => {
          applyToFormat(formatName, roles, layers);
        });

        // Reposicionar las composiciones H/V en sus formatos receptores
        if (promotedTitle) {
          const compH = State.layers.find(l => l.isComposicionTextoH);
          const compV = State.layers.find(l => l.isComposicionTextoV);
          if (compH) repositionTextComp(compH, 'H');
          if (compV) repositionTextComp(compV, 'V');
          // También las imágenes de título crudas, para los formatos con variante TITLE_H/V
          const titleH = State.layers.find(l => l.isTitleLayerH);
          const titleV = State.layers.find(l => l.isTitleLayerV);
          if (titleH) repositionTextComp(titleH, 'TITLE_H');
          if (titleV) repositionTextComp(titleV, 'TITLE_V');
        }

        // Ordenar capas por rol: TÍTULO arriba → SUJETO/NINGUNO → FONDO → FANART abajo.
        // Las capas de sistema mantienen su posición al principio del array.
        _reorderByRole();

        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof Layers !== 'undefined') Layers.render();
        // La rejilla de formatos puede cambiar: al entrar una IMAGEN BIG se
        // ocultan los formatos que no se pueden producir con ella (SIL,
        // PERFIL, MOD N). Ver Formats.isBigMode().
        if (typeof Formats !== 'undefined' && Formats.refreshGrid) Formats.refreshGrid();
      };

      // Encuadre focal: si hay EXACTAMENTE un sujeto, abrir el encuadre por
      // bandas ANTES de maquetar; al pulsar "Hecho" se ejecuta runLayoutLoop
      // (que ya usará los rectángulos focales). Si no, maquetar directo.
      const _subjects = layers.filter(l => roles[l.id] === 'subject');
      if (_subjects.length === 1 && typeof FocalFrames !== 'undefined') {
        FocalFrames.open(_subjects[0].id, runLayoutLoop);
      } else {
        runLayoutLoop();
      }
    }, preRoles);
  }

  // Importaciones POSTERIORES: muestra el modal de roles SOLO con las imágenes nuevas
  // (roles pre-detectados por nombre; el usuario confirma o cambia). Tras cerrar, aplica
  // roles, regenera composiciones si hay nuevo título, re-maqueta y reordena.
  // `preRoles` (opcional) salta el modal de roles — ver showRoleModal.
  function onAdditionalImport(newLayers, preRoles) {
    if (!newLayers || newLayers.length === 0) return;
    showRoleModal(newLayers, async roles => {
      if (!State.layerRoles) State.layerRoles = {};
      Object.assign(State.layerRoles, roles);
      _liberarExclusividadPorRol(newLayers, roles);
      const _degradado = _degradarFalsosTitulos(newLayers, roles);

      // Solo la 1ª FANART cuenta; si ya hay un fanart previo, ninguna nueva sobrevive como tal
      const prevFanart = State.layers.find(l =>
        !newLayers.includes(l) && State.layerRoles[l.id] === 'fanart');
      const newFanarts = newLayers.filter(l => roles[l.id] === 'fanart');
      const keepFirstNew = !prevFanart;
      newFanarts.forEach((l, i) => {
        if (!(keepFirstNew && i === 0)) { roles[l.id] = null; State.layerRoles[l.id] = null; }
      });

      // Promocionar a isTitleLayer si el usuario marcó alguna como 'title_h' o 'title_v'
      let promotedTitle = false;
      newLayers.forEach(layer => {
        const r = roles[layer.id];
        if (r !== 'title_h' && r !== 'title_v') return;
        // Flag de orientación SIEMPRE
        if (r === 'title_h') layer.isTitleLayerH = true;
        if (r === 'title_v') layer.isTitleLayerV = true;
        // Marcar SIEMPRE para regenerar composiciones / re-maquetar
        promotedTitle = true;
        if (!layer.isTitleLayer) {
          layer.isTitleLayer = true;
          if (typeof Layers !== 'undefined' && Layers.applyTitleFitZones) {
            Layers.applyTitleFitZones(layer);
          }
        }
      });

      if (typeof History !== 'undefined') History.push();

      // Si hay nuevo título —o una capa dejó de serlo— regenerar composiciones
      if (promotedTitle || _degradado) {
        if (typeof Composicion       !== 'undefined') await Composicion.generate();
        if (typeof ComposicionMovil  !== 'undefined') await ComposicionMovil.generate();
        if (typeof ComposicionTexto  !== 'undefined') {
          await ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH');
          await ComposicionTexto.generate('TEXTO VERTICAL',   'COMPOSICIÓN TEXTO VERTICAL',   'isComposicionTextoV');
        }
      }

      // Re-aplicar maquetación.
      // - Si la importación incluye un NUEVO TÍTULO (`promotedTitle`), la
      //   composición global cambia y tiene sentido re-maquetar TODAS las
      //   capas en TODOS los formatos.
      // - Si NO hay título nuevo (caso típico: el usuario añade una foto
      //   suelta como capa decorativa, fondo, sujeto…), respetamos la
      //   maquetación manual del proyecto y solo posicionamos LAS NUEVAS
      //   CAPAS. Sin esto, importar una imagen sin rol relevante reseteaba
      //   el ajuste manual que el usuario tenía en cada formato.
      const allImageLayers = State.layers.filter(l =>
        !['text','solid','gradient'].includes(l.type) &&
        !esComposicionAuto(l) &&
        l.src
      );
      const layersToApply = promotedTitle ? allImageLayers : newLayers;
      const runLayoutLoop = () => {
        Object.keys(FORMAT_CONFIG).forEach(formatName => {
          applyToFormat(formatName, State.layerRoles, layersToApply);
        });

        // Reposicionar composiciones H/V e imágenes de título crudas en sus receptores
        if (promotedTitle) {
          const compH = State.layers.find(l => l.isComposicionTextoH);
          const compV = State.layers.find(l => l.isComposicionTextoV);
          if (compH) repositionTextComp(compH, 'H');
          if (compV) repositionTextComp(compV, 'V');
          const titleH = State.layers.find(l => l.isTitleLayerH);
          const titleV = State.layers.find(l => l.isTitleLayerV);
          if (titleH) repositionTextComp(titleH, 'TITLE_H');
          if (titleV) repositionTextComp(titleV, 'TITLE_V');
        }

        _reorderByRole();

        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof Layers !== 'undefined') Layers.render();
        // La rejilla de formatos puede cambiar: al entrar una IMAGEN BIG se
        // ocultan los formatos que no se pueden producir con ella (SIL,
        // PERFIL, MOD N). Ver Formats.isBigMode().
        if (typeof Formats !== 'undefined' && Formats.refreshGrid) Formats.refreshGrid();
      };

      // Encuadre focal solo si llega un SUJETO NUEVO sin frames (no reabrir al
      // añadir fondos/títulos a un proyecto cuyo sujeto ya está encuadrado).
      const _newSubjToFrame = (typeof FocalFrames !== 'undefined')
        ? newLayers.find(l => roles[l.id] === 'subject' && !FocalFrames.hasAnyFrame(l.id))
        : null;
      if (_newSubjToFrame) {
        FocalFrames.open(_newSubjToFrame.id, runLayoutLoop);
      } else {
        runLayoutLoop();
      }
    }, preRoles);
  }

  // Reordena State.layers según jerarquía de rol. Índice 0 = arriba (z-index alto).
  // Sistema → Título → Sujetos/Sin rol → Fondos → Fanart.
  // Dentro de cada grupo se mantiene el orden actual (= orden de importación).
  function _reorderByRole() {
    const isSystemLayer = l =>
      esComposicionAuto(l) ||
      l.isMolduraFanart || l.isMascaraBlur;

    const sys      = [];
    const title    = [];
    const subjects = [];   // rol 'subject' o sin rol asignado
    const bg       = [];
    const fanart   = [];

    State.layers.forEach(l => {
      if (isSystemLayer(l))          { sys.push(l);    return; }
      if (l.isTitleLayer)            { title.push(l);  return; }
      const role = State.layerRoles?.[l.id];
      if (role === 'fanart')         { fanart.push(l); return; }
      // IMAGEN BIG va al grupo de fondos: es la creatividad completa, así que
      // debe quedar DEBAJO de todo lo que se le añada encima (títulos, logos…).
      if (role === 'background' ||
          role === 'imagen_big')     { bg.push(l);     return; }
      // 'subject', sin rol o cualquier otro → grupo "imágenes"
      subjects.push(l);
    });

    State.layers = [...sys, ...title, ...subjects, ...bg, ...fanart];
  }

  // Botón AUTO en un formato concreto — resetea a la sugerencia
  function resetFormat(formatName) {
    const roles = State.layerRoles;
    if (!roles) return;
    // El botón AUTO (y espejo/crop-fit/variante, que pasan por aquí) es la ÚNICA
    // vía para volver al encaje automático: soltamos el candado manual de las
    // composiciones de título de este formato antes de re-maquetar.
    const _fp = State.formatParams[formatName];
    if (_fp) Object.keys(_fp).forEach(lid => { if (_fp[lid]) delete _fp[lid].titleManual; });
    // Incluir isComposicion para poder posicionarla con el rol title
    const layers = State.layers.filter(l =>
      !['text', 'solid', 'gradient'].includes(l.type) &&
      !esComposicionAuto(l) &&
      l.src
    );
    if (typeof History !== 'undefined') History.push();
    applyToFormat(formatName, roles, layers);
    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  // Toggle FIT/CROP para un formato
  function toggleScaleMode(formatName) {
    if (!_scaleMode[formatName]) {
      _scaleMode[formatName] = FORMAT_CONFIG[formatName]?.scaleModeDefault || 'crop';
    }
    _scaleMode[formatName] = _scaleMode[formatName] === 'crop' ? 'fit' : 'crop';
    resetFormat(formatName);
    return _scaleMode[formatName];
  }

  // Toggle espejo para un formato
  function toggleMirror(formatName) {
    _mirrored[formatName] = !_mirrored[formatName];
    resetFormat(formatName);
    return _mirrored[formatName];
  }

  function getScaleMode(formatName) {
    return _scaleMode[formatName] || FORMAT_CONFIG[formatName]?.scaleModeDefault || 'crop';
  }

  function getMirrored(formatName) {
    return !!_mirrored[formatName];
  }

  function setVariant(formatName, variantKey) {
    _variant[formatName] = variantKey;
    resetFormat(formatName);
  }

  function getVariant(formatName) {
    return _variant[formatName] || 'A';
  }

  function getVariants(formatName) {
    return FORMAT_CONFIG[formatName]?.variants || null;
  }

  function hasConfig(formatName) {
    return !!FORMAT_CONFIG[formatName];
  }

  function resetSession() {
    _rolesAssigned = false;
  }

  // ── DEBUG: dump del formato activo ────────────────────────
  // Uso desde consola: AutoLayout.dump()  →  imprime JSON con todas las
  // capas visibles del formato actual y sus parámetros (posición, escala,
  // rotación, opacidad, blur, tint, color/gradient específico, etc).
  // Pensado para capturar una maquetación manual y derivar un preset.
  function dump(formatName) {
    const fmt = formatName || State.activeFormat;
    if (!fmt) { console.warn('[AutoLayout.dump] No hay formato activo'); return; }
    const size = State.formatSizes?.[fmt];
    const out = {
      format:    fmt,
      size:      size ? { w: size.w, h: size.h } : null,
      variant:   State.formatVariant?.[fmt] || null,
      scaleMode: State.formatScaleMode?.[fmt] || null,
      mirrored:  State.formatMirrored?.[fmt] || false,
      layers:    [],
    };
    State.layers.forEach((layer, idx) => {
      const fp = State.formatParams?.[fmt]?.[layer.id] || {};
      const W = size?.w || 0;
      const H = size?.h || 0;
      const item = {
        idx,
        id:       layer.id,
        name:     layer.name,
        type:     layer.type || 'image',
        visible:  fp.visible !== undefined ? fp.visible : (layer.visible !== false),
        natural:  layer.naturalWidth ? { w: layer.naturalWidth, h: layer.naturalHeight } : null,
      };
      // Posición y transform — incluyo px y fracciones
      if (fp.x !== undefined || fp.y !== undefined || fp.scaleX !== undefined) {
        item.transform = {
          x: fp.x ?? 0, y: fp.y ?? 0,
          xFrac: W ? +(((fp.x ?? 0) / W).toFixed(4)) : null,
          yFrac: H ? +(((fp.y ?? 0) / H).toFixed(4)) : null,
          scaleX:   fp.scaleX ?? 100,
          scaleY:   fp.scaleY ?? 100,
          rotation: fp.rotation ?? 0,
        };
      }
      // Efectos comunes — leer tanto formatParams como layer.params (globales)
      const fx = {};
      const lp = layer.params || {};
      ['opacity','blur','noise','brightness','contrast','saturation','tintAmount','tintColor']
        .forEach(k => {
          if (fp[k] !== undefined) fx[k] = fp[k];
          else if (lp[k] !== undefined) fx[k] = lp[k];
        });
      if (Object.keys(fx).length) item.effects = fx;
      // Parámetros específicos por tipo
      if (layer.type === 'gradient' && layer.gradientParams) {
        item.gradient = { ...layer.gradientParams };
      }
      if (layer.type === 'solid' && layer.solidParams) {
        item.solid = { ...layer.solidParams };
      }
      if (layer.type === 'text' && layer.textParams) {
        item.text = { ...layer.textParams };
      }
      // Flags útiles
      ['isTitleLayer','isComposicion','isComposicionMovil',
       'exclusiveFormat','_layoutGenerated']
        .forEach(k => { if (layer[k]) item[k] = layer[k]; });
      out.layers.push(item);
    });
    console.log('[AutoLayout.dump]', out);
    console.log(JSON.stringify(out, null, 2));
    return out;
  }

  // Reposiciona una composición de texto (H/V) en todos los formatos que la usan,
  // metiéndola en la textZone de cada uno. Se llama al (re)generar la composición.
  function repositionTextComp(comp, variant) {
    if (!comp) return;
    Object.keys(State.formatSizes || {}).forEach(formatName => {
      if (typeof Formats === 'undefined' || Formats.getTextVariant(formatName) !== variant) return;
      // Respetar el ajuste manual del diseñador: si este formato tiene la
      // composición bloqueada (titleManual), la edición del texto maestro NO la
      // re-encaja. Solo el botón AUTO (resetFormat) suelta el candado.
      if (State.formatParams?.[formatName]?.[comp.id]?.titleManual) return;
      const cfg = FORMAT_CONFIG[formatName];
      if (!cfg) return;
      const fmtSize = State.formatSizes[formatName];
      if (!fmtSize) return;
      const mirrored   = _mirrored[formatName] || false;
      const variantKey = _variant[formatName] || 'A';
      const textZone   = cfg.variants?.[variantKey]?.textZone || cfg.textZone;
      if (!textZone) return;
      _applyTitle(formatName, comp, fmtSize.w, fmtSize.h, cfg, mirrored, textZone);
    });
  }

  // ── TÍTULO DE REFERENCIA FIJO (se ve, no se toca, no se exporta) ──────────
  //
  // Formatos donde la composición de texto NO se maqueta: la web la compone por
  // su cuenta, siempre en el mismo sitio y al mismo tamaño. Adaptator la pinta
  // clavada ahí para que el diseñador vea qué zona de la imagen va a quedar
  // tapada, pero no entra en el PNG exportado. En el MOCKUP sí, que para eso
  // está. Mismo patrón que AMAZON BG.
  //
  // x/y/w describen el HUECO que ocupa el título en la pieza, en coordenadas
  // ABSOLUTAS del formato (desde la esquina, no desde el centro). La
  // composición se escala para llenar ese ancho; el alto sale solo.
  //
  // Se expresa como hueco de destino, y NO como "tamaño natural", porque el
  // asset se entrega más pequeño que el hueco: la composición mide 1156x348 y
  // el hueco 1706x514 — la MISMA forma al 67,8 %. Así, si mañana cambia el
  // tamaño de entrega, esto sigue colocándolo donde toca sin tocar nada.
  //
  // ⚠️ POR QUÉ NO SE ESCALA A UNA ALTURA FIJA (lo intenté y estaba mal):
  // la primera versión forzaba el título a 330 px de alto de píxel, sacados de
  // medir "Trigger Point" en la referencia. Pero 330 no es una regla, es una
  // CASUALIDAD de ese título: la plantilla de Photoshop aplica una ESCALA fija
  // (73,79%) a lo que haya dentro de la capa inteligente, así que un título más
  // bajo sale más bajo. Forzar 330 habría inflado un título corto tipo "IT".
  //
  // De dónde sale el HUECO (reconstruido con el diseñador el 2026-10-28; la
  // plantilla de Photoshop no está documentada en ninguna parte y al preguntar
  // por la especificación la respuesta fue "a mí me dieron la plantilla hecha"):
  //   · capa inteligente: documento 2312x696, título dentro 2300x448 pegado abajo
  //   · colocada en la plantilla al 73,79%
  //   · → hueco 1706x514  ·  título 1697x331, con su píxel en x=180, y=507
  //   · → la caja arranca en y = 838 − 513,6 = 324,0
  // Contrastado por tres vías que coinciden en 0,2 px: Properties de Photoshop,
  // medición del PNG de referencia y la derivación desde la escala.
  //
  // El tamaño de ENTREGA (1156x348) no salió de ahí: lo confirmaron después
  // mirando un pack ya exportado. La deducción acertó el hueco, no la entrega.
  // De momento VACÍA. Cabecera-Detalle-Escritorio estuvo aquí por un
  // malentendido: el pack entregado demuestra que lleva el título PLANCHADO,
  // así que se maqueta por zona como el resto y SÍ se exporta.
  //
  // Los que van aquí son los SEIS SLIDER —Cabecera Slider E/M, Cabecera Slider
  // Mediano E/M y Slider Mediano E/M—, que son los únicos que entregan el
  // título como asset suelto (cabecera-slider-tt.png).
  //
  // Las coordenadas van en píxeles del formato y desde su esquina SUPERIOR
  // IZQUIERDA, que es lo que espera tituloFijoRect. El panel de coordenadas de
  // la herramienta da otra cosa: escala en % y x/y desde el CENTRO. La
  // conversión queda escrita en cada entrada para que se pueda rehacer.
  const TITULO_FIJO = {
    // Colocado por el diseñador sobre el mockup y medido en la herramienta:
    // escala 110%, x −1150, y −200 desde el centro de una pieza de 3840×2160.
    //   w =  1156 × 1,10            = 1271,6
    //   x =  1920 − 1150 − 1271,6/2 =  134,2
    //   y =  1080 −  200 −  382,8/2 =  688,6
    // Redondeado a entero: el desvío es de 0,4 px y esta composición no se
    // exporta en la pieza, así que no hay entrega que arrastre el error.
    'Cabecera-Slider-Escritorio': { x: 134, y: 689, w: 1272 },
    // Cabecera Slider Móvil (2160×3840). Escala 100 %, x -392, y -655 desde el
    // centro, leído del panel:
    //   w = 1156 (al 100 % no se escala)
    //   x = 1080 - 392 - 1156/2 =  110
    //   y = 1920 - 655 -  348/2 = 1091
    // La caja y los píxeles del título coinciden en el borde IZQUIERDO y en el
    // INFERIOR (la composición ancla su contenido abajo-izquierda), así que
    // estos números siguen valiendo con un título más largo o más corto.
    // El mockup no tiene nada a esa altura: no hay nada con lo que alinear, la
    // colocación es decisión del diseñador.
    'Cabecera-Slider-Movil': { x: 110, y: 1091, w: 1156 },
    // Faltan los otros cuatro Slider: cada uno trae su propia medida.
  };

  function tituloFijoConfig(formatName) {
    return TITULO_FIJO[formatName] || null;
  }

  // ¿Esta capa es el título de referencia fijo de este formato?
  function esTituloFijo(formatName, layer) {
    return !!(layer && layer.isComposicionComTituloH && TITULO_FIJO[formatName]);
  }

  // Rectángulo donde dibujar la CAJA de la capa, en coordenadas del formato.
  // Devuelve null si no aplica o si faltan medidas. Lo usan canvas.js (editor)
  // y export.js (mockup) para no poder desincronizarse.
  function tituloFijoRect(formatName, layer) {
    // OJO: canvas.js llama a esto para CADA capa del formato, así que el filtro
    // de "es la composición de texto" tiene que estar aquí dentro. Sin él se
    // clavaba también la imagen del sujeto en el sitio del título.
    if (!esTituloFijo(formatName, layer)) return null;
    const cfg = TITULO_FIJO[formatName];
    const nw = layer.naturalWidth, nh = layer.naturalHeight;
    if (!(nw > 0) || !(nh > 0)) return null;

    // Se escala al ancho del hueco. El contenido va pegado abajo a la
    // izquierda dentro de la composición, así que un título alto o bajo cae
    // donde debe sin tocar nada más.
    const k = (cfg.w || nw) / nw;
    return { left: cfg.x, top: cfg.y, drawW: nw * k, drawH: nh * k };
  }

  return {
    detectRole, onFirstImport, onAdditionalImport, resetFormat,
    toggleScaleMode, toggleMirror, setVariant, getVariant, getVariants,
    getScaleMode, getMirrored, hasConfig, resetSession,
    showRoleModal, repositionTextComp, applyBigTitle,
    tituloFijoConfig, esTituloFijo, tituloFijoRect,
    dump,
  };

})();
