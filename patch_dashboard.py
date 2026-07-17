import re

with open('src/components/TransportModule.tsx', 'r') as f:
    content = f.read()

# Enhance the layout of the Maintenance Dashboard to resemble a timeline view
new_dashboard = """function MaintenanceDashboard({ transports }: { transports: any[] }) {
  const vehiclesWithMaintenance = transports.filter(t => (t.nextServiceMileage || 0) > 0).sort((a, b) => {
    const aRemaining = (a.nextServiceMileage || 0) - (a.currentMileage || 0);
    const bRemaining = (b.nextServiceMileage || 0) - (b.currentMileage || 0);
    return aRemaining - bRemaining;
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm mt-6 mb-6">
      <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-emerald-600" />
        Maintenance Timeline
      </h3>
      <div className="relative border-l-2 border-zinc-100 ml-3 pl-6 space-y-6">
        {vehiclesWithMaintenance.length === 0 ? (
          <p className="text-xs text-zinc-500 pb-4">No vehicles with active maintenance schedules.</p>
        ) : (
          vehiclesWithMaintenance.map((t, index) => {
            const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
            const percentUsed = Math.min(100, Math.max(0, ((t.currentMileage || 0) / (t.nextServiceMileage || 1)) * 100));
            const needsService = mileageRemaining <= 500 && mileageRemaining > 0;
            const critical = mileageRemaining <= 0;

            return (
              <div key={t.id} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${critical ? 'bg-rose-500' : needsService ? 'bg-amber-400' : 'bg-emerald-500'} shadow-sm`} />
                
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-zinc-800 text-sm block">{t.vehicleName}</span>
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t.driverName}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      critical ? 'bg-rose-100 text-rose-700' : 
                      needsService ? 'bg-amber-100 text-amber-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {critical ? `Overdue (${Math.abs(mileageRemaining)}km)` : needsService ? `Due Soon (${mileageRemaining}km)` : `Healthy (${mileageRemaining}km left)`}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      <span>0 km</span>
                      <span className="text-zinc-600">{t.currentMileage || 0} / {t.nextServiceMileage} km</span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          critical ? 'bg-rose-500' : needsService ? 'bg-amber-400' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${percentUsed}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}"""

content = re.sub(
    r'function MaintenanceDashboard\(\{ transports \}: \{ transports: any\[\] \}\) \{.*?(?=export default function TransportModule\(\) \{)',
    new_dashboard + '\n\n',
    content,
    flags=re.DOTALL
)

with open('src/components/TransportModule.tsx', 'w') as f:
    f.write(content)

