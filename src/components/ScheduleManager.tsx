import React, { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Power, AlertCircle, Calendar } from "lucide-react";
import { ScheduleItem } from "@/types";

interface ScheduleManagerProps {
  availableDatabases: string[];
  defaultBackupDir: string;
}

// 预设常用周期
const PRESET_CRONS = [
  { label: "Every Hour", cron: "0 * * * *", desc: "At minute 0 of every hour" },
  { label: "Every 6 Hours", cron: "0 */6 * * *", desc: "Every 6 hours" },
  { label: "Daily at Midnight (00:00)", cron: "0 0 * * *", desc: "Every day at 00:00" },
  { label: "Daily at 03:00 AM", cron: "0 3 * * *", desc: "Every night at 03:00 AM" },
  { label: "Weekly (Every Sunday 02:00 AM)", cron: "0 2 * * 0", desc: "Once a week on Sunday" },
];

export function ScheduleManager({
  availableDatabases,
  defaultBackupDir,
}: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 表单状态
  const [name, setName] = useState("");
  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [backupDir, setBackupDir] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 加载调度列表
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // 提交新建调度
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Please enter a name for this schedule");
      return;
    }

    if (selectedDbs.length === 0) {
      setFormError("Please select at least one database to back up");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          databases: selectedDbs,
          cronExpression: cronExpression.trim(),
          backupDir: backupDir.trim() || defaultBackupDir,
          enabled: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreating(false);
        setName("");
        setSelectedDbs([]);
        setCronExpression("0 0 * * *");
        setBackupDir("");
        fetchSchedules();
      } else {
        setFormError(data.error || "Failed to create schedule");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(`Server error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 切换启用/禁用状态
  const handleToggleEnable = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          enabled: !currentEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSchedules();
      }
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
    }
  };

  // 删除调度
  const handleDelete = async (id: string, scheduleName: string) => {
    if (!window.confirm(`Are you sure you want to delete the schedule '${scheduleName}'?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchSchedules();
      }
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Automated Schedules (Cron)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure periodic background tasks to export MySQL databases automatically
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Schedule</span>
          </button>
        )}
      </div>

      {/* Create Schedule Modal / Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateSchedule}
          className="mb-5 p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <h3 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Add New Backup Schedule
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-medium"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Schedule Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Schedule Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Daily Midnight Backup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Databases Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Databases to Include *
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white border border-slate-200 rounded-lg">
              {availableDatabases.map((db) => {
                const isChecked = selectedDbs.includes(db);
                return (
                  <button
                    type="button"
                    key={db}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedDbs(selectedDbs.filter((d) => d !== db));
                      } else {
                        setSelectedDbs([...selectedDbs, db]);
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      isChecked
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {db}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency & Cron Expression */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quick Frequency Preset
              </label>
              <select
                onChange={(e) => setCronExpression(e.target.value)}
                value={cronExpression}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {PRESET_CRONS.map((p) => (
                  <option key={p.cron} value={p.cron}>
                    {p.label} ({p.cron})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Custom Cron Expression *
              </label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="* * * * *"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Backup Directory */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Custom Target Directory (Optional)
            </label>
            <input
              type="text"
              placeholder={`Default: ${defaultBackupDir}`}
              value={backupDir}
              onChange={(e) => setBackupDir(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No automated schedules configured yet. Click "New Schedule" to create one.
        </div>
      ) : (
        <div className="space-y-2.5">
          {schedules.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {item.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      item.enabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {item.enabled ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                  <span>
                    Cron: <code className="bg-white px-1 py-0.5 rounded border text-purple-700 font-mono">{item.cronExpression}</code>
                  </span>
                  <span>•</span>
                  <span>
                    Databases: <strong className="text-slate-700 font-medium">{item.databases.join(", ")}</strong>
                  </span>
                  {item.lastRun && (
                    <>
                      <span>•</span>
                      <span>Last run: {new Date(item.lastRun).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleEnable(item.id, item.enabled)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-colors ${
                    item.enabled
                      ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                  }`}
                  title={item.enabled ? "Pause Schedule" : "Resume Schedule"}
                >
                  <Power className="w-3 h-3" />
                  <span>{item.enabled ? "Pause" : "Resume"}</span>
                </button>

                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors"
                  title="Delete Schedule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
