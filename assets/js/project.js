// ============================================================
// PROJECT.JS — Guardar y abrir proyecto (JSON)
// ============================================================

const Project = (() => {

  function save() {
    const data = {
      version: 1,
      projectName: State.projectName,
      activeModality: State.activeModality,
      layers: State.layers,
      formats: State.formats,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: State.projectName + '.adaptator.json' });
    a.click();
    URL.revokeObjectURL(url);
    State.dirty = false;
  }

  function open() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json,.adaptator.json';
    input.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      const data = JSON.parse(await file.text());
      _load(data);
    });
    input.click();
  }

  function _load(data) {
    State.projectName    = data.projectName ?? 'Sin título';
    State.activeModality = data.activeModality ?? 'DISPOSITIVOS';
    State.layers         = data.layers  ?? [];
    State.formats        = data.formats ?? [];
    State.dirty          = false;
    Layers.renderPanel();
    Canvas.render();
  }

  return { save, open };
})();
