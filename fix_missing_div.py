with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 153 and "</div>" in line and "</div>" in lines[i-1]:
        # Insert another </div>! Wait, I'll just check line 152 and 153.
        pass

    new_lines.append(line)

