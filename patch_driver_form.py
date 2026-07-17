import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""  const \[driverForm, setDriverForm\] = useState\(\{
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    assignedVehicleId: ''
  \}\);"""

replacement = """  const [driverForm, setDriverForm] = useState({
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    isAvailable: true,
    assignedVehicleId: ''
  });"""

content = re.sub(target, replacement, content)

target2 = r"setDriverForm\(\{ id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', assignedVehicleId: '' \}\);"
replacement2 = "setDriverForm({ id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', isAvailable: true, assignedVehicleId: '' });"

content = re.sub(target2, replacement2, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

