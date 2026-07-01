// ============================================================
// CANVAS.JS — Renderizado con lienzo escalado
// ============================================================

const Canvas = (() => {

  // ── POSICIÓN FIJA DE COMPOSICIÓN TÍTULO EN MUX4 FONDO ────
  const _COMP_FONDO_X      = 106; // px desde el borde izquierdo (MOCKUP visible o sin overlay)
  const _COMP_FONDO_Y      = 185; // px desde el borde superior  (MOCKUP visible o sin overlay)
  const _COMP_FONDO_FOCO_X = 106; // px desde el borde izquierdo (FOCO visible)
  const _COMP_FONDO_FOCO_Y = 457; // px desde el borde superior  (FOCO visible)

  // ── POSICIÓN FIJA DE COMPOSICIÓN MOVIL TEXTO EN MOVIL MUX FONDO ──
  const _COMP_MOVIL_X = 0;    // ajusta según diseño
  const _COMP_MOVIL_Y = 1217; // hardcodeado

  let _area        = null;
  let _lienzo      = null;
  let _scale       = 1;
  let _lienzoW     = 0;
  let _lienzoH     = 0;
  let _contentCenterX = 0;
  let _contentCenterY = 0;
  let _contentScaleX  = 1;
  let _contentScaleY  = 1;
  let _contentClip    = null;

  let _dragging    = false;
  let _dragStartX  = 0;
  let _dragStartY  = 0;
  let _dragOrigins = {};
  let _editingText = false;

  let _resizing     = false;
  let _resizeHandle = null;
  let _resizeStart  = {};

  let _handles      = null;

  // ── MODO ENCUADRE FOCAL ───────────────────────────────────
  // Cuando está activo, el lienzo muestra el formato fantasma `__FOCAL__` y
  // SOLO la capa-sujeto que se está encuadrando. Suprime el fondo verde
  // chivato, oculta el resto de capas (sistema incluidas) y silencia el push
  // de history en cada gesto (la sesión cuenta como un único paso de undo).
  let _framingMode    = false;
  let _framingLayerId = null;
  function setFraming(on, layerId) {
    _framingMode    = !!on;
    _framingLayerId = on ? (layerId || null) : null;
  }
  function isFraming() { return _framingMode; }

  function init() {
    _area   = document.getElementById('canvas-area');
    _lienzo = document.getElementById('lienzo');
    if (!_area || !_lienzo) return;

    _area.addEventListener('click', e => {
      if (e.target === _area) _deselect();
    });

    window.addEventListener('resize', () => {
      _updateLienzo();
      render();
    });

    // Re-render cuando las fuentes custom (Apercu, Movistar, Abolition…)
    // terminan de cargar — sin esto, `el.offsetWidth/Height` mide texto con
    // Arial fallback la primera vez y la posición/alineación queda mal.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => render()).catch(() => {});
    }

    _injectNoiseFilter();
    _bindArrowKeys();
    _initMarcaIplus();
    _initMarcaSony();
    render();
  }

  function _initMarcaIplus() {
    if (State.layers.find(l => l.isMarcaIplus)) return;
    const src = 'assets/img/checkers/IPLUS_PUBLI_MANCHA_Check.png';
    const img = new Image();
    img.onload = () => {
      if (State.layers.find(l => l.isMarcaIplus)) return;
      const tmp = document.createElement('canvas');
      tmp.width  = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext('2d').drawImage(img, 0, 0);
      const dataUrl = tmp.toDataURL('image/png');
      const layer = {
        id:           'layer_marca_iplus',
        name:         'MARCA IPLUS',
        isMarcaIplus: true,
        visible:      true,
        src:          dataUrl,
        naturalWidth:  img.naturalWidth,
        naturalHeight: img.naturalHeight,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      State.layers.unshift(layer);
      Object.keys(State.formatSizes || {}).forEach(fid => {
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        State.formatParams[fid][layer.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
      });
      if (typeof Layers !== 'undefined') Layers.render();
      render();
    };
    img.onerror = () => console.error(`[Canvas] No se pudo cargar la marca IPLUS (${src}). El formato IPLUS PUBLI no mostrará la marca.`);
    img.src = src;
  }

  function _initMascaraBlur() {
    if (State.layers.find(l => l.isMascaraBlur)) return;
    const src = 'assets/img/mascara_Blur_Fanart_MODN.png';
    const img = new Image();
    img.onload = () => {
      if (State.layers.find(l => l.isMascaraBlur)) return;
      const tmp = document.createElement('canvas');
      tmp.width  = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext('2d').drawImage(img, 0, 0);
      const dataUrl = tmp.toDataURL('image/png');
      const layer = {
        id:               'layer_mascara_blur',
        name:             'MÁSCARA BLUR',
        isMascaraBlur:    true,
        visible:          true,
        src:              dataUrl,
        naturalWidth:     img.naturalWidth,
        naturalHeight:    img.naturalHeight,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      // Insertar justo después de MOLDURA si existe (queda bajo MOLDURA, encima del resto)
      const moldIdx = State.layers.findIndex(l => l.isMolduraFanart);
      if (moldIdx >= 0) State.layers.splice(moldIdx + 1, 0, layer);
      else State.layers.unshift(layer);
      // Posicionar a 1920×1080 (PNG es 3840×2160 → 50%)
      if (!State.formatParams['FANART MOD N']) State.formatParams['FANART MOD N'] = {};
      State.formatParams['FANART MOD N'][layer.id] = { x: 0, y: 0, scaleX: 50, scaleY: 50, rotation: 0 };
      if (typeof Layers !== 'undefined') Layers.render();
      render();
    };
    img.onerror = () => console.error(`[Canvas] No se pudo cargar la máscara blur (${src}). FANART MOD N quedará sin difuminado.`);
    img.src = src;
  }

  function _initMolduraFanart() {
    if (State.layers.find(l => l.isMolduraFanart)) return;
    const src = 'assets/img/moldura_fanart_MODN.png';
    const img = new Image();
    img.onload = () => {
      if (State.layers.find(l => l.isMolduraFanart)) return;
      const tmp = document.createElement('canvas');
      tmp.width  = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext('2d').drawImage(img, 0, 0);
      const dataUrl = tmp.toDataURL('image/png');
      const layer = {
        id:               'layer_moldura_fanart',
        name:             'MOLDURA',
        isMolduraFanart:  true,
        visible:          true,
        blendMode:        'multiply',
        src:              dataUrl,
        naturalWidth:     img.naturalWidth,
        naturalHeight:    img.naturalHeight,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      State.layers.unshift(layer); // siempre arriba (z-index máximo)
      // Escalar 3840×2160 → 1920×1080 (50%) y centrar
      if (!State.formatParams['FANART MOD N']) State.formatParams['FANART MOD N'] = {};
      State.formatParams['FANART MOD N'][layer.id] = { x: 0, y: 0, scaleX: 50, scaleY: 50, rotation: 0 };
      if (typeof Layers !== 'undefined') Layers.render();
      render();
    };
    img.onerror = () => console.error(`[Canvas] No se pudo cargar la moldura FANART (${src}). FANART MOD N quedará sin marco.`);
    img.src = src;
  }

  function _initMarcaSony() {
    if (State.layers.find(l => l.isMarcaSony)) return;
    const src = 'assets/img/checkers/MARCA_SONY.png';
    const img = new Image();
    img.onload = () => {
      if (State.layers.find(l => l.isMarcaSony)) return;
      const tmp = document.createElement('canvas');
      tmp.width  = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext('2d').drawImage(img, 0, 0);
      const dataUrl = tmp.toDataURL('image/png');
      const layer = {
        id:          'layer_marca_sony',
        name:        'MARCA SONY',
        isMarcaSony: true,
        visible:     true,
        src:         dataUrl,
        naturalWidth:  img.naturalWidth,
        naturalHeight: img.naturalHeight,
        params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' },
      };
      State.layers.unshift(layer);
      Object.keys(State.formatSizes || {}).forEach(fid => {
        if (!State.formatParams[fid]) State.formatParams[fid] = {};
        State.formatParams[fid][layer.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
      });
      if (typeof Layers !== 'undefined') Layers.render();
      render();
    };
    img.onerror = () => console.error(`[Canvas] No se pudo cargar la marca SONY (${src}). El formato SONY no mostrará la marca.`);
    img.src = src;
  }

  // ── FILTRO DE RUIDO SVG ───────────────────────────────────
  // 100 niveles, curva cuadrática para más control en valores bajos.
  // feComposite operator="in" recorta el grano al alfa original
  // para que no afecte a zonas transparentes del PNG.

  function _injectNoiseFilter() {
    if (document.getElementById('mp-noise-svg')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'mp-noise-svg';
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;';

    let defs = '<defs>';
    for (let i = 1; i <= 100; i++) {
      // Curva cuadrática: valores bajos muy sutiles, valores altos intensos
      const t       = i / 100;
      const opacity = (t * t * 1.5).toFixed(3); // 0.00015 a 1.5
      defs += `
        <filter id="mp-noise-${i}" x="0%" y="0%" width="100%" height="100%"
                color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.65"
                        numOctaves="3" stitchTiles="stitch" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
          <feComponentTransfer in="grayNoise" result="scaledNoise">
            <feFuncA type="linear" slope="${opacity}"/>
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="scaledNoise" mode="overlay" result="blended"/>
          <feComposite in="blended" in2="SourceGraphic" operator="in"/>
        </filter>`;
    }
    defs += '</defs>';
    svg.innerHTML = defs;
    document.body.appendChild(svg);
  }

  function _deselect() {
    State.selectedLayerId  = null;
    State.selectedLayerIds = [];
    _keyLayerId = null;
    _hideHandles();
    render();
    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof UI     !== 'undefined') UI.updateSliders();
  }

  // ── LIENZO ────────────────────────────────────────────────

  // TÍTULO FICHA: la imagen de título va a 300px de alto, pegada a la izquierda; el ANCHO del
  // formato = ancho de la imagen (tope 2172, mín 10) salvo override manual del tirador.
  function _layoutTituloFicha() {
    const fs = State.formatSizes['TÍTULO FICHA'];
    if (!fs) return;
    const title = State.layers.find(l => l.isTitleLayer);
    if (!title || !title.naturalWidth || !title.naturalHeight) return;
    const H = 300, MAXW = 2172, MINW = 10;
    const s  = H / title.naturalHeight;
    const dw = Math.round(title.naturalWidth * s);
    if (!State.tituloFichaManual) fs.w = Math.max(MINW, Math.min(dw, MAXW));
    const W = fs.w;
    if (!State.formatParams['TÍTULO FICHA']) State.formatParams['TÍTULO FICHA'] = {};
    State.formatParams['TÍTULO FICHA'][title.id] = {
      x: Math.round(dw / 2 - W / 2),
      y: 0,
      scaleX: Math.round(s * 1000) / 10,
      scaleY: Math.round(s * 1000) / 10,
      rotation: 0,
      visible: true,
    };
  }

  // ── REGLAS Y GUÍAS ─────────────────────────────────────────
  // Reglas (top + left) fuera del lienzo. Drag desde una regla crea una guía.
  // Drag sobre una guía la mueve. Drag de vuelta a la regla la borra.
  const RULER_SIZE = 10; // px
  function _updateRulersAndGuides() {
    // Asegurar que los elementos existen
    let rulerH = document.getElementById('canvas-ruler-h');
    let rulerV = document.getElementById('canvas-ruler-v');
    let guidesLayer = document.getElementById('canvas-guides-layer');
    if (!rulerH) {
      rulerH = document.createElement('div');
      rulerH.id = 'canvas-ruler-h';
      _area.appendChild(rulerH);
      _bindRuler(rulerH, 'h');
    }
    if (!rulerV) {
      rulerV = document.createElement('div');
      rulerV.id = 'canvas-ruler-v';
      _area.appendChild(rulerV);
      _bindRuler(rulerV, 'v');
    }
    if (!guidesLayer) {
      guidesLayer = document.createElement('div');
      guidesLayer.id = 'canvas-guides-layer';
      _area.appendChild(guidesLayer);
    }
    if (!State.activeFormat) {
      rulerH.style.display = rulerV.style.display = guidesLayer.style.display = 'none';
      return;
    }

    // Posicionar las reglas alrededor del lienzo
    const lx = parseFloat(_lienzo.style.left) || 0;
    const ly = parseFloat(_lienzo.style.top)  || 0;
    rulerH.style.display = 'block';
    rulerH.style.left    = lx + 'px';
    rulerH.style.top     = (ly - RULER_SIZE) + 'px';
    rulerH.style.width   = _lienzoW + 'px';
    rulerH.style.height  = RULER_SIZE + 'px';

    rulerV.style.display = 'block';
    rulerV.style.left    = (lx - RULER_SIZE) + 'px';
    rulerV.style.top     = ly + 'px';
    rulerV.style.width   = RULER_SIZE + 'px';
    rulerV.style.height  = _lienzoH + 'px';

    // Render de las guías existentes
    guidesLayer.innerHTML = '';
    guidesLayer.style.cssText = `position:absolute;left:${lx}px;top:${ly}px;width:${_lienzoW}px;height:${_lienzoH}px;pointer-events:none;z-index:8200;`;
    const fid = State.activeFormat;
    const visible = Formats.areGuidesVisible(fid);
    if (!visible) return;
    const locked = Formats.areGuidesLocked(fid);
    const guides = Formats.getGuides(fid);
    guides.forEach(g => {
      const el = document.createElement('div');
      el.className = 'canvas-guide' + (locked ? ' is-locked' : '');
      el.dataset.id = g.id;
      el.dataset.orient = g.orient;
      if (g.orient === 'v') {
        // pos en px del formato → píxeles del lienzo
        const x = Math.round(g.pos * _scale * (_contentScaleX || 1));
        el.style.cssText = `position:absolute;left:${x}px;top:0;width:1px;height:100%;background:#00BFFF;pointer-events:${locked ? 'none' : 'auto'};cursor:${locked ? 'default' : 'ew-resize'};`;
        // Zona de hit más ancha para facilitar el agarre
        const hit = document.createElement('div');
        hit.style.cssText = `position:absolute;left:-4px;top:0;width:9px;height:100%;`;
        el.appendChild(hit);
      } else {
        const y = Math.round(g.pos * _scale * (_contentScaleY || 1));
        el.style.cssText = `position:absolute;left:0;top:${y}px;width:100%;height:1px;background:#00BFFF;pointer-events:${locked ? 'none' : 'auto'};cursor:${locked ? 'default' : 'ns-resize'};`;
        const hit = document.createElement('div');
        hit.style.cssText = `position:absolute;left:0;top:-4px;width:100%;height:9px;`;
        el.appendChild(hit);
      }
      if (!locked) _bindGuideDrag(el, g);
      guidesLayer.appendChild(el);
    });
  }

  // Drag desde una regla → crear guía nueva. Mientras arrastras se ve una línea fantasma.
  function _bindRuler(rulerEl, orient) {
    rulerEl.addEventListener('mousedown', e => {
      if (!State.activeFormat) return;
      if (Formats.areGuidesLocked(State.activeFormat)) return;
      e.preventDefault();
      const ghost = _makeGhostGuide(orient);
      const onMove = ev => _positionGhost(ghost, orient, ev);
      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Calcular posición en coords del formato
        const pos = _ghostToFormatPos(orient, ev);
        ghost.remove();
        // Si soltó fuera del lienzo (en zona de reglas o más allá), no crear
        if (pos === null) return;
        Formats.addGuide(State.activeFormat, orient, pos);
      };
      _positionGhost(ghost, orient, e);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Drag sobre una guía existente: moverla; si sale del lienzo a la regla, eliminarla.
  function _bindGuideDrag(el, guide) {
    el.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      const fid = State.activeFormat;
      const onMove = ev => {
        const pos = _ghostToFormatPos(guide.orient, ev, /*allowOutside=*/true);
        if (pos === null) {
          // Marcar como "se va a borrar"
          el.style.opacity = '0.3';
          el.style.background = '#ff4444';
        } else {
          el.style.opacity = '1';
          el.style.background = '#00BFFF';
          // Reposicionar visualmente
          if (guide.orient === 'v') {
            el.style.left = Math.round(pos * _scale * (_contentScaleX || 1)) + 'px';
          } else {
            el.style.top  = Math.round(pos * _scale * (_contentScaleY || 1)) + 'px';
          }
        }
      };
      const onUp = ev => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const pos = _ghostToFormatPos(guide.orient, ev, /*allowOutside=*/true);
        if (pos === null) {
          Formats.deleteGuide(fid, guide.id);
        } else {
          Formats.moveGuide(fid, guide.id, pos);
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function _makeGhostGuide(orient) {
    const g = document.createElement('div');
    g.style.cssText = `position:absolute;background:#00BFFF;z-index:8300;pointer-events:none;${orient === 'v' ? 'width:1px;height:100%;top:0;' : 'height:1px;width:100%;left:0;'}`;
    _area.appendChild(g);
    return g;
  }
  function _positionGhost(ghost, orient, ev) {
    const r = _area.getBoundingClientRect();
    if (orient === 'v') {
      ghost.style.left = (ev.clientX - r.left) + 'px';
    } else {
      ghost.style.top  = (ev.clientY - r.top)  + 'px';
    }
  }
  // Devuelve la posición en coords del FORMATO (px) o null si está fuera del lienzo.
  // allowOutside=true: permite estar fuera (devuelve null si pasa la regla → borrar).
  function _ghostToFormatPos(orient, ev, allowOutside) {
    const lr = _lienzo.getBoundingClientRect();
    if (orient === 'v') {
      const xPx = ev.clientX - lr.left;
      if (xPx < 0 || xPx > _lienzoW) return null;
      return (xPx / _scale) / (_contentScaleX || 1);
    } else {
      const yPx = ev.clientY - lr.top;
      if (yPx < 0 || yPx > _lienzoH) return null;
      return (yPx / _scale) / (_contentScaleY || 1);
    }
  }

  // ── SNAP: cálculo del ajuste hacia la guía más cercana ─────
  // Devuelve {dx, dy} a SUMAR al delta de arrastre actual para que algún borde/centro
  // de las capas seleccionadas quede pegado a una guía si está dentro del radio.
  // Radio en PÍXELES DE PANTALLA → convertido a px del formato dividiendo por _scale.
  const SNAP_RADIUS_PX = 6;
  function _calcSnapAdjustment(dx, dy) {
    const fid = State.activeFormat;
    if (!fid) return { dx: 0, dy: 0 };
    const guides = Formats.getGuides(fid);
    if (!guides.length) return { dx: 0, dy: 0 };
    if (!Formats.areGuidesVisible(fid)) return { dx: 0, dy: 0 };

    const guidesV = guides.filter(g => g.orient === 'v').map(g => g.pos);
    const guidesH = guides.filter(g => g.orient === 'h').map(g => g.pos);
    if (!guidesV.length && !guidesH.length) return { dx: 0, dy: 0 };

    // Radio en coords del formato (el snap es por píxel de pantalla, no de formato)
    const radiusX = SNAP_RADIUS_PX / (_scale * (_contentScaleX || 1));
    const radiusY = SNAP_RADIUS_PX / (_scale * (_contentScaleY || 1));

    // El sistema coloca las capas con el CENTRO en el CENTRO del lienzo + p.x/p.y.
    // Las guías están en coords absolutas del formato (0..W para v, 0..H para h).
    // Para comparar: punto de la capa en coords del formato = W/2 + p.x (horizontal),
    //                                                          H/2 + p.y (vertical).
    const fmtSize = State.formatSizes[fid];
    const W = fmtSize?.w || 0;
    const H = fmtSize?.h || 0;

    // Buscar el menor ajuste (snap más cercano) en X y en Y, considerando TODOS los puntos
    // de TODAS las capas seleccionadas (centro + 4 bordes) contra TODAS las guías.
    let bestAdjX = null;
    let bestAdjY = null;

    State.selectedLayerIds.forEach(lid => {
      const origin = _dragOrigins[lid];
      if (!origin) return;
      const layer = State.layers.find(l => l.id === lid);
      if (!layer) return;
      const p = _getParams(lid);
      // Posición tentativa (con dx/dy actuales aplicados al origen del drag)
      const px = origin.x + dx;
      const py = origin.y + dy;

      // Bounding box visual de la capa (ancho/alto en coords del formato)
      const nw = layer.naturalWidth  || (layer.solidParams?.width)  || 0;
      const nh = layer.naturalHeight || (layer.solidParams?.height) || 0;
      const sx = (p.scaleX ?? 100) / 100;
      const sy = (p.scaleY ?? 100) / 100;
      const halfW = (nw * sx) / 2;
      const halfH = (nh * sy) / 2;

      // Puntos candidatos en coords del formato (centro + 4 bordes)
      const cx = W / 2 + px;
      const cy = H / 2 + py;
      const xPoints = [cx, cx - halfW, cx + halfW];
      const yPoints = [cy, cy - halfH, cy + halfH];

      // X: comparar puntos verticales de la capa con guías verticales
      xPoints.forEach(pt => {
        guidesV.forEach(gp => {
          const diff = gp - pt;
          if (Math.abs(diff) <= radiusX) {
            if (bestAdjX === null || Math.abs(diff) < Math.abs(bestAdjX)) bestAdjX = diff;
          }
        });
      });
      // Y: comparar puntos horizontales de la capa con guías horizontales
      yPoints.forEach(pt => {
        guidesH.forEach(gp => {
          const diff = gp - pt;
          if (Math.abs(diff) <= radiusY) {
            if (bestAdjY === null || Math.abs(diff) < Math.abs(bestAdjY)) bestAdjY = diff;
          }
        });
      });
    });

    return { dx: bestAdjX || 0, dy: bestAdjY || 0 };
  }

  // Manejador para ajustar a mano el ancho de TÍTULO FICHA (borde derecho del lienzo)
  function _updateTituloFichaHandle() {
    let h = document.getElementById('titulo-ficha-handle');
    if (State.activeFormat !== 'TÍTULO FICHA') { if (h) h.style.display = 'none'; return; }
    if (!h) {
      h = document.createElement('div');
      h.id = 'titulo-ficha-handle';
      h.dataset.tooltip = 'Arrastra para ajustar el ancho';
      _area.appendChild(h);
      _bindTituloFichaHandle(h);
    }
    const lx = parseFloat(_lienzo.style.left) || 0;
    const ly = parseFloat(_lienzo.style.top)  || 0;
    h.style.display = 'block';
    h.style.left    = Math.round(lx + _lienzoW - 3) + 'px';
    h.style.top     = Math.round(ly) + 'px';
    h.style.height  = _lienzoH + 'px';
  }

  function _bindTituloFichaHandle(h) {
    let startX = 0, startW = 0, dragging = false;
    const onMove = e => {
      if (!dragging) return;
      const delta = (e.clientX - startX) / (_scale || 1);
      const w = Math.max(10, Math.min(Math.round(startW + delta), 2172));
      State.formatSizes['TÍTULO FICHA'].w = w;
      State.tituloFichaManual = true;
      State.dirty = true;
      render();
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      dragging = true;
      startX = e.clientX;
      startW = State.formatSizes['TÍTULO FICHA'].w;
      if (typeof History !== 'undefined') History.push();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    // Doble clic: volver al ancho automático (= ancho de la imagen de título)
    h.addEventListener('dblclick', e => {
      e.stopPropagation();
      if (typeof History !== 'undefined') History.push();
      State.tituloFichaManual = false;
      State.dirty = true;
      render();
    });
  }

  function _updateLienzo() {
    if (!State.activeFormat) {
      _lienzo.style.display = 'none';
      _lienzo.style.outline = '';
      const mb = document.getElementById('canvas-mockup-btn');
      if (mb) mb.style.display = 'none';
      _updateRulersAndGuides(); // ocultar reglas/guías (sin esto quedan las del último formato)
      return;
    }

    if (State.activeFormat === 'TÍTULO FICHA') _layoutTituloFicha();

    const size = State.formatSizes[State.activeFormat];
    if (!size) {
      _lienzo.style.display = 'none';
      _lienzo.style.outline = '';
      const mb = document.getElementById('canvas-mockup-btn');
      if (mb) mb.style.display = 'none';
      _updateRulersAndGuides(); // ocultar reglas/guías (sin esto quedan las del último formato)
      return;
    }

    // Si el formato tiene contexto visual (ej: AD PAUSE), el lienzo muestra el contexto completo
    const dc = size.displayContext;
    const displayW = dc ? dc.w : size.w;
    const displayH = dc ? dc.h : size.h;

    const areaW = _area.clientWidth  - 80;
    const areaH = _area.clientHeight - 80;

    const scaleX = areaW / displayW;
    const scaleY = areaH / displayH;
    _scale   = Math.min(scaleX, scaleY, 1);
    _lienzoW = Math.round(displayW * _scale);
    _lienzoH = Math.round(displayH * _scale);

    // Centro de contenido editable (donde se posicionan las capas del usuario)
    if (dc) {
      const clipW = dc.contentW || size.w;
      const clipH = dc.contentH || size.h;
      _contentScaleX  = clipW / size.w;
      _contentScaleY  = clipH / size.h;
      _contentCenterX = (clipW / 2) * _scale;
      _contentCenterY = (clipH / 2) * _scale;

      // Contenedor de recorte para las capas del usuario
      if (!_contentClip || !_lienzo.contains(_contentClip)) {
        _contentClip = document.createElement('div');
        _contentClip.id = 'content-clip';
        _lienzo.appendChild(_contentClip);
      }
      const _greenBg = (!_framingMode && typeof Export !== 'undefined' && !Export.isPngFormat(State.activeFormat)) ? '#00ff12' : 'transparent';
      _contentClip.style.cssText = `
        position: absolute;
        left: ${Math.round(dc.contentX * _scale)}px;
        top: ${Math.round(dc.contentY * _scale)}px;
        width: ${Math.round(clipW * _scale)}px;
        height: ${Math.round(clipH * _scale)}px;
        overflow: hidden;
        z-index: 1;
        background: ${_greenBg};
      `;
    } else {
      _contentScaleX  = 1;
      _contentScaleY  = 1;
      _contentCenterX = _lienzoW / 2;
      _contentCenterY = _lienzoH / 2;
      // Eliminar clip si existía
      if (_contentClip && _lienzo.contains(_contentClip)) {
        // Mover capas de vuelta al lienzo antes de eliminar
        while (_contentClip.firstChild) _lienzo.appendChild(_contentClip.firstChild);
        _contentClip.remove();
      }
      _contentClip = null;
    }

    _lienzo.style.display = 'block';
    _lienzo.style.width   = _lienzoW + 'px';
    _lienzo.style.height  = _lienzoH + 'px';
    _lienzo.style.left    = Math.round((_area.clientWidth  - _lienzoW) / 2) + 'px';
    _lienzo.style.top     = Math.round((_area.clientHeight - _lienzoH) / 2) + 'px';

    _updateTituloFichaHandle();
    _updateRulersAndGuides();

    // Fondo verde "chivato" — solo cuando no hay displayContext (con dc lo lleva _contentClip)
    // y solo para formatos que se exportan como JPG (los PNG llevan transparencia).
    const _isPng = typeof Export !== 'undefined' && Export.isPngFormat(State.activeFormat);
    _lienzo.style.background = (!_framingMode && !dc && !_isPng) ? '#00ff12' : 'transparent';
    // En modo encuadre, marcar el contorno del marco (el lienzo ES el marco).
    _lienzo.style.outline = _framingMode ? '2px solid #f0a500' : '';

    // ── Botón OK flotante ─────────────────────────────────────
    // OK se añade dentro de auto-controls (se crea allí abajo)

    let ccBtn = document.getElementById('canvas-cc-btn');
    if (!ccBtn) {
      ccBtn = document.createElement('button');
      ccBtn.id = 'canvas-cc-btn';
      _area.appendChild(ccBtn);
      ccBtn.addEventListener('click', _copyCaratulaCC);
    }

    // Contenedor de botones de maquetación automática
    if (!document.getElementById('canvas-auto-controls')) {
      const controls = document.createElement('div');
      controls.id = 'canvas-auto-controls';
      _area.appendChild(controls);

      const autoBtn = document.createElement('button');
      autoBtn.id = 'canvas-auto-btn';
      autoBtn.textContent = 'AUTO';
      autoBtn.title = 'Resetear a maquetación automática';
      controls.appendChild(autoBtn);
      autoBtn.addEventListener('click', () => {
        if (typeof AutoLayout !== 'undefined' && State.activeFormat) {
          AutoLayout.resetFormat(State.activeFormat);
          _updateAutoButtons();
        }
      });

      const fitBtn = document.createElement('button');
      fitBtn.id = 'canvas-fit-btn';
      controls.appendChild(fitBtn);
      fitBtn.addEventListener('click', () => {
        if (typeof AutoLayout !== 'undefined' && State.activeFormat) {
          AutoLayout.toggleScaleMode(State.activeFormat);
          _updateAutoButtons();
        }
      });



      // Botón EDITAR COLECCIÓN (solo MOD N) — mismo contenedor, reemplaza AUTO/CROP/variantes
      const modnBtn = document.createElement('button');
      modnBtn.id = 'canvas-modn-btn';
      modnBtn.textContent = 'EDITAR COLECCIÓN';
      controls.appendChild(modnBtn);
      modnBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ModNEditor !== 'undefined') ModNEditor.toggleModal(modnBtn);
      });

      // Dropdown de variantes
      const variantWrap = document.createElement('div');
      variantWrap.id = 'canvas-variant-wrap';
      controls.appendChild(variantWrap);

      const variantBtn = document.createElement('button');
      variantBtn.id = 'canvas-variant-btn';
      variantBtn.textContent = 'VARIANTE A ▾';
      variantWrap.appendChild(variantBtn);

      const variantMenu = document.createElement('div');
      variantMenu.id = 'canvas-variant-menu';
      variantMenu.style.position = 'fixed';
      variantMenu.style.zIndex   = '999999';
      document.body.appendChild(variantMenu);

      variantBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = variantMenu.style.display === 'flex';
        if (!isOpen) {
          const r = variantBtn.getBoundingClientRect();
          variantMenu.style.top      = r.bottom + 'px';
          variantMenu.style.left     = r.left + 'px';
          variantMenu.style.minWidth      = r.width + 'px';
          variantMenu.style.width         = 'fit-content';
          variantMenu.style.flexDirection = 'column';
        }
        variantMenu.style.display = isOpen ? 'none' : 'flex';
      });
      document.addEventListener('click', () => { variantMenu.style.display = 'none'; });
    }

    // Botón OK — siempre visible, independiente del auto-layout
    let okBtn = document.getElementById('canvas-ok-btn');
    if (!okBtn) {
      okBtn = document.createElement('button');
      okBtn.id = 'canvas-ok-btn';
      okBtn.textContent = 'OK';
      _area.appendChild(okBtn);
      okBtn.addEventListener('click', () => {
        if (State.activeFormat) Formats.toggleOk(State.activeFormat);
        _updateOkBtn();
      });
    }

    _updateOkBtn();

    // Botón GENERAR MOCKUP — visible solo en formatos con capa mockup real
    let mockupBtn = document.getElementById('canvas-mockup-btn');
    if (!mockupBtn) {
      mockupBtn = document.createElement('button');
      mockupBtn.id = 'canvas-mockup-btn';
      mockupBtn.textContent = 'GENERAR MOCKUP';
      _area.appendChild(mockupBtn);
      mockupBtn.addEventListener('click', () => {
        if (typeof Export !== 'undefined' && State.activeFormat) {
          Export.generateMockup(State.activeFormat);
        }
      });
    }
    _updateMockupBtn();

    // Botón ATRIBUTOS A <pareja> — solo en los 4 maestros de texto
    let attrsBtn = document.getElementById('canvas-attrs-btn');
    if (!attrsBtn) {
      attrsBtn = document.createElement('button');
      attrsBtn.id = 'canvas-attrs-btn';
      _area.appendChild(attrsBtn);
      attrsBtn.addEventListener('click', () => {
        if (!State.activeFormat || typeof Formats === 'undefined') return;
        const pair = Formats.getTextPair(State.activeFormat);
        if (!pair) return;
        const lbl = Formats.displayLabel ? Formats.displayLabel(pair) : pair;
        _confirmDialog(
          'Copiar atributos',
          `¿Copiar los atributos de este formato a "${lbl}"? Se reemplazará su contenido actual (se puede deshacer con Ctrl+Z).`,
          'Copiar',
          () => Formats.propagateTextAttributes(State.activeFormat)
        );
      });
    }
    _updateAttrsBtn();

    const label = document.getElementById('lienzo-label');
    if (label) label.textContent = `${size.w} × ${size.h} px`;
  }

  function _updateAttrsBtn() {
    const btn = document.getElementById('canvas-attrs-btn');
    if (!btn) return;
    const fmt  = State.activeFormat;
    const pair = (fmt && typeof Formats !== 'undefined' && Formats.getTextPair) ? Formats.getTextPair(fmt) : null;
    if (!pair) { btn.style.display = 'none'; return; }
    const lbl = (typeof Formats !== 'undefined' && Formats.displayLabel) ? Formats.displayLabel(pair) : pair;
    btn.textContent = 'ATRIBUTOS A ' + lbl;
    btn.style.display = 'inline-flex';
  }

  // Modal de confirmación con el estilo de la app (sustituye al confirm() nativo)
  function _confirmDialog(title, message, confirmLabel, onConfirm) {
    document.querySelectorAll('.app-confirm-overlay').forEach(o => o.remove());
    const overlay = document.createElement('div');
    overlay.className = 'app-confirm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99000;display:flex;align-items:center;justify-content:center;';

    let onKey;
    const close = () => { overlay.remove(); if (onKey) document.removeEventListener('keydown', onKey); };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#161616;border:1px solid #2e2e2e;border-radius:4px;width:400px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.7);';

    const header = document.createElement('div');
    header.style.cssText = 'padding:14px 16px;background:#111;border-bottom:1px solid #2e2e2e;font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--col-yellow);';
    header.textContent = title;

    const body = document.createElement('div');
    body.style.cssText = 'padding:18px 16px;display:flex;flex-direction:column;gap:18px;';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-family:var(--font);font-size:12px;color:#aaa;margin:0;line-height:1.6;';
    desc.textContent = message;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.cssText = 'height:30px;padding:0 16px;border-radius:2px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;background:transparent;border:1px solid #444;color:#999;';
    btnCancel.addEventListener('mouseenter', () => { btnCancel.style.color = '#ddd'; btnCancel.style.borderColor = '#666'; });
    btnCancel.addEventListener('mouseleave', () => { btnCancel.style.color = '#999'; btnCancel.style.borderColor = '#444'; });
    btnCancel.addEventListener('click', close);

    const btnOk = document.createElement('button');
    btnOk.textContent = confirmLabel || 'Aceptar';
    btnOk.style.cssText = 'height:30px;padding:0 18px;border-radius:2px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;background:var(--col-yellow);border:1px solid var(--col-yellow);color:#111;';
    btnOk.addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnOk);
    body.appendChild(desc);
    body.appendChild(btnRow);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    onKey = e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter') { close(); if (onConfirm) onConfirm(); }
    };
    document.addEventListener('keydown', onKey);
  }

  function _updateMockupBtn() {
    const btn = document.getElementById('canvas-mockup-btn');
    if (!btn) return;
    const fmt = State.activeFormat;
    const show = fmt && typeof Export !== 'undefined' && Export.isMockupFormat?.(fmt);
    if (!show) { btn.style.display = 'none'; return; }
    btn.style.display = 'inline-flex';

    // Alinear horizontalmente con "GUARDAR PROYECTO" del topbar (mismo ancho y X exacto)
    const guardarBtn = document.getElementById('btn-guardar');
    if (guardarBtn && _area) {
      const gRect = guardarBtn.getBoundingClientRect();
      const aRect = _area.getBoundingClientRect();
      btn.style.right = 'auto';
      btn.style.left  = Math.round(gRect.left - aRect.left) + 'px';
      btn.style.width = Math.round(gRect.width) + 'px';
    }
  }

  function _updateAutoButtons() {
    const fmt       = State.activeFormat;
    const hasConfig = fmt && typeof AutoLayout !== 'undefined' && AutoLayout.hasConfig(fmt);
    const hasRoles  = State.layerRoles && Object.values(State.layerRoles).some(r => r);
    const show      = hasConfig && hasRoles;

    const controls  = document.getElementById('canvas-auto-controls');
    const autoBtn   = document.getElementById('canvas-auto-btn');
    const fitBtn    = document.getElementById('canvas-fit-btn');
    const mirrorBtn = document.getElementById('canvas-mirror-btn');
    const modnBtn   = document.getElementById('canvas-modn-btn');
    const variantWrapEl = document.getElementById('canvas-variant-wrap');
    const isModN = fmt === 'MOD N';

    if (controls) {
      controls.classList.toggle('visible', show);
      if (show) {
        requestAnimationFrame(() => {
          const topbarRight = document.getElementById('topbar-right');
          const okBtn = document.getElementById('canvas-ok-btn');
          if (topbarRight && okBtn) {
            const okW    = okBtn.offsetWidth || 127;
            const totalW = topbarRight.offsetWidth;
            controls.style.width = (totalW - okW - 8) + 'px';
            controls.style.right = (okW + 14) + 'px';
          }
        });
      }
    }
    // En MOD N: ocultar AUTO/CROP/variantes y mostrar solo "EDITAR COLECCIÓN"
    if (autoBtn)        autoBtn.style.display        = isModN ? 'none' : '';
    if (fitBtn)         fitBtn.style.display         = isModN ? 'none' : '';
    if (variantWrapEl)  variantWrapEl.style.display  = isModN ? 'none' : '';
    if (modnBtn)        modnBtn.style.display        = isModN ? '' : 'none';
    if (!show) return;
    if (isModN) return;

    // PERFIL: AUTO y CROP no tienen función — deshabilitar
    const isPerfil = fmt === 'PERFIL';
    if (autoBtn) {
      autoBtn.disabled = isPerfil;
      autoBtn.style.opacity = isPerfil ? '0.25' : '';
      autoBtn.style.cursor  = isPerfil ? 'default' : '';
    }

    if (fitBtn && typeof AutoLayout !== 'undefined') {
      const mode = AutoLayout.getScaleMode(fmt);
      fitBtn.textContent = mode === 'crop' ? 'CROP' : 'FIT';
      fitBtn.classList.toggle('done', mode !== 'crop');
      fitBtn.disabled = isPerfil;
      fitBtn.style.opacity = isPerfil ? '0.25' : '';
      fitBtn.style.cursor  = isPerfil ? 'default' : '';
    }


    // Dropdown de variantes
    const variantWrap = document.getElementById('canvas-variant-wrap');
    const variantBtn  = document.getElementById('canvas-variant-btn');
    const variantMenu = document.getElementById('canvas-variant-menu');
    if (variantWrap && variantBtn && variantMenu && typeof AutoLayout !== 'undefined') {
      const variants = AutoLayout.getVariants(fmt);
      variantWrap.style.display = variants ? 'block' : 'none';
      if (variants) {
        const keys = Object.keys(variants);
        const isSingle = keys.length <= 1;
        const currentVariant = AutoLayout.getVariant(fmt);

        // Botón deshabilitado si solo hay una variante
        variantBtn.textContent = isSingle ? 'VARIANTE' : `VARIANTE ${currentVariant} ▾`;
        variantBtn.style.opacity = isSingle ? '0.25' : '1';
        variantBtn.style.cursor  = isSingle ? 'default' : 'pointer';
        variantBtn.style.pointerEvents = isSingle ? 'none' : 'auto';

        variantMenu.innerHTML = '';
        if (!isSingle) {
          Object.entries(variants).forEach(([key, v]) => {
            const opt = document.createElement('div');
            const isActive = key === currentVariant;
            opt.style.cssText = `padding:7px 12px;font-size:10px;font-family:var(--font);letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;white-space:nowrap;color:${isActive ? 'var(--col-yellow)' : '#ccc'};background:${isActive ? 'rgba(240,165,0,0.08)' : 'transparent'};`;
            opt.textContent = `${key} — ${v.label}`;
            opt.addEventListener('mouseenter', () => { opt.style.background = 'rgba(255,255,255,0.07)'; });
            opt.addEventListener('mouseleave', () => { opt.style.background = isActive ? 'rgba(240,165,0,0.08)' : 'transparent'; });
            opt.addEventListener('click', e => {
              e.stopPropagation();
              variantMenu.style.display = 'none';
              AutoLayout.setVariant(fmt, key);
              _updateAutoButtons();
            });
            variantMenu.appendChild(opt);
          });
        }
      }
    }
  }

  function _updateOkBtn() {
    const okBtn = document.getElementById('canvas-ok-btn');
    if (!okBtn) return;
    const isDone = State.activeFormat && State.formatOk?.[State.activeFormat];
    okBtn.classList.toggle('done', !!isDone);
    okBtn.style.display = State.activeFormat ? 'block' : 'none';
    _updateAutoButtons();

    const ccBtn = document.getElementById('canvas-cc-btn');
    if (!ccBtn) return;
    if (State.activeFormat === 'CARÁTULA H') {
      ccBtn.textContent    = 'Atributos a CC H';
      ccBtn.style.display  = 'block';
    } else if (State.activeFormat === 'CARÁTULA V') {
      ccBtn.textContent    = 'Atributos a CC V';
      ccBtn.style.display  = 'block';
    } else if (State.activeFormat === 'CARTEL COM. H') {
      ccBtn.textContent    = 'Atributos a Carátula H';
      ccBtn.style.display  = 'block';
    } else if (State.activeFormat === 'CARTEL COM. V') {
      ccBtn.textContent    = 'Atributos a Carátula V';
      ccBtn.style.display  = 'block';
    } else {
      ccBtn.style.display  = 'none';
      return;
    }
    // Alinear CC justo a la izquierda del OK con 8px de separación
    requestAnimationFrame(() => {
      const okEl = document.getElementById('canvas-ok-btn');
      if (okEl) {
        const okRight = parseInt(okEl.style.right || '10');
        const okW     = okEl.offsetWidth;
        ccBtn.style.right = (okRight + okW + 8) + 'px';
      }
    });
  }

  function _copyCaratulaCC() {
    const srcFormat = State.activeFormat;
    // Mapa bidireccional Carátula ⇄ CC, misma orientación (H↔H, V↔V)
    const PAIRS = {
      'CARÁTULA H':    'CARTEL COM. H',
      'CARÁTULA V':    'CARTEL COM. V',
      'CARTEL COM. H': 'CARÁTULA H',
      'CARTEL COM. V': 'CARÁTULA V',
    };
    const dstFormat = PAIRS[srcFormat];
    if (!dstFormat) return;

    const srcSize = State.formatSizes[srcFormat];
    const dstSize = State.formatSizes[dstFormat];
    if (!srcSize || !dstSize) return;

    const scaleX = dstSize.w / srcSize.w;
    const scaleY = dstSize.h / srcSize.h;

    if (typeof History !== 'undefined') History.push();

    // Copiar la variante de texto (lápiz H/V/MUX4/MOVIL/TITLE_H/TITLE_V) al destino
    if (State.formatTextVariant) {
      if (State.formatTextVariant[srcFormat] !== undefined) {
        State.formatTextVariant[dstFormat] = State.formatTextVariant[srcFormat];
      } else {
        // Si el origen estaba en su default (sin override), borrar el override del destino
        delete State.formatTextVariant[dstFormat];
      }
    }

    if (!State.formatParams[dstFormat]) State.formatParams[dstFormat] = {};

    State.layers.forEach(layer => {
      // Excluir capas exclusivas de OTROS formatos (no se ven en CARÁTULA → no se copian).
      // Sin esto, se mutaba textParams.size globalmente de capas como TÍTULO de MOD N.
      if (layer.exclusiveFormat && layer.exclusiveFormat !== srcFormat) return;
      // Excluir también capas sistémicas que no aplican a CARÁTULA/CARTEL COM.
      if (layer.isMolduraFanart || layer.isMascaraBlur || layer.isMarcaIplus || layer.isMarcaSony) return;

      const src = State.formatParams?.[srcFormat]?.[layer.id] ?? {
        x: 0, y: 0, scaleX: 100, scaleY: 100, rotation: 0, visible: true
      };

      State.formatParams[dstFormat][layer.id] = {
        x:        Math.round((src.x || 0) * scaleX),
        y:        Math.round((src.y || 0) * scaleY),
        scaleX:   (src.scaleX ?? 100) * scaleX,
        scaleY:   (src.scaleY ?? 100) * scaleY,
        rotation: src.rotation ?? 0,
        visible:  src.visible !== undefined ? src.visible : true,
      };

      // Escalar tamaño de texto si tiene runs con size propio
      if (layer.type === 'text' && layer.textParams?.runs) {
        const avgScale = (scaleX + scaleY) / 2;
        // size global
        if (layer.textParams.size) {
          if (!State.formatParams[dstFormat][layer.id]._textSizeOverride) {
            layer.textParams.size = Math.round(layer.textParams.size * avgScale);
          }
        }
      }
    });

    if (typeof Layers !== 'undefined') Layers.render();
    render();

    // Feedback visual
    const ccBtn = document.getElementById('canvas-cc-btn');
    if (ccBtn) {
      const orig = ccBtn.textContent;
      ccBtn.textContent = '✓ Copiado';
      setTimeout(() => { ccBtn.textContent = orig; }, 1500);
    }
  }

  // ── RENDER ────────────────────────────────────────────────

  function render() {
    if (!_area || !_lienzo) return;

    // Cargar capas sistémicas al entrar en FANART MOD N (idempotente)
    if (State.activeFormat === 'FANART MOD N') {
      _initMolduraFanart();
      _initMascaraBlur();
    }

    _updateLienzo();

    if (!State.activeFormat) {
      _lienzo.querySelectorAll('.canvas-layer').forEach(el => el.remove());
      _hideHandles();
      return;
    }

    const current = new Set(State.layers.map(l => l.id));
    _lienzo.querySelectorAll('.canvas-layer').forEach(el => {
      if (!current.has(el.dataset.id)) el.remove();
    });

    State.layers.forEach((layer, index) => {
      let el = _lienzo.querySelector(`.canvas-layer[data-id="${layer.id}"]`);
      if (!el) {
        if (layer.type === 'text') {
          el = document.createElement('div');
          el.className = 'canvas-layer canvas-text-layer';
          el.style.textAlign = layer.textParams?.align || 'left';
        } else if (layer.type === 'solid') {
          el = document.createElement('div');
          el.className = 'canvas-layer canvas-solid-layer';
        } else if (layer.type === 'gradient') {
          el = document.createElement('div');
          el.className = 'canvas-layer canvas-gradient-layer';
        } else if (layer.isMascaraBlur) {
          // Capa especial: backdrop-filter blur con máscara alfa.
          // Sin <img> hijo: el PNG actúa como mask-image.
          el = document.createElement('div');
          el.className = 'canvas-layer canvas-mascara-blur';
          el.style.cssText = 'position:absolute;pointer-events:none;';
        } else {
          el = document.createElement('div');
          el.className = 'canvas-layer';
          el.style.cssText = 'position:absolute;overflow:hidden;isolation:isolate;';
          const img = document.createElement('img');
          if (layer.src && layer.src !== 'undefined') img.src = layer.src;
          img.alt = layer.name;
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;display:block;';
          el.appendChild(img);
        }
        el.dataset.id = layer.id;
        _bindLayerInteraction(el);
        (_contentClip || _lienzo).appendChild(el);
      } else {
        // Asegurar que el elemento está en el contenedor correcto
        const target = _contentClip || _lienzo;
        if (el.parentElement !== target) target.appendChild(el);
      }

      // Actualizar src de imagen si ha cambiado (siluetear, etc.)
      if (!['text','solid','gradient'].includes(layer.type) && layer.src && layer.src !== 'undefined') {
        const imgEl = el.querySelector('img');
        const activeSrc =
          (layer.isComposicion       && State.activeFormat === 'MUX4 FONDO'      && layer.srcFondo)      ? layer.srcFondo :
          (layer.isComposicionMovil  && State.activeFormat === 'MOVIL MUX FONDO' && layer.srcMovilFondo) ? layer.srcMovilFondo :
          layer.src;
        if (imgEl && imgEl.src !== activeSrc) {
          imgEl.src = activeSrc;
        }
      }

      // Ocultar capas de composición que aún no tienen src generado
      const isAutoLayer = layer.isComposicion || layer.isComposicionMovil || layer.isComposicionAmazon;
      if (isAutoLayer && !layer.src) {
        el.style.display = 'none';
      }

      if (layer.type === 'solid' && layer.solidParams) {
        el.style.background   = layer.solidParams.color;
        el.style.borderRadius = (layer.solidParams.radius ?? 0) * _scale * _contentScaleX + 'px';
        layer.naturalWidth    = layer.solidParams.width;
        layer.naturalHeight   = layer.solidParams.height;
      }

      // ── MÁSCARA BLUR (backdrop-filter + mask-image) ───────
      if (layer.isMascaraBlur && layer.src) {
        // 14px @ 3840 = 7px @ 1920 nativo, escalado por display _scale
        const blurDisplayPx = 7 * _scale * _contentScaleX;
        el.style.backdropFilter        = `blur(${blurDisplayPx}px)`;
        el.style.webkitBackdropFilter  = `blur(${blurDisplayPx}px)`;
        el.style.maskImage             = `url("${layer.src}")`;
        el.style.webkitMaskImage       = `url("${layer.src}")`;
        el.style.maskMode              = 'alpha';
        el.style.webkitMaskMode        = 'alpha';
        el.style.maskSize              = '100% 100%';
        el.style.webkitMaskSize        = '100% 100%';
        el.style.maskRepeat            = 'no-repeat';
        el.style.webkitMaskRepeat      = 'no-repeat';
      }

      if (layer.type === 'gradient' && layer.gradientParams) {
        const gp = layer.gradientParams;
        const c1 = _hexToRgba(gp.color1, gp.alpha1);
        const c2 = _hexToRgba(gp.color2, gp.alpha2);
        if (gp.type === 'radial') {
          const cx = gp.cx ?? 50;
          const cy = gp.cy ?? 50;
          const nw = layer.naturalWidth  || 1920;
          const nh = layer.naturalHeight || 1080;
          const rPx = (gp.radius ?? 100) / 100 * Math.max(nw, nh);
          el.style.background = `radial-gradient(circle ${rPx}px at ${cx}% ${cy}%, ${c1} 0%, ${c2} 100%)`;
        } else {
          const stops = _calcGradientStops(gp, layer.naturalWidth || 1920, layer.naturalHeight || 1080);
          el.style.background = `linear-gradient(${gp.angle}deg, ${c1} ${stops.s1}%, ${c2} ${stops.s2}%)`;
        }
      }

      if (layer.type === 'text' && layer.textParams) {
        const tp = layer.textParams;
        if (typeof TextLayers !== 'undefined') TextLayers.migrate(layer);
        const _isEditing = el.contentEditable === 'true';

        // Estilos globales del contenedor
        el.style.fontSize    = (tp.size * _scale * _contentScaleX) + 'px';
        el.style.textAlign   = tp.align || 'left';
        // En edición usamos `pre` (sin wrap automático, solo \n manual).
        // Fuera de edición `pre-wrap` para que respete maxWidth si el contenido excede.
        el.style.whiteSpace  = _isEditing ? 'pre' : 'pre-wrap';
        el.style.lineHeight  = (tp.leading ?? 120) + '%';
        el.style.letterSpacing = ((tp.tracking ?? 0) * 0.001) + 'em';
        el.style.userSelect  = 'none';
        el.style.padding     = '2px';
        // Fallback para texto bare (sin span) — los spans tienen estilo inline y ganan.
        // Necesario en edit mode: si el navegador inserta texto sin envolver, hereda estos valores.
        const _firstRun = (tp.runs || [])[0];
        el.style.fontFamily  = _firstRun ? `'${_firstRun.family}', Arial, sans-serif` : '';
        el.style.fontWeight  = _firstRun?.weight || '';
        el.style.fontStyle   = _firstRun?.style  || '';
        el.style.color       = _firstRun?.color  || '';
        const _contentW = _contentClip ? parseInt(_contentClip.style.width) : _lienzoW;
        // En edición: max-content y sin maxWidth para que la caja crezca sin wrap automático
        // (el wrap solo ocurre con saltos de línea explícitos del usuario).
        el.style.width    = 'max-content';
        el.style.maxWidth = _isEditing ? 'none' : _contentW + 'px';
        el.style.height   = '';

        if (!_isEditing && typeof TextLayers !== 'undefined') {
          el.innerHTML = TextLayers.getRunsHTML(layer);
        }

        layer.naturalWidth  = el.offsetWidth  / (_scale * _contentScaleX) || 100;
        layer.naturalHeight = el.offsetHeight / (_scale * _contentScaleY) || 50;
      }

      if (layer.isComposicion && State.activeFormat === 'MUX4 FONDO') {
        el.style.zIndex = 9500;
      } else if (layer.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') {
        el.style.zIndex = 9500;
      } else if (layer.isComposicionAmazon && State.activeFormat === 'AMAZON BG') {
        el.style.zIndex = 9500;
      } else if (layer.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') {
        el.style.zIndex = 7999;
      } else {
        el.style.zIndex = State.layers.length - index;
      }

      let isVisible;

      if (_framingMode) {
        // En modo encuadre solo se ve la capa-sujeto que se está encuadrando.
        // El resto (fondo, otras imágenes y capas de sistema) se ocultan.
        isVisible = (layer.id === _framingLayerId);
      } else if (layer.isTitleLayer) {
        // El título "vivo" se ve en:
        // - los maestros de texto + TÍTULO FICHA (siempre)
        // - cualquier formato cuya variante sea TITLE_H/TITLE_V (imagen original cruda)
        // Si hay 2 títulos (H y V), cada formato muestra solo el activo (con fallback).
        const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
        const inHost = ['MUX4 TXT','MOVIL TXT','TEXTO HORIZONTAL','TEXTO VERTICAL','AMAZON LOGO','TÍTULO FICHA'].includes(State.activeFormat)
                    || _v === 'TITLE_H' || _v === 'TITLE_V';
        const isActive = typeof Formats !== 'undefined' && Formats.isActiveTitleForFormat
          ? Formats.isActiveTitleForFormat(layer, State.activeFormat) : true;
        if (inHost && isActive) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        } else {
          isVisible = false;
        }
      } else if (layer.isComposicionTextoH || layer.isComposicionTextoV) {
        // Enrutado por variante: cada formato muestra su composición H o V
        const _v = (typeof Formats !== 'undefined' && Formats.getTextVariant) ? Formats.getTextVariant(State.activeFormat) : null;
        isVisible = (layer.isComposicionTextoH && _v === 'H') || (layer.isComposicionTextoV && _v === 'V');
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isComposicion) {
        // Composición MUX4: en su mockup (MUX4 FONDO) o donde el formato elija la variante 'MUX4'
        isVisible = (State.activeFormat === 'MUX4 FONDO') ||
          (typeof Formats !== 'undefined' && Formats.getTextVariant && Formats.getTextVariant(State.activeFormat) === 'MUX4');
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isComposicionMovil) {
        // Composición MOVIL: en su mockup (MOVIL MUX FONDO) o donde el formato elija 'MOVIL'
        isVisible = (State.activeFormat === 'MOVIL MUX FONDO') ||
          (typeof Formats !== 'undefined' && Formats.getTextVariant && Formats.getTextVariant(State.activeFormat) === 'MOVIL');
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isComposicionAmazon) {
        isVisible = State.activeFormat === 'AMAZON BG';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isMolduraFanart) {
        isVisible = State.activeFormat === 'FANART MOD N';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isMascaraBlur) {
        isVisible = State.activeFormat === 'FANART MOD N';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isMarcaSony) {
        isVisible = State.activeFormat === 'SONY';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isMarcaIplus) {
        isVisible = State.activeFormat === 'IPLUS PUBLI';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.exclusiveFormat) {
        isVisible = layer.exclusiveFormat === State.activeFormat;
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : layer.visible;
        }
      } else {
        const _fanV = (typeof Formats !== 'undefined' && Formats.fanartRoleVisibility) ? Formats.fanartRoleVisibility(layer.id, State.activeFormat) : null;
        if (_fanV !== null) {
          isVisible = _fanV;
          if (isVisible) {
            const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
            isVisible = fmtVisible !== undefined ? fmtVisible : layer.visible;
          }
        } else if (!layer._layoutGenerated && (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'AMAZON LOGO' || State.activeFormat === 'TEXTO HORIZONTAL' || State.activeFormat === 'TEXTO VERTICAL')) {
          isVisible = false;
        } else {
          const fmtVisible = State.activeFormat && State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : layer.visible;
        }
      }

      el.style.display = isVisible ? 'block' : 'none';
      const isLocked = typeof Layers !== 'undefined' && Layers.getLocked(layer.id);
      el.style.pointerEvents = (layer.isMarcaIplus || layer.isMarcaSony || layer.isMolduraFanart || layer.isMascaraBlur || layer.isComposicionMovil || layer.isComposicionAmazon || isLocked) ? 'none' : '';

      if (layer.isComposicion && State.activeFormat === 'MUX4 FONDO') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isComposicionAmazon && State.activeFormat === 'AMAZON BG') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isMarcaSony && State.activeFormat === 'SONY') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isMolduraFanart && State.activeFormat === 'FANART MOD N') {
        el.classList.remove('canvas-layer-active');
      } else if (layer.isMascaraBlur && State.activeFormat === 'FANART MOD N') {
        el.classList.remove('canvas-layer-active');
      } else {
        el.classList.toggle('canvas-layer-active', State.selectedLayerIds.includes(layer.id));
        el.classList.toggle('canvas-layer-key', layer.id === _keyLayerId);
      }

      if (!(layer.type === 'text' && el.contentEditable === 'true')) {
        _applyParams(el, layer);
      }

      // ── MÁSCARA — aplicar DESPUÉS de _applyParams ────
      const fmtSize    = State.formatSizes[State.activeFormat];
      const maskRect   = fmtSize?.maskRect;
      const maskCircle = fmtSize?.maskCircle;
      const maskType   = State.formatMaskEnabled?.[State.activeFormat]?.[layer.id] ?? null;
      const isSIL          = maskRect && !maskCircle;
      const isMaskedSIL    = isSIL && !!maskType;
      const isMaskedCircle = maskCircle && maskType === 'circle';
      const isMaskedRect   = maskCircle && maskType === 'rect';

      const _calcInset = (mRect) => {
        const maskCX = _contentCenterX + mRect.x * _scale * _contentScaleX;
        const maskCY = _contentCenterY + mRect.y * _scale * _contentScaleY;
        const maskHW = mRect.w / 2 * _scale * _contentScaleX;
        const maskHH = mRect.h / 2 * _scale * _contentScaleY;
        const mx1 = maskCX - maskHW; const my1 = maskCY - maskHH;
        const mx2 = maskCX + maskHW; const my2 = maskCY + maskHH;
        const cx = parseFloat(el.style.left); const cy = parseFloat(el.style.top);
        const ew = parseFloat(el.style.width) || 0; const eh = parseFloat(el.style.height) || 0;
        const ex1 = cx - ew/2; const ey1 = cy - eh/2;
        const ex2 = cx + ew/2; const ey2 = cy + eh/2;
        return {
          top:    Math.max(0, my1 - ey1),
          right:  Math.max(0, ex2 - mx2),
          bottom: Math.max(0, ey2 - my2),
          left:   Math.max(0, mx1 - ex1),
        };
      };

      if (isMaskedSIL) {
        const ins = _calcInset(maskRect);
        const rPx = (maskRect.r * _scale).toFixed(2);
        el.style.clipPath = `inset(${ins.top.toFixed(2)}px ${ins.right.toFixed(2)}px ${ins.bottom.toFixed(2)}px ${ins.left.toFixed(2)}px round ${rPx}px ${rPx}px 0px 0px)`;
        if (!isLocked) el.style.pointerEvents = 'auto';

      } else if (isMaskedCircle) {
        const circleCX = _contentCenterX + maskCircle.cx * _scale * _contentScaleX;
        const circleCY = _contentCenterY + maskCircle.cy * _scale * _contentScaleY;
        const circleR  = maskCircle.r * _scale * Math.min(_contentScaleX, _contentScaleY);
        const cx = parseFloat(el.style.left); const cy = parseFloat(el.style.top);
        const ew = parseFloat(el.style.width) || 0; const eh = parseFloat(el.style.height) || 0;
        const relCX = circleCX - (cx - ew/2);
        const relCY = circleCY - (cy - eh/2);
        el.style.clipPath = `circle(${circleR.toFixed(2)}px at ${relCX.toFixed(2)}px ${relCY.toFixed(2)}px)`;
        if (!isLocked) el.style.pointerEvents = 'auto';

      } else if (isMaskedRect) {
        const ins = _calcInset(maskRect);
        el.style.clipPath = `inset(${ins.top.toFixed(2)}px ${ins.right.toFixed(2)}px ${ins.bottom.toFixed(2)}px ${ins.left.toFixed(2)}px)`;
        if (!isLocked) el.style.pointerEvents = 'auto';

      } else {
        el.style.clipPath = '';
        const oldWrapper = el.querySelector('.sil-mask-wrapper');
        if (oldWrapper) {
          while (oldWrapper.firstChild) el.insertBefore(oldWrapper.firstChild, oldWrapper);
          oldWrapper.remove();
        }
      }

      // ── MÁSCARA CUSTOM (Fase 1: rect del sólido/degradado, sin blur) ──
      // Solo se aplica si la capa cliente NO está ya enmascarada por el
      // sistema SIL/PERFIL del formato, y solo si el usuario no ha desactivado
      // la máscara custom en este formato (customMaskDisabled).
      //
      // Usamos `mask-image` con un SVG inline (no `clip-path`) porque cuando
      // la capa cliente tiene `filter: blur(...)` el halo del blur se rendereriza
      // fuera del bounding box. `clip-path` recorta ese halo al borde de la
      // caja; `mask-image` no — respeta el contenido visual real, incluido el
      // blur. Esto es esencial para el caso "imagen + sombra duplicada".
      const _noSystemMask = !isMaskedSIL && !isMaskedCircle && !isMaskedRect;
      const _customMaskApplied = (() => {
        if (!_noSystemMask || !layer.maskLayerId || !State.activeFormat) return false;
        const _custDisabled = !!State.formatParams?.[State.activeFormat]?.[layer.id]?.customMaskDisabled;
        if (_custDisabled) return false;
        const _mask = State.layers.find(l => l.id === layer.maskLayerId);
        if (!_mask || !_mask.isMask) return false;

        const _mp = _getParams(_mask.id);
        const _fmtSizeMask = State.formatSizes[State.activeFormat];
        const _mnw = _mask.naturalWidth  || _fmtSizeMask?.w || 1920;
        const _mnh = _mask.naturalHeight || _fmtSizeMask?.h || 1080;
        const _msx = _mp.scaleX ?? 100;
        const _msy = _mp.scaleY ?? 100;
        const _mcx = _contentCenterX + (_mp.x ?? 0) * _scale * _contentScaleX;
        const _mcy = _contentCenterY + (_mp.y ?? 0) * _scale * _contentScaleY;
        const _mw  = _mnw * _msx / 100 * _scale * _contentScaleX;
        const _mh  = _mnh * _msy / 100 * _scale * _contentScaleY;
        const _mx1 = _mcx - _mw/2, _my1 = _mcy - _mh/2;
        const _mx2 = _mcx + _mw/2, _my2 = _mcy + _mh/2;
        const _ex  = parseFloat(el.style.left)   || 0;
        const _ey  = parseFloat(el.style.top)    || 0;
        const _ew  = parseFloat(el.style.width)  || 0;
        const _eh  = parseFloat(el.style.height) || 0;
        if (_ew <= 0 || _eh <= 0) return false;
        const _ex1 = _ex - _ew/2, _ey1 = _ey - _eh/2;
        const _ex2 = _ex1 + _ew,  _ey2 = _ey1 + _eh;

        // Si la máscara abarca completamente el bounding box del elemento
        // Y NO tiene blur, NO aplicamos mask: la capa se renderea entera y su
        // halo de blur fluye libre. Si la máscara tiene blur, siempre aplicamos
        // mask para que el borde difuso pueda asomar al bounding box.
        // Blur de la máscara POR FORMATO (maskBlur), con fallback al blur global
        // de la capa para máscaras antiguas sin override por-formato.
        const _maskBlurRaw = (State.formatParams?.[State.activeFormat]?.[_mask.id]?.maskBlur)
                             ?? (_mask.params?.blur ?? 0);
        if (_maskBlurRaw === 0 && _mx1 <= _ex1 && _my1 <= _ey1 && _mx2 >= _ex2 && _my2 >= _ey2) {
          return false;
        }

        // Caso parcial: la máscara recorta en al menos un lado.
        // Padding generoso (8 * blur del cliente) para que el halo del blur del
        // cliente sobreviva donde la máscara está abierta. Si la máscara TAMBIÉN
        // tiene blur (efecto de borde difuminado), añadimos margen extra para
        // que el halo del blur del rect no se recorte al viewBox del SVG.
        const _gBlur = (layer.params?.blur ?? 0) * _scale;
        const _maskBlur = _maskBlurRaw * _scale;
        const _pad = Math.max(0, Math.ceil(Math.max(_gBlur * 8, _maskBlur * 4)));
        const _Wm = _ew + 2*_pad;
        const _Hm = _eh + 2*_pad;
        // Posición del rect de la máscara en coords del SVG (origen = esquina
        // sup-izq del SVG, que está en _ex1 - _pad, _ey1 - _pad).
        const _rectX = (_mx1 - (_ex1 - _pad));
        const _rectY = (_my1 - (_ey1 - _pad));
        const _rectW = _mw;
        const _rectH = _mh;
        // SVG mask. Si la capa-máscara tiene blur (params.blur > 0), aplicamos
        // feGaussianBlur al rect para que sus bordes degraden suavemente —
        // resultado: recorte de máscara con halo en lugar de borde a sangre.
        let _svg;
        if (_maskBlur > 0) {
          _svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${_Wm.toFixed(2)} ${_Hm.toFixed(2)}' preserveAspectRatio='none'><defs><filter id='mb' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='${_maskBlur.toFixed(2)}'/></filter></defs><rect x='${_rectX.toFixed(3)}' y='${_rectY.toFixed(3)}' width='${Math.max(0,_rectW).toFixed(3)}' height='${Math.max(0,_rectH).toFixed(3)}' fill='white' filter='url(#mb)'/></svg>`;
        } else {
          _svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${_Wm.toFixed(2)} ${_Hm.toFixed(2)}' preserveAspectRatio='none'><rect x='${_rectX.toFixed(3)}' y='${_rectY.toFixed(3)}' width='${Math.max(0,_rectW).toFixed(3)}' height='${Math.max(0,_rectH).toFixed(3)}' fill='white'/></svg>`;
        }
        const _dataURL = `url("data:image/svg+xml;utf8,${encodeURIComponent(_svg)}")`;
        el.style.maskImage           = _dataURL;
        el.style.webkitMaskImage     = _dataURL;
        el.style.maskSize            = `${_Wm.toFixed(2)}px ${_Hm.toFixed(2)}px`;
        el.style.webkitMaskSize      = `${_Wm.toFixed(2)}px ${_Hm.toFixed(2)}px`;
        el.style.maskRepeat          = 'no-repeat';
        el.style.webkitMaskRepeat    = 'no-repeat';
        el.style.maskPosition        = `${-_pad}px ${-_pad}px`;
        el.style.webkitMaskPosition  = `${-_pad}px ${-_pad}px`;
        // Sin esto, el navegador recorta la máscara al bounding box del
        // elemento (mask-clip por defecto = border-box), invalidando el
        // padding que añadimos para el halo del blur. `no-clip` permite que
        // la máscara aplique también al halo que se proyecta fuera del box.
        el.style.maskClip            = 'no-clip';
        el.style.webkitMaskClip      = 'no-clip';
        // Permitir que el halo del blur se renderee fuera del bounding box.
        // Sin esto el `overflow: hidden` del propio el lo recortaría antes
        // siquiera de aplicarse la máscara.
        el.style.overflow            = 'visible';
        return true;
      })();
      if (!_customMaskApplied && !layer.isMascaraBlur) {
        // Limpiar mask-image residual (no tocar isMascaraBlur que usa mask-image propio)
        if (el.style.maskImage || el.style.webkitMaskImage) {
          el.style.maskImage = '';
          el.style.webkitMaskImage = '';
          el.style.maskClip = '';
          el.style.webkitMaskClip = '';
        }
        // Devolver overflow al default del canvas-layer si lo habíamos cambiado
        // por el sistema de máscara custom. Las capas-text/solid/gradient no
        // tenían overflow:hidden originalmente; las imágenes sí.
        const _isImage = !['text','solid','gradient'].includes(layer.type);
        if (el.style.overflow === 'visible' && _isImage) {
          el.style.overflow = 'hidden';
        }
      }

      // ── APARIENCIA DE LA PROPIA CAPA-MÁSCARA ─────────────────
      // Si la capa es máscara y tiene clientes y el usuario la ha hecho visible
      // (típicamente para reposicionarla), se pinta como fantasma (semi-transparente
      // + outline) en el editor. En el render final (export) no se pinta nunca:
      // eso lo gestiona la Fase 3.
      if (layer.isMask) {
        const _hasClients = State.layers.some(l => l.maskLayerId === layer.id);
        if (_hasClients && isVisible) {
          const _baseOp = parseFloat(el.style.opacity);
          el.style.opacity = ((Number.isFinite(_baseOp) ? _baseOp : 1) * 0.35).toFixed(3);
          el.style.outline = '1px dashed var(--col-yellow)';
          el.style.outlineOffset = '0';
        } else {
          el.style.outline = '';
          el.style.outlineOffset = '';
        }
      } else {
        // Limpiar restos si la capa dejó de ser máscara
        if (el.style.outline) { el.style.outline = ''; el.style.outlineOffset = ''; }
      }
    });

    if (typeof SystemLayers !== 'undefined') {
      SystemLayers.render(_lienzo, _scale, _lienzoW, _lienzoH);
    }

    _renderPastilla();
    _renderPastillaFreemium();

    const selLayer = State.layers.find(l => l.id === State.selectedLayerId);
    if (State.selectedLayerId && State.activeFormat &&
        !(selLayer?.isComposicion && State.activeFormat === 'MUX4 FONDO') &&
        !(selLayer?.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') &&
        !(selLayer?.isComposicionAmazon && State.activeFormat === 'AMAZON BG') &&
        !(selLayer?.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') &&
        !(selLayer?.isMarcaSony && State.activeFormat === 'SONY')) {
      _updateHandles();
    } else {
      _hideHandles();
    }

    if (State.activeFormat === 'MUX4 TXT' && typeof Composicion !== 'undefined') {
      Composicion.generate();
    }
    if (State.activeFormat === 'MOVIL TXT' && typeof ComposicionMovil !== 'undefined') {
      ComposicionMovil.generate();
    }
    if (State.activeFormat === 'AMAZON LOGO' && typeof ComposicionAmazon !== 'undefined') {
      ComposicionAmazon.generate();
    }
    // Composiciones H/V: regenerar en vivo mientras se edita su formato maestro
    if (State.activeFormat === 'TEXTO HORIZONTAL' && typeof ComposicionTexto !== 'undefined') {
      ComposicionTexto.generate('TEXTO HORIZONTAL', 'COMPOSICIÓN TEXTO HORIZONTAL', 'isComposicionTextoH')
        .then(() => { const c = State.layers.find(l => l.isComposicionTextoH); if (c && typeof AutoLayout !== 'undefined') AutoLayout.repositionTextComp(c, 'H'); });
    }
    if (State.activeFormat === 'TEXTO VERTICAL' && typeof ComposicionTexto !== 'undefined') {
      ComposicionTexto.generate('TEXTO VERTICAL', 'COMPOSICIÓN TEXTO VERTICAL', 'isComposicionTextoV')
        .then(() => { const c = State.layers.find(l => l.isComposicionTextoV); if (c && typeof AutoLayout !== 'undefined') AutoLayout.repositionTextComp(c, 'V'); });
    }
    if (State.activeFormat === 'MOVIL MUX FONDO' && typeof ComposicionMovil !== 'undefined') {
      if (!State.layers.find(l => l.isComposicionMovil)) ComposicionMovil.generate();
    }
    if (State.activeFormat === 'AMAZON BG' && typeof ComposicionAmazon !== 'undefined') {
      if (!State.layers.find(l => l.isComposicionAmazon)) ComposicionAmazon.generate();
    }
    _updateOkBtn();
  }

  function _applyParams(el, layer) {
    if (layer.isComposicion && State.activeFormat === 'MUX4 FONDO') {
      const nw = layer.naturalWidth  || 784;
      const nh = layer.naturalHeight || 318;
      const focoVisible = typeof SystemLayers !== 'undefined'
        ? SystemLayers.getVisible('MUX4 FONDO', 'foco')
        : false;
      const posX = focoVisible ? _COMP_FONDO_FOCO_X : _COMP_FONDO_X;
      const posY = focoVisible ? _COMP_FONDO_FOCO_Y : _COMP_FONDO_Y;
      const left = (posX + nw / 2) * _scale;
      const top  = (posY + nh / 2) * _scale;
      el.style.width     = Math.round(nw * _scale) + 'px';
      el.style.height    = Math.round(nh * _scale) + 'px';
      el.style.left      = left + 'px';
      el.style.top       = top  + 'px';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.opacity   = '1';
      el.style.filter    = '';
      el.style.cursor    = 'default';
      return;
    }

    if (layer.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') {
      const nw   = layer.naturalWidth  || 540;
      const nh   = layer.naturalHeight || 200;
      const left = (_COMP_MOVIL_X + nw / 2) * _scale;
      const top  = (_COMP_MOVIL_Y + nh / 2) * _scale;
      el.style.width     = Math.round(nw * _scale) + 'px';
      el.style.height    = Math.round(nh * _scale) + 'px';
      el.style.left      = left + 'px';
      el.style.top       = top  + 'px';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.opacity   = '1';
      el.style.filter    = '';
      el.style.cursor    = 'default';
      return;
    }

    // ── AMAZON BG: COMPOSICIÓN AMAZON LOGO en posición fija ───
    if (layer.isComposicionAmazon && State.activeFormat === 'AMAZON BG') {
      const nw   = layer.naturalWidth  || 640;
      const nh   = layer.naturalHeight || 480;
      const posX = 104;
      const posY = 65;
      const left = _contentCenterX + (posX - State.formatSizes['AMAZON BG'].w / 2 + nw / 2) * _scale * _contentScaleX;
      const top  = _contentCenterY + (posY - State.formatSizes['AMAZON BG'].h / 2 + nh / 2) * _scale * _contentScaleY;
      el.style.width     = Math.round(nw * _scale * _contentScaleX) + 'px';
      el.style.height    = Math.round(nh * _scale * _contentScaleY) + 'px';
      el.style.left      = left + 'px';
      el.style.top       = top  + 'px';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.opacity   = '1';
      el.style.filter    = '';
      el.style.cursor    = 'default';
      return;
    }

    const p = _getParams(layer.id);
    const g = _getGlobalParams(layer);

    if (layer.type === 'gradient' && (!layer.naturalWidth || !layer.naturalHeight)) {
      const fmtSize = State.activeFormat ? (State.formatSizes[State.activeFormat] || {w:1920,h:1080}) : {w:1920,h:1080};
      layer.naturalWidth  = layer.naturalWidth  || fmtSize.w;
      layer.naturalHeight = layer.naturalHeight || fmtSize.h;
    }

    const nw = layer.naturalWidth  || 200;
    const nh = layer.naturalHeight || 200;

    const x      = _contentCenterX + p.x * _scale * _contentScaleX;
    const y      = _contentCenterY + p.y * _scale * _contentScaleY;
    const scaleX = p.scaleX ?? 100;
    const scaleY = p.scaleY ?? 100;
    const rot    = p.rotation ?? 0;

    const isEditing = layer.type === 'text' && el.contentEditable === 'true';

    if (!isEditing) {
      if (layer.type === 'text') {
        const align = layer.textParams?.align || 'left';
        const tx = align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%';
        el.style.transform = `translate(${tx}, 0%) rotate(${rot}deg) scale(${scaleX / 100}, ${scaleY / 100})`;
      } else {
        const w = Math.round(nw * scaleX / 100 * _scale * _contentScaleX);
        const h = Math.round(nh * scaleY / 100 * _scale * _contentScaleY);
        el.style.width     = w + 'px';
        el.style.height    = h + 'px';
        el.style.cursor = window._gradientPickMode ? 'crosshair' : '';
        el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
      }
    }

    el.style.opacity = g.opacity / 100;
    el.style.mixBlendMode = layer.blendMode || 'normal';
    el.style.left    = x + 'px';
    // Para texto: ancla en borde superior → restar la mitad de la altura para que y=0 sea centrado
    if (layer.type === 'text') {
      const elH = el.offsetHeight || 0;
      el.style.top = (y - elH / 2) + 'px';
    } else {
      el.style.top = y + 'px';
    }

    const filters = [];
    if (g.blur       > 0)   filters.push(`blur(${g.blur * _scale}px)`);
    if (g.noise      > 0)   filters.push(`url(#mp-noise-${Math.round(g.noise)})`);
    if (g.brightness !== 0) filters.push(`brightness(${100 + g.brightness}%)`);
    if (g.contrast   !== 0) filters.push(`contrast(${100 + g.contrast}%)`);
    if (g.saturation !== 0) filters.push(`saturate(${100 + g.saturation}%)`);
    const _filterStr = filters.join(' ');

    // ── HALO BLUR + MÁSCARA — wrapper interno ────────────────
    // Cuando una capa enmascarada tiene blur, el halo del blur necesita
    // espacio físico dentro del `el` (no fuera) para que sobreviva al
    // `overflow:hidden` del lienzo. Para lograrlo creamos un wrapper interno
    // `.canvas-mask-pad`, lo extendemos al tamaño del bounding box visual,
    // y agrandamos el `el` con un padding suficiente para acomodar el halo.
    // El filter se aplica al wrapper (su halo cabe dentro del el extendido).
    // El mask sigue aplicándose al `el` y abarca el área visible deseada.
    const _isImageLayer = !['text','solid','gradient'].includes(layer.type);
    const _needsPad = _isImageLayer && layer.maskLayerId && g.blur > 0;
    let _padEl = el.querySelector(':scope > .canvas-mask-pad');

    if (_needsPad) {
      if (!_padEl) {
        _padEl = document.createElement('div');
        _padEl.className = 'canvas-mask-pad';
        _padEl.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible;pointer-events:none;';
        // Mover img y tint overlay actuales dentro del pad
        const _img = el.querySelector(':scope > img');
        const _tint = el.querySelector(':scope > .layer-tint-overlay');
        if (_img)  _padEl.appendChild(_img);
        if (_tint) _padEl.appendChild(_tint);
        el.appendChild(_padEl);
      }
      // El pad mantiene el tamaño visual de la capa (BB original).
      // El `el` se agranda con _haloPad en cada lado, manteniendo su centro.
      const _bbW = Math.round(nw * scaleX / 100 * _scale * _contentScaleX);
      const _bbH = Math.round(nh * scaleY / 100 * _scale * _contentScaleY);
      const _haloPad = Math.ceil(g.blur * _scale * 4);
      _padEl.style.width  = _bbW + 'px';
      _padEl.style.height = _bbH + 'px';
      el.style.width  = (_bbW + 2*_haloPad) + 'px';
      el.style.height = (_bbH + 2*_haloPad) + 'px';
      _padEl.style.filter = _filterStr;
      el.style.filter = '';
    } else {
      // Desenvolver: si había pad, sacar img+tint y eliminarlo.
      if (_padEl) {
        const _img = _padEl.querySelector(':scope > img');
        const _tint = _padEl.querySelector(':scope > .layer-tint-overlay');
        if (_img)  el.appendChild(_img);
        if (_tint) el.appendChild(_tint);
        _padEl.remove();
      }
      el.style.filter = _filterStr;
    }

    // ── Tint overlay (solo capas de imagen) ───────────────────
    if (!['text','solid','gradient'].includes(layer.type)) {
      let tintEl = el.querySelector('.layer-tint-overlay');
      if (!tintEl) {
        tintEl = document.createElement('div');
        tintEl.className = 'layer-tint-overlay';
        tintEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        el.appendChild(tintEl);
      }
      tintEl.style.backgroundColor = g.tintAmount > 0
        ? _hexToRgba(g.tintColor || '#000000', g.tintAmount)
        : 'transparent';
      if (layer.src) {
        const maskSrc = layer.src.startsWith('data:') || layer.src.startsWith('http') || layer.src.startsWith('blob:')
          ? layer.src
          : new URL(layer.src, location.href).href;
        tintEl.style.webkitMaskImage = `url(${maskSrc})`;
        tintEl.style.maskImage       = `url(${maskSrc})`;
        tintEl.style.webkitMaskSize  = '100% 100%';
        tintEl.style.maskSize        = '100% 100%';
      }
    } else {
      el.querySelector('.layer-tint-overlay')?.remove();
    }
  }

  function _getParams(layerId) {
    const fid = State.activeFormat;
    if (!fid || !layerId) return _defaultParams();
    return State.formatParams?.[fid]?.[layerId] ?? _defaultParams();
  }

  function _defaultParams() {
    return { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
  }

  function _calcGradientStops(gp, nw, nh) {
    if (gp.x1 == null || gp.x2 == null) return { s1: 0, s2: 100 };
    // Guard contra dimensiones degeneradas — sin esto un nw=0 produce aspect=Infinity
    // y propaga NaN a los stops, dejando la capa pintada en negro.
    if (!Number.isFinite(nw) || nw <= 0 || !Number.isFinite(nh) || nh <= 0) {
      return { s1: 0, s2: 100 };
    }

    const angleRad = gp.angle * Math.PI / 180;
    const sinA = Math.sin(angleRad);
    const cosA = Math.cos(angleRad);
    const aspect = nh / nw;

    const L = Math.abs(sinA) * 100 + Math.abs(cosA) * 100 * aspect;
    if (!L) return { s1: 0, s2: 100 };

    const p1x = gp.x1 - 50;
    const p1y = (gp.y1 - 50) * aspect;
    const p2x = gp.x2 - 50;
    const p2y = (gp.y2 - 50) * aspect;

    // CSS gradient angles miden Y invertido respecto a la convención
    // matemática (0deg = hacia arriba en pantalla). Por eso usamos -cosA al
    // proyectar Y: si no, los stops salen invertidos en degradados con
    // componente vertical (ej. 180deg producía s1>s2 → CSS lo aplana a sólido).
    const proj1 = p1x * sinA - p1y * cosA;
    const proj2 = p2x * sinA - p2y * cosA;

    const s1 = Math.round(50 + proj1 / (L / 2) * 50);
    const s2 = Math.round(50 + proj2 / (L / 2) * 50);

    // Si los stops son iguales o invertidos, usar 0-100
    if (Math.abs(s2 - s1) < 5) return { s1: 0, s2: 100 };

    return { s1, s2 };
  }

  function _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${(alpha/100).toFixed(2)})`;
  }

  function _getGlobalParams(layer) {
    const defaults = { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' };
    return { ...defaults, ...(layer.params || {}) };
  }

  // ── MANEJADORES ───────────────────────────────────────────

  const HANDLE_POSITIONS = ['nw','n','ne','e','se','s','sw','w'];

  function _ensureHandles() {
    if (_handles) return;
    _handles = document.createElement('div');
    _handles.id = 'canvas-handles';
    _handles.style.cssText = 'position:absolute;pointer-events:none;z-index:9000;';

    HANDLE_POSITIONS.forEach(pos => {
      const h = document.createElement('div');
      h.className = 'canvas-handle';
      h.dataset.handle = pos;
      h.style.cssText = `
        position:absolute;width:8px;height:8px;
        background:#fff;border:1px solid #333;border-radius:1px;
        transform:translate(-50%,-50%);pointer-events:all;
        z-index:9001;cursor:${_getCursor(pos)};
      `;
      _bindHandleDrag(h, pos);
      _handles.appendChild(h);
    });
    _lienzo.appendChild(_handles);
  }

  function _getCursor(pos) {
    return { nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',
             se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize' }[pos];
  }

  function _updateHandles() {
    _ensureHandles();
    const el = _lienzo.querySelector(`.canvas-layer[data-id="${State.selectedLayerId}"]`);
    if (!el || el.style.display === 'none') { _hideHandles(); return; }

    const lienzoRect = _lienzo.getBoundingClientRect();
    const elRect     = el.getBoundingClientRect();

    const left   = elRect.left   - lienzoRect.left;
    const top    = elRect.top    - lienzoRect.top;
    const width  = elRect.width;
    const height = elRect.height;

    _handles.style.left      = left   + 'px';
    _handles.style.top       = top    + 'px';
    _handles.style.width     = width  + 'px';
    _handles.style.height    = height + 'px';
    const _isKey = State.selectedLayerId === _keyLayerId;
    _handles.style.boxShadow = `0 0 0 0.8px ${_isKey ? '#ff4444' : '#f0c020'}`;
    _handles.style.display   = 'block';

    const pts = {
      nw:[0,0],n:[50,0],ne:[100,0],e:[100,50],
      se:[100,100],s:[50,100],sw:[0,100],w:[0,50]
    };
    HANDLE_POSITIONS.forEach(pos => {
      const h = _handles.querySelector(`[data-handle="${pos}"]`);
      const [px, py] = pts[pos];
      h.style.left = px + '%';
      h.style.top  = py + '%';
    });

    // Marcos adicionales para el resto de capas seleccionadas (sin handles)
    _lienzo.querySelectorAll('.canvas-layer-extra-handle').forEach(e => e.remove());
    State.selectedLayerIds.forEach(id => {
      if (id === State.selectedLayerId) return;
      const extraEl = _lienzo.querySelector(`.canvas-layer[data-id="${id}"]`);
      if (!extraEl || extraEl.style.display === 'none') return;
      const r = extraEl.getBoundingClientRect();
      const frame = document.createElement('div');
      frame.className = 'canvas-layer-extra-handle';
      const _frameIsKey = id === _keyLayerId;
      frame.style.cssText = `
        position:absolute;
        pointer-events:none;
        box-shadow:0 0 0 0.8px ${_frameIsKey ? '#ff4444' : '#f0c020'};
        left:${r.left - lienzoRect.left}px;
        top:${r.top  - lienzoRect.top}px;
        width:${r.width}px;
        height:${r.height}px;
        z-index:7999;
      `;
      _lienzo.appendChild(frame);
    });
  }

  function _hideHandles() {
    if (_handles) _handles.style.display = 'none';
    _lienzo?.querySelectorAll('.canvas-layer-extra-handle').forEach(e => e.remove());
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

      const elRect     = _lienzo.querySelector(`.canvas-layer[data-id="${layerId}"]`)?.getBoundingClientRect();
      const startPxW   = elRect ? elRect.width  : nw * p.scaleX / 100 * _scale * _contentScaleX;
      const startPxH   = elRect ? elRect.height : nh * p.scaleY / 100 * _scale * _contentScaleY;
      const startRealW = startPxW / (_scale * _contentScaleX);
      const startRealH = startPxH / (_scale * _contentScaleY);

      _resizing     = true;
      if (typeof History !== 'undefined') History.push();
      _resizeHandle = pos;
      _resizeStart  = {
        mouseX:   e.clientX,
        mouseY:   e.clientY,
        realW:    startRealW,
        realH:    startRealH,
        naturalW: nw,
        naturalH: nh,
      };

      document.body.classList.add('layer-dragging');

      const onMove = ev => {
        const dx = (ev.clientX - _resizeStart.mouseX) / (_scale * _contentScaleX);
        const dy = (ev.clientY - _resizeStart.mouseY) / (_scale * _contentScaleY);
        const shift = ev.shiftKey;

        const origW  = _resizeStart.realW;
        const origH  = _resizeStart.realH;
        const aspect = origW / origH;

        let newScaleX = _resizeStart.realW / _resizeStart.naturalW * 100;
        let newScaleY = _resizeStart.realH / _resizeStart.naturalH * 100;

        const isE = pos.includes('e'), isW = pos.includes('w');
        const isS = pos.includes('s'), isN = pos.includes('n');

        const _resLayer = State.layers.find(l => l.id === layerId);

        if (_resLayer?.type === 'solid' && _resLayer.solidParams) {
          let newW = origW;
          let newH = origH;
          if (isE) newW = Math.max(1, origW + dx);
          if (isW) newW = Math.max(1, origW - dx);
          if (isS) newH = Math.max(1, origH + dy);
          if (isN) newH = Math.max(1, origH - dy);
          if (!shift) {
            if (isE || isW) newH = newW / aspect;
            else            newW = newH * aspect;
          }
          _resLayer.solidParams.width  = Math.round(newW);
          _resLayer.solidParams.height = Math.round(newH);
          _resLayer.naturalWidth       = Math.round(newW);
          _resLayer.naturalHeight      = Math.round(newH);
          Formats.setLayerParam(State.activeFormat, layerId, 'scaleX', 100);
          Formats.setLayerParam(State.activeFormat, layerId, 'scaleY', 100);
          if (typeof SolidLayers !== 'undefined') SolidLayers.syncFromLayer(layerId);
        } else {
          if (isE) newScaleX = Math.max(1, (origW + dx) / _resizeStart.naturalW * 100);
          if (isW) newScaleX = Math.max(1, (origW - dx) / _resizeStart.naturalW * 100);
          if (isS) newScaleY = Math.max(1, (origH + dy) / _resizeStart.naturalH * 100);
          if (isN) newScaleY = Math.max(1, (origH - dy) / _resizeStart.naturalH * 100);
          if (!shift) {
            if (isE || isW) newScaleY = newScaleX / aspect * (_resizeStart.naturalW / _resizeStart.naturalH);
            else            newScaleX = newScaleY * aspect * (_resizeStart.naturalH / _resizeStart.naturalW);
          }
          Formats.setLayerParam(State.activeFormat, layerId, 'scaleX', Math.round(newScaleX));
          Formats.setLayerParam(State.activeFormat, layerId, 'scaleY', Math.round(newScaleY));
        }

        render();
        if (typeof UI !== 'undefined') UI.updateSliders();
      };

      const onUp = () => {
        if (!_resizing) return;
        _resizing = false;
        document.body.classList.remove('layer-dragging');
        document.removeEventListener('mousemove',     onMove);
        document.removeEventListener('mouseup',       onUp);
        document.removeEventListener('pointercancel', onUp);
        window.removeEventListener('blur',            onUp);
      };

      document.addEventListener('mousemove',     onMove);
      document.addEventListener('mouseup',       onUp);
      document.addEventListener('pointercancel', onUp);
      window.addEventListener('blur',            onUp);
    });
  }

  // ── DRAG DE CAPAS ─────────────────────────────────────────

  function _bindLayerInteraction(el) {
    el.addEventListener('dblclick', e => {
      e.preventDefault();
      e.stopPropagation();
      const layerId = el.dataset.id;
      const layer   = State.layers.find(l => l.id === layerId);
      if (!layer) return;
      if (layer.isComposicion && State.activeFormat === 'MUX4 FONDO') return;
      if (layer.type === 'solid') {
        if (typeof SolidLayers !== 'undefined') SolidLayers.openPanel(layerId);
        return;
      }
      if (layer.type !== 'text') return;

      // Capturar top visual antes de editar para preservar posición tras blur
      const _topBeforeEdit = parseFloat(el.style.top) || 0;

      _editingText        = true;
      // Edge (especialmente versiones más antiguas) tiene bugs con contentEditable
      // si se setea SOLO la propiedad sin el atributo; ponemos ambos por seguridad.
      el.setAttribute('contenteditable', 'true');
      el.contentEditable  = 'true';
      el.style.cursor     = 'text';
      el.style.whiteSpace = 'pre';
      el.style.width      = 'max-content';
      el.style.maxWidth   = 'none';
      // user-select explícito — Edge a veces hereda 'none' y bloquea la edición
      el.style.userSelect = 'text';
      el.style.webkitUserSelect = 'text';
      // Mantener el mismo ancla que en modo normal
      const _editAlign = layer.textParams?.align || 'left';
      const _editTx    = _editAlign === 'left' ? '0%' : _editAlign === 'right' ? '-100%' : '-50%';
      el.style.transform = `translate(${_editTx}, 0%)`;
      _hideHandles();
      if (typeof TextLayers !== 'undefined') TextLayers.clearPendingOffsets();

      // En Edge, llamar a focus() inmediatamente tras cambiar contentEditable a veces no
      // engancha; esperamos al siguiente frame para que el navegador procese el cambio.
      requestAnimationFrame(() => {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      if (typeof TextLayers !== 'undefined') TextLayers.openPanel(layerId);

      const onBlur = () => {
        _editingText        = false;
        el.setAttribute('contenteditable', 'false');
        el.contentEditable  = 'false';
        el.style.cursor     = 'move';
        el.style.whiteSpace = 'pre-wrap';
        el.style.width      = 'max-content';
        el.style.userSelect = '';
        el.style.webkitUserSelect = '';
        if (layer.textParams && typeof TextLayers !== 'undefined') {
          TextLayers.saveRunsFromDOM(layer, el);
          layer.naturalWidth  = el.offsetWidth  / _scale || 100;
          layer.naturalHeight = el.offsetHeight / _scale || 50;

          // Sin sincronización de texto entre formatos: los 4 maestros (MUX4 TXT,
          // MOVIL TXT, TEXTO HORIZONTAL, TEXTO VERTICAL) son totalmente independientes.
        }
        render();
        // Compensar deriva vertical: si el alto cambió, ajustar p.y para preservar el top visual
        const _topAfterEdit = parseFloat(el.style.top) || 0;
        const _drift = _topAfterEdit - _topBeforeEdit;
        if (Math.abs(_drift) > 0.5 && State.activeFormat) {
          if (!State.formatParams[State.activeFormat]) State.formatParams[State.activeFormat] = {};
          if (!State.formatParams[State.activeFormat][layer.id]) State.formatParams[State.activeFormat][layer.id] = _defaultParams();
          const p = State.formatParams[State.activeFormat][layer.id];
          p.y = (p.y || 0) - _drift / (_scale * _contentScaleY);
          render();
        }
        _updateHandles();
        el.removeEventListener('blur', onBlur);
        el.removeEventListener('keydown', onKeyDown);
      };

      const onKeyDown = ev => {
        if (ev.key === 'Escape') {
          if (typeof TextLayers !== 'undefined') el.innerHTML = TextLayers.getRunsHTML(layer);
          el.contentEditable = 'false';
          el.style.cursor    = 'move';
          el.removeEventListener('blur', onBlur);
          el.removeEventListener('keydown', onKeyDown);
        }
      };

      el.addEventListener('blur',    onBlur);
      el.addEventListener('keydown', onKeyDown);
    });

    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (el.contentEditable === 'true') return;

      const layerId = el.dataset.id;
      const layer   = State.layers.find(l => l.id === layerId);

      if (layer?.isComposicion && State.activeFormat === 'MUX4 FONDO') return;
      if (layer?.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') return;
      if (layer?.isComposicionAmazon && State.activeFormat === 'AMAZON BG') return;
      if (layer?.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') return;
      if (layer?.isMarcaSony && State.activeFormat === 'SONY') return;
      if (layer?.isMolduraFanart && State.activeFormat === 'FANART MOD N') return;
      if (layer?.isMascaraBlur && State.activeFormat === 'FANART MOD N') return;

      e.preventDefault();

      if (e.shiftKey) {
        // Shift+click: añadir/quitar de la selección múltiple
        _keyLayerId = null; // limpiar capa clave al modificar selección
        const idx = State.selectedLayerIds.indexOf(layerId);
        if (idx === -1) {
          State.selectedLayerIds.push(layerId);
          State.selectedLayerId = layerId;
        } else if (State.selectedLayerIds.length > 1) {
          State.selectedLayerIds.splice(idx, 1);
          State.selectedLayerId = State.selectedLayerIds[State.selectedLayerIds.length - 1];
        }
        render();
        if (typeof Layers !== 'undefined') Layers.render();
        if (typeof UI     !== 'undefined') UI.updateSliders();
        return; // no iniciar drag en shift+click
      }

      if (!State.selectedLayerIds.includes(layerId)) {
        State.selectedLayerId  = layerId;
        State.selectedLayerIds = [layerId];
        _keyLayerId = null;
        render();
        if (typeof Layers !== 'undefined') Layers.render();
        if (typeof UI     !== 'undefined') UI.updateSliders();
        if (layer?.type === 'text' &&
            document.getElementById('text-editor-panel')?.classList.contains('visible')) {
          if (typeof TextLayers !== 'undefined') TextLayers.openPanel(layerId);
        }
      } else if (State.selectedLayerIds.length > 1) {
        // Click sin shift en capa ya seleccionada con múltiples → capa clave
        _keyLayerId = layerId;
        State.selectedLayerId = layerId;
        render();
        if (typeof Layers !== 'undefined') Layers.render();
      } else {
        State.selectedLayerId = layerId;
      }

      if (!State.activeFormat) return;
      if (layer && typeof Layers !== 'undefined' && Layers.getLocked(layer.id)) return;

      _dragging   = true;
      if (typeof History !== 'undefined') History.push();
      _dragStartX = e.clientX;
      _dragStartY = e.clientY;

      _dragOrigins = {};
      State.selectedLayerIds.forEach(lid => {
        const p = _getParams(lid);
        _dragOrigins[lid] = { x: p.x, y: p.y };
      });

      const onMove = ev => {
        if (!_dragging) return;
        let dx = (ev.clientX - _dragStartX) / (_scale * _contentScaleX);
        let dy = (ev.clientY - _dragStartY) / (_scale * _contentScaleY);

        // Shift: restringir al eje dominante
        if (ev.shiftKey) {
          if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
          else                               dx = 0;
        }

        // ── SNAP A GUÍAS (si el imán está activo) ─────────────
        // Sustituye dx/dy por el "ajuste" hacia la guía más cercana (si entra en el radio).
        if (Formats.isSnapEnabled && Formats.isSnapEnabled()) {
          const adj = _calcSnapAdjustment(dx, dy);
          dx += adj.dx;
          dy += adj.dy;
        }

        State.selectedLayerIds.forEach(lid => {
          const origin = _dragOrigins[lid];
          if (!origin) return;
          Formats.setLayerParam(State.activeFormat, lid, 'x', Math.round(origin.x + dx));
          Formats.setLayerParam(State.activeFormat, lid, 'y', Math.round(origin.y + dy));
        });
        render();
      };

      const onUp = () => {
        if (!_dragging) return;
        _dragging = false;
        document.removeEventListener('mousemove',     onMove);
        document.removeEventListener('mouseup',       onUp);
        document.removeEventListener('pointercancel', onUp);
        window.removeEventListener('blur',            onUp);
      };

      document.addEventListener('mousemove',     onMove);
      document.addEventListener('mouseup',       onUp);
      // Red de seguridad: si el usuario suelta el ratón fuera de la ventana
      // (sobre la barra de pestañas, otra app, etc.) `mouseup` no llega; sin
      // estos listeners la capa quedaría siguiendo el cursor al volver a entrar.
      document.addEventListener('pointercancel', onUp);
      window.addEventListener('blur',            onUp);
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

      const selLayer = State.layers.find(l => l.id === State.selectedLayerId);
      if (selLayer?.isComposicion && State.activeFormat === 'MUX4 FONDO') return;
      if (selLayer?.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') return;
      if (selLayer?.isComposicionAmazon && State.activeFormat === 'AMAZON BG') return;
      if (selLayer?.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') return;
      if (selLayer?.isMarcaSony && State.activeFormat === 'SONY') return;
      if (selLayer?.isMolduraFanart && State.activeFormat === 'FANART MOD N') return;
      if (selLayer?.isMascaraBlur && State.activeFormat === 'FANART MOD N') return;

      const DIRS = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
      if (!DIRS[e.key]) return;
      e.preventDefault();
      if (typeof History !== 'undefined') History.push();

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

  // ── PASTILLA DE PUBLICIDAD ─────────────────────────────────

  let _pastillaDragging = false;
  let _pastillaDragStartX = 0;
  let _pastillaDragOriginX = 0;

  function _renderPastilla() {
    const fid = State.activeFormat;
    let el = _lienzo.querySelector('#canvas-pastilla');

    // Eliminar si no aplica
    if (!fid || typeof Pastilla === 'undefined' || !Pastilla.hasFormat(fid) || !Pastilla.isVisible(fid)) {
      if (el) el.remove();
      return;
    }

    const pos = Pastilla.getPosition(fid);
    const src = Pastilla.getSrc(fid);

    if (!el) {
      el = document.createElement('img');
      el.id = 'canvas-pastilla';
      el.style.position = 'absolute';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'move';
      el.draggable = false;
      el.addEventListener('load', () => _renderPastilla());
      _lienzo.appendChild(el);

      // Drag solo en eje X
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (Pastilla.isLocked(State.activeFormat)) return;
        if (typeof History !== 'undefined') History.push();
        _pastillaDragging = true;
        _pastillaDragStartX = e.clientX;
        _pastillaDragOriginX = Pastilla.getOffsetX(State.activeFormat);
        document.body.classList.add('layer-dragging');

        const onMove = ev => {
          if (!_pastillaDragging) return;
          const dx = (ev.clientX - _pastillaDragStartX) / (_scale * _contentScaleX);
          Pastilla.setOffsetX(State.activeFormat, Math.round(_pastillaDragOriginX + dx));
          _renderPastilla();
        };
        const onUp = () => {
          _pastillaDragging = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.body.classList.remove('layer-dragging');
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    if (el.src !== new URL(src, location.href).href) el.src = src;

    const size = State.formatSizes[fid];
    const dc   = size?.displayContext;
    const clipW = dc ? (dc.contentW || size.w) : size.w;
    const clipH = dc ? (dc.contentH || size.h) : size.h;
    const csX   = dc ? clipW / size.w : 1;
    const csY   = dc ? clipH / size.h : 1;

    // Posición en píxeles del clip/lienzo
    const px = (_contentCenterX) + pos.x * _scale * csX;
    const py = (_contentCenterY) + pos.y * _scale * csY;

    // Tamaño explícito: natural * scale * lienzo_scale * contentScale
    const natW = el.naturalWidth  || 200;
    const natH = el.naturalHeight || 50;
    const w = natW * pos.scale * _scale * csX;
    const h = natH * pos.scale * _scale * csY;

    el.style.zIndex = '7500';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.left = px + 'px';
    el.style.top  = py + 'px';
    el.style.cursor = Pastilla.isLocked(fid) ? 'default' : 'move';

    // Mover al contenedor correcto
    const target = _contentClip || _lienzo;
    if (el.parentElement !== target) target.appendChild(el);


  }

  function _renderPastillaFreemium() {
    const fid = State.activeFormat;
    let el = _lienzo.querySelector('#canvas-pastilla-freemium');

    // Solo visible en formatos de texto cuando la versión es Freemium
    const isFreemium = typeof Layout !== 'undefined' && Layout.isFreemium(fid);
    const isTextFormat = fid === 'MUX4 TXT' || fid === 'MOVIL TXT' || fid === 'TEXTO HORIZONTAL' || fid === 'TEXTO VERTICAL';

    if (!isFreemium || !isTextFormat || typeof Pastilla === 'undefined') {
      if (el) el.remove();
      return;
    }

    const src = Pastilla.getFreemiumSrc();

    if (!el) {
      el = document.createElement('img');
      el.id = 'canvas-pastilla-freemium';
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      el.draggable = false;
      el.addEventListener('load', () => _renderPastillaFreemium());
      const target = _contentClip || _lienzo;
      target.appendChild(el);
    }

    if (el.src !== new URL(src, location.href).href) el.src = src;

    const size = State.formatSizes[fid];
    const dc   = size?.displayContext;
    const clipW = dc ? (dc.contentW || size.w) : size.w;
    const clipH = dc ? (dc.contentH || size.h) : size.h;
    const csX   = dc ? clipW / size.w : 1;
    const csY   = dc ? clipH / size.h : 1;

    // Alto configurable por preset o fijo 61px, ancho proporcional al SVG
    const natW    = el.naturalWidth  || 705;
    const natH    = el.naturalHeight || 61;
    const _presetPH = typeof Layout !== 'undefined' && Layout.getPreset && Layout.getPreset(fid);
    const targetH = (_presetPH && _presetPH['PASTILLA_FREEMIUM']?.pastillaH) ?? 61;
    const targetW = natW / natH * targetH;

    const w = targetW * _scale * csX;
    const h = targetH * _scale * csY;

    // Centrada horizontalmente, Y fija del preset
    const _presetPastilla = typeof Layout !== 'undefined' && Layout.getPreset && Layout.getPreset(fid);
    const posY = (_presetPastilla && _presetPastilla['PASTILLA_FREEMIUM']?.y) ?? 95;
    const px = _contentCenterX;
    const py = _contentCenterY + posY * _scale * csY;

    el.style.zIndex    = '7600';
    el.style.width     = w + 'px';
    el.style.height    = h + 'px';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.left      = px + 'px';
    el.style.top       = py + 'px';

    // Mover al contenedor correcto
    const target = _contentClip || _lienzo;
    if (el.parentElement !== target) target.appendChild(el);
  }

  function getScale() { return _scale; }

  // ── ALINEACIÓN ────────────────────────────────────────────
  let _keyLayerId = null;

  function setKeyLayer(layerId) {
    _keyLayerId = _keyLayerId === layerId ? null : layerId;
    if (typeof Layers !== 'undefined') Layers.render();
  }

  function getKeyLayerId() { return _keyLayerId; }

  function align(direction) {
    const fmt = State.activeFormat;
    if (!fmt || State.selectedLayerIds.length === 0) return;
    if (typeof History !== 'undefined') History.push();

    const fmtSize = State.formatSizes[fmt];
    const W = fmtSize?.w || 1920;
    const H = fmtSize?.h || 1080;
    const ids = State.selectedLayerIds;

    function _getBox(id) {
      const p  = State.formatParams?.[fmt]?.[id] || {};
      const l  = State.layers.find(layer => layer.id === id);
      if (!l) return null;
      const sx = (p.scaleX ?? 100) / 100;
      const sy = (p.scaleY ?? 100) / 100;
      const nw = (l.naturalWidth  || 200) * sx;
      const nh = (l.naturalHeight || 200) * sy;
      const px = p.x ?? 0;
      const py = p.y ?? 0;
      // Para texto: el punto x es borde izq/centro/der según alineación
      //             el punto y es el borde superior
      let left, cx;
      if (l.type === 'text') {
        const align = l.textParams?.align || 'left';
        left = align === 'left'    ? px
             : align === 'center'  ? px - nw / 2
             :                       px - nw;
        cx = left + nw / 2;
      } else {
        cx   = px;
        left = px - nw / 2;
      }
      // Para texto el py es el borde superior; para el resto es el centro
      const top = l.type === 'text' ? py : py - nh / 2;
      const cy  = top + nh / 2;
      return { cx, cy, w: nw, h: nh, left, right: left + nw, top, bottom: top + nh };
    }

    // Área de diseño real para alinear:
    //  - maskRect (SIL/PERFIL): ya define el área visible recortada.
    //  - safeArea (IPLUS): zona útil definida solo para alinear, sin recortar visualmente.
    // Coords del sistema: relativas al CENTRO del lienzo. x/y son el CENTRO del rect.
    // displayContext NO afecta — formatos con dc ya posicionan capas en coords del formato.
    function _designAreaBox() {
      const area = fmtSize?.maskRect || fmtSize?.safeArea;
      if (area) {
        const cx = area.x;
        const cy = area.y;
        return { left: cx - area.w / 2, right: cx + area.w / 2, top: cy - area.h / 2, bottom: cy + area.h / 2, cx, cy, w: area.w, h: area.h };
      }
      return { left: -W/2, right: W/2, top: -H/2, bottom: H/2, cx: 0, cy: 0, w: W, h: H };
    }

    let refBox;
    if (ids.length === 1) {
      refBox = _designAreaBox();
    } else if (_keyLayerId && ids.includes(_keyLayerId)) {
      refBox = _getBox(_keyLayerId);
    } else {
      const boxes = ids.map(_getBox).filter(Boolean);
      refBox = {
        left:   Math.min(...boxes.map(b => b.left)),
        right:  Math.max(...boxes.map(b => b.right)),
        top:    Math.min(...boxes.map(b => b.top)),
        bottom: Math.max(...boxes.map(b => b.bottom)),
      };
      refBox.cx = (refBox.left + refBox.right)  / 2;
      refBox.cy = (refBox.top  + refBox.bottom) / 2;
    }
    if (!refBox) return;

    const toMove = ids.filter(id => id !== _keyLayerId);
    toMove.forEach(id => {
      const box = _getBox(id);
      const l   = State.layers.find(layer => layer.id === id);
      if (!box || !l) return;
      let ncx = box.cx, ncy = box.cy;
      switch (direction) {
        case 'left':    ncx = refBox.left   + box.w / 2; break;
        case 'centerH': ncx = refBox.cx;                 break;
        case 'right':   ncx = refBox.right  - box.w / 2; break;
        case 'top':     ncy = refBox.top    + box.h / 2; break;
        case 'centerV': ncy = refBox.cy;                 break;
        case 'bottom':  ncy = refBox.bottom - box.h / 2; break;
      }
      let nx, ny;
      if (l.type === 'text') {
        const align  = l.textParams?.align || 'left';
        const newLeft = ncx - box.w / 2;
        nx = align === 'left'   ? newLeft
           : align === 'center' ? ncx
           :                      newLeft + box.w;
        ny = ncy - box.h / 2;
      } else {
        nx = ncx;
        ny = ncy;
      }
      Formats.setLayerParam(fmt, id, 'x', Math.round(nx));
      Formats.setLayerParam(fmt, id, 'y', Math.round(ny));
    });

    // Limpiar selección y capa clave tras alinear
    _keyLayerId = null;
    State.selectedLayerId  = null;
    State.selectedLayerIds = [];
    _hideHandles();

    render();
    if (typeof Layers !== 'undefined') Layers.render();
    if (typeof UI !== 'undefined') UI.updateSliders();
  }

  function reinitAutoLayers() {
    _initMarcaIplus();
    _initMarcaSony();
  }

  return { init, render, getScale, reinitAutoLayers, align, setKeyLayer, getKeyLayerId, calcGradientStops: _calcGradientStops, setFraming, isFraming };
})();
