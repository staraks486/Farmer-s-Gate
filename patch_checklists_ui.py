import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""          \{activeTab === 'vehicles' \? \(
            <button
              onClick=\{\(\) => setTransportFormOpen\(true\)\}
              className="px-4 py-2 bg-amber-600 text-white text-\[11px\] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              \+ Add Vehicle
            </button>
          \) : \(
            <button
              onClick=\{\(\) => setDriverFormOpen\(true\)\}
              className="px-4 py-2 bg-amber-600 text-white text-\[11px\] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              \+ Add Driver
            </button>
          \)\}"""

replacement = """          {activeTab === 'vehicles' && (
            <button
              onClick={() => setTransportFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add Vehicle
            </button>
          )}
          {activeTab === 'drivers' && (
            <button
              onClick={() => setDriverFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add Driver
            </button>
          )}
          {activeTab === 'checklists' && (
            <button
              onClick={() => setChecklistFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              + New Checklist
            </button>
          )}"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
