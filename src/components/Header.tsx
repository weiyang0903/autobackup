import React, { useState } from "react";
import {
  Database,
  RefreshCw,
  Server,
  Terminal,
  User,
  Shield,
  KeyRound,
  Users,
  LogOut,
} from "lucide-react";
import { SystemStatus, UserPublicInfo } from "@/types";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { UserManagementModal } from "./UserManagementModal";
import { useRouter } from "next/navigation";

interface HeaderProps {
  status: SystemStatus | null;
  loading: boolean;
  onRefresh: () => void;
  currentUser: UserPublicInfo | null;
}

export function Header({
  status,
  loading,
  onRefresh,
  currentUser,
}: HeaderProps) {
  const router = useRouter();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* MySQL Connection Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
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
                  ? `MySQL (${status.dbHost}:${status.dbPort})`
                  : "MySQL Offline"}
              </span>
            </div>

            {/* mysqldump tool Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 shadow-sm transition-all disabled:opacity-50"
              title="Refresh system status and databases"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* User Info & Actions */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-800">
                    {currentUser.username}
                  </span>
                  {currentUser.role === "admin" ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] rounded font-semibold border border-purple-200">
                      <Shield className="w-2.5 h-2.5 text-purple-600" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 bg-slate-200/70 text-slate-600 text-[10px] rounded font-medium">
                      Operator
                    </span>
                  )}
                </div>

                {/* Admin Only: User Management Button */}
                {currentUser.role === "admin" && (
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-semibold transition-colors"
                    title="User & Access Management"
                  >
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span className="hidden lg:inline">Users</span>
                  </button>
                )}

                {/* Change Password Button */}
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg transition-colors"
                  title="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {currentUser?.role === "admin" && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUserId={currentUser.id}
        />
      )}
    </>
  );
}

