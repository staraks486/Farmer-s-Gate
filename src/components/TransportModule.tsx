import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

import { Edit, Trash2, Users, User, ToggleLeft, ToggleRight, Wrench, AlertTriangle, CheckCircle2, Clock, MapPin, Navigation, Package, Droplet, TrendingUp, Phone, MessageSquare, QrCode, Download } from 'lucide-react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { QrScanner } from './QrScanner';
import { FuelTracker } from './FuelTracker';
import { FuelLog } from '../types';

function MonitoringCharts({ transports }: { transports: any[] }) {
  const statusData = [
    { name: 'Active', value: transports.filter(t => t.status === 'En Route').length },
    { name: 'Available', value: transports.filter(t => t.status === 'Available').length },
    { name: 'Maintenance', value: transports.filter(t => t.status === 'Maintenance').length },
  ];

  const fuelData = transports.map(t => ({
    name: t.vehicleName,
    mileage: t.currentMileage || 0,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f43f5e'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h4 className="font-bold text-zinc-900 mb-4">Fleet Status</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <h4 className="font-bold text-zinc-900 mb-4">Vehicle Mileage</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fuelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Bar dataKey="mileage" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MaintenanceDashboard({ transports, emergencyContact }: { transports: any[], emergencyContact: string }) {
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

  const vehiclesWithMaintenance = transports.filter(t => (t.nextServiceMileage || 0) > 0).sort((a, b) => {
    const aRemaining = (a.nextServiceMileage || 0) - (a.currentMileage || 0);
    const bRemaining = (b.nextServiceMileage || 0) - (b.currentMileage || 0);
    return aRemaining - bRemaining;
  });

  const criticalVehicles = vehiclesWithMaintenance.filter(t => {
    const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
    return mileageRemaining <= 500;
  });

  return (
    <div className="space-y-6 mt-6 mb-6">
      {criticalVehicles.length > 0 && (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Critical Service Alerts
            </h3>
            <button
              onClick={() => {
                const adminPhone = emergencyContact || "+919876543210";
                const reportText = `*CRITICAL FLEET ALERT* 🚨\n\nThe following vehicles require immediate service:\n` + criticalVehicles.map(t => { const remaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0); return `- *${t.vehicleName}*: ${remaining <= 0 ? `OVERDUE by ${Math.abs(remaining)}km` : `Service due in ${remaining}km`} (Driver: ${t.driverName})`; }).join('\n');
                window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(reportText)}`, '_blank');
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              Notify Admin via WhatsApp
            </button>
          </div>
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
    </div>
  );
}

export default function TransportModule({ mode = 'full' }: { mode?: 'full' | 'monitoring' }) {
  const [transports, setTransports] = useState(() => {
    try {
      const saved = localStorage.getItem('fg_hq_transports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      }
      return [
        {
          id: '1',
          vehicleName: 'MH 12 AB 1234',
          driverName: 'Ramesh Singh',
          driverPhone: '+91 9876543210',
          capacityKg: '5000',
          status: 'En Route',
          route: 'HQ to Store A',
          currentMileage: 14850,
          nextServiceMileage: 15000,
          maintenanceLogs: [],
          fastag: '',
          purchaseDate: '',
          color: '',
          model: '',
          insuranceDetails: '',
          photoUrl: ''
        },
        {
          id: '2',
          vehicleName: 'MH 14 XY 9876',
          driverName: 'Suresh Kumar',
          driverPhone: '+91 8765432109',
          capacityKg: '2500',
          status: 'Available',
          route: '',
          currentMileage: 8500,
          nextServiceMileage: 10000,
          maintenanceLogs: [],
          fastag: '',
          purchaseDate: '',
          color: '',
          model: '',
          insuranceDetails: '',
          photoUrl: ''
        },
        {
          id: '3',
          vehicleName: 'KA 01 CD 5678',
          driverName: 'Abdul Rehman',
          driverPhone: '+91 7654321098',
          capacityKg: '7500',
          status: 'Maintenance',
          route: '',
          currentMileage: 25050,
          nextServiceMileage: 25000,
          maintenanceLogs: [
            {
              id: 'log1',
              date: new Date().toISOString().split('T')[0],
              description: 'Routine Engine Oil Change and Brake Inspection',
              cost: 15000,
              mileageAtService: 25050
            }
          ],
          fastag: '',
          purchaseDate: '',
          color: '',
          model: '',
          insuranceDetails: '',
          photoUrl: ''
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fg_hq_transports', JSON.stringify(transports));
  }, [transports]);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('fg_transport_active_tab') || (mode === 'monitoring' ? 'monitoring' : 'vehicles'));
  
  useEffect(() => {
    localStorage.setItem('fg_transport_active_tab', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    console.log("Active tab changed to:", activeTab);
  }, [activeTab]);
  const [emergencyContact, setEmergencyContact] = useState(() => localStorage.getItem('fg_hq_emergency_contact') || '+919876543210');
  
  const assignDriverToVehicle = (driverId: string, vehicleId: string) => {
    // 1. Update driver's assignedVehicleId
    setDrivers(drivers.map((d: any) => 
      d.id === driverId ? { ...d, assignedVehicleId: vehicleId } : 
      d.assignedVehicleId === vehicleId ? { ...d, assignedVehicleId: '' } : d
    ));
    
    // 2. Update transports: clear previous vehicle assignment, set new assignment
    setTransports(transports.map((t: any) => {
      if (t.id === vehicleId) {
        const driver = drivers.find((d: any) => d.id === driverId);
        return { ...t, driverName: driver?.name || 'Unknown', driverPhone: driver?.phone || '' };
      }
      if (t.driverName === drivers.find((d: any) => d.id === driverId)?.name) {
        return { ...t, driverName: 'Unassigned', driverPhone: '' };
      }
      return t;
    }));
  };

  useEffect(() => {
    localStorage.setItem('fg_hq_emergency_contact', emergencyContact);
  }, [emergencyContact]);
  const [drivers, setDrivers] = useState(() => {
    try {
      const saved = localStorage.getItem('fg_hq_drivers');
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'd1',
          name: 'Ramesh Singh',
          phone: '+91 9876543210',
          licenseNumber: 'DL-14-2020-0012345',
          licenseExpiry: '2025-10-15',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '1',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 8,
          bloodGroup: 'O+',
          rating: 4.8,
          incidents: 0,
          emergencyContact: '',
          canJoinChat: true
        },
        {
          id: 'd2',
          name: 'Suresh Kumar',
          phone: '+91 8765432109',
          licenseNumber: 'DL-14-2018-0054321',
          licenseExpiry: '2026-05-20',
          status: 'Active',
          isAvailable: true,
          assignedVehicleId: '2',
          photoUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 5,
          bloodGroup: 'B+',
          rating: 4.5,
          incidents: 1,
          emergencyContact: '',
          canJoinChat: true
        },
        {
          id: 'd3',
          name: 'Abdul Rehman',
          phone: '+91 7654321098',
          licenseNumber: 'DL-14-2019-0098765',
          licenseExpiry: '2024-12-01',
          status: 'On Leave',
          isAvailable: false,
          assignedVehicleId: '3',
          photoUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?fit=facearea&facepad=2&w=256&h=256&q=80',
          experienceYears: 12,
          bloodGroup: 'A-',
          rating: 4.9,
          incidents: 0,
          emergencyContact: '',
          canJoinChat: true
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fg_hq_drivers', JSON.stringify(drivers));
  }, [drivers]);

  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({
    id: '',
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'Active' as 'Active' | 'On Leave' | 'Inactive',
    attendance: 'Present' as 'Present' | 'Absent' | 'Late',
    isAvailable: true,
    assignedVehicleId: '',
    photoUrl: '',
    experienceYears: 0,
    bloodGroup: '',
    rating: 5.0,
    incidents: 0,
    emergencyContact: '',
    canJoinChat: true
  });
  const [checklists, setChecklists] = useState(() => {
    try {
      const saved = localStorage.getItem('fg_hq_checklists');
      if (saved) return JSON.parse(saved);
      return [
        { id: 'c1', vehicleId: '1', date: new Date().toISOString().split('T')[0], driverId: 'd1', tirePressure: true, brakes: true, lights: true, oilLevel: true, notes: 'All good' }
      ];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('fg_hq_checklists', JSON.stringify(checklists)); }, [checklists]);
  const saveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (driverForm.id) {
      setDrivers(drivers.map((d: any) => d.id === driverForm.id ? { ...d, ...driverForm } : d));
      if (driverForm.assignedVehicleId) {
        setTransports(transports.map((t: any) => 
          t.id === driverForm.assignedVehicleId ? { ...t, driverName: driverForm.name, driverPhone: driverForm.phone } : 
          (t.driverName === driverForm.name ? { ...t, driverName: 'Unassigned', driverPhone: '' } : t)
        ));
      }
    } else {
      setDrivers([...drivers, { ...driverForm, id: Date.now().toString() }]);
      if (driverForm.assignedVehicleId) {
        setTransports(transports.map((t: any) => t.id === driverForm.assignedVehicleId ? { ...t, driverName: driverForm.name, driverPhone: driverForm.phone } : t));
      }
    }
    setDriverFormOpen(false);
    setDriverForm({ 
      id: '', name: '', phone: '', licenseNumber: '', licenseExpiry: '', status: 'Active', isAvailable: true, assignedVehicleId: '', photoUrl: '', experienceYears: 0, bloodGroup: '', rating: 5.0, incidents: 0,
      emergencyContact: '', canJoinChat: true
    });
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'License', 'Status', 'Attendance', 'Experience (Years)', 'Rating'];
    const rows = drivers.map((d: any) => [
      d.name,
      d.phone,
      d.licenseNumber,
      d.status,
      d.attendance,
      d.experienceYears,
      d.rating
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [transportFormOpen, setTransportFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedVehicleId, setScannedVehicleId] = useState<string | null>(null);
  const [transportForm, setTransportForm] = useState({
    id: '',
    vehicleName: '',
    driverName: '',
    driverPhone: '',
    capacityKg: '',
    status: 'Available' as 'Available' | 'En Route' | 'Maintenance',
    route: '',
    currentMileage: 0,
    nextServiceMileage: 0,
    fastag: '',
    purchaseDate: '',
    color: '',
    model: '',
    insuranceDetails: '',
    photoUrl: ''
  });

  const [checklistFormOpen, setChecklistFormOpen] = useState(false);
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

  // Maintenance Sub-view state
  const [selectedVehicleForMaintenance, setSelectedVehicleForMaintenance] = useState(null);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('history');
  const [maintenanceForm, setMaintenanceForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: 0,
    mileageAtService: 0,
    receiptUrl: ''
  });

  // Trip Log Sub-view state
  const [selectedVehicleForTrips, setSelectedVehicleForTrips] = useState(null);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripForm, setTripForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    origin: '',
    destination: '',
    cargoDetails: '',
    distanceKm: 0,
    driverId: ''
  });
  // Fuel Log Sub-view state
  const [selectedVehicleForFuel, setSelectedVehicleForFuel] = useState(null);
  const [fuelFormOpen, setFuelFormOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    fuelVolumeLiters: 0,
    cost: 0,
    mileageAtFillup: 0
  });

  const saveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (transportForm.id) {
      setTransports(transports.map((t: any) => t.id === transportForm.id ? { ...t, ...transportForm } : t));
    } else {
      setTransports([...transports, { 
        ...transportForm, 
        id: Date.now().toString(),
        maintenanceLogs: []
      }]);
    }
    setTransportFormOpen(false);
    resetTransportForm();
  };

  const resetTransportForm = () => {
    setTransportForm({ 
      id: '', vehicleName: '', driverName: '', driverPhone: '', 
      capacityKg: '', status: 'Available', route: '', 
      currentMileage: 0, nextServiceMileage: 0,
      fastag: '', purchaseDate: '', color: '', model: '', insuranceDetails: '', photoUrl: ''
    });
  };

  const saveMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForMaintenance) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForMaintenance.id) {
        const logs = t.maintenanceLogs || [];
        const newLog = { ...maintenanceForm, id: Date.now().toString() };
        return { ...t, maintenanceLogs: [newLog, ...logs], currentMileage: Math.max(t.currentMileage, maintenanceForm.mileageAtService) };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForMaintenance(updatedTransports.find((t: any) => t.id === selectedVehicleForMaintenance.id));
    setMaintenanceFormOpen(false);
    setMaintenanceForm({ id: '', date: new Date().toISOString().split('T')[0], description: '', cost: 0, mileageAtService: 0, receiptUrl: '' });
  };
  const saveTripLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForTrips) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForTrips.id) {
        const logs = t.tripLogs || [];
        const newLog = { ...tripForm, id: Date.now().toString() };
        return { 
          ...t, 
          tripLogs: [newLog, ...logs], 
          currentMileage: (t.currentMileage || 0) + tripForm.distanceKm 
        };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForTrips(updatedTransports.find((t: any) => t.id === selectedVehicleForTrips.id));
    setTripFormOpen(false);
    setTripForm({ id: '', date: new Date().toISOString().split('T')[0], origin: '', destination: '', cargoDetails: '', distanceKm: 0, driverId: '' });
  };
  const saveFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForFuel) return;
    
    const updatedTransports = transports.map((t: any) => {
      if (t.id === selectedVehicleForFuel.id) {
        const logs = t.fuelLogs || [];
        const newLog = { ...fuelForm, id: Date.now().toString() };
        return { 
          ...t, 
          fuelLogs: [newLog, ...logs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
          currentMileage: Math.max((t.currentMileage || 0), fuelForm.mileageAtFillup) 
        };
      }
      return t;
    });
    
    setTransports(updatedTransports);
    setSelectedVehicleForFuel(updatedTransports.find((t: any) => t.id === selectedVehicleForFuel.id));
    setFuelFormOpen(false);
    setFuelForm({ id: '', date: new Date().toISOString().split('T')[0], fuelVolumeLiters: 0, cost: 0, mileageAtFillup: 0 });
  };

  if (selectedVehicleForMaintenance) {
    const logs = selectedVehicleForMaintenance.maintenanceLogs || [];
    const mileageRemaining = (selectedVehicleForMaintenance.nextServiceMileage || 0) - (selectedVehicleForMaintenance.currentMileage || 0);
    const needsService = mileageRemaining <= 500 && (selectedVehicleForMaintenance.nextServiceMileage > 0);

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForMaintenance(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" /> 
              Maintenance: {selectedVehicleForMaintenance.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForMaintenance.currentMileage || 0} km</span></p>
               <p className="text-xs text-zinc-600 font-medium">Next Service Due: <span className="font-bold">{selectedVehicleForMaintenance.nextServiceMileage || 0} km</span></p>
            </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveMaintenanceTab('history')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeMaintenanceTab === 'history' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>History</button>
            <button onClick={() => setActiveMaintenanceTab('log')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeMaintenanceTab === 'log' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Log New</button>
          </div>
          
          {activeMaintenanceTab === 'log' && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in mb-6">
              <h4 className="text-sm font-bold text-zinc-800 mb-4">Log Maintenance Record</h4>
              <form onSubmit={saveMaintenanceLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                  <input required type="date" value={maintenanceForm.date || ''} onChange={e => setMaintenanceForm({...maintenanceForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Mileage at Service</label>
                  <input required type="number" value={maintenanceForm.mileageAtService || 0} onChange={e => setMaintenanceForm({...maintenanceForm, mileageAtService: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 15000" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Cost (₹)</label>
                  <input required type="number" value={maintenanceForm.cost || 0} onChange={e => setMaintenanceForm({...maintenanceForm, cost: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 5000" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Receipt URL (Digital Receipt)</label>
                  <input type="url" value={maintenanceForm.receiptUrl || ''} onChange={e => setMaintenanceForm({...maintenanceForm, receiptUrl: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="https://..." />
                </div>
                <div className="lg:col-span-5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Description of Work</label>
                  <input required type="text" value={maintenanceForm.description || ''} onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Oil change, brake pad replacement" />
                </div>
                <div className="lg:col-span-5 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setActiveMaintenanceTab('history')} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">Save Log</button>
                </div>
              </form>
            </div>
          )}

          {activeMaintenanceTab === 'history' && (
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              {/* Mobile View: Card-based list */}
              <div className="block md:hidden space-y-4 p-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>No maintenance logs recorded yet.</p>
                  </div>
                ) : (
                  logs.map((log: any) => (
                    <div key={log.id} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 shadow-sm relative space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-zinc-500">{log.date}</span>
                          <h5 className="font-bold text-zinc-900 mt-0.5">{log.description}</h5>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">₹{log.cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100">
                        <div>
                          <span className="font-semibold text-zinc-700">Mileage:</span> {log.mileageAtService} km
                        </div>
                        {log.receiptUrl && (
                          <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline">
                            View Receipt
                          </a>
                        )}
                      </div>
                      {mode !== 'monitoring' && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this maintenance record?')) {
                                const updatedTransports = transports.map((t: any) => {
                                  if (t.id === selectedVehicleForMaintenance.id) {
                                    return { ...t, maintenanceLogs: t.maintenanceLogs.filter((l: any) => l.id !== log.id) };
                                  }
                                  return t;
                                });
                                setTransports(updatedTransports);
                                setSelectedVehicleForMaintenance(updatedTransports.find((t: any) => t.id === selectedVehicleForMaintenance.id));
                              }
                            }}
                            className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Mileage</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Receipt</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          <p>No maintenance logs recorded yet.</p>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                          <td className="px-4 py-3 text-zinc-600">{log.description}</td>
                          <td className="px-4 py-3 text-zinc-600">{log.mileageAtService} km</td>
                          <td className="px-4 py-3 font-semibold text-zinc-800">₹{log.cost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-zinc-600">
                            {log.receiptUrl ? <a href={log.receiptUrl} target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline">View</a> : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {mode !== 'monitoring' && (
                              <button 
                                onClick={() => {
                                  if(window.confirm('Delete this maintenance record?')) {
                                    const updatedTransports = transports.map((t: any) => {
                                      if (t.id === selectedVehicleForMaintenance.id) {
                                        return { ...t, maintenanceLogs: t.maintenanceLogs.filter((l: any) => l.id !== log.id) };
                                      }
                                      return t;
                                    });
                                    setTransports(updatedTransports);
                                    setSelectedVehicleForMaintenance(updatedTransports.find((t: any) => t.id === selectedVehicleForMaintenance.id));
                                  }
                                }}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

  if (selectedVehicleForFuel) {
    const logs = selectedVehicleForFuel.fuelLogs || [];
    
    // Calculate fuel efficiency (km/l)
    const chartData = logs.length >= 2 ? [...logs].reverse().map((log: any, index: number, arr: any[]) => {
      if (index === 0) return null;
      const prevLog = arr[index - 1];
      const distance = log.mileageAtFillup - prevLog.mileageAtFillup;
      const efficiency = distance > 0 ? (distance / log.fuelVolumeLiters).toFixed(2) : 0;
      return {
        date: log.date,
        efficiency: Number(efficiency)
      };
    }).filter(Boolean) : [];

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForFuel(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Droplet className="h-4 w-4 text-purple-600" /> 
              Fuel & Efficiency: {selectedVehicleForFuel.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Total Fill-ups: <span className="font-bold">{logs.length}</span></p>
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForFuel.currentMileage || 0} km</span></p>
            </div>
          </div>
          {mode !== 'monitoring' && (
            <button
              onClick={() => setFuelFormOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
            >
              + Log Fuel
            </button>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
            <h4 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-zinc-500"/> Efficiency Trend (km/l)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} km/l`, 'Efficiency']}
                  />
                  <Line type="monotone" dataKey="efficiency" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        {fuelFormOpen && selectedVehicleForFuel && (
          <FuelTracker
            vehicleId={selectedVehicleForFuel.id}
            fuelLogs={selectedVehicleForFuel.fuelLogs || []}
            transports={transports}
            onAddLog={(log) => {
              const newLog = { ...log, id: Date.now().toString() };
              const updatedTransports = transports.map((t: any) => {
                if (t.id === selectedVehicleForFuel.id) {
                  return { ...t, fuelLogs: [newLog, ...(t.fuelLogs || [])] };
                }
                return t;
              });
              setTransports(updatedTransports);
              setSelectedVehicleForFuel(updatedTransports.find((t: any) => t.id === selectedVehicleForFuel.id));
              setFuelFormOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  if (selectedVehicleForTrips) {
    const logs = selectedVehicleForTrips.tripLogs || [];

    return (
      <div className="space-y-6 animate-fade-in text-left">
        <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <div>
            <button 
              onClick={() => setSelectedVehicleForTrips(null)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider mb-2 flex items-center gap-1 cursor-pointer"
            >
              ← Back to Fleet
            </button>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600" /> 
              Trip Log: {selectedVehicleForTrips.vehicleName}
            </h3>
            <div className="flex gap-4 mt-2">
               <p className="text-xs text-zinc-600 font-medium">Total Trips: <span className="font-bold">{logs.length}</span></p>
               <p className="text-xs text-zinc-600 font-medium">Current Mileage: <span className="font-bold">{selectedVehicleForTrips.currentMileage || 0} km</span></p>
            </div>
          </div>
          {mode !== 'monitoring' && (
            <button
              onClick={() => setTripFormOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              + Log Trip
            </button>
          )}
        </div>

        {tripFormOpen && (
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
            <h4 className="text-sm font-bold text-zinc-800 mb-4">Record New Trip</h4>
            <form onSubmit={saveTripLog} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                <input required type="date" value={tripForm.date || ''} onChange={e => setTripForm({...tripForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Distance (km)</label>
                <input required type="number" value={tripForm.distanceKm || 0} onChange={e => setTripForm({...tripForm, distanceKm: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 150" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Origin</label>
                <input required type="text" value={tripForm.origin || ''} onChange={e => setTripForm({...tripForm, origin: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. HQ Warehouse" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Destination</label>
                <input required type="text" value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Store B" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Pilot</label>
                <select required value={tripForm.driverId || ''} onChange={e => setTripForm({...tripForm, driverId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                  <option value="">Select Pilot</option>
                  {drivers.filter((d: any) => d.status === 'Active' && d.isAvailable).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Cargo Details</label>
                <input required type="text" value={tripForm.cargoDetails || ''} onChange={e => setTripForm({...tripForm, cargoDetails: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 500L Milk, 200kg Paneer" />
              </div>
              <div className="lg:col-span-5 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setTripFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">Save Trip</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          {/* Mobile View: Card-based list */}
          <div className="block md:hidden space-y-4 p-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <Navigation className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No trip logs recorded yet.</p>
              </div>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 shadow-sm relative space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-zinc-500">{log.date}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-800">
                        <span className="font-extrabold text-amber-950">{log.origin}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="font-extrabold text-amber-950">{log.destination}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-blue-600">{log.distanceKm} km</span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-zinc-700">Driver:</span>
                      <span>{drivers.find((d: any) => d.id === log.driverId)?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-zinc-700">Cargo:</span>
                      <span>{log.cargoDetails}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this trip record?')) {
                          const updatedTransports = transports.map((t: any) => {
                            if (t.id === selectedVehicleForTrips.id) {
                              return { ...t, tripLogs: t.tripLogs.filter((l: any) => l.id !== log.id) };
                            }
                            return t;
                          });
                          setTransports(updatedTransports);
                          setSelectedVehicleForTrips(updatedTransports.find((t: any) => t.id === selectedVehicleForTrips.id));
                        }
                      }}
                      className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                      <Navigation className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No trip logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-medium text-zinc-700">{log.date}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-zinc-400" />
                          <span className="font-medium text-xs">{drivers.find((d: any) => d.id === log.driverId)?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{log.origin}</span>
                          <span className="text-zinc-400 text-[10px]">→</span>
                          <span className="font-semibold">{log.destination}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 flex items-center gap-1"><Package className="h-3 w-3 text-zinc-400" /> {log.cargoDetails}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-800">{log.distanceKm} km</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => {
                            if(window.confirm('Delete this trip record?')) {
                              const updatedTransports = transports.map((t: any) => {
                                if (t.id === selectedVehicleForTrips.id) {
                                  return { ...t, tripLogs: t.tripLogs.filter((l: any) => l.id !== log.id) };
                                }
                                return t;
                              });
                              setTransports(updatedTransports);
                              setSelectedVehicleForTrips(updatedTransports.find((t: any) => t.id === selectedVehicleForTrips.id));
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/60 gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-sm">
            <Navigation className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-950 tracking-tight">Transport Fleet Command</h3>
            <p className="text-xs text-amber-700/80 mt-1 font-medium">Manage vehicles, assign drivers, and monitor logistics.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-4 w-full xl:w-auto">
          <div className="flex bg-amber-100/50 px-3 py-1.5 rounded-lg border border-amber-200/50 items-center gap-2 w-full sm:w-auto" title="Emergency Fleet Contact">
            <Phone className="w-3.5 h-3.5 text-amber-700" />
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-900 w-full sm:w-28 focus:outline-none placeholder-amber-700/50"
              placeholder="Emergency No."
            />
          </div>
          <div className="flex flex-wrap bg-amber-100 rounded-xl p-1 w-full sm:w-auto justify-center sm:justify-start">
            {mode === 'monitoring' && (
              <button 
                onClick={() => setActiveTab('monitoring')} 
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'monitoring' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
              >
                Monitoring
              </button>
            )}
            {mode !== 'monitoring' && (
              <>
                <button 
                  onClick={() => setActiveTab('vehicles')} 
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'vehicles' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
                >
                  Vehicles
                </button>
                <button 
                  onClick={() => setActiveTab('drivers')} 
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'drivers' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
                >
                  Drivers
                </button>
                <button 
                  onClick={() => setActiveTab('checklists')} 
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'checklists' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
                >
                  Checklists
                </button>
                <button 
                  onClick={() => setActiveTab('map')} 
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'map' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
                >
                  Map
                </button>
              </>
            )}
            <button 
              onClick={() => setActiveTab('assignment')} 
              className={`px-3 sm:px-5 py-2 sm:py-3 rounded-lg text-xs sm:text-[13px] font-black uppercase tracking-wider transition-colors cursor-pointer ${activeTab === 'assignment' ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}
            >
              Assignment
            </button>
          </div>
          {activeTab === 'vehicles' && (
            <button
              onClick={() => setTransportFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto text-center"
            >
              + Add Vehicle
            </button>
          )}
          {activeTab === 'drivers' && mode !== 'monitoring' && (
            <button
              onClick={() => setDriverFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto text-center"
            >
              + Add Pilot
            </button>
          )}
          {activeTab === 'checklists' && (
            <button
              onClick={() => setChecklistFormOpen(true)}
              className="px-4 py-2 bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto text-center"
            >
              + New Checklist
            </button>
          )}
        </div>
      </div>

      {activeTab === 'monitoring' && (
        <MonitoringCharts transports={transports} />
      )}

      {activeTab === 'vehicles' && (
        <>
              {transportFormOpen && (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
          <h4 className="text-sm font-bold text-zinc-800 mb-4">{transportForm.id ? 'Edit Vehicle' : 'Add New Vehicle'}</h4>
          <form
            onSubmit={saveVehicle}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Vehicle Name / Number</label>
              <input required type="text" value={transportForm.vehicleName || ''} onChange={e => setTransportForm({...transportForm, vehicleName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. MH 12 AB 1234" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Name</label>
              <input required type="text" value={transportForm.driverName || ''} onChange={e => setTransportForm({...transportForm, driverName: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Phone</label>
              <input required type="text" value={transportForm.driverPhone || ''} onChange={e => setTransportForm({...transportForm, driverPhone: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. +91 9876543210" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Capacity (KG)</label>
              <input required type="number" value={transportForm.capacityKg || ''} onChange={e => setTransportForm({...transportForm, capacityKg: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 5000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Status</label>
              <select value={transportForm.status || ''} onChange={e => setTransportForm({...transportForm, status: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                <option value="Available">Available</option>
                <option value="En Route">En Route</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Fastag ID</label>
              <input type="text" value={transportForm.fastag || ''} onChange={e => setTransportForm({...transportForm, fastag: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. NETC12345678" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Purchase Date</label>
              <input type="date" value={transportForm.purchaseDate || ''} onChange={e => setTransportForm({...transportForm, purchaseDate: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Color</label>
              <input type="text" value={transportForm.color || ''} onChange={e => setTransportForm({...transportForm, color: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. White" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Model</label>
              <input type="text" value={transportForm.model || ''} onChange={e => setTransportForm({...transportForm, model: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Tata Ace" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Insurance Details</label>
              <input type="text" value={transportForm.insuranceDetails || ''} onChange={e => setTransportForm({...transportForm, insuranceDetails: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Policy #12345" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Vehicle Photo URL</label>
              <input type="text" value={transportForm.photoUrl || ''} onChange={e => setTransportForm({...transportForm, photoUrl: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. https://example.com/photo.jpg" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Document URL</label>
              <input type="text" value={transportForm.documentUrl || ''} onChange={e => setTransportForm({...transportForm, documentUrl: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. https://example.com/doc.pdf" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Current Route</label>
              <input type="text" value={transportForm.route || ''} onChange={e => setTransportForm({...transportForm, route: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. HQ to Store A" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Current Mileage (km)</label>
              <input type="number" value={transportForm.currentMileage || ''} onChange={e => setTransportForm({...transportForm, currentMileage: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 12000" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Next Service Due (km)</label>
              <input type="number" value={transportForm.nextServiceMileage || ''} onChange={e => setTransportForm({...transportForm, nextServiceMileage: Number(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. 15000" />
            </div>
            <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => {setTransportFormOpen(false); resetTransportForm();}} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">Save Vehicle</button>
            </div>
          </form>
        </div>
      )}
      
      {isScannerOpen && (
        <QrScanner
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(scannedValue) => {
            setTransports(transports.map((t: any) => t.id === scannedVehicleId ? { ...t, route: scannedValue } : t));
            setIsScannerOpen(false);
          }}
        />
      )}

      <MaintenanceDashboard transports={transports} emergencyContact={emergencyContact} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transports.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
            <span className="text-4xl mb-2 block">🚚</span>
            <p className="font-semibold text-sm">No vehicles added yet</p>
            <p className="text-xs mt-1 text-zinc-500">Add a vehicle to manage your transport fleet.</p>
          </div>
        ) : (
          transports.map((t: any) => {
            const mileageRemaining = (t.nextServiceMileage || 0) - (t.currentMileage || 0);
            const needsService = mileageRemaining <= 500 && (t.nextServiceMileage > 0);

            return (
              <div key={t.id} className={`bg-white border ${needsService ? 'border-rose-300' : 'border-zinc-200'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group ${t.status === 'En Route' ? 'animate-pulse ring-2 ring-blue-500' : ''}`}>
                <div className="absolute top-4 right-4 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-100 shadow-sm z-10">
                  <button onClick={() => {
                    setTransportForm(t);
                    setTransportFormOpen(true);
                  }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => {
                    setIsScannerOpen(true);
                    setScannedVehicleId(t.id);
                  }} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-md transition-colors cursor-pointer" title="Scan QR">
                    <QrCode className="h-4 w-4" />
                  </button>
                  <button onClick={() => {
                    if (window.confirm('Are you sure you want to delete this vehicle?')) {
                      setTransports(transports.filter((tr: any) => tr.id !== t.id));
                    }
                  }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                      {t.vehicleName}
                      {needsService && <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />}
                      <select 
                        value={t.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setTransports(transports.map((tr: any) => tr.id === t.id ? { ...tr, status: newStatus } : tr));
                        }}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          t.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'En Route' ? 'bg-blue-100 text-blue-700' :
                          'bg-rose-100 text-rose-700'
                        } border-none focus:ring-0 cursor-pointer`}
                      >
                        <option value="Available">Available</option>
                        <option value="En Route">En Route</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </h4>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Capacity: {t.capacityKg} kg</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">👤</span>
                    <span className="font-semibold">{t.driverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">📞</span>
                    <span>{t.driverPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-5 text-center">📍</span>
                    <span className="truncate">{t.route || 'No active route'}</span>
                  </div>
                  {t.documentUrl && (
                    <div className="flex items-center gap-2 text-zinc-600">
                      <span className="w-5 text-center">📄</span>
                      <a href={t.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">View Document</a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    {needsService ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md">
                        <AlertTriangle className="h-3 w-3" /> Service Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Healthy
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedVehicleForFuel(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 cursor-pointer bg-purple-50 px-3 py-1.5 rounded-lg"
                    >
                      <Droplet className="h-3 w-3" /> Fuel
                    </button>
                    <button 
                      onClick={() => setSelectedVehicleForTrips(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      <MapPin className="h-3 w-3" /> Trip Log
                    </button>
                    <button 
                      onClick={() => setSelectedVehicleForMaintenance(t)}
                      className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg"
                    >
                      <Wrench className="h-3 w-3" /> Maint.
                    </button>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-zinc-100">
                  <button onClick={() => {
                    setTransportForm({
                      ...t,
                      currentMileage: t.currentMileage || 0,
                      nextServiceMileage: t.nextServiceMileage || 0
                    });
                    setTransportFormOpen(true);
                  }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => {
                    if (window.confirm('Are you sure you want to delete this vehicle?')) {
                      setTransports(transports.filter((tr: any) => tr.id !== t.id));
                    }
                  }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}
      {activeTab === 'assignment' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
            <h4 className="font-bold text-zinc-900 mb-6 text-sm uppercase tracking-wider">Available Pilots</h4>
            <div className="space-y-4">
              {drivers.filter((d: any) => d.status === 'Active').map((d: any) => (
                <div 
                  key={d.id} 
                  draggable 
                  onDragStart={(e) => e.dataTransfer.setData('driverId', d.id)} 
                  className="p-4 bg-zinc-50 rounded-2xl cursor-move border border-zinc-200 hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {d.photoUrl && <img src={d.photoUrl} alt={d.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />}
                    <div>
                      <div className="font-bold text-sm text-zinc-900">{d.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{d.licenseNumber}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {transports.map((t: any) => (
              <div 
                key={t.id} 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={(e) => assignDriverToVehicle(e.dataTransfer.getData('driverId'), t.id)} 
                className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
              >
                <h5 className="font-bold text-zinc-900 mb-2">{t.vehicleName}</h5>
                <div className={`p-4 rounded-2xl border ${t.driverName === 'Unassigned' || t.driverName === 'Unknown' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider">Pilot: {t.driverName}</p>
                  
                  {/* Select menu for mobile / desktop quick alternative */}
                  <div className="mt-3">
                    <label className="block text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1">Assign Pilot Quick-select:</label>
                    <select
                      value={drivers.find((d: any) => d.name === t.driverName)?.id || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          assignDriverToVehicle(val, t.id);
                        } else {
                          const driverAssignedToThis = drivers.find((d: any) => d.assignedVehicleId === t.id);
                          if (driverAssignedToThis) {
                            setDrivers(drivers.map((d: any) => d.id === driverAssignedToThis.id ? { ...d, assignedVehicleId: '' } : d));
                          }
                          setTransports(transports.map((tr: any) => tr.id === t.id ? { ...tr, driverName: 'Unassigned', driverPhone: '' } : tr));
                        }
                      }}
                      className="w-full text-xs font-semibold bg-white border border-zinc-200 rounded-xl p-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">Unassigned</option>
                      {drivers.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.status !== 'Active' ? `(${d.status})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-4 uppercase font-bold italic hidden md:block">Or: Drop pilot here to assign</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <>
          {driverFormOpen && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in">
              <h4 className="text-sm font-bold text-zinc-800 mb-4">{driverForm.id ? 'Edit Pilot' : 'Add New Pilot'}</h4>
              <form onSubmit={saveDriver} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver Name</label>
                  <input required type="text" value={driverForm.name || ''} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. Ramesh Singh" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Phone Number</label>
                  <input required type="text" value={driverForm.phone || ''} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. +91 9876543210" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">License Number</label>
                  <input required type="text" value={driverForm.licenseNumber || ''} onChange={e => setDriverForm({...driverForm, licenseNumber: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. DL-14-2020-0012345" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">License Expiry</label>
                  <input required type="date" value={driverForm.licenseExpiry || ''} onChange={e => setDriverForm({...driverForm, licenseExpiry: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Status</label>
                  <select value={driverForm.status || ''} onChange={e => setDriverForm({...driverForm, status: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Attendance</label>
                  <select value={driverForm.attendance || 'Present'} onChange={e => setDriverForm({...driverForm, attendance: e.target.value as any})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Assign to Vehicle</label>
                  <select value={driverForm.assignedVehicleId || ''} onChange={e => setDriverForm({...driverForm, assignedVehicleId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Unassigned</option>
                    {transports.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.vehicleName} {t.capacityKg ? `(${t.capacityKg}kg)` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Emergency Contact</label>
                  <input type="text" value={driverForm.emergencyContact || ''} onChange={e => setDriverForm({...driverForm, emergencyContact: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. +91 9999999999" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Document URL</label>
                  <input type="text" value={driverForm.documentUrl || ''} onChange={e => setDriverForm({...driverForm, documentUrl: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="e.g. https://example.com/doc.pdf" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={driverForm.canJoinChat} onChange={e => setDriverForm({...driverForm, canJoinChat: e.target.checked})} className="h-4 w-4 text-amber-600 rounded border-zinc-300 focus:ring-amber-500" />
                  <label className="text-xs font-medium text-zinc-700">Join Internal Chat</label>
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setDriverFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors cursor-pointer">Save Driver</button>
                </div>
              </form>
            </div>
          )}

          <div className="flex justify-end mb-4">
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-700 rounded-xl text-xs font-bold border border-zinc-200 shadow-sm hover:bg-zinc-50 transition-colors cursor-pointer">
              <Download className="h-4 w-4" />
              Export to CSV
            </button>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-900">{drivers.length}</div>
              <div className="text-[10px] font-black uppercase text-zinc-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-600">{drivers.filter((d: any) => d.attendance === 'Present').length}</div>
              <div className="text-[10px] font-black uppercase text-sky-500">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-600">{drivers.filter((d: any) => d.attendance === 'Absent').length}</div>
              <div className="text-[10px] font-black uppercase text-zinc-500">Absent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{drivers.filter((d: any) => d.attendance === 'Late').length}</div>
              <div className="text-[10px] font-black uppercase text-amber-500">Late</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-4 h-64">
            <h4 className="font-bold text-zinc-800 mb-4">Weekly Attendance Trend</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { day: 'Mon', Present: 12, Absent: 1, Late: 2 },
                { day: 'Tue', Present: 13, Absent: 0, Late: 1 },
                { day: 'Wed', Present: 10, Absent: 3, Late: 1 },
                { day: 'Thu', Present: 11, Absent: 1, Late: 2 },
                { day: 'Fri', Present: 14, Absent: 0, Late: 0 },
                { day: 'Sat', Present: 12, Absent: 1, Late: 1 },
                { day: 'Sun', Present: 9, Absent: 4, Late: 1 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="Present" fill="#0284c7" />
                <Bar dataKey="Absent" fill="#a1a1aa" />
                <Bar dataKey="Late" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No drivers added yet</p>
              </div>
            ) : (
              drivers.map((d: any) => {
                const assignedVehicle = transports.find(t => t.id === d.assignedVehicleId);
                const expiryDate = new Date(d.licenseExpiry);
                const isExpiringSoon = expiryDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;
                
                return (
                  <div key={d.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all relative group">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {d.photoUrl ? (
                            <img src={d.photoUrl} alt={d.name} className="w-12 h-12 rounded-full object-cover border border-zinc-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                              <User className="h-6 w-6 text-zinc-400" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-zinc-900">{d.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[11px] font-bold text-zinc-500">{d.phone}</p>
                              {d.rating && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                  ⭐ {d.rating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-100 shadow-sm z-10">
                          <button onClick={() => {
                            window.dispatchEvent(new CustomEvent('trigger-internal-chat'));
                          }} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-md transition-colors cursor-pointer" title="Chat">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          {mode !== 'monitoring' && (
                            <button onClick={() => {
                              setDriverForm(d);
                              setDriverFormOpen(true);
                            }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {mode !== 'monitoring' && (
                            <button onClick={() => {
                              if (window.confirm('Are you sure you want to delete this driver?')) {
                                setDrivers(drivers.filter((dr: any) => dr.id !== d.id));
                              }
                            }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Experience</p>
                          <p className="text-xs font-bold text-zinc-800">{d.experienceYears ? `${d.experienceYears} Years` : 'N/A'}</p>
                        </div>
                        <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Blood Group</p>
                          <p className="text-xs font-bold text-rose-600">{d.bloodGroup || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs border-t border-zinc-100 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <span className="w-5 text-center text-zinc-400">#</span>
                            <span className="font-mono font-medium">{d.licenseNumber}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'On Leave'? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <div className={`flex items-center justify-between ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-zinc-600'}`}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 ml-1" />
                            <span>Expires: {d.licenseExpiry}</span>
                          </div>
                          {isExpiringSoon && <span className="text-[9px] uppercase tracking-wider bg-rose-100 px-1.5 py-0.5 rounded text-rose-700">Renew</span>}
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 ml-1 text-zinc-400" />
                            <span>Vehicle</span>
                          </div>
                          <span className="font-semibold text-zinc-800">{assignedVehicle ? assignedVehicle.vehicleName : <span className="italic text-zinc-400 font-normal">Unassigned</span>}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-600">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-800">Attendance</span>
                          </div>
                          <button onClick={() => {
                            const nextAttendance = d.attendance === 'Present' ? 'Absent' : d.attendance === 'Absent' ? 'Late' : 'Present';
                            setDrivers(drivers.map((dr: any) => dr.id === d.id ? { ...dr, attendance: nextAttendance } : dr));
                          }} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            d.attendance === 'Present' ? 'bg-sky-100 text-sky-700' : d.attendance === 'Absent' ? 'bg-zinc-100 text-zinc-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {d.attendance === 'Present' ? <CheckCircle2 className="h-3 w-3" /> : d.attendance === 'Absent' ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {d.attendance}
                          </button>
                        </div>
                        {d.documentUrl && (
                          <div className="flex items-center justify-between text-zinc-600">
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-center text-zinc-400">📄</span>
                              <span className="text-xs">Document</span>
                            </div>
                            <a href={d.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">View</a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-zinc-50 px-5 py-3 border-t border-zinc-200 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Duty Status</span>
                       <button 
                          onClick={() => {
                            const newStatus = !d.isAvailable;
                            setDrivers(drivers.map((dr: any) => dr.id === d.id ? { ...dr, isAvailable: newStatus } : dr));
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            d.isAvailable ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                          }`}
                        >
                          {d.isAvailable ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {d.isAvailable ? 'Available for Trip' : 'Unavailable'}
                        </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      {activeTab === 'checklists' && (
        <>
          {checklistFormOpen && (
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm animate-slide-in mb-6">
              <h4 className="text-sm font-bold text-zinc-800 mb-4">{checklistForm.id ? 'Edit Checklist' : 'New Pre-trip Checklist'}</h4>
              <form onSubmit={saveChecklist} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Vehicle</label>
                  <select required value={checklistForm.vehicleId || ''} onChange={e => setChecklistForm({...checklistForm, vehicleId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Select Vehicle</option>
                    {transports.map((t: any) => <option key={t.id} value={t.id}>{t.vehicleName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Driver</label>
                  <select required value={checklistForm.driverId || ''} onChange={e => setChecklistForm({...checklistForm, driverId: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm">
                    <option value="">Select Driver</option>
                    {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Date</label>
                  <input required type="date" value={checklistForm.date || ''} onChange={e => setChecklistForm({...checklistForm, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tirePressure" checked={!!checklistForm.tirePressure} onChange={e => setChecklistForm({...checklistForm, tirePressure: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="tirePressure" className="text-sm text-zinc-700">Tire Pressure OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="brakes" checked={!!checklistForm.brakes} onChange={e => setChecklistForm({...checklistForm, brakes: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="brakes" className="text-sm text-zinc-700">Brakes OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="lights" checked={!!checklistForm.lights} onChange={e => setChecklistForm({...checklistForm, lights: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="lights" className="text-sm text-zinc-700">Lights OK</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="oilLevel" checked={!!checklistForm.oilLevel} onChange={e => setChecklistForm({...checklistForm, oilLevel: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                  <label htmlFor="oilLevel" className="text-sm text-zinc-700">Oil Level OK</label>
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Notes</label>
                  <input type="text" value={checklistForm.notes || ''} onChange={e => setChecklistForm({...checklistForm, notes: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm" placeholder="Any issues observed?" />
                </div>
                <div className="lg:col-span-3 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setChecklistFormOpen(false)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors cursor-pointer">Save Checklist</button>
                </div>
              </form>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.length === 0 ? (
              <div className="col-span-full py-12 text-center text-zinc-400 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="font-semibold text-sm">No checklists added yet</p>
              </div>
            ) : (
              checklists.map((c: any) => {
                const vehicle = transports.find(t => t.id === c.vehicleId);
                const driver = drivers.find(d => d.id === c.driverId);
                const isAllPass = c.tirePressure && c.brakes && c.lights && c.oilLevel;
                
                return (
                  <div key={c.id} className={`bg-white border ${isAllPass ? 'border-emerald-200' : 'border-rose-200'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-extrabold text-zinc-800 flex items-center gap-2">
                          {isAllPass ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-rose-500" />}
                          {vehicle?.vehicleName || 'Unknown Vehicle'}
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium mt-1">{c.date} • {driver?.name || 'Unknown Driver'}</p>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => {
                          setChecklistForm(c);
                          setChecklistFormOpen(true);
                        }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors cursor-pointer" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => {
                          if (window.confirm('Are you sure you want to delete this checklist?')) {
                            setChecklists(checklists.filter((ch: any) => ch.id !== c.id));
                          }
                        }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md transition-colors cursor-pointer" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-medium">
                      <div className={`flex items-center gap-2 ${c.tirePressure ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.tirePressure ? '✓' : '✗'} Tires
                      </div>
                      <div className={`flex items-center gap-2 ${c.brakes ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.brakes ? '✓' : '✗'} Brakes
                      </div>
                      <div className={`flex items-center gap-2 ${c.lights ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.lights ? '✓' : '✗'} Lights
                      </div>
                      <div className={`flex items-center gap-2 ${c.oilLevel ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {c.oilLevel ? '✓' : '✗'} Oil Level
                      </div>
                    </div>
                    {c.notes && (
                      <div className="mt-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-xs text-zinc-600">
                        <span className="font-bold">Notes:</span> {c.notes}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      {activeTab === 'map' && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <div>
              <h4 className="font-bold text-zinc-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Fleet Asset Overview
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Live locations of all active and available vehicles</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> In-Transit
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Available
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Maintenance
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            {import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY && import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY.trim().startsWith('AIzaSy') ? (
              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY.trim()}>
                <Map
                  defaultZoom={8}
                  defaultCenter={{ lat: 18.5204, lng: 73.8567 }} // Pune center
                  mapId="fleet_map_1"
                  disableDefaultUI={true}
                >
                  {transports.map((t: any, idx: number) => {
                    // Generate pseudo-random coordinates around Pune based on vehicle ID
                    const latOffset = (parseInt(t.id.replace(/\D/g, '') || '0') % 10) * 0.05 - 0.25;
                    const lngOffset = (parseInt(t.id.replace(/\D/g, '') || '0') * 3 % 10) * 0.05 - 0.25;
                    const position = { lat: 18.5204 + latOffset + idx * 0.02, lng: 73.8567 + lngOffset - idx * 0.01 };
                    
                    let statusColor = '#3b82f6'; // Available (Blue)
                    if ((t.nextServiceMileage || 0) > 0 && (t.currentMileage || 0) / t.nextServiceMileage >= 0.9) {
                      statusColor = '#f43f5e'; // Maintenance (Red)
                    } else if (t.tripLogs && t.tripLogs.length > 0) {
                      // Check if recently added trip
                      statusColor = '#10b981'; // In-transit (Green)
                    }

                    return (
                      <AdvancedMarker key={t.id} position={position} title={t.vehicleName}>
                        <Pin background={statusColor} borderColor={statusColor} glyphColor="#fff" />
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-100 text-zinc-500 text-sm">
                Google Maps API key is not configured.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
