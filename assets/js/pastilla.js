// ============================================================
// PASTILLA.JS — Sistema de pastilla de publicidad
// ============================================================

const Pastilla = (() => {

  const FORMATS = ['199 PUBLI', 'IPLUS PUBLI', 'MOD DEST 2', 'MUX4 TXT', 'WEB PUBLI', 'WOW PUBLI', 'MOVIL MUX FONDO'];
  const FIXED_FORMATS = ['MOVIL MUX FONDO'];

  const SRC = {
    negra:  'assets/img/pastilla_publi_negra.svg',
    blanca: 'assets/img/pastilla_publi_blanca.svg',
  };

  let _panelOpen    = false;
  let _dragging     = false;
  let _panelOffX    = 0;
  let _panelOffY    = 0;

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    FORMATS.forEach(fid => {
      if (State.pastillaConfig.visible[fid] === undefined) State.pastillaConfig.visible[fid] = false;
      if (State.pastillaConfig.locked[fid]  === undefined) State.pastillaConfig.locked[fid]  = false;
    });
    _bindPanelDrag();
  }

  // ── CONSULTAS ─────────────────────────────────────────────

  function hasFormat(formatId) {
    return FORMATS.includes(formatId);
  }

  function isVisible(formatId) {
    return !!State.pastillaConfig.visible[formatId];
  }

  function isLocked(formatId) {
    if (FIXED_FORMATS.includes(formatId)) return true;
    return !!State.pastillaConfig.locked[formatId];
  }

  function isFixed(formatId) {
    return FIXED_FORMATS.includes(formatId);
  }

  function setVisible(formatId, val) {
    State.pastillaConfig.visible[formatId] = val;
  }

  function setLocked(formatId, val) {
    State.pastillaConfig.locked[formatId] = val;
  }

  function getVariant(formatId) {
    const fid = formatId || State.activeFormat;
    if (fid && State.pastillaConfig.variantByFormat?.[fid] !== undefined) {
      return State.pastillaConfig.variantByFormat[fid];
    }
    return State.pastillaConfig.variant || 'negra';
  }

  function setVariant(formatId, v) {
    if (!State.pastillaConfig.variantByFormat) State.pastillaConfig.variantByFormat = {};
    State.pastillaConfig.variantByFormat[formatId] = v;
  }

  function getSrc(formatId) {
    return SRC[getVariant(formatId || State.activeFormat)] || SRC.negra;
  }

  function getDefaults(formatId) {
    return State.pastillaConfig.defaults[formatId] || { x: 0, y: 0, scale: 0.5 };
  }

  function getOffsetX(formatId) {
    return State.pastillaConfig.offsetX[formatId] || 0;
  }

  function setOffsetX(formatId, val) {
    State.pastillaConfig.offsetX[formatId] = val;
  }

  // Posición final = default + offsetX del usuario (Y y scale fijos)
  function getPosition(formatId) {
    const d = getDefaults(formatId);
    return {
      x:     d.x + getOffsetX(formatId),
      y:     d.y,
      scale: d.scale,
    };
  }

  // ── PANEL FLOTANTE (editor de variante) ───────────────────

  function openPanel() {
    let panel = document.getElementById('pastilla-editor-panel');
    if (!panel) _createPanel();
    panel = document.getElementById('pastilla-editor-panel');

    panel.querySelectorAll('.pastilla-variant-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.variant === getVariant(State.activeFormat));
    });

    panel.classList.add('visible');
    _panelOpen = true;
  }

  function closePanel() {
    const panel = document.getElementById('pastilla-editor-panel');
    if (panel) panel.classList.remove('visible');
    _panelOpen = false;
  }

  function _createPanel() {
    const panel = document.createElement('div');
    panel.id = 'pastilla-editor-panel';
    panel.className = 'floating-editor-panel';
    panel.style.width = '280px';
    panel.innerHTML = `
      <div id="pastilla-editor-header" class="floating-editor-header">
        <span>Pastilla Publicidad</span>
        <button id="pastilla-editor-close">&#x2715;</button>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:10px;">
        <div style="font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#777;">Modelo</div>
        <div style="display:flex;gap:8px;">
          <div class="pastilla-variant-btn" data-variant="negra" style="cursor:pointer;border:2px solid transparent;border-radius:4px;padding:8px;background:#1e1e1e;display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
            <img src="${SRC.negra}" style="width:100%;height:auto;display:block;" alt="Negra" />
            <span style="font-family:var(--font);font-size:9px;color:#999;letter-spacing:0.05em;">NEGRA</span>
          </div>
          <div class="pastilla-variant-btn" data-variant="blanca" style="cursor:pointer;border:2px solid transparent;border-radius:4px;padding:8px;background:#1e1e1e;display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
            <img src="${SRC.blanca}" style="width:100%;height:auto;display:block;" alt="Blanca" />
            <span style="font-family:var(--font);font-size:9px;color:#999;letter-spacing:0.05em;">BLANCA</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('pastilla-editor-close').addEventListener('click', closePanel);

    panel.querySelectorAll('.pastilla-variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof History !== 'undefined') History.push();
        setVariant(State.activeFormat, btn.dataset.variant);
        panel.querySelectorAll('.pastilla-variant-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.variant === getVariant(State.activeFormat));
        });
        if (typeof Canvas !== 'undefined') Canvas.render();
        if (typeof Layers !== 'undefined') Layers.render();
        if (State.activeFormat === 'MUX4 TXT' && typeof Composicion !== 'undefined') Composicion.generate();
      });
    });
  }

  function _bindPanelDrag() {
    document.addEventListener('mousedown', e => {
      const header = e.target.closest('#pastilla-editor-header');
      if (!header || e.target.id === 'pastilla-editor-close') return;
      const panel = document.getElementById('pastilla-editor-panel');
      if (!panel) return;
      _dragging = true;
      _panelOffX = e.clientX - panel.offsetLeft;
      _panelOffY = e.clientY - panel.offsetTop;
      document.body.classList.add('layer-dragging');
    });
    document.addEventListener('mousemove', e => {
      if (!_dragging) return;
      const panel = document.getElementById('pastilla-editor-panel');
      if (!panel) return;
      panel.style.left  = (e.clientX - _panelOffX) + 'px';
      panel.style.top   = (e.clientY - _panelOffY) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (_dragging) { _dragging = false; document.body.classList.remove('layer-dragging'); }
    });
  }

  // ── SERIALIZACIÓN (para project.js) ───────────────────────

  function serialize() {
    return {
      variant:         State.pastillaConfig.variant || 'negra',
      variantByFormat: { ...(State.pastillaConfig.variantByFormat || {}) },
      visible: { ...State.pastillaConfig.visible },
      offsetX: { ...State.pastillaConfig.offsetX },
      locked:  { ...State.pastillaConfig.locked },
    };
  }

  function restore(data) {
    if (!data) return;
    State.pastillaConfig.variant         = data.variant || 'negra';
    State.pastillaConfig.variantByFormat = data.variantByFormat || {};
    State.pastillaConfig.visible = data.visible || {};
    State.pastillaConfig.offsetX = data.offsetX || {};
    State.pastillaConfig.locked  = data.locked  || {};
  }

  return {
    init, hasFormat, isVisible, isLocked, isFixed, setVisible, setLocked,
    getVariant, setVariant, getSrc, getDefaults, getOffsetX, setOffsetX, getPosition,
    openPanel, closePanel, serialize, restore,
    FORMATS,
  };
})();
