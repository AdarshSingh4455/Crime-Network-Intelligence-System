import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { TemporalObservation, TemporalPattern } from "../types";
import {
  X, Shield, AlertTriangle, Clock, Calendar, MapPin,
  Users, FileText, ExternalLink, Sparkles, RefreshCw
} from "lucide-react";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { ExplanationDrawer } from "./ExplanationDrawer";

// ─── Precision Badge ─────────────────────────────────────────────────────────
export const TemporalPrecisionBadge: React.FC<{ precision: string; time?: string | null }> = ({
  precision,
  time,
}) => {
  if (precision === "DATE_TIME" && time) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Clock className="w-3 h-3 text-emerald-600" />
        {time} IST (Precise)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider uppercase bg-slate-100 text-slate-700 border border-slate-200">
      <Calendar className="w-3 h-3 text-slate-500" />
      Date-Only (No Fabricated Time)
    </span>
  );
};

// ─── Pattern Badge ───────────────────────────────────────────────────────────
export const TemporalPatternBadge: React.FC<{ type: string }> = ({ type }) => {
  let color = "bg-cyan-50 text-cyan-800 border-cyan-200";
  if (type === "BURST_ACTIVITY") {
    color = "bg-rose-50 text-rose-800 border-rose-200";
  } else if (type === "LATE_TIMELINE_APPEARANCE") {
    color = "bg-purple-50 text-purple-800 border-purple-200";
  } else if (type === "TEMPORAL_GAP") {
    color = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (type === "SAME_DATE_LOCATION_OVERLAP") {
    color = "bg-indigo-50 text-indigo-800 border-indigo-200";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${color}`}>
      <Sparkles className="w-2.5 h-2.5" />
      {type.replace(/_/g, " ")}
    </span>
  );
};

// ─── Temporal Drawer Props ───────────────────────────────────────────────────
interface TemporalDrawerProps {
  observationId?: string | null;
  observation?: TemporalObservation | null;
  pattern?: TemporalPattern | null;
  onClose: () => void;
}

export const TemporalDrawer: React.FC<TemporalDrawerProps> = ({
  observationId,
  observation: initialObservation,
  pattern,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [observation, setObservation] = useState<TemporalObservation | null>(initialObservation || null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);

  useEffect(() => {
    if (initialObservation) {
      setObservation(initialObservation);
      return;
    }
    if (!observationId) {
      setObservation(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await api.getTemporalObservation(observationId);
        setObservation(data);
      } catch (err) {
        console.error("Failed to load temporal observation detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [observationId, initialObservation]);

  if (!observationId && !initialObservation && !pattern) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-cyan-100 text-cyan-800 flex items-center justify-center font-mono">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-mono tracking-wide">
                {pattern ? "TEMPORAL PATTERN DOSSIER" : "TEMPORAL OBSERVATION"}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                {pattern ? pattern.pattern_id : observation?.observation_id || observationId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close temporal observation drawer"
            className="p-1.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-600" />
              <span className="font-mono text-xs">Loading temporal telemetry...</span>
            </div>
          ) : pattern ? (
            /* ── Pattern View ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <TemporalPatternBadge type={pattern.pattern_type} />
                <span className="text-[11px] font-mono text-slate-500">
                  {pattern.date_range[0]} {pattern.date_range[0] !== pattern.date_range[1] ? `→ ${pattern.date_range[1]}` : ""}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{pattern.pattern_label}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{pattern.description}</p>
              </div>

              {/* Analytical Metric */}
              <div className="p-3 bg-cyan-50/50 border border-cyan-200/60 rounded-md">
                <div className="text-[10px] font-mono font-bold text-cyan-900 uppercase">Analytical Basis</div>
                <div className="mt-0.5 text-xs font-mono text-cyan-800 font-semibold">{pattern.metric_value}</div>
              </div>

              {/* Entities Involved */}
              <div>
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" /> Target Entities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pattern.target_entities.map((ent) => (
                    <span
                      key={ent}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px] border border-slate-200"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Supporting Records */}
              <div>
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-400" /> Corroborating Source Records
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pattern.target_records.map((rid) => (
                    <span
                      key={rid}
                      className="px-2 py-0.5 bg-slate-100 text-cyan-800 rounded font-mono text-[11px] font-bold border border-slate-200"
                    >
                      {rid}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions & Provenance */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                {pattern.supporting_evidence_ids.length > 0 && (
                  <button
                    onClick={() => setActiveEvidenceId(pattern.supporting_evidence_ids[0])}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-xs font-mono transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-cyan-600" />
                      Inspect Evidence Trace ({pattern.supporting_evidence_ids[0]})
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )}

                {pattern.explanation_id && (
                  <button
                    onClick={() => setActiveExplanationId(pattern.explanation_id!)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded text-xs font-mono transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Open Analytical Explanation ({pattern.explanation_id})
                    </span>
                    <ExternalLink className="w-3 h-3 text-purple-400" />
                  </button>
                )}
              </div>

              {/* Epistemic Limitation Callout */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wide">
                  <AlertTriangle className="w-3 h-3 text-amber-700" /> Epistemic Boundary Notice
                </div>
                <p className="mt-1 text-[11px] text-amber-800 leading-relaxed font-sans">
                  {pattern.epistemic_limitation}
                </p>
              </div>
            </div>
          ) : observation ? (
            /* ── Observation View ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <TemporalPrecisionBadge
                  precision={observation.precision}
                  time={observation.time}
                />
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  {observation.date}
                </span>
              </div>

              {/* Source & Type Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Source Record</span>
                  <span className="font-bold text-cyan-800">{observation.record_id}</span>
                  <span className="block text-[10px] text-slate-500">{observation.source_label}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Observation Type</span>
                  <span className="font-bold text-slate-800">{observation.observation_type}</span>
                  <span className="block text-[10px] text-slate-500">{observation.timezone}</span>
                </div>
              </div>

              {/* Entities Present */}
              <div>
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-slate-400" /> Co-Occurring Entities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {observation.entities.map((ent) => (
                    <span
                      key={ent}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px] border border-slate-200"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Locations Present */}
              {observation.locations.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" /> Documented Locations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {observation.locations.map((loc) => (
                      <span
                        key={loc}
                        className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-mono text-[11px] border border-amber-200 font-semibold"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verbatim Excerpt */}
              <div>
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-400" /> Raw Narrative Excerpt
                </div>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] leading-relaxed border border-slate-800 whitespace-pre-wrap">
                  {observation.description}
                </div>
              </div>

              {/* Actions & Provenance */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => setActiveEvidenceId(observation.evidence_id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded text-xs font-mono transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-600" />
                    Inspect Evidence Item ({observation.evidence_id})
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Epistemic Limitation Callout */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-900 uppercase tracking-wide">
                  <AlertTriangle className="w-3 h-3 text-amber-700" /> Epistemic Boundary Notice
                </div>
                <p className="mt-1 text-[11px] text-amber-800 leading-relaxed font-sans">
                  {observation.epistemic_limitation}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sub-Drawers for Phase 3H Evidence and Phase 3I Explanation */}
      {activeEvidenceId && (
        <EvidenceDrawer
          evidenceId={activeEvidenceId}
          onClose={() => setActiveEvidenceId(null)}
        />
      )}

      {activeExplanationId && (
        <ExplanationDrawer
          explanationId={activeExplanationId}
          onClose={() => setActiveExplanationId(null)}
        />
      )}
    </>
  );
};
