# Minha Rotina

Aplicativo pessoal de organização, planejamento e desenvolvimento. Mobile-first, otimizado para iPhone e instalável como PWA.

**Stack:** React 18 · TypeScript · Tailwind CSS · Supabase (Auth, PostgreSQL com RLS, Storage) · TanStack Query · vite-plugin-pwa.

## Etapa 1 — Fundação (esta versão)

- Login, cadastro, recuperação e redefinição de senha (Supabase Auth)
- Banco com **RLS em todas as tabelas** e chaves compostas que impedem vincular dados de outra pessoa
- **Painel inicial personalizável**: saudação, data, reflexão do dia, próximo compromisso, progresso, agenda, tarefas, hábitos, lembretes, espiritualidade, resumo de estudos e anotações rápidas. É possível reordenar e ocultar cartões.
- **Agenda**: compromissos únicos ou recorrentes (diários ou por dias da semana), duração, lembrete, fixo ou flexível, conclusão e “pular só neste dia”, conflitos de horário, horários livres com folga para imprevistos e aviso de dia sobrecarregado
- **Tarefas** (prioridade, prazo, atrasadas), **Hábitos** (meta semanal, pausa sem perder o histórico), **Sessões de estudo**
- **Espiritualidade**: momentos do dia e frequência semanal a partir da agenda
- **Perfil** editável: foto (bucket privado), nascimento, sono, objetivos, interesses, compromissos fixos e preferências
- **Importar rotina inicial** (opcional, com revisão e confirmação). Horários que não constam no planejamento ficam em branco.
- **Exportar meus dados** (backup completo em JSON)

## Etapa 2 — Notificações
- Web Push com o app fechado (no iPhone: app instalado na Tela de Início, iOS 16.4+)
- Lembretes de compromissos conforme o “Lembrete” de cada um. Concluídos ou pulados não avisam.
- Resumo do dia no horário escolhido (só quando há algo); silêncio noturno; pausa geral
- Botão de teste, lista de avisos recentes e várias assinaturas (iPhone, computador…)
- Envio no servidor (Edge Function + `pg_cron`), no fuso da usuária e sem duplicatas

As demais áreas (projetos, autocuidado, atividades físicas, finanças, casa, viagens, família, metas e “Meu ano”) aparecem no menu como próximas etapas, sem botões inativos.

## Como rodar

### 1. Supabase
1. Crie um projeto em <https://supabase.com>.
2. Em **SQL Editor**, cole e execute `supabase/migrations/20261116000000_etapa1_fundacao.sql`.
   Com a CLI, use `supabase link` e depois `supabase db push`.
3. Em **Authentication → URL Configuration**, defina a *Site URL* (ex.: `https://minha-rotina.vercel.app`) e adicione
   `http://localhost:5173/**` e `https://SEU-DOMINIO/**` em *Redirect URLs*. Isso é necessário para os e-mails de confirmação e de redefinição de senha.

### 2. Local
```bash
cp .env.example .env.local   # preencha URL e anon key (Project Settings → API)
npm install
npm run dev
```

### 3. Publicar (Vercel)
Importe o repositório na Vercel, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em *Environment Variables* e faça o deploy. O `vercel.json` já cuida das rotas.

### 4. Notificações push (Etapa 2)
1. Gere as chaves VAPID **uma vez**: `npx web-push generate-vapid-keys`. Guarde a privada só no Supabase.
2. Rode a migração `supabase/migrations/20261116100000_etapa2_notificacoes.sql` no SQL Editor (ou `supabase db push`).
3. Configure os segredos e publique a função (Supabase CLI):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
     VAPID_SUBJECT=mailto:seu-email@exemplo.com CRON_SECRET=$(openssl rand -hex 24)
   supabase functions deploy send-reminders
   ```
   (`supabase/config.toml` já desliga a verificação de JWT automática; a função faz a própria checagem.)
4. Abra `supabase/cron/agendar-lembretes.sql`, troque `<PROJECT_REF>` e `<CRON_SECRET>` e execute no SQL Editor. Isso faz a função rodar a cada minuto.
5. Na Vercel, adicione `VITE_VAPID_PUBLIC_KEY` (a chave **pública**) e faça um novo deploy.
6. No iPhone, abra o app **pela Tela de Início**, vá em Menu → Notificações → **Ativar notificações** e depois **Enviar teste**.

Para conferir se o cron está rodando: `select * from cron.job_run_details order by start_time desc limit 10;`

### 5. Instalar no iPhone
Abra o site no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | servidor local |
| `npm test` | testes de agenda (recorrência, conflitos, horários livres) e de lembretes (fuso, silêncio, janela) |
| `npm run build` | checagem de tipos + build de produção com PWA |

Decisões técnicas: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
