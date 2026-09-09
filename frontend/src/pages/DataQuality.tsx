import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Shield,
  Database,
  Layers,
  AlertCircle,
  TrendingUp,
  FileText,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import {
  FixtureCatalogue,
  DataQualityResults,
  RobustnessTestResult,
  RobustnessTestStatus,
  FixtureCategoryGroup,
} from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  A: 'Exact Duplicates',
  B: 'Near Duplicates',
  C: 'Phone Number Variations',
  D: 'Vehicle Number Variations',
  E: 'Person Name Ambiguity',
  F: 'Location Ambiguity',
  G: 'Missing Data',
  H: 'Malformed Data',
  I: 'Conflicting Observations',
  J: 'Duplicate Edge / Relationship',
  K: 'Self-Loops',
  L: 'False Co-occurrence',
  M: 'Temporal Edge Cases',
  N: 'Burst / Anomaly False Positives',
  O: 'Small Dataset Robustness',
  P: 'Disconnected Graph',
  Q: 'Search Robustness',
  R: 'Re-ingestion / Idempotency',
  S: 'Null / Unknown Entity Values',
  T: 'Special Character / Unicode Robustness',
};

const STATUS_CONFIG: Record<
  RobustnessTestStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  PASS: {
    label: 'PASS',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  },
  FAIL: {
    label: 'FAIL',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
  },
  KNOWN_WEAKNESS: {
    label: 'KNOWN WEAKNESS',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  },
  WARNING: {
    label: 'WARNING',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />,
  },
  ERROR: {
    label: 'ERROR',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: RobustnessTestStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ERROR;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const MetricTile: React.FC<{
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}> = ({ label, value, sub, color = 'text-slate-900', icon }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
    <div className="mt-0.5 text-slate-400">{icon}</div>
    <div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-700 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const TestResultRow: React.FC<{ result: RobustnessTestResult }> = ({ result }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0 w-24">
            {result.test_id}
          </span>
          <span className="text-xs font-semibold text-slate-800 truncate">
            {result.test_name}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-[10px] text-slate-400 hidden sm:block truncate max-w-32">
            {result.category}
          </span>
          <StatusBadge status={result.status} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wide">
                Description
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{result.description}</p>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wide">
                Expected Behavior
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.expected_behavior}</p>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wide">
              Observed Behavior
            </div>
            <p
              className={`text-xs leading-relaxed ${
                result.status === 'PASS'
                  ? 'text-emerald-800'
                  : result.status === 'KNOWN_WEAKNESS'
                  ? 'text-amber-800'
                  : result.status === 'FAIL'
                  ? 'text-rose-800'
                  : 'text-slate-700'
              }`}
            >
              {result.observed_behavior}
            </p>
          </div>

          {result.weakness_documented && result.weakness_description && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wide">
                  Documented Architectural Limitation
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {result.weakness_description}
              </p>
            </div>
          )}

          {result.detail && Object.keys(result.detail).length > 0 && (
            <details className="group">
              <summary className="text-[10px] font-mono text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                ▶ Raw Test Detail
              </summary>
              <pre className="mt-2 bg-white border border-slate-200 rounded p-3 text-[10px] font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result.detail, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

const CatalogueCard: React.FC<{ group: FixtureCategoryGroup }> = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="text-[11px] font-mono font-bold text-slate-500 w-6">
            {group.robustness_category}
          </span>
          <span className="text-xs font-semibold text-slate-800">
            {group.category_label}
          </span>
          {group.has_known_weakness && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono">
              Known Weakness
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-500 shrink-0">
          {group.fixture_count} fixture{group.fixture_count !== 1 ? 's' : ''}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {group.fixtures.map((f) => (
            <div key={f.fixture_id} className="px-4 py-3 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {f.fixture_id}
                    </span>
                    {f.known_weakness && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                        Weakness
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700">{f.input_condition}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Expected: <span className="font-medium text-slate-700">{f.expected_outcome}</span>
                  </p>
                  {f.known_weakness && f.weakness_description && (
                    <p className="text-[11px] text-amber-700 mt-1 italic">
                      ⚠ {f.weakness_description}
                    </p>
                  )}
                </div>
                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                  {f.source_records.length} record{f.source_records.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'results' | 'catalogue' | 'baseline';

export const DataQuality: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('results');
  const [catalogue, setCatalogue] = useState<FixtureCatalogue | null>(null);
  const [results, setResults] = useState<DataQualityResults | null>(null);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RobustnessTestStatus | 'ALL'>('ALL');

  const fetchCatalogue = useCallback(async () => {
    setLoadingCatalogue(true);
    setError(null);
    try {
      const data = await api.getFixtureCatalogue();
      setCatalogue(data);
    } catch (e: unknown) {
      setError(`Failed to load fixture catalogue: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingCatalogue(false);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    setError(null);
    try {
      const data = await api.getDataQualityResults();
      setResults(data);
    } catch (e: unknown) {
      setError(`Failed to run robustness tests: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogue();
    fetchResults();
  }, [fetchCatalogue, fetchResults]);

  const filteredResults = results?.test_results.filter(
    (r) => statusFilter === 'ALL' || r.status === statusFilter
  ) ?? [];

  const overallStatusConfig = {
    HEALTHY: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'HEALTHY' },
    WEAKNESSES_DOCUMENTED: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'WEAKNESSES DOCUMENTED' },
    NEEDS_ATTENTION: { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', label: 'NEEDS ATTENTION' },
  };

  const statusCfg = results
    ? overallStatusConfig[results.overall_status] ?? overallStatusConfig.NEEDS_ATTENTION
    : null;

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-700 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Data Quality &amp; Robustness Testing
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Phase 3F — Synthetic fixture evaluation of entity resolution, ingestion
                stability, and adversarial data handling. Not an investigator intelligence view.
              </p>
            </div>
          </div>

          <button
            onClick={() => { fetchCatalogue(); fetchResults(); }}
            disabled={loadingCatalogue || loadingResults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingCatalogue || loadingResults) ? 'animate-spin' : ''}`} />
            Re-run Tests
          </button>
        </div>

        {/* Isolation Notice */}
        <div className="mt-3 flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
          <Shield className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-violet-800 leading-relaxed">
            <strong>Isolation Notice:</strong> All tests in this module use synthetic{' '}
            <span className="font-mono">TEST-</span> prefixed fixtures only.
            The baseline production dataset (<span className="font-mono">sample_records.json</span>)
            is never modified. Test results do not appear in Cases, Entities, Network, Anomalies,
            Timeline, Locations, or Intelligence Reports.
          </p>
        </div>
      </div>

      {/* ── Summary Metrics ─────────────────────────────────────────────────── */}
      {results && (
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricTile
              label="Total Tests"
              value={results.total_tests}
              icon={<FlaskConical className="w-4 h-4" />}
            />
            <MetricTile
              label="Passed"
              value={results.passed}
              color="text-emerald-700"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <MetricTile
              label="Known Weaknesses"
              value={results.known_weaknesses}
              color="text-amber-700"
              sub="Documented"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <MetricTile
              label="Warnings"
              value={results.warnings}
              color="text-orange-700"
              icon={<AlertCircle className="w-4 h-4" />}
            />
            <MetricTile
              label="Failed"
              value={results.failed}
              color={results.failed > 0 ? 'text-rose-700' : 'text-slate-400'}
              icon={<XCircle className="w-4 h-4" />}
            />
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <div className="mt-0.5 text-slate-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`text-[11px] font-bold font-mono uppercase px-2 py-1 rounded border ${statusCfg?.bg} ${statusCfg?.color} ${statusCfg?.border}`}
                >
                  {statusCfg?.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Overall Status</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-2 shrink-0 border-b border-slate-200 bg-[#F8FAFC]">
        <div className="flex gap-0">
          {(
            [
              { id: 'results', label: 'Robustness Test Results', icon: FlaskConical },
              { id: 'catalogue', label: 'Fixture Catalogue', icon: BookOpen },
              { id: 'baseline', label: 'Baseline Verification', icon: Database },
            ] as { id: ActiveTab; label: string; icon: React.FC<{className?: string}> }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800">{error}</p>
          </div>
        )}

        {/* ── Tab: Test Results ──────────────────────────────────────────── */}
        {activeTab === 'results' && (
          <div>
            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wide mr-1">
                Filter:
              </span>
              {(['ALL', 'PASS', 'KNOWN_WEAKNESS', 'WARNING', 'FAIL', 'ERROR'] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded border transition-colors ${
                      statusFilter === s
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'ALL' ? 'ALL' : STATUS_CONFIG[s]?.label ?? s}
                    {s !== 'ALL' && results && (
                      <span className="ml-1 opacity-70">
                        ({results.test_results.filter((r) => r.status === s).length})
                      </span>
                    )}
                  </button>
                )
              )}
              {results && (
                <span className="ml-auto text-[10px] text-slate-400 font-mono">
                  {filteredResults.length} / {results.total_tests} tests
                </span>
              )}
            </div>

            {loadingResults ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Running robustness tests…</span>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No tests match the selected filter.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map((r) => (
                  <TestResultRow key={r.test_id} result={r} />
                ))}
              </div>
            )}

            {/* Disclaimer */}
            {results?.disclaimer && (
              <div className="mt-6 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">{results.disclaimer}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Fixture Catalogue ─────────────────────────────────────── */}
        {activeTab === 'catalogue' && (
          <div>
            {loadingCatalogue ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading fixture catalogue…</span>
              </div>
            ) : catalogue ? (
              <div>
                {/* Catalogue summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <MetricTile
                    label="Total Fixtures"
                    value={catalogue.total_fixtures}
                    icon={<FileText className="w-4 h-4" />}
                  />
                  <MetricTile
                    label="Categories Covered"
                    value={`${catalogue.categories_covered} / 20`}
                    icon={<Layers className="w-4 h-4" />}
                  />
                  <div className="bg-white border border-slate-200 rounded-lg p-4 col-span-2">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wide">
                      Coverage Map (A–T)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {'ABCDEFGHIJKLMNOPQRST'.split('').map((cat) => {
                        const covered = catalogue.category_ids_covered.includes(cat as never);
                        return (
                          <span
                            key={cat}
                            title={CATEGORY_LABELS[cat]}
                            className={`w-6 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center border ${
                              covered
                                ? 'bg-violet-600 text-white border-violet-700'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            {cat}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {catalogue.categories.map((group) => (
                    <CatalogueCard key={group.robustness_category} group={group} />
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  Catalogue generated at {catalogue.generated_at}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-sm">
                No fixture catalogue available.
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Baseline Verification ─────────────────────────────────── */}
        {activeTab === 'baseline' && (
          <div className="max-w-2xl">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Production Baseline Integrity Check
                </h3>
              </div>

              {results ? (
                <>
                  <div
                    className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border ${
                      results.baseline_intact
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    {results.baseline_intact ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        results.baseline_intact ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      Baseline{' '}
                      {results.baseline_intact ? 'Intact — No modification detected' : 'MODIFIED — ALERT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(results.baseline_summary).map(([k, v]) => (
                      <div
                        key={k}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                      >
                        <div className="text-lg font-bold font-mono text-slate-900">{v}</div>
                        <div className="text-[11px] text-slate-500 capitalize mt-0.5">
                          {k.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3">
                    <div className="text-[10px] font-bold uppercase text-violet-600 mb-1 tracking-wide">
                      Sacred Baseline Rule
                    </div>
                    <p className="text-xs text-violet-800 leading-relaxed">
                      <span className="font-mono">data/sample_records.json</span> is the single
                      source of truth for production intelligence. Phase 3F synthetic fixtures are
                      never merged with this baseline. Any modification to the baseline is an
                      implementation error.
                    </p>
                  </div>
                </>
              ) : loadingResults ? (
                <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Verifying baseline…</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No baseline data available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
