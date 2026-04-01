import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import {
  LuUsers, LuSearch,
  LuClock, LuFileText, LuCheck,
  LuChevronRight, LuX, LuTrendingUp, LuShieldCheck,
  LuListTodo, LuPlus, LuTrash2, LuCalendar, LuCalendarCheck, LuQrCode
} from 'react-icons/lu';
import { Modal } from '../../components/ui/Modal';
import { AnimatePresence } from 'framer-motion';
import { Table, Button, Card, Badge } from '../../components/ui';
import type { EmployeeRole } from '../../types';
import RoleManagement from './RoleManagement';
import LeaveApprovals from './LeaveApprovals';
import BiometricMatches from './BiometricMatches';
import Timesheets from './Timesheets';
import QRGeneration from './QRGeneration';

const WorkforceHub: React.FC = () => {
  const employees = useStore(state => state.employees);
  const timeOffRequests = useStore(state => state.timeOffRequests);
  const workReports = useStore(state => state.workReports);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const locations = useStore(state => state.locations);
  const addEmployee = useStore(state => state.addEmployee);
  const workAssignments = useStore(state => state.workAssignments);
  const customRoles = useStore(state => state.customRoles);
  const addWorkAssignment = useStore(state => state.addWorkAssignment);
  const deleteWorkAssignment = useStore(state => state.deleteWorkAssignment);
  const employeeShifts = useStore(state => state.employeeShifts);
  const addEmployeeShift = useStore(state => state.addEmployeeShift);
  const deleteEmployeeShift = useStore(state => state.deleteEmployeeShift);
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const lastPath = locationPath.split('/').pop();
  const activeTab = (lastPath === 'workforce' || !lastPath) ? 'roster' : lastPath;

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboard, setShowOnboard] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [punchEmpId, setPunchEmpId] = useState<string | null>(null);
  const [punchRemarks, setPunchRemarks] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);
  const submitAttendance = useStore(state => state.submitAttendance);
  
  const [newEmp, setNewEmp] = useState(() => ({
    name: '',
    role: 'Cleaner' as EmployeeRole,
    locationId: '',
    phone: '',
    email: '',
    status: 'active' as const,
    companyId: 'comp-pyramid', // Default for now
    userId: 'user-' + Math.random().toString(36).substr(2, 9)
  }));

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    assignedRole: 'Cleaner' as EmployeeRole | 'All',
    recurrence: 'daily' as 'daily' | 'weekly' | 'one-off',
  });

  const [newShift, setNewShift] = useState(() => ({
    employeeId: '',
    locationId: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
    status: 'Scheduled' as const
  }));

  const filteredEmployees = employees.filter(e => 
    (e.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (e.role || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];
  const leavesToday = timeOffRequests.filter(req => 
    req.status === 'approved' && 
    today >= req.startDate && 
    today <= req.endDate
  ).length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-1.5px' }}>Operations Workforce</h2>
            <p className="text-muted">Manage field staff, attendance, work reports and shift scheduling.</p>
          </div>
          {leavesToday > 0 && (
            <div style={{ 
              background: 'var(--warning-glow)', padding: '0.75rem 1.25rem', borderRadius: '16px', 
              border: '1px solid var(--warning)', display: 'flex', alignItems: 'center', gap: '0.75rem',
              animation: 'pulse 2s infinite'
            }}>
              <LuCalendarCheck className="text-warning" size={20} />
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Absences</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>{leavesToday} Personnel Off-duty</div>
              </div>
            </div>
          )}
        </div>
        <Button variant="primary" onClick={() => setShowOnboard(true)} className="lift shadow-glow">
          <LuPlus size={18} /> Onboard Employee
        </Button>
      </header>

      <div className="glass-surface" style={{ padding: '0.5rem', borderRadius: '14px', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
        {[
          { id: 'roster', label: 'Roster', icon: LuUsers },
          { id: 'activity', label: 'Activity Log', icon: LuClock },
          { id: 'reports', label: 'Work Reports', icon: LuFileText },
          { id: 'assignments', label: 'Assignments', icon: LuListTodo },
          { id: 'scheduling', label: 'Shift Roster', icon: LuCalendar },
          { id: 'roles', label: 'Roles', icon: LuShieldCheck },
          { id: 'leave', label: 'Leave', icon: LuCalendarCheck },
          { id: 'biometrics', label: 'Biometrics', icon: LuCheck },
          { id: 'timesheets', label: 'Overrides', icon: LuClock },
          { id: 'qr-gen', label: 'QR Codes', icon: LuQrCode },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(`/admin/workforce/${tab.id}`)}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flex: 1,
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-sub)',
              boxShadow: activeTab === tab.id ? '0 4px 15px var(--primary-glow)' : 'none',
            }}
          >
            <tab.icon size={16} />
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>{tab.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Leave Management View */}
      {activeTab === 'leave' && <LeaveApprovals isTab />}

      {/* Biometric Audit View */}
      {activeTab === 'biometrics' && <BiometricMatches isTab />}

      {/* Role Management View */}
      {activeTab === 'roles' && <RoleManagement isTab />}

      {/* Timesheets Overrides View */}
      {activeTab === 'timesheets' && <Timesheets isTab />}

      {/* QR Code Generation View */}
      {activeTab === 'qr-gen' && <QRGeneration isTab />}

      {/* Roster View */}
      {activeTab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-surface" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <div className="search-box">
              <LuSearch className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="glass-surface" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LuUsers className="text-primary" /> Personnel Roster ({filteredEmployees.length})
              </h3>
            </div>
            <Table
              columns={[
                { key: 'name', header: 'EMPLOYEE', render: (emp: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0 }}>
                      {emp.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{emp.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{emp.email || 'No email set'}</div>
                    </div>
                  </div>
                )},
                { key: 'role', header: 'ROLE', render: (emp: any) => (
                  <span className="status-badge" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>{emp.role}</span>
                )},
                { key: 'location', header: 'SITE', render: (emp: any) => {
                  const loc = locations.find(l => l.id === emp.locationId);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700 }}>{loc?.name || 'Unassigned'}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{loc?.address || ''}</span>
                    </div>
                  );
                }},
                { key: 'status', header: 'STATUS', render: (emp: any) => (
                  <span className={`status-badge ${emp.status === 'active' ? 'success' : 'warning'}`}>
                    {(emp.status || 'active').toUpperCase()}
                  </span>
                )},
                { key: 'actions', header: '', render: (emp: any) => {
                  const isActive = attendanceRecords.find(r => r.employeeId === emp.id && !r.checkOut);
                  return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPunchEmpId(emp.id);
                          setPunchType(isActive ? 'out' : 'in');
                          setShowPunchModal(true);
                        }} 
                        className="lift p-2"
                        title={isActive ? "Force Punch Out" : "Force Punch In"}
                        style={{ background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isActive ? 'var(--danger)' : 'var(--success)', border: 'none' }}
                      >
                        <LuClock size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedEmpId(emp.id)} className="lift" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <LuChevronRight size={16} /> Profile
                      </Button>
                    </div>
                  );
                }}
              ]}
              data={filteredEmployees}
              onRowClick={(emp) => setSelectedEmpId(emp.id)}
            />
          </div>
        </div>
      )}

      {/* Activity Log View */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '24px', padding: '1.5rem 2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-main)', margin: 0 }}>Global Activity Timeline</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700, margin: '0.4rem 0 0 0' }}>Unified chronological record of all workforce actions</p>
            </div>
            <Button variant="ghost" className="lift" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
              <LuFileText size={18} />
              <span>Export Analytics</span>
            </Button>
          </div>

          <div style={{ position: 'relative', paddingLeft: '2rem', borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {[
              ...attendanceRecords.map(r => ({ ...r, type: 'attendance' as const, ts: r.checkIn || (r as any).timestamp || new Date().toISOString() })),
              ...workReports.map(r => ({ ...r, type: 'report' as const, ts: r.createdAt || (r as any).timestamp || new Date().toISOString() }))
            ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).map(activity => {
              const emp = employees.find(e => e.id === activity.employeeId);
              const dateObj = new Date(activity.ts);
              
              if (activity.type === 'attendance') {
                const att = activity as any;
                return (
                  <div key={`att-${att.id}`} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-2.4rem', top: '1.5rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', border: '3px solid var(--bg-color)', boxShadow: '0 0 10px var(--success)' }} />
                    <Card variant="premium" style={{ padding: '1.5rem', marginLeft: '1rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div 
                          style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, cursor: 'zoom-in', position: 'relative' }}
                          onClick={() => setSelectedEvidence({ imageUrl: att.imageUrl, type: 'attendance', name: emp?.name, timestamp: activity.ts })}
                          className="lift"
                        >
                           <img src={att.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Attendance" />
                           <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                              <LuSearch color="#fff" size={20} />
                           </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Badge variant="success" style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>PUNCH IN</Badge>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: 'var(--bg-color)' }}>{emp?.name || 'Unknown'}</h4>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Tactical Location Authenticated</p>
                          {att.checkOut && !isNaN(new Date(att.checkOut).getTime()) && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 850, color: 'rgba(255,255,255,0.9)' }}>
                              <span style={{ color: '#fb7185' }}>PUNCH OUT:</span>
                              {new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              } else {
                const rep = activity as any;
                return (
                  <div key={`rep-${rep.id}`} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-2.4rem', top: '1.5rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--bg-color)', boxShadow: '0 0 10px var(--primary)' }} />
                    <Card variant="premium" style={{ padding: '1.5rem', marginLeft: '1rem', border: '1px solid var(--border)', background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div 
                          style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0, cursor: 'zoom-in', position: 'relative' }}
                          onClick={() => setSelectedEvidence({ imageUrl: rep.imageUrl, type: 'report', name: emp?.name, timestamp: activity.ts, remarks: rep.remarks })}
                          className="lift"
                        >
                           <img src={rep.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Work Report" />
                           <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                              <LuSearch color="#fff" size={20} />
                           </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <Badge variant="primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>WORK REPORT</Badge>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: 'white' }}>{emp?.name || 'Unknown'}</h4>
                          <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, fontWeight: 600 }}>
                              "{rep.remarks}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}


      {/* Work Reports View */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-surface" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
             <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <LuFileText className="text-primary" /> Visual Work Evidence ({workReports.length})
               </h3>
             </div>
             <Table
               columns={[
                 { key: 'image', header: 'EVIDENCE', render: (report: any) => (
                   <div 
                     style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '2px solid var(--border)', background: 'var(--surface-hover)', cursor: 'zoom-in' }}
                     onClick={(e) => { e.stopPropagation(); setSelectedEvidence({ ...report, type: 'report', name: employees.find(emp => emp.id === report.employeeId)?.name }); }}
                     className="lift"
                   >
                     <img src={report.imageUrl} alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   </div>
                 )},
                 { key: 'staff', header: 'FIELD OPERATIVE', render: (report: any) => {
                   const emp = employees.find(e => e.id === report.employeeId);
                   return (
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontWeight: 800 }}>{emp?.name || 'Unknown'}</span>
                       <span className="text-muted" style={{ fontSize: '0.75rem' }}>{emp?.role?.toUpperCase() || 'NO ROLE'}</span>
                     </div>
                   );
                 }},
                 { key: 'remarks', header: 'REMARKS / NOTES', render: (report: any) => (
                   <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic', maxWidth: '400px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                     "{report.remarks}"
                   </span>
                 )},
                 { key: 'status', header: 'STATUS', render: (report: any) => (
                    <span className={`status-badge ${
                      report.status === 'approved' ? 'success' : 
                      report.status === 'rejected' ? 'danger' : 'neutral'
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                 )},
                 { key: 'timestamp', header: 'TIMESTAMP', render: (report: any) => (
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      {new Date(report.createdAt || report.timestamp || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                 )},
                 { key: 'actions', header: '', render: (report: any) => (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                       <Button 
                         variant="secondary" 
                         size="sm" 
                         onClick={(e) => { e.stopPropagation(); setSelectedEvidence({ ...report, type: 'report', name: employees.find(emp => emp.id === report.employeeId)?.name }); }}
                         className="lift"
                       >
                         View
                       </Button>
                      {report.status === 'pending' && (
                        <>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); useStore.getState().rejectWorkReport(report.id, 'admin'); }}
                            className="lift"
                          >
                            Reject
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); useStore.getState().approveWorkReport(report.id, 'admin'); }}
                            className="lift"
                          >
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                 )}
               ]}
               data={workReports.sort((a, b) => new Date(b.createdAt || (b as any).timestamp || '').getTime() - new Date(a.createdAt || (a as any).timestamp || '').getTime())}
             />
          </div>
        </div>
      )}

      {/* Work Assignments View */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="glass-surface" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                 <LuListTodo className="text-primary" /> Active Assignments
               </h3>
               <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)} className="lift shadow-glow">
                 <LuPlus size={16} /> Assign Task
               </Button>
            </div>
            <Table
              columns={[
                { key: 'title', header: 'TASK TITLE', render: (a: any) => (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 800 }}>{a.title}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description || 'No detailed instructions.'}</span>
                  </div>
                )},
                { key: 'role', header: 'ROLE / TARGET', render: (a: any) => (
                  <span className="status-badge" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {a.assignedRole || 'Specific Resource'}
                  </span>
                )},
                { key: 'recurrence', header: 'RECURRENCE', render: (a: any) => <span className="text-muted capitalize">{a.recurrence}</span> },
                { key: 'status', header: 'STATUS', render: (a: any) => <span className="status-badge success">{a.status.toUpperCase()}</span> },
                { key: 'actions', header: '', render: (a: any) => (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <Button size="sm" variant="ghost" onClick={() => deleteWorkAssignment(a.id)} className="text-danger lift flex items-center justify-center p-2" title="Archive">
                       <LuTrash2 size={16} />
                     </Button>
                  </div>
                )}
              ]}
              data={workAssignments.filter((a: any) => a.status !== 'archived')}
            />
          </div>
        </div>
      )}

      {/* Shift Scheduling View */}
      {activeTab === 'scheduling' && (
        <div className="space-y-4">
          <div className="glass-surface" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ flex: 1 }}>
                 <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                   <LuCalendar className="text-primary" /> Global Shift Roster
                 </h3>
                 <p className="text-muted" style={{ margin: '0.25rem 0 0 2rem', fontSize: '0.8rem' }}>Manage personnel deployments and timelines</p>
               </div>
               <Button variant="primary" size="sm" onClick={() => setShowShiftModal(true)} className="lift shadow-glow shrink-0">
                 <LuPlus size={16} /> Schedule Shift
               </Button>
            </div>
            <Table
              columns={[
                { key: 'staff', header: 'STAFF MEMBER', render: (s: any) => {
                  const emp = employees.find(e => e.id === s.employeeId);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800 }}>{emp?.name || 'Unknown'}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px' }}>{emp?.role?.toUpperCase() || 'NO ROLE'}</span>
                    </div>
                  );
                }},
                { key: 'location', header: 'LOCATION', render: (s: any) => {
                  const loc = locations.find(l => l.id === s.locationId);
                  return <span style={{ fontWeight: 700, color: 'var(--text-sub)' }}>{loc?.name || 'Unassigned'}</span>;
                }},
                { key: 'timeline', header: 'TIMELINE', render: (s: any) => {
                  const start = new Date(s.startTime);
                  const end = new Date(s.endTime);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                }},
                { key: 'status', header: 'STATUS', render: (s: any) => (
                  <span className={`status-badge ${s.status === 'In Progress' ? 'warning' : s.status === 'Completed' ? 'success' : 'info'}`}>
                    {s.status.toUpperCase()}
                  </span>
                )},
                { key: 'actions', header: '', render: (s: any) => (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                     <Button size="sm" variant="ghost" onClick={() => deleteEmployeeShift(s.id)} className="text-danger lift flex items-center justify-center p-2" title="Cancel Shift">
                       <LuTrash2 size={16} />
                     </Button>
                  </div>
                )}
              ]}
              data={employeeShifts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())}
            />
          </div>
        </div>
      )}

      {/* Schedule Shift Modal */}
      <Modal 
        isOpen={showShiftModal} 
        onClose={() => setShowShiftModal(false)} 
        title="Schedule Personnel Shift"
        style={{ '--primary': '#3b82f6' } as any}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Select Personnel</label>
              <select 
                className="input-field select-premium"
                value={newShift.employeeId}
                onChange={e => setNewShift({ ...newShift, employeeId: e.target.value })}
              >
                <option value="">-- Select Staff --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Duty Station</label>
              <select 
                className="input-field select-premium"
                value={newShift.locationId}
                onChange={e => setNewShift({ ...newShift, locationId: e.target.value })}
              >
                <option value="">-- Select Location --</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Start Timeline</label>
              <input 
                type="datetime-local" 
                className="input-field"
                value={newShift.startTime}
                onChange={e => setNewShift({ ...newShift, startTime: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">End Timeline</label>
              <input 
                type="datetime-local" 
                className="input-field"
                value={newShift.endTime}
                onChange={e => setNewShift({ ...newShift, endTime: e.target.value })}
              />
            </div>
          </div>
          
          <Button 
            variant="primary" 
            className="w-full btn-lg shadow-glow"
            onClick={async () => {
              if (!newShift.employeeId || !newShift.locationId) return;
              const emp = employees.find(e => e.id === newShift.employeeId);
              await addEmployeeShift({
                ...newShift,
                role: emp?.role || 'Cleaner',
                startTime: new Date(newShift.startTime).toISOString(),
                endTime: new Date(newShift.endTime).toISOString()
              });
              setShowShiftModal(false);
              setNewShift({ ...newShift, employeeId: '' });
            }}
          >
            Deploy Roster
          </Button>
        </div>
      </Modal>

      {/* Onboarding Modal */}
      <Modal 
        isOpen={showOnboard} 
        onClose={() => setShowOnboard(false)} 
        title="Onboard New Personnel"
        style={{ '--primary': '#f97316' } as any}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="John Doe"
                value={newEmp.name}
                onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Operational Role</label>
              <select 
                className="input-field select-premium"
                value={newEmp.role}
                onChange={e => setNewEmp({ ...newEmp, role: e.target.value as EmployeeRole })}
              >
                <optgroup label="System Roles">
                  <option value="Cleaner">Cleaner</option>
                  <option value="Stock Handler">Stock Handler</option>
                  <option value="Delivery Staff">Delivery Staff</option>
                  <option value="Supervisor">Supervisor</option>
                </optgroup>
                {customRoles.length > 0 && (
                  <optgroup label="Custom Roles">
                    {customRoles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Site Assignment</label>
              <select 
                className="input-field select-premium"
                value={newEmp.locationId}
                onChange={e => setNewEmp({ ...newEmp, locationId: e.target.value })}
              >
                <option value="">Field (Unassigned)</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input 
                type="tel" 
                className="input-field"
                placeholder="+91 XXXXX XXXXX"
                value={newEmp.phone}
                onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button 
                variant="ghost" 
                className="flex-1"
                onClick={() => setShowOnboard(false)}
            >
                Cancel
            </Button>
            <Button 
                variant="primary" 
                className="flex-[2] btn-lg shadow-glow"
                onClick={async () => {
                await addEmployee({
                    ...newEmp,
                    id: '', // Will be generated by store
                } as any);
                setShowOnboard(false);
                setNewEmp({ 
                    name: '', 
                    role: 'Cleaner', 
                    locationId: '', 
                    phone: '', 
                    email: '', 
                    status: 'active',
                    companyId: 'comp-pyramid',
                    userId: 'user-' + Math.random().toString(36).substring(2, 11)
                });
                }}
            >
                Authorize & Onboard Personnel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Task Modal */}
      <Modal 
        isOpen={showAssignModal} 
        onClose={() => setShowAssignModal(false)} 
        title="Deploy Work Assignment"
        style={{ '--primary': '#f97316' } as any}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div className="input-group">
            <label className="input-label">Task Title</label>
            <input 
              type="text" 
              className="input-field"
              placeholder="E.g., Deep clean lobby"
              value={newAssignment.title}
              onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea 
              className="input-field"
              style={{ height: '100px', resize: 'none' }}
              placeholder="Task specifics..."
              value={newAssignment.description}
              onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Target Role</label>
              <select 
                className="input-field select-premium"
                value={newAssignment.assignedRole}
                onChange={e => setNewAssignment({ ...newAssignment, assignedRole: e.target.value as any })}
              >
                <option value="All">All Personnel</option>
                {customRoles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Recurrence</label>
              <select 
                className="input-field select-premium"
                value={newAssignment.recurrence}
                onChange={e => setNewAssignment({ ...newAssignment, recurrence: e.target.value as any })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="one-off">One-Off</option>
              </select>
            </div>
          </div>
          
          <Button 
            variant="primary" 
            className="w-full btn-lg shadow-glow"
            onClick={async () => {
              if (!newAssignment.title) return;
              await addWorkAssignment({
                ...newAssignment,
                status: 'active'
              });
              setShowAssignModal(false);
              setNewAssignment({ title: '', description: '', assignedRole: 'Cleaner', recurrence: 'daily' });
            }}
          >
            Deploy Assignment Plan
          </Button>
        </div>
      </Modal>
      
      {/* Manual Punch Override Modal */}
      <Modal
        isOpen={showPunchModal}
        onClose={() => setShowPunchModal(false)}
        title="Supervisor Override: Attendance"
        style={{ '--primary': punchType === 'in' ? '#10b981' : '#f43f5e' } as any}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
          <div className="glass-surface" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(var(--primary-rgb), 0.05)' }}>
            <div className="input-label" style={{ marginBottom: '0.5rem', color: 'var(--primary)' }}>Personnel Identity Verified</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                {employees.find(e => e.id === punchEmpId)?.name?.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{employees.find(e => e.id === punchEmpId)?.name}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700 }}>{employees.find(e => e.id === punchEmpId)?.role}</div>
              </div>
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label">Override Action</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => setPunchType('in')}
                className={`btn ${punchType === 'in' ? 'btn-primary shadow-glow' : 'btn-secondary'}`}
                style={{ padding: '1rem' }}
              >
                PUNCH IN
              </button>
              <button 
                onClick={() => setPunchType('out')}
                className={`btn ${punchType === 'out' ? 'btn-danger shadow-glow' : 'btn-secondary'}`}
                style={{ padding: '1rem' }}
              >
                PUNCH OUT
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Oversight Reason / Remarks</label>
            <textarea 
              className="input-field"
              style={{ height: '100px', resize: 'none' }}
              placeholder="e.g. Signal failure in basement, verified presence in person..."
              value={punchRemarks}
              onChange={e => setPunchRemarks(e.target.value)}
            />
          </div>

          <Button 
            className="w-full btn-lg shadow-glow"
            variant={punchType === 'in' ? 'primary' : 'danger'}
            onClick={async () => {
              if (!punchEmpId) return;
              const emp = employees.find(e => e.id === punchEmpId);
              await submitAttendance({
                employeeId: punchEmpId,
                locationId: emp?.locationId || '',
                type: punchType,
                photoUrl: 'https://images.unsplash.com/photo-1454165833767-027eeef1593e?w=800&auto=format&fit=crop&q=60', // System marker image
                latitude: locations.find(l => l.id === emp?.locationId)?.latitude || 0,
                longitude: locations.find(l => l.id === emp?.locationId)?.longitude || 0
              });
              setShowPunchModal(false);
              setPunchRemarks('');
            }}
          >
            AUTHORIZE MANUAL {punchType.toUpperCase()}
          </Button>
          
          <p style={{ margin: 0, textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            * This action will be flagged as a supervised override in the audit log.
          </p>
        </div>
      </Modal>

      {/* Employee Profile Drawer */}
      <AnimatePresence>
        {selectedEmpId && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#0a0a0c] border-l border-white/10 z-[1000] p-8 shadow-2xl overflow-y-auto"
          >
            {(() => {
              const emp = employees.find(e => e.id === selectedEmpId);
              const empWorkReports = workReports.filter(r => r.employeeId === selectedEmpId);
              const empAttendance = attendanceRecords.filter(r => r.employeeId === selectedEmpId);
              const completionRate = empWorkReports.length > 0 
                ? (empWorkReports.filter(r => r.status === 'approved').length / empWorkReports.length * 100).toFixed(0)
                : 0;

              if (!emp) return null;

              return (
                <div className="space-y-8">
                  <header className="flex justify-between items-center">
                    <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-full">Personnel Dossier</span>
                    <button onClick={() => setSelectedEmpId(null)} className="text-white/40 hover:text-white transition-colors">
                      <LuX size={24} />
                    </button>
                  </header>

                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-orange-500/20">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{emp.name}</h2>
                      <div className="text-orange-500 font-bold text-sm">{emp.role}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-white/40 mb-1">Checklist Compliance</div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-emerald-500">{completionRate}%</span>
                        <LuTrendingUp size={16} className="text-emerald-500 mb-1" />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-[10px] font-black uppercase text-white/40 mb-1">Total Reports</div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-white">{empWorkReports.length}</span>
                        <LuFileText size={16} className="text-white/40 mb-1" />
                      </div>
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                      <LuClock className="text-orange-500" size={14} />
                      Recent Activity
                    </h4>
                    <div className="space-y-3">
                      {empAttendance.slice(0, 5).map(record => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="text-sm">
                            <div className="text-white font-bold">{new Date(record.checkIn).toLocaleDateString()}</div>
                            <div className="text-white/40 text-[10px]">{new Date(record.checkIn).toLocaleTimeString()} check-in</div>
                          </div>
                          <LuShieldCheck size={18} className="text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="flex gap-4 pt-8">
                    <button className="flex-1 btn-secondary py-3">View Full History</button>
                    <button className="px-4 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      {/* High-Resolution Evidence Lightbox */}
      <Modal
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        title="Evidence Quality Inspection"
        className="modal-xl"
      >
        {selectedEvidence && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ 
              width: '100%', 
              maxHeight: '70vh', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={selectedEvidence.imageUrl} 
                alt="Evidence Detail" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain',
                  cursor: 'zoom-in',
                  transition: 'transform 0.3s ease'
                }} 
                onClick={(e) => {
                  const img = e.currentTarget;
                  img.style.transform = img.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)';
                }}
              />
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '12px', color: '#fff', fontSize: '0.7rem', fontWeight: 900, backdropFilter: 'blur(10px)' }}>
                CLICK PHOTO TO ZOOM
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '2rem' }}>
              <div className="glass-surface" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Field Remarks</div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
                   "{selectedEvidence.remarks || 'No operational notes provided.'}"
                </p>
              </div>

              <div className="glass-surface" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>RECORD TYPE</span>
                  <Badge variant={selectedEvidence.type === 'attendance' ? 'success' : 'primary'}>{selectedEvidence.type?.toUpperCase()}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>PERSONNEL</span>
                  <span style={{ fontWeight: 800 }}>{selectedEvidence.name || 'Anonymous Operative'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>TIMESTAMP</span>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{new Date(selectedEvidence.createdAt || selectedEvidence.timestamp || selectedEvidence.ts || '').toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedEvidence(null)}>Close Inspection</Button>
              {selectedEvidence.status === 'pending' && (
                <>
                  <Button variant="danger" onClick={() => { useStore.getState().rejectWorkReport(selectedEvidence.id, 'admin'); setSelectedEvidence(null); }}>Reject Report</Button>
                  <Button variant="primary" onClick={() => { useStore.getState().approveWorkReport(selectedEvidence.id, 'admin'); setSelectedEvidence(null); }}>Approve Evidence</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkforceHub;
