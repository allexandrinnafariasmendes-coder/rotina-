/* Tela "Ajustes": preferências, backup e recomeço. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  function baixarBackup(store) {
    var nome = 'minha-rotina-' + u.hoje() + '.json';
    var blob = new Blob([store.exportar()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nome });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    ui.aviso('Backup salvo: ' + nome);
  }

  function restaurarBackup(store) {
    var input = el('input', { type: 'file', accept: 'application/json,.json' });
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var arquivo = input.files && input.files[0];
      if (!arquivo) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        try {
          store.importar(String(leitor.result));
          App.aplicarTema();
          ui.aviso('Backup restaurado');
          App.render();
        } catch (e) { ui.aviso('Arquivo inválido'); }
      };
      leitor.readAsText(arquivo);
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(function () { input.remove(); }, 0);
  }

  /* Editor das alternativas: "se acontecer X, faça Y". */
  function formAlternativa(store, alt) {
    var novo = !alt;
    ui.abrirFormulario({
      titulo: novo ? 'Nova saída' : 'Editar saída',
      valores: alt || { quando: '', saida: '' },
      campos: [
        { nome: 'quando', rotulo: 'Quando', tipo: 'texto', obrigatorio: true, dica: 'Se não conseguir estudar…' },
        { nome: 'saida', rotulo: 'O que fazer', tipo: 'texto-longo', obrigatorio: true,
          dica: 'Faça uma leitura espiritual ou revise anotações.' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (st) {
          st.alternativas = st.alternativas.filter(function (x) { return x.id !== alt.id; });
        });
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (st) {
          if (novo) st.alternativas.push({ id: u.id(), quando: v.quando, saida: v.saida });
          else Object.assign(alt, { quando: v.quando, saida: v.saida });
        });
        App.render();
      }
    });
  }

  function formPrioridades(store) {
    ui.abrirFormulario({
      titulo: 'Minhas prioridades',
      valores: { lista: (store.estado.ajustes.prioridades || []).map(function (t) { return { titulo: t }; }) },
      campos: [{ nome: 'lista', rotulo: 'O que vem primeiro', tipo: 'lista',
        ajuda: 'Poucas linhas. São elas que decidem o que fica quando o dia aperta.' }],
      aoSalvar: function (v) {
        store.commit(function (st) {
          st.ajustes.prioridades = v.lista.map(function (i) { return i.titulo; });
        });
        ui.aviso('Prioridades guardadas');
        App.render();
      }
    });
  }

  function bloco(titulo, descricao, filhos) {
    return el('div.cartao.pilha.pilha--junta', {}, [
      el('div.item__titulo', { text: titulo }),
      descricao ? el('p.mini.sub', { text: descricao }) : null,
      el('div.linha-btn', {}, filhos)
    ].filter(Boolean));
  }

  var SECOES = [
    { chave: 'objetivos', nome: 'Objetivos' },
    { chave: 'estudos', nome: 'Estudos' },
    { chave: 'autocuidado', nome: 'Autocuidado' },
    { chave: 'espiritual', nome: 'Vida espiritual' }
  ];

  App.views = App.views || {};
  App.views.ajustes = {
    titulo: 'Ajustes',
    render: function (store) {
      var a = store.estado.ajustes;
      var e = store.estado;

      var campoNome = el('input', {
        type: 'text', value: a.nome, placeholder: 'Como você quer ser chamada?', 'aria-label': 'Seu nome',
        onchange: function () {
          var v = campoNome.value.trim();
          store.commit(function (s) { s.ajustes.nome = v; });
          ui.aviso('Prontinho');
        }
      });

      var campoLema = el('input', {
        type: 'text', value: a.lema, placeholder: store.exemploDeLema(), 'aria-label': 'Lema',
        onchange: function () {
          var v = campoLema.value.trim();
          store.commit(function (st) { st.ajustes.lema = v; });
          ui.aviso('Lema guardado');
          App.render();
        }
      });

      function campoHora(chave, rotulo) {
        var input = el('input', {
          type: 'time', value: a[chave], 'aria-label': rotulo,
          onchange: function () {
            var v = input.value;
            store.commit(function (s) { s.ajustes[chave] = v; });
            ui.aviso('Horário salvo');
          }
        });
        return el('div.campo', {}, [el('label', { text: rotulo }), input]);
      }

      return el('div.pilha', { style: 'margin-top:8px' }, [
        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Seu nome' }),
          el('div.campo', {}, [campoNome]),
          el('p.mini.fraco', { text: 'Usado só na saudação da tela Hoje.' })
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Meus horários' }),
          el('p.mini.sub', { text: 'O assistente usa esses limites para saber onde cabe cada coisa.' }),
          el('div.duo', {}, [campoHora('acordar', 'Costumo acordar'), campoHora('dormir', 'Costumo dormir')])
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Lema' }),
          el('p.mini.sub', { text: 'Aparece no alto da tela Hoje, todos os dias.' }),
          el('div.campo', {}, [campoLema]),
          el('p.mini.fraco', { text: 'Em branco, o app mostra uma frase suave diferente a cada dia.' })
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Prioridades' }),
          el('p.mini.sub', { text: (a.prioridades && a.prioridades.length)
            ? a.prioridades.join(' · ') : 'Ainda não há prioridades escritas.' }),
          el('div.linha-btn', {}, [
            el('button.btn.btn--p', { type: 'button', text: 'Editar prioridades',
              onclick: function () { formPrioridades(store); } })
          ])
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Alternativas e saídas' }),
          el('p.mini.sub', { text: 'O que fazer quando o dia não sai como o planejado. Aparecem na tela Hoje e no assistente.' }),
          el('div.pilha.pilha--junta', {}, store.estado.alternativas.map(function (alt) {
            return el('div', { style: 'cursor:pointer;padding:8px 0;border-bottom:1px solid var(--filete)',
              onclick: function () { formAlternativa(store, alt); } }, [
              el('div', { style: 'font-family:var(--serif)', text: alt.quando }),
              el('div.mini.fraco', { text: alt.saida })
            ]);
          })),
          el('div.linha-btn', {}, [
            el('button.btn.btn--p', { type: 'button', text: '+ Nova saída',
              onclick: function () { formAlternativa(store, null); } })
          ])
        ]),

        bloco('Aparência', 'Vale para este aparelho.', ['auto', 'claro', 'escuro'].map(function (t) {
          var rotulos = { auto: 'Automático', claro: 'Claro', escuro: 'Escuro' };
          return el('button.btn.btn--p' + (a.tema === t ? '.btn--principal' : '.btn--fantasma'), {
            type: 'button', text: rotulos[t],
            onclick: function () {
              store.commit(function (s) { s.ajustes.tema = t; });
              App.aplicarTema();
              App.render();
            }
          });
        })),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Áreas que quero ver' }),
          el('p.mini.sub', { text: 'Desligue o que não faz sentido para você — o app não precisa ter tudo.' }),
          el('div.linha-btn', {}, SECOES.map(function (s) {
            var ativo = a.secoes[s.chave] !== false;
            return el('button.opcao', {
              type: 'button', text: s.nome, 'aria-pressed': ativo ? 'true' : 'false',
              onclick: function () {
                store.commit(function (st) { st.ajustes.secoes[s.chave] = !ativo; });
                App.render();
              }
            });
          }))
        ]),

        bloco('Backup', 'Tudo fica só neste aparelho. Guarde uma cópia de vez em quando.', [
          el('button.btn.btn--p', { type: 'button', text: '⤓ Baixar backup', onclick: function () { baixarBackup(store); } }),
          el('button.btn.btn--p', { type: 'button', text: '⤒ Restaurar backup', onclick: function () { restaurarBackup(store); } })
        ]),

        bloco('Rotina "' + store.nomeDoQuadro() + '"',
          'Carrega o quadro inteiro: horários da semana, rituais, prioridades, lema e as saídas para os dias pesados.', [
          el('button.btn.btn--p', {
            type: 'button', text: 'Carregar a rotina do quadro',
            onclick: function () {
              if (!confirm('Isso substitui a rotina atual pelo quadro "' + store.nomeDoQuadro() + '". Continuar?')) return;
              store.semear();
              ui.aviso('Rotina carregada');
              App.render();
            }
          })
        ]),

        bloco('Recomeçar', 'Você escolhe se mantém a estrutura (rotina, rituais, matérias) ou apaga tudo.', [
          el('button.btn.btn--p.btn--perigo', {
            type: 'button', text: 'Limpar histórico',
            onclick: function () {
              if (!confirm('Apagar marcações, tarefas, sessões e revisões, mantendo a estrutura?')) return;
              store.limpar(true);
              ui.aviso('Histórico limpo');
              App.render();
            }
          }),
          el('button.btn.btn--p.btn--perigo', {
            type: 'button', text: 'Apagar tudo',
            onclick: function () {
              if (!confirm('Apagar TUDO mesmo? Não dá para desfazer.')) return;
              store.limpar(false);
              ui.aviso('Tudo apagado');
              App.render();
            }
          })
        ]),

        el('div.cartao.pilha.pilha--junta', {}, [
          el('div.item__titulo', { text: 'Sobre' }),
          el('p.mini.sub', { text: 'Minha Rotina funciona sem internet e não envia nada para lugar nenhum. ' +
            'No celular, use “Adicionar à tela de início” para abrir como aplicativo.' }),
          el('p.mini.fraco', { text:
            e.blocos.length + ' atividades · ' + e.eventos.length + ' compromissos · ' +
            e.rituais.length + ' rituais · ' + e.tarefas.length + ' tarefas · ' +
            e.objetivos.length + ' objetivos · ' + e.disciplinas.length + ' disciplinas · ' +
            Object.keys(e.registro).length + ' dias registrados' }),
          el('p.mini.fraco', { style: 'font-style:italic',
            text: 'Organizar a vida para vivê-la melhor — não viver para cumprir a organização.' })
        ])
      ]);
    }
  };
})();
