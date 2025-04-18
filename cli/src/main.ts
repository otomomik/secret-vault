import { Command } from "commander";
import { loginCommand } from "./commands/login";

const program = new Command();

program
  .name("secret-vault")
  .description("CLI for Secret Vault")
  .version("1.0.0");

program.addCommand(loginCommand);

program.parse();
