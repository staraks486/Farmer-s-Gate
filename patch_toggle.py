import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""                      <span className=\{`px-2\.5 py-1 rounded-md text-\[10px\] font-black uppercase tracking-wider \$\{
                        d\.status === 'Active' \? 'bg-emerald-100 text-emerald-700' :
                        d\.status === 'On Leave'\? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      \}`\}>
                        \{d\.status\}
                      </span>
                    </div>"""

replacement = """                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                          d.status === 'On Leave'? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {d.status}
                        </span>
                        <button 
                          onClick={() => {
                            const newStatus = !d.isAvailable;
                            setDrivers(drivers.map((dr: any) => dr.id === d.id ? { ...dr, isAvailable: newStatus } : dr));
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            d.isAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                          }`}
                        >
                          {d.isAvailable ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {d.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                      </div>
                    </div>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

