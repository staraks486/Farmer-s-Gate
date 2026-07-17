import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""        </>
      \)\}
    </div>
  \);
\}"""

replacement = """        </>
      )}
      {activeTab === 'checklists' && (
        <>
          {checklistFormOpen && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in mb-6">
              <h4 className="text-sm font-bold text-zinc-800 mb-4">{checklistForm.id ? 'Edit Checklist' : 'New Pre-trip Checklist'}</h4>
              <form onSubmit={saveChecklist} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Vehicle</label>
                  <select required value={checklistForm.vehicleId} onChange={e => setChecklistForm({...checklistForm, vehicleId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Select Vehicle</option>
                    {transports.map((t: any) => <option key={t.id} value={t.id}>{t.vehicleName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver</label>
                  <select required value={checklistForm.driverId} onChange={e => setChecklistForm({...checklistForm, driverId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Select Driver</option>
                    {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                  <input required type="date" value={checklistForm.date} onChange={e => setChecklistForm({...checklistForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tirePressure" checked={checklistForm.tirePressure} onChange={e => setChecklistForm({...checklistForm, tirePressure: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="tirePressure" className="text-sm text-zinc-700">Tire Pressure OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="brakes" checked={checklistForm.brakes} onChange={e => setChecklistForm({...checklistForm, brakes: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="brakes" className="text-sm text-zinc-700">Brakes OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="lights" checked={checklistForm.lights} onChange={e => setChecklistForm({...checklistForm, lights: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="lights" className="text-sm text-zinc-700">Lights OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="oilLevel" checked={checklistForm.oilLevel} onChange={e => setChecklistForm({...checklistForm, oilLevel: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="oilLevel" className="text-sm text-zinc-700">Oil Level OK</label>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Notes</label>
                  <input type="text" value={checklistForm.notes} onChange={e => setChecklistForm({...checklistForm, notes: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="Any issues observed?" />
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setChecklistFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors cursor-pointer">Save Checklist</button>
                </div>
              </form>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No checklists added yet</p>
              </div>
            ) : (
              checklists.map((c: any) => {
                const vehicle = transports.find(t => t.id === c.vehicleId);
                const driver = drivers.find(d => d.id === c.driverId);
                const isAllPass = c.tirePressure && c.brakes && c.lights && c.oilLevel;
                
                return (
                  <div key={c.id} className={`bg-white border ${isAllPass ? 'border-emerald-200' : 'border-rose-200'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                          {isAllPass ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                          {vehicle?.vehicleName || 'Unknown Vehicle'}
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{c.date} • {driver?.name || 'Unknown Driver'}</p>
                      </div>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => {
                          setChecklistForm(c);
                          setChecklistFormOpen(true);
                        }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Are you sure you want to delete this checklist?')) {
                            setChecklists(checklists.filter((ch: any) => ch.id !== c.id));
                          }
                        }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-medium">
                      <div className={`flex items-center gap-2 ${c.tirePressure ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.tirePressure ? '✓' : '✗'} Tires
                      </div>
                      <div className={`flex items-center gap-2 ${c.brakes ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.brakes ? '✓' : '✗'} Brakes
                      </div>
                      <div className={`flex items-center gap-2 ${c.lights ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.lights ? '✓' : '✗'} Lights
                      </div>
                      <div className={`flex items-center gap-2 ${c.oilLevel ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.oilLevel ? '✓' : '✗'} Oil Level
                      </div>
                    </div>
                    {c.notes && (
                      <div className="mt-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-xs text-zinc-600">
                        <span className="font-bold">Notes:</span> {c.notes}
                      </div>
                    )}
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

content = re.sub(target, replacement, content)
with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
