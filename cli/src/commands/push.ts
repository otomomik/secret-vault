import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import { client } from "../api/client";
import { encryptWithPublicKey } from "@secret-vault/utils";
import { loadConfig } from "../utils/config";
import { loadVaultConfig, saveVaultConfig } from "../utils/vault-config";
import { saveToCache } from "../utils/cache";

export const pushCommand = new Command("push")
  .description("Push updated secret data to the server")
  .requiredOption("-f, --file <path>", "Path to the file to encrypt")
  .option("-m, --metadata <metadata>", "Additional metadata in JSON format")
  .action(async (options) => {
    try {
      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      const vaultConfig = loadVaultConfig();
      if (!vaultConfig.uid) {
        console.error("No secret selected. Please run init first.");
        process.exit(1);
      }

      // Parse metadata if provided
      let metadata = {};
      if (options.metadata) {
        try {
          metadata = JSON.parse(options.metadata);
        } catch (e) {
          console.error("Invalid metadata JSON format");
          process.exit(1);
        }
      }

      // Read the file content
      const filePath = join(process.cwd(), options.file);
      const fileContent = readFileSync(filePath, "utf-8");

      // Get user keys associated with this secret
      const userKeysResponse = await client.api.secrets[":uid"][
        "user-keys"
      ].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
      });

      if (!userKeysResponse.ok) {
        throw new Error("Failed to fetch user keys");
      }

      const { userKeys } = await userKeysResponse.json();

      // Encrypt data with all public keys
      const encryptedDataEntries = userKeys.map((userKey) => {
        const encryptedData = encryptWithPublicKey(
          fileContent,
          userKey.publicKey,
        );
        return {
          userId: userKey.userId,
          encryptedData,
        };
      });

      // Update the secret
      const updateResponse = await client.api.secrets[":uid"].$put({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
        json: {
          encryptedDataEntries,
          metadata,
        },
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update secret");
      }

      const updatedSecret = await updateResponse.json();
      console.log(
        `Secret updated successfully to version ${updatedSecret.version}`,
      );

      // Update .secret-vault.json with the new version
      const newVaultConfig = {
        ...vaultConfig,
        version: updatedSecret.version,
      };
      saveVaultConfig(newVaultConfig);

      // Update cache with the new encrypted data
      // Find the entry for the current user
      const currentUserEntry = encryptedDataEntries.find(
        (entry) => entry.userId.toString() === config.userId,
      );

      if (currentUserEntry) {
        saveToCache(
          vaultConfig.uid,
          updatedSecret.version,
          currentUserEntry.encryptedData,
        );
        console.log(`Cache updated with version ${updatedSecret.version}`);
      }
    } catch (error) {
      console.error("Error pushing secret:", error);
      process.exit(1);
    }
  });
