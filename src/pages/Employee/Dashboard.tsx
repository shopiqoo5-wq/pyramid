import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { 
  LuClock, LuClipboardList, LuImage,
  LuCamera, LuShieldCheck, LuSend, LuLogOut, LuCircleAlert
} from 'react-icons/lu';
import type { EmployeeRole } from '../../types';
import { Card, Badge } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import AttendanceScanner from '../../components/scanner/AttendanceScanner';

import './Employee.css';

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useStore(state => state.currentUser);
  const employees = useStore(state => state.employees);
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const workReports = useStore(state => state.workReports);
  const dailyTaskProgress = useStore(state => state.dailyTaskProgress);
  const workAssignments = useStore(state => state.workAssignments);
  const submitAttendance = useStore(state => state.submitAttendance);
  const approveWorkReport = useStore(state => state.approveWorkReport);
  const rejectWorkReport = useStore(state => state.rejectWorkReport);
  const updateTaskProgress = useStore(state => state.updateTaskProgress);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);

  // Get current employee record
  const employee = employees.find(e => e.userId === currentUser?.id);
  const company = useStore.getState().companies.find(c => c.id === employee?.companyId);
  const location = useStore.getState().locations.find(l => l.id === employee?.locationId);
  
  const role = employee?.role as EmployeeRole;
  
  // Dynamic assignments logic
  const activeAssignments = workAssignments.filter(a => 
    a.status === 'active' && 
    (a.assignedRole === 'All' || a.assignedRole === role || a.assignedEmployeeId === employee?.id)
  );
  const initialTasks = activeAssignments.map(a => a.title);
  const completedTasks = (employee && dailyTaskProgress[employee.id]) || [];

  // Supervisor logic: Get pending reports for this location
  const pendingTeamReports = role === 'Supervisor' 
    ? workReports.filter(r => {
        const reportEmployee = employees.find(e => e.id === r.employeeId);
        return reportEmployee?.locationId === employee?.locationId && r.status === 'pending' && r.employeeId !== employee?.id;
      })
    : [];

  // Check if clocked in today
  const today = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendanceRecords.filter(r => 
    r.employeeId === employee?.id && r.checkIn.startsWith(today)
  );
  const isClockedIn = todaysAttendance.length > 0 && !todaysAttendance[todaysAttendance.length - 1].checkOut;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTask = (task: string) => {
    if (!employee) return;
    const newTasks = completedTasks.includes(task)
      ? completedTasks.filter(t => t !== task)
      : [...completedTasks, task];
    updateTaskProgress(employee.id, newTasks);
  };

  const handleScannerComplete = async (data: any) => {
    if (!employee) return;

    await submitAttendance({
      employeeId: employee.id,
      imageUrl: data.imageUrl,
      type: data.type,
      locationId: data.locationId,
      latitude: data.latitude,
      longitude: data.longitude
    }, true);
    setShowScanner(false);
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Command Header: Consolidated Clock, Status & Site */}
      <section style={{ marginBottom: '2.5rem' }}>
        <Card variant="premium" style={{ 
          padding: '2rem', 
          borderRadius: '32px', 
          background: isClockedIn 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05))',
          border: isClockedIn ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Gradient Glow */}
          <div style={{ 
            position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px', 
            background: isClockedIn ? 'var(--success)' : 'var(--primary)', 
            filter: 'blur(100px)', opacity: 0.05, borderRadius: '50%' 
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Badge variant={isClockedIn ? 'success' : 'neutral'} style={{ padding: '0.4rem 1.25rem', borderRadius: '12px', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.1em' }}>
                  {isClockedIn ? 'SYSTEM ACTIVE' : 'SYSTEM STANDBY'}
                </Badge>
                <div style={{ marginTop: '1rem' }}>
                  <h1 style={{ fontSize: '3.5rem', fontWeight: 950, margin: 0, letterSpacing: '-0.05em', color: 'var(--text-main)', lineHeight: 1 }}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 800 }}>
                      {currentTime.toLocaleTimeString([], { second: '2-digit' })}
                    </span>
                  </h1>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--text-sub)', fontWeight: 700, letterSpacing: '0.02em' }}>
                    {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--surface)', color: isClockedIn ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', marginLeft: 'auto', border: '1px solid var(--border)' }}>
                  <LuShieldCheck size={28} />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                  {location?.name || 'Site Assignment Pending'}
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
                  {company?.name || 'Pyramid Operations'}
                </div>
              </div>
            </div>

            {/* Supervisor: Team Status Bar */}
            {role === 'Supervisor' && (
              <div style={{ 
                marginTop: '0.5rem', padding: '1rem', borderRadius: '16px', 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)' }}>
                    Team Deployment: <span style={{ color: 'var(--text-main)' }}>{attendanceRecords.filter(r => !r.checkOut && employees.find(e => e.id === r.employeeId)?.locationId === employee?.locationId).length} Active</span>
                  </span>
                </div>
                <button 
                  onClick={() => navigate('/employee/reports')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  View Activity
                </button>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Supervisor: Team Operations */}
      {role === 'Supervisor' && pendingTeamReports.length > 0 && (
        <section className="tasks-container-field" style={{ marginBottom: '2rem', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
          <div className="tasks-header-field">
            <LuShieldCheck size={20} style={{ color: 'var(--primary)' }} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>Pending Team Approvals</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{pendingTeamReports.length} reports waiting</span>
            </div>
          </div>
          <div style={{ padding: '0.5rem' }}>
            {pendingTeamReports.map(report => {
              const emp = employees.find(e => e.id === report.employeeId);
              return (
                <div key={report.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '16px', 
                  padding: '1rem', 
                  marginBottom: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{emp?.name}</span>
                    <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>{new Date(report.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '1rem' }}>{report.remarks}</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => approveWorkReport(report.id, employee?.id || '')}
                      className="btn-primary sm" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => rejectWorkReport(report.id, employee?.id || '')}
                      className="btn-glass sm" 
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Operational Pulse */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
         {/* Replaced by Command Header above */}
      </div>

      {/* Operational Nexus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card 
            variant="glass" 
            onClick={() => navigate('/employee/schedule')}
            style={{ 
              padding: '1.5rem', cursor: 'pointer', textAlign: 'center', 
              border: '1px solid rgba(59, 130, 246, 0.2)',
              background: 'rgba(59, 130, 246, 0.03)',
              boxShadow: '0 10px 40px -10px rgba(59, 130, 246, 0.2)'
            }}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '18px', 
              background: 'rgba(59, 130, 246, 0.1)', color: 'var(--secondary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
            }}>
              <LuClock size={28} />
            </div>
            <div style={{ fontWeight: 950, fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('nav.schedule')}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.08em' }}>Unit Roster</p>
          </Card>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.98 }}>
          <Card 
            variant="glass" 
            onClick={() => navigate('/employee/incident')}
            style={{ 
              padding: '1.5rem', cursor: 'pointer', textAlign: 'center', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.03)',
              boxShadow: '0 10px 40px -10px rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '18px', 
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
            }}>
              <LuCircleAlert size={28} />
            </div>
            <div style={{ fontWeight: 950, fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{t('nav.incidents')}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginTop: '6px', letterSpacing: '0.08em' }}>Field Intel</p>
          </Card>
        </motion.div>
      </div>

      {/* Action Hub */}
      <div className="action-grid-field" style={{ gap: '1.25rem' }}>
        {!isClockedIn ? (
          <button 
            onClick={() => setShowScanner(true)} 
            className="punch-btn punch-in-btn"
          >
            <LuCamera size={42} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Punch In</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Facial Identity Scan</div>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => setShowScanner(true)} 
            className="punch-btn punch-out-btn"
          >
            <LuLogOut size={42} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.03em' }}>Punch Out</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Secure Release</div>
            </div>
          </button>
        )}

        <button 
          onClick={() => navigate('/employee/reports')} 
          className="upload-card-btn"
        >
          <div className="icon-box-orange" style={{ width: '56px', height: '56px', borderRadius: '20px' }}>
            <LuImage size={28} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 950, fontSize: '1.2rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Upload Work Evidence</div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 800 }}>Verified site operations</p>
          </div>
          <LuSend size={24} style={{ color: 'var(--primary)' }} />
        </button>
      </div>

      {/* Operational Readiness Checked */}

      {/* Role-Based Tasks */}
      <section className="tasks-container-field" style={{ marginBottom: '8rem' }}>
        <div className="tasks-header-field" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem' }}>
          <div className="icon-box-primary" style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)' }}>
            <LuClipboardList size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 950, fontSize: '1.15rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Daily Operations checklist</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {role} • <span style={{ color: 'var(--primary)' }}>{completedTasks.length}/{initialTasks.length} Done</span>
            </span>
          </div>
        </div>
        <div>
          {initialTasks.map((task, idx) => (
            <div 
              key={idx} 
              className="task-item-field"
              onClick={() => toggleTask(task)}
              style={{ cursor: 'pointer', background: completedTasks.includes(task) ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}
            >
              <div 
                className={`task-checkbox-field ${completedTasks.includes(task) ? 'checked' : ''}`} 
                style={{ 
                  background: completedTasks.includes(task) ? 'var(--success)' : 'transparent',
                  borderColor: completedTasks.includes(task) ? 'var(--success)' : 'var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {completedTasks.includes(task) && <LuShieldCheck size={14} color="white" />}
              </div>
              <span style={{ 
                fontWeight: 600, 
                opacity: completedTasks.includes(task) ? 0.4 : 0.9,
                textDecoration: completedTasks.includes(task) ? 'line-through' : 'none'
              }}>
                {task}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Overlay: Scanner UI */}
      <AnimatePresence>
        {showScanner && (
          <AttendanceScanner 
            action={isClockedIn ? 'out' : 'in'}
            onCancel={() => setShowScanner(false)} 
            onComplete={handleScannerComplete} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeDashboard;
