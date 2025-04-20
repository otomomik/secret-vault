import { Command } from "commander";
import { client } from "../api/client";
import { loadConfig } from "../utils/config";
import inquirer from "inquirer";
import { saveToCache } from "../utils/cache";
import { loadVaultConfig, saveVaultConfig } from "../utils/vault-config";

export const initCommand = new Command("init")
  .description("Initialize a secret vault in the current directory")
  .action(async () => {
    try {
      const config = loadConfig();
      if (!config.userId) {
        console.error("Please login first");
        process.exit(1);
      }

      let existingConfig = loadVaultConfig();
      let shouldOverwrite = false;

      if (existingConfig.uid) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message:
              "A secret vault already exists in this directory. Do you want to overwrite it?",
            default: false,
          },
        ]);
        shouldOverwrite = overwrite;
        if (!shouldOverwrite) {
          console.log("Operation cancelled");
          process.exit(0);
        }
      }

      // Get list of secrets
      const response = await client.api.secrets.$get({
        header: {
          "x-user-id": config.userId,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch secrets");
      }

      const secrets = await response.json();
      if (secrets.length === 0) {
        console.error("No secrets found. Please create a secret first.");
        process.exit(1);
      }

      // Let user select a secret
      const { selectedSecret } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedSecret",
          message: "Select a secret to initialize:",
          choices: secrets.map((secret: any) => ({
            name: `${secret.name}${secret.description ? ` - ${secret.description}` : ""}`,
            value: secret.uid,
          })),
        },
      ]);

      const secret = secrets.find(
        (secret: any) => secret.uid === selectedSecret,
      );
      if (!secret) {
        console.error("Secret not found");
        process.exit(1);
      }

      const encryptedDataResponse = await client.api.secrets[":uid"][
        "encrypted-data"
      ].$get({
        header: {
          "x-user-id": config.userId,
        },
        param: {
          uid: selectedSecret,
        },
        query: {},
      });
      if (!encryptedDataResponse.ok) {
        console.error("Failed to fetch encrypted data");
        process.exit(1);
      }

      const { encryptedData } = await encryptedDataResponse.json();

      // Save to cache
      if (!secret.version) {
        console.error("Invalid secret: version is missing");
        process.exit(1);
      }
      saveToCache(selectedSecret, secret.version, encryptedData);

      // Save the selected secret UID
      const newConfig = {
        ...existingConfig,
        uid: selectedSecret,
        version: secret.version,
      };

      saveVaultConfig(newConfig);
      console.log("Secret vault initialized successfully!");
    } catch (error) {
      console.error("Error initializing secret vault:", error);
      process.exit(1);
    }
  });
