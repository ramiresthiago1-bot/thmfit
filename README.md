# THM FIT

## Sistema Web de Gestão para Academia de Musculação

O **THM FIT** é um sistema web desenvolvido para auxiliar na gestão de uma academia de musculação, centralizando informações de alunos, financeiro e controle de acessos em uma única plataforma.

O projeto está sendo desenvolvido de forma incremental, com foco em organização, regras de negócio, persistência de dados e preparação para futuras integrações com equipamentos utilizados em academias.

---

## 🚀 Funcionalidades

### 👤 Gestão de alunos

- Cadastro de alunos
- Edição de cadastro
- Controle de alunos ativos e inativos
- Busca e filtros
- Informações pessoais e de contato
- Dados de matrícula
- Plano contratado
- Data de matrícula e início
- Responsável
- Endereço
- Observações

### 💰 Financeiro

- Cadastro de lançamentos financeiros
- Mensalidades
- Matrículas
- Produtos
- Controle de valores
- Status de pagamentos
- Datas de vencimento e pagamento
- Formas de pagamento
- Edição e exclusão de lançamentos
- Indicadores financeiros
- Gráficos de acompanhamento

### 🚪 Controle de acessos

- Registro de entradas e saídas
- Consulta por aluno ou matrícula
- Histórico de acessos
- Filtros por período
- Filtros por tipo de acesso
- Filtros por resultado
- Identificação de equipamento
- Controle de acessos liberados e bloqueados
- Verificação automática de autorização

### ⚙️ Regra automática de acesso

O sistema possui uma camada de decisão automática para determinar se um aluno pode acessar a academia.

A análise considera informações como:

- Situação do aluno
- Situação financeira
- Pagamentos
- Vencimentos
- Período de carência
- Situações de bloqueio

Essa estrutura foi desenvolvida pensando também na futura integração com equipamentos de controle de acesso.

---

## 🔌 Preparação para integração com Topdata

O módulo de acessos foi estruturado considerando uma futura integração com equipamentos de controle de acesso da **Topdata**.

Atualmente o sistema trabalha com simulação manual e regras internas de autorização.

A integração física com o equipamento será desenvolvida em uma etapa posterior.

---

## 🛠️ Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Supabase
- PostgreSQL
- Chart.js
- Git
- GitHub

---

## 🏗️ Estrutura atual

```text
THM FIT
│
├── index.html
├── style.css
├── app.js
├── config.js
├── .gitignore
└── README.md