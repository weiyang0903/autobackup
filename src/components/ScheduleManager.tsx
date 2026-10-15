import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Power,
  AlertCircle,
  Calendar,
  X,
  Sparkles,
  FolderPlus,
  Folder,
  FolderOpen,
} from "lucide-react";
import { ScheduleItem, ScheduleFrequencyType } from "@/types";
import { DirectoryPickerModal } from "./DirectoryPickerModal";

interface ScheduleManagerProps {
  availableDatabases: string[];
  defaultBackupDir: string;
  refreshTrigger?: number;
}

const WEEK_DAYS = [
  { index: 1, label: "Mon", full: "Monday" },
  { index: 2, label: "Tue", full: "Tuesday" },
  { index: 3, label: "Wed", full: "Wednesday" },
  { index: 4, label: "Thu", full: "Thursday" },
  { index: 5, label: "Fri", full: "Friday" },
  { index: 6, label: "Sat", full: "Saturday" },
  { index: 0, label: "Sun", full: "Sunday" },
];

/**
 * 将调度规则格式化为人类易读的描述文本
 */
function formatScheduleSummary(item: ScheduleItem): string {
  if (item.frequencyType === "hourly") {
    return "Every Hour (at :00)";
  }

  const timesStr =
    item.times && item.times.length > 0
      ? item.times.join(", ")
      : item.cronExpressions?.join(", ") || "00:00";

  if (item.frequencyType === "daily") {
    return `Daily at ${timesStr}`;
  }

  if (item.frequencyType === "weekly") {
    const dayNames =
      item.weekDays && item.weekDays.length > 0
        ? item.weekDays
            .map((d) => WEEK_DAYS.find((w) => w.index === d)?.label || `Day ${d}`)
            .join(", ")
        : "Sunday";
    return `Weekly on [${dayNames}] at ${timesStr}`;
  }

  return item.cronExpressions?.[0] || "Custom";
}

