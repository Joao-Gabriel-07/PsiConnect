
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import {
  autenticarToken,
  autorizarPerfis,
  RequestAutenticada
} from './middleware';


/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Gerenciamento de contas e perfis de acesso
 *
 * /usuarios:
 *   get:
 *     summary: Listar usuários
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários.
 *       401:
 *         description: Token inválido ou ausente.
 *       403:
 *         description: Acesso permitido somente ao administrador.
 *
 *   post:
 *     summary: Cadastrar usuário
 *     tags: [Usuários]
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
 *               - perfil_id
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@email.com
 *               senha:
 *                 type: string
 *                 example: senha123
 *               perfil_id:
 *                 type: integer
 *                 example: 3
 *               situacao:
 *                 type: string
 *                 enum: [ativo, inativo, bloqueado]
 *                 example: ativo
 *     responses:
 *       201:
 *         description: Usuário cadastrado.
 *       400:
 *         description: Dados inválidos.
 *       409:
 *         description: E-mail já cadastrado.
 *
 * /usuarios/{id}:
 *   patch:
 *     summary: Atualizar usuário
 *     tags: [Usuários]
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
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               perfil_id:
 *                 type: integer
 *               situacao:
 *                 type: string
 *                 enum: [ativo, inativo, bloqueado]
 *     responses:
 *       200:
 *         description: Usuário atualizado.
 *       400:
 *         description: Dados inválidos.
 *       403:
 *         description: Operação não permitida.
 *       404:
 *         description: Usuário não encontrado.
 */


const router = Router();

router.use(autenticarToken);
router.use(autorizarPerfis('Administrador'));

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [usuarios]: any = await db.query(`
      SELECT u.id, u.nome, u.email, u.situacao,
             u.perfil_id, p.nome AS perfil
      FROM usuarios u
      JOIN perfis p ON p.id = u.perfil_id
      ORDER BY u.id DESC
    `);

    return res.json(usuarios);
  } catch (error) {
    return res.status(500).json({
      mensagem: 'Erro ao listar usuários.'
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
const { nome, email, senha, perfil_id, situacao } = req.body;

const situacaoFinal = situacao || 'ativo';

if (!['ativo', 'inativo', 'bloqueado'].includes(situacaoFinal)) {
  return res.status(400).json({
    mensagem: 'Situação inválida.'
  });
}
    if (!nome || !email || !senha || !perfil_id) {
      return res.status(400).json({
        mensagem: 'Preencha todos os campos.'
      });
    }

    if (String(senha).length < 6) {
      return res.status(400).json({
        mensagem: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    const [existente]: any = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        mensagem: 'Este e-mail já está cadastrado.'
      });
    }

    const [perfil]: any = await db.query(
      'SELECT id FROM perfis WHERE id = ?',
      [perfil_id]
    );

    if (perfil.length === 0) {
      return res.status(400).json({
        mensagem: 'Perfil inválido.'
      });
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    const [resultado]: any = await db.query(
      `INSERT INTO usuarios
 (nome, email, senha_hash, perfil_id, situacao)
 VALUES (?, ?, ?, ?, ?)`,
[nome, email, senha_hash, perfil_id, situacaoFinal]
    );

    await db.query(
  'INSERT INTO logs_acoes (usuario_id, acao) VALUES (?, ?)',
  [
    (req as RequestAutenticada).usuario!.id,
    `Cadastrou o usuário ${resultado.insertId}`
  ]
);

    return res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      id: resultado.insertId
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: 'Erro ao cadastrar usuário.'
    });
  }
});

// Editar usuário
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { nome, email, perfil_id, situacao } = req.body;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ mensagem: 'ID inválido.' });
    }

    if (id === (req as RequestAutenticada).usuario!.id && perfil_id) {
      const [atual]: any = await db.query(
        'SELECT perfil_id FROM usuarios WHERE id = ?',
        [id]
      );

      if (atual[0]?.perfil_id !== Number(perfil_id)) {
        return res.status(403).json({
          mensagem: 'Você não pode alterar o próprio perfil.'
        });
      }
    }

    if (situacao && !['ativo', 'inativo', 'bloqueado'].includes(situacao)) {
      return res.status(400).json({
        mensagem: 'Situação inválida.'
      });
    }

    const [atualizado]: any = await db.query(
      `UPDATE usuarios
       SET nome = COALESCE(?, nome),
           email = COALESCE(?, email),
           perfil_id = COALESCE(?, perfil_id),
           situacao = COALESCE(?, situacao)
       WHERE id = ?`,
      [nome ?? null, email ?? null, perfil_id ?? null, situacao ?? null, id]
    );

    if (atualizado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: 'Usuário não encontrado.'
      });
    }

    await db.query(
      'INSERT INTO logs_acoes (usuario_id, acao) VALUES (?, ?)',
      [(req as RequestAutenticada).usuario!.id, `Atualizou o usuário ${id}`]
    );

    return res.json({
      mensagem: 'Usuário atualizado com sucesso.'
    });
  } catch (error) {
    return res.status(500).json({
      mensagem: 'Erro ao atualizar usuário.'
    });
  }
});

export default router;
