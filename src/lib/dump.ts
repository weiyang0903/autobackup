import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { getDbConfig } from "./db";
import { resolveAndValidateBackupDir, isValidDatabaseName } from "./validation";
import { addHistoryItem } from "./storage";
import { BackupHistoryItem, BackupTriggerType } from "@/types";

/**
 * 格式化时间戳为安全的文件名后缀 (YYYY-MM-DD_HHmmss)
 */
function getTimestampString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
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
}): Promise<BackupHistoryItem> {
  const { databases, customBackupDir, triggerType, scheduleName } = options;
  const startTime = Date.now();

  // 1. 基础校验
  if (!databases || databases.length === 0) {
    throw new Error("No database selected for backup");
  }

  for (const dbName of databases) {
    if (!isValidDatabaseName(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }
  }

  // 2. 目录校验与创建
  const targetDir =
    customBackupDir || process.env.DEFAULT_BACKUP_DIR || "./backups";
  const validation = resolveAndValidateBackupDir(targetDir);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid backup directory");
  }
  const resolvedDir = validation.resolvedPath;

  // 3. 构造输出文件名
  const timestampStr = getTimestampString();
  const dbPrefix =
    databases.length === 1 ? databases[0] : `multiple_${databases.length}_dbs`;
  const fileName = `${dbPrefix}_${timestampStr}.sql`;
  const finalFilePath = path.join(resolvedDir, fileName);
  const tempFilePath = path.join(resolvedDir, `${fileName}.${Date.now()}.tmp`);

  // 4. 获取连接与 mysqldump 路径配置
  const dbConfig = getDbConfig();
  const mysqldumpPath =
    process.env.MYSQLDUMP_PATH || "C:\\xampp\\mysql\\bin\\mysqldump.exe";

  if (!fs.existsSync(mysqldumpPath)) {
    const errorMsg = `mysqldump executable not found at path: ${mysqldumpPath}`;
    const historyItem: BackupHistoryItem = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      triggerType,
      scheduleName,
      databases,
      filePath: finalFilePath,
      fileName,
      fileSize: 0,
      durationMs: Date.now() - startTime,
      status: "FAILED",
      errorMessage: errorMsg,
    };
    addHistoryItem(historyItem);
    throw new Error(errorMsg);
  }

  // 5. 组装 mysqldump 参数
  // 参数说明：
  // --host, --port, --user, --password
  // --routines (导出存储过程和函数)
  // --triggers (导出触发器)
  // --single-transaction (在 InnoDB 上保证一致性快照且不锁表)
  // --databases (多库模式)
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

  // 6. 执行子进程并将 stdout 管道写入临时文件
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
        fileName,
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
            fileName,
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
            fileName,
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
          fileName,
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
