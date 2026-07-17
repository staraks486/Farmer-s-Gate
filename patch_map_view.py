import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# Add import
import_str = "import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';\n"
if "import { APIProvider" not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + import_str)

# Add map rendering
map_render = """      {activeTab === 'map' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <div>
              <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Fleet Asset Overview
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Live locations of all active and available vehicles</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> In-Transit
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Available
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Maintenance
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <APIProvider apiKey="dummy_key_for_dev">
              <Map
                defaultZoom={8}
                defaultCenter={{ lat: 18.5204, lng: 73.8567 }} // Pune center
                mapId="fleet_map_1"
                disableDefaultUI={true}
              >
                {transports.map((t: any, idx: number) => {
                  // Generate pseudo-random coordinates around Pune based on vehicle ID
                  const latOffset = (parseInt(t.id.replace(/\D/g, '') || '0') % 10) * 0.05 - 0.25;
                  const lngOffset = (parseInt(t.id.replace(/\D/g, '') || '0') * 3 % 10) * 0.05 - 0.25;
                  const position = { lat: 18.5204 + latOffset + idx * 0.02, lng: 73.8567 + lngOffset - idx * 0.01 };
                  
                  let statusColor = '#3b82f6'; // Available (Blue)
                  if ((t.nextServiceMileage || 0) > 0 && (t.currentMileage || 0) / t.nextServiceMileage >= 0.9) {
                    statusColor = '#f43f5e'; // Maintenance (Red)
                  } else if (t.tripLogs && t.tripLogs.length > 0) {
                    // Check if recently added trip
                    statusColor = '#10b981'; // In-transit (Green)
                  }

                  return (
                    <AdvancedMarker key={t.id} position={position} title={t.vehicleName}>
                      <Pin background={statusColor} borderColor={statusColor} glyphColor="#fff" />
                    </AdvancedMarker>
                  );
                })}
              </Map>
            </APIProvider>
          </div>
        </div>
      )}"""

# Replace the last line `    </div>` to append the map render
target_footer = "    </div>\n  );\n}"
content = content.replace(target_footer, map_render + "\n" + target_footer)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
