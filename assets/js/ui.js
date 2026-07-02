// ============================================================
// UI.JS — Sliders, toggles, botones, eventos generales
// ============================================================

const UI = (() => {

  function init() {
    _bindSidebarCollapse();
    _bindCollapsibleSections();
    _initTooltips();
    _bindModeButtons();
    _bindTopBarActions();
    _bindOverlayToggles();
    _bindSliders();
    _bindOkButton();
    _bindExclusiveToggle();
  }

  // Toggle "ATRIBUTOS EXCLUSIVOS": marca/desmarca la capa seleccionada como
  // exclusiva en el formato activo (congela sus visuales aquí; deja de propagar).
  function _bindExclusiveToggle() {
    const btn = document.getElementById('btn-exclusive-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.disabled || !State.activeFormat || !State.selectedLayerIds.length) return;
      const turnOn = !btn.classList.contains('on');
      if (typeof History !== 'undefined') History.push();
      State.selectedLayerIds.forEach(lid => {
        if (typeof Formats !== 'undefined' && Formats.setVisualExclusive) {
          Formats.setVisualExclusive(State.activeFormat, lid, turnOn);
        }
      });
      updateSliders();
      if (typeof Canvas !== 'undefined') Canvas.render();
      if (typeof Layers !== 'undefined') Layers.render();
    });
  }

  function updateSliders() {
    const multiSelect = State.selectedLayerIds.length > 1;
    const layer = State.layers.find(l => l.id === State.selectedLayerId);
    const _defaults = { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' };
    // Ajustes visuales POR FORMATO (con fallback al global). El slider muestra el
    // valor efectivo en el formato activo.
    const g = (layer && typeof Formats !== 'undefined' && Formats.resolveVisual)
      ? Formats.resolveVisual(State.activeFormat, layer)
      : (layer?.params ? { ..._defaults, ...layer.params } : _defaults);
    const p = (!multiSelect && State.activeFormat && State.selectedLayerId)
      ? Formats.getLayerParams(State.activeFormat, State.selectedLayerId)
      : { scaleX: 100, rotation: 0 };

    const sets = [
      { key: 'scale',      val: multiSelect ? 100 : (p.scaleX ?? 100), unit: '%' },
      { key: 'rotation',   val: multiSelect ? 0   : (p.rotation ?? 0), unit: '°' },
      { key: 'opacity',    val: multiSelect ? 100 : g.opacity,          unit: '%' },
      { key: 'blur',       val: multiSelect ? 0   : (layer?.isMask ? (p.maskBlur ?? g.blur) : g.blur), unit: ''  },
      { key: 'noise',      val: multiSelect ? 0   : g.noise,            unit: ''  },
      { key: 'brightness', val: multiSelect ? 0   : g.brightness,       unit: '%' },
      { key: 'contrast',   val: multiSelect ? 0   : g.contrast,         unit: '%' },
      { key: 'saturation', val: multiSelect ? 0   : g.saturation,       unit: '%' },
      { key: 'tint',       val: multiSelect ? 0   : (g.tintAmount ?? 0), unit: '%' },
    ];

    sets.forEach(({ key, val, unit }) => {
      const range = document.getElementById('slider-' + key);
      const label = document.getElementById('label-' + key);
      if (range) range.value = val;
      if (label) {
        label.value = val + unit;
        if (key === 'scale') _updateScaleLabel(label, val);
      }
    });

    // Actualizar swatch color tint
    const swatch = document.getElementById('tint-color-swatch');
    const picker  = document.getElementById('tint-color-picker');
    if (swatch && picker) {
      const c = g.tintColor || '#000000';
      swatch.style.background = c;
      picker.value = c;
    }

    // Estado del toggle "Atributos exclusivos" (refleja la capa seleccionada
    // en el formato activo).
    const exBtn = document.getElementById('btn-exclusive-toggle');
    if (exBtn) {
      const canToggle = !!(State.activeFormat && State.selectedLayerId && layer);
      const isEx = (canToggle && typeof Formats !== 'undefined' && Formats.isVisualExclusive)
        ? Formats.isVisualExclusive(State.activeFormat, State.selectedLayerId) : false;
      exBtn.classList.toggle('on', !!isEx);
      exBtn.setAttribute('aria-checked', isEx ? 'true' : 'false');
      exBtn.disabled = !canToggle;
    }

    // Deshabilitar todo el panel si la capa está bloqueada
    const transformPanel = document.getElementById('transform-panel');
    if (transformPanel) {
      const isLocked = !multiSelect && !!layer && typeof Layers !== 'undefined' && Layers.getLocked(layer.id);
      transformPanel.querySelectorAll('input[type="range"], input[type="text"].transform-val').forEach(el => {
        el.disabled = isLocked;
      });
      transformPanel.style.opacity = isLocked ? '0.4' : '';
      transformPanel.style.pointerEvents = isLocked ? 'none' : '';
    }

    // Habilitar/deshabilitar fila TINTAR según tipo de capa
    const tintRow = document.getElementById('tint-row');
    if (tintRow) {
      const isImage = !multiSelect && !!layer && !['text','solid','gradient'].includes(layer.type);
      tintRow.classList.toggle('transform-disabled', !isImage);
      const sliderTint = document.getElementById('slider-tint');
      if (sliderTint) sliderTint.disabled = !isImage;
    }
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _initTooltips() {
    // Convertir title a data-tooltip
    document.querySelectorAll('[title]').forEach(el => {
      const text = el.getAttribute('title');
      if (!text) return;
      el.removeAttribute('title');
      el.dataset.tooltip = text;
    });

    const tooltip = document.getElementById('custom-tooltip') || document.createElement('div');
    tooltip.id = 'custom-tooltip';
    if (!tooltip.parentNode) document.body.appendChild(tooltip);

    let timer = null;

    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tooltip]');
      if (!el) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        tooltip.textContent = el.dataset.tooltip;
        const ttW = tooltip.offsetWidth;
        const ttX = Math.max(6, Math.min(e.clientX - ttW / 2, window.innerWidth - ttW - 6));
        tooltip.style.left = ttX + 'px';
        tooltip.style.top  = (e.clientY - 32) + 'px';
        tooltip.classList.add('visible');
      }, 300);
    });

    document.addEventListener('mousemove', e => {
      if (!tooltip.classList.contains('visible')) return;
      const ttW2 = tooltip.offsetWidth;
      const ttX2 = Math.max(6, Math.min(e.clientX - ttW2 / 2, window.innerWidth - ttW2 - 6));
      tooltip.style.left = ttX2 + 'px';
      tooltip.style.top  = (e.clientY - 32) + 'px';
    });

    document.addEventListener('mouseout', e => {
      if (!e.target.closest('[data-tooltip]')) return;
      clearTimeout(timer);
      tooltip.classList.remove('visible');
    });

    document.addEventListener('mousedown', () => {
      clearTimeout(timer);
      tooltip.classList.remove('visible');
    });
  }



  function _bindCollapsibleSections() {
    document.querySelectorAll('.panel-section-title.collapsible').forEach(title => {
      const targetId = title.dataset.target;
      const body     = document.getElementById(targetId);
      if (!body) return;
      body.classList.add('section-body');

      title.addEventListener('click', () => {
        const collapsed = title.classList.toggle('collapsed');
        body.classList.toggle('collapsed', collapsed);
      });
    });
  }

  function _bindSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const btn     = document.getElementById('btn-collapse');
    if (!sidebar || !btn) return;

    btn.addEventListener('click', () => {
      const closing = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');
      btn.style.left       = closing ? '0px' : 'var(--sidebar-width)';
      btn.textContent      = closing ? '\u203a' : '\u2039';
      btn.style.borderLeft = closing ? '1px solid #2e2e2e' : 'none';
      btn.style.borderRight= closing ? 'none'              : '1px solid #2e2e2e';
      // Recalcular lienzo tras la animación
      setTimeout(() => { if (typeof Canvas !== 'undefined') Canvas.render(); }, 260);
    });
  }

  function _bindModeButtons() {
    document.querySelectorAll('.btn-mode').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.btn-mode').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        State.view = b.id === 'btn-editor' ? 'editor' : 'all';
        if (State.view === 'all') {
          if (typeof GradientLayers !== 'undefined') GradientLayers.stopPickMode();
          if (typeof VerTodas !== 'undefined') VerTodas.show();
        } else {
          if (typeof VerTodas !== 'undefined') VerTodas.hide();
          if (typeof Canvas   !== 'undefined') Canvas.render();
        }
      });
    });
  }

  function _bindTopBarActions() {
    document.getElementById('btn-abrir')?.addEventListener('click',    () => Project.open());
    document.getElementById('btn-guardar')?.addEventListener('click',  () => Project.save());
    document.getElementById('btn-exportar')?.addEventListener('click', () => Export.exportAll());
  }

  function _bindOverlayToggles() {
    ['mockup', 'txt', 'foco'].forEach(key => {
      document.getElementById('toggle-' + key)?.addEventListener('change', e => {
        State.overlays[key] = e.target.checked;
        Canvas.render();
      });
    });
  }

  function _bindSliders() {
    const keys       = ['scale', 'rotation', 'opacity', 'blur', 'noise', 'brightness', 'contrast', 'saturation', 'tint'];
    const globalKeys = ['opacity', 'blur', 'noise', 'brightness', 'contrast', 'saturation', 'tint'];
    const DEFAULTS   = { opacity: 100, blur: 0, noise: 0, brightness: 0, contrast: 0, saturation: 0, tintAmount: 0, tintColor: '#000000' };

    function _getLayerGlobal(layer, k) {
      // Valor visual efectivo por-formato (override si existe, si no el global).
      if (typeof Formats !== 'undefined' && Formats.resolveVisual && State.activeFormat) {
        return Formats.resolveVisual(State.activeFormat, layer)[k];
      }
      if (!layer.params) layer.params = { ...DEFAULTS };
      return layer.params[k] ?? DEFAULTS[k];
    }

    // Escribe un atributo visual respetando el modelo propagación/exclusivo:
    //  - Capa exclusiva en el formato activo → override por-formato (no propaga).
    //  - Capa normal → valor GLOBAL de la capa → se propaga a todos los formatos.
    // (El blur de MÁSCARA es un caso aparte: siempre por-formato, va a maskBlur.)
    function _writeVisual(lid, key, value) {
      const layer = State.layers.find(l => l.id === lid);
      if (!layer) return;
      if (key === 'blur' && layer.isMask && State.activeFormat) {
        Formats.setLayerParam(State.activeFormat, lid, 'maskBlur', value);
        return;
      }
      if (State.activeFormat && Formats.isVisualExclusive && Formats.isVisualExclusive(State.activeFormat, lid)) {
        Formats.setLayerParam(State.activeFormat, lid, key, value);
      } else {
        if (!layer.params) layer.params = { ...DEFAULTS };
        layer.params[key] = value;
      }
    }

    keys.forEach(key => {
      const range = document.getElementById('slider-' + key);
      const label = document.getElementById('label-' + key);
      if (!range || !label) return;

      const unit = label.dataset.unit || '';
      const min  = +label.dataset.min;
      const max  = +label.dataset.max;
      const isGlobal = globalKeys.includes(key);

      // Snapshot al empezar a arrastrar el slider
      range.addEventListener('mousedown', () => {
        if (State.selectedLayerIds.length && typeof History !== 'undefined') History.push();
      });

      // Slider → label + estado
      range.addEventListener('input', e => {
        const newVal = +e.target.value;
        label.value = newVal + unit;
        if (key === 'scale') _updateScaleLabel(label, newVal);
        if (!State.selectedLayerIds.length) return;

        // ── Tint ──────────────────────────────────────────────
        if (key === 'tint') {
          State.selectedLayerIds.forEach(lid => _writeVisual(lid, 'tintAmount', newVal));
          Canvas.render();
          return;
        }

        State.selectedLayerIds.forEach(lid => {
          const layer = State.layers.find(l => l.id === lid);
          const multi = State.selectedLayerIds.length > 1;

          if (isGlobal) {
            if (!layer) return;
            let applied = newVal;
            if (multi) {
              const neutral  = key === 'opacity' ? 100 : 0;
              const original = State._multiOrigins?.[lid]?.[key] ?? _getLayerGlobal(layer, key);
              applied = key === 'opacity'
                ? Math.round(original * newVal / Math.max(neutral, 1))
                : original + (newVal - neutral);
              applied = Math.max(min, Math.min(max, applied));
            }
            _writeVisual(lid, key, applied);   // global (propaga) o por-formato (exclusivo)
          } else {
            if (!State.activeFormat) return;
            if (key === 'scale') {
              if (multi) {
                const origX = State._multiOrigins?.[lid]?.scaleX ?? Formats.getLayerParams(State.activeFormat, lid).scaleX ?? 100;
                const origY = State._multiOrigins?.[lid]?.scaleY ?? Formats.getLayerParams(State.activeFormat, lid).scaleY ?? 100;
                Formats.setLayerParam(State.activeFormat, lid, 'scaleX', Math.round(origX * newVal / 100));
                Formats.setLayerParam(State.activeFormat, lid, 'scaleY', Math.round(origY * newVal / 100));
              } else {
                const p = Formats.getLayerParams(State.activeFormat, lid);
                const aspect = (p.scaleX ?? 100) / (p.scaleY ?? 100);
                Formats.setLayerParam(State.activeFormat, lid, 'scaleX', newVal);
                Formats.setLayerParam(State.activeFormat, lid, 'scaleY', Math.round(newVal / aspect));
              }
            } else {
              if (multi) {
                const neutral  = 0;
                const original = State._multiOrigins?.[lid]?.[key] ?? Formats.getLayerParams(State.activeFormat, lid)[key] ?? 0;
                let applied = original + (newVal - neutral);
                Formats.setLayerParam(State.activeFormat, lid, key, Math.max(min, Math.min(max, applied)));
              } else {
                Formats.setLayerParam(State.activeFormat, lid, key, newVal);
              }
            }
          }
        });
        Canvas.render();
      });

      // Input texto → slider + estado
      label.addEventListener('focus', () => {
        label.value = label.value.replace(unit, '').trim();
        label.select();
      });

      label.addEventListener('blur', () => {
        let val = parseInt(label.value);
        if (isNaN(val)) val = +range.value;
        val = Math.max(min, Math.min(max, val));
        range.value = val;
        label.value = val + unit;
        if (key === 'scale') _updateScaleLabel(label, val);

        if (!State.selectedLayerIds.length) return;
        if (typeof History !== 'undefined') History.push();

        // ── Tint ──────────────────────────────────────────────
        if (key === 'tint') {
          State.selectedLayerIds.forEach(lid => _writeVisual(lid, 'tintAmount', val));
          Canvas.render();
          return;
        }
        State.selectedLayerIds.forEach(lid => {
          const layer = State.layers.find(l => l.id === lid);
          if (isGlobal) {
            if (!layer) return;
            _writeVisual(lid, key, val);
          } else {
            if (!State.activeFormat) return;
            if (key === 'scale') {
              const p = Formats.getLayerParams(State.activeFormat, lid);
              const aspect = (p.scaleX ?? 100) / (p.scaleY ?? 100);
              Formats.setLayerParam(State.activeFormat, lid, 'scaleX', val);
              Formats.setLayerParam(State.activeFormat, lid, 'scaleY', Math.round(val / aspect));
            } else {
              Formats.setLayerParam(State.activeFormat, lid, key, val);
            }
          }
        });
        Canvas.render();
      });

      label.addEventListener('keydown', e => {
        if (e.key === 'Enter') label.blur();
      });
    });
    // ── Color picker tint ────────────────────────────────────
    const tintSwatch = document.getElementById('tint-color-swatch');
    const tintPicker = document.getElementById('tint-color-picker');
    if (tintSwatch && tintPicker) {
      tintSwatch.addEventListener('click', () => {
        if (State.selectedLayerIds.length && typeof History !== 'undefined') History.push();
        tintPicker.click();
      });
      tintPicker.addEventListener('input', e => {
        const color = e.target.value;
        tintSwatch.style.background = color;
        State.selectedLayerIds.forEach(lid => _writeVisual(lid, 'tintColor', color));
        Canvas.render();
      });
    }
  }

  function _bindOkButton() {
    document.getElementById('btn-ok')?.addEventListener('click', () => {
      if (State.activeFormat) Formats.toggleOk(State.activeFormat);
    });
  }



  // ── MODAL DE CONFIRMACIÓN ────────────────────────────────

  function showConfirm(message) {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-overlay');
      const msg     = document.getElementById('confirm-message');
      const btnOk   = document.getElementById('confirm-ok');
      const btnCancel = document.getElementById('confirm-cancel');

      msg.textContent   = message;
      overlay.style.display = 'flex';

      const cleanup = () => {
        overlay.style.display = 'none';
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
      };

      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);

      // ESC cancela
      const onKey = e => {
        if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Enter')  { cleanup(); resolve(true);  document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
    });
  }

  function _updateScaleLabel(label, val) {
    if (!label) return;
    if (val > 125) {
      label.style.color      = '#ff4444';
      label.style.fontWeight = '700';
    } else if (val > 100) {
      label.style.color      = '#ff9900';
      label.style.fontWeight = '700';
    } else {
      label.style.color      = '';
      label.style.fontWeight = '';
    }
  }

  return { init, updateSliders, showConfirm, updateScaleLabel: _updateScaleLabel };
})();
