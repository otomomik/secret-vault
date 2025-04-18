import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { client } from "../api/client";
import { loadConfig } from "../utils/config";
import { saveToCache } from "../utils/cache";

interface SecretValueConfig {
  uid?: string;
  latestVersion?: number;
}

export const pullCommand = new Command("pull")
  .description("Pull latest version of encrypted data")
  .action(async () => {
    try {
      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      const configPath = join(process.cwd(), ".secret-vault.json");
      if (!existsSync(configPath)) {
        console.error("Secret vault not initialized. Please run init first.");
        process.exit(1);
      }

      const vaultConfig: SecretValueConfig = JSON.parse(
        readFileSync(configPath, "utf-8"),
      );

      if (!vaultConfig.uid) {
        console.error("No secret selected. Please run init first.");
        process.exit(1);
      }

      // Get latest version info
      const response = await client.api.secrets[":uid"].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch secret info");
      }

      const secret = await response.json();

      // Check if we already have the latest version
      if (vaultConfig.latestVersion === secret.latestVersion) {
        console.log("Already have the latest version");
        process.exit(0);
      }

      // Get latest encrypted data
      const encryptedDataResponse = await client.api.secrets[":uid"][
        "encrypted-data"
      ].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
        query: {
          version: secret.latestVersion.toString(),
        },
      });

      if (!encryptedDataResponse.ok) {
        throw new Error("Failed to fetch encrypted data");
      }

      const { encryptedData } = await encryptedDataResponse.json();

      // Save to cache
      saveToCache(vaultConfig.uid, secret.latestVersion, encryptedData);

      // Update config with new version
      const newConfig: SecretValueConfig = {
        ...vaultConfig,
        latestVersion: secret.latestVersion,
      };

      writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      console.log("Successfully pulled latest version!");
    } catch (error) {
      console.error("Error pulling latest version:", error);
      process.exit(1);
    }
  });
