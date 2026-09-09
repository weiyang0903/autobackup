import { NextRequest, NextResponse } from "next/server";
import { getSchedules, saveSchedules } from "@/lib/storage";
import {
  syncScheduleTask,
  removeScheduleTask,
  compileScheduleToCrons,
  validateCronExpression,
} from "@/lib/scheduler";
import { resolveAndValidateBackupDir, isValidDatabaseName } from "@/lib/validation";
import { ScheduleItem, ScheduleFrequencyType } from "@/types";

// 获取所有定时调度规则
export async function GET() {
  try {
    const schedules = getSchedules();
    return NextResponse.json({ success: true, schedules });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// 创建新的定时调度规则
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, databases, frequencyType, weekDays, times, backupDir, enabled } = body;

    // 1. 校验规则名
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Schedule name is required" },
        { status: 400 }
      );
    }

    // 2. 校验数据库列表
    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one database" },
        { status: 400 }
      );
    }

    for (const db of databases) {
      if (!isValidDatabaseName(db)) {
        return NextResponse.json(
          { success: false, error: `Invalid database name: ${db}` },
          { status: 400 }
        );
      }
    }

    // 3. 校验频率类型
    const validFreqs: ScheduleFrequencyType[] = ["hourly", "daily", "weekly"];
    const targetFreq: ScheduleFrequencyType = validFreqs.includes(frequencyType)
      ? frequencyType
      : "hourly";

    // 4. 针对 daily 与 weekly 的时间校验
    let targetTimes: string[] = ["00:00"];
    if (targetFreq === "daily" || targetFreq === "weekly") {
      if (!times || !Array.isArray(times) || times.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please provide at least one backup time (HH:mm)" },
          { status: 400 }
        );
      }

      for (const t of times) {
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
          return NextResponse.json(
            { success: false, error: `Invalid time format: ${t}. Expected HH:mm` },
            { status: 400 }
          );
        }
      }
      targetTimes = Array.from(new Set(times));
    }

    // 5. 针对 weekly 的星期校验
    let targetWeekDays: number[] = [0];
    if (targetFreq === "weekly") {
      if (!weekDays || !Array.isArray(weekDays) || weekDays.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please select at least one day of the week for weekly backup" },
          { status: 400 }
        );
      }

      for (const d of weekDays) {
        if (typeof d !== "number" || d < 0 || d > 6) {
          return NextResponse.json(
            { success: false, error: `Invalid day of week: ${d}` },
            { status: 400 }
          );
        }
      }
      targetWeekDays = Array.from(new Set(weekDays)).sort((a, b) => a - b);
    }

    // 6. 服务端编译生成 Cron 表达式列表
    const cronExpressions = compileScheduleToCrons({
      frequencyType: targetFreq,
      weekDays: targetFreq === "weekly" ? targetWeekDays : undefined,
      times: targetFreq !== "hourly" ? targetTimes : undefined,
    });

    for (const expr of cronExpressions) {
      if (!validateCronExpression(expr)) {
        return NextResponse.json(
          { success: false, error: `Compiled cron expression is invalid: ${expr}` },
          { status: 400 }
        );
      }
    }

    // 7. 校验保存路径
    const targetDir =
      backupDir || process.env.DEFAULT_BACKUP_DIR || "./backups";
    const dirValidation = resolveAndValidateBackupDir(targetDir);
    if (!dirValidation.isValid) {
      return NextResponse.json(
        { success: false, error: dirValidation.error },
        { status: 400 }
      );
    }

    const newSchedule: ScheduleItem = {
      id: "sched_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      databases,
      frequencyType: targetFreq,
      weekDays: targetFreq === "weekly" ? targetWeekDays : undefined,
      times: targetFreq !== "hourly" ? targetTimes : undefined,
      cronExpressions,
      cronExpression: cronExpressions[0],
      backupDir: dirValidation.resolvedPath,
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
      lastRun: null,
    };

    const list = getSchedules();
    list.push(newSchedule);
    saveSchedules(list);

    // 同步给运行中的调度器
    syncScheduleTask(newSchedule);

    return NextResponse.json({ success: true, schedule: newSchedule });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// 切换状态或更新调度
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled, name, databases, frequencyType, weekDays, times, backupDir } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Schedule ID is required" },
        { status: 400 }
      );
    }

    const list = getSchedules();
    const targetIndex = list.findIndex((s) => s.id === id);

    if (targetIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Schedule rule not found" },
        { status: 404 }
      );
    }

    const current = list[targetIndex];

    if (name) current.name = name.trim();
    if (Array.isArray(databases) && databases.length > 0) current.databases = databases;

    if (frequencyType) {
      current.frequencyType = frequencyType;
      if (weekDays) current.weekDays = weekDays;
      if (times) current.times = times;

      current.cronExpressions = compileScheduleToCrons({
        frequencyType: current.frequencyType,
        weekDays: current.weekDays,
        times: current.times,
      });
      current.cronExpression = current.cronExpressions[0];
    }

    if (backupDir) {
      const v = resolveAndValidateBackupDir(backupDir);
      if (v.isValid) current.backupDir = v.resolvedPath;
    }

    if (typeof enabled === "boolean") {
      current.enabled = enabled;
    }

    list[targetIndex] = current;
    saveSchedules(list);

    // 重新同步调度任务
    syncScheduleTask(current);

    return NextResponse.json({ success: true, schedule: current });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// 删除调度任务
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Schedule ID is required" },
        { status: 400 }
      );
    }

    const list = getSchedules();
    const filtered = list.filter((s) => s.id !== id);

    if (filtered.length === list.length) {
      return NextResponse.json(
        { success: false, error: "Schedule rule not found" },
        { status: 404 }
      );
    }

    saveSchedules(filtered);
    removeScheduleTask(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
