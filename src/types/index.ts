/**
 * 系统核心数据类型定义
 */

// 数据库信息
export interface DatabaseInfo {
  name: string;
  tableCount?: number;
  sizeBytes?: number;
  isSystem?: boolean;
}

// 备份任务触发方式
export type BackupTriggerType = "manual" | "scheduled";

// 备份状态
export type BackupStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

// 备份历史记录
export interface BackupHistoryItem {
  id: string;
  timestamp: string; // ISO 格式
  triggerType: BackupTriggerType;
  scheduleName?: string | null;
  databases: string[];
  filePath: string;
  fileName: string;
  fileSize: number; // 字节数
  durationMs: number; // 执行耗时毫秒
  status: BackupStatus;
  errorMessage?: string | null;
}

// 定时任务调度配置
export interface ScheduleItem {
  id: string;
  name: string;
  databases: string[];
  cronExpression: string;
  backupDir: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string | null;
  nextRun?: string | null;
}

// 系统全局配置
export interface SystemConfig {
  defaultBackupDir: string;
  compressionEnabled?: boolean;
  keepDays?: number;
}

// MySQL 连通性状态
export interface SystemStatus {
  mysqlConnected: boolean;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  mysqldumpAvailable: boolean;
  mysqldumpPath: string;
  defaultBackupDir: string;
  errorMessage?: string | null;
}

// 手动备份请求载荷
export interface ManualBackupRequest {
  databases: string[];
  customBackupDir?: string;
}
