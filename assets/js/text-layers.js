// ============================================================
// TEXT-LAYERS.JS — Capas de texto con soporte de runs (rich text)
// ============================================================

const TextLayers = (() => {
  const SPECIAL_FORMATS = ['MUX4 TXT', 'MOVIL TXT', 'AMAZON LOGO'];

  let _activeLayerId  = null;
  let _draggingPanel  = false;
  let _panelOffX      = 0;
  let _panelOffY      = 0;
  let _selectionTimer  = null;
  let _pendingOffsets  = null; // selección guardada antes de perder foco

  // ── TABLAS DE PESOS ────────────────────────────────────────
  const WEIGHTS_APERCU = [
    { val: '300|normal', label: 'Light' },        { val: '300|italic', label: 'Light Italic' },
    { val: '400|normal', label: 'Regular' },       { val: '400|italic', label: 'Regular Italic' },
    { val: '700|normal', label: 'Bold' },          { val: '700|italic', label: 'Bold Italic' },
    { val: '900|normal', label: 'Black' },         { val: '900|italic', label: 'Black Italic' },
  ];
  const WEIGHTS_MOVISTAR_SANS = [
    { val: '300|normal', label: 'Light' },  { val: '400|normal', label: 'Regular' },
    { val: '500|normal', label: 'Medium' }, { val: '700|normal', label: 'Bold' },
    { val: '800|normal', label: 'Extrabold' },
  ];
  const WEIGHTS_MOVISTAR = [
    { val: '500|normal', label: 'Medium' }, { val: '700|normal', label: 'Bold' },
  ];
  const WEIGHTS_SYSTEM = [
    { val: '400|normal', label: 'Regular' }, { val: '400|italic', label: 'Italic' },
    { val: '700|normal', label: 'Bold' },    { val: '700|italic', label: 'Bold Italic' },
  ];

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    document.getElementById('btn-add-texto')
      ?.addEventListener('click', _createTextLayer);
    document.getElementById('text-editor-close')
      ?.addEventListener('click', closePanel);
    _bindPanelControls();
    _bindPanelDrag();

    document.addEventListener('selectionchange', () => {
      if (!_activeLayerId) return;
      const el = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
      if (!el || el.contentEditable !== 'true') return;
      _pendingOffsets = null; // nueva selección activa, descartar la guardada
      clearTimeout(_selectionTimer);
      _selectionTimer = setTimeout(_refreshPanel, 60);
    });
  }

  // ── MIGRACIÓN (formato antiguo → runs) ─────────────────────
  function _migrate(layer) {
    const tp = layer.textParams;
    if (!tp || tp.runs) return;
    tp.runs = [{
      text:   tp.content || '',
      family: tp.family  || 'Apercu Movistar',
      weight: tp.weight  || '400',
      style:  tp.style   || 'normal',
      color:  tp.color   || '#ffffff',
      size:   null, // hereda el size global
    }];
    if (tp.leading  == null) tp.leading  = 120;
    if (tp.tracking == null) tp.tracking = 0;
  }

  function _defaultRun(text, size) {
    return { text: text || '', family: 'Apercu Movistar', weight: '400', style: 'normal', color: '#ffffff', size: size || null };
  }

  // ── DOM ↔ RUNS ──────────────────────────────────────────────
  function runsToHTML(runs) {
    return (runs || []).map(r => {
      const escaped = (r.text || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      const sizeStr = r.size ? `;font-size:${r.size}px` : '';
      const st = `font-family:'${r.family}',Arial,sans-serif;font-weight:${r.weight};font-style:${r.style};color:${r.color}${sizeStr}`;
      return `<span style="${st}">${escaped}</span>`;
    }).join('');
  }

  function htmlToRuns(el) {
    // Extraer texto plano con newlines y el estilo dominante
    // Estrategia: recorrer el árbol DOM preservando estructura de runs y saltos
    const result = [];
    let lastStyle = null;

    function _getSpanStyle(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = node.tagName;
      if (tag === 'SPAN') {
        const family = (node.style.fontFamily || '').replace(/['"]/g,'').split(',')[0].trim() || 'Apercu Movistar';
        const weight = node.style.fontWeight || '400';
        const style  = node.style.fontStyle  || 'normal';
        const color  = _rgbToHex(node.style.color) || '#ffffff';
        return { family, weight, style, color };
      }
      return null;
    }

    function _walk(node, currentStyle) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text) return;
        const st = currentStyle || lastStyle || { family: 'Apercu Movistar', weight: '400', style: 'normal', color: '#ffffff' };
        const prev = result[result.length - 1];
        if (prev && prev.family === st.family && prev.weight === st.weight && prev.style === st.style && prev.color === st.color) {
          prev.text += text;
        } else {
          result.push({ ...st, text });
        }
        lastStyle = st;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName;
        if (tag === 'BR') {
          const st = currentStyle || lastStyle || { family: 'Apercu Movistar', weight: '400', style: 'normal', color: '#ffffff' };
          const prev = result[result.length - 1];
          if (prev && prev.family === st.family && prev.weight === st.weight && prev.style === st.style && prev.color === st.color) {
            prev.text += '\n';
          } else {
            result.push({ ...st, text: '\n' });
          }
          return;
        }
        // Para DIV/P que crea el navegador al presionar Enter: añadir newline antes si no es el primero
        if ((tag === 'DIV' || tag === 'P') && result.length > 0) {
          const last = result[result.length - 1];
          if (last && !last.text.endsWith('\n')) last.text += '\n';
        }
        const spanStyle = _getSpanStyle(node);
        for (const child of node.childNodes) {
          _walk(child, spanStyle || currentStyle);
        }
      }
    }

    for (const child of el.childNodes) _walk(child, null);

    // Eliminar newline final si existe
    if (result.length > 0) {
      result[result.length - 1].text = result[result.length - 1].text.replace(/\n$/, '');
    }

    return _mergeRuns(result.length > 0 ? result : [_defaultRun('')]);
  }

  function _rgbToHex(rgb) {
    if (!rgb) return '#ffffff';
    if (rgb.startsWith('#')) return rgb;
    const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!m) return '#ffffff';
    return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  }

  function _mergeRuns(runs) {
    const result = [];
    for (const r of runs) {
      if (!r.text && r.text !== '') continue;
      const prev = result[result.length - 1];
      if (prev && prev.family === r.family && prev.weight === r.weight &&
          prev.style === r.style && prev.color === r.color) {
        prev.text += r.text;
      } else {
        result.push({ ...r });
      }
    }
    return result.length > 0 ? result : [_defaultRun('')];
  }

  // ── CHAR OFFSETS ────────────────────────────────────────────
  function _getNodeOffset(root, targetNode, targetOffset) {
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
    let node;
    while ((node = walker.nextNode())) {
      if (node === targetNode) return count + targetOffset;
      if (node.nodeType === Node.TEXT_NODE) count += node.textContent.length;
      else if (node.nodeName === 'BR')       count += 1;
    }
    return count;
  }

  function _getSelectionOffsets(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    const start = _getNodeOffset(el, range.startContainer, range.startOffset);
    const end   = _getNodeOffset(el, range.endContainer,   range.endOffset);
    return start < end ? { start, end } : null;
  }

  function _saveSelectionOffsets(el) { return _getSelectionOffsets(el); }

  function _restoreSelectionOffsets(el, saved) {
    if (!saved) return;
    const range = document.createRange();
    let count = 0, startSet = false, endSet = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ALL);
    let node;
    while ((node = walker.nextNode()) && (!startSet || !endSet)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent.length;
        if (!startSet && count + len >= saved.start) { range.setStart(node, saved.start - count); startSet = true; }
        if (!endSet   && count + len >= saved.end)   { range.setEnd(node,   saved.end   - count); endSet   = true; }
        count += len;
      } else if (node.nodeName === 'BR') {
        if (!startSet && count + 1 >= saved.start) { range.setStartAfter(node); startSet = true; }
        if (!endSet   && count + 1 >= saved.end)   { range.setEndAfter(node);   endSet   = true; }
        count += 1;
      }
    }
    if (!startSet) range.setStart(el, el.childNodes.length);
    if (!endSet)   range.setEnd(el,   el.childNodes.length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ── APPLY STYLE TO RANGE ────────────────────────────────────
  function _applyStyleToRange(layer, key, value, offsets) {
    const newRuns = [];
    let pos = 0;
    for (const run of layer.textParams.runs) {
      const rLen = run.text.length, rStart = pos, rEnd = pos + rLen;
      if (rEnd <= offsets.start || rStart >= offsets.end) {
        newRuns.push({ ...run });
      } else if (rStart >= offsets.start && rEnd <= offsets.end) {
        newRuns.push({ ...run, [key]: value });
      } else if (rStart < offsets.start) {
        newRuns.push({ ...run, text: run.text.slice(0, offsets.start - rStart) });
        const midEnd = Math.min(offsets.end, rEnd) - rStart;
        newRuns.push({ ...run, text: run.text.slice(offsets.start - rStart, midEnd), [key]: value });
        if (rEnd > offsets.end) newRuns.push({ ...run, text: run.text.slice(offsets.end - rStart) });
      } else {
        newRuns.push({ ...run, text: run.text.slice(0, offsets.end - rStart), [key]: value });
        newRuns.push({ ...run, text: run.text.slice(offsets.end - rStart) });
      }
      pos = rEnd;
    }
    layer.textParams.runs = _mergeRuns(newRuns);
  }

  function _getRunsAtOffsets(layer, offsets) {
    if (!offsets) return layer.textParams.runs;
    const selected = [];
    let pos = 0;
    for (const run of layer.textParams.runs) {
      const rEnd = pos + run.text.length;
      if (rEnd > offsets.start && pos < offsets.end) selected.push(run);
      pos = rEnd;
    }
    return selected.length > 0 ? selected : layer.textParams.runs;
  }

  // ── CREAR CAPA ──────────────────────────────────────────────
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
        size: 48, align: 'left', leading: 120, tracking: 0,
        runs: [_defaultRun('Texto')],
      },
    };

    let _ci = 0;
    while (_ci < State.layers.length && (
      State.layers[_ci].isComposicion || State.layers[_ci].isComposicionMovil ||
      State.layers[_ci].isComposicionAmazon || State.layers[_ci].isMarcaIplus ||
      State.layers[_ci].isMarcaSony || State.layers[_ci].isTitleLayer
    )) { _ci++; }

    if (typeof History !== 'undefined') History.push();
    State.layers.splice(_ci, 0, layer);
    State.selectedLayerId  = layer.id;
    State.selectedLayerIds = [layer.id];
    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof Canvas !== 'undefined') Canvas.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();
    openPanel(layer.id);
  }

  // ── PANEL ──────────────────────────────────────────────────
  function openPanel(layerId) {
    const layer = State.layers.find(l => l.id === layerId);
    if (!layer || layer.type !== 'text') return;
    _migrate(layer);
    _activeLayerId = layerId;
    _refreshPanel();
    document.getElementById('text-editor-panel').classList.add('visible');
  }

  function closePanel() {
    document.getElementById('text-editor-panel').classList.remove('visible');
    _activeLayerId = null;
  }

  function _refreshPanel() {
    const layer = State.layers.find(l => l.id === _activeLayerId);
    if (!layer) return;
    const tp = layer.textParams;

    document.getElementById('text-size').value     = tp.size;
    document.getElementById('text-leading').value  = tp.leading  ?? 120;
    document.getElementById('text-tracking').value = tp.tracking ?? 0;

    const el      = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
    const offsets = (el?.contentEditable === 'true') ? _getSelectionOffsets(el) : null;
    const runs    = _getRunsAtOffsets(layer, offsets);

    const families = [...new Set(runs.map(r => r.family))];
    const wstyles  = [...new Set(runs.map(r => r.weight + '|' + r.style))];
    const colors   = [...new Set(runs.map(r => r.color))];
    const sizes    = [...new Set(runs.map(r => r.size ?? tp.size))];

    const famEl = document.getElementById('text-family');
    if (famEl) famEl.value = families.length === 1 ? families[0] : '';

    _updateWeightOptions(
      families.length === 1 ? families[0] : 'Apercu Movistar',
      wstyles.length  === 1 ? wstyles[0]  : ''
    );

    const colorEl = document.getElementById('text-color');
    if (colorEl) {
      colorEl.value         = colors.length === 1 ? colors[0] : '#808080';
      colorEl.style.opacity = colors.length > 1 ? '0.4' : '1';
      colorEl.title         = colors.length > 1 ? 'Valores mixtos' : '';
    }

    // Size por selección — no actualizar si el input tiene el foco (usuario está escribiendo)
    const sizeEl = document.getElementById('text-size');
    if (sizeEl && document.activeElement !== sizeEl) {
      sizeEl.value         = sizes.length === 1 ? sizes[0] : '';
      sizeEl.style.opacity = sizes.length > 1 ? '0.4' : '1';
      sizeEl.placeholder   = sizes.length > 1 ? '—' : '';
    }

    document.querySelectorAll('.btn-text-align').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === tp.align);
    });
  }

  function _updateWeightOptions(family, selectedVal) {
    const select = document.getElementById('text-weight');
    if (!select) return;
    let weights;
    if (family === 'Apercu Movistar')    weights = WEIGHTS_APERCU;
    else if (family === 'Movistar Sans') weights = WEIGHTS_MOVISTAR_SANS;
    else if (family === 'Movistar')      weights = WEIGHTS_MOVISTAR;
    else                                 weights = WEIGHTS_SYSTEM;
    select.innerHTML = '';
    if (!selectedVal) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = '—'; select.appendChild(opt);
    }
    weights.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.val; opt.textContent = w.label;
      if (w.val === selectedVal) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // ── CONTROLES ──────────────────────────────────────────────
  function _bindPanelControls() {
    // Guardar selección en cuanto el usuario toca el panel (antes del blur)
    const _panel = document.getElementById('text-editor-panel');
    _panel?.addEventListener('mousedown', (e) => {
      if (!_activeLayerId) return;
      const el = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
      if (el?.contentEditable === 'true') {
        _pendingOffsets = _getSelectionOffsets(el);
        // Prevenir siempre el blur, pero enfocar manualmente el target si es interactivo
        e.preventDefault();
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA') {
          setTimeout(() => e.target.focus(), 0);
        }
      }
    });

    ['text-size', 'text-leading', 'text-tracking'].forEach(id => {
      document.getElementById(id)?.addEventListener('focus', () => {
        if (typeof History !== 'undefined') History.push();
      });
    });

    document.getElementById('text-size')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (isNaN(val) || val <= 0) return;
      const layer = State.layers.find(l => l.id === _activeLayerId);
      if (!layer) return;
      const el      = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
      const offsets = (el?.contentEditable === 'true' ? _getSelectionOffsets(el) : null) || _pendingOffsets;
      if (offsets) {
        // Aplicar como size de run
        _applyStyleToRange(layer, 'size', val, offsets);
        if (el?.contentEditable === 'true') el.innerHTML = runsToHTML(layer.textParams.runs);
      } else {
        // Cambio global: actualizar size global Y limpiar sizes de runs
        layer.textParams.size = val;
        layer.textParams.runs.forEach(r => { r.size = null; });
      }
      if (typeof Canvas !== 'undefined') Canvas.render();
      // No llamar _refreshPanel aquí para no sobreescribir el valor mientras se escribe
    });

    document.getElementById('text-leading')?.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      if (isNaN(val) || val <= 0) return;
      const layer = State.layers.find(l => l.id === _activeLayerId);
      if (layer) { layer.textParams.leading = val; if (typeof Canvas !== 'undefined') Canvas.render(); }
    });

    document.getElementById('text-tracking')?.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (isNaN(val)) return;
      const layer = State.layers.find(l => l.id === _activeLayerId);
      if (layer) { layer.textParams.tracking = val; if (typeof Canvas !== 'undefined') Canvas.render(); }
    });

    document.getElementById('text-family')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-family')?.addEventListener('change', e => {
      _applyRunStyle('family', e.target.value);
      const layer = State.layers.find(l => l.id === _activeLayerId);
      const ws    = [...new Set((layer?.textParams?.runs || []).map(r => r.weight + '|' + r.style))];
      _updateWeightOptions(e.target.value, ws.length === 1 ? ws[0] : '');
    });

    document.getElementById('text-weight')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-weight')?.addEventListener('change', e => {
      if (!e.target.value) return;
      const [weight, style] = e.target.value.split('|');
      _applyRunStyle('weight', weight);
      _applyRunStyle('style',  style);
    });

    document.getElementById('text-color')?.addEventListener('mousedown', () => {
      if (typeof History !== 'undefined') History.push();
    });
    document.getElementById('text-color')?.addEventListener('input', e => {
      _applyRunStyle('color', e.target.value);
    });

    document.querySelectorAll('.btn-text-align').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof History !== 'undefined') History.push();
        document.querySelectorAll('.btn-text-align').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const layer = State.layers.find(l => l.id === _activeLayerId);
        if (layer) { layer.textParams.align = btn.dataset.align; if (typeof Canvas !== 'undefined') Canvas.render(); }
      });
    });
  }

  function _applyRunStyle(key, value) {
    const layer   = State.layers.find(l => l.id === _activeLayerId);
    if (!layer) return;
    const el      = document.querySelector(`.canvas-layer[data-id="${_activeLayerId}"]`);
    const editing = el?.contentEditable === 'true';
    // Usar selección guardada si existe (caso: usuario clickó panel y perdió foco)
    const offsets  = (editing ? _getSelectionOffsets(el) : null) || _pendingOffsets;
    const savedSel = editing ? _saveSelectionOffsets(el) : null;
    // _pendingOffsets se limpia cuando el texto recupera foco

    if (offsets) {
      _applyStyleToRange(layer, key, value, offsets);
    } else {
      layer.textParams.runs.forEach(r => { r[key] = value; });
    }

    if (editing && el) {
      el.innerHTML = runsToHTML(layer.textParams.runs);
      _restoreSelectionOffsets(el, savedSel);
    }

    if (typeof Canvas !== 'undefined') Canvas.render();
    _refreshPanel();
  }

  // ── API PÚBLICA ─────────────────────────────────────────────
  function getRunsHTML(layer) {
    _migrate(layer);
    return runsToHTML(layer.textParams.runs);
  }

  function saveRunsFromDOM(layer, el) {
    _migrate(layer);
    layer.textParams.runs = htmlToRuns(el);
  }

  function buildLineRuns(runs) {
    const lines = [[]];
    for (const run of (runs || [])) {
      const parts = (run.text || '').split('\n');
      parts.forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part.length > 0) lines[lines.length - 1].push({ ...run, text: part });
      });
    }
    return lines;
  }

  function migrate(layer) { _migrate(layer); }

  // ── DRAG ───────────────────────────────────────────────────
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
      panel.style.left = (e.clientX - _panelOffX) + 'px';
      panel.style.top  = (e.clientY - _panelOffY) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (_draggingPanel) { _draggingPanel = false; document.body.classList.remove('layer-dragging'); }
    });
  }

  function clearPendingOffsets() { _pendingOffsets = null; }
  return { init, openPanel, closePanel, getRunsHTML, saveRunsFromDOM, runsToHTML, htmlToRuns, buildLineRuns, migrate, clearPendingOffsets };
})();
