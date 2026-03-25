// ============================================================
// COMPOSICION.JS — Genera capa "COMPOSICIÓN TÍTULO" desde MUX4 TXT
// ============================================================

const Composicion = (() => {

  const MASTER_FORMAT = 'MUX4 TXT';
  const COMP_NAME     = 'COMPOSICIÓN TÍTULO';

  let _generating = false;
  let _pending    = false;

  async function generate() {
    if (_generating) { _pending = true; return; }
    if (!State.formatSizes[MASTER_FORMAT]) return;

    _generating = true;
    _pending    = false;

    try {
      await document.fonts.ready;

      const fmtSize = State.formatSizes[MASTER_FORMAT];
      const W = fmtSize.w;
      const H = fmtSize.h;

      const visibleLayers = [...State.layers]
        .reverse()
        .filter(l => l.isTitleLayer || l.exclusiveFormat === MASTER_FORMAT);

      const cv  = document.createElement('canvas');
      cv.width  = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      for (const layer of visibleLayers) {
        const p   = State.formatParams?.[MASTER_FORMAT]?.[layer.id] || {};
        const sx  = (p.scaleX ?? 100) / 100;
        const sy  = (p.scaleY ?? 100) / 100;
        const rot = ((p.rotation ?? 0) * Math.PI) / 180;
        const cx  = W / 2 + (p.x ?? 0);
        const cy  = H / 2 + (p.y ?? 0);

        const op         = (layer.params?.opacity     ?? 100) / 100;
        const blur       = layer.params?.blur         ?? 0;
        const noise      = layer.params?.noise        ?? 0;
        const brightness = layer.params?.brightness   ?? 0;
        const contrast   = layer.params?.contrast     ?? 0;
        const saturation = layer.params?.saturation   ?? 0;

        const filters = [];
        if (blur       > 0)   filters.push(`blur(${blur}px)`);
        if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`);
        if (contrast   !== 0) filters.push(`contrast(${100 + contrast}%)`);
        if (saturation !== 0) filters.push(`saturate(${100 + saturation}%)`);

        // Si hay ruido, dibujamos la capa en un canvas temporal para
        // poder aplicar el grano solo sobre los píxeles opacos
        const useTemp = noise > 0;
        let drawCtx = ctx;
        let tempCv  = null;

        if (useTemp) {
          tempCv        = document.createElement('canvas');
          tempCv.width  = W;
          tempCv.height = H;
          drawCtx       = tempCv.getContext('2d');
          drawCtx.clearRect(0, 0, W, H);
        }

        drawCtx.save();
        drawCtx.globalAlpha = Math.max(0, Math.min(1, op));
        drawCtx.filter      = filters.length ? filters.join(' ') : 'none';
        drawCtx.translate(cx, cy);
        drawCtx.rotate(rot);

        if (layer.type === 'solid' && layer.solidParams) {
          const sw = layer.solidParams.width  * sx;
          const sh = layer.solidParams.height * sy;
          const r  = layer.solidParams.radius || 0;
          drawCtx.fillStyle = layer.solidParams.color;
          _roundRect(drawCtx, -sw / 2, -sh / 2, sw, sh, r);
          drawCtx.fill();

        } else if (layer.type === 'gradient' && layer.gradientParams) {
          const gp = layer.gradientParams;
          const gw = (layer.naturalWidth  || W) * sx;
          const gh = (layer.naturalHeight || H) * sy;
          const c1 = _rgba(gp.color1, gp.alpha1);
          const c2 = _rgba(gp.color2, gp.alpha2);
          let grad;
          if (gp.type === 'radial') {
            grad = drawCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(gw, gh) / 2);
          } else {
            const ang = ((gp.angle - 90) * Math.PI) / 180;
            const dx  = Math.cos(ang) * gw / 2;
            const dy  = Math.sin(ang) * gh / 2;
            grad = drawCtx.createLinearGradient(-dx, -dy, dx, dy);
          }
          grad.addColorStop(0, c1);
          grad.addColorStop(1, c2);
          drawCtx.fillStyle = grad;
          drawCtx.fillRect(-gw / 2, -gh / 2, gw, gh);

        } else if (layer.type === 'text' && layer.textParams) {
          const tp    = layer.textParams;
          const sz    = tp.size || 48;
          const wt    = String(tp.weight || '400').replace('italic', '').trim();
          const st    = String(tp.weight || '').includes('italic') || tp.style === 'italic' ? 'italic' : 'normal';
          const fam   = tp.family || 'Apercu Movistar';
          const align = tp.align || 'left';
          const lineH = sz * 1.2;
          const lines = (tp.content || '').split('\n');
          const N     = lines.length;

          drawCtx.scale(sx, sy);
          drawCtx.font         = `${st} ${wt} ${sz}px '${fam}', Arial, sans-serif`;
          drawCtx.fillStyle    = tp.color || '#ffffff';
          drawCtx.textBaseline = 'middle';
          drawCtx.textAlign    = 'left';

          const lineWidths = lines.map(l => drawCtx.measureText(l).width);
          const textW      = Math.max(...lineWidths);

          lines.forEach((line, i) => {
            const lineY   = (i - (N - 1) / 2) * lineH + sz * 0.06;
            const lw      = lineWidths[i];
            const xOffset = align === 'center' ? -lw / 2
                          : align === 'right'  ?  textW / 2 - lw
                          :                      -textW / 2;
            drawCtx.fillText(line, xOffset, lineY);
          });

        } else if (layer.src) {
          await new Promise(res => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const iw = (layer.naturalWidth  || img.width)  * sx;
              const ih = (layer.naturalHeight || img.height) * sy;

              if (layer.params?.tintAmount > 0) {
                // Canvas temporal para preservar alpha del SVG
                const tmp = document.createElement('canvas');
                tmp.width  = Math.round(iw);
                tmp.height = Math.round(ih);
                const tctx = tmp.getContext('2d');
                // Dibujar imagen original
                tctx.drawImage(img, 0, 0, iw, ih);
                // Dibujar color de tint solo sobre píxeles opacos
                tctx.globalCompositeOperation = 'source-in';
                tctx.globalAlpha = layer.params.tintAmount / 100;
                tctx.fillStyle   = layer.params.tintColor || '#000000';
                tctx.fillRect(0, 0, iw, ih);
                // Restaurar imagen original debajo del tint
                tctx.globalCompositeOperation = 'destination-over';
                tctx.globalAlpha = 1;
                tctx.drawImage(img, 0, 0, iw, ih);
                // Volcar al canvas principal
                drawCtx.drawImage(tmp, -iw / 2, -ih / 2);
              } else {
                drawCtx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
              }

              res();
            };
            img.onerror = res;
            img.src = layer.src;
          });
        }

        drawCtx.restore();

        // ── RUIDO sobre el canvas temporal ───────────────────
        // El grano se dibuja en el canvas temporal donde ya está
        // la capa. Usando destination-in conseguimos que el ruido
        // quede recortado exactamente al alfa de la capa —
        // los píxeles transparentes se mantienen transparentes.
        if (useTemp && noise > 0) {
          const t       = noise / 100;
          const opacity = t * t * 1.5; // curva cuadrática igual que canvas.js

          // Canvas de ruido del mismo tamaño
          const nc      = document.createElement('canvas');
          nc.width      = W;
          nc.height      = H;
          const nctx    = nc.getContext('2d');
          const imgData = nctx.createImageData(W, H);
          const data    = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const v    = Math.random() * 255;
            data[i]     = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = Math.random() * opacity * 255;
          }
          nctx.putImageData(imgData, 0, 0);

          // Recortar el ruido al alfa de la capa: destination-in
          // hace que solo sobrevivan los píxeles del ruido donde
          // la capa (destination) es opaca
          nctx.globalCompositeOperation = 'destination-in';
          nctx.drawImage(tempCv, 0, 0);

          // Aplicar el ruido recortado sobre la capa en modo overlay
          drawCtx.save();
          drawCtx.globalCompositeOperation = 'overlay';
          drawCtx.globalAlpha = 1;
          drawCtx.drawImage(nc, 0, 0);
          drawCtx.restore();

          // Volcar el canvas temporal (capa + ruido) al canvas principal
          ctx.drawImage(tempCv, 0, 0);
        } else if (useTemp) {
          // Ruido = 0 pero useTemp estaba activo (no debería pasar, por si acaso)
          ctx.drawImage(tempCv, 0, 0);
        }
      }

      // comp.src     → sin pastilla (todos los formatos excepto MUX4 FONDO)
      const dataUrl = cv.toDataURL('image/png');

      // comp.srcFondo → con pastilla horneada (solo MUX4 FONDO)
      let dataUrlFondo = dataUrl;
      if (typeof Pastilla !== 'undefined' && Pastilla.isVisible(MASTER_FORMAT)) {
        const cvF  = document.createElement('canvas');
        cvF.width  = W;
        cvF.height = H;
        const ctxF = cvF.getContext('2d');
        ctxF.drawImage(cv, 0, 0);
        const pos = Pastilla.getPosition(MASTER_FORMAT);
        const src = Pastilla.getSrc(MASTER_FORMAT);
        await new Promise(res => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const sw = img.naturalWidth  * pos.scale;
            const sh = img.naturalHeight * pos.scale;
            const px = W / 2 + pos.x - sw / 2;
            const py = H / 2 + pos.y - sh / 2;
            ctxF.drawImage(img, px, py, sw, sh);
            res();
          };
          img.onerror = res;
          img.src = src;
        });
        dataUrlFondo = cvF.toDataURL('image/png');
      }

      let comp = State.layers.find(l => l.isComposicion);
      if (!comp) {
        comp = {
          id:            'layer_comp_' + Date.now(),
          name:          COMP_NAME,
          isComposicion: true,
          visible:       true,
          naturalWidth:  W,
          naturalHeight: H,
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
        };
        State.layers.unshift(comp);
        Object.keys(State.formatSizes || {}).forEach(fid => {
          if (!State.formatParams[fid]) State.formatParams[fid] = {};
          State.formatParams[fid][comp.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
        });
      }

      comp.src           = dataUrl;
      comp.srcFondo      = dataUrlFondo;
      comp.naturalWidth  = W;
      comp.naturalHeight = H;

      document.querySelectorAll(`.canvas-layer[data-id="${comp.id}"]`).forEach(el => {
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) img.src = dataUrl;
      });

      if (typeof Layers !== 'undefined') Layers.render();
      if (State.activeFormat === 'MUX4 FONDO' && typeof Canvas !== 'undefined') Canvas.render();

    } catch(e) {
      console.error('Composicion error:', e);
    } finally {
      _generating = false;
      if (_pending) generate();
    }
  }

  function _rgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${((alpha ?? 100) / 100).toFixed(2)})`;
  }

  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  return { generate };
})();

// ============================================================
// COMPOSICION MOVIL — Genera capa "COMPOSICIÓN MOVIL TEXTO" desde MOVIL TXT
// ============================================================

const ComposicionMovil = (() => {

  const MASTER_FORMAT = 'MOVIL TXT';
  const COMP_NAME     = 'COMPOSICIÓN MOVIL TEXTO';

  let _generating = false;
  let _pending    = false;

  async function generate() {
    if (_generating) { _pending = true; return; }
    if (!State.formatSizes[MASTER_FORMAT]) return;

    _generating = true;
    _pending    = false;

    try {
      await document.fonts.ready;

      const fmtSize = State.formatSizes[MASTER_FORMAT];
      const W = fmtSize.w;
      const H = fmtSize.h;

      const visibleLayers = [...State.layers]
        .reverse()
        .filter(l => l.isTitleLayer || l.exclusiveFormat === MASTER_FORMAT);

      const cv  = document.createElement('canvas');
      cv.width  = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      for (const layer of visibleLayers) {
        const p   = State.formatParams?.[MASTER_FORMAT]?.[layer.id] || {};
        const sx  = (p.scaleX ?? 100) / 100;
        const sy  = (p.scaleY ?? 100) / 100;
        const rot = ((p.rotation ?? 0) * Math.PI) / 180;
        const cx  = W / 2 + (p.x ?? 0);
        const cy  = H / 2 + (p.y ?? 0);

        const op         = (layer.params?.opacity     ?? 100) / 100;
        const blur       = layer.params?.blur         ?? 0;
        const noise      = layer.params?.noise        ?? 0;
        const brightness = layer.params?.brightness   ?? 0;
        const contrast   = layer.params?.contrast     ?? 0;
        const saturation = layer.params?.saturation   ?? 0;

        const filters = [];
        if (blur       > 0)   filters.push(`blur(${blur}px)`);
        if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`);
        if (contrast   !== 0) filters.push(`contrast(${100 + contrast}%)`);
        if (saturation !== 0) filters.push(`saturate(${100 + saturation}%)`);

        const useTemp = noise > 0;
        let drawCtx = ctx;
        let tempCv  = null;

        if (useTemp) {
          tempCv        = document.createElement('canvas');
          tempCv.width  = W;
          tempCv.height = H;
          drawCtx       = tempCv.getContext('2d');
          drawCtx.clearRect(0, 0, W, H);
        }

        drawCtx.save();
        drawCtx.globalAlpha = Math.max(0, Math.min(1, op));
        drawCtx.filter      = filters.length ? filters.join(' ') : 'none';
        drawCtx.translate(cx, cy);
        drawCtx.rotate(rot);

        if (layer.type === 'solid' && layer.solidParams) {
          const sw = layer.solidParams.width  * sx;
          const sh = layer.solidParams.height * sy;
          const r  = layer.solidParams.radius || 0;
          drawCtx.fillStyle = layer.solidParams.color;
          _roundRect(drawCtx, -sw / 2, -sh / 2, sw, sh, r);
          drawCtx.fill();

        } else if (layer.type === 'gradient' && layer.gradientParams) {
          const gp = layer.gradientParams;
          const gw = (layer.naturalWidth  || W) * sx;
          const gh = (layer.naturalHeight || H) * sy;
          const c1 = _rgba(gp.color1, gp.alpha1);
          const c2 = _rgba(gp.color2, gp.alpha2);
          let grad;
          if (gp.type === 'radial') {
            grad = drawCtx.createRadialGradient(0, 0, 0, 0, 0, Math.max(gw, gh) / 2);
          } else {
            const ang = ((gp.angle - 90) * Math.PI) / 180;
            const dx  = Math.cos(ang) * gw / 2;
            const dy  = Math.sin(ang) * gh / 2;
            grad = drawCtx.createLinearGradient(-dx, -dy, dx, dy);
          }
          grad.addColorStop(0, c1);
          grad.addColorStop(1, c2);
          drawCtx.fillStyle = grad;
          drawCtx.fillRect(-gw / 2, -gh / 2, gw, gh);

        } else if (layer.type === 'text' && layer.textParams) {
          const tp    = layer.textParams;
          const sz    = tp.size || 48;
          const wt    = String(tp.weight || '400').replace('italic', '').trim();
          const st    = String(tp.weight || '').includes('italic') || tp.style === 'italic' ? 'italic' : 'normal';
          const fam   = tp.family || 'Apercu Movistar';
          const align = tp.align || 'left';
          const lineH = sz * 1.2;
          const lines = (tp.content || '').split('\n');
          const N     = lines.length;

          drawCtx.scale(sx, sy);
          drawCtx.font         = `${st} ${wt} ${sz}px '${fam}', Arial, sans-serif`;
          drawCtx.fillStyle    = tp.color || '#ffffff';
          drawCtx.textBaseline = 'middle';
          drawCtx.textAlign    = 'left';

          const lineWidths = lines.map(l => drawCtx.measureText(l).width);
          const textW      = Math.max(...lineWidths);

          lines.forEach((line, i) => {
            const lineY   = (i - (N - 1) / 2) * lineH + sz * 0.06;
            const lw      = lineWidths[i];
            const xOffset = align === 'center' ? -lw / 2
                          : align === 'right'  ?  textW / 2 - lw
                          :                      -textW / 2;
            drawCtx.fillText(line, xOffset, lineY);
          });

        } else if (layer.src) {
          await new Promise(res => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const iw = (layer.naturalWidth  || img.width)  * sx;
              const ih = (layer.naturalHeight || img.height) * sy;

              if (layer.params?.tintAmount > 0) {
                const tmp = document.createElement('canvas');
                tmp.width  = Math.round(iw);
                tmp.height = Math.round(ih);
                const tctx = tmp.getContext('2d');
                tctx.drawImage(img, 0, 0, iw, ih);
                tctx.globalCompositeOperation = 'source-in';
                tctx.globalAlpha = layer.params.tintAmount / 100;
                tctx.fillStyle   = layer.params.tintColor || '#000000';
                tctx.fillRect(0, 0, iw, ih);
                tctx.globalCompositeOperation = 'destination-over';
                tctx.globalAlpha = 1;
                tctx.drawImage(img, 0, 0, iw, ih);
                drawCtx.drawImage(tmp, -iw / 2, -ih / 2);
              } else {
                drawCtx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
              }
              res();
            };
            img.onerror = res;
            img.src = layer.src;
          });
        }

        drawCtx.restore();

        if (useTemp && noise > 0) {
          const t       = noise / 100;
          const opacity = t * t * 1.5;
          const nc      = document.createElement('canvas');
          nc.width      = W;
          nc.height     = H;
          const nctx    = nc.getContext('2d');
          const imgData = nctx.createImageData(W, H);
          const data    = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const v    = Math.random() * 255;
            data[i]     = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = Math.random() * opacity * 255;
          }
          nctx.putImageData(imgData, 0, 0);
          nctx.globalCompositeOperation = 'destination-in';
          nctx.drawImage(tempCv, 0, 0);
          drawCtx.save();
          drawCtx.globalCompositeOperation = 'overlay';
          drawCtx.globalAlpha = 1;
          drawCtx.drawImage(nc, 0, 0);
          drawCtx.restore();
          ctx.drawImage(tempCv, 0, 0);
        } else if (useTemp) {
          ctx.drawImage(tempCv, 0, 0);
        }
      }

      const dataUrl = cv.toDataURL('image/png');

      let comp = State.layers.find(l => l.isComposicionMovil);
      if (!comp) {
        comp = {
          id:                 'layer_comp_movil_' + Date.now(),
          name:               COMP_NAME,
          isComposicionMovil: true,
          visible:            true,
          naturalWidth:       W,
          naturalHeight:      H,
          params: { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0 },
        };
        State.layers.unshift(comp);
        Object.keys(State.formatSizes || {}).forEach(fid => {
          if (!State.formatParams[fid]) State.formatParams[fid] = {};
          State.formatParams[fid][comp.id] = { scaleX: 100, scaleY: 100, rotation: 0, x: 0, y: 0 };
        });
      }

      comp.src           = dataUrl;
      comp.srcMovilFondo = dataUrl;
      comp.naturalWidth  = W;
      comp.naturalHeight = H;

      document.querySelectorAll(`.canvas-layer[data-id="${comp.id}"]`).forEach(el => {
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) img.src = dataUrl;
      });

      if (typeof Layers !== 'undefined') Layers.render();
      if (State.activeFormat === 'MOVIL MUX FONDO' && typeof Canvas !== 'undefined') Canvas.render();

    } catch(e) {
      console.error('ComposicionMovil error:', e);
    } finally {
      _generating = false;
      if (_pending) generate();
    }
  }

  function _rgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${((alpha ?? 100) / 100).toFixed(2)})`;
  }

  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  return { generate };
})();
