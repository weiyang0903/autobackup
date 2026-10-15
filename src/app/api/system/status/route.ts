import { NextRequest, NextResponse } from "next/server";
import { checkSystemStatus } from "@/lib/db";
import { initScheduler } from "@/lib/scheduler";
import { verifyAuthenticatedUser } from "@/lib/auth";

// 保证调度器在首个请求时启动初始化
let isSchedulerInitialized = false;

export async function GET(req: NextRequest) {
  const auth = verifyAuthenticatedUser(req);
  if (!auth.authenticated) return auth.response!;

  try {
    if (!isSchedulerInitialized) {
      initScheduler();
      isSchedulerInitialized = true;
    }

    const status = await checkSystemStatus();
    return NextResponse.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        mysqlConnected: false,
        mysqldumpAvailable: false,
        errorMessage: message,
      },
      { status: 500 }
    );
  }
}
