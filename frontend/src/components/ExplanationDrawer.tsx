import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { IntelligenceExplanation, ExplainabilityType, ExplanationStatus } from "../types";
import {
  X, Shield, AlertTriangle, ExternalLink,
  Lightbulb, CheckCircle2,
  AlertCircle, Sparkles,
  RefreshCw
} from "lucide-react";
import { EvidenceDrawer } from "./EvidenceDrawer";

// ─── Status Badges ────────────────────────────────────────────────────────────
export const ExplanationStatusBadge: React.FC<{ status: ExplanationStatus }> = ({ status }) => {
  switch (status) {
    case "COMPLETE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Computation Complete
        </span>
      );
    case "SIGNAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Investigative Signal
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-purple-50 text-purple-800 border border-purple-200">
          <AlertCircle className="w-3 h-3 text-purple-600" />
          Review Required
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};

// ─── Type Badge ───────────────────────────────────────────────────────────────
export const ExplanationTypeBadge: React.FC<{ type: ExplainabilityType }> = ({ type }) => {
  const label = type.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold">
      <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
      {label}
    </span>
  );
};

// ─── Explanation Drawer Component ─────────────────────────────────────────────
interface ExplanationDrawerProps {
  explanationId?: string | null;
  explanation?: IntelligenceExplanation | null;
  onClose: () => void;
  onInspectEvidence?: (evidenceId: string) => void;
}

