import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target1 = r"""  const \[driverForm, setDriverForm\] = useState\(\{
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    isAvailable: true,
    assignedVehicleId: ''
  \}\);"""

replacement1 = """  const [driverForm, setDriverForm] = useState({
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

target2 = r"setDriverForm\(\{ id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', isAvailable: true, assignedVehicleId: '' \}\);"

replacement2 = "setDriverForm({ id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', isAvailable: true, assignedVehicleId: '', photoUrl: '', experienceYears: 0, bloodGroup: '', rating: 5.0, incidents: 0 });"

content = re.sub(target1, replacement1, content)
content = re.sub(target2, replacement2, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

