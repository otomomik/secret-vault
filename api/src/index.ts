import { serve } from "@hono/node-server";
import { runMigration } from "./db.js";
import { dbClient } from "./db.js";
import { secretsTable } from "./db.js";
import { createSelectSchema } from "drizzle-zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { swaggerUI } from "@hono/swagger-ui";

const secretSelectSchema = createSelectSchema(secretsTable);
const secretsSchema = z.array(secretSelectSchema);

const main = async () => {
  await runMigration();

  const app = new OpenAPIHono();

  const getSecretsRoute = createRoute({
    method: "get",
    path: "/api/secrets",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: secretsSchema,
          },
        },
        description: "シークレット一覧を取得",
      },
      500: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "エラーが発生しました",
      },
    },
  });

  app.openapi(getSecretsRoute, async (c) => {
    try {
      const allSecrets = await dbClient.select().from(secretsTable);
      return c.json(allSecrets, 200);
    } catch (error) {
      console.error("シークレット一覧の取得に失敗しました:", error);
      return c.json({ error: "シークレット一覧の取得に失敗しました" }, 500);
    }
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "0.0.1",
      title: "Secret Vault API",
    },
  });
  app.get("/docs", swaggerUI({ url: "/doc" }));

  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );
};

main();
