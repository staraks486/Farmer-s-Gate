with open('src/components/TransportModule.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if "const saveDriver = (e: React.FormEvent) => {" in line:
        new_lines.insert(-1, """  const [checklists, setChecklists] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fg_hq_checklists');
      if (saved) return JSON.parse(saved);
      return [
        { id: 'c1', vehicleId: '1', date: new Date().toISOString().split('T')[0], driverId: 'd1', tirePressure: true, brakes: true, lights: true, oilLevel: true, notes: 'All good' }
      ];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('fg_hq_checklists', JSON.stringify(checklists)); }, [checklists]);
""")

with open('src/components/TransportModule.tsx', 'w') as f:
    f.writelines(new_lines)
