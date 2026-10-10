import React, { useState, useRef } from "react";
import { UrlScanner, UrlScanReport } from "../../engine/url-scanner";
import { ScoreGauge } from "./ScoreGauge";
import { ReasonCard } from "./ReasonCard";
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Lock,
  Unlock,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldBan,
  CheckCircle2,
  Eye,
  X,
  Plus
} from "lucide-react";

interface UrlScannerCardProps {
  isDark: boolean;
  onAddAllow?: (domain: string) => void;
  onAddDeny?: (domain: string) => void;
  sensitivity?: "relaxed" | "balanced" | "strict";
}

const SAMPLE_TESTS = [
  {
    name: "Safe Domain",
    url: "https://www.google.com",
    type: "safe",
    tag: "Benign"
  },
  {
    name: "Phishing Scam",
    url: "http://paypal-security-update.xyz/login/verify",
    type: "danger",
    tag: "High Risk"
  },
  {
    name: "Typosquatting",
    url: "http://amaz0n-security.com/account",
    type: "warning",
    tag: "Spoof"
  },
  {
    name: "IP & Raw Port",
    url: "http://192.168.1.55:8080/bank/login",
    type: "warning",
    tag: "IP Anomaly"
  }
];

export const UrlScannerCard: React.FC<UrlScannerCardProps> = ({
  isDark,
  onAddAllow,
  onAddDeny,
  sensitivity = "balanced"
}) => {
  const [inputUrl, setInputUrl] = useState("");
  const [report, setReport] = useState<UrlScanReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Scan tracking count and live feedback toast
  const [scanCount, setScanCount] = useState(0);
  const [lastScanInfo, setLastScanInfo] = useState<{
    count: number;
    time: string;
    domain: string;
    score: number;
    verdict: string;
  } | null>(null);
  const [scanToast, setScanToast] = useState<{
    id: number;
    message: string;
    domain: string;
    score: number;
    verdict: string;
    time: string;
  } | null>(null);

  // Action confirmation modal (for Trust / Block actions)
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: "trust" | "block";
    domain: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = (targetUrl?: string) => {
    const raw = (targetUrl !== undefined ? targetUrl : inputUrl).trim();
    if (!raw) {
      setErrorMessage("Please enter or paste a website link to check.");
      return;
    }

    setErrorMessage(null);
    setScanning(true);

    try {
      // Micro-delay with fresh scanner instantiation
      setTimeout(() => {
        try {
          const activeScanner = new UrlScanner();
          const res = activeScanner.scan(raw, sensitivity);
          setReport(res);
          setScanning(false);

          const nextCount = scanCount + 1;
          setScanCount(nextCount);
          const timeStr = new Date().toLocaleTimeString();

          setLastScanInfo({
            count: nextCount,
            time: timeStr,
            domain: res.hostname,
            score: res.trustScore,
            verdict: res.verdict
          });

          // Vibrant pop-up notification on every single scan
          setScanToast({
            id: nextCount,
            message: `Scan #${nextCount} Verified: ${res.hostname}`,
            domain: res.hostname,
            score: res.trustScore,
            verdict: res.verdict,
            time: timeStr
          });

          // Auto-dismiss scan toast after 4s
          setTimeout(() => {
            setScanToast((curr) => (curr?.id === nextCount ? null : curr));
          }, 4000);
        } catch (err: any) {
          setErrorMessage(err.message || "Invalid URL format. Please check the link.");
          setScanning(false);
        }
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze URL.");
      setScanning(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = `TrustLens Security Audit Report\nURL: ${report.normalizedUrl}\nVerdict: ${report.verdict}\nTrust Score: ${report.trustScore}/100\nPhish Risk: ${(report.phishProbability * 100).toFixed(1)}%\nHostname: ${report.hostname}\nReasons:\n${report.reasons.map(r => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.plainText}`).join("\n")}`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotice("Report copied to clipboard.");
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTrust = () => {
    if (report && onAddAllow) {
      onAddAllow(report.hostname);
      setActionModal({
        isOpen: true,
        actionType: "trust",
        domain: report.hostname
      });
    }
  };

  const handleBlock = () => {
    if (report && onAddDeny) {
      onAddDeny(report.hostname);
      setActionModal({
        isOpen: true,
        actionType: "block",
        domain: report.hostname
      });
    }
  };

  const handleResetAndScanNew = () => {
    setActionModal(null);
    setInputUrl("");
    setReport(null);
    setErrorMessage(null);
    setScanToast(null);
    setTimeout(() => {
      inputRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 60);
  };

  const handleViewUpdatedReport = () => {
    const domain = actionModal?.domain;
    setActionModal(null);
    if (domain) {
      handleScan(domain);
    } else if (report) {
      handleScan(report.rawInput || report.normalizedUrl);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isDark
          ? "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 text-slate-100 shadow-xl shadow-black/40"
          : "border-slate-200 bg-gradient-to-b from-white to-slate-50/80 text-slate-800 shadow-lg shadow-slate-200/50"
      } p-4 sm:p-8`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-700/20">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`p-2 rounded-xl border ${
                isDark
                  ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-400"
                  : "bg-blue-50 border-blue-200 text-blue-600"
              }`}
            >
              <Search className="w-5 h-5" />
            </span>
            <h2 className={`text-xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Website Link Security Scanner
            </h2>
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? "text-slate-300 font-medium" : "text-slate-500"}`}>
            Check any website URL or link instantly to detect phishing, spoofing, and malicious traps.
          </p>
        </div>

        {notification && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-fade-in self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Every-Scan Live Result Notification Popup Toast */}
      {scanToast && (
        <div
          className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] max-w-sm w-[calc(100vw-2rem)] rounded-2xl border-2 p-3.5 shadow-2xl animate-fade-in flex items-center justify-between gap-3 ${
            isDark
              ? "bg-[#0c1427] border-cyan-500/80 text-white shadow-cyan-950/60"
              : "bg-white border-blue-500 text-slate-900 shadow-xl"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                scanToast.verdict === "Safe"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : scanToast.verdict === "Dangerous"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                    isDark
                      ? "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  Scan #{scanToast.id} Verified
                </span>
                <span className={`text-[10px] font-mono ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {scanToast.time}
                </span>
              </div>
              <p className="text-xs font-bold truncate mt-0.5">{scanToast.domain}</p>
              <p className={`text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Trust Score:{" "}
                <span
                  className={`font-mono font-black ${
                    scanToast.score >= 75
                      ? "text-emerald-500"
                      : scanToast.score < 40
                      ? "text-red-500"
                      : "text-amber-500"
                  }`}
                >
                  {scanToast.score}/100
                </span>{" "}
                • Verdict: <span className="font-bold">{scanToast.verdict}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScanToast(null)}
            className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
              isDark
                ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                : "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Confirmation Modal (for Trust and Block Buttons) */}
      {actionModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`relative w-full max-w-md rounded-3xl border-2 p-6 shadow-2xl transition-all ${
              actionModal.actionType === "block"
                ? isDark
                  ? "bg-[#0f172a] border-red-500/70 shadow-red-950/60 text-white"
                  : "bg-white border-red-500 shadow-xl text-slate-950"
                : isDark
                ? "bg-[#0f172a] border-emerald-500/70 shadow-emerald-950/60 text-white"
                : "bg-white border-emerald-500 shadow-xl text-slate-950"
            }`}
          >
            {/* Close X */}
            <button
              type="button"
              onClick={() => setActionModal(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-xl border transition-colors ${
                isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                  : "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`p-4 rounded-2xl border-2 shadow-lg ${
                  actionModal.actionType === "block"
                    ? isDark
                      ? "bg-red-950/60 border-red-500 text-red-400 shadow-red-950/50"
                      : "bg-red-50 border-red-400 text-red-600 shadow-red-100"
                    : isDark
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-emerald-950/50"
                    : "bg-emerald-50 border-emerald-400 text-emerald-600 shadow-emerald-100"
                }`}
              >
                {actionModal.actionType === "block" ? (
                  <ShieldBan className="w-10 h-10 animate-bounce" />
                ) : (
                  <ShieldCheck className="w-10 h-10 animate-bounce" />
                )}
              </div>

              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    actionModal.actionType === "block"
                      ? "bg-red-950/80 border-red-500/40 text-red-300"
                      : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  {actionModal.actionType === "block" ? "Security Rule Enforced" : "Exemption Activated"}
                </span>
                <h3 className="text-xl font-black mt-1.5 tracking-tight">
                  {actionModal.actionType === "block"
                    ? "Domain Blocked Successfully!"
                    : "Domain Added to Trusted List!"}
                </h3>
              </div>

              {/* Domain pill */}
              <div
                className={`w-full p-3 rounded-xl border font-mono text-xs font-bold break-all ${
                  isDark ? "bg-slate-950 border-slate-800 text-cyan-300" : "bg-slate-50 border-slate-300 text-blue-900"
                }`}
              >
                {actionModal.domain}
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                {actionModal.actionType === "block"
                  ? "This website is now permanently blocked. All navigation will be intercepted with a zero trust score (Dangerous)."
                  : "This website has been added to your trusted allowlist and will bypass automatic security warnings."}
              </p>

              {/* User Action Buttons */}
              <div className="w-full pt-3 space-y-2.5">
                {/* Button 1: Scan New Link (Direct requirement from user) */}
                <button
                  type="button"
                  onClick={handleResetAndScanNew}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
                    isDark
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-950/50"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Scan Another Link / Naya Link Daalein</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Button 2: View Updated Report */}
                <button
                  type="button"
                  onClick={handleViewUpdatedReport}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                    isDark
                      ? "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                      : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>View Updated Security Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Search Input Form */}
      <div className="mt-6 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="relative flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Globe className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-slate-400"}`} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste or type website URL (e.g. https://paypal-security-update.xyz or google.com)..."
              className={`w-full pl-10 pr-20 sm:pr-24 py-3 rounded-xl text-xs sm:text-sm font-mono border transition-all focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-slate-950 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-cyan-500/30"
                  : "bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white"
              }`}
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => {
                  setInputUrl("");
                  setReport(null);
                  setErrorMessage(null);
                }}
                className={`absolute inset-y-0 right-2 my-auto px-2 h-7 text-xs font-medium rounded-lg transition-colors ${
                  isDark ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={scanning}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 w-full sm:w-auto ${
              isDark
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-950/40"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20"
            }`}
          >
            {scanning ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Check Link</span>
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Test Links */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <Sparkles className="w-3 h-3 text-cyan-500" />
            Quick Test:
          </span>
          {SAMPLE_TESTS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => {
                setInputUrl(sample.url);
                handleScan(sample.url);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                sample.type === "safe"
                  ? isDark
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : sample.type === "danger"
                  ? isDark
                    ? "bg-red-950/30 border-red-500/30 text-red-400 hover:bg-red-900/40"
                    : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  : isDark
                  ? "bg-amber-950/30 border-amber-500/30 text-amber-400 hover:bg-amber-900/40"
                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <span>{sample.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Results Display */}
      {report && (
        <div className="mt-8 space-y-6 pt-6 border-t border-slate-700/20 animate-fade-in">
          {/* Main Verdict & Gauge Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
              report.verdict === "Safe"
                ? isDark
                  ? "border-emerald-900/40 bg-emerald-950/15"
                  : "border-emerald-200 bg-emerald-50/60"
                : report.verdict === "Dangerous"
                ? isDark
                  ? "border-red-900/50 bg-red-950/20"
                  : "border-red-200 bg-red-50/70"
                : isDark
                ? "border-amber-900/40 bg-amber-950/15"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            {/* Left Verdict Details */}
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    report.verdict === "Safe"
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : report.verdict === "Dangerous"
                      ? "bg-red-500/20 border-red-500/40 text-red-400"
                      : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  }`}
                >
                  Verdict: {report.verdict}
                </span>

                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                    isDark ? "bg-slate-800/90 border-slate-700 text-slate-100 shadow-sm" : "bg-slate-200 border-slate-300 text-slate-800"
                  }`}
                >
                  Risk: {(report.phishProbability * 100).toFixed(1)}%
                </span>

                {/* Live Fresh Scan Indicator Badge */}
                {lastScanInfo && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border animate-pulse ${
                      isDark
                        ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300"
                        : "bg-blue-100 border-blue-300 text-blue-900"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Scan #{lastScanInfo.count} Verified • {lastScanInfo.time}</span>
                  </span>
                )}
              </div>

              <h3 className={`text-xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                {report.verdict === "Safe"
                  ? "This website link appears Safe to visit."
                  : report.verdict === "Dangerous"
                  ? "High-Risk Threat: Dangerous Phishing Detected!"
                  : report.verdict === "Suspicious"
                  ? "Suspicious Website: Exercise Caution"
                  : "Caution: Unknown or anomalous website signals"}
              </h3>

              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-mono break-all pt-1">
                <span className={isDark ? "text-slate-300 font-medium" : "text-slate-500"}>Scanned URL:</span>
                <span className={`font-semibold underline ${isDark ? "text-cyan-300" : "text-blue-700"}`}>
                  {report.normalizedUrl}
                </span>
              </div>

              <p className={`text-xs leading-relaxed max-w-xl font-normal ${isDark ? "text-slate-200" : "text-slate-600"}`}>
                {report.verdict === "Safe"
                  ? "The link matched established benign reputation profiles and exhibited no malicious brand spoofing, typosquatting, or obfuscation tricks."
                  : report.verdict === "Dangerous"
                  ? "Do NOT enter passwords, credit cards, or login credentials on this website. It contains structural signals strongly indicative of phishing scams."
                  : "This link exhibits structural or domain anomalies. Verify the sender before providing sensitive data."}
              </p>
            </div>

            {/* Right Gauge */}
            <div className="shrink-0 flex flex-col items-center">
              <ScoreGauge
                score={report.trustScore}
                verdict={report.verdict}
                size={130}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Key Security Signal Indicators */}
          <div>
            <h4 className={`text-xs font-black uppercase tracking-wider mb-3 ${isDark ? "text-slate-300" : "text-slate-900"}`}>
              Security Signals Breakdown
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Signal 1: Protocol */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.isHttps
                    ? isDark
                      ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                      : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                    : isDark
                    ? "border-red-900/40 bg-red-950/20 text-red-300"
                    : "border-red-300 bg-red-50 text-red-950 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {report.signals.isHttps ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>HTTPS</span>
                </div>
                <span className="text-[11px] block font-bold truncate">
                  {report.signals.isHttps ? "Secure SSL" : "Unencrypted"}
                </span>
              </div>

              {/* Signal 2: Global Reputation */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.isTrancoTop
                    ? isDark
                      ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                      : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                    : isDark
                    ? "border-slate-800 bg-slate-900/60 text-slate-300"
                    : "border-slate-300 bg-slate-100 text-slate-900 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Rank</span>
                </div>
                <span className="text-[11px] block font-bold truncate">
                  {report.signals.isTrancoTop ? "Verified Top 10K" : "Standard Domain"}
                </span>
              </div>

              {/* Signal 3: Brand Spoof */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.minTyposquatDist <= 2 || report.signals.brandInSubdomain || report.signals.brandInPath
                    ? isDark
                      ? "border-red-900/40 bg-red-950/20 text-red-300"
                      : "border-red-300 bg-red-50 text-red-950 shadow-sm"
                    : isDark
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Brand Spoof</span>
                </div>
                <span className="text-[11px] block font-bold truncate">
                  {report.signals.matchedBrand
                    ? `Targets ${report.signals.matchedBrand}`
                    : "No Spoofing"}
                </span>
              </div>

              {/* Signal 4: TLD Safety */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.suspiciousTld
                    ? isDark
                      ? "border-amber-900/40 bg-amber-950/20 text-amber-300"
                      : "border-amber-300 bg-amber-50 text-amber-950 shadow-sm"
                    : isDark
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>TLD Safety</span>
                </div>
                <span className="text-[11px] block font-bold truncate">
                  {report.signals.suspiciousTld ? `High Risk (.${report.tld})` : `Standard (.${report.tld})`}
                </span>
              </div>

              {/* Signal 5: IP Host / Port */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.isIpHost || report.signals.portAnomaly
                    ? isDark
                      ? "border-red-900/40 bg-red-950/20 text-red-300"
                      : "border-red-300 bg-red-50 text-red-950 shadow-sm"
                    : isDark
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Host & Port</span>
                </div>
                <span className="text-[11px] block font-bold truncate">
                  {report.signals.isIpHost ? "Raw IP Host" : report.signals.portAnomaly ? "Custom Port" : "Standard Port"}
                </span>
              </div>

              {/* Signal 6: Entropy */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold ${
                  report.signals.entropyDomain > 3.8
                    ? isDark
                      ? "border-amber-900/40 bg-amber-950/20 text-amber-300"
                      : "border-amber-300 bg-amber-50 text-amber-950 shadow-sm"
                    : isDark
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-300"
                    : "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entropy</span>
                </div>
                <span className="text-[11px] block font-bold">
                  {report.signals.entropyDomain} (bits)
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Reason Cards */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Security Assessment Evidence ({report.reasons.length})
            </h4>

            {report.reasons.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.reasons.map((r) => (
                  <ReasonCard key={r.id} reason={r} isDark={isDark} />
                ))}
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border text-xs ${
                  isDark ? "border-slate-800 bg-slate-900/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                No malicious heuristic signals or brand impersonation detected for this link.
              </div>
            )}
          </div>

          {/* Action Toolbar (Responsive for Mobile & Desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-700/20">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {onAddAllow && (
                <button
                  type="button"
                  onClick={handleTrust}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDark
                      ? "border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300"
                      : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Trust This Domain</span>
                </button>
              )}

              {onAddDeny && (
                <button
                  type="button"
                  onClick={handleBlock}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDark
                      ? "border-red-800/80 bg-red-950/40 hover:bg-red-900/60 text-red-300"
                      : "border-red-300 bg-red-50 hover:bg-red-100 text-red-800"
                  }`}
                >
                  <ShieldBan className="w-3.5 h-3.5 text-red-500" />
                  <span>Block Domain</span>
                </button>
              )}

              {/* Reset & Scan New Link */}
              <button
                type="button"
                onClick={handleResetAndScanNew}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isDark
                    ? "border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300"
                    : "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Scan New Link</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyReport}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition-colors w-full sm:w-auto ${
                isDark
                  ? "border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Report Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
