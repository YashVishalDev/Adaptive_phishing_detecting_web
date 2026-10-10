import React, { useState } from "react";
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
  CheckCircle2
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

  const scanner = new UrlScanner();

  const handleScan = (targetUrl?: string) => {
    const raw = (targetUrl !== undefined ? targetUrl : inputUrl).trim();
    if (!raw) {
      setErrorMessage("Please enter or paste a website link to check.");
      return;
    }

    setErrorMessage(null);
    setScanning(true);

    try {
      // Simulate micro-delay for responsive scan feel
      setTimeout(() => {
        try {
          const res = scanner.scan(raw, sensitivity);
          setReport(res);
          setScanning(false);
        } catch (err: any) {
          setErrorMessage(err.message || "Invalid URL format. Please check the link.");
          setScanning(false);
        }
      }, 150);
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
      showNotice(`Added ${report.hostname} to Trusted domains.`);
    }
  };

  const handleBlock = () => {
    if (report && onAddDeny) {
      onAddDeny(report.hostname);
      showNotice(`Added ${report.hostname} to Blocked domains.`);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isDark
          ? "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 text-slate-100 shadow-xl shadow-black/40"
          : "border-slate-200 bg-gradient-to-b from-white to-slate-50/80 text-slate-800 shadow-lg shadow-slate-200/50"
      } p-6 sm:p-8`}
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
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Paste or type website URL (e.g. https://paypal-security-update.xyz or google.com)..."
              className={`w-full pl-10 pr-24 py-3 rounded-xl text-sm font-mono border transition-all focus:outline-none focus:ring-2 ${
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
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 ${
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

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/20">
            <div className="flex items-center gap-2">
              {onAddAllow && (
                <button
                  type="button"
                  onClick={handleTrust}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDark
                      ? "border-red-800/80 bg-red-950/40 hover:bg-red-900/60 text-red-300"
                      : "border-red-300 bg-red-50 hover:bg-red-100 text-red-800"
                  }`}
                >
                  <ShieldBan className="w-3.5 h-3.5 text-red-500" />
                  <span>Block Domain</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyReport}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
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
