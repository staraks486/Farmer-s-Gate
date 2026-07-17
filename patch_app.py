import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update activePortal type
content = content.replace(
    "const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management' | 'executive' | 'store_pos'>('customer');",
    "const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management' | 'executive' | 'store_pos' | 'transport'>('customer');"
)

# 2. Add Truck import to App.tsx
if 'from \'lucide-react\';' in content and 'Truck,' not in content:
    content = content.replace('  Store as StoreIcon,', '  Store as StoreIcon,\n  Truck,')

# 3. Add to the top navigation bar (Header)
nav_bar_regex = r"(\s+<button\s+onClick=\{\(\) => changePortal\('executive'\)\}.*?</button>\s+)(</div>\s+</div>\s+</div>\s+<div className=\"flex items-center gap-2\">)"
nav_transport = """\\1  <button
                onClick={() => changePortal('transport')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'transport' 
                    ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                    : 'text-slate-300 hover:bg-emerald-900'
                }`}
              >
                <Truck className="h-3 w-3" /> 🚚 Transport
              </button>
            \\2"""
content = re.sub(nav_bar_regex, nav_transport, content, flags=re.DOTALL)

# 4. Add the component to the main App Portals
component_regex = r"(          \{/\* Main App Portals \*/\}\n)"
transport_portal = """\\1          {activePortal === 'transport' && (
            <div className="flex-1 overflow-hidden overflow-y-auto p-4 md:p-6 bg-slate-50">
              <TransportModule />
            </div>
          )}\n"""
content = re.sub(component_regex, transport_portal, content)

# 5. Add TransportModule import if missing
if 'TransportModule' not in content:
    content = content.replace(
        "import CustomerHub from './components/CustomerHub';",
        "import CustomerHub from './components/CustomerHub';\nimport TransportModule from './components/TransportModule';"
    )

with open('src/App.tsx', 'w') as f:
    f.write(content)

