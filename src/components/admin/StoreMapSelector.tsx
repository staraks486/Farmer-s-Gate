import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Compass, Navigation, RefreshCw, Layers } from 'lucide-react';

interface CityConfig {
  name: string;
  code: string;
  icon: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  landmarks: Array<{ name: string; lat: number; lng: number }>;
}

const INDIAN_CITIES_MAP_CONFIGS: CityConfig[] = [
  {
    name: 'Bengaluru',
    code: 'BLR',
    icon: '🌳',
    latMin: 12.9000,
    latMax: 13.0400,
    lngMin: 77.5000,
    lngMax: 77.7600,
    landmarks: [
      { name: 'Indiranagar 100 Feet Rd', lat: 12.9719, lng: 77.6412 },
      { name: 'Koramangala 3rd Block', lat: 12.9279, lng: 77.6271 },
      { name: 'Whitefield ITPL Main Road', lat: 12.9698, lng: 77.7500 },
      { name: 'HSR Layout Sector 4', lat: 12.9100, lng: 77.6450 },
      { name: 'Rajajinagar Block 4', lat: 12.9900, lng: 77.5500 },
      { name: 'Jayanagar 4th T Block', lat: 12.9300, lng: 77.5800 },
      { name: 'Hebbal Flyover Junction', lat: 13.0350, lng: 77.5900 },
      { name: 'MG Road Metro Station', lat: 12.9750, lng: 77.6010 }
    ]
  },
  {
    name: 'Mumbai',
    code: 'BOM',
    icon: '🌊',
    latMin: 18.9000,
    latMax: 19.2500,
    lngMin: 72.7500,
    lngMax: 72.9800,
    landmarks: [
      { name: 'Bandra West Linking Road', lat: 19.0596, lng: 72.8295 },
      { name: 'Colaba Causeway', lat: 18.9067, lng: 72.8147 },
      { name: 'Andheri West Lokhandwala', lat: 19.1200, lng: 72.8300 },
      { name: 'Juhu Tara Road', lat: 19.1000, lng: 72.8200 },
      { name: 'Dadar TT Circle', lat: 19.0178, lng: 72.8478 },
      { name: 'Nariman Point Marine Drive', lat: 18.9250, lng: 72.8200 },
      { name: 'Thane West Teen Hath Naka', lat: 19.2183, lng: 72.9781 }
    ]
  },
  {
    name: 'New Delhi',
    code: 'DEL',
    icon: '🏛️',
    latMin: 28.5000,
    latMax: 28.7500,
    lngMin: 77.0500,
    lngMax: 77.3000,
    landmarks: [
      { name: 'Connaught Place Outer Circle', lat: 28.6304, lng: 77.2177 },
      { name: 'Karol Bagh Arya Samaj Road', lat: 28.6430, lng: 77.1887 },
      { name: 'South Extension Part II', lat: 28.5680, lng: 77.2200 },
      { name: 'Chandni Chowk Market', lat: 28.6506, lng: 77.2300 },
      { name: 'Vasant Kunj Sector C', lat: 28.5400, lng: 77.1500 },
      { name: 'Dwarka Sector 10', lat: 28.5800, lng: 77.0600 },
      { name: 'Noida Sector 62 Hub', lat: 28.6200, lng: 77.3600 }
    ]
  },
  {
    name: 'Hyderabad',
    code: 'HYD',
    icon: '🕌',
    latMin: 17.3000,
    latMax: 17.5500,
    lngMin: 78.3000,
    lngMax: 78.6000,
    landmarks: [
      { name: 'Jubilee Hills Road No 36', lat: 17.4483, lng: 78.3741 },
      { name: 'Gachibowli Financial District', lat: 17.4401, lng: 78.3489 },
      { name: 'HITEC City Cyber Towers', lat: 17.4500, lng: 78.3800 },
      { name: 'Banjara Hills Road No 1', lat: 17.4150, lng: 78.4300 },
      { name: 'Begumpet Airport Zone', lat: 17.4400, lng: 78.4600 },
      { name: 'Charminar Heritage Plaza', lat: 17.3616, lng: 78.4747 }
    ]
  }
];

