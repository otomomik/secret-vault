import { decryptWithPrivateKey, generateKeyPair } from "@secret-vault/utils";
import fs from "fs/promises";
import path from "path";

async function main() {
  try {
    // .secretsフォルダのパス
    const secretsDir = path.join(process.cwd(), ".secrets");

    // 他のユーザーの秘密鍵のパス
    const otherPrivateKeyPath = path.join(secretsDir, "other_private.pem");

    // 他のユーザーの秘密鍵が存在するか確認
    try {
      await fs.access(otherPrivateKeyPath);
    } catch {
      console.error(
        "他のユーザーの秘密鍵が見つかりません。.secrets/other_private.pemに配置してください。",
      );
      console.log("サンプルとして、新しい鍵ペアを生成します...");

      // サンプルとして新しい鍵ペアを生成
      const { privateKey, publicKey } = generateKeyPair();
      await fs.writeFile(otherPrivateKeyPath, privateKey);
      await fs.writeFile(path.join(secretsDir, "other_public.pem"), publicKey);
      console.log(`サンプルの秘密鍵を ${otherPrivateKeyPath} に保存しました。`);
      console.log(
        `サンプルの公開鍵を ${path.join(secretsDir, "other_public.pem")} に保存しました。`,
      );
    }

    // 再暗号化されたデータのパス
    const reEncryptedPath = path.join(secretsDir, "re_encrypted.txt");

    // 再暗号化されたデータが存在するか確認
    try {
      await fs.access(reEncryptedPath);
    } catch {
      console.error(
        "再暗号化されたデータが見つかりません。先にre-encrypt.tsを実行してください。",
      );
      process.exit(1);
    }

    // 他のユーザーの秘密鍵を読み込む
    const otherPrivateKey = await fs.readFile(otherPrivateKeyPath, "utf8");

    // 再暗号化されたデータを読み込む
    const reEncrypted = await fs.readFile(reEncryptedPath, "utf8");

    // 復号
    const decrypted = decryptWithPrivateKey(reEncrypted, otherPrivateKey);

    console.log("再暗号化されたデータ:", reEncrypted);
    console.log("復号文:", decrypted);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
