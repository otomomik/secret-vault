import fs from "fs";
import path from "path";
import os from "os";
import { generateKeyPair } from "@secret-vault/utils";
import { client } from "../api/client";

export interface Config {
  userId?: string;
  publicKey?: string;
  privateKey?: string;
}

export const CONFIG_DIR = path.join(os.homedir(), ".secrets-vault");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

export const loadConfig = (): Config => {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
  return {};
};

export const saveConfig = (config: Config) => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

export const ensureKeyPair = async (config: Config): Promise<Config> => {
  if (!config.publicKey || !config.privateKey) {
    const { publicKey, privateKey } = generateKeyPair();
    return { ...config, publicKey, privateKey };
  }
  return config;
};

export const createUser = async (config: Config): Promise<Config> => {
  if (!config.userId) {
    const response = await client.api.users.$post({
      json: {
        username: Math.random().toString(36).substring(2, 15),
        publicKey: config.publicKey!,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to create user");
    }

    const user = await response.json();
    return { ...config, userId: user.id.toString() };
  }
  return config;
};
