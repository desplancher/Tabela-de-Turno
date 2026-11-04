// Service Worker: deixa o app funcionar offline SEM travar em versões antigas.
// Estratégia "rede primeiro": com internet, sempre busca a versão nova (e guarda no cache);
// sem internet, usa o que está no cache.
const CACHE_NAME = 'tabela-turnos-v3';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 1. Instalação: salva os arquivos no cache e ativa a versão nova na hora
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

// 2. Ativação: apaga caches de versões antigas, assume as páginas abertas e,
//    se for uma ATUALIZAÇÃO, recarrega essas páginas para já mostrarem a versão nova.
//    Isso funciona até para quem estava na versão antiga (cache primeiro), porque quem
//    recarrega é o service worker novo, não a página antiga.
//    IMPORTANTE: ao mudar este arquivo, troque o CACHE_NAME (v3 -> v4...) para disparar a recarga.
self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        const oldKeys = (await caches.keys()).filter((k) => k !== CACHE_NAME);
        await Promise.all(oldKeys.map((k) => caches.delete(k)));
        await self.clients.claim();

        // Sem cache antigo = primeira instalação: não precisa recarregar
        if (oldKeys.length === 0) return;
        const windows = await self.clients.matchAll({ type: 'window' });
        windows.forEach((w) => w.navigate(w.url).catch(() => { }));
    })());
});

// 3. Requisições: rede primeiro, cache como reserva (só arquivos do próprio app)
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    e.respondWith(
        // cache: 'no-cache' = sempre confirma com o servidor se o arquivo mudou
        // (o GitHub Pages manda o navegador guardar os arquivos por 10 minutos)
        fetch(req, { cache: 'no-cache' })
            .then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return response;
            })
            .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
});
