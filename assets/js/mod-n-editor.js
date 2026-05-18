// ============================================================
// MOD-N-EDITOR.JS — Modal "EDITAR COLECCIÓN" para MOD N
// El botón vive en la topbar del canvas (canvas.js lo crea y muestra
// solo en MOD N, en el sitio de AUTO/CROP). Aquí solo gestionamos la
// caja flotante anclada al botón.
// ============================================================

const ModNEditor = (() => {
  const FORMAT = 'MOD N';

  const TARGETS = [
    { name: 'SOLIDO',        label: 'Fondo' },
    { name: 'DEG. INFERIOR', label: 'Degradado inferior' },
    { name: 'DEG 1',         label: 'Luz 1' },
    { name: 'DEG CENTRAL',   label: 'Luz central' },
    { name: 'DEG 2',         label: 'Luz 2' },
    { name: 'DEG 3',         label: 'Luz base' },
  ];

  function init() {
    _createBox();
    document.addEventListener('click', (e) => {
      const box = document.getElementById('mod-n-editor-box');
      if (!box || box.style.display !== 'block') return;
      if (box.contains(e.target)) return;
      if (e.target.id === 'canvas-modn-btn') return;
      closeModal();
    });
  }

  function _createBox() {
    if (document.getElementById('mod-n-editor-box')) return;
    const box = document.createElement('div');
    box.id = 'mod-n-editor-box';
    box.innerHTML = `
      <div class="mod-n-box-header">
        <span class="mod-n-box-title">Editar Colección</span>
        <button class="mod-n-box-close" id="mod-n-box-close">&#x2715;</button>
      </div>
      <div class="mod-n-box-body" id="mod-n-editor-body"></div>
    `;
    document.body.appendChild(box);
    document.getElementById('mod-n-box-close').addEventListener('click', closeModal);
  }

  function toggleModal(anchorEl) {
    const box = document.getElementById('mod-n-editor-box');
    if (!box) return;
    if (box.style.display === 'block') { closeModal(); return; }
    openModal(anchorEl);
  }

  function openModal(anchorEl) {
    const box = document.getElementById('mod-n-editor-box');
    if (!box) return;
    _renderBody();
    box.style.display = 'block';
    // Posicionar pegado debajo del botón, alineado a su borde derecho
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      box.style.top  = (r.bottom + 6) + 'px';
      box.style.left = 'auto';
      box.style.right = (window.innerWidth - r.right) + 'px';
    }
  }

  function closeModal() {
    const box = document.getElementById('mod-n-editor-box');
    if (box) box.style.display = 'none';
    // Si una capa estaba parpadeando al cerrar el modal, paramos el timer y
    // restauramos su visibilidad — sin esto la capa quedaría invisible para
    // siempre con un setInterval corriendo en segundo plano.
    _stopBlink();
  }

  function _findLayer(name) {
    return State.layers.find(l => l.name === name && l.exclusiveFormat === FORMAT);
  }

  function _getColor(layer) {
    if (!layer) return null;
    if (layer.type === 'solid')    return layer.solidParams?.color || null;
    if (layer.type === 'gradient') return layer.gradientParams?.color1 || null;
    return null;
  }

  function _setColor(layer, color) {
    if (!layer) return;
    if (typeof History !== 'undefined') History.push();
    if (layer.type === 'solid' && layer.solidParams) {
      layer.solidParams.color = color;
    } else if (layer.type === 'gradient' && layer.gradientParams) {
      layer.gradientParams.color1 = color;
      layer.gradientParams.color2 = color;
    }
    if (typeof Canvas !== 'undefined') Canvas.render();
    // Sincroniza con el panel de degradado si está abierto sobre esta capa
    if (layer.type === 'gradient') {
      const c1 = document.getElementById('gradient-color1');
      const c2 = document.getElementById('gradient-color2');
      if (c1 && c1.offsetParent && State.selectedLayerId === layer.id) { c1.value = color; c2.value = color; }
    }
  }

  function _renderBody() {
    const body = document.getElementById('mod-n-editor-body');
    if (!body) return;

    const colorRows = TARGETS.map(t => {
      const layer = _findLayer(t.name);
      if (!layer) return '';
      const color = _getColor(layer) || '#000000';
      return `
        <div class="mod-n-edit-row">
          <label class="mod-n-edit-label mod-n-edit-label-clickable" data-blink="${t.name}" title="Click para ver a qué capa afecta">${t.label}</label>
          <input type="color" class="mod-n-edit-color" data-target="${t.name}" value="${color}" />
        </div>
      `;
    }).filter(Boolean).join('');

    if (!colorRows) {
      body.innerHTML = '<div style="text-align:center;color:#888;padding:8px 0;font-size:11px">No hay capas para editar.</div>';
      return;
    }

    const hueRow = `
      <div class="mod-n-edit-row mod-n-hue-row">
        <label class="mod-n-edit-label" title="Doble click para resetear">Tono</label>
        <input type="range" class="mod-n-hue-slider" id="mod-n-hue-slider" min="-180" max="180" value="0" step="1" />
        <span class="mod-n-hue-value" id="mod-n-hue-value">0°</span>
      </div>
    `;

    body.innerHTML = hueRow + colorRows;

    body.querySelectorAll('.mod-n-edit-color').forEach(input => {
      input.addEventListener('input', (e) => {
        const name = e.target.dataset.target;
        const layer = _findLayer(name);
        _setColor(layer, e.target.value);
      });
    });

    body.querySelectorAll('[data-blink]').forEach(label => {
      label.addEventListener('click', (e) => {
        const name = e.target.dataset.blink;
        const layer = _findLayer(name);
        _blinkLayer(layer);
      });
    });

    _bindHueSlider();
  }

  // ── HUE SLIDER ────────────────────────────────────────────
  // Desplaza el matiz (H en HSL) de los 6 colores a la vez,
  // manteniendo saturación y luminosidad. Al soltar, los colores
  // desplazados quedan como nuevo estado y el slider vuelve a 0.
  let _hueSnapshot      = null;
  let _hueHistoryPushed = false;

  function _bindHueSlider() {
    const slider = document.getElementById('mod-n-hue-slider');
    const label  = document.getElementById('mod-n-hue-value');
    if (!slider || !label) return;

    const begin = () => {
      _hueSnapshot = {};
      TARGETS.forEach(t => {
        const layer = _findLayer(t.name);
        if (!layer) return;
        const color = _getColor(layer);
        if (color) _hueSnapshot[layer.id] = _hexToHsl(color);
      });
      _hueHistoryPushed = false;
    };

    const commit = () => {
      slider.value = 0;
      label.textContent = '0°';
      _hueSnapshot = null;
      _hueHistoryPushed = false;
    };

    slider.addEventListener('pointerdown', begin);

    slider.addEventListener('input', () => {
      const offset = parseInt(slider.value, 10) || 0;
      label.textContent = (offset > 0 ? '+' : '') + offset + '°';
      if (!_hueSnapshot) begin();
      if (!_hueHistoryPushed) {
        if (typeof History !== 'undefined') History.push();
        _hueHistoryPushed = true;
      }
      _applyHueOffset(offset);
    });

    slider.addEventListener('pointerup',    commit);
    slider.addEventListener('pointercancel', commit);
    slider.addEventListener('change',       commit);

    slider.addEventListener('dblclick', () => {
      if (_hueSnapshot) _applyHueOffset(0);
      slider.value = 0;
      label.textContent = '0°';
    });
  }

  function _applyHueOffset(offset) {
    if (!_hueSnapshot) return;
    TARGETS.forEach(t => {
      const layer = _findLayer(t.name);
      if (!layer) return;
      const baseHsl = _hueSnapshot[layer.id];
      if (!baseHsl) return;
      const newHex = _hslToHex({ h: baseHsl.h + offset, s: baseHsl.s, l: baseHsl.l });
      _writeColor(layer, newHex);
      const input = document.querySelector(`.mod-n-edit-color[data-target="${t.name}"]`);
      if (input) input.value = newHex;
    });
    if (typeof Canvas !== 'undefined') Canvas.render();
  }

  function _writeColor(layer, color) {
    if (layer.type === 'solid' && layer.solidParams) {
      layer.solidParams.color = color;
    } else if (layer.type === 'gradient' && layer.gradientParams) {
      layer.gradientParams.color1 = color;
      layer.gradientParams.color2 = color;
    }
    if (layer.type === 'gradient' && State.selectedLayerId === layer.id) {
      const c1 = document.getElementById('gradient-color1');
      const c2 = document.getElementById('gradient-color2');
      if (c1 && c1.offsetParent) { c1.value = color; c2.value = color; }
    }
  }

  // ── HSL <-> HEX ───────────────────────────────────────────
  function _hexToHsl(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    if (!m) return { h: 0, s: 0, l: 0 };
    const [r, g, b] = m.map(c => parseInt(c, 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function _hslToHex({ h, s, l }) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    if      (h <  60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else              [r, g, b] = [c, 0, x];
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  // ── PARPADEO DE CAPA ──────────────────────────────────────
  let _blinkTimer   = null;
  let _blinkTimeout = null;
  let _blinkLayerId = null;
  let _blinkOriginal = null;

  function _blinkLayer(layer) {
    if (!layer) return;
    _stopBlink();

    const fmt = FORMAT;
    if (!State.formatParams[fmt]) State.formatParams[fmt] = {};
    if (!State.formatParams[fmt][layer.id]) State.formatParams[fmt][layer.id] = {};

    const fp = State.formatParams[fmt][layer.id];
    _blinkOriginal = fp.visible !== undefined ? fp.visible : true;
    _blinkLayerId  = layer.id;

    let on = true;
    _blinkTimer = setInterval(() => {
      on = !on;
      State.formatParams[fmt][layer.id].visible = on;
      if (typeof Canvas !== 'undefined') Canvas.render();
    }, 200);

    _blinkTimeout = setTimeout(_stopBlink, 3000);
  }

  function _stopBlink() {
    if (_blinkTimer)   { clearInterval(_blinkTimer);   _blinkTimer   = null; }
    if (_blinkTimeout) { clearTimeout(_blinkTimeout);  _blinkTimeout = null; }
    if (_blinkLayerId && _blinkOriginal !== null) {
      if (!State.formatParams[FORMAT][_blinkLayerId]) State.formatParams[FORMAT][_blinkLayerId] = {};
      State.formatParams[FORMAT][_blinkLayerId].visible = _blinkOriginal;
      if (typeof Canvas !== 'undefined') Canvas.render();
    }
    _blinkLayerId  = null;
    _blinkOriginal = null;
  }

  return { init, openModal, closeModal, toggleModal };
})();
