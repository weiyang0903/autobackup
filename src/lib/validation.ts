import fs from "fs";
import path from "path";

/**
 * 校验数据库名称合法性，防止 SQL/命令注入
 * 允许字母、数字、下划线、短横线、美元符号
 */
export function isValidDatabaseName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
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

/**
 * 校验源备份文件夹路径的合法性
 * 必须存在、必须是目录、必须有读取权限，且不能是备份目标目录本身或其父目录（防自包含死循环）
 */
export function validateSourceFolder(
  folderPath: string,
  backupRootDir: string
): {
  isValid: boolean;
  resolvedPath: string;
  error?: string;
} {
  if (!folderPath || typeof folderPath !== "string" || folderPath.trim() === "") {
    return { isValid: false, resolvedPath: "", error: "Folder path cannot be empty" };
  }

  const resolvedSource = path.isAbsolute(folderPath.trim())
    ? path.resolve(folderPath.trim())
    : path.resolve(process.cwd(), folderPath.trim());

  const resolvedBackupRoot = path.isAbsolute(backupRootDir)
    ? path.resolve(backupRootDir)
    : path.resolve(process.cwd(), backupRootDir);

  try {
    if (!fs.existsSync(resolvedSource)) {
      return {
        isValid: false,
        resolvedPath: resolvedSource,
        error: `Source folder does not exist: ${resolvedSource}`,
      };
    }

    const stat = fs.statSync(resolvedSource);
    if (!stat.isDirectory()) {
      return {
        isValid: false,
        resolvedPath: resolvedSource,
        error: `Source path is a file, not a directory: ${resolvedSource}`,
      };
    }

    // 校验读取权限
    fs.accessSync(resolvedSource, fs.constants.R_OK);

    // 防死循环嵌套：源目录不能是备份目标根目录自身或包含备份根目录
    const relativeToBackup = path.relative(resolvedSource, resolvedBackupRoot);
    if (relativeToBackup === "" || (!relativeToBackup.startsWith("..") && !path.isAbsolute(relativeToBackup))) {
      return {
        isValid: false,
        resolvedPath: resolvedSource,
        error: `Cannot backup the backup destination directory itself (recursion detected): ${resolvedSource}`,
      };
    }

    return { isValid: true, resolvedPath: resolvedSource };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      resolvedPath: resolvedSource,
      error: `Cannot access source folder: ${message}`,
    };
  }
}
