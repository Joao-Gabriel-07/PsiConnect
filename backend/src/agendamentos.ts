import { Router, Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "./db";
import {
    autenticarToken,
    autorizarPerfis,
    RequestAutenticada
} from "./middleware";
import { registrarAuditoria } from "./auditoria";


/**
 * @swagger
 * tags:
 *   name: Agendamentos
 *   description: Gerenciamento de consultas e horários
 *
 * /agendamentos:
 *   get:
 *     summary: Listar agendamentos
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de agendamentos.
 *       401:
 *         description: Token inválido ou ausente.
 *       403:
 *         description: Perfil sem permissão.
 *
 *   post:
 *     summary: Criar agendamento
 *     tags: [Agendamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - psicologo_id
 *               - cliente_paciente_id
 *               - data_hora_consulta
 *             properties:
 *               psicologo_id:
 *                 type: integer
 *                 example: 1
 *               cliente_paciente_id:
 *                 type: integer
 *                 example: 1
 *               data_hora_consulta:
 *                 type: string
 *                 example: "2026-11-10T14:00:00"
 *     responses:
 *       201:
 *         description: Agendamento criado.
 *       400:
 *         description: Dados obrigatórios ausentes ou inválidos.
 *       401:
 *         description: Token inválido ou ausente.
 *
 * /agendamentos/{id}:
 *   put:
 *     summary: Atualizar agendamento
 *     tags: [Agendamentos]
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
 *               - psicologo_id
 *               - cliente_paciente_id
 *               - data_hora_consulta
 *             properties:
 *               psicologo_id:
 *                 type: integer
 *               cliente_paciente_id:
 *                 type: integer
 *               data_hora_consulta:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agendamento atualizado.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Agendamento não encontrado.
 *
 *   delete:
 *     summary: Excluir agendamento
 *     tags: [Agendamentos]
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
 *         description: Agendamento excluído.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Agendamento não encontrado.
 *
 * /agendamentos/{id}/status:
 *   put:
 *     summary: Atualizar status do agendamento
 *     tags: [Agendamentos]
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
 *               - status_confirmacao
 *             properties:
 *               status_confirmacao:
 *                 type: string
 *                 enum: [pendente, confirmado, cancelado]
 *                 example: confirmado
 *     responses:
 *       200:
 *         description: Status atualizado.
 *       400:
 *         description: Status inválido.
 *       403:
 *         description: Acesso não permitido.
 *       404:
 *         description: Agendamento não encontrado.
 */


const router = Router();

const acessoAgendamentos = [
    autenticarToken,
    autorizarPerfis("Administrador", "Atendente", "Psicólogo")
];

router.post(
    "/",
    ...acessoAgendamentos,
    async (req: Request, res: Response) => {
        try {
            const {
    psicologo_id,
    cliente_paciente_id,
    data_hora_consulta
} = req.body;

const dataHoraMySQL = String(data_hora_consulta)
    .replace("T", " ")
    .slice(0, 19);

            if (
                !psicologo_id ||
                !cliente_paciente_id ||
                !data_hora_consulta
            ) {
                return res.status(400).json({
                    mensagem: "Informe o psicólogo, o paciente e a data e horário da consulta."
                });
            }

            const [resultado] = await db.execute<ResultSetHeader>(
                `INSERT INTO agendamentos
                (psicologo_id, cliente_paciente_id, data_hora_consulta, status_confirmacao)
                VALUES (?, ?, ?, 'pendente')`,
                  [
                    psicologo_id,
                    cliente_paciente_id,
                    dataHoraMySQL
                ]   
            );
            
            await db.execute(
    `INSERT INTO vinculos (psicologo_id, cliente_paciente_id)
     SELECT ?, ?
     WHERE NOT EXISTS (
         SELECT 1 FROM vinculos
         WHERE psicologo_id = ?
         AND cliente_paciente_id = ?
     )`,
    [
        psicologo_id,
        cliente_paciente_id,
        psicologo_id,
        cliente_paciente_id
    ]
);

            const requisicao = req as Request & {
                usuario?: {
                    id: number;
                    perfil: string;
                };
            };

            if (requisicao.usuario) {
                await registrarAuditoria(
                    requisicao.usuario.id,
                    "Cadastrou um agendamento"
                );
            }

            return res.status(201).json({
                mensagem: "Agendamento cadastrado com sucesso!",
                id: resultado.insertId
            });

        } catch (erro) {
            console.error("Erro ao cadastrar agendamento:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível cadastrar o agendamento."
            });
        }
    }
);