export const ExplanationDrawer: React.FC<ExplanationDrawerProps> = ({
  explanationId,
  explanation: initialExplanation,
  onClose,
  onInspectEvidence,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<IntelligenceExplanation | null>(initialExplanation || null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    if (initialExplanation) {
      setExplanation(initialExplanation);
      setError(null);
      return;
    }

    if (!explanationId) {
      setExplanation(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api.getExplanation(explanationId)
      .then(res => {
        if (active) {
          setExplanation(res);
        }
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load explanation.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [explanationId, initialExplanation]);

  if (!explanationId && !initialExplanation) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white flex items-center justify-center shadow-xs">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono tracking-wide">
                  INTELLIGENCE EXPLANATION
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  {explanation?.explanation_id || explanationId}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                <span className="text-xs font-mono">Retrieving derivation trace and evidence anchors...</span>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <div>
                  <div className="font-bold">Explanation Retrieval Failed</div>
                  <div className="mt-1 font-mono text-[11px]">{error}</div>
                </div>
              </div>
            )}

            {explanation && !loading && (
              <div className="space-y-6">
                {/* ── STAGE 1: WHAT WAS FOUND ─────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                        STAGE 1
                      </span>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        What Was Found
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExplanationStatusBadge status={explanation.status} />
                      <ExplanationTypeBadge type={explanation.explanation_type} />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
                    <div className="text-[11px] font-mono text-cyan-700 uppercase font-semibold mb-1">
                      {explanation.target_label}
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      {explanation.finding}
                    </p>
                  </div>
                </div>

                {/* ── STAGE 2: WHAT DATA WAS USED ─────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                      STAGE 2
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      What Data Was Used
                    </h4>
                  </div>

                  {/* Observation */}
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-900">Direct Observation: </span>
                    {explanation.observation}
                  </div>

                  {/* Analytical Inputs Table/Key-Values */}
                  {explanation.analytical_inputs && Object.keys(explanation.analytical_inputs).length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Analytical Inputs & Parameters
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        {Object.entries(explanation.analytical_inputs).map(([key, val]) => (
                          <div key={key} className="text-[11px]">
                            <span className="text-slate-500 font-mono">{key}: </span>
                            <span className="font-mono font-bold text-slate-800">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Records */}
                  {explanation.supporting_source_records.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                        Source Records Ingested ({explanation.supporting_source_records.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {explanation.supporting_source_records.map(rec => (
                          <span
                            key={rec}
                            className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 rounded border border-slate-200"
                          >
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── STAGE 3: HOW IT WAS DERIVED ─────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                      STAGE 3
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      How It Was Derived (Deterministic Pipeline)
                    </h4>
                  </div>

                  {/* Analytical Method */}
                  <div className="p-3 bg-cyan-50/60 rounded-lg border border-cyan-100">
                    <div className="text-[10px] font-bold font-mono uppercase text-cyan-800 mb-1">
                      Analytical Method / Algorithm
                    </div>
                    <div className="text-xs font-semibold text-cyan-950 font-mono">
                      {explanation.analytical_method}
                    </div>
                  </div>

                  {/* Calculation Summary / Formula */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold font-mono uppercase text-slate-500 mb-1">
                      Calculation Breakdown / Rule Formula
                    </div>
                    <div className="text-xs text-slate-800 font-mono leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                      {explanation.calculation_summary}
                    </div>
                  </div>

                  {/* Derivation Steps */}
                  {explanation.derivation_steps && explanation.derivation_steps.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Pipeline Derivation Steps ({explanation.derivation_steps.length})
                      </div>
                      <div className="relative pl-4 border-l-2 border-cyan-200 space-y-3">
                        {explanation.derivation_steps.map((st, idx) => (
                          <div key={idx} className="relative text-xs">
                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-600 ring-4 ring-white" />
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span className="text-[10px] font-mono text-cyan-700 font-bold">
                                STEP {st.step_number}:
                              </span>
                              <span>{st.stage}</span>
                            </div>
                            <div className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                              {st.description}
                            </div>
                            {st.method_or_rule && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                Rule/Method: <span className="text-slate-700">{st.method_or_rule}</span>
                              </div>
                            )}
                            {st.intermediate_result !== undefined && (
                              <div className="text-[10px] font-mono bg-slate-50 p-1.5 rounded mt-1 text-slate-700 border border-slate-200">
                                Result: {typeof st.intermediate_result === "object" ? JSON.stringify(st.intermediate_result) : String(st.intermediate_result)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── STAGE 4: WHAT EVIDENCE SUPPORTS IT ──────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                        STAGE 4
                      </span>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        Supporting Evidence Items
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {explanation.supporting_evidence_ids.length} Linked Items
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Each derived intelligence finding is anchored directly to evidence items with cryptographic provenance and raw records.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {explanation.supporting_evidence_ids.map(evId => (
                      <button
                        key={evId}
                        onClick={() => {
                          if (onInspectEvidence) {
                            onInspectEvidence(evId);
                          } else {
                            setActiveEvidenceId(evId);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 transition-colors shadow-2xs group cursor-pointer"
                        title="Inspect Evidence Item"
                      >
                        <Shield className="w-3 h-3 text-cyan-600 group-hover:text-cyan-800" />
                        <span>{evId}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-cyan-400 group-hover:text-cyan-700" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── STAGE 5: HOW TO INTERPRET IT ────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-[10px] font-bold rounded">
                      STAGE 5
                    </span>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      Investigator Interpretation
                    </h4>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200/80 text-xs text-emerald-950 leading-relaxed font-medium">
                    {explanation.interpretation}
                  </div>
                </div>

                {/* ── STAGE 6: WHAT IT DOES NOT PROVE ─────────────────────── */}
                <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-4.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-800 text-white font-mono text-[10px] font-bold rounded">
                      STAGE 6
                    </span>
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold font-mono text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      What It Does Not Prove (Epistemic Boundary)
                    </div>
                  </div>

                  <div className="text-xs text-amber-950 leading-relaxed p-3 bg-white/90 rounded-lg border border-amber-200 font-medium">
                    {explanation.limitations}
                  </div>

                  <div className="text-[10px] text-amber-800 font-mono flex items-center gap-1 pt-1">
                    <Shield className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>CNIS Strict Epistemic Governance: Analytical signals require independent corroboration.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="font-mono text-[10px]">
              CNIS Explainability Engine · 100% Deterministic & Auditable
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Nested Evidence Drawer for inspecting supporting evidence */}
      {activeEvidenceId && (
        <EvidenceDrawer
          evidenceId={activeEvidenceId}
          onClose={() => setActiveEvidenceId(null)}
        />
      )}
    </>
  );
};
