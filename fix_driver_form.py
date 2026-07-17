with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

import re
bad_pattern = r"  const \[driverForm, setDriverForm\] = useState\(\{[\s\S]*?\}\);\|.*?\}\);\|[\s\S]*?\}\);"

good_string = """  const [driverForm, setDriverForm] = useState({
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
  });"""

content = re.sub(bad_pattern, good_string, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

