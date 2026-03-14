// ============================================================
// UI.JS — Sliders, toggles, botones, eventos generales
// ============================================================

const UI = (() => {

  function init() {
    _bindSidebarCollapse();
    _bindModeButtons();
    _bindTopBarActions();
    _bindOverlayToggles();
    _bindSliders();
    _bindOkButton();
  }

  function updateSliders() {
    // Múltiple selección → valores neutros; simple → valores reales de la capa
    const multiSelect = State.selectedLayerIds.length > 1;
    const p = (!multiSelect && State.activeFormat && State.selectedLayerId)
      ? Formats.getLayerParams(State.activeFormat, State.selectedLayerId)
      : { scale: 100, rotation: 0, opacity: 100, blur: 0, noise: 0 };

    const sets = [
      { key: 'scale',    val: p.scaleX ?? p.scale ?? 100, unit: '%' },
      { key: 'rotation', val: p.rotation, unit: '°' },
      { key: 'opacity',  val: p.opacity,  unit: '%' },
      { key: 'blur',     val: p.blur,     unit: ''  },
      { key: 'noise',    val: p.noise ?? 0, unit: '' },
    ];

    sets.forEach(({ key, val, unit }) => {
      const range = document.getElementById('slider-' + key);
      const label = document.getElementById('label-' + key);
      if (range) range.value = val;
      if (label) label.value = val + unit;
    });
  }

  // ── PRIVADAS ─────────────────────────────────────────────

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
    });
  }

  function _bindModeButtons() {
    document.querySelectorAll('.btn-mode').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.btn-mode').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        State.view = b.id === 'btn-editor' ? 'editor' : 'all';
        // TODO: cambiar vista
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
    const keys = ['scale', 'rotation', 'opacity', 'blur', 'noise'];

    keys.forEach(key => {
      const range = document.getElementById('slider-' + key);
      const label = document.getElementById('label-' + key);
      if (!range || !label) return;

      const unit = label.dataset.unit || '';
      const min  = +label.dataset.min;
      const max  = +label.dataset.max;

      // Slider → label → canvas (relativo si múltiple selección)
      range.addEventListener('input', e => {
        const newVal = +e.target.value;
        label.value = newVal + unit;
        if (State.activeFormat && State.selectedLayerIds.length) {
          const multi = State.selectedLayerIds.length > 1;
          State.selectedLayerIds.forEach(lid => {
            if (key === 'scale') {
              // Escala: aplica proporcionalmente a scaleX y scaleY
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
            } else if (multi) {
              const neutral  = key === 'opacity' ? 100 : 0;
              const original = State._multiOrigins?.[lid]?.[key] ?? Formats.getLayerParams(State.activeFormat, lid)[key];
              let applied = key === 'opacity'
                ? Math.round(original * newVal / neutral)
                : original + (newVal - neutral);
              applied = Math.max(+range.min, Math.min(+range.max, applied));
              Formats.setLayerParam(State.activeFormat, lid, key, applied);
            } else {
              Formats.setLayerParam(State.activeFormat, lid, key, newVal);
            }
          });
          Canvas.render();
        }
      });

      // Al entrar en el label: quitar unidad para editar
      label.addEventListener('focus', e => {
        label.value = label.value.replace(unit, '').trim();
        label.select();
      });

      // Al salir: validar, clampear y reañadir unidad
      label.addEventListener('blur', e => {
        let val = parseInt(label.value);
        if (isNaN(val)) val = +range.value;
        val = Math.max(min, Math.min(max, val));
        range.value = val;
        label.value = val + unit;
        if (State.activeFormat && State.selectedLayerIds.length) {
          const multi = State.selectedLayerIds.length > 1;
          State.selectedLayerIds.forEach(lid => {
            if (multi) {
              const neutral = (key === 'scale' || key === 'opacity') ? 100 : 0;
              const original = State._multiOrigins?.[lid]?.[key] ?? Formats.getLayerParams(State.activeFormat, lid)[key];
              let applied;
              if (key === 'scale' || key === 'opacity') {
                applied = Math.round(original * (val / neutral));
              } else {
                applied = original + (val - neutral);
              }
              const min = +range.min;
              const max = +range.max;
              applied = Math.max(min, Math.min(max, applied));
              Formats.setLayerParam(State.activeFormat, lid, key, applied);
            } else {
              Formats.setLayerParam(State.activeFormat, lid, key, val);
            }
          });
          Canvas.render();
        }
      });

      // Enter confirma sin necesidad de hacer click fuera
      label.addEventListener('keydown', e => {
        if (e.key === 'Enter') label.blur();
      });
    });
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

  return { init, updateSliders, showConfirm };
})();
