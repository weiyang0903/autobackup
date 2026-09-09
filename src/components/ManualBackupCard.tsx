import React, { useState } from "react";
import { Play, Folder, Sparkles, Loader2, Check } from "lucide-react";

interface ManualBackupCardProps {
  selectedDatabases: string[];
  defaultBackupDir: string;
  onBackupSuccess: () => void;
}

export function ManualBackupCard({
  selectedDatabases,
  defaultBackupDir,
  onBackupSuccess,
}: ManualBackupCardProps) {
  const [customPath, setCustomPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleStartBackup = async () => {
    if (selectedDatabases.length === 0) {
      setResultMessage({
        type: "error",
        text: "Please select at least one database above before exporting.",
      });
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const res = await fetch("/api/backup/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databases: selectedDatabases,
          customBackupDir: customPath.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResultMessage({
          type: "success",
          text: `Successfully exported to: ${data.item.fileName} (${(
            data.item.fileSize / 1024
          ).toFixed(1)} KB in ${data.item.durationMs}ms)`,
        });
        onBackupSuccess();
      } else {
        setResultMessage({
          type: "error",
          text: data.error || "Failed to execute mysqldump export.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResultMessage({
        type: "error",
        text: `Network or Server error: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Immediate Manual Export
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export selected databases directly to disk with a single click
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Destination Path Input */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            Destination Backup Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`Leave empty to use default: ${defaultBackupDir}`}
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
            />
            {customPath && (
              <button
                type="button"
                onClick={() => setCustomPath("")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Supports absolute paths (e.g. <code>D:\mysql_backups</code>) or relative paths.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={handleStartBackup}
            disabled={loading || selectedDatabases.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running mysqldump...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Export Now ({selectedDatabases.length} Selected)</span>
              </>
            )}
          </button>
        </div>

        {/* Result Feedback Banner */}
        {resultMessage && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              resultMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {resultMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : null}
            <div className="break-all leading-relaxed">{resultMessage.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
