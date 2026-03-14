// ============================================================
// CANVAS.JS — Renderizado de capas + manejadores de escala
// ============================================================

const Canvas = (() => {

  let _area       = null;
  let _handles    = null; // overlay con los 8 manejadores
  let _dragging   = false;
  let _dragStartX = 0;
  let _dragStartY = 0;
  let _dragOrigins = {};

  // Estado del resize
  let _resizing     = false;
  let _resizeHandle = null; // 'nw','n','ne','e','se','s','sw','w'
  let _resizeStart  = {};   // { mouseX, mouseY, scaleX, scaleY, naturalW, naturalH, x, y }

  function init() {
    _area = document.getElementById('canvas-area');
    if (!_area) return;

    // Click en el fondo → deseleccionar
    _area.addEventListener('click', e => {
      if (e.target === _area) _deselect();
    });

    _bindArrowKeys();
    render();
  }

  function _deselect() {
    State.selectedLayerId  = null;
    State.selectedLayerIds = [];
    _hideHandles();
    render();
    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();
  }

  // ── RENDER ────────────────────────────────────────────────

  function render() {
    if (!_area) return;

    if (!State.activeFormat) {
      _area.querySelectorAll('.canvas-layer').forEach(el => el.style.display = 'none');
      _hideHandles();
      return;
    }

    // Eliminar huérfanos
    const current = new Set(State.layers.map(l => l.id));
    _area.querySelectorAll('.canvas-layer').forEach(el => {
      if (!current.has(el.dataset.id)) el.remove();
    });

    // Crear / actualizar capas
    State.layers.forEach((layer, index) => {
      let el = _area.querySelector(`.canvas-layer[data-id="${layer.id}"]`);
      if (!el) {
        el = document.createElement('img');
        el.className  = 'canvas-layer';
        el.dataset.id = layer.id;
        el.src        = layer.src;
        el.alt        = layer.name;
        _bindLayerInteraction(el);
        _area.appendChild(el);
      }

      el.style.zIndex  = State.layers.length - index;
      el.style.display = layer.visible ? 'block' : 'none';
      el.classList.toggle('canvas-layer-active', State.selectedLayerIds.includes(layer.id));
      _applyParams(el, layer);
    });

    // Actualizar manejadores si hay una capa activa
    if (State.selectedLayerId && State.activeFormat) {
      _updateHandles();
    } else {
      _hideHandles();
    }
  }

  function _applyParams(el, layer) {
    const p  = _getParams(layer.id);
    const nw = layer.naturalWidth  || el.naturalWidth  || 200;
    const nh = layer.naturalHeight || el.naturalHeight || 200;

    const w = Math.round(nw * p.scaleX / 100);
    const h = Math.round(nh * p.scaleY / 100);

    el.style.width     = w + 'px';
    el.style.height    = h + 'px';
    el.style.transform = `translate(-50%, -50%) rotate(${p.rotation}deg)`;
    el.style.opacity   = p.opacity / 100;
    el.style.filter    = p.blur > 0 ? `blur(${p.blur}px)` : '';
    el.style.left      = `calc(50% + ${p.x}px)`;
    el.style.top       = `calc(50% + ${p.y}px)`;
  }

  function _getParams(layerId) {
    const fid = State.activeFormat;
    if (!fid || !layerId) return _defaultParams();
    return State.formatParams?.[fid]?.[layerId] ?? _defaultParams();
  }

  function _defaultParams() {
    return { scaleX: 100, scaleY: 100, rotation: 0, opacity: 100, blur: 0, x: 0, y: 0 };
  }

  // ── MANEJADORES DE ESCALA ─────────────────────────────────

  const HANDLE_POSITIONS = ['nw','n','ne','e','se','s','sw','w'];

  function _ensureHandles() {
    if (_handles) return;
    _handles = document.createElement('div');
    _handles.id = 'canvas-handles';
    _handles.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 9000;
    `;

    HANDLE_POSITIONS.forEach(pos => {
      const h = document.createElement('div');
      h.className      = 'canvas-handle';
      h.dataset.handle = pos;
      h.style.cssText  = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #fff;
        border: 1px solid #333;
        border-radius: 1px;
        transform: translate(-50%, -50%);
        pointer-events: all;
        z-index: 9001;
        cursor: ${_getCursor(pos)};
      `;
      _bindHandleDrag(h, pos);
      _handles.appendChild(h);
    });

    _area.appendChild(_handles);
  }

  function _getCursor(pos) {
    const map = { nw:'nw-resize', n:'n-resize', ne:'ne-resize', e:'e-resize',
                  se:'se-resize', s:'s-resize', sw:'sw-resize', w:'w-resize' };
    return map[pos];
  }

  function _updateHandles() {
    _ensureHandles();
    const el = _area.querySelector(`.canvas-layer[data-id="${State.selectedLayerId}"]`);
    if (!el || el.style.display === 'none') { _hideHandles(); return; }

    const areaRect = _area.getBoundingClientRect();
    const elRect   = el.getBoundingClientRect();

    // Posición relativa al canvas-area
    const left   = elRect.left   - areaRect.left;
    const top    = elRect.top    - areaRect.top;
    const width  = elRect.width;
    const height = elRect.height;

    // Marco
    _handles.style.left   = left   + 'px';
    _handles.style.top    = top    + 'px';
    _handles.style.width  = width  + 'px';
    _handles.style.height = height + 'px';
    _handles.style.boxShadow = '0 0 0 0.8px #f0c020';
    _handles.style.display = 'block';

    // Posicionar cada handle
    const pts = {
      nw: [0,   0  ], n:  [50,  0  ], ne: [100, 0  ],
      e:  [100, 50 ], se: [100, 100], s:  [50,  100],
      sw: [0,   100], w:  [0,   50 ],
    };

    HANDLE_POSITIONS.forEach(pos => {
      const h = _handles.querySelector(`[data-handle="${pos}"]`);
      const [px, py] = pts[pos];
      h.style.left = px + '%';
      h.style.top  = py + '%';
    });
  }

  function _hideHandles() {
    if (_handles) _handles.style.display = 'none';
  }

  function _bindHandleDrag(handle, pos) {
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();

      const layerId = State.selectedLayerId;
      if (!layerId || !State.activeFormat) return;

      const layer = State.layers.find(l => l.id === layerId);
      const p     = _getParams(layerId);
      const nw    = layer?.naturalWidth  || 200;
      const nh    = layer?.naturalHeight || 200;

      _resizing     = true;
      _resizeHandle = pos;
      _resizeStart  = {
        mouseX:   e.clientX,
        mouseY:   e.clientY,
        scaleX:   p.scaleX,
        scaleY:   p.scaleY,
        naturalW: nw,
        naturalH: nh,
        x:        p.x,
        y:        p.y,
      };

      document.body.classList.add('layer-dragging');

      const onMove = ev => {
        if (!_resizing) return;

        const dx = ev.clientX - _resizeStart.mouseX;
        const dy = ev.clientY - _resizeStart.mouseY;
        const shift = ev.shiftKey;

        const origW = _resizeStart.naturalW * _resizeStart.scaleX / 100;
        const origH = _resizeStart.naturalH * _resizeStart.scaleY / 100;
        const aspect = origW / origH;

        let newScaleX = _resizeStart.scaleX;
        let newScaleY = _resizeStart.scaleY;

        // Calcular nuevo tamaño según handle
        const hPos = _resizeHandle;
        const isE  = hPos.includes('e');
        const isW  = hPos.includes('w');
        const isS  = hPos.includes('s');
        const isN  = hPos.includes('n');

        if (isE)  newScaleX = Math.max(1, (origW + dx) / _resizeStart.naturalW * 100);
        if (isW)  newScaleX = Math.max(1, (origW - dx) / _resizeStart.naturalW * 100);
        if (isS)  newScaleY = Math.max(1, (origH + dy) / _resizeStart.naturalH * 100);
        if (isN)  newScaleY = Math.max(1, (origH - dy) / _resizeStart.naturalH * 100);

        // Shift → proporcional
        if (shift) {
          if (isE || isW) {
            newScaleY = newScaleX / aspect * (_resizeStart.naturalW / _resizeStart.naturalH);
          } else if (isS || isN) {
            newScaleX = newScaleY * aspect * (_resizeStart.naturalH / _resizeStart.naturalW);
          }
        }

        Formats.setLayerParam(State.activeFormat, layerId, 'scaleX', Math.round(newScaleX));
        Formats.setLayerParam(State.activeFormat, layerId, 'scaleY', Math.round(newScaleY));

        render();
        if (typeof UI !== 'undefined') UI.updateSliders();
      };

      const onUp = () => {
        _resizing = false;
        document.body.classList.remove('layer-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  // ── DRAG DE CAPAS EN EL VIEWPORT ─────────────────────────

  function _bindLayerInteraction(el) {
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();

      const layerId = el.dataset.id;

      if (!State.selectedLayerIds.includes(layerId)) {
        State.selectedLayerId  = layerId;
        State.selectedLayerIds = [layerId];
        render();
        if (typeof Layers !== 'undefined') Layers.render();
        if (typeof UI     !== 'undefined') UI.updateSliders();
      } else {
        State.selectedLayerId = layerId;
      }

      if (!State.activeFormat) return;

      _dragging   = true;
      _dragStartX = e.clientX;
      _dragStartY = e.clientY;

      _dragOrigins = {};
      State.selectedLayerIds.forEach(lid => {
        const p = _getParams(lid);
        _dragOrigins[lid] = { x: p.x, y: p.y };
      });

      const onMove = ev => {
        if (!_dragging) return;
        const dx = ev.clientX - _dragStartX;
        const dy = ev.clientY - _dragStartY;
        State.selectedLayerIds.forEach(lid => {
          const origin = _dragOrigins[lid];
          if (!origin) return;
          Formats.setLayerParam(State.activeFormat, lid, 'x', Math.round(origin.x + dx));
          Formats.setLayerParam(State.activeFormat, lid, 'y', Math.round(origin.y + dy));
        });
        render();
      };

      const onUp = () => {
        _dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  // ── TECLAS DE FLECHA ──────────────────────────────────────

  function _bindArrowKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'TEXTAREA') {
          _deselect(); return;
        }
      }

      if (!State.selectedLayerId || !State.activeFormat) return;
      if (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA') return;

      const DIRS = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
      if (!DIRS[e.key]) return;
      e.preventDefault();

      const step = e.shiftKey ? 10 : 1;
      const [dx, dy] = DIRS[e.key];

      State.selectedLayerIds.forEach(lid => {
        const p = _getParams(lid);
        Formats.setLayerParam(State.activeFormat, lid, 'x', p.x + dx * step);
        Formats.setLayerParam(State.activeFormat, lid, 'y', p.y + dy * step);
      });
      render();
    });
  }

  return { init, render };
})();
