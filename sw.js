/* ============================================
   DompetKu — Service Worker
   Cache-first for static assets,
   network-first for navigations with offline fallback.
   ============================================ */

const CACHE_VERSION = 'domku-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/css/components.css',
  './assets/css/pages.css',
  './assets/css/responsive.css',
  './assets/js/db.js',
  './assets/js/crypto.js',
  './assets/js/utils.js',
  './assets/js/settings.js',
  './assets/js/theme.js',
  './assets/js/auth.js',
  './assets/js/toast.js',
  './assets/js/modal.js',
  './assets/js/charts.js',
  './assets/js/router.js',
  './assets/js/export.js',
  './assets/js/import.js',
  './assets/js/backup.js',
  './assets/js/reminders.js',
  './assets/js/app.js',
  './assets/database/schema.js',
  './assets/database/seed.js',
  './assets/components/navbar.js',
  './assets/components/sidebar.js',
  './assets/components/forms.js',
  './assets/components/transaction-form.js',
  './assets/components/debt-form.js',
  './assets/components/saving-form.js',
  './assets/components/asset-form.js',
  './assets/components/budget-form.js',
  './assets/pages/dashboard.js',
  './assets/pages/transactions.js',
  './assets/pages/debts.js',
  './assets/pages/receivables.js',
  './assets/pages/savings.js',
  './assets/pages/assets.js',
  './assets/pages/budgets.js',
  './assets/pages/reports.js',
  './assets/pages/calendar.js',
  './assets/pages/search.js',
  './assets/pages/settings-page.js',
  './assets/icons/favicon.png',
  './assets/icons/favicon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/images/logo-square.png',
  './assets/images/logo-full.png',
  './assets/images/og-image.png'
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fallback to cache or offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});

// Listen for messages from client (e.g., manual skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
