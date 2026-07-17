import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""                  <div key=\{d\.id\} className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" />
                          \{d\.name\}
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">\{d\.phone\}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className=\{`px-2\.5 py-1 rounded-md text-\[10px\] font-black uppercase tracking-wider \$\{
                          d\.status === 'Active' \? 'bg-emerald-100 text-emerald-700' :
                          d\.status === 'On Leave'\? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        \}`\}>
                          \{d\.status\}
                        </span>
                        <button 
                          onClick=\{\(\) => \{
                            const newStatus = !d\.isAvailable;
                            setDrivers\(drivers\.map\(\(dr: any\) => dr\.id === d\.id \? \{ \.\.\.dr, isAvailable: newStatus \} : dr\)\);
                          \}\}
                          className=\{`flex items-center gap-1\.5 px-2 py-1 rounded-md text-\[10px\] font-bold uppercase tracking-wider transition-colors cursor-pointer \$\{
                            d\.isAvailable \? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'
                          \}`\}
                        >
                          \{d\.isAvailable \? <ToggleRight className="h-3\.5 w-3\.5" /> : <ToggleLeft className="h-3\.5 w-3\.5" />\}
                          \{d\.isAvailable \? 'Available' : 'Unavailable'\}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <span className="w-5 text-center text-zinc-400">#</span>
                        <span className="font-mono">\{d\.licenseNumber\}</span>
                      </div>
                      <div className=\{`flex items-center gap-2 \$\{isExpiringSoon \? 'text-rose-600 font-bold' : 'text-zinc-600'\}\`\}>
                        <Clock className="w-3 h-3 ml-1" />
                        <span>Expires: \{d\.licenseExpiry\}</span>
                        \{isExpiringSoon && <span className="text-\[9px\] uppercase tracking-wider bg-rose-100 px-1\.5 py-0\.5 rounded text-rose-700 ml-1">Renew</span>\}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Package className="w-3 h-3 ml-1" />
                        <span>Assigned: \{assignedVehicle \? <span className="font-bold text-zinc-800">\{assignedVehicle\.vehicleName\}</span> : <span className="italic text-zinc-400">Unassigned</span>\}</span>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick=\{\(\) => \{
                        setDriverForm\(d\);
                        setDriverFormOpen\(true\);
                      \}\} className="p-1\.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick=\{\(\) => \{
                        if \(window\.confirm\('Are you sure you want to delete this driver\?'\)\) \{
                          setDrivers\(drivers\.filter\(\(dr: any\) => dr\.id !== d\.id\)\);
                        \}
                      \}\} className="p-1\.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>"""

replacement = """                  <div key={d.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all relative group">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {d.photoUrl ? (
                            <img src={d.photoUrl} alt={d.name} className="w-12 h-12 rounded-full object-cover border border-zinc-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                              <User className="h-6 w-6 text-zinc-400" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-zinc-900">{d.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] font-bold text-zinc-500">{d.phone}</p>
                              {d.rating && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                  ⭐ {d.rating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-100 shadow-sm z-10">
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
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Experience</p>
                          <p className="text-xs font-bold text-zinc-800">{d.experienceYears ? `${d.experienceYears} Years` : 'N/A'}</p>
                        </div>
                        <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Blood Group</p>
                          <p className="text-xs font-bold text-rose-600">{d.bloodGroup || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs border-t border-zinc-100 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <span className="w-5 text-center text-zinc-400">#</span>
                            <span className="font-mono font-medium">{d.licenseNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'On Leave'? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <div className={`flex items-center justify-between ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-zinc-600'}`}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 ml-1" />
                            <span>Expires: {d.licenseExpiry}</span>
                          </div>
                          {isExpiringSoon && <span className="text-[9px] uppercase tracking-wider bg-rose-100 px-1.5 py-0.5 rounded text-rose-700">Renew</span>}
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 ml-1 text-zinc-400" />
                            <span>Vehicle</span>
                          </div>
                          <span className="font-semibold text-zinc-800">{assignedVehicle ? assignedVehicle.vehicleName : <span className="italic text-zinc-400 font-normal">Unassigned</span>}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-zinc-50 px-5 py-3 border-t border-zinc-200 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Duty Status</span>
                       <button 
                          onClick={() => {
                            const newStatus = !d.isAvailable;
                            setDrivers(drivers.map((dr: any) => dr.id === d.id ? { ...dr, isAvailable: newStatus } : dr));
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            d.isAvailable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                          }`}
                        >
                          {d.isAvailable ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {d.isAvailable ? 'Available for Trip' : 'Unavailable'}
                        </button>
                    </div>
                  </div>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

