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

## Notificações (Etapa 2)
```
pg_cron (1/min) ──HTTP + x-cron-secret──▶ Edge Function send-reminders ──Web Push (VAPID)──▶ Apple/Google ──▶ service worker ──▶ aviso
```
- `supabase/functions/_shared/reminders.ts`: cálculo **puro** (sem dependências), testado no app com Vitest e usado pela função em Deno.
  Converte o horário com `Intl` no fuso salvo em `notification_settings.timezone`.
- **Janela de recuperação:** um aviso vale se o seu horário caiu nos últimos 10 min. Assim, uma execução atrasada não perde lembretes e uma muito atrasada não manda aviso velho.
- **Sem duplicatas:** antes de enviar, a função “reserva” a linha em `notification_log` (chave única `user_id, kind, ref_id, ref_date`, `ON CONFLICT DO NOTHING`).
- Inscrições que o serviço de push responde com 404/410 são apagadas. Ao sair da conta, o aparelho é desinscrito.
- **Silêncio noturno descarta** (não adia) os avisos do intervalo, para não acumular uma enxurrada às 5h.
- **Service worker** próprio (`src/sw.ts`, estratégia `injectManifest`): cache do app + eventos `push` e `notificationclick`, que abre a tela certa.
- **Segredos:** a chave VAPID privada e o `CRON_SECRET` ficam nos *secrets* do Supabase e no Vault; o app recebe só a chave pública.

## Princípios de produto aplicados
- Sugestões nunca alteram nem excluem dados sozinhas. Exclusões pedem confirmação em dois toques.
- Horários livres reservam 10 min antes e depois de cada compromisso e ignoram janelas menores que 30 min.
- Nada pessoal é pré-preenchido. A rotina inicial é uma importação opcional e revisável.
- Acessibilidade: alvos de toque ≥ 44 px, rótulos em todos os controles, foco visível, `prefers-reduced-motion`,
  contraste AA para textos (tons 700 da paleta), campos com 16 px para evitar zoom no iOS, safe areas do iPhone.

## Próximas etapas sugeridas
2. ✅ Notificações · Agenda completa: visão mensal, “Reorganizar meu dia” (proposta + confirmação)
3. Estudos: disciplinas, provas, notas, ENEM (simulados, redação), inglês
4. Espiritualidade: diário, intenções, exame de consciência, confissões, calendário litúrgico
5. Projetos (lista, calendário, Kanban), autocuidado, atividade física
6. Finanças, casa, viagens, família e lazer
7. Metas, “Meu ano”, resumos semanais e exportação em PDF
