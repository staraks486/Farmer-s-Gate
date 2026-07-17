import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""            <button 
              onClick=\{\(\) => setActiveTab\('drivers'\)\} 
              className=\{`px-4 py-1\.5 rounded-lg text-\[11px\] font-black uppercase tracking-wider transition-colors cursor-pointer \$\{activeTab === 'drivers' \? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'\}`\}
            >
              Drivers
            </button>
          </div>"""

replacement = """            <button 
              onClick={() => setActiveTab('drivers')} 
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'drivers' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Drivers
            </button>
            <button 
              onClick={() => setActiveTab('checklists')} 
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'checklists' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Checklists
            </button>
            <button 
              onClick={() => setActiveTab('map')} 
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'map' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Map
            </button>
          </div>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
