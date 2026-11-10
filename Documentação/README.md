# PsiConnect
## Sistema de gestão para atendimento psicológico

Projeto acadêmico desenvolvido para a disciplina de Desenvolvimento de Sistemas, utilizando TypeScript, Node.js e MySQL.

## 1. Sobre o projeto

O PsiConnect é um sistema desenvolvido para auxiliar na organização e no gerenciamento de espaços de atendimento psicológico. A plataforma permite administrar pacientes, profissionais, usuários e agendamentos, além de registrar ações realizadas no sistema.

O objetivo é facilitar a gestão administrativa, organizar os atendimentos e controlar o acesso às informações conforme o perfil de cada usuário.

## 2. Funcionalidades

- Autenticação de usuários com e-mail e senha.
- Controle de acesso por perfil.
- Gerenciamento de pacientes.
- Cadastro e gerenciamento de psicólogos.
- Cadastro e gerenciamento de atendentes.
- Controle de situação dos usuários e pacientes.
- Agendamento de consultas.
- Confirmação e cancelamento de agendamentos.
- Vinculação de pacientes aos psicólogos responsáveis.
- Painel com indicadores de atendimento.
- Registro e consulta de auditoria das ações realizadas.
- Edição do perfil do psicólogo.

## 3. Tecnologias utilizadas

**Backend**
- Node.js
- TypeScript
- Express
- MySQL
- JWT para autenticação.
- bcryptjs para proteção das senhas.

**Frontend**
- HTML
- CSS
- JavaScript

**Banco de dados**
- MySQL

## 4. Perfis de acesso

O sistema possui três perfis:

**Administrador**
- Gerenciamento geral do sistema.
- Cadastro e gerenciamento de usuários e profissionais.
- Controle das situações de acesso.
- Consulta dos registros de auditoria.
- Acesso administrativo às funcionalidades do sistema.

**Atendente**
- Gerenciamento de pacientes.
- Gerenciamento de agendamentos.
- Acesso às funcionalidades administrativas permitidas ao seu perfil.

**Psicólogo**
- Acesso aos pacientes vinculados.
- Visualização das informações permitidas ao seu perfil.
- Gerenciamento dos próprios dados profissionais.
- Acesso às funcionalidades de atendimento autorizadas.

## 5. Estrutura do banco de dados

O banco de dados utilizado é `site_psicologia`.

O sistema possui as seguintes tabelas:

| Tabela | Finalidade |
|---|---|
| `perfis` | Armazena os perfis de acesso. |
| `usuarios` | Armazena os dados dos usuários. |
| `psicologos` | Armazena informações profissionais dos psicólogos. |
| `clientes_pacientes` | Armazena os dados dos pacientes. |
| `vinculos` | Relaciona psicólogos e pacientes. |
| `agendamentos` | Armazena os agendamentos das consultas. |
| `logs_acoes` | Registra as ações realizadas no sistema. |

O arquivo `schema.sql` contém a estrutura e os dados fictícios de demonstração utilizados na preparação do banco.

## 6. Como executar o projeto

### 6.1. Pré-requisitos

Antes de iniciar, é necessário possuir:

- Node.js instalado.
- MySQL instalado e em execução.
- MySQL Workbench ou outra ferramenta de administração do banco.
- Visual Studio Code ou editor equivalente.
- Extensão Live Server para executar o frontend.

### 6.2. Configuração do banco de dados

1. Abra o MySQL Workbench.
2. Conecte-se ao servidor MySQL.
3. Utilize um banco de demonstração vazio.
4. Abra o arquivo `schema.sql`.
5. Execute o script para criar o banco `site_psicologia`, suas tabelas e os dados fictícios.
6. Confira se as sete tabelas foram criadas corretamente.

**Atenção:** execute o script de demonstração somente em um banco apropriado para essa finalidade. Não o execute sobre um banco que contenha dados importantes.

### 6.3. Configuração do backend

Abra o terminal na pasta `backend` do projeto.

Instale as dependências:

```bash
npm install
```

Crie ou configure o arquivo `.env` na pasta `backend`, utilizando as credenciais do seu próprio MySQL e os nomes de variáveis esperados pelo código do projeto.

