import { reEncryptForUser } from "../src/crypto.js";
import fs from "fs/promises";
import path from "path";

async function main() {
  try {
    // .secretsフォルダのパス
    const secretsDir = path.join(process.cwd(), ".secrets");

    // 元の秘密鍵のパス
    const originalPrivateKeyPath = path.join(secretsDir, "private.pem");

    // 元の秘密鍵が存在するか確認
    try {
      await fs.access(originalPrivateKeyPath);
    } catch {
      console.error(
        "元の秘密鍵が見つかりません。.secrets/private.pemに配置してください。",
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

    // 他のユーザーの公開鍵のパス
    const targetPublicKeyPath = path.join(secretsDir, "other_public.pem");

    // 他のユーザーの公開鍵が存在するか確認
    try {
      await fs.access(targetPublicKeyPath);
    } catch {
      console.error(
        "他のユーザーの公開鍵が見つかりません。.secrets/other_public.pemに配置してください。",
      );
      console.log("サンプルとして、新しい公開鍵を生成します...");

      // サンプルとして新しい公開鍵を生成
      const { publicKey } = await import("../src/crypto.js").then((m) =>
        m.generateKeyPair(),
      );
      await fs.writeFile(targetPublicKeyPath, publicKey);
      console.log(`サンプルの公開鍵を ${targetPublicKeyPath} に保存しました。`);
    }

    // 元の秘密鍵を読み込む
    const originalPrivateKey = await fs.readFile(
      originalPrivateKeyPath,
      "utf8",
    );

    // 暗号文を読み込む
    const encrypted = await fs.readFile(encryptedPath, "utf8");

    // 他のユーザーの公開鍵を読み込む
    const targetPublicKey = await fs.readFile(targetPublicKeyPath, "utf8");

    // 再暗号化
    const reEncrypted = reEncryptForUser(
      encrypted,
      originalPrivateKey,
      targetPublicKey,
    );

    console.log("元の暗号文:", encrypted);
    console.log("再暗号化されたデータ:", reEncrypted);

    // 再暗号化されたデータをファイルに保存
    const reEncryptedPath = path.join(secretsDir, "re_encrypted.txt");
    await fs.writeFile(reEncryptedPath, reEncrypted);
    console.log(`再暗号化されたデータを ${reEncryptedPath} に保存しました。`);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