router.get(
    "/",
    ...acessoAgendamentos,
    async (req: Request, res: Response) => {
        try {
            const usuario = (req as RequestAutenticada).usuario;

            if (!usuario) {
                return res.status(401).json({
                    mensagem: "Usuário não autenticado."
                });
            }

            let sql = `
                SELECT
                    a.id,
                    a.psicologo_id,
                    a.cliente_paciente_id,
                    DATE_FORMAT(
                        a.data_hora_consulta,
                        '%Y-%m-%d %H:%i:%s'
                    ) AS data_hora_consulta,
                    a.status_confirmacao,
                    p.nome AS nome_psicologo,
                    c.nome AS nome_paciente
                FROM agendamentos a
                INNER JOIN psicologos ps
                    ON ps.id = a.psicologo_id
                INNER JOIN usuarios p
                    ON p.id = ps.usuario_id
                INNER JOIN clientes_pacientes c
                    ON c.id = a.cliente_paciente_id
            `;

            const parametros: number[] = [];

            if (usuario.perfil === "Psicólogo") {
                sql += ` WHERE ps.usuario_id = ?`;
                parametros.push(usuario.id);
            }

            sql += ` ORDER BY a.data_hora_consulta ASC`;

            const [agendamentos] = await db.execute<RowDataPacket[]>(
                sql,
                parametros
            );

            return res.json(agendamentos);

        } catch (erro) {
            console.error("Erro ao listar agendamentos:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível listar os agendamentos."
            });
        }
    }
);
router.put(
    "/:id",
    ...acessoAgendamentos,
    async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);

            const {
                psicologo_id,
                cliente_paciente_id,
                data_hora_consulta
            } = req.body;

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do agendamento inválido."
                });
            }

            if (
                !psicologo_id ||
                !cliente_paciente_id ||
                !data_hora_consulta
            ) {
                return res.status(400).json({
                    mensagem: "Informe o psicólogo, o paciente e a data e horário."
                });
            }

            const dataHoraMySQL = String(data_hora_consulta)
                .replace("T", " ")
                .slice(0, 19);

            const usuario = (req as RequestAutenticada).usuario;

let sql = `
    UPDATE agendamentos
    SET psicologo_id = ?,
        cliente_paciente_id = ?,
        data_hora_consulta = ?
    WHERE id = ?
`;

const parametros: (number | string)[] = [
    psicologo_id,
    cliente_paciente_id,
    dataHoraMySQL,
    id
];

if (usuario?.perfil === "Psicólogo") {
    sql += `
        AND psicologo_id = (
            SELECT id
            FROM psicologos
            WHERE usuario_id = ?
        )
    `;
    parametros.push(usuario.id);
}

const [resultado] = await db.execute<ResultSetHeader>(
    sql,
    parametros
);

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensagem: "Agendamento não encontrado."
                });
            }

            await db.execute(
    `INSERT INTO vinculos (psicologo_id, cliente_paciente_id)
     SELECT ?, ?
     WHERE NOT EXISTS (
         SELECT 1 FROM vinculos
         WHERE psicologo_id = ?
         AND cliente_paciente_id = ?
     )`,
    [
        psicologo_id,
        cliente_paciente_id,
        psicologo_id,
        cliente_paciente_id
    ]
);

            const requisicao = req as Request & {
                usuario?: {
                    id: number;
                    perfil: string;
                };
            };

            if (requisicao.usuario) {
                await registrarAuditoria(
                    requisicao.usuario.id,
                    "Editou um agendamento"
                );
            }

            return res.json({
                mensagem: "Agendamento atualizado com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao editar agendamento:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível editar o agendamento."
            });
        }
    }
);

router.put(
    "/:id/status",
    ...acessoAgendamentos,
    async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const { status_confirmacao } = req.body;

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do agendamento inválido."
                });
            }

            const statusPermitidos = [
                "pendente",
                "confirmado",
                "cancelado"
            ];

            if (!statusPermitidos.includes(status_confirmacao)) {
                return res.status(400).json({
                    mensagem: "Status de agendamento inválido."
                });
            }

            const usuario = (req as RequestAutenticada).usuario;

let sql = `
    UPDATE agendamentos
    SET status_confirmacao = ?
    WHERE id = ?
`;

const parametros: (number | string)[] = [
    status_confirmacao,
    id
];

if (usuario?.perfil === "Psicólogo") {
    sql += `
        AND psicologo_id = (
            SELECT id
            FROM psicologos
            WHERE usuario_id = ?
        )
    `;
    parametros.push(usuario.id);
}

const [resultado] = await db.execute<ResultSetHeader>(
    sql,
    parametros
);

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensagem: "Agendamento não encontrado."
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
                    `Alterou o status do agendamento para ${status_confirmacao}`
                );
            }

            return res.json({
                mensagem: "Status do agendamento atualizado com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao atualizar agendamento:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível atualizar o agendamento."
            });
        }
    }
);

router.delete(
    "/:id",
    ...acessoAgendamentos,
    async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do agendamento inválido."
                });
            }

            const usuario = (req as RequestAutenticada).usuario;

let sql = `
    DELETE FROM agendamentos
    WHERE id = ?
`;

const parametros: number[] = [id];

if (usuario?.perfil === "Psicólogo") {
    sql += `
        AND psicologo_id = (
            SELECT id
            FROM psicologos
            WHERE usuario_id = ?
        )
    `;
    parametros.push(usuario.id);
}

const [resultado] = await db.execute<ResultSetHeader>(
    sql,
    parametros
);

            if (resultado.affectedRows === 0) {
                return res.status(404).json({
                    mensagem: "Agendamento não encontrado."
                });
            }

            return res.json({
                mensagem: "Agendamento excluído com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao excluir agendamento:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível excluir o agendamento."
            });
        }
    }
);

export default router;