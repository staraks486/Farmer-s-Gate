with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "const reportText =" in line:
        skip = True
        new_lines.append("                const reportText = `*CRITICAL FLEET ALERT* 🚨\\n\\nThe following vehicles require immediate service:\\n` + criticalVehicles.map(t => { const remaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0); return `- *${t.vehicleName}*: ${remaining <= 0 ? `OVERDUE by ${Math.abs(remaining)}km` : `Service due in ${remaining}km`} (Driver: ${t.driverName})`; }).join('\\n');\n")
    elif "window.open(`https://wa.me/" in line:
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.writelines(new_lines)
