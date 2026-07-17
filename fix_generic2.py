import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("useState<any[]>", "useState")
content = content.replace("useState<any>", "useState")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
