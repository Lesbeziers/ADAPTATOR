// ============================================================
// FORMATS.JS — Gestión de modalidades, formatos y parámetros
// ============================================================

const Formats = (() => {

  function init() {
    _buildDropdown();
    _bindDropdown();
  }

  // ── DROPDOWN CUSTOM ───────────────────────────────────────

  function _buildDropdown() {
    const optionsEl = document.getElementById('modality-options');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';

    State.modalities.forEach(m => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option' + (m.id === 'selecciona' ? ' placeholder' : '');
      opt.textContent = m.label;
      opt.dataset.id = m.id;
      optionsEl.appendChild(opt);
    });
  }

  function _bindDropdown() {
    const dropdown  = document.getElementById('modality-dropdown');
    const trigger   = dropdown?.querySelector('.custom-select-trigger');
    const optionsEl = document.getElementById('modality-options');
    const valueEl   = document.getElementById('modality-value');
    if (!dropdown || !trigger || !optionsEl) return;

    // Abrir/cerrar
    trigger.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });

    // Seleccionar opción
    optionsEl.addEventListener('click', e => {
      const opt = e.target.closest('.custom-select-option');
      if (!opt || opt.classList.contains('placeholder')) return;

      const id = opt.dataset.id;
      // Actualizar visual
      optionsEl.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      valueEl.textContent = opt.textContent;
      dropdown.classList.remove('open');

      // Actualizar estado
      State.activeModality = id;
      State.activeFormat   = null;
      _renderFormatGrid();
    });
  }

  // ── GRID DE FORMATOS ──────────────────────────────────────

  function _renderFormatGrid() {
    const grid = document.getElementById('formats-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!State.activeModality) return;

    const modality = State.modalities.find(m => m.id === State.activeModality);
    if (!modality) return;

    modality.formats.forEach(formatName => {
      const btn = document.createElement('button');
      btn.className = 'btn-format';
      btn.textContent = formatName;
      btn.dataset.format = formatName;
      if (State.activeFormat === formatName) btn.classList.add('active');
      if (State.formatOk[formatName])        btn.classList.add('done');
      btn.addEventListener('click', () => setActiveFormat(formatName));
      grid.appendChild(btn);
    });
  }

  // ── FORMATO ACTIVO ────────────────────────────────────────

  function setActiveFormat(formatName) {
    const previous = State.activeFormat;
    State.activeFormat = formatName;

    if (typeof GradientLayers !== 'undefined') GradientLayers.stopPickMode();
    if (typeof SystemLayers !== 'undefined') SystemLayers.invalidate();

    _renderFormatGrid();

    // Al salir de MUX4 TXT, generar la composición título
    if (previous === 'MUX4 TXT' && formatName !== 'MUX4 TXT') {
      if (typeof Composicion !== 'undefined') Composicion.generate();
    }

    // Al salir de MOVIL TXT, generar la composición móvil
    if (previous === 'MOVIL TXT' && formatName !== 'MOVIL TXT') {
      if (typeof ComposicionMovil !== 'undefined') ComposicionMovil.generate();
    }

    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof Layers !== 'undefined') Layers.render();
  }

  function toggleOk(formatName) {
    if (typeof History !== 'undefined') History.push();
    State.formatOk[formatName] = !State.formatOk[formatName];
    _renderFormatGrid();
  }

  // ── PARÁMETROS POR CAPA/FORMATO ───────────────────────────

  function getLayerParams(formatId, layerId) {
    return State.formatParams?.[formatId]?.[layerId] ?? _defaultParams();
  }

  function setLayerParam(formatId, layerId, key, value) {
    if (!State.formatParams[formatId]) State.formatParams[formatId] = {};
    if (!State.formatParams[formatId][layerId]) State.formatParams[formatId][layerId] = _defaultParams();

    // Calcular delta antes de aplicar (para propagación a capas enlazadas)
    const prevValue = State.formatParams[formatId][layerId][key] ?? _defaultParams()[key] ?? 0;
    const delta = value - prevValue;

    State.formatParams[formatId][layerId][key] = value;
    State.dirty = true;

    // Propagación para capas de título
    const layer = State.layers.find(l => l.id === layerId);
    if (layer?.isTitleLayer) {
      _propagateTitleParam(formatId, layerId, key, value);
    }

    // Propagación para capas enlazadas (solo x, y, scaleX, scaleY, rotation)
    if (layer?.linkGroupId && ['x', 'y', 'scaleX', 'scaleY', 'rotation'].includes(key) && delta !== 0) {
      _propagateLinkGroup(formatId, layerId, layer.linkGroupId, key, delta);
    }
  }

  function _propagateLinkGroup(formatId, sourceLayerId, groupId, key, delta) {
    State.layers
      .filter(l => l.linkGroupId === groupId && l.id !== sourceLayerId)
      .forEach(l => {
        if (!State.formatParams[formatId]) State.formatParams[formatId] = {};
        if (!State.formatParams[formatId][l.id]) State.formatParams[formatId][l.id] = _defaultParams();
        const current = State.formatParams[formatId][l.id][key] ?? _defaultParams()[key] ?? 0;
        State.formatParams[formatId][l.id][key] = current + delta;
      });
  }

  // ── GESTIÓN DE GRUPOS DE ENLACE ───────────────────────────

  function linkLayers(layerIds) {
    if (!layerIds || layerIds.length < 2) return;
    // Buscar si alguna ya tiene grupo
    const existingGroup = layerIds
      .map(id => State.layers.find(l => l.id === id)?.linkGroupId)
      .find(g => g);
    const groupId = existingGroup || ('link_' + Date.now());
    layerIds.forEach(id => {
      const layer = State.layers.find(l => l.id === id);
      if (layer) layer.linkGroupId = groupId;
    });
  }

  function unlinkLayer(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer?.linkGroupId) return;
    const groupId = layer.linkGroupId;
    delete layer.linkGroupId;
    // Si solo queda una capa en el grupo, disolver el grupo
    const remaining = State.layers.filter(l => l.linkGroupId === groupId);
    if (remaining.length === 1) delete remaining[0].linkGroupId;
  }

  function _propagateTitleParam(masterFormat, layerId, key, value) {
    const allFormats = Object.keys(State.formatSizes || {});

    if (masterFormat === 'MUX4 TXT') {
      // Propagar a todos excepto MOVIL MUX FONDO y MOVIL TXT
      allFormats.forEach(fid => {
        if (fid === masterFormat) return;
        if (fid === 'MOVIL MUX FONDO') return;
        if (fid === 'MOVIL TXT') return;
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = _defaultParams();
        State.formatParams[fid][layerId][key] = value;
      });
    } else if (masterFormat === 'MOVIL TXT') {
      // Propagar solo a MOVIL MUX FONDO
      const fid = 'MOVIL MUX FONDO';
      if (!State.formatParams[fid]) State.formatParams[fid] = {};
      if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = _defaultParams();
      State.formatParams[fid][layerId][key] = value;
    }
  }

  function _defaultParams() {
    return { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
  }

  return { init, setActiveFormat, toggleOk, getLayerParams, setLayerParam, linkLayers, unlinkLayer, refreshGrid: _renderFormatGrid };
})();
