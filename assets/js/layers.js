// ============================================================
// LAYERS.JS — Gestión de capas: crear, reordenar, visibilidad
// ============================================================

const Layers = (() => {

  let _longPressTimer = null;
  let _contextMenu = null;

  function init() {
    document.getElementById('btn-add-layer')
      ?.addEventListener('click', () => {
        document.getElementById('file-input-layer')?.click();
      });

    document.getElementById('file-input-layer')
      ?.addEventListener('change', e => {
        const files = [...e.target.files];
        files.forEach(file => _importLayer(file));
        e.target.value = '';
      });

    document.getElementById('btn-dup-layer')
      ?.addEventListener('click', () => {
        if (State.selectedLayerId) _duplicateLayer(State.selectedLayerId);
      });

    document.getElementById('btn-del-layer')
      ?.addEventListener('click', _deleteActiveLayer);

    document.addEventListener('click', _closeContextMenu);
  }

  // ── IMPORTAR ──────────────────────────────────────────────

  const _TITLE_KEYWORDS = /titulo|title|texto|text/i;

  function _importLayer(file) {
    const reader = new FileReader();
    const formatAtImport = State.activeFormat; // capturar ANTES de cualquier async
    reader.onload = e => {
      const name = file.name.replace(/\.[^.]+$/, '');
      const img = new Image();
      img.onload = () => {
        const isTitleLayer = _TITLE_KEYWORDS.test(name);

        const layer = {
          id:               'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name,
          src:              e.target.result,
          visible:          true,
          naturalWidth:     img.naturalWidth,
          naturalHeight:    img.naturalHeight,
          originalFilename: file.name,
          originalMimeType: file.type || 'image/png',
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
          isTitleLayer,
        };

        if (isTitleLayer) {
          _importTitleLayer(layer);
        } else {
          // Si se importa estando en MUX4 TXT o MOVIL TXT, la capa es exclusiva de ese formato
          if (formatAtImport === 'MUX4 TXT' || formatAtImport === 'MOVIL TXT') {
            layer.exclusiveFormat = formatAtImport;
          }
          const _ci = State.layers[0]?.isComposicion ? 1 : 0;
          if (typeof History !== 'undefined') History.push();
          State.layers.splice(_ci, 0, layer);
          State.selectedLayerId  = layer.id;
          State.selectedLayerIds = [layer.id];
          _render();
          if (typeof Canvas !== 'undefined') Canvas.render();
          if (typeof UI !== 'undefined') UI.updateSliders();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function _importTitleLayer(layer) {
    const _ci = State.layers[0]?.isComposicion ? 1 : 0;
    if (typeof History !== 'undefined') History.push();
    State.layers.splice(_ci, 0, layer);

    const defaultParams = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0, visible: true };
    Object.keys(State.formatSizes || {}).forEach(fid => {
      if (!State.formatParams[fid]) State.formatParams[fid] = {};
      State.formatParams[fid][layer.id] = { ...defaultParams };
    });

    State.selectedLayerId  = layer.id;
    State.selectedLayerIds = [layer.id];

    // No se abre ningún formato automáticamente

    _render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI !== 'undefined') UI.updateSliders();

    if (typeof Composicion !== 'undefined') Composicion.generate();
  }

  // ── ELIMINAR ──────────────────────────────────────────────

  function _deleteActiveLayer() {
    if (!State.selectedLayerId) return;
    const count = State.selectedLayerIds.length;
    const layer = State.layers.find(l => l.id === State.selectedLayerId);
    if (!layer) return;
    const msg = count > 1
      ? `¿Eliminar las ${count} capas seleccionadas?`
      : `¿Eliminar la capa "${layer.name}"?`;

    UI.showConfirm(msg).then(ok => {
      if (!ok) return;
      if (typeof History !== 'undefined') History.push();
      State.layers = State.layers.filter(l => !State.selectedLayerIds.includes(l.id));
      State.selectedLayerId = State.layers[0]?.id ?? null;
      State.selectedLayerIds = State.selectedLayerId ? [State.selectedLayerId] : [];
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof UI !== 'undefined') UI.updateSliders();
    });
  }

  // ── DUPLICAR ──────────────────────────────────────────────

  function _duplicateLayer(layerId) {
    const src = State.layers.find(l => l.id === layerId);
    if (!src) return;

    const copy = {
      ...src,
      id:   'layer_' + Date.now(),
      name: src.name + ' copia',
    };
    // Deep copy objetos internos para que no compartan referencia
    if (src.params)         copy.params         = { ...src.params };
    if (src.solidParams)    copy.solidParams    = { ...src.solidParams };
    if (src.textParams)     copy.textParams     = { ...src.textParams };
    if (src.gradientParams) copy.gradientParams = { ...src.gradientParams };

    const idx = State.layers.findIndex(l => l.id === layerId);
    if (typeof History !== 'undefined') History.push();
    State.layers.splice(idx, 0, copy);

    Object.keys(State.formatParams).forEach(fid => {
      if (State.formatParams[fid][layerId])
        State.formatParams[fid][copy.id] = { ...State.formatParams[fid][layerId] };
    });

    State.selectedLayerId = copy.id;
    _render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI !== 'undefined') UI.updateSliders();
  }

  // ── MENÚ CONTEXTUAL ───────────────────────────────────────

  function _toggleExclusive(layer) {
    if (!State.activeFormat) return;
    if (typeof History !== 'undefined') History.push();
    if (layer.exclusiveFormat) {
      // Quitar exclusividad → visible en todos
      layer.exclusiveFormat = null;
    } else {
      // Fijar a formato actual
      layer.exclusiveFormat = State.activeFormat;
    }
    _render();
    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  function _showContextMenu(e, layerId) {
    e.preventDefault();
    _closeContextMenu();

    const menu = document.createElement('div');
    menu.id = 'layer-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 3px;
      z-index: 9999;
      min-width: 160px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;

    const layer = State.layers.find(l => l.id === layerId);
    const isSystemExclusive = layer?.isTitleLayer || layer?.isComposicion;
    const isPinned = !!layer?.exclusiveFormat;
    const pinLabel = isPinned ? 'Visible en todos los formatos' : 'Fijar a este formato';

    const menuItems = [
      { label: 'Duplicar capa', action: () => _duplicateLayer(layerId), disabled: false },
      { label: pinLabel, action: () => { if (layer) { _toggleExclusive(layer); _render(); } }, disabled: isSystemExclusive || !State.activeFormat },
    ];

    menuItems.forEach(item => {
      const opt = document.createElement('div');
      opt.textContent = item.label;
      opt.style.cssText = `
        padding: 8px 14px;
        font-family: var(--font);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: ${item.disabled ? '#555' : '#ccc'};
        cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
      `;
      if (!item.disabled) {
        opt.addEventListener('mouseenter', () => opt.style.background = '#383838');
        opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
        opt.addEventListener('click', e => {
          e.stopPropagation();
          item.action();
          _closeContextMenu();
        });
      }
      menu.appendChild(opt);
    });

    document.body.appendChild(menu);
    _contextMenu = menu;
  }

  function _closeContextMenu() {
    if (_contextMenu) { _contextMenu.remove(); _contextMenu = null; }
  }

  // ── RENDER ────────────────────────────────────────────────

  // ── LOCK POR FORMATO ─────────────────────────────────────

  function _getLocked(layerId) {
    const fid = State.activeFormat;
    if (!fid) return false;
    return !!State.formatParams?.[fid]?.[layerId]?.locked;
  }

  function _setLocked(layerId, val) {
    const fid = State.activeFormat;
    if (!fid) return;
    if (!State.formatParams[fid]) State.formatParams[fid] = {};
    if (!State.formatParams[fid][layerId]) State.formatParams[fid][layerId] = {};
    State.formatParams[fid][layerId].locked = val;
  }

  function _render() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.innerHTML = '';

    // En MUX4 FONDO: COMPOSICIÓN TÍTULO va primero, por encima de todo
    if (State.activeFormat === 'MUX4 FONDO') {
      const comp = State.layers.find(l => l.isComposicion);
      if (comp) {
        const compItem = _buildComposicionFondoItem(comp);
        if (compItem) list.appendChild(compItem);
        const sep = document.createElement('div');
        sep.className = 'layers-separator';
        list.appendChild(sep);
      }
    }

    // En MOVIL MUX FONDO: COMPOSICIÓN MOVIL TEXTO va primero, por encima de todo
    if (State.activeFormat === 'MOVIL MUX FONDO') {
      const compMovil = State.layers.find(l => l.isComposicionMovil);
      if (compMovil) {
        const compMovilItem = _buildComposicionMovilFondoItem(compMovil);
        if (compMovilItem) list.appendChild(compMovilItem);
        const sep = document.createElement('div');
        sep.className = 'layers-separator';
        list.appendChild(sep);
      }
    }

    // Pastilla de publicidad (arriba del todo, solo en formatos compatibles)
    if (State.activeFormat && typeof Pastilla !== 'undefined' && Pastilla.hasFormat(State.activeFormat)) {
      list.appendChild(_buildPastillaItem());
      const sep = document.createElement('div');
      sep.className = 'layers-separator';
      list.appendChild(sep);
    }

    // Capas de sistema (arriba)
    if (State.activeFormat && typeof SystemLayers !== 'undefined') {
      const sysLayers = SystemLayers.getLayersForPanel(State.activeFormat).slice().reverse();
      const sysTop    = sysLayers.filter(sl => !sl.zBase);
      const sysBase   = sysLayers.filter(sl => sl.zBase);

      if (sysTop.length > 0) {
        sysTop.forEach(sl => list.appendChild(_buildSystemItem(sl)));
        if (State.layers.length > 0 || sysBase.length > 0) {
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }

      // MARCA IPLUS: debajo de zona de seguridad, encima de capas normales
      if (State.activeFormat === 'IPLUS PUBLI') {
        const marca = State.layers.find(l => l.isMarcaIplus);
        if (marca) {
          list.appendChild(_buildMarcaIplusItem(marca));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }

      // Capas normales — en MUX4 FONDO y MOVIL MUX FONDO saltamos isComposicion porque ya la pintamos arriba
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO')) return;
        if (layer.isComposicionMovil) return;
        if (layer.isMarcaIplus) return;
        const item = _buildItem(layer, index);
        if (item) list.appendChild(item);
      });

      // Capas zBase (debajo de todo)
      if (sysBase.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'layers-separator';
        list.appendChild(sep);
        sysBase.forEach(sl => list.appendChild(_buildSystemItem(sl)));
      }
    } else {
      // Sin sistema — solo capas normales
      // MARCA IPLUS: encima de capas normales
      if (State.activeFormat === 'IPLUS PUBLI') {
        const marca = State.layers.find(l => l.isMarcaIplus);
        if (marca) {
          list.appendChild(_buildMarcaIplusItem(marca));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO')) return;
        if (layer.isComposicionMovil) return;
        if (layer.isMarcaIplus) return;
        const item = _buildItem(layer, index);
        if (item) list.appendChild(item);
      });
    }
  }

  // ── PASTILLA DE PUBLICIDAD (item del panel) ──────────────

  function _buildPastillaItem() {
    const fid  = State.activeFormat;
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';

    // ── OJO ──
    const eye    = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    eyeImg.src   = Pastilla.isVisible(fid) ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      Pastilla.setVisible(fid, !Pastilla.isVisible(fid));
      eyeImg.src = Pastilla.isVisible(fid) ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    // ── THUMB ──
    const thumb    = document.createElement('div');
    thumb.className = 'layer-thumb';
    const thumbImg = document.createElement('img');
    thumbImg.src   = Pastilla.getSrc(State.activeFormat);
    thumb.appendChild(thumbImg);

    // ── NOMBRE ──
    const name     = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = 'PASTILLA PUBLI';
    name.style.color = 'var(--col-yellow)';

    // ── ACCIONES (lápiz + candado) ──
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'layer-actions';

    // Lápiz
    const editBtn       = document.createElement('div');
    editBtn.className   = 'layer-edit-btn';
    editBtn.dataset.tooltip = 'Editar pastilla';
    const editUp        = document.createElement('img');
    editUp.className    = 'icon-up';
    editUp.src          = 'assets/img/ic_lapiz_up.svg';
    const editDown      = document.createElement('img');
    editDown.className  = 'icon-down';
    editDown.src        = 'assets/img/ic_lapiz_down.svg';
    editBtn.appendChild(editUp);
    editBtn.appendChild(editDown);
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      Pastilla.openPanel();
    });
    actionsWrap.appendChild(editBtn);

    // Candado
    if (Pastilla.isFixed(fid)) {
      // Formato fijo: candado estático como capas de sistema
      const lock = document.createElement('span');
      lock.className = 'layer-lock';
      lock.textContent = '🔒';
      lock.title = 'Pastilla fija en este formato';
      actionsWrap.appendChild(lock);
    } else {
      const lockBtn = document.createElement('div');
      const _svgLocked   = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.9"/><path d="M3 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      const _svgUnlocked = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><path d="M3 6V4a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>';
      const _updateLock = () => {
        const l = Pastilla.isLocked(fid);
        lockBtn.className     = 'layer-lock-btn' + (l ? ' locked' : '');
        lockBtn.dataset.tooltip = l ? 'Desbloquear pastilla' : 'Bloquear pastilla';
        lockBtn.innerHTML     = l ? _svgLocked : _svgUnlocked;
      };
      _updateLock();
      lockBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof History !== 'undefined') History.push();
        Pastilla.setLocked(fid, !Pastilla.isLocked(fid));
        _updateLock();
      });
      actionsWrap.appendChild(lockBtn);
    }

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(actionsWrap);

    return item;
  }

  function _buildSystemItem(layerDef) {
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    eyeImg.src = layerDef.visible ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      const newVisible = !layerDef.visible;
      SystemLayers.updateVisibility(
        document.getElementById('lienzo'),
        State.activeFormat,
        layerDef.key,
        newVisible
      );
      _render();
    });

    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    const thumbImg = document.createElement('img');
    thumbImg.src = layerDef.src;
    thumbImg.alt = layerDef.label;
    thumb.appendChild(thumbImg);

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layerDef.label;

    const lock = document.createElement('span');
    lock.className = 'layer-lock';
    lock.textContent = '🔒';
    lock.title = 'Capa de sistema — no editable';

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(lock);

    return item;
  }

  function _buildItem(layer, index) {
    // Capas title: solo en MUX4 TXT y MOVIL TXT
    if (layer.isTitleLayer && State.activeFormat !== 'MUX4 TXT' && State.activeFormat !== 'MOVIL TXT') return null;

    // Composición título: en todos los formatos excepto MUX4 TXT y MOVIL TXT
    if (layer.isComposicion && (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT')) return null;

    // Capas con exclusiveFormat: solo en su formato
    if (layer.exclusiveFormat && layer.exclusiveFormat !== State.activeFormat) return null;

    // Capas normales importadas: ocultas en MUX4 TXT y MOVIL TXT
    if (!layer.isTitleLayer && !layer.isComposicion && !layer.exclusiveFormat) {
      if (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT') return null;
    }

    const item = document.createElement('div');
    item.className = 'layer-item' + (State.selectedLayerIds.includes(layer.id) ? ' active' : '');
    item.dataset.id    = layer.id;
    item.dataset.index = index;

    // ── OJO ──
    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getLayerVisible = () => {
      const fv = State.activeFormat && State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
      return fv !== undefined ? fv : layer.visible;
    };
    eyeImg.src = _getLayerVisible() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getLayerVisible();
      if (State.activeFormat) {
        if (!State.formatParams[State.activeFormat]) State.formatParams[State.activeFormat] = {};
        if (!State.formatParams[State.activeFormat][layer.id]) State.formatParams[State.activeFormat][layer.id] = {};
        State.formatParams[State.activeFormat][layer.id].visible = newVis;
      } else {
        layer.visible = newVis;
      }
      eyeImg.src = newVis ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    // ── THUMBNAIL ──
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    thumb.style.position = 'relative';
    if (layer.type === 'text') {
      thumb.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#2a2a2a;position:relative;';
      const tIcon = document.createElement('span');
      tIcon.textContent = 'T';
      tIcon.style.cssText = 'font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#f0c020;line-height:1;';
      thumb.appendChild(tIcon);
    } else if (layer.type === 'solid') {
      thumb.style.background = layer.solidParams?.color || '#000';
      thumb.style.border = '1px solid #444';
    } else if (layer.type === 'gradient') {
      const gp = layer.gradientParams;
      if (gp) thumb.style.background = `linear-gradient(90deg, ${gp.color1}, ${gp.color2})`;
      thumb.style.border = '1px solid #444';
    } else if (layer.src) {
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.src;
      thumbImg.alt = layer.name;
      thumb.appendChild(thumbImg);
    }

    // ── ICONO DE MÁSCARA (solo en formatos SIL) ──
    const hasMaskRect = !!State.formatSizes[State.activeFormat]?.maskRect;
    if (hasMaskRect) {
      const isMasked = !!State.formatMaskEnabled?.[State.activeFormat]?.[layer.id];
      const maskOverlay = document.createElement('div');
      maskOverlay.style.cssText = `
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        cursor:pointer;border-radius:2px;
        background:${isMasked ? 'rgba(0,0,0,0.55)' : 'transparent'};
        transition:background 0.15s;
      `;
      const maskImg = document.createElement('img');
      maskImg.src = isMasked ? 'assets/img/ic_mask_down.svg' : 'assets/img/ic_mask_up.svg';
      maskImg.style.cssText = 'width:14px;height:14px;display:block;pointer-events:none;';
      maskOverlay.appendChild(maskImg);
      maskOverlay.style.opacity = isMasked ? '1' : '0';
      maskOverlay.addEventListener('mouseenter', () => { maskOverlay.style.opacity = '1'; });
      maskOverlay.addEventListener('mouseleave', () => {
        const still = !!State.formatMaskEnabled?.[State.activeFormat]?.[layer.id];
        maskOverlay.style.opacity = still ? '1' : '0';
      });
      maskOverlay.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof History !== 'undefined') History.push();
        if (!State.formatMaskEnabled[State.activeFormat]) State.formatMaskEnabled[State.activeFormat] = {};
        const current = !!State.formatMaskEnabled[State.activeFormat][layer.id];
        State.formatMaskEnabled[State.activeFormat][layer.id] = !current;
        if (typeof Canvas !== 'undefined') Canvas.render();
        _render();
      });
      thumb.appendChild(maskOverlay);
    }

    // ── NOMBRE ──
    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = layer.name;
    if (layer.linkGroupId) {
      nameSpan.style.color = 'var(--col-yellow)';
      nameSpan.title = 'Capa enlazada';
    }

    // ── INPUT EDICIÓN (oculto) ──
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'layer-name-input';
    nameInput.value = layer.name;
    nameInput.style.display = 'none';

    nameInput.addEventListener('blur', () => {
      const newName = nameInput.value.trim() || layer.name;
      if (newName !== layer.name && typeof History !== 'undefined') History.push();
      layer.name = newName;
      nameSpan.textContent = layer.name;
      nameInput.style.display = 'none';
      nameSpan.style.display  = '';
    });
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  nameInput.blur();
      if (e.key === 'Escape') { nameInput.value = layer.name; nameInput.blur(); }
      e.stopPropagation();
    });

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(nameSpan);
    item.appendChild(nameInput);

    // ── CONTENEDOR de acciones (lápiz, candado, chincheta) ──
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'layer-actions';

    // Lápiz para capas editables
    if (layer.type === 'text' || layer.type === 'solid' || layer.type === 'gradient') {
      const editBtn = document.createElement('div');
      editBtn.className = 'layer-edit-btn';
      editBtn.dataset.tooltip = layer.type === 'text' ? 'Editar texto' : layer.type === 'solid' ? 'Editar sólido' : 'Editar degradado';
      const imgUp   = document.createElement('img');
      imgUp.className   = 'icon-up';
      imgUp.src = 'assets/img/ic_lapiz_up.svg';
      const imgDown = document.createElement('img');
      imgDown.className = 'icon-down';
      imgDown.src = 'assets/img/ic_lapiz_down.svg';
      editBtn.appendChild(imgUp);
      editBtn.appendChild(imgDown);
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (layer.locked) return;
        if (layer.type === 'text'     && typeof TextLayers     !== 'undefined') TextLayers.openPanel(layer.id);
        if (layer.type === 'solid'    && typeof SolidLayers    !== 'undefined') SolidLayers.openPanel(layer.id);
        if (layer.type === 'gradient' && typeof GradientLayers !== 'undefined') GradientLayers.openPanel(layer.id);
      });
      actionsWrap.appendChild(editBtn);
    }

    // ── CANDADO editable ──
    const lockBtn = document.createElement('div');
    const _locked = () => _getLocked(layer.id);
    const _svgLocked   = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.9"/><path d="M3 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const _svgUnlocked = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><path d="M3 6V4a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>';
    const _updateLockBtn = () => {
      const l = _locked();
      lockBtn.className = 'layer-lock-btn' + (l ? ' locked' : '');
      lockBtn.dataset.tooltip = l ? 'Desbloquear capa' : 'Bloquear capa';
      lockBtn.innerHTML = l ? _svgLocked : _svgUnlocked;
    };
    _updateLockBtn();
    lockBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      _setLocked(layer.id, !_locked());
      _updateLockBtn();
      if (_locked()) {
        // Al bloquear: deseleccionar si estaba seleccionada
        if (State.selectedLayerIds.includes(layer.id)) {
          State.selectedLayerId  = null;
          State.selectedLayerIds = [];
        }
      } else {
        // Al desbloquear: seleccionar esta capa ANTES de cualquier render
        State.selectedLayerId  = layer.id;
        State.selectedLayerIds = [layer.id];
      }
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof UI     !== 'undefined') UI.updateSliders();
    });
    actionsWrap.appendChild(lockBtn);

    // ── CHINCHETA (exclusividad de formato) ──
    const pinBtn = document.createElement('div');
    pinBtn.className = 'layer-pin-btn';
    const pinImgUp   = document.createElement('img');
    const pinImgDown = document.createElement('img');
    pinImgUp.className   = 'pin-icon-up';
    pinImgDown.className = 'pin-icon-down';
    pinImgUp.src   = 'assets/img/ic_chincheta_up.svg';
    pinImgDown.src = 'assets/img/ic_chincheta_down.svg';
    pinBtn.appendChild(pinImgUp);
    pinBtn.appendChild(pinImgDown);
    const _updatePinBtn = () => {
      const pinned = !!layer.exclusiveFormat;
      pinBtn.classList.toggle('pinned', pinned);
      pinBtn.dataset.tooltip = pinned ? 'Visible en todos los formatos' : 'Fijar a este formato';
    };
    _updatePinBtn();
    pinBtn.addEventListener('click', e => {
      e.stopPropagation();
      _toggleExclusive(layer);
      _updatePinBtn();
    });
    actionsWrap.appendChild(pinBtn);

    // ── CADENA (enlace entre capas) ──
    const chainBtn = document.createElement('div');
    chainBtn.className = 'layer-chain-btn';
    chainBtn.addEventListener('mouseenter', () => { if (!layer.linkGroupId) chainBtn.style.color = ''; });
    chainBtn.addEventListener('mouseleave', () => { if (!layer.linkGroupId) chainBtn.style.color = ''; });
    const _svgChainOn  = '<svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 9L8.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5.5 6.5L4 8a2.121 2.121 0 0 0 3 3l1.5-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7.5 7.5L9 6a2.121 2.121 0 0 0-3-3L4.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const _svgChainOff = '<svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 9L8.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/><path d="M5.5 6.5L4 8a2.121 2.121 0 0 0 3 3l1.5-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/><path d="M7.5 7.5L9 6a2.121 2.121 0 0 0-3-3L4.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/></svg>';
    const _updateChainBtn = () => {
      const linked = !!layer.linkGroupId;
      chainBtn.classList.toggle('linked', linked);
      chainBtn.dataset.tooltip = linked ? 'Desenlazar capa' : 'Enlazar con seleccionadas';
      chainBtn.innerHTML = linked ? _svgChainOn : _svgChainOff;
    };
    _updateChainBtn();
    chainBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      if (layer.linkGroupId) {
        // Desenlazar esta capa
        Formats.unlinkLayer(layer.id);
      } else {
        // Enlazar con todas las capas seleccionadas
        const ids = State.selectedLayerIds.length > 1
          ? State.selectedLayerIds
          : [layer.id];
        Formats.linkLayers(ids);
      }
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
    });
    actionsWrap.appendChild(chainBtn);

    item.appendChild(actionsWrap);

    item.addEventListener('dblclick', e => {
      e.stopPropagation();
      nameSpan.style.display  = 'none';
      nameInput.style.display = '';
      nameInput.focus();
      nameInput.select();
    });

    item.addEventListener('contextmenu', e => {
      _select(layer);
      _showContextMenu(e, layer.id);
    });

    _bindItemDrag(item, layer);

    return item;
  }

  // ── ITEM ESPECIAL: COMPOSICIÓN TÍTULO en MUX4 FONDO ──────

  function _buildComposicionFondoItem(layer) {
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';
    item.dataset.id = layer.id;

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getVis = () => {
      const fv = State.formatParams?.['MUX4 FONDO']?.[layer.id]?.visible;
      return fv !== undefined ? fv : true;
    };
    eyeImg.src = _getVis() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getVis();
      if (!State.formatParams['MUX4 FONDO']) State.formatParams['MUX4 FONDO'] = {};
      if (!State.formatParams['MUX4 FONDO'][layer.id]) State.formatParams['MUX4 FONDO'][layer.id] = {};
      State.formatParams['MUX4 FONDO'][layer.id].visible = newVis;
      eyeImg.src = newVis ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    if (layer.src) {
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.src;
      thumbImg.alt = layer.name;
      thumb.appendChild(thumbImg);
    }

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;

    const lock = document.createElement('span');
    lock.className = 'layer-lock';
    lock.textContent = '🔒';
    lock.title = 'Posición fija — no editable';

    // ── CANDADO editable para composición ──
    const lockBtn = document.createElement('div');
    const _locked2 = () => _getLocked(layer.id);
    const _svgLocked2   = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.9"/><path d="M3 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const _svgUnlocked2 = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><path d="M3 6V4a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>';
    const _updateLockBtn2 = () => {
      const l = _locked2();
      lockBtn.className = 'layer-lock-btn' + (l ? ' locked' : '');
      lockBtn.dataset.tooltip = l ? 'Desbloquear capa' : 'Bloquear capa';
      lockBtn.innerHTML = l ? _svgLocked2 : _svgUnlocked2;
    };
    _updateLockBtn2();
    lockBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      _setLocked(layer.id, !_locked2());
      _updateLockBtn2();
      if (_locked2() && State.selectedLayerIds.includes(layer.id)) {
        State.selectedLayerId  = null;
        State.selectedLayerIds = [];
        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof UI     !== 'undefined') UI.updateSliders();
      }
      if (typeof Layers !== 'undefined') Layers.render();
    });

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(lockBtn);

    return item;
  }

  // ── ITEM ESPECIAL: COMPOSICIÓN MOVIL TEXTO en MOVIL MUX FONDO ─

  function _buildComposicionMovilFondoItem(layer) {
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';
    item.dataset.id = layer.id;

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getVis = () => {
      const fv = State.formatParams?.['MOVIL MUX FONDO']?.[layer.id]?.visible;
      return fv !== undefined ? fv : true;
    };
    eyeImg.src = _getVis() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getVis();
      if (!State.formatParams['MOVIL MUX FONDO']) State.formatParams['MOVIL MUX FONDO'] = {};
      if (!State.formatParams['MOVIL MUX FONDO'][layer.id]) State.formatParams['MOVIL MUX FONDO'][layer.id] = {};
      State.formatParams['MOVIL MUX FONDO'][layer.id].visible = newVis;
      eyeImg.src = newVis ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    if (layer.src) {
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.src;
      thumbImg.alt = layer.name;
      thumb.appendChild(thumbImg);
    }

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;

    const lockBtn = document.createElement('div');
    const _locked2 = () => _getLocked(layer.id);
    const _svgLocked2   = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.9"/><path d="M3 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const _svgUnlocked2 = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><path d="M3 6V4a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>';
    const _updateLockBtn2 = () => {
      const l = _locked2();
      lockBtn.className = 'layer-lock-btn' + (l ? ' locked' : '');
      lockBtn.dataset.tooltip = l ? 'Desbloquear capa' : 'Bloquear capa';
      lockBtn.innerHTML = l ? _svgLocked2 : _svgUnlocked2;
    };
    _updateLockBtn2();
    lockBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      _setLocked(layer.id, !_locked2());
      _updateLockBtn2();
      if (_locked2() && State.selectedLayerIds.includes(layer.id)) {
        State.selectedLayerId  = null;
        State.selectedLayerIds = [];
        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof UI     !== 'undefined') UI.updateSliders();
      }
      if (typeof Layers !== 'undefined') Layers.render();
    });

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(lockBtn);

    return item;
  }

  // ── ITEM ESPECIAL: MARCA IPLUS en IPLUS PUBLI ────────────

  function _buildMarcaIplusItem(layer) {
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';
    item.dataset.id = layer.id;

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getVis = () => {
      const fv = State.formatParams?.['IPLUS PUBLI']?.[layer.id]?.visible;
      return fv !== undefined ? fv : true;
    };
    eyeImg.src = _getVis() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getVis();
      if (!State.formatParams['IPLUS PUBLI']) State.formatParams['IPLUS PUBLI'] = {};
      if (!State.formatParams['IPLUS PUBLI'][layer.id]) State.formatParams['IPLUS PUBLI'][layer.id] = {};
      State.formatParams['IPLUS PUBLI'][layer.id].visible = newVis;
      eyeImg.src = newVis ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    if (layer.src) {
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.src;
      thumbImg.alt = layer.name;
      thumb.appendChild(thumbImg);
    }

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;

    const lock = document.createElement('span');
    lock.className = 'layer-lock';
    lock.textContent = '🔒';
    lock.title = 'Capa obligatoria — no editable';

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(lock);

    return item;
  }

  function _bindItemDrag(item, layer) {
    let startX, startY, dragging = false, dragSrcIndex;

    item.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('.layer-eye')) return;
      if (e.target.closest('.layer-lock-btn')) return;
      if (e.target.closest('.layer-pin-btn')) return;
      if (e.target.closest('.layer-edit-btn')) return;
      if (e.target.closest('.layer-chain-btn')) return;

      startX = e.clientX;
      startY = e.clientY;
      dragging = false;

      const onMove = ev => {
        const dx = Math.abs(ev.clientX - startX);
        const dy = Math.abs(ev.clientY - startY);

        if (!dragging && (dx > 4 || dy > 4)) {
          dragging = true;
          clearTimeout(_longPressTimer);
          dragSrcIndex = +item.dataset.index;
          item.classList.add('dragging');
          document.body.classList.add('layer-dragging');
        }

        if (dragging) {
          document.querySelectorAll('.layer-item:not(.dragging)')
            .forEach(el => el.classList.remove('drag-over'));
          const target = _getDragTarget(ev.clientY);
          if (target) target.classList.add('drag-over');
        }
      };

      const onUp = ev => {
        clearTimeout(_longPressTimer);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.classList.remove('layer-dragging');

        if (dragging) {
          item.classList.remove('dragging');
          document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));

          const target = _getDragTarget(ev.clientY);
          if (target) {
            const destIndex = +target.dataset.index;
            if (destIndex !== dragSrcIndex) {
              if (typeof History !== 'undefined') History.push();
              const [moved] = State.layers.splice(dragSrcIndex, 1);
              State.layers.splice(destIndex, 0, moved);
              _render();
              if (typeof Canvas !== 'undefined') Canvas.render();
            }
          }
        } else {
          _select(layer, e.shiftKey);
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _select(layer, shiftKey = false) {
    if (_getLocked(layer.id)) return;
    if (shiftKey) {
      const idx = State.selectedLayerIds.indexOf(layer.id);
      if (idx === -1) {
        State.selectedLayerIds.push(layer.id);
      } else if (State.selectedLayerIds.length > 1) {
        State.selectedLayerIds.splice(idx, 1);
      }
      State.selectedLayerId = State.selectedLayerIds[State.selectedLayerIds.length - 1];
    } else {
      if (State.selectedLayerId === layer.id && State.selectedLayerIds.length === 1) {
        return;
      }
      State.selectedLayerId = layer.id;
      State.selectedLayerIds = [layer.id];
    }

    State._multiOrigins = {};
    State.selectedLayerIds.forEach(lid => {
      const formatP = State.activeFormat ? Formats.getLayerParams(State.activeFormat, lid) : {};
      const layer   = State.layers.find(l => l.id === lid);
      const globalP = layer?.params || {};
      State._multiOrigins[lid] = { ...formatP, ...globalP };
    });

    // Si es texto y el panel está abierto, actualizarlo con los parámetros correctos
    const selLayer = State.layers.find(l => l.id === State.selectedLayerId);
    if (selLayer?.type === 'text' &&
        document.getElementById('text-editor-panel')?.classList.contains('visible')) {
      if (typeof TextLayers !== 'undefined') TextLayers.openPanel(State.selectedLayerId);
    }

    _render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI !== 'undefined') UI.updateSliders();
  }

  function _getDragTarget(clientY) {
    return [...document.querySelectorAll('.layer-item:not(.dragging)')].find(el => {
      const r = el.getBoundingClientRect();
      return clientY >= r.top && clientY <= r.bottom;
    }) ?? null;
  }

  return { init, render: _render, getLocked: _getLocked };
})();
