with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i == 153 and "{activeTab === 'map' && (" in line:
        skip = True
    
    if skip and i >= 153:
        if "    </div>" in line and "  );" in lines[i+1] and "}" in lines[i+2]:
            # Stop skipping but don't include the map block
            skip = False
            continue
        if skip:
            continue
            
    new_lines.append(line)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.writelines(new_lines)
