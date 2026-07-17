import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""                <div>
                  <label className="block text-\[10px\] font-black uppercase tracking-wider text-zinc-500 mb-1">Assign to Vehicle</label>
                  <select value=\{driverForm.assignedVehicleId\} onChange=\{e => setDriverForm\(\{...driverForm, assignedVehicleId: e\.target\.value\}\)\} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Unassigned</option>
                    \{transports\.map\(\(t: any\) => \(
                      <option key=\{t\.id\} value=\{t\.id\}>\{t\.vehicleName\} \{t\.capacityKg \? `\(\{t\.capacityKg\}kg\)` : ''\}</option>
                    \)\)\}
                  </select>
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">"""

replacement = """                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Assign to Vehicle</label>
                  <select value={driverForm.assignedVehicleId} onChange={e => setDriverForm({...driverForm, assignedVehicleId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Unassigned</option>
                    {transports.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.vehicleName} {t.capacityKg ? `(${t.capacityKg}kg)` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Photo URL</label>
                  <input type="text" value={driverForm.photoUrl} onChange={e => setDriverForm({...driverForm, photoUrl: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. https://images.unsplash.com/..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Experience (Years)</label>
                  <input type="number" value={driverForm.experienceYears} onChange={e => setDriverForm({...driverForm, experienceYears: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Blood Group</label>
                  <input type="text" value={driverForm.bloodGroup} onChange={e => setDriverForm({...driverForm, bloodGroup: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. O+" />
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

