import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target_header = r"""  return \(
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex items-center justify-between bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <div>
          <h3 className="font-bold text-amber-900">Transport & Logistics Directory</h3>
          <p className="text-\[11px\] text-amber-700 mt-1">Manage delivery vehicles, driver assignments, and live transit status.</p>
        </div>
        <button
          onClick=\{\(\) => setTransportFormOpen\(true\)\}
          className="px-4 py-2 bg-amber-600 text-white text-\[11px\] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer"
        >
          \+ Add Vehicle
        </button>
      </div>"""

replacement_header = """  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50 rounded-2xl p-4 border border-amber-200 gap-4">
        <div>
          <h3 className="font-bold text-amber-900">Transport & Logistics Directory</h3>
          <p className="text-[11px] text-amber-700 mt-1">Manage delivery vehicles, driver assignments, and live transit status.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-amber-100 rounded-xl p-1">
            <button 
              onClick={() => setActiveTab('vehicles')} 
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'vehicles' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Vehicles
            </button>
            <button 
              onClick={() => setActiveTab('drivers')} 
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'drivers' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Drivers
            </button>
          </div>
          {activeTab === 'vehicles' ? (
            <button
              onClick={() => setTransportFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add Vehicle
            </button>
          ) : (
            <button
              onClick={() => setDriverFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add Driver
            </button>
          )}
        </div>
      </div>"""

content = re.sub(target_header, replacement_header, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

