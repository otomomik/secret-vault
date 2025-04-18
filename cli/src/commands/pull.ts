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
  .option("-v, --version <version>", "Specific version to pull")
  .action(async (options) => {
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

      // Get secret info
      const response = await client.api.secrets[":uid"].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
        query: options.version ? { version: options.version } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch secret info");
      }

      const secret = await response.json();

      // If version is specified, use that version
      const targetVersion = options.version
        ? parseInt(options.version, 10)
        : secret.latestVersion;

      // Check if we already have the requested version
      if (vaultConfig.latestVersion === targetVersion && !options.version) {
        console.log("Already have the latest version");
        process.exit(0);
      }

      // Get encrypted data
      const encryptedDataResponse = await client.api.secrets[":uid"][
        "encrypted-data"
      ].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: vaultConfig.uid,
        },
        query: { version: options.version },
      });

      if (!encryptedDataResponse.ok) {
        throw new Error("Failed to fetch encrypted data");
      }

      const { encryptedData } = await encryptedDataResponse.json();

      // Save to cache
      saveToCache(vaultConfig.uid, targetVersion, encryptedData);

      // Update config with new version (only if pulling latest)
      if (!options.version) {
        const newConfig: SecretValueConfig = {
          ...vaultConfig,
          latestVersion: secret.latestVersion,
        };
        writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      }

      console.log(`Successfully pulled version ${targetVersion}!`);
    } catch (error) {
      console.error("Error pulling version:", error);
      process.exit(1);
    }
  });
