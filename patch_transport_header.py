import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50 rounded-2xl p-4 border border-amber-200 gap-4">
        <div>
          <h3 className="font-bold text-amber-900">Transport & Logistics Directory</h3>
          <p className="text-\[11px\] text-amber-700 mt-1">Manage delivery vehicles, driver assignments, and live transit status\.</p>
        </div>"""

replacement = """      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/60 gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-sm">
            <Navigation className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-950 tracking-tight">Transport Fleet Command</h3>
            <p className="text-xs text-amber-700/80 mt-1 font-medium">Manage vehicles, assign drivers, and monitor logistics.</p>
          </div>
        </div>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
