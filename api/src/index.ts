import { serve } from "@hono/node-server";
import { runMigration } from "./db.js";
import { dbClient, secretsTable, secretVersionsTable } from "./db.js";
import { createSelectSchema } from "drizzle-zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { swaggerUI } from "@hono/swagger-ui";
import { eq, desc, and } from "drizzle-orm";

const secretSelectSchema = createSelectSchema(secretsTable);
const secretVersionSelectSchema = createSelectSchema(secretVersionsTable);
const secretsSchema = z.array(secretSelectSchema);

const secretDetailSchema = z.object({
  ...secretSelectSchema.shape,
  version: secretVersionSelectSchema,
});

const main = async () => {
  await runMigration();

  const app = new OpenAPIHono();

  app.openapi(
    createRoute({
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
    }),
    async (c) => {
      try {
        const allSecrets = await dbClient.select().from(secretsTable);
        return c.json(allSecrets, 200);
      } catch (error) {
        console.error("シークレット一覧の取得に失敗しました:", error);
        return c.json({ error: "シークレット一覧の取得に失敗しました" }, 500);
      }
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/secrets/{uid}",
      request: {
        params: z.object({
          uid: z.string().uuid("無効なUIDです"),
        }),
        query: z.object({
          version: z
            .string()
            .optional()
            .transform((val, ctx) => {
              if (!val) return undefined;
              const parsed = parseInt(val, 10);
              if (isNaN(parsed)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "無効なバージョンです",
                });
                return z.NEVER;
              }
              return parsed;
            }),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: secretDetailSchema,
            },
          },
          description: "シークレットの詳細を取得",
        },
        400: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "無効なリクエストです",
        },
        404: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "シークレットが見つかりません",
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
    }),
    async (c) => {
      try {
        const { uid } = c.req.valid("param");
        const { version } = c.req.valid("query");

        const secret = await dbClient
          .select()
          .from(secretsTable)
          .where(eq(secretsTable.uid, uid))
          .limit(1);

        if (!secret || secret.length === 0) {
          return c.json({ error: "シークレットが見つかりません" }, 404);
        }

        const secretId = secret[0].id;
        let secretVersion;
        if (version !== undefined) {
          secretVersion = await dbClient
            .select()
            .from(secretVersionsTable)
            .where(
              and(
                eq(secretVersionsTable.secretId, secretId),
                eq(secretVersionsTable.version, version),
              ),
            )
            .limit(1);
        } else {
          secretVersion = await dbClient
            .select()
            .from(secretVersionsTable)
            .where(eq(secretVersionsTable.secretId, secretId))
            .orderBy(desc(secretVersionsTable.version))
            .limit(1);
        }

        if (!secretVersion || secretVersion.length === 0) {
          return c.json(
            { error: "シークレットのバージョンが見つかりません" },
            404,
          );
        }

        const response = {
          ...secret[0],
          version: secretVersion[0],
        };

        return c.json(response, 200);
      } catch (error) {
        console.error("シークレットの取得に失敗しました:", error);
        return c.json({ error: "シークレットの取得に失敗しました" }, 500);
      }
    },
  );

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
