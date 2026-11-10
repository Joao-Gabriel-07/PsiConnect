import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const db = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "site_psicologia",
    ssl: {
    rejectUnauthorized: true
},
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function testarConexao(): Promise<void> {
    const conexao = await db.getConnection();

    console.log("Conexão com o MySQL realizada com sucesso!");

    conexao.release();
}