import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Edit, Trash2, Wrench, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';",
    "import { Edit, Trash2, Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, Navigation, Package } from 'lucide-react';"
)

# 2. Add state variables for Trip Logs below Maintenance state
state_search = r"  const \[maintenanceForm, setMaintenanceForm\] = useState\(\{.*?  \}\);"
trip_state = """
  // Trip Log Sub-view state
  const [selectedVehicleForTrips, setSelectedVehicleForTrips] = useState<any | null>(null);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripForm, setTripForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    destination: '',
    cargoDetails: '',
    distanceKm: 0
  });"""
content = re.sub(state_search, lambda m: m.group(0) + trip_state, content, flags=re.DOTALL)

# 3. Add saveTripLog function below saveMaintenanceLog
save_maint_search = r"  const saveMaintenanceLog = \(e: React\.FormEvent\) => \{.*?\n  \};"
save_trip = """
  const saveTripLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForTrips) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForTrips.id) {
        const logs = t.tripLogs || [];
        const newLog = { ...tripForm, id: Date.now().toString() };
        return { 
          ...t, 
          tripLogs: [newLog, ...logs], 
          currentMileage: (t.currentMileage || 0) + tripForm.distanceKm 
        };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForTrips(updatedTransports.find((t: any) => t.id === selectedVehicleForTrips.id));
    setTripFormOpen(false);
    setTripForm({ id: '', date: new Date().toISOString().split('T')[0], origin: '', destination: '', cargoDetails: '', distanceKm: 0 });
  };"""
content = re.sub(save_maint_search, lambda m: m.group(0) + save_trip, content, flags=re.DOTALL)

# 4. Add the Trip Log UI right above `return (` for the main view
main_return_search = r"  return \(\n    <div className=\"space-y-6 animate-fade-in text-left\">"
trip_ui = """  if (selectedVehicleForTrips) {
    const logs = selectedVehicleForTrips.tripLogs || [];

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForTrips(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600" /> 
              Trip Log: {selectedVehicleForTrips.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Total Trips: <span className="font-bold">{logs.length}</span></p>
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForTrips.currentMileage || 0} km</span></p>
            </div>
          </div>
          <button
            onClick={() => setTripFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            + Log Trip
          </button>
        </div>

        {tripFormOpen && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
            <h4 className="text-sm font-bold text-zinc-800 mb-4">Record New Trip</h4>
            <form onSubmit={saveTripLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                <input required type="date" value={tripForm.date} onChange={e => setTripForm({...tripForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Distance (km)</label>
                <input required type="number" value={tripForm.distanceKm} onChange={e => setTripForm({...tripForm, distanceKm: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 150" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Origin</label>
                <input required type="text" value={tripForm.origin} onChange={e => setTripForm({...tripForm, origin: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. HQ Warehouse" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Destination</label>
                <input required type="text" value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Store B" />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Cargo Details</label>
                <input required type="text" value={tripForm.cargoDetails} onChange={e => setTripForm({...tripForm, cargoDetails: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 500L Milk, 200kg Paneer" />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setTripFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">Save Trip</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                      <Navigation className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No trip logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{log.origin}</span>
                          <span className="text-zinc-400 text-[10px]">→</span>
                          <span className="font-semibold">{log.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 flex items-center gap-1"><Package className="h-3 w-3 text-zinc-400" /> {log.cargoDetails}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-800">{log.distanceKm} km</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => {
                            if(window.confirm('Delete this trip record?')) {
                              const updatedTransports = transports.map((t: any) => {
                                if (t.id === selectedVehicleForTrips.id) {
                                  return { ...t, tripLogs: t.tripLogs.filter((l: any) => l.id !== log.id) };
                                }
                                return t;
                              });
                              setTransports(updatedTransports);
                              setSelectedVehicleForTrips(updatedTransports.find((t: any) => t.id === selectedVehicleForTrips.id));
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">"""
content = re.sub(main_return_search, trip_ui, content)

# 5. Add button to main vehicle card
button_search = r"""                  <button \n                    onClick=\{\(\) => setSelectedVehicleForMaintenance\(t\)\}\n                    className=\"text-\[10px\] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1\.5 rounded-lg\"\n                  >\n                    <Wrench className=\"h-3 w-3\" /> Maintenance\n                  </button>"""
button_replace = """                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedVehicleForTrips(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      <MapPin className="h-3 w-3" /> Trip Log
                    </button>
                    <button 
                      onClick={() => setSelectedVehicleForMaintenance(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg"
                    >
                      <Wrench className="h-3 w-3" /> Maintenance
                    </button>
                  </div>"""
content = re.sub(button_search, button_replace, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

