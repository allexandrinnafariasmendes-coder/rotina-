/* Rotina de exemplo — o quadro que vem junto com o app.

   É a única parte do projeto pensada para ser trocada: escreva aqui a sua
   rotina, ou apague tudo e monte pelo próprio app. `id` identifica o quadro,
   `versao` sobe a cada mudança e `notas` conta o que mudou, para o app poder
   avisar e aplicar sem apagar marcações. */
(function () {
  'use strict';

  var App = window.App || (window.App = {});

  App.rotinaBase = {
    id: 'exemplo',
    nome: 'Rotina de exemplo',
    versao: 1,
    notas: {},

    montar: function (u) {
      var todos = [0, 1, 2, 3, 4, 5, 6];
      var semana = [1, 2, 3, 4, 5];

      function bloco(chave, titulo, hora, duracao, dias, area, fixo, nota) {
        return { id: u.id(), chave: chave, titulo: titulo, hora: hora, duracao: duracao,
                 dias: dias, area: area, fixo: !!fixo, nota: nota || '' };
      }

      return {
        blocos: [
          bloco('acordar', 'Acordar', '06:30', 20, todos, 'sono', true, ''),
          bloco('oracao-manha', 'Momento de silêncio', '06:50', 20, todos, 'espiritual', false, ''),
          bloco('cafe', 'Café da manhã', '07:15', 30, todos, 'alimentacao', false, ''),
          bloco('manha-semana', 'Trabalho / Estudos', '08:00', 240, semana, 'estudo', true, ''),
          bloco('casa-sabado', 'Casa e organização', '09:00', 120, [6], 'casa', false, ''),
          bloco('missa-domingo', 'Missa', '09:00', 90, [0], 'espiritual', true, ''),
          bloco('almoco', 'Almoço', '12:30', 45, todos, 'alimentacao', false, ''),
          bloco('descanso-tarde', 'Descanso', '13:15', 45, todos, 'descanso', false, 'Descansar também é parte do dia.'),
          bloco('tarde-semana', 'Trabalho / Estudos', '14:00', 180, semana, 'estudo', false, ''),
          bloco('tarde-fds', 'Tempo com quem eu gosto', '14:00', 180, [0, 6], 'pessoal', false, ''),
          bloco('exercicio', 'Exercício', '18:00', 45, [1, 3, 5], 'exercicio', false, ''),
          bloco('jantar', 'Jantar', '19:30', 40, todos, 'alimentacao', false, ''),
          bloco('leitura', 'Leitura ou hobby', '20:30', 60, todos, 'hobby', false, ''),
          bloco('dormir', 'Dormir', '22:30', 0, todos, 'sono', true, '')
        ],

        eventos: [],

        rituais: [
          { id: u.id(), chave: 'rotina-manha', titulo: 'Rotina da manhã', periodo: 'manha', hora: '06:30', dias: todos, itens: [
            { id: u.id(), titulo: 'Beber água' },
            { id: u.id(), titulo: 'Arrumar a cama' },
            { id: u.id(), titulo: 'Higiene' }
          ] },
          { id: u.id(), chave: 'rotina-noite', titulo: 'Rotina noturna', periodo: 'noite', hora: '21:30', dias: todos, itens: [
            { id: u.id(), titulo: 'Guardar o celular' },
            { id: u.id(), titulo: 'Preparar as coisas de amanhã' },
            { id: u.id(), titulo: 'Revisar o dia' }
          ] }
        ],

        cuidados: [],
        objetivos: [],
        disciplinas: [],
        sessoes: [],
        tarefas: [],

        alternativas: [
          { id: u.id(), quando: 'Se não conseguir estudar', saida: 'Leia alguma coisa boa ou revise anotações.' },
          { id: u.id(), quando: 'Se não puder treinar', saida: 'Caminhada leve ou alongamento.' },
          { id: u.id(), quando: 'Se o dia estiver pesado', saida: 'Faça só o essencial e descanse sem culpa.' }
        ],

        prioridades: [
          'Dormir bem',
          'Comer com calma',
          'Mover o corpo',
          'Tempo com quem eu gosto',
          'Um momento de silêncio'
        ],

        lema: '',

        espiritual: {
          praticas: [{ id: u.id(), titulo: 'Momento de silêncio', momento: 'manha' }],
          intencoes: [],
          diario: []
        }
      };
    }
  };
})();
