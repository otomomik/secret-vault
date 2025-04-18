ALTER TABLE "secret_ownerships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "secret_ownerships" CASCADE;--> statement-breakpoint
ALTER TABLE "encrypted_secret_data" DROP CONSTRAINT "encrypted_secret_data_user_key_id_user_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "encrypted_secret_data" ADD CONSTRAINT "encrypted_secret_data_user_key_id_user_keys_id_fk" FOREIGN KEY ("user_key_id") REFERENCES "public"."user_keys"("id") ON DELETE cascade ON UPDATE no action;