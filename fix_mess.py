with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

bad_text = """ const [driverForm, setDriverForm] = useState({
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    isAvailable: true,
    assignedVehicleId: ''
  });"""

content = content.replace(bad_text, "'On Leave'")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
