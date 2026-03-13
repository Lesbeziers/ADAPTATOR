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
    if (!State.activeFormat || !State.selectedLayerId) return;
    const p = Formats.getLayerParams(State.activeFormat, State.selectedLayerId);
    document.getElementById('slider-scale').value     = p.scale;
    document.getElementById('slider-rotation').value = p.rotation;
    document.getElementById('slider-opacity').value  = p.opacity;
    document.getElementById('slider-blur').value     = p.blur;
    _updateSliderLabels(p);
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
    ['scale', 'rotation', 'opacity', 'blur'].forEach(key => {
      document.getElementById('slider-' + key)?.addEventListener('input', e => {
        if (!State.activeFormat || !State.selectedLayerId) return;
        Formats.setLayerParam(State.activeFormat, State.selectedLayerId, key, +e.target.value);
        document.getElementById('label-' + key).textContent =
          e.target.value + (key === 'blur' ? 'px' : '%');
      });
    });
  }

  function _bindOkButton() {
    document.getElementById('btn-ok')?.addEventListener('click', () => {
      if (State.activeFormat) Formats.toggleOk(State.activeFormat);
    });
  }

  function _updateSliderLabels(p) {
    document.getElementById('label-scale').textContent    = p.scale + '%';
    document.getElementById('label-rotation').textContent = p.rotation + '%';
    document.getElementById('label-opacity').textContent  = p.opacity + '%';
    document.getElementById('label-blur').textContent     = p.blur + 'px';
  }

  return { init, updateSliders };
})();
