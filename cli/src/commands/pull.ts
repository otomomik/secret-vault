import { Command } from "commander";
import { client } from "../api/client";
import { loadConfig } from "../utils/config";
import { saveToCache } from "../utils/cache";
import { loadVaultConfig, saveVaultConfig } from "../utils/vault-config";

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

      const vaultConfig = loadVaultConfig();
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
        : secret.version;

      if (!targetVersion) {
        console.error("Invalid secret: version is missing");
        process.exit(1);
      }

      // Check if we already have the requested version
      if (vaultConfig.version === targetVersion && !options.version) {
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
        const newConfig = {
          ...vaultConfig,
          version: secret.version,
        };
        saveVaultConfig(newConfig);
      }

      console.log(`Successfully pulled version ${targetVersion}!`);
    } catch (error) {
      console.error("Error pulling version:", error);
      process.exit(1);
    }
  });
