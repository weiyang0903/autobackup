import cron, { ScheduledTask } from "node-cron";
import { getSchedules, saveSchedules } from "./storage";
import { executeBackup } from "./dump";
import { ScheduleItem, ScheduleFrequencyType } from "@/types";

// 全局内存任务映射 (支持单个 Schedule 关联多个活动的 ScheduledTask)
const activeTasks = new Map<string, ScheduledTask[]>();

/**
 * 校验 Cron 表达式合法性
 */
export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * 将可视化频率配置编译为标准的 Cron 表达式数组
 */
export function compileScheduleToCrons(config: {
  frequencyType: ScheduleFrequencyType;
  weekDays?: number[];
  times?: string[];
}): string[] {
  const { frequencyType, weekDays, times } = config;

  if (frequencyType === "hourly") {
    // 每小时整点 (:00)
    return ["0 * * * *"];
  }

  // 整理有效时间列表 (默认 "00:00")
  const validTimes =
    times && times.length > 0 ? Array.from(new Set(times)) : ["00:00"];

  const results: string[] = [];

  for (const timeStr of validTimes) {
    // 匹配 HH:mm 格式
    const match = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) continue;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

    if (frequencyType === "daily") {
      // 每天具体时间：minute hour * * *
      results.push(`${minute} ${hour} * * *`);
    } else if (frequencyType === "weekly") {
      // 每周特定天与具体时间：minute hour * * day_list
      const days =
        weekDays && weekDays.length > 0
          ? Array.from(new Set(weekDays)).sort((a, b) => a - b).join(",")
          : "0"; // 默认周日
      results.push(`${minute} ${hour} * * ${days}`);
    }
  }

  return results.length > 0 ? results : ["0 0 * * *"];
}

/**
 * 为单个规则注册定时任务（支持多条 Cron）
 */
function registerCronTask(schedule: ScheduleItem): void {
  // 若已存在则先停止全部关联的任务
  if (activeTasks.has(schedule.id)) {
    const existingList = activeTasks.get(schedule.id) || [];
    existingList.forEach((t) => t.stop());
    activeTasks.delete(schedule.id);
  }

  if (!schedule.enabled) {
    return;
  }

  // 获取该调度名下的全部 Cron 表达式
  const expressions =
    schedule.cronExpressions && schedule.cronExpressions.length > 0
      ? schedule.cronExpressions
      : schedule.cronExpression
      ? [schedule.cronExpression]
      : [];

  if (expressions.length === 0) {
    console.error(
      `No cron expressions found for schedule '${schedule.name}'`
    );
    return;
  }

  const registeredList: ScheduledTask[] = [];

  for (const expr of expressions) {
    if (!validateCronExpression(expr)) {
      console.error(
        `Invalid cron expression for schedule '${schedule.name}': ${expr}`
      );
      continue;
    }

    try {
      const task = cron.schedule(
        expr,
        async () => {
          console.log(
            `[Scheduler] Running scheduled backup for '${schedule.name}' (cron: ${expr})...`
          );
          try {
            await executeBackup({
              databases: schedule.databases,
              customBackupDir: schedule.backupDir,
              triggerType: "scheduled",
              scheduleName: schedule.name,
              scheduleId: schedule.id,
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

      registeredList.push(task);
    } catch (err) {
      console.error(
        `Failed to schedule cron '${expr}' for '${schedule.name}':`,
        err
      );
    }
  }

  if (registeredList.length > 0) {
    activeTasks.set(schedule.id, registeredList);
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
    `[Scheduler] Loaded ${activeTasks.size} active automated schedule rules.`
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
    const list = activeTasks.get(id) || [];
    list.forEach((t) => t.stop());
    activeTasks.delete(id);
  }
}
