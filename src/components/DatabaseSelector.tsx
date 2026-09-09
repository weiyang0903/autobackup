import React, { useState, useMemo } from "react";
import { Database, Search, CheckSquare, Square, HardDrive } from "lucide-react";
import { DatabaseInfo } from "@/types";

interface DatabaseSelectorProps {
  databases: DatabaseInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
  loading: boolean;
}

/**
 * 格式化字节大小为用户友好字符串
 */
function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function DatabaseSelector({
  databases,
  selected,
  onChange,
  loading,
}: DatabaseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // 过滤后的列表
  const filteredDatabases = useMemo(() => {
    return databases.filter((db) =>
      db.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [databases, searchTerm]);

  // 全选/取消全选
  const handleToggleAll = () => {
    if (selected.length === filteredDatabases.length && filteredDatabases.length > 0) {
      onChange([]);
    } else {
      onChange(filteredDatabases.map((db) => db.name));
    }
  };

  // 单项勾选
  const handleToggleOne = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Select Databases to Export
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose single or multiple MySQL databases for backup
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search databases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Select All Toggle */}
          <button
            onClick={handleToggleAll}
            disabled={filteredDatabases.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
          >
            {selected.length === filteredDatabases.length && filteredDatabases.length > 0
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>
      </div>

      {/* Database Grid / List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
          Loading databases from MySQL...
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No user databases found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredDatabases.map((db) => {
            const isSelected = selected.includes(db.name);
            return (
              <div
                key={db.name}
                onClick={() => handleToggleOne(db.name)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-300"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 text-blue-600">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {db.name}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{db.tableCount ?? 0} tables</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <HardDrive className="w-3 h-3 text-slate-400" />
                        {formatBytes(db.sizeBytes)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Selected: <strong className="text-blue-600 font-semibold">{selected.length}</strong> / {databases.length} databases
        </span>
        <span className="text-[11px]">
          Target SQL files will be exported individually or packed
        </span>
      </div>
    </div>
  );
}
