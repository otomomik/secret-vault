import { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  ensureKeyPair,
  createUser,
} from "../utils/config";

export const loginCommand = new Command("login")
  .description("Login to Secret Vault")
  .action(async () => {
    try {
      let config = loadConfig();
      config = await ensureKeyPair(config);
      config = await createUser(config);
      saveConfig(config);
      console.log("Successfully logged in!");
    } catch (error) {
      console.error("Login failed:", error);
      process.exit(1);
    }
  });
