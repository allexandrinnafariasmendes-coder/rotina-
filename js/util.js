/* Funções auxiliares: datas, horários, formatação e criação de elementos. */
(function () {
  'use strict';

  var App = window.App || (window.App = {});

  var DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DIAS_MINI = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function maiuscula(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* Datas sempre no fuso local, no formato AAAA-MM-DD. */
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function hoje() { return toISO(new Date()); }
  function agoraMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

  function somarDias(iso, n) {
    var d = fromISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  function diasEntre(a, b) {
    return Math.round((fromISO(b) - fromISO(a)) / 86400000);
  }

  function diaDaSemana(iso) { return fromISO(iso).getDay(); }

  function dataLonga(iso) {
    var d = fromISO(iso);
    return maiuscula(DIAS_LONGOS[d.getDay()]) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  }

  function dataCurta(iso) {
    var d = fromISO(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  }

  function dataRelativa(iso) {
    if (!iso) return 'algum dia';
    var h = hoje();
    if (iso === h) return 'hoje';
    if (iso === somarDias(h, 1)) return 'amanhã';
    if (iso === somarDias(h, -1)) return 'ontem';
    var d = diasEntre(h, iso);
    if (d > 1 && d < 7) return DIAS_CURTOS[diaDaSemana(iso)].toLowerCase() + ' (' + dataCurta(iso) + ')';
    return dataCurta(iso);
  }

  function ultimosDias(n, ate) {
    var fim = ate || hoje(), out = [];
    for (var i = n - 1; i >= 0; i--) out.push(somarDias(fim, -i));
    return out;
  }

  /* Semana de segunda a domingo contendo a data. */
  function inicioDaSemana(iso) {
    var dow = diaDaSemana(iso);
    return somarDias(iso, dow === 0 ? -6 : 1 - dow);
  }

  function diasDaSemana(iso) {
    var ini = inicioDaSemana(iso), out = [];
    for (var i = 0; i < 7; i++) out.push(somarDias(ini, i));
    return out;
  }

  /* -------------------------------------------------- horários */

  function minutosDe(hhmm) {
    if (!hhmm) return null;
    var p = String(hhmm).split(':');
    var h = Number(p[0]), m = Number(p[1] || 0);
    if (isNaN(h)) return null;
    return h * 60 + m;
  }

  function hhmm(min) {
    var m = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function faixa(hora, duracao) {
    var ini = minutosDe(hora);
    if (ini === null) return '';
    if (!duracao) return hora;
    return hora + '–' + hhmm(ini + duracao);
  }

  function duracaoTexto(min) {
    if (!min) return '';
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return m ? h + 'h' + pad(m) : h + 'h';
  }

  function horasTexto(min) {
    if (!min) return '0h';
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return m ? h + 'h' + pad(m) : h + 'h';
  }

  function periodoDe(hora) {
    var m = minutosDe(hora);
    if (m === null) return 'flex';
    if (m < 12 * 60) return 'manha';
    if (m < 18 * 60) return 'tarde';
    return 'noite';
  }

  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function pct(feito, total) { return total ? Math.round((feito / total) * 100) : 0; }

  function plural(n, um, muitos) { return n + ' ' + (n === 1 ? um : muitos); }

  /* Texto sem acento e em minúsculas, para comparações do assistente. */
  function simples(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /* Criação de elementos: el('div.card', {onclick: fn}, [filhos]) */
  function el(spec, attrs, filhos) {
    var partes = String(spec).split('.');
    var node = document.createElement(partes.shift() || 'div');
    if (partes.length) node.className = partes.join(' ');

    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v === true ? '' : v);
    });

    [].concat(filhos === undefined ? [] : filhos).forEach(function (f) {
      if (f === null || f === undefined || f === false) return;
      node.appendChild(typeof f === 'string' || typeof f === 'number'
        ? document.createTextNode(String(f)) : f);
    });

    return node;
  }

  App.util = {
    DIAS_CURTOS: DIAS_CURTOS, DIAS_MINI: DIAS_MINI, DIAS_LONGOS: DIAS_LONGOS, MESES: MESES,
    pad: pad, maiuscula: maiuscula, toISO: toISO, fromISO: fromISO, hoje: hoje, agoraMin: agoraMin,
    somarDias: somarDias, diasEntre: diasEntre, diaDaSemana: diaDaSemana,
    dataLonga: dataLonga, dataCurta: dataCurta, dataRelativa: dataRelativa,
    ultimosDias: ultimosDias, inicioDaSemana: inicioDaSemana, diasDaSemana: diasDaSemana,
    minutosDe: minutosDe, hhmm: hhmm, faixa: faixa, duracaoTexto: duracaoTexto, horasTexto: horasTexto,
    periodoDe: periodoDe, id: id, pct: pct, plural: plural, simples: simples, el: el
  };
})();
