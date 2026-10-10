import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { ScoreGauge } from "../components/ScoreGauge";
import { ReasonCard } from "../components/ReasonCard";
import { TechDetails } from "../components/TechDetails";
import { PageAuditReport } from "../../background/scoring-orchestrator";
import { UrlScanner, UrlScanReport } from "../../engine/url-scanner";
import {
  ShieldCheck,
  Flag,
  CheckCircle,
  ExternalLink,
  Search,
  Sun,
  Moon,
  Globe,
  ArrowRight,
  Info,
  Shield
} from "lucide-react";

export const PopupApp: React.FC = () => {
  const [report, setReport] = useState<PageAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Search input state
  const [showSearch, setShowSearch] = useState(false);
  const [searchUrl, setSearchUrl] = useState("");
  const [customReport, setCustomReport] = useState<UrlScanReport | null>(null);

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("trustlens_theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("trustlens_theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("trustlens_theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    // Query active tab
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id && activeTab?.url) {
          try {
            const parsed = new URL(activeTab.url);
            setDomain(parsed.hostname);
          } catch {}

          chrome.runtime.sendMessage(
            { type: "TRUSTLENS_GET_ACTIVE_REPORT", tabId: activeTab.id },
            (response) => {
              if (response?.report) {
                setReport(response.report);
              }
              setLoading(false);
            }
          );
        } else {
          setLoading(false);
        }
      });
    } else {
      // Mock for development / browser viewing
      setDomain("login.bank.example.com");
      setReport({
        url: "https://login.bank.example.com/auth",
        tabId: 1,
        timestamp: Date.now(),
        stage: 2,
        trustScore: 88,
        verdict: "Safe",
        phishProbability: 0.05,
        reasons: [
          {
            id: "TRANCO_TOP_REPUTATION",
            title: "Verified Global Top Domain",
            plainText: "This website is an established, high-reputation domain verified in global top traffic rankings.",
            evidence: "Domain verified in Tranco top reputation index.",
            whyItMatters: "Recognized domains with consistent HTTPS pose minimal baseline phishing risk.",
            severity: "info"
          }
        ],
        attributions: [
          { featureIndex: 42, featureName: "is_tranco_top_10k", shapValue: -0.85, featureValue: 1.0 },
          { featureIndex: 39, featureName: "is_https", shapValue: -0.42, featureValue: 1.0 }
        ],
        features: Array(44).fill(0),
        modelVersion: "1.0.0"
      });
      setLoading(false);
    }
  }, []);

  const handleAlwaysTrust = () => {
    if (!domain) return;
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_TRUST_SITE", domain }, () => {
        setActionMessage("Added to trusted domains list.");
        setTimeout(() => setActionMessage(null), 3000);
      });
    } else {
      setActionMessage("Added to trusted domains list.");
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleReportFalsePositive = () => {
    setActionMessage("Feedback recorded locally.");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUrl.trim()) return;
    try {
      const scanner = new UrlScanner();
      const res = scanner.scan(searchUrl.trim());
      setCustomReport(res);
    } catch (err: any) {
      setActionMessage("Invalid link format");
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const openOptions = (tab = "scanner") => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime?.getURL) {
      chrome.tabs.create({ url: chrome.runtime.getURL(`src/ui/options/index.html?tab=${tab}`) });
    } else if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(`../options/index.html?tab=${tab}`, "_blank");
    }
  };

  const displayVerdict = customReport ? customReport.verdict : report?.verdict;
  const displayScore = customReport ? customReport.trustScore : report?.trustScore || 0;
  const displayReasons = customReport ? customReport.reasons : report?.reasons || [];
  const displayDomain = customReport ? customReport.hostname : domain;

  return (
    <div
      className={`w-[380px] min-h-[500px] p-4 font-sans select-none flex flex-col justify-between transition-colors ${
        isDark ? "bg-[#0A0E17] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      <div>
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/20">
          <Header domain={displayDomain} verdict={displayVerdict} onOptionsClick={() => openOptions("scanner")} />

          <div className="flex items-center gap-1">
            <button
              onClick={() => openOptions("about")}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40"
                  : "border-slate-200 bg-white text-slate-600 hover:text-blue-600 shadow-sm"
              }`}
              title="About TrustLens"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showSearch
                  ? isDark ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-blue-100 border-blue-300 text-blue-700"
                  : isDark ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white" : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 shadow-sm"
              }`}
              title="Search / Check Link"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-slate-800 bg-slate-900/60 text-amber-400 hover:text-amber-300"
                  : "border-slate-200 bg-white text-indigo-600 hover:bg-slate-50 shadow-sm"
              }`}
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Link Search Input Bar */}
        {showSearch && (
          <form onSubmit={handleCustomSearch} className="mt-3 flex gap-1.5 animate-fade-in">
            <input
              type="text"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              placeholder="Check URL (e.g. paypal.xyz)..."
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all focus:outline-none ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500"
                  : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm"
              }`}
            />
            <button
              type="submit"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDark ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400" : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              Scan
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Evaluating link safety...</span>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Score Gauge */}
            <div className="py-1">
              <ScoreGauge score={displayScore} verdict={displayVerdict || "Safe"} size={110} isDark={isDark} />
            </div>

            {/* Notification message */}
            {actionMessage && (
              <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-500">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{actionMessage}</span>
              </div>
            )}

            {/* Reasons List */}
            <div className="space-y-2">
              <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Security Assessment
              </div>
              {displayReasons.length > 0 ? (
                displayReasons.slice(0, 3).map((r) => (
                  <ReasonCard key={r.id} reason={r} isDark={isDark} />
                ))
              ) : (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    isDark ? "border-slate-800 bg-slate-900/60 text-slate-400" : "border-slate-200 bg-white text-slate-600 shadow-sm"
                  }`}
                >
                  No anomalous behavioral or structural threats detected.
                </div>
              )}
            </div>

            {/* Technical Details Drawer */}
            {report && !customReport && <TechDetails report={report} />}

            {/* Actions Bar */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleAlwaysTrust}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  isDark
                    ? "border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Trust Domain</span>
              </button>
              <button
                onClick={handleReportFalsePositive}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  isDark
                    ? "border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-amber-500" />
                <span>Report False Flag</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <footer
        className={`mt-4 pt-3 border-t flex items-center justify-between text-[10px] ${
          isDark ? "border-slate-800/80 text-slate-500" : "border-slate-200 text-slate-500"
        }`}
      >
        <button
          onClick={() => openOptions("about")}
          className={`flex items-center gap-1 font-semibold transition-colors ${
            isDark ? "hover:text-cyan-400 text-slate-400" : "hover:text-blue-600 text-slate-600"
          }`}
          title="Learn About TrustLens & Team Code Warriors"
        >
          <Shield className="w-3 h-3 text-cyan-400" />
          <span>About TrustLens</span>
        </button>

        <button
          onClick={() => openOptions("scanner")}
          className={`flex items-center gap-1 font-semibold transition-colors ${
            isDark ? "hover:text-cyan-400 text-slate-400" : "hover:text-blue-600 text-slate-600"
          }`}
        >
          <span>Full Scanner</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </footer>
    </div>
  );
};
