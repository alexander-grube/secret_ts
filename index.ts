import { type SecretRequest, type SecretResponse } from "./models/secret";
import pg from "pg";

const { Client } = pg;
const client = new Client({
  host: Bun.env.DB_HOST,
  user: Bun.env.DB_USER,
  password: Bun.env.DB_PASS,
  database: Bun.env.DB_NAME,
});
await client.connect();

async function getSecret(req: Request): Promise<Response> {
  let id = new URL(req.url).searchParams.get("id");
  let secretResponse: SecretResponse;
  try {
    const res = await client.query(
      "SELECT * FROM secret_message WHERE id = $1",
      [id]
    );
    if (res.rows.length === 0) {
      return notFound();
    }
    secretResponse = {
      id: res.rows[0].id,
      message: res.rows[0].message,
    };
  } catch (e) {
    console.error(e);
    return internalServerError();
  }

  return new Response(JSON.stringify(secretResponse), {
    status: 200,
    statusText: "OK",
  });
}

async function postSecret(req: Request): Promise<Response> {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error(e);
    return badRequest();
  }
  const secretRequest: SecretRequest = {
    message: body.message,
  };

  let secretResponse: SecretResponse;
  try {
    const res = await client.query(
      "INSERT INTO secret_message (message) VALUES ($1) RETURNING id",
      [secretRequest.message]
    );
    secretResponse = {
      id: res.rows[0].id,
      message: secretRequest.message,
    };
  } catch (e) {
    console.error(e);
    return internalServerError();
  }
  return new Response(JSON.stringify(secretResponse), {
    status: 201,
    statusText: "Created",
  });
}

function methodNotAllowed(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    statusText: "Method Not Allowed",
  });
}

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    statusText: "Not Found",
  });
}

function badRequest(): Response {
  return new Response("Bad Request", {
    status: 400,
    statusText: "Bad Request",
  });
}

function internalServerError(): Response {
  return new Response("Internal Server Error", {
    status: 500,
    statusText: "Internal Server Error",
  });
}

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url).pathname.slice(1);
    switch (url) {
      case "bun-secret/secret":
        switch (req.method) {
          case "GET":
            return getSecret(req);
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
