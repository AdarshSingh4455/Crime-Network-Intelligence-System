import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  MapPin,
  Navigation,
  X,
  AlertTriangle,
  Compass,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  Globe,
  Mountain,
  Map as MapIcon,
  Search,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationItem, FIRRecord } from '../../types';

interface LiveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  firs: FIRRecord[];
  locations: LocationItem[];
}

// Known geographic locality registry for UP operational sectors (No fake coords)
const KNOWN_GEO_REGISTRY: Record<string, { lat: number; lng: number; district: string; localityName: string }> = {
  lucknow: { lat: 26.8467, lng: 80.9462, district: 'Lucknow', localityName: 'Central Lucknow Sector' },
  hazratganj: { lat: 26.8505, lng: 80.9431, district: 'Lucknow', localityName: 'Hazratganj Command Sector' },
  'gomti nagar': { lat: 26.8547, lng: 80.9984, district: 'Lucknow', localityName: 'Gomti Nagar Sector' },
  alambagh: { lat: 26.8124, lng: 80.9022, district: 'Lucknow', localityName: 'Alambagh Sector' },
  mahanagar: { lat: 26.8722, lng: 80.9542, district: 'Lucknow', localityName: 'Mahanagar Sector' },
  chowk: { lat: 26.8688, lng: 80.9068, district: 'Lucknow', localityName: 'Chowk Heritage Sector' },
  bareilly: { lat: 28.367, lng: 79.4149, district: 'Bareilly', localityName: 'Bareilly Central Sector' },
  'kotwali bareilly': { lat: 28.365, lng: 79.412, district: 'Bareilly', localityName: 'Bareilly Kotwali Sector' },
  baradari: { lat: 28.371, lng: 79.43, district: 'Bareilly', localityName: 'Baradari Sector' },
  'subhash nagar': { lat: 28.352, lng: 79.405, district: 'Bareilly', localityName: 'Subhash Nagar Sector' },
  izzatnagar: { lat: 28.39, lng: 79.428, district: 'Bareilly', localityName: 'Izzatnagar Sector' },
  sitapur: { lat: 27.5684, lng: 80.6817, district: 'Sitapur', localityName: 'Sitapur Headquarter Sector' },
  khairabad: { lat: 27.5333, lng: 80.75, district: 'Sitapur', localityName: 'Khairabad Sub-division' },
  maholi: { lat: 27.67, lng: 80.47, district: 'Sitapur', localityName: 'Maholi Rural Sector' },
  sidhauli: { lat: 27.28, lng: 80.83, district: 'Sitapur', localityName: 'Sidhauli Sector' },
  biswan: { lat: 27.5, lng: 81.0, district: 'Sitapur', localityName: 'Biswan Sector' },
  mumbai: { lat: 19.076, lng: 72.8777, district: 'Mumbai', localityName: 'Mumbai Metropolitan Sector' },
  andheri: { lat: 19.1197, lng: 72.8464, district: 'Mumbai', localityName: 'Andheri Division Sector' },
};

// Haversine formula for exact distance calculation in km
const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const R = 6371; // Radius of Earth in km
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

// Incident category color scheme
const getCategoryColor = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('murder') || cat.includes('homicide') || cat.includes('violent')) {
    return { bg: '#E11D48', border: '#9F1239', label: 'Violent / Murder Record' };
  }
  if (cat.includes('sexual') || cat.includes('assault')) {
    return { bg: '#7C3AED', border: '#5B21B6', label: 'Sexual Offence Record' };
  }
  if (cat.includes('theft') || cat.includes('stolen') || cat.includes('property')) {
    return { bg: '#D97706', border: '#92400E', label: 'Theft / Property Record' };
  }
  if (cat.includes('smuggling') || cat.includes('organised') || cat.includes('extortion')) {
    return { bg: '#059669', border: '#065F46', label: 'Smuggling / Organised Crime Record' };
  }
  return { bg: '#0284C7', border: '#0369A1', label: 'Financial / General Record' };
};

