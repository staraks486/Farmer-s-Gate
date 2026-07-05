import React, { useState } from 'react';
import { MapPin, Navigation, Sparkles } from 'lucide-react';
import { mapTiles, MapTile } from './customerData';

interface InteractiveMapProps {
  currentAddress?: string;
  onSelectAddress: (address: string) => void;
}

export default function InteractiveMap({ currentAddress, onSelectAddress }: InteractiveMapProps) {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(() => {
    const matched = mapTiles.find(t => currentAddress && currentAddress.includes(t.name));
    return matched ? matched.id : null;
  });

  const handleTileClick = (tile: MapTile) => {
    if (tile.isStore) {
      alert("🏪 That's our Local Dark Store hub! Our couriers pick up your fresh harvest from here. Please click on any of the surrounding residential blocks or apartments to set your delivery destination.");
      return;
    }
    setSelectedTileId(tile.id);
    const simulatedDetail = `Flat ${Math.floor(100 + Math.random() * 800)}, ${tile.name}, Pin Dropped`;
    onSelectAddress(simulatedDetail);
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-emerald-400" /> GPS Dark-Store Range Simulator
          </h4>
        </div>
        <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono font-bold">10-MIN DRONE RANGE</span>
      </div>

      <p className="text-[10.5px] text-slate-400 leading-normal">
        We serve a hyper-local 2.5 km radius. <strong>Click any neighborhood block</strong> below to drop your live delivery pin and update your address instantly!
      </p>

      {/* Visual Map Grid */}
      <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 relative">
        {/* Visual Map Grid Lines */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 pointer-events-none opacity-10">
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-b border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-dashed border-emerald-500 w-full h-full" />
          <div className="border-r border-dashed border-emerald-500 w-full h-full" />
          <div className="border-dashed border-emerald-500 w-full h-full" />
        </div>

        {mapTiles.map((tile) => {
          const isSelected = selectedTileId === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleTileClick(tile)}
              className={`relative h-20 rounded-xl flex flex-col items-center justify-center p-2 border transition-all duration-300 group cursor-pointer ${
                tile.isStore
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : isSelected
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-slate-400'
              }`}
            >
              <span className={`text-2xl transform transition-transform group-hover:scale-110 duration-200 ${
                isSelected ? 'animate-bounce' : ''
              }`}>
                {tile.icon}
              </span>
              
              <span className="text-[8px] font-bold text-center mt-1 block truncate w-full uppercase tracking-tight">
                {tile.isStore ? 'Dark Store' : tile.name.split(',')[0]}
              </span>

              {/* Pin Indicator */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 text-emerald-400 animate-pulse">
                  <MapPin className="h-3 w-3 fill-emerald-400" />
                </div>
              )}

              {/* Pulsing Core Radar for HQ */}
              {tile.isStore && (
                <span className="absolute inset-0 rounded-xl border border-emerald-500 animate-ping opacity-15 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Result Banner */}
      {selectedTileId && (
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs font-bold animate-fade-in text-emerald-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 animate-pulse" />
            <span className="truncate max-w-[240px]">
              Active GPS Pin: {mapTiles.find(t => t.id === selectedTileId)?.name}
            </span>
          </div>
          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider font-extrabold shadow-sm">
            EST. EXPRESS
          </span>
        </div>
      )}
    </div>
  );
}
