# Minha Rotina

Uma central de vida pessoal — não uma lista de tarefas. O aplicativo organiza o
dia, a agenda, os estudos, os hábitos, o autocuidado, a espiritualidade, o
descanso e os objetivos em um só lugar, **sem conta, sem internet e sem enviar
nada para lugar nenhum**: tudo fica salvo no armazenamento do próprio aparelho.

> Organizar a vida para vivê-la melhor — não viver para cumprir a organização.

## Como abrir

**Arquivo único (mais simples).** `minha-rotina.html` tem o app inteiro dentro
de um arquivo só — estilo, código e ícone. Baixe, dê dois cliques e pronto:
funciona sem internet e sem instalar nada. Para gerá-lo de novo depois de mexer
no código:

```bash
python3 ferramentas/gerar-arquivo-unico.py
```

**No celular, como aplicativo.** Publique a pasta em qualquer endereço `https`
— o GitHub Pages serve: *Settings → Pages → Deploy from a branch* — abra o link
no celular e escolha *Adicionar à tela de início*. Assim ele abre em tela cheia,
guarda os dados no aparelho e funciona offline (é aqui que o service worker e o
manifesto entram; no arquivo único eles não são usados).

**Localmente com servidor:**

```bash
python3 -m http.server 8000    # depois abra http://localhost:8000
```

Em qualquer um dos casos os dados ficam no navegador que abriu o app — e cada
forma de abrir tem seu próprio armazenamento. Para levar a rotina de uma para a
outra, use **Ajustes → Backup**: baixe o `.json` em uma e restaure na outra.

## As áreas

| Tela | O que faz |
| --- | --- |
| 🏠 **Hoje** | O dia em manhã, tarde e noite, com o que está acontecendo agora, os rituais do momento, as tarefas, o autocuidado devido e o fechamento do dia. |
| 🗓️ **Agenda** | Calendário e rotina juntos: compromissos de um dia e atividades recorrentes na mesma linha do tempo, com horários fixos marcados como tal. |
| ✅ **Tarefas** | Prioridade em três níveis, tempo estimado, prazo e vínculo com objetivos. |
| 📚 **Estudos** | Disciplina → assunto → conteúdo, sessões cronometradas e distribuição automática de conteúdos pelos dias até o prazo. |
| 🎯 **Minha vida** | Objetivos por área (estudos, futuro, eu, casa, vida pessoal), quebrados em passos que viram tarefas agendadas. |
| 🌿 **Hábitos** | Rituais contextualizados (rotina da manhã, rotina noturna) em vez de caixinhas soltas, com itens "só para hoje" e a pergunta "quer manter amanhã?". |
| ✨ **Autocuidado** | Pele, cabelo, unhas, corpo e organização, com a próxima data calculada sozinha a partir do ritmo de cada cuidado. |
| 🕊️ **Vida espiritual** | Práticas, intenções e diário, com o tempo litúrgico calculado offline. Sem sequência, sem pontuação: um dia sem marcar não apaga nada. |
| 📊 **Minha semana** | Estudos, sono, exercícios, autocuidado, descanso e tarefas — lidos com gentileza, seguidos das três metas da semana, das suas prioridades e de uma reflexão. |
| 🤖 **Assistente** | Organiza o dia a partir de uma frase escrita do seu jeito, sugere o que fazer no tempo que você tem e ajuda a tirar peso da lista. |

## A inteligência da rotina

Tudo roda no seu aparelho, com regras — não há serviço externo nem modelo de
linguagem envolvido. O que o app faz sozinho:

- **Entende uma frase e monta o dia.** "Amanhã tenho aula até meio-dia, quero
  estudar duas horas, preciso arrumar meu quarto e quero descansar" vira uma
  distribuição com horários, respeitando o que já existe na sua rotina, quebrando
  estudos longos em blocos com pausa e remarcando o que for flexível.
- **Avisa quando o dia está cheio demais** — comparando o que você acrescentou
  (tarefas e compromissos) com o tempo que sobra entre os horários da rotina,
  nunca reclamando da rotina que você desenhou de propósito — e ajuda a decidir
  o que fica, o que pode ser adiado (→) e o que pode sair (×).
