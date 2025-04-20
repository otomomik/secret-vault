ALTER TABLE "operations" DROP CONSTRAINT "operations_user_key_id_user_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "operations" DROP CONSTRAINT "operations_secret_version_id_secret_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "operations" DROP CONSTRAINT "operations_target_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_key_id_user_keys_id_fk" FOREIGN KEY ("user_key_id") REFERENCES "public"."user_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_secret_version_id_secret_versions_id_fk" FOREIGN KEY ("secret_version_id") REFERENCES "public"."secret_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;