/* Tela "Hoje": a rotina do momento, com o essencial à vista. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var dia = null;

  var PERIODOS = [
    { chave: 'manha', nome: 'Manhã' },
    { chave: 'tarde', nome: 'Tarde' },
    { chave: 'noite', nome: 'Noite' },
    { chave: 'flex', nome: 'Sem horário' }
  ];

  function estrelas(n) { return new Array(n + 1).join('★'); }

  /* ------------------------------------------------- cabeçalho */

  function cabecalho(store, motor) {
    var itens = motor.itensDoDia(dia);
    var tarefas = motor.tarefasDoDia(dia);
    var feitos = itens.filter(function (i) { return i.feito; }).length;
    var total = itens.length;
    var ehHoje = dia === u.hoje();

    var nome = store.estado.ajustes.nome;
    var hora = new Date().getHours();
    var saudacao = hora < 5 ? 'Boa madrugada' : (hora < 12 ? 'Bom dia' : (hora < 18 ? 'Boa tarde' : 'Boa noite'));

    return el('div.hoje-topo', {}, [
      nome && ehHoje ? el('div.mini.fraco', { text: saudacao + ', ' + nome }) : null,
      el('div.hoje-topo__data', { text: u.dataLonga(dia) }),
      el('div.hoje-topo__frase', { text: store.estado.ajustes.lema
        ? store.estado.ajustes.lema
        : '“' + motor.fraseDoDia(dia) + '”' }),
      el('div.hoje-topo__linha', {}, [
        ui.barraProgresso(u.pct(feitos, total)),
        el('span.mini.fraco', { text: total ? feitos + '/' + total : '—' })
      ]),
      el('div.linha-btn', { style: 'margin-top:12px' }, [
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: '‹ ' + u.dataCurta(u.somarDias(dia, -1)),
          onclick: function () { dia = u.somarDias(dia, -1); App.render(); }
        }),
        !ehHoje ? el('button.btn.btn--p.btn--suave', {
          type: 'button', text: 'Hoje',
          onclick: function () { dia = u.hoje(); App.render(); }
        }) : null,
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: u.dataCurta(u.somarDias(dia, 1)) + ' ›',
          onclick: function () { dia = u.somarDias(dia, 1); App.render(); }
        }),
        tarefas.length ? el('span.mini.fraco', { style: 'margin-left:auto;align-self:center',
          text: u.plural(tarefas.length, 'tarefa aberta', 'tarefas abertas') }) : null
      ])
    ].filter(Boolean));
  }

  /* ------------------------------------------------- agora ---- */

  function agora(motor) {
    if (dia !== u.hoje()) return null;
    var r = motor.agoraEDepois(dia);
    if (!r.agora && !r.proximo) return null;

    return el('div.cartao.cartao--destaque', {}, [
      r.agora
        ? el('div', {}, [
            el('div.mini.fraco', { text: 'AGORA' }),
            el('div.item__titulo', { style: 'font-size:17px;margin-top:2px', text: r.agora.titulo }),
            el('div.mini.sub', { text: u.faixa(r.agora.hora, r.agora.duracao) })
          ])
        : el('div', {}, [
            el('div.mini.fraco', { text: 'AGORA' }),
            el('div.item__titulo', { style: 'font-size:17px;margin-top:2px', text: 'Tempo livre' }),
            el('div.mini.sub', { text: 'Nada marcado neste momento.' })
          ]),
      r.proximo ? el('div.mini.sub', { style: 'margin-top:10px;padding-top:10px;border-top:1px solid var(--linha)',
        text: 'A seguir · ' + r.proximo.hora + ' — ' + r.proximo.titulo }) : null
    ]);
  }

  /* ------------------------------------------------- rituais -- */

  function cartaoRitual(store, item) {
    var r = item.ref;
    var feitos = r.itens.filter(function (i) { return store.feito('itens', i.id, dia); }).length;

    return el('div.cartao', {}, [
      el('div', { style: 'display:flex;align-items:center;gap:10px' }, [
        el('div', { style: 'flex:1' }, [
          el('div.item__titulo', { text: r.titulo }),
          el('div.item__meta', {}, [
            r.hora ? el('span', { text: r.hora }) : null,
            el('span', { text: feitos + ' de ' + r.itens.length })
          ].filter(Boolean))
        ]),
        feitos === r.itens.length && r.itens.length
          ? ui.etiqueta('completo', 'salvia') : null
      ]),
      el('div.lista-check', {}, r.itens.map(function (i) {
        return ui.linhaCheck(i.titulo, store.feito('itens', i.id, dia), function () {
          store.alternar('itens', i.id, dia);
          App.render();
        });
      }))
    ]);
  }

  /* ------------------------------------------------- períodos - */

  function linhaItem(store, item) {
    var area = store.AREAS[item.area];
    var meta = [ui.ponto(area.cor), el('span', { text: area.nome })];
    if (item.duracao) meta.push(el('span', { text: u.duracaoTexto(item.duracao) }));
    if (item.tipo === 'evento') meta.push(ui.etiqueta('compromisso', 'azul'));
    if (item.fixo && item.tipo !== 'evento') meta.push(ui.etiqueta('fixo'));

    return ui.itemLinha({
      hora: item.hora,
      titulo: item.titulo,
      feito: item.feito,
      nota: item.tipo === 'bloco' ? item.nota : (item.ref.local || item.ref.nota || ''),
      meta: meta,
      aoMarcar: function () {
        store.alternar(item.tipo === 'evento' ? 'eventos' : 'blocos', item.id, dia);
        App.render();
      }
    });
  }

  function periodos(store, motor) {
    var grupos = motor.porPeriodo(dia);
    var out = [];

    PERIODOS.forEach(function (p) {
      var lista = grupos[p.chave];
      if (!lista.length) return;
      var feitos = lista.filter(function (i) { return i.feito; }).length;

      out.push(el('div.periodo', {}, [
        el('div.periodo__titulo', {}, [
          el('span', { text: p.nome }),
          el('em', { text: feitos + '/' + lista.length })
        ]),
        el('div', {}, lista.map(function (i) {
          return i.tipo === 'ritual' ? cartaoRitual(store, i) : linhaItem(store, i);
        }))
      ]));
    });

    if (!out.length) {
      out.push(el('div', { style: 'margin-top:18px' }, [
        ui.vazio('Nenhuma atividade neste dia',
          'Monte sua rotina na Agenda ou peça ajuda ao assistente.')
      ]));
    }

    return out;
  }

  /* ------------------------------------------------- extras --- */

  function tarefasDoDia(store, motor) {
    var tarefas = motor.tarefasDoDia(dia).sort(function (a, b) { return b.prioridade - a.prioridade; });
    var atrasadas = dia === u.hoje()
      ? store.estado.tarefas.filter(function (t) { return !t.feita && t.data && t.data < dia; })
      : [];
    if (!tarefas.length && !atrasadas.length) return [];

    function linha(t, atrasada) {
      return ui.itemLinha({
        titulo: t.titulo,
        feito: t.feita,
        meta: [
          t.prioridade === 3 ? ui.etiqueta(estrelas(3), 'rosa') : (t.prioridade === 1 ? ui.etiqueta('pode esperar') : null),
          el('span', { text: u.duracaoTexto(t.estimativa) }),
          atrasada ? ui.etiqueta('de ' + u.dataCurta(t.data), 'dourada') : null
        ].filter(Boolean),
        aoMarcar: function () {
          store.commit(function () { t.feita = !t.feita; });
          App.render();
        }
      });
    }

    return [
      ui.tituloSecao('Tarefas', u.plural(tarefas.length + atrasadas.length, 'item', 'itens')),
      el('div', {}, atrasadas.map(function (t) { return linha(t, true); })
        .concat(tarefas.map(function (t) { return linha(t, false); })))
    ];
  }

  function cuidadosDoDia(store) {
    if (!store.estado.ajustes.secoes.autocuidado) return [];
    var pendentes = store.cuidadosDeHoje(dia).filter(function (c) { return !store.feito('cuidados', c.id, dia); });
    var feitosHoje = store.estado.cuidados.filter(function (c) { return store.feito('cuidados', c.id, dia); });
    if (!pendentes.length && !feitosHoje.length) return [];

    return [
      ui.tituloSecao('Autocuidado de hoje'),
      el('div.cartao', {}, [
        el('div.lista-check', {}, pendentes.concat(feitosHoje).map(function (c) {
          var feito = store.feito('cuidados', c.id, dia);
          return ui.linhaCheck(c.titulo, feito, function () {
            store.commit(function () {
              var reg = store.dia(dia);
              if (reg.cuidados[c.id]) { delete reg.cuidados[c.id]; c.ultimaVez = null; }
              else { reg.cuidados[c.id] = true; c.ultimaVez = dia; }
            });
            App.render();
          });
        }))
      ])
    ];
  }

  function espiritualDoDia(store, motor) {
    if (!store.estado.ajustes.secoes.espiritual) return [];
    var praticas = store.estado.espiritual.praticas;
    if (!praticas.length) return [];
    var lit = motor.tempoLiturgico(dia);

    return [
      ui.tituloSecao('Vida espiritual', el('span', { style: 'color:var(--sazonal-forte)', text: lit.tempo })),
      el('div.cartao', {}, [
        el('div.lista-check', {}, praticas.map(function (p) {
          return ui.linhaCheck(p.titulo, store.feito('praticas', p.id, dia), function () {
            store.alternar('praticas', p.id, dia);
            App.render();
          });
        })),
        el('div.mini.fraco', { style: 'margin-top:8px;font-style:italic', text: lit.nota })
      ])
    ];
  }

  /* ---------------------------------------------- revisão ----- */

  function revisaoDoDia(store) {
    var rev = store.revisao(dia);

    function abrir() {
      ui.abrirFormulario({
        titulo: 'Revisão do dia',
        valores: rev || { humor: 'bem', sono: 8, nota: '' },
        campos: [
          { nome: 'humor', rotulo: 'Como foi o seu dia?', tipo: 'opcoes', opcoes: [
            { valor: 'leve', rotulo: 'Leve' },
            { valor: 'bem', rotulo: 'Bem' },
            { valor: 'corrido', rotulo: 'Corrido' },
            { valor: 'dificil', rotulo: 'Difícil' }
          ] },
          { nome: 'sono', rotulo: 'Horas de sono na noite passada', tipo: 'numero', min: 0, max: 14, passo: 0.5 },
          { nome: 'nota', rotulo: 'Algo que você queira guardar', tipo: 'texto-longo',
            dica: 'O que funcionou hoje? O que pode ficar mais leve amanhã?' }
        ],
        aoSalvar: function (v) {
          store.salvarRevisao(dia, v);
          ui.aviso('Revisão guardada');
          App.render();
        }
      });
    }

    return el('div.cartao', { style: 'margin-top:24px' }, [
      el('div.item__titulo', { text: rev ? 'Revisão do dia guardada' : 'Fechar o dia' }),
      el('p.mini.sub', { style: 'margin-top:4px',
        text: rev
          ? (rev.nota || 'Você registrou como foi este dia.')
          : 'Um minuto para olhar o dia com carinho antes de dormir.' }),
      el('button.btn.btn--p.btn--suave', { style: 'margin-top:10px',
        type: 'button', text: rev ? 'Editar revisão' : 'Revisar o dia', onclick: abrir })
    ]);
  }

  /* Aviso de rotina atualizada: aplica sem apagar o que já foi feito. */
  function atualizacaoDaRotina(store) {
    var novidade = store.rotinaDesatualizada();
    if (!novidade) return null;

    return el('div.cartao', { style: 'margin-top:16px;border-left:3px solid var(--ouro)' }, [
      el('div.versalete.fraco', { text: 'Rotina do quadro atualizada' }),
      el('div.pilha.pilha--junta', { style: 'margin-top:8px' }, novidade.notas.map(function (n) {
        return el('div', { style: 'font-family:var(--serif);font-size:15px', text: n });
      })),
      el('p.mini.sub', { style: 'margin-top:8px',
        text: 'Aplicar muda só os horários do quadro. Suas marcações, tarefas, estudos e tudo que você criou continuam como estão.' }),
      el('div.linha-btn', { style: 'margin-top:12px' }, [
        el('button.btn.btn--p.btn--principal', {
          type: 'button', text: 'Aplicar',
          onclick: function () {
            store.atualizarRotina();
            ui.aviso('Rotina atualizada');
            App.render();
          }
        }),
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: 'Agora não',
          onclick: function () {
            store.adiarAtualizacao();
            App.render();
          }
        })
      ])
    ]);
  }

  /* "Alternativas e saídas": o que fazer quando o dia não sai como o planejado.
     É a parte mais importante do quadro — a rotina precisa ter porta de saída. */
  function alternativas(store) {
    var lista = store.estado.alternativas;
    if (!lista.length) return null;

    return el('div.cartao', { style: 'margin-top:24px;border-left:3px solid var(--ouro)' }, [
      el('div.versalete.fraco', { text: 'Alternativas e saídas' }),
      el('div.pilha.pilha--junta', { style: 'margin-top:10px' }, lista.map(function (a) {
        return el('div', {}, [
          el('div', { style: 'font-family:var(--serif);font-size:15px', text: a.quando }),
          el('div.mini.sub', { text: a.saida })
        ]);
      })),
      el('p.mini.fraco', { style: 'margin-top:12px;font-style:italic',
        text: 'Cumprir metade com paz vale mais do que cumprir tudo com pressa.' })
    ]);
  }

  App.views = App.views || {};
  App.views.hoje = {
    titulo: 'Hoje',
    aoEntrar: function (params) { if (params && params.dia) dia = params.dia; },
    render: function (store) {
      var motor = App.motor;
      if (!dia) dia = u.hoje();

      var avisos = motor.analisarDia(dia).slice(0, 2);

      var filhos = [cabecalho(store, motor), atualizacaoDaRotina(store), agora(motor)];
      if (avisos.length) {
        filhos.push(el('div.pilha', { style: 'margin-top:14px' }, avisos.map(ui.avisoCartao)));
      }
      filhos = filhos
        .concat(periodos(store, motor))
        .concat(tarefasDoDia(store, motor))
        .concat(cuidadosDoDia(store))
        .concat(espiritualDoDia(store, motor));
      filhos.push(alternativas(store));
      filhos.push(ui.ornamento());
      filhos.push(revisaoDoDia(store));

      return el('div', {}, filhos.filter(Boolean));
    }
  };
})();
