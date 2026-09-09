import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface StatusAlertProps {
  type: "error" | "success" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
}

export function StatusAlert({
  type,
  title,
  message,
  onClose,
}: StatusAlertProps) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  return (
    <div
      className={`border rounded-lg p-4 flex items-start gap-3 shadow-sm ${styles[type]}`}
    >
      {icons[type]}
      <div className="flex-1 text-sm">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="leading-relaxed break-words">{message}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
