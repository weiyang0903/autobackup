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

  // 0. 获取当前登录用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  }, []);

  // 1. 获取系统连通性与配置
  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/system/status");
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

  // 3. 获取备份历史
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch backup history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 全局数据初始化与刷新
  const refreshAll = useCallback(() => {
    fetchCurrentUser();
    fetchStatus();
    fetchDatabases();
    fetchHistory();
  }, [fetchCurrentUser, fetchStatus, fetchDatabases, fetchHistory]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
