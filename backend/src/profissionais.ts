import { Router, Request, Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { db } from "./db";
import {
    autenticarToken,
    autorizarPerfis,
    RequestAutenticada
} from "./middleware";import { registrarAuditoria } from "./auditoria";


/**
 * @swagger
 * tags:
 *   name: Profissionais
 *   description: Gerenciamento de psicólogos
 *
 * /profissionais:
 *   get:
 *     summary: Listar profissionais
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de profissionais.
 *
 *   post:
 *     summary: Cadastrar profissional
 *     tags: [Profissionais]
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
 *               - email
 *               - senha
 *               - registro_profissional
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Maria Silva
 *               email:
 *                 type: string
 *                 example: maria@email.com
 *               senha:
 *                 type: string
 *                 minLength: 8
 *                 example: Senha123
 *               registro_profissional:
 *                 type: string
 *                 example: CRP-03/12345
 *     responses:
 *       201:
 *         description: Profissional cadastrado.
 *       400:
 *         description: Dados inválidos.
 *       409:
 *         description: E-mail ou registro profissional já cadastrado.
 *
 * /profissionais/{id}:
 *   put:
 *     summary: Atualizar profissional
 *     tags: [Profissionais]
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
 *         description: Profissional atualizado.
 *       404:
 *         description: Profissional não encontrado.
 *
 *   delete:
 *     summary: Excluir profissional
 *     tags: [Profissionais]
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
 *         description: Profissional excluído.
 *       404:
 *         description: Profissional não encontrado.
 */

const router = Router();


const acessoAdmin = [
autenticarToken,
autorizarPerfis("Administrador")
];

const acessoPsicologo = [
    autenticarToken,
    autorizarPerfis("Psicólogo")
];

router.get(
"/",
...acessoAdmin,
async (_req: Request, res: Response) => {
try {
const [profissionais] = await db.execute<RowDataPacket[]>(
`SELECT
                    p.id AS profissional_id,
                    u.id AS usuario_id,
                    u.nome,
                    u.email,
                    u.situacao,
                    p.registro_profissional,
                    p.area_atuacao
                 FROM psicologos p
                 INNER JOIN usuarios u ON u.id = p.usuario_id
                 ORDER BY u.nome`
);


        return res.json(profissionais);
    } catch (erro) {
        console.error("Erro ao listar profissionais:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível listar os profissionais."
        });
    }
}


);


