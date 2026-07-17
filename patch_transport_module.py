import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

maintenance_dash_code = """function MaintenanceDashboard({ transports }: { transports: any[] }) {
  const vehiclesWithMaintenance = transports.filter(t => (t.nextServiceMileage || 0) > 0).sort((a, b) => {
    const aRemaining = (a.nextServiceMileage || 0) - (a.currentMileage || 0);
    const bRemaining = (b.nextServiceMileage || 0) - (b.currentMileage || 0);
    return aRemaining - bRemaining;
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm mt-6 mb-6">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-emerald-600" />
        Maintenance Dashboard (Fleet Overview)
      </h3>
      <div className="space-y-4">
        {vehiclesWithMaintenance.length === 0 ? (
          <p className="text-xs text-zinc-500">No vehicles with active maintenance schedules.</p>
        ) : (
          vehiclesWithMaintenance.map(t => {
            const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
            const percentUsed = Math.min(100, Math.max(0, ((t.currentMileage || 0) / (t.nextServiceMileage || 1)) * 100));
            const needsService = mileageRemaining <= 500 && mileageRemaining > 0;
            const critical = mileageRemaining <= 0;

            return (
              <div key={t.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-zinc-800">{t.vehicleName} <span className="text-zinc-400 font-normal ml-1">({t.driverName})</span></span>
                  <span className={`font-semibold ${critical ? 'text-rose-600' : needsService ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {critical ? `Service Overdue (${Math.abs(mileageRemaining)}km)` : needsService ? `Due Soon (${mileageRemaining}km)` : `${mileageRemaining}km remaining`}
                  </span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${critical ? 'bg-rose-500' : needsService ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                    style={{ width: `${percentUsed}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>0 km</span>
                  <span>{t.currentMileage || 0} / {t.nextServiceMileage} km</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TransportModule() {"""

content = content.replace("export default function TransportModule() {", maintenance_dash_code)

# Insert the dashboard into the main render view (just above the vehicles grid)
grid_regex = r"(      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">)"
replacement = """      <MaintenanceDashboard transports={transports} />\n\n\\1"""
content = re.sub(grid_regex, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

