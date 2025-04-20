import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface SecretValueConfig {
  uid?: string;
  version?: number;
  [key: string]: any;
}

export const getVaultConfigPath = () =>
  join(process.cwd(), ".secret-vault.json");

export const loadVaultConfig = (): SecretValueConfig => {
  const configPath = getVaultConfigPath();
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  }
  return {};
};

export const saveVaultConfig = (config: SecretValueConfig) => {
  const configPath = getVaultConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
};
