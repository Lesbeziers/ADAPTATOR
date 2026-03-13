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
    State.activeFormat = formatName;
    _renderFormatGrid();
    _updateLayerButtons();
  }

  function _updateLayerButtons() {
    const canEdit = !!(State.activeModality && State.activeFormat);
    const btnAdd = document.getElementById('btn-add-layer');
    const btnDel = document.getElementById('btn-del-layer');
    if (btnAdd) btnAdd.disabled = !canEdit;
    if (btnDel) btnDel.disabled = !canEdit;
  }

  function toggleOk(formatName) {
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
    State.formatParams[formatId][layerId][key] = value;
    State.dirty = true;
  }

  function _defaultParams() {
    return { scale: 100, rotation: 0, opacity: 100, blur: 0, x: 0, y: 0 };
  }

  return { init, setActiveFormat, toggleOk, getLayerParams, setLayerParam };
})();
