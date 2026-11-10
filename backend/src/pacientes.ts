import { registrarAuditoria } from "./auditoria";
import { Router, Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "./db";
import {
    autenticarToken,
    autorizarPerfis,
    RequestAutenticada
} from "./middleware";


/**
 * @swagger
 * tags:
 *   name: Pacientes
 *   description: Gerenciamento de pacientes
 *
 * /pacientes:
 *   get:
 *     summary: Listar pacientes
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pacientes.
 *       401:
 *         description: Token inválido ou ausente.
 *       403:
 *         description: Perfil sem permissão.
 *
 *   post:
 *     summary: Cadastrar paciente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - contato
 *               - data_nascimento
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Maria Silva
 *               contato:
 *                 type: string
 *                 example: maria@email.com
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *                 example: "1995-05-20"
 *               situacao:
 *                 type: string
 *                 enum: [ativo, inativo, bloqueado]
 *                 example: ativo
 *               dados_adicionais:
 *                 type: string
 *                 example: Informações adicionais
 *     responses:
 *       201:
 *         description: Paciente cadastrado.
 *       400:
 *         description: Dados inválidos ou obrigatórios ausentes.
 *       401:
 *         description: Token inválido ou ausente.
 *       403:
 *         description: Perfil sem permissão.
 *
 * /pacientes/{id}:
 *   get:
 *     summary: Buscar paciente por ID
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dados do paciente.
 *       403:
 *         description: Acesso não permitido ao paciente.
 *       404:
 *         description: Paciente não encontrado.
 *
 *   put:
 *     summary: Atualizar paciente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - contato
 *               - data_nascimento
 *               - situacao
 *             properties:
 *               nome:
 *                 type: string
 *               contato:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *               situacao:
 *                 type: string
 *                 enum: [ativo, inativo, bloqueado]
 *               dados_adicionais:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paciente atualizado.
 *       400:
 *         description: Dados inválidos.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Paciente não encontrado.
 *
 *   delete:
 *     summary: Inativar paciente
 *     description: Inativa o paciente e cancela seus agendamentos futuros.
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paciente inativado.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Paciente não encontrado.
 *
 * /pacientes/{id}/reativar:
 *   put:
 *     summary: Reativar paciente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paciente reativado.
 *       400:
 *         description: Não foi possível reativar o paciente.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Paciente não encontrado.
 *
 * /pacientes/{id}/excluir:
 *   delete:
 *     summary: Excluir paciente definitivamente
 *     tags: [Pacientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paciente excluído definitivamente.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Paciente não encontrado.
 */


const router = Router();

const acessoPacientes = [
    autenticarToken,
    autorizarPerfis("Administrador", "Atendente", "Psicólogo")
];



async function usuarioPodeAcessarPaciente(
    req: Request,
    pacienteId: number
): Promise<boolean> {
    const usuario = (req as RequestAutenticada).usuario;

    if (!usuario) {
        return false;
    }

    if (usuario.perfil !== "Psicólogo") {
        return true;
    }

    const [vinculos] = await db.execute<RowDataPacket[]>(
        `SELECT 1
         FROM vinculos v
         INNER JOIN psicologos p ON p.id = v.psicologo_id
         WHERE p.usuario_id = ?
           AND v.cliente_paciente_id = ?
         LIMIT 1`,
        [usuario.id, pacienteId]
    );

    return vinculos.length > 0;
}


router.post(
    "/",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        const requisicao = req as RequestAutenticada;
        const usuario = requisicao.usuario;

        if (!usuario) {
            return res.status(401).json({
                mensagem: "Usuário não autenticado."
            });
        }

        let conexao;

        try {
            const {
                nome,
                contato,
                data_nascimento,
                dados_adicionais,
                situacao = "ativo"
            } = req.body;

            if (!["ativo", "inativo", "bloqueado"].includes(situacao)) {
    return res.status(400).json({
        mensagem: "Situação do paciente inválida."
    });
}

            if (!nome || !contato || !data_nascimento) {
                return res.status(400).json({
                    mensagem: "Informe nome, contato e data de nascimento."
                });
            }

            conexao = await db.getConnection();
            await conexao.beginTransaction();

            const [resultado] = await conexao.execute<ResultSetHeader>(
                `INSERT INTO clientes_pacientes
(nome, contato, data_nascimento, situacao, dados_adicionais)
VALUES (?, ?, ?, ?, ?)`,
                [
    nome,
    contato,
    data_nascimento,
    situacao,
    dados_adicionais || null
]
            );

            const pacienteId = resultado.insertId;

            if (usuario.perfil === "Psicólogo") {
                const [profissionais] = await conexao.execute<RowDataPacket[]>(
                    `SELECT id
                     FROM psicologos
                     WHERE usuario_id = ?`,
                    [usuario.id]
                );

                if (profissionais.length === 0) {
                    throw new Error(
                        "Não existe cadastro profissional vinculado a este usuário."
                    );
                }

                const psicologoId = profissionais[0].id;

                await conexao.execute(
                    `INSERT INTO vinculos
                    (psicologo_id, cliente_paciente_id)
                    VALUES (?, ?)`,
                    [psicologoId, pacienteId]
                );
            }

            await conexao.commit();

            await registrarAuditoria(
                usuario.id,
                "Cadastrou um paciente"
            );

            return res.status(201).json({
                mensagem: "Paciente cadastrado com sucesso!",
                id: pacienteId
            });

        } catch (erro) {
            if (conexao) {
                await conexao.rollback();
            }

            console.error("Erro ao cadastrar paciente:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível cadastrar o paciente."
            });
        } finally {
            if (conexao) {
                conexao.release();
            }
        }
    }
);



