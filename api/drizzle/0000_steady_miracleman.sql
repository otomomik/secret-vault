CREATE TYPE "public"."invite_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('create_secret', 'update_secret', 'rotate_key', 'add_user_key', 'revoke_user_key', 'grant_access', 'revoke_access', 'access_secret', 'delete_secret', 'restore_secret');--> statement-breakpoint
CREATE TABLE "access_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"secret_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invited_by" integer,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"grant_operation_id" integer,
	"response_operation_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encrypted_secret_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"secret_version_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"user_key_id" integer,
	"encrypted_data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_type" "operation_type" NOT NULL,
	"user_id" integer NOT NULL,
	"user_key_id" integer,
	"secret_id" integer,
	"secret_version_id" integer,
	"target_user_id" integer,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_ownerships" (
	"id" serial PRIMARY KEY NOT NULL,
	"secret_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"operation_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"secret_id" integer NOT NULL,
	"version" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "secrets_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"public_key" text NOT NULL,
	"key_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"key_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_keys_key_id_unique" UNIQUE("key_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_grant_operation_id_operations_id_fk" FOREIGN KEY ("grant_operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_permissions" ADD CONSTRAINT "access_permissions_response_operation_id_operations_id_fk" FOREIGN KEY ("response_operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_secret_data" ADD CONSTRAINT "encrypted_secret_data_secret_version_id_secret_versions_id_fk" FOREIGN KEY ("secret_version_id") REFERENCES "public"."secret_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_secret_data" ADD CONSTRAINT "encrypted_secret_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_secret_data" ADD CONSTRAINT "encrypted_secret_data_user_key_id_user_keys_id_fk" FOREIGN KEY ("user_key_id") REFERENCES "public"."user_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_key_id_user_keys_id_fk" FOREIGN KEY ("user_key_id") REFERENCES "public"."user_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_secret_version_id_secret_versions_id_fk" FOREIGN KEY ("secret_version_id") REFERENCES "public"."secret_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_ownerships" ADD CONSTRAINT "secret_ownerships_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_ownerships" ADD CONSTRAINT "secret_ownerships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_ownerships" ADD CONSTRAINT "secret_ownerships_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_versions" ADD CONSTRAINT "secret_versions_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_keys" ADD CONSTRAINT "user_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;