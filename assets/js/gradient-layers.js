// ============================================================
// GRADIENT-LAYERS.JS — Capas de degradado
// ============================================================

const GradientLayers = (() => {
  const SPECIAL_FORMATS = ['MUX4 TXT', 'MOVIL TXT', 'AMAZON LOGO'];

  let _activeLayerId = null;
  let _draggingPanel = false;
  let _panelOffX = 0, _panelOffY = 0;
  let _pickingMode = false;
  let _pickStep    = 0;

  function init() {
    document.getElementById('btn-add-degradado')
      ?.addEventListener('click', _createGradientLayer);
    document.getElementById('gradient-editor-close')
      ?.addEventListener('click', closePanel);
    _bindPanelControls();
    _bindPanelDrag();
    _bindPickMode();
  }

  // ── CREAR CAPA DEGRADADO ──────────────────────────────────

  function _createGradientLayer() {
    const size = State.activeFormat
      ? (State.formatSizes[State.activeFormat] || { w: 1920, h: 1080 })
      : { w: 1920, h: 1080 };

    const layer = {
      id:      'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name:    'Degradado',
      type:    'gradient',
      visible: true,
      exclusiveFormat: SPECIAL_FORMATS.includes(State.activeFormat) ? State.activeFormat : null,
      naturalWidth:  size.w,
      naturalHeight: size.h,
      params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
      gradientParams: {
        type:    'linear',
        angle:   90,
        color1:  '#000000',
        alpha1:  100,
        color2:  '#000000',
        alpha2:  0,
        x1: undefined, y1: undefined,
        x2: undefined, y2: undefined,
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

  // ── PANEL ─────────────────────────────────────────────────

  function openPanel(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'gradient') return;

    _activeLayerId = layerId;
    const gp = layer.gradientParams;

    document.getElementById('gradient-type').value          = gp.type;
    document.getElementById('gradient-angle').value         = gp.angle;
    document.getElementById('gradient-color1').value        = gp.color1;
    document.getElementById('gradient-alpha1').value        = gp.alpha1;
    document.getElementById('label-alpha1').textContent     = gp.alpha1 + '%';
    document.getElementById('gradient-color2').value        = gp.color2;
    document.getElementById('gradient-alpha2').value        = gp.alpha2;
    document.getElementById('label-alpha2').textContent     = gp.alpha2 + '%';

    _updateAngleVisibility(gp.type);
    document.getElementById('gradient-editor-panel').classList.add('visible');
  }

  function closePanel() {
    document.getElementById('gradient-editor-panel').classList.remove('visible');
    _stopPickMode();
    _activeLayerId = null;
  }

  function _updateAngleVisibility(type) {
    const row = document.getElementById('gradient-angle-row');
    if (row) row.style.display = type === 'linear' ? 'flex' : 'none';
  }

  // ── MODO PICK (definir en pantalla) ───────────────────────

  function _bindPickMode() {
    document.getElementById('btn-gradient-pick')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_pickingMode) {
        _stopPickMode();
      } else {
        _startPickMode();
      }
    });
  }

  function _startPickMode() {
    if (!_activeLayerId) return;
    _pickingMode = true;
    _pickStep    = 0;

    const area = document.getElementById('canvas-area');
    if (!area) return;

    document.querySelectorAll('.canvas-layer').forEach(el => el.style.pointerEvents = 'none');

    const btn = document.getElementById('btn-gradient-pick');
    if (btn) { btn.textContent = 'Cancelar'; btn.classList.add('active'); }

    document.body.classList.add('gradient-pick-mode');
    _showPickHint('Click para fijar el punto inicial — ESC para cancelar');

    setTimeout(() => {
      area._gradientPickHandler = (e) => _onLienzoClick(e);
      area.addEventListener('click', area._gradientPickHandler);
    }, 200);

    document._gradientKeyHandler = (e) => { if (e.key === 'Escape') _stopPickMode(); };
    document.addEventListener('keydown', document._gradientKeyHandler);
  }

  function _stopPickMode() {
    _pickingMode = false;
    _pickStep    = 0;

    document.body.classList.remove('gradient-pick-mode');

    const area = document.getElementById('canvas-area');
    if (area) {
      if (area._gradientPickHandler) {
        area.removeEventListener('click', area._gradientPickHandler);
        area._gradientPickHandler = null;
      }
    }

    if (document._gradientMoveHandler) { document.removeEventListener('mousemove', document._gradientMoveHandler); document._gradientMoveHandler = null; }
    if (document._gradientKeyHandler)  { document.removeEventListener('keydown',   document._gradientKeyHandler);  document._gradientKeyHandler  = null; }

    document.querySelectorAll('.canvas-layer').forEach(el => el.style.pointerEvents = '');

    const btn = document.getElementById('btn-gradient-pick');
    if (btn) { btn.textContent = 'Definir en pantalla'; btn.classList.remove('active'); }

    _hidePickHint();
    _removePickMarkers();
    _removeLiveLine();
  }

  function _onLienzoClick(e) {
    const lienzo = document.getElementById('lienzo');
    const rect   = lienzo.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width  * 100;
    const py = (e.clientY - rect.top)  / rect.height * 100;

    const layer = State.layers.find(l => l.id === _activeLayerId);
    if (!layer) return;

    if (_pickStep === 0) {
      if (typeof History !== 'undefined') History.push();
      layer.gradientParams.x1 = px;
      layer.gradientParams.y1 = py;
      _pickStep = 1;
      _addPickMarker(px, py);
      _showPickHint('Click para fijar el punto final — ESC para cancelar');
      _startLiveLine(px, py);
    } else {
      layer.gradientParams.x2 = px;
      layer.gradientParams.y2 = py;
      const dx = px - layer.gradientParams.x1;
      const dy = py - layer.gradientParams.y1;
      const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 90);
      layer.gradientParams.angle = ((angle % 360) + 360) % 360;
      // Limpiar coordenadas — el ángulo ya está calculado, _calcGradientStops usará s1=0, s2=100
      layer.gradientParams.x1 = undefined;
      layer.gradientParams.y1 = undefined;
      layer.gradientParams.x2 = undefined;
      layer.gradientParams.y2 = undefined;
      document.getElementById('gradient-angle').value = layer.gradientParams.angle;
      if (typeof Canvas !== 'undefined') Canvas.render();
      _stopPickMode();
    }
  }

  // ── LÍNEA DINÁMICA PUNTO 1 → CURSOR ──────────────────────

  function _startLiveLine(x1pct, y1pct) {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;

    let svg = document.getElementById('gradient-live-svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'gradient-live-svg';
      svg.style.cssText = `
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 8950;
        overflow: visible;
      `;

      const lineShadow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineShadow.id = 'gradient-live-line-shadow';
      lineShadow.setAttribute('stroke', 'rgba(0,0,0,0.5)');
      lineShadow.setAttribute('stroke-width', '3');
      lineShadow.setAttribute('stroke-dasharray', '3 3');
      lineShadow.setAttribute('stroke-linecap', 'round');

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.id = 'gradient-live-line';
      line.setAttribute('stroke', '#ffffff');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '3 3');
      line.setAttribute('stroke-linecap', 'round');

      svg.appendChild(lineShadow);
      svg.appendChild(line);
      lienzo.appendChild(svg);
    }

    const onMove = (e) => {
      const rect = lienzo.getBoundingClientRect();
      // Centro del punto 1 en px dentro del lienzo
      const x1px = x1pct / 100 * lienzo.offsetWidth;
      const y1px = y1pct / 100 * lienzo.offsetHeight;
      // Cursor en px dentro del lienzo
      const x2px = e.clientX - rect.left;
      const y2px = e.clientY - rect.top;

      ['gradient-live-line', 'gradient-live-line-shadow'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('x1', x1px);
          el.setAttribute('y1', y1px);
          el.setAttribute('x2', x2px);
          el.setAttribute('y2', y2px);
        }
      });
    };

    document._gradientMoveHandler = onMove;
    document.addEventListener('mousemove', onMove);
  }

  function _removeLiveLine() {
    document.getElementById('gradient-live-svg')?.remove();
  }

  // ── MARCADOR FIJO PUNTO 1 ─────────────────────────────────

  function _addPickMarker(px, py) {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;
    const marker = document.createElement('div');
    marker.id = 'gradient-marker-1';
    marker.style.cssText = `
      position: absolute;
      left: ${px}%; top: ${py}%;
      width: 20px; height: 20px;
      pointer-events: none;
      z-index: 8900;
      transform: translate(-50%, -50%);
    `;
    marker.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <line x1="10" y1="2"  x2="10" y2="18" stroke="rgba(0,0,0,0.6)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="2"  y1="10" x2="18" y2="10" stroke="rgba(0,0,0,0.6)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="10" y1="2"  x2="10" y2="18" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="2"  y1="10" x2="18" y2="10" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    lienzo.appendChild(marker);
  }

  function _removePickMarkers() {
    document.getElementById('gradient-marker-1')?.remove();
  }

  // ── HINT ──────────────────────────────────────────────────

  function _showPickHint(msg) {
    let hint = document.getElementById('gradient-pick-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'gradient-pick-hint';
      hint.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.8); color: #f0c020;
        font-family: var(--font); font-size: 11px; font-weight: 700;
        letter-spacing: 0.06em; text-transform: uppercase;
        padding: 8px 16px; border-radius: 4px; z-index: 99999;
        pointer-events: none;
      `;
      document.body.appendChild(hint);
    }
    hint.textContent = msg;
  }

  function _hidePickHint() {
    document.getElementById('gradient-pick-hint')?.remove();
  }

  // ── CONTROLES ─────────────────────────────────────────────

  function _bindPanelControls() {
    document.getElementById('gradient-type')?.addEventListener('change', e => {
      if (typeof History !== 'undefined') History.push();
      _updateGradientParam('type', e.target.value);
      _updateAngleVisibility(e.target.value);
    });
    document.getElementById('gradient-angle')?.addEventListener('input', e => {
      _updateGradientParam('angle', +e.target.value);
    });
    document.getElementById('gradient-angle')?.addEventListener('focus', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('gradient-color1')?.addEventListener('input', e => {
      _updateGradientParam('color1', e.target.value);
    });
    document.getElementById('gradient-color1')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('gradient-alpha1')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('gradient-alpha1')?.addEventListener('input', e => {
      _updateGradientParam('alpha1', +e.target.value);
      document.getElementById('label-alpha1').textContent = e.target.value + '%';
    });
    document.getElementById('gradient-color2')?.addEventListener('input', e => {
      _updateGradientParam('color2', e.target.value);
    });
    document.getElementById('gradient-color2')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('gradient-alpha2')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('gradient-alpha2')?.addEventListener('input', e => {
      _updateGradientParam('alpha2', +e.target.value);
      document.getElementById('label-alpha2').textContent = e.target.value + '%';
    });
  }

  function _updateGradientParam(key, value) {
    if (!_activeLayerId) return;
    const layer = State.layers.find(l => l.id === _activeLayerId);
    if (!layer || !layer.gradientParams) return;
    layer.gradientParams[key] = value;
    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  // ── DRAG PANEL ────────────────────────────────────────────

  function _bindPanelDrag() {
    const header = document.getElementById('gradient-editor-header');
    const panel  = document.getElementById('gradient-editor-panel');
    if (!header || !panel) return;

    header.addEventListener('mousedown', e => {
      if (e.target.id === 'gradient-editor-close') return;
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
      if (_draggingPanel) { _draggingPanel = false; document.body.classList.remove('layer-dragging'); }
    });
  }

  return { init, openPanel, closePanel, stopPickMode: _stopPickMode };
})();
