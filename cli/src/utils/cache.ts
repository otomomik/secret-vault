import fs from "fs";
import path from "path";
import os from "os";

export const getCacheDir = (uid: string, version: number) => {
  const cacheRoot = path.join(os.homedir(), ".cache", "secret-vault", uid);
  const cacheDir = path.join(cacheRoot, version.toString());
  return { cacheRoot, cacheDir };
};

export const saveToCache = (
  uid: string,
  version: number,
  encryptedData: string,
) => {
  const { cacheRoot, cacheDir } = getCacheDir(uid, version);

  // Create directories if they don't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Save encrypted data
  fs.writeFileSync(path.join(cacheDir, "data"), encryptedData);
};

export const readFromCache = (uid: string, version: number): string | null => {
  const { cacheDir } = getCacheDir(uid, version);
  const dataPath = path.join(cacheDir, "data");

  if (!fs.existsSync(dataPath)) {
    return null;
  }

  return fs.readFileSync(dataPath, "utf-8");
};
