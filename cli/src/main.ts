import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { createCommand } from "./commands/create";
import { initCommand } from "./commands/init";
import { pullCommand } from "./commands/pull";
import { loadCommand } from "./commands/load";
import { deleteCommand } from "./commands/delete";
import { pushCommand } from "./commands/push";

const program = new Command();

program
  .name("secret-vault")
  .description("CLI for Secret Vault")
  .version("1.0.0");

program.addCommand(loginCommand);
program.addCommand(createCommand);
program.addCommand(initCommand);
program.addCommand(pullCommand);
program.addCommand(loadCommand);
program.addCommand(deleteCommand);
program.addCommand(pushCommand);

program.parse();
