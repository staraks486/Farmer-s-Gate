import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

notif_code = """function MaintenanceDashboard({ transports }: { transports: any[] }) {
  useEffect(() => {
    transports.forEach((t) => {
      if ((t.nextServiceMileage || 0) > 0) {
        const percentUsed = (t.currentMileage || 0) / t.nextServiceMileage;
        if (percentUsed >= 0.9) {
          const notifKey = `service_alert_${t.id}_${t.nextServiceMileage}`;
          if (!localStorage.getItem(notifKey)) {
            const message = `Maintenance Alert: ${t.vehicleName} has reached ${Math.round(percentUsed * 100)}% of its service mileage limit.`;
            
            if ("Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification("Vehicle Service Due", { body: message });
                localStorage.setItem(notifKey, 'true');
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                  if (permission === "granted") {
                    new Notification("Vehicle Service Due", { body: message });
                    localStorage.setItem(notifKey, 'true');
                  }
                });
              }
            }
            
            // Fallback or explicit alert as requested
            try {
              window.alert(message);
              localStorage.setItem(notifKey, 'true');
            } catch (e) {
              console.warn("Alert blocked", e);
            }
          }
        }
      }
    });
  }, [transports]);

  const vehiclesWithMaintenance ="""

content = content.replace("function MaintenanceDashboard({ transports }: { transports: any[] }) {\n  const vehiclesWithMaintenance =", notif_code)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

