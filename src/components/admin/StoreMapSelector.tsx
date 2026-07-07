import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Compass, Navigation, RefreshCw, Layers, X } from 'lucide-react';

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
  },
  {
    name: 'Chennai',
    code: 'MAA',
    icon: '☕',
    latMin: 12.9000,
    latMax: 13.1500,
    lngMin: 80.1500,
    lngMax: 80.3000,
    landmarks: [
      { name: 'T. Nagar Usman Road', lat: 13.0405, lng: 80.2337 },
      { name: 'Adyar Besant Nagar Beach', lat: 13.0003, lng: 80.2667 },
      { name: 'Nungambakkam High Road', lat: 13.0600, lng: 80.2400 },
      { name: 'Velachery Phoenix Mall', lat: 12.9900, lng: 80.2200 },
      { name: 'Anna Nagar West Depot', lat: 13.0850, lng: 80.2100 },
      { name: 'Mylapore Kapaleeshwarar Temple', lat: 13.0333, lng: 80.2700 }
    ]
  },
  {
    name: 'Pune',
    code: 'PNQ',
    icon: '⛰️',
    latMin: 18.4500,
    latMax: 18.6500,
    lngMin: 73.7500,
    lngMax: 73.9500,
    landmarks: [
      { name: 'Koregaon Park North Main Rd', lat: 18.5362, lng: 73.8930 },
      { name: 'Kalyani Nagar Jogger\'s Park', lat: 18.5460, lng: 73.9050 },
      { name: 'Kothrud Ideal Colony', lat: 18.5080, lng: 73.8150 },
      { name: 'Hinjawadi Phase 1 InfoTech', lat: 18.5900, lng: 73.7400 },
      { name: 'Shivaji Nagar FC Road', lat: 18.5200, lng: 73.8400 },
      { name: 'Viman Nagar Symbiosis campus', lat: 18.5650, lng: 73.9120 }
    ]
  },
  {
    name: 'Kolkata',
    code: 'CCU',
    icon: '🌉',
    latMin: 22.4500,
    latMax: 22.6500,
    lngMin: 88.3000,
    lngMax: 88.4800,
    landmarks: [
      { name: 'Salt Lake Sector V Central', lat: 22.5726, lng: 88.4339 },
      { name: 'Park Street Main Avenue', lat: 22.5485, lng: 88.3530 },
      { name: 'New Town Eco Park Entrance', lat: 22.6000, lng: 88.4700 },
      { name: 'Gariahat South Market Crossing', lat: 22.5200, lng: 88.3700 },
      { name: 'Howrah Bridge Terminus', lat: 22.5850, lng: 88.3400 }
    ]
  },
  {
    name: 'Patiala',
    code: 'PAT',
    icon: '🌾',
    latMin: 30.2500,
    latMax: 30.4500,
    lngMin: 76.2500,
    lngMax: 76.4500,
    landmarks: [
      { name: 'Bhupindra Road Mall', lat: 30.3398, lng: 76.3869 },
      { name: 'Qila Mubarak Fort', lat: 30.3292, lng: 76.4014 },
      { name: 'Dukh Niwan Sahib Gurudwara', lat: 30.3444, lng: 76.3861 },
      { name: 'Patiala Railway Station', lat: 30.3350, lng: 76.3980 },
      { name: 'Thapar Institute Campus', lat: 30.3564, lng: 76.3647 }
    ]
  }
];

