/* Estado do aplicativo. Tudo fica no localStorage do próprio aparelho. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;

  var CHAVE = 'minha-rotina:v2';


  var CHAVE_ANTIGA = 'minha-rotina:v1';
  var VERSAO = 2;

  /* Áreas da vida. As cores são pigmentos discretos: aparecem só como
     um ponto ao lado do nome, nunca como fundo. */
  var AREAS = {
    sono:        { nome: 'Sono',         cor: '#7B85A6', grupo: 'recuperar' },
    escola:      { nome: 'Escola',       cor: '#6E90A8', grupo: 'obrigacao' },
    estudo:      { nome: 'Estudo',       cor: '#5E82A0', grupo: 'obrigacao' },
    exercicio:   { nome: 'Exercício',    cor: '#7A9472', grupo: 'corpo' },
    compromisso: { nome: 'Compromisso',  cor: '#9A7286', grupo: 'obrigacao' },
    autocuidado: { nome: 'Autocuidado',  cor: '#B6828A', grupo: 'corpo' },
    alimentacao: { nome: 'Alimentação',  cor: '#B08A55', grupo: 'corpo' },
    descanso:    { nome: 'Descanso',     cor: '#7E9A80', grupo: 'recuperar' },
    hobby:       { nome: 'Hobby',        cor: '#8E7DA6', grupo: 'recuperar' },
    casa:        { nome: 'Casa',         cor: '#9C845F', grupo: 'obrigacao' },
    espiritual:  { nome: 'Espiritual',   cor: '#6F80A0', grupo: 'alma' },
    pessoal:     { nome: 'Pessoal',      cor: '#A98F4E', grupo: 'recuperar' }
  };

  /* Áreas que contam como recuperação — o app cobra a presença delas no dia. */
  var AREAS_DESCANSO = ['descanso', 'hobby', 'sono', 'pessoal'];

  var AREAS_OBJETIVO = {
    estudos: { nome: 'Estudos' },
    futuro:  { nome: 'Futuro' },
    eu:      { nome: 'Eu' },
    casa:    { nome: 'Casa' },
    vida:    { nome: 'Vida pessoal' }
  };

  var ouvintes = [];
  var estado = null;

  function estadoInicial() {
    return {
      versao: VERSAO,
      ajustes: {
        nome: '',
        tema: 'auto',
        estilo: 'missal',
        semeado: false,
        acordar: '05:00',
        dormir: '22:00',
        lema: '',
        prioridades: [],
        quadroId: '',
        instalacaoDispensada: false,
        secoes: { estudos: true, autocuidado: true, espiritual: true, objetivos: true }
      },
      alternativas: [],   /* saídas para os dias que não saem como o planejado */
      blocos: [],      /* rotina recorrente */
      eventos: [],     /* compromissos de um dia específico */
      tarefas: [],
      objetivos: [],
      disciplinas: [],
      sessoes: [],     /* sessões de estudo registradas */
      rituais: [],     /* conjuntos de hábitos contextualizados */
      cuidados: [],    /* autocuidado recorrente */
      espiritual: { praticas: [], intencoes: [], diario: [] },
      registro: {},    /* marcações por dia */
      semanas: {},     /* reflexão semanal */
      sessaoAtiva: null
    };
  }

  /* ------------------------------------------------------ seed */

  /* O quadro vem de js/rotina-base.js — é a única parte pessoal do projeto.
     Sem ele, o app simplesmente começa vazio. */
  function quadro() {
    return App.rotinaBase || { id: 'vazio', versao: 0, notas: {}, montar: function () { return {}; } };
  }

  function exemplo() { return quadro().montar(u); }

  function nomeDoQuadro() { return quadro().nome || 'Rotina de exemplo'; }

  /* Só um exemplo para o campo vazio de lema. */
  function exemploDeLema() { return quadro().lemaExemplo || 'Uma frase que te lembre do que importa.'; }

  /* ---------------------------------------------- persistência */

  function normalizar(d) {
    var base = estadoInicial();
    if (!d || typeof d !== 'object') return base;

    base.versao = VERSAO;
    base.ajustes = Object.assign(base.ajustes, d.ajustes || {});
    /* Temas da primeira versão usavam nomes em inglês. */
    var temas = { dark: 'escuro', light: 'claro', auto: 'auto', escuro: 'escuro', claro: 'claro' };
    base.ajustes.tema = temas[base.ajustes.tema] || 'auto';
    base.ajustes.secoes = Object.assign({ estudos: true, autocuidado: true, espiritual: true, objetivos: true },
      (d.ajustes && d.ajustes.secoes) || {});
    base.ajustes.lema = base.ajustes.lema || '';
    base.ajustes.estilo = ['missal', 'limonada'].indexOf(base.ajustes.estilo) !== -1
      ? base.ajustes.estilo : 'missal';
    base.ajustes.instalacaoDispensada = !!base.ajustes.instalacaoDispensada;
    /* Quem já tinha o quadro carregado antes deste controle existir está em dia:
       o aviso só aparece para mudanças daqui em diante. */
    base.ajustes.rotinaVersao = d.ajustes && d.ajustes.rotinaVersao !== undefined
      ? Number(d.ajustes.rotinaVersao)
      : (base.ajustes.semeado ? quadro().versao : 0);
    base.ajustes.rotinaAdiada = Number((d.ajustes || {}).rotinaAdiada) || 0;
    base.ajustes.quadroId = (d.ajustes || {}).quadroId || (base.ajustes.semeado ? quadro().id : '');
    base.ajustes.prioridades = (base.ajustes.prioridades || []).map(String);

    base.alternativas = (d.alternativas || []).map(function (a) {
      return { id: a.id || u.id(), quando: String(a.quando || ''), saida: String(a.saida || '') };
    });
    base.registro = d.registro && typeof d.registro === 'object' ? d.registro : {};
    base.semanas = d.semanas && typeof d.semanas === 'object' ? d.semanas : {};
    base.sessaoAtiva = d.sessaoAtiva || null;

    base.blocos = (d.blocos || []).map(function (b) {
      return {
        id: b.id || u.id(),
        chave: b.chave || null,
        titulo: String(b.titulo || 'Sem título'),
        hora: b.hora || '',
        duracao: Number(b.duracao) || 0,
        dias: Array.isArray(b.dias) && b.dias.length ? b.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        area: AREAS[b.area] ? b.area : 'pessoal',
        fixo: !!b.fixo,
        nota: b.nota || ''
      };
    });

    base.eventos = (d.eventos || []).map(function (e) {
      return {
        id: e.id || u.id(),
        titulo: String(e.titulo || 'Sem título'),
        data: e.data || u.hoje(),
        hora: e.hora || '',
        duracao: Number(e.duracao) || 0,
        area: AREAS[e.area] ? e.area : 'compromisso',
        local: e.local || '',
        nota: e.nota || ''
      };
    });

    base.tarefas = (d.tarefas || []).map(function (t) {
      return {
        id: t.id || u.id(),
        titulo: String(t.titulo || 'Sem título'),
        data: t.data || null,
        feita: !!t.feita,
        prioridade: Math.min(3, Math.max(1, Number(t.prioridade) || (t.prioridade === true ? 3 : 2))),
        estimativa: Number(t.estimativa) || 30,
        area: AREAS[t.area] ? t.area : 'pessoal',
        objetivoId: t.objetivoId || null,
        criadaEm: t.criadaEm || u.hoje()
      };
    });

    base.objetivos = (d.objetivos || []).map(function (o) {
      return {
        id: o.id || u.id(),
        titulo: String(o.titulo || 'Sem título'),
        area: AREAS_OBJETIVO[o.area] ? o.area : 'vida',
        prazo: o.prazo || null,
        nota: o.nota || '',
        passos: (o.passos || []).map(function (p) {
          return { id: p.id || u.id(), titulo: String(p.titulo || ''), feito: !!p.feito };
        }),
        arquivado: !!o.arquivado
      };
    });

    base.disciplinas = (d.disciplinas || []).map(function (x) {
      return {
        id: x.id || u.id(),
        nome: String(x.nome || 'Disciplina'),
        emoji: x.emoji || '',
        topicos: (x.topicos || []).map(function (t) {
          return {
            id: t.id || u.id(),
            nome: String(t.nome || 'Conteúdo'),
            assunto: t.assunto || '',
            status: ['nao', 'estudando', 'ok'].indexOf(t.status) !== -1 ? t.status : 'nao',
            ultimaRevisao: t.ultimaRevisao || null,
            minutos: Number(t.minutos) || 0
          };
        })
      };
    });

    base.sessoes = (d.sessoes || []).map(function (s) {
      return {
        id: s.id || u.id(),
        data: s.data || u.hoje(),
        disciplinaId: s.disciplinaId || null,
        topicoId: s.topicoId || null,
        minutos: Number(s.minutos) || 0,
        nota: s.nota || ''
      };
    });

    base.rituais = (d.rituais || []).map(function (r) {
      return {
        id: r.id || u.id(),
        chave: r.chave || null,
        titulo: String(r.titulo || 'Ritual'),
        periodo: ['manha', 'tarde', 'noite', 'qualquer'].indexOf(r.periodo) !== -1 ? r.periodo : 'qualquer',
        hora: r.hora || '',
        dias: Array.isArray(r.dias) && r.dias.length ? r.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        itens: (r.itens || []).map(function (i) {
          return { id: i.id || u.id(), titulo: String(i.titulo || '') };
        })
      };
    });

    base.cuidados = (d.cuidados || []).map(function (c) {
      return {
        id: c.id || u.id(),
        titulo: String(c.titulo || 'Cuidado'),
        categoria: c.categoria || 'pele',
        intervalo: Math.max(1, Number(c.intervalo) || 7),
        ultimaVez: c.ultimaVez || null
      };
    });

    var esp = d.espiritual || {};
    base.espiritual = {
      praticas: (esp.praticas || []).map(function (p) {
        return { id: p.id || u.id(), titulo: String(p.titulo || ''), momento: p.momento || 'qualquer' };
      }),
      intencoes: (esp.intencoes || []).map(function (i) {
        return { id: i.id || u.id(), texto: String(i.texto || ''), criadaEm: i.criadaEm || u.hoje(), atendida: !!i.atendida };
      }),
      diario: (esp.diario || []).map(function (e) {
        return { id: e.id || u.id(), data: e.data || u.hoje(), texto: String(e.texto || '') };
      })
    };

    return base;
  }

  /* Converte os dados da primeira versão do app, se existirem. */
  function migrarV1(antigo) {
    var mapaArea = { saude: 'autocuidado', trabalho: 'estudo', estudo: 'estudo', casa: 'casa', lazer: 'hobby', pessoal: 'pessoal' };
    var novo = estadoInicial();
    novo.ajustes.nome = (antigo.ajustes && antigo.ajustes.nome) || '';
    novo.ajustes.tema = { dark: 'escuro', light: 'claro' }[(antigo.ajustes || {}).tema] || 'auto';
    novo.ajustes.semeado = true;

    novo.blocos = (antigo.blocos || []).map(function (b) {
      return {
        id: b.id, titulo: b.titulo, hora: b.hora, duracao: b.duracao, dias: b.dias,
        area: mapaArea[b.categoria] || 'pessoal', fixo: false, nota: b.nota || ''
      };
    });

    /* Cada hábito antigo vira um item de um ritual único. */
    if ((antigo.habitos || []).length) {
      var ritual = { id: u.id(), titulo: 'Meus hábitos', periodo: 'qualquer', hora: '', dias: [0, 1, 2, 3, 4, 5, 6], itens: [] };
      var mapaItem = {};
      antigo.habitos.forEach(function (h) {
        var item = { id: u.id(), titulo: h.titulo };
        mapaItem[h.id] = item.id;
        ritual.itens.push(item);
      });
      novo.rituais = [ritual];
      Object.keys(antigo.registro || {}).forEach(function (dia) {
        var r = antigo.registro[dia] || {};
        novo.registro[dia] = { blocos: r.blocos || {}, eventos: {}, itens: {}, praticas: {}, cuidados: {} };
        Object.keys(r.habitos || {}).forEach(function (hid) {
          if (mapaItem[hid]) novo.registro[dia].itens[mapaItem[hid]] = true;
        });
      });
    } else {
      Object.keys(antigo.registro || {}).forEach(function (dia) {
        novo.registro[dia] = { blocos: (antigo.registro[dia] || {}).blocos || {}, eventos: {}, itens: {}, praticas: {}, cuidados: {} };
      });
    }

    novo.tarefas = (antigo.tarefas || []).map(function (t) {
      return {
        id: t.id, titulo: t.titulo, data: t.data, feita: !!t.feita,
        prioridade: t.prioridade ? 3 : 2, estimativa: 30, area: 'pessoal',
        objetivoId: null, criadaEm: t.criadaEm || u.hoje()
      };
    });

    return novo;
  }

  function carregar() {
    var bruto = null, antigo = null;
    try {
      bruto = localStorage.getItem(CHAVE);
      antigo = localStorage.getItem(CHAVE_ANTIGA);
    } catch (e) { /* armazenamento indisponível */ }

    if (bruto) {
      try { estado = normalizar(JSON.parse(bruto)); return; } catch (e) { /* segue adiante */ }
    }
    if (antigo) {
      try {
        estado = normalizar(migrarV1(JSON.parse(antigo)));
        salvar();
        return;
      } catch (e) { /* segue adiante */ }
    }
    estado = estadoInicial();
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (e) {
      if (App.ui && App.ui.aviso) App.ui.aviso('Não consegui salvar neste navegador');
      return false;
    }
  }

  function notificar() { ouvintes.forEach(function (fn) { fn(estado); }); }

  function commit(fn) {
    fn(estado);
    salvar();
    notificar();
  }

  /* ------------------------------------------------- registro */

  function dia(iso) {
    if (!estado.registro[iso]) estado.registro[iso] = {};
    var d = estado.registro[iso];
    ['blocos', 'eventos', 'itens', 'praticas', 'cuidados'].forEach(function (k) {
      if (!d[k]) d[k] = {};
    });
    return d;
  }

  function feito(balde, itemId, iso) {
    var d = estado.registro[iso];
    return !!(d && d[balde] && d[balde][itemId]);
  }

  function alternar(balde, itemId, iso) {
    commit(function () {
      var d = dia(iso);
      if (d[balde][itemId]) delete d[balde][itemId];
      else d[balde][itemId] = true;
    });
  }

  function revisao(iso) { return (estado.registro[iso] || {}).revisao || null; }

  function salvarRevisao(iso, dados) {
    commit(function () { dia(iso).revisao = dados; });
  }

  /* ------------------------------------------------ auxiliares */

  function objetivo(id) {
    return estado.objetivos.filter(function (o) { return o.id === id; })[0] || null;
  }

  function disciplinaDoTopico(topicoId) {
    var achou = null;
    estado.disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) { if (t.id === topicoId) achou = d; });
    });
    return achou;
  }

  function topico(topicoId) {
    var achou = null;
    estado.disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) { if (t.id === topicoId) achou = t; });
    });
    return achou;
  }

  /* Próxima data prevista de um cuidado recorrente. */
  function proximaVez(cuidado) {
    if (!cuidado.ultimaVez) return u.hoje();
    return u.somarDias(cuidado.ultimaVez, cuidado.intervalo);
  }

  function cuidadosDeHoje(iso) {
    var ref = iso || u.hoje();
    return estado.cuidados.filter(function (c) { return proximaVez(c) <= ref; });
  }

  /* -------------------------------------------------- exportar */

  function exportar() { return JSON.stringify(estado, null, 2); }

  function importar(texto) {
    estado = normalizar(JSON.parse(texto));
    salvar();
    notificar();
  }

  function aplicarSeed(estadoAlvo, ex) {
    Object.keys(ex).forEach(function (k) {
      if (k === 'lema' || k === 'prioridades') estadoAlvo.ajustes[k] = ex[k];
      else estadoAlvo[k] = ex[k];
    });
    estadoAlvo.ajustes.acordar = '05:00';
    estadoAlvo.ajustes.dormir = '22:00';
    estadoAlvo.ajustes.semeado = true;
    estadoAlvo.ajustes.rotinaVersao = quadro().versao;
    estadoAlvo.ajustes.quadroId = quadro().id;
    estadoAlvo.ajustes.rotinaAdiada = 0;
  }

  function semear() {
    var ex = exemplo();
    commit(function (s) { aplicarSeed(s, ex); });
  }

  /* Há uma versão mais nova do quadro para aplicar? */
  function rotinaDesatualizada() {
    var a = estado.ajustes;
    if (!a.semeado) return null;
    /* Uma rotina vinda de outro quadro nunca é sobrescrita por este. */
    if (a.quadroId && a.quadroId !== quadro().id) return null;

    var atual = Number(a.rotinaVersao) || 0;
    if (atual >= quadro().versao) return null;
    if (Number(a.rotinaAdiada) >= quadro().versao) return null;

    var notas = [];
    for (var v = atual + 1; v <= quadro().versao; v++) {
      if (quadro().notas[v]) notas.push(quadro().notas[v]);
    }
    return { versao: quadro().versao, notas: notas };
  }

  function adiarAtualizacao() {
    commit(function (s) { s.ajustes.rotinaAdiada = quadro().versao; });
  }

  /* Casa cada item do quadro pela chave e troca só o que descreve o horário,
     mantendo o mesmo id — assim marcações, tarefas, sessões e histórico
     continuam de pé. O que a pessoa criou por conta (sem chave) não é tocado. */
  function aplicarQuadro(ex, alvo) {
    var s = alvo;

    if (ex.blocos) {
      var blocoPorChave = {};
      s.blocos.forEach(function (b) { if (b.chave) blocoPorChave[b.chave] = b; });

      var chavesDoQuadro = {};
      ex.blocos.forEach(function (novo) {
        chavesDoQuadro[novo.chave] = true;
        var atual = blocoPorChave[novo.chave];
        if (!atual) { s.blocos.push(novo); return; }
        atual.titulo = novo.titulo;
        atual.hora = novo.hora;
        atual.duracao = novo.duracao;
        atual.dias = novo.dias;
        atual.area = novo.area;
        atual.fixo = novo.fixo;
        atual.nota = novo.nota;
      });
      s.blocos = s.blocos.filter(function (b) { return !b.chave || chavesDoQuadro[b.chave]; });
    }

    if (ex.rituais) {
      var ritualPorChave = {};
      s.rituais.forEach(function (r) { if (r.chave) ritualPorChave[r.chave] = r; });

      var chavesRituais = {};
      ex.rituais.forEach(function (novo) {
        chavesRituais[novo.chave] = true;
        var atual = ritualPorChave[novo.chave];
        if (!atual) { s.rituais.push(novo); return; }
        atual.titulo = novo.titulo;
        atual.periodo = novo.periodo;
        atual.hora = novo.hora;
        atual.dias = novo.dias;
        /* os passos são casados pelo texto, pelo mesmo motivo */
        var porTitulo = {};
        atual.itens.forEach(function (i) { porTitulo[i.titulo] = i; });
        atual.itens = novo.itens.map(function (i) { return porTitulo[i.titulo] || i; });
      });
      s.rituais = s.rituais.filter(function (r) { return !r.chave || chavesRituais[r.chave]; });
    }

    if (ex.alternativas) s.alternativas = ex.alternativas;
    if (ex.prioridades) s.ajustes.prioridades = ex.prioridades;
    if (typeof ex.lema === 'string') s.ajustes.lema = ex.lema;
    if (ex.acordar) s.ajustes.acordar = ex.acordar;
    if (ex.dormir) s.ajustes.dormir = ex.dormir;
  }

  function atualizarRotina() {
    var ex = exemplo();
    commit(function (s) {
      aplicarQuadro(ex, s);
      s.ajustes.rotinaVersao = quadro().versao;
      s.ajustes.quadroId = quadro().id;
      s.ajustes.rotinaAdiada = 0;
    });
  }

  /* Arquivo de rotina: só os horários, sem nada do histórico. Serve para
     receber uma rotina nova sem perder o que já foi marcado. */
  function exportarRotina() {
    return JSON.stringify({
      tipo: 'rotina',
      quadro: quadro().id,
      nome: nomeDoQuadro(),
      versao: quadro().versao,
      blocos: estado.blocos.filter(function (b) { return b.chave; }),
      rituais: estado.rituais.filter(function (r) { return r.chave; }),
      prioridades: estado.ajustes.prioridades,
      alternativas: estado.alternativas,
      lema: estado.ajustes.lema,
      acordar: estado.ajustes.acordar,
      dormir: estado.ajustes.dormir
    }, null, 2);
  }

  function importarRotina(texto) {
    var d = JSON.parse(texto);
    if (d.tipo !== 'rotina') throw new Error('Este arquivo não é uma rotina.');

    /* passa pela mesma normalização dos dados salvos, para um arquivo
       torto não entrar no app */
    var limpo = normalizar({ blocos: d.blocos, rituais: d.rituais, alternativas: d.alternativas });

    commit(function (s) {
      aplicarQuadro({
        blocos: limpo.blocos,
        rituais: limpo.rituais,
        alternativas: limpo.alternativas,
        prioridades: d.prioridades,
        lema: d.lema,
        acordar: d.acordar,
        dormir: d.dormir
      }, s);
      if (d.quadro) s.ajustes.quadroId = d.quadro;
      if (d.versao) s.ajustes.rotinaVersao = Number(d.versao) || 0;
      s.ajustes.rotinaAdiada = 0;
    });

    return { nome: d.nome || 'rotina', blocos: (d.blocos || []).length };
  }

  function limpar(manterEstrutura) {
    var guardado = {
      blocos: estado.blocos, rituais: estado.rituais, cuidados: estado.cuidados,
      disciplinas: estado.disciplinas, objetivos: estado.objetivos,
      espiritual: estado.espiritual, alternativas: estado.alternativas
    };
    var ajustesAntigos = estado.ajustes;
    var nome = estado.ajustes.nome, tema = estado.ajustes.tema;
    estado = estadoInicial();
    estado.ajustes.nome = nome;
    estado.ajustes.tema = tema;
    estado.ajustes.lema = ajustesAntigos.lema;
    estado.ajustes.prioridades = ajustesAntigos.prioridades;
    estado.ajustes.acordar = ajustesAntigos.acordar;
    estado.ajustes.dormir = ajustesAntigos.dormir;
    estado.ajustes.semeado = true;
    if (manterEstrutura) Object.keys(guardado).forEach(function (k) { estado[k] = guardado[k]; });
    salvar();
    notificar();
  }

  App.store = {
    AREAS: AREAS,
    AREAS_DESCANSO: AREAS_DESCANSO,
    AREAS_OBJETIVO: AREAS_OBJETIVO,
    iniciar: function () {
      carregar();
      if (!estado.ajustes.semeado && !estado.blocos.length) {
        aplicarSeed(estado, exemplo());
        salvar();
      }
    },
    get estado() { return estado; },
    subscrever: function (fn) { ouvintes.push(fn); },
    commit: commit,
    dia: dia,
    feito: feito,
    alternar: alternar,
    revisao: revisao,
    salvarRevisao: salvarRevisao,
    objetivo: objetivo,
    topico: topico,
    disciplinaDoTopico: disciplinaDoTopico,
    proximaVez: proximaVez,
    cuidadosDeHoje: cuidadosDeHoje,
    exportar: exportar,
    importar: importar,
    semear: semear,
    nomeDoQuadro: nomeDoQuadro,
    exemploDeLema: exemploDeLema,
    rotinaDesatualizada: rotinaDesatualizada,
    atualizarRotina: atualizarRotina,
    exportarRotina: exportarRotina,
    importarRotina: importarRotina,
    adiarAtualizacao: adiarAtualizacao,
    limpar: limpar
  };
})();