- **Oferece saídas.** As *alternativas e saídas* ("se não conseguir estudar,
  faça uma leitura espiritual") aparecem na tela Hoje e quando você diz ao
  assistente que o dia não saiu como planejado.
- **Cobra descanso.** Se o dia não tem nenhuma pausa, o app diz isso e reserva
  30 minutos no primeiro espaço livre. Descanso é categoria de primeira classe,
  ao lado de estudo e compromisso.
- **Responde "tenho 30 minutos".** Escolhe entre tarefas, conteúdos de estudo,
  cuidados atrasados e passos de objetivos — e explica por que sugeriu aquilo.
- **Distribui conteúdos de estudo** pelos dias disponíveis até a data da prova.
- **Calcula a próxima vez** de cada cuidado recorrente e o tempo litúrgico do dia.

## Quando a rotina do quadro muda

O quadro tem `id`, `versao` e `notas`, em `js/rotina-base.js`. Ao mexer nele,
suba a versão e escreva em `notas` o que mudou: na próxima abertura o app avisa
na tela Hoje e oferece **Aplicar** ou **Agora não**.

Uma rotina vinda de outro quadro (outro `id`) nunca é sobrescrita por este —
por isso dá para trazer a sua rotina por backup e continuar recebendo as
melhorias do app sem que ela seja tocada.

Aplicar não apaga nada. Cada atividade do quadro tem uma `chave` estável
(`missa-semana`, `treino`, …); a atualização encontra o bloco por ela e troca
só horário, duração, dias e área, mantendo o mesmo `id` — por isso marcações,
tarefas, sessões de estudo e histórico continuam de pé. Passos de ritual são
casados pelo texto, pelo mesmo motivo. O que você criou por conta (sem `chave`)
nunca é tocado, e lema, prioridades e alternativas ficam como estão.

## Backup

Os dados vivem apenas neste aparelho: limpar os dados do navegador apaga tudo.
Em **Ajustes → Backup** dá para baixar um `.json` com toda a rotina e o histórico
e restaurá-lo depois, inclusive em outro aparelho. Dados da primeira versão do
app são migrados automaticamente na primeira abertura.

## Aparência

A identidade é a **Missal**: papel marfim, tinta preta, rubrica vermelha — é
dessa palavra que vem "rubrica" — e filete dourado, com tipografia de livro,
versaletes nos rótulos e nenhum emoji na interface. Não há sombras: o que
separa os blocos são linhas finas e espaço, como numa página impressa.

**O acento da interface segue o tempo litúrgico**, calculado offline a partir
da data da Páscoa: verde no Tempo Comum, violeta no Advento e na Quaresma,
ouro no Natal e na Páscoa, rubro em Pentecostes. A cor entra nos botões, nas
marcações, na barra do dia e na aba ativa — e o tempo em curso aparece no
alto da tela. Existe em versão clara e escura.

Tudo isso vive nas variáveis do topo de `assets/styles.css`; as cores
litúrgicas ficam em `PALETA`, dentro de `js/motor.js`, e são aplicadas por
`js/app.js` a cada abertura. As cores das áreas da vida — os pontos ao lado
de "Estudo", "Descanso", "Autocuidado" — estão no início de `js/store.js`.

## Como o projeto é feito

HTML, CSS e JavaScript puro — sem dependências, sem build.

```
index.html              estrutura, barra de navegação e painel
minha-rotina.html       o app inteiro em um arquivo só (gerado)
assets/styles.css       identidade visual "Missal" (tokens no topo do arquivo)
js/util.js              datas, horários, formatação e criação de elementos
js/rotina-base.js       a rotina inicial (troque este arquivo pela sua)
js/store.js             modelo de dados, persistência e migração
js/motor.js             inteligência: monta o dia, analisa, sugere, interpreta frases
js/ui.js                formulários em painel, avisos, listas e componentes
js/view-*.js            uma tela por arquivo
js/app.js               rotas por hash, renderização e tema
sw.js                   cache para funcionar offline
manifest.webmanifest    instalação como aplicativo
ferramentas/            gerador do arquivo único
```

Cada tela é uma função `render(store)` que devolve um elemento; toda alteração
passa por `store.commit(...)`, que salva no `localStorage` e redesenha a tela.
O motor (`js/motor.js`) não toca no DOM — é só regra, o que o mantém testável.
