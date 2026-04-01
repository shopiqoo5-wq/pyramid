import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Badge, Button, Input } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { 
  LuSearch, LuClock, LuCalendar, 
  LuShieldAlert, LuPencil, LuTrash2, 
  LuPlus, LuTriangleAlert, LuCheck,
  LuMapPin, LuImage as LuImageIcon
} from 'react-icons/lu';
import type { AttendanceRecord } from '../../types';

interface TimesheetsProps {
  isTab?: boolean;
}

const Timesheets: React.FC<TimesheetsProps> = ({ isTab = false }) => {
  const attendanceRecords = useStore(state => state.attendanceRecords);
  const employees = useStore(state => state.employees);
  const locations = useStore(state => state.locations);
  const updateAttendanceRecord = useStore(state => state.updateAttendanceRecord);
  const deleteAttendanceRecord = useStore(state => state.deleteAttendanceRecord);
  const createManualTimesheet = useStore(state => state.createManualTimesheet);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  
  // Selected Record state for Modal
  const [targetRecord, setTargetRecord] = useState<AttendanceRecord | null>(null);
  
  // Edit Form State
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState<AttendanceRecord['status']>('present');
  
  // New Form State
  const [newEmpId, setNewEmpId] = useState('');
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [newStatus, setNewStatus] = useState<AttendanceRecord['status']>('present');

  // Logic
  const filteredRecords = attendanceRecords.filter(record => {
    const emp = employees.find(e => e.id === record.employeeId);
    const matchesSearch = emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = filterDate ? record.checkIn.startsWith(filterDate) : true;
    return matchesSearch && matchesDate;
  }).sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

  const handleOpenEdit = (record: AttendanceRecord) => {
    setTargetRecord(record);
    // Convert ISO to local datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocalFormat = (isoString?: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    
    setEditCheckIn(toLocalFormat(record.checkIn));
    setEditCheckOut(toLocalFormat(record.checkOut));
    setEditStatus(record.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!targetRecord) return;
    updateAttendanceRecord(targetRecord.id, {
      checkIn: new Date(editCheckIn).toISOString(),
      checkOut: editCheckOut ? new Date(editCheckOut).toISOString() : undefined,
      status: editStatus,
      verified: true // Marking it verified since HR is forcing it
    });
    setIsEditModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you certain you want to expunge this attendance log? This cannot be undone.')) {
      deleteAttendanceRecord(id);
    }
  };

  const handleSaveNew = () => {
    if (!newEmpId || !newCheckIn) return;
    createManualTimesheet({
      employeeId: newEmpId,
      checkIn: new Date(newCheckIn).toISOString(),
      checkOut: newCheckOut ? new Date(newCheckOut).toISOString() : undefined,
      photoUrl: '',
      status: newStatus,
      verified: true,
      geofenceVerified: false
    });
    setIsNewModalOpen(false);
    setNewCheckIn('');
    setNewCheckOut('');
    setNewEmpId('');
  };

  return (
    <div className={!isTab ? "admin-container animate-fade-in" : "animate-fade-in"} style={{ padding: isTab ? 0 : '2rem' }}>
      {!isTab && (
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Badge variant="warning" style={{ marginBottom: '1rem' }}>GLOBAL AUDIT LAYER</Badge>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Timesheets & Overrides
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Direct database intervention for automated field geofence logs.</p>
          </div>
        </header>
      )}

      <Card style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-hover)', borderRadius: '0.75rem', padding: '0 1rem', flex: 1, minWidth: '250px' }}>
            <LuSearch size={18} color="var(--text-muted)" />
            <Input 
              placeholder="Search operative name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '100%' }}
            />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-hover)', borderRadius: '0.75rem', padding: '0.25rem' }}>
            <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.8rem' }}><LuCalendar size={16} style={{ marginRight: '0.5rem', marginBottom: '-2px' }}/> Filter Date:</span>
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', padding: '0.75rem', fontFamily: 'inherit', fontWeight: 700 }}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')} 
                className="icon-btn-ghost sm danger" style={{ marginRight: '0.5rem' }}
              >
                Clear
              </button>
            )}
         </div>
         <Button 
            variant="primary" 
            onClick={() => setIsNewModalOpen(true)}
            style={{ padding: '0.75rem 1.25rem', fontWeight: 800, borderRadius: '12px', background: 'var(--success)', color: '#000', marginLeft: 'auto' }}
         >
            <LuPlus size={18} style={{ marginRight: '0.5rem' }} /> Manual Punch
         </Button>
      </Card>

      <Card style={{ padding: '0', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Operative</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
              <th>Verification Matrix</th>
              <th align="right">Actions</th>
            </tr>
          </thead>
          <tbody>
              {filteredRecords.map((record) => {
                const emp = employees.find(e => e.id === record.employeeId);
                const loc = locations.find(l => l.id === record.locationId);
                const isAnomaly = !record.geofenceVerified && !record.verified;
                
                return (
                  <tr 
                    key={record.id}
                    className="hover:bg-surface-hover/50 transition-colors"
                  >
                    <td style={{ borderLeft: isAnomaly ? '4px solid var(--danger)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: isAnomaly ? '0.5rem' : '0' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                          <span>{emp?.name.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{emp?.name || 'Unknown User'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{loc?.name || 'Off-Site / Roving'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {new Date(record.checkIn).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <Badge variant="neutral" style={{ padding: '0.3rem 0.8rem', background: 'var(--surface-hover)' }}>
                        <LuClock size={12} style={{ marginRight: '4px' }}/>
                        {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </td>
                    <td>
                      {record.checkOut ? (
                        <Badge variant="neutral" style={{ padding: '0.3rem 0.8rem', background: 'var(--surface-hover)' }}>
                          <LuClock size={12} style={{ marginRight: '4px' }}/>
                          {new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      ) : (
                        <Badge variant="primary" style={{ animation: 'pulse 2s infinite' }}>ACTIVE SHIFT</Badge>
                      )}
                    </td>
                    <td>
                       <Badge 
                         variant={record.status === 'present' ? 'success' : record.status === 'absent' ? 'danger' : 'warning'}
                         style={{ textTransform: 'uppercase' }}
                       >
                         {record.status}
                       </Badge>
                    </td>
                    <td>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         {record.geofenceVerified ? (
                           <span title="GPS Match Confirmed"><Badge variant="success" style={{ background: 'transparent', border: '1px solid var(--success)' }}><LuMapPin size={12} style={{ marginRight: '2px' }}/> GPS Valid</Badge></span>
                         ) : record.verified ? (
                           <span title="Manually Verified by Admin"><Badge variant="info" style={{ background: 'transparent', border: '1px solid var(--info)' }}><LuCheck size={12} style={{ marginRight: '2px' }}/> HR Bypass</Badge></span>
                         ) : (
                           <span title="GPS Failure / Untrusted Source"><Badge variant="danger" style={{ background: 'transparent', border: '1px solid var(--danger)' }}><LuShieldAlert size={12} style={{ marginRight: '2px' }}/> Anomalous</Badge></span>
                         )}
                         {record.photoUrl && (
                            <span title="Photographic Evidence Captured">
                              <Badge variant="neutral" style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                                 <LuImageIcon size={12}/>
                              </Badge>
                            </span>
                         )}
                       </div>
                    </td>
                    <td align="right">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="icon-btn-ghost sm" onClick={() => handleOpenEdit(record)} title="Override Matrix">
                          <LuPencil size={16} />
                        </button>
                        <button className="icon-btn-ghost sm danger" onClick={() => handleDelete(record.id)} title="Expunge Record">
                          <LuTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <LuCalendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                  <div style={{ fontWeight: 800 }}>No Timesheets Found</div>
                  <p style={{ fontSize: '0.85rem' }}>Adjust your filters or query to locate records.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Edit Override Modal */}
      {isEditModalOpen && targetRecord && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsEditModalOpen(false)}
          title="Timesheet Override CLI"
        >
          <div style={{ padding: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed var(--danger)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <LuTriangleAlert size={24} color="var(--danger)" />
              <div>
                <span style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Advisory</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '2px' }}>Modifying this record will permanently alter the algorithmic attendance trails.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
               <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Punch-In Time</label>
                  <Input 
                    type="datetime-local" 
                    value={editCheckIn} 
                    onChange={(e) => setEditCheckIn(e.target.value)} 
                    style={{ width: '100%' }}
                  />
               </div>
               <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Punch-Out Time</label>
                  <Input 
                    type="datetime-local" 
                    value={editCheckOut} 
                    onChange={(e) => setEditCheckOut(e.target.value)} 
                    style={{ width: '100%' }}
                  />
               </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Computed Status</label>
               <select 
                 value={editStatus}
                 onChange={(e) => setEditStatus(e.target.value as any)}
                 className="w-full bg-surface-hover border border-border text-main rounded-xl p-3 outline-none"
               >
                 <option value="present">Present (Full Day)</option>
                 <option value="half-day">Half-Day Allocation</option>
                 <option value="late">Tardy / Late Exception</option>
                 <option value="absent">Unexcused Absence</option>
               </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel Override</Button>
              <Button variant="primary" onClick={handleSaveEdit}>Commit Force Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Manual Punch Modal */}
      {isNewModalOpen && (
        <Modal 
          isOpen={true} 
          onClose={() => setIsNewModalOpen(false)}
          title="Execute Manual Injection"
        >
          <div style={{ padding: '1rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Target Operative</label>
               <select 
                 value={newEmpId}
                 onChange={(e) => setNewEmpId(e.target.value)}
                 className="w-full bg-surface-hover border border-border text-main rounded-xl p-3 outline-none"
               >
                 <option value="" disabled>Select Employee Matrix...</option>
                 {employees.map(emp => (
                   <option key={emp.id} value={emp.id}>{emp.name} ({emp.id.slice(0,6)})</option>
                 ))}
               </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
               <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>PUNCH-IN DATA</label>
                  <Input 
                    type="datetime-local" 
                    value={newCheckIn} 
                    onChange={(e) => setNewCheckIn(e.target.value)} 
                    style={{ width: '100%' }}
                  />
               </div>
               <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>PUNCH-OUT DATA</label>
                  <Input 
                    type="datetime-local" 
                    value={newCheckOut} 
                    onChange={(e) => setNewCheckOut(e.target.value)} 
                    style={{ width: '100%' }}
                  />
               </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
               <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>SHIFT STATUS CLASSIFICATION</label>
               <select 
                 value={newStatus}
                 onChange={(e) => setNewStatus(e.target.value as any)}
                 className="w-full bg-surface-hover border border-border text-main rounded-xl p-3 outline-none"
               >
                 <option value="present">Present</option>
                 <option value="half-day">Half-Day</option>
                 <option value="late">Late</option>
                 <option value="absent">Absent</option>
               </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setIsNewModalOpen(false)}>Abort Injection</Button>
              <Button variant="primary" disabled={!newEmpId || !newCheckIn} onClick={handleSaveNew}>Deploy Shift Record</Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Timesheets;
