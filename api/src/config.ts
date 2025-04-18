import { getProjectRootDir } from "@secret-vault/utils";

// プロジェクトのルートディレクトリ
export const projectRootDir = getProjectRootDir(import.meta.url);
