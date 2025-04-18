import { encryptWithPublicKey } from "@secret-vault/utils";
import fs from "fs/promises";
import path from "path";

async function main() {
  try {
    // .secretsフォルダがなければ作成
    const secretsDir = path.join(process.cwd(), ".secrets");
    try {
      await fs.access(secretsDir);
    } catch {
      await fs.mkdir(secretsDir, { recursive: true });
    }

    // 公開鍵のパス
    const publicKeyPath = path.join(secretsDir, "public.pem");

    // 公開鍵が存在するか確認
    try {
      await fs.access(publicKeyPath);
    } catch {
      console.error(
        "公開鍵が見つかりません。.secrets/public.pemに配置してください。",
      );
      process.exit(1);
    }

    // 公開鍵を読み込む
    const publicKey = await fs.readFile(publicKeyPath, "utf8");

    // 暗号化する平文
    const plaintext = "これは暗号化される秘密のメッセージです。";

    // 暗号化
    const encrypted = encryptWithPublicKey(plaintext, publicKey);

    console.log("平文:", plaintext);
    console.log("暗号文:", encrypted);

    // 暗号文をファイルに保存
    const encryptedPath = path.join(secretsDir, "encrypted.txt");
    await fs.writeFile(encryptedPath, encrypted);
    console.log(`暗号文を ${encryptedPath} に保存しました。`);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

main();
