import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"const \[activeTab, setActiveTab\] = useState\<'vehicles' \| 'drivers'\>\('vehicles'\);"
replacement = "const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'checklists'>('vehicles');"

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
