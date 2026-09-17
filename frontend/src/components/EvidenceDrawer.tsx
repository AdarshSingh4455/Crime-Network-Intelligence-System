import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { EvidenceItem, EvidenceTrace, EpistemicStatus, EvidenceClassification } from "../types";
import {
  X, Shield, FileText, AlertTriangle, ExternalLink, Calendar,
  MapPin, CheckCircle2, ChevronRight, Hash, Layers, HelpCircle,
  Eye, RefreshCw, ArrowRight, Share2, Users, Clock, AlertCircle,
  Briefcase
} from "lucide-react";

// ─── Epistemic Status Badges ──────────────────────────────────────────────────
export const EpistemicBadge: React.FC<{ status: EpistemicStatus }> = ({ status }) => {
  switch (status) {
    case "OBSERVED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Eye className="w-3 h-3 text-emerald-600" />
          Observed Source Data
        </span>
      );
    case "DERIVED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-sky-50 text-sky-700 border border-sky-200">
          <Share2 className="w-3 h-3 text-sky-600" />
          Derived Analytical Computation
        </span>
      );
    case "SIGNAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Investigative Anomaly Signal
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-purple-50 text-purple-800 border border-purple-200">
          <AlertCircle className="w-3 h-3 text-purple-600" />
          Investigator Review Required
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

// ─── Classification Badges ───────────────────────────────────────────────────
export const ClassificationBadge: React.FC<{ classification: EvidenceClassification }> = ({ classification }) => {
  const label = classification.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
      {label}
    </span>
  );
};

// ─── Evidence Drawer Component ───────────────────────────────────────────────
interface EvidenceDrawerProps {
  evidenceId: string | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ evidenceId, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceItem, setEvidenceItem] = useState<EvidenceItem | null>(null);
  const [evidenceTrace, setEvidenceTrace] = useState<EvidenceTrace | null>(null);

  useEffect(() => {
    if (!evidenceId) {
      setEvidenceItem(null);
      setEvidenceTrace(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    api.getEvidenceItem(evidenceId)
      .then(res => {
        if (active) {
          setEvidenceItem(res.item);
          setEvidenceTrace(res.trace || null);
        }
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load evidence provenance.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [evidenceId]);

  if (!evidenceId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                PROVENANCE TRACE
              </span>
              <span className="font-mono text-xs text-slate-500">{evidenceId}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              Why Does CNIS Show This?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">Compiling Provenance Trace...</p>
              <p className="text-xs text-slate-400">Verifying raw source records and analytical method</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Evidence Retrieval Error
              </div>
              <p>{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  api.getEvidenceItem(evidenceId)
                    .then(res => {
                      setEvidenceItem(res.item);
                      setEvidenceTrace(res.trace || null);
                    })
                    .catch(err => setError(err.message))
                    .finally(() => setLoading(false));
                }}
                className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {evidenceItem && (
            <>
              {/* Epistemic & Type Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <EpistemicBadge status={evidenceItem.epistemic_status} />
                <ClassificationBadge classification={evidenceItem.evidence_type} />
              </div>

              {/* Finding Summary */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">The Finding</span>
                <p className="text-sm font-bold text-slate-900 leading-snug">{evidenceItem.finding}</p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
                  {evidenceItem.temporal_context && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {evidenceItem.temporal_context}
                    </span>
                  )}
                  {evidenceItem.spatial_context && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {evidenceItem.spatial_context}
                    </span>
                  )}
                  <span>
                    Records: <strong className="text-slate-700">{evidenceItem.source_records.length}</strong>
                  </span>
                  <span>
                    Entities: <strong className="text-slate-700">{evidenceItem.entities.length}</strong>
                  </span>
                </div>
              </div>

              {/* Factual Rationale */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                  Why This Appears
                </h3>
                <div className="p-3.5 rounded-lg border border-cyan-100 bg-cyan-50/50 text-xs text-slate-800 leading-relaxed font-sans">
                  {evidenceItem.rationale}
                </div>
              </div>

              {/* Analytical Method / Mathematical Algorithm */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Deterministic Analytical Method
                </h3>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-800 leading-relaxed break-words">
                  {evidenceItem.analytical_method}
                </div>
              </div>

              {/* Epistemic Limitations & Responsible Intelligence Banner */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Investigative Limitation &amp; Epistemic Boundary
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  {evidenceItem.limitations}
                </p>
                <p className="text-[11px] text-amber-700/80 pt-1 border-t border-amber-200/60 italic">
                  CNIS Principle: Analytical signals, graph centrality, and record co-occurrences do not constitute legal proof. Authorized human investigator interpretation is required.
                </p>
              </div>

              {/* Verbatim Raw Source Records Excerpts */}
              {evidenceItem.raw_excerpts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      Supporting Verbatim Source Excerpts ({evidenceItem.raw_excerpts.length})
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">100% Raw Unmodified</span>
                  </div>
                  <div className="space-y-2.5">
                    {evidenceItem.raw_excerpts.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                              {ex.record_id}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize">
                              {ex.source.replace(/_/g, " ")}
                            </span>
                          </div>
                          {ex.date && (
                            <span className="text-[11px] text-slate-400 font-mono">{ex.date}</span>
                          )}
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {ex.verbatim_text}
                        </div>
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => {
                              onClose();
                              navigate(`/cases?id=${encodeURIComponent(ex.record_id)}`);
                            }}
                            className="text-[11px] text-cyan-600 hover:text-cyan-800 font-medium inline-flex items-center gap-1"
                          >
                            Open Case Dossier <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Involved Entities */}
              {evidenceItem.entities.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    Involved Entities ({evidenceItem.entities.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {evidenceItem.entities.map(ent => (
                      <button
                        key={ent}
                        onClick={() => {
                          onClose();
                          navigate(`/entities?id=${encodeURIComponent(ent)}`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200"
                      >
                        {ent}
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Trace Breadcrumbs */}
              {evidenceTrace && evidenceTrace.steps.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    End-to-End Provenance Pipeline Steps
                  </h3>
                  <div className="space-y-2">
                    {evidenceTrace.steps.map((st, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center text-[11px]">
                            {i + 1}
                          </div>
                          {i < evidenceTrace.steps.length - 1 && (
                            <div className="w-0.5 h-full bg-slate-200 my-1" />
                          )}
                        </div>
                        <div className="pb-3 flex-1">
                          <p className="font-bold text-slate-800">{st.stage}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5">{st.description || st.rationale}</p>
                          {st.analytical_method && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{st.analytical_method}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-slate-400">
            CNIS Phase 3H Evidence Engine · Deterministic &amp; Auditable
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
