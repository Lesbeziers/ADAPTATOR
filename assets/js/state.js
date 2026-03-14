// ============================================================
// STATE.JS — Modelo de datos central
// ============================================================

const State = {

  // Vista actual: 'editor' | 'all'
  view: 'editor',

  // Modalidad activa
  activeModality: null,

  // Formato activo
  activeFormat: null,

  // Capa seleccionada (principal)
  selectedLayerId: null,

  // Capas seleccionadas (selección múltiple con Shift)
  selectedLayerIds: [],

  // Capas del proyecto (compartidas entre todos los formatos)
  layers: [],

  // Parámetros por formato: { formatId: { layerId: { scale, rotation, opacity, blur, x, y } } }
  formatParams: {},

  // Formatos marcados como OK: { formatId: true/false }
  formatOk: {},

  // Overlays visibles
  overlays: { mockup: true, txt: true, foco: false },

  // Nombre del proyecto
  projectName: 'Sin título',

  // ¿Cambios sin guardar?
  dirty: false,

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
        'MOD N', 'MOD N'
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
