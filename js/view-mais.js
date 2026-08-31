/* Tela "Mais": as áreas que não cabem na barra de baixo. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el;

  /* Ícones de traço fino, desenhados aqui mesmo — nada de emoji. */
  var DESENHOS = {
    objetivos: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="3.6"/><path d="M12 1.8v2.2M12 20v2.2M1.8 12H4M20 12h2.2"/>',
    habitos: '<path d="M20 5.2c0 7.4-4 11.6-9.4 11.6A5.4 5.4 0 0 1 5.2 11c0-3.4 3.2-5.8 8-5.8z"/><path d="M4.6 19.6c1.6-4 4.4-7 8.2-9"/>',
    autocuidado: '<path d="M12 3.6l1.9 4.3 4.3 1.9-4.3 1.9L12 16l-1.9-4.3-4.3-1.9 4.3-1.9z"/><path d="M18.4 15.4l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z"/>',
    espiritual: '<path d="M12 3.4v17"/><path d="M6.6 8.6h10.8"/>',
    semana: '<path d="M4.6 19.4V13M9.8 19.4V8.6M15.1 19.4v-5M20.4 19.4V5.2"/>',
    assistente: '<path d="M5 19.2c6.6.6 12-3.4 13.8-11.4a13 13 0 0 0-11.2 5.6C6.2 15.6 5.4 17.4 5 19.2z"/><path d="M6.6 17.6c2-3 4.4-5 7.4-6.4"/>',
    ajustes: '<path d="M4 7.4h16M4 12h16M4 16.6h16"/><circle cx="9.2" cy="7.4" r="2"/><circle cx="15.4" cy="12" r="2"/><circle cx="8" cy="16.6" r="2"/>'
  };

  var ITENS = [
    { rota: 'objetivos', nome: 'Minha vida', desc: 'Objetivos de curto e longo prazo', secao: 'objetivos' },
    { rota: 'habitos', nome: 'Hábitos', desc: 'Rituais da manhã, da noite e do dia' },
    { rota: 'autocuidado', nome: 'Autocuidado', desc: 'Pele, cabelo, unhas e organização', secao: 'autocuidado' },
    { rota: 'espiritual', nome: 'Vida espiritual', desc: 'Oração, intenções e diário', secao: 'espiritual' },
    { rota: 'semana', nome: 'Minha semana', desc: 'Reflexão e evolução, sem cobrança' },
    { rota: 'assistente', nome: 'Assistente', desc: 'Organize meu dia, o que faço agora' },
    { rota: 'ajustes', nome: 'Ajustes', desc: 'Tema, horários, backup' }
  ];

  function icone(rota) {
    var span = el('span.menu-item__icone');
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + DESENHOS[rota] + '</svg>';
    return span;
  }

  App.views = App.views || {};
  App.views.mais = {
    titulo: 'Mais',
    render: function (store) {
      var secoes = store.estado.ajustes.secoes;
      var visiveis = ITENS.filter(function (i) { return !i.secao || secoes[i.secao] !== false; });

      return el('div', {}, [
        el('p.mini.sub', { style: 'margin:8px 2px 14px',
          text: 'Sua vida inteira em um lugar só — cada área no seu ritmo.' }),
        el('div.grade-menu', {}, visiveis.map(function (i) {
          return el('a.menu-item', { href: '#/' + i.rota }, [
            icone(i.rota),
            el('span.menu-item__nome', { text: i.nome }),
            el('span.menu-item__desc', { text: i.desc })
          ]);
        }))
      ]);
    }
  };
})();
