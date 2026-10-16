/**
 * Next.js 服务端启动生命周期钩子
 * 在 Node.js 运行时启动时自动注册并初始化定时任务调度器，实现无人值守常驻调度
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("@/lib/scheduler");
    initScheduler();
  }
}
