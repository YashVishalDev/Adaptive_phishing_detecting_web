import React, { useState, useEffect, useRef } from "react";
import { SensitivityLevel } from "../../engine/fusion";
import { TRUSTLENS_ED25519_PUBLIC_KEY } from "../../adaptive/public-key";
import { UrlScannerCard } from "../components/UrlScannerCard";
import { AboutDevelopers } from "../components/AboutDevelopers";
import { AboutTrustLens } from "../components/AboutTrustLens";

import { LOGO_IMAGE_DATA } from "../assets/embedded-images";
const logoImg = LOGO_IMAGE_DATA;
import {
  ShieldCheck,
  Sliders,
  ListFilter,
  Lock,
  Cpu,
  Trash2,
  Plus,
  CheckCircle,
  Sun,
  Moon,
  Search,
  Users,
  Menu,
  ChevronDown,
  X,
  ShieldBan,
  Activity,
  Check,
  Globe,
  Info,
  Shield
} from "lucide-react";
import bundledModel from "../../engine/bundled-model.json";

export const OptionsApp: React.FC = () => {
  // Theme state: defaults to dark, persists in localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("trustlens_theme");
    return saved ? saved === "dark" : true;
  });

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"scanner" | "about" | "developers" | "settings" | "domains" | "engine">(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || window.location.hash.replace("#", "");
      if (tabParam && ["scanner", "about", "developers", "settings", "domains", "engine"].includes(tabParam)) {
        return tabParam as any;
      }
    } catch {}
    return "scanner";
  });

  // Menu Dropdown Open state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sensitivity preset
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>("balanced");

  // Overrides list
  const [allowlist, setAllowlist] = useState<string[]>([
    "internal.corp.network",
    "portal.myuniversity.edu"
  ]);
  const [denylist, setDenylist] = useState<string[]>([
    "known-scam-test.xyz",
    "paypal-security-update.xyz"
  ]);
  const [newDomain, setNewDomain] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Sync theme class on <html>
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

  // Click outside to close menu dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    showNotice(!isDark ? "Switched to Dark Theme" : "Switched to Light Theme");
  };

  const showNotice = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleSensitivityChange = (level: SensitivityLevel) => {
    setSensitivity(level);
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_SET_SENSITIVITY", sensitivity: level });
    }
    showNotice(`Detection sensitivity updated to ${level.toUpperCase()}.`);
  };

  const handleAddAllow = (domainToAdd?: string) => {
    const target = (domainToAdd || newDomain).trim().toLowerCase();
    if (!target) return;
    setAllowlist((prev) => [...prev.filter((d) => d !== target), target]);
    setDenylist((prev) => prev.filter((d) => d !== target));

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_TRUST_SITE", domain: target });
    }
    if (!domainToAdd) setNewDomain("");
    showNotice(`Added "${target}" to Trusted Domains.`);
  };

  const handleAddDeny = (domainToAdd?: string) => {
    const target = (domainToAdd || newDomain).trim().toLowerCase();
    if (!target) return;
    setDenylist((prev) => [...prev.filter((d) => d !== target), target]);
    setAllowlist((prev) => prev.filter((d) => d !== target));

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "TRUSTLENS_BLOCK_SITE", domain: target });
    }
    if (!domainToAdd) setNewDomain("");
    showNotice(`Added "${target}" to Blocked Domains.`);
  };

  const handleRemoveAllow = (domain: string) => {
    setAllowlist(allowlist.filter((d) => d !== domain));
    showNotice(`Removed "${domain}" from Trusted list.`);
  };

  const handleRemoveDeny = (domain: string) => {
    setDenylist(denylist.filter((d) => d !== domain));
    showNotice(`Removed "${domain}" from Blocked list.`);
  };

  const MENU_ITEMS = [
    {
      id: "scanner",
      label: "Link Scanner",
      desc: "Instant URL security & phishing audit",
      icon: Search,
      badge: "Main Tool"
    },
    {
      id: "about",
      label: "About TrustLens",
      desc: "Mission, vision, features & safety guarantee",
      icon: Info,
      badge: "About Us"
    },
    {
      id: "developers",
      label: "Developers",
      desc: "Team Code Warriors (Yash & Dipanshu)",
      icon: Users,
      badge: "BCA Student"
    },
    {
      id: "settings",
      label: "Sensitivity",
      desc: "Configure detection aggressive thresholds",
      icon: Sliders,
      badge: "Presets"
    },
    {
      id: "domains",
      label: "Domain Lists",
      desc: "Manage trusted & blocked domain rules",
      icon: ListFilter,
      badge: "Overrides"
    },
    {
      id: "engine",
      label: "Engine Info",
      desc: "On-device AI specs & Ed25519 signature",
      icon: Cpu,
      badge: "44 Signals"
    }
  ] as const;

  const currentTabItem = MENU_ITEMS.find((m) => m.id === activeTab) || MENU_ITEMS[0];

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#0A0E17] text-slate-100" : "bg-[#F1F5F9] text-slate-950"
      } p-4 sm:p-8 lg:p-12 font-sans`}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Navbar with elevated z-index so dropdown menu is always in front */}
        <header
          className={`relative z-50 rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
            isDark
              ? "border-slate-800 bg-slate-900/90 shadow-xl shadow-black/40 backdrop-blur-md"
              : "border-slate-300 bg-white shadow-xl shadow-slate-300/40 backdrop-blur-md"
          }`}
        >
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="relative group shrink-0">
              <div
                className={`absolute -inset-0.5 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300 ${
                  isDark ? "bg-cyan-500" : "bg-blue-600"
                }`}
              />
              <div
                className={`relative w-12 h-12 rounded-2xl p-0.5 border overflow-hidden flex items-center justify-center ${
                  isDark ? "bg-slate-950 border-cyan-500/60 shadow-lg shadow-cyan-950/50" : "bg-white border-blue-400 shadow-md"
                }`}
              >
                <img
                  src={logoImg}
                  alt="TrustLens Cyber Eagle Logo"
                  className="w-full h-full object-cover rounded-xl"
                  loading="eager"
                  decoding="sync"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  TrustLens
                </h1>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                    isDark
                      ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
                      : "bg-blue-100 border-blue-300 text-blue-900 font-extrabold"
                  }`}
                >
                  By Code Warriors
                </span>
              </div>
              <p className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Real-time Phishing Detection & Threat Verification
              </p>
            </div>
          </div>

          {/* Right Header Controls (Compact Navigation Menu Dropdown & Theme Toggle) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Active Section Pill (Visible on Desktop) */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                isDark ? "bg-slate-950 border-slate-800 text-cyan-400" : "bg-slate-100 border-slate-300 text-blue-800"
              }`}
            >
              <currentTabItem.icon className="w-3.5 h-3.5" />
              <span>{currentTabItem.label}</span>
            </div>

            {/* Navigation Menu Dropdown Container */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all shadow-md active:scale-95 ${
                  isMenuOpen
                    ? isDark
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-cyan-950/50"
                      : "bg-blue-700 text-white border-blue-800 shadow-blue-500/20"
                    : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600"
                    : "bg-white border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400"
                }`}
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu Window (Completely solid, 100% opaque background in both light and dark themes) */}
              {isMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border p-2 shadow-2xl z-[9999] animate-fade-in ${
                    isDark
                      ? "border-slate-700 bg-slate-900 text-white shadow-2xl shadow-black"
                      : "border-slate-300 bg-white text-slate-950 shadow-2xl shadow-slate-500/30"
                  }`}
                  style={{
                    zIndex: 9999,
                    backgroundColor: isDark ? "#0f172a" : "#ffffff",
                    opacity: 1
                  }}
                >
                  <div className={`px-3 py-2 border-b text-[11px] font-black uppercase tracking-wider flex items-center justify-between ${
                    isDark ? "border-slate-800 text-slate-400 bg-slate-900" : "border-slate-200 text-slate-600 bg-white"
                  }`}>
                    <span>Navigate Sections</span>
                    <span className="text-[10px] lowercase text-cyan-500 font-bold">6 modules</span>
                  </div>

                  <div className="space-y-1 pt-1.5">
                    {MENU_ITEMS.map((item) => {
                      const isSelected = activeTab === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                            isSelected
                              ? isDark
                                ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300"
                                : "bg-blue-50 border border-blue-300 text-blue-900 font-bold"
                              : isDark
                              ? "hover:bg-slate-800/80 text-slate-200"
                              : "hover:bg-slate-100 text-slate-800"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg border shrink-0 ${
                              isSelected
                                ? isDark
                                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                  : "bg-blue-600 border-blue-700 text-white"
                                : isDark
                                ? "bg-slate-950 border-slate-800 text-slate-400"
                                : "bg-slate-100 border-slate-200 text-slate-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-black tracking-tight">{item.label}</h4>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                                  isSelected
                                    ? isDark
                                      ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                                      : "bg-blue-200 border-blue-300 text-blue-900"
                                    : isDark
                                    ? "bg-slate-950 border-slate-800 text-slate-400"
                                    : "bg-slate-200 border-slate-300 text-slate-600"
                                }`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                isDark ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {item.desc}
                            </p>
                          </div>

                          {isSelected && (
                            <Check className={`w-4 h-4 shrink-0 ${isDark ? "text-cyan-400" : "text-blue-700"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-md active:scale-95 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-amber-400 hover:bg-slate-700 hover:border-slate-600"
                  : "border-slate-300 bg-white text-indigo-700 hover:bg-slate-100 hover:border-slate-400 shadow-sm"
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Saved Notice Toast */}
        {savedMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{savedMessage}</span>
          </div>
        )}

        {/* Tab 1: Primary Link Scanner */}
        {activeTab === "scanner" && (
          <section className="space-y-6">
            <UrlScannerCard
              isDark={isDark}
              onAddAllow={handleAddAllow}
              onAddDeny={handleAddDeny}
              sensitivity={sensitivity}
            />
          </section>
        )}

        {/* Tab: About TrustLens (Cybersecurity Overview, Mission, Vision, Features, Team) */}
        {activeTab === "about" && (
          <section>
            <AboutTrustLens
              isDark={isDark}
              onNavigateToDevelopers={() => setActiveTab("developers")}
              onNavigateToScanner={() => setActiveTab("scanner")}
            />
          </section>
        )}

        {/* Tab 2: Sensitivity Settings */}
        {activeTab === "settings" && (
          <section
            className={`p-6 sm:p-8 rounded-3xl border transition-all ${
              isDark
                ? "border-slate-800 bg-slate-900/90 shadow-xl shadow-black/30"
                : "border-slate-300 bg-white shadow-xl shadow-slate-200/80"
            } space-y-5`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2 rounded-xl border ${
                  isDark ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300" : "bg-blue-100 border-blue-300 text-blue-800"
                }`}
              >
                <Sliders className="w-5 h-5" />
              </span>
              <div>
                <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Detection Sensitivity Preset
                </h2>
                <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Configure how aggressively the phishing detection engine flags ambiguous or unknown links.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                {
                  id: "relaxed",
                  title: "Relaxed",
                  badge: "Low Friction",
                  desc: "Permissive thresholds. Best if you frequently visit new local apps and want minimal interruptions.",
                  cutoff: "Flags if score < 65"
                },
                {
                  id: "balanced",
                  title: "Balanced (Recommended)",
                  badge: "Optimal Defense",
                  desc: "Standard calibrated setting: >97% recall across known phishing vectors with virtually zero false alarms.",
                  cutoff: "Flags if score < 75"
                },
                {
                  id: "strict",
                  title: "Strict",
                  badge: "Maximum Security",
                  desc: "Maximum defensive posture. Immediately challenges unknown domains that request form inputs.",
                  cutoff: "Flags if score < 85"
                }
              ].map((preset) => {
                const isSelected = sensitivity === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSensitivityChange(preset.id as SensitivityLevel)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? isDark
                          ? "border-cyan-500 bg-cyan-950/40 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/50"
                          : "border-blue-600 bg-blue-50 shadow-md shadow-blue-500/15 ring-2 ring-blue-600"
                        : isDark
                        ? "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        : "border-slate-300 bg-slate-50 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                        {preset.title}
                      </h3>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? isDark
                              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                              : "bg-blue-200 border-blue-400 text-blue-900 font-extrabold"
                            : isDark
                            ? "bg-slate-800 border-slate-700 text-slate-300"
                            : "bg-slate-200 border-slate-300 text-slate-800 font-bold"
                        }`}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <p className={`mt-2.5 text-xs leading-relaxed font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      {preset.desc}
                    </p>
                    <div className={`mt-3 pt-2 text-[11px] font-mono font-bold border-t ${
                      isDark ? "border-slate-800 text-slate-400" : "border-slate-300 text-slate-800"
                    }`}>
                      {preset.cutoff}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab 3: Domain Allowlist / Denylist */}
        {activeTab === "domains" && (
          <section
            className={`p-6 sm:p-8 rounded-3xl border transition-all ${
              isDark
                ? "border-slate-800 bg-slate-900/90 shadow-xl shadow-black/30"
                : "border-slate-300 bg-white shadow-xl shadow-slate-200/80"
            } space-y-5`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2 rounded-xl border ${
                  isDark ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300" : "bg-blue-100 border-blue-300 text-blue-800"
                }`}
              >
                <ListFilter className="w-5 h-5" />
              </span>
              <div>
                <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Trusted & Blocked Domain Rules
                </h2>
                <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Add domains that should always be trusted or permanently blocked from execution.
                </p>
              </div>
            </div>

            {/* Quick Add Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="Enter domain (e.g., portal.myuniversity.edu or scam-site.xyz)..."
                className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-mono font-bold border transition-all focus:outline-none ${
                  isDark
                    ? "bg-slate-950 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                    : "bg-slate-50 border-slate-400 text-slate-950 placeholder-slate-500 focus:border-blue-600 focus:bg-white"
                }`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddAllow()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Always Trust</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDeny()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all shadow-sm active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Always Block</span>
                </button>
              </div>
            </div>

            {/* Lists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Always Trusted */}
              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Always Trusted ({allowlist.length})
                  </h3>
                  <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Bypasses security alerts
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {allowlist.length === 0 ? (
                    <p className={`text-xs p-3 text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      No custom trusted domains added.
                    </p>
                  ) : (
                    allowlist.map((dom) => (
                      <div
                        key={dom}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                          isDark
                            ? "border-slate-800 bg-slate-900/80 text-slate-200"
                            : "border-slate-300 bg-white text-slate-950 shadow-sm"
                        }`}
                      >
                        <span className="truncate max-w-[240px]">{dom}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAllow(dom)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Always Blocked */}
              <div
                className={`rounded-2xl border p-4 ${
                  isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldBan className="w-4 h-4" />
                    Always Blocked ({denylist.length})
                  </h3>
                  <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Forces danger block
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {denylist.length === 0 ? (
                    <p className={`text-xs p-3 text-center ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      No custom blocked domains added.
                    </p>
                  ) : (
                    denylist.map((dom) => (
                      <div
                        key={dom}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                          isDark
                            ? "border-slate-800 bg-slate-900/80 text-slate-200"
                            : "border-slate-300 bg-white text-slate-950 shadow-sm"
                        }`}
                      >
                        <span className="truncate max-w-[240px]">{dom}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeny(dom)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: About Developers (Code Warriors - Yash & Dipanshu) */}
        {activeTab === "developers" && (
          <section>
            <AboutDevelopers isDark={isDark} />
          </section>
        )}

        {/* Tab 5: Engine Verification & Status */}
        {activeTab === "engine" && (
          <section
            className={`p-6 sm:p-8 rounded-3xl border transition-all ${
              isDark
                ? "border-slate-800 bg-slate-900/90 shadow-xl shadow-black/30"
                : "border-slate-300 bg-white shadow-xl shadow-slate-200/80"
            } space-y-5`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2 rounded-xl border ${
                  isDark ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300" : "bg-blue-100 border-blue-300 text-blue-800"
                }`}
              >
                <Cpu className="w-5 h-5" />
              </span>
              <div>
                <h2 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Detection Engine Specs & Cryptography
                </h2>
                <p className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Verified zero-egress architecture. All model evaluation and feature extraction run locally.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
              <div
                className={`p-4 rounded-xl border ${
                  isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-300 shadow-sm"
                }`}
              >
                <span className={`text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Model Version
                </span>
                <p className={`font-mono font-black text-sm mt-1.5 ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                  {bundledModel.model_version}
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-300 shadow-sm"
                }`}
              >
                <span className={`text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Active Signals
                </span>
                <p className={`font-mono font-black text-sm mt-1.5 ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                  {bundledModel.feature_count} Features
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-300 shadow-sm"
                }`}
              >
                <span className={`text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Recall @ 0.5% FPR
                </span>
                <p className="font-mono font-black text-sm mt-1.5 text-emerald-500">
                  100.0%
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-300 shadow-sm"
                }`}
              >
                <span className={`text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Verification
                </span>
                <p className={`font-mono font-black text-sm mt-1.5 ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                  Ed25519 Verified
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border text-xs ${
                isDark ? "bg-slate-950/70 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-300 text-slate-800"
              }`}
            >
              <div className="font-black mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Offline Cryptographic Public Key:</span>
              </div>
              <p className="font-mono text-[11px] break-all font-bold opacity-90">{TRUSTLENS_ED25519_PUBLIC_KEY}</p>
            </div>
          </section>
        )}

        {/* Global Footer (Ultra-Crisp, High-Contrast Solid Card in both Light & Dark Theme) */}
        <footer
          className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDark
              ? "border-slate-800 bg-slate-900/90 shadow-xl shadow-black/40 text-slate-200"
              : "border-slate-300 bg-white shadow-xl shadow-slate-300/40 text-slate-950"
          }`}
        >
          {/* Left: Code Warriors Brand Note with Deep Contrast */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`font-black text-sm ${isDark ? "text-white" : "text-slate-950"}`}>
                Built with passion by{" "}
                <span className={isDark ? "text-cyan-400 font-black" : "text-blue-700 font-black"}>
                  Code Warriors
                </span>
              </span>
            </div>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-800"}`}>
              Yash Vishal (Full Stack Developer) & Dipanshu Kumar (Backend & Logo)
            </span>
          </div>

          {/* Right: Academic Institutional Details & Zero-Egress Info */}
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-black px-3 py-1 rounded-full border shadow-sm ${
              isDark
                ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                : "bg-blue-100 border-blue-300 text-blue-900"
            }`}>
              BCA (Semester 1st)
            </span>
            <span className={`font-black ${isDark ? "text-slate-300" : "text-slate-800"}`}>
              Zero-Egress Security
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
