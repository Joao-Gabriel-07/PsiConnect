import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realizar login no PsiConnect
 *     description: Autentica o usuário e retorna um token JWT válido por 2 horas.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@psiconnect.com
 *               senha:
 *                 type: string
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso.
 *       400:
 *         description: E-mail ou senha não informados.
 *       401:
 *         description: E-mail ou senha inválidos.
 *       403:
 *         description: Usuário inativo ou bloqueado.
 *       500:
 *         description: Erro interno ou de configuração do servidor.
 */


export async function login(req: Request, res: Response) {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: "Informe o e-mail e a senha."
            });
        }

        const [resultado] = await db.execute(
            `SELECT
                u.id,
                u.nome,
                u.email,
                u.senha_hash,
                u.situacao,
                p.nome AS perfil
             FROM usuarios u
             INNER JOIN perfis p ON p.id = u.perfil_id
             WHERE u.email = ?
             LIMIT 1`,
            [email]
        );

        const usuarios = resultado as Array<{
            id: number;
            nome: string;
            email: string;
            senha_hash: string;
            situacao: string;
            perfil: string;
        }>;

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensagem: "E-mail ou senha inválidos."
            });
        }

        const usuario = usuarios[0];

        if (usuario.situacao !== "ativo") {
            return res.status(403).json({
                mensagem: "Usuário inativo ou bloqueado."
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: "E-mail ou senha inválidos."
            });
        }

        const segredo = process.env.JWT_SECRET;

        if (!segredo) {
            console.error("JWT_SECRET não configurado.");

            return res.status(500).json({
                mensagem: "Erro de configuração do servidor."
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                perfil: usuario.perfil
            },
            segredo,
            { expiresIn: "2h" }
        );

        return res.json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });
   } catch (erro) {
    console.error("Erro no login:", erro);

    return res.status(500).json({
        mensagem: "Não foi possível realizar o login.",
        detalhe: erro instanceof Error
            ? erro.message
            : "Erro desconhecido."
    });
}}