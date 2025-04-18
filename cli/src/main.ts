import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { createCommand } from "./commands/create";

const program = new Command();

program
  .name("secret-vault")
  .description("CLI for Secret Vault")
  .version("1.0.0");

program.addCommand(loginCommand);
program.addCommand(createCommand);

program.parse();
