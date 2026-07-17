import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""        \{
          id: 'd1',
          name: 'Ramesh Singh',
          phone: '\+91 9876543210',
          licenseNumber: 'DL-14-2020-0012345',
          licenseExpiry: '2025-10-15',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '1'
        \},
        \{
          id: 'd2',
          name: 'Suresh Kumar',
          phone: '\+91 8765432109',
          licenseNumber: 'DL-14-2018-0054321',
          licenseExpiry: '2026-05-20',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '2'
        \},
        \{
          id: 'd3',
          name: 'Abdul Rehman',
          phone: '\+91 7654321098',
          licenseNumber: 'DL-14-2019-0098765',
          licenseExpiry: '2024-12-01',
          status: 'On Leave',
          isAvailable: false,
          assignedVehicleId: '3'
        \}"""

replacement = """        {
          id: 'd1',
          name: 'Ramesh Singh',
          phone: '+91 9876543210',
          licenseNumber: 'DL-14-2020-0012345',
          licenseExpiry: '2025-10-15',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '1',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 8,
          bloodGroup: 'O+',
          rating: 4.8,
          incidents: 0
        },
        {
          id: 'd2',
          name: 'Suresh Kumar',
          phone: '+91 8765432109',
          licenseNumber: 'DL-14-2018-0054321',
          licenseExpiry: '2026-05-20',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '2',
          photoUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 5,
          bloodGroup: 'B+',
          rating: 4.5,
          incidents: 1
        },
        {
          id: 'd3',
          name: 'Abdul Rehman',
          phone: '+91 7654321098',
          licenseNumber: 'DL-14-2019-0098765',
          licenseExpiry: '2024-12-01',
          status: 'On Leave',
          isAvailable: false,
          assignedVehicleId: '3',
          photoUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 12,
          bloodGroup: 'A-',
          rating: 4.9,
          incidents: 0
        }"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

