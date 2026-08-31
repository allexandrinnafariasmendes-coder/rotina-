/* Tela "Tarefas": o que precisa ser feito, com prioridade e tempo estimado. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util, el = u.el, ui = App.ui;

  var filtro = 'abertas';
  var mostrarFeitas = false;

  function opcoesArea(store) {
    return Object.keys(store.AREAS).map(function (k) {
      return { valor: k, rotulo: store.AREAS[k].nome };
    });
  }

  function formulario(store, tarefa) {
    var novo = !tarefa;
    var valores = tarefa || { titulo: '', data: u.hoje(), prioridade: 2, estimativa: 30, area: 'pessoal', objetivoId: '' };

    var objetivos = [{ valor: '', rotulo: '— nenhum —' }].concat(
      store.estado.objetivos.filter(function (o) { return !o.arquivado; })
        .map(function (o) { return { valor: o.id, rotulo: o.titulo }; }));

    ui.abrirFormulario({
      titulo: novo ? 'Nova tarefa' : 'Editar tarefa',
      valores: valores,
      campos: [
        { nome: 'titulo', rotulo: 'Tarefa', tipo: 'texto', obrigatorio: true },
        { nome: 'data', rotulo: 'Para quando', tipo: 'data', ajuda: 'Em branco = algum dia' },
        { nome: 'prioridade', rotulo: 'Prioridade', tipo: 'opcoes', opcoes: [
          { valor: 1, rotulo: '★ pode esperar' },
          { valor: 2, rotulo: '★★ normal' },
          { valor: 3, rotulo: '★★★ importante' }
        ] },
        { nome: 'estimativa', rotulo: 'Tempo estimado (min)', tipo: 'numero', min: 5, passo: 5, junto: true },
        { nome: 'area', rotulo: 'Área', tipo: 'selecao', opcoes: opcoesArea(store), junto: true },
        { nome: 'objetivoId', rotulo: 'Faz parte de um objetivo?', tipo: 'selecao', opcoes: objetivos }
      ],
      aoExcluir: novo ? null : function () {
        store.commit(function (s) { s.tarefas = s.tarefas.filter(function (t) { return t.id !== tarefa.id; }); });
        ui.aviso('Tarefa removida');
        App.render();
      },
      aoSalvar: function (v) {
        var dados = {
          titulo: v.titulo, data: v.data || null, prioridade: Number(v.prioridade) || 2,
          estimativa: Number(v.estimativa) || 30, area: v.area, objetivoId: v.objetivoId || null
        };
        store.commit(function (s) {
          if (novo) s.tarefas.push(Object.assign({ id: u.id(), feita: false, criadaEm: u.hoje() }, dados));
          else Object.assign(tarefa, dados);
        });
        ui.aviso(novo ? 'Tarefa criada' : 'Tarefa atualizada');
        App.render();
      }
    });
  }

  function linha(store, t) {
    var atrasada = !t.feita && t.data && t.data < u.hoje();
    var obj = t.objetivoId ? store.objetivo(t.objetivoId) : null;

    return ui.itemLinha({
      titulo: t.titulo,
      feito: t.feita,
      meta: [
        t.prioridade === 3 ? ui.etiqueta('★★★', 'rosa') : null,
        el('span', { text: u.duracaoTexto(t.estimativa) }),
        el('span', { text: atrasada ? 'atrasada · ' + u.dataCurta(t.data) : u.dataRelativa(t.data) }),
        obj ? ui.etiqueta(obj.titulo, 'salvia') : null
      ].filter(Boolean),
      aoMarcar: function () {
        store.commit(function () { t.feita = !t.feita; });
        App.render();
      },
      aoAbrir: function () { formulario(store, t); }
    });
  }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      if (a.prioridade !== b.prioridade) return b.prioridade - a.prioridade;
      if (!a.data && !b.data) return a.criadaEm < b.criadaEm ? -1 : 1;
      if (!a.data) return 1;
      if (!b.data) return -1;
      return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0);
    });
  }

  function entradaRapida(store) {
    var input = el('input', { type: 'text', placeholder: 'Escreva uma tarefa para hoje…',
      'aria-label': 'Nova tarefa para hoje', autocomplete: 'off' });

    return el('form.campo', {
      onsubmit: function (ev) {
        ev.preventDefault();
        var titulo = input.value.trim();
        if (!titulo) return;
        store.commit(function (s) {
          s.tarefas.push({
            id: u.id(), titulo: titulo, data: u.hoje(), feita: false, prioridade: 2,
            estimativa: 30, area: 'pessoal', objetivoId: null, criadaEm: u.hoje()
          });
        });
        input.value = '';
        App.render();
        var novo = document.querySelector('.tela input[type="text"]');
        if (novo) novo.focus();
      }
    }, [el('div', { style: 'display:flex;gap:8px' }, [
      input,
      el('button.btn.btn--principal', { type: 'submit', text: 'Adicionar' })
    ])]);
  }

  App.views = App.views || {};
  App.views.tarefas = {
    titulo: 'Tarefas',
    render: function (store) {
      var todas = store.estado.tarefas;
      var hoje = u.hoje();
      var fimSemana = u.diasDaSemana(hoje)[6];

      var abertas = ordenar(todas.filter(function (t) {
        if (t.feita) return false;
        if (filtro === 'hoje') return t.data && t.data <= hoje;
        if (filtro === 'semana') return t.data && t.data <= fimSemana;
        return true;
      }));
      var feitas = todas.filter(function (t) { return t.feita; }).slice().reverse();

      var filtros = [
        { v: 'hoje', r: 'Para hoje' },
        { v: 'semana', r: 'Esta semana' },
        { v: 'abertas', r: 'Todas' }
      ];

      return el('div', {}, [
        el('div', { style: 'margin-top:8px' }, [entradaRapida(store)]),
        el('button.btn.btn--suave.btn--p.btn--largo', {
          style: 'margin-top:8px', type: 'button', text: 'Tarefa com prazo, prioridade ou objetivo…',
          onclick: function () { formulario(store, null); }
        }),

        el('div.linha-btn', { style: 'margin-top:16px' }, filtros.map(function (f) {
          return el('button.btn.btn--p' + (filtro === f.v ? '.btn--principal' : '.btn--fantasma'), {
            type: 'button', text: f.r,
            onclick: function () { filtro = f.v; App.render(); }
          });
        })),

        ui.tituloSecao('Em aberto', u.plural(abertas.length, 'tarefa', 'tarefas')),
        abertas.length
          ? el('div', {}, abertas.map(function (t) { return linha(store, t); }))
          : ui.vazio('Nada pendente aqui', 'Aproveite para descansar sem culpa.'),

        feitas.length ? ui.tituloSecao('Concluídas', el('button.link', {
          type: 'button', text: mostrarFeitas ? 'ocultar' : 'ver ' + feitas.length,
          onclick: function () { mostrarFeitas = !mostrarFeitas; App.render(); }
        })) : null,
        feitas.length && mostrarFeitas ? el('div', {}, feitas.map(function (t) { return linha(store, t); })) : null,
        feitas.length && mostrarFeitas ? el('button.btn.btn--p.btn--perigo.btn--largo', {
          style: 'margin-top:12px', type: 'button', text: 'Limpar concluídas',
          onclick: function () {
            if (!confirm('Remover as ' + feitas.length + ' tarefas concluídas?')) return;
            store.commit(function (s) { s.tarefas = s.tarefas.filter(function (t) { return !t.feita; }); });
            ui.aviso('Lista limpa');
            App.render();
          }
        }) : null
      ]);
    }
  };
})();
