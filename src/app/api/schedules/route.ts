import { NextRequest, NextResponse } from "next/server";
import { getSchedules, saveSchedules } from "@/lib/storage";
import {
  syncScheduleTask,
  removeScheduleTask,
  validateCronExpression,
} from "@/lib/scheduler";
import { resolveAndValidateBackupDir, isValidDatabaseName } from "@/lib/validation";
import { ScheduleItem } from "@/types";

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
    const { name, databases, cronExpression, backupDir, enabled } = body;

    // 校验规则名
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Schedule name is required" },
        { status: 400 }
      );
    }

    // 校验数据库列表
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

    // 校验 Cron 表达式
    if (!cronExpression || !validateCronExpression(cronExpression)) {
      return NextResponse.json(
        { success: false, error: "Invalid cron expression" },
        { status: 400 }
      );
    }

    // 校验保存路径
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
      cronExpression,
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
    const { id, enabled, name, databases, cronExpression, backupDir } = body;

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
    if (cronExpression && validateCronExpression(cronExpression)) {
      current.cronExpression = cronExpression;
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
