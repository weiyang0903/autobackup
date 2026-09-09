import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getDbConfig } from "./db";
import { resolveAndValidateBackupDir, isValidDatabaseName } from "./validation";
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
 * 生成唯一 ID
 */
function generateId(): string {
  return "b_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}

/**
 * 执行单个或多个数据库导出
 */
export async function executeBackup(options: {
  databases: string[];
  customBackupDir?: string;
  triggerType: BackupTriggerType;
  scheduleName?: string | null;
  scheduleId?: string | null;
}): Promise<BackupHistoryItem> {
  const { databases, customBackupDir, triggerType, scheduleName, scheduleId } =
    options;
  const startTime = Date.now();
  const nowDate = new Date();

  // 1. 基础校验
  if (!databases || databases.length === 0) {
    throw new Error("No database selected for backup");
  }

  for (const dbName of databases) {
    if (!isValidDatabaseName(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }
  }

  // 2. 根目录校验与解析
  const targetRoot =
    customBackupDir || process.env.DEFAULT_BACKUP_DIR || "./backups";
  const validation = resolveAndValidateBackupDir(targetRoot);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid backup directory");
  }
  const resolvedRootDir = validation.resolvedPath;

  // 3. 根据触发模式构建多层级子目录
  const dateFolder = getDateFolderString(nowDate);
  let targetSubDir = "";
  let relativeDirPrefix = "";

  if (triggerType === "manual") {
    // 模式一：手动即时导出 -> Immediate_Manual_Export / YYYY-MM-DD
    targetSubDir = path.join(
      resolvedRootDir,
      "Immediate_Manual_Export",
      dateFolder
    );
    relativeDirPrefix = `Immediate_Manual_Export/${dateFolder}`;
  } else {
    // 模式二：定时自动调度 -> scheduleName_id / YYYY-MM-DD / HH_mm_ss
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

  // 4. 构造输出文件名与路径
  const timestampStr = getTimestampString(nowDate);
  const dbPrefix =
    databases.length === 1 ? databases[0] : `multiple_${databases.length}_dbs`;
  const rawFileName = `${dbPrefix}_${timestampStr}.sql`;
  const displayFileName = `${relativeDirPrefix}/${rawFileName}`;
  const finalFilePath = path.join(targetSubDir, rawFileName);
  const tempFilePath = path.join(
    targetSubDir,
    `${rawFileName}.${Date.now()}.tmp`
  );

  // 5. 获取连接与 mysqldump 路径配置
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
      databases,
      filePath: finalFilePath,
      fileName: displayFileName,
      fileSize: 0,
      durationMs: Date.now() - startTime,
      status: "FAILED",
      errorMessage: errorMsg,
    };
    addHistoryItem(historyItem);
    throw new Error(errorMsg);
  }

  // 6. 组装 mysqldump 参数
  const args: string[] = [
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--user=${dbConfig.user}`,
  ];

  if (dbConfig.password) {
    args.push(`--password=${dbConfig.password}`);
  }

  args.push("--routines", "--triggers", "--single-transaction");

  if (databases.length === 1) {
    args.push(databases[0]);
  } else {
    args.push("--databases", ...databases);
  }

  // 7. 执行子进程并将 stdout 管道写入临时文件
  return new Promise<BackupHistoryItem>((resolve, reject) => {
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

      const historyItem: BackupHistoryItem = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        triggerType,
        scheduleName,
        databases,
        filePath: finalFilePath,
        fileName: displayFileName,
        fileSize: 0,
        durationMs: Date.now() - startTime,
        status: "FAILED",
        errorMessage: err.message || "Failed to spawn mysqldump process",
      };
      addHistoryItem(historyItem);
      reject(err);
    });

    child.on("close", (code) => {
      writeStream.close();

      // mysqldump 退出码 0 表示完全成功
      if (code === 0) {
        try {
          fs.renameSync(tempFilePath, finalFilePath);
          const stats = fs.statSync(finalFilePath);

          const historyItem: BackupHistoryItem = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            triggerType,
            scheduleName,
            databases,
            filePath: finalFilePath,
            fileName: displayFileName,
            fileSize: stats.size,
            durationMs: Date.now() - startTime,
            status: "SUCCESS",
            errorMessage: null,
          };

          addHistoryItem(historyItem);
          resolve(historyItem);
        } catch (renameErr: unknown) {
          if (fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch {}
          }
          const message =
            renameErr instanceof Error ? renameErr.message : String(renameErr);
          const historyItem: BackupHistoryItem = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            triggerType,
            scheduleName,
            databases,
            filePath: finalFilePath,
            fileName: displayFileName,
            fileSize: 0,
            durationMs: Date.now() - startTime,
            status: "FAILED",
            errorMessage: `Failed to finalize file: ${message}`,
          };
          addHistoryItem(historyItem);
          reject(new Error(message));
        }
      } else {
        // 失败处理与清理
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {}
        }

        const errorMsg =
          stderrOutput.trim() || `mysqldump exited with error code ${code}`;
        const historyItem: BackupHistoryItem = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          triggerType,
          scheduleName,
          databases,
          filePath: finalFilePath,
          fileName: displayFileName,
          fileSize: 0,
          durationMs: Date.now() - startTime,
          status: "FAILED",
          errorMessage: errorMsg,
        };
        addHistoryItem(historyItem);
        reject(new Error(errorMsg));
      }
    });
  });
}
