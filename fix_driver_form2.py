with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "const [driverForm, setDriverForm] = useState({" in line and not skip:
        skip = True
        new_lines.append("""  const [driverForm, setDriverForm] = useState({
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    isAvailable: true,
    assignedVehicleId: '',
    photoUrl: '',
    experienceYears: 0,
    bloodGroup: '',
    rating: 5.0,
    incidents: 0
  });\n""")
    elif "const saveDriver = (e: React.FormEvent) => {" in line:
        skip = False
        new_lines.append(line)
    elif not skip:
        new_lines.append(line)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.writelines(new_lines)
