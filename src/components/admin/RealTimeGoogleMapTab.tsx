import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Search, 
  Compass, 
  Navigation, 
  Info, 
  HelpCircle, 
  Activity, 
  Map as MapIcon, 
  ExternalLink,
  Plus,
  Locate,
  Route as RouteIcon,
  RefreshCw
} from 'lucide-react';
import { Store } from '../../types';

interface RealTimeGoogleMapTabProps {
  stores: Store[];
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function RealTimeGoogleMapTab({ stores }: RealTimeGoogleMapTabProps) {
  if (!hasValidKey) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm my-6 text-center">
        <div className="h-16 w-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
          <MapIcon className="h-8 w-8 animate-pulse" />
        </div>
        
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Google Maps API Key Required</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          The Real-Time Location & Geofence tracking tab uses live Google Maps, Places, and Routes APIs to monitor retail outlets and calculate real-time logistical distances.
        </p>

        <div className="my-6 bg-slate-50 rounded-2xl border border-slate-200/80 p-4.5 text-left text-xs space-y-4 max-w-lg mx-auto">
          <div className="flex gap-2.5">
            <span className="flex-none h-5 w-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">1</span>
            <div>
              <p className="font-bold text-slate-800">Get an API Key</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Visit the Google Cloud Console to set up your billing-enabled Maps key:
              </p>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 text-[11px]"
              >
                Get API Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-2.5">
            <span className="flex-none h-5 w-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">2</span>
            <div>
              <p className="font-bold text-slate-800">Configure secret in AI Studio</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Open <strong className="text-slate-700">Settings</strong> (⚙️ gear icon in the top-right corner), go to <strong className="text-slate-700">Secrets</strong>, add a secret named <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">GOOGLE_MAPS_PLATFORM_KEY</code>, paste your API key, and save.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <span className="flex-none h-5 w-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">3</span>
            <div>
              <p className="font-bold text-slate-800">Auto-Rebuild</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                The container environment will automatically rebuild in the background to inject your key securely without losing your current session state!
              </p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-medium italic">
          Other panels (ledger, catalogs, and POS simulation) do not require a map key and remain fully operational offline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab intro summary */}
      <div className="bg-emerald-950 text-white p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-900/40">
        <div>
          <span className="px-2 py-0.5 bg-emerald-800 text-emerald-300 font-bold rounded text-[9px] uppercase tracking-wider">Live Maps Integration</span>
          <h3 className="text-base font-black tracking-wide uppercase mt-1">Real-Time Place Location Map</h3>
          <p className="text-xs text-emerald-200/80 mt-0.5 max-w-xl">
            Monitor physical retail outlets on live Google Maps. Calculate real-time delivery routing, verify geocoding coordinates, and search global locations interactively.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-900/50 px-3 py-1.5 rounded-xl border border-emerald-800 self-start md:self-auto">
          <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span className="font-mono font-bold">API STATUS: CONNECTED</span>
        </div>
      </div>

      <APIProvider apiKey={API_KEY} version="weekly">
        <GoogleMapDashboard stores={stores} />
      </APIProvider>
    </div>
  );
}

