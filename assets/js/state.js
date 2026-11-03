// ============================================================
// STATE.JS — Modelo de datos central
// ============================================================

// ── TAXONOMÍA DE FORMATOS ANFITRIÓN ─────────────────────────
// Hay formatos que NO son una pieza a entregar, sino un lienzo donde se COMPONE
// un asset (el título, el logo) que luego viaja a los demás formatos. Se
// comportan distinto en media app, y hasta ahora la lista se escribía a mano en
// cada sitio: 24 copias repartidas por 11 archivos. Añadir uno nuevo obligaba a
// encontrarlas todas, y olvidar una NO da error — da un fallo silencioso (que no
// funcionen los degradados ahí, o que no se exporte).
//
// OJO: no son la misma lista. Son tres círculos concéntricos, y mezclarlos
// rompe cosas. De fuera adentro:

// LOS 6 — lienzos de composición. Las capas normales importadas no se dibujan
// aquí: este formato no es la pieza, es el taller.
const TEXT_HOST_FORMATS = [
  'MUX4 TXT', 'MOVIL TXT', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL',
  'COM TITULO H',
  'TÍTULO FICHA',
];

// LOS 5 — de los anteriores, aquellos donde las HERRAMIENTAS DE CAPA
// (degradado, sólido, texto, logo) cambian de comportamiento. TÍTULO FICHA
// queda fuera: no se le añaden capas de estas.
const TEXT_TOOL_FORMATS = [
  'MUX4 TXT', 'MOVIL TXT', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL',
  'COM TITULO H',
];

// LOS 5 — los maestros de texto: lienzos donde se edita el título. Se muestran
// a doble ancho y no marcan el candado manual (no son receptores).
const TEXT_MASTER_FORMATS = [
  'MUX4 TXT', 'MOVIL TXT', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL',
  'COM TITULO H',
];

// LOS 4 — de esos, los que llevan BLOQUE DE TEXTO: maquetación automática por
// presets y pastilla Freemium.
//
// COM TITULO H queda FUERA aunque sea maestro. En las piezas WEB de COMERCIAL
// el texto NO va quemado en la imagen de título, por SEO: la web lo compone en
// HTML y solo consume el PNG del título. Así que ahí no hay bloque que maquetar
// ni pastilla que poner — solo el PNG, apoyado abajo a la izquierda.
//
// Esto además evita un problema de fondo: los presets dan por supuesto que un
// formato derivado es un escalado UNIFORME de su origen (TEXTO HORIZONTAL es
// MUX4 TXT x2,449/2,450), y COM TITULO H no lo es (x2,176/x1,616), así que
// derivarlos le descuadraba la maquetación.
//
// NO confundir con el orden de los botones en `modalities.textos`, que es UI.
const TEXT_BLOCK_FORMATS = [
  'MUX4 TXT', 'MOVIL TXT', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL',
];


// ── COMPOSICIONES AUTO-GENERADAS ────────────────────────────
// Las composiciones no son capas del usuario: nacen de un formato maestro y se
// regeneran solas. Por eso NO se ofrecen en el modal de roles, NO se guardan
// como assets y NO cuentan como imágenes importadas.
//
// Esta lista existe porque enumerar las banderas a mano en cada sitio ya ha
// fallado TRES veces al añadir una composición nueva: se coló en la carpeta
// imagenes/ del proyecto guardado, se listó en el panel de capas, y acabó
// ofreciéndose en el modal de roles como si fuera un archivo recién importado.
// Nueve sitios repetían la misma enumeración y bastaba olvidar uno.
const COMPOSICION_FLAGS = [
  'isComposicion',          // MUX4 TXT
  'isComposicionMovil',     // MOVIL TXT
  'isComposicionTextoH',    // TEXTO HORIZONTAL
  'isComposicionTextoV',    // TEXTO VERTICAL
  'isComposicionComTituloH',// COM TITULO H
];
function esComposicionAuto(l) {
  return !!l && COMPOSICION_FLAGS.some(f => l[f]);
}

