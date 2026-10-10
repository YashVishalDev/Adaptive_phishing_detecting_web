import React from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Eye,
  Lock,
  Globe,
  Server,
  Sliders,
  Users,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  FileCode,
  Info
} from "lucide-react";

import { LOGO_IMAGE_DATA } from "../assets/embedded-images";

const logoImg = LOGO_IMAGE_DATA;

interface AboutTrustLensProps {
  isDark: boolean;
  onNavigateToDevelopers?: () => void;
  onNavigateToScanner?: () => void;
}

export const AboutTrustLens: React.FC<AboutTrustLensProps> = ({
  isDark,
  onNavigateToDevelopers,
  onNavigateToScanner
}) => {
  const KEY_FEATURES = [
    {
      title: "Phishing URL Detection",
      desc: "Identify URLs with potentially suspicious patterns, deceptive credential-stealing keywords, and anomalous path depths before interaction.",
      icon: ShieldAlert,
      badge: "Threat Flagging",
      accent: "from-cyan-500/20 to-blue-600/20"
    },
    {
      title: "Website Trust Analysis",
      desc: "Evaluate available URL signals, verified traffic reputation indices, and protocol characteristics to estimate potential risk with an intuitive score.",
      icon: ActivityIcon,
      badge: "Risk Estimation",
      accent: "from-blue-500/20 to-indigo-600/20"
    },
    {
      title: "Typosquatting Detection",
      desc: "Flag domain names that imitate legitimate websites through subtle character substitutions, deceptive brand mimicry, and homoglyphs.",
      icon: FileCode,
      badge: "Brand Safety",
      accent: "from-amber-500/20 to-red-600/20"
    },
    {
      title: "IP-Based URL Checks",
      desc: "Highlight URLs that use raw IP addresses instead of registered domain names, a prevalent evasion tactic in malicious phishing hosting.",
      icon: Server,
      badge: "Host Inspection",
      accent: "from-emerald-500/20 to-cyan-600/20"
    },
    {
      title: "Custom Security Rules",
      desc: "Allow users to manage trusted and blocked domains, granting granular personal control over browser-level override decisions.",
      icon: Sliders,
      badge: "Domain Rules",
      accent: "from-purple-500/20 to-blue-600/20"
    },
    {
      title: "Privacy-Focused Design",
      desc: "Aim to minimize unnecessary data sharing. Zero-egress architecture ensures that URL inspection logic executes entirely on your device.",
      icon: Lock,
      badge: "Zero-Egress",
      accent: "from-cyan-500/20 to-teal-600/20"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 transition-all ${
          isDark
            ? "border-cyan-500/30 bg-gradient-to-br from-[#0c1427] via-[#0A0E17] to-slate-950 text-white shadow-2xl shadow-cyan-950/20"
            : "border-slate-300 bg-gradient-to-br from-white via-cyan-50/40 to-blue-50/60 text-slate-900 shadow-xl shadow-slate-200/80"
        }`}
      >
        {/* Ambient Cyan/Navy Radial Glows */}
        <div
          className={`absolute -right-24 -top-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-25 ${
            isDark ? "bg-cyan-500" : "bg-blue-400"
          }`}
        />
        <div
          className={`absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
            isDark ? "bg-blue-600" : "bg-cyan-300"
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
          <div className="flex-1 text-center lg:text-left space-y-4">
            {/* Pill badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                    : "bg-blue-100 border-blue-300 text-blue-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Cybersecurity Project
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                  isDark
                    ? "bg-slate-900/90 border-slate-700 text-slate-300"
                    : "bg-white border-slate-300 text-slate-700"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Team Code Warriors
              </span>
            </div>

            {/* Title & Tagline */}
            <div>
              <h1 className={`text-3xl sm:text-5xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                TrustLens
              </h1>
              <p
                className={`text-lg sm:text-xl font-bold mt-1 tracking-tight ${
                  isDark ? "text-cyan-400" : "text-blue-700"
                }`}
              >
                “See the Risk. Browse with Trust.”
              </p>
            </div>

            {/* Concise Mission-Driven Intro */}
            <p
              className={`text-sm sm:text-base leading-relaxed max-w-2xl ${
                isDark ? "text-slate-300" : "text-slate-700 font-medium"
              }`}
            >
              TrustLens is a cybersecurity project designed to help users identify potentially suspicious
              websites and phishing URLs before interacting with them. It analyzes URL patterns and
              available security signals to highlight potential risks and provide users with understandable warnings.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              {onNavigateToScanner && (
                <button
                  type="button"
                  onClick={onNavigateToScanner}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 ${
                    isDark
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-950/50"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Launch Link Scanner</span>
                </button>
              )}

              {onNavigateToDevelopers && (
                <button
                  type="button"
                  onClick={onNavigateToDevelopers}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isDark
                      ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
                      : "border-slate-300 bg-white hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Meet Team Code Warriors</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Logo Brand Emblem */}
          <div className="relative group shrink-0">
            <div
              className={`absolute -inset-2 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition duration-500 ${
                isDark ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gradient-to-r from-blue-500 to-cyan-500"
              }`}
            />
            <div
              className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl p-2 border overflow-hidden flex flex-col items-center justify-center ${
                isDark
                  ? "bg-slate-950/90 border-cyan-500/50 shadow-2xl shadow-cyan-950/60"
                  : "bg-white border-blue-300 shadow-xl"
              }`}
            >
              <img
                src={logoImg}
                alt="TrustLens Cyber Eagle Logo"
                className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                loading="eager"
                decoding="sync"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision Dual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Our Mission */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
            isDark
              ? "border-cyan-500/30 bg-gradient-to-b from-[#0e172a] to-[#0a0e17] text-white shadow-xl shadow-cyan-950/15"
              : "border-slate-300 bg-white text-slate-900 shadow-lg shadow-slate-200/70"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                    : "bg-blue-100 border-blue-300 text-blue-900"
                }`}
              >
                Our Purpose
              </span>
              <Target className={`w-5 h-5 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
            </div>

            <div className="space-y-2">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                Our Mission
              </h2>
              <p
                className={`text-sm sm:text-base leading-relaxed ${
                  isDark ? "text-slate-300" : "text-slate-700 font-medium"
                }`}
              >
                Our mission is to make browsing safer by helping users recognize suspicious links,
                understand potential online threats, and make informed decisions before visiting a website.
              </p>
            </div>
          </div>

          <div
            className={`mt-6 pt-4 border-t flex flex-wrap gap-2 text-xs font-semibold ${
              isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Recognize Links
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Understand Threats
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Informed Decisions
            </span>
          </div>
        </div>

        {/* Our Vision */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
            isDark
              ? "border-blue-500/30 bg-gradient-to-b from-[#0e172a] to-[#0a0e17] text-white shadow-xl shadow-blue-950/15"
              : "border-slate-300 bg-white text-slate-900 shadow-lg shadow-slate-200/70"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                  isDark
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-300"
                    : "bg-indigo-100 border-indigo-300 text-indigo-900"
                }`}
              >
                Our Outlook
              </span>
              <Eye className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-indigo-600"}`} />
            </div>

            <div className="space-y-2">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                Our Vision
              </h2>
              <p
                className={`text-sm sm:text-base leading-relaxed ${
                  isDark ? "text-slate-300" : "text-slate-700 font-medium"
                }`}
              >
                To make cybersecurity easier to understand and accessible to everyone.
              </p>
            </div>
          </div>

          <div
            className={`mt-6 pt-4 border-t flex flex-wrap gap-2 text-xs font-semibold ${
              isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-600"
            }`}
          >
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Simple Explanations
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Zero Steep Learning Curve
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Universal Protection
            </span>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-lg border ${
                  isDark ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-400" : "bg-blue-100 border-blue-300 text-blue-700"
                }`}
              >
                <Layers className="w-4 h-4" />
              </span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                Key Features
              </h2>
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Six specialized cybersecurity defense mechanisms embedded directly in TrustLens.
            </p>
          </div>
          <span
            className={`text-xs font-mono font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
              isDark ? "bg-slate-900 border-slate-700 text-cyan-400" : "bg-slate-100 border-slate-300 text-blue-800"
            }`}
          >
            6 Security Vectors
          </span>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {KEY_FEATURES.map((feat) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={feat.title}
                className={`group rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
                  isDark
                    ? "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 hover:border-cyan-500/50 text-slate-100 shadow-md shadow-black/40 hover:shadow-cyan-950/20"
                    : "border-slate-300 bg-white hover:border-blue-400 text-slate-900 shadow-md shadow-slate-200/60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isDark
                          ? "bg-slate-950 border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400"
                          : "bg-blue-50 border-blue-200 text-blue-600 group-hover:border-blue-400"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-slate-300"
                          : "bg-slate-100 border-slate-300 text-slate-700"
                      }`}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-base font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                      {feat.title}
                    </h3>
                    <p
                      className={`text-xs mt-2 leading-relaxed ${
                        isDark ? "text-slate-300" : "text-slate-600 font-medium"
                      }`}
                    >
                      {feat.desc}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-bold ${
                    isDark ? "border-slate-800/80 text-cyan-400" : "border-slate-200 text-blue-700"
                  }`}
                >
                  <span>Active Defense Signal</span>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Our Team Section */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 transition-all ${
          isDark
            ? "border-slate-800 bg-gradient-to-b from-[#0c1427] to-slate-950 text-white shadow-xl shadow-cyan-950/20"
            : "border-slate-300 bg-white text-slate-900 shadow-xl shadow-slate-200/70"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                    : "bg-blue-100 border-blue-300 text-blue-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Our Team
              </span>

              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
                }`}
              >
                BCA Students (Semester 1st)
              </span>
            </div>

            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Team Code Warriors
            </h2>

            <p
              className={`text-sm sm:text-base leading-relaxed max-w-2xl ${
                isDark ? "text-slate-300" : "text-slate-700 font-medium"
              }`}
            >
              Team Code Warriors is a student team passionate about cybersecurity, web security,
              and building practical solutions to real-world digital safety problems.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1 text-xs">
              <div
                className={`px-3 py-1.5 rounded-xl border font-bold ${
                  isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              >
                <strong>Yash Vishal</strong> • Full Stack Developer & Architect
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl border font-bold ${
                  isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}
              >
                <strong>Dipanshu Kumar</strong> • Logo Designer & Backend Developer
              </div>
            </div>
          </div>

          {onNavigateToDevelopers && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={onNavigateToDevelopers}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 ${
                  isDark
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-950/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>View Full Developer Profiles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transparent Security Guidance & Disclaimer */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all ${
          isDark
            ? "border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-950 to-amber-950/10 text-slate-200 shadow-md"
            : "border-amber-300 bg-amber-50/70 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
              isDark
                ? "border-amber-500/40 bg-amber-950/40 text-amber-400"
                : "border-amber-300 bg-amber-100 text-amber-700"
            }`}
          >
            <Info className="w-5 h-5" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-black tracking-tight ${isDark ? "text-amber-300" : "text-amber-900"}`}>
                Responsible Cybersecurity Guidance & Disclaimer
              </h3>
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isDark ? "bg-amber-950 border-amber-600/40 text-amber-400" : "bg-amber-200 border-amber-400 text-amber-900"
                }`}
              >
                Risk Indicators
              </span>
            </div>

            <p
              className={`text-xs leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-700 font-medium"
              }`}
            >
              TrustLens provides automated risk indicators and heuristic security analysis to assist users in
              identifying potentially hazardous links. However, no automated cybersecurity detection system can
              guarantee that every website is safe. We encourage users to maintain vigilant browsing practices,
              verify link senders independently, and never submit sensitive credentials on unverified websites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon helper to prevent missing Lucide export
function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
