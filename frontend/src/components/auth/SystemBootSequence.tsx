import React, { useEffect, useState } from 'react';
import { Shield, Cpu, Activity, CheckCircle2 } from 'lucide-react';
import { User } from '../../context/AuthContext';

interface SystemBootSequenceProps {
  onComplete: () => void;
  user?: User | null;
}

const BOOT_LOG_LINES = [
  "CNIS_BOOT::AUTH_SESSION_ESTABLISHED [0x8F3A]",
  "GRAPH_ENGINE::INITIALIZE_TOPOLOGY [NODES: ACTIVE]",
  "ENTITY_INDEX::SYNCHRONIZE_CACHE_BUFFERS",
  "EVIDENCE_STORE::VERIFY_PROVENANCE_HASH_INDEX",
  "TEMPORAL_ENGINE::LOAD_OBSERVATIONS [2,480 RECORDED]",
  "NETWORK_TOPOLOGY::RESOLVE_INTER_CLUSTER_BRIDGES",
  "CASE_INDEX::SYNC_ACTIVE_DOSSIERS [10 OPEN CASES]",
  "ANALYTICS_PIPELINE::ARM_HEURISTIC_DETECTORS",
  "SESSION_CHANNEL::SECURE_TLS1.3_ENCRYPTED",
  "FIR_ENGINE::LOAD_LEGAL_PROVISIONS_CATALOG",
  "ANOMALY_DETECTOR::EVALUATE_COMMUNITY_STRUCTURES",
  "EXPLAINABILITY_ENGINE::PREPARE_ATTRIBUTION_GRAPHS",
  "CNIS_PLATFORM::INTELLIGENCE_DISPATCHER_ONLINE",
  "SYSTEM_HEALTH::VERIFY_PIPELINE_LATENCY [4ms]",
  "SECURITY_GATEWAY::SESSION_TOKEN_VALIDATED",
  "STORAGE_ENGINE::FILE_BACKED_JSON_INTEGRITY_OK",
];

export const SystemBootSequence: React.FC<SystemBootSequenceProps> = ({ onComplete, user }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    { text: "Initializing secure session...", icon: Cpu },
    { text: "Verifying evidence & entity index...", icon: Activity },
    { text: "Resolving network topology...", icon: Shield },
    { text: "Establishing secure investigation workspace...", icon: Activity },
    { text: "Ready", icon: CheckCircle2 },
  ];

  useEffect(() => {
    // Check if prefers-reduced-motion is active
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1200);
      return () => clearTimeout(timer);
    }

    const t1 = setTimeout(() => setStepIndex(1), 600);
    const t2 = setTimeout(() => setStepIndex(2), 1200);
    const t3 = setTimeout(() => setStepIndex(3), 1800);
    const t4 = setTimeout(() => setStepIndex(4), 2400);
    const t5 = setTimeout(() => {
      onComplete();
    }, 2700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  const CurrentIcon = steps[stepIndex]?.icon || Activity;

  return (
    <div
      role="region"
      aria-label="CNIS System Initialization"
      className="fixed inset-0 z-50 bg-[#070A11] text-slate-100 font-mono select-none flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500"
    >
      {/* Background Presentational Upward Code/Log Stream */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden flex justify-between px-6 md:px-16 text-[11px] text-cyan-400/80 leading-relaxed font-mono">
        {/* Left Column Code Stream */}
        <div className="w-1/2 md:w-5/12 overflow-hidden relative">
          <div className="animate-code-stream flex flex-col space-y-2">
            {[...BOOT_LOG_LINES, ...BOOT_LOG_LINES, ...BOOT_LOG_LINES].map((line, idx) => (
              <div key={`left-${idx}`} className="truncate hover:text-cyan-300">
                <span className="text-slate-600 mr-2">&gt;</span>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column Code Stream */}
        <div className="hidden md:block w-5/12 overflow-hidden relative text-right">
          <div className="animate-code-stream flex flex-col space-y-2" style={{ animationDuration: '14s' }}>
            {[...BOOT_LOG_LINES, ...BOOT_LOG_LINES, ...BOOT_LOG_LINES].reverse().map((line, idx) => (
              <div key={`right-${idx}`} className="truncate hover:text-cyan-300">
                {line}
                <span className="text-slate-600 ml-2">&lt;</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top and Bottom Gradient Fades for Code Stream */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#070A11] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070A11] to-transparent pointer-events-none" />

      {/* Center Restrained Status Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto p-8 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center space-y-6">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-slate-900 p-0.5 shadow-xl shadow-cyan-950/50 flex items-center justify-center border border-cyan-500/40">
            <div className="w-full h-full rounded-[14px] bg-[#0B0F19] flex items-center justify-center">
              <Shield className="w-8 h-8 text-cyan-400 animate-soft-pulse" />
            </div>
          </div>
          {/* Subtle Outer Glowing Ring */}
          <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-md pointer-events-none animate-pulse" />
        </div>

        {/* Platform Titles */}
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            CNIS PLATFORM
          </div>
          <h2 className="text-base md:text-lg font-mono font-bold text-slate-100 tracking-wider">
            INITIALIZING INTELLIGENCE ENGINE
          </h2>
          {user && (
            <p className="text-xs text-slate-400 font-sans">
              Welcome, <span className="text-cyan-300 font-semibold">{user.name}</span> ({user.role})
            </p>
          )}
        </div>

        {/* Restrained Animated Indicator Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Dynamic Status Text */}
        <div
          aria-live="polite"
          className="flex items-center justify-center gap-2.5 text-xs text-slate-300 font-mono min-h-[24px]"
        >
          <CurrentIcon className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
          <span>{steps[stepIndex]?.text}</span>
        </div>
      </div>
    </div>
  );
};
