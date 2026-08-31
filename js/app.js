/* Arranque: rotas por hash, renderização e tema. */
(function () {
  'use strict';

  var App = window.App;
  var store = App.store;

  var ROTAS = ['hoje', 'agenda', 'tarefas', 'estudos', 'mais', 'objetivos', 'habitos',
               'autocuidado', 'espiritual', 'semana', 'assistente', 'ajustes'];
  var ABAS = ['hoje', 'agenda', 'tarefas', 'estudos', 'assistente', 'mais'];

  var telaEl, tituloEl, abasEl;
  var rotaAnterior = null;

  /* "#/assistente?modo=reorganizar&dia=2026-08-30" */
  function lerRota() {
    var bruto = (location.hash || '').replace(/^#\/?/, '');
    var partes = bruto.split('?');
    var nome = partes[0] || 'hoje';
    var params = {};
    (partes[1] || '').split('&').forEach(function (par) {
      if (!par) return;
      var kv = par.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    return { nome: ROTAS.indexOf(nome) !== -1 ? nome : 'hoje', params: params };
  }

  /* Ícone de 180px em PNG, exigido pelo iPhone para "Adicionar à Tela de Início".
     Vai embutido para funcionar mesmo quando o app roda como arquivo único. */
  var ICONE_180 = 'data:image/png;base64,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';

  /* Faz o app se anunciar como aplicativo: em tela cheia, com nome e ícone. */
  function anunciarComoApp() {
    function marca(seletor, criar) {
      if (document.head.querySelector(seletor)) return;
      document.head.appendChild(criar());
    }
    function meta(nome, conteudo) {
      return function () {
        var m = document.createElement('meta');
        m.setAttribute('name', nome);
        m.setAttribute('content', conteudo);
        return m;
      };
    }

    marca('meta[name="apple-mobile-web-app-capable"]', meta('apple-mobile-web-app-capable', 'yes'));
    marca('meta[name="mobile-web-app-capable"]', meta('mobile-web-app-capable', 'yes'));
    marca('meta[name="apple-mobile-web-app-status-bar-style"]', meta('apple-mobile-web-app-status-bar-style', 'default'));
    marca('meta[name="apple-mobile-web-app-title"]', meta('apple-mobile-web-app-title', 'Minha Rotina'));
    marca('meta[name="theme-color"]', meta('theme-color', '#FAF7F0'));
    marca('link[rel="apple-touch-icon"]', function () {
      var l = document.createElement('link');
      l.setAttribute('rel', 'apple-touch-icon');
      l.setAttribute('href', ICONE_180);
      return l;
    });
  }

  function temaEscuro() {
    var t = store.estado.ajustes.tema || 'auto';
    if (t === 'escuro') return true;
    if (t === 'claro') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* O acento da interface é a cor litúrgica do dia. */
  function aplicarTema() {
    var raiz = document.documentElement;
    raiz.setAttribute('data-theme', store.estado.ajustes.tema || 'auto');
    raiz.setAttribute('data-estilo', store.estado.ajustes.estilo || 'missal');

    var p = App.motor.paletaLiturgica(App.util.hoje(), temaEscuro());
    raiz.style.setProperty('--sazonal', p.cores[0]);
    raiz.style.setProperty('--sazonal-suave', p.cores[1]);
    raiz.style.setProperty('--sazonal-forte', p.cores[2]);
    raiz.setAttribute('data-tempo', p.tempo);

    var selo = document.getElementById('tempoLiturgico');
    if (selo) selo.textContent = p.tempo;
  }

  function render() {
    var rota = lerRota();
    var view = App.views[rota.nome];

    if (rotaAnterior && rotaAnterior !== rota.nome) {
      var anterior = App.views[rotaAnterior];
      if (anterior && anterior.aoSair) anterior.aoSair();
    }
    if (rotaAnterior !== rota.nome && view.aoEntrar) view.aoEntrar(rota.params, store);
    rotaAnterior = rota.nome;

    tituloEl.textContent = view.titulo;
    document.title = view.titulo + ' · Minha Rotina';

    telaEl.innerHTML = '';
    telaEl.appendChild(view.render(store));

    Array.prototype.forEach.call(abasEl.querySelectorAll('.aba'), function (a) {
      var ativo = a.dataset.rota === rota.nome
        || (a.dataset.rota === 'mais' && ABAS.indexOf(rota.nome) === -1);
      a.classList.toggle('ativa', ativo);
      if (ativo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

  }

  function iniciar() {
    telaEl = document.getElementById('tela');
    tituloEl = document.getElementById('tituloTela');
    abasEl = document.getElementById('abas');

    store.iniciar();
    App.ui.iniciar();
    anunciarComoApp();
    aplicarTema();

    document.getElementById('btnTema').addEventListener('click', function () {
      var ordem = ['auto', 'claro', 'escuro'];
      var proximo = ordem[(ordem.indexOf(store.estado.ajustes.tema || 'auto') + 1) % 3];
      store.commit(function (s) { s.ajustes.tema = proximo; });
      aplicarTema();
      App.ui.aviso('Tema: ' + proximo);
    });

    if (window.matchMedia) {
      var escura = window.matchMedia('(prefers-color-scheme: dark)');
      var aoTrocar = function () { aplicarTema(); };
      if (escura.addEventListener) escura.addEventListener('change', aoTrocar);
      else if (escura.addListener) escura.addListener(aoTrocar);
    }

    window.addEventListener('hashchange', function () {
      render();
      window.scrollTo(0, 0);
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) render();
    });

    if (!location.hash) location.replace('#/hoje');
    render();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* segue sem cache */ });
    }
  }

  App.render = render;
  App.aplicarTema = aplicarTema;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
