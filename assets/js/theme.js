/* Theme toggle: light is the default, dark is opt-in and saved in localStorage "bt-theme". */
(function () {
  var en = document.documentElement.lang === 'en';
  var L = en ? { dark: 'Switch to dark mode', light: 'Switch to light mode' } : { dark: 'Cambiar a modo oscuro', light: 'Cambiar a modo claro' };
  function isDark() { return document.documentElement.dataset.theme === 'dark'; }
  function sync(btn) {
    var d = isDark();
    btn.setAttribute('aria-pressed', String(d));
    btn.setAttribute('aria-label', d ? L.light : L.dark);
    btn.title = d ? L.light : L.dark;
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', d ? '#1c140f' : '#f3ece1');
  }
  function init() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    sync(btn);
    btn.addEventListener('click', function () {
      var d = !isDark();
      if (d) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
      try { localStorage.setItem('bt-theme', d ? 'dark' : 'light'); } catch (e) {}
      sync(btn);
      window.dispatchEvent(new CustomEvent('bt-theme-change', { detail: { theme: d ? 'dark' : 'light' } }));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
