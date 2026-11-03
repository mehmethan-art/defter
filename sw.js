/* Halıcızade Defter: ekran dosyalarını saklar, internet yavaşken de açılsın diye.
   Kayıtlar (Google tarafı) hiç saklanmaz; her zaman canlı çekilir. */
const SURUM = 'defter-v17';
const DOSYALAR = ['./', 'index.html', 'servis.html', 'kunye.html', 'izin.html', 'satis.html', 'yikama.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png'];

self.addEventListener('install', e => {
  /* cache:'reload' → tarayıcının 10 dakikalık önbelleğindeki eski kopyayı değil, sunucudaki güncel dosyayı al */
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    /* Önce yeni sürüm (her açılışta sunucuya "değişti mi?" diye sorulur, değişmediyse hızlıca aynısı gelir);
       3 sn içinde gelmezse ya da internet yoksa saklanan */
    e.respondWith(new Promise(coz => {
      let bitti = false;
      const bitir = x => { if (x && !bitti) { bitti = true; coz(x); } };
      const sakli = () => caches.match(r, { ignoreSearch: true });
      const zaman = setTimeout(() => sakli().then(bitir), 3000);
      fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(y => {
        if (y.redirected) y = new Response(y.body, { status: y.status, statusText: y.statusText, headers: y.headers });   // tarayıcı yönlendirilmiş yanıtı sayfa olarak kabul etmez
        if (y.ok) { const kopya = y.clone(); caches.open(SURUM).then(c => c.put(r.url.split('?')[0], kopya)); }
        clearTimeout(zaman); bitir(y);
      }).catch(() => sakli().then(x => { clearTimeout(zaman); bitir(x || Response.error()); }));
    }));
    return;
  }
  e.respondWith(caches.match(r).then(x => x || fetch(r)));
});
