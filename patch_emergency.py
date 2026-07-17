import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# 1. Add emergencyContact prop to MaintenanceDashboard
target_dashboard = r"function MaintenanceDashboard\(\{ transports \}: \{ transports: any\[\] \}\) \{"
replacement_dashboard = "function MaintenanceDashboard({ transports, emergencyContact }: { transports: any[], emergencyContact: string }) {"
content = re.sub(target_dashboard, replacement_dashboard, content)

# 2. Update MaintenanceDashboard call
target_call = r"<MaintenanceDashboard transports=\{transports\} />"
replacement_call = "<MaintenanceDashboard transports={transports} emergencyContact={emergencyContact} />"
content = re.sub(target_call, replacement_call, content)

# 3. Add state to TransportModule
target_state = r"const \[activeTab, setActiveTab\] = useState<'vehicles' | 'drivers'>\('vehicles'\);"
replacement_state = """const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [emergencyContact, setEmergencyContact] = useState(() => localStorage.getItem('fg_hq_emergency_contact') || '+919876543210');

  useEffect(() => {
    localStorage.setItem('fg_hq_emergency_contact', emergencyContact);
  }, [emergencyContact]);"""
content = re.sub(target_state, replacement_state, content)

# 4. Use emergencyContact in WhatsApp button
target_phone = r'const adminPhone = "\+1234567890"; // In a real app, this would be configured'
replacement_phone = 'const adminPhone = emergencyContact || "+919876543210";'
content = re.sub(target_phone, replacement_phone, content)

# 5. Add emergency contact input to UI
target_ui = r"""        <div className="flex gap-2">
          <div className="flex bg-amber-100 rounded-xl p-1">"""
replacement_ui = """        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-amber-100/50 px-3 py-1.5 rounded-lg border border-amber-200/50 items-center gap-2" title="Emergency Fleet Contact">
            <Phone className="w-3.5 h-3.5 text-amber-700" />
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-900 w-28 focus:outline-none placeholder-amber-700/50"
              placeholder="Emergency No."
            />
          </div>
          <div className="flex bg-amber-100 rounded-xl p-1">"""
content = re.sub(target_ui, replacement_ui, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

