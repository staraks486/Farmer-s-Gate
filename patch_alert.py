import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

target = r"""  return \(
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm mt-6 mb-6">
      <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-emerald-600" />
        Maintenance Timeline
      </h3>"""

replacement = """  const criticalVehicles = vehiclesWithMaintenance.filter(t => {
    const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
    return mileageRemaining <= 500;
  });

  return (
    <div className="space-y-6 mt-6 mb-6">
      {criticalVehicles.length > 0 && (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 shadow-sm">
          <h3 className="font-bold text-rose-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            Critical Service Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalVehicles.map(t => {
              const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
              const isOverdue = mileageRemaining <= 0;
              return (
                <div key={`alert-${t.id}`} className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isOverdue ? 'bg-rose-100' : 'bg-amber-100'}`}>
                    <Wrench className={`h-4 w-4 ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-800 text-sm">{t.vehicleName}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{t.driverName}</p>
                    <p className={`text-[11px] font-bold mt-2 uppercase tracking-wider ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                      {isOverdue ? `Overdue by ${Math.abs(mileageRemaining)}km` : `Service in ${mileageRemaining}km`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-emerald-600" />
          Maintenance Timeline
        </h3>"""

content = re.sub(target, replacement, content)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

