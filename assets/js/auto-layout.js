// ============================================================
// AUTO-LAYOUT.JS — Motor de maquetación automática
// ============================================================

const AutoLayout = (() => {

  // ── PALABRAS CLAVE PARA DETECCIÓN DE ROL ─────────────────
  const ROLE_KEYWORDS = {
    background: ['FONDO', 'BACKGROUND', 'BG_'],
    subject:    ['MUJER', 'HOMBRE', 'PERSONA', 'SUBJECT', 'FIGURA',
                 'ACTOR', 'ACTRIZ', 'ARTISTA', 'PROTAGONISTA', 'IMAGEN', 'IMAGE'],
    title:      ['TITULO', 'TITLE', 'TITTLE', 'COMPOSICION_TEXTO', 'COMP_TEXTO'],
  };

  // ── CONFIGURACIÓN DE ZONAS POR FORMATO ───────────────────
  // textZone:    zona donde se coloca el TÍTULO (proporcional 0-1)
  // focusZone:   zona donde se ancla el SUJETO (proporcional 0-1)
  // anchorPoint: punto de interés del asset (cara, objeto principal) en el asset
  // crop:        parámetros de escala en modo CROP
  // fit:         parámetros de escala en modo FIT
  const FORMAT_CONFIG = {
    '199 PUBLI': {
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
    },
    'AD PAUSE': {
      variants: {
        A: {
          label: 'Centro / Título abajo',
          textZone:  { x: 0.188, y: 0.582, w: 0.677, h: 0.357 },
          focusZone: { x: 0.229, y: 0.000, w: 0.595, h: 0.999 },
        },
        B: {
          label: 'Centro / Título arriba',
          textZone:  { x: 0.188, y: 0.060, w: 0.677, h: 0.357 },
          focusZone: { x: 0.229, y: 0.000, w: 0.595, h: 0.999 },
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
      textZone:    { x: 0.188, y: 0.582, w: 0.677, h: 0.357 },
      focusZone:   { x: 0.229, y: 0.000, w: 0.595, h: 0.999 },
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
    'IPLUS PUBLI': {
      variants: {
        A: {
          label: 'Centro / Título abajo',
          textZone:  { x: 0.287, y: 0.511, w: 0.674, h: 0.288 },
          focusZone: { x: 0.325, y: 0.000, w: 0.599, h: 0.823 },
        },
        B: {
          label: 'Centro / Título arriba',
          textZone:  { x: 0.287, y: 0.025, w: 0.674, h: 0.288 },
          focusZone: { x: 0.325, y: 0.000, w: 0.599, h: 0.823 },
        },
        C: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.265, y: 0.165, w: 0.337, h: 0.453 },
          focusZone: { x: 0.625, y: 0.000, w: 0.374, h: 0.823 },
        },
        D: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.647, y: 0.165, w: 0.337, h: 0.453 },
          focusZone: { x: 0.250, y: 0.000, w: 0.374, h: 0.823 },
        },
      },
      textZone:    { x: 0.287, y: 0.511, w: 0.674, h: 0.288 },
      focusZone:   { x: 0.325, y: 0.000, w: 0.599, h: 0.823 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
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

    'AMAZON BG': {
      variants: {
        A: {
          label: 'Imagen derecha',
          focusZone: { x: 0.420, y: 0.000, w: 0.500, h: 0.999 },
        },
      },
      textZone:    null,
      focusZone:   { x: 0.370, y: 0.000, w: 0.500, h: 0.999 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 2.50, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
    },

    'AMAZON LOGO': {
      textZone:    { x: 0.000, y: 0.020, w: 0.960, h: 0.500 },
      focusZone:   null,
      scaleModeDefault: 'fit',
      useTitleLayer: true,
    },

    'PERFIL': {
      textZone:    null,
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 1.000 },
      anchorPoint: { x: 0.50,  y: 0.33  },
      crop: { fill: 1.80, anchorFraction: 0.33 },
      fit:  { fill: 1.00, anchorFraction: 0.33 },
      scaleModeDefault: 'crop',
    },

    'SONY': {
      // 204×306. La franja MARCA SONY (capa fija) ocupa aprox la mitad inferior (y≈0.55–1.00).
      // Imagen principal: arriba, encima de la franja. Título: PNG importado, apoyado justo
      // encima de la franja (sobre la zona de seguridad). Sin COMPOSICION TITULO.
      textZone:    { x: 0.050, y: 0.400, w: 0.900, h: 0.150 },
      focusZone:   { x: 0.000, y: 0.000, w: 1.000, h: 0.550 },
      anchorPoint: { x: 0.50,  y: 0.20  },
      crop: { fill: 1.80, anchorFraction: 0.15 },
      fit:  { fill: 1.00, anchorFraction: 0.20 },
      scaleModeDefault: 'crop',
      useTitleLayer: true,
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

    'APPLE TV': {
      variants: {
        A: {
          label: 'Imagen derecha / Texto izquierda',
          textZone:  { x: 0.052, y: 0.203, w: 0.510, h: 0.438 },
          focusZone: { x: 0.454, y: 0.000, w: 0.545, h: 0.998 },
        },
        B: {
          label: 'Imagen izquierda / Texto derecha',
          textZone:  { x: 0.438, y: 0.203, w: 0.510, h: 0.438 },
          focusZone: { x: 0.001, y: 0.000, w: 0.545, h: 0.998 },
        },
        C: {
          label: 'Centro / Título abajo',
          textZone:  { x: 0.188, y: 0.582, w: 0.624, h: 0.340 },
          focusZone: { x: 0.229, y: 0.000, w: 0.542, h: 0.999 },
        },
        D: {
          label: 'Centro / Título arriba',
          textZone:  { x: 0.188, y: 0.078, w: 0.624, h: 0.340 },
          focusZone: { x: 0.229, y: 0.000, w: 0.542, h: 0.999 },
        },
      },
      textZone:    { x: 0.052, y: 0.203, w: 0.510, h: 0.438 },
      focusZone:   { x: 0.454, y: 0.000, w: 0.545, h: 0.998 },
      anchorPoint: { x: 0.50,  y: 0.22  },
      crop: { fill: 3.00, anchorFraction: 0.25 },
      fit:  { fill: 1.00, anchorFraction: 0.30 },
      scaleModeDefault: 'crop',
      hasMirror: true,
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
  function showRoleModal(layers, onConfirm) {
    // Solo capas de imagen (no texto, sólido, degradado, sistema)
    const imageLayers = layers.filter(l =>
      !['text', 'solid', 'gradient'].includes(l.type) &&
      !l.isComposicion && !l.isComposicionMovil && !l.isComposicionAmazon &&
      !l.isMarcaIplus && !l.isMarcaSony &&
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
    const roleOptions = [
      { value: 'background', label: 'FONDO' },
      { value: 'subject',    label: 'IMAGEN' },
      { value: 'title',      label: 'TÍTULO' },
      { value: null,         label: 'NINGUNO' },
    ];

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

    // Inicializar estado de escala, espejo y variante
    if (!_scaleMode[formatName]) _scaleMode[formatName] = cfg.scaleModeDefault;
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

    layers.forEach(layer => {
      const role = roles[layer.id];
      if (!role) return;

      if (role === 'background') {
        _applyBackground(formatName, layer, W, H, mirrored);
        // Enmascarar automáticamente si el formato lo requiere
        if (cfg.autoMaskBackground) {
          if (!State.formatMaskEnabled[formatName]) State.formatMaskEnabled[formatName] = {};
          State.formatMaskEnabled[formatName][layer.id] = true;
        }

      } else if (role === 'subject') {
        if (!scaleCfg) return; // formato sin crop/fit (ej. AMAZON LOGO — solo título)
        _applySubject(formatName, layer, W, H, cfg, scaleCfg, mirrored, focusZone);

      } else if (role === 'title') {
        // Si textZone es null, el formato no tiene zona de título (ej. FANART DEST.)
        if (textZone) {
          // cfg.useTitleLayer: formatos que usan isTitleLayer en vez de isComposicion
          const titleLayer = cfg.useTitleLayer
            ? (layers.find(l => l.isTitleLayer) || State.layers.find(l => l.isTitleLayer))
            : (layers.find(l => l.isComposicion) || State.layers.find(l => l.isComposicion));
          if (titleLayer) {
            _applyTitle(formatName, titleLayer, W, H, cfg, mirrored, textZone);
          }
        }
      }
    });
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

    // Fit dentro de la zona usando las dimensiones reales del contenido
    const scaleToFitW = zoneW / fitW;
    const scaleToFitH = zoneH / fitH;
    const scale = Math.min(scaleToFitW, scaleToFitH);

    const drawW = nw * scale;
    const drawH = nh * scale;

    // Centro del contenido real dentro del asset escalado
    const contentCxInDraw = cb ? (cb.x + cb.w / 2) * drawW : drawW / 2;
    const contentCyInDraw = cb ? (cb.y + cb.h / 2) * drawH : drawH / 2;

    // Centrar el CONTENIDO REAL en la zona (no el bounding box)
    const contentDrawX = zoneX + zoneW / 2;
    const contentDrawY = zoneY + zoneH / 2;

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
      if (l.isComposicion || l.isComposicionMovil || l.isComposicionAmazon ||
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
      const svg = await _loadSvgAsDataUrl('assets/img/coleccionM.svg');
      coleccion = {
        id: mkId('coleccion'), name: 'coleccionM', type: 'image', visible: true,
        exclusiveFormat: fmt, src: svg.dataUrl,
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

  // Llamado al importar imágenes por primera vez
  function onFirstImport(layers) {
    if (_rolesAssigned) return;
    showRoleModal(layers, roles => {
      // Guardar roles en State
      if (!State.layerRoles) State.layerRoles = {};
      Object.assign(State.layerRoles, roles);
      _rolesAssigned = true;

      // Aplicar maquetación a todos los formatos configurados
      if (typeof History !== 'undefined') History.push();
      Object.keys(FORMAT_CONFIG).forEach(formatName => {
        applyToFormat(formatName, roles, layers);
      });

      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
    });
  }

  // Botón AUTO en un formato concreto — resetea a la sugerencia
  function resetFormat(formatName) {
    const roles = State.layerRoles;
    if (!roles) return;
    // Incluir isComposicion para poder posicionarla con el rol title
    const layers = State.layers.filter(l =>
      !['text', 'solid', 'gradient'].includes(l.type) &&
      !l.isComposicionMovil && !l.isComposicionAmazon &&
      !l.isMarcaIplus && !l.isMarcaSony && l.src
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
      ['isTitleLayer','isComposicion','isComposicionMovil','isComposicionAmazon',
       'isMarcaSony','isMarcaIplus','exclusiveFormat','_layoutGenerated']
        .forEach(k => { if (layer[k]) item[k] = layer[k]; });
      out.layers.push(item);
    });
    console.log('[AutoLayout.dump]', out);
    console.log(JSON.stringify(out, null, 2));
    return out;
  }

  return {
    detectRole, onFirstImport, resetFormat,
    toggleScaleMode, toggleMirror, setVariant, getVariant, getVariants,
    getScaleMode, getMirrored, hasConfig, resetSession,
    showRoleModal,
    dump,
  };

})();
