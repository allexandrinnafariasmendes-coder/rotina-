/* Tela "Assistente": conversa simples que organiza o dia usando o motor local.
   Não há inteligência remota aqui — são regras rodando no seu aparelho. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var conversa = [];
  var pendente = null;   /* pergunta em aberto, ex.: quantos minutos você tem */

  var ATALHOS = [
    { texto: 'Organize meu dia', acao: 'organizar' },
    { texto: 'O que faço agora?', acao: 'agora' },
    { texto: 'Meu dia está cheio demais', acao: 'cheio' },
    { texto: 'Estou atrasada', acao: 'atrasada' },
    { texto: 'Quero descansar', acao: 'descanso' },
    { texto: 'O dia não saiu como planejei', acao: 'saidas' }
  ];

  function falar(quem, texto, tipo, dados) {
    conversa.push({ quem: quem, texto: texto, tipo: tipo || 'texto', dados: dados || null });
  }

  function limpar() { conversa = []; pendente = null; }

  /* ------------------------------------------------ respostas - */

  /* Descobre o dia mencionado na frase. */
  function diaDaFrase(texto) {
    var t = u.simples(texto);
    if (/amanha/.test(t)) return u.somarDias(u.hoje(), 1);
    if (/depois de amanha/.test(t)) return u.somarDias(u.hoje(), 2);
    var nomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    for (var i = 0; i < nomes.length; i++) {
      if (new RegExp('\\b' + nomes[i]).test(t)) {
        var atual = u.diaDaSemana(u.hoje());
        var passos = (i - atual + 7) % 7 || 7;
        return u.somarDias(u.hoje(), passos);
      }
    }
    return u.hoje();
  }

  function responderTexto(store, texto) {
    var motor = App.motor;

    if (pendente === 'minutos') {
      var min = parseInt(texto.replace(/\D+/g, ''), 10);
      pendente = null;
      if (!min) { falar('app', 'Não entendi o tempo. Tente algo como “40 minutos”.'); return; }
      return sugerirAgora(store, min);
    }

    var iso = diaDaFrase(texto);
    var r = motor.planejarTexto(texto, iso);

    if (!r.itens.length) {
      falar('app', 'Ainda não consegui entender essa frase. Tente descrever o que você precisa fazer, ' +
        'com tempo ou horário — por exemplo: “amanhã tenho aula até meio-dia, quero estudar duas horas e arrumar o quarto”.');
      return;
    }

    falar('app', 'Montei uma distribuição para ' + u.dataRelativa(iso) + '. Gostou?', 'plano', { iso: iso, plano: r.plano });
  }

  function sugerirAgora(store, minutos) {
    var lista = App.motor.melhorAgora(minutos);
    if (!lista.length) {
      falar('app', 'Não achei nada que caiba em ' + minutos + ' minutos. Talvez seja um bom momento para descansar.');
      return;
    }
    falar('app', 'Com ' + minutos + ' minutos, eu faria assim:', 'sugestoes', { minutos: minutos, lista: lista });
  }

  function responderAcao(store, acao) {
    var motor = App.motor;
    var hoje = u.hoje();

    if (acao === 'organizar') {
      falar('app', 'Me conte como é o seu dia. Escreva de um jeito solto, por exemplo: ' +
        '“amanhã tenho aula até meio-dia, quero estudar duas horas, preciso arrumar meu quarto e quero descansar”.');

    } else if (acao === 'agora') {
      pendente = 'minutos';
      falar('app', 'Quanto tempo você tem agora?', 'minutos');

    } else if (acao === 'cheio') {
      var itens = motor.itensDoDia(hoje);
      var tarefas = motor.tarefasDoDia(hoje);
      var total = itens.reduce(function (s, i) { return s + (i.duracao || 0); }, 0)
        + tarefas.reduce(function (s, t) { return s + (t.estimativa || 30); }, 0);

      falar('app', 'Hoje você tem ' + u.plural(itens.length, 'atividade', 'atividades') + ' e ' +
        u.plural(tarefas.length, 'tarefa', 'tarefas') + ', somando cerca de ' + u.horasTexto(total) + '. ' +
        (tarefas.length ? 'Vamos decidir o que fica?' : 'A agenda em si já está cheia — dá para adiar algum compromisso?'),
        'triagem', { iso: hoje });

    } else if (acao === 'saidas') {
      var alt = store.estado.alternativas;
      falar('app', alt.length
        ? 'Está tudo bem. Foi para isso que você escreveu estas saídas:'
        : 'Você ainda não escreveu suas alternativas. Dá para criá-las em Ajustes — são as saídas para os dias que não saem como o planejado.',
        alt.length ? 'saidas' : 'texto', { lista: alt });

    } else if (acao === 'atrasada') {
      var restantes = motor.itensDoDia(hoje).filter(function (i) {
        var m = u.minutosDe(i.hora);
        return !i.feito && m !== null && m >= u.agoraMin();
      });
      var comSaidas = store.estado.alternativas.length;
      falar('app', restantes.length
        ? 'Tudo bem. Ainda faltam ' + u.plural(restantes.length, 'atividade', 'atividades') + ' hoje e ' +
          u.horasTexto(Math.max(0, motor.dormir() - u.agoraMin())) + ' até a hora de dormir. ' +
          'Escolha o essencial e deixe o resto para amanhã — a lista existe para servir você, não o contrário.'
        : 'Não sobrou nada marcado para hoje. Respire: o dia pode acabar aqui.',
        'triagem', { iso: hoje });
      if (comSaidas) falar('app', 'E lembre-se das suas saídas para os dias assim:', 'saidas', { lista: store.estado.alternativas });

    } else if (acao === 'descanso') {
      var quando = motor.reservarDescanso(hoje, 30);
      falar('app', quando
        ? 'Reservei 30 minutos de descanso às ' + quando + '. Está no seu dia agora.'
        : 'Seu dia não tem nenhum espaço livre de 30 minutos. Quer adiar alguma coisa para abrir espaço?');
      App.render();
    }
  }

  /* ------------------------------------------------ desenho --- */

  function desenharPlano(store, dados) {
    var novos = dados.plano.filter(function (p) { return p.origem !== 'existente'; }).length;

    return el('div', {}, [
      el('div', {}, dados.plano.map(function (p) {
        var area = store.AREAS[p.area];
        var classe = 'div.plano-linha' + (p.origem === 'existente' ? '.plano-linha--existente' : '.plano-linha--novo');
        return el(classe, {}, [
          el('span.plano-linha__hora', { text: u.faixa(p.hora, p.duracao) }),
          el('div', { style: 'flex:1' }, [
            el('div', { text: p.titulo }),
            el('div.item__meta', {}, [
              ui.ponto(area.cor),
              el('span', { text: area.nome }),
              p.origem === 'movido' ? ui.etiqueta('remarcado', 'dourada') : null,
              p.origem === 'cuidado' ? ui.etiqueta('descanso reservado', 'salvia') : null,
              p.origem === 'pausa' ? ui.etiqueta('pausa', 'salvia') : null
            ].filter(Boolean))
          ])
        ]);
      })),
      el('div.linha-btn', { style: 'margin-top:12px' }, [
        el('button.btn.btn--principal.btn--p', {
          type: 'button', text: 'Gostei, aplicar',
          onclick: function () {
            App.motor.aplicarPlano(dados.iso, dados.plano, false);
            falar('app', 'Aplicado em ' + u.dataRelativa(dados.iso) + '. Você pode ajustar tudo na Agenda.');
            ui.aviso('Plano aplicado');
            App.render();
          }
        }),
        el('button.btn.btn--suave.btn--p', {
          type: 'button', text: 'Substituir a rotina do dia',
          onclick: function () {
            App.motor.aplicarPlano(dados.iso, dados.plano, true);
            falar('app', 'Feito: em ' + u.dataRelativa(dados.iso) + ' vale só este plano.');
            ui.aviso('Dia replanejado');
            App.render();
          }
        }),
        el('button.btn.btn--fantasma.btn--p', {
          type: 'button', text: 'Descartar',
          onclick: function () {
            falar('app', 'Sem problema. Me diga de outro jeito e eu tento de novo.');
            App.render();
          }
        })
      ]),
      el('p.mini.fraco', { style: 'margin-top:8px',
        text: novos + (novos === 1 ? ' item novo' : ' itens novos') + '; o resto já estava no seu dia.' })
    ]);
  }

  function desenharSugestoes(store, dados) {
    return el('div', {}, dados.lista.map(function (c) {
      var area = store.AREAS[c.area];
      return el('div.sugestao', {}, [
        el('div', {}, [
          el('div.item__titulo', { text: c.titulo }),
          el('div.item__meta', {}, [ui.ponto(area.cor), el('span', { text: u.duracaoTexto(c.minutos) })])
        ]),
        c.tipo === 'estudo' ? el('button.btn.btn--p.btn--principal', {
          type: 'button', text: 'Começar',
          onclick: function () {
            var d = store.disciplinaDoTopico(c.ref.id);
            store.commit(function (s) {
              s.sessaoAtiva = { disciplinaId: d ? d.id : null, topicoId: c.ref.id, inicio: Date.now() };
            });
            location.hash = '#/estudos';
          }
        }) : (c.tipo === 'tarefa' ? el('button.btn.btn--p.btn--suave', {
          type: 'button', text: 'Concluir',
          onclick: function () {
            store.commit(function () { c.ref.feita = true; });
            ui.aviso('Feito!');
            App.render();
          }
        }) : null),
        el('div.sugestao__porque', { text: 'Por quê: ' + c.porque + '.' })
      ]);
    }));
  }

  function desenharTriagem(store, dados) {
    var tarefas = App.motor.tarefasDoDia(dados.iso)
      .sort(function (a, b) { return b.prioridade - a.prioridade; });

    if (!tarefas.length) return el('p.mini.fraco', { text: 'Nenhuma tarefa aberta para hoje.' });

    return el('div', {}, tarefas.map(function (t) {
      return el('div.sugestao', {}, [
        el('div', {}, [
          el('div.item__titulo', { text: t.titulo }),
          el('div.item__meta', {}, [
            el('span', { style: 'color:var(--rubrica)', text: new Array(t.prioridade + 1).join('★') }),
            el('span', { text: u.duracaoTexto(t.estimativa) })
          ])
        ]),
        el('div.linha-btn', {}, [
          el('button.btn.btn--p.btn--suave', {
            type: 'button', text: '→ adiar',
            title: 'Passar para amanhã',
            onclick: function () {
              store.commit(function () { t.data = u.somarDias(t.data || u.hoje(), 1); });
              ui.aviso('Adiada para amanhã');
              App.render();
            }
          }),
          el('button.btn.btn--p.btn--perigo', {
            type: 'button', text: '× tirar',
            onclick: function () {
              store.commit(function (s) { s.tarefas = s.tarefas.filter(function (x) { return x.id !== t.id; }); });
              ui.aviso('Tirada da lista');
              App.render();
            }
          })
        ])
      ]);
    }).concat([
      el('p.mini.fraco', { style: 'margin-top:10px',
        text: 'Adiar não é falhar. Um dia com menos coisas costuma render mais que um dia impossível.' })
    ]));
  }

  function desenharSaidas(dados) {
    return el('div', {}, (dados.lista || []).map(function (a) {
      return el('div.plano-linha', {}, [
        el('div', {}, [
          el('div', { style: 'font-family:var(--serif)', text: a.quando }),
          el('div.mini.sub', { text: a.saida })
        ])
      ]);
    }));
  }

  function desenharMinutos(store) {
    return el('div.linha-btn', {}, [15, 30, 45, 60, 90].map(function (m) {
      return el('button.btn.btn--p.btn--suave', {
        type: 'button', text: m + ' min',
        onclick: function () {
          pendente = null;
          falar('eu', 'Tenho ' + m + ' minutos');
          sugerirAgora(store, m);
          App.render();
        }
      });
    }));
  }

  function balao(store, msg) {
    if (msg.quem === 'eu') return el('div.balao.balao--eu', { text: msg.texto });

    var extra = null;
    if (msg.tipo === 'plano') extra = desenharPlano(store, msg.dados);
    else if (msg.tipo === 'sugestoes') extra = desenharSugestoes(store, msg.dados);
    else if (msg.tipo === 'triagem') extra = desenharTriagem(store, msg.dados);
    else if (msg.tipo === 'minutos') extra = desenharMinutos(store);
    else if (msg.tipo === 'saidas') extra = desenharSaidas(msg.dados);

    return el('div.balao.balao--app', { style: extra ? 'max-width:100%' : null }, [
      el('div', { text: msg.texto }),
      extra ? el('div', { style: 'margin-top:12px' }, [extra]) : null
    ].filter(Boolean));
  }

  App.views = App.views || {};
  App.views.assistente = {
    titulo: 'Assistente',
    aoEntrar: function (params, store) {
      if (params && params.modo === 'reorganizar') {
        limpar();
        falar('eu', 'Meu dia está cheio demais');
        responderAcao(store, 'cheio');
      }
      if (!conversa.length) {
        falar('app', 'Oi! Posso organizar seu dia, sugerir o que fazer agora ou ajudar a tirar peso da sua lista. ' +
          'Escreva do seu jeito ou toque em um dos atalhos.');
      }
    },
    render: function (store) {
      var entrada = el('input', {
        type: 'text', placeholder: 'Escreva aqui…', 'aria-label': 'Falar com o assistente', autocomplete: 'off'
      });

      return el('div', {}, [
        el('div.atalhos', {}, ATALHOS.map(function (a) {
          return el('button.atalho', {
            type: 'button', text: a.texto,
            onclick: function () {
              falar('eu', a.texto);
              responderAcao(store, a.acao);
              App.render();
            }
          });
        })),

        el('div.conversa', {}, conversa.map(function (m) { return balao(store, m); })),

        el('form.campo', {
          style: 'margin-top:16px',
          onsubmit: function (ev) {
            ev.preventDefault();
            var texto = entrada.value.trim();
            if (!texto) return;
            falar('eu', texto);
            responderTexto(store, texto);
            entrada.value = '';
            App.render();
            var campo = document.querySelector('.tela form input[type="text"]');
            if (campo) campo.focus();
          }
        }, [
          el('div', { style: 'display:flex;gap:8px' }, [
            entrada,
            el('button.btn.btn--principal', { type: 'submit', text: 'Enviar' })
          ])
        ]),

        conversa.length > 1 ? el('button.link', {
          style: 'margin-top:12px', type: 'button', text: 'limpar conversa',
          onclick: function () { limpar(); App.views.assistente.aoEntrar(null, store); App.render(); }
        }) : null,

        el('p.mini.fraco', { style: 'margin-top:14px',
          text: 'O assistente funciona offline, dentro do seu aparelho. Nada do que você escreve sai daqui.' })
      ].filter(Boolean));
    }
  };
})();
