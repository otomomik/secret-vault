import { Command } from "commander";
import { loadConfig } from "../utils/config";
import { loadVaultConfig, saveVaultConfig } from "../utils/vault-config";
import { client } from "../api/client";
import * as readline from "readline";

export const deleteCommand = new Command("delete")
  .description("Delete a secret from the vault")
  .option("-u, --uid <uid>", "UID of the secret to delete")
  .action(async (options) => {
    try {
      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      // Get the UID from options or from .secret-vault.json
      let uid = options.uid;
      if (!uid) {
        const vaultConfig = loadVaultConfig();
        uid = vaultConfig.uid;

        if (!uid) {
          console.error(
            "No secret selected. Please specify a UID or run init first.",
          );
          process.exit(1);
        }
      }

      // Ensure uid is a string
      const secretUid = String(uid);

      // Fetch the latest information about the secret
      const secretResponse = await client.api.secrets[":uid"].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: secretUid,
        },
        query: {}, // Add empty query object to satisfy type requirements
      });

      if (!secretResponse.ok) {
        throw new Error("Failed to fetch secret information");
      }

      const secretData = await secretResponse.json();

      // Confirm deletion
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        `Are you sure you want to delete the secret "${secretData.name}" (UID: ${secretUid})? This action cannot be undone. (yes/no): `,
        async (answer) => {
          rl.close();

          if (answer.toLowerCase() !== "yes") {
            console.log("Deletion cancelled.");
            return;
          }

          // Proceed with deletion
          const deleteResponse = await client.api.secrets[":uid"].$delete({
            header: {
              "x-user-id": config.userId!,
            },
            param: {
              uid: secretUid,
            },
          });

          if (!deleteResponse.ok) {
            throw new Error("Failed to delete secret");
          }

          console.log(
            `Secret "${secretData.name}" has been successfully deleted.`,
          );

          // If the deleted secret was the one in .secret-vault.json, clear it
          const vaultConfig = loadVaultConfig();
          if (vaultConfig.uid === secretUid) {
            saveVaultConfig({});
            console.log("Local secret configuration has been cleared.");
          }
        },
      );
    } catch (error) {
      console.error("Error deleting secret:", error);
      process.exit(1);
    }
  });
