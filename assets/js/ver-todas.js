// ============================================================
// VER-TODAS.JS — Vista de miniaturas de todos los formatos
// ============================================================

const VerTodas = (() => {

  const THUMB_MAX_W = 960;
  const THUMB_MAX_H = 2000;

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
    const size  = State.formatSizes[formatName];
    const isDone = !!State.formatOk?.[formatName];

    const card = document.createElement('div');
    card.className = 'vt-card';
    card.dataset.format = formatName;

    // Header: solo nombre
    const header = document.createElement('div');
    header.className = 'vt-card-header';

    const name = document.createElement('span');
    name.className = 'vt-card-name';
    name.textContent = formatName;

    header.appendChild(name);

    // Canvas thumbnail
    const cv = document.createElement('canvas');
    cv.className = 'vt-thumb';

    if (size) {
      const sx = THUMB_MAX_W / size.w;
      const sy = THUMB_MAX_H / size.h;
      const s  = Math.min(sx, sy, 1);
      cv.width  = Math.round(size.w * s);
      cv.height = Math.round(size.h * s);
    } else {
      cv.width  = THUMB_MAX_W;
      cv.height = THUMB_MAX_H;
    }

    card.appendChild(header);
    card.appendChild(cv);
    card.addEventListener('click', () => _openLightbox(formatName));

    return card;
  }

  async function _renderThumb(formatName, cv) {
    if (!cv) return;
    const size = State.formatSizes[formatName];
    if (!size) return;

    const scale = cv.width / size.w;
    const ctx   = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
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
  }

  function _isLayerVisible(layer, formatName) {
    if (layer.isTitleLayer) {
      return formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT';
    }
    if (layer.isComposicion) {
      if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT' || formatName === 'MUX4 FONDO' || formatName === 'MOVIL MUX FONDO') return false;
      const fmtVisible = State.formatParams?.[formatName]?.[layer.id]?.visible;
      return fmtVisible !== undefined ? fmtVisible : true;
    }
    if (layer.isComposicionMovil) return false;
    if (layer.isMarcaIplus) return formatName === 'IPLUS PUBLI';
    if (layer.exclusiveFormat) {
      return layer.exclusiveFormat === formatName;
    }
    if (formatName === 'MUX4 TXT' || formatName === 'MOVIL TXT') {
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
    const maskRect = State.formatSizes[formatName]?.maskRect;
    const isMasked = maskRect && State.formatMaskEnabled?.[formatName]?.[layer.id];
    if (isMasked) {
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
      const tp    = layer.textParams;
      const sz    = tp.size || 48;
      const wt    = String(tp.weight || '400').replace('italic', '').trim();
      const st    = String(tp.weight || '').includes('italic') || tp.style === 'italic' ? 'italic' : 'normal';
      const fam   = tp.family || 'Apercu Movistar';
      const align = tp.align  || 'left';
      const lineH = sz * 1.2;
      const lines = (tp.content || '').split('\n');
      const N     = lines.length;

      ctx.scale(sx, sy);
      ctx.font         = `${st} ${wt} ${sz}px '${fam}', Arial, sans-serif`;
      ctx.fillStyle    = tp.color || '#ffffff';
      ctx.textBaseline = 'middle';

      const lineWidths = lines.map(l => ctx.measureText(l).width);
      const textW      = Math.max(...lineWidths);

      lines.forEach((line, i) => {
        const lineY   = (i - (N - 1) / 2) * lineH + sz * 0.06;
        const lw      = lineWidths[i];
        const xOffset = align === 'center' ? -lw / 2
                      : align === 'right'  ?  textW / 2 - lw
                      :                      -textW / 2;
        ctx.fillText(line, xOffset, lineY);
      });

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
