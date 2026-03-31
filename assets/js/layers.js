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
          if (formatAtImport === 'MUX4 TXT' || formatAtImport === 'MOVIL TXT' || formatAtImport === 'AMAZON LOGO') {
            layer.exclusiveFormat = formatAtImport;
          }
          // Calcular índice de inserción: después de capas auto-generadas y de isTitleLayer
          let _ci = 0;
          while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isComposicionAmazon || State.layers[_ci].isMarcaIplus || State.layers[_ci].isMarcaSony || State.layers[_ci].isTitleLayer)) {
            _ci++;
          }
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
    // Insertar después de todas las capas auto-generadas (isComposicion, isComposicionMovil, isMarcaIplus)
    let _ci = 0;
    while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isComposicionAmazon || State.layers[_ci].isMarcaIplus || State.layers[_ci].isMarcaSony)) {
      _ci++;
    }
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

    // En AMAZON BG: COMPOSICIÓN AMAZON LOGO va primero
    if (State.activeFormat === 'AMAZON BG') {
      const compAmazon = State.layers.find(l => l.isComposicionAmazon);
      if (compAmazon) {
        const compAmazonItem = _buildComposicionAmazonItem(compAmazon);
        if (compAmazonItem) list.appendChild(compAmazonItem);
        const sep = document.createElement('div');
        sep.className = 'layers-separator';
        list.appendChild(sep);
      }
    }

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

      // MARCA SONY: igual que MARCA IPLUS pero para SONY
      if (State.activeFormat === 'SONY') {
        const marcaSony = State.layers.find(l => l.isMarcaSony);
        if (marcaSony) {
          list.appendChild(_buildMarcaIplusItem(marcaSony));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }

      // Capas normales — en MUX4 FONDO y MOVIL MUX FONDO saltamos isComposicion porque ya la pintamos arriba
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO' || State.activeFormat === 'AMAZON BG')) return;
        if (layer.isComposicionMovil) return;
        if (layer.isComposicionAmazon) return;
        if (layer.isMarcaIplus) return;
        if (layer.isMarcaSony) return;
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
      // MARCA SONY
      if (State.activeFormat === 'SONY') {
        const marcaSony = State.layers.find(l => l.isMarcaSony);
        if (marcaSony) {
          list.appendChild(_buildMarcaIplusItem(marcaSony));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO' || State.activeFormat === 'AMAZON BG')) return;
        if (layer.isComposicionMovil) return;
        if (layer.isComposicionAmazon) return;
        if (layer.isMarcaIplus) return;
        if (layer.isMarcaSony) return;
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
    // Capas title: solo en MUX4 TXT, MOVIL TXT, TÍTULO FICHA y formatos de gráfica oficial
    if (layer.isTitleLayer && State.activeFormat !== 'MUX4 TXT' && State.activeFormat !== 'MOVIL TXT' && State.activeFormat !== 'TÍTULO FICHA' && State.activeFormat !== 'CARÁTULA H' && State.activeFormat !== 'CARÁTULA V' && State.activeFormat !== 'CARTEL COM. H' && State.activeFormat !== 'CARTEL COM. V' && State.activeFormat !== 'AMAZON LOGO' && State.activeFormat !== 'SONY') return null;
    if (layer.isTitleLayer && (State.activeFormat === 'FANART' || State.activeFormat === 'FANART MÓVIL')) return null;

    // Composición título: oculta en MUX4 TXT, MOVIL TXT, TÍTULO FICHA y formatos de gráfica oficial
    if (layer.isComposicion && (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'CARÁTULA H' || State.activeFormat === 'CARÁTULA V' || State.activeFormat === 'CARTEL COM. H' || State.activeFormat === 'CARTEL COM. V' || State.activeFormat === 'FANART' || State.activeFormat === 'FANART MÓVIL' || State.activeFormat === 'AMAZON LOGO' || State.activeFormat === 'SONY')) return null;

    // Capas con exclusiveFormat: solo en su formato
    if (layer.exclusiveFormat && layer.exclusiveFormat !== State.activeFormat) return null;

    // Capas normales importadas: ocultas en MUX4 TXT, MOVIL TXT y TÍTULO FICHA
    if (!layer.isTitleLayer && !layer.isComposicion && !layer.exclusiveFormat) {
      if (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'AMAZON LOGO') return null;
    }

    const item = document.createElement('div');
    const isKey = (typeof Canvas !== 'undefined') && Canvas.getKeyLayerId() === layer.id;
    item.className = 'layer-item'
      + (State.selectedLayerIds.includes(layer.id) ? ' active' : '')
      + (isKey ? ' key-layer' : '');
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

    // ── MÁSCARA: sistema por formato ──
    const fmtSize      = State.formatSizes[State.activeFormat];
    const hasMaskRect  = !!fmtSize?.maskRect;
    const hasMaskDual  = !!fmtSize?.maskCircle; // PERFIL: circular + rectangular

    if (hasMaskDual) {
      // ── Hover menu: sin máscara / circular / rectangular ──
      const currentMask = State.formatMaskEnabled?.[State.activeFormat]?.[layer.id] ?? null;
      const maskOverlay = document.createElement('div');
      maskOverlay.style.cssText = `
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        cursor:pointer;border-radius:2px;
        background:${currentMask ? 'rgba(0,0,0,0.55)' : 'transparent'};
        transition:background 0.15s;
      `;

      // Icono indicador del estado actual
      const maskIndicator = document.createElement('div');
      const _getMaskIcon = (type) => {
        if (type === 'circle') return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="5.5" stroke="var(--col-yellow)" stroke-width="1.3"/></svg>`;
        if (type === 'rect')   return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="var(--col-yellow)" stroke-width="1.3"/></svg>`;
        return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="5.5" stroke="#666" stroke-width="1.3"/></svg>`;
      };
      maskIndicator.innerHTML = _getMaskIcon(currentMask);
      maskIndicator.style.cssText = 'pointer-events:none;';
      maskOverlay.appendChild(maskIndicator);
      maskOverlay.style.opacity = currentMask ? '1' : '0';

      // Menú flotante
      const maskMenu = document.createElement('div');
      maskMenu.style.cssText = `
        position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);
        background:#1a1a1a;border:1px solid #333;border-radius:4px;
        display:none;flex-direction:column;overflow:hidden;z-index:1000;min-width:110px;
      `;

      const _menuOptions = [
        { type: null,     label: 'Sin máscara' },
        { type: 'circle', label: 'Circular' },
        { type: 'rect',   label: 'Rectangular' },
      ];

      _menuOptions.forEach(opt => {
        const btn = document.createElement('div');
        const isActive = (State.formatMaskEnabled?.[State.activeFormat]?.[layer.id] ?? null) === opt.type;
        btn.style.cssText = `
          padding:6px 10px;font-size:10px;font-family:var(--font);letter-spacing:0.06em;
          text-transform:uppercase;cursor:pointer;white-space:nowrap;
          color:${isActive ? 'var(--col-yellow)' : 'var(--col-text)'};
          background:${isActive ? 'rgba(240,165,0,0.08)' : 'transparent'};
        `;
        btn.textContent = opt.label;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.07)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = isActive ? 'rgba(240,165,0,0.08)' : 'transparent'; });
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (typeof History !== 'undefined') History.push();
          if (!State.formatMaskEnabled[State.activeFormat]) State.formatMaskEnabled[State.activeFormat] = {};
          State.formatMaskEnabled[State.activeFormat][layer.id] = opt.type;
          if (typeof Canvas !== 'undefined') Canvas.render();
          _render();
        });
        maskMenu.appendChild(btn);
      });

      thumb.style.overflow = 'visible';
      thumb.appendChild(maskMenu);
      thumb.appendChild(maskOverlay);

      let _hideTimer = null;
      const _scheduleHide = () => {
        _hideTimer = setTimeout(() => {
          const still = !!(State.formatMaskEnabled?.[State.activeFormat]?.[layer.id] ?? null);
          maskOverlay.style.opacity = still ? '1' : '0';
          maskMenu.style.display = 'none';
        }, 120);
      };
      const _cancelHide = () => {
        if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null; }
      };

      maskOverlay.addEventListener('mouseenter', () => {
        _cancelHide();
        maskOverlay.style.opacity = '1';
        maskMenu.style.display = 'flex';
      });
      maskOverlay.addEventListener('mouseleave', _scheduleHide);
      maskMenu.addEventListener('mouseenter', _cancelHide);
      maskMenu.addEventListener('mouseleave', _scheduleHide);

    } else if (hasMaskRect) {
      // ── Hover menu SIL: igual que PERFIL pero con 2 opciones ──
      const isMasked = !!State.formatMaskEnabled?.[State.activeFormat]?.[layer.id];

      const maskOverlay = document.createElement('div');
      maskOverlay.style.cssText = `
        position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        cursor:pointer;border-radius:2px;
        background:${isMasked ? 'rgba(0,0,0,0.55)' : 'transparent'};
        transition:background 0.15s;
      `;

      const maskIndicator = document.createElement('div');
      maskIndicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="${isMasked ? 'var(--col-yellow)' : '#666'}" stroke-width="1.3"/></svg>`;
      maskIndicator.style.cssText = 'pointer-events:none;';
      maskOverlay.appendChild(maskIndicator);
      maskOverlay.style.opacity = isMasked ? '1' : '0';

      const maskMenu = document.createElement('div');
      maskMenu.style.cssText = `
        position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);
        background:#1a1a1a;border:1px solid #333;border-radius:4px;
        display:none;flex-direction:column;overflow:hidden;z-index:1000;min-width:110px;
      `;

      [{ type: null, label: 'Sin máscara' }, { type: true, label: 'Enmascarar' }].forEach(opt => {
        const btn = document.createElement('div');
        const isActive = opt.type === null ? !isMasked : isMasked;
        btn.style.cssText = `
          padding:6px 10px;font-size:10px;font-family:var(--font);letter-spacing:0.06em;
          text-transform:uppercase;cursor:pointer;white-space:nowrap;
          color:${isActive ? 'var(--col-yellow)' : 'var(--col-text)'};
          background:${isActive ? 'rgba(240,165,0,0.08)' : 'transparent'};
        `;
        btn.textContent = opt.label;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.07)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = isActive ? 'rgba(240,165,0,0.08)' : 'transparent'; });
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (typeof History !== 'undefined') History.push();
          if (!State.formatMaskEnabled[State.activeFormat]) State.formatMaskEnabled[State.activeFormat] = {};
          State.formatMaskEnabled[State.activeFormat][layer.id] = opt.type === null ? null : true;
          if (typeof Canvas !== 'undefined') Canvas.render();
          _render();
        });
        maskMenu.appendChild(btn);
      });

      thumb.style.overflow = 'visible';
      thumb.appendChild(maskMenu);
      thumb.appendChild(maskOverlay);

      let _hideTimerSIL = null;
      const _scheduleHideSIL = () => {
        _hideTimerSIL = setTimeout(() => {
          const still = !!State.formatMaskEnabled?.[State.activeFormat]?.[layer.id];
          maskOverlay.style.opacity = still ? '1' : '0';
          maskMenu.style.display = 'none';
        }, 120);
      };
      const _cancelHideSIL = () => { if (_hideTimerSIL) { clearTimeout(_hideTimerSIL); _hideTimerSIL = null; } };

      maskOverlay.addEventListener('mouseenter', () => { _cancelHideSIL(); maskOverlay.style.opacity = '1'; maskMenu.style.display = 'flex'; });
      maskOverlay.addEventListener('mouseleave', _scheduleHideSIL);
      maskMenu.addEventListener('mouseenter', _cancelHideSIL);
      maskMenu.addEventListener('mouseleave', _scheduleHideSIL);
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

  // ── ITEM ESPECIAL: COMPOSICIÓN AMAZON LOGO en AMAZON BG ──

  function _buildComposicionAmazonItem(layer) {
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';
    item.dataset.id = layer.id;

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getVis = () => {
      const fv = State.formatParams?.['AMAZON BG']?.[layer.id]?.visible;
      return fv !== undefined ? fv : true;
    };
    eyeImg.src = _getVis() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getVis();
      if (!State.formatParams['AMAZON BG']) State.formatParams['AMAZON BG'] = {};
      if (!State.formatParams['AMAZON BG'][layer.id]) State.formatParams['AMAZON BG'][layer.id] = {};
      State.formatParams['AMAZON BG'][layer.id].visible = newVis;
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
        // Si se deselecciona la capa clave, limpiarla
        if (typeof Canvas !== 'undefined' && Canvas.getKeyLayerId() === layer.id) {
          Canvas.setKeyLayer(layer.id); // toggle → null
        }
      }
      State.selectedLayerId = State.selectedLayerIds[State.selectedLayerIds.length - 1];
    } else {
      // Click sin shift en capa ya seleccionada (con otras también seleccionadas) → capa clave
      if (State.selectedLayerIds.includes(layer.id) && State.selectedLayerIds.length > 1) {
        if (typeof Canvas !== 'undefined') Canvas.setKeyLayer(layer.id);
        State.selectedLayerId = layer.id; // mantener como capa primaria para los handles
        if (typeof Canvas !== 'undefined') Canvas.render();
        return;
      }
      // Click en capa ya única seleccionada → limpiar capa clave
      if (State.selectedLayerId === layer.id && State.selectedLayerIds.length === 1) {
        if (typeof Canvas !== 'undefined' && Canvas.getKeyLayerId()) Canvas.setKeyLayer(null);
        return;
      }
      // Limpiar capa clave al cambiar selección
      if (typeof Canvas !== 'undefined') Canvas.setKeyLayer(null);
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