export const LiveViewModal: React.FC<LiveViewModalProps> = ({
  isOpen,
  onClose,
  firs,
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
  const [isChangingPosition, setIsChangingPosition] = useState<boolean>(false);
  const [tileErrorNotice, setTileErrorNotice] = useState<boolean>(false);

  // Map state
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite' | 'terrain'>('street');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      if (!investigatorCoords) {
        setStep('permission');
      } else {
        setStep('map');
      }
      setPermissionError(null);
      setSelectedMarker(null);
      setIsFullscreen(false);
      setIsChangingPosition(false);
      setTileErrorNotice(false);
    } else {
      // Cleanup Leaflet instance when modal closes completely
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersGroupRef.current = null;
      }
    }
  }, [isOpen]);

  // Leaflet Map Initialization & Recenter Lifecycle
  useEffect(() => {
    if (step !== 'map' || !mapContainerRef.current || !investigatorCoords) return;

    const tileUrls = {
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    };

    // If map instance ALREADY exists, simply update center & view smoothly!
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([investigatorCoords.lat, investigatorCoords.lng], 12);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      return;
    }

    // Initialize new Leaflet map instance for container
    const map = L.map(mapContainerRef.current, {
      center: [investigatorCoords.lat, investigatorCoords.lng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);

    const tileLayer = L.tileLayer(tileUrls[mapLayer], {
      maxZoom: 18,
    });

    tileLayer.on('tileerror', () => {
      setTileErrorNotice(true);
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    // Cleanup when step changes or container unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, [step, investigatorCoords]);

  // Update Map Layer Tile URL
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileUrls = {
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    };
    tileLayerRef.current.setUrl(tileUrls[mapLayer]);
  }, [mapLayer]);

  // Render Leaflet Markers
  useEffect(() => {
    if (step !== 'map' || !mapInstanceRef.current || !markersGroupRef.current || !investigatorCoords) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // 1. Investigator Marker (Cyan Pulsing Pin)
    const investigatorIcon = L.divIcon({
      className: 'custom-investigator-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #06b6d4; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: relative; width: 16px; height: 16px; border-radius: 50%; background-color: #0891b2; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([investigatorCoords.lat, investigatorCoords.lng], { icon: investigatorIcon })
      .bindTooltip('Investigator Command Location', { permanent: false, direction: 'top' })
      .addTo(markersGroup);

    // 2. FIR Record Markers
    firs.forEach((fir) => {
      const locName = (fir.incident?.incident_location || fir.administrative?.police_station || '').toLowerCase();
      let coords: { lat: number; lng: number } | null = null;

      for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
        if (locName.includes(key)) {
          coords = { lat: item.lat, lng: item.lng };
          break;
        }
      }

      if (!coords) {
        const dist = (fir.administrative?.district || '').toLowerCase();
        if (dist.includes('lucknow')) coords = { lat: 26.8467, lng: 80.9462 };
        if (dist.includes('bareilly')) coords = { lat: 28.367, lng: 79.4149 };
        if (dist.includes('sitapur')) coords = { lat: 27.5684, lng: 80.6817 };
      }

      if (!coords) return;

      const category = fir.incident?.incident_category || 'General';
      const colorScheme = getCategoryColor(category);
      const distanceStr = calculateHaversineDistance(
        investigatorCoords.lat,
        investigatorCoords.lng,
        coords.lat,
        coords.lng
      );

      const recordData = {
        id: fir.fir_id,
        fir_number: fir.fir_number,
        title: fir.incident?.summary || fir.fir_number,
        category,
        colorScheme,
        locationName: fir.incident?.incident_location || fir.administrative?.police_station,
        district: fir.administrative?.district || 'Uttar Pradesh',
        station: fir.administrative?.police_station || 'N/A',
        officer: fir.administrative?.investigating_officer || 'Unassigned',
        accused: fir.accused.map((a) => a.name).join(', ') || 'Under investigation',
        provisions: fir.legal_provisions.map((p) => p.bns_section).join(', ') || 'BNS Provision Pending',
        distanceStr,
        caseId: fir.intelligence_links?.case_id || 'N/A',
      };

      const recordIcon = L.divIcon({
        className: 'custom-record-pin',
        html: `
          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: ${colorScheme.bg}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35); cursor: pointer; transition: transform 0.2s;"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: recordIcon }).addTo(markersGroup);

      marker.on('click', () => {
        setSelectedMarker(recordData);
      });
    });
  }, [step, investigatorCoords, firs]);

  // Handle Fullscreen Invalidate Size
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  }, [isFullscreen]);

  if (!isOpen) return null;

  // Select new position helper
  const selectPosition = (lat: number, lng: number, label: string) => {
    setInvestigatorCoords({ lat, lng, label });
    setStep('map');
    setIsChangingPosition(false);
    setSelectedMarker(null);
  };

  // Browser GPS Geolocation Handler
  const handleCurrentLocation = () => {
    setPermissionError(null);
    if (!navigator.geolocation) {
      setPermissionError('Geolocation is not supported by your browser. Please select or enter a location manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectPosition(pos.coords.latitude, pos.coords.longitude, 'Active GPS Geolocation Sector');
      },
      (err) => {
        let msg = 'Location access denied or unavailable.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permission denied by user. Please select an operational zone or enter a location manually.';
        }
        setPermissionError(msg);
      },
      { timeout: 8000 }
    );
  };

  // Manual Location Geocoding Resolver
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPermissionError(null);
    const query = manualInput.trim().toLowerCase();
    if (!query) {
      setPermissionError('Please select or type an operational district or sector name.');
      return;
    }

    for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
      if (query.includes(key) || key.includes(query)) {
        selectPosition(item.lat, item.lng, `${item.localityName} (${item.district} District)`);
        return;
      }
    }

    if (query.includes('uttar pradesh') || query.includes('up')) {
      selectPosition(26.8467, 80.9462, 'Uttar Pradesh State Command Sector (Lucknow)');
      return;
    }

    setPermissionError(`Location '${manualInput}' could not be resolved. Please select a valid district (e.g. Lucknow, Bareilly, Sitapur).`);
  };

  // Map Navigation Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (investigatorCoords && mapInstanceRef.current) {
      mapInstanceRef.current.setView([investigatorCoords.lat, investigatorCoords.lng], 12);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      } overflow-hidden transition-all duration-300 select-none`}
    >
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${
          isFullscreen ? 'h-screen rounded-none border-0' : 'h-[92vh] max-w-6xl rounded-2xl shadow-2xl'
        } flex flex-col overflow-hidden relative transition-all duration-300`}
      >
        {/* Modal Header Bar */}
        <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Radio className="w-4 h-4 animate-pulse text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                  INVESTIGATION LIVE VIEW
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                  OBSERVED / RECORDED DATA ONLY
                </span>
              </div>
              {step === 'map' && investigatorCoords && (
                <p className="text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold font-mono">
                  Operational Sector: {investigatorCoords.label}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 'map' && (
              <>
                <button
                  type="button"
                  onClick={() => setIsChangingPosition(!isChangingPosition)}
                  className="px-2.5 py-1 text-xs font-mono font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Change Position</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                  title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Map'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Epistemic Statutory Disclaimer Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium">
              <strong>Investigative Visualization Notice:</strong> Markers display authorized intake location contexts. Proximity does not establish criminal activity, culpability, or guilt.
            </span>
          </div>

          {tileErrorNotice && (
            <span className="hidden md:inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 rounded text-[10px] font-mono border border-amber-300 dark:border-amber-700">
              Map tiles temporarily unavailable. Recorded markers active.
            </span>
          )}
        </div>

        {/* FLOATING CHANGE POSITION POPOVER OVERLAY */}
        {isChangingPosition && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-md w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Select New Investigator Position
              </h4>
              <button
                type="button"
                onClick={() => setIsChangingPosition(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCurrentLocation}
              className="w-full py-2 px-3 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 transition-all shadow-xs flex items-center justify-center gap-2 font-mono"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-200" />
              <span>Use Current GPS Location</span>
            </button>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { name: 'Lucknow', label: 'Lucknow Sector' },
                { name: 'Bareilly', label: 'Bareilly Sector' },
                { name: 'Sitapur', label: 'Sitapur Sector' },
              ].map((zone) => (
                <button
                  key={zone.name}
                  type="button"
                  onClick={() => {
                    const item = KNOWN_GEO_REGISTRY[zone.name.toLowerCase()];
                    selectPosition(item.lat, item.lng, `${item.localityName} (${item.district} District)`);
                  }}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-2xs text-center"
                >
                  {zone.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Locality (e.g. Hazratganj, Gomti Nagar)..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold transition-all"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 1: INITIAL PERMISSION & SECTOR SELECTION */}
        {step === 'permission' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-slate-50 dark:bg-[#0B0F19] overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shadow-md">
              <Compass className="w-7 h-7" />
            </div>

            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Investigator Location Authorization
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Establish your operational command position to map distance vectors and sector context.
              </p>
            </div>

            {permissionError && (
              <div className="max-w-md w-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2.5 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>{permissionError}</div>
              </div>
            )}

            <div className="w-full max-w-md space-y-4">
              {/* Option 1: Browser GPS */}
              <button
                type="button"
                onClick={handleCurrentLocation}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 transition-all shadow-md flex items-center justify-center gap-2 font-mono"
              >
                <Navigation className="w-4 h-4 text-cyan-200" />
                <span>Use Current Location (Browser GPS)</span>
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-400 font-mono">
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                <span>OR SELECT OPERATIONAL ZONE</span>
                <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              {/* Option 2: Quick District Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Lucknow', label: 'Lucknow Sector' },
                  { name: 'Bareilly', label: 'Bareilly Sector' },
                  { name: 'Sitapur', label: 'Sitapur Sector' },
                ].map((zone) => (
                  <button
                    key={zone.name}
                    type="button"
                    onClick={() => {
                      const item = KNOWN_GEO_REGISTRY[zone.name.toLowerCase()];
                      selectPosition(item.lat, item.lng, `${item.localityName} (${item.district} District)`);
                    }}
                    className="py-2 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
                  >
                    {zone.name}
                  </button>
                ))}
              </div>

              {/* Option 3: Manual Input */}
              <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type locality name (e.g. Hazratganj, Gomti Nagar, Khairabad)..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* STEP 2: INTERACTIVE LEAFLET GEOGRAPHIC MAP */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Map Container Viewport */}
            <div className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden">
              {/* Interactive Leaflet Map Div */}
              <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

              {/* FLOATING MAP CONTROLS OVERLAY (Top Right) */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                {/* Layer Switcher Control */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg flex items-center gap-1">
                  {(
                    [
                      { id: 'street', label: 'Street', icon: MapIcon },
                      { id: 'satellite', label: 'Satellite', icon: Globe },
                      { id: 'terrain', label: 'Terrain', icon: Mountain },
                    ] as const
                  ).map((layer) => {
                    const IconComp = layer.icon;
                    const isActive = mapLayer === layer.id;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setMapLayer(layer.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-cyan-700 text-white shadow-2xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{layer.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Zoom / Recenter / Position Controls */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-lg flex flex-col gap-1 self-end">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Zoom In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-t border-slate-800"
                    title="Zoom Out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRecenter}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-t border-slate-800"
                    title="Recenter Map on Investigator Location"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Map Footer Category Legend Bar (Bottom Overlay) */}
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300 shadow-lg">
                <span className="font-bold uppercase text-slate-400 text-[10px]">Record Context Categories:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white" />
                    Violent / Murder
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-white" />
                    Sexual Offence
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 border border-white" />
                    Theft / Property
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white" />
                    Smuggling / Organised
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE DETAIL INSPECTOR PANEL */}
            {selectedMarker ? (
              <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-5 space-y-4 overflow-y-auto shrink-0 z-20 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedMarker.colorScheme.bg }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 font-mono">
                      {selectedMarker.fir_number}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Incident Category
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedMarker.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Distance From Investigator Location
                    </span>
                    <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400">
                      {selectedMarker.distanceStr}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Locality & Station Context
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {selectedMarker.locationName}, {selectedMarker.district} District
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Associated Case ID
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedMarker.caseId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Statutory BNS Provisions
                    </span>
                    <span className="text-xs font-mono text-cyan-800 dark:text-cyan-300 font-semibold">
                      {selectedMarker.provisions}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Recorded Suspect / POI Intake
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {selectedMarker.accused}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Investigating Officer
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {selectedMarker.officer}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">
                      Statutory Safeguard Notice
                    </span>
                    <span>
                      Record marker displays intake data. Spatial distance vectors are analytical references only and do not establish criminal activity or guilt.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex-col items-center justify-center text-center space-y-3 shrink-0 z-20">
                <MapPin className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Click any mapped record marker on the geographic map to inspect intake details and distance vector.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
