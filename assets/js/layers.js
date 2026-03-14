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

  function _importLayer(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const name = file.name.replace(/\.[^.]+$/, '');
      // Leer dimensiones naturales de la imagen
      const img = new Image();
      img.onload = () => {
        const layer = {
          id:           'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2),
          name,
          src:          e.target.result,
          visible:      true,
          naturalWidth:  img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
        State.layers.unshift(layer);
        State.selectedLayerId = layer.id;
        State.selectedLayerIds = [layer.id];
        _render();
        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof UI !== 'undefined') UI.updateSliders();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
      id:      'layer_' + Date.now(),
      name:    src.name + ' copia',
      src:     src.src,
      visible: src.visible,
    };

    const idx = State.layers.findIndex(l => l.id === layerId);
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

    [{ label: 'Duplicar capa', action: () => _duplicateLayer(layerId) }]
    .forEach(item => {
      const opt = document.createElement('div');
      opt.textContent = item.label;
      opt.style.cssText = `
        padding: 8px 14px;
        font-family: var(--font);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #ccc;
        cursor: pointer;
      `;
      opt.addEventListener('mouseenter', () => opt.style.background = '#383838');
      opt.addEventListener('mouseleave', () => opt.style.background = 'transparent');
      opt.addEventListener('click', e => {
        e.stopPropagation();
        item.action();
        _closeContextMenu();
      });
      menu.appendChild(opt);
    });

    document.body.appendChild(menu);
    _contextMenu = menu;
  }

  function _closeContextMenu() {
    if (_contextMenu) { _contextMenu.remove(); _contextMenu = null; }
  }

  // ── RENDER ────────────────────────────────────────────────

  function _render() {
    const list = document.getElementById('layers-list');
    if (!list) return;
    list.innerHTML = '';
    State.layers.forEach((layer, index) => list.appendChild(_buildItem(layer, index)));
  }

  function _buildItem(layer, index) {
    const item = document.createElement('div');
    item.className = 'layer-item' + (State.selectedLayerIds.includes(layer.id) ? ' active' : '');
    item.dataset.id    = layer.id;
    item.dataset.index = index;

    // ── OJO ──
    const eye = document.createElement('div');
    eye.className = 'layer-eye';
    const eyeImg = document.createElement('img');
    eyeImg.src = layer.visible ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
    eye.appendChild(eyeImg);
    eye.addEventListener('click', e => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      eyeImg.src = layer.visible ? 'assets/img/ojo_on.svg' : 'assets/img/ojo_off.svg';
      if (typeof Canvas !== 'undefined') Canvas.render();
    });

    // ── THUMBNAIL ──
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    const thumbImg = document.createElement('img');
    thumbImg.src = layer.src;
    thumbImg.alt = layer.name;
    thumb.appendChild(thumbImg);

    // ── NOMBRE (span, no input) ──
    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = layer.name;

    // ── INPUT EDICIÓN (oculto) ──
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'layer-name-input';
    nameInput.value = layer.name;
    nameInput.style.display = 'none';

    nameInput.addEventListener('blur', () => {
      layer.name = nameInput.value.trim() || layer.name;
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

    // ── EVENTOS DEL ITEM ──────────────────────────────────

    // Doble click sobre el texto → editar
    item.addEventListener('dblclick', e => {
      e.stopPropagation();
      nameSpan.style.display  = 'none';
      nameInput.style.display = '';
      nameInput.focus();
      nameInput.select();
    });

    // Botón derecho → menú contextual
    item.addEventListener('contextmenu', e => {
      _select(layer);
      _showContextMenu(e, layer.id);
    });

    // ── DRAG + SELECCIÓN + LONG PRESS ──────────────────────
    _bindItemDrag(item, layer);

    return item;
  }

  // ── DRAG (mousedown+move = drag, click simple = selección) ─

  function _bindItemDrag(item, layer) {
    let startX, startY, dragging = false, dragSrcIndex;

    item.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      // No iniciar drag desde el ojo
      if (e.target.closest('.layer-eye')) return;

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
              const [moved] = State.layers.splice(dragSrcIndex, 1);
              State.layers.splice(destIndex, 0, moved);
              _render();
              if (typeof Canvas !== 'undefined') Canvas.render();
            }
          }
        } else {
          // Click simple → seleccionar
          _select(layer, e.shiftKey);
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _select(layer, shiftKey = false) {
    if (shiftKey) {
      // Shift+click: añadir o quitar de la selección múltiple
      const idx = State.selectedLayerIds.indexOf(layer.id);
      if (idx === -1) {
        State.selectedLayerIds.push(layer.id);
      } else if (State.selectedLayerIds.length > 1) {
        State.selectedLayerIds.splice(idx, 1);
      }
      State.selectedLayerId = State.selectedLayerIds[State.selectedLayerIds.length - 1];
    } else {
      // Click normal: selección simple — si ya está seleccionada, no rerenderizar
      if (State.selectedLayerId === layer.id && State.selectedLayerIds.length === 1) {
        return; // ya seleccionada, no destruir el DOM
      }
      State.selectedLayerId = layer.id;
      State.selectedLayerIds = [layer.id];
    }

    // Guardar valores originales de todas las capas seleccionadas
    // para poder aplicar transformaciones proporcionales
    if (State.activeFormat) {
      State._multiOrigins = {};
      State.selectedLayerIds.forEach(lid => {
        State._multiOrigins[lid] = { ...Formats.getLayerParams(State.activeFormat, lid) };
      });
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

  return { init, render: _render };
})();
