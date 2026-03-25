// ============================================================
// TEXT-LAYERS.JS — Capas de texto
// ============================================================

const TextLayers = (() => {
  const SPECIAL_FORMATS = ['MUX4 TXT', 'MOVIL TXT'];

  let _activeLayerId = null;
  let _draggingPanel = false;
  let _panelOffX = 0, _panelOffY = 0;

  // Pesos disponibles por familia
  const WEIGHTS_APERCU = [
    { val: '300|normal',  label: 'Light' },
    { val: '300|italic',  label: 'Light Italic' },
    { val: '400|normal',  label: 'Regular' },
    { val: '400|italic',  label: 'Regular Italic' },
    { val: '700|normal',  label: 'Bold' },
    { val: '700|italic',  label: 'Bold Italic' },
    { val: '900|normal',  label: 'Black' },
    { val: '900|italic',  label: 'Black Italic' },
  ];

  const WEIGHTS_MOVISTAR_SANS = [
    { val: '300|normal',  label: 'Light' },
    { val: '400|normal',  label: 'Regular' },
    { val: '500|normal',  label: 'Medium' },
    { val: '700|normal',  label: 'Bold' },
    { val: '800|normal',  label: 'Extrabold' },
  ];

  const WEIGHTS_MOVISTAR = [
    { val: '500|normal',  label: 'Medium' },
    { val: '700|normal',  label: 'Bold' },
  ];

  const WEIGHTS_SYSTEM = [
    { val: '400|normal',  label: 'Regular' },
    { val: '400|italic',  label: 'Italic' },
    { val: '700|normal',  label: 'Bold' },
    { val: '700|italic',  label: 'Bold Italic' },
  ];

  function init() {
    document.getElementById('btn-add-texto')
      ?.addEventListener('click', _createTextLayer);
    document.getElementById('text-editor-close')
      ?.addEventListener('click', closePanel);

    _bindPanelControls();
    _bindPanelDrag();
  }

  // ── CREAR CAPA DE TEXTO ───────────────────────────────────

  function _createTextLayer() {
    const layer = {
      id:      'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name:    'Texto',
      type:    'text',
      visible: true,
      exclusiveFormat: SPECIAL_FORMATS.includes(State.activeFormat) ? State.activeFormat : null,
      naturalWidth:  200,
      naturalHeight: 60,
      params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
      textParams: {
        content: 'Texto',
        family:  'Apercu Movistar',
        weight:  '400',
        style:   'normal',
        size:    48,
        align:   'left',
        color:   '#ffffff',
      },
    };

    const _ci = State.layers[0]?.isComposicion ? 1 : 0;
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
    if (!layer || layer.type !== 'text') return;

    _activeLayerId = layerId;
    const tp = layer.textParams;

    document.getElementById('text-family').value = tp.family;
    document.getElementById('text-size').value           = tp.size;
    document.getElementById('text-color').value          = tp.color;

    _updateWeightOptions(tp.family, tp.weight + '|' + tp.style);

    document.querySelectorAll('.btn-text-align').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === tp.align);
    });

    document.getElementById('text-editor-panel').classList.add('visible');
  }

  function closePanel() {
    document.getElementById('text-editor-panel').classList.remove('visible');
    _activeLayerId = null;
  }

  function _updateWeightOptions(family, selectedVal) {
    const select  = document.getElementById('text-weight');
    let weights;
    if (family === 'Apercu Movistar')  weights = WEIGHTS_APERCU;
    else if (family === 'Movistar Sans') weights = WEIGHTS_MOVISTAR_SANS;
    else if (family === 'Movistar')      weights = WEIGHTS_MOVISTAR;
    else                                 weights = WEIGHTS_SYSTEM;
    select.innerHTML = '';
    weights.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.val;
      opt.textContent = w.label;
      if (w.val === selectedVal) opt.selected = true;
      select.appendChild(opt);
    });
    if (!select.value) select.selectedIndex = 0;
  }

  // ── CONTROLES DEL PANEL ───────────────────────────────────

  function _bindPanelControls() {
    // Snapshot al empezar a editar
    document.getElementById('text-editor-content')?.addEventListener('focus', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-size')?.addEventListener('focus', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-color')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-family')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-weight')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });

    document.getElementById('text-editor-content')?.addEventListener('input', e => {
      _updateTextParam('content', e.target.value);
      // Sincronizar con div editable en viewport
      const el = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
      if (el && el.contentEditable === 'true') el.textContent = e.target.value;
    });

    document.getElementById('text-family')?.addEventListener('change', e => {
      const family = e.target.value;
      _updateTextParam('family', family);
      const layer = State.layers.find(l => l.id === _activeLayerId);
      const tp = layer?.textParams;
      _updateWeightOptions(family, tp ? tp.weight + '|' + tp.style : '400|normal');
      // Guardar el peso que quedó seleccionado tras el cambio de familia
      const weightSelect = document.getElementById('text-weight');
      if (weightSelect?.value) {
        const [weight, style] = weightSelect.value.split('|');
        _updateTextParam('weight', weight);
        _updateTextParam('style',  style);
      }
    });

    document.getElementById('text-weight')?.addEventListener('change', e => {
      const [weight, style] = e.target.value.split('|');
      _updateTextParam('weight', weight);
      _updateTextParam('style',  style);
    });

    document.getElementById('text-size')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (!isNaN(val) && val > 0) _updateTextParam('size', val);
    });

    document.getElementById('text-color')?.addEventListener('input', e => {
      _updateTextParam('color', e.target.value);
    });

    document.querySelectorAll('.btn-text-align').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof History !== 'undefined') History.push();
        document.querySelectorAll('.btn-text-align').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _updateTextParam('align', btn.dataset.align);
      });
    });
  }

  function _updateTextParam(key, value) {
    if (!_activeLayerId) return;
    const layer = State.layers.find(l => l.id === _activeLayerId);
    if (!layer || !layer.textParams) return;
    layer.textParams[key] = value;

    // Si es contenido, sincronizar con el div editable en el viewport
    if (key === 'content') {
      const el = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
      if (el && el.contentEditable !== 'true') el.textContent = value;
    }

    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  // ── DRAG DEL PANEL ────────────────────────────────────────

  function _bindPanelDrag() {
    const header = document.getElementById('text-editor-header');
    const panel  = document.getElementById('text-editor-panel');
    if (!header || !panel) return;

    header.addEventListener('mousedown', e => {
      if (e.target.id === 'text-editor-close') return;
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

  return { init, openPanel, closePanel };
})();
