import React from "react";
import {
  Code2,
  Award,
  GraduationCap,
  Sparkles,
  Users,
  CheckCircle,
  Terminal,
  Layers,
  ShieldCheck,
  Cpu
} from "lucide-react";

import { LOGO_IMAGE_DATA, YASH_IMAGE_DATA, DIPANSHU_IMAGE_DATA } from "../assets/embedded-images";

const logoImg = LOGO_IMAGE_DATA;
const yashPhoto = YASH_IMAGE_DATA;
const dipanshuPhoto = DIPANSHU_IMAGE_DATA;

interface AboutDevelopersProps {
  isDark: boolean;
}

export const AboutDevelopers: React.FC<AboutDevelopersProps> = ({ isDark }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Team Banner / Hero */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 transition-all ${
          isDark
            ? "border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-[#0c1427] text-white shadow-2xl shadow-cyan-950/20"
            : "border-slate-300 bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/70 text-slate-900 shadow-xl shadow-slate-200/80"
        }`}
      >
        {/* Glow backdrop */}
        <div
          className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-30 ${
            isDark ? "bg-cyan-500" : "bg-blue-400"
          }`}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
          {/* Logo Badge */}
          <div className="relative group shrink-0">
            <div
              className={`absolute -inset-1 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition duration-300 ${
                isDark ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gradient-to-r from-blue-500 to-indigo-600"
              }`}
            />
            <div
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1.5 border overflow-hidden flex items-center justify-center ${
                isDark ? "bg-slate-950 border-cyan-500/50" : "bg-white border-blue-300 shadow-lg"
              }`}
            >
              <img
                src={logoImg}
                alt="Code Warriors Logo"
                className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                loading="eager"
                decoding="sync"
              />
            </div>
          </div>

          {/* Team Intro */}
          <div className="flex-1 text-center md:text-left space-y-2.5">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border mb-1 ${
              isDark
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                : "bg-blue-100 border-blue-300 text-blue-900 shadow-sm"
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Developer Team</span>
            </div>

            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Code Warriors
            </h2>

            <p className={`text-sm sm:text-base font-medium leading-relaxed max-w-2xl ${
              isDark ? "text-slate-200" : "text-slate-700 font-semibold"
            }`}>
              Innovating zero-egress, client-side cybersecurity and AI phishing defense. Built with passion, precision, and architectural excellence by BCA semester 1st students.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1.5 text-xs">
              <span className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-bold ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300 text-slate-900 shadow-sm"
              }`}>
                <GraduationCap className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-blue-600"}`} />
                BCA Student
              </span>

              <span className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-bold ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300 text-slate-900 shadow-sm"
              }`}>
                <Award className={`w-4 h-4 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                Semester 1st
              </span>

              <span className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-bold ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300 text-slate-900 shadow-sm"
              }`}>
                <Users className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                2 Core Engineers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Profile Cards Grid with Photos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Yash Vishal (Full Stack Developer & Architect) */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
            isDark
              ? "border-cyan-500/40 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 shadow-xl shadow-cyan-950/20 hover:border-cyan-400"
              : "border-slate-300 bg-white text-slate-900 shadow-xl shadow-slate-200/70 hover:border-blue-500"
          }`}
        >
          <div className="space-y-4">
            {/* Top Badge & Role */}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                isDark
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-blue-100 border-blue-300 text-blue-900 font-black shadow-sm"
              }`}>
                Full Stack Developer
              </span>

              <div className={`flex items-center gap-1 text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                <span>Lead Architect</span>
              </div>
            </div>

            {/* Profile Photo & Name */}
            <div className="flex items-center gap-4 pt-1">
              <div className="relative group/photo shrink-0">
                <div
                  className={`absolute -inset-1 rounded-2xl blur-sm opacity-80 group-hover/photo:opacity-100 transition duration-300 ${
                    isDark ? "bg-gradient-to-r from-cyan-500 to-blue-600" : "bg-gradient-to-r from-blue-600 to-indigo-600"
                  }`}
                />
                <div
                  className={`relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 shadow-lg ${
                    isDark ? "border-cyan-400 bg-slate-950" : "border-blue-500 bg-white shadow-md"
                  }`}
                >
                  <img
                    src={yashPhoto}
                    alt="Yash Vishal - Full Stack Developer"
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover/photo:scale-105"
                    loading="eager"
                    decoding="sync"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  Yash Vishal
                </h3>
                <p className={`text-xs font-bold ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
                  Full Stack Developer & System Architect
                </p>
                <div className={`text-[11px] font-bold inline-block px-2 py-0.5 rounded border ${
                  isDark ? "bg-slate-950 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}>
                  BCA (Semester 1st)
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700 font-medium"}`}>
              Architected and developed the complete TrustLens system end-to-end: built the frontend options dashboard & extension interface, on-device machine learning tree fusion engine, client-side URL feature extraction pipeline, real-time heuristic security scanner, and browser extension runtime.
            </p>

            {/* Key Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Full-Stack Development",
                "ML Tree Fusion",
                "Frontend & Extension UI",
                "Feature Engineering",
                "System Architect",
                "BCA Student"
              ].map((badge) => (
                <span
                  key={badge}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? "bg-slate-950 border-slate-800 text-slate-200"
                      : "bg-slate-100 border-slate-300 text-slate-800 font-semibold"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className={`mt-5 pt-4 border-t flex items-center justify-between text-xs font-bold ${
            isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"
          }`}>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Verified Core Contributor
            </span>
            <span className={`font-mono font-black ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
              Role: Full Stack Developer
            </span>
          </div>
        </div>

        {/* Card 2: Dipanshu Kumar (Logo & Backend Developer) */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${
            isDark
              ? "border-blue-500/40 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 shadow-xl shadow-blue-950/20 hover:border-blue-400"
              : "border-slate-300 bg-white text-slate-900 shadow-xl shadow-slate-200/70 hover:border-indigo-500"
          }`}
        >
          <div className="space-y-4">
            {/* Top Badge & Role */}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${
                isDark
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold"
                  : "bg-indigo-100 border-indigo-300 text-indigo-900 font-black shadow-sm"
              }`}>
                Logo & Backend Developer
              </span>

              <div className={`flex items-center gap-1 text-[11px] font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Backend & Brand Designer</span>
              </div>
            </div>

            {/* Profile Photo & Name */}
            <div className="flex items-center gap-4 pt-1">
              <div className="relative group/photo shrink-0">
                <div
                  className={`absolute -inset-1 rounded-2xl blur-sm opacity-80 group-hover/photo:opacity-100 transition duration-300 ${
                    isDark ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-indigo-600 to-blue-600"
                  }`}
                />
                <div
                  className={`relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 shadow-lg ${
                    isDark ? "border-blue-400 bg-slate-950" : "border-indigo-500 bg-white shadow-md"
                  }`}
                >
                  <img
                    src={dipanshuPhoto}
                    alt="Dipanshu Kumar - Logo & Backend Developer"
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover/photo:scale-105"
                    loading="eager"
                    decoding="sync"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  Dipanshu Kumar
                </h3>
                <p className={`text-xs font-bold ${isDark ? "text-blue-400" : "text-indigo-700"}`}>
                  Backend Developer & Logo Designer
                </p>
                <div className={`text-[11px] font-bold inline-block px-2 py-0.5 rounded border ${
                  isDark ? "bg-slate-950 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-800"
                }`}>
                  BCA (Semester 1st)
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700 font-medium"}`}>
              Designed the official TrustLens eagle logo and cybersecurity brand identity, co-developed the backend security services, threat intelligence catalog, and contributed to security rule evaluation.
            </p>

            {/* Key Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Official Logo Design",
                "Backend Development",
                "Threat Intelligence",
                "Brand Identity",
                "Rule Engineering",
                "BCA Student"
              ].map((badge) => (
                <span
                  key={badge}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? "bg-slate-950 border-slate-800 text-slate-200"
                      : "bg-slate-100 border-slate-300 text-slate-800 font-semibold"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className={`mt-5 pt-4 border-t flex items-center justify-between text-xs font-bold ${
            isDark ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-700"
          }`}>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Verified Core Contributor
            </span>
            <span className={`font-mono font-black ${isDark ? "text-blue-400" : "text-indigo-700"}`}>
              Role: Backend & Logo
            </span>
          </div>
        </div>
      </div>

      {/* Academic Institution & Project Story Box */}
      <div
        className={`rounded-3xl border p-6 sm:p-7 ${
          isDark
            ? "border-slate-800 bg-slate-900/80 text-slate-200"
            : "border-slate-300 bg-white text-slate-800 shadow-md"
        }`}
      >
        <div className={`flex items-center gap-2 mb-2 font-black text-sm ${isDark ? "text-cyan-400" : "text-blue-700"}`}>
          <Code2 className="w-5 h-5" />
          <span>About Project TrustLens & Academic Journey</span>
        </div>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700 font-medium"}`}>
          Developed as part of our academic innovation journey in <strong className={isDark ? "text-white" : "text-slate-950"}>BCA (Semester 1st)</strong> by team <strong className={isDark ? "text-cyan-300" : "text-blue-700"}>Code Warriors</strong>. TrustLens was created to tackle advanced phishing threats, homoglyphs, typosquatting, and deceptive link structures using on-device machine learning with <strong>zero external server data egress</strong>.
        </p>
      </div>
    </div>
  );
};
