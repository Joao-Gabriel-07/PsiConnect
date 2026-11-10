# DOCUMENTAÇÃO DA API — PSICONNECT

## 1. Apresentação

O PsiConnect é um sistema de gerenciamento desenvolvido com TypeScript, Node.js, Express e MySQL. Sua API permite administrar pacientes, profissionais, usuários, agendamentos e registros de auditoria.

A comunicação entre o frontend e o backend é realizada por meio de requisições HTTP, utilizando dados no formato JSON.

## 2. Tecnologias utilizadas

- Node.js
- TypeScript
- Express
- MySQL
- mysql2/promise
- JSON Web Token (JWT)
- bcryptjs
- dotenv
- CORS

## 3. Configuração da API

O servidor utiliza a porta 3000 como padrão.

**Endereço-base:**

`http://localhost:3000/api`

As rotas da aplicação são organizadas por módulos, permitindo separar as responsabilidades de cada funcionalidade.

## 4. Autenticação e autorização

O sistema utiliza JWT (JSON Web Token) para controlar o acesso às funcionalidades protegidas.

Após realizar o login, o usuário recebe um token com validade de duas horas.

Para acessar rotas protegidas, o frontend deve enviar o token no cabeçalho da requisição:

`Authorization: Bearer TOKEN_JWT`

### 4.1 Perfis de acesso

O sistema possui três perfis:

- **Administrador:** possui acesso às funcionalidades administrativas.
- **Atendente:** pode acessar funcionalidades operacionais permitidas, como pacientes e agendamentos.
- **Psicólogo:** possui acesso aos pacientes vinculados e aos seus próprios agendamentos, conforme as regras implementadas.

### 4.2 Middleware

O sistema utiliza dois middlewares principais:

- `autenticarToken`: verifica a presença e a validade do token JWT.
- `autorizarPerfis`: verifica se o perfil do usuário possui autorização para acessar determinada rota.

### 4.3 Códigos de resposta relacionados à segurança

| Código | Significado |
|---|---|
| 401 | Usuário não autenticado ou token inválido/expirado. |
| 403 | Usuário sem permissão ou conta inativa/bloqueada. |
| 500 | Erro interno ou de configuração do servidor. |

## 5. Endpoints da API

### 5.1 Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/auth/login` | Realiza o login e gera o token JWT. |

**Dados enviados:**

```json
{
  "email": "usuario@email.com",
  "senha": "123456"
}
```

**Resposta de sucesso:** retorna uma mensagem, o token JWT e os dados do usuário autenticado.

O sistema verifica se o usuário existe, se está ativo e se a senha corresponde ao hash armazenado no banco de dados.

### 5.2 Rotas gerais do servidor

| Método | Endpoint | Descrição | Acesso |
|---|---|---|---|
| GET | `/health` | Verifica o funcionamento da API e do banco de dados. | Público |
| GET | `/protegida` | Testa a autenticação por token. | Autenticado |
| GET | `/admin/teste` | Testa a autorização administrativa. | Administrador |

### 5.3 Pacientes

**Prefixo:** `/pacientes`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/pacientes` | Cadastra um paciente. |
| GET | `/pacientes` | Lista os pacientes permitidos para o usuário. |
| GET | `/pacientes/:id` | Consulta um paciente específico. |
| PUT | `/pacientes/:id` | Atualiza os dados de um paciente. |
| DELETE | `/pacientes/:id` | Inativa um paciente. |
| PUT | `/pacientes/:id/reativar` | Reativa um paciente inativo. |
| DELETE | `/pacientes/:id/excluir` | Exclui definitivamente um paciente. |

**Regras de acesso:**

- Administrador, Atendente e Psicólogo podem acessar as rotas de pacientes, mediante autenticação.
- Psicólogos visualizam e gerenciam apenas pacientes vinculados a eles.
- A inativação ou o bloqueio de um paciente cancela seus agendamentos futuros.
- A reativação não recupera automaticamente os agendamentos cancelados.

### 5.4 Profissionais

**Prefixo:** `/profissionais`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/profissionais` | Lista os profissionais cadastrados. |
| POST | `/profissionais` | Cadastra um novo psicólogo. |
| PUT | `/profissionais/:id` | Atualiza os dados de um profissional. |
| DELETE | `/profissionais/:id` | Exclui um profissional. |

**Permissão:** todas as rotas exigem autenticação e perfil Administrador.

O cadastro de um profissional também cria seu usuário de acesso, vinculando-o ao perfil Psicólogo.

A senha é armazenada como hash utilizando bcrypt.

O cadastro de profissionais exige nome, e-mail, senha e registro profissional. A senha deve possuir pelo menos oito caracteres. O sistema também verifica se o e-mail ou o registro profissional já estão cadastrados, evitando duplicidades.

### 5.5 Usuários

