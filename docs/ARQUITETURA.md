# Arquitetura e decisões técnicas

## Visão geral
SPA em React + TypeScript (Vite), servida como PWA. Supabase é a fonte da verdade:
nenhum dado pessoal fica só no navegador. O cache local do TanStack Query serve apenas para responsividade.
O service worker guarda apenas os arquivos do app, nunca respostas da API.

```
src/
  lib/         regras puras (agenda, áreas, frases, rotina inicial) + cliente Supabase
  hooks/       autenticação e acesso a dados (React Query)
  components/  layout, navegação, formulários (sheets) e cartões do painel
  pages/       telas
supabase/migrations/   SQL versionado
```

## Banco de dados
| Tabela | Uso |
|---|---|
| `profiles` | perfil (criado por gatilho no cadastro, vazio) + `preferences` (layout do painel etc.) |
| `categories` | categorias personalizadas (base para próximas etapas) |
| `events` | compromissos; `recurrence` = `null`, `{"freq":"daily"}` ou `{"freq":"weekly","weekdays":[0-6]}` |
| `event_occurrences` | estado de uma ocorrência num dia (`done` / `skipped`) |
| `tasks` | tarefas flexíveis com prioridade, prazo e data planejada |
| `habits`, `habit_logs` | hábitos e marcações diárias |
| `quick_notes`, `reflections` | anotações rápidas e frases próprias |
| `study_sessions` | sessões de estudo (escola, técnico, ENEM, inglês) |

**Segurança**
- RLS habilitado em todas as tabelas; política única `user_id = auth.uid()` para leitura e escrita.
- Chaves estrangeiras compostas `(id, user_id)`: mesmo ignorando RLS, um registro não pode apontar para dado de outra pessoa (testado).
- `anon` não tem acesso a nenhuma tabela. `profiles` não aceita insert/delete pelo cliente.
- Fotos de perfil ficam num bucket **privado**, na pasta `<user_id>/`, e são lidas por URL assinada.

**Por que expandir a recorrência no app?** Um compromisso recorrente é uma linha só. As ocorrências são calculadas
na hora (`src/lib/schedule.ts`, com testes), e só as exceções (concluído/pulado) são gravadas.
Assim, editar a série é uma única atualização e não há milhares de linhas futuras para manter.

## Princípios de produto aplicados
- Sugestões nunca alteram nem excluem dados sozinhas. Exclusões pedem confirmação em dois toques.
- Horários livres reservam 10 min antes e depois de cada compromisso e ignoram janelas menores que 30 min.
- Nada pessoal é pré-preenchido. A rotina inicial é uma importação opcional e revisável.
- Acessibilidade: alvos de toque ≥ 44 px, rótulos em todos os controles, foco visível, `prefers-reduced-motion`,
  contraste AA para textos (tons 700 da paleta), campos com 16 px para evitar zoom no iOS, safe areas do iPhone.

## Próximas etapas sugeridas
2. Agenda completa: visão mensal, “Reorganizar meu dia” (proposta + confirmação), notificações (Web Push no iOS 16.4+ com o app instalado)
3. Estudos: disciplinas, provas, notas, ENEM (simulados, redação), inglês
4. Espiritualidade: diário, intenções, exame de consciência, confissões, calendário litúrgico
5. Projetos (lista, calendário, Kanban), autocuidado, atividade física
6. Finanças, casa, viagens, família e lazer
7. Metas, “Meu ano”, resumos semanais e exportação em PDF
