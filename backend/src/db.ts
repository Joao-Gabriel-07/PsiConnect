import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config();

const sslCa = process.env.DB_SSL_CA
    ? process.env.DB_SSL_CA.replace(/\\n/g, "\n")
    : process.env.DB_SSL_CA_PATH
        ? fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8")
        : undefined;

export const db = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "site_psicologia",

    ssl: {
        ca: sslCa,
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function testarConexao(): Promise<void> {
    const conexao = await db.getConnection();

    console.log("Conexão com o TiDB realizada com sucesso!");

    conexao.release();
}