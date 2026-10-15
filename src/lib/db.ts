import mysql from "mysql2/promise";
import fs from "fs";
import { DatabaseInfo, SystemStatus } from "@/types";

// 系统默认黑名单数据库（不作为业务备份目标，但可按需过滤）
const SYSTEM_DATABASES = new Set([
  "information_schema",
  "performance_schema",
  "mysql",
  "sys",
  "phpmyadmin",
]);

/**
 * 获取当前 MySQL 连接配置
 */
export function getDbConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    connectTimeout: 5000,
  };
}

/**
 * 测试 MySQL 连通性并返回系统整体状态
 */
export async function checkSystemStatus(): Promise<SystemStatus> {
  const config = getDbConfig();
  const mysqldumpPath =
    process.env.MYSQLDUMP_PATH || "C:\\xampp\\mysql\\bin\\mysqldump.exe";
  const defaultBackupDir = process.env.DEFAULT_BACKUP_DIR || "./backups";

  const mysqldumpAvailable = fs.existsSync(
    /* turbopackIgnore: true */ mysqldumpPath
  );

  let mysqlConnected = false;
  let errorMessage: string | null = null;

  try {
    const connection = await mysql.createConnection(config);
    await connection.ping();
    await connection.end();
    mysqlConnected = true;
  } catch (err: unknown) {
    mysqlConnected = false;
    const error = err as { code?: string; message?: string };
    if (error.code === "ECONNREFUSED") {
      errorMessage = `Cannot connect to MySQL at ${config.host}:${config.port}. Please make sure MySQL is started in XAMPP Control Panel.`;
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      errorMessage = `Access denied for user '${config.user}'. Please check your DB_PASSWORD in .env.`;
    } else {
      errorMessage = error.message || "Unknown database connection error.";
    }
  }

  return {
    mysqlConnected,
    dbHost: config.host,
    dbPort: config.port,
    dbUser: config.user,
    mysqldumpAvailable,
    mysqldumpPath,
    defaultBackupDir,
    errorMessage,
  };
}

/**
 * 获取所有可备份的用户数据库列表及元数据
 */
export async function listDatabases(
  includeSystem: boolean = false
): Promise<DatabaseInfo[]> {
  const config = getDbConfig();
  const connection = await mysql.createConnection(config);

  try {
    const [rows] = await connection.query("SHOW DATABASES");
    const dbList: DatabaseInfo[] = [];

    const dbRows = rows as Array<{ Database: string }>;

    for (const row of dbRows) {
      const dbName = row.Database;
      const isSystem = SYSTEM_DATABASES.has(dbName.toLowerCase());

      if (!includeSystem && isSystem) {
        continue;
      }

      // 尝试获取该数据库内表数量和大致大小
      let tableCount = 0;
      let sizeBytes = 0;

      try {
        const [tableStats] = await connection.query(
          `SELECT 
             COUNT(*) as count,
             COALESCE(SUM(data_length + index_length), 0) as size
           FROM information_schema.tables 
           WHERE table_schema = ?`,
          [dbName]
        );
        const stats = (tableStats as Array<{ count: number; size: string | number }>)[0];
        if (stats) {
          tableCount = Number(stats.count) || 0;
          sizeBytes = Number(stats.size) || 0;
        }
      } catch {
        // 如果没有权限读取 information_schema，则保留默认 0
      }

      dbList.push({
        name: dbName,
        tableCount,
        sizeBytes,
        isSystem,
      });
    }

    return dbList;
  } finally {
    await connection.end();
  }
}
