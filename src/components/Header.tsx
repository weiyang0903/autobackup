import React from "react";
import { Database, RefreshCw, Server, Terminal } from "lucide-react";
import { SystemStatus } from "@/types";

interface HeaderProps {
  status: SystemStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Header({ status, loading, onRefresh }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              XAMPP MySQL AutoBackup
              <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Automated database exporter & schedule manager
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* MySQL Connection Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              status?.mysqlConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status?.mysqlConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <Server className="w-3.5 h-3.5" />
            <span>
              {status?.mysqlConnected
                ? `MySQL Connected (${status.dbHost}:${status.dbPort})`
                : "MySQL Offline"}
            </span>
          </div>

          {/* mysqldump tool Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              status?.mysqldumpAvailable
                ? "bg-slate-50 border-slate-200 text-slate-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>
              {status?.mysqldumpAvailable
                ? "mysqldump Ready"
                : "mysqldump Not Found"}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-sm transition-all disabled:opacity-50"
            title="Refresh system status and databases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
