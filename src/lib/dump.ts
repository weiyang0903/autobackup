import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getDbConfig } from "./db";
import {
  resolveAndValidateBackupDir,
  isValidDatabaseName,
  validateSourceFolder,
} from "./validation";
import { addHistoryItem } from "./storage";
import { BackupHistoryItem, BackupTriggerType } from "@/types";

/**
 * 格式化当前日期为 YYYY-MM-DD (用于日期子文件夹命名)
 */
function getDateFolderString(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 格式化当前时间为 HH_mm_ss (用于时间子文件夹命名)
 */
function getTimeFolderString(now: Date): string {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}_${minutes}_${seconds}`;
}

/**
 * 格式化时间戳为安全的文件名后缀 (YYYY-MM-DD_HHmmss)
 */
function getTimestampString(now: Date): string {
  const dateStr = getDateFolderString(now);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${dateStr}_${hours}${minutes}${seconds}`;
}

/**
 * 安全化调度规则名称（替换文件系统非法字符与空格）
 */
function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\?%*:|"<> ]/g, "_");
}

/**
 * 递归计算目录或文件的总字节数
 */
function getDirectorySizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return stat.size;

  let total = 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const full = path.join(dirPath, file);
    try {
      const s = fs.statSync(full);
      if (s.isDirectory()) {
        total += getDirectorySizeBytes(full);
      } else {
        total += s.size;
      }
    } catch {
      // 忽略单个被锁定文件的统计错误
    }
  }
  return total;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

/**
 * 执行单个或多个数据库导出以及源文件夹递归复制备份
 */
