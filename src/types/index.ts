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
  sourceFolders?: string[]; // 备份的源文件夹列表
  filePath: string; // 主备份文件路径或所在目录绝对路径
  filePaths?: string[]; // 包含所有生成的独立 SQL 文件路径列表
  targetDirectory?: string; // 本次备份文件与复制文件夹所在的完整目录
  fileName: string; // 展示用的相对路径
  fileSize: number; // 字节数 (包含SQL与文件夹总大小)
  durationMs: number; // 执行耗时毫秒
  status: BackupStatus;
  hasFolders?: boolean; // 是否包含复制的文件夹
  errorMessage?: string | null;
}

// 定时任务调度频率类型
export type ScheduleFrequencyType = "hourly" | "daily" | "weekly";

// 定时任务调度配置
export interface ScheduleItem {
  id: string;
  name: string;
  databases: string[];
  sourceFolders?: string[]; // 需要一并备份的源文件夹路径列表
  // 可视化调度配置
  frequencyType: ScheduleFrequencyType;
  weekDays?: number[]; // 0=周日, 1=周一, 2=周二, 3=周三, 4=周四, 5=周五, 6=周六
  times?: string[]; // 格式 ["09:00", "14:30"]
  // 编译出的标准 Cron 表达式数组
  cronExpressions: string[];
  // 兼容老字段
  cronExpression?: string;
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
  sourceFolders?: string[];
  customBackupDir?: string;
}
