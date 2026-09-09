/* Cache do app.

   Estratégia: rede primeiro, cache depois. Com internet, o app sempre abre
   na versão mais recente; sem internet, abre a última que foi guardada.
   O contrário — cache primeiro — deixava o celular preso numa versão
   antiga até o cache ser trocado. */
var CACHE = 'minha-rotina-v11';
var ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/icon.svg',
  './assets/icon-180.png',
  './assets/padrao-limonada.svg',
  './assets/icon-maskable.svg',
  './js/util.js',
  './js/rotina-base.js',
  './js/store.js',
  './js/motor.js',
  './js/ui.js',
  './js/view-hoje.js',
  './js/view-agenda.js',
  './js/view-tarefas.js',
  './js/view-estudos.js',
  './js/view-objetivos.js',
  './js/view-habitos.js',
  './js/view-autocuidado.js',
  './js/view-espiritual.js',
  './js/view-semana.js',
  './js/view-assistente.js',
  './js/view-mais.js',
  './js/view-ajustes.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chaves) {
    return Promise.all(chaves.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (erro) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (resp) {
      /* guarda a versão nova para quando faltar internet */
      if (resp && resp.status === 200 && resp.type === 'basic') {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});
