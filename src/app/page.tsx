"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { StatusAlert } from "@/components/StatusAlert";
import { DatabaseSelector } from "@/components/DatabaseSelector";
import { ManualBackupCard } from "@/components/ManualBackupCard";
import { ScheduleManager } from "@/components/ScheduleManager";
import { BackupHistoryTable } from "@/components/BackupHistoryTable";
import { DatabaseInfo, SystemStatus, BackupHistoryItem, UserPublicInfo } from "@/types";

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [currentUser, setCurrentUser] = useState<UserPublicInfo | null>(null);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  // 0. 获取当前登录用户信息
  const fetchCurrentUser = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401 || !res.ok) {
        window.location.href = "/login";
        return false;
      }
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        return true;
      } else {
        window.location.href = "/login";
        return false;
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      window.location.href = "/login";
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // 1. 获取系统连通性与配置
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/system/status");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch system status:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // 2. 获取 MySQL 数据库列表
  const fetchDatabases = useCallback(async () => {
    setLoadingDatabases(true);
    try {
      const res = await fetch("/api/databases");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDatabases(data.databases);
      } else {
        setDatabases([]);
      }
    } catch (err) {
      console.error("Failed to fetch databases:", err);
      setDatabases([]);
    } finally {
      setLoadingDatabases(false);
    }
  }, []);

  // 3. 获取备份历史 (支持 silent 静默更新，不触发表格全屏 Loading 闪烁)
  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoadingHistory(true);
    try {
      const res = await fetch("/api/history");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch backup history:", err);
    } finally {
      if (!silent) setLoadingHistory(false);
    }
  }, []);

  // 调度组件静默刷新标记
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  // 全局数据初始化与手动刷新
  const refreshAll = useCallback(async () => {
    const isAuthed = await fetchCurrentUser();
    if (!isAuthed) return;
    fetchStatus();
    fetchDatabases();
    fetchHistory();
    setScheduleRefreshKey((prev) => prev + 1);
  }, [fetchCurrentUser, fetchStatus, fetchDatabases, fetchHistory]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 4. 定时静默拉取 (每 5 秒自动同步最新自动备份历史与调度执行状态，无需手动刷新页面)
  useEffect(() => {
    const timer = setInterval(() => {
      // 若当前页面处于后台非激活状态，跳过以节省系统资源
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      fetchHistory(true);
      setScheduleRefreshKey((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(timer);
  }, [fetchHistory]);

  // 5. 监听浏览器标签页激活事件 (切回页面时立即核对一次最新数据)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCurrentUser().then((authed) => {
          if (authed) {
            fetchHistory(true);
            setScheduleRefreshKey((prev) => prev + 1);
          }
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCurrentUser, fetchHistory]);

  if (authChecking && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const availableDbNames = databases.map((d) => d.name);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16">
      {/* Top Bar */}
      <Header
        status={status}
        loading={loadingStatus || loadingDatabases || loadingHistory}
        onRefresh={refreshAll}
        currentUser={currentUser}
      />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 flex-1">
        {/* Connection or Path Error Warning */}
        {status && !status.mysqlConnected && (
          <StatusAlert
            type="error"
            title="MySQL Connection Error"
            message={
              status.errorMessage ||
              "Could not connect to MySQL server. Please verify that XAMPP MySQL service is running and .env credentials are correct."
            }
          />
        )}

        {status && status.mysqlConnected && !status.mysqldumpAvailable && (
          <StatusAlert
            type="warning"
            title="mysqldump Tool Missing"
            message={`The mysqldump executable was not found at '${status.mysqldumpPath}'. Please verify your XAMPP installation path in .env.`}
          />
        )}

        {/* Section 1: Database Selection & Immediate Export */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DatabaseSelector
              databases={databases}
              selected={selectedDatabases}
              onChange={setSelectedDatabases}
              loading={loadingDatabases}
            />
          </div>

          <div className="lg:col-span-1">
            <ManualBackupCard
              selectedDatabases={selectedDatabases}
              defaultBackupDir={status?.defaultBackupDir || "./backups"}
              onBackupSuccess={() => {
                fetchHistory();
              }}
            />
          </div>
        </div>

        {/* Section 2: Automated Schedule (Cron) Management */}
        <div>
          <ScheduleManager
            availableDatabases={availableDbNames}
            defaultBackupDir={status?.defaultBackupDir || "./backups"}
            refreshTrigger={scheduleRefreshKey}
          />
        </div>

        {/* Section 3: Backup History & Download Files */}
        <div>
          <BackupHistoryTable
            history={history}
            loading={loadingHistory}
            onRefresh={fetchHistory}
            currentUserRole={currentUser?.role}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>XAMPP MySQL AutoBackup Manager • Node.js & React Full-stack Platform</p>
      </footer>
    </div>
  );
}
