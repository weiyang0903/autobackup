import React, { useState } from "react";
import {
  History,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Clock,
  Folder,
  Archive,
} from "lucide-react";
import { BackupHistoryItem } from "@/types";

interface BackupHistoryTableProps {
  history: BackupHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function BackupHistoryTable({
  history,
  loading,
  onRefresh,
}: BackupHistoryTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPath = (id: string, path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, fileName: string) => {
    const deletePhysical = window.confirm(
      `Delete backup record '${fileName}'?\n\nClick OK to delete record and the actual backup files/directories from disk.`
    );
    if (!deletePhysical) return;

    try {
      const res = await fetch(`/api/history?id=${id}&deleteFile=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || "Failed to delete history record");
      }
    } catch (err) {
      console.error("Failed to delete backup history:", err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Backup History & Files
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of exported SQL and replicated folder backups with instant ZIP download
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading history records...
        </div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No backup history records yet. Perform a manual export or set up a schedule.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Targets (DBs & Folders)</th>
                <th className="py-3 px-4">Relative Path</th>
                <th className="py-3 px-4">Total Size</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.status === "SUCCESS" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Success
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium border border-red-200 text-[11px]"
                        title={item.errorMessage || "Export failed"}
                      >
                        <XCircle className="w-3 h-3 text-red-600" />
                        Failed
                      </span>
                    )}
                  </td>

                  {/* Trigger */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {item.triggerType === "manual" ? (
                      <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Manual
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                        <Clock className="w-3 h-3 text-purple-600" />
                        {item.scheduleName || "Schedule"}
                      </span>
                    )}
                  </td>

                  {/* Targets (Databases & Folders) */}
                  <td className="py-3 px-4">
                    <div className="space-y-0.5 max-w-xs">
                      {item.databases && item.databases.length > 0 && (
                        <div className="font-medium text-slate-900 truncate">
                          {item.databases.join(", ")}
                        </div>
                      )}
                      {item.sourceFolders && item.sourceFolders.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-500 text-[11px] truncate">
                          <Folder className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>
                            {item.sourceFolders
                              .map((f) => f.split(/[\\/]/).pop())
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* File / Directory Path */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 max-w-sm">
                      <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span
                        className="font-mono text-slate-700 truncate"
                        title={item.filePath}
                      >
                        {item.fileName}
                      </span>
                      <button
                        onClick={() => handleCopyPath(item.id, item.filePath)}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded shrink-0 transition-colors"
                        title="Copy full physical path"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* File Size */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-600">
                    {formatBytes(item.fileSize)}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                    {item.durationMs}ms
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === "SUCCESS" && (
                        <a
                          href={`/api/backup/download?id=${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md font-medium transition-colors text-[11px]"
                          title="Download Complete Backup ZIP"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Download ZIP</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleDelete(item.id, item.fileName)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                        title="Delete record & files"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
