/* Tela "Minha vida": objetivos divididos por área, com passos concretos. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  function formulario(store, objetivo) {
    var novo = !objetivo;
    var valores = objetivo || { titulo: '', area: 'vida', prazo: '', nota: '', passos: [] };

    ui.abrirFormulario({
      titulo: novo ? 'Novo objetivo' : 'Editar objetivo',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Objetivo', tipo: 'texto', obrigatorio: true, dica: 'Ex.: ir bem na prova de biologia' },
        { nome: 'area', rotulo: 'Área da vida', tipo: 'selecao', opcoes: Object.keys(store.AREAS_OBJETIVO).map(function (k) {
          return { valor: k, rotulo: store.AREAS_OBJETIVO[k].nome };
        }) },
        { nome: 'prazo', rotulo: 'Prazo', tipo: 'data', ajuda: 'Opcional — objetivo sem prazo também vale' },
        { nome: 'passos', rotulo: 'Passos', tipo: 'lista', ajuda: 'Quebre o objetivo em ações pequenas' },
        { nome: 'nota', rotulo: 'Anotação', tipo: 'texto-longo' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.objetivos = s.objetivos.filter(function (o) { return o.id !== objetivo.id; }); });
        ui.aviso('Objetivo removido');
        App.render();
      },
      aoSalvar: function (v) {
        var dados = { titulo: v.titulo, area: v.area, prazo: v.prazo || null, nota: v.nota, passos: v.passos };
        store.commit(function (s) {
          if (novo) s.objetivos.push(Object.assign({ id: u.id(), arquivado: false }, dados));
          else Object.assign(objetivo, dados);
        });
        ui.aviso(novo ? 'Objetivo criado' : 'Objetivo atualizado');
        App.render();
      }
    });
  }

  /* Um passo pode virar tarefa com data — é o que faz o objetivo andar. */
  function agendarPasso(store, objetivo, passo) {
    ui.abrirFormulario({
      titulo: 'Agendar passo',
      valores: { data: u.hoje(), estimativa: 40, prioridade: 3 },
      campos: [
        { nome: 'data', rotulo: 'Fazer em', tipo: 'data', obrigatorio: true },
        { nome: 'estimativa', rotulo: 'Tempo estimado (min)', tipo: 'numero', min: 5, passo: 5, junto: true },
        { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'opcoes', opcoes: [
          { valor: 2, rotulo: '★★ normal' }, { valor: 3, rotulo: '★★★ importante' }
        ] }
      ],
      aoSalvar: function (v) {
        store.commit(function (s) {
          s.tarefas.push({
            id: u.id(), titulo: passo.titulo, data: v.data, feita: false,
            prioridade: Number(v.prioridade) || 3, estimativa: Number(v.estimativa) || 40,
            area: objetivo.area === 'estudos' ? 'estudo' : 'pessoal',
            objetivoId: objetivo.id, criadaEm: u.hoje()
          });
        });
        ui.aviso('Passo virou tarefa para ' + u.dataRelativa(v.data));
        App.render();
      }
    });
  }

  function cartao(store, o) {
    var feitos = o.passos.filter(function (p) { return p.feito; }).length;
    var faltam = o.prazo ? u.diasEntre(u.hoje(), o.prazo) : null;

    return el('div.cartao', {}, [
      el('div', { style: 'display:flex;gap:10px;align-items:flex-start' }, [
        el('div', { style: 'flex:1;cursor:pointer', onclick: function () { formulario(store, o); } }, [
          el('div.item__titulo', { text: o.titulo }),
          el('div.item__meta', {}, [
            o.passos.length ? el('span', { text: feitos + ' de ' + o.passos.length + ' passos' }) : el('span', { text: 'sem passos ainda' }),
            o.prazo ? ui.etiqueta(faltam < 0 ? 'prazo passou' : (faltam === 0 ? 'é hoje' : 'faltam ' + u.plural(faltam, 'dia', 'dias')),
              faltam !== null && faltam <= 3 ? 'rosa' : 'azul') : null
          ].filter(Boolean))
        ]),
        el('span.fraco', { text: '›' })
      ]),
      o.passos.length ? ui.barraProgresso(u.pct(feitos, o.passos.length)) : null,
      o.nota ? el('div.item__nota', { text: o.nota }) : null,
      o.passos.length ? el('div.lista-check', {}, o.passos.map(function (p) {
        return el('div', { style: 'display:flex;align-items:center;gap:6px' }, [
          el('div', { style: 'flex:1' }, [
            ui.linhaCheck(p.titulo, p.feito, function () {
              store.commit(function () { p.feito = !p.feito; });
              App.render();
            })
          ]),
          !p.feito ? el('button.link', {
            type: 'button', text: 'agendar',
            onclick: function () { agendarPasso(store, o, p); }
          }) : null
        ]);
      })) : null
    ].filter(Boolean));
  }

  App.views = App.views || {};
  App.views.objetivos = {
    titulo: 'Minha vida',
    render: function (store) {
      var ativos = store.estado.objetivos.filter(function (o) { return !o.arquivado; });

      var secoes = Object.keys(store.AREAS_OBJETIVO).map(function (chave) {
        var daArea = ativos.filter(function (o) { return o.area === chave; });
        if (!daArea.length) return null;
        var a = store.AREAS_OBJETIVO[chave];
        return el('div', {}, [
          ui.tituloSecao(a.nome, u.plural(daArea.length, 'objetivo', 'objetivos')),
          el('div.pilha', {}, daArea.map(function (o) { return cartao(store, o); }))
        ]);
      }).filter(Boolean);

      return el('div', {}, [
        el('p.mini.sub', { style: 'margin:8px 2px 14px',
          text: 'Objetivos são direções, não cobranças. Quebre cada um em passos pequenos e agende só o próximo.' }),
        el('button.btn.btn--principal.btn--largo', {
          type: 'button', text: '+ Novo objetivo',
          onclick: function () { formulario(store, null); }
        })
      ].concat(secoes.length ? secoes : [
        el('div', { style: 'margin-top:20px' }, [
          ui.vazio('Nenhum objetivo ainda', 'Comece por um só — o que mais importa agora.')
        ])
      ]));
    }
  };
})();
