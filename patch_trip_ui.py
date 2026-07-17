import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""              <div className="lg:col-span-4">
                <label className="block text-\[10px\] font-black uppercase tracking-wider text-zinc-500 mb-1">Cargo Details</label>
                <input required type="text" value=\{tripForm\.cargoDetails\} onChange=\{e => setTripForm\(\{...tripForm, cargoDetails: e\.target\.value\}\)\} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e\.g\. 500L Milk, 200kg Paneer" />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-2 mt-2">"""

replacement = """              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver</label>
                <select required value={tripForm.driverId} onChange={e => setTripForm({...tripForm, driverId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                  <option value="">Select Driver</option>
                  {drivers.filter((d: any) => d.status === 'Active' && d.isAvailable).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Cargo Details</label>
                <input required type="text" value={tripForm.cargoDetails} onChange={e => setTripForm({...tripForm, cargoDetails: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 500L Milk, 200kg Paneer" />
              </div>
              <div className="lg:col-span-4 flex justify-end gap-2 mt-2">"""

content = re.sub(target, replacement, content)

# Replace lg:grid-cols-4 with lg:grid-cols-5 for the form.
content = content.replace('className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"', 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"')
# Replace lg:col-span-4 with lg:col-span-5
content = content.replace('className="lg:col-span-4 flex justify-end gap-2 mt-2"', 'className="lg:col-span-5 flex justify-end gap-2 mt-2"')
content = content.replace('className="lg:col-span-4"\n                ><label className="block text-[10px]', 'className="lg:col-span-5"\n                ><label className="block text-[10px]') # won't match exactly maybe

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

