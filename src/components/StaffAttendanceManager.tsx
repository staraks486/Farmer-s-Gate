import React, { useState, useMemo } from 'react';
import { 
  Users, Calendar, Clock, ArrowLeftRight, Award, Plus, Trash2, Edit2, 
  Check, X, Shield, Phone, MapPin, Send, MessageSquare, Briefcase, 
  FileSpreadsheet, Star, Sparkles, UserCheck, CheckCircle2, AlertCircle, XCircle,
  IndianRupee, Download
} from 'lucide-react';
import { Store, Sale, StaffMember, AttendanceRecord, AttendancePunch } from '../types';

const formatPhoneWithCountryCode = (phone: string): string => {
  // Remove non-digits except +
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If 10 digits (common for India without country code), prepend +91
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // If 12 digits and starts with 91, prepend +
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  return `+${cleaned}`;
};

interface StaffAttendanceManagerProps {
  stores: Store[];
  sales: Sale[];
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  onAddStaff: (staff: StaffMember) => Promise<void>;
  onUpdateStaff: (staff: StaffMember) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onSaveAttendance: (record: AttendanceRecord) => Promise<void>;
}

export default function StaffAttendanceManager({
  stores,
  sales,
  staff,
  attendance,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onSaveAttendance
}: StaffAttendanceManagerProps) {
  // Navigation tabs inside the sub-module
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'staff-list' | 'sifting' | 'performance'>('attendance');

  // Attendance filter states
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form states for adding/editing staff member
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'Manager' | 'Staff' | 'Cashier' | 'Salesperson'>('Staff');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffStoreId, setStaffStoreId] = useState('');

  // Performance range filter
  const [performanceRange, setPerformanceRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Sifting state
  const [siftingStaffId, setSiftingStaffId] = useState<string | null>(null);
  const [targetStoreId, setTargetStoreId] = useState<string>('');

  // Detailed Employee Paycard/Details Modal state
  const [selectedDetailsStaffId, setSelectedDetailsStaffId] = useState<string | null>(null);

  const calculateHoursFromRecord = (record: AttendanceRecord): number => {
    if (record.status !== 'Present') return 0;
    const punches = record.punches || [];
    if (punches.length > 0) {
      let totalMinutes = 0;
      let activeInTime: string | null = null;
      for (const p of punches) {
        if (p.type === 'In') {
          activeInTime = p.time;
        } else if (p.type === 'Out' && activeInTime) {
          const [inH, inM] = activeInTime.split(':').map(Number);
          const [outH, outM] = p.time.split(':').map(Number);
          const diffMin = (outH * 60 + outM) - (inH * 60 + inM);
          if (diffMin > 0) {
            totalMinutes += diffMin;
          }
          activeInTime = null;
        }
      }
      return totalMinutes / 60;
    }
    const inTime = record.timeIn || '09:00';
    const outTime = record.timeOut || '18:00';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    return Math.max(0, (outH + outM / 60) - (inH + inM / 60));
  };

  // Daily store specific aggregate stats calculations
  const todayStoreStats = useMemo(() => {
    const storeStaff = staff.filter(st => st.assignedStoreId === selectedStoreId && st.isActive);
    const storeStaffIds = storeStaff.map(s => s.id);
    const storeTodayAttendance = attendance.filter(r => storeStaffIds.includes(r.staffId) && r.date === selectedDate);
    
    const presentRecords = storeTodayAttendance.filter(r => r.status === 'Present');
    const presentCount = presentRecords.length;
    
    let totalHoursLogged = 0;
    let totalEstWages = 0;
    let onTimeCount = 0;
    
    presentRecords.forEach(record => {
      const st = storeStaff.find(s => s.id === record.staffId);
      if (!st) return;
      
      const hours = calculateHoursFromRecord(record);
      totalHoursLogged += hours;
      
      const rateMap = { Manager: 250, Cashier: 180, Staff: 120, Salesperson: 150 };
      const hourlyRate = rateMap[st.role] || 120;
      
      const std = Math.min(8, hours);
      const ot = Math.max(0, hours - 8);
      const pay = (std * hourlyRate) + (ot * hourlyRate * 1.5) + 100; // includes 100 allowance
      totalEstWages += pay;
      
      const inTime = record.timeIn || '09:00';
      const [inH, inM] = inTime.split(':').map(Number);
      const isLate = inH > 9 || (inH === 9 && inM > 0);
      if (!isLate) onTimeCount++;
    });
    
    const punctuality = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;
    
    return {
      presentCount,
      totalHoursLogged: parseFloat(totalHoursLogged.toFixed(1)),
      totalEstWages: Math.round(totalEstWages),
      punctuality
    };
  }, [staff, attendance, selectedStoreId, selectedDate]);

  // Comprehensive employee level calculation
  const employeeCalculatedDetails = useMemo(() => {
    if (!selectedDetailsStaffId) return null;
    const st = staff.find(s => s.id === selectedDetailsStaffId);
    if (!st) return null;

    const staffAttendance = attendance.filter(r => r.staffId === st.id);
    const totalDaysRecorded = staffAttendance.length;
    const presentDays = staffAttendance.filter(r => r.status === 'Present').length;
    const leaveDays = staffAttendance.filter(r => r.status === 'Leave').length;
    const absentDays = staffAttendance.filter(r => r.status === 'Absent').length;
    const attendanceRate = totalDaysRecorded > 0 ? Math.round((presentDays / totalDaysRecorded) * 100) : 100;

    // Standard rate
    const rateMap = { Manager: 250, Cashier: 180, Staff: 120, Salesperson: 150 };
    const hourlyRate = rateMap[st.role] || 120;

    // Compute detailed hours
    let totalHours = 0;
    let standardHours = 0;
    let overtimeHours = 0;
    let punctualityCount = 0;

    const dailyBreakdown = staffAttendance.map(record => {
      let hours = 0;
      let std = 0;
      let ot = 0;
      let isLate = false;

      if (record.status === 'Present') {
        hours = calculateHoursFromRecord(record);
        
        std = Math.min(8, hours);
        ot = Math.max(0, hours - 8);

        totalHours += hours;
        standardHours += std;
        overtimeHours += ot;

        const inTime = record.timeIn || '09:00';
        const [inH, inM] = inTime.split(':').map(Number);
        isLate = inH > 9 || (inH === 9 && inM > 0);
        if (!isLate) {
          punctualityCount++;
        }
      }

      return {
        date: record.date,
        status: record.status,
        timeIn: record.timeIn,
        timeOut: record.timeOut,
        hours: parseFloat(hours.toFixed(2)),
        isLate,
        standardPay: Math.round(std * hourlyRate),
        overtimePay: Math.round(ot * hourlyRate * 1.5),
        allowance: record.status === 'Present' ? 100 : 0
      };
    });

    const standardEarnings = Math.round(standardHours * hourlyRate);
    const overtimeEarnings = Math.round(overtimeHours * hourlyRate * 1.5);
    const allowances = presentDays * 100; // ₹100 daily travel allowance
    const grossWages = standardEarnings + overtimeEarnings + allowances;
    const punctualityScore = presentDays > 0 ? Math.round((punctualityCount / presentDays) * 100) : 100;

    return {
      staff: st,
      hourlyRate,
      totalDaysRecorded,
      presentDays,
      leaveDays,
      absentDays,
      attendanceRate,
      totalHours: parseFloat(totalHours.toFixed(2)),
      standardHours: parseFloat(standardHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      standardEarnings,
      overtimeEarnings,
      allowances,
      grossWages,
      punctualityScore,
      dailyBreakdown: dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [selectedDetailsStaffId, staff, attendance]);

  // Sifting operation
  const handleSiftStaff = async () => {
    if (!siftingStaffId || !targetStoreId) return;
    const targetStaff = staff.find(s => s.id === siftingStaffId);
    if (!targetStaff) return;

    const previousStore = stores.find(s => s.id === targetStaff.assignedStoreId)?.name || 'Unassigned';
    const targetStore = stores.find(s => s.id === targetStoreId)?.name || 'Unassigned';

    const updated: StaffMember = {
      ...targetStaff,
      assignedStoreId: targetStoreId
    };

    await onUpdateStaff(updated);
    setSiftingStaffId(null);
    setTargetStoreId('');
    alert(`Success: Sifted ${targetStaff.name} from [${previousStore.replace("Farmer's Gate - ", "")}] to [${targetStore.replace("Farmer's Gate - ", "")}]!`);
  };

  // Create or Update Staff submit
  const handleSaveStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffPhone.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    if (editingStaff) {
      const updated: StaffMember = {
        ...editingStaff,
        name: staffName,
        role: staffRole,
        phone: staffPhone,
        assignedStoreId: staffStoreId
      };
      await onUpdateStaff(updated);
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: staffName,
        role: staffRole,
        phone: staffPhone,
        assignedStoreId: staffStoreId || (stores[0]?.id || ''),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await onAddStaff(newStaff);
    }

    setShowStaffModal(false);
    resetStaffForm();
  };

  const resetStaffForm = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffRole('Staff');
    setStaffPhone('');
    setStaffStoreId('');
  };

  const handleEditStaffClick = (s: StaffMember) => {
    setEditingStaff(s);
    setStaffName(s.name);
    setStaffRole(s.role);
    setStaffPhone(s.phone);
    setStaffStoreId(s.assignedStoreId);
    setShowStaffModal(true);
  };

  // Quick mark attendance
  const handleQuickMarkAttendance = async (staffMember: StaffMember, status: 'Present' | 'Leave' | 'Absent', overrideTimeIn?: string, overrideTimeOut?: string) => {
    // Check if record already exists for this staff and date
    const existing = attendance.find(r => r.staffId === staffMember.id && r.date === selectedDate);
    
    const record: AttendanceRecord = {
      id: existing?.id || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      staffId: staffMember.id,
      staffName: staffMember.name,
      staffRole: staffMember.role,
      storeId: selectedStoreId,
      date: selectedDate,
      status: status,
      timeIn: status === 'Present' ? (overrideTimeIn || existing?.timeIn || '09:00') : undefined,
      timeOut: status === 'Present' ? (overrideTimeOut || existing?.timeOut || '18:00') : undefined,
      lastUpdated: new Date().toISOString()
    };

    await onSaveAttendance(record);
  };

  // Performance calculations
  const performanceData = useMemo(() => {
    return staff.map(st => {
      // 1. Calculate sales made by this salesperson (by matching names)
      const cleanStaffName = st.name.toLowerCase().trim();
      const staffSales = sales.filter(s => {
        if (!s.salespersonName) return false;
        const matchesName = s.salespersonName.toLowerCase().trim() === cleanStaffName;
        
        // Date range filtering
        if (performanceRange === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          return matchesName && s.saleDate.startsWith(todayStr);
        } else if (performanceRange === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return matchesName && new Date(s.saleDate) >= oneWeekAgo;
        } else if (performanceRange === 'month') {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return matchesName && new Date(s.saleDate) >= oneMonthAgo;
        }
        return matchesName;
      });

      const totalSalesRevenue = staffSales.reduce((acc, s) => acc + s.totalPrice, 0);
      const totalTransactions = staffSales.length;

      // 2. Calculate attendance metrics
      const staffAttendance = attendance.filter(r => r.staffId === st.id);
      const totalDaysRecorded = staffAttendance.length;
      const presentDays = staffAttendance.filter(r => r.status === 'Present').length;
      const leaveDays = staffAttendance.filter(r => r.status === 'Leave').length;
      const attendanceRate = totalDaysRecorded > 0 ? Math.round((presentDays / totalDaysRecorded) * 100) : 100;

      return {
        staff: st,
        salesCount: totalTransactions,
        revenue: totalSalesRevenue,
        attendanceRate,
        presentDays,
        leaveDays,
        totalDaysRecorded
      };
    });
  }, [staff, sales, attendance, performanceRange]);

  // WhatsApp Performance report dispatcher
  const handleSendWhatsAppPerformance = (stName: string, phone: string, stats: typeof performanceData[0]) => {
    const formattedPhone = phone.replace(/\D/g, '');
    const cleanStoreName = stores.find(s => s.id === stats.staff.assignedStoreId)?.name.replace("Farmer's Gate - ", "") || 'Main HQ';
    
    const message = `*FARMER'S GATE PERFORMANCE CARD*\n` +
      `--------------------------------------\n` +
      `👤 *Employee:* ${stName}\n` +
      `💼 *Role:* ${stats.staff.role}\n` +
      `🏪 *Assigned Store:* ${cleanStoreName}\n` +
      `📅 *Report Period:* ${performanceRange.toUpperCase()}\n\n` +
      `📈 *Sales Transactions:* ${stats.salesCount} Orders\n` +
      `💰 *Total Revenue Sourced:* ₹${stats.revenue.toLocaleString('en-IN')}\n` +
      `⭐ *Attendance Performance:* ${stats.attendanceRate}% (${stats.presentDays}/${stats.totalDaysRecorded} Days Present)\n` +
      `--------------------------------------\n` +
      `Thank you for your dedicated service at Farmer's Gate! Keep blooming! 🌱`;

    const whatsappUrl = `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noreferrer');
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Tab bar header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-10 px-4">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto py-3">
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeSubTab === 'attendance'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-4 w-4" /> Check-In Ledger
          </button>
          
          <button
            onClick={() => setActiveSubTab('staff-list')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeSubTab === 'staff-list'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" /> Roster Directory
          </button>

          <button
            onClick={() => setActiveSubTab('sifting')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeSubTab === 'sifting'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" /> Cross-Branch Sifting
          </button>

          <button
            onClick={() => setActiveSubTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
              activeSubTab === 'performance'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Award className="h-4 w-4" /> Salesperson Performance
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* 1. ATTENDANCE CHECK-IN LEDGER */}
        {activeSubTab === 'attendance' && (
          <div className="space-y-6">
            {/* Filter and selector panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">🏪 Target Retail Outlet</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 bg-white"
                >
                  <option value="">-- Choose Branch --</option>
                  {stores.filter(s => s.isActive).map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-1/3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">📅 Workday Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <div className="text-slate-400 text-[11px] font-bold flex items-center gap-1 mb-2">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Showing schedules assigned to this branch.
              </div>
            </div>

            {/* Daily Cumulative Calculated Widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-3xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Checked-In Staff</span>
                  <span className="text-base font-black text-slate-800 font-mono block mt-0.5">{todayStoreStats.presentCount} present</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-3xs flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Work Hours Today</span>
                  <span className="text-base font-black text-slate-800 font-mono block mt-0.5">{todayStoreStats.totalHoursLogged} hrs</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-3xs flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Punctuality Score</span>
                  <span className="text-base font-black text-slate-800 font-mono block mt-0.5">{todayStoreStats.punctuality}% on-time</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-3xs flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50/80 text-emerald-700 rounded-xl">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Est. Daily Wages</span>
                  <span className="text-base font-black text-emerald-700 font-mono block mt-0.5">₹{todayStoreStats.totalEstWages.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* List of personnel scheduled at the store */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="h-4.5 w-4.5 text-emerald-600" /> Daily Check-In Sheet for {selectedDate}
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-black uppercase font-mono">
                  {staff.filter(st => st.assignedStoreId === selectedStoreId && st.isActive).length} scheduled
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {staff
                  .filter(st => st.assignedStoreId === selectedStoreId && st.isActive)
                  .map(st => {
                    const record = attendance.find(r => r.staffId === st.id && r.date === selectedDate);
                    
                    return (
                      <div key={st.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800">{st.name}</h4>
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-extrabold uppercase">
                              {st.role}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                            <Phone className="h-3 w-3" /> {st.phone}
                          </p>
                          <button
                            onClick={() => setSelectedDetailsStaffId(st.id)}
                            className="mt-2 text-[10px] text-emerald-700 hover:text-emerald-800 font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200/60 px-2.5 py-1 rounded-xl w-fit border border-slate-200/40 shadow-3xs"
                          >
                            <FileSpreadsheet className="h-3 w-3" /> View Paycard & Stats
                          </button>
                        </div>

                        {/* Status Checkboxes / State controller */}
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          {/* Present button */}
                          <button
                            onClick={() => handleQuickMarkAttendance(st, 'Present')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                              record?.status === 'Present'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Present
                          </button>

                          {/* Leave Button */}
                          <button
                            onClick={() => handleQuickMarkAttendance(st, 'Leave')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                              record?.status === 'Leave'
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <AlertCircle className="h-4 w-4 text-amber-600" /> Leave
                          </button>

                          {/* Absent Button */}
                          <button
                            onClick={() => handleQuickMarkAttendance(st, 'Absent')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                              record?.status === 'Absent'
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <XCircle className="h-4 w-4 text-rose-600" /> Absent
                          </button>

                          {/* Time Inputs if Present */}
                          {record?.status === 'Present' && (
                            <div className="flex items-center gap-2 border border-slate-200/80 rounded-xl p-1 bg-slate-50 animate-fade-in">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase px-1 font-mono">🕒 In:</span>
                              <input
                                type="time"
                                value={record.timeIn || '09:00'}
                                onChange={(e) => handleQuickMarkAttendance(st, 'Present', e.target.value, record.timeOut)}
                                className="bg-transparent text-xs font-black text-slate-800 border-none outline-none w-16"
                              />
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase px-1 font-mono">Out:</span>
                              <input
                                type="time"
                                value={record.timeOut || '18:00'}
                                onChange={(e) => handleQuickMarkAttendance(st, 'Present', record.timeIn, e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-800 border-none outline-none w-16"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {staff.filter(st => st.assignedStoreId === selectedStoreId && st.isActive).length === 0 && (
                  <div className="text-center py-10 px-5">
                    <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase">No Staff Assigned</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use the Roster tab to assign staff to this store, or sift them over.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. ROSTER DIRECTORY */}
        {activeSubTab === 'staff-list' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" /> Staff Directory Roster
              </h2>
              <button
                onClick={() => {
                  resetStaffForm();
                  setShowStaffModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Staff Member
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staff.map(st => {
                const storeName = stores.find(s => s.id === st.assignedStoreId)?.name.replace("Farmer's Gate - ", "") || 'Unassigned HQ';
                return (
                  <div key={st.id} className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-800">{st.name}</h3>
                          <span className="inline-block text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-extrabold uppercase mt-1">
                            {st.role}
                          </span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEditStaffClick(st)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
                            title="Edit Info"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${st.name} from the roster?`)) {
                                onDeleteStaff(st.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs font-medium text-slate-500">
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" /> {st.phone}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>Branch: <strong className="text-slate-800">{storeName}</strong></span>
                        </p>
                        <p className="flex items-center gap-2 text-[10px] text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-300" />
                          Joined: {new Date(st.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-3 flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                        <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full"></span> Active Employee
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsStaffId(st.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1 cursor-pointer transition shadow-3xs"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Calc & Paycard
                      </button>
                    </div>
                  </div>
                );
              })}

              {staff.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-black text-slate-600 uppercase">No Staff Registered</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Create a profile for managers, staff cashiers, and salespeople to begin tracking attendance and performance.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. CROSS-BRANCH SIFTING (TRANSFER) */}
        {activeSubTab === 'sifting' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm max-w-3xl">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-tight flex items-center gap-2 mb-1.5">
                <Sparkles className="h-5 w-5 text-amber-600" /> Sifting & Shifting Board
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Store operations change daily. Transfer a manager, staff member, or cashier instantly from one retail branch to another. When sifted, they will immediately appear on the destination branch's daily check-in sheet.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transfer Form card */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Execute Shift Transfer</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">1. Select Staff Member</label>
                    <select
                      value={siftingStaffId || ''}
                      onChange={(e) => setSiftingStaffId(e.target.value || null)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                    >
                      <option value="">-- Choose Personnel --</option>
                      {staff.map(st => {
                        const currentStore = stores.find(s => s.id === st.assignedStoreId)?.name.replace("Farmer's Gate - ", "") || 'Unassigned HQ';
                        return (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.role}) - currently at [{currentStore}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {siftingStaffId && (
                    <div className="animate-fade-in space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">2. Target Destination Store</label>
                        <select
                          value={targetStoreId}
                          onChange={(e) => setTargetStoreId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                        >
                          <option value="">-- Select Destination --</option>
                          {stores.filter(s => s.isActive).map(st => {
                            const selectedStaffCurrentStoreId = staff.find(s => s.id === siftingStaffId)?.assignedStoreId;
                            if (st.id === selectedStaffCurrentStoreId) return null; // skip current
                            return (
                              <option key={st.id} value={st.id}>{st.name}</option>
                            );
                          })}
                        </select>
                      </div>

                      <button
                        onClick={handleSiftStaff}
                        disabled={!targetStoreId}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ArrowLeftRight className="h-4 w-4" /> Transfer Roster Record
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Roster map view (shows who is where) */}
              <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4.5 w-4.5 text-emerald-600" /> Active Branch Deployments
                </h3>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {stores.filter(s => s.isActive).map(st => {
                    const storeStaff = staff.filter(s => s.assignedStoreId === st.id && s.isActive);
                    return (
                      <div key={st.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                        <h4 className="text-xs font-black text-slate-800 uppercase flex justify-between items-center">
                          <span>🏪 {st.name.replace("Farmer's Gate - ", "")}</span>
                          <span className="text-[10px] font-bold text-emerald-700">{storeStaff.length} deployed</span>
                        </h4>
                        
                        {storeStaff.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {storeStaff.map(s => (
                              <span
                                key={s.id}
                                onClick={() => {
                                  setSiftingStaffId(s.id);
                                  setTargetStoreId('');
                                }}
                                className="text-[10px] bg-white border border-slate-200 hover:border-emerald-300 font-bold px-2.5 py-1 rounded-lg text-slate-700 cursor-pointer flex items-center gap-1 transition"
                                title="Click to initiate sifting transfer"
                              >
                                {s.name} <span className="text-[8px] text-slate-400 uppercase">({s.role})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic mt-2">No active staff deployed at this branch today.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SALESPERSON PERFORMANCE */}
        {activeSubTab === 'performance' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Salesperson Performance Analytics</h2>
                <p className="text-xs text-slate-400 mt-1">Review transaction counts, total revenue sourced, and overall attendance fidelity.</p>
              </div>

              <div className="flex items-center gap-2 border border-slate-200 p-1 rounded-xl bg-slate-50/50">
                {(['all', 'today', 'week', 'month'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setPerformanceRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      performanceRange === range
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {range === 'all' ? 'All Time' : range}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Grid cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {performanceData.map(data => {
                const cleanStoreName = stores.find(s => s.id === data.staff.assignedStoreId)?.name.replace("Farmer's Gate - ", "") || 'Main HQ';
                return (
                  <div key={data.staff.id} className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                            {data.staff.name}
                            {data.revenue > 10000 && (
                              <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                            )}
                          </h3>
                          <span className="inline-block text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-extrabold uppercase mt-1">
                            {data.staff.role} • {cleanStoreName}
                          </span>
                        </div>

                        {/* Attendance circle indicator */}
                        <div className="text-right">
                          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Attendance Rate</p>
                          <p className={`text-base font-black ${
                            data.attendanceRate >= 90 ? 'text-emerald-600' : data.attendanceRate >= 75 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {data.attendanceRate}%
                          </p>
                          <span className="text-[9px] font-bold text-slate-400 block font-mono">({data.presentDays}/{data.totalDaysRecorded} Days)</span>
                        </div>
                      </div>

                      {/* Performance Bento Stats */}
                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Transactions Done</span>
                          <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">{data.salesCount}</span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">POS Orders Logged</span>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Revenue Sourced</span>
                          <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">₹{data.revenue.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Value Sourced</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-6 pt-4 flex gap-2">
                      <button
                        onClick={() => handleSendWhatsAppPerformance(data.staff.name, data.staff.phone, data)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="h-4 w-4" /> Send Report on WA
                      </button>
                    </div>
                  </div>
                );
              })}

              {performanceData.length === 0 && (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200">
                  <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-black text-slate-600 uppercase">No Performance Metrics Available</p>
                  <p className="text-xs text-slate-400 mt-1">Settle your staff directory roster and start recording retail sales with designated salespersons first.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 5. ADD / EDIT STAFF MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {editingStaff ? 'Modify Staff Profile' : 'Register Staff Profile'}
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Role Designation</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                >
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff Rider</option>
                  <option value="Cashier">Cashier</option>
                  <option value="Salesperson">Salesperson</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">WhatsApp / Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
                  onBlur={(e) => setStaffPhone(formatPhoneWithCountryCode(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Assigned Outlet Branch</label>
                <select
                  value={staffStoreId}
                  onChange={(e) => setStaffStoreId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white"
                >
                  <option value="">-- Choose Store --</option>
                  {stores.filter(s => s.isActive).map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow-sm cursor-pointer text-center"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EMPLOYEE COMPREHENSIVE PAYCARD & ATTENDANCE LEDGER MODAL --- */}
      {selectedDetailsStaffId && employeeCalculatedDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full overflow-hidden shadow-2xl animate-fade-in text-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-6 shrink-0 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-950 border border-emerald-600/30 rounded-xl">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    HQ HR Central Ledger
                  </span>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-200 mt-1">
                    Employee Comprehensive Paycard
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailsStaffId(null)}
                className="text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-full h-8 w-8 flex items-center justify-center font-black transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Profile Card Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-5">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-black text-slate-800">{employeeCalculatedDetails.staff.name}</h4>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded uppercase">
                      {employeeCalculatedDetails.staff.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    ID: <span className="font-mono">{employeeCalculatedDetails.staff.id}</span> • Phone: {employeeCalculatedDetails.staff.phone}
                  </p>
                  <p className="text-xs text-slate-400 font-bold">
                    Assigned Outlet Branch: <strong className="text-slate-700">
                      {stores.find(s => s.id === employeeCalculatedDetails.staff.assignedStoreId)?.name || 'Central HQ'}
                    </strong>
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Attendance Score</span>
                  <span className="text-3xl font-black text-emerald-600 mt-2 font-mono">{employeeCalculatedDetails.attendanceRate}%</span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1">
                    {employeeCalculatedDetails.presentDays} of {employeeCalculatedDetails.totalDaysRecorded} Workdays
                  </span>
                </div>
              </div>

              {/* Roster Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Present Days</span>
                  <span className="text-lg font-black text-emerald-600 block mt-1">{employeeCalculatedDetails.presentDays} Days</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Leave Days</span>
                  <span className="text-lg font-black text-amber-600 block mt-1">{employeeCalculatedDetails.leaveDays} Days</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Absent Days</span>
                  <span className="text-lg font-black text-rose-600 block mt-1">{employeeCalculatedDetails.absentDays} Days</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase block">Punctuality Score</span>
                  <span className="text-lg font-black text-indigo-600 block mt-1">{employeeCalculatedDetails.punctualityScore}%</span>
                </div>
              </div>

              {/* Comprehensive Financial Calculations / Paycard Worksheet */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-3xs bg-slate-50/10">
                <div className="bg-slate-50/80 px-4.5 py-3 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">
                    💳 Monthly Compensation Worksheet
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                    HOURLY_RATE: ₹{employeeCalculatedDetails.hourlyRate}/hr
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Standard Hours Logged (Max 8.0/day)</span>
                        <span className="font-bold text-slate-800 font-mono">{employeeCalculatedDetails.standardHours} hrs</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Standard Shift Wages</span>
                        <span className="font-bold text-slate-800 font-mono">₹{employeeCalculatedDetails.standardEarnings.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Overtime Hours Logged</span>
                        <span className="font-bold text-amber-600 font-mono">+{employeeCalculatedDetails.overtimeHours} hrs</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Overtime Wages (1.5x Premium)</span>
                        <span className="font-bold text-slate-800 font-mono">₹{employeeCalculatedDetails.overtimeEarnings.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-4">
                    <span className="text-slate-500 font-semibold">Travel & Meal Allowances (₹100/present day)</span>
                    <span className="font-bold text-slate-800 font-mono">₹{employeeCalculatedDetails.allowances.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Est. Gross Payable Wage</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Includes basic hourly rate, overtime, and daily travel allowance.</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700 font-mono">
                      ₹{employeeCalculatedDetails.grossWages.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roster Timeline Ledger */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  📅 Daily Attendance & Workday Logs
                </h4>
                {employeeCalculatedDetails.dailyBreakdown.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200 text-xs">
                    {employeeCalculatedDetails.dailyBreakdown.map((log, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50/30">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-700">{log.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              log.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                              log.status === 'Leave' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                              'bg-rose-50 text-rose-800 border border-rose-100'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          {log.status === 'Present' && (
                            <p className="text-slate-400 font-semibold text-[11px] font-mono">
                              ⏰ In: {log.timeIn} | Out: {log.timeOut} ({log.hours} hrs)
                            </p>
                          )}
                        </div>

                        {log.status === 'Present' && (
                          <div className="text-right flex flex-col sm:items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              {log.isLate ? (
                                <span className="bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-black px-1.5 rounded uppercase font-mono">
                                  Late Arrival
                                </span>
                              ) : (
                                <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 rounded uppercase font-mono">
                                  On Time
                                </span>
                              )}
                              <span className="font-bold text-slate-800 font-mono">
                                ₹{(log.standardPay + log.overtimePay + log.allowance).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Pay: ₹{log.standardPay} std + ₹{log.overtimePay} ot + ₹{log.allowance} allowance
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl italic text-xs text-slate-400 font-semibold">
                    No historic attendance logs found for this employee.
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedDetailsStaffId(null)}
                className="flex-1 py-3 border border-slate-200 hover:bg-white text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition text-center shadow-3xs"
              >
                Close Paycard Sheet
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Payout package compiled for ${employeeCalculatedDetails.staff.name}!\nEstimated gross salary: ₹${employeeCalculatedDetails.grossWages.toLocaleString('en-IN')}.\nDownloading payroll package...`);
                  
                  // File download
                  const content = `FarmersGate Employee Paycard\n============================\nEmployee: ${employeeCalculatedDetails.staff.name}\nRole: ${employeeCalculatedDetails.staff.role}\nBranch: ${stores.find(s => s.id === employeeCalculatedDetails.staff.assignedStoreId)?.name || 'Central'}\n\nPresent Days: ${employeeCalculatedDetails.presentDays}\nLeave Days: ${employeeCalculatedDetails.leaveDays}\nAbsent Days: ${employeeCalculatedDetails.absentDays}\nAttendance Rate: ${employeeCalculatedDetails.attendanceRate}%\nPunctuality: ${employeeCalculatedDetails.punctualityScore}%\nTotal Hours: ${employeeCalculatedDetails.totalHours} hrs\nStandard Hours: ${employeeCalculatedDetails.standardHours} hrs\nOvertime Hours: ${employeeCalculatedDetails.overtimeHours} hrs\n\nHourly Rate: ₹${employeeCalculatedDetails.hourlyRate}/hr\nStandard Wages: ₹${employeeCalculatedDetails.standardEarnings}\nOvertime Wages: ₹${employeeCalculatedDetails.overtimeEarnings}\nTravel Allowances: ₹${employeeCalculatedDetails.allowances}\nGross Salary: ₹${employeeCalculatedDetails.grossWages}\n\nCompiled on: ${new Date().toLocaleString()}`;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${employeeCalculatedDetails.staff.name.replace(/\s+/g, '_')}_paycard.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download Paycard Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
