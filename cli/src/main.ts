import { generateKeyPair } from "@secret-vault/utils";

const main = async () => {
  console.log("Hello, World!");

  // 鍵ペアを生成する例
  const { publicKey, privateKey } = generateKeyPair();
  console.log("Generated public key:", publicKey);
  console.log("Generated private key:", privateKey);
};

main();
