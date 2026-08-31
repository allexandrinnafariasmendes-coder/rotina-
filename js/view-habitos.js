/* Tela "Hábitos": rituais contextualizados, não uma lista solta de caixinhas. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var PERIODOS = [
    { valor: 'manha', rotulo: 'Manhã' },
    { valor: 'tarde', rotulo: 'Tarde' },
    { valor: 'noite', rotulo: 'Noite' },
    { valor: 'qualquer', rotulo: 'Qualquer hora' }
  ];

  function formulario(store, ritual) {
    var novo = !ritual;
    ui.abrirFormulario({
      titulo: novo ? 'Novo ritual' : 'Editar ritual',
      valores: ritual || { titulo: '', periodo: 'noite', hora: '', dias: [0, 1, 2, 3, 4, 5, 6], itens: [] },
      campos: [
        { nome: 'titulo', rotulo: 'Ritual', tipo: 'texto', obrigatorio: true, dica: 'Ex.: rotina noturna' },
        { nome: 'periodo', rotulo: 'Quando', tipo: 'opcoes', opcoes: PERIODOS },
        { nome: 'hora', rotulo: 'Horário aproximado', tipo: 'hora', ajuda: 'Opcional' },
        { nome: 'dias', rotulo: 'Dias', tipo: 'dias', obrigatorio: true },
        { nome: 'itens', rotulo: 'Passos do ritual', tipo: 'lista', ajuda: 'Ex.: guardar o celular, higiene, skincare' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.rituais = s.rituais.filter(function (r) { return r.id !== ritual.id; }); });
        ui.aviso('Ritual removido');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.rituais.push(Object.assign({ id: u.id() }, v));
          else Object.assign(ritual, v);
        });
        App.render();
      }
    });
  }

  /* Itens avulsos, válidos só para um dia. */
  function extrasDoDia(store, iso, ritualId) {
    var reg = store.estado.registro[iso] || {};
    return (reg.extras || []).filter(function (x) { return x.ritualId === ritualId; });
  }

  function adicionarExtra(store, ritual) {
    ui.abrirFormulario({
      titulo: 'Só para hoje',
      valores: { titulo: '' },
      campos: [{ nome: 'titulo', rotulo: 'O que entra hoje neste ritual?', tipo: 'texto', obrigatorio: true }],
      rotuloSalvar: 'Adicionar',
      aoSalvar: function (v) {
        store.commit(function () {
          var reg = store.dia(u.hoje());
          reg.extras = reg.extras || [];
          reg.extras.push({ id: u.id(), titulo: v.titulo, ritualId: ritual.id });
        });
        App.render();
      }
    });
  }

  /* "Quer manter esse hábito amanhã?" — pergunta sobre o que foi feito ontem. */
  function perguntaDeOntem(store, ritual) {
    var ontem = u.somarDias(u.hoje(), -1);
    var feitosOntem = extrasDoDia(store, ontem, ritual.id).filter(function (x) {
      return store.feito('itens', x.id, ontem);
    });
    if (!feitosOntem.length) return null;

    return el('div.cartao.cartao--destaque', { style: 'margin-top:10px' }, feitosOntem.map(function (x) {
      return el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
        el('div.mini', { style: 'flex:1', text: 'Ontem você fez “' + x.titulo + '”. Quer manter no ritual?' }),
        el('button.btn.btn--p.btn--principal', {
          type: 'button', text: 'Manter',
          onclick: function () {
            store.commit(function (s) {
              ritual.itens.push({ id: u.id(), titulo: x.titulo });
              var reg = s.registro[ontem];
              if (reg) reg.extras = (reg.extras || []).filter(function (y) { return y.id !== x.id; });
            });
            ui.aviso('Adicionado ao ritual');
            App.render();
          }
        }),
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: 'Não',
          onclick: function () {
            store.commit(function (s) {
              var reg = s.registro[ontem];
              if (reg) reg.extras = (reg.extras || []).filter(function (y) { return y.id !== x.id; });
            });
            App.render();
          }
        })
      ]);
    }));
  }

  function cartao(store, r) {
    var hoje = u.hoje();
    var extras = extrasDoDia(store, hoje, r.id);
    var todos = r.itens.concat(extras);
    var feitos = todos.filter(function (i) { return store.feito('itens', i.id, hoje); }).length;
    var dias = u.ultimosDias(7);

    return el('div.cartao', {}, [
      el('div', { style: 'display:flex;align-items:flex-start;gap:10px' }, [
        el('div', { style: 'flex:1;cursor:pointer', onclick: function () { formulario(store, r); } }, [
          el('div.item__titulo', { text: r.titulo }),
          el('div.item__meta', {}, [
            el('span', { text: (PERIODOS.filter(function (p) { return p.valor === r.periodo; })[0] || PERIODOS[3]).rotulo }),
            r.hora ? el('span', { text: r.hora }) : null,
            el('span', { text: feitos + '/' + todos.length + ' hoje' })
          ].filter(Boolean))
        ]),
        todos.length && feitos === todos.length ? ui.etiqueta('feito hoje', 'salvia') : null
      ]),

      el('div.lista-check', {}, todos.map(function (i) {
        return ui.linhaCheck(i.titulo, store.feito('itens', i.id, hoje), function () {
          store.alternar('itens', i.id, hoje);
          App.render();
        });
      })),

      el('div.linha-btn', { style: 'margin-top:6px' }, [
        el('button.link', { type: 'button', text: '+ só para hoje', onclick: function () { adicionarExtra(store, r); } })
      ]),

      /* Uma semana em miniatura: o ritual foi cumprido por inteiro? */
      el('div.quadro', {}, dias.map(function (d) {
        var completo = r.itens.length > 0 && r.itens.every(function (i) { return store.feito('itens', i.id, d); });
        return el('div.quadro__dia', {}, [
          el('div.quadro__cel' + (completo ? '.feita' : '') + (d === hoje ? '.hoje' : ''), {
            title: u.dataCurta(d) + (completo ? ' · completo' : '')
          }),
          el('span', { text: u.DIAS_MINI[u.diaDaSemana(d)] })
        ]);
      })),

      perguntaDeOntem(store, r)
    ].filter(Boolean));
  }

  App.views = App.views || {};
  App.views.habitos = {
    titulo: 'Hábitos',
    render: function (store) {
      var rituais = store.estado.rituais;
      return el('div', {}, [
        el('p.mini.sub', { style: 'margin:8px 2px 14px',
          text: 'Hábitos funcionam melhor em conjunto, dentro de um momento do dia. Aqui eles vivem como rituais.' }),
        el('button.btn.btn--principal.btn--largo', {
          type: 'button', text: '+ Novo ritual',
          onclick: function () { formulario(store, null); }
        }),
        ui.tituloSecao('Meus rituais', u.plural(rituais.length, 'ritual', 'rituais')),
        rituais.length
          ? el('div.pilha', {}, rituais.map(function (r) { return cartao(store, r); }))
          : ui.vazio('Nenhum ritual ainda', 'Comece pela rotina da noite — costuma ser a que mais muda o dia seguinte.')
      ]);
    }
  };
})();
