import { type SecretRequest, type SecretResponse } from "./models/secret";
import pg from "pg";

const { Client } = pg
const client = new Client({
    host: Bun.env.DB_HOST,
    user: Bun.env.DB_USER,
    password: Bun.env.DB_PASS,
    database: Bun.env.DB_NAME,
})
await client.connect()

async function getSecrets(): Promise<Response> {
    let secretReponses: SecretResponse[] = [];
    try {
        const res = await client.query("SELECT * FROM secret_message");
        secretReponses = res.rows.map(row => ({
            id: row.id,
            message: row.message,
        }));
    } catch (e) {
        console.error(e);
        return new Response("Internal Server Error", {
            status: 500,
            statusText: "Internal Server Error",
        });
    }

    return new Response(JSON.stringify(secretReponses), {
        status: 200,
        statusText: "OK",
    });
}

async function postSecret(req: Request): Promise<Response> {
    const body = await req.json();
    const secretRequest: SecretRequest = {
        message: body.message,
    };

    let secretResponse: SecretResponse;
    try {
        const res = await client.query("INSERT INTO secret_message (message) VALUES ($1) RETURNING id", [secretRequest.message]);
        secretResponse = {
            id: res.rows[0].id,
            message: secretRequest.message,
        };
    } catch (e) {
        console.error(e);
        return new Response("Internal Server Error", {
            status: 500,
            statusText: "Internal Server Error",
        });
    } 
    return new Response(JSON.stringify(secretResponse), {
        status: 201,
        statusText: "Created",
    });
}

function methodNotAllowed(): Response {
    return new Response("Method Not Allowed", {
        status: 405,
        statusText: "What Are You Doing?"
    })
}

function notFound(): Response {
    return new Response("Not Found", {
        status: 404,
        statusText: "Bruh",
    })
}


const server = Bun.serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url).pathname.slice(1);
        switch (url) {
            case "secret":
                switch (req.method) {
                    case "GET":
                        return getSecrets();
                    case "POST":
                        return postSecret(req);
                    default:
                        return methodNotAllowed();
                }
            default:
                return notFound();
        }
    },
});

console.log(`Listening on http://localhost:${server.port} ...`);