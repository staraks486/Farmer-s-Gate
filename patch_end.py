import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# remove the original MaintenanceDashboard
content = content.replace("      <MaintenanceDashboard transports={transports} />\n", "", 1)

drivers_ui = """        </>
      ) : (
        <>
          {driverFormOpen && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
              <h4 className="text-sm font-bold text-zinc-800 mb-4">{driverForm.id ? 'Edit Driver' : 'Add New Driver'}</h4>
              <form onSubmit={saveDriver} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Name</label>
                  <input required type="text" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Ramesh Singh" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Phone Number</label>
                  <input required type="text" value={driverForm.phone} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. +91 9876543210" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">License Number</label>
                  <input required type="text" value={driverForm.licenseNumber} onChange={e => setDriverForm({...driverForm, licenseNumber: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. DL-14-2020-0012345" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">License Expiry</label>
                  <input required type="date" value={driverForm.licenseExpiry} onChange={e => setDriverForm({...driverForm, licenseExpiry: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Status</label>
                  <select value={driverForm.status} onChange={e => setDriverForm({...driverForm, status: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Assign to Vehicle</label>
                  <select value={driverForm.assignedVehicleId} onChange={e => setDriverForm({...driverForm, assignedVehicleId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Unassigned</option>
                    {transports.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.vehicleName} {t.capacityKg ? `(${t.capacityKg}kg)` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setDriverFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors cursor-pointer">Save Driver</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No drivers added yet</p>
              </div>
            ) : (
              drivers.map((d: any) => {
                const assignedVehicle = transports.find(t => t.id === d.assignedVehicleId);
                const expiryDate = new Date(d.licenseExpiry);
                const isExpiringSoon = expiryDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;
                
                return (
                  <div key={d.id} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" />
                          {d.name}
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{d.phone}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        d.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <span className="w-5 text-center text-zinc-400">#</span>
                        <span className="font-mono">{d.licenseNumber}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-zinc-600'}`}>
                        <Clock className="w-3 h-3 ml-1" />
                        <span>Expires: {d.licenseExpiry}</span>
                        {isExpiringSoon && <span className="text-[9px] uppercase tracking-wider bg-rose-100 px-1.5 py-0.5 rounded text-rose-700 ml-1">Renew</span>}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Package className="w-3 h-3 ml-1" />
                        <span>Assigned: {assignedVehicle ? <span className="font-bold text-zinc-800">{assignedVehicle.vehicleName}</span> : <span className="italic text-zinc-400">Unassigned</span>}</span>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => {
                        setDriverForm(d);
                        setDriverFormOpen(true);
                      }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                        if (window.confirm('Are you sure you want to delete this driver?')) {
                          setDrivers(drivers.filter((dr: any) => dr.id !== d.id));
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
        </>
      )}
    </div>
  );
}"""

content = content.replace("          })\n        )}\n      </div>\n    </div>\n  );\n}", "          })\n        )}\n      </div>\n" + drivers_ui)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

