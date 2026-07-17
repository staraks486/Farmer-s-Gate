import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""          <h3 className="font-bold text-rose-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            Critical Service Alerts
          </h3>"""

replacement = """          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Critical Service Alerts
            </h3>
            <button
              onClick={() => {
                const adminPhone = "+1234567890"; // In a real app, this would be configured
                const reportText = `*CRITICAL FLEET ALERT* 🚨\\n\\nThe following vehicles require immediate service:\\n` + 
                  criticalVehicles.map(t => {
                    const remaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
                    return `- *${t.vehicleName}*: ${remaining <= 0 ? `OVERDUE by ${Math.abs(remaining)}km` : `Service due in ${remaining}km`} (Driver: ${t.driverName})`;
                  }).join('\\n');
                
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(reportText)}`, '_blank');
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              Notify Admin via WhatsApp
            </button>
          </div>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

