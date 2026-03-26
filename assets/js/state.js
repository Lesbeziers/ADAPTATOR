// ============================================================
// STATE.JS — Modelo de datos central
// ============================================================

const State = {

  view: 'editor',
  activeModality: null,
  activeFormat: null,
  selectedLayerId: null,
  selectedLayerIds: [],
  layers: [],
  formatParams: {},
  formatOk: {},
  overlays: { mockup: true, txt: true, foco: false },
  projectName: 'Sin título',
  dirty: false,
  _multiOrigins: {},

  pastillaConfig: {
    variant: 'negra',        // fallback global (compatibilidad proyectos antiguos)
    variantByFormat: {},   // { formatId: 'negra'|'blanca' } — variante por formato
    visible: {},       // { formatId: bool } — visibilidad por formato
    offsetX: {},       // { formatId: number } — ajuste X del usuario
    locked:  {},       // { formatId: bool } — bloqueo por formato
    // Posición y escala por defecto (hardcodeada) — placeholder, Wilson pasa valores reales
    defaults: {
      '199 PUBLI':        { x: 753,  y: -278,  scale: 0.5   },
      'IPLUS PUBLI':      { x: 567,  y: -280,  scale: 0.36  },
      'MOD DEST 2':       { x: 294,  y: -94,   scale: 0.47  },
      'MUX4 TXT':         { x: 0,    y: -135,   scale: 0.48  },
      'WEB PUBLI':        { x: 386,  y: -202,  scale: 0.34  },
      'WOW PUBLI':        { x: 486,  y: -94,   scale: 0.42  },
      'MOVIL MUX FONDO':  { x: -8,   y: -1115, scale: 1.0   },
    },
  },
  formatSizes: {
    '199 PUBLI':        { w: 1920, h: 636,  maxMB: 4    },
    'AD PAUSE':         { w: 1280, h: 720,  maxMB: 0.1, displayContext: { w: 1920, h: 1080, contentX: 322, contentY: 98 } },
    'APPLE TV':         { w: 908,  h: 512,  maxMB: 1    },
    'FANART DEST.':     { w: 1920, h: 1080, maxMB: 1.5  },
    'IPLUS PUBLI':      { w: 1280, h: 620,  maxMB: 0.15 },
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
    'WEB PUBLI':        { w: 2000, h: 465,  maxMB: 1, displayContext: { w: 1920, h: 850, contentX: 26, contentY: 115, contentW: 1868, contentH: 434 } },
    'WOW PUBLI':        { w: 1280, h: 258,  maxMB: 0.25 },
    'TÍTULO FICHA':     { w: 724,  h: 100,  maxMB: 0.6  },
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
    'MOD N SIL':        { w: 449,  h: 300,  maxMB: 0.6, maskRect: { x: 0, y: 42,  w: 385,  h: 217, r: 4 } },
    'AMAZON BG':        { w: 1920, h: 720,  maxMB: 0.45 },
    'AMAZON LOGO':      { w: 640,  h: 260,  maxMB: 0.45 },
    'PERFIL':           { w: 425,  h: 479,  maxMB: 10   },
    'SONY':             { w: 204,  h: 306,  maxMB: 10   },
    'XIAOMI BANNER':    { w: 1280, h: 360,  maxMB: 10   },
  },

  // ── CAPAS DE SISTEMA ─────────────────────────────────────
  // Visibilidad por formato: { formatId: { layerKey: bool } }
  systemVisibility: {},

  // Máscara SIL por formato y capa: { formatId: { layerId: bool } }
  formatMaskEnabled: {},

  // Configuración de capas de sistema por formato
  systemLayers: {
    '199 PUBLI':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/199_PUBLI_Check.png' } ],
    'AD PAUSE': [
      { key: 'fondo',    label: 'FONDO',             src: 'assets/img/checkers/fondo_ad.jpg',          zBase: true },
      { key: 'mockup',   label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/AD_PAUSE_Checker.png',  contentArea: true },
      { key: 'pastilla', label: 'PASTILLA PUBLI',    src: 'assets/img/checkers/pasti_publi.png',       contextPos: { x: 875, y: 77 }, defaultVisible: true },
    ],
    'APPLE TV':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/APPLETV_Check.png' } ],
    'FANART DEST.':      [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/FANART_DESTACADO_PUBLI_Check.png' } ],
    'IPLUS PUBLI':       [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/IPLUS_PUBLI_Check.png' } ],
    'MOD DEST 1':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO1_Check.png' } ],
    'MOD DEST 1 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO1_SIL_Check.png' } ],
    'MOD DEST 2':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO2_Check.png' } ],
    'MOD DEST 2 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO2_SIL_Check.png' } ],
    'MOD DEST 3':        [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO3_Check.png' } ],
    'MOD DEST 3 SIL':    [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DESTACADO3_SIL_Check.png' } ],
    'MUX4 FONDO': [
      { key: 'mockup', label: 'MOCKUP', src: 'assets/img/checkers/MUX4_FONDO_TXT_PUBLI.png',      exclusive: 'interfaz' },
      { key: 'foco',   label: 'FOCO',   src: 'assets/img/checkers/MUX4_FONDO_TXT_PUBLI_FOCO.png', exclusive: 'interfaz', defaultVisible: false },
    ],
    'MUX4 TXT':          [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MUX4_TXT_Check.png' } ],
    'MOVIL MUX FONDO': [
      { key: 'mockup',    label: 'MOCKUP',   src: 'assets/img/checkers/SMARTPHONE_MUX_FONDO_TXT_Check.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SMARTPHONE_MUX_ZONA_Checker.png' },
    ],
    'MOVIL TXT':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SMARTPHONE_MUX_TXT_Check.png' } ],
    'WEB PUBLI': [
      { key: 'checker',  label: 'ZONA DE SEGURIDAD',  src: 'assets/img/checkers/WEBPLAYER_PUBLI_Check.png', contentArea: true },
      { key: 'mockup',   label: 'MOCKUP',             src: 'assets/img/checkers/WEB_MOCKUP.png' },
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
      { key: 'nivel1', label: 'NIVEL 1', src: 'assets/img/checkers/FANART_NIVEL1_Check.png', exclusive: 'nivel' },
      { key: 'nivel2', label: 'NIVEL 2', src: 'assets/img/checkers/FANART_NIVEL2_Check.png', exclusive: 'nivel', defaultVisible: false },
    ],
    'FANART MÓVIL':      [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/FANART_MOVIL_Check.png' } ],
    'DEST. DOBLE 1':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_1_Checker.png' } ],
    'DEST. DOBLE 1 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_1_Checker.png' } ],
    'DEST. DOBLE 2':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_2_Checker.png' } ],
    'DEST. DOBLE 2 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_2_Checker.png' } ],
    'DEST. DOBLE 4':     [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_4_Checker.png' } ],
    'DEST. DOBLE 4 SIL': [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_DES_DOBLE_SIL_4_Checker.png' } ],
    'MOD N':             [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_N_Checker.png' } ],
    'MOD N SIL':         [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/MOD_N_SIL_Checker.png' } ],
    'AMAZON BG': [
      { key: 'mockup',    label: 'MOCKUP',    src: 'assets/img/checkers/AMAZON_MOCKUP_Check.png' },
      { key: 'seguridad', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/AMAZON_SEGURIDAD_Check.png' },
    ],
    'AMAZON LOGO':       [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/AMAZON_LOGO_Checker.png' } ],
    'PERFIL':            [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/perfil_checker.png' } ],
    'SONY':              [ { key: 'mockup', label: 'ZONA DE SEGURIDAD', src: 'assets/img/checkers/SONY_Checker.png' } ],
    'XIAOMI BANNER':     [],
  },

  // ── MODALIDADES Y FORMATOS ─────────────────────────────────
  modalities: [
    { id: 'selecciona', label: 'Selecciona modalidad', formats: [] },
    {
      id: 'dispositivos',
      label: 'Dispositivos',
      formats: [
        '199 PUBLI', 'AD PAUSE', 'APPLE TV', 'FANART DEST.',
        'IPLUS PUBLI', 'MOD DEST 1', 'MOD DEST 1 SIL', 'MOD DEST 2',
        'MOD DEST 2 SIL', 'MOD DEST 3', 'MOD DEST 3 SIL', 'MUX4 FONDO',
        'MUX4 TXT', 'MOVIL MUX FONDO', 'MOVIL TXT', 'WEB PUBLI',
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
        'MOD N', 'MOD N SIL'
      ]
    },
    {
      id: 'otros',
      label: 'Otros',
      formats: [
        'AMAZON BG', 'AMAZON LOGO', 'PERFIL', 'SONY', 'XIAOMI BANNER'
      ]
    }
  ],

};
