/* Tela "Autocuidado": cuidados recorrentes com a próxima data calculada. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var CATEGORIAS = {
    pele: { nome: 'Pele' },
    cabelo: { nome: 'Cabelo' },
    unhas: { nome: 'Unhas' },
    corpo: { nome: 'Corpo e saúde' },
    organizacao: { nome: 'Organização' }
  };

  var RITMOS = [
    { valor: 1, rotulo: 'Todo dia' },
    { valor: 3, rotulo: 'A cada 3 dias' },
    { valor: 7, rotulo: 'Semanal' },
    { valor: 15, rotulo: 'Quinzenal' },
    { valor: 30, rotulo: 'Mensal' }
  ];

  function formulario(store, cuidado) {
    var novo = !cuidado;
    ui.abrirFormulario({
      titulo: novo ? 'Novo cuidado' : 'Editar cuidado',
      valores: cuidado || { titulo: '', categoria: 'pele', intervalo: 7 },
      campos: [
        { nome: 'titulo', rotulo: 'Cuidado', tipo: 'texto', obrigatorio: true, dica: 'Ex.: hidratação capilar' },
        { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', opcoes: Object.keys(CATEGORIAS).map(function (k) {
          return { valor: k, rotulo: CATEGORIAS[k].nome };
        }) },
        { nome: 'intervalo', rotulo: 'Com que frequência', tipo: 'opcoes', opcoes: RITMOS },
        { nome: 'personalizado', rotulo: 'Ou a cada quantos dias', tipo: 'numero', min: 0, max: 365,
          ajuda: 'Preencha só se quiser um ritmo diferente dos acima' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.cuidados = s.cuidados.filter(function (c) { return c.id !== cuidado.id; }); });
        ui.aviso('Cuidado removido');
        App.render();
      },
      aoSalvar: function (v) {
        var intervalo = Number(v.personalizado) > 0 ? Number(v.personalizado) : Number(v.intervalo) || 7;
        store.commit(function (s) {
          if (novo) s.cuidados.push({ id: u.id(), titulo: v.titulo, categoria: v.categoria, intervalo: intervalo, ultimaVez: null });
          else Object.assign(cuidado, { titulo: v.titulo, categoria: v.categoria, intervalo: intervalo });
        });
        App.render();
      }
    });
  }

  function textoRitmo(dias) {
    var achou = RITMOS.filter(function (r) { return r.valor === dias; })[0];
    return achou ? achou.rotulo.toLowerCase() : 'a cada ' + u.plural(dias, 'dia', 'dias');
  }

  function linha(store, c) {
    var hoje = u.hoje();
    var proxima = store.proximaVez(c);
    var feitoHoje = store.feito('cuidados', c.id, hoje);
    var atrasado = !feitoHoje && proxima < hoje;
    var cat = CATEGORIAS[c.categoria] || CATEGORIAS.pele;

    return ui.itemLinha({
      titulo: c.titulo,
      feito: feitoHoje,
      meta: [
        ui.etiqueta(cat.nome),
        el('span', { text: textoRitmo(c.intervalo) }),
        feitoHoje ? ui.etiqueta('feito hoje', 'salvia')
          : (atrasado ? ui.etiqueta('desde ' + u.dataCurta(proxima), 'rosa')
            : ui.etiqueta('próxima: ' + u.dataRelativa(proxima), 'azul'))
      ],
      aoMarcar: function () {
        store.commit(function () {
          var reg = store.dia(hoje);
          if (reg.cuidados[c.id]) { delete reg.cuidados[c.id]; c.ultimaVez = null; }
          else { reg.cuidados[c.id] = true; c.ultimaVez = hoje; }
        });
        App.render();
      },
      aoAbrir: function () { formulario(store, c); }
    });
  }

  App.views = App.views || {};
  App.views.autocuidado = {
    titulo: 'Autocuidado',
    render: function (store) {
      var hoje = u.hoje();
      var cuidados = store.estado.cuidados;
      var paraHoje = cuidados.filter(function (c) { return store.proximaVez(c) <= hoje || store.feito('cuidados', c.id, hoje); });
      var depois = cuidados.filter(function (c) { return paraHoje.indexOf(c) === -1; })
        .sort(function (a, b) { return store.proximaVez(a) < store.proximaVez(b) ? -1 : 1; });

      return el('div', {}, [
        el('p.mini.sub', { style: 'margin:8px 2px 14px',
          text: 'Cuidar de você é rotina, não recompensa. O app calcula sozinho quando cada cuidado volta.' }),
        el('button.btn.btn--principal.btn--largo', {
          type: 'button', text: '+ Novo cuidado',
          onclick: function () { formulario(store, null); }
        }),

        ui.tituloSecao('Para hoje', u.plural(paraHoje.length, 'item', 'itens')),
        paraHoje.length
          ? el('div', {}, paraHoje.map(function (c) { return linha(store, c); }))
          : ui.vazio('Nada pendente hoje', 'Seus cuidados estão em dia.'),

        depois.length ? ui.tituloSecao('Em breve') : null,
        depois.length ? el('div', {}, depois.map(function (c) { return linha(store, c); })) : null
      ].filter(Boolean));
    }
  };
})();
