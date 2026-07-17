import re
with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"  // Maintenance Sub-view state"
replacement = """  const [checklistFormOpen, setChecklistFormOpen] = useState(false);
  const [checklistForm, setChecklistForm] = useState({
    id: '', vehicleId: '', driverId: '', date: new Date().toISOString().split('T')[0],
    tirePressure: false, brakes: false, lights: false, oilLevel: false, notes: ''
  });

  const saveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (checklistForm.id) {
      setChecklists(checklists.map((c: any) => c.id === checklistForm.id ? { ...c, ...checklistForm } : c));
    } else {
      setChecklists([{ ...checklistForm, id: Date.now().toString() }, ...checklists]);
    }
    setChecklistFormOpen(false);
    setChecklistForm({ id: '', vehicleId: '', driverId: '', date: new Date().toISOString().split('T')[0], tirePressure: false, brakes: false, lights: false, oilLevel: false, notes: '' });
  };

  // Maintenance Sub-view state"""

content = re.sub(target, replacement, content)
with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)
