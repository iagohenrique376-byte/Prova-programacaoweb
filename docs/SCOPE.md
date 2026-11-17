Aqui está o documento **`SCOPE.md`** completo e atualizado com as modificações solicitadas na equipe: integrantes organizados em ordem alfabética com os devidos links/usuários do GitHub e a inclusão da integrante Lorena Maria.

---

# NEXO Escolar — Gestão Acadêmica

## EQUIPE

1. **Emanuel da Silva Correia** — GitHub: [`emanueldasilvacorreia1413-debug`](https://www.google.com/search?q=https://github.com/emanueldasilvacorreia1413-debug)
2. **Iago Henrique Gomes Florêncio** — GitHub: [`iagohenrique376-byte`](https://www.google.com/search?q=https://github.com/iagohenrique376-byte)
3. **Lorena Maria** — GitHub: [`lorena77z`](https://www.google.com/search?q=https://github.com/lorena77z)
4. **Murillo Bordignon** — GitHub: [`murillobordignon`](https://www.google.com/search?q=https://github.com/murillobordignon)
5. **Victória Bordignon** — GitHub: [`victoriabordignon`](https://www.google.com/search?q=https://github.com/victoriabordignon)

**Turma:** 2 DSA

**Nome do Projeto:** NEXO Escolar — Gestão Acadêmica

**Pontuação Máxima:** 0 a 10 pontos

---

# Visão Geral

Desenvolver uma aplicação web de gerenciamento escolar chamada **NEXO Escolar**.

O sistema tem como finalidade centralizar o controle acadêmico, permitindo que o **Administrador** gerencie alunos, disciplinas e médias acadêmicas, enquanto o **Aluno** possa consultar o seu boletim escolar de forma clara e ágil.

O projeto será desenvolvido exclusivamente no **Front-end** com finalidade didática. A aplicação funcionará diretamente no navegador, garantindo a persistência total das informações via **LocalStorage** mesmo após atualizar a página ou reiniciar o navegador.

---

# S — Situation | Situação

## Problema

Instituições de ensino necessitam de um ambiente digital acessível, responsivo e seguro para organizar os registros acadêmicos. Atualmente, há complexidade no controle de turmas, matrículas, notas e na disponibilização imediata do boletim escolar para os alunos.

O **NEXO Escolar** centraliza essas operações em uma única aplicação web, estruturada com base nas seguintes necessidades:

1. **Gestão pelo Administrador:**
* Cadastro, edição, leitura e exclusão (CRUD) de Alunos.
* Cadastro, edição, leitura e exclusão (CRUD) de Disciplinas.
* Atribuição e edição das Médias dos alunos por disciplina.


2. **Consulta pelo Aluno:**
* Visualização individualizada das médias obtidas nas disciplinas matriculadas (Boletim).
* Visualização da situação acadêmica calculada automaticamente.


3. **Controle de Acesso com Validação:**
* Simulação de autenticação com validação de perfis (Administrador x Aluno).


4. **Massa de Dados Inicial (Mock):**
* Inicialização automática do sistema com **10 alunos mockados** caso o LocalStorage esteja vazio.
* Inicialização das médias com o valor **nulo** (`null` / `-`).



---

# C — Context | Contexto

## Tecnologias Obrigatórias

* **Framework:** Next.js (com App Router)
* **Biblioteca UI:** React
* **Linguagem:** TypeScript
* **Estilização:** Tailwind CSS (sistema 100% responsivo para PC, Tablet e Mobile)
* **Armazenamento:** LocalStorage (persistência local)

Hooks e utilitários recomendados:

* `useState`, `useEffect`, `useContext` (ou gerenciador de estado local).
* `useRouter` (para navegação entre telas).

---

# Arquitetura

O projeto será exclusivamente **Front-end**.

### O que **NÃO** será utilizado:

* Backend em Node.js, Express, Spring Boot ou Python.
* Bancos de dados relacionais ou NoSQL (MySQL, PostgreSQL, MongoDB, etc.).
* APIs REST/GraphQL externas ou rotas de API serverless.
* Bibliotecas de autenticação complexas ou tokens reais (JWT, OAuth 2.0, NextAuth.js/Auth.js).

### Controle de Acesso Solicitado

* A validação de perfil será tratada e simulada diretamente no client-side via formulário com validação de credenciais salvas/mockadas no LocalStorage ou estado da aplicação, controlando o direcionamento entre o painel do **Administrador** e a visão do **Aluno**.

---

# Armazenamento e Regras de Negócio

## 1. Persistência de Dados (LocalStorage)

Todas as operações de CRUD devem refletir imediatamente no `localStorage`. Ao recarregar a página (`F5`) ou fechar o navegador, os dados alterados devem permanecer salvos.

## 2. Regra de Inicialização de Média

* Toda média recém-criada ou importada na lista mockada inicial de 10 alunos deve iniciar com valor **nulo** (`null`).
* Enquanto a média estiver nula, a situação da disciplina deverá exibir a indicação **"Pendente"** ou **"Aguardando Nota"**.

## 3. Regra de Cálculo de Situação

Assim que uma média numérica (de 0 a 10) for lançada no sistema pelo administrador, a situação da disciplina será calculada automaticamente segundo as regras:

$$\text{Situação} = \begin{cases} \text{Reprovado} & \text{se } \text{Média} < 5.0 \\ \text{Recuperação} & \text{se } 6.0 \le \text{Média} < 7.0 \\ \text{Aprovado} & \text{se } \text{Média} \ge 7.0 \end{cases}$$

*(Nota: Para médias entre $5.0$ e $5.9$, a situação será considerada Reprovado/Exame conforme alinhamento interno da instituição, ou classificada na faixa de atenção).*

---

# O — Objective | Objetivo

Fornecer uma plataforma didática, intuitiva e responsiva para:

1. Permitir ao administrador gerenciar alunos, disciplinas e calcular o desempenho escolar.
2. Garantir que os alunos acessem com segurança e facilidade seu boletim atualizado.
3. Garantir persistência completa de dados no navegador sem dependências de infraestrutura de servidor.

---

# P — Process | Processo

```text
Acesso à Aplicação
        ↓
Validação de Acesso (Administrador ou Aluno)
        ↓
    ┌───┴───────────────────────────────┐
    ▼                                   ▼
[ Visão Administrador ]             [ Visão Aluno ]
    │                                   │
    ├─► CRUD Alunos (10 Mockados)       ├─► Consultar Boletim
    ├─► CRUD Disciplinas                └─► Visualizar Média e Situação
    └─► Lançar / Editar Médias
            │
            ▼
Recálculo Automático da Situação
(Aprovado | Recuperação | Reprovado)
            │
            ▼
Persistência Automática no LocalStorage

```

---

# E — Execution | Execução

## Módulos do Sistema

### 1. Autenticação e Controle de Acesso

* Tela inicial/Login com validação simples para direcionamento de fluxo:
* **Administrador:** Acesso ao painel completo de gestão.
* **Aluno:** Acesso exclusivo ao seu boletim (via seleção de matrícula ou login mockado).



### 2. Gestão de Alunos (CRUD)

* Lista contendo os **10 alunos mockados inicializados**.
* Ações: Criar novo aluno, editar dados (nome, matrícula, e-mail), visualizar e excluir.

### 3. Gestão de Disciplinas (CRUD)

* Cadastro de disciplinas da grade curricular (ex: Matemática, Português, História).
* Ações: Criar disciplina, editar nome/código, listar e excluir.

### 4. Lançamento e Gestão de Médias (CRUD)

* Vínculo entre Aluno e Disciplina.
* Média inicializada como `null`.
* Permite inclusão e alteração de valores de 0 a 10.

### 5. Visão do Boletim (Aluno)

* Tabela responsiva contendo: Disciplina | Média Lançada | Situação Final.
* Atualização em tempo real conforme alterado pelo administrador.

### 6. Página da Equipe

* Exibição dos 5 integrantes ordenados alfabeticamente com redirecionamento/link direto para seus respectivos perfis no GitHub.

---

# Estrutura de Páginas e Componentes

```text
NEXO Escolar
│
├── Page: Login / Seleção de Acesso
├── Page: Dashboard / Painel do Administrador
│   ├── Component: CRUD Alunos
│   ├── Component: CRUD Disciplinas
│   └── Component: Lançamento de Médias
│
├── Page: Boletim do Aluno
│   └── Component: Tabela de Notas e Situação
│
├── Page: Equipe (Identificação dos 5 integrantes + GitHub)
│
└── Data Context / LocalStorage Service

```

---

# Regras Importantes do Projeto

1. **Front-end Exclusivo:** Sem servidores, sem APIs REST externas ou bancos de dados backend.
2. **Next.js & TypeScript:** Estruturado via App Router com tipagem rigorosa de dados.
3. **Tailwind CSS:** Layout responsivo otimizado para Smartphones, Tablets e Desktops.
4. **LocalStorage Obrigatório:** Persistência 100% no navegador (permanece ao atualizar a página ou reabrir o navegador).
5. **Médias Nulas:** Toda média deve iniciar como `null` até que o administrador realize o lançamento.
6. **Massa de Dados Mockada:** Inicialização automática de 10 alunos na primeira execução.
7. **Página de Equipe:** Página dedicada à apresentação do grupo (5 componentes em ordem alfabética com perfil do GitHub).
8. **Avaliação:** Pontuação de 0 a 10 pontos.

## Atualização funcional — Boletim e acesso individual

- O aluno entra usando matrícula e senha individual; a tela de login não oferece uma lista de outros estudantes.
- O administrador define a senha inicial do aluno e pode redefini-la no cadastro.
- Cada disciplina possui duas avaliações, com pesos próprios configuráveis.
- A média ponderada é calculada por disciplina após o lançamento das duas notas, limitada a 10,0 e exibida com uma casa decimal.
- O aluno visualiza as duas notas, a média e a situação, sem campos de edição.
- Somente o painel administrativo apresenta os campos de lançamento de notas.

**Nota de segurança:** esta entrega permanece um protótipo exclusivamente front-end com persistência em LocalStorage. A validação no navegador não equivale a segurança de produção. Para uso real, é necessário implementar autenticação, autorização e validação no servidor, além de armazenar senhas com hash seguro em banco de dados.
