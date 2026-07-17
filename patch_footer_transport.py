import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

target = r"""            <a 
              href="#transport" 
              onClick=\{\(e\) => \{ e\.preventDefault\(\); changePortal\('transport'\); \}\}
              className=\{`hover:text-emerald-400 transition-colors flex items-center gap-1\.5 px-3 py-1\.5 rounded-lg border text-\[11px\] font-bold tracking-wide uppercase \$\{
                activePortal === 'transport' 
                  \? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-\[0_0_15px_-3px_rgba\(16,185,129,0\.2\)\]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              \}`\}
            >
              <Truck className="h-3\.5 w-3\.5" /> Transport Live
            </a>"""

replacement = """            <a 
              href="#transport" 
              onClick={(e) => { e.preventDefault(); changePortal('management', 'transport'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'management' && window.location.hash.toLowerCase() === '#transport'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Truck className="h-3.5 w-3.5" /> Transport Live
            </a>"""

content = re.sub(target, replacement, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
