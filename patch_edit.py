import re

with open('src/components/AdminPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace('  MapPin,', '  MapPin,\n  Edit,')

with open('src/components/AdminPanel.tsx', 'w') as f:
    f.write(content)