router.get(
    "/",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        try {
            const requisicao = req as Request & {
                usuario?: {
                    id: number;
                    perfil: string;
                };
            };

            const usuario = requisicao.usuario!;

            if (
                usuario.perfil === "Administrador" ||
                usuario.perfil === "Atendente"
            ) {
                const [pacientes] = await db.execute<RowDataPacket[]>(
                    `SELECT id, nome, contato, data_nascimento,
                            situacao, dados_adicionais
                     FROM clientes_pacientes
                     ORDER BY nome`
                );

                return res.json(pacientes);
            }

            const [profissionais] = await db.execute<RowDataPacket[]>(
                `SELECT id
                 FROM psicologos
                 WHERE usuario_id = ?`,
                [usuario.id]
            );

            if (profissionais.length === 0) {
                return res.json([]);
            }

            const psicologoId = profissionais[0].id;

            const [pacientes] = await db.execute<RowDataPacket[]>(
                `SELECT cp.id, cp.nome, cp.contato,
                        cp.data_nascimento, cp.situacao,
                        cp.dados_adicionais
                 FROM clientes_pacientes cp
                 INNER JOIN vinculos v
                    ON v.cliente_paciente_id = cp.id
                 WHERE v.psicologo_id = ?
                 ORDER BY cp.nome`,
                [psicologoId]
            );

            return res.json(pacientes);

        } catch (erro) {
            console.error("Erro ao listar pacientes:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível listar os pacientes."
            });
        }
    }
);

router.get(
    "/:id",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const permitido = await usuarioPodeAcessarPaciente(req, id);

            if (!permitido) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para acessar este paciente."
                });
            }

            const [pacientes] = await db.execute<RowDataPacket[]>(
                `SELECT id, nome, contato, data_nascimento,
                        situacao, dados_adicionais
                 FROM clientes_pacientes
                 WHERE id = ?`,
                [id]
            );

            if (pacientes.length === 0) {
                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            return res.json(pacientes[0]);
        } catch (erro) {
            console.error("Erro ao consultar paciente:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível consultar o paciente."
            });
        }
    }
);



router.put(
    "/:id",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        let conexao;

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const permitido = await usuarioPodeAcessarPaciente(req, id);

            if (!permitido) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para editar este paciente."
                });
            }

            const {
                nome,
                contato,
                data_nascimento,
                dados_adicionais,
                situacao
            } = req.body;

            if (!["ativo", "inativo", "bloqueado"].includes(situacao)) {
                return res.status(400).json({
                    mensagem: "Situação do paciente inválida."
                });
            }

            if (!nome || !contato || !data_nascimento) {
                return res.status(400).json({
                    mensagem: "Informe nome, contato e data de nascimento."
                });
            }

            conexao = await db.getConnection();
            await conexao.beginTransaction();

            const [resultado] = await conexao.execute<ResultSetHeader>(
                `UPDATE clientes_pacientes
                 SET nome = ?,
                     contato = ?,
                     data_nascimento = ?,
                     situacao = ?,
                     dados_adicionais = ?
                 WHERE id = ?`,
                [
                    nome,
                    contato,
                    data_nascimento,
                    situacao,
                    dados_adicionais || null,
                    id
                ]
            );

            if (resultado.affectedRows === 0) {
                await conexao.rollback();

                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            if (situacao === "inativo" || situacao === "bloqueado") {
                await conexao.execute(
                    `UPDATE agendamentos
                     SET status_confirmacao = 'cancelado'
                     WHERE cliente_paciente_id = ?
                       AND data_hora_consulta > NOW()
                       AND status_confirmacao <> 'cancelado'`,
                    [id]
                );
            }

            await conexao.commit();

            const usuario = (req as RequestAutenticada).usuario;

            if (usuario) {
                await registrarAuditoria(
                    usuario.id,
                    `Atualizou um paciente para a situação ${situacao}`
                );
            }

            return res.json({
                mensagem: "Paciente atualizado com sucesso!"
            });

        } catch (erro) {
            if (conexao) {
                await conexao.rollback();
            }

            console.error("Erro ao atualizar paciente:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível atualizar o paciente."
            });
        } finally {
            if (conexao) {
                conexao.release();
            }
        }
    }
);



