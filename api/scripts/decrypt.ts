import { decryptWithPrivateKey } from "@secret-vault/utils";
import fs from "fs/promises";
import path from "path";

async function main() {
  try {
    // .secretsフォルダのパス
    const secretsDir = path.join(process.cwd(), ".secrets");

    // 秘密鍵のパス
    const privateKeyPath = path.join(secretsDir, "private.pem");

    // 秘密鍵が存在するか確認
    try {
      await fs.access(privateKeyPath);
    } catch {
      console.error(
        "秘密鍵が見つかりません。.secrets/private.pemに配置してください。",
      );
      process.exit(1);
    }

    // 暗号文のパス
    const encryptedPath = path.join(secretsDir, "encrypted.txt");

    // 暗号文が存在するか確認
    try {
      await fs.access(encryptedPath);
    } catch {
      console.error(
        "暗号文が見つかりません。先にencrypt.tsを実行してください。",
      );
      process.exit(1);
    }

    // 秘密鍵を読み込む
    const privateKey = await fs.readFile(privateKeyPath, "utf8");

    // 暗号文を読み込む
    const encrypted = await fs.readFile(encryptedPath, "utf8");

    // 復号
    const decrypted = decryptWithPrivateKey(encrypted, privateKey);

    console.log("暗号文:", encrypted);
    console.log("復号文:", decrypted);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
