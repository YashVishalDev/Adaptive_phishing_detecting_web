import React from "react";
import { Verdict } from "../../engine/fusion";

interface ScoreGaugeProps {
  score: number;
  verdict: Verdict;
  size?: number;
  isDark?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  verdict,
  size = 120,
  isDark = true
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const strokeDashoffset = circumference - progress * circumference;

  let strokeColor = "#10B981"; // Safe
  let glowColor = "rgba(16, 185, 129, 0.3)";
  let verdictBadgeBg = isDark
    ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
    : "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm";

  switch (verdict) {
    case "Safe":
      strokeColor = "#10B981";
      glowColor = "rgba(16, 185, 129, 0.3)";
      verdictBadgeBg = isDark
        ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
        : "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm";
      break;
    case "Caution":
      strokeColor = "#F59E0B";
      glowColor = "rgba(245, 158, 11, 0.3)";
      verdictBadgeBg = isDark
        ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
        : "bg-amber-50 border-amber-300 text-amber-800 shadow-sm";
      break;
    case "Suspicious":
      strokeColor = "#F97316";
      glowColor = "rgba(249, 115, 22, 0.3)";
      verdictBadgeBg = isDark
        ? "bg-orange-950/70 border-orange-500/40 text-orange-300"
        : "bg-orange-50 border-orange-300 text-orange-800 shadow-sm";
      break;
    case "Dangerous":
      strokeColor = "#EF4444";
      glowColor = "rgba(239, 68, 68, 0.4)";
      verdictBadgeBg = isDark
        ? "bg-red-950/70 border-red-500/40 text-red-300"
        : "bg-red-50 border-red-300 text-red-800 shadow-sm";
      break;
  }

  const trackColor = isDark ? "#1E293B" : "#E2E8F0";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const labelColor = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: `drop-shadow(0 0 10px ${glowColor})` }}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-3xl font-extrabold tracking-tight ${textColor}`}>
            {score}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>
            Trust Score
          </span>
        </div>
      </div>
      <div className={`mt-2.5 px-3.5 py-1 rounded-full border text-xs font-bold tracking-wide uppercase transition-colors ${verdictBadgeBg}`}>
        {verdict}
      </div>
    </div>
  );
};
