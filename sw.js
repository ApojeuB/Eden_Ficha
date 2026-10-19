// Cache do "casco" do app para abrir rápido e funcionar sem sinal (os dados vêm do Supabase).
const V = 'eden-v1';
const CORE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/sheet.js', 'js/rules.js', 'js/ui.js', 'js/store.js', 'js/store-local.js', 'js/store-supabase.js', 'js/config.js', 'js/data/cascas.js', 'manifest.webmanifest', 'icons/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return; // Supabase/CDN: direto da rede
  // rede primeiro (sempre a versão nova quando online), cache como reserva offline
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('./'))));
});
