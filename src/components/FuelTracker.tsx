import React, { useState } from 'react';
import { FuelLog } from '../types';
import { Droplet, Plus, Calendar, DollarSign, Gauge, TrendingUp, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FuelTrackerProps {
  vehicleId: string;
  fuelLogs: FuelLog[];
  transports: any[];
  onAddLog: (log: Omit<FuelLog, 'id'>) => void;
}

export function FuelTracker({ vehicleId, fuelLogs, transports, onAddLog }: FuelTrackerProps) {
  const [fuelIntake, setFuelIntake] = useState('');
  const [cost, setCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const currentVehicle = transports.find(t => t.id === vehicleId);
  const category = currentVehicle?.capacityKg;

  const vehicleLogs = fuelLogs
    .filter(log => log.vehicleId === vehicleId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate efficiency (cost per km)
  const getEfficiency = (logs: FuelLog[]) => {
    const sorted = [...logs].sort((a, b) => a.odometer - b.odometer);
    if (sorted.length < 2) return null;
    let totalCost = 0;
    let totalDistance = 0;
    for (let i = 1; i < sorted.length; i++) {
        totalCost += sorted[i].cost;
        totalDistance += (sorted[i].odometer - sorted[i-1].odometer);
    }
    return totalDistance > 0 ? (totalCost / totalDistance) : null;
  };

  const vehicleEfficiency = getEfficiency(vehicleLogs);
  
  // Calculate average for category
  const categoryVehicles = transports.filter(t => t.capacityKg === category);
  const efficiencies = categoryVehicles.map(v => getEfficiency(fuelLogs.filter(l => l.vehicleId === v.id))).filter(e => e !== null) as number[];
  const avgCategoryEfficiency = efficiencies.length > 0 ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length : null;

  const isAlert = vehicleEfficiency && avgCategoryEfficiency && vehicleEfficiency > avgCategoryEfficiency * 1.15;

  // Calculate efficiency (for chart)
  const chartData = vehicleLogs.length >= 2 ? [...vehicleLogs].reverse().map((log, index, arr) => {
    if (index === 0) return null;
    const prevLog = arr[index - 1];
    const distance = log.odometer - prevLog.odometer;
    const efficiency = distance > 0 ? (distance / log.fuelIntake).toFixed(2) : 0;
    return { date: log.date, efficiency: Number(efficiency) };
  }).filter(Boolean) : [];

  // Calculate monthly trends
  const monthlyDataMap: Record<string, { intake: number, cost: number }> = {};
  vehicleLogs.forEach(log => {
    const month = log.date.substring(0, 7);
    if (!monthlyDataMap[month]) monthlyDataMap[month] = { intake: 0, cost: 0 };
    monthlyDataMap[month].intake += log.fuelIntake;
    monthlyDataMap[month].cost += log.cost;
  });
  const monthlyData = Object.entries(monthlyDataMap)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLog({
      vehicleId,
      fuelIntake: parseFloat(fuelIntake),
      cost: parseFloat(cost),
      date,
      odometer: parseFloat(odometer),
    });
    setFuelIntake('');
    setCost('');
    setOdometer('');
  };

  return (
    <div className="space-y-6">
      {isAlert && (
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-rose-800 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">Alert: Vehicle efficiency is 15% worse than category average.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {chartData.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <h4 className="font-bold text-zinc-800 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-600" /> Efficiency Trends</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="efficiency" stroke="#9333ea" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {monthlyData.length > 0 && (
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <h4 className="font-bold text-zinc-800 mb-4 flex items-center gap-2"><Calendar className="h-5 w-5 text-emerald-600" /> Monthly Trends</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="intake" name="Fuel (L)" fill="#10b981" />
                  <Bar dataKey="cost" name="Cost (₹)" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
        <h4 className="font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-600" /> Log Refueling
        </h4>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Fuel Intake (L)</label>
            <input required type="number" step="0.1" value={fuelIntake} onChange={e => setFuelIntake(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Cost</label>
            <input required type="number" value={cost} onChange={e => setCost(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Odometer</label>
            <input required type="number" value={odometer} onChange={e => setOdometer(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Date</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm" />
          </div>
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors cursor-pointer">
            Log Fuel
          </button>
        </form>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200">
        <h4 className="font-bold text-zinc-800 mb-4">Refueling History</h4>
        
        {/* Mobile: Card-based list */}
        <div className="md:hidden space-y-2">
          {vehicleLogs.map(log => (
            <div key={log.id} className="flex items-center justify-between p-3 border border-zinc-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-100 rounded-full text-zinc-600">
                  <Droplet className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{log.fuelIntake} L</p>
                  <p className="text-xs text-zinc-500">{log.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900">₹{log.cost}</p>
                <p className="text-xs text-zinc-500 flex items-center gap-1"><Gauge className="h-3 w-3" />{log.odometer} km</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table-based view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Volume (L)</th>
                <th className="px-4 py-3">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {vehicleLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{log.date}</td>
                  <td className="px-4 py-3 text-zinc-600">{log.odometer} km</td>
                  <td className="px-4 py-3 text-zinc-600">{log.fuelIntake} L</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">₹{log.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
