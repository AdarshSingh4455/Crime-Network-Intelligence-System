import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Navigation,
  Search,
  X,
  Shield,
  AlertTriangle,
  FileText,
  ExternalLink,
  Scale,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { LocationItem, FIRRecord } from '../../types';

interface LiveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  firs: FIRRecord[];
  locations: LocationItem[];
}

// Known coordinate registry for location resolution (No fake coords invented)
const KNOWN_GEO_REGISTRY: Record<string, { lat: number; lng: number; district: string }> = {
  lucknow: { lat: 26.8467, lng: 80.9462, district: 'Lucknow' },
  hazratganj: { lat: 26.8505, lng: 80.9431, district: 'Lucknow' },
  'gomti nagar': { lat: 26.8547, lng: 80.9984, district: 'Lucknow' },
  alambagh: { lat: 26.8124, lng: 80.9022, district: 'Lucknow' },
  mahanagar: { lat: 26.8722, lng: 80.9542, district: 'Lucknow' },
  chowk: { lat: 26.8688, lng: 80.9068, district: 'Lucknow' },
  bareilly: { lat: 28.367, lng: 79.4149, district: 'Bareilly' },
  'kotwali bareilly': { lat: 28.365, lng: 79.412, district: 'Bareilly' },
  baradari: { lat: 28.371, lng: 79.43, district: 'Bareilly' },
  'subhash nagar': { lat: 28.352, lng: 79.405, district: 'Bareilly' },
  izzatnagar: { lat: 28.39, lng: 79.428, district: 'Bareilly' },
  sitapur: { lat: 27.5684, lng: 80.6817, district: 'Sitapur' },
  khairabad: { lat: 27.5333, lng: 80.75, district: 'Sitapur' },
  maholi: { lat: 27.67, lng: 80.47, district: 'Sitapur' },
  sidhauli: { lat: 27.28, lng: 80.83, district: 'Sitapur' },
  biswan: { lat: 27.5, lng: 81.0, district: 'Sitapur' },
  mumbai: { lat: 19.076, lng: 72.8777, district: 'Mumbai' },
  andheri: { lat: 19.1197, lng: 72.8464, district: 'Mumbai' },
};

// Haversine formula for exact distance calculation
const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return `${d.toFixed(1)} km`;
};

// Incident category color scheme per prompt guidelines (Observed data only, not guilt)
const getCategoryColor = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('murder') || cat.includes('homicide') || cat.includes('violent')) {
    return { bg: '#E11D48', label: 'Murder / Violent Incident', border: '#9F1239' };
  }
  if (cat.includes('sexual') || cat.includes('assault')) {
    return { bg: '#7C3AED', label: 'Sexual Offence Incident', border: '#5B21B6' };
  }
  if (cat.includes('theft') || cat.includes('stolen') || cat.includes('property')) {
    return { bg: '#D97706', label: 'Theft / Property Incident', border: '#92400E' };
  }
  if (cat.includes('smuggling') || cat.includes('organised') || cat.includes('extortion')) {
    return { bg: '#059669', label: 'Smuggling / Organised Crime Incident', border: '#065F46' };
  }
  return { bg: '#0284C7', label: 'Financial / General Incident', border: '#0369A1' };
};

