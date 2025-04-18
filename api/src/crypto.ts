import crypto from "crypto";

/**
 * RSA公開鍵を使って平文を暗号化する
 * @param plaintext 暗号化する平文
 * @param publicKey PEM形式の公開鍵
 * @returns Base64エンコードされた暗号文
 */
export function encryptWithPublicKey(
  plaintext: string,
  publicKey: string,
): string {
  // 公開鍵を読み込む
  const key = crypto.createPublicKey(publicKey);

  // 暗号化
  const encrypted = crypto.publicEncrypt(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(plaintext, "utf8"),
  );

  // Base64エンコードして返す
  return encrypted.toString("base64");
}

/**
 * RSA秘密鍵を使って暗号文を復号する
 * @param encryptedText Base64エンコードされた暗号文
 * @param privateKey PEM形式の秘密鍵
 * @returns 復号された平文
 */
export function decryptWithPrivateKey(
  encryptedText: string,
  privateKey: string,
): string {
  // 秘密鍵を読み込む
  const key = crypto.createPrivateKey(privateKey);

  // Base64デコード
  const encrypted = Buffer.from(encryptedText, "base64");

  // 復号
  const decrypted = crypto.privateDecrypt(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encrypted,
  );

  // UTF-8でデコードして返す
  return decrypted.toString("utf8");
}

/**
 * RSA鍵ペアを生成する
 * @returns { publicKey: string; privateKey: string } PEM形式の公開鍵と秘密鍵
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

/**
 * 他のユーザーの公開鍵を使ってデータを再暗号化する
 * @param encryptedData 元の暗号化データ（Base64エンコード）
 * @param originalPrivateKey 元のデータを復号するための秘密鍵
 * @param targetPublicKey 再暗号化に使用する公開鍵
 * @returns 再暗号化されたデータ（Base64エンコード）
 */
export function reEncryptForUser(
  encryptedData: string,
  originalPrivateKey: string,
  targetPublicKey: string,
): string {
  // 元のデータを復号
  const decrypted = decryptWithPrivateKey(encryptedData, originalPrivateKey);

  // 新しい公開鍵で再暗号化
  return encryptWithPublicKey(decrypted, targetPublicKey);
}
