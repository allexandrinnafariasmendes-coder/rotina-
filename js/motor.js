/* Motor da rotina: monta o dia, analisa excessos, sugere o que fazer agora
   e interpreta pedidos escritos em português. Tudo local, sem internet. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;

  function store() { return App.store; }
  function e() { return App.store.estado; }

  /* ------------------------------------------------- o dia ---- */

  function acordar() { return u.minutosDe(e().ajustes.acordar || '06:30'); }
  function dormir() { return u.minutosDe(e().ajustes.dormir || '22:30'); }

  /* Um dia planejado pelo assistente pode substituir a rotina recorrente. */
  function somentePlano(iso) {
    var r = e().registro[iso];
    return !!(r && r.somentePlano);
  }

  /* Lista única do dia: rotina recorrente + compromissos + rituais. */
  function itensDoDia(iso) {
    var dow = u.diaDaSemana(iso);
    var out = [];

    if (!somentePlano(iso)) {
      e().blocos.forEach(function (b) {
        if (b.dias.indexOf(dow) === -1) return;
        out.push({
          tipo: 'bloco', ref: b, id: b.id, titulo: b.titulo, hora: b.hora,
          duracao: b.duracao, area: b.area, fixo: b.fixo, nota: b.nota,
          feito: store().feito('blocos', b.id, iso)
        });
      });
    }

    e().eventos.forEach(function (ev) {
      if (ev.data !== iso) return;
      out.push({
        tipo: 'evento', ref: ev, id: ev.id, titulo: ev.titulo, hora: ev.hora,
        duracao: ev.duracao, area: ev.area, fixo: true, nota: ev.local || ev.nota,
        feito: store().feito('eventos', ev.id, iso)
      });
    });

    e().rituais.forEach(function (r) {
      if (r.dias.indexOf(dow) === -1) return;
      var marcados = r.itens.filter(function (i) { return store().feito('itens', i.id, iso); }).length;
      out.push({
        tipo: 'ritual', ref: r, id: r.id, titulo: r.titulo, hora: r.hora,
        duracao: Math.max(10, r.itens.length * 5), area: 'pessoal', fixo: false,
        nota: marcados + '/' + r.itens.length,
        feito: r.itens.length > 0 && marcados === r.itens.length
      });
    });

    return out.sort(function (a, b) {
      var ma = u.minutosDe(a.hora), mb = u.minutosDe(b.hora);
      if (ma === null && mb === null) return 0;
      if (ma === null) return 1;
      if (mb === null) return -1;
      return ma - mb;
    });
  }

  function porPeriodo(iso) {
    var grupos = { manha: [], tarde: [], noite: [], flex: [] };
    itensDoDia(iso).forEach(function (i) { grupos[u.periodoDe(i.hora)].push(i); });
    return grupos;
  }

  /* O que está acontecendo agora e o que vem em seguida. */
  function agoraEDepois(iso) {
    if (iso !== u.hoje()) return { agora: null, proximo: null };
    var min = u.agoraMin();
    var agora = null, proximo = null;

    itensDoDia(iso).forEach(function (i) {
      var ini = u.minutosDe(i.hora);
      if (ini === null) return;
      var fim = ini + (i.duracao || 30);
      if (min >= ini && min < fim) agora = i;
      else if (ini > min && (!proximo || ini < u.minutosDe(proximo.hora))) proximo = i;
    });

    return { agora: agora, proximo: proximo };
  }

  /* Intervalos ocupados, em minutos desde a meia-noite. */
  function ocupacao(iso) {
    return itensDoDia(iso)
      .filter(function (i) { return u.minutosDe(i.hora) !== null && i.duracao > 0; })
      .map(function (i) {
        var ini = u.minutosDe(i.hora);
        return { ini: ini, fim: ini + i.duracao, titulo: i.titulo, area: i.area, fixo: i.fixo, tipo: i.tipo };
      })
      .sort(function (a, b) { return a.ini - b.ini; });
  }

  /* Espaços livres de pelo menos `minimo` minutos. */
  function vagos(ocupados, de, ate, minimo) {
    var livres = [], cursor = de;
    ocupados.slice().sort(function (a, b) { return a.ini - b.ini; }).forEach(function (o) {
      if (o.ini > cursor) livres.push({ ini: cursor, fim: Math.min(o.ini, ate) });
      cursor = Math.max(cursor, o.fim);
    });
    if (cursor < ate) livres.push({ ini: cursor, fim: ate });
    return livres.filter(function (l) { return l.fim - l.ini >= (minimo || 15); });
  }

  /* ------------------------------------------- análise do dia -- */

  function tarefasDoDia(iso) {
    return e().tarefas.filter(function (t) { return !t.feita && t.data === iso; });
  }

  function minutosDeDescanso(iso) {
    return itensDoDia(iso).reduce(function (soma, i) {
      var descanso = i.area === 'descanso' || i.area === 'hobby' || i.area === 'pessoal';
      return soma + (descanso ? (i.duracao || 0) : 0);
    }, 0);
  }

  /* Devolve avisos gentis, cada um com uma ação opcional. */
  function analisarDia(iso) {
    var avisos = [];
    var itens = itensDoDia(iso);
    var tarefas = tarefasDoDia(iso);

    /* 1. O que foi acrescentado não cabe no que sobrou.
       A rotina que ela desenhou de propósito não é motivo de alarme:
       o aviso é sobre a carga extra — tarefas e compromissos do dia. */
    var livre = vagos(ocupacao(iso), acordar(), dormir(), 15)
      .reduce(function (soma, v) { return soma + (v.fim - v.ini); }, 0);
    var extra = tarefas.reduce(function (soma, t) { return soma + (t.estimativa || 30); }, 0);

    if (extra > 0 && extra > livre) {
      avisos.push({
        chave: 'cheio',
        tom: 'atencao',
        titulo: 'Seu dia está cheio demais',
        texto: 'São ' + u.horasTexto(extra) + ' de tarefas para ' + u.horasTexto(livre) +
               ' livres entre os compromissos. Quer escolher o que fica?',
        acao: { rotulo: 'Reorganizar', rota: '#/assistente?modo=reorganizar&dia=' + iso }
      });
    }

    /* 2. Coisas demais acrescentadas na mesma faixa do dia. */
    var faixas = [[6 * 60, 12 * 60, 'de manhã'], [12 * 60, 18 * 60, 'entre 12h e 18h'], [18 * 60, 24 * 60, 'à noite']];
    faixas.forEach(function (f) {
      /* Só compromissos entram aqui: tarefas não têm hora e já são
         tratadas pelo aviso anterior. */
      var eventos = itens.filter(function (i) {
        var m = u.minutosDe(i.hora);
        return i.tipo === 'evento' && m !== null && m >= f[0] && m < f[1];
      }).length;

      if (eventos >= 3) {
        avisos.push({
          chave: 'concentracao',
          tom: 'atencao',
          titulo: 'Muito compromisso ' + f[2],
          texto: 'São ' + eventos + ' compromissos nesse intervalo, além da sua rotina. Quer reorganizar?',
          acao: { rotulo: 'Ver sugestão', rota: '#/assistente?modo=reorganizar&dia=' + iso }
        });
      }
    });

    /* 3. Nenhum descanso previsto — o aviso mais importante do app */
    if (itens.length >= 3 && minutosDeDescanso(iso) < 30) {
      avisos.push({
        chave: 'descanso',
        tom: 'cuidado',
        titulo: 'Seu dia não tem nenhum período de descanso',
        texto: 'Quer reservar 30 minutos só para respirar?',
        acao: { rotulo: 'Reservar 30 min', executar: function () { return reservarDescanso(iso, 30); } }
      });
    }

    /* 4. Horários que se atropelam */
    /* Rituais são flexíveis, então não entram na conta de sobreposição. */
    var oc = ocupacao(iso).filter(function (o) { return o.tipo !== 'ritual'; });
    for (var k = 1; k < oc.length; k++) {
      if (oc[k].ini < oc[k - 1].fim) {
        avisos.push({
          chave: 'conflito',
          tom: 'atencao',
          titulo: 'Dois horários se sobrepõem',
          texto: '"' + oc[k - 1].titulo + '" e "' + oc[k].titulo + '" acontecem ao mesmo tempo, às ' + u.hhmm(oc[k].ini) + '.',
          acao: { rotulo: 'Ver agenda', rota: '#/agenda' }
        });
        break;
      }
    }

    /* 5. Noite curta */
    var horasDeSono = ((acordar() + 1440) - dormir()) / 60;
    if (horasDeSono < 7) {
      avisos.push({
        chave: 'sono',
        tom: 'cuidado',
        titulo: 'Sua noite está curta',
        texto: 'Entre dormir às ' + e().ajustes.dormir + ' e acordar às ' + e().ajustes.acordar +
               ' são ' + horasDeSono.toFixed(1).replace('.', ',') + ' horas. Dormir também é rotina.',
        acao: { rotulo: 'Ajustar horários', rota: '#/ajustes' }
      });
    }

    return avisos;
  }

  /* Encontra o primeiro espaço livre e cria um descanso ali. */
  function reservarDescanso(iso, minutos) {
    var livres = vagos(ocupacao(iso), Math.max(acordar(), iso === u.hoje() ? u.agoraMin() : acordar()), dormir(), minutos);
    if (!livres.length) return false;
    var alvo = livres.sort(function (a, b) { return (b.fim - b.ini) - (a.fim - a.ini); })[0];
    var inicio = alvo.ini;

    store().commit(function (s) {
      s.eventos.push({
        id: u.id(), titulo: 'Descanso', data: iso, hora: u.hhmm(inicio),
        duracao: minutos, area: 'descanso', local: '', nota: 'Reservado para você respirar.'
      });
    });
    return u.hhmm(inicio);
  }

  /* ------------------------------------ o que fazer agora ----- */

  /* Escolhe as melhores atividades para o tempo livre informado. */
  function melhorAgora(minutos, iso) {
    var hojeISO = iso || u.hoje();
    var candidatos = [];

    e().tarefas.forEach(function (t) {
      if (t.feita) return;
      var est = t.estimativa || 30;
      if (est > minutos + 5) return;
      var pontos = t.prioridade * 12;
      var motivo = [];
      if (t.prioridade === 3) motivo.push('é prioridade');
      if (t.data && t.data < hojeISO) { pontos += 20; motivo.push('está atrasada'); }
      else if (t.data === hojeISO) { pontos += 12; motivo.push('é de hoje'); }
      if (est <= minutos * 0.8) motivo.push('cabe no seu tempo');
      candidatos.push({
        tipo: 'tarefa', ref: t, titulo: t.titulo, minutos: est, area: t.area,
        pontos: pontos, porque: motivo.join(' e ')
      });
    });

    e().disciplinas.forEach(function (d) {
      d.topicos.forEach(function (t) {
        if (t.status === 'ok' && t.ultimaRevisao && u.diasEntre(t.ultimaRevisao, hojeISO) < 7) return;
        var est = Math.min(minutos, minutos >= 50 ? 50 : 25);
        if (est < 10) return;
        var pontos = t.status === 'estudando' ? 26 : (t.status === 'nao' ? 20 : 10);
        if (minutos >= 45) pontos += 6;   /* tempo longo pede conteúdo, não recado */
        var motivo = [t.status === 'estudando' ? 'você já começou esse conteúdo'
          : (t.status === 'ok' ? 'faz tempo que você não revisa' : 'ainda não foi estudado')];
        candidatos.push({
          tipo: 'estudo', ref: t, disciplina: d, titulo: 'Estudar ' + t.nome,
          minutos: est, area: 'estudo', pontos: pontos, porque: motivo.join('')
        });
      });
    });

    store().cuidadosDeHoje(hojeISO).forEach(function (c) {
      if (store().feito('cuidados', c.id, hojeISO)) return;
      var atraso = c.ultimaVez ? u.diasEntre(store().proximaVez(c), hojeISO) : 0;
      if (minutos < 10) return;
      candidatos.push({
        tipo: 'cuidado', ref: c, titulo: c.titulo, minutos: Math.min(minutos, 20), area: 'autocuidado',
        pontos: 14 + Math.min(atraso * 2, 12),
        porque: atraso > 0 ? 'está ' + u.plural(atraso, 'dia atrasado', 'dias atrasado') : 'é o dia dele'
      });
    });

    e().objetivos.forEach(function (o) {
      if (o.arquivado) return;
      var passo = o.passos.filter(function (p) { return !p.feito; })[0];
      if (!passo) return;
      var pontos = 12;
      var motivo = 'aproxima você do objetivo "' + o.titulo + '"';
      if (o.prazo) {
        var faltam = u.diasEntre(hojeISO, o.prazo);
        if (faltam >= 0 && faltam <= 7) { pontos += 14; motivo = 'faltam ' + u.plural(faltam, 'dia', 'dias') + ' para "' + o.titulo + '"'; }
      }
      candidatos.push({
        tipo: 'passo', ref: passo, objetivo: o, titulo: passo.titulo,
        minutos: Math.min(minutos, 30), area: 'pessoal', pontos: pontos, porque: motivo
      });
    });

    /* Se o dia está sem descanso, descansar vira a melhor sugestão. */
    if (minutosDeDescanso(hojeISO) < 30 && minutos >= 20) {
      candidatos.push({
        tipo: 'descanso', titulo: 'Descansar de verdade', minutos: Math.min(minutos, 45),
        area: 'descanso', pontos: 30, porque: 'seu dia ainda não teve pausa nenhuma'
      });
    }

    return candidatos.sort(function (a, b) { return b.pontos - a.pontos; }).slice(0, 3);
  }

  /* --------------------------------- assistente de texto ------ */

  var NUMEROS = {
    'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4, 'cinco': 5,
    'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'meia': 0.5, 'meio': 0.5
  };

  /* Palavra-chave → área, título sugerido e duração padrão. */
  var DICIONARIO = [
    { re: /(aula|escola|colegio|cursinho|faculdade)/, area: 'escola', titulo: 'Escola', dur: 240, fixo: true },
    { re: /(estud|revis|prova|vestibular|enem|exercicios de|materia|licao|dever)/, area: 'estudo', titulo: 'Estudo', dur: 60 },
    { re: /(academia|treino|exercicio|correr|corrida|caminhada|alongamento|pilates|danca)/, area: 'exercicio', titulo: 'Exercício', dur: 45 },
    { re: /(almoc)/, area: 'alimentacao', titulo: 'Almoço', dur: 45 },
    { re: /(jantar|janta)/, area: 'alimentacao', titulo: 'Jantar', dur: 40 },
    { re: /(cafe da manha|lanche|comer)/, area: 'alimentacao', titulo: 'Refeição', dur: 30 },
    { re: /(descans|relax|respirar|pausa|folga|nada)/, area: 'descanso', titulo: 'Descanso', dur: 60 },
    { re: /(dormir|deitar|sono|soneca|cochilo)/, area: 'sono', titulo: 'Dormir', dur: 30 },
    { re: /(arrumar|limpar|organizar|faxina|louca|roupa|quarto|casa|cozinha)/, area: 'casa', titulo: 'Arrumar a casa', dur: 45 },
    { re: /(skincare|cabelo|unha|banho|higiene|cuidar de mim|autocuidado|maquiagem)/, area: 'autocuidado', titulo: 'Autocuidado', dur: 30 },
    { re: /(orac|reza|rezar|missa|igreja|biblia|terco|rosario|adoracao|espiritual|meditar)/, area: 'espiritual', titulo: 'Momento de oração', dur: 20 },
    { re: /(consulta|dentista|medic|reuniao|encontro|compromisso|aniversario|entrevista|prova de)/, area: 'compromisso', titulo: 'Compromisso', dur: 60, fixo: true },
    { re: /(ler|leitura|desenh|filme|serie|musica|tocar|jogar|hobby|pintar|escrever)/, area: 'hobby', titulo: 'Hobby', dur: 45 },
    { re: /(passear|sair|amig|familia|conversar|namor)/, area: 'pessoal', titulo: 'Tempo com quem eu gosto', dur: 90 }
  ];

  function horaDoTexto(h, m) {
    var hora = Number(h);
    if (isNaN(hora)) return null;
    if (hora > 23) return null;
    return hora * 60 + (Number(m) || 0);
  }

  function extrairDuracao(t) {
    var mMin = t.match(/(\d{1,3})\s*(?:min|minutos?)\b/);
    if (mMin) return Number(mMin[1]);

    var mH = t.match(/(\d{1,2}|uma|duas|tres|quatro|cinco|meia)\s*(?:h\b|horas?\b)/);
    if (mH) {
      var v = NUMEROS[mH[1]] !== undefined ? NUMEROS[mH[1]] : Number(mH[1]);
      /* "às 8h" não é duração: só conta quando não há preposição de horário antes. */
      if (!/\b(as|às|ate|até|das|de)\s*$/.test(t.slice(0, mH.index).trim() + ' ')) return Math.round(v * 60);
    }
    return null;
  }

  function extrairFaixa(t) {
    var m = t.match(/(?:das?|de)\s*(\d{1,2})(?:[:h](\d{2}))?\s*(?:as|às|ate|até|a|-|until)\s*(\d{1,2})(?:[:h](\d{2}))?/);
    if (!m) return null;
    var ini = horaDoTexto(m[1], m[2]), fim = horaDoTexto(m[3], m[4]);
    if (ini === null || fim === null) return null;
    return { ini: ini, fim: fim > ini ? fim : fim + 720 };
  }

  function extrairFim(t) {
    if (/ate\s*o?\s*meio-?\s?dia/.test(t)) return 12 * 60;
    if (/ate\s*a?\s*meia-?\s?noite/.test(t)) return 24 * 60;
    var m = t.match(/ate\s*(?:as\s*)?(\d{1,2})(?:[:h](\d{2}))?/);
    return m ? horaDoTexto(m[1], m[2]) : null;
  }

  function extrairInicio(t) {
    if (/(as|às)\s*meio-?\s?dia/.test(t)) return 12 * 60;
    var m = t.match(/(?:as|às|comeca|comeco|inicio)\s*(\d{1,2})(?:[:h](\d{2}))?/);
    if (m) return horaDoTexto(m[1], m[2]);
    m = t.match(/\b(\d{1,2})[:h](\d{2})\b/);
    if (m) return horaDoTexto(m[1], m[2]);
    return null;
  }

  function classificar(seg) {
    for (var i = 0; i < DICIONARIO.length; i++) {
      if (DICIONARIO[i].re.test(seg)) return DICIONARIO[i];
    }
    return null;
  }

  /* Título natural a partir do trecho escrito, preservando os acentos. */
  function tituloDoSegmento(seg, padrao) {
    var limpo = String(seg)
      /* "amanhã", "hoje" e conjunções no começo da frase */
      .replace(/^\s*(?:hoje|amanhã|amanha|depois de amanhã|então|entao|aí|ai)\s+/i, '')
      .replace(/\b(preciso|quero|queria|gostaria de|tenho que|tenho|vou|hoje|amanhã|amanha|ainda|um pouco|de novo|por favor)\b/gi, ' ')
      /* durações primeiro: "40 minutos", "3 horas", "duas horas" */
      .replace(/\b\d{1,3}\s*(?:minutos?|mins?|horas?|hrs?|h)\b/gi, ' ')
      .replace(/\b(?:um|uma|dois|duas|três|tres|quatro|cinco|seis|meia|meio)\s+(?:minutos?|horas?)\b/gi, ' ')
      /* depois os horários: "das 8 às 12", "às 15h", "até meio-dia" */
      .replace(/\b(?:até|ate)\s*o?\s*meio-?\s?dia\b/gi, ' ')
      .replace(/\b(?:até|ate)\s*a?\s*meia-?\s?noite\b/gi, ' ')
      .replace(/\b(?:das?|de|às|as|até|ate)\s*\d{1,2}\s*(?::\d{2}|h\d{2}|h\b)?/gi, ' ')
      .replace(/[,;.]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*\b(de|da|do|em|por|pra|para|no|na|com)\s*$/i, '')
      .trim();

    if (limpo.length < 3 || limpo.length > 42) return padrao;
    return u.maiuscula(limpo);
  }

  /* Lê a frase e devolve os itens desejados, ainda sem horário definido. */
  function interpretar(texto) {
    var bruto = String(texto || '').replace(/\s+/g, ' ').trim();
    var segmentos = bruto
      .split(/\s*[,;.]\s*|\s+\be\b\s+|\s+\bdepois\b\s+|\s+\btamb[ée]m\b\s+/i)
      .map(function (x) { return (x || '').trim(); })
      .filter(function (x) { return x.length > 2; });

    var itens = [];
    segmentos.forEach(function (seg) {
      var sm = u.simples(seg);
      var d = classificar(sm);
      if (!d) return;

      var faixa = extrairFaixa(sm);
      var dur = extrairDuracao(sm);
      var inicio = faixa ? faixa.ini : extrairInicio(sm);
      var fim = faixa ? faixa.fim : extrairFim(sm);

      var duracao = dur || (fim !== null && inicio !== null ? fim - inicio : null) || d.dur;
      if (fim !== null && inicio === null && d.fixo) inicio = Math.max(0, fim - duracao);

      itens.push({
        titulo: tituloDoSegmento(seg, d.titulo),
        area: d.area,
        duracao: Math.max(10, Math.min(duracao, 480)),
        inicio: inicio,
        fixo: !!(d.fixo || faixa || inicio !== null)
      });
    });

    return itens;
  }

  /* Distribui os itens pelo dia, respeitando o que já existe na rotina. */
  function montarPlano(iso, itens) {
    var inicioDia = acordar(), fimDia = dormir();
    var ocupados = [];
    var plano = [];

    /* Tudo o que já está no dia continua valendo e vira âncora.
       Rituais são flexíveis: aparecem no plano, mas não bloqueiam horário. */
    itensDoDia(iso).forEach(function (i) {
      var ini = u.minutosDe(i.hora);
      if (ini === null || !i.duracao) return;
      if (i.tipo !== 'ritual') ocupados.push({ ini: ini, fim: ini + i.duracao });
      plano.push({
        hora: u.hhmm(ini), duracao: i.duracao, titulo: i.titulo, area: i.area,
        origem: 'existente', fixo: i.fixo || i.tipo === 'evento', flexivel: i.tipo === 'ritual'
      });
    });

    /* Depois, o que a frase pediu com horário marcado. */
    var pedidosFixos = itens.filter(function (i) { return i.fixo && i.inicio !== null; });
    pedidosFixos.forEach(function (i) {
      ocupados.push({ ini: i.inicio, fim: i.inicio + i.duracao });
      plano.push({ hora: u.hhmm(i.inicio), duracao: i.duracao, titulo: i.titulo, area: i.area, origem: 'pedido' });
    });

    /* Encaixa no primeiro espaço que comporta a atividade inteira;
       se nenhum couber, usa o maior espaço disponível. */
    function encaixar(titulo, duracao, area, origem, depoisDe) {
      var de = Math.max(inicioDia, depoisDe || inicioDia);
      var livres = vagos(ocupados, de, fimDia, 15);
      if (!livres.length) return null;

      var cabe = livres.filter(function (l) { return l.fim - l.ini >= duracao; })[0];
      var alvo = cabe || livres.slice().sort(function (a, b) { return (b.fim - b.ini) - (a.fim - a.ini); })[0];
      var dur = Math.min(duracao, alvo.fim - alvo.ini);
      if (dur < 10) return null;

      ocupados.push({ ini: alvo.ini, fim: alvo.ini + dur });
      plano.push({ hora: u.hhmm(alvo.ini), duracao: dur, titulo: titulo, area: area, origem: origem });
      return alvo.ini + dur;
    }

    /* Se um compromisso novo cai em cima de algo flexível da rotina,
       esse algo é remarcado em vez de simplesmente sumir. */
    var deslocados = [];
    if (pedidosFixos.length) {
      plano = plano.filter(function (p) {
        if (p.origem !== 'existente' || p.fixo || p.flexivel) return true;
        var ini = u.minutosDe(p.hora), fim = ini + p.duracao;
        var bate = pedidosFixos.some(function (i) { return ini < i.inicio + i.duracao && fim > i.inicio; });
        if (!bate) return true;
        ocupados = ocupados.filter(function (o) { return !(o.ini === ini && o.fim === fim); });
        deslocados.push(p);
        return false;
      });
    }
    deslocados.forEach(function (p) {
      encaixar(p.titulo, p.duracao, p.area, 'movido');
    });

    /* Refeição vira âncora quando o dia ainda não tem nenhuma no horário. */
    var temAlmoco = plano.some(function (p) {
      var m = u.minutosDe(p.hora);
      return p.area === 'alimentacao' && m >= 11 * 60 && m <= 15 * 60;
    });
    var pediuAlmoco = itens.some(function (i) { return i.area === 'alimentacao'; });
    if (!temAlmoco && !pediuAlmoco && fimDia > 13 * 60) {
      var livreAlmoco = vagos(ocupados, 12 * 60, 15 * 60, 30)[0];
      if (livreAlmoco) {
        ocupados.push({ ini: livreAlmoco.ini, fim: livreAlmoco.ini + 45 });
        plano.push({ hora: u.hhmm(livreAlmoco.ini), duracao: 45, titulo: 'Almoço', area: 'alimentacao', origem: 'sugerido' });
      }
    }

    /* Os flexíveis, na ordem pedida. Estudo longo é quebrado com pausas. */
    itens.filter(function (i) { return !(i.fixo && i.inicio !== null); }).forEach(function (i) {
      if (i.area === 'estudo' && i.duracao > 60) {
        var restante = i.duracao, n = 0, cursor = null;
        while (restante > 0 && n < 4) {
          var pedaco = Math.min(60, restante);
          cursor = encaixar(i.titulo + (n ? ' (parte ' + (n + 1) + ')' : ''), pedaco, i.area, 'plano', cursor);
          if (cursor === null) break;
          restante -= pedaco;
          if (restante > 0) cursor = encaixar('Pausa', 15, 'descanso', 'pausa', cursor);
          n++;
        }
      } else {
        encaixar(i.titulo, i.duracao, i.area, 'plano');
      }
    });

    /* Descanso é obrigatório: se o plano não tem nenhum, o app reserva. */
    var temDescanso = plano.some(function (p) {
      return (p.area === 'descanso' || p.area === 'hobby') && p.duracao >= 30;
    });
    if (!temDescanso) encaixar('Descanso', 45, 'descanso', 'cuidado');

    plano.sort(function (a, b) { return u.minutosDe(a.hora) - u.minutosDe(b.hora); });

    /* O que sobrar no fim do dia é tempo livre, não tarefa. */
    var ultimo = plano.reduce(function (max, p) { return Math.max(max, u.minutosDe(p.hora) + p.duracao); }, inicioDia);
    if (fimDia - ultimo >= 45) {
      plano.push({ hora: u.hhmm(ultimo), duracao: fimDia - ultimo, titulo: 'Tempo livre', area: 'pessoal', origem: 'livre' });
    }

    return plano;
  }

  function planejarTexto(texto, iso) {
    var itens = interpretar(texto);
    return { itens: itens, plano: itens.length ? montarPlano(iso, itens) : [] };
  }

  /* Grava o plano aceito como compromissos daquele dia. */
  function aplicarPlano(iso, plano, substituirRotina) {
    store().commit(function (s) {
      s.eventos = s.eventos.filter(function (ev) { return ev.data !== iso || ev.origemPlano !== true; });
      plano.forEach(function (p) {
        if (p.origem === 'existente') return;
        s.eventos.push({
          id: u.id(), titulo: p.titulo, data: iso, hora: p.hora, duracao: p.duracao,
          area: p.area, local: '', nota: '', origemPlano: true
        });
      });
      if (substituirRotina) store().dia(iso).somentePlano = true;
    });
  }

  /* ------------------------------------- estudos: distribuir -- */

  /* Espalha conteúdos pelos dias até o prazo, virando tarefas de estudo. */
  function distribuirEstudos(topicoIds, ate, minutosPorDia) {
    var inicio = u.hoje();
    var total = Math.max(1, u.diasEntre(inicio, ate) + 1);
    var dias = [];
    for (var i = 0; i < total; i++) dias.push(u.somarDias(inicio, i));

    var criadas = [];
    topicoIds.forEach(function (tid, idx) {
      var t = store().topico(tid);
      if (!t) return;
      var d = store().disciplinaDoTopico(tid);
      var dia = dias[idx % dias.length];
      criadas.push({
        id: u.id(),
        titulo: 'Estudar ' + t.nome + (d ? ' · ' + d.nome : ''),
        data: dia, feita: false, prioridade: 3,
        estimativa: minutosPorDia || 40, area: 'estudo',
        objetivoId: null, criadaEm: inicio, topicoId: tid
      });
    });

    store().commit(function (s) { s.tarefas = s.tarefas.concat(criadas); });
    return criadas;
  }

  /* ------------------------------------------ painel semanal -- */

  function resumoSemana(iso) {
    var dias = u.diasDaSemana(iso || u.hoje());
    var estudoMin = 0, descansoMin = 0, exercicios = 0, autocuidado = 0, espiritual = 0;
    var sono = [], concluidas = 0, previstas = 0, diasComDescanso = 0;

    e().sessoes.forEach(function (s) {
      if (dias.indexOf(s.data) !== -1) estudoMin += s.minutos;
    });

    dias.forEach(function (d) {
      var teveDescanso = false;
      itensDoDia(d).forEach(function (i) {
        if (!i.feito) return;
        if (i.area === 'estudo' || i.area === 'escola') estudoMin += i.duracao || 0;
        if (i.area === 'descanso' || i.area === 'hobby') { descansoMin += i.duracao || 0; teveDescanso = true; }
        if (i.area === 'exercicio') exercicios++;
        if (i.area === 'autocuidado') autocuidado++;
      });
      if (teveDescanso) diasComDescanso++;

      var reg = e().registro[d] || {};
      autocuidado += Object.keys(reg.cuidados || {}).length;
      espiritual += Object.keys(reg.praticas || {}).length;
      if (reg.revisao && reg.revisao.sono) sono.push(Number(reg.revisao.sono));

      e().tarefas.forEach(function (t) {
        if (t.data !== d) return;
        previstas++;
        if (t.feita) concluidas++;
      });
    });

    var mediaSono = sono.length ? (sono.reduce(function (a, b) { return a + b; }, 0) / sono.length) : null;

    return {
      dias: dias,
      estudoMin: estudoMin,
      descansoMin: descansoMin,
      exercicios: exercicios,
      autocuidado: autocuidado,
      espiritual: espiritual,
      mediaSono: mediaSono,
      diasComDescanso: diasComDescanso,
      tarefas: { feitas: concluidas, total: previstas, pct: u.pct(concluidas, previstas) }
    };
  }

  /* Leitura gentil da semana — elogia o que houve, não cobra o que faltou. */
  function leituraDaSemana(r) {
    var frases = [];
    if (r.estudoMin >= 300) frases.push('Você estudou ' + u.horasTexto(r.estudoMin) + ' — é bastante coisa.');
    else if (r.estudoMin > 0) frases.push('Foram ' + u.horasTexto(r.estudoMin) + ' de estudo nesta semana.');

    if (r.diasComDescanso >= 5) frases.push('E, o mais importante: você descansou quase todos os dias.');
    else if (r.diasComDescanso >= 2) frases.push('Você conseguiu descansar em ' + u.plural(r.diasComDescanso, 'dia', 'dias') + '.');
    else frases.push('Quase não houve pausa nesta semana. Que tal reservar uma para a próxima?');

    if (r.mediaSono !== null) {
      frases.push(r.mediaSono >= 7.5
        ? 'Sua média de sono foi boa: ' + r.mediaSono.toFixed(1).replace('.', ',') + 'h por noite.'
        : 'A média de sono ficou em ' + r.mediaSono.toFixed(1).replace('.', ',') + 'h — seu corpo agradece um pouco mais.');
    }

    if (r.exercicios) frases.push(u.plural(r.exercicios, 'sessão de exercício', 'sessões de exercício') + ' também entraram na conta.');

    return frases;
  }

  /* ------------------------------------------ frase do dia ---- */

  var FRASES = [
    'Viva bem o dia de hoje.',
    'Uma coisa de cada vez.',
    'Descansar também é cumprir a rotina.',
    'Comece pequeno; começar já é bastante.',
    'O que importa hoje cabe em poucas linhas.',
    'Você não precisa dar conta de tudo ao mesmo tempo.',
    'Faça com calma o que dá para fazer com calma.',
    'Seu ritmo é um ritmo válido.',
    'Cuidar de você faz parte do plano.',
    'O dia é seu; a lista é só um apoio.'
  ];

  function fraseDoDia(iso) {
    var d = u.fromISO(iso || u.hoje());
    var n = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % FRASES.length;
    return FRASES[n];
  }

  /* ------------------------------- calendário litúrgico -------- */

  /* Domingo de Páscoa pelo cálculo de Gauss/Meeus (rito romano). */
  function pascoa(ano) {
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    var d = Math.floor(b / 4), e2 = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e2 + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31);
    var dia = ((h + l - 7 * m + 114) % 31) + 1;
    return u.toISO(new Date(ano, mes - 1, dia));
  }

  /* Cores litúrgicas: violeta (Advento/Quaresma), ouro (Natal/Páscoa),
     rubro (Pentecostes) e verde (Tempo Comum), em versões para papel e
     para tinta escura. São elas que dão o acento da interface. */
  var PALETA = {
    Advento:        { claro: ['#5A4E77', '#EFEDF4', '#493E63'], escuro: ['#A99CC9', '#232037', '#BDB2DA'] },
    Natal:          { claro: ['#8A6D2F', '#F8F1E1', '#6F5722'], escuro: ['#C9A961', '#2A2416', '#DCC07E'] },
    Quaresma:       { claro: ['#574A63', '#EEECF1', '#443A4E'], escuro: ['#9E93AE', '#211E27', '#B4A9C3'] },
    'Páscoa':       { claro: ['#93722F', '#F9F2E0', '#775B21'], escuro: ['#D2B268', '#2B2517', '#E3C888'] },
    Pentecostes:    { claro: ['#8C2F39', '#F6EDEA', '#73242D'], escuro: ['#C4737B', '#2C1F20', '#D68D94'] },
    'Tempo Comum':  { claro: ['#4C6650', '#EDF1EA', '#3C5240'], escuro: ['#8FA98A', '#22271F', '#A6BCA0'] }
  };

  function tempoLiturgico(iso) {
    var data = iso || u.hoje();
    var ano = u.fromISO(data).getFullYear();
    var p = pascoa(ano);
    var cinzas = u.somarDias(p, -46);
    var pentecostes = u.somarDias(p, 49);
    var natal = ano + '-12-25';

    /* Primeiro domingo do Advento: quatro domingos antes do Natal. */
    var dowNatal = u.diaDaSemana(natal);
    var advento = u.somarDias(natal, -(dowNatal === 0 ? 28 : 21 + dowNatal));

    var tempo, nota;
    if (data === pentecostes) { tempo = 'Pentecostes'; nota = 'Solenidade do Espírito Santo.'; }
    else if (data >= advento && data < natal) { tempo = 'Advento'; nota = 'Tempo de espera e preparação.'; }
    else if (data >= natal || data <= ano + '-01-06') { tempo = 'Natal'; nota = 'Tempo de alegria.'; }
    else if (data >= cinzas && data < p) { tempo = 'Quaresma'; nota = 'Tempo de silêncio e conversão.'; }
    else if (data >= p && data <= pentecostes) { tempo = 'Páscoa'; nota = 'Tempo de vida nova.'; }
    else { tempo = 'Tempo Comum'; nota = 'Tempo de caminhada cotidiana.'; }

    var par = PALETA[tempo] || PALETA['Tempo Comum'];
    return {
      tempo: tempo,
      nota: nota,
      cor: par.claro[0],
      paleta: par,
      /* datas de referência, úteis para quem quiser conferir */
      pascoa: p, cinzas: cinzas, pentecostes: pentecostes, advento: advento
    };
  }

  /* Trio [cor, suave, forte] para o tema em uso. */
  function paletaLiturgica(iso, escuro) {
    var lit = tempoLiturgico(iso);
    return { tempo: lit.tempo, cores: escuro ? lit.paleta.escuro : lit.paleta.claro };
  }

  App.motor = {
    acordar: acordar,
    dormir: dormir,
    somentePlano: somentePlano,
    itensDoDia: itensDoDia,
    porPeriodo: porPeriodo,
    agoraEDepois: agoraEDepois,
    ocupacao: ocupacao,
    vagos: vagos,
    tarefasDoDia: tarefasDoDia,
    minutosDeDescanso: minutosDeDescanso,
    analisarDia: analisarDia,
    reservarDescanso: reservarDescanso,
    melhorAgora: melhorAgora,
    interpretar: interpretar,
    montarPlano: montarPlano,
    planejarTexto: planejarTexto,
    aplicarPlano: aplicarPlano,
    distribuirEstudos: distribuirEstudos,
    resumoSemana: resumoSemana,
    leituraDaSemana: leituraDaSemana,
    fraseDoDia: fraseDoDia,
    tempoLiturgico: tempoLiturgico,
    paletaLiturgica: paletaLiturgica
  };
})();
