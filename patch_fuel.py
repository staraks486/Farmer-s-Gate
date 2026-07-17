import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Edit, Trash2, Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, Navigation, Package } from 'lucide-react';",
    "import { Edit, Trash2, Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, Navigation, Package, Droplet, TrendingUp } from 'lucide-react';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';"
)

# 2. Add state variables
state_search = r"  const \[tripForm, setTripForm\] = useState\(\{.*?  \}\);"
fuel_state = """
  // Fuel Log Sub-view state
  const [selectedVehicleForFuel, setSelectedVehicleForFuel] = useState<any | null>(null);
  const [fuelFormOpen, setFuelFormOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    fuelVolumeLiters: 0,
    cost: 0,
    mileageAtFillup: 0
  });"""
content = re.sub(state_search, lambda m: m.group(0) + fuel_state, content, flags=re.DOTALL)

# 3. Add saveFuelLog function
save_trip_search = r"  const saveTripLog = \(e: React\.FormEvent\) => \{.*?\n  \};"
save_fuel = """
  const saveFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForFuel) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForFuel.id) {
        const logs = t.fuelLogs || [];
        const newLog = { ...fuelForm, id: Date.now().toString() };
        return { 
          ...t, 
          fuelLogs: [newLog, ...logs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
          currentMileage: Math.max((t.currentMileage || 0), fuelForm.mileageAtFillup) 
        };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForFuel(updatedTransports.find((t: any) => t.id === selectedVehicleForFuel.id));
    setFuelFormOpen(false);
    setFuelForm({ id: '', date: new Date().toISOString().split('T')[0], fuelVolumeLiters: 0, cost: 0, mileageAtFillup: 0 });
  };"""
content = re.sub(save_trip_search, lambda m: m.group(0) + save_fuel, content, flags=re.DOTALL)

# 4. Add Fuel Log UI right before Trip Log UI
trip_ui_search = r"  if \(selectedVehicleForTrips\) \{"
fuel_ui = """  if (selectedVehicleForFuel) {
    const logs = selectedVehicleForFuel.fuelLogs || [];
    
    // Calculate fuel efficiency (km/l)
    const chartData = logs.length >= 2 ? [...logs].reverse().map((log: any, index: number, arr: any[]) => {
      if (index === 0) return null;
      const prevLog = arr[index - 1];
      const distance = log.mileageAtFillup - prevLog.mileageAtFillup;
      const efficiency = distance > 0 ? (distance / log.fuelVolumeLiters).toFixed(2) : 0;
      return {
        date: log.date,
        efficiency: Number(efficiency)
      };
    }).filter(Boolean) : [];

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForFuel(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Droplet className="h-4 w-4 text-purple-600" /> 
              Fuel & Efficiency: {selectedVehicleForFuel.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Total Fill-ups: <span className="font-bold">{logs.length}</span></p>
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForFuel.currentMileage || 0} km</span></p>
            </div>
          </div>
          <button
            onClick={() => setFuelFormOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
          >
            + Log Fuel
          </button>
        </div>

        {chartData.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
            <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-zinc-500"/> Efficiency Trend (km/l)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} km/l`, 'Efficiency']}
                  />
                  <Line type="monotone" dataKey="efficiency" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {fuelFormOpen && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
            <h4 className="text-sm font-bold text-zinc-800 mb-4">Record Fuel Fill-up</h4>
            <form onSubmit={saveFuelLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                <input required type="date" value={fuelForm.date} onChange={e => setFuelForm({...fuelForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Mileage at Fill-up (km)</label>
                <input required type="number" value={fuelForm.mileageAtFillup} onChange={e => setFuelForm({...fuelForm, mileageAtFillup: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 15200" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Fuel Volume (Liters)</label>
                <input required type="number" step="0.1" value={fuelForm.fuelVolumeLiters} onChange={e => setFuelForm({...fuelForm, fuelVolumeLiters: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 45.5" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Total Cost (₹)</label>
                <input required type="number" value={fuelForm.cost} onChange={e => setFuelForm({...fuelForm, cost: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 4500" />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setFuelFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors cursor-pointer">Save Fuel Log</button>
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
                  <th className="px-4 py-3">Mileage</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Efficiency (km/l)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      <Droplet className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No fuel logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any, index: number) => {
                    // Calculate efficiency for display
                    let efficiency = '-';
                    if (index < logs.length - 1) {
                      const prevLog = logs[index + 1]; // next older log
                      const distance = log.mileageAtFillup - prevLog.mileageAtFillup;
                      if (distance > 0) {
                        efficiency = (distance / log.fuelVolumeLiters).toFixed(2);
                      }
                    }
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                        <td className="px-4 py-3 text-zinc-600">{log.mileageAtFillup} km</td>
                        <td className="px-4 py-3 text-zinc-600">{log.fuelVolumeLiters} L</td>
                        <td className="px-4 py-3 font-semibold text-zinc-800">₹{log.cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-zinc-600">{efficiency !== '-' ? <span className="text-emerald-600 font-semibold">{efficiency} km/l</span> : <span className="text-zinc-400 text-xs italic">Initial fill-up</span>}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => {
                              if(window.confirm('Delete this fuel record?')) {
                                const updatedTransports = transports.map((t: any) => {
                                  if (t.id === selectedVehicleForFuel.id) {
                                    return { ...t, fuelLogs: t.fuelLogs.filter((l: any) => l.id !== log.id) };
                                  }
                                  return t;
                                });
                                setTransports(updatedTransports);
                                setSelectedVehicleForFuel(updatedTransports.find((t: any) => t.id === selectedVehicleForFuel.id));
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (selectedVehicleForTrips) {"""
content = content.replace("  if (selectedVehicleForTrips) {", fuel_ui)


# 5. Add Fuel button to main vehicle card
button_search = r"""                  <div className=\"flex gap-2\">\n                    <button \n                      onClick=\{\(\) => setSelectedVehicleForTrips\(t\)\}\n                      className=\"text-\[10px\] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1\.5 rounded-lg\"\n                    >\n                      <MapPin className=\"h-3 w-3\" /> Trip Log\n                    </button>\n                    <button \n                      onClick=\{\(\) => setSelectedVehicleForMaintenance\(t\)\}\n                      className=\"text-\[10px\] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1\.5 rounded-lg\"\n                    >\n                      <Wrench className=\"h-3 w-3\" /> Maintenance\n                    </button>\n                  </div>"""
button_replace = """                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedVehicleForFuel(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg"
                    >
                      <Droplet className="h-3 w-3" /> Fuel
                    </button>
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
                      <Wrench className="h-3 w-3" /> Maint.
                    </button>
                  </div>"""
content = re.sub(button_search, button_replace, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

