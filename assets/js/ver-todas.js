// ============================================================
// VER-TODAS.JS — Vista de miniaturas de todos los formatos
// ============================================================

const VerTodas = (() => {

  // Mini-viewport 16:9 — renderizar a doble resolución para evitar pixelado
  const CELL_W = 960;
  const CELL_H = 540;

  let _lightbox = null;
  let _lightboxFormats = [];
  let _lightboxIndex   = -1;
  let _lightboxKeyHandler = null;

  // ── SHOW / HIDE ───────────────────────────────────────────

  function show() {
    document.body.classList.add('view-all');
    const area = document.getElementById('ver-todas-area');
    if (!area) return;
    _render(area);
  }

  function hide() {
    document.body.classList.remove('view-all');
    _closeLightbox();
  }

  // ── RENDER GRID ───────────────────────────────────────────

  function _render(area) {
    area.innerHTML = '';

    // Recoger todas las modalidades (salvo 'selecciona') con formatos OK
    const modalitiesWithFormats = State.modalities
      .filter(m => m.id !== 'selecciona' && m.formats.some(f => State.formatOk?.[f]));

    if (modalitiesWithFormats.length === 0) {
      area.innerHTML = '<div class="vt-empty">No hay formatos terminados</div>';
      return;
    }

    // Lista global para el lightbox (todos los formatos OK en orden)
    _lightboxFormats = modalitiesWithFormats.flatMap(m => m.formats.filter(f => State.formatOk?.[f]));

    let thumbIndex = 0;
    modalitiesWithFormats.forEach(modality => {
      const formats = modality.formats.filter(f => State.formatOk?.[f]);
      if (formats.length === 0) return;

      // Encabezado de modalidad
      const heading = document.createElement('div');
      heading.className = 'vt-modality-heading';
      heading.textContent = modality.label.toUpperCase();
      area.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'vt-grid';
      area.appendChild(grid);

      formats.forEach(formatName => {
        const card = _buildCard(formatName);
        grid.appendChild(card);
        setTimeout(() => _renderThumb(formatName, card.querySelector('canvas')), thumbIndex * 40);
        thumbIndex++;
      });
    });
  }

  function _buildCard(formatName) {
    const card = document.createElement('div');
    card.className = 'vt-card';
    card.dataset.format = formatName;

    // Mini-viewport canvas — siempre 16:9 CELL_W × CELL_H
    const cv = document.createElement('canvas');
    cv.className = 'vt-thumb';
    cv.width  = CELL_W;
    cv.height = CELL_H;

    // Fondo del mini-viewport (gris ligeramente más claro que la app)
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, CELL_W, CELL_H);

    // Nombre del formato debajo
    const name = document.createElement('div');
    name.className = 'vt-card-name';
    name.textContent = formatName;

    card.appendChild(cv);
    card.appendChild(name);
    card.addEventListener('click', () => _openLightbox(formatName));

    return card;
  }

  async function _renderThumb(formatName, cv) {
    if (!cv) return;
    const size = State.formatSizes[formatName];
    if (!size) return;

    const ctx = cv.getContext('2d');

    // Fondo del mini-viewport
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, CELL_W, CELL_H);

    // Calcular escala: fit dentro del cell con margen, nunca por encima de 1:1
    const MARGIN = 12; // px de margen interior
    const maxW = CELL_W - MARGIN * 2;
    const maxH = CELL_H - MARGIN * 2;
    const scale = Math.min(maxW / size.w, maxH / size.h, 1);

    // Tamaño real del render dentro del cell
    const rw = Math.round(size.w * scale);
    const rh = Math.round(size.h * scale);

    // Centrar dentro del cell
    const ox = Math.round((CELL_W - rw) / 2);
    const oy = Math.round((CELL_H - rh) / 2);

    ctx.save();
    ctx.translate(ox, oy);
    // Clip al área exacta del formato — evita que capas fuera del lienzo se vean
    ctx.beginPath();
    ctx.rect(0, 0, rw, rh);
    ctx.clip();
    ctx.scale(scale, scale);
    await _drawFormat(ctx, formatName, size.w, size.h);
    ctx.restore();
  }

  // ── DIBUJAR UN FORMATO ────────────────────────────────────

  async function _drawFormat(ctx, formatName, W, H) {
    await document.fonts.ready;

    // Ordenar capas de fondo a frente (reverse = bottom first)
    const layers = [...State.layers].reverse();

    for (const layer of layers) {
      if (layer.isMarcaIplus) continue; // se dibuja al final, encima de todo
      if (layer.isMarcaSony) continue;
      const isVisible = _isLayerVisible(layer, formatName);
      if (!isVisible) continue;
      await _drawLayer(ctx, layer, formatName, W, H);
    }

    // Pastilla de publicidad (encima de todo)
    if (typeof Pastilla !== 'undefined' && Pastilla.hasFormat(formatName) && Pastilla.isVisible(formatName)) {
      const pos = Pastilla.getPosition(formatName);
      const src = Pastilla.getSrc(formatName);
      await new Promise(res => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const sw = img.naturalWidth  * pos.scale;
          const sh = img.naturalHeight * pos.scale;
          const px = W / 2 + pos.x - sw / 2;
          const py = H / 2 + pos.y - sh / 2;
          ctx.drawImage(img, px, py, sw, sh);
          res();
        };
        img.onerror = () => res();
        img.src = src;
      });
    }

    // MARCA IPLUS: siempre al final, por encima de todo
    const marca = State.layers.find(l => l.isMarcaIplus);
    if (marca && formatName === 'IPLUS PUBLI') {
      await _drawLayer(ctx, marca, formatName, W, H);
    }
    const marcaSony = State.layers.find(l => l.isMarcaSony);
    if (marcaSony && formatName === 'SONY') {
      await _drawLayer(ctx, marcaSony, formatName, W, H);
    }
  }

  function _isLayerVisible(layer, formatName) {
    if (layer.isTitleLayer) {
      return (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'TÍTULO FICHA' || formatName === 'CARÁTULA H' || formatName === 'CARÁTULA V' || formatName === 'CARTEL COM. H' || formatName === 'CARTEL COM. V' || formatName === 'AMAZON LOGO' || formatName === 'SONY') && formatName !== 'FANART' && formatName !== 'FANART MÓVIL';
    }
    if (layer.isComposicion) {
      if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'MUX4 FONDO' || formatName === 'MOVIL MUX FONDO' || formatName === 'TÍTULO FICHA' || formatName === 'CARÁTULA H' || formatName === 'CARÁTULA V' || formatName === 'CARTEL COM. H' || formatName === 'CARTEL COM. V' || formatName === 'FANART' || formatName === 'FANART MÓVIL' || formatName === 'AMAZON LOGO' || formatName === 'AMAZON BG' || formatName === 'SONY') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicionMovil) return false;
    if (layer.isComposicionAmazon) return false;
    if (layer.isMarcaSony) return formatName === 'SONY';
    if (layer.isMarcaIplus) return formatName === 'IPLUS PUBLI';
    if (layer.exclusiveFormat) {
      return layer.exclusiveFormat === formatName;
    }
    if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'TÍTULO FICHA' || formatName === 'AMAZON LOGO') {
      return false;
    }
    const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
    return fmtVisible !== undefined ? fmtVisible : layer.visible !== false;
  }

  async function _drawLayer(ctx, layer, formatName, W, H) {
    const p   = State.formatParams?.[formatName]?.[layer.id] || {};
    const sx  = (p.scaleX  ?? 100) / 100;
    const sy  = (p.scaleY  ?? 100) / 100;
    const rot = ((p.rotation ?? 0) * Math.PI) / 180;
    const op  = (layer.params?.opacity ?? 100) / 100;

    // ── MÁSCARA SIL ───────────────────────────────────────
    const fmtSize    = State.formatSizes[formatName];
    const maskRect   = fmtSize?.maskRect;
    const maskCircle = fmtSize?.maskCircle;
    const maskType   = State.formatMaskEnabled?.[formatName]?.[layer.id] ?? null;
    const isSIL          = maskRect && !maskCircle;
    const isMaskedSIL    = isSIL && !!maskType;
    const isMaskedCircle = maskCircle && maskType === 'circle';
    const isMaskedRect   = maskCircle && maskType === 'rect';
    const isMasked = isMaskedSIL || isMaskedCircle || isMaskedRect;
    if (isMaskedSIL) {
      ctx.save();
      _clipMaskRect(ctx, maskRect, W, H);
    } else if (isMaskedCircle) {
      ctx.save();
      _clipMaskCircle(ctx, maskCircle, W, H);
    } else if (isMaskedRect) {
      ctx.save();
      _clipMaskRect(ctx, maskRect, W, H);
    }

    // Posición especial: COMPOSICIÓN TÍTULO en MUX4 FONDO
    if (layer.isComposicion && layer.src) {
      const nw = layer.naturalWidth  || W;
      const nh = layer.naturalHeight || H;
      const drawW = nw * sx;
      const drawH = nh * sy;
      let posX, posY;
      if (formatName === 'MUX4 FONDO') {
        posX = 106;
        posY = 185;
      } else {
        posX = W / 2 + (p.x ?? 0) - drawW / 2;
        posY = H / 2 + (p.y ?? 0) - drawH / 2;
      }
      ctx.save();
      ctx.globalAlpha = op;
      await _drawImage(ctx, layer.src, posX, posY, drawW, drawH);
      ctx.restore();
      return;
    }

    const cx = W / 2 + (p.x ?? 0);
    const cy = H / 2 + (p.y ?? 0);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, op));

    // Filtros CSS → canvas (solo blur, brightness, contrast, saturation)
    const filters = [];
    const g = layer.params || {};
    if (g.blur       > 0)   filters.push(`blur(${g.blur}px)`);
    if (g.brightness !== 0) filters.push(`brightness(${100 + g.brightness}%)`);
    if (g.contrast   !== 0) filters.push(`contrast(${100 + g.contrast}%)`);
    if (g.saturation !== 0) filters.push(`saturate(${100 + g.saturation}%)`);
    if (filters.length) ctx.filter = filters.join(' ');

    ctx.translate(cx, cy);
    ctx.rotate(rot);

    if (layer.type === 'solid' && layer.solidParams) {
      const sw = layer.solidParams.width  * sx;
      const sh = layer.solidParams.height * sy;
      const r  = layer.solidParams.radius || 0;
      ctx.fillStyle = layer.solidParams.color;
      if (r > 0) {
        _roundRect(ctx, -sw/2, -sh/2, sw, sh, r);
        ctx.fill();
      } else {
        ctx.fillRect(-sw/2, -sh/2, sw, sh);
      }

    } else if (layer.type === 'gradient' && layer.gradientParams) {
      const gp = layer.gradientParams;
      const gw = (layer.naturalWidth  || W) * sx;
      const gh = (layer.naturalHeight || H) * sy;
      const c1 = _rgba(gp.color1, gp.alpha1);
      const c2 = _rgba(gp.color2, gp.alpha2);
      let grad;
      if (gp.type === 'radial') {
        grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(gw, gh) / 2);
      } else {
        const ang = ((gp.angle - 90) * Math.PI) / 180;
        const dx  = Math.cos(ang) * gw / 2;
        const dy  = Math.sin(ang) * gh / 2;
        grad = ctx.createLinearGradient(-dx, -dy, dx, dy);
      }
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(-gw/2, -gh/2, gw, gh);

    } else if (layer.type === 'text' && layer.textParams) {
      if (typeof TextLayers !== 'undefined') TextLayers.migrate(layer);
      const tp       = layer.textParams;
      const sz       = tp.size || 48;
      const align    = tp.align  || 'left';
      const lineH    = sz * (tp.leading  ?? 120) / 100;
      const tracking = (tp.tracking ?? 0) * 0.001;
      const runs     = tp.runs || [];
      const lineRuns = (typeof TextLayers !== 'undefined') ? TextLayers.buildLineRuns(runs) : [runs];
      const N        = lineRuns.length;
      ctx.save();
      ctx.scale(sx, sy);
      ctx.textBaseline  = 'middle';
      ctx.letterSpacing = tracking + 'em';
      // Calcular lineH por línea (tamaño mayor de cada línea * leading)
      const lineHeights = lineRuns.map(lr => {
        const maxSz = lr.length > 0 ? Math.max(...lr.map(r => r.size || sz)) : sz;
        return maxSz * (tp.leading ?? 120) / 100;
      });

      const lineWidths = lineRuns.map(lr => {
        let w = 0;
        for (const r of lr) {
          const rsz = r.size || sz;
          ctx.font = `${r.style||'normal'} ${r.weight||'400'} ${rsz}px '${r.family||'Apercu Movistar'}', Arial, sans-serif`;
          w += ctx.measureText(r.text || '').width;
        }
        return w;
      });
      const textW    = Math.max(...lineWidths, 0);
      const totalH   = lineHeights.reduce((a, b) => a + b, 0);
      let   currentY = -totalH / 2;

      lineRuns.forEach((lr, i) => {
        const lh   = lineHeights[i];
        const lineY = currentY + lh / 2;
        currentY += lh;
        const lw     = lineWidths[i];
        // xStart: ajustar según alineación para coincidir con viewport
        // En viewport: left→borde izq, center→centro, right→borde der
        let   xStart = align === 'center' ? -lw / 2
                      : align === 'right'  ? -lw
                      : 0;
        for (const r of lr) {
          const rsz = r.size || sz;
          ctx.font      = `${r.style||'normal'} ${r.weight||'400'} ${rsz}px '${r.family||'Apercu Movistar'}', Arial, sans-serif`;
          ctx.fillStyle = r.color || '#ffffff';
          ctx.fillText(r.text || '', xStart, lineY);
          xStart += ctx.measureText(r.text || '').width;
        }
      });
      ctx.restore();
    } else if (layer.src) {
      const iw = (layer.naturalWidth  || 200) * sx;
      const ih = (layer.naturalHeight || 200) * sy;

      if (layer.params?.tintAmount > 0) {
        // Canvas temporal en coordenadas reales del formato (W×H)
        // para que el blur no se recorte al bounding box de la imagen
        const tmp = document.createElement('canvas');
        tmp.width  = W;
        tmp.height = H;
        const tctx = tmp.getContext('2d');
        tctx.save();
        tctx.translate(W / 2 + (p.x ?? 0), H / 2 + (p.y ?? 0));
        tctx.rotate(((p.rotation ?? 0) * Math.PI) / 180);
        await _drawImage(tctx, layer.src, -iw/2, -ih/2, iw, ih);
        tctx.globalCompositeOperation = 'source-atop';
        tctx.globalAlpha = layer.params.tintAmount / 100;
        tctx.fillStyle   = layer.params.tintColor || '#000000';
        tctx.fillRect(-iw/2, -ih/2, iw, ih);
        tctx.restore();
        // Volcar al ctx principal (que ya tiene el scale aplicado) en coordenadas del formato
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = op;
        if (filters.length) ctx.filter = filters.join(' ');
        ctx.drawImage(tmp, 0, 0, W, H, 0, 0, W, H);
      } else {
        await _drawImage(ctx, layer.src, -iw/2, -ih/2, iw, ih);
      }
    }

    ctx.restore();
    if (isMasked) ctx.restore(); // cerrar el clip de máscara SIL
  }

  function _clipMaskRect(ctx, m, W, H) {
    // m.x/y son offsets desde el centro del formato, igual que params de capa
    const ax = W / 2 + m.x - m.w / 2;
    const ay = H / 2 + m.y - m.h / 2;
    const r  = m.r || 0;
    ctx.beginPath();
    ctx.moveTo(ax + r, ay);
    ctx.lineTo(ax + m.w - r, ay);
    ctx.arcTo(ax + m.w, ay,       ax + m.w, ay + r,       r);
    ctx.lineTo(ax + m.w, ay + m.h);
    ctx.lineTo(ax,       ay + m.h);
    ctx.lineTo(ax,       ay + r);
    ctx.arcTo(ax,        ay,       ax + r,   ay,           r);
    ctx.closePath();
    ctx.clip();
  }

  function _clipMaskCircle(ctx, m, W, H) {
    const cx = W / 2 + m.cx;
    const cy = H / 2 + m.cy;
    ctx.beginPath();
    ctx.arc(cx, cy, m.r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  function _drawImage(ctx, src, x, y, w, h) {
    return new Promise(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { ctx.drawImage(img, x, y, w, h); res(); };
      img.onerror = () => res();
      img.src = src;
    });
  }

  // ── LIGHTBOX ──────────────────────────────────────────────

  function _openLightbox(formatName) {
    _closeLightbox();

    const size = State.formatSizes[formatName];
    if (!size) return;

    _lightboxIndex = _lightboxFormats.indexOf(formatName);

    const overlay = document.createElement('div');
    overlay.id = 'vt-lightbox';
    overlay.addEventListener('click', _closeLightbox);

    const inner = document.createElement('div');
    inner.className = 'vt-lightbox-inner';
    inner.addEventListener('click', e => e.stopPropagation());

    // Header
    const header = document.createElement('div');
    header.className = 'vt-lightbox-header';

    const name = document.createElement('span');
    name.className = 'vt-lightbox-name';
    name.textContent = formatName;

    header.appendChild(name);

    // Canvas escalado al máximo disponible
    const areaW  = window.innerWidth  - 80;
    const areaH  = window.innerHeight - 180;
    const scaleX = areaW  / size.w;
    const scaleY = areaH  / size.h;
    const scale  = Math.min(scaleX, scaleY, 1);

    const cv = document.createElement('canvas');
    cv.width  = Math.round(size.w * scale);
    cv.height = Math.round(size.h * scale);
    cv.style.display = 'block';

    // Botón editar
    const editBtn = document.createElement('button');
    editBtn.className = 'vt-edit-btn';
    editBtn.textContent = 'EDITAR FORMATO';
    editBtn.addEventListener('click', () => {
      _closeLightbox();
      document.getElementById('btn-editor')?.click();
      if (typeof Formats !== 'undefined') Formats.setActiveFormat(formatName);
    });

    inner.appendChild(header);
    inner.appendChild(cv);
    inner.appendChild(editBtn);
    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    _lightbox = overlay;

    // Keyboard navigation
    _lightboxKeyHandler = e => {
      if (e.key === 'Escape') { _closeLightbox(); return; }
      if (e.key === 'ArrowRight' && _lightboxIndex < _lightboxFormats.length - 1) {
        e.preventDefault();
        _openLightbox(_lightboxFormats[_lightboxIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && _lightboxIndex > 0) {
        e.preventDefault();
        _openLightbox(_lightboxFormats[_lightboxIndex - 1]);
      }
    };
    document.addEventListener('keydown', _lightboxKeyHandler);

    // Render async
    const ctx = cv.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    _drawFormat(ctx, formatName, size.w, size.h).then(() => ctx.restore());
  }

  function _closeLightbox() {
    if (_lightboxKeyHandler) {
      document.removeEventListener('keydown', _lightboxKeyHandler);
      _lightboxKeyHandler = null;
    }
    if (_lightbox) { _lightbox.remove(); _lightbox = null; }
    _lightboxIndex = -1;
  }

  // ── HELPERS ───────────────────────────────────────────────

  function _rgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${((alpha ?? 100) / 100).toFixed(2)})`;
  }

  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);     ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);         ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  return { show, hide };
})();
