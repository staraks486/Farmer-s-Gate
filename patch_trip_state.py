import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""  const \[tripForm, setTripForm\] = useState\(\{
    id: '',
    date: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\],
    origin: '',
    destination: '',
    cargoDetails: '',
    distanceKm: 0
  \}\);"""

replacement = """  const [tripForm, setTripForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    destination: '',
    cargoDetails: '',
    distanceKm: 0,
    driverId: ''
  });"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

