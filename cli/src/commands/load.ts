// This file will be renamed to load.ts
import { Command } from "commander";
import { loadConfig } from "../utils/config";
import { loadVaultConfig } from "../utils/vault-config";
import { readFromCache } from "../utils/cache";
import { decryptWithPrivateKey } from "@secret-vault/utils";
import { client } from "../api/client";

export const loadCommand = new Command("load")
  .description("Load environment variables from the secret vault")
  .option("-v, --version <version>", "Specific version to load")
  .action(async (options) => {
    try {
      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      if (!config.privateKey) {
        console.error("Private key not found. Please login again.");
        process.exit(1);
      }

      const vaultConfig = loadVaultConfig();
      if (!vaultConfig.uid) {
        console.error("No secret selected. Please run init first.");
        process.exit(1);
      }

      // Determine which version to use
      let targetVersion = vaultConfig.version;
      if (options.version) {
        targetVersion = parseInt(options.version, 10);
      }

      if (!targetVersion) {
        console.error(
          "No version information available. Please run init or pull first.",
        );
        process.exit(1);
      }

      // Try to read from cache first
      let encryptedData = readFromCache(vaultConfig.uid, targetVersion);

      // If not in cache, fetch from server
      if (!encryptedData) {
        console.log(
          `Version ${targetVersion} not found in cache. Fetching from server...`,
        );

        const encryptedDataResponse = await client.api.secrets[":uid"][
          "encrypted-data"
        ].$get({
          header: {
            "x-user-id": config.userId,
          },
          param: {
            uid: vaultConfig.uid,
          },
          query: { version: targetVersion.toString() },
        });

        if (!encryptedDataResponse.ok) {
          throw new Error("Failed to fetch encrypted data");
        }

        const responseData = await encryptedDataResponse.json();
        encryptedData = responseData.encryptedData;
      }

      // Decrypt the data
      const decryptedData = decryptWithPrivateKey(
        encryptedData,
        config.privateKey,
      );
      console.log(decryptedData);
    } catch (error) {
      console.error("Error loading environment variables:", error);
      process.exit(1);
    }
  });
