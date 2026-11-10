
import swaggerJsdoc from "swagger-jsdoc";

const opcoesSwagger: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "PsiConnect API",
            version: "1.0.0",
            description:
                "Documentação oficial da API do sistema PsiConnect."
        },
        servers: [
            {
                url: "http://localhost:3000/api",
                description: "Servidor local"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Informe o token JWT recebido no login."
                }
            }
        }
    },
    apis: ["./src/**/*.ts"]
};

const swaggerSpec = swaggerJsdoc(opcoesSwagger);

export default swaggerSpec;