export async function executeBackup(options: {
  databases?: string[];
  sourceFolders?: string[];
  customBackupDir?: string;
  triggerType: BackupTriggerType;
  scheduleName?: string | null;
  scheduleId?: string | null;
  triggeredBy?: string | null;
}): Promise<BackupHistoryItem> {
  const {
    databases = [],
    sourceFolders = [],
    customBackupDir,
    triggerType,
    scheduleName,
    scheduleId,
    triggeredBy = null,
  } = options;
  const startTime = Date.now();
  const nowDate = new Date();

  const hasDatabases = databases && databases.length > 0;
  const hasFolders = sourceFolders && sourceFolders.length > 0;

  // 1. 基础校验：必须至少有数据库或文件夹之一
  if (!hasDatabases && !hasFolders) {
    throw new Error(
      "No database or source folder selected for backup. Please select at least one."
    );
  }

  if (hasDatabases) {
    for (const dbName of databases) {
      if (!isValidDatabaseName(dbName)) {
        throw new Error(`Invalid database name: ${dbName}`);
      }
    }
  }

  // 2. 根目录校验与解析
  const targetRoot =
    customBackupDir || process.env.DEFAULT_BACKUP_DIR || "./backups";
  const rootValidation = resolveAndValidateBackupDir(targetRoot);
  if (!rootValidation.isValid) {
    throw new Error(rootValidation.error || "Invalid backup destination directory");
  }
  const resolvedRootDir = rootValidation.resolvedPath;

  // 3. 校验所有源文件夹
  const validSourceFolders: string[] = [];
  if (hasFolders) {
    for (const folder of sourceFolders) {
      const fv = validateSourceFolder(folder, resolvedRootDir);
      if (!fv.isValid) {
        throw new Error(fv.error || `Invalid source folder: ${folder}`);
      }
      validSourceFolders.push(fv.resolvedPath);
    }
  }

  // 4. 根据触发模式构建多层级子目录
  const dateFolder = getDateFolderString(nowDate);
  let targetSubDir = "";
  let relativeDirPrefix = "";

  if (triggerType === "manual") {
    targetSubDir = path.join(
      resolvedRootDir,
      "Immediate_Manual_Export",
      dateFolder
    );
    relativeDirPrefix = `Immediate_Manual_Export/${dateFolder}`;
  } else {
    const safeName = sanitizeFolderName(scheduleName || "schedule");
    const safeId = sanitizeFolderName(scheduleId || "unknown");
    const scheduleFolder = `${safeName}_${safeId}`;
    const timeFolder = getTimeFolderString(nowDate);

    targetSubDir = path.join(
      resolvedRootDir,
      scheduleFolder,
      dateFolder,
      timeFolder
    );
    relativeDirPrefix = `${scheduleFolder}/${dateFolder}/${timeFolder}`;
  }

  // 自动递归创建多级子文件夹
  if (!fs.existsSync(targetSubDir)) {
    fs.mkdirSync(targetSubDir, { recursive: true });
  }

  // 5. 复制源文件夹
  const copiedFolderNames: string[] = [];
  if (validSourceFolders.length > 0) {
    for (const srcPath of validSourceFolders) {
      const baseName = path.basename(srcPath);
      const destPath = path.join(targetSubDir, baseName);
      try {
        fs.cpSync(srcPath, destPath, { recursive: true, force: true });
        copiedFolderNames.push(baseName);
      } catch (copyErr: unknown) {
        const msg = copyErr instanceof Error ? copyErr.message : String(copyErr);
        throw new Error(`Failed to copy folder '${baseName}': ${msg}`);
      }
    }
  }

  // 6. 如果没有选择数据库，仅备份了文件夹，直接完成
  const timestampStr = getTimestampString(nowDate);
  if (!hasDatabases) {
    const totalSize = getDirectorySizeBytes(targetSubDir);
    const historyItem: BackupHistoryItem = {
      id: generateId(),
      timestamp: nowDate.toISOString(),
      triggerType,
      scheduleName,
      triggeredBy,
      databases: [],
      sourceFolders: validSourceFolders,
      filePath: targetSubDir,
      targetDirectory: targetSubDir,
      fileName: `${relativeDirPrefix}/[${copiedFolderNames.join(", ")}]`,
      fileSize: totalSize,
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      hasFolders: true,
      errorMessage: null,
    };
    addHistoryItem(historyItem);
    return historyItem;
  }

/**
 * 执行单个数据库的独立导出 (mysqldump)
 */
function dumpSingleDatabase(options: {
  dbName: string;
  mysqldumpPath: string;
  dbConfig: ReturnType<typeof getDbConfig>;
  targetSubDir: string;
  timestampStr: string;
}): Promise<string> {
  const { dbName, mysqldumpPath, dbConfig, targetSubDir, timestampStr } = options;
  const rawFileName = `${dbName}_${timestampStr}.sql`;
  const finalFilePath = path.join(targetSubDir, rawFileName);
  const tempFilePath = path.join(
    targetSubDir,
    `${rawFileName}.${Date.now()}_${Math.random().toString(36).substring(2, 6)}.tmp`
  );

  const args: string[] = [
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--user=${dbConfig.user}`,
  ];

  if (dbConfig.password) {
    args.push(`--password=${dbConfig.password}`);
  }

  args.push("--routines", "--triggers", "--single-transaction", dbName);

  return new Promise<string>((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempFilePath, {
      flags: "w",
      encoding: "utf-8",
    });
    let stderrOutput = "";

    const child = spawn(mysqldumpPath, args, {
      windowsHide: true,
      env: process.env,
    });

    child.stdout.pipe(writeStream);

    child.stderr.on("data", (chunk) => {
      stderrOutput += chunk.toString();
    });

    child.on("error", (err) => {
      writeStream.close();
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch {}
      }
      reject(new Error(`Failed to spawn mysqldump for '${dbName}': ${err.message}`));
    });

    child.on("close", (code) => {
      writeStream.close();

      if (code === 0) {
        try {
          fs.renameSync(tempFilePath, finalFilePath);
          resolve(finalFilePath);
        } catch (renameErr) {
          if (fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch {}
          }
          reject(renameErr);
        }
      } else {
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {}
        }
        const errorMsg =
          stderrOutput.trim() ||
          `mysqldump exited with error code ${code} for database '${dbName}'`;
        reject(new Error(errorMsg));
      }
    });
  });
}

  // 7. 循环独立导出各个选中的 MySQL 数据库
  const dbConfig = getDbConfig();
  const mysqldumpPath =
    process.env.MYSQLDUMP_PATH || "C:\\xampp\\mysql\\bin\\mysqldump.exe";

  if (!fs.existsSync(mysqldumpPath)) {
    const errorMsg = `mysqldump executable not found at path: ${mysqldumpPath}`;
    const historyItem: BackupHistoryItem = {
      id: generateId(),
      timestamp: nowDate.toISOString(),
      triggerType,
      scheduleName,
      triggeredBy,
      databases,
      sourceFolders: validSourceFolders,
      filePath: targetSubDir,
      filePaths: [],
      targetDirectory: targetSubDir,
      fileName: `${relativeDirPrefix}/[${databases.join(", ")}]`,
      fileSize: 0,
      durationMs: Date.now() - startTime,
      status: "FAILED",
      hasFolders: validSourceFolders.length > 0,
      errorMessage: errorMsg,
    };
    addHistoryItem(historyItem);
    throw new Error(errorMsg);
  }

  const generatedSqlFilePaths: string[] = [];
  try {
    for (const dbName of databases) {
      const singleFilePath = await dumpSingleDatabase({
        dbName,
        mysqldumpPath,
        dbConfig,
        targetSubDir,
        timestampStr,
      });
      generatedSqlFilePaths.push(singleFilePath);
    }

    const totalSize = getDirectorySizeBytes(targetSubDir);
    const displayFileNames = generatedSqlFilePaths.map((p) => path.basename(p));
    const displayFileName =
      databases.length === 1
        ? `${relativeDirPrefix}/${displayFileNames[0]}`
        : `${relativeDirPrefix}/[${displayFileNames.join(", ")}]`;

    const historyItem: BackupHistoryItem = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      triggerType,
      scheduleName,
      triggeredBy,
      databases,
      sourceFolders: validSourceFolders,
      filePath: generatedSqlFilePaths[0] || targetSubDir,
      filePaths: generatedSqlFilePaths,
      targetDirectory: targetSubDir,
      fileName: displayFileName,
      fileSize: totalSize,
      durationMs: Date.now() - startTime,
      status: "SUCCESS",
      hasFolders: validSourceFolders.length > 0,
      errorMessage: null,
    };

    addHistoryItem(historyItem);
    return historyItem;
  } catch (dumpErr: unknown) {
    const errorMsg =
      dumpErr instanceof Error ? dumpErr.message : String(dumpErr);
    const historyItem: BackupHistoryItem = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      triggerType,
      scheduleName,
      triggeredBy,
      databases,
      sourceFolders: validSourceFolders,
      filePath: generatedSqlFilePaths[0] || targetSubDir,
      filePaths: generatedSqlFilePaths,
      targetDirectory: targetSubDir,
      fileName: `${relativeDirPrefix}/[${databases.join(", ")}]`,
      fileSize: 0,
      durationMs: Date.now() - startTime,
      status: "FAILED",
      hasFolders: validSourceFolders.length > 0,
      errorMessage: errorMsg,
    };
    addHistoryItem(historyItem);
    throw new Error(errorMsg);
  }
}
