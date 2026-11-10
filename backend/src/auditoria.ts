
import { db } from "./db";
import { Router, Request, Response } from "express";
import {
    autenticarToken,
    autorizarPerfis
} from "./middleware";


/**
 * @swagger
 * tags:
 *   name: Auditoria
 *   description: Histórico de ações realizadas no sistema
 *
 * /auditoria:
 *   get:
 *     summary: Consultar registros de auditoria
 *     description: Retorna o histórico de ações realizadas pelos usuários do PsiConnect.
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registros de auditoria encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   usuario:
 *                     type: string
 *                   perfil:
 *                     type: string
 *                   acao:
 *                     type: string
 *                   data:
 *                     type: string
 *       401:
 *         description: Token inválido ou ausente.
 *       403:
 *         description: Acesso permitido somente ao administrador.
 *       500:
 *         description: Erro interno do servidor.
 */


const router = Router();

export async function registrarAuditoria(
    usuarioId: number,
    acao: string
): Promise<void> {
    try {
        await db.execute(
            `INSERT INTO logs_acoes (usuario_id, acao)
             VALUES (?, ?)`,
            [usuarioId, acao]
        );
    } catch (erro) {
        console.error("Erro ao registrar auditoria:", erro);
    }
}

router.get(
    "/",
    autenticarToken,
    autorizarPerfis("Administrador"),
    async (_req: Request, res: Response) => {
        try {
            const [registros]: any = await db.query(`
                SELECT
                    l.id,
                    l.usuario_id,
                    l.acao,
                    l.data_hora,
                    u.nome AS nome_usuario,
                    p.nome AS perfil
                FROM logs_acoes l
                LEFT JOIN usuarios u ON u.id = l.usuario_id
                LEFT JOIN perfis p ON p.id = u.perfil_id
                ORDER BY l.data_hora DESC
            `);

            return res.json(registros);
        } catch (erro) {
            console.error("Erro ao consultar auditoria:", erro);

            return res.status(500).json({
                mensagem: "Erro ao consultar registros de auditoria."
            });
        }
    }
);

export default router;
