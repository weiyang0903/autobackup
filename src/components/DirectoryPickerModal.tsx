import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ArrowUp,
  HardDrive,
  X,
  Check,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

interface DirectoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  initialPath?: string;
}

interface DirectoryResponse {
  success: boolean;
  currentPath: string;
  parentPath: string | null;
  drives: string[];
  directories: { name: string; path: string }[];
  error?: string;
}

export function DirectoryPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialPath,
}: DirectoryPickerModalProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  const [directories, setDirectories] = useState<{ name: string; path: string }[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 加载指定路径的目录内容
  const loadDirectory = async (targetPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = targetPath
        ? `/api/system/browse-directories?path=${encodeURIComponent(targetPath)}`
        : "/api/system/browse-directories";
      const res = await fetch(url);
      const data: DirectoryResponse = await res.json();

      if (data.success) {
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setDrives(data.drives || []);
        setDirectories(data.directories || []);
        setSelectedPath(data.currentPath);
      } else {
        setError(data.error || "Failed to read directory");
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
      setSearchTerm("");
      loadDirectory(initialPath || "");
    }
  }, [isOpen, initialPath]);

  if (!isOpen) return null;

  // 过滤展示的子目录
  const filteredDirs = directories.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Browse & Select Source Folder
              </h3>
              <p className="text-[11px] text-slate-500">
                Navigate local disks and select any folder to include in the backup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drives & Quick Jump */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" /> Drives:
          </span>
          {drives.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => loadDirectory(d)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                currentPath.toUpperCase().startsWith(d.toUpperCase())
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => loadDirectory(process.cwd?.() || "")}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Project Root
          </button>
        </div>

        {/* Navigation & Search Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            type="button"
            disabled={!parentPath || loading}
            onClick={() => parentPath && loadDirectory(parentPath)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Go to parent directory"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Current Path Bar */}
          <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 truncate">
            {currentPath || "Loading..."}
          </div>

          <button
            type="button"
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            title="Refresh current folder"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Input */}
        <div className="px-5 py-2 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter subfolders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Folder List Area */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[220px] max-h-[360px] bg-white divide-y divide-slate-100">
          {error ? (
            <div className="py-10 text-center text-xs text-red-500">
              {error}
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
              Scanning folders...
            </div>
          ) : filteredDirs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {searchTerm ? "No matching subfolders found" : "No readable subfolders in this directory"}
            </div>
          ) : (
            filteredDirs.map((dir) => {
              const isSelected = selectedPath === dir.path;
              return (
                <div
                  key={dir.path}
                  onClick={() => setSelectedPath(dir.path)}
                  onDoubleClick={() => loadDirectory(dir.path)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors group ${
                    isSelected
                      ? "bg-purple-50 text-purple-900 font-medium border border-purple-200"
                      : "hover:bg-slate-50 text-slate-700 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className={`w-4 h-4 shrink-0 ${isSelected ? "text-purple-600" : "text-amber-500"}`} />
                    <span className="truncate">{dir.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadDirectory(dir.path);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-200/70 hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-0.5"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-slate-400">Selected Path:</div>
            <div className="text-xs font-mono text-slate-800 truncate" title={selectedPath}>
              {selectedPath || currentPath || "None"}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedPath && !currentPath}
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
