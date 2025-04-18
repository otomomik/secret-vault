import path from "path";
import { fileURLToPath } from "url";

// プロジェクトのルートディレクトリ
export const projectRootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