interface StoreMapSelectorProps {
  lat: number | '';
  lng: number | '';
  location: string;
  onChangeLocation: (updated: { lat: number; lng: number; location: string }) => void;
}

export default function StoreMapSelector({ lat, lng, location, onChangeLocation }: StoreMapSelectorProps) {
  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [searchAreaQuery, setSearchAreaQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoverCoordinates, setHoverCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const activeCity = INDIAN_CITIES_MAP_CONFIGS[activeCityIndex];

  // Sync active city index if incoming lat/lng matches another city's bounding box
  useEffect(() => {
    if (lat !== '' && lng !== '') {
      const matchingCityIdx = INDIAN_CITIES_MAP_CONFIGS.findIndex(
        city => lat >= city.latMin && lat <= city.latMax && lng >= city.lngMin && lng <= city.lngMax
      );
      if (matchingCityIdx !== -1 && matchingCityIdx !== activeCityIndex) {
        setActiveCityIndex(matchingCityIdx);
      }
    }
  }, [lat, lng]);

  // Convert map coordinates to click position
  const getPointerPosition = () => {
    if (lat === '' || lng === '' || !mapContainerRef.current) {
      return { x: 50, y: 50 }; // default center percent
    }

    const { latMin, latMax, lngMin, lngMax } = activeCity;
    
    // Bounds check to see if the current pointer is within active city's bounds
    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) {
      return { x: 50, y: 50 };
    }

    // Calculate percent positions
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    const y = ((latMax - lat) / (latMax - latMin)) * 100;

    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;

    const xPercent = clickX / width;
    const yPercent = clickY / height;

    const { latMin, latMax, lngMin, lngMax } = activeCity;

    // Linear interpolation
    const calculatedLng = lngMin + xPercent * (lngMax - lngMin);
    const calculatedLat = latMax - yPercent * (latMax - latMin);

    // Dynamic reverse geocode simulation
    let closestLandmark = activeCity.landmarks[0];
    let minDistanceSq = Infinity;

    activeCity.landmarks.forEach(lm => {
      const dLat = lm.lat - calculatedLat;
      const dLng = lm.lng - calculatedLng;
      const dSq = dLat * dLat + dLng * dLng;
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestLandmark = lm;
      }
    });

    const streetNumber = Math.floor(10 + (clickX + clickY) % 180);
    const generatedAddress = `Plot ${streetNumber}, near ${closestLandmark.name}, ${activeCity.name}, India`;

    onChangeLocation({
      lat: parseFloat(calculatedLat.toFixed(5)),
      lng: parseFloat(calculatedLng.toFixed(5)),
      location: generatedAddress
    });
  };

  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPercent = mouseX / rect.width;
    const yPercent = mouseY / rect.height;

    const { latMin, latMax, lngMin, lngMax } = activeCity;

    const currentLng = lngMin + xPercent * (lngMax - lngMin);
    const currentLat = latMax - yPercent * (latMax - latMin);

    setHoverCoordinates({
      lat: parseFloat(currentLat.toFixed(5)),
      lng: parseFloat(currentLng.toFixed(5))
    });
  };

  const handleMapMouseLeave = () => {
    setHoverCoordinates(null);
  };

  const handleFindRealLocation = () => {
    if (!searchAreaQuery.trim()) {
      setErrorMessage('Please enter an area name to search.');
      return;
    }

    setErrorMessage(null);
    setIsSearching(true);

    setTimeout(() => {
      const query = searchAreaQuery.toLowerCase();
      
      // 1. Search existing Indian cities & landmarks dictionary
      let matchedLandmark: { name: string; lat: number; lng: number } | null = null;
      let matchedCityIndex = -1;

      for (let i = 0; i < INDIAN_CITIES_MAP_CONFIGS.length; i++) {
        const city = INDIAN_CITIES_MAP_CONFIGS[i];
        
        // Check city name match
        if (query.includes(city.name.toLowerCase())) {
          matchedCityIndex = i;
        }

        // Check landmark match
        const lm = city.landmarks.find(l => 
          l.name.toLowerCase().includes(query) || 
          query.includes(l.name.toLowerCase().split(' ')[0])
        );

        if (lm) {
          matchedLandmark = lm;
          matchedCityIndex = i;
          break;
        }
      }

      if (matchedCityIndex !== -1) {
        setActiveCityIndex(matchedCityIndex);
        const city = INDIAN_CITIES_MAP_CONFIGS[matchedCityIndex];
        
        const finalLat = matchedLandmark ? matchedLandmark.lat : (city.latMin + city.latMax) / 2;
        const finalLng = matchedLandmark ? matchedLandmark.lng : (city.lngMin + city.lngMax) / 2;
        const finalName = matchedLandmark 
          ? `Farmer's Gate Hub, Near ${matchedLandmark.name}, ${city.name}, India`
          : `Farmer's Gate Regional Center, ${searchAreaQuery}, ${city.name}, India`;

        onChangeLocation({
          lat: parseFloat(finalLat.toFixed(5)),
          lng: parseFloat(finalLng.toFixed(5)),
          location: finalName
        });
        setSearchAreaQuery('');
      } else {
        // 2. Generate deterministic coordinates within the currently active city bounds
        const city = activeCity;
        let hash = 0;
        for (let i = 0; i < searchAreaQuery.length; i++) {
          hash = searchAreaQuery.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const latRange = city.latMax - city.latMin;
        const lngRange = city.lngMax - city.lngMin;
        
        const latOffset = Math.abs((hash % 100) / 100) * latRange;
        const lngOffset = Math.abs(((hash >> 3) % 100) / 100) * lngRange;

        const generatedLat = city.latMin + latOffset;
        const generatedLng = city.lngMin + lngOffset;
        const generatedAddress = `${searchAreaQuery} District, near ${city.landmarks[Math.abs(hash) % city.landmarks.length].name}, ${city.name}, India`;

        onChangeLocation({
          lat: parseFloat(generatedLat.toFixed(5)),
          lng: parseFloat(generatedLng.toFixed(5)),
          location: generatedAddress
        });
        setSearchAreaQuery('');
      }

      setIsSearching(false);
    }, 1200);
  };

  const pointerPos = getPointerPosition();

  return (
    <div className="bg-zinc-900 text-white rounded-3xl p-5 border border-zinc-800 space-y-4 shadow-md">
      {/* Geocoder / Area Search Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="geo-search-input" className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
            <Compass className="h-4 w-4 animate-spin-slow" /> Geocoder & Real Location Lookup
          </label>
          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
            GIS Precision
          </span>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              id="geo-search-input"
              type="text"
              placeholder="Enter neighborhood or area (e.g. Indiranagar, Bandra, Connaught Place)..."
              value={searchAreaQuery}
              onChange={(e) => setSearchAreaQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFindRealLocation();
                }
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-white placeholder-zinc-500"
            />
          </div>
          <button
            type="button"
            disabled={isSearching}
            onClick={handleFindRealLocation}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-850 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isSearching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Locate'
            )}
          </button>
        </div>
        {errorMessage && (
          <p className="text-[10px] text-rose-400 font-bold">{errorMessage}</p>
        )}
      </div>

      {/* City Switcher Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-800">
        <span className="text-[9px] font-black uppercase text-zinc-500 mr-2">Region Base:</span>
        {INDIAN_CITIES_MAP_CONFIGS.map((city, idx) => {
          const isSelected = activeCityIndex === idx;
          return (
            <button
              key={city.code}
              type="button"
              onClick={() => {
                setActiveCityIndex(idx);
                // Center pin at city center coordinates
                const centerLat = (city.latMin + city.latMax) / 2;
                const centerLng = (city.lngMin + city.lngMax) / 2;
                onChangeLocation({
                  lat: parseFloat(centerLat.toFixed(5)),
                  lng: parseFloat(centerLng.toFixed(5)),
                  location: `FarmersGate Center Hub, ${city.name}, India`
                });
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase shrink-0 transition flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400 border border-zinc-800'
              }`}
            >
              <span>{city.icon}</span>
              <span>{city.name}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Vector GIS Map Canvas */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase px-1">
          <span>🎯 Click anywhere to set exact dispatch pointer</span>
          {hoverCoordinates && (
            <span className="font-mono text-emerald-400">
              🛰️ Cursor: {hoverCoordinates.lat}, {hoverCoordinates.lng}
            </span>
          )}
        </div>

        <div
          ref={mapContainerRef}
          onClick={handleMapClick}
          onMouseMove={handleMapMouseMove}
          onMouseLeave={handleMapMouseLeave}
          className="relative h-60 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden cursor-crosshair group shadow-inner select-none"
        >
          {/* Stylized GIS Grid Line Matrix */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 pointer-events-none opacity-10">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-emerald-500 w-full h-full border-dashed" />
            ))}
          </div>

          {/* SVG Vector Map Rendering (Simulated roads, rivers, parks) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            {/* Curved Blue Rivers */}
            <path
              d="M -20,100 C 100,50 200,200 400,150"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="12"
              strokeLinecap="round"
              className="opacity-60"
            />
            {/* Transit Highways (Gray curved bands) */}
            <path
              d="M 50,-20 C 120,100 80,180 150,280"
              fill="none"
              stroke="#4b5563"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M -10,210 Q 180,80 390,220"
              fill="none"
              stroke="#4b5563"
              strokeWidth="5"
              strokeLinecap="round"
            />
            
            {/* Emerald Park Circles */}
            <circle cx="280" cy="80" r="45" fill="#059669" className="opacity-40" />
            <circle cx="80" cy="180" r="30" fill="#059669" className="opacity-40" />
            <rect x="200" y="160" width="80" height="40" rx="10" fill="#059669" className="opacity-30" />
          </svg>

          {/* Predefined Landmark Anchor Rings */}
          {activeCity.landmarks.map((lm, i) => {
            const { latMin, latMax, lngMin, lngMax } = activeCity;
            const xPercent = ((lm.lng - lngMin) / (lngMax - lngMin)) * 100;
            const yPercent = ((latMax - lm.lat) / (latMax - latMin)) * 100;
            return (
              <div
                key={i}
                style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
              >
                <div className="h-2 w-2 rounded-full bg-zinc-600/80 border border-zinc-500" />
                <span className="text-[7.5px] font-black uppercase text-zinc-500 tracking-wider whitespace-nowrap bg-zinc-950/70 px-1 py-0.5 rounded border border-zinc-900 mt-1">
                  {lm.name.split(' ')[0]}
                </span>
              </div>
            );
          })}

          {/* Radar Echo Rings centered on active pin */}
          {lat !== '' && lng !== '' && (
            <div
              style={{ left: `${pointerPos.x}%`, top: `${pointerPos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500 animate-ping opacity-25" />
              <div className="absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500 animate-ping opacity-15" style={{ animationDelay: '0.6s' }} />
            </div>
          )}

          {/* Draggable/Droppable Red Pin Pointer */}
          {lat !== '' && lng !== '' && (
            <div
              style={{ left: `${pointerPos.x}%`, top: `${pointerPos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none"
            >
              <div className="bg-rose-950/90 text-rose-200 text-[8.5px] font-black tracking-wider px-2 py-1 rounded-xl border border-rose-800 shadow-lg whitespace-nowrap mb-1 animate-fade-in flex items-center gap-1">
                <Navigation className="h-2 w-2 text-rose-400 rotate-45 fill-rose-400" />
                <span>POINTER SET</span>
              </div>
              <MapPin className="h-7 w-7 text-rose-500 fill-rose-100 drop-shadow-md animate-bounce" />
            </div>
          )}
        </div>
      </div>

      {/* Selected Coordinates Status Badge */}
      {lat !== '' && lng !== '' && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold uppercase text-rose-400 tracking-wider flex items-center gap-1">
              📍 Current Location Address:
            </span>
            <p className="text-zinc-200 font-bold font-sans">
              {location || 'FarmersGate Dispatch Office'}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl flex gap-3 font-mono shrink-0">
            <div>
              <span className="text-[8px] block font-black text-zinc-500 uppercase">Latitude</span>
              <span className="text-emerald-400 font-bold">{Number(lat).toFixed(5)}° N</span>
            </div>
            <div className="border-l border-zinc-800" />
            <div>
              <span className="text-[8px] block font-black text-zinc-500 uppercase">Longitude</span>
              <span className="text-emerald-400 font-bold">{Number(lng).toFixed(5)}° E</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
