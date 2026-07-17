import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target_thead = r"""              <thead className="bg-zinc-50 border-b border-zinc-200 text-\[10px\] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>"""

replacement_thead = """              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>"""

target_tbody = r"""                    <tr key=\{log\.id\} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-700">\{log\.date\}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1\.5">
                          <span className="font-semibold">\{log\.origin\}</span>
                          <span className="text-zinc-400 text-\[10px\]">→</span>
                          <span className="font-semibold">\{log\.destination\}</span>
                        </div>
                      </td>"""

replacement_tbody = """                    <tr key={log.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-zinc-400" />
                          <span className="font-medium text-xs">{drivers.find((d: any) => d.id === log.driverId)?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{log.origin}</span>
                          <span className="text-zinc-400 text-[10px]">→</span>
                          <span className="font-semibold">{log.destination}</span>
                        </div>
                      </td>"""

target_colspan = r'<td colSpan=\{5\} className="px-4 py-8 text-center text-zinc-400">'
replacement_colspan = '<td colSpan={6} className="px-4 py-8 text-center text-zinc-400">'

content = re.sub(target_thead, replacement_thead, content)
content = re.sub(target_tbody, replacement_tbody, content)
content = content.replace(target_colspan, replacement_colspan)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

