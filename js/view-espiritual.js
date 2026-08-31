/* Tela "Vida espiritual": contemplativa, sem contagem de sequência. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  /* Sugestões para quem está começando — ou para quem trouxe a rotina de
     outro aparelho e ficou sem as práticas. Nada é imposto: você escolhe. */
  var SUGESTOES = [
    { titulo: 'Oração da manhã', momento: 'manha' },
    { titulo: 'Terço', momento: 'qualquer' },
    { titulo: 'Leitura espiritual', momento: 'tarde' },
    { titulo: 'Exame de consciência', momento: 'noite' },
    { titulo: 'Missa', momento: 'qualquer' },
    { titulo: 'Adoração', momento: 'qualquer' },
    { titulo: 'Ângelus', momento: 'qualquer' },
    { titulo: 'Oração da noite', momento: 'noite' }
  ];

  function painelSugestoes(store) {
    var jaTem = {};
    store.estado.espiritual.praticas.forEach(function (p) { jaTem[p.titulo] = true; });

    var disponiveis = SUGESTOES.filter(function (s) { return !jaTem[s.titulo]; });
    if (!disponiveis.length) { ui.aviso('Você já tem todas as sugestões'); return; }

    var escolhidas = disponiveis.slice(0, 4).map(function (s) { return s.titulo; });
    var lista = el('div.lista-check');

    function desenhar() {
      lista.innerHTML = '';
      disponiveis.forEach(function (s) {
        var dentro = escolhidas.indexOf(s.titulo) !== -1;
        lista.appendChild(ui.linhaCheck(s.titulo, dentro, function () {
          var i = escolhidas.indexOf(s.titulo);
          if (i === -1) escolhidas.push(s.titulo); else escolhidas.splice(i, 1);
          desenhar();
        }));
      });
    }
    desenhar();

    ui.abrirPainel('Práticas sugeridas', [
      el('p.mini.sub', { text: 'Marque as que fazem sentido para você. Dá para editar ou remover depois, e acrescentar as suas.' }),
      lista,
      el('div.linha-btn.linha-btn--fim', { style: 'margin-top:14px' }, [
        el('button.btn.btn--fantasma', { type: 'button', text: 'Cancelar', onclick: ui.fechar }),
        el('button.btn.btn--principal', {
          type: 'button', text: 'Adicionar',
          onclick: function () {
            if (!escolhidas.length) { ui.aviso('Escolha ao menos uma'); return; }
            store.commit(function (st) {
              SUGESTOES.forEach(function (s) {
                if (escolhidas.indexOf(s.titulo) === -1) return;
                st.espiritual.praticas.push({ id: u.id(), titulo: s.titulo, momento: s.momento });
              });
            });
            ui.fechar();
            ui.aviso(u.plural(escolhidas.length, 'prática adicionada', 'práticas adicionadas'));
            App.render();
          }
        })
      ])
    ]);
  }

  function formPratica(store, pratica) {
    var novo = !pratica;
    ui.abrirFormulario({
      titulo: novo ? 'Nova prática' : 'Editar prática',
      valores: pratica || { titulo: '', momento: 'manha' },
      campos: [
        { nome: 'titulo', rotulo: 'Prática', tipo: 'texto', obrigatorio: true, dica: 'Ex.: oração da manhã, leitura' },
        { nome: 'momento', rotulo: 'Momento', tipo: 'opcoes', opcoes: [
          { valor: 'manha', rotulo: 'Manhã' }, { valor: 'tarde', rotulo: 'Tarde' },
          { valor: 'noite', rotulo: 'Noite' }, { valor: 'qualquer', rotulo: 'Qualquer hora' }
        ] }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) {
          s.espiritual.praticas = s.espiritual.praticas.filter(function (p) { return p.id !== pratica.id; });
        });
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.espiritual.praticas.push({ id: u.id(), titulo: v.titulo, momento: v.momento });
          else Object.assign(pratica, v);
        });
        App.render();
      }
    });
  }

  function formIntencao(store) {
    ui.abrirFormulario({
      titulo: 'Nova intenção',
      valores: { texto: '' },
      campos: [{ nome: 'texto', rotulo: 'Rezar por', tipo: 'texto-longo', obrigatorio: true,
        dica: 'Uma pessoa, uma situação, um agradecimento…' }],
      aoSalvar: function (v) {
        store.commit(function (s) {
          s.espiritual.intencoes.push({ id: u.id(), texto: v.texto, criadaEm: u.hoje(), atendida: false });
        });
        App.render();
      }
    });
  }

  function formDiario(store, entrada) {
    var novo = !entrada;
    ui.abrirFormulario({
      titulo: novo ? 'Escrever no diário' : 'Editar anotação',
      valores: entrada || { data: u.hoje(), texto: '' },
      campos: [
        { nome: 'data', rotulo: 'Dia', tipo: 'data' },
        { nome: 'texto', rotulo: 'O que ficou de hoje', tipo: 'texto-longo', obrigatorio: true, linhas: 6 }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) {
          s.espiritual.diario = s.espiritual.diario.filter(function (d) { return d.id !== entrada.id; });
        });
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.espiritual.diario.push({ id: u.id(), data: v.data || u.hoje(), texto: v.texto });
          else Object.assign(entrada, { data: v.data, texto: v.texto });
        });
        App.render();
      }
    });
  }

  App.views = App.views || {};
  App.views.espiritual = {
    titulo: 'Vida espiritual',
    render: function (store) {
      var hoje = u.hoje();
      var esp = store.estado.espiritual;
      var lit = App.motor.tempoLiturgico(hoje);
      var abertas = esp.intencoes.filter(function (i) { return !i.atendida; });
      var diario = esp.diario.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; }).slice(0, 8);

      return el('div', {}, [
        el('div.cartao', { style: 'margin-top:12px;border-left:3px solid var(--sazonal)' }, [
          el('div.versalete.fraco', { text: 'Tempo litúrgico' }),
          el('div', { style: 'font-family:var(--serif);font-size:22px;margin-top:6px;color:var(--sazonal-forte)', text: lit.tempo }),
          el('div.mini.sub', { style: 'font-family:var(--serif);font-style:italic;margin-top:2px', text: lit.nota })
        ]),

        ui.tituloSecao('Práticas de hoje'),
        esp.praticas.length ? el('div.cartao', {}, [
          el('div.lista-check', {}, esp.praticas.map(function (p) {
            return el('div', { style: 'display:flex;align-items:center;gap:8px' }, [
              el('div', { style: 'flex:1' }, [
                ui.linhaCheck(p.titulo, store.feito('praticas', p.id, hoje), function () {
                  store.alternar('praticas', p.id, hoje);
                  App.render();
                })
              ]),
              el('button.link', {
                type: 'button', style: 'color:var(--fraco)', text: 'editar',
                'aria-label': 'Editar ' + p.titulo,
                onclick: function () { formPratica(store, p); }
              })
            ]);
          })),
          el('p.mini.fraco', { style: 'margin-top:10px;font-style:italic',
            text: 'Aqui não há sequência nem pontuação. Um dia sem marcar não apaga nada.' })
        ]) : ui.vazio('Nenhuma prática cadastrada',
              'Escolha entre as sugestões abaixo ou escreva a sua.'),
        el('div.linha-btn', { style: 'margin-top:10px' }, [
          el('button.btn.btn--suave.btn--p', {
            type: 'button', text: '+ Prática', onclick: function () { formPratica(store, null); } }),
          el('button.btn.btn--p' + (esp.praticas.length ? '.btn--suave' : '.btn--principal'), {
            type: 'button', text: 'Práticas sugeridas', onclick: function () { painelSugestoes(store); } })
        ]),

        ui.tituloSecao('Intenções', u.plural(abertas.length, 'intenção', 'intenções')),
        abertas.length ? el('div.pilha.pilha--junta', {}, abertas.map(function (i) {
          return el('div.cartao', {}, [
            el('div', { text: i.texto }),
            el('div.linha-btn', { style: 'margin-top:8px' }, [
              el('button.link', {
                type: 'button', text: 'guardar como atendida',
                onclick: function () {
                  store.commit(function () { i.atendida = true; });
                  ui.aviso('Guardada com gratidão');
                  App.render();
                }
              }),
              el('button.link', {
                type: 'button', style: 'color:var(--fraco)', text: 'remover',
                onclick: function () {
                  store.commit(function (s) {
                    s.espiritual.intencoes = s.espiritual.intencoes.filter(function (x) { return x.id !== i.id; });
                  });
                  App.render();
                }
              })
            ])
          ]);
        })) : ui.vazio('Nenhuma intenção agora', 'Você pode escrever uma quando quiser.'),
        el('button.btn.btn--suave.btn--p', { style: 'margin-top:10px',
          type: 'button', text: '+ Intenção', onclick: function () { formIntencao(store); } }),

        ui.tituloSecao('Diário espiritual'),
        el('button.btn.btn--principal.btn--largo', {
          type: 'button', text: 'Escrever hoje', onclick: function () { formDiario(store, null); }
        }),
        diario.length ? el('div.pilha', { style: 'margin-top:12px' }, diario.map(function (d) {
          return el('div.cartao', { style: 'cursor:pointer', onclick: function () { formDiario(store, d); } }, [
            el('div.mini.fraco', { text: u.dataLonga(d.data) }),
            el('p', { style: 'margin-top:4px;white-space:pre-wrap', text: d.texto })
          ]);
        })) : null
      ].filter(Boolean));
    }
  };
})();
