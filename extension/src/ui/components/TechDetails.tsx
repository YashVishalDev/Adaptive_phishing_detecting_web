import React, { useState } from "react";
import { PageAuditReport } from "../../background/scoring-orchestrator";
import { FEATURE_NAMES } from "../../features/schema";
import { ChevronDown, ChevronUp, Download, Cpu, Layers } from "lucide-react";

interface TechDetailsProps {
  report: PageAuditReport;
}

export const TechDetails: React.FC<TechDetailsProps> = ({ report }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trustlens-audit-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-borderSubtle bg-cardBg/60 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Technical Audit & Model Details</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-borderSubtle">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/40 p-2.5 rounded-lg border border-gray-800">
            <div>
              <span className="text-gray-500">Model Version:</span>{" "}
              <span className="font-mono text-cyan-300">{report.modelVersion}</span>
            </div>
            <div>
              <span className="text-gray-500">Evaluation Stage:</span>{" "}
              <span className="font-mono text-cyan-300">Stage {report.stage}</span>
            </div>
            <div>
              <span className="text-gray-500">Phish Probability:</span>{" "}
              <span className="font-mono text-cyan-300">{(report.phishProbability * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Inference Runtime:</span>{" "}
              <span className="font-mono text-emerald-400">Pure TS TreeSHAP</span>
            </div>
          </div>

          {/* Top SHAP Attributions */}
          {report.attributions && report.attributions.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Top Feature Attributions (TreeSHAP)
                </span>
                <span className="text-[10px] text-gray-500">Weight</span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {report.attributions.slice(0, 6).map((attr) => {
                  const isRisk = attr.shapValue > 0;
                  return (
                    <div
                      key={attr.featureIndex}
                      className="flex items-center justify-between text-[10px] font-mono p-1.5 rounded bg-gray-900/60 border border-gray-800"
                    >
                      <span className="text-gray-300 truncate max-w-[190px]">{attr.featureName}</span>
                      <span className={`font-bold ${isRisk ? "text-red-400" : "text-emerald-400"}`}>
                        {isRisk ? `+${attr.shapValue.toFixed(4)}` : attr.shapValue.toFixed(4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Download JSON Audit Report Button */}
          <button
            onClick={handleDownloadReport}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Explanation Report (JSON)</span>
          </button>
        </div>
      )}
    </div>
  );
};
