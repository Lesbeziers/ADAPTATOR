// ============================================================
// SOLID-LAYERS.JS — Capas de color sólido
// ============================================================

const SolidLayers = (() => {
  const SPECIAL_FORMATS = ['MUX4 TXT', 'MOVIL TXT', 'AMAZON LOGO'];

  let _activeLayerId = null;
  let _draggingPanel = false;
  let _panelOffX = 0, _panelOffY = 0;

  function init() {
    document.getElementById('btn-add-solido')
      ?.addEventListener('click', _createSolidLayer);

    document.getElementById('solid-editor-close')
      ?.addEventListener('click', closePanel);

    _bindPanelControls();
    _bindPanelDrag();
  }

  // ── CREAR CAPA SÓLIDO ─────────────────────────────────────

  function _createSolidLayer() {
    // Tamaño por defecto = tamaño del formato activo o 1920x1080
    const size = State.activeFormat
      ? (State.formatSizes[State.activeFormat] || { w: 1920, h: 1080 })
      : { w: 1920, h: 1080 };

    const layer = {
      id:      'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name:    'Sólido',
      type:    'solid',
      visible: true,
      exclusiveFormat: SPECIAL_FORMATS.includes(State.activeFormat) ? State.activeFormat : null,
      naturalWidth:  size.w,
      naturalHeight: size.h,
      params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
      solidParams: {
        color:  '#000000',
        width:  size.w,
        height: size.h,
        radius: 0,
      },
    };

    let _ci = 0;
    while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isMarcaIplus || State.layers[_ci].isTitleLayer)) {
      _ci++;
    }
    if (typeof History !== 'undefined') History.push();
    State.layers.splice(_ci, 0, layer);
    State.selectedLayerId  = layer.id;
    State.selectedLayerIds = [layer.id];

    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();

    openPanel(layer.id);
  }

  // ── PANEL FLOTANTE ────────────────────────────────────────

  function openPanel(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'solid') return;

    _activeLayerId = layerId;
    const sp = layer.solidParams;

    document.getElementById('solid-width').value  = Math.round(sp.width);
    document.getElementById('solid-height').value = Math.round(sp.height);
    document.getElementById('solid-color').value  = sp.color;
    document.getElementById('solid-radius').value = sp.radius ?? 0;

    document.getElementById('solid-editor-panel').classList.add('visible');
  }

  function closePanel() {
    document.getElementById('solid-editor-panel').classList.remove('visible');
    _activeLayerId = null;
  }

  // Llamado desde canvas cuando se cambia la escala externamente
  function syncFromLayer(layerId) {
    if (_activeLayerId !== layerId) return;
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || !layer.solidParams) return;
    document.getElementById('solid-width').value  = Math.round(layer.solidParams.width);
    document.getElementById('solid-height').value = Math.round(layer.solidParams.height);
  }

  // ── CONTROLES DEL PANEL ───────────────────────────────────

  function _bindPanelControls() {
    // Snapshot al empezar a editar
    ['solid-width', 'solid-height', 'solid-radius'].forEach(id => {
      document.getElementById(id)?.addEventListener('focus', () => {
        if (typeof History !== 'undefined') History.push();
      });
    });
    document.getElementById('solid-color')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });

    // Ancho
    document.getElementById('solid-width')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (isNaN(val) || val <= 0) return;
      _updateSolidParam('width', val);
    });

    // Alto
    document.getElementById('solid-height')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (isNaN(val) || val <= 0) return;
      _updateSolidParam('height', val);
    });

    // Radio
    document.getElementById('solid-radius')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val >= 0) _updateSolidParam('radius', val);
    });

    // Color
    document.getElementById('solid-color')?.addEventListener('input', e => {
      _updateSolidParam('color', e.target.value);
    });
  }

  function _updateSolidParam(key, value) {
    if (!_activeLayerId) return;
    const layer = State.layers.find(l => l.id === _activeLayerId);
    if (!layer || !layer.solidParams) return;

    layer.solidParams[key] = value;

    // Actualizar naturalWidth/Height para que la escala funcione bien
    if (key === 'width')  layer.naturalWidth  = value;
    if (key === 'height') layer.naturalHeight = value;

    // Resetear scaleX/Y a 100% para que el tamaño real = lo indicado
    if (State.activeFormat) {
      Formats.setLayerParam(State.activeFormat, layer.id, 'scaleX', 100);
      Formats.setLayerParam(State.activeFormat, layer.id, 'scaleY', 100);
    }

    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();
  }

  // ── DRAG DEL PANEL ────────────────────────────────────────

  function _bindPanelDrag() {
    const header = document.getElementById('solid-editor-header');
    const panel  = document.getElementById('solid-editor-panel');
    if (!header || !panel) return;

    header.addEventListener('mousedown', e => {
      if (e.target.id === 'solid-editor-close') return;
      _draggingPanel = true;
      _panelOffX = e.clientX - panel.offsetLeft;
      _panelOffY = e.clientY - panel.offsetTop;
      document.body.classList.add('layer-dragging');
    });

    document.addEventListener('mousemove', e => {
      if (!_draggingPanel) return;
      panel.style.left  = (e.clientX - _panelOffX) + 'px';
      panel.style.top   = (e.clientY - _panelOffY) + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (_draggingPanel) {
        _draggingPanel = false;
        document.body.classList.remove('layer-dragging');
      }
    });
  }

  return { init, openPanel, closePanel, syncFromLayer };
})();
