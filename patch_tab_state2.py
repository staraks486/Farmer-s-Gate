import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("useState<'vehicles' | 'drivers' | 'checklists'>('vehicles');", "useState<'vehicles' | 'drivers' | 'checklists' | 'map'>('vehicles');")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
