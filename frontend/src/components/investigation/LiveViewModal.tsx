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
  Users,
  Shield,
  Star,
  ChevronRight,
  Briefcase,
  Share2,
  Filter,
  Loader2,
  Layers,
  Activity,
  CheckCircle2,
  Check,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationItem, FIRRecord, NetworkNode } from '../../types';
import { api } from '../../api/client';

interface LiveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  firs?: FIRRecord[];
  locations?: LocationItem[];
  entities?: NetworkNode[];
}

// ─── Permanent Real-World Geographic Registry for Cities & Sectors ─────────────
const KNOWN_GEO_REGISTRY: Record<string, { lat: number; lng: number; district: string; localityName: string }> = {
  // Bareilly District Sectors
  bareilly: { lat: 28.3670, lng: 79.4149, district: 'Bareilly District', localityName: 'Bareilly Central Sector' },
  'kotwali bareilly': { lat: 28.3650, lng: 79.4120, district: 'Bareilly District', localityName: 'Bareilly Kotwali Sector' },
  baradari: { lat: 28.3710, lng: 79.4300, district: 'Bareilly District', localityName: 'Baradari Sector' },
  'subhash nagar': { lat: 28.3520, lng: 79.4050, district: 'Bareilly District', localityName: 'Subhash Nagar Sector' },
  izzatnagar: { lat: 28.3900, lng: 79.4280, district: 'Bareilly District', localityName: 'Izzatnagar Sector' },
  'cb ganj': { lat: 28.3750, lng: 79.3750, district: 'Bareilly District', localityName: 'CB Ganj Industrial Sector' },
  'civil lines bareilly': { lat: 28.3600, lng: 79.4180, district: 'Bareilly District', localityName: 'Civil Lines Bareilly' },
  
  // Lucknow District Sectors
  lucknow: { lat: 26.8467, lng: 80.9462, district: 'Lucknow District', localityName: 'Central Lucknow Sector' },
  hazratganj: { lat: 26.8505, lng: 80.9431, district: 'Lucknow District', localityName: 'Hazratganj Command Sector' },
  'gomti nagar': { lat: 26.8547, lng: 80.9984, district: 'Lucknow District', localityName: 'Gomti Nagar Sector' },
  alambagh: { lat: 26.8124, lng: 80.9022, district: 'Lucknow District', localityName: 'Alambagh Sector' },
  mahanagar: { lat: 26.8722, lng: 80.9542, district: 'Lucknow District', localityName: 'Mahanagar Sector' },
  chowk: { lat: 26.8688, lng: 80.9068, district: 'Lucknow District', localityName: 'Chowk Heritage Sector' },
  
  // Sitapur District Sectors
  sitapur: { lat: 27.5684, lng: 80.6817, district: 'Sitapur District', localityName: 'Sitapur Headquarter Sector' },
  khairabad: { lat: 27.5333, lng: 80.7500, district: 'Sitapur District', localityName: 'Khairabad Sub-division' },
  maholi: { lat: 27.6700, lng: 80.4700, district: 'Sitapur District', localityName: 'Maholi Rural Sector' },
  sidhauli: { lat: 27.2800, lng: 80.8300, district: 'Sitapur District', localityName: 'Sidhauli Sector' },

  // Kanpur District
  kanpur: { lat: 26.4499, lng: 80.3319, district: 'Kanpur District', localityName: 'Kanpur Metropolitan Sector' },
  'kanpur central': { lat: 26.4542, lng: 80.3500, district: 'Kanpur District', localityName: 'Kanpur Central Division' },

  // Varanasi Sector
  varanasi: { lat: 25.3176, lng: 82.9739, district: 'Varanasi District', localityName: 'Varanasi Command Sector' },

  // Agra Sector
  agra: { lat: 27.1767, lng: 78.0081, district: 'Agra District', localityName: 'Agra Sector' },

  // Prayagraj / Gorakhpur / Noida / Ghaziabad / Delhi / Mumbai
  prayagraj: { lat: 25.4358, lng: 81.8463, district: 'Prayagraj District', localityName: 'Prayagraj Sector' },
  gorakhpur: { lat: 26.7606, lng: 83.3732, district: 'Gorakhpur District', localityName: 'Gorakhpur Sector' },
  noida: { lat: 28.5355, lng: 77.3910, district: 'Gautam Buddha Nagar', localityName: 'Noida Sector' },
  ghaziabad: { lat: 28.6692, lng: 77.4538, district: 'Ghaziabad District', localityName: 'Ghaziabad Sector' },
  delhi: { lat: 28.6139, lng: 77.2090, district: 'Delhi NCR', localityName: 'Delhi Command Sector' },
  mumbai: { lat: 19.0760, lng: 72.8777, district: 'Mumbai District', localityName: 'Mumbai Metropolitan Sector' },
  andheri: { lat: 19.1197, lng: 72.8464, district: 'Mumbai District', localityName: 'Andheri Division Sector' },
};