router.post(
"/",
...acessoAdmin,
async (req: Request, res: Response) => {
const conexao = await db.getConnection();

    try {
        const {
    nome,
    email,
    senha,
    situacao,
    registro_profissional,
    area_atuacao
} = req.body;

const situacaoFinal = situacao || "ativo";

if (!["ativo", "inativo", "bloqueado"].includes(situacaoFinal)) {
    return res.status(400).json({
        mensagem: "Situação do usuário inválida."
    });
}

        if (
            !nome?.trim() ||
            !email?.trim() ||
            !senha ||
            !registro_profissional?.trim()
        ) {
            return res.status(400).json({
                mensagem:
                    "Informe nome, e-mail, senha e registro profissional."
            });
        }

        if (String(senha).length < 8) {
            return res.status(400).json({
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
        }

        await conexao.beginTransaction();

        const [usuariosExistentes] =
            await conexao.execute<RowDataPacket[]>(
                "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
                [String(email).trim()]
            );

        if (usuariosExistentes.length > 0) {
            await conexao.rollback();

            return res.status(409).json({
                mensagem: "Já existe um usuário com esse e-mail."
            });
        }

        const [registrosExistentes] =
            await conexao.execute<RowDataPacket[]>(
                "SELECT id FROM psicologos WHERE registro_profissional = ? LIMIT 1",
                [String(registro_profissional).trim()]
            );

        if (registrosExistentes.length > 0) {
            await conexao.rollback();

            return res.status(409).json({
                mensagem: "Esse registro profissional já está cadastrado."
            });
        }

        const [perfis] = await conexao.execute<RowDataPacket[]>(
            "SELECT id FROM perfis WHERE nome = ? LIMIT 1",
            ["Psicólogo"]
        );

        if (perfis.length === 0) {
            await conexao.rollback();

            return res.status(500).json({
                mensagem: "O perfil Psicólogo não está cadastrado."
            });
        }

        const senhaHash = await bcrypt.hash(String(senha), 10);

        const [resultadoUsuario] =
            await conexao.execute<ResultSetHeader>(
                `INSERT INTO usuarios
    (nome, email, senha_hash, situacao, perfil_id)
 VALUES (?, ?, ?, ?, ?)`,
                [
    String(nome).trim(),
    String(email).trim(),
    senhaHash,
    situacaoFinal,
    perfis[0].id
]
            );

        await conexao.execute<ResultSetHeader>(
            `INSERT INTO psicologos
                (usuario_id, registro_profissional, area_atuacao)
             VALUES (?, ?, ?)`,
            [
                resultadoUsuario.insertId,
                String(registro_profissional).trim(),
                area_atuacao?.trim() || null
            ]
        );

        await conexao.commit();

        const requisicao = req as Request & {
            usuario?: { id: number; perfil: string };
        };

        if (requisicao.usuario) {
            try {
                await registrarAuditoria(
                    requisicao.usuario.id,
                    "Cadastrou um profissional"
                );
            } catch (erroAuditoria) {
                console.error(
                    "Erro ao registrar auditoria:",
                    erroAuditoria
                );
            }
        }

        const [novoProfissional] = await conexao.execute<RowDataPacket[]>(
    "SELECT id AS profissional_id FROM psicologos WHERE usuario_id = ? LIMIT 1",
    [resultadoUsuario.insertId]
);


return res.status(201).json({
    mensagem: "Profissional cadastrado com sucesso!",
    usuario_id: resultadoUsuario.insertId,
    profissional_id: novoProfissional[0].profissional_id
});
    } catch (erro) {
        await conexao.rollback();

        console.error("Erro ao cadastrar profissional:", erro);

        return res.status(500).json({
            mensagem: "Não foi possível cadastrar o profissional."
        });
    } finally {
        conexao.release();
    }
}


);

/**
 * @swagger
 * /profissionais/me:
 *   get:
 *     summary: Consultar o próprio perfil
 *     tags: [Profissionais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso permitido somente a psicólogos.
 *       404:
 *         description: Perfil não encontrado.
 *
 *   put:
 *     summary: Atualizar o próprio perfil
 *     tags: [Profissionais]
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
 *               - email
 *               - registro_profissional
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               registro_profissional:
 *                 type: string
 *               area_atuacao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil atualizado.
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso permitido somente a psicólogos.
 *       409:
 *         description: E-mail ou registro já cadastrado.
 */

router.get(
    "/me",
    ...acessoPsicologo,
    async (req: Request, res: Response) => {
        try {
            const requisicao = req as RequestAutenticada;
            const usuarioId = requisicao.usuario!.id;

            const [perfil] = await db.execute<RowDataPacket[]>(
                `SELECT
                    u.id AS usuario_id,
                    u.nome,
                    u.email,
                    p.id AS profissional_id,
                    p.registro_profissional,
                    p.area_atuacao
                 FROM usuarios u
                 INNER JOIN psicologos p ON p.usuario_id = u.id
                 WHERE u.id = ?
                 LIMIT 1`,
                [usuarioId]
            );

            if (perfil.length === 0) {
                return res.status(404).json({
                    mensagem: "Perfil profissional não encontrado."
                });
            }

            return res.json(perfil[0]);

        } catch (erro) {
            console.error("Erro ao consultar próprio perfil:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível consultar seu perfil."
            });
        }
    }
);

router.put(
    "/me",
    ...acessoPsicologo,
    async (req: Request, res: Response) => {
        const conexao = await db.getConnection();

        try {
            const requisicao = req as RequestAutenticada;
            const usuarioId = requisicao.usuario!.id;

            const {
                nome,
                email,
                registro_profissional,
                area_atuacao
            } = req.body;

            if (
                !nome?.trim() ||
                !email?.trim() ||
                !registro_profissional?.trim()
            ) {
                return res.status(400).json({
                    mensagem:
                        "Informe nome, e-mail e registro profissional."
                });
            }

            const emailFinal = String(email).trim();

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)) {
                return res.status(400).json({
                    mensagem: "Informe um e-mail válido."
                });
            }

            await conexao.beginTransaction();

            const [profissionais] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT id
                     FROM psicologos
                     WHERE usuario_id = ?
                     LIMIT 1`,
                    [usuarioId]
                );

            if (profissionais.length === 0) {
                await conexao.rollback();

                return res.status(404).json({
                    mensagem: "Perfil profissional não encontrado."
                });
            }

            const profissionalId = profissionais[0].id;

            const [emailExistente] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT id
                     FROM usuarios
                     WHERE email = ? AND id <> ?
                     LIMIT 1`,
                    [emailFinal, usuarioId]
                );

            if (emailExistente.length > 0) {
                await conexao.rollback();

                return res.status(409).json({
                    mensagem: "Esse e-mail já está cadastrado."
                });
            }

            const [registroExistente] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT id
                     FROM psicologos
                     WHERE registro_profissional = ? AND id <> ?
                     LIMIT 1`,
                    [
                        String(registro_profissional).trim(),
                        profissionalId
                    ]
                );

            if (registroExistente.length > 0) {
                await conexao.rollback();

                return res.status(409).json({
                    mensagem:
                        "Esse registro profissional já está cadastrado."
                });
            }

            await conexao.execute(
                `UPDATE usuarios
                 SET nome = ?, email = ?
                 WHERE id = ?`,
                [
                    String(nome).trim(),
                    emailFinal,
                    usuarioId
                ]
            );

            await conexao.execute(
                `UPDATE psicologos
                 SET registro_profissional = ?, area_atuacao = ?
                 WHERE id = ?`,
                [
                    String(registro_profissional).trim(),
                    area_atuacao?.trim() || null,
                    profissionalId
                ]
            );

            await conexao.commit();

            try {
                await registrarAuditoria(
                    usuarioId,
                    "Atualizou o próprio perfil profissional"
                );
            } catch (erroAuditoria) {
                console.error("Erro ao registrar auditoria:", erroAuditoria);
            }

            return res.json({
                mensagem: "Seu perfil foi atualizado com sucesso!"
            });

        } catch (erro) {
            await conexao.rollback();

            console.error("Erro ao atualizar próprio perfil:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível atualizar seu perfil."
            });

        } finally {
            conexao.release();
        }
    }
);

router.put(
    "/:id",
    ...acessoAdmin,
    async (req: Request, res: Response) => {
        const conexao = await db.getConnection();

        try {
            const id = Number(req.params.id);
            console.log("ID recebido na rota:", req.params.id);
            console.log("ID convertido:", id);

            const {
                nome,
                email,
                situacao,
                registro_profissional,
                area_atuacao
            } = req.body;

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do profissional inválido."
                });
            }

            if (
                !nome?.trim() ||
                !email?.trim() ||
                !registro_profissional?.trim()
            ) {
                return res.status(400).json({
                    mensagem:
                        "Informe nome, e-mail e registro profissional."
                });
            }

            if (
                situacao !== undefined &&
                !["ativo", "inativo", "bloqueado"].includes(situacao)
            ) {
                return res.status(400).json({
                    mensagem: "Situação do usuário inválida."
                });
            }

            await conexao.beginTransaction();

            const [profissionais] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT
                        p.id AS profissional_id,
                        u.id AS usuario_id
                     FROM psicologos p
                     INNER JOIN usuarios u ON u.id = p.usuario_id
                     WHERE p.id = ?
                     LIMIT 1`,
                    [id]
                );

            if (profissionais.length === 0) {
                await conexao.rollback();

                return res.status(404).json({
                    mensagem: "Profissional não encontrado."
                });
            }

            const usuarioId = profissionais[0].usuario_id;

            const [emailExistente] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT id FROM usuarios
                     WHERE email = ? AND id <> ?
                     LIMIT 1`,
                    [String(email).trim(), usuarioId]
                );

            if (emailExistente.length > 0) {
                await conexao.rollback();

                return res.status(409).json({
                    mensagem: "Esse e-mail já está cadastrado."
                });
            }

            const [registroExistente] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT id FROM psicologos
                     WHERE registro_profissional = ? AND id <> ?
                     LIMIT 1`,
                    [String(registro_profissional).trim(), id]
                );

            if (registroExistente.length > 0) {
                await conexao.rollback();

                return res.status(409).json({
                    mensagem:
                        "Esse registro profissional já está cadastrado."
                });
            }

            await conexao.execute<ResultSetHeader>(
                `UPDATE usuarios
                 SET nome = ?, email = ?, situacao = ?
                 WHERE id = ?`,
                [
                    String(nome).trim(),
                    String(email).trim(),
                    situacao ?? "ativo",
                    usuarioId
                ]
            );

            await conexao.execute<ResultSetHeader>(
                `UPDATE psicologos
                 SET registro_profissional = ?, area_atuacao = ?
                 WHERE id = ?`,
                [
                    String(registro_profissional).trim(),
                    area_atuacao?.trim() || null,
                    id
                ]
            );

            await conexao.commit();

            const requisicao = req as Request & {
                usuario?: { id: number; perfil: string };
            };

            if (requisicao.usuario) {
                try {
                    await registrarAuditoria(
                        requisicao.usuario.id,
                        "Editou um profissional"
                    );
                } catch (erroAuditoria) {
                    console.error(
                        "Erro ao registrar auditoria:",
                        erroAuditoria
                    );
                }
            }

            return res.json({
                mensagem: "Profissional atualizado com sucesso!"
            });
        } catch (erro) {
            try {
                await conexao.rollback();
            } catch (erroRollback) {
                console.error("Erro ao desfazer transação:", erroRollback);
            }

            console.error("Erro ao editar profissional:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível editar o profissional."
            });
        } finally {
            conexao.release();
        }
    }
);

