// ============================================================
// LAYERS.JS — Gestión de capas: crear, reordenar, visibilidad
// ============================================================

const Layers = (() => {

  let _longPressTimer = null;
  let _contextMenu = null;

  // ── BLEND MODES ───────────────────────────────────────────
  // Nombres coinciden con CSS mix-blend-mode y Canvas globalCompositeOperation
  // (excepto 'normal' → 'source-over' en canvas, gestionado en export.js)
  const BLEND_MODES = [
    { id: 'normal',      label: 'Normal' },
    { id: 'multiply',    label: 'Multiply' },
    { id: 'screen',      label: 'Screen' },
    { id: 'overlay',     label: 'Overlay' },
    { id: 'darken',      label: 'Darken' },
    { id: 'lighten',     label: 'Lighten' },
    { id: 'color-dodge', label: 'Color Dodge' },
    { id: 'color-burn',  label: 'Color Burn' },
    { id: 'soft-light',  label: 'Soft Light' },
    { id: 'hard-light',  label: 'Hard Light' },
  ];

  function init() {
    document.getElementById('btn-add-layer')
      ?.addEventListener('click', () => {
        document.getElementById('file-input-layer')?.click();
      });

    document.getElementById('file-input-layer')
      ?.addEventListener('change', e => {
        const files = [...e.target.files];
        _importLayerBatch(files);
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

  // Lote de importación — dispara AutoLayout al terminar
  function _importLayerBatch(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    let pending = imageFiles.length;
    const newLayers = [];

    const onDone = (layer) => {
      if (layer) newLayers.push(layer);
      pending--;
      if (pending === 0) {
        setTimeout(() => {
          if (typeof AutoLayout === 'undefined') return;
          const rolesEmpty = !State.layerRoles || Object.keys(State.layerRoles).length === 0;
          if (rolesEmpty) {
            // Primera importación: el modal de roles cubre TODAS las imágenes
            const imageLayers = State.layers.filter(l =>
              !['text','solid','gradient'].includes(l.type) &&
              !l.isComposicion && !l.isComposicionMovil && !l.isComposicionAmazon &&
              !l.isComposicionTextoH && !l.isComposicionTextoV &&
              !l.isMarcaIplus && !l.isMarcaSony && l.src
            );
            if (imageLayers.length > 0) AutoLayout.onFirstImport(imageLayers);
          } else {
            // Importación posterior: modal de roles SOLO con las imágenes nuevas
            // (filtradas: nada de títulos detectados por nombre — esos no entran al modal).
            const extras = newLayers.filter(l =>
              l && l.src && !l.isTitleLayer &&
              !['text','solid','gradient'].includes(l.type) &&
              !l.isComposicion && !l.isComposicionMovil && !l.isComposicionAmazon &&
              !l.isComposicionTextoH && !l.isComposicionTextoV &&
              !l.isMarcaIplus && !l.isMarcaSony
            );
            if (extras.length > 0 && AutoLayout.onAdditionalImport) {
              AutoLayout.onAdditionalImport(extras);
            }
          }
        }, 150);
      }
    };

    imageFiles.forEach(file => _importLayer(file, onDone));
  }

  const _TITLE_KEYWORDS = /titulo|title|texto|text/i;

  // Detecta el bounding box real del contenido opaco de un asset PNG.
  // Devuelve { x, y, w, h } en proporciones 0-1 del asset, o null si no aplica.
  // Redimensiona a max 300px para no bloquear el hilo principal.
  function _detectContentBounds(src, mimeType, naturalWidth, naturalHeight, callback) {
    if (!mimeType || !mimeType.includes('png')) { callback(null); return; }
    const SCAN_MAX = 300;
    const scale = Math.min(1, SCAN_MAX / Math.max(naturalWidth, naturalHeight));
    const sw = Math.max(1, Math.round(naturalWidth  * scale));
    const sh = Math.max(1, Math.round(naturalHeight * scale));
    const cv  = document.createElement('canvas');
    cv.width  = sw;
    cv.height = sh;
    const ctx = cv.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, sw, sh);
      let data;
      try { data = ctx.getImageData(0, 0, sw, sh).data; }
      catch(e) { callback(null); return; }

      const ALPHA_THRESHOLD = 10;
      let minX = sw, maxX = 0, minY = sh, maxY = 0;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const a = data[(y * sw + x) * 4 + 3];
          if (a > ALPHA_THRESHOLD) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (minX > maxX || minY > maxY) { callback(null); return; }
      callback({
        x: minX / sw,
        y: minY / sh,
        w: (maxX - minX + 1) / sw,
        h: (maxY - minY + 1) / sh,
      });
    };
    img.onerror = () => callback(null);
    img.src = src;
  }

  // Genera una versión bajada de la imagen (max 1920x1080) para usar durante la
  // edición. El original se guarda aparte (layer.srcOriginal) y solo se vuelve
  // a tocar al exportar. Devuelve null si la imagen ya cabe en el target.
  // Conserva PNG para mantener transparencia; el resto va a JPEG 0.9.
  const PROXY_MAX_W = 1920;
  const PROXY_MAX_H = 1080;
  function _makeProxy(img, mimeType) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;
    if (nw <= PROXY_MAX_W && nh <= PROXY_MAX_H) return null;

    const scale = Math.min(PROXY_MAX_W / nw, PROXY_MAX_H / nh);
    const pw = Math.max(1, Math.round(nw * scale));
    const ph = Math.max(1, Math.round(nh * scale));

    const cv = document.createElement('canvas');
    cv.width  = pw;
    cv.height = ph;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, pw, ph);

    try {
      const isPng = (mimeType || '').includes('png');
      return isPng ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      console.warn('[Layers] _makeProxy fallo:', e);
      return null;
    }
  }

  function _importLayer(file, onDone) {
    const reader = new FileReader();
    const formatAtImport = State.activeFormat; // capturar ANTES de cualquier async
    reader.onload = e => {
      const name = file.name.replace(/\.[^.]+$/, '');
      const img = new Image();
      img.onload = () => {
        const isTitleLayer = _TITLE_KEYWORDS.test(name);
        const mimeType = file.type || 'image/png';

        // Proxy bajado para editar; el original se conserva en srcOriginal
        // y solo se usa al exportar. Si la imagen ya cabe, proxy=null y
        // todo funciona como antes (src = data URL completo).
        const proxy = _makeProxy(img, mimeType);

        const layer = {
          id:               'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name,
          src:              proxy || e.target.result,
          visible:          true,
          naturalWidth:     img.naturalWidth,
          naturalHeight:    img.naturalHeight,
          originalFilename: file.name,
          originalMimeType: mimeType,
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
          isTitleLayer,
        };
        if (proxy) layer.srcOriginal = e.target.result;

        _detectContentBounds(e.target.result, mimeType, img.naturalWidth, img.naturalHeight, bounds => {
          if (bounds) layer.contentBounds = bounds;

          if (isTitleLayer) {
            _importTitleLayer(layer);
            if (onDone) onDone(layer);
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
            if (onDone) onDone(layer);
          }
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Zonas seguras de fit para capas de título por formato. Se aplican tanto al
  // importar (cuando el nombre del archivo encaja con _TITLE_KEYWORDS) como
  // cuando el modal de AutoLayout asigna manualmente el rol 'title'.
  const TITLE_FIT_ZONES = {
    'MUX4 TXT':         { x: 0.051, y: 0.132, w: 0.897, h: 0.739 },
    'MOVIL TXT':        { x: 0.014, y: 0.043, w: 0.971, h: 0.912 },
    'TÍTULO FICHA':     { x: 0.003, y: 0.020, w: 0.993, h: 0.950, alignLeft: true },
    'TEXTO HORIZONTAL': { x: 0.051, y: 0.132, w: 0.897, h: 0.739 }, // misma zona que MUX4 TXT escalada
    'TEXTO VERTICAL':   { x: 0.014, y: 0.043, w: 0.971, h: 0.912 }, // misma zona que MOVIL TXT escalada
  };

  function _applyTitleFitZones(layer) {
    const defaultParams = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0, visible: true };

    Object.keys(State.formatSizes || {}).forEach(fid => {
      if (!State.formatParams[fid]) State.formatParams[fid] = {};
      const fitZone = TITLE_FIT_ZONES[fid];
      if (fitZone && layer.naturalWidth && layer.naturalHeight) {
        const W = State.formatSizes[fid].w;
        const H = State.formatSizes[fid].h;
        const nw = layer.naturalWidth;
        const nh = layer.naturalHeight;
        const zoneW = W * fitZone.w;
        const zoneH = H * fitZone.h;
        const zoneX = W * fitZone.x;
        const zoneY = H * fitZone.y;
        const assetRatio = nw / nh;
        const zoneRatio  = zoneW / zoneH;

        // Calcular el scale de fit contenido
        let fitScale;
        if (assetRatio >= zoneRatio) {
          fitScale = zoneW / nw;
        } else {
          fitScale = zoneH / nh;
        }
        // No upscaling: si el asset ya cabe al 100%, usarlo tal cual
        const scale = Math.min(fitScale, 1.0);

        const drawW = nw * scale;
        const drawH = nh * scale;
        // alignLeft: el borde izquierdo del contenido se alinea con zoneX
        // centrado por defecto en los demás formatos
        const cx = fitZone.alignLeft
          ? zoneX + drawW / 2
          : zoneX + (zoneW - drawW) / 2 + drawW / 2;
        const cy = zoneY + (zoneH - drawH) / 2 + drawH / 2;
        State.formatParams[fid][layer.id] = {
          scaleX:   Math.round(scale * 1000) / 10,
          scaleY:   Math.round(scale * 1000) / 10,
          x:        Math.round(cx - W / 2),
          y:        Math.round(cy - H / 2),
          rotation: 0,
          visible:  true,
        };
      } else {
        // Solo aplicar defaults si la capa todavía no tiene formatParams ahí.
        // Si el modal de roles re-clasifica una capa que ya tenía posición en
        // otro formato, no la pisamos.
        if (!State.formatParams[fid][layer.id]) {
          State.formatParams[fid][layer.id] = { ...defaultParams };
        }
      }
    });
  }

  function _importTitleLayer(layer) {
    // Insertar después de todas las capas auto-generadas (isComposicion, isComposicionMovil, isMarcaIplus)
    let _ci = 0;
    while (_ci < State.layers.length && (State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil || State.layers[_ci].isComposicionAmazon || State.layers[_ci].isMarcaIplus || State.layers[_ci].isMarcaSony)) {
      _ci++;
    }
    if (typeof History !== 'undefined') History.push();
    State.layers.splice(_ci, 0, layer);

    _applyTitleFitZones(layer);

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

      // Identificar capas borrables (las sistémicas obligatorias se protegen)
      const idsToDelete = new Set(
        State.layers
          .filter(l => State.selectedLayerIds.includes(l.id) &&
                       !l.isMarcaIplus && !l.isMarcaSony &&
                       !l.isMolduraFanart && !l.isMascaraBlur)
          .map(l => l.id)
      );

      State.layers = State.layers.filter(l => !idsToDelete.has(l.id));

      // Limpiar referencias auxiliares que apuntaban a esas capas — sin esto,
      // los formatParams, máscaras, roles y origins quedan como basura que
      // crece con cada eliminación y puede chocar contra IDs reusados.
      idsToDelete.forEach(id => {
        Object.values(State.formatParams || {}).forEach(byLayer => { delete byLayer[id]; });
        Object.values(State.formatMaskEnabled || {}).forEach(byLayer => { delete byLayer[id]; });
        if (State._multiOrigins) delete State._multiOrigins[id];
        if (State.layerRoles)    delete State.layerRoles[id];
        // Si la capa borrada era una máscara, soltar las clientes que la usaban.
        State.layers.forEach(l => { if (l.maskLayerId === id) delete l.maskLayerId; });
      });

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
      id:   'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name: src.name + ' copia',
    };
    // El enlace debe ser manual, no se hereda al duplicar
    delete copy.linkGroupId;
    // Limpiar TODOS los flags de identidad / sistema. Una capa duplicada es una
    // capa normal — no es composición horneada, ni título oficial, ni capa generada
    // por el preset de maquetación. Sin esto, "duplicar" la composición de texto
    // crea una capa fantasma con isComposicionTextoH que el guardado trata como real.
    delete copy.isComposicion;
    delete copy.isComposicionMovil;
    delete copy.isComposicionAmazon;
    delete copy.isComposicionTextoH;
    delete copy.isComposicionTextoV;
    delete copy.isTitleLayer;
    delete copy.isTitleLayerH;
    delete copy.isTitleLayerV;
    delete copy.isMarcaIplus;
    delete copy.isMarcaSony;
    delete copy.isMolduraFanart;
    delete copy.isMascaraBlur;
    // La copia NUNCA es una máscara nueva — vuelve a ser un sólido/degradado normal.
    // (Pero SÍ hereda `maskLayerId` para soportar el caso típico "imagen + duplicado
    //  con tint para sombra", donde ambas comparten la misma máscara.)
    delete copy.isMask;
    delete copy._layoutGenerated;
    // srcFondo/srcMovilFondo solo aplican a la composición original
    delete copy.srcFondo;
    delete copy.srcMovilFondo;
    // Deep copy objetos internos para que no compartan referencia
    if (src.params)         copy.params         = { ...src.params };
    if (src.solidParams)    copy.solidParams    = { ...src.solidParams };
    if (src.textParams)     copy.textParams     = JSON.parse(JSON.stringify(src.textParams));
    if (src.gradientParams) copy.gradientParams = JSON.parse(JSON.stringify(src.gradientParams));

    const idx = State.layers.findIndex(l => l.id === layerId);
    if (typeof History !== 'undefined') History.push();
    State.layers.splice(idx, 0, copy);

    Object.keys(State.formatParams).forEach(fid => {
      if (State.formatParams[fid][layerId])
        State.formatParams[fid][copy.id] = { ...State.formatParams[fid][layerId] };
    });

    State.selectedLayerId  = copy.id;
    State.selectedLayerIds = [copy.id];
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

  function _replaceImage(layer) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (typeof History !== 'undefined') History.push();
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const fmt = State.activeFormat;
          const p   = State.formatParams?.[fmt]?.[layer.id] || {};
          const oldVisualW = (layer.naturalWidth  || 1) * (p.scaleX ?? 100) / 100;
          const oldVisualH = (layer.naturalHeight || 1) * (p.scaleY ?? 100) / 100;
          const newScaleX  = (oldVisualW / img.naturalWidth)  * 100;
          const newScaleY  = (oldVisualH / img.naturalHeight) * 100;
          const mimeType = file.type || 'image/png';
          const proxy = _makeProxy(img, mimeType);
          layer.src           = proxy || ev.target.result;
          if (proxy) layer.srcOriginal = ev.target.result;
          else       delete layer.srcOriginal;
          layer.naturalWidth  = img.naturalWidth;
          layer.naturalHeight = img.naturalHeight;
          layer.originalMimeType = mimeType;
          _detectContentBounds(ev.target.result, mimeType, img.naturalWidth, img.naturalHeight, bounds => {
            layer.contentBounds = bounds || null;
            if (fmt && typeof Formats !== 'undefined') {
              Formats.setLayerParam(fmt, layer.id, 'scaleX', Math.round(newScaleX * 10) / 10);
              Formats.setLayerParam(fmt, layer.id, 'scaleY', Math.round(newScaleY * 10) / 10);
            }
            if (typeof Canvas !== 'undefined') Canvas.render();
            _render();
          });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    input.click();
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

    const isImageLayer = !['text','solid','gradient'].includes(layer?.type) && !!layer?.src;
    const canBeMask    = _isValidMaskLayer(layer);
    const isAlreadyMask = !!layer?.isMask;
    const hasMask       = !!layer?.maskLayerId;
    const menuItems = [
      { label: 'Duplicar capa', action: () => _duplicateLayer(layerId), disabled: false },
      { label: pinLabel, action: () => { if (layer) { _toggleExclusive(layer); _render(); } }, disabled: isSystemExclusive || !State.activeFormat },
      ...(isImageLayer ? [{ label: 'Reemplazar imagen', action: () => _replaceImage(layer), disabled: false }] : []),
      // ── MÁSCARAS ──
      ...(canBeMask && !isAlreadyMask ? [
        { label: 'Convertir en máscara', action: () => { _setAsMask(layerId); _render(); if (typeof Canvas !== 'undefined') Canvas.render(); }, disabled: false }
      ] : []),
      ...(isAlreadyMask ? [
        { label: 'Usar como máscara en…', action: () => _openMaskTargetModal(layerId), disabled: false },
        { label: 'Quitar el rol de máscara', action: () => { _unsetAsMask(layerId); _render(); if (typeof Canvas !== 'undefined') Canvas.render(); }, disabled: false },
      ] : []),
      ...(hasMask ? [
        { label: 'Quitar la máscara de esta capa', action: () => { if (typeof History !== 'undefined') History.push(); _clearMaskTarget(layerId); _render(); if (typeof Canvas !== 'undefined') Canvas.render(); }, disabled: false }
      ] : []),
      // Override por formato: desactivar la máscara solo en este formato.
      // No afecta a la relación máscara↔cliente, solo a la aplicación visual
      // en el formato activo. Útil para casos como un SIL donde la máscara
      // estorba aunque sea coherente en el resto.
      ...(hasMask && State.activeFormat ? [
        (() => {
          const _disabled = !!State.formatParams?.[State.activeFormat]?.[layerId]?.customMaskDisabled;
          return {
            label: _disabled ? `Reactivar máscara en ${State.activeFormat}` : `Desactivar máscara en ${State.activeFormat}`,
            action: () => {
              if (typeof History !== 'undefined') History.push();
              if (!State.formatParams[State.activeFormat]) State.formatParams[State.activeFormat] = {};
              if (!State.formatParams[State.activeFormat][layerId]) State.formatParams[State.activeFormat][layerId] = {};
              State.formatParams[State.activeFormat][layerId].customMaskDisabled = !_disabled;
              _render();
              if (typeof Canvas !== 'undefined') Canvas.render();
            },
            disabled: false
          };
        })()
      ] : []),
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

  // ── MODAL: USAR COMO MÁSCARA EN… ──────────────────────────
  // Muestra una lista multi-selección con TODAS las capas elegibles
  // (no la propia máscara, ni otras máscaras, ni capas sistémicas).
  // Los checkboxes vienen pre-marcados con las clientes actuales para
  // que el modal también sirva para QUITAR la máscara de una capa.

  function _openMaskTargetModal(maskLayerId) {
    const mask = State.layers.find(l => l.id === maskLayerId);
    if (!mask) return;

    const isSystem = l =>
      l.isMarcaIplus || l.isMarcaSony || l.isMolduraFanart || l.isMascaraBlur ||
      l.isComposicion || l.isComposicionMovil || l.isComposicionAmazon ||
      l.isComposicionTextoH || l.isComposicionTextoV ||
      l.isTitleLayer;

    // Filtros:
    //  - No la propia máscara, ni otras máscaras.
    //  - No capas de sistema (composiciones, marcas, etc.).
    //  - No capas auto-generadas por maquetación (los DEG, IMAGEN BLUR, etc.
    //    de FANART MOD N: son técnicas, no editables manualmente).
    //  - No capas fijadas a OTRO formato distinto del activo (las versiones
    //    SIL/FONDO que solo viven en su formato exclusivo no son relevantes
    //    aquí; si el usuario quiere enmascararlas, va a ese formato).
    const candidates = State.layers.filter(l =>
      l.id !== maskLayerId &&
      !l.isMask &&
      !isSystem(l) &&
      !l._layoutGenerated &&
      (!l.exclusiveFormat || l.exclusiveFormat === State.activeFormat)
    );

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9998;
      display:flex;align-items:center;justify-content:center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background:#1f1f1f;border:1px solid #444;border-radius:6px;
      min-width:340px;max-width:480px;max-height:70vh;
      display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 10px 40px rgba(0,0,0,0.6);
      font-family:var(--font);
    `;

    const header = document.createElement('div');
    header.textContent = `Usar "${mask.name}" como máscara en…`;
    header.style.cssText = `
      padding:14px 18px;border-bottom:1px solid #333;
      font-size:11px;font-weight:700;letter-spacing:0.06em;
      text-transform:uppercase;color:var(--col-yellow);
    `;
    dialog.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1 1 auto;overflow:auto;padding:6px 0;';

    if (candidates.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No hay capas elegibles en el proyecto.';
      empty.style.cssText = 'padding:18px;color:#999;font-size:12px;';
      body.appendChild(empty);
    } else {
      candidates.forEach(l => {
        const row = document.createElement('label');
        row.style.cssText = `
          display:flex;align-items:center;gap:10px;
          padding:8px 18px;cursor:pointer;font-size:12px;color:#ddd;
        `;
        row.addEventListener('mouseenter', () => row.style.background = '#2a2a2a');
        row.addEventListener('mouseleave', () => row.style.background = 'transparent');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = l.id;
        cb.checked = (l.maskLayerId === maskLayerId);

        const label = document.createElement('span');
        label.textContent = l.name || '(sin nombre)';
        label.style.cssText = 'flex:1;';

        const typeBadge = document.createElement('span');
        const typeLabel = l.type === 'text' ? 'TEXTO'
                       : l.type === 'solid' ? 'SÓLIDO'
                       : l.type === 'gradient' ? 'DEGRADADO'
                       : l.isLogo ? 'LOGO'
                       : 'IMAGEN';
        typeBadge.textContent = typeLabel;
        typeBadge.style.cssText = `
          font-size:9px;letter-spacing:0.06em;color:#888;
          padding:2px 6px;border:1px solid #444;border-radius:3px;
        `;

        row.appendChild(cb);
        row.appendChild(label);
        row.appendChild(typeBadge);
        body.appendChild(row);
      });
    }
    dialog.appendChild(body);

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding:12px 18px;border-top:1px solid #333;
      display:flex;justify-content:flex-end;gap:8px;
    `;
    const btnStyle = `
      padding:8px 16px;font-family:var(--font);font-size:11px;
      font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
      border:none;border-radius:3px;cursor:pointer;
    `;
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = btnStyle + 'background:#333;color:#ccc;';
    const okBtn = document.createElement('button');
    okBtn.textContent = 'Aplicar';
    okBtn.style.cssText = btnStyle + 'background:var(--col-yellow);color:#1a1a1a;';

    cancelBtn.addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    okBtn.addEventListener('click', () => {
      if (typeof History !== 'undefined') History.push();
      const checks = body.querySelectorAll('input[type=checkbox]');
      const selected = new Set();
      checks.forEach(c => { if (c.checked) selected.add(c.value); });

      // Aplicar diffs
      candidates.forEach(l => {
        const wasClient = (l.maskLayerId === maskLayerId);
        const isClient  = selected.has(l.id);
        if (isClient && !wasClient) {
          _setMaskTarget(maskLayerId, l.id);
        } else if (!isClient && wasClient) {
          delete l.maskLayerId;
        }
      });
      backdrop.remove();
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(okBtn);
    dialog.appendChild(footer);

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
  }

  // ── RENDER ────────────────────────────────────────────────

  // ── MÁSCARAS (estilo Photoshop) ───────────────────────────
  //
  // Modelo:
  //  - layer.isMask = true        → la capa actúa como máscara.
  //  - layer.maskLayerId = <id>   → la capa está enmascarada por esa máscara.
  //
  // Una sola máscara puede tener N clientes (caso típico: imagen + duplicado
  // con tint para crear sombra; ambas comparten la misma máscara).
  //
  // Cuando una capa pasa a tener clientes, se autoapaga el ojo (visible=false).
  // El render final NUNCA pinta una máscara, aunque el usuario reactive el ojo;
  // en el editor sí se ve para reposicionarla.

  function _isValidMaskLayer(layer) {
    // v1: solo sólidos y degradados son admisibles como máscara.
    return !!layer && (layer.type === 'solid' || layer.type === 'gradient');
  }

  function _getMaskClients(maskLayerId) {
    return State.layers.filter(l => l.maskLayerId === maskLayerId);
  }

  function _setAsMask(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || !_isValidMaskLayer(layer) || layer.isMask) return;
    if (typeof History !== 'undefined') History.push();
    layer.isMask = true;
    // Renombrar a "MÁSCARA" para que se distinga de un sólido normal. Si ya
    // existe otra máscara con ese nombre, numeramos (MÁSCARA 2, 3, …).
    const _existing = State.layers
      .filter(l => l.id !== layerId && /^MÁSCARA(\s\d+)?$/.test(l.name || ''))
      .map(l => l.name);
    if (!_existing.includes('MÁSCARA')) {
      layer.name = 'MÁSCARA';
    } else {
      let n = 2;
      while (_existing.includes('MÁSCARA ' + n)) n++;
      layer.name = 'MÁSCARA ' + n;
    }
    // Sincronizar los params del formato actual a todos los demás. Sin esto,
    // los formatos donde la capa no se ha tocado mantienen sus params al
    // default y la máscara se ve descolocada/de tamaño raro al cambiar de
    // formato.
    if (State.activeFormat && typeof Formats !== 'undefined' && Formats.syncMaskAcrossFormats) {
      Formats.syncMaskAcrossFormats(layerId, State.activeFormat);
    }
  }

  function _unsetAsMask(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || !layer.isMask) return;
    if (typeof History !== 'undefined') History.push();
    delete layer.isMask;
    // Limpiar referencias de clientes — la capa vuelve a ser un sólido normal.
    State.layers.forEach(l => {
      if (l.maskLayerId === layerId) delete l.maskLayerId;
    });
  }

  function _setMaskTarget(maskLayerId, targetLayerId) {
    if (maskLayerId === targetLayerId) return;
    const mask   = State.layers.find(l => l.id === maskLayerId);
    const target = State.layers.find(l => l.id === targetLayerId);
    if (!mask || !target || !mask.isMask) return;
    if (target.maskLayerId === maskLayerId) return;
    target.maskLayerId = maskLayerId;
    // NOTA: NO encadenamos automáticamente con linkGroupId. El linkGroup
    // propaga deltas absolutos, lo cual choca con la propagación cliente-
    // relativa de máscaras (que usa ratios) creando valores caóticos al
    // mover/escalar. La propagación entre formatos ya mantiene la relación
    // visual máscara↔cliente. Si el usuario quiere mover ambas juntas en
    // el mismo formato, puede hacer shift+click para multi-seleccionar.
    // Auto-apagar el ojo de la máscara cuando se le añade el PRIMER cliente.
    // Como la máscara es un efecto global, propagamos visible=false a TODOS los
    // formatos para que no quede visible en otros formatos por defecto.
    if (_getMaskClients(maskLayerId).length === 1) {
      Object.keys(State.formatSizes || {}).forEach(fid => {
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        if (!State.formatParams[fid][mask.id]) State.formatParams[fid][mask.id] = {};
        State.formatParams[fid][mask.id].visible = false;
      });
      mask.visible = false;
    }
    // Re-sincronizar los params de la máscara desde el formato activo a todos
    // los demás. Esto cubre el caso de máscaras creadas antes de habilitar la
    // propagación (los formatos donde no se tocó la máscara podían quedar
    // con defaults).
    if (State.activeFormat && typeof Formats !== 'undefined' && Formats.syncMaskAcrossFormats) {
      Formats.syncMaskAcrossFormats(maskLayerId, State.activeFormat);
    }
  }

  function _clearMaskTarget(targetLayerId) {
    const target = State.layers.find(l => l.id === targetLayerId);
    if (!target || !target.maskLayerId) return;
    delete target.maskLayerId;
  }

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

  // ── CABECERA: BLEND MODE ──────────────────────────────────
  function _buildBlendModeHeader() {
    const wrap = document.createElement('div');
    wrap.className = 'layers-blend-header';
    wrap.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:6px 8px;border-bottom:1px solid #2a2a2a;background:#161616;
      font-family:var(--font);font-size:10px;color:#888;
      letter-spacing:0.06em;text-transform:uppercase;
    `;

    const label = document.createElement('span');
    label.textContent = 'Modo de capa';
    label.style.cssText = 'font-weight:700;color:#888;flex-shrink:0;';

    const select = document.createElement('select');
    select.style.cssText = `
      width:auto;background:#1c1c1c;color:#ccc;border:1px solid #333;
      border-radius:2px;padding:3px 6px;font-family:var(--font);
      font-size:10px;letter-spacing:0.06em;text-transform:uppercase;
      cursor:pointer;outline:none;margin-left:auto;
    `;

    const selectedLayers = (State.selectedLayerIds || [])
      .map(id => State.layers.find(l => l.id === id))
      .filter(Boolean);

    const hasSelection = selectedLayers.length > 0;
    const modes = new Set(selectedLayers.map(l => l.blendMode || 'normal'));
    const isMixed = modes.size > 1;
    const currentMode = isMixed ? '__mixed__' : (selectedLayers[0]?.blendMode || 'normal');

    if (isMixed) {
      const optMixed = document.createElement('option');
      optMixed.value = '__mixed__';
      optMixed.textContent = '— Múltiple —';
      select.appendChild(optMixed);
    }
    BLEND_MODES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      select.appendChild(opt);
    });
    select.value = currentMode;

    if (!hasSelection) {
      select.disabled = true;
      select.style.opacity = '0.4';
      select.style.cursor = 'not-allowed';
    }

    select.addEventListener('change', e => {
      const newMode = e.target.value;
      if (newMode === '__mixed__') return;
      if (typeof History !== 'undefined') History.push();
      selectedLayers.forEach(l => {
        // Capas sistémicas obligatorias: blend mode bloqueado
        if (l.isMarcaIplus || l.isMarcaSony || l.isMolduraFanart || l.isMascaraBlur) return;
        l.blendMode = newMode === 'normal' ? null : newMode;
      });
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    return wrap;
  }

  function _render() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.innerHTML = '';

    // Indicador de maquetación activa (en los formatos de texto)
    if ((State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TEXTO HORIZONTAL' || State.activeFormat === 'TEXTO VERTICAL') &&
        typeof Layout !== 'undefined') {
      const tipo    = Layout.getType();
      const version = Layout.getVersion();
      const ind = document.createElement('div');
      ind.className = 'layout-indicator';
      if (tipo && version) {
        ind.innerHTML = `
          <div class="layout-indicator-dot"></div>
          <span class="layout-indicator-text">${tipo.toUpperCase()} · ${version.toUpperCase()}</span>
          <span class="layout-indicator-edit">Cambiar</span>
        `;
      } else {
        ind.innerHTML = `
          <div class="layout-indicator-dot" style="background:#555;"></div>
          <span class="layout-indicator-text">Sin maquetación</span>
          <span class="layout-indicator-edit">Elegir</span>
        `;
      }
      ind.addEventListener('click', () => {
        if (typeof Layout !== 'undefined') Layout.openModal();
      });
      list.appendChild(ind);
      const sep = document.createElement('div');
      sep.className = 'layers-separator';
      list.appendChild(sep);
    }

    // ── CABECERA: SELECTOR DE MODO DE CAPA ───────────────
    list.appendChild(_buildBlendModeHeader());

    // ── CAPA "GUÍAS" (solo si hay al menos una en este formato) ──
    if (typeof Formats !== 'undefined' && Formats.hasGuides && Formats.hasGuides(State.activeFormat)) {
      list.appendChild(_buildGuidesItem());
      const sep = document.createElement('div');
      sep.className = 'layers-separator';
      list.appendChild(sep);
    }

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

    // Pastilla Freemium — solo si la versión activa es Freemium
    if ((State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TEXTO HORIZONTAL' || State.activeFormat === 'TEXTO VERTICAL') &&
        typeof Layout !== 'undefined' && Layout.isFreemium() &&
        typeof Pastilla !== 'undefined') {
      list.appendChild(_buildPastillaFreemiumItem());
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
          list.appendChild(_buildMarcaIplusItem(marcaSony, 'SONY'));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }

      // MOLDURA + MÁSCARA BLUR: capas sistémicas obligatorias de FANART MOD N
      if (State.activeFormat === 'FANART MOD N') {
        const moldura = State.layers.find(l => l.isMolduraFanart);
        if (moldura) {
          list.appendChild(_buildMarcaIplusItem(moldura, 'FANART MOD N'));
        }
        const mascara = State.layers.find(l => l.isMascaraBlur);
        if (mascara) {
          list.appendChild(_buildMarcaIplusItem(mascara, 'FANART MOD N'));
        }
        if (moldura || mascara) {
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }

      // Capas normales — saltamos las composiciones SOLO en sus mockups específicos
      // (donde se pintan arriba como ítems aparte). En el resto de formatos, _buildItem
      // las gestiona con sus filtros por variante (el lápiz permite cambiar entre H/V/MUX4/MOVIL).
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO' || State.activeFormat === 'AMAZON BG')) return;
        if (layer.isComposicion && State.activeFormat === 'FANART DEST.') return;
        if (layer.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') return;
        if (layer.isComposicionAmazon && State.activeFormat === 'AMAZON BG') return;
        if (layer.isMarcaIplus) return;
        if (layer.isMarcaSony) return;
        if (layer.isMolduraFanart) return;
        if (layer.isMascaraBlur) return;
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
          list.appendChild(_buildMarcaIplusItem(marcaSony, 'SONY'));
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }
      // MOLDURA + MÁSCARA BLUR: capas sistémicas obligatorias de FANART MOD N
      if (State.activeFormat === 'FANART MOD N') {
        const moldura = State.layers.find(l => l.isMolduraFanart);
        if (moldura) {
          list.appendChild(_buildMarcaIplusItem(moldura, 'FANART MOD N'));
        }
        const mascara = State.layers.find(l => l.isMascaraBlur);
        if (mascara) {
          list.appendChild(_buildMarcaIplusItem(mascara, 'FANART MOD N'));
        }
        if (moldura || mascara) {
          const sep = document.createElement('div');
          sep.className = 'layers-separator';
          list.appendChild(sep);
        }
      }
      State.layers.forEach((layer, index) => {
        if (layer.isComposicion && (State.activeFormat === 'MUX4 FONDO' || State.activeFormat === 'MOVIL MUX FONDO' || State.activeFormat === 'AMAZON BG')) return;
        if (layer.isComposicion && State.activeFormat === 'FANART DEST.') return;
        if (layer.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') return;
        if (layer.isComposicionAmazon && State.activeFormat === 'AMAZON BG') return;
        if (layer.isMarcaIplus) return;
        if (layer.isMarcaSony) return;
        if (layer.isMolduraFanart) return;
        if (layer.isMascaraBlur) return;
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

  // ── PASTILLA FREEMIUM (item del panel) ───────────────────

  function _buildPastillaFreemiumItem() {
    const item = document.createElement('div');
    item.className = 'layer-item';

    // Ojo — siempre visible (la pastilla freemium se muestra cuando el layout es freemium)
    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    eyeImg.src = 'assets/img/ojo_on.svg';
    eye.appendChild(eyeImg);

    // Thumb
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    const thumbImg = document.createElement('img');
    thumbImg.src = Pastilla.getFreemiumSrc();
    thumb.appendChild(thumbImg);

    // Nombre
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = 'PASTILLA FREEMIUM';
    name.style.color = 'var(--col-yellow)';

    // Acciones — lápiz
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'layer-actions';

    const editBtn = document.createElement('div');
    editBtn.className = 'layer-edit-btn';
    editBtn.dataset.tooltip = 'Editar pastilla freemium';
    const editUp = document.createElement('img');
    editUp.className = 'icon-up';
    editUp.src = 'assets/img/ic_lapiz_up.svg';
    const editDown = document.createElement('img');
    editDown.className = 'icon-down';
    editDown.src = 'assets/img/ic_lapiz_down.svg';
    editBtn.appendChild(editUp);
    editBtn.appendChild(editDown);
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      Pastilla.openFreemiumPanel();
    });
    actionsWrap.appendChild(editBtn);

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
      if (typeof History !== 'undefined') History.push();
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

  // Menú selector de variante de texto (las 4 composiciones) para el formato activo
  function _openTextVariantMenu(anchorEl, formatName) {
    document.querySelectorAll('.text-variant-menu').forEach(m => m.remove());
    if (typeof Formats === 'undefined') return;
    const opts = Formats.getTextVariantOptions();
    const cur  = Formats.getTextVariant(formatName);
    const menu = document.createElement('div');
    menu.className = 'text-variant-menu';
    const r = anchorEl.getBoundingClientRect();
    menu.style.cssText = `position:fixed;z-index:9999;background:#222;border:1px solid #444;border-radius:4px;padding:4px;min-width:170px;box-shadow:0 6px 20px rgba(0,0,0,0.55);left:${Math.round(r.right - 170)}px;top:${Math.round(r.bottom + 4)}px;`;
    opts.forEach(o => {
      const it = document.createElement('div');
      it.textContent = (o.value === cur ? '● ' : '') + o.label;
      it.style.cssText = `font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${o.value === cur ? 'var(--col-yellow)' : '#bbb'};padding:6px 8px;border-radius:3px;cursor:pointer;`;
      it.addEventListener('mouseenter', () => { it.style.background = '#333'; });
      it.addEventListener('mouseleave', () => { it.style.background = ''; });
      it.addEventListener('click', ev => {
        ev.stopPropagation();
        menu.remove();
        Formats.setTextVariant(formatName, o.value);
      });
      menu.appendChild(it);
    });
    document.body.appendChild(menu);
    const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
  }

  function _buildItem(layer, index) {
    // Rol FANART: el fanart solo en formatos FANART; subject/fondo ocultos en FANART si hay fanart
    if (typeof Formats !== 'undefined' && Formats.fanartRoleVisibility &&
        Formats.fanartRoleVisibility(layer.id, State.activeFormat) === false) return null;
    // Composiciones H/V: solo se listan en los formatos cuya variante coincide
    if (layer.isComposicionTextoH || layer.isComposicionTextoV) {
      const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
      const _match = (layer.isComposicionTextoH && _v === 'H') || (layer.isComposicionTextoV && _v === 'V');
      if (!_match) return null;
    }
    // Título "vivo": en maestros de texto + TÍTULO FICHA, o en formatos con variante TITLE_H/V.
    if (layer.isTitleLayer) {
      const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
      const inHost = ['MUX4 TXT','MOVIL TXT','TEXTO HORIZONTAL','TEXTO VERTICAL','AMAZON LOGO','TÍTULO FICHA'].includes(State.activeFormat)
                  || _v === 'TITLE_H' || _v === 'TITLE_V';
      if (!inHost) return null;
      if (typeof Formats !== 'undefined' && Formats.isActiveTitleForFormat &&
          !Formats.isActiveTitleForFormat(layer, State.activeFormat)) return null;
    }
    if (layer.isTitleLayer && (State.activeFormat === 'FANART' || State.activeFormat === 'FANART MÓVIL')) return null;
    if (layer.isTitleLayer && typeof Layout !== 'undefined' && Layout.isUpsell()) return null;

    // Composición MUX4: en su mockup (MUX4 FONDO) o donde el formato elija la variante 'MUX4'
    if (layer.isComposicion && State.activeFormat !== 'MUX4 FONDO' &&
        !(typeof Formats !== 'undefined' && Formats.getTextVariant && Formats.getTextVariant(State.activeFormat) === 'MUX4')) return null;
    // Composición MOVIL: en su mockup (MOVIL MUX FONDO) o donde el formato elija 'MOVIL'
    if (layer.isComposicionMovil && State.activeFormat !== 'MOVIL MUX FONDO' &&
        !(typeof Formats !== 'undefined' && Formats.getTextVariant && Formats.getTextVariant(State.activeFormat) === 'MOVIL')) return null;
    // Composición AMAZON: solo en su mockup (AMAZON BG). No es variante elegible con el lápiz.
    if (layer.isComposicionAmazon && State.activeFormat !== 'AMAZON BG') return null;

    // Capas con exclusiveFormat: solo en su formato
    if (layer.exclusiveFormat && layer.exclusiveFormat !== State.activeFormat) return null;

    // Capas normales importadas: ocultas en MUX4 TXT, MOVIL TXT y TÍTULO FICHA
    if (!layer.isTitleLayer && !layer.isComposicion && !layer.exclusiveFormat && !layer._layoutGenerated) {
      if (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'AMAZON LOGO' || State.activeFormat === 'TEXTO HORIZONTAL' || State.activeFormat === 'TEXTO VERTICAL') return null;
    }

    const item = document.createElement('div');
    const isKey = (typeof Canvas !== 'undefined') && Canvas.getKeyLayerId() === layer.id;
    const _maskClientsCount = layer.isMask ? _getMaskClients(layer.id).length : 0;
    item.className = 'layer-item'
      + (State.selectedLayerIds.includes(layer.id) ? ' active' : '')
      + (isKey ? ' key-layer' : '')
      + (layer.isMask ? ' is-mask-host' : '')
      + (layer.maskLayerId ? ' is-masked' : '');
    item.dataset.id    = layer.id;
    item.dataset.index = index;
    // Estilo visual mínimo para distinguir las capas-máscara en el panel
    if (layer.isMask) {
      item.style.borderLeft = '3px solid var(--col-yellow)';
      item.style.paddingLeft = '5px';
    }

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
        // Si es máscara, propagar visibilidad a todos los formatos (la máscara
        // es un efecto global; reactivar el ojo aquí lo activa también en
        // los demás formatos donde el usuario quiera reposicionarla).
        if (layer.isMask) {
          Object.keys(State.formatSizes || {}).forEach(fid => {
            if (fid === State.activeFormat) return;
            if (!State.formatParams[fid]) State.formatParams[fid] = {};
            if (!State.formatParams[fid][layer.id]) State.formatParams[fid][layer.id] = {};
            State.formatParams[fid][layer.id].visible = newVis;
          });
        }
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
      thumbImg.style.cssText = 'pointer-events:none;'; // evitar que el img consuma el evento
      thumb.appendChild(thumbImg);
      thumb.dataset.hasCtx = 'image';

      // Reemplazar imagen: gestionado desde _showContextMenu
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
        position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
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
        position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
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
    // Nombre visible según variante (solo para la capa "activa" de título/composición).
    // No toca layer.name interno — solo el textContent del panel.
    const _DISPLAY_BY_VARIANT = {
      'H':       'COMP. TEXTO HOR.',
      'V':       'COMP. TEXTO VER.',
      'MUX4':    'MUX4 TEXT',
      'MOVIL':   'SMARTPHONE TEXT',
      'TITLE_H': 'TÍTULO ORIGINAL HOR.',
      'TITLE_V': 'TÍTULO ORIGINAL VER.',
    };
    const _vCur = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
    const _isActiveTitleForDisplay = layer.isTitleLayer
      && typeof Formats !== 'undefined' && Formats.isActiveTitleForFormat
      && Formats.isActiveTitleForFormat(layer, State.activeFormat);
    const _isCompForDisplay = layer.isComposicionTextoH || layer.isComposicionTextoV
                          || layer.isComposicion || layer.isComposicionMovil;
    const _displayName = (_vCur && _DISPLAY_BY_VARIANT[_vCur] && (_isCompForDisplay || _isActiveTitleForDisplay))
      ? _DISPLAY_BY_VARIANT[_vCur]
      : layer.name;
    nameSpan.textContent = _displayName;
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

    // ── BADGE: máscara (host o cliente) ──
    if (layer.isMask) {
      const mb = document.createElement('span');
      mb.title = _maskClientsCount > 0
        ? `Máscara activa en ${_maskClientsCount} capa(s)`
        : 'Máscara — todavía sin capas asociadas';
      // Icono ◐ (half-circle) en amarillo
      mb.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2"/><path d="M6 1 A5 5 0 0 1 6 11 Z" fill="currentColor"/></svg>';
      mb.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        width:14px;height:14px;margin-left:4px;flex-shrink:0;
        color:var(--col-yellow);
      `;
      item.appendChild(mb);
    } else if (layer.maskLayerId) {
      const mask = State.layers.find(l => l.id === layer.maskLayerId);
      const mb = document.createElement('span');
      mb.title = mask ? `Enmascarada por: ${mask.name}` : 'Enmascarada';
      mb.innerHTML = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2" opacity="0.7"/><path d="M6 1 A5 5 0 0 1 6 11 Z" fill="currentColor" opacity="0.7"/></svg>';
      mb.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        width:13px;height:13px;margin-left:4px;flex-shrink:0;
        color:#bbb;
      `;
      item.appendChild(mb);
    }

    // ── BADGE: blend mode activo ──
    if (layer.blendMode && layer.blendMode !== 'normal') {
      const badge = document.createElement('span');
      const modeLabel = (BLEND_MODES.find(m => m.id === layer.blendMode)?.label) || layer.blendMode;
      badge.textContent = modeLabel.charAt(0).toUpperCase();
      badge.title = modeLabel;
      badge.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        width:14px;height:14px;border-radius:2px;margin-left:4px;
        font-family:var(--font);font-size:9px;font-weight:700;
        color:#1a1a1a;background:var(--col-yellow);flex-shrink:0;
      `;
      item.appendChild(badge);
    }

    // ── CONTENEDOR de acciones (lápiz, candado, chincheta) ──
    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'layer-actions';

    // Lápiz para capas editables
    if (layer.type === 'text' || layer.type === 'solid' || layer.type === 'gradient' || layer.isLogo) {
      const editBtn = document.createElement('div');
      editBtn.className = 'layer-edit-btn';
      editBtn.dataset.tooltip = layer.type === 'text' ? 'Editar texto' : layer.type === 'solid' ? 'Editar sólido' : layer.type === 'gradient' ? 'Editar degradado' : 'Cambiar logo';
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
        if (layer.isLogo              && typeof Logos           !== 'undefined') Logos.openForReplace(layer.id);
      });
      actionsWrap.appendChild(editBtn);
    }

    // Lápiz para la composición de texto: elegir QUÉ texto (H/V/MUX4/MOVIL) en este formato
    // El lápiz también aparece en isTitleLayer cuando es la capa "activa" del formato
    // (variante TITLE_H/TITLE_V o formato maestro), para poder cambiar a otra variante.
    const _isActiveTitle = layer.isTitleLayer
      && typeof Formats !== 'undefined' && Formats.isActiveTitleForFormat
      && Formats.isActiveTitleForFormat(layer, State.activeFormat);
    const _isTextComp = layer.isComposicionTextoH || layer.isComposicionTextoV
                     || layer.isComposicion || layer.isComposicionMovil
                     || _isActiveTitle;
    const _curVariant = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
    if (_isTextComp && _curVariant && typeof Formats !== 'undefined' && Formats.getTextVariantOptions) {
      const varBtn = document.createElement('div');
      varBtn.className = 'layer-edit-btn';
      varBtn.dataset.tooltip = 'Elegir texto del formato';
      const vUp = document.createElement('img'); vUp.className = 'icon-up';   vUp.src = 'assets/img/ic_lapiz_up.svg';
      const vDn = document.createElement('img'); vDn.className = 'icon-down'; vDn.src = 'assets/img/ic_lapiz_down.svg';
      varBtn.appendChild(vUp); varBtn.appendChild(vDn);
      varBtn.addEventListener('click', e => {
        e.stopPropagation();
        _openTextVariantMenu(varBtn, State.activeFormat);
      });
      actionsWrap.appendChild(varBtn);
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
    const _hasValidLinkPartner = () => {
      if (!layer.linkGroupId) return false;
      const fmt = State.activeFormat;
      return State.layers.some(l =>
        l.id !== layer.id &&
        l.linkGroupId === layer.linkGroupId &&
        (!l.exclusiveFormat || l.exclusiveFormat === fmt)
      );
    };
    const _updateChainBtn = () => {
      const linked = _hasValidLinkPartner();
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
      // Si el click viene del thumb de imagen, no abrir el menú general
      if (e.target.closest('.layer-thumb')?.dataset.hasCtx === 'image') return;
      _select(layer);
      _showContextMenu(e, layer.id);
    });

    _bindItemDrag(item, layer);

    return item;
  }

  // ── ITEM ESPECIAL: COMPOSICIÓN TÍTULO en MUX4 FONDO ──────

  // ── ITEM "GUÍAS" — capa especial del panel ─────────────────
  // No es una capa real de State.layers; es un item que controla las guías del formato activo.
  // Tres iconos: ojo (ver/ocultar), candado (bloquear edición), imán (snap GLOBAL).
  function _buildGuidesItem() {
    const fid = State.activeFormat;
    const item = document.createElement('div');
    item.className = 'layer-item layer-item--guides';

    // OJO
    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    eyeImg.src = Formats.areGuidesVisible(fid) ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      Formats.toggleGuidesVisible(fid);
      _render();
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    // THUMB (icono guías)
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    thumb.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#2a2a2a;border:1px solid #444;';
    thumb.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><line x1="5.5" y1="1" x2="5.5" y2="15" stroke="#00BFFF" stroke-width="1.2"/><line x1="1" y1="10.5" x2="15" y2="10.5" stroke="#00BFFF" stroke-width="1.2"/></svg>';

    // NOMBRE
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = 'GUÍAS';
    name.style.cssText = 'color:#bbb;font-weight:700;letter-spacing:0.04em;';

    // ACCIONES: candado + imán
    const actions = document.createElement('div');
    actions.className = 'layer-actions';

    const lockBtn = document.createElement('div');
    const _svgLocked   = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.9"/><path d="M3 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const _svgUnlocked = '<svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.3"/><path d="M3 6V4a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>';
    const _refreshLock = () => {
      const l = Formats.areGuidesLocked(fid);
      lockBtn.className = 'layer-lock-btn' + (l ? ' locked' : '');
      lockBtn.dataset.tooltip = l ? 'Desbloquear guías' : 'Bloquear guías';
      lockBtn.innerHTML = l ? _svgLocked : _svgUnlocked;
    };
    _refreshLock();
    lockBtn.addEventListener('click', e => {
      e.stopPropagation();
      Formats.toggleGuidesLocked(fid);
      _refreshLock();
    });
    actions.appendChild(lockBtn);

    const snapBtn = document.createElement('div');
    snapBtn.className = 'layer-snap-btn';
    const snapImgUp   = document.createElement('img');
    const snapImgDown = document.createElement('img');
    snapImgUp.className   = 'snap-icon-up';
    snapImgDown.className = 'snap-icon-down';
    snapImgUp.src   = 'assets/img/ic_iman_up.svg';
    snapImgDown.src = 'assets/img/ic_iman_down.svg';
    snapBtn.appendChild(snapImgUp);
    snapBtn.appendChild(snapImgDown);
    const _refreshSnap = () => {
      const on = Formats.isSnapEnabled();
      snapBtn.classList.toggle('snapped', on);
      snapBtn.dataset.tooltip = on ? 'Desactivar imán' : 'Activar imán';
    };
    _refreshSnap();
    snapBtn.addEventListener('click', e => {
      e.stopPropagation();
      Formats.toggleSnap();
      _refreshSnap();
    });
    actions.appendChild(snapBtn);

    item.appendChild(eye);
    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(actions);
    return item;
  }

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

  function _buildMarcaIplusItem(layer, formatId) {
    formatId = formatId || State.activeFormat || 'IPLUS PUBLI';
    const item = document.createElement('div');
    item.className = 'layer-item layer-item-system';
    item.dataset.id = layer.id;

    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    const _getVis = () => {
      const fv = State.formatParams?.[formatId]?.[layer.id]?.visible;
      return fv !== undefined ? fv : true;
    };
    eyeImg.src = _getVis() ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      const newVis = !_getVis();
      if (!State.formatParams[formatId]) State.formatParams[formatId] = {};
      if (!State.formatParams[formatId][layer.id]) State.formatParams[formatId][layer.id] = {};
      State.formatParams[formatId][layer.id].visible = newVis;
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

  // Comprueba si una capa es elegible para ser cliente de una máscara (mismo
  // criterio que el modal "Usar como máscara en…").
  function _isMaskableLayer(l) {
    if (!l) return false;
    if (l.isMask) return false;
    if (l.isMarcaIplus || l.isMarcaSony || l.isMolduraFanart || l.isMascaraBlur) return false;
    if (l.isComposicion || l.isComposicionMovil || l.isComposicionAmazon) return false;
    if (l.isComposicionTextoH || l.isComposicionTextoV) return false;
    if (l.isTitleLayer) return false;
    if (l._layoutGenerated) return false;
    return true;
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
            .forEach(el => { el.classList.remove('drag-over'); el.classList.remove('drop-as-mask'); });
          const hit = _getDragTargetWithIntent(ev.clientY, layer);
          if (hit) {
            if (hit.intent === 'mask') hit.item.classList.add('drop-as-mask');
            else                       hit.item.classList.add('drag-over');
          }
        }
      };

      const onUp = ev => {
        clearTimeout(_longPressTimer);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.classList.remove('layer-dragging');

        if (dragging) {
          item.classList.remove('dragging');
          document.querySelectorAll('.layer-item').forEach(el => { el.classList.remove('drag-over'); el.classList.remove('drop-as-mask'); });

          const hit = _getDragTargetWithIntent(ev.clientY, layer);
          if (hit) {
            if (hit.intent === 'mask') {
              // Drop encima de fila-máscara → enmascarar.
              if (typeof History !== 'undefined') History.push();
              _setMaskTarget(hit.layerId, layer.id);
              _render();
              if (typeof Canvas !== 'undefined') Canvas.render();
            } else {
              // Drop entre filas → reordenar (comportamiento clásico).
              const destIndex = +hit.item.dataset.index;
              if (destIndex !== dragSrcIndex) {
                if (typeof History !== 'undefined') History.push();
                const [moved] = State.layers.splice(dragSrcIndex, 1);
                State.layers.splice(destIndex, 0, moved);
                _render();
                if (typeof Canvas !== 'undefined') Canvas.render();
              }
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

  // Devuelve la fila bajo el cursor con la intención del drop:
  //  - 'mask'    → la fila es una capa-máscara Y el cursor está en su tercio
  //                central Y la capa arrastrada es elegible para ser enmascarada.
  //  - 'reorder' → reordenamiento clásico (comportamiento previo).
  function _getDragTargetWithIntent(clientY, draggedLayer) {
    const el = _getDragTarget(clientY);
    if (!el) return null;
    const layerId = el.dataset.id;
    const targetLayer = layerId ? State.layers.find(l => l.id === layerId) : null;
    const r = el.getBoundingClientRect();
    if (targetLayer?.isMask && _isMaskableLayer(draggedLayer)) {
      const third = r.height / 3;
      if (clientY >= r.top + third && clientY <= r.bottom - third) {
        return { item: el, intent: 'mask', layerId: targetLayer.id };
      }
    }
    return { item: el, intent: 'reorder', layerId };
  }

  return { init, render: _render, getLocked: _getLocked, makeProxy: _makeProxy, applyTitleFitZones: _applyTitleFitZones };
})();
