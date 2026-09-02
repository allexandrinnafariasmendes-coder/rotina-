/* Tela "Minha semana": reflexão, não cobrança. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var refDia = null;

  function chaveSemana(iso) { return u.inicioDaSemana(iso); }

  function formReflexao(store, chave, atual) {
    ui.abrirFormulario({
      titulo: 'Minha semana',
      valores: atual || { meta1: '', meta2: '', meta3: '', funcionou: '', pesou: '', gratidao: '' },
      campos: [
        { nome: 'meta1', rotulo: 'Meta 1 da semana', tipo: 'texto' },
        { nome: 'meta2', rotulo: 'Meta 2 da semana', tipo: 'texto' },
        { nome: 'meta3', rotulo: 'Meta 3 da semana', tipo: 'texto' },
        { nome: 'funcionou', rotulo: 'O que funcionou melhor para você?', tipo: 'texto-longo' },
        { nome: 'pesou', rotulo: 'O que pesou demais?', tipo: 'texto-longo' },
        { nome: 'gratidao', rotulo: 'Uma coisa boa desta semana', tipo: 'texto-longo' }
      ],
      aoSalvar: function (v) {
        store.commit(function (s) { s.semanas[chave] = v; });
        ui.aviso('Guardado');
        App.render();
      }
    });
  }

  App.views = App.views || {};
  App.views.semana = {
    titulo: 'Minha semana',
    render: function (store) {
      var motor = App.motor;
      if (!refDia) refDia = u.hoje();
      var r = motor.resumoSemana(refDia);
      var chave = chaveSemana(refDia);
      var reflexao = store.estado.semanas[chave];
      var prioridades = store.estado.ajustes.prioridades || [];
      var temExercicio = r.exercicios > 0 || store.estado.blocos.some(function (b) { return b.area === 'exercicio'; });
      var primeiro = r.dias[0], ultimo = r.dias[6];

      var colunas = el('div.colunas', {}, r.dias.map(function (d) {
        var itens = motor.itensDoDia(d);
        var feitos = itens.filter(function (i) { return i.feito; }).length;
        var p = u.pct(feitos, itens.length);
        return el('div.coluna', {}, [
          el('div.coluna__barra' + (itens.length ? '' : '.coluna__barra--vazia'), {
            style: 'height:' + Math.max(4, p) + '%',
            title: u.dataCurta(d) + ': ' + feitos + '/' + itens.length
          }),
          el('div.coluna__dia', { text: u.DIAS_MINI[u.diaDaSemana(d)] })
        ]);
      }));

      return el('div', {}, [
        el('div.linha-btn', { style: 'margin-top:8px;align-items:center' }, [
          el('button.btn.btn--p.btn--fantasma', {
            type: 'button', text: '‹ anterior',
            onclick: function () { refDia = u.somarDias(refDia, -7); App.render(); }
          }),
          el('span.mini.fraco', { style: 'flex:1;text-align:center',
            text: u.dataCurta(primeiro) + ' – ' + u.dataCurta(ultimo) }),
          el('button.btn.btn--p.btn--fantasma', {
            type: 'button', text: 'próxima ›',
            onclick: function () { refDia = u.somarDias(refDia, 7); App.render(); }
          })
        ]),

        el('div.cartao', { style: 'margin-top:6px' }, [
          el('div.item__titulo', { style: 'font-size:19px', text: 'Como foi sua semana' }),
          el('div.pilha.pilha--junta', { style: 'margin-top:8px' },
            motor.leituraDaSemana(r).map(function (f) { return el('p.mini.sub', { text: f }); }))
        ]),

        ui.tituloSecao('Em números'),
        el('div.numeros', {}, [
          el('div.numero', {}, [
            el('div.numero__valor', { text: u.horasTexto(r.estudoMin) }),
            el('div.numero__rotulo', { text: 'estudos' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: r.mediaSono !== null ? r.mediaSono.toFixed(1).replace('.', ',') + 'h' : '—' }),
            el('div.numero__rotulo', { text: 'média de sono' })
          ]),
          /* sem exercício na rotina, o app não cobra o que ela não escolheu */
          temExercicio ? el('div.numero', {}, [
            el('div.numero__valor', { text: String(r.exercicios) }),
            el('div.numero__rotulo', { text: 'sessões de exercício' })
          ]) : null,
          el('div.numero', {}, [
            el('div.numero__valor', { text: String(r.autocuidado) }),
            el('div.numero__rotulo', { text: 'momentos de autocuidado' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: u.horasTexto(r.descansoMin) }),
            el('div.numero__rotulo', { text: 'descanso' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: r.tarefas.total ? r.tarefas.pct + '%' : '—' }),
            el('div.numero__rotulo', { text: 'das tarefas concluídas' })
          ])
        ]),

        ui.tituloSecao('Dia a dia'),
        el('div.cartao', {}, [colunas]),

        ui.tituloSecao('Metas da semana'),
        el('div.cartao', {}, [
          [1, 2, 3].map(function (n) { return (reflexao || {})['meta' + n]; }).some(Boolean)
            ? el('div.pilha.pilha--junta', {}, [1, 2, 3].map(function (n) {
                var texto = (reflexao || {})['meta' + n];
                return texto ? el('div', { style: 'display:flex;gap:10px;align-items:baseline' }, [
                  el('span.fraco', { style: 'font-family:var(--serif)', text: n + '.' }),
                  el('span', { style: 'font-family:var(--serif);font-size:15px', text: texto })
                ]) : null;
              }).filter(Boolean))
            : el('p.mini.sub', { text: 'Três metas bastam para uma semana inteira.' })
        ]),

        prioridades.length ? ui.tituloSecao('Minhas prioridades') : null,
        prioridades.length ? el('div.cartao', {}, [
          el('div.pilha.pilha--junta', {}, prioridades.map(function (p) {
            return el('div', { style: 'display:flex;gap:10px;align-items:baseline' }, [
              el('span', { style: 'color:var(--sazonal-forte)', text: '·' }),
              el('span', { style: 'font-family:var(--serif);font-size:15px', text: p })
            ]);
          })),
          el('p.mini.fraco', { style: 'margin-top:12px;font-style:italic',
            text: 'Quando o dia apertar, é por aqui que se decide o que fica.' })
        ]) : null,

        ui.tituloSecao('Reflexão'),
        el('div.cartao', {}, [
          reflexao ? el('div.pilha.pilha--junta', {}, [
            reflexao.funcionou ? el('p.mini', {}, [el('strong', { text: 'Funcionou: ' }), reflexao.funcionou]) : null,
            reflexao.pesou ? el('p.mini', {}, [el('strong', { text: 'Pesou: ' }), reflexao.pesou]) : null,
            reflexao.gratidao ? el('p.mini', {}, [el('strong', { text: 'Coisa boa: ' }), reflexao.gratidao]) : null
          ].filter(Boolean)) : el('p.mini.sub', { text: 'Duas ou três linhas bastam. Ninguém vai ler além de você.' }),
          el('button.btn.btn--p.btn--suave', { style: 'margin-top:10px',
            type: 'button', text: reflexao ? 'Editar reflexão' : 'Escrever reflexão',
            onclick: function () { formReflexao(store, chave, reflexao); } })
        ])
      ]);
    }
  };
})();
