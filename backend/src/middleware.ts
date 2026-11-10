import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface RequestAutenticada extends Request {
    usuario?: {
        id: number;
        perfil: string;
    };
}

export function autenticarToken(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
        return res.status(401).json({
            mensagem: "Token de autenticação não informado."
        });
    }

    const token = cabecalho.split(" ")[1];
    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
        return res.status(500).json({
            mensagem: "Erro de configuração do servidor."
        });
    }

    try {
        const dados = jwt.verify(token, segredo) as jwt.JwtPayload;

        if (
            typeof dados.id !== "number" ||
            typeof dados.perfil !== "string"
        ) {
            return res.status(401).json({
                mensagem: "Token inválido."
            });
        }

        (req as RequestAutenticada).usuario = {
            id: dados.id,
            perfil: dados.perfil
        };

        next();
    } catch {
        return res.status(401).json({
            mensagem: "Token inválido ou expirado."
        });
    }
}

export function autorizarPerfis(...perfisPermitidos: string[]) {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        const requisicao = req as RequestAutenticada;
        const usuario = requisicao.usuario;

        if (!usuario) {
            return res.status(401).json({
                mensagem: "Usuário não autenticado."
            });
        }

        console.log(
    "Perfil recebido no token:",
    JSON.stringify(usuario.perfil)
);

console.log(
    "Perfis permitidos:",
    JSON.stringify(perfisPermitidos)
);

        if (!perfisPermitidos.includes(usuario.perfil)) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar este recurso."
            });
        }

        next();
    };
}