// ============================================================
// LAYOUT.JS — Maquetación automática MUX4 TXT / MOVIL TXT
// ============================================================

const Layout = (() => {

  // ── DEFINICIÓN DE TIPOLOGÍAS Y VERSIONES ─────────────────

  const TIPOS = [
    { id: 'ninguna',   label: 'Ninguna' },
    { id: 'cine',      label: 'Cine' },
    { id: 'deportes',  label: 'Deportes' },
    { id: 'partners',  label: 'Partners' },
    { id: 'textos',    label: 'Textos' },
  ];

  const VERSIONES = {
    ninguna:  [ { id: 'reset', label: 'Sin maquetación (solo título)' } ],
    cine:     [ { id: 'normal', label: 'Normal' }, { id: 'freemium', label: 'Freemium' } ],
    deportes: [ { id: 'normal', label: 'Normal' }, { id: 'freemium', label: 'Freemium' }, { id: 'horecas', label: 'Horecas' }, { id: 'upsell', label: 'Upsell' }, { id: 'upsell_precio', label: 'Upsell + Precio' }, { id: 'informe', label: 'Informe +' } ],
    textos: [ { id: 'canales', label: 'Textos Canales' } ],
    partners: [
      { id: 'apple_tv',    label: 'Apple TV' },
      { id: 'bbc_player',  label: 'BBC Player' },
      { id: 'disney',      label: 'Disney+' },
      { id: 'hbo_max',     label: 'HBO Max' },
      { id: 'netflix',     label: 'Netflix' },
      { id: 'prime_video', label: 'Prime Video' },
      { id: 'skyshowtime', label: 'Skyshowtime' },
      { id: 'warner',      label: 'Warner' },
    ],
  };

  // ── PRESETS ───────────────────────────────────────────────
  // Cada preset define, por nombre de capa, los parámetros a aplicar
  // en MUX4 TXT y MOVIL TXT (cuando existan).
  // Los nombres de capa son los roles canónicos que el usuario deberá
  // haber asignado en el proyecto.

  const PRESETS = {

    cine_normal: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { scaleX: 73.9, scaleY: 73.9, x: 0, y: -1 },
        'ANTETITULO': {
          scaleX: 100, scaleY: 100, x: 0, y: -105,
          text: { size: 24, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '700', color: '#ffffff', placeholder: 'Antetítulo' },
        },
        'SUBTITULO': {
          scaleX: 100, scaleY: 100, x: 0, y: 101,
          text: { size: 28, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '700', color: '#ffffff', placeholder: 'Subtítulo' },
        },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -24, zoneH: 225 },
        'ANTETITULO': {
          scaleX: 100, scaleY: 100, x: 0, y: -180,
          text: { size: 54, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Antetítulo' },
        },
        'SUBTITULO': {
          scaleX: 100, scaleY: 100, x: 0, y: 144,
          text: { size: 60, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Subtítulo' },
        },
      },
    },

    cine_freemium: {
      'MUX4 TXT': {
        'IMAGEN_TITULO':    { scaleX: 80, scaleY: 80, x: 0, y: -44 },
        'PASTILLA_FREEMIUM': { scaleX: 100, scaleY: 100, x: 0, y: 95 },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO':     { zoneY: -64, zoneH: 237 },
        'PASTILLA_FREEMIUM': { scaleX: 100, scaleY: 100, x: 0, y: 133, pastillaH: 100 },
      },
    },

    deportes_freemium: {
      'MUX4 TXT': {
        'COMPETICION_FASE': {
          scaleX: 100, scaleY: 100, x: 0, y: -107,
          text: { size: 25, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'COMPETICION - FASE' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: 0, y: -48,
          text: { size: 60, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: 0, y: 8,
          text: { size: 60, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'PASTILLA_FREEMIUM': { scaleX: 100, scaleY: 100, x: 0, y: 87 },
      },
      'MOVIL TXT': {
        'COMPETICION_FASE': {
          scaleX: 100, scaleY: 100, x: 0, y: -178,
          text: { size: 55, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'COMPETICION - FASE' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: 0, y: -79,
          text: { size: 112, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: 0, y: 32,
          text: { size: 112, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'PASTILLA_FREEMIUM': { scaleX: 100, scaleY: 100, x: 0, y: 158, pastillaH: 99 },
      },
    },

    deportes_normal: {
      'MUX4 TXT': {
        'COMPETICION_FASE': {
          scaleX: 100, scaleY: 100, x: -356, y: -108,
          text: { size: 26, align: 'left', leading: 120, tracking: -20, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Competición · Fase' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: -356, y: -55,
          text: { size: 60, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: -356, y: 8,
          text: { size: 60, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'SUBTITULO': {
          scaleX: 100, scaleY: 100, x: -356, y: 59,
          text: { size: 30, align: 'left', leading: 120, tracking: -30, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Subtítulo' },
        },
        'LOGO_CANAL': { scaleX: 22, scaleY: 22, x: -321, y: 103, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
      },
      'MOVIL TXT': {
        'COMPETICION_FASE': {
          scaleX: 100, scaleY: 100, x: 0, y: -174,
          text: { size: 55, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Competición · Fase' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: 0, y: -84,
          text: { size: 112, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: 0, y: 36,
          text: { size: 112, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'LOGO_CANAL': { scaleX: 48, scaleY: 48, x: 0, y: 155, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
      },
    },

    deportes_horecas: {
      'MUX4 TXT': {
        'COMPETICION_FASE': {
          scaleX: 100, scaleY: 100, x: -356, y: -86,
          text: { size: 26, align: 'left', leading: 120, tracking: -20, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Competición · Fase' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: -356, y: -38,
          text: { size: 60, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: -356, y: 23,
          text: { size: 60, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'SUBTITULO': {
          scaleX: 100, scaleY: 100, x: -356, y: 80,
          text: { size: 30, align: 'left', leading: 120, tracking: -30, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Subtítulo' },
        },
      },
    },

    deportes_upsell: {
      'MUX4 TXT': {
        'COMPETICION_FASE_HORA': {
          scaleX: 100, scaleY: 100, x: -356, y: -122,
          text: { size: 24, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'COMPETICION - FASE - HORA' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: -357, y: -74,
          text: { size: 50, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: -357, y: -25,
          text: { size: 50, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'LOGO_CANAL': { scaleX: 24, scaleY: 24, x: -317, y: 33, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
        'PASTILLA_ACTIVAR': { scaleX: 100, scaleY: 100, x: -295, y: 117, logo: false, imagePath: 'assets/img/pastilla_activar.png' },
      },
    },

    deportes_upsell_precio: {
      'MUX4 TXT': {
        'COMPETICION_FASE_HORA': {
          scaleX: 100, scaleY: 100, x: -356, y: -122,
          text: { size: 24, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'COMPETICION - FASE - HORA' },
        },
        'EQUIPO_1': {
          scaleX: 100, scaleY: 100, x: -357, y: -74,
          text: { size: 50, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 1' },
        },
        'EQUIPO_2': {
          scaleX: 100, scaleY: 100, x: -357, y: -25,
          text: { size: 50, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Equipo 2' },
        },
        'LOGO_CANAL': { scaleX: 24, scaleY: 24, x: -317, y: 33, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
        'TODO_FUTBOL': {
          scaleX: 100, scaleY: 100, x: -265, y: 113,
          text: { size: 22, align: 'right', leading: 75, tracking: 0, family: 'Apercu Movistar', weight: '700', color: '#ffffff', placeholder: 'Todo\nel fútbol' },
        },
        'PRECIO': {
          scaleX: 100, scaleY: 100, x: -178, y: 104,
          text: { size: 74, align: 'right', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: '35' },
        },
        'SIMBOLO_EURO': {
          scaleX: 100, scaleY: 100, x: -155, y: 103,
          text: { size: 37, align: 'right', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: '€' },
        },
        'MES': {
          scaleX: 100, scaleY: 100, x: -146, y: 121,
          text: { size: 14, align: 'right', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: '/mes' },
        },
        'PASTILLA_ACTIVAR': { scaleX: 100, scaleY: 100, x: -65, y: 117, logo: false, imagePath: 'assets/img/pastilla_activar.png' },
      },
    },

    deportes_informe: {
      'MUX4 TXT': {
        'LINEA_1': {
          scaleX: 100, scaleY: 100, x: 0, y: -95,
          text: { size: 80, align: 'center', leading: 120, tracking: 0, family: 'Abolition', weight: '400', color: '#ffffff', placeholder: 'LINEA 1' },
        },
        'LINEA_2': {
          scaleX: 100, scaleY: 100, x: 0, y: -9,
          text: { size: 115, align: 'center', leading: 120, tracking: 0, family: 'Abolition', weight: '400', color: '#ffffff', placeholder: 'LINEA 2' },
        },
        'PASTILLA_INFORME': { scaleX: 68, scaleY: 68, x: 0, y: 89, logo: false, imagePath: 'assets/img/pastilla_informeRobinson.svg' },
      },
    },

    partners_hbo_max: {
      'MUX4 TXT': {
        'LOGO_SUPERIOR': { scaleX: 60, scaleY: 60, x: 0, y: -107, logo: true, logoPath: 'assets/img/logos/PARTNERS/HBO_ORIGINAL_Neg.svg' },
        'IMAGEN_TITULO': { zoneY: -23, zoneH: 119 },
        'LOGO_INFERIOR': { scaleX: 40, scaleY: 40, x: 0, y: 89, logo: true, logoPath: 'assets/img/logos/PARTNERS/HBO_MAX_Neg.svg' },
      },
      'MOVIL TXT': {
        'LOGO_SUPERIOR': { scaleX: 90, scaleY: 90, x: 0, y: -172, logo: true, logoPath: 'assets/img/logos/PARTNERS/HBO_ORIGINAL_Neg.svg' },
        'IMAGEN_TITULO': { zoneY: -31, zoneH: 210 },
        'LOGO_INFERIOR': { scaleX: 60, scaleY: 60, x: 0, y: 150, logo: true, logoPath: 'assets/img/logos/PARTNERS/HBO_MAX_Neg.svg' },
      },
    },

    partners_apple_tv: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -48, zoneH: 163 },
        'LOGO_INFERIOR': { scaleX: 25, scaleY: 25, x: 9, y: 53, logo: true, logoPath: 'assets/img/logos/PARTNERS/Apple_TV_Neg.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -3, zoneH: 158 },
        'LOGO_INFERIOR': { scaleX: 29, scaleY: 29, x: 0, y: 110, logo: true, logoPath: 'assets/img/logos/PARTNERS/Apple_TV_Neg.svg' },
      },
    },

    partners_netflix: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -33, zoneH: 173 },
        'LOGO_INFERIOR': { scaleX: 142, scaleY: 142, x: 0, y: 94, logo: true, logoPath: 'assets/img/logos/PARTNERS/NETFLIX_CLAIM_Col_Pos.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -44, zoneH: 236 },
        'LOGO_INFERIOR': { scaleX: 212, scaleY: 212, x: 0, y: 141, logo: true, logoPath: 'assets/img/logos/PARTNERS/NETFLIX_CLAIM_Col_Pos.svg' },
      },
    },

    partners_prime_video: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -44, zoneH: 152 },
        'LOGO_INFERIOR': { scaleX: 131, scaleY: 131, x: 0, y: 80, logo: true, logoPath: 'assets/img/logos/PARTNERS/PRIME_CLAIM_Col_Pos.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -56, zoneH: 210 },
        'LOGO_INFERIOR': { scaleX: 200, scaleY: 200, x: 0, y: 122, logo: true, logoPath: 'assets/img/logos/PARTNERS/PRIME_CLAIM_Col_Pos.svg' },
      },
    },

    partners_disney: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -38, zoneH: 152 },
        'LOGO_INFERIOR': { scaleX: 123, scaleY: 123, x: 0, y: 89, logo: true, logoPath: 'assets/img/logos/PARTNERS/DISNEY_PLUS_CLAIM_Col_Pos.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -58, zoneH: 215 },
        'LOGO_INFERIOR': { scaleX: 183, scaleY: 183, x: 0, y: 132, logo: true, logoPath: 'assets/img/logos/PARTNERS/DISNEY_PLUS_CLAIM_Col_Pos.svg' },
      },
    },

    partners_skyshowtime: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -44, zoneH: 148 },
        'LOGO_INFERIOR': { scaleX: 57, scaleY: 57, x: 0, y: 64, logo: true, logoPath: 'assets/img/logos/PARTNERS/SKYSHOWTIME_Neg.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -46, zoneH: 179 },
        'LOGO_INFERIOR': { scaleX: 87, scaleY: 87, x: 0, y: 97, logo: true, logoPath: 'assets/img/logos/PARTNERS/SKYSHOWTIME_Neg.svg' },
      },
    },

    partners_warner: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -53, zoneH: 133 },
        'LOGO_INFERIOR': { scaleX: 32, scaleY: 32, x: 0, y: 63, logo: true, logoPath: 'assets/img/logos/PARTNERS/WARNER_Neg.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -59, zoneH: 153 },
        'LOGO_INFERIOR': { scaleX: 50, scaleY: 50, x: 0, y: 96, logo: true, logoPath: 'assets/img/logos/PARTNERS/WARNER_Neg.svg' },
      },
    },

    partners_bbc_player: {
      'MUX4 TXT': {
        'IMAGEN_TITULO': { zoneY: -33, zoneH: 168 },
        'LOGO_INFERIOR': { scaleX: 100, scaleY: 100, x: 0, y: 87, logo: true, logoPath: 'assets/img/logos/PARTNERS/BBC_PLAYER_CLAIM_NEG.svg' },
      },
      'MOVIL TXT': {
        'IMAGEN_TITULO': { zoneY: -58, zoneH: 310 },
        'LOGO_INFERIOR': { scaleX: 145, scaleY: 145, x: 0, y: 146, logo: true, logoPath: 'assets/img/logos/PARTNERS/BBC_PLAYER_CLAIM_NEG.svg' },
      },
    },

    textos_canales: {
      'MUX4 TXT': {
        'POSICIONAMIENTO': {
          scaleX: 100, scaleY: 100, x: -187, y: -108,
          text: { size: 24, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '700', color: '#ffffff', placeholder: 'Posicionamiento' },
        },
        'CLAIM_COPIA': {
          scaleX: 100, scaleY: 100, x: -187, y: -73,
          text: { size: 24, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'SÓLO LO VERÁS EN MOVISTAR PLUS+' },
        },
        'TITULO': {
          scaleX: 100, scaleY: 100, x: -187, y: -27,
          text: { size: 58, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Título' },
        },
        'CLAIM': {
          scaleX: 100, scaleY: 100, x: -187, y: 31,
          text: { size: 28, align: 'left', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Subtítulo / Claim' },
        },
        'LOGO_CANAL': { scaleX: 31, scaleY: 31, x: -140, y: 97, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
      },
      'MOVIL TXT': {
        'POSICIONAMIENTO': {
          scaleX: 100, scaleY: 100, x: 0, y: -187,
          text: { size: 54, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '700', color: '#ffffff', placeholder: 'Posicionamiento' },
        },
        'CLAIM_COPIA': {
          scaleX: 100, scaleY: 100, x: 0, y: -108,
          text: { size: 54, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'SÓLO LO VERÁS EN MOVISTAR PLUS+' },
        },
        'TITULO': {
          scaleX: 100, scaleY: 100, x: 0, y: -21,
          text: { size: 112, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '900', color: '#ffffff', placeholder: 'Título' },
        },
        'CLAIM': {
          scaleX: 100, scaleY: 100, x: 0, y: 91,
          text: { size: 54, align: 'center', leading: 120, tracking: 0, family: 'Apercu Movistar', weight: '300', color: '#ffffff', placeholder: 'Subtítulo / Claim' },
        },
        'LOGO_CANAL': { scaleX: 34, scaleY: 34, x: 0, y: 176, logo: true, logoPath: 'assets/img/logos/MOVISTAR+/M+_Logotipo_Neg.svg' },
      },
    },

  };

  // Formatos que activan la maquetación automática
  const LAYOUT_FORMATS = ['MUX4 TXT', 'MOVIL TXT', 'TEXTO HORIZONTAL', 'TEXTO VERTICAL'];

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    _createModal();
  }

  // ── API PÚBLICA ───────────────────────────────────────────

  // Llamado desde formats.js al activar MUX4 TXT o MOVIL TXT
  function onFormatActivated(formatName) {
    if (!LAYOUT_FORMATS.includes(formatName)) return;
    if (!_cfg(formatName).type) {
      openModal();
    }
  }

  function openModal() {
    const modal = document.getElementById('layout-modal');
    if (!modal) return;
    _renderModal();
    modal.classList.add('visible');
  }

  function closeModal() {
    const modal = document.getElementById('layout-modal');
    if (modal) modal.classList.remove('visible');
    // Liberar el listener global del dropdown — si no, se acumula uno por apertura
    if (_dropdownOutsideClick) {
      document.removeEventListener('click', _dropdownOutsideClick);
      _dropdownOutsideClick = null;
    }
  }

  let _dropdownOutsideClick = null;

  // Maqueta cada formato al maestro de texto que define su maquetación.
  // (Provisional: el resto heredan de MUX4 TXT; se afinará al construir el enrutado de títulos.)
  function _sourceFormat(fid) {
    if (fid === 'MOVIL TXT' || fid === 'MOVIL MUX FONDO') return 'MOVIL TXT';
    if (fid === 'TEXTO HORIZONTAL') return 'TEXTO HORIZONTAL';
    if (fid === 'TEXTO VERTICAL')   return 'TEXTO VERTICAL';
    return 'MUX4 TXT';
  }
  function _cfg(fid) { return State.layoutConfig[fid] || {}; }

  function getType(fid = State.activeFormat)    { return _cfg(_sourceFormat(fid)).type    || null; }
  function getVersion(fid = State.activeFormat) { return _cfg(_sourceFormat(fid)).version || null; }
  function isFreemium(fid = State.activeFormat)   { return _cfg(_sourceFormat(fid)).version === 'freemium'; }
  function isUpsell(fid = State.activeFormat)     { const c = _cfg(_sourceFormat(fid)); return c.type === 'deportes' && (c.version === 'upsell' || c.version === 'upsell_precio'); }
  function isUpsellPrecio(fid = State.activeFormat) { const c = _cfg(_sourceFormat(fid)); return c.type === 'deportes' && c.version === 'upsell_precio'; }
  function getPreset(fid) {
    const c = _cfg(_sourceFormat(fid));
    if (!c.type || !c.version) return null;
    const base = PRESETS[`${c.type}_${c.version}`];
    if (!base) return null;
    return _deriveBlock(base, fid) || base[fid] || null;
  }

  // ── DERIVACIÓN DE PRESETS POR ESCALA (formatos nuevos) ────
  // TEXTO HORIZONTAL = MUX4 TXT escalado · TEXTO VERTICAL = MOVIL TXT escalado.
  // Si un preset NO define MOVIL TXT, se deriva tambien desde MUX4 TXT (mismo ratio)
  // para que las versiones "MUX4-only" (Horecas, Upsell, Informe, Partners) funcionen
  // igualmente en MOVIL TXT, SMARTPHONE TEXT y, por encadenamiento, TEXTO VERTICAL.
  const DERIVE = {
    'TEXTO HORIZONTAL': { from: 'MUX4 TXT',  fx: 1920 / 784,  fy: 779 / 318 },
    'TEXTO VERTICAL':   { from: 'MOVIL TXT', fx: 1080 / 1440, fy: 350 / 466 },
  };
  // Fallback: si el preset no define MOVIL TXT, derivamos desde MUX4 TXT
  const MOVIL_FALLBACK_FROM_MUX4 = { from: 'MUX4 TXT', fx: 1440 / 784, fy: 466 / 318 };

  function _scaleBlock(block, fx, fy) {
    const out = {};
    // Default usado por _renderPastillaFreemium cuando el preset no especifica alto.
    // Lo materializamos antes de escalar para que se propague a los derivados (sin
    // esto, TEXTO HORIZONTAL/VERTICAL heredan 61 fijo en vez de 61×fy → demasiado pequeña).
    const PASTILLA_FREEMIUM_DEFAULT_H = 61;
    for (const [role, p] of Object.entries(block)) {
      const np = { ...p };
      if (role === 'PASTILLA_FREEMIUM' && typeof np.pastillaH !== 'number') {
        np.pastillaH = PASTILLA_FREEMIUM_DEFAULT_H;
      }
      if (typeof p.x         === 'number') np.x         = Math.round(p.x * fx);
      if (typeof p.y         === 'number') np.y         = Math.round(p.y * fy);
      if (typeof p.zoneY     === 'number') np.zoneY     = Math.round(p.zoneY * fy);
      if (typeof p.zoneH     === 'number') np.zoneH     = Math.round(p.zoneH * fy);
      if (typeof np.pastillaH === 'number') np.pastillaH = Math.round(np.pastillaH * fy);
      // scaleX/scaleY solo para imágenes/logos; el texto escala vía text.size
      if (!p.text) {
        if (typeof p.scaleX === 'number') np.scaleX = Math.round(p.scaleX * fx * 10) / 10;
        if (typeof p.scaleY === 'number') np.scaleY = Math.round(p.scaleY * fy * 10) / 10;
      } else {
        np.text = { ...p.text };
        if (typeof p.text.size === 'number') np.text.size = Math.round(p.text.size * fy);
      }
      out[role] = np;
    }
    return out;
  }

  function _deriveBlock(base, fid) {
    const d = DERIVE[fid];
    if (!d || !base[d.from]) return null;
    return _scaleBlock(base[d.from], d.fx, d.fy);
  }

  function _augmentPreset(base) {
    let out = { ...base };
    // Paso 1: si no hay MOVIL TXT pero sí MUX4 TXT, derivar MOVIL TXT desde MUX4.
    // Así las versiones "MUX4-only" funcionan también en MOVIL TXT y SMARTPHONE TEXT.
    if (!out['MOVIL TXT'] && out['MUX4 TXT']) {
      out['MOVIL TXT'] = _scaleBlock(out['MUX4 TXT'], MOVIL_FALLBACK_FROM_MUX4.fx, MOVIL_FALLBACK_FROM_MUX4.fy);
    }
    // Paso 2: derivar TEXTO HORIZONTAL y TEXTO VERTICAL desde su origen
    for (const fid of Object.keys(DERIVE)) {
      const b = _deriveBlock(out, fid);
      if (b) out[fid] = b;
    }
    return out;
  }

  // ── APLICAR PRESET ────────────────────────────────────────

  function applyPreset(type, version, format = State.activeFormat) {
    // Caso especial "ninguna": resetea la maquetación a "solo título"
    if (type === 'ninguna') {
      if (typeof History !== 'undefined') History.push();
      State.layoutConfig[format] = { type, version };
      State.dirty = true;
      // Elimina capas auto-generadas (textos, logos…) de ESTE formato
      State.layers = State.layers.filter(l => !(l._layoutGenerated && l.exclusiveFormat === format));
      // Reposiciona la imagen de título usando TITLE_FIT_ZONES si la hay
      const title = (typeof Formats !== 'undefined' && Formats.getActiveTitleForFormat)
        ? Formats.getActiveTitleForFormat(format) : State.layers.find(l => l.isTitleLayer);
      if (title && typeof Layers !== 'undefined' && Layers.applyTitleFitZones) {
        Layers.applyTitleFitZones(title);
      }
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
      return;
    }
    // Validamos antes de empujar al historial — sin esto, una key desconocida
    // gasta un slot de undo en una operación que termina siendo no-op.
    const presetKey  = `${type}_${version}`;
    const basePreset = PRESETS[presetKey];
    if (!basePreset) {
      console.warn(`[Layout] Preset desconocido: ${presetKey}`);
      return;
    }
    // Opción A — paridad total: derivar por escala los presets de los formatos nuevos
    const preset = _augmentPreset(basePreset);

    if (typeof History !== 'undefined') History.push();

    // Maquetación INDEPENDIENTE por formato
    State.layoutConfig[format] = { type, version };
    State.dirty = true;

    // 1. Eliminar solo las capas de maquetación de ESTE formato
    State.layers = State.layers.filter(l => !(l._layoutGenerated && l.exclusiveFormat === format));

    // Solo se maqueta el formato activo
    const FORMAT_IDS   = [format];
    const masterFormat = format;
    const masterDefs   = preset[format];
    if (!masterDefs) {
      // Esta tipología/versión no define este formato → queda limpio.
      // Ocultar TODAS las capas de título (H y V) en este formato para que no se
      // quede una imagen colgada de la maquetación anterior.
      State.layers.filter(l => l.isTitleLayer).forEach(tl => {
        if (!State.formatParams[format]) State.formatParams[format] = {};
        if (!State.formatParams[format][tl.id]) State.formatParams[format][tl.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
        State.formatParams[format][tl.id].visible = false;
      });
      console.warn(`[Layout] El preset "${type}_${version}" no define ${format} — formato queda sin maquetación.`);
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
      return;
    }

    // Punto de inserción: justo debajo de las capas de sistema (después de isTitleLayer)
    let insertIdx = 0;
    while (insertIdx < State.layers.length && (
      State.layers[insertIdx].isComposicion ||
      State.layers[insertIdx].isComposicionMovil ||
      State.layers[insertIdx].isComposicionAmazon ||
      State.layers[insertIdx].isMarcaIplus ||
      State.layers[insertIdx].isMarcaSony ||
      State.layers[insertIdx].isTitleLayer
    )) { insertIdx++; }

    // Crear cada capa definida en el preset (excepto IMAGEN_TITULO y PASTILLA_FREEMIUM)
    const isPartners = type === 'partners';
    // Tiene sección MOVIL TXT propia si el preset la define explícitamente
    const hasMovilDefs = !!preset['MOVIL TXT'];
    const createdLayers = [];
    const layerCreationPromises = [];

    FORMAT_IDS.forEach(fid => {
      // Solo iterar MOVIL TXT si tiene definición propia
      if (fid === 'MOVIL TXT' && !hasMovilDefs) return;
      if (fid === 'TEXTO VERTICAL' && !hasMovilDefs) return;
      const fmtDefs = preset[fid] || masterDefs;
      Object.entries(fmtDefs).forEach(([role, params]) => {
        if (role === 'IMAGEN_TITULO')     return;
        if (role === 'PASTILLA_FREEMIUM') return;
        const exclusiveFormat = fid;

        if (params.logo) {
          const p = _makeLogoLayer(role + `_${fid}`, params, exclusiveFormat).then(layer => {
            createdLayers.push({ layer, params, role, fid });
          });
          layerCreationPromises.push(p);
        } else if (params.imagePath) {
          const p = _makeImageLayer(role + `_${fid}`, params, exclusiveFormat).then(layer => {
            createdLayers.push({ layer, params, role, fid });
          });
          layerCreationPromises.push(p);
        } else {
          const layer = _makeLayer(role, params, exclusiveFormat);
          createdLayers.push({ layer, params, role, fid });
        }
      });
    });

    // Esperar a que los logos carguen antes de insertar
    Promise.all(layerCreationPromises).then(() => {
      // Reinsertar capas en orden correcto
      createdLayers.reverse().forEach(({ layer }) => {
        State.layers.splice(insertIdx, 0, layer);
      });
      createdLayers.reverse(); // restaurar orden para formatParams

      // Enlazar automáticamente capas de precio solo en upsell_precio
      const PRICE_ROLES = ['PRECIO', 'SIMBOLO_EURO', 'MES', 'PASTILLA_ACTIVAR'];
      const priceLayers = createdLayers
        .filter(({ role }) => PRICE_ROLES.includes(role))
        .map(({ layer }) => layer.id);
      if (priceLayers.length >= 3 && typeof Formats !== 'undefined' &&
          typeof Layout !== 'undefined' && Layout.isUpsellPrecio()) {
        Formats.linkLayers(priceLayers);
      }

      // 3. Aplicar posiciones en formatParams
      createdLayers.forEach(({ layer, params, role, fid: layerFid }) => {
        const fmtParams = (preset[layerFid] && preset[layerFid][role]) || params;
        if (!State.formatParams[layerFid]) State.formatParams[layerFid] = {};
        State.formatParams[layerFid][layer.id] = {
          scaleX:   fmtParams.scaleX   ?? 100,
          scaleY:   fmtParams.scaleY   ?? 100,
          rotation: 0,
          x:        fmtParams.x        ?? 0,
          y:        fmtParams.y        ?? 0,
        };
      });

      // 4. Imagen de título — usar el ACTIVO para este formato (H o V con fallback).
      // Si el preset no incluye IMAGEN_TITULO, ocultar TODAS las capas de título en este
      // formato (H y V), no solo la activa, para que no quede una imagen colgada.
      const titleLayer = (typeof Formats !== 'undefined' && Formats.getActiveTitleForFormat)
        ? Formats.getActiveTitleForFormat(format) : State.layers.find(l => l.isTitleLayer);
      const allTitleLayers = State.layers.filter(l => l.isTitleLayer);
      if (titleLayer) {
        if (masterDefs['IMAGEN_TITULO']) {

          FORMAT_IDS.forEach(fid => {
            // Usar la definición específica del formato si existe, si no la de MUX4 TXT
            const titleDef = (preset[fid] && preset[fid]['IMAGEN_TITULO']) || masterDefs['IMAGEN_TITULO'];
            const fmtW = State.formatSizes[fid]?.w;
            const fmtH = State.formatSizes[fid]?.h;
            if (!fmtW || !fmtH) return;
            const imgW = titleLayer.naturalWidth;
            const imgH = titleLayer.naturalHeight;
            if (!imgW || !imgH) return;

            if (!State.formatParams[fid]) State.formatParams[fid] = {};

            // Preset de Partners: zona verde definida con zoneY y zoneH
            if (titleDef.zoneY !== undefined && titleDef.zoneH !== undefined) {
              const zoneH  = titleDef.zoneH;
              const zoneY  = titleDef.zoneY;
              const MARGIN = 4;

              // Escalar para ocupar todo el alto de la zona verde
              let scale = ((zoneH - MARGIN * 2) / imgH) * 100;
              // Si con ese alto se sale del ancho seguro, reducir por ancho
              const SAFE_MARGIN_X = fid === 'MUX4 TXT' ? 40 : fid === 'TEXTO HORIZONTAL' ? 98 : fid === 'TEXTO VERTICAL' ? 36 : 48;
              const safeW = fmtW - SAFE_MARGIN_X * 2;
              if (imgW * (scale / 100) > safeW) {
                scale = (safeW / imgW) * 100;
              }

              State.formatParams[fid][titleLayer.id] = {
                scaleX: Math.round(scale * 10) / 10,
                scaleY: Math.round(scale * 10) / 10,
                rotation: 0,
                x: 0,
                y: Math.round(zoneY),
                visible: true,
              };

            } else {
              // Cálculo dinámico estándar (cine, deportes)
              const SAFE_MARGIN_X = fid === 'MUX4 TXT' ? 40 : fid === 'TEXTO HORIZONTAL' ? 98 : fid === 'TEXTO VERTICAL' ? 36 : 48;
              const safeW = fmtW - SAFE_MARGIN_X * 2;
              let scale = (safeW / imgW) * 100;
              let scaledH = imgH * (scale / 100);

              const textParams = createdLayers.map(({ layer: cl }) =>
                State.formatParams[fid]?.[cl.id]
              ).filter(Boolean);

              let yTop    = -fmtH / 2;
              let yBottom =  fmtH / 2;
              const MARGIN = 4;

              if (textParams.length > 0) {
                const yValues = textParams.map(p => p.y);
                const minY = Math.min(...yValues);
                const maxY = Math.max(...yValues);
                const TEXT_H = 40;
                yTop    = minY - TEXT_H / 2 + MARGIN;
                yBottom = maxY + TEXT_H / 2 - MARGIN;
              }

              const availableH = Math.abs(yBottom - yTop);
              if (scaledH > availableH) {
                scale = (availableH / imgH) * 100;
                scaledH = availableH;
              }

              let centerY = (yTop + yBottom) / 2;
              if (textParams.length === 0) {
                const presetY = titleDef.y;
                if (presetY !== undefined) centerY = presetY;
              }

              State.formatParams[fid][titleLayer.id] = {
                scaleX: Math.round(scale * 10) / 10,
                scaleY: Math.round(scale * 10) / 10,
                rotation: 0, x: 0,
                y: Math.round(centerY),
                visible: true,
              };
            }
            // Ocultar las OTRAS capas de título (no activas) en este formato
            allTitleLayers.filter(tl => tl !== titleLayer).forEach(tl => {
              if (!State.formatParams[fid][tl.id]) State.formatParams[fid][tl.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
              State.formatParams[fid][tl.id].visible = false;
            });
          });
        } else {
          // Ocultar TODAS las imágenes de título (H y V) en los formatos de texto
          FORMAT_IDS.forEach(fid => {
            if (!State.formatParams[fid]) State.formatParams[fid] = {};
            allTitleLayers.forEach(tl => {
              if (!State.formatParams[fid][tl.id]) State.formatParams[fid][tl.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
              State.formatParams[fid][tl.id].visible = false;
            });
          });
        }
      }

      // ── Regenerar la composición horneada del formato ─────
      // Sin esto, los formatos receptores (199 PUBLI, etc.) usan la composición
      // VIEJA hasta que el usuario vuelve a entrar al maestro. Forzamos la
      // regeneración aquí y reposicionamos antes de renderizar.
      (async () => {
        try {
          if (format === 'MUX4 TXT' && typeof Composicion !== 'undefined') {
            await Composicion.generate();
          } else if (format === 'MOVIL TXT' && typeof ComposicionMovil !== 'undefined') {
            await ComposicionMovil.generate();
          } else if (format === 'AMAZON LOGO' && typeof ComposicionAmazon !== 'undefined') {
            await ComposicionAmazon.generate();
          } else if (format === 'TEXTO HORIZONTAL' && typeof ComposicionTexto !== 'undefined') {
            await ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH');
            const c = State.layers.find(l => l.isComposicionTextoH);
            if (c && typeof AutoLayout !== 'undefined' && AutoLayout.repositionTextComp) AutoLayout.repositionTextComp(c, 'H');
          } else if (format === 'TEXTO VERTICAL' && typeof ComposicionTexto !== 'undefined') {
            await ComposicionTexto.generate('TEXTO VERTICAL', 'COMPOSICIÓN TEXTO VERTICAL', 'isComposicionTextoV');
            const c = State.layers.find(l => l.isComposicionTextoV);
            if (c && typeof AutoLayout !== 'undefined' && AutoLayout.repositionTextComp) AutoLayout.repositionTextComp(c, 'V');
          }
        } catch (e) {
          console.warn('[Layout] Error regenerando composición tras applyPreset:', e);
        }
        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof Layers !== 'undefined') Layers.render();
      })();
    });
  }

  // Crea un objeto capa de texto con los parámetros del preset
  function _makeLayer(role, params, exclusiveFormat) {
    const textCfg = params.text || {};
    return {
      id:      'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name:    role,
      type:    'text',
      visible: true,
      exclusiveFormat: exclusiveFormat,
      _layoutGenerated: true,   // marca para poder eliminar en el próximo applyPreset
      naturalWidth:  200,
      naturalHeight: 60,
      params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
      textParams: {
        size:     textCfg.size     ?? 48,
        align:    textCfg.align    ?? 'left',
        leading:  textCfg.leading  ?? 120,
        tracking: textCfg.tracking ?? 0,
        runs: [{
          family:  textCfg.family  ?? 'Apercu Movistar',
          weight:  textCfg.weight  ?? '400',
          style:   'normal',
          color:   textCfg.color   ?? '#ffffff',
          text:    textCfg.placeholder ?? role,
          size:    textCfg.runSize ?? null,
        }],
      },
    };
  }

  // Crea una capa de imagen genérica (no logo, sin tint)
  function _makeImageLayer(role, params, exclusiveFormat) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const finish = (src, w, h) => {
        resolve({
          id:            'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name:          role,
          src:           src,
          visible:       true,
          exclusiveFormat: exclusiveFormat,
          _layoutGenerated: true,
          naturalWidth:  w,
          naturalHeight: h,
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
        });
      };
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width  = img.naturalWidth  || 114;
        cv.height = img.naturalHeight || 27;
        cv.getContext('2d').drawImage(img, 0, 0);
        let dataUrl;
        try { dataUrl = cv.toDataURL('image/png'); } catch(e) { dataUrl = params.imagePath; }
        finish(dataUrl, cv.width, cv.height);
      };
      img.onerror = () => finish(params.imagePath, 114, 27);
      img.src = params.imagePath;
    });
  }

  // Crea una capa de logo cargando la imagen desde la ruta del preset
  function _makeLogoLayer(role, params, exclusiveFormat) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const finish = (src, w, h) => {
        resolve({
          id:            'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name:          role,
          src:           src,
          isLogo:        true,
          logoPath:      params.logoPath,
          visible:       true,
          exclusiveFormat: exclusiveFormat,
          _layoutGenerated: true,
          naturalWidth:  w,
          naturalHeight: h,
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
        });
      };
      const isSVG = params.logoPath.toLowerCase().endsWith('.svg');
      img.onload = () => {
        const natW = img.naturalWidth  || 200;
        const natH = img.naturalHeight || 200;
        if (isSVG) {
          // SVG: usar ruta directa sin rasterizar — calidad vectorial perfecta
          finish(params.logoPath, natW, natH);
        } else {
          const cv = document.createElement('canvas');
          cv.width  = natW;
          cv.height = natH;
          cv.getContext('2d').drawImage(img, 0, 0);
          let dataUrl;
          try { dataUrl = cv.toDataURL('image/png'); } catch(e) { dataUrl = params.logoPath; }
          finish(dataUrl, natW, natH);
        }
      };
      img.onerror = () => finish(params.logoPath, 200, 200);
      img.src = params.logoPath;
    });
  }

  // Devuelve el role almacenado en la capa (su nombre, que es el role)
  function _roleOf(layer) { return layer.name; }

  // ── MODAL ─────────────────────────────────────────────────

  function _createModal() {
    if (document.getElementById('layout-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'layout-modal';
    modal.className = 'layout-modal-overlay';
    modal.innerHTML = `
      <div class="layout-modal-box">
        <div class="layout-modal-header">
          <span class="layout-modal-title">Maquetación automática</span>
          <button class="layout-modal-close" id="layout-modal-close">&#x2715;</button>
        </div>
        <div class="layout-modal-body" id="layout-modal-body">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('layout-modal-close').addEventListener('click', closeModal);
    // Cerrar al hacer click en el overlay
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  }

  function _renderModal() {
    const body = document.getElementById('layout-modal-body');
    if (!body) return;

    const _modalCfg      = _cfg(State.activeFormat);
    const currentType    = _modalCfg.type;
    const currentVersion = _modalCfg.version;

    const currentVersionLabel = currentType && currentVersion
      ? (VERSIONES[currentType] || []).find(v => v.id === currentVersion)?.label || '— Selecciona —'
      : '— Selecciona —';

    body.innerHTML = `
      <div class="layout-modal-section">
        <div class="layout-modal-label">Tipología</div>
        <div class="layout-modal-pills" id="layout-tipo-pills">
          ${TIPOS.map(t => `
            <button class="layout-pill${currentType === t.id ? ' active' : ''}" data-tipo="${t.id}">
              ${t.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="layout-modal-section" id="layout-version-section" style="${currentType ? '' : 'display:none'}">
        <div class="layout-modal-label">Versión</div>
        <div class="custom-select" id="layout-version-dropdown">
          <div class="custom-select-trigger">
            <span class="custom-select-value" id="layout-version-value">${currentVersionLabel}</span>
            <span class="custom-select-arrow">&#9660;</span>
          </div>
          <div class="custom-select-options" id="layout-version-options"></div>
        </div>
      </div>
      <div class="layout-modal-footer">
        <button class="layout-modal-btn-apply" id="layout-btn-apply" ${currentType && currentVersion ? '' : 'disabled'}>
          Aplicar maquetación
        </button>
      </div>
    `;

    // Bind tipo
    body.querySelectorAll('[data-tipo]').forEach(btn => {
      btn.addEventListener('click', () => {
        body.querySelectorAll('[data-tipo]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tipo = btn.dataset.tipo;
        document.getElementById('layout-version-section').style.display = '';
        _buildVersionDropdown(tipo, null);
        document.getElementById('layout-btn-apply').disabled = true;
      });
    });

    // Construir dropdown si ya hay tipo seleccionado
    if (currentType) _buildVersionDropdown(currentType, currentVersion);

    // Bind apply
    document.getElementById('layout-btn-apply').addEventListener('click', () => {
      const tipoBtn = body.querySelector('[data-tipo].active');
      const vValue  = body.querySelector('#layout-version-dropdown')?.dataset.selected;
      if (!tipoBtn || !vValue) return;
      applyPreset(tipoBtn.dataset.tipo, vValue, State.activeFormat);
      closeModal();
    });
  }

  function _buildVersionDropdown(tipo, currentVersion) {
    const dropdown  = document.getElementById('layout-version-dropdown');
    const optionsEl = document.getElementById('layout-version-options');
    const valueEl   = document.getElementById('layout-version-value');
    if (!dropdown || !optionsEl || !valueEl) return;

    const versiones = VERSIONES[tipo] || [];
    optionsEl.innerHTML = '';

    versiones.forEach(v => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option' + (currentVersion === v.id ? ' selected' : '');
      opt.textContent = v.label;
      opt.dataset.id = v.id;
      opt.addEventListener('click', () => {
        optionsEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        // Re-buscar el span vivo: el trigger se clona más abajo y deja huérfano a valueEl
        const ve = document.getElementById('layout-version-value');
        if (ve) ve.textContent = v.label;
        dropdown.dataset.selected = v.id;
        dropdown.classList.remove('open');
        document.getElementById('layout-btn-apply').disabled = false;
      });
      optionsEl.appendChild(opt);
    });

    // Inicializar valor si hay versión actual
    if (currentVersion) {
      dropdown.dataset.selected = currentVersion;
    } else {
      valueEl.textContent = '— Selecciona —';
      delete dropdown.dataset.selected;
    }

    // Abrir/cerrar
    const trigger = dropdown.querySelector('.custom-select-trigger');
    // Limpiar listeners previos clonando el nodo
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    newTrigger.addEventListener('click', () => dropdown.classList.toggle('open'));

    // Cerrar al hacer click fuera — sustituimos el listener anterior si quedaba
    // alguno colgado de una apertura previa del modal.
    if (_dropdownOutsideClick) {
      document.removeEventListener('click', _dropdownOutsideClick);
    }
    _dropdownOutsideClick = (e) => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    };
    document.addEventListener('click', _dropdownOutsideClick);
  }

  // ── SERIALIZACIÓN ─────────────────────────────────────────

  function serialize() {
    return { byFormat: State.layoutConfig };
  }

  function restore(data) {
    if (!data) return;
    if (data.byFormat) {
      // Proyecto nuevo: config por formato
      State.layoutConfig = data.byFormat;
    } else if (data.type) {
      // Proyecto antiguo: config global → aplicarla a los formatos de texto del mockup
      State.layoutConfig = {
        'MUX4 TXT':  { type: data.type, version: data.version || null },
        'MOVIL TXT': { type: data.type, version: data.version || null },
      };
    } else {
      State.layoutConfig = {};
    }
  }

  return {
    init, onFormatActivated, openModal, closeModal,
    getType, getVersion, isFreemium, isUpsell, isUpsellPrecio, getPreset,
    applyPreset, serialize, restore,
    LAYOUT_FORMATS,
  };

})();
