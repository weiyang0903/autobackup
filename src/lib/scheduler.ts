import cron, { ScheduledTask } from "node-cron";
import { getSchedules, saveSchedules } from "./storage";
import { executeBackup } from "./dump";
import { ScheduleItem } from "@/types";

// 全局内存任务映射
const activeTasks = new Map<string, ScheduledTask>();

/**
 * 校验 Cron 表达式合法性
 */
export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * 为单个规则注册定时任务
 */
function registerCronTask(schedule: ScheduleItem): void {
  // 若已存在则先停止
  if (activeTasks.has(schedule.id)) {
    const existing = activeTasks.get(schedule.id);
    existing?.stop();
    activeTasks.delete(schedule.id);
  }

  if (!schedule.enabled) {
    return;
  }

  if (!validateCronExpression(schedule.cronExpression)) {
    console.error(
      `Invalid cron expression for schedule '${schedule.name}': ${schedule.cronExpression}`
    );
    return;
  }

  try {
    const task = cron.schedule(
      schedule.cronExpression,
      async () => {
        console.log(
          `[Scheduler] Running scheduled backup for '${schedule.name}'...`
        );
        try {
          await executeBackup({
            databases: schedule.databases,
            customBackupDir: schedule.backupDir,
            triggerType: "scheduled",
            scheduleName: schedule.name,
          });

          // 更新上次执行时间
          const schedules = getSchedules();
          const target = schedules.find((s) => s.id === schedule.id);
          if (target) {
            target.lastRun = new Date().toISOString();
            saveSchedules(schedules);
          }
        } catch (err) {
          console.error(
            `[Scheduler] Backup failed for '${schedule.name}':`,
            err
          );
        }
      },
      {
        scheduled: true,
      }
    );

    activeTasks.set(schedule.id, task);
  } catch (err) {
    console.error(
      `Failed to schedule cron task for '${schedule.name}':`,
      err
    );
  }
}

/**
 * 初始化并加载全部启用的定时任务
 */
export function initScheduler(): void {
  console.log("[Scheduler] Initializing automated backup scheduler...");
  const schedules = getSchedules();
  for (const item of schedules) {
    if (item.enabled) {
      registerCronTask(item);
    }
  }
  console.log(
    `[Scheduler] Loaded ${activeTasks.size} active automated schedules.`
  );
}

/**
 * 刷新某个调度任务（新增、编辑或状态切换后调用）
 */
export function syncScheduleTask(schedule: ScheduleItem): void {
  registerCronTask(schedule);
}

/**
 * 移除某个调度任务
 */
export function removeScheduleTask(id: string): void {
  if (activeTasks.has(id)) {
    const task = activeTasks.get(id);
    task?.stop();
    activeTasks.delete(id);
  }
}