router.delete(
    "/:id",
    ...acessoAdmin,
    async (req: Request, res: Response) => {
        const conexao = await db.getConnection();

        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    mensagem: "ID do profissional inválido."
                });
            }

            await conexao.beginTransaction();

            const [profissionais] =
                await conexao.execute<RowDataPacket[]>(
                    `SELECT usuario_id
                     FROM psicologos
                     WHERE id = ?
                     LIMIT 1`,
                    [id]
                );

            if (profissionais.length === 0) {
                await conexao.rollback();

                return res.status(404).json({
                    mensagem: "Profissional não encontrado."
                });
            }

            const usuarioId = profissionais[0].usuario_id;

            await conexao.execute<ResultSetHeader>(
                "DELETE FROM psicologos WHERE id = ?",
                [id]
            );

            await conexao.execute<ResultSetHeader>(
                "DELETE FROM usuarios WHERE id = ?",
                [usuarioId]
            );

            await conexao.commit();

            const requisicao = req as Request & {
                usuario?: { id: number; perfil: string };
            };

            if (requisicao.usuario) {
                try {
                    await registrarAuditoria(
                        requisicao.usuario.id,
                        "Excluiu um profissional"
                    );
                } catch (erroAuditoria) {
                    console.error("Erro ao registrar auditoria:", erroAuditoria);
                }
            }

            return res.json({
                mensagem: "Profissional excluído com sucesso!"
            });

        } catch (erro) {
            await conexao.rollback();

            console.error("Erro ao excluir profissional:", erro);

            return res.status(500).json({
                mensagem: "Não foi possível excluir o profissional."
            });
        } finally {
            conexao.release();
        }
    }
);

export default router;