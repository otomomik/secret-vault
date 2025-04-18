// schema.ts
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
// @ts-ignore
import { projectRootDir } from "./config.ts";
import { PGlite } from "@electric-sql/pglite";
import { vector as pgVector } from "@electric-sql/pglite/vector";
import path from "path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

// タイムスタンプ
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// 操作タイプの列挙型
export const operationTypeEnum = pgEnum("operation_type", [
  "create_secret",
  "update_secret",
  "rotate_key",
  "add_user_key",
  "revoke_user_key",
  "grant_access",
  "revoke_access",
  "access_secret",
  "delete_secret",
  "restore_secret",
]);
// アクセス招待状態の列挙型
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "approved",
  "rejected",
]);

// ユーザーテーブル
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  ...timestamps,
});

// ユーザーの鍵テーブル
export const userKeys = pgTable("user_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  publicKey: text("public_key").notNull(),
  keyId: uuid("key_id").defaultRandom().notNull().unique(),
  name: text("key_name"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  ...timestamps,
});

// シークレット（秘密情報）テーブル - 最小限の情報のみを保持
export const secrets = pgTable("secrets", {
  id: serial("id").primaryKey(),
  uid: uuid("uid").defaultRandom().notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

// シークレットバージョンのメタデータテーブル
export const secretVersions = pgTable("secret_versions", {
  id: serial("id").primaryKey(),
  secretId: integer("secret_id")
    .references(() => secrets.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").notNull(),
  metadata: jsonb("metadata"),
  ...timestamps,
});

// ユーザーごとの暗号化されたシークレットデータテーブル
export const encryptedSecretData = pgTable("encrypted_secret_data", {
  id: serial("id").primaryKey(),
  secretVersionId: integer("secret_version_id")
    .references(() => secretVersions.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  userKeyId: integer("user_key_id").references(() => userKeys.id, {
    onDelete: "set null",
  }),
  encryptedData: text("encrypted_data").notNull(),
  ...timestamps,
});

// 操作履歴テーブル
export const operations = pgTable("operations", {
  id: serial("id").primaryKey(),
  operationType: operationTypeEnum("operation_type").notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  userKeyId: integer("user_key_id").references(() => userKeys.id, {
    onDelete: "set null",
  }),
  secretId: integer("secret_id").references(() => secrets.id, {
    onDelete: "cascade",
  }),
  secretVersionId: integer("secret_version_id").references(
    () => secretVersions.id,
    { onDelete: "set null" },
  ),
  targetUserId: integer("target_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

// シークレット所有権テーブル
export const secretOwnerships = pgTable("secret_ownerships", {
  id: serial("id").primaryKey(),
  secretId: integer("secret_id")
    .references(() => secrets.id, { onDelete: "cascade" })
    .notNull(),
  ownerId: integer("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  operationId: integer("operation_id").references(() => operations.id),
  ...timestamps,
});

// アクセス権限テーブル
export const accessPermissions = pgTable("access_permissions", {
  id: serial("id").primaryKey(),
  secretId: integer("secret_id")
    .references(() => secrets.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  invitedBy: integer("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  grantOperationId: integer("grant_operation_id").references(
    () => operations.id,
  ),
  responseOperationId: integer("response_operation_id").references(
    () => operations.id,
  ),
  ...timestamps,
});

// db
const pglite = new PGlite({
  dataDir: path.join(projectRootDir, ".pglite"),
  extensions: { vector: pgVector },
});
export const dbClient = drizzle(pglite);

export const runMigration = async () => {
  await dbClient.execute("CREATE EXTENSION IF NOT EXISTS vector");
  await migrate(dbClient, {
    migrationsFolder: path.join(projectRootDir, "drizzle"),
  });
};
