import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# 1. Update the state for transports to include more fields
# t.currentMileage, t.nextServiceMileage, t.maintenanceLogs

# Let's completely replace TransportModule for easier addition.
new_content = """import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Wrench, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export default function TransportModule() {
  const [transports, setTransports] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fg_hq_transports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fg_hq_transports', JSON.stringify(transports));
  }, [transports]);

  const [transportFormOpen, setTransportFormOpen] = useState(false);
  const [transportForm, setTransportForm] = useState({
    id: '',
    vehicleName: '',
    driverName: '',
    driverPhone: '',
    capacityKg: '',
    status: 'Available' as 'Available' | 'En Route' | 'Maintenance',
    route: '',
    currentMileage: 0,
    nextServiceMileage: 0
  });

  // Maintenance Sub-view state
  const [selectedVehicleForMaintenance, setSelectedVehicleForMaintenance] = useState<any | null>(null);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: 0,
    mileageAtService: 0
  });

  const saveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (transportForm.id) {
      setTransports(transports.map((t: any) => t.id === transportForm.id ? { ...t, ...transportForm } : t));
    } else {
      setTransports([...transports, { 
        ...transportForm, 
        id: Date.now().toString(),
        maintenanceLogs: []
      }]);
    }
    setTransportFormOpen(false);
    resetTransportForm();
  };

  const resetTransportForm = () => {
    setTransportForm({ 
      id: '', vehicleName: '', driverName: '', driverPhone: '', 
      capacityKg: '', status: 'Available', route: '', 
      currentMileage: 0, nextServiceMileage: 0 
    });
  };

  const saveMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForMaintenance) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForMaintenance.id) {
        const logs = t.maintenanceLogs || [];
        const newLog = { ...maintenanceForm, id: Date.now().toString() };
        return { ...t, maintenanceLogs: [newLog, ...logs], currentMileage: Math.max(t.currentMileage, maintenanceForm.mileageAtService) };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForMaintenance(updatedTransports.find((t: any) => t.id === selectedVehicleForMaintenance.id));
    setMaintenanceFormOpen(false);
    setMaintenanceForm({ id: '', date: new Date().toISOString().split('T')[0], description: '', cost: 0, mileageAtService: 0 });
  };

  if (selectedVehicleForMaintenance) {
    const logs = selectedVehicleForMaintenance.maintenanceLogs || [];
    const mileageRemaining = (selectedVehicleForMaintenance.nextServiceMileage || 0) - (selectedVehicleForMaintenance.currentMileage || 0);
    const needsService = mileageRemaining <= 500 && (selectedVehicleForMaintenance.nextServiceMileage > 0);

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForMaintenance(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" /> 
              Maintenance: {selectedVehicleForMaintenance.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForMaintenance.currentMileage || 0} km</span></p>
               <p className="text-xs text-zinc-600 font-medium">Next Service Due: <span className="font-bold">{selectedVehicleForMaintenance.nextServiceMileage || 0} km</span></p>
            </div>
          </div>
          <button
            onClick={() => setMaintenanceFormOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            + Log Service
          </button>
        </div>

        {needsService && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <div>
              <p className="text-xs font-bold text-rose-800">Service Due Soon</p>
              <p className="text-[11px] text-rose-600">This vehicle is within 500km of its next scheduled service ({mileageRemaining}km remaining).</p>
            </div>
          </div>
        )}

        {maintenanceFormOpen && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
            <h4 className="text-sm font-bold text-zinc-800 mb-4">Log Maintenance Record</h4>
            <form onSubmit={saveMaintenanceLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                <input required type="date" value={maintenanceForm.date} onChange={e => setMaintenanceForm({...maintenanceForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Mileage at Service</label>
                <input required type="number" value={maintenanceForm.mileageAtService} onChange={e => setMaintenanceForm({...maintenanceForm, mileageAtService: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 15000" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Cost (₹)</label>
                <input required type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm({...maintenanceForm, cost: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 5000" />
              </div>
              <div className="lg:col-span-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Description of Work</label>
                <input required type="text" value={maintenanceForm.description} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Oil change, brake pad replacement" />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setMaintenanceFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">Save Log</button>
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
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Mileage</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No maintenance logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                      <td className="px-4 py-3 text-zinc-600">{log.description}</td>
                      <td className="px-4 py-3 text-zinc-600">{log.mileageAtService} km</td>
                      <td className="px-4 py-3 font-semibold text-zinc-800">₹{log.cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => {
                            if(window.confirm('Delete this maintenance record?')) {
                              const updatedTransports = transports.map((t: any) => {
                                if (t.id === selectedVehicleForMaintenance.id) {
                                  return { ...t, maintenanceLogs: t.maintenanceLogs.filter((l: any) => l.id !== log.id) };
                                }
                                return t;
                              });
                              setTransports(updatedTransports);
                              setSelectedVehicleForMaintenance(updatedTransports.find((t: any) => t.id === selectedVehicleForMaintenance.id));
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
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex items-center justify-between bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <div>
          <h3 className="font-bold text-amber-900">Transport & Logistics Directory</h3>
          <p className="text-[11px] text-amber-700 mt-1">Manage delivery vehicles, driver assignments, and live transit status.</p>
        </div>
        <button
          onClick={() => setTransportFormOpen(true)}
          className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer"
        >
          + Add Vehicle
        </button>
      </div>

      {transportFormOpen && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
          <h4 className="text-sm font-bold text-zinc-800 mb-4">{transportForm.id ? 'Edit Vehicle' : 'Add New Vehicle'}</h4>
          <form
            onSubmit={saveVehicle}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Vehicle Name / Number</label>
              <input required type="text" value={transportForm.vehicleName} onChange={e => setTransportForm({...transportForm, vehicleName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. MH 12 AB 1234" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Name</label>
              <input required type="text" value={transportForm.driverName} onChange={e => setTransportForm({...transportForm, driverName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Phone</label>
              <input required type="text" value={transportForm.driverPhone} onChange={e => setTransportForm({...transportForm, driverPhone: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. +91 9876543210" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Capacity (KG)</label>
              <input required type="number" value={transportForm.capacityKg} onChange={e => setTransportForm({...transportForm, capacityKg: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 5000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Status</label>
              <select value={transportForm.status} onChange={e => setTransportForm({...transportForm, status: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                <option value="Available">Available</option>
                <option value="En Route">En Route</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Current Route</label>
              <input type="text" value={transportForm.route} onChange={e => setTransportForm({...transportForm, route: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. HQ to Store A" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Current Mileage (km)</label>
              <input type="number" value={transportForm.currentMileage} onChange={e => setTransportForm({...transportForm, currentMileage: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 12000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Next Service Due (km)</label>
              <input type="number" value={transportForm.nextServiceMileage} onChange={e => setTransportForm({...transportForm, nextServiceMileage: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 15000" />
            </div>
            <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => {setTransportFormOpen(false); resetTransportForm();}} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">Save Vehicle</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transports.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
            <span className="text-4xl mb-2 block">🚚</span>
            <p className="font-semibold text-sm">No vehicles added yet</p>
            <p className="text-xs mt-1 text-zinc-500">Add a vehicle to manage your transport fleet.</p>
          </div>
        ) : (
          transports.map((t: any) => {
            const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
            const needsService = mileageRemaining <= 500 && (t.nextServiceMileage > 0);

            return (
              <div key={t.id} className={`bg-white border ${needsService ? 'border-rose-300' : 'border-zinc-200'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                      {t.vehicleName}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        t.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'En Route' ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {t.status}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Capacity: {t.capacityKg} kg</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">👤</span>
                    <span className="font-semibold">{t.driverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">📞</span>
                    <span>{t.driverPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">📍</span>
                    <span className="truncate">{t.route || 'No active route'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    {needsService ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md">
                        <AlertTriangle className="h-3 w-3" /> Service Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Healthy
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setSelectedVehicleForMaintenance(t)}
                    className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg"
                  >
                    <Wrench className="h-3 w-3" /> Maintenance
                  </button>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-zinc-100">
                  <button onClick={() => {
                    setTransportForm({
                      ...t,
                      currentMileage: t.currentMileage || 0,
                      nextServiceMileage: t.nextServiceMileage || 0
                    });
                    setTransportFormOpen(true);
                  }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => {
                    if (window.confirm('Are you sure you want to delete this vehicle?')) {
                      setTransports(transports.filter((tr: any) => tr.id !== t.id));
                    }
                  }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
"""

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(new_content)

