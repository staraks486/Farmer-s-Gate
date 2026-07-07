import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { MapPin, Info, Compass, HelpCircle, Activity, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface StoreLocation {
  name: string;
  lat: number;
  lng: number;
  color?: string;
}

interface GeofenceD3MapProps {
  userLat: number;
  userLng: number;
  stores: StoreLocation[];
  radiusKm: number;
}

export default function GeofenceD3Map({ userLat, userLng, stores, radiusKm }: GeofenceD3MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 350 });
  const [hoveredNode, setHoveredNode] = useState<{ name: string; lat: number; lng: number; distKm?: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Resize handler
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain a nice aspect ratio
      const newWidth = Math.max(width, 300);
      const newHeight = Math.max(Math.min(newWidth * 0.7, 450), 320);
      setDimensions({ width: newWidth, height: newHeight });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculate distance in km (Haversine formula)
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find nearest store
  let nearestStore = stores[0];
  let minDistance = Infinity;
  stores.forEach(store => {
    const d = getDistanceKm(userLat, userLng, store.lat, store.lng);
    if (d < minDistance) {
      minDistance = d;
      nearestStore = store;
    }
  });

  const isUserAllowed = minDistance <= radiusKm;

  // Render D3 Map Visualization
  useEffect(() => {
    if (!svgRef.current || !dimensions.width || !dimensions.height) return;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const padding = 45;

    // Determine coordinate bounds to map securely to visual dimensions
    const allLats = [...stores.map(s => s.lat), userLat];
    const allLngs = [...stores.map(s => s.lng), userLng];

    const latMin = Math.min(...allLats);
    const latMax = Math.max(...allLats);
    const lngMin = Math.min(...allLngs);
    const lngMax = Math.max(...allLngs);

    // Expand bounds slightly so coordinates are never right at the edge
    const latDelta = latMax - latMin || 0.01;
    const lngDelta = lngMax - lngMin || 0.01;

    const mapLatMin = latMin - latDelta * 0.15;
    const mapLatMax = latMax + latDelta * 0.15;
    const mapLngMin = lngMin - lngDelta * 0.15;
    const mapLngMax = lngMax + lngDelta * 0.15;

    // Create projections using standard d3 scale linear
    // Flip Y scale because SVG coordinates start from top-left (0,0)
    const xScale = d3.scaleLinear()
      .domain([mapLngMin, mapLngMax])
      .range([padding, width - padding]);

    const yScale = d3.scaleLinear()
      .domain([mapLatMin, mapLatMax])
      .range([height - padding, padding]);

    // Apply scaling factor for simulated zooms
    const zoomTransformX = (lng: number) => {
      const centerLng = (mapLngMin + mapLngMax) / 2;
      const x = xScale(lng);
      const centerX = xScale(centerLng);
      return centerX + (x - centerX) * zoomLevel;
    };

    const zoomTransformY = (lat: number) => {
      const centerLat = (mapLatMin + mapLatMax) / 2;
      const y = yScale(lat);
      const centerY = yScale(centerLat);
      return centerY + (y - centerY) * zoomLevel;
    };

    // Calculate approximate scale factor in pixels per kilometer
    // Bengaluru is at roughly 12.97 N, where 1 degree latitude = 110.8 km, 1 degree longitude = 108.4 km
    const avgLat = (mapLatMin + mapLatMax) / 2;
    const oneKmInLatDegrees = 1 / 110.8;
    const oneKmInLngDegrees = 1 / (111.32 * Math.cos(avgLat * Math.PI / 180));

    // Measure of radiusKm in pixels along the x-axis
    const sampleLat = nearestStore.lat;
    const sampleLng = nearestStore.lng;
    const radiusLngOffset = radiusKm * oneKmInLngDegrees;
    const xCenter = zoomTransformX(sampleLng);
    const xEdge = zoomTransformX(sampleLng + radiusLngOffset);
    const visualRadiusPx = Math.abs(xEdge - xCenter);

    // Grid lines for high tech mapping backdrop
    const xTicks = xScale.ticks(8);
    const yTicks = yScale.ticks(6);

    // Draw grid background lines
    svg.append("g")
      .attr("class", "grid-lines-x")
      .selectAll("line")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("x1", d => xScale(d))
      .attr("y1", padding)
      .attr("x2", d => xScale(d))
      .attr("y2", height - padding)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-dasharray", "2,4")
      .attr("stroke-width", 1);

    svg.append("g")
      .attr("class", "grid-lines-y")
      .selectAll("line")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", padding)
      .attr("y1", d => yScale(d))
      .attr("x2", width - padding)
      .attr("y2", d => yScale(d))
      .attr("stroke", "#e2e8f0")
      .attr("stroke-dasharray", "2,4")
      .attr("stroke-width", 1);

    // Define defs for filters and gradients
    const defs = svg.append("defs");

    // Glow filter for user dot
    const glowFilter = defs.append("filter")
      .attr("id", "radar-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    
    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", 4)
      .attr("result", "blur");
    
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Radial gradient for boundary limit circle
    const radGrad = defs.append("radialGradient")
      .attr("id", "boundary-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%");

    if (isUserAllowed) {
      radGrad.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", "0.15");
      radGrad.append("stop").attr("offset", "100%").attr("stop-color", "#10b981").attr("stop-opacity", "0.01");
    } else {
      radGrad.append("stop").attr("offset", "0%").attr("stop-color", "#f43f5e").attr("stop-opacity", "0.15");
      radGrad.append("stop").attr("offset", "100%").attr("stop-color", "#f43f5e").attr("stop-opacity", "0.01");
    }

    // DRAW BOUNDARY CIRCLE FOR NEAREST STORE
    // This highlights the geofence perimeter around the closest outlet
    svg.append("circle")
      .attr("cx", zoomTransformX(nearestStore.lng))
      .attr("cy", zoomTransformY(nearestStore.lat))
      .attr("r", visualRadiusPx)
      .attr("fill", "url(#boundary-gradient)")
      .attr("stroke", isUserAllowed ? "#10b981" : "#f43f5e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.85);

    // Inner center circle around the nearest store for focus
    svg.append("circle")
      .attr("cx", zoomTransformX(nearestStore.lng))
      .attr("cy", zoomTransformY(nearestStore.lat))
      .attr("r", visualRadiusPx * 0.3)
      .attr("fill", "none")
      .attr("stroke", isUserAllowed ? "#a7f3d0" : "#fecdd3")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "1,3")
      .attr("opacity", 0.6);

    // DRAW CONNECTION PATH (User -> Nearest Branch)
    svg.append("line")
      .attr("x1", zoomTransformX(userLng))
      .attr("y1", zoomTransformY(userLat))
      .attr("x2", zoomTransformX(nearestStore.lng))
      .attr("y2", zoomTransformY(nearestStore.lat))
      .attr("stroke", isUserAllowed ? "#10b981" : "#ef4444")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5,5")
      .attr("class", "animate-dash")
      .style("stroke-dashoffset", 0);

    // DRAW THE STORES (SITES)
    stores.forEach(store => {
      const isNearest = store.name === nearestStore.name;
      const x = zoomTransformX(store.lng);
      const y = zoomTransformY(store.lat);

      // Store node group
      const storeGroup = svg.append("g")
        .attr("class", `store-node cursor-pointer`)
        .on("mouseenter", () => {
          setHoveredNode({
            name: store.name,
            lat: store.lat,
            lng: store.lng,
            distKm: getDistanceKm(userLat, userLng, store.lat, store.lng)
          });
        })
        .on("mouseleave", () => setHoveredNode(null));

      // Visual backdrop/glow for nearest
      if (isNearest) {
        storeGroup.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 15)
          .attr("fill", isUserAllowed ? "#10b981" : "#f43f5e")
          .attr("opacity", 0.15)
          .attr("class", "animate-pulse");
      }

      // Store Outer ring
      storeGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", isNearest ? 9 : 7)
        .attr("fill", isNearest ? "#ffffff" : "#475569")
        .attr("stroke", isNearest ? (isUserAllowed ? "#059669" : "#e11d48") : "#1e293b")
        .attr("stroke-width", 2);

      // Store Inner dot
      storeGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", isNearest ? 4 : 2.5)
        .attr("fill", isNearest ? (isUserAllowed ? "#10b981" : "#f43f5e") : "#94a3b8");

      // Store Label
      storeGroup.append("text")
        .attr("x", x)
        .attr("y", y - (isNearest ? 14 : 11))
        .attr("text-anchor", "middle")
        .attr("fill", isNearest ? "#0f172a" : "#64748b")
        .attr("font-size", isNearest ? "9.5px" : "8px")
        .attr("font-family", "ui-sans-serif, system-ui, sans-serif")
        .attr("font-weight", isNearest ? "900" : "700")
        .text(store.name.replace("Farmer's Gate - ", "").replace(" Store", ""));
    });

    // DRAW USER'S LIVE PIN / BLINKING DOT
    const uX = zoomTransformX(userLng);
    const uY = zoomTransformY(userLat);

    const userGroup = svg.append("g")
      .attr("class", "user-node cursor-pointer")
      .on("mouseenter", () => {
        setHoveredNode({
          name: "Your Simulated Device Location",
          lat: userLat,
          lng: userLng
        });
      })
      .on("mouseleave", () => setHoveredNode(null));

    // Ring shadow pulsing
    userGroup.append("circle")
      .attr("cx", uX)
      .attr("cy", uY)
      .attr("r", 18)
      .attr("fill", "none")
      .attr("stroke", isUserAllowed ? "#10b981" : "#ef4444")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.4)
      .attr("filter", "url(#radar-glow)");

    // Inner pulsing ring
    userGroup.append("circle")
      .attr("cx", uX)
      .attr("cy", uY)
      .attr("r", 9)
      .attr("fill", isUserAllowed ? "#10b981" : "#ef4444")
      .attr("opacity", 0.25)
      .attr("class", "animate-ping");

    // Core Solid User Dot
    userGroup.append("circle")
      .attr("cx", uX)
      .attr("cy", uY)
      .attr("r", 6.5)
      .attr("fill", isUserAllowed ? "#059669" : "#dc2626")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // User Label
    userGroup.append("text")
      .attr("x", uX)
      .attr("y", uY + 16)
      .attr("text-anchor", "middle")
      .attr("fill", isUserAllowed ? "#047857" : "#b91c1c")
      .attr("font-size", "9px")
      .attr("font-family", "ui-sans-serif, system-ui, sans-serif")
      .attr("font-weight", "900")
      .text("YOU");

    // ADD CONNECTION LINE DISTANCE BADGE / TEXT IN THE MIDDLE
    const midX = (uX + zoomTransformX(nearestStore.lng)) / 2;
    const midY = (uY + zoomTransformY(nearestStore.lat)) / 2;

    const badgeGroup = svg.append("g")
      .attr("class", "distance-badge")
      .attr("transform", `translate(${midX}, ${midY})`);

    // Rect back of distance label
    badgeGroup.append("rect")
      .attr("x", -32)
      .attr("y", -8)
      .attr("width", 64)
      .attr("height", 16)
      .attr("rx", 5)
      .attr("fill", "#1e293b")
      .attr("stroke", isUserAllowed ? "#059669" : "#dc2626")
      .attr("stroke-width", 1);

    // Text of distance
    badgeGroup.append("text")
      .attr("x", 0)
      .attr("y", 3)
      .attr("text-anchor", "middle")
      .attr("fill", "#ffffff")
      .attr("font-size", "8.5px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text(`${minDistance.toFixed(2)} km`);

  }, [dimensions, userLat, userLng, stores, radiusKm, zoomLevel, isUserAllowed]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4.5 space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">🗺️ D3 Map</span>
          <div>
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">Dynamic Proximity Visualizer</h5>
            <p className="text-[10px] text-slate-400 font-medium">Rendered natively in vector SVG using D3.js engine</p>
          </div>
        </div>

        {/* Zoom and configuration controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end">
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
            className="p-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            className="px-1.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-[9px] font-mono text-slate-500 font-bold transition cursor-pointer"
            title="Reset Zoom"
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
            className="p-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main visualization grid */}
      <div ref={containerRef} className="relative w-full bg-slate-900/5 rounded-2xl border border-slate-200/50 overflow-hidden flex items-center justify-center">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="block select-none max-w-full"
        />

        {/* Tooltip Overlay */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-slate-950/90 text-white rounded-xl px-3 py-2 border border-slate-800 shadow-xl max-w-[180px] pointer-events-none animate-fade-in backdrop-blur-xs space-y-1">
            <span className="block text-[9px] font-black uppercase text-emerald-400 truncate">📍 {hoveredNode.name}</span>
            <div className="text-[8.5px] font-mono text-slate-400 space-y-0.5 leading-tight">
              <p>Lat: {hoveredNode.lat.toFixed(5)}</p>
              <p>Lng: {hoveredNode.lng.toFixed(5)}</p>
              {hoveredNode.distKm !== undefined && (
                <p className="text-amber-300 font-bold">Range: {hoveredNode.distKm.toFixed(2)} km</p>
              )}
            </div>
          </div>
        )}

        {/* Radar Center Calibration Overlay */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-1 bg-slate-900/85 text-[8px] font-mono text-slate-300 rounded border border-slate-800 flex items-center gap-1">
          <Activity className="h-2.5 w-2.5 text-emerald-400 animate-pulse animate-duration-1000" />
          <span>RADAR CALIBRATED</span>
        </div>
      </div>

      {/* Mini Legend Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100/60 rounded-xl p-2.5 border border-slate-200/40 text-[9px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 border border-white inline-block"></span>
          <span>You (Authorized)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600 border border-white inline-block"></span>
          <span>You (Restricted)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-600 border border-slate-800 inline-block"></span>
          <span>Retail Branch Outlet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block border-t border-dashed border-emerald-600 w-4"></span>
          <span>Geofence Boundary ({radiusKm}km)</span>
        </div>
      </div>
    </div>
  );
}
