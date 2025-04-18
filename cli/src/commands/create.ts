import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { client } from "../api/client";
import { encryptWithPublicKey } from "@secret-vault/utils";
import { loadConfig } from "../utils/config";

export const createCommand = new Command("create")
  .description("Create a new secret from a file")
  .requiredOption("-f, --file <path>", "Path to the file to encrypt")
  .requiredOption("-n, --name <name>", "Name of the secret")
  .option("-d, --description <description>", "Description of the secret")
  .option("-m, --metadata <metadata>", "Additional metadata in JSON format")
  .action(async (options) => {
    try {
      const filePath = join(process.cwd(), options.file);
      const fileContent = readFileSync(filePath, "utf-8");

      let metadata = {};
      if (options.metadata) {
        try {
          metadata = JSON.parse(options.metadata);
        } catch (e) {
          console.error("Invalid metadata JSON format");
          process.exit(1);
        }
      }

      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      const encryptedContent = encryptWithPublicKey(
        fileContent,
        config.publicKey!,
      );

      const response = await client.api.secrets.$post({
        header: {
          "x-user-id": config.userId,
        },
        json: {
          name: options.name,
          description: options.description,
          metadata,
          encryptedData: encryptedContent,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create secret");
      }

      const secret = await response.json();
      console.log("Secret created successfully:", secret.uid);
    } catch (error) {
      console.error("Error creating secret:", error);
      process.exit(1);
    }
  });
