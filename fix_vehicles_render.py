with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "{activeTab === 'vehicles' ? (" in line:
        new_lines.append(line.replace("{activeTab === 'vehicles' ? (", "{activeTab === 'vehicles' && ("))
    else:
        new_lines.append(line)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.writelines(new_lines)