export function ScheduleManager({
  availableDatabases,
  defaultBackupDir,
  refreshTrigger,
}: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 表单状态
  const [name, setName] = useState("");
  const [selectedDbs, setSelectedDbs] = useState<string[]>([]);
  const [sourceFolders, setSourceFolders] = useState<string[]>([]);
  const [folderInput, setFolderInput] = useState("");
  const [frequencyType, setFrequencyType] =
    useState<ScheduleFrequencyType>("hourly");

  // Daily / Weekly 的时间点列表 (初始不预选任何时间点，由用户自主添加)
  const [timesList, setTimesList] = useState<string[]>([]);
  const [currentTimeInput, setCurrentTimeInput] = useState("09:00");

  // Weekly 的选中星期 (初始不预选任何星期，由用户自主点选)
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const [backupDir, setBackupDir] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 加载调度列表 (支持 silent 静默刷新，不触发骨架加载状态)
  const fetchSchedules = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchSchedules(true);
    }
  }, [refreshTrigger]);

  // 添加或浏览源文件夹
  const handleAddFolderClick = () => {
    const trimmed = folderInput.trim();
    if (!trimmed) {
      // 若输入框为空，点击直接打开选择文件夹弹窗
      setIsPickerOpen(true);
      return;
    }
    if (sourceFolders.includes(trimmed)) {
      setFormError(`Folder path "${trimmed}" is already added.`);
      return;
    }
    setFormError(null);
    setSourceFolders([...sourceFolders, trimmed]);
    setFolderInput("");
  };

  // 从弹窗选择器中选定文件夹
  const handleDirectorySelected = (chosenPath: string) => {
    if (!chosenPath) return;
    if (sourceFolders.includes(chosenPath)) {
      setFormError(`Folder path "${chosenPath}" is already added.`);
      return;
    }
    setFormError(null);
    setSourceFolders([...sourceFolders, chosenPath]);
    setFolderInput("");
  };

  // 移除源文件夹
  const handleRemoveFolder = (folderToRemove: string) => {
    setSourceFolders(sourceFolders.filter((f) => f !== folderToRemove));
  };

  // 添加时间点
  const handleAddTime = () => {
    if (!currentTimeInput) return;
    if (timesList.includes(currentTimeInput)) {
      setFormError(`Time ${currentTimeInput} is already added`);
      return;
    }
    setFormError(null);
    setTimesList([...timesList, currentTimeInput].sort());
  };

  // 移除时间点
  const handleRemoveTime = (timeToRemove: string) => {
    setFormError(null);
    setTimesList(timesList.filter((t) => t !== timeToRemove));
  };

  // 切换星期选择
  const handleToggleWeekDay = (dayIndex: number) => {
    setFormError(null);
    if (selectedWeekDays.includes(dayIndex)) {
      setSelectedWeekDays(selectedWeekDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedWeekDays([...selectedWeekDays, dayIndex]);
    }
  };

  // 提交新建调度
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Please enter a name for this schedule");
      return;
    }

    if (selectedDbs.length === 0 && sourceFolders.length === 0) {
      setFormError("Please select at least one database OR add at least one folder to back up");
      return;
    }

    if (
      (frequencyType === "daily" || frequencyType === "weekly") &&
      timesList.length === 0
    ) {
      setFormError("Please add at least one backup time (e.g. 09:00)");
      return;
    }

    if (frequencyType === "weekly" && selectedWeekDays.length === 0) {
      setFormError("Please select at least one day of the week");
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
          sourceFolders: sourceFolders.length > 0 ? sourceFolders : undefined,
          frequencyType,
          times: frequencyType !== "hourly" ? timesList : undefined,
          weekDays: frequencyType === "weekly" ? selectedWeekDays : undefined,
          backupDir: backupDir.trim() || defaultBackupDir,
          enabled: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreating(false);
        setName("");
        setSelectedDbs([]);
        setSourceFolders([]);
        setFolderInput("");
        setFrequencyType("hourly");
        setTimesList([]);
        setSelectedWeekDays([]);
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
    if (
      !window.confirm(
        `Are you sure you want to delete the schedule '${scheduleName}'?`
      )
    ) {
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
            Automated Schedules (Databases & Folders)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure periodic background tasks to export MySQL databases and replicate directories automatically
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
          className="mb-5 p-5 bg-purple-50/40 border border-purple-200 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
            <h3 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Configure New Backup Schedule
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
              placeholder="e.g. Daily Project DB & Uploads Backup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Databases Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Databases to Include (Optional if folders are selected)
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
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isChecked
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {db}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Folders Backup Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-purple-600" />
              Source Folders to Backup (One or multiple directories)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. C:\xampp\htdocs\my_project\uploads or click to browse"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFolderClick();
                    }
                  }}
                  className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-purple-600 transition-colors"
                  title="Browse local folders"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddFolderClick}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                {folderInput.trim() ? "Add Folder" : "Browse / Add Folder"}
              </button>
            </div>

            {sourceFolders.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg max-h-28 overflow-y-auto">
                {sourceFolders.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-800 font-mono"
                  >
                    <Folder className="w-3 h-3 text-purple-600 shrink-0" />
                    <span className="truncate max-w-xs">{f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(f)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Frequency Type Selector (Every Hour / Daily / Weekly) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Backup Frequency *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFrequencyType("hourly")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  frequencyType === "hourly"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Every Hour</span>
                <span
                  className={`text-[10px] font-normal ${
                    frequencyType === "hourly" ? "text-purple-100" : "text-slate-400"
                  }`}
                >
                  At minute :00
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFrequencyType("daily")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  frequencyType === "daily"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Daily</span>
                <span
                  className={`text-[10px] font-normal ${
                    frequencyType === "daily" ? "text-purple-100" : "text-slate-400"
                  }`}
                >
                  Specific time(s)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFrequencyType("weekly")}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                  frequencyType === "weekly"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Weekly</span>
                <span
                  className={`text-[10px] font-normal ${
                    frequencyType === "weekly" ? "text-purple-100" : "text-slate-400"
                  }`}
                >
                  Chosen days & times
                </span>
              </button>
            </div>
          </div>

          {/* Sub-panel 1: Every Hour Info */}
          {frequencyType === "hourly" && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Backups will run automatically at minute 0 of every hour (e.g. 01:00, 02:00, 03:00...).
              </span>
            </div>
          )}

          {/* Sub-panel 2: Weekly Days Selector */}
          {frequencyType === "weekly" && (
            <div className="bg-white p-3.5 border border-slate-200 rounded-lg space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Select Days of Week (Select any number of days) *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const isSelected = selectedWeekDays.includes(day.index);
                  return (
                    <button
                      type="button"
                      key={day.index}
                      onClick={() => handleToggleWeekDay(day.index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {selectedWeekDays.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  No days selected. Please click on one or more days above.
                </p>
              )}
            </div>
          )}

          {/* Sub-panel 3: Multi-Time Picker (For Daily & Weekly) */}
          {(frequencyType === "daily" || frequencyType === "weekly") && (
            <div className="bg-white p-3.5 border border-slate-200 rounded-lg space-y-2.5">
              <label className="block text-xs font-medium text-slate-700">
                Backup Times (Add one or multiple times) *
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={currentTimeInput}
                  onChange={(e) => setCurrentTimeInput(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Time</span>
                </button>
              </div>

              {timesList.length === 0 ? (
                <p className="text-[11px] text-amber-600 pt-0.5">
                  No backup time added yet. Pick a time and click &quot;Add Time&quot;.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {timesList.map((time) => (
                    <span
                      key={time}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100/70 border border-purple-200 text-purple-900 rounded-lg text-xs font-mono font-medium"
                    >
                      <span>{time}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(time)}
                        className="text-purple-400 hover:text-purple-700 transition-colors"
                        title="Remove time"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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

          <div className="flex justify-end gap-2 pt-2 border-t border-purple-100">
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
        <div className="py-8 text-center text-xs text-slate-400">
          Loading schedules...
        </div>
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
                  <span className="inline-flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    <Clock className="w-3 h-3 text-purple-500" />
                    {formatScheduleSummary(item)}
                  </span>
                  {item.databases && item.databases.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        DBs:{" "}
                        <strong className="text-slate-700 font-medium">
                          {item.databases.join(", ")}
                        </strong>
                      </span>
                    </>
                  )}
                  {item.sourceFolders && item.sourceFolders.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Folder className="w-3 h-3 text-purple-600" />
                        Folders: {item.sourceFolders.map((f) => f.split(/[\\/]/).pop()).join(", ")}
                      </span>
                    </>
                  )}
                  {item.lastRun && (
                    <>
                      <span>•</span>
                      <span>
                        Last run: {new Date(item.lastRun).toLocaleString()}
                      </span>
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

      {/* 文件夹可视化目录选择器弹窗 */}
      <DirectoryPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleDirectorySelected}
        initialPath={folderInput.trim() || undefined}
      />
    </div>
  );
}
