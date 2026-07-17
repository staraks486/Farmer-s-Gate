import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

state_search = r"  const \[transportFormOpen, setTransportFormOpen\] = useState\(false\);"

drivers_state = """  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [drivers, setDrivers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fg_hq_drivers');
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'd1',
          name: 'Ramesh Singh',
          phone: '+91 9876543210',
          licenseNumber: 'DL-14-2020-0012345',
          licenseExpiry: '2025-10-15',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '1'
        },
        {
          id: 'd2',
          name: 'Suresh Kumar',
          phone: '+91 8765432109',
          licenseNumber: 'DL-14-2018-0054321',
          licenseExpiry: '2026-05-20',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '2'
        },
        {
          id: 'd3',
          name: 'Abdul Rehman',
          phone: '+91 7654321098',
          licenseNumber: 'DL-14-2019-0098765',
          licenseExpiry: '2024-12-01',
          status: 'On Leave',
          isAvailable: false,
          assignedVehicleId: '3'
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fg_hq_drivers', JSON.stringify(drivers));
  }, [drivers]);

  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    isAvailable: true,
    assignedVehicleId: ''
  });

  const saveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (driverForm.id) {
      setDrivers(drivers.map((d: any) => d.id === driverForm.id ? { ...d, ...driverForm } : d));
      if (driverForm.assignedVehicleId) {
        setTransports(transports.map((t: any) => 
          t.id === driverForm.assignedVehicleId ? { ...t, driverName: driverForm.name, driverPhone: driverForm.phone } : 
          (t.driverName === driverForm.name ? { ...t, driverName: 'Unassigned', driverPhone: '' } : t)
        ));
      }
    } else {
      setDrivers([...drivers, { ...driverForm, id: Date.now().toString() }]);
      if (driverForm.assignedVehicleId) {
        setTransports(transports.map((t: any) => t.id === driverForm.assignedVehicleId ? { ...t, driverName: driverForm.name, driverPhone: driverForm.phone } : t));
      }
    }
    setDriverFormOpen(false);
    setDriverForm({ id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', isAvailable: true, assignedVehicleId: '' });
  };

  const [transportFormOpen, setTransportFormOpen] = useState(false);"""

content = re.sub(state_search, drivers_state, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