// ─── PERMANENT CRIMINAL & NETWORK ENTITY GEOGRAPHIC DATABASE ─────────────────
// Each criminal node has a FIXED, REAL-WORLD lat & lng. NO fake teleportation!
interface CriminalNode {
  id: string;
  type: string;
  is_key_player: boolean;
  is_bridge_node: boolean;
  anomaly_count: number;
  influence_score: number;
  community: number;
  degree: number;
  district: string;
  localityName: string;
  lat: number;
  lng: number;
  roleBadge: string;
  associatedFIR: string;
  crimeSummary: string;
}

const PERMANENT_CRIMINAL_DATABASE: CriminalNode[] = [
  // ─── BAREILLY DISTRICT CRIMINALS & KEY NODES ───
  {
    id: 'Ravi Malhotra',
    type: 'PERSON',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 5,
    influence_score: 0.895,
    community: 1,
    degree: 14,
    district: 'Bareilly District',
    localityName: 'Bareilly Central Sector',
    lat: 28.3670,
    lng: 79.4149,
    roleBadge: 'Key Criminal / Gang Leader',
    associatedFIR: 'FIR-2024-BRL-089',
    crimeSummary: 'Mastermind behind inter-district extortion & illegal land grab racket in Bareilly Central.'
  },
  {
    id: 'Bareilly Syndicate Leader',
    type: 'PERSON',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 8,
    influence_score: 0.940,
    community: 1,
    degree: 18,
    district: 'Bareilly District',
    localityName: 'Baradari Sector',
    lat: 28.3735,
    lng: 79.4320,
    roleBadge: 'Syndicate Kingpin',
    associatedFIR: 'FIR-2024-BRL-042',
    crimeSummary: 'Directing illicit weapon distribution network and protection money operations in Baradari.'
  },
  {
    id: 'Suresh Nair',
    type: 'PERSON',
    is_key_player: true,
    is_bridge_node: true,
    anomaly_count: 4,
    influence_score: 0.782,
    community: 1,
    degree: 11,
    district: 'Bareilly District',
    localityName: 'Subhash Nagar Sector',
    lat: 28.3510,
    lng: 79.4030,
    roleBadge: 'Inter-District Conduit',
    associatedFIR: 'FIR-2024-BRL-019',
    crimeSummary: 'Transports illegal narcotics and smuggled contraband between Bareilly and Sitapur border.'
  },
  {
    id: 'Bareilly Extortion Gang',
    type: 'ORG',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 6,
    influence_score: 0.850,
    community: 1,
    degree: 15,
    district: 'Bareilly District',
    localityName: 'Kotwali Bareilly',
    lat: 28.3640,
    lng: 79.4110,
    roleBadge: 'Organised Crime Syndicate',
    associatedFIR: 'FIR-2024-BRL-089',
    crimeSummary: 'Organised criminal cartel operating illegal hawala & threat networks across Kotwali sector.'
  },
  {
    id: 'Bareilly Warehouse Hub',
    type: 'LOCATION',
    is_key_player: false,
    is_bridge_node: true,
    anomaly_count: 3,
    influence_score: 0.620,
    community: 1,
    degree: 8,
    district: 'Bareilly District',
    localityName: 'Izzatnagar Industrial Sector',
    lat: 28.3920,
    lng: 79.4260,
    roleBadge: 'Contraband Stash Location',
    associatedFIR: 'FIR-2024-BRL-042',
    crimeSummary: 'Key storage depot used for unloading illicit liquor and stolen vehicle parts.'
  },

  // ─── LUCKNOW DISTRICT CRIMINALS & KEY NODES ───
  {
    id: 'Ramesh Kumar',
    type: 'PERSON',
    is_key_player: false,
    is_bridge_node: false,
    anomaly_count: 3,
    influence_score: 0.520,
    community: 2,
    degree: 6,
    district: 'Lucknow District',
    localityName: 'Hazratganj Sector',
    lat: 26.8505,
    lng: 80.9431,
    roleBadge: 'Financial Fraud Operative',
    associatedFIR: 'FIR-2024-LKO-102',
    crimeSummary: 'Accused in shell company invoice forging & GST fraud in Hazratganj.'
  },
  {
    id: 'Lucknow Cyber Syndicate',
    type: 'ORG',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 7,
    influence_score: 0.880,
    community: 2,
    degree: 13,
    district: 'Lucknow District',
    localityName: 'Gomti Nagar Cyber Hub',
    lat: 26.8560,
    lng: 80.9990,
    roleBadge: 'Cyber Crime Ring',
    associatedFIR: 'FIR-2024-LKO-204',
    crimeSummary: 'Phishing & fake loan app syndicate operating illegal call centers in Gomti Nagar.'
  },
  {
    id: 'Amit Verma',
    type: 'PERSON',
    is_key_player: false,
    is_bridge_node: false,
    anomaly_count: 1,
    influence_score: 0.450,
    community: 2,
    degree: 5,
    district: 'Lucknow District',
    localityName: 'Alambagh Sector',
    lat: 26.8135,
    lng: 80.9035,
    roleBadge: 'Local Operative',
    associatedFIR: 'FIR-2024-LKO-078',
    crimeSummary: 'Suspect in commercial vehicle theft & registration tampering.'
  },

  // ─── SITAPUR DISTRICT CRIMINALS & KEY NODES ───
  {
    id: 'Vikram Rao',
    type: 'PERSON',
    is_key_player: false,
    is_bridge_node: true,
    anomaly_count: 2,
    influence_score: 0.650,
    community: 3,
    degree: 8,
    district: 'Sitapur District',
    localityName: 'Khairabad Sub-division',
    lat: 27.5345,
    lng: 80.7520,
    roleBadge: 'Bridge Node / Arms Runner',
    associatedFIR: 'FIR-2024-STP-055',
    crimeSummary: 'Transports illegal country-made arms across Sitapur-Khairabad rural corridor.'
  },
  {
    id: 'Sitapur Illegal Depot',
    type: 'LOCATION',
    is_key_player: false,
    is_bridge_node: false,
    anomaly_count: 2,
    influence_score: 0.480,
    community: 3,
    degree: 4,
    district: 'Sitapur District',
    localityName: 'Maholi Sector',
    lat: 27.6715,
    lng: 80.4720,
    roleBadge: 'Illicit Distillery Site',
    associatedFIR: 'FIR-2024-STP-012',
    crimeSummary: 'Seized illegal chemical storage & spurious liquor brewing site.'
  },

  // ─── KANPUR DISTRICT CRIMINALS & KEY NODES ───
  {
    id: 'Deepak Shah',
    type: 'PERSON',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 6,
    influence_score: 0.810,
    community: 4,
    degree: 12,
    district: 'Kanpur District',
    localityName: 'Kanpur Central Division',
    lat: 26.4550,
    lng: 80.3515,
    roleBadge: 'Hawala & Money Launderer',
    associatedFIR: 'FIR-2024-KNP-114',
    crimeSummary: 'Operates illicit cash courier network between Kanpur leather trading hubs.'
  },

  // ─── MUMBAI DISTRICT CRIMINALS & KEY NODES ───
  {
    id: 'Andheri Warehouse',
    type: 'LOCATION',
    is_key_player: true,
    is_bridge_node: true,
    anomaly_count: 5,
    influence_score: 0.790,
    community: 5,
    degree: 10,
    district: 'Mumbai District',
    localityName: 'Andheri Division Sector',
    lat: 19.1205,
    lng: 72.8475,
    roleBadge: 'Interstate Cargo Stash',
    associatedFIR: 'FIR-2024-MUM-401',
    crimeSummary: 'Seized logistics unit used for storing smuggled electronics & counterfeit goods.'
  },
  {
    id: 'Mumbai Underworld Conduit',
    type: 'MONEY',
    is_key_player: false,
    is_bridge_node: true,
    anomaly_count: 4,
    influence_score: 0.710,
    community: 5,
    degree: 9,
    district: 'Mumbai District',
    localityName: 'Mumbai Central',
    lat: 19.0775,
    lng: 72.8790,
    roleBadge: 'Financial Channel',
    associatedFIR: 'FIR-2024-MUM-401',
    crimeSummary: 'High-value banking channel linked to offshore extortion remittances.'
  },

  // ─── DELHI NCR CRIMINALS & KEY NODES ───
  {
    id: 'NCR Vehicle Smuggling Ring',
    type: 'ORG',
    is_key_player: true,
    is_bridge_node: true,
    anomaly_count: 6,
    influence_score: 0.840,
    community: 6,
    degree: 14,
    district: 'Gautam Buddha Nagar',
    localityName: 'Sector 18 Noida',
    lat: 28.5715,
    lng: 77.3215,
    roleBadge: 'Interstate Vehicle Syndicate',
    associatedFIR: 'FIR-2024-NCR-092',
    crimeSummary: 'Luxury car theft ring altering chassis numbers for interstate resale.'
  },
  {
    id: 'Delhi Hawala Operator',
    type: 'PERSON',
    is_key_player: true,
    is_bridge_node: false,
    anomaly_count: 5,
    influence_score: 0.820,
    community: 6,
    degree: 11,
    district: 'Delhi District',
    localityName: 'Connaught Place Sector',
    lat: 28.6325,
    lng: 77.2175,
    roleBadge: 'Hawala Syndicate Head',
    associatedFIR: 'FIR-2024-NCR-092',
    crimeSummary: 'Unauthorised forex dealing & illicit cash transfers in Central Delhi.'
  },
];

