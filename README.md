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

### 4. Instalar no iPhone
Abra o site no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

## Scripts
| Comando | O que faz |
|---|---|
| `npm run dev` | servidor local |
| `npm test` | testes de agenda (recorrência, conflitos, horários livres) |
| `npm run build` | checagem de tipos + build de produção com PWA |

Decisões técnicas: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
