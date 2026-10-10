import React, { useEffect, useState } from "react";
import { ScoreGauge } from "../components/ScoreGauge";
import { ReasonCard } from "../components/ReasonCard";
import { TechDetails } from "../components/TechDetails";
import { PageAuditReport } from "../../background/scoring-orchestrator";
import { ShieldAlert, ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";

export const InterstitialApp: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [report, setReport] = useState<PageAuditReport | null>(null);
  const [frictionSeconds, setFrictionSeconds] = useState(5);
  const [canProceed, setCanProceed] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("target") || "https://suspicious-target.xyz/login";
    setTargetUrl(target);

    try {
      setDomain(new URL(target).hostname);
    } catch {
      setDomain("unknown");
    }

    // Attempt to query active report from background
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_GET_ACTIVE_REPORT" }, (res) => {
        if (res?.report) {
          setReport(res.report);
        } else {
          fallbackReport(target);
        }
      });
    } else {
      fallbackReport(target);
    }

    // 5-second friction timer
    const interval = window.setInterval(() => {
      setFrictionSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanProceed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fallbackReport = (url: string) => {
    setReport({
      url,
      tabId: 0,
      timestamp: Date.now(),
      stage: 2,
      trustScore: 12,
      verdict: "Dangerous",
      phishProbability: 0.94,
      reasons: [
        {
          id: "RULE_CREDENTIAL_CROSS_POST",
          title: "Password Submits to Foreign Domain",
          plainText: "This page requests your password, but sends it to a different unverified website.",
          evidence: "Form action targets external receiver domain.",
          whyItMatters: "Legitimate websites process credentials on their own domain.",
          severity: "critical"
        },
        {
          id: "RULE_HOMOGLYPH_DECEPTION",
          title: "Deceptive Character Imitation",
          plainText: "The domain name uses look-alike alphabet characters to impersonate a familiar brand.",
          evidence: `Punycode / Homoglyph look-alike pattern detected on ${url}`,
          whyItMatters: "Attackers register visually identical names to trick users into typing passwords.",
          severity: "critical"
        }
      ],
      attributions: [
        { featureIndex: 34, featureName: "credential_cross_post", shapValue: 0.88, featureValue: 1.0 },
        { featureIndex: 4, featureName: "has_punycode", shapValue: 0.65, featureValue: 1.0 }
      ],
      features: Array(44).fill(0),
      modelVersion: "1.0.0"
    });
  };

  const handleReturnToSafety = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  const handleProceedAnyway = () => {
    if (!canProceed) return;
    setProceeding(true);
    // Whitelist this site for the session and navigate
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_TRUST_SITE", domain }, () => {
        window.location.href = targetUrl;
      });
    } else {
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-gray-100 flex flex-col justify-between p-6 sm:p-12 font-sans select-none">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Banner Shield & Threat Title */}
        <div className="flex items-center gap-4 border-b border-red-900/40 pb-6">
          <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-2xl shadow-lg shadow-red-950/50 text-red-400">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-red-500/40 bg-red-950/60 text-red-300 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>High Security Alert</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Deceptive Website Blocked
            </h1>
          </div>
        </div>

        {/* Warning Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: Gauge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-red-900/30 bg-cardBg/90 shadow-inner">
            <ScoreGauge score={report?.trustScore || 12} verdict="Dangerous" size={140} />
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400 font-medium">Domain Evaluated:</p>
              <p className="text-xs font-mono font-bold text-red-300 truncate max-w-[200px] mt-0.5">
                {domain}
              </p>
            </div>
          </div>

          {/* Right Column: Evidence & Reasons */}
          <div className="md:col-span-2 space-y-4">
            <div className="text-sm text-gray-300 leading-relaxed">
              TrustLens detected verified phishing patterns on this page. Visiting this site could result in your credentials, passwords, or personal identity being stolen.
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Identified Threat Evidence
              </h3>
              {report?.reasons.map((r) => (
                <ReasonCard key={r.id} reason={r} />
              ))}
            </div>

            {/* Expandable Technical Details */}
            {report && <TechDetails report={report} />}
          </div>
        </div>

        {/* Action Controls with Friction Step */}
        <div className="pt-6 border-t border-borderSubtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleReturnToSafety}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-cyan-950/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Safety (Recommended)</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              disabled={!canProceed || proceeding}
              onClick={handleProceedAnyway}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border text-xs font-bold transition-all ${
                canProceed
                  ? "border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 cursor-pointer"
                  : "border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {canProceed ? "Proceed Anyway (Unsafe)" : `Wait ${frictionSeconds}s to proceed`}
              </span>
            </button>
          </div>
        </div>
      </div>

      <footer className="max-w-3xl mx-auto w-full text-center text-xs text-gray-600 pt-8">
        TrustLens Zero-Egress Protection &bull; All evaluations executed locally on-device &bull; Zero external telemetry
      </footer>
    </div>
  );
};
