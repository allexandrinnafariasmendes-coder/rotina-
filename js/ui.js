/* Peças de interface reaproveitadas por todas as telas. */
(function () {
  'use strict';

  var App = window.App;
  var u = App.util;
  var el = u.el;

  var fundo, painel, painelTitulo, painelForm, recadoEl, recadoTimer;

  function iniciar() {
    fundo = document.getElementById('fundoPainel');
    painel = document.getElementById('painel');
    painelTitulo = document.getElementById('painelTitulo');
    painelForm = document.getElementById('painelForm');
    recadoEl = document.getElementById('recado');

    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !fundo.hidden) fechar();
    });
  }

  function aviso(msg) {
    recadoEl.textContent = msg;
    recadoEl.hidden = false;
    clearTimeout(recadoTimer);
    recadoTimer = setTimeout(function () { recadoEl.hidden = true; }, 2400);
  }

  function fechar() {
    fundo.hidden = true;
    painelForm.innerHTML = '';
    painelForm.onsubmit = null;
  }

  /* ---------------------------------------- formulário em painel */

  function campo(def, valores) {
    var wrap = el('div.campo');
    var idc = 'c_' + def.nome;
    var ler;

    wrap.appendChild(el('label', { for: def.tipo === 'dias' || def.tipo === 'opcoes' ? null : idc, text: def.rotulo }));

    if (['texto', 'hora', 'numero', 'data'].indexOf(def.tipo) !== -1) {
      var tipos = { texto: 'text', hora: 'time', numero: 'number', data: 'date' };
      var input = el('input', {
        id: idc, type: tipos[def.tipo],
        value: valores[def.nome] === null || valores[def.nome] === undefined ? '' : valores[def.nome],
        placeholder: def.dica || '', min: def.min, max: def.max, step: def.passo,
        inputmode: def.tipo === 'numero' ? 'numeric' : null, autocomplete: 'off'
      });
      wrap.appendChild(input);
      ler = function () {
        var v = input.value.trim();
        return def.tipo === 'numero' ? (v === '' ? 0 : Number(v)) : v;
      };

    } else if (def.tipo === 'texto-longo') {
      var area = el('textarea', { id: idc, placeholder: def.dica || '', rows: def.linhas || 3 });
      area.value = valores[def.nome] || '';
      wrap.appendChild(area);
      ler = function () { return area.value.trim(); };

    } else if (def.tipo === 'selecao') {
      var sel = el('select', { id: idc }, def.opcoes.map(function (o) {
        return el('option', { value: o.valor, text: o.rotulo, selected: String(valores[def.nome]) === String(o.valor) });
      }));
      wrap.appendChild(sel);
      ler = function () { return sel.value; };

    } else if (def.tipo === 'opcoes') {
      var escolhido = valores[def.nome];
      var caixa = el('div.opcoes');
      def.opcoes.forEach(function (o) {
        var b = el('button.opcao', {
          type: 'button', text: o.rotulo,
          'aria-pressed': String(escolhido) === String(o.valor) ? 'true' : 'false',
          onclick: function () {
            escolhido = o.valor;
            Array.prototype.forEach.call(caixa.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
          }
        });
        caixa.appendChild(b);
      });
      wrap.appendChild(caixa);
      ler = function () { return escolhido; };

    } else if (def.tipo === 'dias') {
      var marcados = (valores[def.nome] || []).slice();
      var linha = el('div.dias');
      u.DIAS_MINI.forEach(function (letra, i) {
        var ativo = marcados.indexOf(i) !== -1;
        var p = el('button.dias__pilula', {
          type: 'button', text: letra, title: u.DIAS_CURTOS[i],
          'aria-pressed': ativo ? 'true' : 'false',
          onclick: function () {
            var pos = marcados.indexOf(i);
            if (pos === -1) marcados.push(i); else marcados.splice(pos, 1);
            p.setAttribute('aria-pressed', pos === -1 ? 'true' : 'false');
          }
        });
        linha.appendChild(p);
      });
      wrap.appendChild(linha);
      ler = function () { return marcados.slice().sort(); };

    } else if (def.tipo === 'alternar') {
      var check = el('input', { id: idc, type: 'checkbox' });
      check.checked = !!valores[def.nome];
      check.style.width = 'auto';
      check.style.justifySelf = 'start';
      wrap.appendChild(check);
      ler = function () { return check.checked; };

    } else if (def.tipo === 'lista') {
      /* Lista editável de textos curtos (itens de ritual, passos de objetivo). */
      var itens = (valores[def.nome] || []).map(function (x) {
        return typeof x === 'string' ? { titulo: x } : Object.assign({}, x);
      });
      var caixaLista = el('div.pilha.pilha--junta');

      function desenhar() {
        caixaLista.innerHTML = '';
        itens.forEach(function (item, i) {
          var inp = el('input', {
            type: 'text', value: item.titulo, placeholder: 'Item',
            oninput: function () { item.titulo = inp.value; }
          });
          caixaLista.appendChild(el('div', { style: 'display:flex;gap:8px' }, [
            inp,
            el('button.btn.btn--p.btn--fantasma', {
              type: 'button', text: '×', 'aria-label': 'Remover item',
              onclick: function () { itens.splice(i, 1); desenhar(); }
            })
          ]));
        });
        caixaLista.appendChild(el('button.btn.btn--p.btn--suave', {
          type: 'button', text: '+ Adicionar item',
          onclick: function () { itens.push({ id: u.id(), titulo: '' }); desenhar(); }
        }));
      }
      desenhar();
      wrap.appendChild(caixaLista);
      ler = function () {
        return itens.filter(function (i) { return i.titulo.trim(); })
          .map(function (i) { return { id: i.id || u.id(), titulo: i.titulo.trim(), feito: !!i.feito }; });
      };
    }

    if (def.ajuda) wrap.appendChild(el('div.campo__dica', { text: def.ajuda }));
    return { node: wrap, ler: ler, def: def };
  }

  function abrirFormulario(op) {
    painelTitulo.textContent = op.titulo;
    painelForm.innerHTML = '';

    var valores = op.valores || {};
    var campos = op.campos.map(function (def) { return campo(def, valores); });

    campos.forEach(function (c) {
      var ultimo = painelForm.lastChild;
      if (c.def.junto && ultimo && ultimo.classList && ultimo.classList.contains('duo') && ultimo.childElementCount < 2) {
        ultimo.appendChild(c.node);
      } else if (c.def.junto) {
        painelForm.appendChild(el('div.duo', {}, [c.node]));
      } else {
        painelForm.appendChild(c.node);
      }
    });

    var acoes = el('div.linha-btn.linha-btn--fim', { style: 'margin-top:6px' }, [
      op.aoExcluir ? el('button.btn.btn--perigo', {
        type: 'button', text: 'Excluir',
        onclick: function () {
          if (confirm('Excluir "' + (valores.titulo || 'este item') + '"?')) { op.aoExcluir(); fechar(); }
        }
      }) : null,
      el('button.btn.btn--fantasma', { type: 'button', text: 'Cancelar', onclick: fechar }),
      el('button.btn.btn--principal', { type: 'submit', text: op.rotuloSalvar || 'Salvar' })
    ]);
    painelForm.appendChild(acoes);

    painelForm.onsubmit = function (ev) {
      ev.preventDefault();
      var out = {}, faltando = null;
      campos.forEach(function (c) {
        var v = c.ler();
        out[c.def.nome] = v;
        if (c.def.obrigatorio && (v === '' || v === null || (Array.isArray(v) && !v.length))) {
          faltando = faltando || c.def.rotulo;
        }
      });
      if (faltando) { aviso('Falta preencher: ' + faltando); return; }
      if (op.aoSalvar(out) !== false) fechar();
    };

    fundo.hidden = false;
    var primeiro = painelForm.querySelector('input[type="text"], textarea');
    if (primeiro) setTimeout(function () { primeiro.focus(); }, 80);
  }

  /* Painel com conteúdo livre (não é formulário). */
  function abrirPainel(titulo, filhos) {
    painelTitulo.textContent = titulo;
    painelForm.innerHTML = '';
    painelForm.onsubmit = function (ev) { ev.preventDefault(); };
    [].concat(filhos).forEach(function (f) { if (f) painelForm.appendChild(f); });
    fundo.hidden = false;
  }

  /* ------------------------------------------------- componentes */

  function ponto(cor) { return el('span.ponto', { style: 'background:' + cor }); }

  function etiqueta(texto, cor) {
    return el('span.etiqueta' + (cor ? '.etiqueta--' + cor : ''), { text: texto });
  }

  /* Item da linha do dia. */
  function itemLinha(op) {
    var classes = 'div.item' + (op.feito ? '.item--feito' : '') + (op.agora ? '.item--agora' : '')
      + (op.aoAbrir ? '.item--clicavel' : '');
    return el(classes, {}, [
      op.hora !== undefined ? el('span.item__hora', { text: op.hora || '—' }) : null,
      el('div.item__corpo', { onclick: op.aoAbrir || null }, [
        el('div.item__titulo', { text: op.titulo }),
        op.meta && op.meta.length ? el('div.item__meta', {}, op.meta) : null,
        op.nota ? el('div.item__nota', { text: op.nota }) : null,
        op.extra || null
      ]),
      op.aoMarcar ? el('button.check', {
        type: 'button', text: '✓',
        'aria-pressed': op.feito ? 'true' : 'false',
        'aria-label': (op.feito ? 'Desmarcar ' : 'Marcar ') + op.titulo,
        onclick: op.aoMarcar
      }) : (op.direita || null)
    ]);
  }

  function linhaCheck(titulo, feito, aoMarcar) {
    return el('div.check-linha' + (feito ? '.check-linha--feito' : ''), { onclick: aoMarcar }, [
      el('button.check', {
        type: 'button', text: '✓', 'aria-pressed': feito ? 'true' : 'false',
        'aria-label': (feito ? 'Desmarcar ' : 'Marcar ') + titulo,
        onclick: function (ev) { ev.stopPropagation(); aoMarcar(); }
      }),
      el('span', { text: titulo })
    ]);
  }

  function tituloSecao(texto, direita) {
    return el('div.titulo-secao', {}, [
      el('h2', { text: texto }),
      typeof direita === 'string' ? el('span', { text: direita }) : (direita || null)
    ]);
  }

  /* Ornamento tipográfico: filete, losango, filete. Usado com parcimônia. */
  function ornamento() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 96 12');
    svg.setAttribute('aria-hidden', 'true');

    function traco(x1, x2) {
      var l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', '6');
      l.setAttribute('x2', x2); l.setAttribute('y2', '6');
      l.setAttribute('stroke', 'currentColor');
      l.setAttribute('stroke-width', '1');
      return l;
    }
    var losango = document.createElementNS(ns, 'path');
    losango.setAttribute('d', 'M48 2.4l3.4 3.6L48 9.6 44.6 6z');
    losango.setAttribute('fill', 'currentColor');

    svg.appendChild(traco(6, 40));
    svg.appendChild(losango);
    svg.appendChild(traco(56, 90));

    return el('div.ornamento', {}, [svg]);
  }

  function vazio(titulo, texto) {
    return el('div.vazio', {}, [el('strong', { text: titulo }), texto || '']);
  }

  function avisoCartao(a) {
    return el('div.aviso.aviso--' + (a.tom || 'cuidado'), {}, [
      el('div.aviso__titulo', { text: a.titulo }),
      el('div.aviso__texto', { text: a.texto }),
      a.acao ? el('button.btn.btn--p', {
        type: 'button', text: a.acao.rotulo,
        onclick: function () {
          if (a.acao.rota) location.hash = a.acao.rota;
          else if (a.acao.executar) {
            var r = a.acao.executar();
            aviso(r ? 'Pronto, reservei às ' + r : 'Não achei espaço livre no dia');
            App.render();
          }
        }
      }) : null
    ]);
  }

  function barraProgresso(porcento) {
    return el('div.progresso', { role: 'img', 'aria-label': porcento + '% concluído' }, [
      el('div.progresso__barra', { style: 'width:' + Math.max(2, porcento) + '%' })
    ]);
  }

  App.ui = {
    iniciar: iniciar, aviso: aviso, fechar: fechar,
    abrirFormulario: abrirFormulario, abrirPainel: abrirPainel,
    ponto: ponto, etiqueta: etiqueta, itemLinha: itemLinha, linhaCheck: linhaCheck,
    tituloSecao: tituloSecao, ornamento: ornamento, vazio: vazio, avisoCartao: avisoCartao, barraProgresso: barraProgresso
  };
})();
