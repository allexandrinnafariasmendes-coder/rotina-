/* Tela "Estudos": disciplina → assunto → conteúdo, com sessões cronometradas. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var relogio = null;

  var STATUS = {
    nao: { rotulo: 'não estudado', classe: 'st-nao' },
    estudando: { rotulo: 'estudando', classe: 'st-estudando' },
    ok: { rotulo: 'em dia', classe: 'st-ok' }
  };

  /* ------------------------------------------------ cadastros - */

  function formDisciplina(store, disc) {
    var novo = !disc;
    ui.abrirFormulario({
      titulo: novo ? 'Nova disciplina' : 'Editar disciplina',
      valores: disc || { nome: '' },
      campos: [
        { nome: 'nome', rotulo: 'Disciplina', tipo: 'texto', obrigatorio: true, dica: 'Ex.: Biologia' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.disciplinas = s.disciplinas.filter(function (d) { return d.id !== disc.id; }); });
        ui.aviso('Disciplina removida');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.disciplinas.push({ id: u.id(), nome: v.nome, emoji: '', topicos: [] });
          else Object.assign(disc, { nome: v.nome });
        });
        App.render();
      }
    });
  }

  function formTopico(store, disc, topico) {
    var novo = !topico;
    ui.abrirFormulario({
      titulo: novo ? 'Novo conteúdo' : 'Editar conteúdo',
      valores: topico || { nome: '', assunto: '', status: 'nao' },
      campos: [
        { nome: 'nome', rotulo: 'Conteúdo', tipo: 'texto', obrigatorio: true, dica: 'Ex.: Leis de Mendel' },
        { nome: 'assunto', rotulo: 'Assunto', tipo: 'texto', dica: 'Ex.: Genética', ajuda: 'Agrupa os conteúdos dentro da disciplina' },
        { nome: 'status', rotulo: 'Como está', tipo: 'opcoes', opcoes: [
          { valor: 'nao', rotulo: 'Não estudado' },
          { valor: 'estudando', rotulo: 'Estudando' },
          { valor: 'ok', rotulo: 'Em dia' }
        ] }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function () {
          disc.topicos = disc.topicos.filter(function (t) { return t.id !== topico.id; });
        });
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function () {
          if (novo) disc.topicos.push({ id: u.id(), nome: v.nome, assunto: v.assunto, status: v.status, ultimaRevisao: null, minutos: 0 });
          else Object.assign(topico, { nome: v.nome, assunto: v.assunto, status: v.status });
        });
        App.render();
      }
    });
  }

  /* -------------------------------------------------- sessão -- */

  function comecarSessao(store, disc, topico) {
    store.commit(function (s) {
      s.sessaoAtiva = { disciplinaId: disc.id, topicoId: topico.id, inicio: Date.now() };
    });
    ui.fechar();
    ui.aviso('Sessão iniciada. Bom estudo!');
    App.render();
  }

  function encerrarSessao(store, salvar) {
    var sa = store.estado.sessaoAtiva;
    if (!sa) return;
    var minutos = Math.max(1, Math.round((Date.now() - sa.inicio) / 60000));

    store.commit(function (s) {
      if (salvar) {
        s.sessoes.push({ id: u.id(), data: u.hoje(), disciplinaId: sa.disciplinaId, topicoId: sa.topicoId, minutos: minutos, nota: '' });
        var t = store.topico(sa.topicoId);
        if (t) {
          t.minutos += minutos;
          t.ultimaRevisao = u.hoje();
          if (t.status === 'nao') t.status = 'estudando';
        }
      }
      s.sessaoAtiva = null;
    });

    ui.aviso(salvar ? 'Sessão de ' + u.duracaoTexto(minutos) + ' registrada' : 'Sessão descartada');
    App.render();
  }

  function cronometro(store) {
    var sa = store.estado.sessaoAtiva;
    if (!sa) return null;
    var t = store.topico(sa.topicoId);
    var d = store.disciplinaDoTopico(sa.topicoId);

    var mostrador = el('div.cronometro__tempo', { text: '00:00' });

    function tique() {
      var seg = Math.floor((Date.now() - sa.inicio) / 1000);
      mostrador.textContent = u.pad(Math.floor(seg / 60)) + ':' + u.pad(seg % 60);
    }
    tique();
    clearInterval(relogio);
    relogio = setInterval(tique, 1000);

    return el('div.cronometro', {}, [
      el('div.cronometro__nome', { text: (d ? d.nome + ' · ' : '') + (t ? t.nome : 'Estudo') }),
      mostrador,
      el('div.linha-btn', {}, [
        el('button.btn.btn--p', { type: 'button', text: 'Encerrar e salvar', onclick: function () { encerrarSessao(store, true); } }),
        el('button.btn.btn--p.btn--fantasma', { style: 'color:var(--creme)', type: 'button', text: 'Descartar', onclick: function () { encerrarSessao(store, false); } })
      ])
    ]);
  }

  /* --------------------------------------------- distribuição - */

  function distribuir(store) {
    var pendentes = [];
    store.estado.disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) {
        if (t.status !== 'ok') pendentes.push({ disc: d, top: t });
      });
    });

    if (!pendentes.length) { ui.aviso('Nenhum conteúdo pendente'); return; }

    var escolhidos = pendentes.map(function (p) { return p.top.id; });
    var lista = el('div.pilha.pilha--junta', {}, pendentes.map(function (p) {
      return ui.linhaCheck(p.top.nome, true, function () { /* trocado abaixo */ });
    }));

    /* Reconstrói a lista para refletir a seleção. */
    function desenhar() {
      lista.innerHTML = '';
      pendentes.forEach(function (p) {
        var dentro = escolhidos.indexOf(p.top.id) !== -1;
        lista.appendChild(ui.linhaCheck(p.disc.nome + ' · ' + p.top.nome, dentro, function () {
          var i = escolhidos.indexOf(p.top.id);
          if (i === -1) escolhidos.push(p.top.id); else escolhidos.splice(i, 1);
          desenhar();
        }));
      });
    }
    desenhar();

    var prazo = el('input', { type: 'date', value: u.somarDias(u.hoje(), 7) });
    var minutos = el('input', { type: 'number', value: '40', min: '10', step: '5' });

    ui.abrirPainel('Distribuir conteúdos', [
      el('p.mini.sub', { text: 'Escolha o que precisa estudar e até quando. O app espalha os conteúdos pelos dias e cria uma tarefa para cada um.' }),
      lista,
      el('div.duo', { style: 'margin-top:12px' }, [
        el('div.campo', {}, [el('label', { text: 'Até quando' }), prazo]),
        el('div.campo', {}, [el('label', { text: 'Minutos por sessão' }), minutos])
      ]),
      el('div.linha-btn.linha-btn--fim', { style: 'margin-top:8px' }, [
        el('button.btn.btn--fantasma', { type: 'button', text: 'Cancelar', onclick: ui.fechar }),
        el('button.btn.btn--principal', {
          type: 'button', text: 'Distribuir',
          onclick: function () {
            if (!escolhidos.length) { ui.aviso('Escolha ao menos um conteúdo'); return; }
            var criadas = App.motor.distribuirEstudos(escolhidos, prazo.value || u.somarDias(u.hoje(), 7), Number(minutos.value) || 40);
            ui.fechar();
            ui.aviso(u.plural(criadas.length, 'sessão distribuída', 'sessões distribuídas'));
            App.render();
          }
        })
      ])
    ]);
  }

  /* ---------------------------------------------------- árvore */

  function acoesTopico(store, disc, topico) {
    ui.abrirPainel(topico.nome, [
      el('p.mini.sub', { text: (topico.assunto ? topico.assunto + ' · ' : '') + disc.nome
        + ' · ' + STATUS[topico.status].rotulo
        + (topico.minutos ? ' · ' + u.horasTexto(topico.minutos) + ' estudadas' : '') }),
      el('div.pilha', { style: 'margin-top:12px' }, [
        store.estado.sessaoAtiva ? el('p.mini.fraco', { text: 'Há uma sessão em andamento. Encerre antes de começar outra.' })
          : el('button.btn.btn--principal.btn--largo', {
              type: 'button', text: '▶ Começar sessão',
              onclick: function () { comecarSessao(store, disc, topico); }
            }),
        el('div.linha-btn', {}, [
          el('button.btn.btn--p.btn--suave', {
            type: 'button', text: 'Marcar como em dia',
            onclick: function () {
              store.commit(function () { topico.status = 'ok'; topico.ultimaRevisao = u.hoje(); });
              ui.fechar(); App.render();
            }
          }),
          el('button.btn.btn--p.btn--suave', {
            type: 'button', text: 'Estudando',
            onclick: function () {
              store.commit(function () { topico.status = 'estudando'; });
              ui.fechar(); App.render();
            }
          }),
          el('button.btn.btn--p.btn--fantasma', {
            type: 'button', text: 'Editar',
            onclick: function () { formTopico(store, disc, topico); }
          })
        ])
      ])
    ]);
  }

  function arvore(store) {
    if (!store.estado.disciplinas.length) {
      return ui.vazio('Nenhuma disciplina ainda', 'Cadastre uma disciplina e vá acrescentando os conteúdos.');
    }

    return el('div.pilha', {}, store.estado.disciplinas.map(function (d) {
      var assuntos = {};
      d.topicos.forEach(function (t) {
        var chave = t.assunto || 'Outros';
        (assuntos[chave] = assuntos[chave] || []).push(t);
      });
      var emDia = d.topicos.filter(function (t) { return t.status === 'ok'; }).length;

      var filhos = [
        el('div.arvore__disciplina', { style: 'cursor:pointer', onclick: function () { formDisciplina(store, d); } }, [
          el('span.monograma', { text: (d.nome || '?').charAt(0).toUpperCase() }),
          el('div', { style: 'flex:1' }, [
            el('div.item__titulo', { text: d.nome }),
            el('div.item__meta', {}, [el('span', { text: emDia + ' de ' + d.topicos.length + ' em dia' })])
          ]),
          el('span.fraco', { text: '›' })
        ])
      ];

      Object.keys(assuntos).forEach(function (assunto) {
        filhos.push(el('div.arvore__assunto', { text: assunto }));
        assuntos[assunto].forEach(function (t) {
          filhos.push(el('div.arvore__topico', { onclick: function () { acoesTopico(store, d, t); } }, [
            el('span.arvore__status.' + STATUS[t.status].classe),
            el('div', { style: 'flex:1' }, [
              el('div', { text: t.nome }),
              t.minutos ? el('div.item__meta', {}, [el('span', { text: u.horasTexto(t.minutos) })]) : null
            ].filter(Boolean)),
            el('span.fraco.mini', { text: '›' })
          ]));
        });
      });

      filhos.push(el('button.btn.btn--p.btn--fantasma', {
        style: 'margin-left:32px;margin-top:8px', type: 'button', text: '+ Conteúdo',
        onclick: function () { formTopico(store, d, null); }
      }));

      return el('div.cartao.arvore', {}, filhos);
    }));
  }

  App.views = App.views || {};
  App.views.estudos = {
    titulo: 'Estudos',
    aoSair: function () { clearInterval(relogio); relogio = null; },
    render: function (store) {
      var dias = u.ultimosDias(7);
      var minutosSemana = store.estado.sessoes
        .filter(function (s) { return dias.indexOf(s.data) !== -1; })
        .reduce(function (soma, s) { return soma + s.minutos; }, 0);

      clearInterval(relogio);

      return el('div', {}, [
        cronometro(store),
        el('div.numeros', { style: 'margin-top:12px' }, [
          el('div.numero', {}, [
            el('div.numero__valor', { text: u.horasTexto(minutosSemana) }),
            el('div.numero__rotulo', { text: 'estudadas em 7 dias' })
          ]),
          el('div.numero', {}, [
            el('div.numero__valor', { text: String(store.estado.sessoes.length) }),
            el('div.numero__rotulo', { text: 'sessões registradas' })
          ])
        ]),

        el('div.linha-btn', { style: 'margin-top:14px' }, [
          el('button.btn.btn--principal.btn--p', {
            type: 'button', text: 'Distribuir conteúdos',
            onclick: function () { distribuir(store); }
          }),
          el('button.btn.btn--suave.btn--p', {
            type: 'button', text: '+ Disciplina',
            onclick: function () { formDisciplina(store, null); }
          })
        ]),

        ui.tituloSecao('Minhas matérias'),
        arvore(store)
      ].filter(Boolean));
    }
  };
})();
