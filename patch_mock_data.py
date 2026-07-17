import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

mock_data = """      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
      return [
        {
          id: '1',
          vehicleName: 'MH 12 AB 1234',
          driverName: 'Ramesh Singh',
          driverPhone: '+91 9876543210',
          capacityKg: '5000',
          status: 'En Route',
          route: 'HQ to Store A',
          currentMileage: 14850,
          nextServiceMileage: 15000,
          maintenanceLogs: []
        },
        {
          id: '2',
          vehicleName: 'MH 14 XY 9876',
          driverName: 'Suresh Kumar',
          driverPhone: '+91 8765432109',
          capacityKg: '2500',
          status: 'Available',
          route: '',
          currentMileage: 8500,
          nextServiceMileage: 10000,
          maintenanceLogs: []
        },
        {
          id: '3',
          vehicleName: 'KA 01 CD 5678',
          driverName: 'Abdul Rehman',
          driverPhone: '+91 7654321098',
          capacityKg: '7500',
          status: 'Maintenance',
          route: '',
          currentMileage: 25050,
          nextServiceMileage: 25000,
          maintenanceLogs: [
            {
              id: 'log1',
              date: new Date().toISOString().split('T')[0],
              description: 'Routine Engine Oil Change and Brake Inspection',
              cost: 15000,
              mileageAtService: 25050
            }
          ]
        }
      ];"""

content = re.sub(
    r'      const saved = localStorage\.getItem\(\'fg_hq_transports\'\);\n      return saved \? JSON\.parse\(saved\) : \[\];',
    mock_data,
    content
)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

