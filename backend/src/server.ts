import rotasAgendamentos from "./agendamentos";
import rotasProfissionais from "./profissionais";
import rotasPacientes from "./pacientes";
import rotasUsuarios from "./usuarios";
import rotasAuditoria from "./auditoria";
import { autenticarToken, autorizarPerfis } from "./middleware";
import { login } from "./auth";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, testarConexao } from "./db";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500"
}));

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/pacientes", rotasPacientes);
app.use("/api/profissionais", rotasProfissionais);
app.use("/api/agendamentos", rotasAgendamentos);
app.use("/api/usuarios", rotasUsuarios);
app.use("/api/auditoria", rotasAuditoria);

app.get(
    "/api/protegida",
    autenticarToken,
    (req, res) => {
        res.json({
            mensagem: "Acesso autorizado! Token válido."
        });
    }
);


app.get(
    "/api/admin/teste",
    autenticarToken,
    autorizarPerfis("Administrador"),
    (req, res) => {
        res.json({
            mensagem: "Acesso administrativo autorizado!"
        });
    }
);
app.post("/api/auth/login", login);

app.get("/api/health", async (_req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({
            status: "ok",
            banco: "conectado",
            mensagem: "API e banco funcionando!"
        });
        } catch (erro) {
        console.error("ERRO NO TESTE DO BANCO:", erro);

        res.status(500).json({
            status: "erro",
            mensagem: "Não foi possível acessar o banco de dados."
        });
    }
});

async function iniciarServidor() {
    try {
        await testarConexao();

        app.listen(PORT, () => {
            console.log(`Servidor iniciado em http://localhost:${PORT}`);
            console.log(`Teste: http://localhost:${PORT}/api/health`);
        });
    } catch {
        console.error(
            "Não foi possível iniciar. Confira o MySQL e as configurações do .env."
        );
        process.exit(1);
    }
}

export default app;

if (!process.env.VERCEL) {
    iniciarServidor();
}