router.delete(
    "/:id",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        let conexao;

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const permitido = await usuarioPodeAcessarPaciente(req, id);

            if (!permitido) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para inativar este paciente."
                });
            }

            conexao = await db.getConnection();
            await conexao.beginTransaction();

            const [resultado] = await conexao.execute<ResultSetHeader>(
                `UPDATE clientes_pacientes
                 SET situacao = 'inativo'
                 WHERE id = ? AND situacao = 'ativo'`,
                [id]
            );

            if (resultado.affectedRows === 0) {
                await conexao.rollback();

                return res.status(404).json({
                    mensagem: "Paciente ativo não encontrado."
                });
            }

            // Cancela os agendamentos futuros do paciente.
            await conexao.execute(
                `UPDATE agendamentos
                 SET status_confirmacao = 'cancelado'
                 WHERE cliente_paciente_id = ?
                   AND data_hora_consulta > NOW()
                   AND status_confirmacao <> 'cancelado'`,
                [id]
            );

            await conexao.commit();

            const requisicao = req as Request & {
                usuario?: {
                    id: number;
                    perfil: string;
                };
            };

            if (requisicao.usuario) {
                await registrarAuditoria(
                    requisicao.usuario.id,
                    "Inativou um paciente e cancelou seus agendamentos futuros"
                );
            }

            return res.json({
                mensagem: "Paciente inativado e agendamentos futuros cancelados com sucesso!"
            });

        } catch (erro) {
            if (conexao) {
                await conexao.rollback();
            }

            console.error("Erro ao inativar paciente:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível inativar o paciente."
            });

        } finally {
            if (conexao) {
                conexao.release();
            }
        }
    }
);

router.put(
"/:id/reativar",
...acessoPacientes,
async (req: Request, res: Response) => {
try {
const id = Number(req.params.id);


        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensagem: "ID do paciente inválido."
            });
        }

        const permitido = await usuarioPodeAcessarPaciente(req, id);

            if (!permitido) {
                return res.status(403).json({
                    mensagem: "Você não tem permissão para reativar este paciente."
                });
            }

        const [resultado] = await db.execute<ResultSetHeader>(
            `UPDATE clientes_pacientes
             SET situacao = 'ativo'
             WHERE id = ? AND situacao = 'inativo'`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Paciente inativo não encontrado."
            });
        }

        return res.json({
            mensagem: "Paciente reativado com sucesso!"
        });
    } catch (erro) {
        console.error("Erro ao reativar paciente:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível reativar o paciente."
        });
    }
}

);

router.delete(
    "/:id/excluir",
    ...acessoPacientes,
    async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do paciente inválido."
                });
            }

            const permitido = await usuarioPodeAcessarPaciente(req, id);

if (!permitido) {
    return res.status(403).json({
        mensagem: "Você não tem permissão para excluir este paciente."
    });
}

            const [resultado] = await db.execute<ResultSetHeader>(
                `DELETE FROM clientes_pacientes
                 WHERE id = ?`,
                [id]
            );

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensagem: "Paciente não encontrado."
                });
            }

            const requisicao = req as Request & {
                usuario?: {
                    id: number;
                    perfil: string;
                };
            };

            if (requisicao.usuario) {
                await registrarAuditoria(
                    requisicao.usuario.id,
                    "Excluiu um paciente"
                );
            }

            return res.json({
                mensagem: "Paciente excluído com sucesso!"
            });
        } catch (erro) {
            console.error("Erro ao excluir paciente:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível excluir o paciente."
            });
        }
    }
);

export default router;