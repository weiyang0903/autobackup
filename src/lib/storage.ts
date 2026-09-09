import fs from "fs";
import path from "path";
import { BackupHistoryItem, ScheduleItem, SystemConfig } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const SCHEDULES_FILE = path.join(DATA_DIR, "schedules.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

/**
 * 确保数据目录及默认文件存在
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 安全原子写入 JSON 文件（先写临时文件再重命名，防止意外中断导致文件损坏）
 */
function atomicWriteJson<T>(filePath: string, data: T): void {
  ensureDataDir();
  const tempPath = `${filePath}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // 忽略清理临时文件时的异常
      }
    }
    throw err;
  }
}

/**
 * 安全读取 JSON 文件
 */
function safeReadJson<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    // 若实际文件不存在，尝试从 .example 读取或返回默认值
    const exampleFile = `${filePath}.example`;
    if (fs.existsSync(exampleFile)) {
      try {
        const content = fs.readFileSync(exampleFile, "utf-8");
        const parsed = JSON.parse(content);
        atomicWriteJson(filePath, parsed);
        return parsed;
      } catch {
        return defaultValue;
      }
    }
    atomicWriteJson(filePath, defaultValue);
    return defaultValue;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Failed to read JSON from ${filePath}:`, err);
    return defaultValue;
  }
}

// ========================
// 配置读取与更新
// ========================

export function getSystemConfig(): SystemConfig {
  return safeReadJson<SystemConfig>(CONFIG_FILE, {
    defaultBackupDir: process.env.DEFAULT_BACKUP_DIR || "./backups",
    compressionEnabled: false,
    keepDays: 30,
  });
}

export function saveSystemConfig(config: SystemConfig): void {
  atomicWriteJson(CONFIG_FILE, config);
}

// ========================
// 定时任务读写
// ========================

export function getSchedules(): ScheduleItem[] {
  return safeReadJson<ScheduleItem[]>(SCHEDULES_FILE, []);
}

export function saveSchedules(schedules: ScheduleItem[]): void {
  atomicWriteJson(SCHEDULES_FILE, schedules);
}

// ========================
// 历史记录读写
// ========================

export function getHistory(): BackupHistoryItem[] {
  return safeReadJson<BackupHistoryItem[]>(HISTORY_FILE, []);
}

export function addHistoryItem(item: BackupHistoryItem): void {
  const list = getHistory();
  // 最新的记录放在最前
  list.unshift(item);
  atomicWriteJson(HISTORY_FILE, list);
}

export function deleteHistoryItem(id: string): BackupHistoryItem | null {
  const list = getHistory();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;
  const [removed] = list.splice(index, 1);
  atomicWriteJson(HISTORY_FILE, list);
  return removed;
}
