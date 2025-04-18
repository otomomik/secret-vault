import { serve } from "@hono/node-server";
import { runMigration } from "./db.js";
import {
  dbClient,
  secretsTable,
  secretVersionsTable,
  accessPermissionsTable,
  userKeysTable,
  encryptedSecretDataTable,
} from "./db.js";
import { createSelectSchema } from "drizzle-zod";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { swaggerUI } from "@hono/swagger-ui";
import { eq, desc, and } from "drizzle-orm";

const secretSelectSchema = createSelectSchema(secretsTable);
const secretsSchema = z.array(
  secretSelectSchema.omit({ id: true }).extend({
    latestVersion: z.number(),
  }),
);
const userKeySelectSchema = createSelectSchema(userKeysTable);
const userKeysSchema = z.array(userKeySelectSchema);

const secretDetailSchema = secretSelectSchema.omit({ id: true }).extend({
  latestVersion: z.number(),
});

const secretCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  encryptedData: z.string(),
  metadata: z.record(z.string()).optional(),
});

const main = async () => {
  await runMigration();

  const app = new OpenAPIHono();

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/secrets",
      request: {
        headers: z.object({
          "x-user-id": z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: secretsSchema,
            },
          },
          description: "シークレット一覧を取得",
        },
        401: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "認証エラー",
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
        const userId = c.req.header("x-user-id");
        if (!userId) {
          return c.json({ error: "認証が必要です" }, 401);
        }

        // ユーザーがアクセス可能なシークレットを取得
        const accessibleSecrets = await dbClient
          .select({
            secret: secretsTable,
          })
          .from(accessPermissionsTable)
          .innerJoin(
            secretsTable,
            eq(accessPermissionsTable.secretId, secretsTable.id),
          )
          .where(
            and(
              eq(accessPermissionsTable.userId, parseInt(userId)),
              eq(accessPermissionsTable.status, "approved"),
            ),
          );

        // 各シークレットの最新バージョンを取得
        const secretsWithVersions = await Promise.all(
          accessibleSecrets.map(async (item) => {
            const [latestVersion] = await dbClient
              .select({
                version: secretVersionsTable.version,
              })
              .from(secretVersionsTable)
              .where(eq(secretVersionsTable.secretId, item.secret.id))
              .orderBy(desc(secretVersionsTable.version))
              .limit(1);

            const { id, ...secretWithoutId } = item.secret;
            return {
              ...secretWithoutId,
              latestVersion: latestVersion?.version || 0,
            };
          }),
        );

        return c.json(secretsWithVersions, 200);
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
        headers: z.object({
          "x-user-id": z.string(),
        }),
        params: z.object({
          uid: z.string().uuid("無効なUIDです"),
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
        401: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "認証エラー",
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
        const userId = c.req.header("x-user-id");
        if (!userId) {
          return c.json({ error: "認証が必要です" }, 401);
        }

        const { uid } = c.req.valid("param");

        // ユーザーがアクセス可能なシークレットを取得
        const [accessibleSecret] = await dbClient
          .select({
            secret: secretsTable,
          })
          .from(accessPermissionsTable)
          .innerJoin(
            secretsTable,
            eq(accessPermissionsTable.secretId, secretsTable.id),
          )
          .where(
            and(
              eq(accessPermissionsTable.userId, parseInt(userId)),
              eq(accessPermissionsTable.status, "approved"),
              eq(secretsTable.uid, uid),
            ),
          )
          .limit(1);

        if (!accessibleSecret) {
          return c.json({ error: "シークレットが見つかりません" }, 404);
        }

        const secret = accessibleSecret.secret;

        // 最新バージョンを取得
        const [latestVersion] = await dbClient
          .select({
            version: secretVersionsTable.version,
          })
          .from(secretVersionsTable)
          .where(eq(secretVersionsTable.secretId, secret.id))
          .orderBy(desc(secretVersionsTable.version))
          .limit(1);

        const { id, ...secretWithoutId } = secret;
        const response = {
          ...secretWithoutId,
          latestVersion: latestVersion?.version || 0,
        };

        return c.json(response, 200);
      } catch (error) {
        console.error("シークレットの取得に失敗しました:", error);
        return c.json({ error: "シークレットの取得に失敗しました" }, 500);
      }
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/secrets/{uid}/encrypted-data",
      request: {
        headers: z.object({
          "x-user-id": z.string(),
        }),
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
              schema: z.object({
                encryptedData: z.string(),
              }),
            },
          },
          description: "シークレットの暗号化データを取得",
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
        401: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "認証エラー",
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
        const userId = c.req.header("x-user-id");
        if (!userId) {
          return c.json({ error: "認証が必要です" }, 401);
        }

        const { uid } = c.req.valid("param");
        const { version } = c.req.valid("query");

        // ユーザーがアクセス可能なシークレットを取得
        const [accessibleSecret] = await dbClient
          .select({
            secret: secretsTable,
          })
          .from(accessPermissionsTable)
          .innerJoin(
            secretsTable,
            eq(accessPermissionsTable.secretId, secretsTable.id),
          )
          .where(
            and(
              eq(accessPermissionsTable.userId, parseInt(userId)),
              eq(accessPermissionsTable.status, "approved"),
              eq(secretsTable.uid, uid),
            ),
          )
          .limit(1);

        if (!accessibleSecret) {
          return c.json({ error: "シークレットが見つかりません" }, 404);
        }

        const secret = accessibleSecret.secret;
        let secretVersion;
        if (version !== undefined) {
          secretVersion = await dbClient
            .select()
            .from(secretVersionsTable)
            .where(
              and(
                eq(secretVersionsTable.secretId, secret.id),
                eq(secretVersionsTable.version, version),
              ),
            )
            .limit(1);
        } else {
          secretVersion = await dbClient
            .select()
            .from(secretVersionsTable)
            .where(eq(secretVersionsTable.secretId, secret.id))
            .orderBy(desc(secretVersionsTable.version))
            .limit(1);
        }

        if (!secretVersion || secretVersion.length === 0) {
          return c.json(
            { error: "シークレットのバージョンが見つかりません" },
            404,
          );
        }

        // ユーザー用の暗号化データを取得
        const [encryptedData] = await dbClient
          .select()
          .from(encryptedSecretDataTable)
          .where(
            and(
              eq(encryptedSecretDataTable.secretVersionId, secretVersion[0].id),
              eq(encryptedSecretDataTable.userId, parseInt(userId)),
            ),
          )
          .limit(1);

        if (!encryptedData) {
          return c.json({ error: "暗号化データが見つかりません" }, 404);
        }

        return c.json({ encryptedData: encryptedData.encryptedData }, 200);
      } catch (error) {
        console.error("暗号化データの取得に失敗しました:", error);
        return c.json({ error: "暗号化データの取得に失敗しました" }, 500);
      }
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/keys",
      request: {
        headers: z.object({
          "x-user-id": z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: userKeysSchema,
            },
          },
          description: "ユーザーの鍵一覧を取得",
        },
        401: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "認証エラー",
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
        const userId = c.req.header("x-user-id");
        if (!userId) {
          return c.json({ error: "認証が必要です" }, 401);
        }

        const keys = await dbClient
          .select()
          .from(userKeysTable)
          .where(eq(userKeysTable.userId, parseInt(userId)))
          .orderBy(desc(userKeysTable.createdAt));

        return c.json(keys, 200);
      } catch (error) {
        console.error("鍵一覧の取得に失敗しました:", error);
        return c.json({ error: "鍵一覧の取得に失敗しました" }, 500);
      }
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/secrets",
      request: {
        headers: z.object({
          "x-user-id": z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: secretCreateSchema,
            },
          },
        },
      },
      responses: {
        201: {
          content: {
            "application/json": {
              schema: secretDetailSchema,
            },
          },
          description: "シークレットが作成されました",
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
        401: {
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
          description: "認証エラー",
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
        const userId = c.req.header("x-user-id");
        if (!userId) {
          return c.json({ error: "認証が必要です" }, 401);
        }

        const body = c.req.valid("json");
        const { name, description, encryptedData, metadata } = body;

        // シークレットを作成
        const [secret] = await dbClient
          .insert(secretsTable)
          .values({
            name,
            description,
          })
          .returning();

        // 最初のバージョンを作成
        const [version] = await dbClient
          .insert(secretVersionsTable)
          .values({
            secretId: secret.id,
            version: 1,
            metadata: metadata || {},
          })
          .returning();

        // 暗号化されたデータを保存
        await dbClient.insert(encryptedSecretDataTable).values({
          secretVersionId: version.id,
          userId: parseInt(userId),
          encryptedData,
        });

        // 作成者にアクセス権限を付与
        await dbClient.insert(accessPermissionsTable).values({
          secretId: secret.id,
          userId: parseInt(userId),
          status: "approved",
        });

        const { id, ...secretWithoutId } = secret;
        const response = {
          ...secretWithoutId,
          latestVersion: 1,
        };

        return c.json(response, 201);
      } catch (error) {
        console.error("シークレットの作成に失敗しました:", error);
        return c.json({ error: "シークレットの作成に失敗しました" }, 500);
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