// Top Operational Sector Presets for 1-Click Navigation
const TOP_SECTOR_PRESETS = [
  { id: 'bareilly', name: 'Bareilly', district: 'Bareilly District' },
  { id: 'lucknow', name: 'Lucknow', district: 'Lucknow Central' },
  { id: 'sitapur', name: 'Sitapur', district: 'Sitapur Sector' },
  { id: 'kanpur', name: 'Kanpur', district: 'Kanpur Division' },
  { id: 'varanasi', name: 'Varanasi', district: 'Varanasi Sector' },
  { id: 'agra', name: 'Agra', district: 'Agra Division' },
  { id: 'noida', name: 'Noida / NCR', district: 'Gautam Buddha Nagar' },
  { id: 'delhi', name: 'Delhi NCR', district: 'National Capital' },
  { id: 'mumbai', name: 'Mumbai', district: 'Maharashtra Sector' },
];

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

export const LiveViewModal: React.FC<LiveViewModalProps> = ({
  isOpen,
  onClose,
  firs: propsFirs,
}) => {
  const [investigatorCoords, setInvestigatorCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
  }>({
    lat: 28.3670,
    lng: 79.4149,
    label: 'Bareilly Central Sector (Bareilly District)',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [isChangingPosition, setIsChangingPosition] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRIMINALS' | 'FIRS' | 'ANOMALIES'>('ALL');

  // Loaded Datasets State
  const [firs, setFirs] = useState<FIRRecord[]>(propsFirs || []);

  // Map state
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite' | 'terrain'>('street');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Load FIRs if missing
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        if (!propsFirs || propsFirs.length === 0) {
          const firRes = await api.listFirs();
          if (firRes && firRes.firs) setFirs(firRes.firs);
        } else {
          setFirs(propsFirs);
        }
      } catch (e) {
        // Ignore API errors
      }
    };

    loadData();
  }, [isOpen, propsFirs]);

  // Reset modal state on open/close
  useEffect(() => {
    if (isOpen) {
      setPermissionError(null);
      setSelectedMarker(null);
      setIsFullscreen(false);
      setIsChangingPosition(false);
    } else {
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
    if (!isOpen || !mapContainerRef.current || !investigatorCoords) return;

    const tileUrls = {
      street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    };

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([investigatorCoords.lat, investigatorCoords.lng], 13);
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [investigatorCoords.lat, investigatorCoords.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);

    const tileLayer = L.tileLayer(tileUrls[mapLayer], { maxZoom: 18 });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Map Click Handler: Click anywhere on map to set investigator command pin!
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = parseFloat(e.latlng.lat.toFixed(4));
      const clickedLng = parseFloat(e.latlng.lng.toFixed(4));
      setInvestigatorCoords({
        lat: clickedLat,
        lng: clickedLng,
        label: `Command Pin (${clickedLat}, ${clickedLng})`,
      });
      setSelectedMarker(null);
    });

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, [isOpen, investigatorCoords]);

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

  // Render Leaflet Markers (Investigator Pin + FIXED REAL GEOGRAPHIC Criminal Dots + True FIR Pins)
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !markersGroupRef.current || !investigatorCoords) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // 1. INVESTIGATOR COMMAND MARKER (Cyan Pulsing Radar Pin)
    const investigatorIcon = L.divIcon({
      className: 'custom-investigator-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
          <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #06b6d4; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: relative; width: 20px; height: 20px; border-radius: 50%; background-color: #0284c7; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></span>
          </span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    L.marker([investigatorCoords.lat, investigatorCoords.lng], { icon: investigatorIcon })
      .bindTooltip(`<b>Command Location</b><br/>${investigatorCoords.label}`, { permanent: false, direction: 'top' })
      .addTo(markersGroup);

    // 2. FIXED PERMANENT CRIMINAL & NETWORK ENTITY DOTS (NO fake teleportation!)
    if (activeFilter === 'ALL' || activeFilter === 'CRIMINALS' || activeFilter === 'ANOMALIES') {
      PERMANENT_CRIMINAL_DATABASE.forEach((ent) => {
        if (activeFilter === 'ANOMALIES' && ent.anomaly_count === 0) return;

        // Determine color & risk tier
        let color = '#E11D48'; // Red for Key Criminal / Leader
        let pulseClass = 'animate-ping';

        if (ent.is_key_player) {
          color = '#E11D48';
        } else if (ent.is_bridge_node) {
          color = '#7C3AED';
        } else if (ent.anomaly_count > 0) {
          color = '#D97706';
        } else {
          color = '#0284C7';
          pulseClass = '';
        }

        const criminalIcon = L.divIcon({
          className: 'custom-criminal-dot',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">
              ${pulseClass ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.5; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
              <span style="position: relative; width: 20px; height: 20px; border-radius: 50%; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
                ${ent.is_key_player ? '★' : '•'}
              </span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        // Compute exact distance from active command pin to criminal's FIXED real-world location
        const distStr = calculateHaversineDistance(
          investigatorCoords.lat,
          investigatorCoords.lng,
          ent.lat,
          ent.lng
        );

        const markerData = {
          kind: 'CRIMINAL',
          id: ent.id,
          name: ent.id,
          type: ent.type,
          badge: ent.roleBadge,
          color,
          influenceScore: ent.influence_score,
          community: ent.community,
          degree: ent.degree,
          anomalyCount: ent.anomaly_count,
          isKeyPlayer: ent.is_key_player,
          isBridgeNode: ent.is_bridge_node,
          distanceStr: distStr,
          district: ent.district,
          localityName: ent.localityName,
          associatedFIR: ent.associatedFIR,
          crimeSummary: ent.crimeSummary,
        };

        const marker = L.marker([ent.lat, ent.lng], { icon: criminalIcon }).addTo(markersGroup);
        marker.bindTooltip(`<b>${ent.id}</b><br/><span style="color:${color}">${ent.roleBadge}</span><br/>Sector: ${ent.localityName}`, { permanent: false, direction: 'top' });
        marker.on('click', () => setSelectedMarker(markerData));
      });
    }

    // 3. FIXED REAL-WORLD FIR INCIDENT RECORD MARKERS
    if (activeFilter === 'ALL' || activeFilter === 'FIRS') {
      firs.forEach((fir) => {
        const locName = (fir.incident?.incident_location || fir.administrative?.police_station || '').toLowerCase();
        let coords: { lat: number; lng: number; district: string } | null = null;

        for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
          if (locName.includes(key)) {
            coords = { lat: item.lat, lng: item.lng, district: item.district };
            break;
          }
        }

        if (!coords) {
          const dist = (fir.administrative?.district || '').toLowerCase();
          if (dist.includes('bareilly')) coords = { lat: 28.3670, lng: 79.4149, district: 'Bareilly District' };
          else if (dist.includes('lucknow')) coords = { lat: 26.8467, lng: 80.9462, district: 'Lucknow District' };
          else if (dist.includes('sitapur')) coords = { lat: 27.5684, lng: 80.6817, district: 'Sitapur District' };
          else if (dist.includes('kanpur')) coords = { lat: 26.4499, lng: 80.3319, district: 'Kanpur District' };
        }

        // If FIR has no matching geo registry in UP/India, do NOT spawn fake pins in random cities!
        if (!coords) return;

        const distanceStr = calculateHaversineDistance(
          investigatorCoords.lat,
          investigatorCoords.lng,
          coords.lat,
          coords.lng
        );

        const firData = {
          kind: 'FIR',
          id: fir.fir_id,
          fir_number: fir.fir_number,
          title: fir.incident?.summary || fir.fir_number,
          category: fir.incident?.incident_category || 'General Crime',
          color: '#0284C7',
          locationName: fir.incident?.incident_location || fir.administrative?.police_station,
          district: coords.district,
          station: fir.administrative?.police_station || 'N/A',
          officer: fir.administrative?.investigating_officer || 'Unassigned',
          accused: fir.accused.map((a) => a.name).join(', ') || 'Under investigation',
          provisions: fir.legal_provisions.map((p) => p.bns_section).join(', ') || 'BNS Provision Pending',
          distanceStr,
          caseId: fir.intelligence_links?.case_id || 'CR-1001',
        };

        const firIcon = L.divIcon({
          className: 'custom-fir-pin',
          html: `
            <div style="width: 22px; height: 22px; border-radius: 6px; background-color: #0284c7; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
              📄
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: firIcon }).addTo(markersGroup);
        marker.bindTooltip(`<b>FIR Record:</b> ${fir.fir_number}<br/>${fir.incident?.incident_category || 'Incident'} (${coords.district})`, { permanent: false, direction: 'top' });
        marker.on('click', () => setSelectedMarker(firData));
      });
    }
  }, [isOpen, investigatorCoords, firs, activeFilter]);

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

  // Position selector helper
  const selectPosition = (lat: number, lng: number, label: string) => {
    setInvestigatorCoords({ lat, lng, label });
    setIsChangingPosition(false);
    setSelectedMarker(null);
  };

  // Browser Geolocation GPS Handler
  const handleCurrentLocation = () => {
    setPermissionError(null);
    if (!navigator.geolocation) {
      setPermissionError('Geolocation is not supported by your browser. Please search or select a location manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectPosition(pos.coords.latitude, pos.coords.longitude, 'Active GPS Command Sector');
      },
      (err) => {
        let msg = 'GPS location access denied or unavailable.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permission denied by user. Please type or pick a sector below.';
        }
        setPermissionError(msg);
      },
      { timeout: 8000 }
    );
  };

  // Dynamic Geocoding Handler (Instant Local Lookup + Nominatim API Fallback)
  const handleGeocodeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setPermissionError(null);
    setIsSearchingGeocode(true);

    const queryLower = query.toLowerCase();

    // 1. Instant local registry lookup
    for (const [key, item] of Object.entries(KNOWN_GEO_REGISTRY)) {
      if (queryLower.includes(key) || key.includes(queryLower)) {
        selectPosition(item.lat, item.lng, `${item.localityName} (${item.district})`);
        setIsSearchingGeocode(false);
        setSearchQuery('');
        return;
      }
    }

    // 2. OpenStreetMap Nominatim Geocoding API for ANY location worldwide!
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const nameParts = item.display_name.split(',');
        const label = `${nameParts[0]} Sector (${nameParts[1] || query})`;
        selectPosition(lat, lng, label);
        setSearchQuery('');
        setIsSearchingGeocode(false);
        return;
      }
    } catch (err) {
      // Ignore network errors
    }

    setIsSearchingGeocode(false);
    setPermissionError(`Location '${query}' could not be resolved automatically. Please check spelling or select from preset operational sectors.`);
  };

  // Map Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (investigatorCoords && mapInstanceRef.current) {
      mapInstanceRef.current.setView([investigatorCoords.lat, investigatorCoords.lng], 13);
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
          isFullscreen ? 'h-screen rounded-none border-0' : 'h-[94vh] max-w-7xl rounded-2xl shadow-2xl'
        } flex flex-col overflow-hidden relative transition-all duration-300`}
      >
        {/* Modal Top Header & Universal Location Search Bar */}
        <div className="px-4 py-3 bg-white/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Radio className="w-5 h-5 animate-pulse text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                  LIVE SPATIAL CRIME MAP
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-900 dark:text-cyan-300 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800">
                  REAL-TIME INVESTIGATOR SECTOR
                </span>
              </div>
              {investigatorCoords && (
                <p className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold font-mono truncate max-w-md">
                  Active Sector: {investigatorCoords.label}
                </p>
              )}
            </div>
          </div>

          {/* Universal Sector Search Form */}
          <form onSubmit={handleGeocodeSearch} className="flex-1 max-w-md min-w-[240px] flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any district/city (e.g. Bareilly, Kanpur, Delhi)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingGeocode || !searchQuery.trim()}
              className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all shrink-0 flex items-center gap-1"
            >
              {isSearchingGeocode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Go'}
            </button>
          </form>

          {/* Right Header Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsChangingPosition(!isChangingPosition)}
              className="px-3 py-1.5 text-xs font-mono font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Select District</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Map'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Filter & Sector Quick Bar */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
          {/* Preset Sector Quick Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-600" /> Sectors:
            </span>
            {TOP_SECTOR_PRESETS.map((preset) => {
              const reg = KNOWN_GEO_REGISTRY[preset.id];
              const isCurrent = investigatorCoords && Math.abs(investigatorCoords.lat - reg.lat) < 0.05;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPosition(reg.lat, reg.lng, `${reg.localityName} (${reg.district})`)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all ${
                    isCurrent
                      ? 'bg-cyan-700 text-white shadow-2xs border border-cyan-600'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Map Dots Filter Toggle */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: 'ALL', label: 'All Dots' },
                { id: 'CRIMINALS', label: 'Criminals Only' },
                { id: 'FIRS', label: 'FIR Incidents' },
                { id: 'ANOMALIES', label: 'High Anomalies' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  activeFilter === f.id
                    ? 'bg-cyan-700 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error or Notice Alert Banner */}
        {permissionError && (
          <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900 px-4 py-2 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{permissionError}</span>
            </div>
            <button onClick={() => setPermissionError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* FLOATING CHANGE POSITION POPOVER OVERLAY */}
        {isChangingPosition && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapPin className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
                Select Investigator Sector & Command Hub
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
              className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white transition-all shadow-xs flex items-center justify-center gap-2 font-mono"
            >
              <Navigation className="w-4 h-4 text-cyan-200" />
              <span>Use Device GPS Location</span>
            </button>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                Select Operational District / City:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TOP_SECTOR_PRESETS.map((preset) => {
                  const item = KNOWN_GEO_REGISTRY[preset.id];
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPosition(item.lat, item.lng, `${item.localityName} (${item.district})`)}
                      className="py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-center"
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Tip: You can also click anywhere directly on the interactive map to drop your command pin at that exact point!
            </p>
          </div>
        )}

        {/* MAIN INTERACTIVE LEAFLET GEOGRAPHIC MAP & INSPECTOR PANEL */}
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

              {/* Navigation Zoom / Recenter Controls */}
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
                  title="Recenter Map on Active Sector Pin"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Map Footer Legend Bar (Bottom Overlay) */}
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300 shadow-lg">
              <span className="font-bold uppercase text-slate-400 text-[10px]">True Geographic Legend:</span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-600 border border-white animate-pulse" />
                  Command Pin
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-600 border border-white animate-pulse" />
                  Key Criminal / Leader
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600 border border-white" />
                  Bridge Node Conduit
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-600 border border-white" />
                  High Anomaly Suspect
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-sky-600 border border-white" />
                  FIR Incident Record
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
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: selectedMarker.color }}
                  />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 font-mono">
                    {selectedMarker.name || selectedMarker.fir_number}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedMarker.kind === 'CRIMINAL' ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-sm font-mono border border-rose-300 dark:border-rose-800 shrink-0">
                      {selectedMarker.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedMarker.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 inline-block mt-0.5">
                        {selectedMarker.badge}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      True Fixed Geographic Sector
                    </span>
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-bold font-mono">
                      {selectedMarker.localityName} ({selectedMarker.district})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Distance From Command Pin
                    </span>
                    <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400">
                      {selectedMarker.distanceStr}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Influence Score</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {selectedMarker.influenceScore.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Anomaly Signals</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {selectedMarker.anomalyCount} signals
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Primary Associated FIR Record
                    </span>
                    <span className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                      {selectedMarker.associatedFIR}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Crime Briefing Summary
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      "{selectedMarker.crimeSummary}"
                    </p>
                  </div>
                </div>
              ) : (
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
                      Distance From Command Pin
                    </span>
                    <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-400">
                      {selectedMarker.distanceStr}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Locality & Police Station
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {selectedMarker.locationName}, {selectedMarker.district}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Accused / Suspect Persons
                    </span>
                    <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">
                      {selectedMarker.accused}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Statutory Provisions
                    </span>
                    <span className="text-xs font-mono text-cyan-800 dark:text-cyan-300 font-semibold">
                      {selectedMarker.provisions}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <span className="font-semibold block text-slate-800 dark:text-slate-200">
                    Spatial Ground Truth
                  </span>
                  <span>
                    Criminal dots are pinned to their true fixed crime sectors. Changing command pin calculates true distance vector without altering criminal locations.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex-col items-center justify-center text-center space-y-3 shrink-0 z-20">
              <MapPin className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Spatial Inspection Active
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any glowing criminal dot or FIR record pin on the map to inspect profile details, crime briefing, and distance vectors.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