Exemplo ilustrativo:

```env
PORT=3000
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=site_psicologia
DB_PORT=3306
JWT_SECRET=sua_chave_secreta
FRONTEND_ORIGIN=http://127.0.0.1:5500
```

Não compartilhe o arquivo `.env` com senhas ou chaves secretas em repositórios públicos.

Para iniciar o servidor em desenvolvimento:

```bash
npm run dev
```

O backend será executado em:

```text
http://localhost:3000
```

Para verificar o funcionamento da API, acesse:

```text
http://localhost:3000/api/health
```

A documentação Swagger, caso habilitada na configuração do projeto, pode ser acessada em:

```text
http://localhost:3000/api-docs/
```

### 6.4. Execução do frontend

1. Abra a pasta `frontend` no Visual Studio Code.
2. Localize o arquivo principal da interface.
3. Clique com o botão direito e selecione a opção **Open with Live Server**.
4. Acesse a página pelo navegador.

Utilize o endereço `http://127.0.0.1:5500` quando essa for a origem configurada no CORS do backend.

Mantenha o servidor backend em execução enquanto utiliza o sistema.

### 6.5. Compilação e execução do backend

Para verificar a compilação do TypeScript:

```bash
npm run build
```

Para iniciar a versão compilada:

```bash
npm start
```

## 7. API REST

A API disponibiliza funcionalidades para os principais módulos do sistema:

| Rota | Finalidade |
|---|---|
| `/api/auth/login` | Autenticação de usuários. |
| `/api/pacientes` | Gerenciamento de pacientes. |
| `/api/profissionais` | Gerenciamento de profissionais. |
| `/api/usuarios` | Gerenciamento de usuários, quando disponibilizado pela configuração das rotas. |
| `/api/agendamentos` | Gerenciamento de agendamentos. |
| `/api/auditoria` | Consulta dos registros de auditoria. |
| `/api/health` | Verificação do funcionamento do servidor. |

As operações disponíveis dependem do método HTTP utilizado e das permissões do usuário autenticado.

## 8. Segurança

O PsiConnect utiliza mecanismos de segurança para proteger o acesso às funcionalidades e aos dados do sistema:

- Autenticação por token JWT.
- Armazenamento de senhas utilizando hash com bcryptjs.
- Controle de permissões conforme o perfil do usuário.
- Proteção de rotas que exigem autenticação.
- Restrição de acesso aos pacientes vinculados aos psicólogos.
- Validação das informações recebidas pela API.
- Registro de ações realizadas no sistema por meio da auditoria.

As permissões são verificadas no backend, evitando que a segurança dependa exclusivamente da interface.

## 9. Testes do sistema

Para verificar o funcionamento do PsiConnect, podem ser realizados os seguintes testes:

1. Realizar login com usuários de diferentes perfis.
2. Verificar se cada perfil visualiza somente as funcionalidades permitidas.
3. Cadastrar, consultar e atualizar pacientes.
4. Verificar a vinculação entre pacientes e psicólogos.
5. Criar e gerenciar agendamentos.
6. Confirmar e cancelar agendamentos.
7. Verificar o gerenciamento de profissionais e atendentes.
8. Consultar os registros de auditoria.
9. Verificar se usuários sem autorização são impedidos de acessar rotas protegidas.

## 10. Documentação complementar

A documentação do projeto deve reunir os seguintes materiais:

- **DER:** Diagrama Entidade-Relacionamento do banco de dados.
- **Dicionário de dados:** descrição das tabelas, campos, tipos e relacionamentos.
- **Manual do usuário:** orientações para utilizar as funcionalidades do sistema.
- **Evidências de testes:** registros que demonstrem o funcionamento das principais funcionalidades.
- **Relatório de participação:** descrição das atividades realizadas pelos integrantes do grupo.

Os materiais complementares devem ser disponibilizados junto ao projeto.

## 11. Projeto acadêmico

**Projeto:** PsiConnect  
**Curso:** Sistemas de Informação  
**Instituição:** Centro Universitário Jorge Amado  
**Disciplina:** Desenvolvimento de Sistemas

---

*PsiConnect — Gestão organizada para quem cuida.*