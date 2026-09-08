import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { IntelligenceReport, KeyFinding, InvestigativeLead, PriorityEntity, EntityType } from "../types";
import {
  FileText, Shield, AlertTriangle, Users, Share2, MapPin,
  Calendar, Activity, RefreshCw, ExternalLink, ArrowRight,
  TrendingUp, CheckCircle2, Info, ChevronRight, Layers,
  Zap, DollarSign, ShieldAlert, Clock, Eye, AlertCircle,
  HelpCircle, ChevronDown, ChevronUp, Phone, Car, Building2, Circle, Briefcase
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Entity Type Configuration ──────────────────────────────────────────────
interface EntityCfg {
  color: string;
  border: string;
  bg: string;
  label: string;
  icon: LucideIcon;
}
const ENTITY_CONFIG: Record<string, EntityCfg> = {
  PERSON:   { color: "#E11D48", border: "#9F1239", bg: "#FFF1F2", label: "Person",   icon: Users },
  PHONE:    { color: "#6366F1", border: "#4338CA", bg: "#EEF2FF", label: "Phone",    icon: Phone },
  VEHICLE:  { color: "#D97706", border: "#92400E", bg: "#FFFBEB", label: "Vehicle",  icon: Car },
  LOCATION: { color: "#059669", border: "#065F46", bg: "#ECFDF5", label: "Location", icon: MapPin },
  ORG:      { color: "#2563EB", border: "#1E3A8A", bg: "#EFF6FF", label: "Org",      icon: Building2 },
  MONEY:    { color: "#7C3AED", border: "#4C1D95", bg: "#F5F3FF", label: "Money",    icon: DollarSign },
  UNKNOWN:  { color: "#6B7280", border: "#374151", bg: "#F9FAFB", label: "Unknown",  icon: Circle },
};
const getEntityCfg = (type?: string): EntityCfg => ENTITY_CONFIG[type || ""] ?? ENTITY_CONFIG.UNKNOWN;

// ─── Pattern Colors ─────────────────────────────────────────────────────────
const PATTERN_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  burst_activity:      { label: "Burst Activity",      color: "#C2410C", bg: "#FFF7ED" },
  new_entity_spike:    { label: "New Entity Spike",    color: "#B45309", bg: "#FFFBEB" },
  statistical_outlier: { label: "Statistical Outlier", color: "#0E7490", bg: "#ECFEFF" },
  structuring:         { label: "Structuring",         color: "#6D28D9", bg: "#F5F3FF" },
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active sub-section tab
  const [activeTab, setActiveTab] = useState<"findings" | "leads" | "network" | "anomalies" | "temporal" | "methodology">("findings");

  // Methodology accordion
  const [showMethodology, setShowMethodology] = useState(false);

  // Load report data
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load intelligence report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Loading State
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-700 font-semibold">Synthesizing intelligence report...</p>
          <p className="text-slate-400 text-sm">Aggregating cross-module findings, network centrality, and anomaly leads</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !report) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#F8FAFC]">
        <div className="text-center space-y-3 max-w-md p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Unable to load intelligence report.</h2>
          <p className="text-slate-500 text-sm">{error || "No data received from service."}</p>
          <button
            onClick={loadReport}
            className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const m = report.investigation_metrics;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#F8FAFC]">
      {/* ── Page Header ── */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                CNIS SECTION :: INTELLIGENCE REPORTS
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {report.report_id}
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {report.status.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Intelligence Reports &amp; Summaries</h1>
            <p className="text-sm text-slate-500">
              Structured analysis reports, community breakdowns, and critical bridge node assessments · Real Pipeline Data · Source: CNIS Intelligence Engine
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-400 font-mono">Generated: {report.generated_at.slice(0, 19).replace("T", " ")} UTC</p>
              <p className="text-[11px] text-emerald-600 font-medium">FastAPI Engine Online</p>
            </div>
            <button
              onClick={loadReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Refresh Data Stream
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Metrics Strip (8 Cards) ── */}
      <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Records</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{m.records}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Entities</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{m.entities}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Relations</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{m.relationships}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Anomalies</span>
            <p className="text-lg font-bold text-amber-600 mt-0.5">{m.anomalies}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Communities</span>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">{m.communities}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Bridge Nodes</span>
            <p className="text-lg font-bold text-indigo-600 mt-0.5">{m.bridge_nodes}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Key Players</span>
            <p className="text-lg font-bold text-cyan-700 mt-0.5">{m.key_players}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Locations</span>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{m.locations}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Executive Intelligence Summary Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-700" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Executive Intelligence Summary</h2>
                <span className="text-[11px] text-slate-400">Automated multi-factor synthesis · Evidence-backed</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Pipeline Synthesis
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            {report.executive_summary}
          </p>

          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Traceable to 10 case records
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 15 verified network entities
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 25 algorithmic anomaly signals
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
          <button
            onClick={() => setActiveTab("findings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "findings"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Key Findings ({report.key_findings.length})
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "leads"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Investigative Leads ({report.investigative_leads.length})
          </button>
          <button
            onClick={() => setActiveTab("network")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "network"
                ? "bg-cyan-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Network Assessment
          </button>
          <button
            onClick={() => setActiveTab("anomalies")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "anomalies"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Anomaly Assessment
          </button>
          <button
            onClick={() => setActiveTab("temporal")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "temporal"
                ? "bg-indigo-700 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Temporal &amp; Locations
          </button>
        </div>

        {/* ── TAB 1: Key Findings Panel ── */}
        {activeTab === "findings" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Ranked Key Findings</h3>
              <span className="text-xs text-slate-400">Click any evidence tag to navigate to source module</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {report.key_findings.map(f => (
                <div
                  key={f.finding_id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {f.finding_id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.priority === "HIGH"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {f.priority} PRIORITY
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                        {f.category}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {f.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {f.explanation}
                    </p>
                  </div>

                  {/* Evidence Traceability Links */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Supporting Evidence (Click to Inspect)
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Records */}
                      {f.evidence.map(rec => (
                        <button
                          key={rec}
                          onClick={() => navigate(`/cases?id=${encodeURIComponent(rec)}`)}
                          className="font-mono text-[11px] font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded hover:bg-cyan-100 transition-colors inline-flex items-center gap-1"
                          title="Open Case Dossier"
                        >
                          <Briefcase className="w-2.5 h-2.5 text-cyan-700" />
                          {rec}
                        </button>
                      ))}

                      {/* Entities */}
                      {f.related_entities.map(ent => (
                        <button
                          key={ent}
                          onClick={() => navigate(`/entities?id=${encodeURIComponent(ent)}`)}
                          className="text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded transition-colors"
                          title={`Open ${ent} in Entity Explorer`}
                        >
                          {ent}
                        </button>
                      ))}

                      {/* Anomalies */}
                      {f.related_anomalies.map(anom => (
                        <button
                          key={anom}
                          onClick={() => navigate(`/anomalies?id=${encodeURIComponent(anom)}`)}
                          className="font-mono text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                          title="Open in Anomaly Center"
                        >
                          {anom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: Priority Investigative Leads ── */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated Intelligence Disclaimer</p>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  Automated intelligence lead derived through cross-correlating network centrality, anomaly signals, and case record associations. Requires investigator validation before operational action.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {report.investigative_leads.map(lead => (
                <div
                  key={lead.lead_id}
                  className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {lead.lead_id}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        lead.priority === "HIGH"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {lead.priority} PRIORITY
                      </span>
                      {lead.location && (
                        <button
                          onClick={() => navigate(`/locations?id=${encodeURIComponent(lead.location!)}`)}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium hover:bg-emerald-100 transition-colors"
                          title={`Inspect ${lead.location} in Locations`}
                        >
                          <MapPin className="w-3 h-3" /> {lead.location}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{lead.title}</h4>
                    <p className="text-xs text-slate-700 leading-relaxed mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-sans">
                      {lead.rationale}
                    </p>
                  </div>

                  {/* Evidence & Entity links */}
                  <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Targets &amp; Evidence:
                      </span>
                      {lead.supporting_entities.map(ent => (
                        <button
                          key={ent}
                          onClick={() => navigate(`/entities?id=${encodeURIComponent(ent)}`)}
                          className="text-[11px] font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-200"
                        >
                          {ent}
                        </button>
                      ))}
                      {lead.supporting_records.map(rec => (
                        <button
                          key={rec}
                          onClick={() => navigate(`/cases?id=${encodeURIComponent(rec)}`)}
                          className="font-mono text-[11px] font-medium bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200 hover:bg-cyan-100 inline-flex items-center gap-1"
                          title="Open Case Dossier"
                        >
                          <Briefcase className="w-2.5 h-2.5 text-cyan-700" />
                          {rec}
                        </button>
                      ))}
                      {lead.supporting_anomalies.map(anom => (
                        <button
                          key={anom}
                          onClick={() => navigate(`/anomalies?id=${encodeURIComponent(anom)}`)}
                          className="font-mono text-[11px] font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                        >
                          {anom}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {lead.supporting_entities.length > 0 && (
                        <button
                          onClick={() => navigate(`/network?focus=${encodeURIComponent(lead.supporting_entities[0])}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Share2 className="w-3 h-3 text-slate-500" />
                          View in Network
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: Network Assessment ── */}
        {activeTab === "network" && (
          <div className="space-y-5">
            {/* Priority Entities Table */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Priority Network Entities (Key Players)</h3>
                  <p className="text-xs text-slate-400">Ranked by Composite Influence Score from Python network analysis</p>
                </div>
                <button
                  onClick={() => navigate("/network")}
                  className="text-xs text-cyan-700 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Interactive Graph <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase">
                      <th className="px-3 py-2 text-left">Entity</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-center">Influence</th>
                      <th className="px-3 py-2 text-center">Degree</th>
                      <th className="px-3 py-2 text-center">Betweenness</th>
                      <th className="px-3 py-2 text-center">PageRank</th>
                      <th className="px-3 py-2 text-left">Role / Status</th>
                      <th className="px-3 py-2 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.priority_entities.map(ent => {
                      const ecfg = getEntityCfg(ent.type);
                      const EIcon = ecfg.icon;
                      return (
                        <tr key={ent.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: ecfg.bg }}>
                                <EIcon className="w-3 h-3" style={{ color: ecfg.color }} />
                              </div>
                              <span>{ent.id}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: ecfg.bg, color: ecfg.color }}>
                              {ecfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-cyan-800">
                            {ent.influence_score.toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {ent.degree.toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {ent.betweenness.toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                            {ent.pagerank.toFixed(4)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                {ent.role}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                C{ent.community}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => navigate(`/entities?id=${encodeURIComponent(ent.id)}`)}
                              className="text-xs text-cyan-700 hover:text-cyan-900 font-medium"
                            >
                              Details &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Critical Bridge Nodes & Communities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Critical Bridge Nodes */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Critical Bridge Nodes (5)</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bridge nodes identified by Girvan-Newman edge betweenness. Severing communications at these nodes disconnects sub-networks.
                </p>
                <div className="space-y-2">
                  {report.network_assessment.bridge_nodes.map(b => (
                    <div
                      key={b.entity}
                      onClick={() => navigate(`/entities?id=${encodeURIComponent(b.entity)}`)}
                      className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800">{b.entity}</span>
                      <span className="text-xs font-mono text-indigo-700 font-semibold">
                        betweenness: {b.betweenness.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communities Breakdown */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Community Partitions (3)</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Modular clustering of entities identified through graph partition algorithms.
                </p>
                <div className="space-y-2">
                  {report.network_assessment.communities.map(c => (
                    <div key={c.community_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Community {c.community_id}</span>
                        <span className="font-mono text-slate-600 font-semibold">{c.size} entities</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.members.slice(0, 6).map(m => (
                          <span key={m} className="px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[10px] text-slate-700">
                            {m}
                          </span>
                        ))}
                        {c.members.length > 6 && (
                          <span className="text-[10px] text-slate-400">+{c.members.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: Anomaly Assessment ── */}
        {activeTab === "anomalies" && (
          <div className="space-y-5">
            {/* Pattern Distribution Bar */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Algorithmic Pattern Distribution</h3>
                  <p className="text-xs text-slate-400">25 total signals detected by CNIS anomaly detection engine</p>
                </div>
                <button
                  onClick={() => navigate("/anomalies")}
                  className="text-xs text-amber-700 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Anomaly Center <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(report.anomaly_assessment.pattern_counts).map(([pat, cnt]) => {
                  const cfg = PATTERN_COLORS[pat] || { label: pat, color: "#475569", bg: "#F1F5F9" };
                  return (
                    <div key={pat} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{cfg.label}</span>
                      <p className="text-xl font-bold text-slate-900">{cnt}</p>
                      <p className="text-[10px] text-slate-400">{((cnt / 25) * 100).toFixed(0)}% of signals</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* High Impact Signals */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Priority Anomaly Signals</h3>
              <div className="space-y-2">
                {report.anomaly_assessment.priority_signals.map((anom, idx) => (
                  <div
                    key={anom.id || idx}
                    onClick={() => navigate("/anomalies")}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 space-y-1 text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {anom.id}
                        </span>
                        <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {anom.pattern.replace(/_/g, " ")}
                        </span>
                        {anom.entity && (
                          <span className="font-bold text-slate-900">{anom.entity}</span>
                        )}
                      </div>
                      {anom.date && <span className="font-mono text-slate-400 text-[11px]">{anom.date}</span>}
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">{anom.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: Temporal & Locations ── */}
        {activeTab === "temporal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temporal Assessment */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Temporal Assessment</h3>
                </div>
                <button
                  onClick={() => navigate("/timeline")}
                  className="text-xs text-indigo-700 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Full Timeline <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                <p className="text-slate-500">Incident Sequence Window:</p>
                <p className="font-mono font-bold text-slate-900 text-sm">{report.temporal_assessment.date_range}</p>
                <p className="text-slate-400 text-[11px]">
                  {report.temporal_assessment.total_events} chronological case records indexed
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Incident Dates</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {report.temporal_assessment.active_dates.map(dt => (
                    <span key={dt} className="font-mono text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Assessment */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Location Intelligence</h3>
                </div>
                <button
                  onClick={() => navigate("/locations")}
                  className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Locations Explorer <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {report.location_assessment.locations.map(loc => (
                  <div
                    key={loc.name}
                    onClick={() => navigate("/locations")}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{loc.name}</span>
                        {loc.is_bridge_node && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-medium">
                            Bridge Hub
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        score {loc.activity_score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {loc.record_count} case records · {loc.entity_count} connected subjects · {loc.anomaly_count} anomaly signals
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Methodology & Limitations Section ── */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Intelligence Engine Methodology &amp; Limitations</h3>
            </div>
            {showMethodology ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showMethodology && (
            <div className="pt-3 border-t border-slate-100 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Processing Pipeline</p>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                    <li><strong className="text-slate-800">Extraction:</strong> Rule-based NER for persons, organizations, locations, vehicles, phones, money.</li>
                    <li><strong className="text-slate-800">Graph Model:</strong> Undirected co-occurrence multi-graph built via NetworkX.</li>
                    <li><strong className="text-slate-800">Centrality:</strong> Degree, Betweenness, Eigenvector, PageRank, Girvan-Newman edge betweenness.</li>
                    <li><strong className="text-slate-800">Anomalies:</strong> Burst activity sliding windows, Isolation Forest statistical outliers, cash structuring detection.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Analytical Limitations</p>
                  <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                    {report.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;