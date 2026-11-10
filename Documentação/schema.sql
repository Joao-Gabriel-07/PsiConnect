CREATE DATABASE IF NOT EXISTS site_psicologia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE site_psicologia;

CREATE TABLE IF NOT EXISTS perfis (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_perfis_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  situacao ENUM('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
  perfil_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY fk_usuarios_perfil (perfil_id),
  CONSTRAINT fk_usuarios_perfil
    FOREIGN KEY (perfil_id) REFERENCES perfis (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS psicologos (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  registro_profissional VARCHAR(20) NOT NULL,
  area_atuacao VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_psicologos_usuario (usuario_id),
  UNIQUE KEY uq_psicologos_registro (registro_profissional),
  CONSTRAINT fk_psicologos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes_pacientes (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  contato VARCHAR(100) DEFAULT NULL,
  data_nascimento DATE DEFAULT NULL,
  situacao ENUM('ativo','inativo','bloqueado') DEFAULT 'ativo',
  dados_adicionais TEXT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vinculos (
  id INT NOT NULL AUTO_INCREMENT,
  psicologo_id INT NOT NULL,
  cliente_paciente_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vinculo_psicologo_paciente (psicologo_id, cliente_paciente_id),
  KEY fk_vinculos_paciente (cliente_paciente_id),
  CONSTRAINT fk_vinculos_psicologo
    FOREIGN KEY (psicologo_id) REFERENCES psicologos (id),
  CONSTRAINT fk_vinculos_paciente
    FOREIGN KEY (cliente_paciente_id) REFERENCES clientes_pacientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agendamentos (
  id INT NOT NULL AUTO_INCREMENT,
  psicologo_id INT NOT NULL,
  cliente_paciente_id INT NOT NULL,
  data_hora_consulta DATETIME NOT NULL,
  status_confirmacao ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (id),
  KEY fk_agendamentos_psicologo (psicologo_id),
  KEY fk_agendamentos_paciente (cliente_paciente_id),
  CONSTRAINT fk_agendamentos_psicologo
    FOREIGN KEY (psicologo_id) REFERENCES psicologos (id),
  CONSTRAINT fk_agendamentos_paciente
    FOREIGN KEY (cliente_paciente_id) REFERENCES clientes_pacientes (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logs_acoes (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  acao VARCHAR(255) NOT NULL,
  data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_logs_usuario (usuario_id),
  CONSTRAINT fk_logs_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO perfis (id, nome) VALUES
  (1, 'Administrador'),
  (2, 'Psicólogo'),
  (3, 'Atendente')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO usuarios (id, nome, email, senha_hash, situacao, perfil_id) VALUES
  (1, 'Administrador Teste', 'admin.teste@exemplo.com',
   '$2a$10$VPjIb7olWXaxMryFRe0Xl.is4pT1MhHKmU9iwlnVJn9g3wUGu6gqu', 'ativo', 1),
  (2, 'Sofia Guimarães', 'Sofiaguimaraes2@gmail.com',
   '$2a$10$lTJwfa2/MEdDKJGVWuzQ7.f0h1WDD6F8dsdLye30daMBR1CS/HutO', 'ativo', 2),
  (3, 'Daniel Lisboa', 'Daniel.ljunior@gmail.com',
   '$2a$10$2WNnQXZiQqrna9.Y84vK2e1e/d2zUiYRZWKoPP7ygdxCVjCRjXKm.', 'ativo', 2),
  (4, 'Rafaela Almeida', 'Rafaalmeida@gmail.com',
   '$2a$10$hov0KXmElgFKVchfWsMESe.kapRtIgAGrSvt9H4AljZiMCi2YvaVm', 'ativo', 3),
  (5, 'Laura Silva de Magalhães Teixeira', 'Laurasilva@gmail.com',
   '$2a$10$zWs6aZXp5Jvy069OxPbLmeqBdnkr7gto77z2/NJgXYnMkzqXg3S8K', 'ativo', 2)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  situacao = VALUES(situacao),
  perfil_id = VALUES(perfil_id);

INSERT INTO psicologos (id, usuario_id, registro_profissional, area_atuacao) VALUES
  (1, 2, 'CRP 1234-5', 'Psicologia Clínica'),
  (2, 3, 'CRP 12121-5', 'Terapia Cognitiva Comportamental'),
  (3, 5, 'CRP 6924-7', 'Terapia Cognitiva Comportamental')
ON DUPLICATE KEY UPDATE
  registro_profissional = VALUES(registro_profissional),
  area_atuacao = VALUES(area_atuacao);

INSERT INTO clientes_pacientes
  (id, nome, contato, data_nascimento, situacao, dados_adicionais) VALUES
  (1, 'Paciente Demonstração 01', NULL, NULL, 'ativo', 'Registro ficticio para demonstracao academica.'),
  (2, 'Paciente Demonstração 02', NULL, NULL, 'ativo', 'Registro ficticio para demonstracao academica.'),
  (3, 'Paciente Demonstração 03', NULL, NULL, 'ativo', 'Registro ficticio para demonstracao academica.')
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  situacao = VALUES(situacao),
  dados_adicionais = VALUES(dados_adicionais);

INSERT INTO vinculos (id, psicologo_id, cliente_paciente_id) VALUES
  (1, 1, 1),
  (2, 2, 2),
  (3, 3, 3)
ON DUPLICATE KEY UPDATE
  psicologo_id = VALUES(psicologo_id),
  cliente_paciente_id = VALUES(cliente_paciente_id);

INSERT INTO agendamentos
  (id, psicologo_id, cliente_paciente_id, data_hora_consulta, status_confirmacao) VALUES
  (1, 1, 1, '2026-11-10 09:00:00', 'confirmado'),
  (2, 2, 2, '2026-11-10 10:30:00', 'pendente'),
  (3, 3, 3, '2026-11-11 14:00:00', 'confirmado')
ON DUPLICATE KEY UPDATE
  data_hora_consulta = VALUES(data_hora_consulta),
  status_confirmacao = VALUES(status_confirmacao);



