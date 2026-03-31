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

  function _updateLienzo() {
    if (!State.activeFormat) {
      _lienzo.style.display = 'none';
      return;
    }

    const size = State.formatSizes[State.activeFormat];
    if (!size) { _lienzo.style.display = 'none'; return; }

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
      _contentClip.style.cssText = `
        position: absolute;
        left: ${Math.round(dc.contentX * _scale)}px;
        top: ${Math.round(dc.contentY * _scale)}px;
        width: ${Math.round(clipW * _scale)}px;
        height: ${Math.round(clipH * _scale)}px;
        overflow: hidden;
        z-index: 1;
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

    // ── Botón OK flotante ─────────────────────────────────────
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

    let ccBtn = document.getElementById('canvas-cc-btn');
    if (!ccBtn) {
      ccBtn = document.createElement('button');
      ccBtn.id = 'canvas-cc-btn';
      _area.appendChild(ccBtn);
      ccBtn.addEventListener('click', _copyToCartelCom);
    }

    _updateOkBtn();

    const label = document.getElementById('lienzo-label');
    if (label) label.textContent = `${size.w} × ${size.h} px`;
  }

  function _updateOkBtn() {
    const okBtn = document.getElementById('canvas-ok-btn');
    if (!okBtn) return;
    const isDone = State.activeFormat && State.formatOk?.[State.activeFormat];
    okBtn.classList.toggle('done', !!isDone);
    okBtn.style.display = State.activeFormat ? 'block' : 'none';

    const ccBtn = document.getElementById('canvas-cc-btn');
    if (!ccBtn) return;
    if (State.activeFormat === 'CARÁTULA H') {
      ccBtn.textContent    = 'Atributos a CC H';
      ccBtn.style.display  = 'block';
    } else if (State.activeFormat === 'CARÁTULA V') {
      ccBtn.textContent    = 'Atributos a CC V';
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

  function _copyToCartelCom() {
    const srcFormat = State.activeFormat;
    if (srcFormat !== 'CARÁTULA H' && srcFormat !== 'CARÁTULA V') return;
    const dstFormat = srcFormat === 'CARÁTULA H' ? 'CARTEL COM. H' : 'CARTEL COM. V';

    const srcSize = State.formatSizes[srcFormat];
    const dstSize = State.formatSizes[dstFormat];
    if (!srcSize || !dstSize) return;

    const scaleX = dstSize.w / srcSize.w;
    const scaleY = dstSize.h / srcSize.h;

    if (typeof History !== 'undefined') History.push();

    if (!State.formatParams[dstFormat]) State.formatParams[dstFormat] = {};

    State.layers.forEach(layer => {
      const src = State.formatParams?.[srcFormat]?.[layer.id];
      if (!src) return;

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

      if (layer.type === 'gradient' && layer.gradientParams) {
        const gp = layer.gradientParams;
        const c1 = _hexToRgba(gp.color1, gp.alpha1);
        const c2 = _hexToRgba(gp.color2, gp.alpha2);
        if (gp.type === 'radial') {
          el.style.background = `radial-gradient(circle, ${c1} 0%, ${c2} 100%)`;
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
        el.style.whiteSpace  = 'pre-wrap';
        el.style.lineHeight  = (tp.leading ?? 120) + '%';
        el.style.letterSpacing = ((tp.tracking ?? 0) * 0.001) + 'em';
        el.style.userSelect  = 'none';
        el.style.padding     = '2px';
        el.style.fontFamily  = ''; // los spans lo llevan inline
        el.style.color       = '';
        const _contentW = _contentClip ? parseInt(_contentClip.style.width) : _lienzoW;
        el.style.width    = _isEditing ? _contentW + 'px' : 'max-content';
        el.style.maxWidth = _contentW + 'px';
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

      if (layer.isTitleLayer) {
        if (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'CARÁTULA H' || State.activeFormat === 'CARÁTULA V' || State.activeFormat === 'CARTEL COM. H' || State.activeFormat === 'CARTEL COM. V' || State.activeFormat === 'AMAZON LOGO' || State.activeFormat === 'SONY') {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        } else {
          isVisible = false;
        }
      } else if (layer.isComposicion) {
        isVisible = State.activeFormat !== 'MUX4 TXT'
                 && State.activeFormat !== 'MOVIL TXT'
                 && State.activeFormat !== 'MOVIL MUX FONDO'
                 && State.activeFormat !== 'TÍTULO FICHA'
                 && State.activeFormat !== 'CARÁTULA H'
                 && State.activeFormat !== 'CARÁTULA V'
                 && State.activeFormat !== 'CARTEL COM. H'
                 && State.activeFormat !== 'CARTEL COM. V'
                 && State.activeFormat !== 'FANART'
                 && State.activeFormat !== 'FANART MÓVIL'
                 && State.activeFormat !== 'AMAZON LOGO'
                 && State.activeFormat !== 'AMAZON BG'
                 && State.activeFormat !== 'SONY';
        if (isVisible) {
          const fmtVisible = State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : true;
        }
      } else if (layer.isComposicionMovil) {
        isVisible = State.activeFormat === 'MOVIL MUX FONDO';
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
        if (State.activeFormat === 'MUX4 TXT' || State.activeFormat === 'MOVIL TXT' || State.activeFormat === 'TÍTULO FICHA' || State.activeFormat === 'AMAZON LOGO') {
          isVisible = false;
        } else {
          const fmtVisible = State.activeFormat && State.formatParams?.[State.activeFormat]?.[layer.id]?.visible;
          isVisible = fmtVisible !== undefined ? fmtVisible : layer.visible;
        }
      }

      el.style.display = isVisible ? 'block' : 'none';
      const isLocked = typeof Layers !== 'undefined' && Layers.getLocked(layer.id);
      el.style.pointerEvents = (layer.isMarcaIplus || layer.isMarcaSony || layer.isComposicionMovil || layer.isComposicionAmazon || isLocked) ? 'none' : '';

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
    });

    if (typeof SystemLayers !== 'undefined') {
      SystemLayers.render(_lienzo, _scale, _lienzoW, _lienzoH);
    }

    _renderPastilla();

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
    el.style.filter = filters.join(' ');

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

    const proj1 = p1x * sinA + p1y * cosA;
    const proj2 = p2x * sinA + p2y * cosA;

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
        _resizing = false;
        document.body.classList.remove('layer-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
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

      _editingText        = true;
      el.contentEditable  = 'true';
      el.style.cursor     = 'text';
      el.style.whiteSpace = 'pre-wrap';
      el.style.width      = 'auto';
      el.style.maxWidth   = 'none';
      // Mantener el mismo ancla que en modo normal
      const _editAlign = layer.textParams?.align || 'left';
      const _editTx    = _editAlign === 'left' ? '0%' : _editAlign === 'right' ? '-100%' : '-50%';
      el.style.transform = `translate(${_editTx}, 0%)`;
      _hideHandles();
      el.focus();
      if (typeof TextLayers !== 'undefined') TextLayers.clearPendingOffsets();

      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      if (typeof TextLayers !== 'undefined') TextLayers.openPanel(layerId);

      const onBlur = () => {
        _editingText        = false;
        el.contentEditable  = 'false';
        el.style.cursor     = 'move';
        el.style.whiteSpace = 'pre-wrap';
        el.style.width      = 'max-content';
        if (layer.textParams && typeof TextLayers !== 'undefined') {
          TextLayers.saveRunsFromDOM(layer, el);
          layer.naturalWidth  = el.offsetWidth  / _scale || 100;
          layer.naturalHeight = el.offsetHeight / _scale || 50;
        }
        render();
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

      const selLayer = State.layers.find(l => l.id === State.selectedLayerId);
      if (selLayer?.isComposicion && State.activeFormat === 'MUX4 FONDO') return;
      if (selLayer?.isComposicionMovil && State.activeFormat === 'MOVIL MUX FONDO') return;
      if (selLayer?.isComposicionAmazon && State.activeFormat === 'AMAZON BG') return;
      if (selLayer?.isMarcaIplus && State.activeFormat === 'IPLUS PUBLI') return;
      if (selLayer?.isMarcaSony && State.activeFormat === 'SONY') return;

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

    let refBox;
    if (ids.length === 1) {
      refBox = { left: -W/2, right: W/2, top: -H/2, bottom: H/2, cx: 0, cy: 0, w: W, h: H };
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

  return { init, render, getScale, reinitAutoLayers, align, setKeyLayer, getKeyLayerId };
})();
