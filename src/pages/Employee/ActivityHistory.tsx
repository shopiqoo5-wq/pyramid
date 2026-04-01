import React from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../../components/ui';
import { 
  LuHistory, LuCalendar, LuClock, LuCheck, 
  LuFileText, LuArrowLeftRight, LuShieldCheck
} from 'react-icons/lu';
import './Employee.css';

const ActivityHistory: React.FC = () => {
  const { currentUser, employees, attendanceRecords, workReports } = useStore();
  
  const employee = employees.find(e => e.userId === currentUser?.id);
  const myAttendance = attendanceRecords
    .filter(r => r.employeeId === employee?.id)
    .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
    
  const myReports = workReports
    .filter(r => r.employeeId === employee?.id)
    .sort((a, b) => new Date(b.createdAt || (b as any).timestamp || '').getTime() - new Date(a.createdAt || (a as any).timestamp || '').getTime());

  // Stats
  const totalShifts = myAttendance.length;
  const approvedReports = myReports.filter(r => r.status === 'approved').length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">APPROVED</Badge>;
      case 'rejected': return <Badge variant="danger">REJECTED</Badge>;
      case 'pending': return <Badge variant="warning">PENDING</Badge>;
      default: return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="employee-main animate-fade-in" style={{ paddingBottom: '8rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-0.04em', margin: 0, color: 'var(--text-main)' }}>Operational <span style={{ color: 'var(--primary)' }}>Archive</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 700, marginTop: '0.6rem' }}>Unified audit trail for field operations and shift forensics.</p>
      </header>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '3rem' }}>
        <Card variant="glass" style={{ padding: '1.5rem', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ color: 'var(--primary)', marginBottom: '0.75rem', opacity: 0.8 }}><LuCalendar size={24} /></div>
          <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-main)' }}>{totalShifts}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Shift Count</div>
        </Card>
        <Card variant="glass" style={{ padding: '1.5rem', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ color: 'var(--success)', marginBottom: '0.75rem', opacity: 0.8 }}><LuCheck size={24} /></div>
          <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-main)' }}>{approvedReports}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Verified Docs</div>
        </Card>
      </div>

      {/* Attendance History */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LuClock size={22} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Recent Deployments</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myAttendance.slice(0, 10).map((record) => (
            <Card key={record.id} variant="glass" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{formatDate(record.checkIn)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    <span>{formatTime(record.checkIn)}</span>
                    <LuArrowLeftRight size={10} />
                    <span>{record.checkOut ? formatTime(record.checkOut) : 'Active'}</span>
                  </div>
                </div>
                {!record.checkOut ? (
                  <Badge variant="primary" className="pulse">LIVE</Badge>
                ) : (
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>COMPLETED</div>
                )}
              </div>
            </Card>
          ))}
          {myAttendance.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
              <LuHistory size={48} style={{ marginBottom: '1rem' }} />
              <p>No shift history found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Report Archive */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LuFileText size={22} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 950, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Work Evidence Archive</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myReports.map((report) => (
            <Card key={report.id} variant="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)' }} />
                   <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{formatDate(report.createdAt || (report as any).timestamp || '')}</span>
                 </div>
                 {getStatusBadge(report.status)}
              </div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.5 }}>{report.remarks}</p>
              {report.approvedBy && (
                 <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                     <LuShieldCheck size={14} /> Verified by System Supervisor
                   </div>
                 </div>
              )}
            </Card>
          ))}
          {myReports.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.3 }}>
              <LuFileText size={48} style={{ marginBottom: '1rem' }} />
              <p>No reports submitted yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ActivityHistory;
