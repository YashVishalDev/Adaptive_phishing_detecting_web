import React from "react";
import { Settings, ShieldAlert } from "lucide-react";
import { Verdict } from "../../engine/fusion";

import { LOGO_IMAGE_DATA } from "../assets/embedded-images";

const logoImg = LOGO_IMAGE_DATA;

interface HeaderProps {
  domain: string;
  verdict?: Verdict;
  onOptionsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ domain, verdict = "Safe", onOptionsClick }) => {
  const isDangerous = verdict === "Dangerous";

  return (
    <header className="flex items-center justify-between pb-3.5 border-b border-slate-700/20">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl border p-0.5 overflow-hidden flex items-center justify-center shrink-0 ${
          isDangerous ? "border-red-500/50 bg-red-950/60" : "border-cyan-500/50 bg-slate-950 shadow-md shadow-cyan-950/40"
        }`}>
          <img
            src={logoImg}
            alt="TrustLens Logo"
            className="w-full h-full object-cover rounded-lg"
            loading="eager"
            decoding="sync"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black tracking-tight text-white">TrustLens</h1>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              v1.0
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
            {domain || "Evaluating..."}
          </div>
        </div>
      </div>

      {onOptionsClick && (
        <button
          onClick={onOptionsClick}
          className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Engine Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </header>
  );
};
