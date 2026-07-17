import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

# 1. Add activeDirectoryTab state
content = content.replace(
    'function CompanyOfficialsSubTab({',
    'function CompanyOfficialsSubTab({\n'
)
content = content.replace(
    '  const [formOpen, setFormOpen] = React.useState(false);',
    '  const [activeDirectoryTab, setActiveDirectoryTab] = React.useState<\'officials\' | \'transport\'>(\'officials\');\n  const [formOpen, setFormOpen] = React.useState(false);'
)

# 2. Add transport module state
transport_state = """
  // Transport Module State
  const [transports, setTransports] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fg_hq_transports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('fg_hq_transports', JSON.stringify(transports));
  }, [transports]);

  const [transportFormOpen, setTransportFormOpen] = React.useState(false);
  const [transportForm, setTransportForm] = React.useState({
    id: '',
    vehicleName: '',
    driverName: '',
    driverPhone: '',
    capacityKg: '',
    status: 'Available' as 'Available' | 'En Route' | 'Maintenance',
    route: ''
  });
"""

content = content.replace(
    '  // Form fields',
    transport_state + '\n  // Form fields'
)


# 3. Add tabs and wrap existing JSX
replacement_jsx = """
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setActiveDirectoryTab('officials')} 
          className={`px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition-all ${activeDirectoryTab === 'officials' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          👤 Officials
        </button>
        <button 
          onClick={() => setActiveDirectoryTab('transport')} 
          className={`px-4 py-2 text-[11px] font-black tracking-wider uppercase rounded-xl transition-all flex items-center gap-2 ${activeDirectoryTab === 'transport' ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
        >
          <span>🚚</span> Transport Fleet
        </button>
      </div>

      {activeDirectoryTab === 'officials' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Action */}
          <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Company Officials Directory</h3>
              <p className="text-xs text-zinc-500">Manage contact information, designations, and mobile numbers of key executive officials.</p>
            </div>
            <button
              onClick={() => {
                if (formOpen) {
                  resetForm();
                } else {
                  setFormOpen(true);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {formOpen ? 'Collapse Form' : 'Add Official'}
            </button>
          </div>
"""

content = content.replace(
    '  return (\n    <div className="space-y-6 animate-fade-in">\n      {/* Header Action */}\n      <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">\n        <div>\n          <h3 className="font-bold text-zinc-900 text-sm">Company Officials Directory</h3>\n          <p className="text-xs text-zinc-500">Manage contact information, designations, and mobile numbers of key executive officials.</p>\n        </div>\n        <button\n          onClick={() => {\n            if (formOpen) {\n              resetForm();\n            } else {\n              setFormOpen(true);\n            }\n          }}\n          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all cursor-pointer"\n        >\n          <Plus className="h-4 w-4" />\n          {formOpen ? \'Collapse Form\' : \'Add Official\'}\n        </button>\n      </div>',
    replacement_jsx
)

# 4. Add the transport tab rendering at the end of the component
transport_tab_jsx = """
        </div>
      )}

      {activeDirectoryTab === 'transport' && (
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
                onSubmit={(e) => {
                  e.preventDefault();
                  if (transportForm.id) {
                    setTransports(transports.map((t: any) => t.id === transportForm.id ? transportForm : t));
                  } else {
                    setTransports([...transports, { ...transportForm, id: Date.now().toString() }]);
                  }
                  setTransportFormOpen(false);
                  setTransportForm({ id: '', vehicleName: '', driverName: '', driverPhone: '', capacityKg: '', status: 'Available', route: '' });
                }}
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
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => {setTransportFormOpen(false); setTransportForm({ id: '', vehicleName: '', driverName: '', driverPhone: '', capacityKg: '', status: 'Available', route: '' });}} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
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
              transports.map((t: any) => (
                <div key={t.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
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

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-zinc-100">
                    <button onClick={() => {
                      setTransportForm(t);
                      setTransportFormOpen(true);
                    }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button onClick={() => {
                      if (confirm('Are you sure you want to delete this vehicle?')) {
                        setTransports(transports.filter((tr: any) => tr.id !== t.id));
                      }
                    }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"""

content = content.replace(
    '        </div>\n      </div>\n    </div>\n  );\n}',
    '        </div>\n      </div>\n' + transport_tab_jsx + '\n}'
)


with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)