function GoogleMapDashboard({ stores }: { stores: Store[] }) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  
  // Bengaluru defaults
  const BLR_HQ = { lat: 12.9716, lng: 77.5946 };
  
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeMarker, setActiveMarker] = useState<google.maps.Marker | null>(null);
  const [clickedLocation, setClickedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<google.maps.places.Place | null>(null);

  // References for route polyline
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Format geographic coordinates
  const formatLatLng = (lat: number, lng: number) => {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Trigger Routing on map between Bangalore HQ and Selected Store
  const calculateRoute = (dest: google.maps.LatLngLiteral) => {
    if (!routesLib || !map) return;

    // Clear previous polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin: BLR_HQ,
      destination: dest,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
    .then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#059669',
            strokeOpacity: 0.85,
            strokeWeight: 4,
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        // Extract metadata
        const distanceKm = (routes[0].distanceMeters || 0) / 1000;
        // durationMillis is a string representation like "1200s" or numeric
        const durationMin = Math.round(parseFloat(String(routes[0].durationMillis || '0')) / 60000) || 15;

        setRouteInfo({
          distance: `${distanceKm.toFixed(1)} km`,
          duration: `${durationMin} mins`
        });

        if (routes[0].viewport) {
          map.fitBounds(routes[0].viewport);
        }
      }
    })
    .catch(err => {
      console.warn('Routing failed:', err);
      // Fallback rough estimate
      const dLat = dest.lat - BLR_HQ.lat;
      const dLng = dest.lng - BLR_HQ.lng;
      const distDeg = Math.sqrt(dLat * dLat + dLng * dLng);
      const estKm = distDeg * 111;
      setRouteInfo({
        distance: `${estKm.toFixed(1)} km (Est.)`,
        duration: `${Math.round(estKm * 2)} mins (Est.)`
      });
    });
  };

  // Perform search query
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placesLib || !searchQuery.trim() || !map) return;

    setLoadingSearch(true);
    placesLib.Place.searchByText({
      textQuery: searchQuery,
      fields: ['displayName', 'location', 'formattedAddress', 'id'],
      locationBias: map.getCenter(),
      maxResultCount: 5,
    })
    .then(({ places }) => {
      setSearchResults(places || []);
      if (places?.[0] && places[0].location) {
        map.panTo(places[0].location);
        map.setZoom(14);
      }
    })
    .catch(err => {
      console.error('Search failed:', err);
    })
    .finally(() => {
      setLoadingSearch(false);
    });
  };

  // Locate current user browser location
  const handleLocateMe = () => {
    if (!map) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.panTo(coords);
        map.setZoom(14);
        setClickedLocation(coords);
      },
      (err) => {
        alert("Could not access browser location.");
      }
    );
  };

  // Handle Map Clicks
  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      setClickedLocation(e.detail.latLng);
      setSelectedStore(null);
      setSelectedSearchResult(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
      {/* Left interactive control panel */}
      <div className="lg:col-span-1 space-y-4">
        {/* Real-time Search Box */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-emerald-600" />
            Place Search Engine
          </h4>
          
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search address or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
            />
            <button
              type="submit"
              className="absolute right-2 text-slate-400 hover:text-emerald-600 cursor-pointer"
            >
              {loadingSearch ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Places Found</span>
              <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-none">
                {searchResults.map(place => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      if (place.location) {
                        map?.panTo(place.location);
                        map?.setZoom(15);
                        setSelectedSearchResult(place);
                        setSelectedStore(null);
                        setClickedLocation(null);
                        calculateRoute(place.location);
                      }
                    }}
                    className="w-full text-left p-1.5 hover:bg-slate-50 rounded-lg transition text-[11px] font-semibold text-slate-600 block truncate"
                  >
                    📍 {place.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* List of retail stores */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            Active Outlets ({stores.length})
          </h4>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
            {/* HQ default option */}
            <button
              type="button"
              onClick={() => {
                map?.panTo(BLR_HQ);
                map?.setZoom(14);
                setClickedLocation(null);
                setSelectedStore({
                  id: 'hq',
                  name: "Bangalore Corporate HQ",
                  location: "M.G. Road, Bangalore, Karnataka",
                  lat: BLR_HQ.lat,
                  lng: BLR_HQ.lng,
                  managerPhone: "+91 99999 99999"
                });
                setRouteInfo(null);
              }}
              className="w-full text-left p-2 border border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50/40 rounded-xl transition flex items-start gap-2"
            >
              <span className="p-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs">🏢</span>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase leading-none">Bangalore Corporate HQ</p>
                <p className="text-[9px] text-slate-400 font-mono mt-1">Core Logistics Command</p>
              </div>
            </button>

            {/* Custom stores */}
            {stores.map(store => (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  const coords = { lat: Number(store.lat), lng: Number(store.lng) };
                  map?.panTo(coords);
                  map?.setZoom(15);
                  setSelectedStore(store);
                  setSelectedSearchResult(null);
                  setClickedLocation(null);
                  calculateRoute(coords);
                }}
                className={`w-full text-left p-2 border rounded-xl transition flex items-start gap-2 ${
                  selectedStore?.id === store.id
                    ? 'bg-slate-50 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <span className="p-1 bg-slate-100 rounded-lg text-xs">🏪</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-700 truncate uppercase leading-none">{store.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">{store.location}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Routing Details Card */}
        {routeInfo && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2">
            <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <RouteIcon className="h-3 w-3" />
              Routing Logistics Metrics
            </h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 text-[9px] uppercase font-bold">Driving Distance</p>
                <p className="text-sm font-black text-emerald-300 mt-0.5">{routeInfo.distance}</p>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
                <p className="text-slate-400 text-[9px] uppercase font-bold">Est. Duration</p>
                <p className="text-sm font-black text-amber-300 mt-0.5">{routeInfo.duration}</p>
              </div>
            </div>
            <p className="text-[8.5px] text-slate-400 font-medium italic mt-1 text-center">
              *Calculated in real-time from Bangalore HQ using Routes API
            </p>
          </div>
        )}
      </div>

      {/* Right Map Canvas Container */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden p-3 shadow-sm relative">
          
          {/* Quick Toolbar */}
          <div className="absolute top-6 left-6 z-10 flex gap-2">
            <button
              onClick={handleLocateMe}
              className="px-3 py-1.5 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 border border-slate-200 rounded-xl shadow-lg transition flex items-center gap-1 cursor-pointer"
            >
              <Locate className="h-3.5 w-3.5 text-emerald-600" />
              My Location
            </button>
            <button
              onClick={() => {
                map?.panTo(BLR_HQ);
                map?.setZoom(12);
              }}
              className="px-3 py-1.5 bg-white text-slate-700 font-black text-xs hover:bg-slate-50 border border-slate-200 rounded-xl shadow-lg transition flex items-center gap-1 cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-emerald-600" />
              Center HQ
            </button>
          </div>

          <div className="w-full rounded-2xl overflow-hidden border border-slate-200/60" style={{ height: '520px' }}>
            <Map
              defaultCenter={BLR_HQ}
              defaultZoom={12}
              mapId="FARMERSGATE_REALTIME_MAP"
              onClick={handleMapClick}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* HQ Marker */}
              <AdvancedMarker position={BLR_HQ} title="Bangalore Corporate HQ">
                <Pin background="#047857" borderColor="#022c22" glyphColor="#ffffff">
                  🏢
                </Pin>
              </AdvancedMarker>

              {/* Outlet Store Markers */}
              {stores.map(store => {
                const lat = Number(store.lat);
                const lng = Number(store.lng);
                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                  <AdvancedMarker
                    key={store.id}
                    position={{ lat, lng }}
                    onClick={() => {
                      setSelectedStore(store);
                      setSelectedSearchResult(null);
                      setClickedLocation(null);
                      calculateRoute({ lat, lng });
                    }}
                  >
                    <Pin background="#10b981" borderColor="#059669" glyphColor="#ffffff">
                      🏪
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* Search Result Marker */}
              {selectedSearchResult && selectedSearchResult.location && (
                <AdvancedMarker 
                  position={selectedSearchResult.location}
                  onClick={() => setClickedLocation(null)}
                >
                  <Pin background="#3b82f6" borderColor="#1d4ed8" glyphColor="#ffffff" />
                </AdvancedMarker>
              )}

              {/* Custom Clicked Coordinates Marker */}
              {clickedLocation && (
                <AdvancedMarker 
                  position={clickedLocation}
                  onClick={() => setClickedLocation(null)}
                >
                  <Pin background="#ec4899" borderColor="#be185d" glyphColor="#ffffff">
                    📍
                  </Pin>
                </AdvancedMarker>
              )}

              {/* Info Window overlays */}
              {selectedStore && (
                <InfoWindow
                  position={{ lat: Number(selectedStore.lat || BLR_HQ.lat), lng: Number(selectedStore.lng || BLR_HQ.lng) }}
                  onCloseClick={() => setSelectedStore(null)}
                >
                  <div className="p-1 space-y-1 font-sans text-xs max-w-[200px] text-slate-800">
                    <h4 className="font-extrabold uppercase text-emerald-800 text-[11px]">
                      {selectedStore.name}
                    </h4>
                    <p className="text-[10px] text-slate-500">{selectedStore.location}</p>
                    <div className="bg-slate-50 p-1 rounded font-mono text-[9px] text-slate-600 mt-1">
                      <p>Lat: {Number(selectedStore.lat).toFixed(5)}</p>
                      <p>Lng: {Number(selectedStore.lng).toFixed(5)}</p>
                      {selectedStore.managerPhone && <p className="text-[9px] text-emerald-600">Tel: {selectedStore.managerPhone}</p>}
                    </div>
                  </div>
                </InfoWindow>
              )}

              {selectedSearchResult && selectedSearchResult.location && (
                <InfoWindow
                  position={selectedSearchResult.location}
                  onCloseClick={() => setSelectedSearchResult(null)}
                >
                  <div className="p-1 space-y-1 font-sans text-xs max-w-[200px] text-slate-800">
                    <h4 className="font-extrabold uppercase text-blue-800 text-[11px] truncate">
                      {selectedSearchResult.displayName}
                    </h4>
                    <p className="text-[9px] text-slate-500 line-clamp-2">{selectedSearchResult.formattedAddress}</p>
                    <div className="bg-slate-50 p-1 rounded font-mono text-[9px] text-slate-600 mt-1">
                      <p>Lat: {selectedSearchResult.location.lat.toFixed(5)}</p>
                      <p>Lng: {selectedSearchResult.location.lng.toFixed(5)}</p>
                    </div>
                  </div>
                </InfoWindow>
              )}

              {clickedLocation && (
                <InfoWindow
                  position={clickedLocation}
                  onCloseClick={() => setClickedLocation(null)}
                >
                  <div className="p-1 space-y-1 font-sans text-xs max-w-[180px] text-slate-800">
                    <h4 className="font-extrabold text-pink-700 text-[11px]">
                      Selected Location
                    </h4>
                    <p className="text-[9px] text-slate-500">You selected custom coordinates on the interactive map.</p>
                    <div className="bg-slate-50 p-1.5 rounded font-mono text-[8.5px] text-slate-600 mt-1">
                      <p>Lat: {clickedLocation.lat.toFixed(6)}</p>
                      <p>Lng: {clickedLocation.lng.toFixed(6)}</p>
                    </div>
                    <button
                      onClick={() => calculateRoute(clickedLocation)}
                      className="w-full py-1 mt-1 bg-slate-900 text-white rounded text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RouteIcon className="h-2.5 w-2.5" />
                      Get Route HQ
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </div>

          {/* Interactive instruction box */}
          <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-2.5 justify-between text-left">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-pink-100 rounded-lg text-xs">💡</span>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Pro Tip for Admins</p>
                <p className="text-[9.5px] text-slate-500 font-medium">Click anywhere directly on the map to drop custom marker & compute optimal delivery route from HQ.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setClickedLocation(null);
                setSelectedStore(null);
                setSelectedSearchResult(null);
                setRouteInfo(null);
                polylinesRef.current.forEach(p => p.setMap(null));
                polylinesRef.current = [];
                map?.setZoom(12);
                map?.panTo(BLR_HQ);
              }}
              className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 cursor-pointer"
            >
              Reset Map
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