**Prefixo:** `/usuarios`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/usuarios` | Lista os usuários cadastrados. |
| POST | `/usuarios` | Cadastra um novo usuário. |
| PATCH | `/usuarios/:id` | Atualiza informações de um usuário. |

**Permissão:** todas as rotas exigem autenticação e perfil Administrador.

O sistema permite gerenciar nome, e-mail, senha, perfil e situação do usuário.

A senha é armazenada utilizando hash bcrypt. O cadastro exige senha com pelo menos seis caracteres.

O sistema permite atualizar os dados dos usuários por meio do método PATCH, possibilitando alterações de nome, e-mail, perfil e situação. O Administrador não pode alterar o próprio perfil de acesso por essa funcionalidade.

### 5.6 Agendamentos

**Prefixo:** `/agendamentos`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/agendamentos` | Cadastra um agendamento. |
| GET | `/agendamentos` | Lista os agendamentos permitidos para o usuário. |
| PUT | `/agendamentos/:id` | Atualiza os dados de um agendamento. |
| PUT | `/agendamentos/:id/status` | Atualiza a situação de confirmação. |
| DELETE | `/agendamentos/:id` | Exclui um agendamento. |

**Permissão:** Administrador, Atendente e Psicólogo, mediante autenticação.

**Situações de confirmação disponíveis:**

- Pendente
- Confirmado
- Cancelado

Novos agendamentos são cadastrados inicialmente com a situação pendente.

Os psicólogos visualizam e gerenciam somente os agendamentos associados a eles.

Ao cadastrar ou atualizar um agendamento, o sistema verifica a existência do vínculo entre o paciente e o profissional, criando-o quando necessário.

O sistema permite alterar os dados de um agendamento, modificar seu status de confirmação e excluir registros. As alterações de cadastro, atualização e status são registradas na auditoria. Psicólogos somente podem modificar ou excluir agendamentos associados a eles.

### 5.7 Auditoria

**Prefixo:** `/auditoria`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/auditoria` | Lista os registros de auditoria. |

**Permissão:** somente Administrador.

Os registros apresentam:

- Identificador do registro.
- Identificador do usuário.
- Nome do usuário.
- Perfil do usuário.
- Descrição da ação realizada.
- Data e hora do registro.

As ações são armazenadas na tabela `logs_acoes`.

A função `registrarAuditoria()` é utilizada pelos módulos do sistema para registrar operações realizadas pelos usuários.

Os registros de auditoria são organizados do mais recente para o mais antigo, permitindo acompanhar o histórico das operações realizadas no sistema e identificar os usuários responsáveis pelas ações.

## 6. Banco de dados

O sistema utiliza o MySQL como banco de dados relacional.

**Nome do banco:** `site_psicologia`

As principais tabelas utilizadas são:

| Tabela | Finalidade |
|---|---|
| `perfis` | Armazena os perfis de acesso. |
| `usuarios` | Armazena os dados dos usuários. |
| `psicologos` | Armazena os dados profissionais dos psicólogos. |
| `clientes_pacientes` | Armazena os dados dos pacientes. |
| `vinculos` | Relaciona pacientes e psicólogos. |
| `agendamentos` | Armazena os agendamentos. |
| `logs_acoes` | Armazena os registros de auditoria. |

### 6.1 Conexão com o banco

A conexão é realizada pelo módulo `db.ts`, utilizando `mysql2/promise`.

As configurações são carregadas pelo arquivo `.env`.

Exemplo das variáveis utilizadas:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=site_psicologia
JWT_SECRET=seu_segredo
```

Os valores acima são ilustrativos. As credenciais reais devem permanecer privadas.

O sistema utiliza um pool de conexões com limite de dez conexões simultâneas.

## 7. Segurança

O PsiConnect implementa mecanismos de segurança para proteger os dados e controlar o acesso às funcionalidades.

Entre eles:

- Autenticação utilizando JWT.
- Controle de acesso baseado em perfis.
- Armazenamento de senhas com hash bcrypt.
- Consultas SQL parametrizadas.
- Verificação da situação do usuário durante o login.
- Restrição de acesso aos pacientes e agendamentos conforme o vínculo profissional.
- Registro de ações administrativas e operacionais por meio da auditoria.

O sistema utiliza middlewares para verificar a autenticação e as permissões dos usuários antes de permitir o acesso às rotas protegidas.

Quando um usuário não possui autorização, a API retorna o código HTTP 403. Quando o token está ausente, inválido ou expirado, retorna o código HTTP 401.

## 8. Inicialização do backend

Para executar o backend, abra o terminal na pasta `backend` e utilize:

```bash
npm install
```

Em seguida:

```bash
npm run dev
```

O servidor será iniciado no endereço:

`http://localhost:3000`

Para verificar o funcionamento da API, acesse:

`http://localhost:3000/api/health`

A resposta informa o estado da API e da conexão com o banco de dados.

## 9. Considerações finais

A API do PsiConnect foi desenvolvida de forma modular, separando as funcionalidades de autenticação, usuários, profissionais, pacientes, agendamentos e auditoria.

A utilização de TypeScript, Node.js, Express e MySQL contribui para a organização e manutenção do sistema. Além disso, os mecanismos de autenticação JWT, criptografia de senhas com bcrypt e controle de permissões por perfil ajudam a proteger as informações e restringir o acesso às funcionalidades.

Esta documentação apresenta a estrutura da API, seus principais endpoints, regras de negócio e mecanismos de segurança, servindo como referência técnica para manutenção e futuras melhorias do PsiConnect.