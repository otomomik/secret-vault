import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { runMigration } from "./db.js";
import { dbClient } from "./db.js";
import { secrets } from "./db.js";

const main = async () => {
  await runMigration();

  const app = new Hono();

  // シークレット一覧を取得するAPI
  app.get("/api/secrets", async (c) => {
    try {
      // シークレット一覧を取得
      const allSecrets = await dbClient.select().from(secrets);

      return c.json(allSecrets);
    } catch (error) {
      console.error("シークレット一覧の取得に失敗しました:", error);
      return c.json({ error: "シークレット一覧の取得に失敗しました" }, 500);
    }
  });

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
