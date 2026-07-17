import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = ")          ) : user && ['admin', 'supply_office', 'ledger', 'supply_chain', 'store_pos'].includes(userRole.role) ? ("

replacement = """)          ) : activePortal === 'transport' ? (
            <motion.div
              key="transport-portal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden bg-slate-50 overflow-y-auto"
            >
              <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
                <TransportModule />
              </div>
            </motion.div>
          ) : user && ['admin', 'supply_office', 'ledger', 'supply_chain', 'store_pos'].includes(userRole.role) ? ("""

content = content.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)

