import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Key,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Power,
  RefreshCw,
} from "lucide-react";
import { UserPublicInfo, UserRole } from "@/types";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export function UserManagementModal({
  isOpen,
  onClose,
  currentUserId,
}: UserManagementModalProps) {
  const [users, setUsers] = useState<UserPublicInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 创建新用户表单状态
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("operator");
  const [actionLoading, setActionLoading] = useState(false);

  // 重置密码状态
  const [resetTargetUser, setResetTargetUser] = useState<UserPublicInfo | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Network error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setIsAdding(false);
      setResetTargetUser(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 创建新用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUsername.trim() || !newPassword) {
      setError("Please fill in username and password");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`User "${newUsername}" created successfully`);
        setNewUsername("");
        setNewPassword("");
        setNewRole("operator");
        setIsAdding(false);
        fetchUsers();
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 切换启用/禁用
  const handleToggleActive = async (user: UserPublicInfo) => {
    if (user.username === "admin") return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          active: !user.active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        setError(data.error || "Failed to update user status");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    }
  };

  // 管理员强制重置他人密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordInput) return;
    setError(null);
    setSuccess(null);

    if (resetPasswordInput.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetTargetUser.id,
          newPassword: resetPasswordInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Password for "${resetTargetUser.username}" reset successfully`);
        setResetTargetUser(null);
        setResetPasswordInput("");
        fetchUsers();
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (user: UserPublicInfo) => {
    if (user.username === "admin" || user.id === currentUserId) return;
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess(`User "${user.username}" deleted successfully`);
        fetchUsers();
      } else {
        setError(data.error || "Failed to delete user");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Error: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                User & Access Management
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded font-semibold border border-purple-200">
                  Admin Only
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage accounts, assign roles, reset credentials, and audit access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              System Accounts ({users.length})
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAdding ? "Cancel" : "Add User"}</span>
            </button>
          </div>

          {/* Add User Panel */}
          {isAdding && (
            <form
              onSubmit={handleCreateUser}
              className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-100"
            >
              <div className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                <span>Create New Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. operator_jack"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="operator">Operator (Standard)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {actionLoading ? "Saving..." : "Save Account"}
                </button>
              </div>
            </form>
          )}

          {/* Reset Password Mini-Form */}
          {resetTargetUser && (
            <form
              onSubmit={handleResetPassword}
              className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Reset Password for &quot;{resetTargetUser.username}&quot;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="text-amber-700 hover:text-amber-900 text-xs"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Enter new password for this user"
                  className="flex-1 px-3 py-1.5 text-xs border border-amber-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {actionLoading ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading users...</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3.5">User</th>
                    <th className="py-2.5 px-3.5">Role</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Last Login</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => {
                    const isRootAdmin = u.username === "admin";
                    const isSelf = u.id === currentUserId;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{u.username}</span>
                            {isSelf && (
                              <span className="px-1 py-0.2 bg-blue-100 text-blue-700 text-[9px] rounded font-medium">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3.5">
                          {u.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium border border-purple-200 text-[10px]">
                              <Shield className="w-3 h-3 text-purple-600" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-medium text-[10px]">
                              Operator
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3.5">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium text-[10px]">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium text-[10px]">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleString()
                            : "Never"}
                        </td>

                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* 重置密码 */}
                            <button
                              type="button"
                              onClick={() => {
                                setResetTargetUser(u);
                                setResetPasswordInput("");
                              }}
                              className="p-1 hover:bg-amber-100 text-slate-400 hover:text-amber-700 rounded transition-colors"
                              title={`Reset password for ${u.username}`}
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* 启用/禁用 (内置 root admin 禁用此操作) */}
                            {!isRootAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(u)}
                                className={`p-1 rounded transition-colors ${
                                  u.active
                                    ? "hover:bg-amber-100 text-slate-400 hover:text-amber-600"
                                    : "hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"
                                }`}
                                title={u.active ? "Disable account" : "Enable account"}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 删除用户 (不能删自己和 root admin) */}
                            {!isRootAdmin && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title={`Delete user ${u.username}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