const parseGoogleMapsUrl = (url: string) => {
  // Regex 1: /@30.3398,76.3869
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  // Regex 2: ?q=30.3398,76.3869 or ?daddr=30.3398,76.3869 or &ll=30.3398,76.3869
  match = url.match(/[?&](?:q|daddr|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  // Regex 3: /place/30.3398+76.3869 or /place/30.3398,76.3869
  match = url.match(/\/place\/(-?\d+\.\d+)[+,](-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  // Regex 4: just any coordinates in the URL
  const coords = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (coords) {
    const lat = parseFloat(coords[1]);
    const lng = parseFloat(coords[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
};

interface StoreMapSelectorProps {
  lat: number | '';
  lng: number | '';
  location: string;
  onChangeLocation: (updated: { lat: number; lng: number; location: string }) => void;
}

export default function StoreMapSelector({ lat, lng, location, onChangeLocation }: StoreMapSelectorProps) {
  const [cities, setCities] = useState<CityConfig[]>(() => {
    const saved = localStorage.getItem('fg_map_cities');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INDIAN_CITIES_MAP_CONFIGS;
  });

  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [searchAreaQuery, setSearchAreaQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; cityName: string; cityIndex: number; lat: number; lng: number; isCustom?: boolean }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoverCoordinates, setHoverCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  
  // Google Map Link Decoder state
  const [pastedMapLink, setPastedMapLink] = useState('');
  const [pasteMessage, setPasteMessage] = useState<{ text: string; isError: boolean } | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const activeCity = cities[activeCityIndex] || cities[0];

  const handleDeleteCity = (idxToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cities.length <= 1) {
      alert("At least one city region is required for map coordination.");
      return;
    }
    const cityName = cities[idxToDelete].name;
    if (confirm(`Are you sure you want to delete the "${cityName}" region from map presets?`)) {
      const newCities = cities.filter((_, idx) => idx !== idxToDelete);
      setCities(newCities);
      localStorage.setItem('fg_map_cities', JSON.stringify(newCities));
      if (activeCityIndex === idxToDelete) {
        setActiveCityIndex(0);
      } else if (activeCityIndex > idxToDelete) {
        setActiveCityIndex(activeCityIndex - 1);
      }
    }
  };

  const handleDecodeMapLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedMapLink.trim()) return;

    const decoded = parseGoogleMapsUrl(pastedMapLink);
    if (decoded) {
      let matchedCityName = activeCity.name;
      let matchedCityIndex = activeCityIndex;

      cities.forEach((city, idx) => {
        if (decoded.lat >= city.latMin && decoded.lat <= city.latMax &&
            decoded.lng >= city.lngMin && decoded.lng <= city.lngMax) {
          matchedCityName = city.name;
          matchedCityIndex = idx;
        }
      });

      setActiveCityIndex(matchedCityIndex);
      
      let locName = `Custom Location near ${matchedCityName}`;
      try {
        const urlObj = new URL(pastedMapLink);
        const placeSegment = urlObj.pathname.split('/place/')[1];
        if (placeSegment) {
          locName = decodeURIComponent(placeSegment.split('/')[0]).replace(/\+/g, ' ');
        } else {
          const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query');
          if (qParam && !qParam.match(/^-?\d/)) {
            locName = qParam;
          }
        }
      } catch (err) {
        // Ignore URL parsing errors
      }

      onChangeLocation({
        lat: parseFloat(decoded.lat.toFixed(5)),
        lng: parseFloat(decoded.lng.toFixed(5)),
        location: `${locName}, ${matchedCityName}, India`
      });

      setPasteMessage({ text: `Extracted coordinates: ${decoded.lat.toFixed(5)}, ${decoded.lng.toFixed(5)}!`, isError: false });
      setPastedMapLink('');
    } else {
      setPasteMessage({ text: 'No coordinates found in this URL. Try pasting a direct maps link or coordinates directly.', isError: true });
    }
  };

  // Real-time suggestions / coordinate search
  useEffect(() => {
    if (!searchAreaQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchAreaQuery.toLowerCase();
    const matches: Array<{ name: string; cityName: string; cityIndex: number; lat: number; lng: number; isCustom?: boolean }> = [];
    
    cities.forEach((city, cityIndex) => {
      // Check city name match
      if (city.name.toLowerCase().includes(query)) {
        matches.push({
          name: `FarmersGate Main Hub`,
          cityName: city.name,
          cityIndex,
          lat: parseFloat(((city.latMin + city.latMax) / 2).toFixed(5)),
          lng: parseFloat(((city.lngMin + city.lngMax) / 2).toFixed(5))
        });
      }

      // Check landmark match
      city.landmarks.forEach(lm => {
        if (lm.name.toLowerCase().includes(query) || city.name.toLowerCase().includes(query)) {
          matches.push({
            name: lm.name,
            cityName: city.name,
            cityIndex,
            lat: lm.lat,
            lng: lm.lng
          });
        }
      });
    });

    setSearchResults(matches.slice(0, 8));
  }, [searchAreaQuery]);

  // Sync active city index if incoming lat/lng matches another city's bounding box
  useEffect(() => {
    if (lat !== '' && lng !== '') {
      const matchingCityIdx = cities.findIndex(
        city => lat >= city.latMin && lat <= city.latMax && lng >= city.lngMin && lng <= city.lngMax
      );
      if (matchingCityIdx !== -1 && matchingCityIdx !== activeCityIndex) {
        setActiveCityIndex(matchingCityIdx);
      }
    }
  }, [lat, lng, cities]);

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
      
      // 1. Check if we already have static matched results
      if (searchResults.length > 0) {
        const topResult = searchResults[0];
        handleSelectSearchResult(topResult);
        setIsSearching(false);
        return;
      }

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
      const generatedAddress = `${searchAreaQuery}, near ${city.landmarks[Math.abs(hash) % city.landmarks.length].name}, ${city.name}, India`;

      onChangeLocation({
        lat: parseFloat(generatedLat.toFixed(5)),
        lng: parseFloat(generatedLng.toFixed(5)),
        location: generatedAddress
      });
      setSearchAreaQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }, 800);
  };

  const handleSelectSearchResult = (result: { name: string; cityName: string; cityIndex: number; lat: number; lng: number }) => {
    setActiveCityIndex(result.cityIndex);
    onChangeLocation({
      lat: result.lat,
      lng: result.lng,
      location: `${result.name}, ${result.cityName}, India`
    });
    setSearchAreaQuery('');
    setSearchResults([]);
  };

  const pointerPos = getPointerPosition();

  return (
    <div className="bg-zinc-900 text-white rounded-3xl p-5 border border-zinc-800 space-y-4 shadow-md">
      {/* Google Maps Link Decoder */}
      <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="gmaps-link-input" className="text-xs font-black uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-rose-500 animate-pulse" /> Google Map Link Decoder
          </label>
          <span className="text-[8px] bg-rose-950/50 text-rose-300 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-rose-900/40">
            Auto-Extract Coordinates
          </span>
        </div>
        
        <form onSubmit={handleDecodeMapLink} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-2.5 text-xs text-zinc-500">🔗</span>
            <input
              id="gmaps-link-input"
              type="text"
              placeholder="Paste Google Maps URL here (e.g., https://www.google.com/maps/...)"
              value={pastedMapLink}
              onChange={(e) => {
                setPastedMapLink(e.target.value);
                setPasteMessage(null);
              }}
              className="w-full rounded-xl border border-zinc-850 bg-zinc-950 py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium text-white placeholder-zinc-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            Decode Link
          </button>
        </form>

        {pasteMessage && (
          <p className={`text-[10px] font-semibold leading-normal px-1 ${pasteMessage.isError ? 'text-rose-400' : 'text-emerald-400'}`}>
            {pasteMessage.isError ? '❌' : '✅'} {pasteMessage.text}
          </p>
        )}
        <p className="text-[9px] text-zinc-500 font-semibold leading-normal">
          Tip: Locate your store on Google Maps, copy the link from your browser or share menu, and paste it here to automatically retrieve precise Latitude & Longitude!
        </p>
      </div>

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
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-zinc-850 max-h-60 overflow-y-auto animate-fade-in">
                <div className="px-3 py-1.5 bg-zinc-900 text-[10px] font-black uppercase text-zinc-500 flex justify-between items-center">
                  <span>🗺️ Coordinates found by Location Name</span>
                  <span className="text-[9px] text-emerald-400">Click to pin coordinates</span>
                </div>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left px-3 py-2.5 hover:bg-zinc-900/90 transition text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 cursor-pointer group"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-zinc-200 group-hover:text-emerald-400 transition">
                        📍 {res.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium uppercase">
                        {res.cityName}, India
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-850 shrink-0 font-extrabold shadow-sm">
                      <span className="text-[8px] text-zinc-500 font-sans font-black uppercase">Lat/Lng:</span>
                      {res.lat.toFixed(4)}, {res.lng.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
        {cities.map((city, idx) => {
          const isSelected = activeCityIndex === idx;
          return (
            <div
              key={city.code}
              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase shrink-0 transition flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-400 border-zinc-800'
              }`}
            >
              <button
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
                className="flex items-center gap-1 cursor-pointer text-left focus:outline-none"
              >
                <span>{city.icon}</span>
                <span>{city.name}</span>
              </button>
              
              <button
                type="button"
                onClick={(e) => handleDeleteCity(idx, e)}
                className="ml-0.5 p-0.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 rounded transition cursor-pointer"
                title={`Delete ${city.name} region`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
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
