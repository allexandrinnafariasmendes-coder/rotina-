/* Tela "Agenda": calendário e rotina no mesmo lugar. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var dia = null;

  function opcoesArea(store) {
    return Object.keys(store.AREAS).map(function (k) {
      return { valor: k, rotulo: store.AREAS[k].nome };
    });
  }

  /* ------------------------------------------- formulários ---- */

  function formBloco(store, bloco) {
    var novo = !bloco;
    var valores = bloco || { titulo: '', hora: '', duracao: 30, dias: [1, 2, 3, 4, 5], area: 'pessoal', fixo: false, nota: '' };

    ui.abrirFormulario({
      titulo: novo ? 'Nova atividade da rotina' : 'Editar atividade',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Atividade', tipo: 'texto', obrigatorio: true, dica: 'Ex.: estudo, escola, jantar' },
        { nome: 'hora', rotulo: 'Horário', tipo: 'hora', junto: true },
        { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', min: 0, passo: 5, junto: true },
        { nome: 'dias', rotulo: 'Dias da semana', tipo: 'dias', obrigatorio: true },
        { nome: 'area', rotulo: 'Área da vida', tipo: 'selecao', opcoes: opcoesArea(store) },
        { nome: 'fixo', rotulo: 'É um horário fixo (o assistente não mexe)', tipo: 'alternar' },
        { nome: 'nota', rotulo: 'Observação', tipo: 'texto-longo', dica: 'Um lembrete para você mesma' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.blocos = s.blocos.filter(function (b) { return b.id !== bloco.id; }); });
        ui.aviso('Atividade removida');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.blocos.push(Object.assign({ id: u.id() }, v));
          else Object.assign(bloco, v);
        });
        ui.aviso(novo ? 'Atividade criada' : 'Atividade atualizada');
        App.render();
      }
    });
  }

  function formEvento(store, evento, dataPadrao) {
    var novo = !evento;
    var valores = evento || { titulo: '', data: dataPadrao || dia, hora: '', duracao: 60, area: 'compromisso', local: '', nota: '' };

    ui.abrirFormulario({
      titulo: novo ? 'Novo compromisso' : 'Editar compromisso',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Compromisso', tipo: 'texto', obrigatorio: true, dica: 'Ex.: consulta, prova, aniversário' },
        { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true },
        { nome: 'hora', rotulo: 'Horário', tipo: 'hora', junto: true },
        { nome: 'duracao', rotulo: 'Duração (min)', tipo: 'numero', min: 0, passo: 15, junto: true },
        { nome: 'area', rotulo: 'Área da vida', tipo: 'selecao', opcoes: opcoesArea(store) },
        { nome: 'local', rotulo: 'Onde', tipo: 'texto' },
        { nome: 'nota', rotulo: 'Observação', tipo: 'texto-longo' }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.eventos = s.eventos.filter(function (e) { return e.id !== evento.id; }); });
        ui.aviso('Compromisso removido');
        App.render();
      },
      aoSalvar: function (v) {
        store.commit(function (s) {
          if (novo) s.eventos.push(Object.assign({ id: u.id() }, v));
          else Object.assign(evento, v);
        });
        dia = v.data;
        ui.aviso(novo ? 'Compromisso marcado' : 'Compromisso atualizado');
        App.render();
      }
    });
  }

  /* ---------------------------------------------- fita semanal */

  function fita(store, motor) {
    var dias = u.diasDaSemana(dia);

    return el('div', {}, [
      el('div.linha-btn', { style: 'align-items:center;margin-bottom:8px' }, [
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: '‹ semana anterior',
          onclick: function () { dia = u.somarDias(dia, -7); App.render(); }
        }),
        el('button.btn.btn--p.btn--fantasma', {
          type: 'button', text: 'próxima ›', style: 'margin-left:auto',
          onclick: function () { dia = u.somarDias(dia, 7); App.render(); }
        })
      ]),
      el('div.semana-fita', {}, dias.map(function (d) {
        var itens = motor.itensDoDia(d);
        var areas = [];
        itens.forEach(function (i) {
          if (areas.indexOf(i.area) === -1 && areas.length < 4) areas.push(i.area);
        });
        return el('div.dia-fita' + (d === dia ? '.ativo' : ''), {
          role: 'button', tabindex: '0',
          onclick: function () { dia = d; App.render(); }
        }, [
          el('div.dia-fita__nome', { text: u.DIAS_MINI[u.diaDaSemana(d)] }),
          el('div.dia-fita__num', { text: String(u.fromISO(d).getDate()) }),
          el('div.dia-fita__pontos', {}, areas.map(function (a) {
            return el('span.dia-fita__ponto', { style: 'background:' + store.AREAS[a].cor });
          }))
        ]);
      }))
    ]);
  }

  /* ------------------------------------------------ lista dia - */

  function listaDoDia(store, motor) {
    var itens = motor.itensDoDia(dia);
    if (!itens.length) {
      return ui.vazio('Dia livre', 'Nada marcado para ' + u.dataRelativa(dia) + '.');
    }

    return el('div', {}, itens.map(function (i) {
      var area = store.AREAS[i.area];
      return ui.itemLinha({
        hora: i.hora,
        titulo: i.titulo,
        feito: i.feito,
        meta: [
          ui.ponto(area.cor),
          el('span', { text: area.nome }),
          i.duracao ? el('span', { text: u.duracaoTexto(i.duracao) }) : null,
          i.tipo === 'evento' ? ui.etiqueta('só neste dia', 'azul') : null,
          i.tipo === 'ritual' ? ui.etiqueta('ritual', 'rosa') : null,
          i.fixo && i.tipo === 'bloco' ? ui.etiqueta('fixo') : null
        ].filter(Boolean),
        aoAbrir: function () {
          if (i.tipo === 'bloco') formBloco(store, i.ref);
          else if (i.tipo === 'evento') formEvento(store, i.ref);
          else location.hash = '#/habitos';
        },
        direita: el('span.fraco', { text: '›' })
      });
    }));
  }

  App.views = App.views || {};
  App.views.agenda = {
    titulo: 'Agenda',
    aoEntrar: function (params) { if (params && params.dia) dia = params.dia; },
    render: function (store) {
      var motor = App.motor;
      if (!dia) dia = u.hoje();

      var ocupado = motor.itensDoDia(dia).reduce(function (s, i) { return s + (i.duracao || 0); }, 0);

      return el('div', {}, [
        fita(store, motor),
        el('div.titulo-secao', {}, [
          el('h2', { text: u.dataLonga(dia) }),
          el('span', { text: ocupado ? u.horasTexto(ocupado) + ' ocupadas' : 'livre' })
        ]),
        listaDoDia(store, motor),
        el('div.linha-btn', { style: 'margin-top:16px' }, [
          el('button.btn.btn--principal.btn--p', {
            type: 'button', text: '+ Compromisso',
            onclick: function () { formEvento(store, null, dia); }
          }),
          el('button.btn.btn--suave.btn--p', {
            type: 'button', text: '+ Atividade da rotina',
            onclick: function () { formBloco(store, null); }
          })
        ]),
        el('p.mini.fraco', { style: 'margin-top:12px',
          text: 'Compromissos valem só para um dia. Atividades da rotina se repetem nos dias marcados.' })
      ]);
    }
  };
})();
