import { hc } from "hono/client";
import type { App } from "../../../api/src/index.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

export const client = hc<App>(API_URL, {
  headers: {
    "Content-Type": "application/json",
  },
});

// API型定義
export type ApiClient = typeof client & {
  api: {
    users: {
      post: (options: {
        json: { publicKey: string };
      }) => Promise<{ user: { id: string } }>;
    };
    // ... existing code ...
  };
};
