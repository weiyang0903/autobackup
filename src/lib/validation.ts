import fs from "fs";
import path from "path";

/**
 * 校验数据库名称合法性，防止 SQL/命令注入
 * 允许字母、数字、下划线、短横线、美元符号
 */
export function isValidDatabaseName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  // 仅允许标准数据库标识符
  return /^[a-zA-Z0-9_\-$]+$/.test(name);
}

/**
 * 校验并解析合法的绝对路径或相对于项目根目录的相对路径
 */
export function resolveAndValidateBackupDir(dirPath: string): {
  isValid: boolean;
  resolvedPath: string;
  error?: string;
} {
  if (!dirPath || typeof dirPath !== "string") {
    return {
      isValid: false,
      resolvedPath: "",
      error: "Backup directory path cannot be empty",
    };
  }

  // 统一转为绝对路径
  const resolved = path.isAbsolute(dirPath)
    ? path.resolve(dirPath)
    : path.resolve(process.cwd(), dirPath);

  // 确保目录存在，不存在则递归创建
  try {
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }

    // 校验可写权限
    fs.accessSync(resolved, fs.constants.W_OK);
    return { isValid: true, resolvedPath: resolved };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      resolvedPath: resolved,
      error: `Directory is not accessible or writable: ${message}`,
    };
  }
}
