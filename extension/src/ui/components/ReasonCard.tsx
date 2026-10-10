import React, { useState } from "react";
import { PlainReason } from "../../engine/reason-catalog";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

interface ReasonCardProps {
  reason: PlainReason;
  isDark?: boolean;
}

export const ReasonCard: React.FC<ReasonCardProps> = ({ reason, isDark = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let icon = <Info className="w-4 h-4 text-cyan-500 shrink-0" />;
  let borderClass = isDark
    ? "border-slate-800 bg-slate-900/70"
    : "border-slate-200 bg-white shadow-sm";
  let titleColor = isDark ? "text-slate-100" : "text-slate-900";
  let textColor = isDark ? "text-slate-300" : "text-slate-600";
  let badgeColor = isDark
    ? "border-slate-700 bg-slate-800/80 text-slate-300"
    : "border-slate-200 bg-slate-100 text-slate-600";

  if (reason.severity === "critical") {
    icon = <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
    borderClass = isDark
      ? "border-red-900/60 bg-red-950/25"
      : "border-red-200 bg-red-50/70 shadow-sm";
    titleColor = isDark ? "text-red-200" : "text-red-900";
    textColor = isDark ? "text-red-300/90" : "text-red-700";
    badgeColor = isDark
      ? "border-red-800 bg-red-900/50 text-red-200"
      : "border-red-200 bg-red-100 text-red-800";
  } else if (reason.severity === "warning") {
    icon = <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    borderClass = isDark
      ? "border-amber-900/50 bg-amber-950/20"
      : "border-amber-200 bg-amber-50/70 shadow-sm";
    titleColor = isDark ? "text-amber-200" : "text-amber-900";
    textColor = isDark ? "text-amber-300/90" : "text-amber-700";
    badgeColor = isDark
      ? "border-amber-800 bg-amber-900/50 text-amber-200"
      : "border-amber-200 bg-amber-100 text-amber-800";
  }

  const evidenceBg = isDark
    ? "bg-black/50 border-slate-800 text-slate-300"
    : "bg-slate-100 border-slate-200 text-slate-800";
  const evidenceLabel = isDark ? "text-slate-500" : "text-slate-500";
  const expandBorder = isDark ? "border-slate-800/80" : "border-slate-100";
  const mattersBg = isDark
    ? "text-slate-300 border-cyan-500/50 bg-slate-900/40"
    : "text-slate-700 border-blue-500/50 bg-blue-50/40";

  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${borderClass}`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`text-xs font-bold leading-snug tracking-tight ${titleColor}`}>
              {reason.title}
            </h4>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
              {reason.severity}
            </span>
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${textColor}`}>
            {reason.plainText}
          </p>
          {reason.evidence && (
            <div className={`mt-2 text-[11px] font-mono border rounded px-2.5 py-1.5 break-all ${evidenceBg}`}>
              <span className={`font-sans font-semibold mr-1.5 ${evidenceLabel}`}>Evidence:</span>
              {reason.evidence}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Why This Matters */}
      <div className={`mt-2.5 pt-2 border-t ${expandBorder}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-between w-full text-[11px] font-semibold transition-colors focus:outline-none ${
            isDark ? "text-cyan-400 hover:text-cyan-300" : "text-blue-600 hover:text-blue-700"
          }`}
        >
          <span>Why this matters</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {isExpanded && (
          <div className={`mt-1.5 text-[11px] leading-relaxed p-2 rounded-r border-l-2 ${mattersBg}`}>
            {reason.whyItMatters}
          </div>
        )}
      </div>
    </div>
  );
};
