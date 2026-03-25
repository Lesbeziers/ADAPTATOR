// ============================================================
// SILHOUETTE.JS — Eliminación de fondo con remove.bg API
// ============================================================

const Silhouette = (() => {

  const API_KEY = 'np87Akx8apFPRpwZw3qaY5F5';

  let _processing = false;

  function init() {
    document.getElementById('btn-siluetear')
      ?.addEventListener('click', _onSiluetear);
  }

  async function _onSiluetear() {
    if (_processing) return;

    const layerId = State.selectedLayerId;
    const layer   = State.layers.find(l => l.id === layerId);

    if (!layer || !layer.src) {
      _showToast('Selecciona una capa de imagen'); return;
    }
    if (layer.type && layer.type !== 'image') {
      _showToast('Solo funciona con capas de imagen'); return;
    }

    _processing = true;
    if (typeof History !== 'undefined') History.push();
    _showProgress('Eliminando fondo...');

    try {
      // 1 — Duplicar la capa original
      const copyId = 'layer_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      const copy = {
        ...layer,
        id:   copyId,
        name: layer.name + ' (sin fondo)',
        src:  layer.src,
        params: { ...layer.params },
      };

      // Copiar formatParams para todos los formatos
      Object.keys(State.formatParams || {}).forEach(fid => {
        if (State.formatParams[fid][layerId]) {
          if (!State.formatParams[fid][copyId]) State.formatParams[fid][copyId] = {};
          State.formatParams[fid][copyId] = { ...State.formatParams[fid][layerId] };
        }
      });

      // 2 — Insertar la copia justo encima de la original y ocultar la original
      const origIndex = State.layers.findIndex(l => l.id === layerId);
      State.layers.splice(origIndex, 0, copy);
      layer.visible = false;

      // Actualizar panel y canvas para mostrar el estado intermedio
      if (typeof Layers !== 'undefined') Layers.render();
      if (typeof Canvas !== 'undefined') Canvas.render();

      // 3 — Enviar la copia a remove.bg
      const srcBlob = await _srcToBlob(copy.src);
      const formData = new FormData();
      formData.append('image_file', srcBlob, 'image.png');
      formData.append('size', 'auto');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': API_KEY },
        body: formData,
      });

      if (!response.ok) {
        // Si falla, deshacer: eliminar copia y restaurar visibilidad
        State.layers = State.layers.filter(l => l.id !== copyId);
        layer.visible = true;
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.errors?.[0]?.title || `Error ${response.status}`);
      }

      const resultBlob = await response.blob();
      const dataUrl    = await _blobToDataUrl(resultBlob);

      // 4 — Actualizar la copia con el resultado
      copy.src = dataUrl;
      State.selectedLayerId  = copyId;
      State.selectedLayerIds = [copyId];

      // Forzar actualización del elemento img en el DOM
      const copyEl = document.querySelector(`.canvas-layer[data-id="${copyId}"]`);
      if (copyEl) {
        const img = copyEl.tagName === 'IMG' ? copyEl : copyEl.querySelector('img');
        if (img) img.src = dataUrl;
      }

      _hideProgress();
      _showToast('¡Fondo eliminado! Original oculto, copia procesada encima.');

      if (typeof Layers !== 'undefined') Layers.render();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof UI     !== 'undefined') UI.updateSliders();

    } catch (err) {
      console.error('Silhouette error:', err);
      _hideProgress();
      _showToast('Error: ' + (err.message || 'No se pudo procesar'));
    } finally {
      _processing = false;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────

  async function _srcToBlob(src) {
    const response = await fetch(src);
    return await response.blob();
  }

  function _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  // ── UI ────────────────────────────────────────────────────

  function _showProgress(msg) {
    let ov = document.getElementById('sil-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'sil-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99990;';

      const box = document.createElement('div');
      box.style.cssText = 'background:#1c1c1c;border:1px solid #333;border-radius:6px;padding:32px 48px;display:flex;flex-direction:column;align-items:center;gap:16px;min-width:240px;';

      if (!document.getElementById('sil-keyframes')) {
        const st = document.createElement('style');
        st.id = 'sil-keyframes';
        st.textContent = '@keyframes silSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }

      const spinner = document.createElement('div');
      spinner.style.cssText = 'width:36px;height:36px;border:3px solid #333;border-top-color:#f0c020;border-radius:50%;animation:silSpin 0.8s linear infinite;';

      const lbl = document.createElement('div');
      lbl.id = 'sil-label';
      lbl.style.cssText = 'font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f0c020;text-align:center;';
      lbl.textContent = msg;

      box.appendChild(spinner);
      box.appendChild(lbl);
      ov.appendChild(box);
      document.body.appendChild(ov);
    }
    const lbl = document.getElementById('sil-label');
    if (lbl) lbl.textContent = msg;
  }

  function _hideProgress() {
    document.getElementById('sil-overlay')?.remove();
  }

  function _showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#f0c020;font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:8px 18px;border-radius:4px;z-index:99998;pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return { init };
})();