const State = {

  view: 'editor',
  activeModality: null,
  activeFormat: null,
  selectedLayerId: null,
  selectedLayerIds: [],
  layers: [],
  formatParams: {},
  formatOk: {},
  formatTextVariant: {}, // { formatId: 'H' | 'V' } — variante de texto por formato (lapicero). Defaults se cargan en el paso de enrutado.
  overlays: { mockup: true, txt: true, foco: false },
  projectName: 'Sin título',
  dirty: false,
  _multiOrigins: {},
  layerRoles: {}, // { layerId: 'background'|'subject'|'title'|null }

  // ── ENCUADRE FOCAL POR BANDA ─────────────────────────────
  // Rectángulo focal normalizado (0–1, espacio de la imagen origen) que el
  // usuario define UNA vez por banda de proporción. Cada formato deriva su
  // colocación inicial por cover-fit del rect de su banda. Solo se guardan
  // las bandas realmente encuadradas; ausencia → colocación genérica.
  // { [layerId]: { VERTICAL:{x,y,w,h}, '16:9':{...}, PANO:{...}, ULTRA:{...} } }
  focalFrames: {},

  // ── GUÍAS DE COMPOSICIÓN ─────────────────────────────────
  // Por formato. Cada guía: { id, orient: 'h'|'v', pos: number (px en coord del formato) }
  guides:        {},   // { formatId: [ {id, orient, pos}, ... ] }
  guidesVisible: {},   // { formatId: bool }  (default true)
  guidesLocked:  {},   // { formatId: bool }  (default false)
  snapEnabled:   false, // toggle GLOBAL del imán

  pastillaConfig: {
    variant: 'negra',        // fallback global (compatibilidad proyectos antiguos)
    variantByFormat: {},   // { formatId: 'negra'|'blanca' } — variante por formato
    visible: {},       // { formatId: bool } — visibilidad por formato
    offsetX: {},       // { formatId: number } — ajuste X del usuario
    locked:  {},       // { formatId: bool } — bloqueo por formato
    // Posición y escala por defecto (hardcodeada) — placeholder, Wilson pasa valores reales
    defaults: {
      'MOD DEST 2':       { x: 294,  y: -94,   scale: 0.47  },
      'MUX4 TXT':         { x: 0,    y: -135,   scale: 0.48  },
      'WEB PUBLI':        { x: 386,  y: -202,  scale: 0.34  },
      'WOW PUBLI':        { x: 486,  y: -94,   scale: 0.42  },
      'MOVIL MUX FONDO':  { x: -8,   y: -1115, scale: 1.0   },
    },
  },
  formatSizes: {
    'AD PAUSE':         { w: 1280, h: 720,  maxMB: 0.1, displayContext: { w: 1920, h: 1080, contentX: 322, contentY: 98 } },
    'APPLE TV':         { w: 908,  h: 512,  maxMB: 1    },
    'FANART DEST.':     { w: 1920, h: 1080, maxMB: 1.5  },
    'MOD DEST 1':       { w: 1636, h: 296,  maxMB: 1    },
    'MOD DEST 1 SIL':   { w: 1920, h: 400,  maxMB: 1,   maskRect: { x: 0, y: 53,  w: 1636, h: 296, r: 4 } },
    'MOD DEST 2':       { w: 803,  h: 296,  maxMB: 1    },
    'MOD DEST 2 SIL':   { w: 863,  h: 400,  maxMB: 1,   maskRect: { x: 0, y: 51,  w: 803,  h: 296, r: 4 } },
    'MOD DEST 3':       { w: 526,  h: 296,  maxMB: 1    },
    'MOD DEST 3 SIL':   { w: 584,  h: 400,  maxMB: 1,   maskRect: { x: 0, y: 52,  w: 526,  h: 296, r: 4 } },
    'MUX4 FONDO':       { w: 1920, h: 1080, maxMB: 1.5  },
    'MUX4 TXT':         { w: 784,  h: 318,  maxMB: 0.6  },
    'MOVIL MUX FONDO':  { w: 1440, h: 2986, maxMB: 1.5  },
    'MOVIL TXT':        { w: 1440, h: 466,  maxMB: 0.6  },
    'TEXTO HORIZONTAL': { w: 1920, h: 779,  maxMB: 0.6  },
    'TEXTO VERTICAL':   { w: 1080, h: 350,  maxMB: 0.6  },
    // COM TITULO H — asset de título del pack COMERCIAL. Tamaño CONFIRMADO por
    // los diseñadores (2026-10-29) mirando un pack ya exportado de una serie
    // hecha de forma tradicional. Es el tamaño de ENTREGA, y por tanto también
    // el de exportación, y se entrega con el nombre 'cabecera-slider-tt'.
    // Ese "formato" no existe como pieza: ES este título, y estaba duplicado.
    'COM TITULO H':     { w: 1156, h: 348,  maxMB: 0.6  },
    'WEB PUBLI':        { w: 2000, h: 465,  maxMB: 1, displayContext: { w: 1920, h: 850, contentX: 26, contentY: 115, contentW: 1868, contentH: 434 } },
    'WOW PUBLI':        { w: 1280, h: 258,  maxMB: 0.25 },
    'TÍTULO FICHA':     { w: 2172, h: 300,  maxMB: 0.6  },
    'CARÁTULA H':       { w: 1920, h: 1080, maxMB: 5    },
    'CARÁTULA V':       { w: 1200, h: 1800, maxMB: 5    },
    'CARTEL COM. H':    { w: 3840, h: 2160, maxMB: 100  },
    'CARTEL COM. V':    { w: 2160, h: 3240, maxMB: 100  },
    'FANART':           { w: 3840, h: 2160, maxMB: 3    },
    'FANART MÓVIL':     { w: 1440, h: 2986, maxMB: 3    },
    'DEST. DOBLE 1':    { w: 1636, h: 548,  maxMB: 0.6  },
    'DEST. DOBLE 1 SIL':{ w: 1636, h: 630,  maxMB: 1,   maskRect: { x: 0, y: 41,  w: 1636, h: 548, r: 4 } },
    'DEST. DOBLE 2':    { w: 803,  h: 548,  maxMB: 1    },
    'DEST. DOBLE 2 SIL':{ w: 803,  h: 630,  maxMB: 1,   maskRect: { x: 0, y: 41,  w: 803,  h: 548, r: 4 } },
    'DEST. DOBLE 4':    { w: 386,  h: 548,  maxMB: 1    },
    'DEST. DOBLE 4 SIL':{ w: 386,  h: 630,  maxMB: 1,   maskRect: { x: 0, y: 41,  w: 385,  h: 548, r: 4 } },
    'MOD N':            { w: 386,  h: 217,  maxMB: 0.6  },
    'FANART MOD N':     { w: 1920, h: 1080, maxMB: 10   },
    'MOD N SIL':        { w: 449,  h: 300,  maxMB: 0.6, maskRect: { x: 0, y: 42,  w: 385,  h: 217, r: 4 } },
    'PERFIL':           { w: 425,  h: 479,  maxMB: 10, maskCircle: { cx: 0, cy: 26, r: 195 }, maskRect: { x: 0, y: -110, w: 390, h: 260, r: 0 } },
    'XIAOMI BANNER':    { w: 1280, h: 360,  maxMB: 10   },

    // ── COMERCIAL (pack web responsive) ────────────────────
    // maxMB: 100 = sin límite real de peso, el mismo criterio que CARÁTULA y
    // CARTEL COM. Cuando producción fije pesos, se cambia aquí y en export.js.
    'Mosaico-Horizontal':                 { w: 1000, h: 750,  maxMB: 100 },
    'Mosaico-Vertical':                   { w: 1000, h: 1580, maxMB: 100 },
    'Modulo-Escritorio':                  { w: 2800, h: 1575, maxMB: 100 },
    'Modulo-Movil':                       { w: 1200, h: 1200, maxMB: 100 },
    'Cabecera-Detalle-Escritorio':        { w: 3840, h: 2160, maxMB: 100 },
    'Cabecera-Detalle-Movil':             { w: 2160, h: 3840, maxMB: 100 },
    'Carrusel-Vertical':                  { w: 1200, h: 1800, maxMB: 100 },
    'Carrusel-Horizontal':                { w: 800,  h: 450,  maxMB: 100 },
    'Cabecera-Slider-Escritorio':         { w: 3840, h: 2160, maxMB: 100 },
    'Cabecera-Slider-Movil':              { w: 2160, h: 3840, maxMB: 100 },
    'Cabecera-Slider-Mediano-Escritorio': { w: 3840, h: 1200, maxMB: 100 },
    'Slider-Mediano-Escritorio':          { w: 3840, h: 1200, maxMB: 100 },
    'Cabecera-Slider-Mediano-Movil':      { w: 1536, h: 1536, maxMB: 100 },
    'Slider-Mediano-Movil':               { w: 1536, h: 1536, maxMB: 100 },
  },

  // ── MAQUETACIÓN AUTOMÁTICA ───────────────────────────────
  layoutConfig: {}, // { formatId: { type, version } } — maquetación independiente por formato de texto

  // ── PASTILLA FREEMIUM ────────────────────────────────────
  pastillaFreemiumConfig: {
    variant: 'generica',   // 'generica' | 'cap1' | 'gratis'
  },

  // ── CAPAS DE SISTEMA ─────────────────────────────────────
  // Visibilidad por formato: { formatId: { layerKey: bool } }
  systemVisibility: {},

  // Máscara SIL por formato y capa: { formatId: { layerId: bool } }
  formatMaskEnabled: {},

  // Configuración de capas de sistema por formato
  systemLayers: {
    'AD PAUSE': [
      { key: 'fondo',    label: 'FONDO',             src: 'assets/img/checkers/fondo_ad.jpg',          zBase: true },
      { key: 'mockup',   label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/AD_PAUSE_Checker.png',  contentArea: true },
      { key: 'pastilla', label: 'PASTILLA PUBLI',    src: 'assets/img/checkers/pasti_publi.png',       contextPos: { x: 875, y: 77 }, defaultVisible: true },
    ],
    'APPLE TV':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/APPLETV_Check.png' } ],
    'FANART DEST.':      [ { key: 'mockup', label: 'MOCKUP', src: 'assets/img/checkers/FANART_DESTACADO_PUBLI_Check.png' } ],
    'MOD DEST 1':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO1_Check.png' } ],
    'MOD DEST 1 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO1_SIL_Check.png' } ],
    'MOD DEST 2':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO2_Check.png' } ],
    'MOD DEST 2 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO2_SIL_Check.png' } ],
    'MOD DEST 3':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO3_Check.png' } ],
    'MOD DEST 3 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO3_SIL_Check.png' } ],
    'MUX4 FONDO': [
      { key: 'foco',   label: 'FOCO',   src: 'assets/img/checkers/MUX4_FONDO_TXT_PUBLI_FOCO.png', exclusive: 'interfaz', defaultVisible: false },
      { key: 'mockup', label: 'MOCKUP', src: 'assets/img/checkers/MUX4_FONDO_TXT_PUBLI.png',      exclusive: 'interfaz' },
    ],
    'MUX4 TXT':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MUX4_TXT_Check.png' } ],
    'MOVIL MUX FONDO': [
      { key: 'mockup',    label: 'MOCKUP',   src: 'assets/img/checkers/SMARTPHONE_MUX_FONDO_TXT_Check.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SMARTPHONE_MUX_ZONA_Checker.png' },
    ],
    'MOVIL TXT':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SMARTPHONE_MUX_TXT_Check.png' } ],
    'TEXTO HORIZONTAL':  [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MUX4_TXT_Check.png' } ],
    // COM TITULO H va SIN zona de seguridad: el asset es el título a pelo.
    'COM TITULO H':      [],
    'TEXTO VERTICAL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SMARTPHONE_MUX_TXT_Check.png' } ],
    'WEB PUBLI': [
      { key: 'mockup',   label: 'MOCKUP',             src: 'assets/img/checkers/WEB_MOCKUP.png' },
      { key: 'checker',  label: 'ZONA DE SEGURIDAD',  src: 'assets/img/checkers/WEBPLAYER_PUBLI_Check.png', contentArea: true },
    ],
    'WOW PUBLI':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/WOW_PUBLI_Check.png' } ],
    'TÍTULO FICHA':      [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/TITULO_FICHA_Checker.png' } ],
    'CARÁTULA H': [
      { key: 'marcas', label: 'MARCAS DINÁMICAS', src: 'assets/img/checkers/MARCA_CARATULA_H.png', zBottom: true },
      { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/Caratula_H_Checker.png' },
    ],
    'CARÁTULA V': [
      { key: 'marcas', label: 'MARCAS DINÁMICAS', src: 'assets/img/checkers/MARCA_CARATULA_V.png', zBottom: true },
      { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/CARATULA_V_Checker.png' },
    ],
    'CARTEL COM. H':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/CC_H_Checker.png' } ],
    'CARTEL COM. V':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/CC_V_Checker.png' } ],
    'FANART': [
      { key: 'nivel2', label: 'NIVEL 2', src: 'assets/img/checkers/FANART_NIVEL2_Check.png', exclusive: 'nivel', defaultVisible: false },
      { key: 'nivel1', label: 'NIVEL 1', src: 'assets/img/checkers/FANART_NIVEL1_Check.png', exclusive: 'nivel' },
    ],
    'FANART MÓVIL':      [ { key: 'mockup', label: 'MOCKUP', src: 'assets/img/checkers/FANART_MOVIL_Check.png' } ],
    'DEST. DOBLE 1':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_1_Checker.png' } ],
    'DEST. DOBLE 1 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_1_Checker.png' } ],
    'DEST. DOBLE 2':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_2_Checker.png' } ],
    'DEST. DOBLE 2 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_2_Checker.png' } ],
    'DEST. DOBLE 4':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_4_Checker.png' } ],
    'DEST. DOBLE 4 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_4_Checker.png' } ],
    'MOD N':             [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_N_Checker.png' } ],
    'MOD N SIL':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_N_SIL_Checker.png' } ],
    'PERFIL':            [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/perfil_checker.png' } ],
    'XIAOMI BANNER':     [],

    // ── COMERCIAL (pack web responsive) ────────────────────
    // SF_* = zona de seguridad, MK_* = mockup. Los formatos que no tienen
    // ninguno de los dos van con [] (igual que XIAOMI BANNER).
    'Mosaico-Horizontal':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Mosaico_Horizontal.png' } ],
    'Mosaico-Vertical':            [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Mosaico_Vertical.png' } ],
    'Modulo-Escritorio':           [],
    'Modulo-Movil':                [],
    'Cabecera-Detalle-Escritorio': [
      { key: 'mockup',    label: 'MOCKUP',            src: 'assets/img/checkers/MK_Cabecera_Detalle_Escritorio.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Detalle_Escritorio.png' },
    ],
    'Cabecera-Detalle-Movil': [
      { key: 'mockup',    label: 'MOCKUP',            src: 'assets/img/checkers/MK_Cabecera_Detalle_Movil.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Detalle_Movil.png' },
    ],
    'Carrusel-Vertical':           [],
    'Carrusel-Horizontal':         [],
    'Cabecera-Slider-Escritorio': [
      { key: 'mockup',    label: 'MOCKUP',            src: 'assets/img/checkers/MK_Cabecera_Slider_Escritorio.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Slider_Escritorio.png' },
    ],
    'Cabecera-Slider-Movil': [
      { key: 'mockup',    label: 'MOCKUP',            src: 'assets/img/checkers/MK_Cabecera_Slider_Movil.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Slider_Movil.png' },
    ],
    'Cabecera-Slider-Mediano-Escritorio': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Slider_Mediano_Escritorio.png' } ],
    'Slider-Mediano-Escritorio':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Slider_Mediano_Escritorio.png' } ],
    'Cabecera-Slider-Mediano-Movil':      [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Cabecera_Slider_Mediano_Movil.png' } ],
    'Slider-Mediano-Movil':               [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SF_Slider_Mediano_Movil.png' } ],
  },

  // ── MODALIDADES Y FORMATOS ─────────────────────────────────
  modalities: [
    { id: 'selecciona', label: 'Selecciona modalidad', formats: [] },
    {
      id: 'textos',
      label: 'Textos',
      formats: [
        'TEXTO HORIZONTAL', 'TEXTO VERTICAL', 'MUX4 TXT', 'MOVIL TXT',
        'COM TITULO H'
      ]
    },
    {
      id: 'dispositivos',
      label: 'Dispositivos',
      formats: [
        'AD PAUSE', 'APPLE TV', 'FANART DEST.',
        'MOD DEST 1', 'MOD DEST 1 SIL', 'MOD DEST 2',
        'MOD DEST 2 SIL', 'MOD DEST 3', 'MOD DEST 3 SIL', 'MUX4 FONDO',
        'MOVIL MUX FONDO', 'WEB PUBLI',
        'WOW PUBLI', 'TÍTULO FICHA'
      ]
    },
    {
      id: 'grafica_oficial',
      label: 'Gráfica Oficial',
      formats: [
        'CARÁTULA H', 'CARÁTULA V', 'CARTEL COM. H',
        'CARTEL COM. V', 'FANART', 'FANART MÓVIL'
      ]
    },
    {
      id: 'modulos_dobles',
      label: 'Módulos Dobles + N',
      formats: [
        'DEST. DOBLE 1', 'DEST. DOBLE 1 SIL', 'DEST. DOBLE 2',
        'DEST. DOBLE 2 SIL', 'DEST. DOBLE 4', 'DEST. DOBLE 4 SIL',
        'MOD N', 'FANART MOD N', 'MOD N SIL'
      ]
    },
    {
      id: 'comercial',
      label: 'Comercial',
      formats: [
        'Mosaico-Horizontal', 'Mosaico-Vertical',
        'Modulo-Escritorio', 'Modulo-Movil',
        'Cabecera-Detalle-Escritorio', 'Cabecera-Detalle-Movil',
        'Carrusel-Vertical', 'Carrusel-Horizontal',
        'Cabecera-Slider-Escritorio', 'Cabecera-Slider-Movil',
        'Cabecera-Slider-Mediano-Escritorio', 'Slider-Mediano-Escritorio',
        'Cabecera-Slider-Mediano-Movil', 'Slider-Mediano-Movil'
      ]
    },
    {
      id: 'otros',
      label: 'Otros',
      formats: [
        'PERFIL', 'XIAOMI BANNER'
      ]
    }
  ],

};
