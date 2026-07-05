/* ============================================
   DompetKu — router.js
   Hash-based SPA router. Each route maps to a page module
   that exposes a `mount(container, params)` function.
   ============================================ */

(function (global) {
  'use strict';

  const routes = {};
  let currentRoute = null;
  let currentCleanup = null;
  let container = null;

  function register(path, handler) { routes[path] = handler; }

  function parseHash() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [path, queryString] = hash.split('?');
    const params = {};
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path: path || 'dashboard', params };
  }

  async function render() {
    if (!container) return;
    const { path, params } = parseHash();
    const route = routes[path] || routes['not-found'];

    // Run cleanup for previous route
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (e) { console.warn(e); }
      currentCleanup = null;
    }

    Utils.empty(container);
    container.scrollTop = 0;

    // Update active nav
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const target = a.getAttribute('data-nav');
      a.classList.toggle('active', target === path || (path === 'dashboard' && target === 'dashboard'));
    });

    try {
      currentRoute = path;
      const result = await route(container, params);
      if (typeof result === 'function') currentCleanup = result;
    } catch (err) {
      console.error('Route error:', err);
      container.innerHTML = `<div class="page-error"><h2>Gagal memuat halaman</h2><p>${Utils.escapeHtml(err.message)}</p></div>`;
    }
  }

  function start(mountEl) {
    container = mountEl;
    window.addEventListener('hashchange', render);
    if (!location.hash) location.hash = '#/dashboard';
    else render();
  }

  function go(path) {
    if (location.hash === '#/' + path) render();
    else location.hash = '#/' + path;
  }

  function refresh() { render(); }

  global.Router = { register, start, go, refresh, get current() { return currentRoute; } };
})(window);