export const LiveViewModal: React.FC<LiveViewModalProps> = ({
  isOpen,
  onClose,
  firs,
  locations,
}) => {
  const [step, setStep] = useState<'permission' | 'map'>('permission');
  const [investigatorCoords, setInvestigatorCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setStep('permission');
      setPermissionError(null);
      setSelectedMarker(null);
      setZoomLevel(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Browser Geolocation Trigger
  const handleCurrentLocation = () => {
    setPermissionError(null);
    if (!navigator.geolocation) {
      setPermissionError('Geolocation is not supported by your browser. Please enter location manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInvestigatorCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Current Geolocation (Browser GPS)',
        });
        setStep('map');
        setTimeout(() => setZoomLevel(1.2), 300);
      },
      (err) => {
        let msg = 'Location access denied or unavailable.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permission denied by user. Please use manual location input below.';
        }
        setPermissionError(msg);
      },
      { timeout: 8000 }
    );
  };

  // Manual Location Entry Geocoding
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPermissionError(null);
    const query = manualInput.trim().toLowerCase();
    if (!query) {
      setPermissionError('Please enter a location or district name.');
      return;
    }

    // Try direct Lat, Lng parse
    if (query.includes(',')) {
      const parts = query.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setInvestigatorCoords({
          lat: parts[0],
          lng: parts[1],
          label: `Manual Coordinates (${parts[0].toFixed(3)}, ${parts[1].toFixed(3)})`,
        });
        setStep('map');
        setTimeout(() => setZoomLevel(1.2), 300);
        return;
      }
    }

    // Search in known registry
    for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
      if (query.includes(key) || key.includes(query)) {
        setInvestigatorCoords({
          lat: item.lat,
          lng: item.lng,
          label: `Manual Location: ${item.district}`,
        });
        setStep('map');
        setTimeout(() => setZoomLevel(1.2), 300);
        return;
      }
    }

    // Fallback to Lucknow default if general UP match
    if (query.includes('uttar pradesh') || query.includes('up')) {
      setInvestigatorCoords({
        lat: 26.8467,
        lng: 80.9462,
        label: 'Uttar Pradesh Command Center (Lucknow)',
      });
      setStep('map');
      setTimeout(() => setZoomLevel(1.2), 300);
      return;
    }

    setPermissionError(`Location '${manualInput}' could not be resolved. Please enter a valid UP district (e.g. Lucknow, Bareilly, Sitapur) or lat, lng coordinates.`);
  };

  // Build mapped records with actual coordinates
  const mappedRecords = firs
    .map((fir) => {
      const locName = (fir.incident?.incident_location || fir.administrative?.police_station || '').toLowerCase();
      let coords: { lat: number; lng: number } | null = null;

      for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
        if (locName.includes(key)) {
          coords = { lat: item.lat, lng: item.lng };
          break;
        }
      }

      // District fallback if station name match missed
      if (!coords) {
        const dist = (fir.administrative?.district || '').toLowerCase();
        if (dist.includes('lucknow')) coords = { lat: 26.8467, lng: 80.9462 };
        if (dist.includes('bareilly')) coords = { lat: 28.367, lng: 79.4149 };
        if (dist.includes('sitapur')) coords = { lat: 27.5684, lng: 80.6817 };
      }

      if (!coords) return null;

      const category = fir.incident?.incident_category || 'General';
      const colorScheme = getCategoryColor(category);

      let distanceStr = 'Distance unavailable';
      if (investigatorCoords) {
        distanceStr = calculateHaversineDistance(
          investigatorCoords.lat,
          investigatorCoords.lng,
          coords.lat,
          coords.lng
        );
      }

      return {
        id: fir.fir_id,
        fir_number: fir.fir_number,
        title: fir.incident?.summary || fir.fir_number,
        category,
        colorScheme,
        locationName: fir.incident?.incident_location || fir.administrative?.police_station,
        district: fir.administrative?.district,
        station: fir.administrative?.police_station,
        officer: fir.administrative?.investigating_officer,
        accused: fir.accused.map((a) => a.name).join(', ') || 'Under investigation',
        provisions: fir.legal_provisions.map((p) => p.bns_section).join(', '),
        coords,
        distanceStr,
        caseId: fir.intelligence_links?.case_id || 'N/A',
      };
    })
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-hidden animate-fadeIn select-none">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden relative">
        {/* Header */}
        <div className="p-4 md:px-6 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center shadow-xs">
              <Radio className="w-5 h-5 animate-pulse text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
                  INVESTIGATION LIVE VIEW
                </h2>
                <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                  OBSERVED / RECORDED DATA ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spatial mapping of active intake records &amp; distance vectors from investigator position
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Live View Disclaimer Strip */}
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-6 py-2 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Investigative Visualization Notice:</strong> Map markers display recorded intake data for authorized investigation context. Proximity does not establish criminal activity, culpability, or guilt.
          </span>
        </div>

        {/* Body Content */}
        {step === 'permission' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-50 dark:bg-[#0B0F19]">
            <div className="w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shadow-lg">
              <Compass className="w-8 h-8" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Investigator Location Authorization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select how your operational position should be established for spatial distance calculation. Browser location requires explicit user permission.
              </p>
            </div>

            {permissionError && (
              <div className="max-w-md w-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2.5 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>{permissionError}</div>
              </div>
            )}

            <div className="w-full max-w-md space-y-4">
              {/* Option 1: Browser Geolocation */}
              <button
                type="button"
                onClick={handleCurrentLocation}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 transition-all shadow-md flex items-center justify-center gap-2 font-mono"
              >
                <Navigation className="w-4 h-4 text-cyan-200" />
                <span>1. Use Current Location (Browser GPS)</span>
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                <span>OR</span>
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              {/* Option 2: Manual Location Entry */}
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label className="block text-left text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  2. Enter Location Manually
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Lucknow, Bareilly, Sitapur, or Lat, Lng"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-mono font-semibold transition-all"
                  >
                    Set Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Step 2: Interactive Spatial Map View */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Map Canvas viewport */}
            <div className="flex-1 bg-slate-950 relative flex flex-col justify-between p-4 overflow-hidden">
              {/* Map Controls Header */}
              <div className="relative z-10 flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>{investigatorCoords?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep('permission')}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                  >
                    Change Position
                  </button>
                </div>
              </div>

              {/* Map Visual Component */}
              <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-auto">
                <div
                  className="w-full h-full relative border border-slate-800/80 rounded-2xl bg-[#090D16] overflow-hidden transition-all duration-700"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* Grid Lines */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                      backgroundSize: '40px 40px',
                    }}
                  />

                  {/* Investigator Pulse Location Marker */}
                  <div
                    className="absolute z-20 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                    style={{ top: '48%', left: '50%' }}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-white" />
                    </div>
                    <span className="mt-1 px-2 py-0.5 bg-cyan-950 border border-cyan-500/60 text-cyan-300 text-[10px] font-mono font-bold rounded shadow-md">
                      Investigator Location
                    </span>
                  </div>

                  {/* Mapped Record Markers */}
                  {mappedRecords.map((rec: any, idx: number) => {
                    // Position calculations relative to center
                    const dx = ((rec.coords.lng - (investigatorCoords?.lng || 80.9)) * 1200) % 360;
                    const dy = ((investigatorCoords?.lat || 26.8) - rec.coords.lat) * 1200 % 300;
                    const topPos = Math.max(15, Math.min(85, 48 + dy));
                    const leftPos = Math.max(15, Math.min(85, 50 + dx));

                    return (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedMarker(rec)}
                        style={{ top: `${topPos}%`, left: `${leftPos}%` }}
                        className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-125 flex items-center justify-center"
                          style={{ backgroundColor: rec.colorScheme.bg }}
                        />
                        <span className="mt-1 px-1.5 py-0.5 bg-slate-900/90 border border-slate-700 text-[9px] font-mono text-slate-200 rounded opacity-80 group-hover:opacity-100 transition-opacity">
                          {rec.fir_number} ({rec.distanceStr})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map Footer Category Color Legend */}
              <div className="relative z-10 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
                <span className="text-slate-400 font-bold uppercase">Recorded Categories:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    Murder / Violent
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    Sexual Offence
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    Theft / Property
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Smuggling / Organised
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side Detail Inspector Panel */}
            {selectedMarker ? (
              <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedMarker.colorScheme.bg }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {selectedMarker.fir_number}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Incident Category
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedMarker.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Distance From Investigator Location
                    </span>
                    <span className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                      {selectedMarker.distanceStr}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Location / Station
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                      {selectedMarker.locationName}, {selectedMarker.district} District
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Associated Case ID
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedMarker.caseId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      BNS Provisions
                    </span>
                    <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
                      {selectedMarker.provisions}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Recorded Suspect / POI Intake
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {selectedMarker.accused}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Investigating Officer
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {selectedMarker.officer}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">
                      Epistemic Boundary Notice
                    </span>
                    <span>
                      Record marker displays intake data. Distance and spatial proximity are analytical references and do not represent criminal culpability.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <MapPin className="w-8 h-8 text-slate-400" />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Click any mapped record marker on the spatial canvas to inspect record details and distance vector.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
