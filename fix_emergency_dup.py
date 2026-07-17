with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

import re
bad_pattern = r"  const \[activeTab, setActiveTab\] = useState<'vehicles' \| 'drivers'>\('vehicles'\);\n  const \[emergencyContact, setEmergencyContact\] = useState\(\(\) => localStorage\.getItem\('fg_hq_emergency_contact'\) \|\| '\+919876543210'\);\n\n  useEffect\(\(\) => \{\n    localStorage\.setItem\('fg_hq_emergency_contact', emergencyContact\);\n  \}, \[emergencyContact\]\);\|const \[activeTab, setActiveTab\] = useState<'vehicles' \| 'drivers'>\('vehicles'\);\n  const \[emergencyContact, setEmergencyContact\] = useState\(\(\) => localStorage\.getItem\('fg_hq_emergency_contact'\) \|\| '\+919876543210'\);\n\n  useEffect\(\(\) => \{\n    localStorage\.setItem\('fg_hq_emergency_contact', emergencyContact\);\n  \}, \[emergencyContact\]\);"

good_string = """  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [emergencyContact, setEmergencyContact] = useState(() => localStorage.getItem('fg_hq_emergency_contact') || '+919876543210');

  useEffect(() => {
    localStorage.setItem('fg_hq_emergency_contact', emergencyContact);
  }, [emergencyContact]);"""

content = re.sub(bad_pattern, good_string, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
